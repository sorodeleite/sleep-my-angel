#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const audiosDir = path.join(root, 'audios');
const manifestFile = path.join(root, 'assets', 'audio-manifest.json');
const categories = ['meditacao', 'ondas'];
const audioPattern = /\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i;

function cleanTitle(fileName) {
  return String(fileName)
    .replace(audioPattern, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function listTracks() {
  const tracks = [];
  categories.forEach((category) => {
    const directory = path.join(audiosDir, category);
    if (!fs.existsSync(directory)) return;
    fs.readdirSync(directory)
      .filter((name) => audioPattern.test(name))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .forEach((name) => {
        tracks.push({
          id: category + '-' + name,
          title: cleanTitle(name),
          category: category,
          fileName: name,
          fileUrl: 'audios/' + category + '/' + encodeURIComponent(name)
        });
      });
  });
  return tracks;
}

function generate(options) {
  const quiet = Boolean(options && options.quiet);
  const tracks = listTracks();
  if (tracks.length === 0) {
    if (!quiet) console.log('nenhum áudio local encontrado; mantendo o manifest atual');
    return [];
  }
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    tracks: tracks
  }, null, 2) + '\n', 'utf-8');
  if (!quiet) console.log(tracks.length + ' áudios no manifest');
  return tracks;
}

if (require.main === module) generate({ quiet: false });

module.exports = { generate: generate, listTracks: listTracks };
