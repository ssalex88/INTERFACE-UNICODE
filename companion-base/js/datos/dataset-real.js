/**
 * NUTRIA · Adaptador del dataset real de ULima
 * -----------------------------------------------------------------------------
 * Convierte restaurants.csv + dishes.csv al contrato que consumen HU-07 y
 * HU-08. Esta capa no decide compatibilidad ni ranking: solo normaliza datos y
 * conserva su trazabilidad.
 */

const CAMPUS_ID = 'ulima';
/** Carga los dos CSV reales desde un servidor estático. */
export async function cargarDatasetReal({ baseUrl = '../../dataset', fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Se necesita fetch para cargar el dataset real.');
  const [restaurantesRespuesta, platosRespuesta] = await Promise.all([
    fetchImpl(`${baseUrl}/restaurants.csv`, { cache: 'no-store' }),
    fetchImpl(`${baseUrl}/dishes.csv`, { cache: 'no-store' })
  ]);
  if (!restaurantesRespuesta.ok || !platosRespuesta.ok) {
    throw new Error(`No se pudo cargar el dataset real (${restaurantesRespuesta.status}/${platosRespuesta.status}).`);
  }
  return adaptarDatasetReal(await restaurantesRespuesta.text(), await platosRespuesta.text());
}

/** Adaptación pura para tests, importaciones y futuros cargadores. */
export function adaptarDatasetReal(restaurantsCsv, dishesCsv) {
  const restaurants = parseCsv(restaurantsCsv).map(adaptRestaurant);
  const byId = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]));
  const options = parseCsv(dishesCsv)
    .map((dish) => adaptDish(dish, byId.get(dish.restaurant_id)))
    .filter(Boolean);

  return {
    _meta: {
      fuente: 'dataset real de ULima',
      campusId: CAMPUS_ID,
      restaurantes: restaurants.length,
      platos: options.length,
      registrosPlatoSinRestaurante: parseCsv(dishesCsv).length - options.length
    },
    restaurants,
    options,
    opciones: options
  };
}

function adaptRestaurant(row) {
  return {
    id: row.restaurant_id,
    campusId: CAMPUS_ID,
    campus: CAMPUS_ID,
    nombre: nullable(row.name),
    name: nullable(row.name),
    ubicacion: nullable(row.location_reference) || nullable(row.address),
    onCampus: booleanOrNull(row.on_campus),
    walkMinutes: numberOrNull(row.walking_time_min),
    distanceMeters: numberOrNull(row.distance_m_walk),
    fuente: nullable(row.source_1_url) || nullable(row.source_2_url),
    source: nullable(row.source_1_url) || nullable(row.source_2_url),
    fecha: nullable(row.verified_at),
    verified_at: nullable(row.verified_at),
    confianza: nullable(row.data_confidence),
    data_confidence: nullable(row.data_confidence),
    distanceConfidence: nullable(row.distance_confidence),
    currentStatus: nullable(row.current_status),
    openingHours: nullable(row.opening_hours)
  };
}

function adaptDish(row, restaurant) {
  if (!restaurant) return null;
  const gluten = glutenCompatibility(row.gluten_free);
  const compatibility = {
    lactose: 'unknown',
    peanut: 'unknown',
    gluten
  };
  return {
    id: row.dish_id,
    restaurantId: row.restaurant_id,
    restaurante: restaurant.nombre,
    campusId: restaurant.campusId,
    campus: restaurant.campus,
    onCampus: restaurant.onCampus,
    plato: nullable(row.name),
    nombre: nullable(row.name),
    name: nullable(row.name),
    descripcion: nullable(row.description),
    categoria: nullable(row.category),
    subcategoria: nullable(row.subcategory),
    price: numberOrNull(row.price_pen),
    precio: numberOrNull(row.price_pen),
    walkMinutes: restaurant.walkMinutes,
    caminando_min: restaurant.walkMinutes,
    // El dataset no tiene espera: null se conserva como unknown en HU-08.
    waitMinutes: null,
    tiempo_cola_min: null,
    ingredients: splitIngredients(row.ingredients),
    ingredientes: splitIngredients(row.ingredients),
    allergens: { ...compatibility },
    contains: { ...compatibility },
    mayContain: {
      lactose: 'unknown',
      peanut: 'unknown',
      gluten: gluten === 'unknown' ? 'unknown' : 'not_applicable'
    },
    compatibility,
    vegetarian: booleanOrNull(row.vegetarian),
    vegetariano: booleanOrNull(row.vegetarian),
    availability: nullable(row.availability),
    fuente: nullable(row.source_url),
    source: nullable(row.source_url),
    fecha: nullable(row.verified_at),
    verified_at: nullable(row.verified_at),
    confianza: nullable(row.data_confidence),
    data_confidence: nullable(row.data_confidence),
    priceConfidence: nullable(row.price_confidence),
    notas: nullable(row.notes)
  };
}

function glutenCompatibility(value) {
  const normalized = nullable(value);
  if (normalized === null) return 'unknown';
  return normalized === 'true' ? 'not_applicable' : 'known';
}

function splitIngredients(value) {
  const text = nullable(value);
  return text === null ? [] : text.split(',').map((item) => item.trim()).filter(Boolean);
}

function nullable(value) {
  const text = String(value ?? '').trim();
  return text === '' || text.toLowerCase() === 'null' ? null : text;
}

function numberOrNull(value) {
  const text = nullable(value);
  if (text === null) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function booleanOrNull(value) {
  const text = nullable(value);
  if (text === null) return null;
  if (text.toLowerCase() === 'true') return true;
  if (text.toLowerCase() === 'false') return false;
  return null;
}

/** Parser CSV pequeño, compatible con comas entrecomilladas y comillas dobles. */
export function parseCsv(texto) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const text = String(texto ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.some((value) => value !== '')) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
}
