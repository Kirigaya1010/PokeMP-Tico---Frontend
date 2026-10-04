# Ninja Adventure

Gráficos de **pixel-boy y AAA**, paquete Ninja Adventure. Selección aprobada por el usuario el 2026-10-03.

- Página del autor y declaración de licencia: https://pixel-boy.itch.io/ninja-adventure-asset-pack
- Repositorio del autor enlazado desde esa página: https://github.com/pixel-boy/NinjaAdventure
- Archivo descargado: https://github.com/pixel-boy/NinjaAdventure/archive/refs/heads/main.zip
- Licencia de los assets: Creative Commons Zero v1.0 Universal (CC0). El autor autoriza uso y modificación, incluso comercial; atribución apreciada, no obligatoria.
- Texto legal: https://creativecommons.org/publicdomain/zero/1.0/legalcode

Solo se incorporaron PNG sin modificar; no se incorporó ni ejecutó código Godot ni música del proyecto.

| Archivo local | Ruta original en el repositorio |
|---|---|
| `floor.png` | `content/map/tileset_floor.png` |
| `village.png` | `content/map/tileset_village_abandoned.png` |
| `player.png` | `content/character/ninja_blue/sprite.png` |

La versión Git exacta y los hashes del archivo descargado y los PNG se registran en `manifest.json`.

## Pack completo y propuesta de mapa (2026-10-03)

Se descargó también `Ninja Adventure - Asset Pack.zip` de la página oficial de itch.io: 94.022.790 bytes, 2.674 entradas. El archivo completo y su inventario permanecen en la biblioteca local del workspace, fuera del frontend público.

La propuesta `design/jimenez-proposal.html` usa los PNG originales `TilesetField.png`, `TilesetHouse.png` y `TilesetNature.png`. También se incorpora `TilesetFloor.png` para consultar el atlas. Rutas originales y hashes están en `full-pack-manifest.json`; `LICENSE.txt` contiene el texto CC0 incluido en el pack. La selección anterior del proyecto de ejemplo conserva su manifest para registrar su procedencia.

## Mapa integrado

El juego usa TilesetField, TilesetHouse, TilesetNature y TilesetWater del pack completo, además del sprite player.png cuya procedencia anterior se conserva. TilesetWater se registra en full-pack-manifest.json. Bancas, fachadas, vegetación, terrenos y madera proceden de recortes originales. Las líneas de cancha y detalles de señalización/cementerio se dibujan mediante Canvas, sin modificar los PNG fuente.

Interiores: TilesetInteriorFloor, TilesetWallSimple y tileset_bed originales del mismo pack; rutas y hashes en interiors-manifest.json.

## Efectos audiovisuales del mundo y combate

PNG originales sin modificar de Ninja Adventure (pixel-boy / AAA), licencia CC0. Ondas de agua, hojas, pasto y sprites FX de garras/fuego/agua/planta/chispas/mejora. Rutas del archivo original, dimensiones y SHA-256 en `../effects/manifest.json`. No se incorpora código del pack ni efectos climáticos nuevos.
