#!/usr/bin/env python3
"""
🏛️ LEGALHELP FULL SCRAPER
Descarga textos completos de juris.pjud.cl
Analiza patrones ganadores/perdedores
CORRER DESDE PC CHILENA - IP residencial evita Cloudflare

Meta: 15,000 casos por materia (laboral, civil, familia)
Total: 45,000 sentencias analizadas
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

DB = Path("legalhelp_patterns.db")
STATE_FILE = Path("scraper_state.json")
ctx = ssl.create_default_context()

# ─── CONFIG ──────────────────────────────────
MATERIAS = {
    'laboral': {'search_url': 'https://juris.pjud.cl/busqueda', 'max_cases': 5000},
    'civil': {'search_url': 'https://juris.pjud.cl/busqueda', 'max_cases': 5000},
    'familia': {'search_url': 'https://juris.pjud.cl/busqueda', 'max_cases': 5000},
}

# Patrones para clasificar resultado
ACOGE = [
    r'se\s+acoge\s+(?:la|el|parcialmente)',
    r'ha\s+lugar',
    r'ACOGE\s+(?:LA|EL)',
]
RECHAZA = [
    r'se\s+rechaza\s+(?:la|el)',
    r'no\s+ha\s+lugar',
    r'RECHAZA\s+(?:LA|EL)',
    r'sin\s+lugar',
]

# Patrones ganadores a buscar
WIN_PATTERNS = {
    'indemnidad': [r'garant[ií]a\s+de\s+indemnidad', r'art[ií]culo\s+489'],
    'fuero': [r'fuero\s+(?:sindical|maternal|laboral)', r'art[ií]culo\s+174'],
    'despido_injustificado': [r'despido\s+injustificado', r'art[ií]culo\s+168'],
    'nulidad_despido': [r'nulidad\s+del\s+despido', r'ley\s+bustos'],
    'acoso': [r'acoso\s+laboral', r'ley\s+karin', r'21\.643'],
    'prueba_documental': [r'prueba\s+documental', r'documento\s+acompañado'],
    'testigos': [r'testigo[s]?\s+(?:presenciale|directo)', r'declaraci[oó]n\s+testimonial'],
}

LOSE_PATTERNS = {
    'sin_prueba': [r'no\s+(?:se\s+)?(?:logr[oó]|pudo)\s+acreditar', r'insuficiencia\s+probatoria'],
    'caducidad': [r'caducidad\s+de\s+la\s+acci[oó]n', r'prescripci[oó]n'],
    'abandono': [r'abandono\s+del\s+procedimiento'],
    'sin_relacion': [r'no\s+existe\s+relaci[oó]n\s+laboral'],
}


def setup_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rit TEXT, materia TEXT, tribunal TEXT, fecha TEXT,
        resultado TEXT, texto TEXT, url TEXT UNIQUE
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS word_patterns (
        word TEXT, category TEXT, materia TEXT,
        count_acoge INTEGER DEFAULT 0, count_rechaza INTEGER DEFAULT 0,
        count_total INTEGER DEFAULT 0, ratio REAL DEFAULT 0,
        PRIMARY KEY (word, category, materia)
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS ngram_patterns (
        ngram TEXT, n INTEGER, materia TEXT,
        count_acoge INTEGER DEFAULT 0, count_rechaza INTEGER DEFAULT 0,
        ratio REAL DEFAULT 0,
        PRIMARY KEY (ngram, n, materia)
    )''')
    
    conn.commit()
    return conn


def classify(text):
    """Clasifica resultado: acoge, rechaza, acoge_parcial, unknown"""
    if not text:
        return 'unknown'
    a = sum(1 for p in ACOGE if re.search(p, text, re.I))
    r = sum(1 for p in RECHAZA if re.search(p, text, re.I))
    if a > r:
        return 'acoge_parcial' if 'parcial' in text[:2000].lower() else 'acoge'
    elif r > a:
        return 'rechaza'
    elif a > 0 and r > 0:
        return 'acoge_parcial'
    return 'unknown'


def extract_patterns(text, materia, resultado, conn):
    """Extrae y actualiza patrones en la BD."""
    c = conn.cursor()
    is_win = resultado in ('acoge', 'acoge_parcial')
    
    # Palabras individuales (frecuencia)
    words = re.findall(r'\b[a-záéíóúñ]{4,}\b', text.lower())
    word_counts = Counter(words)
    
    for word, count in word_counts.most_common(200):
        if count < 3:
            continue
        if is_win:
            c.execute('''INSERT INTO word_patterns (word, category, materia, count_acoge, count_total, ratio)
                VALUES (?, 'word', ?, 1, 1, 1.0)
                ON CONFLICT(word, category, materia) DO UPDATE SET
                count_acoge = count_acoge + 1, count_total = count_total + 1,
                ratio = CAST(count_acoge AS REAL) / count_total''',
                (word, materia))
        else:
            c.execute('''INSERT INTO word_patterns (word, category, materia, count_rechaza, count_total, ratio)
                VALUES (?, 'word', ?, 1, 1, 0.0)
                ON CONFLICT(word, category, materia) DO UPDATE SET
                count_rechaza = count_rechaza + 1, count_total = count_total + 1,
                ratio = CAST(count_acoge AS REAL) / count_total''',
                (word, materia))
    
    # Patrones ganadores
    for name, patterns in WIN_PATTERNS.items():
        found = any(re.search(p, text, re.I) for p in patterns)
        if found:
            c.execute('''INSERT INTO word_patterns (word, category, materia, count_acoge, count_total, ratio)
                VALUES (?, 'win_pattern', ?, 1, 1, 1.0)
                ON CONFLICT(word, category, materia) DO UPDATE SET
                count_acoge = count_acoge + 1, count_total = count_total + 1,
                ratio = CAST(count_acoge AS REAL) / count_total''',
                (name, materia))
    
    # Patrones perdedores
    for name, patterns in LOSE_PATTERNS.items():
        found = any(re.search(p, text, re.I) for p in patterns)
        if found:
            c.execute('''INSERT INTO word_patterns (word, category, materia, count_rechaza, count_total, ratio)
                VALUES (?, 'lose_pattern', ?, 1, 1, 0.0)
                ON CONFLICT(word, category, materia) DO UPDATE SET
                count_rechaza = count_rechaza + 1, count_total = count_total + 1,
                ratio = CAST(count_acoge AS REAL) / count_total''',
                (name, materia))
    
    # N-gramas (bigramas)
    words_list = re.findall(r'\b[a-záéíóúñ]{4,}\b', text.lower())
    for i in range(len(words_list) - 1):
        bigram = f"{words_list[i]} {words_list[i+1]}"
        if is_win:
            c.execute('''INSERT INTO ngram_patterns (ngram, n, materia, count_acoge, ratio)
                VALUES (?, 2, ?, 1, 1.0)
                ON CONFLICT(ngram, n, materia) DO UPDATE SET
                count_acoge = count_acoge + 1,
                ratio = CAST(count_acoge AS REAL) / (count_acoge + count_rechaza + 1)''',
                (bigram, materia))
        else:
            c.execute('''INSERT INTO ngram_patterns (ngram, n, materia, count_rechaza, ratio)
                VALUES (?, 2, ?, 1, 0.0)
                ON CONFLICT(ngram, n, materia) DO UPDATE SET
                count_rechaza = count_rechaza + 1,
                ratio = CAST(count_acoge AS REAL) / (count_acoge + count_rechaza + 1)''',
                (bigram, materia))


def scrape_materia(materia, max_cases):
    """Scrapea sentencias de una materia específica."""
    conn = setup_db()
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM sentences WHERE materia = ?", (materia,))
    existing = c.fetchone()[0]
    
    if existing >= max_cases:
        print(f"  ✅ {materia}: ya hay {existing:,} casos (meta: {max_cases:,})")
        return existing
    
    needed = max_cases - existing
    print(f"  🎯 {materia}: {existing:,} existentes, necesito {needed:,} más")
    
    # Cargar estado anterior
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
        page = state.get(f"{materia}_page", 1)
    else:
        state = {}
        page = 1
    
    ctx = ssl.create_default_context()
    found = 0
    
    while found < needed:
        params = {
            'tipo': 'dicte',
            'materia': materia,
            'orden': 'fecha_desc',
            'pagina': page,
        }
        url = f"https://juris.pjud.cl/busqueda?{urllib.parse.urlencode(params)}"
        
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            })
            resp = urllib.request.urlopen(req, context=ctx, timeout=20)
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Extraer links a sentencias
            links = re.findall(r'href="(/busqueda/[^"]+)"', html)
            
            for link in links[:10]:  # Top 10 per page
                full_url = f"https://juris.pjud.cl{link}"
                
                # Verificar si ya existe
                c.execute("SELECT COUNT(*) FROM sentences WHERE url = ?", (full_url,))
                if c.fetchone()[0] > 0:
                    continue
                
                # Descargar sentencia
                try:
                    req2 = urllib.request.Request(full_url, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    })
                    resp2 = urllib.request.urlopen(req2, context=ctx, timeout=15)
                    text = resp2.read().decode('utf-8', errors='ignore')
                    
                    # Extraer texto limpio
                    text_clean = re.sub(r'<[^>]+>', ' ', text)
                    text_clean = re.sub(r'\s+', ' ', text_clean)
                    
                    # Clasificar
                    resultado = classify(text_clean[:3000])
                    
                    # Extraer RIT
                    rit_match = re.search(r'[A-Z]-[0-9]+-[0-9]{4}', text_clean)
                    rit = rit_match.group(0) if rit_match else ''
                    
                    # Guardar
                    c.execute('''INSERT OR IGNORE INTO sentences 
                        (rit, materia, resultado, texto, url)
                        VALUES (?, ?, ?, ?, ?)''',
                        (rit, materia, resultado, text_clean[:10000], full_url))
                    
                    # Extraer patrones
                    if resultado != 'unknown':
                        extract_patterns(text_clean[:5000], materia, resultado, conn)
                    
                    found += 1
                    if found % 10 == 0:
                        print(f"    {found:,}/{needed:,} (pág {page})")
                    
                except Exception as e:
                    continue
                
                if found >= needed:
                    break
            
            conn.commit()
            
            # Guardar progreso
            state[f"{materia}_page"] = page
            STATE_FILE.write_text(json.dumps(state))
            
            page += 1
            time.sleep(1)  # Rate limit
            
        except Exception as e:
            print(f"    ⚠️ Error pág {page}: {str(e)[:80]}")
            time.sleep(5)
            break
    
    conn.commit()
    conn.close()
    
    print(f"  ✅ {materia}: {found:,} nuevos | total: {existing + found:,}")
    return existing + found


def show_insights():
    """Muestra los patrones descubiertos."""
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    
    for materia in ['laboral', 'civil', 'familia']:
        c.execute("SELECT COUNT(*) FROM sentences WHERE materia = ? AND resultado != 'unknown'", (materia,))
        total = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM sentences WHERE materia = ? AND resultado IN ('acoge', 'acoge_parcial')", (materia,))
        wins = c.fetchone()[0]
        
        if total > 0:
            print(f"\n📊 {materia.upper()}: {total:,} casos | {wins/total:.0%} éxito")
            
            # Top patrones ganadores
            c.execute('''SELECT word, ratio, count_acoge, count_total 
                FROM word_patterns 
                WHERE materia = ? AND category = 'win_pattern' AND count_total >= 5
                ORDER BY ratio DESC LIMIT 5''', (materia,))
            
            for row in c.fetchall():
                print(f"  ✅ {row[0]}: {row[1]:.0%} éxito ({row[2]}/{row[3]})")
    
    conn.close()


if __name__ == "__main__":
    import sys
    
    if "--scrape" in sys.argv:
        materia = sys.argv[2] if len(sys.argv) > 2 else "laboral"
        max_cases = int(sys.argv[3]) if len(sys.argv) > 3 else 5000
        
        print(f"🏛️ SCRAPEO: {materia} (meta: {max_cases:,} casos)")
        print(f"📅 Inicio: {datetime.now():%H:%M:%S}")
        print()
        
        total = scrape_materia(materia, max_cases)
        
        print(f"\n✅ Terminado: {total:,} casos")
        print(f"📅 Fin: {datetime.now():%H:%M:%S}")
    
    elif "--all" in sys.argv:
        print(f"🏛️ SCRAPEO COMPLETO - 3 MATERIAS")
        print(f"📅 Inicio: {datetime.now():%H:%M:%S}\n")
        
        for materia, config in MATERIAS.items():
            total = scrape_materia(materia, config['max_cases'])
            print()
        
        show_insights()
        print(f"\n✅ COMPLETO. 📅 Fin: {datetime.now():%H:%M:%S}")
    
    elif "--insights" in sys.argv:
        show_insights()
    
    elif "--stats" in sys.argv:
        conn = sqlite3.connect(DB)
        c = conn.cursor()
        for materia in ['laboral', 'civil', 'familia']:
            c.execute("SELECT COUNT(*), resultado FROM sentences WHERE materia = ? GROUP BY resultado", (materia,))
            rows = c.fetchall()
            total = sum(r[0] for r in rows)
            print(f"\n{materia}: {total:,} casos")
            for count, result in rows:
                pct = count/total*100 if total > 0 else 0
                print(f"  {result}: {count:,} ({pct:.1f}%)")
        conn.close()
    
    else:
        print("""
╔══════════════════════════════════════════╗
║  🏛️ LEGALHELP FULL SCRAPER            ║
║  Descarga sentencias del PJUD          ║
╠══════════════════════════════════════════╣
║                                          ║
║  python3 full_scraper.py --scrape       ║
║    laboral 5000                         ║
║    Scrapea 5000 casos laborales         ║
║                                          ║
║  python3 full_scraper.py --all          ║
║    Scrapea laboral + civil + familia    ║
║    5000 cada una = 15,000 total         ║
║                                          ║
║  python3 full_scraper.py --insights     ║
║    Muestra patrones descubiertos        ║
║                                          ║
║  python3 full_scraper.py --stats        ║
║    Estadísticas de la BD               ║
║                                          ║
║  ⚠️ CORRER DESDE PC CHILENA           ║
║  💰 $0 tokens - Python puro            ║
╚══════════════════════════════════════════╝
        """)
