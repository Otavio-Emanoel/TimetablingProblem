/**
 * SEED.JS - EtecFlow (Versão Final Corrigida)
 * Ajustado para Enums do Java (MONDAY, etc) e Horários (HH:mm:ss)
 */

const API_BASE = "http://localhost:8080";

// --- HELPERS ---
const DIAS_SEMANA_MAP = {
  1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY"
};

function formatTime(time) {
  // Garante HH:mm:ss (ex: "08:00" -> "08:00:00")
  return time.length === 5 ? `${time}:00` : time;
}

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

// --- FUNÇÕES DE API ---
async function post(endpoint, data) {
  try {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const text = await res.text();
      // Ignora erro 409 (Conflict) se já existir, mas avisa se for outro
      if (res.status !== 409) {
        console.warn(`\n⚠️  Aviso em ${endpoint}: ${res.status} - ${text.substring(0, 80)}...`);
      }
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`\n❌ Erro de Conexão em ${endpoint}: ${e.message}`);
    return null;
  }
}

async function fetchProfessorId(nome) {
  try {
    const res = await fetch(`${API_BASE}/api/professors`);
    if(!res.ok) return null;
    const list = await res.json();
    const found = list.find(p => p.name.toUpperCase() === nome.toUpperCase());
    return found ? found.id : null;
  } catch (e) { return null; }
}

// --- EXECUÇÃO ---
async function main() {
  console.log("🚀 INICIANDO SEED (CORRIGIDO)...");

  // 1. PROFESSORES
  console.log("\n--- 1. Professores ---");
  for (const nome of PROFESSORES) {
    let id = null;
    const res = await post("professors", { name: nome });
    if (res) id = res.id;
    else id = await fetchProfessorId(nome);

    if (id) {
      mapProf.set(nome, id);
      process.stdout.write("✅");
    } else {
      console.error(`\n❌ FALHA: Não consegui criar/achar ${nome}`);
    }
  }

  // 2. TURMAS
  console.log("\n\n--- 2. Turmas ---");
  for (const t of TURMAS) {
    const res = await post("class-groups", t);
    if (res) mapTurma.set(t.name, res.id);
    process.stdout.write("✅");
  }

  // 3. HORÁRIOS (Ajustado para enviar "MONDAY" e "08:00:00")
  console.log("\n\n--- 3. Horários ---");
  const dias = [1, 2, 3, 4, 5];
  
  for (const diaNum of dias) {
    const diaString = DIAS_SEMANA_MAP[diaNum]; // Converte 1 -> "MONDAY"

    // Função para criar o payload correto
    const createSlot = async (h, tipo) => {
      await post("timeslots", { 
        dayOfWeek: diaString, 
        startTime: formatTime(h.start), 
        endTime: formatTime(h.end), 
        shiftType: tipo 
      });
    };

    // Criar slots comuns (Regular e Integral)
    for (const h of HORARIOS_COMUNS) {
      await createSlot(h, "REGULAR");
      await createSlot(h, "INTEGRAL");
    }
    
    // Criar slot critico (12:30) - SÓ REGULAR
    await createSlot(SLOT_ALMOCO, "REGULAR");

    // Criar slots tarde - SÓ INTEGRAL
    for (const h of HORARIOS_TARDE) {
      await createSlot(h, "INTEGRAL");
    }
    
    process.stdout.write(` [${diaString.substring(0,3)}]`);
  }

  // 4. DEMANDAS
  console.log("\n\n--- 4. Demandas ---");
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
    if (!turmaId) continue;

    // Matéria
    const subj = await post("subjects", { name: d.m, classGroupId: turmaId });
    if (!subj) continue;

    // Professores
    const nomesProfs = Array.isArray(d.p) ? d.p : [d.p];
    const idsProfs = nomesProfs.map(n => mapProf.get(n)).filter(id => id);

    if (idsProfs.length > 0) {
      await post("demands", {
        subjectId: subj.id,
        professorIds: idsProfs,
        quantityPerWeek: d.q,
        allowDoubleLesson: true
      });
      process.stdout.write("+");
    }
  }

  console.log("\n\n✅ SEED FINALIZADO! Teste agora.");
}

main();