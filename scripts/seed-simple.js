/**
 * SEED SIMPLES - Para Teste Rápido
 * Cria apenas 2 turmas e poucas aulas para facilitar a visualização.
 */

const API_BASE = process.env.API_BASE || process.env.API_BASE_URL || "http://localhost:8080"; // Ajuste se seu backend estiver em outra porta

// --- DADOS SIMPLIFICADOS ---

const PROFESSORES = [
  "Prof. Ana (Mat)",
  "Prof. Bruno (Hist)",
  "Prof. Carlos (Prog)",
  "Prof. Fernanda (Prog)",
  "Prof. Iury (Fis)",
  "Prof. Tamara (Port)",
  "Prof. Valdeci (Mat)"
];

const TURMAS = [
  { name: "TURMA 1 (INTEGRAL)", shiftType: "INTEGRAL" },
  { name: "TURMA 2 (REGULAR)", shiftType: "REGULAR" }
];

// Grade horária completa é necessária para o "tabuleiro" do solver existir
const HORARIOS_COMUNS = [
  { start: "08:00", end: "08:50" }, { start: "08:50", end: "09:40" },
  { start: "10:00", end: "10:50" }, { start: "10:50", end: "11:40" }, { start: "11:40", end: "12:30" }
];
const SLOT_ALMOCO = { start: "12:30", end: "13:20" }; // Só regular tem aula
const HORARIOS_TARDE = [
  { start: "13:30", end: "14:20" }, { start: "14:20", end: "15:10" }, { start: "15:10", end: "16:00" }
];

const DIAS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

// --- FUNÇÕES DE AJUDA ---

function formatTime(time) {
  return time.length === 5 ? `${time}:00` : time;
}

async function post(endpoint, data) {
  try {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // Ignora erro se já existe (409)
      if (res.status !== 409) console.log(`   ⚠️ ${endpoint}: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`❌ Erro em ${endpoint}:`, e.message);
    return null;
  }
}

async function getProfId(name) {
  const res = await fetch(`${API_BASE}/api/professors`);
  const list = await res.json();
  return list.find(p => p.name === name)?.id;
}

async function getTurmaId(name) {
  const res = await fetch(`${API_BASE}/api/class-groups`);
  const list = await res.json();
  return list.find(t => t.name === name)?.id;
}

async function getSubject(name, classGroupId) {
  const res = await fetch(`${API_BASE}/api/subjects?classGroupId=${classGroupId}`);
  if (!res.ok) return null;
  const list = await res.json();
  return list.find(s => s.name === name) || null;
}

// --- EXECUÇÃO ---

async function main() {
  if (process.argv.includes("--reset")) {
    console.log("🧹 Limpando banco de dados (--reset)...");
    await fetch(`${API_BASE}/api/reset`, { method: "DELETE" });
  }
  console.log("🧪 INICIANDO TESTE SIMPLES...");

  // 1. Criar Professores
  console.log("1. Criando Professores...");
  for (const p of PROFESSORES) await post("professors", { name: p });

  // 2. Criar Turmas
  console.log("2. Criando Turmas...");
  for (const t of TURMAS) await post("class-groups", t);

  // 3. Criar Horários (Estrutura do Tabuleiro)
  console.log("3. Criando Grade Horária (Seg-Sex)...");
  for (const dia of DIAS) {
    // Manhã Comum
    for (const h of HORARIOS_COMUNS) {
      await post("timeslots", { dayOfWeek: dia, startTime: formatTime(h.start), endTime: formatTime(h.end), shiftType: "REGULAR" });
      await post("timeslots", { dayOfWeek: dia, startTime: formatTime(h.start), endTime: formatTime(h.end), shiftType: "INTEGRAL" });
    }
    // Hora do Almoço (O Pulo do Gato: Só Regular tem aula)
    await post("timeslots", { dayOfWeek: dia, startTime: formatTime(SLOT_ALMOCO.start), endTime: formatTime(SLOT_ALMOCO.end), shiftType: "REGULAR" });
    
    // Tarde (Só Integral)
    for (const h of HORARIOS_TARDE) {
      await post("timeslots", { dayOfWeek: dia, startTime: formatTime(h.start), endTime: formatTime(h.end), shiftType: "INTEGRAL" });
    }
  }

  // 4. Criar Demandas (Aulas)
  console.log("4. Criando Demandas Específicas (mais completas)...");

  const idAna = await getProfId("Prof. Ana (Mat)");
  const idBruno = await getProfId("Prof. Bruno (Hist)");
  const idCarlos = await getProfId("Prof. Carlos (Prog)");
  const idFernanda = await getProfId("Prof. Fernanda (Prog)");
  const idIury = await getProfId("Prof. Iury (Fis)");
  const idTamara = await getProfId("Prof. Tamara (Port)");
  const idValdeci = await getProfId("Prof. Valdeci (Mat)");

  const idTurma1 = await getTurmaId("TURMA 1 (INTEGRAL)");
  const idTurma2 = await getTurmaId("TURMA 2 (REGULAR)");

  // --- TURMA 1 (INTEGRAL) : reduzir carga por disciplina (max 3/sem) e aumentar diversidade ---
  if (idTurma1) {
    const allProfIds = [idAna, idBruno, idCarlos, idFernanda, idIury, idTamara, idValdeci].filter(Boolean);

    const subjectsTurma1 = [
      { name: "Matemática", prefer: [idAna, idValdeci], qty: 3 },
      { name: "Física", prefer: [idIury], qty: 3 },
      { name: "Português", prefer: [idTamara], qty: 3 },
      { name: "História", prefer: [idBruno], qty: 3 },
      { name: "Geografia", prefer: [idBruno], qty: 3 },
      { name: "Programação", prefer: [idCarlos, idFernanda], qty: 3 },
      { name: "Química", prefer: [], qty: 3 },
      { name: "Sociologia", prefer: [], qty: 3 },
      { name: "Educação Física", prefer: [], qty: 2 },
      { name: "Inglês", prefer: [], qty: 3 },
      { name: "Artes", prefer: [], qty: 3 },
      { name: "Biologia", prefer: [], qty: 3 }
    ];

    for (const s of subjectsTurma1) {
      const subj = (await post("subjects", { name: s.name, classGroupId: idTurma1 })) || (await getSubject(s.name, idTurma1));
      if (!subj) continue;
      // escolher um professor preferido se disponível, senão qualquer um
      const chosen = (s.prefer || []).find((p) => p) || allProfIds[0];
      const demandPayload = { subjectId: subj.id, quantityPerWeek: s.qty, allowDoubleLesson: s.qty >= 2 };
      if (chosen) demandPayload.professorIds = [chosen];
      await post("demands", demandPayload);
      console.log(`   ✅ ${s.name} (Integral) - ${s.qty} aulas criadas`);
    }
  }

  // --- TURMA 2 (REGULAR) : reduzir por disciplina (max 3/sem) e diversidade ---
  if (idTurma2) {
    const allProfIdsR = [idAna, idBruno, idCarlos, idFernanda, idIury, idTamara, idValdeci].filter(Boolean);

    const subjectsTurma2 = [
      { name: "Matemática", prefer: [idValdeci, idAna], qty: 3 },
      { name: "História", prefer: [idBruno], qty: 3 },
      { name: "Português", prefer: [idTamara], qty: 3 },
      { name: "Artes", prefer: [], qty: 2 },
      { name: "Programação", prefer: [idCarlos, idFernanda], qty: 3 },
      { name: "Educação Física", prefer: [], qty: 2 },
      { name: "Inglês", prefer: [], qty: 3 },
      { name: "Química", prefer: [], qty: 3 },
      { name: "Sociologia", prefer: [], qty: 2 },
      { name: "Biologia", prefer: [], qty: 2 }
    ];

    for (const s of subjectsTurma2) {
      const subj = (await post("subjects", { name: s.name, classGroupId: idTurma2 })) || (await getSubject(s.name, idTurma2));
      if (!subj) continue;
      const chosen = (s.prefer || []).find((p) => p) || allProfIdsR[0];
      const demandPayload = { subjectId: subj.id, quantityPerWeek: s.qty, allowDoubleLesson: s.qty >= 2 };
      if (chosen) demandPayload.professorIds = [chosen];
      await post("demands", demandPayload);
      console.log(`   ✅ ${s.name} (Regular) - ${s.qty} aulas criadas`);
    }
  }

  console.log("\n🏁 PRONTO! Seed simples atualizado. Vá ao navegador e clique em 'Rodar Solver Agora'.");
  console.log("   As turmas estarão quase completas (1-2 vagas por semana). Ajuste quantidades conforme preciso.");
}

main();
