"""Copia la versión Web del juego a jugar/ y le pone lo de la PWA.

Uso (desde la carpeta pwa_juego_2D):
    python herramientas/actualizar_juego.py "C:/proyectos/guardianes-del-ultimo-ecosistema-/builds/web" 1.0.0-rc2

Qué hace:
  1. Copia los archivos de la exportación Web de Godot a jugar/.
  2. En jugar/index.html: idioma español, el manifest y los íconos de la PWA, y un botón "Inicio" para regresar
     a la página.
  3. Pone la versión en sw.js (VERSION_JUEGO) para que los dispositivos descarguen el juego nuevo.
Después hay que copiar a descargas/ el .zip de Windows y el .apk de la misma versión y cambiar los enlaces
de la sección Descargas en index.html.
"""
import re
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
JUGAR = RAIZ / "jugar"

BOTON_INICIO = """
		<a id="boton-inicio" href="../" title="Volver a la página del juego" aria-label="Volver a la página del juego">⌂</a>
		<style>
#boton-inicio {
	position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 10;
	width: 40px; height: 40px; display: grid; place-items: center;
	font: 700 22px/1 system-ui, sans-serif; color: #f6ecd2; text-decoration: none;
	background: rgba(15, 46, 27, .55); border: 2px solid rgba(246, 236, 210, .45); border-radius: 12px;
	opacity: .55; transition: opacity .2s;
}
#boton-inicio:hover, #boton-inicio:focus-visible { opacity: 1; }
		</style>
		<script>
document.getElementById('boton-inicio').addEventListener('click', (e) => {
	if (!confirm('¿Volver a la página del juego? Tu partida se guarda sola cada minuto y al pausar.')) e.preventDefault();
});
		</script>
"""


def parchar_html():
    ruta = JUGAR / "index.html"
    t = ruta.read_text(encoding="utf-8")
    if "boton-inicio" in t:
        return
    t = t.replace('<html lang="en">', '<html lang="es-MX">', 1)
    t = re.sub(r'<link id="-gd-engine-icon"[^>]*>', '<link rel="icon" type="image/png" href="../img/iconos/favicon.png">', t, count=1)
    t = re.sub(r'<link rel="apple-touch-icon"[^>]*>', '<link rel="apple-touch-icon" href="../img/iconos/apple-touch-icon.png">', t, count=1)
    t = t.replace("</head>", '\t<link rel="manifest" href="../manifest.webmanifest">\n\t\t<meta name="theme-color" content="#0f2e1b">\n\t</head>', 1)
    t = t.replace("Your browser does not support the canvas tag.", "Tu navegador no puede mostrar el juego.")
    t = t.replace("Your browser does not support JavaScript.", "Activa JavaScript para jugar.")
    t = t.replace('<script src="index.js"></script>', BOTON_INICIO + '\t\t<script src="index.js"></script>', 1)
    assert "boton-inicio" in t and "manifest" in t, "No se pudo modificar jugar/index.html"
    ruta.write_text(t, encoding="utf-8")


def poner_version(version):
    sw = RAIZ / "sw.js"
    t = sw.read_text(encoding="utf-8")
    t, n = re.subn(r'const VERSION_JUEGO = "juego-[^"]*";', f'const VERSION_JUEGO = "juego-{version}";', t)
    assert n == 1, "No se encontró VERSION_JUEGO en sw.js"
    sw.write_text(t, encoding="utf-8")


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    origen, version = Path(sys.argv[1]), sys.argv[2]
    if not (origen / "index.pck").exists():
        sys.exit(f"No encontré una exportación Web de Godot en {origen}")
    JUGAR.mkdir(exist_ok=True)
    for archivo in origen.iterdir():
        if archivo.is_file() and not archivo.name.startswith("."):
            shutil.copy2(archivo, JUGAR / archivo.name)
    parchar_html()
    poner_version(version)
    print(f"Listo: jugar/ actualizado a la versión {version}.")


if __name__ == "__main__":
    main()
