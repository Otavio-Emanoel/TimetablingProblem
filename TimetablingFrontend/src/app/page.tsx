type SummaryResponse = {
  timeslots: number;
  professors: number;
  classGroups: number;
  subjects: number;
  lessons: number;
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

export default async function Home() {
  let summary: SummaryResponse | null = null;
  let errorMessage: string | null = null;

  try {
    summary = await getSummary();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load";
  }

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
              preparar o solver. Agora o frontend ja conversa com o backend.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                href="/"
              >
                Atualizar painel
              </a>
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
                  (summary?.lessons ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Base de dados</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">PostgreSQL 15</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
