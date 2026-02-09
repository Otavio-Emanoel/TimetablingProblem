package com.etec.timetabling.repository;

import com.etec.timetabling.domain.Demand;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DemandRepository extends JpaRepository<Demand, Long> {
    List<Demand> findBySubjectClassGroupId(Long classGroupId);
}
