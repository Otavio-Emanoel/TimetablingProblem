/**
 * SEED.JS - EtecFlow (Versão Robusta)
 * Corrige o erro de "professorIds empty" e garante a integridade dos dados.
 */

const API_BASE = "http://localhost:8080";

// --- DADOS ---
const PROFESSORES = [
  "RODRIGO", "DANILO", "FIDELIS", "ELZA", "ELIAMAR", "IURY", "GISBERT", 
  "PATRICIA", "FABIO P", "VERIDIANE", "EVELISE", "JUANITA", "MARCIO", 
  "JOSE A", "LUIZ F", "ANDREIA", "THIAGO", "JEAN", "WILLIAM G", 
  "WILLIAM B", "ADRIANA", "TAMARA", "CARLOS C", "FERNANDA", "WELLINGTON", 
  "MEIRE", "SONIA", "CAROLINE", "GABRIELA", "VALDECI", "PAULO", "ELISANGELA"
];

const TURMAS = [
  { name: "1MAD", shiftType: "INTEGRAL" }, { name: "2MAD", shiftType: "INTEGRAL" }, { name: "3MAD", shiftType: "INTEGRAL" },
  { name: "1MDS", shiftType: "INTEGRAL" }, { name: "2MDS", shiftType: "INTEGRAL" }, { name: "3MDS", shiftType: "INTEGRAL" },
  { name: "1MDI", shiftType: "INTEGRAL" }, { name: "2MDI", shiftType: "INTEGRAL" },
  { name: "1JOD", shiftType: "REGULAR" },  { name: "2JOD", shiftType: "REGULAR" },  { name: "3JOD", shiftType: "REGULAR" }
];

const HORARIOS_COMUNS = [
  { start: "08:00", end: "08:50" }, { start: "08:50", end: "09:40" },
  { start: "10:00", end: "10:50" }, { start: "10:50", end: "11:40" }, { start: "11:40", end: "12:30" }
];
const SLOT_ALMOCO = { start: "12:30", end: "13:20" };
const HORARIOS_TARDE = [
  { start: "13:30", end: "14:20" }, { start: "14:20", end: "15:10" }, { start: "15:10", end: "16:00" }
];

// --- MAPAS GLOBAIS ---
const mapProf = new Map();
const mapTurma = new Map();

// --- FUNÇÕES ---
async function post(endpoint, data) {
  try {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      // Se já existe, tentamos buscar (para casos de re-run)
      console.warn(`⚠️ Erro ao criar ${endpoint} (pode já existir): ${text.substring(0, 50)}...`);
      return null; 
    }
    return await res.json();
  } catch (e) {
    console.error(`❌ Erro FATAL em ${endpoint}: ${e.message}`);
    return null;
  }
}

// Busca professor por nome se falhar ao criar
async function fetchProfessorId(nome) {
  try {
    const res = await fetch(`${API_BASE}/api/professors`);
    const list = await res.json();
    const found = list.find(p => p.name === nome);
    return found ? found.id : null;
  } catch (e) { return null; }
}

async function main() {
  console.log("🚀 INICIANDO SEED ROBUSTO...");

  // 1. PROFESSORES
  console.log("\n--- 1. Professores ---");
  for (const nome of PROFESSORES) {
    let id = null;
    const res = await post("professors", { name: nome });
    if (res) id = res.id;
    else id = await fetchProfessorId(nome); // Fallback: busca se já existe

    if (id) {
      mapProf.set(nome, id);
      process.stdout.write("✅");
    } else {
      console.error(`\n❌ FALHA CRÍTICA: Não consegui ID para ${nome}`);
    }
  }

  // 2. TURMAS
  console.log("\n\n--- 2. Turmas ---");
  for (const t of TURMAS) {
    const res = await post("class-groups", t);
    if (res) {
      mapTurma.set(t.name, res.id);
      process.stdout.write("✅");
    }
  }

  // 3. HORÁRIOS
  console.log("\n\n--- 3. Horários ---");
  const dias = [1, 2, 3, 4, 5];
  for (const dia of dias) {
    for (const h of HORARIOS_COMUNS) {
      await post("timeslots", { dayOfWeek: dia, ...h, shiftType: "REGULAR" });
      await post("timeslots", { dayOfWeek: dia, ...h, shiftType: "INTEGRAL" });
    }
    // Slot Crítico
    await post("timeslots", { dayOfWeek: dia, ...SLOT_ALMOCO, shiftType: "REGULAR" });
    // Tarde
    for (const h of HORARIOS_TARDE) {
      await post("timeslots", { dayOfWeek: dia, ...h, shiftType: "INTEGRAL" });
    }
    process.stdout.write(` [Dia ${dia}]`);
  }

  // 4. DEMANDAS (Aulas)
  console.log("\n\n--- 4. Demandas (Onde estava o erro) ---");
  
  const demandas = [
    // 1MDS
    { t: "1MDS", m: "EAMT", p: ["ELZA", "ELIAMAR"], q: 4 },
    { t: "1MDS", m: "FI", p: "IURY", q: 2 },
    { t: "1MDS", m: "ING", p: "PATRICIA", q: 2 },
    { t: "1MDS", m: "LPC", p: "FABIO P", q: 4 },
    { t: "1MDS", m: "EACNT", p: ["ANDREIA", "ELZA"], q: 4 },
    { t: "1MDS", m: "PW III", p: "PAULO", q: 4 },
    // 3JOD
    { t: "3JOD", m: "FILO", p: "JUANITA", q: 2 },
    { t: "3JOD", m: "MAT", p: "LUIZ F", q: 4 },
    { t: "3JOD", m: "TDDGA III", p: "CARLOS C", q: 4 },
    { t: "3JOD", m: "ANI 3D", p: "CARLOS C", q: 4 },
    // 1JOD
    { t: "1JOD", m: "TDDGA I", p: ["CARLOS C", "FERNANDA"], q: 4 },
    { t: "1JOD", m: "MAT", p: "LUIZ F", q: 4 },
    // 1MDI
    { t: "1MDI", m: "ERGO", p: ["CAROLINE", "GABRIELA"], q: 4 },
    { t: "1MDI", m: "ROPI I", p: "SONIA", q: 4 },
  ];

  for (const d of demandas) {
    const turmaId = mapTurma.get(d.t);
    if (!turmaId) { console.error(`\nTurma não achada: ${d.t}`); continue; }

    // Cria matéria
    const subj = await post("subjects", { name: d.m, classGroupId: turmaId });
    if (!subj) continue;

    // Resolve Professores
    const nomesProfs = Array.isArray(d.p) ? d.p : [d.p];
    const idsProfs = nomesProfs.map(n => mapProf.get(n)).filter(id => id);

    if (idsProfs.length === 0) {
      console.error(`\n❌ ERRO: Nenhum professor encontrado para ${d.m} em ${d.t} (Nomes: ${nomesProfs})`);
      continue; // Pula para não travar o backend
    }

    // Cria Demanda
    await post("demands", {
      subjectId: subj.id,
      professorIds: idsProfs,
      quantityPerWeek: d.q,
      allowDoubleLesson: true
    });
    process.stdout.write("+");
  }

  console.log("\n\n✅ SEED FINALIZADO! Pode rodar o solver.");
}

main();