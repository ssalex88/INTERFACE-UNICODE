/**
 * NUTRIA · Insignias y nivel
 * -----------------------------------------------------------------------------
 * Antes las insignias eran una lista fija con `obtenida: true/false` escrito a
 * mano: decoración. Acá se CALCULAN desde los registros reales, cada una trae su
 * progreso, y todas premian lo mismo —constancia y comer— nunca comer menos.
 *
 * Regla dura heredada de la contra-métrica: si `gamificacionActiva` es false,
 * este módulo devuelve la lista vacía. No se premia a alguien mientras el motor
 * está viendo señales de restricción.
 *
 * Función pura sobre la salida de analizarPatrones(): testeable sin DOM.
 */

const CATALOGO = [
  {
    id: 'primer_paso', icono: 'pluma', nombre: 'Primer registro',
    criterio: 'Registra tu primer día',
    medir: (p) => ({ hechos: Math.min(1, p.dias.length), objetivo: 1 })
  },
  {
    id: 'primera_semana', icono: 'semilla', nombre: 'Primera semana',
    criterio: '4 registros en una semana',
    medir: (p) => ({ hechos: p.ventanas[7].diasConRegistro, objetivo: 4 })
  },
  {
    id: 'racha_7', icono: 'fuego', nombre: 'Racha de 7',
    criterio: '7 días seguidos registrando',
    medir: (p) => ({ hechos: p.racha.dias, objetivo: 7 })
  },
  {
    id: 'almuerzo_firme', icono: 'tazon', nombre: 'Almuerzo firme',
    criterio: '5 almuerzos en una semana',
    medir: (p) => ({
      hechos: p.ventanas[7].diasCrudos.filter((d) => d.comidas.almuerzo === 'hecha').length,
      objetivo: 5
    })
  },
  {
    id: 'noches_largas', icono: 'luna', nombre: 'Dos noches largas',
    criterio: '2 noches de 7 h en una semana',
    medir: (p) => ({ hechos: p.ventanas[7].nochesLargas, objetivo: 2 })
  },
  {
    id: 'verde', icono: 'hoja', nombre: 'Semana verde',
    criterio: 'Verduras en 3 días de la semana',
    medir: (p) => ({ hechos: p.ventanas[7].diasConVerdura, objetivo: 3 })
  },
  {
    id: 'mes', icono: 'mapa', nombre: 'Mes en el mapa',
    criterio: '20 días registrados en un mes',
    medir: (p) => ({ hechos: p.ventanas[28].diasConRegistro, objetivo: 20 })
  },
  {
    id: 'desayuno', icono: 'chispa', nombre: 'Arrancar comiendo',
    criterio: '4 desayunos en una semana',
    medir: (p) => ({
      hechos: p.ventanas[7].diasCrudos.filter((d) => d.comidas.desayuno === 'hecha').length,
      objetivo: 4
    })
  }
];

/**
 * @param {object} patrones salida de analizarPatrones()
 * @returns {Array} insignias con progreso real, obtenidas primero
 */
export function calcularInsignias(patrones) {
  if (!patrones || !patrones.gamificacionActiva) return [];

  return CATALOGO.map((base) => {
    const { hechos, objetivo } = base.medir(patrones);
    const logrado = Math.min(hechos, objetivo);
    return {
      id: base.id,
      icono: base.icono,
      nombre: base.nombre,
      criterio: base.criterio,
      obtenida: hechos >= objetivo,
      hechos: logrado,
      objetivo,
      porcentaje: objetivo ? Math.round((logrado / objetivo) * 100) : 0
    };
  }).sort((a, b) => (b.obtenida - a.obtenida) || (b.porcentaje - a.porcentaje));
}

/** La siguiente insignia alcanzable: es lo que la mascota muestra como próximo paso. */
export function proximaInsignia(insignias) {
  return insignias.find((i) => !i.obtenida && i.porcentaje > 0)
    || insignias.find((i) => !i.obtenida)
    || null;
}

/**
 * Nivel de constancia. No es un puntaje de salud —eso sería inventar un juicio
 * médico— sino cuánto viene usando NUTRIA, que es lo único que el sistema mide
 * de verdad y lo único que la universidad necesita saber.
 */
const NIVELES = [
  { id: 'arranque', nombre: 'Arrancando', desde: 0 },
  { id: 'constante', nombre: 'Tomando ritmo', desde: 25 },
  { id: 'firme', nombre: 'Constante', desde: 55 },
  { id: 'sostenido', nombre: 'Sostenido', desde: 80 }
];

export function nivelDeConstancia(patrones) {
  const m28 = patrones.ventanas[28];
  const porcentaje = Math.round(m28.tasaRegistro * 100);
  let nivel = NIVELES[0];
  for (const n of NIVELES) if (porcentaje >= n.desde) nivel = n;
  const siguiente = NIVELES[NIVELES.indexOf(nivel) + 1] || null;
  return {
    ...nivel,
    porcentaje,
    diasRegistrados: m28.diasConRegistro,
    siguiente: siguiente ? { nombre: siguiente.nombre, faltan: siguiente.desde - porcentaje } : null
  };
}
