package com.etec.timetabling.web;

import com.etec.timetabling.service.AnalyticsService;
import com.etec.timetabling.service.AnalyticsService.ProfessorWorkloadReport;
import com.etec.timetabling.service.AnalyticsService.SchoolOverviewReport;
import com.etec.timetabling.service.AnalyticsService.ThemeDistributionItem;
import com.etec.timetabling.service.AnalyticsService.WeekdayMatrixItem;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints analíticos de carga docente, distribuição temática e matriz semanal.
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public SchoolOverviewReport getOverview() {
        return analyticsService.getOverview();
    }

    @GetMapping("/professors/workload")
    public List<ProfessorWorkloadReport> getProfessorWorkloads() {
        return analyticsService.getProfessorWorkloads();
    }

    @GetMapping("/subjects/themes")
    public List<ThemeDistributionItem> getSubjectThemeDistribution() {
        return analyticsService.getSubjectThemeDistribution();
    }

    @GetMapping("/availability-matrix")
    public List<WeekdayMatrixItem> getWeekdayAvailabilityMatrix() {
        return analyticsService.getWeekdayAvailabilityMatrix();
    }
}

