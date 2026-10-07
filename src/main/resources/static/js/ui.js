import { etiquetaEstado } from './format.js';

let contadorId = 0;

export function nuevoId(prefijo = 'id') {
  contadorId += 1;
  return `${prefijo}-${contadorId}`;
}

function agregarHijos(padre, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    padre.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

export function h(etiqueta, atributos = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);

  for (const [clave, valor] of Object.entries(atributos ?? {})) {
    if (valor === false || valor === null || valor === undefined) continue;

    if (clave === 'class') {
      elemento.className = valor;
    } else if (clave === 'dataset') {
      Object.assign(elemento.dataset, valor);
    } else if (clave.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (valor === true) {
      // aria-* necesita el texto "true"; el resto de atributos booleanos va vacío
      elemento.setAttribute(clave, clave.startsWith('aria-') ? 'true' : '');
    } else {
      elemento.setAttribute(clave, String(valor));
    }
  }

  agregarHijos(elemento, hijos);
  return elemento;
}

/** Vacía un contenedor y le quita el estado "ocupado". */
export function limpiar(contenedor) {
  contenedor.replaceChildren();
  contenedor.removeAttribute('aria-busy');
  return contenedor;
}

const ICONOS = {
  panel:
    '<rect x="3" y="3" width="7.5" height="9" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5"/>' +
    '<rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5"/><rect x="3" y="15" width="7.5" height="6" rx="1.5"/>',
  vehiculos:
    '<path d="M3 16v-4l2-5h14l2 5v4"/><path d="M3 16h18"/><path d="M5 12h14"/>' +
    '<circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
  clientes:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/>' +
    '<path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.5 14.4c1.9.9 3 2.9 3 5.6"/>',
  ventas: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  taller:
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91' +
    'a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  disponible: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8 5.4-5.8"/>',
  vendido:
    '<path d="M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l8.1 8.1a1.5 1.5 0 0 1 0 2.1l-6.5 6.5a1.5 1.5 0 0 1-2.1 0' +
    'L3.3 12.9a1 1 0 0 1-.3-.7z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.3v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.7v.1"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M4 20l1.2-4.4L16.6 4.2a2.1 2.1 0 0 1 3 3L8.4 18.8z"/>',
  papelera:
    '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12"/>' +
    '<path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  vacio:
    '<path d="M3 13l2.5-8a1.5 1.5 0 0 1 1.4-1h10.2a1.5 1.5 0 0 1 1.4 1l2.5 8"/>' +
    '<path d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-5.5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z"/>',
  reintentar: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
};

const ESPACIO_SVG = 'http://www.w3.org/2000/svg';

export function icono(nombre) {
  const svg = document.createElementNS(ESPACIO_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ICONOS[nombre] ?? '';
  return svg;
}

export const NOMBRES_ICONOS = Object.keys(ICONOS);

const DURACION_AVISO_MS = 6000;

export function avisar(mensaje) {
  const zona = document.getElementById('avisos');
  if (!zona) return;

  const aviso = h(
    'div',
    { class: 'aviso' },
    icono('disponible'),
    h('span', {}, mensaje),
    h(
      'button',
      {
        class: 'boton boton--texto',
        type: 'button',
        'aria-label': 'Cerrar aviso',
        onclick: () => aviso.remove(),
      },
      icono('cerrar'),
    ),
  );
  zona.append(aviso);
  setTimeout(() => aviso.remove(), DURACION_AVISO_MS);
}

const ICONO_BANNER = { error: 'error', info: 'info', exito: 'disponible' };

export function banner({ tipo = 'info', titulo, mensajes = [] }) {
  const cuerpo = h('div', { class: 'banner__cuerpo' }, titulo && h('p', { class: 'banner__titulo' }, titulo));

  if (mensajes.length === 1) {
    cuerpo.append(h('p', {}, mensajes[0]));
  } else if (mensajes.length > 1) {
    cuerpo.append(h('ul', { class: 'banner__lista' }, mensajes.map((m) => h('li', {}, m))));
  }

  return h(
    'div',
    { class: `banner banner--${tipo}`, role: tipo === 'error' ? 'alert' : 'status' },
    icono(ICONO_BANNER[tipo] ?? 'info'),
    cuerpo,
  );
}

export function crearEstadoCarga({ filas = 4 } = {}) {
  const lineas = Array.from({ length: filas }, (_, i) =>
    h('span', { class: `esqueleto ${i % 2 ? 'esqueleto--medio' : ''}`, 'aria-hidden': 'true' }),
  );
  return h(
    'div',
    { class: 'panel', role: 'status' },
    h('span', { class: 'solo-lector' }, 'Cargando información'),
    h('div', { class: 'esqueleto-lista' }, lineas),
  );
}

export function crearEstadoVacio({ titulo, mensaje, accion, iconoNombre = 'vacio' }) {
  return h(
    'div',
    { class: 'panel' },
    h(
      'div',
      { class: 'estado-pantalla' },
      icono(iconoNombre),
      h('h2', { class: 'estado-pantalla__titulo' }, titulo),
      mensaje && h('p', {}, mensaje),
      accion &&
        h(
          'button',
          { class: 'boton boton--primario', type: 'button', onclick: accion.alAccionar },
          icono(accion.icono ?? 'mas'),
          accion.texto,
        ),
    ),
  );
}

export function crearEstadoError(error, { reintentar } = {}) {
  const esApi = error && error.name === 'ApiError';
  if (!esApi) console.error(error); // un fallo de programación no debe quedar oculto

  const titulo = esApi && error.sinRespuesta
    ? 'No hay conexión con el servidor'
    : 'No pudimos cargar la información';
  const mensaje = esApi ? error.message : 'Ocurrió un problema inesperado. Intenta de nuevo.';

  return h(
    'div',
    { class: 'panel', role: 'alert' },
    h(
      'div',
      { class: 'estado-pantalla estado-pantalla--error' },
      icono('error'),
      h('h2', { class: 'estado-pantalla__titulo' }, titulo),
      h('p', {}, mensaje),
      reintentar &&
        h(
          'button',
          { class: 'boton boton--secundario', type: 'button', onclick: reintentar },
          icono('reintentar'),
          'Intentar de nuevo',
        ),
    ),
  );
}

export function crearEncabezado({ titulo, descripcion, acciones = [] }) {
  return h(
    'header',
    { class: 'encabezado' },
    h(
      'div',
      { class: 'encabezado__texto' },
      h('h1', { tabindex: '-1' }, titulo),
      descripcion && h('p', {}, descripcion),
    ),
    acciones.length > 0 && h('div', { class: 'encabezado__acciones' }, acciones),
  );
}

export function vistaPendiente(contenedor, { titulo, descripcion }) {
  contenedor.replaceChildren(
    crearEncabezado({ titulo, descripcion }),
    crearEstadoVacio({
      iconoNombre: 'taller',
      titulo: 'Esta pantalla está en construcción',
      mensaje: 'Pronto estará disponible.',
    }),
  );
}


const ICONO_ESTADO = {
  DISPONIBLE: 'disponible',
  VENDIDO: 'vendido',
  EN_MANTENIMIENTO: 'taller',
};

export function crearEtiquetaEstado(estado) {
  return h(
    'span',
    { class: 'estado', dataset: { estado } },
    icono(ICONO_ESTADO[estado] ?? 'info'),
    etiquetaEstado(estado),
  );
}

export function crearPlaca(placa, { grande = false } = {}) {
  return h(
    'span',
    { class: grande ? 'placa placa--grande' : 'placa' },
    h('span', { class: 'solo-lector' }, 'Placa '),
    placa,
  );
}

export async function conBotonOcupado(boton, tarea) {
  if (boton.getAttribute('aria-busy') === 'true') return undefined;

  const contenidoOriginal = [...boton.childNodes];
  boton.setAttribute('aria-busy', 'true');
  boton.setAttribute('aria-disabled', 'true');
  boton.replaceChildren(h('span', { class: 'girando', 'aria-hidden': 'true' }), ...contenidoOriginal.map((n) => n.cloneNode(true)));

  try {
    return await tarea();
  } finally {
    boton.replaceChildren(...contenidoOriginal);
    boton.removeAttribute('aria-busy');
    boton.removeAttribute('aria-disabled');
  }
}

export function confirmar({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  destructivo = false,
}) {
  return new Promise((resolver) => {
    const idTitulo = nuevoId('dialogo-titulo');
    const idMensaje = nuevoId('dialogo-mensaje');
    let confirmado = false;

    const botonCancelar = h('button', { class: 'boton boton--secundario', type: 'button' }, textoCancelar);
    const botonConfirmar = h(
      'button',
      { class: destructivo ? 'boton boton--peligro' : 'boton boton--primario', type: 'button' },
      textoConfirmar,
    );

    const dialogo = h(
      'dialog',
      {
        class: 'dialogo dialogo--compacto',
        'aria-labelledby': idTitulo,
        'aria-describedby': idMensaje,
      },
      h('div', { class: 'dialogo__cabecera' }, h('h2', { class: 'dialogo__titulo', id: idTitulo }, titulo)),
      h('div', { class: 'dialogo__cuerpo' }, h('p', { id: idMensaje }, mensaje)),
      h('div', { class: 'dialogo__pie' }, botonCancelar, botonConfirmar),
    );

    botonConfirmar.addEventListener('click', () => {
      confirmado = true;
      dialogo.close();
    });
    botonCancelar.addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('close', () => {
      dialogo.remove();
      resolver(confirmado);
    });

    document.body.append(dialogo);
    dialogo.showModal();
    (destructivo ? botonCancelar : botonConfirmar).focus();
  });
}

export function abrirHoja({ titulo, contenido, hayCambios }) {
  const idTitulo = nuevoId('hoja-titulo');
  let alCerrar;
  const cerrado = new Promise((resolver) => { alCerrar = resolver; });

  const cuerpo = h('div', { class: 'dialogo__cuerpo' }, contenido);
  const botonCerrar = h(
    'button',
    { class: 'boton boton--texto', type: 'button', 'aria-label': 'Cerrar' },
    icono('cerrar'),
  );
  const dialogo = h(
    'dialog',
    { class: 'dialogo', 'aria-labelledby': idTitulo },
    h('div', { class: 'dialogo__cabecera' }, h('h2', { class: 'dialogo__titulo', id: idTitulo }, titulo), botonCerrar),
    cuerpo,
  );

  const cerrar = () => dialogo.close();

  async function intentarCerrar() {
    if (hayCambios?.()) {
      const descartar = await confirmar({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Lo que escribiste no se guardará.',
        textoConfirmar: 'Descartar',
        textoCancelar: 'Seguir editando',
        destructivo: true,
      });
      if (!descartar) return;
    }
    cerrar();
  }

  botonCerrar.addEventListener('click', intentarCerrar);
  dialogo.addEventListener('cancel', (evento) => {
    evento.preventDefault();
    intentarCerrar();
  });
  dialogo.addEventListener('close', () => {
    dialogo.remove();
    alCerrar();
  });

  document.body.append(dialogo);
  dialogo.showModal();

  return { dialogo, cuerpo, cerrar, cerrado };
}

export function crearCampo({
  nombre,
  etiqueta,
  tipo = 'text',
  opcional = false,
  ayuda,
  opciones = [],
  valor = '',
  atributos = {},
}) {
  const id = nuevoId(`campo-${nombre}`);
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;

  const comunes = {
    id,
    name: nombre,
    class: 'control',
    'aria-describedby': ayuda ? idAyuda : false,
    ...atributos,
  };

  let control;
  if (tipo === 'select') {
    control = h(
      'select',
      comunes,
      opciones.map((o) => h('option', { value: o.valor, selected: String(o.valor) === String(valor) }, o.texto)),
    );
  } else if (tipo === 'textarea') {
    control = h('textarea', comunes, valor);
  } else {
    control = h('input', { ...comunes, type: tipo, value: valor === '' ? false : valor });
  }

  const elemento = h(
    'div',
    { class: 'campo', dataset: { campo: nombre } },
    h(
      'label',
      { class: 'campo__etiqueta', for: id },
      etiqueta,
      opcional && h('span', { class: 'campo__opcional' }, ' (opcional)'),
    ),
    control,
    ayuda && h('p', { class: 'campo__ayuda', id: idAyuda }, ayuda),
    h('p', { class: 'campo__error', id: idError, hidden: true }),
  );

  return { elemento, control };
}

function ponerErrorCampo(contenedorCampo, texto) {
  const control = contenedorCampo.querySelector('.control');
  const zonaError = contenedorCampo.querySelector('.campo__error');
  if (!control || !zonaError) return;

  zonaError.replaceChildren(icono('error'), h('span', {}, texto));
  zonaError.hidden = false;
  control.setAttribute('aria-invalid', 'true');

  const ids = new Set((control.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
  ids.add(zonaError.id);
  control.setAttribute('aria-describedby', [...ids].join(' '));
}

function quitarErrorCampo(contenedorCampo) {
  const control = contenedorCampo.querySelector('.control');
  const zonaError = contenedorCampo.querySelector('.campo__error');
  if (!control || !zonaError) return;

  zonaError.replaceChildren();
  zonaError.hidden = true;
  control.removeAttribute('aria-invalid');

  const ids = (control.getAttribute('aria-describedby') ?? '').split(' ').filter((i) => i && i !== zonaError.id);
  if (ids.length > 0) control.setAttribute('aria-describedby', ids.join(' '));
  else control.removeAttribute('aria-describedby');
}

function zonaResumen(formulario) {
  let zona = formulario.querySelector('[data-resumen-errores]');
  if (!zona) {
    zona = h('div', { dataset: { resumenErrores: '' } });
    formulario.prepend(zona);
  }
  return zona;
}

export function limpiarErrores(formulario) {
  formulario.querySelectorAll('.campo').forEach(quitarErrorCampo);
  formulario.querySelector('[data-resumen-errores]')?.replaceChildren();
}

export function mostrarErrorFormulario(formulario, error, titulo = 'No se pudo guardar') {
  limpiarErrores(formulario);

  const mensajes = [];
  let primerControl = null;

  for (const [campo, texto] of Object.entries(error.errores ?? {})) {
    const contenedor = formulario.querySelector(`[data-campo="${campo}"]`);
    if (contenedor) {
      ponerErrorCampo(contenedor, texto);
      primerControl ??= contenedor.querySelector('.control');
    }
    mensajes.push(texto);
  }

  if (mensajes.length === 0) mensajes.push(...error.mensajesUsuario);

  zonaResumen(formulario).replaceChildren(banner({ tipo: 'error', titulo, mensajes }));
  primerControl?.focus();
}

export function activarValidacion(formulario, reglas) {
  const tocados = new Set();

  function validar(nombre) {
    const control = formulario.elements[nombre];
    const contenedor = formulario.querySelector(`[data-campo="${nombre}"]`);
    if (!control || !contenedor) return true;

    const texto = reglas[nombre](String(control.value).trim(), formulario);
    quitarErrorCampo(contenedor);
    if (texto) ponerErrorCampo(contenedor, texto);
    return !texto;
  }

  for (const nombre of Object.keys(reglas)) {
    const control = formulario.elements[nombre];
    if (!control) continue;
    control.addEventListener('blur', () => {
      tocados.add(nombre);
      validar(nombre);
    });
    control.addEventListener('input', () => {
      if (tocados.has(nombre)) validar(nombre);
    });
  }

  return {
    validarTodo() {
      let primerInvalido = null;
      for (const nombre of Object.keys(reglas)) {
        tocados.add(nombre);
        if (!validar(nombre)) primerInvalido ??= formulario.elements[nombre];
      }
      primerInvalido?.focus();
      return primerInvalido === null;
    },
  };
}

export function crearTabla({ etiqueta, columnas, filas }) {
  const encabezados = columnas.map((col) =>
    h(
      'th',
      { scope: 'col', role: 'columnheader', class: col.alinear === 'derecha' ? 't-derecha' : false },
      col.acciones ? h('span', { class: 'solo-lector' }, col.titulo) : col.titulo,
    ),
  );

  const cuerpo = filas.map((fila) =>
    h(
      'tr',
      { role: 'row' },
      columnas.map((col) =>
        h(
          'td',
          {
            role: 'cell',
            class: col.acciones ? 't-acciones' : col.alinear === 'derecha' ? 't-derecha' : false,
            dataset: { etiqueta: col.titulo },
          },
          col.render(fila),
        ),
      ),
    ),
  );

  return h(
    'div',
    { class: 'tabla-envoltura' },
    h(
      'table',
      { class: 'tabla tabla--apilable', role: 'table' },
      h('caption', { class: 'solo-lector' }, etiqueta),
      h('thead', { role: 'rowgroup' }, h('tr', { role: 'row' }, encabezados)),
      h('tbody', { role: 'rowgroup' }, cuerpo),
    ),
  );
}
