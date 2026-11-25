const VERSAO = 'crechezinha-v7';
const CACHA_DA_CASCA = `${VERSAO}-casca`;
const CACHA_DOS_ENFEITES = `${VERSAO}-enfeites`;

const CASCA = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/images/icon.svg',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/icon-maskable-192.png',
  './assets/images/icon-maskable-512.png',
  './assets/images/apple-touch-icon.png',
  './assets/images/favicon-32.png',
  './assets/js/media-kind.js',
  './assets/js/image-encode.js',
  './assets/js/sticker-index.js',
  './assets/js/sticker-categories.js',
  './assets/js/sticker-placement.js',
  './assets/js/page-text.js',
  './assets/js/pen-stroke.js',
  './assets/js/diary-styling.js',
  './assets/js/entry-store.js',
  './assets/js/backup-restore.js',
  './assets/js/flip-model.js',
  './assets/js/flip-fit.js',
  './assets/js/page-sound.js',
  './assets/js/playlists-model.js',
  './assets/js/media-store.js',
  './assets/js/history-model.js',
  './assets/js/flipbook.js',
  './assets/js/pooftie-api.js',
  './assets/js/letters-model.js',
  './assets/js/mural-model.js',
  './assets/js/widget-config.js',
  './assets/js/calendar-style.js',
  './assets/js/calendar-events.js'
];

const ENFEITES = [
  './assets/images/cursor.webp',
  './assets/images/cursorh.webp',
  './assets/images/pinboard.png',
  './assets/emoji/emoji.css',
  './assets/emoji/apple-emoji.css'
];

function ehCasca(caminho) {
  if (caminho === '/' || caminho.endsWith('/') || caminho.endsWith('/index.html')) return true;
  if (caminho.endsWith('/manifest.json')) return true;
  if (/\.(?:js|css)$/.test(caminho)) return true;
  if (/\/assets\/images\/icon[-.]/.test(caminho)) return true;
  if (/\/assets\/images\/apple-touch-icon/.test(caminho)) return true;
  return false;
}

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cacho = await caches.open(CACHA_DA_CASCA);
    await cacho.addAll(CASCA);
    await Promise.all(ENFEITES.map(async (caminho) => {
      try {
        await cacho.add(new Request(caminho, { cache: 'reload' }));
      } catch (erro) {
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes
      .filter((nome) => nome.startsWith('crechezinha-') && !nome.startsWith(VERSAO))
      .map((nome) => caches.delete(nome)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (evento) => {
  const dado = evento.data || {};
  if (dado.tipo === 'limpar-cache') {
    evento.waitUntil((async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes
        .filter((nome) => nome.startsWith('crechezinha-'))
        .map((nome) => caches.delete(nome)));
      await self.registration.update();
      await self.skipWaiting();
    })());
  }
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;

  let url;
  try {
    url = new URL(pedido.url);
  } catch (erro) {
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  if (url.origin !== self.location.origin) {
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
      evento.respondWith(cachePrimeiro(pedido, CACHA_DOS_ENFEITES));
    }
    return;
  }

  if (pedido.mode === 'navigate') {
    evento.respondWith(redePrimeiro(pedido, CACHA_DA_CASCA, './index.html'));
    return;
  }

  if (ehCasca(url.pathname)) {
    evento.respondWith(redePrimeiro(pedido, CACHA_DA_CASCA));
    return;
  }

  evento.respondWith(cachePrimeiro(pedido, CACHA_DOS_ENFEITES));
});

async function redePrimeiro(pedido, nomeDoCache, reserva) {
  const cacho = await caches.open(nomeDoCache);
  try {
    const resposta = await fetch(pedido);
    if (resposta && resposta.ok && resposta.type === 'basic') {
      cacho.put(pedido, resposta.clone());
    }
    return resposta;
  } catch (erro) {
    const guardada = await cacho.match(pedido, { ignoreSearch: true });
    if (guardada) return guardada;
    if (reserva) {
      const daReserva = await cacho.match(reserva, { ignoreSearch: true });
      if (daReserva) return daReserva;
    }
    return new Response('sem internet 🌧️', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
}

async function cachePrimeiro(pedido, nomeDoCache) {
  const cacho = await caches.open(nomeDoCache);
  const guardada = await cacho.match(pedido, { ignoreSearch: true });
  const daRede = fetch(pedido).then((resposta) => {
    if (resposta && resposta.ok && resposta.type === 'basic') {
      cacho.put(pedido, resposta.clone());
    }
    return resposta;
  }).catch(() => null);
  if (guardada) {
    return guardada;
  }
  const resposta = await daRede;
  if (resposta) return resposta;
  return new Response('sem internet 🌧️', {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}
