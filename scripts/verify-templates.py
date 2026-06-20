#!/usr/bin/env python3
"""
Verifica el flujo NUEVO de generacion: replica fielmente lo que hace
app/api/generate-final/route.ts -> findTemplate() + frameworkBlock con
articulos verificados. Comprueba que el documento cita los articulos de la
plantilla y no leyes inventadas.

Uso: DEEPSEEK_API_KEY=xxx python3 scripts/verify-templates.py
"""
import os, re, sys, json, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ["DEEPSEEK_API_KEY"]
SRC = open(os.path.join(ROOT, "lib", "templates.ts"), encoding="utf-8").read()


def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


# ── Parsear los templates desde el .ts ──────────────────────────────────────
def parse_templates():
    body = SRC[SRC.index("TEMPLATES: LegalTemplate[] = ["):SRC.index("export function findTemplate")]
    tpls = []
    for m in re.finditer(r"id:\s*'([^']+)'", body):
        start = m.start()
        nxt = body.find("id:", m.end())
        chunk = body[start: nxt if nxt != -1 else len(body)]
        kws = re.findall(r"keywords:\s*\[([^\]]*)\]", chunk)
        kws = [k for k in re.findall(r"'([^']+)'", kws[0])] if kws else []
        titm = re.search(r"titulo:\s*'([^']+)'", chunk)
        arts = re.search(r"articulos:\s*\[(.*?)\]", chunk, re.DOTALL)
        arts = [a for a in re.findall(r"'([^']+)'", arts.group(1))] if arts else []
        esq = re.search(r"esqueleto:\s*`(.*?)`", chunk, re.DOTALL)
        ins = re.search(r"instruccion_llm:\s*'([^']*)'", chunk)
        tpls.append({
            "id": m.group(1), "keywords": kws,
            "titulo": titm.group(1) if titm else m.group(1),
            "articulos": arts,
            "esqueleto": esq.group(1) if esq else "",
            "instruccion_llm": ins.group(1) if ins else "",
        })
    return tpls


TEMPLATES = parse_templates()


def find_template(materia, hechos):
    text = norm(f"{materia or ''} {hechos or ''}")
    if not text.strip():
        return None
    best, best_score = None, 0
    for t in TEMPLATES:
        score = 0
        for kw in t["keywords"]:
            k = re.escape(norm(kw))
            if re.search(r'(?:^|\s)' + k + r'(?:\s|$)', text):
                score += 1
        if score > best_score:
            best_score, best = score, t
    return best if best_score >= 1 else None


SYSTEM = re.search(r"const SYSTEM\s*=\s*`(.*?)`;", open(os.path.join(ROOT, "app", "api", "generate-final", "route.ts"), encoding="utf-8").read(), re.DOTALL).group(1)


def call(system, user):
    body = json.dumps({"model": "deepseek-chat", "messages": [
        {"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.3, "max_tokens": 8192}).encode()
    req = urllib.request.Request("https://api.deepseek.com/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


CASOS = [
    ("Solicitud para renovar licencia de conducir",
     "nombre: Alejandro Matteucci | rut: 13.829.012-3 | domicilio: Vitacura 7181 | necesito renovar licencia de conducir para trabajar en uber, debo pension alimenticia varios meses, RIT Z-4207-2021 4 Juzgado de Familia de Santiago"),
    ("Demanda por despido injustificado",
     "nombre: Juan Perez | rut: 11.222.333-4 | me despidieron de Falabella sin causa tras 4 anios, sueldo 800 mil"),
    ("Carta reclamo SERNAC",
     "nombre: Maria Soto | rut: 9.888.777-6 | compre un refrigerador en Ripley y llego con falla, quiero devolucion"),
]

for tipo, datosStr in CASOS:
    t = find_template(tipo, datosStr)
    print("=" * 80)
    print(f"CASO: {tipo}")
    print(f"  -> plantilla matcheada: {t['id'] if t else 'NINGUNA (freeform)'}")
    if t:
        print(f"  -> articulos verificados: {t['articulos']}")
    fw = ""
    if t:
        fw = (f"\n\nFRAMEWORK LEGAL VERIFICADO PARA ESTE CASO ({t['titulo']}):\n"
              f"Articulos correctos a citar (USA EXCLUSIVAMENTE estos):\n" + "\n".join("- " + a for a in t["articulos"]) +
              f"\n\nESTRUCTURA BASE:\n{t['esqueleto']}\n\nINSTRUCCION: {t['instruccion_llm']}")
    user = (f"Redacta el siguiente documento legal chileno.\n\nFECHA DE HOY: 18 de junio de 2026.\n\n"
            f"TIPO DE DOCUMENTO: {t['titulo'] if t else tipo}\n\nDATOS DEL CASO:\n{datosStr}{fw}\n\n"
            f"Redacta el documento completo. {'Sigue la ESTRUCTURA BASE y cita SOLO los articulos verificados.' if t else ''}")
    doc = call(SYSTEM, user)
    # chequeo: las leyes citadas en el doc estan en los articulos verificados?
    leyes_doc = set(re.findall(r'\b\d{4,5}\b', doc))         # numeros de ley en el doc
    leyes_ok = set(re.findall(r'\b\d{4,5}\b', " ".join(t["articulos"]))) if t else set()
    inventadas = leyes_doc - leyes_ok - {"2026", "1908"}      # quita anios obvios
    print(f"  -> leyes citadas en el doc: {sorted(leyes_doc)}")
    if t:
        print(f"  -> NUMEROS fuera del framework verificado: {sorted(inventadas) if inventadas else 'NINGUNO ✓'}")
    print("\n--- primeras 18 lineas del documento ---")
    print("\n".join(doc.splitlines()[:18]))
    print()
