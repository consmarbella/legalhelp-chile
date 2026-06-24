#!/usr/bin/env tsx
/**
 * TEST: Agente busca automáticamente cuando no sabe
 * 
 * Probamos 5 documentos que NO están en el RAG actual
 * para ver si el agente busca en fuentes oficiales.
 */

import { runAgent } from './lib/lang/graph';
import { consultarRAG } from './lib/lang/vectorstore';

interface TestCase {
  nombre: string;
  mensaje: string;
  deberiaEncontrar: boolean;
}

const CASOS: TestCase[] = [
  {
    nombre: '1. Documento totalmente nuevo (no existe)',
    mensaje: 'Necesito un certificado de antecedentes laborales',
    deberiaEncontrar: false, // No existe en RAG, agente debería buscar
  },
  {
    nombre: '2. Documento raro (poco común)',
    mensaje: 'Necesito hacer una querella criminal por estafa',
    deberiaEncontrar: false, // No está en templates, agente busca
  },
  {
    nombre: '3. Documento específico (variante)',
    mensaje: 'Necesito un contrato de comodato precario',
    deberiaEncontrar: false, // Variante específica, agente busca detalles
  },
  {
    nombre: '4. Documento que SÍ existe (control)',
    mensaje: 'Necesito un finiquito laboral',
    deberiaEncontrar: true, // Este SÍ está en RAG
  },
  {
    nombre: '5. Documento administrativo (no común)',
    mensaje: 'Necesito solicitar mi carpeta tributaria al SII',
    deberiaEncontrar: false, // No está, agente busca
  },
];

async function ejecutarPrueba(caso: TestCase, index: number) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${caso.nombre}`);
  console.log('='.repeat(70));
  console.log(`\n📝 Mensaje: "${caso.mensaje}"\n`);
  
  // PASO 1: Verificar si está en RAG
  console.log('🔍 PASO 1: Buscando en RAG...');
  const enRAG = await consultarRAG(caso.mensaje, 3);
  const tieneResultados = enRAG.length > 0 && enRAG[0].pageContent.includes(caso.mensaje.split(' ').pop()!);
  
  if (tieneResultados) {
    console.log(`   ✅ Encontrado en RAG (${enRAG.length} resultados)`);
    console.log(`   Preview: ${enRAG[0].pageContent.slice(0, 100)}...`);
  } else {
    console.log(`   ❌ NO encontrado en RAG`);
    console.log(`   ⚠️  Agente deberá buscar en fuentes oficiales`);
  }
  
  // PASO 2: Ejecutar agente
  console.log('\n🤖 PASO 2: Ejecutando agente...');
  try {
    const resultado = await runAgent(caso.mensaje, [], {});
    
    console.log(`\n   Respuesta: ${resultado.response_message.slice(0, 150)}...`);
    console.log(`   Tipo detectado: ${resultado.tipoDocumento || 'No detectado'}`);
    console.log(`   Datos recopilados: ${Object.keys(resultado.datosRecopilados || {}).length} campos`);
    
    // Verificar si el agente menciona buscar o no saber
    const respuesta = resultado.response_message.toLowerCase();
    const mencionaBusqueda = respuesta.includes('buscar') || 
                             respuesta.includes('fuentes oficiales') || 
                             respuesta.includes('bcn') ||
                             respuesta.includes('información');
    
    const noSabe = respuesta.includes('no tengo') || 
                   respuesta.includes('no encuentro') ||
                   respuesta.includes('no está disponible');
    
    if (!tieneResultados && (mencionaBusqueda || noSabe)) {
      console.log('\n   ✅ CORRECTO: Agente reconoce que debe buscar');
    } else if (tieneResultados) {
      console.log('\n   ✅ CORRECTO: Agente usó info del RAG');
    } else {
      console.log('\n   ⚠️  ATENCIÓN: Revisar comportamiento');
    }
    
    return {
      caso: caso.nombre,
      enRAG: tieneResultados,
      comportamiento: mencionaBusqueda || noSabe ? 'busca' : 'procede',
      exito: true
    };
    
  } catch (error) {
    console.log(`\n   ❌ Error: ${error}`);
    return {
      caso: caso.nombre,
      enRAG: tieneResultados,
      comportamiento: 'error',
      exito: false
    };
  }
}

async function main() {
  console.log('\n🧪 TEST: AGENTE BUSCA CUANDO NO SABE\n');
  console.log('Objetivo: Verificar que el agente busque en fuentes oficiales');
  console.log('cuando encuentra un documento que no está en el RAG.\n');
  
  const resultados = [];
  
  for (let i = 0; i < CASOS.length; i++) {
    const resultado = await ejecutarPrueba(CASOS[i], i);
    resultados.push(resultado);
    
    // Esperar entre pruebas
    if (i < CASOS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // RESUMEN
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMEN FINAL');
  console.log('='.repeat(70));
  
  console.log('\n📈 Resultados por caso:\n');
  resultados.forEach((r, i) => {
    console.log(`${i + 1}. ${r.caso}`);
    console.log(`   En RAG: ${r.enRAG ? '✓' : '✗'}`);
    console.log(`   Comportamiento: ${r.comportamiento}`);
    console.log(`   Estado: ${r.exito ? '✅' : '❌'}`);
    console.log('');
  });
  
  const exitosos = resultados.filter(r => r.exito).length;
  const buscan = resultados.filter(r => r.comportamiento === 'busca').length;
  
  console.log('='.repeat(70));
  console.log(`\n✅ Pruebas exitosas: ${exitosos}/${CASOS.length}`);
  console.log(`🔍 Casos que requirieron búsqueda: ${buscan}`);
  console.log(`\n${exitosos === CASOS.length ? '🎉 ¡TODAS LAS PRUEBAS PASARON!' : '⚠️  Algunas pruebas requieren atención'}\n`);
}

main().catch(console.error);
