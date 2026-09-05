/**
 * NUTRIA · Levantamiento real del campus → esquema del motor
 * -----------------------------------------------------------------------------
 * `dataset/` es el levantamiento de campo: 20 establecimientos y 65 platos de la
 * Universidad de Lima y su perímetro, cada fila con su fuente y su fecha de
 * verificación. Este módulo lo lee tal cual (CSV, en el navegador, sin build) y
 * lo traduce al esquema que consume `js/motor/recomendador.js`.
 *
 * LO QUE EL LEVANTAMIENTO NO TRAE, Y CÓMO SE RESUELVE
 * -----------------------------------------------------------------------------
 * El dataset se levantó de cartas oficiales y de Google Maps. Dos campos que el
 * motor usa no existen ahí, y la regla de calidad del propio dataset es clara:
 * "es preferible dejar un campo en null que inventar un dato".
 *
 *   · `tiempo_cola_min` — nadie cronometró la cola de la 1 p.m. Queda en `null`,
 *     y el recomendador deja de puntuar por ese término cuando falta en vez de
 *     asumir cero, que sería premiar al que no se midió.
 *   · `aporte` (proteína / verdura / carbohidrato) — sí se puede derivar de
 *     `protein` e `ingredients`, y es la señal que más pesa en el puntaje. Por
 *     eso NO se deriva "a ojo": cada valor guarda la regla que lo produjo y el
 *     ingrediente exacto que la disparó, en `aporte_derivacion`. Es la misma
 *     exigencia de explicabilidad que se le pide al analizador de frases.
 *
 * ALÉRGENOS: nunca se declara una ausencia
 * -----------------------------------------------------------------------------
 * De los ingredientes publicados se puede afirmar que algo ESTÁ (si la carta
 * dice "queso", hay lácteo). No se puede afirmar que algo NO está: una carta no
 * describe la cocina, ni la sartén compartida, ni el aceite. Por eso
 * `alergenos_ausentes_verificados` queda SIEMPRE vacío y todo lo que no se
 * detectó viaja como `alergenos_no_verificados`. Es lo que exige HU-04: lo
 * desconocido se comunica como desconocido, nunca como "seguro".
 *
 * Las columnas `calories`, `protein_g`, `carbs_g` y `fat_g` del dataset se
 * ignoran a propósito y no deben conectarse nunca (Bloque 3: NUTRIA no cuenta
 * calorías). Ver docs/DATASET.md.
 */

import { leerCSV, aBooleano, aNumero, aTexto } from './csv.js';

/* Rutas relativas AL MÓDULO, no al documento: así el mismo import funciona
   desde /index.html y desde /tests/test-analizador.html, que están a distinta
   profundidad. Con rutas relativas al documento, las pruebas cargaban en
   silencio el respaldo embebido y nadie se enteraba. */
const RUTA_RESTAURANTES = new URL('../../dataset/restaurants.csv', import.meta.url);
const RUTA_PLATOS = new URL('../../dataset/dishes.csv', import.meta.url);

// --- Saneado de texto --------------------------------------------------------
/**
 * El levantamiento llegó de una cadena de herramientas con la codificación rota
 * ("Metodologí¡³a", "ÓÓÓval"). Las fuentes ya están reparadas, pero el saneado se
 * queda acá: si alguien regenera el CSV con el mismo pipeline, la app muestra
 * texto legible en vez de basura, y eso no se puede depender de recordarlo.
 */
function sanear(texto) {
  return String(texto ?? '')
    .replace(/­/g, '')          // guion suave invisible
    .replace(/([ÁÉÍÓÚÑ])\1{1,}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// --- Vocabulario controlado --------------------------------------------------
/**
 * El motor puntúa sobre un vocabulario cerrado (ver docs/DATASET.md). El dataset
 * usa el suyo, más fino y comercial. Este mapa es la traducción, y es el único
 * lugar donde se decide qué es "un plato" y qué es "algo para picar".
 */
const CATEGORIA_POR_DEFECTO = {
  hamburguesa: 'plato_fuerte',
  pollo: 'plato_fuerte',
  chifa: 'plato_fuerte',
  sushi: 'plato_fuerte',
  menu_economico: 'menu_completo',
  fast_food: 'plato_fuerte',
  sanducheria: 'sandwich',
  desayuno: 'desayuno',
  ensalada: 'ensalada',
  sopa: 'sopa',
  snack: 'snack',
  postre: 'snack',
  cafe: 'bebida',
  bebida: 'bebida'
};

const CATEGORIA_POR_SUBCATEGORIA = {
  sandwich: 'sandwich',
  sandwich_pollo: 'sandwich',
  acompanamiento: 'guarnicion',
  salsa: 'guarnicion',
  salchipapa: 'snack',
  helado: 'snack',
  galleta: 'snack',
  brownie: 'snack',
  torta: 'snack',
  panaderia: 'desayuno',
  huevo: 'desayuno',
  agua: 'bebida',
  gaseosa: 'bebida',
  te: 'bebida',
  chocolate: 'bebida',
  cafe_caliente: 'bebida',
  cafe_frio: 'bebida',
  frappuccino: 'bebida'
};

/** Categorías que NO son una comida: no compiten como opción principal. */
export const CATEGORIAS_ACCESORIAS = new Set(['bebida', 'guarnicion', 'entrada']);

// --- Léxicos de derivación ---------------------------------------------------
/* Cada lista es un criterio auditable: si mañana alguien discute que el camote
   cuenta como verdura, se discute acá y no en medio del puntaje. */
const PROTEINAS_ANIMALES = [
  'carne', 'res', 'pollo', 'cerdo', 'chicharron', 'chicharrón', 'tocino', 'lomo',
  'huevo', 'salmon', 'salmón', 'atun', 'atún', 'bonito', 'pescado', 'langostino',
  'ebi', 'camaron', 'camarón', 'marisco', 'jamon', 'jamón', 'pavo'
];
const PROTEINAS_MENORES = ['salchicha', 'hot dog', 'embutido', 'huachana', 'queso', 'wantan', 'wantán', 'tequeño', 'tequeno'];
const VERDURAS = [
  'lechuga', 'tomate', 'palta', 'cebolla', 'verdura', 'ensalada', 'coleslaw',
  'kiuri', 'pepino', 'guacamole', 'brocoli', 'brócoli', 'zanahoria', 'espinaca', 'chalaquita'
];
/**
 * Verdura que es un COMPONENTE del plato, no el adorno del pan. La lechuga y el
 * tomate de una hamburguesa son reales, pero contarlos igual que una ensalada
 * hacía que una hamburguesa con queso puntuara como un menú con ensalada. Para
 * "alta" hace falta una de estas palabras o tres verduras distintas.
 */
const VERDURAS_DE_PLATO = ['verdura', 'ensalada', 'coleslaw', 'guacamole', 'chalaquita', 'brocoli', 'brócoli', 'espinaca'];
const CARBOHIDRATOS = [
  'arroz', 'chaufa', 'tallarin', 'tallarín', 'fideo', 'papa', 'pan', 'harina',
  'camote', 'platano', 'plátano', 'galleta', 'shari', 'masa', 'panino', 'croissant', 'tortilla'
];
const FRITURAS = ['frito', 'fritas', 'broaster', 'crocante', 'empanizado', 'furai', 'chicharron', 'chicharrón', 'tempura'];
const ULTRAPROCESADOS = ['gaseosa', 'doritos', 'hot dog', 'salchicha', 'embutido', 'huachana', 'inca kola'];
const CALIENTES = ['parrilla', 'caliente', 'horno', 'chaufa', 'tallarin', 'tallarín', 'sopa', 'broaster', 'frito', 'espresso', 'vaporizada'];

/** Alérgeno -> qué palabras de la carta permiten afirmar que ESTÁ presente. */
const HUELLAS_ALERGENO = {
  gluten: ['pan', 'harina', 'tallarin', 'tallarín', 'fideo', 'galleta', 'brownie', 'torta', 'croissant',
    'panino', 'empanizado', 'crocante', 'wantan', 'wantán', 'tequeño', 'tequeno', 'doritos', 'masa', 'furai'],
  lactosa: ['leche', 'queso', 'crema', 'mantequilla', 'manjar', 'helado', 'chantilly', 'chocolate', 'latte', 'macchiato'],
  huevo: ['huevo', 'mayonesa'],
  mani: ['mani', 'maní', 'cacahuate'],
  mariscos: ['langostino', 'ebi', 'camaron', 'camarón', 'marisco', 'cangrejo'],
  soja: ['soya', 'soja', 'sillao', 'ponzu', 'chi jau', 'tipakay']
};

const ALERGENOS = Object.keys(HUELLAS_ALERGENO);

/**
 * Normaliza para comparar: minúsculas y sin tildes, conservando los espacios.
 * Sin esto, "maní" y "mani" son dos palabras distintas y el léxico falla justo
 * en el idioma para el que se escribió.
 */
function plano(texto) {
  return String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Los léxicos se buscan como PRINCIPIO DE PALABRA, no como subcadena suelta.
 * Buscar "res" dentro de la frase completa hacía que un espresso tuviera
 * proteína animal y un "ebi" apareciera dentro de "bebida". El sufijo abierto
 * sí se acepta a propósito: "papa" tiene que encontrar "papas".
 */
function expresion(termino) {
  const escapado = plano(termino).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escapado}[a-z]*`);
}

/** Devuelve el primer término del léxico presente en el texto, o null. */
function coincide(texto, lexico) {
  const t = plano(texto);
  for (const termino of lexico) if (expresion(termino).test(t)) return termino;
  return null;
}

/** Todos los términos del léxico presentes en el texto, sin repetir. */
function coincidencias(texto, lexico) {
  const t = plano(texto);
  const vistos = new Set();
  for (const termino of lexico) {
    if (!expresion(termino).test(t)) continue;
    // "tallarin" y "tallarín" son el mismo hallazgo: no cuentan dos veces.
    vistos.add(plano(termino));
  }
  return Array.from(vistos);
}

// --- Derivación del aporte cualitativo --------------------------------------
/**
 * Traduce ingredientes publicados a la escala cualitativa del motor
 * (alta / media / baja) para proteína, verdura y carbohidrato.
 *
 * Devuelve el valor Y la justificación: qué regla se aplicó y qué palabra de la
 * carta la disparó. Si mañana la clasificación se discute, se discute sobre la
 * evidencia, no sobre el criterio de quien la escribió.
 */
export function derivarAporte({ nombre, ingredientes, proteina, categoria }) {
  const texto = `${nombre} ${ingredientes} ${proteina}`.toLowerCase();
  const esAccesorio = CATEGORIAS_ACCESORIAS.has(categoria) || categoria === 'snack';

  // Proteína
  let valorProteina = 'baja';
  let reglaProteina = { regla: 'sin proteína identificable en la carta', cita: null };
  const animal = coincide(texto, PROTEINAS_ANIMALES);
  const menor = coincide(texto, PROTEINAS_MENORES);
  if (animal && !esAccesorio) {
    valorProteina = 'alta';
    reglaProteina = { regla: 'proteína animal declarada en un plato principal', cita: animal };
  } else if (animal) {
    valorProteina = 'media';
    reglaProteina = { regla: 'proteína animal, pero en una porción para picar', cita: animal };
  } else if (menor) {
    valorProteina = 'media';
    reglaProteina = { regla: 'aporte proteico menor (embutido, queso o masa rellena)', cita: menor };
  }

  // Verdura
  const verduras = coincidencias(texto, VERDURAS);
  const deplato = coincide(texto, VERDURAS_DE_PLATO);
  let valorVerdura = 'baja';
  let reglaVerdura = { regla: 'la carta no menciona verduras', cita: null };
  if (deplato) {
    valorVerdura = 'alta';
    reglaVerdura = { regla: 'la verdura es parte del plato, no un adorno', cita: deplato };
  } else if (verduras.length >= 3) {
    valorVerdura = 'alta';
    reglaVerdura = { regla: 'tres o más verduras distintas en la carta', cita: verduras.slice(0, 3).join(', ') };
  } else if (verduras.length) {
    valorVerdura = 'media';
    reglaVerdura = { regla: verduras.length === 1 ? 'una verdura en la carta' : 'dos verduras, de las que suelen ir como guarnición', cita: verduras.join(', ') };
  }

  // Carbohidrato
  const carbos = coincidencias(texto, CARBOHIDRATOS);
  let valorCarbohidrato = 'baja';
  let reglaCarbohidrato = { regla: 'sin fuente de carbohidrato declarada', cita: null };
  if (carbos.length >= 2) {
    valorCarbohidrato = 'alta';
    reglaCarbohidrato = { regla: 'dos o más fuentes de carbohidrato', cita: carbos.slice(0, 3).join(', ') };
  } else if (carbos.length === 1) {
    valorCarbohidrato = 'media';
    reglaCarbohidrato = { regla: 'una fuente de carbohidrato', cita: carbos[0] };
  }

  return {
    aporte: { proteina: valorProteina, verdura: valorVerdura, carbohidrato: valorCarbohidrato },
    derivacion: { proteina: reglaProteina, verdura: reglaVerdura, carbohidrato: reglaCarbohidrato }
  };
}

// --- Derivación de alérgenos -------------------------------------------------
/**
 * Solo afirma presencias, nunca ausencias (ver cabecera). Lo no detectado va a
 * `no_verificados` para que la interfaz pueda decir "no lo sabemos" en vez de
 * callarse, que es lo que HU-04 prohíbe.
 */
export function derivarAlergenos({ nombre, ingredientes, descripcion }) {
  const texto = `${nombre} ${ingredientes} ${descripcion}`.toLowerCase();
  const presentes = [];
  const evidencia = {};
  for (const alergeno of ALERGENOS) {
    const huella = coincide(texto, HUELLAS_ALERGENO[alergeno]);
    if (huella) { presentes.push(alergeno); evidencia[alergeno] = huella; }
  }
  return {
    presentes,
    ausentes_verificados: [],
    no_verificados: ALERGENOS.filter((a) => !presentes.includes(a)),
    evidencia
  };
}

// --- Horarios ----------------------------------------------------------------
const DIAS_ABREVIADOS = { lun: 1, mar: 2, mie: 3, mié: 3, jue: 4, vie: 5, sab: 6, sáb: 6, dom: 7 };

/**
 * "Lun-Dom: 07:00-22:00" -> { horario: {desde, hasta}, dias: [1..7] }.
 * Si no se puede leer, devuelve `null` en vez de inventar un horario: mostrar un
 * sitio como abierto cuando no se sabe es peor que no mostrarlo.
 */
export function parsearHorario(texto) {
  const bruto = sanear(texto).toLowerCase();
  const m = bruto.match(/([a-záé]{3})\s*-\s*([a-záé]{3})\s*:?\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!m) return null;

  const desdeDia = DIAS_ABREVIADOS[m[1]];
  const hastaDia = DIAS_ABREVIADOS[m[2]];
  if (!desdeDia || !hastaDia) return null;

  const dias = [];
  let cursor = desdeDia;
  for (let i = 0; i < 7; i += 1) {
    dias.push(cursor);
    if (cursor === hastaDia) break;
    cursor = cursor === 7 ? 1 : cursor + 1;
  }

  const normalizarHora = (h) => {
    const [hh, mm] = h.split(':');
    return `${String(hh).padStart(2, '0')}:${mm}`;
  };
  let hasta = normalizarHora(m[4]);
  // "12:00-00:00" es "hasta la medianoche", no "cierra antes de abrir".
  if (hasta === '00:00') hasta = '23:59';

  return { horario: { desde: normalizarHora(m[3]), hasta }, dias };
}

// --- Zona legible ------------------------------------------------------------
/** `location_reference` viene para un CSV, no para una tarjeta. Se acorta. */
function zonaLegible(referencia, dentroDelCampus) {
  const limpia = sanear(referencia).replace(/^Dentro del campus ULima\s*-?\s*/i, '');
  if (dentroDelCampus) return limpia ? `Campus · ${limpia}` : 'Dentro del campus';
  return limpia || 'Cerca del campus';
}

const CONFIANZA = { high: 'alto', medium: 'medio', low: 'bajo' };

// --- Etiquetas ---------------------------------------------------------------
function derivarEtiquetas({ texto, categoria, precio, aporte, vegetariano, nombre }) {
  const etiquetas = new Set();

  if (aporte.proteina === 'alta') etiquetas.add('proteina_animal');
  if (aporte.verdura !== 'baja') etiquetas.add('verdura');
  if (vegetariano === true) etiquetas.add('vegetariano');
  if (coincide(texto, FRITURAS)) etiquetas.add('frito');
  if (coincide(texto, ULTRAPROCESADOS)) etiquetas.add('ultraprocesado');
  if (coincide(texto, CALIENTES)) etiquetas.add('caliente');
  if (categoria === 'sopa' || texto.includes('sopa') || texto.includes('caldo')) { etiquetas.add('sopa'); etiquetas.add('caliente'); }
  if (categoria === 'desayuno') etiquetas.add('desayuno');
  if (precio !== null && precio <= 8) etiquetas.add('economico');
  if (['snack', 'bebida', 'guarnicion'].includes(categoria)) etiquetas.add('rapido');
  if (['menu_completo', 'plato_fuerte'].includes(categoria) && precio !== null && precio >= 15) etiquetas.add('contundente');
  if (categoria === 'ensalada' || (aporte.proteina !== 'alta' && aporte.carbohidrato !== 'alta' && !CATEGORIAS_ACCESORIAS.has(categoria))) etiquetas.add('ligero');
  if (/x\s?\d{2}|combinado|para compartir/i.test(nombre)) etiquetas.add('compartir');

  return Array.from(etiquetas);
}

// --- Transformación de una fila ---------------------------------------------
function categoriaDePlato(fila) {
  const sub = String(fila.subcategory || '').trim().toLowerCase();
  const cat = String(fila.category || '').trim().toLowerCase();
  const incluyeAcompanamiento = aBooleano(fila.includes_side) === true;

  // Un combo con acompañamiento SÍ es un almuerzo completo; un combo que solo
  // suma una gaseosa, no. La diferencia importa: es la que decide si a la 1 p.m.
  // el motor lo trata como plato o como algo para aguantar.
  if (sub === 'combo' || sub === 'menu_completo' || sub === 'promocion') {
    return incluyeAcompanamiento ? 'menu_completo' : (CATEGORIA_POR_DEFECTO[cat] || 'plato_fuerte');
  }
  return CATEGORIA_POR_SUBCATEGORIA[sub] || CATEGORIA_POR_DEFECTO[cat] || 'plato_fuerte';
}

function construirOpcion(fila, restaurante) {
  const nombre = sanear(fila.name);
  const ingredientes = sanear(fila.ingredients);
  const descripcion = sanear(fila.description);
  const precio = aNumero(fila.price_pen);
  const categoria = categoriaDePlato(fila);
  const proteinaDeclarada = sanear(fila.protein);

  const { aporte, derivacion } = derivarAporte({ nombre, ingredientes, proteina: proteinaDeclarada, categoria });
  const alergenos = derivarAlergenos({ nombre, ingredientes, descripcion });
  const vegetariano = aBooleano(fila.vegetarian);
  const texto = `${nombre} ${ingredientes} ${descripcion}`.toLowerCase();

  return {
    id: fila.dish_id,
    plato: nombre,
    descripcion,
    establecimiento: restaurante.nombre,
    establecimiento_id: restaurante.id,
    zona: restaurante.zona,
    dentro_del_campus: restaurante.dentroDelCampus,
    precio,
    categoria,
    etiquetas: derivarEtiquetas({ texto, categoria, precio, aporte, vegetariano, nombre }),
    aporte,
    aporte_derivacion: derivacion,
    // Nadie cronometró la cola: `null` significa "no se sabe", y el motor lo
    // trata como desconocido en vez de como cero.
    tiempo_cola_min: null,
    caminando_min: restaurante.caminandoMin,
    horario: restaurante.horario,
    dias: restaurante.dias,
    vegetariano,
    incluye_bebida: aBooleano(fila.includes_drink),
    incluye_acompanamiento: aBooleano(fila.includes_side),
    notas: sanear(fila.notes),
    alergenos_presentes: alergenos.presentes,
    alergenos_ausentes_verificados: alergenos.ausentes_verificados,
    alergenos_no_verificados: alergenos.no_verificados,
    alergenos_evidencia: alergenos.evidencia,
    procedencia_dato: restaurante.dentroDelCampus
      ? `Carta publicada por ${restaurante.nombre}`
      : `Carta publicada por ${restaurante.nombre} (fuera del campus)`,
    fuente_url: aTexto(fila.source_url),
    fecha_actualizacion: aTexto(fila.verified_at) || restaurante.verificado,
    nivel_confianza: CONFIANZA[String(fila.price_confidence || fila.data_confidence).toLowerCase()] || 'medio'
  };
}

function construirEstablecimiento(fila) {
  const dentroDelCampus = aBooleano(fila.on_campus) === true;
  const horarioParseado = parsearHorario(fila.opening_hours);
  return {
    id: fila.restaurant_id,
    nombre: sanear(fila.name),
    categoria: sanear(fila.category),
    dentroDelCampus,
    zona: zonaLegible(fila.location_reference, dentroDelCampus),
    referencia: sanear(fila.location_reference),
    direccion: sanear(fila.address),
    latitud: aNumero(fila.latitude),
    longitud: aNumero(fila.longitude),
    caminandoMin: aNumero(fila.walking_time_min),
    metros: aNumero(fila.distance_m_walk),
    horarioTexto: sanear(fila.opening_hours) || null,
    horario: horarioParseado ? horarioParseado.horario : null,
    dias: horarioParseado ? horarioParseado.dias : null,
    estado: sanear(fila.current_status) || null,
    web: aTexto(fila.website),
    mapa: aTexto(fila.google_maps_url),
    verificado: aTexto(fila.verified_at),
    confianza: CONFIANZA[String(fila.data_confidence).toLowerCase()] || 'medio',
    platos: 0
  };
}

/**
 * Convierte las dos tablas del levantamiento en el dataset que consume la app.
 * Función pura: se le pasan los textos de los CSV y devuelve el objeto. Así se
 * puede probar sin red y sin navegador.
 *
 * @param {string} csvRestaurantes contenido de dataset/restaurants.csv
 * @param {string} csvPlatos       contenido de dataset/dishes.csv
 */
export function construirDataset(csvRestaurantes, csvPlatos) {
  const establecimientos = leerCSV(csvRestaurantes)
    .filter((f) => f.restaurant_id)
    .map(construirEstablecimiento);
  const porId = new Map(establecimientos.map((e) => [e.id, e]));

  const opciones = [];
  for (const fila of leerCSV(csvPlatos)) {
    const restaurante = porId.get(fila.restaurant_id);
    // Un plato sin establecimiento no se puede recomendar: no sabemos ni dónde
    // queda ni cuándo abre. Se descarta en silencio, no se inventa la ficha.
    if (!restaurante || !fila.dish_id) continue;
    if (String(fila.availability || 'available').toLowerCase() === 'unavailable') continue;
    const opcion = construirOpcion(fila, restaurante);
    if (opcion.precio === null) continue;
    restaurante.platos += 1;
    opciones.push(opcion);
  }

  return {
    _meta: {
      version: '1.0.0',
      origen: 'dataset',
      campus: 'Universidad de Lima — Av. Javier Prado Este 4600, Santiago de Surco',
      moneda: 'PEN',
      actualizado: establecimientos.map((e) => e.verificado).filter(Boolean).sort().pop() || null,
      establecimientos: establecimientos.length,
      conCarta: establecimientos.filter((e) => e.platos > 0).length,
      camposDerivados: ['aporte', 'etiquetas', 'alergenos_presentes'],
      camposDesconocidos: ['tiempo_cola_min']
    },
    opciones,
    establecimientos
  };
}

/** Descarga los dos CSV y arma el dataset. Lanza si alguno no está. */
export async function cargarDatasetUlima() {
  const [restaurantes, platos] = await Promise.all([
    fetch(RUTA_RESTAURANTES, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`restaurants.csv HTTP ${r.status}`);
      return r.text();
    }),
    fetch(RUTA_PLATOS, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`dishes.csv HTTP ${r.status}`);
      return r.text();
    })
  ]);

  const datos = construirDataset(restaurantes, platos);
  if (!datos.opciones.length) throw new Error('el levantamiento no produjo ninguna opción');
  return datos;
}
