/**
 * NUTRIA · Catálogo de Restricciones y Perfil Alimentario (HU-01, HU-04)
 * -----------------------------------------------------------------------------
 * Gestiona el catálogo de tipos de restricción, alérgenos y utilidades para
 * evaluar la compatibilidad de opciones de menú contra el perfil del estudiante.
 *
 * Criterios de aceptación (HU-01):
 * - Diferencia entre: alergia conocida, intolerancia conocida, alimento evitado,
 *   preferencia alimentaria y restricción concreta indicada por un profesional.
 * - Una categoría sin responder se define como 'unknown'.
 * - Una lista vacía [] no es 'unknown': indica explícitamente "ninguna".
 * - No almacena diagnósticos médicos: solo declaraciones funcionales.
 *
 * Reglas de explicabilidad (HU-04):
 * - NUNCA utiliza términos como "100 % seguro", "sin riesgo" ni "garantizado".
 * - Comunica claramente información desconocida o por verificar.
 */

export const TIPOS_RESTRICCION = {
  alergia_conocida: {
    id: 'alergia_conocida',
    nombre: 'Alergias conocidas',
    descripcion: 'Reacción inmunológica conocida. Causa descarte preventivo prioritario.',
    severidad: 'alta',
    etiquetaBadge: 'Alergia declarada'
  },
  intolerancia_conocida: {
    id: 'intolerancia_conocida',
    nombre: 'Intolerancias conocidas',
    descripcion: 'Sensibilidad digestiva o metabólica (ej. lactosa, gluten no celíaco).',
    severidad: 'media',
    etiquetaBadge: 'Intolerancia declarada'
  },
  alimento_evitado: {
    id: 'alimento_evitado',
    nombre: 'Alimentos evitados',
    descripcion: 'Alimentos que el estudiante decide no consumir por hábito o digestión.',
    severidad: 'baja',
    etiquetaBadge: 'Evitado'
  },
  preferencia_alimentaria: {
    id: 'preferencia_alimentaria',
    nombre: 'Preferencias alimentarias',
    descripcion: 'Patrón dietético voluntario (ej. vegetariano, vegano).',
    severidad: 'preferencia',
    etiquetaBadge: 'Preferencia'
  },
  restriccion_profesional: {
    id: 'restriccion_profesional',
    nombre: 'Restricciones indicadas por profesional',
    descripcion: 'Indicación dietética concreta dada por profesional de salud.',
    severidad: 'alta',
    etiquetaBadge: 'Indicación profesional'
  }
};

export const ALERGENOS_CATALOGO = [
  {
    id: 'lactosa',
    nombre: 'Lactosa / Lácteos',
    terminoAlimento: 'lácteos',
    categoriasSoportadas: ['intolerancia_conocida', 'alergia_conocida', 'alimento_evitado', 'restriccion_profesional']
  },
  {
    id: 'mani',
    nombre: 'Maní / Cacahuates',
    terminoAlimento: 'maní',
    categoriasSoportadas: ['alergia_conocida', 'alimento_evitado', 'restriccion_profesional']
  },
  {
    id: 'gluten',
    nombre: 'Gluten / Trigo',
    terminoAlimento: 'gluten',
    categoriasSoportadas: ['intolerancia_conocida', 'alergia_conocida', 'alimento_evitado', 'restriccion_profesional']
  },
  {
    id: 'mariscos',
    nombre: 'Mariscos y crustáceos',
    terminoAlimento: 'mariscos',
    categoriasSoportadas: ['alergia_conocida', 'alimento_evitado']
  },
  {
    id: 'huevo',
    nombre: 'Huevo',
    terminoAlimento: 'huevo',
    categoriasSoportadas: ['alergia_conocida', 'intolerancia_conocida', 'alimento_evitado']
  },
  {
    id: 'soja',
    nombre: 'Soja / Soya',
    terminoAlimento: 'soja',
    categoriasSoportadas: ['alergia_conocida', 'alimento_evitado']
  }
];

export const PREFERENCIAS_CATALOGO = [
  {
    id: 'vegetariano',
    nombre: 'Preferencia vegetariana',
    descripcion: 'Sin carnes rojas, aves ni pescados.'
  },
  {
    id: 'bajo_sodio',
    nombre: 'Bajo en sal / sodio',
    descripcion: 'Preferir opciones con bajo contenido de sodio.'
  }
];

export const ESTADO_UNKNOWN = 'unknown';

/**
 * Estructura vacía inicial del perfil alimentario.
 * Por criterio de aceptación: si una categoría no fue respondida, queda 'unknown'.
 */
export function crearPerfilAlimentarioVacio() {
  return {
    version: '1.0',
    actualizado: null,
    alergias_conocidas: ESTADO_UNKNOWN,
    intolerancias_conocidas: ESTADO_UNKNOWN,
    alimentos_evitados: ESTADO_UNKNOWN,
    preferencias_alimentarias: ESTADO_UNKNOWN,
    restricciones_profesionales: ESTADO_UNKNOWN
  };
}

/**
 * Valida y normaliza un perfil alimentario asegurando que unknown se mantenga
 * y listas explícitas [] se reconozcan como "ninguna".
 */
export function normalizarPerfilAlimentario(perfil) {
  if (!perfil || typeof perfil !== 'object') return crearPerfilAlimentarioVacio();

  const normalizarCampo = (valor) => {
    if (valor === ESTADO_UNKNOWN || valor === undefined || valor === null) return ESTADO_UNKNOWN;
    if (Array.isArray(valor)) return [...new Set(valor.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
    return ESTADO_UNKNOWN;
  };

  return {
    version: '1.0',
    actualizado: perfil.actualizado || null,
    alergias_conocidas: normalizarCampo(perfil.alergias_conocidas),
    intolerancias_conocidas: normalizarCampo(perfil.intolerancias_conocidas),
    alimentos_evitados: normalizarCampo(perfil.alimentos_evitados),
    preferencias_alimentarias: normalizarCampo(perfil.preferencias_alimentarias),
    restricciones_profesionales: normalizarCampo(perfil.restricciones_profesionales)
  };
}

/**
 * Evalúa un plato u opción de comida contra el perfil alimentario del estudiante (HU-04).
 * Cumple con la restricción de NUNCA prometer "100 % seguro", "sin riesgo" o "garantizado".
 *
 * @param {object} opcion          Registro de menú
 * @param {object} perfil          Perfil alimentario normalizado
 * @returns {object} Evaluación con advertencias, explicaciones y estado de descarte
 */
export function evaluarCompatibilidadAlimentaria(opcion, perfil) {
  const p = normalizarPerfilAlimentario(perfil);
  const advertencias = [];
  const explicaciones = [];
  let descartado = false;
  let motivoDescarte = null;

  const presentes = Array.isArray(opcion.alergenos_presentes) ? opcion.alergenos_presentes : [];
  const verificadosAusentes = Array.isArray(opcion.alergenos_ausentes_verificados) ? opcion.alergenos_ausentes_verificados : [];
  const noVerificados = Array.isArray(opcion.alergenos_no_verificados) ? opcion.alergenos_no_verificados : [];

  // Inferencia fallback si la opción no tiene metadata enriquecida:
  if (!presentes.length && !verificadosAusentes.length) {
    const texto = `${opcion.plato || ''} ${opcion.notas || ''} ${(opcion.etiquetas || []).join(' ')}`.toLowerCase();
    if (texto.includes('leche') || texto.includes('queso') || texto.includes('crema') || texto.includes('mantequilla')) presentes.push('lactosa');
    if (texto.includes('mani') || texto.includes('cacahuate')) presentes.push('mani');
    if (texto.includes('pan') || texto.includes('tallarin') || texto.includes('fideos') || texto.includes('harina')) presentes.push('gluten');
  }

  // 1. Verificar Alergias Conocidas (Severidad Alta -> Descarte)
  if (Array.isArray(p.alergias_conocidas)) {
    for (const alergia of p.alergias_conocidas) {
      if (presentes.includes(alergia)) {
        descartado = true;
        motivoDescarte = `Contiene ${nombreAlergeno(alergia)}, declarado en tus alergias conocidas.`;
        advertencias.push({
          tipo: 'alergia_presente',
          severidad: 'critica',
          mensaje: `Esta opción contiene ${nombreAlergeno(alergia)} según la información disponible.`
        });
      } else if (noVerificados.includes(alergia)) {
        advertencias.push({
          tipo: 'alergia_no_verificada',
          severidad: 'atencion',
          mensaje: `No pudimos verificar si contiene ${nombreAlergeno(alergia)}. Confirma con el establecimiento antes de consumir.`
        });
      }
    }
  }

  // 2. Verificar Restricciones Profesionales (Severidad Alta -> Descarte)
  if (Array.isArray(p.restricciones_profesionales)) {
    for (const restr of p.restricciones_profesionales) {
      if (presentes.includes(restr)) {
        descartado = true;
        motivoDescarte = motivoDescarte || `Contiene ${nombreAlergeno(restr)}, restringido por indicación profesional.`;
        advertencias.push({
          tipo: 'restriccion_profesional_presente',
          severidad: 'critica',
          mensaje: `Esta opción contiene ${nombreAlergeno(restr)}, sujeto a tu restricción profesional indicada.`
        });
      }
    }
  }

  // 3. Verificar Intolerancias Conocidas (Severidad Media -> Advertencia)
  if (Array.isArray(p.intolerancias_conocidas)) {
    for (const intol of p.intolerancias_conocidas) {
      const nombreIntol = nombreAlergeno(intol);
      const yaAdvertido = advertencias.some((a) => a.mensaje.includes(nombreIntol));
      if (yaAdvertido) continue;

      if (presentes.includes(intol)) {
        advertencias.push({
          tipo: 'intolerancia_presente',
          severidad: 'advertencia',
          mensaje: `Esta opción contiene ${nombreIntol} según la información disponible.`
        });
      } else if (noVerificados.includes(intol)) {
        advertencias.push({
          tipo: 'intolerancia_no_verificada',
          severidad: 'atencion',
          mensaje: `No pudimos verificar si contiene ${nombreIntol}. Confirma con el establecimiento.`
        });
      }
    }
  }

  // 4. Verificar Preferencia Vegetariana
  const esVegetarianoPerfil = Array.isArray(p.preferencias_alimentarias) && p.preferencias_alimentarias.includes('vegetariano');
  if (esVegetarianoPerfil && opcion.vegetariano === false) {
    descartado = true;
    motivoDescarte = motivoDescarte || 'No cumple con tu preferencia vegetariana.';
    advertencias.push({
      tipo: 'no_vegetariano',
      severidad: 'advertencia',
      mensaje: 'Esta opción contiene proteína animal o derivados no vegetarianos.'
    });
  } else if (esVegetarianoPerfil && (opcion.vegetariano === null || opcion.vegetariano === undefined)) {
    // El levantamiento real trae platos donde la carta no lo dice: `null` es
    // DESCONOCIDO, no "sí". Descartarlos escondería opciones que quizá sirven;
    // callarlo sería dar por vegetariano algo que nadie verificó. Se muestra y
    // se dice que no se sabe, que es la misma regla de HU-04 para alérgenos.
    advertencias.push({
      tipo: 'vegetariano_no_verificado',
      severidad: 'atencion',
      mensaje: 'La carta no dice si esta opción es vegetariana. Confirma en el local antes de pedirla.'
    });
  }

  // 5. Verificar Alimentos Evitados (Penalización y nota)
  if (Array.isArray(p.alimentos_evitados)) {
    for (const evitado of p.alimentos_evitados) {
      if (presentes.includes(evitado)) {
        advertencias.push({
          tipo: 'alimento_evitado_presente',
          severidad: 'info',
          mensaje: `Contiene ${nombreAlergeno(evitado)}, que marcaste como alimento evitado.`
        });
      }
    }
  }

  // 6. Explicabilidad transparente
  const confianza = opcion.nivel_confianza || 'medio';
  const procedencia = opcion.procedencia_dato || 'Relevamiento de campo LEAD';
  const fecha = opcion.fecha_actualizacion || '2026-09-01';

  if (!descartado && advertencias.length === 0) {
    explicaciones.push('Compatible con tu perfil alimentario según los datos registrados.');
  }

  return {
    descartado,
    motivoDescarte,
    compatible: !descartado,
    advertencias,
    explicaciones,
    metadatos: {
      nivelConfianza: confianza,
      procedencia,
      fechaActualizacion: fecha,
      avisoResponsabilidad: 'La información se basa en registros de campo y declaraciones locales. Confirma siempre con el personal del establecimiento.'
    }
  };
}

export function nombreAlergeno(id) {
  const item = ALERGENOS_CATALOGO.find((a) => a.id === id);
  if (item) return item.terminoAlimento || item.nombre;
  return id;
}
