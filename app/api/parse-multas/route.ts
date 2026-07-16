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
    const { pdfText, rutSolicitante, nombreSolicitante, patente } = await req.json();

    if (!pdfText) {
      return NextResponse.json({ error: 'Se requiere el texto del PDF.' }, { status: 400 });
    }

    const lines = pdfText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const THREE_YEARS_AGO = new Date();
    THREE_YEARS_AGO.setFullYear(THREE_YEARS_AGO.getFullYear() - 3);

    const multas: MultaRaw[] = [];
    const linePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/;

    for (const line of lines) {
      const match = line.match(linePattern);
      if (!match) continue;

      const rawDate = match[1].replace(/-/g, '/');
      const [d, m, y] = rawDate.split('/').map(Number);
      const fecha = new Date(y, m - 1, d);
      if (isNaN(fecha.getTime())) continue;
      if (fecha >= THREE_YEARS_AGO) continue; // Solo prescribibles

      const patenteMatch = line.match(/\b([A-Z]{2,4}[\s\-]?\d{2,4})\b/i);
      const rolMatch = line.match(/\b(\d{1,6}[\/\-]\d{2,4})\b/);
      const comunaMatch = line.match(
        /(?:JPL|JUZ(?:GADO)?(?:\s+DE)?(?:\s+POLICÍA\s+LOCAL)?(?:\s+DE)?)[\s:]+(\w[\w\s]+)/i
      );

      multas.push({
        fechaInfraccion: rawDate,
        fechaAnotacion: rawDate,
        rol: rolMatch ? rolMatch[1] : 'Por determinar',
        comuna: comunaMatch ? comunaMatch[1].trim() : 'Sin juzgado detectado',
        patente: patenteMatch ? patenteMatch[1].replace(/[\s\-]/g, '') : patente || '',
        monto: 'Según Registro',
      });
    }

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

    return NextResponse.json({
      ok: true,
      totalMultas: multas.length,
      comunas: comunasConCorreo,
      cobro: totalCobro,
      rutSolicitante,
      nombreSolicitante,
      patente,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[parse-multas]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
