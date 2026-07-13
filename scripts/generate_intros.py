#!/usr/bin/env python3
"""Genera intros unicas para paginas ciudad sin intro."""
import json, random
random.seed(42)

CIUDAD_DATA = {
    "Santiago": {"region": "Metropolitana"},
    "Providencia": {"region": "Metropolitana"},
    "Las Condes": {"region": "Metropolitana"},
    "Vitacura": {"region": "Metropolitana"},
    "Lo Barnechea": {"region": "Metropolitana"},
    "Nunoa": {"region": "Metropolitana"},
    "Maipu": {"region": "Metropolitana"},
    "La Florida": {"region": "Metropolitana"},
    "Puente Alto": {"region": "Metropolitana"},
    "San Bernardo": {"region": "Metropolitana"},
    "Pudahuel": {"region": "Metropolitana"},
    "Quilicura": {"region": "Metropolitana"},
    "Recoleta": {"region": "Metropolitana"},
    "Independencia": {"region": "Metropolitana"},
    "Penalolen": {"region": "Metropolitana"},
    "Estacion Central": {"region": "Metropolitana"},
    "El Bosque": {"region": "Metropolitana"},
    "La Reina": {"region": "Metropolitana"},
    "San Miguel": {"region": "Metropolitana"},
    "Renca": {"region": "Metropolitana"},
    "Cerrillos": {"region": "Metropolitana"},
    "Cerro Navia": {"region": "Metropolitana"},
    "Conchali": {"region": "Metropolitana"},
    "Huechuraba": {"region": "Metropolitana"},
    "Lampa": {"region": "Metropolitana"},
    "Colina": {"region": "Metropolitana"},
    "San Antonio": {"region": "Valparaiso"},
    "Valparaiso": {"region": "Valparaiso"},
    "Vina del Mar": {"region": "Valparaiso"},
    "Quilpue": {"region": "Valparaiso"},
    "Concepcion": {"region": "Biobio"},
    "Talcahuano": {"region": "Biobio"},
    "Los Angeles": {"region": "Biobio"},
    "Chillan": {"region": "Nuble"},
    "Temuco": {"region": "Araucania"},
    "Valdivia": {"region": "Los Rios"},
    "Osorno": {"region": "Los Lagos"},
    "Puerto Montt": {"region": "Los Lagos"},
    "Punta Arenas": {"region": "Magallanes"},
    "Coyhaique": {"region": "Aysen"},
    "Rancagua": {"region": "OHiggins"},
    "Talca": {"region": "Maule"},
    "Curico": {"region": "Maule"},
    "La Serena": {"region": "Coquimbo"},
    "Coquimbo": {"region": "Coquimbo"},
    "Antofagasta": {"region": "Antofagasta"},
    "Calama": {"region": "Antofagasta"},
    "Iquique": {"region": "Tarapaca"},
    "Arica": {"region": "Arica"},
    "Copiapo": {"region": "Atacama"},
}

REGION_DATA = {
    "Metropolitana": "la Region Metropolitana",
    "Valparaiso": "la Region de Valparaiso",
    "Biobio": "la Region del Biobio",
    "Nuble": "la Region de Nuble",
    "Araucania": "la Region de La Araucania",
    "Los Rios": "la Region de Los Rios",
    "Los Lagos": "la Region de Los Lagos",
    "Magallanes": "la Region de Magallanes",
    "Aysen": "la Region de Aysen",
    "OHiggins": "la Region de O'Higgins",
    "Maule": "la Region del Maule",
    "Coquimbo": "la Region de Coquimbo",
    "Antofagasta": "la Region de Antofagasta",
    "Tarapaca": "la Region de Tarapaca",
    "Arica": "la Region de Arica y Parinacota",
    "Atacama": "la Region de Atacama",
}

TEMPLATES = {
    "Prescripcion de deuda TAG": [
        "El {entidad}, ubicado en {direccion}, recibe solicitudes de prescripcion de deuda TAG. {ciudad}, en {region}, cuenta con autopistas urbanas concesionadas. Si tu multa TAG supera los 3 anos sin cobro judicial, la prescripcion puede extinguir la deuda.",
        "En {ciudad}, las deudas TAG pueden prescribir si han pasado mas de 3 anos sin accion judicial. El {entidad} ({direccion}) es el tribunal competente para {ciudad} y comunas aledanas de {region}.",
        "Si tienes deudas TAG en {ciudad} con mas de 3 anos desde el cobro, puedes solicitar la prescripcion ante el {entidad} ({direccion}). El proceso es gratuito y no requiere abogado para causas de menor cuantia.",
        "Deudas de autopista en {ciudad}? El Art. 2515 CC establece que las deudas TAG prescriben a los 5 anos (accion ordinaria) o 3 anos (accion ejecutiva). Presenta tu solicitud ante el {entidad} en {direccion}.",
        "En {ciudad}, {region}, muchas personas tienen deudas TAG sin saber que pueden prescribir. Si han pasado mas de 3 anos desde el cobro sin demanda judicial, el {entidad} ({direccion}) puede declarar la prescripcion.",
    ],
    "Prescripcion de deuda bancaria": [
        "El {entidad} ({direccion}) es competente para prescripciones bancarias en {ciudad}, {region}. Las deudas prescriben a los 5 anos (ordinaria) o 3 anos (ejecutiva) segun el Art. 2515 CC.",
        "En {ciudad}, las deudas bancarias pueden prescribir si han transcurrido los plazos legales sin cobro judicial. El {entidad} ({direccion}) recibe las solicitudes de prescripcion.",
        "Si tienes una deuda bancaria en {ciudad} que supero los plazos de prescripcion (3 anos ejecutiva, 5 anos ordinaria), presenta la solicitud ante el {entidad} ({direccion}).",
        "Deuda bancaria impaga en {ciudad}? Revisa si ha prescrito. El plazo de 3 anos (ejecutiva) o 5 anos (ordinaria) se cuenta desde que la deuda se hizo exigible. Tribunal competente: {entidad} ({direccion}).",
    ],
    "Prescripcion de multas de transito": [
        "El {entidad} ({direccion}) declara la prescripcion de multas de transito en {ciudad}, {region}. Las multas prescriben a los 3 anos segun el Art. 2521 CC.",
        "En {ciudad}, las multas de transito impagas prescriben tras 3 anos sin cobro ejecutivo. El {entidad} ({direccion}) es donde debes presentar la solicitud de prescripcion.",
        "Si tienes multas de transito en {ciudad} con mas de 3 anos desde la sentencia, solicita su prescripcion ante el {entidad} ({direccion}). No necesitas abogado para este tramite.",
        "Multas de transito antiguas en {ciudad}? El Art. 2521 CC establece que prescriben en 3 anos. Acude al {entidad} en {direccion} para solicitar la prescripcion.",
    ],
    "Poder simple": [
        "En {ciudad}, {region}, puedes otorgar un poder simple sin notario. Es valido ante {entidad} ({direccion}). Gratuito y sin ministro de fe. Solo necesitas dos testigos mayores de edad.",
        "El poder simple en {ciudad} permite delegar facultades a un tercero para tramites especificos. Se presenta ante {entidad} ({direccion}). No requiere notarizacion.",
        "Si necesitas un poder simple en {ciudad}, redactalo sin abogado. Es valido ante {entidad} ({direccion}) y en todo Chile. Incluye los datos del mandante, mandatario y las facultades especificas.",
        "Necesitas que alguien haga un tramite por ti en {ciudad}? El poder simple es la solucion mas rapida. Sin notario, sin abogado. Valido ante {entidad} ({direccion}).",
    ],
    "Poder simple notarial": [
        "En {ciudad}, {region}, el poder simple notarial se otorga ante notario publico. Es valido ante {entidad} ({direccion}) y en todo Chile para tramites que exigen firma notarial.",
        "El poder simple notarial en {ciudad} requiere la firma del poderdante ante notario. Valido ante {entidad} ({direccion}). Ideal para tramites bancarios y Registro Civil.",
        "Si necesitas un poder notarial en {ciudad}, concurre a una notaria con tu cedula de identidad. Valido ante {entidad} ({direccion}) y aceptado por todas las instituciones.",
    ],
    "Poder notarial": [
        "En {ciudad}, {region}, el poder notarial se otorga ante notario publico. Es exigido por bancos, conservadores y el Registro Civil. Valido ante {entidad} ({direccion}).",
        "El poder notarial en {ciudad} requiere firma ante notario. Es el documento mas seguro para delegar facultades. Valido ante {entidad} ({direccion}) y en todo Chile.",
        "Si necesitas un poder notarial en {ciudad}, concurre a una notaria con tu cedula de identidad. El costo aproximado es de $20.000 a $50.000. Valido ante {entidad} ({direccion}).",
    ],
    "Poder para cobrar finiquito": [
        "En {ciudad}, {region}, el poder para cobrar finiquito permite que un tercero cobre tu finiquito laboral. Se presenta ante {entidad} ({direccion}). Generalmente exige firma notarial.",
        "Si necesitas autorizar a alguien para cobrar tu finiquito en {ciudad}, otorga un poder especial ante {entidad} ({direccion}). El documento debe indicar expresamente la facultad de cobro.",
        "El poder para cobrar finiquito en {ciudad} autoriza a un tercero a recibir tu liquidacion final. Se tramita ante {entidad} ({direccion}). Recomendamos incluirlo con firma notarial.",
    ],
    "Poder para tramites bancarios": [
        "En {ciudad}, {region}, el poder para tramites bancarios autoriza a un tercero a operar tu cuenta. Se presenta ante {entidad} ({direccion}). Los bancos exigen que tenga menos de 1 ano.",
        "Si necesitas que alguien haga tramites bancarios en {ciudad}, otorga un poder notarial ante {entidad} ({direccion}). Incluye las facultades especificas: retiros, consultas, cierre de cuentas.",
        "El poder bancario en {ciudad} permite retiros y gestiones ante instituciones financieras. Se tramita ante {entidad} ({direccion}). Verifica con tu banco los requisitos especificos.",
    ],
    "Poder para vender vehiculo": [
        "En {ciudad}, {region}, el poder para vender vehiculo autoriza la transferencia en el Registro Civil. Se tramita ante {entidad} ({direccion}). Debe incluir datos del vehiculo (patente, VIN, marca).",
        "Si necesitas vender tu vehiculo en {ciudad} sin estar presente, otorga un poder notarial ante {entidad} ({direccion}). El mandatario podra firmar la transferencia en el Registro Civil.",
        "El poder para vender vehiculo en {ciudad} permite la transferencia de dominio en el Registro Civil. Se presenta ante {entidad} ({direccion}). Incluye patente, marca, modelo y ano del vehiculo.",
    ],
    "Mandato especial": [
        "En {ciudad}, {region}, el mandato especial delega facultades especificas para actos determinados. Se presenta ante {entidad} ({direccion}). Mas seguro que un poder general.",
        "Si necesitas un mandato especial en {ciudad}, redactalo sin abogado. Es valido ante {entidad} ({direccion}) para el acto especifico que necesitas realizar.",
        "El mandato especial en {ciudad} autoriza actos juridicos determinados. Se tramita ante {entidad} ({direccion}). No permite al mandatario actuar mas alla de lo indicado.",
    ],
    "Certificado de antecedentes para fines especiales": [
        "En {ciudad}, {region}, el certificado de antecedentes para fines especiales se solicita ante {entidad} ({direccion}). Tramite gratuito e inmediato. No reemplaza al certificado de antecedentes general.",
        "Si necesitas el certificado de antecedentes para fines especiales en {ciudad}, solicitarlo ante {entidad} ({direccion}). Es gratuito y se entrega al instante.",
        "El certificado de antecedentes para fines especiales en {ciudad} se obtiene ante {entidad} ({direccion}). A diferencia del certificado general, este no muestra ciertos tipos de condenas.",
    ],
    "Demanda de alimentos": [
        "En {ciudad}, {region}, la demanda de alimentos se presenta ante el {entidad} ({direccion}). El tribunal de familia competente para {ciudad} y sus alrededores.",
        "Si necesitas iniciar una demanda de alimentos en {ciudad}, presentala ante el {entidad} ({direccion}). El proceso puede incluir alimentos provisorios en los primeros dias.",
        "La demanda de alimentos en {ciudad} se tramita ante el {entidad} ({direccion}). Necesitaras los datos del demandado, los ingresos de ambas partes y las necesidades del alimentario.",
    ],
    "Demanda de desalojo por no pago": [
        "En {ciudad}, {region}, la demanda de desalojo se presenta ante el {entidad} ({direccion}). Con la Ley 21.461, el proceso puede resolverse en 30 a 60 dias.",
        "Si necesitas un desalojo en {ciudad}, presentalo ante el {entidad} ({direccion}). Necesitaras el contrato de arriendo y los comprobantes de impago.",
        "La demanda de desalojo en {ciudad} se tramita ante el {entidad} ({direccion}). El proceso acelerado de la Ley 21.461 permite recuperar la propiedad en meses.",
    ],
    "Denuncia por despido injustificado": [
        "En {ciudad}, {region}, la denuncia por despido injustificado se presenta ante el {entidad} ({direccion}). Tienes 60 dias habiles desde el despido para denunciar.",
        "Si fuiste despedido en {ciudad}, denuncialo ante el {entidad} ({direccion}). El proceso es gratuito y no requiere abogado para la primera etapa.",
        "La denuncia por despido en {ciudad} se tramita ante el {entidad} ({direccion}). Corresponde indemnizacion por anos de servicio mas recargo del 30% si el despido es injustificado.",
    ],
    "Denuncia por no pago de cotizaciones": [
        "En {ciudad}, {region}, la denuncia por no pago de cotizaciones se presenta ante el {entidad} ({direccion}). El empleador puede ser multado y obligado al pago retroactivo.",
        "Si tu empleador no pago cotizaciones en {ciudad}, denuncialo ante el {entidad} ({direccion}). La AFP o Isapre afectada tambien puede orientarte.",
        "La denuncia por cotizaciones impagas en {ciudad} se tramita ante el {entidad} ({direccion}). El empleador arriesga multas, reajustes e intereses sobre las sumas no pagadas.",
    ],
    "Recurso de proteccion": [
        "En {ciudad}, {region}, el recurso de proteccion se presenta ante el {entidad} ({direccion}). Tienes 30 dias corridos desde el acto que vulnera tus derechos.",
        "Si necesitas un recurso de proteccion en {ciudad}, presentalo ante el {entidad} ({direccion}). Este recurso protege derechos fundamentales como la libertad, propiedad e igualdad.",
        "El recurso de proteccion en {ciudad} se tramita ante el {entidad} ({direccion}). Esta consagrado en el Art. 20 de la Constitucion chilena.",
    ],
    "Carta reclamo SERNAC": [
        "En {ciudad}, {region}, la carta reclamo SERNAC se presenta en {direccion}. Tambien puedes hacerlo online en sernac.cl. La empresa tiene 10 dias habiles para responder.",
        "Si necesitas reclamar en {ciudad}, haz tu carta reclamo SERNAC en {direccion}. El tramite es gratuito y no requiere abogado.",
        "La carta reclamo SERNAC en {ciudad} se presenta en {direccion}. Sirve como respaldo para escalar el reclamo a mediacion o juicio si no hay respuesta.",
    ],
    "Carta reclamo aerolinea": [
        "En {ciudad}, {region}, reclama contra una aerolinea ante SERNAC ({direccion}) o la Junta Aeronautica Civil (JAC). Tienes 6 meses para reclamar.",
        "Si tuviste problemas con un vuelo en {ciudad}, reclama ante SERNAC ({direccion}). Puedes exigir reembolso, reubicacion o compensacion por gastos.",
        "La carta reclamo aerolinea en {ciudad} se tramita ante SERNAC ({direccion}). Incluye numero de vuelo, fecha, ruta y descripcion del problema.",
    ],
    "Carta reclamo banco": [
        "En {ciudad}, {region}, reclama contra tu banco ante SERNAC ({direccion}) o la CMF. El SERNAC Financiero (Ley 20.555) protege tus derechos como consumidor financiero.",
        "Si tienes un problema bancario en {ciudad}, reclama ante SERNAC ({direccion}). Cobros no autorizados, comisiones indebidas o malas practicas son reclamables.",
        "La carta reclamo banco en {ciudad} se presenta ante SERNAC ({direccion}). El banco tiene 10 dias habiles para responder.",
    ],
    "Carta reclamo Isapre": [
        "En {ciudad}, {region}, reclama contra tu Isapre ante la Superintendencia de Salud ({direccion}). La mediacion es gratuita.",
        "Si tu Isapre rechazo una prestacion en {ciudad}, reclama ante la Superintendencia ({direccion}). Tienes 6 meses desde el rechazo para recurrir.",
        "La carta reclamo Isapre en {ciudad} se tramita ante la Superintendencia de Salud ({direccion}). Incluye el detalle de la prestacion rechazada y los fundamentos.",
    ],
    "Carta reclamo empresa de telecomunicaciones": [
        "En {ciudad}, {region}, reclama contra tu empresa de telecomunicaciones ante SERNAC ({direccion}) o SUBTEL. La Ley 18.168 garantiza velocidad minima y calidad de servicio.",
        "Si tienes problemas de internet o telefonia en {ciudad}, reclama ante SERNAC ({direccion}). La empresa tiene 10 dias habiles para resolver.",
        "La carta reclamo telecomunicaciones en {ciudad} se presenta ante SERNAC ({direccion}). Puedes reclamar por servicio deficiente, cobros indebidos o incumplimiento.",
    ],
    "Carta reclamo seguro": [
        "En {ciudad}, {region}, reclama contra tu aseguradora ante la CMF ({direccion}). La aseguradora tiene 10 dias para pronunciarse sobre la cobertura.",
        "Si tu aseguradora rechazo tu siniestro en {ciudad}, reclama ante la CMF ({direccion}). Las exclusiones deben estar expresamente indicadas en la poliza.",
        "La carta reclamo seguro en {ciudad} se tramita ante la CMF ({direccion}). Incluye numero de poliza, fecha del siniestro y motivo del rechazo.",
    ],
    "Carta reclamo tienda retail": [
        "En {ciudad}, {region}, reclama contra una tienda retail ante SERNAC ({direccion}). La garantia legal minima es de 3 meses para productos nuevos.",
        "Si compraste un producto defectuoso en {ciudad}, reclama ante SERNAC ({direccion}). Puedes exigir reparacion, reposicion o devolucion del dinero.",
        "La carta reclamo tienda retail en {ciudad} se presenta ante SERNAC ({direccion}). Incluye comprobante de compra, descripcion de la falla y la solucion que solicitas.",
    ],
    "Contrato de arriendo de casa": [
        "En {ciudad}, {region}, el contrato de arriendo de casa se rige por la Ley 18.101. Se registra ante {entidad} ({direccion}). La garantia habitual es de 1 a 2 meses de renta.",
        "Si necesitas arrendar una casa en {ciudad}, el contrato se presenta ante {entidad} ({direccion}). Incluye plazo, renta, garantia y causales de termino.",
        "El contrato de arriendo de casa en {ciudad} se tramita ante {entidad} ({direccion}). El desahucio requiere 2 meses de aviso segun la ley.",
    ],
    "Contrato de arriendo de departamento": [
        "En {ciudad}, {region}, el contrato de arriendo de departamento cumple la Ley 18.101 y 19.537 de Copropiedad. Ante {entidad} ({direccion}).",
        "Si necesitas arrendar un departamento en {ciudad}, el contrato se presenta ante {entidad} ({direccion}). Los gastos comunes los paga el arrendatario salvo pacto en contrario.",
        "El contrato de arriendo de departamento en {ciudad} se tramita ante {entidad} ({direccion}). Revisa el reglamento de copropiedad antes de firmar.",
    ],
    "Contrato de arriendo de local comercial": [
        "En {ciudad}, {region}, el contrato de arriendo de local comercial se rige por la Ley 18.101. Ante {entidad} ({direccion}). Puede incluir renta variable ligada a ventas.",
        "Si necesitas arrendar un local comercial en {ciudad}, el contrato se presenta ante {entidad} ({direccion}). Las mejoras quedan en beneficio del arrendador salvo pacto.",
        "El contrato de arriendo comercial en {ciudad} se tramita ante {entidad} ({direccion}). El plazo de desahucio es de 2 meses para locales comerciales.",
    ],
    "Contrato de subarriendo": [
        "En {ciudad}, {region}, el subarriendo requiere autorizacion expresa del arrendador (Art. 1946 CC). Ante {entidad} ({direccion}).",
        "Si necesitas subarrendar en {ciudad}, el contrato se presenta ante {entidad} ({direccion}). Sin autorizacion del arrendador, es causal de desalojo.",
        "El subarriendo en {ciudad} permite ceder parcialmente el inmueble. Se tramita ante {entidad} ({direccion}). El subarrendatario no tiene vinculo con el arrendador original.",
    ],
    "Carta de termino de contrato de arriendo": [
        "En {ciudad}, {region}, el termino de arriendo requiere 2 meses de aviso segun la Ley 18.101. Ante {entidad} ({direccion}).",
        "Si necesitas terminar un arriendo en {ciudad}, la carta se presenta ante {entidad} ({direccion}). Debe notificarse por carta certificada o personalmente.",
        "La carta de termino de arriendo en {ciudad} notifica la no renovacion. Se tramita ante {entidad} ({direccion}). El arrendatario tiene 2 meses para desocupar.",
    ],
    "Carta de cobro de arriendo impago": [
        "En {ciudad}, {region}, el cobro de arriendo impago es previo al desalojo (Ley 18.101). Ante {entidad} ({direccion}).",
        "Si tu arrendatario no paga en {ciudad}, la carta se presenta ante {entidad} ({direccion}). Detalla los meses adeudados y el plazo para pagar.",
        "La carta de cobro de arriendo en {ciudad} es el requerimiento previo a la demanda. Se tramita ante {entidad} ({direccion}). Basta 1 mes de atraso para iniciar acciones.",
    ],
    "Contrato de trabajo indefinido": [
        "En {ciudad}, {region}, el contrato indefinido se escritura en 15 dias segun el Art. 9 del Codigo del Trabajo. Ante {entidad} ({direccion}).",
        "Si necesitas un contrato indefinido en {ciudad}, presentalo ante {entidad} ({direccion}). No tiene fecha de termino y solo termina por causales legales.",
        "El contrato indefinido en {ciudad} se registra ante {entidad} ({direccion}). El trabajador tiene derecho a indemnizacion por anos de servicio si es despedido.",
    ],
    "Contrato de trabajo a plazo fijo": [
        "En {ciudad}, {region}, el contrato a plazo fijo dura maximo 1 ano (2 anos para profesionales). Ante {entidad} ({direccion}).",
        "Si necesitas un contrato a plazo fijo en {ciudad}, presentalo ante {entidad} ({direccion}). Tras la segunda renovacion se convierte en indefinido.",
        "El contrato a plazo fijo en {ciudad} se registra ante {entidad} ({direccion}). Al termino del plazo no corresponde indemnizacion por anos de servicio.",
    ],
    "Contrato de trabajo por obra o faena": [
        "En {ciudad}, {region}, el contrato por obra o faena esta ligado a un proyecto especifico. Ante {entidad} ({direccion}).",
        "Si necesitas un contrato por obra en {ciudad}, presentalo ante {entidad} ({direccion}). Termina al finalizar la obra o faena pactada.",
        "El contrato por obra en {ciudad} termina al finalizar la obra. Se tramita ante {entidad} ({direccion}). No puede usarse para encubrir una relacion laboral permanente.",
    ],
    "Contrato de trabajo part-time": [
        "En {ciudad}, {region}, el contrato part-time tiene maximo 30 horas semanales (Art. 40 bis CT). Ante {entidad} ({direccion}).",
        "Si necesitas un contrato part-time en {ciudad}, presentalo ante {entidad} ({direccion}). La remuneracion es proporcional a las horas trabajadas.",
        "El contrato part-time en {ciudad} se registra ante {entidad} ({direccion}). Los trabajadores part-time tienen derecho a feriado proporcional.",
    ],
    "Contrato de trabajo teletrabajo": [
        "En {ciudad}, {region}, el teletrabajo se rige por la Ley 21.220. Ante {entidad} ({direccion}). El empleador debe proveer equipos y respetar la desconexion.",
        "Si necesitas un contrato de teletrabajo en {ciudad}, presentalo ante {entidad} ({direccion}). El trabajador tiene derecho a 12 horas continuas de desconexion.",
        "El contrato de teletrabajo en {ciudad} se registra ante {entidad} ({direccion}). Debe ser acordado por ambas partes mediante anexo de contrato.",
    ],
    "Contrato de prestacion de servicios a honorarios": [
        "En {ciudad}, {region}, el contrato a honorarios no genera vinculo laboral (Art. 1545 CC). Ante {entidad} ({direccion}).",
        "Si necesitas un contrato a honorarios en {ciudad}, presentalo ante {entidad} ({direccion}). El prestador paga sus propias cotizaciones.",
        "El contrato a honorarios en {ciudad} se registra ante {entidad} ({direccion}). Si hay subordinacion, puede recaracterizarse como relacion laboral.",
    ],
    "Contrato freelance": [
        "En {ciudad}, {region}, el contrato freelance se rige por el Art. 1545 CC. Ante {entidad} ({direccion}).",
        "Si necesitas un contrato freelance en {ciudad}, presentalo ante {entidad} ({direccion}). Incluye descripcion del servicio, plazos, forma de pago y propiedad intelectual.",
        "El contrato freelance en {ciudad} protege a ambas partes. Se tramita ante {entidad} ({direccion}). El creador retiene los derechos de autor salvo cesion expresa.",
    ],
    "Contrato de compraventa de vehiculo": [
        "En {ciudad}, {region}, la compraventa de vehiculo cumple la Ley 18.290 Art. 27. Ante {entidad} ({direccion}).",
        "Si necesitas comprar o vender un vehiculo en {ciudad}, el contrato se presenta ante {entidad} ({direccion}). La transferencia debe hacerse en 30 dias habiles.",
        "La compraventa de vehiculo en {ciudad} requiere transferencia en el Registro Civil. Se tramita ante {entidad} ({direccion}). Revisa multas y prendas antes de comprar.",
    ],
    "Contrato de compraventa de bien mueble": [
        "En {ciudad}, {region}, la compraventa de bien mueble se perfecciona con la entrega (Art. 1793 CC). Ante {entidad} ({direccion}).",
        "Si necesitas comprar o vender un bien mueble en {ciudad}, el contrato se presenta ante {entidad} ({direccion}). No requiere notarizacion.",
        "La compraventa de bien mueble en {ciudad} no requiere notarizacion. Se tramita ante {entidad} ({direccion}). La propiedad se transfiere con la entrega del bien.",
    ],
    "Promesa de compraventa de inmueble": [
        "En {ciudad}, {region}, la promesa de compraventa cumple Art. 1554 CC. Escrita, con plazo y multa. Ante {entidad} ({direccion}).",
        "Si necesitas una promesa de compraventa en {ciudad}, presentala ante {entidad} ({direccion}). Es previa a la escrituracion definitiva.",
        "La promesa de compraventa en {ciudad} es previa a la escrituracion. Se tramita ante {entidad} ({direccion}). Debe contener plazo, precio y condiciones.",
    ],
    "Carta de renuncia laboral": [
        "En {ciudad}, {region}, la renuncia laboral se rige por Art. 159 N2 CT. Ante {entidad} ({direccion}).",
        "Si necesitas renunciar en {ciudad}, la carta se presenta ante {entidad} ({direccion}). No requiere aviso previo pero se recomienda 30 dias.",
        "La carta de renuncia en {ciudad} no requiere aviso previo. Se tramita ante {entidad} ({direccion}). El empleador puede descontar los dias de aviso no dados.",
    ],
    "Finiquito laboral": [
        "En {ciudad}, {region}, el finiquito se ratifica ante ministro de fe (Art. 177 CT). Ante {entidad} ({direccion}).",
        "Si necesitas firmar tu finiquito en {ciudad}, ratificalo ante {entidad} ({direccion}). El empleador tiene 10 dias habiles para pagar.",
        "El finiquito en {ciudad} pone termino a la relacion laboral. Se tramita ante {entidad} ({direccion}). Incluye indemnizaciones y vacaciones proporcionales.",
    ],
    "Carta de amonestacion laboral": [
        "En {ciudad}, {region}, la amonestacion laboral se basa en el Reglamento Interno (Art. 154 N10 CT). Ante {entidad} ({direccion}).",
        "Si necesitas amonestar a un trabajador en {ciudad}, la carta se presenta ante {entidad} ({direccion}). Debe aplicarse dentro de 10 dias de conocida la falta.",
        "La amonestacion laboral en {ciudad} es el primer paso disciplinario. Se tramita ante {entidad} ({direccion}). La acumulacion puede configurar causal de despido.",
    ],
    "Anexo de contrato de trabajo (actualizacion de sueldo)": [
        "En {ciudad}, {region}, el anexo de sueldo se rige por Art. 11 CT. Ante {entidad} ({direccion}).",
        "Si necesitas actualizar un sueldo en {ciudad}, el anexo se presenta ante {entidad} ({direccion}). Debe firmarse dentro de 5 dias del acuerdo.",
        "El anexo de sueldo en {ciudad} modifica condiciones laborales. Se tramita ante {entidad} ({direccion}). Toda modificacion debe quedar por escrito.",
    ],
    "Carta de cobranza de deuda": [
        "En {ciudad}, {region}, la cobranza de deuda cumple Ley 20.974. Ante {entidad} ({direccion}).",
        "Si necesitas cobrar una deuda en {ciudad}, la carta se presenta ante {entidad} ({direccion}). No puede incluir hostigamiento segun la ley.",
        "La carta de cobranza en {ciudad} es previa a acciones judiciales. Se tramita ante {entidad} ({direccion}). La ley prohibe llamadas antes de las 8:00 o despues de las 21:00.",
    ],
    "Acuerdo de pago de deuda": [
        "En {ciudad}, {region}, el acuerdo de pago tiene fuerza de ley (Art. 1545 CC). Ante {entidad} ({direccion}).",
        "Si necesitas un acuerdo de pago en {ciudad}, presentalo ante {entidad} ({direccion}). Puede incluir condonacion parcial de intereses.",
        "El acuerdo de pago en {ciudad} regulariza obligaciones. Se tramita ante {entidad} ({direccion}). Si se incumple, todas las cuotas se hacen exigibles.",
    ],
    "Solicitud de alzamiento de protesto bancario": [
        "En {ciudad}, {region}, el alzamiento de protesto se solicita al banco emisor. Ante {entidad} ({direccion}). El banco tiene 3 dias para informar el alzamiento.",
        "Si tienes un protesto en {ciudad}, solicita su alzamiento ante {entidad} ({direccion}). Necesitas el comprobante de pago de la deuda.",
        "El alzamiento de protesto en {ciudad} elimina el registro negativo. Se tramita ante {entidad} ({direccion}). Una vez pagado, DICOM debe eliminar el registro en 3 dias.",
    ],
    "Carta de prescripcion de deuda general": [
        "En {ciudad}, {region}, la prescripcion de deuda se basa en Art. 2515 CC. 5 anos ordinaria, 3 anos ejecutiva. Ante {entidad} ({direccion}).",
        "Si tienes una deuda prescrita en {ciudad}, la carta se presenta ante {entidad} ({direccion}). La prescripcion no opera de oficio, debes solicitarla.",
        "La carta de prescripcion en {ciudad} notifica al acreedor. Se tramita ante {entidad} ({direccion}). Solo la demanda judicial interrumpe la prescripcion.",
    ],
    "Eliminacion de antecedentes penales": [
        "En {ciudad}, {region}, la eliminacion de antecedentes penales se solicita ante {entidad} ({direccion}). DS 64 del Ministerio de Justicia.",
        "Si necesitas eliminar tus antecedentes en {ciudad}, solicitarlo ante {entidad} ({direccion}). Requiere que hayan pasado 5 o 10 anos segun el delito.",
        "La eliminacion de antecedentes en {ciudad} se tramita ante {entidad} ({direccion}). No aplica para delitos sexuales ni terroristas.",
    ],
    "Limpieza de hoja de vida del conductor": [
        "En {ciudad}, {region}, la limpieza de hoja de vida del conductor se solicita ante {entidad} ({direccion}). Elimina infracciones del registro del conductor.",
        "Si necesitas limpiar tu hoja de vida en {ciudad}, solicitarlo ante {entidad} ({direccion}). Las infracciones graves prescriben a los 3 anos.",
        "La limpieza de hoja de vida en {ciudad} se tramita ante {entidad} ({direccion}). Es necesaria para renovar licencia de conducir.",
    ],
    "Omision de antecedentes por violencia intrafamiliar": [
        "En {ciudad}, {region}, la omision de antecedentes VIF se solicita ante {entidad} ({direccion}). Ley 20.066 mas DS 64.",
        "Si necesitas omitir antecedentes VIF en {ciudad}, solicitarlo ante {entidad} ({direccion}). Protege a victimas de violencia intrafamiliar.",
        "La omision de antecedentes VIF en {ciudad} se tramita ante {entidad} ({direccion}). Permite que ciertos antecedentes no aparezcan en certificados.",
    ],
    "Registro Nacional de Deudores de Pensiones de Alimentos": [
        "En {ciudad}, {region}, el Registro de Deudores de Pensiones se consulta ante {entidad} ({direccion}). Ley 21.389.",
        "Si necesitas consultar el registro de deudores en {ciudad}, hacelo ante {entidad} ({direccion}). Incluye a quienes deben pensiones alimenticias.",
        "El Registro de Deudores en {ciudad} se consulta ante {entidad} ({direccion}). Si estas en el registro, no puedes salir del pais ni obtener ciertos creditos.",
    ],
    "Alzamiento de embargo sobre vehiculo": [
        "En {ciudad}, {region}, el alzamiento de embargo vehicular se solicita ante {entidad} ({direccion}). Requiere pago de la deuda o acuerdo.",
        "Si necesitas alzar un embargo en {ciudad}, solicitarlo ante {entidad} ({direccion}). El vehiculo debe estar libre de gravamenes para transferirlo.",
        "El alzamiento de embargo en {ciudad} se tramita ante {entidad} ({direccion}). Una vez alzado, puedes vender o transferir el vehiculo.",
    ],
    "Servicios legales": [
        "En {ciudad}, {region}, los servicios legales de LegalHelp estan disponibles para todos tus tramites. Ante {entidad} ({direccion}).",
        "Si necesitas servicios legales en {ciudad}, LegalHelp te asiste ante {entidad} ({direccion}). Documentos listos en minutos.",
        "Los servicios legales en {ciudad} se gestionan ante {entidad} ({direccion}). Genera tu documento legal al instante.",
    ],
    "Escrito de defensa por infraccion de transito": [
        "En {ciudad}, {region}, el escrito de defensa se presenta ante el {entidad} ({direccion}). Tienes 5 dias desde la notificacion de la multa.",
        "Si recibiste una multa de transito en {ciudad}, presenta tu defensa ante el {entidad} ({direccion}). No necesitas abogado para infracciones de transito.",
        "El escrito de defensa en {ciudad} se tramita ante el {entidad} ({direccion}). Puedes impugnar por errores formales o falta de pruebas.",
    ],
    "Escrito de prescripcion de multa de transito": [
        "En {ciudad}, {region}, la prescripcion de multa de transito se solicita ante el {entidad} ({direccion}). 3 anos segun Art. 2521 CC.",
        "Si tu multa de transito en {ciudad} tiene mas de 3 anos, solicita la prescripcion ante el {entidad} ({direccion}). La prescripcion no es automatica.",
        "La prescripcion de multa en {ciudad} se tramita ante el {entidad} ({direccion}). Extingue la obligacion de pago pero no elimina el registro.",
    ],
    "Recurso de apelacion ante Juzgado de Policia Local": [
        "En {ciudad}, {region}, la apelacion ante JPL se presenta en 5 dias. Ante el {entidad} ({direccion}).",
        "Si apelas una sentencia del JPL en {ciudad}, presentala ante el {entidad} ({direccion}). El Juzgado de Letras resuelve en 15 dias.",
        "La apelacion JPL en {ciudad} se tramita ante el {entidad} ({direccion}). Puede suspender el pago de la multa mientras se resuelve.",
    ],
    "Denuncia por ruidos molestos de vecinos": [
        "En {ciudad}, {region}, denuncia ruidos molestos ante el JPL. Limite: 45 dB nocturno (DS 38/2011). Ante {entidad} ({direccion}).",
        "Si tienes ruidos molestos en {ciudad}, denuncialo ante el {entidad} ({direccion}). Necesitas medicion de ruido o testigos.",
        "La denuncia por ruidos en {ciudad} se tramita ante el {entidad} ({direccion}). Las multas van de 1 a 5 UTM por infraccion.",
    ],
    "Denuncia por maltrato animal": [
        "En {ciudad}, {region}, denuncia maltrato animal ante Carabineros o JPL (Ley 21.020). Ante {entidad} ({direccion}).",
        "Si ves maltrato animal en {ciudad}, denuncialo ante el {entidad} ({direccion}). Las multas van de 10 a 30 UTM.",
        "La denuncia por maltrato animal en {ciudad} se tramita ante el {entidad} ({direccion}). En casos graves, puede haber sancion penal.",
    ],
    "Escrito de impugnacion de multa municipal": [
        "En {ciudad}, {region}, impugna una multa municipal en 30 dias. Ante el {entidad} ({direccion}).",
        "Si recibiste una multa municipal en {ciudad}, impugnala ante el {entidad} ({direccion}). La impugnacion suspende el pago.",
        "La impugnacion de multa municipal en {ciudad} se tramita ante el {entidad} ({direccion}). Puedes impugnar por errores de notificacion o fondo.",
    ],
    "Acuerdo de divorcio por mutuo acuerdo": [
        "En {ciudad}, {region}, el divorcio de mutuo acuerdo requiere 1 ano de separacion (Ley 19.947). Ante el {entidad} ({direccion}).",
        "Si necesitas divorciarte en {ciudad}, el acuerdo se presenta ante el {entidad} ({direccion}). Incluye alimentos, visitas y bienes.",
        "El divorcio de mutuo acuerdo en {ciudad} se tramita ante el {entidad} ({direccion}). El proceso completo dura entre 3 y 6 meses.",
    ],
    "Convenio de regulacion de divorcio": [
        "En {ciudad}, {region}, el convenio regulador del divorcio se aprueba ante el {entidad} ({direccion}).",
        "Si necesitas un convenio de divorcio en {ciudad}, presentalo ante el {entidad} ({direccion}). Tiene fuerza de sentencia una vez aprobado.",
        "El convenio de divorcio en {ciudad} tiene fuerza de sentencia. Ante el {entidad} ({direccion}). Puede modificarse si cambian las circunstancias.",
    ],
    "Acuerdo de tuicion compartida": [
        "En {ciudad}, {region}, la tuicion compartida se rige por Ley 20.680. Ante el {entidad} ({direccion}).",
        "Si necesitas tuicion compartida en {ciudad}, el acuerdo se presenta ante el {entidad} ({direccion}). El hijo vive alternadamente con ambos padres.",
        "La tuicion compartida en {ciudad} se tramita ante el {entidad} ({direccion}). Se pagan alimentos segun la diferencia de ingresos.",
    ],
    "Solicitud de regimen de visitas": [
        "En {ciudad}, {region}, el regimen de visitas se solicita ante el {entidad} ({direccion}).",
        "Si necesitas un regimen de visitas en {ciudad}, solicitarlo ante el {entidad} ({direccion}). Tambien los abuelos pueden solicitar visitas.",
        "El regimen de visitas en {ciudad} se tramita ante el {entidad} ({direccion}). El regimen mas comun es fines de semana alternados.",
    ],
    "Contrato de trabajo part-time": [
        "En {ciudad}, {region}, el contrato part-time tiene maximo 30 horas semanales (Art. 40 bis CT). Ante {entidad} ({direccion}).",
        "Si necesitas un contrato part-time en {ciudad}, presentalo ante {entidad} ({direccion}). La remuneracion es proporcional a las horas trabajadas.",
        "El contrato part-time en {ciudad} se registra ante {entidad} ({direccion}). Los trabajadores part-time tienen derecho a feriado proporcional.",
    ],
};

def generate_intro(item):
    """Genera una intro unica para una pagina ciudad."""
    cat = item['categoria']
    ciudad = item['variable']
    entidad = item['entidad']
    direccion = item['direccion']
    
    region = ""
    if ciudad in CIUDAD_DATA:
        region = REGION_DATA.get(CIUDAD_DATA[ciudad]["region"], "")
    
    if cat not in TEMPLATES:
        # Fallback generico con region si esta disponible
        if region:
            return f"En {ciudad}, {region}, este tramite se realiza ante {entidad} ubicado en {direccion}. LegalHelp te genera el documento listo para presentar en minutos."
        return f"En {ciudad}, este tramite se realiza ante {entidad} ubicado en {direccion}. LegalHelp te genera el documento listo para presentar en minutos."
    
    templates = TEMPLATES[cat]
    idx = hash(ciudad + cat) % len(templates)
    return templates[idx].format(entidad=entidad, direccion=direccion, ciudad=ciudad, region=region)

def main():
    with open(r'c:\Users\matte\OneDrive\Escritorio\legalhel.cl final\legalhelp-chile\data\paginas.json', 'r', encoding='utf-8') as f:
        paginas = json.load(f)
    
    count = 0
    for item in paginas:
        if item.get('variable') and not item.get('intro'):
            item['intro'] = generate_intro(item)
            count += 1
    
    with open(r'c:\Users\matte\OneDrive\Escritorio\legalhel.cl final\legalhelp-chile\data\paginas.json', 'w', encoding='utf-8') as f:
        json.dump(paginas, f, ensure_ascii=False, indent=2)
    
    print(f"Generadas {count} intros unicas para paginas ciudad.")
    print(f"Total paginas con intro: {len([x for x in paginas if x.get('intro')])}")

if __name__ == '__main__':
    main()
