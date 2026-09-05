# 🦦 NUTRIA

**Bienestar preventivo para universitarios peruanos, procesado en su propio dispositivo.**

NUTRIA convierte una frase suelta —*"dormí 4 horas, no almorcé, me quedan S/12"*— en un registro
de hábitos. Todo se interpreta **dentro del navegador del estudiante**: sin formularios, sin balanza,
sin contar calorías, y ese texto **nunca llega a un servidor**.

Con esos registros el sistema detecta patrones a lo largo de las semanas y devuelve dos cosas
concretas: una opción de comida real y accesible cerca de su facultad dentro de su presupuesto, y
una meta pequeña y alcanzable.

> Proyecto de la final de **BRODT Hackathon 2026** · track *Future of Health & Wellness* · equipo **LEAD at ULima**.

---

## Cómo correrlo

No hay `npm install`, no hay build, no hay backend. Solo necesitas un servidor estático
(los módulos ES no cargan por `file://`):

```bash
python -m http.server 5180
```

Luego abre <http://localhost:5180>. Alternativas equivalentes: `npx serve .`, la extensión
*Live Server* de VS Code, o publicarlo tal cual en GitHub Pages.

**Pruebas:** abre <http://localhost:5180/tests/test-analizador.html>. Son 225 aserciones sobre el
analizador, el motor de patrones, las metas, el recomendador, las insignias, los informes y el perfil
alimentario (incluidas la regresión del presupuesto, la verificación de que ninguna frase viaja en el
reporte a la universidad y el descarte por alérgenos). Cero dependencias, corren solas.

**Para entrar:** cualquier usuario y cualquier contraseña. El acceso todavía no valida contra el
directorio de la universidad; existe para que el flujo, el perfil y el informe sean los reales.

**Para ver la demo con historial:** *Perfil → Cargar datos de ejemplo*. Ojo con el detalle que
importa para el jurado técnico: eso siembra **frases**, no registros pre-cocinados, y las pasa por el
mismo analizador de la Capa 1 que corre en vivo.

---

## Cómo se usa: una frase al día, en el momento que quieras

La pregunta que hunde a las apps de hábitos no es *"¿cuánto cuesta registrar?"* sino **"¿cuándo se
supone que abro esto?"**. Un campo de texto vacío sin ninguna indicación deja al estudiante eligiendo
entre dos modelos que nadie le explicó —¿diario de la noche? ¿cada vez que me acuerde?— y el que no
sabe cuándo abrir, no abre.

NUTRIA lo responde en pantalla, y el modelo está en `js/motor/ritmo.js`:

> **Una frase al día basta, a la hora que sea.** Encima de ese mínimo hay tres momentos que sirven
> para cosas distintas, y ninguno es obligatorio.

| Momento | Qué pide | Por qué ese y no otro |
|---|---|---|
| **Mañana** · 05:00–11:00 | Cuánto dormiste, con cuánta plata sales | Es el único momento en que lo sabes, y es lo que hace que la recomendación del mediodía sirva. Contarlo de noche llega tarde para decidir el almuerzo. |
| **Mediodía** · 11:00–19:00 | Si comiste | Acá NUTRIA **devuelve**: qué te alcanza, dónde y en cuánto tiempo. Registrar es opcional; entrar es el punto. |
| **Noche** · 19:00–05:00 | Qué comiste, cómo te fue | Es la red de seguridad: si no abriste en todo el día, una frase acá lo deja completo igual. |

Tres decisiones se siguen de eso, y ninguna es cosmética:

1. **Un día admite varios registros, y el motor ya lo hacía.** `consolidarPorDia()` junta todo lo del
   mismo día rellenando huecos, así que registrar tres veces **completa un día**, no crea tres. La
   consola de inicio hace visible esa capacidad que la interfaz escondía.
2. **Nada vence a medianoche y nada reclama.** Lo que falta se muestra como hueco, no como deuda. Un
   pendiente que regaña es la forma más rápida de que alguien desinstale una app de salud.
3. **El mínimo sigue siendo uno.** La racha, la meta y los patrones cuentan **días con registro**, no
   momentos cumplidos. El ritmo no puede subir la vara por la puerta de atrás.

La pantalla de inicio muestra la hora corriendo, en qué momento estás, la barra de los tres momentos
con un marcador en el ahora, y seis cápsulas —sueño, desayuno, almuerzo, cena, plata, ánimo— que se
llenan a medida que registras. Debajo, los **atajos de un toque** (*"+ no almorcé"*, *"+ me quedan
S/10"*) **suman su fragmento al campo de texto** en vez de registrar solos: se arma la frase con tres
toques y se guarda una vez. Lo que se registra así pasa por el mismo analizador que el texto libre —no
hay una vía rápida que se salte las reglas ni que se ahorre la evidencia.

---

## Stack: por qué HTML + CSS + JavaScript vanilla (ES modules)

La regla inquebrantable del proyecto es **procesamiento 100 % en el dispositivo, cero nube**. Esa
regla no es una preferencia estética: es el argumento que sostiene la privacidad (Ley 29733), el
costo marginal ≈ 0 y el funcionamiento con el wifi malo del campus.

| Decisión | Por qué |
|---|---|
| **Sin framework** (nada de React/Vue/Svelte) | Un framework aporta reactividad y componentes; acá el valor está en el *parser*, el *motor de patrones* y el *dataset*. Pagar una cadena de build (bundler, transpilación, dev-server, dependencias) para renderizar cinco pantallas es gastar la mitad del día en fontanería. |
| **Sin bundler ni `node_modules`** | El navegador carga módulos ES nativos. Cero minutos de configuración, cero incompatibilidad de versiones en las laptops del equipo, cero riesgo de que "no compila" a las 5 p.m. |
| **Sin backend** | Un backend contradiría la tesis del proyecto. La ausencia de servidor **es** la arquitectura. |
| **`localStorage` para el historial** | Persistencia real, sin cuenta, sin sincronización, sin custodia de datos de salud. |
| **Todo estático** | Se despliega en GitHub Pages en un clic y funciona offline tras la primera carga. |
| **Módulos con fronteras limpias** | `parser/`, `datos/`, `motor/`, `ui/` se pueden repartir entre 4 personas en paralelo sin pisarse: los contratos entre módulos son objetos planos. |

Lo único que sale a la red en todo el proyecto es la descarga **opcional** del modelo de la Capa 2,
y solo si el estudiante aprieta el botón. El reporte a bienestar se arma en el dispositivo y tampoco
lleva texto: ver *Privacidad*.

---

## Diseño: "Río y papel"

El sistema visual vive entero en `css/estilos.css` y responde a las mismas
restricciones que el resto del proyecto: **sin fuentes externas, sin librerías,
sin una sola petición a la red**, para que la app siga funcionando offline y sin
delatar al estudiante.

| Decisión | Por qué |
|---|---|
| **Papel cálido de día, río nocturno de noche** | Una paleta mezclada a mano (verde río + ají como único acento) en vez de los azules/teal por defecto de cualquier framework. La app se tiene que ver de NUTRIA, no de Bootstrap. |
| **Serif del sistema para el discurso, sans para el dato** | El serif (`ui-serif`/Georgia) da voz editorial a títulos y citas; el sans con cifras tabulares mantiene precios, horas y rachas alineados. Cero kilobytes de tipografía descargada. |
| **Íconos propios en SVG** (`js/ui/iconos.js`) | El emoji lo dibuja cada sistema operativo a su manera y arrastra un aire genérico; un set propio hereda el color del contexto y se ve igual en todas partes. |
| **La barra inferior se vuelve riel lateral en escritorio** | Es la misma marca semántica (`<nav class="tabs">`): solo cambia la disposición a partir de 900 px, para no servir una pantalla de teléfono estirada. |
| **Explicabilidad como elemento gráfico** | La frase registrada se vuelve a pintar con los fragmentos que justificaron cada campo resaltados, y las ventanas móviles se ven como rejillas de puntos y un sparkline de sueño. Lo que el motor puede justificar, se muestra. |
| **Toda la gamificación en una sola esquina** (`js/ui/mascota.js`) | Racha, meta e insignias vivían repartidas entre el encabezado de cada pantalla y una sección al final de Comunidad, que es donde nadie las buscaba. Ahora Nutri es el único sitio donde la app premia: se toca y se abre. Fuera de ahí, la interfaz informa y no compite. |
| **Movimiento con resortes** (`js/ui/movimiento.js`) | La pastilla del dock la mueve un resorte crítico interrumpible, el feedback al toque ocurre en `pointerdown`, y todo se apaga con `prefers-reduced-motion`. También se respetan `prefers-reduced-transparency` y `prefers-contrast`. |

## Arquitectura

```
frase del estudiante
        │
        ▼
┌───────────────────────┐   Capa 1: reglas + gazetteer. Determinística, ~0.3 ms, sin red.
│  parser/analizador.js │   Devuelve SIEMPRE la evidencia textual de cada extracción.
└───────────┬───────────┘
            │  (solo si quedan campos vacíos y el usuario habilitó la Capa 2)
            ▼
┌───────────────────────┐   Capa 2: modelo ~0.5B cuantizado en WebGPU/WASM. OPCIONAL.
│  capa2/modelo.js      │   Si falla, no pasa nada: la Capa 1 sostiene el producto completo.
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│  datos/almacen.js     │   localStorage. Sin cuenta, sin servidor, exportable y borrable.
└───────────┬───────────┘
            ▼
┌───────────────────────┐   Ventanas móviles de 7 / 14 / 28 días. Cruza comida × sueño ×
│  motor/patrones.js    │   ánimo × carga académica. Cada patrón cita los registros exactos.
└───────────┬───────────┘
            ├──────────────► motor/ritmo.js ......... los tres momentos y qué falta hoy
            ├──────────────► motor/metas.js ......... meta pequeña = línea base + 1
            └──────────────► motor/recomendador.js .. presupuesto × mapeo real del campus
                                    │        ▲
                                    │   datos/ulima.js .. dataset/*.csv → esquema del motor
                                    ▼
                             ui/ (vistas, mascota, comunidad)
```

### Las cuatro decisiones que hay que poder defender

1. **Capa 1 antes que Capa 2.** El vigilante con la lista en la puerta resuelve la mayoría de los
   casos sin razonar. El modelo solo se llama cuando alguien no está en la lista. Por eso la demo no
   depende de que un modelo cargue en vivo (*degradación elegante*).
2. **Explicabilidad, no caja negra.** Cada campo extraído guarda el fragmento exacto del texto que lo
   justifica (`analisis.trazas`), y cada patrón guarda los días que lo motivaron (`patron.evidencia`).
   En la interfaz eso es el desplegable *"¿Por qué entendí eso?"* y *"Ver los registros exactos"*.
3. **La contra-métrica apaga la gamificación.** Si el motor detecta señales de restricción alimentaria
   sostenida, `gamificacionActiva` pasa a `false`: se caen rachas e insignias y la meta de la semana se
   reemplaza por acompañamiento. Está en `motor/patrones.js → evaluarRestriccion()` y probado en
   `tests/`. El riesgo obvio de una app de comida para jóvenes es inducir conducta dañina; preferimos
   perder retención antes que ganarla así.
4. **A la universidad se le devuelven indicadores, no personas.** Quien paga necesita evidencia de
   impacto; quien usa la app necesita que su frase no se filtre. Se resuelve enviando números y
   bandas (`motor/reporte.js`), con el modo nominal apagado por defecto y la señal de restricción
   explícitamente excluida del envío. Sin esa separación no hay ni financiamiento ni confianza.

---

## Estructura de archivos

```
nutria/
├── index.html                    Shell de la aplicación (6 pestañas + acceso, sin dependencias)
├── css/
│   └── estilos.css               Sistema de diseño completo: tokens, claro/oscuro, movimiento
├── js/
│   ├── app.js                    Orquestador: sesión, parser → almacén → motor → UI
│   ├── parser/
│   │   ├── gazetteer.js          CONTENIDO: platos peruanos, jerga de plata, negaciones, ánimo
│   │   └── analizador.js         Reglas determinísticas + evidencia citable
│   ├── datos/
│   │   ├── almacen.js            localStorage: registros, perfil, sesión, consentimientos
│   │   ├── csv.js                Lector de CSV propio: comillas, comas dentro del campo, CRLF
│   │   ├── ulima.js              dataset/*.csv → esquema del motor, con derivaciones auditables
│   │   ├── menus.js              Cascada de fuentes: dataset/ → semilla → respaldo embebido
│   │   └── demo.js               Guion de 21 días para la demo (frases, no registros falsos)
│   ├── motor/
│   │   ├── patrones.js           Ventanas 7/14/28 días + contra-métrica de restricción
│   │   ├── ritmo.js              Los tres momentos del día y qué falta saber de hoy
│   │   ├── metas.js              Metas pequeñas calibradas (línea base + 1)
│   │   ├── recomendador.js       Presupuesto × momento del día × aporte × contexto
│   │   ├── insignias.js          Insignias y nivel, calculados de los registros reales
│   │   └── reporte.js            Informe del estudiante + reporte de indicadores a bienestar
│   ├── ui/
│   │   ├── vistas.js             Render de las pantallas (incluido el informe imprimible)
│   │   ├── sesion.js             Pantalla de acceso
│   │   ├── mascota.js            Nutri: SVG inline, 5 estados + widget flotante y su panel
│   │   ├── iconos.js             Set de íconos propio (SVG inline, cero peticiones)
│   │   ├── movimiento.js         Resortes, feedback al toque y entrada de vistas
│   │   └── comunidad.js          Reseñas del campus con su autor + retos
│   └── capa2/
│       └── modelo.js             OPCIONAL: modelo pequeño en el navegador (transformers.js)
├── src/                          Perfil alimentario y tiempo disponible (HU-01 a HU-04)
│   ├── dietary-catalog.js        Catálogo de restricciones + evaluación de compatibilidad
│   ├── storage.js                Perfil alimentario local ('unknown' ≠ lista vacía)
│   ├── dietary-profile-view.js   Editor del perfil, dentro de la pestaña Perfil
│   └── parser.js                 Tiempo real para comer, con margen antes de un parcial
├── dataset/                      Levantamiento REAL — **es lo que la app consume**
│   ├── restaurants.csv           20 establecimientos con lat/long, horarios y minutos a pie
│   ├── dishes.csv                65 platos con precio, porción y fuente citada
│   └── README.md                 Metodología, fuentes, límites y niveles de confianza
├── data/
│   └── menus-semilla.json        24 opciones sintéticas — solo respaldo si dataset/ no carga
├── tests/
│   ├── test-analizador.html      Runner: 225 aserciones, cero dependencias
│   ├── dietary-profile.test.js   HU-01, HU-02, HU-04
│   └── parser.test.js            HU-03
└── docs/
    ├── DEMO.md                   Guion del pitch de 5 minutos
    └── DATASET.md                Cómo se levanta el mapeo de campo real
```

---

## Qué está funcional y qué no

| Función | Estado |
|---|---|
| Acceso con usuario y contraseña | 🔑 Flujo real, **sin validación**: entra cualquiera hasta conectar el directorio |
| Registro en lenguaje natural | ✅ Funcional, 39 aserciones en verde |
| Persistencia local del historial | ✅ Funcional (`localStorage`, copia / restauración / borrado) |
| Motor de patrones 7 / 14 / 28 días | ✅ Funcional y explicable |
| Metas pequeñas | ✅ Funcional |
| Recomendación por presupuesto y hora | ✅ Funcional, con regresión propia en `tests/` |
| Contra-métrica de restricción | ✅ Funcional (apaga rachas, insignias y metas de comida) |
| Nutri: racha, meta e insignias | ✅ Funcional — las insignias se calculan de los registros reales |
| Perfil del estudiante y su evolución | ✅ Funcional |
| Informe legible de las últimas 4 semanas | ✅ Funcional e imprimible |
| Reporte de indicadores a bienestar | ✅ Funcional del lado del alumno; **falta el receptor** (tablero institucional) |
| Modelo opcional en el navegador | ⚙️ Integrado y opcional: se activa desde *Perfil → Opciones avanzadas* |
| Perfil alimentario: alergias, intolerancias, preferencias | ✅ Funcional (HU-01, HU-02) — descarta opciones incompatibles |
| Tiempo disponible con margen académico | ✅ Funcional (HU-03) — "parcial en 40 min" no son 40 min para comer |
| Comunidad (reseñas, retos, reputación) | 🎨 **Contenido de ejemplo**, sin backend: los autores son ficticios y su perfil todavía no es navegable |
| Ritmo de uso (cuándo registrar) | ✅ Funcional — tres momentos opcionales; el mínimo real es una frase al día |
| Historial con búsqueda y filtros | ✅ Funcional, en su propia pestaña y actualizado en vivo |
| Mapeo de comida del campus | ✅ **Conectado al levantamiento real**: 20 locales y 65 platos con fuente y fecha por fila |
| Carta de los locales del campus | 🌱 Levantada en 4 de 20 (Bembos, Chinawok, Starbucks, Sushi Pop). Los otros 16 aparecen dichos como *"carta todavía sin levantar"* |
| Tiempo de cola por local | 🚧 **Sin medir.** Viaja en `null` y el motor deja de puntuar por ese término en vez de asumir cero |

El alcance está declarado a propósito. Lo que falta para el piloto no es la app del estudiante: es
terminar el trabajo de campo —la carta de los 16 locales que faltan y el tiempo de cola en hora
punta— y construir el receptor institucional (un tablero para bienestar). El detalle operativo está
en [CLAUDE.md](CLAUDE.md) y en [docs/DATASET.md](docs/DATASET.md).

Un hallazgo del levantamiento que la app **no esconde**: con lo que hoy está mapeado, por debajo de
S/12 no alcanza para un plato completo dentro del campus. Cuando eso pasa, la recomendación lo dice
con todas sus letras y muestra cuánto falta para el más barato que sí lo es, en vez de devolver tres
tarjetas fingiendo que con S/8 se almuerza.

---

## Privacidad

- El texto crudo del estudiante **nunca sale del dispositivo**. No existe endpoint al que enviarlo.
- El historial vive en `localStorage` de ese navegador. Sin cuenta en la nube, sin correo verificado.
- El estudiante puede llevarse todo su historial en un archivo o borrarlo completo en un clic.
- La contraseña del acceso **no se guarda**, ni cifrada ni en claro. No hay contra qué compararla
  todavía, y guardarla "para después" es exactamente cómo empiezan las filtraciones.

### Qué recibe la universidad (y qué no)

Este es el punto donde el modelo de financiamiento se toca con la privacidad, así que está resuelto
en código y no en una promesa (`motor/reporte.js → reporteInstitucional()`):

| Viaja | No viaja |
|---|---|
| Días registrados y adherencia del periodo | La frase que escribió, entera o en fragmentos |
| Sueño promedio **en banda** (`5 a 6 h`) | Las horas exactas de cada noche |
| Presupuesto **en banda** (`S/11 a S/15`) | Los montos exactos |
| Almuerzos cumplidos sobre días declarados | Qué plato comió y en qué establecimiento |
| Nivel de constancia y logros del periodo | Su ánimo declarado y cualquier señal de salud mental |

Dos reglas más, ambas probadas en `tests/`:

1. **El modo nominal está apagado por defecto.** El tablero agregado es anónimo por cohorte; el
   informe con nombre solo existe si el estudiante lo enciende, y puede apagarlo cuando quiera.
2. **La contra-métrica no delata.** Si el motor detecta señales de restricción alimentaria, ese dato
   *no* entra al reporte: se le muestra al estudiante y se le ofrece el canal de bienestar para que
   decida él. Si NUTRIA delata, nadie vuelve a escribir la verdad en el compositor, y sin verdad no
   hay producto.

---

## Modelo: por qué es gratis para el estudiante

Lo paga el área de **bienestar de universidades privadas**, no el alumno. La universidad ya invierte
en bienestar estudiantil y hoy mide su impacto con encuestas de fin de ciclo; NUTRIA le devuelve
indicadores continuos de sueño, alimentación y constancia por facultad, sin volverse custodia de
datos de salud bajo la Ley 29733 —porque nunca recibe el dato crudo—.

Se apunta primero a privadas por una razón práctica: el ciclo de compra en universidades nacionales
es burocrático y más largo que la ventana de un piloto.

## Lo que NUTRIA no hace

🚫 No diagnostica (no es dispositivo médico) · 🚫 No cuenta calorías ni pide peso/IMC ·
🚫 No premia comer menos · 🚫 No comercializa el dato del estudiante.

---

## Licencia

MIT — ver [LICENSE](LICENSE).
PARTICIPANTES:
WILLIAM DIAZ Killiamss
MARIA JIMENEZ  20248108-arch 
ALEXANDER ssalex88
ABIGAIL abislytering20-sys
