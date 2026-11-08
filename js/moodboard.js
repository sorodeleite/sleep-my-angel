(function () {
  const SMA = window.SMA;
  if (!SMA) return;

  const MAX_IMPORT_FILES = 240;
  const MAX_PIN_SIZE = 1600;

  let root = null;
  let observer = null;
  let menu = null;
  let lightbox = null;
  let busy = null;
  let nameResolve = null;
  let movingPin = null;
  let initialized = false;

  const state = {
    boards: [],
    folders: [],
    pins: [],
    view: 'shelf',
    boardId: null,
    folderId: null,
    filter: 'public',
    query: ''
  };

  /* ── helpers ───────────────────────────────────────────────────── */

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function now() {
    return Date.now();
  }

  function esc(value) {
    return SMA.escapeHTML(value == null ? '' : String(value));
  }

  function plural(count, singular, pluralForm) {
    return count + ' ' + (count === 1 ? singular : pluralForm);
  }

  function timeAgo(timestamp) {
    if (!timestamp) return '';
    const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return minutes + ' min';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' h';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + ' d';
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  }

  function httpUrl(value) {
    try {
      const url = new URL(String(value || ''));
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function lockIcon() {
    return '<span class="mood-lock" aria-label="oculta" title="oculta"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg></span>';
  }

  function deckle() {
    return '<span class="mood-spark" aria-hidden="true">✦</span>';
  }

  /* ── data ──────────────────────────────────────────────────────── */

  function boardById(id) {
    return state.boards.find(function (board) { return board.id === id; }) || null;
  }

  function folderById(id) {
    return state.folders.find(function (folder) { return folder.id === id; }) || null;
  }

  function pinById(id) {
    return state.pins.find(function (pin) { return pin.id === id; }) || null;
  }

  function boardFolders(boardId) {
    return state.folders
      .filter(function (folder) { return folder.boardId === boardId; })
      .sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'pt-BR'); });
  }

  function childFolders(boardId, parentId) {
    return boardFolders(boardId).filter(function (folder) {
      return (folder.parentId || null) === (parentId || null);
    });
  }

  function descendants(folderId) {
    const output = [];
    const walk = function (id, depth) {
      if (depth > 20) return;
      childFolders(state.boardId, id).forEach(function (folder) {
        output.push(folder);
        walk(folder.id, depth + 1);
      });
    };
    walk(folderId, 0);
    return output;
  }

  function chainTo(folderId) {
    const chain = [];
    let current = folderById(folderId);
    let guard = 0;
    while (current && guard < 20) {
      chain.unshift(current);
      current = current.parentId ? folderById(current.parentId) : null;
      guard += 1;
    }
    return chain;
  }

  function pinsDirect(boardId, folderId) {
    const target = folderId || null;
    return state.pins
      .filter(function (pin) {
        return pin.boardId === boardId && (pin.folderId || null) === target;
      })
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }

  function pinsUnder(boardId, folderId) {
    if (!folderId) {
      return state.pins
        .filter(function (pin) { return pin.boardId === boardId; })
        .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    }
    const ids = new Set([folderId]);
    descendants(folderId).forEach(function (folder) { ids.add(folder.id); });
    return state.pins
      .filter(function (pin) { return pin.boardId === boardId && ids.has(pin.folderId); })
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }

  function touchBoard(boardId) {
    const board = boardById(boardId);
    if (!board) return Promise.resolve();
    board.updatedAt = now();
    return SMA.moodStore.saveBoard(board);
  }

  async function refresh() {
    const loaded = await Promise.all([
      SMA.moodStore.boards(),
      SMA.moodStore.folders(),
      SMA.moodStore.pins()
    ]);
    state.boards = loaded[0];
    state.folders = loaded[1];
    state.pins = loaded[2];

    if (state.boardId && !boardById(state.boardId)) {
      state.view = 'shelf';
      state.boardId = null;
      state.folderId = null;
    }
    if (state.folderId && !folderById(state.folderId)) {
      state.folderId = null;
    }
  }

  /* ── render ────────────────────────────────────────────────────── */

  function render(options) {
    if (!root) return;
    const scroller = SMA.select('.tab-content-area');
    root.innerHTML = state.view === 'board' ? boardViewHtml() : shelfHtml();
    hydrateImages();
    if (options && options.top && scroller) {
      scroller.scrollTop = 0;
      requestAnimationFrame(function () {
        scroller.scrollTop = 0;
        setTimeout(function () { scroller.scrollTop = 0; }, 0);
      });
    }
  }

  function visibleBoards() {
    const query = state.query.trim().toLowerCase();
    return state.boards
      .slice()
      .sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); })
      .filter(function (board) {
        if (state.filter === 'private' && !board.private) return false;
        if (state.filter !== 'private' && board.private) return false;
        if (query && String(board.title).toLowerCase().indexOf(query) === -1) return false;
        return true;
      });
  }

  function shelfHtml() {
    const boards = state.boards;
    const privateCount = boards.filter(function (board) { return board.private; }).length;
    return ''
      + '<div class="mood-shell">'
      + '  <header class="mood-head">'
      + '    <div class="mood-heading">'
      + '      <h1 class="mood-title">moodboard ' + deckle() + '</h1>'
      + '      <p class="mood-sub">pastas do pinterest, referências e pequenos desejos ‧ seu cantinho de imagens</p>'
      + '    </div>'
      + '    <div class="mood-head-actions">'
      + '      <label class="mood-search" aria-label="procurar nas pastas">'
      + '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
      + '        <input type="search" id="mood-search" placeholder="procurar nas suas pastas" autocomplete="off" value="' + esc(state.query) + '">'
      + '      </label>'
      + '      <button class="mood-btn" type="button" data-mood-act="new-board">＋ nova pasta</button>'
      + '      <button class="mood-btn mood-btn-dark" type="button" data-mood-act="open-import">＋ importar</button>'
      + '    </div>'
      + '  </header>'
      + '  <div class="mood-bar">'
      + '    <div class="mood-chips">'
      + '      <button class="mood-chip' + (state.filter === 'public' ? ' active' : '') + '" type="button" data-mood-act="filter" data-filter="public">pastas</button>'
      + '      <button class="mood-chip' + (state.filter === 'private' ? ' active' : '') + '" type="button" data-mood-act="filter" data-filter="private">ocultas' + (privateCount ? ' ‧ ' + privateCount : '') + '</button>'
      + '    </div>'
      + '    <span class="mood-count" id="mood-shelf-count">' + plural(visibleBoards().length, 'pasta', 'pastas') + '</span>'
      + '  </div>'
      + '  <div class="mood-shelf" id="mood-shelf">' + shelfGridHtml() + '</div>'
      + '</div>';
  }

  function shelfGridHtml() {
    const boards = visibleBoards();
    if (!state.boards.length) {
      return ''
        + '<div class="mood-empty mood-empty-shelf">'
        + '  <span class="mood-empty-icon" aria-hidden="true">✧</span>'
        + '  <strong>seu moodboard ainda tá vazio</strong>'
        + '  <p>importe uma pasta pública do pinterest, uma pasta de imagens do computador ou comece criando do zero.</p>'
        + '  <div class="mood-empty-actions">'
        + '    <button class="mood-btn mood-btn-dark" type="button" data-mood-act="open-import">＋ importar do pinterest</button>'
        + '    <button class="mood-btn" type="button" data-mood-act="new-board">＋ criar pasta</button>'
        + '  </div>'
        + '</div>';
    }
    if (!boards.length) {
      const searching = Boolean(state.query.trim());
      if (searching) {
        return ''
          + '<div class="mood-empty mood-empty-shelf">'
          + '  <span class="mood-empty-icon" aria-hidden="true">☾</span>'
          + '  <strong>nada encontrado por aqui</strong>'
          + '  <p>tenta outro nome de pasta.</p>'
          + '  <div class="mood-empty-actions"><button class="mood-btn" type="button" data-mood-act="clear-search">limpar busca</button></div>'
          + '</div>';
      }
      if (state.filter === 'private') {
        return ''
          + '<div class="mood-empty mood-empty-shelf">'
          + '  <span class="mood-empty-icon" aria-hidden="true">☾</span>'
          + '  <strong>nenhuma pasta oculta ainda</strong>'
          + '  <p>quando você ocultar uma pasta, ela fica guardadinha aqui.</p>'
          + '  <div class="mood-empty-actions"><button class="mood-btn" type="button" data-mood-act="filter" data-filter="public">ver pastas</button></div>'
          + '</div>';
      }
      return ''
        + '<div class="mood-empty mood-empty-shelf">'
        + '  <span class="mood-empty-icon" aria-hidden="true">☾</span>'
        + '  <strong>suas pastas ocultas estão no cadeadinho</strong>'
        + '  <p>elas ficam escondidas da vista principal. toca em ocultas pra abrir.</p>'
        + '  <div class="mood-empty-actions"><button class="mood-btn" type="button" data-mood-act="filter" data-filter="private">ver ocultas</button></div>'
        + '</div>';
    }
    return boards.map(boardCardHtml).join('');
  }

  function boardCardHtml(board) {
    const pins = pinsUnder(board.id, null);
    const folders = boardFolders(board.id).length;
    return ''
      + '<article class="mood-board-card' + (board.private ? ' is-private' : '') + '" data-mood-act="open-board" data-id="' + esc(board.id) + '" role="button" tabindex="0">'
      + collageHtml(pins)
      + '  <div class="mood-card-info">'
      + '    <div class="mood-card-title"><span class="mood-card-name">' + esc(board.title) + '</span>' + (board.private ? lockIcon() : '') + '</div>'
      + '    <div class="mood-card-meta">' + plural(pins.length, 'pin', 'pins') + ' ‧ ' + plural(folders, 'subpasta', 'subpastas') + (board.updatedAt ? ' ‧ ' + timeAgo(board.updatedAt) : '') + '</div>'
      + '  </div>'
      + '  <button class="mood-card-more" type="button" data-mood-act="board-menu" data-id="' + esc(board.id) + '" aria-label="opções da pasta">⋯</button>'
      + '</article>';
  }

  function boardViewHtml() {
    const board = boardById(state.boardId);
    if (!board) return shelfHtml();
    const folder = state.folderId ? folderById(state.folderId) : null;
    const children = childFolders(board.id, state.folderId);
    const pins = pinsDirect(board.id, state.folderId);
    const under = pinsUnder(board.id, state.folderId);
    const chain = folder ? chainTo(folder.id) : [];
    const title = folder ? folder.title : board.title;
    const kicker = board.source === 'pinterest' ? 'pasta do pinterest' : board.source === 'local' ? 'pasta importada' : 'sua pasta';

    const crumbs = []
      .concat('<button class="mood-crumb" type="button" data-mood-act="go-shelf">moodboard</button>')
      .concat('<span class="mood-crumb-sep">/</span>')
      .concat('<button class="mood-crumb" type="button" data-mood-act="go-board" data-id="' + esc(board.id) + '">' + esc(board.title) + '</button>')
      .concat(chain.map(function (item, index) {
        const last = index === chain.length - 1;
        return '<span class="mood-crumb-sep">/</span>'
          + (last
            ? '<span class="mood-crumb is-current">' + esc(item.title) + '</span>'
            : '<button class="mood-crumb" type="button" data-mood-act="go-folder" data-id="' + esc(item.id) + '">' + esc(item.title) + '</button>');
      }))
      .join('');

    const folderCards = children.map(function (item) {
      const childPins = pinsUnder(board.id, item.id);
      const subfolders = childFolders(board.id, item.id).length;
      return ''
        + '<article class="mood-folder-card" data-mood-act="open-folder" data-id="' + esc(item.id) + '" role="button" tabindex="0">'
        + collageHtml(childPins)
        + '  <div class="mood-card-info">'
        + '    <div class="mood-card-title"><span class="mood-card-name">' + esc(item.title) + '</span></div>'
        + '    <div class="mood-card-meta">' + plural(childPins.length, 'pin', 'pins') + ' ‧ ' + plural(subfolders, 'subpasta', 'subpastas') + '</div>'
        + '  </div>'
        + '  <button class="mood-card-more" type="button" data-mood-act="folder-menu" data-id="' + esc(item.id) + '" aria-label="opções da subpasta">⋯</button>'
        + '</article>';
    }).join('');

    const pinCards = pins.map(pinCardHtml).join('');
    const emptyPins = children.length
      ? '<div class="mood-inline-empty">os pins estão nas subpastas acima ‧ toque numa pra abrir ☾</div>'
      : '<div class="mood-empty mood-empty-board">'
        + '  <span class="mood-empty-icon" aria-hidden="true">✦</span>'
        + '  <strong>essa pasta ainda tá vazia</strong>'
        + '  <p>arraste imagens pra cá, toque em ＋ imagens ou importe outra pasta do pinterest.</p>'
        + '  <div class="mood-empty-actions">'
        + '    <button class="mood-btn mood-btn-dark" type="button" data-mood-act="add-images">＋ imagens</button>'
        + '    <button class="mood-btn" type="button" data-mood-act="new-folder">＋ subpasta</button>'
        + '  </div>'
        + '</div>';

    return ''
      + '<div class="mood-shell mood-shell-board">'
      + '  <div class="mood-board-head">'
      + '    <button class="mood-icon-btn mood-back" type="button" data-mood-act="back" aria-label="voltar">'
      + '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>'
      + '    </button>'
      + '    <div class="mood-board-heading">'
      + '      <nav class="mood-crumbs" aria-label="caminho">' + crumbs + '</nav>'
      + '      <h1 class="mood-board-title">' + esc(title) + ' ' + deckle() + (board.private ? '<span class="mood-private-pill">oculta</span>' : '') + '</h1>'
      + '      <p class="mood-board-meta">' + esc(kicker) + ' ‧ ' + plural(under.length, 'pin', 'pins') + ' ‧ ' + plural(boardFolders(board.id).length, 'subpasta', 'subpastas') + ' ‧ atualizada ' + timeAgo(board.updatedAt) + '</p>'
      + '    </div>'
      + '    <div class="mood-board-actions">'
      + '      <button class="mood-btn" type="button" data-mood-act="add-images">＋ imagens</button>'
      + '      <button class="mood-btn" type="button" data-mood-act="new-folder">＋ subpasta</button>'
      + '      <button class="mood-icon-btn" type="button" data-mood-act="board-menu" data-id="' + esc(board.id) + '" aria-label="opções da pasta">⋯</button>'
      + '    </div>'
      + '  </div>'
      + (children.length
        ? '  <section class="mood-section"><div class="mood-section-head"><h2>subpastas</h2><span>' + children.length + '</span></div><div class="mood-folder-grid">' + folderCards + '</div></section>'
        : '')
      + '  <section class="mood-section">'
      + '    <div class="mood-section-head"><h2>' + (folder ? 'pins desta pasta' : 'seus pins') + '</h2><span>' + pins.length + '</span></div>'
      + (pins.length ? '<div class="mood-pin-grid">' + pinCards + '</div>' : emptyPins)
      + '  </section>'
      + '  <div class="mood-drop-hint">arraste imagens pra cá pra guardar' + (folder ? ' em “' + esc(folder.title) + '”' : '') + ' ‧°✧</div>'
      + '</div>';
  }

  function collageHtml(pins) {
    const chosen = pins.slice(0, 3);
    if (!chosen.length) {
      return '<div class="mood-collage is-empty"><span aria-hidden="true">☾</span></div>';
    }
    return '<div class="mood-collage mood-collage-' + chosen.length + '">' + chosen.map(function (pin) {
      return '<div class="mood-cover"><img data-mood-pin="' + esc(pin.id) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>';
    }).join('') + '</div>';
  }

  function pinCardHtml(pin) {
    const ratio = pin.width && pin.height ? ' style="aspect-ratio:' + Number(pin.width) + '/' + Number(pin.height) + '"' : '';
    return ''
      + '<figure class="mood-pin" data-mood-act="pin-open" data-id="' + esc(pin.id) + '" tabindex="0" role="button" aria-label="' + esc(pin.title || 'abrir pin') + '">'
      + '  <img data-mood-pin="' + esc(pin.id) + '" alt="' + esc(pin.title || '') + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"' + ratio + '>'
      + '  <figcaption class="mood-pin-veil">'
      + '    <span class="mood-pin-name">' + esc(pin.title || '') + '</span>'
      + '    <button class="mood-pin-more" type="button" data-mood-act="pin-menu" data-id="' + esc(pin.id) + '" aria-label="opções do pin">⋯</button>'
      + '  </figcaption>'
      + '</figure>';
  }

  /* ── lazy images ───────────────────────────────────────────────── */

  function hydrateImages() {
    if (!root) return;
    const images = SMA.selectAll('img[data-mood-pin]', root);
    if (!('IntersectionObserver' in window)) {
      images.forEach(loadPinImage);
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          loadPinImage(entry.target);
        });
      }, { rootMargin: '420px 0px' });
    }
    observer.disconnect();
    images.forEach(function (image) { observer.observe(image); });
  }

  function loadPinImage(image) {
    if (!image || image.dataset.loaded === '1') return;
    image.dataset.loaded = '1';
    const pin = pinById(image.dataset.moodPin);
    if (!pin) return;
    SMA.moodStore.pinUrl(pin).then(function (url) {
      if (!url || !image.isConnected) {
        markMissing(image);
        return;
      }
      image.addEventListener('load', function () { image.classList.add('is-loaded'); }, { once: true });
      image.addEventListener('error', function () { markMissing(image); }, { once: true });
      image.src = url;
    }).catch(function () {
      markMissing(image);
    });
  }

  function markMissing(image) {
    image.classList.add('is-missing');
    const holder = image.closest('.mood-pin, .mood-cover, .mood-folder-card');
    if (holder) holder.classList.add('is-missing');
  }

  /* ── actions ───────────────────────────────────────────────────── */

  function openShelf() {
    state.view = 'shelf';
    state.boardId = null;
    state.folderId = null;
    state.query = '';
    render({ top: true });
  }

  function openBoard(id) {
    const board = boardById(id);
    if (!board) return;
    state.view = 'board';
    state.boardId = board.id;
    state.folderId = null;
    render({ top: true });
  }

  function openFolder(id) {
    const folder = folderById(id);
    if (!folder) return;
    state.boardId = folder.boardId;
    state.folderId = folder.id;
    state.view = 'board';
    render({ top: true });
  }

  function goBack() {
    if (!state.boardId) {
      openShelf();
      return;
    }
    if (state.folderId) {
      const folder = folderById(state.folderId);
      state.folderId = folder && folder.parentId ? folder.parentId : null;
      render({ top: true });
      return;
    }
    openShelf();
  }

  async function createBoard(title, source) {
    const board = {
      id: uid('board'),
      title: String(title || 'nova pasta').trim().slice(0, 80) || 'nova pasta',
      private: false,
      source: source || 'manual',
      sourceKey: '',
      createdAt: now(),
      updatedAt: now()
    };
    await SMA.moodStore.saveBoard(board);
    return board;
  }

  async function createFolder(boardId, parentId, title) {
    const folder = {
      id: uid('folder'),
      boardId: boardId,
      parentId: parentId || null,
      title: String(title || 'nova subpasta').trim().slice(0, 80) || 'nova subpasta',
      createdAt: now(),
      updatedAt: now()
    };
    await SMA.moodStore.saveFolder(folder);
    return folder;
  }

  function askNewBoard() {
    askName({
      title: 'nova pasta',
      subtitle: 'um nome bem seu pra esse cantinho de imagens.',
      value: '',
      placeholder: 'ex: & foreveryoung, room, nails…',
      confirm: 'criar pasta'
    }).then(async function (name) {
      if (!name) return;
      const board = await createBoard(name, 'manual');
      await refresh();
      openBoard(board.id);
      SMA.toast('pasta criada ‧°✧');
    });
  }

  function askNewFolder() {
    const board = boardById(state.boardId);
    if (!board) return;
    const current = state.folderId ? folderById(state.folderId) : null;
    askName({
      title: 'nova subpasta',
      subtitle: current ? 'ela vai ficar dentro de “' + current.title + '”.' : 'ela vai ficar dentro de “' + board.title + '”.',
      value: '',
      placeholder: 'ex: unhas, pilotis, pinterest finds…',
      confirm: 'criar subpasta'
    }).then(async function (name) {
      if (!name) return;
      const folder = await createFolder(board.id, state.folderId, name);
      await touchBoard(board.id);
      await refresh();
      openFolder(folder.id);
      SMA.toast('subpasta criada ✧');
    });
  }

  function renameBoard(board) {
    askName({
      title: 'renomear pasta',
      value: board.title,
      confirm: 'salvar'
    }).then(async function (name) {
      if (!name) return;
      board.title = name.slice(0, 80);
      board.updatedAt = now();
      await SMA.moodStore.saveBoard(board);
      await refresh();
      render();
    });
  }

  function renameFolder(folder) {
    askName({
      title: 'renomear subpasta',
      value: folder.title,
      confirm: 'salvar'
    }).then(async function (name) {
      if (!name) return;
      folder.title = name.slice(0, 80);
      folder.updatedAt = now();
      await SMA.moodStore.saveFolder(folder);
      await touchBoard(folder.boardId);
      await refresh();
      render();
    });
  }

  async function togglePrivate(board) {
    board.private = !board.private;
    board.updatedAt = now();
    state.filter = board.private ? 'private' : 'public';
    await SMA.moodStore.saveBoard(board);
    await refresh();
    render();
    SMA.toast(board.private ? 'pasta oculta ‧ ela fica no cantinho das ocultas' : 'pasta visível ‧°✧');
  }

  async function deleteBoard(board) {
    if (!window.confirm('apagar a pasta "' + board.title + '"? as imagens e subpastas vão junto.')) return;
    closeLightbox();
    await SMA.moodStore.removeMany(board.id);
    if (state.boardId === board.id) openShelf();
    await refresh();
    render();
    SMA.toast('pasta apagada');
  }

  async function deleteFolder(folder) {
    if (!window.confirm('apagar a subpasta "' + folder.title + '"? as imagens dentro dela também vão.')) return;
    const all = [folder].concat(descendants(folder.id));
    const ids = new Set(all.map(function (item) { return item.id; }));
    const pins = state.pins.filter(function (pin) { return ids.has(pin.folderId); });
    await Promise.all(pins.map(async function (pin) {
      await SMA.moodStore.removeImage(pin.id);
      await SMA.moodStore.removePin(pin.id);
    }));
    await Promise.all(all.map(function (item) { return SMA.moodStore.removeFolder(item.id); }));
    if (state.folderId && ids.has(state.folderId)) {
      state.folderId = folder.parentId || null;
    }
    await touchBoard(folder.boardId);
    await refresh();
    render();
    SMA.toast('subpasta apagada');
  }

  async function deletePin(pin) {
    if (!window.confirm('apagar esse pin? ele vai sumir da pasta.')) return;
    closeLightbox();
    await SMA.moodStore.removeImage(pin.id);
    await SMA.moodStore.removePin(pin.id);
    await refresh();
    render();
    SMA.toast('pin apagado');
  }

  function movePin(pin) {
    movingPin = pin;
    const board = boardById(pin.boardId);
    if (!board) return;
    const modal = document.getElementById('modal-mood-move');
    const title = document.getElementById('mood-move-title');
    const select = document.getElementById('mood-move-select');
    if (!modal || !select) return;
    if (title) title.textContent = 'mover “' + (pin.title || 'pin') + '”';
    const options = ['<option value="">raiz de ' + esc(board.title) + '</option>'];
    const walk = function (parentId, depth) {
      childFolders(board.id, parentId).forEach(function (folder) {
        options.push('<option value="' + esc(folder.id) + '">' + '— '.repeat(depth) + esc(folder.title) + '</option>');
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 0);
    select.innerHTML = options.join('');
    select.value = pin.folderId || '';
    modal.classList.add('open');
  }

  async function savePinMove() {
    const select = document.getElementById('mood-move-select');
    if (!movingPin || !select) return;
    movingPin.folderId = select.value || null;
    movingPin.updatedAt = now();
    await SMA.moodStore.savePin(movingPin);
    await touchBoard(movingPin.boardId);
    document.getElementById('modal-mood-move').classList.remove('open');
    movingPin = null;
    await refresh();
    render();
    SMA.toast('pin movido ✧');
  }

  /* ── menu ──────────────────────────────────────────────────────── */

  function closeMenu() {
    if (menu) {
      menu.remove();
      menu = null;
    }
  }

  function openMenu(anchor, items) {
    closeMenu();
    if (!anchor) return;
    menu = document.createElement('div');
    menu.className = 'mood-menu';
    menu.setAttribute('role', 'menu');
    items.forEach(function (item) {
      if (!item) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mood-menu-item' + (item.danger ? ' is-danger' : '');
      button.textContent = item.label;
      button.addEventListener('click', function () {
        closeMenu();
        item.run();
      });
      menu.appendChild(button);
    });
    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    const width = menu.offsetWidth || 184;
    const height = menu.offsetHeight || 120;
    let left = rect.right - width;
    left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 10) top = Math.max(10, rect.top - height - 6);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    setTimeout(function () {
      document.addEventListener('pointerdown', onMenuOutside, true);
      document.addEventListener('keydown', onMenuKey, true);
    }, 0);
  }

  function onMenuOutside(event) {
    if (menu && !menu.contains(event.target)) closeMenu();
  }

  function onMenuKey(event) {
    if (event.key === 'Escape') closeMenu();
  }

  function removeMenuListeners() {
    document.removeEventListener('pointerdown', onMenuOutside, true);
    document.removeEventListener('keydown', onMenuKey, true);
  }

  function boardMenu(anchor, board) {
    openMenu(anchor, [
      { label: 'abrir pasta', run: function () { openBoard(board.id); } },
      { label: 'renomear', run: function () { renameBoard(board); } },
      { label: 'importar pasta…', run: function () { openImportModal('folder'); } },
      { label: board.private ? 'mostrar pasta' : 'ocultar pasta', run: function () { togglePrivate(board); } },
      { label: 'apagar pasta', danger: true, run: function () { deleteBoard(board); } }
    ]);
  }

  function folderMenu(anchor, folder) {
    openMenu(anchor, [
      { label: 'abrir subpasta', run: function () { openFolder(folder.id); } },
      { label: 'renomear', run: function () { renameFolder(folder); } },
      { label: 'apagar subpasta', danger: true, run: function () { deleteFolder(folder); } }
    ]);
  }

  function pinMenu(anchor, pin) {
    openMenu(anchor, [
      { label: 'ver grande', run: function () { openLightbox(pin); } },
      { label: 'mover pra…', run: function () { movePin(pin); } },
      pin.sourceUrl ? { label: 'abrir no pinterest', run: function () { window.open(pin.sourceUrl, '_blank', 'noopener'); } } : null,
      { label: 'apagar pin', danger: true, run: function () { deletePin(pin); } }
    ].filter(Boolean));
  }

  /* ── lightbox ──────────────────────────────────────────────────── */

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.remove();
    lightbox = null;
  }

  function openLightbox(pin) {
    closeLightbox();
    lightbox = document.createElement('div');
    lightbox.className = 'mood-lightbox';
    lightbox.innerHTML = ''
      + '<button class="mood-lightbox-close" type="button" aria-label="fechar">×</button>'
      + '<figure class="mood-lightbox-figure"><img alt="' + esc(pin.title || '') + '" referrerpolicy="no-referrer"></figure>'
      + '<div class="mood-lightbox-bar">'
      + '  <span class="mood-lightbox-title">' + esc(pin.title || 'sem título') + '</span>'
      + '  <div class="mood-lightbox-actions">'
      + (pin.sourceUrl ? '<a class="mood-lightbox-link" href="' + esc(pin.sourceUrl) + '" target="_blank" rel="noopener">abrir no pinterest</a>' : '')
      + '    <button class="mood-lightbox-btn" type="button" data-light="move">mover</button>'
      + '    <button class="mood-lightbox-btn is-danger" type="button" data-light="delete">apagar</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(lightbox);

    const image = lightbox.querySelector('img');
    SMA.moodStore.pinUrl(pin).then(function (url) {
      if (url) image.src = url;
    });

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.querySelector('.mood-lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelectorAll('[data-light]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.dataset.light === 'move') {
          closeLightbox();
          movePin(pin);
        }
        if (button.dataset.light === 'delete') deletePin(pin);
      });
    });
  }

  /* ── import modal ──────────────────────────────────────────────── */

  function importModalOpen() {
    const modal = document.getElementById('modal-mood-import');
    return Boolean(modal && modal.classList.contains('open'));
  }

  function openImportModal(tab) {
    const modal = document.getElementById('modal-mood-import');
    if (!modal) return;
    modal.classList.add('open');
    setStatus('', '');
    const chosen = tab === 'folder' || tab === 'images' ? tab : 'pinterest';
    setImportTab(chosen);
    updateImportTarget();
    if (chosen !== 'pinterest') return;
    const input = document.getElementById('mood-pinterest-url');
    if (input) setTimeout(function () { input.focus(); }, 60);
  }

  function closeImportModal() {
    const modal = document.getElementById('modal-mood-import');
    if (modal) modal.classList.remove('open');
    setStatus('', '');
  }

  function setImportTab(name) {
    SMA.selectAll('[data-mood-import-tab]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.moodImportTab === name);
    });
    SMA.selectAll('[data-mood-panel]').forEach(function (panel) {
      panel.hidden = panel.dataset.moodPanel !== name;
    });
    updateImportTarget();
  }

  function updateImportTarget() {
    const label = document.getElementById('mood-import-target');
    if (!label) return;
    if (!state.boardId) {
      label.textContent = 'vai criar uma pasta nova';
      return;
    }
    const board = boardById(state.boardId);
    const folder = state.folderId ? folderById(state.folderId) : null;
    label.textContent = 'vai guardar em ' + (folder ? board.title + ' / ' + folder.title : board.title);
  }

  function setStatus(text, tone, progress) {
    const box = document.getElementById('mood-import-status');
    if (!box) return;
    if (!text) {
      box.hidden = true;
      box.className = 'mood-import-status';
      return;
    }
    box.hidden = false;
    box.className = 'mood-import-status' + (tone ? ' is-' + tone : '');
    box.classList.toggle('is-busy', progress == null && !tone);
    const textEl = box.querySelector('.mood-import-status-text');
    if (textEl) textEl.textContent = text;
    const bar = document.getElementById('mood-import-bar');
    if (bar) bar.style.width = progress == null ? '0%' : Math.round(Math.max(0, Math.min(1, progress)) * 100) + '%';
  }

  function setBusy(text) {
    if (!text) {
      if (busy) {
        busy.remove();
        busy = null;
      }
      return;
    }
    if (!busy) {
      busy = document.createElement('div');
      busy.className = 'mood-busy';
      busy.innerHTML = '<span class="mood-spinner" aria-hidden="true"></span><span class="mood-busy-text"></span>';
      busy.setAttribute('role', 'status');
      document.body.appendChild(busy);
    }
    const label = busy.querySelector('.mood-busy-text');
    if (label) label.textContent = text;
  }

  function report(text, progress) {
    if (importModalOpen()) {
      setStatus(text, '', progress);
    } else {
      setBusy(text);
    }
  }

  function finishReport() {
    setBusy('');
  }

  /* ── pinterest ─────────────────────────────────────────────────── */

  function normalizePinterestUrl(value) {
    let raw = String(value || '').trim();
    if (!raw) throw new Error('cola o link da sua pasta do pinterest primeiro.');
    const embedded = raw.match(/https?:\/\/[^\s<>"']+/i);
    if (embedded) raw = embedded[0];
    raw = raw.replace(/[)\].,;!?]+$/, '');
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    let url;
    try {
      url = new URL(raw);
    } catch (error) {
      throw new Error('esse link não parece um endereço do pinterest.');
    }
    const host = url.hostname.toLowerCase();

    if (/(^|\.)pin\.it$/.test(host)) {
      const code = url.pathname.split('/').filter(Boolean)[0];
      if (!code) throw new Error('esse link pin.it veio sem código. copia de novo lá no pinterest.');
      return {
        url: 'https://pin.it/' + code,
        key: 'short:' + code.toLowerCase(),
        short: true
      };
    }

    if (host === 'api.pinterest.com' && url.pathname.indexOf('/url_shortener/') === 0) {
      const match = url.pathname.match(/^\/url_shortener\/([^/]+)\/redirect\/?$/);
      if (!match) throw new Error('esse link curto do pinterest veio incompleto. copia de novo.');
      return {
        url: 'https://api.pinterest.com/url_shortener/' + match[1] + '/redirect/',
        key: 'short:' + match[1].toLowerCase(),
        short: true
      };
    }

    if (!/(^|\.)pinterest\.com$/i.test(host)) {
      throw new Error('por enquanto eu só abro links do pinterest.');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2 || /^pin$/i.test(parts[0]) || /^(ideas|search|today)$/i.test(parts[0])) {
      throw new Error('esse link é de um pin. pra importar a pasta inteira, abre a pasta e copia o link que aparece com o nome dela.');
    }
    const boardSlug = parts[1].replace(/\.rss$/i, '');
    return {
      url: 'https://www.pinterest.com/' + parts[0] + '/' + boardSlug + '/',
      key: 'pinterest:' + parts[0].toLowerCase() + '/' + boardSlug.toLowerCase(),
      short: false
    };
  }

  async function fetchText(url, timeout) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, timeout || 15000) : null;
    try {
      const response = await fetch(url, {
        credentials: 'omit',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) throw new Error('status ' + response.status);
      const text = await response.text();
      if (!text || text.length < 400) throw new Error('resposta vazia');
      return text;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function looksLikePinterest(text) {
    return text.indexOf('__PWS_INITIAL_PROPS__') !== -1
      || /<rss[\s>]/i.test(text)
      || text.indexOf('i.pinimg.com') !== -1;
  }

  async function fetchPinterestText(url) {
    if (window.api && typeof window.api.fetchPinterest === 'function') {
      const result = await window.api.fetchPinterest(url);
      if (result && result.text && looksLikePinterest(result.text)) return result.text;
      throw new Error((result && result.error) || 'o pinterest não devolveu a página dessa pasta.');
    }

    try {
      const direct = await fetchText(url, 10000);
      if (looksLikePinterest(direct)) return direct;
    } catch (error) {
      // o navegador costuma barrar o pinterest por cors ‧ tentamos pelos atalhos abaixo
    }

    const proxies = [
      function (target) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target); },
      function (target) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(target); },
      function (target) { return 'https://corsproxy.io/?url=' + encodeURIComponent(target); }
    ];
    for (const proxy of proxies) {
      try {
        const text = await fetchText(proxy(url), 18000);
        if (looksLikePinterest(text)) return text;
      } catch (error) {
        // tenta o próximo atalho
      }
    }
    throw new Error('o pinterest bloqueou a leitura automática aqui. tenta de novo, importa uma pasta de imagens ou usa o app do computador.');
  }

  function metaContent(html, property) {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp('<meta[^>]+(?:property|name)=["\']' + escaped + '["\'][^>]*content=["\']([^"\']*)["\']', 'i'),
      new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + escaped + '["\']', 'i')
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return SMA.decodeEntities(match[1]);
    }
    return '';
  }

  function scriptJson(html, id) {
    const pattern = new RegExp('<script[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/script>', 'i');
    const match = html.match(pattern);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      return null;
    }
  }

  function cleanTitle(value) {
    return String(value || '')
      .replace(/\s*[|·]\s*Pinterest\s*$/i, '')
      .replace(/\s*\(\d[\d,.]*\s*pins?\)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleFromSlug(slug) {
    let value = slug;
    try { value = decodeURIComponent(slug); } catch (error) { value = slug; }
    value = value.replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'pasta do pinterest';
  }

  function boardPathFromUrl(value) {
    let raw = String(value || '');
    try {
      if (/^https?:/i.test(raw)) raw = new URL(raw).pathname;
    } catch (error) {
      return '';
    }
    raw = raw.split('?')[0].replace(/\/+$/, '');
    if (!/^\/[^/]+\/[^/]+$/.test(raw)) return '';
    return raw + '/';
  }

  function mapPinterestPin(pin) {
    if (!pin || !pin.id) return null;
    const images = pin.images || {};
    const best = images['736x'] || images['474x'] || images['orig'] || images['236x'];
    const image = httpUrl(best && best.url);
    if (!image) return null;
    return {
      key: 'pinterest:' + pin.id,
      title: cleanTitle(pin.title || pin.grid_title || ''),
      imageUrl: image,
      sourceUrl: 'https://www.pinterest.com/pin/' + pin.id + '/',
      width: Number(best.width) || 0,
      height: Number(best.height) || 0
    };
  }

  function parseBoardPage(html, normalized) {
    const props = scriptJson(html, '__PWS_INITIAL_PROPS__');
    let board = null;
    let pins = [];
    let boardPath = '';
    if (props && props.initialReduxState) {
      const data = props.initialReduxState;
      const boards = data.boards ? Object.keys(data.boards).map(function (key) { return data.boards[key]; }) : [];
      const wanted = normalized.url.replace(/\/$/, '').toLowerCase();
      board = boards.find(function (item) {
        if (!item || !item.url) return false;
        const candidate = String(item.url).replace(/\/$/, '').toLowerCase();
        return candidate === wanted || wanted.indexOf(candidate) === wanted.length - candidate.length;
      }) || boards[0] || null;
      const sourcePins = data.pins || {};
      if (board) {
        const feed = data.feeds && data.feeds['boardfeed:' + board.id] ? data.feeds['boardfeed:' + board.id] : [];
        feed.forEach(function (item) {
          if (!item || item.type !== 'pin') return;
          const mapped = mapPinterestPin(sourcePins[item.id]);
          if (mapped) pins.push(mapped);
        });
        if (!pins.length) {
          Object.keys(sourcePins).forEach(function (key) {
            const mapped = mapPinterestPin(sourcePins[key]);
            if (mapped) pins.push(mapped);
          });
        }
        boardPath = boardPathFromUrl(board.url);
      }
    }

    const title = cleanTitle((board && board.name) || metaContent(html, 'og:title') || '');
    const description = cleanTitle((board && board.description) || metaContent(html, 'og:description') || '');
    const fallbackTitle = boardPath
      ? titleFromSlug(boardPath.split('/').filter(Boolean).pop())
      : (normalized.short ? 'pasta do pinterest' : titleFromSlug(normalized.key.split('/').pop()));
    const unique = [];
    const seen = new Set();
    pins.forEach(function (pin) {
      if (seen.has(pin.key)) return;
      seen.add(pin.key);
      unique.push(pin);
    });
    return {
      title: title || fallbackTitle,
      description: description,
      pins: unique,
      boardPath: boardPath
    };
  }

  function parseBoardRss(xml, normalized) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('o feed dessa pasta veio quebrado.');
    }
    const channel = doc.querySelector('channel');
    const title = channel ? cleanTitle(channel.querySelector('title') ? channel.querySelector('title').textContent : '') : '';
    const channelLink = channel && channel.querySelector('link') ? channel.querySelector('link').textContent.trim() : '';
    const boardPath = boardPathFromUrl(channelLink);
    const fallbackTitle = boardPath
      ? titleFromSlug(boardPath.split('/').filter(Boolean).pop())
      : (normalized.short ? 'pasta do pinterest' : titleFromSlug(normalized.key.split('/').pop()));
    const pins = [];
    const seen = new Set();
    SMA.selectAll('item', doc).forEach(function (item) {
      const link = item.querySelector('link') ? item.querySelector('link').textContent.trim() : '';
      const description = item.querySelector('description') ? item.querySelector('description').textContent : '';
      const imageMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i) || description.match(/https:\/\/i\.pinimg\.com\/[^"'\s<]+/i);
      if (!imageMatch) return;
      let image = httpUrl(SMA.decodeEntities(imageMatch[1] || imageMatch[0]));
      if (!image) return;
      image = image.replace(/\/236x\//, '/736x/').replace(/\/474x\//, '/736x/');
      const idMatch = link.match(/\/pin\/([^/]+)/);
      const key = idMatch ? 'pinterest:' + idMatch[1] : 'pinterest:' + image;
      if (seen.has(key)) return;
      seen.add(key);
      const itemTitle = item.querySelector('title') ? cleanTitle(item.querySelector('title').textContent) : '';
      pins.push({
        key: key,
        title: itemTitle,
        imageUrl: image,
        sourceUrl: httpUrl(link) || '',
        width: 0,
        height: 0
      });
    });
    return {
      title: title || fallbackTitle,
      description: '',
      pins: pins,
      boardPath: boardPath
    };
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl || '').split(',');
    const meta = parts[0] || '';
    const payload = parts[1] || '';
    const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    try {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return new Blob([bytes], { type: mime });
    } catch (error) {
      return null;
    }
  }

  async function downloadPinterestImage(url) {
    const safe = httpUrl(url);
    if (!safe) return null;
    if (window.api && typeof window.api.fetchPinterestImage === 'function') {
      try {
        const result = await window.api.fetchPinterestImage(safe);
        if (result && result.dataUrl) {
          const blob = dataUrlToBlob(result.dataUrl);
          if (blob && blob.size) return blob;
        }
      } catch (error) {
        // tenta pelo fetch normal abaixo
      }
    }
    try {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;
      try {
        const response = await fetch(safe, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
          signal: controller ? controller.signal : undefined
        });
        if (!response.ok) return null;
        const blob = await response.blob();
        return blob && blob.size ? blob : null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch (error) {
      return null;
    }
  }

  async function insertPinterestPin(boardId, folderId, sourcePin, blob) {
    const pin = {
      id: uid('pin'),
      boardId: boardId,
      folderId: folderId || null,
      title: sourcePin.title || '',
      key: sourcePin.key,
      source: 'pinterest',
      sourceUrl: sourcePin.sourceUrl || '',
      width: Number(sourcePin.width) || 0,
      height: Number(sourcePin.height) || 0,
      hasImage: false,
      remoteUrl: '',
      createdAt: now(),
      updatedAt: now()
    };
    let compressed = null;
    if (blob) {
      compressed = await compressImage(blob, MAX_PIN_SIZE);
    }
    if (compressed) {
      pin.width = compressed.width;
      pin.height = compressed.height;
      pin.hasImage = true;
    } else {
      pin.remoteUrl = sourcePin.imageUrl || '';
      if (!pin.remoteUrl) return false;
    }
    await SMA.moodStore.savePin(pin);
    if (compressed) await SMA.moodStore.putImage(pin.id, compressed.blob);
    return true;
  }

  async function runPinterestImport(rawUrl) {
    let normalized;
    try {
      normalized = normalizePinterestUrl(rawUrl);
    } catch (error) {
      setStatus(error.message, 'error', 1);
      return;
    }

    const button = document.getElementById('mood-pinterest-go');
    const input = document.getElementById('mood-pinterest-url');
    if (button) button.disabled = true;
    if (input) input.blur();
    setStatus('abrindo a pasta no pinterest…', '', null);

    try {
      let parsed = null;
      let html = '';
      try {
        html = await fetchPinterestText(normalized.url);
        parsed = parseBoardPage(html, normalized);
      } catch (error) {
        parsed = null;
      }

      if (!normalized.short && (!parsed || !parsed.pins.length)) {
        setStatus('procurando os pins pelo feed da pasta…', '', null);
        try {
          const rss = await fetchPinterestText(normalized.url.replace(/\/$/, '') + '.rss');
          parsed = parseBoardRss(rss, normalized);
        } catch (error) {
          if (!parsed) throw error;
        }
      }

      if (!parsed || !parsed.pins.length) {
        if (normalized.short) {
          throw new Error('não achei uma pasta nesse link curto. no celular, abre a pasta no pinterest (não um pin) → ⋯ → compartilhar → copiar link, e cola aqui. o pin.it da pasta funciona.');
        }
        throw new Error('não achei pins nessa pasta. confere se ela é pública e se o link é o da pasta, não o do perfil.');
      }

      const boardPath = parsed.boardPath || (!normalized.short ? normalized.key.replace(/^pinterest:/, '') : '');
      const sourceKey = boardPath
        ? 'pinterest:' + boardPath.replace(/^\/+|\/+$/g, '').toLowerCase()
        : normalized.key;

      const privateBox = document.getElementById('mood-import-private');
      const makePrivate = Boolean(privateBox && privateBox.checked);
      let board = state.boards.find(function (item) { return item.sourceKey === sourceKey; }) || null;
      if (!board) {
        board = {
          id: uid('board'),
          title: parsed.title || 'pasta do pinterest',
          private: makePrivate,
          source: 'pinterest',
          sourceKey: sourceKey,
          createdAt: now(),
          updatedAt: now()
        };
        await SMA.moodStore.saveBoard(board);
      } else {
        board.updatedAt = now();
        await SMA.moodStore.saveBoard(board);
      }

      const existing = new Set(state.pins
        .filter(function (pin) { return pin.boardId === board.id; })
        .map(function (pin) { return pin.key; }));
      const fresh = parsed.pins.filter(function (pin) { return !existing.has(pin.key); });
      let saved = 0;
      let offline = 0;
      let remote = 0;

      for (let index = 0; index < fresh.length; index += 1) {
        const sourcePin = fresh[index];
        setStatus('guardando ' + (index + 1) + ' de ' + fresh.length + ' fotos…', '', index / Math.max(1, fresh.length));
        const blob = await downloadPinterestImage(sourcePin.imageUrl);
        const ok = await insertPinterestPin(board.id, null, sourcePin, blob);
        if (ok) {
          saved += 1;
          if (blob) offline += 1; else remote += 1;
        }
      }

      await touchBoard(board.id);
      await refresh();
      state.filter = board.private ? 'private' : 'public';
      closeImportModal();
      openBoard(board.id);

      if (saved) {
        let message = plural(saved, 'pin novo', 'pins novos') + ' ‧°✧';
        if (remote) message += ' (' + remote + ' só aparece com internet)';
        SMA.toast(message);
      } else {
        SMA.toast('essa pasta já tava em dia ‧ nenhum pin novo');
      }
    } catch (error) {
      await refresh();
      setStatus(error && error.message ? error.message : 'não consegui importar essa pasta agora.', 'error', 1);
    } finally {
      if (button) button.disabled = false;
    }
  }

  /* ── uploads ───────────────────────────────────────────────────── */

  function imageFilesFrom(list) {
    return Array.prototype.slice.call(list || [])
      .filter(function (file) {
        return file && (file.type.indexOf('image/') === 0 || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name));
      })
      .slice(0, MAX_IMPORT_FILES);
  }

  function imageKey(file) {
    return 'file:' + (file.webkitRelativePath || file.name) + ':' + file.size;
  }

  async function saveLocalPin(boardId, folderId, file, key, title) {
    const compressed = await compressImage(file, MAX_PIN_SIZE);
    if (!compressed) return false;
    const pin = {
      id: uid('pin'),
      boardId: boardId,
      folderId: folderId || null,
      title: title || '',
      key: key,
      source: 'local',
      sourceUrl: '',
      width: compressed.width,
      height: compressed.height,
      hasImage: true,
      remoteUrl: '',
      createdAt: now(),
      updatedAt: now()
    };
    await SMA.moodStore.savePin(pin);
    await SMA.moodStore.putImage(pin.id, compressed.blob);
    return true;
  }

  async function importLooseImages(files) {
    const images = imageFilesFrom(files);
    if (!images.length) {
      if (importModalOpen()) setStatus('não achei imagens nesses arquivos.', 'error', 1);
      else SMA.toast('não achei imagens nesses arquivos');
      return;
    }

    let boardId = state.boardId;
    let folderId = state.folderId;
    let created = false;

    if (!boardId) {
      closeImportModal();
      const name = await askName({
        title: 'nova pasta de imagens',
        subtitle: 'escolhe um nome pra guardar essas imagens.',
        value: 'novos pins',
        confirm: 'criar pasta'
      });
      if (!name) return;
      const board = await createBoard(name, 'local');
      boardId = board.id;
      folderId = null;
      created = true;
    }

    const existing = new Set(state.pins
      .filter(function (pin) { return pin.boardId === boardId; })
      .map(function (pin) { return pin.key; }));
    let saved = 0;
    for (let index = 0; index < images.length; index += 1) {
      const file = images[index];
      report('guardando ' + (index + 1) + ' de ' + images.length + ' imagens…', (index + 1) / images.length);
      const key = imageKey(file);
      if (existing.has(key)) continue;
      existing.add(key);
      const title = SMA.fileNameTitle(file.name);
      if (await saveLocalPin(boardId, folderId, file, key, title)) saved += 1;
    }

    await touchBoard(boardId);
    await refresh();
    finishReport();
    if (importModalOpen()) setStatus('', '');
    closeImportModal();
    if (created) openBoard(boardId); else render();
    SMA.toast(plural(saved, 'imagem guardada', 'imagens guardadas') + ' ✧');
  }

  async function importFolder(files) {
    const images = imageFilesFrom(files);
    if (!images.length) {
      if (importModalOpen()) setStatus('não achei imagens nessa pasta.', 'error', 1);
      else SMA.toast('não achei imagens nessa pasta');
      return;
    }

    const firstRelative = images[0].webkitRelativePath || images[0].name;
    const rootName = (firstRelative.split('/')[0] || 'pasta importada').trim();
    let boardId = state.boardId;
    let baseFolderId = state.folderId;
    let createdBoard = false;

    if (!boardId) {
      closeImportModal();
      const board = await createBoard(rootName, 'local');
      boardId = board.id;
      baseFolderId = null;
      createdBoard = true;
    } else {
      const sameName = childFolders(boardId, baseFolderId).find(function (folder) {
        return folder.title.toLowerCase() === rootName.toLowerCase();
      });
      if (sameName) {
        baseFolderId = sameName.id;
      } else {
        const parent = await createFolder(boardId, baseFolderId, rootName);
        baseFolderId = parent.id;
      }
    }

    const existing = new Set(state.pins
      .filter(function (pin) { return pin.boardId === boardId; })
      .map(function (pin) { return pin.key; }));
    const folderCache = new Map();
    if (!createdBoard) {
      boardFolders(boardId).forEach(function (folder) {
        folderCache.set((folder.parentId || 'root') + '|' + folder.title.toLowerCase(), folder.id);
      });
    }
    let saved = 0;

    for (let index = 0; index < images.length; index += 1) {
      const file = images[index];
      report('guardando ' + (index + 1) + ' de ' + images.length + ' imagens…', (index + 1) / images.length);
      const relative = file.webkitRelativePath || file.name;
      const parts = relative.split('/').filter(Boolean);
      const dirs = parts.slice(1, -1);
      let parentId = baseFolderId;
      for (const dir of dirs) {
        const cacheKey = (parentId || 'root') + '|' + dir.toLowerCase();
        if (!folderCache.has(cacheKey)) {
          const folder = await createFolder(boardId, parentId, dir);
          folderCache.set(cacheKey, folder.id);
        }
        parentId = folderCache.get(cacheKey);
      }
      const key = imageKey(file);
      if (existing.has(key)) continue;
      existing.add(key);
      const title = SMA.fileNameTitle(file.name);
      if (await saveLocalPin(boardId, parentId, file, key, title)) saved += 1;
    }

    await touchBoard(boardId);
    await refresh();
    finishReport();
    closeImportModal();
    if (createdBoard) {
      openBoard(boardId);
    } else if (baseFolderId) {
      openFolder(baseFolderId);
    } else {
      render();
    }
    SMA.toast(plural(saved, 'imagem guardada', 'imagens guardadas') + ' ✧');
  }

  async function compressImage(blob, limit) {
    if (!blob) return null;
    let source = null;
    try {
      source = await createImageBitmap(blob);
    } catch (error) {
      source = await loadImageBlob(blob);
    }
    if (!source) return null;
    const width0 = source.width || (source.naturalWidth || 0);
    const height0 = source.height || (source.naturalHeight || 0);
    if (!width0 || !height0) {
      if (source.close) source.close();
      return null;
    }
    const scale = Math.min(1, (limit || MAX_PIN_SIZE) / Math.max(width0, height0));
    const width = Math.max(1, Math.round(width0 * scale));
    const height = Math.max(1, Math.round(height0 * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    if (typeof source.close === 'function') source.close();
    const output = await new Promise(function (resolve) {
      canvas.toBlob(resolve, 'image/jpeg', 0.86);
    });
    if (!output) return null;
    return { blob: output, width: width, height: height };
  }

  function loadImageBlob(blob) {
    return new Promise(function (resolve) {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      image.src = url;
    });
  }

  /* ── name modal ────────────────────────────────────────────────── */

  function askName(options) {
    const modal = document.getElementById('modal-mood-name');
    const title = document.getElementById('mood-name-title');
    const subtitle = document.getElementById('mood-name-sub');
    const input = document.getElementById('mood-name-input');
    const save = document.getElementById('mood-name-save');
    if (!modal || !input) return Promise.resolve(null);
    if (nameResolve) {
      nameResolve(null);
      nameResolve = null;
    }
    if (title) title.textContent = options.title || 'nova pasta';
    if (subtitle) {
      subtitle.textContent = options.subtitle || '';
      subtitle.hidden = !options.subtitle;
    }
    input.value = options.value || '';
    input.placeholder = options.placeholder || 'escreve um nome…';
    if (save) save.textContent = options.confirm || 'salvar';
    modal.classList.add('open');
    setTimeout(function () {
      input.focus();
      input.select();
    }, 60);
    return new Promise(function (resolve) {
      nameResolve = resolve;
    });
  }

  function settleName(value) {
    const resolve = nameResolve;
    nameResolve = null;
    const modal = document.getElementById('modal-mood-name');
    if (modal) modal.classList.remove('open');
    if (resolve) resolve(value == null ? null : String(value).trim().slice(0, 80) || null);
  }

  /* ── events ────────────────────────────────────────────────────── */

  function onRootClick(event) {
    const actionEl = event.target.closest('[data-mood-act]');
    if (!actionEl) return;
    const action = actionEl.dataset.moodAct;
    const id = actionEl.dataset.id;

    if (action === 'open-board') {
      if (event.target.closest('.mood-card-more')) return;
      openBoard(id);
      return;
    }
    if (action === 'open-folder') {
      if (event.target.closest('.mood-card-more')) return;
      openFolder(id);
      return;
    }
    if (action === 'pin-open') {
      if (event.target.closest('.mood-pin-more')) return;
      const pin = pinById(id);
      if (pin) openLightbox(pin);
      return;
    }
    if (action === 'filter') {
      state.filter = actionEl.dataset.filter === 'private' ? 'private' : 'public';
      render();
      return;
    }
    if (action === 'clear-search') {
      state.query = '';
      render();
      return;
    }
    if (action === 'go-shelf') { openShelf(); return; }
    if (action === 'go-board') { openBoard(id); return; }
    if (action === 'go-folder') { openFolder(id); return; }
    if (action === 'back') { goBack(); return; }
    if (action === 'new-board') { askNewBoard(); return; }
    if (action === 'new-folder') { askNewFolder(); return; }
    if (action === 'open-import') { openImportModal(); return; }
    if (action === 'add-images') {
      const board = boardById(state.boardId);
      if (!board) { openImportModal(); return; }
      document.getElementById('mood-images-input').click();
      return;
    }
    if (action === 'board-menu') {
      const board = boardById(id);
      if (board) boardMenu(actionEl, board);
      return;
    }
    if (action === 'folder-menu') {
      const folder = folderById(id);
      if (folder) folderMenu(actionEl, folder);
      return;
    }
    if (action === 'pin-menu') {
      const pin = pinById(id);
      if (pin) pinMenu(actionEl, pin);
    }
  }

  function onRootKeydown(event) {
    if (event.key !== 'Enter') return;
    const card = event.target.closest('.mood-pin, .mood-board-card, .mood-folder-card');
    if (!card || event.target.closest('button')) return;
    event.preventDefault();
    card.click();
  }

  function onRootInput(event) {
    if (event.target.id !== 'mood-search') return;
    state.query = event.target.value;
    const grid = document.getElementById('mood-shelf');
    if (grid) {
      grid.innerHTML = shelfGridHtml();
      hydrateImages();
    }
    const count = document.getElementById('mood-shelf-count');
    if (count) count.textContent = plural(visibleBoards().length, 'pasta', 'pastas');
  }

  function onRootDragOver(event) {
    if (!state.boardId) return;
    if (!event.dataTransfer || Array.prototype.indexOf.call(event.dataTransfer.types || [], 'Files') === -1) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    root.classList.add('is-dropping');
  }

  function onRootDragLeave(event) {
    if (event.target === root || !root.contains(event.relatedTarget)) {
      root.classList.remove('is-dropping');
    }
  }

  function onRootDrop(event) {
    root.classList.remove('is-dropping');
    if (!state.boardId) return;
    const files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) return;
    event.preventDefault();
    importLooseImages(files);
  }

  function init() {
    if (initialized) return;
    root = document.getElementById('mood-root');
    if (!root) return;
    initialized = true;

    root.addEventListener('click', onRootClick);
    root.addEventListener('keydown', onRootKeydown);
    root.addEventListener('input', onRootInput);
    root.addEventListener('dragover', onRootDragOver);
    root.addEventListener('dragleave', onRootDragLeave);
    root.addEventListener('drop', onRootDrop);

    document.addEventListener('pointerdown', function (event) {
      if (menu && !menu.contains(event.target) && !event.target.closest('[data-mood-act$="-menu"]')) {
        closeMenu();
        removeMenuListeners();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
        removeMenuListeners();
        closeLightbox();
        if (nameResolve) settleName(null);
      }
    });

    /* import modal */
    const importModal = document.getElementById('modal-mood-import');
    if (importModal) {
      importModal.addEventListener('click', function (event) {
        if (event.target === importModal) closeImportModal();
      });
    }
    const importClose = document.getElementById('mood-import-close');
    if (importClose) importClose.addEventListener('click', closeImportModal);
    const importCancel = document.getElementById('mood-import-cancel');
    if (importCancel) importCancel.addEventListener('click', closeImportModal);
    SMA.selectAll('[data-mood-import-tab]').forEach(function (button) {
      button.addEventListener('click', function () { setImportTab(button.dataset.moodImportTab); });
    });
    const go = document.getElementById('mood-pinterest-go');
    const urlInput = document.getElementById('mood-pinterest-url');
    if (go) {
      go.addEventListener('click', function () {
        runPinterestImport(urlInput ? urlInput.value : '');
      });
    }
    if (urlInput) {
      urlInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          runPinterestImport(urlInput.value);
        }
      });
    }
    const pickFolder = document.getElementById('mood-pick-folder');
    if (pickFolder) pickFolder.addEventListener('click', function () {
      document.getElementById('mood-folder-input').click();
    });
    const pickImages = document.getElementById('mood-pick-images');
    if (pickImages) pickImages.addEventListener('click', function () {
      document.getElementById('mood-images-input').click();
    });
    const folderInput = document.getElementById('mood-folder-input');
    if (folderInput) folderInput.addEventListener('change', function () {
      const files = Array.prototype.slice.call(folderInput.files || []);
      folderInput.value = '';
      importFolder(files);
    });
    const imagesInput = document.getElementById('mood-images-input');
    if (imagesInput) imagesInput.addEventListener('change', function () {
      const files = Array.prototype.slice.call(imagesInput.files || []);
      imagesInput.value = '';
      importLooseImages(files);
    });

    /* name modal */
    const nameModal = document.getElementById('modal-mood-name');
    if (nameModal) {
      nameModal.addEventListener('click', function (event) {
        if (event.target === nameModal) settleName(null);
      });
    }
    const nameSave = document.getElementById('mood-name-save');
    if (nameSave) nameSave.addEventListener('click', function () {
      const input = document.getElementById('mood-name-input');
      settleName(input ? input.value : '');
    });
    const nameCancel = document.getElementById('mood-name-cancel');
    if (nameCancel) nameCancel.addEventListener('click', function () { settleName(null); });
    const nameInput = document.getElementById('mood-name-input');
    if (nameInput) {
      nameInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          settleName(nameInput.value);
        }
      });
    }

    /* move modal */
    const moveModal = document.getElementById('modal-mood-move');
    if (moveModal) {
      moveModal.addEventListener('click', function (event) {
        if (event.target === moveModal) moveModal.classList.remove('open');
      });
    }
    const moveSave = document.getElementById('mood-move-save');
    if (moveSave) moveSave.addEventListener('click', savePinMove);
    const moveCancel = document.getElementById('mood-move-cancel');
    if (moveCancel) moveCancel.addEventListener('click', function () {
      document.getElementById('modal-mood-move').classList.remove('open');
      movingPin = null;
    });

    refresh().then(function () {
      render();
    }).catch(function () {
      render();
    });
  }

  SMA.Moodboard = { init: init };
})();
