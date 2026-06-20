#!/usr/bin/env python3
"""
Replay del enfoque NUEVO:
  1. Prompt simplificado (scripts/prompt_v2.txt): el chat no interroga,
     no asume, evalua impedimentos legales, y deja datos menores como blanks.
  2. IDEA DEL USUARIO — turnos basados en ESTADO:
     en vez de mandar toda la conversacion cruda cada turno, se manda
     el system + el estado compacto acumulado + el ultimo mensaje del cliente.
     Asi el modelo no se ancla en sus propias preguntas previas y la salida
     se mantiene chica (no se trunca el JSON).

Uso:
  DEEPSEEK_API_KEY=xxx python3 scripts/replay-chat-v2.py
"""
import os
import sys
import json
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_KEY = os.environ.get("DEEPSEEK_API_KEY")
if not API_KEY:
    print("ERROR: falta DEEPSEEK_API_KEY", file=sys.stderr)
    sys.exit(1)

PROMPT_FILE = sys.argv[1] if len(sys.argv) > 1 else "prompt_v2.txt"
with open(os.path.join(ROOT, "scripts", PROMPT_FILE), encoding="utf-8") as f:
    SYSTEM = f.read()


def extract_json(text: str):
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


USER_TURNS = [
    "necesito un escrito para renobar mi licencia de conducir para trajar en uber y poder pagar mi pension alimenticia",
    "no estoy al dia",
    "alejandro matteucci 138290123 vitacura 7181 vitacura",
]


def main():
    estado = {}   # se acumula turno a turno
    total = 0.0

    print("=" * 78)
    print("REPLAY CHAT V2 — prompt simple + turnos basados en estado")
    print("=" * 78)

    for n, turn in enumerate(USER_TURNS, 1):
        print(f"\n[USUARIO {n}] {turn}")

        if estado:
            user_content = (
                "ESTADO DEL CASO HASTA AHORA (lo ya reunido):\n"
                + json.dumps(estado, ensure_ascii=False, indent=2)
                + "\n\nEL CLIENTE ACABA DE DECIR:\n" + turn
                + "\n\nActualiza el caso y responde con el JSON."
            )
        else:
            user_content = turn

        messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user_content}]
        t0 = time.time()
        raw = call_deepseek(messages)
        dt = time.time() - t0
        total += dt
        data = extract_json(raw)
        if data is None:
            print(f"[ASISTENTE] (no devolvio JSON valido) {raw[:200]}")
            continue

        # merge de estado
        estado["tipo_documento"] = data.get("tipo_documento", estado.get("tipo_documento"))
        estado["destinatario_inferido"] = data.get("destinatario_inferido", estado.get("destinatario_inferido"))
        nuevos = data.get("datos", {})
        if isinstance(nuevos, dict):
            estado.setdefault("datos", {}).update({k: v for k, v in nuevos.items() if v not in (None, "", [])})

        msg = str(data.get("response_message", ""))
        ready = data.get("ready", False)
        if data.get("analisis_legal"):
            print(f"   [analisis_legal] {data['analisis_legal']}")
        print(f"[ASISTENTE] {msg}")
        print(f"   -> ready={ready}   ({dt:.1f}s)")
        if ready:
            print("\n*** COBRA AQUI (ready=true) ***")
            break

    print("\n" + "=" * 78)
    print(f"Latencia total: {total:.1f}s en {n} turnos  (prom {total/n:.1f}s/turno)")
    print("Estado final:")
    print(json.dumps(estado, ensure_ascii=False, indent=2))
    print("=" * 78)


if __name__ == "__main__":
    main()
