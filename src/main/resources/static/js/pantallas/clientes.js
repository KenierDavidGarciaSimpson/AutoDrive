/**
 * AutoDrive Motors - pantalla de Clientes
 * Ruta: src/main/resources/static/js/pantallas/clientes.js
 *
 * Listado, crear, editar y eliminar clientes.
 * Reglas del servidor que se reflejan aquí:
 *  - nombre, documento y correo son obligatorios; el teléfono es opcional.
 *  - el correo no puede repetirse (el servidor lo guarda en minúsculas).
 *  - no se elimina un cliente que tenga ventas (409): se muestra el mensaje del servidor.
 */

import { api } from '../api.js';
import { formatearEntero } from '../format.js';
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
  crearTabla,
  h,
  icono,
  limpiarErrores,
  mostrarErrorFormulario,
} from '../ui.js';

/* --------------------------------------------------------------------------
   Utilidades
   -------------------------------------------------------------------------- */

const TEXTO_VACIO = '—';

/** Ordena por nombre, ignorando mayúsculas y tildes. */
function ordenarClientes(lista) {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
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
  nombre: (v) => {
    if (!v) return 'El nombre es obligatorio';
    if (v.length > 100) return 'El nombre no puede superar 100 caracteres';
    return null;
  },
  documento: (v) => {
    if (!v) return 'El documento es obligatorio';
    if (v.length > 20) return 'El documento no puede superar 20 caracteres';
    return null;
  },
  correo: (v) => {
    if (!v) return 'El correo es obligatorio';
    if (v.length > 100) return 'El correo no puede superar 100 caracteres';
    // Revisión básica (algo@dominio); el servidor hace la validación completa
    if (!/^[^\s@]+@[^\s@]+$/.test(v)) return 'El correo no tiene un formato válido';
    return null;
  },
  telefono: (v) => (v.length > 20 ? 'El teléfono no puede superar 20 caracteres' : null),
};

/* --------------------------------------------------------------------------
   Pantalla
   -------------------------------------------------------------------------- */

export async function montar(contenedor, { esVigente }) {
  let clientes = [];
  let hojaAbierta = null;
  let refResumen = null;

  /* ----- Estructura fija (el encabezado se pinta antes de cualquier await) ----- */

  const botonNuevo = h(
    'button',
    { class: 'boton boton--primario', type: 'button', onclick: () => abrirFormulario() },
    icono('mas'),
    'Nuevo cliente',
  );
  const zonaMensajes = h('div', { class: 'pila' });
  const zonaContenido = h('div', { class: 'pila' }, crearEstadoCarga({ filas: 4 }));

  contenedor.replaceChildren(
    crearEncabezado({
      titulo: 'Clientes',
      descripcion: 'Registro y consulta de clientes.',
      acciones: [botonNuevo],
    }),
    h('div', { class: 'pila pila--amplia' }, zonaMensajes, zonaContenido),
  );

  /* ----- Datos y pintado ----- */

  /** Vuelve a pedir los clientes y repinta. `enfocar`: deja el foco en el resumen (tras una acción). */
  async function refrescar({ enfocar = false } = {}) {
    try {
      const datos = await api.clientes.listar();
      if (!esVigente()) return;
      clientes = ordenarClientes(datos);
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

    if (clientes.length === 0) {
      zonaContenido.replaceChildren(
        crearEstadoVacio({
          iconoNombre: 'clientes',
          titulo: 'Aún no hay clientes registrados',
          mensaje: 'Registra el primero para poder asociarle ventas.',
          accion: { texto: 'Registrar cliente', icono: 'mas', alAccionar: () => abrirFormulario() },
        }),
      );
      return;
    }

    refResumen = h(
      'p',
      { tabindex: '-1' },
      `${formatearEntero(clientes.length)} ${clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}`,
    );

    zonaContenido.replaceChildren(
      refResumen,
      crearTabla({
        etiqueta: 'Listado de clientes',
        filas: clientes,
        columnas: [
          { titulo: 'Nombre', render: (c) => c.nombre },
          { titulo: 'Documento', render: (c) => h('span', { class: 'numerico' }, c.documento) },
          { titulo: 'Correo', render: (c) => c.correo },
          { titulo: 'Teléfono', render: (c) => c.telefono || TEXTO_VACIO },
          { titulo: 'Acciones', acciones: true, render: (c) => botonesDeFila(c) },
        ],
      }),
    );
  }

  /** Botones de cada fila. El nombre accesible incluye el nombre del cliente. */
  function botonesDeFila(c) {
    return [
      h(
        'button',
        {
          class: 'boton boton--texto',
          type: 'button',
          'aria-label': `Editar cliente ${c.nombre}`,
          onclick: () => abrirFormulario(c),
        },
        icono('editar'),
        'Editar',
      ),
      h(
        'button',
        {
          class: 'boton boton--peligro-texto',
          type: 'button',
          'aria-label': `Eliminar cliente ${c.nombre}`,
          onclick: (e) => eliminar(c, e.currentTarget),
        },
        icono('papelera'),
        'Eliminar',
      ),
    ];
  }

  /* ----- Eliminar ----- */

  async function eliminar(c, boton) {
    const confirmado = await confirmar({
      titulo: `¿Eliminar a ${c.nombre}?`,
      mensaje: 'Esta acción no se puede deshacer. Si el cliente tiene ventas, el sistema no lo permitirá.',
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!confirmado) {
      boton.focus();
      return;
    }

    zonaMensajes.replaceChildren();
    try {
      await conBotonOcupado(boton, () => api.clientes.eliminar(c.id));
    } catch (error) {
      const e = comoErrorMostrable(error);
      zonaMensajes.replaceChildren(
        banner({ tipo: 'error', titulo: 'No se pudo eliminar el cliente', mensajes: e.mensajesUsuario }),
      );
      return;
    }
    avisar(`Cliente ${c.nombre} eliminado`);
    if (esVigente()) await refrescar({ enfocar: true });
  }

  /* ----- Formulario de crear / editar ----- */

  function abrirFormulario(cliente = null) {
    const editando = cliente !== null;
    let hayCambios = false;
    let enviando = false;

    const campos = {
      nombre: crearCampo({
        nombre: 'nombre',
        etiqueta: 'Nombre completo',
        valor: cliente?.nombre ?? '',
        atributos: { maxlength: 100, required: true, autocomplete: 'off' },
      }),
      documento: crearCampo({
        nombre: 'documento',
        etiqueta: 'Documento de identidad',
        valor: cliente?.documento ?? '',
        ayuda: 'Máximo 20 caracteres.',
        atributos: { maxlength: 20, required: true, autocomplete: 'off' },
      }),
      correo: crearCampo({
        nombre: 'correo',
        etiqueta: 'Correo electrónico',
        tipo: 'email',
        valor: cliente?.correo ?? '',
        ayuda: 'No puede estar registrado en otro cliente.',
        atributos: { maxlength: 100, required: true, autocomplete: 'off', inputmode: 'email' },
      }),
      telefono: crearCampo({
        nombre: 'telefono',
        etiqueta: 'Teléfono',
        tipo: 'tel',
        opcional: true,
        valor: cliente?.telefono ?? '',
        atributos: { maxlength: 20, autocomplete: 'off', inputmode: 'tel' },
      }),
    };

    const botonCancelar = h('button', { class: 'boton boton--secundario', type: 'button' }, 'Cancelar');
    const botonGuardar = h(
      'button',
      { class: 'boton boton--primario', type: 'submit' },
      editando ? 'Guardar cambios' : 'Registrar cliente',
    );

    const formulario = h(
      'form',
      { class: 'formulario', novalidate: true },
      campos.nombre.elemento,
      h('div', { class: 'formulario__fila' }, campos.documento.elemento, campos.telefono.elemento),
      campos.correo.elemento,
      h('div', { class: 'formulario__acciones' }, botonCancelar, botonGuardar),
    );

    formulario.addEventListener('input', () => { hayCambios = true; });

    const validacion = activarValidacion(formulario, REGLAS);

    const hoja = abrirHoja({
      titulo: editando ? `Editar cliente ${cliente.nombre}` : 'Nuevo cliente',
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
      if (enviando) return; // evita guardar dos veces con doble clic o Enter repetido
      limpiarErrores(formulario);
      if (!validacion.validarTodo()) return;

      const telefono = campos.telefono.control.value.trim();
      const datos = {
        nombre: campos.nombre.control.value.trim(),
        documento: campos.documento.control.value.trim(),
        correo: campos.correo.control.value.trim(),
        // El teléfono es opcional: si está vacío no se envía
        ...(telefono && { telefono }),
      };

      enviando = true;
      try {
        await conBotonOcupado(botonGuardar, () =>
          editando ? api.clientes.actualizar(cliente.id, datos) : api.clientes.crear(datos),
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
      avisar(editando ? `Cliente ${datos.nombre} actualizado` : `Cliente ${datos.nombre} registrado`);
      if (esVigente()) await refrescar({ enfocar: true });
    });

    campos.nombre.control.focus();
  }

  /* ----- Arranque ----- */

  await refrescar();

  // Limpieza al salir de la pantalla: cierra el formulario si quedó abierto
  return () => {
    hojaAbierta?.cerrar();
    hojaAbierta = null;
  };
}
