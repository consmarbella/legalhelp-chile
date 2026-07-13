// Enlaces a leyes chilenas en LeyChile (Biblioteca del Congreso Nacional)
// Cada entrada mapea una referencia legal a su URL oficial en bcn.cl

export interface LeyInfo {
  nombre: string;
  url: string;
  descripcion: string;
}

export const LEYES: Record<string, LeyInfo> = {
  "Art. 2515 CC": {
    nombre: "Artículo 2515 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Prescripción de acciones: 5 años acción ordinaria, 3 años acción ejecutiva",
  },
  "Art. 2521 CC": {
    nombre: "Artículo 2521 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Prescripción de multas de tránsito: 3 años",
  },
  "Art. 1545 CC": {
    nombre: "Artículo 1545 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Los contratos son ley para las partes",
  },
  "Art. 1554 CC": {
    nombre: "Artículo 1554 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Requisitos de la promesa de contrato",
  },
  "Art. 1793 CC": {
    nombre: "Artículo 1793 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Definición de compraventa",
  },
  "Art. 2116 CC": {
    nombre: "Artículo 2116 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Definición de mandato civil",
  },
  "Art. 2130 CC": {
    nombre: "Artículo 2130 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Mandato especial limitado a actos determinados",
  },
  "Art. 1946 CC": {
    nombre: "Artículo 1946 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Subarriendo requiere autorización expresa del arrendador",
  },
  "Art. 59 CC": {
    nombre: "Artículo 59 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Definición de domicilio",
  },
  "Art. 229 CC": {
    nombre: "Artículo 229 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Régimen de visitas y relación directa y regular",
  },
  "Art. 321 CC": {
    nombre: "Artículo 321 del Código Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Obligación alimenticia entre parientes",
  },
  "Art. 9 Código del Trabajo": {
    nombre: "Artículo 9 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Obligación de escriturar el contrato de trabajo en 15 días",
  },
  "Art. 11 Código del Trabajo": {
    nombre: "Artículo 11 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Modificaciones al contrato de trabajo por mutuo acuerdo",
  },
  "Art. 40 bis Código del Trabajo": {
    nombre: "Artículo 40 bis del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Jornada parcial: máximo 30 horas semanales",
  },
  "Art. 154 N°10 Código del Trabajo": {
    nombre: "Artículo 154 N°10 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Sanciones deben constar en el Reglamento Interno",
  },
  "Art. 159 N°2 Código del Trabajo": {
    nombre: "Artículo 159 N°2 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Renuncia voluntaria del trabajador",
  },
  "Art. 159 N°4 Código del Trabajo": {
    nombre: "Artículo 159 N°4 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Plazo máximo contrato a plazo fijo: 1 año (2 años profesionales)",
  },
  "Art. 159 N°5 Código del Trabajo": {
    nombre: "Artículo 159 N°5 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Duración ligada a la faena específica",
  },
  "Art. 161 Código del Trabajo": {
    nombre: "Artículo 161 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Despido por necesidades de la empresa",
  },
  "Art. 163 Código del Trabajo": {
    nombre: "Artículo 163 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Indemnización por años de servicio",
  },
  "Art. 168 Código del Trabajo": {
    nombre: "Artículo 168 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Indemnizaciones por despido injustificado",
  },
  "Art. 177 Código del Trabajo": {
    nombre: "Artículo 177 del Código del Trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=207436&idParte=10190275",
    descripcion: "Ratificación del finiquito ante ministro de fe",
  },
  "Ley 18.101": {
    nombre: "Ley 18.101 - Arrendamiento de Predios Urbanos",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=29472",
    descripcion: "Regula el arrendamiento de predios urbanos en Chile",
  },
  "Ley 18.290": {
    nombre: "Ley 18.290 - Ley de Tránsito",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=29825",
    descripcion: "Ley de Tránsito de Chile",
  },
  "Ley 18.287": {
    nombre: "Ley 18.287 - Juzgados de Policía Local",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=29557",
    descripcion: "Procedimiento ante Juzgados de Policía Local",
  },
  "Ley 18.695": {
    nombre: "Ley 18.695 - Ley Orgánica Constitucional de Municipalidades",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=30077",
    descripcion: "Patentes y multas municipales",
  },
  "Ley 19.496": {
    nombre: "Ley 19.496 - Ley del Consumidor",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=61438",
    descripcion: "Protección de los derechos de los consumidores",
  },
  "Ley 19.947": {
    nombre: "Ley 19.947 - Ley de Matrimonio Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=243778",
    descripcion: "Regula el divorcio, alimentos y tuición",
  },
  "Ley 20.066": {
    nombre: "Ley 20.066 - Ley de Violencia Intrafamiliar",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=242648",
    descripcion: "Prevención y sanción de la violencia intrafamiliar",
  },
  "Ley 20.555": {
    nombre: "Ley 20.555 - SERNAC Financiero",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1030091",
    descripcion: "Regula la información y protección al consumidor financiero",
  },
  "Ley 20.680": {
    nombre: "Ley 20.680 - Coparentalidad y Tuición Compartida",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1071027",
    descripcion: "Cuidado personal compartido de los hijos",
  },
  "Ley 20.974": {
    nombre: "Ley 20.974 - Regulación de Cobranza Extrajudicial",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1130085",
    descripcion: "Regula la cobranza extrajudicial y prohíbe el hostigamiento",
  },
  "Ley 21.020": {
    nombre: "Ley 21.020 - Tenencia Responsable de Mascotas",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1106037",
    descripcion: "Sanciona el maltrato animal y regula la tenencia responsable",
  },
  "Ley 21.220": {
    nombre: "Ley 21.220 - Teletrabajo y Trabajo a Distancia",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1143741",
    descripcion: "Regula el trabajo a distancia y teletrabajo",
  },
  "Ley 21.389": {
    nombre: "Ley 21.389 - Registro Nacional de Deudores de Pensiones de Alimentos",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1170343",
    descripcion: "Crea el Registro Nacional de Deudores de Pensiones de Alimentos",
  },
  "Ley 14.908": {
    nombre: "Ley 14.908 - Ley de Pensiones Alimenticias",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=28148",
    descripcion: "Regula el pago de pensiones alimenticias",
  },
  "Ley 15.231": {
    nombre: "Ley 15.231 - Apelaciones ante Juzgados de Letras",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=28353",
    descripcion: "Apelación ante Juzgado de Letras dentro de 5 días",
  },
  "Ley 18.168": {
    nombre: "Ley 18.168 - General de Telecomunicaciones",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=29591",
    descripcion: "Regula los servicios de telecomunicaciones",
  },
  "Ley 19.300": {
    nombre: "Ley 19.300 - Ley de Bases del Medio Ambiente",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=30667",
    descripcion: "Regula la protección del medio ambiente y límites de ruido",
  },
  "Ley 19.537": {
    nombre: "Ley 19.537 - Copropiedad Inmobiliaria",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=70378",
    descripcion: "Regula la copropiedad de edificios y condominios",
  },
  "Ley 19.628": {
    nombre: "Ley 19.628 - Protección de Datos Personales",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=67089",
    descripcion: "Regula la protección de datos personales",
  },
  "DL 3.500": {
    nombre: "DL 3.500 - Sistema de Pensiones (AFP)",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=7147",
    descripcion: "Regula el sistema de pensiones de capitalización individual",
  },
  "Ley 17.322": {
    nombre: "Ley 17.322 - Cobro de Cotizaciones Previsionales",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=28982",
    descripcion: "Regula el cobro de cotizaciones previsionales",
  },
  "DS 64": {
    nombre: "DS 64 - Eliminación de Antecedentes Penales",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=16031",
    descripcion: "Regula la eliminación de antecedentes penales",
  },
  "DS 38/2011": {
    nombre: "DS 38/2011 - Norma de Emisión de Ruido",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1026031",
    descripcion: "Establece límites de ruido para zonas residenciales",
  },
  "DFL 1/2005 Salud": {
    nombre: "DFL 1/2005 - Ley de Isapres",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=249177",
    descripcion: "Regula las Instituciones de Salud Previsional",
  },
  "DFL 251/1931": {
    nombre: "DFL 251/1931 - Ley de Seguros",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=22111",
    descripcion: "Regula los contratos de seguro en Chile",
  },
  "Art. 20 Constitución": {
    nombre: "Artículo 20 de la Constitución Política - Recurso de Protección",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=242302&idParte=10281715",
    descripcion: "Recurso de protección de derechos fundamentales",
  },
  "Art. 207 CP": {
    nombre: "Artículo 207 del Código Penal",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1984&idParte=8717776",
    descripcion: "Sanción por declaración falsa o perjurio",
  },
  "Art. 434 N°4 CPC": {
    nombre: "Artículo 434 N°4 del Código de Procedimiento Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=22740&idParte=8717776",
    descripcion: "Alzamiento de protesto bancario tras pago",
  },
  "Artículos 446 CPC": {
    nombre: "Artículos 446 y siguientes del Código de Procedimiento Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=22740&idParte=8717776",
    descripcion: "Procedimiento ejecutivo de embargo",
  },
  "Ley 21.643": {
    nombre: "Ley 21.643 (Ley Karin) — Acoso laboral, acoso sexual y violencia en el trabajo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=1199634",
    descripcion: "Regula la prevención, investigación y sanción del acoso laboral, acoso sexual y violencia en el trabajo",
  },
  "Art. 2196 CC": {
    nombre: "Artículo 2196 del Código Civil — Contrato de mutuo",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Contrato de mutuo o préstamo de consumo: el mutuante transfiere la propiedad de una cantidad de dinero al mutuario",
  },
  "Art. 688 CC": {
    nombre: "Artículo 688 del Código Civil — Posesión efectiva",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8717776",
    descripcion: "Posesión efectiva de la herencia: se otorga por el juez o el Registro Civil",
  },
  "Ley 19.903": {
    nombre: "Ley 19.903 — Posesión efectiva ante el Registro Civil",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=210595",
    descripcion: "Establece la tramitación de la posesión efectiva ante el Servicio de Registro Civil",
  },
  "Ley 20.027": {
    nombre: "Ley 20.027 — Crédito con Aval del Estado (CAE)",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=228792",
    descripcion: "Crea el sistema de Crédito con Aval del Estado para financiar estudios de educación superior",
  },
  "Ley 17.344": {
    nombre: "Ley 17.344 — Cambio de nombre y apellido",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=28595",
    descripcion: "Autoriza cambio de nombres y apellidos por justa causa ante tribunal civil",
  },
  "Art. 200 Código Tributario": {
    nombre: "Artículo 200 del Código Tributario",
    url: "https://www.bcn.cl/leychile/navegar?idNorma=6374",
    descripcion: "Prescripción de la acción del Fisco para el cobro de impuestos: 3 años",
  },
};

// Función helper para buscar una ley por texto parcial
export function findLey(texto: string): LeyInfo | null {
  // Buscar coincidencia exacta primero
  if (LEYES[texto]) return LEYES[texto];
  
  // Buscar por coincidencia parcial
  for (const [key, info] of Object.entries(LEYES)) {
    if (texto.includes(key) || key.includes(texto)) {
      return info;
    }
  }
  
  return null;
}
