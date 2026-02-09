package com.etec.timetabling.web;

import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.LessonRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.SubjectRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SummaryController {
    private final TimeslotRepository timeslotRepository;
    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;

    public SummaryController(
        TimeslotRepository timeslotRepository,
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        SubjectRepository subjectRepository,
        LessonRepository lessonRepository,
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository
    ) {
        this.timeslotRepository = timeslotRepository;
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.subjectRepository = subjectRepository;
        this.lessonRepository = lessonRepository;
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("ok", Instant.now().toString());
    }

    @GetMapping("/summary")
    public SummaryResponse summary() {
        return new SummaryResponse(
            timeslotRepository.count(),
            professorRepository.count(),
            classGroupRepository.count(),
            subjectRepository.count(),
            lessonRepository.count(),
            demandRepository.count(),
            scheduleEntryRepository.count()
        );
    }

    public record HealthResponse(String status, String timestamp) {
    }

    public record SummaryResponse(
        long timeslots,
        long professors,
        long classGroups,
        long subjects,
        long lessons,
        long demands,
        long scheduleEntries
    ) {
    }
}
