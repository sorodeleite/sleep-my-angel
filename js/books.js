(function () {
  const SMA = window.SMA;
  const META_KEY = 'sma_books';
  const COVER_KEY = 'sma_book_covers';
  const BOOK_META_KEY = 'sma_book_meta';
  const PROGRESS_KEY = 'sma_book_progress';
  const FONT_KEY = 'sma_reader_font';
  const THEME_KEY = 'sma_reader_theme';
  const BOOKMARKS_KEY = 'sma_book_bookmarks';
  const HIGHLIGHTS_KEY = 'sma_book_highlights';
  const HIGHLIGHT_COLORS_KEY = 'sma_reader_highlight_colors';
  const READER_THEMES = ['sepia', 'light', 'dark'];
  const DEFAULT_HIGHLIGHT_COLORS = ['#E4D3D9', '#CBD9E0', '#E9DFC3', '#D6E6D0', '#E4D6EB'];
  const HIGHLIGHT_CLASS = 'sma-highlight';

  let books = [];
  let importedMeta = [];
  let coverOverrides = {};
  let metaOverrides = {};
  let progress = {};
  let bookmarks = {};
  let highlights = {};
  let highlightColors = DEFAULT_HIGHLIGHT_COLORS.slice();
  let pendingSelection = null;
  let readerClean = false;
  let lastSwipeAt = 0;
  let ignoreClickUntil = 0;
  let lastHighlightClick = 0;
  let root = null;
  let reader = null;
  let coverTargetId = null;
  let editingBook = null;

  const el = {};

  function normalizeMeta(book) {
    return {
      id: String(book.id || 'book-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
      title: String(book.title || 'livro sem nome').trim() || 'livro sem nome',
      author: String(book.author || '').trim(),
      format: String(book.format || 'epub').toLowerCase(),
      fileId: book.fileId || '',
      file: book.file || '',
      cover: book.cover || '',
      source: book.source || 'importado',
      text: typeof book.text === 'string' ? book.text : '',
      url: book.url || '',
      added: Number(book.added) || Date.now(),
      builtin: Boolean(book.builtin)
    };
  }

  function readStorage() {
    importedMeta = SMA.readJSON(META_KEY, []);
    if (!Array.isArray(importedMeta)) importedMeta = [];
    importedMeta = importedMeta.map(normalizeMeta).filter(function (book) {
      return book.format === 'thread' || book.fileId || book.file;
    });
    coverOverrides = SMA.readJSON(COVER_KEY, {});
    if (!coverOverrides || typeof coverOverrides !== 'object' || Array.isArray(coverOverrides)) coverOverrides = {};
    metaOverrides = SMA.readJSON(BOOK_META_KEY, {});
    if (!metaOverrides || typeof metaOverrides !== 'object' || Array.isArray(metaOverrides)) metaOverrides = {};
    progress = SMA.readJSON(PROGRESS_KEY, {});
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) progress = {};
    bookmarks = readBookMap(BOOKMARKS_KEY);
    highlights = readBookMap(HIGHLIGHTS_KEY);
    loadHighlightColors();
  }

  function readBookMap(key) {
    const stored = SMA.readJSON(key, {});
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const clean = {};
    Object.keys(stored).forEach(function (bookId) {
      if (Array.isArray(stored[bookId])) clean[bookId] = stored[bookId].filter(function (item) {
        return item && typeof item === 'object';
      });
    });
    return clean;
  }

  function isHexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ''));
  }

  function loadHighlightColors() {
    const saved = SMA.readJSON(HIGHLIGHT_COLORS_KEY, []);
    highlightColors = DEFAULT_HIGHLIGHT_COLORS.slice();
    (Array.isArray(saved) ? saved : []).forEach(function (color) {
      if (isHexColor(color) && !highlightColors.some(function (item) {
        return item.toLowerCase() === String(color).toLowerCase();
      })) {
        highlightColors.push(color);
      }
    });
  }

  function persistExtraColors() {
    const extras = highlightColors.filter(function (color) {
      return DEFAULT_HIGHLIGHT_COLORS.indexOf(color) === -1;
    });
    SMA.writeJSON(HIGHLIGHT_COLORS_KEY, extras);
  }

  function addHighlightColor(color) {
    if (!isHexColor(color)) return;
    const exists = highlightColors.some(function (item) {
      return item.toLowerCase() === String(color).toLowerCase();
    });
    if (!exists) {
      highlightColors.push(color);
      persistExtraColors();
    }
    renderHighlightColors();
  }

  function persistBookmarks() {
    if (!SMA.writeJSON(BOOKMARKS_KEY, bookmarks)) {
      SMA.toast('não consegui guardar as páginas marcadas');
    }
  }

  function persistHighlights() {
    if (!SMA.writeJSON(HIGHLIGHTS_KEY, highlights)) {
      SMA.toast('não consegui guardar as marcações de texto');
    }
  }

  function makeId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function persistImported() {
    if (!SMA.writeJSON(META_KEY, importedMeta)) {
      SMA.toast('a estante está grande demais para este navegador');
    }
  }

  function persistProgress() {
    SMA.writeJSON(PROGRESS_KEY, progress);
  }

  function formatLabel(format) {
    if (format === 'thread') return 'thread';
    if (format === 'pdf') return 'pdf';
    if (format === 'txt' || format === 'md') return 'txt';
    return 'epub';
  }

  function cleanTitleFromFile(name) {
    return SMA.fileNameTitle(name) || 'livro';
  }

  async function loadBuiltin() {
    try {
      let data = null;
      if (window.api && typeof window.api.readBooksManifest === 'function') {
        data = await window.api.readBooksManifest();
      }
      if (!data) {
        const response = await fetch('assets/books/manifest.json', { cache: 'no-store' });
        if (!response.ok) return [];
        data = await response.json();
      }
      const list = data && Array.isArray(data.books) ? data.books : [];
      return list.map(function (book) {
        return normalizeMeta({
          id: book.id,
          title: book.title,
          author: book.author,
          format: book.format || 'epub',
          file: book.file,
          cover: book.cover,
          builtin: true,
          source: 'estante'
        });
      });
    } catch (error) {
      return [];
    }
  }

  function applyBookOverrides(book) {
    const meta = metaOverrides[book.id] || {};
    return Object.assign({}, book, {
      cover: coverOverrides[book.id] || book.cover,
      title: meta.title || book.title,
      author: meta.author != null ? meta.author : book.author,
      baseTitle: book.title,
      baseAuthor: book.author
    });
  }

  function allBooks() {
    const builtins = books.filter(function (book) { return book.builtin; }).map(applyBookOverrides);
    const imported = books.filter(function (book) { return !book.builtin; }).map(applyBookOverrides);
    return builtins.concat(imported);
  }

  function coverNode(book) {
    const cover = document.createElement('div');
    cover.className = 'book-cover';
    if (book.cover) {
      const image = document.createElement('img');
      image.src = book.cover;
      image.alt = 'capa de ' + book.title;
      image.loading = 'lazy';
      cover.appendChild(image);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'book-cover-fallback';
      fallback.textContent = book.title.slice(0, 1).toUpperCase();
      cover.appendChild(fallback);
    }
    const badge = document.createElement('span');
    badge.className = 'book-format';
    badge.textContent = formatLabel(book.format);
    cover.appendChild(badge);
    const change = document.createElement('button');
    change.type = 'button';
    change.className = 'book-cover-btn';
    change.textContent = '✎ capa';
    change.title = 'escolher outra capa';
    change.addEventListener('click', function (event) {
      event.stopPropagation();
      chooseCover(book.id);
    });
    cover.appendChild(change);
    return cover;
  }

  function bookCard(book) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.dataset.id = book.id;
    card.appendChild(coverNode(book));
    const info = document.createElement('div');
    info.className = 'book-info';
    const title = document.createElement('h4');
    title.className = 'book-title';
    title.textContent = book.title;
    const author = document.createElement('p');
    author.className = 'book-author';
    author.textContent = book.author || (book.format === 'thread' ? 'thread do twitter' : 'autora desconhecida');
    info.appendChild(title);
    info.appendChild(author);

    const marks = bookmarks[book.id] || [];
    if (marks.length) {
      const marked = document.createElement('span');
      marked.className = 'book-bookmark';
      marked.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z"/></svg><span></span>';
      const label = marked.querySelector('span');
      if (label) label.textContent = marks.length + (marks.length === 1 ? ' página marcada' : ' páginas marcadas');
      info.appendChild(marked);
    }

    const entry = progress[book.id];
    const percent = entry && Number.isFinite(Number(entry.percent)) ? Number(entry.percent) : 0;
    if (percent > 0) {
      const track = document.createElement('div');
      track.className = 'book-progress';
      const fill = document.createElement('span');
      fill.style.width = SMA.clamp(percent, 0, 100) + '%';
      track.appendChild(fill);
      const label = document.createElement('span');
      label.className = 'book-progress-label';
      label.textContent = 'parou em ' + Math.round(percent) + '%';
      info.appendChild(track);
      info.appendChild(label);
    }

    const actions = document.createElement('div');
    actions.className = 'book-actions';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn-secondary';
    open.textContent = percent > 0 ? 'continuar' : 'ler';
    open.addEventListener('click', function () { openBook(book); });
    actions.appendChild(open);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'action-btn book-edit';
    edit.textContent = '✎';
    edit.title = 'mudar nome e autor';
    edit.setAttribute('aria-label', 'editar ' + book.title);
    edit.addEventListener('click', function (event) {
      event.stopPropagation();
      openBookMetaEditor(book);
    });
    actions.appendChild(edit);
    if (!book.builtin) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'action-btn book-remove';
      remove.textContent = '×';
      remove.title = 'remover da estante';
      remove.addEventListener('click', function (event) {
        event.stopPropagation();
        removeBook(book);
      });
      actions.appendChild(remove);
    }
    info.appendChild(actions);
    card.appendChild(info);
    card.addEventListener('click', function (event) {
      if (event.target.closest('button')) return;
      openBook(book);
    });
    return card;
  }

  function fallbackCover(book) {
    const cover = document.createElement('div');
    cover.className = 'book-cover-fallback';
    cover.textContent = book.title.slice(0, 1).toUpperCase();
    return cover;
  }

  function render() {
    if (!root) return;
    root.textContent = '';
    const shelf = document.createElement('div');
    shelf.className = 'books-shelf';
    const list = allBooks();
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state books-empty';
      empty.innerHTML = '<div class="empty-icon">☾</div><p>sua estante está vazia</p><span>importe um epub, pdf ou txt pra ler no cantinho</span>';
      shelf.appendChild(empty);
    }
    list.forEach(function (book) {
      shelf.appendChild(bookCard(book));
    });
    root.appendChild(shelf);
    const hint = document.createElement('p');
    hint.className = 'books-hint';
    hint.textContent = list.length + (list.length === 1 ? ' livrinho' : ' livrinhos') + ' ‧ toque na capa pra abrir';
    root.appendChild(hint);
  }

  function chooseCover(id) {
    coverTargetId = id;
    el.coverInput?.click();
  }

  function persistBookMeta() {
    if (!SMA.writeJSON(BOOK_META_KEY, metaOverrides)) {
      SMA.toast('não consegui guardar o nome desse livro');
    }
  }

  function openBookMetaEditor(book) {
    if (!book) return;
    editingBook = book;
    const modal = SMA.select('#modal-book');
    const titleInput = SMA.select('#book-title-input');
    const authorInput = SMA.select('#book-author-input');
    const preview = SMA.select('#book-edit-cover');
    const fallback = SMA.select('#book-edit-cover-fallback');
    const format = SMA.select('#book-edit-format');
    if (titleInput) titleInput.value = book.title || '';
    if (authorInput) authorInput.value = book.author || '';
    if (format) format.textContent = formatLabel(book.format);
    if (preview) {
      if (book.cover) {
        preview.src = book.cover;
        preview.hidden = false;
        if (fallback) fallback.hidden = true;
      } else {
        preview.removeAttribute('src');
        preview.hidden = true;
        if (fallback) {
          fallback.textContent = (book.title || '?').slice(0, 1).toUpperCase();
          fallback.hidden = false;
        }
      }
    }
    modal?.classList.add('open');
    setTimeout(function () {
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 60);
  }

  function closeBookMetaEditor() {
    editingBook = null;
    SMA.select('#modal-book')?.classList.remove('open');
  }

  function saveBookMeta() {
    if (!editingBook) return;
    const titleInput = SMA.select('#book-title-input');
    const authorInput = SMA.select('#book-author-input');
    const title = titleInput ? titleInput.value.trim() : '';
    const author = authorInput ? authorInput.value.trim() : '';
    if (!title) {
      SMA.toast('dá um nome pro livro primeiro');
      titleInput?.focus();
      return;
    }
    const baseTitle = editingBook.baseTitle || editingBook.title || '';
    const baseAuthor = editingBook.baseAuthor != null ? editingBook.baseAuthor : (editingBook.author || '');
    const record = {};
    if (title !== baseTitle) record.title = title;
    if (author !== baseAuthor) record.author = author;
    if (Object.keys(record).length) {
      metaOverrides[editingBook.id] = record;
    } else {
      delete metaOverrides[editingBook.id];
    }
    persistBookMeta();
    if (reader && reader.id === editingBook.id) {
      if (el.readerTitle) el.readerTitle.textContent = title;
      if (el.readerAuthor) el.readerAuthor.textContent = author;
    }
    closeBookMetaEditor();
    render();
    SMA.toast('livro atualizado ‧°');
  }

  function restoreBookMetaFields() {
    if (!editingBook) return;
    const titleInput = SMA.select('#book-title-input');
    const authorInput = SMA.select('#book-author-input');
    if (titleInput) titleInput.value = editingBook.baseTitle || editingBook.title || '';
    if (authorInput) authorInput.value = editingBook.baseAuthor || '';
  }

  async function applyCover(file) {
    if (!file || !coverTargetId) return;
    try {
      const dataUrl = await SMA.readImageFile(file, 760, 0.86);
      coverOverrides[coverTargetId] = dataUrl;
      SMA.writeJSON(COVER_KEY, coverOverrides);
      const imported = importedMeta.find(function (book) { return book.id === coverTargetId; });
      if (imported) {
        imported.cover = dataUrl;
        persistImported();
      }
      render();
      SMA.toast('capa atualizada ‧°');
    } catch (error) {
      SMA.toast('não consegui abrir essa imagem');
    } finally {
      coverTargetId = null;
    }
  }

  function toArrayBuffer(value) {
    if (value instanceof ArrayBuffer) return value;
    if (value && value.buffer instanceof ArrayBuffer) {
      return value.buffer.slice(value.byteOffset || 0, (value.byteOffset || 0) + value.byteLength);
    }
    return null;
  }

  async function readBookBuffer(book) {
    if (book.builtin) {
      if (window.api && typeof window.api.readBookFile === 'function') {
        const buffer = toArrayBuffer(await window.api.readBookFile(book.file));
        if (buffer) return buffer;
      }
      const response = await fetch(book.file);
      if (!response.ok) throw new Error('arquivo indisponível');
      return response.arrayBuffer();
    }
    if (book.fileId) {
      const record = await SMA.bookStore.get(book.fileId);
      if (!record || !record.blob) throw new Error('arquivo não encontrado');
      return record.blob.arrayBuffer();
    }
    throw new Error('arquivo não encontrado');
  }

  async function inspectEpub(arrayBuffer) {
    if (!window.ePub) return { cover: '', title: '', author: '' };
    let temp = null;
    try {
      temp = window.ePub(arrayBuffer);
      await temp.ready;
      let title = '';
      let author = '';
      try {
        const metadata = temp.packaging && temp.packaging.metadata;
        if (metadata) {
          title = metadata.title || '';
          author = metadata.creator || metadata.author || '';
        }
      } catch (error) {
        void error;
      }
      const url = await temp.coverUrl();
      if (!url) return { cover: '', title: title, author: author };
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'capa.jpg', { type: blob.type || 'image/jpeg' });
      const cover = await SMA.readImageFile(file, 720, 0.84);
      return { cover: cover, title: title, author: author };
    } catch (error) {
      return { cover: '', title: '', author: '' };
    } finally {
      try { if (temp) temp.destroy(); } catch (error) { void error; }
    }
  }

  async function extractPdfData(arrayBuffer) {
    if (!window.pdfjsLib) return { cover: '', title: '' };
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let title = '';
      try {
        const metadata = await pdf.getMetadata();
        title = (metadata.info && metadata.info.Title) || '';
      } catch (error) {
        void error;
      }
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const targetWidth = 640;
      const scale = Math.min(1.6, targetWidth / viewport.width);
      const scaled = page.getViewport({ scale: scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(scaled.width);
      canvas.height = Math.round(scaled.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport: scaled }).promise;
      return { cover: canvas.toDataURL('image/jpeg', 0.82), title: title };
    } catch (error) {
      return { cover: '', title: '' };
    }
  }

  async function importFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    let imported = 0;
    for (const file of list) {
      const lower = file.name.toLowerCase();
      try {
        if (/\.(azw3|azw|mobi|prc)$/i.test(lower)) {
          SMA.toast('formato kindle — converta pra epub e importe de novo');
          continue;
        }
        if (/\.pdf$/.test(lower)) {
          const arrayBuffer = await file.arrayBuffer();
          const data = await extractPdfData(arrayBuffer);
          const id = await SMA.bookStore.put(file);
          if (!id) {
            SMA.toast('não consegui guardar esse pdf');
            continue;
          }
          importedMeta.unshift(normalizeMeta({
            id: 'imported-' + id,
            title: data.title || cleanTitleFromFile(file.name),
            author: 'pdf',
            format: 'pdf',
            fileId: id,
            cover: data.cover,
            source: 'pdf',
            added: Date.now()
          }));
          imported += 1;
          continue;
        }
        if (/\.(epub)$/i.test(lower)) {
          const arrayBuffer = await file.arrayBuffer();
          const data = await inspectEpub(arrayBuffer.slice(0));
          const id = await SMA.bookStore.put(file);
          if (!id) {
            SMA.toast('não consegui guardar esse epub');
            continue;
          }
          importedMeta.unshift(normalizeMeta({
            id: 'imported-' + id,
            title: data.title || cleanTitleFromFile(file.name),
            author: data.author || 'epub',
            format: 'epub',
            fileId: id,
            cover: data.cover,
            source: 'epub',
            added: Date.now()
          }));
          imported += 1;
          continue;
        }
        if (/\.(txt|md|markdown)$/i.test(lower)) {
          const text = await file.text();
          const id = await SMA.bookStore.put(file);
          if (!id) continue;
          importedMeta.unshift(normalizeMeta({
            id: 'imported-' + id,
            title: cleanTitleFromFile(file.name),
            author: 'texto',
            format: 'txt',
            fileId: id,
            source: 'texto',
            added: Date.now()
          }));
          imported += 1;
        }
      } catch (error) {
        void error;
      }
    }
    if (imported > 0) {
      persistImported();
      books = books.concat(importedMeta.filter(function (book) {
        return !books.some(function (item) { return item.id === book.id; });
      }));
      render();
      SMA.toast(imported + (imported === 1 ? ' livrinho entrou na estante' : ' livrinhos entraram na estante') + ' ‧°');
    } else {
      SMA.toast('nenhum livro compatível encontrado');
    }
  }

  function removeBook(book) {
    if (!window.confirm('tirar "' + book.title + '" da estante?')) return;
    if (book.fileId && SMA.bookStore) SMA.bookStore.remove(book.fileId);
    importedMeta = importedMeta.filter(function (item) { return item.id !== book.id; });
    persistImported();
    delete coverOverrides[book.id];
    SMA.writeJSON(COVER_KEY, coverOverrides);
    delete metaOverrides[book.id];
    persistBookMeta();
    delete progress[book.id];
    persistProgress();
    delete bookmarks[book.id];
    persistBookmarks();
    delete highlights[book.id];
    persistHighlights();
    books = books.filter(function (item) { return item.id !== book.id; });
    render();
    SMA.toast('livro removido');
  }

  function parseTweetId(value) {
    const match = String(value || '').match(/(?:status|statuses)\/(\d+)/i);
    if (match) return match[1];
    if (/^\d{6,}$/.test(String(value || '').trim())) return String(value).trim();
    return '';
  }

  function threadTitle(text, author) {
    const firstLine = String(text || '').split(/\r?\n/).find(function (line) { return line.trim().length > 0; });
    if (firstLine && firstLine.trim().length <= 90) return firstLine.trim();
    return 'thread de ' + (author || 'alguém');
  }

  async function importThread() {
    const input = el.threadInput;
    if (!input) return;
    const raw = input.value.trim();
    const id = parseTweetId(raw);
    if (!id) {
      SMA.toast('cola o link de um post ou de uma thread do twitter');
      input.focus();
      return;
    }
    if (el.threadButton) {
      el.threadButton.disabled = true;
      el.threadButton.textContent = 'buscando...';
    }
    try {
      const response = await fetch('https://api.fxtwitter.com/2/thread/' + id, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('api');
      const data = await response.json();
      const thread = Array.isArray(data.thread) ? data.thread : [];
      const statuses = thread.length ? thread : [data.status].filter(Boolean);
      const text = statuses.map(function (status) { return status.text || ''; }).filter(Boolean).join('\n\n');
      if (!text.trim()) throw new Error('vazio');
      const author = (data.author && data.author.name)
        || (statuses[0] && statuses[0].author && statuses[0].author.name)
        || 'twitter';
      const book = normalizeMeta({
        id: 'thread-' + Date.now(),
        title: threadTitle(text, author),
        author: author + ' ‧ twitter',
        format: 'thread',
        text: text,
        url: 'https://x.com/i/status/' + id,
        source: 'thread',
        added: Date.now()
      });
      importedMeta.unshift(book);
      persistImported();
      books.push(book);
      input.value = '';
      render();
      SMA.toast('thread guardada ‧°');
      openBook(book);
    } catch (error) {
      SMA.toast('não consegui buscar essa thread agora');
    } finally {
      if (el.threadButton) {
        el.threadButton.disabled = false;
        el.threadButton.textContent = 'ler thread';
      }
    }
  }

  function setReaderTheme(theme) {
    const chosen = READER_THEMES.indexOf(theme) === -1 ? 'sepia' : theme;
    el.overlay.classList.remove('reader-theme-sepia', 'reader-theme-light', 'reader-theme-dark');
    el.overlay.classList.add('reader-theme-' + chosen);
    SMA.writeJSON(THEME_KEY, chosen);
    paintThemeMenu(chosen);
    if (el.themeButton) {
      el.themeButton.title = 'modo de leitura ‧ ' + themeLabel(chosen);
    }
    if (reader && reader.rendition) {
      try {
        reader.rendition.themes.select(chosen);
      } catch (error) {
        void error;
      }
    }
  }

  function themeLabel(theme) {
    if (theme === 'light') return 'claro';
    if (theme === 'dark') return 'escuro';
    return 'de leitura';
  }

  function paintThemeMenu(current) {
    if (!el.modeMenu) return;
    SMA.selectAll('.reader-mode-item', el.modeMenu).forEach(function (button) {
      const active = button.dataset.theme === current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });
  }

  function toggleModeMenu(force) {
    if (!el.modeMenu || !el.themeButton) return;
    const open = typeof force === 'boolean' ? force : el.modeMenu.hidden;
    el.modeMenu.hidden = !open;
    el.themeButton.setAttribute('aria-expanded', String(open));
  }

  function closeModeMenu() {
    toggleModeMenu(false);
  }

  function setCleanMode(on, announce) {
    readerClean = Boolean(on);
    if (el.overlay) el.overlay.classList.toggle('reader-clean', readerClean);
    if (el.cleanButton) {
      el.cleanButton.classList.toggle('active', readerClean);
      el.cleanButton.setAttribute('aria-pressed', String(readerClean));
    }
    if (readerClean) {
      closeModeMenu();
      if (el.toc) el.toc.hidden = true;
      if (announce !== false) {
        SMA.toast('tela limpa ‧ toque nas laterais pra virar, no meio pra sair');
      }
    }
  }

  function turnByRatio(ratio) {
    if (ratio < 0.36) prevPage();
    else if (ratio > 0.64) nextPage();
    else setCleanMode(false);
  }

  function textSelectionExists() {
    try {
      const selection = window.getSelection();
      if (selection && String(selection.toString()).trim()) return true;
    } catch (error) {
      void error;
    }
    try {
      if (!reader || !reader.rendition) return false;
      const contents = reader.rendition.getContents();
      return (contents || []).some(function (item) {
        const selection = item.window && item.window.getSelection();
        return Boolean(selection && String(selection.toString()).trim());
      });
    } catch (error) {
      return false;
    }
  }

  function currentPercent() {
    if (el.progress && Number.isFinite(Number(el.progress.value))) {
      return SMA.clamp(Number(el.progress.value), 0, 100);
    }
    if (reader && reader.type === 'pdf' && reader.pages) return (reader.page / reader.pages) * 100;
    return 0;
  }

  function currentLocation() {
    if (!reader) return null;
    const percent = currentPercent();
    if (reader.type === 'pdf') {
      return { percent: percent, page: reader.page, pages: reader.pages };
    }
    if (reader.type === 'epub' && reader.rendition) {
      let cfi = '';
      try {
        const location = reader.rendition.currentLocation();
        if (location && location.start && location.start.cfi) cfi = location.start.cfi;
      } catch (error) {
        void error;
      }
      return { percent: percent, cfi: cfi };
    }
    if (reader.type === 'text') {
      return { percent: percent, scroll: Math.round(el.view.scrollTop || 0) };
    }
    return { percent: percent };
  }

  function bookmarkMatches(item, location) {
    if (!item || !location) return false;
    if (reader && reader.type === 'pdf') return Number(item.page) === Number(location.page);
    if (reader && reader.type === 'text') {
      return Math.abs(Number(item.scroll) - Number(location.scroll)) < 48;
    }
    if (item.cfi && location.cfi) return item.cfi === location.cfi;
    return Math.abs(Number(item.percent) - Number(location.percent)) < 1;
  }

  function currentBookmarkIndex() {
    if (!reader) return -1;
    const list = bookmarks[reader.id] || [];
    const location = currentLocation();
    for (let index = 0; index < list.length; index += 1) {
      if (bookmarkMatches(list[index], location)) return index;
    }
    return -1;
  }

  function paintMarkButton() {
    if (!el.markButton || !el.overlay || el.overlay.hidden) return;
    const active = currentBookmarkIndex() >= 0;
    el.markButton.classList.toggle('active', active);
    el.markButton.setAttribute('aria-pressed', String(active));
    el.markButton.title = active ? 'desmarcar esta página' : 'marcar esta página';
  }

  function toggleBookmark() {
    if (!reader) return;
    const list = bookmarks[reader.id] || [];
    const index = currentBookmarkIndex();
    if (index >= 0) {
      list.splice(index, 1);
      SMA.toast('página desmarcada');
    } else {
      const location = currentLocation();
      if (!location) return;
      list.push(Object.assign({ id: makeId('mark'), created: Date.now() }, location));
      SMA.toast('página marcada ‧°');
    }
    bookmarks[reader.id] = list;
    persistBookmarks();
    paintMarkButton();
    renderBookmarks();
  }

  function bookmarkLabel(item) {
    if (!item) return '';
    if (item.page) return 'página ' + item.page + (item.pages ? ' de ' + item.pages : '');
    const percent = Math.round(Number(item.percent) || 0);
    if (percent <= 0) return 'começo do livro';
    if (percent >= 100) return 'fim do livro';
    return percent + '% do livro';
  }

  function renderBookmarks() {
    if (!el.marksList) return;
    el.marksList.textContent = '';
    const list = reader ? (bookmarks[reader.id] || []).slice() : [];
    list.sort(function (a, b) {
      return (Number(a.percent) || 0) - (Number(b.percent) || 0);
    });
    if (el.marksTitle) {
      el.marksTitle.textContent = 'páginas marcadas' + (list.length ? ' ‧ ' + list.length : '');
    }
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'reader-marks-empty';
      empty.textContent = 'nenhuma página marcada ainda. toque na fitinha pra guardar onde você parou.';
      el.marksList.appendChild(empty);
      return;
    }
    list.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'reader-mark-row';
      const jump = document.createElement('button');
      jump.type = 'button';
      jump.className = 'reader-mark-jump';
      jump.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z"/></svg><span></span>';
      const label = jump.querySelector('span');
      if (label) label.textContent = bookmarkLabel(item);
      jump.addEventListener('click', function () {
        jumpToBookmark(item);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'reader-mark-remove';
      remove.textContent = '×';
      remove.title = 'apagar marcação';
      remove.setAttribute('aria-label', 'apagar marcação');
      remove.addEventListener('click', function (event) {
        event.stopPropagation();
        removeBookmark(item.id);
      });
      row.appendChild(jump);
      row.appendChild(remove);
      el.marksList.appendChild(row);
    });
  }

  function jumpToBookmark(item) {
    if (!reader || !item) return;
    if (reader.type === 'pdf' && item.page) {
      reader.page = SMA.clamp(Number(item.page) || 1, 1, reader.pages || 1);
      const canvas = el.view.querySelector('canvas.pdf-page');
      if (canvas) renderPdfPage(canvas);
    } else if (reader.type === 'epub' && item.cfi && reader.rendition) {
      reader.rendition.display(item.cfi);
    } else if (reader.type === 'text' && Number.isFinite(Number(item.scroll))) {
      el.view.scrollTop = Number(item.scroll);
      const max = el.view.scrollHeight - el.view.clientHeight;
      updateReaderProgress(max > 0 ? (el.view.scrollTop / max) * 100 : 100);
      saveProgress({ id: reader.id }, currentPercent());
    } else if (Number.isFinite(Number(item.percent))) {
      seekReader(Number(item.percent));
    }
    if (el.toc) el.toc.hidden = true;
    paintMarkButton();
  }

  function removeBookmark(id) {
    if (!reader) return;
    bookmarks[reader.id] = (bookmarks[reader.id] || []).filter(function (item) {
      return item.id !== id;
    });
    persistBookmarks();
    paintMarkButton();
    renderBookmarks();
    SMA.toast('marcação apagada');
  }

  function renderHighlightColors() {
    if (!el.colorList) return;
    el.colorList.textContent = '';
    highlightColors.forEach(function (color) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-heart';
      button.style.color = color;
      button.title = 'marcar com ' + color;
      button.setAttribute('aria-label', 'marcar texto com a cor ' + color);
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="reader-heart-shape" d="M12 21s-6.9-4.4-9.4-8.2C.7 10.3 1.4 6.4 4.3 4.7c2.3-1.4 5-.6 6.5 1.4L12 7.8l1.2-1.7c1.5-2 4.2-2.8 6.5-1.4 2.9 1.7 3.6 5.6 1.7 8.1C18.9 16.6 12 21 12 21z"/></svg>';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        applyHighlight(color);
      });
      el.colorList.appendChild(button);
    });
  }

  function showHighlightBar() {
    if (!pendingSelection) return;
    renderHighlightColors();
    if (el.highlightBar) el.highlightBar.hidden = false;
  }

  function hideHighlightBar() {
    pendingSelection = null;
    if (el.highlightBar) el.highlightBar.hidden = true;
    clearSelections();
  }

  function clearSelections() {
    try {
      const selection = window.getSelection();
      if (selection) selection.removeAllRanges();
    } catch (error) {
      void error;
    }
    if (!reader || !reader.rendition) return;
    try {
      (reader.rendition.getContents() || []).forEach(function (contents) {
        try {
          const selection = contents.window.getSelection();
          if (selection) selection.removeAllRanges();
        } catch (error) {
          void error;
        }
      });
    } catch (error) {
      void error;
    }
  }

  function applyHighlight(color) {
    if (!pendingSelection || !reader || !isHexColor(color)) return;
    if (pendingSelection.bookId !== reader.id) {
      hideHighlightBar();
      return;
    }
    if (pendingSelection.kind === 'epub' && pendingSelection.cfi) {
      addEpubHighlight(pendingSelection.cfi, color, pendingSelection.text || '');
    } else if (pendingSelection.kind === 'text') {
      addTextHighlight(pendingSelection.ranges || [], color, pendingSelection.text || '');
    }
    hideHighlightBar();
    SMA.toast('texto marcado ‧°');
  }

  function addEpubHighlight(cfi, color, text) {
    const item = {
      id: makeId('hl'),
      cfi: cfi,
      color: color,
      text: String(text || '').slice(0, 280),
      created: Date.now()
    };
    highlights[reader.id] = highlights[reader.id] || [];
    highlights[reader.id].push(item);
    persistHighlights();
    paintEpubHighlight(item);
  }

  function paintEpubHighlight(item) {
    if (!reader || !reader.rendition) return;
    try {
      reader.rendition.annotations.highlight(item.cfi, { id: item.id }, function () {
        handleHighlightClick(item.id);
      }, HIGHLIGHT_CLASS, {
        fill: item.color,
        'fill-opacity': '0.55',
        'mix-blend-mode': 'multiply'
      });
    } catch (error) {
      void error;
    }
  }

  function paintHighlights() {
    if (!reader || reader.type !== 'epub' || !reader.rendition) return;
    (highlights[reader.id] || []).forEach(paintEpubHighlight);
  }

  function handleHighlightClick(id) {
    if (Date.now() - lastHighlightClick < 450) return;
    lastHighlightClick = Date.now();
    removeHighlight(id);
  }

  function addTextHighlight(ranges, color, text) {
    if (!ranges.length) return;
    const item = {
      id: makeId('hl'),
      ranges: ranges,
      color: color,
      text: String(text || '').slice(0, 280),
      created: Date.now()
    };
    highlights[reader.id] = highlights[reader.id] || [];
    highlights[reader.id].push(item);
    persistHighlights();
    ranges.forEach(function (range) {
      const paragraphs = SMA.selectAll('p', el.view);
      const paragraph = paragraphs[range.p];
      if (paragraph) wrapTextRange(paragraph, range.start, range.end, color, item.id);
    });
  }

  function resolveTextOffset(rootNode, offset) {
    let remaining = offset;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (remaining <= node.data.length) return { node: node, offset: remaining };
      remaining -= node.data.length;
      node = walker.nextNode();
    }
    return null;
  }

  function wrapTextRange(paragraph, start, end, color, id) {
    if (end <= start) return;
    const startPos = resolveTextOffset(paragraph, start);
    const endPos = resolveTextOffset(paragraph, end);
    if (!startPos || !endPos) return;
    const range = document.createRange();
    try {
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
    } catch (error) {
      return;
    }
    const mark = document.createElement('mark');
    mark.className = 'reader-text-mark';
    mark.style.backgroundColor = color;
    mark.dataset.highlightId = id;
    mark.title = 'toque pra desmarcar';
    mark.addEventListener('click', function (event) {
      event.stopPropagation();
      handleHighlightClick(id);
    });
    try {
      range.surroundContents(mark);
    } catch (error) {
      try {
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      } catch (failure) {
        void failure;
      }
    }
  }

  function unwrapTextMarks(id) {
    SMA.selectAll('mark[data-highlight-id="' + id + '"]', el.view).forEach(function (mark) {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function removeHighlight(id) {
    if (!reader) return;
    const list = highlights[reader.id] || [];
    const item = list.find(function (entry) { return entry.id === id; });
    if (!item) return;
    if (!window.confirm('apagar essa marcação de texto?')) return;
    if (item.cfi && reader.rendition) {
      try {
        reader.rendition.annotations.remove(item.cfi, 'highlight');
      } catch (error) {
        void error;
      }
    }
    unwrapTextMarks(id);
    highlights[reader.id] = list.filter(function (entry) { return entry.id !== id; });
    persistHighlights();
    SMA.toast('marcação apagada');
  }

  function textSelectionRanges() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!el.view.contains(range.commonAncestorContainer)) return null;
    const text = String(range.toString()).trim();
    if (!text) return null;
    const paragraphs = SMA.selectAll('p', el.view);
    const startIndex = paragraphs.findIndex(function (paragraph) {
      return paragraph.contains(range.startContainer);
    });
    const endIndex = paragraphs.findIndex(function (paragraph) {
      return paragraph.contains(range.endContainer);
    });
    if (startIndex === -1 || endIndex === -1) return null;
    const ranges = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
      const paragraph = paragraphs[index];
      let start = 0;
      let end = paragraph.textContent.length;
      if (index === startIndex) {
        start = offsetInside(paragraph, range.startContainer, range.startOffset);
      }
      if (index === endIndex) {
        end = offsetInside(paragraph, range.endContainer, range.endOffset);
      }
      if (end > start) ranges.push({ p: index, start: start, end: end });
    }
    if (!ranges.length) return null;
    return { ranges: ranges, text: text };
  }

  function offsetInside(rootNode, container, offset) {
    try {
      const range = document.createRange();
      range.setStart(rootNode, 0);
      range.setEnd(container, offset);
      return range.toString().length;
    } catch (error) {
      return 0;
    }
  }

  function captureTextSelection() {
    if (!reader || reader.type !== 'text') return;
    const result = textSelectionRanges();
    if (!result) return;
    pendingSelection = {
      kind: 'text',
      bookId: reader.id,
      ranges: result.ranges,
      text: result.text
    };
    showHighlightBar();
  }

  function applyTextHighlights() {
    if (!reader || reader.type !== 'text') return;
    const paragraphs = SMA.selectAll('p', el.view);
    (highlights[reader.id] || []).forEach(function (item) {
      (item.ranges || []).forEach(function (range) {
        const paragraph = paragraphs[range.p];
        if (paragraph) wrapTextRange(paragraph, range.start, range.end, item.color, item.id);
      });
    });
  }

  function bindEpubInteractions(contents) {
    const doc = contents && contents.document;
    if (!doc || doc.__smaReaderBound) return;
    doc.__smaReaderBound = true;
    let touchStart = null;

    const selectionText = function () {
      try {
        return String(contents.window.getSelection().toString() || '').trim();
      } catch (error) {
        return '';
      }
    };

    doc.addEventListener('touchstart', function (event) {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;
      touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    doc.addEventListener('touchend', function (event) {
      if (!touchStart) return;
      const touch = event.changedTouches && event.changedTouches[0];
      const start = touchStart;
      touchStart = null;
      if (!touch || selectionText()) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < 54 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      ignoreClickUntil = Date.now() + 400;
      lastSwipeAt = Date.now();
      if (dx < 0) nextPage();
      else prevPage();
    }, { passive: true });

    doc.addEventListener('click', function (event) {
      if (!readerClean) return;
      if (Date.now() < ignoreClickUntil || Date.now() - lastSwipeAt < 400) return;
      if (selectionText()) return;
      if (event.target.closest('a, button, input, textarea, select, label')) return;
      const width = contents.window.innerWidth || doc.documentElement.clientWidth || 1;
      turnByRatio(event.clientX / width);
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function readerFontSize() {
    const saved = Number(SMA.readJSON(FONT_KEY, 19));
    return Number.isFinite(saved) ? SMA.clamp(saved, 14, 30) : 19;
  }

  function applyReaderFontSize() {
    const size = readerFontSize();
    if (el.progressLabel) el.progressLabel.dataset.font = String(size);
    if (reader && reader.rendition) {
      try { reader.rendition.themes.fontSize(size + 'px'); } catch (error) { void error; }
    }
    if (reader && reader.type === 'text') {
      el.view.style.fontSize = size + 'px';
    }
  }

  function updateReaderProgress(percent, label) {
    const value = SMA.clamp(Number(percent) || 0, 0, 100);
    if (el.progress) el.progress.value = String(value);
    if (el.progressLabel) el.progressLabel.textContent = label || Math.round(value) + '%';
    paintMarkButton();
  }

  function saveProgress(book, value, extra) {
    progress[book.id] = Object.assign({
      percent: SMA.clamp(Number(value) || 0, 0, 100),
      updated: Date.now()
    }, extra || {});
    persistProgress();
  }

  function showReaderShell(book) {
    el.overlay.hidden = false;
    document.body.classList.add('reader-open');
    el.readerTitle.textContent = book.title;
    el.readerAuthor.textContent = book.author || '';
    el.view.textContent = '';
    el.view.onscroll = null;
    el.view.className = 'reader-view reader-view-' + book.format;
    el.toc.hidden = true;
    el.tocList.textContent = '';
    if (el.marksList) el.marksList.textContent = '';
    setTocVisibility(false);
    setCleanMode(false, false);
    closeModeMenu();
    hideHighlightBar();
    if (el.progress) el.progress.disabled = false;
    updateReaderProgress(0, '0%');
    setReaderTheme(SMA.readJSON(THEME_KEY, 'sepia'));
    applyReaderFontSize();
    renderBookmarks();
  }

  function setTocVisibility(hasItems) {
    if (el.tocTitle) el.tocTitle.hidden = !hasItems;
    if (el.tocList) el.tocList.hidden = !hasItems;
    if (el.tocButton) el.tocButton.hidden = !hasItems;
  }

  function closeReader() {
    if (!reader) {
      el.overlay.hidden = true;
      document.body.classList.remove('reader-open');
      return;
    }
    try { if (reader.rendition) reader.rendition.destroy(); } catch (error) { void error; }
    try { if (reader.book) reader.book.destroy(); } catch (error) { void error; }
    try { if (reader.url) URL.revokeObjectURL(reader.url); } catch (error) { void error; }
    reader = null;
    setCleanMode(false, false);
    closeModeMenu();
    hideHighlightBar();
    el.overlay.hidden = true;
    el.view.textContent = '';
    el.view.onscroll = null;
    el.toc.hidden = true;
    document.body.classList.remove('reader-open');
    render();
  }

  async function openBook(book) {
    showReaderShell(book);
    const saved = progress[book.id] || {};
    reader = { id: book.id, type: book.format, book: null, rendition: null, url: '', pdf: null, page: saved.page || 1, pages: 0 };
    renderBookmarks();
    paintMarkButton();
    try {
      if (book.format === 'thread') {
        openTextBook(book, saved);
        return;
      }
      const arrayBuffer = await readBookBuffer(book);
      if (book.format === 'txt') {
        if (!book.text) book.text = new TextDecoder('utf-8').decode(arrayBuffer);
        openTextBook(book, saved);
        return;
      }
      if (book.format === 'pdf') {
        await openPdfBook(book, arrayBuffer, saved);
      } else {
        await openEpubBook(book, arrayBuffer, saved);
      }
    } catch (error) {
      SMA.toast('não consegui abrir esse livro');
      closeReader();
    }
  }

  function openTextBook(book, saved) {
    reader.type = 'text';
    setTocVisibility(false);
    if (el.progress) el.progress.disabled = true;
    el.view.className = 'reader-view reader-view-text';
    const text = book.format === 'thread' ? book.text : (book.text || '');
    if (!text) {
      const empty = document.createElement('p');
      empty.className = 'reader-empty';
      empty.textContent = 'esse livrinho não tem texto guardado.';
      el.view.appendChild(empty);
      return;
    }
    String(text).split(/\n{2,}/).forEach(function (block) {
      const paragraph = document.createElement('p');
      paragraph.textContent = block.trim();
      if (paragraph.textContent) el.view.appendChild(paragraph);
    });
    applyTextHighlights();
    el.view.scrollTop = 0;
    el.view.onscroll = function () {
      const max = el.view.scrollHeight - el.view.clientHeight;
      const percent = max > 0 ? (el.view.scrollTop / max) * 100 : 100;
      updateReaderProgress(percent);
      saveProgress(book, percent, { scroll: el.view.scrollTop });
    };
    updateReaderProgress(saved.percent || 0);
    applyReaderFontSize();
    if (saved.scroll && Number(saved.scroll) > 0) {
      el.view.scrollTop = Number(saved.scroll);
    }
  }

  async function openEpubBook(book, arrayBuffer, saved) {
    if (!window.ePub) {
      SMA.toast('o leitor de epub não carregou');
      closeReader();
      return;
    }
    reader.type = 'epub';
    const epubBook = window.ePub(arrayBuffer);
    reader.book = epubBook;
    await epubBook.ready;
    const rendition = epubBook.renderTo(el.view, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none',
      allowScriptedContent: false
    });
    reader.rendition = rendition;
    rendition.themes.register('sepia', {
      body: { background: '#f3ecdd', color: '#3b342c', 'font-family': 'Georgia, "Times New Roman", serif', 'line-height': '1.75', 'user-select': 'text', '-webkit-user-select': 'text' },
      'p, li': { 'line-height': '1.75' },
      a: { color: '#8a5c45' }
    });
    rendition.themes.register('light', {
      body: { background: '#ffffff', color: '#111111', 'font-family': 'Georgia, "Times New Roman", serif', 'line-height': '1.75', 'user-select': 'text', '-webkit-user-select': 'text' },
      a: { color: '#345c8c' }
    });
    rendition.themes.register('dark', {
      body: { background: '#242327', color: '#e9e5dc', 'font-family': 'Georgia, "Times New Roman", serif', 'line-height': '1.75', 'user-select': 'text', '-webkit-user-select': 'text' },
      a: { color: '#b9cbe8' }
    });
    setReaderTheme(SMA.readJSON(THEME_KEY, 'sepia'));
    applyReaderFontSize();
    rendition.hooks.content.register(function (contents) {
      bindEpubInteractions(contents);
    });
    const reportLocation = function (location) {
      if (!location || !location.start) return;
      let percent = 0;
      if (Number.isFinite(location.start.percentage)) {
        percent = location.start.percentage * 100;
      } else if (epubBook.locations && epubBook.locations.length() && location.start.cfi) {
        percent = (epubBook.locations.percentageFromCfi(location.start.cfi) || 0) * 100;
      }
      const label = percent > 0 && percent < 1 ? percent.toFixed(1) + '%' : Math.round(percent) + '%';
      updateReaderProgress(percent, label);
      if (location.start.cfi) saveProgress(book, percent, { cfi: location.start.cfi });
    };
    rendition.on('relocated', reportLocation);
    rendition.on('selected', function (cfiRange, contents) {
      if (!reader || !cfiRange) return;
      let text = '';
      try {
        text = String(contents.window.getSelection().toString() || '').trim();
      } catch (error) {
        text = '';
      }
      if (!text) return;
      pendingSelection = {
        kind: 'epub',
        bookId: reader.id,
        cfi: cfiRange,
        text: text
      };
      showHighlightBar();
    });
    try {
      await epubBook.locations.generate(1200);
    } catch (error) {
      void error;
    }
    if (saved.cfi) {
      await rendition.display(saved.cfi);
    } else {
      await rendition.display();
    }
    paintHighlights();
    setTimeout(function () {
      try {
        reportLocation(rendition.currentLocation());
      } catch (error) {
        void error;
      }
    }, 120);
    loadToc(epubBook, rendition);
  }

  async function openPdfBook(book, arrayBuffer, saved) {
    if (!window.pdfjsLib) {
      SMA.toast('o leitor de pdf não carregou');
      closeReader();
      return;
    }
    reader.type = 'pdf';
    setTocVisibility(false);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    reader.pdf = pdf;
    reader.pages = pdf.numPages;
    reader.page = SMA.clamp(Number(saved.page) || 1, 1, pdf.numPages);
    el.view.className = 'reader-view reader-view-pdf';
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page';
    el.view.appendChild(canvas);
    await renderPdfPage(canvas);
  }

  async function renderPdfPage(canvas) {
    if (!reader || !reader.pdf) return;
    const page = await reader.pdf.getPage(reader.page);
    const containerWidth = Math.max(280, el.view.clientWidth - 48);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2.4, containerWidth / baseViewport.width);
    const viewport = page.getViewport({ scale: scale });
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(viewport.width * ratio);
    canvas.height = Math.round(viewport.height * ratio);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const percent = (reader.page / reader.pages) * 100;
    updateReaderProgress(percent, reader.page + ' / ' + reader.pages);
    saveProgress({ id: reader.id }, percent, { page: reader.page });
  }

  async function pdfNext(direction) {
    if (!reader || !reader.pdf) return;
    const target = SMA.clamp(reader.page + direction, 1, reader.pages);
    if (target === reader.page) return;
    reader.page = target;
    const canvas = el.view.querySelector('canvas.pdf-page');
    if (canvas) await renderPdfPage(canvas);
  }

  function loadToc(epubBook, rendition) {
    if (!epubBook.loaded || !epubBook.loaded.navigation) {
      setTocVisibility(false);
      return;
    }
    setTocVisibility(false);
    epubBook.loaded.navigation.then(function (navigation) {
      const items = (navigation && navigation.toc) || [];
      el.tocList.textContent = '';
      const walk = function (nodes, depth) {
        nodes.forEach(function (node) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'reader-toc-item';
          button.style.paddingLeft = 14 + depth * 12 + 'px';
          button.textContent = node.label || 'capítulo';
          button.addEventListener('click', function () {
            rendition.display(node.href);
            el.toc.hidden = true;
          });
          el.tocList.appendChild(button);
          if (node.subitems && node.subitems.length) walk(node.subitems, depth + 1);
        });
      };
      walk(items, 0);
      setTocVisibility(items.length > 0);
    }).catch(function () {
      setTocVisibility(false);
    });
  }

  function prevPage() {
    if (!reader) return;
    if (reader.type === 'pdf') { pdfNext(-1); return; }
    if (reader.type === 'text') {
      el.view.scrollBy({ top: -el.view.clientHeight * 0.82, behavior: 'smooth' });
      return;
    }
    if (reader.rendition) reader.rendition.prev();
  }

  function nextPage() {
    if (!reader) return;
    if (reader.type === 'pdf') { pdfNext(1); return; }
    if (reader.type === 'text') {
      el.view.scrollBy({ top: el.view.clientHeight * 0.82, behavior: 'smooth' });
      return;
    }
    if (reader.rendition) reader.rendition.next();
  }

  function seekReader(value) {
    if (!reader) return;
    if (reader.type === 'pdf' && reader.pages) {
      const page = Math.max(1, Math.round((value / 100) * reader.pages));
      reader.page = page;
      const canvas = el.view.querySelector('canvas.pdf-page');
      if (canvas) renderPdfPage(canvas);
      return;
    }
    if (reader.type === 'epub' && reader.book && reader.book.locations && reader.book.locations.length()) {
      const fraction = SMA.clamp(Number(value) / 100, 0, 1);
      const cfi = reader.book.locations.cfiFromPercentage(fraction);
      if (cfi) reader.rendition.display(cfi);
    }
  }

  function bindReader() {
    el.closeButton.addEventListener('click', closeReader);
    el.prevButton.addEventListener('click', prevPage);
    el.nextButton.addEventListener('click', nextPage);
    el.fontSmaller.addEventListener('click', function () {
      SMA.writeJSON(FONT_KEY, SMA.clamp(readerFontSize() - 1, 14, 30));
      applyReaderFontSize();
    });
    el.fontBigger.addEventListener('click', function () {
      SMA.writeJSON(FONT_KEY, SMA.clamp(readerFontSize() + 1, 14, 30));
      applyReaderFontSize();
    });
    el.themeButton.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleModeMenu();
    });
    if (el.modeMenu) {
      SMA.selectAll('.reader-mode-item', el.modeMenu).forEach(function (button) {
        button.addEventListener('click', function () {
          setReaderTheme(button.dataset.theme || 'sepia');
          closeModeMenu();
        });
      });
    }
    if (el.cleanButton) {
      el.cleanButton.addEventListener('click', function () {
        setCleanMode(!readerClean);
      });
    }
    if (el.markButton) {
      el.markButton.addEventListener('click', toggleBookmark);
    }
    if (el.marksButton) {
      el.marksButton.addEventListener('click', function () {
        renderBookmarks();
        el.toc.hidden = !el.toc.hidden;
      });
    }
    if (el.tocButton) {
      el.tocButton.addEventListener('click', function () {
        renderBookmarks();
        el.toc.hidden = !el.toc.hidden;
      });
    }
    if (el.tocClose) {
      el.tocClose.addEventListener('click', function () {
        el.toc.hidden = true;
      });
    }
    el.coverButton.addEventListener('click', function () {
      if (reader) chooseCover(reader.id);
    });
    el.progress.addEventListener('input', function () {
      seekReader(Number(el.progress.value));
      paintMarkButton();
    });
    el.coverInput.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      applyCover(file);
    });

    if (el.highlightClose) {
      el.highlightClose.addEventListener('click', hideHighlightBar);
    }
    if (el.colorAdd) {
      el.colorAdd.addEventListener('click', function () {
        el.colorInput?.click();
      });
    }
    if (el.colorInput) {
      el.colorInput.addEventListener('change', function () {
        const color = String(el.colorInput.value || '').toLowerCase();
        el.colorInput.value = color;
        if (!isHexColor(color)) return;
        addHighlightColor(color);
        if (pendingSelection) applyHighlight(color);
      });
    }

    document.addEventListener('pointerdown', function (event) {
      if (el.modeMenu && !el.modeMenu.hidden) {
        if (!el.modeMenu.contains(event.target) && !(el.themeButton && el.themeButton.contains(event.target))) {
          closeModeMenu();
        }
      }
      if (el.highlightBar && !el.highlightBar.hidden) {
        if (!el.highlightBar.contains(event.target) && event.target !== el.colorInput) {
          hideHighlightBar();
        }
      }
    });

    function scheduleTextSelection() {
      if (!reader || reader.type !== 'text' || el.overlay.hidden) return;
      setTimeout(function () {
        captureTextSelection();
      }, 40);
    }
    document.addEventListener('mouseup', function (event) {
      if (event.target && event.target.closest && event.target.closest('.reader-text-mark, .reader-highlight-bar')) return;
      scheduleTextSelection();
    });
    document.addEventListener('touchend', function (event) {
      if (event.target && event.target.closest && event.target.closest('.reader-text-mark, .reader-highlight-bar')) return;
      scheduleTextSelection();
    });
    document.addEventListener('keyup', function (event) {
      if (event.shiftKey || event.key === 'Shift') scheduleTextSelection();
    });

    document.addEventListener('keydown', function (event) {
      if (el.overlay.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (el.modeMenu && !el.modeMenu.hidden) {
          closeModeMenu();
        } else if (el.highlightBar && !el.highlightBar.hidden) {
          hideHighlightBar();
        } else if (readerClean) {
          setCleanMode(false, false);
        } else {
          closeReader();
        }
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextPage();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevPage();
      }
    });
    el.overlay.addEventListener('click', function (event) {
      if (event.target === el.overlay) closeReader();
    });

    let swipeStart = null;
    el.stage.addEventListener('pointerdown', function (event) {
      if (event.target.closest('button, input, a, .reader-toc, .reader-mode-menu, .reader-highlight-bar')) return;
      swipeStart = { x: event.clientX, y: event.clientY };
    });
    document.addEventListener('pointerup', function (event) {
      if (!swipeStart) return;
      const start = swipeStart;
      swipeStart = null;
      if (event.target.closest && event.target.closest('.reader-toc, .reader-mode-menu, .reader-highlight-bar')) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < 54 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (textSelectionExists()) return;
      ignoreClickUntil = Date.now() + 350;
      lastSwipeAt = Date.now();
      if (dx < 0) nextPage();
      else prevPage();
    });

    el.stage.addEventListener('click', function (event) {
      if (!readerClean) return;
      if (Date.now() < ignoreClickUntil) return;
      if (event.target.closest('button, input, a, .reader-toc, .reader-mode-menu, .reader-highlight-bar')) return;
      if (textSelectionExists()) return;
      const rect = el.stage.getBoundingClientRect();
      if (!rect.width) return;
      turnByRatio((event.clientX - rect.left) / rect.width);
    });
  }

  async function init() {
    root = SMA.select('#books-root');
    if (!root) return;
    el.overlay = SMA.select('#reader-overlay');
    el.closeButton = SMA.select('#reader-close');
    el.prevButton = SMA.select('#reader-prev');
    el.nextButton = SMA.select('#reader-next');
    el.fontSmaller = SMA.select('#reader-font-smaller');
    el.fontBigger = SMA.select('#reader-font-bigger');
    el.themeButton = SMA.select('#reader-theme-btn');
    el.modeMenu = SMA.select('#reader-mode-menu');
    el.cleanButton = SMA.select('#reader-clean-btn');
    el.markButton = SMA.select('#reader-mark-btn');
    el.marksButton = SMA.select('#reader-marks-btn');
    el.tocButton = SMA.select('#reader-toc-btn');
    el.toc = SMA.select('#reader-toc');
    el.tocHead = SMA.select('#reader-toc-head');
    el.tocTitle = SMA.select('#reader-toc-title');
    el.tocClose = SMA.select('#reader-toc-close');
    el.tocList = SMA.select('#reader-toc-list');
    el.marksTitle = SMA.select('#reader-marks-title');
    el.marksList = SMA.select('#reader-marks-list');
    el.coverButton = SMA.select('#reader-cover-btn');
    el.coverInput = SMA.select('#book-cover-input');
    el.view = SMA.select('#reader-view');
    el.stage = SMA.select('.reader-stage');
    el.progress = SMA.select('#reader-progress');
    el.progressLabel = SMA.select('#reader-page-label');
    el.highlightBar = SMA.select('#reader-highlight-bar');
    el.colorList = SMA.select('#reader-color-list');
    el.colorAdd = SMA.select('#reader-color-add');
    el.colorInput = SMA.select('#reader-color-input');
    el.highlightClose = SMA.select('#reader-highlight-close');
    el.readerTitle = SMA.select('#reader-title');
    el.readerAuthor = SMA.select('#reader-author');
    el.readerEditButton = SMA.select('#reader-edit-btn');
    el.importInput = SMA.select('#book-file-input');
    el.threadInput = SMA.select('#thread-link-input');
    el.threadButton = SMA.select('#btn-import-thread');

    if (!el.overlay || !el.view) return;
    readStorage();
    renderHighlightColors();
    setTocVisibility(false);
    const builtin = await loadBuiltin();
    books = builtin.concat(importedMeta.filter(function (book) {
      return !builtin.some(function (item) { return item.id === book.id; });
    }));
    render();
    bindReader();

    SMA.select('#btn-import-book')?.addEventListener('click', function () {
      el.importInput?.click();
    });
    el.importInput?.addEventListener('change', function (event) {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      importFiles(files);
    });
    el.threadButton?.addEventListener('click', importThread);
    el.threadInput?.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        importThread();
      }
    });
    SMA.select('#modal-cancel-book')?.addEventListener('click', closeBookMetaEditor);
    SMA.select('#modal-save-book')?.addEventListener('click', saveBookMeta);
    SMA.select('#btn-book-restore')?.addEventListener('click', restoreBookMetaFields);
    SMA.select('#modal-book')?.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        saveBookMeta();
      }
    });
    el.readerEditButton?.addEventListener('click', function () {
      if (!reader) return;
      const book = allBooks().find(function (item) { return item.id === reader.id; });
      if (book) openBookMetaEditor(book);
    });
  }

  SMA.Books = { init: init };
})();
