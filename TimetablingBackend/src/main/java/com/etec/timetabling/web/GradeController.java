package com.etec.timetabling.web;

import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/grade")
public class GradeController {
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ClassGroupRepository classGroupRepository;

    public GradeController(ScheduleEntryRepository scheduleEntryRepository,
                           ClassGroupRepository classGroupRepository) {
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.classGroupRepository = classGroupRepository;
    }

    @GetMapping("/{classGroupId}")
    public List<GradeEntryResponse> list(@PathVariable Long classGroupId) {
        return scheduleEntryRepository.findByClassGroupId(classGroupId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(this::toResponse)
            .toList();
    }

    @GetMapping("/todas")
    public Map<String, ClassGradeResponse> listAll() {
        var allEntries = scheduleEntryRepository.findAll();
        var grouped = allEntries.stream()
                .collect(Collectors.groupingBy(e -> e.getClassGroup()));

        Map<String, ClassGradeResponse> result = new LinkedHashMap<>();

        grouped.entrySet().stream()
                .sorted(Comparator.comparing(e -> e.getKey().getName()))
                .forEach(entry -> {
                    var cg = entry.getKey();
                    var entries = entry.getValue().stream()
                            .sorted(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                                    .thenComparing(e -> e.getTimeslot().getStartTime()))
                            .map(this::toResponse)
                            .toList();
                    result.put(cg.getName(), new ClassGradeResponse(
                            cg.getId(), cg.getName(), cg.getShiftType().name(), entries));
                });

        return result;
    }

    private GradeEntryResponse toResponse(ScheduleEntry entry) {
        return new GradeEntryResponse(
                entry.getTimeslot().getDayOfWeek(),
                entry.getTimeslot().getStartTime().toString(),
                entry.getTimeslot().getEndTime().toString(),
                entry.getSubject().getName(),
                entry.getProfessors().stream().map(p -> p.getName()).collect(Collectors.toList())
        );
    }

    public record GradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        List<String> professors
    ) {}

    public record ClassGradeResponse(
        Long id,
        String name,
        String shiftType,
        List<GradeEntryResponse> entries
    ) {}
}
