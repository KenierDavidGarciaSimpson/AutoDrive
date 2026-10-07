const LOCALE = 'es-CO';

const formatoNumero = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatoDolar = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoTasa = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MARCA_VACIO = '—';

function esNumeroValido(valor) {
  return valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor));
}

export function formatearCOP(valor) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  return '$' + formatoNumero.format(Number(valor));
}

export function formatearUSD(valor) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  return 'US$ ' + formatoDolar.format(Number(valor));
}

export function formatearTasa(valor) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  return '$' + formatoTasa.format(Number(valor));
}

export function formatearEntero(valor) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(Number(valor));
}

function parsearSoloFecha(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return null;
  const [, anio, mes, dia] = partes;
  return new Date(Number(anio), Number(mes) - 1, Number(dia));
}

function parsearFechaHora(texto) {
  const normalizado = texto.replace(/(\.\d{3})\d+/, '$1');
  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function aFecha(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor !== 'string' || valor === '') return null;
  return parsearSoloFecha(valor) ?? parsearFechaHora(valor);
}

export function formatearFecha(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return MARCA_VACIO;
  return fecha
    .toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '');
}

export function formatearFechaHora(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return MARCA_VACIO;
  const dia = formatearFecha(fecha);
  const hora = fecha.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  return `${dia}, ${hora}`;
}

export function hoyISO() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export const ESTADOS_VEHICULO = Object.freeze({
  DISPONIBLE: 'Disponible',
  VENDIDO: 'Vendido',
  EN_MANTENIMIENTO: 'En mantenimiento',
});


export function etiquetaEstado(estado) {
  return ESTADOS_VEHICULO[estado] ?? String(estado ?? MARCA_VACIO);
}


export const UMBRAL_DESCUENTO_COP = 100_000_000;
export const PORCENTAJE_DESCUENTO = 0.05;

export function calcularVistaPreviaVenta(precio) {
  const precioBase = Number(precio);
  const aplicaDescuento = precioBase > UMBRAL_DESCUENTO_COP;
  const descuento = aplicaDescuento ? precioBase * PORCENTAJE_DESCUENTO : 0;
  return { precioBase, descuento, total: precioBase - descuento, aplicaDescuento };
}
