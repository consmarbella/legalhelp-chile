export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'rut' | 'patente' | 'email' | 'tel' | 'date' | 'monto' | 'textarea' | 'select';
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
}

export interface DocFormConfig {
  docId: string;
  fields: FormField[];
}

const RUT: FormField = { name: 'rut', label: 'RUT', type: 'rut', placeholder: '12.345.678-5', required: true };
const NOMBRE: FormField = { name: 'nombre', label: 'Nombre Completo', type: 'text', placeholder: 'Juan Pérez', required: true };
const DOMICILIO: FormField = { name: 'domicilio', label: 'Domicilio', type: 'text', placeholder: 'Calle 123, Comuna, Santiago', required: true };
const EMAIL: FormField = { name: 'email', label: 'Correo Electrónico', type: 'email', placeholder: 'correo@ejemplo.cl', required: true };
const TELEFONO: FormField = { name: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+56 9 1234 5678', required: false };
const FECHA_HECHO: FormField = { name: 'fechaHecho', label: 'Fecha del Hecho', type: 'date', placeholder: 'DD/MM/AAAA', required: true };
const MONTO: FormField = { name: 'monto', label: 'Monto ($)', type: 'monto', placeholder: '$1.000.000', required: false };
const DETALLE: FormField = { name: 'detalle', label: 'Detalle de los Hechos', type: 'textarea', placeholder: 'Describa detalladamente...', required: true };

export const FORM_CONFIGS: DocFormConfig[] = [
  {
    docId: 'tag',
    fields: [
      NOMBRE, RUT, DOMICILIO, EMAIL,
      { name: 'patente', label: 'Patente del Vehículo', type: 'patente', placeholder: 'BBBB12', required: true },
      FECHA_HECHO,
      { name: 'montomulta', label: 'Monto Total Multas ($)', type: 'monto', placeholder: '$500.000', required: true },
      { name: 'tribunal', label: 'Juzgado / Tribunal', type: 'text', placeholder: 'JPL Santiago', required: true },
    ],
  },
  {
    docId: 'finiquito',
    fields: [
      NOMBRE, RUT, DOMICILIO, EMAIL, TELEFONO,
      { name: 'empleador', label: 'Empleador / Empresa', type: 'text', placeholder: 'Empresa ABC Ltda.', required: true },
      { name: 'rutEmpleador', label: 'RUT del Empleador', type: 'rut', placeholder: '76.543.210-8', required: true },
      { name: 'cargo', label: 'Cargo', type: 'text', placeholder: 'Jefe de Ventas', required: true },
      { name: 'fechaIngreso', label: 'Fecha de Ingreso', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'fechaTermino', label: 'Fecha de Término', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'causal', label: 'Causal', type: 'select', required: true, options: [
        { value: 'renuncia', label: 'Renuncia' },
        { value: 'despido', label: 'Necesidades de la Empresa' },
        { value: 'mutuo_acuerdo', label: 'Mutuo Acuerdo' },
      ]},
      MONTO, DETALLE,
    ],
  },
  {
    docId: 'dt-carta-renuncia',
    fields: [
      { name: 'CIUDAD_FIRMA', label: 'Ciudad donde se firma', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'FECHA_CARTA', label: 'Fecha de la Carta', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'RAZON_SOCIAL_EMPLEADOR', label: 'Razón Social de la Empresa', type: 'text', placeholder: 'Empresa ABC SpA', required: true },
      { name: 'CARGO_TRABAJADOR', label: 'Cargo que desempeñaba', type: 'text', placeholder: 'Vendedor', required: true },
      { name: 'FECHA_INGRESO_TRABAJADOR', label: 'Fecha de Ingreso', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'FECHA_ULTIMO_DIA_TRABAJO', label: 'Último día de trabajo', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'MOTIVOS_RENUNCIA', label: 'Motivos de la Renuncia', type: 'text', placeholder: 'personales y profesionales', required: true },
      { name: 'NOMBRE_TRABAJADOR', label: 'Su Nombre Completo', type: 'text', placeholder: 'Juan Pérez', required: true },
      { name: 'RUT_TRABAJADOR', label: 'Su RUT', type: 'rut', placeholder: '12.345.678-9', required: true }
    ],
  },
  {
    docId: 'civil-contrato-arriendo',
    fields: [
      { name: 'CIUDAD_CONTRATO', label: 'Ciudad del Contrato', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'FECHA_CONTRATO', label: 'Fecha del Contrato', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'NOMBRE_ARRENDADOR', label: 'Nombre del Arrendador (Dueño)', type: 'text', placeholder: 'María Gómez', required: true },
      { name: 'NACIONALIDAD_ARRENDADOR', label: 'Nacionalidad Arrendador', type: 'text', placeholder: 'Chilena', required: true },
      { name: 'RUT_ARRENDADOR', label: 'RUT Arrendador', type: 'rut', placeholder: '11.111.111-1', required: true },
      { name: 'DOMICILIO_ARRENDADOR', label: 'Domicilio Arrendador', type: 'text', placeholder: 'Calle 1, Santiago', required: true },
      { name: 'NOMBRE_ARRENDATARIO', label: 'Nombre del Arrendatario', type: 'text', placeholder: 'Juan Pérez', required: true },
      { name: 'NACIONALIDAD_ARRENDATARIO', label: 'Nacionalidad Arrendatario', type: 'text', placeholder: 'Chilena', required: true },
      { name: 'RUT_ARRENDATARIO', label: 'RUT Arrendatario', type: 'rut', placeholder: '22.222.222-2', required: true },
      { name: 'DOMICILIO_ARRENDATARIO', label: 'Domicilio Arrendatario', type: 'text', placeholder: 'Calle 2, Santiago', required: true },
      { name: 'DIRECCION_PROPIEDAD', label: 'Dirección de la Propiedad a Arrendar', type: 'text', placeholder: 'Depto 101, Calle 3', required: true },
      { name: 'COMUNA_PROPIEDAD', label: 'Comuna de la Propiedad', type: 'text', placeholder: 'Providencia', required: true },
      { name: 'VALOR_RENTA_MENSUAL', label: 'Valor Renta Mensual ($)', type: 'monto', placeholder: '500000', required: true },
      { name: 'VALOR_UF', label: 'Equivalente en UF (Opcional)', type: 'text', placeholder: '15 UF', required: false },
      { name: 'DIAS_PLAZO_PAGO', label: 'Días plazo de pago (ej. 5)', type: 'text', placeholder: '5', required: true },
      { name: 'CUENTA_BANCARIA', label: 'Cuenta Bancaria Arrendador', type: 'text', placeholder: 'Cta Corriente 12345 Banco Estado', required: true },
      { name: 'FECHA_INICIO_ARRENDAMIENTO', label: 'Fecha Inicio Arriendo', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'PLAZO_DURACION_MESES', label: 'Duración en Meses', type: 'text', placeholder: '12', required: true },
      { name: 'ANTICIPACION_AVISO_DIAS', label: 'Días aviso anticipado', type: 'text', placeholder: '60', required: true },
      { name: 'MONTO_GARANTIA', label: 'Monto Garantía ($)', type: 'monto', placeholder: '500000', required: true }
    ]
  },
  {
    docId: 'sernac-carta-reclamo',
    fields: [
      { name: 'CIUDAD_FIRMA', label: 'Ciudad', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'FECHA_RECLAMO', label: 'Fecha de Reclamo', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'NOMBRE_CONSUMIDOR', label: 'Su Nombre', type: 'text', placeholder: 'Juan Pérez', required: true },
      { name: 'RUT_CONSUMIDOR', label: 'Su RUT', type: 'rut', placeholder: '12.345.678-9', required: true },
      { name: 'DOMICILIO_CONSUMIDOR', label: 'Su Domicilio', type: 'text', placeholder: 'Calle 1, Stgo', required: true },
      { name: 'COMUNA_CONSUMIDOR', label: 'Su Comuna', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'TELEFONO_CONTACTO', label: 'Teléfono', type: 'tel', placeholder: '+56912345678', required: true },
      { name: 'CORREO_ELECTRONICO', label: 'Correo', type: 'email', placeholder: 'correo@ej.cl', required: true },
      { name: 'RAZON_SOCIAL_PROVEEDOR', label: 'Nombre Empresa (Proveedor)', type: 'text', placeholder: 'Empresa Mala SpA', required: true },
      { name: 'DOMICILIO_PROVEEDOR', label: 'Domicilio Proveedor', type: 'text', placeholder: 'Calle 2, Stgo', required: true },
      { name: 'DETALLE_PRODUCTO_SERVICIO', label: 'Producto o Servicio', type: 'text', placeholder: 'Refrigerador Marca X', required: true },
      { name: 'FECHA_COMPRA', label: 'Fecha Compra', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'VALOR_PRODUCTO_SERVICIO', label: 'Valor Pagado ($)', type: 'monto', placeholder: '100000', required: true },
      { name: 'NUMERO_BOLETA_FACTURA', label: 'N° Boleta / Factura', type: 'text', placeholder: '123456', required: true },
      { name: 'FECHA_EVENTO_FALLA', label: 'Fecha del Evento o Falla', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'RELATO_HECHOS_PROBLEMA', label: 'Relato del Problema', type: 'textarea', placeholder: 'El producto llegó dañado...', required: true },
      { name: 'SOLUCION_REQUERIDA', label: 'Solución Esperada', type: 'text', placeholder: 'Devolución del dinero', required: true },
      { name: 'PLAZO_RESPUESTA_DIAS', label: 'Días Plazo para Respuesta', type: 'text', placeholder: '10', required: true }
    ]
  },
  {
    docId: 'admin-poder-simple',
    fields: [
      { name: 'CIUDAD_FIRMA', label: 'Ciudad', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'FECHA_PODER', label: 'Fecha', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'NOMBRE_MANDANTE', label: 'Nombre Quien da el Poder', type: 'text', placeholder: 'Juan Pérez', required: true },
      { name: 'RUT_MANDANTE', label: 'RUT Quien da el Poder', type: 'rut', placeholder: '11.111.111-1', required: true },
      { name: 'DOMICILIO_MANDANTE', label: 'Domicilio Quien da el Poder', type: 'text', placeholder: 'Calle 1, Stgo', required: true },
      { name: 'COMUNA_MANDANTE', label: 'Comuna Quien da el Poder', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'NOMBRE_MANDATARIO', label: 'Nombre Apoderado (Quien recibe)', type: 'text', placeholder: 'María Gómez', required: true },
      { name: 'NACIONALIDAD_MANDATARIO', label: 'Nacionalidad Apoderado', type: 'text', placeholder: 'Chilena', required: true },
      { name: 'RUT_MANDATARIO', label: 'RUT Apoderado', type: 'rut', placeholder: '22.222.222-2', required: true },
      { name: 'DOMICILIO_MANDATARIO', label: 'Domicilio Apoderado', type: 'text', placeholder: 'Calle 2, Stgo', required: true },
      { name: 'COMUNA_MANDATARIO', label: 'Comuna Apoderado', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'INSTITUCION_DESTINO', label: 'Institución donde presentará (ej. SII)', type: 'text', placeholder: 'Servicio de Impuestos Internos', required: true },
      { name: 'DETALLE_TRAMITE_AUTORIZADO', label: 'Detalle del Trámite Autorizado', type: 'textarea', placeholder: 'Retirar documentos de...', required: true },
      { name: 'FECHA_EXPIRACION_PODER', label: 'Fecha de Expiración', type: 'date', placeholder: 'DD/MM/AAAA', required: true }
    ]
  },
  {
    docId: 'jpl-descargos-infraccion',
    fields: [
      { name: 'COMUNA_JUZGADO', label: 'Comuna del Juzgado', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'ROL_CAUSA', label: 'Rol de la Causa (N°)', type: 'text', placeholder: '123-2023', required: true },
      { name: 'NOMBRE_COMPLETO_DENUNCIADO', label: 'Su Nombre', type: 'text', placeholder: 'Juan Pérez', required: true },
      { name: 'RUT_DENUNCIADO', label: 'Su RUT', type: 'rut', placeholder: '12.345.678-9', required: true },
      { name: 'DOMICILIO_DENUNCIADO', label: 'Su Domicilio', type: 'text', placeholder: 'Calle 1, Stgo', required: true },
      { name: 'COMUNA_DENUNCIADO', label: 'Su Comuna', type: 'text', placeholder: 'Santiago', required: true },
      { name: 'TELEFONO_CONTACTO', label: 'Teléfono', type: 'tel', placeholder: '+56912345678', required: true },
      { name: 'CORREO_ELECTRONICO', label: 'Correo', type: 'email', placeholder: 'correo@ej.cl', required: true },
      { name: 'NUMERO_PARTE', label: 'Número de Parte', type: 'text', placeholder: '987654', required: true },
      { name: 'FECHA_PARTE', label: 'Fecha del Parte', type: 'date', placeholder: 'DD/MM/AAAA', required: true },
      { name: 'NOMBRE_MINISTRO_FE', label: 'Funcionario que emitió (Inspector/Carabinero)', type: 'text', placeholder: 'Inspector Municipal N° 12', required: true },
      { name: 'PATENTE_VEHICULO', label: 'Patente del Vehículo (si aplica)', type: 'text', placeholder: 'BBBB12', required: false },
      { name: 'DETALLE_INFRACCION_REPORTADA', label: 'Infracción Acusada', type: 'text', placeholder: 'Mal estacionado', required: true },
      { name: 'ARTICULO_LEY_TRANSITO', label: 'Artículo citado (Opcional)', type: 'text', placeholder: 'Art. 154', required: false },
      { name: 'EXPLICACION_Y_DEFENSA_HECHOS', label: 'Defensa (¿Por qué no corresponde?)', type: 'textarea', placeholder: 'El vehículo estaba detenido por falla mecánica...', required: true }
    ]
  },
  {
    docId: 'otro',
    fields: [
      NOMBRE, RUT, DOMICILIO, EMAIL, TELEFONO,
      { name: 'tipoOtro', label: 'Tipo de Documento', type: 'select', required: true, options: [
        { value: 'declaracion', label: 'Declaración Jurada' },
        { value: 'mutuo', label: 'Contrato de Mutuo' },
        { value: 'pagare', label: 'Pagaré' },
        { value: 'poder', label: 'Poder Notarial' },
        { value: 'denuncia', label: 'Denuncia' },
        { value: 'arrendamiento', label: 'Contrato Arrendamiento' },
        { value: 'proteccion', label: 'Recurso Protección' },
        { value: 'familia', label: 'Derecho de Familia' },
      ]},
      DETALLE,
    ],
  },
];

export function getFormForDoc(docId: string): FormField[] {
  const config = FORM_CONFIGS.find(c => c.docId === docId);
  return config?.fields ?? FORM_CONFIGS.find(c => c.docId === 'otro')?.fields ?? [];
}
