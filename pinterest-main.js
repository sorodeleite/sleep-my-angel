const { BrowserWindow, shell } = require('electron');

const PINTEREST_HOST = /(^|\.)(pinterest\.com|pin\.it)$/i;
const PINIMG_HOST = /(^|\.)pinimg\.com$/i;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PARTITION = 'persist:pinterest';
const RESOURCE_URL = /^https:\/\/www\.pinterest\.com\/resource\/(BoardFeedResource|BoardSectionPinsResource|BoardSectionsResource|BoardsFeedResource|UserBoardsResource|UserResource|BoardResource)\/get\//i;
const MAX_HTML = 12 * 1024 * 1024;

let loginWindow = null;
let loginPromise = null;
let identityCache = null;
let cookieJar = new Map();

function allowedRemote(url, pattern) {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) && pattern.test(parsed.hostname);
  } catch (error) {
    return false;
  }
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function extractScriptJson(html, id) {
  const pattern = new RegExp('<script[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/script>', 'i');
  const match = String(html || '').match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[1].replace(/^\uFEFF/, ''));
  } catch (error) {
    return null;
  }
}

function appVersionFromHtml(html) {
  const data = extractScriptJson(html, '__PWS_DATA__');
  if (data && data.appVersion) return String(data.appVersion);
  const match = String(html || '').match(/"appVersion"\s*:\s*"([^"]+)"/);
  return match ? match[1] : '';
}

function initialProps(html) {
  return extractScriptJson(html, '__PWS_INITIAL_PROPS__');
}

function identityFromHtml(html) {
  const props = initialProps(html);
  const state = props && props.initialReduxState ? props.initialReduxState : null;
  if (!state) return null;
  const session = state.session || {};
  const users = state.users || {};
  let id = String(session.userId || '');
  let user = id && users[id] ? users[id] : null;
  if (!user) {
    user = Object.keys(users).map(function (key) {
      return users[key];
    }).find(function (item) {
      return item && (item.is_me || item.is_me === true) && item.username;
    }) || null;
  }
  if (!user || !user.username) return null;
  if (!session.isAuthenticated && !session.userId) return null;
  return {
    id: String(user.id || id || ''),
    username: String(user.username),
    name: String(user.full_name || user.first_name || user.username)
  };
}

function setupPinterest({ ipcMain, session }) {
  const pinterestSession = session.fromPartition(PARTITION);
  pinterestSession.setUserAgent(BROWSER_UA);

  async function loadSessionCookies() {
    const urls = ['https://www.pinterest.com/', 'https://www.pinterest.com', 'https://pin.it/'];
    for (const url of urls) {
      try {
        const list = await pinterestSession.cookies.get({ url: url });
        (list || []).forEach(function (cookie) {
          if (cookie && cookie.name) cookieJar.set(cookie.name, String(cookie.value || ''));
        });
      } catch (error) {
        void error;
      }
    }
  }

  function cookieHeader() {
    return Array.from(cookieJar.entries()).map(function (entry) {
      return entry[0] + '=' + entry[1];
    }).join('; ');
  }

  async function rememberCookies(response) {
    let list = [];
    try {
      list = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
    } catch (error) {
      list = [];
    }
    list.forEach(function (raw) {
      const pair = String(raw || '').split(';')[0];
      const index = pair.indexOf('=');
      if (index <= 0) return;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (name) cookieJar.set(name, value);
    });
  }

  async function pinterestFetch(target, options, timeout) {
    await loadSessionCookies();
    const headers = Object.assign({}, options && options.headers);
    const cookie = cookieHeader();
    if (cookie) headers.cookie = cookie;
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeout || 30000);
    try {
      const response = await fetch(target, Object.assign({}, options, {
        headers: headers,
        redirect: 'follow',
        signal: controller.signal
      }));
      await rememberCookies(response);
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function cookieValue(name) {
    await loadSessionCookies();
    if (cookieJar.has(name)) return String(cookieJar.get(name) || '');
    return '';
  }

  async function csrfToken() {
    return cookieValue('csrftoken');
  }

  async function detectIdentity(force) {
    if (!force && identityCache && Date.now() - identityCache.time < 60000) {
      return identityCache.identity;
    }
    let identity = null;
    try {
      const response = await Promise.race([
        pinterestFetch('https://www.pinterest.com/', {
          headers: {
            'user-agent': BROWSER_UA,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language': 'pt-BR,pt;q=0.9,en;q=0.7'
          }
        }, 12000),
        sleep(12500).then(function () { return null; })
      ]);
      if (response && response.ok) {
        const html = await response.text();
        identity = identityFromHtml(html);
      }
    } catch (error) {
      identity = null;
    }
    identityCache = { identity: identity, time: Date.now() };
    return identity;
  }

  function resourceHeaders(sourcePath, handler, appVersion) {
    const headers = {
      'user-agent': BROWSER_UA,
      accept: 'application/json, text/javascript, */*, q=0.01',
      'accept-language': 'en-US,en;q=0.9',
      'x-requested-with': 'XMLHttpRequest',
      'x-pinterest-appstate': 'active',
      'x-pinterest-pws-handler': handler,
      'x-pinterest-source-url': sourcePath,
      referer: 'https://www.pinterest.com' + sourcePath,
      origin: 'https://www.pinterest.com'
    };
    return headers;
  }

  async function requestResource(target, sourcePath, handler, appVersion) {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const headers = resourceHeaders(sourcePath, handler, appVersion);
        const csrf = await csrfToken();
        headers['x-csrftoken'] = csrf || 'undefined';
        const response = await pinterestFetch(target, { headers: headers }, 30000);
        lastStatus = response.status;
        if (response.ok) {
          const text = await response.text();
          if (!text || text.length > MAX_HTML) {
            return { ok: false, error: 'a lista de pins do pinterest veio vazia ou grande demais.' };
          }
          return { ok: true, text: text };
        }
        if (response.status === 429 || response.status === 403 || response.status >= 500) {
          await sleep(700 * (attempt + 1));
          continue;
        }
        return { ok: false, error: 'o pinterest respondeu ' + response.status + ' ao pedir os pins.' };
      } catch (error) {
        await sleep(500 * (attempt + 1));
      }
    }
    return { ok: false, error: 'o pinterest respondeu ' + lastStatus + ' ao pedir os pins.' };
  }

  function finishLogin(result) {
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.close();
    }
    loginWindow = null;
    const resolve = loginPromise;
    loginPromise = null;
    if (resolve) resolve(result);
  }

  function openLoginWindow() {
    if (loginPromise) {
      if (loginWindow && !loginWindow.isDestroyed()) loginWindow.focus();
      return loginPromise;
    }
    loginPromise = new Promise(function (resolve) {
      const parent = BrowserWindow.getAllWindows().find(function (win) {
        return win !== loginWindow && !win.isDestroyed();
      }) || null;
      const win = new BrowserWindow({
        width: 520,
        height: 760,
        show: false,
        parent: parent,
        modal: false,
        autoHideMenuBar: true,
        title: 'pinterest',
        backgroundColor: '#ffffff',
        webPreferences: {
          partition: PARTITION,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          spellcheck: false
        }
      });
      loginWindow = win;
      win.webContents.setUserAgent(BROWSER_UA);
      win.once('ready-to-show', function () {
        win.show();
      });
      win.webContents.setWindowOpenHandler(function (details) {
        if (allowedRemote(details.url, PINTEREST_HOST)) return { action: 'allow' };
        if (/^https?:/i.test(details.url)) shell.openExternal(details.url);
        return { action: 'deny' };
      });
      let checking = false;
      let settled = false;
      let poll = null;
      let timeout = null;

      const settle = function (result) {
        if (settled) return;
        settled = true;
        if (poll) clearInterval(poll);
        if (timeout) clearTimeout(timeout);
        finishLogin(result);
        resolve(result);
      };

      const verify = async function () {
        if (checking || settled) return;
        checking = true;
        try {
          const identity = await detectIdentity(true);
          if (identity && identity.username) {
            settle({ ok: true, connected: true, username: identity.username, name: identity.name });
          }
        } catch (error) {
          void error;
        } finally {
          checking = false;
        }
      };

      win.webContents.on('did-navigate', function () {
        setTimeout(verify, 900);
      });
      win.webContents.on('did-frame-navigate', function () {
        setTimeout(verify, 900);
      });
      win.webContents.on('did-finish-load', function () {
        setTimeout(verify, 900);
      });
      win.on('closed', function () {
        if (poll) clearInterval(poll);
        if (timeout) clearTimeout(timeout);
        loginWindow = null;
        if (!settled) {
          settle({ ok: false, connected: false, error: 'a janela do pinterest fechou.' });
        }
      });
      poll = setInterval(verify, 2500);
      timeout = setTimeout(function () {
        settle({ ok: false, connected: false, error: 'o login no pinterest demorou demais. tenta de novo.' });
      }, 5 * 60 * 1000);

      win.loadURL('https://www.pinterest.com/login/?next=%2F').catch(function () {
        settle({ ok: false, connected: false, error: 'não consegui abrir o login do pinterest.' });
      });
    });
    return loginPromise;
  }

  async function boardsFromHtml(html, username) {
    const props = initialProps(html);
    const state = props && props.initialReduxState ? props.initialReduxState : null;
    const output = [];
    const seen = new Set();
    const push = function (item) {
      if (!item || (item.type && item.type !== 'board')) return;
      const board = mapBoard(item);
      if (!board.id || !board.url || seen.has(board.id)) return;
      seen.add(board.id);
      output.push(board);
    };
    if (state) {
      Object.keys(state.boards || {}).forEach(function (key) {
        push(state.boards[key]);
      });
    }
    const resources = state && state.resources ? state.resources : {};
    const feed = resources.BoardsFeedResource || {};
    let options = {
      field_set_key: 'profile_grid_item',
      filter_stories: false,
      sort: 'last_pinned_to',
      username: username
    };
    let bookmark = '';
    Object.keys(feed).forEach(function (key) {
      try {
        const pairs = JSON.parse(key);
        const candidate = {};
        pairs.forEach(function (pair) {
          candidate[pair[0]] = pair[1];
        });
        if (!options.username || candidate.username === username) options = candidate;
      } catch (error) {
        void error;
      }
      if (feed[key] && Array.isArray(feed[key].data)) {
        feed[key].data.forEach(push);
      }
      if (feed[key] && feed[key].nextBookmark) bookmark = feed[key].nextBookmark;
    });

    const appVersion = appVersionFromHtml(html);
    const sourcePath = '/' + username + '/boards/';
    const handler = 'www/[username]/boards.js';
    let page = 0;
    while (page < 80) {
      if (bookmark === '-end-') break;
      const opts = Object.assign({}, options, {
        username: username,
        bookmarks: bookmark ? [bookmark] : [],
        page_size: 25
      });
      const url = 'https://www.pinterest.com/resource/BoardsFeedResource/get/?source_url='
        + encodeURIComponent(sourcePath) + '&data=' + encodeURIComponent(JSON.stringify({ options: opts, context: {} }));
      const result = await requestResource(url, sourcePath, handler, appVersion);
      if (!result.ok) break;
      let json = null;
      try {
        json = JSON.parse(result.text);
      } catch (error) {
        break;
      }
      const response = json && json.resource_response ? json.resource_response : null;
      if (!response) break;
      const data = Array.isArray(response.data) ? response.data : [];
      data.forEach(push);
      const next = Array.isArray(response.bookmark) ? response.bookmark[0] : response.bookmark;
      if (!next || next === '-end-' || !data.length) break;
      bookmark = next;
      page += 1;
      await sleep(220);
    }
    return output;
  }

  function mapBoard(item) {
    if (!item || !item.id) return null;
    let path = String(item.url || '');
    if (!path && item.owner && item.owner.username && item.slug) {
      path = '/' + item.owner.username + '/' + item.slug + '/';
    }
    if (!path) return null;
    if (!/^https?:/i.test(path)) {
      path = 'https://www.pinterest.com' + (path.charAt(0) === '/' ? path : '/' + path);
    }
    if (!allowedRemote(path, PINTEREST_HOST)) return null;
    return {
      id: String(item.id),
      title: String(item.name || item.title || 'pasta do pinterest'),
      url: path,
      pinCount: Number(item.pin_count) || 0,
      sectionCount: Number(item.section_count) || 0,
      private: item.privacy === 'secret' || item.privacy === 'private' || Boolean(item.is_secret)
    };
  }

  ipcMain.handle('fetch-pinterest', async (event, target) => {
    if (!allowedRemote(target, PINTEREST_HOST)) {
      return { ok: false, error: 'só consigo abrir links do pinterest.' };
    }
    try {
      const response = await pinterestFetch(target, {
        headers: {
          'user-agent': BROWSER_UA,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.7'
        }
      });
      if (!response.ok) {
        return { ok: false, error: 'o pinterest respondeu ' + response.status + '. confere se a pasta é pública.' };
      }
      if (response.url && !allowedRemote(response.url, PINTEREST_HOST)) {
        return { ok: false, error: 'o pinterest redirecionou pra um endereço inesperado.' };
      }
      const text = await response.text();
      if (!text || text.length > MAX_HTML) {
        return { ok: false, error: 'a página do pinterest veio grande demais.' };
      }
      const identity = identityFromHtml(text);
      return {
        ok: true,
        text: text,
        appVersion: appVersionFromHtml(text),
        connected: Boolean(identity),
        username: identity ? identity.username : ''
      };
    } catch (error) {
      return { ok: false, error: 'não consegui abrir o pinterest agora. tenta de novo em instantes.' };
    }
  });

  ipcMain.handle('fetch-pinterest-image', async (event, target) => {
    if (!allowedRemote(target, PINIMG_HOST)) return { ok: false };
    try {
      const response = await pinterestFetch(target, {
        headers: {
          'user-agent': BROWSER_UA,
          accept: 'image/*',
          referer: 'https://www.pinterest.com/'
        }
      }, 30000);
      if (!response.ok || (response.url && !allowedRemote(response.url, PINIMG_HOST))) return { ok: false };
      const type = response.headers.get('content-type') || 'image/jpeg';
      if (!/^image\//i.test(type)) return { ok: false };
      const declared = Number(response.headers.get('content-length') || 0);
      if (declared > 20 * 1024 * 1024) return { ok: false };
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > 20 * 1024 * 1024) return { ok: false };
      return { ok: true, dataUrl: 'data:' + type + ';base64,' + buffer.toString('base64') };
    } catch (error) {
      return { ok: false };
    }
  });

  ipcMain.handle('fetch-pinterest-resource', async (event, payload) => {
    const url = String((payload && payload.url) || '');
    let sourcePath = String((payload && payload.sourcePath) || '');
    const handler = String((payload && payload.handler) || '');
    const appVersion = String((payload && payload.appVersion) || '');
    if (!RESOURCE_URL.test(url) || !allowedRemote(url, PINTEREST_HOST)) {
      return { ok: false, error: 'endereço de recurso do pinterest inválido.' };
    }
    if (/^https?:/i.test(sourcePath)) {
      try {
        sourcePath = new URL(sourcePath).pathname;
      } catch (error) {
        return { ok: false, error: 'caminho da pasta inválido.' };
      }
    }
    if (!sourcePath || sourcePath.charAt(0) !== '/') sourcePath = '/' + sourcePath;
    if (!/^\/[A-Za-z0-9_%+./-]*$/.test(sourcePath) || !/^www\/[A-Za-z0-9_./\[\]+-]+$/.test(handler)) {
      return { ok: false, error: 'caminho da pasta inválido.' };
    }
    return requestResource(url, sourcePath, handler, appVersion);
  });

  ipcMain.handle('pinterest-debug', async () => {
    await loadSessionCookies();
    const csrf = cookieJar.get('csrftoken') || '';
    return {
      cookies: Array.from(cookieJar.keys()),
      csrfLength: csrf.length,
      csrfStart: csrf.slice(0, 5),
      auth: cookieJar.get('_auth') || '',
      sessionLength: String(cookieJar.get('_pinterest_sess') || '').length,
      cookieHeader: cookieHeader()
    };
  });

  ipcMain.handle('pinterest-status', async () => {
    const identity = await detectIdentity(false);
    return {
      ok: true,
      connected: Boolean(identity && identity.username),
      username: identity ? identity.username : '',
      name: identity ? identity.name : ''
    };
  });

  ipcMain.handle('pinterest-connect', async () => {
    return openLoginWindow();
  });

  ipcMain.handle('pinterest-disconnect', async () => {
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
    loginWindow = null;
    loginPromise = null;
    identityCache = null;
    cookieJar = new Map();
    try {
      await pinterestSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage']
      });
      pinterestSession.flushStorageData();
    } catch (error) {
      void error;
    }
    return { ok: true };
  });

  ipcMain.handle('pinterest-boards', async () => {
    const identity = await detectIdentity(true);
    if (!identity || !identity.username) {
      return { ok: false, error: 'conecte sua conta do pinterest primeiro.' };
    }
    try {
      const target = 'https://www.pinterest.com/' + encodeURIComponent(identity.username) + '/boards/';
      const response = await pinterestFetch(target, {
        headers: {
          'user-agent': BROWSER_UA,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.7'
        }
      }, 30000);
      if (!response.ok) {
        return { ok: false, error: 'não consegui abrir suas pastas no pinterest.' };
      }
      const html = await response.text();
      const boards = await boardsFromHtml(html, identity.username);
      return {
        ok: true,
        username: identity.username,
        name: identity.name,
        boards: boards
      };
    } catch (error) {
      return { ok: false, error: 'não consegui listar suas pastas do pinterest agora.' };
    }
  });
}

module.exports = { setupPinterest };
