/**
 * NUTRIA · Historial de ejemplo para la demo
 * -----------------------------------------------------------------------------
 * Importante para el jurado técnico: esto NO son registros pre-cocinados. Son
 * FRASES, y se pasan por el mismo analizador de la Capa 1 que usa la app en
 * vivo. Lo que se ve en la pantalla de patrones sale del parser real, no de un
 * JSON maquillado.
 *
 * El guion simula tres semanas de un ciclo: semana tranquila → semana de
 * parciales (sueño corto + almuerzos saltados en días de entrega) → recuperación.
 */

import { analizarTexto } from '../parser/analizador.js';
import { guardarRegistro, sumarDias } from './almacen.js';

export const GUION_DEMO = [
  // Semana 1 — relativamente ordenada (hace 20 a 14 días)
  { hace: 20, texto: 'dormí 7 horas, desayuné pan con palta y almorcé menú, me quedan 15 soles, tranqui' },
  { hace: 19, texto: 'dormí bien, almorcé arroz con pollo, ando con 14 lucas' },
  { hace: 18, texto: 'dormí 6 horas, desayuné avena, almorcé un menú de 10 soles, normal' },
  { hace: 16, texto: 'dormí 7 horas y media, almorcé ensalada de quinua, me quedan 15 soles' },
  { hace: 15, texto: 'dormí 6 horas, no desayuné, almorcé chaufa, tengo 12 soles' },
  { hace: 14, texto: 'dormí bien, almorcé caldo, tranqui, me quedan 13 soles' },

  // Semana 2 — semana de parciales (hace 13 a 7 días)
  { hace: 13, texto: 'dormí 5 horas, tengo parcial el jueves, almorcé rápido un pan con pollo, 10 soles' },
  { hace: 12, texto: 'dormí 4 horas, no almorcé, me quedan S/12 y tengo entrega mañana' },
  { hace: 11, texto: 'casi no dormí por la PC, desayuné rápido, ando con 8 lucas y estresado' },
  { hace: 10, texto: 'dormí 4 horas, no almorcé, entrega del trabajo final, ando con 8 soles, a mil' },
  { hace: 9, texto: 'no pegué el ojo, salté el almuerzo por la sustentación, estoy misio' },
  { hace: 8, texto: 'dormí 5 horas, almorcé salchipapa a las 5, quedé con 7 soles, agotado' },

  // Fin de semana sin registrar (hace 7 y 6): el motor tiene que tolerar huecos

  // Semana 3 — recuperación (hace 5 días a ayer)
  { hace: 5, texto: 'dormí 8 horas, desayuné y almorcé menú, me quedan 12 soles, tranqui' },
  { hace: 4, texto: 'dormí 7 horas, almorcé menestrón, ando con 11 lucas' },
  { hace: 3, texto: 'dormí 6 horas, no almorcé por el laboratorio, me quedan 10 soles, cansado' },
  { hace: 2, texto: 'dormí 7 horas, desayuné avena, almorcé pollo al horno, 14 soles, con toda' },
  { hace: 1, texto: 'dormí 6 horas y media, almorcé lomo saltado, me quedan 12 soles, normal' }
];

/**
 * Siembra el historial de ejemplo. Devuelve cuántos registros creó.
 * @param {Date} hoy inyectable para tests
 */
export function sembrarDemo(hoy = new Date()) {
  let creados = 0;
  for (const paso of GUION_DEMO) {
    const fecha = sumarDias(hoy, -paso.hace);
    fecha.setHours(19, 30, 0, 0);
    const analisis = analizarTexto(paso.texto);
    guardarRegistro({ texto: paso.texto, analisis, fecha, origen: 'demo' });
    creados += 1;
  }
  return creados;
}
