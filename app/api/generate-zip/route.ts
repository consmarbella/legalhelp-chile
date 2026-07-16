import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ============================================================
// DICCIONARIO DE CORREOS JPL — DATOS PÚBLICOS MUNICIPALES
// ============================================================
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

// ============================================================
// ENDPOINT: GENERAR ESCRITOS POR JUZGADO
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const {
      comunas,
      rutSolicitante,
      nombreSolicitante,
      patente,
      domicilio,
      correoElectronico,
    } = await req.json();

    // Leer plantilla base (durante build Next.js copia /plantillas a process.cwd())
    const templatePath = path.join(process.cwd(), 'plantillas', 'jpl-prescripcion-tag.txt');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Plantilla base no encontrada' }, { status: 500 });
    }
    let template = fs.readFileSync(templatePath, 'utf-8');
    // Quitar línea de comentario de fuente (compatible ES2017+)
    template = template.replace(/^<!--[\s\S]*?-->\s*/, '').trim();

    const archivos: { nombre: string; contenido: string }[] = [];

    for (const c of comunas) {
      const primeraMulta = c.multas[0] || {};
      let doc = template
        .replace(/\{\{RUT_SOLICITANTE\}\}/g, rutSolicitante || '')
        .replace(/\{\{NOMBRE_COMPLETO_SOLICITANTE\}\}/g, nombreSolicitante || '')
        .replace(/\{\{PATENTE_VEHICULO\}\}/g, patente || '')
        .replace(/\{\{COMUNA_JUZGADO\}\}/g, c.nombre)
        .replace(/\{\{DOMICILIO_SOLICITANTE\}\}/g, domicilio || 'indicar domicilio')
        .replace(/\{\{COMUNA_SOLICITANTE\}\}/g, c.nombre)
        .replace(/\{\{CORREO_ELECTRONICO\}\}/g, correoElectronico || '')
        .replace(/\{\{ROL_CAUSA\}\}/g, primeraMulta.rol || 'Por determinar en tribunal')
        .replace(/\{\{FECHA_INFRACCION\}\}/g, primeraMulta.fechaInfraccion || '')
        .replace(/\{\{FECHA_ANOTACION_REGISTRO\}\}/g, primeraMulta.fechaAnotacion || '');

      if (c.multas.length > 1) {
        const lista = c.multas
          .map((m: { fechaInfraccion: string; rol: string }, i: number) =>
            `${i + 1}. Infracción del ${m.fechaInfraccion}, Rol ${m.rol}.`
          )
          .join('\n');
        doc += `\n\nADEMÁS, hago presente las siguientes multas adicionales en este juzgado:\n\n${lista}\n\nSolicito se declare la prescripción de todas ellas por las mismas razones de derecho.`;
      }

      archivos.push({
        nombre: `escrito-prescripcion-${c.nombre.toLowerCase().replace(/\s+/g, '-')}.txt`,
        contenido: doc,
      });
    }

    const instrucciones = comunas.map((c: { nombre: string; multas: unknown[] }) => ({
      juzgado: c.nombre,
      correo: getJplEmail(c.nombre),
      archivoNombre: `escrito-prescripcion-${c.nombre.toLowerCase().replace(/\s+/g, '-')}.txt`,
      asunto: `Solicitud de Prescripción de Multa de Tránsito - Patente ${patente}`,
    }));

    return NextResponse.json({ ok: true, archivos, instrucciones });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-zip]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
