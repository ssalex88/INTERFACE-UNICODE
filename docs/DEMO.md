# Guion de demo — 5 minutos

Objetivo: que el jurado vea **la tesis**, no una lista de features. Una decisión (procesar en el
dispositivo) con muchas consecuencias — incluida la que hace que alguien lo pague.

## Antes de empezar (2 minutos antes de subir)

1. Levanta el servidor: `python -m http.server 5180` y abre <http://localhost:5180>.
2. Entra con cualquier usuario (por ejemplo `camila.rojas@aloe.ulima.edu.pe`) y cualquier contraseña.
   El acceso todavía no valida contra el directorio de la universidad.
3. Ve a **Perfil → Cargar datos de ejemplo**.
4. En **Perfil → Perfil alimentario**, marca **lactosa** como intolerancia: es la que más se nota
   sobre el mapa real (media carta de Starbucks se descarta) y la vas a usar en el minuto 3.
5. Vuelve a la pestaña **Hoy**.
6. Ten abierta en otra pestaña <http://localhost:5180/tests/test-analizador.html> (225 en verde).
7. **Apaga el wifi si te animas.** La app sigue funcionando. Es el momento más barato de ganar el
   argumento entero.

---

## Minuto 1 — El problema, y cuándo se usa esto

Al entrar, lo primero es la consola del día: la hora corriendo, en qué momento estás, y seis
cápsulas que se van llenando.

> "El universitario peruano no tiene un problema de información: sabe que debería dormir más y comer
> mejor. Tiene un problema de fricción. Ninguna app que le pida pesar el arroz sobrevive a la segunda
> semana. NUTRIA le pide una frase.
>
> Pero la fricción no es solo cuánto cuesta escribir. Es no saber **cuándo**. Casi todas estas apps
> te dan un campo de texto vacío y te dejan adivinando si esto es un diario de la noche o algo que
> abres cuando te acuerdas. El que no sabe cuándo abrir, no abre.
>
> Así que la app lo dice: **una frase al día basta**, y hay tres momentos que sirven para cosas
> distintas. En la mañana me cuentas cuánto dormiste y con cuánta plata sales —es el único momento en
> que lo sabes—. Al mediodía yo te devuelvo: qué te alcanza y dónde. En la noche cierras el día, y si
> no abriste en todo el día, una frase acá lo deja completo igual.
>
> Nada es obligatorio, nada vence a medianoche, y registrar tres veces en un día no vale por tres
> días: la racha cuenta días, no tareas."

Toca dos **atajos** ("+ no almorcé", "+ me quedan S/10") y muestra cómo se arman en una frase, y
después escribe el resto a mano:

```
dormí 4 horas, no almorcé, me quedan S/12 y tengo entrega mañana
```

> "Los atajos no son campos de formulario disfrazados: escriben español y pasan por el mismo
> analizador que el texto libre. No hay una vía rápida que se salte las reglas."

## Minuto 2 — Lo que entendió, y por qué

Señala los chips: `4 h de sueño` · `almuerzo saltado` · `S/12` · `entrega`.

Abre el desplegable **"¿Por qué entendí eso?"**.

> "Esto son reglas y un diccionario de platos y jerga peruana corriendo acá, en el navegador. Tardó
> menos de un milisegundo y **envió cero bytes**. Y no es una caja negra: cada campo muestra el
> fragmento exacto del texto que lo justifica. En salud, si no puedes explicar la recomendación, no
> puedes corregirla."

## Minuto 3 — La recomendación, sobre el mapa real del campus

Pestaña **Comida**. Toca **S/8**, luego **S/12**, luego **S/16**, luego **S/20**, en vivo.

> "Esto no es un dataset de ejemplo. Son las cartas de los locales que están dentro de la Universidad
> de Lima y en el Óval: Bembos, Chinawok, Starbucks, Sushi Pop. Cada tarjeta trae de dónde salió el
> precio y cuándo se verificó."

Y ahí pasa lo interesante, que conviene **no esquivar**:

> "Con S/8 la app no me inventa un almuerzo. Me dice, textual: *con S/8 no te alcanza para un plato
> completo cerca del campus*, y me dice cuál es el más barato que sí lo es y cuánto me falta. Con
> S/16 ya aparece un menú completo; con S/20, el plato que trae proteína **y** verdura.
>
> Ese mensaje de S/8 no es un error nuestro. Es el hallazgo del levantamiento: dentro del campus, por
> debajo de S/12 lo que hay son snacks. Una app que te devolviera igual tres tarjetas ahí te estaría
> mintiendo, y esa mentira es exactamente la que hace que a la segunda semana nadie te crea."

Cada tarjeta trae el porqué al lado: proteína porque vienes durmiendo poco, verdura porque esta
semana no registraste ninguna, cerca porque tienes 25 minutos entre clases.

Y tres cosas que se ven en letra chica y valen el minuto:

> "La cola dice **'sin medir'**. Nadie la cronometró, así que no la inventamos ni la contamos como
> cero —contarla como cero sería premiar al local que nadie midió—. Es el dato que solo la comunidad
> puede poner, y por eso Comunidad existe.
>
> Si el estudiante declaró una alergia, esas opciones **no aparecen**: no bajan en la lista, se
> descartan antes de puntuar. Y fíjense en cómo lo decimos con lo que no sabemos: *no pudimos
> verificar si contiene maní*. Nunca 'seguro', nunca 'garantizado'. Una carta publicada no certifica
> una cocina, y prometer eso con un alérgeno es lo más irresponsable que podría hacer esta app.
>
> Lo otro es el tiempo. Si escribes *'tengo parcial en 40 minutos'*, NUTRIA no asume que tienes 40
> minutos para comer: descuenta el traslado y la entrada al aula."

Baja a **Dónde comer cerca**:

> "Veinte locales verificados, con horario y minutos a pie. Dieciséis de ellos dicen *'carta todavía
> sin levantar'*. Podríamos haberlos escondido y el mapa se vería completo. Están ahí porque el
> siguiente trabajo de campo es exactamente ese, y porque un mapa que solo enseña lo cómodo se siente
> completo sin estarlo."

## Minuto 4 — El motor de patrones (pestaña *Patrones*)

> "Acá está lo que un registro suelto no puede darte. No miramos días, miramos **ventanas móviles de
> 7, 14 y 28 días**."

Lee el patrón en voz alta:

> *"Esta semana te saltaste el almuerzo N veces, y N de esas fueron días de entrega."*

Abre **"Ver los días exactos"**.

> "Y de ahí sale la meta de la semana: no 'come sano', sino **'almuerza 3 días'**, calculada como tu
> línea base más uno. Pedirle 7 de 7 a alguien que viene de 2 es diseñar el abandono."

Toca a **Nutri**, abajo a la derecha.

> "Toda la gamificación vive acá y en ningún otro lado: racha, meta e insignias, y cada insignia se
> calcula de sus propios registros. No es una lista decorativa."

## Minuto 5 — Quién lo paga, y por qué el alumno igual confía

Pestaña **Perfil**.

> "Esto es gratis para el estudiante porque lo paga bienestar universitario. Y para pagarlo, la
> universidad necesita saber que funciona. Ese es el punto donde casi todas estas apps se rompen: o
> no le devuelven nada a quien paga, o le entregan la vida del alumno."

Baja hasta **Tu universidad** y muestra la tabla *"Exactamente esto es lo que se envía"*.

> "La universidad recibe **indicadores**: días registrados, adherencia, sueño **en rango**, presupuesto
> **en rango**, metas cumplidas. Nunca la frase, nunca el plato, nunca el monto exacto, nunca el ánimo.
> Y el modo con nombre está apagado: lo enciende el estudiante, no nosotros.
>
> El caso difícil también está resuelto: si el motor detecta señales de alimentación restrictiva,
> apagamos rachas e insignias, y ese dato **no viaja**. Se lo contamos al estudiante y le ofrecemos el
> canal de bienestar. Si NUTRIA delata, nadie vuelve a escribir la verdad en el campo de texto, y sin
> verdad no hay producto."

Cierra con el informe (**Perfil → Ver mi informe**):

> "Y esto es lo que se lleva el alumno: no un JSON, un informe que puede leer. Todo salió de una sola
> decisión —procesar en el dispositivo—. El jurado técnico oye plan B real, dato sensible que no sale
> del cliente y funcionamiento offline. El jurado de negocio oye costo marginal cerca de cero,
> producto gratis para siempre, y una universidad que recibe evidencia de impacto sin volverse
> custodia de datos de salud bajo la Ley 29733. Es la misma frase."

---

## Frases que están garantizadas en la demo

Están cubiertas por los tests, úsalas si improvisas:

| Frase | Qué demuestra |
|---|---|
| `dormí 4 horas, no almorcé, me quedan S/12 y tengo entrega mañana` | El caso completo |
| `casi no dormí por la PC, desayuné rápido, ando con 8 lucas y estresado` | Jerga peruana + sueño cualitativo |
| `no almorcé, cené tarde` | La negación **no** se contagia a la cena |
| `no almorcé ni cené` | La negación **sí** se encadena con "ni" |
| `estoy misio` | Presupuesto cero → cambia el mensaje, no inventa opciones |
| `me quedan 4 horas de clase` | **No** lo confunde con plata |
| `dormí 6 y media` / `dormí 7 horas y media` | Fracciones en las dos posiciones |
| `me acosté a las 2 y me levanté a las 7` | Rango horario → 5 h |

---

## Las 5 preguntas del jurado (respuestas cortas)

**"Esto ya existe, se llama Fitia."**
Fitia es excelente para quien ya decidió contar macros. Nosotros no contamos calorías a propósito:
atacamos la irregularidad de quien no va a registrar nada salvo que registrar cueste una frase.

**"¿Por qué no usan la API de GPT?"**
Tres razones, ninguna caprichosa: son datos de salud bajo Ley 29733 y con la nube la universidad se
vuelve custodia; el producto es gratis para el alumno y con API el costo sube exactamente cuando el
producto funciona; y el wifi de campus. La precisión no nos duele porque la mayoría de las frases las
resuelve un parser de reglas.

**"¿Y si el celular no aguanta el modelo?"**
El producto no depende del modelo. Puedes apagarme el wifi ahora mismo y la demo sigue. El asistente
extra es un botón opcional escondido en *Perfil → Opciones avanzadas*.

**"¿Cuándo se supone que el estudiante abre esto?"**
Una frase al día, a la hora que sea; ese es el mínimo y está escrito en la pantalla. Encima de eso
ofrecemos tres momentos que pagan distinto —mañana, mediodía, noche— y la app te muestra qué le
falta saber de hoy, sin reclamar nada. Es deliberado que el mínimo sea uno solo: la racha cuenta
días con registro, no momentos cumplidos, así que no podemos subirle la vara por la puerta de atrás.

**"¿Cómo saben que la gente va a volver?"**
No lo sabemos, y por eso es nuestra métrica norte y no un supuesto escondido: retención a la semana 3,
meta 35 %. Toda la arquitectura está subordinada a bajar el costo de registrar.

**"Si todo es local, ¿qué compra la universidad?"**
Compra evidencia de impacto sobre su propia población sin comprarse el riesgo legal de custodiar
datos de salud. El tablero agregado le dice si sus alumnos están comiendo y durmiendo mejor por
facultad; el informe nominal solo existe para los estudiantes que lo autorizan. Y es más viable en
privadas que en nacionales, donde el ciclo de compra es burocrático y más largo que un piloto.

---

## Plan B si algo falla en vivo

| Si falla | Qué haces |
|---|---|
| No cargan los CSV del levantamiento | La app cae sola a la semilla sintética y de ahí a un respaldo embebido: la recomendación sigue saliendo. Menciónalo como degradación elegante. |
| No hay internet en el venue | Mejor: es el argumento. La app funciona igual. |
| El asistente opcional no baja | Nunca lo pongas en el camino crítico de la demo. Muéstralo solo si sobra tiempo. |
| El navegador bloquea `localStorage` | El almacén cae a memoria y la app sigue; *Perfil → Tu privacidad* lo indica en pantalla. |
| Te preguntan si el mapeo de comida es real | Sí: son las cartas publicadas de 20 locales dentro de ULima y el Óval, con fuente y fecha por fila, y es lo que la app consume. Lo que falta —y está dicho en pantalla— es la carta de 16 locales y el tiempo de cola. Dilo así, sin adornos. |
| Te preguntan por qué con S/8 no recomienda un almuerzo | Porque con S/8 no alcanza y la app lo dice. Es el hallazgo del levantamiento, no un bug. |
| Te preguntan por el login | Es real como flujo, no como validación: entra cualquiera. Dilo sin rodeos y pasa a lo que sí está construido. |
