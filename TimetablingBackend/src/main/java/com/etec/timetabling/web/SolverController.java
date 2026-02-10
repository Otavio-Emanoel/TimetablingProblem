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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/solver")
public class SolverController {
    private final SolverService solverService;
    private final ScheduleEntryRepository scheduleEntryRepository;
    // Armazena o estado na memória RAM (Simples para MVP)
    private final AtomicReference<String> status = new AtomicReference<>("IDLE");
    private final AtomicReference<SolverService.SolverResult> lastResult = new AtomicReference<>(null);

    public SolverController(SolverService solverService, ScheduleEntryRepository scheduleEntryRepository) {
        this.solverService = solverService;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @PostMapping("/iniciar")
    public SolverStatusResponse start() {
        // Se já estiver rodando, não inicia outro
        if ("RUNNING".equals(status.get())) {
            return new SolverStatusResponse("RUNNING", Instant.now().toString(), null, null);
        }

        status.set("RUNNING");

        // Roda o processo pesado em uma Thread separada (Async)
        CompletableFuture.runAsync(() -> {
            try {
                System.out.println("--- INICIANDO SOLVER EM BACKGROUND ---");
                SolverService.SolverResult result = solverService.solve();
                lastResult.set(result);
                status.set("COMPLETED");
                System.out.println("--- SOLVER FINALIZADO ---");
            } catch (Exception e) {
                e.printStackTrace();
                status.set("ERROR");
            }
        });

        // Responde imediatamente para o navegador não dar timeout
        return new SolverStatusResponse("STARTED", Instant.now().toString(), null, null);
    }

    @GetMapping("/status")
    public SolverStatusResponse status() {
        SolverService.SolverResult result = lastResult.get();
        Integer scheduled = result != null ? result.scheduled() : null;
        Integer unscheduled = result != null ? result.unscheduled() : null;
        
        return new SolverStatusResponse(status.get(), Instant.now().toString(), scheduled, unscheduled);
    }

    public record SolverStatusResponse(
        String status,
        String timestamp,
        Integer scheduled,
        Integer unscheduled
    ) {
    }

    // GET para retornar a grade gerada para uma turma específica
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
    ) {
    }
}
