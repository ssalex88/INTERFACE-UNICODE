/**
 * NUTRIA · Capa 2 — modelo de lenguaje pequeño EN EL NAVEGADOR (opcional)
 * -----------------------------------------------------------------------------
 * Bloque 4.1 de la propuesta. Solo entra cuando la Capa 1 dejó campos vacíos.
 * Se descarga una vez y queda cacheado por el navegador (Cache API / IndexedDB).
 *
 * REGLA INQUEBRANTABLE DEL MÓDULO: este archivo puede fallar entero — sin red,
 * sin WebGPU, con el CDN caído, con el usuario cancelando la descarga — y la
 * aplicación debe seguir funcionando exactamente igual. Por eso todo está
 * envuelto en try/catch y detrás de una acción explícita del usuario.
 *
 * Nada de lo que pasa acá sale del dispositivo: el modelo corre localmente,
 * la única petición de red es la descarga del modelo desde el CDN.
 */

const URL_LIBRERIA = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';
const MODELO = 'onnx-community/Qwen2.5-0.5B-Instruct';

const estado = {
  estado: 'no_cargado',   // no_cargado | cargando | listo | error | no_soportado
  mensaje: '',
  progreso: 0,
  generador: null
};

export function soportaWebGPU() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function estadoCapa2() {
  return { ...estado, webgpu: soportaWebGPU(), modelo: MODELO };
}

/**
 * Descarga e inicializa el modelo. Devuelve true si quedó listo.
 * @param {(p:{estado:string,progreso:number,mensaje:string})=>void} alProgresar
 */
export async function cargarModelo(alProgresar = () => {}) {
  if (estado.estado === 'listo') return true;
  estado.estado = 'cargando';
  estado.mensaje = 'Descargando modelo (solo la primera vez)…';
  alProgresar(estadoCapa2());

  try {
    const { pipeline } = await import(/* @vite-ignore */ URL_LIBRERIA);
    estado.generador = await pipeline('text-generation', MODELO, {
      dtype: 'q4',
      device: soportaWebGPU() ? 'webgpu' : 'wasm',
      progress_callback: (info) => {
        if (info && info.status === 'progress' && info.total) {
          estado.progreso = Math.round((info.loaded / info.total) * 100);
          estado.mensaje = `Descargando… ${estado.progreso}%`;
          alProgresar(estadoCapa2());
        }
      }
    });
    estado.estado = 'listo';
    estado.mensaje = `Modelo listo en ${soportaWebGPU() ? 'WebGPU' : 'WASM'}. Se usará solo para frases ambiguas.`;
  } catch (error) {
    estado.estado = 'error';
    estado.generador = null;
    estado.mensaje = `No se pudo cargar el modelo (${error.message}). La Capa 1 sigue sosteniendo la app completa.`;
    console.warn('[NUTRIA][Capa 2] fallo de carga, degradación elegante activa:', error);
  }
  alProgresar(estadoCapa2());
  return estado.estado === 'listo';
}

const INSTRUCCION = `Eres un extractor de datos. Del texto de un estudiante peruano, devuelve SOLO un JSON con estas claves (usa null si no aparece):
{"horas_sueno": number|null, "almuerzo": "hecha"|"saltada"|null, "desayuno": "hecha"|"saltada"|null, "cena": "hecha"|"saltada"|null, "presupuesto_soles": number|null, "animo": string|null}
No expliques nada. Solo el JSON.`;

/**
 * Completa los campos que la Capa 1 no pudo resolver.
 * @returns {Promise<object|null>} parche con los campos completados, o null.
 */
export async function completarConModelo(texto, camposFaltantes = []) {
  if (estado.estado !== 'listo' || !estado.generador || !camposFaltantes.length) return null;
  try {
    const mensajes = [
      { role: 'system', content: INSTRUCCION },
      { role: 'user', content: texto }
    ];
    const salida = await estado.generador(mensajes, { max_new_tokens: 96, do_sample: false });
    const bruto = salida?.[0]?.generated_text;
    const contenido = Array.isArray(bruto) ? bruto[bruto.length - 1].content : String(bruto || '');
    const json = contenido.match(/\{[\s\S]*\}/);
    if (!json) return null;
    const parche = JSON.parse(json[0]);
    return { parche, capa: 2, modelo: MODELO };
  } catch (error) {
    console.warn('[NUTRIA][Capa 2] no pudo completar, se mantiene el resultado de la Capa 1:', error);
    return null;
  }
}

/**
 * Fusiona el parche de la Capa 2 sobre el análisis de la Capa 1.
 * La Capa 1 SIEMPRE gana: la Capa 2 solo rellena huecos.
 */
export function fusionar(analisis, resultadoCapa2) {
  if (!resultadoCapa2 || !resultadoCapa2.parche) return analisis;
  const p = resultadoCapa2.parche;
  const fusionado = { ...analisis, capa: 2, trazas: [...analisis.trazas] };

  if (analisis.sueno.horas === null && typeof p.horas_sueno === 'number') {
    fusionado.sueno = { ...analisis.sueno, horas: p.horas_sueno, confianza: 0.6, regla: 'capa2', estimado: true };
    fusionado.trazas.push({ campo: 'sueno', regla: 'capa2 (modelo local)', cita: `${p.horas_sueno} h` });
  }
  if (analisis.presupuesto.monto === null && typeof p.presupuesto_soles === 'number') {
    fusionado.presupuesto = { ...analisis.presupuesto, monto: p.presupuesto_soles, confianza: 0.6, regla: 'capa2' };
    fusionado.trazas.push({ campo: 'presupuesto', regla: 'capa2 (modelo local)', cita: `S/${p.presupuesto_soles}` });
  }
  const comidas = { ...analisis.comidas };
  for (const c of ['desayuno', 'almuerzo', 'cena']) {
    if (!comidas[c] && (p[c] === 'hecha' || p[c] === 'saltada')) {
      comidas[c] = p[c];
      fusionado.trazas.push({ campo: c, regla: 'capa2 (modelo local)', cita: p[c] });
    }
  }
  fusionado.comidas = comidas;
  fusionado.saltos = Object.values(comidas).filter((v) => v === 'saltada').length;
  if (!analisis.animo.etiqueta && typeof p.animo === 'string' && p.animo) {
    fusionado.animo = { ...analisis.animo, etiqueta: p.animo, valencia: -1, confianza: 0.5 };
  }
  fusionado.camposFaltantes = analisis.camposFaltantes.filter((campo) => {
    if (campo === 'sueno') return fusionado.sueno.horas === null;
    if (campo === 'presupuesto') return fusionado.presupuesto.monto === null;
    if (campo === 'comidas') return !Object.values(fusionado.comidas).some(Boolean);
    if (campo === 'animo') return !fusionado.animo.etiqueta;
    return true;
  });
  return fusionado;
}
