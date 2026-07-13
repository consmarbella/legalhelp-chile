import fs from 'fs';
import path from 'path';
import { llmComplete } from '../lib/llm';
import { TEMPLATES } from '../lib/templates';

// Cargar env manualmente para el script de prueba
const envData = fs.readFileSync('.env.local', 'utf-8');
const deepseekMatch = envData.match(/DEEPSEEK_API_KEY=(.+)/);
if (deepseekMatch) {
  process.env.DEEPSEEK_API_KEY = deepseekMatch[1].trim();
}

const CACHE_FILE = path.join(process.cwd(), 'preload_cache.json');

const SYSTEM_PROMPT = `
Eres el Estratega Legal Maestro de un buffet chileno.
Tu objetivo es tomar un TIPO DE DOCUMENTO LEGAL y generar la mejor ESTRATEGIA GANADORA posible para dejarla en caché.
NO debes redactar el documento final, solo el JSON de la estrategia.
NO devuelvas markdown, SOLO el texto plano del objeto JSON.

Formato requerido:
{
  "estrategia_id": "STRING_UNICO",
  "tribunal_objetivo": "Nombre del tribunal o institución competente",
  "articulos_bcn_citados": ["Lista de artículos exactos de leyes chilenas aplicables"],
  "glosa_ganadora_pjud": "Un párrafo denso con la teoría del caso, jurisprudencia y razonamiento perfecto para que el juez falle a favor.",
  "matematica_plazos": "Explicación exacta de cómo calcular los montos o los días fatales para este escrito."
}

NADA DE MARKDOWN, SOLO JSON VALIDO.
`;

async function generateStrategy(tipo: string, articulos: string[]) {
  const prompt = `Genera el JSON de la estrategia ganadora para el siguiente TIPO DE DOCUMENTO: ${tipo}. Considera estos artículos base: ${articulos.join(', ')}.`;
  
  try {
    const response = await llmComplete({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 2000
    });
    
    if (!response) return null;

    const cleanRes = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanRes);
  } catch (error) {
    console.error(`[Error] Falló la generación para: ${tipo}`, error);
    return null;
  }
}

async function run() {
  console.log("=== INICIANDO PRE-CARGA MASIVA DE LEYES Y ESTRATEGIAS (81 TEMPLATES) ===");
  
  let cache: Record<string, any> = {};
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }

  // Filtrar los que ya están en caché
  const toProcess = TEMPLATES.filter(t => !cache[`${t.id}_template`]);
  console.log(`Faltan procesar ${toProcess.length} templates de ${TEMPLATES.length}.`);

  const BATCH_SIZE = 5;
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    console.log(`Procesando lote ${Math.floor(i/BATCH_SIZE) + 1}...`);
    
    const promises = batch.map(async (t) => {
      console.log(` -> Procesando: ${t.id}`);
      const strategy = await generateStrategy(t.titulo || t.id, t.articulos || []);
      if (strategy) {
        cache[`${t.id}_template`] = {
          strategy,
          metadata: { tribunal_key: "AUTO_GENERATED", materia_key: t.tipo },
          updated_at: new Date().toISOString()
        };
      }
    });

    await Promise.all(promises);
    
    // Guardar avance en cada lote
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`Lote ${Math.floor(i/BATCH_SIZE) + 1} guardado en caché.`);
  }

  console.log(`\n=== FINALIZADO. Preload Caché actualizado masivamente ===`);
}

run();
