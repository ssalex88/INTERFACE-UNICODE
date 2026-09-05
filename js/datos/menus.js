/**
 * NUTRIA · Carga del mapeo de comida del campus
 * -----------------------------------------------------------------------------
 * La base de menús (Bloque 4.4) es el activo difícil de copiar. Acá solo la
 * cargamos y le damos utilidades de filtrado por horario/día.
 *
 * DE DÓNDE SALE LO QUE SE VE EN PANTALLA (en este orden)
 * -----------------------------------------------------------------------------
 *  1. `dataset/*.csv` — el levantamiento REAL: 20 establecimientos y 65 platos
 *     del campus y su perímetro, con fuente y fecha por fila. Es la fuente de
 *     verdad y es lo que la app muestra hoy. Lo traduce `js/datos/ulima.js`.
 *  2. `data/menus-semilla.json` — la semilla SINTÉTICA con la que se construyó
 *     el motor. Se queda como respaldo: si el levantamiento no carga, la app
 *     sigue recomendando en vez de quedarse en blanco.
 *  3. Respaldo embebido — cinco opciones acá dentro, para el caso de abrir el
 *     index.html con file:// (sin servidor no hay fetch que valga).
 *
 * Cada nivel avisa en consola cuál se usó, y `_meta.origen` lo deja escrito en
 * el propio dataset para que la interfaz pueda decir la verdad sobre su fuente.
 */

import { cargarDatasetUlima } from './ulima.js';

/* Relativa al módulo por la misma razón que en ulima.js. */
const RUTA_SEMILLA = new URL('../../data/menus-semilla.json', import.meta.url);

const RESPALDO = {
  _meta: { estado: 'RESPALDO EMBEBIDO — el dataset completo no pudo cargarse', respaldo: true, origen: 'respaldo' },
  opciones: [
    { id: 'r1', plato: 'Menú del día: sopa + arroz con pollo', establecimiento: 'Menú Doña Rosa', zona: 'Manuel Olguín, 2 cuadras', precio: 10, categoria: 'menu_completo', etiquetas: ['caliente', 'contundente', 'proteina_animal', 'sopa'], aporte: { proteina: 'alta', verdura: 'media', carbohidrato: 'alta' }, tiempo_cola_min: 12, caminando_min: 4, horario: { desde: '00:00', hasta: '23:59' }, dias: [1, 2, 3, 4, 5, 6, 7], vegetariano: false, notas: '', alergenos_presentes: ['gluten'], alergenos_ausentes_verificados: ['lactosa'], alergenos_no_verificados: ['mani'], procedencia_dato: 'Declaración del establecimiento', fecha_actualizacion: '2026-09-01', nivel_confianza: 'alto' },
    { id: 'r2', plato: 'Caldo de gallina', establecimiento: 'Caldos Don Beto', zona: 'Manuel Olguín, 3 cuadras', precio: 12, categoria: 'sopa', etiquetas: ['caliente', 'reconstituyente', 'proteina_animal', 'sopa'], aporte: { proteina: 'alta', verdura: 'media', carbohidrato: 'media' }, tiempo_cola_min: 6, caminando_min: 6, horario: { desde: '00:00', hasta: '23:59' }, dias: [1, 2, 3, 4, 5, 6, 7], vegetariano: false, notas: '', alergenos_presentes: ['huevo'], alergenos_ausentes_verificados: ['lactosa'], alergenos_no_verificados: ['mani'], procedencia_dato: 'Relevamiento de campo LEAD', fecha_actualizacion: '2026-09-01', nivel_confianza: 'alto' },
    { id: 'r3', plato: 'Arroz chaufa de verduras', establecimiento: 'Chifa Express UL', zona: 'Frente a Puerta 3', precio: 11, categoria: 'plato_fuerte', etiquetas: ['caliente', 'vegetariano', 'rapido'], aporte: { proteina: 'media', verdura: 'alta', carbohidrato: 'alta' }, tiempo_cola_min: 8, caminando_min: 2, horario: { desde: '00:00', hasta: '23:59' }, dias: [1, 2, 3, 4, 5, 6, 7], vegetariano: true, notas: '', alergenos_presentes: ['soja'], alergenos_ausentes_verificados: ['lactosa', 'gluten'], alergenos_no_verificados: ['mani'], procedencia_dato: 'Declaración del establecimiento', fecha_actualizacion: '2026-09-01', nivel_confianza: 'alto' },
    { id: 'r4', plato: 'Menestrón con pan', establecimiento: 'Comedor El Paradero', zona: 'Paradero Javier Prado', precio: 9, categoria: 'sopa', etiquetas: ['caliente', 'verdura', 'vegetariano', 'sopa'], aporte: { proteina: 'media', verdura: 'alta', carbohidrato: 'alta' }, tiempo_cola_min: 10, caminando_min: 7, horario: { desde: '00:00', hasta: '23:59' }, dias: [1, 2, 3, 4, 5, 6, 7], vegetariano: true, notas: '', alergenos_presentes: ['gluten', 'lactosa'], alergenos_ausentes_verificados: [], alergenos_no_verificados: ['mani'], procedencia_dato: 'Relevamiento de campo LEAD', fecha_actualizacion: '2026-09-01', nivel_confianza: 'medio' },
    { id: 'r5', plato: 'Avena con plátano y pan', establecimiento: 'Carretilla del Desayuno', zona: 'Puerta 1, vereda', precio: 5, categoria: 'desayuno', etiquetas: ['caliente', 'economico', 'desayuno', 'vegetariano'], aporte: { proteina: 'baja', verdura: 'baja', carbohidrato: 'alta' }, tiempo_cola_min: 3, caminando_min: 1, horario: { desde: '00:00', hasta: '23:59' }, dias: [1, 2, 3, 4, 5, 6, 7], vegetariano: true, notas: '', alergenos_presentes: ['gluten'], alergenos_ausentes_verificados: ['lactosa', 'mani'], alergenos_no_verificados: [], procedencia_dato: 'Relevamiento de campo LEAD', fecha_actualizacion: '2026-09-01', nivel_confianza: 'alto' }
  ]
};

let cache = null;

async function cargarSemilla() {
  const respuesta = await fetch(RUTA_SEMILLA, { cache: 'no-store' });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const datos = await respuesta.json();
  if (!datos || !Array.isArray(datos.opciones) || !datos.opciones.length) throw new Error('semilla vacía');
  return { ...datos, _meta: { ...(datos._meta || {}), origen: 'semilla' }, establecimientos: [] };
}

export async function cargarMenus() {
  if (cache) return cache;
  try {
    cache = await cargarDatasetUlima();
  } catch (errorLevantamiento) {
    console.warn('[NUTRIA] No se pudo leer el levantamiento de dataset/, caigo a la semilla sintética.', errorLevantamiento);
    try {
      cache = await cargarSemilla();
    } catch (errorSemilla) {
      console.warn('[NUTRIA] Tampoco cargó la semilla, uso el respaldo embebido.', errorSemilla);
      cache = { ...RESPALDO, establecimientos: [] };
    }
  }
  return cache;
}

/** Vacía la caché. Solo lo usan las pruebas; la app carga una vez y ya. */
export function olvidarMenus() {
  cache = null;
}

/** 1 = lunes ... 7 = domingo (JS devuelve 0 para domingo). */
export function diaSemanaISO(fecha = new Date()) {
  const d = fecha.getDay();
  return d === 0 ? 7 : d;
}

export function minutosDelDia(fecha = new Date()) {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

function aMinutos(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function estaAbierto(opcion, ahora = new Date()) {
  if (Array.isArray(opcion.dias) && !opcion.dias.includes(diaSemanaISO(ahora))) return false;
  // Sin horario conocido no se puede afirmar que esté cerrado. Se deja pasar y
  // la tarjeta lo dice: "horario sin confirmar".
  if (!opcion.horario) return true;
  const t = minutosDelDia(ahora);
  return t >= aMinutos(opcion.horario.desde) && t <= aMinutos(opcion.horario.hasta);
}

/**
 * Minutos que le quedan de atención a una opción, o null si no se sabe.
 * Sirve para el "cierra en 40 min" de la ficha, que es el dato que de verdad
 * cambia la decisión a las 9 de la noche.
 */
export function minutosParaCerrar(opcion, ahora = new Date()) {
  if (!opcion.horario || !estaAbierto(opcion, ahora)) return null;
  return aMinutos(opcion.horario.hasta) - minutosDelDia(ahora);
}

export function metaDataset(datos) {
  return (datos && datos._meta) || {};
}
