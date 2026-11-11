package com.etec.timetabling.repository;

import com.etec.timetabling.domain.ProfessorUnavailability;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessorUnavailabilityRepository extends JpaRepository<ProfessorUnavailability, Long> {
    List<ProfessorUnavailability> findByProfessorId(Long professorId);

    boolean existsByProfessorIdAndDayOfWeekAndStartTimeAndEndTime(
        Long professorId,
        int dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
    );

    void deleteByProfessorId(Long professorId);
}

