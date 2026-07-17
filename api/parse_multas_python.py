from flask import Flask, request, jsonify
import pdfplumber
import re
import io
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import os

app = Flask(__name__)

@app.route('/api/parse_multas_python', methods=['POST'])
def parse_multas():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    
    # Datos desde el formdata (opcionales, los re-extraeremos)
    patente = request.form.get('patente', '')
    rutSolicitante = request.form.get('rutSolicitante', '')
    nombreSolicitante = request.form.get('nombreSolicitante', '')
    
    try:
        filename = file.filename.lower()
        file_bytes = file.read()
        full_text = ""
        
        if filename.endswith('.html') or filename.endswith('.htm'):
            # Parse HTML
            soup = BeautifulSoup(file_bytes, 'html.parser')
            # Extract text preserving some line breaks
            full_text = soup.get_text(separator='\n')
        else:
            # Load PDF using pdfplumber
            pdf = pdfplumber.open(io.BytesIO(file_bytes))
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
                    
        # Parse data out of the full text
        lines = [line.strip() for line in full_text.split('\n') if line.strip()]
        
        # We need to compute 3 years ago (approx 1095 days)
        three_years_ago = datetime.now() - timedelta(days=1095)
        
        multas = []
        current_multa = {}
        global_patente = patente
        
        def check_and_push(m):
            if not m.get('fechaAnotacion'):
                return
            try:
                # Parse date format DD/MM/YYYY
                fecha = datetime.strptime(m['fechaAnotacion'], '%d/%m/%Y')
                # Check if it's strictly older than 3 years
                if fecha >= three_years_ago:
                    return
            except ValueError:
                return
            
            multas.append({
                "id": m.get('id', 'Desconocido'),
                "fechaInfraccion": m.get('fechaInfraccion', m.get('fechaAnotacion')),
                "fechaAnotacion": m.get('fechaAnotacion'),
                "rol": m.get('rol', 'Por determinar'),
                "comuna": m.get('comuna', 'Sin juzgado detectado'),
                "patente": global_patente or '',
            })
            
        for line in lines:
            if not global_patente:
                pat_match = re.search(r'PATENTE\s*UNICA\s*:\s*([A-Z0-9\-]+)', line, re.IGNORECASE)
                if pat_match:
                    global_patente = pat_match.group(1).replace(' ', '').replace('-', '')
                    
            if 'ID MULTA' in line or 'ID_MULTA' in line:
                if current_multa.get('fechaAnotacion'):
                    check_and_push(current_multa)
                current_multa = {}
                id_match = re.search(r'(?:ID MULTA|ID_MULTA)\s*:\s*(\d+)', line, re.IGNORECASE)
                if id_match:
                    current_multa['id'] = id_match.group(1)
                    
            comuna_match = re.search(r'((?:\d+°?\s*)?(?:JPL|JUZGADO(?:\s+DE)?(?:\s+POLICÍA\s+LOCAL)?(?:\s+DE)?)\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)', line, re.IGNORECASE)
            if not comuna_match:
                comuna_match = re.search(r'((?:\d+°?\s*)?POLICIA LOCAL(?: DE)?\s+[A-Z\s]+)', line, re.IGNORECASE)
            
            if comuna_match:
                # Normalizar: "1 JUZGADO DE POLICIA LOCAL DE SANTIAGO" -> "1° JUZGADO DE POLICIA LOCAL DE SANTIAGO"
                raw_tribunal = comuna_match.group(1).strip()
                # Si empieza con un número seguido de espacio (ej. "1 JUZGADO"), añadir el símbolo de grado
                raw_tribunal = re.sub(r'^(\d+)\s+', r'\1° ', raw_tribunal)
                current_multa['comuna'] = raw_tribunal.upper()
                
            rol_match = re.search(r'ROL\s*:\s*([A-Z0-9\-]+)', line, re.IGNORECASE)
            if not rol_match:
                rol_match = re.search(r'\bROL\b\s+([A-Z0-9\-]+)', line, re.IGNORECASE)
            if rol_match:
                current_multa['rol'] = rol_match.group(1).strip()
                
            fecha_match = re.search(r'FECHA INFRACCION\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})', line, re.IGNORECASE)
            if fecha_match:
                current_multa['fechaInfraccion'] = fecha_match.group(1).replace('-', '/')
                
            fecha_ano_match = re.search(r'FECHA INGRESO RMNP\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})', line, re.IGNORECASE)
            if fecha_ano_match:
                current_multa['fechaAnotacion'] = fecha_ano_match.group(1).replace('-', '/')
                
        # Push the last one
        if current_multa.get('fechaAnotacion'):
            check_and_push(current_multa)
            
        # Extract owner details
        nombre_extracted = nombreSolicitante
        run_extracted = rutSolicitante
        
        nombre_match = re.search(r'Nombre\s*:\s*(.+)', full_text, re.IGNORECASE)
        if nombre_match:
            nombre_extracted = nombre_match.group(1).strip()
            
        run_match = re.search(r'R\.U\.N\.\s*:\s*([0-9\.\-kK]+)', full_text, re.IGNORECASE)
        if run_match:
            run_extracted = run_match.group(1).strip()
            
        # Group by comuna
        grouped = {}
        for m in multas:
            c = m['comuna']
            if c not in grouped:
                grouped[c] = []
            grouped[c].append(m)
            
        multas_por_tribunal = {}
        comunas_con_correo = []
        for tribunal, lista in grouped.items():
            multas_por_tribunal[tribunal] = [{
                "id": m['id'],
                "fecha_ingreso": m['fechaAnotacion'],
                "rol": m['rol']
            } for m in lista]
            
            # Retro-compatibilidad
            comunas_con_correo.append({
                "nombre": tribunal,
                "correo": f"jpl@{tribunal.lower().replace(' ', '')}.cl",
                "multas": lista
            })
            
        total_cobro = 0 if not grouped else 10000 + max(0, len(grouped) - 1) * 4000
        
        return jsonify({
            "ok": True,
            "cliente": {
                "nombre": nombre_extracted,
                "run": run_extracted,
                "patente": global_patente or patente
            },
            "multas_por_tribunal": multas_por_tribunal,
            "totalMultas": len(multas),
            "comunas": comunas_con_correo,
            "cobro": total_cobro
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate_template', methods=['POST'])
def generate_template():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'ok': False, 'error': 'No JSON payload provided'}), 400
            
        template_id = data.get('template_id')
        variables = data.get('variables', {})
        
        if not template_id:
            return jsonify({'ok': False, 'error': 'template_id is required'}), 400
            
        # Determine the base path (Vercel serverless function root is usually the project root)
        # plantillas/ is at the root of the repo.
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        template_path = os.path.join(base_dir, 'plantillas', f"{template_id}.txt")
        
        if not os.path.exists(template_path):
            # Fallback to current dir if running locally differently
            template_path = os.path.join(os.getcwd(), 'plantillas', f"{template_id}.txt")
            if not os.path.exists(template_path):
                return jsonify({'ok': False, 'error': f'Plantilla {template_id} no encontrada'}), 404
                
        with open(template_path, 'r', encoding='utf-8') as f:
            template_text = f.read()
            
        # Replace variables deterministically
        # For each key in variables, replace {{KEY}} with the value
        for key, value in variables.items():
            if value is None:
                value = ""
            placeholder = "{{" + str(key) + "}}"
            template_text = template_text.replace(placeholder, str(value))
            
        # Optional: You can also handle remaining unfilled placeholders if needed, 
        # but for now we leave them so the user sees what's missing.
        
        return jsonify({
            'ok': True,
            'documento': template_text,
            'fuente': 'python-deterministic-template'
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5328)
