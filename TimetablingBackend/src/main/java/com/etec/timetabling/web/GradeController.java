package com.etec.timetabling.web;

import com.etec.timetabling.service.GradeAuditService;
import com.etec.timetabling.service.GradeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/grade")
public class GradeController {

    private final GradeService gradeService;
    private final GradeAuditService gradeAuditService;

    public GradeController(GradeService gradeService, GradeAuditService gradeAuditService) {
        this.gradeService = gradeService;
        this.gradeAuditService = gradeAuditService;
    }

    @GetMapping("/{classGroupId}")
    public List<GradeEntryResponse> list(@PathVariable Long classGroupId) {
        return gradeService.listByClassGroup(classGroupId);
    }

    @GetMapping("/todas")
    public Map<String, ClassGradeResponse> listAll() {
        return gradeService.listAllClassGrades();
    }

    @GetMapping("/turmas/resumo")
    public List<ClassGradeSummaryItem> listClassSummaries() {
        return gradeService.listClassSummaries();
    }

    @GetMapping("/professor/{professorId}")
    public List<ProfessorGradeEntryResponse> listByProfessor(@PathVariable Long professorId) {
        return gradeService.listByProfessor(professorId);
    }

    @GetMapping("/professores")
    public Map<String, ProfessorGradeResponse> listAllProfessors() {
        return gradeService.listAllProfessorGrades();
    }

    @PostMapping("/validar-movimento")
    public MoveValidationResponse previewMoveOrSwap(@Valid @RequestBody MoveGradeEntryRequest request) {
        return gradeService.previewMoveOrSwap(request);
    }

    @PostMapping("/mover")
    public MoveGradeEntryResponse moveOrSwapEntry(@Valid @RequestBody MoveGradeEntryRequest request) {
        return gradeService.moveOrSwapEntry(request);
    }

    @GetMapping("/auditoria")
    public GradeAuditResponse auditGrades() {
        return gradeAuditService.auditGrades();
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearAllGrades() {
        gradeService.clearAllGrades();
    }

    public record GradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        List<String> professors
    ) {}

    public record ClassGradeResponse(
        Long id,
        String name,
        String shiftType,
        List<GradeEntryResponse> entries
    ) {}

    public record ClassGradeSummaryItem(
        Long classGroupId,
        String classGroupName,
        String shiftType,
        int allocatedLessons,
        int demandedLessons,
        int totalSlots,
        int freeSlots,
        int subjectsCount
    ) {}

    public record ProfessorGradeEntryResponse(
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        String classGroup,
        String shiftType,
        List<String> professors
    ) {}

    public record ProfessorGradeResponse(
        Long id,
        String name,
        List<ProfessorGradeEntryResponse> entries
    ) {}

    public record MoveGradeEntryRequest(
        @NotNull @Positive Long classGroupId,
        @Min(1) @Max(7) int fromDay,
        @NotNull LocalTime fromStartTime,
        @Min(1) @Max(7) int toDay,
        @NotNull LocalTime toStartTime,
        boolean force
    ) {}

    public record MoveGradeEntryResponse(
        boolean swapped,
        String message
    ) {}

    public record MoveValidationResponse(
        boolean allowed,
        boolean willSwap,
        List<String> conflicts,
        String message
    ) {}

    public record MissingDemandItem(
        String subject,
        String classGroup,
        int demanded,
        int scheduled,
        int missing
    ) {}

    public record ProfessorStatItem(
        Long professorId,
        String professorName,
        int totalLessons,
        int classGroupsCount,
        int activeDays,
        int windowCount,
        int preferencesMatched,
        int preferencesTotal
    ) {}

    public record GradeAuditResponse(
        int totalDemandedLessons,
        int totalScheduledLessons,
        int qualityScore,
        int totalWindows,
        List<MissingDemandItem> missingDemands,
        List<String> professorConflicts,
        List<String> unavailabilityViolations,
        List<ProfessorStatItem> professorStats
    ) {}
}
