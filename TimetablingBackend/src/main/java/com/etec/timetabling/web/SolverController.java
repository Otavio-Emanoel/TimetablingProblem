package com.etec.timetabling.web;

import com.etec.timetabling.service.GradeService;
import com.etec.timetabling.service.SolverDiagnosticsService;
import com.etec.timetabling.service.SolverDiagnosticsService.DiagnosticReport;
import com.etec.timetabling.service.SolverService;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
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
    private final SolverDiagnosticsService diagnosticsService;
    private final GradeService gradeService;

    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicReference<String> status = new AtomicReference<>("IDLE");
    private final AtomicReference<SolverService.SolverResult> lastResult = new AtomicReference<>(null);
    private final AtomicReference<String> errorMessage = new AtomicReference<>(null);

    public SolverController(
        SolverService solverService,
        SolverDiagnosticsService diagnosticsService,
        GradeService gradeService
    ) {
        this.solverService = solverService;
        this.diagnosticsService = diagnosticsService;
        this.gradeService = gradeService;
    }

    public boolean isRunning() {
        return running.get();
    }

    @GetMapping("/validar")
    public ValidationResponse validate() {
        return diagnosticsService.validate();
    }

    @GetMapping("/diagnostico")
    public DiagnosticReport diagnose() {
        return diagnosticsService.diagnose();
    }

    @PostMapping("/iniciar")
    public SolverStatusResponse start() {
        if (!running.compareAndSet(false, true)) {
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
                errorMessage.set("Falha ao processar a grade horaria. Verifique os dados cadastrados.");
                status.set("ERROR");
            } finally {
                running.set(false);
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

    @GetMapping("/grade/{classGroupId}")
    public List<GradeEntryResponse> getGradeForClass(@PathVariable Long classGroupId) {
        return gradeService.listByClassGroup(classGroupId).stream()
            .map(e -> new GradeEntryResponse(
                e.dayOfWeek(),
                e.startTime(),
                e.endTime(),
                e.subject(),
                e.professors()
            ))
            .toList();
    }

    public record ValidationResponse(
        boolean feasible,
        int totalLessons,
        int totalSlots,
        List<String> errors,
        List<String> warnings
    ) {}

    public record SolverStatusResponse(
        String status,
        String timestamp,
        Integer scheduled,
        Integer unscheduled,
        String details
    ) {}

    public record GradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        List<String> professors
    ) {}
}
