import Link from "next/link";
import {
  createClassGroup,
  createDemand,
  createProfessor,
  createSubject,
  createTimeslot,
  startSolver,
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
  email: string;
  maxWeeklyHours: number;
  unavailability?: string | null;
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
    const fallbackClassGroupId = selectedClassGroupId ?? classGroups[0]?.id ?? null;
    gradeEntries = await getGrade(fallbackClassGroupId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load";
  }

  const days = ["Seg", "Ter", "Qua", "Qui", "Sex"];
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f4d2b9,_#f6f2ea_40%,_#e9edf5_70%)] text-slate-900">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
              ETEC Timetabling
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Grade inteligente para turnos que nao se chocam.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              Conectado ao backend Spring Boot para monitorar o estado dos dados e
              preparar o solver. O painel abaixo ja cria professores, turmas e demandas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                href="/"
              >
                Atualizar painel
              </Link>
              <a
                className="rounded-full border border-slate-900/20 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900/40"
                href={`${apiBase}/api/health`}
                target="_blank"
                rel="noreferrer"
              >
                Verificar API
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                  <div className="rounded-2xl bg-slate-900 px-4 py-5 text-white">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Professores
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.professors ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5 text-slate-900 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Turmas
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.classGroups ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5 text-slate-900 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Materias
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.subjects ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5 text-slate-900 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Aulas
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.lessons ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5 text-slate-900 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Demandas
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {summary?.demands ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-5 text-slate-900 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
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
        </header>

        <section className="grid gap-6 rounded-3xl border border-white/70 bg-white/60 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Resumo dos dados</h2>
              <p className="text-sm text-slate-600">
                Timeslots registrados e contagem geral para iniciar a otimizacao.
              </p>
            </div>
            <div className="rounded-full bg-slate-900/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Fonte: API
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timeslots</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {summary?.timeslots ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total de registros</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {(summary?.timeslots ?? 0) +
                  (summary?.professors ?? 0) +
                  (summary?.classGroups ?? 0) +
                  (summary?.subjects ?? 0) +
                  (summary?.lessons ?? 0) +
                  (summary?.demands ?? 0) +
                  (summary?.scheduleEntries ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Base de dados</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">PostgreSQL 15</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Professores</h3>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {professors.length} registros
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Max horas</th>
                    <th className="px-4 py-3">Indisponivel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {professors.map((professor) => (
                    <tr key={professor.id} className="text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {professor.name}
                      </td>
                      <td className="px-4 py-3">{professor.email}</td>
                      <td className="px-4 py-3">{professor.maxWeeklyHours}</td>
                      <td className="px-4 py-3">{professor.unavailability || "-"}</td>
                    </tr>
                  ))}
                  {professors.length === 0 && !errorMessage && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                        Nenhum professor cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <h3 className="text-xl font-semibold text-slate-900">Adicionar professor</h3>
            <form action={createProfessor} className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Nome
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="name"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Email
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Max horas semanais
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="maxWeeklyHours"
                  type="number"
                  min={1}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Indisponibilidade
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="unavailability"
                  placeholder="Ex: Ter-Manha"
                />
              </div>
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Salvar professor
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Turmas</h3>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {classGroups.length} registros
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Turno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classGroups.map((classGroup) => (
                    <tr key={classGroup.id} className="text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {classGroup.name}
                      </td>
                      <td className="px-4 py-3">{classGroup.shiftType}</td>
                    </tr>
                  ))}
                  {classGroups.length === 0 && !errorMessage && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={2}>
                        Nenhuma turma cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <h3 className="text-xl font-semibold text-slate-900">Adicionar turma</h3>
            <form action={createClassGroup} className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Nome
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="name"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Turno
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="shiftType"
                  defaultValue="REGULAR"
                >
                  <option value="REGULAR">REGULAR</option>
                  <option value="INTEGRAL">INTEGRAL</option>
                </select>
              </div>
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Salvar turma
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Horarios</h3>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {timeslots.length} registros
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Dia</th>
                    <th className="px-4 py-3">Inicio</th>
                    <th className="px-4 py-3">Fim</th>
                    <th className="px-4 py-3">Turno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeslots.map((slot) => (
                    <tr key={slot.id} className="text-slate-700">
                      <td className="px-4 py-3">{slot.dayOfWeek}</td>
                      <td className="px-4 py-3">{slot.startTime}</td>
                      <td className="px-4 py-3">{slot.endTime}</td>
                      <td className="px-4 py-3">{slot.shiftType}</td>
                    </tr>
                  ))}
                  {timeslots.length === 0 && !errorMessage && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                        Nenhum horario cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <h3 className="text-xl font-semibold text-slate-900">Adicionar horario</h3>
            <form action={createTimeslot} className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Dia da semana
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Inicio
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    name="startTime"
                    type="time"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Fim
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    name="endTime"
                    type="time"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Turno
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="shiftType"
                  defaultValue="REGULAR"
                >
                  <option value="REGULAR">REGULAR</option>
                  <option value="INTEGRAL">INTEGRAL</option>
                </select>
              </div>
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Salvar horario
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Materias</h3>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {subjects.length} registros
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Materia</th>
                    <th className="px-4 py-3">Turma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {subject.name}
                      </td>
                      <td className="px-4 py-3">{subject.classGroup?.name}</td>
                    </tr>
                  ))}
                  {subjects.length === 0 && !errorMessage && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={2}>
                        Nenhuma materia cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <h3 className="text-xl font-semibold text-slate-900">Adicionar materia</h3>
            <form action={createSubject} className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Nome
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="name"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Turma
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Salvar materia
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Demandas</h3>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {demands.length} registros
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Materia</th>
                    <th className="px-4 py-3">Turma</th>
                    <th className="px-4 py-3">Qtd</th>
                    <th className="px-4 py-3">Professores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demands.map((demand) => (
                    <tr key={demand.id} className="text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-900">
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
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                        Nenhuma demanda cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <h3 className="text-xl font-semibold text-slate-900">Adicionar demanda</h3>
            <form action={createDemand} className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Materia
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Quantidade por semana
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  name="quantityPerWeek"
                  type="number"
                  min={1}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Professores
                </label>
                <div className="mt-2 grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  {professors.map((professor) => (
                    <label key={professor.id} className="flex items-center gap-2">
                      <input type="checkbox" name="professorIds" value={professor.id} />
                      <span>{professor.name}</span>
                    </label>
                  ))}
                  {professors.length === 0 && (
                    <span className="text-xs text-slate-500">Cadastre professores primeiro.</span>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="allowDoubleLesson" />
                Permite geminhada
              </label>
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Salvar demanda
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Grade gerada</h3>
              <p className="text-sm text-slate-600">
                Clique em gerar horario e veja a grade por turma.
              </p>
            </div>
            <form action={startSolver}>
              <button className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white">
                Gerar horario
              </button>
            </form>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <form className="flex items-center gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Turma
              </label>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"
                name="classGroupId"
                defaultValue={selectedClassGroupId ?? classGroups[0]?.id ?? ""}
              >
                {classGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <button className="rounded-full border border-slate-900/20 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Ver turma
              </button>
            </form>
            {classGroups.length === 0 && (
              <span className="text-xs text-slate-500">
                Cadastre turmas para ver a grade.
              </span>
            )}
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Horario</th>
                  {days.map((day) => (
                    <th key={day} className="px-4 py-3">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeRows.map((row) => (
                  <tr key={`${row.startTime}-${row.endTime}`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.startTime} - {row.endTime}
                    </td>
                    {days.map((_, index) => {
                      const entry = gradeMap.get(
                        `${index + 1}-${row.startTime}-${row.endTime}`
                      );
                      return (
                        <td
                          key={`${row.startTime}-${row.endTime}-${index}`}
                          className="px-4 py-3 text-slate-700"
                        >
                          {entry ? (
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{entry.subject}</p>
                              <p className="text-xs text-slate-500">
                                {entry.professors.join(", ")}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
