// Plantillas legales chilenas para cada tipo de documento
// Usan {{variable}} para reemplazo en vivo con datos del formulario

export const TEMPLATES: Record<string, string> = {
  tag: `SOLICITUD DE PRESCRIPCIÓN DE MULTAS DE TRÁNSITO (TAG)

MATERIA: Solicitud de prescripción extintiva de multas de tránsito por TAG

SEÑOR JUEZ DEL JUZGADO DE POLICÍA LOCAL DE {{tribunal}}

{{nombre}}, {{rut}}, domiciliado en {{domicilio}}, a US. respetuosamente digo:

Que vengo en solicitar la declaración de prescripción extintiva de las multas de tránsito asociadas al vehículo de mi propiedad, patente {{patente}}, por aplicación del artículo 24 de la Ley N° 18.287 que establece el procedimiento ante los Juzgados de Policía Local.

1. **HECHOS:** Con fecha {{fechaHecho}}, se registraron infracciones de tránsito respecto del vehículo individualizado, por concepto de uso de carreteras concesionadas (TAG), ascendiendo a un monto total de $\{{montomulta}}.

2. **FUNDAMENTOS DE DERECHO:** El artículo 24 de la Ley N° 18.287 dispone que "la acción para perseguir las infracciones a las leyes de tránsito prescribe en el plazo de tres meses contado desde que se cometió la infracción". Asimismo, el artículo 2509 del Código Civil establece que la prescripción extintiva extingue los derechos y acciones de toda especie.

3. Habiendo transcurrido con creces el plazo legal de 3 meses sin que mi parte haya sido notificada válidamente de procedimiento alguno, solicito se declare prescrita la acción ejecutiva respecto de la totalidad de las multas reclamadas.

POR TANTO, y en virtud de lo dispuesto en la Ley N° 18.287 y el Código Civil,

A US. PIDO: Tener por interpuesta la presente solicitud, declarar prescritas las multas descritas y ordenar su eliminación del registro correspondiente, con costas.

{{fechaActual}}

{{nombre}}
RUT: {{rut}}`,

  finiquito: `SOLICITUD DE FINIQUITO LABORAL

MATERIA: Solicitud de cálculo y pago de finiquito

SEÑOR EMPLEADOR / INSPECCIÓN DEL TRABAJO

{{nombre}}, {{rut}}, domiciliado en {{domicilio}}, por este acto, a Ud. respetuosamente digo:

Que fui trabajador dependiente de la empresa {{empleador}}, RUT {{rutEmpleador}}, desempeñando el cargo de {{cargo}}, desde el {{fechaIngreso}} hasta el {{fechaTermino}}, fecha en que {{#if causal==renuncia}}presenté mi renuncia voluntaria{{else}}fui despedido{{/if}}.

1. De conformidad con lo dispuesto en el artículo 177 del Código del Trabajo, el empleador se encuentra obligado a extender el finiquito y pagar las prestaciones que correspondan dentro del plazo de 10 días hábiles contados desde la separación del trabajador.

2. Los montos adeudados corresponden a indemnización por años de servicio, vacaciones proporcionales, feriado legal, y demás prestaciones que se devenguen con ocasión del término de la relación laboral.

{{#if monto}}
3. El monto total estimado de las prestaciones asciende a $\{{monto}}.
{{/if}}

POR TANTO, en virtud de lo dispuesto en el artículo 177 y siguientes del Código del Trabajo,

SOLICITO A UD.: Tener a bien ordenar el cálculo y pago del finiquito que por ley me corresponde, dentro del plazo legal establecido.

{{fechaActual}}

{{nombre}}
RUT: {{rut}}`,

  reclamo: `CARTA DE RECLAMO

MATERIA: Reclamo formal por {{producto}}

{{destinatario}}
Presente

De mi consideración:

Por medio de la presente, yo, {{nombre}}, {{rut}}, domiciliado en {{domicilio}}, vengo en presentar formal reclamo por los siguientes hechos:

1. Con fecha {{fechaHecho}}, adquirí el producto/servicio denominado "{{producto}}", el cual presenta los problemas que paso a detallar.

2. A pesar de haber realizado las gestiones de cobranza pertinentes, no he obtenido una solución satisfactoria por parte de su institución.

{{#if boleta}}
3. N° de boleta o contrato asociado: {{boleta}}.
{{/if}}

{{#if monto}}
4. El monto involucrado en la presente reclamación asciende a $\{{monto}}.
{{/if}}

DETALLE DE LOS HECHOS:
{{detalle}}

Por lo anteriormente expuesto, solicito se sirva dar solución a mi requerimiento en el plazo legal establecido, bajo apercibimiento de recurrir a las instancias administrativas y judiciales correspondientes.

Sin otro particular, atte.

{{fechaActual}}

{{nombre}}
RUT: {{rut}}
Teléfono: {{telefono}}
Correo: {{email}}`,

  poder: `PODER NOTARIAL ESPECIAL

MATERIA: Mandato especial para {{#if vehiculo}}venta de vehículo{{else}}gestión y administración{{/if}}

En Santiago de Chile, a {{fechaActual}}, ante mí, Abogado Habilitado,

COMPARECE: {{nombre}}, {{rut}}, domiciliado en {{domicilio}}, quien expone:

Que por el presente instrumento, confiere PODER ESPECIAL, en los términos del artículo 2124 del Código Civil, a {{apoderado}}, {{rutApoderado}}, para que en su nombre y representación:

1. Pueda realizar todas las gestiones necesarias para la venta y transferencia de dominio del vehículo patente {{vehiculo}}.

2. Firmar los contratos de compraventa y demás documentos necesarios para materializar la transferencia.

3. Percibir los precios y cantidades que correspondan, otorgando los recibos y finiquitos del caso.

4. Las facultades señaladas en el presente mandato son las siguientes:
   {{facultades}}

El mandatario queda expresamente facultado para delegar y sustituir el presente mandato, total o parcialmente, en la persona que estime conveniente.

Se deja constancia que el presente mandato se otorga en los términos del artículo 2131 del Código Civil.

POR TANTO, firmo el presente poder ante el Notario Público que corresponda.

{{nombre}}
RUT: {{rut}}`,

  familia: `SOLICITUD DE {{#if materiaFamiliar==alimentos}}ALIMENTOS{{else if materiaFamiliar==divorcio}}DIVORCIO DE MUTUO ACUERDO{{else if materiaFamiliar==posesion}}POSESIÓN EFECTIVA{{else if materiaFamiliar==tuicion}}CUIDADO PERSONAL{{else}}TRÁMITE DE DERECHO DE FAMILIA{{/if}}

MATERIA: Derecho de Familia

SEÑOR JUEZ DEL TRIBUNAL DE FAMILIA

{{nombre}}, {{rut}}, domiciliado en {{domicilio}}, a US. respetuosamente digo:

Que vengo en solicitar {{#if materiaFamiliar==alimentos}}el establecimiento de una pensión de alimentos{{else if materiaFamiliar==divorcio}}el divorcio de mutuo acuerdo{{else if materiaFamiliar==posesion}}la posesión efectiva de la herencia{{else}}el cuidado personal de mis hijos{{/if}}, en virtud de los siguientes antecedentes:

1. Con fecha {{fechaMatrimonio}}, contraje matrimonio con {{conyuge}}, {{rutConyuge}}.

{{#if hijos}}
2. De dicha relación nacieron los siguientes hijos: {{hijos}}.
{{/if}}

{{#if causante}}
3. El causante {{causante}}, {{rutCausante}}, falleció según consta en la inscripción de defunción respectiva.
{{/if}}

4. Los hechos relevantes que fundan la presente solicitud son los siguientes:
   {{detalle}}

POR TANTO, y conforme a lo dispuesto en la Ley N° 19.947 y el Código Civil,

A US. PIDO: Tener por interpuesta la presente solicitud, darle tramitación y acogerla en todas sus partes, con costas.

{{fechaActual}}

{{nombre}}
RUT: {{rut}}`,

  arrendamiento: `CONTRATO DE ARRENDAMIENTO

En Santiago de Chile, a {{fechaActual}}, entre:

**ARRENDADOR:** {{nombre}}, {{rut}}, domiciliado en {{domicilio}}.
**ARRENDATARIO:** {{arrendatario}}, {{rutArrendatario}}.

Las partes convienen en celebrar el presente contrato de arrendamiento, el que se regirá por las siguientes cláusulas:

PRIMERO: El arrendador da en arrendamiento al arrendatario el inmueble ubicado en {{propiedad}}.

SEGUNDO: El plazo del presente contrato será de {{plazo}} meses, contados desde esta fecha, renovable automáticamente por períodos iguales.

TERCERO: La renta mensual del arrendamiento asciende a $\{{monto}}, que el arrendatario deberá pagar dentro de los primeros 5 días de cada mes.

CUARTO: El arrendatario declara recibir el inmueble en buen estado y se obliga a mantenerlo en las mismas condiciones, respondiendo de los deterioros que no provengan del uso normal.

QUINTO: Cualquier modificación al presente contrato deberá constar por escrito.

{{detalle}}

Para constancia, firman ambas partes.

{{nombre}}
RUT: {{rut}}

{{arrendatario}}
RUT: {{rutArrendatario}}`,

  proteccion: `RECURSO DE PROTECCIÓN

MATERIA: Acción constitucional de protección por vulneración de derechos fundamentales

SEÑOR CORTE DE APELACIONES

{{nombre}}, {{rut}}, domiciliado en {{domicilio}}, a US. respetuosamente digo:

Que vengo en interponer recurso de protección en contra de {{recurrente}}, por el acto ilegal y/o arbitrario consistente en {{detalle}}, que vulnera el derecho constitucional {{derecho}}, garantizado en el artículo 19 de la Constitución Política de la República.

1. **LOS HECHOS:** Con fecha {{fechaHecho}}, la recurrida {{recurrente}} ha afectado gravemente mi derecho constitucional, según paso a detallar.

2. **EL DERECHO VULNERADO:** Se ha conculcado el derecho establecido en el Art. 19 N° de la Constitución Política de la República.

3. **FUNDAMENTOS DE DERECHO:** El recurso de protección se encuentra establecido en el artículo 20 de la Constitución Política de la República, que procede contra todo acto arbitrario o ilegal que prive, perturbe o amenace el legítimo ejercicio de los derechos y garantías constitucionales.

{{#if monto}}
4. El perjuicio económico asciende a $\{{monto}}.
{{/if}}

POR TANTO, y en virtud de lo dispuesto en los artículos 20 de la Constitución Política de la República y Auto Acordado de la Excma. Corte Suprema sobre tramitación del recurso de protección,

A US. PIDO: Tener por interpuesto el presente recurso de protección, acogerlo a tramitación y disponer las medidas de protección que en derecho correspondan, con costas.

{{fechaActual}}

{{nombre}}
RUT: {{rut}}`,

  otro: `{{tipoDocumento}}

MATERIA: Solicitud / Declaración

{{nombre}}, {{rut}}, domiciliado en {{domicilio}}, a quien corresponda, digo:

Que por medio del presente instrumento, vengo en exponer y solicitar lo siguiente:

{{detalle}}

Fundamento lo anterior en las disposiciones legales vigentes que resulten aplicables al caso.

POR TANTO,

SOLICITO: Tener por presentado el presente documento y darle el curso que en derecho corresponda.

{{fechaActual}}

{{nombre}}
RUT: {{rut}}
Teléfono: {{telefono}}
Correo: {{email}}`,
};

export function getTemplate(docId: string): string {
  return TEMPLATES[docId] || TEMPLATES.otro;
}

export function getTemplateTitle(docId: string): string {
  const titles: Record<string, string> = {
    tag: 'Solicitud de Prescripción de Multas TAG (Ley 18.287)',
    finiquito: 'Solicitud de Finiquito Laboral (Art. 177 Código del Trabajo)',
    reclamo: 'Carta de Reclamo Formal',
    poder: 'Poder Notarial Especial',
    familia: 'Solicitud de Derecho de Familia',
    arrendamiento: 'Contrato de Arrendamiento',
    proteccion: 'Recurso de Protección (Art. 20 CPR)',
    otro: 'Documento Legal Personalizado',
  };
  return titles[docId] || 'Documento Legal';
}
