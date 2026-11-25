(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftiePageText = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TAMANHOS = [14, 17, 21, 26, 32, 40, 50];
  const TAMANHO_PADRAO = 21;
  const Z_PADRAO = 30;

  let contadorDeIds = 0;

  function novoId() {
    contadorDeIds += 1;
    return `txt-${Date.now().toString(36)}-${contadorDeIds.toString(36)}`;
  }

  const numero = (valor, padrao) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  };

  function tamanhoValido(valor) {
    const n = Math.round(numero(valor, TAMANHO_PADRAO));
    const menor = TAMANHOS[0];
    const maior = TAMANHOS[TAMANHOS.length - 1];
    return Math.min(maior, Math.max(menor, n));
  }

  function passoDoTamanho(valor, direcao = 1) {
    const atual = tamanhoValido(valor);
    if (numero(direcao, 1) < 0) {
      const menores = TAMANHOS.filter((t) => t < atual);
      return menores.length ? menores[menores.length - 1] : TAMANHOS[0];
    }
    const maiores = TAMANHOS.filter((t) => t > atual);
    return maiores.length ? maiores[0] : TAMANHOS[TAMANHOS.length - 1];
  }

  function textoLimpo(valor) {
    return String(valor == null ? '' : valor)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizar(item = {}, index = 0) {
    const dados = (item && typeof item === 'object') ? item : {};
    return {
      id: String(dados.id || '').trim() || `txt-${index + 1}`,
      text: textoLimpo(dados.text != null ? dados.text : dados.texto),
      x: Math.max(0, Math.round(numero(dados.x, 0))),
      y: Math.max(0, Math.round(numero(dados.y, 0))),
      size: tamanhoValido(dados.size),
      rotation: numero(dados.rotation, 0),
      zIndex: Math.round(numero(dados.zIndex, Z_PADRAO)),
      locked: Boolean(dados.locked)
    };
  }

  function listaNormalizada(lista) {
    return (Array.isArray(lista) ? lista : [])
      .map((item, index) => normalizar(item, index))
      .filter((item) => item.text);
  }

  function caberDentro(pos, size, box) {
    const largura = Math.max(0, numero(box && box.width, 0));
    const altura = Math.max(0, numero(box && box.height, 0));
    const esquerda = numero(pos && pos.left, 0);
    const cima = numero(pos && pos.top, 0);
    if (largura <= 0 || altura <= 0) return { left: esquerda, top: cima };
    const maxLeft = Math.max(0, largura - Math.max(0, numero(size && size.width, 0)));
    const maxTop = Math.max(0, altura - Math.max(0, numero(size && size.height, 0)));
    return {
      left: Math.min(Math.max(esquerda, 0), maxLeft),
      top: Math.min(Math.max(cima, 0), maxTop)
    };
  }

  function estiloCss(item) {
    const t = normalizar(item);
    return [
      `left: ${t.x}px`,
      `top: ${t.y}px`,
      `font-size: ${t.size}px`,
      t.rotation ? `transform: rotate(${t.rotation}deg)` : '',
      `z-index: ${t.zIndex}`
    ].filter(Boolean).join('; ');
  }

  return {
    TAMANHOS,
    TAMANHO_PADRAO,
    Z_PADRAO,
    novoId,
    tamanhoValido,
    passoDoTamanho,
    textoLimpo,
    normalizar,
    listaNormalizada,
    caberDentro,
    estiloCss
  };
});
