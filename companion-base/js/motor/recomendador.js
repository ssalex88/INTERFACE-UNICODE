/**
 * NUTRIA · Recomendador por presupuesto y contexto
 * -----------------------------------------------------------------------------
 * Cruza lo que el estudiante acaba de escribir + lo que el motor de patrones
 * sabe de sus últimas semanas + el mapeo de sitios del campus, y devuelve como
 * máximo 3 opciones REALES con el porqué escrito al lado.
 *
 * Nunca muestra calorías ni macros. Nunca premia comer menos. El orden no se
 * vende: `patrocinado` no participa del puntaje.
 *
 * QUÉ CAMBIA CON EL PRESUPUESTO (y por qué antes no cambiaba)
 * -----------------------------------------------------------------------------
 * El presupuesto empezó siendo solo un filtro: con S/10 y con S/20 sobrevivían
 * las mismas opciones baratas y, como el puntaje premiaba "que sobre plata", la
 * más barata ganaba siempre. Resultado: el mismo plato de S/10 a S/20.
 *
 * Ahora el presupuesto ordena, no solo filtra:
 *   1. `nutricion`        — proteína + verdura del plato. Es lo que de verdad
 *                           mejora cuando alcanza para más, y por eso pesa más
 *                           que cualquier otro término.
 *   2. `aprovechamiento`  — un plato de S/6 no resuelve un almuerzo de S/20:
 *                           por debajo del 40 % del presupuesto no suma nada, y
 *                           de ahí sube hasta aprovecharlo bien. Nunca empuja a
 *                           gastar de más: el techo está en gastarlo completo y
 *                           siempre se muestra la alternativa más barata.
 *   3. `franja`           — a la 1 p.m. un yogurt no es un almuerzo. La hora del
 *                           día decide qué categoría de plato tiene sentido.
 * Con eso, S/8 → menú económico, S/10 → menú del día, S/15+ → plato con verdura
 * y proteína completa. El presupuesto se nota.
 */

import { estaAbierto, diaSemanaISO, minutosDelDia } from '../datos/menus.js';
import { evaluateCompatibility } from './compatibilidad.js';

const PESOS = {
  nutricion: 3.2,
  franja: 1.6,
  completitud: 1.4,
  aprovechamiento: 1.2,
  saltoAlmuerzo: 2.2,
  suenoCorto: 1.6,
  estres: 0.8,
  colaCorta: 0.6,
  cercania: 0.5,
  verduraPendiente: 1.2,
  repeticion: -1.8,
  ultraprocesado: -0.7,
  vegetarianoPerfil: 2.5
};

// --- Franja del día ----------------------------------------------------------
/** Qué se está buscando según la hora. La comida tiene horario, no solo precio. */
export function franjaDelDia(ahora = new Date()) {
  const m = minutosDelDia(ahora);
  if (m < 5 * 60) return 'cena';
  if (m < 11 * 60) return 'desayuno';
  if (m < 16 * 60 + 30) return 'almuerzo';
  if (m < 19 * 60) return 'tarde';
  return 'cena';
}

const NOMBRE_FRANJA = {
  desayuno: 'desayuno', almuerzo: 'almuerzo', tarde: 'algo de la tarde', cena: 'cena'
};

/** Cuánto encaja cada categoría de plato en cada momento del día (0 a 1). */
const ENCAJE_FRANJA = {
  desayuno: { desayuno: 1, snack: 0.75, sandwich: 0.7, sopa: 0.45, ensalada: 0.3, menu_completo: 0.2, plato_fuerte: 0.15 },
  almuerzo: { menu_completo: 1, plato_fuerte: 0.9, sopa: 0.75, ensalada: 0.6, sandwich: 0.3, snack: 0.1, desayuno: 0.05 },
  tarde:    { snack: 1, sandwich: 0.9, desayuno: 0.6, ensalada: 0.55, sopa: 0.45, plato_fuerte: 0.4, menu_completo: 0.35 },
  cena:     { plato_fuerte: 1, menu_completo: 0.95, sopa: 0.85, ensalada: 0.6, sandwich: 0.5, snack: 0.2, desayuno: 0.1 }
};

/** Qué tan "plato completo" es cada categoría, sin mirar el precio. */
const COMPLETITUD = {
  menu_completo: 1, plato_fuerte: 0.8, sopa: 0.6, ensalada: 0.55,
  sandwich: 0.35, desayuno: 0.3, snack: 0.15
};

const ESCALA_APORTE = { alta: 1, media: 0.55, baja: 0.1 };

/** Proteína y verdura del plato, en una sola cifra de 0 a 1. */
function nutricion(opcion) {
  const a = opcion.aporte || {};
  const proteina = ESCALA_APORTE[a.proteina] ?? 0.35;
  const verdura = ESCALA_APORTE[a.verdura] ?? 0.35;
  return (proteina + verdura) / 2;
}

/**
 * Qué tanto resuelve esta opción el presupuesto que hay hoy.
 * Por debajo del 40 % no suma (un snack no es un almuerzo de S/20); de 40 % a
 * 75 % sube; de ahí arriba está aprovechado. El techo es gastar el presupuesto
 * completo: no existe premio por gastar más, porque no se puede.
 */
function aprovechamiento(precio, presupuesto) {
  if (presupuesto <= 0) return 0;
  const razon = precio / presupuesto;
  if (razon <= 0.4) return 0;
  if (razon >= 0.75) return 1;
  return (razon - 0.4) / 0.35;
}

function platosRecientes(patrones, dias = 7) {
  const recientes = (patrones.ventanas[dias] && patrones.ventanas[dias].diasCrudos) || [];
  const cuenta = new Map();
  for (const d of recientes) {
    for (const p of d.platos) cuenta.set(p, (cuenta.get(p) || 0) + 1);
  }
  return cuenta;
}

function pareceMismoPlato(opcion, nombrePlato) {
  const a = opcion.plato.toLowerCase();
  const b = String(nombrePlato).toLowerCase();
  return a.includes(b) || b.includes(a.split(':')[0].trim());
}

function redondear(n) {
  return Math.round(n * 10) / 10;
}

/**
 * @param {object} args
 * @param {object} args.datasetMenus  salida de cargarMenus()
 * @param {object|null} args.analisis registro recién escrito (puede ser null)
 * @param {object} args.patrones      salida de analizarPatrones()
 * @param {object} args.perfil        preferencias locales
 * @param {Date}   args.ahora
 */
export function recomendar({ datasetMenus, analisis, patrones, perfil, ahora = new Date() }) {
  const opciones = (datasetMenus && datasetMenus.opciones) || [];
  const m7 = patrones.ventanas[7];
  const franja = franjaDelDia(ahora);

  // 1. Presupuesto efectivo, con su procedencia (explicabilidad).
  let presupuesto = null;
  let fuentePresupuesto = null;
  if (analisis && analisis.presupuesto && analisis.presupuesto.monto !== null) {
    presupuesto = analisis.presupuesto.monto;
    fuentePresupuesto = analisis.presupuesto.manual
      ? 'el monto que ajustaste a mano'
      : `lo que escribiste hoy ("${analisis.presupuesto.evidencia ? analisis.presupuesto.evidencia.texto : presupuesto}")`;
  } else if (m7.presupuestoMediana !== null) {
    presupuesto = m7.presupuestoMediana;
    fuentePresupuesto = 'tu presupuesto de los últimos días';
  } else {
    presupuesto = perfil.presupuestoTipico;
    fuentePresupuesto = 'tu presupuesto habitual';
  }

  // 2. Caso "hoy no hay plata": no inventamos opciones, cambiamos el mensaje.
  if (presupuesto <= 0) {
    const baratas = opciones.slice().sort((a, b) => a.precio - b.precio).slice(0, 2);
    return {
      presupuesto, fuentePresupuesto, franja, sinPresupuesto: true, relajadoHorario: false,
      totalCandidatas: opciones.length, alternativaBarata: null, techoAlcanzado: null,
      mensaje: 'Hoy no hay presupuesto. Estas son las dos opciones más baratas que tenemos cerca, y si la cosa está difícil, el comedor universitario y bienestar tienen apoyo alimentario.',
      recomendaciones: baratas.map((opcion) => ({ opcion, puntaje: 0, razones: [`Es de lo más barato de la zona: S/${opcion.precio}.`] }))
    };
  }

  // 3. Filtros duros: presupuesto, día, horario, preferencia alimentaria.
  const dentroDePresupuesto = opciones.filter((o) => o.precio <= presupuesto);
  const porPreferencia = perfil.vegetariano ? dentroDePresupuesto.filter((o) => o.vegetariano) : dentroDePresupuesto;
  let candidatas = porPreferencia.filter((o) => estaAbierto(o, ahora));
  let relajadoHorario = false;
  if (!candidatas.length && porPreferencia.length) {
    // Degradación: si nada está abierto a esta hora, mostramos igual y lo decimos.
    candidatas = porPreferencia.filter((o) => !Array.isArray(o.dias) || o.dias.includes(diaSemanaISO(ahora)));
    if (!candidatas.length) candidatas = porPreferencia;
    relajadoHorario = true;
  }

  // 4. Contexto del día para el puntaje.
  const saltoAlmuerzo = !!(analisis && analisis.comidas && analisis.comidas.almuerzo === 'saltada');
  const suenoCorto = !!(analisis && analisis.sueno && analisis.sueno.horas !== null && analisis.sueno.horas < 6)
    || (m7.suenoPromedio !== null && m7.suenoPromedio < 6);
  const conEstres = !!(analisis && analisis.animo && analisis.animo.valencia !== null && analisis.animo.valencia <= -2);
  const faltaVerdura = m7.diasConRegistro >= 3 && m7.diasConVerdura <= 1;
  const recientes = platosRecientes(patrones, 7);
  const minutos = perfil.minutosDisponibles || 25;

  const puntuadas = candidatas.map((opcion) => {
    let puntaje = 0;
    const razones = [];
    const etiquetas = opcion.etiquetas || [];
    const aporte = opcion.aporte || {};

    // 4a. Lo que el plato aporta. El término que más pesa, y el que hace que
    //     subir el presupuesto cambie la respuesta.
    const nutre = nutricion(opcion);
    puntaje += nutre * PESOS.nutricion;
    if (aporte.proteina === 'alta' && aporte.verdura === 'alta') {
      razones.push('Trae proteína y verdura en el mismo plato: es lo más completo que te alcanza hoy.');
    } else if (aporte.proteina === 'alta') {
      razones.push('Tiene proteína alta: te sostiene más que algo solo dulce o de harina.');
    } else if (aporte.verdura === 'alta') {
      razones.push('Es de las pocas opciones con verdura de verdad en tu rango.');
    }

    // 4b. Qué tanto resuelve tu presupuesto de hoy.
    const aprovecha = aprovechamiento(opcion.precio, presupuesto);
    puntaje += aprovecha * PESOS.aprovechamiento;

    // 4c. Qué se busca a esta hora.
    const encaje = (ENCAJE_FRANJA[franja] || {})[opcion.categoria] ?? 0.4;
    const completo = COMPLETITUD[opcion.categoria] ?? 0.4;
    puntaje += encaje * PESOS.franja;
    puntaje += completo * PESOS.completitud;
    if (encaje <= 0.2) {
      razones.push(`Ojo: para ${NOMBRE_FRANJA[franja]} queda corto, lo dejamos abajo.`);
    } else if (encaje >= 0.85 && completo >= 0.8) {
      razones.push(`Es un plato completo para ${NOMBRE_FRANJA[franja]}, no un snack para aguantar.`);
    }

    // 4d. Contexto de hoy y de la semana.
    if (saltoAlmuerzo && (etiquetas.includes('contundente') || etiquetas.includes('caliente'))) {
      puntaje += PESOS.saltoAlmuerzo;
      razones.push('Hoy te saltaste el almuerzo: priorizamos algo caliente y que llene.');
    }
    if (suenoCorto && aporte.proteina === 'alta') {
      puntaje += PESOS.suenoCorto;
      razones.push('Vienes durmiendo poco: esta opción tiene proteína alta y no es solo azúcar.');
    }
    if (conEstres && (etiquetas.includes('rapido') || opcion.tiempo_cola_min <= 8)) {
      puntaje += PESOS.estres;
      razones.push('Día cargado: la cola acá es corta.');
    }
    if (faltaVerdura && (aporte.verdura === 'alta' || etiquetas.includes('verdura'))) {
      puntaje += PESOS.verduraPendiente;
      razones.push('Esta semana casi no registraste verduras y esta opción sí trae.');
    }
    if (opcion.tiempo_cola_min + opcion.caminando_min * 2 <= minutos) {
      puntaje += PESOS.colaCorta;
    }
    if (opcion.caminando_min <= 4) {
      puntaje += PESOS.cercania;
      razones.push(`A ${opcion.caminando_min || 0} min de la puerta.`);
    }
    for (const [nombre, veces] of recientes) {
      if (pareceMismoPlato(opcion, nombre) && veces >= 2) {
        puntaje += PESOS.repeticion;
        razones.push(`Ojo: comiste ${nombre} ${veces} veces esta semana, por eso baja en la lista.`);
        break;
      }
    }
    if (etiquetas.includes('frito') || etiquetas.includes('ultraprocesado')) {
      puntaje += PESOS.ultraprocesado;
    }
    if (perfil.vegetariano && opcion.vegetariano) puntaje += PESOS.vegetarianoPerfil;

    // 4e. La plata que sobra es información, no puntaje: si la premiáramos,
    //     lo más barato ganaría siempre y volveríamos al bug de origen.
    const vuelto = redondear(presupuesto - opcion.precio);
    if (vuelto >= 1) razones.push(`Te quedan S/${vuelto} de tus S/${presupuesto}.`);

    if (!razones.length) razones.push(`Entra en tus S/${presupuesto} y está disponible ahora.`);

    return {
      opcion,
      puntaje: Math.round(puntaje * 100) / 100,
      aprovecha: Math.round(aprovecha * 100) / 100,
      nutre: Math.round(nutre * 100) / 100,
      // Más de cuatro razones dejan de leerse y la tarjeta se vuelve un muro.
      razones: razones.slice(0, 4)
    };
  });

  // Desempate explícito: mejor puntaje → mejor aporte → más barato.
  puntuadas.sort((a, b) =>
    b.puntaje - a.puntaje || b.nutre - a.nutre || a.opcion.precio - b.opcion.precio);

  const elegidas = puntuadas.slice(0, 3);

  // La alternativa más barata SIEMPRE está a la vista: recomendar el plato que
  // aprovecha el presupuesto no puede convertirse en empujar a gastarlo.
  const masBarata = puntuadas.slice().sort((a, b) => a.opcion.precio - b.opcion.precio)[0] || null;
  const alternativaBarata = masBarata && elegidas[0] && masBarata.opcion.id !== elegidas[0].opcion.id
    && masBarata.opcion.precio < elegidas[0].opcion.precio
    ? masBarata
    : null;

  // Si el presupuesto se quedó corto para algo mejor, se dice con cuánto sí.
  const fueraDeAlcance = opciones
    .filter((o) => o.precio > presupuesto && (!perfil.vegetariano || o.vegetariano))
    .filter((o) => nutricion(o) > (elegidas[0] ? nutricion(elegidas[0].opcion) : 0))
    .sort((a, b) => a.precio - b.precio)[0] || null;

  return {
    presupuesto,
    fuentePresupuesto,
    franja,
    sinPresupuesto: false,
    relajadoHorario,
    totalCandidatas: candidatas.length,
    alternativaBarata,
    techoAlcanzado: fueraDeAlcance
      ? { plato: fueraDeAlcance.plato, precio: fueraDeAlcance.precio, faltan: redondear(fueraDeAlcance.precio - presupuesto) }
      : null,
    mensaje: candidatas.length
      ? `Con S/${presupuesto} para ${NOMBRE_FRANJA[franja]}${relajadoHorario ? ' (ya fuera del horario de atención, te las mostramos igual)' : ''}, cerca de tu facultad:`
      : `Con S/${presupuesto} no encontramos nada abierto cerca ahora mismo. Prueba subiendo un poco el monto o vuelve en otro horario.`,
    recomendaciones: elegidas
  };
}

// --- HU-08: recomendación contextual ----------------------------------------
/**
 * Recomienda opciones después de aplicar HU-07 y los límites contextuales.
 * Esta API usa nombres de dominio en inglés para poder recibir tanto los mocks
 * nuevos como las opciones actuales del dataset (`precio`, `caminando_min`, etc.).
 * Las opciones con datos desconocidos se conservan solo como fallback y quedan
 * por debajo de las opciones completamente verificadas.
 *
 * @param {object} args
 * @param {Array<object>} args.options opciones de comida
 * @param {object} args.profile perfil alimentario voluntariamente declarado
 * @param {object} args.context contexto actual (`campusId`, `budget`, `availableMinutes`)
 * @returns {{recommendations: Array<object>, excluded: number, context: object}}
 */
export function recommendFood({ options = [], profile = {}, context = {} } = {}) {
  const campusId = context.campusId ?? null;
  const budget = numberOrNull(context.budget);
  const availableMinutes = numberOrNull(context.availableMinutes);
  const recommendations = [];
  let excluded = 0;

  for (const option of Array.isArray(options) ? options : []) {
    const compatibility = evaluateCompatibility(toCompatibilityProfile(profile), toCompatibilityDish(option));
    if (compatibility.status === 'excluded') {
      excluded++;
      continue;
    }

    const price = numberOrNull(option.price ?? option.precio);
    const optionCampus = option.campusId ?? option.campus_id ?? null;
    const walkMinutes = numberOrNull(option.walkMinutes ?? option.caminando_min);
    const waitMinutes = numberOrNull(option.waitMinutes ?? option.tiempo_cola_min);
    const totalMinutes = walkMinutes !== null && waitMinutes !== null
      ? walkMinutes + waitMinutes
      : null;
    const reasons = [];
    let score = compatibility.status === 'eligible' ? 30 : 0;
    let complete = compatibility.status === 'eligible';

    if (campusId !== null) {
      if (optionCampus === campusId) {
        score += 25;
        reasons.push(`Está en el campus ${campusId}.`);
      } else if (optionCampus === null) {
        complete = false;
        reasons.push('No hay información de campus para esta opción.');
      } else {
        // La opción de otro campus no es una candidata contextual.
        excluded++;
        continue;
      }
    }

    if (budget !== null) {
      if (price !== null && price > budget) {
        excluded++;
        continue;
      }
      if (price === null) {
        complete = false;
        score -= 18;
        reasons.push('No hay precio confirmado para compararlo con tu presupuesto.');
      } else {
        score += 22;
        reasons.push(`Entra en el presupuesto de S/${budget}.`);
      }
    }

    if (availableMinutes !== null) {
      if (totalMinutes !== null && totalMinutes > availableMinutes) {
        excluded++;
        continue;
      }
      if (totalMinutes === null) {
        complete = false;
        score -= 18;
        reasons.push('No hay tiempo total confirmado para compararlo con tu tiempo disponible.');
      } else {
        score += 22;
        reasons.push(`El tiempo estimado (${totalMinutes} min) cabe en tus ${availableMinutes} min.`);
      }
    }

    if (compatibility.status === 'warning') {
      complete = false;
      reasons.push('La compatibilidad tiene una advertencia: falta información relevante.');
    }
    if (!reasons.length) reasons.push('Cumple los criterios disponibles del contexto.');

    recommendations.push({
      opcion: option,
      compatibilidad: compatibility,
      puntajeContextual: Math.round(score * 100) / 100,
      puntaje: Math.round(score * 100) / 100,
      completa: complete,
      razones: reasons
    });
  }

  recommendations.sort((a, b) =>
    Number(b.completa) - Number(a.completa)
    || b.puntajeContextual - a.puntajeContextual
    || String(a.opcion.id ?? '').localeCompare(String(b.opcion.id ?? '')));

  return { recommendations, excluded, context: { campusId, budget, availableMinutes } };
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toCompatibilityProfile(profile) {
  return {
    ...profile,
    vegetarian: profile.vegetarian ?? profile.vegetariano ?? profile.preferences?.vegetarian
  };
}

function toCompatibilityDish(option) {
  return {
    ...option,
    vegetarian: option.vegetarian ?? option.vegetariano
  };
}
