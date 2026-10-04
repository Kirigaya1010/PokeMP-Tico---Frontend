function isPlayer(value) {
  return value && typeof value.id === "string" && typeof value.username === "string";
}

/** Presence and approved exploration. Server-authoritative social and combat messages. */
export class RealtimeClient {
  constructor(api, { onStatus, onPresence, onUnauthorized, onWorld, onEvent, onLatency }) {
    Object.assign(this, { api, onStatus, onPresence, onUnauthorized, onWorld, onEvent, onLatency });
    this.generation = 0;
    this.socket = null;
  }

  stop() {
    this.generation += 1;
    clearInterval(this.heartbeat);
    this.onLatency?.(null);
    clearTimeout(this.connectTimeout);
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "Conexión cerrada.");
    this.onPresence([]);
    this.onWorld?.(null);
  }

  sendMove(dx, dy,running=false) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    try { this.socket.send(JSON.stringify({ type: "move", dx, dy,running, sequence: this.sequence++ })); }
    catch { this.stop(); this.onStatus("offline", "Se perdió la conexión. Puedes reconectar."); }
  }

  send(body) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    try { this.socket.send(JSON.stringify(body)); return true; }
    catch { this.stop(); this.onStatus('offline', 'Se perdió la conexión. Puedes reconectar.'); return false; }
  }

  async connect(token, playerId) {
    this.stop();
    const generation = this.generation;
    this.sequence = 0;
    this.onStatus("connecting", "Conectando con los jugadores…");
    try {
      const result = await this.api.ticket(token);
      if (generation !== this.generation) return;
      const socket = new WebSocket(this.api.socketUrl(result.ticket));
      this.socket = socket;
      let connected = false;
      let lastPong = Date.now();
      let pendingPing = null;
      const ping = () => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const id = crypto.randomUUID();
        pendingPing = { id, sentAt: performance.now() };
        socket.send(JSON.stringify({ type: "ping", id }));
      };
      const disconnect = (message) => {
        if (generation !== this.generation) return;
        this.stop();
        this.onStatus("offline", message);
      };
      this.connectTimeout = setTimeout(() => disconnect("La conexión tardó demasiado. Puedes reconectar."), 15_000);
      socket.addEventListener("message", (event) => {
        if (generation !== this.generation) return;
        let message;
        try { message = JSON.parse(event.data); }
        catch { disconnect("El servidor envió un mensaje no válido."); return; }
        if (!message || typeof message !== "object") {
          disconnect("El servidor envió un mensaje no válido.");
          return;
        }
        if (message.type === "connected") {
          if (connected || !isPlayer(message.player) || message.player.id !== playerId) {
            disconnect("No se pudo confirmar la identidad de la conexión.");
            return;
          }
          connected = true;
          clearTimeout(this.connectTimeout);
          lastPong = Date.now();
          this.onStatus("online", "Conectado al mundo compartido.");
          try { ping(); } catch { disconnect("Se perdió la conexión. Puedes reconectar."); return; }
          this.heartbeat = setInterval(() => {
            if (Date.now() - lastPong > 60_000) {
              disconnect("Se perdió la conexión. Puedes reconectar.");
              return;
            }
            try {
              ping();
            } catch { disconnect("Se perdió la conexión. Puedes reconectar."); }
          }, 25_000);
        } else if (message.type === "presence.snapshot") {
          if (!connected || !Array.isArray(message.players) || !message.players.every(isPlayer)) {
            disconnect("La lista de jugadores recibida no es válida.");
            return;
          }
          this.onPresence(message.players);
        } else if (message.type === "world.snapshot") {
          if (!connected || typeof message.canControl !== "boolean" || !Array.isArray(message.players)
            || !message.players.every((p) => isPlayer(p) && typeof p.position?.zoneId === "string" && p.position.zoneId===message.zoneId
              && Number.isFinite(p.position.x) && Number.isFinite(p.position.y))) {
            disconnect("El estado del mundo recibido no es válido.");
            return;
          }
          this.onWorld?.(message);
        } else if (message.type === "pong") {
          lastPong = Date.now();
          if (pendingPing && message.id === pendingPing.id) {
            const milliseconds = performance.now() - pendingPing.sentAt;
            pendingPing = null;
            this.onLatency?.(Math.round(milliseconds));
          }
        } else if (connected && ['chat.message','challenge.snapshot','battle.snapshot','battle.end','player.progress','dialog.snapshot','error'].includes(message.type)) {
          this.onEvent?.(message);
        } else {
          disconnect("El servidor rechazó o envió un mensaje desconocido. Puedes reconectar.");
        }
      });
      socket.addEventListener("error", () => disconnect("No se pudo abrir la conexión online. Puedes reconectar."));
      socket.addEventListener("close", (event) => {
        if (generation !== this.generation) return;
        const detail = event.reason ? ` ${event.reason}` : "";
        disconnect(`Conexión cerrada (código ${event.code}).${detail} Puedes reconectar si tu sesión sigue activa.`);
        // 1008 can also indicate a protocol limit: confirm the session over HTTP.
        if (event.code === 1008) this.onUnauthorized(token);
      });
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      this.onStatus("offline", error.message);
      if (error.status === 401) this.onUnauthorized(token);
    }
  }
}
