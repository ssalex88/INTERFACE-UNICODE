/**
 * NUTRIA · La mascota (Nutri)
 * -----------------------------------------------------------------------------
 * Acompaña visualmente el progreso y reacciona a metas, rachas y regresos.
 * NO es un chatbot y NO opina sobre el cuerpo de nadie: solo cambia de cara.
 *
 * Nutri vive fija en la esquina inferior derecha y es el único lugar donde la
 * app gamifica. Antes las rachas y las insignias estaban repartidas entre el
 * encabezado de cada pantalla y una sección perdida al final de Comunidad, que
 * es donde nadie las buscaba: ahora todo eso vive detrás de tocar a la nutria.
 *
 * Estados: neutral · feliz · racha · extrano · cuidado
 * El estado `cuidado` es el que aparece cuando la contra-métrica de restricción
 * se activa: ahí la mascota deja de celebrar, se apagan racha e insignias y
 * baja el volumen.
 *
 * Dibujo: SVG inline, sin assets ni red. Todos los colores salen de las
 * variables CSS, así que la nutria cambia sola entre modo claro y oscuro y
 * hereda el contraste alto del sistema si el usuario lo pide.
 *
 * El dibujo es provisional y está aislado en `svgMascota()`: reemplazarlo por la
 * ilustración definitiva es cambiar una función, no tocar la app.
 */

import { icono } from './iconos.js';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const COPIAS = {
  neutral: [
    'Cuéntame cómo te fue hoy.',
    'Una frase basta. No hay formulario.',
    'Acá sigo, sin apuro y sin nube.'
  ],
  feliz: [
    '¡Eso! Vas cumpliendo tu meta.',
    'Bien ahí. Justo lo que te pediste.',
    'La meta de la semana va en camino.'
  ],
  racha: [
    '¡{n} días seguidos registrando!',
    'Racha de {n} días. Eso es constancia, no suerte.',
    '{n} días al hilo. La semana 3 es la que cuenta.'
  ],
  extrano: [
    'Te extrañé. La racha se reinicia, el historial no.',
    'Volviste, y eso es lo único que importa hoy.'
  ],
  cuidado: [
    'Hoy no toca competir.',
    'Estoy acá, sin puntajes.'
  ]
};

/**
 * Decide el estado a partir del análisis de patrones y del progreso de la meta.
 * El orden de las condiciones es la política del producto: cuidado > racha > feliz.
 */
export function estadoDeMascota({ patrones, progresoMeta }) {
  if (!patrones) return { estado: 'neutral', datos: {} };
  if (patrones.restriccion.activa) return { estado: 'cuidado', datos: {} };

  const volvio = patrones.patrones.some((p) => p.id === 'regreso');
  if (volvio) return { estado: 'extrano', datos: {} };

  if (patrones.racha.dias >= 3) return { estado: 'racha', datos: { n: patrones.racha.dias } };
  if (progresoMeta && progresoMeta.hechos > 0) return { estado: 'feliz', datos: {} };
  return { estado: 'neutral', datos: {} };
}

export function fraseMascota(estado, datos = {}) {
  const lista = COPIAS[estado] || COPIAS.neutral;
  const frase = lista[Math.floor(Math.random() * lista.length)];
  return frase.replace('{n}', datos.n ?? '');
}

/// --- Núcleo Biométrico Health OS (Rebranding Profesional) --------------------

let secuencia = 0;

/**
 * SVG del Núcleo de Bienestar NUTRIA (Health OS).
 * Representación minimalista y tecnológica del estado del estudiante.
 * @param {string} estado  neutral | feliz | racha | extrano | cuidado
 */
export function svgMascota(estado = 'neutral') {
  const uid = `core-${++secuencia}`;
  const e = ['neutral', 'feliz', 'racha', 'extrano', 'cuidado'].includes(estado) ? estado : 'neutral';

  // Configuración de color y trazos según estado
  const CONFIG = {
    // `rot` va en grados SIN unidad: el atributo transform de SVG no es el
    // transform de CSS y "45deg" invalida la rotación completa.
    neutral: { color: 'var(--rio)', aura: 'rgba(16, 185, 129, .18)', dash: '180 80', rot: 0 },
    feliz:   { color: 'var(--ok)',  aura: 'rgba(16, 185, 129, .28)', dash: '240 40', rot: 45 },
    racha:   { color: 'var(--aji)', aura: 'rgba(244, 63, 94, .28)',  dash: '260 20', rot: 90 },
    extrano: { color: '#6366f1',    aura: 'rgba(99, 102, 241, .2)',  dash: '140 100', rot: -30 },
    cuidado: { color: '#8b5cf6',    aura: 'rgba(139, 92, 246, .2)',  dash: '120 120', rot: 180 }
  };

  const cfg = CONFIG[e];

  return `
<svg class="mascota mascota--${e}" viewBox="0 0 120 120" role="img"
     aria-label="NUTRIA Health Core en estado ${e}">
  <defs>
    <radialGradient id="halo-${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${cfg.color}" stop-opacity="0.25"/>
      <stop offset="70%" stop-color="${cfg.color}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${cfg.color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="anillo-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${cfg.color}"/>
      <stop offset="100%" stop-color="var(--rio-vivo, ${cfg.color})"/>
    </linearGradient>
  </defs>

  <g class="mascota__cuerpo">
    <!-- Halo difuso tecnológico -->
    <circle cx="60" cy="60" r="54" fill="url(#halo-${uid})"/>

    <!-- Pista exterior sutil -->
    <circle cx="60" cy="60" r="46" fill="none" stroke="var(--linea)" stroke-width="2"/>

    <!-- Anillo activo de pulso -->
    <circle cx="60" cy="60" r="46" fill="none" stroke="url(#anillo-${uid})" stroke-width="3.5"
            stroke-dasharray="${cfg.dash}" stroke-linecap="round"
            transform="rotate(${cfg.rot} 60 60)"/>

    <!-- Superficie central de cristal oscuro / claro -->
    <circle cx="60" cy="60" r="36" fill="var(--superficie)" stroke="var(--linea)" stroke-width="1.5"/>

    <!-- Biometric Mark: Emblema N tecnológico -->
    <g stroke="${cfg.color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M47 71V49l13 14 13-14v22"/>
      <circle cx="73" cy="49" r="2.2" fill="${cfg.color}" stroke="none"/>
    </g>

    <!-- Indicador de pulso vital central -->
    <circle cx="60" cy="74" r="2" fill="${cfg.color}"/>
  </g>
</svg>`.trim();
}

// --- Nutri flotante: la esquina de la gamificación --------------------------
/**
 * Distintivo que Nutri lleva encima. Uno solo, y en este orden de prioridad:
 * cuidado (nada) > racha > meta cumplida > insignia recién obtenida > nada.
 */
function distintivo({ racha, progresoMeta, insigniaNueva, gamificar }) {
  if (!gamificar) return '';
  if (racha >= 2) {
    return `<span class="nutri__marca nutri__marca--fuego">${icono('fuego', { tam: 12 })}<b>${racha}</b></span>`;
  }
  if (progresoMeta && progresoMeta.cumplida) {
    return `<span class="nutri__marca nutri__marca--ok">${icono('check', { tam: 12 })}</span>`;
  }
  if (insigniaNueva) {
    return `<span class="nutri__marca nutri__marca--insignia">${icono(insigniaNueva.icono, { tam: 12 })}</span>`;
  }
  return '';
}

/** Frase corta del globo: lo primero que se lee al abrir la app. */
function globo({ racha, progresoMeta, gamificar, frase, restriccion }) {
  if (!gamificar) return restriccion?.mensaje ? 'Hoy no toca competir. Estoy acá igual.' : frase;
  if (racha >= 2) return `¡${racha} días seguidos! No sueltes la racha.`;
  if (progresoMeta && progresoMeta.cumplida) return '¡Meta de la semana cumplida!';
  if (progresoMeta && progresoMeta.meta && progresoMeta.meta.gamificable && progresoMeta.hechos > 0) {
    return `Vas ${Math.min(progresoMeta.hechos, progresoMeta.objetivo)} de ${progresoMeta.objetivo} de tu meta.`;
  }
  return frase;
}

function barraInsignia(i) {
  return `
    <div class="insignia ${i.obtenida ? 'insignia--lograda' : 'insignia--bloqueada'}">
      <span class="insignia__icono" aria-hidden="true">${icono(i.icono, { tam: 19 })}</span>
      <span class="insignia__nombre">${escapar(i.nombre)}</span>
      <span class="insignia__criterio">${escapar(i.criterio)}</span>
      ${i.obtenida
        ? '<span class="insignia__estado">Conseguida</span>'
        : `<span class="insignia__barra"><span style="width:${i.porcentaje}%"></span></span>
           <span class="insignia__estado">${i.hechos} de ${i.objetivo}</span>`}
    </div>`;
}

/**
 * Asigna la ilustración de la nutria según los días de racha consecutivos:
 * - Imagen 1 (Nutria1.png): 0 a 5 días (inicio y primera semana)
 * - Imagen 2 (Nutria2.png): 6 a 10 días (segunda semana)
 * - Imagen 3 (Nutria3.png): 11 a 15 días (tercera semana en curso)
 * - Imagen 4 (Nutria4.png): 16 a 20 días (consolidación de constancia)
 * - Imagen 5 (Nutria5.png): 21+ días (hábito formado / maestría)
 * @param {number} dias Días consecutivos de racha
 * @returns {string} Ruta a la imagen correspondiente
 */
export function imagenRacha(dias = 0) {
  const d = Math.max(0, Number(dias) || 0);
  if (d <= 5) return './racha-nutria/Nutria1.png';
  if (d <= 10) return './racha-nutria/Nutria2.png';
  if (d <= 15) return './racha-nutria/Nutria3.png';
  if (d <= 20) return './racha-nutria/Nutria4.png';
  return './racha-nutria/Nutria5.png';
}

export function infoNivelRacha(dias = 0) {
  const d = Math.max(0, Number(dias) || 0);
  if (d <= 5) return { nivel: 1, titulo: 'Nutri Inicial', rango: '1 a 5 días' };
  if (d <= 10) return { nivel: 2, titulo: 'Nutri Constante', rango: '6 a 10 días' };
  if (d <= 15) return { nivel: 3, titulo: 'Nutri Enfocada', rango: '11 a 15 días' };
  if (d <= 20) return { nivel: 4, titulo: 'Nutri Avanzada', rango: '16 a 20 días' };
  return { nivel: 5, titulo: 'Nutri Maestra (21+)', rango: '21+ días' };
}

/**
 * Widget completo (botón + globo + panel). Vive fuera de #vista para no
 * repintarse ni perder el estado al cambiar de pestaña.
 *
 * @param {object} estado estado global de la app
 */
export function renderNutriFlotante(estado) {
  const { patrones, progresoMeta, estadoMascota, insignias = [], nutriAbierto, nutriGlobo } = estado;
  const gamificar = !patrones || patrones.gamificacionActiva;
  const racha = patrones ? patrones.racha.dias : 0;
  const imgUrl = imagenRacha(racha);
  const nivel = infoNivelRacha(racha);
  const logradas = insignias.filter((i) => i.obtenida);
  const siguiente = insignias.find((i) => !i.obtenida) || null;
  const mensaje = globo({
    racha, progresoMeta, gamificar,
    frase: estadoMascota.frase,
    restriccion: patrones && patrones.restriccion
  });

  const etiqueta = gamificar && racha > 0
    ? `Nutri. Racha de ${racha} ${racha === 1 ? 'día' : 'días'}. ${nivel.titulo}. Abrir tu progreso.`
    : 'Nutri. Abrir tu progreso.';

  return `
    <div class="nutri ${nutriAbierto ? 'nutri--abierta' : ''}">
      <div class="nutri__globo ${nutriGlobo ? 'nutri__globo--visible' : ''}" role="status" aria-live="polite">
        ${escapar(mensaje)}
      </div>

      <button class="nutri__boton" type="button" data-accion="nutri" aria-expanded="${nutriAbierto ? 'true' : 'false'}"
        aria-controls="nutri-panel" aria-label="${escapar(etiqueta)}">
        <span class="nutri__arte">
          <img src="${imgUrl}" class="nutri__img" alt="Nutria compañera - ${escapar(nivel.titulo)}">
        </span>
        ${distintivo({ racha, progresoMeta, insigniaNueva: logradas[0], gamificar })}
      </button>

      <div class="nutri__panel" id="nutri-panel" ${nutriAbierto ? '' : 'hidden'}>
        <div class="nutri__cabecera" style="align-items:center;gap:.75rem;">
          <div style="width:46px;height:46px;flex:none;border-radius:50%;overflow:hidden;background:rgba(255,255,255,0.06);border:1px solid var(--linea);padding:2px;">
            <img src="${imgUrl}" style="width:100%;height:100%;object-fit:contain;" alt="Nutria ${escapar(nivel.titulo)}">
          </div>
          <div style="flex:1;min-width:0;">
            <p class="nutri__frase" style="margin:0 0 .15rem;">${escapar(estadoMascota.frase)}</p>
            <span class="micro" style="color:var(--rio);font-weight:600;">${escapar(nivel.titulo)} · ${escapar(nivel.rango)}</span>
          </div>
          <button class="nutri__cerrar" type="button" data-accion="nutri-cerrar" aria-label="Cerrar">
            ${icono('veto', { tam: 16 })}
          </button>
        </div>

        ${gamificar ? `
          <div class="nutri__cifras">
            <div class="nutri__cifra">
              <span class="nutri__valor">${racha}</span>
              <span class="nutri__rotulo">${racha === 1 ? 'día de racha' : 'días de racha'}</span>
            </div>
            <div class="nutri__cifra">
              <span class="nutri__valor">${progresoMeta && progresoMeta.meta.gamificable ? `${Math.min(progresoMeta.hechos, progresoMeta.objetivo)}<small>/${progresoMeta.objetivo}</small>` : '—'}</span>
              <span class="nutri__rotulo">meta de la semana</span>
            </div>
            <div class="nutri__cifra">
              <span class="nutri__valor">${logradas.length}</span>
              <span class="nutri__rotulo">${logradas.length === 1 ? 'insignia' : 'insignias'}</span>
            </div>
          </div>

          ${siguiente ? `
            <div class="nutri__proxima">
              <span class="rotulo">Lo que sigue</span>
              <div class="nutri__proxima-fila">
                <span class="insignia__icono">${icono(siguiente.icono, { tam: 17 })}</span>
                <div>
                  <strong>${escapar(siguiente.nombre)}</strong>
                  <span class="micro">${escapar(siguiente.criterio)} · vas ${siguiente.hechos} de ${siguiente.objetivo}</span>
                </div>
              </div>
              <span class="insignia__barra"><span style="width:${siguiente.porcentaje}%"></span></span>
            </div>` : ''}

          <div class="insignias insignias--panel">${insignias.map(barraInsignia).join('')}</div>
        ` : `
          <div class="nutri__pausa">
            <p class="tenue">${escapar((patrones && patrones.restriccion.mensaje) || 'Esta semana no hay puntajes.')}</p>
            <p class="micro">Las rachas y las insignias vuelven solas. Ahora mismo no ayudan.</p>
            <a class="boton boton--secundario" target="_blank" rel="noopener"
               href="https://www.gob.pe/institucion/minsa/campa%C3%B1as/salud-mental">
               ${icono('corazon', { tam: 16 })} Canales de apoyo</a>
          </div>
        `}
      </div>
    </div>`;
}
