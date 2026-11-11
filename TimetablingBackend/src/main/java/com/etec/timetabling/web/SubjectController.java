package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.SubjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {
    private final SubjectRepository subjectRepository;
    private final ClassGroupRepository classGroupRepository;
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public SubjectController(
        SubjectRepository subjectRepository,
        ClassGroupRepository classGroupRepository,
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.subjectRepository = subjectRepository;
        this.classGroupRepository = classGroupRepository;
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @GetMapping
    public List<Subject> list(@RequestParam(name = "classGroupId", required = false) Long classGroupId) {
        if (classGroupId == null) {
            return subjectRepository.findAll();
        }
        return subjectRepository.findByClassGroupId(classGroupId);
    }

    @GetMapping("/{id}")
    public Subject get(@PathVariable Long id) {
        return subjectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Subject create(@Valid @RequestBody SubjectRequest request) {
        ClassGroup classGroup = classGroupRepository.findById(request.classGroupId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        String cleanName = request.name().trim();
        if (subjectRepository.existsByNameIgnoreCaseAndClassGroupId(cleanName, classGroup.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Materia ja cadastrada para esta turma");
        }

        Subject subject = new Subject();
        subject.setName(cleanName);
        subject.setClassGroup(classGroup);
        subject.setDoubleLessonAllowed(false);
        return subjectRepository.save(subject);
    }

    @PutMapping("/{id}")
    public Subject update(@PathVariable Long id, @Valid @RequestBody SubjectRequest request) {
        Subject subject = subjectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        ClassGroup classGroup = classGroupRepository.findById(request.classGroupId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        String cleanName = request.name().trim();
        subjectRepository.findByNameIgnoreCaseAndClassGroupId(cleanName, classGroup.getId())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Materia ja existe nesta turma");
            });

        subject.setName(cleanName);
        subject.setClassGroup(classGroup);
        return subjectRepository.save(subject);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        if (!subjectRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        scheduleEntryRepository.deleteBySubjectId(id);
        demandRepository.deleteBySubjectId(id);
        preferenceRepository.deleteBySubjectId(id);
        subjectRepository.deleteById(id);
    }

    public record SubjectRequest(
        @NotBlank @Size(min = 1, max = 120) String name,
        @NotNull @Positive Long classGroupId
    ) {
    }
}
