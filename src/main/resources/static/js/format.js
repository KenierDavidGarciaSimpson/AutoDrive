/**
 * AutoDrive Motors - utilidades de formato
 * Ruta: src/main/resources/static/js/format.js
 *
 * Convierte los datos que entrega la API (números, fechas ISO, estados en
 * mayúsculas) en texto legible para una persona colombiana.
 */

const LOCALE = 'es-CO';

// Separadores colombianos: punto para miles y coma para decimales (150.000.000,50)
const formatoEntero = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const formatoCentavos = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatoTasa = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MARCA_VACIO = '—';

function esNumeroValido(valor) {
  return valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor));
}

/**
 * 150000000 -> "$150.000.000". Los centavos solo aparecen si existen y siempre
 * con dos cifras: 45000000.5 -> "$45.000.000,50".
 */
export function formatearCOP(valor) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  const numero = Number(valor);
  return '$' + (Number.isInteger(numero) ? formatoEntero : formatoCentavos).format(numero);
}

/**
 * 37500 -> "US$ 37.500". Sin centavos por defecto: son cifras de varios miles
 * y los decimales solo aparentan una precisión que la tasa no tiene.
 * Para montos pequeños: formatearUSD(12.5, 2) -> "US$ 12,50".
 */
export function formatearUSD(valor, decimales = 0) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  const formato = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return 'US$ ' + formato.format(Number(valor));
}

/** 4012.5 -> "$4.012,50" (pesos por cada dólar) */
export function formatearTasa(valor) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  return '$' + formatoTasa.format(Number(valor));
}

/** Entero con separador de miles, p. ej. conteos. NO usar para años: daría "2.024"; para eso, String(anio). */
export function formatearEntero(valor) {
  if (!esNumeroValido(valor)) return MARCA_VACIO;
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(Number(valor));
}

/**
 * Convierte "yyyy-MM-dd" en un Date SIN pasar por UTC.
 * new Date("2026-03-15") se interpreta como medianoche UTC y en Colombia
 * (UTC-5) mostraría el 14 de marzo. Por eso se arma a mano con la hora local.
 */
function parsearSoloFecha(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return null;
  const [, anio, mes, dia] = partes;
  return new Date(Number(anio), Number(mes) - 1, Number(dia));
}

/**
 * Convierte un LocalDateTime de Java ("2026-03-15T14:30:00.123456") en Date.
 * Java puede enviar hasta nueve decimales de segundo; el navegador solo
 * entiende tres, así que se recorta la fracción.
 */
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

/** "2026-03-15" o fecha-hora ISO -> "15 mar 2026" */
export function formatearFecha(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return MARCA_VACIO;
  return fecha
    .toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '');
}

/** Fecha-hora ISO -> "15 mar 2026, 2:30 p. m." */
export function formatearFechaHora(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return MARCA_VACIO;
  const dia = formatearFecha(fecha);
  const hora = fecha.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  return `${dia}, ${hora}`;
}

/** Fecha de hoy en formato yyyy-MM-dd con la hora local (para <input type="date">). */
export function hoyISO() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Estados del vehículo tal como los envía el backend. */
export const ESTADOS_VEHICULO = Object.freeze({
  DISPONIBLE: 'Disponible',
  VENDIDO: 'Vendido',
  EN_MANTENIMIENTO: 'En mantenimiento',
});

/** "EN_MANTENIMIENTO" -> "En mantenimiento" */
export function etiquetaEstado(estado) {
  return ESTADOS_VEHICULO[estado] ?? String(estado ?? MARCA_VACIO);
}

/**
 * Descuento de la regla de negocio: 5 % si el precio es MAYOR que 100.000.000.
 * Solo sirve para la vista previa; el total oficial lo calcula el servidor.
 */
export const UMBRAL_DESCUENTO_COP = 100_000_000;
export const PORCENTAJE_DESCUENTO = 0.05;

export function calcularVistaPreviaVenta(precio) {
  const precioBase = Number(precio);
  const aplicaDescuento = precioBase > UMBRAL_DESCUENTO_COP;
  const descuento = aplicaDescuento ? precioBase * PORCENTAJE_DESCUENTO : 0;
  return { precioBase, descuento, total: precioBase - descuento, aplicaDescuento };
}
