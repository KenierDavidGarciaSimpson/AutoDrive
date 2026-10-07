
const BACKEND_DESARROLLO = 'http://localhost:8080';
const PUERTOS_DESARROLLO = ['3000', '5173', '5500'];

export const API_BASE_URL = PUERTOS_DESARROLLO.includes(window.location.port)
  ? BACKEND_DESARROLLO
  : '';


const TIEMPO_ESPERA_MS = 20_000;


export const ESTADOS = Object.freeze({
  DISPONIBLE: 'DISPONIBLE',
  VENDIDO: 'VENDIDO',
  EN_MANTENIMIENTO: 'EN_MANTENIMIENTO',
});


const MENSAJES_POR_ESTADO = {
  400: 'Revisa los datos ingresados.',
  404: 'No encontramos lo que buscas.',
  409: 'Esta operación no está permitida en este momento.',
  503: 'El servicio externo no responde por ahora. Intenta de nuevo en unos minutos.',
  500: 'Ocurrió un error inesperado en el servidor. Intenta de nuevo.',
};

export class ApiError extends Error {
  constructor({ estado, mensaje, errores = null, sinRespuesta = false }) {
    super(mensaje);
    this.name = 'ApiError';
    this.estado = estado;
    this.errores = errores;
    this.sinRespuesta = sinRespuesta;
  }

  get mensajesUsuario() {
    if (this.errores && Object.keys(this.errores).length > 0) {
      return Object.values(this.errores);
    }
    return [this.message];
  }
}

function errorDeRed(causa) {
  const agotado = causa?.name === 'AbortError';
  return new ApiError({
    estado: 0,
    sinRespuesta: true,
    mensaje: agotado
      ? 'El servidor tardó demasiado en responder. Intenta de nuevo.'
      : 'No pudimos conectar con el servidor. Verifica que el sistema esté en ejecución e intenta de nuevo.',
  });
}

async function solicitar(ruta, { metodo = 'GET', cuerpo } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_ESPERA_MS);

  let respuesta;
  try {
    respuesta = await fetch(API_BASE_URL + ruta, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: controlador.signal,
    });
  } catch (causa) {
    throw errorDeRed(causa);
  } finally {
    clearTimeout(temporizador);
  }

  if (respuesta.status === 204) return null;

  let datos = null;
  try {
    const texto = await respuesta.text();
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    throw new ApiError({
      estado: respuesta.status,
      mensaje: datos?.mensaje ?? MENSAJES_POR_ESTADO[respuesta.status] ?? 'No se pudo completar la operación.',
      errores: datos?.errores ?? null,
    });
  }

  return datos;
}

const ruta = (...partes) => partes.map((p) => encodeURIComponent(p)).join('/');


export const api = {
  clientes: {
    listar: () => solicitar('/clientes'),
    obtener: (id) => solicitar(`/clientes/${ruta(id)}`),
    crear: (datos) => solicitar('/clientes', { metodo: 'POST', cuerpo: datos }),
    actualizar: (id, datos) => solicitar(`/clientes/${ruta(id)}`, { metodo: 'PUT', cuerpo: datos }),
    eliminar: (id) => solicitar(`/clientes/${ruta(id)}`, { metodo: 'DELETE' }),
  },

  vehiculos: {
    listar: () => solicitar('/vehiculos'),
    disponibles: () => solicitar('/vehiculos/disponibles'),
    porMarca: (marca) => solicitar(`/vehiculos/marca/${ruta(marca)}`),
    obtener: (id) => solicitar(`/vehiculos/${ruta(id)}`),
    precioUsd: (id) => solicitar(`/vehiculos/${ruta(id)}/precio-usd`),
    crear: (datos) => solicitar('/vehiculos', { metodo: 'POST', cuerpo: datos }),
    actualizar: (id, datos) => solicitar(`/vehiculos/${ruta(id)}`, { metodo: 'PUT', cuerpo: datos }),
    cambiarEstado: (id, estado) =>
      solicitar(`/vehiculos/${ruta(id)}/estado`, { metodo: 'PATCH', cuerpo: { estado } }),
    eliminar: (id) => solicitar(`/vehiculos/${ruta(id)}`, { metodo: 'DELETE' }),
  },

  ventas: {
    listar: () => solicitar('/ventas'),
    registrar: (datos) => solicitar('/ventas', { metodo: 'POST', cuerpo: datos }),
  },

  mantenimientos: {
    listar: () => solicitar('/mantenimientos'),
    porVehiculo: (vehiculoId) => solicitar(`/mantenimientos/vehiculo/${ruta(vehiculoId)}`),
    registrar: (datos) => solicitar('/mantenimientos', { metodo: 'POST', cuerpo: datos }),
  },

  tasaCambio: {
    obtener: () => solicitar('/tasa-cambio'),
  },
};
