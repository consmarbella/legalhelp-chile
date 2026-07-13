#!/usr/bin/env python3
"""
scraper.py - Scraper de planillas legales chilenas
Fuentes: PJUD, SERNAC, Ley Chile, Ministerio de Justicia
Salida:  scripts/scraped_templates.json
         (luego scripts/inject_templates.py los convierte a templates.ts)
"""

import os, json, time, re, sys
from pathlib import Path

# Force UTF-8 output on Windows to avoid cp1252 UnicodeEncodeError
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import requests
from bs4 import BeautifulSoup

# ── Config ────────────────────────────────────────────────────────────────────
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
OUTPUT_FILE = Path(__file__).parent / "scraped_templates.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "es-CL,es;q=0.9",
}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

# ── Fuentes a scrapear ────────────────────────────────────────────────────────
SOURCES = [
    # SERNAC - tipos de reclamo
    {
        "name": "SERNAC - Tipos de reclamo",
        "url": "https://www.sernac.cl/portal/604/w3-article-62704.html",
        "type": "listing",
        "domain": "sernac",
    },
    # Ley Chile - leyes frecuentes en documentos legales
    {
        "name": "Ley 19.496 - Protección al Consumidor",
        "url": "https://www.leychile.cl/Navegar?idNorma=61438",
        "type": "law",
        "domain": "leychile",
        "law_id": "19496",
    },
    {
        "name": "Ley 14.908 - Abandono de Familia y Pensiones",
        "url": "https://www.leychile.cl/Navegar?idNorma=6106",
        "type": "law",
        "domain": "leychile",
        "law_id": "14908",
    },
    {
        "name": "Ley 18.101 - Arrendamiento Urbano",
        "url": "https://www.leychile.cl/Navegar?idNorma=29591",
        "type": "law",
        "domain": "leychile",
        "law_id": "18101",
    },
    {
        "name": "Ley 18.287 - Procedimiento JPL",
        "url": "https://www.leychile.cl/Navegar?idNorma=29573",
        "type": "law",
        "domain": "leychile",
        "law_id": "18287",
    },
    {
        "name": "Ley 20.285 - Acceso Información Pública",
        "url": "https://www.leychile.cl/Navegar?idNorma=276363",
        "type": "law",
        "domain": "leychile",
        "law_id": "20285",
    },
    {
        "name": "Ley 19.968 - Tribunales de Familia",
        "url": "https://www.leychile.cl/Navegar?idNorma=229557",
        "type": "law",
        "domain": "leychile",
        "law_id": "19968",
    },
    {
        "name": "Ley 20.066 - Violencia Intrafamiliar",
        "url": "https://www.leychile.cl/Navegar?idNorma=242648",
        "type": "law",
        "domain": "leychile",
        "law_id": "20066",
    },
    {
        "name": "Ley 16.744 - Accidentes del Trabajo",
        "url": "https://www.leychile.cl/Navegar?idNorma=28650",
        "type": "law",
        "domain": "leychile",
        "law_id": "16744",
    },
    {
        "name": "Ley 20.720 - Reorganización y Liquidación (Quiebra Personal)",
        "url": "https://www.leychile.cl/Navegar?idNorma=1052283",
        "type": "law",
        "domain": "leychile",
        "law_id": "20720",
    },
    {
        "name": "Ley 20.609 - Antidiscriminación (Ley Zamudio)",
        "url": "https://www.leychile.cl/Navegar?idNorma=1042092",
        "type": "law",
        "domain": "leychile",
        "law_id": "20609",
    },
    {
        "name": "Ley 20.830 - Acuerdo de Unión Civil",
        "url": "https://www.leychile.cl/Navegar?idNorma=1075210",
        "type": "law",
        "domain": "leychile",
        "law_id": "20830",
    },
    {
        "name": "Ley 19.880 - Procedimiento Administrativo",
        "url": "https://www.leychile.cl/Navegar?idNorma=210676",
        "type": "law",
        "domain": "leychile",
        "law_id": "19880",
    },
    {
        "name": "Ley 18.092 - Letras de Cambio y Pagarés",
        "url": "https://www.leychile.cl/Navegar?idNorma=29716",
        "type": "law",
        "domain": "leychile",
        "law_id": "18092",
    },
    # Dirección del Trabajo - información laboral
    {
        "name": "DT - Despido y Finiquito",
        "url": "https://www.dt.gob.cl/portal/1628/w3-propertyvalue-22600.html",
        "type": "page",
        "domain": "dt",
    },
    # Superintendencia de Salud
    {
        "name": "Superintendencia de Salud - Reclamos ISAPRE",
        "url": "https://www.supersalud.gob.cl/oirs/666/w3-propertyvalue-2289.html",
        "type": "page",
        "domain": "supersalud",
    },
    # CMF - reclamos financieros
    {
        "name": "CMF - Reclamos banco y financieras",
        "url": "https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-31572.html",
        "type": "page",
        "domain": "cmf",
    },
    # Contraloría General de la República
    {
        "name": "Contraloría - Denuncia e irregularidades",
        "url": "https://www.contraloria.cl/web/cgr/atencion-ciudadana",
        "type": "page",
        "domain": "contraloria",
    },
]

# ── Casos manuales conocidos (cuando scraping falla) ─────────────────────────
KNOWN_CASES = [
    {
        "titulo": "Demanda laboral por no pago de cotizaciones previsionales",
        "materia": "Cobro de cotizaciones previsionales impagas",
        "keywords": ["cotizaciones", "previsión", "AFP", "isapre", "imposiciones", "remuneraciones impagas"],
        "articulos_verificados": [
            "Art. 162 Código del Trabajo (despido ineficaz por cotizaciones impagas)",
            "Art. 19 Ley 17.322 (acción judicial para cobro de cotizaciones)",
            "Art. 58 Código del Trabajo (descuento obligatorio de cotizaciones)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "cobro de cotizaciones y declaración de despido ineficaz",
    },
    {
        "titulo": "Oposición a cobro ejecutivo / demanda ejecutiva",
        "materia": "Oposición a demanda ejecutiva",
        "keywords": ["demanda ejecutiva", "cobranza judicial", "título ejecutivo", "oposición", "excepción"],
        "articulos_verificados": [
            "Art. 464 CPC (excepciones a la ejecución)",
            "Art. 467 CPC (plazo para oponer excepciones: 4 días hábiles)",
            "Art. 2514 Código Civil (prescripción extintiva)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "oponer excepciones y solicitar rechazo de la demanda ejecutiva",
    },
    {
        "titulo": "Recurso de amparo ante Corte de Apelaciones",
        "materia": "Recurso de amparo / habeas corpus",
        "keywords": ["amparo", "habeas corpus", "privado de libertad", "detención", "arresto"],
        "articulos_verificados": [
            "Art. 21 CPR (acción de amparo / habeas corpus)",
            "Art. 95 CPP (amparo ante juez de garantía)",
            "Auto Acordado Corte Suprema sobre recurso de amparo",
        ],
        "tipo": "recurso",
        "peticion_tipo": "libertad inmediata o legalización de la detención",
    },
    {
        "titulo": "Solicitud de mediación familiar obligatoria",
        "materia": "Mediación familiar (tuición, alimentos, visitas)",
        "keywords": ["mediación", "mediacion", "centro mediación", "acuerdo familiar", "tuición previa"],
        "articulos_verificados": [
            "Art. 106 Ley 19.968 (mediación previa obligatoria en materias de familia)",
            "Art. 103 Ley 19.968 (materias que requieren mediación previa)",
            "Art. 111 Ley 19.968 (acta de mediación con fuerza ejecutiva)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "inicio de proceso de mediación familiar",
    },
    {
        "titulo": "Carta de notificación de término de contrato de trabajo",
        "materia": "Notificación de despido / aviso de término de contrato",
        "keywords": ["carta de despido", "aviso despido", "término contrato trabajo", "causal despido"],
        "articulos_verificados": [
            "Art. 161 Código del Trabajo (necesidades de la empresa)",
            "Art. 162 Código del Trabajo (formalidades del despido)",
            "Art. 163 Código del Trabajo (indemnización por años de servicio)",
        ],
        "tipo": "carta",
        "peticion_tipo": "notificación formal de término de la relación laboral",
    },
    {
        "titulo": "Denuncia ante la Inspección del Trabajo",
        "materia": "Denuncia laboral ante Inspección del Trabajo",
        "keywords": ["inspección del trabajo", "inspección laboral", "denuncia laboral", "DT", "dirección del trabajo"],
        "articulos_verificados": [
            "Art. 474 Código del Trabajo (fiscalización e infracciones)",
            "Art. 505 Código del Trabajo (facultades de fiscalización)",
            "Art. 420 Código del Trabajo (competencia juzgados del trabajo)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "fiscalización del empleador y sanción de infracciones laborales",
    },
    {
        "titulo": "Solicitud de nulidad de despido",
        "materia": "Nulidad del despido (tutela laboral)",
        "keywords": ["nulidad despido", "tutela laboral", "derechos fundamentales laborales", "acoso laboral", "discriminación laboral"],
        "articulos_verificados": [
            "Art. 485 Código del Trabajo (procedimiento de tutela laboral)",
            "Art. 489 Código del Trabajo (nulidad del despido y reincorporación)",
            "Art. 19 N°16 CPR (libertad de trabajo sin discriminación)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "declaración de nulidad del despido y reincorporación o indemnización especial",
    },
    {
        "titulo": "Autorización de salida del país de menor",
        "materia": "Autorización judicial de salida del país para menor",
        "keywords": ["autorización salida país", "salida país menor", "viaje menor", "permiso notarial"],
        "articulos_verificados": [
            "Art. 49 Ley 16.618 (autorización para salida de menores)",
            "Art. 225 Código Civil (cuidado personal del menor)",
            "Ley 20.680 (autorización de viaje al extranjero de menores)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "autorización judicial para salida del país del menor",
    },
    {
        "titulo": "Reclamo por publicidad engañosa",
        "materia": "Reclamo por publicidad engañosa o cláusulas abusivas",
        "keywords": ["publicidad engañosa", "cláusula abusiva", "contrato abusivo", "engaño", "información falsa"],
        "articulos_verificados": [
            "Art. 28 Ley 19.496 (publicidad engañosa)",
            "Art. 16 Ley 19.496 (cláusulas abusivas en contratos de adhesión)",
            "Art. 24 Ley 19.496 (sanciones al proveedor infractor)",
        ],
        "tipo": "carta",
        "peticion_tipo": "rectificación de la publicidad y/o anulación de cláusula abusiva",
    },
    {
        "titulo": "Solicitud de regularización de título / herencia",
        "materia": "Posesión efectiva / herencia / regularización de propiedad",
        "keywords": ["herencia", "posesión efectiva", "sucesión", "bienes hereditarios", "legatario"],
        "articulos_verificados": [
            "Art. 951 Código Civil (sucesión por causa de muerte)",
            "Art. 688 Código Civil (inscripción de herencia en CBR)",
            "Ley 20.659 (simplificación trámites posesión efectiva)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "tramitación de posesión efectiva y regularización de bienes hereditarios",
    },
    {
        "titulo": "Carta de cobro prejudicial a deudor",
        "materia": "Cobro prejudicial / última comunicación antes de demanda",
        "keywords": ["cobro prejudicial", "deudor", "mora", "pago", "última instancia", "antes de demandar"],
        "articulos_verificados": [
            "Art. 1551 Código Civil (estado de mora del deudor)",
            "Art. 1552 Código Civil (mora del deudor por plazo vencido)",
            "Art. 98 Código de Comercio (cobro mercantil)",
        ],
        "tipo": "carta",
        "peticion_tipo": "pago de la deuda en plazo perentorio antes de acciones judiciales",
    },
    {
        "titulo": "Oposición a cobranza de TAG prescrito",
        "materia": "Prescripción de peaje TAG / TelePase",
        "keywords": ["tag", "telepase", "prescripción tag", "cobro tag", "peaje"],
        "articulos_verificados": [
            "Art. 2514 Código Civil (prescripción extintiva 5 años)",
            "Art. 98 Ley 18.290 Ley de Tránsito",
            "Art. 26 Ley 18.696 (operación de autopistas concesionadas)",
        ],
        "tipo": "carta",
        "peticion_tipo": "declaración de prescripción y archivo de la deuda TAG",
    },
    {
        "titulo": "Recurso de apelación (Juzgado de Policía Local)",
        "materia": "Recurso de apelación ante Corte de Apelaciones desde JPL",
        "keywords": ["apelación", "apelar", "corte apelaciones", "JPL", "policía local", "segunda instancia"],
        "articulos_verificados": [
            "Art. 22 Ley 18.287 (apelación de sentencias del JPL)",
            "Art. 23 Ley 18.287 (plazo: 5 días hábiles)",
            "Art. 186 CPC (efectos de la apelación)",
        ],
        "tipo": "recurso",
        "peticion_tipo": "revocar la sentencia del JPL y dictar la que corresponde en derecho",
    },

    # ── LABORAL (nuevos) ─────────────────────────────────────────────────────
    {
        "titulo": "Demanda por despido injustificado",
        "materia": "Despido injustificado / improcedente",
        "keywords": ["despido injustificado", "improcedente", "sin causa", "me echaron", "me despidieron", "causal injustificada"],
        "articulos_verificados": [
            "Art. 168 Código del Trabajo (despido injustificado y recargo indemnización)",
            "Art. 163 Código del Trabajo (indemnización por años de servicio)",
            "Art. 161 Código del Trabajo (causal necesidades de la empresa)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "declaración de despido injustificado, indemnización sustitutiva con recargo del 30%",
    },
    {
        "titulo": "Demanda tutela laboral por vulneración de derechos fundamentales",
        "materia": "Tutela laboral / vulneración derechos fundamentales en el trabajo",
        "keywords": ["tutela laboral", "acoso laboral", "mobbing", "derechos fundamentales trabajo", "vulneración", "hostigamiento laboral"],
        "articulos_verificados": [
            "Art. 485 Código del Trabajo (procedimiento de tutela laboral)",
            "Art. 487 Código del Trabajo (legitimación activa en tutela)",
            "Art. 19 N°1 CPR (integridad física y psíquica)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "declaración de vulneración de derechos fundamentales, indemnización adicional y cese de la conducta",
    },
    {
        "titulo": "Demanda cobro de remuneraciones impagas",
        "materia": "Cobro de sueldos, salarios o remuneraciones no pagadas",
        "keywords": ["sueldo impago", "remuneración impaga", "salario no pagado", "no me pagaron", "retención sueldo"],
        "articulos_verificados": [
            "Art. 54 Código del Trabajo (forma y oportunidad de pago de remuneraciones)",
            "Art. 55 Código del Trabajo (plazo de pago: mensual o quincenal)",
            "Art. 173 Código del Trabajo (mora en el pago)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "cobro de remuneraciones impagas con reajuste e intereses",
    },
    {
        "titulo": "Demanda cobro horas extraordinarias impagas",
        "materia": "Cobro de horas extras / sobretiempo no remunerado",
        "keywords": ["horas extras", "sobretiempo", "horas extraordinarias", "jornada laboral excedida", "no pagaron horas extra"],
        "articulos_verificados": [
            "Art. 31 Código del Trabajo (horas extraordinarias)",
            "Art. 32 Código del Trabajo (recargo del 50% sobre hora ordinaria)",
            "Art. 420 Código del Trabajo (competencia juzgados del trabajo para cobros laborales)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "cobro de horas extraordinarias con recargo legal del 50%",
    },
    {
        "titulo": "Denuncia accidente del trabajo o enfermedad profesional",
        "materia": "Accidente del trabajo / enfermedad profesional",
        "keywords": ["accidente trabajo", "enfermedad profesional", "mutualidad", "ACHS", "ISL", "IST", "secuela laboral"],
        "articulos_verificados": [
            "Art. 5 Ley 16.744 (concepto de accidente del trabajo)",
            "Art. 69 Ley 16.744 (responsabilidad del empleador: indemnización)",
            "Art. 57 Ley 16.744 (derecho a prestaciones médicas y económicas)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "reconocimiento de accidente laboral y prestaciones médicas y pecuniarias",
    },
    {
        "titulo": "Solicitud licencia médica rechazada o reducida (COMPIN)",
        "materia": "Impugnación de rechazo o reducción de licencia médica",
        "keywords": ["licencia médica", "COMPIN", "licencia rechazada", "licencia reducida", "impugnar licencia"],
        "articulos_verificados": [
            "Art. 12 DFL 3/1984 (FONASA, tramitación licencias médicas)",
            "Art. 77 bis DL 3.500 (licencias médicas en sistema AFP)",
            "DL 2.763 Art. 8 (funciones COMPIN)",
        ],
        "tipo": "recurso",
        "peticion_tipo": "reconsideración del rechazo/reducción de la licencia médica y pago del subsidio",
    },
    {
        "titulo": "Reclamo por fuero maternal / paternal (reintegro)",
        "materia": "Fuero maternal o paternal: protección del despido durante permiso parental",
        "keywords": ["fuero maternal", "fuero paternal", "embarazo", "desafuero", "despido embarazada", "permiso postnatal", "postnatal"],
        "articulos_verificados": [
            "Art. 174 Código del Trabajo (desafuero judicial requerido para despedir con fuero)",
            "Art. 201 Código del Trabajo (fuero maternal durante embarazo y un año post)",
            "Art. 194 Código del Trabajo (protección a la maternidad)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "reintegro inmediato y pago de remuneraciones durante período de fuero",
    },

    # ── FAMILIA (nuevos) ─────────────────────────────────────────────────────
    {
        "titulo": "Demanda de alimentos para hijos mayores de edad",
        "materia": "Alimentos mayores de edad / hijos estudiando",
        "keywords": ["alimentos hijo mayor", "pensión alimenticia mayor", "estudiando universitario", "alimentos estudios", "mayor de 18"],
        "articulos_verificados": [
            "Art. 332 Código Civil (extensión obligación alimentaria: hasta 28 años si estudia)",
            "Art. 321 Código Civil (quiénes tienen derecho a alimentos)",
            "Art. 55 Ley 14.908 (procedimiento cobro alimentos)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "fijación o aumento de pensión de alimentos para mayor de edad estudiante",
    },
    {
        "titulo": "Demanda de cuidado personal / tuición de menores",
        "materia": "Cuidado personal de hijos / tuición",
        "keywords": ["tuición", "cuidado personal", "custodia", "hijo", "menor", "separación padres"],
        "articulos_verificados": [
            "Art. 225 Código Civil (cuidado personal de los hijos)",
            "Art. 226 Código Civil (criterios para otorgar cuidado personal)",
            "Art. 16 Ley 19.968 (interés superior del niño en familia)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "otorgamiento del cuidado personal exclusivo o compartido del menor",
    },
    {
        "titulo": "Demanda de divorcio por cese de convivencia",
        "materia": "Divorcio unilateral por cese de convivencia de 3 años",
        "keywords": ["divorcio", "cese convivencia", "separación", "matrimonio", "terminar matrimonio"],
        "articulos_verificados": [
            "Art. 55 Ley 19.947 LMC (divorcio por cese de convivencia: 3 años)",
            "Art. 56 Ley 19.947 LMC (efectos del divorcio)",
            "Art. 60 Ley 19.947 LMC (compensación económica en divorcio)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "declaración judicial de divorcio por cese de convivencia superior a 3 años",
    },
    {
        "titulo": "Demanda de divorcio de mutuo acuerdo",
        "materia": "Divorcio por mutuo acuerdo de los cónyuges",
        "keywords": ["divorcio mutuo acuerdo", "divorcio acuerdo", "separación acuerdo", "divorcio amistoso"],
        "articulos_verificados": [
            "Art. 55 inc. 1 Ley 19.947 LMC (divorcio de mutuo acuerdo: 1 año cese convivencia)",
            "Art. 63 Ley 19.947 LMC (acuerdo completo y suficiente)",
            "Art. 21 Ley 19.947 LMC (acuerdo regulador de relaciones mutuas)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "declaración de divorcio de mutuo acuerdo con acuerdo regulador homologado",
    },
    {
        "titulo": "Denuncia por violencia intrafamiliar",
        "materia": "Denuncia violencia intrafamiliar ante Juzgado de Familia",
        "keywords": ["violencia intrafamiliar", "VIF", "maltrato", "agresión pareja", "violencia doméstica", "golpes pareja"],
        "articulos_verificados": [
            "Art. 3 Ley 20.066 (violencia intrafamiliar: concepto y sanciones)",
            "Art. 7 Ley 20.066 (medidas cautelares en VIF)",
            "Art. 92 Ley 19.968 (competencia tribunal de familia en VIF)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "medidas cautelares de protección y sanción del agresor",
    },
    {
        "titulo": "Solicitud de régimen de relación directa y regular (visitas)",
        "materia": "Régimen de visitas / relación directa y regular padre no custodio",
        "keywords": ["régimen visitas", "visitas hijo", "relación directa", "ver hijo", "padre no custodio"],
        "articulos_verificados": [
            "Art. 229 Código Civil (derecho a mantener relación con los hijos)",
            "Art. 229 bis Código Civil (relación directa y regular: condiciones)",
            "Art. 48 Ley 16.618 (Ley de Menores, régimen de visitas)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "fijación de régimen de relación directa y regular con el menor",
    },
    {
        "titulo": "Solicitud de alimentos provisorios urgentes",
        "materia": "Alimentos provisorios / medida cautelar pensión alimenticia",
        "keywords": ["alimentos provisorios", "pensión provisional", "urgente alimentos", "medida cautelar alimentos"],
        "articulos_verificados": [
            "Art. 4 Ley 14.908 (alimentos provisorios desde primera presentación)",
            "Art. 5 Ley 14.908 (monto mínimo alimentos provisorios)",
            "Art. 327 Código Civil (obligación alimentaria y su extensión)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "fijación de pensión de alimentos provisorios con carácter urgente",
    },

    # ── CIVIL (nuevos) ───────────────────────────────────────────────────────
    {
        "titulo": "Demanda de cobro de dinero",
        "materia": "Cobro judicial de deuda / suma de dinero adeudada",
        "keywords": ["cobrar deuda", "cobro dinero", "préstamo no pagado", "me deben dinero", "cobro judicial"],
        "articulos_verificados": [
            "Art. 1437 Código Civil (fuentes de las obligaciones)",
            "Art. 1546 Código Civil (contratos deben ejecutarse de buena fe)",
            "Art. 548 CPC (procedimiento sumario para cobros)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "cobro de suma líquida adeudada con reajuste, intereses y costas",
    },
    {
        "titulo": "Demanda de indemnización de perjuicios",
        "materia": "Indemnización de perjuicios por incumplimiento contractual o daño",
        "keywords": ["indemnización", "perjuicios", "daño", "responsabilidad civil", "daño moral", "incumplimiento contrato"],
        "articulos_verificados": [
            "Art. 1556 Código Civil (indemnización comprende daño emergente y lucro cesante)",
            "Art. 1557 Código Civil (mora del deudor como requisito)",
            "Art. 2314 Código Civil (responsabilidad extracontractual)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "indemnización de perjuicios por daño emergente, lucro cesante y daño moral",
    },
    {
        "titulo": "Cobro de cheque protestado",
        "materia": "Demanda ejecutiva por cheque protestado",
        "keywords": ["cheque protestado", "cheque sin fondos", "protesto cheque", "cobrar cheque"],
        "articulos_verificados": [
            "Art. 22 Ley 18.092 (acción ejecutiva del tenedor del cheque)",
            "Art. 434 N°4 CPC (cheque como título ejecutivo)",
            "Art. 69 Ley 18.092 (solidaridad en el cheque)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "embargo y pago del monto del cheque protestado con intereses y costas",
    },
    {
        "titulo": "Rescisión de contrato por incumplimiento",
        "materia": "Resolución o rescisión de contrato por incumplimiento de contraparte",
        "keywords": ["rescisión contrato", "resolución contrato", "incumplimiento", "terminar contrato", "nulidad contrato"],
        "articulos_verificados": [
            "Art. 1489 Código Civil (condición resolutoria tácita por incumplimiento)",
            "Art. 1873 Código Civil (resolución compraventa por no pago del precio)",
            "Art. 1552 Código Civil (mora purga la mora)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "resolución del contrato, restitución de lo pagado e indemnización de perjuicios",
    },
    {
        "titulo": "Solicitud de renegociación de deudas (SUPERIR / Ley 20.720)",
        "materia": "Procedimiento concursal simplificado / renegociación persona natural",
        "keywords": ["renegociación deuda", "quiebra personal", "SUPERIR", "insolvencia", "deudas impagables", "concursal personal"],
        "articulos_verificados": [
            "Art. 260 Ley 20.720 (procedimiento de renegociación de persona natural)",
            "Art. 261 Ley 20.720 (requisitos para acceder a renegociación)",
            "Art. 264 Ley 20.720 (efectos del acuerdo de renegociación)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "inicio de procedimiento de renegociación ante SUPERIR",
    },
    {
        "titulo": "Oposición a embargo / recurso de amparo de bienes",
        "materia": "Oposición a embargo indebido o sobre bienes inembargables",
        "keywords": ["oposición embargo", "bienes inembargables", "embargo ilegal", "recurso amparo bienes", "levantar embargo"],
        "articulos_verificados": [
            "Art. 518 CPC (tercería de dominio o posesión sobre bienes embargados)",
            "Art. 445 CPC (bienes inembargables)",
            "Art. 519 CPC (efectos de la tercería)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "alzamiento del embargo sobre bienes inembargables o de propiedad de tercero",
    },

    # ── ARRENDAMIENTO (nuevos) ───────────────────────────────────────────────
    {
        "titulo": "Demanda terminación arriendo por no pago de renta",
        "materia": "Término de contrato de arriendo por mora en el pago",
        "keywords": ["no pago arriendo", "arrendatario moroso", "arriendo impago", "terminar arriendo", "desahucio no pago"],
        "articulos_verificados": [
            "Art. 10 Ley 18.101 (término anticipado por no pago de renta)",
            "Art. 1977 Código Civil (resolución arrendamiento por mora)",
            "Art. 611 CPC (procedimiento de arrendamiento en JPL)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "término del contrato de arriendo y pago de rentas adeudadas con costas",
    },
    {
        "titulo": "Demanda cobro de rentas de arriendo impagas",
        "materia": "Cobro judicial de rentas de arriendo adeudadas",
        "keywords": ["cobrar arriendo", "rentas impagas", "arriendo adeudado", "cobro rentas"],
        "articulos_verificados": [
            "Art. 17 Ley 18.101 (cobro de rentas impagas)",
            "Art. 598 CPC (procedimiento de cobro de renta)",
            "Art. 1978 Código Civil (derecho del arrendador al pago de la renta)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "cobro ejecutivo de rentas de arriendo adeudadas con reajuste e intereses",
    },
    {
        "titulo": "Demanda de devolución de garantía de arriendo",
        "materia": "Cobro de garantía o mes de arriendo no devuelto al término",
        "keywords": ["garantía arriendo", "mes garantía", "depósito arriendo", "no devolvieron garantía"],
        "articulos_verificados": [
            "Art. 46 Ley 18.101 (devolución de garantía al término del arriendo)",
            "Art. 1942 Código Civil (obligaciones del arrendatario al restituir)",
            "Art. 548 CPC (procedimiento sumario para cobros menores)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "restitución de la garantía de arriendo con reajuste e intereses",
    },

    # ── CONSUMIDOR / SERVICIOS (nuevos) ──────────────────────────────────────
    {
        "titulo": "Reclamo ante CMF por cobros bancarios irregulares",
        "materia": "Reclamo contra banco por cobros indebidos o abusivos",
        "keywords": ["banco", "cobro bancario", "CMF", "comisión abusiva", "cargo no autorizado", "tarjeta crédito"],
        "articulos_verificados": [
            "Art. 17 B Ley 19.496 (derechos del consumidor financiero)",
            "Art. 3 bis Ley 19.496 (derecho a retracto en servicios financieros)",
            "Art. 62 Ley 19.496 (competencia juzgado de policía local en consumo)",
        ],
        "tipo": "carta",
        "peticion_tipo": "devolución de cobros indebidos y corrección de la cuenta",
    },
    {
        "titulo": "Reclamo ante Superintendencia de Salud por ISAPRE",
        "materia": "Reclamo contra ISAPRE por rechazo de prestaciones o alza de plan",
        "keywords": ["isapre", "superintendencia salud", "rechazo prestación", "alza plan", "seguro salud", "fonasa isapre"],
        "articulos_verificados": [
            "Art. 38 ter Ley 18.933 (tabla de factores de riesgo ISAPRE)",
            "Art. 197 DFL 1/2005 Salud (reclamos ante Superintendencia)",
            "Art. 24 bis Ley 18.933 (cobertura mínima garantizada GES)",
        ],
        "tipo": "carta",
        "peticion_tipo": "reconsideración del rechazo y cobertura de la prestación médica",
    },
    {
        "titulo": "Reclamo ante SUBTEL por empresa de telecomunicaciones",
        "materia": "Reclamo contra empresa de telefonía, internet o cable",
        "keywords": ["internet", "telefonía", "SUBTEL", "movistar", "entel", "vtr", "claro", "empresa telefonía", "corte servicio"],
        "articulos_verificados": [
            "Art. 28 Ley 18.168 (obligación de calidad de servicios de telecomunicaciones)",
            "Art. 36 Ley 18.168 (sanciones por infracción a normas de telecomunicaciones)",
            "Art. 12 Ley 19.496 (derecho a información y servicio conforme a contrato)",
        ],
        "tipo": "carta",
        "peticion_tipo": "reparación del servicio, cobro indebido devuelto y/o indemnización",
    },
    {
        "titulo": "Reclamo por garantía legal de producto defectuoso",
        "materia": "Garantía legal por producto con fallas o defectos",
        "keywords": ["garantía", "producto defectuoso", "falla producto", "garantía legal", "reparación gratuita", "cambio producto"],
        "articulos_verificados": [
            "Art. 20 Ley 19.496 (garantía legal: reparación, cambio o devolución de dinero)",
            "Art. 21 Ley 19.496 (plazo de 3 meses para ejercer garantía)",
            "Art. 19 Ley 19.496 (obligación de entrega conforme a contrato)",
        ],
        "tipo": "carta",
        "peticion_tipo": "reparación gratuita, reemplazo del producto o devolución del precio",
    },
    {
        "titulo": "Solicitud de término de suscripción o servicio recurrente",
        "materia": "Término anticipado de contrato de suscripción o servicio continuo",
        "keywords": ["cancelar suscripción", "término contrato", "dar de baja servicio", "retracto servicio", "no me dejan salir"],
        "articulos_verificados": [
            "Art. 3 bis Ley 19.496 (derecho a retracto en contratos de adhesión)",
            "Art. 16 G Ley 19.496 (prohibición de cláusulas que impidan término unilateral)",
            "Art. 12 Ley 19.496 (derecho a información sobre condiciones de término)",
        ],
        "tipo": "carta",
        "peticion_tipo": "término inmediato de la suscripción y devolución de cargos prepagados",
    },

    # ── ADMINISTRATIVO / MUNICIPAL (nuevos) ──────────────────────────────────
    {
        "titulo": "Recurso jerárquico contra resolución administrativa",
        "materia": "Recurso jerárquico ante superior jerárquico por acto administrativo",
        "keywords": ["recurso jerárquico", "impugnar resolución", "acto administrativo", "recurso administrativo", "apelación administrativa"],
        "articulos_verificados": [
            "Art. 59 Ley 19.880 (recurso jerárquico: plazo 5 días hábiles)",
            "Art. 60 Ley 19.880 (resolución del recurso: 30 días hábiles)",
            "Art. 10 Ley 19.880 (principio de impugnabilidad de actos administrativos)",
        ],
        "tipo": "recurso",
        "peticion_tipo": "revocación o modificación del acto administrativo impugnado",
    },
    {
        "titulo": "Recurso de reposición ante organismo administrativo",
        "materia": "Recurso de reposición contra acto administrativo ante mismo órgano",
        "keywords": ["reposición administrativa", "recurso reposición", "reconsideración", "impugnar acto municipio", "reclamar resolución"],
        "articulos_verificados": [
            "Art. 59 Ley 19.880 (recurso de reposición: plazo 5 días hábiles)",
            "Art. 61 Ley 19.880 (inexistencia de recursos no agota la vía administrativa)",
            "Art. 10 Ley 19.880 (principio de impugnabilidad)",
        ],
        "tipo": "recurso",
        "peticion_tipo": "reconsideración y revocación de la resolución por los fundamentos expuestos",
    },
    {
        "titulo": "Denuncia ante la Contraloría General de la República",
        "materia": "Denuncia de irregularidades o corrupción en órgano público",
        "keywords": ["contraloría", "denuncia funcionario público", "irregular", "corrupción", "mal uso fondos públicos"],
        "articulos_verificados": [
            "Art. 6 Ley Orgánica CGR DFL 2.421/1964 (función de control de la CGR)",
            "Art. 98 CPR (atribuciones de la Contraloría General)",
            "Art. 238 Código Penal (malversación de caudales públicos)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "investigación de las irregularidades denunciadas y sanción de los responsables",
    },
    {
        "titulo": "Reclamo catastro y avalúo fiscal ante SII",
        "materia": "Reclamación tributaria por avalúo fiscal de bien raíz o SII",
        "keywords": ["SII", "avalúo fiscal", "contribuciones", "impuesto territorial", "catastro SII", "revisión avalúo"],
        "articulos_verificados": [
            "Art. 149 Código Tributario (reclamación ante TTA)",
            "Art. 9 Ley 17.235 (plazo reclamación avalúo: 90 días)",
            "Art. 124 Código Tributario (procedimiento general de reclamaciones)",
        ],
        "tipo": "recurso",
        "peticion_tipo": "corrección del avalúo fiscal y reducción de contribuciones",
    },
    {
        "titulo": "Solicitud de pensión básica solidaria (IPS/FONASA)",
        "materia": "Solicitud pensión básica solidaria de vejez o invalidez",
        "keywords": ["pensión solidaria", "PBS", "pensión vejez", "IPS", "ChileAtiende", "pensión básica"],
        "articulos_verificados": [
            "Art. 3 Ley 20.255 (requisitos pensión básica solidaria de vejez)",
            "Art. 4 Ley 20.255 (monto de la pensión básica solidaria)",
            "Art. 12 Ley 20.255 (sistema de pilares solidarios)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "otorgamiento de pensión básica solidaria por cumplir los requisitos legales",
    },

    # ── DERECHOS FUNDAMENTALES (nuevos) ──────────────────────────────────────
    {
        "titulo": "Acción de no discriminación arbitraria (Ley Zamudio)",
        "materia": "Denuncia de discriminación por raza, sexo, origen, religión u otra causa",
        "keywords": ["discriminación", "Ley Zamudio", "ley 20609", "discriminación racial", "discriminación sexual", "trato diferenciado ilegal"],
        "articulos_verificados": [
            "Art. 3 Ley 20.609 (acción de no discriminación arbitraria)",
            "Art. 5 Ley 20.609 (legitimación activa: cualquier persona discriminada)",
            "Art. 19 N°2 CPR (igualdad ante la ley y prohibición de discriminación arbitraria)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "declaración de acto discriminatorio, cese de la conducta e indemnización",
    },
    {
        "titulo": "Denuncia por amenazas o acoso (Querella criminal)",
        "materia": "Querella criminal por amenazas, acoso o delitos menores",
        "keywords": ["amenaza", "amenazas", "querella", "acoso", "intimidación", "delito penal"],
        "articulos_verificados": [
            "Art. 296 Código Penal (amenazas de daño: pena reclusión menor)",
            "Art. 297 Código Penal (amenazas condicionales)",
            "Art. 261 CPP (requisitos de la querella)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "investigación penal, medidas cautelares y condena del imputado",
    },

    # ── COMERCIAL / EMPRESA (nuevos) ─────────────────────────────────────────
    {
        "titulo": "Carta de cobro de honorarios profesionales",
        "materia": "Cobro extrajudicial de honorarios por servicios prestados",
        "keywords": ["honorarios", "cobrar honorarios", "servicios profesionales no pagados", "contrato servicios"],
        "articulos_verificados": [
            "Art. 1437 Código Civil (obligaciones de cuasicontrato de servicios)",
            "Art. 1456 Código Civil (consentimiento y objeto del contrato)",
            "Art. 2116 Código Civil (mandato / contrato de prestación de servicios)",
        ],
        "tipo": "carta",
        "peticion_tipo": "pago de honorarios dentro de plazo perentorio bajo apercibimiento de demanda",
    },
    {
        "titulo": "Reclamo por seguro no pagado o rechazado",
        "materia": "Reclamo contra aseguradora por negativa de pago de siniestro",
        "keywords": ["seguro", "siniestro rechazado", "aseguradora", "CMF seguros", "póliza", "no pagaron seguro"],
        "articulos_verificados": [
            "Art. 542 Código de Comercio (obligación del asegurador de indemnizar siniestro)",
            "Art. 524 Código de Comercio (contrato de seguro)",
            "Art. 68 DFL 251/1931 (CMF: supervisión de compañías de seguros)",
        ],
        "tipo": "carta",
        "peticion_tipo": "pago de la indemnización del siniestro conforme a la póliza contratada",
    },
    {
        "titulo": "Solicitud de inscripción en registro civil / rectificación",
        "materia": "Solicitud rectificación de acta o inscripción en Registro Civil",
        "keywords": ["registro civil", "rectificación acta", "cambio nombre", "error partida nacimiento", "inscripción"],
        "articulos_verificados": [
            "Art. 17 Ley 4.808 (rectificación de inscripciones en el Registro Civil)",
            "Art. 45 Ley 17.344 (cambio de nombre y apellidos)",
            "Art. 1 Ley 4.808 (Registro Civil de Identificación)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "rectificación de la inscripción registral y emisión de nueva documentación",
    },
    {
        "titulo": "Solicitud de alimentos entre cónyuges separados",
        "materia": "Pensión de alimentos entre ex cónyuges o separados",
        "keywords": ["alimentos cónyuge", "pensión separación", "manutención ex pareja", "alimentos esposo esposa"],
        "articulos_verificados": [
            "Art. 321 N°1 Código Civil (alimentos entre cónyuges)",
            "Art. 175 Código Civil (obligación alimentaria tras divorcio por culpa)",
            "Art. 3 Ley 14.908 (competencia tribunal familia para alimentos)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "fijación de pensión de alimentos entre cónyuges separados o divorciados",
    },
    {
        "titulo": "Reclamo por servicio de agua o alcantarillado (SISS)",
        "materia": "Reclamo contra empresa sanitaria por corte o cobro indebido de agua",
        "keywords": ["agua", "empresa sanitaria", "SISS", "Aguas Andinas", "corte agua", "cobro agua", "alcantarillado"],
        "articulos_verificados": [
            "Art. 11 DFL 382/1988 (obligaciones de la empresa sanitaria)",
            "Art. 32 DFL 382/1988 (prohibición de corte sin notificación previa)",
            "Art. 10 bis Ley 19.496 (derecho a no ser cortado el servicio básico sin aviso)",
        ],
        "tipo": "carta",
        "peticion_tipo": "reconexión del servicio y/o corrección de cobros indebidos",
    },
    {
        "titulo": "Solicitud de pensión de sobrevivencia (AFP/IPS)",
        "materia": "Pensión de viudez o orfandad tras fallecimiento del causante",
        "keywords": ["pensión viudez", "sobrevivencia", "fallecimiento afiliado", "pensión orfandad", "pensión muerto"],
        "articulos_verificados": [
            "Art. 5 DL 3.500 (beneficiarios de pensión de sobrevivencia)",
            "Art. 6 DL 3.500 (pensión de viudez y orfandad)",
            "Art. 58 DL 3.500 (plazo para solicitar pensión de sobrevivencia)",
        ],
        "tipo": "administrativo",
        "peticion_tipo": "otorgamiento de pensión de sobrevivencia por fallecimiento del causante",
    },
    {
        "titulo": "Reclamo por multa de tránsito (Juzgado de Policía Local)",
        "materia": "Recurso de reposición contra infracción de tránsito",
        "keywords": ["multa tránsito", "infracción tránsito", "parte carabineros", "recurso multa", "JPL tránsito"],
        "articulos_verificados": [
            "Art. 20 Ley 18.287 (recurso de reposición ante JPL: plazo 5 días hábiles)",
            "Art. 171 Ley 18.290 (procedimiento infracciones de tránsito)",
            "Art. 7 Ley 18.287 (citación al denunciado)",
        ],
        "tipo": "recurso",
        "peticion_tipo": "dejar sin efecto la infracción de tránsito por los fundamentos expuestos",
    },
    {
        "titulo": "Demanda de precario (recuperación de inmueble)",
        "materia": "Demanda de precario para recuperar inmueble ocupado sin título",
        "keywords": ["precario", "ocupación sin título", "recuperar propiedad", "intruso propiedad", "ocupante sin contrato"],
        "articulos_verificados": [
            "Art. 2195 Código Civil (precario: uso sin título ni contraprestación)",
            "Art. 680 N°6 CPC (juicio sumario para acciones de precario)",
            "Art. 700 Código Civil (posesión y propiedad)",
        ],
        "tipo": "judicial",
        "peticion_tipo": "restitución inmediata del inmueble ocupado en precario",
    },
]


# ─── Funciones de scraping ────────────────────────────────────────────────────

def fetch_page(url: str, timeout: int = 15) -> str | None:
    try:
        r = SESSION.get(url, timeout=timeout)
        r.raise_for_status()
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except Exception as e:
        print(f"  ⚠ Error fetching {url}: {e}")
        return None


def extract_text(html: str, max_chars: int = 8000) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Limpiar líneas vacías consecutivas
    lines = [l for l in text.splitlines() if l.strip()]
    return "\n".join(lines)[:max_chars]


def scrape_leychile(source: dict) -> dict | None:
    """Extrae artículos relevantes de leychile.cl"""
    print(f"  Scraping ley {source['law_id']}...")
    html = fetch_page(source["url"])
    if not html:
        return None

    soup = BeautifulSoup(html, "lxml")
    # Extraer el texto de la ley
    content = soup.find("div", id="contenidoLey") or soup.find("div", class_="textoLey")
    if not content:
        content = soup.find("body")

    text = content.get_text(separator="\n", strip=True)[:10000] if content else ""

    return {
        "source": "leychile",
        "law_id": source["law_id"],
        "titulo": source["name"],
        "url": source["url"],
        "text_preview": text[:3000],
    }


def scrape_generic(source: dict) -> dict | None:
    """Scraping genérico de páginas de formularios"""
    print(f"  Scraping {source['name']}...")
    html = fetch_page(source["url"])
    if not html:
        return None

    text = extract_text(html)
    links = []

    soup = BeautifulSoup(html, "lxml")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        label = a.get_text(strip=True)
        if any(kw in label.lower() for kw in ["formulario", "solicitud", "demanda", "escrito", "reclamo", "recurso"]):
            if href.startswith("http"):
                links.append({"label": label, "url": href})
            elif href.startswith("/"):
                base = "/".join(source["url"].split("/")[:3])
                links.append({"label": label, "url": base + href})

    return {
        "source": source["domain"],
        "titulo": source["name"],
        "url": source["url"],
        "text_preview": text[:3000],
        "links_found": links[:20],
    }


# ─── DeepSeek: convierte contenido scrapeado a template ──────────────────────

def content_to_template(scraped: dict) -> dict | None:
    """Usa DeepSeek para analizar el contenido y generar un template estructurado"""
    if not DEEPSEEK_API_KEY:
        return None

    prompt = f"""Analiza este contenido legal chileno scrapeado y extrae información para crear un template de escrito legal.

FUENTE: {scraped.get('titulo', '')}
URL: {scraped.get('url', '')}
CONTENIDO:
{scraped.get('text_preview', '')}

Genera un JSON con esta estructura exacta:
{{
  "id": "slug-del-tipo-de-documento",
  "titulo": "Título del tipo de documento",
  "keywords": ["lista", "de", "palabras", "clave", "para", "matching"],
  "tipo": "judicial|carta|recurso|administrativo|acuerdo",
  "articulos": ["Art. X Ley Y (descripción)", "Art. Z Código W (descripción)"],
  "descripcion": "Descripción breve de cuándo usar este documento",
  "peticion_tipo": "Qué se pide en este tipo de documento",
  "instruccion_llm": "Instrucción específica para el LLM sobre qué personalizar"
}}

IMPORTANTE:
- Solo artículos que EXISTEN en la ley chilena
- Keywords en español, en minúsculas
- Si el contenido no contiene información suficiente para un template legal, responde solo: null
- Responde SOLO con el JSON, sin texto adicional"""

    try:
        import urllib.request
        data = json.dumps({
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un experto en derecho chileno. Extraes información legal estructurada. Respondes SOLO con JSON válido o null."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 1000,
        }).encode()
        req = urllib.request.Request(
            "https://api.deepseek.com/chat/completions",
            data=data,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
        content = resp["choices"][0]["message"]["content"].strip()
        if content.lower() == "null":
            return None
        # Extraer JSON
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1:
            return None
        return json.loads(content[start:end])
    except Exception as e:
        print(f"    ⚠ DeepSeek error: {e}")
        return None


# ─── Genera templates TypeScript ──────────────────────────────────────────────

def template_to_ts(t: dict) -> str:
    """Convierte un template JSON a bloque TypeScript"""
    keywords = json.dumps(t.get("keywords", []), ensure_ascii=False)
    articulos = json.dumps(t.get("articulos", []), ensure_ascii=False)

    esqueleto = t.get("esqueleto", f"""[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[{t.get('peticion_tipo', 'peticion concreta')}]]

[NOMBRE]
RUT: [RUT]""")

    instruccion = t.get("instruccion_llm", "Rellena los hechos específicos del caso y construye el argumento legal con los artículos verificados.")

    # Escapar backticks en el esqueleto
    esqueleto_escaped = esqueleto.replace("`", "\\`").replace("${", "\\${")
    instruccion_escaped = instruccion.replace("`", "\\`")

    return f"""
  // ── {t.get('titulo', 'Sin título')} (SCRAPEADO) ──
  {{
    id: '{t.get("id", "unknown")}',
    keywords: {keywords},
    titulo: {json.dumps(t.get("titulo", ""), ensure_ascii=False)},
    tipo: '{t.get("tipo", "carta")}',
    articulos: {articulos},
    esqueleto: `{esqueleto_escaped}`,
    instruccion_llm: `{instruccion_escaped}`,
  }},"""


def inject_into_templates_ts(new_templates: list[dict], ts_path: Path):
    """Inyecta los templates nuevos al final del array en templates.ts (sin duplicados)"""
    content = ts_path.read_text(encoding="utf-8")

    # Detectar IDs ya presentes en el archivo para evitar duplicados
    existing_ids = set(re.findall(r"id:\s*['\"]([^'\"]+)['\"]", content))

    # Filtrar solo los templates que no están ya en el archivo
    to_inject = [t for t in new_templates if t.get("id") not in existing_ids]

    if not to_inject:
        print("  (todos los templates ya existen, nada que inyectar)")
        return

    # Buscar el cierre del array TEMPLATES
    marker = "];\n\n// ─────────────────────────"
    if marker not in content:
        print("⚠ No se encontró el marcador en templates.ts, guardando en archivo separado")
        out = ts_path.parent / "scraped_additions.ts"
        additions = "\n".join(template_to_ts(t) for t in to_inject)
        out.write_text(f"// Pegar dentro del array TEMPLATES en templates.ts\n[\n{additions}\n]", encoding="utf-8")
        print(f"  → Guardado en {out}")
        return

    additions = "\n".join(template_to_ts(t) for t in to_inject)
    new_content = content.replace(marker, f"\n{additions}\n{marker}", 1)  # only first occurrence
    ts_path.write_text(new_content, encoding="utf-8")
    print(f"  ✓ {len(to_inject)} templates inyectados en templates.ts ({len(new_templates) - len(to_inject)} ya existían)")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("LEGALHELP - SCRAPER DE PLANILLAS LEGALES CHILENAS")
    print("=" * 60)

    all_scraped = []
    all_templates = []

    # 1. Cargar casos manuales conocidos directamente
    print("\n[1/3] Cargando casos manuales conocidos...")
    for case in KNOWN_CASES:
        t = {
            "id": re.sub(r"[^a-z0-9]+", "-", case["titulo"].lower())[:40].strip("-"),
            "titulo": case["titulo"],
            "keywords": case["keywords"],
            "tipo": case["tipo"],
            "articulos": case["articulos_verificados"],
            "descripcion": case["materia"],
            "peticion_tipo": case["peticion_tipo"],
            "instruccion_llm": f"Redacta el escrito para {case['materia'].lower()}. "
                               f"Petición: {case['peticion_tipo']}. "
                               "Razona el caso con los hechos específicos del cliente.",
        }
        all_templates.append(t)
        print(f"  ✓ {t['titulo']}")

    # 2. Scraping web
    print(f"\n[2/3] Scraping {len(SOURCES)} fuentes web...")
    for source in SOURCES:
        time.sleep(1)  # Respetuoso con los servidores
        try:
            if source["type"] == "law":
                scraped = scrape_leychile(source)
            else:
                scraped = scrape_generic(source)

            if scraped:
                all_scraped.append(scraped)
        except Exception as e:
            print(f"  ✗ Error en {source['name']}: {e}")

    # 3. Convertir scraping a templates con DeepSeek
    print(f"\n[3/3] Convirtiendo contenido scrapeado a templates...")
    if not DEEPSEEK_API_KEY:
        print("  ⚠ Sin DEEPSEEK_API_KEY — saltando análisis LLM, solo templates manuales")
    else:
        for scraped in all_scraped:
            print(f"  Analizando: {scraped['titulo'][:50]}...")
            template = content_to_template(scraped)
            if template:
                # Evitar duplicados por id
                existing_ids = {t["id"] for t in all_templates}
                if template.get("id") not in existing_ids:
                    all_templates.append(template)
                    print(f"    ✓ Nuevo template: {template.get('titulo', template.get('id'))}")
                else:
                    print(f"    ↷ Duplicado, omitiendo")
            else:
                print(f"    — Sin template extraíble")
            time.sleep(0.5)

    # Guardar JSON
    OUTPUT_FILE.write_text(json.dumps(all_templates, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ {len(all_templates)} templates guardados en {OUTPUT_FILE}")

    # Inyectar en templates.ts
    ts_path = Path(__file__).parent.parent / "lib" / "templates.ts"
    if ts_path.exists():
        print(f"\nInyectando en {ts_path}...")
        inject_into_templates_ts(all_templates, ts_path)
    else:
        print(f"\n⚠ No se encontró {ts_path}")

    print("\n" + "=" * 60)
    print(f"RESULTADO: {len(all_templates)} templates disponibles")
    print("=" * 60)

    # Resumen por tipo
    tipos = {}
    for t in all_templates:
        tipo = t.get("tipo", "otro")
        tipos[tipo] = tipos.get(tipo, 0) + 1
    for tipo, count in sorted(tipos.items()):
        print(f"  {tipo:20s}: {count} templates")


if __name__ == "__main__":
    main()
