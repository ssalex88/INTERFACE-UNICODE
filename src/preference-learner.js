/**
 * NUTRIA · Aprendizaje de Preferencias (Machine Learning en Dispositivo)
 * -----------------------------------------------------------------------------
 * Modelo de aprendizaje continuo (online preference weighting) que aprende de:
 *  1. Frases en lenguaje natural donde el estudiante cuenta qué comió
 *     ("hoy al final terminé almorzando hamburguesa de bembos", "comí chifa en chinawok")
 *  2. Retroalimentación explícita sobre las recomendaciones ("La seguí" / "No me sirve")
 *
 * PRIVACIDAD Y REGLAS DE NUTRIA:
 *  - 100% local en localStorage bajo 'nutria.v1.learned_preferences'.
 *  - Cero telemetría hacia servidores externos.
 *  - Explicable: cuando da un bono de afinidad, explica la razón exacta.
 */

const CLAVE_PREFERENCIAS = 'nutria.v1.learned_preferences';

const ESTABLECIMIENTOS_PATRONES = [
  { id: 'REST-0001', nombre: 'Starbucks', regex: /\b(starbucks|cafe starbucks)\b/i },
  { id: 'REST-0002', nombre: 'Bembos', regex: /\b(bembos|bembroster)\b/i },
  { id: 'REST-0003', nombre: 'Chinawok', regex: /\b(chinawok|china wok)\b/i },
  { id: 'REST-0004', nombre: 'Mr. Sushi', regex: /\b(mr\.?\s*sushi)\b/i },
  { id: 'REST-0005', nombre: 'Sushi Pop', regex: /\b(sushi\s*pop)\b/i },
  { id: 'REST-0006', nombre: 'TGI Fridays', regex: /\b(fridays|tgi)\b/i },
  { id: 'REST-0007', nombre: 'Tanta', regex: /\b(tanta)\b/i },
  { id: 'REST-0008', nombre: 'Papachos', regex: /\b(papachos)\b/i },
  { id: 'REST-0009', nombre: 'Rustica', regex: /\b(rustica|rústica)\b/i },
  { id: 'REST-0010', nombre: 'KFC', regex: /\b(kfc|kentucky)\b/i },
  { id: 'REST-0011', nombre: 'La Bendita Burger', regex: /\b(la bendita|bendita burger)\b/i },
  { id: 'REST-0012', nombre: 'Lifegreen', regex: /\b(lifegreen|life green)\b/i },
  { id: 'REST-0013', nombre: 'Picadeli', regex: /\b(picadeli|pica deli)\b/i },
  { id: 'REST-0014', nombre: 'Freshit', regex: /\b(freshit|fresh it)\b/i },
  { id: 'REST-0015', nombre: 'Alessar F2', regex: /\b(alessar|pabellon f2|comedor f2|comedor alessar)\b/i },
  { id: 'REST-0016', nombre: 'Marianne 02', regex: /\b(marianne|comedor marianne)\b/i },
  { id: 'REST-0017', nombre: 'Cayetana', regex: /\b(cayetana)\b/i },
  { id: 'REST-0018', nombre: 'Jacinta y Cornelia', regex: /\b(jacinta|cornelia|jacinta y cornelia)\b/i },
  { id: 'REST-0019', nombre: 'Refugio Gastronómico', regex: /\b(refugio|refugio gastronomico)\b/i },
  { id: 'REST-0020', nombre: 'Full Sanguchón', regex: /\b(full sanguchon|sanguchon)\b/i }
];

const CATEGORIAS_PATRONES = [
  { cat: 'hamburguesa', regex: /\b(hamburguesa|burger|smash|cheese|royal)\b/i },
  { cat: 'chifa', regex: /\b(chifa|chaufa|aeropuerto|ti pa kay|chi jau kay|wantan|wantanes)\b/i },
  { cat: 'pollo', regex: /\b(pollo|broaster|pechuga|milanesa|alitas|nuggets)\b/i },
  { cat: 'menu_completo', regex: /\b(menu|menú|menu universitario|menu del dia|menu economico|menu ejecutivo)\b/i },
  { cat: 'sushi', regex: /\b(sushi|maki|makis|poke|poké)\b/i },
  { cat: 'sandwich', regex: /\b(sandwich|sándwich|panini|butifarra|croissant|wrap|empanada)\b/i },
  { cat: 'ensalada', regex: /\b(ensalada|salad|bowl saludable|vegetariano)\b/i },
  { cat: 'sopa', regex: /\b(caldo|sopa|menestron|crema|consome)\b/i },
  { cat: 'desayuno', regex: /\b(desayuno|jugo|avena|cafe|café)\b/i }
];

function leerPreferencias() {
  if (typeof localStorage === 'undefined') {
    return { establecimientos: {}, categorias: {}, historial: [] };
  }
  try {
    const raw = localStorage.getItem(CLAVE_PREFERENCIAS);
    if (!raw) return { establecimientos: {}, categorias: {}, historial: [] };
    const datos = JSON.parse(raw);
    return {
      establecimientos: datos.establecimientos || {},
      categorias: datos.categorias || {},
      historial: Array.isArray(datos.historial) ? datos.historial : []
    };
  } catch (e) {
    return { establecimientos: {}, categorias: {}, historial: [] };
  }
}

function guardarPreferencias(prefs) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(prefs));
  } catch (e) {
    // Silencioso ante cuotas de almacenamiento
  }
}

/**
 * Analiza si una frase indica una comida efectivamente realizada y actualiza el modelo.
 * Ejemplo: "hoy al final termine almorzando hamburguesa de bembos"
 *
 * @param {string} texto Frase escrita por el estudiante
 * @returns {object|null} Detalles de lo aprendido o null
 */
export function aprenderDeFrase(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const t = texto.toLowerCase();

  // Patrones que denotan consumo realizado
  const indicaConsumo = /(?:termine|terminé|termine|al final|fui a|comi|comí|almorce|almorcé|cene|cené|desayune|desayuné|pedi|pedí|me compre|me compré)\s+(?:almorzando|cenando|comiendo|un|una|en)?/i.test(t);
  if (!indicaConsumo) return null;

  let estDetectado = null;
  for (const item of ESTABLECIMIENTOS_PATRONES) {
    if (item.regex.test(t)) {
      estDetectado = item;
      break;
    }
  }

  let catDetectada = null;
  for (const item of CATEGORIAS_PATRONES) {
    if (item.regex.test(t)) {
      catDetectada = item.cat;
      break;
    }
  }

  if (!estDetectado && !catDetectada) return null;

  const prefs = leerPreferencias();
  if (estDetectado) {
    const act = prefs.establecimientos[estDetectado.id] || 0;
    prefs.establecimientos[estDetectado.id] = Math.min(5.0, Math.round((act + 1.2) * 10) / 10);
  }
  if (catDetectada) {
    const act = prefs.categorias[catDetectada] || 0;
    prefs.categorias[catDetectada] = Math.min(5.0, Math.round((act + 1.0) * 10) / 10);
  }

  prefs.historial.unshift({
    fecha: new Date().toISOString(),
    establecimientoId: estDetectado ? estDetectado.id : null,
    establecimientoNombre: estDetectado ? estDetectado.nombre : null,
    categoria: catDetectada,
    origen: 'frase_estudiante',
    texto
  });
  if (prefs.historial.length > 50) prefs.historial.pop();

  guardarPreferencias(prefs);

  return {
    establecimiento: estDetectado ? estDetectado.nombre : null,
    categoria: catDetectada
  };
}

/**
 * Registra feedback explícito de los botones "La seguí" o "No me sirve".
 */
export function registrarFeedbackOpcion(opcion, tipo = 'segui') {
  if (!opcion) return;
  const prefs = leerPreferencias();
  const deltaEst = tipo === 'segui' ? 1.5 : -1.0;
  const deltaCat = tipo === 'segui' ? 1.0 : -0.6;

  const estId = opcion.establecimiento_id;
  if (estId) {
    const act = prefs.establecimientos[estId] || 0;
    prefs.establecimientos[estId] = Math.max(-3.0, Math.min(5.0, Math.round((act + deltaEst) * 10) / 10));
  }

  const cat = opcion.categoria;
  if (cat) {
    const act = prefs.categorias[cat] || 0;
    prefs.categorias[cat] = Math.max(-3.0, Math.min(5.0, Math.round((act + deltaCat) * 10) / 10));
  }

  prefs.historial.unshift({
    fecha: new Date().toISOString(),
    opcionId: opcion.id,
    plato: opcion.plato,
    establecimientoId: estId,
    establecimientoNombre: opcion.establecimiento,
    categoria: cat,
    origen: tipo === 'segui' ? 'feedback_positivo' : 'feedback_negativo'
  });
  if (prefs.historial.length > 50) prefs.historial.pop();

  guardarPreferencias(prefs);
}

/**
 * Calcula el bono de afinidad aprendido para una opción dada.
 *
 * @param {object} opcion Plato candidato del recomendador
 * @param {object|null} prefs Preferencias (opcional, para inyección en tests)
 * @returns {{ bonus: number, razon: string|null }}
 */
export function calcularAfinidadAprendida(opcion, prefs = null) {
  const p = prefs || leerPreferencias();
  let afinidad = 0;
  let razon = null;

  const estId = opcion.establecimiento_id;
  const pesoEst = estId && p.establecimientos ? (p.establecimientos[estId] || 0) : 0;

  const cat = opcion.categoria;
  const pesoCat = cat && p.categorias ? (p.categorias[cat] || 0) : 0;

  // Combinación ponderada
  afinidad = pesoEst * 0.4 + pesoCat * 0.3;

  if (pesoEst >= 1.2) {
    razon = `Afinidad con tus elecciones recientes (te suele gustar ${opcion.establecimiento}).`;
  } else if (pesoCat >= 1.2) {
    const nombreCat = cat.replace('_', ' ');
    razon = `Afinidad con tus elecciones recientes (sueles elegir opciones de tipo ${nombreCat}).`;
  }

  return {
    bonus: Math.round(afinidad * 100) / 100,
    razon: afinidad >= 0.4 ? razon : null
  };
}

export { leerPreferencias as getLearnedPreferences };
