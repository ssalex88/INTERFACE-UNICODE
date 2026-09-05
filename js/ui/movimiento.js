/**
 * NUTRIA · Capa de movimiento
 * -----------------------------------------------------------------------------
 * Todo el movimiento de la interfaz vive acá, separado del render. Tres reglas,
 * tomadas de cómo se diseñan las interfaces fluidas:
 *
 *  1. La respuesta va en `pointerdown`, no en `click`. Esperar a que el dedo se
 *     levante para dar feedback se siente muerto.
 *  2. Nada de duraciones fijas para lo que el usuario puede interrumpir: la
 *     pastilla del dock la mueve un RESORTE que arranca desde donde está y con
 *     la velocidad que traía, así se puede cambiar de pestaña a media animación
 *     sin saltos.
 *  3. Si el sistema pide menos movimiento, se apaga el desplazamiento y queda
 *     solo un fundido. No es un extra: es parte del diseño.
 *
 * Cero dependencias: requestAnimationFrame y clases CSS.
 */

const menosMovimiento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Resorte crítico ---------------------------------------------------------
/**
 * Integrador de resorte para un conjunto de valores nombrados.
 * `respuesta` es el tiempo aproximado en llegar al destino (segundos);
 * `amortiguacion` 1 = sin rebote, <1 = rebota.
 * Reapuntar conserva posición y velocidad: por eso es interrumpible.
 */
function crearResorte({ respuesta = 0.36, amortiguacion = 1, alPintar }) {
  const w = (2 * Math.PI) / respuesta;
  const estado = new Map();   // nombre -> { x, v, objetivo }
  let animando = false;
  let ultimo = 0;

  function paso(ahora) {
    const dt = Math.min((ahora - ultimo) / 1000, 1 / 30);
    ultimo = ahora;
    let vivo = false;

    for (const s of estado.values()) {
      const d = s.x - s.objetivo;
      const a = -w * w * d - 2 * amortiguacion * w * s.v;
      s.v += a * dt;
      s.x += s.v * dt;
      if (Math.abs(s.x - s.objetivo) > 0.15 || Math.abs(s.v) > 0.15) vivo = true;
      else { s.x = s.objetivo; s.v = 0; }
    }

    alPintar(Object.fromEntries(Array.from(estado, ([k, s]) => [k, s.x])));
    if (vivo) requestAnimationFrame(paso);
    else animando = false;
  }

  return {
    /** Fija el destino. Si `inmediato`, salta sin animar (primer pintado). */
    apuntar(objetivos, inmediato = false) {
      for (const [nombre, valor] of Object.entries(objetivos)) {
        const s = estado.get(nombre) || { x: valor, v: 0, objetivo: valor };
        s.objetivo = valor;
        if (inmediato) { s.x = valor; s.v = 0; }
        estado.set(nombre, s);
      }
      if (inmediato || menosMovimiento()) {
        for (const s of estado.values()) { s.x = s.objetivo; s.v = 0; }
        alPintar(Object.fromEntries(Array.from(estado, ([k, s]) => [k, s.x])));
        return;
      }
      // Si la pestaña dejó de pintar a media animación, requestAnimationFrame
      // no vuelve y el bucle se quedaría colgado creyéndose vivo. Si pasó
      // demasiado desde el último frame, lo damos por muerto y arrancamos otro.
      if (animando && performance.now() - ultimo > 250) animando = false;
      if (!animando) { animando = true; ultimo = performance.now(); requestAnimationFrame(paso); }
    }
  };
}

// --- Pastilla del dock -------------------------------------------------------
let resorteDock = null;
let indicadorListo = false;

function nodoIndicador() { return document.querySelector('.tabs__indicador'); }

export function sincronizarIndicador({ inmediato = false } = {}) {
  const indicador = nodoIndicador();
  const activo = document.querySelector('.tabs__boton--activo');
  if (!indicador || !activo) return;

  // Con el dock oculto (pantalla de acceso) no hay nada que medir, y reintentar
  // en cada frame sería un bucle de rAF que nunca termina.
  if (activo.offsetParent === null) return;

  const contenedor = indicador.parentElement;
  const caja = activo.getBoundingClientRect();
  const cajaPadre = contenedor.getBoundingClientRect();

  // Si todavía no hay layout (pestaña oculta, primer frame), no medimos basura:
  // lo reintentamos en el próximo frame que sí pinte.
  if (!caja.width || !caja.height || !cajaPadre.width) {
    requestAnimationFrame(() => sincronizarIndicador({ inmediato: true }));
    return;
  }

  const vertical = window.matchMedia('(min-width: 900px)').matches;

  if (!resorteDock) {
    resorteDock = crearResorte({
      respuesta: 0.34,
      amortiguacion: 1,
      alPintar: ({ x, y, ancho, alto }) => {
        const nodo = nodoIndicador();
        if (!nodo) return;
        nodo.style.transform = `translate(${x}px, ${y}px)`;
        nodo.style.width = `${ancho}px`;
        nodo.style.height = `${alto}px`;
      }
    });
  }

  const destino = vertical
    ? { x: 0, y: caja.top - cajaPadre.top, ancho: caja.width, alto: caja.height }
    : { x: caja.left - cajaPadre.left, y: 0, ancho: caja.width, alto: caja.height };

  resorteDock.apuntar(destino, inmediato || !indicadorListo);
  if (!indicadorListo) {
    indicadorListo = true;
    requestAnimationFrame(() => indicador.classList.add('tabs__indicador--listo'));
  }
}

// --- Entrada de la vista -----------------------------------------------------
/**
 * Revela en cascada los bloques de la vista recién pintada. `direccion` es +1 si
 * se avanzó en el orden de pestañas y -1 si se retrocedió: el contenido entra
 * desde el lado al que corresponde, que es lo que la gente espera espacialmente.
 */
export function animarEntrada(contenedor, direccion = 0) {
  if (!contenedor) return;

  // Reiniciar la animación exige sacar la clase, forzar un reflujo y volver a
  // ponerla; si no, el navegador la considera "la misma" y no la repite.
  contenedor.classList.remove('aparece');
  void contenedor.offsetWidth;
  contenedor.style.setProperty('--dx', menosMovimiento() ? '0px' : `${direccion * 16}px`);
  contenedor.classList.add('aparece');

  // Al terminar se quita la clase: si se deja puesta, cada sección se queda en
  // su propia capa de composición para siempre, y eso se paga en cada scroll.
  // El estado natural (sin clase) ya es el visible, así que quitarla es seguro.
  clearTimeout(animarEntrada._t);
  animarEntrada._t = setTimeout(() => contenedor.classList.remove('aparece'), 800);

  ajustarCampos(contenedor);
}

/**
 * El textarea del compositor crece con lo que se escribe, sin barra interna.
 * Vacío se queda en su altura de CSS: medir `scrollHeight` antes del primer
 * layout devuelve basura en algunos motores, y con el campo vacío no hay nada
 * que medir de todos modos.
 */
const ALTO_MAXIMO = 320;

function crecer(campo) {
  if (!campo.value) { campo.style.height = ''; return; }
  campo.style.height = 'auto';
  campo.style.height = `${Math.min(campo.scrollHeight, ALTO_MAXIMO)}px`;
  campo.style.overflowY = campo.scrollHeight > ALTO_MAXIMO ? 'auto' : 'hidden';
}

export function ajustarCampos(raiz = document) {
  requestAnimationFrame(() => {
    for (const campo of raiz.querySelectorAll('textarea[data-crece]')) crecer(campo);
  });
}

// --- Gráfico de sueño: la ficha de cada noche -------------------------------
/**
 * El gráfico de sueño dibuja una zona sensible por noche y una ficha oculta por
 * noche. Acá solo se decide cuál está visible.
 *
 * Tres entradas, no una: puntero (hover), toque (pointerdown) y teclado (focus
 * sobre la zona, que es un elemento enfocable). Un dato que solo aparece con
 * mouse no está publicado, está escondido detrás de un periférico.
 *
 * Se conecta por delegación en `document`, así sobrevive a que la vista se
 * repinte entera —que es lo que pasa en cada registro— sin volver a conectar
 * nada.
 */
function mostrarNoche(grafico, indice) {
  for (const ficha of grafico.querySelectorAll('[data-ficha]')) {
    ficha.hidden = ficha.dataset.ficha !== String(indice);
  }
  for (const punto of grafico.querySelectorAll('[data-punto]')) {
    punto.classList.toggle('grafico__punto--activo', punto.dataset.punto === String(indice));
  }
  const pista = grafico.querySelector('[data-pista]');
  if (pista) pista.hidden = true;
}

function ocultarNoches(grafico) {
  for (const ficha of grafico.querySelectorAll('[data-ficha]')) ficha.hidden = true;
  for (const punto of grafico.querySelectorAll('[data-punto]')) punto.classList.remove('grafico__punto--activo');
  const pista = grafico.querySelector('[data-pista]');
  if (pista) pista.hidden = false;
}

function activarGraficoSueno() {
  const zonaDe = (destino) => (destino && destino.closest ? destino.closest('[data-noche]') : null);

  const mostrar = (evento) => {
    const zona = zonaDe(evento.target);
    if (!zona) return;
    const grafico = zona.closest('[data-grafico-sueno]');
    if (grafico) mostrarNoche(grafico, zona.dataset.noche);
  };

  document.addEventListener('pointerover', mostrar);
  document.addEventListener('focusin', mostrar);
  // En táctil no hay "over": el toque sobre la franja es lo que abre la ficha.
  document.addEventListener('pointerdown', mostrar);

  const ocultar = (evento) => {
    const grafico = evento.target.closest ? evento.target.closest('[data-grafico-sueno]') : null;
    if (!grafico) return;
    // Solo se cierra al salir del gráfico entero, no al pasar de una noche a la
    // de al lado: si no, la ficha parpadea en cada paso del mouse.
    if (evento.relatedTarget && grafico.contains(evento.relatedTarget)) return;
    ocultarNoches(grafico);
  };

  document.addEventListener('pointerout', ocultar);
  document.addEventListener('focusout', ocultar);

  // Un toque en cualquier otro lado cierra la ficha abierta en táctil.
  document.addEventListener('pointerdown', (evento) => {
    if (zonaDe(evento.target)) return;
    for (const grafico of document.querySelectorAll('[data-grafico-sueno]')) ocultarNoches(grafico);
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    for (const grafico of document.querySelectorAll('[data-grafico-sueno]')) ocultarNoches(grafico);
  });
}

// --- Feedback háptico --------------------------------------------------------
/**
 * Solo para momentos con significado: guardar un registro, no cada toque.
 * Sin interacción previa el navegador lo bloquea y ensucia la consola, así que
 * ni lo intentamos.
 */
export function pulsoHaptico(ms = 12) {
  if (!navigator.vibrate) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate(ms); } catch (_) { /* da igual */ }
}

// --- Conexión global ---------------------------------------------------------
const PRESIONABLE = '.boton, .tabs__boton, .monto, .boton--sugerencia, .nutri__boton';

export function activarMovimiento() {
  // 1. Respuesta al toque en el mismo frame en que baja el puntero.
  document.addEventListener('pointerdown', (e) => {
    const nodo = e.target.closest(PRESIONABLE);
    if (nodo && !nodo.disabled) nodo.classList.add('presionado');
  }, { passive: true });

  const soltar = () => {
    for (const nodo of document.querySelectorAll('.presionado')) nodo.classList.remove('presionado');
  };
  document.addEventListener('pointerup', soltar, { passive: true });
  document.addEventListener('pointercancel', soltar, { passive: true });
  document.addEventListener('dragend', soltar, { passive: true });
  window.addEventListener('blur', soltar);

  // 2. La cabecera se densifica cuando hay contenido pasando por debajo:
  //    un borde de scroll, en vez de una línea dura permanente.
  const cabecera = document.querySelector('.cabecera');
  let ticking = false;
  const revisarScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (cabecera) cabecera.dataset.scroll = window.scrollY > 6 ? 'si' : 'no';
      ticking = false;
    });
  };
  document.addEventListener('scroll', revisarScroll, { passive: true });
  revisarScroll();

  // 3. Montos rápidos de presupuesto: rellenan el campo y reenvían el mismo
  //    formulario que ya maneja app.js (no duplicamos lógica de negocio).
  document.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-monto]');
    if (!boton) return;
    const campo = document.querySelector('#presupuesto');
    const formulario = document.querySelector('#form-presupuesto');
    if (!campo || !formulario) return;
    campo.value = boton.dataset.monto;
    if (formulario.requestSubmit) formulario.requestSubmit();
    else formulario.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  // 4. El textarea crece mientras se escribe.
  document.addEventListener('input', (e) => {
    if (e.target.matches('textarea[data-crece]')) crecer(e.target);
  });

  // 5. Fichas del gráfico de sueño (hover, toque y teclado).
  activarGraficoSueno();

  // 6. La pastilla se recoloca si cambia el ancho (dock ↔ riel de escritorio)
  //    y al volver a la pestaña, por si se quedó a medio camino.
  let temporizador = null;
  window.addEventListener('resize', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => sincronizarIndicador({ inmediato: true }), 90);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizarIndicador({ inmediato: true });
  });
}
