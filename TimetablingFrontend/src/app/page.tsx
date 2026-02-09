import Link from "next/link";
import {
  createClassGroup,
  createDemand,
  createProfessor,
  createSubject,
  createTimeslot,
  createUnavailability,
  deleteUnavailability,
  startSolver,
  updateProfessor,
} from "./server-actions";

type SummaryResponse = {
  timeslots: number;
  professors: number;
  classGroups: number;
  subjects: number;
  lessons: number;
  demands?: number;
  scheduleEntries?: number;
};

type Professor = {
  id: number;
  name: string;
  maxWeeklyHours: number;
};

type Unavailability = {
  id: number;
  professorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ClassGroup = {
  id: number;
  name: string;
  shiftType: "REGULAR" | "INTEGRAL";
};

type Subject = {
  id: number;
  name: string;
  classGroup: ClassGroup;
};

type Demand = {
  id: number;
  subject: Subject;
  quantityPerWeek: number;
  allowDoubleLesson: boolean;
  professors: Professor[];
};

type Timeslot = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  shiftType: "REGULAR" | "INTEGRAL";
};

type GradeEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  professors: string[];
};

const apiBase =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

async function getSummary(): Promise<SummaryResponse> {
  const response = await fetch(`${apiBase}/api/summary`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch summary: ${response.status}`);
  }

  return response.json();
}

async function getProfessors(): Promise<Professor[]> {
  const response = await fetch(`${apiBase}/api/professors`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch professors: ${response.status}`);
  }

  return response.json();
}

async function getClassGroups(): Promise<ClassGroup[]> {
  const response = await fetch(`${apiBase}/api/class-groups`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch class groups: ${response.status}`);
  }

  return response.json();
}

async function getSubjects(): Promise<Subject[]> {
  const response = await fetch(`${apiBase}/api/subjects`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subjects: ${response.status}`);
  }

  return response.json();
}

async function getDemands(): Promise<Demand[]> {
  const response = await fetch(`${apiBase}/api/demands`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch demands: ${response.status}`);
  }

  return response.json();
}

async function getTimeslots(): Promise<Timeslot[]> {
  const response = await fetch(`${apiBase}/api/timeslots`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch timeslots: ${response.status}`);
  }

  return response.json();
}

async function getUnavailability(): Promise<Unavailability[]> {
  const response = await fetch(`${apiBase}/api/unavailability`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch unavailability: ${response.status}`);
  }

  return response.json();
}

async function getGrade(classGroupId: number | null): Promise<GradeEntry[]> {
  if (!classGroupId) {
    return [];
  }

  const response = await fetch(`${apiBase}/api/grade/${classGroupId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch grade: ${response.status}`);
  }

  return response.json();
}

export default async function Home({
  searchParams,
}: {
  searchParams?: { classGroupId?: string };
}) {
  let summary: SummaryResponse | null = null;
  let professors: Professor[] = [];
  let classGroups: ClassGroup[] = [];
  let subjects: Subject[] = [];
  let demands: Demand[] = [];
  let timeslots: Timeslot[] = [];
  let unavailability: Unavailability[] = [];
  let gradeEntries: GradeEntry[] = [];
  let errorMessage: string | null = null;

  const rawClassGroupId = searchParams?.classGroupId;
  const parsedClassGroupId = rawClassGroupId ? Number(rawClassGroupId) : null;
  const selectedClassGroupId = Number.isFinite(parsedClassGroupId ?? NaN)
    ? parsedClassGroupId
    : null;

  try {
    summary = await getSummary();
    professors = await getProfessors();
    classGroups = await getClassGroups();
    subjects = await getSubjects();
    demands = await getDemands();
    timeslots = await getTimeslots();
    unavailability = await getUnavailability();
    const fallbackClassGroupId = selectedClassGroupId ?? classGroups[0]?.id ?? null;
    gradeEntries = await getGrade(fallbackClassGroupId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load";
  }

  const days = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const dayLabels: Record<number, string> = {
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
  };
  const selectedClassGroup = classGroups.find(
    (group) => group.id === (selectedClassGroupId ?? classGroups[0]?.id)
  );
  const shiftType = selectedClassGroup?.shiftType ?? "REGULAR";
  const timeslotsForShift = timeslots
    .filter((slot) => slot.shiftType === shiftType)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const timeRows = Array.from(
    new Map(
      timeslotsForShift.map((slot) => [
        `${slot.startTime}-${slot.endTime}`,
        {
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      ])
    ).values()
  );
  const gradeMap = new Map(
    gradeEntries.map((entry) => [
      `${entry.dayOfWeek}-${entry.startTime}-${entry.endTime}`,
      entry,
    ])
  );
  const unavailabilityByProfessor = new Map<number, Unavailability[]>();
  for (const entry of unavailability) {
    const list = unavailabilityByProfessor.get(entry.professorId) ?? [];
    list.push(entry);
    unavailabilityByProfessor.set(entry.professorId, list);
  }
  const professorNameById = new Map(professors.map((professor) => [professor.id, professor.name]));

  return (
    <div className="min-h-screen hero-gradient text-[color:var(--ink)]">
      <header className="mx-auto w-full max-w-7xl px-6 pt-10">
        <nav className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
          <span className="font-semibold">ETEC Timetabling MVP</span>
          <div className="flex flex-wrap items-center gap-4">
            <a className="hover:text-[color:var(--forest)]" href="#visao">
              Visao
            </a>
            <a className="hover:text-[color:var(--forest)]" href="#cadastro">
              Cadastro
            </a>
            <a className="hover:text-[color:var(--forest)]" href="#curriculo">
              Curriculo
            </a>
            <a className="hover:text-[color:var(--forest)]" href="#grade">
              Grade
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-6 pb-24 pt-10">
        <section
          id="visao"
          className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="space-y-6 fade-up">
            <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--grid)] bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
              MVP de horarios inteligentes
            </div>
            <h1 className="title-display text-4xl font-semibold leading-tight sm:text-5xl">
              O painel que transforma demandas em uma grade real, com co-teaching e
              horarios configuraveis.
            </h1>
            <p className="max-w-2xl text-lg text-[color:var(--muted)]">
              Aqui o fluxo e simples: cadastre professores, turmas e materias. Depois
              descreva as demandas por turma e clique em gerar. A grade usa os horarios
              que voce definiu, com intervalos reais de inicio e fim.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                className="rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:scale-[1.02]"
                href="/"
              >
                Atualizar painel
              </Link>
              <a
                className="rounded-full border border-[color:var(--grid)] bg-white/70 px-6 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--forest)]"
                href={`${apiBase}/api/health`}
                target="_blank"
                rel="noreferrer"
              >
                Verificar API
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass-panel rounded-2xl p-4 fade-in stagger-1">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Registro
                </p>
                <p className="mt-2 text-sm text-[color:var(--ink)]">
                  Cadastre professores, turmas, materias e horarios em minutos.
                </p>
              </div>
              <div className="glass-panel rounded-2xl p-4 fade-in stagger-2">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Demanda
                </p>
                <p className="mt-2 text-sm text-[color:var(--ink)]">
                  Defina quantas aulas por semana e co-teaching.
                </p>
              </div>
              <div className="glass-panel rounded-2xl p-4 fade-in stagger-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Grade
                </p>
                <p className="mt-2 text-sm text-[color:var(--ink)]">
                  Gere uma grade visual alinhada com os horarios reais.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel-strong rounded-3xl p-6 fade-up">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Status do backend
              </p>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                online
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[color:var(--forest)] px-4 py-5 text-white">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-100">
                      Professores
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.professors ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Turmas
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.classGroups ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Materias
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.subjects ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Demandas
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.demands ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Horarios
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.timeslots ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Grade gerada
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.scheduleEntries ?? 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="cadastro" className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="title-display text-3xl font-semibold">Cadastro base</h2>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Esta etapa alimenta o solver com pessoas, turmas e o formato do dia.
              Preencha primeiro os professores e turmas para depois conectar materias
              e demandas.
            </p>
            <div className="mt-6 space-y-4 text-sm text-[color:var(--muted)]">
              <div className="rounded-2xl border border-[color:var(--grid)] bg-white/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em]">Passo 1</p>
                <p className="mt-2">Cadastre professores e uma nota simples de indisponibilidade.</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--grid)] bg-white/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em]">Passo 2</p>
                <p className="mt-2">Crie turmas e marque se sao REGULAR ou INTEGRAL.</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--grid)] bg-white/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em]">Passo 3</p>
                <p className="mt-2">Defina os horarios reais (inicio e fim de cada aula).</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="glass-panel-strong rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Professores</h3>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {professors.length} registros
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--grid)] bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[color:var(--bg-strong)] text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Max</th>
                      <th className="px-4 py-3">Indisponivel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--grid)]">
                    {professors.map((professor) => (
                      <tr key={professor.id} className="text-[color:var(--muted)]">
                        <td className="px-4 py-3 font-semibold text-[color:var(--ink)]">
                          {professor.name}
                        </td>
                        <td className="px-4 py-3">{professor.maxWeeklyHours}</td>
                        <td className="px-4 py-3">
                          {(unavailabilityByProfessor.get(professor.id) ?? [])
                            .map((entry) =>
                              `${dayLabels[entry.dayOfWeek] ?? entry.dayOfWeek} ${entry.startTime}-${entry.endTime}`
                            )
                            .join(", ") || "-"}
                        </td>
                      </tr>
                    ))}
                    {professors.length === 0 && !errorMessage && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-[color:var(--muted)]" colSpan={3}>
                          Nenhum professor cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <form action={createProfessor} className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Nome
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                    name="name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Max horas
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                    name="maxWeeklyHours"
                    type="number"
                    min={1}
                    required
                  />
                </div>
                <button className="sm:col-span-2 rounded-2xl bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white">
                  Salvar professor
                </button>
              </form>
              <div className="mt-8 border-t border-[color:var(--grid)] pt-6">
                <h4 className="text-lg font-semibold">Editar professor</h4>
                <form action={updateProfessor} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Professor
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="professorId"
                      required
                    >
                      <option value="">Selecione</option>
                      {professors.map((professor) => (
                        <option key={professor.id} value={professor.id}>
                          {professor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Nome
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Max horas
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="maxWeeklyHours"
                      type="number"
                      min={1}
                      required
                    />
                  </div>
                  <button className="sm:col-span-2 rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--forest)]">
                    Atualizar professor
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Indisponibilidade</h3>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    {unavailability.length} registros
                  </span>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--grid)] bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[color:var(--bg-strong)] text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">Professor</th>
                        <th className="px-4 py-3">Dia</th>
                        <th className="px-4 py-3">Inicio</th>
                        <th className="px-4 py-3">Fim</th>
                        <th className="px-4 py-3">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--grid)]">
                      {unavailability.map((entry) => (
                        <tr key={entry.id} className="text-[color:var(--muted)]">
                          <td className="px-4 py-3 font-semibold text-[color:var(--ink)]">
                            {professorNameById.get(entry.professorId) ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            {dayLabels[entry.dayOfWeek] ?? entry.dayOfWeek}
                          </td>
                          <td className="px-4 py-3">{entry.startTime}</td>
                          <td className="px-4 py-3">{entry.endTime}</td>
                          <td className="px-4 py-3">
                            <form action={deleteUnavailability}>
                              <input type="hidden" name="unavailabilityId" value={entry.id} />
                              <button className="rounded-full border border-[color:var(--grid)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
                                Remover
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                      {unavailability.length === 0 && !errorMessage && (
                        <tr>
                          <td className="px-4 py-6 text-sm text-[color:var(--muted)]" colSpan={5}>
                            Nenhum intervalo cadastrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-panel-strong rounded-3xl p-6">
                <h3 className="text-xl font-semibold">Adicionar indisponibilidade</h3>
                <form action={createUnavailability} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Professor
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="professorId"
                      required
                    >
                      <option value="">Selecione</option>
                      {professors.map((professor) => (
                        <option key={professor.id} value={professor.id}>
                          {professor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Dia da semana
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="dayOfWeek"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="1">Segunda</option>
                      <option value="2">Terca</option>
                      <option value="3">Quarta</option>
                      <option value="4">Quinta</option>
                      <option value="5">Sexta</option>
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                        Inicio
                      </label>
                      <input
                        className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                        name="startTime"
                        type="time"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                        Fim
                      </label>
                      <input
                        className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                        name="endTime"
                        type="time"
                        required
                      />
                    </div>
                  </div>
                  <button className="w-full rounded-2xl bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white">
                    Salvar intervalo
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-3xl p-6">
                <h3 className="text-xl font-semibold">Turmas</h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--grid)] bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[color:var(--bg-strong)] text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Turno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--grid)]">
                      {classGroups.map((classGroup) => (
                        <tr key={classGroup.id} className="text-[color:var(--muted)]">
                          <td className="px-4 py-3 font-semibold text-[color:var(--ink)]">
                            {classGroup.name}
                          </td>
                          <td className="px-4 py-3">{classGroup.shiftType}</td>
                        </tr>
                      ))}
                      {classGroups.length === 0 && !errorMessage && (
                        <tr>
                          <td className="px-4 py-6 text-sm text-[color:var(--muted)]" colSpan={2}>
                            Nenhuma turma cadastrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="glass-panel-strong rounded-3xl p-6">
                <h3 className="text-xl font-semibold">Adicionar turma</h3>
                <form action={createClassGroup} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Nome
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Turno
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="shiftType"
                      defaultValue="REGULAR"
                    >
                      <option value="REGULAR">REGULAR</option>
                      <option value="INTEGRAL">INTEGRAL</option>
                    </select>
                  </div>
                  <button className="w-full rounded-2xl bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white">
                    Salvar turma
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-3xl p-6">
                <h3 className="text-xl font-semibold">Horarios</h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--grid)] bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[color:var(--bg-strong)] text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">Dia</th>
                        <th className="px-4 py-3">Inicio</th>
                        <th className="px-4 py-3">Fim</th>
                        <th className="px-4 py-3">Turno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--grid)]">
                      {timeslots.map((slot) => (
                        <tr key={slot.id} className="text-[color:var(--muted)]">
                          <td className="px-4 py-3">{slot.dayOfWeek}</td>
                          <td className="px-4 py-3">{slot.startTime}</td>
                          <td className="px-4 py-3">{slot.endTime}</td>
                          <td className="px-4 py-3">{slot.shiftType}</td>
                        </tr>
                      ))}
                      {timeslots.length === 0 && !errorMessage && (
                        <tr>
                          <td className="px-4 py-6 text-sm text-[color:var(--muted)]" colSpan={4}>
                            Nenhum horario cadastrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="glass-panel-strong rounded-3xl p-6">
                <h3 className="text-xl font-semibold">Adicionar horario</h3>
                <form action={createTimeslot} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Dia da semana
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="dayOfWeek"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="1">Segunda</option>
                      <option value="2">Terca</option>
                      <option value="3">Quarta</option>
                      <option value="4">Quinta</option>
                      <option value="5">Sexta</option>
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                        Inicio
                      </label>
                      <input
                        className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                        name="startTime"
                        type="time"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                        Fim
                      </label>
                      <input
                        className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                        name="endTime"
                        type="time"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Turno
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                      name="shiftType"
                      defaultValue="REGULAR"
                    >
                      <option value="REGULAR">REGULAR</option>
                      <option value="INTEGRAL">INTEGRAL</option>
                    </select>
                  </div>
                  <button className="w-full rounded-2xl bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white">
                    Salvar horario
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section id="curriculo" className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="title-display text-3xl font-semibold">Curriculo e demanda</h2>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Conecte materias a turmas e defina quantas aulas por semana. Se uma
              materia tem dois professores, marque ambos para co-teaching.
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[color:var(--grid)] bg-white/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em]">Materias</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Vincule cada materia a uma turma.
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--grid)] bg-white/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em]">Demandas</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Informe a quantidade de aulas e quem ministra.
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--grid)] bg-white/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em]">Dica</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Crie todas as demandas antes de gerar a grade.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="glass-panel-strong rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Materias</h3>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {subjects.length} registros
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--grid)] bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[color:var(--bg-strong)] text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    <tr>
                      <th className="px-4 py-3">Materia</th>
                      <th className="px-4 py-3">Turma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--grid)]">
                    {subjects.map((subject) => (
                      <tr key={subject.id} className="text-[color:var(--muted)]">
                        <td className="px-4 py-3 font-semibold text-[color:var(--ink)]">
                          {subject.name}
                        </td>
                        <td className="px-4 py-3">{subject.classGroup?.name}</td>
                      </tr>
                    ))}
                    {subjects.length === 0 && !errorMessage && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-[color:var(--muted)]" colSpan={2}>
                          Nenhuma materia cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <form action={createSubject} className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Nome
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                    name="name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Turma
                  </label>
                  <select
                    className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                    name="classGroupId"
                    required
                  >
                    <option value="">Selecione</option>
                    {classGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="sm:col-span-2 rounded-2xl bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white">
                  Salvar materia
                </button>
              </form>
            </div>

            <div className="glass-panel-strong rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Demandas</h3>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {demands.length} registros
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--grid)] bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[color:var(--bg-strong)] text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    <tr>
                      <th className="px-4 py-3">Materia</th>
                      <th className="px-4 py-3">Turma</th>
                      <th className="px-4 py-3">Qtd</th>
                      <th className="px-4 py-3">Professores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--grid)]">
                    {demands.map((demand) => (
                      <tr key={demand.id} className="text-[color:var(--muted)]">
                        <td className="px-4 py-3 font-semibold text-[color:var(--ink)]">
                          {demand.subject?.name}
                        </td>
                        <td className="px-4 py-3">{demand.subject?.classGroup?.name}</td>
                        <td className="px-4 py-3">{demand.quantityPerWeek}</td>
                        <td className="px-4 py-3">
                          {demand.professors.map((professor) => professor.name).join(", ")}
                        </td>
                      </tr>
                    ))}
                    {demands.length === 0 && !errorMessage && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-[color:var(--muted)]" colSpan={4}>
                          Nenhuma demanda cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <form action={createDemand} className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Materia
                  </label>
                  <select
                    className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                    name="subjectId"
                    required
                  >
                    <option value="">Selecione</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} - {subject.classGroup?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Quantidade
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm"
                    name="quantityPerWeek"
                    type="number"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Co-teaching
                  </label>
                  <div className="mt-2 grid gap-2 rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-3 text-sm">
                    {professors.map((professor) => (
                      <label key={professor.id} className="flex items-center gap-2">
                        <input type="checkbox" name="professorIds" value={professor.id} />
                        <span>{professor.name}</span>
                      </label>
                    ))}
                    {professors.length === 0 && (
                      <span className="text-xs text-[color:var(--muted)]">
                        Cadastre professores primeiro.
                      </span>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
                  <input type="checkbox" name="allowDoubleLesson" />
                  Permite geminhada
                </label>
                <button className="sm:col-span-2 rounded-2xl bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white">
                  Salvar demanda
                </button>
              </form>
            </div>
          </div>
        </section>

        <section id="grade" className="grid gap-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="title-display text-3xl font-semibold">Grade final</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  O solver usa os horarios cadastrados e preenche a grade por turma.
                </p>
              </div>
              <form action={startSolver}>
                <button className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-900/10 transition hover:bg-[color:var(--accent-dark)]">
                  Gerar horario
                </button>
              </form>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <form className="flex items-center gap-3">
                <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Turma
                </label>
                <select
                  className="rounded-2xl border border-[color:var(--grid)] bg-white px-4 py-2 text-sm"
                  name="classGroupId"
                  defaultValue={selectedClassGroupId ?? classGroups[0]?.id ?? ""}
                >
                  {classGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <button className="rounded-full border border-[color:var(--grid)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Ver turma
                </button>
              </form>
              {classGroups.length === 0 && (
                <span className="text-xs text-[color:var(--muted)]">
                  Cadastre turmas para ver a grade.
                </span>
              )}
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--grid)] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[color:var(--bg-strong)] text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">Horario</th>
                    {days.map((day) => (
                      <th key={day} className="px-4 py-3">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--grid)]">
                  {timeRows.map((row) => (
                    <tr key={`${row.startTime}-${row.endTime}`}>
                      <td className="px-4 py-3 font-semibold text-[color:var(--ink)]">
                        {row.startTime} - {row.endTime}
                      </td>
                      {days.map((_, index) => {
                        const entry = gradeMap.get(
                          `${index + 1}-${row.startTime}-${row.endTime}`
                        );
                        return (
                          <td
                            key={`${row.startTime}-${row.endTime}-${index}`}
                            className="px-4 py-3 text-[color:var(--muted)]"
                          >
                            {entry ? (
                              <div className="space-y-1">
                                <p className="font-semibold text-[color:var(--ink)]">
                                  {entry.subject}
                                </p>
                                <p className="text-xs text-[color:var(--muted)]">
                                  {entry.professors.join(", ")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-[color:var(--muted)]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {timeRows.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-[color:var(--muted)]" colSpan={6}>
                        Cadastre horarios para visualizar a grade.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
