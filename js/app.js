/**
 * NUTRIA · Orquestador
 * -----------------------------------------------------------------------------
 * Une las piezas: analizador → almacén local → motor de patrones → metas →
 * recomendación → informes → UI. Sin framework y sin build: un módulo ES que el
 * navegador carga directo.
 *
 * Flujo de una frase:
 *   texto → analizarTexto() → guardarRegistro() → analizarPatrones() →
 *   proponerMeta() / evaluarMeta() → recomendar() → render()
 *
 * La app tiene dos modos de pintado: sin sesión muestra solo el acceso (sin
 * dock, sin cabecera, sin mascota), y con sesión muestra la app completa.
 */

import { analizarTexto } from './parser/analizador.js';
import {
  listarRegistros, guardarRegistro, borrarRegistro, leerPerfil, guardarPerfil, exportarTodo,
  importarTodo, borrarTodo, estadisticasAlmacen, registrarReaccion,
  guardarMeta, metaDeSemana, listarMetas,
  leerSesion, abrirSesion, cerrarSesion, nombreDesdeUsuario,
  leerConsentimiento, guardarConsentimiento, listarEnvios, registrarEnvio
} from './datos/almacen.js';
import { cargarMenus } from './datos/menus.js';
import { sembrarDemo } from './datos/demo.js';
import { analizarPatrones, consolidarPorDia } from './motor/patrones.js';
import { ritmoDeHoy } from './motor/ritmo.js';
import { proponerMeta, evaluarMeta, claveSemana } from './motor/metas.js';
import { recomendar } from './motor/recomendador.js';
import { calcularInsignias, nivelDeConstancia } from './motor/insignias.js';
import { informeEstudiante, reporteInstitucional } from './motor/reporte.js';
import { estadoDeMascota, renderNutriFlotante } from './ui/mascota.js';
import { render, fraseParaEstado, ORDEN_VISTAS, TAB_DE_VISTA } from './ui/vistas.js';
import { vistaLogin } from './ui/sesion.js';
import { activarMovimiento, sincronizarIndicador, animarEntrada, pulsoHaptico } from './ui/movimiento.js';
import { estadoCapa2, cargarModelo, completarConModelo, fusionar } from './capa2/modelo.js';
import { getDietaryProfile, saveDietaryProfile, resetDietaryProfile } from '../src/storage.js';
import { ESTADO_UNKNOWN } from '../src/dietary-catalog.js';
import { diaLocal } from './datos/almacen.js';
import { aprenderDeFrase, registrarFeedbackOpcion } from '../src/preference-learner.js';
import { hayGeminiConfigurado, analizarConLLM, fusionarConLLM, guardarGeminiApiKey } from '../src/llm-analizador.js';

const estado = {
  vista: 'hoy',
  sesion: leerSesion(),
  errorAcceso: '',
  perfil: leerPerfil(),
  dietaryProfile: getDietaryProfile(),
  consentimiento: leerConsentimiento(),
  dataset: null,
  registros: [],
  patrones: null,
  ritmo: null,
  historialBusqueda: '',
  historialFiltro: 'todo',
  ultimoRegistroId: null,
  meta: null,
  progresoMeta: null,
  recomendacion: null,
  ultimoAnalisis: null,
  borrador: '',
  presupuestoManual: null,
  estadisticas: estadisticasAlmacen(),
  estadoMascota: { estado: 'neutral', datos: {}, frase: '' },
  insignias: [],
  nivel: null,
  informe: null,
  reporteInstitucional: null,
  envios: [],
  nutriAbierto: false,
  nutriGlobo: false,
  capa2: estadoCapa2()
};

const $ = (sel) => document.querySelector(sel);
const contenedor = () => $('#vista');
const nutriNodo = () => $('#nutri');

let temporizadorGlobo = null;

// --- Recalcular todo el estado derivado -------------------------------------
function recalcular({ conservarFraseMascota = false } = {}) {
  estado.registros = listarRegistros();
  estado.patrones = analizarPatrones(estado.registros);
  estado.ritmo = ritmoDeHoy(estado.registros);
  estado.estadisticas = estadisticasAlmacen();
  estado.consentimiento = leerConsentimiento();
  estado.envios = listarEnvios();

  const semana = claveSemana(new Date());
  let meta = metaDeSemana(semana);
  const propuesta = proponerMeta(estado.patrones);
  // Si la contra-métrica se activa a mitad de semana, la meta se reemplaza.
  if (!meta || (propuesta.tipo === 'acompanamiento' && meta.tipo !== 'acompanamiento')) {
    meta = guardarMeta(propuesta);
  }
  estado.meta = meta;
  estado.progresoMeta = evaluarMeta(meta, estado.registros);

  estado.dietaryProfile = getDietaryProfile();

  const hoyStr = diaLocal(new Date());
  const registrosHoy = estado.registros.filter((r) => r.dia === hoyStr);
  const diaConsolidado = registrosHoy.length ? consolidarPorDia(registrosHoy)[0] : null;

  if (!estado.ultimoAnalisis && registrosHoy.length) {
    estado.ultimoAnalisis = registrosHoy[0].analisis;
  }

  let analisisParaRecomendar = estado.ultimoAnalisis;
  if (diaConsolidado) {
    analisisParaRecomendar = {
      ...(estado.ultimoAnalisis || {}),
      presupuesto: (estado.ultimoAnalisis?.presupuesto?.monto !== null && estado.ultimoAnalisis?.presupuesto?.monto !== undefined)
        ? estado.ultimoAnalisis.presupuesto
        : (diaConsolidado.presupuesto !== null ? { monto: diaConsolidado.presupuesto, moneda: 'PEN', evidencia: { texto: `S/${diaConsolidado.presupuesto}` }, regla: 'consolidado_hoy' } : null),
      sueno: (estado.ultimoAnalisis?.sueno?.horas !== null && estado.ultimoAnalisis?.sueno?.horas !== undefined)
        ? estado.ultimoAnalisis.sueno
        : (diaConsolidado.sueno !== null ? { horas: diaConsolidado.sueno, calidad: diaConsolidado.sueno < 6 ? 'mala' : 'buena', evidencia: { texto: `${diaConsolidado.sueno}h` }, regla: 'consolidado_hoy' } : { horas: null }),
      comidas: {
        ...(diaConsolidado.comidas || {}),
        ...(estado.ultimoAnalisis?.comidas || {})
      }
    };
  }

  if (estado.presupuestoManual !== null) {
    analisisParaRecomendar = {
      ...(analisisParaRecomendar || {}),
      presupuesto: { monto: estado.presupuestoManual, evidencia: null, manual: true }
    };
  }

  estado.recomendacion = recomendar({
    datasetMenus: estado.dataset,
    analisis: analisisParaRecomendar,
    patrones: estado.patrones,
    perfil: estado.perfil,
    perfilDietario: estado.dietaryProfile
  });

  estado.insignias = calcularInsignias(estado.patrones);
  estado.nivel = nivelDeConstancia(estado.patrones);
  estado.informe = informeEstudiante(estado.patrones, { metas: listarMetas(), perfil: estado.perfil });
  estado.reporteInstitucional = reporteInstitucional(estado.patrones, {
    consentimiento: estado.consentimiento,
    sesion: estado.sesion,
    perfil: estado.perfil
  });

  const nuevo = estadoDeMascota({ patrones: estado.patrones, progresoMeta: estado.progresoMeta });
  if (!conservarFraseMascota || nuevo.estado !== estado.estadoMascota.estado) {
    estado.estadoMascota = { ...nuevo, frase: fraseParaEstado(nuevo) };
  }
  estado.capa2 = estadoCapa2();
}

// --- Pintado -----------------------------------------------------------------
function pintarNutri() {
  const nodo = nutriNodo();
  if (!nodo) return;
  nodo.innerHTML = estado.sesion ? renderNutriFlotante(estado) : '';
}

/**
 * Pinta la vista actual. `direccion` (+1 / -1) es de dónde viene el contenido:
 * al avanzar en el orden de pestañas entra por la derecha y al retroceder por la
 * izquierda, que es lo que el usuario espera espacialmente.
 */
function pintar({ direccion = 0, mantenerScroll = false } = {}) {
  const scroll = window.scrollY;

  if (!estado.sesion) {
    document.body.classList.add('sin-sesion');
    contenedor().innerHTML = vistaLogin({ error: estado.errorAcceso });
    pintarNutri();
    animarEntrada(contenedor(), 0);
    requestAnimationFrame(() => $('#acceso-usuario')?.focus());
    return;
  }

  document.body.classList.remove('sin-sesion');
  contenedor().innerHTML = render(estado);

  const activa = TAB_DE_VISTA[estado.vista] || estado.vista;
  document.querySelectorAll('.tabs__boton').forEach((b) => {
    b.classList.toggle('tabs__boton--activo', b.dataset.vista === activa);
    b.setAttribute('aria-current', b.dataset.vista === activa ? 'page' : 'false');
  });
  sincronizarIndicador();
  pintarNutri();

  if (mantenerScroll) window.scrollTo({ top: scroll, behavior: 'auto' });
  else animarEntrada(contenedor(), direccion);
}

function avisar(texto, tipo = 'ok') {
  const nodo = $('#aviso-flotante');
  nodo.textContent = texto;
  nodo.className = `aviso-flotante aviso-flotante--${tipo} aviso-flotante--visible`;
  clearTimeout(avisar._t);
  avisar._t = setTimeout(() => { nodo.className = 'aviso-flotante'; }, 3200);
}

/** Nutri dice algo y se calla sola: el globo no se queda pegado en pantalla. */
function hablarNutri(ms = 4200) {
  estado.nutriGlobo = true;
  pintarNutri();
  clearTimeout(temporizadorGlobo);
  temporizadorGlobo = setTimeout(() => {
    estado.nutriGlobo = false;
    pintarNutri();
  }, ms);
}

function irA(vista) {
  if (vista === estado.vista) return;
  const desde = ORDEN_VISTAS.indexOf(TAB_DE_VISTA[estado.vista] || estado.vista);
  const hacia = ORDEN_VISTAS.indexOf(TAB_DE_VISTA[vista] || vista);
  estado.vista = vista;
  estado.nutriAbierto = false;
  pintar({ direccion: hacia >= desde ? 1 : -1 });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

// --- Acceso ------------------------------------------------------------------
/**
 * En esta fase no hay validación: cualquier usuario entra. Lo único que se
 * guarda es el nombre para saludar y firmar el informe; la contraseña se
 * descarta apenas se envía el formulario.
 */
function entrar(usuario, clave) {
  if (!String(usuario || '').trim() || !String(clave || '').trim()) {
    estado.errorAcceso = 'Completa tu usuario y tu contraseña para entrar.';
    pintar();
    return;
  }
  estado.errorAcceso = '';
  const nombre = nombreDesdeUsuario(usuario);
  estado.sesion = abrirSesion({ usuario, nombre });
  // Un código de alumno no es un nombre: en ese caso no rellenamos el perfil y
  // el estudiante lo pone en Preferencias si quiere que lo llamemos por él.
  if (!estado.perfil.nombre && nombre !== 'Estudiante') {
    estado.perfil = guardarPerfil({ nombre });
  }
  estado.vista = 'hoy';
  recalcular();
  pintar();
  hablarNutri(5200);
  const saludable = (estado.perfil.nombre || '').split(' ')[0];
  avisar(saludable ? `Hola, ${saludable}.` : 'Hola. Cuéntame cómo te fue hoy.');
}

function salir() {
  cerrarSesion();
  estado.sesion = null;
  estado.vista = 'hoy';
  estado.ultimoAnalisis = null;
  estado.nutriAbierto = false;
  pintar();
}

// --- Acción principal: registrar una frase ----------------------------------
async function registrarFrase(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio) { avisar('Escribe una frase, aunque sea corta.', 'atencion'); return; }

  let analisis = analizarTexto(limpio);

  // Asistente LLM inteligente (Google Gemini Flash) si el usuario configuró API key
  if (hayGeminiConfigurado()) {
    try {
      const parcheLLM = await analizarConLLM(limpio);
      if (parcheLLM) {
        analisis = fusionarConLLM(analisis, parcheLLM);
      }
    } catch (e) {
      console.warn('[NUTRIA] LLM fallo, continuando con motor local', e);
    }
  }

  // Asistente opcional Capa 2 si estuviera activo
  if (estado.capa2.estado === 'listo' && analisis.camposFaltantes?.length) {
    const parche = await completarConModelo(limpio, analisis.camposFaltantes);
    if (parche) analisis = fusionar(analisis, parche);
  }

  // Machine Learning: Aprender hábitos o platos consumidos declarados en la frase
  try {
    aprenderDeFrase(limpio);
  } catch (e) {
    console.warn('[NUTRIA ML] Error al procesar aprendizaje de frase', e);
  }

  const rachaPrevia = estado.patrones ? estado.patrones.racha.dias : 0;

  const registro = guardarRegistro({ texto: limpio, analisis });
  estado.ultimoAnalisis = analisis;
  estado.ultimoRegistroId = registro.id;
  estado.borrador = '';
  estado.presupuestoManual = null;
  recalcular();
  // Se repinta la vista ACTUAL, no se salta a Hoy: si el estudiante estaba
  // mirando su historial, lo que quiere ver es su frase apareciendo ahí.
  pintar({ mantenerScroll: estado.vista === 'historial' });
  // Un solo pulso, y solo acá: el registro es EL momento con significado.
  pulsoHaptico(12);
  if (estado.patrones.racha.dias > rachaPrevia) hablarNutri();
  avisar('Registrado. Ya está en tu historial.');
}

// --- Dictado (Web Speech API, también local en el dispositivo) --------------
function dictar() {
  const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Reconocedor) { avisar('Este navegador no soporta dictado. Escríbelo nomás.', 'atencion'); return; }
  const rec = new Reconocedor();
  rec.lang = 'es-PE';
  rec.interimResults = false;
  rec.onresult = (e) => {
    const texto = e.results[0][0].transcript;
    const campo = $('#entrada');
    if (campo) { campo.value = texto; estado.borrador = texto; }
    avisar('Listo, revisa y dale a Registrar.');
  };
  rec.onerror = () => avisar('No se pudo escuchar. Escríbelo nomás.', 'atencion');
  rec.start();
  avisar('Escuchando…');
}

// --- Archivos ----------------------------------------------------------------
function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportar() {
  descargar(
    `nutria-copia-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(exportarTodo(), null, 2),
    'application/json'
  );
  avisar('Copia guardada en tu equipo.');
}

function importar(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      importarTodo(JSON.parse(lector.result));
      estado.perfil = leerPerfil();
      recalcular();
      pintar();
      avisar('Historial restaurado.');
    } catch (e) {
      avisar('No pudimos leer ese archivo.', 'peligro');
    }
  };
  lector.readAsText(archivo);
}

/** Copia legible del reporte institucional: se lee sin abrir un editor. */
function descargarReporte() {
  const r = estado.reporteInstitucional;
  if (!r) return;
  const lineas = [
    'NUTRIA · Reporte para Bienestar Universitario',
    '='.repeat(52),
    `Modo: ${r.modo === 'nominal' ? 'con nombre del estudiante' : 'anónimo (agregado)'}`,
    r.modo === 'nominal' ? `Estudiante: ${r.identificacion.nombre}` : `Cohorte: ${r.identificacion.cohorte}`,
    '',
    'INDICADORES',
    ...Object.entries(r.indicadores).map(([k, v]) => `  · ${k}: ${v}`),
    '',
    'NO SE INCLUYE',
    ...r.excluido.map((e) => `  · ${e}`),
    '',
    r.alerta ? `NOTA: ${r.alerta}` : '',
    `Generado el ${new Date(r.generado).toLocaleString('es-PE')}.`
  ].filter(Boolean);
  descargar(`nutria-reporte-${new Date().toISOString().slice(0, 10)}.txt`, lineas.join('\n'), 'text/plain');
  avisar('Copia del reporte guardada.');
}

function enviarReporte() {
  const r = estado.reporteInstitucional;
  if (!r || !r.enviable) return;
  registrarEnvio({
    tipo: r.modo === 'nominal' ? 'con tu nombre' : 'anónimo',
    periodo: r.indicadores.periodo,
    campos: Object.keys(r.indicadores)
  });
  recalcular({ conservarFraseMascota: true });
  pintar({ mantenerScroll: true });
  avisar('Informe compartido con bienestar.');
}

// --- Delegación de eventos ---------------------------------------------------
function conectarEventos() {
  document.addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-accion], .tabs__boton');
    if (!boton) return;

    if (boton.classList.contains('tabs__boton')) { irA(boton.dataset.vista); return; }

    const accion = boton.dataset.accion;
    if (accion === 'ir') { irA(boton.dataset.vista); return; }

    if (accion === 'nutri') {
      estado.nutriAbierto = !estado.nutriAbierto;
      estado.nutriGlobo = false;
      pintarNutri();
      return;
    }

    if (accion === 'nutri-cerrar') { estado.nutriAbierto = false; pintarNutri(); return; }

    if (accion === 'ejemplo') {
      const campo = $('#entrada');
      if (campo) { campo.value = boton.dataset.frase; campo.focus(); estado.borrador = boton.dataset.frase; }
      return;
    }

    // Atajo de un toque: SUMA su fragmento a la frase en curso en vez de
    // registrar solo. Con tres toques se arma "dormí poco, no almorcé, me
    // quedan 10 soles" y se guarda una vez; registrar por toque llenaría el
    // historial de fragmentos sueltos y haría irreversible cualquier error.
    if (accion === 'agregar-senal') {
      const campo = $('#entrada');
      if (!campo) return;
      const fragmento = boton.dataset.fragmento || '';
      const previo = campo.value.trim();
      if (previo.toLowerCase().includes(fragmento.toLowerCase())) {
        avisar('Eso ya está en tu frase.', 'atencion');
        return;
      }
      campo.value = previo ? `${previo.replace(/[.,\s]+$/, '')}, ${fragmento}` : fragmento;
      estado.borrador = campo.value;
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length);
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (accion === 'filtro-historial') {
      estado.historialFiltro = boton.dataset.filtro || 'todo';
      pintar({ mantenerScroll: true });
      return;
    }

    if (accion === 'borrar-registro') {
      if (!confirm('Se borra este registro de tu historial. ¿Seguro?')) return;
      borrarRegistro(boton.dataset.id);
      if (estado.ultimoRegistroId === boton.dataset.id) estado.ultimoRegistroId = null;
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar('Registro borrado.');
      return;
    }

    if (accion === 'dictar') { dictar(); return; }

    if (accion === 'reaccion') {
      registrarReaccion(boton.dataset.id, boton.dataset.valor);
      const opcion = estado.dataset?.opciones?.find((x) => x.id === boton.dataset.id);
      if (opcion) {
        registrarFeedbackOpcion(opcion, boton.dataset.valor === 'segui' ? 'segui' : 'no-sirve');
        recalcular({ conservarFraseMascota: true });
        pintar({ mantenerScroll: true });
      }
      avisar(boton.dataset.valor === 'segui' ? '¡Anotado! Nos ayuda a afinar lo que te recomendamos.' : 'Anotado, la bajamos en tu lista.');
      return;
    }

    if (accion === 'borrar-gemini-key') {
      guardarGeminiApiKey('');
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar('Clave de Gemini eliminada. Se continuará usando el analizador local.');
      return;
    }

    if (accion === 'sembrar') {
      const n = sembrarDemo();
      estado.ultimoAnalisis = null;
      recalcular();
      pintar();
      avisar(`Listo, cargamos ${n} días de ejemplo.`);
      return;
    }

    if (accion === 'exportar') { exportar(); return; }
    if (accion === 'importar') { $('#archivo-importar').click(); return; }
    if (accion === 'imprimir') { window.print(); return; }
    if (accion === 'descargar-reporte') { descargarReporte(); return; }
    if (accion === 'enviar-reporte') { enviarReporte(); return; }
    if (accion === 'salir') { salir(); return; }

    if (accion === 'borrar') {
      if (!confirm('Se borra todo tu historial de este dispositivo. ¿Seguro?')) return;
      borrarTodo();
      // La sesión sobrevive al borrado, así que el nombre también: quedarse
      // dentro de la app y que de pronto deje de saludarte se siente a error.
      const nombreSesion = estado.sesion && estado.sesion.nombre;
      estado.perfil = nombreSesion && nombreSesion !== 'Estudiante'
        ? guardarPerfil({ nombre: nombreSesion })
        : leerPerfil();
      estado.ultimoAnalisis = null;
      estado.presupuestoManual = null;
      recalcular();
      pintar();
      avisar('Listo, no quedó nada guardado.');
      return;
    }

    if (accion === 'declarar-ninguna') {
      const campo = boton.dataset.campo;
      const perfil = getDietaryProfile();
      perfil[campo] = [];
      saveDietaryProfile(perfil);
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar('Marcado como ninguna declarada.');
      return;
    }

    if (accion === 'limpiar-campo') {
      const campo = boton.dataset.campo;
      const perfil = getDietaryProfile();
      perfil[campo] = ESTADO_UNKNOWN;
      saveDietaryProfile(perfil);
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar('Categoría restablecida a sin responder.');
      return;
    }

    if (boton.id === 'btn-restablecer-perfil-alimentario' || accion === 'restablecer-perfil-alimentario') {
      if (!confirm('¿Restablecer tu perfil alimentario a sin responder? (Tu historial diario NO se borrará)')) return;
      resetDietaryProfile();
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar('Perfil alimentario restablecido. Historial conservado.');
      return;
    }

    if (accion === 'capa2-cargar') {
      avisar('Descargando. Puedes seguir usando la app mientras tanto.');
      await cargarModelo(() => { estado.capa2 = estadoCapa2(); if (estado.vista === 'perfil') pintar({ mantenerScroll: true }); });
      estado.capa2 = estadoCapa2();
      pintar({ mantenerScroll: true });
      avisar(
        estado.capa2.estado === 'listo' ? 'Listo, ya está activo.' : 'No se pudo activar. NUTRIA funciona igual.',
        estado.capa2.estado === 'listo' ? 'ok' : 'atencion'
      );
      return;
    }
  });

  document.addEventListener('submit', (evento) => {
    if (evento.target.id === 'form-acceso') {
      evento.preventDefault();
      const datos = new FormData(evento.target);
      entrar(datos.get('usuario'), datos.get('clave'));
      return;
    }
    if (evento.target.id === 'form-registro') {
      evento.preventDefault();
      registrarFrase($('#entrada').value);
      return;
    }
    if (evento.target.id === 'form-presupuesto') {
      evento.preventDefault();
      const valor = parseFloat($('#presupuesto').value);
      estado.presupuestoManual = Number.isFinite(valor) ? valor : null;
      recalcular({ conservarFraseMascota: true });
      pintar();
      avisar('Recalculado con ese presupuesto.');
      return;
    }
    if (evento.target.id === 'form-perfil') {
      evento.preventDefault();
      const datos = new FormData(evento.target);
      estado.perfil = guardarPerfil({
        nombre: String(datos.get('nombre') || '').trim(),
        facultad: String(datos.get('facultad') || '').trim(),
        presupuestoTipico: parseFloat(datos.get('presupuestoTipico')) || 12,
        minutosDisponibles: parseInt(datos.get('minutosDisponibles'), 10) || 25,
        vegetariano: datos.get('vegetariano') === 'on'
      });
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar('Preferencias guardadas.');
      return;
    }
    if (evento.target.id === 'form-dietary-profile') {
      evento.preventDefault();
      const form = evento.target;
      const perfil = getDietaryProfile();
      const campos = ['alergias_conocidas', 'intolerancias_conocidas', 'alimentos_evitados', 'preferencias_alimentarias', 'restricciones_profesionales'];
      for (const c of campos) {
        const checks = Array.from(form.querySelectorAll(`input[name="${c}"]:checked`)).map((i) => i.value);
        if (checks.length > 0) {
          perfil[c] = checks;
        } else {
          if (Array.isArray(perfil[c]) && perfil[c].length > 0) {
            perfil[c] = [];
          }
        }
      }
      saveDietaryProfile(perfil);
      if (Array.isArray(perfil.preferencias_alimentarias)) {
        const esVeg = perfil.preferencias_alimentarias.includes('vegetariano');
        guardarPerfil({ vegetariano: esVeg });
        estado.perfil = leerPerfil();
      }
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar('Perfil alimentario guardado y recomendaciones actualizadas.');
      return;
    }
    if (evento.target.id === 'form-gemini-key') {
      evento.preventDefault();
      const datos = new FormData(evento.target);
      const clave = String(datos.get('geminiKey') || datos.get('gemini_key') || '').trim();
      guardarGeminiApiKey(clave);
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar(clave ? 'Asistente Gemini activado.' : 'Clave de Gemini eliminada.');
      return;
    }
  });

  document.addEventListener('input', (evento) => {
    if (evento.target.id === 'entrada') { estado.borrador = evento.target.value; return; }
    // El buscador del historial filtra mientras se escribe. Se repinta solo el
    // contenido conservando el scroll y se devuelve el foco al campo con el
    // cursor donde estaba: sin eso, escribir la segunda letra sería imposible.
    if (evento.target.id === 'historial-buscar') {
      estado.historialBusqueda = evento.target.value;
      const cursor = evento.target.selectionStart;
      pintar({ mantenerScroll: true });
      const campo = $('#historial-buscar');
      if (campo) { campo.focus(); campo.setSelectionRange(cursor, cursor); }
    }
  });

  document.addEventListener('change', (evento) => {
    if (evento.target.id === 'archivo-importar' && evento.target.files[0]) {
      importar(evento.target.files[0]);
      evento.target.value = '';
      return;
    }
    // Consentimientos de lo que ve la universidad: se guardan al instante, sin
    // botón de "aceptar", porque apagarlos tiene que ser tan fácil como encenderlos.
    const permiso = evento.target.dataset && evento.target.dataset.consentimiento;
    if (permiso) {
      estado.consentimiento = guardarConsentimiento({ [permiso]: evento.target.checked });
      recalcular({ conservarFraseMascota: true });
      pintar({ mantenerScroll: true });
      avisar(evento.target.checked ? 'Activado. Puedes apagarlo cuando quieras.' : 'Desactivado.');
    }
  });

  // Ctrl/Cmd + Enter envía el registro desde el textarea.
  document.addEventListener('keydown', (evento) => {
    if (evento.target.id === 'entrada' && (evento.metaKey || evento.ctrlKey) && evento.key === 'Enter') {
      evento.preventDefault();
      registrarFrase(evento.target.value);
      return;
    }
    if (evento.key === 'Escape' && estado.nutriAbierto) {
      estado.nutriAbierto = false;
      pintarNutri();
    }
  });

  // Tocar fuera cierra el panel de Nutri.
  document.addEventListener('pointerdown', (evento) => {
    if (!estado.nutriAbierto) return;
    if (evento.target.closest('.nutri')) return;
    estado.nutriAbierto = false;
    pintarNutri();
  });
}

// --- El día corriendo --------------------------------------------------------
/**
 * La consola de inicio muestra la hora y el momento del día. Dos cosas distintas:
 *
 *  · el reloj se actualiza solo, tocando UN nodo de texto. Repintar la vista
 *    entera cada medio minuto tiraría abajo el foco del textarea a media frase.
 *  · el cambio de momento (mañana → mediodía) sí cambia el contenido —los
 *    atajos, lo que se pide, la barra— y ahí sí hay que repintar, pero solo
 *    cuando de verdad cambió y nunca con el compositor en uso.
 */
function activarRelojDelDia() {
  setInterval(() => {
    if (!estado.sesion || document.hidden) return;

    const nodo = document.querySelector('[data-reloj]');
    if (nodo) nodo.textContent = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

    const momentoPintado = estado.ritmo && estado.ritmo.momento.id;
    recalcular({ conservarFraseMascota: true });
    const escribiendo = document.activeElement && document.activeElement.id === 'entrada';
    if (estado.vista === 'hoy' && !escribiendo && estado.ritmo.momento.id !== momentoPintado) {
      pintar({ mantenerScroll: true });
    }
  }, 30000);
}

/**
 * Dos pestañas de NUTRIA abiertas son el mismo historial. `storage` avisa a las
 * OTRAS pestañas cuando una escribe, así el historial de la de al lado no se
 * queda mostrando algo que ya no es cierto.
 */
function activarSincronizacionEntrePestanas() {
  window.addEventListener('storage', (evento) => {
    if (!evento.key || !evento.key.startsWith('nutria.v1.')) return;
    if (!estado.sesion) return;
    recalcular({ conservarFraseMascota: true });
    if (document.activeElement && document.activeElement.id === 'entrada') return;
    pintar({ mantenerScroll: true });
  });
}

// --- Arranque ----------------------------------------------------------------
async function iniciar() {
  estado.dataset = await cargarMenus();
  recalcular();
  conectarEventos();
  activarMovimiento();
  activarRelojDelDia();
  activarSincronizacionEntrePestanas();
  pintar();
  if (estado.sesion) hablarNutri(5200);
}

iniciar();
