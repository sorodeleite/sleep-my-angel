(function () {
  'use strict';

  function tokenNovo() {
    try {
      const bytes = new Uint8Array(32);
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
      }
      let binario = '';
      for (const byte of bytes) binario += String.fromCharCode(byte);
      return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    } catch (error) {
      return `aparelho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function lerTokenDoAparelho() {
    try {
      let token = localStorage.getItem('pooftie_device_token') || '';
      if (!token) {
        token = tokenNovo();
        localStorage.setItem('pooftie_device_token', token);
      }
      return token;
    } catch (error) {
      return tokenNovo();
    }
  }

  const BASE_PRIMARIA = String(window.POFTIE_API_BASE || '').replace(/\/+$/, '');
  const BASE_RESERVA = String(window.POFTIE_API_FALLBACK || '').replace(/\/+$/, '');

  const CONFIG = {
    baseUrl: BASE_PRIMARIA,
    fallbackUrl: BASE_RESERVA,
    activeBaseUrl: BASE_PRIMARIA,
    baseChecked: false,
    user: 'default',
    alias: localStorage.getItem('pooftie_username') || '',
    deviceToken: lerTokenDoAparelho(),
    key: localStorage.getItem('pooftie_api_key') || '',
    online: null,
    version: null
  };

  const listeners = new Set();

  function emit(event, detail) {
    for (const listener of listeners) {
      try {
        listener(event, detail);
      } catch (error) {
        console.warn('[crechezinha-api] listener falhou:', error);
      }
    }
  }

  function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setUser(name) {
    const slug = String(name || 'default')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    CONFIG.user = slug.length >= 2 ? slug : 'default';
    const alias = String(name || '').trim().slice(0, 32);
    if (alias) CONFIG.alias = alias;
    return CONFIG.user;
  }

  function setAlias(name) {
    const alias = String(name || '').trim().slice(0, 32);
    CONFIG.alias = alias || CONFIG.alias;
    return CONFIG.alias;
  }

  function setKey(key) {
    CONFIG.key = String(key || '').trim();
    if (CONFIG.key) localStorage.setItem('pooftie_api_key', CONFIG.key);
    else localStorage.removeItem('pooftie_api_key');
  }

  function headers(extra) {
    return {
      'x-pooftie-user': CONFIG.user,
      ...(CONFIG.deviceToken ? { authorization: `Bearer ${CONFIG.deviceToken}` } : {}),
      ...(CONFIG.key ? { 'x-pooftie-key': CONFIG.key } : {}),
      ...(extra || {})
    };
  }

  function url(path, query, base = CONFIG.activeBaseUrl) {
    const raiz = String(base ?? '').replace(/\/+$/, '');
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== '') search.append(name, value);
    }
    const qs = search.toString();
    return `${raiz}${path}${qs ? `?${qs}` : ''}`;
  }

  async function testarBase(base, timeout = 4000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const resposta = await fetch(url('/api/health', null, base), {
        method: 'GET',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      if (!resposta.ok) return false;
      const texto = await resposta.text();
      const dado = texto ? JSON.parse(texto) : null;
      return Boolean(dado && dado.ok !== false);
    } catch (error) {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function escolherBase({ forcar = false, pular = null } = {}) {
    const candidatos = [...new Set([CONFIG.baseUrl, CONFIG.fallbackUrl]
      .filter((base) => typeof base === 'string'))];
    if (candidatos.length <= 1) {
      CONFIG.activeBaseUrl = candidatos[0] ?? '';
      CONFIG.baseChecked = true;
      return CONFIG.activeBaseUrl;
    }
    if (!forcar && CONFIG.baseChecked) return CONFIG.activeBaseUrl;

    const ordem = [
      ...candidatos.filter((base) => base !== pular),
      ...candidatos.filter((base) => base === pular)
    ];
    for (const base of ordem) {
      if (await testarBase(base)) {
        CONFIG.activeBaseUrl = base;
        CONFIG.baseChecked = true;
        return base;
      }
    }
    CONFIG.activeBaseUrl = CONFIG.baseUrl;
    CONFIG.baseChecked = false;
    return CONFIG.activeBaseUrl;
  }

  function recadoDoErro(response, payload) {
    const daApi = payload?.error?.message;
    if (daApi) return daApi;
    const daPlataforma = response.headers?.get?.('x-vercel-error');
    if (daPlataforma) {
      return 'a nuvem está fora do ar agora (o site publicado precisa ser atualizado no Vercel)';
    }
    return `API respondeu ${response.status}`;
  }

  async function requestNaBase(method, path, { body, query, timeout = 8000 } = {}, base) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const response = await fetch(url(path, query, base), {
        method,
        headers: headers(body ? { 'content-type': 'application/json' } : undefined),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller ? controller.signal : undefined
      });

      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const error = new Error(recadoDoErro(response, payload));
        error.status = response.status;
        error.code = payload?.error?.code || 'http_error';
        error.details = payload?.error?.details;
        CONFIG.online = response.status < 500;
        emit('error', error);
        throw error;
      }

      CONFIG.online = true;
      CONFIG.activeBaseUrl = base;
      emit('online', { user: CONFIG.user });
      return payload?.data ?? payload;
    } catch (error) {
      if (error.status === undefined) {
        CONFIG.online = false;
        emit('offline', error);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function request(method, path, options = {}) {
    const base = await escolherBase();
    try {
      return await requestNaBase(method, path, options, base);
    } catch (error) {
      const status = Number(error && error.status);
      const podeTrocar = [502, 503, 504].includes(status)
        || (error.status === undefined && method === 'GET');
      if (!podeTrocar) throw error;
      CONFIG.baseChecked = false;
      const outra = await escolherBase({ forcar: true, pular: base });
      if (!outra || outra === base) throw error;
      return requestNaBase(method, path, options, outra);
    }
  }

  const PATHS = {
    health: '/api/health',
    entries: (user) => `/api/entries/${user}`,
    entry: (user, date) => `/api/entries/${user}/${date}`,
    todos: (user) => `/api/todos/${user}`,
    calendar: (user) => `/api/calendar/${user}`,
    settings: (user) => `/api/settings/${user}`,
    stats: (user) => `/api/stats/${user}`,
    snapshot: (user) => `/api/snapshot/${user}`,
    export: (user) => `/api/export/${user}`,
    letters: '/api/letters',
    lettersInbox: '/api/letters/inbox',
    lettersSent: '/api/letters/sent',
    lettersPeek: '/api/letters/peek',
    lettersOpen: '/api/letters/open',
    lettersRegister: '/api/letters/register',
    lettersMe: '/api/letters/me',
    lettersFriends: '/api/letters/friends',
    lettersFromLetter: '/api/letters/from-letter',
    letter: (id) => `/api/letters/${encodeURIComponent(id)}`,
    letterFriend: (id) => `/api/letters/friends/${encodeURIComponent(id)}`
  };

  const api = {
    config: CONFIG,
    onChange,
    setUser,
    setKey,
    get user() {
      return CONFIG.user;
    },
    get online() {
      return CONFIG.online;
    },
    get activeBaseUrl() {
      return CONFIG.activeBaseUrl;
    },
    ensureBase: escolherBase,

    async health() {
      const data = await request('GET', PATHS.health, { timeout: 5000 });
      CONFIG.version = data?.version ?? null;
      CONFIG.online = true;
      return data;
    },

    listEntries(options = {}) {
      return request('GET', PATHS.entries(CONFIG.user), { query: options });
    },

    getEntry(date) {
      return request('GET', PATHS.entry(CONFIG.user, date));
    },

    saveEntry(entry) {
      return request('PUT', PATHS.entry(CONFIG.user, entry.date), { body: entry });
    },

    patchEntry(date, patch) {
      return request('PATCH', PATHS.entry(CONFIG.user, date), { body: patch });
    },

    deleteEntry(date) {
      return request('DELETE', PATHS.entry(CONFIG.user, date));
    },

    listTodos(options = {}) {
      return request('GET', PATHS.todos(CONFIG.user), { query: options });
    },

    saveTodos(items) {
      return request('PUT', PATHS.todos(CONFIG.user), { body: { items } });
    },

    listCalendar(options = {}) {
      return request('GET', PATHS.calendar(CONFIG.user), { query: options });
    },

    saveCalendar(days) {
      return request('PUT', PATHS.calendar(CONFIG.user), { body: { days } });
    },

    getSettings() {
      return request('GET', PATHS.settings(CONFIG.user));
    },

    saveSettings(settings) {
      return request('PUT', PATHS.settings(CONFIG.user), { body: settings });
    },

    stats() {
      return request('GET', PATHS.stats(CONFIG.user));
    },

    snapshot(options = {}) {
      const query = {};
      if (options.limit) query.limit = options.limit;
      if (options.offset) query.offset = options.offset;
      return request('GET', PATHS.snapshot(CONFIG.user), { query });
    },

    pushSnapshot(payload) {
      return request('PUT', PATHS.snapshot(CONFIG.user), { body: payload, timeout: 15000 });
    },

    exportUrl(download) {
      return url(PATHS.export(CONFIG.user), download ? { download: 1 } : undefined);
    },


    setAlias,

    get deviceToken() {
      return CONFIG.deviceToken;
    },

    letters() {
      return request('GET', PATHS.letters, { timeout: 10000 });
    },

    lettersInbox() {
      return request('GET', PATHS.lettersInbox, { timeout: 10000 });
    },

    lettersSent() {
      return request('GET', PATHS.lettersSent, { timeout: 10000 });
    },

    lettersPeek(code) {
      return request('POST', PATHS.lettersPeek, { body: { code }, timeout: 10000 });
    },

    lettersOpen({ code, id } = {}) {
      return request('POST', PATHS.lettersOpen, {
        body: id ? { id } : { code },
        timeout: 15000
      });
    },

    lettersSend({ art, alias, friendId, senderIcon, payload } = {}) {
      return request('POST', PATHS.letters, {
        body: {
          art,
          alias: alias || CONFIG.alias,
          ...(friendId ? { friendId } : {}),
          ...(senderIcon ? { senderIcon } : {}),
          payload
        },
        timeout: 20000
      });
    },

    lettersCancel(id) {
      return request('DELETE', PATHS.letter(id), { timeout: 10000 });
    },

    lettersRegister(alias) {
      return request('POST', PATHS.lettersRegister, {
        body: { alias: alias || CONFIG.alias },
        timeout: 10000
      });
    },

    lettersMe(alias) {
      return request('GET', PATHS.lettersMe, {
        query: alias ? { alias } : undefined,
        timeout: 10000
      });
    },

    lettersFriends() {
      return request('GET', PATHS.lettersFriends, { timeout: 10000 });
    },

    lettersInvite(alias) {
      return request('POST', PATHS.lettersFriends, {
        body: { action: 'invite', alias: alias || CONFIG.alias },
        timeout: 10000
      });
    },

    lettersAcceptInvite(code, alias) {
      return request('POST', PATHS.lettersFriends, {
        body: { action: 'accept', code, alias: alias || CONFIG.alias },
        timeout: 10000
      });
    },

    lettersRemoveFriend(id) {
      return request('DELETE', PATHS.letterFriend(id), { timeout: 10000 });
    },

    lettersBefriend(letterId, alias) {
      return request('POST', PATHS.lettersFromLetter, {
        body: { letterId, alias: alias || CONFIG.alias },
        timeout: 10000
      });
    }
  };

  window.PooftieAPI = api;
  emit('ready', api);
})();
