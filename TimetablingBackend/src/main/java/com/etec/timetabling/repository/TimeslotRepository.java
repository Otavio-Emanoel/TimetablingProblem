package com.etec.timetabling.repository;

import com.etec.timetabling.domain.Timeslot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeslotRepository extends JpaRepository<Timeslot, Long> {
}
