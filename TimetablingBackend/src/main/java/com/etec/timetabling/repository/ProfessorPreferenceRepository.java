package com.etec.timetabling.repository;

import com.etec.timetabling.domain.ProfessorPreference;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositório para preferências de horário dos professores.
 */
@Repository
public interface ProfessorPreferenceRepository extends JpaRepository<ProfessorPreference, Long> {

    /** Preferências de um professor específico. */
    List<ProfessorPreference> findByProfessorId(Long professorId);

    /** Preferências de um professor para um dia da semana específico. */
    List<ProfessorPreference> findByProfessorIdAndDayOfWeek(Long professorId, int dayOfWeek);

    /** Todas as preferências de uma matéria. */
    List<ProfessorPreference> findBySubjectId(Long subjectId);

    void deleteByProfessorId(Long professorId);

    void deleteBySubjectId(Long subjectId);
}
