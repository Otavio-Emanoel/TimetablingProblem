package com.etec.timetabling.repository;

import com.etec.timetabling.domain.ProfessorUnavailability;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessorUnavailabilityRepository extends JpaRepository<ProfessorUnavailability, Long> {
    List<ProfessorUnavailability> findByProfessorId(Long professorId);

    void deleteByProfessorId(Long professorId);
}
