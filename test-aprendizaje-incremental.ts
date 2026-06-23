/**
 * DEMO: Aprendizaje Incremental del Agente
 * 
 * Muestra cómo el agente:
 * 1. La primera vez busca información en fuentes oficiales
 * 2. Guarda esa información en el RAG
 * 3. La próxima vez ya la tiene disponible sin buscar
 */

import { agregarDocumentoAlRAG, consultarRAG } from './lib/lang/vectorstore';

async function demo() {
  console.log('🧪 DEMO: APRENDIZAJE INCREMENTAL DEL AGENTE\n');
  
  // ━━━ PASO 1: Simular que el agente NO encuentra info sobre "contrato de trabajo" ━━━
  console.log('📍 PASO 1: Usuario pregunta por "contrato de trabajo"');
  console.log('   Agente busca en RAG...\n');
  
  let resultados = await consultarRAG('contrato de trabajo requisitos', 3);
  console.log(`   Resultados encontrados: ${resultados.length}`);
  
  if (resultados.length === 0) {
    console.log('   ⚠️  No hay información en el RAG sobre este documento\n');
  } else {
    console.log(`   ✓ Ya existe información:\n`);
    resultados.forEach((doc, i) => {
      console.log(`      ${i + 1}. ${doc.pageContent.slice(0, 100)}...`);
    });
    console.log('');
  }
  
  // ━━━ PASO 2: Agente busca en fuentes oficiales y aprende ━━━
  console.log('📍 PASO 2: Agente busca en BCN (Dirección del Trabajo)');
  console.log('   🌐 Fetching: https://www.dt.gob.cl/...');
  console.log('   ✓ Información encontrada\n');
  
  // Simular que el agente encontró información útil
  const nuevoConocimiento = `CONTRATO DE TRABAJO

FUENTE OFICIAL: Dirección del Trabajo Chile - Art. 9 y 10 Código del Trabajo

REQUISITOS OBLIGATORIOS (Art. 10 CT):
1. Lugar y fecha del contrato
2. Individualización de las partes (nombre, RUT, nacionalidad, domicilio)
3. Fecha de ingreso del trabajador
4. Naturaleza de los servicios y lugar/ciudad donde se prestarán
5. Monto, forma y período de pago de la remuneración
6. Duración y distribución de la jornada de trabajo
7. Plazo del contrato (indefinido, plazo fijo, obra o faena)

ARTÍCULOS LEGALES:
Art. 9 CT: Contrato debe constar por escrito dentro de 15 días desde incorporación
Art. 10 CT: Estipulaciones mínimas obligatorias
Art. 11 CT: Modificaciones deben ser escritas
Art. 7 CT: Definición de contrato individual de trabajo

VIGENCIA:
El contrato debe firmarse dentro de los 15 días siguientes al inicio de la relación laboral. Si no se escritura, se presumen las condiciones que afirme el trabajador.`;

  console.log('📍 PASO 3: Agente guarda información en el RAG');
  const resultado = await agregarDocumentoAlRAG(nuevoConocimiento, {
    titulo: 'Contrato de Trabajo',
    tipo: 'plantilla_laboral',
    fuente: 'Dirección del Trabajo Chile + Código del Trabajo Arts. 9-11',
    fecha: new Date().toISOString(),
    tags: ['contrato', 'trabajo', 'laboral', 'codigo del trabajo']
  });
  
  console.log(`   ✓ Guardado con ID: ${resultado.id}\n`);
  
  // ━━━ PASO 4: Próxima consulta, ya está disponible ━━━
  console.log('━'.repeat(70));
  console.log('⏭️  NUEVA SESIÓN: Otro usuario pregunta por "contrato de trabajo"\n');
  
  console.log('📍 PASO 4: Agente busca en RAG...');
  resultados = await consultarRAG('contrato de trabajo requisitos', 3);
  console.log(`   ✓ Resultados encontrados: ${resultados.length}\n`);
  
  if (resultados.length > 0) {
    console.log('   🎉 ¡El agente YA TIENE la información guardada!');
    console.log('   No necesita buscar en internet de nuevo.\n');
    
    resultados.slice(0, 1).forEach((doc, i) => {
      console.log(`   Documento ${i + 1}:`);
      console.log(`   ${'-'.repeat(60)}`);
      console.log(`   ${doc.pageContent.slice(0, 300)}...`);
      console.log('');
      console.log(`   Metadata:`);
      console.log(`   - Tipo: ${doc.metadata.type}`);
      console.log(`   - Aprendido por agente: ${doc.metadata.aprendido_por_agente}`);
      console.log(`   - Fecha: ${doc.metadata.fecha_agregado}`);
    });
  }
  
  console.log('\n' + '━'.repeat(70));
  console.log('✅ CONCLUSIÓN: El agente aprende y mejora con cada interacción');
  console.log('   - Primera vez: Busca en BCN → Guarda en RAG');
  console.log('   - Próximas veces: Consulta RAG directamente (más rápido)');
  console.log('   - Beneficio: Se vuelve más eficiente con el tiempo');
  console.log('━'.repeat(70) + '\n');
}

demo().catch(console.error);
