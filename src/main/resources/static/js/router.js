import { crearEncabezado, crearEstadoError, crearEstadoVacio, vistaPendiente } from './ui.js';

const TITULO_APP = 'AutoDrive Motors';

/** Lee el hash actual: "#/taller/5" -> { id: "taller", parametros: ["5"] }. */
function leerHash() {
  const segmentos = window.location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
  const [id = '', ...parametros] = segmentos;
  return { id, parametros };
}

export function crearRouter({ rutas, porDefecto, contenedor, alCambiar }) {
  const porId = new Map(rutas.map((r) => [r.id, r]));

  let version = 0;          
  let desmontarActual = null;
  let primeraCarga = true;  

  function navegar(destino) {
    const hash = `#/${destino}`;
    if (window.location.hash === hash) resolver();
    else window.location.hash = hash;
  }

  function recargar() {
    resolver();
  }

  async function resolver() {
    const { id, parametros } = leerHash();

    if (!id) {
      window.history.replaceState(null, '', `#/${porDefecto}`);
      return resolver();
    }

    version += 1;
    const miVersion = version;
    const esVigente = () => miVersion === version;

    
    if (typeof desmontarActual === 'function') {
      try { desmontarActual(); } catch (error) { console.error(error); }
    }
    desmontarActual = null;

    const ruta = porId.get(id);
    alCambiar?.(ruta ?? null);

    if (!ruta) {
      document.title = `Página no encontrada · ${TITULO_APP}`;
      contenedor.replaceChildren(
        crearEncabezado({ titulo: 'Página no encontrada' }),
        crearEstadoVacio({
          iconoNombre: 'info',
          titulo: 'Esta página no existe',
          mensaje: 'Revisa la dirección o vuelve al panel principal.',
          accion: { texto: 'Ir al panel', icono: 'panel', alAccionar: () => navegar(porDefecto) },
        }),
      );
      enfocarTitulo();
      return undefined;
    }

    document.title = `${ruta.titulo} · ${TITULO_APP}`;
    window.scrollTo(0, 0);

    if (!ruta.lista) {
      vistaPendiente(contenedor, { titulo: ruta.titulo, descripcion: ruta.descripcion });
      enfocarTitulo();
      return undefined;
    }

    contenedor.replaceChildren();
    contenedor.setAttribute('aria-busy', 'true');

    try {
      const modulo = await ruta.cargar();
      if (!esVigente()) return undefined;

      const promesa = modulo.montar(contenedor, { parametros, navegar, recargar, esVigente });
      enfocarTitulo();
      const limpieza = await promesa;

      if (esVigente()) desmontarActual = limpieza;
      else if (typeof limpieza === 'function') limpieza();
    } catch (error) {
      if (!esVigente()) return undefined;
      contenedor.replaceChildren(
        crearEncabezado({ titulo: ruta.titulo }),
        crearEstadoError(error, { reintentar: recargar }),
      );
      enfocarTitulo();
    } finally {
      if (esVigente()) contenedor.removeAttribute('aria-busy');
    }
    return undefined;
  }

  function enfocarTitulo() {
    if (primeraCarga) {
      primeraCarga = false;
      return;
    }
    const titulo = contenedor.querySelector('h1');
    (titulo ?? contenedor).focus({ preventScroll: true });
  }

  function iniciar() {
    window.addEventListener('hashchange', resolver);
    return resolver();
  }

  return { iniciar, navegar, recargar };
}
