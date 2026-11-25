#!/usr/bin/env node
/*
 * ocr-to-text.js — transforma livro que é só página escaneada (os "epubs que são pdf")
 * em um epub de texto de verdade: fonte redimensionável, modo escuro, destaque e anotação.
 *
 * como funciona: abre o epub, pega as páginas em imagem na ordem certa, passa cada uma
 * pelo OCR e remonta um epub novo com parágrafos, sumário e capa.
 *
 * motores:
 *   tesseract (padrão quando instalado) — melhor leitura de livro escaneado
 *   windows                            — OCR do próprio Windows, sem instalar nada (pt-BR)
 *
 * uso:
 *   node scripts/ocr-to-text.js "assets/books/epub/livro.epub"
 *   node scripts/ocr-to-text.js --all
 *   node scripts/ocr-to-text.js --all --force
 *
 * a saída vai pra assets/books/texto/<slug>.epub (+ um .txt do mesmo texto pra conferir).
 * o prepare-books.js prefere esses arquivos quando eles existem.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const JSZip = require('../js/vendor/jszip.min.js');

const root = path.resolve(__dirname, '..');
const booksDir = path.join(root, 'assets', 'books');
const epubDir = path.join(booksDir, 'epub');
const coversDir = path.join(booksDir, 'covers');
const textDir = path.join(booksDir, 'texto');
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i;

const args = process.argv.slice(2);
const force = args.includes('--force');
const all = args.includes('--all');
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const lang = option('--lang', 'pt-BR');
const engineChoice = option('--engine', 'auto');
const targets = args.filter((value, index) => {
  if (value.startsWith('--')) return false;
  if (['--lang', '--engine'].includes(args[index - 1])) return false;
  return true;
});

/* ---------------------------------------------------------------- utilidades */

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'livro';
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(parseInt(number, 10)));
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function resolveHref(baseDir, href) {
  const clean = decodeURIComponent(String(href).split('#')[0]);
  const joined = baseDir ? baseDir + '/' + clean : clean;
  const parts = [];
  for (const piece of joined.split('/')) {
    if (!piece || piece === '.') continue;
    if (piece === '..') parts.pop();
    else parts.push(piece);
  }
  return parts.join('/');
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/* ------------------------------------------------------------- tamanho da imagem */

function imageSize(buffer) {
  try {
    if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (buffer.length > 10 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
        }
        offset += 2 + length;
      }
    }
    if (buffer.length > 10 && buffer.slice(0, 3).toString('latin1') === 'GIF') {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }
  } catch (error) {
    return null;
  }
  return null;
}

/* ------------------------------------------------------------------ ler o epub */

async function readEpub(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const container = zip.file('META-INF/container.xml');
  if (!container) throw new Error('epub sem META-INF/container.xml');
  const containerXml = await container.async('string');
  const rootMatch = /<rootfile[^>]*full-path=["']([^"']+)["']/i.exec(containerXml);
  if (!rootMatch) throw new Error('epub sem rootfile');
  const opfPath = resolveHref('', rootMatch[1]);
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error('epub sem content.opf');
  const opf = await opfFile.async('string');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  const manifest = new Map();
  const itemRe = /<item\b[^>]*>/gi;
  let itemMatch;
  while ((itemMatch = itemRe.exec(opf))) {
    const tag = itemMatch[0];
    const id = /\bid=["']([^"']+)["']/i.exec(tag);
    const href = /\bhref=["']([^"']+)["']/i.exec(tag);
    const type = /\bmedia-type=["']([^"']+)["']/i.exec(tag);
    if (id && href) {
      manifest.set(id[1], {
        href: resolveHref(opfDir, href[1]),
        type: (type ? type[1] : '').toLowerCase()
      });
    }
  }

  const spine = [];
  const refRe = /<itemref\b[^>]*idref=["']([^"']+)["']/i;
  const spineBlock = /<spine\b[\s\S]*?<\/spine>/i.exec(opf);
  if (spineBlock) {
    const refs = spineBlock[0].match(/<itemref\b[^>]*>/gi) || [];
    for (const ref of refs) {
      const id = refRe.exec(ref);
      if (id && manifest.has(id[1])) spine.push(manifest.get(id[1]));
    }
  }

  const title = stripTags((/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opf) || [])[1] || '');
  const creator = stripTags((/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(opf) || [])[1] || '');
  const coverId = /<meta\s+name=["']cover["']\s+content=["']([^"']+)["']/i.exec(opf);
  const coverHref = coverId && manifest.has(coverId[1]) ? manifest.get(coverId[1]).href : '';
  return { zip, opf, opfDir, manifest, spine, title, creator, coverHref };
}

/* --------------------------------------------- páginas em ordem de leitura */

async function collectPages(book) {
  const pages = [];
  const seen = new Set();

  async function pushImage(entryName) {
    const entry = book.zip.file(entryName);
    if (!entry || seen.has(entryName)) return;
    if (book.coverHref && entryName === book.coverHref) return;
    seen.add(entryName);
    const buffer = Buffer.from(await entry.async('uint8array'));
    const size = imageSize(buffer);
    if (size && (size.width < 700 || size.height < 900)) return;
    pages.push({ name: entryName, buffer, size });
  }

  async function imageFromHtml(entryName) {
    const entry = book.zip.file(entryName);
    if (!entry) return null;
    const html = await entry.async('string');
    const match = /<img\b[^>]*src=["']([^"']+)["']/i.exec(html)
      || /<image\b[^>]*xlink:href=["']([^"']+)["']/i.exec(html);
    if (!match) return null;
    const baseDir = entryName.includes('/') ? entryName.slice(0, entryName.lastIndexOf('/')) : '';
    return resolveHref(baseDir, match[1]);
  }

  for (const item of book.spine) {
    if (IMAGE_EXT.test(item.href)) {
      await pushImage(item.href);
      continue;
    }
    if (/xhtml|html/.test(item.type) || /\.(x?html|htm)$/i.test(item.href)) {
      const source = await imageFromHtml(item.href);
      if (source) await pushImage(source);
    }
  }
  const fromSpine = pages.slice();

  // epub "convertido em imagens" costuma deixar as páginas soltas no manifest,
  // fora do spine — aí a ordem boa é o nome do arquivo (00001, 00002, ...)
  pages.length = 0;
  seen.clear();
  const manifestImages = [];
  for (const item of book.manifest.values()) {
    if (IMAGE_EXT.test(item.href)) manifestImages.push(item.href);
  }
  manifestImages.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  for (const href of manifestImages) await pushImage(href);

  return pages.length > fromSpine.length ? pages : fromSpine;
}

async function measureText(book) {
  let chars = 0;
  for (const entry of Object.values(book.zip.files)) {
    if (entry.dir || !/\.(x?html|htm)$/i.test(entry.name)) continue;
    chars += stripTags(await entry.async('string')).length;
  }
  return chars;
}

/* ------------------------------------------------------------------------- OCR */

const BLANK_LINE = /\r?\n[ \t]*\r?\n/;

function blocksFromText(text) {
  return String(text)
    .split(BLANK_LINE)
    .map((block) => block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length);
}

const TESSERACT_LANGS = { pt: 'por', en: 'eng', es: 'spa', fr: 'fra', it: 'ita', de: 'deu' };

async function ocrWithTesseract(images) {
  let Tesseract;
  try {
    Tesseract = require('tesseract.js');
  } catch (error) {
    return null;
  }
  const language = TESSERACT_LANGS[lang.split('-')[0].toLowerCase()] || lang;
  let worker;
  try {
    worker = await Tesseract.createWorker(language, 1, { logger: () => {} });
  } catch (error) {
    console.log('  ⚠ tesseract não conseguiu carregar o idioma (' + error.message + ') — usando o OCR do Windows');
    return null;
  }
  const pages = [];
  try {
    for (let index = 0; index < images.length; index += 1) {
      const { data } = await worker.recognize(images[index]);
      pages.push(blocksFromText(data.text || ''));
      process.stdout.write(`\r  tesseract ${index + 1}/${images.length}`);
    }
    process.stdout.write('\n');
  } catch (error) {
    console.log('  ⚠ tesseract falhou (' + error.message + ') — usando o OCR do Windows');
    return null;
  } finally {
    try { await worker.terminate(); } catch (error) {}
  }
  return pages;
}

function runWindowsOcr(images, workDir) {
  const listFile = path.join(workDir, 'paginas.txt');
  const outDir = path.join(workDir, 'ocr');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(listFile, images.join('\r\n'), 'utf-8');
  const script = path.join(__dirname, 'ocr-windows.ps1');
  execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script,
    '-ListFile', listFile, '-OutDir', outDir, '-Lang', lang
  ], { stdio: ['ignore', 'inherit', 'inherit'], timeout: 60 * 60 * 1000 });
  return outDir;
}

function blocksFromGeometry(page) {
  const lines = page.lines
    .map((line) => ({ ...line, text: normalizeLine(line.text) }))
    .filter((line) => line.text && !isPageNumber(line.text));
  if (!lines.length) return [];

  const height = page.height || 0;
  const lineHeight = median(lines.map((line) => line.h)) || 24;
  const marginLeft = Math.min(...lines.map((line) => line.x));
  const contentRight = Math.max(...lines.map((line) => line.x + line.w));
  const contentWidth = Math.max(1, contentRight - marginLeft);
  const blocks = [];
  let current = [];
  let previous = null;

  const flush = () => {
    if (current.length) blocks.push(current);
    current = [];
  };

  lines.forEach((line) => {
    const nearTop = height && line.y + line.h < height * 0.055 && lines.length > 6;
    const nearBottom = height && line.y > height * 0.945 && lines.length > 6;
    if ((nearTop || nearBottom) && line.text.length < 80) return;

    const indent = line.x - marginLeft;
    const gap = previous ? line.y - (previous.y + previous.h) : 0;
    const titleLine = line.h > lineHeight * 1.22
      && line.w < contentWidth * 0.82
      && !/[.,;:!?]$/.test(line.text);

    if (titleLine && line.text.length <= 70) {
      flush();
      blocks.push({ heading: true, lines: [line.text] });
      previous = line;
      return;
    }

    const startsNew = current.length > 0 && (
      indent > Math.max(10, lineHeight * 0.45)
      || gap > lineHeight * 0.9
      || /^[—–]\s*/.test(line.text)
      || (previous && endsSentence(previous.text) && !startsLower(line.text))
    );
    if (startsNew) flush();
    current.push(line.text);
    previous = line;
  });
  flush();

  return blocks.map((block) => (Array.isArray(block) ? block : block.lines));
}

function windowsPages(images, workDir) {
  const ocrDir = runWindowsOcr(images, workDir);
  return images.map((image) => {
    const json = path.join(ocrDir, path.basename(image, path.extname(image)) + '.json');
    if (!fs.existsSync(json)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(json, 'utf-8'));
      return blocksFromGeometry({ width: Number(data.width) || 0, height: Number(data.height) || 0, lines: Array.isArray(data.lines) ? data.lines : [] });
    } catch (error) {
      return [];
    }
  });
}

/* ------------------------------------------------------ limpeza e montagem do texto */

const CONNECTORS = ['Mas', 'Porém', 'Contudo', 'Entretanto', 'Portanto', 'Então', 'No entanto',
  'Além disso', 'Desse modo', 'Dessa forma', 'Assim', 'Por isso', 'Ainda assim', 'Agora'];

function normalizeLine(line) {
  return String(line)
    .replace(/\u0000/g, '')
    .replace(/[\u00ad\u200b\ufeff]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;:])(?=[^\s])/g, '$1 ')
    .replace(/\.{3,}/g, '…')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function isPageNumber(line) {
  return /^[-–—\s]*\d{1,4}[-–—\s]*$/.test(line) || /^(p[áa]gina|page)\s*\d+$/i.test(line);
}

function endsSentence(line) {
  return /[.!?…]["')\]]?$/.test(line) && !/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]\.$/.test(line);
}

function startsLower(line) {
  return /^[a-záàâãéêíóôõúüç]/.test(line);
}

function runningHeads(pages) {
  const counts = new Map();
  for (const blocks of pages) {
    for (const block of blocks) {
      for (const line of block) {
        if (line.length > 60 || line.length < 4) continue;
        const key = line.toLowerCase().replace(/\d+/g, '#');
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  const threshold = Math.max(3, Math.round(pages.length * 0.35));
  const repeated = new Set();
  for (const [key, count] of counts) {
    if (count >= threshold) repeated.add(key);
  }
  return repeated;
}

function joinLines(lines) {
  let text = '';
  for (const raw of lines) {
    const line = normalizeLine(raw);
    if (!line) continue;
    if (!text) {
      text = line;
      continue;
    }
    if (text.endsWith('-') && startsLower(line)) {
      text = text.slice(0, -1) + line;
      continue;
    }
    text += ' ' + line;
  }
  return text;
}

const SECTION_WORDS = /^(índice|indice|sumário|sumario|prefácio|prefacio|introdução|introducao|capítulo|capitulo|epílogo|epilogo|conclusão|conclusao|apresentação|apresentacao|prólogo|prologo|agradecimentos|nota do autor)\b/i;

function looksLikeHeading(lines, text) {
  if (lines.length > 2) return false;
  if (text.length > 70 || text.length < 3) return false;
  if (/[.,;:!?]$/.test(text)) return false;
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 3) return false;
  if (letters === letters.toUpperCase() && letters.length >= 4) return true;
  return SECTION_WORDS.test(text) && text.length <= 40;
}

function assemble(pages) {
  const heads = runningHeads(pages);
  const paragraphs = [];

  pages.forEach((blocks, pageIndex) => {
    blocks.forEach((block, blockIndex) => {
      const lines = block.filter((line) => {
        const value = normalizeLine(line);
        if (!value || isPageNumber(value)) return false;
        if (value.length <= 60 && heads.has(value.toLowerCase().replace(/\d+/g, '#'))) return false;
        return true;
      });
      if (!lines.length) return;

      let text = joinLines(lines);
      const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, '');
      if (letters.length < 4) return;
      const symbols = text.replace(/[A-Za-zÀ-ÿ0-9\s]/g, '').length;
      if (symbols > text.length * 0.35) return;

      text = text
        .replace(/,(\s*)(?=(Mas|Porém|Contudo|Entretanto|Portanto|Então|No\s+entanto|Além\s+disso|Agora)\b)/g, '.$1')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (!text) return;

      const heading = looksLikeHeading(lines, text);
      const previous = paragraphs[paragraphs.length - 1];
      const continuesAcrossPage = pageIndex > 0 && blockIndex === 0 && previous
        && !endsSentence(previous.text)
        && !previous.heading
        && startsLower(text);
      if (continuesAcrossPage) {
        previous.text = previous.text.endsWith('-')
          ? previous.text.slice(0, -1) + text
          : previous.text + ' ' + text;
        return;
      }
      // o OCR às vezes corta um parágrafo no meio: junta quando a frase continua
      const continuesHere = previous && !previous.heading && !heading
        && !endsSentence(previous.text)
        && startsLower(text);
      if (continuesHere) {
        previous.text = previous.text.endsWith('-')
          ? previous.text.slice(0, -1) + text
          : previous.text + ' ' + text;
        return;
      }
      paragraphs.push({ text, heading });
    });
  });

  return paragraphs;
}

/* --------------------------------------------------------------- montar o epub */

function sectionize(paragraphs) {
  const sections = [];
  let current = { heading: '', paragraphs: [] };
  let chars = 0;
  for (const paragraph of paragraphs) {
    if (paragraph.heading) {
      if (current.paragraphs.length || current.heading) sections.push(current);
      current = { heading: paragraph.text, paragraphs: [] };
      chars = 0;
      continue;
    }
    if (chars > 6000) {
      if (current.paragraphs.length || current.heading) sections.push(current);
      current = { heading: '', paragraphs: [] };
      chars = 0;
    }
    current.paragraphs.push(paragraph.text);
    chars += paragraph.text.length;
  }
  if (current.paragraphs.length || current.heading) sections.push(current);
  const usable = sections.filter((section) => section.paragraphs.length || section.heading);
  return usable.length ? usable : [{ heading: '', paragraphs: ['(o OCR não encontrou texto nessas páginas)'] }];
}

function xhtmlPage(section, index) {
  const body = section.paragraphs.map((text) => '    <p>' + escapeXml(text) + '</p>').join('\n');
  const heading = section.heading ? '    <h2>' + escapeXml(section.heading) + '</h2>\n' : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>${escapeXml(section.heading || 'Parte ' + (index + 1))}</title>
    <link rel="stylesheet" type="text/css" href="../style.css" />
  </head>
  <body>
${heading}${body}
  </body>
</html>
`;
}

function contentOpf(meta, sections) {
  const items = sections.map((_, index) => {
    const id = 'part' + String(index + 1).padStart(3, '0');
    return `    <item id="${id}" href="text/${id}.xhtml" media-type="application/xhtml+xml" />`;
  });
  const spine = sections.map((_, index) => {
    const id = 'part' + String(index + 1).padStart(3, '0');
    return `    <itemref idref="${id}" />`;
  });
  const coverItem = meta.hasCover
    ? '    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" />\n    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml" />\n'
    : '';
  const coverSpine = meta.hasCover ? '    <itemref idref="titlepage" />\n' : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(meta.title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(meta.author)}</dc:creator>
    <dc:language>pt-BR</dc:language>
    <dc:identifier id="bookid">urn:uuid:${meta.uuid}</dc:identifier>
    <dc:source>${escapeXml(meta.source)}</dc:source>
    <meta name="cover" content="cover-image" />
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="style" href="style.css" media-type="text/css" />
${coverItem}${items.join('\n')}
  </manifest>
  <spine toc="ncx">
${coverSpine}${spine.join('\n')}
  </spine>
</package>
`;
}

function tocNcx(meta, sections) {
  const points = sections.map((section, index) => `    <navPoint id="nav${index + 1}" playOrder="${index + 1}">
      <navLabel><text>${escapeXml(section.heading || 'Parte ' + (index + 1))}</text></navLabel>
      <content src="text/part${String(index + 1).padStart(3, '0')}.xhtml" />
    </navPoint>`);
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${meta.uuid}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>${escapeXml(meta.title)}</text></docTitle>
  <navMap>
${points.join('\n')}
  </navMap>
</ncx>
`;
}

const CONTAINER_XML = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`;

const STYLE_CSS = `body {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.7;
  margin: 1.2em 1em;
}
p {
  margin: 0 0 0.9em 0;
  text-align: justify;
  text-indent: 1.4em;
  hyphens: auto;
}
h2 {
  font-size: 1.3em;
  text-align: center;
  margin: 1.6em 0 1.2em 0;
  page-break-before: always;
}
`;

function titlepage(meta) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Capa</title>
    <style type="text/css">body { margin: 0; padding: 0; text-align: center; } img { max-width: 100%; }</style>
  </head>
  <body><img src="cover.jpg" alt="${escapeXml(meta.title)}" /></body>
</html>
`;
}

async function writeEpub(target, meta, sections, coverBuffer) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', CONTAINER_XML);
  zip.file('OEBPS/content.opf', contentOpf(meta, sections));
  zip.file('OEBPS/toc.ncx', tocNcx(meta, sections));
  zip.file('OEBPS/style.css', STYLE_CSS);
  if (meta.hasCover && coverBuffer) {
    zip.file('OEBPS/cover.jpg', coverBuffer);
    zip.file('OEBPS/titlepage.xhtml', titlepage(meta));
  }
  sections.forEach((section, index) => {
    const id = 'part' + String(index + 1).padStart(3, '0');
    zip.file('OEBPS/text/' + id + '.xhtml', xhtmlPage(section, index));
  });
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
  return buffer.length;
}

/* --------------------------------------------------------------------- fluxo */

async function convertEpub(sourceFile) {
  if (!/\.epub$/i.test(sourceFile)) {
    throw new Error('por enquanto só epub de entrada — pra pdf, use o Calibre: ebook-convert "livro.pdf" "livro.epub"');
  }
  const slug = slugify(path.basename(sourceFile, path.extname(sourceFile)));
  const target = path.join(textDir, slug + '.epub');
  if (fs.existsSync(target) && !force) {
    console.log('↷ já existe: ' + path.relative(root, target) + ' (use --force pra refazer)');
    return { skipped: true };
  }

  const book = await readEpub(sourceFile);
  const textChars = await measureText(book);
  const pages = await collectPages(book);
  if (textChars > 3000 && !force) {
    console.log('↷ ' + path.basename(sourceFile) + ': já é texto (' + textChars + ' caracteres), não precisa de OCR');
    return { skipped: true };
  }
  if (!pages.length) {
    console.log('↷ ' + path.basename(sourceFile) + ': não achei páginas escaneadas, ignorando');
    return { skipped: true };
  }

  console.log('☾ ' + path.basename(sourceFile));
  console.log('  páginas: ' + pages.length + ' · texto no arquivo: ' + textChars + ' caracteres');

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sma-ocr-'));
  const images = [];
  pages.forEach((page, index) => {
    const extension = path.extname(page.name).toLowerCase() || '.img';
    const file = path.join(workDir, 'pagina-' + String(index + 1).padStart(4, '0') + extension);
    fs.writeFileSync(file, page.buffer);
    images.push(file);
  });

  let engine = engineChoice;
  let pageBlocks = null;
  if (engine !== 'windows') {
    pageBlocks = await ocrWithTesseract(images);
    if (pageBlocks) engine = 'tesseract';
    else if (engine === 'tesseract') throw new Error('tesseract.js não está instalado — rode "npm install"');
  }
  if (!pageBlocks) {
    engine = 'windows';
    pageBlocks = windowsPages(images, workDir);
  }

  const paragraphs = assemble(pageBlocks);
  const totalChars = paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0);
  if (totalChars < 400) {
    console.log('  ⚠ o OCR quase não achou texto — confira as páginas antes de usar');
  }
  const sections = sectionize(paragraphs);

  const coverPath = path.join(coversDir, slug + '.jpg');
  const coverBuffer = fs.existsSync(coverPath) ? fs.readFileSync(coverPath) : null;
  const meta = {
    title: book.title || path.basename(sourceFile, path.extname(sourceFile)),
    author: book.creator || 'autor desconhecido',
    uuid: crypto.randomUUID(),
    source: path.basename(sourceFile),
    hasCover: Boolean(coverBuffer)
  };

  const size = await writeEpub(target, meta, sections, coverBuffer);
  fs.writeFileSync(
    path.join(textDir, slug + '.txt'),
    paragraphs.map((paragraph) => (paragraph.heading ? '# ' : '') + paragraph.text).join('\n\n') + '\n',
    'utf-8'
  );
  fs.rmSync(workDir, { recursive: true, force: true });

  console.log('  ✓ ' + paragraphs.length + ' parágrafos · ' + sections.length + ' partes · '
    + Math.round(size / 1024) + ' KB · motor: ' + engine);
  console.log('  → ' + path.relative(root, target));
  return { skipped: false, paragraphs: paragraphs.length, chars: totalChars };
}

async function main() {
  let files = [];
  if (all) {
    files = fs.readdirSync(epubDir)
      .filter((name) => /\.epub$/i.test(name))
      .map((name) => path.join(epubDir, name))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  } else if (targets.length) {
    files = targets.map((value) => path.resolve(value));
  } else {
    console.log('uso: node scripts/ocr-to-text.js <arquivo.epub | --all> [--force] [--engine tesseract|windows] [--lang pt-BR]');
    process.exit(1);
  }

  let converted = 0;
  let failed = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log('✗ não achei ' + file);
      failed += 1;
      continue;
    }
    try {
      const result = await convertEpub(file);
      if (result && !result.skipped) converted += 1;
    } catch (error) {
      failed += 1;
      console.log('✗ ' + path.basename(file) + ': ' + error.message);
    }
  }
  console.log('\n' + converted + ' livro(s) virado(s) em texto' + (failed ? ' · ' + failed + ' falhou' : ''));
  console.log('rode "npm run books" pra atualizar o manifest da estante.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
