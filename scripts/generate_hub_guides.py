#!/usr/bin/env python3
"""
Generador de guías completas (HUB_GUIDE) para todas las categorías de LegalHelp Chile.
Usa el contenido del BCN (scraped_templates.json) y las leyes (leyes.ts) para crear
contenido SEO rico de 500-800 palabras por categoría.

Output: data/hub_guides.json (importable desde page.tsx)
"""

import json
import os
import re
from typing import Any

# ── Cargar datos ──────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE, "data", "paginas.json"), "r", encoding="utf-8") as f:
    paginas: list[dict[str, Any]] = json.load(f)

with open(os.path.join(BASE, "scripts", "scraped_templates.json"), "r", encoding="utf-8") as f:
    templates: list[dict[str, Any]] = json.load(f)

# ── Categorías únicas ─────────────────────────────────────────────────────────
categorias = sorted(set(p["categoria"] for p in paginas))
print(f"[DATA] {len(categorias)} categorias encontradas")

# ── Template lookup helper ────────────────────────────────────────────────────
def find_template(categoria: str) -> dict[str, Any] | None:
    """Busca un template del BCN que coincida con la categoría."""
    cat_lower = categoria.lower()
    for t in templates:
        titulo = t.get("titulo", "").lower()
        desc = t.get("descripcion", "").lower()
        keywords = [k.lower() for k in t.get("keywords", [])]
        # Coincidencia por palabras clave
        for kw in keywords:
            if kw in cat_lower:
                return t
        # Coincidencia por título
        if any(word in titulo for word in cat_lower.split()):
            return t
    return None

# ── Generar secciones para cada categoría ─────────────────────────────────────
def generate_sections(categoria: str) -> list[dict[str, str]]:
    """Genera 5-8 secciones de contenido para una categoría."""
    template = find_template(categoria)
    articulos = template.get("articulos", []) if template else []
    keywords = template.get("keywords", []) if template else []
    desc = template.get("descripcion", "") if template else ""

    # Obtener datos de ejemplo de paginas.json para esta categoría
    cat_pages = [p for p in paginas if p["categoria"] == categoria]
    sample = cat_pages[0] if cat_pages else {}
    entidad = sample.get("entidad", "")
    ley = sample.get("ley", "")
    plazo = sample.get("plazo", "")

    sections: list[dict[str, str]] = []

    # ── Sección 1: ¿Qué es? ──
    if template:
        q1 = f"¿Qué es {categoria.lower()} en Chile?"
        a1 = f"La {categoria.lower()} es un procedimiento legal establecido en la legislación chilena. {desc}. "
        if articulos:
            a1 += f"Está regulado por {', '.join(articulos[:2])}. "
        a1 += f"Este documento te permite presentar tu solicitud ante {entidad} de manera rápida y profesional."
        sections.append({"heading": q1, "body": a1})
    else:
        sections.append({
            "heading": f"¿Qué es {categoria.lower()} en Chile?",
            "body": f"La {categoria.lower()} es un procedimiento legal contemplado en la legislación chilena. "
                    f"Se presenta ante {entidad} y está sujeto a los plazos y requisitos establecidos por {ley}. "
                    "LegalHelp Chile te ayuda a generar el documento listo para presentar en minutos."
        })

    # ── Sección 2: Base legal ──
    if articulos:
        arts_text = "\n".join(f"• {a}" for a in articulos[:4])
        sections.append({
            "heading": "Base legal aplicable",
            "body": f"Los siguientes artículos y leyes regulan {categoria.lower()} en Chile:\n\n{arts_text}\n\n"
                    f"Es importante conocer estas disposiciones legales para fundamentar correctamente tu solicitud "
                    f"y asegurar que cumple con todos los requisitos formales exigidos por la ley."
        })
    else:
        sections.append({
            "heading": "Base legal aplicable",
            "body": f"La {categoria.lower()} se fundamenta en {ley} y otras disposiciones legales chilenas. "
                    f"El plazo para presentar la solicitud es de {plazo}. "
                    "Es recomendable revisar la normativa vigente antes de presentar el documento."
        })

    # ── Sección 3: Paso a paso ──
    steps = [
        f"1. Reuní los documentos necesarios: cédula de identidad vigente y los antecedentes del caso.",
        f"2. Ingresá a LegalHelp Chile y seleccioná '{categoria}'.",
        f"3. Completá el formulario con tus datos personales y los detalles específicos de tu caso.",
        f"4. Revisá el documento generado y verificá que todos los datos sean correctos.",
        f"5. Presentá el documento ante {entidad} en tu comuna.",
        f"6. Hacé seguimiento del estado de tu solicitud en el tribunal o servicio correspondiente."
    ]
    sections.append({
        "heading": f"Paso a paso: cómo presentar {categoria.lower()}",
        "body": "\n".join(steps)
    })

    # ── Sección 4: Documentos necesarios ──
    docs = [
        "• Cédula de identidad vigente (original y fotocopia)",
        "• Antecedentes del caso (contratos, facturas, notificaciones, etc.)",
        "• Documentos que acrediten los hechos que fundamentan la solicitud",
        "• Comprobante de domicilio (si aplica)",
    ]
    if keywords:
        docs.append(f"• Información relacionada con: {', '.join(keywords[:4])}")
    sections.append({
        "heading": "¿Qué documentos necesitás para presentar la solicitud?",
        "body": "\n".join(docs) + "\n\n"
                "LegalHelp Chile te guía paso a paso para que no te falte ningún documento. "
                "El sistema genera automáticamente el escrito legal con todos los datos que proporcionás."
    })

    # ── Sección 5: Plazos y costos ──
    sections.append({
        "heading": "Plazos y costos del trámite",
        "body": f"El plazo para presentar {categoria.lower()} es de {plazo}. "
                "La presentación ante el tribunal o servicio no tiene costo en la mayoría de los casos. "
                "LegalHelp Chile cobra solo por la generación del documento base, no por el trámite judicial o administrativo. "
                "Si necesitás patrocinio de abogado, podés acudir a las Corporaciones de Asistencia Judicial (CAJ) "
                "gratuitamente si tu ingreso es bajo."
    })

    # ── Sección 6: Preguntas clave ──
    if keywords:
        kw_text = ", ".join(keywords[:6])
        sections.append({
            "heading": f"¿Qué necesitás saber sobre {categoria.lower()}?",
            "body": f"Algunos conceptos clave relacionados con {categoria.lower()} incluyen: {kw_text}. "
                    "Es importante entender cada uno de estos aspectos para presentar una solicitud bien fundamentada. "
                    "Si tenés dudas, el asistente de LegalHelp puede orientarte durante el proceso de generación del documento."
        })

    # ── Sección 7: Información local ──
    cities = [p.get("variable", "") for p in cat_pages if p.get("variable")]
    if cities:
        cities_sample = ", ".join(cities[:8])
        sections.append({
            "heading": f"{categoria} en distintas comunas de Chile",
            "body": f"Este trámite está disponible en las siguientes comunas: {cities_sample} y más. "
                    "Cada comuna tiene su propio tribunal o servicio, pero el procedimiento es el mismo en todo Chile. "
                    "LegalHelp Chile adapta el documento a la comuna donde necesitás presentarlo, "
                    "con los datos específicos del tribunal o servicio correspondiente."
        })

    return sections


# ── Generar todas las guías ───────────────────────────────────────────────────
hub_guides: dict[str, Any] = {}

for cat in categorias:
    sections = generate_sections(cat)
    if sections:
        hub_guides[cat] = {"sections": sections}
        print(f"  [OK] {cat}: {len(sections)} secciones generadas")
    else:
        print(f"  [WARN] {cat}: sin contenido generado")

# ── Guardar ───────────────────────────────────────────────────────────────────
output_path = os.path.join(BASE, "data", "hub_guides.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(hub_guides, f, ensure_ascii=False, indent=2)

print(f"\n[OUTPUT] {len(hub_guides)} guias generadas -> {output_path}")
print(f"[STATS] Total de secciones: {sum(len(g['sections']) for g in hub_guides.values())}")
