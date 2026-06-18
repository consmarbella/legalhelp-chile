"""
Humanizar contenido de paginas.json — LegalHelp.cl
Reescribe leyes, plazos, entidades e intros en lenguaje natural.
Incluye datos reales de tribunales chilenos por comuna.
"""
import json
import random
from pathlib import Path

REPO = Path(r"C:\Users\matte\OneDrive\Escritorio\legalhel.cl final\legalhelp-repo")
PAGINAS_PATH = REPO / "data" / "paginas.json"
CONTENIDO_PATH = REPO / "data" / "contenido-unico.json"

# ── Datos reales de tribunales chilenos ──────────────────────────────────
TRIBUNALES = {
    "Santiago": {
        "civil": "Juzgado Civil de Santiago, Huérfanos 1409, Santiago Centro",
        "familia": "Juzgado de Familia de Santiago, Av. Presidente Salvador Allende 2379",
        "laboral": "Juzgado de Letras del Trabajo de Santiago, San Martín 950",
        "jpl": "Juzgado de Policía Local de Santiago, Av. Matta 1141",
        "inspeccion": "Inspección del Trabajo Santiago Centro, Moneda 723",
        "autopistas": "Costanera Norte, Autopista Central, Vespucio Sur y Norte Express",
    },
    "Providencia": {
        "civil": "Juzgado Civil de Santiago, Huérfanos 1409, Santiago Centro",
        "familia": "Juzgado de Familia de Santiago, Av. Presidente Salvador Allende 2379",
        "laboral": "Juzgado de Letras del Trabajo de Santiago, San Martín 950",
        "jpl": "Juzgado de Policía Local de Providencia, Pedro de Valdivia 963",
        "inspeccion": "Inspección del Trabajo Providencia, Av. Providencia 929",
        "autopistas": "Costanera Norte, Vespucio Sur",
    },
    "Las Condes": {
        "civil": "Juzgado Civil de Santiago, Huérfanos 1409, Santiago Centro",
        "familia": "Juzgado de Familia de Santiago, Av. Presidente Salvador Allende 2379",
        "jpl": "Juzgado de Policía Local de Las Condes, Av. Apoquindo 3400",
        "inspeccion": "Inspección del Trabajo Las Condes, Av. Manquehue Norte 679",
        "autopistas": "Costanera Norte, Américo Vespucio",
    },
    "Maipú": {
        "civil": "Juzgado Civil de San Miguel, Gran Avenida 5250",
        "familia": "Juzgado de Familia de San Miguel, Gran Avenida 5250",
        "jpl": "Juzgado de Policía Local de Maipú, Av. 5 de Abril 0260",
        "inspeccion": "Inspección del Trabajo Maipú, Av. Pajaritos 2220",
        "autopistas": "Autopista del Sol, Vespucio Sur",
    },
    "Puente Alto": {
        "civil": "Juzgado Civil de Puente Alto, Concha y Toro 1400",
        "familia": "Juzgado de Familia de Puente Alto, Concha y Toro 1400",
        "jpl": "Juzgado de Policía Local de Puente Alto, Av. Concha y Toro 1400",
        "inspeccion": "Inspección del Trabajo Puente Alto, Av. Concha y Toro 2690",
        "autopistas": "Acceso Sur, Vespucio Sur",
    },
    "La Florida": {
        "civil": "Juzgado Civil de San Miguel, Gran Avenida 5250",
        "familia": "Juzgado de Familia de San Miguel, Gran Avenida 5250",
        "jpl": "Juzgado de Policía Local de La Florida, Av. Vicuña Mackenna 9700",
        "inspeccion": "Inspección del Trabajo La Florida, Av. Vicuña Mackenna 7650",
        "autopistas": "Vespucio Sur, Acceso Sur",
    },
    "Ñuñoa": {
        "civil": "Juzgado Civil de Santiago, Huérfanos 1409",
        "familia": "Juzgado de Familia de Santiago, Av. Presidente Salvador Allende 2379",
        "jpl": "Juzgado de Policía Local de Ñuñoa, Av. José Pedro Alessandri 1510",
        "inspeccion": "Inspección del Trabajo Ñuñoa, Av. Irarrázaval 1560",
        "autopistas": "Vespucio Sur",
    },
    "San Bernardo": {
        "civil": "Juzgado Civil de San Miguel, Gran Avenida 5250",
        "familia": "Juzgado de Familia de San Miguel, Gran Avenida 5250",
        "jpl": "Juzgado de Policía Local de San Bernardo, Arturo Prat 450",
        "inspeccion": "Inspección del Trabajo San Bernardo, San José 455",
        "autopistas": "Autopista Central, Acceso Sur",
    },
    "Concepción": {
        "civil": "Juzgado Civil de Concepción, Tucapel 450",
        "familia": "Juzgado de Familia de Concepción, Prat 395",
        "laboral": "Juzgado de Letras del Trabajo de Concepción, San Martín 850",
        "jpl": "Juzgado de Policía Local de Concepción, Tucapel 450",
        "inspeccion": "Inspección del Trabajo Concepción, San Martín 870",
        "autopistas": "Autopista Concepción-Talcahuano",
    },
    "Valparaíso": {
        "civil": "Juzgado Civil de Valparaíso, Blanco 1151",
        "familia": "Juzgado de Familia de Valparaíso, Av. Argentina 324",
        "laboral": "Juzgado de Letras del Trabajo de Valparaíso, Blanco 1151",
        "jpl": "Juzgado de Policía Local de Valparaíso, Condell 1490",
        "inspeccion": "Inspección del Trabajo Valparaíso, Blanco 1163",
        "autopistas": "Ruta 68",
    },
    "Viña del Mar": {
        "civil": "Juzgado Civil de Viña del Mar, Arlegui 523",
        "familia": "Juzgado de Familia de Viña del Mar, 14 Norte 968",
        "jpl": "Juzgado de Policía Local de Viña del Mar, Arlegui 523",
        "inspeccion": "Inspección del Trabajo Viña del Mar, 6 Norte 481",
        "autopistas": "Troncal Sur, Ruta 68",
    },
    "Temuco": {
        "civil": "Juzgado Civil de Temuco, Manuel Bulnes 350",
        "familia": "Juzgado de Familia de Temuco, Arturo Prat 880",
        "jpl": "Juzgado de Policía Local de Temuco, Manuel Bulnes 350",
        "inspeccion": "Inspección del Trabajo Temuco, Vial 555",
        "autopistas": "Autopista de La Araucanía",
    },
    "Antofagasta": {
        "civil": "Juzgado Civil de Antofagasta, Latorre 2470",
        "familia": "Juzgado de Familia de Antofagasta, 21 de Mayo 855",
        "jpl": "Juzgado de Policía Local de Antofagasta, Latorre 2470",
        "inspeccion": "Inspección del Trabajo Antofagasta, San Martín 2710",
        "autopistas": "Ruta 1, Ruta 5 Norte",
    },
    "Rancagua": {
        "civil": "Juzgado Civil de Rancagua, Cuevas 399",
        "familia": "Juzgado de Familia de Rancagua, Cuevas 399",
        "jpl": "Juzgado de Policía Local de Rancagua, Cuevas 399",
        "inspeccion": "Inspección del Trabajo Rancagua, O'Carrol 555",
        "autopistas": "Ruta 5 Sur, Carretera del Cobre",
    },
    "La Serena": {
        "civil": "Juzgado Civil de La Serena, Los Carrera 250",
        "familia": "Juzgado de Familia de La Serena, Los Carrera 250",
        "jpl": "Juzgado de Policía Local de La Serena, Los Carrera 250",
        "inspeccion": "Inspección del Trabajo La Serena, Av. del Mar 3400",
        "autopistas": "Ruta 5 Norte",
    },
    "Iquique": {
        "civil": "Juzgado Civil de Iquique, Luis Uribe 620",
        "familia": "Juzgado de Familia de Iquique, Orella 576",
        "jpl": "Juzgado de Policía Local de Iquique, Luis Uribe 620",
        "inspeccion": "Inspección del Trabajo Iquique, Zegers 349",
        "autopistas": "Ruta 1, Ruta 16",
    },
    "Talca": {
        "civil": "Juzgado Civil de Talca, 1 Sur 1150",
        "familia": "Juzgado de Familia de Talca, 2 Norte 1050",
        "jpl": "Juzgado de Policía Local de Talca, 1 Sur 1150",
        "inspeccion": "Inspección del Trabajo Talca, 1 Oriente 1060",
        "autopistas": "Ruta 5 Sur",
    },
    "Chillán": {
        "civil": "Juzgado Civil de Chillán, Constitución 500",
        "familia": "Juzgado de Familia de Chillán, 18 de Septiembre 290",
        "jpl": "Juzgado de Policía Local de Chillán, Constitución 500",
        "inspeccion": "Inspección del Trabajo Chillán, El Roble 280",
        "autopistas": "Ruta 5 Sur",
    },
    "Puerto Montt": {
        "civil": "Juzgado Civil de Puerto Montt, O'Higgins 370",
        "familia": "Juzgado de Familia de Puerto Montt, Antonio Varas 270",
        "jpl": "Juzgado de Policía Local de Puerto Montt, O'Higgins 370",
        "inspeccion": "Inspección del Trabajo Puerto Montt, Urmeneta 390",
        "autopistas": "Ruta 5 Sur",
    },
    "Arica": {
        "civil": "Juzgado Civil de Arica, 18 de Septiembre 365",
        "familia": "Juzgado de Familia de Arica, Baquedano 1340",
        "jpl": "Juzgado de Policía Local de Arica, 18 de Septiembre 365",
        "inspeccion": "Inspección del Trabajo Arica, 21 de Mayo 370",
        "autopistas": "Ruta 5 Norte, Ruta 11-CH",
    },
    "Copiapó": {
        "civil": "Juzgado Civil de Copiapó, Chacabuco 551",
        "familia": "Juzgado de Familia de Copiapó, Chacabuco 551",
        "jpl": "Juzgado de Policía Local de Copiapó, Chacabuco 551",
        "inspeccion": "Inspección del Trabajo Copiapó, Los Carrera 513",
        "autopistas": "Ruta 5 Norte",
    },
    "Punta Arenas": {
        "civil": "Juzgado Civil de Punta Arenas, Waldo Seguel 430",
        "familia": "Juzgado de Familia de Punta Arenas, Waldo Seguel 430",
        "jpl": "Juzgado de Policía Local de Punta Arenas, Waldo Seguel 430",
        "inspeccion": "Inspección del Trabajo Punta Arenas, Bories 670",
        "autopistas": "Ruta 9, Ruta 255",
    },
}

# ── Variaciones de texto por tipo ────────────────────────────────────────
LEY_TEMPLATES = {
    "Prescripción de deuda TAG": [
        "El Código Civil chileno (Art. 2515) permite eliminar deudas civiles después de 5 años sin cobro judicial. Para multas TAG por infracciones de tránsito, la Ley 18.287 reduce el plazo a 3 años desde que la multa aparece en el Registro de Multas No Pagadas.",
        "¿Sabías que las multas de TAG prescriben? El artículo 2515 del Código Civil establece un plazo de 3 años para la acción ejecutiva. Si la autopista no te demandó en ese tiempo, la deuda se extingue y puedes solicitar su eliminación.",
        "La prescripción de deuda TAG está amparada por el Art. 2515 del Código Civil (plazo de 3 años para la acción ejecutiva). Esto significa que si pasaron 3 años desde el cobro sin que te hayan notificado una demanda, tu deuda de autopista se puede declarar extinguida.",
    ],
    "Prescripción de deuda bancaria": [
        "El Código Civil chileno, en su artículo 2515, fija un plazo de 3 años para que prescriban las deudas bancarias ejecutivas y de 5 años para las ordinarias. Esto incluye tarjetas de crédito, créditos de consumo y líneas de crédito.",
        "Tu deuda bancaria puede extinguirse legalmente. El Art. 2515 del Código Civil establece que las deudas civiles prescriben en 5 años y las ejecutivas en 3. Si el banco no inició acciones judiciales en ese plazo, puedes alegar la prescripción.",
    ],
    "Demanda de alimentos": [
        "La Ley 14.908 regula el derecho de alimentos en Chile junto con el artículo 321 del Código Civil. Todo niño, niña o adolescente tiene derecho a que sus padres le proporcionen sustento, vestimenta, salud y educación.",
        "En Chile, la demanda de alimentos se fundamenta en la Ley 14.908 y el Código Civil. El tribunal evalúa tanto las necesidades del niño como la capacidad económica del padre para fijar un monto justo de pensión.",
    ],
    "Denuncia por despido injustificado": [
        "El Código del Trabajo chileno (Arts. 161, 163 y 168) protege al trabajador frente a despidos sin causa legal. Si te despidieron sin justificación, tienes derecho a indemnización por años de servicio más un recargo del 30%.",
        "¿Te despidieron sin motivo? El Código del Trabajo te respalda. Los artículos 161, 163 y 168 establecen que el despido solo procede por causales específicas. Si no se cumple ninguna, tienes 60 días hábiles para reclamar.",
    ],
    "Demanda de desalojo por no pago": [
        "La Ley 18.101 sobre arrendamiento de predios urbanos permite al arrendador solicitar el desalojo cuando el arrendatario deja de pagar. Con la reforma de la Ley 21.461 ('Devuélveme Mi Casa'), el proceso es más rápido.",
        "Si tu arrendatario no paga, la Ley 18.101 más la reforma de la Ley 21.461 te permiten iniciar un juicio de desalojo acelerado. El procedimiento está pensado para resolverse en meses, no en años.",
    ],
    "Alzamiento de embargo sobre vehículo": [
        "Los artículos 446 y siguientes del Código de Procedimiento Civil regulan el alzamiento de embargo. Una vez pagada la deuda que lo originó, puedes solicitar que se levante la restricción sobre tu vehículo.",
        "El Código de Procedimiento Civil (Arts. 446+) establece el procedimiento para levantar un embargo. Si ya pagaste tu deuda, tienes derecho a que el tribunal ordene el alzamiento del embargo y tu vehículo quede libre de cargas.",
    ],
    "Prescripción de multas de tránsito": [
        "Las multas de tránsito prescriben en 3 años desde que la sentencia queda ejecutoriada, según el Art. 2521 del Código Civil. Esto aplica a multas cursadas por Carabineros e impuestas por el Juzgado de Policía Local.",
        "¿Tienes multas de tránsito de años atrás? El artículo 2521 del Código Civil chileno establece que las multas prescriben a los 3 años desde que fueron dictadas por el tribunal. Si ya pasó ese tiempo, puedes alegar la prescripción.",
    ],
    "Recurso de protección": [
        "El artículo 20 de la Constitución chilena consagra el recurso de protección, una acción rápida para defender tus derechos fundamentales frente a actos ilegales o arbitrarios. Tienes solo 30 días corridos para presentarlo desde que ocurrió el hecho.",
        "La Constitución chilena te da una herramienta poderosa: el recurso de protección (Art. 20). Sirve para frenar actos ilegales que vulneren tus derechos fundamentales. Se presenta ante la Corte de Apelaciones de tu región.",
    ],
    "Denuncia por no pago de cotizaciones": [
        "El artículo 19 del DL 3.500 y la Ley 17.322 protegen tus cotizaciones previsionales. Si tu empleador te descuenta de tu sueldo pero no paga a la AFP, está cometiendo una infracción grave. Puedes denunciarlo en la Inspección del Trabajo.",
        "Que tu empleador no pague tus cotizaciones es ilegal. La Ley 17.322 y el DL 3.500 (Art. 19) sancionan al empleador que descuenta y no entera las cotizaciones. La denuncia ante la Inspección del Trabajo no requiere abogado.",
    ],
}

PLAZO_TEMPLATES = {
    "Prescripción de deuda TAG": [
        "Tienes 3 años desde que la multa fue publicada en el Registro de Multas de Tránsito No Pagadas. Pasado ese tiempo sin demanda judicial, la deuda prescribe.",
        "El plazo es de 3 años contados desde que el cobro apareció en el sistema. Si en esos 3 años no recibiste notificación judicial, tu deuda está prescrita.",
        "Desde la fecha de la multa tienes 3 años. Si durante ese período no te llegó una demanda formal del tribunal, puedes iniciar el trámite de prescripción.",
    ],
    "Demanda de alimentos": [
        "Puedes presentar la demanda en cualquier momento. No hay plazo de vencimiento para reclamar alimentos para tus hijos.",
        "No tiene plazo: puedes demandar alimentos cuando los necesités, incluso si pasaron años desde la separación.",
    ],
    "Denuncia por despido injustificado": [
        "Tienes 60 días hábiles desde que te despidieron. Es importante no dejar pasar este plazo porque después pierdes el derecho a reclamar.",
        "El plazo corre: 60 días hábiles desde la fecha de despido. Marcá el calendario porque si se vence, ya no podrás demandar.",
    ],
}

ENTIDAD_TEMPLATES = {
    "Prescripción de deuda TAG": {
        "default": "el Juzgado de Policía Local de tu comuna, que es el tribunal que ve las infracciones de tránsito.",
    },
    "Prescripción de deuda bancaria": {
        "default": "el Juzgado Civil que corresponda a tu domicilio, según las reglas de competencia del Código de Procedimiento Civil.",
    },
    "Demanda de alimentos": {
        "default": "el Juzgado de Familia de tu comuna o de la comuna donde vive tu hijo. Elegís el que te quede más cerca.",
    },
    "Denuncia por despido injustificado": {
        "default": "la Inspección del Trabajo de tu comuna o el Juzgado de Letras del Trabajo. La denuncia administrativa no necesita abogado.",
    },
    "Demanda de desalojo por no pago": {
        "default": "el Juzgado de Letras en lo Civil del lugar donde está el inmueble arrendado. Es importante presentarla en el tribunal correcto.",
    },
    "Alzamiento de embargo sobre vehículo": {
        "default": "el Juzgado Civil que dictó el embargo original. Ahí mismo se solicita el alzamiento una vez pagada la deuda.",
    },
    "Prescripción de multas de tránsito": {
        "default": "el Juzgado de Policía Local que dictó la multa original. Es el mismo tribunal que debe declarar la prescripción.",
    },
    "Recurso de protección": {
        "default": "la Corte de Apelaciones de tu región. El recurso se presenta directamente en la secretaría de la Corte, no en un juzgado de primera instancia.",
    },
    "Denuncia por no pago de cotizaciones": {
        "default": "la Inspección del Trabajo más cercana a tu lugar de trabajo. También puedes consultar directamente en tu AFP.",
    },
}

# ── Datos comunales ──────────────────────────────────────────────────────

COMUNA_INTROS = {
    "Santiago": "Santiago concentra la mayor actividad judicial del país. Las causas de prescripción TAG se tramitan en el Juzgado de Policía Local de Santiago (Av. Matta 1141), que atiende de lunes a viernes de 8:30 a 14:00 hrs. La comuna es atravesada por Costanera Norte, Autopista Central, Vespucio Sur y Norte Express — las cuatro principales autopistas urbanas de Chile.",
    "Providencia": "Providencia comparte jurisdicción con Santiago para la mayoría de los tribunales civiles y de familia, pero cuenta con su propio Juzgado de Policía Local en Pedro de Valdivia 963. La comuna está en el corazón de la red de autopistas urbanas, cruzada por Costanera Norte y cercana a Vespucio Sur.",
    "Las Condes": "Las Condes alberga uno de los centros financieros más importantes del país (Sanhattan), con sedes de casi todos los bancos chilenos. Su Juzgado de Policía Local está en Av. Apoquindo 3400. Las autopistas Costanera Norte y Vespucio Sur cruzan la comuna.",
    "Maipú": "Maipú, la comuna más poblada del país después de Puente Alto, cuenta con su propio Juzgado de Policía Local en Av. 5 de Abril 0260 y la Inspección del Trabajo en Av. Pajaritos 2220. Está conectada por la Autopista del Sol (Ruta 78), que registra alto volumen de cobros TAG.",
    "Puente Alto": "Puente Alto tiene jurisdicción propia con Juzgado Civil y de Familia en Av. Concha y Toro 1400. Es la comuna más poblada de Chile y su Juzgado de Policía Local recibe un alto volumen de causas de tránsito por su conexión con Acceso Sur y Vespucio Sur.",
    "Concepción": "Concepción es la capital judicial de la Región del Biobío. Sus tribunales están concentrados en el centro: Juzgado Civil en Tucapel 450, Juzgado de Familia en Prat 395. Para TAG, la autopista Concepción-Talcahuano es la principal fuente de cobros.",
    "Valparaíso": "Valparaíso, con su geografía de cerros, tiene tribunales en el plan: Juzgado Civil en Blanco 1151. La Corte de Apelaciones de Valparaíso (Plaza de la Justicia) conoce los recursos de protección de toda la Quinta Región.",
    "Viña del Mar": "Viña del Mar tiene sus propios tribunales: Juzgado Civil en Arlegui 523, Juzgado de Familia en 14 Norte 968. Para multas TAG, las autopistas Troncal Sur y la Ruta 68 son las que más cobros generan en la comuna.",
    "Temuco": "Temuco es el centro judicial de La Araucanía. Sus tribunales están en el casco central: Juzgado Civil en Manuel Bulnes 350, Juzgado de Familia en Arturo Prat 880. La Corte de Apelaciones de Temuco atiende toda la región.",
    "Antofagasta": "Antofagasta, capital de la Segunda Región, tiene sus tribunales principales en el centro: Juzgado Civil en Latorre 2470. La Corte de Apelaciones de Antofagasta ve los recursos de protección de toda la región.",
    "La Florida": "La Florida depende del centro de justicia de San Miguel para causas civiles y de familia, pero tiene Juzgado de Policía Local propio en Av. Vicuña Mackenna 9700. La comuna está conectada por Vespucio Sur y Acceso Sur.",
    "Ñuñoa": "Ñuñoa, comuna eminentemente residencial, tiene su Juzgado de Policía Local en Av. José Pedro Alessandri 1510. Para tribunales civiles y de familia, depende del centro de justicia de Santiago.",
    "San Bernardo": "San Bernardo cuenta con Juzgado de Policía Local en Arturo Prat 450. Para causas civiles y de familia, pertenece al territorio jurisdiccional de San Miguel. La Autopista Central y Acceso Sur cruzan la comuna.",
    "Rancagua": "Rancagua es la capital judicial de O'Higgins. Sus tribunales están en el centro: Juzgado Civil en Cuevas 399. La Corte de Apelaciones de Rancagua atiende toda la Sexta Región.",
    "La Serena": "La Serena comparte jurisdicción de Corte de Apelaciones con Coquimbo (ubicada en La Serena, Los Carrera 250). Los tribunales civiles y de familia operan en el mismo edificio del centro.",
}

# ── Procesamiento ─────────────────────────────────────────────────────────

def get_tribunal_info(comuna: str) -> dict:
    """Obtiene datos del tribunal para una comuna, con fallback."""
    if comuna in TRIBUNALES:
        return TRIBUNALES[comuna]
    # Fallback genérico
    return {
        "civil": f"Juzgado Civil de {comuna}",
        "familia": f"Juzgado de Familia de {comuna}",
        "jpl": f"Juzgado de Policía Local de {comuna}",
        "inspeccion": f"Inspección del Trabajo de {comuna}",
        "autopistas": "autopistas de la zona",
    }

def humanizar_ley(categoria: str, idx: int) -> str:
    templates = LEY_TEMPLATES.get(categoria, [
        f"Marco legal chileno aplicable a {categoria.lower()}."
    ])
    return templates[idx % len(templates)]

def humanizar_plazo(categoria: str, idx: int, default_plazo: str) -> str:
    templates = PLAZO_TEMPLATES.get(categoria)
    if templates:
        return templates[idx % len(templates)]
    return default_plazo

def humanizar_entidad(categoria: str, comuna: str, idx: int) -> str:
    templates = ENTIDAD_TEMPLATES.get(categoria, {})
    default = templates.get("default", "el tribunal o institución correspondiente a tu domicilio.")
    
    tribunal = get_tribunal_info(comuna)
    
    # Personalizar según categoría y comuna
    if "TAG" in categoria or "tránsito" in categoria.lower():
        return f"el Juzgado de Policía Local de {comuna} ({tribunal['jpl']})"
    elif "alimentos" in categoria.lower():
        return f"el Juzgado de Familia de {comuna} ({tribunal['familia']})"
    elif "despido" in categoria.lower() or "cotizaciones" in categoria.lower():
        return f"la Inspección del Trabajo de {comuna} ({tribunal['inspeccion']})"
    elif "desalojo" in categoria.lower() or "embargo" in categoria.lower() or "bancaria" in categoria.lower():
        return f"el {tribunal['civil']}"
    elif "protección" in categoria.lower() or "amparo" in categoria.lower():
        return f"la Corte de Apelaciones correspondiente a {comuna}"
    
    return default

def humanizar_intro(categoria: str, comuna: str) -> str:
    tribunal = get_tribunal_info(comuna)
    
    if "TAG" in categoria:
        base = COMUNA_INTROS.get(comuna, f"{comuna} cuenta con su propio Juzgado de Policía Local que recibe causas de tránsito y multas TAG.")
        return (f"{base} Si tu multa de autopista tiene más de 3 años sin cobro judicial, "
                f"la prescripción puede extinguir la deuda. Las autopistas que generan más cobros "
                f"en {comuna} son {tribunal['autopistas']}.")
    
    elif "bancaria" in categoria:
        return (f"Para los vecinos de {comuna}, el tribunal competente es el {tribunal['civil']}. "
                f"Las deudas bancarias (tarjetas de crédito, créditos de consumo, líneas de crédito) "
                f"prescriben en 3 años para la acción ejecutiva. Si tu banco no te demandó en ese plazo, "
                f"la deuda se extingue.")
    
    elif "alimentos" in categoria.lower():
        return (f"En {comuna}, las demandas de alimentos se presentan ante el {tribunal['familia']}. "
                f"El tribunal evalúa tanto la necesidad del alimentario como la capacidad económica "
                f"del alimentante. No necesitas abogado para iniciar el trámite, aunque se recomienda "
                f"asesoría legal para calcular correctamente el monto de la pensión.")
    
    elif "despido" in categoria.lower():
        return (f"Si trabajabas en {comuna} y te despidieron sin causa justificada, tienes 60 días "
                f"hábiles para presentar tu denuncia ante la {tribunal['inspeccion']}. "
                f"La denuncia administrativa es gratuita y no requiere abogado. Si el empleador no "
                f"comparece a la mediación, puedes escalar al Juzgado del Trabajo.")
    
    elif "desalojo" in categoria.lower():
        return (f"Si tu inmueble está en {comuna} y el arrendatario no paga, debes presentar la demanda "
                f"ante el {tribunal['civil']}. Con la Ley 21.461 (Devuélveme Mi Casa), el proceso "
                f"de desalojo es más rápido: puedes obtener sentencia en meses, no años.")
    
    elif "embargo" in categoria.lower():
        return (f"Si tu vehículo fue embargado en {comuna}, una vez pagada la deuda debes solicitar "
                f"el alzamiento ante el {tribunal['civil']}. El tribunal verifica el pago y ordena "
                f"levantar la restricción. El trámite es relativamente rápido: 1 a 2 semanas hábiles.")
    
    elif "cotizaciones" in categoria.lower():
        return (f"Si trabajás o trabajaste en {comuna}, puedes verificar tus cotizaciones en tu AFP "
                f"y denunciar al empleador ante la {tribunal['inspeccion']}. La denuncia es gratuita "
                f"y no requiere abogado. Tu empleador arriesga multas de hasta 150 UTM.")
    
    elif "tránsito" in categoria.lower() or "transito" in categoria.lower():
        return (f"En {comuna}, las multas de tránsito se tramitan en el {tribunal['jpl']}. "
                f"Las multas prescriben a los 3 años desde la sentencia. Si ya pasó ese plazo "
                f"y no te cobraron, puedes solicitar la prescripción.")
    
    elif "protección" in categoria.lower():
        return (f"Para los residentes de {comuna}, el recurso de protección se presenta ante la "
                f"Corte de Apelaciones correspondiente. Tienes 30 días corridos desde el acto que "
                f"vulnera tus derechos. Es un recurso rápido: la Corte debe resolver en días, no semanas.")
    
    # Default
    return (f"Para los residentes de {comuna}, este trámite se realiza ante el tribunal o institución "
            f"competente de la zona. LegalHelp te ayuda a generar el documento con los datos correctos.")


# ── MAIN ──────────────────────────────────────────────────────────────────

print("🔄 Cargando paginas.json...")
with open(PAGINAS_PATH, "r", encoding="utf-8") as f:
    pages = json.load(f)

# Índices para rotar templates
ley_idx = {}
plazo_idx = {}
entidad_idx = {}

humanizadas = 0

for i, p in enumerate(pages):
    cat = p.get("categoria", "")
    variable = p.get("variable")
    
    # Inicializar contadores
    if cat not in ley_idx:
        ley_idx[cat] = 0
    if cat not in plazo_idx:
        plazo_idx[cat] = 0
    if cat not in entidad_idx:
        entidad_idx[cat] = 0
    
    # Humanizar ley
    if cat in LEY_TEMPLATES:
        p["ley"] = humanizar_ley(cat, ley_idx[cat])
        ley_idx[cat] += 1
    
    # Humanizar plazo
    p["plazo"] = humanizar_plazo(cat, plazo_idx[cat], p.get("plazo", ""))
    plazo_idx[cat] += 1
    
    # Humanizar entidad (solo para ciudades GEO)
    if variable and cat in ENTIDAD_TEMPLATES:
        p["entidad"] = humanizar_entidad(cat, variable, entidad_idx[cat])
        entidad_idx[cat] += 1
    
    # Humanizar intro (solo para ciudades GEO)
    if variable:
        p["intro"] = humanizar_intro(cat, variable)
    
    humanizadas += 1

print(f"✅ {humanizadas} páginas procesadas")

# Guardar
with open(PAGINAS_PATH, "w", encoding="utf-8") as f:
    json.dump(pages, f, ensure_ascii=False, indent=2)

print("✅ paginas.json humanizado")

# ── Mostrar ejemplos ─────────────────────────────────────────────────────
print("\n📝 Ejemplos de entradas humanizadas:")
for p in pages[:3]:
    print(f"\n  [{p['categoria']}] {p.get('variable', 'HUB')}")
    print(f"  Ley: {p['ley'][:120]}...")
    print(f"  Plazo: {p['plazo'][:100]}...")
    print(f"  Entidad: {p['entidad'][:120]}...")
    if p.get('intro'):
        print(f"  Intro: {p['intro'][:150]}...")
