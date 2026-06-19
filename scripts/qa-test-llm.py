"""
QA Test with LLM-simulated user for LegalHelp Chile
Uses DeepSeek Flash as a simulated user that responds intelligently.

Usage: python scripts/qa-test-llm.py

Cost: ~$0.50 USD for all 78 categories
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
    print("  Mac/Linux: export DEEPSEEK_API_KEY=sk-tu-key-aqui")
    exit(1)

MAX_TURNS = 12
DELAY = 2.0

# Load categories
with open("data/paginas.json", encoding="utf-8") as f:
    paginas = json.load(f)

seen = set()
categories = []
for p in paginas:
    if not p.get("variable") and p["categoria"] not in seen and p["categoria"] != "Servicios legales":
        seen.add(p["categoria"])
        categories.append(p["categoria"])

print(f"={'='*60}")
print(f"LegalHelp QA Test (LLM-simulated user) — {len(categories)} categories")
print(f"={'='*60}")


def ask_simulated_user(category: str, chat_message: str, turn: int) -> str:
    """Use DeepSeek Flash to simulate a user responding to the chat."""
    prompt = f"""Eres un usuario chileno que necesita un documento legal. Estás chateando con un asistente legal por internet.

Tu situación: necesitas "{category}".

El asistente te acaba de decir:
"{chat_message}"

Responde como lo haría una persona normal (no abogado). Inventa datos coherentes si te piden:
- Nombre: usa "María Fernanda Soto Contreras"
- RUT: usa "15.432.897-6"  
- Dirección: usa "Av. OHiggins 1234, Depto 56, Santiago"
- Si te piden datos de otra persona (hermano, ex, empleador, arrendatario): inventa otro nombre y RUT diferente
- Si te piden fechas: inventa una fecha razonable
- Si te piden montos: inventa un monto razonable en pesos chilenos
- Si te piden confirmar algo: di "sí, correcto"
- Si te piden datos muy específicos (patente, número de causa, nombre de empresa, tribunal): invéntalos de forma realista

Responde en 1-3 oraciones máximo. Sin explicaciones, solo la respuesta como la daría un usuario real.
No saludes, no des las gracias innecesariamente, solo responde lo que te preguntan."""

    try:
        r = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_KEY}",
            },
            json={
                "model": "deepseek-v4-flash",
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
    
    # Fallback
    return "María Fernanda Soto Contreras, RUT 15.432.897-6, domicilio Av. OHiggins 1234, Santiago"


def test_category(category: str, index: int, total: int) -> dict:
    """Test a single category with LLM-simulated user."""
    result = {
        "category": category,
        "status": "unknown",
        "turns": 0,
        "ready": False,
        "tipo_documento": None,
        "error": None,
        "conversation": [],
    }

    case_data = {}
    case_history = []

    # First message from user
    first_msg = ask_simulated_user(category, f"Hola, necesito ayuda con: {category}. Explícame qué necesitas de mí.", 0)
    
    print(f"\n[{index}/{total}] {category}")
    print(f"  User: {first_msg[:80]}...")

    for turn in range(MAX_TURNS):
        msg = first_msg if turn == 0 else user_response

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
                print(f"  ⚠️ Rate limited, esperando 15s...")
                time.sleep(15)
                r = requests.post(
                    f"{BASE_URL}/api/chat",
                    json={
                        "message": msg,
                        "caseHistory": case_history,
                        "currentCaseData": case_data,
                    },
                    timeout=30,
                )

            if r.status_code != 200:
                result["status"] = "api_error"
                result["error"] = f"HTTP {r.status_code}"
                print(f"  ❌ HTTP {r.status_code}")
                return result

            data = r.json()

        except Exception as e:
            result["status"] = "exception"
            result["error"] = str(e)
            print(f"  ❌ Error: {e}")
            return result

        # Update state
        assistant_msg = data.get("response_message", "")
        case_history.append({"role": "user", "content": msg})
        case_history.append({"role": "assistant", "content": assistant_msg})
        case_data.update(data)
        result["turns"] = turn + 1
        result["conversation"].append({"user": msg, "assistant": assistant_msg[:200]})

        print(f"  T{turn+1}: {assistant_msg[:75]}...")

        # Check if ready
        if data.get("ready"):
            result["ready"] = True
            result["status"] = "success"
            result["tipo_documento"] = data.get("tipo_documento")
            print(f"  ✅ READY en {turn+1} turnos | tipo: {result['tipo_documento']}")
            return result

        # Generate next user response
        time.sleep(DELAY)
        user_response = ask_simulated_user(category, assistant_msg, turn + 1)
        print(f"  User: {user_response[:75]}...")
        time.sleep(0.5)

    # Max turns reached
    result["status"] = "max_turns"
    result["tipo_documento"] = case_data.get("tipo_documento")
    print(f"  ⚠️ NO READY después de {MAX_TURNS} turnos")
    return result


# Run all tests
results = []
for i, cat in enumerate(categories, 1):
    result = test_category(cat, i, len(categories))
    results.append(result)
    time.sleep(DELAY)

# Summary
print(f"\n{'='*60}")
print(f"RESULTADOS FINALES — {len(categories)} categorías")
print(f"{'='*60}")

success = [r for r in results if r["status"] == "success"]
failed = [r for r in results if r["status"] != "success"]

print(f"\n✅ PASARON (ready:true): {len(success)}/{len(results)}")
print(f"⚠️  FALLARON: {len(failed)}/{len(results)}")

if success:
    avg = sum(r["turns"] for r in success) / len(success)
    print(f"📊 Promedio de turnos para ready: {avg:.1f}")

if failed:
    print(f"\n--- CATEGORÍAS CON PROBLEMAS ---")
    for r in failed:
        turns_str = f"{r['turns']} turnos"
        error_msg = r['error'] or turns_str
        print(f"  ❌ {r['category']}: {r['status']} ({error_msg})")
        if r["conversation"]:
            last = r["conversation"][-1]
            last_msg = last['assistant'][:100]
            print(f"     Último msg del chat: {last_msg}...")

print(f"\n--- CATEGORÍAS EXITOSAS ---")
for r in success:
    print(f"  ✅ {r['category']} ({r['turns']} turnos) → {r['tipo_documento']}")

# Save report
report_path = "scripts/qa-report-llm.json"
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\nReporte completo guardado en: {report_path}")
