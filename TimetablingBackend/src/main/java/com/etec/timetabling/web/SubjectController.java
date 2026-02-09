package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.SubjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {
    private final SubjectRepository subjectRepository;
    private final ClassGroupRepository classGroupRepository;

    public SubjectController(SubjectRepository subjectRepository, ClassGroupRepository classGroupRepository) {
        this.subjectRepository = subjectRepository;
        this.classGroupRepository = classGroupRepository;
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

        Subject subject = new Subject();
        subject.setName(request.name());
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
        subject.setName(request.name());
        subject.setClassGroup(classGroup);
        return subjectRepository.save(subject);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!subjectRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        subjectRepository.deleteById(id);
    }

    public record SubjectRequest(
        @NotBlank String name,
        @NotNull Long classGroupId
    ) {
    }
}
