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
    resizeDocTitle();
    renderPage(doc);
    updateMeta(label || sourceLabel(doc.source));
    renderList();
  }

  function resizeDocTitle() {
    if (!titleInput) return;
    titleInput.style.height = 'auto';
    titleInput.style.height = Math.min(titleInput.scrollHeight, 180) + 'px';
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

  function inlineHtml(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') {
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      return src ? '![' + alt + '](' + src + ')' : '';
    }
    if (tag === 'input') return '';
    let inner = '';
    Array.prototype.forEach.call(node.childNodes, function (child) {
      inner += inlineHtml(child);
    });
    const style = node.getAttribute('style') || '';
    const bold = /^(strong|b)$/.test(tag) || /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
    const italic = /^(em|i)$/.test(tag) || /font-style\s*:\s*italic/i.test(style);
    const strike = /^(del|s|strike)$/.test(tag) || /line-through/i.test(style);
    const underline = tag === 'u' || /text-decoration[^;]*underline/i.test(style);
    if (tag === 'code') return '`' + inner + '`';
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      return /^(https?:|mailto:)/i.test(href) ? '[' + inner + '](' + href + ')' : inner;
    }
    if (bold) return '**' + inner + '**';
    if (italic) return '*' + inner + '*';
    if (strike) return '~~' + inner + '~~';
    if (underline) return '<u>' + inner + '</u>';
    return inner;
  }

  function htmlTableToMarkdown(table) {
    const rows = Array.prototype.map.call(table.querySelectorAll('tr'), function (row) {
      return Array.prototype.map.call(row.children, function (cell) {
        return inlineHtml(cell).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
      });
    }).filter(function (row) { return row.length > 0; });
    if (rows.length === 0) return '';
    const columns = Math.max.apply(null, rows.map(function (row) { return row.length; }));
    rows.forEach(function (row) {
      while (row.length < columns) row.push('');
    });
    const header = '| ' + rows[0].join(' | ') + ' |';
    const divider = '| ' + rows[0].map(function () { return '---'; }).join(' | ') + ' |';
    const body = rows.slice(1).map(function (row) {
      return '| ' + row.join(' | ') + ' |';
    });
    return [header, divider].concat(body).join('\n');
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
        blocks.push('#'.repeat(level) + ' ' + inlineHtml(node).trim());
        return;
      }
      if (tag === 'p') {
        flush();
        const text = inlineHtml(node).trim();
        if (text) blocks.push(text);
        return;
      }
      if (tag === 'li') {
        flush();
        const checkbox = node.querySelector('input[type="checkbox"]');
        const checked = checkbox && checkbox.checked;
        const ordered = node.parentElement && node.parentElement.tagName.toLowerCase() === 'ol';
        const prefix = checkbox ? (checked ? '- [x] ' : '- [ ] ') : (ordered ? '1. ' : '- ');
        const item = prefix + inlineHtml(node).trim();
        const previous = blocks[blocks.length - 1] || '';
        if (/^\s*([-*+]|\d+[.)])\s+/.test(previous)) {
          blocks[blocks.length - 1] = previous + '\n' + item;
        } else {
          blocks.push(item);
        }
        return;
      }
      if (tag === 'table') {
        flush();
        const table = htmlTableToMarkdown(node);
        if (table) blocks.push(table);
        return;
      }
      if (tag === 'aside') {
        flush();
        const text = inlineHtml(node).trim();
        if (text) blocks.push('<aside>' + text + '</aside>');
        return;
      }
      if (tag === 'img') {
        flush();
        const rendered = inlineHtml(node);
        if (rendered) blocks.push(rendered);
        return;
      }
      if (tag === 'br') {
        buffer += '\n';
        return;
      }
      if (tag === 'pre') {
        flush();
        blocks.push('```\n' + node.textContent + '\n```');
        return;
      }
      if (tag === 'blockquote') {
        flush();
        const quote = inlineHtml(node).trim().split('\n').map(function (line) {
          return '> ' + line;
        }).join('\n');
        if (quote.trim()) blocks.push(quote);
        return;
      }
      if (tag === 'hr') {
        flush();
        blocks.push('---');
        return;
      }
      if (/^(p|div|section|article|tr|table|ul|ol|figure|figcaption)$/.test(tag)) {
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

  function xmlVal(node) {
    if (!node) return '';
    return node.getAttribute('w:val') || node.getAttribute('val') || '';
  }

  function xmlFlag(parent, tag) {
    if (!parent) return false;
    const node = parent.getElementsByTagName('w:' + tag)[0];
    if (!node) return false;
    const value = xmlVal(node).toLowerCase();
    return value !== '0' && value !== 'false' && value !== 'none';
  }

  function docxHeadingLevel(style) {
    if (!style) return 0;
    if (/^title$/i.test(style)) return 1;
    if (/^subtitle$/i.test(style)) return 2;
    const match = style.match(/heading\s*([1-6])/i) || style.match(/^h([1-6])$/i);
    return match ? Number(match[1]) : 0;
  }

  function docxNumbering(files) {
    const result = { nums: {}, formats: {} };
    const target = Object.keys(files).find(function (name) { return /word\/numbering\.xml$/i.test(name); });
    if (!target) return result;
    try {
      const xml = new TextDecoder('utf-8').decode(files[target]);
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      Array.prototype.forEach.call(doc.getElementsByTagName('w:abstractNum'), function (abstract) {
        const abstractId = xmlVal(abstract.getElementsByTagName('w:abstractNumId')[0]);
        if (!abstractId) return;
        Array.prototype.forEach.call(abstract.getElementsByTagName('w:lvl'), function (level) {
          const index = xmlVal(level.getElementsByTagName('w:ilvl')[0]) || '0';
          const format = xmlVal(level.getElementsByTagName('w:numFmt')[0]) || 'bullet';
          result.formats[abstractId + ':' + index] = format;
        });
      });
      Array.prototype.forEach.call(doc.getElementsByTagName('w:num'), function (num) {
        const numId = xmlVal(num.getElementsByTagName('w:numId')[0]);
        const abstractId = xmlVal(num.getElementsByTagName('w:abstractNumId')[0]);
        if (numId && abstractId) result.nums[numId] = abstractId;
      });
    } catch (error) {
      return result;
    }
    return result;
  }

  function docxRunText(run) {
    const parts = [];
    Array.prototype.forEach.call(run.childNodes, function (node) {
      if (node.nodeType !== 1) return;
      const name = node.tagName.toLowerCase();
      if (name === 'w:t') parts.push(node.textContent || '');
      else if (name === 'w:tab') parts.push('\t');
      else if (name === 'w:br' || name === 'w:cr') parts.push('\n');
    });
    return parts.join('');
  }

  function docxRunMarkdown(run) {
    let text = docxRunText(run);
    if (!text.trim()) return text;
    const props = run.getElementsByTagName('w:rPr')[0];
    if (xmlFlag(props, 'b')) {
      text = '**' + text + '**';
    } else if (xmlFlag(props, 'i')) {
      text = '*' + text + '*';
    } else if (xmlFlag(props, 'strike')) {
      text = '~~' + text + '~~';
    } else if (xmlFlag(props, 'u')) {
      text = '<u>' + text + '</u>';
    }
    return text;
  }

  function docxImageMarkdown(node, rels) {
    if (!node || !rels) return '';
    const refs = [];
    const seen = new Set();
    const push = function (id) {
      if (!id || seen.has(id)) return;
      const target = rels[id];
      if (!target) return;
      seen.add(id);
      refs.push('![](' + target + ')');
    };
    Array.prototype.forEach.call(node.getElementsByTagName('a:blip'), function (blip) {
      push(blip.getAttribute('r:embed') || blip.getAttribute('r:link') || blip.getAttribute('embed') || blip.getAttribute('link'));
    });
    Array.prototype.forEach.call(node.getElementsByTagName('v:imagedata'), function (image) {
      push(image.getAttribute('r:id') || image.getAttribute('id'));
    });
    Array.prototype.forEach.call(node.getElementsByTagName('w:drawing'), function (drawing) {
      Array.prototype.forEach.call(drawing.getElementsByTagName('a:blip'), function (blip) {
        push(blip.getAttribute('r:embed') || blip.getAttribute('r:link'));
      });
    });
    return refs.join('\n');
  }

  function docxParagraphMarkdown(paragraph, numbering, rels) {
    const props = paragraph.getElementsByTagName('w:pPr')[0];
    const style = xmlVal(props && props.getElementsByTagName('w:pStyle')[0]);
    const heading = docxHeadingLevel(style);
    const quote = /^quote$/i.test(style);
    let prefix = '';
    if (heading) prefix = '#'.repeat(Math.min(heading, 4)) + ' ';
    else if (quote) prefix = '> ';

    let listPrefix = '';
    const numberingProps = props && props.getElementsByTagName('w:numPr')[0];
    if (numberingProps) {
      const numId = xmlVal(numberingProps.getElementsByTagName('w:numId')[0]);
      const level = Number(xmlVal(numberingProps.getElementsByTagName('w:ilvl')[0])) || 0;
      const abstractId = numbering.nums[numId];
      const format = abstractId ? numbering.formats[abstractId + ':' + level] : '';
      if (format !== 'none') {
        const ordered = format && format !== 'bullet' && format !== 'none';
        listPrefix = '  '.repeat(Math.min(level, 6)) + (ordered ? '1. ' : '- ');
      }
    }
    if (!listPrefix && /List\s*(Bullet|Number)/i.test(style)) {
      listPrefix = /List\s*Number/i.test(style) ? '1. ' : '- ';
    }
    if (!listPrefix && /^ListParagraph$/i.test(style)) {
      listPrefix = '- ';
    }

    const pieces = [];
    Array.prototype.forEach.call(paragraph.childNodes, function (node) {
      if (node.nodeType !== 1) return;
      const name = node.tagName.toLowerCase();
      if (name === 'w:r') {
        const images = docxImageMarkdown(node, rels);
        if (images) pieces.push('\n\n' + images + '\n\n');
        else pieces.push(docxRunMarkdown(node));
      } else if (name === 'w:hyperlink') {
        const runs = node.getElementsByTagName('w:r');
        const label = Array.prototype.map.call(runs, function (run) {
          return docxRunText(run);
        }).join('');
        const relId = node.getAttribute('r:id') || node.getAttribute('id');
        const href = relId && rels ? rels[relId] : '';
        if (label.trim()) {
          pieces.push(/^https?:/i.test(href) ? '[' + label + '](' + href + ')' : label);
        }
      } else if (name === 'w:ins' || name === 'w:smartTag') {
        Array.prototype.forEach.call(node.getElementsByTagName('w:r'), function (run) {
          pieces.push(docxRunMarkdown(run));
        });
      }
    });

    const text = pieces.join('').trim();
    if (!text) return '';
    if (listPrefix) return listPrefix + text;
    return prefix + text;
  }

  function docxTableMarkdown(table) {
    const rows = Array.prototype.map.call(table.getElementsByTagName('w:tr'), function (row) {
      return Array.prototype.map.call(row.getElementsByTagName('w:tc'), function (cell) {
        return Array.prototype.map.call(cell.getElementsByTagName('w:t'), function (node) {
          return node.textContent || '';
        }).join(' ').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
      });
    }).filter(function (row) { return row.length > 0; });
    if (rows.length === 0) return '';
    const columns = Math.max.apply(null, rows.map(function (row) { return row.length; }));
    rows.forEach(function (row) {
      while (row.length < columns) row.push('');
    });
    const header = '| ' + rows[0].join(' | ') + ' |';
    const divider = '| ' + rows[0].map(function () { return '---'; }).join(' | ') + ' |';
    const body = rows.slice(1).map(function (row) {
      return '| ' + row.join(' | ') + ' |';
    });
    return [header, divider].concat(body).join('\n');
  }

  function docxToMarkdown(arrayBuffer) {
    if (!window.fflate) return '';
    const files = window.fflate.unzipSync(new Uint8Array(arrayBuffer));
    const target = Object.keys(files).find(function (name) { return /word\/document\.xml$/i.test(name); });
    if (!target) return '';
    const xml = new TextDecoder('utf-8').decode(files[target]);
    try {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const rels = {};
      const relTarget = Object.keys(files).find(function (name) { return /word\/_rels\/document\.xml\.rels$/i.test(name); });
      if (relTarget) {
        const relDoc = new DOMParser().parseFromString(new TextDecoder('utf-8').decode(files[relTarget]), 'application/xml');
        Array.prototype.forEach.call(relDoc.getElementsByTagName('Relationship'), function (rel) {
          const id = rel.getAttribute('Id');
          const url = rel.getAttribute('Target');
          if (id && url) rels[id] = url;
        });
      }
      const numbering = docxNumbering(files);
      const body = doc.getElementsByTagName('w:body')[0] || doc.documentElement;
      const blocks = [];
      Array.prototype.forEach.call(body.childNodes, function (node) {
        if (node.nodeType !== 1) return;
        const name = node.tagName.toLowerCase();
        let block = '';
        if (name === 'w:p') block = docxParagraphMarkdown(node, numbering, rels);
        else if (name === 'w:tbl') block = docxTableMarkdown(node);
        if (!block) return;
        const isList = /^\s*([-*+]|\d+[.)])\s+/.test(block);
        const previous = blocks[blocks.length - 1] || '';
        if (isList && /^\s*([-*+]|\d+[.)])\s+/.test(previous)) {
          blocks[blocks.length - 1] = previous + '\n' + block;
        } else {
          blocks.push(block);
        }
      });
      const markdown = blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
      if (markdown) return markdown;
    } catch (error) {
      // se o xml vier estranho, cai no texto puro abaixo
    }
    return decodeEntities(
      xml
        .replace(/<w:tab\/?>/gi, '\t')
        .replace(/<w:br\/?>/gi, '\n')
        .replace(/<\/w:p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    ).replace(/\n{3,}/g, '\n\n').trim();
  }

  async function docxAssets(arrayBuffer) {
    const assets = {};
    if (!window.fflate) return assets;
    let files;
    try {
      files = window.fflate.unzipSync(new Uint8Array(arrayBuffer));
    } catch (error) {
      return assets;
    }
    const names = Object.keys(files).filter(function (name) {
      return /^word\/media\//i.test(name) && IMAGE_EXT.test(name);
    });
    for (const name of names) {
      const type = /\.png$/i.test(name) ? 'image/png'
        : /\.jpe?g$/i.test(name) ? 'image/jpeg'
          : /\.gif$/i.test(name) ? 'image/gif'
            : /\.webp$/i.test(name) ? 'image/webp'
              : /\.svg$/i.test(name) ? 'image/svg+xml'
                : /\.bmp$/i.test(name) ? 'image/bmp'
                  : '';
      try {
        const dataUrl = await imageToDataUrl(new Blob([files[name]], { type: type }));
        if (!dataUrl) continue;
        const clean = normalizePath(name).toLowerCase();
        assets[clean] = dataUrl;
        assets[clean.replace(/^word\//, '')] = dataUrl;
        assets[baseName(name).toLowerCase()] = dataUrl;
      } catch (error) {
        continue;
      }
    }
    return assets;
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

  function cleanImageRef(value) {
    let ref = String(value || '').trim();
    if (!ref) return '';
    if (ref.charAt(0) === '<' && ref.charAt(ref.length - 1) === '>') {
      ref = ref.slice(1, -1).trim();
    }
    const titled = ref.match(/^([\s\S]*?)\s+(?:"[^"]*"|'[^']*')\s*$/);
    if (titled) ref = titled[1].trim();
    ref = decodeEntities(ref).trim();
    return ref;
  }

  function collectImageRefs(text) {
    const refs = [];
    const seen = new Set();
    const push = function (value) {
      const ref = cleanImageRef(value);
      if (!ref || seen.has(ref)) return;
      seen.add(ref);
      refs.push(ref);
    };
    const source = String(text || '');
    const markdown = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match = markdown.exec(source);
    while (match) {
      push(match[1]);
      match = markdown.exec(source);
    }
    const html = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    match = html.exec(source);
    while (match) {
      push(match[1]);
      match = html.exec(source);
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

  const remoteImageCache = new Map();

  async function fetchRemoteImage(url) {
    const key = String(url || '');
    if (!key || /^data:/i.test(key)) return '';
    if (remoteImageCache.has(key)) return remoteImageCache.get(key);
    const load = async function () {
      try {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
        const response = await fetch(key, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
          signal: controller ? controller.signal : undefined
        });
        if (timer) clearTimeout(timer);
        if (!response.ok) return '';
        const blob = await response.blob();
        if (!blob || !blob.size || blob.size > 14 * 1024 * 1024) return '';
        const dataUrl = await imageToDataUrl(blob, 1400);
        return dataUrl || '';
      } catch (error) {
        return '';
      }
    };
    const result = await load();
    remoteImageCache.set(key, result);
    return result;
  }

  async function assetsForText(text, baseDir, lookup) {
    const assets = {};
    const refs = collectImageRefs(text);
    let images = 0;
    let missing = 0;
    for (const ref of refs) {
      if (!ref) continue;
      if (/^data:/i.test(ref)) {
        images += 1;
        continue;
      }
      if (/^https?:/i.test(ref)) {
        const key = normalizePath(ref).toLowerCase();
        if (assets[key]) {
          images += 1;
          continue;
        }
        const dataUrl = await fetchRemoteImage(ref);
        if (dataUrl) {
          assets[key] = dataUrl;
          assets[String(ref).toLowerCase()] = dataUrl;
          images += 1;
        } else {
          missing += 1;
        }
        continue;
      }
      if (/^blob:/i.test(ref)) continue;
      const source = lookup ? assetKeyFor(ref, baseDir, lookup) : null;
      if (!source) {
        missing += 1;
        continue;
      }
      try {
        const blob = source.blob || new Blob([source.bytes], { type: source.type || '' });
        const dataUrl = await imageToDataUrl(blob);
        if (!dataUrl) {
          missing += 1;
          continue;
        }
        const clean = normalizePath(ref).toLowerCase();
        const name = baseName(ref).toLowerCase();
        assets[clean] = dataUrl;
        assets[name] = dataUrl;
        if (baseDir) assets[(baseDir + '/' + clean).toLowerCase()] = dataUrl;
        images += 1;
      } catch (error) {
        missing += 1;
      }
    }
    return { assets: assets, images: images, missing: missing };
  }

  function countImageAssets(assets) {
    const set = new Set();
    Object.keys(assets || {}).forEach(function (key) {
      if (assets[key]) set.add(assets[key]);
    });
    return set.size;
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
      return { count: 0, images: 0, missing: 0, lastDoc: null };
    }
    let files;
    try {
      files = window.fflate.unzipSync(new Uint8Array(arrayBuffer));
    } catch (error) {
      SMA.toast('esse zip parece quebrado');
      return { count: 0, images: 0, missing: 0, lastDoc: null };
    }
    const lookup = lookupFromZip(files);
    const names = Object.keys(files).filter(function (name) {
      return TEXT_EXT.test(name) && !/(^|\/)(__MACOSX|\.)/.test(name);
    }).slice(0, 80);
    let imported = 0;
    let images = 0;
    let missing = 0;
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
      const result = await assetsForText(text, dirName(name), lookup);
      images += result.images;
      missing += result.missing;
      lastDoc = addImportedDoc({
        title: title,
        text: text,
        source: 'notion',
        assets: result.assets
      });
      imported += 1;
    }
    if (names.length === 0) SMA.toast('nenhuma nota de texto dentro do zip');
    return { count: imported, images: images, missing: missing, lastDoc: lastDoc };
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

  function isImageFile(file) {
    if (!file) return false;
    return /^image\//i.test(file.type || '') || IMAGE_EXT.test(file.name || '');
  }

  async function addImagesToDoc(files) {
    const doc = activeDoc() || docs[0];
    if (!doc) {
      SMA.toast('crie uma nota primeiro');
      return;
    }
    const images = Array.from(files || []).filter(isImageFile);
    if (!images.length) {
      SMA.toast('não encontrei imagens nesses arquivos');
      return;
    }
    doc.assets = doc.assets || {};
    let added = 0;
    const blocks = [];
    for (const file of images) {
      try {
        const dataUrl = await imageToDataUrl(file, 1500);
        if (!dataUrl) continue;
        const extension = (/\.([a-z0-9]+)$/i.exec(file.name || '') || [])[1] || 'png';
        const key = 'anexo-' + Date.now() + '-' + added + '.' + extension.toLowerCase();
        doc.assets[key.toLowerCase()] = dataUrl;
        const alt = SMA.fileNameTitle(file.name || '') || 'imagem';
        blocks.push('![' + alt + '](' + key + ')');
        added += 1;
      } catch (error) {
        continue;
      }
    }
    if (!added) {
      SMA.toast('não consegui abrir essas imagens');
      return;
    }
    doc.text = String(doc.text || '').replace(/\s+$/, '') + '\n\n' + blocks.join('\n\n') + '\n';
    setEditing(false);
    paintEditor(doc, 'imagem adicionada');
    await persistDoc(doc, 'salvo offline', false);
    const scroll = SMA.select('.notion-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
    SMA.toast(added + (added === 1 ? ' imagem na nota ‧°' : ' imagens na nota ‧°'));
  }

  async function importFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (list.every(isImageFile)) {
      await addImagesToDoc(list);
      return;
    }
    const lookup = lookupFromFiles(list);
    let imported = 0;
    let images = 0;
    let missing = 0;
    let lastDoc = null;
    for (const file of list) {
      if (isImageFile(file)) continue;
      const lower = file.name.toLowerCase();
      try {
        if (/\.docx$/i.test(lower)) {
          const buffer = await file.arrayBuffer();
          const text = docxToMarkdown(buffer);
          if (text.trim()) {
            const assets = await docxAssets(buffer);
            images += countImageAssets(assets);
            lastDoc = addImportedDoc({
              title: SMA.fileNameTitle(file.name),
              text: text,
              source: 'drive',
              assets: assets
            });
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
          images += result.images;
          missing += result.missing;
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
          const baseDir = dirName(file.webkitRelativePath || file.name);
          const result = await assetsForText(text, baseDir, lookup);
          images += result.images;
          missing += result.missing;
          lastDoc = addImportedDoc({ title: title, text: text, source: 'notion', assets: result.assets });
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
    const pieces = [imported + (imported === 1 ? ' nota importada' : ' notas importadas')];
    if (images) pieces.push(images + (images === 1 ? ' imagem' : ' imagens'));
    SMA.toast(pieces.join(' ‧ ') + ' ‧°');
    if (missing > 0) {
      setTimeout(function () {
        SMA.toast('algumas imagens não vieram no export — importe o .zip completo do notion');
      }, 900);
    }
  }

  function openImportModal() {
    SMA.select('#modal-import-doc')?.classList.add('open');
  }

  function closeImportModal() {
    SMA.select('#modal-import-doc')?.classList.remove('open');
    SMA.select('#import-dropzone')?.classList.remove('is-dropping');
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
    const url = cleanImageRef(source);
    if (!url) return '';
    if (/^(data:|blob:)/i.test(url)) return url;
    const map = assets || {};
    const clean = normalizePath(url).toLowerCase();
    if (map[clean]) return map[clean];
    const name = baseName(url).toLowerCase();
    if (map[name]) return map[name];
    const keys = Object.keys(map);
    for (const key of keys) {
      if (key.endsWith('/' + name)) return map[key];
    }
    if (/^https?:/i.test(url)) return url;
    return '';
  }

  function imageFigure(source, alt, assets) {
    const figure = createElement('figure', 'notion-image');
    const url = resolveImage(source, assets);
    if (!url) {
      const missing = createElement('div', 'notion-image-missing');
      missing.appendChild(createElement('span', '', '🖼'));
      const label = createElement('span', '', (alt ? alt + ' ‧ ' : '') + 'imagem não encontrada');
      missing.appendChild(label);
      const hint = createElement('small', '', 'importe o .zip completo do notion (ou o .md junto com a pasta de imagens)');
      missing.appendChild(hint);
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

  function openPasteModal() {
    const modal = SMA.select('#modal-paste-doc');
    const title = SMA.select('#paste-title-input');
    const source = SMA.select('#paste-source-input');
    const text = SMA.select('#paste-text-input');
    if (title) title.value = '';
    if (source) source.value = 'notion';
    if (text) text.value = '';
    modal?.classList.add('open');
    setTimeout(function () {
      if (title) title.focus();
    }, 60);
  }

  function closePasteModal() {
    SMA.select('#modal-paste-doc')?.classList.remove('open');
  }

  async function pasteFromClipboard() {
    const textArea = SMA.select('#paste-text-input');
    if (!textArea) return;
    try {
      let pasted = '';
      const pastedImages = [];
      if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(function (type) { return /^image\//i.test(type); });
          if (imageType) {
            const blob = await item.getType(imageType);
            const extension = (imageType.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '');
            pastedImages.push(new File([blob], 'colado-' + Date.now() + '.' + extension, { type: imageType }));
          }
          if (item.types.indexOf('text/html') !== -1) {
            const blob = await item.getType('text/html');
            pasted = htmlToMarkdown(await blob.text());
            break;
          }
          if (!pasted && item.types.indexOf('text/plain') !== -1) {
            const blob = await item.getType('text/plain');
            pasted = await blob.text();
          }
        }
      }
      if (!pasted && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        pasted = await navigator.clipboard.readText();
      }
      if (!pasted.trim()) {
        if (pastedImages.length) {
          closePasteModal();
          await addImagesToDoc(pastedImages);
          return;
        }
        SMA.toast('não encontrei texto na área de transferência');
        textArea.focus();
        return;
      }
      textArea.value = pasted.trim();
      const title = SMA.select('#paste-title-input');
      if (title && !title.value.trim()) {
        const heading = pasted.match(/^\s*#{1,3}\s+(.+?)\s*$/m);
        if (heading) title.value = heading[1].trim().slice(0, 120);
      }
      SMA.toast('texto colado ‧°');
    } catch (error) {
      SMA.toast('não consegui ler a área de transferência; cola com Ctrl+V');
      textArea.focus();
    }
  }

  async function savePastedDoc() {
    const titleInputPaste = SMA.select('#paste-title-input');
    const sourceInput = SMA.select('#paste-source-input');
    const textArea = SMA.select('#paste-text-input');
    let text = textArea ? textArea.value.trim() : '';
    if (!text) {
      SMA.toast('cola o conteúdo da nota primeiro');
      textArea?.focus();
      return;
    }
    if (/^\s*<(html|body|article|section|div|p|h[1-6]|ul|ol|table|aside|details|figure|meta)\b/i.test(text)) {
      text = htmlToMarkdown(text);
    }
    const heading = text.match(/^\s*#\s+(.+?)\s*$/m);
    let title = titleInputPaste ? titleInputPaste.value.trim() : '';
    if (!title && heading) title = heading[1].trim();
    if (!title) title = 'nota colada';
    if (heading) {
      text = text.replace(/^\s*#\s+.+?\s*$/m, '').replace(/^\s+/, '');
    }
    const downloadResult = await assetsForText(text, '', null);
    const doc = addImportedDoc({
      title: title.slice(0, 120),
      text: text,
      source: sourceInput && sourceInput.value === 'drive' ? 'drive' : 'notion',
      assets: downloadResult.assets
    });
    activeId = doc.id;
    setEditing(false);
    paintEditor(doc, 'importado');
    saveFallback();
    await persistDoc(doc, 'salvo offline', false);
    closePasteModal();
    const scroll = SMA.select('.notion-scroll');
    if (scroll) scroll.scrollTop = 0;
    SMA.toast('nota adicionada ‧°');
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

    const zipInput = SMA.select('#doc-zip-input');
    const folderInput = SMA.select('#doc-folder-input');
    const imageInput = SMA.select('#doc-image-input');
    const pickFiles = function (input) {
      return function (event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length) return;
        closeImportModal();
        importFiles(files);
      };
    };

    importInput?.addEventListener('change', pickFiles(importInput));
    zipInput?.addEventListener('change', pickFiles(zipInput));
    folderInput?.addEventListener('change', pickFiles(folderInput));
    imageInput?.addEventListener('change', function (event) {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (files.length) addImagesToDoc(files);
    });

    ['#btn-open-import', '#btn-side-import', '#import-dropzone'].forEach(function (selector) {
      SMA.select(selector)?.addEventListener('click', openImportModal);
    });
    SMA.select('#btn-pick-zip')?.addEventListener('click', function () { zipInput?.click(); });
    SMA.select('#btn-pick-files')?.addEventListener('click', function () { importInput?.click(); });
    SMA.select('#btn-pick-folder')?.addEventListener('click', function () { folderInput?.click(); });
    SMA.select('#btn-pick-paste')?.addEventListener('click', function () {
      closeImportModal();
      openPasteModal();
    });
    SMA.select('#modal-cancel-import')?.addEventListener('click', closeImportModal);
    SMA.select('#btn-add-image')?.addEventListener('click', function () { imageInput?.click(); });

    const dropzone = SMA.select('#import-dropzone');
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(function (name) {
        dropzone.addEventListener(name, function (event) {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
          dropzone.classList.add('is-dropping');
        });
      });
      dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('is-dropping');
      });
      dropzone.addEventListener('drop', function (event) {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.remove('is-dropping');
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return;
        closeImportModal();
        importFiles(files);
      });
    }

    SMA.select('#btn-paste-doc')?.addEventListener('click', openPasteModal);
    SMA.select('#modal-cancel-paste')?.addEventListener('click', closePasteModal);
    SMA.select('#modal-save-paste')?.addEventListener('click', savePastedDoc);
    SMA.select('#btn-paste-clipboard')?.addEventListener('click', pasteFromClipboard);

    ['#paste-text-input', '#script-editor'].forEach(function (selector) {
      SMA.select(selector)?.addEventListener('paste', function (event) {
        const items = Array.from(event.clipboardData?.items || []);
        const images = items
          .filter(function (item) { return item.kind === 'file' && /^image\//i.test(item.type || ''); })
          .map(function (item) { return item.getAsFile(); })
          .filter(Boolean);
        if (!images.length) return;
        event.preventDefault();
        closePasteModal();
        addImagesToDoc(images);
      });
    });

    const notionMain = SMA.select('.notion-main');
    if (notionMain) {
      ['dragenter', 'dragover'].forEach(function (name) {
        notionMain.addEventListener(name, function (event) {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
          notionMain.classList.add('is-dropping');
        });
      });
      notionMain.addEventListener('dragleave', function (event) {
        if (!event.relatedTarget || !notionMain.contains(event.relatedTarget)) {
          notionMain.classList.remove('is-dropping');
        }
      });
      notionMain.addEventListener('drop', function (event) {
        event.preventDefault();
        notionMain.classList.remove('is-dropping');
        const files = Array.from(event.dataTransfer?.files || []);
        if (files.length) importFiles(files);
      });
    }

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
      resizeDocTitle();
      const crumb = SMA.select('#notion-crumb');
      if (crumb) crumb.textContent = doc.title;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        persistDoc(doc, 'salvo aqui', false);
      }, 450);
    });

    titleInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        titleInput.blur();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !lightbox) return;
      lightbox.classList.remove('open');
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
    window.addEventListener('resize', resizeDocTitle);
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

  SMA.ScriptNotes = {
    init: init,
    importFiles: importFiles,
    docxToMarkdown: docxToMarkdown,
    htmlToMarkdown: htmlToMarkdown
  };
})();
