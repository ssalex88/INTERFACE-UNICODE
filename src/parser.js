/**
 * NUTRIA · Parser de Lenguaje Natural y Tiempo Disponible (HU-03)
 * -----------------------------------------------------------------------------
 * Extrae información sobre el tiempo disponible para comer a partir de frases
 * en lenguaje natural, distinguiendo entre tiempo directo para comer y tiempo
 * acotado por un compromiso académico próximo (parcial, entrega, clase).
 *
 * Consideración de producto (HU-03):
 * Si el estudiante dice "tengo parcial en 40 minutos", NUTRIA NO asume que los
 * 40 minutos completos están disponibles para comer. Aplica un margen de seguridad
 * para caminar al pabellón, ingresar al aula, preparar útiles y acomodarse.
 */

import { normalizar } from '../js/parser/analizador.js';

const PALABRAS_NUMEROS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20,
  veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60
};

const MARGENES_EVENTOS = {
  parcial: { margen: 15, motivo: 'traslado y preparación previa al examen' },
  examen: { margen: 15, motivo: 'traslado y preparación previa al examen' },
  final: { margen: 15, motivo: 'traslado y preparación previa al examen final' },
  sustentacion: { margen: 20, motivo: 'traslado y preparación previa a la sustentación' },
  practica: { margen: 15, motivo: 'traslado y preparación para la práctica calificada' },
  pc: { margen: 15, motivo: 'traslado y preparación para la práctica calificada' },
  entrega: { margen: 15, motivo: 'traslado e impresión/subida de la entrega' },
  clase: { margen: 10, motivo: 'caminata y llegada al salón de clase' },
  laboratorio: { margen: 10, motivo: 'traslado e ingreso al laboratorio' },
  taller: { margen: 10, motivo: 'traslado al taller' }
};

function parsearMinutos(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (PALABRAS_NUMEROS[s] !== undefined) return PALABRAS_NUMEROS[s];
  return null;
}

/**
 * Extrae el tiempo disponible para comer a partir del texto del estudiante.
 *
 * @param {string} texto Frase original en lenguaje natural
 * @returns {object} {
 *   availableMinutes: number|null,
 *   rawMinutes: number|null,
 *   bufferMinutes: number,
 *   bufferReason: string|null,
 *   eventoAcademico: string|null,
 *   evidencia: { texto: string, inicio: number, fin: number }|null,
 *   confianza: number
 * }
 */
export function extractAvailableTime(texto) {
  const original = String(texto || '');
  const norm = normalizar(original);

  if (!norm.trim()) {
    return {
      availableMinutes: null,
      rawMinutes: null,
      bufferMinutes: 0,
      bufferReason: null,
      eventoAcademico: null,
      evidencia: null,
      confianza: 0
    };
  }

  // 1. Detectar evento académico con límite de tiempo ("tengo parcial en 40 minutos")
  // Regex busca: (tengo|hay|con) [evento] en [N] (minutos|min|media hora|hora)
  const eventosLista = Object.keys(MARGENES_EVENTOS).join('|');
  const reEvento = new RegExp(
    `(?:tengo|hay|empieza|comienza|toca)?\\s*\\b(${eventosLista})\\w*\\b.*?\\ben\\s+(\\d+|media\\s+hora|una\\s+hora|hora|cuarto\\s+de\\s+hora|[a-z]+)\\s*(?:minutos?|mins?|min|horas?|h)?`,
    'i'
  );

  let m = reEvento.exec(norm);
  if (m) {
    const claveEvento = m[1].toLowerCase();
    const tiempoStr = m[2].toLowerCase();
    let rawMinutes = null;

    if (tiempoStr === 'media hora') rawMinutes = 30;
    else if (tiempoStr === 'una hora' || tiempoStr === 'hora') rawMinutes = 60;
    else if (tiempoStr === 'cuarto de hora') rawMinutes = 15;
    else rawMinutes = parsearMinutos(tiempoStr);

    if (rawMinutes !== null && rawMinutes > 0) {
      const configEvento = MARGENES_EVENTOS[claveEvento] || { margen: 15, motivo: 'traslado y preparación previa' };
      const buffer = configEvento.margen;
      // Los minutos disponibles descuentan el margen de seguridad para no llegar tarde
      const available = Math.max(5, rawMinutes - buffer);

      return {
        disponible: true,
        availableMinutes: available,
        minutosNetos: available,
        rawMinutes,
        minutosBrutos: rawMinutes,
        bufferMinutes: buffer,
        deduccionBufferMin: buffer,
        bufferReason: configEvento.motivo,
        eventoAcademico: claveEvento,
        evidencia: {
          texto: original.slice(m.index, m.index + m[0].length).trim(),
          inicio: m.index,
          fin: m.index + m[0].length
        },
        confianza: 0.95
      };
    }
  }

  // 2. Detectar expresiones coloquiales de tiempo directo ("solo tengo media hora", "tengo 1 hora")
  const reColoquial = /(?:tengo|solo tengo|cuento con|me queda|me dan|apenas tengo)\s+(media\s+hora|una\s+hora|cuarto\s+de\s+hora)(?:\s+(?:para|de)\s+(?:comer|almorzar|desayunar|cenar))?/i;
  m = reColoquial.exec(norm);
  if (m) {
    const expr = m[1].toLowerCase();
    let mins = 30;
    if (expr === 'una hora') mins = 60;
    if (expr === 'cuarto de hora') mins = 15;

    return {
      disponible: true,
      availableMinutes: mins,
      minutosNetos: mins,
      rawMinutes: mins,
      minutosBrutos: mins,
      bufferMinutes: 0,
      deduccionBufferMin: 0,
      bufferReason: null,
      eventoAcademico: null,
      evidencia: {
        texto: original.slice(m.index, m.index + m[0].length).trim(),
        inicio: m.index,
        fin: m.index + m[0].length
      },
      confianza: 0.94
    };
  }

  // 3. Detectar minutos explícitos directos ("tengo 20 minutos para comer", "20 min para almorzar", "tengo 25 minutos")
  const reMinutos = /(?:tengo|solo tengo|cuento con|me quedan?|apenas tengo)?\s*(\d+|[a-z]+)\s*(?:minutos?|mins?|min)\b(?:\s+(?:para|de)\s+(?:comer|almorzar|desayunar|cenar))?/i;
  m = reMinutos.exec(norm);
  if (m) {
    const val = parsearMinutos(m[1]);
    if (val !== null && val > 0 && val <= 180) {
      return {
        disponible: true,
        availableMinutes: val,
        minutosNetos: val,
        rawMinutes: val,
        minutosBrutos: val,
        bufferMinutes: 0,
        deduccionBufferMin: 0,
        bufferReason: null,
        eventoAcademico: null,
        evidencia: {
          texto: original.slice(m.index, m.index + m[0].length).trim(),
          inicio: m.index,
          fin: m.index + m[0].length
        },
        confianza: 0.92
      };
    }
  }

  return {
    disponible: false,
    availableMinutes: null,
    minutosNetos: null,
    rawMinutes: null,
    minutosBrutos: null,
    bufferMinutes: 0,
    deduccionBufferMin: 0,
    bufferReason: null,
    eventoAcademico: null,
    evidencia: null,
    confianza: 0
  };
}

export { extractAvailableTime as analizarTiempoDisponible };
