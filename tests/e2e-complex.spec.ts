/**
 * 5 pruebas complejas adicionales contra producción.
 * Verifica: recopilación completa, preview coherente, sin errores graves.
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://legalhelp.cl';

async function chat(message: string, history: Array<{role: string; content: string}>, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, caseHistory: history, currentCaseData: data }),
  });
  return res.json();
}

async function generate(data: Record<string, unknown>): Promise<{ document?: string; preview?: boolean }> {
  // Retry up to 2 times on transient LLM errors (with delay to avoid rate limits)
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}/api/generate-final`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.document) return json;
      // If error or no document, retry with backoff
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      return json;
    } catch {
      // JSON parse error - API returned non-JSON (transient error)
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      return { document: undefined, preview: false };
    }
  }
  return { document: undefined, preview: false };
}

// Helper: conversa enviando TODOS los mensajes para acumular datos completos.
// El LLM puede marcar ready=true antes de recibir todos los datos del caso,
// pero sigue acumulando datos_recopilados en turnos posteriores.
async function conversarHastaReady(msgs: string[]): Promise<{ data: Record<string, unknown>; history: Array<{role: string; content: string}>; turnos: number }> {
  let data: Record<string, unknown> = {};
  const history: Array<{role: string; content: string}> = [];
  let turnos = 0;
  let readyAtTurn = 0;

  for (const msg of msgs) {
    turnos++;
    const r = await chat(msg, history, data) as Record<string, unknown>;
    history.push({ role: 'user', content: msg });
    history.push({ role: 'assistant', content: String(r.response_message ?? '') });
    data = { ...data, ...r };
    if (r.ready === true && readyAtTurn === 0) {
      readyAtTurn = turnos;
    }
  }
  return { data, history, turnos: readyAtTurn || turnos };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Finiquito laboral completo (muchos campos obligatorios)
// ═══════════════════════════════════════════════════════════════════════════════
test('T1: Finiquito laboral — documento complejo con desglose', async () => {
  const { data, turnos } = await conversarHastaReady([
    'Renuncié a mi trabajo y necesito redactar el finiquito porque la empresa no me lo ha entregado',
    'Alejandro Patricio Muñoz Carvajal, RUT 13.456.789-0, Av. Macul 3500, Macul',
    'La empresa es Sodexo Chile S.A., RUT 96.556.940-5, mi cargo era chef ejecutivo, sueldo $1.450.000 brutos',
    'Entré el 1 de marzo de 2019, renuncié el 31 de mayo de 2026. Causal: renuncia voluntaria art. 159 N°2',
    'Me deben vacaciones proporcionales y la gratificación del semestre',
  ]);

  expect(data.ready).toBe(true);
  expect(turnos).toBeLessThanOrEqual(6);

  const gen = await generate(data);
  expect(gen.document).toBeDefined();
  const doc = gen.document!;

  // Preview coherente
  expect(doc.toUpperCase()).toContain('ALEJANDRO');
  expect(doc.toUpperCase()).toMatch(/MU[ÑN]OZ/);
  expect(doc).toContain('13.456.789-0');
  expect(doc.toLowerCase()).toContain('sodexo');
  expect(doc.toLowerCase()).toContain('chef');
  expect(doc).not.toContain('[DATO PENDIENTE - NOMBRE');
  expect(doc.length).toBeGreaterThan(300);
  console.log(`T1: Finiquito OK — ${turnos} turnos, ${doc.length} chars`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Demanda de alimentos con rebaja (caso familiar complejo)
// ═══════════════════════════════════════════════════════════════════════════════
test('T2: Demanda alimentos rebaja — padre que pide reducir pensión', async () => {
  const { data, turnos } = await conversarHastaReady([
    'Perdí mi trabajo y no puedo seguir pagando $400.000 de pensión alimenticia, necesito pedir rebaja al tribunal',
    'Fernando Andrés Villalón Espinoza, RUT 14.890.567-3, Av. Concha y Toro 1200, Puente Alto',
    'Mi ex es Carolina Bustos Figueroa, RUT 15.234.567-8. Mis hijos son Matías de 12 años y Sofía de 9 años',
    'Me despidieron de mi trabajo hace 2 meses, antes ganaba $1.100.000, ahora estoy cesante. Pido rebajar a $200.000 mensuales por ambos hijos',
  ]);

  expect(data.ready).toBe(true);
  expect(turnos).toBeLessThanOrEqual(5);

  const gen = await generate(data);
  const doc = gen.document!;

  expect(doc.toUpperCase()).toContain('FERNANDO');
  expect(doc).toContain('14.890.567-3');
  expect(doc.toLowerCase()).toMatch(/carolina|bustos/);
  expect(doc.toLowerCase()).toMatch(/mat[ií]as|sof[ií]a/);
  expect(doc).not.toContain('mi representado');
  expect(doc.length).toBeGreaterThan(300);
  console.log(`T2: Rebaja alimentos OK — ${turnos} turnos, ${doc.length} chars`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Tutela laboral por acoso (vulneración derechos fundamentales)
// ═══════════════════════════════════════════════════════════════════════════════
test('T3: Tutela laboral — acoso y vulneración derechos fundamentales', async () => {
  const { data, turnos } = await conversarHastaReady([
    'Mi jefe me hace la vida imposible, me grita frente a todos, me cambió de puesto sin razón y me rebajó el sueldo. Quiero demandarlo por tutela laboral',
    'Valentina Paz Herrera Saavedra, RUT 17.890.123-4, Los Castaños 890, La Reina',
    'Trabajo en Banco de Chile, soy ejecutiva de cuentas, gano $1.800.000 brutos. Entré el 10 de agosto de 2021',
    'Mi jefe es Rodrigo Meneses, gerente de sucursal. Desde enero 2026 me grita en reuniones, me sacó de mi oficina a un cubículo, y el mes pasado me rebajó $200.000 del sueldo sin explicación',
    'Vulnera mi dignidad, integridad psíquica y el derecho a no ser discriminada. Quiero indemnización y que cesen los actos',
  ]);

  expect(data.ready).toBe(true);
  expect(turnos).toBeLessThanOrEqual(6);

  const gen = await generate(data);
  const doc = gen.document!;

  expect(doc.toUpperCase()).toContain('VALENTINA');
  expect(doc).toContain('17.890.123-4');
  expect(doc.toLowerCase()).toContain('banco de chile');
  expect(doc.toLowerCase()).toMatch(/tutela|vulneraci[oó]n|derechos fundamentales/);
  expect(doc).not.toContain('mi cliente');
  expect(doc.length).toBeGreaterThan(400);
  console.log(`T3: Tutela laboral OK — ${turnos} turnos, ${doc.length} chars`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Recurso de amparo (privación de libertad ilegal)
// ═══════════════════════════════════════════════════════════════════════════════
test('T4: Recurso de amparo — detención ilegal', async () => {
  const { data, turnos } = await conversarHastaReady([
    'A mi hermano lo detuvieron hace 3 días sin orden judicial y no lo han llevado a control de detención, necesito un recurso de amparo urgente',
    'Yo soy Cristóbal Enrique Soto Farías, RUT 16.345.678-9, Av. Departamental 2100, San Miguel',
    'Mi hermano es Diego Alejandro Soto Farías, RUT 18.901.234-5. Lo detuvo Carabineros de la 15ª Comisaría de San Miguel el viernes 20 de junio a las 23:00 hrs',
    'No tenía orden de detención, no estaba cometiendo delito flagrante. Solo iba caminando y lo pararon por "actitud sospechosa". Lleva 3 días detenido sin control de detención',
  ]);

  expect(data.ready).toBe(true);
  expect(turnos).toBeLessThanOrEqual(5);

  const gen = await generate(data);
  const doc = gen.document!;

  expect(doc.toUpperCase()).toMatch(/CRIST[OÓ]BAL|DIEGO/);
  expect(doc.toLowerCase()).toMatch(/amparo|protecci[oó]n|libertad|detenci[oó]n/);
  expect(doc.toLowerCase()).toContain('carabineros');
  expect(doc).not.toContain('mi representado');
  expect(doc.length).toBeGreaterThan(400);
  console.log(`T4: Recurso amparo OK — ${turnos} turnos, ${doc.length} chars`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Oposición a cobro ejecutivo (defensa de deudor)
// ═══════════════════════════════════════════════════════════════════════════════
test('T5: Oposición cobro ejecutivo — excepción de prescripción', async () => {
  const { data, turnos } = await conversarHastaReady([
    'Me llegó una demanda ejecutiva del banco por un crédito de consumo que dejé de pagar en 2019, quiero oponerme porque ya prescribió',
    'Gonzalo Esteban Parra Valdivia, RUT 15.678.234-1, Av. Vicuña Mackenna 4500 depto 302, La Florida',
    'Es el Banco Santander, me demandan por $3.800.000 más intereses. El último pago que hice fue en marzo de 2019, o sea han pasado más de 5 años',
    'La causa está en el 4° Juzgado Civil de Santiago, rol C-12345-2026. Quiero oponer excepción de prescripción del art. 2515 del Código Civil',
  ]);

  expect(data.ready).toBe(true);
  expect(turnos).toBeLessThanOrEqual(5);

  const gen = await generate(data);
  const doc = gen.document!;

  expect(doc.toUpperCase()).toContain('GONZALO');
  expect(doc).toContain('15.678.234-1');
  expect(doc.toLowerCase()).toContain('santander');
  expect(doc.toLowerCase()).toMatch(/prescripci[oó]n|2515|ejecutiv/);
  expect(doc).not.toContain('**'); // sin markdown
  expect(doc.length).toBeGreaterThan(400);
  console.log(`T5: Oposición ejecutiva OK — ${turnos} turnos, ${doc.length} chars`);
});
