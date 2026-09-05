# Testing core de NUTRIA

Suite de pruebas automáticas de **integración** sobre el núcleo del producto, en
sintaxis **Jest**. Valida dos cosas: que el camino feliz funcione de punta a
punta, y que ante un error crítico el sistema falle **de la forma que decidimos**
en vez de dejar al estudiante sin respuesta.

| | |
|---|---|
| **Framework** | Jest 29 (sintaxis estándar `describe` / `it` / `expect`) |
| **Tipo** | Integración — se prueba que las piezas **encajen**, no cada pieza suelta |
| **Archivo** | [`tests/core/nutria.core.test.js`](../tests/core/nutria.core.test.js) |
| **Casos** | **35 pruebas · 6 suites · 0 fallan** |
| **Dependencias de ejecución de la app** | **Cero.** Jest es `devDependency`: no viaja al navegador ni al despliegue |

> Esta suite **no reemplaza** a [`tests/test-analizador.html`](../tests/test-analizador.html),
> que tiene 225 aserciones unitarias sobre el analizador, el gazetteer, las
> ventanas móviles y las metas. Aquélla prueba las piezas; ésta prueba la cadena.

---

## Cómo se corre

### Opción A — Jest (la estándar)

```bash
npm install
npm test
```

`--experimental-vm-modules` ya está en el script: el proyecto usa módulos ES
nativos y Jest los necesita habilitados. No hay Babel, no hay transpilación, no
hay `transform`.

### Opción B — sin instalar nada

La máquina del equipo no tiene Node ni npm, y en una demo en vivo no se puede
decir *"esperen que instalo dependencias"*. Los **mismos archivos** corren con un
shim propio de 130 líneas ([`tests/core/jest-shim.mjs`](../tests/core/jest-shim.mjs))
sobre el runtime embebido de VS Code:

```bash
ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper.app/Contents/MacOS/Code Helper" tests/core/correr.mjs
```

Sale con código `1` si algo falla, así que sirve tal cual en un CI.

**Por qué las dos vías.** El proyecto tiene una regla que no se negocia: cero
dependencias, sin build, sin bundler. Instalar Jest sería meter `node_modules` en
algo que se despliega estático. El shim evita que la suite dependa de que Jest
esté instalado, sin dejar de ser código Jest legítimo: si mañana el proyecto
adopta npm, `npx jest` corre estos archivos sin tocar una línea.

---

## 1 · Camino feliz — *una frase se convierte en una decisión*

Recorre la cadena completa del producto con la frase de la demo:

> `dormí 4 horas, no almorcé, me quedan S/12 y tengo entrega mañana`

```
texto → analizarTexto() → guardarRegistro() → analizarPatrones()
      → proponerMeta() / evaluarMeta() → recomendar() → ritmoDeHoy()
```

| # | Qué valida | Por qué importa |
|---|---|---|
| 1 | Extrae los 4 datos: sueño 4 h, almuerzo saltado, S/12, carga académica | Es el valor entero del producto: registrar cuesta una frase |
| 1b | **Cada extracción cita el fragmento exacto** del texto que la justifica | Regla 4: si no se puede mostrar por qué se dijo, no se dice |
| 2 | El registro se persiste y vuelve a leerse íntegro | Sin persistencia no hay historial y sin historial no hay patrón |
| 3 | El motor detecta patrones y **cada uno cita sus días exactos** | Un patrón sin evidencia es una opinión con tipografía bonita |
| 4 | Propone **una** meta, calibrada a línea base + 1, con techo | Pedir 7 de 7 a quien viene de 2 es diseñar el abandono |
| 5 | Máximo 3 opciones, **todas dentro del presupuesto**, cada una con su porqué | Recomendar fuera de presupuesto es no recomendar |
| 5b | Con S/12 gana el menú completo; con S/20, el plato con proteína **y** verdura | Regresión del bug donde el presupuesto filtraba pero no ordenaba |
| 6 | El ritmo sabe qué señales tiene el día y cuáles faltan | Responde "¿cuándo registro?", que era el hueco de uso |
| — | **Invariante:** en ninguna salida aparece `calor`, `kcal`, `macro`, `imc`, `peso` | Bloque 3: NUTRIA no cuenta calorías. Si eso se filtra, se cae la contra-métrica entera |

---

## 2 · Errores críticos

Se define **crítico** como aquello que, si falla mal, deja al estudiante sin
respuesta o rompe una regla del producto. Cinco escenarios:

### CRÍTICO-1 · El mapeo de comida no carga

*Wifi de campus caído, archivo movido, `fetch` sobre un origen que no existe.*

| Valida | Comportamiento esperado |
|---|---|
| `cargarMenus()` **nunca lanza** | Degradación en cascada: `dataset/` → semilla → respaldo embebido |
| Devuelve opciones **reales**, con plato y precio > 0 | El estudiante no se queda sin respuesta a la 1 p.m. |
| `_meta.origen` dice de qué fuente está hablando | La app puede decir la verdad sobre su propia fuente |
| El recomendador funciona sobre el respaldo | La degradación no se corta a mitad de la cadena |
| Mapeo **vacío** → cambia el mensaje, **no inventa platos** | Inventar un restaurante es peor que decir "no hay" |
| `datasetMenus: null` → no lanza | El caso que aparece cuando algo falla antes de tiempo |

> La prueba es real, no simulada: en Node no hay servidor y `fetch` sobre
> `file://` falla. Es exactamente el escenario de producción.

### CRÍTICO-2 · El navegador bloquea el almacenamiento

*Modo incógnito, cookies de terceros bloqueadas, cuota llena.*

| Valida | Comportamiento esperado |
|---|---|
| Guardar y leer siguen funcionando **en memoria** | La sesión de hoy no se pierde a mitad |
| `estadisticasAlmacen().almacenamientoOk === false` | **Se le avisa al estudiante.** Fingir que se guardó es peor que no guardar |
| La cadena completa corre igual | El motor no depende de que haya disco |

### CRÍTICO-3 · El estudiante escribe cualquier cosa

Entradas probadas: `''`, espacios, `'?????'`, teclado aleatorio, solo emoji,
`<script>alert(1)</script>` y 400 caracteres repetidos.

| Valida | Comportamiento esperado |
|---|---|
| `analizarTexto()` **nunca lanza** | Un parser que revienta con basura no sobrevive a usuarios reales |
| Confianza ≤ 0.5 y campos en `null` | **No inventa datos.** Inventar sueño o presupuesto envenena los patrones |
| Devuelve `camposFaltantes` | Le dice al estudiante qué completar en vez de callarse |
| Historial vacío → no rompe, propone "registra" | El primer uso es el caso más común y el más frágil |
| Registros corruptos sin `analisis` → no rompe | Sobrevive a una copia de seguridad vieja o mal importada |

### CRÍTICO-4 · El levantamiento del campus llega corrupto

| Valida | Comportamiento esperado |
|---|---|
| CSV rotos (sin filas, comilla sin cerrar, columnas de menos) → no lanza | El dataset lo mantiene gente, no un compilador |
| Plato con `restaurant_id` inexistente → **se descarta** | No sabemos dónde queda ni cuándo abre: no se inventa la ficha |
| Plato sin precio → se descarta | Una recomendación sin precio no es una recomendación |
| `tiempo_cola_min` sin medir → **`null`, nunca `0`** | Tratarlo como cero premia al local que nadie cronometró |
| `vegetarian` vacío → **`null`, nunca `false`** | Vacío es *desconocido*, no *no* |
| `alergenos_ausentes_verificados` **siempre vacío** | **HU-04:** una carta no describe la cocina. Se afirma la presencia, jamás la ausencia |
| Cada `aporte` derivado guarda su regla y su cita | La clasificación es auditable, no "a ojo" |

### CRÍTICO-5 · Señal de restricción alimentaria

El fallo con consecuencias clínicas, y el único donde "seguir funcionando" sería
el error. Frase disparadora: `no quiero comer, me da culpa comer`.

| Valida | Comportamiento esperado |
|---|---|
| La contra-métrica se activa y **cita lo que la motivó** | Sin evidencia no se activa: no se diagnostica a nadie |
| `gamificacionActiva === false` | Se apaga la racha |
| `calcularInsignias()` devuelve `[]` | No se premia a alguien mientras el motor ve señales de restricción |
| La meta pasa a `acompanamiento`, `gamificable: false` | Se reemplaza por acompañamiento, no por otro reto |
| **La señal NO viaja** al reporte institucional | Si NUTRIA delata, nadie vuelve a escribir la verdad |
| **Ninguna frase** del estudiante viaja en el reporte | Se envían indicadores y bandas, nunca texto |
| Sin consentimiento el reporte **no es enviable** | El envío lo enciende el estudiante, no el sistema |
| El modo con nombre está **apagado** por defecto | Ley 29733: la universidad no se vuelve custodia de datos de salud |

---

## Resultado

```
✓ Camino feliz · una frase se convierte en una decisión      9 pruebas
✓ Crítico 1 · el mapeo de comida no carga                    6 pruebas
✓ Crítico 2 · el almacenamiento está bloqueado               3 pruebas
✓ Crítico 3 · el estudiante escribe cualquier cosa           5 pruebas
✓ Crítico 4 · el levantamiento del campus llega corrupto     6 pruebas
✓ Crítico 5 · señales de restricción alimentaria             6 pruebas
────────────────────────────────────────────────────────────
35 pruebas pasan · 0 fallan
```

Sumado a las 225 aserciones unitarias de `tests/test-analizador.html`, el
proyecto tiene **260 verificaciones automáticas** y ninguna dependencia de
ejecución.

---

## Cobertura y límites — lo que esta suite NO prueba

Decirlo importa tanto como lo que sí cubre:

- **No prueba la interfaz.** No hay DOM: se prueba el núcleo (parser, motor,
  almacén, dataset). Un botón mal puesto no lo detecta esta suite. El siguiente
  paso natural sería **Cypress** o **Playwright** sobre `index.html`, que ya se
  sirve estático y no necesita build.
- **No prueba el asistente opcional de Gemini** (`src/llm-analizador.js`): depende
  de una API externa y de una clave del usuario. Está diseñado para devolver
  `null` y no interrumpir; probarlo pide mocks de red.
- **No mide rendimiento.** El analizador tarda menos de 1 ms, pero eso no está
  bajo prueba automática.
- **No sustituye la prueba en dispositivo real**: el paso de "recorrer las 6
  pestañas a 375 px" sigue siendo manual y está en `CLAUDE.md`.

---

## Archivos

```
package.json                     Config de Jest. `devDependencies` únicamente.
tests/core/
├── nutria.core.test.js          La suite: 35 pruebas en sintaxis Jest
├── jest-shim.mjs                describe/it/expect mínimo, para correr sin npm
└── correr.mjs                   Runner sin dependencias (sale 1 si falla)
docs/TESTING.md                  Este documento
```
