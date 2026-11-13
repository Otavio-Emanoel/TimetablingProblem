package com.etec.timetabling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.service.SeedService;
import com.etec.timetabling.service.SolverService;
import com.etec.timetabling.web.ProfessorPreferenceController;
import com.etec.timetabling.web.ProfessorUnavailabilityController;
import com.etec.timetabling.web.SummaryController;
import java.time.LocalTime;
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
class AnalyticsAndTimeslotTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private SummaryController summaryController;

    @Autowired
    private SeedService seedService;

    @Autowired
    private SolverService solverService;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private ProfessorUnavailabilityController unavailabilityController;

    @Autowired
    private ProfessorPreferenceController preferenceController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        summaryController.resetAll();
    }

    @Test
    void analyticsEndpointsReturnAccurateOverviewWorkloadsThemesAndAvailabilityMatrix() throws Exception {
        seedService.applyPreset("simples", true);
        Long firstProfId = professorRepository.findAllByOrderByNameAsc().get(0).getId();

        unavailabilityController.create(new ProfessorUnavailabilityController.UnavailabilityRequest(
            firstProfId, 1, LocalTime.of(8, 0), LocalTime.of(9, 40)));
        preferenceController.create(new ProfessorPreferenceController.PreferenceRequest(
            firstProfId, null, 2, "10:00", "11:40", 8, "PREFERRED"));

        solverService.solve();

        mockMvc.perform(get("/api/analytics/overview"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalProfessors").value(7))
            .andExpect(jsonPath("$.totalClassGroups").value(2))
            .andExpect(jsonPath("$.totalDemandedLessons").value(61))
            .andExpect(jsonPath("$.totalAllocatedLessons").value(61))
            .andExpect(jsonPath("$.coveragePercent").value(100.0))
            .andExpect(jsonPath("$.totalWeeklySlotCapacity").value(70));

        mockMvc.perform(get("/api/analytics/professors/workload"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(7))
            .andExpect(jsonPath("$[0].demandedLessons").isNumber())
            .andExpect(jsonPath("$[0].loadStatus").isNotEmpty());

        mockMvc.perform(get("/api/analytics/subjects/themes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(8))
            .andExpect(jsonPath("$[0].weeklyLessons").isNumber());

        mockMvc.perform(get("/api/analytics/availability-matrix"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(5))
            .andExpect(jsonPath("$[0].dayOfWeek").value(1))
            .andExpect(jsonPath("$[0].regularSlotsCount").value(6))
            .andExpect(jsonPath("$[0].integralSlotsCount").value(8))
            .andExpect(jsonPath("$[0].professorBlocksCount").value(1));
    }

    @Test
    void timeslotCreationRejectsOverlapAndAllowsValidLifecycle() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/timeslots")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "dayOfWeek": "MONDAY",
                      "startTime": "19:00",
                      "endTime": "19:50",
                      "shiftType": "REGULAR"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.dayOfWeek").value(1))
            .andReturn();

        Timeslot slot = new ObjectMapper().readValue(
            created.getResponse().getContentAsString(),
            Timeslot.class
        );
        assertThat(slot.getId()).isNotNull();

        // Sobreposição parcial (19:20-20:10 colide com 19:00-19:50 na segunda REGULAR) -> 409 CONFLICT
        mockMvc.perform(post("/api/timeslots")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "dayOfWeek": "1",
                      "startTime": "19:20",
                      "endTime": "20:10",
                      "shiftType": "REGULAR"
                    }
                    """))
            .andExpect(status().isConflict());

        // Turno diferente no mesmo horário continua permitido
        mockMvc.perform(post("/api/timeslots")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "dayOfWeek": "1",
                      "startTime": "19:00",
                      "endTime": "19:50",
                      "shiftType": "INTEGRAL"
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/timeslots/{id}", slot.getId()))
            .andExpect(status().isNoContent());
    }
}
