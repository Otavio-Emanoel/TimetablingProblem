/**
 * CLI wrapper que dispara o preset simplificado no backend Java (POST /api/seed/simples).
 */
const API_BASE = process.env.API_BASE || process.env.API_BASE_URL || "http://localhost:8080";
const reset = process.argv.includes("--reset");

async function main() {
  console.log(`📡 Conectando ao backend em: ${API_BASE}`);
  const res = await fetch(`${API_BASE}/api/seed/simples?reset=${reset}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const r = await res.json();
  console.log(`✅ ${r.presetName} aplicado (${r.classGroupsTotal} turmas / ${r.totalWeeklyLessons} aulas).`);
}

main().catch((err) => {
  console.error("❌ Erro ao executar seed simples:", err.message);
  process.exit(1);
});
