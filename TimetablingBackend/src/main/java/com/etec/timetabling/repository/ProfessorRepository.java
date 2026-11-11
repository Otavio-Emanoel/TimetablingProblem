package com.etec.timetabling.repository;

import com.etec.timetabling.domain.Professor;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessorRepository extends JpaRepository<Professor, Long> {
    boolean existsByNameIgnoreCase(String name);

    Optional<Professor> findByNameIgnoreCase(String name);

    List<Professor> findAllByOrderByNameAsc();
}
