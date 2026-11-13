package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Demand;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.Subject;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.DemandRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.SubjectRepository;
import com.etec.timetabling.service.EtecSeedCatalog.ClassGroupSeed;
import com.etec.timetabling.service.EtecSeedCatalog.DemandSeed;
import com.etec.timetabling.service.EtecSeedCatalog.SeedPreset;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Serviço transacional para carga idempotente de bases curriculares pré-configuradas.
 */
@Service
public class SeedService {

    private final ProfessorRepository professorRepository;
    private final ClassGroupRepository classGroupRepository;
    private final SubjectRepository subjectRepository;
    private final DemandRepository demandRepository;
    private final TimeslotService timeslotService;
    private final BackupService backupService;

    public SeedService(
        ProfessorRepository professorRepository,
        ClassGroupRepository classGroupRepository,
        SubjectRepository subjectRepository,
        DemandRepository demandRepository,
        TimeslotService timeslotService,
        BackupService backupService
    ) {
        this.professorRepository = professorRepository;
        this.classGroupRepository = classGroupRepository;
        this.subjectRepository = subjectRepository;
        this.demandRepository = demandRepository;
        this.timeslotService = timeslotService;
        this.backupService = backupService;
    }

    public record SeedPresetSummary(
        String id,
        String name,
        String description,
        int professorsCount,
        int classGroupsCount,
        int demandsCount,
        int totalWeeklyLessons
    ) {
    }

    public record SeedExecutionResult(
        String presetId,
        String presetName,
        boolean resetPerformed,
        int professorsCreated,
        long professorsTotal,
        int classGroupsCreated,
        long classGroupsTotal,
        int timeslotsCreated,
        long timeslotsTotal,
        int subjectsCreated,
        int demandsCreated,
        long demandsTotal,
        int totalWeeklyLessons,
        Map<String, Integer> lessonsPerClass
    ) {
    }

    public List<SeedPresetSummary> listPresets() {
        return EtecSeedCatalog.allPresets().stream()
            .map(preset -> new SeedPresetSummary(
                preset.id(),
                preset.name(),
                preset.description(),
                preset.professors().size(),
                preset.classGroups().size(),
                preset.demands().size(),
                preset.demands().stream().mapToInt(DemandSeed::quantityPerWeek).sum()
            ))
            .toList();
    }

    /**
     * Aplica um preset curricular dentro de uma única transação idempotente.
     */
    @Transactional
    public SeedExecutionResult applyPreset(String presetId, boolean reset) {
        SeedPreset preset = EtecSeedCatalog.findById(presetId);
        if (preset == null) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Preset de seed nao encontrado: " + presetId
            );
        }

        if (reset) {
            backupService.resetAll();
        }

        Map<String, Professor> profMap = new LinkedHashMap<>();
        for (Professor p : professorRepository.findAll()) {
            profMap.put(p.getName().trim().toUpperCase(Locale.ROOT), p);
        }

        int professorsCreated = 0;
        for (String profName : preset.professors()) {
            String key = profName.trim().toUpperCase(Locale.ROOT);
            if (!profMap.containsKey(key)) {
                Professor p = new Professor();
                p.setName(profName.trim());
                profMap.put(key, professorRepository.save(p));
                professorsCreated++;
            }
        }

        Map<String, ClassGroup> classMap = new LinkedHashMap<>();
        for (ClassGroup cg : classGroupRepository.findAll()) {
            classMap.put(cg.getName().trim().toUpperCase(Locale.ROOT), cg);
        }

        int classGroupsCreated = 0;
        for (ClassGroupSeed cgSeed : preset.classGroups()) {
            String key = cgSeed.name().trim().toUpperCase(Locale.ROOT);
            if (!classMap.containsKey(key)) {
                ClassGroup cg = new ClassGroup();
                cg.setName(cgSeed.name().trim());
                cg.setShiftType(cgSeed.shiftType());
                classMap.put(key, classGroupRepository.save(cg));
                classGroupsCreated++;
            }
        }

        var slotResult = timeslotService.createDefaultEtecSchedule();

        int subjectsCreated = 0;
        int demandsCreated = 0;
        Map<String, Integer> lessonsPerClass = new LinkedHashMap<>();
        for (ClassGroupSeed cgSeed : preset.classGroups()) {
            lessonsPerClass.put(cgSeed.name(), 0);
        }

        for (DemandSeed demandSeed : preset.demands()) {
            ClassGroup cg = classMap.get(demandSeed.classGroupName().trim().toUpperCase(Locale.ROOT));
            if (cg == null) {
                continue;
            }

            Subject subject = subjectRepository
                .findByNameIgnoreCaseAndClassGroupId(demandSeed.subjectName().trim(), cg.getId())
                .orElse(null);

            if (subject == null) {
                subject = new Subject();
                subject.setName(demandSeed.subjectName().trim());
                subject.setClassGroup(cg);
                subject.setDoubleLessonAllowed(demandSeed.allowDoubleLesson());
                subject = subjectRepository.save(subject);
                subjectsCreated++;
            }

            if (!demandRepository.existsBySubjectId(subject.getId())) {
                Set<Professor> assignedProfs = new LinkedHashSet<>();
                for (String profName : demandSeed.professorNames()) {
                    Professor p = profMap.get(profName.trim().toUpperCase(Locale.ROOT));
                    if (p != null) {
                        assignedProfs.add(p);
                    }
                }
                if (!assignedProfs.isEmpty()) {
                    Demand d = new Demand();
                    d.setSubject(subject);
                    d.setQuantityPerWeek(demandSeed.quantityPerWeek());
                    d.setAllowDoubleLesson(demandSeed.allowDoubleLesson());
                    d.setProfessors(assignedProfs);
                    demandRepository.save(d);
                    demandsCreated++;
                }
            }

            lessonsPerClass.merge(cg.getName(), demandSeed.quantityPerWeek(), Integer::sum);
        }

        int totalWeeklyLessons = demandRepository.findAll().stream()
            .mapToInt(Demand::getQuantityPerWeek)
            .sum();

        return new SeedExecutionResult(
            preset.id(),
            preset.name(),
            reset,
            professorsCreated,
            professorRepository.count(),
            classGroupsCreated,
            classGroupRepository.count(),
            slotResult.created(),
            slotResult.total(),
            subjectsCreated,
            demandsCreated,
            demandRepository.count(),
            totalWeeklyLessons,
            lessonsPerClass
        );
    }
}

