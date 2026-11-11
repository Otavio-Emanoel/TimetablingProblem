package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.PreferenceType;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorPreference;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/grade")
public class GradeController {
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final TimeslotRepository timeslotRepository;
    private final DemandRepository demandRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public GradeController(
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        TimeslotRepository timeslotRepository,
        DemandRepository demandRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.timeslotRepository = timeslotRepository;
        this.demandRepository = demandRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @GetMapping("/{classGroupId}")
    public List<GradeEntryResponse> list(@PathVariable Long classGroupId) {
        return scheduleEntryRepository.findByClassGroupId(classGroupId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(this::toResponse)
            .toList();
    }

    @GetMapping("/todas")
    public Map<String, ClassGradeResponse> listAll() {
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

    @GetMapping("/professor/{professorId}")
    public List<ProfessorGradeEntryResponse> listByProfessor(@PathVariable Long professorId) {
        return scheduleEntryRepository.findByProfessorsId(professorId).stream()
            .sorted(Comparator.comparing((ScheduleEntry entry) -> entry.getTimeslot().getDayOfWeek())
                .thenComparing(entry -> entry.getTimeslot().getStartTime()))
            .map(this::toProfessorEntryResponse)
            .toList();
    }

    @GetMapping("/professores")
    public Map<String, ProfessorGradeResponse> listAllProfessors() {
        List<Professor> allProfessors = professorRepository.findAllByOrderByNameAsc();
        List<ScheduleEntry> allEntries = scheduleEntryRepository.findAll();

        Map<Long, List<ScheduleEntry>> entriesByProfId = new LinkedHashMap<>();
        for (ScheduleEntry entry : allEntries) {
            for (Professor prof : entry.getProfessors()) {
                entriesByProfId.computeIfAbsent(prof.getId(), k -> new ArrayList<>()).add(entry);
            }
        }

        Map<String, ProfessorGradeResponse> result = new LinkedHashMap<>();
        for (Professor prof : allProfessors) {
            List<ScheduleEntry> profEntries = entriesByProfId.getOrDefault(prof.getId(), List.of());
            if (profEntries.isEmpty()) {
                continue;
            }
            List<ProfessorGradeEntryResponse> sorted = profEntries.stream()
                .sorted(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                    .thenComparing(e -> e.getTimeslot().getStartTime()))
                .map(this::toProfessorEntryResponse)
                .toList();
            result.put(prof.getName(), new ProfessorGradeResponse(prof.getId(), prof.getName(), sorted));
        }

        return result;
    }

    @PostMapping("/mover")
    @Transactional
    public MoveGradeEntryResponse moveOrSwapEntry(@Valid @RequestBody MoveGradeEntryRequest request) {
        ClassGroup classGroup = classGroupRepository.findById(request.classGroupId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Turma nao encontrada"));

        List<Timeslot> shiftSlots = timeslotRepository.findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(classGroup.getShiftType());
        Timeslot fromSlot = shiftSlots.stream()
            .filter(t -> t.getDayOfWeek() == request.fromDay() && t.getStartTime().equals(request.fromStartTime()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot de origem nao encontrado para o turno da turma"));

        Timeslot toSlot = shiftSlots.stream()
            .filter(t -> t.getDayOfWeek() == request.toDay() && t.getStartTime().equals(request.toStartTime()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot de destino nao encontrado para o turno da turma"));

        if (fromSlot.getId().equals(toSlot.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de origem e destino sao iguais");
        }

        ScheduleEntry sourceEntry = scheduleEntryRepository.findByClassGroupIdAndTimeslotId(classGroup.getId(), fromSlot.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nenhuma aula alocada no horario de origem"));

        ScheduleEntry targetEntry = scheduleEntryRepository.findByClassGroupIdAndTimeslotId(classGroup.getId(), toSlot.getId())
            .orElse(null);

        if (!request.force()) {
            List<ScheduleEntry> allEntries = scheduleEntryRepository.findAll();
            List<ProfessorUnavailability> allUnavail = unavailabilityRepository.findAll();

            Long ignoreSourceId = sourceEntry.getId();
            Long ignoreTargetId = targetEntry != null ? targetEntry.getId() : -1L;

            validatePlacement(sourceEntry, toSlot, allEntries, allUnavail, ignoreSourceId, ignoreTargetId);
            if (targetEntry != null) {
                validatePlacement(targetEntry, fromSlot, allEntries, allUnavail, ignoreSourceId, ignoreTargetId);
            }
        }

        sourceEntry.setTimeslot(toSlot);
        scheduleEntryRepository.save(sourceEntry);

        boolean swapped = false;
        if (targetEntry != null) {
            targetEntry.setTimeslot(fromSlot);
            scheduleEntryRepository.save(targetEntry);
            swapped = true;
        }

        String msg = swapped
            ? String.format("Aulas trocadas com sucesso: %s <-> %s", sourceEntry.getSubject().getName(), targetEntry.getSubject().getName())
            : String.format("Aula de %s movida com sucesso", sourceEntry.getSubject().getName());

        return new MoveGradeEntryResponse(swapped, msg);
    }

    private void validatePlacement(
        ScheduleEntry entryToPlace,
        Timeslot targetSlot,
        List<ScheduleEntry> allEntries,
        List<ProfessorUnavailability> allUnavail,
        Long ignoreId1,
        Long ignoreId2
    ) {
        for (Professor prof : entryToPlace.getProfessors()) {
            for (ProfessorUnavailability u : allUnavail) {
                if (u.getProfessor().getId().equals(prof.getId())) {
                    boolean sameDay = u.getDayOfWeek() == 0 || u.getDayOfWeek() == targetSlot.getDayOfWeek();
                    if (sameDay && u.getStartTime().isBefore(targetSlot.getEndTime()) && u.getEndTime().isAfter(targetSlot.getStartTime())) {
                        throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            String.format("Professor %s possui restricao de indisponibilidade neste horario (%s-%s)",
                                prof.getName(), u.getStartTime(), u.getEndTime())
                        );
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
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        String.format("Conflito: Professor %s ja leciona %s na turma %s neste horario (%s-%s)",
                            prof.getName(), other.getSubject().getName(), other.getClassGroup().getName(),
                            otherSlot.getStartTime(), otherSlot.getEndTime())
                    );
                }
            }
        }
    }

    @GetMapping("/auditoria")
    public GradeAuditResponse auditGrades() {
        List<Demand> allDemands = demandRepository.findAll();
        List<ScheduleEntry> allEntries = scheduleEntryRepository.findAll();
        List<Professor> allProfessors = professorRepository.findAllByOrderByNameAsc();
        List<ProfessorUnavailability> allUnavail = unavailabilityRepository.findAll();
        List<ProfessorPreference> allPrefs = preferenceRepository.findAll();

        int totalDemanded = allDemands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
        int totalScheduled = allEntries.size();

        Map<Long, Long> scheduledBySubjectId = allEntries.stream()
            .collect(Collectors.groupingBy(e -> e.getSubject().getId(), Collectors.counting()));

        List<MissingDemandItem> missingDemands = new ArrayList<>();
        for (Demand d : allDemands) {
            int allocated = scheduledBySubjectId.getOrDefault(d.getSubject().getId(), 0L).intValue();
            if (allocated < d.getQuantityPerWeek()) {
                missingDemands.add(new MissingDemandItem(
                    d.getSubject().getName(),
                    d.getSubject().getClassGroup().getName(),
                    d.getQuantityPerWeek(),
                    allocated,
                    d.getQuantityPerWeek() - allocated
                ));
            }
        }

        List<String> professorConflicts = new ArrayList<>();
        List<String> unavailabilityViolations = new ArrayList<>();

        Map<Long, List<ScheduleEntry>> entriesByProf = new HashMap<>();
        for (ScheduleEntry entry : allEntries) {
            for (Professor prof : entry.getProfessors()) {
                entriesByProf.computeIfAbsent(prof.getId(), k -> new ArrayList<>()).add(entry);
            }
        }

        Map<Long, List<ProfessorPreference>> prefsByProf = allPrefs.stream()
            .collect(Collectors.groupingBy(p -> p.getProfessor().getId()));
        Map<Long, List<ProfessorUnavailability>> unavailByProf = allUnavail.stream()
            .collect(Collectors.groupingBy(u -> u.getProfessor().getId()));

        List<ProfessorStatItem> professorStats = new ArrayList<>();
        int totalWindows = 0;

        for (Professor prof : allProfessors) {
            List<ScheduleEntry> profEntries = new ArrayList<>(entriesByProf.getOrDefault(prof.getId(), List.of()));
            profEntries.sort(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                .thenComparing(e -> e.getTimeslot().getStartTime()));

            for (int i = 0; i < profEntries.size(); i++) {
                ScheduleEntry a = profEntries.get(i);
                Timeslot ta = a.getTimeslot();

                for (ProfessorUnavailability u : unavailByProf.getOrDefault(prof.getId(), List.of())) {
                    boolean sameDay = u.getDayOfWeek() == 0 || u.getDayOfWeek() == ta.getDayOfWeek();
                    if (sameDay && u.getStartTime().isBefore(ta.getEndTime()) && u.getEndTime().isAfter(ta.getStartTime())) {
                        unavailabilityViolations.add(String.format(
                            "%s alocado em %s (%s) dia %d %s-%s durante restricao",
                            prof.getName(), a.getClassGroup().getName(), a.getSubject().getName(),
                            ta.getDayOfWeek(), ta.getStartTime(), ta.getEndTime()
                        ));
                    }
                }

                for (int j = i + 1; j < profEntries.size(); j++) {
                    ScheduleEntry b = profEntries.get(j);
                    Timeslot tb = b.getTimeslot();
                    if (ta.getDayOfWeek() == tb.getDayOfWeek()
                            && ta.getStartTime().isBefore(tb.getEndTime())
                            && ta.getEndTime().isAfter(tb.getStartTime())) {
                        professorConflicts.add(String.format(
                            "%s alocado simultaneamente em %s (%s) e %s (%s) no dia %d (%s-%s)",
                            prof.getName(), a.getClassGroup().getName(), a.getSubject().getName(),
                            b.getClassGroup().getName(), b.getSubject().getName(),
                            ta.getDayOfWeek(), ta.getStartTime(), ta.getEndTime()
                        ));
                    }
                }
            }

            Set<Long> distinctClasses = new HashSet<>();
            Map<Integer, List<ScheduleEntry>> byDay = new HashMap<>();
            for (ScheduleEntry e : profEntries) {
                distinctClasses.add(e.getClassGroup().getId());
                byDay.computeIfAbsent(e.getTimeslot().getDayOfWeek(), k -> new ArrayList<>()).add(e);
            }

            int windows = 0;
            for (List<ScheduleEntry> dayList : byDay.values()) {
                dayList.sort(Comparator.comparing(e -> e.getTimeslot().getStartTime()));
                for (int k = 0; k < dayList.size() - 1; k++) {
                    LocalTime endCurrent = dayList.get(k).getTimeslot().getEndTime();
                    LocalTime startNext = dayList.get(k + 1).getTimeslot().getStartTime();
                    long gapMinutes = java.time.Duration.between(endCurrent, startNext).toMinutes();
                    // Intervalos de recreio (20 min) ou almoco (60 min entre 12:30 e 13:30) nao sao janelas ociosas de aula
                    if (gapMinutes >= 45 && !(endCurrent.equals(LocalTime.of(12, 30)) && startNext.equals(LocalTime.of(13, 30)))) {
                        windows += (int) (gapMinutes / 50);
                    }
                }
            }
            totalWindows += windows;

            List<ProfessorPreference> profPrefs = prefsByProf.getOrDefault(prof.getId(), List.of());
            int matchedPrefs = 0;
            for (ProfessorPreference pref : profPrefs) {
                boolean satisfied = evaluatePreference(pref, profEntries);
                if (satisfied) {
                    matchedPrefs++;
                }
            }

            professorStats.add(new ProfessorStatItem(
                prof.getId(),
                prof.getName(),
                profEntries.size(),
                distinctClasses.size(),
                byDay.size(),
                windows,
                matchedPrefs,
                profPrefs.size()
            ));
        }

        int score = 100;
        if (totalDemanded > 0) {
            int missing = Math.max(0, totalDemanded - totalScheduled);
            score -= Math.min(50, (int) Math.round((double) missing / totalDemanded * 60));
        } else if (totalScheduled == 0) {
            score = 0;
        }
        score -= professorConflicts.size() * 15;
        score -= unavailabilityViolations.size() * 15;
        score -= Math.min(20, totalWindows);
        score = Math.max(0, Math.min(100, score));

        return new GradeAuditResponse(
            totalDemanded,
            totalScheduled,
            score,
            totalWindows,
            missingDemands,
            professorConflicts,
            unavailabilityViolations,
            professorStats
        );
    }

    private boolean evaluatePreference(ProfessorPreference pref, List<ScheduleEntry> profEntries) {
        if (pref.getType() == PreferenceType.PREFERRED) {
            return profEntries.stream().anyMatch(e -> matchesPreferenceSlot(pref, e.getTimeslot()));
        } else {
            return profEntries.stream().noneMatch(e -> matchesPreferenceSlot(pref, e.getTimeslot()));
        }
    }

    private boolean matchesPreferenceSlot(ProfessorPreference pref, Timeslot slot) {
        boolean dayMatches = pref.getDayOfWeek() == 0 || pref.getDayOfWeek() == slot.getDayOfWeek();
        if (!dayMatches) {
            return false;
        }
        if (pref.getStartTime() == null || pref.getEndTime() == null) {
            return true;
        }
        return pref.getStartTime().isBefore(slot.getEndTime()) && pref.getEndTime().isAfter(slot.getStartTime());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void clearAllGrades() {
        scheduleEntryRepository.deleteAll();
    }

    private GradeEntryResponse toResponse(ScheduleEntry entry) {
        return new GradeEntryResponse(
            entry.getTimeslot().getDayOfWeek(),
            entry.getTimeslot().getStartTime().toString(),
            entry.getTimeslot().getEndTime().toString(),
            entry.getSubject().getName(),
            entry.getProfessors().stream().map(Professor::getName).sorted().collect(Collectors.toList())
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
            entry.getProfessors().stream().map(Professor::getName).sorted().collect(Collectors.toList())
        );
    }

    public record GradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        List<String> professors
    ) {}

    public record ClassGradeResponse(
        Long id,
        String name,
        String shiftType,
        List<GradeEntryResponse> entries
    ) {}

    public record ProfessorGradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        String classGroup,
        String shiftType,
        List<String> professors
    ) {}

    public record ProfessorGradeResponse(
        Long id,
        String name,
        List<ProfessorGradeEntryResponse> entries
    ) {}

    public record MoveGradeEntryRequest(
        @NotNull @Positive Long classGroupId,
        @Min(1) @Max(7) int fromDay,
        @NotNull LocalTime fromStartTime,
        @Min(1) @Max(7) int toDay,
        @NotNull LocalTime toStartTime,
        boolean force
    ) {}

    public record MoveGradeEntryResponse(
        boolean swapped,
        String message
    ) {}

    public record MissingDemandItem(
        String subject,
        String classGroup,
        int demanded,
        int scheduled,
        int missing
    ) {}

    public record ProfessorStatItem(
        Long professorId,
        String professorName,
        int totalLessons,
        int classGroupsCount,
        int activeDays,
        int windowCount,
        int preferencesMatched,
        int preferencesTotal
    ) {}

    public record GradeAuditResponse(
        int totalDemandedLessons,
        int totalScheduledLessons,
        int qualityScore,
        int totalWindows,
        List<MissingDemandItem> missingDemands,
        List<String> professorConflicts,
        List<String> unavailabilityViolations,
        List<ProfessorStatItem> professorStats
    ) {}
}
