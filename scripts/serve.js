const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { splitTrackName } = require('../js/track-name');

const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || '127.0.0.1';
const url = 'http://' + host + ':' + port;
const audioExtensions = /\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i;
const categories = ['meditacao', 'ondas'];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.opus': 'audio/ogg',
  '.aac': 'audio/aac',
  '.md': 'text/markdown; charset=utf-8',
  '.epub': 'application/epub+zip',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function listTracks() {
  const tracks = [];
  categories.forEach(function (category) {
    const directory = path.join(root, 'audios', category);
    if (!fs.existsSync(directory)) return;
    fs.readdirSync(directory)
      .filter(function (name) {
        return audioExtensions.test(name);
      })
      .sort(function (a, b) {
        return a.localeCompare(b, 'pt-BR');
      })
      .forEach(function (name) {
        const parsed = splitTrackName(name, category);
        tracks.push({
          id: category + '-' + name,
          title: parsed.title,
          artist: parsed.artist,
          category: category,
          fileName: name,
          fileUrl: 'audios/' + category + '/' + encodeURIComponent(name)
        });
      });
  });
  return tracks;
}

function safePath(base, pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = path.resolve(base, '.' + decoded);
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  return target;
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload)
  });
  response.end(payload);
}

function sendFile(request, response, filePath) {
  fs.stat(filePath, function (error, stats) {
    if (error || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': mime[extension] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': extension === '.m4a' || extension === '.mp3' || extension === '.wav' || extension === '.ogg'
        ? 'public, max-age=3600'
        : 'no-cache'
    };

    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        response.writeHead(416, { 'Content-Range': 'bytes */' + stats.size });
        response.end();
        return;
      }
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
      if (start > end || start >= stats.size) {
        response.writeHead(416, { 'Content-Range': 'bytes */' + stats.size });
        response.end();
        return;
      }
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stats.size;
      headers['Content-Length'] = end - start + 1;
      response.writeHead(206, headers);
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      fs.createReadStream(filePath, { start: start, end: end }).pipe(response);
      return;
    }

    headers['Content-Length'] = stats.size;
    response.writeHead(200, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(function (request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  const parsed = new URL(request.url, url);
  const pathname = parsed.pathname;

  if (pathname === '/api/tracks') {
    sendJson(response, 200, listTracks());
    return;
  }

  if (pathname.startsWith('/audios/')) {
    const audioPath = safePath(root, pathname);
    if (!audioPath) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }
    sendFile(request, response, audioPath);
    return;
  }

  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = safePath(site, requested);
  if (!filePath) {
    response.writeHead(403);
    response.end('forbidden');
    return;
  }
  sendFile(request, response, filePath);
});

server.on('error', function (error) {
  if (error.code === 'EADDRINUSE') {
    console.error('a porta ' + port + ' já está em uso. tente PORT=4174 npm run web');
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

server.listen(port, host, function () {
  console.log('sleep my angel web em ' + url);
  if (process.argv.includes('--open')) {
    const command = process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
    const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' });
    child.unref();
  }
});
