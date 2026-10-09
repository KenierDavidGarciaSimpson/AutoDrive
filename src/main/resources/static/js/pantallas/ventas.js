/**
 * AutoDrive Motors - pantalla de Ventas
 * Ruta: src/main/resources/static/js/pantallas/ventas.js
 *
 * - Historial de ventas (GET /ventas, ya viene ordenado por fecha descendente).
 * - "Nueva venta": cliente + vehículo DISPONIBLE (GET /vehiculos/disponibles).
 *   Muestra una vista previa de precio, descuento y total; al registrar, la
 *   confirmación muestra lo que calculó el SERVIDOR (esa es la cifra oficial).
 *
 * Reglas que se reflejan (las valida el servidor, aquí solo se anticipan):
 *  - solo se venden vehículos disponibles (si otro usuario lo vendió antes: 409);
 *  - descuento del 5 % si el precio es MAYOR que 100.000.000 COP;
 *  - la fecha y el total los genera el servidor; una venta no se edita ni se elimina.
 */

import { api } from '../api.js';
import {
  calcularVistaPreviaVenta,
  formatearCOP,
  formatearEntero,
  formatearFechaHora,
} from '../format.js';
import {
  abrirHoja,
  activarValidacion,
  banner,
  conBotonOcupado,
  crearCampo,
  crearEncabezado,
  crearEstadoCarga,
  crearEstadoError,
  crearEstadoVacio,
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

const SIN_DESCUENTO = 'Sin descuento';

/** Un fallo de programación no debe verse como un error del servidor. */
function comoErrorMostrable(error) {
  if (error?.name === 'ApiError') return error;
  console.error(error);
  const mensaje = 'Ocurrió un problema inesperado. Intenta de nuevo.';
  return { errores: null, message: mensaje, mensajesUsuario: [mensaje], estado: 0 };
}

const comparar = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });

function opcionesClientes(clientes) {
  return [...clientes]
    .sort((a, b) => comparar(a.nombre, b.nombre))
    .map((c) => ({ valor: String(c.id), texto: `${c.nombre} (${c.documento})` }));
}

function opcionesVehiculos(vehiculos) {
  return [...vehiculos]
    .sort((a, b) => comparar(a.marca, b.marca) || comparar(a.modelo, b.modelo))
    .map((v) => ({ valor: String(v.id), texto: `${v.marca} ${v.modelo} (${v.placa})` }));
}

/** Fila "etiqueta / valor" del resumen de precios. */
const fila = (etiqueta, valor, clase = '') =>
  h('div', { class: `resumen-venta__fila ${clase}`.trim() }, h('dt', {}, etiqueta), h('dd', {}, valor));

/** Reglas del formulario: el servidor exige ambos ids. */
const REGLAS = {
  clienteId: (v) => (v ? null : 'Selecciona un cliente'),
  vehiculoId: (v) => (v ? null : 'Selecciona un vehículo'),
};

/* --------------------------------------------------------------------------
   Pantalla
   -------------------------------------------------------------------------- */

export async function montar(contenedor, { esVigente, navegar }) {
  let ventas = [];
  let hojaAbierta = null;
  let refResumen = null;

  /* ----- Estructura fija (el encabezado se pinta antes de cualquier await) ----- */

  const botonNueva = h(
    'button',
    { class: 'boton boton--primario', type: 'button', onclick: (e) => abrirNuevaVenta(e.currentTarget) },
    icono('mas'),
    'Nueva venta',
  );
  const zonaMensajes = h('div', { class: 'pila' });
  const zonaContenido = h('div', { class: 'pila' }, crearEstadoCarga({ filas: 4 }));

  contenedor.replaceChildren(
    crearEncabezado({
      titulo: 'Ventas',
      descripcion: 'Registro de ventas y su historial.',
      acciones: [botonNueva],
    }),
    h('div', { class: 'pila pila--amplia' }, zonaMensajes, zonaContenido),
  );

  /* ----- Historial ----- */

  async function refrescar({ enfocar = false } = {}) {
    try {
      const datos = await api.ventas.listar();
      if (!esVigente()) return;
      ventas = datos;
      pintar();
      if (enfocar) refResumen?.focus();
    } catch (error) {
      if (!esVigente()) return;
      zonaContenido.replaceChildren(
        crearEstadoError(error, {
          reintentar: () => {
            zonaContenido.replaceChildren(crearEstadoCarga({ filas: 4 }));
            refrescar();
          },
        }),
      );
    }
  }

  function pintar() {
    refResumen = null;

    if (ventas.length === 0) {
      zonaContenido.replaceChildren(
        crearEstadoVacio({
          iconoNombre: 'ventas',
          titulo: 'Aún no hay ventas registradas',
          mensaje: 'Cuando registres la primera, aparecerá aquí con su descuento y su total.',
          accion: { texto: 'Registrar venta', icono: 'mas', alAccionar: () => abrirNuevaVenta(botonNueva) },
        }),
      );
      return;
    }

    const totalVendido = ventas.reduce((suma, v) => suma + Number(v.total), 0);
    refResumen = h(
      'p',
      { tabindex: '-1' },
      `${formatearEntero(ventas.length)} ${ventas.length === 1 ? 'venta registrada' : 'ventas registradas'}`,
    );

    zonaContenido.replaceChildren(
      h(
        'div',
        { class: 'fila' },
        refResumen,
        h('p', { class: 'texto-secundario numerico' }, `Total vendido: ${formatearCOP(totalVendido)}`),
      ),
      crearTabla({
        etiqueta: 'Historial de ventas',
        filas: ventas,
        columnas: [
          { titulo: 'Fecha', render: (v) => formatearFechaHora(v.fecha) },
          { titulo: 'Cliente', render: (v) => v.clienteNombre },
          { titulo: 'Vehículo', render: (v) => crearPlaca(v.vehiculoPlaca) },
          {
            titulo: 'Precio base',
            alinear: 'derecha',
            render: (v) => h('span', { class: 'numerico' }, formatearCOP(v.precioBase)),
          },
          {
            titulo: 'Descuento',
            alinear: 'derecha',
            render: (v) =>
              Number(v.descuento) > 0
                ? h('span', { class: 'numerico' }, `−${formatearCOP(v.descuento)}`)
                : h('span', { class: 'texto-secundario' }, SIN_DESCUENTO),
          },
          {
            titulo: 'Total',
            alinear: 'derecha',
            render: (v) => h('strong', { class: 'numerico' }, formatearCOP(v.total)),
          },
        ],
      }),
    );
  }

  /* ----- Nueva venta ----- */

  /** Carga clientes y vehículos disponibles; si falta alguno, explica qué hacer. */
  async function abrirNuevaVenta(boton) {
    zonaMensajes.replaceChildren();

    let clientes;
    let vehiculos;
    try {
      [clientes, vehiculos] = await conBotonOcupado(boton, () =>
        Promise.all([api.clientes.listar(), api.vehiculos.disponibles()]),
      );
    } catch (error) {
      const e = comoErrorMostrable(error);
      zonaMensajes.replaceChildren(
        banner({ tipo: 'error', titulo: 'No se pudieron cargar los datos para la venta', mensajes: e.mensajesUsuario }),
      );
      return;
    }
    if (!esVigente()) return;

    if (clientes.length === 0) {
      zonaMensajes.replaceChildren(
        banner({
          tipo: 'info',
          titulo: 'Primero registra un cliente',
          mensajes: ['Una venta necesita un cliente. Puedes registrarlo en la sección Clientes.'],
        }),
      );
      return;
    }
    if (vehiculos.length === 0) {
      zonaMensajes.replaceChildren(
        banner({
          tipo: 'info',
          titulo: 'No hay vehículos disponibles',
          mensajes: ['Todos están vendidos o en mantenimiento. Si alguno terminó su mantenimiento, márcalo como disponible en Vehículos.'],
        }),
      );
      return;
    }

    abrirFormulario(clientes, vehiculos);
  }

  function abrirFormulario(clientes, vehiculos) {
    let hayCambios = false;
    let enviando = false;
    let precios = new Map(vehiculos.map((v) => [String(v.id), Number(v.precio)]));

    const campoCliente = crearCampo({
      nombre: 'clienteId',
      etiqueta: 'Cliente',
      tipo: 'select',
      opciones: [{ valor: '', texto: 'Selecciona un cliente' }, ...opcionesClientes(clientes)],
      atributos: { required: true },
    });
    const campoVehiculo = crearCampo({
      nombre: 'vehiculoId',
      etiqueta: 'Vehículo',
      tipo: 'select',
      opciones: [{ valor: '', texto: 'Selecciona un vehículo' }, ...opcionesVehiculos(vehiculos)],
      ayuda: 'Solo aparecen los vehículos disponibles.',
      atributos: { required: true },
    });

    // Vista previa: se actualiza al elegir vehículo y se anuncia a lectores de pantalla
    const vista = h('div', { 'aria-live': 'polite' });
    function actualizarVista() {
      const precio = precios.get(campoVehiculo.control.value);
      if (precio === undefined) {
        vista.replaceChildren();
        return;
      }
      const calculo = calcularVistaPreviaVenta(precio);
      vista.replaceChildren(
        h(
          'dl',
          { class: 'resumen-venta' },
          fila('Precio del vehículo', formatearCOP(calculo.precioBase)),
          fila(
            'Descuento del 5 %',
            calculo.aplicaDescuento ? `−${formatearCOP(calculo.descuento)}` : SIN_DESCUENTO,
          ),
          fila('Total a pagar', formatearCOP(calculo.total), 'resumen-venta__total'),
        ),
        h(
          'p',
          { class: 'resumen-venta__nota' },
          calculo.aplicaDescuento
            ? 'Vista previa. El descuento aplica porque el precio supera $100.000.000; el servidor confirma el total.'
            : 'Vista previa. El descuento solo aplica a precios mayores que $100.000.000; el servidor confirma el total.',
        ),
      );
    }
    campoVehiculo.control.addEventListener('change', actualizarVista);

    const botonCancelar = h('button', { class: 'boton boton--secundario', type: 'button' }, 'Cancelar');
    const botonRegistrar = h('button', { class: 'boton boton--primario', type: 'submit' }, 'Registrar venta');

    const formulario = h(
      'form',
      { class: 'formulario', novalidate: true },
      campoCliente.elemento,
      campoVehiculo.elemento,
      vista,
      h('div', { class: 'formulario__acciones' }, botonCancelar, botonRegistrar),
    );
    formulario.addEventListener('change', () => { hayCambios = true; });

    const validacion = activarValidacion(formulario, REGLAS);

    const hoja = abrirHoja({
      titulo: 'Nueva venta',
      contenido: formulario,
      hayCambios: () => hayCambios,
    });
    hojaAbierta = hoja;
    hoja.cerrado.then(() => { if (hojaAbierta === hoja) hojaAbierta = null; });

    // "Cancelar" pasa por el mismo camino que Esc: pregunta si hay cambios sin guardar
    botonCancelar.addEventListener('click', () => {
      hoja.dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    });

    /** Si el vehículo ya no está disponible (409/404), se vuelve a pedir la lista y se rehace el selector. */
    async function actualizarVehiculos() {
      try {
        const disponibles = await api.vehiculos.disponibles();
        if (!esVigente()) return;
        precios = new Map(disponibles.map((v) => [String(v.id), Number(v.precio)]));
        campoVehiculo.control.replaceChildren(
          ...[{ valor: '', texto: 'Selecciona un vehículo' }, ...opcionesVehiculos(disponibles)].map((o) =>
            h('option', { value: o.valor }, o.texto),
          ),
        );
        actualizarVista();
      } catch (error) {
        console.error(error); // la lista vieja se queda; el mensaje del servidor ya se mostró
      }
    }

    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (enviando) return; // evita registrar dos ventas con doble clic o Enter repetido
      limpiarErrores(formulario);
      if (!validacion.validarTodo()) return;

      const datos = {
        clienteId: Number(campoCliente.control.value),
        vehiculoId: Number(campoVehiculo.control.value),
      };

      enviando = true;
      let venta;
      try {
        venta = await conBotonOcupado(botonRegistrar, () => api.ventas.registrar(datos));
      } catch (error) {
        const e = comoErrorMostrable(error);
        mostrarErrorFormulario(formulario, e);
        if (e.estado === 409 || e.estado === 404) await actualizarVehiculos();
        return;
      } finally {
        enviando = false;
      }

      hayCambios = false;
      mostrarConfirmacion(hoja, venta);
      if (esVigente()) await refrescar();
    });

    campoCliente.control.focus();
  }

  /** Confirmación con las cifras OFICIALES que devolvió el servidor. */
  function mostrarConfirmacion(hoja, venta) {
    const titulo = h('h3', { tabindex: '-1' }, 'Venta registrada');
    const boton = h('button', { class: 'boton boton--primario', type: 'button' }, 'Listo');
    boton.addEventListener('click', () => hoja.cerrar());

    hoja.cuerpo.replaceChildren(
      h(
        'div',
        { class: 'pila' },
        titulo,
        h(
          'dl',
          { class: 'resumen-venta' },
          fila('Cliente', venta.clienteNombre),
          fila('Vehículo', venta.vehiculoPlaca),
          fila('Fecha', formatearFechaHora(venta.fecha)),
          fila('Precio base', formatearCOP(venta.precioBase)),
          fila(
            'Descuento',
            Number(venta.descuento) > 0 ? `−${formatearCOP(venta.descuento)}` : SIN_DESCUENTO,
          ),
          fila('Total', formatearCOP(venta.total), 'resumen-venta__total'),
        ),
        h('div', { class: 'formulario__acciones' }, boton),
      ),
    );
    titulo.focus();
    hoja.cerrado.then(() => { if (esVigente()) refResumen?.focus(); });
  }

  /* ----- Arranque ----- */

  await refrescar();

  // Limpieza al salir de la pantalla: cierra el formulario si quedó abierto
  return () => {
    hojaAbierta?.cerrar();
    hojaAbierta = null;
  };
}
