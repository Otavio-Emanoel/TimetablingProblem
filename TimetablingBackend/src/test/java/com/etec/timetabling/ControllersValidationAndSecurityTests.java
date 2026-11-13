package com.etec.timetabling;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.web.ClassGroupController;
import com.etec.timetabling.web.ProfessorController;
import com.etec.timetabling.web.SubjectController;
import com.etec.timetabling.web.SummaryController;
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
class ControllersValidationAndSecurityTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private SummaryController summaryController;

    @Autowired
    private ProfessorController professorController;

    @Autowired
    private ClassGroupController classGroupController;

    @Autowired
    private SubjectController subjectController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        summaryController.resetAll();
    }

    @Test
    void unsupportedHttpMethodsReturn405InsteadOf500() throws Exception {
        mockMvc.perform(get("/api/grade"))
            .andExpect(status().isMethodNotAllowed())
            .andExpect(jsonPath("$.status").value(405))
            .andExpect(jsonPath("$.error").value("Method Not Allowed"));

        mockMvc.perform(delete("/api/summary"))
            .andExpect(status().isMethodNotAllowed())
            .andExpect(jsonPath("$.status").value(405));
    }

    @Test
    void unknownRouteReturns404Json() throws Exception {
        mockMvc.perform(get("/api/rota-inexistente"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void invalidPayloadsReturnStructured400Errors() throws Exception {
        // Nome em branco
        mockMvc.perform(post("/api/professors")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"   \"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.validationErrors.name").exists());

        // Turno inválido em turma
        mockMvc.perform(post("/api/class-groups")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"1TST\", \"shiftType\": \"INVALIDO\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));

        // Demanda fora do intervalo 1..40
        Professor prof = professorController.create(new ProfessorController.ProfessorRequest("Prof. Valid"));
        ClassGroup cg = classGroupController.create(new ClassGroupController.ClassGroupRequest("1VAL", ShiftType.REGULAR));
        Subject subj = subjectController.create(new SubjectController.SubjectRequest("Rede de Computadores", cg.getId()));

        mockMvc.perform(post("/api/demands")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "subjectId": %d,
                      "professorIds": [%d],
                      "quantityPerWeek": 55,
                      "allowDoubleLesson": false
                    }
                    """.formatted(subj.getId(), prof.getId())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.validationErrors.quantityPerWeek").exists());

        // Preferência com subjectId negativo
        mockMvc.perform(post("/api/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "professorId": %d,
                      "subjectId": -3,
                      "dayOfWeek": 1,
                      "startTime": "08:00",
                      "endTime": "09:40",
                      "weight": 5,
                      "type": "PREFERRED"
                    }
                    """.formatted(prof.getId())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("subjectId deve ser positivo"));
    }

    @Test
    void timeslotCreationRejectsInvalidDayOrInvertedRange() throws Exception {
        mockMvc.perform(post("/api/timeslots")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "dayOfWeek": "1",
                      "startTime": "10:00",
                      "endTime": "09:00",
                      "shiftType": "REGULAR"
                    }
                    """))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/timeslots")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "dayOfWeek": "8",
                      "startTime": "08:00",
                      "endTime": "08:50",
                      "shiftType": "REGULAR"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }
}
