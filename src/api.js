export class ApiError extends Error {
  constructor(message, status = 0, code = "network_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class GameApi {
  constructor(origin) {
    this.origin = null;
    if (!origin) return;
    const url = new URL(origin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
      || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) {
      throw new ApiError("Configura un origen HTTPS del backend, sin ruta ni credenciales.", 0, "configuration_error");
    }
    this.origin = url.origin;
  }

  get configured() { return this.origin !== null; }

  async request(path, { method = "GET", token, body } = {}) {
    if (!this.configured) throw new ApiError("El backend todavía no está configurado.", 0, "configuration_error");
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.origin}${path}`, {
        method, headers, signal: controller.signal, credentials: "omit",
        cache: "no-store", redirect: "error",
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      let result;
      try { result = await response.json(); }
      catch { throw new ApiError("El backend devolvió una respuesta no válida.", response.status, "invalid_response"); }
      if (!response.ok) {
        throw new ApiError(result?.error?.message || "No se pudo completar la petición.", response.status, result?.error?.code || "request_failed");
      }
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(controller.signal.aborted
        ? "El backend tardó demasiado en responder."
        : "No se pudo conectar con el backend. Comprueba la conexión y su configuración.");
    } finally { clearTimeout(timeout); }
  }

  ready() { return this.request("/ready"); }
  world() { return this.request("/api/world"); }
  authenticate(mode, username, password) {
    if (!["login", "register"].includes(mode)) throw new TypeError("Invalid authentication mode.");
    return this.request(`/api/auth/${mode}`, { method: "POST", body: { username, password } });
  }
  me(token) { return this.request("/api/me", { token }); }
  setupCatalog(token) { return this.request('/api/player/setup', {token}); }
  completeSetup(token, skinId, speciesId) { return this.request('/api/player/setup', {method:'POST', token, body:{skinId,speciesId}}); }
  changeSkin(token,skinId) { return this.request('/api/player/skin',{method:'POST',token,body:{skinId}}); }
  logout(token) { return this.request("/api/auth/logout", { method: "POST", token }); }
  ticket(token) { return this.request("/api/realtime/ticket", { method: "POST", token }); }

  socketUrl(ticket) {
    if (!this.configured) throw new ApiError("El backend todavía no está configurado.");
    if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw new ApiError("El ticket de conexión no es válido.");
    const url = new URL("/api/realtime", this.origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("ticket", ticket);
    return url.href;
  }
}
