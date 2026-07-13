"""
QA Test - Top 20 pages for Google Ads
Tests the 20 highest-conversion pages before running paid traffic.
Uses DeepSeek as simulated user.

Usage:
  set DEEPSEEK_API_KEY=sk-your-key
  python scripts/qa-top20-ads.py
"""

import json
import time
import os
import requests

BASE_URL = "https://legalhelp.cl"
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
if not DEEPSEEK_KEY:
    print("ERROR: Configura la variable de entorno DEEPSEEK_API_KEY")
    print("  Windows: set DEEPSEEK_API_KEY=sk-tu-key-aqui")
    exit(1)

MAX_TURNS = 12
DELAY = 2.0

TESTS = [
    ("finiquito-laboral", "Finiquito laboral", "Me echaron del trabajo hace una semana y necesito calcular mi finiquito. Trabaje 4 anios con sueldo de 1.100.000"),
    ("posecion-efectiva", "Posesion efectiva", "Mi mama fallecio hace 3 meses, somos 2 hermanos y hay una casa y un auto a su nombre"),
    ("declaracion-jurada-simple", "Declaracion jurada simple", "Necesito una declaracion jurada de que soy soltero para un tramite del banco"),
    ("carta-renuncia-laboral", "Carta de renuncia laboral", "Quiero renunciar a mi trabajo, llevo 3 anios como asistente contable y me voy a otra empresa"),
    ("contrato-trabajo-indefinido", "Contrato de trabajo indefinido", "Necesito hacer un contrato para un empleado nuevo, sueldo 900 mil, jornada completa, cargo bodeguero"),
    ("pagare", "Pagare", "Le voy a prestar 5 millones a mi cunado y quiero que firme un pagare para tener respaldo"),
    ("testamento", "Testamento simple", "Quiero hacer un testamento dejando mi departamento a mi hija y mis ahorros a mi hermana"),
    ("denuncia-por-despido-injustificado", "Denuncia por despido injustificado", "Me despidieron ayer sin motivo, llevaba 2 anios en la empresa con sueldo de 950 mil"),
    ("recurso-de-proteccion", "Recurso de proteccion", "Mi Isapre me rechazo una cirugia que el doctor dice es necesaria y urgente"),
    ("acuerdo-divorcio-mutuo-acuerdo", "Acuerdo de divorcio por mutuo acuerdo", "Mi esposo y yo queremos divorciarnos de mutuo acuerdo, llevamos separados 1 anio y medio, tenemos 2 hijos"),
    ("demanda-de-alimentos", "Demanda de alimentos", "El papa de mi hijo no paga pension hace 5 meses, son 250 mil mensuales"),
    ("eliminacion-de-antecedentes-penales", "Eliminacion de antecedentes penales", "Tuve una condena por hurto hace 5 anios que ya cumpli y necesito limpiar mis antecedentes para un trabajo"),
    ("denuncia-estafa", "Denuncia por estafa", "Me vendieron un terreno que resulto ser de otra persona, pague 8 millones y no puedo hacer nada con el"),
    ("poder-notarial", "Poder notarial", "Necesito darle poder a mi hermana para que venda mi auto porque estoy viviendo en Argentina"),
    ("prescripcion-de-deuda-tag", "Prescripcion de deuda TAG", "Tengo una deuda TAG de la autopista central de 2020 por 250 mil pesos y nunca me demandaron"),
    ("denuncia-acoso-laboral", "Denuncia por acoso laboral Ley Karin", "Mi jefa me humilla frente a todos, me grita y me da tareas imposibles hace 4 meses"),
    ("mandato-especial", "Mandato especial", "Necesito autorizar a mi contador para que haga todos mis tramites en el SII"),
    ("denuncia-maltrato-animal", "Denuncia por maltrato animal", "Mi vecino tiene 3 perros encerrados sin agua ni comida, los escucho llorar todos los dias"),
    ("contrato-mutuo", "Contrato de mutuo", "Voy a prestarle 15 millones a mi socio con interes del 0.5 porciento mensual, paga en 18 meses"),
    ("promesa-compraventa-inmueble", "Promesa de compraventa de inmueble", "Quiero comprar un depto en Nunoa por 95 millones pero la entrega es en 8 meses"),
]


def ask_user_sim(category, chat_msg, turn):
    """Use DeepSeek to simulate a user responding."""
    prompt = (
        f'Eres un usuario chileno que necesita "{category}". '
        f'El asistente legal te dijo:\n"{chat_msg[:400]}"\n\n'
        f'Responde como una persona normal (no abogado). Inventa datos coherentes:\n'
        f'- Nombre: Maria Fernanda Soto Contreras\n'
        f'- RUT: 15.432.897-6\n'
        f'- Direccion: Av. OHiggins 1234, Depto 56, Santiago\n'
        f'- Si piden datos de otra persona (hermano, ex, empleador, arrendatario): '
        f'inventa otro nombre y RUT diferente (ej: Carlos Munoz, 12.876.543-2, Av Providencia 2000)\n'
        f'- Si piden confirmar algo: "si, correcto"\n'
        f'- Si piden fechas, montos, patentes, tribunales: inventa algo razonable\n\n'
        f'Responde en 1-2 oraciones maximo. Solo responde lo que te preguntan.'
    )

    try:
        r = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_KEY}",
            },
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 150,
            },
            timeout=15,
        )
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"    [user-sim error: {e}]")

    return "Maria Fernanda Soto Contreras, RUT 15.432.897-6, Av. OHiggins 1234, Santiago"


def test_page(slug, category, first_msg, index, total):
    """Test a single page with simulated conversation."""
    result = {
        "slug": slug,
        "category": category,
        "status": "unknown",
        "turns": 0,
        "ready": False,
        "tipo_documento": None,
        "conversation": [],
    }

    case_data = {}
    case_history = []
    last_q = ""

    print(f"\n[{index}/{total}] {category}")
    print(f"  Pagina: /p/{slug}")
    print(f"  User: {first_msg[:70]}...")

    for turn in range(MAX_TURNS):
        msg = first_msg if turn == 0 else ask_user_sim(category, last_q, turn)

        if turn > 0:
            print(f"  User: {msg[:70]}...")

        try:
            r = requests.post(
                f"{BASE_URL}/api/chat",
                json={
                    "message": msg,
                    "caseHistory": case_history,
                    "currentCaseData": case_data,
                },
                timeout=30,
            )

            if r.status_code == 429:
                print(f"  Rate limited, esperando 15s...")
                time.sleep(15)
                r = requests.post(
                    f"{BASE_URL}/api/chat",
                    json={"message": msg, "caseHistory": case_history, "currentCaseData": case_data},
                    timeout=30,
                )

            if r.status_code != 200:
                result["status"] = "error"
                print(f"  HTTP {r.status_code}")
                return result

            data = r.json()

        except Exception as e:
            result["status"] = "error"
            print(f"  ERROR: {e}")
            return result

        last_q = data.get("response_message", "")
        case_history.append({"role": "user", "content": msg})
        case_history.append({"role": "assistant", "content": last_q})
        case_data.update(data)
        result["turns"] = turn + 1
        result["tipo_documento"] = data.get("tipo_documento", result["tipo_documento"])
        result["conversation"].append({"user": msg[:150], "assistant": last_q[:200]})

        print(f"  Chat: {last_q[:75]}...")

        if data.get("ready"):
            result["ready"] = True
            result["status"] = "success"
            print(f"  >>> READY en {turn+1} turnos | tipo: {result['tipo_documento']}")
            return result

        time.sleep(DELAY)

    result["status"] = "max_turns"
    print(f"  >>> NO READY despues de {MAX_TURNS} turnos")
    return result


def main():
    print("=" * 60)
    print("QA TEST - Top 20 paginas para Google Ads")
    print("=" * 60)

    results = []
    for i, (slug, category, first_msg) in enumerate(TESTS, 1):
        result = test_page(slug, category, first_msg, i, len(TESTS))
        results.append(result)
        time.sleep(DELAY)

    # Summary
    print("\n" + "=" * 60)
    print("RESULTADOS - Top 20 paginas de alta conversion")
    print("=" * 60)

    success = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] != "success"]

    for r in results:
        icon = {"success": "PASS", "max_turns": "WARN", "error": "FAIL"}.get(r["status"], "?")
        tipo = r["tipo_documento"] or "?"
        print(f"  [{icon}] /p/{r['slug']} ({r['turns']} turnos) -> {tipo[:45]}")

    print(f"\nAprobadas: {len(success)}/20")

    if success:
        avg = sum(r["turns"] for r in success) / len(success)
        print(f"Promedio turnos: {avg:.1f}")

    if failed:
        print(f"\nPaginas con problemas:")
        for r in failed:
            print(f"  -> /p/{r['slug']} ({r['status']})")
            if r["conversation"]:
                last_msg = r["conversation"][-1]["assistant"][:100]
                print(f"     Ultimo msg: {last_msg}...")

    # Save report
    report_path = "scripts/qa-report-top20.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nReporte guardado en: {report_path}")


if __name__ == "__main__":
    main()
