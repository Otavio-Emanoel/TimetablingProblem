package com.etec.timetabling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.etec.timetabling.service.SeedService;
import com.etec.timetabling.service.SolverService;
import com.etec.timetabling.web.SummaryController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@ActiveProfiles("test")
class SeedControllerTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private SummaryController summaryController;

    @Autowired
    private SeedService seedService;

    @Autowired
    private SolverService solverService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        summaryController.resetAll();
    }

    @Test
    void listPresetsExposesCanonicalEtecAndSimples() throws Exception {
        mockMvc.perform(get("/api/seed/presets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value("etec-oficial"))
            .andExpect(jsonPath("$[0].totalWeeklyLessons").value(409))
            .andExpect(jsonPath("$[1].id").value("simples"))
            .andExpect(jsonPath("$[1].totalWeeklyLessons").value(61));
    }

    @Test
    void applyEtecOficialPresetIsIdempotentAndCapsFreeSlotsAtMostFourPerClass() throws Exception {
        mockMvc.perform(post("/api/seed/etec-oficial").param("reset", "true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.professorsTotal").value(33))
            .andExpect(jsonPath("$.classGroupsTotal").value(12))
            .andExpect(jsonPath("$.timeslotsTotal").value(70))
            .andExpect(jsonPath("$.demandsTotal").value(195))
            .andExpect(jsonPath("$.totalWeeklyLessons").value(409))
            .andExpect(jsonPath("$.lessonsPerClass.1MAD").value(36))
            .andExpect(jsonPath("$.lessonsPerClass.1MDS").value(37))
            .andExpect(jsonPath("$.lessonsPerClass.1JOD").value(27));

        // Segunda execução sem reset deve criar 0 itens duplicados
        var secondRun = seedService.applyPreset("completo", false);
        assertThat(secondRun.professorsCreated()).isZero();
        assertThat(secondRun.classGroupsCreated()).isZero();
        assertThat(secondRun.timeslotsCreated()).isZero();
        assertThat(secondRun.subjectsCreated()).isZero();
        assertThat(secondRun.demandsCreated()).isZero();
        assertThat(secondRun.totalWeeklyLessons()).isEqualTo(409);
    }

    @Test
    void applySimplesPresetSolvesCleanlyAndUnknownPresetReturns404() throws Exception {
        mockMvc.perform(post("/api/seed/simples").param("reset", "true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.classGroupsTotal").value(2))
            .andExpect(jsonPath("$.professorsTotal").value(7))
            .andExpect(jsonPath("$.totalWeeklyLessons").value(61));

        SolverService.SolverResult result = solverService.solve();
        assertThat(result.scheduled()).isEqualTo(61);
        assertThat(result.unscheduled()).isZero();

        mockMvc.perform(post("/api/seed/inexistente"))
            .andExpect(status().isNotFound());
    }
}
