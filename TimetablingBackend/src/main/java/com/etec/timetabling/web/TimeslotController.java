package com.etec.timetabling.web;

import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.service.TimeslotService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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

@RestController
@RequestMapping("/api/timeslots")
public class TimeslotController {

    private final TimeslotService timeslotService;

    public TimeslotController(TimeslotService timeslotService) {
        this.timeslotService = timeslotService;
    }

    @GetMapping
    public List<Timeslot> list(@RequestParam(name = "shiftType", required = false) ShiftType shiftType) {
        return timeslotService.list(shiftType);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Timeslot create(@Valid @RequestBody TimeslotRequest request) {
        return timeslotService.create(request);
    }

    @PostMapping("/padrao")
    public DefaultTimeslotsResponse createDefaultEtecSchedule() {
        return timeslotService.createDefaultEtecSchedule();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        timeslotService.delete(id);
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
}
