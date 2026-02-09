package com.etec.timetabling.repository;

import com.etec.timetabling.domain.Availability;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityRepository extends JpaRepository<Availability, Long> {
}
