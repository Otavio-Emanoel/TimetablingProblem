package com.etec.timetabling.service;

import com.etec.timetabling.domain.ClassGroup;
import com.etec.timetabling.domain.Professor;
import com.etec.timetabling.domain.ScheduleEntry;
import com.etec.timetabling.domain.ShiftType;
import com.etec.timetabling.domain.Timeslot;
import com.etec.timetabling.repository.ClassGroupRepository;
import com.etec.timetabling.repository.ProfessorRepository;
import com.etec.timetabling.repository.ScheduleEntryRepository;
import com.etec.timetabling.repository.TimeslotRepository;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Serviço responsável pela geração server-side de relatórios em PDF vetorial
 * (via OpenPDF) e planilhas CSV seguras contra Formula Injection.
 */
@Service
public class ExportService {

    private static final int[] WEEKDAYS = {1, 2, 3, 4, 5};
    private static final String[] WEEKDAY_LABELS = {
        "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"
    };
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter GENERATED_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private static final Color HEADER_BG = new Color(30, 27, 75);
    private static final Color TIME_COL_BG = new Color(241, 245, 249);
    private static final Color TITLE_COLOR = new Color(15, 23, 42);
    private static final Color MUTED_COLOR = new Color(100, 116, 139);
    private static final Color GRID_BORDER = new Color(203, 213, 225);

    private final ClassGroupRepository classGroupRepository;
    private final ProfessorRepository professorRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final TimeslotRepository timeslotRepository;

    public ExportService(
        ClassGroupRepository classGroupRepository,
        ProfessorRepository professorRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        TimeslotRepository timeslotRepository
    ) {
        this.classGroupRepository = classGroupRepository;
        this.professorRepository = professorRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.timeslotRepository = timeslotRepository;
    }

    public record ExportedDocument(byte[] content, String filename, String contentType) {
    }

    private record TimeWindow(LocalTime start, LocalTime end) implements Comparable<TimeWindow> {
        @Override
        public int compareTo(TimeWindow other) {
            int cmp = this.start.compareTo(other.start);
            return cmp != 0 ? cmp : this.end.compareTo(other.end);
        }

        String label() {
            return start.format(TIME_FMT) + " - " + end.format(TIME_FMT);
        }
    }

    /**
     * Gera PDF compacto e colorido para uma única turma.
     */
    @Transactional(readOnly = true)
    public ExportedDocument exportClassGradePdf(Long classGroupId) {
        ClassGroup classGroup = classGroupRepository.findById(classGroupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Turma nao encontrada"));

        List<ScheduleEntry> entries = scheduleEntryRepository.findByClassGroupId(classGroupId);
        List<Timeslot> shiftTimeslots = timeslotRepository
            .findByShiftTypeOrderByDayOfWeekAscStartTimeAsc(classGroup.getShiftType());

        byte[] bytes = renderPdfDocument(document -> {
            renderClassPage(document, classGroup, entries, shiftTimeslots);
        });

        String safeName = sanitizeFilename(classGroup.getName());
        return new ExportedDocument(bytes, "grade-" + safeName + ".pdf", "application/pdf");
    }

    /**
     * Gera PDF multi-página com a grade horária de todas as turmas cadastradas.
     */
    @Transactional(readOnly = true)
    public ExportedDocument exportAllGradesPdf() {
        List<ClassGroup> classGroups = classGroupRepository.findAllByOrderByNameAsc();
        if (classGroups.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Nenhuma turma cadastrada para exportar");
        }

        Map<Long, List<ScheduleEntry>> entriesByClass = scheduleEntryRepository.findAll().stream()
            .collect(Collectors.groupingBy(e -> e.getClassGroup().getId()));
        Map<ShiftType, List<Timeslot>> slotsByShift = timeslotRepository
            .findAllByOrderByShiftTypeAscDayOfWeekAscStartTimeAsc().stream()
            .collect(Collectors.groupingBy(Timeslot::getShiftType));

        byte[] bytes = renderPdfDocument(document -> {
            for (int i = 0; i < classGroups.size(); i++) {
                if (i > 0) {
                    document.newPage();
                }
                ClassGroup cg = classGroups.get(i);
                List<ScheduleEntry> classEntries = entriesByClass.getOrDefault(cg.getId(), List.of());
                List<Timeslot> classSlots = slotsByShift.getOrDefault(cg.getShiftType(), List.of());
                renderClassPage(document, cg, classEntries, classSlots);
            }
        });

        return new ExportedDocument(bytes, "grade-etec-todas-turmas.pdf", "application/pdf");
    }

    /**
     * Gera PDF compacto para a grade individual de um professor.
     */
    @Transactional(readOnly = true)
    public ExportedDocument exportProfessorGradePdf(Long professorId) {
        Professor professor = professorRepository.findById(professorId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Professor nao encontrado"));

        List<ScheduleEntry> entries = scheduleEntryRepository.findByProfessorsId(professorId);
        List<Timeslot> allTimeslots = timeslotRepository.findAllByOrderByShiftTypeAscDayOfWeekAscStartTimeAsc();

        byte[] bytes = renderPdfDocument(document -> {
            renderProfessorPage(document, professor, entries, allTimeslots);
        });

        String safeName = sanitizeFilename(professor.getName());
        return new ExportedDocument(bytes, "grade-prof-" + safeName + ".pdf", "application/pdf");
    }

    /**
     * Gera CSV RFC-4180 com proteção contra Formula Injection para uma turma.
     */
    @Transactional(readOnly = true)
    public ExportedDocument exportClassGradeCsv(Long classGroupId) {
        ClassGroup classGroup = classGroupRepository.findById(classGroupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Turma nao encontrada"));

        List<ScheduleEntry> entries = scheduleEntryRepository.findByClassGroupId(classGroupId).stream()
            .sorted(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                .thenComparing(e -> e.getTimeslot().getStartTime()))
            .toList();

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("Turma;Dia;Inicio;Fim;Disciplina;Area;Professores\r\n");
        for (ScheduleEntry entry : entries) {
            Timeslot slot = entry.getTimeslot();
            String dayLabel = weekdayLabel(slot.getDayOfWeek());
            String profs = formatProfessors(entry.getProfessors());
            String area = SubjectAreaTheme.classify(entry.getSubject().getName()).getCategory();
            sb.append(csvCell(classGroup.getName())).append(';')
                .append(csvCell(dayLabel)).append(';')
                .append(csvCell(slot.getStartTime().format(TIME_FMT))).append(';')
                .append(csvCell(slot.getEndTime().format(TIME_FMT))).append(';')
                .append(csvCell(entry.getSubject().getName())).append(';')
                .append(csvCell(area)).append(';')
                .append(csvCell(profs)).append("\r\n");
        }

        String safeName = sanitizeFilename(classGroup.getName());
        return new ExportedDocument(
            sb.toString().getBytes(StandardCharsets.UTF_8),
            "grade-" + safeName + ".csv",
            "text/csv; charset=UTF-8"
        );
    }

    /**
     * Gera CSV RFC-4180 com proteção contra Formula Injection para um professor.
     */
    @Transactional(readOnly = true)
    public ExportedDocument exportProfessorGradeCsv(Long professorId) {
        Professor professor = professorRepository.findById(professorId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Professor nao encontrado"));

        List<ScheduleEntry> entries = scheduleEntryRepository.findByProfessorsId(professorId).stream()
            .sorted(Comparator.comparing((ScheduleEntry e) -> e.getTimeslot().getDayOfWeek())
                .thenComparing(e -> e.getTimeslot().getStartTime()))
            .toList();

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("Professor;Dia;Inicio;Fim;Turma;Turno;Disciplina;Area\r\n");
        for (ScheduleEntry entry : entries) {
            Timeslot slot = entry.getTimeslot();
            String area = SubjectAreaTheme.classify(entry.getSubject().getName()).getCategory();
            sb.append(csvCell(professor.getName())).append(';')
                .append(csvCell(weekdayLabel(slot.getDayOfWeek()))).append(';')
                .append(csvCell(slot.getStartTime().format(TIME_FMT))).append(';')
                .append(csvCell(slot.getEndTime().format(TIME_FMT))).append(';')
                .append(csvCell(entry.getClassGroup().getName())).append(';')
                .append(csvCell(entry.getClassGroup().getShiftType().name())).append(';')
                .append(csvCell(entry.getSubject().getName())).append(';')
                .append(csvCell(area)).append("\r\n");
        }

        String safeName = sanitizeFilename(professor.getName());
        return new ExportedDocument(
            sb.toString().getBytes(StandardCharsets.UTF_8),
            "grade-prof-" + safeName + ".csv",
            "text/csv; charset=UTF-8"
        );
    }

    /**
     * Gera CSV consolidado de todas as turmas e horários alocados.
     */
    @Transactional(readOnly = true)
    public ExportedDocument exportAllGradesCsv() {
        List<ScheduleEntry> entries = scheduleEntryRepository.findAll().stream()
            .sorted(Comparator.comparing((ScheduleEntry e) -> e.getClassGroup().getName())
                .thenComparing(e -> e.getTimeslot().getDayOfWeek())
                .thenComparing(e -> e.getTimeslot().getStartTime()))
            .toList();

        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("Turma;Turno;Dia;Inicio;Fim;Disciplina;Area;Professores\r\n");
        for (ScheduleEntry entry : entries) {
            Timeslot slot = entry.getTimeslot();
            String area = SubjectAreaTheme.classify(entry.getSubject().getName()).getCategory();
            sb.append(csvCell(entry.getClassGroup().getName())).append(';')
                .append(csvCell(entry.getClassGroup().getShiftType().name())).append(';')
                .append(csvCell(weekdayLabel(slot.getDayOfWeek()))).append(';')
                .append(csvCell(slot.getStartTime().format(TIME_FMT))).append(';')
                .append(csvCell(slot.getEndTime().format(TIME_FMT))).append(';')
                .append(csvCell(entry.getSubject().getName())).append(';')
                .append(csvCell(area)).append(';')
                .append(csvCell(formatProfessors(entry.getProfessors()))).append("\r\n");
        }

        return new ExportedDocument(
            sb.toString().getBytes(StandardCharsets.UTF_8),
            "grade-etec-consolidada.csv",
            "text/csv; charset=UTF-8"
        );
    }

    // ====================== PDF RENDERING ======================

    @FunctionalInterface
    private interface DocumentWriter {
        void write(Document document) throws DocumentException;
    }

    private byte[] renderPdfDocument(DocumentWriter writerCallback) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 22f, 22f, 20f, 26f);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterPageEvent());
            document.open();
            writerCallback.write(document);
            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao gerar PDF da grade horaria", ex);
        }
    }

    private void renderClassPage(
        Document document,
        ClassGroup classGroup,
        List<ScheduleEntry> entries,
        List<Timeslot> shiftTimeslots
    ) throws DocumentException {
        Set<TimeWindow> windows = collectTimeWindows(shiftTimeslots, entries);
        int totalSlots = Math.max(windows.size() * WEEKDAYS.length, entries.size());
        int freeSlots = Math.max(0, totalSlots - entries.size());

        String subtitle = String.format(
            "Turno: %s   |   Aulas alocadas: %d   |   Horários vagos: %d   |   Gerado em %s",
            shiftLabel(classGroup.getShiftType()),
            entries.size(),
            freeSlots,
            LocalDateTime.now(ZoneId.of("America/Sao_Paulo")).format(GENERATED_FMT)
        );
        addHeaderBlock(document, "Grade Horária — Turma " + classGroup.getName(), subtitle);

        Map<String, ScheduleEntry> lookup = buildLookup(entries);
        renderScheduleGrid(document, windows, lookup, false);
        addLegendBar(document);
    }

    private void renderProfessorPage(
        Document document,
        Professor professor,
        List<ScheduleEntry> entries,
        List<Timeslot> allTimeslots
    ) throws DocumentException {
        Set<ShiftType> activeShifts = entries.stream()
            .map(e -> e.getTimeslot().getShiftType())
            .collect(Collectors.toSet());
        List<Timeslot> relevantSlots = activeShifts.isEmpty()
            ? allTimeslots.stream().filter(t -> t.getShiftType() == ShiftType.INTEGRAL).toList()
            : allTimeslots.stream().filter(t -> activeShifts.contains(t.getShiftType())).toList();

        Set<TimeWindow> windows = collectTimeWindows(relevantSlots, entries);
        long distinctClasses = entries.stream()
            .map(e -> e.getClassGroup().getName())
            .distinct()
            .count();

        String subtitle = String.format(
            "Carga horária: %d aulas/semana   |   Turmas atendidas: %d   |   Gerado em %s",
            entries.size(),
            distinctClasses,
            LocalDateTime.now(ZoneId.of("America/Sao_Paulo")).format(GENERATED_FMT)
        );
        addHeaderBlock(document, "Grade Individual — " + professor.getName(), subtitle);

        Map<String, ScheduleEntry> lookup = buildLookup(entries);
        renderScheduleGrid(document, windows, lookup, true);
        addLegendBar(document);
    }

    private void addHeaderBlock(Document document, String titleText, String subtitleText)
        throws DocumentException {
        Font titleFont = new Font(Font.HELVETICA, 12.5f, Font.BOLD, TITLE_COLOR);
        Font subtitleFont = new Font(Font.HELVETICA, 8f, Font.NORMAL, MUTED_COLOR);

        Paragraph title = new Paragraph(titleText, titleFont);
        title.setSpacingBefore(0f);
        title.setSpacingAfter(2f);
        document.add(title);

        Paragraph subtitle = new Paragraph(subtitleText, subtitleFont);
        subtitle.setSpacingBefore(0f);
        subtitle.setSpacingAfter(7f);
        document.add(subtitle);
    }

    private void renderScheduleGrid(
        Document document,
        Set<TimeWindow> windows,
        Map<String, ScheduleEntry> lookup,
        boolean showClassGroupInsteadOfProfessors
    ) throws DocumentException {
        PdfPTable table = new PdfPTable(new float[]{11.5f, 17.7f, 17.7f, 17.7f, 17.7f, 17.7f});
        table.setWidthPercentage(100f);
        table.setSpacingAfter(6f);

        Font headerFont = new Font(Font.HELVETICA, 8.2f, Font.BOLD, Color.WHITE);
        table.addCell(createHeaderCell("Horário", headerFont));
        for (String dayLabel : WEEKDAY_LABELS) {
            table.addCell(createHeaderCell(dayLabel, headerFont));
        }

        int rowCount = Math.max(windows.size(), 1);
        float rowHeight = rowCount <= 6 ? 50f : (rowCount <= 8 ? 41f : 27f);
        float primarySize = rowCount <= 8 ? 7.6f : 6.7f;
        float secondarySize = rowCount <= 8 ? 6.6f : 5.9f;
        Font timeFont = new Font(Font.HELVETICA, 7.3f, Font.BOLD, TITLE_COLOR);

        if (windows.isEmpty()) {
            PdfPCell emptyNotice = new PdfPCell(new Phrase("Nenhum horário cadastrado.", new Font(Font.HELVETICA, 9f, Font.ITALIC, MUTED_COLOR)));
            emptyNotice.setColspan(6);
            emptyNotice.setHorizontalAlignment(Element.ALIGN_CENTER);
            emptyNotice.setVerticalAlignment(Element.ALIGN_MIDDLE);
            emptyNotice.setMinimumHeight(48f);
            emptyNotice.setBackgroundColor(SubjectAreaTheme.VAGO.getFillColor());
            emptyNotice.setBorderColor(GRID_BORDER);
            table.addCell(emptyNotice);
            document.add(table);
            return;
        }

        for (TimeWindow window : windows) {
            PdfPCell timeCell = new PdfPCell(new Phrase(window.label(), timeFont));
            timeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            timeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            timeCell.setBackgroundColor(TIME_COL_BG);
            timeCell.setBorderColor(GRID_BORDER);
            timeCell.setBorderWidth(0.7f);
            timeCell.setMinimumHeight(rowHeight);
            timeCell.setPadding(3f);
            table.addCell(timeCell);

            for (int day : WEEKDAYS) {
                ScheduleEntry entry = lookup.get(slotKey(day, window.start(), window.end()));
                table.addCell(createEntryCell(
                    entry,
                    rowHeight,
                    primarySize,
                    secondarySize,
                    showClassGroupInsteadOfProfessors
                ));
            }
        }

        document.add(table);
    }

    private PdfPCell createHeaderCell(String label, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(label, font));
        cell.setBackgroundColor(HEADER_BG);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBorderColor(HEADER_BG);
        cell.setPaddingTop(5f);
        cell.setPaddingBottom(5f);
        return cell;
    }

    private PdfPCell createEntryCell(
        ScheduleEntry entry,
        float rowHeight,
        float primarySize,
        float secondarySize,
        boolean showClassGroupInsteadOfProfessors
    ) {
        if (entry == null) {
            SubjectAreaTheme emptyTheme = SubjectAreaTheme.VAGO;
            Font emptyFont = new Font(Font.HELVETICA, primarySize, Font.ITALIC, emptyTheme.getTextColor());
            PdfPCell cell = new PdfPCell(new Phrase("Vago", emptyFont));
            cell.setBackgroundColor(emptyTheme.getFillColor());
            cell.setBorderColor(emptyTheme.getBorderColor());
            cell.setBorderWidth(0.6f);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setMinimumHeight(rowHeight);
            cell.setPadding(3f);
            return cell;
        }

        SubjectAreaTheme theme = SubjectAreaTheme.classify(entry.getSubject().getName());
        Font titleFont = new Font(Font.HELVETICA, primarySize, Font.BOLD, theme.getTextColor());
        Font subFont = new Font(Font.HELVETICA, secondarySize, Font.NORMAL, theme.getSubtextColor());

        String primaryLine = entry.getSubject().getName();
        String secondaryLine = showClassGroupInsteadOfProfessors
            ? "Turma " + entry.getClassGroup().getName()
            : formatProfessors(entry.getProfessors());

        Paragraph content = new Paragraph();
        content.setAlignment(Element.ALIGN_CENTER);
        content.setLeading(primarySize + 1.8f);
        content.add(new Chunk(primaryLine, titleFont));
        if (!secondaryLine.isBlank()) {
            content.add(Chunk.NEWLINE);
            content.add(new Chunk(secondaryLine, subFont));
        }

        PdfPCell cell = new PdfPCell();
        cell.addElement(content);
        cell.setBackgroundColor(theme.getFillColor());
        cell.setBorderColor(theme.getBorderColor());
        cell.setBorderWidth(0.9f);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setMinimumHeight(rowHeight);
        cell.setPaddingTop(2.5f);
        cell.setPaddingBottom(2.5f);
        cell.setPaddingLeft(3.5f);
        cell.setPaddingRight(3.5f);
        return cell;
    }

    private void addLegendBar(Document document) throws DocumentException {
        List<SubjectAreaTheme> categories = SubjectAreaTheme.legendCategories();
        PdfPTable legend = new PdfPTable(categories.size());
        legend.setWidthPercentage(100f);

        for (SubjectAreaTheme theme : categories) {
            Font font = new Font(Font.HELVETICA, 6.7f, Font.BOLD, theme.getTextColor());
            PdfPCell cell = new PdfPCell(new Phrase(theme.getLegendLabel(), font));
            cell.setBackgroundColor(theme.getFillColor());
            cell.setBorderColor(theme.getBorderColor());
            cell.setBorderWidth(0.7f);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPaddingTop(2.5f);
            cell.setPaddingBottom(2.5f);
            legend.addCell(cell);
        }
        document.add(legend);
    }

    private static class FooterPageEvent extends PdfPageEventHelper {
        private static final Font FOOTER_FONT = new Font(Font.HELVETICA, 7f, Font.NORMAL, MUTED_COLOR);

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            Rectangle pageSize = document.getPageSize();
            ColumnText.showTextAligned(
                cb,
                Element.ALIGN_LEFT,
                new Phrase("EtecFlow — Sistema de Alocação Escolar", FOOTER_FONT),
                document.leftMargin(),
                12f,
                0
            );
            ColumnText.showTextAligned(
                cb,
                Element.ALIGN_RIGHT,
                new Phrase("Página " + writer.getPageNumber(), FOOTER_FONT),
                pageSize.getRight() - document.rightMargin(),
                12f,
                0
            );
        }
    }

    // ====================== HELPERS ======================

    private Set<TimeWindow> collectTimeWindows(List<Timeslot> baseSlots, List<ScheduleEntry> entries) {
        Set<TimeWindow> windows = new TreeSet<>();
        for (Timeslot slot : baseSlots) {
            windows.add(new TimeWindow(slot.getStartTime(), slot.getEndTime()));
        }
        for (ScheduleEntry entry : entries) {
            Timeslot slot = entry.getTimeslot();
            windows.add(new TimeWindow(slot.getStartTime(), slot.getEndTime()));
        }
        return windows;
    }

    private Map<String, ScheduleEntry> buildLookup(List<ScheduleEntry> entries) {
        Map<String, ScheduleEntry> lookup = new LinkedHashMap<>();
        for (ScheduleEntry entry : entries) {
            Timeslot slot = entry.getTimeslot();
            lookup.putIfAbsent(slotKey(slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime()), entry);
        }
        return lookup;
    }

    private String slotKey(int dayOfWeek, LocalTime start, LocalTime end) {
        return dayOfWeek + "|" + start + "|" + end;
    }

    private String formatProfessors(Set<Professor> professors) {
        if (professors == null || professors.isEmpty()) {
            return "Sem professor";
        }
        return professors.stream()
            .map(Professor::getName)
            .filter(Objects::nonNull)
            .sorted()
            .collect(Collectors.joining(", "));
    }

    private String shiftLabel(ShiftType shiftType) {
        return switch (shiftType) {
            case REGULAR -> "Regular (Manhã/Noite - 6 aulas/dia)";
            case INTEGRAL -> "Integral / Novotec (8 aulas/dia)";
        };
    }

    private String weekdayLabel(int dayOfWeek) {
        return switch (dayOfWeek) {
            case 1 -> "Segunda-feira";
            case 2 -> "Terça-feira";
            case 3 -> "Quarta-feira";
            case 4 -> "Quinta-feira";
            case 5 -> "Sexta-feira";
            case 6 -> "Sábado";
            case 7 -> "Domingo";
            default -> "Dia " + dayOfWeek;
        };
    }

    /**
     * Escapa valor CSV conforme RFC-4180 e neutraliza payloads de Formula Injection
     * (células começando com =, +, -, @, TAB ou CR recebem prefixo apostrofo).
     */
    static String csvCell(String rawValue) {
        String value = rawValue == null ? "" : rawValue;
        String trimmedStart = value.stripLeading();
        if (!trimmedStart.isEmpty()) {
            char first = trimmedStart.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
                value = "'" + value;
            }
        }
        boolean needsQuotes = value.contains(";") || value.contains(",")
            || value.contains("\"") || value.contains("\n") || value.contains("\r");
        if (!needsQuotes) {
            return value;
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private String sanitizeFilename(String input) {
        String base = (input == null ? "export" : input)
            .toLowerCase()
            .replaceAll("[^a-z0-9\\-_]+", "-")
            .replaceAll("^-+|-+$", "");
        return base.isBlank() ? "export" : base;
    }
}

