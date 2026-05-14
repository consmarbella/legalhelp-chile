"""
Genera public/og-image.png (1200x630) para LegalHelp Chile.
Diseño: fondo azul marino, logo-texto a la izquierda, bajada a la derecha,
franja dorada inferior, sello "100% válido en Chile".
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "og-image.png")

W, H = 1200, 630

# ── Paleta ──────────────────────────────────────────────────────────────────
NAVY    = (11, 31, 58)       # #0b1f3a
GOLD    = (201, 168, 76)     # #c9a84c
WHITE   = (255, 255, 255)
LIGHT   = (168, 189, 212)    # #a8bdd4  texto secundario
BG2     = (15, 42, 80)       # panel izquierdo ligeramente más claro

# ── Canvas ──────────────────────────────────────────────────────────────────
img  = Image.new("RGB", (W, H), NAVY)
draw = ImageDraw.Draw(img)

# Panel izquierdo más claro
draw.rectangle([0, 0, 520, H], fill=BG2)

# Franja dorada izquierda (acento)
draw.rectangle([0, 0, 8, H], fill=GOLD)

# Franja dorada inferior
draw.rectangle([0, H - 10, W, H], fill=GOLD)

# ── Fuentes ─────────────────────────────────────────────────────────────────
def font(size, bold=False):
    # Intenta fuentes del sistema; cae a la default si no existe
    candidates_bold = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    candidates_reg = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    candidates = candidates_bold if bold else candidates_reg
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

f_icon   = font(72, bold=True)
f_brand  = font(52, bold=True)
f_tagline= font(22, bold=False)
f_heading= font(44, bold=True)
f_sub    = font(24, bold=False)
f_pill   = font(18, bold=True)
f_footer = font(18, bold=False)

# ── Panel izquierdo — Marca ─────────────────────────────────────────────────
# Icono — rectángulo dorado estilizado como sello
draw.rounded_rectangle([55, 120, 115, 180], radius=8, outline=GOLD, width=4)
draw.text((70, 132), "LEX", font=font(28, bold=True), fill=GOLD)
draw.text((55, 210), "LegalHelp", font=f_brand, fill=WHITE)
draw.text((55, 272), "Chile", font=f_brand, fill=GOLD)

# Tagline
draw.text((55, 345), "Documentos legales con IA", font=f_tagline, fill=LIGHT)
draw.text((55, 375), "Válidos en todo Chile", font=f_tagline, fill=LIGHT)

# Divider
draw.line([(55, 420), (460, 420)], fill=GOLD, width=2)

# Categorías (pills de texto)
categories = [
    "Prescripción TAG",
    "Demanda alimentos",
    "Reclamo SERNAC",
    "Despido injustificado",
]
y_pill = 440
for cat in categories:
    draw.text((55, y_pill), f"• {cat}", font=f_pill, fill=LIGHT)
    y_pill += 32

# ── Panel derecho — Propuesta de valor ─────────────────────────────────────
RX = 560  # x inicio panel derecho

draw.text((RX, 100), "Tu documento legal", font=f_heading, fill=WHITE)
draw.text((RX, 155), "listo en minutos.", font=f_heading, fill=GOLD)

draw.text((RX, 240), "Sin abogados caros.", font=f_sub, fill=LIGHT)
draw.text((RX, 275), "Sin burocracia.", font=f_sub, fill=LIGHT)
draw.text((RX, 310), "Sin salir de casa.", font=f_sub, fill=LIGHT)

# Recuadro CTA
cta_x1, cta_y1, cta_x2, cta_y2 = RX, 370, RX + 460, 430
draw.rounded_rectangle([cta_x1, cta_y1, cta_x2, cta_y2], radius=12, fill=GOLD)
draw.text((RX + 50, cta_y1 + 14), "✓  Redactado por IA · Base legal 2026", font=f_pill, fill=NAVY)

# URL
draw.text((RX, 470), "legalhelp.cl", font=font(28, bold=True), fill=GOLD)

# Sello circular "100% Válido Chile"
cx, cy, r = 1110, 130, 75
draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD)
draw.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=NAVY, width=3)
draw.text((cx - 42, cy - 30), "100%", font=font(22, bold=True), fill=NAVY)
draw.text((cx - 38, cy - 2),  "Válido",  font=font(18, bold=True), fill=NAVY)
draw.text((cx - 30, cy + 18), "Chile",  font=font(16, bold=False), fill=NAVY)

# ── Guardar ─────────────────────────────────────────────────────────────────
img.save(OUT, "PNG", optimize=True)
print(f"OK og-image.png generado -> {OUT}  ({W}x{H})")
