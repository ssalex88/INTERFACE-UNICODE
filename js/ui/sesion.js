/**
 * NUTRIA · Pantalla de ingreso
 * -----------------------------------------------------------------------------
 * Puerta de entrada de la aplicación. En esta fase NO valida contra ninguna
 * base: acepta cualquier usuario y guarda la sesión en este dispositivo, que es
 * lo que necesita el perfil para saludar por su nombre y armar el informe.
 *
 * La contraseña no se guarda, ni cifrada ni en claro: no hay dónde ni contra
 * qué compararla todavía, y guardarla "para después" es cómo empiezan las
 * filtraciones. El campo existe para que el flujo sea el real cuando se conecte
 * el directorio de la universidad.
 */

import { svgMascota } from './mascota.js';
import { icono } from './iconos.js';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const ARGUMENTOS = [
  { icono: 'pluma', texto: 'Cuéntale tu día en una frase. Sin formularios ni contar calorías.' },
  { icono: 'onda', texto: 'Descubre qué se repite en tus semanas: sueño, comidas, plata y carga.' },
  { icono: 'tazon', texto: 'Recibe una opción real de comida cerca del campus, dentro de tu presupuesto.' }
];

/** @param {{error?: string, usuario?: string}} datos */
export function vistaLogin({ error = '', usuario = '' } = {}) {
  return `
    <div class="acceso">
      <section class="acceso__presentacion" aria-hidden="true">
        <div class="acceso__marca">
          <span class="marca__sello"><img src="./inicial-nutria.png" alt="Logo NUTRIA" class="marca__logo-img"></span>
          <span>
            <span class="marca__nombre">Nutria</span>
            <span class="marca__bajada">Bienestar preventivo · ULima</span>
          </span>
        </div>
        <p class="acceso__lema">Tus hábitos no se miden con una balanza.<br>Se leen en lo que te pasa cada semana.</p>
        <ul class="acceso__lista">
          ${ARGUMENTOS.map((a) => `<li>${icono(a.icono, { tam: 17 })}<span>${escapar(a.texto)}</span></li>`).join('')}
        </ul>
        <div class="acceso__nutria">
          <img src="./racha-nutria/Nutria1.png" style="width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,.15));" alt="Nutria compañera">
        </div>
      </section>

      <section class="acceso__panel">
        <div class="acceso__marca acceso__marca--movil">
          <span class="marca__sello"><img src="./inicial-nutria.png" alt="Logo NUTRIA" class="marca__logo-img"></span>
          <span>
            <span class="marca__nombre">Nutria</span>
            <span class="marca__bajada">Bienestar preventivo · ULima</span>
          </span>
        </div>

        <h1 class="titulo acceso__titulo">Entra a tu cuenta</h1>
        <p class="tenue">Tu historial se queda en este dispositivo. Nadie más lo ve.</p>

        <form id="form-acceso" class="acceso__formulario" autocomplete="on">
          <label class="campo">
            <span class="campo__rotulo">Usuario o correo institucional</span>
            <input type="text" name="usuario" id="acceso-usuario" required autocomplete="username"
              inputmode="email" spellcheck="false" placeholder="20231234@aloe.ulima.edu.pe"
              value="${escapar(usuario)}">
          </label>

          <label class="campo">
            <span class="campo__rotulo">Contraseña</span>
            <input type="password" name="clave" id="acceso-clave" required autocomplete="current-password"
              placeholder="••••••••">
          </label>

          ${error ? `<p class="acceso__error" role="alert">${icono('aviso', { tam: 15 })} ${escapar(error)}</p>` : ''}

          <button class="boton acceso__entrar" type="submit">Entrar</button>
        </form>

        <p class="acceso__pie">
          ${icono('candado', { tam: 13 })}
          Piloto ULima. Puedes entrar con cualquier usuario mientras conectamos el directorio de la universidad.
        </p>
      </section>
    </div>`;
}
