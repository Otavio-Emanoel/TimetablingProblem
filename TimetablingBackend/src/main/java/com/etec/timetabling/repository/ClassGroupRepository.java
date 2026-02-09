package com.etec.timetabling.repository;

import com.etec.timetabling.domain.ClassGroup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassGroupRepository extends JpaRepository<ClassGroup, Long> {
}
