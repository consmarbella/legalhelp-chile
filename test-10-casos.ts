/**
 * 10 PRUEBAS COMPLEJAS del agente LangGraph
 */

import { runAgent } from './lib/lang/graph';

interface TestCase {
  nombre: string;
  mensajes: string[];
  expectReady: boolean;
  expectDatos: string[]; // Campos que deben estar presentes
}

const CASOS: TestCase[] = [
  // 1. Finiquito estándar
  {
    nombre: '1. Finiquito laboral estándar',
    mensajes: [
      'Necesito un finiquito',
      'María Fernanda Rodríguez Pérez, RUT 18.234.567-K',
      'Trabajé en Supermercado Líder, cargo: cajera, sueldo $450.000, desde marzo 2021 hasta mayo 2026. Mi dirección es Calle Falsa 123, Santiago.'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'empleador', 'cargo', 'sueldo', 'fecha_inicio', 'fecha_termino']
  },

  // 2. Poder para cobrar finiquito
  {
    nombre: '2. Poder simple para cobrar finiquito',
    mensajes: [
      'Necesito poder para que mi hermano cobre mi finiquito',
      'Carlos Andrés Muñoz Silva, RUT 16.789.012-3, Avenida Providencia 1234, Providencia',
      'Ricardo Muñoz Silva, RUT 14.567.890-1'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'apoderado', 'direccion']
  },

  // 3. Reclamo SERNAC por producto defectuoso
  {
    nombre: '3. Reclamo SERNAC',
    mensajes: [
      'Quiero reclamar a Falabella por un refrigerador que no enfría',
      'Patricia González Rojas, RUT 15.345.678-9',
      'Compré un refrigerador marca Samsung el 15 de marzo de 2026, modelo RT38K5, por $450.000. A los 20 días dejó de enfriar. Llamé 5 veces al servicio técnico y nadie vino. Quiero devolución del dinero. Mi correo es p.rojas@gmail.com y vivo en Los Leones 234, Providencia'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'empresa', 'detalle_caso']
  },

  // 4. Despido injustificado con cotizaciones impagas
  {
    nombre: '4. Despido injustificado + cotizaciones impagas',
    mensajes: [
      'Me despidieron pero no me pagaron las cotizaciones de AFP los últimos 6 meses',
      'Jorge Luis Cáceres Díaz, RUT 17.456.789-0, vivo en Los Dominicos 11, Las Condes',
      'Empresa: Constructora Los Andes Ltda, RUT 76.234.567-8',
      'Cargo: maestro albañil, sueldo $890.000, trabajé desde enero 2020 hasta abril 2026',
      'Me despidieron por "necesidades de la empresa" pero creo que es injusto porque tengo buen desempeño'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'empleador', 'cargo', 'sueldo', 'fecha_inicio', 'fecha_termino']
  },

  // 5. Prescripción de multa TAG
  {
    nombre: '5. Prescripción multa TAG',
    mensajes: [
      'Tengo multas de TAG del 2019 que no he pagado',
      'Andrea Belén Fuentes Mora, RUT 19.123.456-7, vivo en Calle 3 número 56, Macul',
      'Patente BBXY12, las multas son de agosto 2019 por pasar sin TAG en Costanera Norte. Fue en el Juzgado de Policia Local de Providencia.'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'patente']
  },

  // 6. Demanda de alimentos
  {
    nombre: '6. Demanda de alimentos',
    mensajes: [
      'Necesito demandar al padre de mi hija por pensión alimenticia',
      'Carolina Paz Vásquez Torres, RUT 16.890.123-4, vivo en Los Nogales 22, La Florida',
      'El demandado es Roberto Andrés Soto Paredes, RUT 17.234.567-8, vive en Los Copihues 456, Maipú',
      'Mi hija se llama Sofía Soto Vásquez, nació el 12 de marzo de 2020. Necesita pañales, leche, jardín infantil, doctor. Él gana como $800.000 en una empresa de seguridad. Pido $250.000 mensuales'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'demandado', 'hijo']
  },

  // 7. Recurso de protección por corte de luz
  {
    nombre: '7. Recurso de protección - corte de luz',
    mensajes: [
      'Me cortaron la luz sin aviso y tengo un hijo con oxígeno domiciliario',
      'Marcela Ignacia Contreras Pizarro, RUT 15.890.123-4',
      'Enel me cortó el 20 de junio, llamé 3 veces y me dicen que fue error del sistema pero no reconectan. Mi hijo Tomás tiene fibrosis pulmonar y usa oxígeno 24/7. Vivo en Villa Los Almendros 78, Puente Alto. El derecho vulnerado es a la vida.'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'detalle_caso']
  },

  // 8. Carta de renuncia simple
  {
    nombre: '8. Carta de renuncia',
    mensajes: [
      'Necesito renunciar a mi trabajo',
      'Felipe Andrés Rojas Muñoz, RUT 18.567.890-1',
      'Trabajo en Restaurant El Buen Sabor como garzon desde febrero 2024'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'empresa']
  },

  // 9. Poder notarial para venta de auto
  {
    nombre: '9. Poder para vender vehículo',
    mensajes: [
      'Necesito poder para que mi primo venda mi auto porque estoy fuera de Chile',
      'Cristóbal Ignacio Pérez Vargas, RUT 19.234.567-K, Los Aromos 890, La Serena',
      'Mi primo es Javier Eduardo Vargas Muñoz, RUT 17.890.123-6. El auto es un Toyota Yaris 2018, patente HJKL34'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'apoderado']
  },

  // 10. Reclamo por servicio de internet deficiente
  {
    nombre: '10. Reclamo VTR por internet lento',
    mensajes: [
      'Contraté fibra óptica 400 megas con VTR pero la velocidad real es 20 megas',
      'Daniel Esteban Morales Castro, RUT 16.678.901-2, mi correo es dan@gmail.com, y vivo en Los Carrera 34, Concepción.',
      'Contraté el plan el 1 de abril 2026, número de cliente 12345678. Me dijeron "hasta 400 megas" pero los tests dan 20. Quiero que me cobren lo justo o me dejen cancelar el plan sin multa. Reclamo Sernac.'
    ],
    expectReady: true,
    expectDatos: ['nombre', 'rut', 'empresa', 'detalle_caso']
  }
];

async function ejecutarPrueba(caso: TestCase): Promise<boolean> {
  console.log(`\\n${'='.repeat(70)}`);
  console.log(`📋 ${caso.nombre}`);
  console.log('='.repeat(70));

  const history: Array<{ role: string; content: string }> = [];
  let result: any = {};

  for (let i = 0; i < caso.mensajes.length; i++) {
    const mensaje = caso.mensajes[i];
    console.log(`\\n👤 Turno ${i + 1}: ${mensaje.slice(0, 80)}${mensaje.length > 80 ? '...' : ''}`);
    
    try {
      result = await runAgent(mensaje, history, result);
      
      console.log(`🤖 Bot: ${result.response_message}`);
      console.log(`📊 Datos: ${Object.keys(result.datos_recopilados || {}).join(', ')}`);
      console.log(`✓ Ready: ${result.ready}`);

      history.push({ role: 'user', content: mensaje });
      history.push({ role: 'assistant', content: result.response_message });
    } catch (error) {
      console.error(`❌ Error en turno ${i + 1}:`, error);
      return false;
    }
  }

  // Validar resultado
  const success = result.ready === caso.expectReady;
  const datosPresentes = caso.expectDatos.every(campo => {
    const presente = result.datos_recopilados?.[campo] || result[campo];
    if (!presente) {
      console.log(`⚠️  Falta campo esperado: ${campo}`);
    }
    return presente;
  });

  if (success && datosPresentes) {
    console.log(`\\n✅ CASO PASÓ`);
    return true;
  } else {
    console.log(`\\n❌ CASO FALLÓ`);
    if (!success) console.log(`   - Ready esperado: ${caso.expectReady}, obtenido: ${result.ready}`);
    if (!datosPresentes) console.log(`   - Faltan datos esperados`);
    return false;
  }
}

async function main() {
  console.log('\\n🧪 EJECUTANDO 10 PRUEBAS COMPLEJAS DEL AGENTE LANGGRAPH\\n');
  
  let pasadas = 0;
  let falladas = 0;

  for (const caso of CASOS) {
    const resultado = await ejecutarPrueba(caso);
    if (resultado) {
      pasadas++;
    } else {
      falladas++;
    }
  }

  console.log('\\n' + '='.repeat(70));
  console.log('📊 RESUMEN FINAL');
  console.log('='.repeat(70));
  console.log(`✅ Pruebas pasadas: ${pasadas}/${CASOS.length}`);
  console.log(`❌ Pruebas falladas: ${falladas}/${CASOS.length}`);
  console.log(`📈 Tasa de éxito: ${Math.round((pasadas / CASOS.length) * 100)}%`);
  
  if (falladas === 0) {
    console.log('\\n🎉 ¡TODAS LAS PRUEBAS PASARON!\\n');
  } else {
    console.log(`\\n⚠️  ${falladas} pruebas necesitan revisión\\n`);
  }

  process.exit(falladas > 0 ? 1 : 0);
}

main();
