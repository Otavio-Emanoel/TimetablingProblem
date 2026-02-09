package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class SolverService {
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final TimeslotRepository timeslotRepository;

    public SolverService(
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        TimeslotRepository timeslotRepository
    ) {
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.timeslotRepository = timeslotRepository;
    }

    public SolverResult solve() {
        scheduleEntryRepository.deleteAll();

        Map<Long, Set<Long>> professorBusy = new HashMap<>();
        Map<Long, Set<Long>> classGroupBusy = new HashMap<>();

        int scheduled = 0;
        int unscheduled = 0;

        List<Demand> demands = demandRepository.findAll();
        for (Demand demand : demands) {
            ClassGroup classGroup = demand.getSubject().getClassGroup();
            List<Professor> professors = demand.getProfessors().stream().toList();
            List<Timeslot> timeslots = timeslotRepository
                .findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(classGroup.getShiftType());

            for (int i = 0; i < demand.getQuantityPerWeek(); i++) {
                Timeslot timeslot = findAvailableSlot(timeslots, classGroup, professors, professorBusy, classGroupBusy);
                if (timeslot == null) {
                    unscheduled++;
                    continue;
                }

                ScheduleEntry entry = new ScheduleEntry();
                entry.setTimeslot(timeslot);
                entry.setClassGroup(classGroup);
                entry.setSubject(demand.getSubject());
                entry.setProfessors(new HashSet<>(professors));
                scheduleEntryRepository.save(entry);

                Long key = timeslot.getId();
                classGroupBusy.computeIfAbsent(classGroup.getId(), ignored -> new HashSet<>()).add(key);
                for (Professor professor : professors) {
                    professorBusy.computeIfAbsent(professor.getId(), ignored -> new HashSet<>()).add(key);
                }
                scheduled++;
            }
        }

        return new SolverResult(scheduled, unscheduled);
    }

    private Timeslot findAvailableSlot(
        List<Timeslot> timeslots,
        ClassGroup classGroup,
        List<Professor> professors,
        Map<Long, Set<Long>> professorBusy,
        Map<Long, Set<Long>> classGroupBusy
    ) {
        for (Timeslot timeslot : timeslots) {
            Long key = timeslot.getId();

            if (classGroupBusy.getOrDefault(classGroup.getId(), Set.of()).contains(key)) {
                continue;
            }

            boolean conflict = false;
            for (Professor professor : professors) {
                if (professorBusy.getOrDefault(professor.getId(), Set.of()).contains(key)) {
                    conflict = true;
                    break;
                }
            }

            if (!conflict) {
                return timeslot;
            }
        }

        return null;
    }

    public record SolverResult(int scheduled, int unscheduled) {
    }
}
