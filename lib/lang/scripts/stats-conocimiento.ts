#!/usr/bin/env tsx
/**
 * ESTADÍSTICAS DE CONOCIMIENTO APRENDIDO
 * 
 * Muestra métricas del RAG y documentos aprendidos por el agente.
 */

import { obtenerEstadisticas, listarDocumentosAprendidos } from '../persistence';
import { consultarRAG } from '../vectorstore';

async function main() {
  console.log('\n📊 ESTADÍSTICAS DEL RAG\n');
  console.log('='.repeat(70));
  
  // Estadísticas de documentos aprendidos
  const stats = await obtenerEstadisticas();
  
  console.log('\n🧠 Documentos Aprendidos:');
  console.log(`   Total: ${stats.total} documentos`);
  
  if (stats.total > 0) {
    console.log('\n   Por Tipo:');
    Object.entries(stats.tipos).forEach(([tipo, count]) => {
      console.log(`   - ${tipo}: ${count}`);
    });
    
    console.log('\n   Por Fuente:');
    Object.entries(stats.fuentes).forEach(([fuente, count]) => {
      console.log(`   - ${fuente}: ${count}`);
    });
    
    // Listar documentos
    console.log('\n   Documentos:');
    const ids = await listarDocumentosAprendidos();
    ids.forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`);
    });
  } else {
    console.log('   (No hay documentos aprendidos aún)');
  }
  
  // Probar búsqueda
  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 Prueba de Búsqueda:\n');
  
  const queries = [
    'finiquito laboral',
    'poder simple',
    'reclamo SERNAC',
    'contrato de trabajo'
  ];
  
  for (const q of queries) {
    const results = await consultarRAG(q, 1);
    console.log(`   "${q}": ${results.length > 0 ? '✓ encontrado' : '✗ no encontrado'}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Estadísticas generadas\n');
}

main().catch(console.error);
