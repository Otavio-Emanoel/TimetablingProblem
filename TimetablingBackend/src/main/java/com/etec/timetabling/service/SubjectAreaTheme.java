package com.etec.timetabling.service;

import java.awt.Color;
import java.util.List;
import java.util.Locale;

/**
 * Classificação visual e semântica das áreas de conhecimento da ETEC.
 * Centraliza a paleta de cores para exportação em PDF e metadados de exibição.
 */
public enum SubjectAreaTheme {
    LINGUAGENS(
        "Linguagens & Comunicação",
        "Linguagens",
        new Color(209, 250, 229),
        new Color(6, 78, 59),
        new Color(4, 120, 87),
        new Color(110, 231, 183)
    ),
    MATEMATICA(
        "Matemática & Lógica",
        "Matemática",
        new Color(224, 242, 254),
        new Color(12, 74, 110),
        new Color(3, 105, 161),
        new Color(125, 211, 252)
    ),
    NATUREZA(
        "Ciências da Natureza",
        "Natureza",
        new Color(204, 251, 241),
        new Color(19, 78, 74),
        new Color(15, 118, 110),
        new Color(94, 234, 212)
    ),
    HUMANAS(
        "Ciências Humanas",
        "Humanas",
        new Color(254, 243, 199),
        new Color(120, 53, 15),
        new Color(180, 83, 9),
        new Color(252, 211, 77)
    ),
    TECNOLOGIA(
        "Tecnologia & Específica",
        "Técnica / TI",
        new Color(224, 231, 255),
        new Color(49, 46, 129),
        new Color(67, 56, 202),
        new Color(165, 180, 252)
    ),
    ARTES(
        "Artes & Design",
        "Artes / Design",
        new Color(250, 232, 255),
        new Color(112, 26, 117),
        new Color(162, 28, 175),
        new Color(240, 171, 252)
    ),
    EDUCACAO_FISICA(
        "Educação Física & Ergonomia",
        "Ed. Física",
        new Color(236, 252, 203),
        new Color(54, 83, 20),
        new Color(77, 124, 15),
        new Color(190, 242, 100)
    ),
    GESTAO(
        "Gestão, Negócios & TCC",
        "Gestão / TCC",
        new Color(237, 233, 254),
        new Color(76, 29, 149),
        new Color(109, 40, 217),
        new Color(196, 181, 253)
    ),
    VAGO(
        "Horário Vago",
        "Vago",
        new Color(248, 250, 252),
        new Color(148, 163, 184),
        new Color(148, 163, 184),
        new Color(226, 232, 240)
    );

    private static final List<String> LINGUAGENS_KEYWORDS = List.of(
        "portug", "ingl", "literat", "comunica", "linguagens", "lpc", "lpl", "redacao", "redação"
    );
    private static final List<String> MATEMATICA_KEYWORDS = List.of(
        "matem", "cálculo", "calculo", "eamt"
    );
    private static final List<String> NATUREZA_KEYWORDS = List.of(
        "físic", "fisic", "químic", "quimic", "biol", "natureza", "eacnt"
    );
    private static final List<String> HUMANAS_KEYWORDS = List.of(
        "histór", "histor", "geogr", "filos", "sociol", "humanas", "eachsa"
    );
    private static final List<String> EDUCACAO_FISICA_KEYWORDS = List.of(
        "educação física", "educacao fisica", "ed. fis", "ergonomia", "ergo"
    );
    private static final List<String> ARTES_KEYWORDS = List.of(
        "arte", "design", "visual", "game art", "animação", "animacao",
        "modelagem", "ilustração", "ilustracao", "mobiliário", "mobiliario",
        "projetiva", "espafos", "espaços", "espacos", "efêmeros", "efemeros"
    );
    private static final List<String> GESTAO_KEYWORDS = List.of(
        "tcc", "planejamento", "administra", "rotinas", "custos", "modelos",
        "negócios", "negocios", "empreendedorismo", "recursos humanos", "logíst",
        "logist", "afo", "empresar", "ética", "etica", "conduta", "trabalho", "marketing"
    );

    private final String category;
    private final String legendLabel;
    private final Color fillColor;
    private final Color textColor;
    private final Color subtextColor;
    private final Color borderColor;

    SubjectAreaTheme(
        String category,
        String legendLabel,
        Color fillColor,
        Color textColor,
        Color subtextColor,
        Color borderColor
    ) {
        this.category = category;
        this.legendLabel = legendLabel;
        this.fillColor = fillColor;
        this.textColor = textColor;
        this.subtextColor = subtextColor;
        this.borderColor = borderColor;
    }

    public String getCategory() {
        return category;
    }

    public String getLegendLabel() {
        return legendLabel;
    }

    public Color getFillColor() {
        return fillColor;
    }

    public Color getTextColor() {
        return textColor;
    }

    public Color getSubtextColor() {
        return subtextColor;
    }

    public Color getBorderColor() {
        return borderColor;
    }

    /**
     * Classifica o nome de uma disciplina em uma área temática da ETEC.
     */
    public static SubjectAreaTheme classify(String subjectName) {
        if (subjectName == null || subjectName.isBlank()) {
            return VAGO;
        }
        String normalized = subjectName.toLowerCase(Locale.ROOT);
        if (containsAny(normalized, LINGUAGENS_KEYWORDS)) {
            return LINGUAGENS;
        }
        if (containsAny(normalized, MATEMATICA_KEYWORDS)) {
            return MATEMATICA;
        }
        if (containsAny(normalized, EDUCACAO_FISICA_KEYWORDS)) {
            return EDUCACAO_FISICA;
        }
        if (containsAny(normalized, NATUREZA_KEYWORDS)) {
            return NATUREZA;
        }
        if (containsAny(normalized, HUMANAS_KEYWORDS)) {
            return HUMANAS;
        }
        if (containsAny(normalized, ARTES_KEYWORDS)) {
            return ARTES;
        }
        if (containsAny(normalized, GESTAO_KEYWORDS)) {
            return GESTAO;
        }
        return TECNOLOGIA;
    }

    /**
     * Retorna apenas as áreas ativas exibidas na legenda dos documentos PDF.
     */
    public static List<SubjectAreaTheme> legendCategories() {
        return List.of(
            LINGUAGENS,
            MATEMATICA,
            NATUREZA,
            HUMANAS,
            TECNOLOGIA,
            ARTES,
            EDUCACAO_FISICA,
            GESTAO
        );
    }

    private static boolean containsAny(String value, List<String> keywords) {
        for (String keyword : keywords) {
            if (value.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
