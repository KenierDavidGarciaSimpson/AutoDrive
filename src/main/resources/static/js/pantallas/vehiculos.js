/**
 * AutoDrive Motors - pantalla de Vehículos
 * Ruta: src/main/resources/static/js/pantallas/vehiculos.js
 *
 * - Listado con filtro por marca y por estado (se filtra en el navegador).
 * - Precio en COP y en USD: UNA sola llamada a /tasa-cambio y la conversión
 *   se calcula aquí (precio / copPorUsd), no una llamada por fila.
 * - Crear, editar y eliminar vehículos; "Terminar mantenimiento" para los que
 *   están EN_MANTENIMIENTO (PATCH /vehiculos/{id}/estado con DISPONIBLE).
 *
 * Los errores del servidor (400 por campo, 409 de regla de negocio, 503, sin
 * conexión) siempre se muestran con el mensaje que devuelve el backend.
 */

import { api, ESTADOS } from '../api.js';
import {
  ESTADOS_VEHICULO,
  formatearCOP,
  formatearEntero,
  formatearTasa,
  formatearUSD,
} from '../format.js';
import {
  abrirHoja,
  activarValidacion,
  avisar,
  banner,
  conBotonOcupado,
  confirmar,
  crearCampo,
  crearEncabezado,
  crearEstadoCarga,
  crearEstadoError,
  crearEstadoVacio,
  crearEtiquetaEstado,
  crearPlaca,
  crearTabla,
  h,
  icono,
  limpiarErrores,
  mostrarErrorFormulario,
} from '../ui.js';

/* --------------------------------------------------------------------------
   Utilidades
   -------------------------------------------------------------------------- */

/** Ordena por marca y modelo, ignorando mayúsculas y tildes. */
function ordenarVehiculos(lista) {
  return [...lista].sort(
    (a, b) =>
      a.marca.localeCompare(b.marca, 'es', { sensitivity: 'base' }) ||
      a.modelo.localeCompare(b.modelo, 'es', { sensitivity: 'base' }),
  );
}

/** Marcas distintas sin importar mayúsculas ("Mazda" y "mazda" cuentan como una). */
function marcasDistintas(lista) {
  const porClave = new Map();
  for (const v of lista) {
    const clave = v.marca.trim().toLowerCase();
    if (!porClave.has(clave)) porClave.set(clave, v.marca.trim());
  }
  return [...porClave.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es', { sensitivity: 'base' }))
    .map(([clave, texto]) => ({ valor: clave, texto }));
}

/** Un fallo de programación no debe verse como un error del servidor. */
function comoErrorMostrable(error) {
  if (error?.name === 'ApiError') return error;
  console.error(error);
  const mensaje = 'Ocurrió un problema inesperado. Intenta de nuevo.';
  return { errores: null, message: mensaje, mensajesUsuario: [mensaje] };
}

/* --------------------------------------------------------------------------
   Reglas de validación del formulario (iguales a las del backend)
   -------------------------------------------------------------------------- */

const REGLAS = {
  placa: (v) => {
    if (!v) return 'La placa es obligatoria';
    if (v.length > 10) return 'La placa no puede superar 10 caracteres';
    return null;
  },
  marca: (v) => {
    if (!v) return 'La marca es obligatoria';
    if (v.length > 50) return 'La marca no puede superar 50 caracteres';
    return null;
  },
  modelo: (v) => {
    if (!v) return 'El modelo es obligatorio';
    if (v.length > 50) return 'El modelo no puede superar 50 caracteres';
    return null;
  },
  anio: (v) => {
    if (!v) return 'El año es obligatorio';
    const n = Number(v);
    if (!Number.isInteger(n)) return 'Ingresa un año válido, por ejemplo 2024';
    if (n < 1900) return 'El año debe ser 1900 o posterior';
    if (n > 2100) return 'El año no es válido';
    return null;
  },
  precio: (v) => {
    if (!v) return 'El precio es obligatorio';
    const n = Number(v);
    if (Number.isNaN(n)) return 'Ingresa un número válido';
    if (n <= 0) return 'El precio debe ser mayor que cero';
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(v)) return 'El precio admite hasta 13 enteros y 2 decimales';
    return null;
  },
};

/* --------------------------------------------------------------------------
   Pantalla
   -------------------------------------------------------------------------- */

export async function montar(contenedor, { esVigente }) {
  // Estado de la pantalla
  const estado = {
    vehiculos: [],
    tasa: null,          // pesos por dólar (número) o null si no se pudo obtener
    errorTasa: null,
    filtroMarca: '',     // clave en minúsculas, '' = todas
    filtroEstado: '',    // 'DISPONIBLE' | 'VENDIDO' | 'EN_MANTENIMIENTO' | ''
  };
  let hojaAbierta = null;
  let refs = {};

  /* ----- Estructura fija (el encabezado se pinta antes de cualquier await) ----- */

  const botonNuevo = h(
    'button',
    { class: 'boton boton--primario', type: 'button', onclick: () => abrirFormulario() },
    icono('mas'),
    'Nuevo vehículo',
  );
  const zonaMensajes = h('div', { class: 'pila' });
  const zonaContenido = h('div', { class: 'pila' }, crearEstadoCarga({ filas: 5 }));

  contenedor.replaceChildren(
    crearEncabezado({
      titulo: 'Vehículos',
      descripcion: 'Inventario con precios en pesos y dólares.',
      acciones: [botonNuevo],
    }),
    h('div', { class: 'pila pila--amplia' }, zonaMensajes, zonaContenido),
  );

  /* ----- Datos ----- */

  /** Trae los vehículos (y la tasa, si todavía no la tenemos). Falla solo si fallan los vehículos. */
  async function cargarDatos() {
    const pedirTasa = estado.tasa === null;
    const [vehiculos, tasa] = await Promise.allSettled([
      api.vehiculos.listar(),
      pedirTasa ? api.tasaCambio.obtener() : Promise.resolve(null),
    ]);
    if (!esVigente()) return false;
    if (vehiculos.status === 'rejected') throw vehiculos.reason;

    estado.vehiculos = ordenarVehiculos(vehiculos.value);

    if (pedirTasa) {
      const valor = tasa.status === 'fulfilled' ? Number(tasa.value?.copPorUsd) : NaN;
      if (Number.isFinite(valor) && valor > 0) {
        estado.tasa = valor;
        estado.errorTasa = null;
      } else {
        estado.errorTasa =
          tasa.status === 'rejected'
            ? tasa.reason
            : new Error('La respuesta de la tasa de cambio no es válida.');
      }
    }
    return true;
  }

  /** Vuelve a pedir los datos y repinta. `enfocar`: deja el foco en el resumen (tras una acción). */
  async function refrescar({ enfocar = false } = {}) {
    try {
      if (!(await cargarDatos())) return;
      // Si la marca filtrada ya no existe (p. ej. se eliminó su único vehículo), se quita el filtro
      if (estado.filtroMarca && !marcasDistintas(estado.vehiculos).some((m) => m.valor === estado.filtroMarca)) {
        estado.filtroMarca = '';
      }
      pintarContenido();
      if (enfocar) refs.resumen?.focus();
    } catch (error) {
      if (!esVigente()) return;
      zonaContenido.replaceChildren(
        crearEstadoError(error, {
          reintentar: () => {
            zonaContenido.replaceChildren(crearEstadoCarga({ filas: 5 }));
            refrescar();
          },
        }),
      );
    }
  }

  /* ----- Pintado del listado ----- */

  function vehiculosFiltrados() {
    return estado.vehiculos.filter(
      (v) =>
        (!estado.filtroMarca || v.marca.trim().toLowerCase() === estado.filtroMarca) &&
        (!estado.filtroEstado || v.estado === estado.filtroEstado),
    );
  }

  function hayFiltros() {
    return Boolean(estado.filtroMarca || estado.filtroEstado);
  }

  function quitarFiltros() {
    estado.filtroMarca = '';
    estado.filtroEstado = '';
    pintarContenido();
    refs.controlMarca?.focus();
  }

  /** Repinta todo el contenido: aviso de tasa, filtros, resumen y listado. */
  function pintarContenido() {
    refs = {};

    if (estado.vehiculos.length === 0) {
      zonaContenido.replaceChildren(
        crearEstadoVacio({
          iconoNombre: 'vehiculos',
          titulo: 'Aún no hay vehículos registrados',
          mensaje: 'Registra el primero para empezar a armar el inventario.',
          accion: { texto: 'Registrar vehículo', icono: 'mas', alAccionar: () => abrirFormulario() },
        }),
      );
      return;
    }

    // Filtros
    const marca = crearCampo({
      nombre: 'filtro-marca',
      etiqueta: 'Marca',
      tipo: 'select',
      valor: estado.filtroMarca,
      opciones: [{ valor: '', texto: 'Todas las marcas' }, ...marcasDistintas(estado.vehiculos)],
    });
    const porEstado = crearCampo({
      nombre: 'filtro-estado',
      etiqueta: 'Estado',
      tipo: 'select',
      valor: estado.filtroEstado,
      opciones: [
        { valor: '', texto: 'Todos los estados' },
        ...Object.entries(ESTADOS_VEHICULO).map(([valor, texto]) => ({ valor, texto })),
      ],
    });
    const botonQuitar = h(
      'button',
      { class: 'boton boton--texto', type: 'button', onclick: quitarFiltros },
      icono('cerrar'),
      'Quitar filtros',
    );

    marca.control.addEventListener('change', () => {
      estado.filtroMarca = marca.control.value;
      pintarListado();
    });
    porEstado.control.addEventListener('change', () => {
      estado.filtroEstado = porEstado.control.value;
      pintarListado();
    });

    refs.controlMarca = marca.control;
    refs.botonQuitar = botonQuitar;
    refs.resumen = h('p', { tabindex: '-1' });
    refs.listado = h('div', {});

    const infoTasa = estado.tasa
      ? h('p', { class: 'texto-secundario numerico' }, `Tasa de cambio: ${formatearTasa(estado.tasa)} por dólar`)
      : null;

    zonaContenido.replaceChildren(
      estado.tasa === null &&
        banner({
          tipo: 'info',
          titulo: 'Los precios en dólares no están disponibles por ahora',
          mensajes: [estado.errorTasa?.message ?? 'No pudimos consultar la tasa de cambio.'],
        }),
      h('div', { class: 'filtros' }, marca.elemento, porEstado.elemento, botonQuitar),
      h('div', { class: 'fila' }, refs.resumen, infoTasa),
      refs.listado,
    );

    pintarListado();
  }

  /** Repinta solo el resumen y la tabla (los filtros conservan el foco). */
  function pintarListado() {
    const filas = vehiculosFiltrados();
    const total = estado.vehiculos.length;

    refs.botonQuitar.hidden = !hayFiltros();
    refs.resumen.textContent = `Mostrando ${formatearEntero(filas.length)} de ${formatearEntero(total)} ${
      total === 1 ? 'vehículo' : 'vehículos'
    }`;

    if (filas.length === 0) {
      refs.listado.replaceChildren(
        crearEstadoVacio({
          iconoNombre: 'vehiculos',
          titulo: 'Ningún vehículo coincide',
          mensaje: 'Prueba con otra marca u otro estado.',
          accion: { texto: 'Quitar filtros', icono: 'reintentar', alAccionar: quitarFiltros },
        }),
      );
      return;
    }

    const columnas = [
      { titulo: 'Placa', render: (v) => crearPlaca(v.placa) },
      { titulo: 'Vehículo', render: (v) => `${v.marca} ${v.modelo}` },
      { titulo: 'Año', render: (v) => String(v.anio) }, // sin separador de miles
      {
        titulo: 'Precio en COP',
        alinear: 'derecha',
        render: (v) => h('span', { class: 'numerico' }, formatearCOP(v.precio)),
      },
    ];
    if (estado.tasa) {
      columnas.push({
        titulo: 'Precio en USD',
        alinear: 'derecha',
        render: (v) => h('span', { class: 'numerico' }, formatearUSD(Number(v.precio) / estado.tasa)),
      });
    }
    columnas.push(
      { titulo: 'Estado', render: (v) => crearEtiquetaEstado(v.estado) },
      { titulo: 'Acciones', acciones: true, render: (v) => botonesDeFila(v) },
    );

    refs.listado.replaceChildren(crearTabla({ etiqueta: 'Listado de vehículos', columnas, filas }));
  }

  /** Botones de cada fila. El nombre accesible incluye la placa para distinguir las filas. */
  function botonesDeFila(v) {
    const botones = [];

    if (v.estado === ESTADOS.EN_MANTENIMIENTO) {
      botones.push(
        h(
          'button',
          {
            class: 'boton boton--secundario',
            type: 'button',
            'aria-label': `Terminar mantenimiento del vehículo ${v.placa}`,
            onclick: (e) => terminarMantenimiento(v, e.currentTarget),
          },
          icono('disponible'),
          'Terminar mantenimiento',
        ),
      );
    }

    botones.push(
      h(
        'button',
        {
          class: 'boton boton--texto',
          type: 'button',
          'aria-label': `Editar vehículo ${v.placa}`,
          onclick: () => abrirFormulario(v),
        },
        icono('editar'),
        'Editar',
      ),
      h(
        'button',
        {
          class: 'boton boton--peligro-texto',
          type: 'button',
          'aria-label': `Eliminar vehículo ${v.placa}`,
          onclick: (e) => eliminar(v, e.currentTarget),
        },
        icono('papelera'),
        'Eliminar',
      ),
    );
    return botones;
  }

  /* ----- Acciones sobre una fila ----- */

  /** Ejecuta una acción de fila: botón ocupado, mensaje del servidor si falla, refresco si sale bien. */
  async function ejecutarAccion(boton, tituloError, tarea) {
    zonaMensajes.replaceChildren();
    try {
      await conBotonOcupado(boton, tarea);
    } catch (error) {
      const e = comoErrorMostrable(error);
      zonaMensajes.replaceChildren(banner({ tipo: 'error', titulo: tituloError, mensajes: e.mensajesUsuario }));
      return;
    }
    if (esVigente()) await refrescar({ enfocar: true });
  }

  async function terminarMantenimiento(v, boton) {
    await ejecutarAccion(boton, 'No se pudo terminar el mantenimiento', async () => {
      await api.vehiculos.cambiarEstado(v.id, ESTADOS.DISPONIBLE);
      avisar(`El vehículo ${v.placa} vuelve a estar disponible`);
    });
  }

  async function eliminar(v, boton) {
    const confirmado = await confirmar({
      titulo: `¿Eliminar el vehículo ${v.placa}?`,
      mensaje: `Se eliminará ${v.marca} ${v.modelo}. Esta acción no se puede deshacer. Si tiene ventas o mantenimientos, el sistema no lo permitirá.`,
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!confirmado) {
      boton.focus();
      return;
    }
    await ejecutarAccion(boton, 'No se pudo eliminar el vehículo', async () => {
      await api.vehiculos.eliminar(v.id);
      avisar(`Vehículo ${v.placa} eliminado`);
    });
  }

  /* ----- Formulario de crear / editar ----- */

  function abrirFormulario(vehiculo = null) {
    const editando = vehiculo !== null;
    let hayCambios = false;
    let enviando = false;

    const campos = {
      placa: crearCampo({
        nombre: 'placa',
        etiqueta: 'Placa',
        valor: vehiculo?.placa ?? '',
        ayuda: 'Máximo 10 caracteres. Se guarda en mayúsculas.',
        atributos: { maxlength: 10, required: true, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' },
      }),
      marca: crearCampo({
        nombre: 'marca',
        etiqueta: 'Marca',
        valor: vehiculo?.marca ?? '',
        atributos: { maxlength: 50, required: true, autocomplete: 'off' },
      }),
      modelo: crearCampo({
        nombre: 'modelo',
        etiqueta: 'Modelo',
        valor: vehiculo?.modelo ?? '',
        atributos: { maxlength: 50, required: true, autocomplete: 'off' },
      }),
      anio: crearCampo({
        nombre: 'anio',
        etiqueta: 'Año',
        tipo: 'number',
        valor: vehiculo?.anio ?? '',
        ayuda: 'Entre 1900 y 2100.',
        atributos: { inputmode: 'numeric', min: 1900, max: 2100, step: 1, required: true },
      }),
      precio: crearCampo({
        nombre: 'precio',
        etiqueta: 'Precio en COP',
        tipo: 'number',
        valor: vehiculo ? Number(vehiculo.precio) : '',
        ayuda: 'En pesos colombianos, mayor que cero.',
        atributos: { inputmode: 'decimal', min: 0, step: 'any', required: true },
      }),
    };

    // Vista del precio con separadores de miles: ayuda a leer cifras de 9 dígitos
    const vistaPrecio = h('p', { class: 'campo__ayuda numerico' });
    campos.precio.elemento.querySelector('.campo__error').before(vistaPrecio);
    const actualizarVistaPrecio = () => {
      const n = Number(campos.precio.control.value);
      vistaPrecio.textContent = n > 0 ? `Equivale a ${formatearCOP(n)}` : '';
    };
    campos.precio.control.addEventListener('input', actualizarVistaPrecio);
    actualizarVistaPrecio();

    const botonCancelar = h('button', { class: 'boton boton--secundario', type: 'button' }, 'Cancelar');
    const botonGuardar = h(
      'button',
      { class: 'boton boton--primario', type: 'submit' },
      editando ? 'Guardar cambios' : 'Registrar vehículo',
    );

    const formulario = h(
      'form',
      { class: 'formulario', novalidate: true },
      campos.placa.elemento,
      h('div', { class: 'formulario__fila' }, campos.marca.elemento, campos.modelo.elemento),
      h('div', { class: 'formulario__fila' }, campos.anio.elemento, campos.precio.elemento),
      h('div', { class: 'formulario__acciones' }, botonCancelar, botonGuardar),
    );

    formulario.addEventListener('input', () => { hayCambios = true; });

    const validacion = activarValidacion(formulario, REGLAS);

    const hoja = abrirHoja({
      titulo: editando ? `Editar vehículo ${vehiculo.placa}` : 'Nuevo vehículo',
      contenido: formulario,
      hayCambios: () => hayCambios,
    });
    hojaAbierta = hoja;
    hoja.cerrado.then(() => { if (hojaAbierta === hoja) hojaAbierta = null; });

    // "Cancelar" pasa por el mismo camino que Esc: pregunta si hay cambios sin guardar
    botonCancelar.addEventListener('click', () => {
      hoja.dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    });

    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (enviando) return; // evita registrar dos veces con doble clic o Enter repetido
      limpiarErrores(formulario);
      if (!validacion.validarTodo()) return;

      const datos = {
        placa: campos.placa.control.value.trim(),
        marca: campos.marca.control.value.trim(),
        modelo: campos.modelo.control.value.trim(),
        anio: Number(campos.anio.control.value),
        precio: Number(campos.precio.control.value),
        // "estado" no se envía: al crear lo fija el servidor y al editar no se toca
      };

      enviando = true;
      try {
        await conBotonOcupado(botonGuardar, () =>
          editando ? api.vehiculos.actualizar(vehiculo.id, datos) : api.vehiculos.crear(datos),
        );
      } catch (error) {
        // Errores por campo (400) junto a cada control; 409/503/red en el resumen superior
        mostrarErrorFormulario(formulario, comoErrorMostrable(error));
        return;
      } finally {
        enviando = false;
      }

      hayCambios = false;
      hoja.cerrar();
      avisar(editando ? `Vehículo ${datos.placa.toUpperCase()} actualizado` : `Vehículo ${datos.placa.toUpperCase()} registrado`);
      if (esVigente()) await refrescar({ enfocar: true });
    });

    campos.placa.control.focus();
  }

  /* ----- Arranque ----- */

  await refrescar();

  // Limpieza al salir de la pantalla: cierra el formulario si quedó abierto
  return () => {
    hojaAbierta?.cerrar();
    hojaAbierta = null;
  };
}
