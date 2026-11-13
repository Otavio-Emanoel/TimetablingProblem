package com.etec.timetabling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import com.etec.timetabling.web.ClassGroupController;
import com.etec.timetabling.web.DemandController;
import com.etec.timetabling.web.GradeController;
import com.etec.timetabling.web.ProfessorController;
import com.etec.timetabling.web.ProfessorPreferenceController;
import com.etec.timetabling.web.ProfessorUnavailabilityController;
import com.etec.timetabling.web.SubjectController;
import com.etec.timetabling.web.SummaryController;
import com.etec.timetabling.web.TimeslotController;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@ActiveProfiles("test")
class BackupAndAuditTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private SummaryController summaryController;

    @Autowired
    private TimeslotController timeslotController;

    @Autowired
    private ProfessorController professorController;

    @Autowired
    private ClassGroupController classGroupController;

    @Autowired
    private SubjectController subjectController;

    @Autowired
    private DemandController demandController;

    @Autowired
    private ProfessorUnavailabilityController unavailabilityController;

    @Autowired
    private ProfessorPreferenceController preferenceController;

    @Autowired
    private GradeController gradeController;

    @Autowired
    private TimeslotRepository timeslotRepository;

    @Autowired
    private ScheduleEntryRepository scheduleEntryRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        summaryController.resetAll();
    }

    @Test
    void malformedBackupImportFailsWith400WithoutWipingExistingDatabase() throws Exception {
        professorController.create(new ProfessorController.ProfessorRequest("Prof. Preservado"));
        classGroupController.create(new ClassGroupController.ClassGroupRequest("1TURMA", ShiftType.REGULAR));

        String invalidShiftBackup = """
            {
              "classGroups": [{"name": "2TURMA", "shiftType": "MADRUGADA"}],
              "timeslots": [],
              "professors": ["Outro"]
            }
            """;

        mockMvc.perform(post("/api/backup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidShiftBackup))
            .andExpect(status().isBadRequest());

        String invertedTimeslotBackup = """
            {
              "professors": [],
              "classGroups": [],
              "timeslots": [{"dayOfWeek": 1, "startTime": "12:00", "endTime": "08:00", "shiftType": "REGULAR"}]
            }
            """;

        mockMvc.perform(post("/api/backup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invertedTimeslotBackup))
            .andExpect(status().isBadRequest());

        String outOfRangeDayBackup = """
            {
              "professors": ["Prof. X"],
              "unavailabilities": [{"professorName": "Prof. X", "dayOfWeek": 9, "startTime": "08:00", "endTime": "09:00"}]
            }
            """;

        mockMvc.perform(post("/api/backup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(outOfRangeDayBackup))
            .andExpect(status().isBadRequest());

        // Estado anterior deve permanecer intacto após falhas de validação
        var summary = summaryController.summary();
        assertThat(summary.professors()).isEqualTo(1);
        assertThat(summary.classGroups()).isEqualTo(1);
    }

    @Test
    void auditCalculatesLunchNonWindowGapIdleWindowMissingDemandAndConflicts() {
        timeslotController.createDefaultEtecSchedule();
        Professor prof = professorController.create(new ProfessorController.ProfessorRequest("Prof. Auditoria"));
        ClassGroup cg1 = classGroupController.create(new ClassGroupController.ClassGroupRequest("1AUD", ShiftType.INTEGRAL));
        ClassGroup cg2 = classGroupController.create(new ClassGroupController.ClassGroupRequest("2AUD", ShiftType.INTEGRAL));

        Subject subj1 = subjectController.create(new SubjectController.SubjectRequest("Algoritmos", cg1.getId()));
        Subject subj2 = subjectController.create(new SubjectController.SubjectRequest("Banco de Dados", cg2.getId()));

        // Demanda 4 aulas para Algoritmos, mas alocaremos apenas 3 (faltará 1)
        demandController.create(new DemandController.DemandRequest(subj1.getId(), Set.of(prof.getId()), 4, false));
        demandController.create(new DemandController.DemandRequest(subj2.getId(), Set.of(prof.getId()), 1, false));

        // Preferência AVOID satisfeita na terça e PREFERRED atendida na segunda
        preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), subj1.getId(), 1, "11:40", "12:30", 8, "PREFERRED"));
        preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), null, 3, "08:00", "12:30", 7, "AVOID"));

        List<Timeslot> integralSlots = timeslotRepository.findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(ShiftType.INTEGRAL);
        Timeslot mon1140 = findSlot(integralSlots, 1, LocalTime.of(11, 40));
        Timeslot mon1330 = findSlot(integralSlots, 1, LocalTime.of(13, 30)); // Almoço 12:30-13:30 NÃO deve contar janela
        Timeslot mon1510 = findSlot(integralSlots, 1, LocalTime.of(15, 10)); // Gap 14:20-15:10 = 50min -> 1 janela!

        saveEntry(cg1, subj1, prof, mon1140);
        saveEntry(cg1, subj1, prof, mon1330);
        saveEntry(cg1, subj1, prof, mon1510);
        // Conflito proposital no mesmo horário em turma diferente
        saveEntry(cg2, subj2, prof, mon1510);

        var audit = gradeController.auditGrades();
        assertThat(audit.totalDemandedLessons()).isEqualTo(5);
        assertThat(audit.totalScheduledLessons()).isEqualTo(4);
        assertThat(audit.missingDemands()).hasSize(1);
        assertThat(audit.missingDemands().get(0).missing()).isEqualTo(1);
        assertThat(audit.professorConflicts()).hasSize(1);
        assertThat(audit.totalWindows()).isEqualTo(1);
        assertThat(audit.professorStats()).hasSize(1);
        assertThat(audit.professorStats().get(0).preferencesMatched()).isEqualTo(2);
    }

    @Test
    void dryRunMoveValidationAndClassSummariesDoNotMutateGrade() throws Exception {
        timeslotController.createDefaultEtecSchedule();
        Professor prof = professorController.create(new ProfessorController.ProfessorRequest("Prof. Move"));
        ClassGroup cg = classGroupController.create(new ClassGroupController.ClassGroupRequest("1MOV", ShiftType.REGULAR));
        Subject subj = subjectController.create(new SubjectController.SubjectRequest("Sistemas Web", cg.getId()));
        demandController.create(new DemandController.DemandRequest(subj.getId(), Set.of(prof.getId()), 1, false));

        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            prof.getId(), 2, LocalTime.of(8, 0), LocalTime.of(9, 40)));

        List<Timeslot> regSlots = timeslotRepository.findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(ShiftType.REGULAR);
        Timeslot mon0800 = findSlot(regSlots, 1, LocalTime.of(8, 0));
        saveEntry(cg, subj, prof, mon0800);

        // Dry-run para horário livre (terça 10:00) deve permitir sem mover no DB
        String allowedPayload = """
            {
              "classGroupId": %d,
              "fromDay": 1,
              "fromStartTime": "08:00:00",
              "toDay": 2,
              "toStartTime": "10:00:00",
              "force": false
            }
            """.formatted(cg.getId());

        mockMvc.perform(post("/api/grade/validar-movimento")
                .contentType(MediaType.APPLICATION_JSON)
                .content(allowedPayload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.allowed").value(true))
            .andExpect(jsonPath("$.willSwap").value(false))
            .andExpect(jsonPath("$.conflicts").isEmpty());

        // Aula continua na segunda 08:00
        assertThat(gradeController.list(cg.getId())).hasSize(1);
        assertThat(gradeController.list(cg.getId()).get(0).dayOfWeek()).isEqualTo(1);

        // Dry-run para terça 08:00 (indisponível) deve sinalizar allowed=false sem 409 exception
        String blockedPayload = """
            {
              "classGroupId": %d,
              "fromDay": 1,
              "fromStartTime": "08:00:00",
              "toDay": 2,
              "toStartTime": "08:00:00",
              "force": false
            }
            """.formatted(cg.getId());

        mockMvc.perform(post("/api/grade/validar-movimento")
                .contentType(MediaType.APPLICATION_JSON)
                .content(blockedPayload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.allowed").value(false))
            .andExpect(jsonPath("$.conflicts[0]").exists());

        // Verificar resumo das turmas
        mockMvc.perform(get("/api/grade/turmas/resumo"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].classGroupName").value("1MOV"))
            .andExpect(jsonPath("$[0].allocatedLessons").value(1))
            .andExpect(jsonPath("$[0].demandedLessons").value(1))
            .andExpect(jsonPath("$[0].totalSlots").value(30))
            .andExpect(jsonPath("$[0].freeSlots").value(29));
    }

    private Timeslot findSlot(List<Timeslot> slots, int day, LocalTime start) {
        return slots.stream()
            .filter(s -> s.getDayOfWeek() == day && s.getStartTime().equals(start))
            .findFirst()
            .orElseThrow();
    }

    private void saveEntry(ClassGroup cg, Subject subj, Professor prof, Timeslot slot) {
        ScheduleEntry entry = new ScheduleEntry();
        entry.setClassGroup(cg);
        entry.setSubject(subj);
        entry.setTimeslot(slot);
        entry.setProfessors(Set.of(prof));
        scheduleEntryRepository.save(entry);
    }
}
