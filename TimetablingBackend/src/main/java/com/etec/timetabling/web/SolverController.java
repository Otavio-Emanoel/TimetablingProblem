package com.etec.timetabling.web;

import com.etec.timetabling.service.SolverService;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.domain.ScheduleEntry;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/solver")
public class SolverController {

    private static final Logger log = LoggerFactory.getLogger(SolverController.class);

    private final SolverService solverService;
    private final ScheduleEntryRepository scheduleEntryRepository;

    private final AtomicReference<String> status = new AtomicReference<>("IDLE");
    private final AtomicReference<SolverService.SolverResult> lastResult = new AtomicReference<>(null);
    private final AtomicReference<String> errorMessage = new AtomicReference<>(null);

    public SolverController(SolverService solverService, ScheduleEntryRepository scheduleEntryRepository) {
        this.solverService = solverService;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @PostMapping("/iniciar")
    public SolverStatusResponse start() {
        if ("RUNNING".equals(status.get())) {
            return new SolverStatusResponse("RUNNING", Instant.now().toString(), null, null, "Solver já está rodando");
        }

        status.set("RUNNING");
        lastResult.set(null);
        errorMessage.set(null);

        CompletableFuture.runAsync(() -> {
            try {
                log.info("--- SOLVER INICIADO EM BACKGROUND ---");
                SolverService.SolverResult result = solverService.solve();
                lastResult.set(result);
                status.set("COMPLETED");
                log.info("--- SOLVER FINALIZADO COM SUCESSO ---");
            } catch (Exception e) {
                log.error("Solver falhou com erro", e);
                String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                errorMessage.set(msg);
                status.set("ERROR");
            }
        });

        return new SolverStatusResponse("STARTED", Instant.now().toString(), null, null, null);
    }

    @GetMapping("/status")
    public SolverStatusResponse status() {
        SolverService.SolverResult result = lastResult.get();
        Integer sch = result != null ? result.scheduled() : null;
        Integer unsch = result != null ? result.unscheduled() : null;
        String details = result != null ? result.details() : errorMessage.get();

        return new SolverStatusResponse(status.get(), Instant.now().toString(), sch, unsch, details);
    }

    public record SolverStatusResponse(
        String status,
        String timestamp,
        Integer scheduled,
        Integer unscheduled,
        String details
    ) {}

    @GetMapping("/grade/{classGroupId}")
    public List<GradeEntryResponse> getGradeForClass(@PathVariable Long classGroupId) {
        return scheduleEntryRepository.findByClassGroupId(classGroupId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(entry -> new GradeEntryResponse(
                entry.getTimeslot().getDayOfWeek(),
                entry.getTimeslot().getStartTime().toString(),
                entry.getTimeslot().getEndTime().toString(),
                entry.getSubject().getName(),
                entry.getProfessors().stream().map(prof -> prof.getName()).collect(Collectors.toList())
            ))
            .toList();
    }

    public record GradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        List<String> professors
    ) {}
}
