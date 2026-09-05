/**
 * NUTRIA · Lector de CSV
 * -----------------------------------------------------------------------------
 * El levantamiento de campo vive en `dataset/*.csv` y el navegador tiene que
 * poder leerlo tal cual, sin build y sin dependencias. Por eso hay un lector
 * propio en vez de una librería: son 60 líneas y evita la única petición externa
 * que el proyecto no se permite.
 *
 * Soporta lo que el dataset realmente usa (RFC 4180 en su parte útil):
 *   · campos entrecomillados con comas adentro  ->  "Av. Javier Prado, Surco"
 *   · comillas escapadas dobles                 ->  "dijo ""hola"""
 *   · saltos de línea dentro de un campo entrecomillado
 *   · CRLF y LF mezclados
 *
 * No soporta separadores distintos de la coma: el dataset se escribe en coma y
 * fijarlo evita adivinar el delimitador, que es de donde salen los errores
 * silenciosos en los importadores.
 */

/**
 * Divide el texto en filas de celdas, sin interpretar cabecera.
 * @param {string} texto contenido completo del archivo
 * @returns {string[][]}
 */
export function filasCSV(texto) {
  // El BOM sobrevive a muchos exportadores y envenena el nombre de la primera
  // columna ("﻿restaurant_id"), que es un bug carísimo de encontrar.
  const fuente = String(texto || '').replace(/^﻿/, '');
  const filas = [];
  let fila = [];
  let celda = '';
  let entreComillas = false;

  for (let i = 0; i < fuente.length; i += 1) {
    const c = fuente[i];

    if (entreComillas) {
      if (c === '"') {
        if (fuente[i + 1] === '"') { celda += '"'; i += 1; }
        else entreComillas = false;
      } else {
        celda += c;
      }
      continue;
    }

    if (c === '"') { entreComillas = true; continue; }
    if (c === ',') { fila.push(celda); celda = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; continue; }
    celda += c;
  }

  // Última fila sin salto de línea final.
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }

  return filas.filter((f) => f.some((v) => String(v).trim() !== ''));
}

/**
 * CSV con cabecera -> lista de objetos. Las celdas llegan como texto limpio; la
 * conversión de tipos la decide quien conoce el dominio, no el lector.
 * @param {string} texto
 * @returns {Array<Record<string, string>>}
 */
export function leerCSV(texto) {
  const filas = filasCSV(texto);
  if (!filas.length) return [];
  const cabecera = filas[0].map((h) => h.trim());
  return filas.slice(1).map((fila) => {
    const objeto = {};
    cabecera.forEach((clave, i) => { objeto[clave] = (fila[i] ?? '').trim(); });
    return objeto;
  });
}

// --- Conversiones de tipo con "desconocido" de verdad ------------------------
/**
 * El dataset distingue entre "no" y "no se sabe", y esa diferencia es la regla
 * de calidad más importante que tiene ("es preferible dejar un campo en null que
 * inventar un dato"). Por eso una celda vacía devuelve null y NUNCA false.
 */
export function aBooleano(valor) {
  const v = String(valor ?? '').trim().toLowerCase();
  if (v === 'true' || v === 'si' || v === 'sí' || v === '1') return true;
  if (v === 'false' || v === 'no' || v === '0') return false;
  return null;
}

export function aNumero(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function aTexto(valor) {
  const v = String(valor ?? '').trim();
  return v || null;
}
