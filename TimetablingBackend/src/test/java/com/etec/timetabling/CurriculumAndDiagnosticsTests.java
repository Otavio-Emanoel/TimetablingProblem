package com.etec.timetabling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.SubjectRepository;
import com.etec.timetabling.service.SeedService;
import com.etec.timetabling.web.ClassGroupController.ClassGroupRequest;
import com.etec.timetabling.web.DemandController.DemandRequest;
import com.etec.timetabling.web.ProfessorController.ProfessorRequest;
import com.etec.timetabling.web.ProfessorUnavailabilityController;
import com.etec.timetabling.web.SubjectController.SubjectRequest;
import com.etec.timetabling.web.SummaryController;
import java.time.LocalTime;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@ActiveProfiles("test")
class CurriculumAndDiagnosticsTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private SummaryController summaryController;

    @Autowired
    private SeedService seedService;

    @Autowired
    private ProfessorUnavailabilityController unavailabilityController;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private DemandRepository demandRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        summaryController.resetAll();
    }

    @Test
    void diagnosticReportsFeasibleForSimplesPreset() throws Exception {
        seedService.applyPreset("simples", true);

        mockMvc.perform(get("/api/solver/diagnostico"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feasible").value(true))
            .andExpect(jsonPath("$.totalLessons").value(61))
            .andExpect(jsonPath("$.totalSlots").value(70))
            .andExpect(jsonPath("$.criticalErrorsCount").value(0));
    }

    @Test
    void diagnosticDetectsCoteachingIntersectionConflictAndProfessorOverload() throws Exception {
        Professor p1 = postJson("/api/professors", new ProfessorRequest("Prof A"), Professor.class);
        Professor p2 = postJson("/api/professors", new ProfessorRequest("Prof B"), Professor.class);
        ClassGroup cg = postJson("/api/class-groups",
            new ClassGroupRequest("1A INFO", ShiftType.REGULAR), ClassGroup.class);
        Subject subj = postJson("/api/subjects",
            new SubjectRequest("Lab Integrado", cg.getId()), Subject.class);

        // Criar 2 timeslots no mesmo dia para testar intersecao impossivel
        postJson("/api/timeslots", new TimeslotPayload(1, "08:00", "08:50", ShiftType.REGULAR), Timeslot.class);
        postJson("/api/timeslots", new TimeslotPayload(1, "08:50", "09:40", ShiftType.REGULAR), Timeslot.class);

        // Demanda exige 2 aulas conjuntas para Prof A + Prof B
        postJson("/api/demands", new DemandRequest(subj.getId(), Set.of(p1.getId(), p2.getId()), 2, false), Demand.class);

        // Prof A indisponivel no 1o horario, Prof B indisponivel no 2o -> 0 horarios em comum
        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            p1.getId(), 1, LocalTime.of(8, 0), LocalTime.of(8, 50)));
        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            p2.getId(), 1, LocalTime.of(8, 50), LocalTime.of(9, 40)));

        mockMvc.perform(get("/api/solver/diagnostico"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feasible").value(false))
            .andExpect(jsonPath("$.criticalErrorsCount").value(3))
            .andExpect(jsonPath("$.issues[*].category", hasItem("COTEACHING_INTERSECTION")))
            .andExpect(jsonPath("$.issues[*].category", hasItem("PROFESSOR_OVERLOAD")));
    }

    @Test
    void diagnosticDetectsClassCapacityOverflow() throws Exception {
        Professor p1 = postJson("/api/professors", new ProfessorRequest("Prof Solo"), Professor.class);
        ClassGroup cg = postJson("/api/class-groups",
            new ClassGroupRequest("2A ADM", ShiftType.REGULAR), ClassGroup.class);
        Subject subj = postJson("/api/subjects",
            new SubjectRequest("Gestao", cg.getId()), Subject.class);

        postJson("/api/timeslots", new TimeslotPayload(1, "08:00", "08:50", ShiftType.REGULAR), Timeslot.class);
        postJson("/api/demands", new DemandRequest(subj.getId(), Set.of(p1.getId()), 3, true), Demand.class);

        mockMvc.perform(get("/api/solver/diagnostico"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feasible").value(false))
            .andExpect(jsonPath("$.issues[*].category", hasItem("CLASS_CAPACITY")))
            .andExpect(jsonPath("$.issues[*].category", hasItem("PROFESSOR_OVERLOAD")));
    }

    @Test
    void curriculumCrudHandlesUpdatesConflictsNotFoundAndCascades() throws Exception {
        Professor p1 = postJson("/api/professors", new ProfessorRequest("Ana Paula"), Professor.class);
        Professor p2 = postJson("/api/professors", new ProfessorRequest("Bruno Silva"), Professor.class);

        // Conflito ao criar e atualizar com nome duplicado (case-insensitive)
        mockMvc.perform(post("/api/professors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ProfessorRequest("ana paula"))))
            .andExpect(status().isConflict());

        mockMvc.perform(put("/api/professors/" + p2.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ProfessorRequest("Ana Paula"))))
            .andExpect(status().isConflict());

        mockMvc.perform(put("/api/professors/" + p1.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ProfessorRequest("Ana Paula Atualizada"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Ana Paula Atualizada"));

        ClassGroup cg = postJson("/api/class-groups",
            new ClassGroupRequest("1M TEC", ShiftType.INTEGRAL), ClassGroup.class);
        mockMvc.perform(post("/api/class-groups")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ClassGroupRequest("1m tec", ShiftType.REGULAR))))
            .andExpect(status().isConflict());

        Subject subj = postJson("/api/subjects",
            new SubjectRequest("Algoritmos", cg.getId()), Subject.class);
        mockMvc.perform(post("/api/subjects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new SubjectRequest("algoritmos", cg.getId()))))
            .andExpect(status().isConflict());

        Demand demand = postJson("/api/demands",
            new DemandRequest(subj.getId(), Set.of(p1.getId()), 4, true), Demand.class);

        mockMvc.perform(put("/api/demands/" + demand.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new DemandRequest(subj.getId(), Set.of(p2.getId()), 5, true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.quantityPerWeek").value(5));

        // Deletar professor limpa demandas orfas dele
        mockMvc.perform(delete("/api/professors/" + p2.getId()))
            .andExpect(status().isNoContent());
        assertThat(demandRepository.findById(demand.getId())).isEmpty();
        assertThat(professorRepository.findById(p2.getId())).isEmpty();

        // Deletar turma em cascata limpa disciplina vinculada
        mockMvc.perform(delete("/api/class-groups/" + cg.getId()))
            .andExpect(status().isNoContent());
        assertThat(subjectRepository.findById(subj.getId())).isEmpty();

        // 404 em recursos inexistentes
        mockMvc.perform(get("/api/professors/999999")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/class-groups/999999")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/subjects/999999")).andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/demands/999999")).andExpect(status().isNotFound());
    }

    private <T> T postJson(String url, Object body, Class<T> responseType) throws Exception {
        MvcResult result = mockMvc.perform(post(url)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsString(), responseType);
    }

    private record TimeslotPayload(int dayOfWeek, String startTime, String endTime, ShiftType shiftType) {
    }
}
