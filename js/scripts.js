(function () {
  const SMA = (window.SMA = window.SMA || {});
  const STORAGE_KEY = 'sma_scripts_v1';
  const DB_NAME = 'sma_scripts_media';
  const STORE_NAME = 'blobs';
  const STICKER_MANIFEST_URL = 'little-place/assets/stickers/manifest.json';

  const CATEGORY_LABELS = {
    all: 'todos',
    agere: 'fofos',
    animais: 'bichinhos',
    canetinhas: 'canetinhas',
    comidinhas: 'comidinhas',
    coracaozinhos: 'corações',
    emoticons: 'emoticons',
    lacinhos: 'lacinhos',
    natureza: 'natureza',
    pelucias: 'pelúcias',
    pooftie: 'pooftie',
    random: 'variados',
    'rendinhas-e-bordas': 'rendinhas'
  };

  const PAGE_ICONS = ['🦢', '🎀', '🕯️', '📖', '🌙', '🌷', '🧸', '💌', '🩰', '✨', '🍓', '🎧'];
  const CARD_TINTS = ['cream', 'rose', 'sage', 'butter', 'lavender'];

  let root = null;
  let initialized = false;
  let dbPromise = null;
  const blobUrlCache = new Map();
  let stickerState = {
    loaded: false,
    loading: false,
    all: [],
    categories: ['all'],
    activeCategory: 'all',
    query: '',
    open: false
  };

  let state = {
    activePageId: null,
    sidebarOpen: true,
    query: '',
    pages: []
  };

  let dragSession = null;

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function esc(value) {
    return SMA.escapeHTML ? SMA.escapeHTML(value) : String(value || '');
  }

  function toast(msg) {
    if (typeof SMA.toast === 'function') SMA.toast(msg);
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB indisponível'));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  async function saveBlob(id, blob) {
    const db = await openDb();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(blob, id);
      tx.oncomplete = function () { resolve(id); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  async function getBlobUrl(id) {
    if (!id) return '';
    if (blobUrlCache.has(id)) return blobUrlCache.get(id);
    try {
      const db = await openDb();
      const blob = await new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      blobUrlCache.set(id, url);
      return url;
    } catch (error) {
      return '';
    }
  }

  async function deleteBlob(id) {
    if (!id) return;
    const cached = blobUrlCache.get(id);
    if (cached) {
      URL.revokeObjectURL(cached);
      blobUrlCache.delete(id);
    }
    try {
      const db = await openDb();
      await new Promise(function (resolve) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    } catch (error) {}
  }

  function defaultPages() {
    return [
      {
        id: uid('page'),
        icon: '🦢',
        title: 'meu script principal',
        subtitle: 'um cantinho meio notion, meio milanote — cola textos, fotos, vídeos, áudios e adesivos',
        mode: 'misto',
        docHtml: '<p>Escreva aqui seu script, afirmações, rotina ou cenas detalhadas. Você pode <strong>copiar e colar</strong> direto daqui, organizar em listas ou montar um quadro visual logo abaixo.</p>',
        cards: [
          {
            id: uid('card'),
            type: 'note',
            x: 28,
            y: 26,
            w: 250,
            h: 170,
            z: 2,
            tint: 'cream',
            title: '✨ cena da manhã',
            body: 'Acordo tranquila, sentindo a luz suave pela janela. Tudo já está no lugar certo.'
          },
          {
            id: uid('card'),
            type: 'todo',
            x: 304,
            y: 26,
            w: 235,
            h: 185,
            z: 3,
            tint: 'rose',
            title: 'checklist do script',
            items: [
              { id: uid('it'), text: 'aparência & estilo', done: true },
              { id: uid('it'), text: 'quarto e cantinho', done: false },
              { id: uid('it'), text: 'áudio & trilha sonora', done: false }
            ]
          }
        ]
      }
    ];
  }

  function loadState() {
    const saved = SMA.readJSON ? SMA.readJSON(STORAGE_KEY, null) : null;
    if (saved && Array.isArray(saved.pages) && saved.pages.length > 0) {
      state.pages = saved.pages;
      state.activePageId = saved.activePageId || saved.pages[0].id;
      state.sidebarOpen = saved.sidebarOpen !== false;
    } else {
      state.pages = defaultPages();
      state.activePageId = state.pages[0].id;
      state.sidebarOpen = true;
    }
  }

  const persist = SMA.debounce(function () {
    if (SMA.writeJSON) {
      SMA.writeJSON(STORAGE_KEY, {
        activePageId: state.activePageId,
        sidebarOpen: state.sidebarOpen,
        pages: state.pages
      });
    }
  }, 180);

  function saveNow() {
    if (SMA.writeJSON) {
      SMA.writeJSON(STORAGE_KEY, {
        activePageId: state.activePageId,
        sidebarOpen: state.sidebarOpen,
        pages: state.pages
      });
    }
  }

  function activePage() {
    return state.pages.find(function (p) { return p.id === state.activePageId; }) || state.pages[0] || null;
  }

  function maxZ(page) {
    if (!page || !Array.isArray(page.cards)) return 1;
    return page.cards.reduce(function (acc, item) {
      return Math.max(acc, Number(item.z) || 1);
    }, 1);
  }

  function nextCardCoords(page) {
    const count = (page && page.cards ? page.cards.length : 0);
    const col = count % 3;
    const row = Math.floor(count / 3) % 4;
    return {
      x: 28 + col * 260 + (row % 2) * 18,
      y: 28 + row * 185
    };
  }

  async function loadStickers() {
    if (stickerState.loaded || stickerState.loading) return;
    stickerState.loading = true;
    try {
      const response = await fetch(STICKER_MANIFEST_URL);
      const data = await response.json();
      const list = Array.isArray(data && data.stickers) ? data.stickers : [];
      const categories = new Set(['all']);
      stickerState.all = list.map(function (rel) {
        const parts = String(rel).split('/');
        const category = parts.length >= 4 ? parts[2] : 'random';
        categories.add(category);
        return {
          path: 'little-place/' + rel,
          category: category,
          name: (parts[parts.length - 1] || '').replace(/\.[^.]+$/, '')
        };
      });
      stickerState.categories = Array.from(categories);
      stickerState.loaded = true;
    } catch (error) {
      toast('não consegui carregar os adesivos');
    } finally {
      stickerState.loading = false;
      renderStickerDrawer();
    }
  }

  function addPage(initial) {
    const page = Object.assign({
      id: uid('page'),
      icon: PAGE_ICONS[state.pages.length % PAGE_ICONS.length],
      title: 'novo script',
      subtitle: 'notas, referências, fotos, vídeos e adesivos',
      mode: 'misto',
      docHtml: '<p></p>',
      cards: []
    }, initial || {});
    state.pages.push(page);
    state.activePageId = page.id;
    saveNow();
    render();
  }

  function duplicatePage(pageId) {
    const src = state.pages.find(function (p) { return p.id === pageId; });
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid('page');
    copy.title = (copy.title || 'script') + ' (cópia)';
    copy.cards = (copy.cards || []).map(function (c) {
      c.id = uid('card');
      return c;
    });
    state.pages.push(copy);
    state.activePageId = copy.id;
    saveNow();
    render();
    toast('página duplicada');
  }

  function removePage(pageId) {
    if (state.pages.length <= 1) {
      toast('precisa ficar pelo menos uma página');
      return;
    }
    const page = state.pages.find(function (p) { return p.id === pageId; });
    if (page && Array.isArray(page.cards)) {
      page.cards.forEach(function (c) {
        if (c.mediaId) deleteBlob(c.mediaId);
      });
    }
    state.pages = state.pages.filter(function (p) { return p.id !== pageId; });
    if (state.activePageId === pageId) {
      state.activePageId = state.pages[0].id;
    }
    saveNow();
    render();
  }

  function addCardToActive(card) {
    const page = activePage();
    if (!page) return;
    const coords = nextCardCoords(page);
    const created = Object.assign({
      id: uid('card'),
      x: coords.x,
      y: coords.y,
      w: 240,
      h: 170,
      z: maxZ(page) + 1,
      tint: 'cream'
    }, card);
    page.cards.push(created);
    saveNow();
    renderBoard();
    return created;
  }

  async function addMediaFiles(files, forcedKind, dropPos) {
    const page = activePage();
    if (!page || !files || !files.length) return;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const mime = String(file.type || '').toLowerCase();
      let kind = forcedKind || '';
      if (!kind) {
        if (mime.startsWith('image/')) kind = 'photo';
        else if (mime.startsWith('video/')) kind = 'video';
        else if (mime.startsWith('audio/')) kind = 'audio';
      }
      if (!kind) continue;
      const mediaId = uid('media');
      await saveBlob(mediaId, file);
      const offset = i * 24;
      const base = dropPos
        ? { x: Math.max(12, dropPos.x + offset), y: Math.max(12, dropPos.y + offset) }
        : nextCardCoords(page);
      const dims = kind === 'audio'
        ? { w: 270, h: 120 }
        : kind === 'video'
          ? { w: 290, h: 225 }
          : { w: 240, h: 210 };
      page.cards.push({
        id: uid('card'),
        type: kind,
        mediaId: mediaId,
        fileName: file.name || kind,
        caption: (file.name || '').replace(/\.[^.]+$/, ''),
        x: base.x,
        y: base.y,
        w: dims.w,
        h: dims.h,
        z: maxZ(page) + 1,
        tint: 'cream'
      });
    }
    saveNow();
    renderBoard();
  }

  function copyText(text, label) {
    const value = String(text || '').trim();
    if (!value) {
      toast('nada para copiar ainda');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        toast(label || 'copiado!');
      }).catch(function () {
        fallbackCopy(value, label);
      });
    } else {
      fallbackCopy(value, label);
    }
  }

  function fallbackCopy(value, label) {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      toast(label || 'copiado!');
    } catch (error) {
      toast('não deu para copiar');
    }
    area.remove();
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard) {
      toast('use Ctrl+V no quadro para colar');
      return;
    }
    try {
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find(function (t) { return t.startsWith('image/'); });
          if (imgType) {
            const blob = await item.getType(imgType);
            await addMediaFiles([blob], 'photo');
            toast('foto colada no quadro');
            return;
          }
        }
      }
      if (navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          addCardToActive({
            type: 'note',
            title: 'nota colada',
            body: text.trim(),
            w: 260,
            h: 175
          });
          toast('texto colado como nota');
          return;
        }
      }
      toast('use Ctrl+V no quadro para colar');
    } catch (error) {
      toast('use Ctrl+V no quadro para colar');
    }
  }

  function renderSidebar() {
    const sidebar = root.querySelector('.scripts-sidebar');
    if (!sidebar) return;
    const q = state.query.trim().toLowerCase();
    const list = state.pages.filter(function (p) {
      if (!q) return true;
      return (p.title || '').toLowerCase().includes(q) || (p.subtitle || '').toLowerCase().includes(q);
    });

    sidebar.innerHTML = ''
      + '<div class="scripts-side-head">'
      + '  <span class="scripts-side-brand">scripts ‧ dr</span>'
      + '  <button type="button" class="scripts-side-new" data-sc-act="new-page" title="nova página">＋ página</button>'
      + '</div>'
      + '<label class="scripts-side-search">'
      + '  <input type="search" id="scripts-page-search" placeholder="filtrar páginas..." value="' + esc(state.query) + '">'
      + '</label>'
      + '<div class="scripts-page-list">'
      + list.map(function (page) {
          const isActive = page.id === state.activePageId;
          return '<div class="scripts-page-item' + (isActive ? ' is-active' : '') + '" data-page-id="' + esc(page.id) + '">'
            + '  <button type="button" class="scripts-page-open" data-sc-act="open-page" data-page-id="' + esc(page.id) + '">'
            + '    <span class="scripts-page-ico">' + esc(page.icon || '🦢') + '</span>'
            + '    <span class="scripts-page-name">' + esc(page.title || 'sem título') + '</span>'
            + '  </button>'
            + '  <div class="scripts-page-actions">'
            + '    <button type="button" class="scripts-mini-btn" data-sc-act="dup-page" data-page-id="' + esc(page.id) + '" title="duplicar">⧉</button>'
            + '    <button type="button" class="scripts-mini-btn is-del" data-sc-act="del-page" data-page-id="' + esc(page.id) + '" title="apagar">✕</button>'
            + '  </div>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  function cardHtml(card) {
    const style = 'left:' + Math.round(card.x) + 'px;top:' + Math.round(card.y) + 'px;width:' + Math.round(card.w) + 'px;height:' + Math.round(card.h) + 'px;z-index:' + (card.z || 1) + ';';

    if (card.type === 'sticker') {
      const rot = Number(card.rot) || 0;
      return '<div class="sc-card sc-sticker-card" data-card-id="' + esc(card.id) + '" style="' + style + 'transform:rotate(' + rot + 'deg);">'
        + '  <img src="' + esc(card.src) + '" alt="adesivo" draggable="false">'
        + '  <div class="sc-sticker-tools">'
        + '    <button type="button" data-card-act="rot-left" title="girar esquerda">↺</button>'
        + '    <button type="button" data-card-act="rot-right" title="girar direita">↻</button>'
        + '    <button type="button" data-card-act="delete" title="remover">✕</button>'
        + '  </div>'
        + '  <span class="sc-resize-handle" data-resize="1" title="redimensionar"></span>'
        + '</div>';
    }

    const tint = card.tint || 'cream';
    const header = ''
      + '<div class="sc-card-head" data-drag-handle="1">'
      + '  <span class="sc-card-dots" aria-hidden="true">⋮⋮</span>'
      + '  <div class="sc-card-tools">'
      + (card.type === 'note' ? '<button type="button" data-card-act="tint" title="mudar cor">◐</button>' : '')
      + (card.type === 'note' || card.type === 'todo' ? '<button type="button" data-card-act="copy" title="copiar">copiar</button>' : '')
      + '    <button type="button" data-card-act="delete" title="apagar">✕</button>'
      + '  </div>'
      + '</div>';

    if (card.type === 'note') {
      return '<article class="sc-card sc-note-card tint-' + esc(tint) + '" data-card-id="' + esc(card.id) + '" style="' + style + '">'
        + header
        + '  <input type="text" class="sc-note-title" value="' + esc(card.title || '') + '" placeholder="título da nota...">'
        + '  <textarea class="sc-note-body" placeholder="escreva ou cole seu texto aqui...">' + esc(card.body || '') + '</textarea>'
        + '  <span class="sc-resize-handle" data-resize="1" title="redimensionar"></span>'
        + '</article>';
    }

    if (card.type === 'todo') {
      const items = Array.isArray(card.items) ? card.items : [];
      return '<article class="sc-card sc-todo-card tint-' + esc(tint) + '" data-card-id="' + esc(card.id) + '" style="' + style + '">'
        + header
        + '  <input type="text" class="sc-note-title" value="' + esc(card.title || '') + '" placeholder="checklist...">'
        + '  <div class="sc-todo-list">'
        + items.map(function (it) {
            return '<div class="sc-todo-row" data-todo-id="' + esc(it.id) + '">'
              + '  <input type="checkbox"' + (it.done ? ' checked' : '') + '>'
              + '  <input type="text" class="sc-todo-text' + (it.done ? ' is-done' : '') + '" value="' + esc(it.text || '') + '" placeholder="item...">'
              + '  <button type="button" class="sc-todo-del" data-card-act="del-todo" title="remover">×</button>'
              + '</div>';
          }).join('')
        + '  </div>'
        + '  <button type="button" class="sc-todo-add" data-card-act="add-todo">＋ item</button>'
        + '  <span class="sc-resize-handle" data-resize="1" title="redimensionar"></span>'
        + '</article>';
    }

    if (card.type === 'photo') {
      return '<figure class="sc-card sc-media-card" data-card-id="' + esc(card.id) + '" style="' + style + '">'
        + header
        + '  <div class="sc-media-box"><img class="sc-media-el" data-media-id="' + esc(card.mediaId || '') + '" src="' + esc(card.src || '') + '" alt="' + esc(card.caption || 'foto') + '" draggable="false"></div>'
        + '  <input type="text" class="sc-media-cap" value="' + esc(card.caption || '') + '" placeholder="legenda da foto...">'
        + '  <span class="sc-resize-handle" data-resize="1" title="redimensionar"></span>'
        + '</figure>';
    }

    if (card.type === 'video') {
      return '<figure class="sc-card sc-media-card sc-video-card" data-card-id="' + esc(card.id) + '" style="' + style + '">'
        + header
        + '  <div class="sc-media-box"><video class="sc-media-el" data-media-id="' + esc(card.mediaId || '') + '" controls playsinline preload="metadata"></video></div>'
        + '  <input type="text" class="sc-media-cap" value="' + esc(card.caption || '') + '" placeholder="nome do vídeo...">'
        + '  <span class="sc-resize-handle" data-resize="1" title="redimensionar"></span>'
        + '</figure>';
    }

    if (card.type === 'audio') {
      return '<div class="sc-card sc-audio-card" data-card-id="' + esc(card.id) + '" style="' + style + '">'
        + header
        + '  <div class="sc-audio-row"><span class="sc-audio-ico">🎵</span><input type="text" class="sc-media-cap" value="' + esc(card.caption || '') + '" placeholder="título do áudio..."></div>'
        + '  <audio class="sc-media-el" data-media-id="' + esc(card.mediaId || '') + '" controls preload="metadata"></audio>'
        + '  <span class="sc-resize-handle" data-resize="1" title="redimensionar"></span>'
        + '</div>';
    }

    return '';
  }

  function hydrateMediaElements() {
    const els = root.querySelectorAll('.sc-media-el[data-media-id]');
    els.forEach(function (el) {
      const id = el.getAttribute('data-media-id');
      if (!id) return;
      getBlobUrl(id).then(function (url) {
        if (url && el.isConnected && el.getAttribute('src') !== url) {
          el.setAttribute('src', url);
        }
      });
    });
  }

  function renderBoard() {
    const board = root.querySelector('#scripts-board');
    const page = activePage();
    if (!board || !page) return;
    const cards = Array.isArray(page.cards) ? page.cards : [];
    const maxBottom = cards.reduce(function (acc, c) {
      return Math.max(acc, (Number(c.y) || 0) + (Number(c.h) || 180) + 80);
    }, 520);
    board.style.minHeight = maxBottom + 'px';

    if (cards.length === 0) {
      board.innerHTML = '<div class="sc-board-empty">'
        + '<span>✨</span>'
        + '<strong>seu quadro estilo milanote está prontinho</strong>'
        + '<p>adicione notas, listas, fotos, vídeos, áudios ou adesivos do little place — ou arraste e cole (Ctrl+V) direto aqui</p>'
        + '</div>';
      return;
    }

    board.innerHTML = cards.map(cardHtml).join('');
    hydrateMediaElements();
  }

  function renderStickerDrawer() {
    const drawer = root.querySelector('#scripts-sticker-drawer');
    if (!drawer) return;
    drawer.hidden = !stickerState.open;
    if (!stickerState.open) return;

    const tabsHtml = stickerState.categories.map(function (cat) {
      const label = CATEGORY_LABELS[cat] || cat;
      return '<button type="button" class="sc-st-cat' + (cat === stickerState.activeCategory ? ' is-active' : '') + '" data-st-cat="' + esc(cat) + '">' + esc(label) + '</button>';
    }).join('');

    const q = stickerState.query.trim().toLowerCase();
    const filtered = stickerState.all.filter(function (item) {
      if (stickerState.activeCategory !== 'all' && item.category !== stickerState.activeCategory) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false;
      return true;
    }).slice(0, 140);

    drawer.innerHTML = ''
      + '<div class="sc-st-head">'
      + '  <strong>adesivos do little place</strong>'
      + '  <input type="search" id="sc-st-search" placeholder="buscar adesivo..." value="' + esc(stickerState.query) + '">'
      + '  <button type="button" class="sc-st-close" data-sc-act="close-stickers">✕</button>'
      + '</div>'
      + '<div class="sc-st-cats">' + tabsHtml + '</div>'
      + '<div class="sc-st-grid">'
      + (stickerState.loading
          ? '<p class="sc-st-msg">carregando adesivos...</p>'
          : filtered.length === 0
            ? '<p class="sc-st-msg">nenhum adesivo encontrado</p>'
            : filtered.map(function (item) {
                return '<button type="button" class="sc-st-item" data-st-src="' + esc(item.path) + '" title="' + esc(item.name) + '">'
                  + '<img src="' + esc(item.path) + '" alt="' + esc(item.name) + '" loading="lazy">'
                  + '</button>';
              }).join(''))
      + '</div>';
  }

  function render() {
    if (!root) return;
    const page = activePage();
    if (!page) return;
    const mode = page.mode || 'misto';

    root.innerHTML = ''
      + '<div class="scripts-shell' + (state.sidebarOpen ? '' : ' is-side-closed') + '">'
      + '  <aside class="scripts-sidebar"></aside>'
      + '  <div class="scripts-workspace">'
      + '    <div class="scripts-topbar">'
      + '      <div class="scripts-topbar-left">'
      + '        <button type="button" class="scripts-pill-btn" data-sc-act="toggle-side" title="mostrar/esconder páginas">☰ páginas</button>'
      + '        <span class="scripts-breadcrumb">' + esc(page.icon || '🦢') + ' ' + esc(page.title || 'script') + '</span>'
      + '      </div>'
      + '      <div class="scripts-mode-group" role="tablist" aria-label="modo de visualização">'
      + '        <button type="button" class="scripts-mode-btn' + (mode === 'misto' ? ' is-active' : '') + '" data-sc-mode="misto">misto</button>'
      + '        <button type="button" class="scripts-mode-btn' + (mode === 'quadro' ? ' is-active' : '') + '" data-sc-mode="quadro">quadro</button>'
      + '        <button type="button" class="scripts-mode-btn' + (mode === 'pagina' ? ' is-active' : '') + '" data-sc-mode="pagina">página</button>'
      + '      </div>'
      + '    </div>'
      + '    <div class="scripts-page-scroll">'
      + '      <header class="scripts-notion-head">'
      + '        <button type="button" class="scripts-icon-btn" data-sc-act="cycle-icon" title="trocar ícone">' + esc(page.icon || '🦢') + '</button>'
      + '        <div class="scripts-notion-titles">'
      + '          <input type="text" class="scripts-title-input" id="scripts-title-input" value="' + esc(page.title || '') + '" placeholder="título do seu script...">'
      + '          <input type="text" class="scripts-sub-input" id="scripts-sub-input" value="' + esc(page.subtitle || '') + '" placeholder="adicione um subtítulo ou intenção...">'
      + '        </div>'
      + '      </header>'
      + (mode !== 'quadro'
          ? '      <section class="scripts-doc-wrap">'
            + '        <div class="scripts-doc-bar">'
            + '          <button type="button" data-doc-cmd="bold" title="negrito"><b>B</b></button>'
            + '          <button type="button" data-doc-cmd="italic" title="itálico"><i>I</i></button>'
            + '          <button type="button" data-doc-cmd="formatBlock" data-doc-val="H2" title="título">H2</button>'
            + '          <button type="button" data-doc-cmd="insertUnorderedList" title="lista">• lista</button>'
            + '          <button type="button" data-doc-cmd="formatBlock" data-doc-val="BLOCKQUOTE" title="citação">❝ citação</button>'
            + '          <button type="button" class="scripts-doc-copy" data-sc-act="copy-doc">copiar texto</button>'
            + '        </div>'
            + '        <div class="scripts-doc-editor" id="scripts-doc-editor" contenteditable="true" data-placeholder="escreva ou cole seu script estilo notion aqui...">' + (page.docHtml || '') + '</div>'
            + '      </section>'
          : '')
      + (mode !== 'pagina'
          ? '      <section class="scripts-board-wrap">'
            + '        <div class="scripts-dock">'
            + '          <button type="button" class="scripts-dock-btn" data-sc-act="add-note">＋ nota</button>'
            + '          <button type="button" class="scripts-dock-btn" data-sc-act="add-todo">☑ lista</button>'
            + '          <button type="button" class="scripts-dock-btn" data-sc-act="add-photo">🖼️ foto</button>'
            + '          <button type="button" class="scripts-dock-btn" data-sc-act="add-video">🎬 vídeo</button>'
            + '          <button type="button" class="scripts-dock-btn" data-sc-act="add-audio">🎵 áudio</button>'
            + '          <button type="button" class="scripts-dock-btn is-accent" data-sc-act="toggle-stickers">🎀 adesivos</button>'
            + '          <button type="button" class="scripts-dock-btn" data-sc-act="paste">📋 colar</button>'
            + '        </div>'
            + '        <div class="scripts-sticker-drawer" id="scripts-sticker-drawer" hidden></div>'
            + '        <div class="scripts-board" id="scripts-board"></div>'
            + '      </section>'
          : '')
      + '    </div>'
      + '  </div>'
      + '  <input type="file" id="scripts-photo-input" accept="image/*" multiple hidden>'
      + '  <input type="file" id="scripts-video-input" accept="video/*" multiple hidden>'
      + '  <input type="file" id="scripts-audio-input" accept="audio/*" multiple hidden>'
      + '</div>';

    renderSidebar();
    renderBoard();
    renderStickerDrawer();
  }

  function startPointerSession(event) {
    const board = root.querySelector('#scripts-board');
    if (!board) return;
    const cardEl = event.target.closest('[data-card-id]');
    if (!cardEl) return;

    const isResize = event.target.closest('[data-resize="1"]');
    const isSticker = cardEl.classList.contains('sc-sticker-card');
    const isHandle = event.target.closest('[data-drag-handle="1"]');
    if (!isResize && !isHandle && !isSticker) return;
    if (event.target.closest('button, input, textarea, video, audio')) return;

    const page = activePage();
    const card = page && page.cards.find(function (c) { return c.id === cardEl.getAttribute('data-card-id'); });
    if (!card) return;

    event.preventDefault();
    card.z = maxZ(page) + 1;
    cardEl.style.zIndex = card.z;
    cardEl.classList.add('is-dragging');

    dragSession = {
      type: isResize ? 'resize' : 'move',
      card: card,
      el: cardEl,
      startX: event.clientX,
      startY: event.clientY,
      origX: card.x,
      origY: card.y,
      origW: card.w,
      origH: card.h
    };
  }

  function movePointerSession(event) {
    if (!dragSession) return;
    const dx = event.clientX - dragSession.startX;
    const dy = event.clientY - dragSession.startY;
    const card = dragSession.card;
    if (dragSession.type === 'move') {
      card.x = Math.max(8, dragSession.origX + dx);
      card.y = Math.max(8, dragSession.origY + dy);
      dragSession.el.style.left = Math.round(card.x) + 'px';
      dragSession.el.style.top = Math.round(card.y) + 'px';
    } else {
      const minW = card.type === 'sticker' ? 56 : 180;
      const minH = card.type === 'sticker' ? 56 : 110;
      card.w = Math.max(minW, dragSession.origW + dx);
      card.h = Math.max(minH, dragSession.origH + dy);
      dragSession.el.style.width = Math.round(card.w) + 'px';
      dragSession.el.style.height = Math.round(card.h) + 'px';
    }
  }

  function endPointerSession() {
    if (!dragSession) return;
    dragSession.el.classList.remove('is-dragging');
    dragSession = null;
    saveNow();
  }

  function bindEvents() {
    root.addEventListener('click', function (event) {
      const page = activePage();

      const modeBtn = event.target.closest('[data-sc-mode]');
      if (modeBtn && page) {
        page.mode = modeBtn.getAttribute('data-sc-mode');
        saveNow();
        render();
        return;
      }

      const docCmd = event.target.closest('[data-doc-cmd]');
      if (docCmd) {
        const editor = root.querySelector('#scripts-doc-editor');
        if (editor) {
          editor.focus();
          document.execCommand(docCmd.getAttribute('data-doc-cmd'), false, docCmd.getAttribute('data-doc-val') || null);
          if (page) {
            page.docHtml = editor.innerHTML;
            persist();
          }
        }
        return;
      }

      const stCat = event.target.closest('[data-st-cat]');
      if (stCat) {
        stickerState.activeCategory = stCat.getAttribute('data-st-cat');
        renderStickerDrawer();
        return;
      }

      const stItem = event.target.closest('[data-st-src]');
      if (stItem) {
        addCardToActive({
          type: 'sticker',
          src: stItem.getAttribute('data-st-src'),
          w: 118,
          h: 118,
          rot: 0
        });
        toast('adesivo colado no quadro');
        return;
      }

      const cardAct = event.target.closest('[data-card-act]');
      if (cardAct && page) {
        const cardEl = cardAct.closest('[data-card-id]');
        const card = cardEl && page.cards.find(function (c) { return c.id === cardEl.getAttribute('data-card-id'); });
        if (!card) return;
        const action = cardAct.getAttribute('data-card-act');
        if (action === 'delete') {
          if (card.mediaId) deleteBlob(card.mediaId);
          page.cards = page.cards.filter(function (c) { return c.id !== card.id; });
          saveNow();
          renderBoard();
        } else if (action === 'tint') {
          const idx = CARD_TINTS.indexOf(card.tint || 'cream');
          card.tint = CARD_TINTS[(idx + 1) % CARD_TINTS.length];
          saveNow();
          renderBoard();
        } else if (action === 'copy') {
          if (card.type === 'note') {
            copyText((card.title ? card.title + '\n' : '') + (card.body || ''), 'nota copiada');
          } else if (card.type === 'todo') {
            const lines = (card.items || []).map(function (it) {
              return (it.done ? '[x] ' : '[ ] ') + it.text;
            }).join('\n');
            copyText((card.title ? card.title + '\n' : '') + lines, 'lista copiada');
          }
        } else if (action === 'rot-left' || action === 'rot-right') {
          card.rot = (Number(card.rot) || 0) + (action === 'rot-left' ? -12 : 12);
          saveNow();
          renderBoard();
        } else if (action === 'add-todo') {
          card.items = Array.isArray(card.items) ? card.items : [];
          card.items.push({ id: uid('it'), text: '', done: false });
          saveNow();
          renderBoard();
        } else if (action === 'del-todo') {
          const row = cardAct.closest('[data-todo-id]');
          const todoId = row && row.getAttribute('data-todo-id');
          card.items = (card.items || []).filter(function (it) { return it.id !== todoId; });
          saveNow();
          renderBoard();
        }
        return;
      }

      const actEl = event.target.closest('[data-sc-act]');
      if (!actEl) return;
      const act = actEl.getAttribute('data-sc-act');
      const pid = actEl.getAttribute('data-page-id');

      if (act === 'new-page') addPage();
      else if (act === 'open-page' && pid) {
        state.activePageId = pid;
        saveNow();
        render();
      } else if (act === 'dup-page' && pid) duplicatePage(pid);
      else if (act === 'del-page' && pid) removePage(pid);
      else if (act === 'toggle-side') {
        state.sidebarOpen = !state.sidebarOpen;
        saveNow();
        const shell = root.querySelector('.scripts-shell');
        if (shell) shell.classList.toggle('is-side-closed', !state.sidebarOpen);
      } else if (act === 'cycle-icon' && page) {
        const idx = PAGE_ICONS.indexOf(page.icon || '🦢');
        page.icon = PAGE_ICONS[(idx + 1) % PAGE_ICONS.length];
        saveNow();
        render();
      } else if (act === 'copy-doc') {
        const editor = root.querySelector('#scripts-doc-editor');
        copyText(editor ? editor.innerText : '', 'texto do script copiado');
      } else if (act === 'add-note') {
        addCardToActive({ type: 'note', title: '', body: '', w: 250, h: 175 });
      } else if (act === 'add-todo') {
        addCardToActive({
          type: 'todo',
          title: 'checklist',
          items: [{ id: uid('it'), text: 'novo item', done: false }],
          w: 240,
          h: 185
        });
      } else if (act === 'add-photo') {
        root.querySelector('#scripts-photo-input')?.click();
      } else if (act === 'add-video') {
        root.querySelector('#scripts-video-input')?.click();
      } else if (act === 'add-audio') {
        root.querySelector('#scripts-audio-input')?.click();
      } else if (act === 'toggle-stickers') {
        stickerState.open = !stickerState.open;
        renderStickerDrawer();
        if (stickerState.open && !stickerState.loaded) loadStickers();
      } else if (act === 'close-stickers') {
        stickerState.open = false;
        renderStickerDrawer();
      } else if (act === 'paste') {
        pasteFromClipboard();
      }
    });

    root.addEventListener('input', function (event) {
      const target = event.target;
      if (target.id === 'scripts-page-search') {
        state.query = target.value;
        renderSidebar();
        const input = root.querySelector('#scripts-page-search');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
        return;
      }
      if (target.id === 'sc-st-search') {
        stickerState.query = target.value;
        renderStickerDrawer();
        const input = root.querySelector('#sc-st-search');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
        return;
      }

      const page = activePage();
      if (!page) return;
      if (target.id === 'scripts-title-input') {
        page.title = target.value;
        const crumb = root.querySelector('.scripts-breadcrumb');
        if (crumb) crumb.textContent = (page.icon || '🦢') + ' ' + (page.title || 'script');
        const sideTitle = root.querySelector('.scripts-page-item.is-active .scripts-page-name');
        if (sideTitle) sideTitle.textContent = page.title || 'sem título';
        persist();
        return;
      }
      if (target.id === 'scripts-sub-input') {
        page.subtitle = target.value;
        persist();
        return;
      }
      if (target.id === 'scripts-doc-editor') {
        page.docHtml = target.innerHTML;
        persist();
        return;
      }

      const cardEl = target.closest('[data-card-id]');
      const card = cardEl && page.cards.find(function (c) { return c.id === cardEl.getAttribute('data-card-id'); });
      if (!card) return;
      if (target.classList.contains('sc-note-title')) card.title = target.value;
      else if (target.classList.contains('sc-note-body')) card.body = target.value;
      else if (target.classList.contains('sc-media-cap')) card.caption = target.value;
      else if (target.classList.contains('sc-todo-text')) {
        const row = target.closest('[data-todo-id]');
        const it = row && (card.items || []).find(function (x) { return x.id === row.getAttribute('data-todo-id'); });
        if (it) it.text = target.value;
      }
      persist();
    });

    root.addEventListener('change', function (event) {
      const target = event.target;
      if (target.id === 'scripts-photo-input' && target.files.length) {
        addMediaFiles(target.files, 'photo');
        target.value = '';
        return;
      }
      if (target.id === 'scripts-video-input' && target.files.length) {
        addMediaFiles(target.files, 'video');
        target.value = '';
        return;
      }
      if (target.id === 'scripts-audio-input' && target.files.length) {
        addMediaFiles(target.files, 'audio');
        target.value = '';
        return;
      }
      if (target.type === 'checkbox') {
        const page = activePage();
        const cardEl = target.closest('[data-card-id]');
        const row = target.closest('[data-todo-id]');
        const card = page && cardEl && page.cards.find(function (c) { return c.id === cardEl.getAttribute('data-card-id'); });
        const it = card && row && (card.items || []).find(function (x) { return x.id === row.getAttribute('data-todo-id'); });
        if (it) {
          it.done = target.checked;
          const textInput = row.querySelector('.sc-todo-text');
          if (textInput) textInput.classList.toggle('is-done', it.done);
          saveNow();
        }
      }
    });

    root.addEventListener('pointerdown', startPointerSession);
    window.addEventListener('pointermove', movePointerSession);
    window.addEventListener('pointerup', endPointerSession);

    root.addEventListener('dragover', function (event) {
      if (event.target.closest('#scripts-board')) {
        event.preventDefault();
      }
    });

    root.addEventListener('drop', function (event) {
      const board = event.target.closest('#scripts-board');
      if (!board || !event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
      event.preventDefault();
      const rect = board.getBoundingClientRect();
      addMediaFiles(event.dataTransfer.files, '', {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    });

    document.addEventListener('paste', function (event) {
      const pane = document.getElementById('tab-scripts');
      if (!pane || !pane.classList.contains('active')) return;
      const activeEl = document.activeElement;
      const inEditable = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      const items = event.clipboardData && event.clipboardData.items ? Array.from(event.clipboardData.items) : [];
      const imgItem = items.find(function (it) { return it.type && it.type.startsWith('image/'); });
      if (imgItem && !inEditable) {
        event.preventDefault();
        const file = imgItem.getAsFile();
        if (file) {
          addMediaFiles([file], 'photo');
          toast('foto colada no quadro');
        }
        return;
      }
      if (!inEditable) {
        const text = event.clipboardData && event.clipboardData.getData('text/plain');
        if (text && text.trim()) {
          event.preventDefault();
          addCardToActive({
            type: 'note',
            title: 'nota colada',
            body: text.trim(),
            w: 260,
            h: 175
          });
          toast('texto colado como nota');
        }
      }
    });
  }

  SMA.Scripts = {
    init: function () {
      if (initialized) return;
      root = document.getElementById('scripts-root');
      if (!root) return;
      initialized = true;
      loadState();
      render();
      bindEvents();
    }
  };
})();
