import { WorldRenderer } from "./world-renderer.js";

const KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright","shift"]);

export class GameView {
  constructor(canvas, status, sendMove) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.status = status;
    this.sendMove = sendMove;
    this.keys = new Set();
    this.players = new Map();
    this.npcs = new Map();
    this.zone = null;
    this.active = false;
    this.ready = false;
    this.renderer = new WorldRenderer();
    this.renderer.loaded.then(() => { this.ready = true; this.updateStatus(); }).catch(() => {
      this.status.textContent = "No se pudieron cargar los gráficos. Recarga la página.";
    });
    canvas.addEventListener('click', event => {
      if (!this.active || this.paused || !this.camera) return;
      const rect=canvas.getBoundingClientRect();
      const x=(event.clientX-rect.left)*canvas.width/rect.width/3+Math.round(this.camera.x);
      const y=(event.clientY-rect.top)*canvas.height/rect.height/3+Math.round(this.camera.y);
      const others=[...this.players.values()].filter(p=>p.id!==this.playerId);
      const player=others.find(p=>Math.abs(p.position.x-x)<12&&Math.abs(p.position.y-y)<18);
      if(player)this.onPlayerSelected?.(player);
      else canvas.focus();
    });
    canvas.addEventListener("keydown", (event) => {
      if (typeof event.key !== "string" || event.isComposing) return;
      const key = event.key.toLowerCase();
      if(key==='e'&&!event.repeat&&this.active&&this.canControl&&this.ready&&!this.paused){event.preventDefault();this.onInteract?.();return;}
      if (!KEYS.has(key)) return;
      event.preventDefault();
      if (this.active && this.canControl && this.ready && !this.paused) this.keys.add(key);
    });
    canvas.addEventListener("keyup", (event) => {
      if (typeof event.key !== "string") return;
      const key = event.key.toLowerCase();
      if (KEYS.has(key)) { event.preventDefault(); this.keys.delete(key); }
    });
    canvas.addEventListener("blur", () => this.keys.clear());
    window.addEventListener("blur", () => this.keys.clear());
    document.addEventListener("visibilitychange", () => this.keys.clear());
    setInterval(() => {
      if (!this.active || !this.canControl || !this.ready || this.paused || document.activeElement !== canvas || document.hidden) return;
      const has = (a, b) => this.keys.has(a) || this.keys.has(b);
      const dx = Number(has("d", "arrowright")) - Number(has("a", "arrowleft"));
      const dy = Number(has("s", "arrowdown")) - Number(has("w", "arrowup"));
      if (dx || dy) this.sendMove(dx, dy,this.keys.has("shift"));
    }, 100);
    const frame = () => { this.draw(); requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }

  updateStatus() {
    const text = !this.active ? "Inicia sesión y conecta para entrar al mapa."
      : !this.ready ? "Cargando gráficos…"
      : this.canControl ? `${this.zone?.name||"Mundo"} · Haz clic en el mapa y camina con WASD o flechas.`
      : "Modo observador: otra pestaña de tu cuenta controla el personaje. Reconecta para tomar el control.";
    if (this.status.textContent !== text) this.status.textContent = text;
  }

  setPaused(paused) { this.paused = paused; this.keys.clear(); }

  snapshot(message, playerId) {
    if (!message) {
      this.active = false;
      this.players.clear();this.npcs.clear();
      this.keys.clear();
      this.updateStatus();
      return;
    }
    const zoneChanged=message.zone&&message.zone.id!==this.zone?.id;
    this.zone = message.zone || this.zone;
    if(zoneChanged){this.players.clear();this.npcs.clear();this.keys.clear();}
    if(this.zone){document.querySelector(".world-heading h1").textContent=this.zone.name;document.querySelector(".world-heading .eyebrow").textContent=this.zone.subtitle||"POCOCÍ, LIMÓN";document.title=`${this.zone.name} · PokéMMO Tiquicia Edition`;}
    this.active = true;
    this.canControl = message.canControl;
    this.playerId = playerId;
    if (!this.canControl) this.keys.clear();
    const now = performance.now();
    const players = new Map();
    for (const player of message.players) {
      const previous = this.players.get(player.id);
      const visual = previous ? this.visualPosition(previous, now) : player.position;
      const moved = previous && (previous.position.x !== player.position.x || previous.position.y !== player.position.y);
      players.set(player.id, { ...player, from: visual, receivedAt: now, movedAt: moved ? now : previous?.movedAt || 0 });
    }
    this.players = players;
    const npcs=new Map();
    for(const npc of message.npcs||[]){const previous=this.npcs.get(npc.id),position={x:npc.x,y:npc.y,facing:npc.facing};const visual=previous?this.visualPosition(previous,now):position;
      npcs.set(npc.id,{...npc,position,from:visual,receivedAt:now,interpolateMs:250,movedAt:npc.moving?now:0});}
    this.npcs=npcs;
    this.updateStatus();
    const own=this.players.get(playerId);
    if(this.canControl&&own){const npc=[...this.npcs.values()].find(n=>n.role&&Math.hypot(n.x-own.position.x,n.y-own.position.y)<=16),door=(this.zone.doors||[]).find(d=>Math.hypot(d.x-own.position.x,d.y-own.position.y)<=16);
      if(npc)this.status.textContent=`${npc.name} · Pulsa E para hablar.`;else if(door)this.status.textContent='Pulsa E para entrar o salir.';}

  }

  visualPosition(player, now) {
    const alpha = Math.min(1, (now - player.receivedAt) / (player.interpolateMs||100));
    return { x: player.from.x + (player.position.x - player.from.x) * alpha,
      y: player.from.y + (player.position.y - player.from.y) * alpha };
  }

  draw() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#10261e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!this.active || !this.ready || !this.zone) return;
    const zone = this.zone;
    this.renderer.setZone(zone);
    const now = performance.now();
    const own = this.players.get(this.playerId);
    const center = own ? this.visualPosition(own, now) : zone.spawn;
    const scale = 3;
    const width = canvas.width / scale;
    const height = canvas.height / scale;
    const camera = { x: Math.max(0, Math.min(zone.width * zone.tileSize - width, center.x - width / 2)),
      y: Math.max(0, Math.min(zone.height * zone.tileSize - height, center.y - height / 2)), w: width, h: height };
    this.camera = camera;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(scale, 0, 0, scale, -Math.round(camera.x) * scale, -Math.round(camera.y) * scale);
    this.renderer.draw(ctx, camera, [...this.players.values()].map(p => ({ ...p, visual: this.visualPosition(p, now) })), now, this.playerId,true,[...this.npcs.values()].map(n=>({...n,x:this.visualPosition(n,now).x,y:this.visualPosition(n,now).y})));
  }
}
