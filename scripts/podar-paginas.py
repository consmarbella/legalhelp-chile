"""
Podar paginas.json — LegalHelp.cl
Elimina 2,584 páginas de ciudad NO-GEO (ley nacional, sin sentido por comuna).
Mantiene 79 hubs + 161 ciudades GEO = ~240 páginas totales.
"""
import json
import shutil
from pathlib import Path

REPO = Path(r"C:\Users\matte\OneDrive\Escritorio\legalhel.cl final\legalhelp-repo")
PAGINAS_PATH = REPO / "data" / "paginas.json"
BACKUP_PATH = REPO / "data" / "paginas.json.bak"

# Solo estas categorías necesitan variante por ciudad
GEO_CATEGORIES = {
    "Prescripción de deuda TAG",
    "Prescripción de deuda bancaria",
    "Demanda de alimentos",
    "Denuncia por despido injustificado",
    "Demanda de desalojo por no pago",
    "Denuncia por no pago de cotizaciones",
    "Alzamiento de embargo sobre vehículo",
    "Prescripción de multas de tránsito",
    "Recurso de protección",
}

# Backup
shutil.copy2(PAGINAS_PATH, BACKUP_PATH)
print(f"✅ Backup: {BACKUP_PATH}")

# Cargar
with open(PAGINAS_PATH, "r", encoding="utf-8") as f:
    pages = json.load(f)

original_count = len(pages)
print(f"📄 Páginas originales: {original_count}")

# Filtrar
filtered = []
removed_hubs = 0
removed_cities = 0

for p in pages:
    cat = p.get("categoria", "")
    variable = p.get("variable")

    if variable is None:
        # Es un hub — mantener siempre
        filtered.append(p)
    elif cat in GEO_CATEGORIES:
        # Ciudad GEO — mantener
        filtered.append(p)
    else:
        # Ciudad NO-GEO — eliminar
        removed_cities += 1

print(f"🗑️  Ciudades eliminadas: {removed_cities}")
print(f"✅ Páginas finales: {len(filtered)} (hubs: {len([p for p in filtered if p.get('variable') is None])}, ciudades GEO: {len([p for p in filtered if p.get('variable') is not None])})")

# Guardar
with open(PAGINAS_PATH, "w", encoding="utf-8") as f:
    json.dump(filtered, f, ensure_ascii=False, indent=2)

print("✅ paginas.json actualizado")

# Estadísticas finales
cats_final = {}
for p in filtered:
    cat = p.get("categoria", "sin-categoria")
    if cat not in cats_final:
        cats_final[cat] = {"hubs": 0, "ciudades": 0}
    if p.get("variable") is None:
        cats_final[cat]["hubs"] += 1
    else:
        cats_final[cat]["ciudades"] += 1

print("\n📊 Composición final:")
for cat, counts in sorted(cats_final.items()):
    parts = []
    if counts["hubs"] > 0:
        parts.append(f"{counts['hubs']} hub")
    if counts["ciudades"] > 0:
        parts.append(f"{counts['ciudades']} ciudades")
    print(f"  {cat}: {', '.join(parts)}")
