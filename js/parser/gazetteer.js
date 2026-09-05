/**
 * NUTRIA · Capa 1 — Gazetteer
 * -----------------------------------------------------------------------------
 * Diccionarios de la Capa 1 (analizador determinístico). Nada de esto usa IA:
 * son listas y patrones que el vigilante de la puerta consulta antes de dejar
 * pasar a nadie. Todo el contenido está escrito EN FORMA NORMALIZADA
 * (minúsculas, sin tildes) porque el analizador normaliza el texto preservando
 * los índices para poder devolver la evidencia exacta de cada extracción.
 *
 * Este archivo es contenido, no lógica: crece con el trabajo de campo y con las
 * correcciones de la comunidad, sin tocar el analizador.
 */

/** Números escritos con letras, 0 a 30 + fracciones útiles. */
export const NUMEROS_PALABRA = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30,
  media: 0.5, medio: 0.5
};

/** Unidades y jerga de dinero peruana. Todas valen 1 sol. */
export const UNIDADES_DINERO = [
  'soles', 'sol', 'lucas', 'luca', 'cocos', 'coco', 'pes', 'pe'
];

/** Verbos/frases que indican que el número que sigue es plata disponible. */
export const CONTEXTO_DINERO = [
  'me queda', 'me quedan', 'quedan', 'tengo', 'ando con', 'me sobra',
  'me sobran', 'presupuesto', 'con solo', 'solo tengo', 'cuento con',
  'me alcanza', 'gaste', 'gastar', 'para gastar', 'en la billetera'
];

/** Expresiones que significan "cero plata". */
export const SIN_PLATA = [
  'misio', 'estoy misio', 'ando misio', 'sin plata', 'no tengo plata',
  'ni un sol', 'ni una luca', 'pelado', 'quebrado', 'sin un sol', 'a pan y agua'
];

/** Marcadores de negación. Se buscan en la ventana previa a cada comida. */
export const NEGACIONES = [
  'no', 'ni', 'nada de', 'sin', 'tampoco', 'jamas', 'nunca',
  'salte', 'me salte', 'saltee', 'me saltee', 'pase de largo',
  'me olvide de', 'no me dio tiempo de', 'no alcance a', 'no pude'
];

/** Las tres comidas + variantes de cómo las nombra un universitario. */
export const COMIDAS = {
  desayuno: ['desayuno', 'desayune', 'desayunar', 'desayunado', 'desayunamos'],
  almuerzo: ['almuerzo', 'almorce', 'almorzar', 'almorzado', 'almorzamos', 'lonche fuerte'],
  cena: ['cena', 'cene', 'cenar', 'cenado', 'cenamos', 'comida de la noche']
};

/** Frases que implican que no comió nada en todo el día. */
export const AYUNO_TOTAL = [
  'no comi nada', 'no he comido nada', 'no comi en todo el dia',
  'no probe bocado', 'no he comido en todo el dia', 'sin comer en todo el dia',
  'me pase el dia sin comer'
];

/**
 * Gazetteer de platos peruanos. `patrones` son las formas normalizadas que
 * aparecen en el texto; `categoria` y `etiquetas` empatan con el vocabulario
 * de data/menus-semilla.json para poder cruzar registro contra dataset.
 */
export const PLATOS = [
  { nombre: 'pollo a la brasa', patrones: ['pollo a la brasa', 'brasa', 'pollito a la brasa'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal', 'contundente'] },
  { nombre: 'arroz con pollo', patrones: ['arroz con pollo'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal', 'contundente'] },
  { nombre: 'lomo saltado', patrones: ['lomo saltado', 'lomito saltado'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal', 'contundente'] },
  { nombre: 'ají de gallina', patrones: ['aji de gallina'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal'] },
  { nombre: 'seco con frejoles', patrones: ['seco con frejoles', 'seco de res', 'seco de pollo'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal', 'menestra'] },
  { nombre: 'tallarín saltado', patrones: ['tallarin saltado', 'tallarines saltados'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal'] },
  { nombre: 'tallarín rojo', patrones: ['tallarin rojo', 'tallarines rojos'], categoria: 'plato_fuerte', etiquetas: [] },
  { nombre: 'arroz chaufa', patrones: ['chaufa', 'arroz chaufa'], categoria: 'plato_fuerte', etiquetas: [] },
  { nombre: 'tacu tacu', patrones: ['tacu tacu', 'tacutacu'], categoria: 'plato_fuerte', etiquetas: ['menestra'] },
  { nombre: 'anticuchos', patrones: ['anticucho', 'anticuchos'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal'] },
  { nombre: 'ceviche', patrones: ['ceviche', 'cebiche'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal', 'ligero'] },
  { nombre: 'causa', patrones: ['causa rellena', 'causa'], categoria: 'entrada', etiquetas: ['ligero'] },
  { nombre: 'papa a la huancaína', patrones: ['papa a la huancaina', 'huancaina'], categoria: 'entrada', etiquetas: [] },
  { nombre: 'caldo de gallina', patrones: ['caldo de gallina', 'caldito de gallina', 'caldo'], categoria: 'sopa', etiquetas: ['caliente', 'reconstituyente'] },
  { nombre: 'sopa criolla', patrones: ['sopa criolla'], categoria: 'sopa', etiquetas: ['caliente'] },
  { nombre: 'menestrón', patrones: ['menestron'], categoria: 'sopa', etiquetas: ['caliente', 'verdura'] },
  { nombre: 'sopa', patrones: ['sopa', 'sopita'], categoria: 'sopa', etiquetas: ['caliente'] },
  { nombre: 'menestra', patrones: ['menestra', 'lentejas', 'frejoles', 'garbanzos', 'pallares'], categoria: 'guarnicion', etiquetas: ['menestra'] },
  { nombre: 'menú del día', patrones: ['menu del dia', 'un menu', 'el menu', 'menu de', 'menu'], categoria: 'menu_completo', etiquetas: ['caliente', 'contundente'] },
  { nombre: 'salchipapa', patrones: ['salchipapa', 'salchipapas'], categoria: 'snack', etiquetas: ['frito'] },
  { nombre: 'pan con chicharrón', patrones: ['pan con chicharron', 'chicharron'], categoria: 'sandwich', etiquetas: ['proteina_animal'] },
  { nombre: 'pan con palta', patrones: ['pan con palta'], categoria: 'sandwich', etiquetas: ['vegetariano'] },
  { nombre: 'sánguche', patrones: ['sanguche', 'sandwich', 'pan con'], categoria: 'sandwich', etiquetas: [] },
  { nombre: 'hamburguesa', patrones: ['hamburguesa', 'burger'], categoria: 'sandwich', etiquetas: ['frito'] },
  { nombre: 'pizza', patrones: ['pizza'], categoria: 'plato_fuerte', etiquetas: [] },
  { nombre: 'empanada', patrones: ['empanada', 'empanadas'], categoria: 'snack', etiquetas: [] },
  { nombre: 'ensalada', patrones: ['ensalada'], categoria: 'ensalada', etiquetas: ['verdura', 'ligero'] },
  { nombre: 'avena', patrones: ['avena', 'quinua', 'maca'], categoria: 'desayuno', etiquetas: ['caliente'] },
  { nombre: 'emoliente', patrones: ['emoliente'], categoria: 'desayuno', etiquetas: ['caliente'] },
  { nombre: 'yogurt', patrones: ['yogurt', 'yogur'], categoria: 'snack', etiquetas: ['ligero'] },
  { nombre: 'galletas', patrones: ['galleta', 'galletas'], categoria: 'snack', etiquetas: ['ultraprocesado'] },
  { nombre: 'gaseosa', patrones: ['gaseosa', 'inka kola', 'coca cola'], categoria: 'bebida', etiquetas: ['ultraprocesado'] },
  { nombre: 'café', patrones: ['cafe', 'cafecito'], categoria: 'bebida', etiquetas: ['estimulante'] },
  { nombre: 'chifa', patrones: ['chifa'], categoria: 'plato_fuerte', etiquetas: [] },
  { nombre: 'pollada', patrones: ['pollada'], categoria: 'plato_fuerte', etiquetas: ['proteina_animal'] }
];

/** Estados de ánimo. `valencia` va de -2 (muy mal) a +2 (muy bien). */
export const ANIMO = [
  { etiqueta: 'estresado', valencia: -2, patrones: ['estres', 'estresad', 'estresa', 'agobiad', 'presionad', 'a mil', 'saturad'] },
  { etiqueta: 'ansioso', valencia: -2, patrones: ['ansios', 'ansiedad', 'nervios', 'con los nervios'] },
  { etiqueta: 'quemado', valencia: -2, patrones: ['quemad', 'burnout', 'no doy mas', 'hasta las patas', 'harto', 'harta'] },
  { etiqueta: 'triste', valencia: -2, patrones: ['triste', 'bajone', 'bajon', 'deprim', 'desanimad'] },
  { etiqueta: 'cansado', valencia: -1, patrones: ['cansad', 'agotad', 'muerto', 'muerta', 'reventad', 'sin pilas', 'sin energia', 'destruid'] },
  { etiqueta: 'tranquilo', valencia: 1, patrones: ['tranqui', 'tranquil', 'relajad', 'chill', 'normal', 'todo bien'] },
  { etiqueta: 'motivado', valencia: 2, patrones: ['motivad', 'con toda', 'a full', 'contento', 'contenta', 'feliz', 'animad', 'con energia'] }
];

/** Nivel de energía declarado explícitamente. */
export const ENERGIA = [
  { nivel: 'baja', patrones: ['sin energia', 'sin pilas', 'me caigo de sueno', 'me duermo en clase', 'no rindo', 'arrastrandome', 'bajoneado de energia'] },
  { nivel: 'alta', patrones: ['con energia', 'a full', 'con toda', 'con pila', 'activo', 'activa'] }
];

/** Carga académica declarada: el cruce con esto es lo que hace útil el patrón. */
export const CARGA_ACADEMICA = [
  { tipo: 'parcial', patrones: ['parcial', 'parciales', 'examen', 'examenes', 'final', 'finales'] },
  { tipo: 'entrega', patrones: ['entrega', 'entregar', 'deadline', 'trabajo final', 'informe', 'avance'] },
  { tipo: 'practica', patrones: ['practica calificada', 'pc1', 'pc2', 'pc3', 'una pc', 'la pc', 'quiz', 'control de lectura'] },
  { tipo: 'exposicion', patrones: ['exposicion', 'expo', 'sustentacion', 'sustentar', 'presentacion'] },
  { tipo: 'laboratorio', patrones: ['laboratorio', 'lab de'] }
];

/** Sueño descrito sin número. `horas` es la estimación conservadora. */
export const SUENO_CUALITATIVO = [
  {
    patrones: [
      'no pegue el ojo', 'no pegue un ojo', 'no pegue pestana', 'ni pestanee',
      'no he jateado', 'no he jateao', 'ni he jateado', 'no jatee', 'ni jatee', 'sin jatear', 'cero jato', 'nada de jato',
      'ni dormi', 'no dormi nada', 'no dormi', 'ni he dormido', 'no he dormido', 'sin dormir nada', 'sin dormir', 'cero dormir', 'cero sueno',
      'me amaneci', 'amanecida', 'de amanecida', 'de corrido', 'de largo', 'trasnoche', 'jale toda la noche', 'jale de largo', 'en vela'
    ],
    horas: 2,
    calidad: 'mala'
  },
  {
    patrones: [
      'casi no jatee', 'jatee poquisimo', 'jatee poquito', 'apenas jatee',
      'casi no dormi', 'dormi poquisimo', 'dormi poquito', 'apenas dormi'
    ],
    horas: 3,
    calidad: 'mala'
  },
  {
    patrones: [
      'jatee poco', 'dormi poco', 'poco sueno', 'poco jato', 'dormi mal', 'jatee mal', 'mal sueno', 'mal jato', 'dormi pesimo', 'jatee pesimo'
    ],
    horas: 4.5,
    calidad: 'mala'
  },
  {
    patrones: [
      'dormi mas o menos', 'jatee mas o menos', 'dormi regular', 'jatee regular'
    ],
    horas: 6,
    calidad: 'regular'
  },
  {
    patrones: [
      'jatee bien', 'buen jato', 'dormi bien', 'buen sueno', 'descanse', 'descanse bien'
    ],
    horas: 7.5,
    calidad: 'buena'
  },
  {
    patrones: [
      'dormi como un bebe', 'dormi rico', 'jatee rico', 'dormi un monton', 'jatee un monton', 'dormi de mas', 'dormi como tronco', 'jatee como tronco'
    ],
    horas: 9,
    calidad: 'buena'
  }
];

/** Actividad física, campo secundario del registro. */
export const ACTIVIDAD = [
  { patrones: ['fui al gym', 'gimnasio', 'entrene', 'corri', 'jugue pelota', 'jugue futbol', 'jugue voley', 'camine harto', 'nade'], hizo: true },
  { patrones: ['no me movi', 'todo el dia sentado', 'todo el dia sentada', 'no hice nada de ejercicio', 'no fui al gym'], hizo: false }
];

/** Señales de restricción alimentaria: alimentan la CONTRA-MÉTRICA, no la gamificación. */
export const SENALES_RESTRICCION = [
  'no quiero comer', 'sin hambre', 'me da culpa comer', 'estoy a dieta',
  'quiero bajar de peso', 'me siento gordo', 'me siento gorda',
  'no merezco comer', 'para no engordar'
];
