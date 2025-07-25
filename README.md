
# ProyectoIIADAII - MinExt Solver

Una aplicación web construida con Flask para cargar, visualizar y resolver instancias del problema **"MinExt"**.

---

## 📁 Descripción de Archivos y Directorios

- **README**:  
  Este archivo. Contiene la descripción del proyecto y las instrucciones para ejecutar la aplicación.

- **Informe.pdf**:  
  Documento final del proyecto que detalla el problema, el modelo de optimización, el análisis de resultados y las conclusiones. Incluye el enlace al video de sustentación.

- **Informe/**:  
  Código fuente en LaTeX para generar el `Informe.pdf`.

- **Proyecto.mzn**:  
  Implementación del modelo de optimización en MiniZinc.

- **DatosProyecto/**:  
  Conjunto de instancias de prueba utilizadas para validar el modelo.

- **MisInstancias/**:  
  5 instancias retadoras diseñadas por el equipo para probar la escalabilidad de otras soluciones.

- **ProyectoGUIFuentes/**:  
  Contiene todos los archivos fuente de la interfaz gráfica (GUI).

---

## 🎥 Video de Sustentación

[Ver en Google Drive](https://drive.google.com/file/d/1n1nj8be4HFs8x6auUjzf9EMFuxjoCUNe/view?usp=sharing)

---

## ⚙️ Instalación y Ejecución

> Todos los comandos deben ejecutarse desde la carpeta `ProyectoGUIFuentes`.

### 🔧 Requisitos Previos

1. Python 3
2. pip (incluido usualmente con Python)
3. MiniZinc  
   Asegúrate de tenerlo instalado y añadido al **PATH** del sistema.  
   [Descargar desde minizinc.org](https://www.minizinc.org/software.html)

---

### 🚀 Pasos para la Ejecución

1. Navega al directorio de la GUI:

```bash
cd ProyectoGUIFuentes
```

2. (Recomendado) Crea y activa un entorno virtual:

**En macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

**En Windows:**

```bash
python -m venv venv
.env\Scriptsctivate
```

3. Instala las dependencias:

```bash
pip install -r requirements.txt
```

4. Ejecuta la aplicación Flask:

```bash
flask run
```

O también:

```bash
python app.py
```

5. Abre tu navegador y ve a:

```
http://127.0.0.1:5000
```

---

## 🧭 Uso de la Aplicación

1. Abre `http://127.0.0.1:5000` en tu navegador.
2. Usa el botón **"Seleccionar un archivo .txt..."** para cargar una instancia desde `DatosProyecto/` o `MisInstancias/`.
3. La pestaña **"Entrada"** mostrará los datos de la instancia cargada.
4. Haz clic en el botón **"Resolver"** para iniciar el cálculo.
5. La solución se mostrará en las pestañas **"Resultados"** y **"Salida Raw"**.
6. También se pueden crear instancias desde la interfaz haciendo clic en **"Crear Nueva Instancia"**.

---
