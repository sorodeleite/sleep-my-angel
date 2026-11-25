(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieImageEncode = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function ehDataUrlDeImagem(valor) {
    return /^data:image\//i.test(String(valor == null ? '' : valor));
  }

  function ehJpeg(valor) {
    return /^data:image\/jpe?g/i.test(String(valor == null ? '' : valor));
  }

  function temTransparencia(dados) {
    if (!dados || typeof dados.length !== 'number') return true;
    for (let i = 3; i < dados.length; i += 4) {
      if (dados[i] < 255) return true;
    }
    return false;
  }

  function formatosPermitidos(temAlfa) {
    return temAlfa ? ['webp', 'png'] : ['webp', 'jpeg'];
  }

  function podeUsar(formato, temAlfa) {
    return formatosPermitidos(temAlfa).includes(String(formato || '').toLowerCase());
  }

  function menorDataUrl(candidatos, { semPerderTransparencia = false } = {}) {
    let menor = '';
    (Array.isArray(candidatos) ? candidatos : []).forEach((novo) => {
      if (!ehDataUrlDeImagem(novo)) return;
      if (semPerderTransparencia && ehJpeg(novo)) return;
      if (!menor || novo.length < menor.length) menor = novo;
    });
    return menor;
  }

  return {
    ehDataUrlDeImagem,
    ehJpeg,
    temTransparencia,
    formatosPermitidos,
    podeUsar,
    menorDataUrl
  };
});
