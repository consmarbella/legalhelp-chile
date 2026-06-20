#!/usr/bin/env python3
"""
Banco de pruebas COMPARATIVO: baseline (prompt actual + historial completo)
vs v3 (prompt_v3 + turnos basados en estado), sobre las mismas categorias
con el mismo usuario simulado.

Metricas OBJETIVAS por codigo (no juez-LLM):
  - cobro (ready) y en cuantos turnos
  - json_fail (cuantas veces el chat no devolvio JSON valido / se trunco)
  - pregunto_basura (telefono, correo, clase de licencia, fecha de vencimiento)
  - tipo_documento final

Uso: DEEPSEEK_API_KEY=xxx python3 scripts/bench.py [N_categorias]
"""
import os, re, sys, json, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ["DEEPSEEK_API_KEY"]
MAX_TURNS = 7

# prompt baseline (actual) desde lib/prompts.ts
with open(os.path.join(ROOT, "lib", "prompts.ts"), encoding="utf-8") as f:
    BASELINE_SYS = re.search(r"DEEPSEEK_SYSTEM_PROMPT\s*=\s*`(.*?)`", f.read(), re.DOTALL).group(1)
# prompt nuevo
with open(os.path.join(ROOT, "scripts", "prompt_v3.txt"), encoding="utf-8") as f:
    V3_SYS = f.read()

# carga TODAS las categorias con pagina dedicada (las del sitemap)
with open(os.path.join(ROOT, "data", "paginas.json"), encoding="utf-8") as f:
    _paginas = json.load(f)
_seen = set()
SAMPLE = []
for _p in _paginas:
    c = _p.get("categoria")
    if not _p.get("variable") and c and c not in _seen and c != "Servicios legales":
        _seen.add(c)
        SAMPLE.append(c)

BASURA = ["teléfono", "telefono", "correo", "email", "clase de licencia",
          "fecha de vencimiento", "número de licencia", "numero de licencia"]


def call(messages, temp=0.4):
    body = json.dumps({"model": "deepseek-chat", "messages": messages,
                       "temperature": temp, "max_tokens": 2048}).encode()
    req = urllib.request.Request("https://api.deepseek.com/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


def extract_json(text):
    s = text.find("{")
    if s == -1: return None
    d = 0
    for i in range(s, len(text)):
        if text[i] == "{": d += 1
        elif text[i] == "}":
            d -= 1
            if d == 0:
                try: return json.loads(text[s:i+1])
                except Exception: return None
    return None


def sim_user(category, history_txt, first):
    sys_p = (f"Eres un cliente chileno que necesita ayuda legal con: {category}. "
             "Inventa y manten datos personales realistas y CONSISTENTES (nombre chileno completo, "
             "RUT con formato, domicilio con comuna, y los hechos propios del caso). Responde como "
             "cliente real: breve, a veces desordenado, sin entregar todo de una vez. Cuando el "
             "abogado te pida un dato, daselo. Responde SOLO el texto del mensaje, sin JSON ni comillas.")
    if first:
        u = f"Escribe tu primer mensaje pidiendo ayuda con: {category}. Una o dos frases, lenguaje cotidiano."
    else:
        u = f"El abogado dijo:\n{history_txt}\n\nResponde como el cliente."
    return call([{"role": "system", "content": sys_p}, {"role": "user", "content": u}], temp=0.7).strip()


def run(approach, category):
    res = {"approach": approach, "category": category, "ready_turn": None,
           "json_fails": 0, "basura": False, "tipo": None}
    msg = sim_user(category, "", True)
    history = []          # para baseline (historial completo)
    estado = {}           # para v3 (estado)
    for turn in range(1, MAX_TURNS + 1):
        if approach == "baseline":
            messages = [{"role": "system", "content": BASELINE_SYS}] + history + [{"role": "user", "content": msg}]
        else:
            if estado:
                uc = ("ESTADO DEL CASO HASTA AHORA:\n" + json.dumps(estado, ensure_ascii=False)
                      + "\n\nEL CLIENTE ACABA DE DECIR:\n" + msg + "\n\nActualiza y responde con el JSON.")
            else:
                uc = msg
            messages = [{"role": "system", "content": V3_SYS}, {"role": "user", "content": uc}]
        raw = call(messages, temp=0.3)
        data = extract_json(raw)
        if data is None:
            res["json_fails"] += 1
            bot = raw[:300]
        else:
            bot = str(data.get("response_message", ""))
            res["tipo"] = data.get("tipo_documento") or res["tipo"]
            if approach == "v3":
                estado["tipo_documento"] = data.get("tipo_documento", estado.get("tipo_documento"))
                nd = data.get("datos", {})
                if isinstance(nd, dict):
                    estado.setdefault("datos", {}).update({k: v for k, v in nd.items() if v not in (None, "", [])})
            if any(b in bot.lower() for b in BASURA):
                res["basura"] = True
            if data.get("ready"):
                res["ready_turn"] = turn
                break
        history += [{"role": "user", "content": msg}, {"role": "assistant", "content": bot}]
        msg = sim_user(category, bot, False)
    return res


def main():
    # argv[1] = approach: both | v3 | baseline   (default both)
    # argv[2] = N | all | start:end              (default all)
    approaches = ("baseline", "v3")
    if len(sys.argv) > 1 and sys.argv[1] in ("v3", "baseline"):
        approaches = (sys.argv[1],)
    cats = SAMPLE
    if len(sys.argv) > 2 and sys.argv[2] != "all":
        spec = sys.argv[2]
        if "-" in spec:
            a, b = spec.split("-")
            cats = SAMPLE[int(a):int(b)]
        else:
            cats = SAMPLE[:int(spec)]
    suffix = approaches[0] if len(approaches) == 1 else "both"
    out = os.path.join(ROOT, "scripts", f"bench-report-{suffix}.json")
    # carga progreso previo para no repetir
    rows = []
    if os.path.exists(out):
        try:
            with open(out, encoding="utf-8") as f:
                rows = json.load(f)
        except Exception:
            rows = []
    done = {(r["approach"], r["category"]) for r in rows}
    print(f"Corriendo {len(cats)} categorias x {approaches}  (ya hechas: {len(done)})\n", flush=True)
    for c in cats:
        for ap in approaches:
            if (ap, c) in done:
                continue
            try:
                r = run(ap, c)
            except Exception as e:
                r = {"approach": ap, "category": c, "ready_turn": None,
                     "json_fails": -1, "basura": False, "tipo": f"ERROR:{e}"}
            rows.append(r)
            with open(out, "w", encoding="utf-8") as f:   # guardado incremental
                json.dump(rows, f, ensure_ascii=False, indent=2)
            rt = r["ready_turn"] if r["ready_turn"] else "NO"
            print(f"[{ap:8}] {c[:42]:42} cobro={str(rt):>3}  jsonfail={r['json_fails']}  "
                  f"basura={'SI' if r['basura'] else 'no'}  -> {str(r['tipo'])[:38]}", flush=True)

    print("\n" + "=" * 78, flush=True)
    for ap in approaches:
        sub = [r for r in rows if r["approach"] == ap]
        ready = [r for r in sub if r["ready_turn"]]
        avg = sum(r["ready_turn"] for r in ready) / len(ready) if ready else 0
        print(f"{ap:8}  cobro: {len(ready)}/{len(sub)}   turnos_prom: {avg:.1f}   "
              f"json_fails: {sum(max(r['json_fails'],0) for r in sub)}   "
              f"basura: {sum(1 for r in sub if r['basura'])}/{len(sub)}", flush=True)
    print("=" * 78, flush=True)
    print(f"Reporte: {out}", flush=True)


if __name__ == "__main__":
    main()
