#!/usr/bin/env python3
"""
⚖️ PJUD Pattern Miner - Analiza sentencias laborales chilenas
Encuentra patrones que hacen GANAR o PERDER casos.
Correlo en tu PC - costo $0, solo electricidad.

ESTRATEGIA:
1. Scrapea metadata de juris.pjud.cl (RIT, tribunal, fecha, resultado)
2. Clasifica: GANADO (acoge) vs PERDIDO (rechaza)
3. Extrae frases, argumentos, leyes citadas
4. Calcula correlación: ¿qué aparece más en ganados?
"""

import re
import json
import time
import sqlite3
import urllib.request
import urllib.parse
import ssl
from pathlib import Path
from datetime import datetime
from collections import Counter

DB_PATH = Path("pjud_patterns.db")
CHECKPOINT_PATH = Path("scraper_checkpoint.json")

# ─── FRASES GANADORAS CONOCIDAS (basadas en Observatorio Judicial) ───
WINNING_PATTERNS = [
    "garantía de indemnidad",
    "vulneración de derechos fundamentales",
    "despido injustificado",
    "artículo 168 del código del trabajo",
    "artículo 489 del código del trabajo",
    "indemnización sustitutiva del aviso previo",
    "recargo del 30%",
    "recargo del 50%",
    "artículo 162",
    "nulidad del despido",
    "ley bustos",
    "fuero sindical",
    "fuero maternal",
    "discriminación",
    "acoso laboral",
    "artículo 2° del código del trabajo",
    "derecho a la honra",
    "debido proceso",
    "proporcionalidad",
    "última remuneración mensual",
]

LOSING_PATTERNS = [
    "caducidad de la acción",
    "prescripción",
    "falta de legitimidad pasiva",
    "no se acreditó",
    "no consta en autos",
    "insuficiencia probatoria",
    "no se logró acreditar",
    "ausencia de prueba",
    "contradicción en la prueba",
    "testigo no presencial",
    "prueba documental insuficiente",
    "no existe relación laboral",
    "honorarios",
    "abandono del procedimiento",
]


def setup_database():
    """Crea la base de datos SQLite para almacenar patrones."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rit TEXT, tribunal TEXT, fecha TEXT, materia TEXT,
        resultado TEXT,  -- 'acoge', 'rechaza', 'acoge_parcial', 'conciliacion'
        texto TEXT,  -- first 5000 chars for pattern mining
        url TEXT UNIQUE
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT UNIQUE,
        count_wins INTEGER DEFAULT 0,
        count_losses INTEGER DEFAULT 0,
        win_ratio REAL DEFAULT 0,
        category TEXT  -- 'frase', 'ley', 'argumento', 'estructura'
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS court_stats (
        tribunal TEXT PRIMARY KEY,
        total_cases INTEGER DEFAULT 0,
        acoge INTEGER DEFAULT 0,
        rechaza INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS matter_stats (
        materia TEXT PRIMARY KEY,
        total_cases INTEGER DEFAULT 0,
        acoge INTEGER DEFAULT 0,
        rechaza INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0
    )''')
    
    conn.commit()
    return conn


def scrape_juris_pjud(materia="laboral", max_pages=10):
    """
    Scrapea juris.pjud.cl para obtener sentencias.
    ⚠️ El sitio usa Cloudflare. Este scraper está diseñado para
    correr desde IP residencial chilena (tu casa).
    """
    conn = setup_database()
    c = conn.cursor()
    ctx = ssl.create_default_context()
    base_url = "https://juris.pjud.cl/busqueda"
    
    sentences_found = 0
    
    # Parámetros de búsqueda
    params = {
        "tipo": "dicte",
        "tribunal": "todos",
        "materia": materia,
        "orden": "fecha_desc",
        "pagina": 1,
    }
    
    for page in range(1, max_pages + 1):
        params["pagina"] = page
        url = f"{base_url}?{urllib.parse.urlencode(params)}"
        
        print(f"📄 Página {page}/{max_pages}...")
        
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            })
            resp = urllib.request.urlopen(req, context=ctx, timeout=30)
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Extraer RITs de la página de resultados
            rits = re.findall(r'[A-Z]-[0-9]+-[0-9]{4}', html)
            for rit in rits:
                print(f"   📋 {rit}")
                sentences_found += 1
                
                # Guardar metadata
                try:
                    c.execute(
                        "INSERT OR IGNORE INTO sentences (rit, materia, url) VALUES (?, ?, ?)",
                        (rit, materia, url)
                    )
                except:
                    pass
            
            conn.commit()
            time.sleep(2)  # Rate limit
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:80]}")
            break
    
    print(f"\n📊 {sentences_found} sentencias encontradas en {max_pages} páginas")
    conn.close()
    return sentences_found


def analyze_text_patterns():
    """
    Analiza el texto de las sentencias para encontrar patrones
    que correlacionan con ganar o perder.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Contar cuántas tenemos
    c.execute("SELECT COUNT(*) FROM sentences")
    total = c.fetchone()[0]
    print(f"📊 {total} sentencias en base de datos")
    
    # Para cada patrón conocido, contar en ganados vs perdidos
    for pattern in WINNING_PATTERNS + LOSING_PATTERNS:
        # Contar en ganados
        c.execute(
            "SELECT COUNT(*) FROM sentences WHERE resultado LIKE '%acoge%' AND texto LIKE ?",
            (f"%{pattern}%",)
        )
        wins = c.fetchone()[0]
        
        # Contar en perdidos
        c.execute(
            "SELECT COUNT(*) FROM sentences WHERE resultado LIKE '%rechaza%' AND texto LIKE ?",
            (f"%{pattern}%",)
        )
        losses = c.fetchone()[0]
        
        total_with = wins + losses
        win_ratio = wins / total_with if total_with > 0 else 0
        
        # Determinar si es ganador o perdedor
        category = "ganador" if pattern in WINNING_PATTERNS else "perdedor"
        
        c.execute(
            """INSERT OR REPLACE INTO patterns (pattern, count_wins, count_losses, win_ratio, category)
            VALUES (?, ?, ?, ?, ?)""",
            (pattern, wins, losses, win_ratio, category)
        )
    
    conn.commit()
    
    # Mostrar top patrones ganadores
    print("\n🏆 TOP PATRONES GANADORES:")
    c.execute("SELECT pattern, count_wins, win_ratio FROM patterns WHERE count_wins > 0 ORDER BY win_ratio DESC LIMIT 15")
    for row in c.fetchall():
        print(f"   {row[2]:.0%} | {row[0][:60]} ({row[1]} casos)")
    
    conn.close()


def extract_ngrams_from_text(text, n=3):
    """Extrae n-gramas de palabras de un texto."""
    words = re.findall(r'\b[a-záéíóúñ]{4,}\b', text.lower())
    return [' '.join(words[i:i+n]) for i in range(len(words)-n+1)]


def mine_new_patterns():
    """
    Minería no supervisada: encuentra NUEVOS patrones que
    no están en las listas predefinidas.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Obtener textos de ganados y perdidos
    c.execute("SELECT texto FROM sentences WHERE resultado LIKE '%acoge%' LIMIT 500")
    won_texts = [row[0] or '' for row in c.fetchall()]
    
    c.execute("SELECT texto FROM sentences WHERE resultado LIKE '%rechaza%' LIMIT 500")
    lost_texts = [row[0] or '' for row in c.fetchall()]
    
    if not won_texts or not lost_texts:
        print("⚠️ Necesito más sentencias clasificadas primero")
        conn.close()
        return
    
    # Extraer n-gramas
    won_ngrams = Counter()
    for text in won_texts:
        won_ngrams.update(extract_ngrams_from_text(text, 3))
    
    lost_ngrams = Counter()
    for text in lost_texts:
        lost_ngrams.update(extract_ngrams_from_text(text, 3))
    
    # Encontrar n-gramas que aparecen más en ganados
    total_won = len(won_texts)
    total_lost = len(lost_texts)
    
    discoveries = []
    for ngram, count_won in won_ngrams.most_common(1000):
        count_lost = lost_ngrams.get(ngram, 0)
        
        # Normalizar
        freq_won = count_won / total_won
        freq_lost = count_lost / total_lost if total_lost > 0 else 0
        
        if freq_won > 0.05 and freq_won > freq_lost * 1.5:
            ratio = freq_won / (freq_lost + 0.0001)
            discoveries.append((ngram, count_won, count_lost, ratio))
    
    discoveries.sort(key=lambda x: x[3], reverse=True)
    
    print("\n🔍 NUEVOS PATRONES DESCUBIERTOS (no supervisado):")
    for ngram, w, l, ratio in discoveries[:30]:
        print(f"   {ratio:.1f}x | {ngram[:70]} ({w} vs {l})")
    
    conn.close()


def generate_advisory_report(case_type):
    """
    Genera un reporte de asesoría para un tipo de caso específico.
    Devuelve los argumentos con mayor tasa de éxito.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute(
        "SELECT pattern, count_wins, count_losses, win_ratio FROM patterns "
        "WHERE count_wins + count_losses >= 5 AND category = 'ganador' "
        "ORDER BY win_ratio DESC LIMIT 10"
    )
    
    print(f"\n📋 REPORTE DE ASESORÍA PARA: {case_type}")
    print("=" * 60)
    print("ARGUMENTOS RECOMENDADOS (mayor tasa de éxito):")
    for i, row in enumerate(c.fetchall(), 1):
        print(f"  {i}. {row[0]} ({row[3]:.0%} éxito, {row[1]} casos)")
    
    print("\n⚠️ EVITAR (asociados a casos perdidos):")
    c.execute(
        "SELECT pattern, count_losses, win_ratio FROM patterns "
        "WHERE count_losses >= 3 AND category = 'perdedor' "
        "ORDER BY count_losses DESC LIMIT 5"
    )
    for row in c.fetchall():
        print(f"  ❌ {row[0]} (presente en {row[1]} casos perdidos)")
    
    conn.close()


# ─── MAIN ───────────────────────────────────
if __name__ == "__main__":
    import sys
    
    if "--scrape" in sys.argv:
        materia = sys.argv[sys.argv.index("--scrape") + 1] if len(sys.argv) > sys.argv.index("--scrape") + 1 else "laboral"
        scrape_juris_pjud(materia=materia, max_pages=20)
    
    elif "--analyze" in sys.argv:
        print("🔍 ANALIZANDO PATRONES...")
        analyze_text_patterns()
    
    elif "--mine" in sys.argv:
        print("⛏️ MINERÍA DE NUEVOS PATRONES...")
        mine_new_patterns()
    
    elif "--report" in sys.argv:
        case_type = sys.argv[-1] if len(sys.argv) > 2 else "despido injustificado"
        generate_advisory_report(case_type)
    
    elif "--stats" in sys.argv:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM sentences")
        total = c.fetchone()[0]
        c.execute("SELECT COUNT(DISTINCT resultado) FROM sentences WHERE resultado IS NOT NULL")
        outcomes = c.fetchone()[0]
        c.execute("SELECT resultado, COUNT(*) FROM sentences WHERE resultado IS NOT NULL GROUP BY resultado ORDER BY COUNT(*) DESC")
        print(f"📊 {total} sentencias en BD | {outcomes} tipos de resultado")
        for row in c.fetchall():
            print(f"   {row[0]}: {row[1]}")
        conn.close()
    
    else:
        print("""
╔══════════════════════════════════════════╗
║  ⚖️ PJUD Pattern Miner v1.0            ║
╠══════════════════════════════════════════╣
║                                          ║
║  python3 pattern-miner.py --scrape      ║
║    Descarga sentencias del PJUD         ║
║                                          ║
║  python3 pattern-miner.py --analyze     ║
║    Analiza patrones ganadores/perdedores║
║                                          ║
║  python3 pattern-miner.py --mine         ║
║    Minería no supervisada de patrones   ║
║                                          ║
║  python3 pattern-miner.py --report      ║
║    Genera reporte de asesoría legal     ║
║                                          ║
║  python3 pattern-miner.py --stats       ║
║    Estadísticas de la base de datos     ║
║                                          ║
║  ⚠️ Ejecutar desde PC con IP chilena   ║
╚══════════════════════════════════════════╝
        """)
