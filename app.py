import os
import re
import subprocess
import time
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
# Configuración de la aplicación
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MINIZINC_MODEL_PATH'] = os.path.join('minizinc', 'minext.mzn')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Límite de 16MB

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


# --- FUNCIONES DE PARSEO Y MANEJO DE DATOS ---

def parse_input_file_to_dict(filepath):
    """Parsea el archivo de texto de entrada y lo convierte en un diccionario."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f.read().splitlines() if line.strip()]

        data = {}
        data['n'] = int(lines[0])
        data['m'] = int(lines[1])
        data['p'] = [int(x.strip()) for x in lines[2].split(',')]
        data['ext'] = [float(x.strip()) for x in lines[3].split(',')]
        data['ce'] = [float(x.strip()) for x in lines[4].split(',')]
        
        m = data['m']
        costos_desplazamiento = []
        for i in range(m):
            costos_desplazamiento.append([float(x.strip()) for x in lines[5 + i].split(',')])
        data['c'] = costos_desplazamiento

        data['ct'] = float(lines[5 + m])
        data['maxM'] = int(lines[6 + m])
        
        if len(data['p']) != m or len(data['ext']) != m or len(data['ce']) != m or len(data['c']) != m:
            return {'error': 'La dimensión de los vectores o la matriz de costos no coincide con "m".'}
        
        return data
    except (IOError, IndexError, ValueError) as e:
        return {'error': f"Error al parsear el archivo: {e}"}

def create_dzn_from_data(data):
    """Genera el contenido para el archivo .dzn a partir de los datos."""
    try:
        m = int(data['m'])
        costos_flat = [float(item) for sublist in data['c'] for item in sublist]
        dzn_content = (
            f"n = {int(data['n'])};\nm = {m};\np = {[int(x) for x in data['p']]};\n"
            f"ext = {[float(x) for x in data['ext']]};\nce = {[float(x) for x in data['ce']]};\n"
            f"c = array2d(1..{m}, 1..{m}, {costos_flat});\n"
            f"ct = {float(data['ct'])};\nmaxM = {int(data['maxM'])};"
        )
        return dzn_content
    except (ValueError, TypeError) as e:
        return {'error': f'Error en el formato de los datos de entrada: {e}'}


def parse_minizinc_output(output, num_opiniones):
    """Parsea la salida del comando de MiniZinc."""
    try:
        if "unsatisfiable" in output.lower() or "insatisfactible" in output.lower():
            return {'status': 'INSATISFACTIBLE', 'raw_output': output}

        results = {'raw_output': output, 'status': 'SOLUCIÓN ENCONTRADA'}
        
        results['initial_extremism'] = float(re.search(r"extremismo inicial:\s*([\d.-]+)", output, re.IGNORECASE).group(1))
        results['final_extremism'] = float(re.search(r"extremismo final:\s*([\d.-]+)", output, re.IGNORECASE).group(1))
        results['total_moves'] = float(re.search(r"Movimientos Totales:\s*([\d.-]+)", output, re.IGNORECASE).group(1))
        results['total_cost'] = float(re.search(r"Costo total:\s*([\d.-]+)", output, re.IGNORECASE).group(1))
        
        dist_final_str = re.search(r"Distribución final de personas por opinión:\s*\[([^\]]+)\]", output, re.IGNORECASE).group(1)
        results['final_distribution'] = [int(n.strip()) for n in dist_final_str.split(',')]
        
        mov_realizados_str = re.search(r"Movimientos realizados:\s*\[([^\]]+)\]", output, re.S | re.IGNORECASE).group(1)
        m_list = [int(n.strip()) for n in mov_realizados_str.replace('\\n', '').split(',') if n.strip()]
        results['movements_matrix'] = [m_list[i:i + num_opiniones] for i in range(0, len(m_list), num_opiniones)]
        
        return results
    except (AttributeError, ValueError, IndexError):
        return {'error': 'No se pudo parsear la salida de MiniZinc.', 'raw_output': output}

# --- RUTAS DE LA APLICACIÓN ---

@app.route('/')
def main_page():
    """Renderiza la página principal."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Recibe un archivo, lo parsea y devuelve los datos."""
    if 'file' not in request.files or not request.files['file'].filename:
        return jsonify({'error': 'No se seleccionó ningún archivo.'}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        file.save(filepath)
        data = parse_input_file_to_dict(filepath)
        if 'error' in data:
            return jsonify(data), 400
        
        data['filename'] = filename
        return jsonify(data)
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route('/solve', methods=['POST'])
def solve_instance():
    """Ejecuta MiniZinc y mide el tiempo de ejecución."""
    input_data = request.get_json()
    if not input_data:
        return jsonify({'error': 'No se recibieron datos para resolver.'}), 400

    dzn_content = create_dzn_from_data(input_data)
    if isinstance(dzn_content, dict) and 'error' in dzn_content:
        return jsonify(dzn_content), 400

    dzn_filename = f"data_{os.urandom(8).hex()}.dzn"
    dzn_path = os.path.join(app.config['UPLOAD_FOLDER'], dzn_filename)
    
    with open(dzn_path, 'w') as f:
        f.write(dzn_content)
    
    command = ["minizinc", "--solver", "CoinBC", app.config['MINIZINC_MODEL_PATH'], dzn_path]
    
    start_time = time.time()
    try:
        process = subprocess.run(
            command, capture_output=True, text=True, encoding='utf-8', timeout=430, check=False
        )
        
        execution_time = time.time() - start_time
        
        num_opiniones = int(input_data.get('m', 0))
        results = parse_minizinc_output(process.stdout or process.stderr, num_opiniones)
        
        if 'error' not in results:
            results['execution_time'] = execution_time
            
        return jsonify(results)
        
    except subprocess.TimeoutExpired:
        execution_time = time.time() - start_time
        return jsonify({'error': 'La ejecución ha excedido el tiempo límite.', 'raw_output': f'Timeout after {execution_time:.2f} seconds'}), 500
    except Exception as e:
        return jsonify({'error': f'Ocurrió un error inesperado en el servidor: {e}'}), 500
    finally:
        if os.path.exists(dzn_path):
            os.remove(dzn_path)


if __name__ == '__main__':
    app.run(debug=True)