// Service worker de la página de Guardianes del Último Ecosistema.
// - La página (textos, estilos, imágenes) se guarda al instalar: se abre aunque no haya internet.
// - El juego (unos 85 MB) se guarda cuando la persona toca "Guardar el juego en este dispositivo" o la
//   primera vez que juega con internet; después se sirve desde el dispositivo.
// - Las descargas (.zip y .apk) nunca se guardan aquí: son muy pesadas.
// Al publicar una versión nueva del juego o de la página, cambia VERSION_PAGINA o VERSION_JUEGO.

const VERSION_PAGINA = "pagina-v1";
const VERSION_JUEGO = "juego-1.0.0-rc3";
const CACHE_PAGINA = `guardianes-${VERSION_PAGINA}`;
const CACHE_JUEGO = `guardianes-${VERSION_JUEGO}`;
const CACHE_FUENTES = "guardianes-fuentes";

const PAGINA = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/estilos.css",
  "./js/app.js",
  "./data/especies.json",
  "./img/capturas/celular.webp",
  "./img/capturas/granja_limpia.webp",
  "./img/capturas/zona_bosque.webp",
  "./img/capturas/zona_lago.webp",
  "./img/capturas/zona_rio.webp",
  "./img/capturas/granja.webp",
  "./img/capturas/lago.webp",
  "./img/capturas/minijuego.webp",
  "./img/capturas/noche.webp",
  "./img/capturas/rio.webp",
  "./img/especies/achoque.webp",
  "./img/especies/acocil.webp",
  "./img/especies/carpintero.webp",
  "./img/especies/encino.webp",
  "./img/especies/garza.webp",
  "./img/especies/martin_pescador.webp",
  "./img/especies/monarca.webp",
  "./img/especies/oyamel.webp",
  "./img/especies/pato_mexicano.webp",
  "./img/especies/pescado_blanco.webp",
  "./img/especies/pez_rio.webp",
  "./img/especies/pino.webp",
  "./img/especies/tule.webp",
  "./img/especies/venado.webp",
  "./img/iconos/apple-touch-icon.png",
  "./img/iconos/favicon.png",
  "./img/iconos/hoja.webp",
  "./img/iconos/icono-192.png",
  "./img/iconos/icono-512.png",
  "./img/iconos/icono-maskable-512.png",
  "./img/logo.webp",
  "./img/fondo_bosque.webp",
  "./img/personajes/achi.webp",
  "./img/personajes/don_chucho.webp",
  "./img/personajes/gara.webp",
  "./img/personajes/mari.webp",
  "./img/personajes/nina.webp",
  "./img/portada.jpg",
];

const JUEGO = [
  "./jugar/index.html",
  "./jugar/index.js",
  "./jugar/index.wasm",
  "./jugar/index.pck",
  "./jugar/index.audio.worklet.js",
  "./jugar/index.audio.position.worklet.js",
  "./jugar/index.png",
  "./jugar/index.icon.png",
  "./jugar/index.apple-touch-icon.png",
];

const absoluta = (ruta) => new URL(ruta, self.registration.scope).href;

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE_PAGINA).then((c) => c.addAll(PAGINA)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  const vigentes = [CACHE_PAGINA, CACHE_JUEGO, CACHE_FUENTES];
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith("guardianes-") && !vigentes.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;
  const url = new URL(peticion.url);

  // Letras de Google Fonts: se usan las guardadas y se actualizan por detrás.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    evento.respondWith(guardadoYActualizar(CACHE_FUENTES, peticion));
    return;
  }
  if (url.origin !== self.location.origin) return;

  const ruta = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (ruta.startsWith("descargas/")) return;  // siempre de internet
  if (ruta.startsWith("jugar/")) {
    evento.respondWith(desdeElJuego(peticion));
    return;
  }
  if (peticion.mode === "navigate") {
    evento.respondWith(primeroInternet(peticion));
    return;
  }
  evento.respondWith(guardadoYActualizar(CACHE_PAGINA, peticion));
});

// Página: con internet se trae la más nueva; sin internet, la guardada (o la página de "sin conexión").
async function primeroInternet(peticion) {
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) (await caches.open(CACHE_PAGINA)).put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    return (await caches.match(peticion, { ignoreSearch: true }))
      || (await caches.match(absoluta("./index.html")))
      || caches.match(absoluta("./offline.html"));
  }
}

async function guardadoYActualizar(nombreCache, peticion) {
  const cache = await caches.open(nombreCache);
  const guardada = await cache.match(peticion, { ignoreSearch: true });
  const nueva = fetch(peticion).then((r) => {
    if (r.ok || r.type === "opaque") cache.put(peticion, r.clone());
    return r;
  }).catch(() => guardada);
  return guardada || nueva;
}

// Juego: si ya está guardado se usa ese (abre sin internet); si no, se trae y se guarda para la próxima.
async function desdeElJuego(peticion) {
  const cache = await caches.open(CACHE_JUEGO);
  const guardada = await cache.match(peticion, { ignoreSearch: true });
  if (guardada) return guardada;
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    if (peticion.mode === "navigate") return caches.match(absoluta("./offline.html"));
    return Response.error();
  }
}

// ------------------------------------------------------------------ Mensajes de la página
self.addEventListener("message", (evento) => {
  const tipo = evento.data && evento.data.tipo;
  if (tipo === "revisar-juego") evento.waitUntil(revisarJuego());
  if (tipo === "guardar-juego") evento.waitUntil(guardarJuego());
});

async function avisar(mensaje) {
  for (const cliente of await self.clients.matchAll({ type: "window" })) cliente.postMessage(mensaje);
}

async function faltantes() {
  const cache = await caches.open(CACHE_JUEGO);
  const faltan = [];
  for (const ruta of JUEGO) if (!(await cache.match(absoluta(ruta)))) faltan.push(ruta);
  return faltan;
}

async function revisarJuego() {
  await avisar({ tipo: (await faltantes()).length ? "juego-faltante" : "juego-guardado" });
}

// Descarga lo que falte del juego avisando el avance (los dos archivos grandes son casi todo el peso).
async function guardarJuego() {
  try {
    const cache = await caches.open(CACHE_JUEGO);
    const faltan = await faltantes();
    if (!faltan.length) return avisar({ tipo: "juego-guardado" });
    const tamanos = await Promise.all(faltan.map(async (ruta) => {
      const r = await fetch(absoluta(ruta), { method: "HEAD", cache: "no-store" });
      return Number(r.headers.get("content-length")) || 0;
    }));
    const total = tamanos.reduce((a, b) => a + b, 0);
    let listo = 0;
    let ultimoAviso = 0;
    for (const ruta of faltan) {
      const respuesta = await fetch(absoluta(ruta), { cache: "no-store" });
      if (!respuesta.ok) throw new Error(`${ruta}: ${respuesta.status}`);
      const lector = respuesta.body.getReader();
      const partes = [];
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        partes.push(value);
        listo += value.length;
        if (Date.now() - ultimoAviso > 250) {
          ultimoAviso = Date.now();
          avisar({ tipo: "progreso", listo, total });
        }
      }
      // Solo el tipo: el cuerpo ya viene descomprimido, así que no se copian content-encoding ni content-length.
      const tipoArchivo = respuesta.headers.get("content-type") || "";
      const cuerpo = new Blob(partes, { type: tipoArchivo });
      await cache.put(absoluta(ruta), new Response(cuerpo, { headers: { "content-type": tipoArchivo } }));
    }
    await avisar({ tipo: "juego-guardado" });
  } catch (error) {
    await avisar({ tipo: "error", detalle: String(error) });
  }
}
