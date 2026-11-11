package com.etec.timetabling.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "timeslot",
    indexes = {
        @Index(name = "idx_timeslot_shift_day", columnList = "shiftType, dayOfWeek, startTime")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_timeslot_day_time_shift", columnNames = {"dayOfWeek", "startTime", "endTime", "shiftType"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Timeslot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int dayOfWeek;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShiftType shiftType;
}
