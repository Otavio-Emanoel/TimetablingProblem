# Arquitetura do Sistema — EtecFlow (ETEC Timetabling)

O **EtecFlow** é um sistema completo de geração e otimização automatizada de grades horárias escolares (*School Timetabling Problem*), projetado especificamente para resolver a complexidade de turnos sobrepostos (**Ensino Regular** vs. **Ensino Técnico Integrado M-Tec/AMS**), aulas duplas (geminadas), co-teaching (múltiplos professores na mesma disciplina), restrições de indisponibilidade e preferências ponderadas de docentes.

---

## 1. Visão Geral dos Componentes

```mermaid
flowchart LR
    subgraph Cliente["Navegador Web"]
        UI["Painel Administrativo\n(React 19 + Tailwind v4)"]
    end

    subgraph Frontend["TimetablingFrontend (:3000)"]
        NextSSR["Next.js 16 App Router\n(Server Components & Actions)"]
    end

    subgraph Backend["TimetablingBackend (:8080)"]
        REST["Controllers REST\n(/api/*)"]
        Solver["SolverService\n(Motor Heurístico + Backtracking)"]
        JPA["Spring Data JPA\n(Hibernate)"]
    end

    subgraph Database["Banco de Dados (:5432)"]
        PG[("PostgreSQL 15\netec_horarios")]
    end

    UI <-->|"Server Actions / Fetch"| NextSSR
    NextSSR <-->|"HTTP JSON (/api/*)"| REST
    REST --> Solver
    REST --> JPA
    Solver --> JPA
    JPA <-->|"JDBC"| PG
```

---

## 2. Modelo de Dados (DER)

```mermaid
erDiagram
    PROFESSOR {
        bigint id PK
        string name UK
    }
    CLASS_GROUP {
        bigint id PK
        string name UK
        string shift_type "REGULAR | INTEGRAL"
    }
    SUBJECT {
        bigint id PK
        string name
        bigint class_group_id FK
        boolean double_lesson_allowed
    }
    DEMAND {
        bigint id PK
        bigint subject_id FK
        int quantity_per_week
        boolean allow_double_lesson
    }
    TIMESLOT {
        bigint id PK
        int day_of_week "1 (Seg) a 5 (Sex)"
        time start_time
        time end_time
        string shift_type "REGULAR | INTEGRAL"
    }
    PROFESSOR_UNAVAILABILITY {
        bigint id PK
        bigint professor_id FK
        int day_of_week "0 (Todos) ou 1..5"
        time start_time
        time end_time
    }
    PROFESSOR_PREFERENCE {
        bigint id PK
        bigint professor_id FK
        bigint subject_id FK "Opcional (null = qualquer)"
        int day_of_week "0 (Qualquer) ou 1..5"
        time start_time "Opcional"
        time end_time "Opcional"
        int weight "1 a 10"
        string type "PREFERRED | AVOID"
    }
    SCHEDULE_ENTRY {
        bigint id PK
        bigint timeslot_id FK
        bigint class_group_id FK
        bigint subject_id FK
    }

    CLASS_GROUP ||--o{ SUBJECT : "possui"
    SUBJECT ||--o| DEMAND : "gera"
    DEMAND }o--o{ PROFESSOR : "demand_professor (co-teaching)"
    PROFESSOR ||--o{ PROFESSOR_UNAVAILABILITY : "bloqueia"
    PROFESSOR ||--o{ PROFESSOR_PREFERENCE : "prefere/evita"
    SUBJECT ||--o{ PROFESSOR_PREFERENCE : "referencia"
    TIMESLOT ||--o{ SCHEDULE_ENTRY : "aloca"
    CLASS_GROUP ||--o{ SCHEDULE_ENTRY : "pertence"
    SUBJECT ||--o{ SCHEDULE_ENTRY : "leciona"
    SCHEDULE_ENTRY }o--o{ PROFESSOR : "schedule_entry_professor"
```

---

## 3. Estrutura de Diretórios

```text
TimetablingProblem/
├── docker-compose.yaml          # Orquestração PostgreSQL + Backend + Frontend
├── README.md                    # Visão geral e guia rápido
├── docs/                        # Documentação técnica do projeto
│   ├── ARCHITECTURE.md          # Arquitetura, diagramas e modelo de dados
│   ├── API.md                   # Referência de endpoints REST
│   ├── SOLVER.md                # Funcionamento detalhado do algoritmo Solver
│   ├── DEVELOPMENT.md           # Guia de desenvolvimento, seeds e testes
│   └── reference/               # Matriz curricular oficial da ETEC e especificação original
│       ├── curriculum-matrix.txt
│       └── problem.json
├── scripts/                     # Scripts de automação e carga de dados (seeds)
│   ├── start.sh                 # Inicialização completa no Linux/macOS
│   ├── stop.sh                  # Parada de containers no Linux/macOS
│   ├── start.ps1 / start.bat    # Inicialização no Windows (PowerShell / CMD)
│   ├── stop.ps1 / stop.bat      # Parada no Windows (PowerShell / CMD)
│   ├── seed-simple.js           # Seed reduzido (2 turmas) para testes rápidos
│   ├── seed.js                  # Seed intermediário (11 turmas)
│   └── seed_full.js             # Seed completo fiel à matriz curricular oficial (12 turmas, 33 profs)
├── TimetablingBackend/          # API REST e Solver em Java 21 + Spring Boot 4
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/etec/timetabling/
│       │   ├── config/          # Configuração de CORS (WebConfig)
│       │   ├── domain/          # Entidades JPA e Enums
│       │   ├── repository/      # Interfaces Spring Data JPA
│       │   ├── service/         # SolverService (Motor de alocação e otimização)
│       │   └── web/             # Controllers REST
│       └── test/                # Testes automatizados de integração (JUnit 5 + H2)
└── TimetablingFrontend/         # Aplicação Web em Next.js 16 + React 19 + TypeScript
    ├── package.json
    └── src/
        ├── app/                 # Rotas App Router, Server Actions e estilos globais
        ├── components/          # Dashboard interativo (Modais nativos <dialog>, Tabelas, PDF)
        ├── services/            # Cliente HTTP SSR
        └── types/               # Contratos TypeScript compartilhados
```
