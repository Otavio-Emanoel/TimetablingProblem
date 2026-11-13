package com.etec.timetabling.service;

import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import com.etec.timetabling.web.TimeslotController.DefaultTimeslotsResponse;
import com.etec.timetabling.web.TimeslotController.TimeslotRequest;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Serviço de gerenciamento da grade estrutural de horários (Timeslots) da ETEC.
 */
@Service
public class TimeslotService {

    private static final String[][] COMMON_MORNING = {
        {"08:00", "08:50"},
        {"08:50", "09:40"},
        {"10:00", "10:50"},
        {"10:50", "11:40"},
        {"11:40", "12:30"}
    };
    private static final String[] REGULAR_LUNCH = {"12:30", "13:20"};
    private static final String[][] INTEGRAL_AFTERNOON = {
        {"13:30", "14:20"},
        {"14:20", "15:10"},
        {"15:10", "16:00"}
    };

    private final TimeslotRepository timeslotRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;

    public TimeslotService(
        TimeslotRepository timeslotRepository,
        ScheduleEntryRepository scheduleEntryRepository
    ) {
        this.timeslotRepository = timeslotRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @Transactional(readOnly = true)
    public List<Timeslot> list(ShiftType shiftType) {
        if (shiftType == null) {
            return timeslotRepository.findAllByOrderByShiftTypeAscDayOfWeekAscStartTimeAsc();
        }
        return timeslotRepository.findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(shiftType);
    }

    @Transactional
    public Timeslot create(TimeslotRequest request) {
        int day = parseDayOfWeek(request.dayOfWeek());
        if (!request.startTime().isBefore(request.endTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime deve ser anterior a endTime");
        }
        if (timeslotRepository.existsByDayOfWeekAndStartTimeAndEndTimeAndShiftType(
                day, request.startTime(), request.endTime(), request.shiftType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Timeslot ja cadastrado");
        }

        // Impede criação de slot sobreposto no mesmo dia e turno
        List<Timeslot> sameShiftSlots = timeslotRepository
            .findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(request.shiftType());
        for (Timeslot existing : sameShiftSlots) {
            if (existing.getDayOfWeek() == day
                    && existing.getStartTime().isBefore(request.endTime())
                    && existing.getEndTime().isAfter(request.startTime())) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    String.format("Horario sobreposto a slot existente (%s-%s)",
                        existing.getStartTime(), existing.getEndTime())
                );
            }
        }

        Timeslot timeslot = new Timeslot();
        timeslot.setDayOfWeek(day);
        timeslot.setStartTime(request.startTime());
        timeslot.setEndTime(request.endTime());
        timeslot.setShiftType(request.shiftType());
        return timeslotRepository.save(timeslot);
    }

    /**
     * Garante de forma idempotente a criação dos 70 slots padrão ETEC (Segunda a Sexta).
     */
    @Transactional
    public DefaultTimeslotsResponse createDefaultEtecSchedule() {
        int created = 0;
        for (int day = 1; day <= 5; day++) {
            for (String[] slot : COMMON_MORNING) {
                created += saveSlotIfAbsent(day, LocalTime.parse(slot[0]), LocalTime.parse(slot[1]), ShiftType.REGULAR);
                created += saveSlotIfAbsent(day, LocalTime.parse(slot[0]), LocalTime.parse(slot[1]), ShiftType.INTEGRAL);
            }
            created += saveSlotIfAbsent(
                day,
                LocalTime.parse(REGULAR_LUNCH[0]),
                LocalTime.parse(REGULAR_LUNCH[1]),
                ShiftType.REGULAR
            );
            for (String[] slot : INTEGRAL_AFTERNOON) {
                created += saveSlotIfAbsent(day, LocalTime.parse(slot[0]), LocalTime.parse(slot[1]), ShiftType.INTEGRAL);
            }
        }
        return new DefaultTimeslotsResponse(created, timeslotRepository.count());
    }

    @Transactional
    public void delete(Long id) {
        if (!timeslotRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        scheduleEntryRepository.deleteByTimeslotId(id);
        timeslotRepository.deleteById(id);
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

    public int parseDayOfWeek(String dayOfWeekRaw) {
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
            // Continua o parse usando nomes dos dias da semana
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

