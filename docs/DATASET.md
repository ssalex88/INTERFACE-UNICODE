# El dataset gastronómico del campus

El mapeo de comida (Bloque 4.4 de la propuesta) es el activo más difícil de copiar del proyecto:
**no existe en ninguna fuente pública**. Google Maps tiene los locales, pero no tiene si alcanza con
S/8, ni cuánto dura la cola a la 1 p.m., ni si ese precio sigue siendo el de la ventanilla.

## Estado actual

| Carpeta | Qué es | ¿Lo usa la app? |
|---|---|---|
| `dataset/` | Levantamiento **real**: 20 establecimientos y 65 platos con lat/long, horarios, minutos a pie y fuente citada por fila | **Sí. Es lo que se ve en pantalla.** |
| `data/menus-semilla.json` | 24 opciones **sintéticas** con las que se construyó el motor | Solo como respaldo si `dataset/` no carga |

`js/datos/menus.js` intenta el levantamiento primero y cae a la semilla —y de ahí a un respaldo
embebido— avisando en consola. `_meta.origen` deja escrito de dónde salió lo que se está mostrando.

## Cómo se conecta

`js/datos/csv.js` lee los CSV en el navegador (comillas, comas dentro del campo, CRLF; sin
dependencias) y `js/datos/ulima.js` los traduce al esquema del motor:

| Campo que espera el motor | De dónde sale |
|---|---|
| `plato`, `precio` | `dishes.name`, `dishes.price_pen` |
| `establecimiento`, `zona` | `restaurants.name`, `restaurants.location_reference` |
| `caminando_min` | `restaurants.walking_time_min` |
| `horario`, `dias` | `restaurants.opening_hours`, parseando `"Lun-Dom: 07:00-22:00"` |
| `vegetariano` | `dishes.vegetarian` (vacío = **desconocido**, no `false`) |
| `categoria` | `dishes.category` / `subcategory`, remapeadas al vocabulario cerrado de abajo |
| `etiquetas`, `aporte`, `alergenos_presentes` | **derivados**, con la regla escrita al lado |

### Los dos campos que el levantamiento no trae

La regla de calidad del propio dataset es clara: *"es preferible dejar un campo en `null` que
inventar un dato"*. Se aplicó literal.

**`tiempo_cola_min` queda en `null`.** Nadie cronometró la cola de la 1 p.m., y ponerle un número
plausible sería inventar el dato que más pesa en la decisión de un estudiante con 25 minutos entre
clases. El recomendador deja de puntuar por ese término cuando falta, en vez de tratarlo como cero
—que sería premiar al local que nadie midió frente al que sí—. En pantalla se dice *"cola sin
medir"*. Levantarlo es trabajo de campo; ver el procedimiento más abajo.

**`aporte` sí se deriva, pero de forma auditable.** Es la señal que más pesa en el puntaje, así que
no se clasifica a ojo: cada valor guarda la regla que lo produjo y el ingrediente exacto de la carta
que la disparó, en `aporte_derivacion`. Es la misma exigencia de explicabilidad que se le pide al
analizador de frases.

```js
{ proteina: 'alta',  regla: 'proteína animal declarada en un plato principal', cita: 'pollo' }
{ verdura:  'alta',  regla: 'la verdura es parte del plato, no un adorno',     cita: 'ensalada' }
```

Dos criterios que costó afinar y conviene no perder:

- **La lechuga y el tomate de una hamburguesa no son una ensalada.** Para `verdura: alta` hace falta
  una palabra de plato (`ensalada`, `verduras`, `coleslaw`, `guacamole`…) o tres verduras distintas.
  Sin esta regla, una hamburguesa con queso puntuaba igual que un menú con ensalada.
- **Los léxicos se buscan como principio de palabra, no como subcadena.** Buscar `res` suelto hacía
  que un *esp**res**so* tuviera proteína animal, y `ebi` aparecía dentro de *b**ebi**da*.

### Alérgenos: se afirma la presencia, nunca la ausencia

De los ingredientes publicados se puede afirmar que algo **está** (si la carta dice "queso", hay
lácteo). No se puede afirmar que algo **no está**: una carta no describe la cocina, ni la sartén
compartida, ni el aceite. Por eso `alergenos_ausentes_verificados` queda **siempre vacío** y todo lo
no detectado viaja como `alergenos_no_verificados`, que la interfaz muestra como *"no pudimos
verificar si contiene…"*. Es lo que exige HU-04 y la regla 7 del proyecto.

### Las columnas de calorías se ignoran a propósito

`dishes.csv` trae `calories`, `protein_g`, `carbs_g` y `fat_g`. Están vacías y **deben quedarse
vacías**: es una decisión de producto, no una limitación técnica. El Bloque 3 dice que NUTRIA no
cuenta calorías ni pide peso. Conectar ese campo sería abrir la puerta a que la interfaz lo muestre
algún día, y con eso se cae la contra-métrica entera. **No lo conectes.**

## Lo que el mapeo real destapó (y la app ahora dice)

De los 20 establecimientos verificados, solo **4 tienen carta levantada**: Bembos, Chinawok,
Starbucks y Sushi Pop. Los 16 restantes —que son justo los de menú barato— están ubicados y
verificados pero sin platos, y la app los muestra como *"carta todavía sin levantar"* en vez de
esconderlos.

La consecuencia es incómoda y es verdad: **con lo que hoy está levantado, por debajo de S/12 no
alcanza para un plato completo dentro del campus.** Lo más barato que sí es una comida es la
Personal Clásica de Bembos a S/12.90; debajo de eso son snacks, guarniciones y café. El recomendador
lo detecta (`sinPlatoCompleto`) y lo dice con todas sus letras en vez de devolver tres tarjetas
fingiendo que con S/8 se almuerza.

Eso no es un defecto de la app: es el hallazgo. Y marca cuál es el siguiente trabajo de campo.

## Cómo se levantó (y cómo se sigue levantando)

`dataset/README.md` documenta la metodología, las fuentes y los niveles de confianza de lo que ya
está hecho. Meta del piloto: **60+ opciones** alrededor del campus. El procedimiento para las que
faltan:

1. **Recorrido a pie**, en dos franjas: 6:30–10:30 (desayuno) y 11:30–15:30 (almuerzo). El horario
   importa tanto como el precio.
2. Por cada opción se registra:

   | Campo | Cómo se obtiene |
   |---|---|
   | `plato` | Lo que dice la pizarra, tal cual |
   | `establecimiento`, `zona` | Nombre y referencia peatonal desde la puerta de la facultad |
   | `precio` | Lo que se cobra en ventanilla, no el de la app de delivery |
   | `tiempo_cola_min` | Cronometrado en hora punta (12:45–13:15) |
   | `caminando_min` | A pie desde la puerta, no en línea recta |
   | `horario`, `dias` | Preguntado al local, no asumido |
   | `categoria`, `etiquetas`, `aporte` | Clasificación cualitativa nuestra (ver abajo) |
   | `vegetariano` | Solo si hay una opción sin carne **de verdad** disponible ese día |

3. **Verificación cruzada:** dos personas distintas confirman precio y horario. El precio es el campo
   que más se desactualiza y el que la comunidad más corrige.

## Vocabulario controlado

Cambiar estos valores implica tocar `motor/recomendador.js`, así que se mantienen cerrados:

- `categoria`: `menu_completo` · `plato_fuerte` · `sopa` · `sandwich` · `ensalada` · `snack` ·
  `desayuno` · `entrada` · `guarnicion` · `bebida`.
  Las tres últimas existen porque la carta real las tiene (una gaseosa, unas papas, una salsa), pero
  **nunca son la respuesta a "qué como"**: entran con encaje y completitud bajísimos en toda franja y
  están excluidas de la "alternativa más barata". Ofrecer *wasabi, S/2* como la opción económica del
  almuerzo sería una burla, no un ahorro.
- `etiquetas`: `caliente` · `contundente` · `ligero` · `rapido` · `economico` · `proteina_animal` ·
  `vegetariano` · `verdura` · `menestra` · `sopa` · `frito` · `ultraprocesado` · `reconstituyente` ·
  `desayuno` · `noche` · `compartir`
- `aporte`: descripción **cualitativa** (`alta` / `media` / `baja`) de `proteina`, `verdura` y
  `carbohidrato`.

### Por qué `aporte` es cualitativo y no tiene calorías

Es una decisión de producto, no una limitación técnica. El Bloque 3 de la propuesta dice que NUTRIA
no cuenta calorías ni pide peso. Poner un campo `kcal` en el dataset sería abrir la puerta a que la
interfaz lo muestre algún día, y con eso se cae la contra-métrica entera. **No agregues ese campo.**

## Cómo la comunidad lo mantiene vivo

En el piloto, las reseñas (hoy con contenido de ejemplo en `js/ui/comunidad.js`) son el mecanismo de
actualización:
el estudiante corrige el precio cuando sube, y esa corrección mejora la recomendación de todos los
demás. Es el efecto de red del Bloque 6: cada campus nuevo mejora el producto para todos.

## Agregar una opción

Agrega una fila a `dataset/dishes.csv` con su `restaurant_id`, su `price_pen` y —esto es lo que hace
que la fila valga— su `source_url` y su `verified_at`. Los campos derivados (`categoria`,
`etiquetas`, `aporte`, alérgenos) los calcula `js/datos/ulima.js` al cargar; si el plato es de un
tipo que el mapa de categorías no cubre, agrégalo ahí y no en la fila.

Si el establecimiento es nuevo, va primero a `dataset/restaurants.csv` con su `opening_hours` en el
formato `"Lun-Dom: 07:00-22:00"` (si el horario no se puede leer, el sitio queda como "horario sin
confirmar" en vez de darse por abierto). Un plato cuyo `restaurant_id` no existe se descarta en
silencio: no sabemos ni dónde queda ni cuándo abre, y no se inventa la ficha.

El levantamiento se valida solo al cargar: si los CSV están rotos o vacíos, `js/datos/menus.js` cae a
la semilla sintética y de ahí al respaldo embebido, avisando en consola en vez de romper la app.
