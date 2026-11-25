(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieMediaKind = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PREFIXO_VIDEO = 'video:';

  const EXTENSAO_DE_VIDEO = /\.(?:mp4|m4v|webm|ogv|ogg|mov|qt|avi|mkv|3gp|3g2|mpeg|mpg)(?:[?#]|$)/i;
  const EXTENSAO_DE_GIF = /\.gif(?:[?#]|$)/i;

  function texto(valor) {
    return String(valor == null ? '' : valor).trim();
  }

  function isVideoRef(valor) {
    return /^video:/i.test(texto(valor));
  }

  function videoKey(valor) {
    const cru = texto(valor);
    return /^video:/i.test(cru) ? cru.slice(PREFIXO_VIDEO.length).trim() : '';
  }

  function videoRef(chave) {
    const nome = texto(chave);
    return nome ? PREFIXO_VIDEO + nome : '';
  }

  function isVideoFile(file) {
    if (!file) return false;
    const tipo = texto(file.type);
    if (/^video\//i.test(tipo)) return true;
    return EXTENSAO_DE_VIDEO.test(texto(file.name));
  }

  function isVideoSource(valor) {
    const cru = texto(valor);
    if (!cru) return false;
    if (isVideoRef(cru)) return true;
    if (/^data:video\//i.test(cru)) return true;
    return EXTENSAO_DE_VIDEO.test(cru);
  }

  function isGifSource(valor) {
    const cru = texto(valor);
    if (!cru) return false;
    if (/^data:image\/gif/i.test(cru)) return true;
    return EXTENSAO_DE_GIF.test(cru);
  }

  function mediaKind(valor) {
    if (isVideoSource(valor)) return 'video';
    if (isGifSource(valor)) return 'gif';
    return 'photo';
  }

  function stickerIsVideo(item) {
    if (!item) return false;
    if (typeof item === 'string') return isVideoSource(item);
    if (item.mediaType === 'video' || item.video === true) return true;
    return isVideoSource(item.content) || isVideoSource(item.src);
  }

  return {
    PREFIXO_VIDEO,
    EXTENSAO_DE_VIDEO,
    EXTENSAO_DE_GIF,
    isVideoRef,
    videoKey,
    videoRef,
    isVideoFile,
    isVideoSource,
    isGifSource,
    mediaKind,
    stickerIsVideo
  };
});
