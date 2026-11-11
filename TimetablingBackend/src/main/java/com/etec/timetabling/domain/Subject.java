package com.etec.timetabling.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "subject",
    indexes = {
        @Index(name = "idx_subject_class_group", columnList = "class_group_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_subject_name_class", columnNames = {"name", "class_group_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Subject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "class_group_id")
    private ClassGroup classGroup;

    @Column(nullable = false)
    private boolean doubleLessonAllowed;
}
