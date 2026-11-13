/**
 * CLI wrapper que dispara o seed oficial no backend Java (POST /api/seed/etec-oficial).
 */
const API_BASE = process.env.API_BASE || process.env.API_BASE_URL || "http://localhost:8080";
const reset = process.argv.includes("--reset");

async function main() {
  console.log(`📡 Conectando ao backend em: ${API_BASE}`);
  const url = `${API_BASE}/api/seed/etec-oficial?reset=${reset}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
  const r = await res.json();
  console.log(`✅ ${r.presetName} aplicada no backend Java!`);
  console.log(`📊 Turmas: ${r.classGroupsTotal} | Professores: ${r.professorsTotal} | Horários: ${r.timeslotsTotal}`);
  console.log(`📚 Demandas: ${r.demandsTotal} | Aulas Semanais: ${r.totalWeeklyLessons}`);
  console.log(`\nAgora você pode iniciar o solver via:\nPOST ${API_BASE}/api/solver/iniciar`);
}

main().catch((err) => {
  console.error("❌ Erro ao executar seed:", err.message);
  process.exit(1);
});
