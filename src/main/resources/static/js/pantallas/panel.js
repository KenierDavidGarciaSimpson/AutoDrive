/**
 * AutoDrive Motors - pantalla del Panel principal (dashboard)
 * Ruta: src/main/resources/static/js/pantallas/panel.js
 *
 * - Indicadores: ventas, ingresos, vehículos disponibles y tasa de cambio.
 * - Gráfico de líneas: ingresos por ventas y costo de mantenimientos, últimos 6 meses.
 * - Dona: vehículos por estado.
 * - Tabla: últimas ventas.
 *
 * Si fallan las ventas o los vehículos se muestra el error con "Intentar de nuevo".
 * La tasa de cambio (servicio externo) y los mantenimientos son opcionales: si
 * fallan, el resto del panel se muestra igual y esa pieza lo avisa.
 */

import { api } from '../api.js';
import { formatearCOP, formatearEntero, formatearFecha, formatearTasa } from '../format.js';
import {
  crearEncabezado,
  crearEstadoCarga,
  crearEstadoError,
  crearPlaca,
  crearTabla,
  h,
  icono,
} from '../ui.js';

const MESES_GRAFICO = 6;
const ESPACIO_SVG = 'http://www.w3.org/2000/svg';
const LOCALE = 'es-CO';

/* --------------------------------------------------------------------------
   Utilidades de fechas y números
   -------------------------------------------------------------------------- */

const claveMes = (anio, mes0) => `${anio}-${String(mes0 + 1).padStart(2, '0')}`;

/** "2026-03-15T14:30:00" o "2026-03-15" -> "2026-03". Sin pasar por Date: no hay desfase de zona horaria. */
const claveDeTexto = (texto) => (typeof texto === 'string' ? texto.slice(0, 7) : '');

/** Últimos `n` meses terminando en el actual: [{ clave, corto, largo }] */
function ultimosMeses(n) {
  const hoy = new Date();
  const lista = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push({
      clave: claveMes(fecha.getFullYear(), fecha.getMonth()),
      corto: fecha.toLocaleDateString(LOCALE, { month: 'short' }).replace(/\./g, ''),
      largo: fecha.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }),
    });
  }
  return lista;
}

function sumarPorMes(registros, campoFecha, campoValor) {
  const porMes = new Map();
  for (const r of registros) {
    const clave = claveDeTexto(r[campoFecha]);
    porMes.set(clave, (porMes.get(clave) ?? 0) + Number(r[campoValor] ?? 0));
  }
  return porMes;
}

function contarPorMes(registros, campoFecha) {
  const porMes = new Map();
  for (const r of registros) {
    const clave = claveDeTexto(r[campoFecha]);
    porMes.set(clave, (porMes.get(clave) ?? 0) + 1);
  }
  return porMes;
}

/** Paso "redondo" para el eje: 1, 2, 2.5, 5 o 10 por una potencia de 10. */
function pasoEje(maximo, intervalos = 4) {
  const bruto = maximo / intervalos;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? potencia * 10;
  return paso;
}

const formatoDecimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

function svg(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElementNS(ESPACIO_SVG, etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v !== null && v !== undefined && v !== false) el.setAttribute(k, String(v));
  }
  for (const hijo of hijos) {
    if (hijo !== null && hijo !== undefined) el.append(hijo);
  }
  return el;
}

/* --------------------------------------------------------------------------
   Indicadores
   -------------------------------------------------------------------------- */

function crearIndicador({ etiqueta, valor, nota, iconoNombre, principal = false, tendencia }) {
  const claseNota = tendencia ? `indicador__nota indicador__nota--${tendencia.sentido}` : 'indicador__nota';
  return h(
    'article',
    { class: principal ? 'indicador indicador--principal' : 'indicador' },
    h(
      'div',
      { class: 'indicador__cabecera' },
      h('h2', { class: 'indicador__etiqueta' }, etiqueta),
      h('span', { class: 'indicador__icono' }, icono(iconoNombre)),
    ),
    h('p', { class: 'indicador__valor' }, valor),
    h(
      'p',
      { class: claseNota },
      tendencia && icono(tendencia.sentido === 'sube' ? 'sube' : 'baja'),
      nota,
    ),
  );
}

/** Compara este mes con el anterior. Devuelve { sentido, texto } o null si no hay base de comparación. */
function variacion(actual, anterior) {
  if (!anterior) return null;
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  if (pct === 0) return null;
  return {
    sentido: pct > 0 ? 'sube' : 'baja',
    texto: `${pct > 0 ? '+' : '−'}${formatearEntero(Math.abs(pct))} % frente al mes anterior`,
  };
}

function crearIndicadores({ ventas, vehiculos, tasa }) {
  const hoy = new Date();
  const mesActual = claveMes(hoy.getFullYear(), hoy.getMonth());
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const mesPrevio = claveMes(anterior.getFullYear(), anterior.getMonth());

  const conteo = contarPorMes(ventas, 'fecha');
  const ingresos = sumarPorMes(ventas, 'fecha', 'total');
  const ventasMes = conteo.get(mesActual) ?? 0;
  const ingresosMes = ingresos.get(mesActual) ?? 0;

  const tendenciaVentas = variacion(ventasMes, conteo.get(mesPrevio) ?? 0);
  const totalIngresos = ventas.reduce((suma, v) => suma + Number(v.total ?? 0), 0);
  const disponibles = vehiculos.filter((v) => v.estado === 'DISPONIBLE').length;

  return h(
    'section',
    { class: 'indicadores', 'aria-label': 'Indicadores principales' },
    crearIndicador({
      etiqueta: 'Ventas realizadas',
      valor: formatearEntero(ventas.length),
      nota: tendenciaVentas
        ? tendenciaVentas.texto
        : `${formatearEntero(ventasMes)} ${ventasMes === 1 ? 'venta' : 'ventas'} este mes`,
      tendencia: tendenciaVentas,
      iconoNombre: 'ventas',
      principal: true,
    }),
    crearIndicador({
      etiqueta: 'Ingresos totales',
      valor: formatearCOP(totalIngresos),
      nota: `Este mes: ${formatearCOP(ingresosMes)}`,
      iconoNombre: 'dinero',
    }),
    crearIndicador({
      etiqueta: 'Vehículos disponibles',
      valor: formatearEntero(disponibles),
      nota: `de ${formatearEntero(vehiculos.length)} en inventario`,
      iconoNombre: 'vehiculos',
    }),
    crearIndicador({
      etiqueta: 'Tasa de cambio',
      valor: tasa ? formatearTasa(tasa.copPorUsd) : '—',
      nota: tasa ? 'Pesos por cada dólar' : 'No disponible por ahora',
      iconoNombre: 'cambio',
    }),
  );
}

/* --------------------------------------------------------------------------
   Tarjeta contenedora
   -------------------------------------------------------------------------- */

function crearTarjeta({ titulo, enlace, etiquetaEnlace, clase = '' }, ...contenido) {
  return h(
    'section',
    { class: `tarjeta ${clase}`.trim() },
    h(
      'div',
      { class: 'tarjeta__cabecera' },
      h('h2', { class: 'tarjeta__titulo' }, titulo),
      enlace && h('a', { class: 'tarjeta__enlace', href: enlace, 'aria-label': etiquetaEnlace }, icono('siguiente')),
    ),
    ...contenido,
  );
}

function crearLeyenda(series) {
  return h(
    'ul',
    { class: 'leyenda', role: 'list' },
    series.map((s) =>
      h(
        'li',
        {},
        h('span', {
          class: s.punteada ? 'leyenda__trazo leyenda__trazo--punteado' : 'leyenda__trazo',
          style: `--serie: ${s.color}`,
          'aria-hidden': 'true',
        }),
        s.nombre,
      ),
    ),
  );
}

/* --------------------------------------------------------------------------
   Gráfico de líneas (SVG propio: el proyecto no usa librerías externas)
   -------------------------------------------------------------------------- */

/** Curva suave que nunca se sale del rango de sus dos puntos (sin "rebotes" bajo cero). */
function trazoSuave(puntos) {
  if (puntos.length === 1) return `M${puntos[0].x},${puntos[0].y}`;
  let d = `M${puntos[0].x},${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const limite = (y) => Math.min(Math.max(y, Math.min(p1.y, p2.y)), Math.max(p1.y, p2.y));
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = limite(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = limite(p2.y - (p3.y - p1.y) / 6);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function crearGraficoLineas({ meses, series }) {
  const raiz = h('div', { class: 'lineas' });
  const globo = h('div', { class: 'globo', hidden: true, 'aria-hidden': 'true' });
  raiz.append(globo);

  const maximoDatos = Math.max(0, ...series.flatMap((s) => s.valores));
  const paso = pasoEje(maximoDatos > 0 ? maximoDatos : 1);
  const tope = paso * Math.max(1, Math.ceil(maximoDatos / paso));
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  const enMillones = tope >= 1_000_000;

  const etiquetaEje = (v) => {
    if (v === 0) return '$0';
    return enMillones ? `$${formatoDecimal.format(v / 1_000_000)} M` : formatearCOP(v);
  };

  let anchoPrevio = 0;
  let indiceActivo = -1;

  function dibujar() {
    const ancho = Math.max(280, Math.floor(raiz.clientWidth));
    const alto = ancho < 480 ? 220 : 260;
    anchoPrevio = ancho;

    const margen = { izq: enMillones ? 56 : 84, der: 14, sup: 12, inf: 28 };
    const anchoUtil = ancho - margen.izq - margen.der;
    const altoUtil = alto - margen.sup - margen.inf;
    const x = (i) => margen.izq + (meses.length === 1 ? anchoUtil / 2 : (i * anchoUtil) / (meses.length - 1));
    const y = (v) => margen.sup + altoUtil - (v / tope) * altoUtil;

    const lienzo = svg('svg', {
      viewBox: `0 0 ${ancho} ${alto}`,
      width: ancho,
      height: alto,
      role: 'img',
      'aria-label': `Gráfico de líneas de los últimos ${meses.length} meses: ${series.map((s) => s.nombre).join(' y ')}. Los datos están en la tabla de abajo.`,
    });

    for (const marca of marcas) {
      lienzo.append(
        svg('line', { class: 'lineas__rejilla', x1: margen.izq, x2: ancho - margen.der, y1: y(marca), y2: y(marca) }),
        svg('text', { class: 'lineas__eje', x: margen.izq - 8, y: y(marca) + 4, 'text-anchor': 'end' }, etiquetaEje(marca)),
      );
    }
    meses.forEach((m, i) => {
      lienzo.append(svg('text', { class: 'lineas__eje', x: x(i), y: alto - 8, 'text-anchor': 'middle' }, m.corto));
    });

    for (const serie of series) {
      const puntos = serie.valores.map((v, i) => ({ x: x(i), y: y(v) }));
      lienzo.append(
        svg('path', {
          class: serie.punteada ? 'lineas__serie lineas__serie--punteada' : 'lineas__serie',
          style: `--serie: ${serie.color}`,
          d: trazoSuave(puntos),
        }),
      );
    }

    const guia = svg('line', { class: 'lineas__guia', y1: margen.sup, y2: margen.sup + altoUtil, visibility: 'hidden' });
    const circulos = series.map((s) =>
      svg('circle', { class: 'lineas__punto', r: 4.5, style: `--serie: ${s.color}`, visibility: 'hidden' }),
    );
    lienzo.append(guia, ...circulos);

    function mostrar(i) {
      indiceActivo = i;
      guia.setAttribute('x1', x(i));
      guia.setAttribute('x2', x(i));
      guia.removeAttribute('visibility');
      circulos.forEach((c, k) => {
        c.setAttribute('cx', x(i));
        c.setAttribute('cy', y(series[k].valores[i]));
        c.removeAttribute('visibility');
      });

      globo.replaceChildren(
        h('div', { class: 'globo__titulo' }, meses[i].largo),
        ...series.map((s) =>
          h(
            'div',
            { class: 'globo__fila' },
            h('span', {
              class: s.punteada ? 'leyenda__trazo leyenda__trazo--punteado' : 'leyenda__trazo',
              style: `--serie: ${s.color}`,
              'aria-hidden': 'true',
            }),
            h('span', { class: 'globo__nombre' }, s.nombre),
            h('span', { class: 'globo__valor' }, formatearCOP(s.valores[i])),
          ),
        ),
      );
      globo.hidden = false;
      const izquierda = x(i) + 14;
      const anchoGlobo = globo.offsetWidth;
      globo.style.left = `${izquierda + anchoGlobo > ancho ? Math.max(0, x(i) - 14 - anchoGlobo) : izquierda}px`;
      globo.style.top = `${margen.sup}px`;
    }

    function ocultar() {
      indiceActivo = -1;
      guia.setAttribute('visibility', 'hidden');
      circulos.forEach((c) => c.setAttribute('visibility', 'hidden'));
      globo.hidden = true;
    }

    const indiceCercano = (evento) => {
      const caja = lienzo.getBoundingClientRect();
      const px = ((evento.clientX - caja.left) / caja.width) * ancho;
      const i = Math.round(((px - margen.izq) / anchoUtil) * (meses.length - 1));
      return Math.min(meses.length - 1, Math.max(0, i));
    };

    // Zona sensible: todo el área del gráfico, mucho más grande que la línea
    const zona = svg('rect', {
      class: 'lineas__zona',
      x: margen.izq,
      y: margen.sup,
      width: anchoUtil,
      height: altoUtil,
      tabindex: 0,
      role: 'group',
      'aria-label': 'Valores por mes; usa las flechas izquierda y derecha',
    });
    zona.addEventListener('pointermove', (e) => mostrar(indiceCercano(e)));
    zona.addEventListener('pointerdown', (e) => mostrar(indiceCercano(e)));
    zona.addEventListener('pointerleave', () => { if (document.activeElement !== zona) ocultar(); });
    zona.addEventListener('focus', () => mostrar(indiceActivo >= 0 ? indiceActivo : meses.length - 1));
    zona.addEventListener('blur', ocultar);
    zona.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const actual = indiceActivo >= 0 ? indiceActivo : meses.length - 1;
      mostrar(Math.min(meses.length - 1, Math.max(0, actual + (e.key === 'ArrowRight' ? 1 : -1))));
    });
    lienzo.append(zona);

    globo.hidden = true;
    raiz.replaceChildren(lienzo, globo);
  }

  const observador = new ResizeObserver(() => {
    if (Math.floor(raiz.clientWidth) !== anchoPrevio) dibujar();
  });
  observador.observe(raiz);

  return { elemento: raiz, destruir: () => observador.disconnect() };
}

/** Los mismos datos del gráfico en una tabla, para quien no puede usar el gráfico. */
function crearTablaDatos({ meses, series }) {
  const tabla = crearTabla({
    etiqueta: 'Ingresos y costo de mantenimientos por mes',
    columnas: [
      { titulo: 'Mes', render: (f) => h('span', { class: 'primera-mayuscula' }, f.mes) },
      ...series.map((s, k) => ({
        titulo: s.nombre,
        alinear: 'derecha',
        render: (f) => formatearCOP(f.valores[k]),
      })),
    ],
    filas: meses.map((m, i) => ({ mes: m.largo, valores: series.map((s) => s.valores[i]) })),
  });
  return h(
    'details',
    { class: 'tarjeta__datos' },
    h('summary', {}, 'Ver los datos en una tabla'),
    tabla,
  );
}

function crearTarjetaVentas({ ventas, mantenimientos }) {
  const meses = ultimosMeses(MESES_GRAFICO);
  const ingresos = sumarPorMes(ventas, 'fecha', 'total');
  const series = [
    { nombre: 'Ingresos por ventas', color: 'var(--g-1)', valores: meses.map((m) => ingresos.get(m.clave) ?? 0) },
  ];

  if (mantenimientos) {
    const costos = sumarPorMes(mantenimientos, 'fecha', 'costo');
    series.push({
      nombre: 'Costo del taller',
      color: 'var(--g-2)',
      punteada: true,
      valores: meses.map((m) => costos.get(m.clave) ?? 0),
    });
  }

  const hayDatos = series.some((s) => s.valores.some((v) => v > 0));
  const cuerpo = [];
  let destruir = null;

  if (!hayDatos) {
    cuerpo.push(h('p', { class: 'tarjeta__vacio' }, 'Cuando registres ventas, aquí verás cómo evolucionan mes a mes.'));
  } else {
    if (series.length > 1) cuerpo.push(crearLeyenda(series));
    const grafico = crearGraficoLineas({ meses, series });
    destruir = grafico.destruir;
    cuerpo.push(grafico.elemento, crearTablaDatos({ meses, series }));
    if (!mantenimientos) {
      cuerpo.push(h('p', { class: 'tarjeta__nota' }, 'No pudimos cargar el costo del taller; se muestran solo las ventas.'));
    }
  }

  return {
    elemento: crearTarjeta(
      { titulo: 'Rendimiento de ventas', enlace: '#/ventas', etiquetaEnlace: 'Ir a ventas' },
      ...cuerpo,
    ),
    destruir,
  };
}

/* --------------------------------------------------------------------------
   Dona: vehículos por estado
   -------------------------------------------------------------------------- */

const ESTADOS_DONA = [
  { clave: 'DISPONIBLE', nombre: 'Disponibles', color: 'var(--g-3)' },
  { clave: 'VENDIDO', nombre: 'Vendidos', color: 'var(--g-1)' },
  { clave: 'EN_MANTENIMIENTO', nombre: 'En mantenimiento', color: 'var(--g-2)' },
];

function crearTarjetaInventario(vehiculos) {
  const total = vehiculos.length;
  const partes = ESTADOS_DONA.map((e) => ({ ...e, cantidad: vehiculos.filter((v) => v.estado === e.clave).length }));

  if (total === 0) {
    return crearTarjeta(
      { titulo: 'Inventario por estado', enlace: '#/vehiculos', etiquetaEnlace: 'Ir a vehículos' },
      h('p', { class: 'tarjeta__vacio' }, 'Todavía no hay vehículos registrados.'),
    );
  }

  const radio = 46;
  const grosor = 14;
  const circunferencia = 2 * Math.PI * radio;
  const visibles = partes.filter((p) => p.cantidad > 0);
  const hueco = visibles.length > 1 ? 2 : 0; // separación entre tramos, como el borde de la superficie
  let acumulado = 0;

  const lienzo = svg(
    'svg',
    { viewBox: '0 0 120 120', role: 'img', 'aria-label': `Vehículos por estado, ${total} en total. El detalle está en la lista.` },
    svg('circle', { class: 'dona__pista', cx: 60, cy: 60, r: radio, 'stroke-width': grosor }),
  );
  for (const p of visibles) {
    const largo = (p.cantidad / total) * circunferencia;
    lienzo.append(
      svg(
        'circle',
        {
          class: 'dona__tramo',
          cx: 60,
          cy: 60,
          r: radio,
          'stroke-width': grosor,
          stroke: p.color,
          'stroke-dasharray': `${Math.max(largo - hueco, 0.5)} ${circunferencia}`,
          'stroke-dashoffset': -acumulado,
        },
        svg('title', {}, `${p.nombre}: ${p.cantidad}`),
      ),
    );
    acumulado += largo;
  }

  const lista = h(
    'ul',
    { class: 'dona__lista', role: 'list' },
    partes.map((p) =>
      h(
        'li',
        { class: 'dona__item' },
        h('span', { class: 'dona__color', style: `--serie: ${p.color}`, 'aria-hidden': 'true' }),
        h('span', {}, p.nombre),
        h('span', { class: 'dona__cifra' }, formatearEntero(p.cantidad)),
        h('span', { class: 'dona__pct' }, `${formatearEntero(Math.round((p.cantidad / total) * 100))} %`),
      ),
    ),
  );

  return crearTarjeta(
    { titulo: 'Inventario por estado', enlace: '#/vehiculos', etiquetaEnlace: 'Ir a vehículos' },
    h(
      'div',
      { class: 'dona' },
      h(
        'div',
        { class: 'dona__figura' },
        lienzo,
        h(
          'div',
          { class: 'dona__centro' },
          h('span', { class: 'dona__total' }, formatearEntero(total)),
          h('span', { class: 'dona__rotulo' }, total === 1 ? 'vehículo' : 'vehículos'),
        ),
      ),
      lista,
    ),
  );
}

/* --------------------------------------------------------------------------
   Últimas ventas
   -------------------------------------------------------------------------- */

function crearTarjetaUltimasVentas(ventas) {
  const recientes = ventas.slice(0, 5); // la API ya las entrega de la más reciente a la más antigua
  const cuerpo =
    recientes.length === 0
      ? h('p', { class: 'tarjeta__vacio' }, 'Aún no hay ventas registradas.')
      : crearTabla({
          etiqueta: 'Últimas ventas',
          columnas: [
            { titulo: 'Cliente', render: (v) => v.clienteNombre },
            { titulo: 'Vehículo', render: (v) => crearPlaca(v.vehiculoPlaca) },
            { titulo: 'Fecha', render: (v) => formatearFecha(v.fecha) },
            { titulo: 'Total', alinear: 'derecha', render: (v) => h('span', { class: 'numerico' }, formatearCOP(v.total)) },
          ],
          filas: recientes,
        });

  return crearTarjeta(
    { titulo: 'Últimas ventas', enlace: '#/ventas', etiquetaEnlace: 'Ver todas las ventas', clase: 'tarjeta--tabla' },
    cuerpo,
  );
}

/* --------------------------------------------------------------------------
   Montaje
   -------------------------------------------------------------------------- */

export async function montar(contenedor, { recargar, esVigente }) {
  const encabezado = crearEncabezado({
    titulo: 'Panel principal',
    descripcion: 'Resumen del inventario, tasa de cambio y últimas ventas.',
  });
  contenedor.replaceChildren(encabezado, crearEstadoCarga({ filas: 6 }));

  const [ventas, vehiculos, tasa, mantenimientos] = await Promise.allSettled([
    api.ventas.listar(),
    api.vehiculos.listar(),
    api.tasaCambio.obtener(),
    api.mantenimientos.listar(),
  ]);
  if (!esVigente()) return undefined;

  // Sin ventas o sin vehículos no hay panel que mostrar: se ofrece reintentar.
  const fallo = [ventas, vehiculos].find((r) => r.status === 'rejected');
  if (fallo) {
    contenedor.replaceChildren(encabezado, crearEstadoError(fallo.reason, { reintentar: recargar }));
    return undefined;
  }

  const datos = {
    ventas: ventas.value ?? [],
    vehiculos: vehiculos.value ?? [],
    tasa: tasa.status === 'fulfilled' ? tasa.value : null,
    mantenimientos: mantenimientos.status === 'fulfilled' ? (mantenimientos.value ?? []) : null,
  };

  const tarjetaVentas = crearTarjetaVentas(datos);

  contenedor.replaceChildren(
    encabezado,
    h(
      'div',
      { class: 'tablero' },
      crearIndicadores(datos),
      h('div', { class: 'graficos' }, tarjetaVentas.elemento, crearTarjetaInventario(datos.vehiculos)),
      crearTarjetaUltimasVentas(datos.ventas),
    ),
  );

  return () => tarjetaVentas.destruir?.();
}
