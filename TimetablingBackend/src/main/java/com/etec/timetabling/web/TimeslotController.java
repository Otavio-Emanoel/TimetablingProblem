package com.etec.timetabling.web;

import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/timeslots")
public class TimeslotController {
    private final TimeslotRepository timeslotRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;

    public TimeslotController(
        TimeslotRepository timeslotRepository,
        ScheduleEntryRepository scheduleEntryRepository
    ) {
        this.timeslotRepository = timeslotRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @GetMapping
    public List<Timeslot> list(@RequestParam(name = "shiftType", required = false) ShiftType shiftType) {
        if (shiftType == null) {
            return timeslotRepository.findAllByOrderByShiftTypeAscDayOfWeekAscStartTimeAsc();
        }
        return timeslotRepository.findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(shiftType);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Timeslot create(@Valid @RequestBody TimeslotRequest request) {
        int day = parseDayOfWeek(request.dayOfWeek());
        if (!request.startTime().isBefore(request.endTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime deve ser anterior a endTime");
        }
        if (timeslotRepository.existsByDayOfWeekAndStartTimeAndEndTimeAndShiftType(
                day, request.startTime(), request.endTime(), request.shiftType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Timeslot ja cadastrado");
        }

        Timeslot timeslot = new Timeslot();
        timeslot.setDayOfWeek(day);
        timeslot.setStartTime(request.startTime());
        timeslot.setEndTime(request.endTime());
        timeslot.setShiftType(request.shiftType());
        return timeslotRepository.save(timeslot);
    }

    @PostMapping("/padrao")
    @Transactional
    public DefaultTimeslotsResponse createDefaultEtecSchedule() {
        String[][] commonMorning = {
            {"08:00", "08:50"},
            {"08:50", "09:40"},
            {"10:00", "10:50"},
            {"10:50", "11:40"},
            {"11:40", "12:30"}
        };
        String[] regularLunch = {"12:30", "13:20"};
        String[][] integralAfternoon = {
            {"13:30", "14:20"},
            {"14:20", "15:10"},
            {"15:10", "16:00"}
        };

        int created = 0;
        for (int day = 1; day <= 5; day++) {
            for (String[] slot : commonMorning) {
                created += saveSlotIfAbsent(day, LocalTime.parse(slot[0]), LocalTime.parse(slot[1]), ShiftType.REGULAR);
                created += saveSlotIfAbsent(day, LocalTime.parse(slot[0]), LocalTime.parse(slot[1]), ShiftType.INTEGRAL);
            }
            created += saveSlotIfAbsent(day, LocalTime.parse(regularLunch[0]), LocalTime.parse(regularLunch[1]), ShiftType.REGULAR);
            for (String[] slot : integralAfternoon) {
                created += saveSlotIfAbsent(day, LocalTime.parse(slot[0]), LocalTime.parse(slot[1]), ShiftType.INTEGRAL);
            }
        }

        return new DefaultTimeslotsResponse(created, timeslotRepository.count());
    }

    private int saveSlotIfAbsent(int day, LocalTime start, LocalTime end, ShiftType shift) {
        if (timeslotRepository.existsByDayOfWeekAndStartTimeAndEndTimeAndShiftType(day, start, end, shift)) {
            return 0;
        }
        Timeslot t = new Timeslot();
        t.setDayOfWeek(day);
        t.setStartTime(start);
        t.setEndTime(end);
        t.setShiftType(shift);
        timeslotRepository.save(t);
        return 1;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        if (!timeslotRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        scheduleEntryRepository.deleteByTimeslotId(id);
        timeslotRepository.deleteById(id);
    }

    public record TimeslotRequest(
        @NotBlank String dayOfWeek,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotNull ShiftType shiftType
    ) {
    }

    public record DefaultTimeslotsResponse(
        int created,
        long total
    ) {
    }

    private int parseDayOfWeek(String dayOfWeekRaw) {
        if (dayOfWeekRaw == null || dayOfWeekRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dayOfWeek e obrigatorio");
        }

        String normalized = dayOfWeekRaw.trim().toUpperCase(Locale.ROOT);

        try {
            int numeric = Integer.parseInt(normalized);
            if (numeric < 1 || numeric > 7) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dayOfWeek invalido");
            }
            return numeric;
        } catch (NumberFormatException ignored) {
            // Continue parsing as enum name
        }

        return switch (normalized) {
            case "MONDAY" -> 1;
            case "TUESDAY" -> 2;
            case "WEDNESDAY" -> 3;
            case "THURSDAY" -> 4;
            case "FRIDAY" -> 5;
            case "SATURDAY" -> 6;
            case "SUNDAY" -> 7;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dayOfWeek invalido");
        };
    }
}
