import { TownUI } from './town-ui.js';
import { ProgressionUI } from './progression-ui.js';
import { BACKEND_URL } from "./config.js";
import { GameApi } from "./api.js";
import { RealtimeClient } from "./realtime.js";
import { GameView } from "./game.js";
import { TrainerUI } from './trainer-ui.js';
import { SocialUI } from './social-ui.js';
import { GameAudio } from './audio.js';
import { GameMenu } from './game-menu.js';
import { SiteView } from './site.js';

const ui = Object.fromEntries([
  "connection-status", "auth-form", "username", "password", "account-details",
  "player-name", "session-expiry", "progress-status", "account-message",
  "logout-button", "presence-status", "presence-count", "player-list", "reconnect-button",
  "latency-value", "network-label", "network-dot", "session-message",
].map((id) => [id, document.getElementById(id)]));

let api;
let session = null;
let busy = false;
let connection = "offline";
let canControl = true;
let expiryTimer;
let generation = 0;

function renderControls() {
  site.setBusy(busy);
  ui["auth-form"].hidden = Boolean(session);
  ui["account-details"].hidden = !session;
  for (const element of ui["auth-form"].elements) element.disabled = busy || !api?.configured;
  ui["logout-button"].disabled = busy;
  ui["reconnect-button"].hidden = !session || (connection !== "offline" && !(connection === "online" && !canControl));
  ui["reconnect-button"].disabled = busy;
  ui["auth-form"].setAttribute("aria-busy", String(busy));
}

function renderPresence(players) {
  social.presence(players);
  ui["player-list"].replaceChildren();
  ui["presence-count"].textContent = connection === "online"
    ? `${players.length} ${players.length === 1 ? "jugador conectado" : "jugadores conectados"}` : "";
  for (const player of players) {
    const item = document.createElement("li");
    if(player.id===session?.player.id)item.textContent=`${player.username} (tú)`;
    else {const button=document.createElement('button');button.className='player-link';button.textContent=player.username;button.addEventListener('click',()=>social.openPlayer(player));item.append(button);}
    ui["player-list"].append(item);
  }
}

function clearSession(message) {
  generation += 1;
  session = null;
  busy = false;
  connection = "offline";
  clearTimeout(expiryTimer);
  realtime.stop();
  trainer.clear();
  progression.clear();
  town.clear();
  menu.clear();
  social.clear();
  ui["player-name"].textContent = "";
  ui["session-expiry"].textContent = "";
  ui["progress-status"].textContent = "";
  ui["password"].value = "";
  ui["account-message"].textContent = message;
  ui["presence-status"].textContent = "Inicia sesión para conectarte.";
  ui["session-message"].textContent="";
  site.leave();
  site.openAccess();
  renderControls();
}

async function confirmSession(token) {
  if (session?.token !== token) return;
  try { await api.me(token); }
  catch (error) {
    if (session?.token === token && error.status === 401) clearSession("La sesión expiró o fue cerrada. Inicia sesión otra vez.");
  }
}

const realtime = new RealtimeClient(null, {
  onStatus(state, message) {
    connection = state;
    ui["network-label"].textContent=state==='online'?'En línea':state==='connecting'?'Conectando':'Desconectado';
    ui["network-dot"].dataset.state=state;
    social.setConnection(state==='online',canControl);
    progression.setConnection(state==='online',canControl);
    town.setConnection(state==='online',canControl);
    ui["presence-status"].textContent = message;
    if (state !== "online") renderPresence([]);
    renderControls();
  },
  onLatency(milliseconds){
    ui["latency-value"].textContent=milliseconds===null?'— ms':`${milliseconds} ms`;
    ui["latency-value"].setAttribute('aria-label',milliseconds===null?'Latencia sin medición':`Latencia: ${milliseconds} milisegundos de ida y vuelta`);
  },
  onPresence: renderPresence,
  onEvent:message=>{social.event(message);progression.event(message);town.event(message);audio.battleEvent(message,session?.player.id);},
  onUnauthorized: confirmSession,
  onWorld(message) {
    canControl = Boolean(message?.canControl);
    social.setConnection(connection==='online',canControl);
    progression.setConnection(connection==='online',canControl);
    town.setConnection(connection==='online',canControl);
    game.snapshot(message, session?.player.id);
    audio.setZone(message?game.zone:null);
    const player = message?.players.find((p) => p.id === session?.player.id);
    if (player) ui["progress-status"].textContent = "Progreso guardado mientras exploras.";
    renderControls();
  },
});

const game = new GameView(document.getElementById("game-canvas"), document.getElementById("game-status"), (dx, dy,running) => realtime.sendMove(dx, dy,running));
const pauses={trainer:false,social:false,menu:false,page:true};
const pause=(key,value)=>{pauses[key]=value;game.setPaused(Object.values(pauses).some(Boolean));};
const site=new SiteView({hasSession:()=>Boolean(session),onViewChange:playing=>pause('page',!playing)});
const audio=new GameAudio();
const menu=new GameMenu({audio,onPause:value=>pause('menu',value)});
const social=new SocialUI({send:body=>realtime.send(body),onPause:value=>pause('social',value),onReconnect:()=>ui['reconnect-button'].click(),onBattleSound:events=>audio.queue(events),onBattleQuiet:()=>audio.stopEffects()});
game.onPlayerSelected=player=>social.openPlayer(player);
game.onInteract=()=>realtime.send({type:"world.interact"});
document.getElementById('battle-dialog').addEventListener('close',()=>{if(session&&!social.battle)audio.resumeWorld();});
document.addEventListener('click',event=>{
  const button=event.target.closest?.('button');
  if(button&&!button.disabled&&(button.closest('dialog')||button.id==='game-menu-button'))audio.effect('menu');
});
const trainer = new TrainerUI({
  getApi:()=>api,
  onMenu:()=>audio.effect('menu'),
  onPause:paused=>pause('trainer',paused),
  onUnauthorized:confirmSession,
  onLogout:()=>ui['logout-button'].click(),
  onSkinChanged(profile,token) { if(session?.token===token){session.player=profile.player;social.setIdentity(profile.player);} },
  async onReady(profile,token) {
    if(session?.token!==token)return;
    session.player=profile.player;
    social.setIdentity(profile.player);
    menu.setProfile(profile);
    ui['progress-status'].textContent='Tu aventura se guarda automáticamente.';
    await realtime.connect(token,session.player.id);
  },
});

const town=new TownUI({send:body=>realtime.send(body),onPause:value=>pause('town',value)});
const progression=new ProgressionUI({send:body=>realtime.send(body),onPause:value=>pause('learning',value),onTeam:(team,message)=>{
 if(trainer.profile){trainer.profile.team=team;trainer.renderTeam(trainer.profile);menu.setProfile(trainer.profile);}
 if(message)social.notice(message);
}});

async function updateProfile(currentGeneration) {
  const token = session.token;
  try {
    const profile = await api.me(token);
    if (generation !== currentGeneration || session?.token !== token) return;
    session.player=profile.player;
    social.setIdentity(profile.player);
    menu.setProfile(profile);
    ui['progress-status'].textContent=profile.setup.complete
      ? 'Tu aventura se guarda automáticamente.'
      : 'Elige tu personaje y tu Pokémon inicial para entrar al mapa.';
    await trainer.setProfile(profile,token);
    return profile;
  } catch (error) {
    if (generation !== currentGeneration || session?.token !== token) return;
    if (error.status === 401) clearSession("La sesión ya no está activa. Inicia sesión otra vez.");
    else ui["progress-status"].textContent = "No se pudo cargar tu aventura. Usa Reconectar para volver a intentarlo.";
  }
}

ui["auth-form"].addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || session || !api?.configured) return;
  const mode = event.submitter?.value || "login";
  const username = ui["username"].value.normalize("NFC");
  const password = ui["password"].value;
  if (!/^[\p{L}\p{N}_]+$/u.test(username) || [...username].length < 3 || [...username].length > 24) {
    ui["account-message"].textContent = "El username debe tener 3–24 caracteres: letras, números o _.";
    return;
  }
  if ([...password].length < 12 || [...password].length > 128) {
    ui["account-message"].textContent = "La contraseña debe tener entre 12 y 128 caracteres.";
    return;
  }
  busy = true;
  ui["account-message"].textContent = mode === "register" ? "Creando cuenta…" : "Iniciando sesión…";
  renderControls();
  const currentGeneration = ++generation;
  try {
    const result = await api.authenticate(mode, username, password);
    if (generation !== currentGeneration) return;
    if (!result?.player?.id || typeof result.player.username !== "string"
      || !/^[A-Za-z0-9_-]{43}$/.test(result?.session?.token) || !Number.isFinite(result.session.expiresAt)) {
      throw new Error("No se pudo validar el acceso. Intenta iniciar sesión otra vez.");
    }
    session = { player: result.player, ...result.session };
    site.enter();
    ui["password"].value = "";
    ui["player-name"].textContent = session.player.username;
    ui["session-expiry"].textContent = `Sesión válida hasta ${new Date(session.expiresAt).toLocaleString("es-CR")}.`;
    ui["account-message"].textContent = mode === "register" ? "Cuenta creada." : "Sesión iniciada.";
    expiryTimer = setTimeout(() => clearSession("La sesión expiró. Inicia sesión otra vez."), Math.max(0, session.expiresAt - Date.now()));
    const token = session.token;
    const profile=await updateProfile(currentGeneration);
    if (profile?.setup.complete && session?.token === token && generation === currentGeneration) await realtime.connect(token, session.player.id);
  } catch (error) {
    if (generation === currentGeneration) ui["account-message"].textContent = error.message;
  } finally {
    if (generation === currentGeneration) {
      busy = false;
      ui["password"].value = "";
      renderControls();
    }
  }
});

ui["logout-button"].addEventListener("click", async () => {
  if (busy || !session) return;
  busy = true;
  renderControls();
  const token = session.token;
  ui["session-message"].textContent = "Cerrando sesión…";
  try {
    await api.logout(token);
    if (session?.token === token) clearSession("Sesión cerrada.");
  } catch (error) {
    if (session?.token !== token) return;
    if (error.status === 401) clearSession("La sesión ya estaba cerrada o había expirado.");
    else ui["session-message"].textContent = `${error.message} No se pudo confirmar el cierre; vuelve a intentarlo.`;
  } finally {
    busy = false;
    renderControls();
  }
});

ui["reconnect-button"].addEventListener("click", async () => {
  if (busy || !session || (connection !== "offline" && !(connection === "online" && !canControl))) return;
  const currentGeneration = generation;
  const token = session.token;
  busy = true;
  renderControls();
  const profile=await updateProfile(currentGeneration);
  if (profile?.setup.complete && session?.token === token && generation === currentGeneration) await realtime.connect(token, session.player.id);
  if (generation === currentGeneration) {
    busy = false;
    renderControls();
  }
});

async function start() {
  audio.load();
  try {
    api = new GameApi(BACKEND_URL);
    realtime.api = api;
    renderControls();
    if (!api.configured) {
      ui["connection-status"].textContent = "El acceso al juego no está disponible en este momento.";
      return;
    }
    const result = await api.ready();
    ui["connection-status"].textContent = result.status === "ready"
      ? "Tiquicia está lista para tu aventura."
      : "El acceso al juego todavía no está disponible.";
  } catch (error) {
    ui["connection-status"].textContent = error.message;
    renderControls();
  }
}

// Account tokens remain in memory; only optional audio preferences use browser storage.
window.addEventListener("pagehide", () => realtime.stop());
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    connection = "offline";
    ui["presence-status"].textContent = "La conexión quedó cerrada. Puedes reconectar.";
    renderControls();
  }
});
start();
