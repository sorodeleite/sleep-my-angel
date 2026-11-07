(function () {
  const SMA = window.SMA;

  const DEFAULT_SCRIPT = `# meu script de sono & realidade desejada ‧°
*lei da suposição ‧ odette.exe*

### como eu me sinto agora
- completamente em paz e protegida no meu quarto
- a sensação doce de que tudo que eu desejo já é meu fato consumado
- corpo relaxado, mente silenciosa e serena

### afirmações da noite
- eu não preciso forçar a 3d. a imaginação é a única causa.
- ao fechar meus olhos hoje, eu acordo na versão perfeita da minha vida.
- eu sou grata pela harmonia, pelo descanso profundo e pelo meu futuro brilhante.

### ritual de amanhã
- acordar no meu próprio ritmo
- tomar meu cafezinho com calma
- manter a suposição do meu desejo vivo o dia todo ✨
`;

  const FALLBACK_KEY = 'offline_docs';
  const TEXT_EXT = /\.(md|markdown|txt|html?|csv)$/i;
  const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;

  let docs = [];
  let activeId = null;
  let editor = null;
  let meta = null;
  let list = null;
  let titleInput = null;
  let view = null;
  let importInput = null;
  let saveTimer = null;
  let editing = false;
  let lightbox = null;

  function uniqueId() {
    return 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function countWords(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function normalizeAssets(value) {
    const assets = {};
    if (!value || typeof value !== 'object') return assets;
    Object.keys(value).forEach(function (key) {
      if (typeof value[key] === 'string' && value[key].indexOf('data:image/') === 0) {
        assets[String(key).toLowerCase()] = value[key];
      }
    });
    return assets;
  }

  function normalizeDoc(doc) {
    return {
      id: String(doc.id || uniqueId()),
      title: String(doc.title || 'nota sem título').trim() || 'nota sem título',
      text: String(doc.text || ''),
      source: String(doc.source || 'nota'),
      icon: String(doc.icon || ''),
      assets: normalizeAssets(doc.assets),
      updated: Number(doc.updated) || Date.now(),
      createdAt: Number(doc.createdAt) || Date.now()
    };
  }

  function fallbackDocs() {
    const saved = SMA.readJSON(FALLBACK_KEY, null);
    return Array.isArray(saved) ? saved.map(normalizeDoc) : [];
  }

  function saveFallback() {
    const light = docs.slice(0, 60).map(function (doc) {
      return {
        id: doc.id,
        title: doc.title,
        text: doc.text,
        source: doc.source,
        updated: doc.updated,
        createdAt: doc.createdAt
      };
    });
    SMA.writeJSON(FALLBACK_KEY, light);
  }

  function activeDoc() {
    return docs.find(function (doc) { return doc.id === activeId; }) || null;
  }

  function updateMeta(label) {
    if (!meta || !editor) return;
    const words = countWords(editor.value);
    meta.textContent = words + (words === 1 ? ' palavra' : ' palavras') + (label ? ' ‧ ' + label : '');
  }

  function sourceLabel(source) {
    if (source === 'notion') return 'notion';
    if (source === 'drive') return 'google drive';
    if (source === 'desktop') return 'arquivo local';
    if (source === 'web') return 'navegador';
    return source || 'nota';
  }

  function pageIcon(doc) {
    if (doc.icon) return doc.icon;
    if (doc.source === 'notion') return '📄';
    if (doc.source === 'drive') return '📎';
    return '☾';
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (error) {
      return '';
    }
  }

  function renderList() {
    if (!list) return;
    list.textContent = '';
    if (docs.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'doc-empty';
      empty.textContent = 'nenhuma nota ainda ‧ importe do notion';
      list.appendChild(empty);
      return;
    }
    docs.slice().sort(function (a, b) { return b.updated - a.updated; }).forEach(function (doc) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'doc-item' + (doc.id === activeId ? ' active' : '');
      const icon = document.createElement('span');
      icon.className = 'doc-item-icon';
      icon.textContent = pageIcon(doc);
      const name = document.createElement('strong');
      name.textContent = doc.title;
      const info = document.createElement('span');
      info.className = 'doc-item-sub';
      info.textContent = sourceLabel(doc.source) + ' ‧ ' + formatDate(doc.updated);
      button.appendChild(icon);
      button.appendChild(name);
      button.appendChild(info);
      button.addEventListener('click', function () {
        switchDoc(doc.id);
      });
      list.appendChild(button);
    });
  }

  function paintEditor(doc, label) {
    if (!doc) return;
    titleInput.value = doc.title;
    editor.value = doc.text;
    renderPage(doc);
    updateMeta(label || sourceLabel(doc.source));
    renderList();
  }

  function renderPage(doc) {
    if (!view) return;
    view.textContent = '';
    const crumb = SMA.select('#notion-crumb');
    if (crumb) crumb.textContent = doc.title;
    const icon = SMA.select('#notion-page-icon');
    if (icon) icon.textContent = pageIcon(doc);
    try {
      renderMarkdown(doc.text, doc.assets, view);
    } catch (error) {
      const fallback = createElement('pre', 'notion-code');
      fallback.textContent = doc.text;
      view.appendChild(fallback);
    }
  }

  async function persistDoc(doc, label, showToast) {
    if (!doc) return;
    doc.updated = Date.now();
    if (docStoreAvailable()) {
      await SMA.docStore.put(doc);
    }
    saveFallback();
    if (showToast) SMA.toast('nota guardada ‧°');
    if (label) updateMeta(label);
    renderList();
  }

  function docStoreAvailable() {
    return Boolean(SMA.docStore);
  }

  function switchDoc(id) {
    if (id === activeId) return;
    const previous = activeDoc();
    if (previous) {
      previous.text = editor.value;
      previous.title = titleInput.value.trim() || previous.title;
      persistDoc(previous, null, false);
    }
    const next = docs.find(function (doc) { return doc.id === id; });
    if (!next) return;
    activeId = next.id;
    setEditing(false);
    paintEditor(next);
    const scroll = SMA.select('.notion-scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  function newDoc() {
    const doc = normalizeDoc({
      title: 'nova página',
      text: '',
      source: 'nota'
    });
    docs.unshift(doc);
    activeId = doc.id;
    setEditing(true);
    paintEditor(doc, 'nova');
    persistDoc(doc, 'salvo aqui', false);
    titleInput.focus();
    titleInput.select();
  }

  function deleteDoc() {
    const doc = activeDoc();
    if (!doc) return;
    if (!window.confirm('apagar a nota "' + doc.title + '"?')) return;
    docs = docs.filter(function (item) { return item.id !== doc.id; });
    if (SMA.docStore) SMA.docStore.remove(doc.id);
    const next = docs[0] || null;
    activeId = next ? next.id : null;
    if (next) {
      paintEditor(next);
    } else {
      editor.value = '';
      titleInput.value = '';
      if (view) view.textContent = '';
      updateMeta();
      renderList();
    }
    saveFallback();
    SMA.toast('nota apagada');
  }

  function download() {
    const doc = activeDoc();
    if (!doc) return;
    const text = editor.value;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (titleInput.value.trim() || 'nota-da-noite')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .slice(0, 60) + '.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function setEditing(value) {
    editing = Boolean(value);
    if (view) view.hidden = editing;
    if (editor) editor.hidden = !editing;
    const toggle = SMA.select('#btn-toggle-view');
    if (toggle) toggle.textContent = editing ? 'ler' : 'editar';
  }

  function decodeEntities(value) {
    return String(value)
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (_, hex) { return String.fromCodePoint(parseInt(hex, 16)); })
      .replace(/&#(\d+);/g, function (_, number) { return String.fromCodePoint(parseInt(number, 10)); });
  }

  function htmlToMarkdown(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('script,style,head,meta,link,svg,noscript,iframe').forEach(function (node) {
      node.remove();
    });
    const article = parsed.querySelector('article') || parsed.querySelector('main') || parsed.body;
    if (!article) return parsed.title || '';
    const blocks = [];
    let buffer = '';
    const flush = function () {
      const clean = buffer.replace(/[ \t]+/g, ' ').replace(/\s+\n/g, '\n').trim();
      if (clean) blocks.push(clean);
      buffer = '';
    };
    const walk = function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        buffer += node.nodeValue;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if (/^(h1|h2|h3|h4|h5|h6)$/.test(tag)) {
        flush();
        const level = Number(tag.slice(1));
        buffer += '\n' + '#'.repeat(level) + ' ' + node.textContent.trim() + '\n';
        flush();
        return;
      }
      if (tag === 'li') {
        flush();
        buffer += '- ' + node.textContent.trim() + '\n';
        flush();
        return;
      }
      if (tag === 'img') {
        flush();
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '';
        if (src) buffer += '![' + alt + '](' + src + ')\n';
        flush();
        return;
      }
      if (tag === 'br') {
        buffer += '\n';
        return;
      }
      if (tag === 'pre') {
        flush();
        buffer += '```\n' + node.textContent + '\n```\n';
        flush();
        return;
      }
      if (tag === 'blockquote') {
        flush();
        const quote = node.textContent.trim().split('\n').map(function (line) {
          return '> ' + line;
        }).join('\n');
        buffer += quote + '\n';
        flush();
        return;
      }
      if (/^(p|div|section|article|tr|table|ul|ol)$/.test(tag)) {
        flush();
        Array.prototype.forEach.call(node.childNodes, walk);
        flush();
        return;
      }
      Array.prototype.forEach.call(node.childNodes, walk);
    };
    Array.prototype.forEach.call(article.childNodes, walk);
    flush();
    return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function docxToText(arrayBuffer) {
    if (!window.fflate) return '';
    const files = window.fflate.unzipSync(new Uint8Array(arrayBuffer));
    const target = Object.keys(files).find(function (name) { return /word\/document\.xml$/i.test(name); });
    if (!target) return '';
    const xml = new TextDecoder('utf-8').decode(files[target]);
    return decodeEntities(
      xml
        .replace(/<w:tab\/?>/gi, '\t')
        .replace(/<w:br\/?>/gi, '\n')
        .replace(/<\/w:p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    ).replace(/\n{3,}/g, '\n\n').trim();
  }

  async function pdfToText(arrayBuffer) {
    if (!window.pdfjsLib) return '';
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const pages = [];
      const limit = Math.min(pdf.numPages, 80);
      for (let index = 1; index <= limit; index += 1) {
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        pages.push(content.items.map(function (item) { return item.str; }).join(' '));
      }
      return pages.join('\n\n').replace(/[ \t]+/g, ' ').trim();
    } catch (error) {
      return '';
    }
  }

  function splitCsvLine(line) {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function csvToMarkdown(text) {
    const rows = text.split(/\r?\n/).filter(function (line) { return line.trim(); }).slice(0, 200);
    if (rows.length === 0) return text;
    const table = rows.map(splitCsvLine);
    const columns = Math.max.apply(null, table.map(function (row) { return row.length; }));
    table.forEach(function (row) {
      while (row.length < columns) row.push('');
    });
    const header = '| ' + table[0].map(function (cell) { return cell.replace(/\|/g, '\\|'); }).join(' | ') + ' |';
    const divider = '| ' + table[0].map(function () { return '---'; }).join(' | ') + ' |';
    const body = table.slice(1).map(function (row) {
      return '| ' + row.map(function (cell) { return cell.replace(/\|/g, '\\|'); }).join(' | ') + ' |';
    });
    return [header, divider].concat(body).join('\n');
  }

  function normalizePath(value) {
    let path = String(value || '');
    try {
      path = decodeURIComponent(path);
    } catch (error) {
      path = path;
    }
    return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\s+/g, ' ');
  }

  function baseName(value) {
    const parts = normalizePath(value).split('/');
    return parts[parts.length - 1];
  }

  function dirName(value) {
    const parts = normalizePath(value).split('/');
    parts.pop();
    return parts.join('/');
  }

  function collectImageRefs(text) {
    const refs = [];
    const seen = new Set();
    const markdown = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    const html = /<img[^>]+src=["']([^"']+)["']/gi;
    let match = markdown.exec(text);
    while (match) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        refs.push(match[1]);
      }
      match = markdown.exec(text);
    }
    match = html.exec(text);
    while (match) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        refs.push(match[1]);
      }
      match = html.exec(text);
    }
    return refs;
  }

  function assetKeyFor(ref, baseDir, lookup) {
    if (/^(https?:|data:|blob:)/i.test(ref)) return null;
    const clean = normalizePath(ref);
    const candidates = [];
    if (baseDir) candidates.push(baseDir + '/' + clean);
    candidates.push(clean);
    candidates.push(baseName(clean));
    for (const candidate of candidates) {
      const key = candidate.toLowerCase();
      if (lookup[key]) return lookup[key];
    }
    const wanted = baseName(clean).toLowerCase();
    const keys = Object.keys(lookup);
    for (const key of keys) {
      if (key.endsWith('/' + wanted)) return lookup[key];
    }
    return null;
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { resolve(''); };
      reader.readAsDataURL(blob);
    });
  }

  function canvasHasAlpha(canvas) {
    try {
      const context = canvas.getContext('2d');
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 3; index < data.length; index += 4 * 37) {
        if (data[index] < 250) return true;
      }
    } catch (error) {
      return true;
    }
    return false;
  }

  async function imageToDataUrl(blob, limit) {
    const max = limit || 1400;
    try {
      if (blob.size < 260 * 1024) return await blobToDataUrl(blob);
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0, width, height);
      if (typeof bitmap.close === 'function') bitmap.close();
      const type = /png|gif|webp/i.test(blob.type) && canvasHasAlpha(canvas) ? 'image/png' : 'image/jpeg';
      return canvas.toDataURL(type, 0.84);
    } catch (error) {
      return blobToDataUrl(blob);
    }
  }

  async function assetsForText(text, baseDir, lookup) {
    const assets = {};
    const refs = collectImageRefs(text);
    for (const ref of refs) {
      if (/^(https?:|data:|blob:)/i.test(ref)) continue;
      const source = assetKeyFor(ref, baseDir, lookup);
      if (!source) continue;
      try {
        const blob = source.blob || new Blob([source.bytes], { type: source.type || '' });
        const dataUrl = await imageToDataUrl(blob);
        if (!dataUrl) continue;
        const clean = normalizePath(ref).toLowerCase();
        const name = baseName(ref).toLowerCase();
        assets[clean] = dataUrl;
        assets[name] = dataUrl;
        if (baseDir) assets[(baseDir + '/' + clean).toLowerCase()] = dataUrl;
      } catch (error) {
        continue;
      }
    }
    return assets;
  }

  function lookupFromZip(files) {
    const lookup = {};
    const names = Object.keys(files);
    names.forEach(function (name) {
      if (!IMAGE_EXT.test(name) || /(^|\/)(__MACOSX|\.)/.test(name)) return;
      const bytes = files[name];
      const type = /\.png$/i.test(name) ? 'image/png'
        : /\.jpe?g$/i.test(name) ? 'image/jpeg'
          : /\.gif$/i.test(name) ? 'image/gif'
            : /\.webp$/i.test(name) ? 'image/webp'
              : /\.svg$/i.test(name) ? 'image/svg+xml'
                : '';
      lookup[normalizePath(name).toLowerCase()] = { bytes: bytes, type: type };
      const short = baseName(name).toLowerCase();
      if (!lookup[short]) lookup[short] = lookup[normalizePath(name).toLowerCase()];
    });
    return lookup;
  }

  async function importZip(arrayBuffer) {
    if (!window.fflate) {
      SMA.toast('não consegui abrir o zip neste navegador');
      return 0;
    }
    let files;
    try {
      files = window.fflate.unzipSync(new Uint8Array(arrayBuffer));
    } catch (error) {
      SMA.toast('esse zip parece quebrado');
      return 0;
    }
    const lookup = lookupFromZip(files);
    const names = Object.keys(files).filter(function (name) {
      return TEXT_EXT.test(name) && !/(^|\/)(__MACOSX|\.)/.test(name);
    }).slice(0, 80);
    let imported = 0;
    let lastDoc = null;
    for (const name of names) {
      const bytes = files[name];
      const raw = new TextDecoder('utf-8').decode(bytes);
      const isCsv = /\.csv$/i.test(name);
      const isHtml = /\.html?$/i.test(name);
      let text = isCsv ? csvToMarkdown(raw) : (isHtml ? htmlToMarkdown(raw) : raw);
      const header = text.match(/^\s*#\s+(.+?)\s*$/m);
      const fileTitle = SMA.fileNameTitle(name.split('/').pop());
      let title = fileTitle;
      if (header) {
        title = header[1].trim() || fileTitle;
        text = text.replace(/^\s*#\s+.+?\s*$/m, '').replace(/^\s+/, '');
      }
      if (!text.trim()) continue;
      const assets = await assetsForText(text, dirName(name), lookup);
      lastDoc = addImportedDoc({
        title: title,
        text: text,
        source: 'notion',
        assets: assets
      });
      imported += 1;
    }
    if (names.length === 0) SMA.toast('nenhuma nota de texto dentro do zip');
    return { count: imported, lastDoc: lastDoc };
  }

  function addImportedDoc(data) {
    const doc = normalizeDoc({
      title: data.title || 'nota importada',
      text: data.text,
      source: data.source || 'notion',
      assets: data.assets || {}
    });
    docs.unshift(doc);
    if (SMA.docStore) SMA.docStore.put(doc);
    return doc;
  }

  function lookupFromFiles(files) {
    const lookup = {};
    files.forEach(function (file) {
      if (!IMAGE_EXT.test(file.name) && !/^image\//.test(file.type || '')) return;
      const path = normalizePath(file.webkitRelativePath || file.name);
      lookup[path.toLowerCase()] = { blob: file, type: file.type };
      const short = baseName(path).toLowerCase();
      if (!lookup[short]) lookup[short] = lookup[path.toLowerCase()];
    });
    return lookup;
  }

  async function importFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    const lookup = lookupFromFiles(list);
    let imported = 0;
    let lastDoc = null;
    for (const file of list) {
      const lower = file.name.toLowerCase();
      try {
        if (/\.docx$/i.test(lower)) {
          const text = docxToText(await file.arrayBuffer());
          if (text.trim()) {
            lastDoc = addImportedDoc({ title: SMA.fileNameTitle(file.name), text: text, source: 'drive' });
            imported += 1;
          }
        } else if (/\.pdf$/i.test(lower)) {
          const text = await pdfToText(await file.arrayBuffer());
          if (text.trim()) {
            lastDoc = addImportedDoc({ title: SMA.fileNameTitle(file.name), text: text, source: 'drive' });
            imported += 1;
          } else {
            SMA.toast('não consegui ler o texto desse pdf');
          }
        } else if (/\.zip$/i.test(lower)) {
          const result = await importZip(await file.arrayBuffer());
          imported += result.count;
          if (result.lastDoc) lastDoc = result.lastDoc;
        } else if (TEXT_EXT.test(lower)) {
          const raw = await file.text();
          const isCsv = /\.csv$/i.test(lower);
          const isHtml = /\.html?$/i.test(lower);
          let text = isCsv ? csvToMarkdown(raw) : (isHtml ? htmlToMarkdown(raw) : raw);
          const header = text.match(/^\s*#\s+(.+?)\s*$/m);
          let title = SMA.fileNameTitle(file.name);
          if (header) {
            title = header[1].trim() || title;
            text = text.replace(/^\s*#\s+.+?\s*$/m, '').replace(/^\s+/, '');
          }
          if (!text.trim()) continue;
          const assets = await assetsForText(text, '', lookup);
          lastDoc = addImportedDoc({ title: title, text: text, source: 'notion', assets: assets });
          imported += 1;
        }
      } catch (error) {
        continue;
      }
    }
    if (imported === 0) {
      SMA.toast('não encontrei texto pra importar');
      return;
    }
    saveFallback();
    const target = lastDoc || docs[0];
    activeId = target.id;
    setEditing(false);
    paintEditor(target, 'importado');
    await persistDoc(target, 'salvo offline', false);
    SMA.toast(imported + (imported === 1 ? ' nota importada' : ' notas importadas') + ' ‧°');
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function safeUrl(value) {
    const url = String(value || '').trim();
    if (/^(https?:|mailto:)/i.test(url)) return url;
    if (url.indexOf('#') === 0) return url;
    return '';
  }

  function inlineNodes(text) {
    const fragment = document.createDocumentFragment();
    const source = String(text || '');
    const pattern = /(\*\*|__)([^]*?)\1|(\*|_)([^]*?)\3|~~([^]*?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<br\s*\/?>|<u>([^]*?)<\/u>/g;
    let last = 0;
    let match = pattern.exec(source);
    while (match) {
      if (match.index > last) fragment.appendChild(document.createTextNode(source.slice(last, match.index)));
      if (match[2] != null) {
        fragment.appendChild(createElement('strong', '', match[2]));
      } else if (match[4] != null) {
        fragment.appendChild(createElement('em', '', match[4]));
      } else if (match[5] != null) {
        fragment.appendChild(createElement('s', '', match[5]));
      } else if (match[6] != null) {
        fragment.appendChild(createElement('code', '', match[6]));
      } else if (match[7] != null) {
        const href = safeUrl(match[8]);
        if (href) {
          const link = createElement('a', '', match[7]);
          link.href = href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          fragment.appendChild(link);
        } else {
          fragment.appendChild(document.createTextNode(match[7]));
        }
      } else if (match[9] != null) {
        fragment.appendChild(createElement('u', '', match[9]));
      } else {
        fragment.appendChild(document.createElement('br'));
      }
      last = pattern.lastIndex;
      match = pattern.exec(source);
    }
    if (last < source.length) fragment.appendChild(document.createTextNode(source.slice(last)));
    return fragment;
  }

  function resolveImage(source, assets) {
    const url = String(source || '').trim();
    if (!url) return '';
    if (/^(data:|blob:|https?:)/i.test(url)) return url;
    const map = assets || {};
    const clean = normalizePath(url).toLowerCase();
    if (map[clean]) return map[clean];
    const name = baseName(url).toLowerCase();
    if (map[name]) return map[name];
    const keys = Object.keys(map);
    for (const key of keys) {
      if (key.endsWith('/' + name)) return map[key];
    }
    return '';
  }

  function imageFigure(source, alt, assets) {
    const figure = createElement('figure', 'notion-image');
    const url = resolveImage(source, assets);
    if (!url) {
      const missing = createElement('div', 'notion-image-missing');
      missing.appendChild(createElement('span', '', '🖼'));
      missing.appendChild(createElement('span', '', alt || 'imagem não encontrada'));
      figure.appendChild(missing);
      return figure;
    }
    const image = document.createElement('img');
    image.src = url;
    image.alt = alt || '';
    image.loading = 'lazy';
    image.addEventListener('click', function () {
      openLightbox(url, alt);
    });
    figure.appendChild(image);
    if (alt) figure.appendChild(createElement('figcaption', '', alt));
    return figure;
  }

  function openLightbox(url, alt) {
    if (!lightbox) {
      lightbox = createElement('div', 'notion-lightbox');
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-label', 'imagem da nota');
      lightbox.addEventListener('click', function () {
        lightbox.classList.remove('open');
      });
      document.body.appendChild(lightbox);
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') lightbox.classList.remove('open');
      });
    }
    lightbox.textContent = '';
    const image = document.createElement('img');
    image.src = url;
    image.alt = alt || '';
    lightbox.appendChild(image);
    lightbox.classList.add('open');
  }

  function parseTable(lines, start) {
    const header = lines[start];
    if (header.indexOf('|') === -1) return null;
    if (start + 1 >= lines.length) return null;
    if (!/^\s*\|?\s*:?-{2,}/.test(lines[start + 1])) return null;
    const rows = [];
    let index = start;
    while (index < lines.length && lines[index].indexOf('|') !== -1) {
      rows.push(lines[index]);
      index += 1;
    }
    const table = createElement('table', 'notion-table');
    rows.forEach(function (line, rowIndex) {
      if (rowIndex === 1) return;
      const cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|');
      const row = document.createElement('tr');
      cells.forEach(function (cell) {
        const node = document.createElement(rowIndex === 0 ? 'th' : 'td');
        node.appendChild(inlineNodes(cell.trim().replace(/\\\|/g, '|')));
        row.appendChild(node);
      });
      table.appendChild(row);
    });
    return { table: table, next: index };
  }

  function parseHtmlBlock(html, assets) {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    holder.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(function (node) {
      node.remove();
    });
    holder.querySelectorAll('*').forEach(function (node) {
      Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
        if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      });
    });
    const first = holder.firstElementChild;
    if (!first) return null;
    const tag = first.tagName.toLowerCase();
    if (tag === 'aside') {
      const text = first.textContent.trim();
      const callout = createElement('div', 'notion-callout');
      const match = text.match(/^(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*)\s*/u);
      const icon = match ? match[1] : '💡';
      const body = match ? text.slice(match[0].length) : text;
      callout.appendChild(createElement('span', 'notion-callout-icon', icon));
      callout.appendChild(createElement('p', '', body));
      return callout;
    }
    if (tag === 'details') {
      const details = document.createElement('details');
      const summary = first.querySelector('summary');
      details.appendChild(createElement('summary', '', summary ? summary.textContent : 'abrir'));
      const body = createElement('div', 'notion-details-body');
      body.appendChild(inlineNodes(first.textContent.replace(summary ? summary.textContent : '', '').trim()));
      details.appendChild(body);
      return details;
    }
    if (tag === 'table') {
      const table = createElement('table', 'notion-table');
      first.querySelectorAll('tr').forEach(function (row) {
        const line = document.createElement('tr');
        Array.prototype.forEach.call(row.children, function (cell) {
          const node = document.createElement(cell.tagName.toLowerCase() === 'th' ? 'th' : 'td');
          node.appendChild(inlineNodes(cell.textContent));
          if (cell.getAttribute('colspan')) node.colSpan = Number(cell.getAttribute('colspan')) || 1;
          line.appendChild(node);
        });
        table.appendChild(line);
      });
      return table;
    }
    const figure = first.querySelector('img');
    if (figure) return imageFigure(figure.getAttribute('src'), figure.getAttribute('alt'), assets);
    return null;
  }

  function renderMarkdown(text, assets, container) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    let index = 0;
    let firstBlock = true;
    const doc = activeDoc();
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = line.match(/^\s*(```+|~~~+)\s*([\w-]*)\s*$/);
      if (fence) {
        const marker = fence[1][0];
        const codeLines = [];
        index += 1;
        while (index < lines.length && !new RegExp('^\\s*' + marker + '{3,}\\s*$').test(lines[index])) {
          codeLines.push(lines[index]);
          index += 1;
        }
        index += 1;
        const block = createElement('pre', 'notion-code');
        block.appendChild(createElement('code', '', codeLines.join('\n')));
        container.appendChild(block);
        firstBlock = false;
        continue;
      }

      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        const content = heading[2].replace(/\s+#+\s*$/, '').trim();
        if (!(firstBlock && level === 1 && doc && similarTitle(content, doc.title))) {
          const title = document.createElement('h' + Math.min(level, 4));
          title.className = 'notion-h' + Math.min(level, 4);
          title.appendChild(inlineNodes(content));
          container.appendChild(title);
        }
        firstBlock = false;
        index += 1;
        continue;
      }

      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
        container.appendChild(createElement('hr', 'notion-divider'));
        firstBlock = false;
        index += 1;
        continue;
      }

      if (line.trim().indexOf('<') === 0) {
        const open = line.trim().match(/^<(table|aside|details|figure)\b/i);
        if (open) {
          const tag = open[1].toLowerCase();
          const blockLines = [];
          let depth = 0;
          while (index < lines.length) {
            const current = lines[index];
            blockLines.push(current);
            const opens = (current.match(new RegExp('<' + tag + '\\b', 'gi')) || []).length;
            const closes = (current.match(new RegExp('</' + tag + '>', 'gi')) || []).length;
            depth += opens - closes;
            index += 1;
            if (depth <= 0) break;
          }
          const block = parseHtmlBlock(blockLines.join('\n'), assets);
          if (block) container.appendChild(block);
          firstBlock = false;
          continue;
        }
        const imageTag = line.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
        if (imageTag) {
          container.appendChild(imageFigure(imageTag[1], '', assets));
          firstBlock = false;
          index += 1;
          continue;
        }
      }

      const imageLine = line.match(/^\s*!\[([^\]]*)\]\((.*?)\)\s*$/);
      if (imageLine) {
        container.appendChild(imageFigure(imageLine[2], imageLine[1], assets));
        firstBlock = false;
        index += 1;
        continue;
      }

      const table = parseTable(lines, index);
      if (table) {
        container.appendChild(table.table);
        firstBlock = false;
        index = table.next;
        continue;
      }

      if (/^\s*>/.test(line)) {
        const quoteLines = [];
        while (index < lines.length && /^\s*>/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
          index += 1;
        }
        const quote = createElement('blockquote', 'notion-quote');
        quote.appendChild(inlineNodes(quoteLines.join(' ')));
        container.appendChild(quote);
        firstBlock = false;
        continue;
      }

      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        const result = parseList(lines, index);
        container.appendChild(result.list);
        index = result.next;
        firstBlock = false;
        continue;
      }

      if (line.trim().charAt(0) === '<') {
        const holder = document.createElement('div');
        holder.innerHTML = line;
        const text = (holder.textContent || '').trim();
        if (text) {
          const p = createElement('p', 'notion-p');
          p.appendChild(inlineNodes(text));
          container.appendChild(p);
        }
        index += 1;
        firstBlock = false;
        continue;
      }

      const paragraph = [];
      while (index < lines.length && lines[index].trim()) {
        const current = lines[index];
        if (/^\s*(#{1,6})\s+/.test(current) || /^\s*(```|~~~)/.test(current) || /^\s*>/.test(current)) break;
        if (/^\s*([-*+]|\d+[.)])\s+/.test(current)) break;
        if (current.trim().indexOf('<') === 0) break;
        if (/^\s*!\[[^\]]*\]\(/.test(current)) break;
        paragraph.push(current);
        index += 1;
      }
      if (paragraph.length === 0) {
        index += 1;
        continue;
      }
      const p = createElement('p', 'notion-p');
      p.appendChild(inlineNodes(paragraph.join(' ')));
      container.appendChild(p);
      firstBlock = false;
    }
  }

  function similarTitle(left, right) {
    const clean = function (value) {
      return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    };
    return clean(left) === clean(right);
  }

  function parseList(lines, start) {
    const first = lines[start].match(/^(\s*)([-*+]|\d+[.)])\s+/);
    const root = document.createElement(first && /\d+[.)]/.test(first[2]) ? 'ol' : 'ul');
    root.className = 'notion-list';
    const firstIndent = first ? first[1].replace(/\t/g, '    ').length : 0;
    const stack = [{ indent: firstIndent, list: root, item: null }];
    let index = start;
    while (index < lines.length) {
      const line = lines[index];
      const match = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (!match) break;
      const indent = match[1].replace(/\t/g, '    ').length;
      const isOrdered = /\d+[.)]/.test(match[2]);
      const content = match[3];
      const todo = content.match(/^\[([ xX])\]\s+(.*)$/);
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }
      let top = stack[stack.length - 1];
      if (top.item && indent > top.indent) {
        const nested = document.createElement(isOrdered ? 'ol' : 'ul');
        nested.className = 'notion-list';
        top.item.appendChild(nested);
        stack.push({ indent: indent, list: nested, item: null });
        top = stack[stack.length - 1];
      }
      const item = document.createElement('li');
      if (todo) {
        item.className = 'notion-todo';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo[1].toLowerCase() === 'x';
        label.appendChild(checkbox);
        label.appendChild(inlineNodes(todo[2]));
        item.appendChild(label);
        if (checkbox.checked) item.classList.add('is-done');
      } else {
        item.appendChild(inlineNodes(content));
      }
      top.list.appendChild(item);
      top.item = item;
      index += 1;
    }
    return { list: root, next: index };
  }

  async function init() {
    editor = SMA.select('#script-editor');
    meta = SMA.select('#script-meta');
    list = SMA.select('#doc-list');
    titleInput = SMA.select('#doc-title-input');
    view = SMA.select('#doc-view');
    importInput = SMA.select('#doc-file-input');
    if (!editor || !titleInput) return;

    docs = [];
    if (SMA.docStore) {
      try {
        docs = (await SMA.docStore.all()).map(normalizeDoc);
      } catch (error) {
        docs = [];
      }
    }
    if (docs.length === 0) docs = fallbackDocs();
    if (docs.length === 0) {
      let content = DEFAULT_SCRIPT;
      let source = 'nota';
      let title = 'meu script de sono';
      if (window.api) {
        try {
          const file = await window.api.getScriptFile();
          if (file && typeof file.text === 'string' && file.text.trim()) {
            content = file.text;
            source = 'desktop';
          }
        } catch (error) {
          source = 'nota';
        }
      }
      const local = SMA.readText('offline_script', '');
      if (local.trim()) {
        content = local;
        source = 'web';
      }
      const heading = content.match(/^\s*#\s+(.+?)\s*$/m);
      if (heading) {
        title = heading[1].trim();
        content = content.replace(/^\s*#\s+.+?\s*$/m, '').replace(/^\s+/, '');
      }
      docs = [normalizeDoc({
        title: title,
        text: content,
        source: source
      })];
      if (SMA.docStore) await SMA.docStore.put(docs[0]);
      saveFallback();
    }

    activeId = docs[0].id;
    setEditing(false);
    paintEditor(docs[0]);

    importInput?.addEventListener('change', function (event) {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      importFiles(files);
    });

    document.addEventListener('keydown', function (event) {
      if (!document.getElementById('tab-notion')?.classList.contains('active')) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      saveNow(true);
    });

    editor.addEventListener('input', function () {
      const doc = activeDoc();
      if (!doc) return;
      doc.text = editor.value;
      updateMeta('salvando...');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        persistDoc(doc, 'salvo aqui', false);
      }, 450);
    });

    titleInput.addEventListener('input', function () {
      const doc = activeDoc();
      if (!doc) return;
      doc.title = titleInput.value.trim() || 'nota sem título';
      const crumb = SMA.select('#notion-crumb');
      if (crumb) crumb.textContent = doc.title;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        persistDoc(doc, 'salvo aqui', false);
      }, 450);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !lightbox) return;
      lightbox.classList.remove('open');
    });

    SMA.select('#btn-import-doc')?.addEventListener('click', function () {
      importInput?.click();
    });
    SMA.select('#btn-new-doc')?.addEventListener('click', newDoc);
    SMA.select('#btn-delete-doc')?.addEventListener('click', deleteDoc);
    SMA.select('#btn-toggle-view')?.addEventListener('click', function () {
      setEditing(!editing);
      if (editing) {
        editor.focus();
      } else {
        const doc = activeDoc();
        if (doc) renderPage(doc);
      }
    });
    SMA.select('#btn-save-script')?.addEventListener('click', function () {
      saveNow(true);
    });
    SMA.select('#btn-download-script')?.addEventListener('click', download);

    window.addEventListener('beforeunload', function () {
      const doc = activeDoc();
      if (doc) {
        doc.text = editor.value;
        doc.title = titleInput.value.trim() || doc.title;
        saveFallback();
      }
    });
  }

  async function saveNow(showFeedback) {
    const doc = activeDoc();
    if (!doc) return;
    doc.text = editor.value;
    doc.title = titleInput.value.trim() || 'nota sem título';
    if (docStoreAvailable()) await SMA.docStore.put(doc);
    saveFallback();
    if (window.api) {
      try {
        await window.api.saveScriptFile({
          text: editor.value,
          updated: new Date().toISOString()
        });
      } catch (error) {
        saveFallback();
      }
    }
    if (!editing) renderPage(doc);
    updateMeta('salvo');
    renderList();
    if (showFeedback) SMA.toast('nota guardada ‧°');
  }

  SMA.ScriptNotes = { init: init };
})();
