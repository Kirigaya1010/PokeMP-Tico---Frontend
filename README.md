# PokéMMO Tiquicia Edition — Frontend

HTML, JavaScript con módulos nativos y assets, sin framework ni proceso de build. Portada pública, modal de registro/login y vista del juego conectada al backend aprobado.

## Configuración y ejecución

1. Ejecutar el Worker siguiendo el README de `PokeMP-Tico---Backend`.
2. Configurar `BACKEND_URL` en `src/config.js` con su origen exacto, por ejemplo `http://localhost:8787` para desarrollo o `https://<worker>.workers.dev` para producción. Se rechazan URLs con credenciales, ruta, parámetros y HTTP fuera de localhost.
3. En el backend, incluir el origen del frontend en `ALLOWED_ORIGINS` (por ejemplo `http://localhost:8080`) y configurar `AUTH_RATE_LIMIT_SECRET`. No añadir secretos al frontend.
4. Servir esta carpeta por HTTP. Si Python 3 está disponible:

```sh
python3 -m http.server 8080 --bind localhost
```

Abrir `http://localhost:8080`. No abrir `index.html` mediante `file://`, porque usa módulos y el backend valida el origen.

Para GitHub Pages, configurar una URL HTTPS real del Worker y permitir en este el origen `https://<usuario>.github.io`, sin ruta del repositorio. Los assets y módulos usan rutas relativas compatibles con Pages. La configuración pública apunta actualmente al Worker local en `http://localhost:8787`; cambiarla antes de publicar. Si se deja vacía, el formulario queda deshabilitado. No se ha desplegado esta entrega.

## Acceso y presencia

- Username de 3–24 letras/números/`_` y contraseña de 12–128 caracteres, conforme a las reglas aprobadas. El servidor siempre vuelve a validar los datos.
- Crear cuenta inicia sesión; login entra a una cuenta existente. No se solicita correo. Los errores de acceso aparecen en la página.
- El token se conserva únicamente en memoria JavaScript. No hay persistencia en localStorage, sessionStorage ni cookies. Recargar requiere login nuevamente; la cuenta y el progreso continúan en el servidor.
- Logout solicita la revocación al servidor. Si no se puede confirmar por un fallo de red, se conserva la sesión en memoria para permitir reintentar; no se muestra un cierre exitoso falso.
- Tras el acceso se consulta el perfil propio y se obtiene un ticket de un solo uso para WebSocket. Se muestran nombres de jugadores conectados, incluyendo al propio jugador y sin exponer tokens o progreso ajeno.
- Los nombres recibidos se insertan como texto, sin interpretar HTML. Las conexiones sustituidas ignoran respuestas antiguas y vacían la lista para evitar mostrar jugadores de una conexión cerrada.
- Al perder conexión se muestra el botón **Reconectar**. No hay reconexión automática. El cliente envía ping periódicamente para detectar conexiones interrumpidas; al reconectar solicita otro ticket. Expiración o revocación confirmada devuelve al formulario de acceso.
- Cerrar o abandonar la página cierra su WebSocket; no revoca automáticamente la sesión guardada en el servidor, que mantiene su duración aprobada de siete días.

## Archivos

| Archivo | Función |
|---|---|
| `index.html` | Formularios, perfil y lista de jugadores |
| `assets/css/style.css` | Estilo y adaptación de la interfaz |
| `src/config.js` | Origen público del backend |
| `src/api.js` | Peticiones HTTP y URLs WebSocket |
| `src/realtime.js` | Tickets, presencia y estado de conexión |
| `src/main.js` | Interacciones y sesión en memoria |

## Pueblo Jiménez

Tras iniciar sesión se conecta el mapa de Jiménez con plaza central, casas, árboles, tienda y centro médico señalizados. Haz clic en el mapa y usa WASD o flechas. La cámara sigue al personaje. Velocidad: 6 tiles/s caminando, 12 tiles/s manteniendo Shift y sin ventaja diagonal. No se capturan controles mientras se escribe en los formularios; perder el foco detiene la entrada.

El servidor valida límites y obstáculos, difunde posiciones y guarda cada movimiento aceptado. El cliente interpola los cambios para suavizar la presentación. Los jugadores se pueden atravesar. La cuenta inicia en la plaza o restaura su posición guardada. La pestaña más reciente controla el personaje; otra pestaña muestra modo observador y ofrece **Reconectar** para tomar el control.

Los gráficos son del pack Ninja Adventure aprobado, de pixel-boy y AAA, bajo CC0. Fuentes, licencia y hashes están en `assets/img/ninja-adventure/CREDITS.md` y `manifest.json`; no se ejecuta código del proyecto de origen. `src/game.js` carga estos PNG y dibuja el mundo en Canvas.

Viviendas, tienda y centro médico permiten entrar con E. Calle Vieja conecta hacia Guápiles, que todavía no está disponible. Personajes, iniciales, vecinos, combate PvE/PvP y captura están integrados según las secciones siguientes. Registro/login local fueron confirmados por el usuario; el movimiento está implementado y revisado en código, sin pruebas ejecutadas en esta iteración. Recarga la vista previa e inicia sesión nuevamente para recibir los módulos y protocolo actualizados.

### Ampliación integrada de Jiménez

Zona de 80×64 tiles de 16 px: manzanas residenciales, parque con jardines/bancas, cancha, iglesia, escuela, cementerio, Calle Vieja, Ruta 810, Ruta 32, río y paseo. Guápiles queda al oeste. La geometría inicial llega del backend; `src/world-renderer.js` cachea terreno con transiciones y dibuja sprites originales a su tamaño nativo, ordenados por la base. Árboles colisionan por el tronco; el servidor bloquea agua y permite cruzar los puentes.

Los recursos del pack completo y sus hashes/licencia están en `assets/img/ninja-adventure/full-pack-manifest.json`, `LICENSE.txt` y `CREDITS.md`. El césped usa un interior opaco; los bordes se seleccionan por vecinos. Los PNG no se modifican.

`design/jimenez-integrado.html` muestra el mapa completo mediante el mismo renderer, sin cuentas ni jugadores. Su JSON es una exportación de `src/jimenez.js` del repositorio backend; regenerarlo cuando cambie la geometría. Las propuestas antiguas son documentación de diseño y no el mapa actual. Sintaxis de módulos y presentación completa revisadas; no se ejecutaron pruebas funcionales de esta ampliación.

### Skin custom de Jarodski

`assets/img/custom/jarodski.png` es el spritesheet aportado por el usuario. `WorldRenderer` renderiza sus cuatro direcciones y cuatro fotogramas cuando el snapshot del servidor trae `skinId: "jarodski"`. El renderer usa el personaje elegido del catálogo; si el PNG custom no carga se conserva el personaje habitual como respaldo. El servidor autoriza la skin exclusiva por username autenticado sin distinguir mayúsculas, y Jarodski puede alternarla con las opciones del pack. Recargar el frontend e iniciar sesión de nuevo para cargar esta versión. Fuente y hash registrados en `assets/img/custom/CREDITS.md`. Sin pruebas funcionales ejecutadas en esta entrega.

## Selección inicial y menú de equipo

Al iniciar sesión, las cuentas sin selección completa pasan por dos pantallas: personaje (91 opciones del pack, con búsqueda por nombre y preview) y Bulbasaur/Charmander/Squirtle de nivel 5. Jarodski puede elegir los personajes del pack o su skin exclusiva. Confirmar guarda el inicial una sola vez y el personaje actual en el backend, y luego conecta al mapa. El diálogo permite cerrar sesión, pero no saltarse la selección. Las cuentas existentes también completan este paso; su posición se conserva. Al volver, la selección se restaura desde el backend.

`src/trainer-ui.js` muestra el equipo propio, hasta seis espacios, con P o el botón Equipo; Escape lo cierra. Es un menú de consulta con PS, XP hacia siguiente nivel, tipos, habilidad, naturaleza, estadísticas y movimientos/PP. Abrirlo pausa el envío de movimiento del jugador. Al abrir se actualiza el perfil por `/api/me`; no guarda tokens en navegador ni expone equipos ajenos.

`src/characters.json` registra los PNG originales, layouts y hashes. El renderer carga las animaciones de los personajes presentes cuando las necesita; la elección procede del servidor. Fuentes/licencias en `assets/img/characters/CREDITS.md` y `assets/img/pokemon/CREDITS.md`.

Para ver la presentación sin crear cuentas: `design/trainer-preview.html` y los parámetros `?screen=starter` / `?screen=team`. Usan el mismo módulo de interfaz con datos de ejemplo y API en memoria, sin guardado, login ni conexión multijugador; no son el juego real ni se exponen en el túnel. No se ejecutaron pruebas funcionales en esta entrega.

## Personaje, PvP y comunicación

- **Personaje** abre el selector para cambiar de skin; mantiene inicial, equipo y posición. Jarodski dispone también de su opción exclusiva. El cambio se guarda en backend y se difunde a quienes estén conectados.
- Selecciona otro jugador en el mapa o su nombre en la lista. Su ficha permite **Retar** o **Susurrar**. El reto debe aceptarse, vence en 60 s y se puede cancelar/rechazar.
- En un duelo amistoso, **Luchar** permite elegir movimiento, **Pokémon** permite cambiar a otro vivo y **Rendirse** termina el duelo. Ambos envían una acción; el servidor resuelve y actualiza PS/PP/registro. Tu Pokémon usa sprite de espalda; el rival aparece arriba. El movimiento se pausa durante el combate.
- Equipo de duelo con PS/PP completos; sin premios, XP ni cambios al equipo guardado. Plazo de acción 60 s y gracia de desconexión 30 s; botón de reconexión manual dentro de batalla. Solo la pestaña más reciente controla las acciones.
- Chat con selector **Global** o **Susurro a…**, texto plano de hasta 200 caracteres y máximo 5 mensajes cada 10 s por cuenta. Últimos 100 mensajes en memoria, sin almacenamiento local o historial del servidor. Cerrar sesión limpia los mensajes de esta cuenta.

`src/social-ui.js` presenta los estados enviados por el servidor; `src/realtime.js` transporta acciones y mensajes, sin calcular resultados. `design/social-preview.html` muestra el layout con datos de ejemplo sin sockets/cuentas/guardado; `?screen=chat` muestra la presentación de chat. Estas vistas no constituyen prueba funcional de multiplayer.

Después de actualizar, recargar la página e iniciar sesión. Sintaxis y vista de diseño revisadas. Validación del flujo real entre jugadores, plazos y susurros pendiente; no se ejecutaron pruebas funcionales ni automatizadas en esta entrega.

## Menú y audio

**Menú del juego** reúne equipo, cambio de skin, bolsa y opciones de audio. La bolsa permite consultar objetos y usar pociones o Talue-go. P conserva el atajo al equipo. Menús pausan el movimiento; los plazos del duelo siguen activos.

`src/audio.js` reproduce MP3 de FR/LG para Jiménez, PvP y victoria, cuatro SFX y gritos de los iniciales. `assets/audio/manifest.json` documenta rutas, bucles, fuentes, tamaños y SHA-256. `assets/audio/CREDITS.txt` y CREDITS.md conservan autoría y alcance del prototipo. Las secuencias se renderizan de forma aproximada desde instrumentos fuente; no es una emulación exacta de GBA.

Audio después de interacción humana, música 30% y efectos 60% por defecto; se puede silenciar o ajustar por separado en Opciones. Solo estas preferencias se guardan en `localStorage` bajo `pokemp.audio.v1`; cuenta, token, posición y equipo no se guardan allí. Ocultar la pestaña pausa música y cancela efectos; regresar reanuda música. Fallos de carga/audio no bloquean red ni juego. Cierre de sesión detiene el audio.

El servidor emite lotes numerados de sonidos tras resolver acciones, y el cliente omite duplicados o golpes pasados al entrar a un duelo. Reproducción y volumen en partidas reales pendientes de confirmación humana; sintaxis y presentación revisadas sin pruebas funcionales.

## Portada y vista del juego

`index.html` presenta PokéMMO Tiquicia Edition y su inspiración en Costa Rica/Caribe. `src/site.js` controla acceso modal y navegación hacia `#jugar`: ambas vistas viven en el mismo documento para mantener el token solo en memoria. Recargar o abrir otra pestaña requiere login; no se transmite el token por URL. Volver a la portada conserva la sesión y conexión existentes, pausa movimiento y permite regresar con Juega ahora. Los plazos PvP siguen activos.

`assets/css/site.css` contiene la nueva presentación y tipografías locales Outfit/Inter; licencias, créditos y hashes en `assets/fonts`. Ilustración promocional original y prompt en `assets/img/landing`; no representa una captura del mapa jugable.

Juego con mapa/interfaz, chat a la derecha y controles debajo. Indicador de latencia real de ida y vuelta por WebSocket: reloj monotónico local, ping con id y eco del servidor, primera muestra al conectar y cada 25 s. — ms indica que no hay muestra disponible. No utiliza mediciones HTTP, valores simulados ni servicios de métricas.

Revisadas sintaxis y vistas de diseño; login/navegación/RTT y uso real bajo el layout quedan pendientes de confirmación humana. No se añadieron pruebas automáticas ni se modificaron cuentas para la revisión.

## Calle Vieja y PvE

Primera ruta desde la salida oeste de Jiménez por Calle Vieja: tres tramos y unos tres minutos sin combates. Seis entrenadores con victorias por cuenta; pasto alto con Pidgey, Rattata, Caterpie y Weedle. El servidor valida encuentros y resuelve combates, XP/EV, PS/PP y aprendizajes. Evolución y Guápiles quedan pendientes; captura y economía se integran en la entrega siguiente.

Curación gratuita: E en la puerta del centro médico de Jiménez para entrar, acercarse a recepción y pulsar E para solicitar la curación. PvE conserva el equipo real; pérdida/rendición/abandono devuelve a plaza con el equipo curado y ganancias conservadas. PvP sigue amistoso con copia del equipo. Datos FR/LG y recursos Pokémon con procedencia registrada. Vista del mapa sin conexión: frontend/design/calle-vieja.html. No se ejecutaron pruebas funcionales en esta entrega.

## Carrera, vecinos, interiores y economía

Shift permite correr a 12 tiles/s con validación del servidor. Ocho vecinos de Jiménez recorren caminos compartidos y se detienen durante conversaciones. E a un tile interactúa con vecinos o puertas; E/Enter avanza el texto y Escape cierra. Hay 34 interiores compartidos: viviendas de Jiménez/Calle Vieja, tienda y centro médico; iglesia y escuela conservan sus exteriores.

Cuenta con ₡3.000 iniciales una sola vez y premios retroactivos de entrenadores ya vencidos. Cada victoria de entrenador paga una sola vez ₡100 × su nivel máximo. Compras y bolsa persisten en el backend. Poké Ball ₡200, Poción ₡300 (20 PS), Superpoción ₡700 (50 PS), Hiperpoción ₡1.200 (200 PS), Talue-go ₡500. Talue-go regresa a la plaza del último pueblo sin curar, fuera de combate; Jiménez es el único pueblo disponible.

Pociones para Pokémon conscientes desde la bolsa o durante PvE, ocupando el turno. Captura FR/LG en salvajes: consume bola, fallo permite acción del rival, éxito conserva PS/PP/estado y no da XP. Con seis Pokémon no se puede lanzar una bola: almacenamiento pendiente. Objetos deshabilitados en PvP amistoso.

Mensajes WebSocket nuevos: world.interact, dialog.close, shop.buy (itemId/quantity), bag.use (itemId/pokemonId); dialog.snapshot entrega conversación privada y world.snapshot posiciones públicas de NPC. battle.action admite kind=item e itemId/index. SQLite esquema 4 añade posiciones de NPC y conversaciones sin borrar cuentas ni progreso. Assets interiores originales del pack Ninja Adventure, con manifiesto y créditos.

Sintaxis e inspección visual de vistas estáticas revisadas; sin pruebas funcionales ni cuentas de prueba. Vistas de diseño locales: design/interiors.html y design/services-preview.html.

## Música, animaciones y layout

Jiménez → Pueblo Paleta; Calle Vieja (todos los tramos) → Ruta 1; centro médico → Centro Pokémon; casas/tienda → canción exterior. Al volver del resultado de batalla se recupera la canción de la zona actual. Fuentes y hashes MIDI/instrumentos en asset-library/pokemon-audio/sources.json; MP3 y manifiesto público conservan la autorización del prototipo y aviso de mezcla aproximada.

`battle.snapshot.presentation` y `battle.end.presentation` contienen secuencias de acciones ya resueltas con antes/después públicos de Pokémon activos, texto y audio. `src/battle-presentation.js` del frontend coordina ataques, cambios, impactos, PS, debilitamientos y captura; el homónimo backend genera los frames. No cambia plazos, resultados o persistencia del juego. Reconectar muestra estado actual; secuencias repetidas no reinician reproducción. Clic/Enter acelera la narración, historial plegado.

`src/map-effects.js` añade ondas, hojas y pasto con recursos originales de assets/img/effects y su manifest.json. Sin cambios de clima o reglas. Reduce movimiento siguiendo prefers-reduced-motion. Layout central de juego con controles abajo, izquierda conexión/latencia/perfil/dinero/online y derecha solo chat; conserva temas.

Revisión de sintaxis y vistas locales sin cuentas/progreso; sin pruebas funcionales. Recargar la web e iniciar sesión para recibir los nuevos módulos.
