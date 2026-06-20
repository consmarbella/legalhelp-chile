#!/usr/bin/env python3
"""
Genera el documento final usando el MISMO system prompt de
app/api/generate-final/route.ts y un estado de caso dado.
Sirve para verificar que el escrito sale con la via legal correcta,
sin inventar hechos ("vencida") y con blanks donde falta dato menor.

Uso:
  DEEPSEEK_API_KEY=xxx python3 scripts/replay-generate.py
"""
import os
import re
import sys
import json
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_KEY = os.environ.get("DEEPSEEK_API_KEY")
if not API_KEY:
    print("ERROR: falta DEEPSEEK_API_KEY", file=sys.stderr)
    sys.exit(1)


def load_generate_system() -> str:
    with open(os.path.join(ROOT, "app", "api", "generate-final", "route.ts"), encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"const SYSTEM\s*=\s*`(.*?)`;", src, re.DOTALL)
    if not m:
        raise RuntimeError("No se encontro const SYSTEM en generate-final/route.ts")
    return m.group(1)


# Estado final correcto (corrida 2 del chat v3)
ESTADO = {
    "tipo_documento": "Solicitud de autorización judicial para renovar licencia de conducir",
    "destinatario_inferido": "4° Juzgado de Familia de Santiago",
    "datos": {
        "hechos": "necesito renovar mi licencia de conducir para trabajar en Uber y pagar mi pensión alimenticia",
        "nombre": "Alejandro Matteucci",
        "rut": "13.829.012-3",
        "domicilio": "Vitacura 7181, Vitacura",
        "deuda_pension": "sí, 150 mil pesos mensuales, varios meses atrasados",
        "rit": "Z-4207-2021",
        "tribunal_origen": "4° Juzgado de Familia de Santiago",
        "acreedor": "Ignacio Matteucci",
    },
}

SKIP = {"tipo_documento", "response_message", "ready", "datos_faltantes", "orderId", "destinatario_inferido"}


def flatten(obj, lines):
    for k, v in obj.items():
        if k in SKIP or v in (None, "", []):
            continue
        if isinstance(v, dict):
            flatten(v, lines)
        elif isinstance(v, list):
            lines.append(f"- {k}: {', '.join(map(str, v))}")
        else:
            lines.append(f"- {k}: {v}")
    return lines


def main():
    system = load_generate_system()
    tipo = ESTADO["tipo_documento"]
    datos_lines = []
    flatten(ESTADO, datos_lines)
    # incluir destinatario explicito
    datos_lines.append(f"- destinatario: {ESTADO['destinatario_inferido']}")
    datos_str = "\n".join(dict.fromkeys(datos_lines))

    user = (
        "Redacta el siguiente documento legal chileno.\n\n"
        "FECHA DE HOY: 18 de junio de 2026 — usa esta fecha en el encabezado. "
        "NUNCA uses [DIA], [MES] ni placeholders de fecha.\n\n"
        f"TIPO DE DOCUMENTO: {tipo}\n\n"
        f"DATOS DEL CASO:\n{datos_str}\n\n"
        "Redacta el documento completo, profesional y listo para usar. "
        "Si falta la direccion de la contraparte, omiti ese campo en lugar de poner [DATO PENDIENTE]."
    )

    body = json.dumps({
        "model": "deepseek-chat",
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.3,
        "max_tokens": 8192,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    doc = data["choices"][0]["message"]["content"]

    print("=" * 78)
    print("DOCUMENTO GENERADO")
    print("=" * 78)
    print(doc)
    print("=" * 78)
    # chequeos objetivos
    low = doc.lower()
    print("\nCHEQUEOS OBJETIVOS:")
    print(f"  Menciona Juzgado de Familia:        {'familia' in low}")
    print(f"  Menciona Ley 21.389:                {'21.389' in doc or '21389' in doc}")
    print(f"  NO dice 'vencida'/'por vencer':     {'vencid' not in low and 'por vencer' not in low}")
    print(f"  NO lo manda a Direccion de Transito: {'tránsito' not in low and 'transito' not in low}")


if __name__ == "__main__":
    main()
