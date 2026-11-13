package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorPreferenceRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ProfessorUnavailabilityRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.SubjectRepository;
import com.etec.timetabling.web.ClassGroupController.ClassGroupRequest;
import com.etec.timetabling.web.DemandController.DemandRequest;
import com.etec.timetabling.web.ProfessorController.ProfessorRequest;
import com.etec.timetabling.web.SubjectController.SubjectRequest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Serviço central de CRUD e integridade referencial para Professores,
 * Turmas, Disciplinas e Demandas curriculares.
 */
@Service
public class CurriculumService {

    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final SubjectRepository subjectRepository;
    private final DemandRepository demandRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ProfessorUnavailabilityRepository unavailabilityRepository;
    private final ProfessorPreferenceRepository preferenceRepository;

    public CurriculumService(
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        SubjectRepository subjectRepository,
        DemandRepository demandRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ProfessorUnavailabilityRepository unavailabilityRepository,
        ProfessorPreferenceRepository preferenceRepository
    ) {
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.subjectRepository = subjectRepository;
        this.demandRepository = demandRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.preferenceRepository = preferenceRepository;
    }

    // ====================== PROFESSORS ======================

    @Transactional(readOnly = true)
    public List<Professor> listProfessors() {
        return professorRepository.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public Professor getProfessor(Long id) {
        return professorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Professor createProfessor(ProfessorRequest request) {
        String cleanName = request.name().trim();
        if (professorRepository.existsByNameIgnoreCase(cleanName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Professor ja cadastrado");
        }
        Professor professor = new Professor();
        professor.setName(cleanName);
        return professorRepository.save(professor);
    }

    @Transactional
    public Professor updateProfessor(Long id, ProfessorRequest request) {
        Professor professor = getProfessor(id);
        String cleanName = request.name().trim();
        professorRepository.findByNameIgnoreCase(cleanName)
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe outro professor com este nome");
            });
        professor.setName(cleanName);
        return professorRepository.save(professor);
    }

    @Transactional
    public void deleteProfessor(Long id) {
        Professor professor = getProfessor(id);
        unavailabilityRepository.deleteByProfessorId(id);
        preferenceRepository.deleteByProfessorId(id);

        List<ScheduleEntry> entries = scheduleEntryRepository.findByProfessorsId(id);
        List<ScheduleEntry> entriesToDelete = new ArrayList<>();
        for (ScheduleEntry entry : entries) {
            entry.getProfessors().removeIf(p -> p.getId().equals(id));
            if (entry.getProfessors().isEmpty()) {
                entriesToDelete.add(entry);
            }
        }
        if (!entriesToDelete.isEmpty()) {
            scheduleEntryRepository.deleteAll(entriesToDelete);
        }

        List<Demand> allDemands = demandRepository.findAll();
        List<Demand> demandsToDelete = new ArrayList<>();
        for (Demand demand : allDemands) {
            boolean removed = demand.getProfessors().removeIf(p -> p.getId().equals(id));
            if (removed && demand.getProfessors().isEmpty()) {
                demandsToDelete.add(demand);
            }
        }
        if (!demandsToDelete.isEmpty()) {
            demandRepository.deleteAll(demandsToDelete);
        }

        professorRepository.delete(professor);
    }

    // ====================== CLASS GROUPS ======================

    @Transactional(readOnly = true)
    public List<ClassGroup> listClassGroups() {
        return classGroupRepository.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public ClassGroup getClassGroup(Long id) {
        return classGroupRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public ClassGroup createClassGroup(ClassGroupRequest request) {
        String cleanName = request.name().trim();
        if (classGroupRepository.existsByNameIgnoreCase(cleanName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Turma ja cadastrada");
        }
        ClassGroup classGroup = new ClassGroup();
        classGroup.setName(cleanName);
        classGroup.setShiftType(request.shiftType());
        return classGroupRepository.save(classGroup);
    }

    @Transactional
    public ClassGroup updateClassGroup(Long id, ClassGroupRequest request) {
        ClassGroup classGroup = getClassGroup(id);
        String cleanName = request.name().trim();
        classGroupRepository.findByNameIgnoreCase(cleanName)
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ja existe outra turma com este nome");
            });
        classGroup.setName(cleanName);
        classGroup.setShiftType(request.shiftType());
        return classGroupRepository.save(classGroup);
    }

    @Transactional
    public void deleteClassGroup(Long id) {
        if (!classGroupRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        scheduleEntryRepository.deleteByClassGroupId(id);
        demandRepository.deleteBySubjectClassGroupId(id);

        List<Subject> subjects = subjectRepository.findByClassGroupId(id);
        for (Subject s : subjects) {
            preferenceRepository.deleteBySubjectId(s.getId());
        }
        subjectRepository.deleteByClassGroupId(id);
        classGroupRepository.deleteById(id);
    }

    // ====================== SUBJECTS ======================

    @Transactional(readOnly = true)
    public List<Subject> listSubjects(Long classGroupId) {
        if (classGroupId == null) {
            return subjectRepository.findAll();
        }
        return subjectRepository.findByClassGroupId(classGroupId);
    }

    @Transactional(readOnly = true)
    public Subject getSubject(Long id) {
        return subjectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Subject createSubject(SubjectRequest request) {
        ClassGroup classGroup = getClassGroup(request.classGroupId());
        String cleanName = request.name().trim();
        if (subjectRepository.existsByNameIgnoreCaseAndClassGroupId(cleanName, classGroup.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Materia ja cadastrada para esta turma");
        }
        Subject subject = new Subject();
        subject.setName(cleanName);
        subject.setClassGroup(classGroup);
        subject.setDoubleLessonAllowed(false);
        return subjectRepository.save(subject);
    }

    @Transactional
    public Subject updateSubject(Long id, SubjectRequest request) {
        Subject subject = getSubject(id);
        ClassGroup classGroup = getClassGroup(request.classGroupId());
        String cleanName = request.name().trim();
        subjectRepository.findByNameIgnoreCaseAndClassGroupId(cleanName, classGroup.getId())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Materia ja existe nesta turma");
            });
        subject.setName(cleanName);
        subject.setClassGroup(classGroup);
        return subjectRepository.save(subject);
    }

    @Transactional
    public void deleteSubject(Long id) {
        if (!subjectRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        scheduleEntryRepository.deleteBySubjectId(id);
        demandRepository.deleteBySubjectId(id);
        preferenceRepository.deleteBySubjectId(id);
        subjectRepository.deleteById(id);
    }

    // ====================== DEMANDS ======================

    @Transactional(readOnly = true)
    public List<Demand> listDemands(Long classGroupId) {
        if (classGroupId == null) {
            return demandRepository.findAll();
        }
        return demandRepository.findBySubjectClassGroupId(classGroupId);
    }

    @Transactional
    public Demand createDemand(DemandRequest request) {
        Subject subject = getSubject(request.subjectId());
        if (demandRepository.existsBySubjectId(subject.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Demanda ja cadastrada para esta materia");
        }
        List<Professor> professors = resolveDemandProfessors(request.professorIds());
        Demand demand = new Demand();
        demand.setSubject(subject);
        demand.setQuantityPerWeek(request.quantityPerWeek());
        demand.setAllowDoubleLesson(request.allowDoubleLesson());
        demand.setProfessors(new HashSet<>(professors));
        return demandRepository.save(demand);
    }

    @Transactional
    public Demand updateDemand(Long id, DemandRequest request) {
        Demand demand = demandRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Subject subject = getSubject(request.subjectId());

        demandRepository.findBySubjectId(subject.getId()).stream()
            .filter(existing -> !existing.getId().equals(id))
            .findAny()
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Demanda ja cadastrada para esta materia");
            });

        List<Professor> professors = resolveDemandProfessors(request.professorIds());
        demand.setSubject(subject);
        demand.setQuantityPerWeek(request.quantityPerWeek());
        demand.setAllowDoubleLesson(request.allowDoubleLesson());
        demand.setProfessors(new HashSet<>(professors));
        return demandRepository.save(demand);
    }

    @Transactional
    public void deleteDemand(Long id) {
        if (!demandRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        demandRepository.deleteById(id);
    }

    private List<Professor> resolveDemandProfessors(Set<Long> professorIds) {
        List<Professor> professors = professorRepository.findAllById(professorIds);
        if (professors.size() != professorIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Professor not found");
        }
        return professors;
    }
}

