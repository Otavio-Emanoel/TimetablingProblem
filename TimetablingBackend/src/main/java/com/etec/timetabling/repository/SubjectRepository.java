package com.etec.timetabling.repository;

import com.etec.timetabling.domain.Subject;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByClassGroupId(Long classGroupId);

    boolean existsByNameIgnoreCaseAndClassGroupId(String name, Long classGroupId);

    Optional<Subject> findByNameIgnoreCaseAndClassGroupId(String name, Long classGroupId);

    void deleteByClassGroupId(Long classGroupId);
}
