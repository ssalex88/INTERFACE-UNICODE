/**
 * NUTRIA · Almacenamiento Local de Perfil Alimentario (HU-01)
 * -----------------------------------------------------------------------------
 * Administra el perfil alimentario del estudiante en localStorage.
 *
 * Criterios de aceptación:
 * 1. El perfil se almacena localmente (sin cuenta, sin nube).
 * 2. No almacena diagnósticos médicos: solo preferencias, alérgenos e intolerancias declaradas.
 * 3. Categorías sin responder quedan como 'unknown'.
 * 4. Una lista vacía [] no es 'unknown': representa explícitamente "ninguna".
 * 5. resetDietaryProfile() restablece el perfil alimentario a 'unknown' SIN borrar el
 *    historial diario de registros ni las metas de la semana.
 */

import {
  crearPerfilAlimentarioVacio,
  normalizarPerfilAlimentario,
  ESTADO_UNKNOWN
} from './dietary-catalog.js';

const STORAGE_KEY = 'nutria.v1.dietary_profile';
const memoryStore = new Map();

function getRaw(key) {
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(key)
      : (memoryStore.get(key) ?? null);
  } catch (e) {
    return memoryStore.get(key) ?? null;
  }
}

function setRaw(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
  } catch (e) {
    memoryStore.set(key, value);
  }
}

function removeRaw(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    /* ignorado */
  }
  memoryStore.delete(key);
}

/**
 * Obtiene el perfil alimentario almacenado o inicializa uno con categorías 'unknown'.
 * @returns {object} Perfil normalizado
 */
export function getDietaryProfile() {
  const raw = getRaw(STORAGE_KEY);
  if (!raw) return crearPerfilAlimentarioVacio();
  try {
    const parsed = JSON.parse(raw);
    return normalizarPerfilAlimentario(parsed);
  } catch (e) {
    return crearPerfilAlimentarioVacio();
  }
}

/**
 * Guarda o actualiza el perfil alimentario local.
 * Respeta la distinción entre 'unknown' y [] (ninguna).
 * @param {object} partialProfile Datos a actualizar
 * @returns {object} Perfil resultante guardado
 */
export function saveDietaryProfile(partialProfile = {}) {
  const current = getDietaryProfile();
  const merged = {
    ...current,
    ...partialProfile,
    actualizado: new Date().toISOString()
  };
  const normalized = normalizarPerfilAlimentario(merged);
  setRaw(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

/**
 * Restablece el perfil alimentario a su estado inicial (todas las categorías en 'unknown').
 * IMPORTANTE: NO borra el historial diario de registros, ni las metas, ni la sesión.
 * @returns {object} Perfil vacío recién restablecido
 */
export function resetDietaryProfile() {
  removeRaw(STORAGE_KEY);
  return crearPerfilAlimentarioVacio();
}

/**
 * Verifica si el estudiante ha configurado al menos una categoría de su perfil.
 */
export function hasConfiguredDietaryProfile() {
  const p = getDietaryProfile();
  return (
    p.alergias_conocidas !== ESTADO_UNKNOWN ||
    p.intolerancias_conocidas !== ESTADO_UNKNOWN ||
    p.alimentos_evitados !== ESTADO_UNKNOWN ||
    p.preferencias_alimentarias !== ESTADO_UNKNOWN ||
    p.restricciones_profesionales !== ESTADO_UNKNOWN
  );
}

export { ESTADO_UNKNOWN };
