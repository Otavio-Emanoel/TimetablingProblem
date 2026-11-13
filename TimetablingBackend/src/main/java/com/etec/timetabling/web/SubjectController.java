package com.etec.timetabling.web;

import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.service.CurriculumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final CurriculumService curriculumService;

    public SubjectController(CurriculumService curriculumService) {
        this.curriculumService = curriculumService;
    }

    @GetMapping
    public List<Subject> list(@RequestParam(name = "classGroupId", required = false) Long classGroupId) {
        return curriculumService.listSubjects(classGroupId);
    }

    @GetMapping("/{id}")
    public Subject get(@PathVariable Long id) {
        return curriculumService.getSubject(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Subject create(@Valid @RequestBody SubjectRequest request) {
        return curriculumService.createSubject(request);
    }

    @PutMapping("/{id}")
    public Subject update(@PathVariable Long id, @Valid @RequestBody SubjectRequest request) {
        return curriculumService.updateSubject(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        curriculumService.deleteSubject(id);
    }

    public record SubjectRequest(
        @NotBlank @Size(min = 1, max = 120) String name,
        @NotNull @Positive Long classGroupId
    ) {
    }
}
