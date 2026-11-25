(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftiePenStroke = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GROSSURAS = [
    { chave: 'fininha', rotulo: 'fininha', px: 2 },
    { chave: 'media', rotulo: 'média', px: 5 },
    { chave: 'grossa', rotulo: 'grossa', px: 10 },
    { chave: 'gigante', rotulo: 'gigante', px: 18 }
  ];

  const COR_PADRAO = '#463529';
  const GROSSURA_PADRAO = 'media';

  const FOLHA_PADRAO = 460;

  const DISTANCIA_MINIMA = 1.6;

  const TOLERANCIA_RETA = 0.9;

  const numero = (valor, padrao = 0) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  };

  function grossuraValida(valor) {
    if (typeof valor === 'number' || /^\d+(\.\d+)?$/.test(String(valor || ''))) {
      const px = Math.min(64, Math.max(0.5, numero(valor, 5)));
      return { chave: String(px), rotulo: `${px}px`, px };
    }
    const chave = String(valor || '');
    return GROSSURAS.find((g) => g.chave === chave) || grossuraPorChave(GROSSURA_PADRAO);
  }

  function grossuraPorChave(chave) {
    return GROSSURAS.find((g) => g.chave === chave) || GROSSURAS[1];
  }

  function pincel(grossura, larguraDaFolha) {
    const base = grossuraValida(grossura).px;
    const largura = numero(larguraDaFolha, 0);
    if (largura <= 0) return base;
    const escala = Math.min(3, Math.max(0.3, largura / FOLHA_PADRAO));
    return Math.min(64, Math.max(0.5, base * escala));
  }

  function corValida(valor) {
    const texto = String(valor == null ? '' : valor).trim();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(texto)) return null;
    if (texto.length === 4) {
      return ('#' + texto[1] + texto[1] + texto[2] + texto[2] + texto[3] + texto[3]).toLowerCase();
    }
    return texto.toLowerCase();
  }

  function normalizarPonto(ponto) {
    if (!ponto) return null;
    const x = Number(ponto.x);
    const y = Number(ponto.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function normalizar(pontos) {
    const lista = (Array.isArray(pontos) ? pontos : [])
      .map(normalizarPonto)
      .filter(Boolean);
    const saida = [];
    lista.forEach((ponto) => {
      const anterior = saida[saida.length - 1];
      if (anterior && Math.hypot(ponto.x - anterior.x, ponto.y - anterior.y) < 0.01) return;
      saida.push(ponto);
    });
    return saida;
  }

  function limpar(pontos, opcoes = {}) {
    const distancia = Math.max(0, numero(opcoes.distancia, DISTANCIA_MINIMA));
    const tolerancia = Math.max(0, numero(opcoes.tolerancia, TOLERANCIA_RETA));
    const lista = normalizar(pontos);
    if (lista.length <= 2) return lista;

    const saida = [lista[0]];
    for (let i = 1; i < lista.length; i += 1) {
      const ponto = lista[i];
      const ultimo = saida[saida.length - 1];
      const distanciaOk = Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y) >= distancia;
      if (!distanciaOk && i < lista.length - 1) continue;

      if (saida.length >= 2) {
        const antes = saida[saida.length - 2];
        const dx = ultimo.x - antes.x;
        const dy = ultimo.y - antes.y;
        const comprimento = Math.hypot(dx, dy);
        if (comprimento > 0) {
          const desvio = Math.abs(dy * (ponto.x - antes.x) - dx * (ponto.y - antes.y)) / comprimento;
          if (desvio <= tolerancia && i < lista.length - 1) {
            saida[saida.length - 1] = ponto;
            continue;
          }
        }
      }
      saida.push(ponto);
    }
    return saida;
  }

  function caixa(pontos, folga = 0) {
    const lista = normalizar(pontos);
    const pad = Math.max(0, numero(folga, 0));
    if (!lista.length) return { left: 0, top: 0, width: 0, height: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    lista.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    return {
      left: minX - pad,
      top: minY - pad,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2
    };
  }

  function encaixar(pontos, opcoes = {}) {
    const larguraDoPincel = Math.max(0.5, numero(opcoes.pincel, 5));
    const folga = larguraDoPincel / 2;
    const limpos = limpar(pontos, opcoes);
    const moldura = caixa(limpos, folga);
    if (!limpos.length) {
      return { pontos: [], x: 0, y: 0, width: 0, height: 0, pincel: larguraDoPincel, cor: corValida(opcoes.cor) || COR_PADRAO };
    }
    return {
      pontos: limpos.map((p) => ({ x: p.x - moldura.left, y: p.y - moldura.top })),
      x: moldura.left,
      y: moldura.top,
      width: Math.max(moldura.width, 1),
      height: Math.max(moldura.height, 1),
      pincel: larguraDoPincel,
      cor: corValida(opcoes.cor) || COR_PADRAO
    };
  }

  function caminho(pontos) {
    const lista = normalizar(pontos);
    if (!lista.length) return '';
    if (lista.length === 1) {
      const p = lista[0];
      return `M${arredondar(p.x)} ${arredondar(p.y)} l0.01 0`;
    }
    let d = `M${arredondar(lista[0].x)} ${arredondar(lista[0].y)}`;
    for (let i = 1; i < lista.length - 1; i += 1) {
      const atual = lista[i];
      const proximo = lista[i + 1];
      const meioX = (atual.x + proximo.x) / 2;
      const meioY = (atual.y + proximo.y) / 2;
      d += ` Q${arredondar(atual.x)} ${arredondar(atual.y)} ${arredondar(meioX)} ${arredondar(meioY)}`;
    }
    const ultimo = lista[lista.length - 1];
    d += ` L${arredondar(ultimo.x)} ${arredondar(ultimo.y)}`;
    return d;
  }

  const arredondar = (valor) => Math.round(numero(valor, 0) * 100) / 100;

  return {
    GROSSURAS,
    COR_PADRAO,
    GROSSURA_PADRAO,
    FOLHA_PADRAO,
    DISTANCIA_MINIMA,
    TOLERANCIA_RETA,
    corValida,
    grossuraValida,
    grossuraPorChave,
    pincel,
    normalizarPonto,
    normalizar,
    limpar,
    caixa,
    encaixar,
    caminho
  };
});
