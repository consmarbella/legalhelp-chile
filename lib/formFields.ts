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
