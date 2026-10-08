/**
 * AutoDrive Motors - vitrina pública
 * Ruta: src/main/resources/static/js/vitrina.js
 *
 * Pinta los vehículos disponibles como tarjetas (GET /vehiculos/disponibles) y
 * la tasa de cambio (GET /tasa-cambio). El USD se calcula aquí: una sola
 * llamada a la tasa, no una por vehículo. Si la tasa falla, la vitrina sigue
 * funcionando sin los valores en dólares.
 *
 * Los datos del servidor se insertan siempre como texto (h() nunca usa innerHTML).
 */

import { api } from './api.js';
import { calcularVistaPreviaVenta, formatearCOP, formatearTasa, formatearUSD } from './format.js';
import { h } from './ui.js';

const zonaLista = document.getElementById('lista');
const zonaFiltros = document.getElementById('filtros');
const zonaResumen = document.getElementById('resumen');
const zonaTasa = document.getElementById('tasa');

const CANTIDAD_ESQUELETOS = 3;

const estado = {
  vehiculos: [],
  tasa: null,   // pesos por dólar, o null si no se pudo obtener
  marca: '',    // marca elegida en minúsculas; '' = todas
};

/* --------------------------------------------------------------------------
   Utilidades
   -------------------------------------------------------------------------- */

const comparar = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });

/** Ordena por marca y modelo, ignorando mayúsculas y tildes. */
function ordenar(lista) {
  return [...lista].sort((a, b) => comparar(a.marca, b.marca) || comparar(a.modelo, b.modelo));
}

/** Marcas distintas sin importar mayúsculas: [{ clave: 'mazda', texto: 'Mazda' }]. */
function marcasDistintas(lista) {
  const porClave = new Map();
  for (const v of lista) {
    const clave = v.marca.trim().toLowerCase();
    const texto = v.marca.trim();
    const actual = porClave.get(clave);
    // Si la marca llega con distinta escritura ("mazda" y "Mazda"), se muestra la que tiene mayúsculas
    if (actual === undefined || (actual === clave && texto !== clave)) porClave.set(clave, texto);
  }
  return [...porClave.entries()]
    .map(([clave, texto]) => ({ clave, texto }))
    .sort((a, b) => comparar(a.texto, b.texto));
}

/* --------------------------------------------------------------------------
   Piezas
   -------------------------------------------------------------------------- */

function crearTarjeta(vehiculo) {
  const vista = calcularVistaPreviaVenta(vehiculo.precio);
  return h(
    'li',
    { class: 'tarjeta' },
    h(
      'h3',
      { class: 'tarjeta__nombre' },
      h('span', { class: 'tarjeta__marca' }, vehiculo.marca),
      ' ',
      h('span', {}, vehiculo.modelo),
    ),
    h('p', { class: 'tarjeta__anio' }, `Modelo ${vehiculo.anio}`),
    h('p', { class: 'tarjeta__precio' }, formatearCOP(vehiculo.precio)),
    estado.tasa && h('p', { class: 'tarjeta__usd' }, `Aprox. ${formatearUSD(Number(vehiculo.precio) / estado.tasa)}`),
    vista.aplicaDescuento &&
      h('p', { class: 'tarjeta__descuento' }, `Con 5 % de descuento: ${formatearCOP(vista.total)}`),
    h('span', { class: 'placa-mini' }, vehiculo.placa),
  );
}

function crearEsqueleto() {
  return h(
    'li',
    { class: 'tarjeta tarjeta--esqueleto', 'aria-hidden': 'true' },
    h('span', { class: 'esq esq--nombre' }),
    h('span', { class: 'esq esq--dato' }),
    h('span', { class: 'esq esq--precio' }),
  );
}

/* --------------------------------------------------------------------------
   Pintado
   -------------------------------------------------------------------------- */

function pintarFiltros() {
  const marcas = marcasDistintas(estado.vehiculos);
  // Con una sola marca no hay nada que filtrar
  zonaFiltros.hidden = marcas.length < 2;
  if (zonaFiltros.hidden) return;

  const opciones = [{ clave: '', texto: 'Todos' }, ...marcas];
  zonaFiltros.replaceChildren(
    ...opciones.map((opcion) =>
      h(
        'button',
        {
          class: 'filtro',
          type: 'button',
          'aria-pressed': String(opcion.clave === estado.marca),
          dataset: { clave: opcion.clave },
          onclick: () => elegirMarca(opcion.clave),
        },
        opcion.texto,
      ),
    ),
  );
}

function elegirMarca(clave) {
  estado.marca = clave;
  // Solo se actualiza el estado de los botones: así el foco no se pierde
  for (const boton of zonaFiltros.querySelectorAll('.filtro')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.clave === clave));
  }
  pintarLista();
}

function pintarLista() {
  zonaLista.removeAttribute('aria-busy');
  const total = estado.vehiculos.length;

  if (total === 0) {
    zonaResumen.textContent = 'No hay vehículos disponibles.';
    zonaLista.replaceChildren(
      h(
        'li',
        { class: 'mensaje' },
        h('h3', { class: 'mensaje__titulo' }, 'No hay vehículos disponibles por ahora.'),
        h('p', {}, 'Los vehículos que se venden o entran a mantenimiento salen de esta lista.'),
      ),
    );
    return;
  }

  const visibles = estado.vehiculos.filter(
    (v) => !estado.marca || v.marca.trim().toLowerCase() === estado.marca,
  );
  zonaResumen.textContent = `Mostrando ${visibles.length} de ${total} ${
    total === 1 ? 'vehículo disponible' : 'vehículos disponibles'
  }.`;
  zonaLista.replaceChildren(...visibles.map(crearTarjeta));
}

function pintarError(error) {
  zonaLista.removeAttribute('aria-busy');
  zonaFiltros.hidden = true;
  zonaTasa.textContent = '';
  zonaResumen.textContent = 'No se pudieron cargar los vehículos.';

  const detalle = error?.mensajesUsuario?.[0] ?? 'No pudimos conectar con el servidor.';
  zonaLista.replaceChildren(
    h(
      'li',
      { class: 'mensaje' },
      h(
        'div',
        { role: 'alert' },
        h('h3', { class: 'mensaje__titulo' }, 'No pudimos cargar los vehículos.'),
        h('p', {}, detalle),
      ),
      h('button', { class: 'boton boton--primario', type: 'button', onclick: cargar }, 'Intentar de nuevo'),
    ),
  );
}

/* --------------------------------------------------------------------------
   Carga
   -------------------------------------------------------------------------- */

async function cargar() {
  zonaLista.setAttribute('aria-busy', 'true');
  zonaFiltros.hidden = true;
  zonaTasa.textContent = '';
  zonaResumen.textContent = 'Cargando vehículos…';
  zonaLista.replaceChildren(...Array.from({ length: CANTIDAD_ESQUELETOS }, crearEsqueleto));

  // La tasa es opcional: si falla, no tumba la lista
  const [vehiculos, tasa] = await Promise.allSettled([
    api.vehiculos.disponibles(),
    api.tasaCambio.obtener(),
  ]);

  if (vehiculos.status === 'rejected') {
    pintarError(vehiculos.reason);
    return;
  }

  const valorTasa = tasa.status === 'fulfilled' ? Number(tasa.value?.copPorUsd) : NaN;
  estado.vehiculos = ordenar(vehiculos.value);
  estado.tasa = Number.isFinite(valorTasa) && valorTasa > 0 ? valorTasa : null;
  estado.marca = '';

  zonaTasa.textContent = estado.tasa
    ? `Tasa de cambio actual: ${formatearTasa(estado.tasa)} por dólar.`
    : '';
  pintarFiltros();
  pintarLista();
}

cargar();
