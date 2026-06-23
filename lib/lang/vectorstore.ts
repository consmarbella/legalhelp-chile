/**
 * RAG BÁSICO para LangGraph
 * 
 * Usa tus templates actuales como base de conocimiento.
 * En vez de tener un prompt de 300 líneas, el agente consulta este vectorstore.
 * 
 * PERSISTENCIA: Los documentos aprendidos se guardan en lib/lang/knowledge/aprendido/
 * CACHE: Búsquedas frecuentes se cachean para mejor performance
 */

import { Document } from '@langchain/core/documents';
import { TEMPLATES, type LegalTemplate } from '@/lib/templates';
import { PLANTILLAS_BCN } from './knowledge/bcn-plantillas';
import { cargarDocumentosAprendidos, persistirDocumento } from './persistence';
import { agentCache, generateCacheKey } from './cache';

// RAG simple en memoria (sin embeddings por ahora, solo búsqueda por keywords)
// Para producción, usar vectorstore real con embeddings
let _documents: Document[] | null = null;
let _docsAprendidosCargados = false;

/**
 * Convierte plantillas BCN oficiales en documentos para el vectorstore
 */
function bcnToDocuments(): Document[] {
  const docs: Document[] = [];

  for (const plantilla of PLANTILLAS_BCN) {
    // Doc 1: Requisitos oficiales de BCN
    docs.push(
      new Document({
        pageContent: `${plantilla.nombre}

FUENTE OFICIAL: ${plantilla.fuente}

REQUISITOS OBLIGATORIOS:
${plantilla.requisitos.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ARTÍCULOS LEGALES APLICABLES:
${plantilla.articulosLegales.join('\n')}

ESTRUCTURA DEL DOCUMENTO:
${plantilla.estructura.slice(0, 500)}...

EJEMPLO DE LLENADO:
${plantilla.ejemploLlenado}`,
        metadata: {
          type: 'plantilla_bcn',
          plantillaId: plantilla.id,
          fuente: plantilla.fuente,
          oficial: true
        }
      })
    );
  }

  return docs;
}

/**
 * Convierte tus templates en documentos para el vectorstore
 */
function templatesToDocuments(): Document[] {
  const docs: Document[] = [];

  // PRIMERO: Agregar plantillas oficiales BCN
  docs.push(...bcnToDocuments());

  // SEGUNDO: Agregar tus templates actuales como backup
  for (const t of TEMPLATES) {
    // Doc 1: Título + keywords
    docs.push(
      new Document({
        pageContent: `${t.titulo}\nPalabras clave: ${t.keywords.join(', ')}`,
        metadata: { 
          type: 'title',
          templateId: t.id,
          docType: t.tipo
        }
      })
    );

    // Doc 2: Requisitos (extraídos de la instrucción al LLM)
    const requisitos = extractRequisitos(t);
    if (requisitos) {
      docs.push(
        new Document({
          pageContent: `Documento: ${t.titulo}\n\nRequisitos necesarios:\n${requisitos}`,
          metadata: {
            type: 'requisitos',
            templateId: t.id,
            docType: t.tipo
          }
        })
      );
    }

    // Doc 3: Artículos legales
    if (t.articulos.length > 0) {
      docs.push(
        new Document({
          pageContent: `Documento: ${t.titulo}\n\nFundamento legal:\n${t.articulos.join('\n')}`,
          metadata: {
            type: 'legal',
            templateId: t.id,
            docType: t.tipo
          }
        })
      );
    }

    // Doc 4: Instrucciones de llenado
    if (t.instruccion_llm) {
      docs.push(
        new Document({
          pageContent: `Documento: ${t.titulo}\n\nGuía de llenado:\n${t.instruccion_llm}`,
          metadata: {
            type: 'instrucciones',
            templateId: t.id,
            docType: t.tipo
          }
        })
      );
    }
  }

  // Agregar conocimiento general de tu prompt actual (reglas críticas)
  docs.push(
    new Document({
      pageContent: `REGLAS GENERALES DE RECOPILACIÓN DE DATOS:

DATOS OBLIGATORIOS SEGÚN TIPO DE DOCUMENTO:

FINIQUITO LABORAL (Art. 177 Código del Trabajo):
- Nombre y RUT del trabajador
- Nombre/razón social y RUT del empleador
- Dirección del empleador
- Cargo del trabajador
- Fecha de inicio y fecha de término
- Causal de término (art. 159, 160 o 161 CT)
- Último sueldo bruto mensual
- Desglose de haberes: sueldo proporcional, feriado, gratificación, indemnizaciones
- Monto líquido total

CONTRATO DE ARRIENDO:
- Nombre, RUT y dirección del arrendador
- Nombre, RUT y dirección del arrendatario
- Dirección completa del inmueble
- Monto mensual del arriendo
- Fecha de inicio y plazo
- Monto de garantía
- Fecha y forma de pago

PRESCRIPCIÓN DE MULTAS/DEUDAS:
- Nombre y RUT del solicitante
- Dirección
- Patente del vehículo (si es TAG/tránsito)
- Tribunal competente (JPL y comuna)
- Fechas de las multas/infracciones
- Montos

CARTA DE RECLAMO (SERNAC):
- Nombre y RUT del consumidor
- Dirección
- Teléfono o email de contacto
- Empresa destinataria
- Qué producto/servicio
- Fecha de compra
- Problema ocurrido
- Solución exigida

DESPIDO INJUSTIFICADO:
- Nombre y RUT del trabajador
- Nombre/razón social y RUT del empleador
- Cargo desempeñado
- Fecha de inicio y fecha del despido
- Último sueldo bruto
- Causal invocada en carta de despido
- Por qué considera injustificado

DEMANDA DE ALIMENTOS:
- Nombre y RUT del demandante
- Nombre y RUT del demandado
- Dirección del demandado (para notificación)
- Nombre y fecha de nacimiento de cada hijo
- Necesidades de los hijos
- Ingresos conocidos del demandado
- Monto mensual solicitado

PODER SIMPLE:
- Nombre y RUT del otorgante (poderdante)
- Dirección del otorgante
- Nombre y RUT del apoderado
- Facultades específicas
- Ante quién se usará
- ADVERTENCIA: Actos solemnes (compraventa inmuebles, hipoteca, sociedades) requieren escritura pública ante notario (Art. 1801 CC)

RECURSO DE PROTECCIÓN:
- Nombre y RUT del recurrente
- Quién cometió el acto
- Qué acto u omisión arbitraria
- Fecha del acto
- Qué derecho constitucional fue vulnerado (Art. 19 N°)
- Qué solicita al tribunal`,
      metadata: {
        type: 'reglas_generales',
        category: 'requisitos'
      }
    })
  );

  docs.push(
    new Document({
      pageContent: `REGLAS DE EFICIENCIA EN LA RECOPILACIÓN:

1. NO REPETIR PREGUNTAS: Si el cliente ya dio un dato, no pedirlo de nuevo.
2. INFERENCIA: Si el cliente dice "MI auto", "MI casa" → el bien está a su nombre.
3. PODERES PUNTUALES: No necesitan plazo de vigencia (solo para el trámite específico).
4. DIRECCIONES EN ARRIENDOS: Si arrienda SU propiedad, la dirección del inmueble ES su domicilio.
5. DEUDA TAG: Distinguir entre MULTAS JPL (requieren documento) y DEUDA DE PEAJE (no requiere documento).
6. FORMA SOCIETARIA: NUNCA agregar "SpA", "Ltda.", "S.A." si el cliente no lo dijo.
7. PRIMERA PREGUNTA: Pedir nombre Y RUT juntos para ahorrar un turno.
8. NO REPREGUNTAR: Si el cliente no responde o dice "no sé", avanzar al siguiente dato.`,
      metadata: {
        type: 'reglas_eficiencia',
        category: 'proceso'
      }
    })
  );

  return docs;
}

/**
 * Extrae requisitos de la instrucción del template
 */
function extractRequisitos(t: LegalTemplate): string | null {
  const instr = t.instruccion_llm.toLowerCase();
  
  // Buscar patrones como "PEDIR:", "necesitas", "obligatorio"
  const patterns = [
    /pedir:([^.]+)/i,
    /necesitas([^.]+)/i,
    /obligatorio([^.]+)/i,
    /datos([^.]+)/i
  ];

  for (const pattern of patterns) {
    const match = t.instruccion_llm.match(pattern);
    if (match) return match[0];
  }

  return t.instruccion_llm.slice(0, 300); // Primeras 300 chars
}

/**
 * Inicializa los documentos (solo una vez)
 */
async function initDocuments(): Promise<Document[]> {
  if (_documents) return _documents;

  _documents = templatesToDocuments();
  
  // Cargar documentos aprendidos previamente
  if (!_docsAprendidosCargados) {
    const docsAprendidos = await cargarDocumentosAprendidos();
    _documents.push(...docsAprendidos);
    _docsAprendidosCargados = true;
    console.log(`[RAG] Base de conocimiento inicializada con ${_documents.length} documentos (${docsAprendidos.length} aprendidos)`);
  } else {
    console.log(`[RAG] Base de conocimiento inicializada con ${_documents.length} documentos`);
  }
  
  return _documents;
}

/**
 * Consulta el RAG (búsqueda simple por keywords)
 * Con cache para mejorar performance
 */
export async function consultarRAG(query: string, k = 3): Promise<Document[]> {
  // Verificar cache
  const cacheKey = generateCacheKey('rag', query, k);
  const cached = agentCache.get(cacheKey);
  if (cached) {
    console.log(`[RAG] ✓ Cache hit: ${query.slice(0, 50)}`);
    return cached;
  }
  
  const docs = await initDocuments();
  const queryLower = query.toLowerCase();
  
  // Búsqueda simple: score por keywords que coinciden
  const scored = docs.map(doc => {
    const content = doc.pageContent.toLowerCase();
    let score = 0;
    
    // Split query en palabras y contar coincidencias
    const words = queryLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      if (content.includes(word)) {
        score += 1;
      }
    }
    
    // Bonus si es documento aprendido y reciente
    if (doc.metadata.aprendido_por_agente) {
      score += 0.5;
    }
    
    return { doc, score };
  });
  
  // Retornar top k
  const results = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(s => s.doc);
  
  // Guardar en cache
  agentCache.set(cacheKey, results);
  
  return results;
}

/**
 * Obtiene requisitos para un tipo de documento específico
 */
export async function obtenerRequisitos(tipoDocumento: string): Promise<string> {
  const docs = await consultarRAG(`requisitos necesarios ${tipoDocumento}`, 2);
  return docs.map(d => d.pageContent).join('\n\n');
}

/**
 * Obtiene artículos legales para un tipo de documento
 */
export async function obtenerArticulos(tipoDocumento: string): Promise<string> {
  const docs = await consultarRAG(`fundamento legal ${tipoDocumento}`, 2);
  return docs.map(d => d.pageContent).join('\n\n');
}

/**
 * Busca el template más relevante dado un caso
 */
export async function buscarTemplate(caso: string): Promise<LegalTemplate | null> {
  const docs = await consultarRAG(caso, 1);
  
  if (docs.length === 0) return null;
  
  const templateId = docs[0].metadata.templateId as string;
  if (!templateId) return null;
  
  return TEMPLATES.find(t => t.id === templateId) ?? null;
}


/**
 * AGREGAR documento nuevo al RAG (aprendizaje incremental)
 * 
 * Cuando el agente encuentra información útil, la guarda aquí.
 * Esto permite que el agente "aprenda" de cada búsqueda exitosa.
 * 
 * AHORA CON PERSISTENCIA: Se guarda en filesystem.
 */
export async function agregarDocumentoAlRAG(
  contenido: string,
  metadata: {
    titulo: string;
    tipo: string;
    fuente: string;
    fecha?: string;
    tags?: string[];
  }
): Promise<{ id: string }> {
  const docs = await initDocuments();
  
  // Generar ID único
  const id = `learned_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // Crear nuevo documento con metadata
  const nuevoDoc = new Document({
    pageContent: contenido,
    metadata: {
      ...metadata,
      fecha_agregado: new Date().toISOString(),
      aprendido_por_agente: true,
      type: 'conocimiento_aprendido',
      id
    }
  });
  
  // Agregar a la lista en memoria
  docs.push(nuevoDoc);
  
  // PERSISTIR en filesystem
  const guardado = await persistirDocumento(nuevoDoc, id);
  
  if (guardado) {
    console.log(`[RAG] ✓ Documento agregado y PERSISTIDO: ${metadata.titulo} (ID: ${id})`);
  } else {
    console.log(`[RAG] ⚠️ Documento agregado en memoria pero falló persistencia: ${id}`);
  }
  
  console.log(`[RAG] Total documentos en RAG: ${docs.length}`);
  
  return { id };
}
