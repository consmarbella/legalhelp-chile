#!/usr/bin/env python3
"""
Replay determinista del chat real contra DeepSeek.
Reproduce fielmente la logica de app/api/chat/route.ts:
  - mismo system prompt (extraido de lib/prompts.ts)
  - historial = mensajes user (crudos) + assistant (response_message)
  - mismo modelo deepseek-chat, temperature 0.2
Imprime la transcripcion, el flag ready y la latencia por turno.

Uso:
  DEEPSEEK_API_KEY=xxx python3 scripts/replay-chat.py
"""
import os
import re
import sys
import json
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_KEY = os.environ.get("DEEPSEEK_API_KEY")
if not API_KEY:
    print("ERROR: falta DEEPSEEK_API_KEY", file=sys.stderr)
    sys.exit(1)


def load_system_prompt() -> str:
    """Extrae el template literal de DEEPSEEK_SYSTEM_PROMPT desde lib/prompts.ts."""
    with open(os.path.join(ROOT, "lib", "prompts.ts"), encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"DEEPSEEK_SYSTEM_PROMPT\s*=\s*`(.*?)`", src, re.DOTALL)
    if not m:
        raise RuntimeError("No se encontro DEEPSEEK_SYSTEM_PROMPT")
    return m.group(1)


def extract_json(text: str):
    """Mismo algoritmo de balanceo de llaves que extractJSON en route.ts."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i + 1])
                except Exception:
                    return None
    return None


def call_deepseek(messages):
    body = json.dumps({
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 2048,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


# Caso real de la licencia (turnos exactos del usuario, desordenados como en la vida real)
USER_TURNS = [
    "necesito un escrito para renobar mi licencia de conducir para trajar en uber y poder pagar mi pension alimenticia",
    "alejandro matteucci 138290123",
    "vitacura 7181 vitacura",
    "RIT Z-4207-2021, 4 Juzgado de Familia de Santiago, le pago a ignacio matteucci 150 lucas mensual",
    "necesito renovarla",
]


def main():
    system = load_system_prompt()
    history = []  # alterna user (crudo) / assistant (response_message)
    case = {}
    total = 0.0

    print("=" * 78)
    print("REPLAY CHAT — caso licencia + pension")
    print("=" * 78)

    for n, turn in enumerate(USER_TURNS, 1):
        print(f"\n[USUARIO {n}] {turn}")
        messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": turn}]
        t0 = time.time()
        raw = call_deepseek(messages)
        dt = time.time() - t0
        total += dt
        data = extract_json(raw)
        if data is None:
            print(f"[ASISTENTE] (no devolvio JSON valido) {raw[:200]}")
            history += [{"role": "user", "content": turn}, {"role": "assistant", "content": raw}]
            continue
        msg = str(data.get("response_message", ""))
        ready = data.get("ready", False)
        for k, v in data.items():
            if k not in ("response_message", "ready", "datos_faltantes") and v not in (None, "", []):
                case[k] = v
        print(f"[ASISTENTE] {msg}")
        print(f"   -> ready={ready}   ({dt:.1f}s)")
        history += [{"role": "user", "content": turn}, {"role": "assistant", "content": msg}]
        if ready:
            print("\n*** COBRA AQUI (ready=true) ***")
            break

    print("\n" + "=" * 78)
    print(f"Latencia total: {total:.1f}s en {n} turnos  (prom {total/n:.1f}s/turno)")
    print("Datos recopilados:")
    for k, v in case.items():
        if k not in ("tipo_documento", "destinatario_inferido", "datos_recopilados", "detalle_caso"):
            print(f"   {k}: {v}")
    print(f"   tipo_documento: {case.get('tipo_documento')}")
    print(f"   destinatario:   {case.get('destinatario_inferido')}")
    print("=" * 78)


if __name__ == "__main__":
    main()
