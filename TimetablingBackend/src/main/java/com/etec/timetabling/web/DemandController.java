package com.etec.timetabling.web;

import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.service.CurriculumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
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
@RequestMapping("/api/demands")
public class DemandController {

    private final CurriculumService curriculumService;

    public DemandController(CurriculumService curriculumService) {
        this.curriculumService = curriculumService;
    }

    @GetMapping
    public List<Demand> list(@RequestParam(name = "classGroupId", required = false) Long classGroupId) {
        return curriculumService.listDemands(classGroupId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Demand create(@Valid @RequestBody DemandRequest request) {
        return curriculumService.createDemand(request);
    }

    @PutMapping("/{id}")
    public Demand update(@PathVariable Long id, @Valid @RequestBody DemandRequest request) {
        return curriculumService.updateDemand(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        curriculumService.deleteDemand(id);
    }

    public record DemandRequest(
        @NotNull @Positive Long subjectId,
        @NotEmpty @Size(max = 10) Set<@NotNull @Positive Long> professorIds,
        @Min(1) @Max(40) int quantityPerWeek,
        boolean allowDoubleLesson
    ) {
    }
}
