package com.etec.timetabling.web;

import com.etec.timetabling.domain.PreferenceType;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ProfessorPreference;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.SubjectRepository;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API REST para gerenciar preferências de horário dos professores.
 *
 * <p>As preferências são soft-constraints usadas pelo solver para gerar
 * grades que respeitem os desejos dos professores (quando possível).</p>
 */
@RestController
@RequestMapping("/api/preferences")
public class ProfessorPreferenceController {

    private final ProfessorPreferenceRepository preferenceRepository;
    private final ProfessorRepository professorRepository;
    private final SubjectRepository subjectRepository;

    public ProfessorPreferenceController(
            ProfessorPreferenceRepository preferenceRepository,
            ProfessorRepository professorRepository,
            SubjectRepository subjectRepository) {
        this.preferenceRepository = preferenceRepository;
        this.professorRepository = professorRepository;
        this.subjectRepository = subjectRepository;
    }

    // ====================== RECORDS ======================

    public record PreferenceRequest(
        Long professorId,
        Long subjectId,
        int dayOfWeek,
        String startTime,
        String endTime,
        int weight,
        String type
    ) {}

    public record PreferenceResponse(
        Long id,
        Long professorId,
        String professorName,
        Long subjectId,
        String subjectName,
        int dayOfWeek,
        String startTime,
        String endTime,
        int weight,
        String type
    ) {}

    // ====================== ENDPOINTS ======================

    /** Listar todas as preferências. */
    @GetMapping
    public List<PreferenceResponse> listAll() {
        return preferenceRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Listar preferências de um professor. */
    @GetMapping("/professor/{professorId}")
    public List<PreferenceResponse> listByProfessor(@PathVariable Long professorId) {
        return preferenceRepository.findByProfessorId(professorId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Criar nova preferência. */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody PreferenceRequest req) {
        // Validações
        if (req.professorId() == null || req.professorId() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "professorId é obrigatório"));
        }
        if (req.dayOfWeek() < 0 || req.dayOfWeek() > 7) {
            return ResponseEntity.badRequest().body(Map.of("error", "dayOfWeek deve ser 0-7"));
        }
        if (req.weight() < 1 || req.weight() > 10) {
            return ResponseEntity.badRequest().body(Map.of("error", "weight deve ser 1-10"));
        }

        Professor professor = professorRepository.findById(req.professorId()).orElse(null);
        if (professor == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Professor não encontrado"));
        }

        ProfessorPreference pref = new ProfessorPreference();
        pref.setProfessor(professor);
        pref.setDayOfWeek(req.dayOfWeek());
        pref.setWeight(req.weight());

        // Tipo da preferência (PREFERRED ou AVOID)
        PreferenceType resolvedType = PreferenceType.PREFERRED;
        if (req.type() != null && !req.type().isBlank()) {
            try {
                resolvedType = PreferenceType.valueOf(req.type().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(
                        Map.of("error", "type deve ser PREFERRED ou AVOID"));
            }
        }
        pref.setType(resolvedType);

        // Matéria opcional
        if (req.subjectId() != null) {
            if (req.subjectId() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "subjectId deve ser positivo"));
            }
            Subject subject = subjectRepository.findById(req.subjectId()).orElse(null);
            if (subject == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Matéria não encontrada"));
            }
            pref.setSubject(subject);
        }

        // Horários opcionais
        LocalTime start = null;
        LocalTime end = null;
        try {
            if (req.startTime() != null && !req.startTime().isBlank()) {
                start = LocalTime.parse(req.startTime().trim());
                pref.setStartTime(start);
            }
            if (req.endTime() != null && !req.endTime().isBlank()) {
                end = LocalTime.parse(req.endTime().trim());
                pref.setEndTime(end);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Formato de horário inválido (use HH:mm)"));
        }

        if ((start != null && end == null) || (start == null && end != null)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Informe ambos startTime e endTime ou deixe ambos em branco"));
        }
        if (start != null && !start.isBefore(end)) {
            return ResponseEntity.badRequest().body(Map.of("error", "startTime deve ser anterior a endTime"));
        }

        if (preferenceRepository.existsByProfessorIdAndDayOfWeekAndStartTimeAndEndTimeAndType(
                professor.getId(), req.dayOfWeek(), start, end, resolvedType)) {
            return ResponseEntity.status(409).body(Map.of("error", "Preferência idêntica já cadastrada para este professor"));
        }

        ProfessorPreference saved = preferenceRepository.save(pref);
        return ResponseEntity.status(201).body(toResponse(saved));
    }

    /** Deletar uma preferência. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!preferenceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        preferenceRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ====================== HELPERS ======================

    private PreferenceResponse toResponse(ProfessorPreference pref) {
        return new PreferenceResponse(
                pref.getId(),
                pref.getProfessor().getId(),
                pref.getProfessor().getName(),
                pref.getSubject() != null ? pref.getSubject().getId() : null,
                pref.getSubject() != null ? pref.getSubject().getName() : null,
                pref.getDayOfWeek(),
                pref.getStartTime() != null ? pref.getStartTime().toString() : null,
                pref.getEndTime() != null ? pref.getEndTime().toString() : null,
                pref.getWeight(),
                pref.getType().name()
        );
    }
}
