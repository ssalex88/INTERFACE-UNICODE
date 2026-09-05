/**
 * NUTRIA · Informes
 * -----------------------------------------------------------------------------
 * Dos informes distintos, y la diferencia entre ambos es el corazón del modelo
 * de financiamiento del proyecto:
 *
 *  1. `informeEstudiante()` — para la persona. Legible, con lenguaje humano,
 *     comparado contra su propio mes anterior. Es lo que reemplaza al "descargar
 *     un JSON": nadie lee un JSON de su propia alimentación.
 *
 *  2. `reporteInstitucional()` — para el área de bienestar que paga el piloto.
 *     La universidad necesita saber que el sistema sirve; el estudiante necesita
 *     que su frase no se filtre. Se resuelve mandando SOLO INDICADORES: números
 *     agregados y bandas, nunca la frase, nunca el plato, nunca el monto exacto.
 *     El texto crudo sigue sin salir del dispositivo, que es la promesa original.
 *
 * Ambas funciones son puras sobre la salida de analizarPatrones().
 */

import { diaLocal, sumarDias } from '../datos/almacen.js';
import { metricasDeVentana } from './patrones.js';
import { calcularInsignias, nivelDeConstancia } from './insignias.js';

function ventana(dias, tamano, hoy, desplazamiento = 0) {
  const fin = diaLocal(sumarDias(hoy, -desplazamiento));
  const inicio = diaLocal(sumarDias(hoy, -(desplazamiento + tamano - 1)));
  return dias.filter((d) => d.dia >= inicio && d.dia <= fin);
}

function delta(actual, previo, comparable = true) {
  if (!comparable) return null;
  if (actual === null || previo === null || previo === undefined || actual === undefined) return null;
  const dif = Math.round((actual - previo) * 10) / 10;
  return { valor: dif, direccion: dif > 0 ? 'sube' : dif < 0 ? 'baja' : 'igual' };
}

/** Bandas en vez de cifras exactas: lo que la universidad necesita saber sin
 *  poder reconstruir el día de nadie. */
export function bandaSueno(horas) {
  if (horas === null || horas === undefined) return 'sin dato';
  if (horas < 5) return 'menos de 5 h';
  if (horas < 6) return '5 a 6 h';
  if (horas < 7) return '6 a 7 h';
  return '7 h o más';
}

export function bandaPresupuesto(monto) {
  if (monto === null || monto === undefined) return 'sin dato';
  if (monto <= 6) return 'hasta S/6';
  if (monto <= 10) return 'S/7 a S/10';
  if (monto <= 15) return 'S/11 a S/15';
  return 'más de S/15';
}

function fechaLegible(dia) {
  const d = new Date(`${dia}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dia;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
}

// --- 1. Informe para el estudiante ------------------------------------------
/**
 * @param {object} patrones salida de analizarPatrones()
 * @param {object} extras   { metas, perfil }
 * @param {Date}   hoy
 */
export function informeEstudiante(patrones, { metas = [], perfil = {} } = {}, hoy = new Date()) {
  const actual = patrones.ventanas[28];
  const previo = metricasDeVentana(ventana(patrones.dias, 28, hoy, 28), 28);
  const insignias = calcularInsignias(patrones);
  const nivel = nivelDeConstancia(patrones);
  const comparable = previo.diasConRegistro >= 3;

  const almuerzosHechos = actual.diasCrudos.filter((d) => d.comidas.almuerzo === 'hecha').length;
  const almuerzosPrevios = previo.diasCrudos.filter((d) => d.comidas.almuerzo === 'hecha').length;

  const indicadores = [
    {
      id: 'registro', rotulo: 'Días que registraste', valor: actual.diasConRegistro, unidad: 'de 28',
      cambio: delta(actual.diasConRegistro, previo.diasConRegistro, comparable),
      lectura: actual.diasConRegistro >= 14
        ? 'Registraste la mitad del mes o más: con eso el sistema ya puede ver tendencias reales.'
        : 'Con más días registrados, las recomendaciones dejan de ser genéricas.'
    },
    {
      id: 'sueno', rotulo: 'Sueño promedio', valor: actual.suenoPromedio, unidad: 'horas',
      cambio: delta(actual.suenoPromedio, previo.suenoPromedio, comparable),
      lectura: actual.suenoPromedio === null
        ? 'Todavía no contaste cuánto dormiste.'
        : actual.suenoPromedio < 6
          ? `Dormiste menos de 6 horas en ${actual.nochesCortas} noches. Es el dato que más se cruza con saltarte comidas.`
          : 'Estás en un rango que te sostiene la semana.'
    },
    {
      id: 'almuerzo', rotulo: 'Almuerzos que sí comiste', valor: almuerzosHechos, unidad: `de ${actual.diasConAlmuerzoDeclarado} días`,
      cambio: delta(almuerzosHechos, almuerzosPrevios, comparable),
      lectura: actual.saltosAlmuerzo === 0
        ? 'No registraste almuerzos saltados este mes.'
        : `Te saltaste el almuerzo ${actual.saltosAlmuerzo} ${actual.saltosAlmuerzo === 1 ? 'vez' : 'veces'}, casi siempre en días de entrega o parcial.`
    },
    {
      id: 'presupuesto', rotulo: 'Tu presupuesto habitual', valor: actual.presupuestoMediana, unidad: 'soles',
      cambio: delta(actual.presupuestoMediana, previo.presupuestoMediana, comparable),
      lectura: actual.presupuestoMediana === null
        ? 'Todavía no contaste con cuánto cuentas.'
        : 'Es el rango con el que te buscamos opciones de comida.'
    }
  ];

  // Titular: lo primero que se lee tiene que ser cierto y suyo.
  let titular = 'Tu mes, en una línea';
  let resumen = 'Registra unos días más y este informe empieza a tener algo que contarte.';
  if (actual.diasConRegistro >= 5) {
    const mejoraSueno = delta(actual.suenoPromedio, previo.suenoPromedio, comparable);
    if (mejoraSueno && mejoraSueno.valor >= 0.5) {
      titular = 'Vas durmiendo más que el mes pasado';
      resumen = `Subiste ${mejoraSueno.valor} h de sueño promedio y registraste ${actual.diasConRegistro} días.`;
    } else if (actual.saltosAlmuerzo >= 4) {
      titular = 'El almuerzo es lo que se te está cayendo';
      resumen = `${actual.saltosAlmuerzo} almuerzos saltados este mes. No es falta de ganas: casi todos caen en días de carga académica.`;
    } else if (comparable && actual.diasConRegistro > previo.diasConRegistro) {
      titular = 'Estás usando NUTRIA más seguido';
      resumen = `${actual.diasConRegistro} días registrados contra ${previo.diasConRegistro} el mes pasado.`;
    } else {
      titular = 'Tu mes, sin sorpresas';
      resumen = `${actual.diasConRegistro} días registrados, ${actual.suenoPromedio ?? '—'} h de sueño promedio.`;
    }
  }

  // Qué hacer la próxima semana: como máximo tres cosas, y todas salen de sus datos.
  const sugerencias = [];
  if (actual.nochesCortas >= 3) {
    sugerencias.push('Elige dos noches de la semana —no las siete— para dormir 7 horas. Dos noches largas cambian más que un intento perfecto.');
  }
  if (actual.saltosAlmuerzo >= 2) {
    sugerencias.push('Los días que ya sabes que tienes entrega, deja decidido de antes dónde vas a almorzar. La decisión a la 1 p.m. con hambre siempre pierde.');
  }
  if (actual.diasConVerdura <= 2 && actual.diasConRegistro >= 5) {
    sugerencias.push('Cuando te alcance, elige la opción que trae verdura: cerca del campus hay platos con verdura desde S/9.');
  }
  if (actual.diasConRegistro < 10) {
    sugerencias.push('Registrar toma 10 segundos y es lo único que el sistema necesita para dejar de adivinar.');
  }

  const metasDelPeriodo = (metas || [])
    .slice()
    .sort((a, b) => (a.semana < b.semana ? 1 : -1))
    .slice(0, 4);

  return {
    generado: new Date().toISOString(),
    periodo: {
      desde: diaLocal(sumarDias(hoy, -27)),
      hasta: diaLocal(hoy),
      legible: `${fechaLegible(diaLocal(sumarDias(hoy, -27)))} al ${fechaLegible(diaLocal(hoy))}`
    },
    perfil,
    titular,
    resumen,
    nivel,
    indicadores,
    sugerencias: sugerencias.slice(0, 3),
    patrones: patrones.patrones.slice(0, 4),
    insignias: insignias.filter((i) => i.obtenida),
    metas: metasDelPeriodo,
    restriccion: patrones.restriccion,
    comparable,
    suficiente: actual.diasConRegistro >= 5
  };
}

// --- 2. Reporte para bienestar universitario --------------------------------
/**
 * Lo que la universidad recibiría. Es literalmente esto y nada más: el objeto
 * que devuelve esta función es el que se muestra en pantalla al estudiante
 * antes de que decida, para que "lo que se envía" no sea una promesa sino algo
 * que puede leer.
 *
 * @param {object} patrones
 * @param {object} opciones { consentimiento, sesion, perfil }
 */
export function reporteInstitucional(patrones, { consentimiento, sesion, perfil = {} } = {}, hoy = new Date()) {
  const m28 = patrones.ventanas[28];
  const nivel = nivelDeConstancia(patrones);
  const nominal = !!(consentimiento && consentimiento.nominal);

  const almuerzos = m28.diasCrudos.filter((d) => d.comidas.almuerzo === 'hecha').length;
  const declarados = m28.diasConAlmuerzoDeclarado;

  const indicadores = {
    periodo: `${diaLocal(sumarDias(hoy, -27))} a ${diaLocal(hoy)}`,
    campus: perfil.campus || 'Universidad de Lima',
    facultad: perfil.facultad || 'sin declarar',
    diasRegistrados: m28.diasConRegistro,
    adherencia: `${Math.round(m28.tasaRegistro * 100)} %`,
    nivelDeUso: nivel.nombre,
    bandaSuenoPromedio: bandaSueno(m28.suenoPromedio),
    nochesCortas: m28.nochesCortas,
    almuerzosCumplidos: declarados ? `${almuerzos} de ${declarados} días declarados` : 'sin dato',
    bandaPresupuesto: bandaPresupuesto(m28.presupuestoMediana),
    metasCumplidas: patrones.gamificacionActiva ? calcularInsignias(patrones).filter((i) => i.obtenida).length : 0,
    tendencia: m28.diasConRegistro >= 14 ? 'uso sostenido' : 'uso irregular'
  };

  return {
    generado: new Date().toISOString(),
    destinatario: 'Bienestar Universitario',
    modo: nominal ? 'nominal' : 'anonimo',
    // En modo anónimo la universidad recibe un identificador de cohorte, no a la
    // persona: sirve para el tablero agregado y no para señalar a nadie.
    identificacion: nominal
      ? { nombre: sesion?.nombre || perfil.nombre || 'Estudiante', codigo: sesion?.usuario || null }
      : { cohorte: `${perfil.campus || 'ULima'} · ${perfil.facultad || 'general'}`, codigo: null },
    indicadores,
    // Lo que NO viaja. Se muestra en pantalla junto al reporte: es la mitad
    // importante del trato.
    excluido: [
      'Las frases que escribiste, completas o en fragmentos',
      'Qué plato comiste y en qué establecimiento',
      'Los montos exactos de dinero (solo viaja el rango)',
      'Tu ánimo declarado y cualquier señal de salud mental'
    ],
    // Cuando la contra-métrica se activa, ese dato NO viaja. Avisar a bienestar
    // sin permiso convertiría a NUTRIA en un delator y nadie volvería a escribir
    // la verdad en el compositor. Se le cuenta al estudiante y decide él.
    alerta: patrones.restriccion.activa
      ? 'Este mes pausamos rachas e insignias por lo que leímos en tus registros. Eso no se lo contamos a nadie: si quieres que bienestar te escriba, actívalo tú.'
      : null,
    enviable: !!(consentimiento && (consentimiento.agregado || consentimiento.nominal))
  };
}
