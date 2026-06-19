"""
QA Test Script for LegalHelp Chile
Tests all 79 document categories by simulating user conversations.
Uses DeepSeek as a simulated user that invents coherent data.

Usage: python3 scripts/qa-test.py
"""

import json
import time
import sys
import os
import requests

BASE_URL = "https://legalhelp.cl"
MAX_TURNS = 10  # Maximum conversation turns before declaring failure
DELAY_BETWEEN_REQUESTS = 2.0  # seconds, to avoid rate limiting

# Simulated user profiles - different styles
USER_PROFILES = [
    "casual",      # writes informally, short messages
    "detailed",    # gives lots of info at once
    "confused",    # doesn't know what they need
]

def get_user_response(category: str, chat_question: str, turn: int, case_data: dict) -> str:
    """Generate a simulated user response based on what the chat asked."""
    # Simple rule-based user simulation (no extra LLM needed)
    # This simulates a user who answers what's asked with invented but coherent data
    
    q = chat_question.lower()
    
    # Name
    if "nombre" in q and not case_data.get("nombre"):
        return "María Fernanda Soto Contreras"
    
    # RUT - send it already formatted so DeepSeek doesn't miscalculate the DV
    if "rut" in q and not case_data.get("rut"):
        return "15.432.897-6"  # pre-formatted, common Chilean RUT format
    
    # Address
    if ("dirección" in q or "domicilio" in q or "direc" in q) and not case_data.get("direccion"):
        return "av libertador bernardo ohiggins 1234 depto 56 santiago"
    
    # Details / situation - varies by category
    if "detalle" in q or "más información" in q or "qué pasó" in q or "cuénta" in q or "situación" in q or "explica" in q or "problema" in q:
        return get_case_details(category, case_data)
    
    # Date
    if "fecha" in q or "cuándo" in q:
        return "15 de marzo de 2024"
    
    # Amount / salary
    if "monto" in q or "sueldo" in q or "salario" in q or "remuneración" in q or "valor" in q or "precio" in q:
        return "1500000"
    
    # Employer
    if "empleador" in q or "empresa" in q or "patron" in q:
        return "Comercial Los Andes SpA"
    
    # Counterpart
    if "contraparte" in q or "demandado" in q or "arrendatario" in q or "arrendador" in q or "deudor" in q:
        return "Roberto Andrés Muñoz Valenzuela, RUT 12.345.678-9"
    
    # Children
    if "hijo" in q or "menor" in q:
        return "Tengo 2 hijos: Sofía de 8 años y Matías de 5 años"
    
    # Vehicle / patent
    if "patente" in q or "vehículo" in q or "auto" in q:
        return "Toyota Corolla 2018, patente GXYZ-12"
    
    # Commune / location
    if "comuna" in q:
        return "Maipú"
    
    # Bank / institution
    if "banco" in q or "institución" in q:
        return "Banco de Chile"
    
    # Confirmation (si/no questions)
    if "¿" in q and ("correcto" in q or "confirma" in q or "es así" in q or "rut es" in q or "nombre es" in q or "dirección es" in q):
        return "sí, correcto"
    
    # RUT being rejected / asked again
    if ("rut" in q and ("válido" in q or "correcto" in q or "verificar" in q or "entreg" in q)) or ("rut" in q and case_data.get("rut")):
        return "sí, mi RUT es 15.432.897-6"

    # Default: provide more context about the situation
    return get_case_details(category, case_data)


def get_case_details(category: str, case_data: dict) -> str:
    """Return invented but coherent case details based on category."""
    details = {
        "Alzamiento de embargo sobre vehículo": "Tengo un embargo sobre mi auto por una deuda que ya pagué hace 3 meses. Pagué todo al banco pero el embargo sigue apareciendo en el registro.",
        "Carta reclamo SERNAC": "Compré un refrigerador en Falabella hace 2 meses y dejó de funcionar. Fui a la tienda y me dicen que no me pueden devolver el dinero ni cambiarlo.",
        "Certificado de antecedentes para fines especiales": "Necesito un certificado de antecedentes limpio para un trabajo nuevo. Tuve una condena por hurto simple hace 6 años que ya cumplí.",
        "Demanda de alimentos": "Mi ex pareja no paga la pensión de alimentos de mis hijos desde hace 4 meses. El acuerdo era de 350 mil pesos mensuales pero dejó de pagar.",
        "Demanda de desalojo por no pago": "Mi arrendatario lleva 3 meses sin pagar el arriendo. El contrato dice 450 mil mensuales. Ya le mandé mensajes y no responde.",
        "Denuncia por despido injustificado": "Me despidieron hace 2 semanas sin motivo. Trabajé 3 años en la empresa con sueldo de 1.200.000. Me dijeron que era por necesidades de la empresa pero no me pagaron nada.",
        "Denuncia por no pago de cotizaciones": "Mi empleador me descuenta las cotizaciones pero revisé mi cartola de AFP y no ha pagado los últimos 8 meses. Mi sueldo es 900 mil.",
        "Eliminación de antecedentes penales": "Cumplí una condena por robo con fuerza hace 4 años. Ya pasó el tiempo necesario y necesito limpiar mis antecedentes para trabajar.",
        "Limpieza de hoja de vida del conductor": "Tengo 3 anotaciones en mi hoja de vida por infracciones de tránsito de hace más de 3 años. Necesito limpiarla para renovar mi licencia profesional.",
        "Omisión de antecedentes por violencia intrafamiliar": "Tengo una condena por VIF de hace 6 años. Ya cumplí todo y necesito que se omitan los antecedentes para fines laborales.",
        "Poder simple notarial": "Necesito darle poder a mi hermano para que venda mi auto porque estoy viviendo fuera de Chile.",
        "Prescripción de deuda TAG": "Tengo una deuda TAG de la Costanera Norte de 2019 por 180 mil pesos. Nunca me notificaron judicialmente.",
        "Prescripción de deuda bancaria": "Tengo una deuda con el Banco Estado de 2018 por un crédito de consumo de 3 millones. Nunca me demandaron.",
        "Prescripción de multas de tránsito": "Tengo 5 multas de tránsito de 2020 y 2021 que nunca pagué. Son del Juzgado de Policía Local de Santiago.",
        "Recurso de protección": "La Isapre me subió el plan un 40% de un día para otro sin justificación. Me están vulnerando mi derecho a la salud.",
        "Registro Nacional de Deudores de Pensiones de Alimentos": "Mi ex no paga la pensión hace 6 meses. Quiero inscribirlo en el registro de deudores para que no pueda hacer trámites.",
        "Contrato de trabajo indefinido": "Voy a contratar a un empleado para mi negocio de forma indefinida. Sueldo 800 mil, jornada completa, cargo de vendedor.",
        "Contrato de trabajo a plazo fijo": "Necesito contratar un trabajador por 3 meses para un proyecto específico de remodelación. Sueldo 700 mil.",
        "Contrato de trabajo part-time": "Quiero contratar un estudiante para que trabaje 20 horas semanales en mi café. Sueldo proporcional de 350 mil.",
        "Contrato de trabajo teletrabajo": "Voy a contratar un desarrollador web que trabaje 100% remoto desde su casa. Sueldo 2 millones.",
        "Contrato de trabajo por obra o faena": "Necesito contratar un maestro para la construcción de una ampliación. La obra dura aproximadamente 2 meses.",
        "Carta de renuncia laboral": "Quiero renunciar a mi trabajo. Llevo 5 años en la empresa y mi cargo es analista contable.",
        "Carta de amonestación laboral": "Un trabajador llegó tarde 5 veces este mes y necesito amonestarlo formalmente. Su nombre es Pedro Rojas.",
        "Anexo de contrato de trabajo (actualización de sueldo)": "Le subí el sueldo a un trabajador de 600 mil a 750 mil. Necesito el anexo para formalizarlo.",
        "Contrato de arriendo de casa": "Voy a arrendar mi casa por 650 mil mensuales. El arrendatario es una familia. La casa está en Maipú.",
        "Contrato de arriendo de departamento": "Quiero arrendar mi departamento por 480 mil mensuales. Tiene 2 dormitorios y está en Providencia.",
        "Contrato de arriendo de local comercial": "Tengo un local comercial que quiero arrendar por 1.2 millones mensuales para un restaurante.",
        "Contrato de subarriendo": "Soy arrendatario y mi contrato me permite subarrendar. Quiero subarrendar una pieza por 200 mil.",
        "Carta de término de contrato de arriendo": "Quiero terminar el contrato de arriendo con mi arrendatario. El contrato venció hace 2 meses y quiero recuperar la propiedad.",
        "Carta de cobro de arriendo impago": "Mi arrendatario me debe 2 meses de arriendo a 500 mil cada uno. Quiero enviarle una carta formal de cobro.",
        "Poder notarial": "Necesito un poder notarial para que mi abogado me represente en un juicio de familia.",
        "Poder para vender vehículo": "Quiero darle poder a mi padre para que venda mi camioneta Toyota Hilux 2020 patente ABCD-12.",
        "Poder para cobrar finiquito": "Estoy en el extranjero y necesito que mi hermana cobre mi finiquito en la empresa donde trabajaba.",
        "Poder para trámites bancarios": "Mi madre está enferma y necesito un poder para hacer trámites en su cuenta del BancoEstado.",
        "Mandato especial": "Necesito autorizar a mi contador para que firme documentos tributarios ante el SII en mi nombre.",
        "Contrato de prestación de servicios a honorarios": "Voy a contratar un diseñador gráfico por honorarios por 3 meses. Le pagaré 800 mil mensuales contra boleta.",
        "Contrato freelance": "Contrato a un programador freelance para hacer una página web. Precio total 2 millones, plazo 6 semanas.",
        "Contrato de compraventa de vehículo": "Voy a vender mi auto Hyundai Accent 2019 en 7 millones de pesos. El comprador es mi vecino.",
        "Contrato de compraventa de bien mueble": "Voy a vender maquinaria industrial por 15 millones a otra empresa. Son 3 máquinas de corte.",
        "Promesa de compraventa de inmueble": "Quiero hacer una promesa de compraventa de un departamento en Las Condes por 120 millones. Entrega en 6 meses.",
        "Escrito de defensa por infracción de tránsito": "Me pusieron un parte por supuestamente pasarme una luz roja pero el semáforo estaba en amarillo. Fue el 10 de enero en Providencia.",
        "Escrito de prescripción de multa de tránsito": "Tengo una multa de tránsito de abril 2021 por exceso de velocidad que nunca pagué ni me notificaron judicialmente.",
        "Recurso de apelación ante Juzgado de Policía Local": "Me condenaron en el Juzgado de Policía Local por una infracción de tránsito. La multa es de 3 UTM y no estoy de acuerdo.",
        "Denuncia por ruidos molestos de vecinos": "Mi vecino del piso de arriba hace fiestas todos los viernes y sábados hasta las 4 de la mañana con música fuerte.",
        "Denuncia por maltrato animal": "Mi vecino tiene un perro amarrado en el patio sin agua ni comida. Lleva semanas así y el animal está muy flaco.",
        "Escrito de impugnación de multa municipal": "La municipalidad me cursó una multa por supuesta infracción a la ordenanza de aseo pero yo no fui el responsable.",
        "Declaración jurada simple": "Necesito declarar bajo juramento que soy el único dueño de un vehículo para un trámite en el registro civil.",
        "Declaración jurada de domicilio": "Necesito una declaración jurada de domicilio para un trámite de visa. Vivo en Santiago desde 2019.",
        "Declaración jurada de ingresos": "Necesito declarar mis ingresos mensuales de 2.5 millones para un trámite de arriendo.",
        "Declaración jurada de cargas familiares": "Necesito declarar que tengo 2 hijos dependientes para un beneficio social.",
        "Carta reclamo aerolínea": "LATAM canceló mi vuelo sin aviso y no me quieren devolver el dinero. Eran 2 pasajes de 350 mil cada uno a Buenos Aires.",
        "Carta reclamo banco": "El Banco Santander me cobró comisiones que no corresponden por 3 meses seguidos. Total cobrado indebidamente: 89 mil pesos.",
        "Carta reclamo Isapre": "La Isapre Colmena me rechazó una licencia médica de 15 días que mi doctor certificó. Necesito reclamar.",
        "Carta reclamo empresa de telecomunicaciones": "Movistar me cobra por un plan que no contraté. Hace 2 meses cambié de plan y me siguen cobrando el anterior más caro.",
        "Carta reclamo seguro": "Mi auto fue chocado y el seguro rechaza cubrir la reparación diciendo que no está cubierto, pero mi póliza dice lo contrario.",
        "Carta reclamo tienda retail": "Compré un notebook en PCFactory hace 1 mes y ya se echó a perder. No quieren cambiarlo ni devolverme el dinero.",
        "Acuerdo de divorcio por mutuo acuerdo": "Mi esposa y yo queremos divorciarnos de mutuo acuerdo. Llevamos separados 2 años, tenemos 1 hijo de 10 años.",
        "Convenio de regulación de divorcio": "Necesitamos regular alimentos, visitas y bienes para nuestro divorcio. Tenemos una casa y un auto en común.",
        "Acuerdo de tuición compartida": "Queremos acordar la tuición compartida de nuestra hija de 6 años. Los dos vivimos en Santiago.",
        "Solicitud de régimen de visitas": "Quiero pedir un régimen de visitas para ver a mi hijo. Su madre no me deja verlo desde hace 2 meses.",
        "Carta de cobranza de deuda": "Una persona me debe 2 millones de pesos desde hace 8 meses. Le presté el dinero y tengo un pagaré firmado.",
        "Acuerdo de pago de deuda": "Mi deudor quiere pagarme en cuotas. Me debe 5 millones y propone pagar en 10 cuotas de 500 mil.",
        "Solicitud de alzamiento de protesto bancario": "Tengo un protesto de cheque de 2019 que ya pagué. Necesito que el banco lo alce para limpiar mi boletín comercial.",
        "Carta de prescripción de deuda general": "Me están cobrando una deuda de una tienda de 2017 por 800 mil pesos. Nunca me demandaron judicialmente.",
        "Denuncia por acoso laboral (Ley Karin)": "Mi jefe me hostiga constantemente, me grita frente a compañeros y me asigna tareas humillantes. Lleva 6 meses así.",
        "Pagaré": "Voy a prestar 3 millones a un amigo y quiero documentarlo con un pagaré. Me pagará en 6 meses.",
        "Contrato de mutuo (préstamo de dinero)": "Le voy a prestar 10 millones a mi socio con interés del 1% mensual. Plazo de devolución 12 meses.",
        "Solicitud de posesión efectiva (herencia)": "Mi padre falleció hace 2 meses. Somos 3 hermanos y hay una casa y un auto a su nombre.",
        "Denuncia por estafa": "Un tipo me vendió un auto con los documentos falsificados. Le pagué 5 millones y el auto resultó ser robado.",
        "Demanda por accidente de tránsito": "Un auto me chocó por atrás en un semáforo. Tengo daños por 3 millones en mi vehículo y lesiones leves.",
        "Carta de despido": "Necesito despedir a un trabajador por necesidades de la empresa. Lleva 4 años trabajando, sueldo 1.1 millones.",
        "Constitución de Sociedad SpA": "Quiero crear una SpA para mi negocio de importación de tecnología. Capital de 5 millones, seré el único accionista.",
        "Demanda por daño moral": "Mi ex empleador difundió información falsa sobre mí a otras empresas diciendo que robé. No consigo trabajo por eso.",
        "Recurso de amparo": "Detuvieron a mi hermano sin orden judicial y lleva 2 días detenido sin que le tomen declaración.",
        "Solicitud de mediación familiar": "Quiero solicitar mediación para regular las visitas de mis hijos con su padre. No logramos ponernos de acuerdo.",
        "Testamento simple": "Quiero hacer un testamento dejando mi casa a mis 2 hijos en partes iguales y mi auto a mi hermana.",
        "Carta de recomendación laboral": "Un ex empleado me pidió carta de recomendación. Trabajó conmigo 3 años como jefe de bodega, excelente trabajador.",
        "Carta de confidencialidad (NDA)": "Voy a compartir información de mi startup con un posible inversionista y necesito que firme un NDA antes.",
    }
    
    # If we already gave details but chat asks for more specific info
    if case_data.get("detalle_caso") or case_data.get("hechos"):
        # Provide supplementary details
        return "El monto total son 2.500.000 pesos. La fecha fue el 15 de marzo de 2024."
    
    return details.get(category, f"Necesito ayuda con {category.lower()}. Mi situación es que tengo un problema legal que requiere este documento.")


def test_category(category: str, index: int, total: int) -> dict:
    """Test a single category with a simulated conversation."""
    result = {
        "category": category,
        "status": "unknown",
        "turns": 0,
        "ready": False,
        "has_tipo_documento": False,
        "has_destinatario": False,
        "error": None,
        "final_message": "",
        "validation_confirmed": False,
    }
    
    case_data = {}
    case_history = []
    
    # First message: describe the situation
    initial_message = get_case_details(category, case_data)
    
    print(f"\n[{index}/{total}] Testing: {category}")
    print(f"  User: {initial_message[:80]}...")
    
    for turn in range(MAX_TURNS):
        # Determine message
        if turn == 0:
            message = initial_message
        else:
            # Generate response based on what the chat asked
            message = get_user_response(category, last_response, turn, case_data)
        
        # Call the API
        try:
            resp = requests.post(
                f"{BASE_URL}/api/chat",
                json={
                    "message": message,
                    "caseHistory": case_history,
                    "currentCaseData": case_data,
                },
                timeout=30,
            )
            
            if resp.status_code == 429:
                print(f"  ⚠️  Rate limited, waiting 10s...")
                time.sleep(10)
                resp = requests.post(
                    f"{BASE_URL}/api/chat",
                    json={
                        "message": message,
                        "caseHistory": case_history,
                        "currentCaseData": case_data,
                    },
                    timeout=30,
                )
            
            if resp.status_code != 200:
                result["status"] = "api_error"
                result["error"] = f"HTTP {resp.status_code}"
                return result
            
            data = resp.json()
            
        except Exception as e:
            result["status"] = "exception"
            result["error"] = str(e)
            return result
        
        # Update state
        case_history.append({"role": "user", "content": message})
        last_response = data.get("response_message", "")
        case_history.append({"role": "assistant", "content": last_response})
        case_data.update(data)
        result["turns"] = turn + 1
        
        # Check if validation/confirmation is happening
        if "¿" in last_response and ("correcto" in last_response.lower() or "rut" in last_response.lower()):
            result["validation_confirmed"] = True
        
        print(f"  Turn {turn+1}: {last_response[:80]}...")
        
        # Check if ready
        if data.get("ready"):
            result["ready"] = True
            result["status"] = "success"
            result["has_tipo_documento"] = bool(data.get("tipo_documento"))
            result["has_destinatario"] = bool(data.get("destinatario_inferido"))
            result["final_message"] = last_response
            print(f"  ✅ READY after {turn+1} turns | tipo: {data.get('tipo_documento', 'N/A')[:50]}")
            return result
        
        time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Didn't reach ready in MAX_TURNS
    result["status"] = "max_turns"
    result["has_tipo_documento"] = bool(case_data.get("tipo_documento"))
    result["has_destinatario"] = bool(case_data.get("destinatario_inferido"))
    result["final_message"] = last_response
    print(f"  ⚠️  NOT READY after {MAX_TURNS} turns")
    return result


def main():
    # Load categories
    with open("data/paginas.json") as f:
        paginas = json.load(f)
    
    # Get unique non-geo categories
    seen = set()
    categories = []
    for p in paginas:
        if not p.get("variable") and p["categoria"] not in seen:
            seen.add(p["categoria"])
            categories.append(p["categoria"])
    
    # Skip "Servicios legales" (it's a hub, not a document type)
    categories = [c for c in categories if c != "Servicios legales"]
    
    # Limit to first N for quick test (remove this line to run all)
    categories = categories[:15]
    
    print(f"=" * 60)
    print(f"LegalHelp QA Test — {len(categories)} categories")
    print(f"Target: {BASE_URL}")
    print(f"=" * 60)
    
    results = []
    for i, cat in enumerate(categories, 1):
        result = test_category(cat, i, len(categories))
        results.append(result)
        time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Summary
    print(f"\n{'=' * 60}")
    print(f"RESULTS SUMMARY")
    print(f"{'=' * 60}")
    
    success = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] != "success"]
    validated = [r for r in results if r["validation_confirmed"]]
    
    print(f"\n✅ SUCCESS (ready:true): {len(success)}/{len(results)}")
    print(f"⚠️  FAILED: {len(failed)}/{len(results)}")
    print(f"🔍 Validation/confirmation detected: {len(validated)}/{len(results)}")
    print(f"\nAvg turns to ready: {sum(r['turns'] for r in success) / len(success):.1f}" if success else "")
    
    if failed:
        print(f"\n--- FAILED CATEGORIES ---")
        for r in failed:
            print(f"  ❌ {r['category']}: {r['status']} ({r['error'] or 'max turns reached'})")
    
    # Save full report
    report_path = "scripts/qa-report.json"
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nFull report saved to: {report_path}")


if __name__ == "__main__":
    main()
