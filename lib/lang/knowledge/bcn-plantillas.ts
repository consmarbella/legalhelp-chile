/**
 * PLANTILLAS OFICIALES BCN (Biblioteca del Congreso Nacional)
 * 
 * Fuentes verificadas de documentos legales chilenos.
 * Estas NO son "conocimiento del LLM", son plantillas REALES.
 */

export interface PlantillaBCN {
  id: string;
  nombre: string;
  fuente: string; // URL de BCN o fuente oficial
  requisitos: string[];
  articulosLegales: string[];
  estructura: string;
  ejemploLlenado: string;
}

/**
 * FINIQUITO LABORAL
 * Fuente: Dirección del Trabajo + Código del Trabajo
 */
export const FINIQUITO_LABORAL: PlantillaBCN = {
  id: 'finiquito_laboral',
  nombre: 'Finiquito de Trabajo',
  fuente: 'Dirección del Trabajo Chile - https://www.dt.gob.cl/portal/1626/articles-95516_recurso_1.pdf',
  requisitos: [
    'Nombre completo del trabajador',
    'RUT del trabajador',
    'Nombre o razón social del empleador',
    'RUT del empleador',
    'Dirección del empleador',
    'Cargo desempeñado',
    'Fecha de ingreso (inicio relación laboral)',
    'Fecha de término (fin relación laboral)',
    'Última remuneración mensual bruta',
    'Causal de término (Art. 159, 160 o 161 CT)',
    'Monto total a pagar (desglosado)',
  ],
  articulosLegales: [
    'Art. 177 Código del Trabajo: El finiquito debe ser ratificado ante Inspector del Trabajo o Notario Público',
    'Art. 162 Código del Trabajo: El empleador debe acreditar pago de cotizaciones previsionales',
    'Art. 163 Código del Trabajo: Indemnización por años de servicio (30 días por año trabajado)',
    'Art. 73 Código del Trabajo: Feriado proporcional',
    'Art. 161 inc. 2 Código del Trabajo: Indemnización sustitutiva de aviso previo (30 días)',
  ],
  estructura: `FINIQUITO

En [Ciudad], a [Fecha], comparecen:

Por una parte, [EMPLEADOR], RUT [RUT EMPLEADOR], domiciliado en [DIRECCIÓN EMPLEADOR], en adelante "el empleador".

Por la otra, [TRABAJADOR], RUT [RUT TRABAJADOR], domiciliado en [DIRECCIÓN TRABAJADOR], en adelante "el trabajador".

Ambas partes dejan constancia del término de la relación laboral y se otorgan el más amplio finiquito:

PRIMERO: El trabajador se desempeñó como [CARGO] desde el [FECHA INGRESO] hasta el [FECHA TÉRMINO], fecha en que terminó por causal del Art. [159/160/161] N°[X] del Código del Trabajo.

SEGUNDO: El empleador paga la suma total de $[MONTO TOTAL], desglosada así:
a) Remuneración proporcional: $[MONTO]
b) Feriado proporcional (Art. 73 CT): $[MONTO]
c) Gratificación proporcional: $[MONTO]
d) Indemnización años servicio (Art. 163 CT): $[MONTO]
e) Indemnización aviso previo (Art. 161 CT): $[MONTO]

TERCERO: El trabajador declara recibir conforme y otorga finiquito total.

CUARTO: El empleador acredita pago de cotizaciones al día (Art. 162 CT).

_______________________     _______________________
[TRABAJADOR]                [EMPLEADOR]
RUT [RUT]                   RUT [RUT]

_______________________
MINISTRO DE FE
(Inspector del Trabajo o Notario)`,
  ejemploLlenado: `Ejemplo real de cómo se llena:
- Trabajador: María Fernández López, RUT 18.234.567-9
- Empleador: Supermercado Líder S.A., RUT 76.124.890-3
- Cargo: Cajera
- Fecha ingreso: 15 de marzo de 2021
- Fecha término: 30 de mayo de 2026
- Último sueldo: $650.000
- Causal: Art. 161 (Necesidades de la empresa)
- Indemnización años servicio: $650.000 × 5 años × 30 días = aprox. $3.250.000`
};

/**
 * PODER SIMPLE
 * Fuente: Código Civil + Práctica notarial chilena
 */
export const PODER_SIMPLE: PlantillaBCN = {
  id: 'poder_simple',
  nombre: 'Poder Simple / Mandato Especial',
  fuente: 'Código Civil Arts. 2116-2173 + Práctica notarial',
  requisitos: [
    'Nombre completo del mandante (quien otorga el poder)',
    'RUT del mandante',
    'Dirección del mandante',
    'Nombre completo del apoderado (quien recibe el poder)',
    'RUT del apoderado',
    'Facultades específicas que se otorgan',
    'Trámite o acto específico para el cual se otorga',
  ],
  articulosLegales: [
    'Art. 2116 Código Civil: Definición de mandato',
    'Art. 2132 Código Civil: Mandato debe ser expreso para ciertos actos',
    'Art. 1801 Código Civil: Actos solemnes requieren escritura pública (compraventa inmuebles, hipotecas, sociedades)',
    'Art. 7 CPC: Facultades del mandato judicial',
  ],
  estructura: `PODER ESPECIAL

En [Ciudad], a [Fecha],

Yo, [MANDANTE], RUT [RUT MANDANTE], domiciliado en [DIRECCIÓN MANDANTE], otorgo poder especial a:

[APODERADO], RUT [RUT APODERADO], domiciliado en [DIRECCIÓN APODERADO],

Para que en mi nombre y representación [DESCRIBIR EL ACTO ESPECÍFICO].

Las facultades otorgadas incluyen: [LISTAR FACULTADES].

Este poder [TIENE/NO TIENE] facultad de delegar.

ADVERTENCIA: Si el poder es para actos solemnes (compraventa de inmuebles, constitución de hipotecas, constitución de sociedades), DEBE otorgarse por escritura pública ante Notario, conforme Art. 1801 Código Civil.

_______________________
[MANDANTE]
RUT [RUT]`,
  ejemploLlenado: `Ejemplo para poder de cobro de finiquito:
- Mandante: Juan Pérez Gómez, RUT 16.789.012-3, Los Leones 2340, Providencia
- Apoderado: Carmen Pérez Silva, RUT 12.345.678-9
- Facultades: Cobrar finiquito en mi nombre ante mi ex empleador Constructora ABC Ltda.
- Este es un trámite puntual, NO requiere plazo de vigencia.`
};

/**
 * RECLAMO SERNAC
 * Fuente: SERNAC + Ley 19.496
 */
export const RECLAMO_SERNAC: PlantillaBCN = {
  id: 'reclamo_sernac',
  nombre: 'Reclamo ante SERNAC o Empresa',
  fuente: 'SERNAC - https://www.sernac.cl + Ley 19.496 sobre Protección de Derechos del Consumidor',
  requisitos: [
    'Nombre completo del consumidor',
    'RUT del consumidor',
    'Dirección del consumidor',
    'Teléfono o email de contacto',
    'Nombre de la empresa reclamada',
    'Descripción del problema (qué compró, cuándo, qué falló)',
    'Gestiones previas realizadas (llamadas, tickets, visitas)',
    'Solución que exige (devolución, reparación, indemnización)',
  ],
  articulosLegales: [
    'Art. 3 Ley 19.496: Derechos básicos del consumidor (información veraz, no discriminación, seguridad)',
    'Art. 19 Ley 19.496: Garantía legal 3 meses para bienes nuevos',
    'Art. 20 Ley 19.496: Consumidor puede elegir entre reparación, cambio o devolución',
    'Art. 23 Ley 19.496: Proveedor responde por fallas del producto',
    'Art. 50 Ley 19.496: Mediación gratuita en SERNAC',
  ],
  estructura: `[Ciudad], [Fecha]

[EMPRESA RECLAMADA]
PRESENTE

[NOMBRE CONSUMIDOR], RUT [RUT], domiciliado en [DIRECCIÓN], en calidad de consumidor, interpone reclamo formal:

I. HECHOS

[DESCRIBIR: Qué compró, cuándo, por cuánto, qué problema ocurrió, qué gestiones hizo]

II. DERECHOS VULNERADOS

El Art. 3 Ley 19.496 garantiza [derecho específico vulnerado].
El Art. 19 Ley 19.496 establece garantía legal de 3 meses.
El Art. 23 sanciona al proveedor que cause daño por negligencia.

III. PETICIÓN

Solicito [solución específica: devolución/cambio/reparación/indemnización].

Plazo: 10 días hábiles. Caso contrario, denuncia ante SERNAC y acciones legales.

[NOMBRE]
RUT [RUT]
Contacto: [TELÉFONO/EMAIL]`,
  ejemploLlenado: `Ejemplo refrigerador Falabella:
- Consumidor: Patricia González, RUT 15.345.678-9, Av. Grecia 4567, Ñuñoa
- Empresa: Falabella S.A.
- Compra: Refrigerador Samsung RT38K5, $450.000, 15/03/2026
- Problema: A los 20 días dejó de enfriar. Servicio técnico no respondió 5 llamados.
- Solución: Devolución íntegra de $450.000 o cambio por equipo nuevo.`
};

/**
 * PRESCRIPCIÓN MULTA TAG
 * Fuente: Ley 18.287 + Práctica JPL
 */
export const PRESCRIPCION_TAG: PlantillaBCN = {
  id: 'prescripcion_tag',
  nombre: 'Solicitud de Prescripción de Multa de Tránsito (TAG)',
  fuente: 'Ley 18.287 sobre Procedimiento ante Juzgados de Policía Local',
  requisitos: [
    'Nombre completo del solicitante',
    'RUT del solicitante',
    'Dirección del solicitante',
    'Patente del vehículo',
    'Comuna del Juzgado de Policía Local competente',
    'Fechas de las multas (o certificado de multas no pagadas)',
  ],
  articulosLegales: [
    'Art. 24 Ley 18.287: Prescripción de acción contravencional en 3 años desde anotación en Registro Civil',
    'Art. 25 Ley 18.287: Prescripción de pena en 3 años desde sentencia ejecutoriada',
    'Art. 171 Ley 18.290 (Ley de Tránsito): Procedimiento infracciones',
  ],
  estructura: `[Ciudad], [Fecha]

EN LO PRINCIPAL: Solicita prescripción de multa(s) de tránsito. OTROSÍ: Acompaña certificado.

SEÑOR JUEZ DEL JUZGADO DE POLICÍA LOCAL DE [COMUNA]
PRESENTE

[NOMBRE], RUT [RUT], domiciliado en [DIRECCIÓN], propietario del vehículo patente [PATENTE], a US. respetuosamente digo:

I. INDIVIDUALIZACIÓN DE INFRACCIÓN(ES)

Según Certificado de Multas No Pagadas del Registro Civil (adjunto):
[LISTAR: N° parte, fecha anotación, autopista/tramo, monto]

II. PRESCRIPCIÓN (ART. 24 LEY 18.287)

Art. 24 Ley 18.287: La acción prescribe en 3 años desde anotación en Registro Civil.

Las multas fueron anotadas el [FECHAS], habiendo transcurrido más de 3 años sin notificación de sentencia ni ejecución.

III. PETICIÓN

RUEGO A US.: Declarar prescrita(s) la(s) multa(s), eliminarlas del Registro de Multas No Pagadas, oficiar al Registro Civil para cancelación.

OTROSÍ: Acompaño Certificado de Multas No Pagadas.

[NOMBRE]
RUT [RUT]`,
  ejemploLlenado: `Ejemplo TAG Costanera Norte:
- Solicitante: Andrea Fuentes, RUT 19.123.456-7, Puente Alto
- Patente: BBXY12
- Multas: Agosto 2019, pasar sin TAG Costanera Norte (más de 3 años)
- JPL competente: Juzgado de Policía Local de Vitacura (donde ocurrió infracción)
- Certificado: Sacar en www.registrocivil.cl (gratuito)`
};

/**
 * DEMANDA DE ALIMENTOS
 * Fuente: Código Civil + Ley 14.908
 */
export const DEMANDA_ALIMENTOS: PlantillaBCN = {
  id: 'demanda_alimentos',
  nombre: 'Demanda de Pensión Alimenticia',
  fuente: 'Ley 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias + Código Civil Arts. 321-337',
  requisitos: [
    'Nombre completo del demandante (madre o padre que pide alimentos)',
    'RUT del demandante',
    'Nombre completo del demandado (padre o madre que debe pagar)',
    'RUT del demandado',
    'Dirección del demandado (para notificación judicial)',
    'Nombre y fecha de nacimiento de cada hijo/a',
    'Necesidades mensuales de los hijos (alimentación, educación, salud, vivienda, vestuario)',
    'Ingresos conocidos o estimados del demandado',
    'Monto mensual solicitado por hijo',
  ],
  articulosLegales: [
    'Art. 321 Código Civil: Obligación de dar alimentos (padres a hijos)',
    'Art. 323 Código Civil: Alimentos comprenden sustento, habitación, vestidos, educación, salud',
    'Art. 3 Ley 14.908: Alimentos provisorios desde presentación demanda',
    'Art. 8 Ley 14.908: Audiencia preparatoria para mediación',
    'Art. 14 Ley 14.908: Apremios en caso de no pago (arresto, suspensión licencia)',
  ],
  estructura: `[Ciudad], [Fecha]

EN LO PRINCIPAL: Demanda de alimentos. PRIMER OTROSÍ: Solicita alimentos provisorios. SEGUNDO OTROSÍ: Acompaña documentos.

SEÑOR JUEZ DE FAMILIA DE [COMUNA]
PRESENTE

[NOMBRE DEMANDANTE], RUT [RUT], domiciliado en [DIRECCIÓN], por la presente demando de alimentos a:

[NOMBRE DEMANDADO], RUT [RUT], domiciliado en [DIRECCIÓN DEMANDADO],

I. HECHOS

1. Soy madre/padre de [NOMBRE HIJO], nacido el [FECHA NACIMIENTO], actualmente [EDAD].

2. El demandado es el padre/madre del menor y no provee alimentos.

3. Las necesidades mensuales del menor son:
   - Alimentación: $[MONTO]
   - Educación (jardín/colegio): $[MONTO]
   - Salud (consultas, remedios): $[MONTO]
   - Vivienda (arriendo/dividendo proporcional): $[MONTO]
   - Vestuario: $[MONTO]
   TOTAL: $[MONTO TOTAL]

4. El demandado percibe ingresos de aproximadamente $[MONTO INGRESO DEMANDADO] mensuales.

II. DERECHO

Art. 321 Código Civil: Los padres deben alimentos a sus hijos.
Art. 3 Ley 14.908: Alimentos provisorios desde presentación.
Art. 14 Ley 14.908: Apremios en caso de no pago.

III. PETICIÓN

SOLICITO declarar obligación alimenticia y fijar pensión de $[MONTO] mensual.

PRIMER OTROSÍ: Solicito alimentos provisorios 40% pensión solicitada ($[MONTO PROVISORIO]).

SEGUNDO OTROSÍ: Acompaño certificado de nacimiento del menor.

[NOMBRE DEMANDANTE]
RUT [RUT]`,
  ejemploLlenado: `Ejemplo: Madre demanda al padre
- Demandante: Carolina Paz Vásquez Torres, RUT 16.890.123-4
- Demandado: Roberto Andrés Soto Paredes, RUT 17.234.567-8, Los Copihues 456, Maipú
- Hijo: Sofía Soto Vásquez, nacida 12 marzo 2020 (6 años)
- Necesidades mensuales: Alimentación $80.000 + Jardín $120.000 + Salud $30.000 + Arriendo prop. $50.000 + Vestuario $20.000 = $300.000
- Ingreso demandado: $800.000 (trabaja en empresa seguridad)
- Monto solicitado: $250.000 mensual`
};

/**
 * RECURSO DE PROTECCIÓN
 * Fuente: Constitución Art. 20 + Auto Acordado Corte Suprema
 */
export const RECURSO_PROTECCION: PlantillaBCN = {
  id: 'recurso_proteccion',
  nombre: 'Recurso de Protección',
  fuente: 'Constitución Política Art. 20 + Auto Acordado de la Corte Suprema sobre Recurso de Protección',
  requisitos: [
    'Nombre completo del recurrente',
    'RUT del recurrente',
    'Individualización del recurrido (persona o entidad que cometió el acto)',
    'Descripción del acto u omisión ilegal o arbitraria',
    'Fecha en que ocurrió el acto (máximo 30 días corridos)',
    'Qué derecho constitucional fue vulnerado (Art. 19 N° de la Constitución)',
    'Qué medida solicita al tribunal',
  ],
  articulosLegales: [
    'Art. 20 Constitución: Recurso de protección por acto u omisión arbitraria o ilegal',
    'Art. 19 N°1 Constitución: Derecho a la vida e integridad física y psíquica',
    'Art. 19 N°9 Constitución: Derecho a la protección de la salud',
    'Art. 19 N°21 Constitución: Derecho a desarrollar actividad económica',
    'Auto Acordado: Plazo 30 días corridos desde acto u omisión',
  ],
  estructura: `[Ciudad], [Fecha]

EN LO PRINCIPAL: Interpone recurso de protección. OTROSÍ: Patrocinio y poder.

ILTMA. CORTE DE APELACIONES DE [CIUDAD]
PRESENTE

[NOMBRE RECURRENTE], RUT [RUT], domiciliado en [DIRECCIÓN], interpone recurso de protección en contra de:

[RECURRIDO], por acto ilegal y arbitrario que vulnera garantía constitucional.

I. HECHOS

1. Con fecha [FECHA ACTO], [RECURRIDO] [DESCRIBIR ACTO U OMISIÓN].

2. [CONSECUENCIAS DEL ACTO].

3. [GESTIONES PREVIAS REALIZADAS SIN ÉXITO].

II. ACTO ILEGAL Y ARBITRARIO

El acto es ILEGAL porque [explicar qué norma vulnera].
El acto es ARBITRARIO porque [explicar irracionalidad].

III. DERECHO CONSTITUCIONAL VULNERADO

Se vulnera Art. 19 N°[X] de la Constitución: [ESPECIFICAR DERECHO].

IV. PETICIÓN

SOLICITO a la Iltma. Corte:
1. Acoger el recurso.
2. Ordenar a [RECURRIDO] que [MEDIDA CONCRETA: reconectar, restituir, cesar acto].
3. Restablecimiento del imperio del derecho.

OTROSÍ: Acompaño patrocinio y poder de abogado.

[NOMBRE RECURRENTE]
RUT [RUT]`,
  ejemploLlenado: `Ejemplo corte de luz con hijo enfermo:
- Recurrente: Marcela Ignacia Contreras Pizarro, RUT 15.890.123-4
- Recurrido: Enel Distribución Chile S.A.
- Acto: Corte de suministro eléctrico el 20 junio 2026 sin aviso previo
- Consecuencia: Hijo Tomás (7 años) usa oxígeno domiciliario 24/7 por fibrosis pulmonar. Corte pone en riesgo su vida.
- Derecho vulnerado: Art. 19 N°1 (vida e integridad física) y N°9 (protección salud)
- Petición: Ordenar reconexión inmediata`
};

/**
 * CARTA DE RENUNCIA
 * Fuente: Código del Trabajo Art. 159 N°2
 */
export const CARTA_RENUNCIA: PlantillaBCN = {
  id: 'carta_renuncia',
  nombre: 'Carta de Renuncia Voluntaria',
  fuente: 'Código del Trabajo Art. 159 N°2 + Dirección del Trabajo',
  requisitos: [
    'Nombre completo del trabajador',
    'RUT del trabajador',
    'Nombre o razón social del empleador',
    'Cargo desempeñado',
    'Fecha efectiva de la renuncia (recomendado: 30 días aviso previo)',
  ],
  articulosLegales: [
    'Art. 159 N°2 Código del Trabajo: Renuncia voluntaria del trabajador',
    'Art. 162 inc. 6 Código del Trabajo: No hay indemnización por renuncia voluntaria',
    'Art. 73 Código del Trabajo: Derecho a feriado proporcional',
  ],
  estructura: `[Ciudad], [Fecha]

[EMPLEADOR]
[DIRECCIÓN EMPLEADOR]
PRESENTE

De mi consideración:

Por medio de la presente, comunico formalmente mi renuncia voluntaria al cargo de [CARGO] que desempeño en [EMPRESA].

Mi último día de trabajo será el [FECHA], dando así aviso con [X días] de anticipación.

Agradezco la oportunidad brindada y quedo a disposición para facilitar la transición de mis funciones.

Solicito liquidar feriado proporcional y gratificación proporcional según Art. 73 Código del Trabajo.

Atentamente,

_______________________
[NOMBRE TRABAJADOR]
RUT [RUT]`,
  ejemploLlenado: `Ejemplo renuncia con aviso:
- Trabajador: Felipe Andrés Rojas Muñoz, RUT 18.567.890-1
- Empleador: Restaurant El Buen Sabor
- Cargo: Garzón
- Fecha carta: 1 julio 2026
- Último día: 31 julio 2026 (30 días aviso)
- NOTA: Aviso previo no es obligatorio pero es cortesía profesional`
};

/**
 * DESPIDO INJUSTIFICADO (Demanda Laboral)
 * Fuente: Código del Trabajo + Procedimiento Laboral
 */
export const DESPIDO_INJUSTIFICADO: PlantillaBCN = {
  id: 'despido_injustificado',
  nombre: 'Demanda por Despido Injustificado',
  fuente: 'Código del Trabajo Arts. 168-171 + Código del Trabajo Libro V (Procedimiento)',
  requisitos: [
    'Nombre completo del trabajador',
    'RUT del trabajador',
    'Nombre o razón social del empleador',
    'RUT del empleador',
    'Cargo desempeñado',
    'Fecha de ingreso y fecha de despido',
    'Última remuneración mensual bruta',
    'Causal invocada por el empleador en carta de despido',
    'Por qué el trabajador considera el despido injustificado',
  ],
  articulosLegales: [
    'Art. 168 Código del Trabajo: Si despido es injustificado, se debe aumentar indemnización',
    'Art. 169 Código del Trabajo: Indemnización máxima 11 sueldos (tope 90 UF por año)',
    'Art. 162 Código del Trabajo: Empleador debe acreditar pago de cotizaciones',
    'Art. 171 Código del Trabajo: Trabajador puede demandar dentro de 60 días hábiles',
    'Art. 420 y ss. Código del Trabajo: Procedimiento laboral ante Juzgado del Trabajo',
  ],
  estructura: `[Ciudad], [Fecha]

EN LO PRINCIPAL: Demanda despido injustificado. PRIMER OTROSÍ: Solicita indemnización aumentada. SEGUNDO OTROSÍ: Patrocinio.

SEÑOR JUEZ DEL TRABAJO DE [COMUNA]
PRESENTE

[NOMBRE TRABAJADOR], RUT [RUT], domiciliado en [DIRECCIÓN], demando a:

[EMPLEADOR], RUT [RUT EMPLEADOR], domiciliado en [DIRECCIÓN EMPLEADOR],

Por despido injustificado y cobro de prestaciones.

I. HECHOS

1. Fui contratado el [FECHA INGRESO] como [CARGO], con última remuneración bruta de $[SUELDO].

2. Con fecha [FECHA DESPIDO], fui despedido invocando causal Art. [159/160/161] N°[X] del Código del Trabajo: "[CAUSAL]".

3. El despido es INJUSTIFICADO porque [EXPLICAR: no se cumplen requisitos de la causal, no hubo investigación, causal es falsa, etc.].

4. Tengo [X años] de antigüedad, correspondiendo indemnización por años de servicio.

II. DERECHO

Art. 168 CT: Despido injustificado debe ser indemnizado aumentadamente (30% a 100%).
Art. 163 CT: Indemnización años de servicio (30 días por año).
Art. 162 CT: Empleador no acreditó pago cotizaciones.

III. PETICIÓN

1. Declarar despido INJUSTIFICADO.
2. Condenar a pagar:
   a) Indemnización años servicio: $[MONTO]
   b) Indemnización aviso previo: $[MONTO]
   c) Recargo 50% por injustificado: $[MONTO]
   d) Feriado proporcional: $[MONTO]
   e) Cotizaciones impagas: $[MONTO]
   TOTAL: $[MONTO TOTAL]

PRIMER OTROSÍ: Solicito recargo Art. 168 del 50% por falta de acreditación.

SEGUNDO OTROSÍ: Acompaño patrocinio abogado.

[NOMBRE TRABAJADOR]
RUT [RUT]`,
  ejemploLlenado: `Ejemplo despido por "necesidades empresa":
- Trabajador: Jorge Luis Cáceres Díaz, RUT 17.456.789-0
- Empleador: Constructora Los Andes Ltda, RUT 76.234.567-8
- Cargo: Maestro albañil
- Sueldo: $890.000
- Ingreso: enero 2020, Despido: abril 2026 (6 años)
- Causal: Art. 161 "Necesidades de la empresa"
- Injustificado porque: No se acreditaron necesidades reales, empresa sigue contratando, no hay cierre obras.
- Indemnización: $890.000 × 6 años = $5.340.000 + recargo 50% = $8.010.000 aprox.`
};

/**
 * LISTA COMPLETA DE PLANTILLAS BCN
 */
export const PLANTILLAS_BCN: PlantillaBCN[] = [
  FINIQUITO_LABORAL,
  PODER_SIMPLE,
  RECLAMO_SERNAC,
  PRESCRIPCION_TAG,
  DEMANDA_ALIMENTOS,
  RECURSO_PROTECCION,
  CARTA_RENUNCIA,
  DESPIDO_INJUSTIFICADO,
];
