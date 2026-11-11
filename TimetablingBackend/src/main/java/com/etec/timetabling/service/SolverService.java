package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.PreferenceType;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorPreference;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Motor de geração de grade horária com:
 * <ul>
 * <li>Randomização — cada execução gera uma grade diferente</li>
 * <li>Preferências de professores (soft-constraints com peso)</li>
 * <li>Backtracking local — tenta re-alocar quando fica preso</li>
 * <li>Relatório detalhado de conflitos para aulas não alocadas</li>
 * <li>Múltiplas tentativas automáticas para maximizar alocação</li>
 * </ul>
 */
@Service
public class SolverService {

    private static final Logger log = LoggerFactory.getLogger(SolverService.class);

    /** Número de tentativas completas que o solver faz, selecionando a melhor. */
    private static final int MAX_ATTEMPTS = 25;

    /** Profundidade máxima de backtracking por unidade falhada. */
    private static final int BACKTRACK_DEPTH = 20;

    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final TimeslotRepository timeslotRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public SolverService(
            DemandRepository demandRepository,
            ScheduleEntryRepository scheduleEntryRepository,
            TimeslotRepository timeslotRepository,
            ProfessorUnavailabilityRepository unavailabilityRepository,
            ProfessorPreferenceRepository preferenceRepository) {
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.timeslotRepository = timeslotRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
    }

    // ========================= RECORDS =========================

    private record TimeBlock(int dayOfWeek, LocalTime startTime, LocalTime endTime) {
        boolean overlaps(int day, LocalTime start, LocalTime end) {
            return this.dayOfWeek == day
                    && this.startTime.isBefore(end)
                    && this.endTime.isAfter(start);
        }
    }

    private record SlotPair(Timeslot first, Timeslot second) {
    }

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

    /** Resultado detalhado do solver. */
    public record SolverResult(int scheduled, int unscheduled, String details) {
    }

    /** Motivo detalhado de conflito para uma aula não alocada. */
    private record ConflictReason(
            String subjectName,
            String classGroupName,
            List<String> professorNames,
            boolean isDouble,
            List<String> reasons) {
    }

    // ========================= SOLVER PRINCIPAL =========================

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
        List<ProfessorPreference> allPreferences = preferenceRepository.findAll();

        for (Demand d : allDemands) {
            d.getProfessors().size(); // force-init lazy
        }

        log.info("Dados: {} demandas, {} timeslots, {} indisponibilidades, {} preferências",
                allDemands.size(), allTimeslots.size(),
                allUnavailabilities.size(), allPreferences.size());

        // 3. Validações
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

        // 5. Pré-computar pares consecutivos (aula dupla)
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

        // 6. Expandir indisponibilidades (dayOfWeek=0 → todos os dias úteis)
        Map<Long, List<TimeBlock>> unavailByProf = buildUnavailabilityMap(allUnavailabilities);

        // 7. Indexar preferências por professor
        Map<Long, List<ProfessorPreference>> prefsByProf = allPreferences.stream()
                .collect(Collectors.groupingBy(p -> p.getProfessor().getId()));
        log.info("  {} professores com preferências cadastradas", prefsByProf.size());

        // 8. Criar unidades de agendamento
        Map<Long, Integer> profDemandPressure = new HashMap<>();
        for (Demand d : allDemands) {
            for (Professor p : d.getProfessors()) {
                profDemandPressure.merge(p.getId(), d.getQuantityPerWeek(), Integer::sum);
            }
        }

        List<SchedulingUnit> allUnits = buildSchedulingUnits(allDemands, timeslotsByShift);
        int totalLessons = allDemands.stream().mapToInt(Demand::getQuantityPerWeek).sum();

        log.info("Total: {} aulas a alocar ({} unidades)", totalLessons, allUnits.size());

        if (allUnits.isEmpty()) {
            return new SolverResult(0, 0, "Nenhuma aula a alocar.");
        }

        // 9. MÚLTIPLAS TENTATIVAS — seleciona a melhor grade gerada
        AttemptResult bestAttempt = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            Random rng = new Random(); // seed diferente a cada tentativa

            AttemptResult result = runSingleAttempt(
                    allUnits, profDemandPressure, unavailByProf, prefsByProf,
                    consecutivePairsByShift, timeslotsByShift, rng);

            log.info("  Tentativa {}: {} alocadas, {} não alocadas",
                    attempt, result.scheduled, result.unscheduled);

            if (bestAttempt == null
                    || result.scheduled > bestAttempt.scheduled
                    || (result.scheduled == bestAttempt.scheduled
                            && result.preferencesRespected > bestAttempt.preferencesRespected)
                    || (result.scheduled == bestAttempt.scheduled
                            && result.preferencesRespected == bestAttempt.preferencesRespected
                            && result.totalWindows < bestAttempt.totalWindows)) {
                bestAttempt = result;
            }

            // Se alocou tudo sem nenhuma janela ociosa, ou após 8 tentativas completas sem pendências, para
            if (result.unscheduled == 0 && (result.totalWindows == 0 || attempt >= 8)) {
                log.info("  Tentativa {} otimizada ({} janelas)! Parando.", attempt, bestAttempt.totalWindows);
                break;
            }
        }

        // 10. Salvar a melhor tentativa
        scheduleEntryRepository.saveAll(bestAttempt.entries);

        // 11. Relatório detalhado
        String details = buildReport(bestAttempt);

        log.info("========================================");
        log.info("          SOLVER FINALIZADO             ");
        log.info("  Alocadas: {}  |  Nao alocadas: {}",
                bestAttempt.scheduled, bestAttempt.unscheduled);
        bestAttempt.perClassCount.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(e -> log.info("  {}: {} aulas", e.getKey(), e.getValue()));
        if (!bestAttempt.conflicts.isEmpty()) {
            log.info("  Conflitos:");
            for (ConflictReason c : bestAttempt.conflicts) {
                log.info("    - {} / {} : {}", c.subjectName, c.classGroupName,
                        String.join("; ", c.reasons));
            }
        }
        if (bestAttempt.preferencesTotal > 0) {
            log.info("  Preferências: {}/{} atendidas",
                    bestAttempt.preferencesRespected, bestAttempt.preferencesTotal);
        }
        log.info("========================================");

        return new SolverResult(bestAttempt.scheduled, bestAttempt.unscheduled, details);
    }

    // ========================= TENTATIVA ÚNICA =========================

    private record AttemptResult(
            int scheduled,
            int unscheduled,
            List<ScheduleEntry> entries,
            Map<String, Long> perClassCount,
            List<ConflictReason> conflicts,
            int preferencesRespected,
            int preferencesTotal,
            int totalWindows) {
    }

    private AttemptResult runSingleAttempt(
            List<SchedulingUnit> allUnits,
            Map<Long, Integer> profDemandPressure,
            Map<Long, List<TimeBlock>> unavailByProf,
            Map<Long, List<ProfessorPreference>> prefsByProf,
            Map<ShiftType, List<SlotPair>> consecutivePairsByShift,
            Map<ShiftType, List<Timeslot>> timeslotsByShift,
            Random rng) {

        // Agrupar por turma
        Map<Long, List<SchedulingUnit>> unitsByClass = new LinkedHashMap<>();
        for (SchedulingUnit unit : allUnits) {
            unitsByClass.computeIfAbsent(unit.classGroup.getId(), k -> new ArrayList<>())
                    .add(unit);
        }

        // Ordenar internamente com jitter aleatório para variar resultado
        for (List<SchedulingUnit> group : unitsByClass.values()) {
            group.sort(Comparator
                    .comparing((SchedulingUnit u) -> !u.isDouble) // doubles primeiro
                    .thenComparingInt(u -> countAvailableSlots(u, unavailByProf) + rng.nextInt(5))
                    .thenComparing(Comparator.comparingInt((SchedulingUnit u) -> u.professors.stream()
                            .mapToInt(p -> profDemandPressure.getOrDefault(p.getId(), 0))
                            .max().orElse(0)).reversed()));
        }

        // Intercalar turmas (round-robin) com ordem de turmas randomizada
        List<List<SchedulingUnit>> groups = new ArrayList<>(unitsByClass.values());
        Collections.shuffle(groups, rng);

        List<SchedulingUnit> interleavedUnits = new ArrayList<>();
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

        // Estado de alocação
        Map<Long, List<TimeBlock>> classGroupBlocks = new HashMap<>();
        Map<Long, List<TimeBlock>> professorBlocks = new HashMap<>();
        Map<String, Integer> subjectDayCount = new HashMap<>();
        Map<String, Integer> classGroupDayCount = new HashMap<>();

        int scheduled = 0;
        int unscheduled = 0;
        List<ScheduleEntry> entries = new ArrayList<>();
        List<ConflictReason> conflicts = new ArrayList<>();
        List<SchedulingUnit> failedUnits = new ArrayList<>();
        int prefsRespected = 0;
        int prefsTotal = 0;

        // Rastrear quais slots já foram usados (para backtracking)
        Map<Long, Set<Long>> usedSlotsByClass = new HashMap<>();

        for (SchedulingUnit unit : interleavedUnits) {
            if (unit.isDouble) {
                boolean placed = scheduleDouble(
                        unit, classGroupBlocks, professorBlocks,
                        unavailByProf, prefsByProf, subjectDayCount,
                        classGroupDayCount,
                        consecutivePairsByShift.getOrDefault(
                                unit.classGroup.getShiftType(), List.of()),
                        entries, usedSlotsByClass, rng);

                if (placed) {
                    scheduled += 2;
                    prefsTotal += 2;
                    prefsRespected += countPreferencesMatched(
                            entries.subList(entries.size() - 2, entries.size()),
                            prefsByProf);
                } else {
                    // Fallback: tentar como duas aulas simples
                    for (int i = 0; i < 2; i++) {
                        Timeslot slot = findBestSingleSlot(
                                unit, classGroupBlocks, professorBlocks,
                                unavailByProf, prefsByProf,
                                subjectDayCount, classGroupDayCount, rng);
                        if (slot != null) {
                            placeEntry(slot, unit, classGroupBlocks, professorBlocks,
                                    subjectDayCount, classGroupDayCount, entries,
                                    usedSlotsByClass);
                            scheduled++;
                            prefsTotal++;
                            prefsRespected += countPreferencesMatched(
                                    entries.subList(entries.size() - 1, entries.size()),
                                    prefsByProf);
                        } else {
                            // BACKTRACKING: tentar desalocar uma aula existente
                            boolean recovered = tryBacktrack(
                                    unit, classGroupBlocks, professorBlocks,
                                    unavailByProf, prefsByProf,
                                    subjectDayCount, classGroupDayCount,
                                    entries, usedSlotsByClass, timeslotsByShift, rng);
                            if (recovered) {
                                scheduled++;
                                prefsTotal++;
                            } else {
                                unscheduled++;
                                SchedulingUnit failedSingle = new SchedulingUnit(
                                        unit.demand, unit.classGroup, unit.professors,
                                        unit.eligibleSlots, false);
                                failedUnits.add(failedSingle);
                                conflicts.add(analyzeConflict(
                                        unit, classGroupBlocks, professorBlocks,
                                        unavailByProf));
                            }
                        }
                    }
                }
            } else {
                Timeslot bestSlot = findBestSingleSlot(
                        unit, classGroupBlocks, professorBlocks,
                        unavailByProf, prefsByProf,
                        subjectDayCount, classGroupDayCount, rng);

                if (bestSlot != null) {
                    placeEntry(bestSlot, unit, classGroupBlocks, professorBlocks,
                            subjectDayCount, classGroupDayCount, entries,
                            usedSlotsByClass);
                    scheduled++;
                    prefsTotal++;
                    prefsRespected += countPreferencesMatched(
                            entries.subList(entries.size() - 1, entries.size()),
                            prefsByProf);
                } else {
                    // BACKTRACKING
                    boolean recovered = tryBacktrack(
                            unit, classGroupBlocks, professorBlocks,
                            unavailByProf, prefsByProf,
                            subjectDayCount, classGroupDayCount,
                            entries, usedSlotsByClass, timeslotsByShift, rng);
                    if (recovered) {
                        scheduled++;
                        prefsTotal++;
                    } else {
                        unscheduled++;
                        failedUnits.add(unit);
                        conflicts.add(analyzeConflict(
                                unit, classGroupBlocks, professorBlocks,
                                unavailByProf));
                    }
                }
            }
        }

        // ========================= REPAIR PHASE =========================
        // Após a passada greedy, tenta alocar units que falharam (estado pode ter mudado)
        if (!failedUnits.isEmpty()) {
            for (int repairPass = 0; repairPass < 5 && !failedUnits.isEmpty(); repairPass++) {
                Collections.shuffle(failedUnits, rng);
                List<SchedulingUnit> stillFailed = new ArrayList<>();
                for (SchedulingUnit failedUnit : failedUnits) {
                    // Tentar alocação simples (estado pode ter mudado)
                    Timeslot slot = findBestSingleSlot(
                            failedUnit, classGroupBlocks, professorBlocks,
                            unavailByProf, prefsByProf,
                            subjectDayCount, classGroupDayCount, rng);
                    if (slot != null) {
                        placeEntry(slot, failedUnit, classGroupBlocks, professorBlocks,
                                subjectDayCount, classGroupDayCount, entries, usedSlotsByClass);
                        scheduled++;
                        unscheduled--;
                        prefsTotal++;
                        prefsRespected += countPreferencesMatched(
                                entries.subList(entries.size() - 1, entries.size()), prefsByProf);
                        continue;
                    }
                    // Tentar backtracking agressivo
                    boolean recovered = tryBacktrack(
                            failedUnit, classGroupBlocks, professorBlocks,
                            unavailByProf, prefsByProf,
                            subjectDayCount, classGroupDayCount,
                            entries, usedSlotsByClass, timeslotsByShift, rng);
                    if (recovered) {
                        scheduled++;
                        unscheduled--;
                        prefsTotal++;
                    } else {
                        stillFailed.add(failedUnit);
                    }
                }
                failedUnits = stillFailed;
            }
            // Atualizar lista de conflitos com os que realmente falharam
            conflicts.clear();
            for (SchedulingUnit failedUnit : failedUnits) {
                conflicts.add(analyzeConflict(failedUnit, classGroupBlocks, professorBlocks, unavailByProf));
            }
        }

        // Contagem final de preferências sobre as entradas efetivamente alocadas
        prefsTotal = prefsByProf.values().stream().mapToInt(List::size).sum();
        prefsRespected = prefsTotal > 0 ? countPreferencesMatched(entries, prefsByProf) : 0;

        // Contagem por turma
        Map<String, Long> perClassCount = entries.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getClassGroup().getName(), Collectors.counting()));

        int totalWindows = calculateTotalProfessorWindows(professorBlocks);

        return new AttemptResult(scheduled, unscheduled, entries,
                perClassCount, conflicts, prefsRespected, prefsTotal, totalWindows);
    }

    private int calculateTotalProfessorWindows(Map<Long, List<TimeBlock>> professorBlocks) {
        int windows = 0;
        for (List<TimeBlock> blocks : professorBlocks.values()) {
            Map<Integer, List<TimeBlock>> byDay = new HashMap<>();
            for (TimeBlock b : blocks) {
                byDay.computeIfAbsent(b.dayOfWeek(), k -> new ArrayList<>()).add(b);
            }
            for (List<TimeBlock> dayList : byDay.values()) {
                if (dayList.size() <= 1) continue;
                dayList.sort(Comparator.comparing(TimeBlock::startTime));
                for (int i = 0; i < dayList.size() - 1; i++) {
                    LocalTime endCurrent = dayList.get(i).endTime();
                    LocalTime startNext = dayList.get(i + 1).startTime();
                    long gapMinutes = java.time.Duration.between(endCurrent, startNext).toMinutes();
                    if (gapMinutes >= 45 && !(endCurrent.equals(LocalTime.of(12, 30)) && startNext.equals(LocalTime.of(13, 30)))) {
                        windows += (int) (gapMinutes / 50);
                    }
                }
            }
        }
        return windows;
    }

    // ========================= BACKTRACKING =========================

    /**
     * Tenta desalocar uma aula existente para abrir espaço para esta unidade.
     * Estratégia melhorada:
     * 1. Ao remover a vítima, tenta QUALQUER slot elegível para a unit
     *    (não apenas o slot específico da vítima).
     * 2. Usa os timeslots corretos do turno da VÍTIMA para realocá-la.
     * 3. Tenta cadeia de 2 níveis: remove vítima → aloca unit → realoca vítima.
     */
    private boolean tryBacktrack(
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> unavailByProf,
            Map<Long, List<ProfessorPreference>> prefsByProf,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            List<ScheduleEntry> entries,
            Map<Long, Set<Long>> usedSlotsByClass,
            Map<ShiftType, List<Timeslot>> timeslotsByShift,
            Random rng) {

        Long cgId = unit.classGroup.getId();

        // Candidatas: entradas que bloqueiam a unit (mesma turma ou mesmo professor)
        List<ScheduleEntry> candidates = new ArrayList<>();
        for (ScheduleEntry entry : entries) {
            boolean blocksUnit = false;

            // Se a entry é da mesma turma, o slot está ocupado para a turma
            if (entry.getClassGroup().getId().equals(cgId)) {
                blocksUnit = true;
            }

            // Se a entry usa um dos mesmos professores
            if (!blocksUnit) {
                for (Professor unitProf : unit.professors) {
                    if (entry.getProfessors().stream()
                            .anyMatch(ep -> ep.getId().equals(unitProf.getId()))) {
                        blocksUnit = true;
                        break;
                    }
                }
            }

            if (blocksUnit) {
                candidates.add(entry);
            }
        }

        if (candidates.isEmpty())
            return false;

        // Embaralhar para variar tentativas
        Collections.shuffle(candidates, rng);

        int tried = 0;
        for (ScheduleEntry victim : candidates) {
            if (tried >= BACKTRACK_DEPTH)
                break;
            tried++;

            Timeslot victimSlot = victim.getTimeslot();

            // ★ FIX: Eligible slots CORRETOS para a vítima (baseado no turno da turma da VÍTIMA)
            List<Timeslot> victimEligible = timeslotsByShift.getOrDefault(
                    victim.getClassGroup().getShiftType(), List.of());

            // Construir unidade fictícia para a vítima
            Demand victimDemand = new Demand();
            victimDemand.setSubject(victim.getSubject());
            victimDemand.setQuantityPerWeek(1);
            victimDemand.setProfessors(new HashSet<>(victim.getProfessors()));
            victimDemand.setAllowDoubleLesson(false);

            SchedulingUnit victimUnit = new SchedulingUnit(
                    victimDemand,
                    victim.getClassGroup(),
                    new ArrayList<>(victim.getProfessors()),
                    victimEligible,
                    false);

            // Remover temporariamente a vítima
            removeEntry(victim, classGroupBlocks, professorBlocks,
                    subjectDayCount, classGroupDayCount, entries, usedSlotsByClass);

            // ★ FIX: Tentar encontrar QUALQUER slot para a unit (não apenas o da vítima)
            Timeslot slotForUnit = findBestSingleSlot(
                    unit, classGroupBlocks, professorBlocks,
                    unavailByProf, prefsByProf,
                    subjectDayCount, classGroupDayCount, rng);

            if (slotForUnit != null) {
                placeEntry(slotForUnit, unit, classGroupBlocks, professorBlocks,
                        subjectDayCount, classGroupDayCount, entries, usedSlotsByClass);

                // Tentar realocar a vítima em outro slot
                Timeslot newSlotForVictim = findBestSingleSlot(
                        victimUnit, classGroupBlocks, professorBlocks,
                        unavailByProf, prefsByProf,
                        subjectDayCount, classGroupDayCount, rng);

                if (newSlotForVictim != null) {
                    placeEntry(newSlotForVictim, victimUnit, classGroupBlocks,
                            professorBlocks, subjectDayCount, classGroupDayCount,
                            entries, usedSlotsByClass);
                    return true; // Sucesso! Re-alocou ambas
                } else {
                    // Falhou — desfazer: remover a nova e re-inserir a vítima
                    removeLastEntry(entries, classGroupBlocks, professorBlocks,
                            subjectDayCount, classGroupDayCount, usedSlotsByClass);
                    placeEntry(victimSlot, victimUnit, classGroupBlocks, professorBlocks,
                            subjectDayCount, classGroupDayCount, entries, usedSlotsByClass);
                }
            } else {
                // Não conseguiu alocar — re-inserir vítima
                placeEntry(victimSlot, victimUnit, classGroupBlocks, professorBlocks,
                        subjectDayCount, classGroupDayCount, entries, usedSlotsByClass);
            }
        }

        return false;
    }

    // ========================= ANÁLISE DE CONFLITO =========================

    /**
     * Analisa POR QUE uma aula não pode ser alocada, gerando um relatório
     * detalhado com os motivos de conflito.
     */
    private ConflictReason analyzeConflict(
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> unavailByProf) {

        List<String> reasons = new ArrayList<>();
        int totalSlots = unit.eligibleSlots.size();
        int blockedByClass = 0;
        int blockedByProf = 0;
        int blockedByUnavail = 0;
        Map<String, Integer> profConflictCounts = new HashMap<>();

        for (Timeslot slot : unit.eligibleSlots) {
            int day = slot.getDayOfWeek();
            LocalTime start = slot.getStartTime();
            LocalTime end = slot.getEndTime();

            // Conflito com turma?
            List<TimeBlock> cgBlocks = classGroupBlocks.getOrDefault(
                    unit.classGroup.getId(), List.of());
            boolean classBusy = cgBlocks.stream().anyMatch(b -> b.overlaps(day, start, end));
            if (classBusy) {
                blockedByClass++;
                continue;
            }

            // Conflito com professor?
            boolean slotBusyByProf = false;
            boolean slotBusyByUnavail = false;
            for (Professor prof : unit.professors) {
                List<TimeBlock> pBlocks = professorBlocks.getOrDefault(
                        prof.getId(), List.of());
                boolean profBusy = pBlocks.stream().anyMatch(b -> b.overlaps(day, start, end));
                if (profBusy) {
                    slotBusyByProf = true;
                    profConflictCounts.merge(prof.getName(), 1, Integer::sum);
                }

                List<TimeBlock> pUnavail = unavailByProf.getOrDefault(
                        prof.getId(), List.of());
                boolean unavail = pUnavail.stream().anyMatch(b -> b.overlaps(day, start, end));
                if (unavail) {
                    slotBusyByUnavail = true;
                    profConflictCounts.merge(
                            prof.getName() + " (indisponível)", 1, Integer::sum);
                }
            }
            if (slotBusyByProf) {
                blockedByProf++;
            }
            if (slotBusyByUnavail) {
                blockedByUnavail++;
            }
        }

        if (blockedByClass > 0) {
            reasons.add(String.format(
                    "Turma '%s' ocupada em %d/%d slots",
                    unit.classGroup.getName(), blockedByClass, totalSlots));
        }
        if (blockedByProf > 0) {
            reasons.add(String.format(
                    "Professor(es) ocupado(s) em %d slots", blockedByProf));
            for (var e : profConflictCounts.entrySet()) {
                reasons.add(String.format("  → %s: %d conflitos", e.getKey(), e.getValue()));
            }
        }
        if (blockedByUnavail > 0) {
            reasons.add(String.format(
                    "Indisponibilidade(s) bloqueiam %d slots", blockedByUnavail));
        }
        if (blockedByClass == 0 && blockedByProf == 0 && blockedByUnavail == 0) {
            reasons.add("Todos os slots já estão ocupados (capacidade esgotada)");
        }

        return new ConflictReason(
                unit.demand.getSubject().getName(),
                unit.classGroup.getName(),
                unit.professors.stream().map(Professor::getName).toList(),
                unit.isDouble,
                reasons);
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
            if (cb.overlaps(day, start, end))
                return true;
        }

        for (Professor prof : professors) {
            List<TimeBlock> blocks = professorBlocks.getOrDefault(prof.getId(), List.of());
            for (TimeBlock b : blocks) {
                if (b.overlaps(day, start, end))
                    return true;
            }

            List<TimeBlock> unavails = unavailByProf.getOrDefault(prof.getId(), List.of());
            for (TimeBlock u : unavails) {
                if (u.overlaps(day, start, end))
                    return true;
            }
        }

        return false;
    }

    // ========================= SCORING COM PREFERÊNCIAS =========================

    private int scoreSlot(
            Timeslot slot,
            SchedulingUnit unit,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<ProfessorPreference>> prefsByProf,
            Random rng) {

        int score = 0;
        int day = slot.getDayOfWeek();
        long cgId = unit.classGroup.getId();
        long subjId = unit.demand.getSubject().getId();

        // HARD-ISH: Mesma matéria no mesmo dia — penalidade forte
        String subjDayKey = cgId + "-" + subjId + "-" + day;
        int existingSubjectOnDay = subjectDayCount.getOrDefault(subjDayKey, 0);
        score -= existingSubjectOnDay * 300;

        // SOFT: Balancear aulas da turma entre os dias
        String cgDayKey = cgId + "-" + day;
        int totalOnDay = classGroupDayCount.getOrDefault(cgDayKey, 0);
        score -= totalOnDay * 50;

        // SOFT: Minimizar "janelas" (buracos)
        List<TimeBlock> cgDayBlocks = classGroupBlocks.getOrDefault(cgId, List.of())
                .stream().filter(b -> b.dayOfWeek() == day).toList();
        if (!cgDayBlocks.isEmpty()) {
            boolean isAdjacent = cgDayBlocks.stream().anyMatch(b -> b.endTime().equals(slot.getStartTime())
                    || b.startTime().equals(slot.getEndTime()));
            if (isAdjacent) {
                score += 60;
            }
        }

        // SOFT: Compactar agenda do professor e minimizar janelas ociosas no mesmo dia
        for (Professor prof : unit.professors) {
            List<TimeBlock> profBlocks = professorBlocks.getOrDefault(prof.getId(), List.of());
            List<TimeBlock> profDayBlocks = profBlocks.stream()
                    .filter(b -> b.dayOfWeek() == day)
                    .toList();

            if (!profDayBlocks.isEmpty()) {
                score += 25;

                // Distância mínima até outra aula do professor no mesmo dia
                long minGapMinutes = Long.MAX_VALUE;
                for (TimeBlock b : profDayBlocks) {
                    long gap;
                    if (!b.endTime().isAfter(slot.getStartTime())) {
                        gap = java.time.Duration.between(b.endTime(), slot.getStartTime()).toMinutes();
                    } else if (!slot.getEndTime().isAfter(b.startTime())) {
                        gap = java.time.Duration.between(slot.getEndTime(), b.startTime()).toMinutes();
                    } else {
                        gap = 0;
                    }
                    if (gap < minGapMinutes) {
                        minGapMinutes = gap;
                    }
                }

                // Adjacente direto ou separado apenas pelo intervalo de 20 min (09:40-10:00)
                if (minGapMinutes <= 20) {
                    score += 75;
                } else if (minGapMinutes >= 45) {
                    // Penalizar criação de janelas ociosas no mesmo dia
                    score -= (int) Math.min(180, (minGapMinutes / 50) * 45);
                }
            }

            if (profDayBlocks.size() >= 6) {
                score -= 80;
            }

            // ★ PREFERÊNCIAS DO PROFESSOR ★
            List<ProfessorPreference> prefs = prefsByProf.getOrDefault(prof.getId(), List.of());
            for (ProfessorPreference pref : prefs) {
                boolean matchesDay = pref.getDayOfWeek() == 0 || pref.getDayOfWeek() == day;
                boolean matchesTime = true;
                if (pref.getStartTime() != null && pref.getEndTime() != null) {
                    matchesTime = !slot.getStartTime().isBefore(pref.getStartTime())
                            && !slot.getEndTime().isAfter(pref.getEndTime());
                }
                boolean matchesSubject = pref.getSubject() == null
                        || pref.getSubject().getId().equals(subjId);

                if (matchesDay && matchesTime && matchesSubject) {
                    int bonusMagnitude = pref.getWeight() * 50; // peso 1-10 → 50-500 pontos
                    if (pref.getType() == PreferenceType.PREFERRED) {
                        score += bonusMagnitude;
                    } else { // AVOID
                        score -= bonusMagnitude;
                    }
                }
            }
        }

        // SOFT: Preferir horários mais cedo
        int minuteOfDay = slot.getStartTime().getHour() * 60 + slot.getStartTime().getMinute();
        score -= minuteOfDay / 30;

        // ★ JITTER ALEATÓRIO ★ — garante grades diferentes a cada execução
        score += rng.nextInt(61) - 30; // -30 a +30 aleatório

        return score;
    }

    // ========================= FIND BEST SINGLE SLOT =========================

    private Timeslot findBestSingleSlot(
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> unavailByProf,
            Map<Long, List<ProfessorPreference>> prefsByProf,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            Random rng) {

        Timeslot bestSlot = null;
        int bestScore = Integer.MIN_VALUE;

        // Embaralhar slots para que empates sejam resolvidos aleatoriamente
        List<Timeslot> shuffled = new ArrayList<>(unit.eligibleSlots);
        Collections.shuffle(shuffled, rng);

        for (Timeslot slot : shuffled) {
            if (hasConflict(slot, unit.professors, unit.classGroup.getId(),
                    classGroupBlocks, professorBlocks, unavailByProf)) {
                continue;
            }

            int score = scoreSlot(slot, unit, subjectDayCount, classGroupDayCount,
                    professorBlocks, classGroupBlocks, prefsByProf, rng);
            if (score > bestScore) {
                bestScore = score;
                bestSlot = slot;
            }
        }

        return bestSlot;
    }

    // ========================= SCHEDULE DOUBLE =========================

    private boolean scheduleDouble(
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<Long, List<TimeBlock>> unavailByProf,
            Map<Long, List<ProfessorPreference>> prefsByProf,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            List<SlotPair> availablePairs,
            List<ScheduleEntry> entries,
            Map<Long, Set<Long>> usedSlotsByClass,
            Random rng) {

        SlotPair bestPair = null;
        int bestScore = Integer.MIN_VALUE;

        // Embaralhar pares para variedade
        List<SlotPair> shuffledPairs = new ArrayList<>(availablePairs);
        Collections.shuffle(shuffledPairs, rng);

        for (SlotPair pair : shuffledPairs) {
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
                    professorBlocks, classGroupBlocks, prefsByProf, rng)
                    + scoreSlot(pair.second, unit, subjectDayCount, classGroupDayCount,
                            professorBlocks, classGroupBlocks, prefsByProf, rng)
                    + 50; // Bônus por ser aula dupla

            if (score > bestScore) {
                bestScore = score;
                bestPair = pair;
            }
        }

        if (bestPair == null)
            return false;

        for (Timeslot slot : List.of(bestPair.first, bestPair.second)) {
            placeEntry(slot, unit, classGroupBlocks, professorBlocks,
                    subjectDayCount, classGroupDayCount, entries, usedSlotsByClass);
        }

        return true;
    }

    // ========================= PLACE / REMOVE =========================

    private void placeEntry(
            Timeslot slot,
            SchedulingUnit unit,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            List<ScheduleEntry> entries,
            Map<Long, Set<Long>> usedSlotsByClass) {

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

        usedSlotsByClass
                .computeIfAbsent(unit.classGroup.getId(), k -> new HashSet<>())
                .add(slot.getId());
    }

    private void removeEntry(
            ScheduleEntry entry,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            List<ScheduleEntry> entries,
            Map<Long, Set<Long>> usedSlotsByClass) {

        entries.remove(entry);

        Timeslot slot = entry.getTimeslot();
        TimeBlock block = new TimeBlock(
                slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime());

        List<TimeBlock> cgBlocks = classGroupBlocks.get(entry.getClassGroup().getId());
        if (cgBlocks != null)
            cgBlocks.remove(block);

        for (Professor prof : entry.getProfessors()) {
            List<TimeBlock> pBlocks = professorBlocks.get(prof.getId());
            if (pBlocks != null)
                pBlocks.remove(block);
        }

        String subjDayKey = entry.getClassGroup().getId() + "-"
                + entry.getSubject().getId() + "-" + slot.getDayOfWeek();
        subjectDayCount.merge(subjDayKey, -1, Integer::sum);

        String cgDayKey = entry.getClassGroup().getId() + "-" + slot.getDayOfWeek();
        classGroupDayCount.merge(cgDayKey, -1, Integer::sum);

        Set<Long> usedSlots = usedSlotsByClass.get(entry.getClassGroup().getId());
        if (usedSlots != null)
            usedSlots.remove(slot.getId());
    }

    private void removeLastEntry(
            List<ScheduleEntry> entries,
            Map<Long, List<TimeBlock>> classGroupBlocks,
            Map<Long, List<TimeBlock>> professorBlocks,
            Map<String, Integer> subjectDayCount,
            Map<String, Integer> classGroupDayCount,
            Map<Long, Set<Long>> usedSlotsByClass) {
        if (entries.isEmpty())
            return;
        ScheduleEntry last = entries.getLast();
        removeEntry(last, classGroupBlocks, professorBlocks,
                subjectDayCount, classGroupDayCount, entries, usedSlotsByClass);
    }

    // ========================= PREFERENCE COUNTING =========================

    private int countPreferencesMatched(
            List<ScheduleEntry> newEntries,
            Map<Long, List<ProfessorPreference>> prefsByProf) {
        int count = 0;
        for (ScheduleEntry entry : newEntries) {
            Timeslot slot = entry.getTimeslot();
            for (Professor prof : entry.getProfessors()) {
                List<ProfessorPreference> prefs = prefsByProf.getOrDefault(
                        prof.getId(), List.of());
                for (ProfessorPreference pref : prefs) {
                    if (pref.getType() != PreferenceType.PREFERRED)
                        continue;
                    boolean matchDay = pref.getDayOfWeek() == 0
                            || pref.getDayOfWeek() == slot.getDayOfWeek();
                    boolean matchTime = true;
                    if (pref.getStartTime() != null && pref.getEndTime() != null) {
                        matchTime = !slot.getStartTime().isBefore(pref.getStartTime())
                                && !slot.getEndTime().isAfter(pref.getEndTime());
                    }
                    boolean matchSubj = pref.getSubject() == null
                            || pref.getSubject().getId().equals(entry.getSubject().getId());
                    if (matchDay && matchTime && matchSubj) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    /**
     * Conta quantos slots elegíveis estão realmente disponíveis
     * (sem conflito de indisponibilidade) para uma unidade.
     * Usado para MRV (Minimum Remaining Values) na ordenação.
     */
    private int countAvailableSlots(SchedulingUnit unit, Map<Long, List<TimeBlock>> unavailByProf) {
        int count = 0;
        for (Timeslot s : unit.eligibleSlots) {
            boolean blocked = false;
            for (Professor p : unit.professors) {
                List<TimeBlock> unavails = unavailByProf.getOrDefault(p.getId(), List.of());
                for (TimeBlock u : unavails) {
                    if (u.overlaps(s.getDayOfWeek(), s.getStartTime(), s.getEndTime())) {
                        blocked = true;
                        break;
                    }
                }
                if (blocked) break;
            }
            if (!blocked) count++;
        }
        return count;
    }

    // ========================= HELPERS =========================

    private Map<Long, List<TimeBlock>> buildUnavailabilityMap(
            List<ProfessorUnavailability> all) {
        Map<Long, List<TimeBlock>> map = new HashMap<>();
        for (ProfessorUnavailability u : all) {
            long profId = u.getProfessor().getId();
            if (u.getDayOfWeek() == 0) {
                for (int day = 1; day <= 5; day++) {
                    map.computeIfAbsent(profId, k -> new ArrayList<>())
                            .add(new TimeBlock(day, u.getStartTime(), u.getEndTime()));
                }
            } else {
                map.computeIfAbsent(profId, k -> new ArrayList<>())
                        .add(new TimeBlock(u.getDayOfWeek(), u.getStartTime(), u.getEndTime()));
            }
        }
        return map;
    }

    private List<SchedulingUnit> buildSchedulingUnits(
            List<Demand> allDemands,
            Map<ShiftType, List<Timeslot>> timeslotsByShift) {
        List<SchedulingUnit> units = new ArrayList<>();
        for (Demand demand : allDemands) {
            if (demand.getProfessors().isEmpty()) {
                log.warn("Demanda #{} '{}' sem professores — ignorada",
                        demand.getId(), demand.getSubject().getName());
                continue;
            }

            ClassGroup cg = demand.getSubject().getClassGroup();
            List<Professor> profs = new ArrayList<>(demand.getProfessors());
            List<Timeslot> eligible = timeslotsByShift.getOrDefault(
                    cg.getShiftType(), List.of());

            if (eligible.isEmpty()) {
                log.warn("Turma '{}' ({}) sem timeslots disponíveis",
                        cg.getName(), cg.getShiftType());
                continue;
            }

            int qty = demand.getQuantityPerWeek();

            if (demand.isAllowDoubleLesson() && qty >= 2) {
                int doubles = qty / 2;
                int singles = qty % 2;
                for (int i = 0; i < doubles; i++) {
                    units.add(new SchedulingUnit(demand, cg, profs, eligible, true));
                }
                for (int i = 0; i < singles; i++) {
                    units.add(new SchedulingUnit(demand, cg, profs, eligible, false));
                }
            } else {
                for (int i = 0; i < qty; i++) {
                    units.add(new SchedulingUnit(demand, cg, profs, eligible, false));
                }
            }
        }
        return units;
    }

    private String buildReport(AttemptResult result) {
        StringBuilder details = new StringBuilder();
        details.append(String.format("Alocadas: %d | Nao alocadas: %d",
                result.scheduled, result.unscheduled));

        if (result.preferencesTotal > 0) {
            details.append(String.format(" | Preferências atendidas: %d",
                    result.preferencesRespected));
        }

        if (!result.perClassCount.isEmpty()) {
            details.append("\n\nPor turma:");
            result.perClassCount.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(e -> details.append(
                            String.format("\n  %s: %d aulas", e.getKey(), e.getValue())));
        }

        if (!result.conflicts.isEmpty()) {
            details.append("\n\nAulas não alocadas (motivos):");
            for (ConflictReason c : result.conflicts) {
                details.append(String.format("\n\n  %s — Turma %s (Prof: %s)%s",
                        c.subjectName, c.classGroupName,
                        String.join(", ", c.professorNames),
                        c.isDouble ? " [aula dupla]" : ""));
                for (String reason : c.reasons) {
                    details.append("\n    - ").append(reason);
                }
            }
        }

        return details.toString();
    }
}
