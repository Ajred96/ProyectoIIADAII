% =========================== PARÁMETROS DE ENTRADA ===========================
% Número total de personas en la población
int: n;

% Número de posibles opiniones en la población
int: m;

% Array con el número de personas en cada opinión inicial
array[1..m] of int: p;

% Extremismo de cada opinión
array[1..m] of float: ext;

% Costos extras por mover personas a opiniones sin representantes iniciales
array[1..m] of float: ce;

% Matriz de costos de mover personas entre opiniones i a j
array[1..m, 1..m] of float: c;

% Costo total máximo permitido para los movimientos
float: ct;

% Número máximo de movimientos permitidos
int: maxM;


% =========================== VARIABLES DE DECISIÓN ===========================
% Número de personas que se mueven de opinión i a opinión j
array[1..m, 1..m] of var 0..n: x;

% =========================== OTRAS VARIABLES ===========================
% Costo total calculado a partir de los movimientos y las restricciones de costos extras
var float: costo = sum(i, j in 1..m)(
    c[i, j] * (1 + p[i] / n) * x[i, j] +
    (if p[j] = 0 then ce[j] else 0 endif) * x[i, j]
);

% Total de movimientos realizados
var int: movimientosTotales = sum(i, j in 1..m)(abs(j - i) * x[i, j]);

% Suma total de personas movidas (para verificar restricciones de población)
var int: personaOpinion = sum(i, j in 1..m)(x[i, j]);


% =========================== RESTRICCIONES ===========================
% Restricción: El costo total de los movimientos no debe exceder el máximo permitido
constraint costo <= ct;

% Restricción: El número total de movimientos no debe exceder el máximo permitido
constraint movimientosTotales <= maxM;

% Restricción: No se pueden mover más personas de las que están inicialmente en cada opinión
constraint forall(i in 1..m)(sum(j in 1..m)(x[i, j]) <= p[i]);

% Restricción: No se permiten movimientos dentro de la misma opinión (x[i,i] debe ser 0)
constraint forall(i in 1..m)(x[i, i] = 0);

% Restricción: La cantidad total de personas en la nueva distribución no puede exceder n
constraint personaOpinion <= n;

constraint forall(i, j in 1..m where ext[i] = ext[j])(x[i, j] = 0);

% =========================== RESTRICCIONES DE NO NEGATIVIDAD ===========================
% Asegura que las variables de costo y movimientos totales sean no negativas
constraint costo >= 0;
constraint movimientosTotales >= 0;
constraint forall(i, j in 1..m)(x[i, j] >= 0); % Asegura que todas las decisiones de movimiento sean no negativas


% =========================== DISTRIBUCIÓN FINAL DE OPINIONES ===========================
% Cálculo de la nueva distribución de personas en cada opinión después de los movimientos
array[1..m] of var int: nueva_p = [ p[i] + sum(j in 1..m)(x[j, i]) - sum(j in 1..m)(x[i, j]) | i in 1..m];


% =========================== FUNCIÓN OBJETIVO ===========================
% Calcula el extremismo total como suma ponderada de las diferencias absolutas
var float: extremismo_inicial = sum(i in 1..m)(p[i] * ext[i]);


var float: extremismo = sum(i in 1..m)(nueva_p[i] * ext[i]);


% Objetivo: Minimizar el extremismo total
solve minimize extremismo;

% =========================== SALIDA ===========================
%output [
%    "Distribución final de personas por opinión: ", show(nueva_p), "\n",
%    "extremismo total: ", show(extremismo), "\n",
%    "Movimientos Totales: ", show(movimientosTotales), "\n"
%];

output [
    %if satisfy then
        "Problema satisfactible\n",
        "Distribución inicial de personas por opinión: ", show(p), "\n",
        "extremismo inicial: ", show(extremismo_inicial), "\n",
        "Distribución final de personas por opinión: ", show(nueva_p), "\n",
        "extremismo final: ", show(extremismo), "\n",
        "Movimientos Totales: ", show(movimientosTotales), "\n",
        "Costo total: ", show(costo), "\n",
        "Movimientos realizados: ", show(x), "\n"
    %else
    %    "Problema insatisfactible\n"
    %endif
];

%output [
   % "Distribución final de personas por opinión: ", show(nueva_p), "\n",
   % "Términos de el extremismo: ", show(terminos_extremismo), "\n",
   % "extremismo total: ", show(extremismo), "\n",
   % "Costo: ", show(costo), "\n",
   % "movimientos Totales: ", show(movimientosTotales), "\n",
   % "personaOpinion: ", show(personaOpinion), "\n",
   % "x: ", show(x), "\n",
%];