/**
 * Script de prueba del agente LangGraph
 * 
 * Ejecutar: npx tsx test-lang-agent.ts
 */

import { runAgent } from './lib/lang/graph';

async function testCase1() {
  console.log('\n━━━ CASO 1: Finiquito laboral ━━━\n');
  
  const history: Array<{ role: string; content: string }> = [];
  let data: Record<string, unknown> = {};

  // Turno 1
  console.log('👤 Usuario: Necesito un finiquito');
  let result = await runAgent('Necesito un finiquito', history, data);
  console.log('🤖 Bot:', result.response_message);
  console.log('📊 Datos:', result.datos_recopilados);
  console.log('✓ Ready:', result.ready);
  
  history.push({ role: 'user', content: 'Necesito un finiquito' });
  history.push({ role: 'assistant', content: result.response_message });
  data = { ...data, ...result };

  // Turno 2
  console.log('\n👤 Usuario: Juan Pérez Gómez, RUT 12.345.678-9');
  result = await runAgent('Juan Pérez Gómez, RUT 12.345.678-9', history, result); // 🔥 Pasar result anterior
  console.log('🤖 Bot:', result.response_message);
  console.log('📊 Datos:', result.datos_recopilados);
  console.log('✓ Ready:', result.ready);
  
  history.push({ role: 'user', content: 'Juan Pérez Gómez, RUT 12.345.678-9' });
  history.push({ role: 'assistant', content: result.response_message });
  data = result; // 🔥 Actualizar data

  // Turno 3
  console.log('\n👤 Usuario: Trabajé en Constructora ABC, RUT 76.123.456-7, cargo: maestro, sueldo $890.000, desde febrero 2020 hasta abril 2026');
  result = await runAgent(
    'Trabajé en Constructora ABC, RUT 76.123.456-7, cargo: maestro, sueldo $890.000, desde febrero 2020 hasta abril 2026',
    history,
    result // 🔥 Pasar result anterior
  );
  console.log('🤖 Bot:', result.response_message);
  console.log('📊 Datos:', result.datos_recopilados);
  console.log('✓ Ready:', result.ready);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function testCase2() {
  console.log('\n━━━ CASO 2: Poder simple ━━━\n');
  
  const history: Array<{ role: string; content: string }> = [];
  let data: Record<string, unknown> = {};

  // Turno 1
  console.log('👤 Usuario: Necesito poder para que mi mamá cobre mi finiquito');
  let result = await runAgent('Necesito poder para que mi mamá cobre mi finiquito', history, data);
  console.log('🤖 Bot:', result.response_message);
  console.log('📊 Datos:', result.datos_recopilados);
  console.log('✓ Ready:', result.ready);
  
  history.push({ role: 'user', content: 'Necesito poder para que mi mamá cobre mi finiquito' });
  history.push({ role: 'assistant', content: result.response_message });
  data = { ...data, ...result };

  // Turno 2
  console.log('\n👤 Usuario: Sebastián Morales Vega, RUT 19.456.321-7, Los Leones 2340, Providencia');
  result = await runAgent('Sebastián Morales Vega, RUT 19.456.321-7, Los Leones 2340, Providencia', history, result); // 🔥
  console.log('🤖 Bot:', result.response_message);
  console.log('📊 Datos:', result.datos_recopilados);
  console.log('✓ Ready:', result.ready);
  
  history.push({ role: 'user', content: 'Sebastián Morales Vega, RUT 19.456.321-7, Los Leones 2340, Providencia' });
  history.push({ role: 'assistant', content: result.response_message });
  data = result; // 🔥

  // Turno 3
  console.log('\n👤 Usuario: Carmen Gloria Vega Muñoz, RUT 10.234.567-8');
  result = await runAgent('Carmen Gloria Vega Muñoz, RUT 10.234.567-8', history, result); // 🔥
  console.log('🤖 Bot:', result.response_message);
  console.log('📊 Datos:', result.datos_recopilados);
  console.log('✓ Ready:', result.ready);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
  try {
    await testCase1();
    await testCase2();
    
    console.log('✅ Pruebas completadas\n');
  } catch (error) {
    console.error('❌ Error en pruebas:', error);
    process.exit(1);
  }
}

main();
