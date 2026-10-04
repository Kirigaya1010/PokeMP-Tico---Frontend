# Audio de Pokémon para el prototipo

El usuario autorizó expresamente estas fuentes el 2026-10-03. Esta autorización no se presenta como licencia libre ni como cesión de derechos de terceros.

- Pokémon Rojo Fuego / Verde Hoja: música y sonidos originales de GAME FREAK / Nintendo / The Pokémon Company.
- Secuencias e instrumentos obtenidos de [pret/pokefirered](https://github.com/pret/pokefirered/tree/master/sound). Pueblo Paleta, batalla de entrenador, victoria de entrenador y efectos select/effective/failure/faint.
- Gritos clásicos de Bulbasaur, Charmander y Squirtle obtenidos de [PokéAPI/cries](https://github.com/PokeAPI/cries). Su [declaración](https://github.com/PokeAPI/cries/blob/main/LICENSE) reconoce copyright de The Pokémon Company; se conserva en CRIES_LICENSE.txt y no se interpreta como autorización libre del material original.

Los MIDI se renderizaron con sus muestras de instrumentos y ondas PSG mediante `tools/audio/prepare_frlg.py`, y se codificaron a MP3 con FFmpeg. El mezclador aproxima envolventes y canales: no es una grabación oficial ni una emulación exacta del motor de GBA. Los gritos se convirtieron desde OGG legacy a MP3.

`manifest.json` registra rutas, fuentes y SHA-256 de los archivos servidos. `asset-library/pokemon-audio/sources.json` conserva fuentes y hashes de secuencias, bancos, muestras y gritos de entrada. Las muestras de trabajo no se publican mediante el gateway temporal.

Calle Vieja incorpora los gritos legacy de Caterpie (10), Weedle (13), Pidgey (16) y Rattata (19) desde PokeAPI/cries, convertidos a MP3; fuente y hashes en manifest.json. Conserva las pistas existentes de exploración y batalla.
