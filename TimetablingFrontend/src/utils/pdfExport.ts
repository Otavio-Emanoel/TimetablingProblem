import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ClassGradeData } from "@/types";
import { getSubjectTheme, getLegendCategories } from "./gradeColors";

export interface TimeRow {
  startTime: string;
  endTime: string;
}

export interface ClassGradeItem {
  subject: string;
  professors: string[];
}

export interface ProfessorGradeItem {
  subject: string;
  classGroupName: string;
}

/**
 * Desenha a faixa superior institucional e o cabeçalho da folha.
 */
function drawHeader(
  pdf: jsPDF,
  title: string,
  subtitle: string,
  extraInfo?: string
) {
  // Faixa superior institucional (Slate 800)
  pdf.setFillColor(30, 41, 59);
  pdf.roundedRect(10, 8, 277, 15, 2, 2, "F");

  // Título em destaque
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(title, 15, 18);

  // Subtítulo à direita
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text(subtitle, 282, 18, { align: "right" });

  // Linha de informações complementares abaixo da barra
  if (extraInfo) {
    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text(extraInfo, 11, 28);
  }
}

/**
 * Desenha a legenda de cores no rodapé da página.
 */
function drawFooterLegend(pdf: jsPDF, yPosition: number) {
  const legendItems = getLegendCategories();
  const startX = 11;
  const itemWidth = 33;

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(100, 116, 139);
  pdf.text("LEGENDA POR ÁREA:", startX, yPosition);

  let currentX = startX + 30;
  for (const item of legendItems) {
    // Quadrado de cor
    pdf.setFillColor(...item.theme.pdfFill);
    pdf.setDrawColor(...item.theme.pdfBorder);
    pdf.setLineWidth(0.2);
    pdf.rect(currentX, yPosition - 3, 4, 4, "FD");

    // Rótulo
    pdf.setTextColor(...item.theme.pdfText);
    pdf.setFont("helvetica", "normal");
    pdf.text(item.name, currentX + 5.5, yPosition);

    currentX += itemWidth;
  }

  // Linha final de rodapé
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(10, 201, 287, 201);

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    `EtecFlow Timetabling • Centro Paula Souza • Documento Oficial gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    10,
    205
  );
  pdf.text("Página " + pdf.getCurrentPageInfo().pageNumber, 287, 205, { align: "right" });
}

/**
 * Exporta a grade horária de UMA TURMA em PDF compacto e colorido.
 */
export function exportClassGradePdf(params: {
  className: string;
  shiftType: string;
  timeRows: TimeRow[];
  gradeMap: Map<string, ClassGradeItem>;
  filename?: string;
}) {
  const { className, shiftType, timeRows, gradeMap } = params;
  const filename = params.filename || `grade-${className.toLowerCase()}.pdf`;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Conta aulas e vagas
  let totalAllocated = 0;
  for (const row of timeRows) {
    for (let day = 1; day <= 5; day++) {
      if (gradeMap.has(`${day}-${row.startTime}-${row.endTime}`)) {
        totalAllocated++;
      }
    }
  }
  const maxSlots = shiftType === "INTEGRAL" ? 40 : 30;
  const freeSlots = Math.max(0, maxSlots - totalAllocated);

  drawHeader(
    pdf,
    `GRADE HORÁRIA SEMANAL — TURMA: ${className.toUpperCase()}`,
    `TURNO ${shiftType.toUpperCase()} • ETEC`,
    `Aulas Semanais: ${totalAllocated}  |  Aulas Vagas: ${freeSlots} por semana  |  Horários: ${timeRows.length} slots/dia`
  );

  // Monta as linhas da tabela
  const days = [1, 2, 3, 4, 5];
  const body = timeRows.map((row) => {
    const rowCells: any[] = [
      {
        content: `${row.startTime}\nàs\n${row.endTime}`,
        styles: {
          fontStyle: "bold",
          fillColor: [248, 250, 252],
          textColor: [51, 65, 85],
          halign: "center",
          valign: "middle",
          fontSize: 7.5,
        },
      },
    ];

    for (const day of days) {
      const key = `${day}-${row.startTime}-${row.endTime}`;
      const item = gradeMap.get(key);

      if (item) {
        const theme = getSubjectTheme(item.subject);
        const profStr = item.professors?.length ? item.professors.join(" + ") : "";
        rowCells.push({
          content: `${item.subject}\n${profStr ? `Prof. ${profStr}` : ""}`,
          styles: {
            fillColor: theme.pdfFill,
            textColor: theme.pdfText,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
            lineColor: theme.pdfBorder,
            lineWidth: 0.3,
            fontSize: 8,
          },
        });
      } else {
        rowCells.push({
          content: "— Livre —",
          styles: {
            fillColor: [250, 250, 250],
            textColor: [160, 160, 160],
            fontStyle: "italic",
            halign: "center",
            valign: "middle",
            lineColor: [230, 230, 230],
            lineWidth: 0.15,
            fontSize: 7.5,
          },
        });
      }
    }

    return rowCells;
  });

  // Altura dinâmica de linha para caber perfeitamente na página A4
  const rowHeight = timeRows.length <= 6 ? 23 : 18;

  autoTable(pdf, {
    startY: 31,
    margin: { left: 10, right: 10 },
    tableWidth: 277,
    theme: "grid",
    head: [["Horário", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]],
    body,
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
      minCellHeight: 8,
    },
    styles: {
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      minCellHeight: rowHeight,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 50 },
      5: { cellWidth: 50 },
    },
  });

  const finalY = (pdf as any).lastAutoTable?.finalY || 180;
  drawFooterLegend(pdf, Math.min(196, finalY + 5));

  pdf.save(filename);
}

/**
 * Exporta a agenda de UM PROFESSOR em PDF compacto e colorido.
 */
export function exportProfessorGradePdf(params: {
  professorName: string;
  timeRows: TimeRow[];
  gradeMap: Map<string, ProfessorGradeItem>;
  filename?: string;
}) {
  const { professorName, timeRows, gradeMap } = params;
  const filename = params.filename || `agenda-${professorName.toLowerCase().replace(/\s+/g, "-")}.pdf`;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  let totalAllocated = 0;
  for (const row of timeRows) {
    for (let day = 1; day <= 5; day++) {
      if (gradeMap.has(`${day}-${row.startTime}-${row.endTime}`)) {
        totalAllocated++;
      }
    }
  }

  drawHeader(
    pdf,
    `AGENDA SEMANAL DOCENTE — PROF. ${professorName.toUpperCase()}`,
    "CENTRO PAULA SOUZA • ETEC",
    `Carga Horária Semanal Alocada: ${totalAllocated} aulas  |  Horários Disponíveis da Escola: ${timeRows.length} slots`
  );

  const days = [1, 2, 3, 4, 5];
  const body = timeRows.map((row) => {
    const rowCells: any[] = [
      {
        content: `${row.startTime}\nàs\n${row.endTime}`,
        styles: {
          fontStyle: "bold",
          fillColor: [248, 250, 252],
          textColor: [51, 65, 85],
          halign: "center",
          valign: "middle",
          fontSize: 7.5,
        },
      },
    ];

    for (const day of days) {
      const key = `${day}-${row.startTime}-${row.endTime}`;
      const item = gradeMap.get(key);

      if (item) {
        const theme = getSubjectTheme(item.subject);
        rowCells.push({
          content: `${item.subject}\nTurma: ${item.classGroupName}`,
          styles: {
            fillColor: theme.pdfFill,
            textColor: theme.pdfText,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
            lineColor: theme.pdfBorder,
            lineWidth: 0.3,
            fontSize: 8,
          },
        });
      } else {
        rowCells.push({
          content: "— Disponível —",
          styles: {
            fillColor: [250, 250, 250],
            textColor: [160, 160, 160],
            fontStyle: "italic",
            halign: "center",
            valign: "middle",
            lineColor: [230, 230, 230],
            lineWidth: 0.15,
            fontSize: 7.5,
          },
        });
      }
    }

    return rowCells;
  });

  const rowHeight = timeRows.length <= 6 ? 23 : 18;

  autoTable(pdf, {
    startY: 31,
    margin: { left: 10, right: 10 },
    tableWidth: 277,
    theme: "grid",
    head: [["Horário", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]],
    body,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
      minCellHeight: 8,
    },
    styles: {
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      minCellHeight: rowHeight,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 50 },
      5: { cellWidth: 50 },
    },
  });

  const finalY = (pdf as any).lastAutoTable?.finalY || 180;
  drawFooterLegend(pdf, Math.min(196, finalY + 5));

  pdf.save(filename);
}

/**
 * Exporta TODAS AS GRADES em um único arquivo PDF com 1 página por turma.
 */
export function exportAllGradesPdf(params: {
  allGradesData: Record<string, ClassGradeData>;
  timeRowsMap: {
    REGULAR: TimeRow[];
    INTEGRAL: TimeRow[];
  };
  filename?: string;
}) {
  const { allGradesData, timeRowsMap } = params;
  const filename = params.filename || "todas-as-grades-etec.pdf";

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const classNames = Object.keys(allGradesData).sort();
  let isFirstPage = true;

  for (const cName of classNames) {
    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;

    const data = allGradesData[cName];
    const shift = (data.shiftType || "INTEGRAL").toUpperCase() as "REGULAR" | "INTEGRAL";
    const timeRows = timeRowsMap[shift] || timeRowsMap.INTEGRAL;

    // Constrói o mapa de grade
    const gradeMap = new Map<string, ClassGradeItem>();
    for (const e of data.entries) {
      const key = `${e.dayOfWeek}-${e.startTime.slice(0, 5)}-${e.endTime.slice(0, 5)}`;
      gradeMap.set(key, {
        subject: e.subject,
        professors: e.professors,
      });
    }

    const totalAllocated = data.entries.length;
    const maxSlots = shift === "INTEGRAL" ? 40 : 30;
    const freeSlots = Math.max(0, maxSlots - totalAllocated);

    drawHeader(
      pdf,
      `GRADE HORÁRIA SEMANAL — TURMA: ${cName.toUpperCase()}`,
      `TURNO ${shift} • ETEC`,
      `Aulas Semanais: ${totalAllocated}  |  Aulas Vagas: ${freeSlots} por semana  |  Horários: ${timeRows.length} slots/dia`
    );

    const days = [1, 2, 3, 4, 5];
    const body = timeRows.map((row) => {
      const rowCells: any[] = [
        {
          content: `${row.startTime}\nàs\n${row.endTime}`,
          styles: {
            fontStyle: "bold",
            fillColor: [248, 250, 252],
            textColor: [51, 65, 85],
            halign: "center",
            valign: "middle",
            fontSize: 7.5,
          },
        },
      ];

      for (const day of days) {
        const key = `${day}-${row.startTime}-${row.endTime}`;
        const item = gradeMap.get(key);

        if (item) {
          const theme = getSubjectTheme(item.subject);
          const profStr = item.professors?.length ? item.professors.join(" + ") : "";
          rowCells.push({
            content: `${item.subject}\n${profStr ? `Prof. ${profStr}` : ""}`,
            styles: {
              fillColor: theme.pdfFill,
              textColor: theme.pdfText,
              fontStyle: "bold",
              halign: "center",
              valign: "middle",
              lineColor: theme.pdfBorder,
              lineWidth: 0.3,
              fontSize: 8,
            },
          });
        } else {
          rowCells.push({
            content: "— Livre —",
            styles: {
              fillColor: [250, 250, 250],
              textColor: [160, 160, 160],
              fontStyle: "italic",
              halign: "center",
              valign: "middle",
              lineColor: [230, 230, 230],
              lineWidth: 0.15,
              fontSize: 7.5,
            },
          });
        }
      }

      return rowCells;
    });

    const rowHeight = timeRows.length <= 6 ? 23 : 18;

    autoTable(pdf, {
      startY: 31,
      margin: { left: 10, right: 10 },
      tableWidth: 277,
      theme: "grid",
      head: [["Horário", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]],
      body,
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        valign: "middle",
        minCellHeight: 8,
      },
      styles: {
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        minCellHeight: rowHeight,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 27 },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 50 },
        4: { cellWidth: 50 },
        5: { cellWidth: 50 },
      },
    });

    const finalY = (pdf as any).lastAutoTable?.finalY || 180;
    drawFooterLegend(pdf, Math.min(196, finalY + 5));
  }

  pdf.save(filename);
}
