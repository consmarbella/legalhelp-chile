/**
 * pjudMiner.ts — Cargador Estático de Jurisprudencia (MODO OFFLINE)
 * ─────────────────────────────────────────────────────────────────────────────
 * Ya NO ejecuta scraping en tiempo real.
 * Lee exclusivamente data/jurisprudencia_real.json como fuente de verdad.
 * Sirve como inyector de casos de estudio para el RAG-Lite del orquestador.
 *
 * Ejecución:
 *   npm run mine:pjud   → muestra los casos cargados sin tocar la red
 */

import fs from 'fs/promises';
import path from 'path';

const JURIS_PATH = path.join(process.cwd(), 'data', 'jurisprudencia_real.json');

interface Fallo {
  id: string;
  materia: string;
  tribunal: string;
  rol: string;
  fecha: string;
  caratula: string;
  hechos: string;
  fundamentos_legales: string[];
  decision: string;
  url: string;
}

async function main() {
  console.log("=".repeat(70));
  console.log("  🏛️  CARGADOR ESTÁTICO DE JURISPRUDENCIA (OFFLINE)");
  console.log("=".repeat(70));

  try {
    const data = await fs.readFile(JURIS_PATH, 'utf-8');
    const casos: Fallo[] = JSON.parse(data);

    console.log(`\n📚 ${casos.length} casos cargados desde ${path.basename(JURIS_PATH)}:\n`);

    for (const c of casos) {
      console.log(`  ┌─ ${c.id}: ${c.materia.toUpperCase()}`);
      console.log(`  │  Tribunal: ${c.tribunal} · Rol: ${c.rol} · ${c.fecha}`);
      console.log(`  │  Carátula: ${c.caratula}`);
      console.log(`  │  Fundamentos:`);
      for (const f of c.fundamentos_legales) {
        console.log(`  │    • ${f.slice(0, 120)}...`);
      }
      console.log(`  │  Decisión: ${c.decision.slice(0, 100)}...`);
      console.log(`  └─ ${c.url}\n`);
    }

    console.log("✅ Sistema listo. Los casos están disponibles para el RAG-Lite del orquestador.");
    console.log("   Para recargar, edita manualmente data/jurisprudencia_real.json");
    console.log("   o ejecuta 'npm run mine:pjud:live' si configuras scraping real.\n");

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Error cargando ${JURIS_PATH}: ${msg}`);
    console.error("   Asegúrate de que data/jurisprudencia_real.json exista y sea JSON válido.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Error crítico:", err);
  process.exit(1);
});
