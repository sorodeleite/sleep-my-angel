(function () {
  const SMA = window.SMA;

  const DEFAULT_SCRIPT = `# meu script de sono & realidade desejada ‧°
*lei da suposição ‧ odette.exe*

### 1. como eu me sinto agora
- completamente em paz e protegida no meu quarto
- a sensação doce de que tudo que eu desejo já é meu fato consumado
- corpo relaxado, mente silenciosa e serena

### 2. afirmações da noite
- eu não preciso forçar a 3d. a imaginação é a única causa.
- ao fechar meus olhos hoje, eu acordo na versão perfeita da minha vida.
- eu sou grata pela harmonia, pelo descanso profundo e pelo meu futuro brilhante.

### 3. ritual de amanhã
- acordar no meu próprio ritmo
- tomar meu cafezinho com calma
- manter a suposição do meu desejo vivo o dia todo ✨
`;
  const FALLBACK_KEY = 'offline_docs';
  const TEXT_EXT = /\.(md|markdown|txt|html?|json|csv)$/i;

  let docs = [];
  let activeId = null;
  let editor = null;
  let meta = null;
  let list = null;
  let titleInput = null;
  let importInput = null;
  let saveTimer = null;

  function uniqueId() {
    return 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function countWords(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function normalizeDoc(doc) {
    return {
      id: String(doc.id || uniqueId()),
      title: String(doc.title || 'nota sem título').trim() || 'nota sem título',
      text: String(doc.text || ''),
      source: String(doc.source || 'nota'),
      updated: Number(doc.updated) || Date.now(),
      createdAt: Number(doc.createdAt) || Date.now()
    };
  }

  function fallbackDocs() {
    const saved = SMA.readJSON(FALLBACK_KEY, null);
    return Array.isArray(saved) ? saved.map(normalizeDoc) : [];
  }

  function saveFallback() {
    SMA.writeJSON(FALLBACK_KEY, docs.slice(0, 60));
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
      empty.textContent = 'nenhuma nota ainda ‧ importe do notion ou do drive';
      list.appendChild(empty);
      return;
    }
    docs.slice().sort(function (a, b) { return b.updated - a.updated; }).forEach(function (doc) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'doc-item' + (doc.id === activeId ? ' active' : '');
      const name = document.createElement('strong');
      name.textContent = doc.title;
      const info = document.createElement('span');
      info.textContent = sourceLabel(doc.source) + ' ‧ ' + formatDate(doc.updated);
      button.appendChild(name);
      button.appendChild(info);
      button.addEventListener('click', function () {
        switchDoc(doc.id);
      });
      list.appendChild(button);
    });
  }

  function paintEditor(doc, label) {
    if (!editor || !doc) return;
    titleInput.value = doc.title;
    editor.value = doc.text;
    updateMeta(label || sourceLabel(doc.source));
    renderList();
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
    paintEditor(next);
  }

  function newDoc() {
    const doc = normalizeDoc({
      title: 'nova nota',
      text: '',
      source: 'nota'
    });
    docs.unshift(doc);
    activeId = doc.id;
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

  function htmlToText(html) {
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
        buffer += '\n' + '#'.repeat(level) + ' ' + node.textContent + '\n';
        flush();
        return;
      }
      if (tag === 'li') {
        flush();
        buffer += '- ' + node.textContent + '\n';
        flush();
        return;
      }
      if (tag === 'br') {
        buffer += '\n';
        return;
      }
      if (/^(p|div|section|article|blockquote|pre|tr|table|ul|ol)$/.test(tag)) {
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
        // eslint-disable-next-line no-await-in-loop
        const page = await pdf.getPage(index);
        // eslint-disable-next-line no-await-in-loop
        const content = await page.getTextContent();
        pages.push(content.items.map(function (item) { return item.str; }).join(' '));
      }
      return pages.join('\n\n').replace(/[ \t]+/g, ' ').trim();
    } catch (error) {
      return '';
    }
  }

  function textFromZipFile(name, bytes) {
    const lower = name.toLowerCase();
    const text = new TextDecoder('utf-8').decode(bytes);
    if (/\.html?$/.test(lower)) return htmlToText(text);
    if (/\.json$/.test(lower)) return jsonToText(text);
    return text;
  }

  function jsonToText(text) {
    try {
      const data = JSON.parse(text);
      if (data && typeof data.text === 'string') return data.text;
      if (data && typeof data.content === 'string') return data.content;
      if (data && Array.isArray(data.results)) {
        return data.results.map(function (item) { return item.text || ''; }).join('\n');
      }
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return text;
    }
  }

  async function importZip(arrayBuffer, baseName) {
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
    const names = Object.keys(files).filter(function (name) {
      return TEXT_EXT.test(name) && !/(^|\/)(__MACOSX|\.)/.test(name);
    }).slice(0, 60);
    for (const name of names) {
      const text = textFromZipFile(name, files[name]);
      if (text.trim()) {
        addImportedDoc({
          title: SMA.fileNameTitle(name.split('/').pop()),
          text: text,
          source: 'notion'
        });
      }
    }
    if (names.length === 0) SMA.toast('nenhuma nota de texto dentro do zip');
    return names.length;
  }

  function addImportedDoc(data) {
    const doc = normalizeDoc({
      title: data.title || 'nota importada',
      text: data.text,
      source: data.source || 'notion'
    });
    docs.unshift(doc);
    if (SMA.docStore) SMA.docStore.put(doc);
    return doc;
  }

  async function importFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
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
          const count = await importZip(await file.arrayBuffer(), file.name);
          imported += count;
        } else if (TEXT_EXT.test(lower)) {
          const raw = await file.text();
          const text = /\.html?$/i.test(lower) ? htmlToText(raw) : (/\.json$/i.test(lower) ? jsonToText(raw) : raw);
          if (text.trim()) {
            lastDoc = addImportedDoc({
              title: SMA.fileNameTitle(file.name),
              text: text,
              source: lower.indexOf('html') !== -1 ? 'notion' : 'notion'
            });
            imported += 1;
          }
        }
      } catch (error) {
        void error;
      }
    }
    if (imported === 0) {
      SMA.toast('não encontrei texto pra importar');
      return;
    }
    saveFallback();
    const target = lastDoc || docs[0];
    activeId = target.id;
    paintEditor(target, 'importado');
    await persistDoc(target, 'salvo offline', false);
    SMA.toast(imported + (imported === 1 ? ' nota importada' : ' notas importadas') + ' ‧°');
  }

  async function init() {
    editor = SMA.select('#script-editor');
    meta = SMA.select('#script-meta');
    list = SMA.select('#doc-list');
    titleInput = SMA.select('#doc-title-input');
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
      if (window.api) {
        try {
          const file = await window.api.getScriptFile();
          if (file && typeof file.text === 'string' && file.text.trim()) {
            content = file.text;
            source = 'desktop';
          }
        } catch (error) {
          void error;
        }
      }
      const local = SMA.readText('offline_script', '');
      if (local.trim()) {
        content = local;
        source = 'web';
      }
      docs = [normalizeDoc({
        title: 'meu script de sono',
        text: content,
        source: source
      })];
      if (SMA.docStore) await SMA.docStore.put(docs[0]);
      saveFallback();
    }

    activeId = docs[0].id;
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
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        persistDoc(doc, 'salvo aqui', false);
      }, 450);
    });

    SMA.select('#btn-import-doc')?.addEventListener('click', function () {
      importInput?.click();
    });
    SMA.select('#btn-new-doc')?.addEventListener('click', newDoc);
    SMA.select('#btn-delete-doc')?.addEventListener('click', deleteDoc);
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
        void error;
      }
    }
    updateMeta('salvo');
    renderList();
    if (showFeedback) SMA.toast('nota guardada ‧°');
  }

  SMA.ScriptNotes = { init: init };
})();
