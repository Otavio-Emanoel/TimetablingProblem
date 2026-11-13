package com.etec.timetabling.service;

import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.PreferenceType;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorPreference;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.web.GradeController.GradeAuditResponse;
import com.etec.timetabling.web.GradeController.MissingDemandItem;
import com.etec.timetabling.web.GradeController.ProfessorStatItem;
import java.time.Duration;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serviço responsável por auditar a qualidade, restrições rígidas e cobertura de demandas
 * da grade horária gerada.
 */
@Service
public class GradeAuditService {

    private static final LocalTime LUNCH_START = LocalTime.of(12, 30);
    private static final LocalTime LUNCH_END = LocalTime.of(13, 30);

    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorRepository professorRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public GradeAuditService(
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorRepository professorRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.professorRepository = professorRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @Transactional(readOnly = true)
    public GradeAuditResponse auditGrades() {
        List<Demand> allDemands = demandRepository.findAll();
        List<ScheduleEntry> allEntries = scheduleEntryRepository.findAll();
        List<Professor> allProfessors = professorRepository.findAllByOrderByNameAsc();
        List<ProfessorUnavailability> allUnavail = unavailabilityRepository.findAll();
        List<ProfessorPreference> allPrefs = preferenceRepository.findAll();

        int totalDemanded = allDemands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
        int totalScheduled = allEntries.size();

        List<MissingDemandItem> missingDemands = collectMissingDemands(allDemands, allEntries);

        Map<Long, List<ScheduleEntry>> entriesByProf = indexEntriesByProfessor(allEntries);
        Map<Long, List<ProfessorPreference>> prefsByProf = allPrefs.stream()
            .collect(Collectors.groupingBy(p -> p.getProfessor().getId()));
        Map<Long, List<ProfessorUnavailability>> unavailByProf = allUnavail.stream()
            .collect(Collectors.groupingBy(u -> u.getProfessor().getId()));

        List<String> professorConflicts = new ArrayList<>();
        List<String> unavailabilityViolations = new ArrayList<>();
        List<ProfessorStatItem> professorStats = new ArrayList<>();
        int totalWindows = 0;

        for (Professor prof : allProfessors) {
            List<ScheduleEntry> profEntries = new ArrayList<>(entriesByProf.getOrDefault(prof.getId(), List.of()));
            profEntries.sort(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                .thenComparing(e -> e.getTimeslot().getStartTime()));

            detectProfessorIssues(
                prof,
                profEntries,
                unavailByProf.getOrDefault(prof.getId(), List.of()),
                unavailabilityViolations,
                professorConflicts
            );

            int windows = countProfessorWindows(profEntries);
            totalWindows += windows;

            List<ProfessorPreference> profPrefs = prefsByProf.getOrDefault(prof.getId(), List.of());
            int matchedPrefs = (int) profPrefs.stream()
                .filter(pref -> evaluatePreference(pref, profEntries))
                .count();

            int distinctClasses = (int) profEntries.stream()
                .map(e -> e.getClassGroup().getId())
                .distinct()
                .count();
            int activeDays = (int) profEntries.stream()
                .map(e -> e.getTimeslot().getDayOfWeek())
                .distinct()
                .count();

            professorStats.add(new ProfessorStatItem(
                prof.getId(),
                prof.getName(),
                profEntries.size(),
                distinctClasses,
                activeDays,
                windows,
                matchedPrefs,
                profPrefs.size()
            ));
        }

        int score = calculateQualityScore(
            totalDemanded,
            totalScheduled,
            professorConflicts.size(),
            unavailabilityViolations.size(),
            totalWindows
        );

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

    private List<MissingDemandItem> collectMissingDemands(List<Demand> demands, List<ScheduleEntry> entries) {
        Map<Long, Long> scheduledBySubjectId = entries.stream()
            .collect(Collectors.groupingBy(e -> e.getSubject().getId(), Collectors.counting()));

        List<MissingDemandItem> missingDemands = new ArrayList<>();
        for (Demand d : demands) {
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
        return missingDemands;
    }

    private Map<Long, List<ScheduleEntry>> indexEntriesByProfessor(List<ScheduleEntry> allEntries) {
        Map<Long, List<ScheduleEntry>> entriesByProf = new HashMap<>();
        for (ScheduleEntry entry : allEntries) {
            for (Professor prof : entry.getProfessors()) {
                entriesByProf.computeIfAbsent(prof.getId(), k -> new ArrayList<>()).add(entry);
            }
        }
        return entriesByProf;
    }

    private void detectProfessorIssues(
        Professor prof,
        List<ScheduleEntry> profEntries,
        List<ProfessorUnavailability> unavailabilities,
        List<String> unavailabilityViolations,
        List<String> professorConflicts
    ) {
        for (int i = 0; i < profEntries.size(); i++) {
            ScheduleEntry a = profEntries.get(i);
            Timeslot ta = a.getTimeslot();

            for (ProfessorUnavailability u : unavailabilities) {
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
    }

    private int countProfessorWindows(List<ScheduleEntry> profEntries) {
        Map<Integer, List<ScheduleEntry>> byDay = new HashMap<>();
        for (ScheduleEntry e : profEntries) {
            byDay.computeIfAbsent(e.getTimeslot().getDayOfWeek(), k -> new ArrayList<>()).add(e);
        }

        int windows = 0;
        for (List<ScheduleEntry> dayList : byDay.values()) {
            dayList.sort(Comparator.comparing(e -> e.getTimeslot().getStartTime()));
            for (int k = 0; k < dayList.size() - 1; k++) {
                LocalTime endCurrent = dayList.get(k).getTimeslot().getEndTime();
                LocalTime startNext = dayList.get(k + 1).getTimeslot().getStartTime();
                long gapMinutes = Duration.between(endCurrent, startNext).toMinutes();
                // Intervalos de recreio (20 min) ou almoço (60 min entre 12:30 e 13:30) não são janelas ociosas de aula.
                if (gapMinutes >= 45 && !(endCurrent.equals(LUNCH_START) && startNext.equals(LUNCH_END))) {
                    windows += (int) (gapMinutes / 50);
                }
            }
        }
        return windows;
    }

    private boolean evaluatePreference(ProfessorPreference pref, List<ScheduleEntry> profEntries) {
        if (pref.getType() == PreferenceType.PREFERRED) {
            return profEntries.stream().anyMatch(e -> matchesPreferenceSlot(pref, e.getTimeslot()));
        }
        return profEntries.stream().noneMatch(e -> matchesPreferenceSlot(pref, e.getTimeslot()));
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

    private int calculateQualityScore(
        int totalDemanded,
        int totalScheduled,
        int conflictsCount,
        int violationsCount,
        int totalWindows
    ) {
        int score = 100;
        if (totalDemanded > 0) {
            int missing = Math.max(0, totalDemanded - totalScheduled);
            score -= Math.min(50, (int) Math.round((double) missing / totalDemanded * 60));
        } else if (totalScheduled == 0) {
            score = 0;
        }
        score -= conflictsCount * 15;
        score -= violationsCount * 15;
        score -= Math.min(20, totalWindows);
        return Math.max(0, Math.min(100, score));
    }
}

