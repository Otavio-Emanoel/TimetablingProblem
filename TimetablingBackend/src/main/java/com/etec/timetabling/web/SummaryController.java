package com.etec.timetabling.web;

import com.etec.timetabling.service.BackupService;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class SummaryController {

    private final BackupService backupService;
    private final SolverController solverController;

    public SummaryController(BackupService backupService, SolverController solverController) {
        this.backupService = backupService;
        this.solverController = solverController;
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("ok", Instant.now().toString());
    }

    @GetMapping("/summary")
    public SummaryResponse summary() {
        return backupService.getSummary();
    }

    @DeleteMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetAll() {
        if (solverController.isRunning()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Nao e possivel limpar os dados enquanto o solver esta em execucao"
            );
        }
        backupService.resetAll();
    }

    @GetMapping("/backup")
    public BackupPayload exportBackup() {
        return backupService.exportBackup();
    }

    @PostMapping("/backup")
    public SummaryResponse importBackup(@RequestBody BackupPayload backup) {
        if (solverController.isRunning()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Nao e possivel restaurar backup enquanto o solver esta em execucao"
            );
        }
        return backupService.importBackup(backup);
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
        long scheduleEntries,
        long unavailabilities,
        long preferences
    ) {
    }

    public record ClassGroupBackup(String name, String shiftType) {}
    public record TimeslotBackup(int dayOfWeek, String startTime, String endTime, String shiftType) {}
    public record SubjectBackup(String name, String classGroupName) {}
    public record DemandBackup(String subjectName, String classGroupName, List<String> professors, int quantityPerWeek, boolean allowDoubleLesson) {}
    public record UnavailabilityBackup(String professorName, int dayOfWeek, String startTime, String endTime) {}
    public record PreferenceBackup(String professorName, String subjectName, String classGroupName, int dayOfWeek, String startTime, String endTime, int weight, String type) {}
    public record ScheduleEntryBackup(String classGroupName, String subjectName, int dayOfWeek, String startTime, String endTime, String shiftType, List<String> professors) {}

    public record BackupPayload(
        String exportedAt,
        List<String> professors,
        List<ClassGroupBackup> classGroups,
        List<TimeslotBackup> timeslots,
        List<SubjectBackup> subjects,
        List<DemandBackup> demands,
        List<UnavailabilityBackup> unavailabilities,
        List<PreferenceBackup> preferences,
        List<ScheduleEntryBackup> scheduleEntries
    ) {}
}
