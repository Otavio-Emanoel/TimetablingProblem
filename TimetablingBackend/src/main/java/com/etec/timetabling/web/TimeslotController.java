package com.etec.timetabling.web;

import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.TimeslotRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
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

    public TimeslotController(TimeslotRepository timeslotRepository) {
        this.timeslotRepository = timeslotRepository;
    }

    @GetMapping
    public List<Timeslot> list(@RequestParam(name = "shiftType", required = false) ShiftType shiftType) {
        if (shiftType == null) {
            return timeslotRepository.findAll();
        }
        return timeslotRepository.findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(shiftType);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Timeslot create(@Valid @RequestBody TimeslotRequest request) {
        Timeslot timeslot = new Timeslot();
        timeslot.setDayOfWeek(parseDayOfWeek(request.dayOfWeek()));
        timeslot.setStartTime(request.startTime());
        timeslot.setEndTime(request.endTime());
        timeslot.setShiftType(request.shiftType());
        return timeslotRepository.save(timeslot);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!timeslotRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        timeslotRepository.deleteById(id);
    }

    public record TimeslotRequest(
        @NotBlank String dayOfWeek,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotNull ShiftType shiftType
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
