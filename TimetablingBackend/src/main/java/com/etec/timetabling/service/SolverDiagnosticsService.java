package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import com.etec.timetabling.web.SolverController.ValidationResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serviço de diagnóstico pré-solver para identificar gargalos de capacidade,
 * conflitos de disponibilidade docente e interseções inviáveis de co-teaching.
 */
@Service
public class SolverDiagnosticsService {

    private final DemandRepository demandRepository;
    private final TimeslotRepository timeslotRepository;
    private final ClassGroupRepository classGroupRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;

    public SolverDiagnosticsService(
        DemandRepository demandRepository,
        TimeslotRepository timeslotRepository,
        ClassGroupRepository classGroupRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository
    ) {
        this.demandRepository = demandRepository;
        this.timeslotRepository = timeslotRepository;
        this.classGroupRepository = classGroupRepository;
        this.unavailabilityRepository = unavailabilityRepository;
    }

    public record DiagnosticIssue(
        String severity,
        String category,
        String entityName,
        String message
    ) {
    }

    public record DiagnosticReport(
        boolean feasible,
        int totalLessons,
        int totalSlots,
        int criticalErrorsCount,
        int warningsCount,
        List<DiagnosticIssue> issues
    ) {
    }

    @Transactional(readOnly = true)
    public ValidationResponse validate() {
        List<Demand> demands = demandRepository.findAll();
        List<Timeslot> timeslots = timeslotRepository.findAll();
        List<ClassGroup> allClassGroups = classGroupRepository.findAll();
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

        int totalLessons = demands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
        DiagnosticReport deepReport = runDeepDiagnostics(demands, timeslots, allClassGroups);

        for (DiagnosticIssue issue : deepReport.issues()) {
            if ("ERROR".equals(issue.severity())) {
                errors.add(issue.message());
            } else {
                warnings.add(issue.message());
            }
        }

        long classGroupsWithDemands = demands.stream()
            .map(d -> d.getSubject().getClassGroup().getId())
            .distinct()
            .count();
        warnings.add(0, String.format("%d turmas com demandas, %d aulas totais.",
            classGroupsWithDemands, totalLessons));

        return new ValidationResponse(
            deepReport.feasible(),
            totalLessons,
            timeslots.size(),
            errors,
            warnings
        );
    }

    @Transactional(readOnly = true)
    public DiagnosticReport diagnose() {
        List<Demand> demands = demandRepository.findAll();
        List<Timeslot> timeslots = timeslotRepository.findAll();
        List<ClassGroup> allClassGroups = classGroupRepository.findAll();
        return runDeepDiagnostics(demands, timeslots, allClassGroups);
    }

    private DiagnosticReport runDeepDiagnostics(
        List<Demand> demands,
        List<Timeslot> timeslots,
        List<ClassGroup> allClassGroups
    ) {
        List<DiagnosticIssue> issues = new ArrayList<>();
        if (demands.isEmpty()) {
            issues.add(new DiagnosticIssue("ERROR", "INPUT", "Demandas",
                "Nenhuma demanda cadastrada. Cadastre demandas antes de rodar o solver."));
            return new DiagnosticReport(false, 0, timeslots.size(), 1, 0, issues);
        }
        if (timeslots.isEmpty()) {
            issues.add(new DiagnosticIssue("ERROR", "INPUT", "Horários",
                "Nenhum timeslot cadastrado. Cadastre horários antes de rodar."));
            return new DiagnosticReport(false, 0, 0, 1, 0, issues);
        }

        List<ProfessorUnavailability> allUnavail = unavailabilityRepository.findAll();
        Map<Long, List<ProfessorUnavailability>> unavailByProf = allUnavail.stream()
            .collect(Collectors.groupingBy(u -> u.getProfessor().getId()));

        int totalLessons = demands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
        Map<ShiftType, List<Timeslot>> slotsByShift = timeslots.stream()
            .collect(Collectors.groupingBy(Timeslot::getShiftType));

        Map<Long, List<Demand>> demandsByClassGroup = new HashMap<>();
        Map<Long, String> classGroupNames = new HashMap<>();
        Map<Long, ShiftType> classGroupShifts = new HashMap<>();
        Map<Long, List<Demand>> demandsByProfessor = new HashMap<>();
        Map<Long, Professor> profMap = new HashMap<>();

        for (Demand d : demands) {
            ClassGroup cg = d.getSubject().getClassGroup();
            demandsByClassGroup.computeIfAbsent(cg.getId(), k -> new ArrayList<>()).add(d);
            classGroupNames.put(cg.getId(), cg.getName());
            classGroupShifts.put(cg.getId(), cg.getShiftType());

            for (Professor p : d.getProfessors()) {
                demandsByProfessor.computeIfAbsent(p.getId(), k -> new ArrayList<>()).add(d);
                profMap.put(p.getId(), p);
            }
        }

        // 1. Verificar capacidade por turma
        for (var entry : demandsByClassGroup.entrySet()) {
            Long cgId = entry.getKey();
            String cgName = classGroupNames.get(cgId);
            ShiftType shift = classGroupShifts.get(cgId);
            int needed = entry.getValue().stream().mapToInt(Demand::getQuantityPerWeek).sum();
            int available = slotsByShift.getOrDefault(shift, List.of()).size();

            if (needed > available) {
                issues.add(new DiagnosticIssue("ERROR", "CLASS_CAPACITY", cgName, String.format(
                    "Turma %s: %d aulas necessárias, mas apenas %d slots %s disponíveis.",
                    cgName, needed, available, shift)));
            } else if (available > 0) {
                double usage = (double) needed / available * 100.0;
                if (usage > 85.0) {
                    issues.add(new DiagnosticIssue("WARNING", "CLASS_CAPACITY", cgName, String.format(
                        "Turma %s: %.0f%% de ocupação (%d/%d slots %s).",
                        cgName, usage, needed, available, shift)));
                }
            }
        }

        // 2. Turmas vazias e demandas sem professor
        List<String> emptyClasses = allClassGroups.stream()
            .filter(cg -> !demandsByClassGroup.containsKey(cg.getId()))
            .map(ClassGroup::getName)
            .sorted()
            .toList();
        if (!emptyClasses.isEmpty()) {
            issues.add(new DiagnosticIssue("WARNING", "CLASS_SETUP", String.join(", ", emptyClasses),
                String.format("Turmas sem demandas cadastradas: %s.", String.join(", ", emptyClasses))));
        }

        long demandsWithoutProf = demands.stream().filter(d -> d.getProfessors().isEmpty()).count();
        if (demandsWithoutProf > 0) {
            issues.add(new DiagnosticIssue("WARNING", "DEMAND_SETUP", "Demandas",
                String.format("%d demanda(s) sem professor(es) atribuído(s).", demandsWithoutProf)));
        }

        // 3. Carga horária docente vs janelas livres considerando indisponibilidades
        for (var entry : demandsByProfessor.entrySet()) {
            Long profId = entry.getKey();
            Professor prof = profMap.get(profId);
            List<Demand> profDemands = entry.getValue();
            int totalLoad = profDemands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
            List<ProfessorUnavailability> blocks = unavailByProf.getOrDefault(profId, List.of());

            Set<ShiftType> profShifts = profDemands.stream()
                .map(d -> d.getSubject().getClassGroup().getShiftType())
                .collect(Collectors.toSet());

            Set<String> availableTimeWindows = new HashSet<>();
            for (Timeslot slot : timeslots) {
                if (profShifts.contains(slot.getShiftType()) && !isBlocked(slot, blocks)) {
                    availableTimeWindows.add(timeWindowKey(slot));
                }
            }

            if (totalLoad > availableTimeWindows.size()) {
                issues.add(new DiagnosticIssue("ERROR", "PROFESSOR_OVERLOAD", prof.getName(), String.format(
                    "Professor %s: %d aulas atribuídas, mas apenas %d janelas livres considerando bloqueios.",
                    prof.getName(), totalLoad, availableTimeWindows.size())));
            }
        }

        // 4. Interseção de horários livres para demandas com múltiplos professores (co-teaching)
        for (Demand d : demands) {
            if (d.getProfessors().size() <= 1) {
                continue;
            }
            ShiftType shift = d.getSubject().getClassGroup().getShiftType();
            List<Timeslot> shiftSlots = slotsByShift.getOrDefault(shift, List.of());
            int commonFreeSlots = 0;

            for (Timeslot slot : shiftSlots) {
                boolean allFree = true;
                for (Professor p : d.getProfessors()) {
                    if (isBlocked(slot, unavailByProf.getOrDefault(p.getId(), List.of()))) {
                        allFree = false;
                        break;
                    }
                }
                if (allFree) {
                    commonFreeSlots++;
                }
            }

            if (commonFreeSlots < d.getQuantityPerWeek()) {
                issues.add(new DiagnosticIssue("ERROR", "COTEACHING_INTERSECTION", d.getSubject().getName(), String.format(
                    "Co-teaching inviável em %s (%s): exige %d aulas, mas professores só coincidem em %d horários livres.",
                    d.getSubject().getName(), d.getSubject().getClassGroup().getName(),
                    d.getQuantityPerWeek(), commonFreeSlots)));
            }
        }

        int errorsCount = (int) issues.stream().filter(i -> "ERROR".equals(i.severity())).count();
        int warningsCount = issues.size() - errorsCount;
        return new DiagnosticReport(
            errorsCount == 0,
            totalLessons,
            timeslots.size(),
            errorsCount,
            warningsCount,
            issues
        );
    }

    private boolean isBlocked(Timeslot slot, List<ProfessorUnavailability> blocks) {
        for (ProfessorUnavailability u : blocks) {
            boolean sameDay = u.getDayOfWeek() == 0 || u.getDayOfWeek() == slot.getDayOfWeek();
            if (sameDay && u.getStartTime().isBefore(slot.getEndTime())
                    && u.getEndTime().isAfter(slot.getStartTime())) {
                return true;
            }
        }
        return false;
    }

    private String timeWindowKey(Timeslot slot) {
        return slot.getDayOfWeek() + "|" + slot.getStartTime() + "|" + slot.getEndTime();
    }
}

