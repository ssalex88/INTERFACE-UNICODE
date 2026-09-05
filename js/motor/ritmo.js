/**
 * NUTRIA · Ritmo de uso
 * -----------------------------------------------------------------------------
 * Responde la pregunta que la app no estaba respondiendo: **¿cuándo se supone
 * que registro?**
 *
 * Hasta acá había un campo de texto y ninguna indicación de cuándo usarlo. El
 * estudiante quedaba eligiendo entre dos modelos que nadie le explicó —"¿lo
 * lleno de noche como un diario?" o "¿cada vez que me acuerdo?"— y ninguna app
 * de hábitos sobrevive a esa duda: el que no sabe cuándo abrir, no abre.
 *
 * EL MODELO, EN UNA FRASE
 * -----------------------------------------------------------------------------
 * **Una frase al día basta, y el mejor momento depende de qué quieras que
 * NUTRIA haga por ti.** No es un diario nocturno ni un formulario continuo: son
 * tres momentos, todos opcionales, y cada uno paga distinto.
 *
 *   · MAÑANA (05:00–11:00) — "Cómo amaneciste". Es el único momento en que
 *     sabes cuánto dormiste y con cuánta plata sales. Registrar acá es lo que
 *     hace que la recomendación del mediodía sirva; registrarlo de noche llega
 *     tarde para decidir el almuerzo.
 *   · MEDIODÍA (11:00–19:00) — "Antes de comer". Acá NUTRIA devuelve: usa lo de
 *     la mañana para decirte qué te alcanza y dónde. Registrar es opcional;
 *     abrir es el punto.
 *   · NOCHE (19:00–05:00) — "Cierre del día". Qué comiste y cómo te fue. Es la
 *     red de seguridad: si no abriste en todo el día, una frase acá deja el día
 *     completo igual.
 *
 * TRES DECISIONES QUE SE SIGUEN DE ESO
 * -----------------------------------------------------------------------------
 *  1. **Un día admite varios registros y ya lo hacía.** `consolidarPorDia()` en
 *     patrones.js junta todo lo del mismo día rellenando huecos. Registrar tres
 *     veces no crea tres días: completa uno. Este módulo hace visible esa
 *     capacidad que el motor ya tenía y la interfaz escondía.
 *  2. **Nada es obligatorio y nada caduca a medianoche.** Lo que falta se
 *     muestra como hueco, no como deuda. Un "pendiente" que regaña es la forma
 *     más rápida de que alguien desinstale una app de salud.
 *  3. **El mínimo real es una frase al día.** La racha, la meta y los patrones
 *     se calculan por DÍA con registro, no por momento cumplido. Este módulo no
 *     puede inventar una exigencia nueva por encima de esa.
 *
 * Función pura sobre los registros: testeable sin DOM y sin reloj del sistema.
 */

import { diaLocal } from '../datos/almacen.js';
import { consolidarPorDia } from './patrones.js';

/**
 * Los tres momentos. Los rangos están en minutos desde medianoche y `noche`
 * cruza las 00:00 a propósito: el que registra a la 1 a.m. está cerrando el día
 * que acaba de terminar, no empezando el siguiente.
 */
export const MOMENTOS = [
  {
    id: 'manana',
    nombre: 'Mañana',
    titulo: 'Cómo amaneciste',
    desde: 5 * 60,
    hasta: 11 * 60,
    rotulo: '5:00 – 11:00',
    pide: ['sueno', 'presupuesto'],
    porque: 'Cuánto dormiste y con cuánta plata sales. Es lo que hace que la recomendación del mediodía te sirva de verdad.',
    sugerencia: 'dormí 6 horas y me quedan S/12 para hoy'
  },
  {
    id: 'mediodia',
    nombre: 'Mediodía',
    titulo: 'Antes de comer',
    desde: 11 * 60,
    hasta: 19 * 60,
    rotulo: '11:00 – 19:00',
    pide: ['almuerzo'],
    porque: 'Acá NUTRIA te devuelve: qué te alcanza, dónde y en cuánto tiempo. Registrar es opcional; entrar es el punto.',
    sugerencia: 'almorcé menú, me quedan 5 soles'
  },
  {
    id: 'noche',
    nombre: 'Noche',
    titulo: 'Cierre del día',
    desde: 19 * 60,
    hasta: 5 * 60,
    rotulo: '19:00 – 5:00',
    pide: ['almuerzo', 'cena', 'animo'],
    porque: 'Qué comiste y cómo te fue. Si no abriste en todo el día, una frase acá deja el día completo igual.',
    sugerencia: 'no almorcé por la entrega, cené tarde y ando estresado'
  }
];

/** Las señales que un día puede llegar a tener. El orden es el de la pantalla. */
export const SENALES = [
  { id: 'sueno', nombre: 'Sueño', icono: 'luna', pregunta: '¿cuánto dormiste?' },
  { id: 'desayuno', nombre: 'Desayuno', icono: 'chispa', pregunta: '¿desayunaste?' },
  { id: 'almuerzo', nombre: 'Almuerzo', icono: 'tazon', pregunta: '¿almorzaste?' },
  { id: 'cena', nombre: 'Cena', icono: 'luna', pregunta: '¿cenaste?' },
  { id: 'presupuesto', nombre: 'Plata', icono: 'monedas', pregunta: '¿con cuánto cuentas?' },
  { id: 'animo', nombre: 'Ánimo', icono: 'corazon', pregunta: '¿cómo te sentiste?' }
];

/**
 * Frases de un toque. Cada una pasa por el MISMO analizador que el texto libre
 * —no hay una vía rápida que salte las reglas—, así que lo que se registra con
 * un toque es idéntico a lo que se registra escribiendo, evidencia incluida.
 */
export const ATAJOS = {
  manana: [
    { fragmento: 'dormí bien', senal: 'sueno' },
    { fragmento: 'dormí 5 horas', senal: 'sueno' },
    { fragmento: 'casi no dormí', senal: 'sueno' },
    { fragmento: 'desayuné', senal: 'desayuno' },
    { fragmento: 'no desayuné', senal: 'desayuno' },
    { fragmento: 'me quedan S/12', senal: 'presupuesto' }
  ],
  mediodia: [
    { fragmento: 'almorcé menú', senal: 'almuerzo' },
    { fragmento: 'no almorcé', senal: 'almuerzo' },
    { fragmento: 'me quedan S/10', senal: 'presupuesto' },
    { fragmento: 'estoy misio', senal: 'presupuesto' },
    { fragmento: 'ando estresado', senal: 'animo' },
    { fragmento: 'tengo entrega mañana', senal: 'animo' }
  ],
  noche: [
    { fragmento: 'almorcé', senal: 'almuerzo' },
    { fragmento: 'no almorcé', senal: 'almuerzo' },
    { fragmento: 'cené', senal: 'cena' },
    { fragmento: 'no cené', senal: 'cena' },
    { fragmento: 'día tranquilo', senal: 'animo' },
    { fragmento: 'dormí 6 horas', senal: 'sueno' }
  ]
};

function minutos(fecha) {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

/** En qué momento del día estamos. */
export function momentoActual(ahora = new Date()) {
  const m = minutos(ahora);
  for (const momento of MOMENTOS) {
    const cruzaMedianoche = momento.hasta <= momento.desde;
    const dentro = cruzaMedianoche
      ? (m >= momento.desde || m < momento.hasta)
      : (m >= momento.desde && m < momento.hasta);
    if (dentro) return momento;
  }
  return MOMENTOS[2];
}

/** Qué señales tiene ya el día de hoy, a partir de los registros consolidados. */
export function senalesDelDia(registros, ahora = new Date()) {
  const hoy = diaLocal(ahora);
  const dia = consolidarPorDia((registros || []).filter((r) => r.dia === hoy))[0] || null;
  if (!dia) {
    return { dia: hoy, registros: 0, capturadas: {}, textos: [] };
  }
  return {
    dia: hoy,
    registros: dia.ids.length,
    textos: dia.textos,
    capturadas: {
      sueno: dia.sueno !== null,
      desayuno: dia.comidas.desayuno !== null,
      almuerzo: dia.comidas.almuerzo !== null,
      cena: dia.comidas.cena !== null,
      presupuesto: dia.presupuesto !== null,
      animo: dia.animo !== null
    },
    valores: {
      sueno: dia.sueno,
      desayuno: dia.comidas.desayuno,
      almuerzo: dia.comidas.almuerzo,
      cena: dia.comidas.cena,
      presupuesto: dia.presupuesto,
      animo: dia.animo
    }
  };
}

/** Hora legible del próximo momento, para "te espero a las …". */
function comoHora(minutosDelDia) {
  const h = Math.floor(minutosDelDia / 60);
  const m = minutosDelDia % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Estado completo del ritmo de hoy: qué momento es, qué hay, qué falta y qué
 * conviene hacer ahora. Es lo que pinta el panel de la vista Hoy.
 *
 * @param {Array} registros lista completa del almacén
 * @param {Date}  ahora     inyectable para pruebas
 */
export function ritmoDeHoy(registros, ahora = new Date()) {
  const momento = momentoActual(ahora);
  const senales = senalesDelDia(registros, ahora);
  const capturadas = senales.capturadas;

  const pendientesDelMomento = momento.pide.filter((s) => !capturadas[s]);
  const totalCapturadas = SENALES.filter((s) => capturadas[s.id]).length;

  // "Completo" no significa las seis señales: significa que este momento ya no
  // tiene nada que pedirte. Exigir el pleno sería inventar una meta nueva.
  let estado = 'pendiente';
  if (!senales.registros) estado = 'vacio';
  else if (!pendientesDelMomento.length) estado = 'al_dia';

  const siguiente = MOMENTOS[(MOMENTOS.indexOf(momento) + 1) % MOMENTOS.length];

  const invitacion = {
    vacio: momento.id === 'noche'
      ? 'Todavía no me contaste nada de hoy. Una frase y el día queda completo.'
      : 'Todavía no me contaste nada de hoy. Empieza por lo que tengas a mano.',
    pendiente: `Me falta ${pendientesDelMomento.map((s) => nombreSenal(s).toLowerCase()).join(' y ')} para cerrar la ${momento.nombre.toLowerCase()}.`,
    al_dia: momento.id === 'noche'
      ? 'Tu día está completo. Nos vemos mañana.'
      : `Por ahora estás al día. Te espero en la ${siguiente.nombre.toLowerCase()}, desde las ${comoHora(siguiente.desde)}.`
  }[estado];

  /* Los tres tramos de la barra, con su peso real en horas: la mañana ocupa 6 h
     y la noche 10 h, y dibujarlos iguales mentiría sobre dónde cae el "ahora". */
  const momentos = MOMENTOS.map((m) => {
    const duracion = m.hasta <= m.desde ? (24 * 60 - m.desde) + m.hasta : m.hasta - m.desde;
    return {
      ...m,
      peso: Math.round((duracion / (24 * 60)) * 1000) / 1000,
      cumplido: m.pide.every((s) => capturadas[s])
    };
  });

  return {
    momento,
    momentos,
    siguiente,
    estado,
    invitacion,
    /* Posición del marcador "ahora" en la barra, de 0 a 1. Se mide desde las
       05:00, que es donde ARRANCA la barra (mañana → mediodía → noche), no desde
       medianoche: con el origen en 00:00 el marcador caía media barra corrido. */
    avanceDelDia: ((minutos(ahora) - MOMENTOS[0].desde + 24 * 60) % (24 * 60)) / (24 * 60),
    senales: SENALES.map((s) => {
      const val = senales.valores ? senales.valores[s.id] : null;
      const esSaltada = val === 'saltada';
      return {
        ...s,
        capturada: !!capturadas[s.id],
        saltada: esSaltada,
        valor: val,
        sePideAhora: momento.pide.includes(s.id) && !capturadas[s.id]
      };
    }),
    totalCapturadas,
    totalSenales: SENALES.length,
    registrosDeHoy: senales.registros,
    pendientes: pendientesDelMomento,
    // Los atajos de un toque del momento actual. Sin esto, `atajosDelMomento()`
    // en vistas.js revienta al leer `.length` y la fila desaparece de Hoy.
    atajos: ATAJOS[momento.id] || []
  };
}

export function nombreSenal(id) {
  const s = SENALES.find((x) => x.id === id);
  return s ? s.nombre : id;
}
