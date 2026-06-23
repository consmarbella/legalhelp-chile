#!/usr/bin/env tsx
/**
 * CARGAR TODOS LOS TEMPLATES AL RAG
 * 
 * Toma los 240+ templates que YA EXISTEN en lib/templates.ts
 * y los carga todos en el RAG como documentos aprendidos.
 * 
 * Esto hace que el sistema funcione DÍA 1 con TODO disponible.
 */

import { TEMPLATES } from '../lib/templates';
import { agregarDocumentoAlRAG } from '../lib/lang/vectorstore';

async function cargarTodos() {
  console.log('\n🚀 CARGANDO TODOS LOS TEMPLATES AL RAG\n');
  console.log('='.repeat(70));
  console.log(`\nTotal templates a cargar: ${TEMPLATES.length}\n`);
  
  let cargados = 0;
  let errores = 0;
  
  for (const template of TEMPLATES) {
    try {
      console.log(`📄 ${template.id.slice(0, 40)}...`);
      
      // Crear contenido estructurado del template
      const contenido = `${template.titulo}

TIPO: ${template.tipo}

KEYWORDS: ${template.keywords.join(', ')}

ARTÍCULOS LEGALES:
${template.articulos.map(a => `- ${a}`).join('\n')}

REQUISITOS Y CAMPOS NECESARIOS:
${extraerRequisitos(template)}

INSTRUCCIONES DE LLENADO:
${template.instruccion_llm}

ESTRUCTURA DEL DOCUMENTO:
${template.esqueleto.slice(0, 800)}...

${template.entidad ? `ENTIDAD DESTINATARIA: ${template.entidad}` : ''}`;

      await agregarDocumentoAlRAG(contenido, {
        titulo: template.titulo,
        tipo: 'template_sistema',
        fuente: `Sistema LegalHelp - Template ${template.id}`,
        tags: template.keywords,
        fecha: new Date().toISOString(),
      });
      
      cargados++;
      
      // Evitar sobrecarga
      if (cargados % 10 === 0) {
        console.log(`   ✅ ${cargados}/${TEMPLATES.length} cargados...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      errores++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ CARGA COMPLETADA`);
  console.log(`   Templates cargados: ${cargados}/${TEMPLATES.length}`);
  console.log(`   Errores: ${errores}`);
  console.log(`\n🎉 Sistema listo con ${cargados} documentos completos\n`);
  console.log('Ahora ejecuta:');
  console.log('   npx tsx lib/lang/scripts/stats-conocimiento.ts\n');
}

/**
 * Extrae requisitos del template analizando el esqueleto y la instrucción
 */
function extraerRequisitos(template: any): string {
  const requisitos: string[] = [];
  
  // Buscar [VARIABLE] en el esqueleto
  const matches = template.esqueleto.match(/\[([A-Z][A-Z\s]+)\]/g);
  if (matches) {
    const campos = [...new Set(matches.map((m: string) => m.replace(/[\[\]]/g, '')))];
    requisitos.push(...campos);
  }
  
  // Buscar [[VARIABLE]] en el esqueleto
  const matches2 = template.esqueleto.match(/\[\[([A-Za-z\s\(\)]+)\]\]/g);
  if (matches2) {
    const campos = [...new Set(matches2.map((m: string) => m.replace(/\[\[|\]\]/g, '')))];
    requisitos.push(...campos);
  }
  
  // Si no hay requisitos explícitos, inferir de la instrucción
  if (requisitos.length === 0) {
    const instruccion = template.instruccion_llm.toLowerCase();
    if (instruccion.includes('pedir:')) {
      const pedir = instruccion.split('pedir:')[1].split('.')[0];
      requisitos.push(pedir.trim());
    }
  }
  
  return requisitos.length > 0 
    ? requisitos.slice(0, 15).map((r, i) => `${i + 1}. ${r}`).join('\n')
    : 'Ver instrucciones de llenado y estructura del documento';
}

cargarTodos().catch(console.error);
