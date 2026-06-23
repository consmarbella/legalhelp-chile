#!/usr/bin/env tsx
/**
 * LIMPIAR CONOCIMIENTO OBSOLETO
 * 
 * Permite eliminar documentos aprendidos que ya no son relevantes.
 */

import { listarDocumentosAprendidos, eliminarDocumento, cargarDocumentosAprendidos } from '../persistence';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🧹 LIMPIAR CONOCIMIENTO APRENDIDO\n');
  console.log('='.repeat(70));
  
  const docs = await cargarDocumentosAprendidos();
  
  if (docs.length === 0) {
    console.log('\n✓ No hay documentos para limpiar\n');
    rl.close();
    return;
  }
  
  console.log(`\n📚 Total: ${docs.length} documentos aprendidos\n`);
  
  // Mostrar documentos con detalles
  docs.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.metadata.titulo || 'Sin título'}`);
    console.log(`   ID: ${doc.metadata.id}`);
    console.log(`   Tipo: ${doc.metadata.tipo}`);
    console.log(`   Fuente: ${doc.metadata.fuente}`);
    console.log(`   Agregado: ${doc.metadata.guardado_en}`);
    console.log(`   Preview: ${doc.pageContent.slice(0, 100)}...`);
    console.log('');
  });
  
  console.log('='.repeat(70));
  
  const respuesta = await pregunta('\n¿Quieres eliminar algún documento? (s/n): ');
  
  if (respuesta.toLowerCase() !== 's') {
    console.log('\n✓ Cancelado\n');
    rl.close();
    return;
  }
  
  const numero = await pregunta('\nNúmero del documento a eliminar (1-' + docs.length + '): ');
  const index = parseInt(numero) - 1;
  
  if (index < 0 || index >= docs.length) {
    console.log('\n✗ Número inválido\n');
    rl.close();
    return;
  }
  
  const docEliminar = docs[index];
  const confirmar = await pregunta(`\n¿Eliminar "${docEliminar.metadata.titulo}"? (s/n): `);
  
  if (confirmar.toLowerCase() === 's') {
    const eliminado = await eliminarDocumento(docEliminar.metadata.id as string);
    if (eliminado) {
      console.log('\n✓ Documento eliminado\n');
    } else {
      console.log('\n✗ Error eliminando documento\n');
    }
  } else {
    console.log('\n✓ Cancelado\n');
  }
  
  rl.close();
}

main().catch(console.error);
