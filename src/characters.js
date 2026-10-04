let catalogPromise;
export function loadCharacters() {
  return catalogPromise ??= fetch(new URL('./characters.json', import.meta.url), {cache:'no-store'})
    .then(response => { if (!response.ok) throw new Error('No se pudo cargar el catálogo de personajes.'); return response.json(); })
    .catch(error => { catalogPromise = null; throw error; });
}
export function characterFrame(character, moving, now, facing = 'down') {
  const frame = character.frames[moving ? 'walk' : 'idle'];
  const col = {down:0,up:1,left:2,right:3}[facing] ?? 0;
  const rows = frame.height / 16;
  const row = !moving ? 0 : frame.layout === 'walk' ? Math.floor(now / 140) % rows
    : rows === 2 ? Math.floor(now / 140) % 2 : 0;
  return { ...frame, sx:col*16, sy:row*16, sw:16, sh:16 };
}
export function characterUrl(file) {
  return new URL(`../assets/img/characters/${file}`, import.meta.url).href;
}
