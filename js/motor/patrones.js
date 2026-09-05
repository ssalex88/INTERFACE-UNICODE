/**
 * NUTRIA · Motor de patrones explicable
 * -----------------------------------------------------------------------------
 * Bloque 4.3 de la propuesta: reglas sobre VENTANAS MÓVILES de 7 / 14 / 28 días
 * que cruzan comida, sueño, energía y estrés contra la carga académica declarada.
 * No mira días sueltos: mira si llevas una semana lloviendo.
 *
 * Cada patrón devuelve `evidencia`: los días y las citas textuales exactas que
 * lo motivaron. Si no podemos mostrar por qué lo dijimos, no lo decimos.
 *
 * Es una función PURA sobre la lista de registros: se puede testear sin DOM y
 * sin localStorage.
 */

import { diaLocal, sumarDias, diferenciaEnDias } from '../datos/almacen.js';

const VENTANAS = [7, 14, 28];

// --- Consolidación por día ---------------------------------------------------
/**
 * Un estudiante puede registrar dos veces el mismo día ("no almorcé" a las 3 pm,
 * "cené con mi mamá" a las 9 pm). Consolidamos el día: el último dato gana, pero
 * los campos vacíos se rellenan con lo que sí dijo antes.
 */
function consolidarDia(registrosDelDia) {
  const ordenados = registrosDelDia.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const dia = {
    dia: ordenados[0].dia,
    ids: ordenados.map((r) => r.id),
    textos: ordenados.map((r) => r.texto),
    sueno: null, suenoEvidencia: null,
    comidas: { desayuno: null, almuerzo: null, cena: null },
    citasComidas: {},
    presupuesto: null,
    animo: null, valencia: null, animoEvidencia: null,
    energia: null,
    carga: null, cargaEvidencia: null,
    platos: [],
    verdura: false,
    senalRestriccion: false
  };
  for (const r of ordenados) {
    const a = r.analisis || {};
    if (a.sueno && a.sueno.horas !== null && a.sueno.horas !== undefined) {
      dia.sueno = a.sueno.horas;
      dia.suenoEvidencia = a.sueno.evidencia ? a.sueno.evidencia.texto : null;
    }
    if (a.comidas) {
      for (const c of ['desayuno', 'almuerzo', 'cena']) {
        if (a.comidas[c]) {
          dia.comidas[c] = a.comidas[c];
          const e = a.evidenciasComidas && a.evidenciasComidas[c];
          if (e) dia.citasComidas[c] = e.texto;
        }
      }
    }
    if (a.presupuesto && a.presupuesto.monto !== null && a.presupuesto.monto !== undefined) {
      dia.presupuesto = a.presupuesto.monto;
    }
    if (a.animo && a.animo.etiqueta) {
      dia.animo = a.animo.etiqueta;
      dia.valencia = a.animo.valencia;
      dia.animoEvidencia = a.animo.evidencia ? a.animo.evidencia.texto : null;
    }
    if (a.energia && a.energia.nivel) dia.energia = a.energia.nivel;
    if (a.cargaAcademica && a.cargaAcademica.tipo) {
      dia.carga = a.cargaAcademica.tipo;
      dia.cargaEvidencia = a.cargaAcademica.evidencia ? a.cargaAcademica.evidencia.texto : null;
    }
    if (Array.isArray(a.platos) && a.platos.length) {
      dia.platos.push(...a.platos.map((p) => p.nombre));
      if (a.platos.some((p) => (p.etiquetas || []).includes('verdura'))) dia.verdura = true;
    }
    if (a.restriccion && a.restriccion.detectada) dia.senalRestriccion = true;
  }
  return dia;
}

export function consolidarPorDia(registros) {
  const mapa = new Map();
  for (const r of registros) {
    if (!mapa.has(r.dia)) mapa.set(r.dia, []);
    mapa.get(r.dia).push(r);
  }
  return Array.from(mapa.values()).map(consolidarDia).sort((a, b) => (a.dia < b.dia ? 1 : -1));
}

function filtrarVentana(dias, tamano, hoy, desplazamiento = 0) {
  const fin = diaLocal(sumarDias(hoy, -desplazamiento));
  const inicio = diaLocal(sumarDias(hoy, -(desplazamiento + tamano - 1)));
  return dias.filter((d) => d.dia >= inicio && d.dia <= fin);
}

function mediana(numeros) {
  if (!numeros.length) return null;
  const orden = numeros.slice().sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
}

function promedio(numeros) {
  if (!numeros.length) return null;
  return Math.round((numeros.reduce((a, b) => a + b, 0) / numeros.length) * 10) / 10;
}

// --- Métricas de una ventana -------------------------------------------------
export function metricasDeVentana(diasVentana, tamano) {
  const suenos = diasVentana.map((d) => d.sueno).filter((h) => h !== null);
  const presupuestos = diasVentana.map((d) => d.presupuesto).filter((p) => p !== null);
  const diasConAlmuerzoDeclarado = diasVentana.filter((d) => d.comidas.almuerzo);
  const saltosAlmuerzo = diasVentana.filter((d) => d.comidas.almuerzo === 'saltada');
  const saltosTotales = diasVentana.reduce(
    (acc, d) => acc + ['desayuno', 'almuerzo', 'cena'].filter((c) => d.comidas[c] === 'saltada').length, 0
  );

  return {
    tamano,
    diasConRegistro: diasVentana.length,
    tasaRegistro: Math.round((diasVentana.length / tamano) * 100) / 100,
    suenoPromedio: promedio(suenos),
    nochesCortas: suenos.filter((h) => h < 6).length,
    nochesLargas: suenos.filter((h) => h >= 7).length,
    saltosAlmuerzo: saltosAlmuerzo.length,
    saltosTotales,
    diasConAlmuerzoDeclarado: diasConAlmuerzoDeclarado.length,
    tasaSaltoAlmuerzo: diasConAlmuerzoDeclarado.length
      ? Math.round((saltosAlmuerzo.length / diasConAlmuerzoDeclarado.length) * 100) / 100
      : null,
    presupuestoMediana: mediana(presupuestos),
    presupuestoMinimo: presupuestos.length ? Math.min(...presupuestos) : null,
    diasEstres: diasVentana.filter((d) => d.valencia !== null && d.valencia <= -2).length,
    diasCansancio: diasVentana.filter((d) => d.energia === 'baja' || d.animo === 'cansado').length,
    diasCarga: diasVentana.filter((d) => d.carga).length,
    diasConVerdura: diasVentana.filter((d) => d.verdura).length,
    senalesRestriccion: diasVentana.filter((d) => d.senalRestriccion).length,
    diasCrudos: diasVentana
  };
}

// --- Racha -------------------------------------------------------------------
export function calcularRacha(dias, hoy = new Date()) {
  const set = new Set(dias.map((d) => d.dia));
  const hoyStr = diaLocal(hoy);
  const ayerStr = diaLocal(sumarDias(hoy, -1));
  let cursor = set.has(hoyStr) ? new Date(hoy) : (set.has(ayerStr) ? sumarDias(hoy, -1) : null);
  if (!cursor) return { dias: 0, incluyeHoy: false };
  let cuenta = 0;
  while (set.has(diaLocal(cursor))) {
    cuenta += 1;
    cursor = sumarDias(cursor, -1);
  }
  return { dias: cuenta, incluyeHoy: set.has(hoyStr) };
}

// --- Contra-métrica: restricción alimentaria --------------------------------
/**
 * Bloque 3 de la propuesta: "si detecta restricción sostenida, deja de gamificar
 * y muestra el canal de bienestar". Esta bandera es la que apaga las rachas.
 */
function evaluarRestriccion(dias, hoy) {
  const v14 = filtrarVentana(dias, 14, hoy);
  const v14previa = filtrarVentana(dias, 14, hoy, 14);
  const m14 = metricasDeVentana(v14, 14);
  const m14p = metricasDeVentana(v14previa, 14);

  const senales = v14.filter((d) => d.senalRestriccion);
  if (senales.length >= 1) {
    return {
      activa: true,
      motivo: 'senal_explicita',
      mensaje: 'Leímos algo en tus registros que preferimos no convertir en un puntaje.',
      evidencia: senales.slice(0, 3).map((d) => ({ dia: d.dia, cita: d.textos[0] }))
    };
  }

  const suficientes = m14.diasConAlmuerzoDeclarado >= 5;
  const subioElSalto = m14.tasaSaltoAlmuerzo !== null && m14p.tasaSaltoAlmuerzo !== null
    && m14.tasaSaltoAlmuerzo >= 0.5 && (m14.tasaSaltoAlmuerzo - m14p.tasaSaltoAlmuerzo) >= 0.15;

  if (suficientes && subioElSalto) {
    return {
      activa: true,
      motivo: 'salto_creciente',
      mensaje: 'Los almuerzos saltados vienen subiendo respecto a las dos semanas anteriores.',
      evidencia: v14.filter((d) => d.comidas.almuerzo === 'saltada').slice(0, 3)
        .map((d) => ({ dia: d.dia, cita: d.citasComidas.almuerzo || d.textos[0] }))
    };
  }

  return { activa: false, motivo: null, mensaje: null, evidencia: [] };
}

// --- Reglas de patrones ------------------------------------------------------
function reglaSaltosEnDiasDeCarga(m7) {
  const saltados = m7.diasCrudos.filter((d) => d.comidas.almuerzo === 'saltada');
  if (saltados.length < 2) return null;
  const conCarga = saltados.filter((d) => d.carga);
  const mensaje = conCarga.length >= Math.ceil(saltados.length * 0.6)
    ? `Esta semana te saltaste el almuerzo ${saltados.length} ${saltados.length === 1 ? 'vez' : 'veces'}, y ${conCarga.length} de esas fueron días de ${[...new Set(conCarga.map((d) => d.carga))].join(' o ')}.`
    : `Esta semana te saltaste el almuerzo ${saltados.length} veces.`;
  return {
    id: 'saltos_carga',
    ventana: 7,
    severidad: conCarga.length >= 2 ? 'atencion' : 'info',
    titulo: 'Almuerzo vs. carga académica',
    mensaje,
    evidencia: saltados.map((d) => ({ dia: d.dia, cita: d.citasComidas.almuerzo || d.textos[0], extra: d.cargaEvidencia }))
  };
}

function reglaSuenoCorto(m7) {
  if (m7.nochesCortas < 3) return null;
  return {
    id: 'sueno_corto',
    ventana: 7,
    severidad: m7.nochesCortas >= 5 ? 'alerta' : 'atencion',
    titulo: 'Sueño corto sostenido',
    mensaje: `${m7.nochesCortas} de tus últimas ${m7.diasConRegistro} noches registradas bajaron de 6 horas (promedio ${m7.suenoPromedio} h).`,
    evidencia: m7.diasCrudos.filter((d) => d.sueno !== null && d.sueno < 6)
      .map((d) => ({ dia: d.dia, cita: d.suenoEvidencia || `${d.sueno} h` }))
  };
}

function reglaEstresYSueno(m14) {
  const conEstres = m14.diasCrudos.filter((d) => d.valencia !== null && d.valencia <= -2 && d.sueno !== null);
  const sinEstres = m14.diasCrudos.filter((d) => (d.valencia === null || d.valencia > -2) && d.sueno !== null);
  if (conEstres.length < 2 || sinEstres.length < 2) return null;
  const pEstres = promedio(conEstres.map((d) => d.sueno));
  const pSin = promedio(sinEstres.map((d) => d.sueno));
  if (pSin - pEstres < 1) return null;
  return {
    id: 'estres_sueno',
    ventana: 14,
    severidad: 'info',
    titulo: 'Estrés y sueño van juntos',
    mensaje: `En los días que reportaste estrés dormiste ${pEstres} h en promedio; en los demás, ${pSin} h. Es algo que se repite en tus registros; no quiere decir que uno cause lo otro.`,
    evidencia: conEstres.slice(0, 3).map((d) => ({ dia: d.dia, cita: d.animoEvidencia || d.textos[0], extra: `${d.sueno} h` }))
  };
}

function reglaPresupuesto(m7) {
  if (m7.presupuestoMediana === null) return null;
  return {
    id: 'presupuesto',
    ventana: 7,
    severidad: m7.presupuestoMediana <= 8 ? 'atencion' : 'info',
    titulo: 'Tu rango real de almuerzo',
    mensaje: `Tu presupuesto de esta semana estuvo alrededor de S/${m7.presupuestoMediana}. Te buscamos opciones en ese rango, no en uno inventado.`,
    evidencia: m7.diasCrudos.filter((d) => d.presupuesto !== null).map((d) => ({ dia: d.dia, cita: `S/${d.presupuesto}` }))
  };
}

function reglaVerduras(m7) {
  if (m7.diasConRegistro < 4) return null;
  if (m7.diasConVerdura >= 2) return null;
  return {
    id: 'poca_verdura',
    ventana: 7,
    severidad: 'info',
    titulo: 'Casi nada de verdura esta semana',
    mensaje: 'En lo que registraste esta semana casi no aparecen verduras. No es un reto de dieta: solo lo tomamos en cuenta al ordenar tus opciones de comida.',
    evidencia: m7.diasCrudos.filter((d) => d.platos.length).slice(0, 3).map((d) => ({ dia: d.dia, cita: d.platos.join(', ') }))
  };
}

function reglaMejora(m7, m7previa) {
  if (m7previa.diasConRegistro === 0) return null;
  const deltaRegistro = m7.diasConRegistro - m7previa.diasConRegistro;
  const deltaSueno = (m7.suenoPromedio !== null && m7previa.suenoPromedio !== null)
    ? Math.round((m7.suenoPromedio - m7previa.suenoPromedio) * 10) / 10 : null;

  if (deltaSueno !== null && deltaSueno >= 0.7) {
    return {
      id: 'mejora_sueno', ventana: 14, severidad: 'logro', titulo: 'Vas durmiendo más',
      mensaje: `Esta semana dormiste ${deltaSueno} h más por noche que la anterior (${m7.suenoPromedio} h vs. ${m7previa.suenoPromedio} h).`,
      evidencia: m7.diasCrudos.filter((d) => d.sueno !== null).map((d) => ({ dia: d.dia, cita: `${d.sueno} h` }))
    };
  }
  if (deltaRegistro >= 2) {
    return {
      id: 'mejora_registro', ventana: 14, severidad: 'logro', titulo: 'Estás registrando más',
      mensaje: `Registraste ${m7.diasConRegistro} días esta semana contra ${m7previa.diasConRegistro} la anterior. Esa constancia es la que hace útil el resto.`,
      evidencia: m7.diasCrudos.map((d) => ({ dia: d.dia, cita: d.textos[0] }))
    };
  }
  return null;
}

function reglaRegreso(dias, hoy) {
  if (!dias.length) return null;
  const brecha = diferenciaEnDias(diaLocal(hoy), dias[0].dia);
  if (brecha < 3) return null;
  return {
    id: 'regreso', ventana: 28, severidad: 'info', titulo: 'Volviste',
    mensaje: `Pasaron ${brecha} días desde tu último registro. No pasa nada: la racha se reinicia, el historial no.`,
    evidencia: [{ dia: dias[0].dia, cita: dias[0].textos[0] }]
  };
}

function reglaMes(m28) {
  if (m28.diasConRegistro < 8) return null;
  return {
    id: 'mes', ventana: 28, severidad: 'info', titulo: 'Los últimos 28 días',
    mensaje: `Registraste ${m28.diasConRegistro} de 28 días. Sueño promedio ${m28.suenoPromedio ?? '—'} h, ${m28.saltosAlmuerzo} almuerzos saltados, presupuesto mediano S/${m28.presupuestoMediana ?? '—'}.`,
    evidencia: []
  };
}

// --- Orquestador -------------------------------------------------------------
/**
 * @param {Array} registros lista completa de registros del almacén
 * @param {Date}  hoy       inyectable para tests
 */
export function analizarPatrones(registros, hoy = new Date()) {
  const dias = consolidarPorDia(registros || []);

  const ventanas = {};
  for (const tamano of VENTANAS) {
    ventanas[tamano] = metricasDeVentana(filtrarVentana(dias, tamano, hoy), tamano);
  }
  const previa7 = metricasDeVentana(filtrarVentana(dias, 7, hoy, 7), 7);

  const restriccion = evaluarRestriccion(dias, hoy);
  const racha = calcularRacha(dias, hoy);

  const patrones = [
    reglaRegreso(dias, hoy),
    reglaSaltosEnDiasDeCarga(ventanas[7]),
    reglaSuenoCorto(ventanas[7]),
    reglaEstresYSueno(ventanas[14]),
    reglaPresupuesto(ventanas[7]),
    reglaVerduras(ventanas[7]),
    reglaMejora(ventanas[7], previa7),
    reglaMes(ventanas[28])
  ].filter(Boolean);

  const orden = { alerta: 0, atencion: 1, logro: 2, info: 3 };
  patrones.sort((a, b) => orden[a.severidad] - orden[b.severidad]);

  return {
    hoy: diaLocal(hoy),
    dias,
    ventanas,
    ventanaPrevia7: previa7,
    racha,
    restriccion,
    patrones,
    // La gamificación se apaga entera si la contra-métrica se activa.
    gamificacionActiva: !restriccion.activa
  };
}
