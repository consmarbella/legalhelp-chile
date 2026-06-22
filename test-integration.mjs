// Integration test script - v2 with smart response logic
const CHAT_URL = 'https://legalhelp.cl/api/chat';
const GENERATE_URL = 'https://legalhelp.cl/api/generate-final';
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function chatCall(message, caseHistory, currentCaseData) {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, caseHistory, currentCaseData })
  });
  if (!res.ok) throw new Error(`Chat ${res.status}: ${await res.text()}`);
  return res.json();
}

async function generateCall(caseData) {
  const res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(caseData)
  });
  if (!res.ok) throw new Error(`Generate ${res.status}: ${await res.text()}`);
  return res.json();
}

// Each test case has a sequence of responses. The script sends them in order.
// The first message is always the initial description.
// Subsequent messages respond to whatever the bot asks, giving ALL info upfront.
const TEST_CASES = [
  {
    id: 1, name: 'Prescripcion deuda TAG',
    messages: [
      'Hola, tengo deudas de TAG del 2019 que quiero prescribir porque ya pasaron mas de 3 anios sin cobro judicial.',
      'Mi nombre es Maria Gonzalez Torres, RUT 15.432.876-5, domiciliada en Av. Providencia 1234, depto 502, Providencia, Santiago. Las multas de TAG son de enero a junio de 2019, en la comuna de Las Condes, patente GHKL-45. Nunca me notificaron judicialmente.',
      'La patente es GHKL-45, las infracciones fueron registradas en el Juzgado de Policia Local de Las Condes. Son 5 infracciones por un total de $450.000.',
      'Confirmo: Maria Gonzalez Torres, RUT 15.432.876-5, patente GHKL-45, multas TAG enero-junio 2019, JPL Las Condes, monto total $450.000. Sin notificacion judicial.',
      'Si, esos son todos los datos. Patente GHKL-45, JPL de Las Condes.',
      'GHKL-45'
    ]
  },
  {
    id: 2, name: 'Carta reclamo SERNAC (cobro indebido)',
    messages: [
      'Necesito un reclamo al SERNAC porque el Banco Santander me cobro $89.000 de comision indebida en mi cuenta corriente el mes pasado.',
      'Soy Pedro Soto Ramirez, RUT 18.765.432-1, domiciliado en Los Leones 567, Providencia, Santiago. El cobro indebido fue el 15 de noviembre de 2024, por $89.000 en comision por un servicio que nunca contrate.',
      'Si, llame al banco 3 veces y no me devolvieron el dinero. Me dicen que es una comision por seguro de desgravamen que yo nunca autorice. Mi numero de cuenta es 00-123-45678-90.',
      'Confirmo todos los datos. Pedro Soto Ramirez, RUT 18.765.432-1, Banco Santander, cobro indebido $89.000, 15 noviembre 2024.',
      'Si, esos son todos los datos correctos.',
      'Exacto, todo correcto.'
    ]
  },
  {
    id: 3, name: 'Finiquito laboral',
    messages: [
      'Necesito redactar un finiquito laboral por mutuo acuerdo. Llevo 3 anios en la empresa.',
      'Mi nombre es Carolina Munoz Vega, RUT 16.543.210-8, domiciliada en Manuel Montt 890, Nunoa, Santiago. Trabajaba como analista contable en Constructora Echeverria Ltda., RUT 76.543.210-K, Av. Apoquindo 4500, Las Condes. Ingrese el 1 de marzo de 2021, sueldo $1.200.000. Terminamos por mutuo acuerdo el 30 de noviembre de 2024. Me deben 8 dias de vacaciones proporcionales.',
      'Mi cargo era analista contable. El representante legal de la empresa es Juan Carlos Echeverria Soto, RUT 10.234.567-8, gerente general.',
      'Si, confirmo todo. Causal: mutuo acuerdo articulo 159 N1 del Codigo del Trabajo. Fecha termino: 30 noviembre 2024.',
      'Correcto, esos son todos los datos.',
      'Si, todo bien.'
    ]
  },
  {
    id: 4, name: 'Despido injustificado',
    messages: [
      'Me despidieron sin justificacion despues de 5 anios. Quiero demandar.',
      'Soy Roberto Fernandez Diaz, RUT 14.876.543-2, domiciliado en Av. Matta 2345, Santiago Centro. Trabajaba como bodeguero en Supermercados Lider, RUT 96.874.030-K, Av. Del Valle 725, Huechuraba. Ingrese en octubre 2019, me despidieron el 20 de octubre 2024. Sueldo $980.000. Me invocaron necesidades de la empresa pero contrataron a otra persona en mi puesto.',
      'Mi cargo era bodeguero. La carta de despido dice articulo 161 necesidades de la empresa, pero es falso porque contrataron un reemplazante la semana siguiente. Mi jornada era lunes a sabado de 8:00 a 17:00.',
      'Confirmo: Roberto Fernandez Diaz, RUT 14.876.543-2, bodeguero, Supermercados Lider, 5 anios, sueldo $980.000, despido injustificado 20 octubre 2024.',
      'Si, todos los datos estan correctos.',
      'Correcto.'
    ]
  },
  {
    id: 5, name: 'Prescripcion deuda bancaria',
    messages: [
      'Tengo una deuda de tarjeta de credito del 2017 con el Banco de Chile que nunca me demandaron. Quiero alegar prescripcion.',
      'Soy Ana Lucia Herrera Pinto, RUT 17.234.567-3, domiciliada en Condell 1456, Valparaiso. La deuda es de septiembre de 2017 por $2.300.000 con intereses de tarjeta de credito Banco de Chile. Nunca me notificaron demanda judicial, solo cobranza extrajudicial telefonica.',
      'No he firmado ningun reconocimiento de deuda ni pagare. La ultima cuota que pague fue en agosto de 2017. Desde entonces solo me llaman empresas de cobranza pero nunca un tribunal.',
      'Confirmo todos los datos. Ana Lucia Herrera Pinto, RUT 17.234.567-3, deuda Banco de Chile septiembre 2017, $2.300.000, sin cobro judicial.',
      'Si, eso es todo.',
      'Correcto.'
    ]
  },
  {
    id: 6, name: 'Carta reclamo isapre',
    messages: [
      'Mi isapre Colmena me nego cobertura para una cirugia de desviacion de tabique nasal que es medicamente necesaria. Quiero reclamar.',
      'Soy Francisca Rojas Contreras, RUT 19.876.543-0, domiciliada en Av. Libertador Bernardo OHiggins 3456, Santiago Centro. Isapre Colmena me nego cobertura el 5 de noviembre 2024 para septoplastia (correccion desviacion tabique nasal). La cirugia vale $4.500.000. Mi medico es Dr. Alejandro Bustos Marin, otorrinolaringologo del Hospital Clinico UC.',
      'El Dr. Bustos certifico que es una cirugia funcional necesaria porque no puedo respirar bien por la noche, tengo apnea del sueno diagnosticada. Colmena dice que es estetica pero es funcional. Tengo todos los examenes y certificados medicos.',
      'Confirmo: Francisca Rojas Contreras, RUT 19.876.543-0, Isapre Colmena, septoplastia funcional, $4.500.000, Dr. Bustos, negada 5 noviembre 2024.',
      'Si, todo correcto.',
      'Exacto.'
    ]
  },
  {
    id: 7, name: 'Contrato arriendo departamento',
    messages: [
      'Necesito un contrato de arriendo. Voy a arrendar mi departamento en Nunoa.',
      'Soy el arrendador: Jorge Andres Villalobos Mena, RUT 13.654.321-9, domiciliado en Av. Irarrazazaval 2567, depto 803, Nunoa, Santiago. El arrendatario es Luis Alberto Paredes Soto, RUT 20.123.456-7, domiciliado actualmente en Av. Matta 456, Santiago Centro. Arriendo mensual $550.000, garantia un mes ($550.000), plazo 12 meses desde el 1 de enero 2025.',
      'El departamento es de 2 dormitorios, 1 bano, estacionamiento incluido. No se permiten mascotas. Los gastos comunes los paga el arrendatario. El departamento se entrega amoblado con cocina equipada.',
      'Confirmo todos los datos. Arrendador: Jorge Villalobos, RUT 13.654.321-9. Arrendatario: Luis Paredes, RUT 20.123.456-7. Propiedad: Irarrazazaval 2567, depto 803, Nunoa. $550.000/mes, 12 meses.',
      'Si, correcto.',
      'Todo bien.'
    ]
  },
  {
    id: 8, name: 'Poder simple notarial',
    messages: [
      'Necesito un poder simple para autorizar a mi hermano a retirar una herencia en el banco.',
      'Soy Claudia Beatriz Sandoval Reyes, RUT 16.789.012-4, domiciliada en Pasaje Los Aromos 234, La Florida, Santiago. Autorizo a mi hermano Andres Felipe Sandoval Reyes, RUT 17.890.123-5, domiciliado en Av. Walker Martinez 1234, La Florida, para retirar fondos de cuenta de ahorro heredada de nuestra madre en BancoEstado, sucursal La Florida.',
      'La cuenta es de ahorro a nombre de nuestra madre fallecida Rosa Elena Reyes Vergara. Ya tenemos la posesion efectiva tramitada. El monto a retirar es de $8.500.000.',
      'Confirmo: poderdante Claudia Sandoval RUT 16.789.012-4, apoderado Andres Sandoval RUT 17.890.123-5, retiro herencia BancoEstado La Florida.',
      'Si, todo correcto.',
      'Exacto.'
    ]
  },
  {
    id: 9, name: 'Recurso de proteccion',
    messages: [
      'Mi empleador me rebajo el sueldo ilegalmente de $1.500.000 a $900.000 sin mi consentimiento. Quiero recurso de proteccion.',
      'Soy Diego Alejandro Castro Fuentes, RUT 15.123.456-7, domiciliado en Av. Grecia 4567, Nunoa, Santiago. Mi empleador es Empresa de Transportes Cruz del Sur S.A., RUT 96.756.430-1, ubicada en Av. Alameda 5678, Santiago Centro. Me rebajaron el sueldo en la liquidacion de octubre 2024 de $1.500.000 a $900.000 sin ningun anexo firmado ni aviso previo.',
      'No firme ningun anexo de contrato. Mi cargo es conductor de bus interurbano. Llevo 8 anios en la empresa. El representante legal es Marcos Perez Gonzalez, gerente general.',
      'Confirmo: Diego Castro RUT 15.123.456-7, Cruz del Sur RUT 96.756.430-1, rebaja de $1.500.000 a $900.000, octubre 2024, sin consentimiento.',
      'Si, correcto.',
      'Todo bien.'
    ]
  },
  {
    id: 10, name: 'Demanda de alimentos',
    messages: [
      'Necesito demandar al papa de mi hijo por pension de alimentos. Se fue hace 6 meses y no aporta nada.',
      'Soy Valentina Isabel Morales Espinoza, RUT 19.345.678-2, domiciliada en Calle Arturo Prat 890, Concepcion. El padre es Cristian Andres Lopez Vargas, RUT 18.456.789-3, domiciliado en Av. Colon 567, Concepcion. Trabaja en Celulosa Arauco como operador de maquinas, gana aproximadamente $1.800.000 mensuales. Nuestro hijo es Matias Lopez Morales, de 4 anios de edad, nacido el 15 de marzo de 2020.',
      'Pido $350.000 mensuales de pension. El nino va a jardin infantil privado ($120.000/mes), necesita alimentacion, vestimenta y salud. Tengo certificado de nacimiento que acredita la paternidad. Cristian se fue de la casa en mayo de 2024.',
      'Confirmo: demandante Valentina Morales RUT 19.345.678-2, demandado Cristian Lopez RUT 18.456.789-3, hijo Matias 4 anios, pension solicitada $350.000.',
      'Si, todos los datos correctos.',
      'Correcto.'
    ]
  },
  {
    id: 11, name: 'Carta cobranza deuda',
    messages: [
      'Necesito una carta de cobranza. Un cliente me debe $2.500.000 por remodelacion.',
      'Soy Hector Mauricio Bravo Saavedra, RUT 14.567.890-6, domiciliado en Av. Vicuna Mackenna 3456, San Joaquin, Santiago. El deudor es Fernando Enrique Tapia Munoz, RUT 16.234.567-8, domiciliado en Av. Departamental 789, La Florida, Santiago. Me debe $2.500.000 por trabajos de remodelacion de bano y cocina que termine en julio de 2024. El plazo de pago vencio en agosto 2024.',
      'Tengo boletas de honorarios emitidas N 456, 457 y 458, y un presupuesto firmado por el con fecha marzo 2024. Le doy 10 dias para pagar antes de iniciar acciones legales.',
      'Confirmo: acreedor Hector Bravo RUT 14.567.890-6, deudor Fernando Tapia RUT 16.234.567-8, monto $2.500.000, plazo vencido agosto 2024.',
      'Si, todo correcto.',
      'Exacto.'
    ]
  },
  {
    id: 12, name: 'Declaracion jurada simple',
    messages: [
      'Necesito una declaracion jurada simple declarando que no tengo antecedentes penales para un trabajo nuevo.',
      'Mi nombre es Camila Andrea Nunez Olivares, RUT 20.123.456-9, domiciliada en Calle Caupolican 567, Temuco. Declaro bajo juramento que no tengo antecedentes penales vigentes ni condenas pendientes. La declaracion es para presentar a mi nuevo empleador.',
      'La necesito con fecha de hoy. Es para postular al cargo de asistente administrativa en la Municipalidad de Temuco.',
      'Confirmo: Camila Nunez Olivares, RUT 20.123.456-9, Caupolican 567 Temuco, declaro no tener antecedentes penales.',
      'Si, correcto.',
      'Todo bien.'
    ]
  },
  {
    id: 13, name: 'Denuncia ruidos molestos',
    messages: [
      'Quiero hacer una denuncia por ruidos molestos. Mi vecino del piso de arriba hace fiestas cada fin de semana hasta las 5am.',
      'Soy Patricia Elena Vargas Cifuentes, RUT 15.890.123-4, domiciliada en Av. Pedro de Valdivia 2345, depto 301, Providencia, Santiago. El denunciado es el ocupante del departamento 401 del mismo edificio (no conozco su nombre, pero el conserje tiene sus datos). Las fiestas son todos los viernes y sabados desde hace 3 meses, con musica a todo volumen hasta las 4-5 de la manana.',
      'He reclamado al conserje y a la administracion del edificio sin resultado. Tengo 5 videos grabados con el ruido excesivo. Los vecinos del 302 y 303 tambien se quejan. La primera fiesta que registre fue el viernes 6 de septiembre de 2024.',
      'Confirmo: Patricia Vargas RUT 15.890.123-4, depto 301, denuncio al depto 401, ruidos fines de semana desde septiembre 2024, tengo evidencia.',
      'Si, correcto.',
      'Todo bien.'
    ]
  },
  {
    id: 14, name: 'Carta termino contrato arriendo',
    messages: [
      'Soy arrendatario y quiero terminar mi contrato de arriendo con 60 dias de anticipacion.',
      'Mi nombre es Sebastian Ignacio Pena Gutierrez, RUT 18.234.567-0, domiciliado en Av. Italia 1234, depto 605, Providencia, Santiago. La propietaria es Carmen Gloria Fuentes Vidal, RUT 12.345.678-9, domiciliada en Av. Apoquindo 3456, Las Condes. Pago $480.000 de arriendo mensual. Quiero desocupar el 28 de febrero de 2025.',
      'El contrato es de plazo indefinido con clausula de aviso de 60 dias. Me voy porque compre un departamento propio. Estoy al dia con todos los pagos y el departamento esta en perfecto estado.',
      'Confirmo: arrendatario Sebastian Pena RUT 18.234.567-0, arrendadora Carmen Fuentes RUT 12.345.678-9, termino 28 febrero 2025, Av. Italia 1234 depto 605.',
      'Si, todo correcto.',
      'Exacto.'
    ]
  },
  {
    id: 15, name: 'Prescripcion multas transito',
    messages: [
      'Tengo multas de transito del 2020 de fotorradar que nunca me cobraron judicialmente. Quiero prescripcion.',
      'Soy Gonzalo Patricio Aravena Contreras, RUT 16.456.789-1, domiciliado en Los Militares 5678, Las Condes, Santiago. Las multas son de marzo y abril de 2020, en la Ruta 5 Sur a la altura de Rancagua. Son 3 multas por exceso de velocidad (fotorradar), total $280.000. Patente del vehiculo: BCDF-12. Nunca me notificaron judicialmente.',
      'Las multas corresponden al Juzgado de Policia Local de Rancagua. Mi vehiculo es un Hyundai Tucson 2018, patente BCDF-12.',
      'Confirmo: Gonzalo Aravena RUT 16.456.789-1, patente BCDF-12, 3 multas marzo-abril 2020, JPL Rancagua, $280.000 total, sin cobro judicial.',
      'Si, correcto.',
      'Todo bien.'
    ]
  },
  {
    id: 16, name: 'Reclamo telecomunicaciones',
    messages: [
      'Quiero reclamar contra Movistar, me estan cobrando $45.000 por un plan que yo no contrate, mi plan es de $25.000.',
      'Soy Lorena del Carmen Jara Pizarro, RUT 17.654.321-5, domiciliada en Calle OHiggins 456, Rancagua. Movistar me subio el plan de $25.000 (50GB) a uno de $45.000 sin mi autorizacion desde septiembre de 2024. Van 3 meses de cobro indebido, total $60.000 de mas. Llame 3 veces al 800 y no me solucionan.',
      'No firme ningun cambio de plan ni autorice por telefono. Mi numero de celular es +56 9 8765 4321. Quiero la devolucion de los $60.000 cobrados de mas y volver a mi plan original.',
      'Confirmo: Lorena Jara RUT 17.654.321-5, Movistar, cobro indebido $20.000/mes desde septiembre 2024, total $60.000, sin autorizacion de cambio de plan.',
      'Si, correcto.',
      'Todo bien.'
    ]
  },
  {
    id: 17, name: 'Contrato trabajo indefinido',
    messages: [
      'Necesito un contrato de trabajo indefinido para contratar a un vendedor en mi negocio.',
      'Soy el empleador: Ricardo Antonio Medina Salazar, RUT 13.234.567-K, empresa Comercial Medina SpA, RUT 77.890.123-4, ubicada en Av. Macul 4567, Macul, Santiago. El trabajador a contratar es Juan Pablo Torres Diaz, RUT 21.345.678-6, domiciliado en Calle Los Olivos 890, La Cisterna, Santiago. Cargo: vendedor de tienda. Sueldo $650.000 mensuales. Jornada completa lunes a viernes 9:00 a 18:00. Inicio: 2 de enero 2025.',
      'El contrato es indefinido con periodo de prueba legal. Funciones: atencion de clientes, manejo de caja, reposicion de productos. Beneficios: colacion incluida, uniforme proporcionado por la empresa.',
      'Confirmo: empleador Comercial Medina SpA RUT 77.890.123-4, trabajador Juan Pablo Torres RUT 21.345.678-6, vendedor, $650.000, jornada completa, inicio 2 enero 2025.',
      'Si, todo correcto.',
      'Exacto.'
    ]
  },
  {
    id: 18, name: 'Acuerdo pago deuda',
    messages: [
      'Necesito un acuerdo de pago para una deuda de $3.000.000 que pagare en 6 cuotas.',
      'Soy el deudor: Felipe Andres Garrido Valenzuela, RUT 19.012.345-6, domiciliado en Calle Balmaceda 1234, Vina del Mar. El acreedor es Mario Esteban Rojas Perez, RUT 15.678.901-2, domiciliado en Av. San Martin 567, Vina del Mar. La deuda es de $3.000.000 por un prestamo personal de junio 2024. Pagare en 6 cuotas mensuales de $500.000, primera cuota el 15 de enero de 2025.',
      'Si no pago una cuota, se hace exigible el total. Los pagos seran por transferencia bancaria a la cuenta del acreedor. No hay intereses pactados.',
      'Confirmo: deudor Felipe Garrido RUT 19.012.345-6, acreedor Mario Rojas RUT 15.678.901-2, $3.000.000 en 6 cuotas de $500.000 desde 15 enero 2025.',
      'Si, correcto.',
      'Todo bien.'
    ]
  },
  {
    id: 19, name: 'Carta renuncia voluntaria',
    messages: [
      'Necesito redactar mi carta de renuncia voluntaria al trabajo.',
      'Soy Javiera Paz Ortiz Leiva, RUT 20.456.789-8, domiciliada en Av. La Dehesa 2345, Lo Barnechea, Santiago. Trabajo en Falabella Retail S.A. como supervisora de ventas desde hace 2 anios. Mi jefe directo es Carlos Mendez, gerente de tienda. Quiero que mi ultimo dia sea el 31 de diciembre de 2024.',
      'Renuncio por motivos personales (encontre mejor oportunidad). Agradezco la experiencia laboral. Estoy disponible para hacer entrega de funciones durante el periodo de aviso.',
      'Confirmo: Javiera Ortiz RUT 20.456.789-8, supervisora de ventas, Falabella Retail S.A., ultimo dia 31 diciembre 2024.',
      'Si, todo correcto.',
      'Exacto.'
    ]
  },
  {
    id: 20, name: 'Eliminacion antecedentes penales',
    messages: [
      'Quiero pedir eliminacion de antecedentes penales. Tuve condena hace mas de 10 anios por delito menor y ya cumpli la pena.',
      'Soy Marcos Eduardo Reyes Gallardo, RUT 14.321.098-7, domiciliado en Calle Freire 890, Puerto Montt. La condena fue en 2012 en el Juzgado de Garantia de Puerto Montt, causa RIT 1234-2012, por manejo en estado de ebriedad. La pena fue multa de 5 UTM y suspension de licencia por 6 meses, que cumpli integramente en 2012.',
      'Desde 2012 no he tenido ningun otro problema con la justicia. Ya pasaron mas de 10 anios. Necesito eliminar los antecedentes para postular a un trabajo en una empresa de transporte.',
      'Confirmo: Marcos Reyes RUT 14.321.098-7, condena 2012, manejo ebriedad, multa 5 UTM cumplida, Juzgado Garantia Puerto Montt, sin reincidencia 10+ anios.',
      'Si, correcto.',
      'Todo bien.'
    ]
  }
];

async function runTest(testCase) {
  console.log(`\n--- Test ${testCase.id}: ${testCase.name} ---`);
  let caseHistory = [];
  let currentCaseData = {};
  let messageCount = 0;
  let ready = false;
  let askedEmail = false;
  let askedPhone = false;
  let msgIdx = 0;

  try {
    while (!ready && messageCount < 8 && msgIdx < testCase.messages.length) {
      if (messageCount > 0) await sleep(2500);
      messageCount++;
      const userMsg = testCase.messages[msgIdx];
      msgIdx++;
      console.log(`  [User ${messageCount}]: ${userMsg.substring(0, 80)}...`);

      const response = await chatCall(userMsg, caseHistory, currentCaseData);
      caseHistory.push({ role: 'user', content: userMsg });
      caseHistory.push({ role: 'assistant', content: response.response_message || '' });

      const { response_message, ...caseFields } = response;
      currentCaseData = { ...currentCaseData, ...caseFields };
      ready = response.ready === true;

      const botMsg = response_message || '';
      console.log(`  [Bot ${messageCount}]: ${botMsg.substring(0, 120)}...`);

      if (botMsg.toLowerCase().includes('correo') || botMsg.toLowerCase().includes('email')) askedEmail = true;
      if (botMsg.toLowerCase().includes('telefono') || botMsg.toLowerCase().includes('celular')) askedPhone = true;
    }

    // If still not ready and we ran out of prepared messages, send a catch-all
    while (!ready && messageCount < 8) {
      await sleep(2500);
      messageCount++;
      const fallback = `Ya le di todos los datos necesarios. Por favor proceda a generar el documento con la informacion proporcionada.`;
      console.log(`  [User ${messageCount}]: ${fallback.substring(0, 80)}...`);

      const response = await chatCall(fallback, caseHistory, currentCaseData);
      caseHistory.push({ role: 'user', content: fallback });
      caseHistory.push({ role: 'assistant', content: response.response_message || '' });

      const { response_message, ...caseFields } = response;
      currentCaseData = { ...currentCaseData, ...caseFields };
      ready = response.ready === true;

      console.log(`  [Bot ${messageCount}]: ${(response_message || '').substring(0, 120)}...`);
    }

    let docGenerated = false;
    let docLength = 0;
    if (ready) {
      await sleep(2000);
      console.log(`  Calling generate-final...`);
      const genResult = await generateCall(currentCaseData);
      docGenerated = !!(genResult.document && genResult.document.length > 200);
      docLength = genResult.document ? genResult.document.length : 0;
      console.log(`  Document length: ${docLength}, preview: ${genResult.preview}`);
    }

    const pass = ready && messageCount <= 6 && docGenerated;
    console.log(`  RESULT: ${pass ? 'PASS' : 'FAIL'} (${messageCount} msgs, ready=${ready}, doc=${docGenerated}, len=${docLength})`);
    return { id: testCase.id, name: testCase.name, pass, messageCount, ready, docGenerated, docLength, askedEmail, askedPhone, error: null };
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    return { id: testCase.id, name: testCase.name, pass: false, messageCount, ready, docGenerated: false, docLength: 0, askedEmail, askedPhone, error: e.message };
  }
}

async function main() {
  console.log('Starting 20 integration tests against https://legalhelp.cl\n');
  const results = [];

  for (const tc of TEST_CASES) {
    const result = await runTest(tc);
    results.push(result);
    await sleep(3000);
  }

  const passed = results.filter(r => r.pass).length;
  let report = `# Integration Test Results\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n**Target:** https://legalhelp.cl\n\n`;
  report += `## Summary: ${passed}/20 PASSED\n\n`;
  report += `| # | Test Case | Result | Messages | Ready | Doc Generated | Doc Length | Email Asked | Phone Asked | Error |\n`;
  report += `|---|-----------|--------|----------|-------|---------------|------------|-------------|-------------|-------|\n`;
  for (const r of results) {
    report += `| ${r.id} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.messageCount} | ${r.ready} | ${r.docGenerated} | ${r.docLength} | ${r.askedEmail} | ${r.askedPhone} | ${r.error || '-'} |\n`;
  }
  report += `\n## Details\n\n`;
  for (const r of results) {
    report += `### ${r.id}. ${r.name} - ${r.pass ? 'PASS' : 'FAIL'}\n`;
    report += `- Messages to ready: ${r.messageCount}\n- Ready reached: ${r.ready}\n- Document generated: ${r.docGenerated} (${r.docLength} chars)\n- Asked for email: ${r.askedEmail}\n- Asked for phone: ${r.askedPhone}\n`;
    if (r.error) report += `- Error: ${r.error}\n`;
    report += `\n`;
  }

  const fs = await import('fs');
  fs.writeFileSync('/projects/sandbox/legalhelp-chile/.agents/tasks/task-fix-chat-prompt/test-results.md', report);
  console.log(`\n\nResults written to test-results.md`);
  console.log(`FINAL: ${passed}/20 tests passed`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
