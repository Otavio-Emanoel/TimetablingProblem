package com.etec.timetabling.repository;

import com.etec.timetabling.domain.ClassGroup;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassGroupRepository extends JpaRepository<ClassGroup, Long> {
    boolean existsByNameIgnoreCase(String name);

    Optional<ClassGroup> findByNameIgnoreCase(String name);

    List<ClassGroup> findAllByOrderByNameAsc();
}
