# ProyectoIIADAII - MinExt Solver
Desarrollo proyecto 2 De ADA II

Una aplicación web construida con Flask para cargar, visualizar y resolver instancias del problema **"MinExt"**.  
La interfaz permite al usuario:

- Subir un archivo de instancia.
- Ver los datos de entrada de forma gráfica y tabular.
- Obtener una visualización de los resultados de la solución.

---

## 🚀 Requisitos Previos

- Python 3  
- pip (generalmente se instala junto con Python)

---

## ⚙️ Instalación y Configuración

Sigue estos pasos para configurar el proyecto localmente en un entorno virtual (`venv`).

### 1. Crea y Activa el Entorno Virtual (Recomendado)

#### En macOS y Linux:

```bash
# Crear el entorno virtual
python3 -m venv venv

# Activar el entorno
source venv/bin/activate
```

#### En Windows (Command Prompt o PowerShell):

```bash
# Crear el entorno virtual
python -m venv venv

# Activar el entorno
.\env\Scripts\activate
```

Una vez activado, deberías ver `(venv)` al principio de la línea de tu terminal.

### 2. Instala las Dependencias

Instala las librerías necesarias usando `pip`:

```bash
pip install -r requirements.txt
```


### 2. Ejecución
### Opción 1 (recomendada):

```bash
flask run
```

### Opción 2:

```bash
python app.py
```

---



La aplicación estará disponible en tu navegador en la siguiente dirección:

➡️ [http://127.0.0.1:5000](http://127.0.0.1:5000)
➡️ [http://localhost:5000](http://localhost:5000)
---

## 📋 Uso de la Aplicación

1. Abre [http://127.0.0.1:5000](http://127.0.0.1:5000) en tu navegador web.
2. Haz clic en **"Seleccionar un archivo .txt..."** para cargar tu archivo de instancia.
3. Después de cargar el archivo, los datos de entrada se mostrarán automáticamente en la pestaña **"Entrada"**.
4. Presiona el botón azul **"Resolver"** para iniciar el cálculo.
5. La aplicación procesará la solicitud y te redirigirá a la pestaña **"Resultados"** con:
   - Un resumen gráfico.
   - Una tabla con la solución.
   - La salida en crudo del solver estará disponible en la pestaña **"Salida Raw"**.

---