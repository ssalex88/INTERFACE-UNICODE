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
import { getDietaryProfile } from '../../src/storage.js';
import { evaluarCompatibilidadAlimentaria } from '../../src/dietary-catalog.js';
import { calcularAfinidadAprendida } from '../../src/preference-learner.js';

const PESOS = {
  nutricion: 3.2,
  franja: 1.6,
  completitud: 1.4,
  aprovechamiento: 1.8,
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

/**
 * Cuánto encaja cada categoría de plato en cada momento del día (0 a 1).
 * `bebida` y `guarnicion` existen en el vocabulario del mapeo (una gaseosa y una
 * porción de papas son productos reales de la carta) pero nunca son la respuesta
 * a "qué como": entran bajísimo en toda franja para que aparezcan solo si no hay
 * literalmente nada más.
 */
const ENCAJE_FRANJA = {
  desayuno: { desayuno: 1, snack: 0.75, sandwich: 0.7, sopa: 0.45, ensalada: 0.3, menu_completo: 0.2, plato_fuerte: 0.15, entrada: 0.15, guarnicion: 0.08, bebida: 0.06 },
  almuerzo: { menu_completo: 1, plato_fuerte: 0.9, sopa: 0.75, ensalada: 0.6, sandwich: 0.3, snack: 0.1, desayuno: 0.05, entrada: 0.08, guarnicion: 0.05, bebida: 0.02 },
  tarde:    { snack: 1, sandwich: 0.9, desayuno: 0.6, ensalada: 0.55, sopa: 0.45, plato_fuerte: 0.4, menu_completo: 0.35, entrada: 0.3, guarnicion: 0.2, bebida: 0.15 },
  cena:     { plato_fuerte: 1, menu_completo: 0.95, sopa: 0.85, ensalada: 0.6, sandwich: 0.5, snack: 0.2, desayuno: 0.1, entrada: 0.15, guarnicion: 0.08, bebida: 0.04 }
};

/** Qué tan "plato completo" es cada categoría, sin mirar el precio. */
const COMPLETITUD = {
  menu_completo: 1, plato_fuerte: 0.8, sopa: 0.6, ensalada: 0.55,
  sandwich: 0.35, desayuno: 0.3, snack: 0.15, entrada: 0.12, guarnicion: 0.08, bebida: 0.02
};

/** Lo que no es una comida: no puede ser "la alternativa barata" de un almuerzo. */
const ACCESORIAS = new Set(['bebida', 'guarnicion', 'entrada']);

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
  if (precio > presupuesto) return 0;
  const razon = precio / presupuesto;
  if (razon <= 0.3) return 0;
  let puntaje = (razon - 0.3) / 0.7;
  if (Math.abs(precio - presupuesto) < 0.25) {
    puntaje += 0.6; // Premio a la adaptación exacta al presupuesto del estudiante
  }
  return puntaje;
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
export function recomendar({ datasetMenus, analisis, patrones, perfil, perfilDietario, ahora = new Date() }) {
  const opciones = (datasetMenus && datasetMenus.opciones) || [];
  const m7 = patrones.ventanas[7];
  const franja = franjaDelDia(ahora);

  // 0. Perfil alimentario y restricciones (HU-01, HU-04)
  const perfilDiet = perfilDietario || (perfil && perfil.dietaryProfile) || getDietaryProfile();
  if (perfil?.vegetariano && Array.isArray(perfilDiet.preferencias_alimentarias) && !perfilDiet.preferencias_alimentarias.includes('vegetariano')) {
    perfilDiet.preferencias_alimentarias.push('vegetariano');
  }

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
    // Lo más barato tiene que ser COMIDA. Con el mapeo real, ordenar la carta
    // entera por precio ponía arriba "Wasabi, S/2": responderle eso a alguien
    // que acaba de escribir "estoy misio" es una burla.
    const comida = opciones.filter((o) => !ACCESORIAS.has(o.categoria));
    const baratas = (comida.length ? comida : opciones)
      .slice().sort((a, b) => a.precio - b.precio).slice(0, 2);
    return {
      presupuesto, fuentePresupuesto, franja, sinPresupuesto: true, relajadoHorario: false,
      tiempoDisponible: analisis?.tiempoDisponible || null, perfilDietario: perfilDiet,
      totalCandidatas: opciones.length, alternativaBarata: null, techoAlcanzado: null,
      mensaje: 'Hoy no hay presupuesto. Estas son las dos opciones más baratas que tenemos cerca, y si la cosa está difícil, el comedor universitario y bienestar tienen apoyo alimentario.',
      recomendaciones: baratas.map((opcion) => ({ opcion, puntaje: 0, razones: [`Es de lo más barato de la zona: S/${opcion.precio}.`] }))
    };
  }

  // 3. Filtros duros: presupuesto, compatibilidad alimentaria (HU-01, HU-04), día, horario.
  const dentroDePresupuesto = opciones.filter((o) => o.precio <= presupuesto);
  const compatibles = dentroDePresupuesto.filter((o) => {
    const evaluacion = evaluarCompatibilidadAlimentaria(o, perfilDiet);
    return !evaluacion.descartado;
  });

  let candidatas = compatibles.filter((o) => estaAbierto(o, ahora));
  let relajadoHorario = false;
  if (!candidatas.length && compatibles.length) {
    // Degradación: si nada está abierto a esta hora, mostramos igual y lo decimos.
    candidatas = compatibles.filter((o) => !Array.isArray(o.dias) || o.dias.includes(diaSemanaISO(ahora)));
    if (!candidatas.length) candidatas = compatibles;
    relajadoHorario = true;
  }

  // 4. Contexto del día para el puntaje y tiempo disponible (HU-03).
  const saltoAlmuerzo = !!(analisis && analisis.comidas && analisis.comidas.almuerzo === 'saltada');
  const suenoCorto = !!(analisis && analisis.sueno && analisis.sueno.horas !== null && analisis.sueno.horas < 6)
    || (m7.suenoPromedio !== null && m7.suenoPromedio < 6);
  const conEstres = !!(analisis && analisis.animo && analisis.animo.valencia !== null && analisis.animo.valencia <= -2);
  const faltaVerdura = m7.diasConRegistro >= 3 && m7.diasConVerdura <= 1;
  const recientes = platosRecientes(patrones, 7);

  const tiempoInfo = analisis && analisis.tiempoDisponible ? analisis.tiempoDisponible : null;
  const minutos = (tiempoInfo && typeof tiempoInfo.minutosNetos === 'number')
    ? tiempoInfo.minutosNetos
    : (perfil.minutosDisponibles || 25);

  const puntuadas = candidatas.map((opcion) => {
    let puntaje = 0;
    const razones = [];
    const etiquetas = opcion.etiquetas || [];
    const aporte = opcion.aporte || {};
    const evalAlim = evaluarCompatibilidadAlimentaria(opcion, perfilDiet);

    // 4a. Lo que el plato aporta.
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
    if (Math.abs(opcion.precio - presupuesto) < 0.25) {
      razones.push(`Calza exacto con tu presupuesto de S/${presupuesto}.`);
    }

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
    // La cola solo puntúa si alguien la midió. En el levantamiento real de campo
    // ese dato no existe (`null`), y tratarlo como 0 sería premiar al sitio que
    // nadie cronometró frente al que sí. Ver js/datos/ulima.js.
    const colaConocida = Number.isFinite(opcion.tiempo_cola_min);
    if (conEstres && (etiquetas.includes('rapido') || (colaConocida && opcion.tiempo_cola_min <= 8))) {
      puntaje += PESOS.estres;
      razones.push(colaConocida ? 'Día cargado: la cola acá es corta.' : 'Día cargado: acá te atienden al toque.');
    }
    if (faltaVerdura && (aporte.verdura === 'alta' || etiquetas.includes('verdura'))) {
      puntaje += PESOS.verduraPendiente;
      razones.push('Esta semana casi no registraste verduras y esta opción sí trae.');
    }

    // HU-03: Evaluación de tiempo con cola + ida y vuelta. Sin cola medida se
    // usa solo el camino y se dice que el cálculo va incompleto: no es lo mismo
    // "te sobra tiempo" que "te sobra tiempo si no hay cola".
    const caminata = (opcion.caminando_min || 0) * 2;
    const tiempoTotalEstimado = caminata + (colaConocida ? opcion.tiempo_cola_min : 0);
    const detalleTiempo = colaConocida ? 'cola + camino' : 'ida y vuelta, sin contar la cola';
    if (tiempoTotalEstimado <= minutos) {
      puntaje += PESOS.colaCorta;
      if (tiempoInfo && typeof tiempoInfo.minutosNetos === 'number') {
        razones.push(`Te da el tiempo: ~${tiempoTotalEstimado} min (${detalleTiempo}) dentro de tus ${minutos} min netos.`);
      }
    } else if (tiempoInfo && typeof tiempoInfo.minutosNetos === 'number') {
      puntaje -= 2.0;
      razones.push(`Aviso de tiempo: toma ~${tiempoTotalEstimado} min (${detalleTiempo}) y dispones de ${minutos} min netos.`);
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

    // Machine Learning: Afinidad aprendida de elecciones y retroalimentación previa
    const afinidad = calcularAfinidadAprendida(opcion, perfil?.learnedPreferences || null);
    if (afinidad.bonus) {
      puntaje += afinidad.bonus;
      if (afinidad.razon) {
        razones.push(afinidad.razon);
      }
    }

    // HU-04: Advertencias explícitas de alérgenos e intolerancias
    if (evalAlim.advertencias && evalAlim.advertencias.length > 0) {
      for (const adv of evalAlim.advertencias) {
        razones.push(adv.mensaje);
      }
    }

    // 4e. La plata que sobra es información, no puntaje.
    const vuelto = redondear(presupuesto - opcion.precio);
    if (vuelto >= 1) razones.push(`Te quedan S/${vuelto} de tus S/${presupuesto}.`);

    if (!razones.length) razones.push(`Entra en tus S/${presupuesto} y está disponible ahora.`);

    return {
      opcion: {
        ...opcion,
        procedencia_dato: opcion.procedencia_dato || evalAlim.metadatos.procedencia,
        fecha_actualizacion: opcion.fecha_actualizacion || evalAlim.metadatos.fechaActualizacion,
        nivel_confianza: opcion.nivel_confianza || evalAlim.metadatos.nivelConfianza,
        alergenos_presentes: opcion.alergenos_presentes || [],
        alergenos_ausentes_verificados: opcion.alergenos_ausentes_verificados || [],
        alergenos_no_verificados: opcion.alergenos_no_verificados || []
      },
      puntaje: Math.round(puntaje * 100) / 100,
      aprovecha: Math.round(aprovecha * 100) / 100,
      nutre: Math.round(nutre * 100) / 100,
      compatibilidad: evalAlim,
      advertencias: evalAlim.advertencias,
      razones: razones.slice(0, 4)
    };
  });

  // Desempate explícito: mejor puntaje → mejor aporte → más barato.
  puntuadas.sort((a, b) =>
    b.puntaje - a.puntaje || b.nutre - a.nutre || a.opcion.precio - b.opcion.precio);

  // Desduplicación y diversidad: evita que variantes casi idénticas del mismo
  // plato (ej. "Tallarín Taypá" y "Combo Tallarín Taypá") copen el podio juntas.
  function sonPlatosVariantes(opA, opB) {
    if (!opA || !opB) return false;
    if (opA.id === opB.id) return true;

    const mismoEst = opA.establecimiento_id && opB.establecimiento_id
      ? opA.establecimiento_id === opB.establecimiento_id
      : opA.establecimiento === opB.establecimiento;

    const clean = (s) => String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(combo|menu|promocion|plato|porcion|personal|clasica|clasico)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const nA = clean(opA.plato);
    const nB = clean(opB.plato);

    if (mismoEst && (nA === nB || nA.includes(nB) || nB.includes(nA))) {
      return true;
    }
    return false;
  }

  const elegidas = [];
  for (const p of puntuadas) {
    if (elegidas.length >= 3) break;
    const variante = elegidas.some((el) => sonPlatosVariantes(el.opcion, p.opcion));
    if (!variante) {
      elegidas.push(p);
    }
  }
  // Si con el filtro estricto quedaron menos de 3, completar con las mejores sin repetir ID
  if (elegidas.length < 3) {
    for (const p of puntuadas) {
      if (elegidas.length >= 3) break;
      if (!elegidas.some((el) => el.opcion.id === p.opcion.id)) {
        elegidas.push(p);
      }
    }
  }

  // La alternativa más barata SIEMPRE está a la vista, pero tiene que ser
  // comida: ofrecer "wasabi, S/2" como la opción económica del almuerzo sería
  // una burla, no un ahorro.
  const comidas = puntuadas.filter((x) => !ACCESORIAS.has(x.opcion.categoria));
  const masBarata = (comidas.length ? comidas : puntuadas)
    .slice().sort((a, b) => a.opcion.precio - b.opcion.precio)[0] || null;
  const alternativaBarata = masBarata && elegidas[0] && masBarata.opcion.id !== elegidas[0].opcion.id
    && masBarata.opcion.precio < elegidas[0].opcion.precio
    ? masBarata
    : null;

  // Si el presupuesto se quedó corto para algo mejor, se dice con cuánto sí.
  const fueraDeAlcance = opciones
    .filter((o) => o.precio > presupuesto && !evaluarCompatibilidadAlimentaria(o, perfilDiet).descartado)
    .filter((o) => nutricion(o) > (elegidas[0] ? nutricion(elegidas[0].opcion) : 0))
    .sort((a, b) => a.precio - b.precio)[0] || null;

  /**
   * El caso incómodo que el mapeo real destapó: en el campus hay franjas de
   * precio donde con lo que el estudiante tiene NO alcanza para un plato, solo
   * para un café o unas papas. Callarlo y devolver igual tres tarjetas sería
   * fingir que sí se puede almorzar con eso. Se marca y la pantalla lo dice.
   */
  const COMPLETO_MINIMO = 0.5;
  const hayPlatoCompleto = candidatas.some((o) => (COMPLETITUD[o.categoria] ?? 0.4) >= COMPLETO_MINIMO);
  const platoCompletoMasBarato = !hayPlatoCompleto
    ? opciones
      .filter((o) => (COMPLETITUD[o.categoria] ?? 0.4) >= COMPLETO_MINIMO && o.precio > presupuesto)
      .filter((o) => !evaluarCompatibilidadAlimentaria(o, perfilDiet).descartado)
      .sort((a, b) => a.precio - b.precio)[0] || null
    : null;

  return {
    presupuesto,
    fuentePresupuesto,
    franja,
    sinPresupuesto: false,
    relajadoHorario,
    tiempoDisponible: tiempoInfo,
    perfilDietario: perfilDiet,
    totalCandidatas: candidatas.length,
    alternativaBarata,
    hayPlatoCompleto,
    sinPlatoCompleto: platoCompletoMasBarato
      ? {
        plato: platoCompletoMasBarato.plato,
        establecimiento: platoCompletoMasBarato.establecimiento,
        precio: platoCompletoMasBarato.precio,
        faltan: redondear(platoCompletoMasBarato.precio - presupuesto)
      }
      : null,
    techoAlcanzado: fueraDeAlcance
      ? { plato: fueraDeAlcance.plato, precio: fueraDeAlcance.precio, faltan: redondear(fueraDeAlcance.precio - presupuesto) }
      : null,
    mensaje: candidatas.length
      /* `tiempoDisponible` siempre viene como objeto, aunque la frase no dijera
         nada de tiempo: sus minutos quedan en null. Preguntar solo por el objeto
         imprimía "(null min netos)" en pantalla. */
      ? `Con S/${presupuesto} para ${NOMBRE_FRANJA[franja]}${relajadoHorario ? ' (ya fuera del horario de atención, te las mostramos igual)' : ''}${Number.isFinite(tiempoInfo && tiempoInfo.minutosNetos) ? ` (${tiempoInfo.minutosNetos} min netos)` : ''}, cerca de tu facultad:`
      : (dentroDePresupuesto.length > 0 && compatibles.length === 0)
        ? `Con S/${presupuesto} hay opciones en la zona, pero fueron descartadas por incompatibilidad con tus restricciones alimentarias declaradas. Puedes revisar tu perfil en 'Tus datos'.`
        : `Con S/${presupuesto} no encontramos nada abierto cerca ahora mismo. Prueba subiendo un poco el monto o vuelve en otro horario.`,
    recomendaciones: elegidas
  };
}
