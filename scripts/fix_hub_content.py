#!/usr/bin/env python3
"""Corrige contaminación cruzada en hub_guides.json + contenido-unico.json + paginas.json
para las 17 páginas hub de LegalHelp Chile."""

import json, copy
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# ── Mapeo de cada hub a su área legal ──────────────────────────────────
AREA_CIVIL = {'alzamiento-de-embargo-sobre-vehiculo', 'demanda-de-desalojo-por-no-pago', 'poder-simple-notarial', 'servicios-legales'}
AREA_TRANSITO = {'prescripcion-de-deuda-tag', 'prescripcion-de-multas-de-transito', 'limpieza-de-hoja-de-vida-del-conductor'}
AREA_LABORAL = {'denuncia-por-despido-injustificado', 'denuncia-por-no-pago-de-cotizaciones'}
AREA_FAMILIA = {'demanda-de-alimentos', 'registro-nacional-de-deudores-de-pensiones-de-alimentos'}
AREA_PENAL = {'eliminacion-de-antecedentes-penales', 'omision-de-antecedentes-por-violencia-intrafamiliar', 'certificado-de-antecedentes-para-fines-especiales'}
AREA_CONSUMO = {'carta-reclamo-sernac'}
AREA_CONST = {'recurso-de-proteccion'}
AREA_PRESC_BANC = {'prescripcion-de-deuda-bancaria'}

def get_area(slug: str) -> str:
    if slug in AREA_CIVIL: return 'civil'
    if slug in AREA_TRANSITO: return 'transito'
    if slug in AREA_LABORAL: return 'laboral'
    if slug in AREA_FAMILIA: return 'familia'
    if slug in AREA_PENAL: return 'penal'
    if slug in AREA_CONSUMO: return 'consumo'
    if slug in AREA_CONST: return 'constitucional'
    if slug in AREA_PRESC_BANC: return 'civil'
    return 'otro'

# ── Textos correctos por área ──────────────────────────────────────────

INSTITUCION = {
    'civil': 'el Juzgado de Letras en lo Civil competente de tu domicilio',
    'transito': 'el Juzgado de Policía Local de la comuna correspondiente',
    'laboral': 'la Inspección del Trabajo o el Juzgado de Letras del Trabajo',
    'familia': 'el Juzgado de Familia competente de tu domicilio',
    'penal': 'el Servicio de Registro Civil e Identificación o Gendarmería de Chile, según corresponda',
    'consumo': 'el SERNAC o el Juzgado de Policía Local de tu comuna',
    'constitucional': 'la Corte de Apelaciones del domicilio del afectado o del lugar donde ocurrió el acto',
}

LEYES = {
    'civil': '• Código Civil (Art. 2515 CC — prescripción)\n• Código de Procedimiento Civil (Art. 446 y siguientes — embargo)\n• Código Civil (Art. 2116 CC — mandato)\n• Ley 18.101 (arrendamiento de predios urbanos)',
    'transito': '• Ley de Tránsito 18.290\n• Ley 18.287 (Procedimiento ante Juzgados de Policía Local)\n• Art. 24 y 25 de la Ley 18.287 (prescripción de multas)',
    'laboral': '• Código del Trabajo (Art. 162 — despido ineficaz por cotizaciones impagas)\n• Código del Trabajo (Art. 168 — indemnización por despido injustificado)\n• Ley 17.322 (cobro ejecutivo de cotizaciones previsionales)',
    'familia': '• Ley 14.908 (Abandono de Familia y Pago de Pensiones Alimenticias)\n• Ley 21.389 (Registro Nacional de Deudores de Pensiones de Alimentos)\n• Código Civil (Art. 321 CC — obligación alimenticia)',
    'penal': '• Decreto Ley 409 (eliminación de antecedentes penales)\n• Ley 20.066 (Violencia Intrafamiliar)\n• DS 64 (procedimiento de eliminación de antecedentes)\n• Ley 19.628 (protección de datos personales)',
    'consumo': '• Ley 19.496 (protección al consumidor, Art. 3° y 20)\n• Ley 18.287 (procedimiento ante Juzgados de Policía Local)',
    'constitucional': '• Art. 20 de la Constitución Política de Chile (recurso de protección)\n• Auto Acordado de la Corte Suprema sobre recurso de protección',
}

DOCS_SUGERIDOS = {
    'civil': 'cédula de identidad vigente, contratos o títulos ejecutivos, comprobantes de pago o mora, escrituras públicas',
    'transito': 'cédula de identidad vigente, licencia de conducir, padrón del vehículo, parte de infracción, certificados de anotaciones del Registro Civil',
    'laboral': 'cédula de identidad vigente, contrato de trabajo, liquidaciones de sueldo, carta de despido, certificados de AFP/Isapre',
    'familia': 'cédula de identidad vigente, certificado de nacimiento de los hijos, comprobantes de ingresos, sentencias judiciales previas',
    'penal': 'cédula de identidad vigente, certificado de antecedentes penales, sentencia condenatoria, certificado de cumplimiento de condena',
    'consumo': 'cédula de identidad vigente, boleta o factura, contrato de compra, comprobante de pago, historial de reclamos',
    'constitucional': 'cédula de identidad vigente, documento que acredite el acto u omisión recurrido, pruebas de la vulneración de derechos',
}

CONCEPTOS_CLAVE = {
    'civil': 'embargo, deuda, prescripción, mandato, arrendamiento, desalojo, título ejecutivo',
    'transito': 'multa, TAG, infracción, hoja de vida del conductor, licencia, Juzgado de Policía Local, prescripción',
    'laboral': 'despido, cotizaciones, AFP, Isapre, indemnización, finiquito, remuneración',
    'familia': 'alimentos, pensión alimenticia, tuición, Registro Nacional de Deudores, Juzgado de Familia',
    'penal': 'antecedentes penales, violencia intrafamiliar, condena, eliminación, rehabilitación',
    'consumo': 'reclamo, SERNAC, consumidor, garantía, proveedor, boleta, factura',
    'constitucional': 'recurso de protección, derechos fundamentales, arbitrariedad, Corte de Apelaciones',
}

PLAZO = {
    'alzamiento-de-embargo-sobre-vehiculo': 'Una vez pagada la deuda o fenecido el embargo, se puede solicitar de inmediato.',
    'prescripcion-de-deuda-tag': 'Las multas TAG prescriben a los 3 años desde su publicación en el Registro de Multas de Tránsito No Pagadas (Art. 24 Ley 18.287).',
    'prescripcion-de-deuda-bancaria': 'La acción ejecutiva prescribe a los 3 años; la acción ordinaria a los 5 años desde que la deuda se hizo exigible (Art. 2515 CC).',
    'prescripcion-de-multas-de-transito': '3 años desde la fecha de la infracción sin notificación judicial (Ley 18.287).',
    'limpieza-de-hoja-de-vida-del-conductor': '2 años para faltas graves, 5 años para faltas gravísimas desde la última anotación.',
    'denuncia-por-despido-injustificado': '60 días hábiles desde el despido.',
    'denuncia-por-no-pago-de-cotizaciones': 'Se puede denunciar en cualquier momento mientras la deuda esté impaga.',
    'demanda-de-alimentos': 'Se puede demandar en cualquier momento.',
    'registro-nacional-de-deudores-de-pensiones-de-alimentos': 'Hasta el pago total de la deuda o acuerdo homologado.',
    'eliminacion-de-antecedentes-penales': '2 a 5 años desde el cumplimiento de la condena, según el tipo de delito.',
    'omision-de-antecedentes-por-violencia-intrafamiliar': '5 años desde la resolución, dependiendo del caso.',
    'certificado-de-antecedentes-para-fines-especiales': 'Trámite administrativo; se resuelve en días hábiles.',
    'carta-reclamo-sernac': 'Dentro de 6 meses desde la compra o desde que se hizo exigible la garantía.',
    'demanda-de-desalojo-por-no-pago': 'Acción disponible desde el primer mes de impago.',
    'poder-simple-notarial': 'Vigencia definida en el documento; se puede otorgar en cualquier momento.',
    'recurso-de-proteccion': '30 días corridos desde el acto u omisión que vulnera el derecho.',
    'servicios-legales': 'Minutos desde que completas el formulario.',
}

HUBS = list(INSTITUCION.keys()) if False else list(PLAZO.keys())  # noqa

# ── Slug → nombre de categoría ────────────────────────────────────────
def slug_to_categoria(slug: str) -> str:
    m = {
        'alzamiento-de-embargo-sobre-vehiculo': 'Alzamiento de embargo sobre vehículo',
        'carta-reclamo-sernac': 'Carta reclamo SERNAC',
        'certificado-de-antecedentes-para-fines-especiales': 'Certificado de antecedentes para fines especiales',
        'demanda-de-alimentos': 'Demanda de alimentos',
        'demanda-de-desalojo-por-no-pago': 'Demanda de desalojo por no pago',
        'denuncia-por-despido-injustificado': 'Denuncia por despido injustificado',
        'denuncia-por-no-pago-de-cotizaciones': 'Denuncia por no pago de cotizaciones',
        'eliminacion-de-antecedentes-penales': 'Eliminación de antecedentes penales',
        'limpieza-de-hoja-de-vida-del-conductor': 'Limpieza de hoja de vida del conductor',
        'omision-de-antecedentes-por-violencia-intrafamiliar': 'Omisión de antecedentes por violencia intrafamiliar',
        'poder-simple-notarial': 'Poder simple notarial',
        'prescripcion-de-deuda-tag': 'Prescripción de deuda TAG',
        'prescripcion-de-deuda-bancaria': 'Prescripción de deuda bancaria',
        'prescripcion-de-multas-de-transito': 'Prescripción de multas de tránsito',
        'recurso-de-proteccion': 'Recurso de protección',
        'registro-nacional-de-deudores-de-pensiones-de-alimentos': 'Registro Nacional de Deudores de Pensiones de Alimentos',
        'servicios-legales': 'Servicios legales',
    }
    return m.get(slug, slug.replace('-', ' ').title())

def get_descripcion(slug: str) -> str:
    """Párrafo corto para la intro de la página hub."""
    area = get_area(slug)
    inst = INSTITUCION[area]
    cat = slug_to_categoria(slug)
    if slug == 'prescripcion-de-deuda-tag':
        return (f"La prescripción de deuda TAG permite extinguir la obligación de pago cuando han transcurrido "
                f"los plazos legales sin que el acreedor haya ejercido acción judicial. Se presenta ante "
                f"{inst}. Las multas TAG asociadas a infracciones de tránsito prescriben en 3 años "
                f"desde su publicación en el Registro de Multas (Art. 24 Ley 18.287).")
    if slug == 'prescripcion-de-deuda-bancaria':
        return (f"La prescripción de deuda bancaria extingue la obligación de pago cuando el banco no ha "
                f"ejercido acciones judiciales dentro del plazo legal. La acción ejecutiva prescribe en 3 años "
                f"y la acción ordinaria en 5 años desde que la deuda se hizo exigible (Art. 2515 CC). "
                f"Se presenta ante {inst}.")
    if slug == 'prescripcion-de-multas-de-transito':
        return (f"Las multas de tránsito prescriben a los 3 años desde la fecha de la infracción si no ha "
                f"habido notificación judicial. La prescripción debe solicitarse expresamente ante "
                f"{inst}.")
    if area == 'laboral':
        return (f"Presentá tu {cat.lower()} ante {inst}. "
                f"El plazo es de {PLAZO[slug].lower()}. "
                f"El fundamento legal está en el Código del Trabajo y la Ley 17.322.")
    if area == 'familia':
        return (f"Presentá tu solicitud de {cat.lower()} ante {inst}. "
                f"El fundamento legal está en la Ley 14.908 y la Ley 21.389.")
    if area == 'penal':
        return (f"Gestioná tu {cat.lower()} ante {inst}. "
                f"El plazo aplicable es de {PLAZO[slug].lower()}.")
    if slug == 'carta-reclamo-sernac':
        return (f"La carta reclamo SERNAC notifica formalmente al proveedor que ha vulnerado tus derechos "
                f"como consumidor. Se presenta ante {inst}. Sirve como respaldo para escalar "
                f"el reclamo a mediación o juicio.")
    return (f"Presentá tu solicitud de {cat.lower()} ante {inst}. Plazo: {PLAZO[slug].lower()}.")


def make_faqs(slug: str) -> list:
    """FAQs correctas por hub."""
    area = get_area(slug)
    cat = slug_to_categoria(slug)
    inst = INSTITUCION[area]

    faqs = []

    q1 = f"¿Qué es {cat.lower()} en Chile?"
    if slug == 'prescripcion-de-deuda-tag':
        a1 = ("La prescripción extingue la obligación de pago cuando ha transcurrido un plazo sin que se haya "
              "iniciado un cobro judicial. Para deuda civil con autopistas rige la acción ordinaria de 5 años "
              "(Art. 2515 CC). Para multas por infracción de tránsito asociadas al TAG, el plazo es de 3 años "
              "ante el Juzgado de Policía Local (Ley 18.287).")
    elif slug == 'prescripcion-de-deuda-bancaria':
        a1 = ("La acción ejecutiva para cobrar una deuda bancaria prescribe a los 3 años (Art. 2515 CC) "
              "y la acción ordinaria a los 5 años desde que la deuda se hizo exigible. Si el banco no ha "
              "demandado dentro de esos plazos, la deuda está prescrita.")
    elif slug == 'prescripcion-de-multas-de-transito':
        a1 = ("Las multas de tránsito prescriben a los 3 años desde la fecha de la infracción si no ha "
              "habido notificación judicial. La prescripción debe solicitarse expresamente ante el "
              "Juzgado de Policía Local.")
    elif slug == 'limpieza-de-hoja-de-vida-del-conductor':
        a1 = ("Las anotaciones por infracciones graves se eliminan después de 2 años, y las gravísimas "
              "después de 5 años desde la última anotación, siempre que no se hayan cometido nuevas "
              "infracciones (Ley 18.290).")
    elif area == 'laboral' and slug == 'denuncia-por-despido-injustificado':
        a1 = ("Ocurre cuando el empleador termina el contrato de trabajo sin una causa legal válida "
              "contemplada en el Art. 159, 160 o 161 del Código del Trabajo.")
    elif area == 'laboral' and slug == 'denuncia-por-no-pago-de-cotizaciones':
        a1 = ("Ocurre cuando el empleador descuenta las cotizaciones del sueldo del trabajador pero no las "
              "entera en la AFP, Isapre o Fonasa dentro de los plazos legales.")
    elif area == 'familia' and slug == 'demanda-de-alimentos':
        a1 = ("Los hijos menores de edad, hijos mayores con necesidades especiales, el cónyuge o "
              "conviviente civil que no puede mantenerse por sus propios medios, y ascendientes en "
              "situación de necesidad pueden demandar alimentos.")
    elif area == 'familia' and slug == 'registro-nacional-de-deudores-de-pensiones-de-alimentos':
        a1 = ("Es un registro público donde se inscribe a quienes mantienen deudas de pensión de alimentos "
              "impagas. La inscripción tiene consecuencias legales como la imposibilidad de obtener "
              "licencia de conducir o pasaporte.")
    elif slug == 'carta-reclamo-sernac':
        a1 = ("La carta reclamo SERNAC notifica formalmente al proveedor que ha vulnerado tus derechos "
              "como consumidor. Sirve como respaldo para escalar el reclamo a mediación o juicio si "
              "no hay respuesta.")
    elif slug == 'demanda-de-desalojo-por-no-pago':
        a1 = ("Podés demandar cuando el arrendatario tiene uno o más meses de arriendo impago, según "
              "la Ley 18.101 sobre arrendamiento de predios urbanos.")
    elif slug == 'alzamiento-de-embargo-sobre-vehiculo':
        a1 = ("Es el procedimiento judicial para levantar el embargo que pesa sobre un vehículo una vez "
              "pagada la deuda o por haberse extinguido la obligación que lo motivó.")
    elif slug == 'poder-simple-notarial':
        a1 = ("El poder simple notarial se otorga ante Notario Público y permite a una persona "
              "(mandatario) actuar en representación de otra (mandante) para actos específicos "
              "señalados en el documento.")
    elif slug == 'eliminacion-de-antecedentes-penales':
        a1 = ("Es el procedimiento ante el Registro Civil para eliminar los antecedentes penales "
              "de una persona que ha cumplido su condena y ha transcurrido el plazo legal "
              "establecido en el DS 409.")
    elif slug == 'omision-de-antecedentes-por-violencia-intrafamiliar':
        a1 = ("Es el procedimiento para solicitar la omisión de antecedentes por violencia intrafamiliar "
              "en los certificados de antecedentes, cuando se cumplen los requisitos de la Ley 20.066.")
    elif slug == 'certificado-de-antecedentes-para-fines-especiales':
        a1 = ("Es un certificado que permite acreditar antecedentes penales para fines especiales "
              "(visas, adopciones, etc.), regulado por el DS 64 y la Ley 19.628.")
    elif slug == 'recurso-de-proteccion':
        a1 = ("Es una acción constitucional consagrada en el Art. 20 de la Constitución que protege "
              "los derechos fundamentales ante actos u omisiones ilegales o arbitrarios.")
    elif slug == 'servicios-legales':
        a1 = ("LegalHelp Chile ofrece generación de documentos legales y escritos judiciales "
              "para diversos trámites. Seleccioná el tipo de documento que necesitás y completá "
              "el formulario para obtenerlo listo en minutos.")
    else:
        a1 = f"Es un procedimiento legal regulado por la legislación chilena. Se presenta ante {inst}."

    faqs.append({"q": q1, "a": a1})

    q2 = f"¿Ante qué tribunal o institución se presenta {cat.lower()}?"
    a2 = f"Se presenta ante {inst}."
    faqs.append({"q": q2, "a": a2})

    q3 = f"¿Cuánto tiempo tengo para presentar {cat.lower()}?"
    a3 = PLAZO[slug]
    faqs.append({"q": q3, "a": a3})

    q4 = f"¿Qué documentación necesito para {cat.lower()}?"
    a4 = f"Necesitás {DOCS_SUGERIDOS[area]}. LegalHelp genera el documento base; verificá los requisitos específicos con la institución receptora."
    faqs.append({"q": q4, "a": a4})

    return faqs


# ── 1. CORREGIR hub_guides.json ───────────────────────────────────────
def fix_hub_guides():
    path = BASE / 'data' / 'hub_guides.json'
    with open(path, 'r', encoding='utf-8') as f:
        guides = json.load(f)

    for slug in HUBS:
        cat = slug_to_categoria(slug)
        area = get_area(slug)
        if cat not in guides:
            continue

        inst = INSTITUCION[area]
        leyes = LEYES[area]
        docs = DOCS_SUGERIDOS[area]
        conceptos = CONCEPTOS_CLAVE[area]
        plazo = PLAZO[slug]

        sections = guides[cat]['sections']
        for s in sections:
            head = s['heading'].lower()
            body = s['body']

            # — Section 1: "¿Qué es ...?" — rewrite first paragraph
            if 'qué es' in head:
                body = (f"La {cat.lower()} es un procedimiento legal establecido en la legislación "
                        f"chilena. Regulado por las siguientes disposiciones legales. Este documento "
                        f"te permite presentar tu solicitud ante {inst} de manera rápida y profesional.")

            # — Section 2: "Base legal" — replace with area-correct laws
            elif 'base legal' in head:
                body = (f"Los siguientes cuerpos legales regulan {cat.lower()} en Chile:\n\n"
                        f"{leyes}\n\n"
                        f"Es importante conocer estas disposiciones para fundamentar correctamente "
                        f"tu solicitud.")

            # — Section 3: "Paso a paso" — fix institution
            elif 'paso a paso' in head:
                body = (f"1. Reuní los documentos necesarios: {docs}.\n"
                        f"2. Ingresá a LegalHelp Chile y seleccioná '{cat}'.\n"
                        f"3. Completá el formulario con tus datos personales y los detalles específicos.\n"
                        f"4. Revisá el documento generado y verificá que todos los datos sean correctos.\n"
                        f"5. Presentá el documento ante {inst} en tu comuna.\n"
                        f"6. Hacé seguimiento del estado del trámite en la institución correspondiente.")

            # — Section 4: "¿Qué documentos?" — fix docs list
            elif 'documentos' in head and ('necesit' in head or 'requer' in head):
                body = (f"• Cédula de identidad vigente (original y fotocopia)\n"
                        f"• {docs.capitalize()}\n"
                        f"• Documentos que acrediten los hechos que fundamentan tu solicitud\n"
                        f"• Comprobante de domicilio (si aplica)\n\n"
                        f"LegalHelp Chile te guía paso a paso para que no te falte ningún documento.")

            # — Section 5: "Plazos y costos" — fix plazo
            elif 'plazo' in head and 'costo' in head:
                body = (f"El plazo para este trámite es: {plazo}\n\n"
                        f"La presentación ante el tribunal o servicio no tiene costo en la mayoría de "
                        f"los casos. LegalHelp Chile cobra solo por la generación del documento base, "
                        f"no por el trámite judicial o administrativo. Si necesitás asesoría legal, "
                        f"podés acudir a las Corporaciones de Asistencia Judicial (CAJ).")

            # — Section 6: "Conceptos clave" — fix conceptos
            elif 'conceptos clave' in head or 'necesit' in head and 'saber' in head:
                body = (f"Los conceptos clave relacionados con {cat.lower()} incluyen: "
                        f"{conceptos}. Es importante entender estos aspectos para presentar una "
                        f"solicitud bien fundamentada. Si tenés dudas, el asistente de LegalHelp "
                        f"puede orientarte durante el proceso.")

            # — Section 7: "En distintas comunas" — fix institution
            elif 'distintas comunas' in head or 'otras ciudades' in head:
                body = (f"Este trámite está disponible en Santiago, Providencia, Las Condes, Maipú, "
                        f"Pudahuel, La Florida, Puente Alto, Concepción y más ciudades de Chile. "
                        f"Debe presentarse ante {inst}. LegalHelp adapta el "
                        f"documento con los datos de la comuna donde necesitás presentarlo.")

            s['body'] = body

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(guides, f, ensure_ascii=False, indent=2)
    print(f"[OK] hub_guides.json: {len(HUBS)} hubs corregidos")


# ── 2. POBLAR contenido-unico.json ────────────────────────────────────
def fix_contenido_unico():
    path = BASE / 'data' / 'contenido-unico.json'
    data = {}

    for slug in HUBS:
        cat = slug_to_categoria(slug)
        data[slug] = {
            "faqs": make_faqs(slug),
            "paragraph": get_descripcion(slug),
            "ciudad": None,
            "categoria": cat,
            "noindex": False,
        }

    # También agregar las city pages que aún existen (las ~2.500 geo redirects no están en HUBS,
    # pero algunas city pages pueden tener contenido único)
    # Solo agregamos hubs, el resto queda sin contenido único.

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] contenido-unico.json: {len(HUBS)} hubs con contenido corregido")


# ── 3. CORREGIR entidad en paginas.json ────────────────────────────────
def fix_paginas():
    path = BASE / 'data' / 'paginas.json'
    with open(path, 'r', encoding='utf-8') as f:
        paginas = json.load(f)

    cambios = 0
    hubs_set = set(HUBS)
    for p in paginas:
        slug = p['slug']
        if slug in hubs_set:
            area = get_area(slug)
            new_ent = INSTITUCION[area]
            if p['entidad'] != new_ent:
                p['entidad'] = new_ent
                cambios += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(paginas, f, ensure_ascii=False, indent=2)
    print(f"[OK] paginas.json: {cambios} hubs con entidad corregida")


if __name__ == '__main__':
    fix_hub_guides()
    fix_contenido_unico()
    fix_paginas()
    print("\n[OK] Archivos corregidos. Revisa el resultado antes de compilar.")
