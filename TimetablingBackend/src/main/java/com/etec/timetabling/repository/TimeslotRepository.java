package com.etec.timetabling.repository;

import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeslotRepository extends JpaRepository<Timeslot, Long> {
    List<Timeslot> findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(ShiftType shiftType);

    List<Timeslot> findAllByOrderByShiftTypeAscDayOfWeekAscStartTimeAsc();

    boolean existsByDayOfWeekAndStartTimeAndEndTimeAndShiftType(
        int dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        ShiftType shiftType
    );
}
