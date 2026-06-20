#!/usr/bin/env python3
"""
Corre varios casos contra el prompt v3 (enfoque nuevo) con turnos basados
en estado. Sirve para detectar regresiones: que casos simples no se
sobre-judicialicen ni pidan datos de mas.

Uso: DEEPSEEK_API_KEY=xxx python3 scripts/run-cases.py [prompt_v3.txt]
"""
import os
import sys
import json
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_KEY = os.environ["DEEPSEEK_API_KEY"]
PROMPT_FILE = sys.argv[1] if len(sys.argv) > 1 else "prompt_v3.txt"
with open(os.path.join(ROOT, "scripts", PROMPT_FILE), encoding="utf-8") as f:
    SYSTEM = f.read()

CASES = {
    "DESPIDO": [
        "me echaron de falabella el 3 de enero sin darme ningun motivo, llevaba 4 anios trabajando ahi de vendedor",
        "juan perez soto, 11222333-4, vivo en av las condes 100, las condes",
        "ganaba 800 mil liquidos al mes",
    ],
    "SERNAC": [
        "compre un refrigerador en ripley y llego con la puerta mala, quiero reclamar y que me devuelvan la plata",
        "maria soto, 9888777-6, domicilio los aromos 45, maipu",
        "lo compre el 10 de mayo y pague 400 mil",
    ],
    "DESALOJO": [
        "tengo un arrendatario que no me paga hace 3 meses y quiero que se vaya de mi departamento",
        "pedro diaz, 7654321-0, vivo en av italia 200, providencia",
        "el departamento arrendado esta en nunoa, calle uno 33, el arriendo es 350 mil mensual",
    ],
}


def extract_json(text):
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


def call(messages):
    body = json.dumps({"model": "deepseek-chat", "messages": messages,
                       "temperature": 0.2, "max_tokens": 2048}).encode()
    req = urllib.request.Request("https://api.deepseek.com/chat/completions", data=body,
                                 headers={"Content-Type": "application/json",
                                          "Authorization": f"Bearer {API_KEY}"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


def run_case(name, turns):
    print("\n" + "#" * 78)
    print(f"# CASO: {name}")
    print("#" * 78)
    estado = {}
    ready_turn = None
    for n, turn in enumerate(turns, 1):
        if estado:
            uc = ("ESTADO DEL CASO HASTA AHORA:\n" + json.dumps(estado, ensure_ascii=False, indent=2)
                  + "\n\nEL CLIENTE ACABA DE DECIR:\n" + turn + "\n\nActualiza el caso y responde con el JSON.")
        else:
            uc = turn
        raw = call([{"role": "system", "content": SYSTEM}, {"role": "user", "content": uc}])
        data = extract_json(raw) or {}
        estado["tipo_documento"] = data.get("tipo_documento", estado.get("tipo_documento"))
        estado["destinatario_inferido"] = data.get("destinatario_inferido", estado.get("destinatario_inferido"))
        nd = data.get("datos", {})
        if isinstance(nd, dict):
            estado.setdefault("datos", {}).update({k: v for k, v in nd.items() if v not in (None, "", [])})
        print(f"\n[USR {n}] {turn}")
        print(f"[BOT] {data.get('response_message','')}")
        print(f"      ready={data.get('ready')}")
        if data.get("ready") and ready_turn is None:
            ready_turn = n
            break
    print(f"\n--> tipo: {estado.get('tipo_documento')}")
    print(f"--> dest: {estado.get('destinatario_inferido')}")
    print(f"--> cobro en turno: {ready_turn}")


def main():
    for name, turns in CASES.items():
        run_case(name, turns)


if __name__ == "__main__":
    main()
