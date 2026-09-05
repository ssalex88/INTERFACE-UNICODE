/**
 * NUTRIA · Persistencia local
 * -----------------------------------------------------------------------------
 * TODO el historial vive en localStorage del navegador del estudiante. No hay
 * cuenta, no hay servidor, no hay sincronización. Es la traducción literal del
 * Bloque 4.5 de la propuesta: "el texto crudo nunca sale del dispositivo".
 *
 * Cada acceso va envuelto en try/catch: en modo incógnito o con el almacenamiento
 * bloqueado, la app debe seguir funcionando en memoria en vez de reventar.
 */

import { getDietaryProfile, saveDietaryProfile, resetDietaryProfile } from '../../src/storage.js';

const ESPACIO = 'nutria.v1';
const CLAVES = {
  registros: `${ESPACIO}.registros`,
  metas: `${ESPACIO}.metas`,
  perfil: `${ESPACIO}.perfil`,
  reacciones: `${ESPACIO}.reacciones`,
  sesion: `${ESPACIO}.sesion`,
  consentimiento: `${ESPACIO}.consentimiento`,
  envios: `${ESPACIO}.envios`
};

/** Respaldo en memoria si localStorage no está disponible. */
const memoria = new Map();
let almacenamientoOk = true;

function leerBruto(clave) {
  try {
    const v = window.localStorage.getItem(clave);
    return v;
  } catch (e) {
    almacenamientoOk = false;
    return memoria.get(clave) ?? null;
  }
}

function escribirBruto(clave, valor) {
  try {
    window.localStorage.setItem(clave, valor);
  } catch (e) {
    almacenamientoOk = false;
    memoria.set(clave, valor);
  }
}

function leerJSON(clave, porDefecto) {
  const bruto = leerBruto(clave);
  if (!bruto) return porDefecto;
  try { return JSON.parse(bruto); } catch (e) { return porDefecto; }
}

function escribirJSON(clave, valor) {
  escribirBruto(clave, JSON.stringify(valor));
}

export function almacenamientoDisponible() {
  return almacenamientoOk;
}

// --- Fechas ------------------------------------------------------------------
/** YYYY-MM-DD en hora local (no UTC: el día del estudiante es local). */
export function diaLocal(fecha = new Date()) {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

export function diferenciaEnDias(diaA, diaB) {
  const a = new Date(`${diaA}T00:00:00`);
  const b = new Date(`${diaB}T00:00:00`);
  return Math.round((a - b) / 86400000);
}

// --- Registros ---------------------------------------------------------------
export function listarRegistros() {
  const lista = leerJSON(CLAVES.registros, []);
  return Array.isArray(lista) ? lista.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) : [];
}

export function guardarRegistro({ texto, analisis, fecha = new Date(), origen = 'usuario' }) {
  const registros = leerJSON(CLAVES.registros, []);
  const registro = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date(fecha).toISOString(),
    dia: diaLocal(fecha),
    texto,
    analisis,
    origen
  };
  registros.push(registro);
  escribirJSON(CLAVES.registros, registros);
  return registro;
}

export function borrarRegistro(id) {
  const registros = leerJSON(CLAVES.registros, []).filter((r) => r.id !== id);
  escribirJSON(CLAVES.registros, registros);
}

/** Registros dentro de una ventana móvil de N días que termina hoy. */
export function registrosEnVentana(dias, hoy = new Date()) {
  const limite = diaLocal(sumarDias(hoy, -(dias - 1)));
  return listarRegistros().filter((r) => r.dia >= limite && r.dia <= diaLocal(hoy));
}

/** Registros de la ventana ANTERIOR del mismo tamaño (para comparar tendencia). */
export function registrosVentanaPrevia(dias, hoy = new Date()) {
  const finPrevio = diaLocal(sumarDias(hoy, -dias));
  const inicioPrevio = diaLocal(sumarDias(hoy, -(dias * 2 - 1)));
  return listarRegistros().filter((r) => r.dia >= inicioPrevio && r.dia <= finPrevio);
}

// --- Metas -------------------------------------------------------------------
export function listarMetas() {
  return leerJSON(CLAVES.metas, []);
}

export function guardarMeta(meta) {
  const metas = listarMetas().filter((m) => m.semana !== meta.semana);
  metas.push(meta);
  escribirJSON(CLAVES.metas, metas);
  return meta;
}

export function metaDeSemana(semana) {
  return listarMetas().find((m) => m.semana === semana) || null;
}

// --- Sesión ------------------------------------------------------------------
/**
 * La sesión es local: identifica al estudiante dentro de ESTE dispositivo para
 * personalizar el saludo, el perfil y el informe. No hay servidor de cuentas y
 * la contraseña no se guarda en ninguna parte.
 */
export function leerSesion() {
  const s = leerJSON(CLAVES.sesion, null);
  return s && s.usuario ? s : null;
}

export function abrirSesion({ usuario, nombre, facultad = '' }) {
  const sesion = {
    usuario: String(usuario || '').trim(),
    nombre: String(nombre || '').trim() || nombreDesdeUsuario(usuario),
    facultad,
    desde: leerSesion()?.desde || new Date().toISOString(),
    ultimoIngreso: new Date().toISOString()
  };
  escribirJSON(CLAVES.sesion, sesion);
  return sesion;
}

export function cerrarSesion() {
  try { window.localStorage.removeItem(CLAVES.sesion); } catch (e) { /* ignorado */ }
  memoria.delete(CLAVES.sesion);
}

/**
 * "c.flores@ulima.edu.pe" → "C Flores". Un código de alumno ("20231234") no es
 * un nombre: saludar con el código se siente peor que no saludar con nada, así
 * que en ese caso devolvemos el genérico y el estudiante pone su nombre en
 * Preferencias cuando quiera.
 */
export function nombreDesdeUsuario(usuario) {
  const base = String(usuario || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!base || /^\d+$/.test(base.replace(/\s+/g, ''))) return 'Estudiante';
  return base.split(/\s+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

export function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'E';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// --- Consentimiento institucional -------------------------------------------
/**
 * Lo que la universidad puede recibir, decidido por el estudiante y NUNCA por
 * defecto en su versión nominal. `agregado` alimenta el tablero anónimo de
 * bienestar; `nominal` es el informe con nombre que el mentor pidió, y solo
 * existe si el estudiante lo enciende a mano.
 */
const CONSENTIMIENTO_POR_DEFECTO = {
  agregado: true,      // indicadores anónimos, sin nombre ni frases
  nominal: false,      // informe con nombre para bienestar
  contacto: false,     // "quiero que bienestar me escriba"
  actualizado: null
};

export function leerConsentimiento() {
  return { ...CONSENTIMIENTO_POR_DEFECTO, ...leerJSON(CLAVES.consentimiento, {}) };
}

export function guardarConsentimiento(parcial) {
  const c = { ...leerConsentimiento(), ...parcial, actualizado: new Date().toISOString() };
  escribirJSON(CLAVES.consentimiento, c);
  return c;
}

/** Bitácora de lo que se compartió: el estudiante puede auditar qué salió y cuándo. */
export function listarEnvios() {
  const lista = leerJSON(CLAVES.envios, []);
  return Array.isArray(lista) ? lista.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) : [];
}

export function registrarEnvio({ tipo, periodo, campos }) {
  const envios = leerJSON(CLAVES.envios, []);
  const envio = {
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fecha: new Date().toISOString(),
    tipo, periodo, campos
  };
  envios.push(envio);
  escribirJSON(CLAVES.envios, envios);
  return envio;
}

// --- Perfil ------------------------------------------------------------------
const PERFIL_POR_DEFECTO = {
  nombre: '',
  campus: 'Universidad de Lima',
  facultad: '',
  ciclo: '',
  vegetariano: false,
  presupuestoTipico: 12,
  minutosDisponibles: 25,
  capa2Habilitada: false
};

export function leerPerfil() {
  return { ...PERFIL_POR_DEFECTO, ...leerJSON(CLAVES.perfil, {}) };
}

export function guardarPerfil(parcial) {
  const perfil = { ...leerPerfil(), ...parcial };
  escribirJSON(CLAVES.perfil, perfil);
  return perfil;
}

// --- Reacciones a recomendaciones (métrica secundaria: "sí la seguí") --------
export function registrarReaccion(idOpcion, valor) {
  const reacciones = leerJSON(CLAVES.reacciones, {});
  reacciones[idOpcion] = { valor, fecha: new Date().toISOString() };
  escribirJSON(CLAVES.reacciones, reacciones);
  return reacciones;
}

export function listarReacciones() {
  return leerJSON(CLAVES.reacciones, {});
}

// --- Portabilidad y borrado (control del estudiante sobre su dato) -----------
export function exportarTodo() {
  return {
    exportado: new Date().toISOString(),
    version: ESPACIO,
    registros: listarRegistros(),
    metas: listarMetas(),
    perfil: leerPerfil(),
    perfilDietario: getDietaryProfile(),
    reacciones: listarReacciones(),
    consentimiento: leerConsentimiento(),
    envios: listarEnvios()
  };
}

export function importarTodo(objeto) {
  if (!objeto || typeof objeto !== 'object') throw new Error('Archivo inválido');
  if (Array.isArray(objeto.registros)) escribirJSON(CLAVES.registros, objeto.registros);
  if (Array.isArray(objeto.metas)) escribirJSON(CLAVES.metas, objeto.metas);
  if (objeto.perfil) escribirJSON(CLAVES.perfil, objeto.perfil);
  if (objeto.perfilDietario) saveDietaryProfile(objeto.perfilDietario);
  if (objeto.reacciones) escribirJSON(CLAVES.reacciones, objeto.reacciones);
  if (objeto.consentimiento) escribirJSON(CLAVES.consentimiento, objeto.consentimiento);
  if (Array.isArray(objeto.envios)) escribirJSON(CLAVES.envios, objeto.envios);
}

export { getDietaryProfile, saveDietaryProfile, resetDietaryProfile };

/** Borra el historial. La sesión se conserva salvo que se pida lo contrario. */
export function borrarTodo({ incluirSesion = false } = {}) {
  for (const [nombre, clave] of Object.entries(CLAVES)) {
    if (nombre === 'sesion' && !incluirSesion) continue;
    try { window.localStorage.removeItem(clave); } catch (e) { /* ignorado */ }
    memoria.delete(clave);
  }
}

export function estadisticasAlmacen() {
  const registros = listarRegistros();
  const bytes = new Blob([JSON.stringify(exportarTodo())]).size;
  return {
    totalRegistros: registros.length,
    primerRegistro: registros.length ? registros[registros.length - 1].dia : null,
    ultimoRegistro: registros.length ? registros[0].dia : null,
    kilobytes: Math.round((bytes / 1024) * 10) / 10,
    almacenamientoOk
  };
}
