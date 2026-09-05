/**
 * NUTRIA · Pruebas de Perfil Alimentario (HU-01, HU-02, HU-04)
 * -----------------------------------------------------------------------------
 * Ejecutable tanto en Node.js como en navegador.
 */

import {
  getDietaryProfile,
  saveDietaryProfile,
  resetDietaryProfile,
  ESTADO_UNKNOWN
} from '../src/storage.js';

import {
  TIPOS_RESTRICCION,
  ALERGENOS_CATALOGO,
  evaluarCompatibilidadAlimentaria
} from '../src/dietary-catalog.js';

export function runDietaryProfileTests(runner = null) {
  const assertions = [];
  const assert = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    assertions.push({ name, ok, actual, expected });
    if (runner) runner(name, ok, actual, expected);
    if (!ok) console.error(`FAIL: ${name}`, { actual, expected });
    else console.log(`OK: ${name}`);
  };

  const assertCondition = (name, condition, details = '') => {
    assertions.push({ name, ok: !!condition, actual: details, expected: 'true' });
    if (runner) runner(name, !!condition, details, 'true');
    if (!condition) console.error(`FAIL: ${name}`, details);
    else console.log(`OK: ${name}`);
  };

  console.log('\n--- Ejecutando pruebas de Perfil Alimentario (HU-01, HU-02, HU-04) ---');

  // 1. Estado inicial: Categorías no respondidas quedan como 'unknown'
  resetDietaryProfile();
  const inicial = getDietaryProfile();
  assert('HU-01: Alergias por defecto son unknown', inicial.alergias_conocidas, ESTADO_UNKNOWN);
  assert('HU-01: Intolerancias por defecto son unknown', inicial.intolerancias_conocidas, ESTADO_UNKNOWN);
  assert('HU-01: Alimentos evitados por defecto son unknown', inicial.alimentos_evitados, ESTADO_UNKNOWN);
  assert('HU-01: Preferencias por defecto son unknown', inicial.preferencias_alimentarias, ESTADO_UNKNOWN);
  assert('HU-01: Restricciones profesionales por defecto son unknown', inicial.restricciones_profesionales, ESTADO_UNKNOWN);

  // 2. Lista vacía [] NO es unknown (significa "ninguna declarada")
  const conListaVacia = saveDietaryProfile({ alergias_conocidas: [] });
  assert('HU-01: Lista vacía se preserva como []', conListaVacia.alergias_conocidas, []);
  assertCondition('HU-01: Lista vacía no es unknown', conListaVacia.alergias_conocidas !== ESTADO_UNKNOWN);

  // 3. Registrar alérgenos e intolerancias requeridas en el alcance inicial
  const perfilCompleto = saveDietaryProfile({
    alergias_conocidas: ['mani'],
    intolerancias_conocidas: ['lactosa', 'gluten'],
    preferencias_alimentarias: ['vegetariano'],
    restricciones_profesionales: ['gluten']
  });

  assert('HU-01: Alergia a maní guardada', perfilCompleto.alergias_conocidas, ['mani']);
  assert('HU-01: Intolerancias a lactosa y gluten guardadas', perfilCompleto.intolerancias_conocidas, ['lactosa', 'gluten']);
  assert('HU-01: Preferencia vegetariana guardada', perfilCompleto.preferencias_alimentarias, ['vegetariano']);
  assert('HU-01: Restricción profesional guardada', perfilCompleto.restricciones_profesionales, ['gluten']);

  // 4. Tipos diferenciados existen en el catálogo
  assertCondition('HU-01: Tipo alergia_conocida definido', !!TIPOS_RESTRICCION.alergia_conocida);
  assertCondition('HU-01: Tipo intolerancia_conocida definido', !!TIPOS_RESTRICCION.intolerancia_conocida);
  assertCondition('HU-01: Tipo alimento_evitado definido', !!TIPOS_RESTRICCION.alimento_evitado);
  assertCondition('HU-01: Tipo preferencia_alimentaria definido', !!TIPOS_RESTRICCION.preferencia_alimentaria);
  assertCondition('HU-01: Tipo restriccion_profesional definido', !!TIPOS_RESTRICCION.restriccion_profesional);

  // 5. Restablecimiento del perfil alimentario
  const restablecido = resetDietaryProfile();
  assert('HU-01: resetDietaryProfile() devuelve categorías a unknown', restablecido.alergias_conocidas, ESTADO_UNKNOWN);

  // 6. HU-04: Evaluación de compatibilidad y descarte
  const platoConMani = {
    id: 't1',
    plato: 'Ensalada con maní tostado',
    alergenos_presentes: ['mani'],
    alergenos_no_verificados: [],
    vegetariano: true,
    precio: 12
  };
  const evaluacionMani = evaluarCompatibilidadAlimentaria(platoConMani, { alergias_conocidas: ['mani'] });
  assertCondition('HU-04: Plato con alérgeno conocido queda descartado', evaluacionMani.descartado === true);
  assertCondition('HU-04: Genera advertencia explícita de alérgeno', evaluacionMani.advertencias.some((a) => a.mensaje.includes('maní')));

  // 7. HU-04: Advertencia de no verificado
  const platoDudoso = {
    id: 't2',
    plato: 'Guiso especial del día',
    alergenos_presentes: [],
    alergenos_no_verificados: ['mani', 'lactosa'],
    vegetariano: false,
    precio: 10
  };
  const evaluacionDudosa = evaluarCompatibilidadAlimentaria(platoDudoso, { alergias_conocidas: ['mani'], intolerancias_conocidas: ['lactosa'] });
  assertCondition('HU-04: Genera advertencia de confirmación para alérgeno no verificado',
    evaluacionDudosa.advertencias.some((a) => a.mensaje.includes('No pudimos verificar')));

  // 8. HU-04: Prohibición estricta de promesas absolutas
  const serialized = JSON.stringify(evaluacionMani) + JSON.stringify(evaluacionDudosa);
  assertCondition('HU-04: NUNCA incluye frase "100 % seguro"', !serialized.includes('100 % seguro') && !serialized.includes('100% seguro'));
  assertCondition('HU-04: NUNCA incluye frase "sin riesgo"', !serialized.toLowerCase().includes('sin riesgo'));
  assertCondition('HU-04: NUNCA incluye frase "garantizado"', !serialized.toLowerCase().includes('garantizado'));

  const total = assertions.length;
  const passed = assertions.filter((a) => a.ok).length;
  console.log(`Resultado: ${passed}/${total} aserciones pasadas.\n`);
  return { total, passed, failed: total - passed, assertions };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('dietary-profile.test.js')) {
  runDietaryProfileTests();
}
