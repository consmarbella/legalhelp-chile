"""
LegalHelp TAG Core Backend — Vercel Serverless Function
=========================================================
Usa PydanticAI + DeepSeek para extraer multas TAG desde
certificados del Registro Civil de Chile.

Variables de entorno (Vercel):
    DEEPSEEK_API_KEY    (obligatoria)
"""

import os
import re
from datetime import datetime
from typing import Dict, List, Optional

from dateutil.relativedelta import relativedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel, Field

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="LegalHelp TAG Core Backend",
    description="Backend determinista con PydanticAI + DeepSeek para prescripción TAG",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Handler para Vercel (ASGI serverless)
handler = Mangum(app, lifespan="off")

# ---------------------------------------------------------------------------
# Esquemas Pydantic de validación rígida
# ---------------------------------------------------------------------------
class MultaExtract(BaseModel):
    """Cada multa individual extraída del certificado."""
    id: str = Field(description="ID de la multa (numérico único dentro del certificado)")
    infraccion: str = Field(description="Texto descriptivo de la infracción cometida")
    tribunal: str = Field(description="Nombre del Juzgado de Policía Local de origen, ej: '1 POLICIA LOCAL DE SANTIAGO'")
    rol: str = Field(description="Número identificador del Rol o Causa, ej: '12345'")
    anio: Optional[str] = Field(description="Año del rol si aparece (4 dígitos). Si no aparece, null", default=None)
    fechaInfraccion: str = Field(description="Fecha de la infracción en formato estricto DD/MM/YYYY")
    fechaIngreso: str = Field(description="Fecha de ingreso al RMNP en formato estricto DD/MM/YYYY")


class CertificadoEstructurado(BaseModel):
    """Documento completo extraído del certificado de multas."""
    patente: str = Field(description="Patente del vehículo en mayúsculas, sin puntos ni guiones. Ej: 'ABCD12'")
    propietario: str = Field(description="Nombre completo del titular del vehículo")
    run: str = Field(description="RUN del propietario con guión y dígito verificador. Ej: '12.345.678-9'")
    multas: List[MultaExtract]


class ParseTagRequest(BaseModel):
    texto_pdf: str = Field(description="Texto plano extraído del certificado PDF")


class MultaOut(BaseModel):
    """Formato de salida de cada multa para el frontend."""
    id: str
    infraccion: str
    tribunal: str
    rol: str
    anio: Optional[str] = None
    fechaInfraccion: str
    fechaIngreso: str
    comuna: str
    juzgadoTitulo: str
    tribunalKey: str


class ParseTagResponse(BaseModel):
    patente: str
    propietario: str
    run: str
    groups: Dict[str, List[MultaOut]]

# ---------------------------------------------------------------------------
# Configuración del Agente PydanticAI con DeepSeek
# ---------------------------------------------------------------------------
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

model_deepseek = OpenAIModel(
    model_name="deepseek-chat",
    base_url="https://api.deepseek.com/v1",
    api_key=DEEPSEEK_API_KEY,
)

agente_tag = Agent(
    model=model_deepseek,
    result_type=CertificadoEstructurado,
    system_prompt=(
        "Eres un extractor de datos legal chileno ultra-preciso. "
        "Tu única misión es extraer TODAS las multas del CERTIFICADO DE REGISTRO DE MULTAS "
        "DE TRÁNSITO NO PAGADAS (Registro Civil de Chile).\n\n"
        "=== ESTRUCTURA DEL CERTIFICADO ===\n"
        "El certificado tiene esta estructura de campos exactos:\n\n"
        "- PATENTE UNICA: [patente ej: ABCD12] (sin puntos ni guiones)\n"
        "- Nombre: [nombre del propietario]\n"
        "- R.U.N.: [RUN con puntos y guión, ej: 12.345.678-9]\n\n"
        "Y luego una lista de multas, CADA UNA con esta estructura:\n\n"
        "  ID MULTA: [número único]\n"
        "  INFRACCION: [texto descriptivo de la infracción]\n"
        "  TRIBUNAL: [nombre del Juzgado de Policía Local, ej: 1 POLICIA LOCAL DE SANTIAGO]\n"
        "  ROL: [número de rol, ej: 12345]\n"
        "  AÑO ROL: [año de 4 dígitos, ej: 2019]\n"
        "  FECHA INFRACCION: [fecha DD/MM/YYYY o DD-MM-YYYY]\n"
        "  FECHA INGRESO RMNP: [fecha DD/MM/YYYY o DD-MM-YYYY]\n\n"
        "=== REGLAS ESTRICTAS DE EXTRACCIÓN ===\n"
        "1. Extrae CADA multa individual del certificado. NO omitas ninguna.\n"
        "2. FECHAS: Convierte TODAS las fechas al formato estricto DD/MM/YYYY. "
        "Si ves DD-MM-YYYY, reemplaza los guiones por barras.\n"
        "3. PATENTE: Extráela de 'PATENTE UNICA:' o 'PATENTE:'. "
        "Debe ir en mayúsculas, sin puntos, sin espacios. Ej: 'ABCD12'.\n"
        "4. RUN: Extráelo de 'R.U.N.:' o 'RUN:'. Debe incluir puntos y guión. "
        "Ej: '12.345.678-9'. Si viene sin formato, agrégaselo.\n"
        "5. TRIBUNAL: Extrae el nombre COMPLETO del tribunal. "
        "Ej: '1 POLICIA LOCAL DE SANTIAGO'. NO traduzcas ni modifiques.\n"
        "6. ROL + AÑO ROL: El ROL es el número de causa. "
        "El AÑO ROL es el año de 4 dígitos. Si están combinados como '12345-2019', "
        "pon '12345' en rol y '2019' en anio.\n"
        "7. ID MULTA: Es el identificador numérico único de cada multa.\n"
        "8. NO inventes datos. Si un campo no aparece explícitamente, usa '' (vacío) o null.\n"
        "9. Si una multa no tiene FECHA INGRESO RMNP, asígnale fecha vacía.\n"
        "10. INFRACCION: Extrae el texto descriptivo completo de la infracción.\n\n"
        "=== EJEMPLO DE SALIDA ESPERADA ===\n"
        "{\n"
        '  "patente": "ABCD12",\n'
        '  "propietario": "JUAN PEREZ GONZALEZ",\n'
        '  "run": "12.345.678-9",\n'
        '  "multas": [\n'
        "    {\n"
        '      "id": "1",\n'
        '      "infraccion": "VELOCIDAD MAXIMA PERMITIDA",\n'
        '      "tribunal": "1 POLICIA LOCAL DE SANTIAGO",\n'
        '      "rol": "12345",\n'
        '      "anio": "2019",\n'
        '      "fechaInfraccion": "15/03/2019",\n'
        '      "fechaIngreso": "20/03/2019"\n'
        "    }\n"
        "  ]\n"
        "}"
    ),
)


# ---------------------------------------------------------------------------
# Lógica de normalización de tribunales JPL
# ---------------------------------------------------------------------------
ORDINALES = {"1": "Primer", "2": "Segundo", "3": "Tercer", "4": "Cuarto", "5": "Quinto"}


def normalizar_tribunal(raw_name: str):
    """Normaliza el nombre de un Juzgado de Policía Local a formato título y extrae la comuna."""
    tt = raw_name.upper().strip()

    num_match = re.search(r"^(\d)\s*(?:DE\s+)?(?:JUZGADO\s+DE\s+)?POLICIA LOCAL", tt)
    num = num_match.group(1) if num_match else None

    comuna_raw = re.sub(
        r"^\d?\s*(?:DE\s+)?(?:JUZGADO\s+DE\s+)?POLICIA LOCAL(?: DE)?\s*",
        "",
        tt,
    ).strip()
    comuna = " ".join([w.capitalize() for w in comuna_raw.split()])

    if num:
        ordinal = ORDINALES.get(num, f"{num}°")
        juzgado_titulo = f"{ordinal} Juzgado de Policía Local de {comuna}"
    else:
        juzgado_titulo = f"Juzgado de Policía Local de {comuna}"

    return comuna, juzgado_titulo


# ---------------------------------------------------------------------------
# Endpoint único de parseo
# ---------------------------------------------------------------------------
@app.post("/api/parse-tag", response_model=ParseTagResponse)
async def parse_tag(payload: ParseTagRequest):
    texto = payload.texto_pdf.strip()
    if not texto:
        raise HTTPException(status_code=400, detail="El texto del PDF está vacío")

    if not DEEPSEEK_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="DEEPSEEK_API_KEY no está configurada en el backend.",
        )

    try:
        response = await agente_tag.run(
            f"Estructura el siguiente certificado de multas:\n\n{texto}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al comunicarse con DeepSeek: {str(e)}",
        )

    datos: CertificadoEstructurado = response.data

    hoy = datetime.now()
    cutoff = hoy - relativedelta(years=3)

    groups: Dict[str, List[MultaOut]] = {}

    for m in datos.multas:
        try:
            f_ingreso = datetime.strptime(m.fechaIngreso.strip(), "%d/%m/%Y")
        except (ValueError, AttributeError):
            continue

        if f_ingreso <= cutoff:
            comuna, juzgado_titulo = normalizar_tribunal(m.tribunal)
            tribunal_key = m.tribunal.strip().upper()

            multa_out = MultaOut(
                id=m.id,
                infraccion=m.infraccion,
                tribunal=m.tribunal,
                rol=m.rol,
                anio=m.anio,
                fechaInfraccion=m.fechaInfraccion,
                fechaIngreso=m.fechaIngreso,
                comuna=comuna,
                juzgadoTitulo=juzgado_titulo,
                tribunalKey=tribunal_key,
            )

            groups.setdefault(tribunal_key, []).append(multa_out)

    return ParseTagResponse(
        patente=datos.patente,
        propietario=datos.propietario,
        run=datos.run,
        groups=groups,
    )


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
