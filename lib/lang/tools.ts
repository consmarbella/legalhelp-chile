/**
 * TOOLS del agente LangGraph
 * 
 * Convierte tu lógica actual en funciones que el agente puede llamar.
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { consultarRAG, obtenerRequisitos, buscarTemplate } from './vectorstore';
import { validateReadyState, generateMissingFieldQuestion } from '@/lib/validateReady';
import type { LegalTemplate } from '@/lib/templates';

/**
 * TOOL 0: Buscar en internet (BCN, leyes chilenas, jurisprudencia)
 * 
 * Usa web_fetch para obtener información actualizada de fuentes oficiales.
 * Si encuentra información útil, la AGREGA al RAG automáticamente.
 */
export const buscarEnWebTool = tool(
  async ({ query, tipo }) => {
    console.log(`[buscarEnWeb] Buscando: ${query} en ${tipo}`);
    
    // Construir búsquedas específicas según el tipo
    let url = '';
    let titulo = '';
    
    if (tipo === 'bcn') {
      url = `https://www.bcn.cl/leychile/navegar?idNorma=${query}`;
      titulo = `BCN - Norma ${query}`;
    } else if (tipo === 'codigo_trabajo') {
      url = 'https://www.bcn.cl/leychile/navegar?idNorma=207436';
      titulo = 'Código del Trabajo';
    } else if (tipo === 'codigo_civil') {
      url = 'https://www.bcn.cl/leychile/navegar?idNorma=172986';
      titulo = 'Código Civil';
    } else if (tipo === 'ley_consumidor') {
      url = 'https://www.bcn.cl/leychile/navegar?idNorma=61438';
      titulo = 'Ley 19.496 - Protección al Consumidor';
    } else if (tipo === 'direccion_trabajo') {
      url = 'https://www.dt.gob.cl/portal/1626/w3-propertyvalue-22152.html';
      titulo = 'Dirección del Trabajo';
    }
    
    // Instrucción para que el agente use agregar_conocimiento_nuevo
    const mensaje = `Encontré información sobre ${query} en ${titulo} (${url}).

IMPORTANTE: Si esta información responde la pregunta del usuario, usa la tool "agregar_conocimiento_nuevo" para guardarla en el RAG y que esté disponible para futuras consultas.

Ejemplo de uso:
- contenido: El texto completo de la información útil
- metadata.titulo: "${titulo}"
- metadata.tipo: "articulo_legal" o "plantilla_oficial" según corresponda
- metadata.fuente: "${url}"
- metadata.tags: palabras clave relevantes

Esto hará que el agente aprenda y mejore automáticamente.`;
    
    return {
      fuente: tipo,
      url,
      titulo,
      mensaje
    };
  },
  {
    name: 'buscar_fuentes_oficiales',
    description: 'Busca información en fuentes oficiales chilenas (BCN, Dirección del Trabajo, códigos legales). Usa esto cuando necesites información legal actualizada o plantillas oficiales que no estén en el RAG.',
    schema: z.object({
      query: z.string().describe('Qué información legal necesitas (ej: "artículo 163", "finiquito", "contrato de trabajo")'),
      tipo: z.enum(['bcn', 'codigo_trabajo', 'codigo_civil', 'ley_consumidor', 'direccion_trabajo']).describe('Qué fuente oficial consultar')
    })
  }
);

/**
 * TOOL 0.5: Agregar conocimiento nuevo al RAG
 * 
 * Cuando el agente encuentra información útil (web search, documentos generados exitosamente),
 * la PERSISTE en el RAG para futuras consultas.
 */
export const agregarConocimientoTool = tool(
  async ({ contenido, metadata }) => {
    console.log('[agregarConocimiento] Guardando nuevo conocimiento...');
    
    // Agregar al RAG (vectorstore persistente)
    const { agregarDocumentoAlRAG } = await import('./vectorstore');
    const resultado = await agregarDocumentoAlRAG(contenido, metadata);
    
    console.log(`[agregarConocimiento] ✓ Guardado: ${metadata.titulo}`);
    
    return {
      guardado: true,
      mensaje: `Conocimiento agregado: ${metadata.titulo}. La próxima vez que alguien pregunte algo similar, ya lo tendré en mi base de datos.`,
      id: resultado.id
    };
  },
  {
    name: 'agregar_conocimiento_nuevo',
    description: 'Agrega información nueva al RAG para que esté disponible en futuras conversaciones. Usa esto cuando encuentres información útil que quieras recordar (plantillas nuevas, requisitos legales, artículos).',
    schema: z.object({
      contenido: z.string().describe('El contenido completo a guardar'),
      metadata: z.object({
        titulo: z.string().describe('Título descriptivo'),
        tipo: z.string().describe('Tipo de documento (plantilla, artículo legal, requisito)'),
        fuente: z.string().describe('De dónde viene (BCN, Dirección Trabajo, etc.)'),
        fecha: z.string().optional().describe('Fecha de captura'),
        tags: z.array(z.string()).optional().describe('Tags para búsqueda')
      }).describe('Metadatos del conocimiento')
    })
  }
);

/**
 * TOOL 1: Extraer datos estructurados del mensaje del usuario
 * 
 * El agente llama a esto para convertir lenguaje natural en datos estructurados.
 */
export const extraerDatosTool = tool(
  async ({ mensaje, contexto }) => {
    // Esta tool es básicamente un wrapper para que el agente sepa que debe
    // estructurar los datos. La lógica real está en el LLM del graph.
    return {
      accion: 'extraer_datos',
      mensaje,
      contexto_actual: contexto
    };
  },
  {
    name: 'extraer_datos_mensaje',
    description: 'Extrae información estructurada del mensaje del usuario (nombre, RUT, fechas, montos, etc.). Usa esto cuando el usuario responde con datos.',
    schema: z.object({
      mensaje: z.string().describe('El mensaje del usuario'),
      contexto: z.record(z.string(), z.unknown()).optional().describe('Datos ya recopilados anteriormente')
    })
  }
);

/**
 * TOOL 2: Consultar requisitos legales desde el RAG
 * 
 * En vez de tener hardcoded en el prompt "un finiquito necesita X, Y, Z",
 * el agente CONSULTA el RAG.
 */
export const consultarRequisitosTool = tool(
  async ({ tipoDocumento }) => {
    const requisitos = await obtenerRequisitos(tipoDocumento);
    return {
      tipo_documento: tipoDocumento,
      requisitos,
      fuente: 'RAG vectorstore'
    };
  },
  {
    name: 'consultar_requisitos_legales',
    description: 'Consulta qué datos son necesarios para un tipo de documento específico según la ley chilena. Usa esto cuando identifiques el tipo de documento y necesites saber qué preguntar.',
    schema: z.object({
      tipoDocumento: z.string().describe('Tipo de documento (ej: "finiquito laboral", "poder simple", "reclamo SERNAC")')
    })
  }
);

/**
 * TOOL 3: Validar si los datos están completos
 * 
 * Esta es tu función validateReadyState convertida en tool.
 * El agente la llama para decidir si puede marcar ready=true.
 */
export const validarCompletitudTool = tool(
  async ({ tipoDocumento, datosRecopilados }) => {
    const validation = validateReadyState({
      tipo_documento: tipoDocumento,
      ...datosRecopilados
    });

    if (!validation.valid) {
      const pregunta = generateMissingFieldQuestion(validation.missing);
      return {
        completo: false,
        datos_faltantes: validation.missing,
        siguiente_pregunta: pregunta,
        razon: `Faltan datos obligatorios: ${validation.missing.join(', ')}`
      };
    }

    return {
      completo: true,
      datos_faltantes: [],
      mensaje: 'Todos los datos necesarios están completos',
      puede_generar: true
    };
  },
  {
    name: 'validar_completitud_datos',
    description: 'Valida si se tienen todos los datos obligatorios para generar el documento. SIEMPRE usa esta tool antes de marcar ready=true.',
    schema: z.object({
      tipoDocumento: z.string().describe('Tipo de documento'),
      datosRecopilados: z.record(z.string(), z.unknown()).describe('Todos los datos recopilados hasta ahora')
    })
  }
);

/**
 * TOOL 4: Buscar conocimiento legal en el RAG
 * 
 * Para casos que no tengan template o cuando el agente necesite
 * información adicional.
 */
export const buscarConocimientoTool = tool(
  async ({ consulta, k = 3 }) => {
    const docs = await consultarRAG(consulta, k);
    return {
      resultados: docs.map(d => ({
        contenido: d.pageContent,
        metadata: d.metadata
      })),
      cantidad: docs.length
    };
  },
  {
    name: 'buscar_conocimiento_legal',
    description: 'Busca información en la base de conocimiento legal (templates, requisitos, artículos). Usa esto cuando necesites información adicional sobre un tema legal específico.',
    schema: z.object({
      consulta: z.string().describe('Qué quieres buscar (ej: "plazos de prescripción", "indemnización por años de servicio")'),
      k: z.number().optional().default(3).describe('Cantidad de resultados a retornar')
    })
  }
);

/**
 * TOOL 5: Identificar template relevante
 * 
 * Busca si hay un template pre-definido para este caso.
 */
export const identificarTemplateTool = tool(
  async ({ descripcionCaso }) => {
    const template = await buscarTemplate(descripcionCaso);
    
    if (!template) {
      return {
        encontrado: false,
        mensaje: 'No hay template específico, generaré el documento de forma libre'
      };
    }

    return {
      encontrado: true,
      template_id: template.id,
      titulo: template.titulo,
      tipo: template.tipo,
      articulos: template.articulos,
      instrucciones: template.instruccion_llm
    };
  },
  {
    name: 'identificar_template',
    description: 'Busca si existe un template pre-definido para el caso del usuario. Usa esto al inicio después de entender qué necesita el cliente.',
    schema: z.object({
      descripcionCaso: z.string().describe('Descripción del caso del usuario')
    })
  }
);

/**
 * TOOL 6: Generar siguiente pregunta inteligente
 * 
 * Basado en los datos faltantes, genera la pregunta más apropiada.
 */
export const generarPreguntaTool = tool(
  async ({ campoFaltante, contexto }) => {
    const pregunta = generateMissingFieldQuestion([campoFaltante]);
    
    return {
      pregunta,
      campo: campoFaltante,
      tipo: inferirTipoPregunta(campoFaltante)
    };
  },
  {
    name: 'generar_siguiente_pregunta',
    description: 'Genera la siguiente pregunta apropiada para recopilar un dato faltante. Usa esto cuando sepas qué dato necesitas pero quieras asegurarte de hacer la pregunta correctamente.',
    schema: z.object({
      campoFaltante: z.string().describe('El campo que falta (ej: "nombre", "rut", "empleador")'),
      contexto: z.record(z.string(), z.unknown()).optional().describe('Contexto del caso para personalizar la pregunta')
    })
  }
);

/**
 * Helper: Infiere el tipo de dato esperado para validación
 */
function inferirTipoPregunta(campo: string): string {
  if (campo.includes('rut')) return 'rut';
  if (campo.includes('fecha') || campo.includes('cuando')) return 'fecha';
  if (campo.includes('monto') || campo.includes('sueldo') || campo.includes('pago')) return 'monto';
  if (campo.includes('nombre')) return 'nombre_completo';
  if (campo.includes('direccion') || campo.includes('domicilio')) return 'direccion';
  return 'texto_libre';
}

/**
 * EXPORT: Lista de todas las tools disponibles
 */
export const allTools = [
  buscarEnWebTool,
  agregarConocimientoTool,
  consultarRequisitosTool,
  validarCompletitudTool,
  buscarConocimientoTool,
  identificarTemplateTool,
  generarPreguntaTool
];

/**
 * Helper: Obtiene una tool por nombre
 */
export function getToolByName(name: string) {
  return allTools.find(t => t.name === name);
}
