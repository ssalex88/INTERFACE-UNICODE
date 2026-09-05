/**
 * NUTRIA · Pruebas del Parser de Tiempo Disponible (HU-03)
 * -----------------------------------------------------------------------------
 * Pruebas unitarias de lenguaje natural y deducción de tiempo con margen.
 */

import { extractAvailableTime } from '../src/parser.js';

export function runParserTests(runner = null) {
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

  console.log('\n--- Ejecutando pruebas de Tiempo Disponible (HU-03) ---');

  // Caso 1: Minutos directos para comer
  const c1 = extractAvailableTime('tengo 20 minutos para comer');
  assert('HU-03: tengo 20 minutos para comer -> availableMinutes: 20', c1.availableMinutes, 20);
  assert('HU-03: Sin evento previo -> bufferMinutes: 0', c1.bufferMinutes, 0);

  // Caso 2: Coloquial "media hora"
  const c2 = extractAvailableTime('solo tengo media hora');
  assert('HU-03: solo tengo media hora -> availableMinutes: 30', c2.availableMinutes, 30);
  assert('HU-03: solo tengo media hora -> bufferMinutes: 0', c2.bufferMinutes, 0);

  // Caso 3: Evento académico "parcial en 40 minutos" (Consideración importante)
  const c3 = extractAvailableTime('tengo parcial en 40 minutos');
  assert('HU-03: parcial en 40 min -> rawMinutes: 40', c3.rawMinutes, 40);
  assert('HU-03: parcial en 40 min -> bufferMinutes: 15 (margen examen)', c3.bufferMinutes, 15);
  assert('HU-03: parcial en 40 min -> availableMinutes: 25 (descontando margen)', c3.availableMinutes, 25);
  assertCondition('HU-03: Guarda motivo del margen', typeof c3.bufferReason === 'string' && c3.bufferReason.length > 0);
  assert('HU-03: Identifica evento parcial', c3.eventoAcademico, 'parcial');

  // Caso 4: Clase en 30 minutos
  const c4 = extractAvailableTime('tengo clase en 30 minutos');
  assert('HU-03: clase en 30 min -> rawMinutes: 30', c4.rawMinutes, 30);
  assert('HU-03: clase en 30 min -> bufferMinutes: 10 (margen clase)', c4.bufferMinutes, 10);
  assert('HU-03: clase en 30 min -> availableMinutes: 20', c4.availableMinutes, 20);

  // Caso 5: Frase combinada con dinero y sueño
  const c5 = extractAvailableTime('dormí 5 horas, tengo entrega en 45 minutos y me quedan S/10');
  assert('HU-03: entrega en 45 min -> rawMinutes: 45', c5.rawMinutes, 45);
  assert('HU-03: entrega en 45 min -> bufferMinutes: 15', c5.bufferMinutes, 15);
  assert('HU-03: entrega en 45 min -> availableMinutes: 30', c5.availableMinutes, 30);

  const total = assertions.length;
  const passed = assertions.filter((a) => a.ok).length;
  console.log(`Resultado: ${passed}/${total} aserciones pasadas.\n`);
  return { total, passed, failed: total - passed, assertions };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('parser.test.js')) {
  runParserTests();
}
