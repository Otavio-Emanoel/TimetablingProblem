package com.etec.timetabling.domain;

/**
 * Tipo de preferência de horário de um professor.
 */
public enum PreferenceType {
    /** O professor QUER dar aula neste horário/dia. */
    PREFERRED,
    /** O professor PREFERE EVITAR este horário/dia. */
    AVOID
}
