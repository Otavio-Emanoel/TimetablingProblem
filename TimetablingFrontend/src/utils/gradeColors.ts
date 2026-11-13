/**
 * Paleta e temas de cores por área de conhecimento para a Grade Horária da ETEC.
 * Usado tanto para a interface web (classes Tailwind) quanto para a exportação de PDF (RGB).
 */

export interface ColorTheme {
  category: string;
  // Classes CSS para a Web
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  subtextClass: string;
  // Valores RGB para jsPDF / autoTable
  pdfFill: [number, number, number];
  pdfText: [number, number, number];
  pdfSubtext: [number, number, number];
  pdfBorder: [number, number, number];
}

const THEMES: Record<string, ColorTheme> = {
  linguagens: {
    category: "Linguagens & Comunicação",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-300",
    textClass: "text-emerald-950",
    badgeClass: "bg-emerald-100 text-emerald-800",
    subtextClass: "text-emerald-700",
    pdfFill: [209, 250, 229],     // emerald-100
    pdfText: [6, 78, 59],         // emerald-900
    pdfSubtext: [4, 120, 87],     // emerald-700
    pdfBorder: [110, 231, 183],   // emerald-300
  },
  matematica: {
    category: "Matemática & Lógica",
    bgClass: "bg-sky-50",
    borderClass: "border-sky-300",
    textClass: "text-sky-950",
    badgeClass: "bg-sky-100 text-sky-800",
    subtextClass: "text-sky-700",
    pdfFill: [224, 242, 254],     // sky-100
    pdfText: [12, 74, 110],       // sky-900
    pdfSubtext: [3, 105, 161],    // sky-700
    pdfBorder: [125, 211, 252],   // sky-300
  },
  natureza: {
    category: "Ciências da Natureza",
    bgClass: "bg-teal-50",
    borderClass: "border-teal-300",
    textClass: "text-teal-950",
    badgeClass: "bg-teal-100 text-teal-800",
    subtextClass: "text-teal-700",
    pdfFill: [204, 251, 241],     // teal-100
    pdfText: [19, 78, 74],        // teal-900
    pdfSubtext: [15, 118, 110],   // teal-700
    pdfBorder: [94, 234, 212],    // teal-300
  },
  humanas: {
    category: "Ciências Humanas",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-300",
    textClass: "text-amber-950",
    badgeClass: "bg-amber-100 text-amber-800",
    subtextClass: "text-amber-700",
    pdfFill: [254, 243, 199],     // amber-100
    pdfText: [120, 53, 15],       // amber-900
    pdfSubtext: [180, 83, 9],     // amber-700
    pdfBorder: [252, 211, 77],    // amber-300
  },
  tecnologia: {
    category: "Tecnologia & Específica",
    bgClass: "bg-indigo-50",
    borderClass: "border-indigo-300",
    textClass: "text-indigo-950",
    badgeClass: "bg-indigo-100 text-indigo-800",
    subtextClass: "text-indigo-700",
    pdfFill: [224, 231, 255],     // indigo-100
    pdfText: [49, 46, 129],       // indigo-900
    pdfSubtext: [67, 56, 202],    // indigo-700
    pdfBorder: [165, 180, 252],   // indigo-300
  },
  artes: {
    category: "Artes & Design",
    bgClass: "bg-fuchsia-50",
    borderClass: "border-fuchsia-300",
    textClass: "text-fuchsia-950",
    badgeClass: "bg-fuchsia-100 text-fuchsia-800",
    subtextClass: "text-fuchsia-700",
    pdfFill: [250, 232, 255],     // fuchsia-100
    pdfText: [112, 26, 117],      // fuchsia-900
    pdfSubtext: [162, 28, 175],   // fuchsia-700
    pdfBorder: [240, 171, 252],   // fuchsia-300
  },
  educacaoFisica: {
    category: "Educação Física & Ergonomia",
    bgClass: "bg-lime-50",
    borderClass: "border-lime-300",
    textClass: "text-lime-950",
    badgeClass: "bg-lime-100 text-lime-800",
    subtextClass: "text-lime-700",
    pdfFill: [236, 252, 203],     // lime-100
    pdfText: [54, 83, 20],        // lime-900
    pdfSubtext: [77, 124, 15],    // lime-700
    pdfBorder: [190, 242, 100],   // lime-300
  },
  gestao: {
    category: "Gestão, Negócios & TCC",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-300",
    textClass: "text-violet-950",
    badgeClass: "bg-violet-100 text-violet-800",
    subtextClass: "text-violet-700",
    pdfFill: [237, 233, 254],     // violet-100
    pdfText: [76, 29, 149],       // violet-900
    pdfSubtext: [109, 40, 217],   // violet-700
    pdfBorder: [196, 181, 253],   // violet-300
  },
  vago: {
    category: "Horário Vago",
    bgClass: "bg-slate-50",
    borderClass: "border-slate-200 border-dashed",
    textClass: "text-slate-400",
    badgeClass: "bg-slate-100 text-slate-500",
    subtextClass: "text-slate-400",
    pdfFill: [248, 250, 252],     // slate-50
    pdfText: [148, 163, 184],     // slate-400
    pdfSubtext: [148, 163, 184],  // slate-400
    pdfBorder: [226, 232, 240],   // slate-200
  },
};

/**
 * Retorna o tema visual baseado no nome da disciplina.
 */
export function getSubjectTheme(subjectName?: string): ColorTheme {
  if (!subjectName || !subjectName.trim()) {
    return THEMES.vago;
  }

  const n = subjectName.toLowerCase();

  // Linguagens
  if (
    n.includes("portug") ||
    n.includes("ingl") ||
    n.includes("literat") ||
    n.includes("comunica") ||
    n.includes("linguagens") ||
    n.includes("lpc") ||
    n.includes("lpl")
  ) {
    return THEMES.linguagens;
  }

  // Matemática
  if (
    n.includes("matem") ||
    n.includes("cálculo") ||
    n.includes("eamt")
  ) {
    return THEMES.matematica;
  }

  // Educação Física / Ergonomia (antes de Natureza para não colidir com "física")
  if (
    n.includes("educação física") ||
    n.includes("educacao fisica") ||
    n.includes("ed. fis") ||
    n.includes("ergonomia") ||
    n.includes("ergo")
  ) {
    return THEMES.educacaoFisica;
  }

  // Ciências da Natureza
  if (
    n.includes("físic") ||
    n.includes("químic") ||
    n.includes("biol") ||
    n.includes("natureza") ||
    n.includes("eacnt")
  ) {
    return THEMES.natureza;
  }

  // Ciências Humanas
  if (
    n.includes("histór") ||
    n.includes("geogr") ||
    n.includes("filos") ||
    n.includes("sociol") ||
    n.includes("humanas") ||
    n.includes("eachsa")
  ) {
    return THEMES.humanas;
  }

  // Artes e Design
  if (
    n.includes("arte") ||
    n.includes("design") ||
    n.includes("visual") ||
    n.includes("game art") ||
    n.includes("animação") ||
    n.includes("modelagem") ||
    n.includes("ilustração") ||
    n.includes("mobiliário") ||
    n.includes("projetiva") ||
    n.includes("espafos") ||
    n.includes("efêmeros")
  ) {
    return THEMES.artes;
  }

  // Gestão, Negócios, Rotinas e TCC
  if (
    n.includes("tcc") ||
    n.includes("planejamento") ||
    n.includes("administra") ||
    n.includes("rotinas") ||
    n.includes("custos") ||
    n.includes("modelos") ||
    n.includes("negócios") ||
    n.includes("empreendedorismo") ||
    n.includes("recursos humanos") ||
    n.includes("logíst") ||
    n.includes("afo") ||
    n.includes("empresar") ||
    n.includes("ética") ||
    n.includes("conduta") ||
    n.includes("trabalho") ||
    n.includes("marketing")
  ) {
    return THEMES.gestao;
  }

  // Tecnologia da Informação / Específica
  return THEMES.tecnologia;
}

/**
 * Retorna lista de legendas de áreas para renderizar na tela ou no PDF.
 */
export function getLegendCategories(): Array<{ name: string; theme: ColorTheme }> {
  return [
    { name: "Linguagens", theme: THEMES.linguagens },
    { name: "Matemática", theme: THEMES.matematica },
    { name: "Natureza", theme: THEMES.natureza },
    { name: "Humanas", theme: THEMES.humanas },
    { name: "Técnica / TI", theme: THEMES.tecnologia },
    { name: "Artes / Design", theme: THEMES.artes },
    { name: "Ed. Física", theme: THEMES.educacaoFisica },
    { name: "Gestão / TCC", theme: THEMES.gestao },
  ];
}

