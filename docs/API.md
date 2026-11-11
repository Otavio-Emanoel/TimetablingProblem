# Referência da API REST — TimetablingBackend

O backend expõe uma API RESTful sob o prefixo `/api` (porta padrão `8080`).

---

## 1. Saúde, Resumo, Backup e Reset (`/api`)

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Verifica se o backend está online (`{"status": "ok", "timestamp": "..."}`). |
| `GET` | `/api/summary` | Retorna contadores gerais do sistema (`timeslots`, `professors`, `classGroups`, `subjects`, `demands`, `scheduleEntries`, `unavailabilities`, `preferences`). |
| `GET` | `/api/backup` | Exporta um snapshot JSON completo de todos os cadastros e da grade alocada. |
| `POST` | `/api/backup` | Restaura um snapshot JSON de forma transacional (`@Transactional`), recriando turmas, professores, matérias, demandas, horários, restrições, preferências e grades. |
| `DELETE` | `/api/reset` | Limpa todos os registros do banco de dados respeitando a ordem de integridade referencial (`204 No Content`, ou `409 Conflict` se o solver estiver rodando). |

---

## 2. Professores (`/api/professors`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/professors` | `200` | Lista todos os professores em ordem alfabética. |
| `GET` | `/api/professors/{id}` | `200 / 404` | Busca um professor pelo ID. |
| `POST` | `/api/professors` | `201 / 409` | Cria um professor. Retorna `409 Conflict` se o nome já existir. |
| `PUT` | `/api/professors/{id}` | `200 / 409` | Atualiza o nome de um professor. |
| `DELETE` | `/api/professors/{id}` | `204` | Remove o professor e limpa restrições, preferências e vínculos em demandas/grades. |

**Payload (`POST` / `PUT`):**
```json
{
  "name": "Prof. Rodrigo"
}
```

---

## 3. Turmas (`/api/class-groups`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/class-groups` | `200` | Lista todas as turmas em ordem alfabética. |
| `GET` | `/api/class-groups/{id}` | `200 / 404` | Busca uma turma pelo ID. |
| `POST` | `/api/class-groups` | `201 / 409` | Cria uma turma (`shiftType`: `"REGULAR"` ou `"INTEGRAL"`). |
| `PUT` | `/api/class-groups/{id}` | `200 / 409` | Atualiza nome e turno da turma. |
| `DELETE` | `/api/class-groups/{id}` | `204` | Remove a turma em cascata (incluindo matérias, demandas e grades da turma). |

**Payload (`POST` / `PUT`):**
```json
{
  "name": "1MDS",
  "shiftType": "INTEGRAL"
}
```

---

## 4. Matérias (`/api/subjects`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/subjects?classGroupId={id}` | `200` | Lista todas as matérias (ou filtra por turma). |
| `GET` | `/api/subjects/{id}` | `200 / 404` | Busca uma matéria pelo ID. |
| `POST` | `/api/subjects` | `201 / 409` | Cria uma matéria vinculada a uma turma. |
| `PUT` | `/api/subjects/{id}` | `200 / 409` | Atualiza nome ou turma da matéria. |
| `DELETE` | `/api/subjects/{id}` | `204` | Remove a matéria e suas demandas/alocações vinculadas. |

**Payload (`POST` / `PUT`):**
```json
{
  "name": "Banco de Dados II",
  "classGroupId": 5
}
```

---

## 5. Demandas (`/api/demands`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/demands?classGroupId={id}` | `200` | Lista todas as demandas (ou filtra por turma). |
| `POST` | `/api/demands` | `201 / 409` | Cria uma demanda semanal para uma matéria com 1 ou mais professores (co-teaching). |
| `PUT` | `/api/demands/{id}` | `200` | Atualiza quantidade semanal, flag de aula dupla e professores de uma demanda. |
| `DELETE` | `/api/demands/{id}` | `204` | Remove uma demanda. |

**Payload (`POST` / `PUT`):**
```json
{
  "subjectId": 12,
  "professorIds": [3, 7],
  "quantityPerWeek": 4,
  "allowDoubleLesson": true
}
```

---

## 6. Horários / Timeslots (`/api/timeslots`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/timeslots?shiftType={tipo}` | `200` | Lista horários ordenados por turno, dia e hora de início. |
| `POST` | `/api/timeslots` | `201 / 409` | Cria um horário individual (`dayOfWeek`: `1`–`5` ou `"MONDAY"`–`"FRIDAY"`). |
| `POST` | `/api/timeslots/padrao` | `200` | Gera de forma idempotente os **70 horários padrão da ETEC** (30 Regular + 40 Integral, Seg–Sex). |
| `DELETE` | `/api/timeslots/{id}` | `204` | Remove um horário e eventuais alocações naquele slot. |

**Payload (`POST /api/timeslots`):**
```json
{
  "dayOfWeek": "MONDAY",
  "startTime": "08:00:00",
  "endTime": "08:50:00",
  "shiftType": "INTEGRAL"
}
```

---

## 7. Restrições de Indisponibilidade (`/api/unavailability`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/unavailability?professorId={id}` | `200` | Lista restrições de horário (todas ou de um professor). |
| `POST` | `/api/unavailability` | `201` | Cria uma restrição (`dayOfWeek = 0` bloqueia de segunda a sexta). |
| `DELETE` | `/api/unavailability/{id}` | `204` | Remove uma restrição. |

**Payload (`POST`):**
```json
{
  "professorId": 1,
  "dayOfWeek": 0,
  "startTime": "08:00",
  "endTime": "10:00"
}
```

---

## 8. Preferências de Professores (`/api/preferences`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/preferences` | `200` | Lista todas as preferências cadastradas. |
| `GET` | `/api/preferences/professor/{id}` | `200` | Lista as preferências de um professor específico. |
| `POST` | `/api/preferences` | `200` | Cria uma preferência (`type`: `"PREFERRED"` ou `"AVOID"`, `weight`: `1`–`10`). |
| `DELETE` | `/api/preferences/{id}` | `200` | Remove uma preferência. |

---

## 9. Motor Solver (`/api/solver`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/solver/validar` | `200` | Valida a viabilidade das demandas vs. slots disponíveis por turma e carga horária docente antes de rodar o solver. |
| `POST` | `/api/solver/iniciar` | `200` | Inicia a execução assíncrona do solver em background. |
| `GET` | `/api/solver/status` | `200` | Consulta o progresso (`IDLE`, `RUNNING`, `COMPLETED`, `ERROR`) e o relatório detalhado de alocação e conflitos. |

---

## 10. Consulta, Auditoria e Movimentação Manual de Grades (`/api/grade`)

| Método | Endpoint | Status | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/grade/{classGroupId}` | `200` | Retorna a grade horária de uma turma específica. |
| `GET` | `/api/grade/todas` | `200` | Retorna um mapa com as grades de todas as turmas. |
| `GET` | `/api/grade/professor/{professorId}` | `200` | Retorna a agenda semanal completa de um professor específico em todas as turmas. |
| `GET` | `/api/grade/professores` | `200` | Retorna as agendas semanais de todos os professores com aulas alocadas. |
| `GET` | `/api/grade/auditoria` | `200` | Executa auditoria completa da grade: Score de Qualidade (`0–100`), janelas ociosas por professor, conflitos de horário, violações de indisponibilidade e demandas pendentes. |
| `POST` | `/api/grade/mover` | `200 / 409` | Move uma aula para outro slot vazio ou troca (`swap`) duas aulas da mesma turma, validando conflitos de professores e restrições (`409 Conflict` se houver choque e `force=false`). |
| `DELETE` | `/api/grade` | `204` | Limpa todas as aulas alocadas (`schedule_entry`). |

