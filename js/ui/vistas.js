/**
 * NUTRIA · Render de vistas
 * -----------------------------------------------------------------------------
 * Sin framework, sin build: cada vista es una función pura estado -> HTML, y
 * app.js se encarga de los eventos por delegación.
 *
 * Criterios de diseño de esta capa:
 *   · El dato manda sobre el adorno: precios, horas y rachas van en cifras
 *     tabulares y grandes; el texto explicativo va en serif y bajo.
 *   · Todo lo que el motor sabe justificar se muestra con su evidencia al lado
 *     (frase resaltada, días exactos). La explicabilidad es visual.
 *   · La pantalla habla como una persona, no como el equipo de desarrollo: acá
 *     no se nombran capas, milisegundos, datasets ni estados internos. Eso vive
 *     en el código y en el README, que es donde sirve.
 */

import { svgMascota, fraseMascota } from './mascota.js';
import { renderComunidad } from './comunidad.js';
import { icono } from './iconos.js';
import { resumirAnalisis } from '../parser/analizador.js';
import { diaLocal, sumarDias, iniciales } from '../datos/almacen.js';
import { estaAbierto, minutosParaCerrar } from '../datos/menus.js';
import { renderDietaryProfileView } from '../../src/dietary-profile-view.js';
import { getDietaryProfile } from '../../src/storage.js';
import { obtenerGeminiApiKey, hayGeminiConfigurado } from '../../src/llm-analizador.js';

export function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const FRASES_EJEMPLO = [
  'dormí 4 horas, no almorcé, me quedan S/12 y tengo entrega mañana',
  'casi no dormí por la PC, desayuné rápido, ando con 8 lucas y estresado',
  'dormí bien, almorcé menú, me quedan 15 soles, tranqui',
  'no comí nada en todo el día, estoy misio y a mil con los parciales'
];

const NOMBRE_SEVERIDAD = { alerta: 'Atención', atencion: 'Ojo', logro: 'Logro', info: 'Dato' };

/* El dataset guarda el nivel en masculino ("alto"); la pantalla dice "confianza
   alta". Traducir acá evita el "Confianza alto" que se leía como error. */
const CONFIANZA_LEGIBLE = { alto: 'alta', medio: 'media', bajo: 'baja', alta: 'alta', media: 'media', baja: 'baja' };
const MONTOS_RAPIDOS = [5, 8, 10, 12, 15, 20];

/* Nombres humanos para lo que el analizador llama por su nombre interno. */
const NOMBRE_CAMPO = {
  presupuesto: 'Plata', sueno: 'Sueño', desayuno: 'Desayuno', almuerzo: 'Almuerzo',
  cena: 'Cena', animo: 'Ánimo', energia: 'Energía', carga_academica: 'Universidad',
  actividad: 'Actividad', plato: 'Comida'
};

const NOMBRE_FALTANTE = {
  sueno: 'cuánto dormiste', presupuesto: 'con cuánta plata cuentas',
  comidas: 'si comiste', animo: 'cómo te sentiste'
};

// --- Utilidades de presentación ---------------------------------------------
function fechaLarga(fecha = new Date()) {
  return fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fechaCorta(dia) {
  const d = new Date(`${dia}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dia;
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function saludo(fecha = new Date()) {
  const h = fecha.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function nombreMostrado(estado) {
  const n = (estado.perfil.nombre || (estado.sesion && estado.sesion.nombre) || '').trim();
  return n || 'Estudiante';
}

function primerNombre(estado) {
  const n = nombreMostrado(estado);
  if (n === 'Estudiante') return '';
  return n.split(/\s+/)[0] || '';
}

/** Encabezado de sección: numeral + título + apunte a la derecha. */
function encabezado(indice, titulo, extra = '') {
  return `
    <div class="encabezado">
      <span class="encabezado__indice" aria-hidden="true">${indice}</span>
      <h2 class="encabezado__titulo">${escapar(titulo)}</h2>
      ${extra ? `<span class="encabezado__extra">${extra}</span>` : ''}
    </div>`;
}

/** Saludo de la vista Hoy. La mascota ya no vive acá: vive en su esquina. */
function bienvenida(estado) {
  const nombre = primerNombre(estado);
  return `
    <div class="bienvenida">
      <p class="bienvenida__saludo">${escapar(fechaLarga())}</p>
      <h1 class="titulo bienvenida__titulo">${saludo()}${nombre ? `, ${escapar(nombre)}` : ''}</h1>
    </div>`;
}

// --- Consola de hoy: el nuevo inicio ----------------------------------------
/**
 * La pantalla de inicio era una columna de secciones numeradas: saludo, meta,
 * compositor, recomendación. Se leía como un formulario largo y no dejaba ver
 * de un golpe en qué anda el día.
 *
 * Ahora arranca con una consola: la hora corriendo, el momento del día, la
 * barra de los tres momentos con un marcador en "ahora", las seis señales como
 * cápsulas que se van llenando, y tres cifras vivas. Es la misma información
 * que ya calculaba el motor, pero puesta como tablero y no como lista —que es
 * lo que hace que abrir la app se sienta como asomarse a algo y no como
 * sentarse a llenar un cuestionario—.
 *
 * El adorno tiene freno: nada acá inventa una métrica nueva ni un puntaje de
 * salud. Racha, meta y constancia salen de los mismos módulos de siempre.
 */
function relojCorto(fecha = new Date()) {
  return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Barra de los tres momentos con el marcador de "ahora" en su posición real. */
function rielMomentos(ritmo) {
  if (!ritmo) return '';
  const segmentos = ritmo.momentos.map((m) => `
    <div class="riel-dia__tramo ${m.id === ritmo.momento.id ? 'riel-dia__tramo--ahora' : ''} ${m.cumplido ? 'riel-dia__tramo--hecho' : ''}"
         style="--peso:${m.peso}">
      <span class="riel-dia__nombre">${escapar(m.nombre)}</span>
      <span class="riel-dia__horas">${escapar(m.rotulo)}</span>
    </div>`).join('');

  return `
    <div class="riel-dia">
      <div class="riel-dia__pista">
        ${segmentos}
        <span class="riel-dia__ahora" style="left:${(ritmo.avanceDelDia * 100).toFixed(2)}%" aria-hidden="true"></span>
      </div>
    </div>`;
}

/** Las seis señales del día como cápsulas que se llenan al registrarlas. */
function capsulasSenal(ritmo) {
  return `
    <ul class="senales" aria-label="Lo que NUTRIA sabe de tu día">
      ${ritmo.senales.map((s) => {
        let clase = '';
        let texto = '—';
        if (s.saltada) {
          clase = 'senal--saltada';
          texto = 'saltado';
        } else if (s.capturada) {
          clase = 'senal--llena';
          texto = 'listo';
        } else if (s.sePideAhora) {
          clase = 'senal--pedida';
          texto = 'ahora';
        }
        return `
        <li class="senal ${clase}">
          <span class="senal__icono" aria-hidden="true">${icono(s.icono, { tam: 15 })}</span>
          <span class="senal__nombre">${escapar(s.nombre)}</span>
          <span class="senal__estado">${texto}</span>
        </li>`;
      }).join('')}
    </ul>`;
}

function cifraConsola(valor, rotulo, extra = '') {
  return `
    <div class="consola__cifra">
      <span class="consola__valor numero">${valor}${extra ? `<span class="consola__extra">${extra}</span>` : ''}</span>
      <span class="consola__rotulo">${escapar(rotulo)}</span>
    </div>`;
}

function consolaHoy(estado) {
  const ritmo = estado.ritmo;
  const p = estado.patrones;
  const gamificar = !p || p.gamificacionActiva;
  const racha = p ? p.racha.dias : 0;
  const progreso = estado.progresoMeta;
  const nivel = estado.nivel;
  if (!ritmo) return bienvenida(estado);

  const metaValor = progreso && progreso.meta && progreso.meta.gamificable
    ? `${Math.min(progreso.hechos, progreso.objetivo)}<small>/${progreso.objetivo}</small>`
    : '—';

  return `
    <section class="consola consola--${ritmo.momento.id}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem">
        <span class="rotulo" style="font-size:.76rem;letter-spacing:.06em;text-transform:uppercase;color:var(--t-tenue)">
          Momentos y constancia del día
        </span>
        <span class="pill pill--micro">${escapar(ritmo.momento.titulo)}</span>
      </div>

      ${rielMomentos(ritmo)}
      ${capsulasSenal(ritmo)}

      <div class="consola__cifras">
        ${gamificar
          ? cifraConsola(racha, racha === 1 ? 'día de racha' : 'días de racha', racha >= 2 ? icono('fuego', { tam: 13 }) : '')
          : cifraConsola('—', 'sin puntajes esta semana')}
        ${cifraConsola(metaValor, 'meta de la semana')}
        ${cifraConsola(`${nivel ? nivel.porcentaje : 0}<small>%</small>`, 'constancia de 28 días')}
      </div>
    </section>`;
}

/** Explicación del ritmo. Vive plegada: es para el que llega con la duda. */
function comoSeUsa(ritmo) {
  const momentos = (ritmo ? ritmo.momentos : []).map((m) => `
    <li class="guia__momento ${m.id === (ritmo && ritmo.momento.id) ? 'guia__momento--ahora' : ''}">
      <div class="guia__cuando">
        <strong>${escapar(m.titulo)}</strong>
        <span class="micro">${escapar(m.nombre)} · ${escapar(m.rotulo)}</span>
      </div>
      <p class="tenue">${escapar(m.porque)}</p>
      <button class="boton boton--sugerencia" type="button" data-accion="ejemplo" data-frase="${escapar(m.sugerencia)}">
        “${escapar(m.sugerencia)}”</button>
    </li>`).join('');

  return `
    <details class="detalle detalle--guia">
      <summary>¿Cuándo tengo que registrar?</summary>
      <div class="detalle__cuerpo">
        <p class="tenue"><strong>Una frase al día basta</strong>, a la hora que sea. Lo demás es opcional:
          puedes contarme el día en tres pedazos o de una sola vez, y NUTRIA los junta solos. Nada vence a
          medianoche y nada te va a reclamar.</p>
        <ul class="guia">${momentos}</ul>
        <p class="micro">La racha y los patrones cuentan <strong>días con registro</strong>, no momentos
          cumplidos: registrar tres veces en un día no vale por tres días.</p>
      </div>
    </details>`;
}

// --- Meta de la semana: anillo segmentado ------------------------------------
function anilloSegmentado(hechos, objetivo) {
  const r = 30, c = 37, ancho = 6;
  if (objetivo <= 1) {
    return `<svg viewBox="0 0 74 74" aria-hidden="true">
      <circle class="meta__seg ${hechos >= 1 ? 'meta__seg--hecho' : ''}" cx="${c}" cy="${c}" r="${r}"
        fill="none" stroke-width="${ancho}"/></svg>`;
  }
  const hueco = objetivo > 5 ? 6 : 9;
  const paso = 360 / objetivo;
  const punto = (a) => [
    (c + r * Math.cos((a * Math.PI) / 180)).toFixed(2),
    (c + r * Math.sin((a * Math.PI) / 180)).toFixed(2)
  ];
  const segmentos = Array.from({ length: objetivo }, (_, i) => {
    const ini = i * paso + hueco / 2;
    const fin = (i + 1) * paso - hueco / 2;
    const [x1, y1] = punto(ini);
    const [x2, y2] = punto(fin);
    const grande = fin - ini > 180 ? 1 : 0;
    return `<path class="meta__seg ${i < hechos ? 'meta__seg--hecho' : ''}"
      d="M${x1} ${y1}A${r} ${r} 0 ${grande} 1 ${x2} ${y2}"
      fill="none" stroke-width="${ancho}" stroke-linecap="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 74 74" aria-hidden="true">${segmentos}</svg>`;
}

function tarjetaMeta(estado) {
  const { meta, progresoMeta } = estado;
  if (!meta) return '';

  if (!meta.gamificable) {
    return `
      <section class="tarjeta tarjeta--franja franja--cuidado tarjeta--realce">
        <div class="tarjeta__etiqueta" style="color:var(--aji)">Esta semana, acompañamiento</div>
        <h3 class="subtitulo">${escapar(meta.texto)}</h3>
        <p class="tenue" style="margin-top:.4rem">${escapar(meta.porque)}</p>
        <div class="acciones">
          <a class="boton boton--secundario" target="_blank" rel="noopener"
             href="https://www.gob.pe/institucion/minsa/campa%C3%B1as/salud-mental">
             ${icono('corazon', { tam: 16 })} Canales de apoyo</a>
        </div>
      </section>`;
  }

  const p = progresoMeta || { hechos: 0, objetivo: meta.objetivo, cumplida: false, diasRestantes: 7 };
  return `
    <section class="tarjeta tarjeta--realce">
      <div class="tarjeta__etiqueta">Meta pequeña de la semana</div>
      <div class="meta">
        <div class="meta__anillo">
          ${anilloSegmentado(p.hechos, p.objetivo)}
          <div class="meta__cuenta" role="progressbar"
               aria-valuenow="${Math.min(p.hechos, p.objetivo)}" aria-valuemin="0" aria-valuemax="${p.objetivo}"
               aria-label="Progreso de la meta">
            <span>${Math.min(p.hechos, p.objetivo)}<small>/${p.objetivo}</small></span>
          </div>
        </div>
        <div class="meta__texto">
          <h3 class="subtitulo">${escapar(meta.texto)}</h3>
          <p class="micro" style="margin-top:.3rem">${escapar(meta.porque)}</p>
        </div>
      </div>
      <div class="meta__pie">
        <span>${p.cumplida ? 'Cumplida ✓' : `Vas ${p.hechos} de ${p.objetivo}`}</span>
        <span>${p.diasRestantes} ${p.diasRestantes === 1 ? 'día' : 'días'} para cerrar la semana</span>
      </div>
    </section>`;
}

// --- Compositor --------------------------------------------------------------
/**
 * Atajos de un toque: cada uno AGREGA su fragmento al campo en vez de registrar
 * solo. Así se arma "dormí poco, no almorcé, me quedan 10 soles" con tres
 * toques y se guarda UNA vez —que es lo que evita el registro accidental y, de
 * paso, lo que hace que se sienta un juego y no un formulario—.
 *
 * El texto resultante pasa por el mismo analizador que el texto libre. No hay
 * una vía rápida que salte las reglas: los atajos escriben español, no campos.
 */
function atajosDelMomento(estado) {
  const ritmo = estado.ritmo;
  if (!ritmo || !ritmo.atajos.length) return '';
  return `
    <div class="atajos">
      <span class="rotulo">Un toque y se suma a tu frase</span>
      <div class="atajos__pista">
        ${ritmo.atajos.map((a) => `
          <button class="atajo ${estado.ritmo.senales.find((s) => s.id === a.senal && s.capturada) ? 'atajo--listo' : ''}"
            type="button" data-accion="agregar-senal" data-fragmento="${escapar(a.fragmento)}">
            ${escapar(a.fragmento)}</button>`).join('')}
      </div>
    </div>`;
}

function compositor(estado, { indice = '01' } = {}) {
  const nombre = primerNombre(estado);
  const marcador = 'Cuéntame qué comiste, cómo dormiste o cuánto tienes...';

  return `
    <section class="bloque bloque--hero-compositor" style="padding:2.2rem 0 1.6rem;max-width:640px;margin:0 auto;text-align:center;">
      <h1 class="titulo consola__saludo" style="font-size:2.2rem;margin:0 0 1.25rem;letter-spacing:-.03em;line-height:1.2;text-align:center;">
        ${saludo()}${nombre ? `, ${escapar(nombre)}` : ''}
      </h1>

      <form id="form-registro" class="compositor compositor--destacado" style="text-align:left;">
        <textarea id="entrada" name="entrada" rows="3" maxlength="400" data-crece
          class="compositor__campo"
          placeholder="${escapar(marcador)}"
          aria-label="Cuéntanos cómo te fue hoy">${escapar(estado.borrador || '')}</textarea>

        <div class="compositor__pie">
          <button class="boton boton--primario" type="submit">${icono('pluma', { tam: 16 })} Registrar</button>
          <button class="boton boton--fantasma" type="button" data-accion="dictar">${icono('micro', { tam: 16 })} Dictar</button>
          <span class="compositor__atajo">Ctrl + Enter</span>
        </div>
      </form>
    </section>`;
}

// --- Lectura de la frase (explicabilidad) ------------------------------------
/** Vuelve a pintar la frase original marcando el fragmento que justificó cada campo. */
function fraseResaltada(analisis) {
  const texto = analisis.texto || '';
  if (!texto) return '';
  const marcas = [];
  const agregar = (campo, ev) => {
    if (ev && Number.isFinite(ev.inicio) && Number.isFinite(ev.fin) && ev.fin > ev.inicio) {
      marcas.push({ campo, inicio: ev.inicio, fin: Math.min(ev.fin, texto.length) });
    }
  };

  agregar('sueno', analisis.sueno && analisis.sueno.evidencia);
  agregar('presupuesto', analisis.presupuesto && analisis.presupuesto.evidencia);
  for (const ev of Object.values(analisis.evidenciasComidas || {})) agregar('comida', ev);
  agregar('animo', analisis.animo && analisis.animo.evidencia);
  agregar('carga_academica', analisis.cargaAcademica && analisis.cargaAcademica.evidencia);
  agregar('actividad', analisis.actividad && analisis.actividad.evidencia);
  for (const plato of analisis.platos || []) agregar('plato', plato.evidencia);

  marcas.sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);
  const limpias = [];
  for (const m of marcas) {
    const previa = limpias[limpias.length - 1];
    if (previa && m.inicio < previa.fin) continue;   // sin solapes: gana la primera
    limpias.push(m);
  }

  let salida = '';
  let cursor = 0;
  for (const m of limpias) {
    salida += escapar(texto.slice(cursor, m.inicio));
    salida += `<mark data-campo="${m.campo}">${escapar(texto.slice(m.inicio, m.fin))}</mark>`;
    cursor = m.fin;
  }
  return `${salida}${escapar(texto.slice(cursor))}`;
}

function chipsAnalisis(analisis) {
  const partes = resumirAnalisis(analisis);
  if (!partes.length) {
    return `<p class="tenue">No pudimos entender nada de esa frase. Prueba con algo como “dormí 5 horas y no almorcé”.</p>`;
  }
  return `<div class="chips">${partes.map((p) => `<span class="chip chip--dato">${escapar(p)}</span>`).join('')}</div>`;
}

function bloqueTrazas(analisis) {
  if (!analisis.trazas.length) return '';
  const filas = analisis.trazas.map((t) => `
    <tr>
      <th scope="row">${escapar(NOMBRE_CAMPO[t.campo] || t.campo)}</th>
      <td>${escapar(String(t.regla))}</td>
      <td class="evidencia__cita">“${escapar(t.cita)}”</td>
    </tr>`).join('');

  const faltantes = (analisis.camposFaltantes || []).map((c) => NOMBRE_FALTANTE[c] || c);

  return `
    <details class="detalle">
      <summary>¿Por qué entendí eso?</summary>
      <div class="detalle__cuerpo">
        <div class="tabla-scroll">
          <table class="tabla">
            <thead><tr><th>Dato</th><th>Lo que entendí</th><th>Lo que escribiste</th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
        ${faltantes.length
          ? `<p class="micro" style="margin-top:.6rem">No me contaste ${escapar(faltantes.join(', '))}.
             Puedes agregarlo con otra frase cuando quieras.</p>`
          : ''}
      </div>
    </details>`;
}

function bloqueLectura(analisis, indice = '02') {
  if (!analisis) return '';
  const confianza = Math.round((analisis.confianzaGlobal || 0) * 100);
  return `
    <section class="bloque">
      ${encabezado(indice, 'Esto entendí')}
      <div class="tarjeta tarjeta--realce">
        <p class="lectura__frase">${fraseResaltada(analisis)}</p>
        ${chipsAnalisis(analisis)}
        <div class="medidor" style="margin-top:.85rem">
          <span>Qué tan seguro estoy</span>
          <span class="medidor__barra"><span class="medidor__relleno" style="width:${confianza}%"></span></span>
          <span class="numero">${confianza} %</span>
        </div>
        ${bloqueTrazas(analisis)}
      </div>
    </section>`;
}

// --- Recomendación -----------------------------------------------------------
function tarjetaOpcion(rec, indice) {
  const o = rec.opcion;
  const presentes = Array.isArray(o.alergenos_presentes) ? o.alergenos_presentes : [];
  const noVerificados = Array.isArray(o.alergenos_no_verificados) ? o.alergenos_no_verificados : [];
  const advertencias = Array.isArray(rec.advertencias) ? rec.advertencias : [];

  return `
    <article class="tarjeta opcion ${indice === 0 ? 'opcion--top' : ''}">
      ${indice === 0 ? '<span class="opcion__rango">Primera opción</span>' : ''}
      <div class="opcion__cabecera">
        <div>
          <h3 class="opcion__nombre">${escapar(o.plato)}</h3>
          <div class="opcion__sitio">${escapar(o.establecimiento)} · ${escapar(o.zona)}</div>
        </div>
        <div class="opcion__precio"><small>S/</small>${o.precio}</div>
      </div>
      <div class="chips">
        ${Number.isFinite(o.caminando_min) ? `<span class="chip">${icono('pasos', { tam: 13 })} ${o.caminando_min} min a pie</span>` : ''}
        ${o.dentro_del_campus ? '<span class="chip chip--ok">dentro del campus</span>' : ''}
        ${/* Sin cola cronometrada no se inventa un número: se dice que no se sabe. */
          Number.isFinite(o.tiempo_cola_min)
            ? `<span class="chip">${icono('reloj', { tam: 13 })} cola ~${o.tiempo_cola_min} min</span>`
            : `<span class="chip chip--tenue">${icono('reloj', { tam: 13 })} cola sin medir</span>`}
        ${o.horario ? `<span class="chip chip--tenue">${escapar(o.horario.desde)}–${escapar(o.horario.hasta)}</span>` : '<span class="chip chip--tenue">horario sin confirmar</span>'}
        ${o.vegetariano ? `<span class="chip chip--ok">${icono('hoja', { tam: 13 })} vegetariano</span>` : ''}
        ${presentes.length ? `<span class="chip chip--aviso">Contiene: ${escapar(presentes.join(', '))}</span>` : ''}
      </div>
      ${(() => {
        // Reducir y consolidar avisos de alérgenos a un único mensaje elegante
        const mensajesUnicos = Array.from(new Set(advertencias.map((adv) => adv.mensaje)));
        if (mensajesUnicos.length > 0) {
          return `
            <div class="opcion__advertencias" style="margin:.5rem 0 .3rem">
              <div class="aviso-alergia aviso-alergia--atencion">
                ${icono('atencion', { tam: 13 })} <span>${escapar(mensajesUnicos.join(' · '))}</span>
              </div>
            </div>`;
        }
        return '';
      })()}

      <ul class="razones">${rec.razones.map((r) => `<li>${escapar(r)}</li>`).join('')}</ul>

      <div class="opcion__metadatos micro">
        <span>${icono('documento', { tam: 12 })} ${escapar(o.procedencia_dato || 'Relevamiento LEAD')}</span>
        <span>Actualizado ${escapar(o.fecha_actualizacion || '2026-09-01')}</span>
        <span class="pill pill--micro pill--confianza-${escapar(o.nivel_confianza || 'medio')}">Confianza ${escapar(CONFIANZA_LEGIBLE[o.nivel_confianza] || 'media')}</span>
      </div>

      <div class="acciones" style="margin-top:.6rem">
        <button class="boton boton--secundario" data-accion="reaccion" data-id="${o.id}" data-valor="segui">
          ${icono('check', { tam: 16 })} La seguí</button>
        <button class="boton boton--texto" data-accion="reaccion" data-id="${o.id}" data-valor="no">No me sirve</button>
      </div>
    </article>`;
}

/** La opción más barata, siempre visible: recomendar lo que aprovecha el
 *  presupuesto no puede convertirse en empujar a gastarlo. */
function tarjetaAlternativa(alt) {
  const o = alt.opcion;
  return `
    <article class="tarjeta tarjeta--plana alternativa">
      <div class="alternativa__rotulo">${icono('monedas', { tam: 14 })} Si prefieres ahorrar</div>
      <div class="alternativa__fila">
        <div>
          <div class="alternativa__plato">${escapar(o.plato)}</div>
          <div class="opcion__sitio">${escapar(o.establecimiento)} · ${o.caminando_min} min a pie</div>
        </div>
        <div class="opcion__precio"><small>S/</small>${o.precio}</div>
      </div>
    </article>`;
}

function bloqueRecomendacion(estado, { indice = '03', compacto = false } = {}) {
  const r = estado.recomendacion;
  if (!r) return '';
  const lista = compacto ? r.recomendaciones.slice(0, 1) : r.recomendaciones;

  return `
    <section class="bloque">
      ${encabezado(indice, 'Qué comer hoy', `S/${r.presupuesto}`)}
      <p class="tenue">${escapar(r.mensaje)}</p>
      <p class="micro" style="margin-top:.25rem">Usamos ${escapar(r.fuentePresupuesto)}.</p>

      ${r.tiempoDisponible && r.tiempoDisponible.eventoAcademico ? `
        <div class="tarjeta tarjeta--franja franja--atencion aviso-buffer-tiempo" style="margin:.75rem 0; padding:.65rem .85rem">
          <div style="font-weight:600; font-size:.84rem; display:flex; align-items:center; gap:.4rem">
            ${icono('reloj', { tam: 14 })} Margen de seguridad: ${escapar(r.tiempoDisponible.eventoAcademico)}
          </div>
          <p class="micro" style="margin-top:.25rem">
            Descontamos <strong>${r.tiempoDisponible.deduccionBufferMin} min</strong> para tu traslado y preparación. Dispones de <strong>${r.tiempoDisponible.minutosNetos} min netos</strong> para comer.
          </p>
        </div>` : ''}

      ${/* El mapeo real destapó algo que la semilla sintética escondía: hay
            franjas de precio donde en el campus no alcanza para un plato, solo
            para un café o unas papas. Devolver igual tres tarjetas sin decirlo
            sería fingir que sí se puede almorzar con eso. */
        r.sinPlatoCompleto ? `
        <div class="aviso aviso--atencion" style="margin:.75rem 0">
          ${icono('aviso', { tam: 15 })}
          <div>
            <strong>Con S/${r.presupuesto} no te alcanza para un plato completo cerca del campus.</strong>
            Lo que sigue te puede sacar del apuro, pero no reemplaza una comida. Lo más barato que sí es
            un plato es ${escapar(r.sinPlatoCompleto.plato)} (${escapar(r.sinPlatoCompleto.establecimiento)},
            S/${r.sinPlatoCompleto.precio}): te faltarían S/${r.sinPlatoCompleto.faltan}.
          </div>
        </div>` : ''}

      ${lista.map(tarjetaOpcion).join('')}
      ${!compacto && r.alternativaBarata ? tarjetaAlternativa(r.alternativaBarata) : ''}
      ${!compacto && r.techoAlcanzado ? `
        <p class="micro" style="margin-top:.6rem">Con S/${r.techoAlcanzado.faltan} más te alcanzaría para
          ${escapar(r.techoAlcanzado.plato)} (S/${r.techoAlcanzado.precio}), que trae más proteína y verdura.</p>` : ''}
      ${compacto && r.recomendaciones.length > 1
        ? `<button class="boton boton--texto" data-accion="ir" data-vista="comida">
             Ver las ${r.recomendaciones.length} opciones ${icono('flecha', { tam: 15 })}</button>`
        : ''}
    </section>`;
}

// --- Vista: HOY --------------------------------------------------------------
function vistaHoy(estado) {
  const analisis = estado.ultimoAnalisis;
  const hayPatrones = estado.patrones && estado.patrones.patrones.length;
  const ultimos = ((estado.patrones && estado.patrones.dias) || []).slice(0, 3);

  // La numeración se arma sola: las secciones opcionales no dejan huecos como
  // "01, 03, 05" cuando no hay análisis todavía.
  let n = 0;
  const indice = () => String(++n).padStart(2, '0');

  return `
    ${compositor(estado, { indice: indice() })}
    ${consolaHoy(estado)}
    ${tarjetaMeta(estado)}
    ${analisis ? bloqueLectura(analisis, indice()) : ''}
    ${bloqueRecomendacion(estado, { indice: indice(), compacto: true })}
    ${hayPatrones ? `
      <section class="bloque">
        ${encabezado(indice(), 'Lo que se repite')}
        ${estado.patrones.patrones.slice(0, 2).map(tarjetaPatron).join('')}
        <button class="boton boton--texto" data-accion="ir" data-vista="patrones">
          Ver todos los patrones ${icono('flecha', { tam: 15 })}</button>
      </section>` : ''}
    ${ultimos.length ? `
      <section class="bloque">
        ${encabezado(indice(), 'Tus últimos días', `${estado.patrones.dias.length} en total`)}
        <ul class="linea-tiempo">${ultimos.map(itemHistorial).join('')}</ul>
        <button class="boton boton--texto" data-accion="ir" data-vista="historial">
          Ver todo el historial ${icono('flecha', { tam: 15 })}</button>
      </section>` : ''}`;
}

// --- Vista: PATRONES ---------------------------------------------------------
function tarjetaPatron(p) {
  const evidencia = (p.evidencia || []).slice(0, 6).map((e) => `
    <li>
      <span class="evidencia__dia">${escapar(fechaCorta(e.dia))}</span>
      <div class="evidencia__cita">“${escapar(e.cita || '')}”${e.extra ? ` <span class="micro">(${escapar(e.extra)})</span>` : ''}</div>
    </li>`).join('');

  return `
    <article class="tarjeta tarjeta--franja franja--${p.severidad}">
      <div class="chips" style="margin:0 0 .5rem">
        <span class="pill pill--${p.severidad}">${NOMBRE_SEVERIDAD[p.severidad]}</span>
        <span class="pill pill--info">últimos ${p.ventana} días</span>
      </div>
      <h3 class="subtitulo">${escapar(p.titulo)}</h3>
      <p class="tenue" style="margin-top:.35rem">${escapar(p.mensaje)}</p>
      ${evidencia ? `
        <details class="detalle">
          <summary>Ver los días exactos</summary>
          <div class="detalle__cuerpo"><ul class="evidencia">${evidencia}</ul></div>
        </details>` : ''}
    </article>`;
}

/** Un punto por día de la ventana: lleno si ese día hubo registro. */
function rejillaDias(m, hoy) {
  const set = new Set(m.diasCrudos.map((d) => d.dia));
  const base = new Date(`${hoy}T00:00:00`);
  if (Number.isNaN(base.getTime())) return '';
  const puntos = [];
  for (let i = m.tamano - 1; i >= 0; i -= 1) {
    const dia = diaLocal(sumarDias(base, -i));
    puntos.push(`<span class="punto ${set.has(dia) ? 'punto--lleno' : ''}"></span>`);
  }
  return `<div class="ventana__puntos" aria-hidden="true">${puntos.join('')}</div>`;
}

function tarjetasVentanas(p) {
  return `<div class="ventanas">${[7, 14, 28].map((n) => {
    const m = p.ventanas[n];
    return `
      <div class="ventana">
        <div class="ventana__rotulo">${n} días</div>
        <div class="ventana__valor">${m.diasConRegistro}<small>/${n}</small></div>
        ${rejillaDias(m, p.hoy)}
        <div class="ventana__nota">
          ${m.suenoPromedio !== null ? `${m.suenoPromedio} h de sueño en promedio` : 'sin datos de sueño'}<br>
          ${m.saltosAlmuerzo} ${m.saltosAlmuerzo === 1 ? 'almuerzo saltado' : 'almuerzos saltados'}
        </div>
      </div>`;
  }).join('')}</div>`;
}

/**
 * Sueño día a día. Era un sparkline mudo: la línea decía la forma pero no había
 * cómo saber QUÉ pasó esa noche —y eso es justo lo que hace útil el gráfico—.
 *
 * Ahora cada noche tiene su zona sensible y al pasar por encima aparece la
 * ficha del día: horas, cómo se dijo, qué comió, cómo andaba de ánimo y de
 * carga. La ficha es HTML, no un `<title>` de SVG: el tooltip nativo tarda un
 * segundo largo en salir, no se puede diseñar y en táctil directamente no
 * existe. El hover lo maneja `js/ui/movimiento.js`, que también acepta toque y
 * teclado, porque un dato que solo se ve con mouse no está publicado.
 *
 * Sin JavaScript la ficha no aparece, así que cada punto conserva igual su
 * `<title>` como respaldo accesible.
 */
function fichaNoche(d) {
  const comidas = ['desayuno', 'almuerzo', 'cena']
    .filter((c) => d.comidas[c])
    .map((c) => `${c} ${d.comidas[c] === 'hecha' ? 'sí' : 'no'}`);

  return `
    <div class="ficha-noche__horas">
      <span class="numero">${d.sueno}<small>h</small></span>
      <span class="ficha-noche__fecha">${escapar(fechaCorta(d.dia))}</span>
    </div>
    <div class="ficha-noche__cuerpo">
      ${d.suenoEvidencia ? `<p class="ficha-noche__cita">“${escapar(d.suenoEvidencia)}”</p>` : ''}
      <ul class="ficha-noche__datos">
        ${comidas.length ? `<li>${icono('tazon', { tam: 12 })} ${escapar(comidas.join(' · '))}</li>` : ''}
        ${d.presupuesto !== null ? `<li>${icono('monedas', { tam: 12 })} S/${d.presupuesto}</li>` : ''}
        ${d.animo ? `<li>${icono('corazon', { tam: 12 })} ${escapar(d.animo)}</li>` : ''}
        ${d.carga ? `<li>${icono('reloj', { tam: 12 })} ${escapar(d.carga)}</li>` : ''}
        ${d.sueno < 6 ? '<li class="ficha-noche__nota">noche corta, bajo 6 h</li>' : ''}
      </ul>
    </div>`;
}

function graficoSueno(p) {
  const puntos = (p.ventanas[14].diasCrudos || [])
    .filter((d) => d.sueno !== null)
    .slice(0, 14)
    .reverse();
  if (puntos.length < 3) return '';

  const W = 320, H = 92, izq = 10, der = 30, arriba = 12, abajo = 14;
  const valores = puntos.map((d) => d.sueno);
  const min = Math.min(4, Math.floor(Math.min(...valores)));
  const max = Math.max(9, Math.ceil(Math.max(...valores)));
  const x = (i) => izq + (i * (W - izq - der)) / Math.max(1, puntos.length - 1);
  const y = (v) => arriba + (H - arriba - abajo) * (1 - (v - min) / (max - min));

  const linea = puntos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.sueno).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(puntos.length - 1).toFixed(1)} ${H - abajo} L${x(0).toFixed(1)} ${H - abajo} Z`;

  const circulos = puntos.map((d, i) =>
    `<circle class="grafico__punto ${d.sueno < 6 ? 'grafico__punto--bajo' : ''}" data-punto="${i}"
       cx="${x(i).toFixed(1)}" cy="${y(d.sueno).toFixed(1)}" r="3.2"><title>${escapar(fechaCorta(d.dia))}: ${d.sueno} h</title></circle>`).join('');

  // Zonas sensibles: una franja completa por noche. Apuntarle a un círculo de
  // 3 px con el dedo es imposible; a una franja de toda la altura, no.
  const anchoZona = (W - izq - der) / Math.max(1, puntos.length - 1);
  const zonas = puntos.map((d, i) => `
    <rect class="grafico__zona" data-noche="${i}" tabindex="0" role="button"
      aria-label="${escapar(fechaCorta(d.dia))}: ${d.sueno} horas de sueño"
      x="${(x(i) - anchoZona / 2).toFixed(1)}" y="0" width="${anchoZona.toFixed(1)}" height="${H}"/>`).join('');

  /* Las fichas viven en una franja RESERVADA debajo del gráfico, no flotando
     sobre él. Un globo flotante de esta altura se sale de la tarjeta y se come
     la sección de arriba; la franja tiene sitio propio, así que ni desborda ni
     empuja el contenido cuando aparece y desaparece. */
  const fichas = puntos.map((d, i) => `
    <div class="ficha-noche" data-ficha="${i}" hidden>${fichaNoche(d)}</div>`).join('');

  return `
    <div class="grafico grafico--vivo" data-grafico-sueno>
      <svg viewBox="0 0 ${W} ${H}" role="img"
           aria-label="Horas de sueño de los últimos ${puntos.length} días registrados">
        <path class="grafico__area" d="${area}"/>
        <line class="grafico__referencia" x1="${izq}" y1="${y(6).toFixed(1)}" x2="${W - der + 3}" y2="${y(6).toFixed(1)}"/>
        <text class="grafico__eje" x="${W - der + 7}" y="${(y(6) + 3).toFixed(1)}" text-anchor="start">6 h</text>
        <path class="grafico__linea" d="${linea}"/>
        ${circulos}
        ${zonas}
      </svg>

      <div class="grafico__pie">
        <span>${escapar(fechaCorta(puntos[0].dia))}</span>
        <span>${puntos.length} noches registradas</span>
        <span>${escapar(fechaCorta(puntos[puntos.length - 1].dia))}</span>
      </div>

      <div class="grafico__detalle">
        <p class="grafico__pista" data-pista>Pasa por encima de una noche —o tócala— para ver qué pasó ese día.</p>
        ${fichas}
      </div>
    </div>`;
}

function tablaVentanas(patrones) {
  const filas = [7, 14, 28].map((n) => {
    const m = patrones.ventanas[n];
    return `<tr>
      <th scope="row">${n} días</th>
      <td>${m.diasConRegistro}/${n}</td>
      <td>${m.suenoPromedio ?? '—'}</td>
      <td>${m.nochesCortas}</td>
      <td>${m.saltosAlmuerzo}</td>
      <td>${m.presupuestoMediana !== null ? 'S/' + m.presupuestoMediana : '—'}</td>
      <td>${m.diasCarga}</td>
    </tr>`;
  }).join('');

  return `
    <details class="detalle">
      <summary>Ver el detalle de los tres periodos</summary>
      <div class="detalle__cuerpo tabla-scroll">
        <table class="tabla">
          <thead><tr>
            <th>Periodo</th><th>Registros</th><th>Sueño prom.</th><th>Noches &lt;6h</th>
            <th>Almuerzos saltados</th><th>Presup. habitual</th><th>Días con carga</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </details>`;
}

function vistaPatrones(estado) {
  const p = estado.patrones;

  if (!p || !p.dias.length) {
    return `
      <section class="bloque vacio">
        <div class="vacio__arte">${svgMascota('neutral')}</div>
        <h2 class="titulo">Todavía no hay patrones</h2>
        <p class="tenue" style="max-width:38ch">Los patrones necesitan varios días. Registra hoy,
          o carga un historial de ejemplo para ver cómo funciona.</p>
        <div class="acciones">
          <button class="boton" data-accion="sembrar">${icono('semilla', { tam: 16 })} Ver con datos de ejemplo</button>
          <button class="boton boton--fantasma" data-accion="ir" data-vista="hoy">Registrar hoy</button>
        </div>
      </section>`;
  }

  const grafico = graficoSueno(p);

  return `
    ${p.restriccion.activa ? `
      <section class="tarjeta tarjeta--franja franja--cuidado tarjeta--realce">
        <div class="tarjeta__etiqueta" style="color:var(--aji)">Esta semana bajamos el volumen</div>
        <h3 class="subtitulo">Pausamos rachas e insignias</h3>
        <p class="tenue" style="margin-top:.4rem">${escapar(p.restriccion.mensaje)}</p>
      </section>` : ''}

    <section class="bloque">
      ${encabezado('01', 'Cómo vienes')}
      <p class="tenue">No miramos días sueltos, sino cómo viene la racha: los últimos 7, 14 y 28 días.
        Cada punto es un día; lleno significa que lo registraste.</p>
      ${tarjetasVentanas(p)}
      ${tablaVentanas(p)}
    </section>

    ${grafico ? `
      <section class="bloque">
        ${encabezado('02', 'Tu sueño, día a día', 'últimos 14 días')}
        <div class="tarjeta">${grafico}</div>
      </section>` : ''}

    <section class="bloque">
      ${encabezado(grafico ? '03' : '02', 'Patrones detectados', `${p.patrones.length}`)}
      ${p.patrones.length
        ? p.patrones.map(tarjetaPatron).join('')
        : '<p class="tenue">Sin patrones suficientes todavía.</p>'}
    </section>

    <section class="bloque">
      ${encabezado(grafico ? '04' : '03', 'Tu historial', `${p.dias.length} días`)}
      <p class="tenue">El historial completo, con lo que escribiste cada día, vive en su propia pestaña.</p>
      <ul class="linea-tiempo">${p.dias.slice(0, 3).map(itemHistorial).join('')}</ul>
      <button class="boton boton--texto" data-accion="ir" data-vista="historial">
        Abrir el historial ${icono('flecha', { tam: 15 })}</button>
    </section>`;
}

// --- Vista: HISTORIAL --------------------------------------------------------
/** Chips resumen de un día consolidado. Se comparten entre Hoy y Patrones. */
function chipsDelDia(d) {
  return `
    <div class="chips" style="margin:0">
      ${d.sueno !== null ? `<span class="chip">${icono('luna', { tam: 13 })} ${d.sueno} h</span>` : ''}
      ${d.comidas.desayuno === 'saltada' ? '<span class="chip chip--alerta">sin desayuno</span>' : ''}
      ${d.comidas.desayuno === 'hecha' ? '<span class="chip chip--ok">desayunó</span>' : ''}
      ${d.comidas.almuerzo === 'saltada' ? '<span class="chip chip--alerta">almuerzo saltado</span>' : ''}
      ${d.comidas.almuerzo === 'hecha' ? '<span class="chip chip--ok">almorzó</span>' : ''}
      ${d.comidas.cena === 'saltada' ? '<span class="chip chip--alerta">sin cena</span>' : ''}
      ${d.comidas.cena === 'hecha' ? '<span class="chip chip--ok">cenó</span>' : ''}
      ${d.presupuesto !== null ? `<span class="chip">${icono('monedas', { tam: 13 })} S/${d.presupuesto}</span>` : ''}
      ${d.animo ? `<span class="chip">${escapar(d.animo)}</span>` : ''}
      ${d.carga ? `<span class="chip chip--tenue">${escapar(d.carga)}</span>` : ''}
    </div>`;
}

function itemHistorial(d) {
  return `
    <li class="linea-tiempo__item">
      <div class="linea-tiempo__dia">${escapar(fechaCorta(d.dia))}</div>
      <p class="linea-tiempo__texto">“${escapar(d.textos[0])}”</p>
      ${chipsDelDia(d)}
    </li>`;
}

/**
 * Historial completo. Antes vivía al final de Patrones, que es donde nadie lo
 * buscaba: el estudiante quiere ver lo que escribió, no bajar por un motor de
 * ventanas móviles para llegar. Ahora tiene su propia pestaña, se filtra, y se
 * repinta en el mismo instante en que se registra algo (app.js repinta la vista
 * activa después de guardar, y escucha `storage` para las otras pestañas).
 *
 * Cada frase se muestra ENTERA y con su hora. Esta pantalla es la prueba de que
 * el historial es del estudiante: puede leerlo, buscarlo y borrar una entrada
 * suelta sin tener que tirar todo abajo.
 */
const FILTROS_HISTORIAL = [
  { id: 'todo', nombre: 'Todo', prueba: () => true },
  { id: 'sueno', nombre: 'Con sueño', prueba: (d) => d.sueno !== null },
  { id: 'saltos', nombre: 'Comidas saltadas', prueba: (d) => ['desayuno', 'almuerzo', 'cena'].some((c) => d.comidas[c] === 'saltada') },
  { id: 'plata', nombre: 'Con presupuesto', prueba: (d) => d.presupuesto !== null },
  { id: 'carga', nombre: 'Días de carga', prueba: (d) => !!d.carga }
];

function horaCorta(iso) {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '';
  return f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function vistaHistorial(estado) {
  const p = estado.patrones;
  const busqueda = (estado.historialBusqueda || '').trim().toLowerCase();
  const filtroId = estado.historialFiltro || 'todo';
  const filtro = FILTROS_HISTORIAL.find((f) => f.id === filtroId) || FILTROS_HISTORIAL[0];

  if (!p || !p.dias.length) {
    return `
      <section class="bloque vacio">
        <div class="vacio__arte">${svgMascota('neutral')}</div>
        <h2 class="titulo">Tu historial está vacío</h2>
        <p class="tenue" style="max-width:38ch">Acá va a quedar cada frase que registres, con la hora y lo que
          NUTRIA entendió de ella. Nada de esto sale de este dispositivo.</p>
        <div class="acciones">
          <button class="boton" data-accion="ir" data-vista="hoy">${icono('pluma', { tam: 16 })} Registrar ahora</button>
          <button class="boton boton--fantasma" data-accion="sembrar">Ver con datos de ejemplo</button>
        </div>
      </section>`;
  }

  // Los registros crudos, agrupados por día: acá interesa CADA frase con su
  // hora, no el día consolidado, que es lo que mira el motor.
  const porDia = new Map();
  for (const r of estado.registros) {
    if (!porDia.has(r.dia)) porDia.set(r.dia, []);
    porDia.get(r.dia).push(r);
  }

  const consolidadoDe = new Map(p.dias.map((d) => [d.dia, d]));
  const dias = Array.from(porDia.keys()).sort().reverse()
    .map((dia) => ({ dia, registros: porDia.get(dia).slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) }))
    .filter(({ dia, registros }) => {
      const consolidado = consolidadoDe.get(dia);
      if (consolidado && !filtro.prueba(consolidado)) return false;
      if (!busqueda) return true;
      return registros.some((r) => r.texto.toLowerCase().includes(busqueda));
    });

  const totalRegistros = estado.registros.length;

  const lista = dias.map(({ dia, registros }) => {
    const consolidado = consolidadoDe.get(dia);
    return `
      <section class="dia-historial">
        <header class="dia-historial__cabecera">
          <h3 class="dia-historial__fecha">${escapar(fechaCorta(dia))}</h3>
          <span class="micro">${registros.length} ${registros.length === 1 ? 'registro' : 'registros'}</span>
        </header>
        ${consolidado ? chipsDelDia(consolidado) : ''}
        <ul class="entradas">
          ${registros.map((r) => `
            <li class="entrada ${r.id === estado.ultimoRegistroId ? 'entrada--nueva' : ''}">
              <span class="entrada__hora numero">${escapar(horaCorta(r.fecha))}</span>
              <p class="entrada__texto">${escapar(r.texto)}</p>
              ${r.origen === 'demo' ? '<span class="pill pill--info">ejemplo</span>' : ''}
              <button class="entrada__borrar" type="button" data-accion="borrar-registro" data-id="${escapar(r.id)}"
                aria-label="Borrar este registro">${icono('basura', { tam: 14 })}</button>
            </li>`).join('')}
        </ul>
      </section>`;
  }).join('');

  return `
    <section class="bloque">
      ${encabezado('01', 'Tu historial', `${totalRegistros} ${totalRegistros === 1 ? 'registro' : 'registros'}`)}
      <p class="tenue">Todo lo que escribiste, tal cual lo escribiste. Se actualiza apenas registras algo y
        vive solo en este dispositivo.</p>

      <div class="filtros">
        <label class="buscador">
          <span class="oculto-visual">Buscar en tu historial</span>
          ${icono('ojo', { tam: 15 })}
          <input type="search" id="historial-buscar" placeholder="Buscar una palabra…"
            value="${escapar(estado.historialBusqueda || '')}" autocomplete="off">
        </label>
        <div class="filtros__chips">
          ${FILTROS_HISTORIAL.map((f) => `
            <button class="monto ${f.id === filtroId ? 'monto--activo' : ''}" type="button"
              data-accion="filtro-historial" data-filtro="${f.id}">${escapar(f.nombre)}</button>`).join('')}
        </div>
      </div>

      ${dias.length
        ? `<p class="micro" style="margin:.9rem 0 .2rem">${dias.length} ${dias.length === 1 ? 'día' : 'días'} en la vista actual.</p>
           <div class="historial">${lista}</div>`
        : `<p class="tenue" style="margin-top:1rem">Ningún día coincide con eso. Prueba con otra palabra o quita el filtro.</p>`}
    </section>`;
}

// --- Vista: COMIDA -----------------------------------------------------------
/**
 * Directorio de sitios del campus. Sale del levantamiento real, así que muestra
 * lo que el levantamiento sabe y —esto es lo importante— lo que NO sabe: hay 16
 * locales verificados a los que todavía no se les levantó la carta, y aparecen
 * dichos como tal en vez de desaparecer. Un mapa que solo enseña lo cómodo se
 * siente completo y no lo está.
 */
function directorioCampus(dataset, ahora = new Date()) {
  const establecimientos = (dataset && dataset.establecimientos) || [];
  const opciones = (dataset && dataset.opciones) || [];
  if (!establecimientos.length) return zonasDelCampus(dataset);

  const precios = new Map();
  for (const o of opciones) {
    const p = precios.get(o.establecimiento_id) || { min: Infinity, max: 0 };
    p.min = Math.min(p.min, o.precio); p.max = Math.max(p.max, o.precio);
    precios.set(o.establecimiento_id, p);
  }

  const orden = establecimientos.slice().sort((a, b) =>
    (b.platos > 0) - (a.platos > 0)
    || (b.dentroDelCampus - a.dentroDelCampus)
    || (a.caminandoMin ?? 99) - (b.caminandoMin ?? 99));

  const ficha = (e) => {
    const abierto = e.horario ? estaAbierto(e, ahora) : null;
    const cierra = minutosParaCerrar(e, ahora);
    const rango = precios.get(e.id);
    return `
      <article class="sitio ${e.platos ? '' : 'sitio--sin-carta'}">
        <div class="sitio__fila">
          <div class="sitio__datos">
            <h3 class="sitio__nombre">${escapar(e.nombre)}</h3>
            <p class="sitio__zona">${escapar(e.zona)}${Number.isFinite(e.caminandoMin) ? ` · ${e.caminandoMin} min a pie` : ''}</p>
          </div>
          ${rango
            ? `<div class="sitio__precio numero"><small>S/</small>${rango.min}<span>–${rango.max}</span></div>`
            : ''}
        </div>
        <div class="chips">
          ${abierto === null
            ? '<span class="chip chip--tenue">horario sin confirmar</span>'
            : abierto
              ? `<span class="chip chip--ok">abierto ahora${cierra !== null && cierra <= 60 ? ` · cierra en ${cierra} min` : ''}</span>`
              : '<span class="chip chip--tenue">cerrado ahora</span>'}
          ${e.dentroDelCampus ? '<span class="chip">dentro del campus</span>' : '<span class="chip">fuera del campus</span>'}
          ${e.platos
            ? `<span class="chip chip--tenue">${e.platos} ${e.platos === 1 ? 'opción' : 'opciones'}</span>`
            : '<span class="chip chip--tenue">carta todavía sin levantar</span>'}
        </div>
        ${e.horarioTexto ? `<p class="micro" style="margin-top:.35rem">${escapar(e.horarioTexto)}</p>` : ''}
      </article>`;
  };

  const conCarta = orden.filter((e) => e.platos > 0);
  const sinCarta = orden.filter((e) => !e.platos);

  return `
    <div class="sitios">${conCarta.map(ficha).join('')}</div>
    ${sinCarta.length ? `
      <details class="detalle">
        <summary>${sinCarta.length} sitios más, todavía sin carta levantada</summary>
        <div class="detalle__cuerpo">
          <p class="tenue">Están verificados y ubicados, pero nadie ha registrado todavía qué venden ni a
            cuánto. Hasta que alguien lo levante, no podemos recomendarlos: preferimos decirlo a inventarlo.</p>
          <div class="sitios">${sinCarta.map(ficha).join('')}</div>
        </div>
      </details>` : ''}`;
}

/** Respaldo para la semilla sintética, que no trae fichas de establecimiento. */
function zonasDelCampus(dataset) {
  const opciones = (dataset && dataset.opciones) || [];
  if (!opciones.length) return '';
  const porZona = new Map();
  for (const o of opciones) {
    const z = porZona.get(o.zona) || { n: 0, min: Infinity, max: 0 };
    z.n += 1; z.min = Math.min(z.min, o.precio); z.max = Math.max(z.max, o.precio);
    porZona.set(o.zona, z);
  }
  const filas = Array.from(porZona.entries())
    .sort((a, b) => b[1].n - a[1].n)
    .map(([zona, z]) => `
      <tr>
        <th scope="row">${escapar(zona)}</th>
        <td>${z.n}</td>
        <td>S/${z.min}–${z.max}</td>
      </tr>`).join('');

  return `
    <div class="tabla-scroll">
      <table class="tabla">
        <thead><tr><th>Zona</th><th>Opciones</th><th>Rango de precios</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

function vistaComida(estado) {
  const r = estado.recomendacion;
  const total = ((estado.dataset || {}).opciones || []).length;
  const sitios = ((estado.dataset || {}).establecimientos || []).length;
  const valor = r ? r.presupuesto : estado.perfil.presupuestoTipico;

  return `
    <section class="bloque">
      ${encabezado('01', '¿Con cuánto cuentas hoy?')}
      <form id="form-presupuesto" class="presupuesto">
        <div class="presupuesto__campo">
          <span class="presupuesto__moneda" aria-hidden="true">S/</span>
          <label class="oculto-visual" for="presupuesto">Presupuesto de hoy en soles</label>
          <input id="presupuesto" name="presupuesto" type="number" min="0" max="100" step="0.5" value="${valor}">
        </div>
        <button class="boton" type="submit">Recalcular</button>
      </form>
      <div class="montos" style="margin-top:.7rem">
        ${MONTOS_RAPIDOS.map((m) => `<button type="button" class="monto" data-monto="${m}">S/${m}</button>`).join('')}
      </div>
    </section>

    ${bloqueRecomendacion(estado, { indice: '02', compacto: false })}

    <section class="bloque">
      ${encabezado('03', 'Dónde comer cerca', sitios ? `${sitios} sitios` : `${total} opciones`)}
      <p class="tenue">Locales dentro de la Universidad de Lima y en el perímetro, con su horario y sus
        minutos a pie desde el centro del campus. Los precios y las colas los corrigen los propios
        estudiantes desde Comunidad.</p>
      ${directorioCampus(estado.dataset)}
      ${procedenciaDataset(estado.dataset, total)}
    </section>`;
}

/**
 * De dónde salen estos precios. Va al final y en letra chica a propósito: es
 * información de procedencia, no una pantalla de créditos. Pero tiene que estar:
 * un mapeo sin fecha ni fuente es un rumor con tipografía bonita.
 */
function procedenciaDataset(dataset, total) {
  const meta = (dataset && dataset._meta) || {};
  if (meta.origen === 'dataset') {
    return `
      <p class="micro" style="margin-top:.9rem">
        ${total} opciones levantadas de las cartas publicadas por los propios locales y de mapas peatonales,
        verificadas el ${escapar(meta.actualizado || '—')}. Los tiempos de cola todavía no están medidos y
        por eso no los inventamos.
      </p>`;
  }
  return `
    <p class="micro" style="margin-top:.9rem">
      Estos precios vienen de una base de trabajo mientras se termina de conectar el levantamiento de campo.
    </p>`;
}

// --- Vista: PERFIL -----------------------------------------------------------
/** Calendario de 28 días: la constancia de un vistazo, sin números. */
function calendarioConstancia(patrones) {
  const set = new Set(patrones.dias.map((d) => d.dia));
  const hoy = patrones.hoy;
  const base = new Date(`${hoy}T00:00:00`);
  if (Number.isNaN(base.getTime())) return '';
  const celdas = [];
  for (let i = 27; i >= 0; i -= 1) {
    const dia = diaLocal(sumarDias(base, -i));
    const clase = set.has(dia) ? 'dia--lleno' : 'dia--vacio';
    celdas.push(`<span class="dia ${clase} ${i === 0 ? 'dia--hoy' : ''}" title="${escapar(fechaCorta(dia))}"></span>`);
  }
  return `<div class="calendario" aria-hidden="true">${celdas.join('')}</div>`;
}

function flecha(cambio) {
  // Sin mes anterior con datos no hay nada que comparar: mejor no decir nada
  // que inventar una mejora contra un mes vacío.
  if (!cambio) return '';
  if (cambio.direccion === 'igual') return '<span class="cambio cambio--igual">sin cambio</span>';
  const signo = cambio.valor > 0 ? '+' : '';
  const clase = cambio.direccion === 'sube' ? 'cambio--sube' : 'cambio--baja';
  return `<span class="cambio ${clase}">${signo}${cambio.valor} vs. mes pasado</span>`;
}

function tarjetaIdentidad(estado) {
  const nombre = nombreMostrado(estado);
  const p = estado.patrones;
  const nivel = estado.nivel;
  const desde = estado.sesion && estado.sesion.desde
    ? new Date(estado.sesion.desde).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    : null;

  return `
    <section class="identidad">
      <span class="identidad__avatar" aria-hidden="true">${escapar(iniciales(nombre))}</span>
      <div class="identidad__datos">
        <h1 class="titulo identidad__nombre">${escapar(nombre)}</h1>
        <p class="micro">${escapar(estado.perfil.campus)}${estado.perfil.facultad ? ` · ${escapar(estado.perfil.facultad)}` : ''}${desde ? ` · desde ${escapar(desde)}` : ''}</p>
        <div class="chips">
          ${nivel ? `<span class="chip chip--dato">${escapar(nivel.nombre)}</span>` : ''}
          ${p && p.gamificacionActiva && p.racha.dias > 0
            ? `<span class="chip chip--fuego">${icono('fuego', { tam: 13 })} ${p.racha.dias} ${p.racha.dias === 1 ? 'día' : 'días'} de racha</span>`
            : ''}
          <span class="chip">${estado.estadisticas.totalRegistros} ${estado.estadisticas.totalRegistros === 1 ? 'registro' : 'registros'}</span>
        </div>
      </div>
    </section>`;
}

function bloqueProgreso(estado) {
  const p = estado.patrones;
  const nivel = estado.nivel;
  if (!p || !p.dias.length) {
    return `
      <section class="bloque">
        ${encabezado('01', 'Cómo vas con los días')}
        <div class="tarjeta vacio">
          <div class="vacio__arte">${svgMascota('neutral')}</div>
          <p class="tenue" style="max-width:34ch">Todavía no hay nada que mostrar. Registra tu primer día
            y acá vas a ver cómo evoluciona tu semana.</p>
          <div class="acciones">
            <button class="boton" data-accion="ir" data-vista="hoy">Registrar hoy</button>
            <button class="boton boton--fantasma" data-accion="sembrar">Ver con datos de ejemplo</button>
          </div>
        </div>
      </section>`;
  }

  const m28 = p.ventanas[28];
  const almuerzos = m28.diasCrudos.filter((d) => d.comidas.almuerzo === 'hecha').length;

  return `
    <section class="bloque">
      ${encabezado('01', 'Cómo vas con los días', 'últimos 28 días')}
      <div class="tarjeta tarjeta--realce">
        <div class="progreso__cabecera">
          <div>
            <div class="tarjeta__etiqueta">Tu constancia</div>
            <h3 class="subtitulo">${escapar(nivel.nombre)}</h3>
          </div>
          <div class="progreso__cifra numero">${nivel.porcentaje}<small>%</small></div>
        </div>
        ${calendarioConstancia(p)}
        <p class="micro" style="margin-top:.6rem">
          ${nivel.diasRegistrados} de 28 días registrados.
          ${nivel.siguiente ? `Te faltan ${nivel.siguiente.faltan} puntos para “${escapar(nivel.siguiente.nombre)}”.` : 'Estás en el nivel más alto de constancia.'}
        </p>
      </div>

      <div class="estadisticas">
        <div class="estadistica">
          <div class="estadistica__valor">${m28.suenoPromedio ?? '—'}<small>h</small></div>
          <div class="estadistica__rotulo">sueño promedio</div>
        </div>
        <div class="estadistica">
          <div class="estadistica__valor">${almuerzos}</div>
          <div class="estadistica__rotulo">almuerzos registrados</div>
        </div>
        <div class="estadistica">
          <div class="estadistica__valor">${m28.presupuestoMediana !== null ? `<small>S/</small>${m28.presupuestoMediana}` : '—'}</div>
          <div class="estadistica__rotulo">presupuesto habitual</div>
        </div>
      </div>
    </section>`;
}

function bloqueInformePersonal(estado) {
  const suficiente = estado.patrones && estado.patrones.ventanas[28].diasConRegistro >= 3;
  return `
    <section class="bloque">
      ${encabezado('02', 'Tu informe')}
      <div class="tarjeta">
        <h3 class="subtitulo">Informe de tus últimas 4 semanas</h3>
        <p class="tenue" style="margin-top:.35rem">Un resumen escrito de cómo vienes: sueño, comidas,
          presupuesto y qué cambió respecto al mes pasado. Pensado para leerlo, no para analizarlo.</p>
        <div class="acciones">
          <button class="boton" data-accion="ir" data-vista="informe" ${suficiente ? '' : 'disabled'}>
            ${icono('ojo', { tam: 16 })} Ver mi informe</button>
        </div>
        ${suficiente ? '' : '<p class="micro" style="margin-top:.55rem">Necesitas al menos 3 días registrados para generarlo.</p>'}
      </div>
    </section>`;
}

const ROTULO_INDICADOR = {
  periodo: 'Periodo', campus: 'Campus', facultad: 'Facultad',
  diasRegistrados: 'Días registrados', adherencia: 'Uso del periodo', nivelDeUso: 'Nivel de constancia',
  bandaSuenoPromedio: 'Sueño promedio (rango)', nochesCortas: 'Noches de menos de 6 h',
  almuerzosCumplidos: 'Almuerzos cumplidos', bandaPresupuesto: 'Presupuesto (rango)',
  metasCumplidas: 'Logros del periodo', tendencia: 'Tendencia de uso'
};

function bloquePreferencias(estado) {
  const p = estado.perfil;
  return `
    <section class="bloque">
      ${encabezado('01', 'Tus datos básicos')}
      <div class="tarjeta">
        <form id="form-perfil" class="formulario">
          <label class="campo">
            <span class="campo__rotulo">¿Cómo te llamamos?</span>
            <input type="text" name="nombre" maxlength="40" placeholder="Camila" value="${escapar(p.nombre === 'Estudiante' ? '' : (p.nombre || ''))}">
          </label>
          <label class="campo">
            <span class="campo__rotulo">Facultad</span>
            <input type="text" name="facultad" maxlength="60" placeholder="Ing. Industrial" value="${escapar(p.facultad || '')}">
          </label>
          <label class="campo">
            <span class="campo__rotulo">Presupuesto típico de almuerzo (S/)</span>
            <input type="number" name="presupuestoTipico" min="0" max="100" step="0.5" value="${p.presupuestoTipico}">
          </label>
          <label class="campo">
            <span class="campo__rotulo">Minutos disponibles entre clases</span>
            <input type="number" name="minutosDisponibles" min="5" max="120" step="5" value="${p.minutosDisponibles}">
          </label>
          <label class="interruptor">
            <input type="checkbox" name="vegetariano" ${p.vegetariano ? 'checked' : ''}>
            <span>Soy vegetariano/a</span>
          </label>
          <button class="boton" type="submit">Guardar</button>
        </form>
      </div>
    </section>`;
}

function bloquePrivacidad(estado) {
  const e = estado.estadisticas;
  return `
    <section class="bloque">
      ${encabezado('06', 'Tu privacidad')}
      <div class="manifiesto">
        <div class="manifiesto__cifra numero">0</div>
        <p class="manifiesto__frase">frases tuyas salieron de este dispositivo.</p>
        <ul class="lista-marcada">
          <li>${icono('check', { tam: 15 })} Lo que escribes se entiende <strong>acá mismo</strong>, en tu navegador.</li>
          <li>${icono('check', { tam: 15 })} Tu historial vive solo en este dispositivo, sin cuenta en la nube.</li>
          <li>${icono('check', { tam: 15 })} A tu universidad solo llegan indicadores, y solo si tú lo activas.</li>
          <li>${icono('check', { tam: 15 })} Puedes llevarte tu información o borrarla completa en un clic.</li>
        </ul>
      </div>

      <div class="tarjeta tarjeta--plana" style="margin-top:.8rem">
        <ul class="lista-marcada lista-marcada--no">
          <li>${icono('veto', { tam: 15 })} No diagnostica. No es un dispositivo médico.</li>
          <li>${icono('veto', { tam: 15 })} No cuenta calorías, no pide peso ni IMC.</li>
          <li>${icono('veto', { tam: 15 })} No premia comer menos.</li>
          <li>${icono('veto', { tam: 15 })} No vende tu información a nadie.</li>
        </ul>
      </div>

      <p class="micro" style="margin-top:.7rem">
        ${e.totalRegistros} ${e.totalRegistros === 1 ? 'registro guardado' : 'registros guardados'} ·
        ${e.kilobytes} KB en este equipo${e.almacenamientoOk ? '' : ' · este navegador no está guardando nada, tus registros se pierden al cerrar'}
      </p>
    </section>`;
}

function bloqueDatos(estado) {
  const c2 = estado.capa2;
  return `
    <section class="bloque">
      ${encabezado('07', 'Tu información')}
      <div class="acciones" style="margin-top:0">
        <button class="boton boton--secundario" data-accion="importar">${icono('descarga', { tam: 16 })} Restaurar una copia</button>
        <button class="boton boton--secundario" data-accion="exportar">${icono('subida', { tam: 16 })} Guardar una copia</button>
        <button class="boton boton--secundario" data-accion="sembrar">${icono('semilla', { tam: 16 })} Cargar datos de ejemplo</button>
      </div>
      <p class="micro" style="margin-top:.55rem">
        La copia es un archivo tuyo: sirve para cambiar de celular o de navegador sin perder tu historial,
        y para llevarte tu información si algún día dejas de usar NUTRIA.
      </p>
      <input type="file" id="archivo-importar" accept="application/json" hidden>

      <details class="detalle">
        <summary>Opciones avanzadas</summary>
        <div class="detalle__cuerpo">
          <p class="tenue">Puedes activar un asistente extra que se descarga una sola vez en tu equipo y
            ayuda a entender las frases más enredadas. Funciona sin internet una vez descargado, y NUTRIA
            anda perfecto sin él.</p>
          <div class="acciones">
            <button class="boton boton--secundario" data-accion="capa2-cargar" ${c2.estado === 'cargando' ? 'disabled' : ''}>
              ${icono('descarga', { tam: 16 })}
              ${c2.estado === 'listo' ? 'Ya está activo' : 'Activar (~300 MB, una sola vez)'}
            </button>
          </div>
          ${c2.estado === 'cargando' && c2.mensaje ? `<p class="micro" style="margin-top:.5rem">${escapar(c2.mensaje)}</p>` : ''}
        </div>
      </details>

      <div class="acciones" style="margin-top:1.2rem">
        <button class="boton boton--fantasma" data-accion="salir">Cerrar sesión</button>
        <button class="boton boton--peligro" data-accion="borrar">${icono('basura', { tam: 16 })} Borrar todo mi historial</button>
      </div>
    </section>`;
}

function vistaPerfil(estado) {
  return `
    ${tarjetaIdentidad(estado)}
    ${bloquePreferencias(estado)}
    <section class="bloque">
      ${encabezado('02', 'Configuración y datos')}
      <div class="tarjeta" style="display:flex;flex-direction:column;gap:1.1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;">
          <div>
            <h3 class="subtitulo" style="margin:0 0 .25rem;">Perfil alimentario</h3>
            <p class="tenue" style="margin:0;font-size:.88rem;">Tus alergias, intolerancias y preferencias (lactosa, maní, gluten, vegetariano, etc.).</p>
          </div>
          <button class="boton boton--secundario" type="button" data-accion="ir" data-vista="perfil-alimentario">
            Configurar perfil ${icono('flecha', { tam: 14 })}
          </button>
        </div>

        <hr style="border:none;border-top:1px solid var(--linea);margin:0;">

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;">
          <div>
            <h3 class="subtitulo" style="margin:0 0 .25rem;">Tu privacidad y datos</h3>
            <p class="tenue" style="margin:0;font-size:.88rem;">Manifiesto de datos locales, exportar respaldo y opciones de almacenamiento.</p>
          </div>
          <button class="boton boton--secundario" type="button" data-accion="ir" data-vista="privacidad">
            Ver privacidad ${icono('flecha', { tam: 14 })}
          </button>
        </div>
      </div>
    </section>
    ${bloqueProgreso(estado)}
    <section class="bloque" style="text-align:center;margin-top:2.5rem;padding:1.6rem 1rem;border-top:1px solid var(--linea);">
      <button class="boton boton--fantasma" data-accion="salir" style="margin:0 auto;color:var(--aji);border-color:rgba(239,68,68,0.35);padding:.65rem 1.6rem;font-weight:600;">
        ${icono('veto', { tam: 15 })} Cerrar sesión
      </button>
      <p class="micro tenue" style="margin-top:.6rem;">
        Cierra la sesión activa en este equipo. Tu historial y preferencias se mantendrán guardados localmente.
      </p>
    </section>`;
}

function vistaPerfilAlimentario(estado) {
  const p = getDietaryProfile();
  return `
    <div class="bloque" style="max-width:760px;margin:0 auto;">
      <div style="margin-bottom:1.2rem">
        <button class="boton boton--texto" data-accion="ir" data-vista="perfil">${icono('flecha', { tam: 15 })} Volver a tus datos</button>
      </div>
      <section class="bloque" style="margin-top:0">
        ${encabezado('01', 'Perfil alimentario')}
        <p class="tenue" style="margin-bottom:1.2rem">
          Registra tus restricciones y preferencias. Se guardan localmente en tu dispositivo y NUTRIA las considera para filtrar lo que te recomienda comer.
        </p>
        ${renderDietaryProfileView(p)}
      </section>
    </div>`;
}

function vistaPrivacidad(estado) {
  return `
    <div class="bloque" style="max-width:760px;margin:0 auto;">
      <div style="margin-bottom:1.2rem">
        <button class="boton boton--texto" data-accion="ir" data-vista="perfil">${icono('flecha', { tam: 15 })} Volver a tus datos</button>
      </div>
      ${bloquePrivacidad(estado)}
      ${bloqueDatos(estado)}
    </div>`;
}

// --- Vista: INFORME ----------------------------------------------------------
function indicadorInforme(i) {
  const valor = i.valor === null || i.valor === undefined ? '—' : i.valor;
  return `
    <div class="informe__indicador">
      <div class="informe__rotulo">${escapar(i.rotulo)}</div>
      <div class="informe__valor numero">${escapar(String(valor))}<small>${escapar(i.unidad)}</small></div>
      ${flecha(i.cambio)}
      <p class="micro">${escapar(i.lectura)}</p>
    </div>`;
}

function vistaInforme(estado) {
  const inf = estado.informe;
  const nombre = nombreMostrado(estado);
  const rep = estado.reporteInstitucional;
  if (!inf) return '<section class="bloque"><p class="tenue">Todavía no hay suficiente información.</p></section>';

  const filasBienestar = rep ? Object.entries(rep.indicadores).map(([clave, valor]) => `
    <tr><th scope="row">${escapar(ROTULO_INDICADOR[clave] || clave)}</th><td>${escapar(String(valor))}</td></tr>`).join('') : '';

  return `
    <div class="informe">
      <div class="informe__acciones no-imprimir">
        <button class="boton boton--texto" data-accion="ir" data-vista="hoy">${icono('flecha', { tam: 15 })} Volver a inicio</button>
        <button class="boton boton--secundario" data-accion="imprimir">${icono('descarga', { tam: 16 })} Descargar o imprimir</button>
      </div>

      <header class="informe__portada">
        <div class="informe__sello">${icono('nutria', { tam: 20 })} NUTRIA</div>
        <h1 class="titulo informe__titulo">${escapar(inf.titular)}</h1>
        <p class="informe__resumen">${escapar(inf.resumen)}</p>
        <p class="micro">${escapar(nombre)} · ${escapar(inf.periodo.legible)}</p>
      </header>

      ${inf.restriccion.activa ? `
        <section class="tarjeta tarjeta--franja franja--cuidado">
          <h2 class="subtitulo">Antes que los números</h2>
          <p class="tenue" style="margin-top:.35rem">${escapar(inf.restriccion.mensaje)}
            Este mes no vas a ver puntajes ni rachas acá. Si quieres hablarlo con alguien, el servicio de
            bienestar de tu universidad es gratuito y confidencial.</p>
        </section>` : ''}

      <section class="bloque">
        <h2 class="informe__seccion">Tus números del mes</h2>
        <div class="informe__rejilla">${inf.indicadores.map(indicadorInforme).join('')}</div>
      </section>

      ${rep ? `
      <section class="bloque">
        <h2 class="informe__seccion">Esto es lo que llega al departamento de bienestar</h2>
        <div class="tarjeta">
          <p class="tenue" style="margin-bottom:.75rem">
            Indicadores agregados y anónimos del campus que se reportan periódicamente para evaluar las condiciones de bienestar y nutrición estudiantil.
          </p>
          <div class="chips" style="margin-top:.1rem">
            <span class="chip chip--ok">anónimo</span>
            <span class="chip chip--tenue">${escapar(rep.indicadores.periodo)}</span>
          </div>
          <div class="tabla-scroll" style="margin-top:.7rem">
            <table class="tabla">
              <tbody>${filasBienestar}</tbody>
            </table>
          </div>

          <details class="detalle" style="margin-top:.8rem">
            <summary>Qué NO llega nunca a bienestar</summary>
            <div class="detalle__cuerpo">
              <ul class="lista-marcada lista-marcada--no">
                ${rep.excluido.map((e) => `<li>${icono('veto', { tam: 15 })} ${escapar(e)}</li>`).join('')}
              </ul>
            </div>
          </details>
        </div>
      </section>` : ''}

      ${inf.patrones.length ? `
        <section class="bloque">
          <h2 class="informe__seccion">Lo que se repitió</h2>
          ${inf.patrones.map((p) => `
            <div class="informe__patron">
              <strong>${escapar(p.titulo)}</strong>
              <p class="tenue">${escapar(p.mensaje)}</p>
            </div>`).join('')}
        </section>` : ''}

      ${inf.sugerencias.length ? `
        <section class="bloque">
          <h2 class="informe__seccion">Qué probar la próxima semana</h2>
          <ol class="informe__sugerencias">
            ${inf.sugerencias.map((s) => `<li>${escapar(s)}</li>`).join('')}
          </ol>
        </section>` : ''}

      ${inf.insignias.length ? `
        <section class="bloque">
          <h2 class="informe__seccion">Lo que lograste</h2>
          <div class="chips">
            ${inf.insignias.map((i) => `<span class="chip chip--ok">${icono(i.icono, { tam: 13 })} ${escapar(i.nombre)}</span>`).join('')}
          </div>
        </section>` : ''}

      <footer class="informe__pie">
        <p class="micro">Informe generado en tu propio dispositivo el
          ${escapar(new Date(inf.generado).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }))}.
          NUTRIA no diagnostica ni reemplaza a un profesional de salud.</p>
      </footer>
    </div>`;
}

// --- Router ------------------------------------------------------------------
const VISTAS = {
  hoy: vistaHoy,
  patrones: vistaPatrones,
  historial: vistaHistorial,
  comida: vistaComida,
  comunidad: (estado) => renderComunidad(estado.dataset),
  perfil: vistaPerfil,
  'perfil-alimentario': vistaPerfilAlimentario,
  privacidad: vistaPrivacidad,
  informe: vistaInforme
};

export const ORDEN_VISTAS = ['hoy', 'patrones', 'historial', 'comida', 'comunidad', 'perfil'];

/** Qué pestaña queda marcada para cada vista (el informe cuelga del perfil). */
export const TAB_DE_VISTA = {
  informe: 'perfil',
  'perfil-alimentario': 'perfil',
  privacidad: 'perfil'
};

export function render(estado) {
  const fn = VISTAS[estado.vista] || vistaHoy;
  return fn(estado);
}

export function fraseParaEstado(estadoMascota) {
  return fraseMascota(estadoMascota.estado, estadoMascota.datos);
}
