# Guia de Desenvolvimento, Execução e Testes

Este guia detalha como configurar o ambiente, executar o projeto via Docker ou localmente, popular o banco de dados com os diferentes scripts de *seed* e rodar os testes automatizados.

---

## 1. Pré-requisitos

- **Docker** e **Docker Compose** (para execução containerizada ou banco PostgreSQL)
- **Node.js 20+** e **npm** (para o frontend Next.js e execução dos scripts em `/scripts`)
- **Java 21+** (ou superior) e **Maven Wrapper (`./mvnw`)** (para desenvolvimento local do backend)

---

## 2. Inicialização Rápida com Scripts (`/scripts`)

O diretório `/scripts` contém utilitários prontos para Linux/macOS e Windows:

### Linux / macOS
```bash
# Sobe todos os serviços e pergunta qual seed executar
./scripts/start.sh

# Ou passando o modo de seed diretamente (sem prompt interativo):
./scripts/start.sh --seed-full     # Matriz curricular oficial completa (12 turmas, 33 professores)
./scripts/start.sh --seed          # Seed intermediário (11 turmas)
./scripts/start.sh --seed-simple   # Seed rápido de teste (2 turmas)
./scripts/start.sh --no-seed       # Sobe apenas os containers sem popular dados

# Para encerrar os containers:
./scripts/stop.sh
```

### Windows (PowerShell ou CMD)
```powershell
# PowerShell
.\scripts\start.ps1
.\scripts\stop.ps1

# Prompt de Comando (CMD)
scripts\start.bat
scripts\stop.bat
```

---

## 3. Scripts de Povoamento de Dados (Seeds)

Todos os scripts de seed em `/scripts` são **idempotentes** (podem ser executados mais de uma vez sem duplicar registros) e aceitam a flag `--reset` para limpar o banco antes de inserir os novos dados:

| Script | Comando | Descrição |
| :--- | :--- | :--- |
| `seed-simple.js` | `node scripts/seed-simple.js --reset` | Cria 7 professores, 2 turmas (`INTEGRAL` e `REGULAR`), 70 horários e 60 aulas semanais. Ideal para testes rápidos. |
| `seed.js` | `node scripts/seed.js --reset` | Cria 32 professores, 11 turmas (`1MAD..3MAD`, `1MDS..3MDS`, `1MDI..2MDI`, `1JOD..3JOD`), 70 horários e demandas com co-teaching. |
| `seed_full.js` | `node scripts/seed_full.js --reset` | Matriz oficial completa da ETEC: 33 professores, 12 turmas, 70 horários e mais de 180 disciplinas/demandas reais mapeadas de `docs/reference/curriculum-matrix.txt`. |

> **Dica:** Caso o backend esteja rodando em outra porta/host, defina a variável `API_BASE`:
> ```bash
> API_BASE=http://localhost:8080 node scripts/seed_full.js --reset
> ```

---

## 4. Execução em Modo Desenvolvimento (Sem Docker no App)

Se desejar rodar apenas o PostgreSQL no Docker e executar o Backend e o Frontend localmente com *hot-reload*:

```bash
# 1. Subir apenas o banco de dados PostgreSQL
docker compose up -d db

# 2. Iniciar o Backend (Spring Boot na porta 8080)
cd TimetablingBackend
./mvnw spring-boot:run

# 3. Em outro terminal, iniciar o Frontend (Next.js na porta 3000)
cd TimetablingFrontend
npm install
npm run dev
```

---

## 5. Executando Testes e Validações

### Backend (JUnit 5 + Spring Boot Test + H2 em memória)
Os testes automatizados verificam os endpoints REST, a criação idempotente dos 70 horários padrão da ETEC, a prevenção de duplicidade (`409 Conflict`), a deleção em cascata e a alocação completa do `SolverService` (incluindo aulas duplas, indisponibilidades e preferências):

```bash
cd TimetablingBackend
./mvnw test
```

### Frontend (ESLint + TypeScript + Next.js Build)
```bash
cd TimetablingFrontend
npm run lint
npm run build
```
