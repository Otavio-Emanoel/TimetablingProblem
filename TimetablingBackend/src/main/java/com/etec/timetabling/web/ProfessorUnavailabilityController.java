package com.etec.timetabling.web;

import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.util.List;
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
@RequestMapping("/api/unavailability")
public class ProfessorUnavailabilityController {
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorRepository professorRepository;

    public ProfessorUnavailabilityController(
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorRepository professorRepository
    ) {
        this.unavailabilityRepository = unavailabilityRepository;
        this.professorRepository = professorRepository;
    }

    @GetMapping
    public List<UnavailabilityResponse> list(
        @RequestParam(name = "professorId", required = false) Long professorId
    ) {
        List<ProfessorUnavailability> entries = professorId == null
            ? unavailabilityRepository.findAll()
            : unavailabilityRepository.findByProfessorId(professorId);

        return entries.stream()
            .map(entry -> new UnavailabilityResponse(
                entry.getId(),
                entry.getProfessor().getId(),
                entry.getDayOfWeek(),
                entry.getStartTime().toString(),
                entry.getEndTime().toString()
            ))
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UnavailabilityResponse create(@Valid @RequestBody UnavailabilityRequest request) {
        Professor professor = professorRepository.findById(request.professorId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (request.startTime().isAfter(request.endTime()) || request.startTime().equals(request.endTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid time range");
        }

        ProfessorUnavailability entry = new ProfessorUnavailability();
        entry.setProfessor(professor);
        entry.setDayOfWeek(request.dayOfWeek());
        entry.setStartTime(request.startTime());
        entry.setEndTime(request.endTime());
        ProfessorUnavailability saved = unavailabilityRepository.save(entry);

        return new UnavailabilityResponse(
            saved.getId(),
            professor.getId(),
            saved.getDayOfWeek(),
            saved.getStartTime().toString(),
            saved.getEndTime().toString()
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!unavailabilityRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        unavailabilityRepository.deleteById(id);
    }

    public record UnavailabilityRequest(
        @NotNull Long professorId,
        @NotNull Integer dayOfWeek,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime
    ) {
    }

    public record UnavailabilityResponse(
        Long id,
        Long professorId,
        int dayOfWeek,
        String startTime,
        String endTime
    ) {
    }
}
