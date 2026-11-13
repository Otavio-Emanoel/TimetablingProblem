package com.etec.timetabling.web;

import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.service.CurriculumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/professors")
public class ProfessorController {

    private final CurriculumService curriculumService;

    public ProfessorController(CurriculumService curriculumService) {
        this.curriculumService = curriculumService;
    }

    @GetMapping
    public List<Professor> list() {
        return curriculumService.listProfessors();
    }

    @GetMapping("/{id}")
    public Professor get(@PathVariable Long id) {
        return curriculumService.getProfessor(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Professor create(@Valid @RequestBody ProfessorRequest request) {
        return curriculumService.createProfessor(request);
    }

    @PutMapping("/{id}")
    public Professor update(@PathVariable Long id, @Valid @RequestBody ProfessorRequest request) {
        return curriculumService.updateProfessor(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        curriculumService.deleteProfessor(id);
    }

    public record ProfessorRequest(
        @NotBlank @Size(min = 1, max = 120) String name
    ) {
    }
}
