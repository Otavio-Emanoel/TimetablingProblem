package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SolverService {

    private static final Logger log = LoggerFactory.getLogger(SolverService.class);

    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final TimeslotRepository timeslotRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;

    public SolverService(
            DemandRepository demandRepository,
            ScheduleEntryRepository scheduleEntryRepository,
            TimeslotRepository timeslotRepository,
            ProfessorUnavailabilityRepository unavailabilityRepository) {
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.timeslotRepository = timeslotRepository;
        this.unavailabilityRepository = unavailabilityRepository;
    }

    // ========================= RECORDS =========================

    private record TimeBlock(int dayOfWeek, LocalTime startTime, LocalTime endTime) {
        boolean overlaps(int day, LocalTime start, LocalTime end) {
            return this.dayOfWeek == day
                    && this.startTime.isBefore(end)
                    && this.endTime.isAfter(start);
        }
    }

    private record SlotPair(Timeslot first, Timeslot second) {}

    private static class SchedulingUnit {
        final Demand demand;
        final ClassGroup classGroup;
        final List<Professor> professors;
        final List<Timeslot> eligibleSlots;
        final boolean isDouble;

        SchedulingUnit(Demand demand, ClassGroup classGroup,
                       List<Professor> professors, List<Timeslot> eligibleSlots,
                       boolean isDouble) {
            this.demand = demand;
            this.classGroup = classGroup;
            this.professors = professors;
            this.eligibleSlots = eligibleSlots;
            this.isDouble = isDouble;
        }
    }

    public record SolverResult(int scheduled, int unscheduled, String details) {}

    // ========================= MAIN =========================

    @Transactional
    public SolverResult solve() {
        log.info("========================================");
        log.info("          SOLVER INICIANDO              ");
        log.info("========================================");

        // 1. Limpar grade anterior
        long previousCount = scheduleEntryRepository.count();
        scheduleEntryRepository.deleteAll();
        scheduleEntryRepository.flush();
        log.info("Removidas {} entradas anteriores", previousCount);

        // 2. Carregar dados
        List<Demand> allDemands = demandRepository.findAll();
        List<Timeslot> allTimeslots = timeslotRepository.findAll();
        List<ProfessorUnavailability> allUnavailabilities = unavailabilityRepository.findAll();

        for (Demand d : allDemands) {
            d.getProfessors().size();
        }

        log.info("Dados: {} demandas, {} timeslots, {} indisponibilidades",
                allDemands.size(), allTimeslots.size(), allUnavailabilities.size());

        // 3. Validacoes
        if (allDemands.isEmpty()) {
            return new SolverResult(0, 0, "Nenhuma demanda cadastrada.");
        }
        if (allTimeslots.isEmpty()) {
            int total = allDemands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
            return new SolverResult(0, total, "Nenhum timeslot cadastrado.");
        }

        // 4. Indexar timeslots por turno
        Map<ShiftType, List<Timeslot>> timeslotsByShift = allTimeslots.stream()
                .sorted(Comparator.comparingInt(Timeslot::getDayOfWeek)
                        .thenComparing(Timeslot::getStartTime))
                .collect(Collectors.groupingBy(Timeslot::getShiftType));

        for (var e : timeslotsByShift.entrySet()) {
            log.info("  Turno {}: {} slots", e.getKey(), e.getValue().size());
        }

        // 5. Pre-computar pares consecutivos (aula dupla)
        Map<ShiftType, List<SlotPair>> consecutivePairsByShift = new HashMap<>();
        for (var entry : timeslotsByShift.entrySet()) {
            List<Timeslot> slots = entry.getValue();
            List<SlotPair> pairs = new ArrayList<>();
            for (int i = 0; i < slots.size() - 1; i++) {
                Timeslot a = slots.get(i);
                Timeslot b = slots.get(i + 1);
                if (a.getDayOfWeek() == b.getDayOfWeek()
                        && a.getEndTime().equals(b.getStartTime())) {
                    pairs.add(new SlotPair(a, b));
                }
            }
            consecutivePairsByShift.put(entry.getKey(), pairs);
            log.info("  Turno {}: {} pares consecutivos", entry.getKey(), pairs.size());
        }

        // 6. Expandir indisponibilidades (dayOfWeek=0 -> todos os dias uteis)
        Map<Long, List<TimeBlock>> unavailByProf = new HashMap<>();
        for (ProfessorUnavailability u : allUnavailabilities) {
            long profId = u.getProfessor().getId();
            if (u.getDayOfWeek() == 0) {
                for (int day = 1; day <= 5; day++) {
                    unavailByProf.computeIfAbsent(profId, k -> new ArrayList<>())
                            .add(new TimeBlock(day, u.getStartTime(), u.getEndTime()));
                }
            } else {
                unavailByProf.computeIfAbsent(profId, k -> new ArrayList<>())
                        .add(new TimeBlock(u.getDayOfWeek(), u.getStartTime(), u.getEndTime()));
            }
        }
        if (!unavailByProf.isEmpty()) {
            for (var e : unavailByProf.entrySet()) {
                log.info("  Prof #{}: {} bloqueios", e.getKey(), e.getValue().size());
            }
        }

        // 7. Criar unidades de agendamento
        List<SchedulingUnit> allUnits = new ArrayList<>();
        int totalLessons = 0;

        Map<Long, Integer> profDemandPressure = new HashMap<>();
        for (Demand d : allDemands) {
            for (Professor p : d.getProfessors()) {
                profDemandPressure.merge(p.getId(), d.getQuantityPerWeek(), Integer::sum);
            }
        }

        for (Demand demand : allDemands) {
            if (demand.getProfessors().isEmpty()) {
                log.warn("Demanda #{} '{}' sem professores - ignorada",
                        demand.getId(), demand.getSubject().getName());
                continue;
            }

            ClassGroup cg = demand.getSubject().getClassGroup();
            List<Professor> profs = new ArrayList<>(demand.getProfessors());
            List<Timeslot> eligible = timeslotsByShift.getOrDefault(cg.getShiftType(), List.of());

            if (eligible.isEmpty()) {
                log.warn("Turma '{}' ({}) sem timeslots disponiveis", cg.getName(), cg.getShiftType());
                continue;
            }

            int qty = demand.getQuantityPerWeek();
            totalLessons += qty;

            if (demand.isAllowDoubleLesson() && qty >= 2) {
                int doubles = qty / 2;
                int singles = qty % 2;
                for (int i = 0; i < doubles; i++) {
                    allUnits.add(new SchedulingUnit(demand, cg, profs, eligible, true));
                }
                for (int i = 0; i < singles; i++) {
                    allUnits.add(new SchedulingUnit(demand, cg, profs, eligible, false));
                }
            } else {
                for (int i = 0; i < qty; i++) {
                    allUnits.add(new SchedulingUnit(demand, cg, profs, eligible, false));
                }
            }
        }

        log.info("Total: {} aulas a alocar ({} unidades)", totalLessons, allUnits.size());

        if (allUnits.isEmpty()) {
            return new SolverResult(0, 0, "Nenhuma aula a alocar.");
        }

        // 8. Agrupar por turma e ordenar internamente
        Map<Long, List<SchedulingUnit>> unitsByClass = new LinkedHashMap<>();
        for (SchedulingUnit unit : allUnits) {
            unitsByClass.computeIfAbsent(unit.classGroup.getId(), k -> new ArrayList<>()).add(unit);
        }

        for (List<SchedulingUnit> group : unitsByClass.values()) {
            group.sort(Comparator
                    .comparing((SchedulingUnit u) -> !u.isDouble)
                    .thenComparingInt(u -> u.eligibleSlots.size())
                    .thenComparing(Comparator.comparingInt((SchedulingUnit u) ->
                            u.professors.stream()
                                    .mapToInt(p -> profDemandPressure.getOrDefault(p.getId(), 0))
                                    .max().orElse(0)
                    ).reversed()));
        }

        // 9. Intercalar turmas (round-robin)
        List<SchedulingUnit> interleavedUnits = new ArrayList<>();
        List<List<SchedulingUnit>> groups = new ArrayList<>(unitsByClass.values());
        boolean hasMore = true;
        int idx = 0;
        while (hasMore) {
            hasMore = false;
            for (List<SchedulingUnit> group : groups) {
                if (idx < group.size()) {
                    interleavedUnits.add(group.get(idx));
                    hasMore = true;
                }
            }
            idx++;
        }

        log.info("Turmas a processar: {}", unitsByClass.keySet().stream()
                .map(id -> unitsByClass.get(id).getFirst().classGroup.getName())
                .collect(Collectors.joining(", ")));

        // 10. Algoritmo greedy com scoring
        Map<Long, List<TimeBlock>> classGroupBlocks = new HashMap<>();
        Map<Long, List<TimeBlock>> professorBlocks = new HashMap<>();
        Map<String, Integer> subjectDayCount = new HashMap<>();
        Map<String, Integer> classGroupDayCount = new HashMap<>();

        int scheduled = 0;
        int unscheduled = 0;
        List<ScheduleEntry> entries = new ArrayList<>();
        List<String> unscheduledDetails = new ArrayList<>();

        for (SchedulingUnit unit : interleavedUnits) {
            if (unit.isDouble) {
                boolean placed = scheduleDouble(
                        unit, classGroupBlocks, professorBlocks,
                        unavailByProf, subjectDayCount, classGroupDayCount,
                        consecutivePairsByShift.getOrDefault(unit.classGroup.getShiftType(), List.of()),
                        entries);

                if (placed) {
                    scheduled += 2;
                } else {
                    for (int i = 0; i < 2; i++) {
                        Timeslot slot = findBestSingleSlot(
                                unit, classGroupBlocks, professorBlocks,
                                unavailByProf, subjectDayCount, classGroupDayCount);
                        if (slot != null) {
                            placeEntry(slot, unit, classGroupBlocks, professorBlocks,
                                    subjectDayCount, classGroupDayCount, entries);
                            scheduled++;
                        } else {
                            unscheduled++;
                            unscheduledDetails.add(formatUnscheduled(unit));
                        }
                    }
                }
            } else {
                Timeslot bestSlot = findBestSingleSlot(
                        unit, classGroupBlocks, professorBlocks,
                        unavailByProf, subjectDayCount, classGroupDayCount);

                if (bestSlot != null) {
                    placeEntry(bestSlot, unit, classGroupBlocks, professorBlocks,
                            subjectDayCount, classGroupDayCount, entries);
                    scheduled++;
                } else {
                    unscheduled++;
                    unscheduledDetails.add(formatUnscheduled(unit));
                }
            }
        }

        // 11. Salvar
        scheduleEntryRepository.saveAll(entries);

        // 12. Resumo
        StringBuilder details = new StringBuilder();
        details.append(String.format("Alocadas: %d | Nao alocadas: %d", scheduled, unscheduled));

        Map<String, Long> perClass = entries.stream()
                .collect(Collectors.groupingBy(e -> e.getClassGroup().getName(), Collectors.counting()));
        if (!perClass.isEmpty()) {
            details.append("\n\nPor turma:");
            perClass.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(e -> details.append(String.format("\n  %s: %d aulas", e.getKey(), e.getValue())));
        }

        if (!unscheduledDetails.isEmpty()) {
            details.append("\n\nNao alocadas:");
            for (String d : unscheduledDetails) {
                details.append("\n  - ").append(d);
            }
        }

        log.info("========================================");
        log.info("          SOLVER FINALIZADO             ");
        log.info("  Alocadas: {}  |  Nao alocadas: {}", scheduled, unscheduled);
        perClass.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(e -> log.info("  {}: {} aulas", e.getKey(), e.getValue()));
        if (!unscheduledDetails.isEmpty()) {
            log.info("  Nao alocadas:");
            for (String d : unscheduledDetails) {
                log.info("    - {}", d);
            }
        }
        log.info("========================================");

        return new SolverResult(scheduled, unscheduled, details.toString());
    }

    // ========================= CONFLICT CHECK =========================

    private boolean hasConflict(
            Timeslot slot,
            List<Professor> professors,
            Long classGroupId,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> unavailByProf) {

        int day = slot.getDayOfWeek();
        LocalTime start = slot.getStartTime();
        LocalTime end = slot.getEndTime();

        List<TimeBlock> cgBlocks = classGroupBlocks.getOrDefault(classGroupId, List.of());
        for (TimeBlock cb : cgBlocks) {
            if (cb.overlaps(day, start, end)) return true;
        }

        for (Professor prof : professors) {
            List<TimeBlock> blocks = professorBlocks.getOrDefault(prof.getId(), List.of());
            for (TimeBlock b : blocks) {
                if (b.overlaps(day, start, end)) return true;
            }

            List<TimeBlock> unavails = unavailByProf.getOrDefault(prof.getId(), List.of());
            for (TimeBlock u : unavails) {
                if (u.overlaps(day, start, end)) return true;
            }
        }

        return false;
    }

    // ========================= SCORING =========================

    private int scoreSlot(
            Timeslot slot,
            SchedulingUnit unit,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> classGroupBlocks) {

        int score = 0;
        int day = slot.getDayOfWeek();
        long cgId = unit.classGroup.getId();
        long subjId = unit.demand.getSubject().getId();

        // HARD-ISH: Mesma materia no mesmo dia - penalidade forte
        String subjDayKey = cgId + "-" + subjId + "-" + day;
        int existingSubjectOnDay = subjectDayCount.getOrDefault(subjDayKey, 0);
        score -= existingSubjectOnDay * 300;

        // SOFT: Balancear aulas da turma entre os dias (distribuicao uniforme)
        String cgDayKey = cgId + "-" + day;
        int totalOnDay = classGroupDayCount.getOrDefault(cgDayKey, 0);
        score -= totalOnDay * 50;

        // SOFT: Minimizar "janelas" (buracos) na grade da turma
        // Bonus se o slot é adjacente a uma aula ja existente da turma neste dia
        List<TimeBlock> cgDayBlocks = classGroupBlocks.getOrDefault(cgId, List.of())
                .stream().filter(b -> b.dayOfWeek() == day).toList();
        if (!cgDayBlocks.isEmpty()) {
            boolean isAdjacent = cgDayBlocks.stream().anyMatch(b ->
                    b.endTime().equals(slot.getStartTime()) || b.startTime().equals(slot.getEndTime()));
            if (isAdjacent) {
                score += 60; // Bonus por adjacência - evita buracos
            }
        }

        // SOFT: Compactar agenda do professor (menos dias trabalhados)
        for (Professor prof : unit.professors) {
            List<TimeBlock> profBlocks = professorBlocks.getOrDefault(prof.getId(), List.of());

            // Bonus se prof ja tem aula neste dia (compacta em menos dias)
            boolean profHasClassOnDay = profBlocks.stream().anyMatch(b -> b.dayOfWeek() == day);
            if (profHasClassOnDay) {
                score += 30;
            }

            // Bonus se é adjacente a uma aula existente do prof no mesmo dia
            boolean profAdjacent = profBlocks.stream()
                    .filter(b -> b.dayOfWeek() == day)
                    .anyMatch(b -> b.endTime().equals(slot.getStartTime()) || b.startTime().equals(slot.getEndTime()));
            if (profAdjacent) {
                score += 40; // Minimiza janelas do professor
            }

            // Penalidade: evitar professor com muitas aulas em um unico dia
            long profCountOnDay = profBlocks.stream().filter(b -> b.dayOfWeek() == day).count();
            if (profCountOnDay >= 6) {
                score -= 80; // Professor sobrecarregado
            }
        }

        // SOFT: Preferir horários mais cedo (previsibilidade)
        int minuteOfDay = slot.getStartTime().getHour() * 60 + slot.getStartTime().getMinute();
        score -= minuteOfDay / 30;

        return score;
    }

    // ========================= SINGLE =========================

    private Timeslot findBestSingleSlot(
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> unavailByProf,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount) {

        Timeslot bestSlot = null;
        int bestScore = Integer.MIN_VALUE;

        for (Timeslot slot : unit.eligibleSlots) {
            if (hasConflict(slot, unit.professors, unit.classGroup.getId(),
                    classGroupBlocks, professorBlocks, unavailByProf)) {
                continue;
            }

            int score = scoreSlot(slot, unit, subjectDayCount, classGroupDayCount,
                    professorBlocks, classGroupBlocks);
            if (score > bestScore) {
                bestScore = score;
                bestSlot = slot;
            }
        }

        return bestSlot;
    }

    // ========================= DOUBLE =========================

    private boolean scheduleDouble(
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> unavailByProf,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            List<SlotPair> availablePairs,
            List<ScheduleEntry> entries) {

        SlotPair bestPair = null;
        int bestScore = Integer.MIN_VALUE;

        for (SlotPair pair : availablePairs) {
            if (!unit.eligibleSlots.contains(pair.first)
                    || !unit.eligibleSlots.contains(pair.second)) {
                continue;
            }

            if (hasConflict(pair.first, unit.professors, unit.classGroup.getId(),
                    classGroupBlocks, professorBlocks, unavailByProf)) {
                continue;
            }
            if (hasConflict(pair.second, unit.professors, unit.classGroup.getId(),
                    classGroupBlocks, professorBlocks, unavailByProf)) {
                continue;
            }

            int score = scoreSlot(pair.first, unit, subjectDayCount, classGroupDayCount,
                            professorBlocks, classGroupBlocks)
                    + scoreSlot(pair.second, unit, subjectDayCount, classGroupDayCount,
                            professorBlocks, classGroupBlocks)
                    + 50;

            if (score > bestScore) {
                bestScore = score;
                bestPair = pair;
            }
        }

        if (bestPair == null) return false;

        for (Timeslot slot : List.of(bestPair.first, bestPair.second)) {
            placeEntry(slot, unit, classGroupBlocks, professorBlocks,
                    subjectDayCount, classGroupDayCount, entries);
        }

        return true;
    }

    // ========================= PLACE =========================

    private void placeEntry(
            Timeslot slot,
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            List<ScheduleEntry> entries) {

        ScheduleEntry entry = new ScheduleEntry();
        entry.setTimeslot(slot);
        entry.setClassGroup(unit.classGroup);
        entry.setSubject(unit.demand.getSubject());
        entry.setProfessors(new HashSet<>(unit.professors));
        entries.add(entry);

        TimeBlock block = new TimeBlock(
                slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime());

        classGroupBlocks
                .computeIfAbsent(unit.classGroup.getId(), k -> new ArrayList<>())
                .add(block);

        for (Professor prof : unit.professors) {
            professorBlocks
                    .computeIfAbsent(prof.getId(), k -> new ArrayList<>())
                    .add(block);
        }

        String subjDayKey = unit.classGroup.getId() + "-"
                + unit.demand.getSubject().getId() + "-"
                + slot.getDayOfWeek();
        subjectDayCount.merge(subjDayKey, 1, Integer::sum);

        String cgDayKey = unit.classGroup.getId() + "-" + slot.getDayOfWeek();
        classGroupDayCount.merge(cgDayKey, 1, Integer::sum);
    }

    // ========================= HELPERS =========================

    private String formatUnscheduled(SchedulingUnit unit) {
        return String.format("'%s' p/ turma '%s' (prof: %s)%s",
                unit.demand.getSubject().getName(),
                unit.classGroup.getName(),
                unit.professors.stream().map(Professor::getName)
                        .collect(Collectors.joining(", ")),
                unit.isDouble ? " [aula dupla]" : "");
    }
}
