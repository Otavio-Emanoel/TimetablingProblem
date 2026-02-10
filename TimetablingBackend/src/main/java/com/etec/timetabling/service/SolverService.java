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
import java.util.List;
import java.util.Map;
import java.util.Set;
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
        ProfessorUnavailabilityRepository unavailabilityRepository
    ) {
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.timeslotRepository = timeslotRepository;
        this.unavailabilityRepository = unavailabilityRepository;
    }

    /**
     * Resolve o problema de grade horária.
     * DEVE rodar dentro de uma transação para que lazy-loading funcione
     * e para garantir atomicidade (deleteAll + saveAll).
     */
    @Transactional
    public SolverResult solve() {
        log.info("========================================");
        log.info("          SOLVER INICIANDO              ");
        log.info("========================================");

        // ── 1. Limpar grade anterior ──────────────────────────────
        long previousCount = scheduleEntryRepository.count();
        scheduleEntryRepository.deleteAll();
        log.info("Removidas {} entradas anteriores da grade", previousCount);

        // ── 2. Carregar TODOS os dados dentro da transação ───────
        List<Demand> allDemands = demandRepository.findAll();
        List<Timeslot> allTimeslots = timeslotRepository.findAll();
        List<ProfessorUnavailability> allUnavailabilities = unavailabilityRepository.findAll();

        // Forçar inicialização da coleção lazy @ManyToMany(professors)
        for (Demand d : allDemands) {
            d.getProfessors().size();
        }

        log.info("Dados carregados: {} demandas, {} timeslots, {} indisponibilidades",
            allDemands.size(), allTimeslots.size(), allUnavailabilities.size());

        // ── 3. Validações rápidas ────────────────────────────────
        if (allDemands.isEmpty()) {
            String msg = "Nenhuma demanda cadastrada. Crie demandas vinculando matérias a professores.";
            log.warn(msg);
            return new SolverResult(0, 0, msg);
        }
        if (allTimeslots.isEmpty()) {
            int total = allDemands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
            String msg = "Nenhum timeslot cadastrado. Crie os horários de aula primeiro.";
            log.warn(msg);
            return new SolverResult(0, total, msg);
        }

        // Avisar sobre demandas sem professores
        List<Demand> demandsWithoutProfs = allDemands.stream()
            .filter(d -> d.getProfessors().isEmpty())
            .toList();
        if (!demandsWithoutProfs.isEmpty()) {
            log.warn("{} demandas sem professores (serão ignoradas):", demandsWithoutProfs.size());
            for (Demand d : demandsWithoutProfs) {
                log.warn("  - Demanda #{}: matéria '{}'", d.getId(), d.getSubject().getName());
            }
        }

        // ── 4. Indexar timeslots por turno ───────────────────────
        Map<ShiftType, List<Timeslot>> timeslotsByShift = allTimeslots.stream()
            .sorted(Comparator.comparingInt(Timeslot::getDayOfWeek)
                .thenComparing(Timeslot::getStartTime))
            .collect(Collectors.groupingBy(Timeslot::getShiftType));

        for (var e : timeslotsByShift.entrySet()) {
            log.info("  Turno {}: {} slots", e.getKey(), e.getValue().size());
        }

        // ── 5. Indexar indisponibilidades por professor ──────────
        Map<Long, List<ProfessorUnavailability>> unavailByProf = allUnavailabilities.stream()
            .collect(Collectors.groupingBy(u -> u.getProfessor().getId()));

        // ── 6. Expandir demandas em tarefas individuais ──────────
        List<AssignmentTask> tasks = new ArrayList<>();
        for (Demand demand : allDemands) {
            if (demand.getProfessors().isEmpty()) continue;

            ClassGroup cg = demand.getSubject().getClassGroup();
            List<Professor> profs = new ArrayList<>(demand.getProfessors());
            List<Timeslot> eligible = timeslotsByShift.getOrDefault(cg.getShiftType(), List.of());

            if (eligible.isEmpty()) {
                log.warn("Turma '{}' usa turno {} mas não há timeslots desse turno",
                    cg.getName(), cg.getShiftType());
            }

            for (int i = 0; i < demand.getQuantityPerWeek(); i++) {
                tasks.add(new AssignmentTask(demand, cg, profs, eligible));
            }
        }

        log.info("Total de {} aulas individuais a alocar", tasks.size());

        if (tasks.isEmpty()) {
            String msg = "Nenhuma aula a alocar (demandas sem professores ou quantityPerWeek=0).";
            log.warn(msg);
            return new SolverResult(0, 0, msg);
        }

        // ── 7. Ordenar: mais restritas primeiro ──────────────────
        tasks.sort(Comparator
            .comparingInt((AssignmentTask t) -> t.eligibleSlots.size())
            .thenComparingInt(t -> t.professors.size()));

        // ── 8. Algoritmo greedy com scoring ──────────────────────
        Map<Long, List<TimeBlock>> classGroupTimeBlocks = new HashMap<>();
        Map<Long, List<TimeBlock>> professorTimeBlocks = new HashMap<>();
        Map<String, Integer> subjectDayCount = new HashMap<>();

        int scheduled = 0;
        int unscheduled = 0;
        List<ScheduleEntry> entries = new ArrayList<>();
        List<String> unscheduledDetails = new ArrayList<>();

        for (AssignmentTask task : tasks) {
            Timeslot bestSlot = findBestSlot(
                task, classGroupTimeBlocks, professorTimeBlocks,
                unavailByProf, subjectDayCount
            );

            if (bestSlot == null) {
                unscheduled++;
                String detail = String.format("'%s' p/ turma '%s' (prof: %s)",
                    task.demand.getSubject().getName(),
                    task.classGroup.getName(),
                    task.professors.stream().map(Professor::getName)
                        .collect(Collectors.joining(", ")));
                unscheduledDetails.add(detail);
                continue;
            }

            // Criar entrada na grade
            ScheduleEntry entry = new ScheduleEntry();
            entry.setTimeslot(bestSlot);
            entry.setClassGroup(task.classGroup);
            entry.setSubject(task.demand.getSubject());
            entry.setProfessors(new HashSet<>(task.professors));
            entries.add(entry);

            // Atualizar mapas de conflito
            TimeBlock block = new TimeBlock(
                bestSlot.getDayOfWeek(), bestSlot.getStartTime(), bestSlot.getEndTime());
            classGroupTimeBlocks
                .computeIfAbsent(task.classGroup.getId(), k -> new ArrayList<>())
                .add(block);

            for (Professor prof : task.professors) {
                professorTimeBlocks
                    .computeIfAbsent(prof.getId(), k -> new ArrayList<>())
                    .add(block);
            }

            String dayKey = task.classGroup.getId() + "-"
                + task.demand.getSubject().getId() + "-"
                + bestSlot.getDayOfWeek();
            subjectDayCount.merge(dayKey, 1, Integer::sum);

            scheduled++;
        }

        // ── 9. Salvar tudo de uma vez ────────────────────────────
        scheduleEntryRepository.saveAll(entries);

        // ── 10. Montar resumo ────────────────────────────────────
        StringBuilder details = new StringBuilder();
        details.append(String.format("Alocadas: %d | Não alocadas: %d", scheduled, unscheduled));
        if (!unscheduledDetails.isEmpty()) {
            details.append("\nAulas não alocadas:");
            for (String d : unscheduledDetails) {
                details.append("\n  - ").append(d);
            }
        }

        log.info("========================================");
        log.info("          SOLVER FINALIZADO             ");
        log.info("  Alocadas: {}  |  Não alocadas: {}", scheduled, unscheduled);
        if (!unscheduledDetails.isEmpty()) {
            log.info("  Aulas não alocadas:");
            for (String d : unscheduledDetails) {
                log.info("    - {}", d);
            }
        }
        log.info("========================================");

        return new SolverResult(scheduled, unscheduled, details.toString());
    }

    /**
     * Encontra o melhor timeslot para a tarefa, respeitando todas as restrições:
     *  - Turma não pode ter 2 aulas no mesmo slot
     *  - Professor não pode ter conflito de horário (DETECTA CROSS-SHIFT por sobreposição real)
     *  - Indisponibilidade do professor
     * Usa scoring para distribuir matérias entre dias diferentes.
     */
    private Timeslot findBestSlot(
        AssignmentTask task,
        Map<Long, List<TimeBlock>> classGroupTimeBlocks,
        Map<Long, List<TimeBlock>> professorTimeBlocks,
        Map<Long, List<ProfessorUnavailability>> unavailByProf,
        Map<String, Integer> subjectDayCount
    ) {
        Timeslot bestSlot = null;
        int bestScore = Integer.MIN_VALUE;

        for (Timeslot slot : task.eligibleSlots) {
            // ── Restrição 1: turma já ocupada nesse horário (por sobreposição real) ──
            boolean classConflict = false;
            List<TimeBlock> cgBlocks = classGroupTimeBlocks.getOrDefault(task.classGroup.getId(), List.of());
            for (TimeBlock cb : cgBlocks) {
                if (cb.dayOfWeek == slot.getDayOfWeek()
                    && slot.getStartTime().isBefore(cb.endTime)
                    && slot.getEndTime().isAfter(cb.startTime)) {
                    classConflict = true;
                    break;
                }
            }
            if (classConflict) continue;

            // ── Restrição 2: conflito de professor (cross-shift) ─
            boolean conflict = false;
            for (Professor prof : task.professors) {
                // Verificar alocações existentes (qualquer turno) por sobreposição real
                List<TimeBlock> blocks = professorTimeBlocks.getOrDefault(prof.getId(), List.of());
                for (TimeBlock b : blocks) {
                    if (b.dayOfWeek == slot.getDayOfWeek()
                        && slot.getStartTime().isBefore(b.endTime)
                        && slot.getEndTime().isAfter(b.startTime)) {
                        conflict = true;
                        break;
                    }
                }
                if (conflict) break;

                // ── Restrição 3: indisponibilidade cadastrada ────
                List<ProfessorUnavailability> unavails =
                    unavailByProf.getOrDefault(prof.getId(), List.of());
                for (ProfessorUnavailability u : unavails) {
                    if (u.getDayOfWeek() == slot.getDayOfWeek()
                        && slot.getStartTime().isBefore(u.getEndTime())
                        && slot.getEndTime().isAfter(u.getStartTime())) {
                        conflict = true;
                        break;
                    }
                }
                if (conflict) break;
            }
            if (conflict) continue;

            // ── Scoring: preferir distribuição entre dias ────────
            int score = 0;
            String dayKey = task.classGroup.getId() + "-"
                + task.demand.getSubject().getId() + "-"
                + slot.getDayOfWeek();
            int existingOnDay = subjectDayCount.getOrDefault(dayKey, 0);
            score -= existingOnDay * 100;

            if (bestSlot == null || score > bestScore) {
                bestSlot = slot;
                bestScore = score;
            }
        }

        return bestSlot;
    }

    // ── Records internos ─────────────────────────────────────────
    private record TimeBlock(int dayOfWeek, LocalTime startTime, LocalTime endTime) {}

    private record AssignmentTask(
        Demand demand,
        ClassGroup classGroup,
        List<Professor> professors,
        List<Timeslot> eligibleSlots
    ) {}

    public record SolverResult(int scheduled, int unscheduled, String details) {}
}
