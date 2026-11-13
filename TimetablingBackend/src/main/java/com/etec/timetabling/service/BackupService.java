package com.etec.timetabling.service;

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
import com.etec.timetabling.web.SummaryController.BackupPayload;
import com.etec.timetabling.web.SummaryController.ClassGroupBackup;
import com.etec.timetabling.web.SummaryController.DemandBackup;
import com.etec.timetabling.web.SummaryController.PreferenceBackup;
import com.etec.timetabling.web.SummaryController.ScheduleEntryBackup;
import com.etec.timetabling.web.SummaryController.SubjectBackup;
import com.etec.timetabling.web.SummaryController.SummaryResponse;
import com.etec.timetabling.web.SummaryController.TimeslotBackup;
import com.etec.timetabling.web.SummaryController.UnavailabilityBackup;
import java.time.Instant;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Serviço responsável por resumo, reset transacional e backup/restore
 * com validação prévia estrita antes de alterar o banco de dados.
 */
@Service
public class BackupService {

    private final TimeslotRepository timeslotRepository;
    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;
    private final AvailabilityRepository availabilityRepository;
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public BackupService(
        TimeslotRepository timeslotRepository,
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        SubjectRepository subjectRepository,
        LessonRepository lessonRepository,
        AvailabilityRepository availabilityRepository,
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.timeslotRepository = timeslotRepository;
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.subjectRepository = subjectRepository;
        this.lessonRepository = lessonRepository;
        this.availabilityRepository = availabilityRepository;
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @Transactional(readOnly = true)
    public SummaryResponse getSummary() {
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

    @Transactional
    public void resetAll() {
        clearDatabaseInternal();
    }

    @Transactional(readOnly = true)
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

    /**
     * Valida todo o conteúdo do backup antes de limpar ou gravar qualquer dado,
     * impedindo perda de estado em caso de payload malformado.
     */
    @Transactional
    public SummaryResponse importBackup(BackupPayload backup) {
        if (backup == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload de backup invalido");
        }
        validatePayloadBeforeRestore(backup);

        clearDatabaseInternal();

        Map<String, Professor> profByName = restoreProfessors(backup.professors());
        Map<String, ClassGroup> classByName = restoreClassGroups(backup.classGroups());
        Map<String, Timeslot> slotByKey = restoreTimeslots(backup.timeslots());
        Map<String, Subject> subjectByKey = restoreSubjects(backup.subjects(), classByName);
        restoreDemands(backup.demands(), subjectByKey, profByName);
        restoreUnavailabilities(backup.unavailabilities(), profByName);
        restorePreferences(backup.preferences(), profByName, subjectByKey);
        restoreScheduleEntries(backup.scheduleEntries(), classByName, subjectByKey, slotByKey, profByName);

        return getSummary();
    }

    private void validatePayloadBeforeRestore(BackupPayload backup) {
        if (backup.classGroups() != null) {
            for (ClassGroupBackup cg : backup.classGroups()) {
                if (cg == null || cg.name() == null || cg.name().isBlank()) {
                    continue;
                }
                parseShiftType(cg.shiftType(), "Turno invalido na turma " + cg.name());
            }
        }

        if (backup.timeslots() != null) {
            for (TimeslotBackup ts : backup.timeslots()) {
                if (ts == null) {
                    continue;
                }
                validateDayOfWeek(ts.dayOfWeek(), 1, 7, "Dia da semana invalido no timeslot");
                LocalTime st = parseTime(ts.startTime(), "Horario inicial invalido no timeslot");
                LocalTime et = parseTime(ts.endTime(), "Horario final invalido no timeslot");
                if (!st.isBefore(et)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Timeslot com horario inicial >= final");
                }
                parseShiftType(ts.shiftType(), "Turno invalido no timeslot");
            }
        }

        if (backup.demands() != null) {
            for (DemandBackup d : backup.demands()) {
                if (d == null) {
                    continue;
                }
                if (d.quantityPerWeek() < 1 || d.quantityPerWeek() > 40) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "quantityPerWeek deve estar entre 1 e 40 na demanda"
                    );
                }
            }
        }

        if (backup.unavailabilities() != null) {
            for (UnavailabilityBackup u : backup.unavailabilities()) {
                if (u == null || u.professorName() == null) {
                    continue;
                }
                validateDayOfWeek(u.dayOfWeek(), 0, 7, "Dia da semana invalido na indisponibilidade");
                LocalTime st = parseTime(u.startTime(), "Horario inicial invalido na indisponibilidade");
                LocalTime et = parseTime(u.endTime(), "Horario final invalido na indisponibilidade");
                if (!st.isBefore(et)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indisponibilidade com horario inicial >= final");
                }
            }
        }

        if (backup.preferences() != null) {
            for (PreferenceBackup p : backup.preferences()) {
                if (p == null || p.professorName() == null) {
                    continue;
                }
                validateDayOfWeek(p.dayOfWeek(), 0, 7, "Dia da semana invalido na preferencia");
                if (p.weight() < 1 || p.weight() > 10) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Peso da preferencia deve ser entre 1 e 10");
                }
                parsePreferenceType(p.type());
                boolean hasStart = p.startTime() != null && !p.startTime().isBlank();
                boolean hasEnd = p.endTime() != null && !p.endTime().isBlank();
                if (hasStart != hasEnd) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferencia deve informar inicio e fim juntos");
                }
                if (hasStart) {
                    LocalTime st = parseTime(p.startTime(), "Horario inicial invalido na preferencia");
                    LocalTime et = parseTime(p.endTime(), "Horario final invalido na preferencia");
                    if (!st.isBefore(et)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferencia com horario inicial >= final");
                    }
                }
            }
        }

        if (backup.scheduleEntries() != null) {
            for (ScheduleEntryBackup e : backup.scheduleEntries()) {
                if (e == null || e.classGroupName() == null || e.subjectName() == null) {
                    continue;
                }
                validateDayOfWeek(e.dayOfWeek(), 1, 7, "Dia da semana invalido na entrada da grade");
                LocalTime st = parseTime(e.startTime(), "Horario inicial invalido na entrada da grade");
                LocalTime et = parseTime(e.endTime(), "Horario final invalido na entrada da grade");
                if (!st.isBefore(et)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Entrada da grade com horario inicial >= final");
                }
                parseShiftType(e.shiftType(), "Turno invalido na entrada da grade");
            }
        }
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

    private Map<String, Professor> restoreProfessors(List<String> professors) {
        Map<String, Professor> profByName = new HashMap<>();
        if (professors == null) {
            return profByName;
        }
        for (String pName : professors) {
            if (pName == null || pName.isBlank()) {
                continue;
            }
            String clean = pName.trim();
            String key = clean.toUpperCase(Locale.ROOT);
            if (profByName.containsKey(key)) {
                continue;
            }
            Professor p = new Professor();
            p.setName(clean);
            profByName.put(key, professorRepository.save(p));
        }
        return profByName;
    }

    private Map<String, ClassGroup> restoreClassGroups(List<ClassGroupBackup> classGroups) {
        Map<String, ClassGroup> classByName = new HashMap<>();
        if (classGroups == null) {
            return classByName;
        }
        for (ClassGroupBackup cgDto : classGroups) {
            if (cgDto == null || cgDto.name() == null || cgDto.name().isBlank()) {
                continue;
            }
            String clean = cgDto.name().trim();
            String key = clean.toUpperCase(Locale.ROOT);
            if (classByName.containsKey(key)) {
                continue;
            }
            ClassGroup cg = new ClassGroup();
            cg.setName(clean);
            cg.setShiftType(parseShiftType(cgDto.shiftType(), "Turno invalido"));
            classByName.put(key, classGroupRepository.save(cg));
        }
        return classByName;
    }

    private Map<String, Timeslot> restoreTimeslots(List<TimeslotBackup> timeslots) {
        Map<String, Timeslot> slotByKey = new HashMap<>();
        if (timeslots == null) {
            return slotByKey;
        }
        for (TimeslotBackup tsDto : timeslots) {
            if (tsDto == null) {
                continue;
            }
            LocalTime st = LocalTime.parse(tsDto.startTime());
            LocalTime et = LocalTime.parse(tsDto.endTime());
            ShiftType shift = parseShiftType(tsDto.shiftType(), "Turno invalido");
            String key = tsDto.dayOfWeek() + "|" + st + "|" + et + "|" + shift;
            if (slotByKey.containsKey(key)) {
                continue;
            }
            Timeslot ts = new Timeslot();
            ts.setDayOfWeek(tsDto.dayOfWeek());
            ts.setStartTime(st);
            ts.setEndTime(et);
            ts.setShiftType(shift);
            slotByKey.put(key, timeslotRepository.save(ts));
        }
        return slotByKey;
    }

    private Map<String, Subject> restoreSubjects(
        List<SubjectBackup> subjects,
        Map<String, ClassGroup> classByName
    ) {
        Map<String, Subject> subjectByKey = new HashMap<>();
        if (subjects == null) {
            return subjectByKey;
        }
        for (SubjectBackup sDto : subjects) {
            if (sDto == null || sDto.name() == null || sDto.classGroupName() == null) {
                continue;
            }
            ClassGroup cg = classByName.get(sDto.classGroupName().trim().toUpperCase(Locale.ROOT));
            if (cg == null) {
                continue;
            }
            String key = subjectKey(cg.getName(), sDto.name());
            if (subjectByKey.containsKey(key)) {
                continue;
            }
            Subject s = new Subject();
            s.setName(sDto.name().trim());
            s.setClassGroup(cg);
            s.setDoubleLessonAllowed(false);
            subjectByKey.put(key, subjectRepository.save(s));
        }
        return subjectByKey;
    }

    private void restoreDemands(
        List<DemandBackup> demands,
        Map<String, Subject> subjectByKey,
        Map<String, Professor> profByName
    ) {
        if (demands == null) {
            return;
        }
        for (DemandBackup dDto : demands) {
            if (dDto == null || dDto.subjectName() == null || dDto.classGroupName() == null) {
                continue;
            }
            Subject s = subjectByKey.get(subjectKey(dDto.classGroupName(), dDto.subjectName()));
            if (s == null) {
                continue;
            }
            Set<Professor> profs = resolveProfessors(dDto.professors(), profByName);
            if (profs.isEmpty()) {
                continue;
            }
            Demand d = new Demand();
            d.setSubject(s);
            d.setQuantityPerWeek(Math.max(1, Math.min(40, dDto.quantityPerWeek())));
            d.setAllowDoubleLesson(dDto.allowDoubleLesson());
            d.setProfessors(profs);
            demandRepository.save(d);
        }
    }

    private void restoreUnavailabilities(
        List<UnavailabilityBackup> unavailabilities,
        Map<String, Professor> profByName
    ) {
        if (unavailabilities == null) {
            return;
        }
        for (UnavailabilityBackup uDto : unavailabilities) {
            if (uDto == null || uDto.professorName() == null) {
                continue;
            }
            Professor p = profByName.get(uDto.professorName().trim().toUpperCase(Locale.ROOT));
            if (p == null) {
                continue;
            }
            ProfessorUnavailability u = new ProfessorUnavailability();
            u.setProfessor(p);
            u.setDayOfWeek(uDto.dayOfWeek());
            u.setStartTime(LocalTime.parse(uDto.startTime()));
            u.setEndTime(LocalTime.parse(uDto.endTime()));
            unavailabilityRepository.save(u);
        }
    }

    private void restorePreferences(
        List<PreferenceBackup> preferences,
        Map<String, Professor> profByName,
        Map<String, Subject> subjectByKey
    ) {
        if (preferences == null) {
            return;
        }
        for (PreferenceBackup pDto : preferences) {
            if (pDto == null || pDto.professorName() == null) {
                continue;
            }
            Professor p = profByName.get(pDto.professorName().trim().toUpperCase(Locale.ROOT));
            if (p == null) {
                continue;
            }
            ProfessorPreference pref = new ProfessorPreference();
            pref.setProfessor(p);
            pref.setDayOfWeek(pDto.dayOfWeek());
            pref.setWeight(Math.max(1, Math.min(10, pDto.weight())));
            pref.setType(parsePreferenceType(pDto.type()));
            if (pDto.subjectName() != null && pDto.classGroupName() != null) {
                pref.setSubject(subjectByKey.get(subjectKey(pDto.classGroupName(), pDto.subjectName())));
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

    private void restoreScheduleEntries(
        List<ScheduleEntryBackup> entries,
        Map<String, ClassGroup> classByName,
        Map<String, Subject> subjectByKey,
        Map<String, Timeslot> slotByKey,
        Map<String, Professor> profByName
    ) {
        if (entries == null) {
            return;
        }
        for (ScheduleEntryBackup eDto : entries) {
            if (eDto == null || eDto.classGroupName() == null || eDto.subjectName() == null) {
                continue;
            }
            ClassGroup cg = classByName.get(eDto.classGroupName().trim().toUpperCase(Locale.ROOT));
            Subject s = subjectByKey.get(subjectKey(eDto.classGroupName(), eDto.subjectName()));
            LocalTime st = LocalTime.parse(eDto.startTime());
            LocalTime et = LocalTime.parse(eDto.endTime());
            ShiftType shift = parseShiftType(eDto.shiftType(), "Turno invalido");
            Timeslot ts = slotByKey.get(eDto.dayOfWeek() + "|" + st + "|" + et + "|" + shift);
            if (cg == null || s == null || ts == null) {
                continue;
            }
            ScheduleEntry entry = new ScheduleEntry();
            entry.setClassGroup(cg);
            entry.setSubject(s);
            entry.setTimeslot(ts);
            entry.setProfessors(resolveProfessors(eDto.professors(), profByName));
            scheduleEntryRepository.save(entry);
        }
    }

    private Set<Professor> resolveProfessors(List<String> names, Map<String, Professor> profByName) {
        Set<Professor> profs = new HashSet<>();
        if (names == null) {
            return profs;
        }
        for (String pn : names) {
            if (pn == null || pn.isBlank()) {
                continue;
            }
            Professor p = profByName.get(pn.trim().toUpperCase(Locale.ROOT));
            if (p != null) {
                profs.add(p);
            }
        }
        return profs;
    }

    private String subjectKey(String classGroupName, String subjectName) {
        return classGroupName.trim().toUpperCase(Locale.ROOT) + "|" + subjectName.trim().toUpperCase(Locale.ROOT);
    }

    private void validateDayOfWeek(int dayOfWeek, int min, int max, String message) {
        if (dayOfWeek < min || dayOfWeek > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message + ": " + dayOfWeek);
        }
    }

    private LocalTime parseTime(String raw, String message) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        try {
            return LocalTime.parse(raw.trim());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message + ": " + raw);
        }
    }

    private ShiftType parseShiftType(String raw, String message) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        try {
            return ShiftType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message + ": " + raw);
        }
    }

    private PreferenceType parsePreferenceType(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de preferencia obrigatorio");
        }
        try {
            return PreferenceType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de preferencia invalido: " + raw);
        }
    }
}

