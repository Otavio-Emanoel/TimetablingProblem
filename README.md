**ETEC Timetabling MVP**

Projeto demonstrativo para alocação de aulas (timetabling) desenvolvido como MVP para a ETEC.

Resumo
- Backend: Spring Boot (Java) — solver customizado para distribuir aulas, suportando aulas duplas, restrições de indisponibilidade de professores e balanceamento por dia.
- Frontend: Next.js + React + TypeScript — painel administrativo com visualização da grade, criação de demandas e restrições.
- Banco: PostgreSQL (configurado via Docker Compose no desenvolvimento).

Arquivos importantes
- [README.md](README.md): este arquivo.
- [seed.js](seed.js): script de povoamento inicial usado para testes.
- TimetablingBackend/: código do backend (Spring Boot / Maven).
- TimetablingFrontend/: código do frontend (Next.js).

Requisitos (geral)
- Docker & Docker Compose (recomendado).
- Node.js (para executar o `seed.js` localmente ou rodar o frontend em dev).
- Java 21 + Maven (opcional, caso rode backend localmente sem Docker).

Ports padrão
- Backend: http://localhost:8080
- Frontend (dev): http://localhost:3000

Execução com Docker (recomendado)

1) Iniciar com Docker Compose (Linux / Windows PowerShell):

```bash
docker compose up --build
```

Isso sobe os serviços descritos em `docker-compose.yaml` (incluindo a instância PostgreSQL). O backend expõe a API em `:8080`.

2) Verifique saúde do backend:

```bash
curl http://localhost:8080/api/health
```

3) Povoar dados de exemplo (opcional):

Se preferir povoar com o `seed.js` (usa a API do backend), abra outro terminal e execute:

```bash
# na raiz do projeto
node seed.js
```

Execução local (sem Docker)

Backend (Linux / macOS):

```bash
cd TimetablingBackend
./mvnw spring-boot:run
```

Backend (Windows PowerShell):

```powershell
cd TimetablingBackend
mvnw.cmd spring-boot:run
```

Frontend (dev):

```bash
cd TimetablingFrontend
npm install
npm run dev -- --port 3000
```

Frontend (build):

```bash
cd TimetablingFrontend
npm install
npm run build
npm start
```

Endpoints úteis
- `GET /api/health` — health check.
- `POST /api/solver/iniciar` — inicia o solver (executa em background).
- `GET /api/solver/status` — retorna status e resumo (alocadas/não alocadas).
- `GET /api/grade/{classGroupId}` — retorna a grade gerada para a turma.
- `GET /api/summary` — resumo do sistema (quantidades, scheduleEntries, etc.).
- `GET/POST/DELETE /api/unavailability` — gerenciar restrições de indisponibilidade de professores.

Observações sobre restrições
- O frontend aceita `dayOfWeek = 0` como **Todos os dias**; o backend expande `0` internamente para SEG–SEX (1–5) antes de avaliar o solver.

Como testar uma restrição rápida

1) Obter ID do professor (lista):

```bash
curl http://localhost:8080/api/professors
```

2) Criar restrição (ex.: todos os dias 10:00-11:00 para professor com id 31):

```bash
curl -X POST http://localhost:8080/api/unavailability \
  -H "Content-Type: application/json" \
  -d '{"professorId":31,"dayOfWeek":0,"startTime":"10:00","endTime":"11:00"}'
```

3) Reexecutar solver e checar se as aulas do professor foram movidas:

```bash
curl -X POST http://localhost:8080/api/solver/iniciar
curl http://localhost:8080/api/solver/status
curl http://localhost:8080/api/grade/4   # exemplo de turma
```

Dicas para Windows
- Recomendo usar WSL2 para um ambiente mais próximo do Linux; se usar Docker Desktop, habilite WSL2.
- No PowerShell, use `mvnw.cmd` em vez de `./mvnw` e `npm`/`npx` normalmente para frontend.

Sobre o solver (visão rápida)
- Implementa interleaving entre turmas (round-robin) para evitar monopolização de bons horários.
- Suporta aulas duplas (pares consecutivos) quando `allowDoubleLesson` é `true`.
- Penaliza repetições de mesma disciplina no mesmo dia e tenta balancear o número de aulas por dia.

Contribuição e desenvolvimento
- O projeto é composto por dois módulos principais: `TimetablingBackend` e `TimetablingFrontend`.
- Para desenvolver: rodar backend em hot-reload (`mvn spring-boot:run`) e frontend com `npm run dev`.

Problemas comuns
- Porta 5432 ocupada: pare qualquer serviço Postgres local ou ajuste `docker-compose.yaml`.
- Erros de CORS: quando rodando backend e frontend separadamente, ajuste `API_BASE_URL`/`NEXT_PUBLIC_API_URL` no `.env.local` do frontend.

## O Problema e a Motivação

A elaboração da grade horária escolar (conhecida na computação como *Timetabling Problem*) é um desafio logístico complexo. Anteriormente, o processo de atribuição de aulas e montagem da grade para os professores era feito de forma **totalmente manual**.

Realizar esse processo "no papel" ou em planilhas simples gera diversos gargalos para a coordenação pedagógica:
- **Gasto excessivo de tempo:** Horas ou até dias são desperdiçados tentando encaixar horários e professores como em um quebra-cabeças.
- **Dificuldade com restrições:** É extremamente difícil cruzar manualmente as restrições de indisponibilidade de cada professor (dias e horários específicos em que não podem lecionar) sem cometer erros.
- **Desbalanceamento:** Falta de otimização na distribuição, resultando em turmas com todas as aulas de uma disciplina no mesmo dia, "janelas" (horários vagos) indesejadas ou quebra de aulas duplas.
- **Retrabalho:** Qualquer alteração de última hora na disponibilidade de um professor exige que boa parte da grade seja refeita do zero.

**Por que essa solução foi desenvolvida?**
Este projeto foi criado para automatizar e resolver esse problema de forma inteligente. Através de um *solver* customizado construído no backend, o sistema recebe as demandas de cada turma e as restrições de cada professor, calculando a melhor distribuição possível. A solução garante o respeito às regras de negócio (balanceamento de dias, suporte a aulas duplas e bloqueio de horários indisponíveis) em questão de segundos. O painel web complementa a solução entregando uma interface amigável para a gestão visual de toda essa operação.

Contato
- Autor / repositório: Otavio-Emanoel/TimetablingProblem
