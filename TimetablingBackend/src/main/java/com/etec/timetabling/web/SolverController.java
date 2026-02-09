package com.etec.timetabling.web;

import com.etec.timetabling.service.SolverService;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/solver")
public class SolverController {
    private final SolverService solverService;
    private final AtomicReference<String> status = new AtomicReference<>("IDLE");

    public SolverController(SolverService solverService) {
        this.solverService = solverService;
    }

    @PostMapping("/iniciar")
    public SolverStatusResponse start() {
        status.set("RUNNING");
        SolverService.SolverResult result = solverService.solve();
        status.set("COMPLETED");
        return new SolverStatusResponse(status.get(), Instant.now().toString(), result.scheduled(), result.unscheduled());
    }

    @GetMapping("/status")
    public SolverStatusResponse status() {
        return new SolverStatusResponse(status.get(), Instant.now().toString(), null, null);
    }

    public record SolverStatusResponse(
        String status,
        String timestamp,
        Integer scheduled,
        Integer unscheduled
    ) {
    }
}
