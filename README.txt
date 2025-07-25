==================================================
        PROYECTO MINEXT SOLVER
==================================================

DESCRIPCIÓN DE ARCHIVOS Y DIRECTORIOS
-------------------------------------

* Readme.txt / README.md:
  Este archivo. Contiene la descripción de todos los archivos del proyecto y las instrucciones para ejecutar la aplicación.

* Informe.pdf:
  Documento final del proyecto que detalla el problema, el modelo de optimización, el análisis de resultados y las conclusiones. Incluye el enlace al video de sustentación.

*Informe/
  Código fuente del Informe.pdf en latex

* Proyecto.mzn:
  Implementación del modelo de optimización en el lenguaje MiniZinc.

* DatosProyecto/:
  Directorio que contiene el conjunto de instancias de prueba utilizadas para probar el modelo.

* MisInstancias/:
  Directorio con 5 instancias retadoras diseñadas por el equipo para probar la escalabilidad de otras soluciones.

* ProyectoGUIFuentes/:
  Contiene todos los archivos fuente de la interfaz gráfica (GUI).



==================================================
        VIDEO DE SUSTENTACIÓN
==================================================

https://drive.google.com/file/d/1n1nj8be4HFs8x6auUjzf9EMFuxjoCUNe/view?usp=sharing



==================================================
        INSTALACIÓN Y EJECUCIÓN
==================================================

Todos los comandos se deben ejecutar desde la carpeta ProyectoGUIFuentes.

REQUISITOS PREVIOS
------------------
1. Python 3: Asegúrate de tenerlo instalado.
2. pip: generalmente se instala junto con Python
2. MiniZinc: Es fundamental tener MiniZinc instalado y añadido al PATH del sistema. (https://www.minizinc.org/software.html).


PASOS PARA LA EJECUCIÓN
-----------------------
1. Navega al directorio de la GUI. En tu terminal, ejecuta:
   cd ProyectoGUIFuentes

2. (Recomendado) Crea y activa un entorno virtual dentro de esta carpeta:
   - En macOS/Linux:
     python3 -m venv venv
     source venv/bin/activate
   - En Windows:
     python -m venv venv
     .\venv\Scripts\activate

3. Instala las dependencias desde el archivo requirements.txt:
   pip install -r requirements.txt

4. Ejecuta la aplicación Flask:
   flask run
   o también:
   python app.py

5. Abre tu navegador y ve a: http://127.0.0.1:5000


==================================================
        USO DE LA APLICACIÓN
==================================================

1. Abre la URL en tu navegador.
2. Usa el botón "Seleccionar un archivo .txt..." para cargar una instancia.
3. Los datos de la instancia cargada se mostrarán en la pestaña "Entrada".
4. Presiona el botón "Resolver" para iniciar el cálculo.
5. Los resultados aparecerán en las pestañas "Resultados" y "Salida Raw".
6. También se pueden crear instancias desde la interfaz haciendo clic en "Crear Nueva Instancia".