/**
 * retrieve.ts — Retrieval de jurisprudencia desde Supabase.
 * ─────────────────────────────────────────────────────────────────────────────
 * Consulta la tabla `jurisprudencia` filtrando por materia_id y priorizando
 * fallos favorables. Devuelve los considerandos formateados para inyectar
 * en el prompt de redacción.
 *
 * Si Supabase no está configurado, usa un fallback local (datos hardcoded).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Supabase client ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

// ─── Interfaz ────────────────────────────────────────────────────────────────
interface FalloRow {
  tribunal: string;
  rol: string;
  fecha: string;
  resultado: string;
  resumen: string;
  fundamentos: string;
  articulos_clave: string[];
}

function formatFallo(f: FalloRow): string {
  return `[FALLO ${f.rol} — ${f.tribunal} — ${f.fecha} — ${f.resultado.toUpperCase()}]
Resumen: ${f.resumen}
Fundamentos: ${f.fundamentos}
Artículos citados: ${f.articulos_clave.join(', ')}`;
}

// ─── Retrieval desde Supabase ────────────────────────────────────────────────
export async function retrieveJurisprudencia(materiaId: string): Promise<string[]> {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await getSupabase()
        .from('jurisprudencia')
        .select('tribunal, rol, fecha, resultado, resumen, fundamentos, articulos_clave')
        .eq('materia_id', materiaId)
        .order('resultado', { ascending: true }) // favorable primero
        .order('fecha', { ascending: false })    // más recientes primero
        .limit(5);

      if (error) {
        console.error('[retrieve] Supabase error:', error.message);
        return getFallbackJurisprudencia(materiaId);
      }

      if (data && data.length > 0) {
        return data.map(formatFallo);
      }
    } catch (err) {
      console.error('[retrieve] error:', err);
    }
  }

  return getFallbackJurisprudencia(materiaId);
}

// ─── Fallback local (datos semilla hardcoded) ────────────────────────────────
const FALLBACK_JURIS: Record<string, FalloRow[]> = {
  'prescripcion-multa-transito': [
    {
      tribunal: 'JPL de Providencia',
      rol: 'P-1234-2023',
      fecha: '2023-08-15',
      resultado: 'favorable',
      resumen: 'Se acoge excepción de prescripción de multa de tránsito por transcurso de más de 3 años sin notificación judicial.',
      fundamentos: 'Que de conformidad al artículo 24 de la Ley 18.287, las acciones y sanciones derivadas de infracciones de tránsito prescriben en el plazo de 3 años contados desde la fecha de la infracción. Que la sola emisión del parte no interrumpe la prescripción; se requiere notificación judicial válida dentro del plazo.',
      articulos_clave: ['Art. 24 Ley 18.287', 'Art. 2515 CC'],
    },
    {
      tribunal: 'JPL de Maipú',
      rol: 'P-5678-2022',
      fecha: '2022-11-20',
      resultado: 'favorable',
      resumen: 'Se declara prescrita multa TAG. El tribunal enfatiza que la anotación en registro no interrumpe la prescripción.',
      fundamentos: 'Que la prescripción opera por el solo transcurso del tiempo sin que la emisión del parte o la anotación constituyan actos interruptivos. Solo la notificación judicial válida practicada dentro del plazo puede interrumpir la prescripción.',
      articulos_clave: ['Art. 24 Ley 18.287', 'Art. 2518 CC'],
    },
  ],
  'recurso-proteccion': [
    {
      tribunal: 'CA Santiago',
      rol: 'RP-9012-2024',
      fecha: '2024-03-10',
      resultado: 'favorable',
      resumen: 'Se acoge recurso por vulneración del Art. 19 N°24 CPR. Isapre negó cobertura GES sin fundamento.',
      fundamentos: 'Que la conducta de negar cobertura de una patología GES sin cumplir el procedimiento legal constituye un acto arbitrario que vulnera el derecho de propiedad sobre los beneficios del plan de salud (Art. 19 N°24 CPR).',
      articulos_clave: ['Art. 20 CPR', 'Art. 19 N°24 CPR', 'Ley 19.966'],
    },
  ],
  'reclamo-jpl-sernac': [
    {
      tribunal: 'JPL de Las Condes',
      rol: 'C-3456-2023',
      fecha: '2023-06-28',
      resultado: 'favorable',
      resumen: 'Proveedor condenado por infracción Art. 12 Ley 19.496. Devolución del precio + multa fiscal.',
      fundamentos: 'Que el proveedor incurrió en infracción al artículo 12 de la Ley 19.496 al no respetar los términos ofrecidos. Se condena a multa de 50 UTM y restitución de $890.000.',
      articulos_clave: ['Art. 12 Ley 19.496', 'Art. 50 C Ley 19.496', 'Art. 24 Ley 19.496'],
    },
  ],
  'denuncia-ruidos-molestos': [
    {
      tribunal: 'JPL de Ñuñoa',
      rol: 'D-7890-2024',
      fecha: '2024-01-15',
      resultado: 'favorable',
      resumen: 'Local comercial excede norma DS 38/2011. Multa 3 UTM + orden de mitigación.',
      fundamentos: 'Que se acredita que el local excede en 8 dB los niveles máximos del DS 38/2011 para zona residencial en horario nocturno. Configura infracción Art. 494 N°1 CP.',
      articulos_clave: ['Art. 494 N°1 CP', 'DS 38/2011 MMA'],
    },
  ],
};

function getFallbackJurisprudencia(materiaId: string): string[] {
  const fallos = FALLBACK_JURIS[materiaId];
  if (!fallos || fallos.length === 0) return [];
  return fallos.map(formatFallo);
}
