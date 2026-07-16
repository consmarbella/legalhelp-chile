import { NextRequest, NextResponse } from 'next/server';

const JPL_EMAIL_MAP: Record<string, string> = {
  'Santiago':           'jpl@municipalidadsantiago.cl',
  'Providencia':        'jpl@providencia.cl',
  'Las Condes':         'jpl@lascondes.cl',
  'Vitacura':           'jpl@vitacura.cl',
  'Lo Barnechea':       'jpl@lobarnechea.cl',
  'Huechuraba':         'jpl@huechuraba.cl',
  'Conchalí':           'jpl@conchali.cl',
  'Recoleta':           'jpl@recoleta.cl',
  'Independencia':      'jpl@munindependencia.cl',
  'Quilicura':          'jpl@quilicura.cl',
  'Renca':              'jpl@renca.cl',
  'Pudahuel':           'jpl@pudahuel.cl',
  'Cerro Navia':        'jpl@cerronavia.cl',
  'Lo Prado':           'jpl@loprado.cl',
  'Quinta Normal':      'jpl@quintanormal.cl',
  'Estación Central':   'jpl@estacioncentral.cl',
  'Maipú':              'jpl@maipu.cl',
  'Cerrillos':          'jpl@cerrillos.cl',
  'El Bosque':          'jpl@elbosque.cl',
  'La Cisterna':        'jpl@lacisterna.cl',
  'San Ramón':          'jpl@sanramon.cl',
  'La Granja':          'jpl@lagranja.cl',
  'La Pintana':         'jpl@lapintana.cl',
  'Pedro Aguirre Cerda':'jpl@mpac.cl',
  'San Miguel':         'jpl@sanmiguel.cl',
  'La Florida':         'jpl@laflorida.cl',
  'San Joaquín':        'jpl@sanjoaquin.cl',
  'Macul':              'jpl@macul.cl',
  'Ñuñoa':              'jpl@nunoa.cl',
  'Peñalolén':          'jpl@penalolen.cl',
  'La Reina':           'jpl@lareina.cl',
  'Puente Alto':        'jpl@mpa.cl',
  'Pirque':             'jpl@pirque.cl',
  'San Bernardo':       'jpl@municipalidadsanbernardo.cl',
  'Buin':               'jpl@buin.cl',
  'Paine':              'jpl@paine.cl',
  'Calera de Tango':    'jpl@caleradetango.cl',
  'Melipilla':          'jpl@melipilla.cl',
  'Talagante':          'jpl@talagante.cl',
  'El Monte':           'jpl@elmonte.cl',
  'Peñaflor':           'jpl@penaflor.cl',
  'Isla de Maipo':      'jpl@islaMaipo.cl',
  'Valparaíso':         'jpl@municipalidadvalparaiso.cl',
  'Viña del Mar':       'jpl@munivina.cl',
  'Concepción':         'jpl@municoncepcion.cl',
  'Chillán':            'jpl@municipalidadchillan.cl',
  'Temuco':             'jpl@muniTemuco.cl',
  'Antofagasta':        'jpl@muniantofagasta.cl',
  'Arica':              'jpl@muniarica.cl',
  'Iquique':            'jpl@muniiquique.cl',
  'La Serena':          'jpl@munilaserena.cl',
  'Rancagua':           'jpl@munirancagua.cl',
  'Talca':              'jpl@munitalca.cl',
  'Puerto Montt':       'jpl@munipuertomontt.cl',
  'Punta Arenas':       'jpl@munipuntaarenas.cl',
};

function getJplEmail(comuna: string): string {
  if (JPL_EMAIL_MAP[comuna]) return JPL_EMAIL_MAP[comuna];
  const key = Object.keys(JPL_EMAIL_MAP).find(
    k => k.toLowerCase() === comuna.toLowerCase()
  );
  return key
    ? JPL_EMAIL_MAP[key]
    : `jpl@municipalidad${comuna.toLowerCase().replace(/\s/g, '')}.cl`;
}

interface MultaRaw {
  id?: string;
  fechaInfraccion: string;
  fechaAnotacion: string;
  rol: string;
  comuna: string;
  patente: string;
  monto: string;
}

// ============================================================
// POST /api/parse-multas
// Recibe texto extraído del PDF, filtra +3 años, agrupa por juzgado
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const patente = formData.get('patente') as string || '';
    const rutSolicitante = formData.get('rutSolicitante') as string || '';
    const nombreSolicitante = formData.get('nombreSolicitante') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'Se requiere un archivo PDF.' }, { status: 400 });
    }

    if (typeof global.DOMMatrix === 'undefined') {
      global.DOMMatrix = require('dommatrix');
    }

    const pdfParse = require('pdf-parse');
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text;

    const lines = pdfText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const THREE_YEARS_AGO = new Date();
    THREE_YEARS_AGO.setFullYear(THREE_YEARS_AGO.getFullYear() - 3);

    const multas: MultaRaw[] = [];
    let currentMulta: Partial<MultaRaw> = {};
    let globalPatente = patente;

    const checkAndPush = (m: Partial<MultaRaw>) => {
      if (!m.fechaAnotacion) return; // Se requiere la fecha de ingreso al registro civil
      const [d, mo, y] = m.fechaAnotacion.split('/').map(Number);
      const fecha = new Date(y, mo - 1, d);
      if (isNaN(fecha.getTime())) return;
      if (fecha >= THREE_YEARS_AGO) return; // Solo prescribibles (3 años desde ingreso RMNP)

      multas.push({
        id: m.id || 'Desconocido',
        fechaInfraccion: m.fechaInfraccion || m.fechaAnotacion,
        fechaAnotacion: m.fechaAnotacion,
        rol: m.rol || 'Por determinar',
        comuna: m.comuna || 'Sin juzgado detectado',
        patente: globalPatente || '',
        monto: 'Según Registro',
      });
    };

    for (const line of lines) {
      // Intentar extraer la patente general si no la tenemos
      if (!globalPatente) {
        const patMatch = line.match(/PATENTE\s*UNICA\s*:\s*([A-Z0-9\-]+)/i);
        if (patMatch) globalPatente = patMatch[1].replace(/[\s\-]/g, '');
      }

      if (line.includes('ID MULTA') || line.includes('ID_MULTA')) {
        if (currentMulta.fechaAnotacion) {
          checkAndPush(currentMulta);
        }
        currentMulta = {};
        const idMatch = line.match(/(?:ID MULTA|ID_MULTA)\s*:\s*(\d+)/i);
        if (idMatch) currentMulta.id = idMatch[1];
      }

      const comunaMatch = line.match(/(?:JPL|JUZ(?:GADO)?(?:\s+DE)?(?:\s+POLICÍA\s+LOCAL)?(?:\s+DE)?)[\s:]+(\w[\w\s]+)/i) 
                       || line.match(/POLICIA LOCAL(?: DE)?\s+([A-Z\s]+)/i);
      if (comunaMatch) {
        // Limpiamos un poco el nombre de la comuna (evitar que capture " SAN MIGUEL" con espacios extra)
        currentMulta.comuna = comunaMatch[1].trim();
      }

      const rolMatch = line.match(/ROL\s*:\s*([A-Z0-9\-]+)/i) || line.match(/\bROL\b\s+([A-Z0-9\-]+)/i);
      if (rolMatch) currentMulta.rol = rolMatch[1].trim();

      const fechaMatch = line.match(/FECHA INFRACCION\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
      if (fechaMatch) currentMulta.fechaInfraccion = fechaMatch[1].replace(/-/g, '/');

      const fechaAnotacionMatch = line.match(/FECHA INGRESO RMNP\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
      if (fechaAnotacionMatch) currentMulta.fechaAnotacion = fechaAnotacionMatch[1].replace(/-/g, '/');
    }
    // Empujar la última multa
    if (currentMulta.fechaAnotacion) {
      checkAndPush(currentMulta);
    }

    // Extraer datos del cliente (DATOS DEL PROPIETARIO)
    let nombreExtracted = nombreSolicitante;
    let runExtracted = rutSolicitante;
    const nombreMatch = pdfText.match(/Nombre\s*:\s*(.+)/i);
    if (nombreMatch) nombreExtracted = nombreMatch[1].trim();
    const runMatch = pdfText.match(/R\.U\.N\.\s*:\s*([0-9\.\-kK]+)/i);
    if (runMatch) runExtracted = runMatch[1].trim();

    // Agrupar por comuna
    const grouped: Record<string, MultaRaw[]> = {};
    for (const m of multas) {
      if (!grouped[m.comuna]) grouped[m.comuna] = [];
      grouped[m.comuna].push(m);
    }

    const comunas = Object.keys(grouped);
    const totalCobro = comunas.length === 0
      ? 0
      : 10000 + Math.max(0, comunas.length - 1) * 4000;

    const comunasConCorreo = comunas.map(c => ({
      nombre: c,
      correo: getJplEmail(c),
      multas: grouped[c],
    }));

    const multas_por_tribunal: Record<string, any[]> = {};
    for (const [tribunal, lista] of Object.entries(grouped)) {
      multas_por_tribunal[tribunal] = lista.map(m => ({
        id: m.id,
        fecha_ingreso: m.fechaAnotacion,
        rol: m.rol,
      }));
    }

    return NextResponse.json({
      ok: true,
      cliente: {
        nombre: nombreExtracted,
        run: runExtracted,
        patente: globalPatente || patente,
      },
      multas_por_tribunal,
      // Retro-compatibilidad para el frontend mientras lo actualizamos
      totalMultas: multas.length,
      comunas: comunasConCorreo,
      cobro: totalCobro,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[parse-multas]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
