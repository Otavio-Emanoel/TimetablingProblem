package com.etec.timetabling.web;

import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.SubjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/demands")
public class DemandController {
    private final DemandRepository demandRepository;
    private final SubjectRepository subjectRepository;
    private final ProfessorRepository professorRepository;

    public DemandController(
        DemandRepository demandRepository,
        SubjectRepository subjectRepository,
        ProfessorRepository professorRepository
    ) {
        this.demandRepository = demandRepository;
        this.subjectRepository = subjectRepository;
        this.professorRepository = professorRepository;
    }

    @GetMapping
    public List<Demand> list(@RequestParam(name = "classGroupId", required = false) Long classGroupId) {
        if (classGroupId == null) {
            return demandRepository.findAll();
        }
        return demandRepository.findBySubjectClassGroupId(classGroupId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Demand create(@Valid @RequestBody DemandRequest request) {
        Subject subject = subjectRepository.findById(request.subjectId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        List<Professor> professors = professorRepository.findAllById(request.professorIds());
        if (professors.size() != request.professorIds().size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Professor not found");
        }

        Demand demand = new Demand();
        demand.setSubject(subject);
        demand.setQuantityPerWeek(request.quantityPerWeek());
        demand.setAllowDoubleLesson(request.allowDoubleLesson());
        demand.setProfessors(new HashSet<>(professors));
        return demandRepository.save(demand);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!demandRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        demandRepository.deleteById(id);
    }

    public record DemandRequest(
        @NotNull Long subjectId,
        @NotEmpty Set<Long> professorIds,
        @Min(1) int quantityPerWeek,
        boolean allowDoubleLesson
    ) {
    }
}
