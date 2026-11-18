// Página del juego: menú, bitácora de especies, instalación de la PWA y guardar el juego sin internet.
"use strict";

const ESTADOS = { seguro: "Sin peligro", cuidado: "Necesita cuidado", peligro: "En peligro" };
const ZONAS = { rio: "Río", bosque: "Bosque", lago: "Lago" };

// ------------------------------------------------------------------ Menú en celular
const botonMenu = document.querySelector(".boton-menu");
const menu = document.getElementById("menu");
botonMenu.addEventListener("click", () => {
  const abierto = menu.classList.toggle("abierto");
  botonMenu.setAttribute("aria-expanded", abierto);
});
menu.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    menu.classList.remove("abierto");
    botonMenu.setAttribute("aria-expanded", "false");
  }
});

// ------------------------------------------------------------------ Fotos del equipo (si no hay foto, iniciales)
document.querySelectorAll(".avatar img").forEach((img) => {
  const usarIniciales = () => {
    const span = document.createElement("span");
    span.className = "iniciales";
    span.textContent = img.dataset.iniciales;
    span.setAttribute("aria-hidden", "true");
    img.replaceWith(span);
  };
  if (img.complete && img.naturalWidth === 0) usarIniciales();
  else img.addEventListener("error", usarIniciales, { once: true });
});

// ------------------------------------------------------------------ Bitácora (los mismos datos que el juego)
const contenedorEspecies = document.getElementById("especies");
let especies = [];

function pintarEspecies(zona) {
  contenedorEspecies.replaceChildren(
    ...especies
      .filter((e) => zona === "todas" || e.zona === zona)
      .map((e) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "especie";
        tarjeta.innerHTML = `
          <img src="img/especies/${e.id}.webp" width="110" height="110" loading="lazy" alt="">
          <h3></h3>
          <p class="cientifico"></p>
          <span class="estado ${e.estado}"></span>
          <p></p>`;
        tarjeta.querySelector("img").alt = e.nombre;
        tarjeta.querySelector("h3").textContent = e.nombre;
        tarjeta.querySelector(".cientifico").textContent = `${e.cientifico} · ${ZONAS[e.zona]}`;
        tarjeta.querySelector(".estado").textContent = ESTADOS[e.estado];
        tarjeta.querySelector("p:last-child").textContent = e.dato;
        return tarjeta;
      })
  );
}

fetch("data/especies.json")
  .then((r) => r.json())
  .then((datos) => {
    especies = Object.entries(datos).map(([id, e]) => ({ id, ...e }));
    pintarEspecies("todas");
  })
  .catch(() => { contenedorEspecies.textContent = "No se pudo cargar la bitácora."; });

document.querySelectorAll(".filtro").forEach((boton) => {
  boton.addEventListener("click", () => {
    document.querySelectorAll(".filtro").forEach((b) => b.setAttribute("aria-pressed", b === boton));
    pintarEspecies(boton.dataset.zona);
  });
});

// ------------------------------------------------------------------ Conexión
const estadoRed = document.getElementById("estado-red");
function mostrarRed() {
  estadoRed.textContent = navigator.onLine ? "" : "Estás sin internet: puedes ver esta página y jugar si guardaste el juego en este dispositivo.";
}
addEventListener("online", mostrarRed);
addEventListener("offline", mostrarRed);
mostrarRed();

// ------------------------------------------------------------------ Instalar la app
const botonInstalar = document.getElementById("instalar");
let pedidoInstalar = null;
const yaInstalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  pedidoInstalar = e;
  botonInstalar.hidden = false;
});
botonInstalar.addEventListener("click", async () => {
  if (pedidoInstalar) {
    pedidoInstalar.prompt();
    await pedidoInstalar.userChoice;
    pedidoInstalar = null;
    botonInstalar.hidden = true;
  } else {
    document.getElementById("aviso-ios").hidden = false;
  }
});
addEventListener("appinstalled", () => { botonInstalar.hidden = true; });

// En iPhone/iPad no hay aviso de instalación: se explica cómo hacerlo desde Safari.
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (esIOS && !yaInstalada) botonInstalar.hidden = false;
document.getElementById("cerrar-ios").addEventListener("click", () => {
  document.getElementById("aviso-ios").hidden = true;
});

// ------------------------------------------------------------------ Service worker y juego sin internet
const botonOffline = document.getElementById("guardar-offline");
const textoOffline = document.getElementById("texto-offline");
const barraOffline = document.getElementById("barra-offline");

function mostrarProgreso(listo, total, terminado) {
  // Si el servidor comprime, el tamaño anunciado puede ser menor que lo descargado: se topa en 99 %.
  const porcentaje = total ? Math.min(99, Math.round((listo / total) * 100)) : 0;
  listo = Math.min(listo, total);
  barraOffline.style.width = `${terminado ? 100 : porcentaje}%`;
  if (terminado) {
    textoOffline.textContent = "Listo: el juego está guardado en este dispositivo y ya puedes jugar sin internet.";
    botonOffline.textContent = "Volver a revisar";
    botonOffline.disabled = false;
  } else {
    textoOffline.textContent = `Guardando el juego… ${porcentaje} % (${(listo / 1e6).toFixed(0)} de ${(total / 1e6).toFixed(0)} MB)`;
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then((registro) => {
    navigator.serviceWorker.addEventListener("message", (e) => {
      const m = e.data || {};
      if (m.tipo === "progreso") mostrarProgreso(m.listo, m.total, false);
      if (m.tipo === "juego-guardado") mostrarProgreso(1, 1, true);
      if (m.tipo === "juego-faltante") {
        textoOffline.textContent = "El juego todavía no está guardado en este dispositivo.";
        barraOffline.style.width = "0";
      }
      if (m.tipo === "error") {
        textoOffline.textContent = "No se pudo guardar el juego. Revisa tu conexión y vuelve a intentarlo.";
        botonOffline.disabled = false;
      }
    });
    navigator.serviceWorker.ready.then((sw) => sw.active.postMessage({ tipo: "revisar-juego" }));
    botonOffline.addEventListener("click", async () => {
      botonOffline.disabled = true;
      textoOffline.textContent = "Preparando la descarga…";
      (await navigator.serviceWorker.ready).active.postMessage({ tipo: "guardar-juego" });
    });
    return registro;
  }).catch(() => {
    botonOffline.disabled = true;
    textoOffline.textContent = "Este navegador no permite guardar el juego para jugar sin internet.";
  });
} else {
  botonOffline.disabled = true;
  textoOffline.textContent = "Este navegador no permite guardar el juego para jugar sin internet.";
}
