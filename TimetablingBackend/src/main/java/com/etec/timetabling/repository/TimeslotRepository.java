package com.etec.timetabling.repository;

import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.domain.ShiftType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeslotRepository extends JpaRepository<Timeslot, Long> {
	List<Timeslot> findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(ShiftType shiftType);
}
