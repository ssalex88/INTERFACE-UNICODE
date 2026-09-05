/**
 * NUTRIA · Vista y Editor de Perfil Alimentario (HU-02)
 * -----------------------------------------------------------------------------
 * Renderiza el módulo de consulta y edición de restricciones y preferencias
 * alimentarias dentro de la sección "Tus datos".
 *
 * Flujo:
 * Tus datos
 * └── Perfil alimentario
 *     ├── Alergias conocidas
 *     ├── Intolerancias
 *     ├── Alimentos evitados
 *     ├── Preferencias
 *     └── Restricciones declaradas
 */

import {
  TIPOS_RESTRICCION,
  ALERGENOS_CATALOGO,
  PREFERENCIAS_CATALOGO,
  ESTADO_UNKNOWN
} from './dietary-catalog.js';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderDietaryProfileView(perfil) {
  const p = perfil || {};

  const esUnknown = (val) => val === ESTADO_UNKNOWN || val === undefined;
  const tieneElementos = (val) => Array.isArray(val) && val.length > 0;
  const esNinguna = (val) => Array.isArray(val) && val.length === 0;

  const renderBadgeEstado = (val) => {
    if (esUnknown(val)) return '<span class="pill pill--info">Sin responder (opcional)</span>';
    if (esNinguna(val)) return '<span class="pill pill--ok">Ninguna declarada</span>';
    return `<span class="pill pill--atencion">${val.length} seleccionada(s)</span>`;
  };

  const renderOpcionesCheck = (campo, itemsSeleccionados, catalogo) => {
    const seleccionados = Array.isArray(itemsSeleccionados) ? itemsSeleccionados : [];
    return catalogo.map((item) => {
      const checked = seleccionados.includes(item.id) ? 'checked' : '';
      return `
        <label class="item-seleccion">
          <input type="checkbox" name="${campo}" value="${item.id}" ${checked}>
          <span class="item-seleccion__texto">
            <strong>${escapar(item.nombre)}</strong>
            ${item.descripcion ? `<span class="item-seleccion__desc">${escapar(item.descripcion)}</span>` : ''}
          </span>
        </label>
      `;
    }).join('');
  };

  return `
    <section class="tarjeta tarjeta--realce bloque-perfil-alimentario" id="seccion-perfil-alimentario">
      <div class="tarjeta__cabecera">
        <div>
          <span class="tarjeta__etiqueta">Salud & Preferencias (HU-01 / HU-02)</span>
          <h3 class="subtitulo" style="font-size:1.15rem; font-weight:600">Perfil Alimentario</h3>
        </div>
        <span class="pill pill--ok">100% local en tu equipo</span>
      </div>

      <p class="tenue" style="margin:.4rem 0 .9rem">
        Registra voluntariamente tus restricciones para filtrar automáticamente las opciones de comida del campus.
        <strong>No almacenamos diagnósticos médicos</strong> y nada sale de este navegador.
      </p>

      <form id="form-dietary-profile" class="dietary-accordion">
        <!-- 1. Alergias conocidas -->
        <details class="acordeon-item" open>
          <summary class="acordeon-item__header">
            <div class="acordeon-item__titulo">
              <span class="status-indicator status-indicator--critico"></span>
              <strong>Alergias conocidas</strong>
              <small>Causa descarte preventivo de platos</small>
            </div>
            ${renderBadgeEstado(p.alergias_conocidas)}
          </summary>
          <div class="acordeon-item__cuerpo">
            <p class="micro">Selecciona alérgenos que te provoquen reacción adversa o marca "Ninguna":</p>
            <div class="lista-checkboxes">
              ${renderOpcionesCheck('alergias_conocidas', p.alergias_conocidas, ALERGENOS_CATALOGO)}
            </div>
            <div class="acordeon-item__acciones">
              <button type="button" class="btn-micro" data-accion="declarar-ninguna" data-campo="alergias_conocidas">Declarar ninguna</button>
              <button type="button" class="btn-micro btn-micro--fantasma" data-accion="limpiar-campo" data-campo="alergias_conocidas">Sin responder</button>
            </div>
          </div>
        </details>

        <!-- 2. Intolerancias conocidas -->
        <details class="acordeon-item" open>
          <summary class="acordeon-item__header">
            <div class="acordeon-item__titulo">
              <span class="status-indicator status-indicator--advertencia"></span>
              <strong>Intolerancias conocidas</strong>
              <small>Muestra advertencia clara sobre el plato</small>
            </div>
            ${renderBadgeEstado(p.intolerancias_conocidas)}
          </summary>
          <div class="acordeon-item__cuerpo">
            <div class="lista-checkboxes">
              ${renderOpcionesCheck('intolerancias_conocidas', p.intolerancias_conocidas, [
                { id: 'lactosa', nombre: 'Lactosa (lácteos, leche, queso)' },
                { id: 'gluten', nombre: 'Gluten (trigo, harinas no celíaco)' }
              ])}
            </div>
            <div class="acordeon-item__acciones">
              <button type="button" class="btn-micro" data-accion="declarar-ninguna" data-campo="intolerancias_conocidas">Declarar ninguna</button>
              <button type="button" class="btn-micro btn-micro--fantasma" data-accion="limpiar-campo" data-campo="intolerancias_conocidas">Sin responder</button>
            </div>
          </div>
        </details>

        <!-- 3. Alimentos evitados -->
        <details class="acordeon-item">
          <summary class="acordeon-item__header">
            <div class="acordeon-item__titulo">
              <span class="status-indicator"></span>
              <strong>Alimentos evitados</strong>
              <small>Penaliza en el ranking de opciones</small>
            </div>
            ${renderBadgeEstado(p.alimentos_evitados)}
          </summary>
          <div class="acordeon-item__cuerpo">
            <div class="lista-checkboxes">
              ${renderOpcionesCheck('alimentos_evitados', p.alimentos_evitados, [
                { id: 'frituras', nombre: 'Frituras / grasa pesada' },
                { id: 'picante', nombre: 'Ají y comida muy condimentada' },
                { id: 'ultraprocesados', nombre: 'Snacks empaquetados' },
                { id: 'cerdo', nombre: 'Carne de cerdo' }
              ])}
            </div>
            <div class="acordeon-item__acciones">
              <button type="button" class="btn-micro" data-accion="declarar-ninguna" data-campo="alimentos_evitados">Declarar ninguno</button>
              <button type="button" class="btn-micro btn-micro--fantasma" data-accion="limpiar-campo" data-campo="alimentos_evitados">Sin responder</button>
            </div>
          </div>
        </details>

        <!-- 4. Preferencias alimentarias -->
        <details class="acordeon-item" open>
          <summary class="acordeon-item__header">
            <div class="acordeon-item__titulo">
              <span class="status-indicator status-indicator--preferencia"></span>
              <strong>Preferencias alimentarias</strong>
              <small>Filtro de estilo dietético</small>
            </div>
            ${renderBadgeEstado(p.preferencias_alimentarias)}
          </summary>
          <div class="acordeon-item__cuerpo">
            <div class="lista-checkboxes">
              ${renderOpcionesCheck('preferencias_alimentarias', p.preferencias_alimentarias, PREFERENCIAS_CATALOGO)}
            </div>
            <div class="acordeon-item__acciones">
              <button type="button" class="btn-micro" data-accion="declarar-ninguna" data-campo="preferencias_alimentarias">Ninguna</button>
              <button type="button" class="btn-micro btn-micro--fantasma" data-accion="limpiar-campo" data-campo="preferencias_alimentarias">Sin responder</button>
            </div>
          </div>
        </details>

        <!-- 5. Restricciones declaradas por profesional -->
        <details class="acordeon-item">
          <summary class="acordeon-item__header">
            <div class="acordeon-item__titulo">
              <span class="status-indicator status-indicator--profesional"></span>
              <strong>Restricciones indicadas por profesional</strong>
              <small>Indicación médica concreta declarada</small>
            </div>
            ${renderBadgeEstado(p.restricciones_profesionales)}
          </summary>
          <div class="acordeon-item__cuerpo">
            <p class="micro">Registra restricciones que un médico o nutricionista te haya prescrito formalmente:</p>
            <div class="lista-checkboxes">
              ${renderOpcionesCheck('restricciones_profesionales', p.restricciones_profesionales, [
                { id: 'gluten', nombre: 'Celiaquía / Exclusión estricta de gluten' },
                { id: 'lactosa', nombre: 'Exclusión estricta de lactosa' },
                { id: 'mani', nombre: 'Exclusión estricta de maní' },
                { id: 'bajo_sodio', nombre: 'Restricción severa de sal/sodio' }
              ])}
            </div>
            <div class="acordeon-item__acciones">
              <button type="button" class="btn-micro" data-accion="declarar-ninguna" data-campo="restricciones_profesionales">Declarar ninguna</button>
              <button type="button" class="btn-micro btn-micro--fantasma" data-accion="limpiar-campo" data-campo="restricciones_profesionales">Sin responder</button>
            </div>
          </div>
        </details>

        <!-- Botonera de guardado -->
        <div class="acciones" style="margin-top:1.1rem; justify-content:space-between">
          <button class="boton" type="submit" id="btn-guardar-perfil-alimentario">Guardar perfil alimentario</button>
          <button class="boton boton--fantasma" type="button" id="btn-restablecer-perfil-alimentario" title="Restablece solo el perfil alimentario a sin responder">Restablecer perfil</button>
        </div>
      </form>
    </section>
  `;
}
