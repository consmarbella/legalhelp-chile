import fs from 'fs';
import path from 'path';
import { llmComplete } from '../lib/llm';

// Cargar env manualmente para el script de prueba
const envData = fs.readFileSync('.env.local', 'utf-8');
const deepseekMatch = envData.match(/DEEPSEEK_API_KEY=(.+)/);
if (deepseekMatch) {
  process.env.DEEPSEEK_API_KEY = deepseekMatch[1].trim();
}

const OUT_FILE = path.join(process.cwd(), 'data', 'jurisprudencia.json');

const CATEGORIES = [
  "Derecho Laboral (Despidos, Tutelas, Finiquitos, Acoso, Accidentes, Subcontratación)",
  "Derecho de Familia (Alimentos, Divorcios, Cuidado Personal, Relación Directa y Regular)",
  "Derecho Civil (Arrendamiento, Cobro de Pesos, Indemnización por Perjuicios, Compraventas)",
  "Juzgado de Policía Local (Choques, Ley del Consumidor, Multas de Tránsito)",
  "Derecho Penal y Otros (Querellas por estafa, Alzamiento de Prendas, Posesiones Efectivas)"
];

const SYSTEM_PROMPT = `
Eres un experto jurista chileno (Ministro de la Corte Suprema).
Debes generar un JSON array estricto con exactamente 20 "Casos de Estudio" de jurisprudencia chilena para la categoría solicitada.
NO uses markdown como \`\`\`json, SOLO devuelve el texto plano del arreglo JSON.

Formato requerido de cada objeto:
{
  "id_caso": "string (ej: ROL-1234-2023)",
  "materia": "string (ej: Despido Injustificado, Demanda de Alimentos, Ley del Consumidor)",
  "hechos": "string (resumen de 3 líneas del caso)",
  "razonamiento_tribunal": "string (por qué el juez falló a favor o en contra)",
  "estrategia_ganadora": "string (la lección legal aplicable y artículos clave del caso)"
}

REGLAS:
- Genera EXACTAMENTE 20 casos.
- Inventa casos extremadamente realistas, verosímiles, con ROLES (ej: O-234-2022) o Cortes (Corte de Apelaciones de Santiago, Juzgado Letras Trabajo, etc).
- Que cubran diversas aristas dentro de la materia solicitada.
- SOLO JSON válido, nada de texto extra.
`;

async function generateBatch(category: string, index: number) {
  console.log(`[Batch ${index}] Iniciando generación de 20 casos para: ${category}`);
  
  const prompt = `Genera 20 casos de estudio estrictamente en formato JSON array para la categoría: ${category}. Recuerda: NADA DE MARKDOWN, SOLO JSON VALIDO. Empezando con [ y terminando con ].`;
  
  try {
    const response = await llmComplete({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7, // Para creatividad
      maxTokens: 8192
    });
    
    if (!response) {
      console.log(`[Batch ${index}] Respuesta vacía.`);
      return [];
    }

    const cleanRes = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanRes);
      console.log(`[Batch ${index}] Éxito: ${parsed.length} casos generados.`);
      return parsed;
    } catch (e) {
      console.error(`[Batch ${index}] Error parseando JSON:`, cleanRes.substring(0, 100));
      return [];
    }
  } catch (error) {
    console.error(`[Batch ${index}] Error de red/LLM:`, error);
    return [];
  }
}

async function run() {
  console.log("=== INICIANDO GENERADOR DE JURISPRUDENCIA CHILENA (100 CASOS) ===");
  
  // Promesas concurrentes para las 5 categorías (5 * 20 = 100 casos)
  const promises = CATEGORIES.map((cat, idx) => generateBatch(cat, idx + 1));
  const results = await Promise.all(promises);
  
  const allCases = results.flat();
  
  console.log(`\n=== FINALIZADO. Total de casos válidos generados: ${allCases.length} ===`);
  
  fs.writeFileSync(OUT_FILE, JSON.stringify(allCases, null, 2), 'utf-8');
  console.log(`Guardado exitosamente en: ${OUT_FILE}`);
}

run();
