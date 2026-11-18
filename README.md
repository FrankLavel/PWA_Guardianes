# Guardianes del Último Ecosistema — PWA

Página web instalable (PWA) del videojuego educativo **Guardianes del Último Ecosistema**. Presenta el
juego (historia, zonas, granja, personajes, bitácora de especies, controles, qué se aprende, descargas y el
equipo de desarrollo) y permite **jugarlo en el navegador**, también **sin internet** una vez guardado.

## Qué tiene

| Parte | Archivo |
|---|---|
| Página principal con todas las secciones | `index.html`, `css/estilos.css`, `js/app.js` |
| Datos de las 14 especies (los mismos del juego) | `data/especies.json` |
| Manifest de la PWA (nombre, íconos, colores, atajos, capturas) | `manifest.webmanifest` |
| Service worker: la página abre sin internet y el juego se guarda en el dispositivo | `sw.js` |
| Página que se muestra sin conexión si el juego no está guardado | `offline.html` |
| El juego (exportación Web de Godot 4, versión 1.0.0-rc3) | `jugar/` |
| Versiones para Windows (.zip) y Android (.apk) | `descargas/` |
| Script para poner una versión nueva del juego | `herramientas/actualizar_juego.py` |

### Cómo funciona sin internet

- Al abrir la página la primera vez, el service worker guarda la página completa (≈ 2 MB).
- El juego pesa unos 85 MB, así que **no** se descarga solo: se guarda cuando la persona toca
  **Guardar el juego en este dispositivo** (sección Descargas) o la primera vez que juega con internet.
- Las descargas de Windows y Android nunca se guardan en el dispositivo.
- La partida del juego se guarda en el navegador (como en itch.io): cada minuto, al pausar y al salir.

## Probarla en la computadora

Una PWA necesita un servidor (no funciona abriendo `index.html` con doble clic). En esta carpeta:

```bash
python -m http.server 8000
```

y abre <http://localhost:8000>. En Chrome o Edge aparece el botón **Instalar la app** (y el ícono de
instalar en la barra de direcciones).

## Publicarla

Necesita **HTTPS** (todos estos servicios lo dan gratis):

- **GitHub Pages:** sube esta carpeta a un repositorio y en *Settings → Pages* elige la rama `main` y la
  carpeta raíz. Ningún archivo pasa de 100 MB (el más grande es el .apk, 98 MB), pero GitHub avisa por los
  de más de 50 MB; si se prefiere, quita `descargas/` y enlaza a itch.io.
- **Netlify** o **Cloudflare Pages:** arrastra la carpeta completa a su página.

El juego no usa hilos (*threads*), así que no hacen falta encabezados especiales (COOP/COEP).

## Poner una versión nueva del juego

1. Exporta la versión Web desde Godot (preset "Web").
2. En esta carpeta:
   ```bash
   python herramientas/actualizar_juego.py "C:/proyectos/guardianes-del-ultimo-ecosistema-/builds/web" 1.0.0
   ```
   Copia el juego a `jugar/`, le pone el botón para volver a la página y los íconos de la PWA, y cambia la
   versión en `sw.js` para que los dispositivos bajen el juego nuevo. (El ícono y la pantalla de carga con
   el logo ya vienen del propio juego desde la 1.0.0-rc3.)
3. Copia a `descargas/` el .zip de Windows y el .apk nuevos y cambia sus nombres y la versión en la sección
   Descargas de `index.html`.
4. Si cambiaste textos o imágenes de la página, sube `VERSION_PAGINA` en `sw.js` (por ejemplo `pagina-v2`).

## Fotos del equipo

La sección **Equipo de desarrollo** muestra las iniciales de cada integrante. Para poner fotos, guarda una
imagen cuadrada (al menos 256 × 256) con estos nombres y aparecen solas:

- `img/equipo/diego.jpg`
- `img/equipo/ignacio.jpg`
- `img/equipo/francisco.jpg`

## Créditos

Proyecto de la materia *Gestión del proceso de desarrollo de software*, Universidad Tecnológica de Oriente
de Michoacán. Equipo: Diego Arellano Bautista, Ignacio Emiliano Santoyo Gonzales y Francisco Gabriel Lazo
Velázquez. Asesor: Ing. Uriel Cambrón Hernández. Hecho con Godot 4; ilustraciones generadas con IA y
dirigidas por el equipo.
