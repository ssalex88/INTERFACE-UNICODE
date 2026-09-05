/**
 * NUTRIA · Asistente LLM (Google Gemini Flash - Opcional)
 * -----------------------------------------------------------------------------
 * Arquitectura híbrida Zero-Breakage:
 *  - El motor local determinístico (Capa 1) es el motor principal, instantáneo y offline.
 *  - Este módulo conecta con la API de Gemini (e.g. gemini-2.5-flash) para enriquecer
 *    la extracción en frases con alto coloquialismo o ambigüedad si el usuario
 *    configuró su API Key gratuita de Google AI Studio.
 *  - Si no hay API Key, si falla la red, o si la respuesta demora más de 3.5s,
 *    se devuelve null y el sistema continúa con el motor local sin ninguna interrupción.
 */

const CLAVE_GEMINI_KEY = 'nutria.v1.gemini_api_key';
const CLAVE_GEMINI_ACTIVO = 'nutria.v1.gemini_enabled';
const MODELO_GEMINI = 'gemini-2.5-flash';

export function obtenerGeminiApiKey() {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(CLAVE_GEMINI_KEY) || '';
}

export function guardarGeminiApiKey(key) {
  if (typeof localStorage === 'undefined') return;
  const k = String(key || '').trim();
  if (k) {
    localStorage.setItem(CLAVE_GEMINI_KEY, k);
    localStorage.setItem(CLAVE_GEMINI_ACTIVO, 'true');
  } else {
    localStorage.removeItem(CLAVE_GEMINI_KEY);
    localStorage.setItem(CLAVE_GEMINI_ACTIVO, 'false');
  }
}

export function hayGeminiConfigurado() {
  if (typeof localStorage === 'undefined') return false;
  const key = obtenerGeminiApiKey();
  const activo = localStorage.getItem(CLAVE_GEMINI_ACTIVO) !== 'false';
  return !!(key && activo);
}

export function alternarGemini(activo) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CLAVE_GEMINI_ACTIVO, activo ? 'true' : 'false');
}

/**
 * Invoca a Google Gemini con Structured Outputs para extraer hábitos y contexto.
 *
 * @param {string} texto Frase escrita por el estudiante
 * @param {string|null} apiKeyOverride Clave API opcional para pruebas
 * @returns {Promise<object|null>} Análisis estructurado o null ante cualquier fallo
 */
export async function analizarConLLM(texto, apiKeyOverride = null) {
  const apiKey = apiKeyOverride || obtenerGeminiApiKey();
  if (!apiKey || !texto) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent?key=${apiKey}`;

  const prompt = `Analiza la siguiente frase de un estudiante universitario peruano y extrae las entidades nutricionales y de contexto.
Frase del estudiante: "${texto}"

Responde ÚNICAMENTE en JSON con esta estructura exacta:
{
  "suenoHoras": number|null (horas de sueño nocturno, e.g. 3, 5.5),
  "presupuestoMonto": number|null (dinero disponible en soles, e.g. 12),
  "comidaDesayuno": "hecha"|"saltada"|null,
  "comidaAlmuerzo": "hecha"|"saltada"|null,
  "comidaCena": "hecha"|"saltada"|null,
  "animo": string|null ("bien"|"cansado"|"estresado"|"triste"|"neutral"),
  "minutosDisponibles": number|null (tiempo libre para comer, e.g. 20),
  "eventoAcademico": string|null ("parcial"|"examen"|"clase"|"entrega"|null),
  "margenMinutos": number (15 si es examen/parcial, 10 si es clase, 0 si no hay evento),
  "platoConsumido": string|null (si indica haber comido algo ya, e.g. "hamburguesa de bembos"),
  "establecimiento": string|null (e.g. "Bembos", "Chinawok", "Alessar")
}`;

  const controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = setTimeout(() => controlador && controlador.abort(), 3800);

  try {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controlador ? controlador.signal : undefined,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    clearTimeout(timeoutId);
    if (!respuesta.ok) return null;

    const json = await respuesta.json();
    const contenido = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contenido) return null;

    const datos = JSON.parse(contenido);
    return transformarRespuestaLLM(datos, texto);
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

function transformarRespuestaLLM(datos, textoOriginal) {
  if (!datos || typeof datos !== 'object') return null;

  const resultado = {
    fuente: 'llm_gemini',
    sueno: datos.suenoHoras !== null && !isNaN(datos.suenoHoras) ? {
      horas: Number(datos.suenoHoras),
      calidad: Number(datos.suenoHoras) < 6 ? 'mala' : 'buena',
      confianza: 0.96,
      regla: 'llm_gemini_extraction',
      evidencia: { texto: textoOriginal, inicio: 0, fin: textoOriginal.length }
    } : null,
    presupuesto: datos.presupuestoMonto !== null && !isNaN(datos.presupuestoMonto) ? {
      monto: Number(datos.presupuestoMonto),
      moneda: 'PEN',
      confianza: 0.95,
      regla: 'llm_gemini_extraction',
      evidencia: { texto: textoOriginal, inicio: 0, fin: textoOriginal.length }
    } : null,
    comidas: {
      desayuno: datos.comidaDesayuno || null,
      almuerzo: datos.comidaAlmuerzo || null,
      cena: datos.comidaCena || null
    },
    tiempoDisponible: datos.minutosDisponibles ? {
      disponible: true,
      rawMinutes: datos.minutosDisponibles,
      bufferMinutes: datos.margenMinutos || 0,
      availableMinutes: Math.max(5, (datos.minutosDisponibles || 0) - (datos.margenMinutos || 0)),
      minutosNetos: Math.max(5, (datos.minutosDisponibles || 0) - (datos.margenMinutos || 0)),
      deduccionBufferMin: datos.margenMinutos || 0,
      eventoAcademico: datos.eventoAcademico || null,
      confianza: 0.95
    } : null,
    animo: datos.animo ? {
      etiqueta: datos.animo,
      confianza: 0.9,
      regla: 'llm_gemini'
    } : null,
    consumoDeclarado: datos.platoConsumido ? {
      plato: datos.platoConsumido,
      establecimiento: datos.establecimiento || null
    } : null
  };

  return resultado;
}

/**
 * Fusiona los resultados del motor determinístico con los descubrimientos del LLM.
 * Da prioridad a valores del LLM para campos que el motor local no pudo extraer.
 */
export function fusionarConLLM(analisisLocal, analisisLLM) {
  if (!analisisLLM) return analisisLocal;
  const copia = { ...analisisLocal };

  if (copia.sueno?.horas === null && analisisLLM.sueno?.horas !== null) {
    copia.sueno = analisisLLM.sueno;
  }
  if (copia.presupuesto?.monto === null && analisisLLM.presupuesto?.monto !== null) {
    copia.presupuesto = analisisLLM.presupuesto;
  }
  if (analisisLLM.comidas) {
    for (const c of ['desayuno', 'almuerzo', 'cena']) {
      if (!copia.comidas[c] && analisisLLM.comidas[c]) {
        copia.comidas[c] = analisisLLM.comidas[c];
      }
    }
  }
  if ((!copia.tiempoDisponible || !copia.tiempoDisponible.disponible) && analisisLLM.tiempoDisponible) {
    copia.tiempoDisponible = analisisLLM.tiempoDisponible;
  }
  if (!copia.animo?.etiqueta && analisisLLM.animo?.etiqueta) {
    copia.animo = analisisLLM.animo;
  }

  copia.asistenteLLM = true;
  return copia;
}
