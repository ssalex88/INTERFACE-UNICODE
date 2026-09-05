/**
 * NUTRIA · Metas pequeñas
 * -----------------------------------------------------------------------------
 * Bloque 3.4 de la propuesta: "almuerza tres días esta semana", "registra cómo
 * te fue cuatro días" — calibradas a lo que es sostenible en semana de parciales,
 * no a lo ideal.
 *
 * Dos reglas duras:
 *  1. La meta se calcula como LÍNEA BASE + 1, con techo. Nunca pedimos un salto
 *     grande: pedir 7/7 a quien viene de 2/7 es diseñar el abandono.
 *  2. Si la contra-métrica de restricción está activa, NO se propone ninguna meta
 *     de comida. Se propone acompañamiento.
 */

import { diaLocal, sumarDias, diferenciaEnDias } from '../datos/almacen.js';
import { consolidarPorDia } from './patrones.js';

/** Clave de semana ISO: 2026-W36. La meta vive una semana, no para siempre. */
export function claveSemana(fecha = new Date()) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaISO = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaISO);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((d - inicioAno) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

/** Lunes de la semana de `fecha`, en formato YYYY-MM-DD. */
export function inicioDeSemana(fecha = new Date()) {
  const diaISO = fecha.getDay() === 0 ? 7 : fecha.getDay();
  return diaLocal(sumarDias(fecha, -(diaISO - 1)));
}

const TIPOS = {
  registros: {
    id: 'registros',
    texto: (n) => `Registra cómo te fue ${n} ${n === 1 ? 'día' : 'días'} esta semana.`,
    porque: 'Sin registro no hay patrón, y el patrón es lo único que te devuelve algo útil.',
    cumpleDia: () => true,
    techo: 5
  },
  almuerzos: {
    id: 'almuerzos',
    texto: (n) => `Almuerza ${n} ${n === 1 ? 'día' : 'días'} esta semana, aunque sea algo rápido.`,
    porque: 'Saltarse el almuerzo en semana de entregas es lo que más se repite en tus registros.',
    cumpleDia: (d) => d.comidas.almuerzo === 'hecha',
    techo: 5
  },
  sueno: {
    id: 'sueno',
    texto: (n) => `Duerme 7 horas ${n} ${n === 1 ? 'noche' : 'noches'} esta semana.`,
    porque: 'Dos noches largas cambian más la semana que intentar dormir bien los siete días.',
    cumpleDia: (d) => d.sueno !== null && d.sueno >= 7,
    techo: 4
  },
  desayuno: {
    id: 'desayuno',
    texto: (n) => `Desayuna ${n} ${n === 1 ? 'día' : 'días'} esta semana, aunque sea un pan con algo.`,
    porque: 'Registraste varios días arrancando sin comer nada.',
    cumpleDia: (d) => d.comidas.desayuno === 'hecha',
    techo: 4
  },
  acompanamiento: {
    id: 'acompanamiento',
    texto: () => 'Esta semana no te vamos a poner una meta de comida.',
    porque: 'Vimos señales de que comer se está volviendo un tema difícil. Si quieres hablarlo, el servicio de bienestar de tu universidad es gratuito y confidencial.',
    cumpleDia: () => false,
    techo: 0
  }
};

/** Línea base: cuántos días CUMPLIÓ el criterio en los últimos 7. */
function lineaBase(dias, tipo, hoy) {
  const limite = diaLocal(sumarDias(hoy, -6));
  return dias.filter((d) => d.dia >= limite && TIPOS[tipo].cumpleDia(d)).length;
}

/**
 * Propone UNA meta. Una sola, siempre: la lista de pendientes es el enemigo.
 * @param {object} analisis salida de analizarPatrones()
 * @param {Date}   hoy
 */
export function proponerMeta(analisis, hoy = new Date()) {
  const { ventanas, dias, restriccion } = analisis;
  const m7 = ventanas[7];
  const semana = claveSemana(hoy);

  const construir = (tipoId, objetivo) => {
    const tipo = TIPOS[tipoId];
    const n = Math.max(1, Math.min(objetivo, tipo.techo));
    return {
      id: `meta_${semana}_${tipoId}`,
      tipo: tipoId,
      semana,
      desdeDia: inicioDeSemana(hoy),
      objetivo: n,
      texto: tipo.texto(n),
      porque: tipo.porque,
      creada: new Date().toISOString(),
      gamificable: tipoId !== 'acompanamiento'
    };
  };

  // Regla 2: la contra-métrica manda sobre todo lo demás.
  if (restriccion.activa) return construir('acompanamiento', 0);

  // Prioridad 1: si casi no registra, todo lo demás es ruido.
  if (m7.diasConRegistro <= 2) {
    return construir('registros', lineaBase(dias, 'registros', hoy) + 2);
  }
  // Prioridad 2: almuerzo saltado repetido.
  if (m7.saltosAlmuerzo >= 2) {
    return construir('almuerzos', lineaBase(dias, 'almuerzos', hoy) + 1);
  }
  // Prioridad 3: sueño corto sostenido.
  if (m7.nochesCortas >= 3) {
    return construir('sueno', Math.max(2, lineaBase(dias, 'sueno', hoy) + 1));
  }
  // Prioridad 4: desayuno.
  const saltosDesayuno = m7.diasCrudos.filter((d) => d.comidas.desayuno === 'saltada').length;
  if (saltosDesayuno >= 3) {
    return construir('desayuno', lineaBase(dias, 'desayuno', hoy) + 1);
  }
  // Por defecto: sostener la constancia.
  return construir('registros', Math.min(5, lineaBase(dias, 'registros', hoy) + 1));
}

/** Progreso de la meta dentro de su propia semana. */
export function evaluarMeta(meta, registros, hoy = new Date()) {
  if (!meta) return null;
  const tipo = TIPOS[meta.tipo];
  const dias = consolidarPorDia(registros || []);
  const finSemana = diaLocal(sumarDias(new Date(`${meta.desdeDia}T00:00:00`), 6));
  const enSemana = dias.filter((d) => d.dia >= meta.desdeDia && d.dia <= finSemana);
  const cumplidos = enSemana.filter((d) => tipo.cumpleDia(d));
  const diasRestantes = Math.max(0, diferenciaEnDias(finSemana, diaLocal(hoy)));

  return {
    meta,
    hechos: cumplidos.length,
    objetivo: meta.objetivo,
    porcentaje: meta.objetivo ? Math.min(100, Math.round((cumplidos.length / meta.objetivo) * 100)) : 0,
    cumplida: meta.objetivo > 0 && cumplidos.length >= meta.objetivo,
    diasRestantes,
    evidencia: cumplidos.map((d) => ({ dia: d.dia, cita: d.textos[0] }))
  };
}

export { TIPOS as TIPOS_DE_META };
