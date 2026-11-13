package com.etec.timetabling.web;

import com.etec.timetabling.service.SeedService;
import com.etec.timetabling.service.SeedService.SeedExecutionResult;
import com.etec.timetabling.service.SeedService.SeedPresetSummary;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Endpoints para listar e aplicar presets curriculares da ETEC via Java.
 */
@RestController
@RequestMapping("/api/seed")
public class SeedController {

    private final SeedService seedService;
    private final SolverController solverController;

    public SeedController(SeedService seedService, SolverController solverController) {
        this.seedService = seedService;
        this.solverController = solverController;
    }

    @GetMapping("/presets")
    public List<SeedPresetSummary> listPresets() {
        return seedService.listPresets();
    }

    @PostMapping("/{presetId}")
    public SeedExecutionResult applyPreset(
        @PathVariable String presetId,
        @RequestParam(name = "reset", defaultValue = "false") boolean reset
    ) {
        if (solverController.isRunning()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Nao e possivel aplicar seed enquanto o solver esta em execucao"
            );
        }
        return seedService.applyPreset(presetId, reset);
    }
}

