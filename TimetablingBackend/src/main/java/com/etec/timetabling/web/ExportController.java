package com.etec.timetabling.web;

import com.etec.timetabling.service.ExportService;
import com.etec.timetabling.service.ExportService.ExportedDocument;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints REST para exportação de grades em PDF vetorial e CSV seguro.
 */
@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/pdf/turma/{classGroupId}")
    public ResponseEntity<byte[]> exportClassPdf(@PathVariable Long classGroupId) {
        return toResponse(exportService.exportClassGradePdf(classGroupId));
    }

    @GetMapping("/pdf/todas")
    public ResponseEntity<byte[]> exportAllPdf() {
        return toResponse(exportService.exportAllGradesPdf());
    }

    @GetMapping("/pdf/professor/{professorId}")
    public ResponseEntity<byte[]> exportProfessorPdf(@PathVariable Long professorId) {
        return toResponse(exportService.exportProfessorGradePdf(professorId));
    }

    @GetMapping("/csv/turma/{classGroupId}")
    public ResponseEntity<byte[]> exportClassCsv(@PathVariable Long classGroupId) {
        return toResponse(exportService.exportClassGradeCsv(classGroupId));
    }

    @GetMapping("/csv/professor/{professorId}")
    public ResponseEntity<byte[]> exportProfessorCsv(@PathVariable Long professorId) {
        return toResponse(exportService.exportProfessorGradeCsv(professorId));
    }

    @GetMapping("/csv/todas")
    public ResponseEntity<byte[]> exportAllCsv() {
        return toResponse(exportService.exportAllGradesCsv());
    }

    private ResponseEntity<byte[]> toResponse(ExportedDocument doc) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(doc.contentType()));
        headers.setContentDisposition(
            ContentDisposition.attachment().filename(doc.filename()).build()
        );
        headers.setCacheControl(CacheControl.noStore());
        return ResponseEntity.ok()
            .headers(headers)
            .body(doc.content());
    }
}

