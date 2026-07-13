#!/usr/bin/env python3
"""Script para generar nuevas páginas de alto valor comercial"""
import json
import os
import random

random.seed(42)

CITIES = [
    'Antofagasta', 'Arica', 'Calama', 'Cerro Navia', 'Chillán', 'Colina',
    'Concepción', 'Copiapó', 'Coquimbo', 'Curicó', 'El Bosque',
    'Estación Central', 'Independencia', 'Iquique', 'La Florida', 'La Serena',
    'Lampa', 'Las Condes', 'Lo Barnechea', 'Los Ángeles', 'Maipú', 'Osorno',
    'Padre Las Casas', 'Peñalolén', 'Providencia', 'Pudahuel', 'Puente Alto',
    'Puerto Montt', 'Punta Arenas', 'Quilicura', 'Quilpué', 'Quinta Normal',
    'Rancagua', 'Recoleta', 'Renca', 'San Antonio', 'San Bernardo', 'San Miguel',
    'Santiago', 'Santiago Centro', 'Talca', 'Talcahuano', 'Temuco', 'Valdivia',
    'Valparaíso', 'Vitacura', 'Viña del Mar', 'Ñuñoa'
]

def slugify(text):
    reps = {'á':'a','é':'e','í':'i','ó':'o','ú':'u','Á':'a','É':'e','Í':'i','Ó':'o','Ú':'u','ñ':'n','Ñ':'n','ü':'u',' ':'-',',':'','.':'','(':'',')':'','/':'-'}
    result = text.lower()
    for old, new in reps.items():
        result = result.replace(old, new)
    result = ''.join(c for c in result if c.isalnum() or c == '-')
    return '-'.join(filter(None, result.split('-')))

# Datos de entidades
TRIBUNALES = {c: {'entidad': f'Juzgado de Letras de {c}', 'direccion': f'{c}'} for c in CITIES}
TRIBUNALES['Santiago'] = {'entidad': 'Juzgado de Letras en lo Civil de Santiago', 'direccion': 'Huérfanos 1409, Santiago Centro'}
TRIBUNALES['Santiago Centro'] = {'entidad': 'Juzgado de Letras en lo Civil de Santiago Centro', 'direccion': 'Huérfanos 1409, Santiago Centro'}

INSPECCION = {c: {'entidad': f'Inspección del Trabajo de {c}', 'direccion': f'{c}'} for c in CITIES}
REGISTRO_CIVIL = {c: {'entidad': f'Registro Civil de {c}', 'direccion': f'{c}'} for c in CITIES}

NEW_CATEGORIES = [
    {
        'categoria': 'Ley Karin',
        'slug_base': 'ley-karin',
        'ley': 'Ley 21.643 — Prevención, investigación y sanción del acoso laboral, sexual y violencia en el trabajo',
        'plazo': '60 días hábiles desde el hecho para denunciar ante la Inspección del Trabajo',
        'entidad_base': 'Inspección del Trabajo',
        'direccion_base': 'Inspección del Trabajo',
        'hub_intro': 'La Ley Karin (Ley 21.643) entró en vigencia el 1 de agosto de 2024 y modificó el Código del Trabajo para fortalecer la prevención, investigación y sanción del acoso laboral, acoso sexual y violencia en el trabajo. Esta ley obliga a todas las empresas a implementar un protocolo de prevención, investigar las denuncias en un plazo máximo de 30 días y aplicar sanciones que pueden incluir el despido del agresor. LegalHelp te genera la denuncia lista para presentar ante la Inspección del Trabajo.',
        'hub_desc': 'Guía completa sobre la Ley Karin en Chile (Ley 21.643). Prevención del acoso laboral, acoso sexual y violencia en el trabajo. Cómo denunciar ante la Inspección del Trabajo. Protocolo obligatorio para empresas.',
        'entidades': INSPECCION,
        'intro_templates': [
            lambda c, e, d: f'En {c}, la denuncia por acoso laboral bajo la Ley Karin se presenta ante {e}, ubicada en {d}. La Ley 21.643 exige que todas las empresas implementen un protocolo de prevención del acoso sexual y laboral. LegalHelp te genera la denuncia lista para presentar en minutos.',
            lambda c, e, d: f'Si sufres acoso laboral en {c}, la Ley Karin (Ley 21.643) te protege. La denuncia debe presentarse ante {e} en {d}. El plazo es de 60 días hábiles desde el hecho. LegalHelp te prepara el documento listo para presentar.',
            lambda c, e, d: f'La Ley Karin (Ley 21.643) ya está vigente en Chile. En {c}, las denuncias por acoso laboral y sexual se presentan ante {e} ({d}). No dejes pasar el plazo de 60 días hábiles. LegalHelp te genera el escrito en minutos.',
        ]
    },
    {
        'categoria': 'Pagaré',
        'slug_base': 'pagare',
        'ley': 'Arts. 707 y siguientes del Código de Comercio — Pagaré a la orden',
        'plazo': '3 años para acción ejecutiva desde el vencimiento',
        'entidad_base': 'Juzgado de Letras en lo Civil',
        'direccion_base': 'Juzgado Civil',
        'hub_intro': 'El pagaré es un título de crédito que contiene la promesa incondicional de pagar una suma determinada de dinero en una fecha específica. Es uno de los instrumentos financieros más utilizados en Chile para préstamos entre particulares, garantizar deudas y operaciones comerciales. Su principal ventaja es que, si no se paga, permite iniciar un juicio ejecutivo sin necesidad de un juicio declarativo previo. LegalHelp te genera tu pagaré listo para firmar.',
        'hub_desc': 'Guía completa sobre el pagaré en Chile. Cómo redactarlo, requisitos legales, plazos de prescripción y acción ejecutiva. Descarga tu pagaré listo para firmar en minutos.',
        'entidades': TRIBUNALES,
        'intro_templates': [
            lambda c, e, d: f'En {c}, el pagaré es el documento ideal para formalizar préstamos entre particulares. Si necesitas cobrar un pagaré impago, debes presentarlo ante {e} en {d}. El plazo de prescripción es de 3 años. LegalHelp te genera tu pagaré listo para firmar.',
            lambda c, e, d: f'¿Necesitas un pagaré en {c}? Este título de crédito te permite formalizar préstamos y cobrar judicialmente si no te pagan. El trámite ejecutivo se realiza ante {e} ({d}). LegalHelp te genera el documento en minutos.',
            lambda c, e, d: f'El pagaré es el instrumento financiero más usado en {c} para préstamos entre personas. Con fuerza ejecutiva, permite cobrar la deuda ante {e} en {d} sin juicio declarativo. LegalHelp te lo genera listo para firmar.',
        ]
    },
    {
        'categoria': 'Posesión efectiva',
        'slug_base': 'posesion-efectiva',
        'ley': 'Ley 19.903 y Arts. 876 y siguientes del Código de Procedimiento Civil',
        'plazo': 'No tiene plazo legal, pero se recomienda tramitarla dentro de los 2 años desde el fallecimiento',
        'entidad_base': 'Registro Civil e Identificación',
        'direccion_base': 'Registro Civil',
        'hub_intro': 'La posesión efectiva es el trámite que acredita legalmente quiénes son los herederos de una persona fallecida y permite disponer de sus bienes. Sin la posesión efectiva, los herederos no pueden vender propiedades, retirar dinero de cuentas bancarias ni realizar ningún trámite sobre los bienes del fallecido. Se tramita ante el Registro Civil (para herencias sin testamento) o ante el tribunal (para herencias con testamento). LegalHelp te guía en todo el proceso.',
        'hub_desc': 'Guía completa sobre la posesión efectiva en Chile. Cómo tramitarla ante el Registro Civil, requisitos, plazos y documentos necesarios. Hereda sin complicaciones.',
        'entidades': REGISTRO_CIVIL,
        'intro_templates': [
            lambda c, e, d: f'En {c}, la posesión efectiva se tramita ante {e} ubicada en {d}. Este trámite es necesario para heredar los bienes de una persona fallecida. Sin ella, no puedes vender propiedades ni retirar dinero del banco. LegalHelp te guía en el proceso.',
            lambda c, e, d: f'¿Necesitas tramitar la posesión efectiva en {c}? Debes hacerlo ante {e} en {d}. El trámite es gratuito si no hay testamento. LegalHelp te prepara todos los documentos necesarios para heredar sin complicaciones.',
            lambda c, e, d: f'La posesión efectiva en {c} se solicita ante {e} ({d}). Este trámite acredita quiénes son los herederos legales y permite disponer de los bienes del fallecido. LegalHelp te ayuda con toda la documentación.',
        ]
    },
    {
        'categoria': 'Contrato de mutuo',
        'slug_base': 'contrato-de-mutuo',
        'ley': 'Arts. 2196 y siguientes del Código Civil — Contrato de mutuo o préstamo de consumo',
        'plazo': 'El pactado entre las partes; por defecto, 30 días desde la exigibilidad',
        'entidad_base': 'Aplicable en toda Chile',
        'direccion_base': 'Varía según domicilio de las partes',
        'hub_intro': 'El contrato de mutuo (o préstamo de consumo) es el acuerdo mediante el cual una parte entrega a otra una cantidad de dinero u otros bienes fungibles, con la obligación de devolver otros tantos de la misma especie y calidad. Es el contrato ideal para préstamos entre particulares, familiares o conocidos, ya que establece claramente las condiciones del préstamo: monto, plazo, intereses y forma de pago. LegalHelp te genera tu contrato de mutuo listo para firmar.',
        'hub_desc': 'Guía completa sobre el contrato de mutuo en Chile. Préstamo entre particulares, requisitos legales, intereses permitidos. Descarga tu contrato listo para firmar.',
        'entidades': TRIBUNALES,
        'intro_templates': [
            lambda c, e, d: f'En {c}, el contrato de mutuo es la mejor forma de formalizar un préstamo entre particulares. Establece el monto, plazo, intereses y forma de pago. Si no se paga, puedes demandar ante {e} en {d}. LegalHelp te genera el contrato listo para firmar.',
            lambda c, e, d: f'¿Vas a prestar dinero en {c}? El contrato de mutuo te protege legalmente. Establece todas las condiciones del préstamo y, si es necesario, permite el cobro judicial ante {e} ({d}). LegalHelp te genera el documento en minutos.',
            lambda c, e, d: f'El contrato de mutuo es ideal para préstamos entre familiares y conocidos en {c}. Con notarización, tiene fuerza ejecutiva ante {e} en {d}. LegalHelp te prepara el contrato con todas las cláusulas necesarias.',
        ]
    },
]

def main():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'paginas.json')
    data_path = os.path.normpath(data_path)
    
    with open(data_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    print(f'Páginas existentes: {len(existing)}')
    
    existing_slugs = {p['slug'] for p in existing}
    new_pages = []
    
    for cat in NEW_CATEGORIES:
        categoria = cat['categoria']
        slug_base = cat['slug_base']
        ley = cat['ley']
        plazo = cat['plazo']
        entidades = cat['entidades']
        templates = cat['intro_templates']
        
        # Hub page
        hub = {
            'slug': slug_base,
            'categoria': categoria,
            'variable': None,
            'ley': ley,
            'plazo': plazo,
            'entidad': cat['entidad_base'],
            'direccion': cat['direccion_base'],
            'intro': cat['hub_intro']
        }
        if hub['slug'] not in existing_slugs:
            new_pages.append(hub)
        
        # City pages
        for ciudad in CITIES:
            ciudad_slug = slugify(ciudad)
            slug = f'{slug_base}-{ciudad_slug}'
            
            if slug in existing_slugs:
                continue
            
            entidad_info = entidades.get(ciudad, {'entidad': cat['entidad_base'], 'direccion': cat['direccion_base']})
            entidad = entidad_info['entidad']
            direccion = entidad_info['direccion']
            
            intro = random.choice(templates)(ciudad, entidad, direccion)
            
            page = {
                'slug': slug,
                'categoria': categoria,
                'variable': ciudad,
                'ley': ley,
                'plazo': plazo,
                'entidad': entidad,
                'direccion': direccion,
                'intro': intro
            }
            new_pages.append(page)
    
    print(f'Nuevas páginas a agregar: {len(new_pages)}')
    
    # Agregar y guardar
    existing.extend(new_pages)
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    
    print(f'✅ Total páginas después: {len(existing)}')
    for cat in NEW_CATEGORIES:
        count = sum(1 for p in new_pages if p['categoria'] == cat['categoria'])
        print(f'   - {cat["categoria"]}: {count} páginas')

if __name__ == '__main__':
    main()
