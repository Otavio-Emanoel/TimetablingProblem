package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.repository.ClassGroupRepository;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/class-groups")
public class ClassGroupController {
    private final ClassGroupRepository classGroupRepository;

    public ClassGroupController(ClassGroupRepository classGroupRepository) {
        this.classGroupRepository = classGroupRepository;
    }

    @GetMapping
    public List<ClassGroup> list() {
        return classGroupRepository.findAll();
    }

    @GetMapping("/{id}")
    public ClassGroup get(@PathVariable Long id) {
        return classGroupRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassGroup create(@Valid @RequestBody ClassGroupRequest request) {
        ClassGroup classGroup = new ClassGroup();
        classGroup.setName(request.name());
        classGroup.setShiftType(request.shiftType());
        return classGroupRepository.save(classGroup);
    }

    @PutMapping("/{id}")
    public ClassGroup update(@PathVariable Long id, @Valid @RequestBody ClassGroupRequest request) {
        ClassGroup classGroup = classGroupRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        classGroup.setName(request.name());
        classGroup.setShiftType(request.shiftType());
        return classGroupRepository.save(classGroup);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!classGroupRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        classGroupRepository.deleteById(id);
    }

    public record ClassGroupRequest(
        @NotBlank String name,
        @NotNull ShiftType shiftType
    ) {
    }
}
