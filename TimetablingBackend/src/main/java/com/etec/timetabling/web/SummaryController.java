package com.etec.timetabling.web;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.PreferenceType;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorPreference;
import com.etec.timetabling.domain.ProfessorUnavailability;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.AvailabilityRepository;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.LessonRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.SubjectRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import java.time.Instant;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class SummaryController {
    private final TimeslotRepository timeslotRepository;
    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;
    private final AvailabilityRepository availabilityRepository;
    private final SolverController solverController;

    public SummaryController(
        TimeslotRepository timeslotRepository,
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        SubjectRepository subjectRepository,
        LessonRepository lessonRepository,
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorPreferenceRepository preferenceRepository,
        AvailabilityRepository availabilityRepository,
        SolverController solverController
    ) {
        this.timeslotRepository = timeslotRepository;
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.subjectRepository = subjectRepository;
        this.lessonRepository = lessonRepository;
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
        this.availabilityRepository = availabilityRepository;
        this.solverController = solverController;
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("ok", Instant.now().toString());
    }

    @GetMapping("/summary")
    public SummaryResponse summary() {
        return new SummaryResponse(
            timeslotRepository.count(),
            professorRepository.count(),
            classGroupRepository.count(),
            subjectRepository.count(),
            lessonRepository.count(),
            demandRepository.count(),
            scheduleEntryRepository.count(),
            unavailabilityRepository.count(),
            preferenceRepository.count()
        );
    }

    @DeleteMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void resetAll() {
        if (solverController.isRunning()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nao e possivel limpar os dados enquanto o solver esta em execucao");
        }
        clearDatabaseInternal();
    }

    private void clearDatabaseInternal() {
        scheduleEntryRepository.deleteAll();
        lessonRepository.deleteAll();
        availabilityRepository.deleteAll();
        demandRepository.deleteAll();
        preferenceRepository.deleteAll();
        unavailabilityRepository.deleteAll();
        subjectRepository.deleteAll();
        timeslotRepository.deleteAll();
        classGroupRepository.deleteAll();
        professorRepository.deleteAll();
        professorRepository.flush();
    }

    @GetMapping("/backup")
    public BackupPayload exportBackup() {
        List<String> professors = professorRepository.findAllByOrderByNameAsc().stream()
            .map(Professor::getName)
            .toList();

        List<ClassGroupBackup> classGroups = classGroupRepository.findAllByOrderByNameAsc().stream()
            .map(cg -> new ClassGroupBackup(cg.getName(), cg.getShiftType().name()))
            .toList();

        List<TimeslotBackup> timeslots = timeslotRepository.findAllByOrderByShiftTypeAscDayOfWeekAscStartTimeAsc().stream()
            .map(t -> new TimeslotBackup(t.getDayOfWeek(), t.getStartTime().toString(), t.getEndTime().toString(), t.getShiftType().name()))
            .toList();

        List<SubjectBackup> subjects = subjectRepository.findAll().stream()
            .map(s -> new SubjectBackup(s.getName(), s.getClassGroup().getName()))
            .toList();

        List<DemandBackup> demands = demandRepository.findAll().stream()
            .map(d -> new DemandBackup(
                d.getSubject().getName(),
                d.getSubject().getClassGroup().getName(),
                d.getProfessors().stream().map(Professor::getName).sorted().toList(),
                d.getQuantityPerWeek(),
                d.isAllowDoubleLesson()
            ))
            .toList();

        List<UnavailabilityBackup> unavailabilities = unavailabilityRepository.findAll().stream()
            .map(u -> new UnavailabilityBackup(
                u.getProfessor().getName(),
                u.getDayOfWeek(),
                u.getStartTime().toString(),
                u.getEndTime().toString()
            ))
            .toList();

        List<PreferenceBackup> preferences = preferenceRepository.findAll().stream()
            .map(p -> new PreferenceBackup(
                p.getProfessor().getName(),
                p.getSubject() != null ? p.getSubject().getName() : null,
                p.getSubject() != null ? p.getSubject().getClassGroup().getName() : null,
                p.getDayOfWeek(),
                p.getStartTime() != null ? p.getStartTime().toString() : null,
                p.getEndTime() != null ? p.getEndTime().toString() : null,
                p.getWeight(),
                p.getType().name()
            ))
            .toList();

        List<ScheduleEntryBackup> scheduleEntries = scheduleEntryRepository.findAll().stream()
            .map(e -> new ScheduleEntryBackup(
                e.getClassGroup().getName(),
                e.getSubject().getName(),
                e.getTimeslot().getDayOfWeek(),
                e.getTimeslot().getStartTime().toString(),
                e.getTimeslot().getEndTime().toString(),
                e.getTimeslot().getShiftType().name(),
                e.getProfessors().stream().map(Professor::getName).sorted().toList()
            ))
            .toList();

        return new BackupPayload(
            Instant.now().toString(),
            professors,
            classGroups,
            timeslots,
            subjects,
            demands,
            unavailabilities,
            preferences,
            scheduleEntries
        );
    }

    @PostMapping("/backup")
    @Transactional
    public SummaryResponse importBackup(@RequestBody BackupPayload backup) {
        if (solverController.isRunning()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nao e possivel restaurar backup enquanto o solver esta em execucao");
        }
        if (backup == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload de backup invalido");
        }

        clearDatabaseInternal();

        Map<String, Professor> profByName = new HashMap<>();
        if (backup.professors() != null) {
            for (String pName : backup.professors()) {
                if (pName == null || pName.isBlank()) continue;
                String clean = pName.trim();
                if (profByName.containsKey(clean.toUpperCase())) continue;
                Professor p = new Professor();
                p.setName(clean);
                profByName.put(clean.toUpperCase(), professorRepository.save(p));
            }
        }

        Map<String, ClassGroup> classByName = new HashMap<>();
        if (backup.classGroups() != null) {
            for (ClassGroupBackup cgDto : backup.classGroups()) {
                if (cgDto == null || cgDto.name() == null || cgDto.name().isBlank()) continue;
                String clean = cgDto.name().trim();
                if (classByName.containsKey(clean.toUpperCase())) continue;
                ClassGroup cg = new ClassGroup();
                cg.setName(clean);
                cg.setShiftType(ShiftType.valueOf(cgDto.shiftType().trim().toUpperCase()));
                classByName.put(clean.toUpperCase(), classGroupRepository.save(cg));
            }
        }

        Map<String, Timeslot> slotByKey = new HashMap<>();
        if (backup.timeslots() != null) {
            for (TimeslotBackup tsDto : backup.timeslots()) {
                if (tsDto == null) continue;
                LocalTime st = LocalTime.parse(tsDto.startTime());
                LocalTime et = LocalTime.parse(tsDto.endTime());
                ShiftType shift = ShiftType.valueOf(tsDto.shiftType().trim().toUpperCase());
                String key = tsDto.dayOfWeek() + "|" + st + "|" + et + "|" + shift;
                if (slotByKey.containsKey(key)) continue;
                Timeslot ts = new Timeslot();
                ts.setDayOfWeek(tsDto.dayOfWeek());
                ts.setStartTime(st);
                ts.setEndTime(et);
                ts.setShiftType(shift);
                slotByKey.put(key, timeslotRepository.save(ts));
            }
        }

        Map<String, Subject> subjectByKey = new HashMap<>();
        if (backup.subjects() != null) {
            for (SubjectBackup sDto : backup.subjects()) {
                if (sDto == null || sDto.name() == null || sDto.classGroupName() == null) continue;
                ClassGroup cg = classByName.get(sDto.classGroupName().trim().toUpperCase());
                if (cg == null) continue;
                String key = cg.getName().toUpperCase() + "|" + sDto.name().trim().toUpperCase();
                if (subjectByKey.containsKey(key)) continue;
                Subject s = new Subject();
                s.setName(sDto.name().trim());
                s.setClassGroup(cg);
                s.setDoubleLessonAllowed(false);
                subjectByKey.put(key, subjectRepository.save(s));
            }
        }

        if (backup.demands() != null) {
            for (DemandBackup dDto : backup.demands()) {
                if (dDto == null || dDto.subjectName() == null || dDto.classGroupName() == null) continue;
                String key = dDto.classGroupName().trim().toUpperCase() + "|" + dDto.subjectName().trim().toUpperCase();
                Subject s = subjectByKey.get(key);
                if (s == null) continue;
                Set<Professor> profs = new HashSet<>();
                if (dDto.professors() != null) {
                    for (String pn : dDto.professors()) {
                        Professor p = profByName.get(pn.trim().toUpperCase());
                        if (p != null) profs.add(p);
                    }
                }
                if (profs.isEmpty()) continue;
                Demand d = new Demand();
                d.setSubject(s);
                d.setQuantityPerWeek(Math.max(1, Math.min(40, dDto.quantityPerWeek())));
                d.setAllowDoubleLesson(dDto.allowDoubleLesson());
                d.setProfessors(profs);
                demandRepository.save(d);
            }
        }

        if (backup.unavailabilities() != null) {
            for (UnavailabilityBackup uDto : backup.unavailabilities()) {
                if (uDto == null || uDto.professorName() == null) continue;
                Professor p = profByName.get(uDto.professorName().trim().toUpperCase());
                if (p == null) continue;
                ProfessorUnavailability u = new ProfessorUnavailability();
                u.setProfessor(p);
                u.setDayOfWeek(uDto.dayOfWeek());
                u.setStartTime(LocalTime.parse(uDto.startTime()));
                u.setEndTime(LocalTime.parse(uDto.endTime()));
                unavailabilityRepository.save(u);
            }
        }

        if (backup.preferences() != null) {
            for (PreferenceBackup pDto : backup.preferences()) {
                if (pDto == null || pDto.professorName() == null) continue;
                Professor p = profByName.get(pDto.professorName().trim().toUpperCase());
                if (p == null) continue;
                ProfessorPreference pref = new ProfessorPreference();
                pref.setProfessor(p);
                pref.setDayOfWeek(pDto.dayOfWeek());
                pref.setWeight(Math.max(1, Math.min(10, pDto.weight())));
                pref.setType(PreferenceType.valueOf(pDto.type().trim().toUpperCase()));
                if (pDto.subjectName() != null && pDto.classGroupName() != null) {
                    String sKey = pDto.classGroupName().trim().toUpperCase() + "|" + pDto.subjectName().trim().toUpperCase();
                    pref.setSubject(subjectByKey.get(sKey));
                }
                if (pDto.startTime() != null && !pDto.startTime().isBlank()) {
                    pref.setStartTime(LocalTime.parse(pDto.startTime()));
                }
                if (pDto.endTime() != null && !pDto.endTime().isBlank()) {
                    pref.setEndTime(LocalTime.parse(pDto.endTime()));
                }
                preferenceRepository.save(pref);
            }
        }

        if (backup.scheduleEntries() != null) {
            for (ScheduleEntryBackup eDto : backup.scheduleEntries()) {
                if (eDto == null || eDto.classGroupName() == null || eDto.subjectName() == null) continue;
                ClassGroup cg = classByName.get(eDto.classGroupName().trim().toUpperCase());
                String sKey = eDto.classGroupName().trim().toUpperCase() + "|" + eDto.subjectName().trim().toUpperCase();
                Subject s = subjectByKey.get(sKey);
                LocalTime st = LocalTime.parse(eDto.startTime());
                LocalTime et = LocalTime.parse(eDto.endTime());
                ShiftType shift = ShiftType.valueOf(eDto.shiftType().trim().toUpperCase());
                String tsKey = eDto.dayOfWeek() + "|" + st + "|" + et + "|" + shift;
                Timeslot ts = slotByKey.get(tsKey);
                if (cg == null || s == null || ts == null) continue;

                Set<Professor> profs = new HashSet<>();
                if (eDto.professors() != null) {
                    for (String pn : eDto.professors()) {
                        Professor p = profByName.get(pn.trim().toUpperCase());
                        if (p != null) profs.add(p);
                    }
                }
                ScheduleEntry entry = new ScheduleEntry();
                entry.setClassGroup(cg);
                entry.setSubject(s);
                entry.setTimeslot(ts);
                entry.setProfessors(profs);
                scheduleEntryRepository.save(entry);
            }
        }

        return summary();
    }

    public record HealthResponse(String status, String timestamp) {
    }

    public record SummaryResponse(
        long timeslots,
        long professors,
        long classGroups,
        long subjects,
        long lessons,
        long demands,
        long scheduleEntries,
        long unavailabilities,
        long preferences
    ) {
    }

    public record ClassGroupBackup(String name, String shiftType) {}
    public record TimeslotBackup(int dayOfWeek, String startTime, String endTime, String shiftType) {}
    public record SubjectBackup(String name, String classGroupName) {}
    public record DemandBackup(String subjectName, String classGroupName, List<String> professors, int quantityPerWeek, boolean allowDoubleLesson) {}
    public record UnavailabilityBackup(String professorName, int dayOfWeek, String startTime, String endTime) {}
    public record PreferenceBackup(String professorName, String subjectName, String classGroupName, int dayOfWeek, String startTime, String endTime, int weight, String type) {}
    public record ScheduleEntryBackup(String classGroupName, String subjectName, int dayOfWeek, String startTime, String endTime, String shiftType, List<String> professors) {}

    public record BackupPayload(
        String exportedAt,
        List<String> professors,
        List<ClassGroupBackup> classGroups,
        List<TimeslotBackup> timeslots,
        List<SubjectBackup> subjects,
        List<DemandBackup> demands,
        List<UnavailabilityBackup> unavailabilities,
        List<PreferenceBackup> preferences,
        List<ScheduleEntryBackup> scheduleEntries
    ) {}
}
