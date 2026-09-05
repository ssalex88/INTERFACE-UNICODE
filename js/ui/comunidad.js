/**
 * NUTRIA · Comunidad
 * -----------------------------------------------------------------------------
 * Reseñas de comida del campus escritas por estudiantes, retos de la semana y
 * el mecanismo que mantiene vivo el mapeo de sitios.
 *
 * Cada reseña lleva a su autor: nombre, facultad y cuándo la escribió. Sin eso
 * una reseña es un cartel anónimo y no vale nada —lo que la hace confiable es
 * que la escribió alguien que estudia en el mismo sitio y hace la misma cola—.
 *
 * NOTA DE FASE: los autores son de ejemplo y su perfil todavía no es navegable,
 * por eso el nombre no es un enlace. Cuando exista el perfil público, acá solo
 * cambia el contenedor del nombre.
 */

import { icono } from './iconos.js';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function iniciales(nombre) {
  const partes = String(nombre).trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[partes.length - 1]?.[0] || '')).toUpperCase();
}

/**
 * Reseñas de ejemplo. Los `id` apuntan a platos del levantamiento real
 * (`dataset/dishes.csv`), no a la semilla sintética: si la reseña habla de un
 * plato que no existe en el mapa, la tarjeta queda huérfana y se nota.
 *
 * Lo que dicen es contenido de ejemplo, pero es EXACTAMENTE el tipo de dato que
 * el levantamiento no tiene y solo la comunidad puede poner: cuánto dura la cola
 * a la 1 p.m. y si el precio de la carta sigue siendo el de la ventanilla.
 */
export const RESENAS = [
  {
    id: 'DISH-000012', autor: 'Camila Rojas', facultad: 'Ing. Industrial', ciclo: '7.º ciclo',
    estrellas: 4, precio: 15.9, cola: 'larga a la 1 pm', hace: 'hace 2 días', util: 34,
    texto: 'Es de lo poco del food court que viene con arroz y ensalada y no solo papas. Si vas 12:40 no haces cola; a la 1 en punto ya son 15 minutos parada.'
  },
  {
    id: 'DISH-000021', autor: 'Diego Ampuero', facultad: 'Derecho', ciclo: '5.º ciclo',
    estrellas: 5, precio: 15.9, cola: 'corta', hace: 'hace 3 días', util: 51,
    texto: 'El chaufa salva después de una amanecida: sale caliente y en cinco minutos. Pide que te echen más cebolla china, no cobran extra.'
  },
  {
    id: 'DISH-000051', autor: 'Fabiana Quispe', facultad: 'Psicología', ciclo: '6.º ciclo',
    estrellas: 4, precio: 10, cola: 'media', hace: 'hace 4 días', util: 28,
    texto: 'Lo más parecido a un desayuno de verdad que hay dentro del campus por S/10. Con un café ya te vas a S/21, ojo con eso.'
  },
  {
    id: 'DISH-000022', autor: 'Sebastián Ríos', facultad: 'Ing. de Sistemas', ciclo: '8.º ciclo',
    estrellas: 4, precio: 16.9, cola: 'media', hace: 'hace 5 días', util: 22,
    texto: 'El taypá trae verduras de verdad, no dos hojitas. Cuando me alcanza voy por este antes que por una hamburguesa.'
  },
  {
    id: 'DISH-000048', autor: 'Micaela Torres', facultad: 'Arquitectura', ciclo: '4.º ciclo',
    estrellas: 3, precio: 7.5, cola: 'nula', hace: 'hace 6 días', util: 40,
    texto: 'Te aguanta hasta las 11 y nada más, pero abre 7:00 y es lo único listo si tienes clase temprano.'
  },
  {
    id: 'DISH-000015', autor: 'Joaquín Bravo', facultad: 'Comunicación', ciclo: '3.er ciclo',
    estrellas: 2, precio: 10.9, cola: 'corta', hace: 'hace 1 semana', util: 12,
    texto: 'Rápido y barato, pero al toque te da sueño. Solo de emergencia, no lo hagas costumbre como yo el ciclo pasado.'
  },
  {
    id: 'DISH-000020', autor: 'Valeria Chávez', facultad: 'Negocios Internacionales', ciclo: '6.º ciclo',
    estrellas: 4, precio: 12.9, cola: 'media', hace: 'hace 1 semana', util: 37,
    texto: 'La personal con papa mediana es lo más barato que te deja lleno dentro del campus. Debajo de eso ya son snacks.'
  },
  {
    id: 'DISH-000056', autor: 'Renzo Palomino', facultad: 'Economía', ciclo: '9.º ciclo',
    estrellas: 3, precio: 20, cola: 'corta', hace: 'hace 1 semana', util: 9,
    texto: 'Cruzar al Óval son 5 minutos y sale rápido, pero a S/20 es un gustito, no un almuerzo de martes.'
  }
];

export const RETOS = [
  { titulo: 'Semana del almuerzo', descripcion: 'Almuerza 3 días esta semana', participantes: 128, tuyo: true },
  { titulo: 'Antes de las 12', descripcion: 'Desayuna 4 días', participantes: 91, tuyo: false }
];

function estrellas(n) {
  return `<span class="estrellas" aria-label="${n} de 5 estrellas">${'★'.repeat(n)}<span>${'★'.repeat(5 - n)}</span></span>`;
}

/**
 * Ficha del autor. Es un <div>, no un enlace, a propósito: el perfil público
 * todavía no existe y un nombre que parece clicable y no lleva a ningún lado se
 * siente roto.
 */
function autor(r) {
  return `
    <div class="autor">
      <span class="autor__avatar" aria-hidden="true">${escapar(iniciales(r.autor))}</span>
      <span class="autor__datos">
        <span class="autor__nombre">${escapar(r.autor)}</span>
        <span class="autor__meta">${escapar(r.facultad)} · ${escapar(r.ciclo)}</span>
      </span>
      <span class="autor__fecha">${escapar(r.hace)}</span>
    </div>`;
}

export function renderComunidad(datasetMenus) {
  const porId = new Map(((datasetMenus && datasetMenus.opciones) || []).map((o) => [o.id, o]));

  const resenas = RESENAS.filter((r) => porId.has(r.id)).map((r) => {
    const o = porId.get(r.id);
    return `
      <article class="tarjeta resena">
        ${autor(r)}
        <div class="resena__cabecera">
          <div>
            <div class="resena__plato">${escapar(o ? o.plato : 'Opción del campus')}</div>
            <div class="resena__sitio">${escapar(o ? o.establecimiento : '')}</div>
          </div>
          ${estrellas(r.estrellas)}
        </div>
        <p class="resena__texto">${escapar(r.texto)}</p>
        <div class="chips">
          <span class="chip">S/${r.precio}</span>
          <span class="chip">${icono('reloj', { tam: 13 })} cola ${escapar(r.cola)}</span>
        </div>
        <div class="resena__pie">
          <span>${icono('corazon', { tam: 13 })} ${r.util} lo encontraron útil</span>
        </div>
      </article>`;
  }).join('');

  const retos = RETOS.map((r) => `
    <article class="tarjeta reto ${r.tuyo ? 'reto--activo' : ''}">
      <div class="reto__titulo">
        ${escapar(r.titulo)}
        ${r.tuyo ? '<span class="pill pill--ok">activo</span>' : ''}
      </div>
      <p class="tenue">${escapar(r.descripcion)}</p>
      <div class="reto__pie">${r.participantes} estudiantes del campus</div>
    </article>`).join('');

  return `
    <section class="bloque">
      <div class="encabezado">
        <span class="encabezado__indice" aria-hidden="true">01</span>
        <h2 class="encabezado__titulo">Retos de la semana</h2>
      </div>
      <p class="tenue">Retos de constancia, en grupo. Nunca de peso, calorías ni déficit.</p>
      <div class="rejilla">${retos}</div>
    </section>

    <section class="bloque">
      <div class="encabezado">
        <span class="encabezado__indice" aria-hidden="true">02</span>
        <h2 class="encabezado__titulo">Reseñas del campus</h2>
        <span class="encabezado__extra">${RESENAS.filter((r) => porId.has(r.id)).length}</span>
      </div>
      <p class="tenue">La carta del local dice el precio; no dice cuánto dura la cola a la 1 p.m. ni si ese
        precio sigue siendo el de la ventanilla. Eso solo lo sabe quien hace la misma cola que tú.</p>
      ${resenas}
    </section>`;
}
