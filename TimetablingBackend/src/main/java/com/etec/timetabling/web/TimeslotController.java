package com.etec.timetabling.web;

import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.TimeslotRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.util.List;
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
        timeslot.setDayOfWeek(request.dayOfWeek());
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
        @NotNull Integer dayOfWeek,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotNull ShiftType shiftType
    ) {
    }
}
