(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieMuralModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSAO = 1;
  const TITULO_MAX = 40;
  const ALIAS_MAX = 32;
  const ICONE_MAX = 16;
  const ICONE_IMAGEM_MAX = 180 * 1024;
  const CARTAO_W = 0.44;
  const CARTAO_W_MIN = 0.18;
  const CARTAO_W_MAX = 0.92;
  const STICKER_W = 0.16;
  const STICKER_W_MIN = 0.05;
  const STICKER_W_MAX = 0.62;
  const ROTACAO_MAX = 180;
  const PASSO_TAMANHO = 0.06;
  const PASSO_GIRO = 15;
  const PROPORCAO_MIN = 0.5;
  const PROPORCAO_MAX = 1.8;
  const ADESIVO_IMAGEM_MAX = 320 * 1024;

  const FUNDOS = ['pinboard', 'linho', 'papel', 'rosa', 'noite'];

  const ICONES = ['🌸', '🌷', '🎀', '🍓', '🐰', '🧸', '⭐', '🌙', '🍰', '🦋', '💌', '🐻', '🌼', '🍒', '☁️', '🕊️'];

  const ICONES_ADESIVOS = [
    'assets/stickers/coracaozinhos/35ER6P_front_0_live.webp',
    'assets/stickers/coracaozinhos/4QZMVY_front_0_live.webp',
    'assets/stickers/lacinhos/bow.webp',
    'assets/stickers/lacinhos/54WCFQ_front_0_live.webp',
    'assets/stickers/lacinhos/9LNF9S_front_0_live.webp',
    'assets/stickers/natureza/cloud.webp',
    'assets/stickers/natureza/flower_twig_1.webp',
    'assets/stickers/natureza/delicate.webp',
    'assets/stickers/comidinhas/cupcake.webp',
    'assets/stickers/comidinhas/chantilliy.webp',
    'assets/stickers/pooftie/adesivo.webp',
    'assets/stickers/pooftie/sticker1.webp',
    'assets/stickers/animais/IMG_5887.webp',
    'assets/stickers/pelucias/animation.webp',
    'assets/stickers/natureza/snail.gif'
  ];

  const numero = (valor, padrao = 0) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  };

  const prender = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));

  const textoCurto = (valor, limite) => String(valor == null ? '' : valor)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limite);

  const ehImagem = (valor) => /^(?:data:image\/|assets\/)/i.test(String(valor || ''));

  function normalizarIcone(valor, reserva = '🌸') {
    let cru = valor;
    if (cru && typeof cru === 'object') {
      cru = cru.value ?? cru.src ?? cru.icon ?? cru.icone ?? '';
    }
    const texto = String(cru == null ? '' : cru).trim();
    if (!texto) return reserva;
    if (ehImagem(texto)) {
      return texto.length <= ICONE_IMAGEM_MAX ? texto : reserva;
    }
    return [...texto].length <= ICONE_MAX ? texto : reserva;
  }

  function normalizarArte(valor) {
    const achado = /^letter([1-9]|1[0-5])$/.exec(String(valor || ''));
    return achado ? `letter${achado[1]}` : 'letter1';
  }

  function normalizarFundo(valor) {
    return FUNDOS.includes(String(valor || '')) ? String(valor) : FUNDOS[0];
  }

  function normalizarCor(valor) {
    const texto = String(valor || '').trim();
    return /^#[0-9a-f]{6}$/i.test(texto) ? texto : '';
  }

  function normalizarCarta(item, indice = 0) {
    if (!item || typeof item !== 'object') return null;
    const pagina = item.page || item.pagina;
    if (!pagina || typeof pagina !== 'object') return null;
    const id = textoCurto(item.id || item.letterId || `mural-${indice + 1}`, 90)
      || `mural-${indice + 1}`;
    const w = prender(numero(item.w, CARTAO_W), CARTAO_W_MIN, CARTAO_W_MAX);
    return {
      id,
      letterId: textoCurto(item.letterId || item.id, 90),
      art: normalizarArte(item.art),
      senderAlias: textoCurto(item.senderAlias || item.remetente, ALIAS_MAX) || 'alguém',
      senderIcon: normalizarIcone(item.senderIcon || item.icone, ''),
      page: pagina,
      x: prender(numero(item.x, 0.04), 0, Math.max(0, 1 - w)),
      y: prender(numero(item.y, 0.04), 0, 0.96),
      w,
      rotation: prender(numero(item.rotation, -2), -ROTACAO_MAX, ROTACAO_MAX),
      z: Math.trunc(prender(numero(item.z, 20), 1, 99999)),
      createdAt: String(item.createdAt || item.abertaEm || '') || null
    };
  }

  function normalizarArteDoAdesivo(valor) {
    const texto = String(valor == null ? '' : valor).trim();
    if (!texto) return '';
    if (ehImagem(texto)) return texto.length <= ADESIVO_IMAGEM_MAX ? texto : '';
    if (/[<>&"'`\\]/.test(texto)) return '';
    const curtinho = [...texto].slice(0, ICONE_MAX).join('').trim();
    if (/[a-z0-9]/i.test(curtinho)) return '';
    return curtinho;
  }

  function normalizarAdesivo(item, indice = 0) {
    if (!item || typeof item !== 'object') return null;
    const src = normalizarArteDoAdesivo(item.src || item.imagem);
    if (!src) return null;
    const w = prender(numero(item.w, STICKER_W), STICKER_W_MIN, STICKER_W_MAX);
    return {
      id: textoCurto(item.id, 90) || `mural-sticker-${Date.now().toString(36)}-${indice + 1}`,
      src,
      kind: ehImagem(src) ? 'image' : 'emoji',
      x: prender(numero(item.x, 0.7), 0, Math.max(0, 1 - w)),
      y: prender(numero(item.y, 0.7), 0, 0.95),
      w,
      rotation: prender(numero(item.rotation, 0), -ROTACAO_MAX, ROTACAO_MAX),
      z: Math.trunc(prender(numero(item.z, 10), 1, 99999))
    };
  }

  function muralVazio() {
    return {
      version: VERSAO,
      title: 'meu mural',
      background: FUNDOS[0],
      tint: '',
      cards: [],
      stickers: []
    };
  }

  function normalizarMural(dado) {
    const base = muralVazio();
    if (!dado || typeof dado !== 'object' || Array.isArray(dado)) return base;
    const cartoes = (Array.isArray(dado.cards) ? dado.cards : (Array.isArray(dado.cartas) ? dado.cartas : []))
      .map((item, indice) => normalizarCarta(item, indice))
      .filter(Boolean)
      .slice(0, 120);
    const adesivos = (Array.isArray(dado.stickers) ? dado.stickers : (Array.isArray(dado.adesivos) ? dado.adesivos : []))
      .map((item, indice) => normalizarAdesivo(item, indice))
      .filter(Boolean)
      .slice(0, 80);
    return {
      version: VERSAO,
      title: textoCurto(dado.title || dado.titulo, TITULO_MAX) || base.title,
      background: normalizarFundo(dado.background || dado.fundo),
      tint: normalizarCor(dado.tint || dado.cor),
      cards: cartoes,
      stickers: adesivos
    };
  }

  function proporcaoDaPagina(pagina) {
    const medida = pagina && pagina.medida;
    const largura = numero(medida && medida.width, 0);
    const altura = numero(medida && medida.height, 0);
    if (!(largura > 0 && altura > 0)) return 3 / 4;
    return prender(largura / altura, PROPORCAO_MIN, PROPORCAO_MAX);
  }

  function ehCartaDoMural(item) {
    return Boolean(item && item.page && typeof item.page === 'object');
  }

  function mudarTamanho(item, passo = PASSO_TAMANHO) {
    if (!item || typeof item !== 'object') return 0;
    const carta = ehCartaDoMural(item);
    const minimo = carta ? CARTAO_W_MIN : STICKER_W_MIN;
    const maximo = carta ? CARTAO_W_MAX : STICKER_W_MAX;
    item.w = prender(numero(item.w, carta ? CARTAO_W : STICKER_W) + numero(passo, 0), minimo, maximo);
    return item.w;
  }

  function girarItem(item, passo = PASSO_GIRO) {
    if (!item || typeof item !== 'object') return 0;
    item.rotation = prender(numero(item.rotation, 0) + numero(passo, 0), -ROTACAO_MAX, ROTACAO_MAX);
    return item.rotation;
  }

  function limitarPosicao(item, altura = 0) {
    if (!item || typeof item !== 'object') return item;
    const w = prender(numero(item.w, ehCartaDoMural(item) ? CARTAO_W : STICKER_W), 0, 1);
    const h = prender(numero(altura, 0), 0, 1);
    item.w = w;
    item.x = prender(numero(item.x, 0), 0, Math.max(0, 1 - w));
    item.y = prender(numero(item.y, 0), 0, Math.max(0, 0.98 - h));
    return item;
  }

  function posicaoNova(indice = 0, { columns = 2 } = {}) {
    const colunas = Math.max(1, Math.trunc(columns) || 2);
    const coluna = Math.abs(indice) % colunas;
    const linha = Math.floor(Math.abs(indice) / colunas);
    const passoX = 0.04 + (coluna * 0.5);
    const passoY = 0.05 + (linha * 0.32);
    return {
      x: prender(passoX, 0, 0.96),
      y: prender(passoY, 0, 0.96),
      w: CARTAO_W,
      rotation: [-2.5, 1.8, -1.2, 2.6][Math.abs(indice) % 4]
    };
  }

  function contarCartas(dado) {
    return Array.isArray(dado && dado.cards) ? dado.cards.length : 0;
  }

  function arrumarEmGrade(dado, { columns = 2 } = {}) {
    const mural = normalizarMural(dado);
    const colunas = Math.max(1, Math.trunc(columns) || 2);
    const cartoes = mural.cards.map((carta, indice) => {
      const coluna = indice % colunas;
      const linha = Math.floor(indice / colunas);
      return {
        ...carta,
        x: prender(0.04 + (coluna * (CARTAO_W + 0.06)), 0, 0.96),
        y: prender(0.05 + (linha * 0.33), 0, 0.96),
        w: CARTAO_W,
        rotation: [-2.5, 1.8, -1.2, 2.6][indice % 4]
      };
    });
    const adesivos = mural.stickers.map((adesivo, indice) => ({
      ...adesivo,
      x: prender(0.06 + ((indice % 4) * 0.24), 0, 0.95),
      y: prender(0.8 + (Math.floor(indice / 4) * 0.06), 0, 0.95)
    }));
    return { ...mural, cards: cartoes, stickers: adesivos };
  }

  return {
    VERSAO,
    TITULO_MAX,
    FUNDOS,
    ICONES,
    ICONES_ADESIVOS,
    CARTAO_W,
    CARTAO_W_MIN,
    CARTAO_W_MAX,
    STICKER_W,
    STICKER_W_MIN,
    STICKER_W_MAX,
    ROTACAO_MAX,
    PASSO_TAMANHO,
    PASSO_GIRO,
    normalizarIcone,
    normalizarArte,
    normalizarArteDoAdesivo,
    normalizarFundo,
    normalizarCor,
    normalizarCarta,
    normalizarAdesivo,
    normalizarMural,
    muralVazio,
    proporcaoDaPagina,
    ehCartaDoMural,
    mudarTamanho,
    girarItem,
    limitarPosicao,
    posicaoNova,
    contarCartas,
    arrumarEmGrade,
    ehImagem
  };
});
