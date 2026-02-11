package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.service.SolverService;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import com.etec.timetabling.domain.ScheduleEntry;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final DemandRepository demandRepository;
    private final TimeslotRepository timeslotRepository;

    private final AtomicReference<String> status = new AtomicReference<>("IDLE");
    private final AtomicReference<SolverService.SolverResult> lastResult = new AtomicReference<>(null);
    private final AtomicReference<String> errorMessage = new AtomicReference<>(null);

    public SolverController(SolverService solverService,
                            ScheduleEntryRepository scheduleEntryRepository,
                            DemandRepository demandRepository,
                            TimeslotRepository timeslotRepository) {
        this.solverService = solverService;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.demandRepository = demandRepository;
        this.timeslotRepository = timeslotRepository;
    }

    @GetMapping("/validar")
    public ValidationResponse validate() {
        List<Demand> demands = demandRepository.findAll();
        List<Timeslot> timeslots = timeslotRepository.findAll();
        List<String> warnings = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        if (demands.isEmpty()) {
            errors.add("Nenhuma demanda cadastrada. Cadastre demandas antes de rodar o solver.");
            return new ValidationResponse(false, 0, 0, errors, warnings);
        }
        if (timeslots.isEmpty()) {
            errors.add("Nenhum timeslot cadastrado. Cadastre horários antes de rodar.");
            return new ValidationResponse(false, 0, 0, errors, warnings);
        }

        // Total de aulas necessárias
        int totalLessons = demands.stream().mapToInt(Demand::getQuantityPerWeek).sum();

        // Slots disponíveis por turno
        Map<ShiftType, Long> slotsByShift = timeslots.stream()
                .collect(Collectors.groupingBy(Timeslot::getShiftType, Collectors.counting()));

        // Agrupar demandas por turma (ClassGroup)
        Map<Long, List<Demand>> demandsByClassGroup = new HashMap<>();
        Map<Long, String> classGroupNames = new HashMap<>();
        Map<Long, ShiftType> classGroupShifts = new HashMap<>();
        for (Demand d : demands) {
            d.getProfessors().size(); // force-init lazy collection
            ClassGroup cg = d.getSubject().getClassGroup();
            demandsByClassGroup.computeIfAbsent(cg.getId(), k -> new ArrayList<>()).add(d);
            classGroupNames.put(cg.getId(), cg.getName());
            classGroupShifts.put(cg.getId(), cg.getShiftType());
        }

        boolean feasible = true;
        int classGroupsWithDemands = demandsByClassGroup.size();

        for (var entry : demandsByClassGroup.entrySet()) {
            Long cgId = entry.getKey();
            String cgName = classGroupNames.get(cgId);
            ShiftType shift = classGroupShifts.get(cgId);
            int needed = entry.getValue().stream().mapToInt(Demand::getQuantityPerWeek).sum();
            long available = slotsByShift.getOrDefault(shift, 0L);

            if (needed > available) {
                errors.add(String.format(
                        "Turma %s: %d aulas necessárias, mas apenas %d slots %s disponíveis.",
                        cgName, needed, available, shift));
                feasible = false;
            } else {
                double usage = (double) needed / available * 100;
                if (usage > 80) {
                    warnings.add(String.format(
                            "Turma %s: %.0f%% de ocupação (%d/%d slots %s).",
                            cgName, usage, needed, available, shift));
                }
            }
        }

        // Turmas sem demandas
        long totalClassGroups = 11; // approximate
        try {
            totalClassGroups = demands.stream()
                    .map(d -> d.getSubject().getClassGroup().getId())
                    .distinct().count();
        } catch (Exception ignored) {}

        if (classGroupsWithDemands < totalClassGroups) {
            // This is informational, not an error
        }

        // Checar professores sem demanda
        long demandsWithoutProf = demands.stream()
                .filter(d -> d.getProfessors().isEmpty()).count();
        if (demandsWithoutProf > 0) {
            warnings.add(String.format("%d demanda(s) sem professor(es) atribuído(s).", demandsWithoutProf));
        }

        // Info geral
        warnings.add(0, String.format("%d turmas com demandas, %d aulas totais.",
                classGroupsWithDemands, totalLessons));

        return new ValidationResponse(
                feasible, totalLessons, timeslots.size(), errors, warnings);
    }

    public record ValidationResponse(
        boolean feasible,
        int totalLessons,
        int totalSlots,
        List<String> errors,
        List<String> warnings
    ) {}

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
