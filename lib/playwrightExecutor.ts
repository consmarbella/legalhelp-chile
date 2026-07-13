/**
 * playwrightExecutor.ts — Ejecutor Híbrido OJV (Human-in-the-Loop)
 * ─────────────────────────────────────────────────────────────────────────────
 * Flujo:
 *   1. Abre Chromium visible (headless: false) → login OJV con ClaveÚnica
 *   2. PAUSA: el usuario ingresa RUT, contraseña y resuelve Captcha manualmente
 *   3. MONITOREO: el bot detecta el cambio de URL al dashboard interno
 *   4. INYECCIÓN AUTÓNOMA: navega al tribunal, rellena formulario, adjunta PDFs
 *      descargados desde Supabase Storage (Finiquito + AFC)
 *   5. CAPTURA: screenshot del comprobante de ingreso
 *
 * MODO MOCK (MOCK_PJUD=true):
 *   En lugar de navegar a la OJV real, abre public/mock_ojv.html local.
 *   El bot ejecuta la misma coreografía: espera login, detecta URL, adjunta PDFs,
 *   toma screenshot. Sirve para validar el flujo sin conexión real.
 *
 * Las credenciales NUNCA se loguean ni persisten en disco.
 */

import { chromium, Page } from 'playwright';
import { supabase } from './supabase';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const MOCK_MODE = process.env.MOCK_PJUD === 'true';
const MOCK_OJV_URL = `file://${path.resolve(process.cwd(), 'public', 'mock_ojv.html')}`;
const MOCK_DASHBOARD_PATTERN = 'mock_ojv.html/dashboard';

export interface RoutingData {
  system_target: 'JPL' | 'PJUD' | 'STATIC';
  portal_url: string;
  target_code: string;
  procedure_type?: string;
}

const OJV_LOGIN_URL = 'https://oficinajudicialvirtual.pjud.cl/indexN.php';
const OJV_DASHBOARD_PATTERNS = [
  'oficinajudicialvirtual.pjud.cl/dashboard',
  'oficinajudicialvirtual.pjud.cl/home',
  'oficinajudicialvirtual.pjud.cl/indexN.php',
  'oficinajudicialvirtual.pjud.cl/ingreso',
];

/**
 * Descarga un PDF de evidencia desde Supabase Storage a un archivo temporal.
 */
async function downloadEvidenceToTemp(orderId: string, fileName: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage
      .from('judicial-documents')
      .download(`${orderId}/${fileName}`);

    if (error || !data) return null;

    const buffer = Buffer.from(await data.arrayBuffer());
    const tempPath = path.join(os.tmpdir(), `${orderId}-${fileName}`);
    await fs.writeFile(tempPath, buffer);
    return tempPath;
  } catch {
    return null;
  }
}

/**
 * Monitorea la URL de la página hasta que coincida con un patrón del dashboard OJV.
 * Timeout de 5 minutos para dar tiempo al usuario de autenticarse.
 */
async function esperarLoginHumano(page: Page, timeoutMs: number = 300000): Promise<boolean> {
  const start = Date.now();
  console.log('[OJV Executor] ⏳ Esperando autenticación humana en la ventana de Chromium...');
  console.log('[OJV Executor]    Ingresa tu RUT, contraseña ClaveÚnica y resuelve el Captcha.');
  console.log('[OJV Executor]    El bot se reactivará automáticamente al detectar el dashboard.');

  while (Date.now() - start < timeoutMs) {
    const currentUrl = page.url().toLowerCase();
    const matched = OJV_DASHBOARD_PATTERNS.some(p => currentUrl.includes(p));
    if (matched) {
      console.log(`[OJV Executor] ✅ Dashboard OJV detectado: ${page.url()}`);
      return true;
    }
    await page.waitForTimeout(2000); // polling cada 2s
  }

  console.error('[OJV Executor] ❌ Timeout esperando autenticación humana (5 min).');
  return false;
}

/**
 * Navega al tribunal correspondiente dentro de la OJV.
 * El target_code es el código interno del tribunal en el sistema OJV.
 */
async function navegarAlTribunal(page: Page, targetCode: string): Promise<void> {
  console.log(`[OJV Executor] 🚀 Navegando al tribunal código: ${targetCode}...`);

  // Intentar navegación directa si la OJV lo permite
  try {
    await page.goto(`https://oficinajudicialvirtual.pjud.cl/ingreso.php?tribunal=${targetCode}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    console.log(`[OJV Executor] ✅ Navegado a tribunal ${targetCode}`);
    await page.waitForTimeout(2000);
  } catch {
    // Fallback: buscar el tribunal en el dashboard
    console.log(`[OJV Executor] ⚠️  Navegación directa falló, buscando tribunal en dashboard...`);
    const tribunalLink = await page.$(`a[href*="${targetCode}"], button[data-tribunal="${targetCode}"]`);
    if (tribunalLink) {
      await tribunalLink.click();
      await page.waitForTimeout(3000);
    }
  }
}

/**
 * Adjunta archivos de evidencia a los inputs file del formulario OJV.
 * Busca selectores comunes de input file en la OJV.
 */
async function adjuntarEvidencias(
  page: Page,
  finiquitoPath: string | null,
  afcPath: string | null
): Promise<void> {
  const fileInputs = await page.$$('input[type="file"]');

  if (fileInputs.length === 0) {
    console.log('[OJV Executor] ⚠️  No se encontraron inputs file en el formulario.');
    return;
  }

  let fileIndex = 0;

  // Adjuntar documento principal (escrito legal) - siempre va primero
  // El documento principal ya viene como pdfBytes en executeLastMile

  // Adjuntar Finiquito si existe
  if (finiquitoPath && fileIndex < fileInputs.length) {
    try {
      await fileInputs[fileIndex].setInputFiles(finiquitoPath);
      console.log('[OJV Executor] ✅ Finiquito adjuntado al formulario.');
      fileIndex++;
    } catch (e) {
      console.warn('[OJV Executor] ⚠️  Error adjuntando finiquito:', e);
    }
  }

  // Adjuntar Certificado AFC si existe
  if (afcPath && fileIndex < fileInputs.length) {
    try {
      await fileInputs[fileIndex].setInputFiles(afcPath);
      console.log('[OJV Executor] ✅ Certificado AFC adjuntado al formulario.');
      fileIndex++;
    } catch (e) {
      console.warn('[OJV Executor] ⚠️  Error adjuntando AFC:', e);
    }
  }
}

/**
 * Motor Híbrido de Ejecución OJV (Human-in-the-Loop)
 * ────────────────────────────────────────────────────
 * - headless: false → el usuario ve el navegador
 * - Pausa para que el usuario haga login manual con ClaveÚnica
 * - Monitoreo automático de URL para detectar login exitoso
 * - Inyección autónoma de datos y evidencias post-login
 */
export async function executeLastMile(
  rut: string,
  claveUnica: string,
  pdfBytes: Buffer,
  routingData: RoutingData,
  caseId: string
): Promise<{ success: boolean; receiptUrl?: string; error?: string }> {
  // Las credenciales NUNCA se loguean en consola
  const browser = await chromium.launch({ headless: false }); // ← VISIBLE para login humano
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'es-CL',
  });
  const page = await context.newPage();

  // Descargar evidencias desde Supabase Storage
  const finiquitoPath = await downloadEvidenceToTemp(caseId, 'finiquito.pdf');
  const afcPath = await downloadEvidenceToTemp(caseId, 'certificado-afc.pdf');
  let tempDocPath: string | null = null;

  if (finiquitoPath) console.log(`[OJV Executor] Finiquito descargado para caso ${caseId}`);
  if (afcPath) console.log(`[OJV Executor] Certificado AFC descargado para caso ${caseId}`);

  try {
    // ─── PASO 1: Navegar al login de la OJV ───
    console.log(`[OJV Executor] 🌐 Abriendo OJV: ${OJV_LOGIN_URL}`);
    await page.goto(OJV_LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // Hacer clic en "ClaveÚnica" si está visible
    try {
      const claveUnicaBtn = page.locator('text="ClaveÚnica"').first();
      if (await claveUnicaBtn.isVisible({ timeout: 5000 })) {
        await claveUnicaBtn.click();
        console.log('[OJV Executor] 🔑 Clic en botón ClaveÚnica');
        await page.waitForTimeout(3000);
      }
    } catch {
      console.log('[OJV Executor] ℹ️  Botón ClaveÚnica no encontrado, puede que ya esté en la página de login.');
    }

    // ─── PASO 2: PAUSA — Login Humano ───
    const loginExitoso = await esperarLoginHumano(page);
    if (!loginExitoso) {
      return { success: false, error: 'Timeout en autenticación humana. El usuario no completó el login en la ventana de Chromium.' };
    }

    // ─── PASO 3: Navegar al tribunal ───
    await navegarAlTribunal(page, routingData.target_code);

    // ─── PASO 4: Subir el documento principal (escrito legal generado) ───
    tempDocPath = path.join(os.tmpdir(), `doc-${caseId}-${Date.now()}.pdf`);
    await fs.writeFile(tempDocPath, pdfBytes);

    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      try {
        await fileInputs[0].setInputFiles(tempDocPath);
        console.log('[OJV Executor] ✅ Documento principal adjuntado.');
      } catch (e) {
        console.warn('[OJV Executor] ⚠️  Error adjuntando documento principal:', e);
      }
    }

    // ─── PASO 5: Adjuntar evidencias (Finiquito + AFC) ───
    await adjuntarEvidencias(page, finiquitoPath, afcPath);

    // ─── PASO 6: Intentar enviar el formulario ───
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("Enviar"), button:has-text("Presentar")');
    if (submitButton) {
      await submitButton.click();
      console.log('[OJV Executor] 📤 Formulario enviado.');
      await page.waitForTimeout(5000);
    } else {
      console.log('[OJV Executor] ⚠️  No se encontró botón de envío. El usuario debe enviar manualmente.');
    }

    // ─── PASO 7: Capturar comprobante ───
    const receiptBuffer = Buffer.from(await page.screenshot({ fullPage: true }));

    // Subir comprobante a Supabase Storage
    if (supabase) {
      const fileName = `${caseId}/comprobante_${Date.now()}.png`;
      const { error: storageError } = await supabase.storage
        .from('judicial-documents')
        .upload(fileName, receiptBuffer, { contentType: 'image/png', upsert: true });

      if (!storageError) {
        const { data: publicUrlData } = supabase.storage
          .from('judicial-documents')
          .getPublicUrl(fileName);

        const receiptUrl = publicUrlData.publicUrl;

        // Actualizar estado del caso
        await supabase.from('cases').update({
          status: 'completed',
          receipt_url: receiptUrl,
          updated_at: new Date().toISOString()
        }).eq('id', caseId);

        return { success: true, receiptUrl };
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error(`[OJV Executor] ❌ Error (Caso: ${caseId}):`, error.message);

    if (supabase) {
      await supabase.from('cases').update({
        status: 'failed',
        error_log: error.message,
        updated_at: new Date().toISOString()
      }).eq('id', caseId);
    }

    return { success: false, error: error.message };
  } finally {
    // Protocolo de volatilidad: limpieza de memoria y archivos temporales
    for (const tempFile of [finiquitoPath, afcPath].filter(Boolean) as string[]) {
      try { await fs.unlink(tempFile); } catch { /* ignorar */ }
    }
    try { await fs.unlink(tempDocPath); } catch { /* ignorar */ }
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO MOCK (MOCK_PJUD=true)
// ─────────────────────────────────────────────────────────────────────────────
// Cuando MOCK_PJUD=true, en lugar de navegar a la OJV real, el bot abre
// public/mock_ojv.html local y ejecuta la misma coreografía.
// Útil para validar el flujo sin conexión real a la OJV.

/**
 * Versión mock de executeLastMile.
 * Abre public/mock_ojv.html, espera login simulado, rellena formulario,
 * adjunta PDFs de prueba y toma screenshot.
 */
export async function executeMockPJUD(
  pdfBytes: Buffer,
  caseId: string
): Promise<{ success: boolean; receiptUrl?: string; error?: string }> {
  console.log('[OJV Executor] 🧪 MODO MOCK ACTIVADO — Usando mock_ojv.html local');
  console.log(`[OJV Executor]    URL mock: ${MOCK_OJV_URL}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'es-CL',
  });
  const page = await context.newPage();

  let tempDocPath: string | null = null;

  try {
    // ─── PASO 1: Navegar al mock ───
    await page.goto(MOCK_OJV_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('[OJV Executor Mock] ✅ Página mock cargada.');

    // ─── PASO 2: Login automático en el mock ───
    // El mock tiene valores pre-rellenados, solo hacemos clic
    const loginBtn = page.locator('#btn-login');
    await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginBtn.click();
    console.log('[OJV Executor Mock] 🔑 Login simulado ejecutado.');
    await page.waitForTimeout(2000);

    // ─── PASO 3: Esperar que aparezca el dashboard ───
    const continueBtn = page.locator('#btn-continue');
    await continueBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('[OJV Executor Mock] 📋 Dashboard mock detectado.');

    // ─── PASO 4: Seleccionar tribunal y continuar ───
    await continueBtn.click();
    await page.waitForTimeout(2000);

    // ─── PASO 5: Rellenar formulario ───
    const formRut = page.locator('#form-rut');
    await formRut.fill('12.345.678-9');
    const formNombre = page.locator('#form-nombre');
    await formNombre.fill('Juan Pérez González');
    const formMateria = page.locator('#form-materia');
    await formMateria.fill('Prescripción de multa de tránsito');
    console.log('[OJV Executor Mock] 📝 Formulario rellenado.');

    // ─── PASO 6: Adjuntar documento principal ───
    tempDocPath = path.join(os.tmpdir(), `doc-mock-${caseId}-${Date.now()}.pdf`);
    await fs.writeFile(tempDocPath, pdfBytes);

    const docInput = page.locator('#form-doc-principal');
    await docInput.setInputFiles(tempDocPath);
    console.log('[OJV Executor Mock] 📎 Documento principal adjuntado.');

    // ─── PASO 7: Adjuntar evidencias simuladas ───
    // Crear PDFs dummy para finiquito y AFC
    const dummyPdf = Buffer.from('%PDF-1.4 mock document for testing');
    const finiquitoMockPath = path.join(os.tmpdir(), `finiquito-mock-${caseId}.pdf`);
    const afcMockPath = path.join(os.tmpdir(), `afc-mock-${caseId}.pdf`);
    await fs.writeFile(finiquitoMockPath, dummyPdf);
    await fs.writeFile(afcMockPath, dummyPdf);

    const finiquitoInput = page.locator('#form-finiquito');
    await finiquitoInput.setInputFiles(finiquitoMockPath);
    console.log('[OJV Executor Mock] ✅ Finiquito mock adjuntado.');

    const afcInput = page.locator('#form-afc');
    await afcInput.setInputFiles(afcMockPath);
    console.log('[OJV Executor Mock] ✅ Certificado AFC mock adjuntado.');

    // ─── PASO 8: Enviar formulario ───
    const submitBtn = page.locator('#btn-submit');
    await submitBtn.click();
    await page.waitForTimeout(3000);
    console.log('[OJV Executor Mock] 📤 Formulario mock enviado.');

    // ─── PASO 9: Capturar comprobante ───
    const receiptBuffer = Buffer.from(await page.screenshot({ fullPage: true }));
    const screenshotDir = path.join(process.cwd(), 'data', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `mock-receipt-${caseId}-${Date.now()}.png`);
    await fs.writeFile(screenshotPath, receiptBuffer);
    console.log(`[OJV Executor Mock] 📸 Comprobante guardado en: ${screenshotPath}`);

    // Limpiar archivos mock
    try { await fs.unlink(finiquitoMockPath); } catch { /* ignorar */ }
    try { await fs.unlink(afcMockPath); } catch { /* ignorar */ }

    return { success: true, receiptUrl: screenshotPath };

  } catch (error: any) {
    console.error(`[OJV Executor Mock] ❌ Error:`, error.message);
    return { success: false, error: error.message };
  } finally {
    try { await fs.unlink(tempDocPath); } catch { /* ignorar */ }
    await browser.close();
  }
}

/**
 * Función principal que decide entre modo mock y real.
 * Si MOCK_PJUD=true, ejecuta executeMockPJUD.
 * Si no, ejecuta executeLastMide real.
 * Si MOCK_PJUD=true, ejecuta executeMockPJUD.
 * Si no, ejecuta executeLastMide real.
 */
export async function executeOJV(
  rut: string,
  claveUnica: string,
  pdfBytes: Buffer,
  routingData: RoutingData,
  caseId: string
): Promise<{ success: boolean; receiptUrl?: string; error?: string }> {
  if (MOCK_MODE) {
    return executeMockPJUD(pdfBytes, caseId);
  }
  return executeLastMile(rut, claveUnica, pdfBytes, routingData, caseId);
}
