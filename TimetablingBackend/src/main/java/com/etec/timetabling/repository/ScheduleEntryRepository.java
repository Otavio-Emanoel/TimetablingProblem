package com.etec.timetabling.repository;

import com.etec.timetabling.domain.ScheduleEntry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleEntryRepository extends JpaRepository<ScheduleEntry, Long> {
    List<ScheduleEntry> findByClassGroupId(Long classGroupId);
}
