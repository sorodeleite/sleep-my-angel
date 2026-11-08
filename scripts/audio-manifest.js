#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { splitTrackName } = require('../js/track-name');

const root = path.resolve(__dirname, '..');
// versão leve das meditações que vai dentro do app (o APK não cabe os originais)
const appAudioDir = path.join(root, 'media', 'meditacao');
const localAudioDir = path.join(root, 'audios', 'meditacao');
const manifestFile = path.join(root, 'assets', 'audio-manifest.json');
const audioPattern = /\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i;

// as ondas são geradas na hora pelo app (loop infinito). os arquivos de 8/10h
// ficam só no desktop e no site local, que leem a pasta audios direto.
const ONDAS = [
  {
    id: 'ondas-Pink Noise Black Screen - Sleep, Focus, Study - 10 Hours.m4a',
    title: 'Pink Noise Black Screen - Sleep, Focus, Study - 10 Hours',
    artist: '',
    category: 'ondas',
    fileName: 'Pink Noise Black Screen - Sleep, Focus, Study - 10 Hours.m4a',
    fileUrl: '',
    synth: true,
    type: 'pink'
  },
  {
    id: 'ondas-Theta Wave 2.0 - Pure Theta Frequency (8 Hour Binaural Beat).m4a',
    title: 'Theta Wave 2.0 - Pure Theta Frequency (8 Hour Binaural Beat)',
    artist: '',
    category: 'ondas',
    fileName: 'Theta Wave 2.0 - Pure Theta Frequency (8 Hour Binaural Beat).m4a',
    fileUrl: '',
    synth: true,
    type: 'theta'
  }
];

function meditationDirectory() {
  if (fs.existsSync(appAudioDir)) return appAudioDir;
  if (fs.existsSync(localAudioDir)) return localAudioDir;
  return null;
}

function listMeditations() {
  const directory = meditationDirectory();
  if (!directory) return [];
  return fs.readdirSync(directory)
    .filter((name) => audioPattern.test(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((name) => {
      const parsed = splitTrackName(name, 'meditacao');
      return {
        id: 'meditacao-' + name,
        title: parsed.title,
        artist: parsed.artist,
        category: 'meditacao',
        fileName: name,
        fileUrl: 'audios/meditacao/' + encodeURIComponent(name)
      };
    });
}

function listTracks() {
  return listMeditations().concat(ONDAS);
}

function generate(options) {
  const quiet = Boolean(options && options.quiet);
  const tracks = listTracks();
  const meditations = tracks.filter(function (track) { return track.category === 'meditacao'; });
  if (meditations.length === 0) {
    if (!quiet) console.log('nenhum áudio local encontrado; mantendo o manifest atual');
    return [];
  }
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    tracks: tracks
  }, null, 2) + '\n', 'utf-8');
  if (!quiet) console.log(tracks.length + ' áudios no manifest (' + meditations.length + ' meditações)');
  return tracks;
}

if (require.main === module) generate({ quiet: false });

module.exports = { generate: generate, listTracks: listTracks };
