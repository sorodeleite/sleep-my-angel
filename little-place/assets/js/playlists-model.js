(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftiePlaylists = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORE_KEY = 'pooftie_playlists';
  const LIMITE_MUSICAS = 80;
  const LIMITE_PLAYLISTS = 24;

  let contador = 0;

  function novoId(prefixo = 'pl') {
    contador += 1;
    const aleatorio = Math.random().toString(36).slice(2, 8);
    return `${prefixo}-${Date.now().toString(36)}-${contador}${aleatorio}`;
  }

  function limparNome(name, padrao = 'minha playlist') {
    const texto = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
    return texto.slice(0, 40) || padrao;
  }

  function limparCapa(cover) {
    const texto = String(cover == null ? '' : cover).trim();
    return texto || '';
  }

  function makeTrack(input = {}) {
    if (!input || typeof input !== 'object') return null;
    const name = String(input.name == null ? '' : input.name).trim().slice(0, 60);
    const file = String(input.file == null ? '' : input.file).trim();
    const audioKey = String(input.audioKey == null ? '' : input.audioKey).trim();
    if (!name && !file && !audioKey) return null;
    return {
      id: String(input.id || '').trim() || novoId('t'),
      name: name || 'musiquinha',
      file,
      audioKey,
      hidden: Boolean(input.hidden)
    };
  }

  function makePlaylist(input = {}) {
    if (!input || typeof input !== 'object') return null;
    const name = limparNome(input.name, '');
    if (!name) return null;
    const tracks = (Array.isArray(input.tracks) ? input.tracks : [])
      .map(makeTrack)
      .filter(Boolean)
      .slice(0, LIMITE_MUSICAS);
    return {
      id: String(input.id || '').trim() || novoId('pl'),
      name,
      cover: limparCapa(input.cover),
      loop: Boolean(input.loop),
      tracks
    };
  }

  function parse(raw) {
    if (!raw) return [];
    let dados = raw;
    if (typeof raw === 'string') {
      try {
        dados = JSON.parse(raw);
      } catch (error) {
        return [];
      }
    }
    if (!Array.isArray(dados)) return [];
    const vistos = new Set();
    return dados
      .map(makePlaylist)
      .filter((playlist) => {
        if (!playlist || vistos.has(playlist.id)) return false;
        vistos.add(playlist.id);
        return true;
      })
      .slice(0, LIMITE_PLAYLISTS);
  }

  function findPlaylist(list, id) {
    return (Array.isArray(list) ? list : []).find((playlist) => playlist.id === id) || null;
  }

  function indexOfPlaylist(list, id) {
    return (Array.isArray(list) ? list : []).findIndex((playlist) => playlist.id === id);
  }

  function replacePlaylist(list, id, mudanca) {
    const atual = Array.isArray(list) ? [...list] : [];
    const posicao = indexOfPlaylist(atual, id);
    if (posicao < 0) return atual;
    const base = atual[posicao];
    const nova = makePlaylist(typeof mudanca === 'function' ? mudanca(base) : { ...base, ...mudanca });
    atual[posicao] = nova || base;
    return atual;
  }

  function createPlaylist(list, { name, cover } = {}) {
    const atual = Array.isArray(list) ? [...list] : [];
    const nova = makePlaylist({ name: limparNome(name), cover });
    if (!nova || atual.length >= LIMITE_PLAYLISTS) return atual;
    return [...atual, nova];
  }

  function renamePlaylist(list, id, name) {
    const limpo = limparNome(name, '');
    if (!limpo) return Array.isArray(list) ? [...list] : [];
    return replacePlaylist(list, id, { name: limpo });
  }

  function setCover(list, id, cover) {
    return replacePlaylist(list, id, { cover: limparCapa(cover) });
  }

  function removePlaylist(list, id) {
    return (Array.isArray(list) ? list : []).filter((playlist) => playlist.id !== id);
  }

  function addTrack(list, id, track) {
    const nova = makeTrack(track);
    if (!nova) return Array.isArray(list) ? [...list] : [];
    return replacePlaylist(list, id, (playlist) => ({
      ...playlist,
      tracks: [nova, ...playlist.tracks].slice(0, LIMITE_MUSICAS)
    }));
  }

  function removeTrack(list, id, trackId) {
    return replacePlaylist(list, id, (playlist) => ({
      ...playlist,
      tracks: playlist.tracks.filter((track) => track.id !== trackId)
    }));
  }

  function setTrackHidden(list, id, trackId, hidden) {
    const querOcultar = hidden === undefined ? null : Boolean(hidden);
    return replacePlaylist(list, id, (playlist) => ({
      ...playlist,
      tracks: playlist.tracks.map((track) => {
        if (track.id !== trackId) return track;
        return { ...track, hidden: querOcultar === null ? !track.hidden : querOcultar };
      })
    }));
  }

  function toggleTrackHidden(list, id, trackId) {
    return setTrackHidden(list, id, trackId);
  }

  function visibleTracks(playlist) {
    if (!playlist) return [];
    return playlist.tracks.filter((track) => !track.hidden);
  }

  function hiddenCount(playlist) {
    if (!playlist) return 0;
    return playlist.tracks.filter((track) => track.hidden).length;
  }

  function nextPlayableIndex(playlist, from, direcao = 1) {
    const tracks = playlist && Array.isArray(playlist.tracks) ? playlist.tracks : [];
    if (!tracks.length) return -1;
    const passo = Number(direcao) < 0 ? -1 : 1;
    let posicao = Number(from) || 0;
    for (let voltas = 0; voltas < tracks.length; voltas++) {
      posicao = (posicao + passo + tracks.length) % tracks.length;
      if (!tracks[posicao].hidden) return posicao;
    }
    return -1;
  }

  function firstPlayableIndex(playlist) {
    const tracks = playlist && Array.isArray(playlist.tracks) ? playlist.tracks : [];
    return tracks.findIndex((track) => !track.hidden);
  }

  function describe(playlist) {
    if (!playlist) return { total: 0, visiveis: 0, ocultas: 0, texto: '0 músicas' };
    const total = playlist.tracks.length;
    const ocultas = hiddenCount(playlist);
    const visiveis = total - ocultas;
    const texto = total === 0
      ? 'nenhuma música ainda'
      : `${visiveis} de ${total} música${total > 1 ? 's' : ''}${ocultas ? ` · ${ocultas} oculta${ocultas > 1 ? 's' : ''}` : ''}`;
    return { total, visiveis, ocultas, texto };
  }

  return {
    STORE_KEY,
    LIMITE_MUSICAS,
    LIMITE_PLAYLISTS,
    novoId,
    makeTrack,
    makePlaylist,
    parse,
    findPlaylist,
    indexOfPlaylist,
    replacePlaylist,
    createPlaylist,
    renamePlaylist,
    setCover,
    removePlaylist,
    addTrack,
    removeTrack,
    setTrackHidden,
    toggleTrackHidden,
    visibleTracks,
    hiddenCount,
    nextPlayableIndex,
    firstPlayableIndex,
    describe
  };
});
