# NUTRIA · contexto para Claude Code

Léeme antes de tocar nada. Acá está el estado real del proyecto, las reglas que no se negocian y lo
que está pendiente. El detalle de producto vive en [README.md](README.md); el pitch, en
[docs/DEMO.md](docs/DEMO.md).

**Ruta:** `~/Desktop/nutria` · **No es un repositorio git** (no hay `.git`; no intentes `git status`).

---

## Qué es

App web para estudiantes de la Universidad de Lima que convierte una frase suelta
—*"dormí 4 horas, no almorcé, me quedan S/12"*— en un registro de hábitos, detecta patrones a lo
largo de semanas y devuelve una opción de comida real cerca del campus dentro del presupuesto, más
una meta pequeña.

Proyecto de la final de **BRODT Hackathon 2026**, track *Future of Health & Wellness*, equipo
**LEAD at ULima**. El usuario está en modo hackathon: prioriza **reforzar lo que ya existe** antes
que abrir frentes nuevos.

## Cómo correrlo

No hay `npm install`, no hay build, no hay backend. Módulos ES nativos servidos estáticos:

```bash
cd ~/Desktop/nutria && python3 -m http.server 5180
```

- App: <http://localhost:5180>
- Pruebas: <http://localhost:5180/tests/test-analizador.html> — **225 aserciones, todas en verde**.
  Corren solas al abrir la página y dejan el resultado en `window.__resultados`.
- Para entrar: **cualquier usuario y cualquier contraseña**. El login no valida (a propósito).
- Para ver la app con datos: *Perfil → Cargar datos de ejemplo* (siembra 21 días de **frases**, que
  pasan por el analizador real; no son registros pre-cocinados).

No hay Node instalado en la máquina. Si necesitas ejecutar JS fuera del navegador, hay un runtime
embebido utilizable:

```bash
ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper.app/Contents/MacOS/Code Helper" script.mjs
```

---

## Reglas que no se negocian

Estas salen de la propuesta y de decisiones ya defendidas ante un mentor. Romper una es romper el
producto, no "cambiar un detalle".

1. **Procesamiento 100 % en el dispositivo.** No hay backend ni endpoint al que mandar la frase del
   estudiante. La ausencia de servidor **es** la arquitectura (privacidad bajo Ley 29733, costo
   marginal ≈ 0, wifi malo de campus). Lo único que sale a la red es la descarga *opcional* del
   modelo de la Capa 2, y solo si el estudiante aprieta el botón.
2. **Sin framework, sin bundler, sin dependencias.** HTML + CSS + JS vanilla con módulos ES. Sin
   fuentes externas ni peticiones a la red desde el CSS.
3. **Nunca calorías, macros, peso ni IMC.** No se premia comer menos. No se diagnostica.
4. **Explicabilidad obligatoria.** Toda extracción guarda el fragmento exacto del texto que la
   justifica (`analisis.trazas`); todo patrón guarda los días que lo motivaron (`patron.evidencia`).
   Si no se puede mostrar por qué se dijo, no se dice.
5. **La contra-métrica manda.** Si el motor detecta señales de restricción alimentaria,
   `gamificacionActiva` pasa a `false`: se apagan racha, insignias y metas de comida, y la meta se
   reemplaza por acompañamiento. Está en `js/motor/patrones.js → evaluarRestriccion()`.
6. **A la universidad solo van indicadores y bandas.** Nunca la frase, el plato, el monto exacto ni
   el ánimo. El modo con nombre está apagado por defecto. La señal de restricción **no se envía**:
   se le muestra al estudiante y él decide. Ver `js/motor/reporte.js → reporteInstitucional()`.
7. **Nunca decir "100 % seguro", "sin riesgo" ni "garantizado"** al hablar de alérgenos (HU-04). Lo
   desconocido se comunica como desconocido.

## Convenciones de código

- **Todo el código está en español**: nombres de funciones, variables, clases CSS y comentarios.
  Sigue esa línea (`recomendar`, `analizarPatrones`, `.tarjeta--realce`), no la mezcles con inglés.
  Excepción: `src/` llegó en inglés (`getDietaryProfile`, `evaluarCompatibilidadAlimentaria` mezcla
  ambos). No lo renombres por ahora: está integrado y probado.
- Cada vista es una **función pura estado → HTML**; los eventos van por delegación en `js/app.js`.
- Los comentarios explican **por qué**, no qué. Hay bastante contexto de decisión escrito en las
  cabeceras de cada módulo: léelas antes de cambiar la lógica de ese módulo.
- **La interfaz habla como una persona, no como el equipo de desarrollo.** En pantalla no se nombran
  capas, milisegundos, datasets, `localStorage`, "maqueta" ni estados internos. Eso vive en el
  código y en el README, que es donde sirve. Esto fue una petición explícita del usuario.
- Los íconos son propios (`js/ui/iconos.js`), SVG inline, `currentColor`. **Nada de emoji como
  iconografía.**

---

## Mapa del código

```
index.html              Shell: cabecera, 6 pestañas, capa de Nutri, contenedor #vista
css/estilos.css         Sistema de diseño completo "Río y papel" (tokens, claro/oscuro, print)
js/
  app.js                Orquestador: sesión, estado global, recalcular(), pintar(), eventos
  parser/
    gazetteer.js        CONTENIDO: platos peruanos, jerga de plata, negaciones, ánimo
    analizador.js       Reglas determinísticas + evidencia citable
  datos/
    almacen.js          localStorage: registros, metas, perfil, sesión, consentimientos, envíos
    csv.js              Lector de CSV propio (comillas, comas dentro de campo, CRLF)
    ulima.js            dataset/*.csv -> esquema del motor. Deriva `aporte` con reglas
                        auditables; `tiempo_cola_min` queda en null (nadie la midió)
    menus.js            Cascada de fuentes: dataset/ -> semilla sintética -> respaldo
    demo.js             Guion de 21 días (frases, no registros falsos)
  motor/
    patrones.js         Ventanas 7/14/28 días + contra-métrica de restricción
    ritmo.js            Los tres momentos del día: qué pide cada uno y qué falta hoy
    metas.js            Metas pequeñas (línea base + 1)
    recomendador.js     Presupuesto × momento del día × aporte × alérgenos × contexto
    insignias.js        Insignias y nivel, calculados de los registros reales
    reporte.js          Informe del estudiante + reporte de indicadores a bienestar
  ui/
    vistas.js           Render de todas las pantallas (~1600 líneas; es el archivo más grande)
    sesion.js           Pantalla de acceso
    mascota.js          Nutri: SVG + widget flotante y su panel de gamificación
    iconos.js           Set de íconos propio
    movimiento.js       Resortes, feedback al toque, entrada de vistas
    comunidad.js        Reseñas del campus con autor + retos
  capa2/modelo.js       OPCIONAL: modelo pequeño en el navegador (transformers.js)
src/                    Perfil alimentario y tiempo disponible (HU-01 a HU-04)
  dietary-catalog.js    Catálogo de restricciones/alérgenos + evaluarCompatibilidadAlimentaria()
  storage.js            Perfil alimentario en localStorage (unknown vs [] son distintos)
  dietary-profile-view.js  Editor del perfil alimentario (se pinta dentro de Perfil)
  parser.js             extractAvailableTime(): tiempo real para comer, con margen académico
dataset/                Dataset REAL de campo (20 locales, 65 platos). ES LO QUE LA APP USA.
data/menus-semilla.json 24 opciones SINTÉTICAS. Solo respaldo si dataset/ no carga.
tests/                  test-analizador.html es el runner; importa los .test.js de src/
docs/                   DEMO.md (pitch) · DATASET.md (cómo se levanta el mapeo)
```

### Flujo de una frase

```
texto → analizarTexto() → guardarRegistro() → analizarPatrones() →
proponerMeta()/evaluarMeta() → recomendar() → render()
```

`recalcular()` en `js/app.js` recompute todo el estado derivado; `pintar()` lo dibuja. Nutri vive
fuera de `#vista` para no perder su panel al cambiar de pestaña (`pintarNutri()`).

---

## Estado actual

### Funcionando de punta a punta

| Área | Nota |
|---|---|
| Login | Flujo real, **sin validación**: entra cualquiera. Sesión en `localStorage`, contraseña no se guarda |
| Registro en lenguaje natural | Reglas + gazetteer, con evidencia citable |
| Ritmo de uso | Tres momentos (mañana / mediodía / noche). La consola de inicio dice qué falta hoy |
| Motor de patrones 7/14/28 | Explicable, cada patrón cita sus días |
| Metas pequeñas | Línea base + 1, con techo |
| Recomendación | Sobre el **mapeo real** del campus. Presupuesto ordena, no solo filtra; franja del día; descarta por alérgenos |
| Contra-métrica | Apaga racha, insignias y metas de comida |
| Nutri (esquina inferior derecha) | Único lugar donde la app gamifica: racha, meta e insignias |
| Historial | Pestaña propia, con búsqueda, filtros, borrado por entrada y actualización en vivo |
| Perfil del estudiante | Identidad, calendario de constancia de 28 días, nivel |
| Informe de 4 semanas | Legible e imprimible (`window.print()`, hay CSS de impresión) |
| Reporte a bienestar | Consentimiento granular, indicadores en bandas, bitácora de envíos |
| Perfil alimentario (HU-01/02) | Alergias, intolerancias, evitados, preferencias, indicación profesional |
| Tiempo disponible (HU-03) | "tengo parcial en 40 minutos" → descuenta margen de traslado |
| Comunidad | Reseñas con autor (ficticio) sobre platos reales del dataset + retos |

### El ritmo de uso (respuesta a "¿cuándo registro?")

Vive en `js/motor/ritmo.js` y es una **decisión de producto**, no un detalle de UI. Antes había un
campo de texto sin ninguna indicación de cuándo usarlo, y el estudiante quedaba eligiendo entre
"diario nocturno" o "cuando me acuerde" sin que nadie se lo dijera.

El modelo: **una frase al día basta**, y hay tres momentos que pagan distinto —mañana (05–11):
sueño y plata; mediodía (11–19): acá NUTRIA devuelve la recomendación; noche (19–05): cierre y red
de seguridad—. Ninguno es obligatorio. `consolidarPorDia()` ya juntaba varios registros del mismo
día rellenando huecos: el ritmo hace visible esa capacidad, no inventa una exigencia nueva. La
racha y los patrones siguen contando **días con registro**, nunca momentos cumplidos.

Los "atajos de un toque" de la vista Hoy **suman su fragmento al campo de texto** en vez de
registrar solos, y el resultado pasa por el mismo analizador que el texto libre. No hay una vía
rápida que salte las reglas.

### Declarado fuera de alcance por el usuario — NO lo construyas sin que lo pida

- **Autenticación real** contra el directorio de la universidad.
- **Perfiles públicos de la comunidad**: los autores son ficticios y su nombre **no debe ser
  clicable** hasta que exista el perfil navegable.
- **Ilustración definitiva de la mascota**: el SVG es provisional y el usuario dará la imagen. Está
  aislado en `js/ui/mascota.js → svgMascota()`; cambiarlo es tocar una función, no la app.
- **Tablero institucional** para bienestar (el lado del estudiante ya está).

### Pendientes reales (candidatos a lo siguiente)

1. **Levantar la carta de los 16 locales que no la tienen.** El dataset ya trae 20 establecimientos
   verificados, pero solo 4 tienen platos (Bembos, Chinawok, Starbucks, Sushi Pop). Los que faltan
   son justo los de menú barato (Alessar F2, Marianne 02, Cayetana, Jacinta y Cornelia, Lifegreen,
   Picadeli, Freshit…). Hoy la app los muestra como "carta todavía sin levantar", que es honesto
   pero deja al recomendador sin nada bajo S/12. **Es lo más valioso pendiente.**
2. **Cronometrar `tiempo_cola_min`.** Nadie lo midió, viaja en `null` y el motor deja de puntuar por
   ese término. Es un dato de campo, no de escritorio: hora punta 12:45–13:15.
3. **Unificar `js/` y `src/`.** Son dos convenciones conviviendo (español/inglés, rutas `../../src/`
   cruzadas). Funciona y está probado, pero es la deuda técnica más visible.
4. **`js/ui/vistas.js` pasa de 1600 líneas.** Partirlo por vista sería sano si se sigue creciendo.
5. **Comunidad sin persistencia**: las reseñas son constantes en el módulo, no se pueden escribir.
   Es el mecanismo previsto para corregir precios y colas, así que es el paso natural después de (2).

## Trampas conocidas

- **El atributo `transform` de SVG no es el `transform` de CSS**: `rotate(45deg 60 60)` es inválido y
  el navegador descarta la rotación entera. Los grados van **sin unidad**. (Ya pasó una vez.)
- **`requestAnimationFrame` no corre con la pestaña oculta.** El resorte de la pastilla del dock se
  congela a media animación si el panel del navegador está oculto; hay un guard por
  `visibilitychange` y otro por `offsetParent === null`. Si ves el indicador desalineado en una
  captura automatizada, es esto y no un bug.
- **Los módulos ES quedan cacheados** en el navegador. Si un cambio "no se aplica", importa con
  `?bust=Date.now()` o recarga forzada antes de dudar del código.
- **`html { scroll-behavior: smooth }`** hace que `scrollTo({behavior:'auto'})` siga siendo animado;
  medir posiciones justo después da valores intermedios.
- **`dataset/` llegó con la codificación rota** (`Metodologí¡³a`, `ÓÓÓval`, guiones suaves invisibles).
  Ya está reparado en los CSV **y** hay un saneador defensivo en `js/datos/ulima.js → sanear()`. Si
  vuelves a regenerarlo, escribe en UTF-8.
- **Las rutas de `fetch` van relativas AL MÓDULO** (`new URL('../../dataset/x.csv', import.meta.url)`),
  no al documento. Con rutas relativas al documento, `tests/` cargaba en silencio el respaldo
  embebido en vez del dataset real y nadie se enteraba.
- **`display` de una clase gana sobre el `[hidden]` del navegador.** `.ficha-noche { display: flex }`
  hacía que `hidden` no ocultara nada. Si ocultas con `hidden`, agrega la regla `[hidden]` explícita.
- **`.grafico svg` con selector descendente alcanza a los íconos** que viven dentro del gráfico y los
  estira a `width: 100%`. Va `.grafico > svg`.

## Antes de dar algo por terminado

1. Abre <http://localhost:5180/tests/test-analizador.html> y confirma **225 en verde, 0 en rojo**.
2. Abre la app, entra, carga datos de ejemplo y recorre las 6 pestañas.
3. Revisa la consola: debe estar limpia de errores.
4. Prueba en móvil (375 px) si tocaste CSS: Nutri, el dock y el aviso flotante comparten esquina y
   ya colisionaron una vez.
