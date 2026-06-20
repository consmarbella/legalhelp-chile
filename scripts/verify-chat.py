#!/usr/bin/env python3
"""
Verificacion FIEL de app/api/chat/route.ts:
- system = DEEPSEEK_SYSTEM_PROMPT real (lib/prompts.ts)
- findTemplate() sobre message + estado
- tmplContext NUEVO (solo identidad + situacion, sin pedir variables tecnicas)
- turnos basados en estado
Comprueba que NO entra en loop y que cierra (ready) rapido.

Uso: DEEPSEEK_API_KEY=xxx python3 scripts/verify-chat.py
"""
import os, re, sys, json, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DKEY = os.environ.get("DEEPSEEK_API_KEY")
AKEY = os.environ.get("ANTHROPIC_API_KEY")
AMODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5")
PROVIDER = "anthropic" if AKEY else "deepseek"

SYSTEM = re.search(r"DEEPSEEK_SYSTEM_PROMPT\s*=\s*`(.*?)`",
                   open(os.path.join(ROOT, "lib", "prompts.ts"), encoding="utf-8").read(), re.DOTALL).group(1)
TSRC = open(os.path.join(ROOT, "lib", "templates.ts"), encoding="utf-8").read()


def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def parse_templates():
    body = TSRC[TSRC.index("TEMPLATES: LegalTemplate[] = ["):TSRC.index("export function findTemplate")]
    out = []
    for m in re.finditer(r"id:\s*'([^']+)'", body):
        nxt = body.find("id:", m.end())
        chunk = body[m.start(): nxt if nxt != -1 else len(body)]
        kws = re.findall(r"keywords:\s*\[([^\]]*)\]", chunk)
        kws = re.findall(r"'([^']+)'", kws[0]) if kws else []
        titm = re.search(r"titulo:\s*'([^']+)'", chunk)
        out.append({"id": m.group(1), "keywords": kws, "titulo": titm.group(1) if titm else m.group(1)})
    return out


TEMPLATES = parse_templates()


def find_template(materia, hechos):
    text = norm(f"{materia or ''} {hechos or ''}")
    if not text.strip():
        return None
    best, bs = None, 0
    for t in TEMPLATES:
        sc = sum(1 for kw in t["keywords"] if re.search(r'(?:^|\s)' + re.escape(norm(kw)) + r'(?:\s|$)', text))
        if sc > bs:
            bs, best = sc, t
    return best if bs >= 1 else None


def call(messages):
    if PROVIDER == "anthropic":
        system = "\n".join(m["content"] for m in messages if m["role"] == "system")
        msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
        body = json.dumps({"model": AMODEL, "max_tokens": 2048, "temperature": 0.2,
                           "system": system, "messages": msgs}).encode()
        req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body,
            headers={"content-type": "application/json", "x-api-key": AKEY,
                     "anthropic-version": "2023-06-01"}, method="POST")
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read())
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    body = json.dumps({"model": "deepseek-chat", "messages": messages,
                       "temperature": 0.2, "max_tokens": 2048}).encode()
    req = urllib.request.Request("https://api.deepseek.com/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {DKEY}"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


def extract_json(text):
    s = text.find("{")
    if s == -1:
        return None
    d = 0
    for i in range(s, len(text)):
        if text[i] == "{":
            d += 1
        elif text[i] == "}":
            d -= 1
            if d == 0:
                try:
                    return json.loads(text[s:i + 1])
                except Exception:
                    return None
    return None


USER_TURNS = [
    "necesito un escrito para renobar mi licencia de conducir para trajar en uber y poder pagar mi pension alimenticia",
    "no estoy al dia",
    "alejandro matteucci 138290123 vitacura 7181 vitacura",
    "b",
]

estado = {}
for n, turn in enumerate(USER_TURNS, 1):
    prev_datos = estado.get("datos", {})
    has_state = bool(estado.get("tipo_documento")) or bool(prev_datos)
    state_for_prompt = {"tipo_documento": estado.get("tipo_documento"),
                        "destinatario_inferido": estado.get("destinatario_inferido"), "datos": prev_datos}
    if has_state:
        uc = (f"ESTADO DEL CASO HASTA AHORA:\n{json.dumps(state_for_prompt, ensure_ascii=False)}\n\n"
              f"EL CLIENTE ACABA DE DECIR:\n{turn}\n\nActualiza el caso y responde con el JSON.")
    else:
        uc = turn
    matched = find_template(estado.get("tipo_documento"), turn + " " + " ".join(str(v) for v in prev_datos.values()))
    tmpl = ""
    if matched:
        tmpl = (f"\n\nDOCUMENTO IDENTIFICADO (plantilla verificada): \"{matched['titulo']}\". Es el documento correcto "
                "y su fundamento legal YA esta verificado: NO cuestiones ni preguntes por leyes, vias ni tribunales. "
                f"Usa exactamente \"{matched['titulo']}\" como tipo_documento.\nEN ESTE CHAT solo necesitas reunir: "
                "(1) identidad del cliente (nombre, RUT, domicilio) y (2) que el cliente cuente su situacion en sus "
                "palabras. NO preguntes datos tecnicos, clases, categorias, porcentajes, folios ni numeros: TODO eso va "
                "como espacio para rellenar en el documento, no se pregunta. Apenas tengas identidad + la situacion "
                "basica, marca ready:true y NO sigas preguntando.")
    final_user = uc + tmpl
    data = extract_json(call([{"role": "system", "content": SYSTEM}, {"role": "user", "content": final_user}])) or {}
    if matched:
        print(f"   [plantilla: {matched['id']}]")
    print(f"[USR {n}] {turn}")
    print(f"[BOT] {data.get('response_message','(sin JSON)')}")
    print(f"      ready={data.get('ready')}\n")
    estado["tipo_documento"] = data.get("tipo_documento", estado.get("tipo_documento"))
    estado["destinatario_inferido"] = data.get("destinatario_inferido", estado.get("destinatario_inferido"))
    nd = data.get("datos", {})
    if isinstance(nd, dict):
        estado.setdefault("datos", {}).update({k: v for k, v in nd.items() if v not in (None, "", [])})
    if data.get("ready"):
        print(f"*** CERRO (ready=true) en turno {n} ***")
        break
