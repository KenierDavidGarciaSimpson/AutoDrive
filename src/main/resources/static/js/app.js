/**
 * AutoDrive Motors - arranque de la aplicación
 * Ruta: src/main/resources/static/js/app.js
 *
 * Define las secciones, dibuja el menú y pone en marcha el enrutador.
 * Es el único script que carga index.html.
 *
 * CÓMO SE AGREGA UNA PANTALLA TERMINADA:
 *   1. Crear js/pantallas/<id>.js con `export async function montar(...)`.
 *   2. Cambiar `lista: false` por `lista: true` en la sección de abajo.
 * Mientras `lista` sea false se muestra la vista "en construcción".
 */

import { crearRouter } from './router.js';
import { h, icono, limpiar } from './ui.js';

/**
 * Secciones de la aplicación, en el orden del menú.
 * `etiqueta` es el texto corto del menú (en móvil caben 5); `titulo` es el
 * nombre completo que aparece como encabezado de la pantalla.
 */
const SECCIONES = [
  {
    id: 'panel',
    etiqueta: 'Panel',
    titulo: 'Panel principal',
    descripcion: 'Resumen del inventario, tasa de cambio y últimas ventas.',
    icono: 'panel',
    lista: true,
    cargar: () => import('./pantallas/panel.js'),
  },
  {
    id: 'vehiculos',
    etiqueta: 'Vehículos',
    titulo: 'Vehículos',
    descripcion: 'Inventario con precios en pesos y dólares.',
    icono: 'vehiculos',
    lista: true,
    cargar: () => import('./pantallas/vehiculos.js'),
  },
  {
    id: 'clientes',
    etiqueta: 'Clientes',
    titulo: 'Clientes',
    descripcion: 'Registro y consulta de clientes.',
    icono: 'clientes',
    lista: true,
    cargar: () => import('./pantallas/clientes.js'),
  },
  {
    id: 'ventas',
    etiqueta: 'Ventas',
    titulo: 'Ventas',
    descripcion: 'Registro de ventas y su historial.',
    icono: 'ventas',
    lista: true,
    cargar: () => import('./pantallas/ventas.js'),
  },
  {
    id: 'taller',
    etiqueta: 'Taller',
    titulo: 'Mantenimientos',
    descripcion: 'Registro de mantenimientos e historial por vehículo.',
    icono: 'taller',
    lista: false,
    cargar: () => import('./pantallas/taller.js'),
  },
];

const SECCION_INICIAL = 'panel';

/* --------------------------------------------------------------------------
   Menú
   -------------------------------------------------------------------------- */

const listaMenu = document.getElementById('menu-lista');

/** Dibuja los 5 enlaces del menú a partir de SECCIONES (única fuente de verdad). */
function dibujarMenu() {
  limpiar(listaMenu).append(
    ...SECCIONES.map((s) =>
      h(
        'li',
        {},
        h(
          'a',
          { class: 'navegacion__enlace', href: `#/${s.id}`, dataset: { seccion: s.id } },
          h('span', { class: 'navegacion__icono' }, icono(s.icono)),
          h('span', { class: 'navegacion__texto' }, s.etiqueta),
        ),
      ),
    ),
  );
}

/** Marca la sección actual con aria-current (el CSS la resalta; nunca solo color). */
function marcarSeccionActual(ruta) {
  for (const enlace of listaMenu.querySelectorAll('.navegacion__enlace')) {
    if (ruta && enlace.dataset.seccion === ruta.id) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
}

/* --------------------------------------------------------------------------
   Arranque
   -------------------------------------------------------------------------- */

dibujarMenu();

const router = crearRouter({
  rutas: SECCIONES,
  porDefecto: SECCION_INICIAL,
  contenedor: document.getElementById('contenido'),
  alCambiar: marcarSeccionActual,
});

router.iniciar();
