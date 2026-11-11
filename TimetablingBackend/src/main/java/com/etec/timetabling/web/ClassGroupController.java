package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.SubjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/class-groups")
public class ClassGroupController {
    private final ClassGroupRepository classGroupRepository;
    private final SubjectRepository subjectRepository;
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public ClassGroupController(
        ClassGroupRepository classGroupRepository,
        SubjectRepository subjectRepository,
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.classGroupRepository = classGroupRepository;
        this.subjectRepository = subjectRepository;
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @GetMapping
    public List<ClassGroup> list() {
        return classGroupRepository.findAllByOrderByNameAsc();
    }

    @GetMapping("/{id}")
    public ClassGroup get(@PathVariable Long id) {
        return classGroupRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassGroup create(@Valid @RequestBody ClassGroupRequest request) {
        String cleanName = request.name().trim();
        if (classGroupRepository.existsByNameIgnoreCase(cleanName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Turma ja cadastrada");
        }
        ClassGroup classGroup = new ClassGroup();
        classGroup.setName(cleanName);
        classGroup.setShiftType(request.shiftType());
        return classGroupRepository.save(classGroup);
    }

    @PutMapping("/{id}")
    public ClassGroup update(@PathVariable Long id, @Valid @RequestBody ClassGroupRequest request) {
        ClassGroup classGroup = classGroupRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String cleanName = request.name().trim();
        classGroupRepository.findByNameIgnoreCase(cleanName)
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe outra turma com este nome");
            });
        classGroup.setName(cleanName);
        classGroup.setShiftType(request.shiftType());
        return classGroupRepository.save(classGroup);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        if (!classGroupRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        scheduleEntryRepository.deleteByClassGroupId(id);
        demandRepository.deleteBySubjectClassGroupId(id);

        List<Subject> subjects = subjectRepository.findByClassGroupId(id);
        for (Subject s : subjects) {
            preferenceRepository.deleteBySubjectId(s.getId());
        }
        subjectRepository.deleteByClassGroupId(id);
        classGroupRepository.deleteById(id);
    }

    public record ClassGroupRequest(
        @NotBlank @Size(min = 1, max = 80) String name,
        @NotNull ShiftType shiftType
    ) {
    }
}
