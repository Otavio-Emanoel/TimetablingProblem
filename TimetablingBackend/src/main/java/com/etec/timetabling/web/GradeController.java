package com.etec.timetabling.web;

import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/grade")
public class GradeController {
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorRepository professorRepository;

    public GradeController(
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorRepository professorRepository
    ) {
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.professorRepository = professorRepository;
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
            .collect(Collectors.groupingBy(ScheduleEntry::getClassGroup));

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

    @GetMapping("/professor/{professorId}")
    public List<ProfessorGradeEntryResponse> listByProfessor(@PathVariable Long professorId) {
        return scheduleEntryRepository.findByProfessorsId(professorId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(this::toProfessorEntryResponse)
            .toList();
    }

    @GetMapping("/professores")
    public Map<String, ProfessorGradeResponse> listAllProfessors() {
        List<Professor> allProfessors = professorRepository.findAllByOrderByNameAsc();
        List<ScheduleEntry> allEntries = scheduleEntryRepository.findAll();

        Map<Long, List<ScheduleEntry>> entriesByProfId = new LinkedHashMap<>();
        for (ScheduleEntry entry : allEntries) {
            for (Professor prof : entry.getProfessors()) {
                entriesByProfId.computeIfAbsent(prof.getId(), k -> new ArrayList<>()).add(entry);
            }
        }

        Map<String, ProfessorGradeResponse> result = new LinkedHashMap<>();
        for (Professor prof : allProfessors) {
            List<ScheduleEntry> profEntries = entriesByProfId.getOrDefault(prof.getId(), List.of());
            if (profEntries.isEmpty()) {
                continue;
            }
            List<ProfessorGradeEntryResponse> sorted = profEntries.stream()
                .sorted(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                    .thenComparing(e -> e.getTimeslot().getStartTime()))
                .map(this::toProfessorEntryResponse)
                .toList();
            result.put(prof.getName(), new ProfessorGradeResponse(prof.getId(), prof.getName(), sorted));
        }

        return result;
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void clearAllGrades() {
        scheduleEntryRepository.deleteAll();
    }

    private GradeEntryResponse toResponse(ScheduleEntry entry) {
        return new GradeEntryResponse(
            entry.getTimeslot().getDayOfWeek(),
            entry.getTimeslot().getStartTime().toString(),
            entry.getTimeslot().getEndTime().toString(),
            entry.getSubject().getName(),
            entry.getProfessors().stream().map(Professor::getName).sorted().collect(Collectors.toList())
        );
    }

    private ProfessorGradeEntryResponse toProfessorEntryResponse(ScheduleEntry entry) {
        return new ProfessorGradeEntryResponse(
            entry.getTimeslot().getDayOfWeek(),
            entry.getTimeslot().getStartTime().toString(),
            entry.getTimeslot().getEndTime().toString(),
            entry.getSubject().getName(),
            entry.getClassGroup().getName(),
            entry.getClassGroup().getShiftType().name(),
            entry.getProfessors().stream().map(Professor::getName).sorted().collect(Collectors.toList())
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

    public record ProfessorGradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        String classGroup,
        String shiftType,
        List<String> professors
    ) {}

    public record ProfessorGradeResponse(
        Long id,
        String name,
        List<ProfessorGradeEntryResponse> entries
    ) {}
}
