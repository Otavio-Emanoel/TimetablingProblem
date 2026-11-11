package com.etec.timetabling.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "demand",
    indexes = {
        @Index(name = "idx_demand_subject", columnList = "subject_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_demand_subject", columnNames = {"subject_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Demand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    private int quantityPerWeek;

    private boolean allowDoubleLesson;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "demand_professor",
        joinColumns = @JoinColumn(name = "demand_id"),
        inverseJoinColumns = @JoinColumn(name = "professor_id")
    )
    private Set<Professor> professors = new HashSet<>();
}
