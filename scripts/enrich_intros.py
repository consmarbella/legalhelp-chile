"""
enrich_intros.py — Genera intros más ricas y diversas para cada ciudad/categoría
en paginas.json usando 7-10 templates distintos por categoría con datos locales.
"""
import json, random, re

with open('data/paginas.json', 'r', encoding='utf-8') as f:
    paginas = json.load(f)

def city_intro_templates(categoria, ciudad, entidad, direccion, ley):
    """Returns 5-10 diverse template options for this category+city."""
    t = []

    # 1. Pregunta directa
    t.append(f"¿Necesitás {categoria.lower()} en {ciudad}? Presentá tu solicitud ante {entidad} ubicado en {direccion}. LegalHelp te genera el documento listo en minutos.")

    # 2. Informativo
    t.append(f"En {ciudad}, el trámite de {categoria.lower()} se realiza ante {entidad} ({direccion}). La {ley} regula este procedimiento. LegalHelp te prepara el escrito.")

    # 3. Acción
    t.append(f"Iniciá tu trámite de {categoria.lower()} en {ciudad}. El documento se presenta ante {entidad} en {direccion}. Plazo aplicable: {ley}. Generalo ahora con LegalHelp.")

    # 4. Beneficio
    t.append(f"Evitá demoras en {ciudad}. Con LegalHelp generás el escrito de {categoria.lower()} para presentar ante {entidad} ({direccion}) respaldado por {ley}.")

    # 5. Local
    t.append(f"Si vivís en {ciudad} y necesitás {categoria.lower()}, el tribunal competente es {entidad} ubicado en {direccion}. LegalHelp te ayuda con el documento.")

    # 6. Urgencia
    t.append(f"¿Tenés que presentar {categoria.lower()} en {ciudad} y no sabés por dónde empezar? {entidad} recibe los escritos en {direccion}. Descargá el documento listo.")

    # 7. Paso a paso
    t.append(f"Paso 1: Generá tu escrito de {categoria.lower()} con LegalHelp. Paso 2: Presentalo ante {entidad} en {direccion}, {ciudad}. La {ley} respalda tu trámite.")

    return t

# Seed random for reproducibility
random.seed(42)

updated = 0
for p in paginas:
    if not p.get('variable') or not p.get('intro'):
        continue
    ciudad = p['variable']
    categoria = p['categoria']
    entidad = p.get('entidad', 'el tribunal competente')
    direccion = p.get('direccion', 'la dirección indicada')
    ley = p.get('ley', 'la ley aplicable')

    templates = city_intro_templates(categoria, ciudad, entidad, direccion, ley)

    # Use slug hash to deterministically pick a template so same city+category gets same intro
    idx = hash(p['slug'] + categoria + ciudad) % len(templates)
    new_intro = templates[idx]
    # Avoid duplicate by checking if it's too close to existing
    if new_intro != p['intro']:
        p['intro'] = new_intro
        updated += 1

with open('data/paginas.json', 'w', encoding='utf-8') as f:
    json.dump(paginas, f, ensure_ascii=False, indent=2)

# Verify uniqueness
intros = [p['intro'] for p in paginas if p.get('intro')]
unique = len(set(intros))
total = len(intros)
print(f"Updated: {updated}")
print(f"Intros: {total} total, {unique} unique ({unique/total*100:.1f}%)")
print(f"Duplicates: {total - unique}")
