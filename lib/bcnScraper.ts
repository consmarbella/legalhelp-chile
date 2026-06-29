/**
 * bcnScraper.ts — Consulta el BCN (Ley Chile) usando leychile.cl XML
 * y Firecrawl como fallback para páginas que requieren JS.
 * 
 * El endpoint XML de leychile.cl NO requiere JS y devuelve la norma completa.
 * Firecrawl se usa para páginas web que necesitan renderizado.
 */

const BCN_XML_BASE = 'https://www.leychile.cl/Consulta/obtxml?opt=7&idNorma=';

// Mapa de leyes chilenas a idNorma en el BCN
const LEYES: Record<string, string> = {
  'codigo civil': '172986',
  'codigo del trabajo': '207436',
  'ley 19496': '61438',
  'ley 14908': '26774',
  'ley 20066': '242648',
  'ley 18287': '24503',
  'ley 18101': '26136',
  'ley 19947': '26843',
  'ley 21389': '1185688',
  'ley 18575': '23655',
  'ley 18290': '24601',
  'constitucion': '242302',
  'dl 3500': '21124',
  'ley 19628': '24742',
};

export interface BCNArticle {
  numero: string;
  titulo: string;
  texto: string;
}

export interface BCNResult {
  found: boolean;
  titulo: string;
  articulos: BCNArticle[];
  url: string;
}

/**
 * Busca una norma en el BCN por idNorma y extrae sus artículos.
 */
export async function buscarNorma(idNorma: string): Promise<BCNResult> {
  console.log(`[bcnScraper] Buscando norma ${idNorma}...`);
  
  try {
    // Intentar XML de leychile.cl (no requiere JS, funciona desde servidor)
    const xmlUrl = `${BCN_XML_BASE}${idNorma}`;
    const response = await fetch(xmlUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalHelpBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { found: false, titulo: '', articulos: [], url: xmlUrl };
    }

    const xml = await response.text();
    
    // Verificar que es XML válido
    if (xml.length < 500 || xml.includes('<!doctype html')) {
      return { found: false, titulo: '', articulos: [], url: xmlUrl };
    }

    console.log(`[bcnScraper] Norma obtenida: ${(xml.length / 1024).toFixed(0)}KB`);

    // Extraer título de la norma
    const tituloMatch = xml.match(/<TituloNorma>([^<]+)<\/TituloNorma>/);
    const titulo = tituloMatch ? tituloMatch[1].trim() : 'Sin título';

    // Extraer artículos del XML
    const articulos: BCNArticle[] = [];
    
    // Buscar todas las estructuras funcionales que son artículos
    const artMatches = xml.matchAll(/<EstructuraFuncional[^>]*tipoParte="Artículo"[^>]*>([\s\S]*?)<\/EstructuraFuncional>/g);
    
    for (const match of artMatches) {
      const block = match[1];
      
      // Extraer número del artículo
      const numMatch = block.match(/<NombreParte[^>]*>([^<]+)<\/NombreParte>/);
      const numero = numMatch ? numMatch[1].trim() : '?';
      
      // Extraer título del artículo (si tiene)
      const tituloArtMatch = block.match(/<TituloParte[^>]*>([^<]+)<\/TituloParte>/);
      const tituloArt = tituloArtMatch && tituloArtMatch[1].trim() !== '\u00a0' 
        ? tituloArtMatch[1].trim() : '';
      
      // Extraer texto del artículo
      const textoMatch = block.match(/<Texto>([\s\S]*?)<\/Texto>/);
      const texto = textoMatch 
        ? textoMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&[a-záéíóúñ]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : '';
      
      if (numero && texto) {
        articulos.push({ numero, titulo: tituloArt, texto });
      }
    }

    return {
      found: articulos.length > 0,
      titulo,
      articulos,
      url: xmlUrl,
    };
  } catch (error) {
    console.error(`[bcnScraper] Error:`, error);
    return { found: false, titulo: '', articulos: [], url: '' };
  }
}

/**
 * Busca artículos específicos de una ley.
 */
export async function buscarArticulos(leyQuery: string, articulosBuscar?: string[]): Promise<{
  encontrado: boolean;
  textoLegal: string;
  fuente: string;
}> {
  const leyNorm = leyQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Encontrar idNorma
  let idNorma = LEYES[leyNorm];
  if (!idNorma) {
    for (const [key, val] of Object.entries(LEYES)) {
      if (leyNorm.includes(key) || key.includes(leyNorm)) {
        idNorma = val;
        break;
      }
    }
  }

  if (!idNorma) {
    return { encontrado: false, textoLegal: '', fuente: '' };
  }

  const result = await buscarNorma(idNorma);
  if (!result.found) {
    return { encontrado: false, textoLegal: '', fuente: '' };
  }

  // Filtrar artículos si se especificaron
  let articulosFiltrados = result.articulos;
  if (articulosBuscar && articulosBuscar.length > 0) {
    articulosFiltrados = result.articulos.filter(a => 
      articulosBuscar.some(b => a.numero === b)
    );
  }

  // Si no se encontraron los artículos específicos, devolver los primeros 5
  if (articulosFiltrados.length === 0 && result.articulos.length > 0) {
    articulosFiltrados = result.articulos.slice(0, 5);
  }

  const textoLegal = articulosFiltrados
    .map(a => `Artículo ${a.numero}${a.titulo ? ' - ' + a.titulo : ''}: ${a.texto}`)
    .join('\n\n');

  return {
    encontrado: textoLegal.length > 0,
    textoLegal: textoLegal.slice(0, 3000),
    fuente: result.titulo,
  };
}

/**
 * Busca información legal en el BCN para un tipo de documento.
 * Esta función se llama desde generate-final cuando no hay plantilla.
 */
export async function buscarMarcoLegal(tipoDocumento: string): Promise<{
  encontrado: boolean;
  marcoLegal: string;
  fuente: string;
}> {
  const tipoNorm = tipoDocumento.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Mapeo de tipos de documento a leyes relevantes + artículos
  const MAPEO: Record<string, { ley: string; articulos?: string[] }> = {
    'eliminacion antecedentes': { ley: 'ley 18575', articulos: ['22'] },
    'limpieza hoja vida': { ley: 'ley 18290', articulos: ['20'] },
    'omision antecedentes': { ley: 'ley 20066', articulos: ['12'] },
    'vif': { ley: 'ley 20066', articulos: ['12'] },
    'violencia intrafamiliar': { ley: 'ley 20066', articulos: ['12'] },
    'registro deudores': { ley: 'ley 21389' },
    'deudor alimentos': { ley: 'ley 21389' },
    'moroso pension': { ley: 'ley 21389' },
    'acuerdo confidencialidad': { ley: 'codigo civil', articulos: ['1545', '1560'] },
    'acuerdo pago': { ley: 'codigo civil', articulos: ['1551', '1567'] },
    'divorcio': { ley: 'ley 19947', articulos: ['21', '22'] },
    'tuicion': { ley: 'codigo civil', articulos: ['224', '225'] },
    'cuidado personal': { ley: 'codigo civil', articulos: ['224', '225'] },
    'certificado antecedentes': { ley: 'ley 19628' },
    'licencia conducir': { ley: 'ley 18290' },
    'pension alimenticia': { ley: 'ley 14908' },
    'alimentos': { ley: 'ley 14908' },
    'prescripcion tag': { ley: 'ley 18287' },
    'prescripcion multa': { ley: 'ley 18287' },
    'prescripcion deuda': { ley: 'codigo civil', articulos: ['2515', '2518'] },
    'finiquito': { ley: 'codigo del trabajo', articulos: ['177', '163'] },
    'despido': { ley: 'codigo del trabajo', articulos: ['161', '162', '168'] },
    'reclamo sernac': { ley: 'ley 19496', articulos: ['3', '20', '23'] },
    'proteccion': { ley: 'constitucion', articulos: ['20'] },
    'arriendo': { ley: 'ley 18101', articulos: ['1', '3'] },
    'constitucion spa': { ley: 'ley 19947' },
    'posesion efectiva': { ley: 'codigo civil', articulos: ['982', '983'] },
  };

  let leyEncontrada = '';
  let articulosBuscar: string[] | undefined;

  for (const [key, val] of Object.entries(MAPEO)) {
    if (tipoNorm.includes(key)) {
      leyEncontrada = val.ley;
      articulosBuscar = val.articulos;
      break;
    }
  }

  if (!leyEncontrada) {
    return { encontrado: false, marcoLegal: '', fuente: '' };
  }

  const result = await buscarArticulos(leyEncontrada, articulosBuscar);
  return {
    encontrado: result.encontrado,
    marcoLegal: result.textoLegal,
    fuente: result.fuente,
  };
}
