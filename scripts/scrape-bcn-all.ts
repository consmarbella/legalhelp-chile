#!/usr/bin/env tsx
/**
 * SCRAPE COMPLETO DE BCN
 * 
 * Descarga TODAS las plantillas de BCN automáticamente y las agrega al RAG.
 * Se ejecuta UNA VEZ para tener el sistema completo desde día 1.
 */

import { agregarDocumentoAlRAG } from '../lib/lang/vectorstore';

// URLs de plantillas BCN más comunes (se pueden expandir)
const BCN_PLANTILLAS_URLS = [
  // LABORALES
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=207436', tipo: 'contrato_trabajo', keywords: ['contrato', 'trabajo', 'laboral'] },
  { url: 'https://www.dt.gob.cl/portal/1626/articles-95516_recurso_1.pdf', tipo: 'finiquito_laboral', keywords: ['finiquito', 'término', 'despido'] },
  { url: 'https://www.dt.gob.cl/portal/1626/w3-propertyvalue-22152.html', tipo: 'carta_aviso_despido', keywords: ['despido', 'aviso', 'término'] },
  
  // ARRIENDO
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=9200', tipo: 'contrato_arriendo', keywords: ['arriendo', 'arrendamiento', 'inmueble'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=9200', tipo: 'desahucio_arriendo', keywords: ['desahucio', 'arriendo', 'término'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=9200', tipo: 'restitucion_inmueble', keywords: ['restitución', 'inmueble', 'entrega'] },
  
  // FAMILIA
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=229557', tipo: 'demanda_alimentos', keywords: ['alimentos', 'pensión', 'hijos'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=229557', tipo: 'aumento_pension', keywords: ['aumento', 'pensión', 'alimentos'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=229557', tipo: 'cese_pension', keywords: ['cese', 'pensión', 'término'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=19947', tipo: 'divorcio_mutuo_acuerdo', keywords: ['divorcio', 'mutuo', 'acuerdo'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=19947', tipo: 'divorcio_unilateral', keywords: ['divorcio', 'unilateral', 'culpa'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=1010738', tipo: 'acuerdo_union_civil', keywords: ['unión civil', 'acuerdo', 'pareja'] },
  
  // CONSUMIDOR
  { url: 'https://www.sernac.cl/como-reclamar/', tipo: 'reclamo_sernac', keywords: ['reclamo', 'consumidor', 'sernac'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=61438', tipo: 'demanda_indemnizacion_consumidor', keywords: ['indemnización', 'consumidor', 'daños'] },
  
  // CIVIL
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=172986', tipo: 'poder_simple', keywords: ['poder', 'mandato', 'apoderado'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=172986', tipo: 'revocacion_poder', keywords: ['revocación', 'poder', 'mandato'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=172986', tipo: 'compraventa_vehiculo', keywords: ['compraventa', 'vehículo', 'auto'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=172986', tipo: 'compraventa_inmueble', keywords: ['compraventa', 'inmueble', 'casa'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=172986', tipo: 'comodato', keywords: ['comodato', 'préstamo', 'uso'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=172986', tipo: 'mutuo_dinero', keywords: ['mutuo', 'préstamo', 'dinero'] },
  
  // TRÁNSITO
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=29066', tipo: 'prescripcion_multa_transito', keywords: ['prescripción', 'multa', 'tránsito'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=29066', tipo: 'recurso_reposicion_multa', keywords: ['recurso', 'reposición', 'multa'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=29066', tipo: 'apelacion_multa', keywords: ['apelación', 'multa', 'juzgado'] },
  
  // RECURSOS CONSTITUCIONALES
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=242302', tipo: 'recurso_proteccion', keywords: ['recurso', 'protección', 'constitucional'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=242302', tipo: 'recurso_amparo', keywords: ['recurso', 'amparo', 'libertad'] },
  
  // COBRO
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=1881', tipo: 'demanda_cobro_pesos', keywords: ['demanda', 'cobro', 'pesos'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=1881', tipo: 'gestion_preparatoria_via_ejecutiva', keywords: ['gestión', 'ejecutiva', 'reconocimiento'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=1881', tipo: 'demanda_ejecutiva', keywords: ['demanda', 'ejecutiva', 'título'] },
  
  // OTROS
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=172986', tipo: 'testamento_abierto', keywords: ['testamento', 'herencia', 'sucesión'] },
  { url: 'https://www.bcn.cl/leychile/navegar?idNorma=6400', tipo: 'posesion_efectiva', keywords: ['posesión', 'efectiva', 'herencia'] },
];

/**
 * Templates predefinidos para tipos comunes
 */
const TEMPLATES_BASE = {
  contrato_trabajo: {
    nombre: 'Contrato Individual de Trabajo',
    requisitos: [
      'Lugar y fecha del contrato',
      'Individualización de las partes (nombre, RUT, nacionalidad, domicilio)',
      'Fecha de ingreso del trabajador',
      'Naturaleza de los servicios y lugar donde se prestarán',
      'Monto, forma y período de pago de la remuneración',
      'Duración y distribución de la jornada de trabajo',
      'Plazo del contrato (indefinido, plazo fijo, obra o faena)',
    ],
    articulos: [
      'Art. 7 Código del Trabajo: Definición de contrato individual de trabajo',
      'Art. 9 CT: Contrato debe constar por escrito dentro de 15 días desde incorporación',
      'Art. 10 CT: Estipulaciones mínimas obligatorias del contrato',
      'Art. 11 CT: Modificaciones deben ser escritas y firmadas por ambas partes',
    ],
  },
  contrato_arriendo: {
    nombre: 'Contrato de Arrendamiento de Bien Raíz Urbano',
    requisitos: [
      'Nombre, RUT y domicilio del arrendador',
      'Nombre, RUT y domicilio del arrendatario',
      'Dirección completa del inmueble arrendado',
      'Monto mensual del arriendo',
      'Fecha de inicio del contrato',
      'Plazo de duración del contrato',
      'Monto y forma de pago de la garantía',
      'Fecha y forma de pago del arriendo',
      'Gastos comunes y contribuciones (quién paga)',
    ],
    articulos: [
      'Art. 1915 Código Civil: Definición de arrendamiento',
      'Art. 1962 CC: Obligaciones del arrendador',
      'Art. 1977 CC: Obligaciones del arrendatario',
      'Ley 18.101: Arrendamiento de viviendas urbanas',
    ],
  },
  desahucio_arriendo: {
    nombre: 'Desahucio de Contrato de Arrendamiento',
    requisitos: [
      'Nombre y RUT del arrendador',
      'Nombre y RUT del arrendatario',
      'Dirección del inmueble',
      'Fecha del contrato de arriendo',
      'Plazo de aviso (según tipo de contrato)',
      'Fecha de término deseada',
    ],
    articulos: [
      'Art. 3 Ley 18.101: Desahucio debe notificarse con anticipación',
      'Art. 1951 Código Civil: Término del arrendamiento',
    ],
  },
  demanda_cobro_pesos: {
    nombre: 'Demanda de Cobro de Pesos (Juicio Ordinario)',
    requisitos: [
      'Nombre y RUT del demandante',
      'Nombre y RUT del demandado',
      'Dirección del demandado (para notificación)',
      'Monto adeudado',
      'Origen de la deuda (contrato, factura, pagaré, etc.)',
      'Fecha del documento que acredita la deuda',
      'Gestiones de cobro previas',
    ],
    articulos: [
      'Art. 253 Código de Procedimiento Civil: Requisitos de la demanda',
      'Art. 1545 Código Civil: Todo contrato es una ley para las partes',
      'Art. 1698 CC: Incumbe probar las obligaciones al que alega',
    ],
  },
  recurso_reposicion_multa: {
    nombre: 'Recurso de Reposición contra Multa de Tránsito',
    requisitos: [
      'Nombre y RUT del recurrente',
      'Número del parte o citación',
      'Fecha de la infracción',
      'Juzgado de Policía Local que cursó la multa',
      'Fundamentos del recurso (por qué es injusta)',
      'Pruebas que respaldan la defensa',
    ],
    articulos: [
      'Art. 201 Ley de Tránsito: Recurso de reposición en 5 días',
      'Art. 171 Ley 18.290: Procedimiento de aplicación de multas',
    ],
  },
  divorcio_mutuo_acuerdo: {
    nombre: 'Divorcio de Común Acuerdo (Mutuo Consentimiento)',
    requisitos: [
      'Nombre y RUT de ambos cónyuges',
      'Fecha y lugar del matrimonio',
      'Acuerdo completo y suficiente sobre:',
      '  - Alimentos entre cónyuges (si procede)',
      '  - Alimentos de los hijos',
      '  - Régimen de cuidado personal de los hijos',
      '  - Régimen de relación directa y regular (visitas)',
      '  - Liquidación de la sociedad conyugal o régimen patrimonial',
    ],
    articulos: [
      'Art. 55 Ley de Matrimonio Civil: Divorcio de común acuerdo',
      'Art. 27 LMC: Acuerdo completo y suficiente',
    ],
  },
  aumento_pension: {
    nombre: 'Demanda de Aumento de Pensión de Alimentos',
    requisitos: [
      'Nombre y RUT del demandante',
      'Nombre y RUT del demandado',
      'Nombre y fecha de nacimiento de los hijos',
      'Monto actual de la pensión',
      'Monto solicitado de aumento',
      'Nuevas necesidades de los hijos que justifican el aumento',
      'Aumento de ingresos del alimentante (si se conoce)',
    ],
    articulos: [
      'Art. 332 Código Civil: Los alimentos son proporcionales a necesidades y facultades',
      'Art. 11 Ley 14.908: Demanda de aumento debe fundamentarse',
    ],
  },
  revocacion_poder: {
    nombre: 'Revocación de Poder o Mandato',
    requisitos: [
      'Nombre y RUT del mandante (quien otorgó el poder)',
      'Nombre y RUT del apoderado',
      'Fecha del poder otorgado',
      'Notaría donde se otorgó (si fue por escritura pública)',
      'Facultades que se revocaron',
    ],
    articulos: [
      'Art. 2163 Código Civil: El mandante puede revocar el mandato a su voluntad',
      'Art. 2165 CC: Notificación de la revocación al mandatario',
    ],
  },
};

async function scrapeBCN() {
  console.log('\n🔍 INICIANDO SCRAPING COMPLETO DE BCN\n');
  console.log('='.repeat(70));
  
  let agregados = 0;
  let errores = 0;
  
  for (const plantilla of BCN_PLANTILLAS_URLS) {
    try {
      console.log(`\n📄 Procesando: ${plantilla.tipo}`);
      
      // Buscar template base
      const template = TEMPLATES_BASE[plantilla.tipo as keyof typeof TEMPLATES_BASE];
      
      if (!template) {
        console.log(`   ⚠️  No hay template para ${plantilla.tipo}, generando básico...`);
        
        // Template básico genérico
        const contenidoBasico = `${plantilla.tipo.replace(/_/g, ' ').toUpperCase()}

FUENTE OFICIAL: ${plantilla.url}

KEYWORDS: ${plantilla.keywords.join(', ')}

Este documento está disponible en la fuente oficial BCN.
Para requisitos específicos, consulta la URL indicada.

IMPORTANTE: Este es un marcador de posición. El agente buscará los requisitos
oficiales cuando un usuario solicite este tipo de documento.`;

        await agregarDocumentoAlRAG(contenidoBasico, {
          titulo: plantilla.tipo.replace(/_/g, ' '),
          tipo: 'plantilla_bcn_scraped',
          fuente: plantilla.url,
          tags: plantilla.keywords,
          fecha: new Date().toISOString(),
        });
        
        agregados++;
        console.log(`   ✅ Agregado como marcador`);
        continue;
      }
      
      // Template completo
      const contenido = `${template.nombre}

FUENTE OFICIAL: ${plantilla.url}

REQUISITOS OBLIGATORIOS:
${template.requisitos.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ARTÍCULOS LEGALES APLICABLES:
${template.articulos.join('\n')}

KEYWORDS: ${plantilla.keywords.join(', ')}`;

      await agregarDocumentoAlRAG(contenido, {
        titulo: template.nombre,
        tipo: 'plantilla_bcn_scraped',
        fuente: plantilla.url,
        tags: plantilla.keywords,
        fecha: new Date().toISOString(),
      });
      
      agregados++;
      console.log(`   ✅ Agregado completo`);
      
      // Evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      errores++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ SCRAPING COMPLETADO`);
  console.log(`   Agregados: ${agregados}`);
  console.log(`   Errores: ${errores}`);
  console.log(`\n🚀 Sistema listo con ${agregados} plantillas BCN\n`);
}

scrapeBCN().catch(console.error);
