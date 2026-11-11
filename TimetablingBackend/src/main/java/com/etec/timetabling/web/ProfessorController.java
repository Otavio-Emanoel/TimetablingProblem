package com.etec.timetabling.web;

import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
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
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public ProfessorController(
        ProfessorRepository professorRepository,
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.professorRepository = professorRepository;
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @GetMapping
    public List<Professor> list() {
        return professorRepository.findAllByOrderByNameAsc();
    }

    @GetMapping("/{id}")
    public Professor get(@PathVariable Long id) {
        return professorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Professor create(@Valid @RequestBody ProfessorRequest request) {
        String cleanName = request.name().trim();
        if (professorRepository.existsByNameIgnoreCase(cleanName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Professor ja cadastrado");
        }
        Professor professor = new Professor();
        professor.setName(cleanName);
        return professorRepository.save(professor);
    }

    @PutMapping("/{id}")
    public Professor update(@PathVariable Long id, @Valid @RequestBody ProfessorRequest request) {
        Professor professor = professorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String cleanName = request.name().trim();
        professorRepository.findByNameIgnoreCase(cleanName)
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe outro professor com este nome");
            });
        professor.setName(cleanName);
        return professorRepository.save(professor);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        Professor professor = professorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        unavailabilityRepository.deleteByProfessorId(id);
        preferenceRepository.deleteByProfessorId(id);

        List<ScheduleEntry> entries = scheduleEntryRepository.findByProfessorsId(id);
        List<ScheduleEntry> entriesToDelete = new ArrayList<>();
        for (ScheduleEntry entry : entries) {
            entry.getProfessors().removeIf(p -> p.getId().equals(id));
            if (entry.getProfessors().isEmpty()) {
                entriesToDelete.add(entry);
            }
        }
        if (!entriesToDelete.isEmpty()) {
            scheduleEntryRepository.deleteAll(entriesToDelete);
        }

        List<Demand> allDemands = demandRepository.findAll();
        List<Demand> demandsToDelete = new ArrayList<>();
        for (Demand demand : allDemands) {
            boolean removed = demand.getProfessors().removeIf(p -> p.getId().equals(id));
            if (removed && demand.getProfessors().isEmpty()) {
                demandsToDelete.add(demand);
            }
        }
        if (!demandsToDelete.isEmpty()) {
            demandRepository.deleteAll(demandsToDelete);
        }

        professorRepository.delete(professor);
    }

    public record ProfessorRequest(
        @NotBlank @Size(min = 1, max = 120) String name
    ) {
    }
}
