# EtecFlow — Sistema de Otimização de Grade Horária (ETEC Timetabling)

Sistema web completo para automação e otimização de grades horárias escolares (*School Timetabling Problem*), desenvolvido para resolver conflitos de horários entre turnos sobrepostos (**Ensino Médio Regular** vs. **Ensino Técnico Integrado M-Tec/AMS**), co-teaching (múltiplos professores por disciplina), aulas duplas geminadas, restrições de indisponibilidade e preferências de professores.

---

## 📚 Documentação (`/docs`)

Toda a documentação técnica e funcional do projeto está organizada no diretório [`/docs`](docs/):

- **[Arquitetura e Modelo de Dados (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)** — Visão geral da arquitetura, diagramas de componentes e Diagrama Entidade-Relacionamento (DER).
- **[Referência da API REST (`docs/API.md`)](docs/API.md)** — Lista completa de endpoints REST, payloads JSON e códigos de resposta.
- **[Motor de Otimização / Solver (`docs/SOLVER.md`)](docs/SOLVER.md)** — Explicação detalhada das restrições rígidas (Hard), leves (Soft), heurística MRV, interleaving, backtracking e fase de reparo.
- **[Guia de Desenvolvimento e Testes (`docs/DEVELOPMENT.md`)](docs/DEVELOPMENT.md)** — Instruções de instalação, uso dos scripts em `/scripts`, seeds e execução dos testes automatizados.
- **[Matriz Curricular e Especificação (`docs/reference/`)](docs/reference/)** — Dados reais de referência (`curriculum-matrix.txt` e `problem.json`).

---

## 🚀 Principais Funcionalidades

- **Motor Solver Inteligente:** Algoritmo multi-tentativa com heurística MRV (*Minimum Remaining Values*), suporte a aulas duplas geminadas, balanceamento entre dias da semana, minimização de janelas, backtracking local e fase de reparo.
- **Gestão Completa de Entidades:** Cadastro, busca, filtragem, edição e exclusão segura em cascata de **Professores**, **Turmas** (`REGULAR` e `INTEGRAL`), **Matérias**, **Demandas (com Co-Teaching)** e **Horários**.
- **Geração Rápida do Tabuleiro ETEC:** Botão de 1 clique (*Gerar Grade Padrão ETEC*) que cria automaticamente os 70 horários semanais (30 do turno Regular + 40 do turno Integral, de segunda a sexta).
- **Restrições e Preferências:** Bloqueio de horários indisponíveis (por dia específico ou todos os dias da semana) e configuração de preferências ponderadas (`1` a `10`, `Preferido` ou `Evitar`).
- **Múltiplas Visões de Grade + Exportação PDF:**
  - **Grade por Turma:** Visualização semanal por turma com exportação para PDF.
  - **Grade por Professor:** Agenda semanal individualizada de cada docente em todas as turmas e turnos com exportação para PDF.
  - **Todas as Grades:** Visão consolidada de todas as turmas da escola em uma única tela.

---

## ⚡ Como Executar Rapidamente

### Opção 1: Script Automatizado (`/scripts`)

No Linux/macOS:
```bash
./scripts/start.sh --seed-full
```

No Windows (PowerShell ou CMD):
```powershell
.\scripts\start.ps1
# ou
scripts\start.bat
```

Para parar os containers:
```bash
./scripts/stop.sh
```

### Opção 2: Docker Compose Manual

```bash
# 1. Subir banco PostgreSQL, Backend (:8080) e Frontend (:3000)
docker compose up -d --build

# 2. Popular dados (escolha um dos seeds disponíveis em /scripts)
node scripts/seed-simple.js --reset   # Teste rápido (2 turmas)
node scripts/seed.js --reset          # Intermediário (11 turmas)
node scripts/seed_full.js --reset     # Matriz oficial completa (12 turmas, 33 professores)
```

Acesse no navegador:
- **Painel Web (Frontend):** `http://localhost:3000`
- **API Backend (Healthcheck):** `http://localhost:8080/api/health`

---

## 🧪 Testes Automatizados

```bash
# Executar suíte de testes de integração do Backend (JUnit 5 + H2)
cd TimetablingBackend && ./mvnw test

# Executar verificação de lint e build de produção do Frontend
cd TimetablingFrontend && npm run lint && npm run build
```

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Java 21, Spring Boot 4, Spring Data JPA / Hibernate, Bean Validation, PostgreSQL 15, H2 (Testes).
- **Frontend:** Next.js 16 (App Router & Server Actions), React 19, TypeScript 5, Tailwind CSS 4, Lucide Icons, jsPDF + html2canvas.
- **Infraestrutura:** Docker & Docker Compose, Scripts de automação Bash/PowerShell/Node.js.
