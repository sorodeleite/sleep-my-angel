const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const booksDir = path.join(root, 'assets', 'books');
const epubDir = path.join(booksDir, 'epub');
const coversDir = path.join(booksDir, 'covers');
const manifestFile = path.join(booksDir, 'manifest.json');
const SOURCE_EXT = /\.(azw3|azw|mobi|prc|epub|pdf|txt)$/i;
const KINDLE_EXT = /\.(azw3|azw|mobi|prc)$/i;

const CALIBRE_CANDIDATES = [
  process.env.CALIBRE_CONVERT,
  'C:\\Program Files\\Calibre2\\ebook-convert.exe',
  '/Applications/calibre.app/Contents/MacOS/ebook-convert',
  '/usr/bin/ebook-convert',
  'ebook-convert'
].filter(Boolean);

function findCalibre() {
  const absolute = CALIBRE_CANDIDATES.filter((candidate) => candidate.includes(path.sep) || candidate.includes('/'));
  const bare = CALIBRE_CANDIDATES.filter((candidate) => !absolute.includes(candidate));
  for (const candidate of absolute.concat(bare)) {
    try {
      if (candidate.includes(path.sep) || candidate.includes('/')) {
        if (fs.existsSync(candidate)) return candidate;
      } else {
        execFileSync(candidate, ['--version'], { stdio: 'ignore' });
        return candidate;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

function findMeta(convertCommand) {
  const directory = path.dirname(convertCommand);
  const names = process.platform === 'win32' ? ['ebook-meta.exe', 'ebook-meta'] : ['ebook-meta'];
  for (const name of names) {
    const candidate = path.join(directory, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'livro';
}

function cleanTitle(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—]\s*(edward art|neville goddard|joao victor|flaviano)\s*$/i, '')
    .trim();
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

function readMetadata(metaCommand, file) {
  const temporary = path.join(epubDir, '.meta-' + process.pid + '.opf');
  try {
    if (metaCommand) {
      execFileSync(metaCommand, [file, '--to-opf=' + temporary], { stdio: 'ignore' });
      const xml = fs.readFileSync(temporary, 'utf-8');
      const title = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(xml);
      const creator = /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(xml);
      return {
        title: cleanTitle(title ? decodeEntities(title[1]) : ''),
        author: cleanTitle(creator ? decodeEntities(creator[1]) : '')
      };
    }
  } catch (error) {
    return { title: '', author: '' };
  } finally {
    try { fs.rmSync(temporary, { force: true }); } catch (error) { }
  }
  return { title: '', author: '' };
}

function extractCover(metaCommand, file, target) {
  if (!metaCommand) return false;
  try {
    execFileSync(metaCommand, [file, '--get-cover=' + target], { stdio: 'ignore' });
    return fs.existsSync(target) && fs.statSync(target).size > 0;
  } catch (error) {
    return false;
  }
}

function convertToEpub(convertCommand, source, target) {
  try {
    execFileSync(convertCommand, [source, target, '--no-default-epub-cover'], {
      stdio: 'ignore',
      timeout: 120000
    });
    return fs.existsSync(target) && fs.statSync(target).size > 0;
  } catch (error) {
    return false;
  }
}

function main() {
  if (!fs.existsSync(booksDir)) {
    console.error('pasta ausente: assets/books');
    process.exit(1);
  }
  fs.mkdirSync(epubDir, { recursive: true });
  fs.mkdirSync(coversDir, { recursive: true });

  const convertCommand = findCalibre();
  const metaCommand = convertCommand ? findMeta(convertCommand) : null;
  const sources = fs.readdirSync(booksDir)
    .filter((name) => SOURCE_EXT.test(name) && fs.statSync(path.join(booksDir, name)).isFile())
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const used = new Set();
  const books = [];

  for (const name of sources) {
    const source = path.join(booksDir, name);
    let slug = slugify(name.replace(SOURCE_EXT, ''));
    let suffix = 2;
    while (used.has(slug)) slug = slugify(name.replace(SOURCE_EXT, '')) + '-' + suffix++;
    used.add(slug);

    const metadata = readMetadata(metaCommand, source);
    let file = source;
    let format = path.extname(name).slice(1).toLowerCase();

    if (KINDLE_EXT.test(name)) {
      if (!convertCommand) {
        console.warn('calibre não encontrado, pulando conversão de ' + name);
        continue;
      }
      const epubName = slug + '.epub';
      const epubPath = path.join(epubDir, epubName);
      if (!convertToEpub(convertCommand, source, epubPath)) {
        console.warn('não consegui converter ' + name);
        continue;
      }
      file = epubPath;
      format = 'epub';
    } else if (format === 'epub') {
      const epubPath = path.join(epubDir, slug + '.epub');
      fs.copyFileSync(source, epubPath);
      file = epubPath;
    }

    const coverName = slug + '.jpg';
    const coverPath = path.join(coversDir, coverName);
    const temporaryCover = path.join(coversDir, '.cover-' + process.pid + '.jpg');
    try { fs.rmSync(temporaryCover, { force: true }); } catch (error) { }
    const extracted = extractCover(metaCommand, source, temporaryCover)
      || extractCover(metaCommand, file, temporaryCover);
    let hasCover = false;
    if (extracted) {
      const existing = fs.existsSync(coverPath) ? fs.readFileSync(coverPath) : null;
      const incoming = fs.readFileSync(temporaryCover);
      const coverIsCustom = existing
        && !existing.equals(incoming)
        && fs.statSync(coverPath).mtimeMs > fs.statSync(source).mtimeMs;
      if (coverIsCustom) {
        hasCover = true;
        fs.rmSync(temporaryCover, { force: true });
      } else {
        fs.copyFileSync(temporaryCover, coverPath);
        fs.rmSync(temporaryCover, { force: true });
        hasCover = true;
      }
    } else {
      hasCover = fs.existsSync(coverPath) && fs.statSync(coverPath).size > 0;
      fs.rmSync(temporaryCover, { force: true });
    }
    if (!hasCover) {
      try { fs.rmSync(coverPath, { force: true }); } catch (error) { }
    }

    const relative = (absolute) => path.relative(root, absolute).split(path.sep).join('/');
    books.push({
      id: 'book-' + slug,
      title: metadata.title || cleanTitle(name.replace(SOURCE_EXT, '')),
      author: metadata.author || 'autora desconhecida',
      file: relative(file),
      format: format,
      cover: hasCover ? relative(coverPath) : '',
      builtin: true
    });
    console.log('✓ ' + (metadata.title || name));
  }

  fs.writeFileSync(manifestFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    books: books
  }, null, 2) + '\n', 'utf-8');
  console.log('\n' + books.length + ' livros prontos em assets/books/manifest.json');
}

main();
