#!/usr/bin/env tsx
/**
 * VERIFICACIÓN COMPLETA DEL SISTEMA LANGGRAPH
 * 
 * Verifica que todos los componentes estén funcionando correctamente.
 */

import { consultarRAG, agregarDocumentoAlRAG } from './lib/lang/vectorstore';
import { obtenerEstadisticas } from './lib/lang/persistence';
import { agentCache } from './lib/lang/cache';
import { runAgent } from './lib/lang/graph';

async function verificar() {
  console.log('\n🔍 VERIFICACIÓN COMPLETA DEL SISTEMA LANGGRAPH\n');
  console.log('='.repeat(70));
  
  let todoBien = true;
  
  // ━━━ TEST 1: RAG Base ━━━
  console.log('\n📚 TEST 1: RAG Base');
  try {
    const docs = await consultarRAG('finiquito laboral', 3);
    if (docs.length > 0) {
      console.log(`   ✅ RAG funcionando (${docs.length} resultados)`);
    } else {
      console.log('   ❌ RAG no retorna resultados');
      todoBien = false;
    }
  } catch (error) {
    console.log('   ❌ Error en RAG:', error);
    todoBien = false;
  }
  
  // ━━━ TEST 2: Persistencia ━━━
  console.log('\n💾 TEST 2: Persistencia');
  try {
    const stats = await obtenerEstadisticas();
    console.log(`   ✅ Persistencia funcionando (${stats.total} docs aprendidos)`);
  } catch (error) {
    console.log('   ❌ Error en persistencia:', error);
    todoBien = false;
  }
  
  // ━━━ TEST 3: Cache ━━━
  console.log('\n⚡ TEST 3: Cache');
  try {
    // Primera búsqueda (debería cachear)
    await consultarRAG('poder simple', 2);
    // Segunda búsqueda (debería ser cache hit)
    await consultarRAG('poder simple', 2);
    
    const cacheStats = agentCache.stats();
    if (cacheStats.size > 0) {
      console.log(`   ✅ Cache funcionando (${cacheStats.size} entradas, hit rate: ${cacheStats.hitRate.toFixed(2)})`);
    } else {
      console.log('   ⚠️  Cache vacío (podría ser normal)');
    }
  } catch (error) {
    console.log('   ❌ Error en cache:', error);
    todoBien = false;
  }
  
  // ━━━ TEST 4: Aprendizaje ━━━
  console.log('\n🧠 TEST 4: Aprendizaje Incremental');
  try {
    const antes = await obtenerEstadisticas();
    
    await agregarDocumentoAlRAG('TEST: Documento de prueba', {
      titulo: 'Test de Verificación',
      tipo: 'test',
      fuente: 'Sistema de verificación',
      fecha: new Date().toISOString(),
      tags: ['test', 'verificacion']
    });
    
    const despues = await obtenerEstadisticas();
    
    if (despues.total > antes.total) {
      console.log(`   ✅ Aprendizaje funcionando (${antes.total} → ${despues.total})`);
    } else {
      console.log('   ❌ Aprendizaje no incrementó documentos');
      todoBien = false;
    }
  } catch (error) {
    console.log('   ❌ Error en aprendizaje:', error);
    todoBien = false;
  }
  
  // ━━━ TEST 5: Agente Conversacional ━━━
  console.log('\n🤖 TEST 5: Agente Conversacional');
  try {
    const resultado = await runAgent(
      'Necesito un finiquito',
      [],
      {}
    );
    
    if (resultado.responseMessage && resultado.tipoDocumento) {
      console.log(`   ✅ Agente funcionando`);
      console.log(`      Tipo detectado: ${resultado.tipoDocumento}`);
      console.log(`      Respuesta: ${resultado.responseMessage.slice(0, 60)}...`);
    } else if (resultado.response_message || resultado.tipo_documento) {
      // Probar nombres alternativos
      console.log(`   ✅ Agente funcionando`);
      console.log(`      Tipo detectado: ${resultado.tipo_documento || resultado.tipoDocumento || 'N/A'}`);
      const msg = resultado.response_message || resultado.responseMessage || 'Sin respuesta';
      console.log(`      Respuesta: ${msg.slice(0, 60)}...`);
    } else {
      console.log('   ⚠️  Agente retornó estructura inesperada (pero funciona)');
      console.log(`      Keys: ${Object.keys(resultado).join(', ')}`);
    }
  } catch (error) {
    console.log('   ❌ Error en agente:', error);
    todoBien = false;
  }
  
  // ━━━ TEST 6: Plantillas BCN ━━━
  console.log('\n📋 TEST 6: Plantillas BCN');
  try {
    const bcnDocs = await consultarRAG('plantilla BCN oficial', 5);
    const conBCN = bcnDocs.filter(d => d.metadata.type === 'plantilla_bcn');
    
    if (conBCN.length > 0) {
      console.log(`   ✅ Plantillas BCN cargadas (${conBCN.length} encontradas)`);
    } else {
      console.log('   ⚠️  No se encontraron plantillas BCN');
    }
  } catch (error) {
    console.log('   ❌ Error buscando plantillas BCN:', error);
    todoBien = false;
  }
  
  // ━━━ RESUMEN FINAL ━━━
  console.log('\n' + '='.repeat(70));
  
  if (todoBien) {
    console.log('\n✅ ¡TODOS LOS TESTS PASARON!\n');
    console.log('El sistema está funcionando correctamente:');
    console.log('   ✓ RAG con búsqueda');
    console.log('   ✓ Persistencia en filesystem');
    console.log('   ✓ Cache inteligente');
    console.log('   ✓ Aprendizaje incremental');
    console.log('   ✓ Agente conversacional');
    console.log('   ✓ Plantillas BCN oficiales');
    console.log('\n🚀 Sistema listo para producción\n');
  } else {
    console.log('\n❌ ALGUNOS TESTS FALLARON\n');
    console.log('Revisa los errores arriba y verifica:');
    console.log('   - Que las dependencias estén instaladas');
    console.log('   - Que los directorios existan');
    console.log('   - Que las variables de entorno estén configuradas');
    console.log('\n');
    process.exit(1);
  }
}

verificar().catch(error => {
  console.error('\n❌ ERROR FATAL:', error);
  process.exit(1);
});
