/**
 * NUTRIA · Runner de todas las pruebas en consola (JSC)
 */

globalThis.console = {
  log: print,
  error: print,
  warn: print
};

globalThis.window = globalThis;
globalThis.localStorage = {
  _data: new Map(),
  getItem(k) { return this._data.get(k) ?? null; },
  setItem(k, v) { this._data.set(k, String(v)); },
  removeItem(k) { this._data.delete(k); },
  clear() { this._data.clear(); }
};
globalThis.URL = class { constructor(path) { this.href = path; } };

import { analizarTexto, normalizar } from '../js/parser/analizador.js';
import { analizarPatrones, consolidarPorDia, calcularRacha } from '../js/motor/patrones.js';
import { proponerMeta, evaluarMeta, claveSemana } from '../js/motor/metas.js';
import { recomendar } from '../js/motor/recomendador.js';
import { calcularInsignias, nivelDeConstancia } from '../js/motor/insignias.js';
import { informeEstudiante, reporteInstitucional } from '../js/motor/reporte.js';
import { diaLocal, nombreDesdeUsuario, iniciales } from '../js/datos/almacen.js';
import { runDietaryProfileTests } from './dietary-profile.test.js';
import { runParserTests } from './parser.test.js';
import { aprenderDeFrase, registrarFeedbackOpcion, calcularAfinidadAprendida, getLearnedPreferences } from '../src/preference-learner.js';
import { imagenRacha, infoNivelRacha } from '../js/ui/mascota.js';

let pasadas = 0, falladas = 0;
function probar(nombre, valor, esperado) {
  const ok = JSON.stringify(valor) === JSON.stringify(esperado);
  ok ? pasadas++ : falladas++;
  if (!ok) print(`FAIL: ${nombre} -> obtenido: ${JSON.stringify(valor)} | esperado: ${JSON.stringify(esperado)}`);
  else print(`  OK: ${nombre}`);
}
function probarQue(nombre, condicion, detalle = '') {
  condicion ? pasadas++ : falladas++;
  if (!condicion) print(`FAIL: ${nombre} -> ${detalle}`);
  else print(`  OK: ${nombre}`);
}

print('=== 1. PRUEBAS DE ANALIZADOR ===');
probar('preserva longitud', normalizar('Dormí 4 horas ñ').length, 'Dormí 4 horas ñ'.length);

const a1 = analizarTexto('dormí 4 horas, no almorcé, me quedan S/12 y tengo entrega mañana');
probar('sueño 4h', a1.sueno.horas, 4);
probar('almuerzo saltado', a1.comidas.almuerzo, 'saltada');
probar('presupuesto S/12', a1.presupuesto.monto, 12);
probar('carga academica entrega', a1.cargaAcademica.tipo, 'entrega');

const aJato = analizarTexto('no he jateado');
probarQue('no he jateado detecta falta de sueño', aJato.sueno && aJato.sueno.calidad === 'mala');

const aNiDormi = analizarTexto('ni dormi');
probarQue('ni dormi detecta falta de sueño', aNiDormi.sueno && aNiDormi.sueno.calidad === 'mala');

print('\n=== 2. PRUEBAS DE HU-01, HU-02, HU-04 (PERFIL ALIMENTARIO) ===');
runDietaryProfileTests((nombre, ok) => {
  ok ? pasadas++ : falladas++;
});

print('\n=== 3. PRUEBAS DE HU-03 (TIEMPO DISPONIBLE Y BUFFER) ===');
runParserTests((nombre, ok) => {
  ok ? pasadas++ : falladas++;
});

print('\n=== 4. PRUEBAS DE RECOMENDADOR E INTEGRACIÓN ===');
const HOY = new Date('2026-09-05T13:00:00');
const DATASET = {
  _meta: { estado: 'test' },
  opciones: [
    { id: 'a', plato: 'Menú del día', establecimiento: 'A', establecimiento_id: 'REST-0015', zona: 'z', precio: 10, categoria: 'menu_completo', etiquetas: ['caliente', 'contundente'], aporte: { proteina: 'alta', verdura: 'media' }, tiempo_cola_min: 10, caminando_min: 3, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: ['gluten'] },
    { id: 'c', plato: 'Menú Administrativo', establecimiento: 'A', establecimiento_id: 'REST-0015', zona: 'z', precio: 12, categoria: 'menu_completo', etiquetas: ['caliente', 'contundente'], aporte: { proteina: 'alta', verdura: 'media' }, tiempo_cola_min: 10, caminando_min: 3, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: [] },
    { id: 'b', plato: 'Salchipapa', establecimiento: 'B', establecimiento_id: 'REST-0002', zona: 'z', precio: 7, categoria: 'snack', etiquetas: ['frito', 'rapido'], aporte: { proteina: 'baja', verdura: 'baja' }, tiempo_cola_min: 4, caminando_min: 1, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: [] },
    { id: 'd', plato: 'Pollo al horno con ensalada', establecimiento: 'D', establecimiento_id: 'REST-0016', zona: 'z', precio: 17, categoria: 'plato_fuerte', etiquetas: ['caliente'], aporte: { proteina: 'alta', verdura: 'alta' }, tiempo_cola_min: 8, caminando_min: 4, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: [] },
    { id: 'e', plato: 'Emoliente con pan', establecimiento: 'E', establecimiento_id: 'REST-0017', zona: 'z', precio: 4, categoria: 'desayuno', etiquetas: ['economico'], aporte: { proteina: 'baja', verdura: 'baja' }, tiempo_cola_min: 2, caminando_min: 1, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: true, alergenos_presentes: [] }
  ]
};
const PERFIL = { presupuestoTipico: 12, minutosDisponibles: 25, vegetariano: false };
const p = analizarPatrones([], HOY);

const r10 = recomendar({
  datasetMenus: DATASET,
  analisis: { presupuesto: { monto: 10, evidencia: null, manual: true } },
  patrones: p, perfil: PERFIL, ahora: HOY
});
probar('recomienda menú del día con S/10', r10.recomendaciones[0].opcion.id, 'a');

const r12 = recomendar({
  datasetMenus: DATASET,
  analisis: { presupuesto: { monto: 12, evidencia: null, manual: true } },
  patrones: p, perfil: PERFIL, ahora: HOY
});
probar('con S/12 recomienda Menú Administrativo de S/12 en 1er lugar', r12.recomendaciones[0].opcion.id, 'c');

// Con alergia a gluten
const rGluten = recomendar({
  datasetMenus: DATASET,
  analisis: { presupuesto: { monto: 10, evidencia: null, manual: true } },
  patrones: p, perfil: PERFIL,
  perfilDietario: { alergias_conocidas: ['gluten'], intolerancias_conocidas: [], alimentos_evitados: [], preferencias_alimentarias: [], restricciones_profesionales: [] },
  ahora: HOY
});
probar('descarta menú del día por contener gluten', rGluten.recomendaciones.some(x => x.opcion.id === 'a'), false);

// Con tiempo disponible y buffer
const aBuffer = analizarTexto('tengo examen en 40 minutos, me quedan S/10');
const rTiempo = recomendar({
  datasetMenus: DATASET,
  analisis: aBuffer,
  patrones: p, perfil: PERFIL, ahora: HOY
});
probar('tiempo neto deducido (40 - 15 = 25 min)', rTiempo.tiempoDisponible.minutosNetos, 25);
probar('evento academico examen detectado', rTiempo.tiempoDisponible.eventoAcademico, 'examen');

print('\n=== 5. PRUEBAS DE MACHINE LEARNING (PREFERENCE LEARNER) ===');
localStorage.clear();
const aprendido = aprenderDeFrase('hoy al final terminé almorzando hamburguesa de bembos');
probarQue('aprende de frase con consumo', aprendido !== null && aprendido.categoria === 'hamburguesa');

const prefs = getLearnedPreferences();
probarQue('guarda establecimiento REST-0002 en prefs', prefs.establecimientos['REST-0002'] > 0);
probarQue('guarda categoria hamburguesa en prefs', prefs.categorias['hamburguesa'] > 0);

const afinidadBembos = calcularAfinidadAprendida({ id: 'b1', establecimiento_id: 'REST-0002', categoria: 'hamburguesa', establecimiento: 'Bembos' });
probarQue('bono de afinidad positivo para Bembos', afinidadBembos.bonus > 0);
probarQue('razon explicable presente', typeof afinidadBembos.razon === 'string' && afinidadBembos.razon.length > 0);

registrarFeedbackOpcion({ id: 'a', establecimiento_id: 'REST-0015', categoria: 'menu_completo', establecimiento: 'Alessar F2' }, 'segui');
const afinidadAlessar = calcularAfinidadAprendida({ id: 'a', establecimiento_id: 'REST-0015', categoria: 'menu_completo', establecimiento: 'Alessar F2' });
probarQue('bono de afinidad positivo tras feedback "La seguí"', afinidadAlessar.bonus > 0);

print('\n=== 6. PRUEBAS DE DEDUPLICACIÓN DE RECOMENDACIONES ===');
const DATASET_VARIANTES = {
  _meta: { estado: 'test' },
  opciones: [
    { id: 'v1', plato: 'Tallarín Taypá', establecimiento: 'Chinawok', establecimiento_id: 'REST-0003', zona: 'z', precio: 15, categoria: 'chifa', etiquetas: ['caliente'], aporte: { proteina: 'alta', verdura: 'media' }, tiempo_cola_min: 5, caminando_min: 2, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: [] },
    { id: 'v2', plato: 'Combo Tallarín Taypá', establecimiento: 'Chinawok', establecimiento_id: 'REST-0003', zona: 'z', precio: 16, categoria: 'chifa', etiquetas: ['caliente'], aporte: { proteina: 'alta', verdura: 'media' }, tiempo_cola_min: 5, caminando_min: 2, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: [] },
    { id: 'v3', plato: 'Arroz Chaufa de Pollo', establecimiento: 'Chinawok', establecimiento_id: 'REST-0003', zona: 'z', precio: 14, categoria: 'chifa', etiquetas: ['caliente'], aporte: { proteina: 'alta', verdura: 'media' }, tiempo_cola_min: 5, caminando_min: 2, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: [] },
    { id: 'v4', plato: 'Menú Universitario', establecimiento: 'Alessar F2', establecimiento_id: 'REST-0015', zona: 'z', precio: 10, categoria: 'menu_completo', etiquetas: ['caliente'], aporte: { proteina: 'alta', verdura: 'media' }, tiempo_cola_min: 5, caminando_min: 2, horario: { desde: '00:00', hasta: '23:59' }, dias: [1,2,3,4,5,6,7], vegetariano: false, alergenos_presentes: [] }
  ]
};
const rVariantes = recomendar({
  datasetMenus: DATASET_VARIANTES,
  analisis: { presupuesto: { monto: 18, evidencia: null, manual: true } },
  patrones: p, perfil: PERFIL, ahora: HOY
});
const platosRecomendados = rVariantes.recomendaciones.map(r => r.opcion.plato);
probarQue('no repite variante Combo Tallarín Taypá cuando ya está Tallarín Taypá', !(platosRecomendados.includes('Tallarín Taypá') && platosRecomendados.includes('Combo Tallarín Taypá')));

print('\n=== 7. PRUEBAS DE REGISTRO CONTINUO Y CONSOLIDACIÓN TEMPORAL ===');
const reg10am = {
  id: 'r1',
  dia: '2026-09-05',
  fecha: '2026-09-05T10:00:00.000Z',
  texto: 'desayuné hoy, dormí 3h, tengo 12 soles y quiero saber que puedo comer y donde',
  analisis: analizarTexto('desayuné hoy, dormí 3h, tengo 12 soles')
};
const reg12pm = {
  id: 'r2',
  dia: '2026-09-05',
  fecha: '2026-09-05T12:00:00.000Z',
  texto: 'no almorcé',
  analisis: analizarTexto('no almorcé')
};
const reg3pm = {
  id: 'r3',
  dia: '2026-09-05',
  fecha: '2026-09-05T15:00:00.000Z',
  texto: 'ya almorcé',
  analisis: analizarTexto('ya almorcé')
};

const c1 = consolidarPorDia([reg10am])[0];
probar('10am: sueño 3h', c1.sueno, 3);
probar('10am: presupuesto 12 soles', c1.presupuesto, 12);
probar('10am: desayuno hecho', c1.comidas.desayuno, 'hecha');

const c2 = consolidarPorDia([reg10am, reg12pm])[0];
probar('12pm: preserva sueño 3h', c2.sueno, 3);
probar('12pm: preserva presupuesto 12 soles', c2.presupuesto, 12);
probar('12pm: almuerzo saltado', c2.comidas.almuerzo, 'saltada');

const c3 = consolidarPorDia([reg10am, reg12pm, reg3pm])[0];
probar('3pm: preserva sueño 3h', c3.sueno, 3);
probar('3pm: preserva presupuesto 12 soles', c3.presupuesto, 12);
probar('3pm: actualiza almuerzo a hecho (supera a saltado)', c3.comidas.almuerzo, 'hecha');

print('\n=== 8. PRUEBAS DE IMÁGENES DE RACHA (NUTRI) ===');
probar('0 días de racha -> Nutria1.png', imagenRacha(0), './racha-nutria/Nutria1.png');
probar('3 días de racha -> Nutria1.png', imagenRacha(3), './racha-nutria/Nutria1.png');
probar('5 días de racha -> Nutria1.png', imagenRacha(5), './racha-nutria/Nutria1.png');
probar('6 días de racha -> Nutria2.png', imagenRacha(6), './racha-nutria/Nutria2.png');
probar('10 días de racha -> Nutria2.png', imagenRacha(10), './racha-nutria/Nutria2.png');
probar('12 días de racha -> Nutria3.png', imagenRacha(12), './racha-nutria/Nutria3.png');
probar('15 días de racha -> Nutria3.png', imagenRacha(15), './racha-nutria/Nutria3.png');
probar('18 días de racha -> Nutria4.png', imagenRacha(18), './racha-nutria/Nutria4.png');
probar('20 días de racha -> Nutria4.png', imagenRacha(20), './racha-nutria/Nutria4.png');
probar('21 días de racha -> Nutria5.png (Hábito formado)', imagenRacha(21), './racha-nutria/Nutria5.png');
probar('30 días de racha -> Nutria5.png', imagenRacha(30), './racha-nutria/Nutria5.png');
probar('nivel de racha para 21 días es Nutri Maestra', infoNivelRacha(21).nivel, 5);

print(`\n========================================`);
print(`TOTAL PRUEBAS: ${pasadas} pasan, ${falladas} fallan`);
print(`========================================`);

