/**
 * NUTRIA · Iconografía
 * -----------------------------------------------------------------------------
 * Set de íconos de línea dibujado a mano sobre una retícula de 24, con trazo
 * uniforme de 1.7 y remates redondos. Todo inline y en `currentColor`: sin
 * fuentes de íconos, sin sprites, sin una sola petición a la red —la misma
 * regla que sostiene el resto del proyecto—.
 *
 * Por qué no emoji: el emoji lo dibuja el sistema operativo, así que cambia de
 * estilo y de peso en cada dispositivo y arrastra un aire genérico. Un set
 * propio hace que la interfaz se vea de NUTRIA y de nadie más.
 *
 *   icono('pluma')            -> <svg …>
 *   icono('pluma', { tam: 20 })
 */

const TRAZOS = {
  // Navegación
  pluma: '<path d="M4 20l1.2-4.2L15.6 5.4a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.2 18.8 4 20Z"/><path d="M13.8 7.2l3 3"/>',
  onda: '<path d="M3 15.5c2.2 0 2.4-7 4.6-7s2.2 9 4.4 9 2.4-8 4.6-8 2.1 4.5 4.4 4.5"/>',
  tazon: '<path d="M3.2 10.5h17.6a8.8 8.8 0 0 1-8.8 8.5 8.8 8.8 0 0 1-8.8-8.5Z"/><path d="M9 7.2c0-1.3 1.4-1.5 1.4-2.7M13.2 7.2c0-1.6 1.6-1.8 1.6-3.2"/>',
  gente: '<circle cx="9" cy="8.6" r="3.1"/><path d="M3.6 19.4a5.4 5.4 0 0 1 10.8 0"/><path d="M16 6.1a3 3 0 0 1 0 5.6M17.4 14.6a5.2 5.2 0 0 1 3 4.8"/>',
  escudo: '<path d="M12 3.2 5 6v5.6c0 4.2 2.9 7.6 7 9.2 4.1-1.6 7-5 7-9.2V6l-7-2.8Z"/><path d="M12 10.6v3.6"/><circle cx="12" cy="8.6" r=".2"/>',
  lista: '<path d="M4.2 6.4h4M4.2 12h4M4.2 17.6h4"/><path d="M11.4 6.4h8.4M11.4 12h8.4M11.4 17.6h5.4"/>',
  documento: '<path d="M13.6 3.4H7a1.8 1.8 0 0 0-1.8 1.8v13.6A1.8 1.8 0 0 0 7 20.6h10a1.8 1.8 0 0 0 1.8-1.8V8.6l-5.2-5.2Z"/><path d="M13.4 3.6v5.2h5.2"/><path d="M8.6 13h6.8M8.6 16.4h4.6"/>',

  // Marca y estado
  nutria: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke-width="1.8"/><path d="M7.5 15V9l4.5 4.5 4.5-4.5v6" stroke-width="1.8"/><circle cx="16.5" cy="9" r="1.2" fill="currentColor" stroke="none"/>',
  candado: '<rect x="4.6" y="10.4" width="14.8" height="9.4" rx="2.6"/><path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6"/>',
  chispa: '<path d="M12 3.2l1.9 5.3 5.3 1.9-5.3 1.9-1.9 5.3-1.9-5.3-5.3-1.9 5.3-1.9L12 3.2Z"/>',
  fuego: '<path d="M12 3.4c3.4 3.2 5.4 5.6 5.4 8.6a5.4 5.4 0 0 1-10.8 0c0-1.6.7-2.9 1.8-4.2.3 1.2.9 2 1.8 2.3-.1-2.6.5-4.8 1.8-6.7Z"/>',
  micro: '<rect x="9" y="3.2" width="6" height="10.6" rx="3"/><path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0M12 18v2.8"/>',
  reloj: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3 1.8"/>',
  pasos: '<path d="M13.4 3.6c1.7 0 2.8 1.5 2.8 3.4 0 1.6-.6 2.6-.6 3.8 0 .9.5 1.5.5 2.4 0 1.2-1 2-2.4 2s-2.4-.9-2.4-2.2c0-1.5 1-2.1 1-3.4 0-1.1-.8-1.6-.8-3.2 0-1.7 1-2.8 1.9-2.8Z"/><path d="M8.2 12.4c1.2 0 2 1 2 2.3 0 1.1-.5 1.8-.5 2.6 0 .7.4 1.1.4 1.8 0 .9-.7 1.5-1.8 1.5s-1.8-.7-1.8-1.6c0-1 .7-1.5.7-2.4 0-.8-.6-1.1-.6-2.2 0-1.2.7-2 1.6-2Z"/>',
  monedas: '<ellipse cx="12" cy="6.4" rx="7.4" ry="3.2"/><path d="M4.6 6.4v5.2c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2V6.4"/><path d="M4.6 11.6v5c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2v-5"/>',
  mapa: '<path d="M9.2 4.4 3.6 6.8v12.8l5.6-2.4 5.6 2.4 5.6-2.4V4.4l-5.6 2.4L9.2 4.4Z"/><path d="M9.2 4.4v12.8M14.8 6.8v12.8"/>',
  check: '<path d="M4.8 12.6l4.6 4.6L19.2 7.4"/>',
  veto: '<circle cx="12" cy="12" r="8.4"/><path d="M6.6 6.6l10.8 10.8"/>',
  aviso: '<path d="M12 3.8 21 19.4H3L12 3.8Z"/><path d="M12 9.6v4.2"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>',
  flecha: '<path d="M4.4 12h15.2M13.6 6l6 6-6 6"/>',
  hoja: '<path d="M20 4.2C10.4 3.4 4.6 7.6 4.6 13.8c0 2.4.9 4.4 2 5.8"/><path d="M5.4 19.8C5 12.6 10.6 8.2 20 4.2"/>',
  luna: '<path d="M20 14.4A8.6 8.6 0 0 1 9.6 4 8.8 8.8 0 1 0 20 14.4Z"/>',
  descarga: '<path d="M12 3.6v11M7.4 10l4.6 4.6L16.6 10"/><path d="M4.4 18.4v1.2a1 1 0 0 0 1 1h13.2a1 1 0 0 0 1-1v-1.2"/>',
  subida: '<path d="M12 20.4V9.4M7.4 14l4.6-4.6L16.6 14"/><path d="M4.4 5.6V4.4a1 1 0 0 1 1-1h13.2a1 1 0 0 1 1 1v1.2"/>',
  basura: '<path d="M4.6 6.6h14.8M9.4 6.6V4.8a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.8"/><path d="M6.6 6.6l.9 12.6a1.4 1.4 0 0 0 1.4 1.2h6.2a1.4 1.4 0 0 0 1.4-1.2l.9-12.6"/>',
  semilla: '<path d="M12 20.4V11"/><path d="M12 11c0-3.6 2.6-6.4 6.4-6.8.4 3.8-2.2 6.8-6.4 6.8Z"/><path d="M12 14.2c-3.4 0-5.8-2.4-5.6-5.6 3.2.4 5.6 2.6 5.6 5.6Z"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="2.2"/><path d="M10 3.6v3.4M14 3.6v3.4M10 17v3.4M14 17v3.4M3.6 10H7M3.6 14H7M17 10h3.4M17 14h3.4"/>',
  corazon: '<path d="M12 19.6C6.6 16.2 3.8 13.2 3.8 9.8A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 8.2 1.8c0 3.4-2.8 6.4-8.2 9.8Z"/>',
  ojo: '<path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.8"/>'
};

/**
 * @param {string} nombre  clave de TRAZOS
 * @param {{tam?:number, relleno?:boolean, clase?:string}} opciones
 */
export function icono(nombre, { tam = 24, clase = '' } = {}) {
  const d = TRAZOS[nombre];
  if (!d) return '';
  return `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
    class="${clase}" aria-hidden="true" focusable="false">${d}</svg>`;
}

export const NOMBRES_ICONO = Object.keys(TRAZOS);
