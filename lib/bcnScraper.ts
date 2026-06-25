/**
 * bcnScraper.ts — Scraper de la Biblioteca del Congreso Nacional (BCN).
 * 
 * El BCN es una SPA (React) que no tiene API REST pública. Sin embargo,
 * usando urllib con User-Agent de navegador se puede obtener el HTML
 * inicial que contiene metadatos de la norma. Para obtener el texto completo
 * se requiere renderizado JS, pero podemos usar la versión texto/plano
 * que el BCN tiene para accesibilidad.
 * 
 * Alternativa: www.leychile.cl solía tener una API SOAP/XML. Probamos
 * múltiples endpoints.
 */

export interface BCNResult {
  found: boolean;
  titulo: string;
  fecha: string;
  texto: string;
  url: string;
  error?: string;
}

const BCN_USER_AGENT = 'Mozilla/5.0 (compatible; LegalHelpBot/1.0; +https://legalhelp.cl)';

/**
 * Busca una norma en el BCN por ID.
 * idNorma: el identificador numérico de la norma (ej: 172986 = Código Civil)
 */
export async function buscarNorma(idNorma: string): Promise<BCNResult> {
  console.log(`[bcnScraper] Buscando norma ${idNorma}...`);

  try {
    // Intentar endpoint XML (el que funcionó con Python)
    const xmlUrl = `https://www.leychile.cl/Consulta/obtxml?opt=7&idNorma=${idNorma}`;
    const response = await fetch(xmlUrl, {
      headers: {
        'User-Agent': BCN_USER_AGENT,
        'Accept': 'application/xml,text/plain,*/*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 100 && !text.includes('<!doctype html')) {
        console.log(`[bcnScraper] ✅ Norma ${idNorma} encontrada via XML (${text.length} chars)`);
        return {
          found: true,
          titulo: extractTitle(text),
          fecha: extractDate(text),
          texto: cleanXml(text),
          url: xmlUrl,
        };
      }
    }

    // Fallback: HTML del BCN (SPA, pero intentamos extraer metadatos)
    const htmlUrl = `https://www.bcn.cl/leychile/navegar?idNorma=${idNorma}`;
    const htmlResponse = await fetch(htmlUrl, {
      headers: {
        'User-Agent': BCN_USER_AGENT,
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      // Extraer título y descripción del meta tags
      const titleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
      const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/);
      
      return {
        found: true,
        titulo: titleMatch ? titleMatch[1] : `Norma ${idNorma}`,
        fecha: '',
        texto: descMatch ? descMatch[1] : '',
        url: htmlUrl,
      };
    }

    return {
      found: false,
      titulo: '',
      fecha: '',
      texto: '',
      url: htmlUrl,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    console.error(`[bcnScraper] Error buscando norma ${idNorma}:`, error);
    return {
      found: false,
      titulo: '',
      fecha: '',
      texto: '',
      url: '',
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Busca una norma por su número de artículo y ley
 */
export async function buscarArticulo(ley: string, articulo: string): Promise<BCNResult> {
  // Mapa de leyes conocidas a idNorma
  const LEYES: Record<string, string> = {
    'codigo civil': '172986',
    'codigo del trabajo': '207436',
    'ley 19496': '61438',        // Ley del Consumidor
    'ley 14908': '26774',        // Pensión de Alimentos
    'ley 20066': '21886',        // Violencia Intrafamiliar
    'ley 18287': '24503',        // JPL
    'ley 18101': '26136',        // Arrendamiento
    'ley 19947': '26843',        // Matrimonio Civil
    'ley 21389': '1185688',      // Registro Deudores Alimentos
    'ley 18575': '23655',        // Bases Administración del Estado
    'ley 18290': '24601',        // Ley de Tránsito
    'constitucion': '242302',    // Constitución
    'dl 3500': '21124',         // DL Cotizaciones
    'ley 19628': '24742',       // Ley de Datos Personales
  };

  const leyNorm = ley.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  let idNorma = LEYES[leyNorm];
  if (!idNorma) {
    // Buscar parcial
    for (const [key, val] of Object.entries(LEYES)) {
      if (leyNorm.includes(key) || key.includes(leyNorm)) {
        idNorma = val;
        break;
      }
    }
  }

  if (!idNorma) {
    return { found: false, titulo: '', fecha: '', texto: '', url: '', error: `Ley "${ley}" no encontrada en el mapa` };
  }

  return buscarNorma(idNorma);
}

function extractTitle(xml: string): string {
  const match = xml.match(/<TITULO[^>]*>([^<]+)</i) || xml.match(/<TITULO[^>]*>([^<]+)</i);
  return match ? match[1].trim() : 'Sin título';
}

function extractDate(xml: string): string {
  const match = xml.match(/<FECHA[^>]*>([^<]+)</i) || xml.match(/<FECHA_PUBLICACION[^>]*>([^<]+)</i);
  return match ? match[1].trim() : '';
}

function cleanXml(xml: string): string {
  // Eliminar tags XML y dejar solo texto
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-záéíóúñ]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000); // Limitar a 5000 chars para no saturar el prompt
}

/**
 * Busca información legal en múltiples fuentes cuando no hay plantilla.
 * Esta es la función principal que debe llamar generate-final cuando
 * no encuentra template.
 */
export async function buscarMarcoLegal(tipoDocumento: string): Promise<{
  encontrado: boolean;
  marcoLegal: string;
  fuente: string;
  url: string;
}> {
  console.log(`[bcnScraper] Buscando marco legal para: ${tipoDocumento}`);

  // Mapa de tipos de documento a leyes relevantes
  const MAPEO: Record<string, string[]> = {
    'eliminacion antecedentes': ['codigo civil', 'ley 18575'],
    'limpieza hoja vida': ['ley 18290', 'ley 18287'],
    'vif': ['ley 20066'],
    'registro deudores': ['ley 21389', 'ley 14908'],
    'acuerdo confidencialidad': ['codigo civil'],
    'acuerdo pago': ['codigo civil'],
    'divorcio': ['ley 19947'],
    'tuicion': ['codigo civil'],
    'certificado antecedentes': ['ley 19628'],
  };

  const tipoNorm = tipoDocumento.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  let leyesABuscar: string[] = [];
  for (const [key, leyes] of Object.entries(MAPEO)) {
    if (tipoNorm.includes(key) || key.includes(tipoNorm)) {
      leyesABuscar = leyes;
      break;
    }
  }

  if (leyesABuscar.length === 0) {
    return { encontrado: false, marcoLegal: '', fuente: '', url: '' };
  }

  let marcoLegal = '';
  let fuente = '';
  let url = '';

  for (const ley of leyesABuscar) {
    const result = await buscarArticulo(ley, '');
    if (result.found) {
      marcoLegal += `${result.titulo}: ${result.texto}\n\n`;
      fuente += `${result.titulo} `;
      url = result.url;
    }
  }

  return {
    encontrado: marcoLegal.length > 0,
    marcoLegal: marcoLegal.slice(0, 3000),
    fuente: fuente.trim() || 'BCN',
    url,
  };
}
