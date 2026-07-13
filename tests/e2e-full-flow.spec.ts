import { test, expect } from '@playwright/test';

// Ejecutar el entorno local (asegúrate de correr 'npm run dev' en otro proceso)
const BASE_URL = 'http://localhost:3002';

test.describe('Flujo E2E Completo: Chat -> Bloqueo 60% -> Pago Base -> Upsell PJUD', () => {
  // Aumentamos el timeout para dar tiempo al LLM y la simulación Playwright
  test.setTimeout(90000);

  test('Debería ejecutar el pipeline íntegro', async ({ page }) => {
    
    // 1. Etapa Anónima: Carga del Frontend
    console.log('1. Navegando a un documento específico...');
    await page.goto(`${BASE_URL}/p/poder-simple`);
    
    // Iniciar chat interactuando con la interfaz
    console.log('Escribiendo prompt inicial...');
    const inputLocator = page.locator('input[placeholder="¿En qué te podemos ayudar?..."]');
    const sendButton = page.locator('button:has-text("➤ Enviar")');
    
    // Forzamos un caso rápido con datos duros exhaustivos para que el LLM marque ready=true inmediatamente
    const promptExplicito = `Hola. Necesito un poder simple. Mis datos completos son: Alejandro Matteucci, RUT 13.829.012-3, profesión ingeniero, domicilio en Avenida Las Condes 1234, comuna de Las Condes, Santiago. El apoderado es Juan Pérez, RUT 12.345.678-9, profesión abogado, con domicilio en Avenida Providencia 456, comuna de Providencia, Santiago. El motivo exacto y único es retirar y cobrar mi finiquito laboral en la Notaría de San Miguel. No falta ningún dato, procede a redactarlo de inmediato.`;
    
    await inputLocator.fill(promptExplicito);
    await sendButton.click();

    // Esperar a que el chatbot responda. Si nos pide un dato extra, se lo damos.
    console.log('Esperando respuesta del chat...');
    // Damos tiempo a la API para responder
    await page.waitForTimeout(5000);
    
    // Si todavía no hay blur, puede que haya hecho una pregunta
    const hasBlur = await page.locator('text="Tu escrito está redactado"').isVisible();
    if (!hasBlur) {
      console.log('Enviando datos adicionales...');
      await inputLocator.fill('Es para retirar el finiquito de mi exempleador, firmar el comprobante y cobrar el vale vista en el banco.');
      await sendButton.click();
    }

    // Esperar a que el sistema diga "Tu escrito está redactado" (Blur activo)
    console.log('Esperando bloqueo del 60% (Blur)...');
    const blurLockText = page.locator('text="Tu escrito está redactado"');
    await blurLockText.waitFor({ state: 'visible', timeout: 30000 });
    
    const unlockBtn = page.locator('button:has-text("↓ Desbloquear documento")');
    await expect(unlockBtn).toBeVisible();

    // 2. Validación del Primer Pago (Bypass)
    console.log('2. Iniciando Pago Base (Bypass Administrator)...');
    
    // Click the secret padlock icon
    const padlockBtn = page.locator('button[title="Admin Bypass"]');
    await padlockBtn.click();
    
    // Escribir la clave en el Modal de Paywall/Bypass
    const bypassInput = page.locator('input[placeholder="Clave de desarrollador"]');
    await bypassInput.waitFor({ state: 'visible' });
    await bypassInput.fill('admin');
    
    // El botón debe decir "Entrar"
    const confirmBypassBtn = page.locator('button:has-text("Entrar")');
    await confirmBypassBtn.click();

    // Tras el bypass, la restricción del 60% debe desaparecer y salir "Descargar PDF"
    console.log('Esperando renderizado al 100%...');
    const pdfBtn = page.locator('button:has-text("↓ Descargar PDF")');
    await pdfBtn.waitFor({ state: 'visible', timeout: 30000 });

    const pjudBtn = page.locator('button:has-text("⚡ Subir al PJUD (+$7.999)")');
    await expect(pjudBtn).toBeVisible();

    // 3. Validación del Segundo Pago (Upsell)
    console.log('3. Iniciando Flujo Upsell (Última Milla)...');
    await pjudBtn.click();
    
    // Llenar Formulario de Upsell
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill('test_e2e_playwright@legalhelp.cl');
    
    // El primer input[type="password"] es la contraseña de la cuenta
    await page.locator('input[type="password"]').first().fill('Tester1234!');
    await page.locator('input[placeholder="12.345.678-9"]').fill('138290123'); // RUT
    // El segundo input[type="password"] es la ClaveÚnica
    await page.locator('input[type="password"]').nth(1).fill('ClavePJUD123'); // ClaveUnica

    console.log('Confirmando pago y envío a motor PJUD...');
    const submitUpsellBtn = page.locator('button:has-text("Pagar $7.999 y Enviar")');
    
    let dialogTriggered = false;
    page.on('dialog', async dialog => {
      dialogTriggered = true;
      console.log('Alerta del servidor recibida:', dialog.message());
      await dialog.accept();
      expect(dialog.message()).not.toContain('Fallo interno del servidor');
    });

    await submitUpsellBtn.click();

    // Esperar a que el modal se cierre (indica que el fetch() terminó)
    console.log('Esperando ejecución de ruta /tramitar...');
    await submitUpsellBtn.waitFor({ state: 'hidden', timeout: 30000 });
    
    // Pequeño timeout por si el dialog tarda un poquito
    await page.waitForTimeout(2000);
    
    console.log('✓ TEST E2E COMPLETO TERMINADO CON ÉXITO');
  });
});
