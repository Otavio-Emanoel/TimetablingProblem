/**
 * SEED.JS - EtecFlow
 * Matriz Curricular Oficial da ETEC com as 12 Turmas e 33 Professores Reais
 * 
 * Regra: Cada turma possui no máximo 3 ou 4 aulas vagas por semana.
 * - Turmas Integrais (40 slots): 36 ou 37 aulas semanais (3 ou 4 vagas).
 * - Turmas Regulares (30 slots): 27 aulas semanais (3 vagas).
 */

const API_BASE = process.env.API_BASE || process.env.API_BASE_URL || "http://localhost:8080";

// --- HELPERS ---
const DIAS_SEMANA_MAP = {
  1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY"
};

function formatTime(time) {
  return time.length === 5 ? `${time}:00` : time;
}

// --- DADOS OFICIAIS ---
const PROFESSORES = [
  "ANDREIA", "CAROLINE", "DANILO", "ELIAMAR", "ELISANGELA", "ELIZABETH", 
  "ELZA", "EVELISE", "FELIX", "FIDELIS", "GABRIELA", "GILVAN", 
  "GISBERT", "IURY", "JEAN", "JOSE A", "JOYCE", "LUIZ F", 
  "MARCELO", "MARCIO", "MEIRE", "PATRICIA", "PAULO", "RICARDO", 
  "RODRIGO", "ROGERIO", "SONIA", "THIAGO", "VALDECI", "VANESSA", 
  "VERIDIANE", "WELLINGTON", "WILLIAM B"
];

const TURMAS = [
  // 9 Turmas Integrais (40 slots: 8 aulas/dia × 5 dias)
  { name: "1MAD", shiftType: "INTEGRAL" },
  { name: "2MAD", shiftType: "INTEGRAL" },
  { name: "3MAD", shiftType: "INTEGRAL" },
  { name: "1MDS", shiftType: "INTEGRAL" },
  { name: "2MDS", shiftType: "INTEGRAL" },
  { name: "3MDS", shiftType: "INTEGRAL" },
  { name: "1MDI", shiftType: "INTEGRAL" },
  { name: "2MDI", shiftType: "INTEGRAL" },
  { name: "3MDI", shiftType: "INTEGRAL" },
  // 3 Turmas Regulares (30 slots: 6 aulas/dia × 5 dias)
  { name: "1JOD", shiftType: "REGULAR" },
  { name: "2JOD", shiftType: "REGULAR" },
  { name: "3JOD", shiftType: "REGULAR" }
];

const HORARIOS_COMUNS = [
  { start: "08:00", end: "08:50" },
  { start: "08:50", end: "09:40" },
  { start: "10:00", end: "10:50" },
  { start: "10:50", end: "11:40" },
  { start: "11:40", end: "12:30" }
];
const SLOT_ALMOCO_REGULAR = { start: "12:30", end: "13:20" };
const HORARIOS_TARDE_INTEGRAL = [
  { start: "13:30", end: "14:20" },
  { start: "14:20", end: "15:10" },
  { start: "15:10", end: "16:00" }
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
      if (res.status !== 409) {
        const text = await res.text();
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
    if (!res.ok) return null;
    const list = await res.json();
    const found = list.find(p => p.name.toUpperCase() === nome.toUpperCase());
    return found ? found.id : null;
  } catch (e) { return null; }
}

async function fetchTurmaId(nome) {
  try {
    const res = await fetch(`${API_BASE}/api/class-groups`);
    if (!res.ok) return null;
    const list = await res.json();
    const found = list.find(t => t.name.toUpperCase() === nome.toUpperCase());
    return found ? found.id : null;
  } catch (e) { return null; }
}

async function fetchSubject(nome, turmaId) {
  try {
    const res = await fetch(`${API_BASE}/api/subjects?classGroupId=${turmaId}`);
    if (!res.ok) return null;
    const list = await res.json();
    return list.find(s => s.name.toUpperCase() === nome.toUpperCase()) || null;
  } catch (e) { return null; }
}

// --- MATRIZ CURRICULAR (195 Demandas / 409 Aulas) ---
const DEMANDAS = [
  // ==========================================
  // 1MAD (INTEGRAL - 40 slots -> 36 aulas = 4 vagas)
  // ==========================================
  { t: "1MAD", m: "Língua Portuguesa", p: ["FIDELIS"], q: 4 },
  { t: "1MAD", m: "Inglês", p: ["FIDELIS"], q: 2 },
  { t: "1MAD", m: "Arte", p: ["GILVAN"], q: 2 },
  { t: "1MAD", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "1MAD", m: "Matemática", p: ["LUIZ F"], q: 4 },
  { t: "1MAD", m: "Biologia", p: ["PATRICIA"], q: 2 },
  { t: "1MAD", m: "Física", p: ["LUIZ F"], q: 2 },
  { t: "1MAD", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "1MAD", m: "História", p: ["EVELISE"], q: 2 },
  { t: "1MAD", m: "Geografia", p: ["ROGERIO"], q: 2 },
  { t: "1MAD", m: "Filosofia", p: ["ELIAMAR"], q: 1 },
  { t: "1MAD", m: "Sociologia", p: ["VERIDIANE"], q: 1 },
  { t: "1MAD", m: "Conduta Profissional e Relações de Trabalho", p: ["RODRIGO"], q: 1 },
  { t: "1MAD", m: "Projetos de TI e Comunicação", p: ["WELLINGTON"], q: 2 },
  { t: "1MAD", m: "Planejamento Empresarial", p: ["JEAN"], q: 2 },
  { t: "1MAD", m: "Rotinas Administrativas", p: ["JEAN"], q: 2 },
  { t: "1MAD", m: "Administração de Recursos Humanos", p: ["VERIDIANE"], q: 3 },

  // ==========================================
  // 2MAD (INTEGRAL - 40 slots -> 36 aulas = 4 vagas)
  // ==========================================
  { t: "2MAD", m: "Língua Portuguesa", p: ["FIDELIS"], q: 3 },
  { t: "2MAD", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "2MAD", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "2MAD", m: "Matemática", p: ["LUIZ F"], q: 3 },
  { t: "2MAD", m: "Física", p: ["MARCELO"], q: 2 },
  { t: "2MAD", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "2MAD", m: "Biologia", p: ["ANDREIA"], q: 2 },
  { t: "2MAD", m: "História", p: ["EVELISE"], q: 2 },
  { t: "2MAD", m: "Geografia", p: ["MARCIO"], q: 2 },
  { t: "2MAD", m: "Filosofia", p: ["ELIAMAR"], q: 1 },
  { t: "2MAD", m: "Estudos Avançados Ciências Humanas", p: ["ELZA"], q: 1 },
  { t: "2MAD", m: "Estudos Avançados Matemática", p: ["ELZA"], q: 1 },
  { t: "2MAD", m: "Laboratório Mediação Sociocultural", p: ["ELIZABETH"], q: 2 },
  { t: "2MAD", m: "Laboratório Processos Criativos", p: ["ELIZABETH"], q: 2 },
  { t: "2MAD", m: "Custos e Operações Contábeis", p: ["MARCIO"], q: 3 },
  { t: "2MAD", m: "Rotinas de Departamento Pessoal", p: ["VERIDIANE"], q: 2 },
  { t: "2MAD", m: "Modelos de Negócios", p: ["MARCIO"], q: 2 },
  { t: "2MAD", m: "Estudos da Administração Pública", p: ["RODRIGO"], q: 2 },

  // ==========================================
  // 3MAD (INTEGRAL - 40 slots -> 37 aulas = 3 vagas)
  // ==========================================
  { t: "3MAD", m: "Língua Portuguesa", p: ["FIDELIS"], q: 4 },
  { t: "3MAD", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "3MAD", m: "Matemática", p: ["WILLIAM B"], q: 4 },
  { t: "3MAD", m: "Sociologia", p: ["VERIDIANE"], q: 2 },
  { t: "3MAD", m: "Estudos Avançados Ciências Humanas", p: ["DANILO"], q: 3 },
  { t: "3MAD", m: "Estudos Avançados Matemática", p: ["ELIAMAR"], q: 3 },
  { t: "3MAD", m: "Administração Financeira e Orçamentária", p: ["RICARDO"], q: 3 },
  { t: "3MAD", m: "Administração da Produção e Serviços", p: ["JEAN"], q: 3 },
  { t: "3MAD", m: "Administração de Recursos Humanos", p: ["VERIDIANE"], q: 3 },
  { t: "3MAD", m: "Economia e Comércio Internacional", p: ["DANILO"], q: 2 },
  { t: "3MAD", m: "Ética e Cidadania Organizacional", p: ["DANILO"], q: 1 },
  { t: "3MAD", m: "Processos Logísticos Empresariais", p: ["JEAN"], q: 2 },
  { t: "3MAD", m: "TI em Administração", p: ["ELISANGELA"], q: 2 },
  { t: "3MAD", m: "Planejamento e Desenvolvimento do TCC", p: ["ELISANGELA"], q: 3 },

  // ==========================================
  // 1MDS (INTEGRAL - 40 slots -> 37 aulas = 3 vagas)
  // ==========================================
  { t: "1MDS", m: "Língua Portuguesa", p: ["FIDELIS"], q: 4 },
  { t: "1MDS", m: "Inglês", p: ["FIDELIS"], q: 2 },
  { t: "1MDS", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "1MDS", m: "Arte", p: ["GILVAN"], q: 1 },
  { t: "1MDS", m: "Matemática", p: ["LUIZ F"], q: 4 },
  { t: "1MDS", m: "Biologia", p: ["PATRICIA"], q: 2 },
  { t: "1MDS", m: "Física", p: ["LUIZ F"], q: 2 },
  { t: "1MDS", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "1MDS", m: "História", p: ["EVELISE"], q: 2 },
  { t: "1MDS", m: "Geografia", p: ["ROGERIO"], q: 2 },
  { t: "1MDS", m: "Filosofia", p: ["ELIAMAR"], q: 1 },
  { t: "1MDS", m: "Sociologia", p: ["ELIZABETH"], q: 1 },
  { t: "1MDS", m: "Algoritmos e Lógica de Programação", p: ["GISBERT", "PAULO"], q: 4 },
  { t: "1MDS", m: "Fundamentos de Informática", p: ["ELISANGELA", "VANESSA"], q: 3 },
  { t: "1MDS", m: "Análise e Projeto de Sistemas", p: ["PAULO"], q: 2 },
  { t: "1MDS", m: "Design Digital", p: ["WELLINGTON"], q: 3 },

  // ==========================================
  // 2MDS (INTEGRAL - 40 slots -> 36 aulas = 4 vagas)
  // ==========================================
  { t: "2MDS", m: "Língua Portuguesa", p: ["FIDELIS"], q: 3 },
  { t: "2MDS", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "2MDS", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "2MDS", m: "Matemática", p: ["ELIAMAR"], q: 3 },
  { t: "2MDS", m: "Física", p: ["LUIZ F"], q: 2 },
  { t: "2MDS", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "2MDS", m: "Biologia", p: ["PATRICIA"], q: 2 },
  { t: "2MDS", m: "História", p: ["EVELISE"], q: 2 },
  { t: "2MDS", m: "Geografia", p: ["VALDECI"], q: 2 },
  { t: "2MDS", m: "Estudos Avançados Ciências da Natureza", p: ["ELZA"], q: 1 },
  { t: "2MDS", m: "Estudos Avançados Matemática", p: ["ELZA"], q: 1 },
  { t: "2MDS", m: "Laboratório Mediação Sociocultural", p: ["ELIZABETH"], q: 2 },
  { t: "2MDS", m: "Programação Web II", p: ["PAULO", "VANESSA"], q: 3 },
  { t: "2MDS", m: "Banco de Dados II", p: ["IURY"], q: 2 },
  { t: "2MDS", m: "Desenvolvimento de Sistemas", p: ["PAULO"], q: 3 },
  { t: "2MDS", m: "Ética e Cidadania Organizacional", p: ["DANILO"], q: 1 },
  { t: "2MDS", m: "Programação de Aplicativos Mobile I", p: ["PAULO", "WELLINGTON"], q: 3 },

  // ==========================================
  // 3MDS (INTEGRAL - 40 slots -> 37 aulas = 3 vagas)
  // ==========================================
  { t: "3MDS", m: "Língua Portuguesa", p: ["FIDELIS"], q: 3 },
  { t: "3MDS", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "3MDS", m: "Matemática", p: ["WILLIAM B"], q: 4 },
  { t: "3MDS", m: "Biologia", p: ["ANDREIA"], q: 2 },
  { t: "3MDS", m: "História", p: ["EVELISE"], q: 2 },
  { t: "3MDS", m: "Geografia", p: ["VALDECI"], q: 2 },
  { t: "3MDS", m: "Filosofia", p: ["ELZA"], q: 2 },
  { t: "3MDS", m: "Sociologia", p: ["ELZA"], q: 2 },
  { t: "3MDS", m: "Estudos Avançados Ciências da Natureza", p: ["ELZA"], q: 3 },
  { t: "3MDS", m: "Estudos Avançados Matemática", p: ["ELIAMAR"], q: 3 },
  { t: "3MDS", m: "Programação Web III", p: ["PAULO"], q: 2 },
  { t: "3MDS", m: "Programação Mobile II", p: ["PAULO"], q: 2 },
  { t: "3MDS", m: "Internet, Protocolos e Segurança", p: ["IURY", "VANESSA"], q: 2 },
  { t: "3MDS", m: "TCC em Desenvolvimento de Sistemas", p: ["ELISANGELA", "VERIDIANE"], q: 2 },
  { t: "3MDS", m: "Qualidade e Teste de Software", p: ["IURY"], q: 2 },
  { t: "3MDS", m: "Sistemas Embarcados", p: ["VANESSA"], q: 2 },

  // ==========================================
  // 1MDI (INTEGRAL - 40 slots -> 37 aulas = 3 vagas)
  // ==========================================
  { t: "1MDI", m: "Língua Portuguesa", p: ["FIDELIS"], q: 2 },
  { t: "1MDI", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "1MDI", m: "Arte", p: ["GILVAN"], q: 2 },
  { t: "1MDI", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "1MDI", m: "Matemática", p: ["ELIAMAR"], q: 3 },
  { t: "1MDI", m: "Física", p: ["LUIZ F"], q: 2 },
  { t: "1MDI", m: "História", p: ["EVELISE"], q: 2 },
  { t: "1MDI", m: "Geografia", p: ["ROGERIO"], q: 2 },
  { t: "1MDI", m: "Filosofia", p: ["ELIAMAR"], q: 1 },
  { t: "1MDI", m: "Estudos Avançados Ciências Humanas", p: ["RODRIGO"], q: 1 },
  { t: "1MDI", m: "Estudos Avançados Linguagens", p: ["ELIZABETH"], q: 1 },
  { t: "1MDI", m: "Laboratório Investigação Científica", p: ["ELIZABETH"], q: 2 },
  { t: "1MDI", m: "Práticas de Empreendedorismo", p: ["MARCIO"], q: 1 },
  { t: "1MDI", m: "Composição no Projeto de Interiores", p: ["SONIA"], q: 2 },
  { t: "1MDI", m: "Ergonomia", p: ["CAROLINE", "JOYCE"], q: 2 },
  { t: "1MDI", m: "Estudo e Aplicação de Materiais", p: ["FELIX"], q: 2 },
  { t: "1MDI", m: "Projeto de Espaços Efêmeros", p: ["MARCELO", "SONIA"], q: 2 },
  { t: "1MDI", m: "Expressões Visuais no Design I", p: ["SONIA"], q: 2 },
  { t: "1MDI", m: "Representação Linguagem Projetiva I", p: ["GABRIELA", "SONIA"], q: 2 },
  { t: "1MDI", m: "Representação Digital de Projetos I", p: ["JOYCE"], q: 2 },

  // ==========================================
  // 2MDI (INTEGRAL - 40 slots -> 36 aulas = 4 vagas)
  // ==========================================
  { t: "2MDI", m: "Língua Portuguesa", p: ["FIDELIS"], q: 3 },
  { t: "2MDI", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "2MDI", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "2MDI", m: "Matemática", p: ["LUIZ F"], q: 3 },
  { t: "2MDI", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "2MDI", m: "Física", p: ["LUIZ F"], q: 2 },
  { t: "2MDI", m: "Biologia", p: ["ANDREIA"], q: 2 },
  { t: "2MDI", m: "Geografia", p: ["VALDECI"], q: 2 },
  { t: "2MDI", m: "História", p: ["EVELISE"], q: 2 },
  { t: "2MDI", m: "Estudos Avançados Ciências Humanas", p: ["ELIZABETH"], q: 1 },
  { t: "2MDI", m: "Estudos Avançados Linguagens", p: ["ELIZABETH"], q: 1 },
  { t: "2MDI", m: "Laboratório Mediação Sociocultural", p: ["ELIZABETH"], q: 2 },
  { t: "2MDI", m: "Laboratório Processos Criativos", p: ["ELIZABETH"], q: 2 },
  { t: "2MDI", m: "Expressões Visuais no Design II", p: ["CAROLINE", "JOYCE"], q: 2 },
  { t: "2MDI", m: "Representação Linguagem Projetiva II", p: ["GABRIELA"], q: 2 },
  { t: "2MDI", m: "Representação Digital de Projetos II", p: ["CAROLINE", "JOYCE"], q: 2 },
  { t: "2MDI", m: "Projetos de Interiores Residenciais", p: ["MARCELO", "SONIA"], q: 2 },
  { t: "2MDI", m: "Representação Técnica do Mobiliário II", p: ["GABRIELA"], q: 2 },

  // ==========================================
  // 3MDI (INTEGRAL - 40 slots -> 36 aulas = 4 vagas)
  // ==========================================
  { t: "3MDI", m: "Língua Portuguesa", p: ["MEIRE"], q: 5 },
  { t: "3MDI", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "3MDI", m: "Matemática", p: ["WILLIAM B"], q: 4 },
  { t: "3MDI", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "3MDI", m: "Biologia", p: ["PATRICIA"], q: 2 },
  { t: "3MDI", m: "Geografia", p: ["ROGERIO"], q: 2 },
  { t: "3MDI", m: "Sociologia", p: ["ELIZABETH"], q: 1 },
  { t: "3MDI", m: "Estudos Avançados Ciências Humanas", p: ["DANILO"], q: 3 },
  { t: "3MDI", m: "Estudos Avançados Linguagens", p: ["ELIZABETH"], q: 3 },
  { t: "3MDI", m: "Representação Técnica do Mobiliário II", p: ["GABRIELA"], q: 2 },
  { t: "3MDI", m: "Conforto Ambiental no Projeto", p: ["SONIA"], q: 1 },
  { t: "3MDI", m: "Ética e Cidadania Organizacional", p: ["DANILO"], q: 1 },
  { t: "3MDI", m: "História do Mobiliário", p: ["GABRIELA"], q: 2 },
  { t: "3MDI", m: "Ilustração no Projeto de Interiores", p: ["JOYCE"], q: 2 },
  { t: "3MDI", m: "TCC em Design de Interiores", p: ["ELISANGELA", "SONIA"], q: 2 },
  { t: "3MDI", m: "Projetos de Interiores Comerciais", p: ["MARCELO", "SONIA"], q: 2 },

  // ==========================================
  // 1JOD (REGULAR - 30 slots -> 27 aulas = 3 vagas)
  // ==========================================
  { t: "1JOD", m: "Língua Portuguesa", p: ["MEIRE"], q: 2 },
  { t: "1JOD", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "1JOD", m: "Arte", p: ["GILVAN"], q: 2 },
  { t: "1JOD", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "1JOD", m: "Matemática", p: ["LUIZ F"], q: 2 },
  { t: "1JOD", m: "Biologia", p: ["PATRICIA"], q: 2 },
  { t: "1JOD", m: "Física", p: ["LUIZ F"], q: 2 },
  { t: "1JOD", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "1JOD", m: "História", p: ["EVELISE"], q: 2 },
  { t: "1JOD", m: "Geografia", p: ["ROGERIO"], q: 2 },
  { t: "1JOD", m: "Ambiente de Desenvolvimento de Jogos I", p: ["ELISANGELA"], q: 1 },
  { t: "1JOD", m: "Programação e Algoritmos", p: ["GISBERT"], q: 1 },
  { t: "1JOD", m: "Narrativas e Roteiros para Jogos", p: ["GILVAN"], q: 1 },
  { t: "1JOD", m: "Operação de Software Aplicativo", p: ["WELLINGTON"], q: 1 },
  { t: "1JOD", m: "Conduta Profissional e Relações de Trabalho", p: ["RODRIGO"], q: 1 },
  { t: "1JOD", m: "Game Art I", p: ["GILVAN"], q: 2 },

  // ==========================================
  // 2JOD (REGULAR - 30 slots -> 27 aulas = 3 vagas)
  // ==========================================
  { t: "2JOD", m: "Língua Portuguesa", p: ["MEIRE"], q: 3 },
  { t: "2JOD", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "2JOD", m: "Educação Física", p: ["THIAGO"], q: 2 },
  { t: "2JOD", m: "Matemática", p: ["ELIAMAR"], q: 2 },
  { t: "2JOD", m: "Física", p: ["LUIZ F"], q: 2 },
  { t: "2JOD", m: "Química", p: ["JOSE A"], q: 2 },
  { t: "2JOD", m: "Biologia", p: ["PATRICIA"], q: 2 },
  { t: "2JOD", m: "História", p: ["EVELISE"], q: 2 },
  { t: "2JOD", m: "Geografia", p: ["VALDECI"], q: 2 },
  { t: "2JOD", m: "Técnicas de Desenho e Game Art II", p: ["GILVAN"], q: 2 },
  { t: "2JOD", m: "Desenvolvimento de Jogos para Web II", p: ["ELISANGELA"], q: 1 },
  { t: "2JOD", m: "Programação Orientada a Objetos", p: ["GISBERT", "PAULO"], q: 2 },
  { t: "2JOD", m: "Modelagem 3D", p: ["GILVAN"], q: 2 },
  { t: "2JOD", m: "Linguagem de Programação I", p: ["PAULO"], q: 1 },

  // ==========================================
  // 3JOD (REGULAR - 30 slots -> 27 aulas = 3 vagas)
  // ==========================================
  { t: "3JOD", m: "Língua Portuguesa", p: ["MEIRE"], q: 4 },
  { t: "3JOD", m: "Inglês", p: ["PATRICIA"], q: 2 },
  { t: "3JOD", m: "Matemática", p: ["ELIAMAR"], q: 3 },
  { t: "3JOD", m: "Filosofia", p: ["ELIZABETH"], q: 1 },
  { t: "3JOD", m: "Sociologia", p: ["ELZA"], q: 2 },
  { t: "3JOD", m: "Game Art III", p: ["GILVAN"], q: 2 },
  { t: "3JOD", m: "Linguagem de Programação II", p: ["PAULO"], q: 2 },
  { t: "3JOD", m: "Animação 3D", p: ["GILVAN"], q: 2 },
  { t: "3JOD", m: "Linguagens para Banco de Dados", p: ["ELISANGELA"], q: 2 },
  { t: "3JOD", m: "Ética e Cidadania Organizacional", p: ["RODRIGO"], q: 1 },
  { t: "3JOD", m: "Marketing para Jogos Digitais", p: ["ELZA"], q: 2 },
  { t: "3JOD", m: "Programação para Dispositivos Móveis", p: ["GISBERT", "PAULO"], q: 2 },
  { t: "3JOD", m: "TCC em Jogos Digitais", p: ["ELISANGELA"], q: 2 }
];

// --- EXECUÇÃO PRINCIPAL ---
async function main() {
  console.log(`📡 Conectando ao backend em: ${API_BASE}`);

  if (process.argv.includes("--reset")) {
    console.log("🧹 Limpando banco de dados (--reset)...");
    try {
      const res = await fetch(`${API_BASE}/api/reset`, { method: "DELETE" });
      if (res.ok) {
        console.log("✅ Banco limpo com sucesso!");
      } else {
        console.warn(`⚠️  Aviso ao limpar banco: ${res.status}`);
      }
    } catch (e) {
      console.error(`❌ Erro ao chamar /api/reset: ${e.message}`);
    }
  }

  console.log("🚀 INICIANDO SEED DA MATRIZ CURRICULAR OFICIAL...");

  // 1. PROFESSORES (33 Professores Reais)
  console.log("\n--- 1. Cadastrando 33 Professores Reais ---");
  for (const nome of PROFESSORES) {
    let id = null;
    const res = await post("professors", { name: nome });
    if (res && res.id) id = res.id;
    else id = await fetchProfessorId(nome);

    if (id) {
      mapProf.set(nome, id);
      process.stdout.write("👨‍🏫 ");
    } else {
      console.error(`\n❌ FALHA: Não consegui criar/achar professor ${nome}`);
    }
  }

  // 2. TURMAS (12 Turmas: 9 Integrais + 3 Regulares)
  console.log("\n\n--- 2. Cadastrando 12 Turmas ---");
  for (const t of TURMAS) {
    const res = await post("class-groups", t);
    const id = (res && res.id) ? res.id : await fetchTurmaId(t.name);
    if (id) {
      mapTurma.set(t.name, id);
      process.stdout.write(`[${t.name}:${t.shiftType}] `);
    } else {
      console.error(`\n❌ FALHA: Não consegui criar/achar turma ${t.name}`);
    }
  }

  // 3. HORÁRIOS (70 slots: 40 INTEGRAL + 30 REGULAR)
  console.log("\n\n--- 3. Cadastrando 70 Horários (Timeslots) ---");
  const dias = [1, 2, 3, 4, 5];

  for (const diaNum of dias) {
    const diaString = DIAS_SEMANA_MAP[diaNum];

    const createSlot = async (h, tipo) => {
      await post("timeslots", {
        dayOfWeek: diaString,
        startTime: formatTime(h.start),
        endTime: formatTime(h.end),
        shiftType: tipo
      });
    };

    // Slots comuns (08:00 às 12:30)
    for (const h of HORARIOS_COMUNS) {
      await createSlot(h, "REGULAR");
      await createSlot(h, "INTEGRAL");
    }

    // 6º horário Regular (12:30 às 13:20)
    await createSlot(SLOT_ALMOCO_REGULAR, "REGULAR");

    // Slots tarde Integral (13:30 às 16:00)
    for (const h of HORARIOS_TARDE_INTEGRAL) {
      await createSlot(h, "INTEGRAL");
    }

    process.stdout.write(`[${diaString.substring(0, 3)}] `);
  }

  // 4. DEMANDAS E DISCIPLINAS
  console.log("\n\n--- 4. Cadastrando Disciplinas e Demandas (409 Aulas) ---");
  let criadas = 0;
  let aulasTotal = 0;

  for (const d of DEMANDAS) {
    const turmaId = mapTurma.get(d.t);
    if (!turmaId) {
      console.warn(`\n⚠️ Turma não encontrada: ${d.t}`);
      continue;
    }

    // Cadastra ou busca a disciplina
    let subj = await post("subjects", { name: d.m, classGroupId: turmaId });
    if (!subj) {
      subj = await fetchSubject(d.m, turmaId);
    }
    if (!subj) {
      console.warn(`\n⚠️ Não foi possível obter disciplina: ${d.m} para turma ${d.t}`);
      continue;
    }

    // Mapeia IDs dos professores
    const idsProfs = d.p.map(n => mapProf.get(n)).filter(Boolean);
    if (idsProfs.length === 0) {
      console.warn(`\n⚠️ Nenhum professor encontrado para: ${d.m} (${d.p.join(",")})`);
      continue;
    }

    const demandRes = await post("demands", {
      subjectId: subj.id,
      professorIds: idsProfs,
      quantityPerWeek: d.q,
      allowDoubleLesson: true
    });

    if (demandRes) {
      criadas++;
      aulasTotal += d.q;
      process.stdout.write(".");
    }
  }

  // Se as demandas já existiam, busca contadores reais da API
  try {
    const demReq = await fetch(`${API_BASE}/api/demands`);
    if (demReq.ok) {
      const allDem = await demReq.json();
      criadas = allDem.length;
      aulasTotal = allDem.reduce((acc, cur) => acc + (cur.quantityPerWeek || 0), 0);
    }
  } catch (e) {}

  console.log(`\n\n✅ SEED FINALIZADO COM SUCESSO!`);
  console.log(`📊 Total de Turmas: ${mapTurma.size}`);
  console.log(`👨‍🏫 Total de Professores: ${mapProf.size}`);
  console.log(`📚 Total de Demandas no Banco: ${criadas} / ${DEMANDAS.length}`);
  console.log(`⏱️ Total de Aulas Semanais: ${aulasTotal}`);
  console.log(`\nAgora você pode iniciar o solver via:`);
  console.log(`POST ${API_BASE}/api/solver/iniciar`);
}

main().catch(err => {
  console.error("\n💥 Erro fatal durante a execução do seed:", err);
  process.exit(1);
});
