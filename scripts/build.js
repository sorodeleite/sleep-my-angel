const fs = require('fs');
const path = require('path');
const { generate: generateAudioManifest } = require('./audio-manifest');

const root = path.resolve(__dirname, '..');
const targets = process.argv.includes('--site-only') ? ['site'] : ['www', 'site'];
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

  console.log('build ' + target + ' pronto');
}
