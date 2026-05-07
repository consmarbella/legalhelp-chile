#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit.py - Auditoría de calidad: 10 clientes aleatorios
Evalúa alucinaciones, formato judicial y precisión de templates
"""
import sys, io, json, urllib.request, re, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ── 10 clientes con distintas materias ──────────────────────────────────────
CLIENTES = [
    {
        "id": 1, "label": "Despido injustificado",
        "payload": {
            "materia": "despido injustificado",
            "nombre": "Rodrigo Valenzuela Soto", "rut": "14.532.876-3",
            "direccion": "Pasaje Las Rosas 234, Puente Alto",
            "destinatario": "Juzgado del Trabajo de Santiago",
            "hechos": "Trabaje 6 anios como operario de bodega, me avisaron el viernes que no volviera el lunes, sin carta ni causa. No me han pagado nada.",
            "ley_citada": None
        }
    },
    {
        "id": 2, "label": "Divorcio cese convivencia",
        "payload": {
            "materia": "divorcio cese convivencia",
            "nombre": "Carmen Gloria Munoz Ibanez", "rut": "9.876.543-2",
            "direccion": "Calle Maipu 1123, Concepcion",
            "destinatario": "Juzgado de Familia de Concepcion",
            "hechos": "Llevo 5 anios separada de mi marido, sin vivir juntos. Tenemos dos hijos mayores de edad. Quiero divorciarme legalmente.",
            "ley_citada": None
        }
    },
    {
        "id": 3, "label": "Reclamo ISAPRE",
        "payload": {
            "materia": "isapre rechazo prestacion",
            "nombre": "Jorge Andres Perez Gallardo", "rut": "12.111.222-5",
            "direccion": "Av. Independencia 456, Santiago",
            "destinatario": "Superintendencia de Salud",
            "hechos": "Mi ISAPRE rechazo cubrir una cirugia de rodilla urgente, diciendo que es preexistente. Nunca me dijeron eso al contratar el plan hace 3 anios.",
            "ley_citada": None
        }
    },
    {
        "id": 4, "label": "Deuda TAG prescrita",
        "payload": {
            "materia": "deuda tag prescripcion",
            "nombre": "Luis Alberto Contreras Mora", "rut": "7.654.321-K",
            "direccion": "Calle Los Pinos 89, Quilicura",
            "destinatario": "Autopista Central S.A.",
            "hechos": "Me cobran una deuda de peaje TAG del anio 2016. Han pasado mas de 7 anios y nunca me notificaron nada antes.",
            "ley_citada": None
        }
    },
    {
        "id": 5, "label": "Arriendo impago",
        "payload": {
            "materia": "terminar arriendo no pago renta",
            "nombre": "Ana Beatriz Flores Rojas", "rut": "16.789.012-8",
            "direccion": "Av. Vicuna Mackenna 2200, Nunoa",
            "destinatario": "Juzgado de Policia Local de Nunoa",
            "hechos": "Mi arrendatario lleva 4 meses sin pagar el arriendo de 350000 mensuales. Ya le mande mensajes y no responde.",
            "ley_citada": None
        }
    },
    {
        "id": 6, "label": "Accidente del trabajo",
        "payload": {
            "materia": "accidente trabajo mutualidad",
            "nombre": "Felipe Ignacio Rojas Vargas", "rut": "18.234.567-1",
            "direccion": "Poblacion El Bosque 34, Rancagua",
            "destinatario": "ACHS - Asociacion Chilena de Seguridad",
            "hechos": "Me cai de una escalera en el trabajo, me fracture el tobillo. La empresa no quiere reconocerlo como accidente laboral y la mutualidad lo rechazo.",
            "ley_citada": None
        }
    },
    {
        "id": 7, "label": "Cobro honorarios",
        "payload": {
            "materia": "cobro honorarios profesionales",
            "nombre": "Valentina Andrea Lagos Pino", "rut": "15.432.109-7",
            "direccion": "Calle Errazuriz 678, Valparaiso",
            "destinatario": "Senor Manuel Ortiz Torres",
            "hechos": "Realize un diseno de marca completo para el cliente y entregue todo el trabajo. Nunca me pago los 800000 acordados verbalmente.",
            "ley_citada": None
        }
    },
    {
        "id": 8, "label": "Multa transito",
        "payload": {
            "materia": "multa transito recurso reposicion JPL",
            "nombre": "Marco Antonio Silva Herrera", "rut": "10.987.654-6",
            "direccion": "Calle Carrera 321, Temuco",
            "destinatario": "Juzgado de Policia Local de Temuco",
            "hechos": "Me cursaron una multa por exceso de velocidad pero el radar estaba mal calibrado segun el mismo municipio reconocio despues.",
            "ley_citada": None
        }
    },
    {
        "id": 9, "label": "Violencia intrafamiliar",
        "payload": {
            "materia": "violencia intrafamiliar denuncia",
            "nombre": "Marcela Paz Torres Fuentes", "rut": "13.456.789-0",
            "direccion": "Villa El Roble 12, Maipu",
            "destinatario": "Juzgado de Familia de Maipu",
            "hechos": "Mi pareja me agredio fisicamente el fin de semana, tengo lesiones documentadas. No es la primera vez, hay antecedentes anteriores. Necesito medidas de proteccion urgentes.",
            "ley_citada": None
        }
    },
    {
        "id": 10, "label": "Transparencia municipal",
        "payload": {
            "materia": "solicitud informacion publica transparencia municipio",
            "nombre": "Roberto Esteban Pizarro Diaz", "rut": "11.111.222-3",
            "direccion": "Av. General Bonilla 890, La Florida",
            "destinatario": "Municipalidad de La Florida - Unidad de Transparencia",
            "hechos": "Quiero saber cuanto se gasto en remodelaciones de la plaza de mi barrio el anio pasado y quienes fueron los proveedores contratados.",
            "ley_citada": None
        }
    },
]

# ── Funciones de evaluacion ───────────────────────────────────────────────────

def check_hallucination(doc, payload):
    issues = []
    deduction = 0
    hechos = payload.get("hechos", "")
    numeros_usuario = set(re.findall(r"\d{4,}", hechos))

    # Fechas especificas inventadas (anio no mencionado por usuario)
    fechas = re.findall(
        r"\d{1,2} de (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de (\d{4})",
        doc
    )
    for anio in fechas:
        if anio not in numeros_usuario:
            issues.append(f"Fecha inventada con anio {anio}")
            deduction += 2

    # Montos inventados (no mencionados en hechos ni derivables por calculo)
    montos = re.findall(r"\$\s*([\d\.]+)", doc)
    for m in montos:
        limpio = m.replace(".", "")
        if len(limpio) < 4:
            continue
        if limpio in numeros_usuario:
            continue  # monto mencionado directamente por el usuario
        # Verificar si es resultado aritmetico de numeros del usuario
        # ej: 4 meses x 350000 = 1400000 -> aceptable
        es_calculado = False
        for base in numeros_usuario:
            if len(base) >= 4:
                for mult in [2,3,4,5,6,7,8,9,10,11,12,24]:
                    if str(int(base)*mult) == limpio:
                        es_calculado = True
                        break
            if es_calculado:
                break
        # Verificar si el doc lo marca como estimacion/aproximado
        ctx_start = max(0, doc.find(m) - 50)
        ctx = doc[ctx_start:ctx_start+200].lower()
        es_transparente = any(w in ctx for w in ["aproximadamente", "aprox", "acreditar", "estimado", "monto a"])
        if not es_calculado and not es_transparente:
            issues.append(f"Monto inventado: ${m}")
            deduction += 1

    # ROL/RIT inventado
    roles = re.findall(r"RIT\s*[NC][oO][°º]?\s*\d+", doc, re.IGNORECASE)
    if roles:
        issues.append(f"ROL/RIT inventado: {roles[0]}")
        deduction += 3

    # Nombre contraparte inventado (apellidos compuestos que no estan en el payload)
    # Solo verificamos si usa placeholder correcto cuando no tiene nombre contraparte
    if "[NOMBRE CONTRAPARTE]" not in doc and "[NOMBRE" not in doc:
        # Busca si usa un nombre generico inventado
        pass  # demasiado complejo sin NER, saltar

    score = max(0, 10 - deduction)
    return {"issues": issues[:5], "score": score}


def check_formato(doc):
    c = {}
    c["ciudad_fecha_header"] = bool(re.search(r"(?:Santiago|Concepci[oó]n|Valpara[ií]so|Temuco|Rancagua|Maip[uú]),.{1,30}\d{4}", doc[:300]))
    c["destinatario_mayus"] = bool(re.search(r"[A-ZÁÉÍÓÚÑ ]{10,}", doc[:400]))
    c["tiene_PRESENTE"] = "PRESENTE" in doc
    c["tiene_POR_TANTO"] = bool(re.search(r"POR TANTO|Por tanto", doc))
    c["tiene_RUEGO"] = bool(re.search(r"RUEGO A [SU]+\.|Ruego a [Uu][Ss]\.", doc))
    c["sin_markdown"] = not bool(re.search(r"\*\*|#{2,}|```|\* ", doc))
    c["sin_MATERIA_header"] = "MATERIA:" not in doc
    c["tiene_ANTECEDENTES"] = bool(re.search(r"ANTECEDENTES|HECHOS", doc))
    c["tiene_FUNDAMENTO"] = bool(re.search(r"FUNDAMENTO|DERECHO|[Aa]rt[ií]culo", doc))
    c["longitud_ok"] = 300 < len(doc.split()) < 800
    score = round(sum(1 for v in c.values() if v) / len(c) * 10, 1)
    return {"checks": c, "score": score}


def check_citas(doc):
    arts = re.findall(r"[Aa]rt[ií]culo\s*\d+|[Aa]rt\.\s*\d+", doc)
    leyes = re.findall(r"[Ll]ey\s+(?:N[°oO][°º]?\s*)?\d+", doc)
    codigos = re.findall(r"C[oó]digo\s+\w+", doc)
    nums = [int(re.search(r"\d+", a).group()) for a in arts if re.search(r"\d+", a)]
    consec = sum(1 for i in range(len(nums)-1) if nums[i+1] - nums[i] == 1)
    return {
        "total_citas": len(arts) + len(leyes),
        "articulos": len(arts),
        "leyes": len(leyes),
        "codigos": len(codigos),
        "consecutivos": consec,
        "tiene_citas": len(arts) + len(leyes) > 0
    }


def check_placeholders(doc):
    ph = re.findall(r"\[[A-Z][^\]]{1,40}\]", doc)
    return {"count": len(ph), "lista": ph[:4]}


# ── Ejecutar auditoria ────────────────────────────────────────────────────────

print("=" * 72)
print("  AUDITORIA LEGALHELP — 10 CLIENTES ALEATORIOS")
print("=" * 72)

resultados = []
sum_h = 0
sum_f = 0

for c in CLIENTES:
    print(f"\n[{c['id']:02d}/10] {c['label']:<28}", end=" ", flush=True)
    try:
        payload = json.dumps(c["payload"]).encode("utf-8")
        req = urllib.request.Request(
            "http://localhost:3002/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=50) as r:
            resp = json.loads(r.read().decode("utf-8"))

        doc = resp.get("document", "")
        tid = resp.get("templateId") or "libre"
        used = resp.get("usedTemplate", False)

        h = check_hallucination(doc, c["payload"])
        f = check_formato(doc)
        citas = check_citas(doc)
        ph = check_placeholders(doc)

        sum_h += h["score"]
        sum_f += f["score"]

        estado = "OK  " if h["score"] >= 8 and f["score"] >= 7 else "WARN"
        print(f"{estado} | Template: {str(tid)[:32]:<32} | H:{h['score']:4.1f} | F:{f['score']:4.1f} | Citas:{citas['total_citas']}")

        if h["issues"]:
            for iss in h["issues"]:
                print(f"       ⚠  {iss}")
        if citas["consecutivos"] > 2:
            print(f"       ⚠  Articulos consecutivos sospechosos: {citas['consecutivos']}")

        resultados.append({
            "id": c["id"], "label": c["label"],
            "template_id": tid, "used_template": used,
            "h_score": h["score"], "f_score": f["score"],
            "h_issues": h["issues"],
            "citas": citas,
            "placeholders": ph,
            "palabras": len(doc.split()),
        })
        time.sleep(0.8)

    except Exception as e:
        print(f"ERROR: {e}")
        resultados.append({"id": c["id"], "label": c["label"], "error": str(e)})

# ── Resumen ───────────────────────────────────────────────────────────────────
ok = [r for r in resultados if "error" not in r]
n = len(ok)

print("\n" + "=" * 72)
print("  RESUMEN")
print("=" * 72)
print(f"  Generados OK:              {n}/10")
print(f"  Anti-alucinacion promedio: {sum_h/n:.1f}/10")
print(f"  Formato judicial prom.:    {sum_f/n:.1f}/10")
print()
print(f"  {'#':<3} {'Materia':<28} {'Template':<32} {'H':>4} {'F':>4} {'Citas':>6} {'Palabras':>8}")
print("  " + "-" * 84)
for r in ok:
    print(f"  {r['id']:<3} {r['label']:<28} {str(r['template_id'])[:31]:<32} {r['h_score']:>4.1f} {r['f_score']:>4.1f} {r['citas']['total_citas']:>6} {r['palabras']:>8}")

alucs = [r for r in ok if r["h_issues"]]
if alucs:
    print(f"\n  ALUCINACIONES DETECTADAS ({len(alucs)} documentos):")
    for r in alucs:
        for iss in r["h_issues"]:
            print(f"    [{r['id']}] {r['label']}: {iss}")
else:
    print("\n  Sin alucinaciones detectadas.")

sin_t = [r for r in ok if not r["used_template"]]
if sin_t:
    print(f"\n  Generacion libre (sin template): {[r['label'] for r in sin_t]}")

print("\n" + "=" * 72)
