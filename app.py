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
        
        return data
    except (IOError, IndexError, ValueError) as e:
        return {'error': f"Error al parsear el archivo: {e}"}

def create_dzn_from_data(data):
    """Genera el contenido para el archivo .dzn a partir de los datos."""
    costos_flat = [item for sublist in data['c'] for item in sublist]
    dzn_content = (
        f"n = {data['n']};\nm = {data['m']};\np = {data['p']};\n"
        f"ext = {data['ext']};\nce = {data['ce']};\n"
        f"c = array2d(1..{data['m']}, 1..{data['m']}, {costos_flat});\n"
        f"ct = {data['ct']};\nmaxM = {data['maxM']};"
    )
    return dzn_content

def parse_minizinc_output(output, num_opiniones):
    """Parsea la salida del comando de MiniZinc."""
    try:
        if "unsatisfiable" in output.lower() or "insatisfactible" in output.lower():
            return {'status': 'INSATISFACTIBLE', 'raw_output': output}

        results = {'raw_output': output, 'status': 'SOLUCIÓN ENCONTRADA'}
        
        results['initial_extremism'] = float(re.search(r"Extremismo inicial:\s*([\d.]+)", output, re.IGNORECASE).group(1))
        results['final_extremism'] = float(re.search(r"Extremismo final:\s*([\d.]+)", output, re.IGNORECASE).group(1))
        results['total_moves'] = float(re.search(r"Movimientos Totales:\s*([\d.]+)", output, re.IGNORECASE).group(1))
        results['total_cost'] = float(re.search(r"Costo total:\s*([\d.]+)", output, re.IGNORECASE).group(1))
        
        dist_final_str = re.search(r"Distribución final de personas por opinión:\s*\[([^\]]+)\]", output, re.IGNORECASE).group(1)
        results['final_distribution'] = [int(n.strip()) for n in dist_final_str.split(',')]
        
        mov_realizados_str = re.search(r"Movimientos realizados:\s*\[([^\]]+)\]", output, re.S | re.IGNORECASE).group(1)
        m_list = [int(n.strip()) for n in mov_realizados_str.replace('\n', '').split(',') if n.strip()]
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
    """Recibe un archivo, lo parsea y devuelve los datos de entrada en formato JSON."""
    if 'file' not in request.files or not request.files['file'].filename:
        return jsonify({'error': 'No se seleccionó ningún archivo.'}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    data = parse_input_file_to_dict(filepath)
    if 'error' in data:
        os.remove(filepath)
        return jsonify(data), 400

    # Cambiamos 'ext' a 'ext' para que coincida con el script del frontend
    data['ext'] = data.pop('ext')
    data['filename'] = filename
    return jsonify(data)

@app.route('/solve', methods=['POST'])
def solve_instance():
    """Ejecuta MiniZinc con los datos de un archivo previamente subido."""
    json_data = request.get_json()
    if not json_data or 'filename' not in json_data:
        return jsonify({'error': 'Falta el nombre del archivo.'}), 400

    filename = secure_filename(json_data['filename'])
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(filepath):
        return jsonify({'error': 'El archivo de instancia no existe en el servidor.'}), 404

    input_data = parse_input_file_to_dict(filepath)
    if 'error' in input_data:
        return jsonify(input_data), 400

    dzn_content = create_dzn_from_data(input_data)
    dzn_path = os.path.join(app.config['UPLOAD_FOLDER'], 'data.dzn')
    with open(dzn_path, 'w') as f:
        f.write(dzn_content)
    
    command = ["minizinc", "--solver", "CoinBC", app.config['MINIZINC_MODEL_PATH'], dzn_path]
    try:
        start_time = time.time()
        process = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', timeout=430, check=False)
        end_time = time.time()

        execution_time = end_time - start_time

        results = parse_minizinc_output(process.stdout or process.stderr, input_data['m'])
        results['execution_time'] = execution_time

        return jsonify(results)
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'La ejecución ha excedido el tiempo límite.', 'raw_output': 'Timeout'}), 500
    finally:
        if os.path.exists(filepath): os.remove(filepath)
        if os.path.exists(dzn_path): os.remove(dzn_path)

if __name__ == '__main__':
    app.run(debug=True)