(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieStickerPlacement = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SOBRA_PADRAO = 22;

  function clampToBox(pos, size, box) {
    const maxLeft = Math.max(0, box.width - size.width);
    const maxTop = Math.max(0, box.height - size.height);
    return {
      left: Math.min(Math.max(pos.left, 0), maxLeft),
      top: Math.min(Math.max(pos.top, 0), maxTop)
    };
  }

  function clampKeepingVisible(pos, size, box, minVisible = SOBRA_PADRAO) {
    const largura = Math.max(0, Number(box && box.width) || 0);
    const altura = Math.max(0, Number(box && box.height) || 0);
    const w = Math.max(0, Number(size && size.width) || 0);
    const h = Math.max(0, Number(size && size.height) || 0);
    if (!largura || !altura) return { left: pos.left, top: pos.top };

    const sobra = Math.max(0, Number(minVisible) || 0);
    const sobraX = Math.min(sobra, w);
    const sobraY = Math.min(sobra, h);
    const minLeft = sobraX - w;
    const minTop = sobraY - h;
    const maxLeft = Math.max(minLeft, largura - sobraX);
    const maxTop = Math.max(minTop, altura - sobraY);
    return {
      left: Math.min(Math.max(pos.left, minLeft), maxLeft),
      top: Math.min(Math.max(pos.top, minTop), maxTop)
    };
  }

  function overlapArea(pos, size, rect) {
    if (!rect) return 0;
    const largura = Math.min(pos.left + size.width, rect.right) - Math.max(pos.left, rect.left);
    const altura = Math.min(pos.top + size.height, rect.bottom) - Math.max(pos.top, rect.top);
    return largura > 0 && altura > 0 ? largura * altura : 0;
  }

  function placeStickerSafely(pos, size, box, keepOut = null, opcoes = {}) {
    const minVisible = Math.max(0, Number(opcoes && opcoes.minVisible) || 0);
    const prender = minVisible > 0
      ? (tentativa) => clampKeepingVisible(tentativa, size, box, minVisible)
      : (tentativa) => clampToBox(tentativa, size, box);

    const desejada = prender(pos);
    if (overlapArea(desejada, size, keepOut) === 0) return desejada;

    const saidas = [
      { left: desejada.left, top: keepOut.top - size.height },
      { left: desejada.left, top: keepOut.bottom },
      { left: keepOut.left - size.width, top: desejada.top },
      { left: keepOut.right, top: desejada.top }
    ].map(prender);

    let melhor = desejada;
    let menorSobra = overlapArea(desejada, size, keepOut);
    for (const tentativa of saidas) {
      const sobra = overlapArea(tentativa, size, keepOut);
      if (sobra < menorSobra) {
        melhor = tentativa;
        menorSobra = sobra;
      }
    }
    return melhor;
  }

  return { SOBRA_PADRAO, clampToBox, clampKeepingVisible, overlapArea, placeStickerSafely };
});
