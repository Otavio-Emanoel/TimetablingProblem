package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorPreference;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.SubjectRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serviço de inteligência e diagnósticos analíticos sobre carga docente,
 * capacidade por turma, distribuição por área e matriz de disponibilidade semanal.
 */
@Service
public class AnalyticsService {

    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final SubjectRepository subjectRepository;
    private final DemandRepository demandRepository;
    private final TimeslotRepository timeslotRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public AnalyticsService(
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        SubjectRepository subjectRepository,
        DemandRepository demandRepository,
        TimeslotRepository timeslotRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.subjectRepository = subjectRepository;
        this.demandRepository = demandRepository;
        this.timeslotRepository = timeslotRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
    }

    public record SchoolOverviewReport(
        long totalProfessors,
        long totalClassGroups,
        long totalSubjects,
        long totalDemands,
        long totalTimeslots,
        int totalDemandedLessons,
        int totalAllocatedLessons,
        double coveragePercent,
        int totalWeeklySlotCapacity,
        double capacityUtilizationPercent,
        int coTeachingDemandsCount,
        int doubleLessonDemandsCount,
        int highWorkloadProfessorsCount
    ) {
    }

    public record ProfessorWorkloadReport(
        Long professorId,
        String professorName,
        int demandedLessons,
        int soleLessons,
        int sharedLessons,
        int allocatedLessons,
        int distinctClassesCount,
        int distinctSubjectsCount,
        int unavailabilityCount,
        int preferenceCount,
        String loadStatus
    ) {
    }

    public record ThemeDistributionItem(
        String themeKey,
        String category,
        String legendLabel,
        int subjectsCount,
        int weeklyLessons,
        double sharePercent
    ) {
    }

    public record WeekdayMatrixItem(
        int dayOfWeek,
        String dayName,
        int regularSlotsCount,
        int integralSlotsCount,
        int scheduledEntriesCount,
        int professorBlocksCount
    ) {
    }

    @Transactional(readOnly = true)
    public SchoolOverviewReport getOverview() {
        List<ClassGroup> classGroups = classGroupRepository.findAll();
        List<Demand> demands = demandRepository.findAll();
        List<Timeslot> timeslots = timeslotRepository.findAll();
        List<ScheduleEntry> entries = scheduleEntryRepository.findAll();

        int totalDemandedLessons = demands.stream().mapToInt(Demand::getQuantityPerWeek).sum();
        int totalAllocatedLessons = entries.size();
        double coveragePercent = totalDemandedLessons == 0
            ? 0.0
            : roundOneDecimal((double) totalAllocatedLessons * 100.0 / totalDemandedLessons);

        Map<ShiftType, Long> slotsPerShift = timeslots.stream()
            .collect(Collectors.groupingBy(Timeslot::getShiftType, Collectors.counting()));

        int totalCapacity = 0;
        for (ClassGroup cg : classGroups) {
            totalCapacity += slotsPerShift.getOrDefault(cg.getShiftType(), 0L).intValue();
        }
        double capacityPercent = totalCapacity == 0
            ? 0.0
            : roundOneDecimal((double) totalDemandedLessons * 100.0 / totalCapacity);

        int coTeaching = (int) demands.stream().filter(d -> d.getProfessors().size() > 1).count();
        int doubleLesson = (int) demands.stream().filter(Demand::isAllowDoubleLesson).count();

        Map<Long, Integer> lessonsPerProf = new HashMap<>();
        for (Demand d : demands) {
            for (Professor p : d.getProfessors()) {
                lessonsPerProf.merge(p.getId(), d.getQuantityPerWeek(), Integer::sum);
            }
        }
        int highWorkloadCount = (int) lessonsPerProf.values().stream().filter(load -> load >= 25).count();

        return new SchoolOverviewReport(
            professorRepository.count(),
            classGroups.size(),
            subjectRepository.count(),
            demands.size(),
            timeslots.size(),
            totalDemandedLessons,
            totalAllocatedLessons,
            coveragePercent,
            totalCapacity,
            capacityPercent,
            coTeaching,
            doubleLesson,
            highWorkloadCount
        );
    }

    @Transactional(readOnly = true)
    public List<ProfessorWorkloadReport> getProfessorWorkloads() {
        List<Professor> professors = professorRepository.findAllByOrderByNameAsc();
        List<Demand> demands = demandRepository.findAll();
        List<ScheduleEntry> entries = scheduleEntryRepository.findAll();
        List<ProfessorUnavailability> unavailabilities = unavailabilityRepository.findAll();
        List<ProfessorPreference> preferences = preferenceRepository.findAll();

        Map<Long, List<Demand>> demandsByProf = new HashMap<>();
        for (Demand d : demands) {
            for (Professor p : d.getProfessors()) {
                demandsByProf.computeIfAbsent(p.getId(), k -> new ArrayList<>()).add(d);
            }
        }

        Map<Long, Integer> allocatedByProf = new HashMap<>();
        for (ScheduleEntry e : entries) {
            for (Professor p : e.getProfessors()) {
                allocatedByProf.merge(p.getId(), 1, Integer::sum);
            }
        }

        Map<Long, Long> unavailByProf = unavailabilities.stream()
            .collect(Collectors.groupingBy(u -> u.getProfessor().getId(), Collectors.counting()));
        Map<Long, Long> prefByProf = preferences.stream()
            .collect(Collectors.groupingBy(p -> p.getProfessor().getId(), Collectors.counting()));

        List<ProfessorWorkloadReport> result = new ArrayList<>();
        for (Professor prof : professors) {
            List<Demand> profDemands = demandsByProf.getOrDefault(prof.getId(), List.of());
            int demandedLessons = 0;
            int soleLessons = 0;
            int sharedLessons = 0;
            Set<Long> distinctClasses = new HashSet<>();
            Set<Long> distinctSubjects = new HashSet<>();

            for (Demand d : profDemands) {
                demandedLessons += d.getQuantityPerWeek();
                if (d.getProfessors().size() > 1) {
                    sharedLessons += d.getQuantityPerWeek();
                } else {
                    soleLessons += d.getQuantityPerWeek();
                }
                distinctClasses.add(d.getSubject().getClassGroup().getId());
                distinctSubjects.add(d.getSubject().getId());
            }

            result.add(new ProfessorWorkloadReport(
                prof.getId(),
                prof.getName(),
                demandedLessons,
                soleLessons,
                sharedLessons,
                allocatedByProf.getOrDefault(prof.getId(), 0),
                distinctClasses.size(),
                distinctSubjects.size(),
                unavailByProf.getOrDefault(prof.getId(), 0L).intValue(),
                prefByProf.getOrDefault(prof.getId(), 0L).intValue(),
                classifyWorkloadStatus(demandedLessons)
            ));
        }

        result.sort(Comparator.comparingInt(ProfessorWorkloadReport::demandedLessons).reversed()
            .thenComparing(ProfessorWorkloadReport::professorName));
        return result;
    }

    @Transactional(readOnly = true)
    public List<ThemeDistributionItem> getSubjectThemeDistribution() {
        List<Subject> subjects = subjectRepository.findAll();
        List<Demand> demands = demandRepository.findAll();

        Map<Long, Integer> qtyBySubjectId = demands.stream()
            .collect(Collectors.toMap(
                d -> d.getSubject().getId(),
                Demand::getQuantityPerWeek,
                Integer::sum
            ));

        Map<SubjectAreaTheme, Integer> subjectsPerTheme = new EnumMap<>(SubjectAreaTheme.class);
        Map<SubjectAreaTheme, Integer> lessonsPerTheme = new EnumMap<>(SubjectAreaTheme.class);
        int totalLessons = 0;

        for (Subject subject : subjects) {
            SubjectAreaTheme theme = SubjectAreaTheme.classify(subject.getName());
            subjectsPerTheme.merge(theme, 1, Integer::sum);
            int qty = qtyBySubjectId.getOrDefault(subject.getId(), 0);
            lessonsPerTheme.merge(theme, qty, Integer::sum);
            totalLessons += qty;
        }

        final int totalLessonsRef = totalLessons;
        return SubjectAreaTheme.legendCategories().stream()
            .map(theme -> {
                int subjCount = subjectsPerTheme.getOrDefault(theme, 0);
                int lessonCount = lessonsPerTheme.getOrDefault(theme, 0);
                double share = totalLessonsRef == 0
                    ? 0.0
                    : roundOneDecimal((double) lessonCount * 100.0 / totalLessonsRef);
                return new ThemeDistributionItem(
                    theme.name(),
                    theme.getCategory(),
                    theme.getLegendLabel(),
                    subjCount,
                    lessonCount,
                    share
                );
            })
            .sorted(Comparator.comparingInt(ThemeDistributionItem::weeklyLessons).reversed()
                .thenComparingInt(ThemeDistributionItem::subjectsCount).reversed())
            .toList();
    }

    @Transactional(readOnly = true)
    public List<WeekdayMatrixItem> getWeekdayAvailabilityMatrix() {
        List<Timeslot> timeslots = timeslotRepository.findAll();
        List<ScheduleEntry> entries = scheduleEntryRepository.findAll();
        List<ProfessorUnavailability> unavailabilities = unavailabilityRepository.findAll();

        String[] dayNames = {
            "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"
        };

        List<WeekdayMatrixItem> matrix = new ArrayList<>();
        for (int day = 1; day <= 5; day++) {
            final int currentDay = day;
            int regularCount = (int) timeslots.stream()
                .filter(t -> t.getDayOfWeek() == currentDay && t.getShiftType() == ShiftType.REGULAR)
                .count();
            int integralCount = (int) timeslots.stream()
                .filter(t -> t.getDayOfWeek() == currentDay && t.getShiftType() == ShiftType.INTEGRAL)
                .count();
            int scheduledCount = (int) entries.stream()
                .filter(e -> e.getTimeslot().getDayOfWeek() == currentDay)
                .count();
            int blockCount = (int) unavailabilities.stream()
                .filter(u -> u.getDayOfWeek() == 0 || u.getDayOfWeek() == currentDay)
                .count();

            matrix.add(new WeekdayMatrixItem(
                day,
                dayNames[day - 1],
                regularCount,
                integralCount,
                scheduledCount,
                blockCount
            ));
        }
        return matrix;
    }

    private String classifyWorkloadStatus(int demandedLessons) {
        if (demandedLessons == 0) {
            return "OCIOSO";
        }
        if (demandedLessons <= 12) {
            return "LEVE";
        }
        if (demandedLessons <= 24) {
            return "MODERADA";
        }
        if (demandedLessons <= 32) {
            return "ALTA";
        }
        return "CRITICA";
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}

