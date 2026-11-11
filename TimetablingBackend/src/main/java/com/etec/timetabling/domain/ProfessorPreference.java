package com.etec.timetabling.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Representa a preferência de um professor para dar aula em determinado
 * dia/horário. O solver usa isso como soft-constraint com peso configurável.
 *
 * <p>Exemplo: "Prof. Silva prefere dar Matemática na segunda-feira no 1º horário".</p>
 */
@Entity
@Table(
    name = "professor_preference",
    indexes = {
        @Index(name = "idx_pref_professor", columnList = "professor_id"),
        @Index(name = "idx_pref_subject", columnList = "subject_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class ProfessorPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Professor que possui a preferência. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "professor_id")
    private Professor professor;

    /** Matéria desejada (opcional – null = qualquer matéria do professor). */
    @ManyToOne
    @JoinColumn(name = "subject_id")
    private Subject subject;

    /** Dia da semana preferido (1=Seg … 5=Sex, 0=qualquer dia). */
    @Column(nullable = false)
    private int dayOfWeek;

    /** Início do horário preferido (pode ser null = qualquer horário no dia). */
    private LocalTime startTime;

    /** Fim do horário preferido. */
    private LocalTime endTime;

    /**
     * Peso da preferência (1-10). Quanto maior, mais o solver tentará
     * respeitar. 10 = "quase obrigatório".
     */
    @Column(nullable = false)
    private int weight = 5;

    /** Tipo da preferência: PREFERRED (quer) ou AVOID (evitar). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PreferenceType type = PreferenceType.PREFERRED;
}
