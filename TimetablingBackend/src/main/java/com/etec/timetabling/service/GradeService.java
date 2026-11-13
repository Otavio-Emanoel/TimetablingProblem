package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import com.etec.timetabling.web.GradeController.ClassGradeResponse;
import com.etec.timetabling.web.GradeController.ClassGradeSummaryItem;
import com.etec.timetabling.web.GradeController.GradeEntryResponse;
import com.etec.timetabling.web.GradeController.MoveGradeEntryRequest;
import com.etec.timetabling.web.GradeController.MoveGradeEntryResponse;
import com.etec.timetabling.web.GradeController.MoveValidationResponse;
import com.etec.timetabling.web.GradeController.ProfessorGradeEntryResponse;
import com.etec.timetabling.web.GradeController.ProfessorGradeResponse;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Serviço de consulta, resumo e movimentação manual/simulada de horários na grade.
 */
@Service
public class GradeService {

    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final TimeslotRepository timeslotRepository;
    private final DemandRepository demandRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;

    public GradeService(
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        TimeslotRepository timeslotRepository,
        DemandRepository demandRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository
    ) {
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.timeslotRepository = timeslotRepository;
        this.demandRepository = demandRepository;
        this.unavailabilityRepository = unavailabilityRepository;
    }

    private record MoveContext(
        ClassGroup classGroup,
        Timeslot fromSlot,
        Timeslot toSlot,
        ScheduleEntry sourceEntry,
        ScheduleEntry targetEntry
    ) {
    }

    @Transactional(readOnly = true)
    public List<GradeEntryResponse> listByClassGroup(Long classGroupId) {
        return scheduleEntryRepository.findByClassGroupId(classGroupId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, ClassGradeResponse> listAllClassGrades() {
        var allEntries = scheduleEntryRepository.findAll();
        var grouped = allEntries.stream()
            .collect(Collectors.groupingBy(ScheduleEntry::getClassGroup));

        Map<String, ClassGradeResponse> result = new LinkedHashMap<>();
        grouped.entrySet().stream()
            .sorted(Comparator.comparing(e -> e.getKey().getName()))
            .forEach(entry -> {
                var cg = entry.getKey();
                var entries = entry.getValue().stream()
                    .sorted(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                        .thenComparing(e -> e.getTimeslot().getStartTime()))
                    .map(this::toResponse)
                    .toList();
                result.put(cg.getName(), new ClassGradeResponse(
                    cg.getId(), cg.getName(), cg.getShiftType().name(), entries));
            });

        return result;
    }

    @Transactional(readOnly = true)
    public List<ProfessorGradeEntryResponse> listByProfessor(Long professorId) {
        return scheduleEntryRepository.findByProfessorsId(professorId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(this::toProfessorEntryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, ProfessorGradeResponse> listAllProfessorGrades() {
        List<Professor> allProfessors = professorRepository.findAllByOrderByNameAsc();
        List<ScheduleEntry> allEntries = scheduleEntryRepository.findAll();

        Map<Long, List<ProfessorGradeEntryResponse>> entriesByProf = new HashMap<>();
        for (ScheduleEntry entry : allEntries) {
            ProfessorGradeEntryResponse dto = toProfessorEntryResponse(entry);
            for (Professor prof : entry.getProfessors()) {
                entriesByProf.computeIfAbsent(prof.getId(), k -> new ArrayList<>()).add(dto);
            }
        }

        Map<String, ProfessorGradeResponse> result = new LinkedHashMap<>();
        for (Professor prof : allProfessors) {
            List<ProfessorGradeEntryResponse> list = entriesByProf.getOrDefault(prof.getId(), List.of()).stream()
                .sorted(Comparator.comparingInt(ProfessorGradeEntryResponse::dayOfWeek)
                    .thenComparing(ProfessorGradeEntryResponse::startTime))
                .toList();
            result.put(prof.getName(), new ProfessorGradeResponse(prof.getId(), prof.getName(), list));
        }
        return result;
    }

    /**
     * Retorna o resumo quantitativo por turma (aulas alocadas, demandadas, slots e vagas).
     */
    @Transactional(readOnly = true)
    public List<ClassGradeSummaryItem> listClassSummaries() {
        List<ClassGroup> classGroups = classGroupRepository.findAllByOrderByNameAsc();
        Map<Long, List<ScheduleEntry>> entriesByClass = scheduleEntryRepository.findAll().stream()
            .collect(Collectors.groupingBy(e -> e.getClassGroup().getId()));
        Map<Long, List<Demand>> demandsByClass = demandRepository.findAll().stream()
            .collect(Collectors.groupingBy(d -> d.getSubject().getClassGroup().getId()));
        Map<ShiftType, Long> slotCountByShift = timeslotRepository.findAll().stream()
            .collect(Collectors.groupingBy(Timeslot::getShiftType, Collectors.counting()));

        List<ClassGradeSummaryItem> result = new ArrayList<>();
        for (ClassGroup cg : classGroups) {
            List<ScheduleEntry> entries = entriesByClass.getOrDefault(cg.getId(), List.of());
            List<Demand> demands = demandsByClass.getOrDefault(cg.getId(), List.of());
            int demanded = demands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
            int totalSlots = slotCountByShift.getOrDefault(cg.getShiftType(), 0L).intValue();
            int allocated = entries.size();
            int freeSlots = Math.max(0, totalSlots - allocated);
            int distinctSubjects = (int) entries.stream()
                .map(e -> e.getSubject().getId())
                .distinct()
                .count();

            result.add(new ClassGradeSummaryItem(
                cg.getId(),
                cg.getName(),
                cg.getShiftType().name(),
                allocated,
                demanded,
                totalSlots,
                freeSlots,
                distinctSubjects
            ));
        }
        return result;
    }

    /**
     * Simula a movimentação ou troca de aulas sem alterar o banco de dados,
     * listando eventuais conflitos de professor ou indisponibilidades.
     */
    @Transactional(readOnly = true)
    public MoveValidationResponse previewMoveOrSwap(MoveGradeEntryRequest request) {
        MoveContext ctx = resolveMoveContext(request);
        List<String> conflicts = evaluateMoveConflicts(ctx);
        boolean willSwap = ctx.targetEntry() != null;
        String message = conflicts.isEmpty()
            ? (willSwap
                ? String.format("Troca permitida entre %s e %s",
                    ctx.sourceEntry().getSubject().getName(), ctx.targetEntry().getSubject().getName())
                : String.format("Movimentacao permitida para %s", ctx.sourceEntry().getSubject().getName()))
            : conflicts.get(0);
        return new MoveValidationResponse(conflicts.isEmpty(), willSwap, conflicts, message);
    }

    @Transactional
    public MoveGradeEntryResponse moveOrSwapEntry(MoveGradeEntryRequest request) {
        MoveContext ctx = resolveMoveContext(request);

        if (!request.force()) {
            List<String> conflicts = evaluateMoveConflicts(ctx);
            if (!conflicts.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, conflicts.get(0));
            }
        }

        ctx.sourceEntry().setTimeslot(ctx.toSlot());
        scheduleEntryRepository.save(ctx.sourceEntry());

        boolean swapped = false;
        if (ctx.targetEntry() != null) {
            ctx.targetEntry().setTimeslot(ctx.fromSlot());
            scheduleEntryRepository.save(ctx.targetEntry());
            swapped = true;
        }

        String msg = swapped
            ? String.format("Aulas trocadas com sucesso: %s <-> %s",
                ctx.sourceEntry().getSubject().getName(), ctx.targetEntry().getSubject().getName())
            : String.format("Aula de %s movida com sucesso", ctx.sourceEntry().getSubject().getName());

        return new MoveGradeEntryResponse(swapped, msg);
    }

    @Transactional
    public void clearAllGrades() {
        scheduleEntryRepository.deleteAll();
    }

    private MoveContext resolveMoveContext(MoveGradeEntryRequest request) {
        ClassGroup classGroup = classGroupRepository.findById(request.classGroupId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Turma nao encontrada"));

        List<Timeslot> shiftSlots = timeslotRepository
            .findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(classGroup.getShiftType());
        Timeslot fromSlot = shiftSlots.stream()
            .filter(t -> t.getDayOfWeek() == request.fromDay() && t.getStartTime().equals(request.fromStartTime()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Slot de origem nao encontrado para o turno da turma"));

        Timeslot toSlot = shiftSlots.stream()
            .filter(t -> t.getDayOfWeek() == request.toDay() && t.getStartTime().equals(request.toStartTime()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Slot de destino nao encontrado para o turno da turma"));

        if (fromSlot.getId().equals(toSlot.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de origem e destino sao iguais");
        }

        ScheduleEntry sourceEntry = scheduleEntryRepository
            .findByClassGroupIdAndTimeslotId(classGroup.getId(), fromSlot.getId())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Nenhuma aula alocada no horario de origem"));

        ScheduleEntry targetEntry = scheduleEntryRepository
            .findByClassGroupIdAndTimeslotId(classGroup.getId(), toSlot.getId())
            .orElse(null);

        return new MoveContext(classGroup, fromSlot, toSlot, sourceEntry, targetEntry);
    }

    private List<String> evaluateMoveConflicts(MoveContext ctx) {
        List<ScheduleEntry> allEntries = scheduleEntryRepository.findAll();
        List<ProfessorUnavailability> allUnavail = unavailabilityRepository.findAll();

        Long ignoreSourceId = ctx.sourceEntry().getId();
        Long ignoreTargetId = ctx.targetEntry() != null ? ctx.targetEntry().getId() : -1L;

        List<String> conflicts = new ArrayList<>();
        collectPlacementConflicts(ctx.sourceEntry(), ctx.toSlot(), allEntries, allUnavail, ignoreSourceId, ignoreTargetId, conflicts);
        if (ctx.targetEntry() != null) {
            collectPlacementConflicts(ctx.targetEntry(), ctx.fromSlot(), allEntries, allUnavail, ignoreSourceId, ignoreTargetId, conflicts);
        }
        return conflicts;
    }

    private void collectPlacementConflicts(
        ScheduleEntry entryToPlace,
        Timeslot targetSlot,
        List<ScheduleEntry> allEntries,
        List<ProfessorUnavailability> allUnavail,
        Long ignoreId1,
        Long ignoreId2,
        List<String> conflicts
    ) {
        for (Professor prof : entryToPlace.getProfessors()) {
            for (ProfessorUnavailability u : allUnavail) {
                if (u.getProfessor().getId().equals(prof.getId())) {
                    boolean sameDay = u.getDayOfWeek() == 0 || u.getDayOfWeek() == targetSlot.getDayOfWeek();
                    if (sameDay && u.getStartTime().isBefore(targetSlot.getEndTime())
                            && u.getEndTime().isAfter(targetSlot.getStartTime())) {
                        conflicts.add(String.format(
                            "Professor %s possui restricao de indisponibilidade neste horario (%s-%s)",
                            prof.getName(), u.getStartTime(), u.getEndTime()));
                    }
                }
            }

            for (ScheduleEntry other : allEntries) {
                if (other.getId().equals(ignoreId1) || other.getId().equals(ignoreId2)) {
                    continue;
                }
                boolean teachesOther = other.getProfessors().stream().anyMatch(p -> p.getId().equals(prof.getId()));
                if (!teachesOther) {
                    continue;
                }
                Timeslot otherSlot = other.getTimeslot();
                if (otherSlot.getDayOfWeek() == targetSlot.getDayOfWeek()
                        && otherSlot.getStartTime().isBefore(targetSlot.getEndTime())
                        && otherSlot.getEndTime().isAfter(targetSlot.getStartTime())) {
                    conflicts.add(String.format(
                        "Conflito: Professor %s ja leciona %s na turma %s neste horario (%s-%s)",
                        prof.getName(), other.getSubject().getName(), other.getClassGroup().getName(),
                        otherSlot.getStartTime(), otherSlot.getEndTime()));
                }
            }
        }
    }

    private GradeEntryResponse toResponse(ScheduleEntry entry) {
        return new GradeEntryResponse(
            entry.getTimeslot().getDayOfWeek(),
            entry.getTimeslot().getStartTime().toString(),
            entry.getTimeslot().getEndTime().toString(),
            entry.getSubject().getName(),
            entry.getProfessors().stream().map(Professor::getName).sorted().toList()
        );
    }

    private ProfessorGradeEntryResponse toProfessorEntryResponse(ScheduleEntry entry) {
        return new ProfessorGradeEntryResponse(
            entry.getTimeslot().getDayOfWeek(),
            entry.getTimeslot().getStartTime().toString(),
            entry.getTimeslot().getEndTime().toString(),
            entry.getSubject().getName(),
            entry.getClassGroup().getName(),
            entry.getClassGroup().getShiftType().name(),
            entry.getProfessors().stream().map(Professor::getName).sorted().toList()
        );
    }
}

