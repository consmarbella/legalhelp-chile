import { chromium } from '@playwright/test';

async function runTest() {
  console.log('Iniciando navegador...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navegando a localhost:3002...');
  await page.goto('http://localhost:3002');

  // Esperar a que cargue el input
  await page.waitForSelector('input[type="text"]', { state: 'visible' });
  console.log('Página cargada. Ingresando mensaje 1...');

  // 1. Primer mensaje: Quiero prescribir
  await page.fill('input[type="text"]', 'quiero prescribir una multa tag');
  await page.click('button:has-text("Enviar")');

  // Esperar a que el bot responda
  console.log('Esperando respuesta del bot...');
  await page.waitForTimeout(7000); // Dar tiempo al RAG y LLM
  
  // 2. Segundo mensaje: Datos básicos incompletos (sin historia)
  console.log('Ingresando mensaje 2 (datos de identidad sin hechos)...');
  await page.fill('input[type="text"]', 'angelica pizarro 80172508, direccion camino los refugios 17620, patente HFTW19');
  await page.click('button:has-text("Enviar")');

  // Esperar a que el bot responda
  console.log('Esperando evaluación de Readiness Agent...');
  await page.waitForTimeout(10000);

  // Extraer todos los mensajes del chat
  const messages = await page.locator('.prose, p').allInnerTexts();
  
  console.log('\n--- ÚLTIMOS MENSAJES DEL CHAT ---');
  // Mostrar los últimos 4 textos en pantalla
  const lastMessages = messages.slice(-4);
  lastMessages.forEach(m => console.log('>', m));
  console.log('---------------------------------\n');

  // Verificar si el bot pidió hechos/detalles
  const fullText = lastMessages.join(' ').toLowerCase();
  
  if (fullText.includes('procedo a redactarlo') || fullText.includes('tengo todos los datos')) {
    console.error('❌ FALLA: El bot aceptó redactar el documento sin pedir los detalles/hechos del caso.');
    process.exitCode = 1;
  } else if (fullText.includes('detalle') || fullText.includes('hecho') || fullText.includes('falta')) {
    console.log('✅ ÉXITO: El bot detectó que faltaban los hechos y no permitió generar el documento vacío.');
  } else {
    console.log('⚠️ RESULTADO INCIERTO: Revisa los mensajes arriba.');
  }

  await browser.close();
}

runTest().catch(console.error);
