const PINTEREST_HOST = /(^|\.)pinterest\.com$/i;
const PINIMG_HOST = /(^|\.)pinimg\.com$/i;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function allowedRemote(url, pattern) {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) && pattern.test(parsed.hostname);
  } catch (error) {
    return false;
  }
}

async function fetchWithTimeout(net, target, options) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 30000);
  try {
    return await net.fetch(target, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

function setupPinterest({ ipcMain, net }) {
  ipcMain.handle('fetch-pinterest', async (event, target) => {
    if (!allowedRemote(target, PINTEREST_HOST)) {
      return { ok: false, error: 'só consigo abrir links do pinterest.' };
    }
    try {
      const response = await fetchWithTimeout(net, target, {
        redirect: 'follow',
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
      if (!text || text.length > 8 * 1024 * 1024) {
        return { ok: false, error: 'a página do pinterest veio grande demais.' };
      }
      return { ok: true, text: text };
    } catch (error) {
      return { ok: false, error: 'não consegui abrir o pinterest agora. tenta de novo em instantes.' };
    }
  });

  ipcMain.handle('fetch-pinterest-image', async (event, target) => {
    if (!allowedRemote(target, PINIMG_HOST)) return { ok: false };
    try {
      const response = await fetchWithTimeout(net, target, {
        redirect: 'follow',
        headers: { 'user-agent': BROWSER_UA, accept: 'image/*' }
      });
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
}

module.exports = { setupPinterest };
