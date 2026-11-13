package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.service.CurriculumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/class-groups")
public class ClassGroupController {

    private final CurriculumService curriculumService;

    public ClassGroupController(CurriculumService curriculumService) {
        this.curriculumService = curriculumService;
    }

    @GetMapping
    public List<ClassGroup> list() {
        return curriculumService.listClassGroups();
    }

    @GetMapping("/{id}")
    public ClassGroup get(@PathVariable Long id) {
        return curriculumService.getClassGroup(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassGroup create(@Valid @RequestBody ClassGroupRequest request) {
        return curriculumService.createClassGroup(request);
    }

    @PutMapping("/{id}")
    public ClassGroup update(@PathVariable Long id, @Valid @RequestBody ClassGroupRequest request) {
        return curriculumService.updateClassGroup(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        curriculumService.deleteClassGroup(id);
    }

    public record ClassGroupRequest(
        @NotBlank @Size(min = 1, max = 80) String name,
        @NotNull ShiftType shiftType
    ) {
    }
}
