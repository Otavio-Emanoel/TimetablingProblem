package com.etec.timetabling.web;

import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.repository.ProfessorRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/professors")
public class ProfessorController {
    private final ProfessorRepository professorRepository;

    public ProfessorController(ProfessorRepository professorRepository) {
        this.professorRepository = professorRepository;
    }

    @GetMapping
    public List<Professor> list() {
        return professorRepository.findAll();
    }

    @GetMapping("/{id}")
    public Professor get(@PathVariable Long id) {
        return professorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Professor create(@Valid @RequestBody ProfessorRequest request) {
        Professor professor = new Professor();
        professor.setName(request.name());
        professor.setEmail(request.email());
        professor.setMaxWeeklyHours(request.maxWeeklyHours());
        professor.setUnavailability(request.unavailability());
        return professorRepository.save(professor);
    }

    @PutMapping("/{id}")
    public Professor update(@PathVariable Long id, @Valid @RequestBody ProfessorRequest request) {
        Professor professor = professorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        professor.setName(request.name());
        professor.setEmail(request.email());
        professor.setMaxWeeklyHours(request.maxWeeklyHours());
        professor.setUnavailability(request.unavailability());
        return professorRepository.save(professor);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!professorRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        professorRepository.deleteById(id);
    }

    public record ProfessorRequest(
        @NotBlank String name,
        @Email String email,
        @Min(1) int maxWeeklyHours,
        String unavailability
    ) {
    }
}
