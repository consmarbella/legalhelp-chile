/**
 * test-mock-ojv.ts — Prueba del Mock OJV para Playwright
 * ─────────────────────────────────────────────────────────────────────────────
 * Uso: npx tsx scripts/test-mock-ojv.ts
 */
import { executeMockPJUD } from '../lib/playwrightExecutor';

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     🎭 LEGALHELP · TEST MOCK OJV (Playwright)           ║
║     Simulación de ingreso a Oficina Judicial Virtual     ║
╚══════════════════════════════════════════════════════════╝
`);

  const testPdf = Buffer.from('PDF simulado de prueba para LegalHelp');
  const testCaseId = 'test-cese-alimentos-001';

  console.log(`   📄 PDF simulado: ${testPdf.length} bytes`);
  console.log(`   🆔 ID de caso: ${testCaseId}`);
  console.log(`   🔄 Ejecutando Mock OJV...`);

  const result = await executeMockPJUD(testPdf, testCaseId);

  console.log(`\n   📊 Resultado:`);
  console.log(`   ✅ Éxito: ${result.success}`);
  console.log(`   📝 Mensaje: ${result.message}`);
  console.log(`   🆔 ID de ingreso: ${result.ingresoId || 'N/A'}`);
  console.log(`   ⏱️  Timestamp: ${result.timestamp}`);

  if (result.success) {
    console.log(`\n   🎉 Mock OJV funcionando correctamente.`);
    console.log(`   ℹ️  En producción, Playwright navegaría a la OJV real,`);
    console.log(`      autenticaría, subiría el PDF y capturaría el comprobante.`);
  } else {
    console.log(`\n   ❌ Mock OJV falló.`);
    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    }
  }

  console.log(`\n🏁 Test completado.\n`);
}

main().catch(console.error);
