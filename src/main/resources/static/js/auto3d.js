/**
 * AutoDrive Motors - auto 3D controlado por el scroll (portada de la vitrina)
 * Ruta: src/main/resources/static/js/auto3d.js
 *
 * Un solo auto en un <canvas> fijo. Al bajar, la cámara le da la vuelta
 * (perfil -> 3/4 -> vista desde arriba -> trasera -> 3/4) mientras el fondo pasa
 * de negro a gris claro y a blanco, y cambian los textos.
 *
 * Es una mejora progresiva: si no hay WebGL, si falta GSAP o si el modelo no
 * carga, la portada se queda como HTML normal (con la placa amarilla).
 * Con "reducir movimiento" activado se muestra el auto quieto, sin scroll animado.
 *
 * El auto se dibuja solo cuando cambia el scroll o el tamaño de la ventana:
 * no hay un ciclo de render corriendo todo el tiempo.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const RUTA_MODELO = 'models/auto.glb';

const seccion = document.querySelector('.historia');
const escenario = document.querySelector('.historia__escenario');
const lienzo = document.getElementById('auto3d');
const pasos = [...document.querySelectorAll('.paso')];

const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esquemaOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Altura (en metros del modelo) a la que mira la cámara: más alto = el auto se ve más abajo. */
const MIRA_Y = 0.42;

/** Pose de la cámara: azimut y elevación en grados, distancia en unidades del modelo. */
const estado = { az: 0, el: 3, dist: 3.9 };

let renderizador;
let escena;
let camara;

/* --------------------------------------------------------------------------
   Escena
   -------------------------------------------------------------------------- */

function crearRenderizador() {
  const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1;
  return r;
}

/** Sombra de contacto falsa (degradado radial): barata y sin mapas de sombras. */
function crearSombra() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null; // sin sombra, el auto igual se ve
  const degradado = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  degradado.addColorStop(0, 'rgba(0,0,0,0.6)');
  degradado.addColorStop(0.55, 'rgba(0,0,0,0.25)');
  degradado.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = degradado;
  g.fillRect(0, 0, 256, 256);

  const textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.scale.set(2.7, 1.3, 1);
  sombra.position.y = 0.004;
  return sombra;
}

async function cargarAuto() {
  const gltf = await new GLTFLoader().loadAsync(RUTA_MODELO);
  const auto = gltf.scene;

  // Centra el auto en el origen y apoya las ruedas en el suelo (y = 0)
  const caja = new THREE.Box3().setFromObject(auto);
  const centro = caja.getCenter(new THREE.Vector3());
  auto.position.set(-centro.x, -caja.min.y, -centro.z);

  const anisotropia = Math.min(8, renderizador.capabilities.getMaxAnisotropy());
  auto.traverse((objeto) => {
    if (!objeto.isMesh) return;
    for (const clave of ['map', 'normalMap', 'metalnessMap', 'roughnessMap']) {
      if (objeto.material[clave]) objeto.material[clave].anisotropy = anisotropia;
    }
  });
  return auto;
}

function armarEscena(auto) {
  escena = new THREE.Scene();
  camara = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

  // Reflejos de estudio sin cargar ningún archivo HDR
  const generador = new THREE.PMREMGenerator(renderizador);
  escena.environment = generador.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 0.9;

  const luz = new THREE.DirectionalLight(0xffffff, 1.3);
  luz.position.set(2, 3, 2);
  const sombra = crearSombra();
  escena.add(luz, auto);
  if (sombra) escena.add(sombra);
}

/* --------------------------------------------------------------------------
   Dibujo
   -------------------------------------------------------------------------- */

/** En pantallas estrechas se aleja la cámara para que el auto quepa de ancho. */
function factorEncuadre() {
  const aspecto = camara.aspect;
  return Math.min(3.6, Math.max(1, 1.78 / aspecto));
}

function dibujar() {
  const az = THREE.MathUtils.degToRad(estado.az);
  const el = THREE.MathUtils.degToRad(estado.el);
  const d = estado.dist * factorEncuadre();
  camara.position.set(
    Math.sin(az) * Math.cos(el) * d,
    MIRA_Y + Math.sin(el) * d,
    Math.cos(az) * Math.cos(el) * d,
  );
  camara.lookAt(0, MIRA_Y, 0);
  renderizador.render(escena, camara);
}

function ajustarTamano() {
  const ancho = lienzo.clientWidth;
  const alto = lienzo.clientHeight;
  if (!ancho || !alto) return;
  renderizador.setSize(ancho, alto, false);
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
  dibujar();
}

/* --------------------------------------------------------------------------
   Animación con el scroll
   -------------------------------------------------------------------------- */

/** Lee los colores de la página (así respeta el modo oscuro) */
function colores() {
  const css = getComputedStyle(document.documentElement);
  const leer = (nombre) => css.getPropertyValue(nombre).trim();
  return { suave: leer('--suave'), lienzo: leer('--lienzo'), tinta: leer('--tinta') };
}

function crearAnimacion() {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const c = colores();
  const [paso1, paso2, paso3] = pasos;

  gsap.set(seccion, { backgroundColor: '#000000', color: '#F5F5F7' });
  gsap.set([paso2, paso3], { autoAlpha: 0, y: 24 });

  // El anillo de foco necesita contraste: en fondo claro se usa el azul oscuro
  const marcarTono = (progreso) => {
    seccion.dataset.tono = progreso > 0.33 && !esquemaOscuro ? 'claro' : 'oscuro';
  };
  marcarTono(0);

  const linea = gsap.timeline({
    defaults: { ease: 'power1.inOut' },
    scrollTrigger: {
      trigger: seccion,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate: (self) => marcarTono(self.progress),
    },
    onUpdate: dibujar,
  });

  // Cámara: perfil -> 3/4 delantera -> desde arriba -> trasera -> 3/4 final
  linea
    .to(estado, { az: -40, el: 14, dist: 3.5, duration: 0.25 }, 0)
    .to(estado, { az: 0, el: 82, dist: 4.6, duration: 0.25 }, 0.3)
    .to(estado, { az: 90, el: 6, dist: 3.6, duration: 0.25 }, 0.58)
    .to(estado, { az: -50, el: 10, dist: 3.4, duration: 0.14 }, 0.86);

  // Textos: cada uno entra cuando el fondo ya cambió y sale antes del siguiente cambio
  linea
    .to(paso1, { autoAlpha: 0, y: -24, duration: 0.08 }, 0.16)
    .to(paso2, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.4)
    .to(paso2, { autoAlpha: 0, y: -24, duration: 0.08 }, 0.62)
    .to(paso3, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.86);

  // Fondo: negro -> gris claro -> blanco (o sus equivalentes en modo oscuro)
  linea
    .to(seccion, { backgroundColor: c.suave, color: c.tinta, duration: 0.14 }, 0.26)
    .to(seccion, { backgroundColor: c.lienzo, duration: 0.1 }, 0.78);
}

/* --------------------------------------------------------------------------
   Arranque
   -------------------------------------------------------------------------- */

async function iniciar() {
  if (!seccion || !escenario || !lienzo) return;
  if (!sinMovimiento && !(window.gsap && window.ScrollTrigger)) {
    console.warn('GSAP no está disponible: se deja la portada sin animación 3D.');
    return;
  }

  try {
    renderizador = crearRenderizador();
    armarEscena(await cargarAuto());
  } catch (error) {
    // Sin WebGL o sin modelo: la portada queda como HTML normal
    console.warn('No se pudo iniciar el auto 3D:', error);
    renderizador?.dispose();
    return;
  }

  if (sinMovimiento) {
    // Auto quieto en 3/4 y solo el primer texto
    Object.assign(estado, { az: -40, el: 12, dist: 3.6 });
    seccion.classList.add('historia--estatica');
  } else {
    seccion.classList.add('historia--3d');
  }

  ajustarTamano();
  new ResizeObserver(ajustarTamano).observe(lienzo);

  if (!sinMovimiento) crearAnimacion();
  dibujar();
  requestAnimationFrame(() => seccion.classList.add('historia--lista'));
}

iniciar();
