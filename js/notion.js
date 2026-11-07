(function () {
  const SMA = window.SMA;

  const TEXT_EXT = /\.(md|markdown|txt|html?|csv)$/i;
  const HTML_EXT = /\.html?$/i;
  const PDF_EXT = /\.pdf$/i;
  const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
  const MAX_PAGES = 90;
  const MAX_IMAGES = 260;
  const MAX_PDF_PAGES = 40;

  const BASE_CSS = `
    :host {
      display: block;
      width: 100%;
      color: #37352f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    * { box-sizing: border-box; }
    .notion-html-page {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      color: inherit;
      overflow-wrap: break-word;
    }
    .notion-html-page .page-body,
    .notion-html-page article {
      width: 100%;
    }
    .notion-html-page h1,
    .notion-html-page h2,
    .notion-html-page h3,
    .notion-html-page h4 {
      margin: 1.4em 0 0.35em;
      color: #37352f;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.01em;
    }
    .notion-html-page h1 { font-size: 2.1em; margin-top: 0.4em; }
    .notion-html-page h2 { font-size: 1.5em; }
    .notion-html-page h3 { font-size: 1.22em; }
    .notion-html-page p { margin: 0.55em 0; }
    .notion-html-page ul,
    .notion-html-page ol { margin: 0.4em 0; padding-left: 1.55em; }
    .notion-html-page li { margin: 0.2em 0; }
    .notion-html-page blockquote {
      margin: 0.9em 0;
      padding: 0.1em 0 0.1em 0.95em;
      border-left: 3px solid currentColor;
      color: inherit;
    }
    .notion-html-page hr {
      margin: 1.8em 0;
      border: none;
      border-top: 1px solid #e9e7e2;
    }
    .notion-html-page img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
      border-radius: 4px;
      cursor: zoom-in;
    }
    .notion-html-page figure { margin: 1em 0; }
    .notion-html-page figcaption {
      margin-top: 0.45em;
      color: #9b9a97;
      font-size: 0.82em;
      text-align: center;
    }
    .notion-html-page .column-list {
      display: flex;
      gap: 2.4em;
      align-items: flex-start;
      margin: 0.7em 0;
    }
    .notion-html-page .column { flex: 1 1 0; min-width: 0; }
    .notion-html-page .callout {
      display: flex;
      gap: 0.7em;
      align-items: flex-start;
      margin: 0.9em 0;
      padding: 0.95em 1em;
      border-radius: 4px;
      background: #f1f1ef;
    }
    .notion-html-page .callout .icon {
      flex: 0 0 auto;
      font-size: 1.15em;
      line-height: 1.45;
    }
    .notion-html-page .callout .icon img {
      width: 1.1em;
      height: 1.1em;
      margin: 0.18em 0 0;
      object-fit: contain;
    }
    .notion-html-page .callout-content { flex: 1 1 auto; min-width: 0; }
    .notion-html-page .callout p { margin: 0.1em 0; }
    .notion-html-page table {
      width: 100%;
      margin: 0.9em 0;
      border-collapse: collapse;
      font-size: 0.92em;
    }
    .notion-html-page th,
    .notion-html-page td {
      padding: 0.45em 0.6em;
      border: 1px solid #e9e7e2;
      text-align: left;
      vertical-align: top;
    }
    .notion-html-page th { background: #f7f7f5; font-weight: 600; }
    .notion-html-page pre {
      margin: 0.9em 0;
      padding: 0.9em 1em;
      overflow-x: auto;
      border-radius: 4px;
      background: #f7f6f3;
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.82em;
      line-height: 1.5;
    }
    .notion-html-page code {
      padding: 0.12em 0.28em;
      border-radius: 3px;
      background: #f1f1ef;
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85em;
    }
    .notion-html-page pre code { padding: 0; background: transparent; }
    .notion-html-page a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
    .notion-html-page .link-to-page a,
    .notion-html-page .notion-page-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      padding: 0.18em 0.4em;
      border-radius: 4px;
      text-decoration: none;
      background: #f1f1ef;
    }
    .notion-html-page input[type="checkbox"] {
      width: 1em;
      height: 1em;
      margin-right: 0.5em;
      vertical-align: -0.12em;
      accent-color: #37352f;
    }
    .notion-html-page .toggle {
      margin: 0.35em 0;
    }
    .notion-html-page summary { cursor: pointer; }
    .notion-html-page .notion-img-missing {
      display: block;
      margin: 1em 0;
      padding: 1.2em;
      border: 1px dashed #dedede;
      border-radius: 5px;
      color: #9b9a97;
      font-size: 0.85em;
      text-align: center;
    }
    .notion-html-page .notion-pdf {
      max-width: 860px;
      margin: 0 auto;
    }
    .notion-html-page .notion-pdf-page {
      margin: 0 0 14px;
    }
    .notion-html-page .notion-pdf-page img {
      width: 100%;
      border-radius: 3px;
      box-shadow: 0 3px 14px rgba(40, 35, 30, 0.08);
    }
    .notion-subpages-label {
      margin: 2.4em 0 1em;
      padding-top: 1.2em;
      border-top: 1px solid #e9e7e2;
      color: #9b9a97;
      font-size: 0.72em;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .notion-subpage {
      margin: 1.7em 0;
      padding-left: 1em;
      border-left: 2px solid #ececea;
    }
    .notion-subpage-head { margin-bottom: 0.8em; }
    .notion-subpage-kicker {
      display: block;
      margin-bottom: 0.25em;
      color: #9b9a97;
      font-size: 0.68em;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .notion-subpage-title {
      margin: 0 !important;
      font-size: 1.35em !important;
      line-height: 1.25;
    }
    .notion-subpage-depth-2 { margin-left: 0.6em; }
    .notion-subpage-depth-3 { margin-left: 1.2em; }
    .notion-html-empty {
      padding: 2em 1em;
      color: #9b9a97;
      font-size: 0.9em;
      text-align: center;
    }
    @media (max-width: 700px) {
      .notion-html-page .column-list { display: block; }
      .notion-html-page .column { width: 100% !important; margin-bottom: 1.2em; }
      .notion-html-page { font-size: 15px; }
      .notion-subpage { padding-left: 0.7em; }
    }
  `;

  function titleFromPath(path) {
    const name = SMA.fileNameTitle(SMA.baseName(path));
    return name.replace(/\s+[0-9a-f]{8,}$/i, '').trim() || 'página do notion';
  }

  function cleanTitle(value) {
    return String(value || '')
      .replace(/\s*[-–|]\s*Notion\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isSitemap(name, parsed) {
    if (!/^index\.html?$/i.test(SMA.baseName(name))) return false;
    if (parsed.querySelector('.page-body')) return false;
    return parsed.querySelectorAll('a').length > 3;
  }

  function joinPath(baseDir, ref) {
    const clean = SMA.normalizePath(ref);
    if (/^(data:|blob:|https?:)/i.test(clean) || clean.charAt(0) === '#') return clean;
    const parts = (baseDir ? baseDir.split('/') : []).concat(clean.split('/'));
    const stack = [];
    parts.forEach(function (part) {
      if (!part || part === '.') return;
      if (part === '..') {
        stack.pop();
        return;
      }
      stack.push(part);
    });
    return stack.join('/');
  }

  function sourceFor(ref, baseDir, lookup) {
    if (!lookup || !ref) return null;
    const clean = joinPath(baseDir, ref);
    const candidates = [clean, SMA.baseName(ref), ref];
    for (const candidate of candidates) {
      const key = SMA.normalizePath(candidate).toLowerCase();
      if (lookup[key]) return lookup[key];
    }
    const wanted = SMA.baseName(ref).toLowerCase();
    const keys = Object.keys(lookup);
    for (const key of keys) {
      if (key.endsWith('/' + wanted)) return lookup[key];
    }
    return null;
  }

  function lookupFromZip(files) {
    const lookup = {};
    Object.keys(files).forEach(function (name) {
      if (!IMAGE_EXT.test(name) && !/\.css$/i.test(name)) return;
      if (/(^|\/)(__MACOSX|\.)/.test(name)) return;
      const bytes = files[name];
      const type = /\.png$/i.test(name) ? 'image/png'
        : /\.jpe?g$/i.test(name) ? 'image/jpeg'
          : /\.gif$/i.test(name) ? 'image/gif'
            : /\.webp$/i.test(name) ? 'image/webp'
              : /\.svg$/i.test(name) ? 'image/svg+xml'
                : /\.avif$/i.test(name) ? 'image/avif'
                  : /\.bmp$/i.test(name) ? 'image/bmp'
                    : /\.css$/i.test(name) ? 'text/css'
                      : '';
      const key = SMA.normalizePath(name).toLowerCase();
      lookup[key] = { bytes: bytes, type: type, name: name };
      const short = SMA.baseName(name).toLowerCase();
      if (!lookup[short]) lookup[short] = lookup[key];
    });
    return lookup;
  }

  function lookupFromFiles(files) {
    const lookup = {};
    files.forEach(function (file) {
      if (!IMAGE_EXT.test(file.name) && !/^image\//i.test(file.type || '') && !/\.css$/i.test(file.name)) return;
      const path = SMA.normalizePath(file.webkitRelativePath || file.name);
      const key = path.toLowerCase();
      lookup[key] = { blob: file, type: file.type, name: path };
      const short = SMA.baseName(path).toLowerCase();
      if (!lookup[short]) lookup[short] = lookup[key];
    });
    return lookup;
  }

  const imageCache = new Map();

  async function imageSourceToDataUrl(source) {
    if (!source) return '';
    const cacheKey = source.name || source.blob;
    if (cacheKey && imageCache.has(cacheKey)) return imageCache.get(cacheKey);
    let dataUrl = '';
    try {
      const blob = source.blob || new Blob([source.bytes], { type: source.type || '' });
      dataUrl = await SMA.imageToDataUrl(blob, 1600);
    } catch (error) {
      dataUrl = '';
    }
    if (cacheKey) imageCache.set(cacheKey, dataUrl);
    return dataUrl;
  }

  async function imageRefToDataUrl(ref, baseDir, lookup) {
    const clean = SMA.cleanImageRef(ref);
    if (!clean) return '';
    if (/^data:/i.test(clean)) return clean;
    if (/^https?:/i.test(clean)) return (await SMA.fetchRemoteImage(clean)) || clean;
    const source = sourceFor(clean, baseDir, lookup);
    if (!source) return '';
    return imageSourceToDataUrl(source);
  }

  async function replaceCssUrls(css, baseDir, lookup) {
    const source = String(css || '');
    const refs = [];
    const pattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
    let match = pattern.exec(source);
    while (match) {
      const ref = match[2].trim();
      if (ref && !/^(data:|blob:|#|var\()/i.test(ref) && !/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(ref)) {
        refs.push(ref);
      }
      match = pattern.exec(source);
    }
    let result = source;
    for (const ref of refs.slice(0, MAX_IMAGES)) {
      const dataUrl = await imageRefToDataUrl(ref, baseDir, lookup);
      if (!dataUrl) continue;
      result = result.split(ref).join(dataUrl);
    }
    return result;
  }

  async function rewriteStyleUrls(root, baseDir, lookup) {
    const nodes = Array.from(root.querySelectorAll('[style*="url("]')).slice(0, MAX_IMAGES);
    for (const node of nodes) {
      const style = node.getAttribute('style') || '';
      node.setAttribute('style', await replaceCssUrls(style, baseDir, lookup));
    }
  }

  function sanitize(root) {
    root.querySelectorAll('script,style,link,meta,noscript,iframe,object,embed,form,button,svg title').forEach(function (node) {
      node.remove();
    });
    root.querySelectorAll('*').forEach(function (node) {
      Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
        const name = attribute.name.toLowerCase();
        if (/^on/.test(name)) node.removeAttribute(attribute.name);
        if (name === 'contenteditable' || name === 'spellcheck' || name === 'tabindex') {
          node.removeAttribute(attribute.name);
        }
        if (name === 'href' && /^\s*javascript:/i.test(attribute.value)) {
          node.removeAttribute('href');
        }
      });
    });
  }

  async function rewriteImages(root, baseDir, lookup, stats) {
    const images = Array.from(root.querySelectorAll('img'));
    for (const img of images) {
      if (stats.images >= MAX_IMAGES) break;
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      let dataUrl = await imageRefToDataUrl(src, baseDir, lookup);
      if (!dataUrl) {
        const srcset = (img.getAttribute('srcset') || '').split(',').map(function (part) {
          return part.trim().split(/\s+/)[0];
        }).filter(Boolean);
        for (const candidate of srcset) {
          dataUrl = await imageRefToDataUrl(candidate, baseDir, lookup);
          if (dataUrl) break;
        }
      }
      img.removeAttribute('srcset');
      img.removeAttribute('data-src');
      if (dataUrl) {
        img.setAttribute('src', dataUrl);
        img.setAttribute('loading', 'lazy');
        stats.images += 1;
      } else if (/^https?:/i.test(src)) {
        img.setAttribute('src', src);
        img.setAttribute('loading', 'lazy');
      } else {
        const missing = document.createElement('span');
        missing.className = 'notion-img-missing';
        missing.textContent = 'imagem não encontrada no export';
        img.replaceWith(missing);
        stats.missing += 1;
      }
    }
  }

  function rewriteLinks(root, baseDir, pagePaths) {
    root.querySelectorAll('a[href]').forEach(function (link) {
      const href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:)/i.test(href)) {
        if (/^https?:/i.test(href)) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
        return;
      }
      const clean = joinPath(baseDir, href.split('#')[0].split('?')[0]);
      const key = clean.toLowerCase();
      if (pagePaths.has(key)) {
        link.setAttribute('href', '#notion-page-' + SMA.hash(key));
        link.setAttribute('data-notion-page', key);
        link.classList.add('notion-page-link');
      }
    });
  }

  async function prepareHtmlEntry(entry, lookup, pagePaths, stats) {
    const parsed = new DOMParser().parseFromString(entry.text, 'text/html');
    if (isSitemap(entry.path, parsed)) return null;
    const article = parsed.querySelector('article') || parsed.querySelector('main') || parsed.body;
    if (!article) return null;

    const titleNode = article.querySelector('.page-title') || parsed.querySelector('title');
    const rawTitle = titleNode ? titleNode.textContent : '';
    const title = cleanTitle(rawTitle) || titleFromPath(entry.path);
    if (titleNode && titleNode.tagName && titleNode.tagName.toLowerCase() !== 'title') titleNode.remove();
    if (!article.querySelector('.page-title')) {
      const firstHeading = article.querySelector('h1');
      if (firstHeading && cleanTitle(firstHeading.textContent) === title) firstHeading.remove();
    }

    const iconNode = article.querySelector('.page-icon, .page-header-icon');
    let icon = '';
    if (iconNode) {
      if (!iconNode.querySelector('img')) icon = iconNode.textContent.trim();
      iconNode.remove();
    }

    sanitize(article);
    await rewriteImages(article, entry.dir, lookup, stats);
    await rewriteStyleUrls(article, entry.dir, lookup);
    rewriteLinks(article, entry.dir, pagePaths);

    let css = Array.from(parsed.querySelectorAll('style')).map(function (node) {
      return node.textContent || '';
    }).join('\n');
    for (const link of Array.from(parsed.querySelectorAll('link[rel~="stylesheet"]'))) {
      const href = link.getAttribute('href') || '';
      const source = sourceFor(href, entry.dir, lookup);
      if (!source) continue;
      try {
        css += '\n' + (source.blob ? await source.blob.text() : new TextDecoder('utf-8').decode(source.bytes));
      } catch (error) {
        continue;
      }
    }
    css = await replaceCssUrls(css, entry.dir, lookup);
    css = css.replace(/:root/g, ':host');

    entry.title = title;
    entry.icon = icon;
    entry.html = article.innerHTML;
    entry.htmlCss = css;
    entry.markdown = safeHtmlToMarkdown(entry.originalText);
    return entry;
  }

  function safeHtmlToMarkdown(html) {
    if (SMA.ScriptNotes && typeof SMA.ScriptNotes.htmlToMarkdown === 'function') {
      try {
        return SMA.ScriptNotes.htmlToMarkdown(html);
      } catch (error) {
        return '';
      }
    }
    const holder = document.createElement('div');
    holder.innerHTML = html;
    return (holder.textContent || '').trim();
  }

  /* ── árvore de páginas ───────────────────────────────────────── */

  function findParent(entry, byPath, extensions) {
    let dir = SMA.dirName(entry.path);
    while (dir) {
      const base = SMA.baseName(dir);
      const candidates = [];
      extensions.forEach(function (extension) {
        candidates.push(dir + extension);
        candidates.push(dir + '/' + base + extension);
      });
      for (const candidate of candidates) {
        const key = SMA.normalizePath(candidate).toLowerCase();
        if (key !== entry.pathLower && byPath[key]) return byPath[key];
      }
      dir = SMA.dirName(dir);
    }
    return null;
  }

  function buildTree(entries, extensions) {
    const byPath = {};
    entries.forEach(function (entry) {
      entry.pathLower = entry.pathLower || SMA.normalizePath(entry.path).toLowerCase();
      byPath[entry.pathLower] = entry;
      entry.children = [];
    });
    const roots = [];
    entries.forEach(function (entry) {
      const parent = findParent(entry, byPath, extensions);
      if (parent) parent.children.push(entry);
      else roots.push(entry);
    });
    entries.forEach(function (entry) {
      entry.children.sort(function (a, b) {
        return a.pathLower.localeCompare(b.pathLower, 'pt-BR');
      });
    });
    return roots;
  }

  function escapeHtml(value) {
    return SMA.escapeHTML(value == null ? '' : value);
  }

  function composeHtml(page, depth, seen) {
    const current = seen || new Set();
    if (current.has(page.pathLower)) return '';
    current.add(page.pathLower);
    let html = page.html || '';
    if (page.children.length) {
      html += '<div class="notion-subpages-label">páginas dentro desta</div>';
      page.children.forEach(function (child) {
        html += composeSubpage(child, depth + 1, current);
      });
    }
    return html;
  }

  function composeSubpage(page, depth, seen) {
    const body = composeHtml(page, depth, seen);
    return '<section class="notion-subpage notion-subpage-depth-' + Math.min(depth, 3) + '" id="notion-page-' + SMA.hash(page.pathLower) + '">'
      + '<div class="notion-subpage-head">'
      + '<span class="notion-subpage-kicker">página dentro desta</span>'
      + '<h2 class="notion-subpage-title">' + escapeHtml(page.title) + '</h2>'
      + '</div>'
      + '<div class="notion-subpage-body">' + body + '</div>'
      + '</section>';
  }

  function composeMarkdown(page, depth, seen) {
    const current = seen || new Set();
    if (current.has(page.pathLower)) return '';
    current.add(page.pathLower);
    let markdown = String(page.markdown || '').trim();
    page.children.forEach(function (child) {
      const title = String(child.title || 'página').trim();
      markdown += '\n\n---\n\n' + '#'.repeat(Math.min(depth + 2, 4)) + ' ' + title + '\n\n'
        + composeMarkdown(child, depth + 1, current);
    });
    return markdown.trim();
  }

  function collectCss(page, seen, list) {
    const current = seen || new Set();
    if (current.has(page.pathLower)) return list || [];
    current.add(page.pathLower);
    const output = list || [];
    if (page.htmlCss && output.indexOf(page.htmlCss) === -1) output.push(page.htmlCss);
    page.children.forEach(function (child) {
      collectCss(child, current, output);
    });
    return output;
  }

  /* ── importação markdown ────────────────────────────────────── */

  function csvToMarkdown(text) {
    const splitLine = function (line) {
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
    };
    const rows = String(text || '').split(/\r?\n/).filter(function (line) { return line.trim(); }).slice(0, 200);
    if (!rows.length) return '';
    const table = rows.map(splitLine);
    const columns = Math.max.apply(null, table.map(function (row) { return row.length; }));
    table.forEach(function (row) {
      while (row.length < columns) row.push('');
    });
    const header = '| ' + table[0].join(' | ') + ' |';
    const divider = '| ' + table[0].map(function () { return '---'; }).join(' | ') + ' |';
    const body = table.slice(1).map(function (row) {
      return '| ' + row.join(' | ') + ' |';
    });
    return [header, divider].concat(body).join('\n');
  }

  async function assetsForMarkdown(text, baseDir, lookup) {
    const assets = {};
    const refs = SMA.collectImageRefs(text);
    let images = 0;
    let missing = 0;
    for (const ref of refs) {
      if (!ref || /^data:/i.test(ref)) {
        if (/^data:/i.test(ref)) images += 1;
        continue;
      }
      const dataUrl = await imageRefToDataUrl(ref, baseDir, lookup);
      if (dataUrl && dataUrl !== ref) {
        const clean = SMA.normalizePath(ref).toLowerCase();
        assets[clean] = dataUrl;
        assets[SMA.baseName(ref).toLowerCase()] = dataUrl;
        if (baseDir) assets[(baseDir.toLowerCase() + '/' + clean)] = dataUrl;
        images += 1;
      } else if (!dataUrl) {
        missing += 1;
      }
    }
    return { assets: assets, images: images, missing: missing };
  }

  function prepareMarkdownEntry(entry) {
    let text = String(entry.text || '');
    if (/\.csv$/i.test(entry.path)) {
      text = csvToMarkdown(text);
    } else if (HTML_EXT.test(entry.path)) {
      text = safeHtmlToMarkdown(text);
    }
    const heading = text.match(/^\s*#\s+(.+?)\s*$/m);
    let title = titleFromPath(entry.path);
    if (heading) {
      title = heading[1].trim() || title;
      text = text.replace(/^\s*#\s+.+?\s*$/m, '').replace(/^\s+/, '');
    }
    entry.title = title;
    entry.markdown = text;
    return entry;
  }

  /* ── importação principal ───────────────────────────────────── */

  async function importHtml(entries, lookup, stats) {
    const pagePaths = new Set(entries.map(function (entry) { return entry.pathLower; }));
    const prepared = [];
    for (const entry of entries.slice(0, MAX_PAGES)) {
      const result = await prepareHtmlEntry(entry, lookup, pagePaths, stats);
      if (result) prepared.push(result);
    }
    if (!prepared.length) return [];
    const roots = buildTree(prepared, ['', '.html', '.htm']);
    const docs = [];
    roots.forEach(function (root) {
      const markdown = composeMarkdown(root, 0);
      const html = composeHtml(root, 0);
      const css = collectCss(root).join('\n');
      if (!html.trim() && !markdown.trim()) return;
      docs.push({
        title: root.title,
        text: markdown,
        html: html,
        htmlCss: css,
        format: 'html',
        icon: root.icon || '',
        source: 'notion',
        assets: {}
      });
    });
    return docs;
  }

  async function importMarkdown(entries, lookup, stats) {
    const prepared = entries.map(prepareMarkdownEntry);
    prepared.forEach(function (entry) {
      entry.pathLower = SMA.normalizePath(entry.path).toLowerCase();
    });
    // resolve imagens de cada página com a pasta dela
    for (const entry of prepared) {
      const result = await assetsForMarkdown(entry.markdown, entry.dir, lookup);
      entry.assets = result.assets;
      stats.images += result.images;
      stats.missing += result.missing;
    }
    const roots = buildTree(prepared, ['', '.md', '.markdown', '.txt']);
    const docs = [];
    roots.forEach(function (root) {
      const text = composeMarkdown(root, 0);
      if (!text.trim()) return;
      const assets = {};
      const addAssets = function (page) {
        Object.keys(page.assets || {}).forEach(function (key) {
          assets[key] = page.assets[key];
        });
        page.children.forEach(addAssets);
      };
      addAssets(root);
      docs.push({
        title: root.title,
        text: text,
        format: 'markdown',
        icon: '',
        source: 'notion',
        assets: assets
      });
    });
    return docs;
  }

  async function pdfText(entry) {
    const data = entry.bytes || new Uint8Array(await entry.file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data: data }).promise;
    const pages = [];
    for (let index = 1; index <= Math.min(pdf.numPages, 120); index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      pages.push(content.items.map(function (item) { return item.str; }).join(' '));
    }
    return pages.join('\n\n').replace(/[ \t]+/g, ' ').trim();
  }

  async function preparePdfEntry(entry, stats) {
    if (!window.pdfjsLib) return null;
    const data = entry.bytes || new Uint8Array(await entry.file.arrayBuffer());
    let pdf;
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
      pdf = await window.pdfjsLib.getDocument({ data: data }).promise;
    } catch (error) {
      return null;
    }
    entry.title = titleFromPath(entry.path);
    entry.markdown = '';
    entry.html = '';
    entry.htmlCss = '';
    entry.assets = {};

    if (pdf.numPages > MAX_PDF_PAGES) {
      try {
        entry.markdown = await pdfText(entry);
      } catch (error) {
        return null;
      }
      entry.format = 'markdown';
      return entry.markdown.trim() ? entry : null;
    }

    let html = '<div class="notion-pdf">';
    let markdown = '';
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const base = page.getViewport({ scale: 1.6 });
      const scale = Math.min(1, 1400 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale: 1.6 * scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const context = canvas.getContext('2d');
      try {
        await page.render({ canvasContext: context, viewport: viewport }).promise;
      } catch (error) {
        continue;
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      const key = 'pdf-pagina-' + index + '.jpg';
      entry.assets[key] = dataUrl;
      html += '<figure class="notion-pdf-page"><img src="' + dataUrl + '" alt="página ' + index + '"></figure>';
      markdown += '![página ' + index + '](' + key + ')\n\n';
      stats.images += 1;
      canvas.width = 0;
      canvas.height = 0;
    }
    html += '</div>';
    entry.html = html;
    entry.markdown = markdown;
    entry.format = 'html';
    return entry;
  }

  async function importPdf(entries, stats) {
    const prepared = [];
    for (const entry of entries.slice(0, MAX_PAGES)) {
      const page = await preparePdfEntry(entry, stats);
      if (page) prepared.push(page);
    }
    if (!prepared.length) return [];
    const roots = buildTree(prepared, ['', '.pdf']);
    const docs = [];
    roots.forEach(function (root) {
      let html = '';
      const hasHtml = (function check(page) {
        return page.format === 'html' || page.children.some(check);
      })(root);
      if (hasHtml) html = composeHtml(root, 0);
      const text = composeMarkdown(root, 0);
      if (!text.trim() && !html.trim()) return;
      const assets = {};
      const addAssets = function (page) {
        Object.keys(page.assets || {}).forEach(function (key) {
          assets[key] = page.assets[key];
        });
        page.children.forEach(addAssets);
      };
      addAssets(root);
      docs.push({
        title: root.title,
        text: text,
        html: html,
        htmlCss: '',
        format: hasHtml ? 'html' : 'markdown',
        icon: '',
        source: 'drive',
        assets: assets
      });
    });
    return docs;
  }

  async function importZip(buffer) {
    const stats = { images: 0, missing: 0, pages: 0, files: 0 };
    if (!window.fflate) {
      return { docs: [], stats: stats, error: 'zip-indisponivel' };
    }
    let files;
    try {
      files = window.fflate.unzipSync(new Uint8Array(buffer));
    } catch (error) {
      return { docs: [], stats: stats, error: 'zip-quebrado' };
    }
    const lookup = lookupFromZip(files);
    const names = Object.keys(files).filter(function (name) {
      return (TEXT_EXT.test(name) || PDF_EXT.test(name)) && !/(^|\/)(__MACOSX|\.)/.test(name);
    }).slice(0, MAX_PAGES);
    stats.files = names.length;

    const htmlEntries = [];
    const markdownEntries = [];
    const pdfEntries = [];
    for (const name of names) {
      const bytes = files[name];
      const path = SMA.normalizePath(name);
      if (PDF_EXT.test(name)) {
        pdfEntries.push({
          path: path,
          pathLower: path.toLowerCase(),
          dir: SMA.dirName(path),
          bytes: bytes
        });
        continue;
      }
      const text = new TextDecoder('utf-8').decode(bytes);
      const entry = {
        path: path,
        pathLower: path.toLowerCase(),
        dir: SMA.dirName(path),
        text: text,
        originalText: text
      };
      if (HTML_EXT.test(name)) htmlEntries.push(entry);
      else markdownEntries.push(entry);
    }

    let docs = [];
    if (htmlEntries.length) docs = await importHtml(htmlEntries, lookup, stats);
    else if (markdownEntries.length) docs = await importMarkdown(markdownEntries, lookup, stats);
    else if (pdfEntries.length) docs = await importPdf(pdfEntries, stats);
    stats.pages = docs.length;
    return { docs: docs, stats: stats };
  }

  async function importFiles(fileList) {
    const files = Array.from(fileList || []);
    const stats = { images: 0, missing: 0, pages: 0, files: 0 };
    const lookup = lookupFromFiles(files);
    const htmlEntries = [];
    const markdownEntries = [];
    const pdfEntries = [];
    const zipDocs = [];
    for (const file of files) {
      if (/\.zip$/i.test(file.name)) {
        const result = await importZip(await file.arrayBuffer());
        (result.docs || []).forEach(function (doc) { zipDocs.push(doc); });
        stats.images += result.stats.images;
        stats.missing += result.stats.missing;
        if (result.error === 'zip-quebrado') stats.error = 'zip-quebrado';
        continue;
      }
      if (PDF_EXT.test(file.name)) {
        const pdfPath = SMA.normalizePath(file.webkitRelativePath || file.name);
        pdfEntries.push({
          path: pdfPath,
          pathLower: pdfPath.toLowerCase(),
          dir: SMA.dirName(pdfPath),
          file: file
        });
        continue;
      }
      if (!TEXT_EXT.test(file.name)) continue;
      const path = SMA.normalizePath(file.webkitRelativePath || file.name);
      const text = await file.text();
      const entry = {
        path: path,
        pathLower: path.toLowerCase(),
        dir: SMA.dirName(path),
        text: text,
        originalText: text
      };
      if (HTML_EXT.test(file.name)) htmlEntries.push(entry);
      else markdownEntries.push(entry);
    }
    stats.files += htmlEntries.length + markdownEntries.length + pdfEntries.length;
    let docs = [];
    if (htmlEntries.length) docs = await importHtml(htmlEntries, lookup, stats);
    else if (markdownEntries.length) docs = await importMarkdown(markdownEntries, lookup, stats);
    if (pdfEntries.length) {
      const pdfDocs = await importPdf(pdfEntries, stats);
      docs = docs.concat(pdfDocs);
    }
    docs = zipDocs.concat(docs);
    stats.pages = docs.length;
    return { docs: docs, stats: stats };
  }

  /* ── renderização fiel ──────────────────────────────────────── */

  let lightbox = null;

  function openLightbox(url, alt) {
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'notion-lightbox';
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

  function render(doc, container) {
    if (!doc || !container) return;
    const host = document.createElement('div');
    host.className = 'notion-html-host';
    let root = host;
    if (typeof host.attachShadow === 'function') {
      root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = BASE_CSS + '\n' + (doc.htmlCss || '');
      root.appendChild(style);
    } else {
      const style = document.createElement('style');
      style.textContent = BASE_CSS;
      host.appendChild(style);
    }
    const page = document.createElement('div');
    page.className = 'notion-html-page';
    page.innerHTML = doc.html || '<div class="notion-html-empty">essa página veio vazia do notion</div>';
    root.appendChild(page);
    container.appendChild(host);

    page.querySelectorAll('img').forEach(function (image) {
      image.loading = 'lazy';
      image.addEventListener('click', function () {
        if (image.src) openLightbox(image.src, image.alt);
      });
    });
    page.querySelectorAll('a[data-notion-page]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        const id = (link.getAttribute('href') || '').replace(/^#/, '');
        if (!id) return;
        event.preventDefault();
        const target = page.querySelector('[id="' + id + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    page.querySelectorAll('a[href^="http"]').forEach(function (link) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
    page.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('notion-table-wrap')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'notion-table-wrap';
      wrapper.style.overflowX = 'auto';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  SMA.Notion = {
    importZip: importZip,
    importFiles: importFiles,
    render: render,
    isHtmlDoc: function (doc) {
      return Boolean(doc && doc.format === 'html' && doc.html);
    }
  };
})();
