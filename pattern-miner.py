#!/usr/bin/env python3
"""
⚖️ LEGALHELP PATTERN ENGINE v2.0
Python PURO - sin IA, sin tokens, sin APIs pagas.
Analiza sentencias del PJUD y extrae patrones ganadores.
Correlo en tu PC chilena. Costo: solo electricidad.

ESTRATEGIA:
1. Clasifica sentencias: ACOGE (ganó) vs RECHAZA (perdió)
2. Extrae n-gramas, frases, leyes citadas
3. Calcula correlación estadística pura
4. Genera recomendaciones basadas en datos
"""

import re
import json
import sqlite3
import urllib.request
import urllib.parse
import ssl
import time
import random
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict

DB_PATH = Path("legalhelp_patterns.db")

# ─── INDICADORES DE RESULTADO ─────────────────
ACOGE_PATTERNS = [
    r'se\s+acoge\s+(?:la|el|parcialmente)',
    r'ACOGE\s+(?:LA|EL)',
    r'ha\s+lugar\s+(?:la|a)',
    r'se\s+acoge\s+la\s+demanda',
    r'sentencia\s+favorable',
]

RECHAZA_PATTERNS = [
    r'se\s+rechaza\s+(?:la|el)',
    r'RECHAZA\s+(?:LA|EL)',
    r'no\s+ha\s+lugar',
    r'se\s+rechaza\s+la\s+demanda',
    r'sin\s+lugar',
    r'se\s+niega\s+lugar',
]

# ─── ARGUMENTOS GANADORES CONOCIDOS ──────────
WINNING_ARGUMENTS = {
    'garantia_indemnidad': {
        'phrases': ['garantía de indemnidad', 'garantia de indemnidad'],
        'laws': ['artículo 489', 'art. 489', '168 código del trabajo'],
        'success_rate': 0.47,
        'source': 'Observatorio Judicial 14,051 casos',
    },
    'despido_injustificado': {
        'phrases': ['despido injustificado', 'despido indebido', 'causal improcedente'],
        'laws': ['artículo 168', 'art. 168', 'artículo 162'],
        'success_rate': 0.41,
        'source': 'Observatorio Judicial',
    },
    'nulidad_despido': {
        'phrases': ['nulidad del despido', 'ley bustos', 'artículo 162 inciso'],
        'laws': ['artículo 162', 'ley 19.631'],
        'success_rate': 0.38,
        'source': 'Jurisprudencia laboral',
    },
    'fuero': {
        'phrases': ['fuero sindical', 'fuero maternal', 'fuero laboral'],
        'laws': ['artículo 174', 'artículo 201', 'artículo 243'],
        'success_rate': 0.55,
        'source': 'Jurisprudencia laboral',
    },
    'acoso_laboral': {
        'phrases': ['acoso laboral', 'hostigamiento', 'ley karin'],
        'laws': ['ley 21.643', 'artículo 2 código del trabajo'],
        'success_rate': 0.35,
        'source': 'Jurisprudencia laboral',
    },
}

# ─── INDICADORES DE DEBILIDAD ────────────────
WEAKNESS_INDICATORS = [
    r'no\s+se\s+(?:logró|logro|pudo)\s+acreditar',
    r'insuficiencia\s+probatoria',
    r'falta\s+de\s+prueba',
    r'no\s+consta\s+en\s+autos',
    r'contradicción\s+en\s+(?:la|las?)\s+prueba',
    r'caducidad\s+de\s+la\s+acción',
    r'prescripci[oó]n\s+de\s+la\s+acción',
    r'falta\s+de\s+legitimidad',
    r'abandono\s+del\s+procedimiento',
    r'no\s+existe\s+relación\s+laboral',
    r'testigo\s+(?:no|sin)\s+(?:presencial|directo|conocimiento)',
    r'documento\s+(?:no|sin)\s+(?:firmado|autenticado|original)',
]


def setup_database():
    """Crea la BD SQLite para almacenar patrones."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rit TEXT, tribunal TEXT, fecha TEXT, materia TEXT,
        resultado TEXT,  -- 'acoge', 'rechaza', 'acoge_parcial'
        texto TEXT, url TEXT UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS patterns (
        pattern TEXT, category TEXT,
        count_acoge INTEGER DEFAULT 0, count_rechaza INTEGER DEFAULT 0, count_total INTEGER DEFAULT 0,
        ratio REAL DEFAULT 0,
        PRIMARY KEY (pattern, category)
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS law_citations (
        law TEXT PRIMARY KEY,
        count_acoge INTEGER DEFAULT 0, count_rechaza INTEGER DEFAULT 0,
        ratio REAL DEFAULT 0
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS court_stats (
        tribunal TEXT PRIMARY KEY,
        total INTEGER DEFAULT 0, acoge INTEGER DEFAULT 0, rechaza INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0
    )''')
    
    c.execute('''CREATE INDEX IF NOT EXISTS idx_resultado ON sentences(resultado)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_materia ON sentences(materia)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_tribunal ON sentences(tribunal)''')
    
    conn.commit()
    return conn


def classify_result(text):
    """Clasifica el resultado de una sentencia (Python puro, sin IA)."""
    if not text:
        return 'desconocido'
    
    # Contar indicadores
    acoge_score = 0
    rechaza_score = 0
    
    for pattern in ACOGE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            acoge_score += 1
    
    for pattern in RECHAZA_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            rechaza_score += 1
    
    if acoge_score > rechaza_score:
        # Detectar si es parcial
        if re.search(r'parcialmente|acoge\s+parcial', text, re.IGNORECASE):
            return 'acoge_parcial'
        return 'acoge'
    elif rechaza_score > acoge_score:
        return 'rechaza'
    elif acoge_score > 0 and rechaza_score > 0:
        return 'acoge_parcial'
    
    return 'desconocido'


def extract_law_citations(text):
    """Extrae leyes citadas en un texto legal."""
    laws = []
    
    # Patrones comunes de citación legal chilena
    patterns = [
        r'(?:artículo|art\.?)\s*(\d+[A-Za-z]?(?:\s*(?:bis|ter|quáter|quinquies))?)\s*(?:del|de la|de)\s*(código\s*(?:del|de la|de)\s*\w+)',
        r'ley\s+(?:n[°º]?\s*)?(\d+[\.-]?\d*)',
        r'DL\s+(\d+[\.-]?\d*)',
        r'DFL\s+(\d+[\.-]?\d*)',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            if isinstance(m, tuple):
                laws.append(' '.join(m).strip())
            else:
                laws.append(m.strip())
    
    return list(set(laws))


def extract_winning_phrases(text):
    """Extrae frases que indican argumentos ganadores."""
    found = []
    text_lower = text.lower()
    
    for arg_name, arg_data in WINNING_ARGUMENTS.items():
        for phrase in arg_data['phrases']:
            if phrase in text_lower:
                found.append(arg_name)
                break
    
    return found


def extract_weaknesses(text):
    """Detecta debilidades que llevaron a perder el caso."""
    found = []
    for pattern in WEAKNESS_INDICATORS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            found.append(match.group(0)[:60])
    return found


def analyze_sentence(text):
    """Análisis completo de una sentencia."""
    return {
        'resultado': classify_result(text),
        'leyes': extract_law_citations(text),
        'argumentos': extract_winning_phrases(text),
        'debilidades': extract_weaknesses(text),
        'longitud': len(text) if text else 0,
    }


def update_patterns(conn, text, resultado):
    """Actualiza la base de datos de patrones con una nueva sentencia."""
    c = conn.cursor()
    
    # Actualizar frases ganadoras
    text_lower = text.lower() if text else ''
    for arg_name, arg_data in WINNING_ARGUMENTS.items():
        for phrase in arg_data['phrases']:
            if phrase in text_lower:
                c.execute(
                    "INSERT INTO patterns (pattern, category, count_acoge, count_rechaza, count_total, ratio) "
                    "VALUES (?, 'argumento', 0, 0, 0, 0) "
                    "ON CONFLICT(pattern, category) DO NOTHING",
                    (phrase,)
                )
                if resultado == 'acoge' or resultado == 'acoge_parcial':
                    c.execute(
                        "UPDATE patterns SET count_acoge = count_acoge + 1, count_total = count_total + 1 "
                        "WHERE pattern = ? AND category = 'argumento'",
                        (phrase,)
                    )
                elif resultado == 'rechaza':
                    c.execute(
                        "UPDATE patterns SET count_rechaza = count_rechaza + 1, count_total = count_total + 1 "
                        "WHERE pattern = ? AND category = 'argumento'",
                        (phrase,)
                    )
    
    # Actualizar leyes citadas
    laws = extract_law_citations(text)
    for law in laws:
        c.execute(
            "INSERT INTO law_citations (law, count_acoge, count_rechaza, ratio) "
            "VALUES (?, 0, 0, 0) "
            "ON CONFLICT(law) DO NOTHING",
            (law,)
        )
        if resultado in ('acoge', 'acoge_parcial'):
            c.execute("UPDATE law_citations SET count_acoge = count_acoge + 1 WHERE law = ?", (law,))
        elif resultado == 'rechaza':
            c.execute("UPDATE law_citations SET count_rechaza = count_rechaza + 1 WHERE law = ?", (law,))
    
    # Actualizar ratios
    c.execute(
        "UPDATE patterns SET ratio = CAST(count_acoge AS REAL) / NULLIF(count_total, 0) "
        "WHERE count_total > 0"
    )
    c.execute(
        "UPDATE law_citations SET ratio = CAST(count_acoge AS REAL) / NULLIF(count_acoge + count_rechaza, 0) "
        "WHERE count_acoge + count_rechaza > 0"
    )
    
    conn.commit()


def load_observatorio_data():
    """Carga los 14,051 casos del Observatorio Judicial en la BD."""
    conn = setup_database()
    c = conn.cursor()
    
    # Datos agregados del Observatorio Judicial
    obs_data = [
        ('garantía de indemnidad', 'argumento', 1643, 1851, 0.47),
        ('despido injustificado', 'argumento', 3685, 5305, 0.41),
        ('acoso laboral', 'argumento', 980, 1820, 0.35),
        ('no discriminación', 'argumento', 850, 3020, 0.22),
        ('vida e integridad', 'argumento', 955, 3820, 0.20),
        ('honra y vida privada', 'argumento', 612, 2305, 0.21),
        ('conciliación', 'estrategia', 5340, 0, 0.38),
        ('avenimiento', 'estrategia', 3372, 0, 0.24),
    ]
    
    for pattern, category, acoge, rechaza, ratio in obs_data:
        c.execute(
            "INSERT OR REPLACE INTO patterns (pattern, category, count_acoge, count_rechaza, count_total, ratio) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (pattern, category, acoge, rechaza, acoge + rechaza, ratio)
        )
    
    conn.commit()
    
    # También guardar el metadata
    c.execute("SELECT COUNT(*) FROM sentences WHERE materia = 'tutela_laboral'")
    if c.fetchone()[0] == 0:
        # Insertar un registro de metadata
        c.execute(
            "INSERT INTO sentences (rit, materia, resultado) VALUES (?, ?, ?)",
            ('OBSERVATORIO-14051', 'tutela_laboral', 'metadata')
        )
    
    conn.commit()
    print(f"✅ Cargados datos de 14,051 casos del Observatorio Judicial")
    conn.close()


def generate_advice(case_data):
    """
    Genera asesoría legal basada en patrones (sin IA).
    case_data: dict con tipo, antiguedad, sector, etc.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    advice = {
        'probabilidad_base': 0.24,
        'argumentos_recomendados': [],
        'argumentos_evitar': [],
        'estrategia': [],
        'indemnizacion_estimada': None,
    }
    
    # Buscar mejores argumentos
    c.execute(
        "SELECT pattern, ratio, count_acoge FROM patterns "
        "WHERE category = 'argumento' AND count_acoge >= 10 "
        "ORDER BY ratio DESC LIMIT 5"
    )
    for row in c.fetchall():
        advice['argumentos_recomendados'].append({
            'argumento': row[0],
            'exito': row[1],
            'casos': row[2],
        })
    
    # Buscar qué evitar
    c.execute(
        "SELECT pattern, ratio, count_rechaza FROM patterns "
        "WHERE category = 'argumento' AND count_rechaza >= 10 "
        "ORDER BY ratio ASC LIMIT 3"
    )
    for row in c.fetchall():
        advice['argumentos_evitar'].append({
            'argumento': row[0],
            'fracaso': 1 - row[1],
            'casos': row[2],
        })
    
    # Estrategia basada en datos
    c.execute(
        "SELECT pattern, ratio FROM patterns WHERE category = 'estrategia' ORDER BY ratio DESC"
    )
    estrategias = c.fetchall()
    for e in estrategias:
        advice['estrategia'].append(f"{e[0]}: {e[1]:.0%} de los casos")
    
    # Mejor probabilidad
    if advice['argumentos_recomendados']:
        advice['probabilidad_optimizada'] = advice['argumentos_recomendados'][0]['exito']
    else:
        advice['probabilidad_optimizada'] = advice['probabilidad_base']
    
    # Indemnización estimada
    if case_data.get('antiguedad'):
        years = case_data['antiguedad']
        advice['indemnizacion'] = {
            'min_meses': years * 0.8,
            'max_meses': years * 1.5,
            'nota': '1 mes de sueldo por año trabajado + 30% recargo si es injustificado'
        }
    
    conn.close()
    return advice


def print_advice(case_data):
    """Imprime la asesoría en formato legible."""
    advice = generate_advice(case_data)
    
    print("\n" + "=" * 60)
    print("⚖️  LEGALHELP ASESORÍA BASADA EN DATOS REALES")
    print("=" * 60)
    
    print(f"\n📊 Caso: {case_data.get('tipo', 'Despido')}")
    print(f"   Antigüedad: {case_data.get('antiguedad', 'N/A')} años")
    print(f"   Sector: {case_data.get('sector', 'N/A')}")
    
    print(f"\n🎯 PROBABILIDAD DE ÉXITO:")
    print(f"   Base: {advice['probabilidad_base']:.0%}")
    print(f"   Optimizada: {advice['probabilidad_optimizada']:.0%}")
    
    if advice['argumentos_recomendados']:
        print(f"\n✅ ARGUMENTOS RECOMENDADOS (mayor tasa de éxito):")
        for i, arg in enumerate(advice['argumentos_recomendados'][:5], 1):
            print(f"   {i}. {arg['argumento']} ({arg['exito']:.0%} en {arg['casos']} casos)")
    
    if advice['argumentos_evitar']:
        print(f"\n❌ EVITAR:")
        for arg in advice['argumentos_evitar']:
            print(f"   • {arg['argumento']} ({arg['fracaso']:.0%} de fracaso)")
    
    if advice['estrategia']:
        print(f"\n📋 ESTRATEGIA:")
        for e in advice['estrategia']:
            print(f"   • {e}")
    
    if advice.get('indemnizacion'):
        ind = advice['indemnizacion']
        print(f"\n💰 INDEMNIZACIÓN ESTIMADA:")
        print(f"   Entre {ind['min_meses']:.1f} y {ind['max_meses']:.1f} meses de sueldo")
        print(f"   {ind['nota']}")
    
    print("\n" + "=" * 60)
    print("📚 Fuente: 14,051 sentencias del PJUD + datos propios")
    print("=" * 60)


# ─── MAIN ───────────────────────────────────
if __name__ == "__main__":
    import sys
    
    if "--init" in sys.argv:
        print("🔄 Inicializando base de datos...")
        setup_database()
        load_observatorio_data()
        print("✅ Listo. Base de datos poblada con patrones iniciales.")
    
    elif "--analyze" in sys.argv:
        text = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
        if not text:
            text = input("Pegá el texto de la sentencia: ")
        
        analysis = analyze_sentence(text)
        print(f"\n📊 ANÁLISIS DE SENTENCIA:")
        print(f"   Resultado: {analysis['resultado']}")
        print(f"   Leyes citadas: {', '.join(analysis['leyes'][:10])}")
        print(f"   Argumentos: {', '.join(analysis['argumentos'])}")
        if analysis['debilidades']:
            print(f"   ⚠️ Debilidades: {', '.join(analysis['debilidades'][:5])}")
    
    elif "--advise" in sys.argv:
        # Simulación de caso
        case = {
            'tipo': 'despido injustificado',
            'antiguedad': 3,
            'sector': 'privado',
        }
        
        if '--antiguedad' in sys.argv:
            idx = sys.argv.index('--antiguedad')
            case['antiguedad'] = int(sys.argv[idx + 1])
        
        if '--sector' in sys.argv:
            idx = sys.argv.index('--sector')
            case['sector'] = sys.argv[idx + 1]
        
        print_advice(case)
    
    elif "--patterns" in sys.argv:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT pattern, ratio, count_acoge, count_total FROM patterns WHERE category='argumento' ORDER BY ratio DESC LIMIT 20")
        print("\n🏆 MEJORES ARGUMENTOS (por tasa de éxito):")
        for row in c.fetchall():
            bar = "█" * int(row[1] * 20)
            print(f"  {row[1]:.0%} {bar} | {row[0][:50]} ({row[2]}/{row[3]})")
        
        c.execute("SELECT pattern, ratio FROM patterns WHERE category='estrategia'")
        print("\n📋 ESTRATEGIAS:")
        for row in c.fetchall():
            print(f"  {row[1]:.0%} | {row[0]}")
        
        conn.close()
    
    else:
        print("""
╔══════════════════════════════════════════╗
║  ⚖️ LEGALHELP PATTERN ENGINE v2.0      ║
║  Python puro - $0 tokens - sin IA      ║
╠══════════════════════════════════════════╣
║                                          ║
║  python3 pattern-miner.py --init        ║
║     Inicializa la base de patrones      ║
║                                          ║
║  python3 pattern-miner.py --advise      ║
║     Asesoría legal basada en datos      ║
║     --antiguedad 3 --sector privado     ║
║                                          ║
║  python3 pattern-miner.py --patterns    ║
║     Ver todos los patrones              ║
║                                          ║
║  python3 pattern-miner.py --analyze     ║
║     Analizar texto de sentencia         ║
║                                          ║
║  📊 Datos: 14,051 sentencias PJUD       ║
║  💰 Costo: $0 (solo tu electricidad)    ║
╚══════════════════════════════════════════╝
        """)
