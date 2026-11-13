package com.etec.timetabling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.service.SolverService;
import com.etec.timetabling.service.SubjectAreaTheme;
import com.etec.timetabling.web.ClassGroupController;
import com.etec.timetabling.web.DemandController;
import com.etec.timetabling.web.ProfessorController;
import com.etec.timetabling.web.SubjectController;
import com.etec.timetabling.web.SummaryController;
import com.etec.timetabling.web.TimeslotController;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import java.nio.charset.StandardCharsets;
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

@SpringBootTest
@ActiveProfiles("test")
class ExportControllerTests {

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
    private SolverService solverService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        summaryController.resetAll();
    }

    @Test
    void subjectAreaThemeClassifiesAllEightEtecAreas() {
        assertThat(SubjectAreaTheme.classify(null)).isEqualTo(SubjectAreaTheme.VAGO);
        assertThat(SubjectAreaTheme.classify("  ")).isEqualTo(SubjectAreaTheme.VAGO);
        assertThat(SubjectAreaTheme.classify("Língua Portuguesa")).isEqualTo(SubjectAreaTheme.LINGUAGENS);
        assertThat(SubjectAreaTheme.classify("Matemática Aplicada")).isEqualTo(SubjectAreaTheme.MATEMATICA);
        assertThat(SubjectAreaTheme.classify("Química Orgânica")).isEqualTo(SubjectAreaTheme.NATUREZA);
        assertThat(SubjectAreaTheme.classify("História do Brasil")).isEqualTo(SubjectAreaTheme.HUMANAS);
        assertThat(SubjectAreaTheme.classify("Educação Física")).isEqualTo(SubjectAreaTheme.EDUCACAO_FISICA);
        assertThat(SubjectAreaTheme.classify("Design Digital")).isEqualTo(SubjectAreaTheme.ARTES);
        assertThat(SubjectAreaTheme.classify("TCC - Planejamento")).isEqualTo(SubjectAreaTheme.GESTAO);
        assertThat(SubjectAreaTheme.classify("Programação Web III")).isEqualTo(SubjectAreaTheme.TECNOLOGIA);
        assertThat(SubjectAreaTheme.legendCategories()).hasSize(8);
    }

    @Test
    void exportClassAndAllAndProfessorPdfProduceValidCompactVectorDocuments() throws Exception {
        timeslotController.createDefaultEtecSchedule();
        Professor profAna = professorController.create(new ProfessorController.ProfessorRequest("Prof. Ana Export"));
        ClassGroup turma1 = classGroupController.create(new ClassGroupController.ClassGroupRequest("1MDS", ShiftType.INTEGRAL));
        ClassGroup turma2 = classGroupController.create(new ClassGroupController.ClassGroupRequest("1JOD", ShiftType.REGULAR));

        Subject subj1 = subjectController.create(new SubjectController.SubjectRequest("Programação Web I", turma1.getId()));
        Subject subj2 = subjectController.create(new SubjectController.SubjectRequest("Matemática", turma2.getId()));

        demandController.create(new DemandController.DemandRequest(subj1.getId(), Set.of(profAna.getId()), 4, true));
        demandController.create(new DemandController.DemandRequest(subj2.getId(), Set.of(profAna.getId()), 2, true));

        var result = solverService.solve();
        assertThat(result.scheduled()).isEqualTo(6);

        MvcResult classPdfRes = mockMvc.perform(get("/api/export/pdf/turma/{id}", turma1.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("grade-1mds.pdf")))
            .andReturn();

        byte[] classBytes = classPdfRes.getResponse().getContentAsByteArray();
        assertThat(new String(classBytes, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        try (PdfReader reader = new PdfReader(classBytes)) {
            assertThat(reader.getNumberOfPages()).isEqualTo(1);
            String pageText = new PdfTextExtractor(reader).getTextFromPage(1);
            assertThat(pageText).contains("1MDS");
            assertThat(pageText).contains("Programação Web I");
        }

        MvcResult allPdfRes = mockMvc.perform(get("/api/export/pdf/todas"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andReturn();

        byte[] allBytes = allPdfRes.getResponse().getContentAsByteArray();
        try (PdfReader reader = new PdfReader(allBytes)) {
            assertThat(reader.getNumberOfPages()).isEqualTo(2);
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            String combined = extractor.getTextFromPage(1) + "\n" + extractor.getTextFromPage(2);
            assertThat(combined).contains("1JOD");
            assertThat(combined).contains("1MDS");
        }

        MvcResult profPdfRes = mockMvc.perform(get("/api/export/pdf/professor/{id}", profAna.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andReturn();

        try (PdfReader reader = new PdfReader(profPdfRes.getResponse().getContentAsByteArray())) {
            assertThat(reader.getNumberOfPages()).isEqualTo(1);
            String pageText = new PdfTextExtractor(reader).getTextFromPage(1);
            assertThat(pageText).contains("Prof. Ana Export");
            assertThat(pageText).contains("Turma 1MDS");
        }
    }

    @Test
    void exportCsvProtectsAgainstFormulaInjectionAndIncludesBom() throws Exception {
        timeslotController.createDefaultEtecSchedule();
        Professor prof = professorController.create(new ProfessorController.ProfessorRequest("+Prof Malicioso"));
        ClassGroup turma = classGroupController.create(new ClassGroupController.ClassGroupRequest("2MDS", ShiftType.REGULAR));
        Subject subj = subjectController.create(new SubjectController.SubjectRequest("=CMD|'/C calc'!A0", turma.getId()));
        demandController.create(new DemandController.DemandRequest(subj.getId(), Set.of(prof.getId()), 2, false));
        solverService.solve();

        MvcResult csvRes = mockMvc.perform(get("/api/export/csv/turma/{id}", turma.getId()))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
            .andReturn();

        String csv = new String(csvRes.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        assertThat(csv).startsWith("\uFEFFTurma;Dia;Inicio;Fim;Disciplina;Area;Professores");
        assertThat(csv).contains("'=CMD|'/C calc'!A0");
        assertThat(csv).contains("'+Prof Malicioso");
        assertThat(csv).doesNotContain("\n=CMD");
        assertThat(csv).doesNotContain(";+Prof");

        MvcResult profCsvRes = mockMvc.perform(get("/api/export/csv/professor/{id}", prof.getId()))
            .andExpect(status().isOk())
            .andReturn();
        String profCsv = new String(profCsvRes.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        assertThat(profCsv).contains("'+Prof Malicioso");
        assertThat(profCsv).contains("'=CMD|'/C calc'!A0");

        mockMvc.perform(get("/api/export/csv/todas"))
            .andExpect(status().isOk());
    }

    @Test
    void exportEndpointsReturn404ForMissingResources() throws Exception {
        mockMvc.perform(get("/api/export/pdf/turma/999999"))
            .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/export/pdf/professor/999999"))
            .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/export/csv/turma/999999"))
            .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/export/csv/professor/999999"))
            .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/export/pdf/todas"))
            .andExpect(status().isNotFound());
    }
}

