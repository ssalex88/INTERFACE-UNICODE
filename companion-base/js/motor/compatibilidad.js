/**
 * NUTRIA · Compatibilidad alimentaria
 * -----------------------------------------------------------------------------
 * Evalúa un perfil alimentario contra un plato sin depender de la UI, del
 * almacenamiento ni de un dataset concreto. La ausencia de información nunca
 * se interpreta como compatibilidad.
 *
 * Contrato canónico:
 *   profile = {
 *     vegetarian: boolean,
 *     restrictions: {
 *       lactose: { allergy: 'known', intolerance: 'unknown' }
 *     }
 *   }
 *   dish = {
 *     vegetarian: true | false | 'unknown',
 *     contains: { lactose: 'known' | 'unknown' | 'not_applicable' },
 *     mayContain: { lactose: 'known' | 'unknown' | 'not_applicable' }
 *   }
 */

const RESTRICTIONS = ['lactose', 'peanut', 'gluten'];
const STATUSES = new Set(['known', 'unknown', 'not_applicable']);

function status(value, fallback = 'unknown') {
  if (typeof value === 'boolean') return value ? 'known' : 'not_applicable';
  return STATUSES.has(value) ? value : fallback;
}

function restrictionEntry(profile, key) {
  const restrictions = profile?.restrictions || {};
  const entry = restrictions[key] ?? profile?.[key] ?? {};
  if (typeof entry === 'string') return { allergy: entry };
  if (entry === true) return { allergy: 'known' };
  if (entry === false || entry == null) return {};
  return entry;
}

function profileStatus(profile, key, kind) {
  const entry = restrictionEntry(profile, key);
  const collection = profile?.[kind === 'allergy' ? 'allergies' : 'intolerances'];
  if (Array.isArray(collection) && collection.includes(key)) return 'known';
  if (collection && typeof collection === 'object' && key in collection) return status(collection[key], 'known');
  return status(entry[kind]);
}

function dishStatus(dish, field, key) {
  const aliases = field === 'contains' ? ['contains', 'allergens'] : ['mayContain', 'may_contain', 'possibleContact'];
  const source = aliases.find((name) => dish?.[name] != null);
  const values = source ? dish[source] : null;
  if (values == null) return 'unknown';
  if (Array.isArray(values)) return values.includes(key) ? 'known' : 'not_applicable';
  if (values && typeof values === 'object' && key in values) return status(values[key]);
  return 'unknown';
}

function vegetarianStatus(dish) {
  if (!Object.prototype.hasOwnProperty.call(dish || {}, 'vegetarian')) return 'unknown';
  if (dish.vegetarian === true) return 'known';
  if (dish.vegetarian === false) return 'known';
  return status(dish.vegetarian);
}

function reason(code, restriction, message) {
  return { code, restriction, message };
}

/**
 * Evalúa compatibilidad. El resultado es determinístico y no muta sus entradas.
 */
export function evaluateCompatibility(profile = {}, dish = {}) {
  const reasons = [];
  const relevant = [];

  const vegetarianPreference = profile.vegetarian === true
    || profile.preferences?.vegetarian === true;
  if (vegetarianPreference) {
    const vegetarian = vegetarianStatus(dish);
    if (vegetarian === 'unknown') {
      relevant.push(reason('VEGETARIAN_UNKNOWN', 'vegetarian', 'No sabemos si este plato es vegetariano.'));
    } else if (dish.vegetarian === false) {
      reasons.push(reason('VEGETARIAN_EXCLUDED', 'vegetarian', 'Tu perfil pide opciones vegetarianas y este plato contiene carne.'));
    }
  }

  for (const key of RESTRICTIONS) {
    const allergy = profileStatus(profile, key, 'allergy');
    const intolerance = profileStatus(profile, key, 'intolerance');
    if (allergy !== 'known' && intolerance !== 'known') continue;

    const contains = dishStatus(dish, 'contains', key);
    const mayContain = dishStatus(dish, 'mayContain', key);
    const hasMayContain = ['mayContain', 'may_contain', 'possibleContact'].some((name) => dish?.[name] != null);
    const contacto = hasMayContain ? mayContain : (contains === 'unknown' ? 'unknown' : 'not_applicable');
    const restriction = allergy === 'known' ? 'allergy' : 'intolerance';

    if (allergy === 'known' && (contains === 'known' || contacto === 'known')) {
      reasons.push(reason('ALLERGY_EXCLUDED', key, `Este plato contiene o puede contener ${key}; con una alergia conocida lo excluimos.`));
      continue;
    }
    if (contains === 'known') {
      reasons.push(reason('INTOLERANCE_EXCLUDED', key, `Este plato contiene ${key}, incompatible con tu restricción conocida.`));
      continue;
    }
    if (allergy === 'known' && (contains === 'unknown' || contacto === 'unknown')) {
      relevant.push(reason('ALLERGY_UNKNOWN', key, `No hay información suficiente para confirmar que este plato esté libre de ${key}.`));
    } else if (intolerance === 'known' && (contains === 'unknown' || contacto === 'unknown' || contacto === 'known')) {
      relevant.push(reason('INTOLERANCE_UNKNOWN', key, `No podemos confirmar que este plato sea compatible con tu restricción de ${key}.`));
    }
  }

  const allReasons = reasons.concat(relevant);
  return {
    status: reasons.length ? 'excluded' : relevant.length ? 'warning' : 'eligible',
    reasons: allReasons
  };
}
