package com.etec.timetabling.web;

import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/grade")
public class GradeController {
    private final ScheduleEntryRepository scheduleEntryRepository;

    public GradeController(ScheduleEntryRepository scheduleEntryRepository) {
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @GetMapping("/{classGroupId}")
    public List<GradeEntryResponse> list(@PathVariable Long classGroupId) {
        return scheduleEntryRepository.findByClassGroupId(classGroupId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(entry -> new GradeEntryResponse(
                entry.getTimeslot().getDayOfWeek(),
                entry.getTimeslot().getStartTime().toString(),
                entry.getTimeslot().getEndTime().toString(),
                entry.getSubject().getName(),
                entry.getProfessors().stream().map(professor -> professor.getName()).collect(Collectors.toList())
            ))
            .toList();
    }

    public record GradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        List<String> professors
    ) {
    }
}
