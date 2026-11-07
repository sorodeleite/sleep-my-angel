(function () {
  const SMA = window.SMA;
  const META_KEY = 'sma_books';
  const COVER_KEY = 'sma_book_covers';
  const PROGRESS_KEY = 'sma_book_progress';
  const FONT_KEY = 'sma_reader_font';
  const THEME_KEY = 'sma_reader_theme';
  const READER_THEMES = ['sepia', 'light', 'dark'];

  let books = [];
  let importedMeta = [];
  let coverOverrides = {};
  let progress = {};
  let root = null;
  let reader = null;
  let coverTargetId = null;

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
    progress = SMA.readJSON(PROGRESS_KEY, {});
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) progress = {};
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

  function allBooks() {
    const builtins = books.filter(function (book) { return book.builtin; }).map(function (book) {
      return Object.assign({}, book, {
        cover: coverOverrides[book.id] || book.cover
      });
    });
    const imported = books.filter(function (book) { return !book.builtin; }).map(function (book) {
      return Object.assign({}, book, {
        cover: coverOverrides[book.id] || book.cover
      });
    });
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
      label.textContent = Math.round(percent) + '% lido';
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
    delete progress[book.id];
    persistProgress();
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
    if (reader && reader.rendition) {
      try {
        reader.rendition.themes.select(chosen);
      } catch (error) {
        void error;
      }
    }
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
    if (el.tocButton) el.tocButton.hidden = false;
    if (el.progress) el.progress.disabled = false;
    updateReaderProgress(0, '0%');
    setReaderTheme(SMA.readJSON(THEME_KEY, 'sepia'));
    applyReaderFontSize();
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
    if (el.tocButton) el.tocButton.hidden = true;
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
      body: { background: '#f3ecdd', color: '#3b342c', 'font-family': 'Georgia, "Times New Roman", serif', 'line-height': '1.75' },
      'p, li': { 'line-height': '1.75' },
      a: { color: '#8a5c45' }
    });
    rendition.themes.register('light', {
      body: { background: '#ffffff', color: '#1d1d20', 'font-family': 'Georgia, "Times New Roman", serif', 'line-height': '1.75' },
      a: { color: '#345c8c' }
    });
    rendition.themes.register('dark', {
      body: { background: '#242327', color: '#e9e5dc', 'font-family': 'Georgia, "Times New Roman", serif', 'line-height': '1.75' },
      a: { color: '#b9cbe8' }
    });
    setReaderTheme(SMA.readJSON(THEME_KEY, 'sepia'));
    applyReaderFontSize();
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
    if (el.tocButton) el.tocButton.hidden = true;
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
      el.tocButton.hidden = true;
      return;
    }
    el.tocButton.hidden = false;
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
      if (!items.length) el.tocButton.hidden = true;
    }).catch(function () {
      el.tocButton.hidden = true;
    });
  }

  function prevPage() {
    if (!reader) return;
    if (reader.type === 'pdf') { pdfNext(-1); return; }
    if (reader.rendition) reader.rendition.prev();
  }

  function nextPage() {
    if (!reader) return;
    if (reader.type === 'pdf') { pdfNext(1); return; }
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
    el.themeButton.addEventListener('click', function () {
      const current = SMA.readJSON(THEME_KEY, 'sepia');
      const next = READER_THEMES[(READER_THEMES.indexOf(current) + 1) % READER_THEMES.length];
      setReaderTheme(next);
    });
    el.tocButton.addEventListener('click', function () {
      el.toc.hidden = !el.toc.hidden;
    });
    el.coverButton.addEventListener('click', function () {
      if (reader) chooseCover(reader.id);
    });
    el.progress.addEventListener('input', function () {
      seekReader(Number(el.progress.value));
    });
    el.coverInput.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      applyCover(file);
    });
    document.addEventListener('keydown', function (event) {
      if (el.overlay.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeReader();
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
      if (event.pointerType === 'mouse') return;
      if (event.target.closest('button, input, a')) return;
      swipeStart = event.clientX;
    });
    el.stage.addEventListener('pointerup', function (event) {
      if (swipeStart == null) return;
      const distance = event.clientX - swipeStart;
      swipeStart = null;
      if (Math.abs(distance) < 54) return;
      if (distance < 0) nextPage();
      else prevPage();
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
    el.tocButton = SMA.select('#reader-toc-btn');
    el.toc = SMA.select('#reader-toc');
    el.tocList = SMA.select('#reader-toc-list');
    el.coverButton = SMA.select('#reader-cover-btn');
    el.coverInput = SMA.select('#book-cover-input');
    el.view = SMA.select('#reader-view');
    el.stage = SMA.select('.reader-stage');
    el.progress = SMA.select('#reader-progress');
    el.progressLabel = SMA.select('#reader-page-label');
    el.readerTitle = SMA.select('#reader-title');
    el.readerAuthor = SMA.select('#reader-author');
    el.importInput = SMA.select('#book-file-input');
    el.threadInput = SMA.select('#thread-link-input');
    el.threadButton = SMA.select('#btn-import-thread');

    if (!el.overlay || !el.view) return;
    readStorage();
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
  }

  SMA.Books = { init: init };
})();
