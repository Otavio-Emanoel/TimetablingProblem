/**
 * SEED.JS - EtecFlow
 * Script de população automática baseado no PDF "31.01.2025-HORÁRIO-GERAL"
 * Focado no conflito Regular (12:30 aula) vs Integral (12:30 almoço)
 */

const API_BASE = "http://localhost:8080";

// --- 1. DADOS MESTRES (Extraídos do PDF) ---

const PROFESSORES = [
  // Base Comum e Integrado
  "RODRIGO", "DANILO", "FIDELIS", "ELZA", "ELIAMAR", "IURY", "GISBERT", 
  "PATRICIA", "FABIO P", "VERIDIANE", "EVELISE", "JUANITA", "MARCIO", 
  "JOSE A", "LUIZ F", "ANDREIA", "THIAGO", "JEAN", "WILLIAM G", 
  "WILLIAM B", "ADRIANA", "TAMARA", "CARLOS C", "FERNANDA", "WELLINGTON", 
  "MEIRE", "SONIA", "CAROLINE", "GABRIELA", "VALDECI", "PAULO"
];

const TURMAS = [
  // INTEGRAL (M-Tec / AMS) - Aulas até 16:00
  { name: "1MAD", shiftType: "INTEGRAL" },
  { name: "2MAD", shiftType: "INTEGRAL" },
  { name: "3MAD", shiftType: "INTEGRAL" },
  { name: "1MDS", shiftType: "INTEGRAL" },
  { name: "2MDS", shiftType: "INTEGRAL" },
  { name: "3MDS", shiftType: "INTEGRAL" },
  { name: "1MDI", shiftType: "INTEGRAL" },
  { name: "2MDI", shiftType: "INTEGRAL" },
  
  // REGULAR (JOD) - Aulas até 13:20
  { name: "1JOD", shiftType: "REGULAR" },
  { name: "2JOD", shiftType: "REGULAR" },
  { name: "3JOD", shiftType: "REGULAR" }
];

// Configuração dos Horários (O Segredo do Conflito)
const HORARIOS_BASE = [
  // Manhã Comum (Aulas 1 a 5)
  { start: "08:00", end: "08:50" },
  { start: "08:50", end: "09:40" },
  // Intervalo 09:40-10:00 (Ignorado pelo solver)
  { start: "10:00", end: "10:50" },
  { start: "10:50", end: "11:40" },
  { start: "11:40", end: "12:30" },
];

const HORARIO_CONFLITO = { start: "12:30", end: "13:20" }; // Apenas Regular tem aula
const HORARIOS_TARDE = [
  // Tarde (Apenas Integral)
  { start: "13:30", end: "14:20" },
  { start: "14:20", end: "15:10" },
  { start: "15:10", end: "16:00" }
];

// --- 2. HELPERS DE API ---

async function post(endpoint, data) {
  try {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // Se der erro 409 (Conflict) ou similar, ignoramos para não parar o script
      const text = await res.text();
      // console.warn(`⚠️ Aviso em ${endpoint}: ${text.substring(0, 100)}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`❌ Erro de conexão em ${endpoint}: ${e.message}`);
    return null;
  }
}

// Mapas para armazenar IDs retornados pelo banco
const mapProf = new Map();
const mapTurma = new Map();

// --- 3. EXECUÇÃO PRINCIPAL ---

async function main() {
  console.log("🚀 INICIANDO POPULAÇÃO DO BANCO DE DADOS ETEC FLOW...\n");

  // A. PROFESSORES
  console.log("--- 1. Cadastrando Professores ---");
  for (const nome of PROFESSORES) {
    const res = await post("professors", { name: nome });
    if (res) {
      mapProf.set(nome, res.id);
      process.stdout.write(".");
    }
  }
  console.log(" Concluído!");

  // B. TURMAS
  console.log("\n--- 2. Cadastrando Turmas ---");
  for (const turma of TURMAS) {
    const res = await post("class-groups", { name: turma.name, shiftType: turma.shiftType });
    if (res) {
      mapTurma.set(turma.name, res.id);
      process.stdout.write(".");
    }
  }
  console.log(" Concluído!");

  // C. TIMESLOTS (HORÁRIOS)
  console.log("\n--- 3. Gerando Grade de Horários (Lógica Regular vs Integral) ---");
  const diasSemana = [1, 2, 3, 4, 5]; // Seg a Sex

  for (const dia of diasSemana) {
    // 1. Horários Comuns (Manhã) - Criamos para AMBOS os turnos
    for (const h of HORARIOS_BASE) {
      // Criar para REGULAR
      await post("timeslots", { dayOfWeek: dia, startTime: h.start, endTime: h.end, shiftType: "REGULAR" });
      // Criar para INTEGRAL
      await post("timeslots", { dayOfWeek: dia, startTime: h.start, endTime: h.end, shiftType: "INTEGRAL" });
    }

    // 2. O Horário Crítico (12:30) - CRIAR APENAS PARA REGULAR
    // O Integral está almoçando, então NÃO criamos timeslot letivo para Integral aqui.
    await post("timeslots", { 
      dayOfWeek: dia, 
      startTime: HORARIO_CONFLITO.start, 
      endTime: HORARIO_CONFLITO.end, 
      shiftType: "REGULAR" 
    });

    // 3. Horários da Tarde - CRIAR APENAS PARA INTEGRAL
    for (const h of HORARIOS_TARDE) {
      await post("timeslots", { dayOfWeek: dia, startTime: h.start, endTime: h.end, shiftType: "INTEGRAL" });
    }
    process.stdout.write(` [Dia ${dia} OK] `);
  }
  console.log("\nHorários gerados com sucesso!");

  // D. DEMANDAS (MATÉRIAS E QUEM DÁ AULA)
  console.log("\n--- 4. Cadastrando Matérias e Demandas (Baseado no PDF) ---");
  
  // Função auxiliar para cadastrar tudo de uma vez
  async function addAula(turmaNome, materia, profsNomes, qtdSemanal) {
    const turmaId = mapTurma.get(turmaNome);
    if (!turmaId) return;

    // 1. Cria Matéria
    const subj = await post("subjects", { name: materia, classGroupId: turmaId });
    if (!subj) return;

    // 2. Resolve IDs dos Professores (Suporta Co-Teaching)
    const profsIds = [];
    if (!Array.isArray(profsNomes)) profsNomes = [profsNomes];
    
    for (const p of profsNomes) {
      const id = mapProf.get(p);
      if (id) profsIds.push(id);
      else console.warn(`⚠️ Prof não achado: ${p}`);
    }

    // 3. Cria Demanda
    await post("demands", {
      subjectId: subj.id,
      professorIds: profsIds,
      quantityPerWeek: qtdSemanal,
      allowDoubleLesson: true // Padrão: permite dobradinha
    });
    process.stdout.write("+");
  }

  // --- DADOS REAIS EXTRAÍDOS DO PDF ---
  
  // === 1MDS (INTEGRAL) ===
  await addAula("1MDS", "AI (Artes)", "RODRIGO", 2);
  await addAula("1MDS", "EAMT (Matemática)", ["ELZA", "ELIAMAR"], 4); // Exemplo Co-Teaching
  await addAula("1MDS", "FI (Física)", "IURY", 2);
  await addAula("1MDS", "ING (Inglês)", "PATRICIA", 2);
  await addAula("1MDS", "LPC (Lógica)", "FABIO P", 4);
  await addAula("1MDS", "HIST", "EVELISE", 2);
  await addAula("1MDS", "GEO", "JUANITA", 2);
  await addAula("1MDS", "PORT", "FIDELIS", 4);
  await addAula("1MDS", "QUIM", "JOSE A", 2);
  await addAula("1MDS", "ED. FIS", "THIAGO", 2);
  await addAula("1MDS", "EACNT (Ciências)", ["ANDREIA", "ELZA"], 4);
  await addAula("1MDS", "PW III (Web)", "PAULO", 4);

  // === 2MDS (INTEGRAL) ===
  await addAula("2MDS", "DS (Desenv. Sist)", "DANILO", 4);
  await addAula("2MDS", "SE (Sist. Emb)", "IURY", 4);
  await addAula("2MDS", "PW II", "WILLIAM G", 4);
  await addAula("2MDS", "MAT", "LUIZ F", 4);
  await addAula("2MDS", "ING", "FIDELIS", 2);
  await addAula("2MDS", "HIST", "EVELISE", 2);
  
  // === 3JOD (REGULAR) - Exemplo Crítico ===
  // Note que aqui temos aulas que podem cair no slot das 12:30
  await addAula("3JOD", "ARTES", "FERNANDA", 2);
  await addAula("3JOD", "FILO", "JUANITA", 2);
  await addAula("3JOD", "MAT", "LUIZ F", 4);
  await addAula("3JOD", "ED. FIS", "FABIO P", 2);
  await addAula("3JOD", "TDDGA III", "CARLOS C", 4);
  await addAula("3JOD", "TLBD", "ELISANGELA", 4);
  await addAula("3JOD", "ANI 3D", "CARLOS C", 4); 
  await addAula("3JOD", "ING", "PATRICIA", 2);
  await addAula("3JOD", "SOC", "ELZA", 2);

  // === 1JOD (REGULAR) ===
  await addAula("1JOD", "TDDGA I", ["CARLOS C", "FERNANDA"], 4);
  await addAula("1JOD", "DJW I", "ELISANGELA", 4);
  await addAula("1JOD", "HIST", "TAMARA", 2);
  await addAula("1JOD", "GEO", "JUANITA", 2);
  await addAula("1JOD", "QUI", "JOSE A", 2);
  await addAula("1JOD", "MAT", "LUIZ F", 4);
  await addAula("1JOD", "FIS", "LUIZ F", 2);
  await addAula("1JOD", "ING", "PATRICIA", 2);
  await addAula("1JOD", "PORT", "MEIRE", 4);

  // === 1MDI (INTEGRAL - DESIGN) ===
  await addAula("1MDI", "ROPI I", "SONIA", 4);
  await addAula("1MDI", "HIST", ["TAMARA", "EVELISE"], 2);
  await addAula("1MDI", "ERGO", ["CAROLINE", "GABRIELA"], 4);
  await addAula("1MDI", "MAT", "LUIZ F", 4);
  await addAula("1MDI", "EVADI", "GABRIELA", 4);
  await addAula("1MDI", "ARTES", "ADRIANA", 2);

  console.log("\n\n✅ SEED FINALIZADO! O sistema está pronto para ser testado.");
  console.log("👉 Acesse http://localhost:3000 e clique em 'Rodar Solver Agora'");
}

main();