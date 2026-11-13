package com.etec.timetabling.service;

import com.etec.timetabling.domain.ShiftType;
import java.util.List;

/**
 * Catálogo canônico de matrizes curriculares da ETEC mantido no backend Java.
 */
public final class EtecSeedCatalog {

    private EtecSeedCatalog() {
    }

    public record ClassGroupSeed(String name, ShiftType shiftType) {
    }

    public record DemandSeed(
        String classGroupName,
        String subjectName,
        List<String> professorNames,
        int quantityPerWeek,
        boolean allowDoubleLesson
    ) {
    }

    public record SeedPreset(
        String id,
        String name,
        String description,
        List<String> professors,
        List<ClassGroupSeed> classGroups,
        List<DemandSeed> demands
    ) {
    }

    private static DemandSeed d(String cg, String subject, int qty, String... professors) {
        return new DemandSeed(cg, subject, List.of(professors), qty, true);
    }

    private static DemandSeed d(String cg, String subject, int qty, boolean allowDouble, String... professors) {
        return new DemandSeed(cg, subject, List.of(professors), qty, allowDouble);
    }

    public static final SeedPreset ETEC_OFICIAL = new SeedPreset(
        "etec-oficial",
        "Matriz Oficial ETEC (12 Turmas / 33 Professores)",
        "Base completa com no máximo 3 a 4 aulas vagas semanais por turma (409 aulas em 195 demandas).",
        List.of(
            "ANDREIA", "CAROLINE", "DANILO", "ELIAMAR", "ELISANGELA", "ELIZABETH",
            "ELZA", "EVELISE", "FELIX", "FIDELIS", "GABRIELA", "GILVAN",
            "GISBERT", "IURY", "JEAN", "JOSE A", "JOYCE", "LUIZ F",
            "MARCELO", "MARCIO", "MEIRE", "PATRICIA", "PAULO", "RICARDO",
            "RODRIGO", "ROGERIO", "SONIA", "THIAGO", "VALDECI", "VANESSA",
            "VERIDIANE", "WELLINGTON", "WILLIAM B"
        ),
        List.of(
            new ClassGroupSeed("1MAD", ShiftType.INTEGRAL),
            new ClassGroupSeed("2MAD", ShiftType.INTEGRAL),
            new ClassGroupSeed("3MAD", ShiftType.INTEGRAL),
            new ClassGroupSeed("1MDS", ShiftType.INTEGRAL),
            new ClassGroupSeed("2MDS", ShiftType.INTEGRAL),
            new ClassGroupSeed("3MDS", ShiftType.INTEGRAL),
            new ClassGroupSeed("1MDI", ShiftType.INTEGRAL),
            new ClassGroupSeed("2MDI", ShiftType.INTEGRAL),
            new ClassGroupSeed("3MDI", ShiftType.INTEGRAL),
            new ClassGroupSeed("1JOD", ShiftType.REGULAR),
            new ClassGroupSeed("2JOD", ShiftType.REGULAR),
            new ClassGroupSeed("3JOD", ShiftType.REGULAR)
        ),
        List.of(
            // 1MAD (INTEGRAL - 36 aulas = 4 vagas)
            d("1MAD", "Língua Portuguesa", 4, "FIDELIS"),
            d("1MAD", "Inglês", 2, "FIDELIS"),
            d("1MAD", "Arte", 2, "GILVAN"),
            d("1MAD", "Educação Física", 2, "THIAGO"),
            d("1MAD", "Matemática", 4, "LUIZ F"),
            d("1MAD", "Biologia", 2, "PATRICIA"),
            d("1MAD", "Física", 2, "LUIZ F"),
            d("1MAD", "Química", 2, "JOSE A"),
            d("1MAD", "História", 2, "EVELISE"),
            d("1MAD", "Geografia", 2, "ROGERIO"),
            d("1MAD", "Filosofia", 1, "ELIAMAR"),
            d("1MAD", "Sociologia", 1, "VERIDIANE"),
            d("1MAD", "Conduta Profissional e Relações de Trabalho", 1, "RODRIGO"),
            d("1MAD", "Projetos de TI e Comunicação", 2, "WELLINGTON"),
            d("1MAD", "Planejamento Empresarial", 2, "JEAN"),
            d("1MAD", "Rotinas Administrativas", 2, "JEAN"),
            d("1MAD", "Administração de Recursos Humanos", 3, "VERIDIANE"),

            // 2MAD (INTEGRAL - 36 aulas = 4 vagas)
            d("2MAD", "Língua Portuguesa", 3, "FIDELIS"),
            d("2MAD", "Inglês", 2, "PATRICIA"),
            d("2MAD", "Educação Física", 2, "THIAGO"),
            d("2MAD", "Matemática", 3, "LUIZ F"),
            d("2MAD", "Física", 2, "MARCELO"),
            d("2MAD", "Química", 2, "JOSE A"),
            d("2MAD", "Biologia", 2, "ANDREIA"),
            d("2MAD", "História", 2, "EVELISE"),
            d("2MAD", "Geografia", 2, "MARCIO"),
            d("2MAD", "Filosofia", 1, "ELIAMAR"),
            d("2MAD", "Estudos Avançados Ciências Humanas", 1, "ELZA"),
            d("2MAD", "Estudos Avançados Matemática", 1, "ELZA"),
            d("2MAD", "Laboratório Mediação Sociocultural", 2, "ELIZABETH"),
            d("2MAD", "Laboratório Processos Criativos", 2, "ELIZABETH"),
            d("2MAD", "Custos e Operações Contábeis", 3, "MARCIO"),
            d("2MAD", "Rotinas de Departamento Pessoal", 2, "VERIDIANE"),
            d("2MAD", "Modelos de Negócios", 2, "MARCIO"),
            d("2MAD", "Estudos da Administração Pública", 2, "RODRIGO"),

            // 3MAD (INTEGRAL - 37 aulas = 3 vagas)
            d("3MAD", "Língua Portuguesa", 4, "FIDELIS"),
            d("3MAD", "Inglês", 2, "PATRICIA"),
            d("3MAD", "Matemática", 4, "WILLIAM B"),
            d("3MAD", "Sociologia", 2, "VERIDIANE"),
            d("3MAD", "Estudos Avançados Ciências Humanas", 3, "DANILO"),
            d("3MAD", "Estudos Avançados Matemática", 3, "ELIAMAR"),
            d("3MAD", "Administração Financeira e Orçamentária", 3, "RICARDO"),
            d("3MAD", "Administração da Produção e Serviços", 3, "JEAN"),
            d("3MAD", "Administração de Recursos Humanos", 3, "VERIDIANE"),
            d("3MAD", "Economia e Comércio Internacional", 2, "DANILO"),
            d("3MAD", "Ética e Cidadania Organizacional", 1, "DANILO"),
            d("3MAD", "Processos Logísticos Empresariais", 2, "JEAN"),
            d("3MAD", "TI em Administração", 2, "ELISANGELA"),
            d("3MAD", "Planejamento e Desenvolvimento do TCC", 3, "ELISANGELA"),

            // 1MDS (INTEGRAL - 37 aulas = 3 vagas)
            d("1MDS", "Língua Portuguesa", 4, "FIDELIS"),
            d("1MDS", "Inglês", 2, "FIDELIS"),
            d("1MDS", "Educação Física", 2, "THIAGO"),
            d("1MDS", "Arte", 1, "GILVAN"),
            d("1MDS", "Matemática", 4, "LUIZ F"),
            d("1MDS", "Biologia", 2, "PATRICIA"),
            d("1MDS", "Física", 2, "LUIZ F"),
            d("1MDS", "Química", 2, "JOSE A"),
            d("1MDS", "História", 2, "EVELISE"),
            d("1MDS", "Geografia", 2, "ROGERIO"),
            d("1MDS", "Filosofia", 1, "ELIAMAR"),
            d("1MDS", "Sociologia", 1, "ELIZABETH"),
            d("1MDS", "Algoritmos e Lógica de Programação", 4, "GISBERT", "PAULO"),
            d("1MDS", "Fundamentos de Informática", 3, "ELISANGELA", "VANESSA"),
            d("1MDS", "Análise e Projeto de Sistemas", 2, "PAULO"),
            d("1MDS", "Design Digital", 3, "WELLINGTON"),

            // 2MDS (INTEGRAL - 36 aulas = 4 vagas)
            d("2MDS", "Língua Portuguesa", 3, "FIDELIS"),
            d("2MDS", "Inglês", 2, "PATRICIA"),
            d("2MDS", "Educação Física", 2, "THIAGO"),
            d("2MDS", "Matemática", 3, "ELIAMAR"),
            d("2MDS", "Física", 2, "LUIZ F"),
            d("2MDS", "Química", 2, "JOSE A"),
            d("2MDS", "Biologia", 2, "PATRICIA"),
            d("2MDS", "História", 2, "EVELISE"),
            d("2MDS", "Geografia", 2, "VALDECI"),
            d("2MDS", "Estudos Avançados Ciências da Natureza", 1, "ELZA"),
            d("2MDS", "Estudos Avançados Matemática", 1, "ELZA"),
            d("2MDS", "Laboratório Mediação Sociocultural", 2, "ELIZABETH"),
            d("2MDS", "Programação Web II", 3, "PAULO", "VANESSA"),
            d("2MDS", "Banco de Dados II", 2, "IURY"),
            d("2MDS", "Desenvolvimento de Sistemas", 3, "PAULO"),
            d("2MDS", "Ética e Cidadania Organizacional", 1, "DANILO"),
            d("2MDS", "Programação de Aplicativos Mobile I", 3, "PAULO", "WELLINGTON"),

            // 3MDS (INTEGRAL - 37 aulas = 3 vagas)
            d("3MDS", "Língua Portuguesa", 3, "FIDELIS"),
            d("3MDS", "Inglês", 2, "PATRICIA"),
            d("3MDS", "Matemática", 4, "WILLIAM B"),
            d("3MDS", "Biologia", 2, "ANDREIA"),
            d("3MDS", "História", 2, "EVELISE"),
            d("3MDS", "Geografia", 2, "VALDECI"),
            d("3MDS", "Filosofia", 2, "ELZA"),
            d("3MDS", "Sociologia", 2, "ELZA"),
            d("3MDS", "Estudos Avançados Ciências da Natureza", 3, "ELZA"),
            d("3MDS", "Estudos Avançados Matemática", 3, "ELIAMAR"),
            d("3MDS", "Programação Web III", 2, "PAULO"),
            d("3MDS", "Programação Mobile II", 2, "PAULO"),
            d("3MDS", "Internet, Protocolos e Segurança", 2, "IURY", "VANESSA"),
            d("3MDS", "TCC em Desenvolvimento de Sistemas", 2, "ELISANGELA", "VERIDIANE"),
            d("3MDS", "Qualidade e Teste de Software", 2, "IURY"),
            d("3MDS", "Sistemas Embarcados", 2, "VANESSA"),

            // 1MDI (INTEGRAL - 37 aulas = 3 vagas)
            d("1MDI", "Língua Portuguesa", 2, "FIDELIS"),
            d("1MDI", "Inglês", 2, "PATRICIA"),
            d("1MDI", "Arte", 2, "GILVAN"),
            d("1MDI", "Educação Física", 2, "THIAGO"),
            d("1MDI", "Matemática", 3, "ELIAMAR"),
            d("1MDI", "Física", 2, "LUIZ F"),
            d("1MDI", "História", 2, "EVELISE"),
            d("1MDI", "Geografia", 2, "ROGERIO"),
            d("1MDI", "Filosofia", 1, "ELIAMAR"),
            d("1MDI", "Estudos Avançados Ciências Humanas", 1, "RODRIGO"),
            d("1MDI", "Estudos Avançados Linguagens", 1, "ELIZABETH"),
            d("1MDI", "Laboratório Investigação Científica", 2, "ELIZABETH"),
            d("1MDI", "Práticas de Empreendedorismo", 1, "MARCIO"),
            d("1MDI", "Composição no Projeto de Interiores", 2, "SONIA"),
            d("1MDI", "Ergonomia", 2, "CAROLINE", "JOYCE"),
            d("1MDI", "Estudo e Aplicação de Materiais", 2, "FELIX"),
            d("1MDI", "Projeto de Espaços Efêmeros", 2, "MARCELO", "SONIA"),
            d("1MDI", "Expressões Visuais no Design I", 2, "SONIA"),
            d("1MDI", "Representação Linguagem Projetiva I", 2, "GABRIELA", "SONIA"),
            d("1MDI", "Representação Digital de Projetos I", 2, "JOYCE"),

            // 2MDI (INTEGRAL - 36 aulas = 4 vagas)
            d("2MDI", "Língua Portuguesa", 3, "FIDELIS"),
            d("2MDI", "Inglês", 2, "PATRICIA"),
            d("2MDI", "Educação Física", 2, "THIAGO"),
            d("2MDI", "Matemática", 3, "LUIZ F"),
            d("2MDI", "Química", 2, "JOSE A"),
            d("2MDI", "Física", 2, "LUIZ F"),
            d("2MDI", "Biologia", 2, "ANDREIA"),
            d("2MDI", "Geografia", 2, "VALDECI"),
            d("2MDI", "História", 2, "EVELISE"),
            d("2MDI", "Estudos Avançados Ciências Humanas", 1, "ELIZABETH"),
            d("2MDI", "Estudos Avançados Linguagens", 1, "ELIZABETH"),
            d("2MDI", "Laboratório Mediação Sociocultural", 2, "ELIZABETH"),
            d("2MDI", "Laboratório Processos Criativos", 2, "ELIZABETH"),
            d("2MDI", "Expressões Visuais no Design II", 2, "CAROLINE", "JOYCE"),
            d("2MDI", "Representação Linguagem Projetiva II", 2, "GABRIELA"),
            d("2MDI", "Representação Digital de Projetos II", 2, "CAROLINE", "JOYCE"),
            d("2MDI", "Projetos de Interiores Residenciais", 2, "MARCELO", "SONIA"),
            d("2MDI", "Representação Técnica do Mobiliário II", 2, "GABRIELA"),

            // 3MDI (INTEGRAL - 36 aulas = 4 vagas)
            d("3MDI", "Língua Portuguesa", 5, "MEIRE"),
            d("3MDI", "Inglês", 2, "PATRICIA"),
            d("3MDI", "Matemática", 4, "WILLIAM B"),
            d("3MDI", "Química", 2, "JOSE A"),
            d("3MDI", "Biologia", 2, "PATRICIA"),
            d("3MDI", "Geografia", 2, "ROGERIO"),
            d("3MDI", "Sociologia", 1, "ELIZABETH"),
            d("3MDI", "Estudos Avançados Ciências Humanas", 3, "DANILO"),
            d("3MDI", "Estudos Avançados Linguagens", 3, "ELIZABETH"),
            d("3MDI", "Representação Técnica do Mobiliário II", 2, "GABRIELA"),
            d("3MDI", "Conforto Ambiental no Projeto", 1, "SONIA"),
            d("3MDI", "Ética e Cidadania Organizacional", 1, "DANILO"),
            d("3MDI", "História do Mobiliário", 2, "GABRIELA"),
            d("3MDI", "Ilustração no Projeto de Interiores", 2, "JOYCE"),
            d("3MDI", "TCC em Design de Interiores", 2, "ELISANGELA", "SONIA"),
            d("3MDI", "Projetos de Interiores Comerciais", 2, "MARCELO", "SONIA"),

            // 1JOD (REGULAR - 27 aulas = 3 vagas)
            d("1JOD", "Língua Portuguesa", 2, "MEIRE"),
            d("1JOD", "Inglês", 2, "PATRICIA"),
            d("1JOD", "Arte", 2, "GILVAN"),
            d("1JOD", "Educação Física", 2, "THIAGO"),
            d("1JOD", "Matemática", 2, "LUIZ F"),
            d("1JOD", "Biologia", 2, "PATRICIA"),
            d("1JOD", "Física", 2, "LUIZ F"),
            d("1JOD", "Química", 2, "JOSE A"),
            d("1JOD", "História", 2, "EVELISE"),
            d("1JOD", "Geografia", 2, "ROGERIO"),
            d("1JOD", "Ambiente de Desenvolvimento de Jogos I", 1, "ELISANGELA"),
            d("1JOD", "Programação e Algoritmos", 1, "GISBERT"),
            d("1JOD", "Narrativas e Roteiros para Jogos", 1, "GILVAN"),
            d("1JOD", "Operação de Software Aplicativo", 1, "WELLINGTON"),
            d("1JOD", "Conduta Profissional e Relações de Trabalho", 1, "RODRIGO"),
            d("1JOD", "Game Art I", 2, "GILVAN"),

            // 2JOD (REGULAR - 27 aulas = 3 vagas)
            d("2JOD", "Língua Portuguesa", 3, "MEIRE"),
            d("2JOD", "Inglês", 2, "PATRICIA"),
            d("2JOD", "Educação Física", 2, "THIAGO"),
            d("2JOD", "Matemática", 2, "ELIAMAR"),
            d("2JOD", "Física", 2, "LUIZ F"),
            d("2JOD", "Química", 2, "JOSE A"),
            d("2JOD", "Biologia", 2, "PATRICIA"),
            d("2JOD", "História", 2, "EVELISE"),
            d("2JOD", "Geografia", 2, "VALDECI"),
            d("2JOD", "Técnicas de Desenho e Game Art II", 2, "GILVAN"),
            d("2JOD", "Desenvolvimento de Jogos para Web II", 1, "ELISANGELA"),
            d("2JOD", "Programação Orientada a Objetos", 2, "GISBERT", "PAULO"),
            d("2JOD", "Modelagem 3D", 2, "GILVAN"),
            d("2JOD", "Linguagem de Programação I", 1, "PAULO"),

            // 3JOD (REGULAR - 27 aulas = 3 vagas)
            d("3JOD", "Língua Portuguesa", 4, "MEIRE"),
            d("3JOD", "Inglês", 2, "PATRICIA"),
            d("3JOD", "Matemática", 3, "ELIAMAR"),
            d("3JOD", "Filosofia", 1, "ELIZABETH"),
            d("3JOD", "Sociologia", 2, "ELZA"),
            d("3JOD", "Game Art III", 2, "GILVAN"),
            d("3JOD", "Linguagem de Programação II", 2, "PAULO"),
            d("3JOD", "Animação 3D", 2, "GILVAN"),
            d("3JOD", "Linguagens para Banco de Dados", 2, "ELISANGELA"),
            d("3JOD", "Ética e Cidadania Organizacional", 1, "RODRIGO"),
            d("3JOD", "Marketing para Jogos Digitais", 2, "ELZA"),
            d("3JOD", "Programação para Dispositivos Móveis", 2, "GISBERT", "PAULO"),
            d("3JOD", "TCC em Jogos Digitais", 2, "ELISANGELA")
        )
    );

    public static final SeedPreset SIMPLES = new SeedPreset(
        "simples",
        "Cenário Simplificado (2 Turmas / 7 Professores)",
        "Base enxuta para validação rápida e demonstração com 61 aulas semanais.",
        List.of(
            "Prof. Ana (Mat)",
            "Prof. Bruno (Hist)",
            "Prof. Carlos (Prog)",
            "Prof. Fernanda (Prog)",
            "Prof. Iury (Fis)",
            "Prof. Tamara (Port)",
            "Prof. Valdeci (Mat)"
        ),
        List.of(
            new ClassGroupSeed("TURMA 1 (INTEGRAL)", ShiftType.INTEGRAL),
            new ClassGroupSeed("TURMA 2 (REGULAR)", ShiftType.REGULAR)
        ),
        List.of(
            d("TURMA 1 (INTEGRAL)", "Matemática", 3, "Prof. Ana (Mat)"),
            d("TURMA 1 (INTEGRAL)", "Física", 3, "Prof. Iury (Fis)"),
            d("TURMA 1 (INTEGRAL)", "Português", 3, "Prof. Tamara (Port)"),
            d("TURMA 1 (INTEGRAL)", "História", 3, "Prof. Bruno (Hist)"),
            d("TURMA 1 (INTEGRAL)", "Geografia", 3, "Prof. Bruno (Hist)"),
            d("TURMA 1 (INTEGRAL)", "Programação", 3, "Prof. Carlos (Prog)"),
            d("TURMA 1 (INTEGRAL)", "Química", 3, "Prof. Ana (Mat)"),
            d("TURMA 1 (INTEGRAL)", "Sociologia", 3, "Prof. Ana (Mat)"),
            d("TURMA 1 (INTEGRAL)", "Educação Física", 2, "Prof. Tamara (Port)"),
            d("TURMA 1 (INTEGRAL)", "Inglês", 3, "Prof. Fernanda (Prog)"),
            d("TURMA 1 (INTEGRAL)", "Artes", 3, "Prof. Fernanda (Prog)"),
            d("TURMA 1 (INTEGRAL)", "Biologia", 3, "Prof. Iury (Fis)"),

            d("TURMA 2 (REGULAR)", "Matemática", 3, "Prof. Valdeci (Mat)"),
            d("TURMA 2 (REGULAR)", "História", 3, "Prof. Bruno (Hist)"),
            d("TURMA 2 (REGULAR)", "Português", 3, "Prof. Tamara (Port)"),
            d("TURMA 2 (REGULAR)", "Artes", 2, "Prof. Carlos (Prog)"),
            d("TURMA 2 (REGULAR)", "Programação", 3, "Prof. Carlos (Prog)"),
            d("TURMA 2 (REGULAR)", "Educação Física", 2, "Prof. Valdeci (Mat)"),
            d("TURMA 2 (REGULAR)", "Inglês", 3, "Prof. Fernanda (Prog)"),
            d("TURMA 2 (REGULAR)", "Química", 3, "Prof. Iury (Fis)"),
            d("TURMA 2 (REGULAR)", "Sociologia", 2, "Prof. Valdeci (Mat)"),
            d("TURMA 2 (REGULAR)", "Biologia", 2, "Prof. Ana (Mat)")
        )
    );

    public static List<SeedPreset> allPresets() {
        return List.of(ETEC_OFICIAL, SIMPLES);
    }

    public static SeedPreset findById(String presetId) {
        if (presetId == null || presetId.isBlank()) {
            return null;
        }
        String key = presetId.trim().toLowerCase();
        return switch (key) {
            case "etec-oficial", "oficial", "completo", "full" -> ETEC_OFICIAL;
            case "simples", "simple" -> SIMPLES;
            default -> null;
        };
    }
}
