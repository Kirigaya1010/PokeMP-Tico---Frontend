# Recursos de la propuesta visual del sitio

Propuesta aislada de producción, 2026-10-03. No modifica sprites, mapa, mecánicas, autenticación o backend.

- Marcos originales: Ui/Theme/Wip/ThemeMetal3 y ThemeBubble, extraídos sin alterar píxeles del ZIP aprobado Ninja Adventure de pixel-boy y AAA. Fuente: https://pixel-boy.itch.io/ninja-adventure-asset-pack . El autor declara CC0 y ausencia de IA generativa. El resto de imágenes en esta carpeta son referencias del mismo pack.
- Fuente propuesta VT323, Peter Hull, copyright 2011 The VT323 Project Authors. https://github.com/google/fonts/tree/main/ofl/vt323 . Licencia SIL OFL 1.1 conservada en VT323-OFL.txt. Archivo original sin modificar. Tabla de caracteres inspeccionada: ñ, á, é, í, ó, ú, ¿, ¡ presentes.
- NormalFont.ttf del ZIP solo se conserva como referencia de investigación, NO se carga: metadata interna indica FontStruct Non-Commercial License y faltan ñ, ¿, ¡. No se supone que el anuncio CC0 resuelve esa contradicción.
- Pokémon: sprites ya incorporados y autorizados para el prototipo; procedencia existente en assets/img/pokemon/CREDITS.md.
- Vista de Jiménez: renderer y mapa reales existentes, usados sin cambio de gráficos. Sin cuentas, WebSocket, persistencia ni mediciones ficticias. Formularios/botones desactivados en la propuesta.
- Tras la aprobación posterior, usa caribe-pokemon.png: ilustración promocional generada como alternativa expresamente autorizada por el usuario. UI y fuentes siguen siendo de artistas. No usa caribe-hero.png. Marcos escalados por border-image; interiores/colores/composición definidos en CSS, sin redibujar recursos del artista.

El usuario aprobó el estilo y pidió sustituir la imagen del mapa por una ilustración regional. Composición, marcos y VT323 integrados en producción.
