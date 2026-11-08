const fs = require('fs');
const path = require('path');
const { generate: generateAudioManifest } = require('./audio-manifest');

const root = path.resolve(__dirname, '..');
const targets = process.argv.includes('--site-only') ? ['site'] : ['www', 'site'];
const appAudio = path.join(root, 'media', 'meditacao');
const files = [
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'sw.js'
];
const directories = ['js', 'assets'];

function copyFile(name, destination) {
  const source = path.join(root, name);
  if (!fs.existsSync(source)) {
    throw new Error('arquivo ausente: ' + name);
  }
  fs.copyFileSync(source, path.join(destination, name));
}

function copyDirectory(name, destination) {
  const source = path.join(root, name);
  fs.cpSync(source, path.join(destination, name), {
    recursive: true,
    filter: function (file) {
      if (/\.(azw3|azw|mobi|prc)$/i.test(file)) return false;
      return true;
    }
  });
}

function copyAppAudio(destination) {
  if (!fs.existsSync(appAudio)) {
    throw new Error('media/meditacao ausente: o app sairia sem as meditações');
  }
  const files = fs.readdirSync(appAudio).filter(function (name) {
    return /\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i.test(name);
  });
  if (files.length === 0) {
    throw new Error('media/meditacao está vazia: o app sairia sem as meditações');
  }
  const target = path.join(destination, 'audios', 'meditacao');
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(appAudio, target, { recursive: true });
  const total = files.reduce(function (sum, name) {
    return sum + fs.statSync(path.join(appAudio, name)).size;
  }, 0);
  console.log('meditações no app: ' + files.length + ' faixas, ' + Math.round(total / 1024 / 1024) + ' MB');
}

generateAudioManifest({ quiet: true });

for (const target of targets) {
  const destination = path.join(root, target);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });

  files.forEach(function (name) {
    copyFile(name, destination);
  });

  directories.forEach(function (name) {
    copyDirectory(name, destination);
  });

  if (target === 'www') {
    copyAppAudio(destination);
  }

  console.log('build ' + target + ' pronto');
}
