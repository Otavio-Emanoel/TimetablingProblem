package com.etec.timetabling.repository;

import com.etec.timetabling.domain.Subject;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
	List<Subject> findByClassGroupId(Long classGroupId);
}
