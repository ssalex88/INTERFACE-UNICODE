🦦 NUTRIA

1. Nombre y misión

NUTRIA es una plataforma de bienestar preventivo para estudiantes universitarios que ayuda a tomar mejores decisiones de alimentación en momentos de alta carga académica.

Su misión es reducir la fricción entre “sé que debería comer mejor” y “no sé qué elegir ahora”, considerando el contexto real del estudiante: tiempo disponible, presupuesto, comidas omitidas, preferencias alimentarias, restricciones declaradas y opciones reales cercanas al campus.

Además, NUTRIA busca apoyar la prevención de riesgos asociados a hábitos alimentarios poco saludables, promoviendo decisiones más consistentes antes de que estos hábitos se vuelvan recurrentes.

2. Problema y enfoque Lean

Problema real

Durante semanas de parciales, entregas y exámenes, muchos estudiantes universitarios toman decisiones de alimentación bajo presión:

salen de una clase y tienen otra en pocos minutos;

se saltan el desayuno o el almuerzo;

cuentan con un presupuesto limitado;

compran lo primero que encuentran por falta de tiempo;

desconocen qué opciones cercanas se ajustan a sus necesidades;

repiten estas decisiones durante varios días sin identificar el patrón.

El problema no es únicamente la falta de información sobre nutrición. El verdadero dolor aparece en el momento de decidir.

Un estudiante puede saber que debería alimentarse mejor, pero si piensa:

“Dormí 4 horas, no almorcé, tengo un parcial en 40 minutos y me quedan S/12.”

una recomendación genérica como “come balanceado” no resuelve su situación.

El estudiante necesita una respuesta rápida, contextual y accionable, adaptada a lo que realmente puede hacer en ese momento.

Restricciones y dietas específicas

El problema es aún mayor para estudiantes que siguen una alimentación más estricta o tienen restricciones declaradas, por ejemplo:

intolerancia a la lactosa;

alimentación vegetariana;

alimentación vegana;

alergias o restricciones alimentarias conocidas;

preferencias específicas de consumo.

En estos casos, no basta con recomendar “algo saludable”: la opción debe ser compatible con el perfil del estudiante, su presupuesto, el tiempo disponible y lo que realmente se vende cerca de su universidad.

NUTRIA busca disminuir el riesgo de que el estudiante elija por descarte, coma cualquier cosa o simplemente omita una comida por no encontrar rápidamente una opción adecuada.

Bienestar preventivo

NUTRIA está orientado a bienestar y prevención, no al diagnóstico.

La plataforma busca ayudar a reducir patrones cotidianos como:

saltarse comidas constantemente;

mantener horarios desordenados de alimentación;

elegir opciones poco compatibles con necesidades declaradas;

repetir malas decisiones durante semanas de alta exigencia.

A largo plazo, mejorar estos hábitos puede contribuir a reducir factores de riesgo relacionados con una alimentación inadecuada.

NUTRIA no diagnostica enfermedades, no interpreta tratamientos médicos y no reemplaza la atención de un profesional de salud.

3. Usuario objetivo

Estudiantes universitarios, especialmente aquellos que:

tienen poco tiempo entre clases;

manejan un presupuesto limitado;

comen dentro o cerca del campus;

atraviesan semanas de parciales o alta carga académica;

presentan preferencias o restricciones alimentarias declaradas;

buscan mejorar sus hábitos sin utilizar sistemas complejos de seguimiento.

4. Enfoque Lean

NUTRIA parte de una hipótesis concreta:

Si reducimos el esfuerzo necesario para decidir qué comer y entregamos recomendaciones basadas en el contexto inmediato del estudiante, podemos ayudarlo a tomar decisiones más consistentes durante semanas académicamente exigentes.

En lugar de construir desde el inicio una plataforma nutricional completa, el MVP valida primero el flujo principal:

Contexto del estudiante + presupuesto + tiempo disponible + perfil alimentario + opciones reales del campus → recomendación contextual.

5. MVP

El MVP está inicialmente orientado a estudiantes de la Universidad de Lima (ULima).

Esta decisión permite validar la solución en un entorno controlado y con información concreta, ya que el proyecto cuenta con un dataset detallado de opciones de comida disponibles alrededor de ULima, que permite relacionar las recomendaciones con establecimientos y alternativas reales.

El estudiante puede:

Registrar rápidamente cómo se encuentra y qué está pasando.

Indicar su presupuesto y tiempo disponible.

Usar su perfil alimentario y restricciones declaradas.

Consultar opciones reales disponibles alrededor de ULima.

Recibir una recomendación contextual.

Entender brevemente por qué esa opción encaja con su situación.

Guardar registros para identificar tendencias simples de comportamiento.

Ejemplo

Entrada del estudiante:

“Dormí 4 horas, no almorcé, tengo parcial en 40 minutos, soy intolerante a la lactosa y me quedan S/12.”

Respuesta esperada:

NUTRIA filtra opciones incompatibles con la restricción declarada, prioriza alternativas dentro del presupuesto y cercanas al campus, y explica de manera sencilla por qué una opción puede adaptarse mejor a ese momento.

6. Escalabilidad

ULima funciona como el primer entorno de validación, no como el límite del producto.

Una vez validado el modelo, NUTRIA puede expandirse a otras universidades incorporando nuevos datasets de:

cafeterías;

restaurantes;

concesionarios;

menús;

precios;

ubicación;

horarios;

características alimentarias de cada opción.

La arquitectura está pensada para que cada universidad pueda incorporar su propio catálogo de establecimientos y alternativas sin modificar el núcleo principal de recomendación.

La visión es evolucionar desde un MVP específico para ULima hacia una plataforma de bienestar universitario adaptable a múltiples campus.

7. Stack tecnológico e IA

Frontend

React

Vite

Interfaz web responsive

Backend

Python

FastAPI

API REST para lógica de negocio y comunicación con servicios externos

Base de datos

PostgreSQL

Datos principales:

perfil del estudiante;

registros de contexto;

preferencias y restricciones alimentarias declaradas;

recomendaciones generadas;

establecimientos;

opciones de comida;

precios y ubicación.

Inteligencia Artificial

La IA se utiliza principalmente para:

interpretar entradas escritas en lenguaje natural;

detectar información relevante del contexto;

estructurar datos como presupuesto, tiempo disponible o comida omitida;

reconocer restricciones declaradas dentro del mensaje;

apoyar la generación de recomendaciones explicables.

La recomendación final combina la interpretación de IA con reglas y filtros del sistema, evitando depender únicamente de una respuesta generativa.

Infraestructura y despliegue

Frontend: Vercel

Backend: Railway / servicio cloud equivalente

Base de datos: PostgreSQL administrado

Repositorio: GitHub

Las credenciales y API keys se gestionan mediante variables de entorno y no deben almacenarse directamente en el repositorio.

8. Setup local

Requisitos

Node.js

npm

Python 3

PostgreSQL

Git

Clonar el repositorio

git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_REPOSITORIO>

Frontend

cd frontend
npm install
npm run dev

Backend

cd backend
pip install -r requirements.txt
uvicorn main:app --reload

Variables de entorno

Crear el archivo .env utilizando .env.example como referencia.

DATABASE_URL=
AI_API_KEY=

No subir el archivo .env al repositorio.

9. Integrantes y roles

Integrante

GitHub

Rol

Alexander Saavedra

@usuario-github

Desarrollo / IA

Integrante 2

@usuario-github

Frontend / UX

Integrante 3

@usuario-github

Backend / Datos

Integrante 4

@usuario-github

Negocio / Pitch

10. Documentación técnica

La documentación técnica del proyecto se encuentra en:

/docs

Incluye:

diagrama de arquitectura;

flujo principal del sistema;

comunicación frontend/backend;

integración con base de datos;

integración con servicios de IA.

11. Estado del proyecto

NUTRIA se desarrolla como MVP para validar si una recomendación contextual, rápida, personalizada y basada en opciones reales puede reducir la fricción que enfrentan los estudiantes al decidir qué comer durante periodos de alta carga académica.

El piloto se concentra en ULima, aprovechando un dataset detallado del entorno, con una arquitectura preparada para escalar posteriormente a otras universidades.
