// ─────────────────────────────────────────────────────────────────────────────
// HARNESS DE EVALUACIÓN — matching de plantillas (local, sin API key).
// Corre una batería de casos realistas por findTemplate y verifica que elija
// la plantilla correcta. Tambien chequea coherencia de formato (los documentos
// no judiciales no deben usar formato de escrito judicial "RUEGO A US.").
//
// Uso:  npx tsx scripts/eval-matching.ts
// Sale con codigo 1 si hay fallos (sirve para CI / bucle de autocorreccion).
// ─────────────────────────────────────────────────────────────────────────────
import { findTemplate, TEMPLATES, type LegalTemplate } from '../lib/templates';

interface Caso {
  q: string;          // tipo_documento / intencion (lo que el chat detecta)
  hechos?: string;    // contexto adicional
  espera: string[];   // alguno de estos substrings debe estar en el titulo elegido
  nota?: string;
}

const CASOS: Caso[] = [
  // Laboral
  { q: 'finiquito', hechos: 'fin de obra', espera: ['Finiquito laboral'] },
  { q: 'necesito un finiquito', hechos: 'termino de contrato', espera: ['Finiquito laboral'] },
  { q: 'cobro de finiquito', hechos: 'no me pagaron el finiquito', espera: ['Cobro de finiquito'] },
  { q: 'reclamar finiquito', hechos: 'la empresa me debe el finiquito', espera: ['Cobro de finiquito'] },
  { q: 'demanda por despido injustificado', hechos: 'me echaron sin causa', espera: ['despido injustificado'] },
  { q: 'no pago de cotizaciones', hechos: 'mi empleador no pago mis cotizaciones', espera: ['cotizaciones'] },
  { q: 'tutela laboral', hechos: 'vulneracion de derechos fundamentales en el trabajo', espera: ['tutela'] },
  { q: 'carta de renuncia', hechos: 'quiero renunciar a mi trabajo', espera: ['renuncia', 'notificación de término', 'Finiquito'] , nota: 'sin plantilla propia de renuncia' },

  // Familia
  { q: 'demanda de alimentos', hechos: 'pension para mis hijos', espera: ['Pensión Alimenticia', 'alimentos'] },
  { q: 'pension alimenticia', hechos: 'para mis hijos', espera: ['Pensión Alimenticia'] },
  { q: 'demanda de divorcio de mutuo acuerdo', hechos: 'ambos queremos divorciarnos', espera: ['mutuo acuerdo'] },
  { q: 'demanda de divorcio', hechos: 'llevamos 3 años separados', espera: ['divorcio'] },
  { q: 'denuncia violencia intrafamiliar', hechos: 'mi pareja me agrede', espera: ['Violencia Intrafamiliar'] },
  { q: 'regimen de visitas', hechos: 'quiero ver a mis hijos', espera: ['visitas', 'relación directa'] },
  { q: 'autorizacion salida del pais de menor', hechos: 'viajar con mi hijo', espera: ['salida del país'] },

  // Deudas / civil
  { q: 'prescripcion deuda TAG', hechos: 'autopista', espera: ['TAG'] },
  { q: 'prescripcion deuda bancaria', hechos: 'banco me cobra hace 7 años', espera: ['deuda general'] },
  { q: 'demanda cobro de dinero', hechos: 'me deben plata por un prestamo', espera: ['cobro de dinero'] },
  { q: 'cobro de cheque', hechos: 'me dieron un cheque sin fondos', espera: ['cheque'] },
  { q: 'alzamiento de embargo sobre vehiculo', hechos: 'pague la deuda quiero levantar el embargo de mi auto', espera: ['alzamiento de embargo'] },
  { q: 'renegociacion de deudas', hechos: 'no puedo pagar mis deudas', espera: ['renegociación', 'Reorganización'] },

  // Arriendo
  { q: 'demanda de desalojo por no pago', hechos: 'arrendatario no paga arriendo', espera: ['terminación arriendo por no pago'] },
  { q: 'devolucion de garantia de arriendo', hechos: 'no me devolvieron el mes de garantia', espera: ['devolución de garantía'] },
  { q: 'desahucio', hechos: 'quiero terminar el contrato de arriendo', espera: ['desahucio', 'término de contrato de arrendamiento'] },

  // Consumidor / servicios
  { q: 'reclamo isapre', hechos: 'me subieron el plan superintendencia salud', espera: ['ISAPRE'] },
  { q: 'reclamo sernac', hechos: 'producto defectuoso garantia', espera: ['SERNAC', 'garantía'] },
  { q: 'reclamo telecomunicaciones', hechos: 'movistar me corto internet', espera: ['SUBTEL'] },
  { q: 'reclamo agua', hechos: 'problema con la empresa de agua alcantarillado', espera: ['agua', 'SISS', 'servicios básicos'] },
  { q: 'reclamo cmf banco', hechos: 'cobros bancarios irregulares', espera: ['CMF'] },
  { q: 'reclamo seguro', hechos: 'la aseguradora no me pago el seguro', espera: ['seguro'] },

  // Penal / admin
  { q: 'querella por amenazas', hechos: 'me amenazaron de muerte', espera: ['amenazas', 'Querella'] },
  { q: 'recurso de proteccion', hechos: 'vulneracion de derechos', espera: ['protección'] },
  { q: 'reclamo multa de transito', hechos: 'juzgado de policia local', espera: ['multa de tránsito', 'reposición', 'Policía Local'] , nota: 'ambiguo JPL' },
  { q: 'declaracion jurada de ingresos', hechos: 'declaro mis ingresos', espera: ['Declaración jurada'] },
  { q: 'denuncia contraloria', hechos: 'irregularidades en la municipalidad', espera: ['Contraloría'] },
  { q: 'acuerdo de union civil', hechos: 'formalizar con mi pareja', espera: ['Unión Civil'] },
  { q: 'poder simple', hechos: 'autorizo a mi hermano a un tramite', espera: ['Poder'] },
  { q: 'no discriminacion zamudio', hechos: 'me discriminaron arbitrariamente', espera: ['Discriminación', 'Zamudio'] },
];

function run() {
  let pass = 0;
  const fails: string[] = [];

  for (const c of CASOS) {
    const t = findTemplate(c.q, `${c.q} ${c.hechos ?? ''}`);
    const titulo = t?.titulo ?? '(SIN PLANTILLA)';
    const ok = c.espera.some(e => titulo.toLowerCase().includes(e.toLowerCase()));
    if (ok) { pass++; }
    else {
      fails.push(`✗ "${c.q}" => "${titulo}"  | esperaba: ${c.espera.join(' | ')}${c.nota ? '  ('+c.nota+')' : ''}`);
    }
  }

  // Coherencia de formato: los no-judiciales no deben traer "RUEGO A US." en el esqueleto
  const formatoMal: string[] = [];
  for (const t of TEMPLATES) {
    if (t.tipo !== 'judicial' && t.tipo !== 'recurso' && /RUEGO A US|EN LO PRINCIPAL/i.test(t.esqueleto)) {
      formatoMal.push(`⚠ formato judicial en "${t.titulo}" [${t.tipo}]`);
    }
  }

  console.log(`\n=== MATCHING: ${pass}/${CASOS.length} OK ===`);
  if (fails.length) { console.log('\nFALLOS:'); fails.forEach(f => console.log('  ' + f)); }
  if (formatoMal.length) { console.log('\nFORMATO:'); formatoMal.forEach(f => console.log('  ' + f)); }

  // Cobertura del sitemap
  // (se reporta aparte en eval-coverage)
  const exit = fails.length === 0 && formatoMal.length === 0 ? 0 : 1;
  console.log(`\nResultado: ${exit === 0 ? 'TODO OK' : 'HAY FALLOS'}`);
  process.exit(exit);
}

run();
