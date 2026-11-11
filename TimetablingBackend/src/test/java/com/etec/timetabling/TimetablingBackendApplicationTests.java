package com.etec.timetabling;

import static org.assertj.core.api.Assertions.assertThat;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.service.SolverService;
import com.etec.timetabling.web.ClassGroupController;
import com.etec.timetabling.web.DemandController;
import com.etec.timetabling.web.GradeController;
import com.etec.timetabling.web.ProfessorController;
import com.etec.timetabling.web.ProfessorPreferenceController;
import com.etec.timetabling.web.ProfessorUnavailabilityController;
import com.etec.timetabling.web.SolverController;
import com.etec.timetabling.web.SubjectController;
import com.etec.timetabling.web.SummaryController;
import com.etec.timetabling.web.TimeslotController;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@ActiveProfiles("test")
class TimetablingBackendApplicationTests {

    @Autowired
    private SummaryController summaryController;

    @Autowired
    private ProfessorController professorController;

    @Autowired
    private ClassGroupController classGroupController;

    @Autowired
    private SubjectController subjectController;

    @Autowired
    private DemandController demandController;

    @Autowired
    private TimeslotController timeslotController;

    @Autowired
    private ProfessorUnavailabilityController unavailabilityController;

    @Autowired
    private ProfessorPreferenceController preferenceController;

    @Autowired
    private SolverController solverController;

    @Autowired
    private SolverService solverService;

    @Autowired
    private GradeController gradeController;

    @BeforeEach
    void cleanUp() {
        summaryController.resetAll();
    }

    @Test
    void contextLoadsAndHealthCheckWorks() {
        var health = summaryController.health();
        assertThat(health.status()).isEqualTo("ok");

        var summary = summaryController.summary();
        assertThat(summary.professors()).isZero();
        assertThat(summary.classGroups()).isZero();
        assertThat(summary.timeslots()).isZero();
    }

    @Test
    void defaultEtecTimeslotsAreCreatedIdempotently() {
        var firstRun = timeslotController.createDefaultEtecSchedule();
        assertThat(firstRun.created()).isEqualTo(70);
        assertThat(firstRun.total()).isEqualTo(70);

        // Segunda chamada deve ser idempotente (0 criados, 70 no total)
        var secondRun = timeslotController.createDefaultEtecSchedule();
        assertThat(secondRun.created()).isZero();
        assertThat(secondRun.total()).isEqualTo(70);

        List<Timeslot> regularSlots = timeslotController.list(ShiftType.REGULAR);
        List<Timeslot> integralSlots = timeslotController.list(ShiftType.INTEGRAL);
        assertThat(regularSlots).hasSize(30);  // 6 por dia x 5 dias
        assertThat(integralSlots).hasSize(40); // 8 por dia x 5 dias
    }

    @Test
    void duplicateEntitiesThrowConflict409() {
        Professor p1 = professorController.create(new ProfessorController.ProfessorRequest("Rodrigo"));
        assertThat(p1.getId()).isNotNull();

        try {
            professorController.create(new ProfessorController.ProfessorRequest("rodrigo"));
            org.junit.jupiter.api.Assertions.fail("Deveria lancar 409 CONFLICT para professor duplicado");
        } catch (ResponseStatusException ex) {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        ClassGroup cg = classGroupController.create(
            new ClassGroupController.ClassGroupRequest("1MDS", ShiftType.INTEGRAL));
        try {
            classGroupController.create(
                new ClassGroupController.ClassGroupRequest("1mds", ShiftType.REGULAR));
            org.junit.jupiter.api.Assertions.fail("Deveria lancar 409 CONFLICT para turma duplicada");
        } catch (ResponseStatusException ex) {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        Subject subj = subjectController.create(
            new SubjectController.SubjectRequest("Banco de Dados", cg.getId()));
        try {
            subjectController.create(
                new SubjectController.SubjectRequest("banco de dados", cg.getId()));
            org.junit.jupiter.api.Assertions.fail("Deveria lancar 409 CONFLICT para materia duplicada na mesma turma");
        } catch (ResponseStatusException ex) {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        demandController.create(new DemandController.DemandRequest(
            subj.getId(), Set.of(p1.getId()), 4, true));
        try {
            demandController.create(new DemandController.DemandRequest(
                subj.getId(), Set.of(p1.getId()), 2, false));
            org.junit.jupiter.api.Assertions.fail("Deveria lancar 409 CONFLICT para demanda duplicada na mesma materia");
        } catch (ResponseStatusException ex) {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }
    }

    @Test
    void solverSchedulesLessonsRespectingUnavailabilityPreferencesAndDoubleLessons() {
        timeslotController.createDefaultEtecSchedule();

        Professor profAna = professorController.create(new ProfessorController.ProfessorRequest("Prof. Ana"));
        Professor profCarlos = professorController.create(new ProfessorController.ProfessorRequest("Prof. Carlos"));

        ClassGroup turmaIntegral = classGroupController.create(
            new ClassGroupController.ClassGroupRequest("1MDS", ShiftType.INTEGRAL));
        ClassGroup turmaRegular = classGroupController.create(
            new ClassGroupController.ClassGroupRequest("1JOD", ShiftType.REGULAR));

        Subject matIntegral = subjectController.create(
            new SubjectController.SubjectRequest("Matemática", turmaIntegral.getId()));
        Subject progIntegral = subjectController.create(
            new SubjectController.SubjectRequest("Programação Web", turmaIntegral.getId()));
        Subject matRegular = subjectController.create(
            new SubjectController.SubjectRequest("Matemática", turmaRegular.getId()));

        demandController.create(new DemandController.DemandRequest(
            matIntegral.getId(), Set.of(profAna.getId()), 4, true));
        demandController.create(new DemandController.DemandRequest(
            progIntegral.getId(), Set.of(profAna.getId(), profCarlos.getId()), 4, true));
        demandController.create(new DemandController.DemandRequest(
            matRegular.getId(), Set.of(profAna.getId()), 4, true));

        // Bloquear Prof. Ana todas as segundas-feiras de manhã (08:00 às 12:30)
        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            profAna.getId(), 1, LocalTime.of(8, 0), LocalTime.of(12, 30)));

        // Preferência para Prof. Carlos dar aula na terça-feira
        preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            profCarlos.getId(), progIntegral.getId(), 2, "08:00", "12:30", 9, "PREFERRED"));

        var validation = solverController.validate();
        assertThat(validation.feasible()).isTrue();
        assertThat(validation.totalLessons()).isEqualTo(12);

        SolverService.SolverResult result = solverService.solve();
        assertThat(result.scheduled()).isEqualTo(12);
        assertThat(result.unscheduled()).isZero();

        // Verificar grade da turma 1MDS
        var grade1Mds = gradeController.list(turmaIntegral.getId());
        assertThat(grade1Mds).hasSize(8);

        // Verificar grade por professor (Prof. Ana deve ter 12 aulas e nenhuma segunda-feira entre 08:00 e 12:30)
        var gradeAna = gradeController.listByProfessor(profAna.getId());
        assertThat(gradeAna).hasSize(12);
        for (var entry : gradeAna) {
            if (entry.dayOfWeek() == 1) {
                LocalTime start = LocalTime.parse(entry.startTime());
                assertThat(start).isAfterOrEqualTo(LocalTime.of(12, 30));
            }
        }

        // Verificar mapa de todas as grades e todos os professores
        Map<String, GradeController.ClassGradeResponse> allGrades = gradeController.listAll();
        assertThat(allGrades).containsKeys("1MDS", "1JOD");

        Map<String, GradeController.ProfessorGradeResponse> allProfGrades = gradeController.listAllProfessors();
        assertThat(allProfGrades).containsKeys("Prof. Ana", "Prof. Carlos");
    }

    @Test
    void cascadeDeleteRemovesDependentEntitiesWithoutForeignKeyError() {
        timeslotController.createDefaultEtecSchedule();
        Professor prof = professorController.create(new ProfessorController.ProfessorRequest("Prof. Teste"));
        ClassGroup cg = classGroupController.create(
            new ClassGroupController.ClassGroupRequest("2MDS", ShiftType.INTEGRAL));
        Subject subj = subjectController.create(
            new SubjectController.SubjectRequest("Física", cg.getId()));
        Demand demand = demandController.create(
            new DemandController.DemandRequest(subj.getId(), Set.of(prof.getId()), 2, true));

        // Atualizar demanda
        Demand updated = demandController.update(demand.getId(),
            new DemandController.DemandRequest(subj.getId(), Set.of(prof.getId()), 4, false));
        assertThat(updated.getQuantityPerWeek()).isEqualTo(4);

        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            prof.getId(), 0, LocalTime.of(8, 0), LocalTime.of(8, 50)));
        preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), subj.getId(), 3, "08:00", "10:00", 7, "PREFERRED"));

        solverService.solve();
        assertThat(summaryController.summary().scheduleEntries()).isEqualTo(4);

        // Deletar professor em cascata (remove indisponibilidades, preferências, demandas órfãs e entradas da grade)
        professorController.delete(prof.getId());
        assertThat(summaryController.summary().professors()).isZero();
        assertThat(summaryController.summary().scheduleEntries()).isZero();

        // Deletar turma em cascata (remove matérias vinculadas)
        classGroupController.delete(cg.getId());
        assertThat(summaryController.summary().classGroups()).isZero();
        assertThat(summaryController.summary().subjects()).isZero();
    }

    @Test
    void securityAndValidationRulesRejectInvalidAndDuplicatePayloads() {
        Professor prof = professorController.create(new ProfessorController.ProfessorRequest("Prof. Seguranca"));

        // Duplicidade em indisponibilidade deve retornar 409 CONFLICT
        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            prof.getId(), 2, LocalTime.of(8, 0), LocalTime.of(9, 40)));
        try {
            unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
                prof.getId(), 2, LocalTime.of(8, 0), LocalTime.of(9, 40)));
            org.junit.jupiter.api.Assertions.fail("Deveria lancar 409 CONFLICT para indisponibilidade duplicada");
        } catch (ResponseStatusException ex) {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        // Preferência com horário invertido ou formato inválido deve retornar 400
        var badPref1 = preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), null, 2, "12:00", "08:00", 5, "PREFERRED"));
        assertThat(badPref1.getStatusCode().value()).isEqualTo(400);

        var badPref2 = preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), null, 2, "horario-invalido", "10:00", 5, "PREFERRED"));
        assertThat(badPref2.getStatusCode().value()).isEqualTo(400);

        // Duplicidade em preferência deve retornar 409 CONFLICT
        var validPref = preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), null, 3, "08:00", "10:00", 8, "PREFERRED"));
        assertThat(validPref.getStatusCode().value()).isEqualTo(201);

        var dupPref = preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), null, 3, "08:00", "10:00", 8, "PREFERRED"));
        assertThat(dupPref.getStatusCode().value()).isEqualTo(409);
    }

    @Test
    void gradeAuditAndManualMoveOrSwapWorkWithConflictProtection() {
        timeslotController.createDefaultEtecSchedule();
        Professor prof1 = professorController.create(new ProfessorController.ProfessorRequest("Prof. Alfa"));
        Professor prof2 = professorController.create(new ProfessorController.ProfessorRequest("Prof. Beta"));
        ClassGroup cg = classGroupController.create(new ClassGroupController.ClassGroupRequest("1MAD", ShiftType.INTEGRAL));

        Subject subMat = subjectController.create(new SubjectController.SubjectRequest("Matemática", cg.getId()));
        Subject subPor = subjectController.create(new SubjectController.SubjectRequest("Português", cg.getId()));

        demandController.create(new DemandController.DemandRequest(subMat.getId(), Set.of(prof1.getId()), 2, false));
        demandController.create(new DemandController.DemandRequest(subPor.getId(), Set.of(prof2.getId()), 2, false));

        // Bloquear Prof. Alfa na sexta-feira (dia 5) das 15:10 às 16:00
        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            prof1.getId(), 5, LocalTime.of(15, 10), LocalTime.of(16, 0)));

        solverService.solve();

        var audit = gradeController.auditGrades();
        assertThat(audit.totalDemandedLessons()).isEqualTo(4);
        assertThat(audit.totalScheduledLessons()).isEqualTo(4);
        assertThat(audit.missingDemands()).isEmpty();
        assertThat(audit.professorConflicts()).isEmpty();
        assertThat(audit.unavailabilityViolations()).isEmpty();
        assertThat(audit.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(audit.professorStats()).hasSize(2);

        // Encontrar uma aula de Matemática (Prof. Alfa)
        var entries = gradeController.list(cg.getId());
        var matEntry = entries.stream().filter(e -> e.subject().equals("Matemática")).findFirst().orElseThrow();
        var porEntry = entries.stream().filter(e -> e.subject().equals("Português")).findFirst().orElseThrow();

        // Tentar mover aula de Prof. Alfa para sexta-feira 15:10 (onde ele tem indisponibilidade) sem force -> 409 CONFLICT
        try {
            gradeController.moveOrSwapEntry(new GradeController.MoveGradeEntryRequest(
                cg.getId(),
                matEntry.dayOfWeek(),
                LocalTime.parse(matEntry.startTime()),
                5,
                LocalTime.of(15, 10),
                false
            ));
            org.junit.jupiter.api.Assertions.fail("Deveria bloquear movimentacao para horario indisponivel");
        } catch (ResponseStatusException ex) {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        }

        // Trocar (swap) a aula de Matemática com a aula de Português
        var swapRes = gradeController.moveOrSwapEntry(new GradeController.MoveGradeEntryRequest(
            cg.getId(),
            matEntry.dayOfWeek(),
            LocalTime.parse(matEntry.startTime()),
            porEntry.dayOfWeek(),
            LocalTime.parse(porEntry.startTime()),
            false
        ));
        assertThat(swapRes.swapped()).isTrue();
    }

    @Test
    void backupExportAndImportRestoresCompleteState() {
        timeslotController.createDefaultEtecSchedule();
        Professor prof = professorController.create(new ProfessorController.ProfessorRequest("Prof. Backup"));
        ClassGroup cg = classGroupController.create(new ClassGroupController.ClassGroupRequest("3MDS", ShiftType.INTEGRAL));
        Subject subj = subjectController.create(new SubjectController.SubjectRequest(" Seguranca da Informacao", cg.getId()));
        demandController.create(new DemandController.DemandRequest(subj.getId(), Set.of(prof.getId()), 2, true));
        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            prof.getId(), 1, LocalTime.of(8, 0), LocalTime.of(8, 50)));
        preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            prof.getId(), subj.getId(), 4, "10:00", "11:40", 9, "PREFERRED"));
        solverService.solve();

        var exported = summaryController.exportBackup();
        assertThat(exported.professors()).containsExactly("Prof. Backup");
        assertThat(exported.scheduleEntries()).hasSize(2);

        summaryController.resetAll();
        assertThat(summaryController.summary().professors()).isZero();
        assertThat(summaryController.summary().scheduleEntries()).isZero();

        var restoredSummary = summaryController.importBackup(exported);
        assertThat(restoredSummary.professors()).isEqualTo(1);
        assertThat(restoredSummary.classGroups()).isEqualTo(1);
        assertThat(restoredSummary.timeslots()).isEqualTo(70);
        assertThat(restoredSummary.subjects()).isEqualTo(1);
        assertThat(restoredSummary.demands()).isEqualTo(1);
        assertThat(restoredSummary.unavailabilities()).isEqualTo(1);
        assertThat(restoredSummary.preferences()).isEqualTo(1);
        assertThat(restoredSummary.scheduleEntries()).isEqualTo(2);
    }
}
