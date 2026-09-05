/**
 * NUTRIA · Capa 1 — Analizador determinístico
 * -----------------------------------------------------------------------------
 * Convierte una frase suelta en un registro estructurado. SIN IA, SIN RED:
 * reglas + gazetteer, en milisegundos, en cualquier equipo. Esta capa es el
 * mínimo garantizado del producto (Bloque 4.1 de la propuesta): si la Capa 2
 * nunca carga, NUTRIA sigue funcionando completa.
 *
 * Regla de oro del módulo: TODA extracción devuelve su evidencia (el fragmento
 * exacto del texto original que la justifica). Eso es lo que hace explicable al
 * motor de patrones río abajo: "no es caja negra".
 *
 * API pública:
 *   analizarTexto(texto)  -> Analisis
 *   resumirAnalisis(a)    -> string corto para chips de UI
 *   normalizar(texto)     -> string normalizado con índices preservados
 */

import {
  NUMEROS_PALABRA, UNIDADES_DINERO, CONTEXTO_DINERO, SIN_PLATA, NEGACIONES,
  COMIDAS, AYUNO_TOTAL, PLATOS, ANIMO, ENERGIA, CARGA_ACADEMICA,
  SUENO_CUALITATIVO, ACTIVIDAD, SENALES_RESTRICCION
} from './gazetteer.js';

// --- Normalización que PRESERVA ÍNDICES -------------------------------------
// No usamos NFD porque la descomposición cambia longitudes y perderíamos la
// capacidad de citar el texto original carácter por carácter.
const MAPA_ACENTOS = {
  'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
  'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o',
  'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ñ': 'n', 'ç': 'c',
  '¿': ' ', '¡': ' ', '\n': ' ', '\t': ' ', '\r': ' '
};

export function normalizar(texto) {
  let salida = '';
  const bajo = String(texto || '').toLowerCase();
  for (const caracter of bajo) {
    // Los emoji y caracteres fuera del BMP ocupan 2 unidades: los reemplazamos
    // por igual número de espacios para no desalinear los índices.
    if (caracter.length > 1) { salida += ' '.repeat(caracter.length); continue; }
    salida += MAPA_ACENTOS[caracter] !== undefined ? MAPA_ACENTOS[caracter] : caracter;
  }
  return salida;
}

// --- Utilidades de números ---------------------------------------------------
const PALABRAS_NUM = Object.keys(NUMEROS_PALABRA).sort((a, b) => b.length - a.length);
const FRAG_NUM = `(?:\\d+(?:[.,]\\d{1,2})?|${PALABRAS_NUM.join('|')})`;

function aNumero(bruto) {
  if (bruto == null) return null;
  const limpio = String(bruto).trim().toLowerCase();
  if (/^\d/.test(limpio)) return parseFloat(limpio.replace(',', '.'));
  return NUMEROS_PALABRA[limpio] ?? null;
}

function ev(textoOriginal, inicio, fin) {
  return { texto: textoOriginal.slice(inicio, fin).trim(), inicio, fin };
}

function contieneAlguna(cadena, lista) {
  return lista.some((p) => cadena.includes(p));
}

/** Busca la primera coincidencia de cualquier patrón de la lista. */
function buscarPatron(norm, patrones) {
  let mejor = null;
  for (const p of patrones) {
    const i = norm.indexOf(p);
    if (i !== -1 && (mejor === null || i < mejor.inicio)) mejor = { inicio: i, fin: i + p.length, patron: p };
  }
  return mejor;
}

// --- 1. Presupuesto ----------------------------------------------------------
function extraerPresupuesto(norm, original) {
  // 1a. "estoy misio", "ni un sol" → cero.
  const cero = buscarPatron(norm, SIN_PLATA);
  if (cero) {
    return { monto: 0, moneda: 'PEN', confianza: 0.9, evidencia: ev(original, cero.inicio, cero.fin), regla: 'sin_plata' };
  }

  // 1b. Símbolo de sol: "S/12", "s/ 12.50".
  const reSimbolo = new RegExp(`s\\/\\.?\\s*(${FRAG_NUM})`, 'g');
  let m = reSimbolo.exec(norm);
  if (m) {
    const monto = aNumero(m[1]);
    if (monto !== null) {
      return { monto, moneda: 'PEN', confianza: 0.98, evidencia: ev(original, m.index, m.index + m[0].length), regla: 'simbolo_sol' };
    }
  }

  // 1c. Unidad explícita: "12 lucas", "doce soles", "8 cocos".
  const reUnidad = new RegExp(`(${FRAG_NUM})\\s*(?:con\\s*(\\d{1,2})\\s*)?(${UNIDADES_DINERO.join('|')})\\b`, 'g');
  m = reUnidad.exec(norm);
  if (m) {
    let monto = aNumero(m[1]);
    if (monto !== null) {
      if (m[2]) monto += parseInt(m[2], 10) / 100;
      return { monto, moneda: 'PEN', confianza: 0.95, evidencia: ev(original, m.index, m.index + m[0].length), regla: 'unidad_dinero' };
    }
  }

  // 1d. Número desnudo con contexto de plata: "me quedan 12", "tengo 8".
  //     Se descarta si la unidad que sigue es de tiempo ("me quedan 4 horas").
  for (const frase of CONTEXTO_DINERO) {
    let desde = 0;
    while (true) {
      const i = norm.indexOf(frase, desde);
      if (i === -1) break;
      desde = i + frase.length;
      const cola = norm.slice(desde, desde + 24);
      const mm = new RegExp(`^\\s*(${FRAG_NUM})\\s*(\\w+)?`).exec(cola);
      if (mm) {
        const siguiente = (mm[2] || '');
        const esTiempo = /^(h|hrs?|horas?|min|minutos?|dias?|semanas?|clases?)$/.test(siguiente);
        const monto = aNumero(mm[1]);
        if (!esTiempo && monto !== null && monto <= 200) {
          return {
            monto, moneda: 'PEN', confianza: 0.8,
            evidencia: ev(original, i, desde + mm[0].length), regla: 'contexto_dinero'
          };
        }
      }
    }
  }

  return { monto: null, moneda: 'PEN', confianza: 0, evidencia: null, regla: null };
}

// --- 2. Sueño ----------------------------------------------------------------
function extraerSueno(norm, original) {
  // 2a. "dormí 4 horas", "dormí como 5", "dormí 6 y media", "dormí 7 horas y media".
  //     El "y media" puede ir antes o después de la unidad: aceptamos las dos.
  const reDormir = new RegExp(
    `(?:dorm|jate)\\w*\\s+(?:como\\s+|casi\\s+|solo\\s+|apenas\\s+|unas?\\s+|masomenos\\s+)?(${FRAG_NUM})(?:\\s*y\\s*(media|medio))?\\s*(horas?|hrs?|h)?(?:\\s*y\\s*(media|medio))?\\b`
  );
  let m = reDormir.exec(norm);
  if (m) {
    let horas = aNumero(m[1]);
    if (horas !== null && (m[3] || horas <= 14)) {
      if (m[2] || m[4]) horas += 0.5;
      return {
        horas, calidad: horas < 6 ? 'mala' : horas <= 9 ? 'buena' : 'larga',
        confianza: m[3] ? 0.97 : 0.85,
        evidencia: ev(original, m.index, m.index + m[0].length), regla: 'dormi_n_horas'
      };
    }
  }

  // 2b. "4 horas de sueño", "5 h durmiendo", "3 horas de jato".
  const reHorasSueno = new RegExp(`(${FRAG_NUM})\\s*(?:horas?|hrs?|h)\\s*(?:de\\s+sueno|de\\s+jato|durmiendo|jateando|de\\s+dormir|de\\s+jatear)`);
  m = reHorasSueno.exec(norm);
  if (m) {
    const horas = aNumero(m[1]);
    if (horas !== null) {
      return {
        horas, calidad: horas < 6 ? 'mala' : 'buena', confianza: 0.95,
        evidencia: ev(original, m.index, m.index + m[0].length), regla: 'n_horas_de_sueno'
      };
    }
  }

  // 2c. "me acosté a las 2 y me levanté a las 7" / "dormí de 2 a 7".
  const reRango = new RegExp(
    `(?:me\\s+acoste|dormi|me\\s+dormi)\\s*(?:a\\s+la[s]?\\s*|de\\s+la[s]?\\s*|de\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(?:am|pm)?\\s*(?:y\\s*(?:me\\s*)?(?:levante|desperte|pare)\\s*(?:a\\s+la[s]?\\s*)?|hasta\\s+la[s]?\\s*|a\\s+la[s]?\\s*|a\\s+)(\\d{1,2})(?::(\\d{2}))?`
  );
  m = reRango.exec(norm);
  if (m) {
    const ini = parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 60 : 0);
    const fin = parseInt(m[3], 10) + (m[4] ? parseInt(m[4], 10) / 60 : 0);
    let horas = fin - ini;
    if (horas <= 0) horas += 12;      // 11 pm → 7 am
    if (horas > 14) horas -= 12;
    if (horas > 0 && horas <= 14) {
      return {
        horas: Math.round(horas * 10) / 10,
        calidad: horas < 6 ? 'mala' : 'buena', confianza: 0.8,
        evidencia: ev(original, m.index, m.index + m[0].length), regla: 'rango_horario'
      };
    }
  }

  // 2d. Cualitativo: "casi no dormí", "dormí bien".
  for (const regla of SUENO_CUALITATIVO) {
    const hit = buscarPatron(norm, regla.patrones);
    if (hit) {
      return {
        horas: regla.horas, calidad: regla.calidad, confianza: 0.7,
        evidencia: ev(original, hit.inicio, hit.fin), regla: 'cualitativo', estimado: true
      };
    }
  }

  return { horas: null, calidad: null, confianza: 0, evidencia: null, regla: null };
}

// --- 3. Comidas y negaciones -------------------------------------------------
const CORTES = ['pero', 'aunque', 'sin embargo', '.', ';', 'igual'];

function ventanaAnterior(norm, indiceComida, indicesComidas) {
  let corte = Math.max(0, indiceComida - 32);
  for (const c of CORTES) {
    const i = norm.lastIndexOf(c, indiceComida - 1);
    if (i !== -1 && i + c.length > corte && i < indiceComida) corte = i + c.length;
  }
  for (const i of indicesComidas) {
    if (i.fin <= indiceComida && i.fin > corte) corte = i.fin;
  }
  return norm.slice(corte, indiceComida);
}

function hayNegacion(ventana) {
  return NEGACIONES.some((n) => new RegExp(`(^|\\W)${n}(\\W|$)`).test(ventana));
}

function extraerComidas(norm, original) {
  const resultado = { desayuno: null, almuerzo: null, cena: null };
  const evidencias = {};

  // 3a. Ayuno total declarado.
  const ayuno = buscarPatron(norm, AYUNO_TOTAL);
  if (ayuno) {
    for (const comida of Object.keys(resultado)) {
      resultado[comida] = 'saltada';
      evidencias[comida] = ev(original, ayuno.inicio, ayuno.fin);
    }
    return { comidas: resultado, evidencias, confianza: 0.85, saltos: 3, regla: 'ayuno_total' };
  }

  // 3b. Ubicar todas las menciones de comidas para poder cortar ventanas.
  const menciones = [];
  for (const [comida, variantes] of Object.entries(COMIDAS)) {
    for (const v of variantes) {
      const re = new RegExp(`(^|\\W)${v}(\\W|$)`, 'g');
      let m;
      while ((m = re.exec(norm)) !== null) {
        const inicio = m.index + m[1].length;
        menciones.push({ comida, inicio, fin: inicio + v.length });
        re.lastIndex = inicio + v.length;
      }
    }
  }
  menciones.sort((a, b) => a.inicio - b.inicio);

  let confianza = 0;
  for (const mencion of menciones) {
    if (resultado[mencion.comida] === 'saltada') continue; // una negación manda
    const ventana = ventanaAnterior(norm, mencion.inicio, menciones);
    const negada = hayNegacion(ventana);
    resultado[mencion.comida] = negada ? 'saltada' : 'hecha';
    const desde = negada ? Math.max(0, mencion.inicio - ventana.length) : mencion.inicio;
    evidencias[mencion.comida] = ev(original, desde, mencion.fin);
    confianza = Math.max(confianza, negada ? 0.92 : 0.85);
  }

  const saltos = Object.values(resultado).filter((v) => v === 'saltada').length;
  return { comidas: resultado, evidencias, confianza, saltos, regla: menciones.length ? 'comidas_por_negacion' : null };
}

// --- 4. Ánimo, energía, carga académica, actividad ---------------------------
function extraerAnimo(norm, original) {
  let mejor = null;
  for (const grupo of ANIMO) {
    const hit = buscarPatron(norm, grupo.patrones);
    if (!hit) continue;
    const previo = norm.slice(Math.max(0, hit.inicio - 14), hit.inicio);
    if (/(^|\W)(no|nada|ni)\s+\w*\s*$/.test(previo)) continue; // "no estoy estresado"
    const candidato = { etiqueta: grupo.etiqueta, valencia: grupo.valencia, evidencia: ev(original, hit.inicio, hit.fin), confianza: 0.85 };
    if (!mejor || Math.abs(candidato.valencia) > Math.abs(mejor.valencia)) mejor = candidato;
  }
  return mejor || { etiqueta: null, valencia: null, evidencia: null, confianza: 0 };
}

function extraerEnergia(norm, original, animo) {
  for (const grupo of ENERGIA) {
    const hit = buscarPatron(norm, grupo.patrones);
    if (hit) return { nivel: grupo.nivel, evidencia: ev(original, hit.inicio, hit.fin), confianza: 0.85 };
  }
  if (animo.etiqueta === 'cansado' || animo.etiqueta === 'quemado') {
    return { nivel: 'baja', evidencia: animo.evidencia, confianza: 0.6, derivado: true };
  }
  if (animo.etiqueta === 'motivado') {
    return { nivel: 'alta', evidencia: animo.evidencia, confianza: 0.6, derivado: true };
  }
  return { nivel: null, evidencia: null, confianza: 0 };
}

function extraerCarga(norm, original) {
  for (const grupo of CARGA_ACADEMICA) {
    const hit = buscarPatron(norm, grupo.patrones);
    if (hit) return { tipo: grupo.tipo, evidencia: ev(original, hit.inicio, hit.fin), confianza: 0.9 };
  }
  return { tipo: null, evidencia: null, confianza: 0 };
}

function extraerActividad(norm, original) {
  for (const grupo of ACTIVIDAD) {
    const hit = buscarPatron(norm, grupo.patrones);
    if (hit) return { hizo: grupo.hizo, evidencia: ev(original, hit.inicio, hit.fin), confianza: 0.85 };
  }
  return { hizo: null, evidencia: null, confianza: 0 };
}

function extraerPlatos(norm, original) {
  const encontrados = [];
  for (const plato of PLATOS) {
    const hit = buscarPatron(norm, plato.patrones);
    if (!hit) continue;
    if (encontrados.some((p) => hit.inicio >= p.inicio && hit.inicio < p.fin)) continue;
    encontrados.push({
      nombre: plato.nombre, categoria: plato.categoria, etiquetas: plato.etiquetas,
      inicio: hit.inicio, fin: hit.fin, evidencia: ev(original, hit.inicio, hit.fin)
    });
  }
  return encontrados.sort((a, b) => a.inicio - b.inicio);
}

function detectarRestriccion(norm, original) {
  const hit = buscarPatron(norm, SENALES_RESTRICCION);
  return hit ? { detectada: true, evidencia: ev(original, hit.inicio, hit.fin) } : { detectada: false, evidencia: null };
}

// --- 10. Tiempo disponible (HU-03) -------------------------------------------
const MARGENES_EVENTOS_ACADEMICOS = {
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

export function extraerTiempoDisponible(normOTexto, originalOpt) {
  const original = originalOpt !== undefined ? String(originalOpt || '') : String(normOTexto || '');
  const norm = originalOpt !== undefined ? String(normOTexto || '') : normalizar(original);

  if (!norm.trim()) {
    return { availableMinutes: null, rawMinutes: null, bufferMinutes: 0, bufferReason: null, eventoAcademico: null, evidencia: null, confianza: 0 };
  }

  const eventosLista = Object.keys(MARGENES_EVENTOS_ACADEMICOS).join('|');
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
    else rawMinutes = aNumero(tiempoStr);

    if (rawMinutes !== null && rawMinutes > 0) {
      const config = MARGENES_EVENTOS_ACADEMICOS[claveEvento] || { margen: 15, motivo: 'traslado y preparación previa' };
      const buffer = config.margen;
      const available = Math.max(5, rawMinutes - buffer);
      return {
        disponible: true,
        availableMinutes: available,
        minutosNetos: available,
        rawMinutes,
        minutosBrutos: rawMinutes,
        bufferMinutes: buffer,
        deduccionBufferMin: buffer,
        bufferReason: config.motivo,
        eventoAcademico: claveEvento,
        evidencia: ev(original, m.index, m.index + m[0].length),
        confianza: 0.95
      };
    }
  }

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
      evidencia: ev(original, m.index, m.index + m[0].length),
      confianza: 0.94
    };
  }

  const reMinutos = /(?:tengo|solo tengo|cuento con|me quedan?|apenas tengo)?\s*(\d+|[a-z]+)\s*(?:minutos?|mins?|min)\b(?:\s+(?:para|de)\s+(?:comer|almorzar|desayunar|cenar))?/i;
  m = reMinutos.exec(norm);
  if (m) {
    const val = aNumero(m[1]);
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
        evidencia: ev(original, m.index, m.index + m[0].length),
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

// --- Orquestador -------------------------------------------------------------
/**
 * @param {string} texto  frase cruda del estudiante
 * @returns {object} análisis estructurado, listo para almacen + motor
 */
export function analizarTexto(texto) {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const original = String(texto || '');
  const norm = normalizar(original);

  const presupuesto = extraerPresupuesto(norm, original);
  const sueno = extraerSueno(norm, original);
  const { comidas, evidencias, confianza: confComidas, saltos } = extraerComidas(norm, original);
  const animo = extraerAnimo(norm, original);
  const energia = extraerEnergia(norm, original, animo);
  const carga = extraerCarga(norm, original);
  const actividad = extraerActividad(norm, original);
  const platos = extraerPlatos(norm, original);
  const restriccion = detectarRestriccion(norm, original);
  const tiempoDisponible = extraerTiempoDisponible(norm, original);

  const faltantes = [];
  if (sueno.horas === null) faltantes.push('sueno');
  if (presupuesto.monto === null) faltantes.push('presupuesto');
  if (!Object.values(comidas).some(Boolean)) faltantes.push('comidas');
  if (!animo.etiqueta) faltantes.push('animo');

  const confianzas = [presupuesto.confianza, sueno.confianza, confComidas, animo.confianza].filter((c) => c > 0);
  const confianzaGlobal = confianzas.length ? confianzas.reduce((a, b) => a + b, 0) / confianzas.length : 0;

  const trazas = [];
  const anotar = (campo, obj) => { if (obj && obj.evidencia) trazas.push({ campo, regla: obj.regla || campo, cita: obj.evidencia.texto }); };
  anotar('presupuesto', presupuesto);
  anotar('sueno', sueno);
  for (const [comida, e] of Object.entries(evidencias)) trazas.push({ campo: comida, regla: comidas[comida], cita: e.texto });
  anotar('animo', animo);
  anotar('energia', energia);
  anotar('carga_academica', carga);
  anotar('actividad', actividad);
  anotar('tiempo_disponible', tiempoDisponible);
  for (const p of platos) trazas.push({ campo: 'plato', regla: p.nombre, cita: p.evidencia.texto });

  const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  return {
    version: 'capa1@1.0.0',
    texto: original,
    sueno,
    comidas,
    evidenciasComidas: evidencias,
    saltos,
    presupuesto,
    animo,
    energia,
    cargaAcademica: carga,
    actividad,
    platos,
    restriccion,
    tiempoDisponible,
    camposFaltantes: faltantes,
    confianzaGlobal: Math.round(confianzaGlobal * 100) / 100,
    ms: Math.round((t1 - t0) * 100) / 100,
    trazas,
    capa: 1
  };
}

const ETIQUETA_COMIDA = { desayuno: 'desayuno', almuerzo: 'almuerzo', cena: 'cena' };

/** Resumen corto para los chips de la UI. */
export function resumirAnalisis(a) {
  const partes = [];
  if (a.sueno.horas !== null) partes.push(`${a.sueno.horas} h de sueño${a.sueno.estimado ? ' (aprox.)' : ''}`);
  for (const [comida, estado] of Object.entries(a.comidas)) {
    if (estado === 'saltada') partes.push(`${ETIQUETA_COMIDA[comida]} saltado`);
    else if (estado === 'hecha') partes.push(`${ETIQUETA_COMIDA[comida]} ✓`);
  }
  if (a.presupuesto.monto !== null) partes.push(`S/${a.presupuesto.monto}`);
  if (a.tiempoDisponible && a.tiempoDisponible.availableMinutes !== null) {
    partes.push(`${a.tiempoDisponible.availableMinutes} min para comer${a.tiempoDisponible.bufferMinutes ? ` (traslado ${a.tiempoDisponible.bufferMinutes}m)` : ''}`);
  }
  if (a.animo.etiqueta) partes.push(a.animo.etiqueta);
  if (a.cargaAcademica.tipo) partes.push(a.cargaAcademica.tipo);
  if (a.platos.length) partes.push(a.platos.map((p) => p.nombre).join(', '));
  return partes;
}
