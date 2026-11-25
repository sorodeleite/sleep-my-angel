(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieFlipbook = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DURACAO_VIRADA = 620;
  const DURACAO_ABRIR = 380;

  const Z_PARADAS = 10;
  const Z_GIRANDO = 7000;

  const PADROES = ['lines', 'dots', 'grid', 'blank', 'spiral'];
  const padraoValido = (valor) => (PADROES.includes(valor) ? valor : 'lines');

  const SOBRA_PASSEIO = 22;
  const FOLHA_DE_MENTIRINHA = { width: 200, height: 290 };

  const Encaixe = (typeof window !== 'undefined' && window.PooftieFlipFit) || null;

  const Posicionamento = (typeof window !== 'undefined' && window.PooftieStickerPlacement) || null;

  function caixaDaFolhaDe(alvo) {
    if (Encaixe) return Encaixe.caixaDaFolhaDe(alvo);
    const largura = (alvo && (alvo.clientWidth || alvo.offsetWidth)) || 0;
    const altura = (alvo && (alvo.clientHeight || alvo.offsetHeight)) || 0;
    if (largura > 0 && altura > 0) return { width: largura, height: altura };
    return { ...FOLHA_DE_MENTIRINHA };
  }

  function medidaDaPaginaDe(page, medidaPadrao) {
    const fontes = [medidaPadrao, page && page.medida];
    for (const fonte of fontes) {
      if (!Encaixe || typeof Encaixe.normalizarMedida !== 'function') break;
      const medida = Encaixe.normalizarMedida(fonte);
      if (medida) return medida;
    }
    return null;
  }

  function escalaDaFolhaDoLivrinho(caixaDaFolha, page, medidaPadrao = null) {
    const caixa = caixaDaFolha || { width: 0, height: 0 };
    const medida = medidaDaPaginaDe(page, medidaPadrao);
    if (!medida) {
      return { escala: 1, largura: caixa.width || 0, altura: caixa.height || 0 };
    }
    const escala = (Encaixe && typeof Encaixe.escalaDaMedida === 'function')
      ? Encaixe.escalaDaMedida(caixa, medida)
      : 1;
    return { escala, largura: medida.width, altura: medida.height };
  }

  function encaixarNaRegua(sticker, regua) {
    const x = numero(sticker && sticker.x, 0);
    const y = numero(sticker && sticker.y, 0);
    const caixa = normalizarCaixa(regua);
    if (!caixa) return { x, y, escala: 1 };
    if (Posicionamento && typeof Posicionamento.clampKeepingVisible === 'function') {
      const tamanho = (Encaixe && typeof Encaixe.tamanhoDe === 'function')
        ? Encaixe.tamanhoDe(sticker)
        : { width: numero(sticker && sticker.width, 85) || 85, height: numero(sticker && sticker.height, 0) };
      const preso = Posicionamento.clampKeepingVisible({ left: x, top: y }, tamanho, caixa);
      return { x: numero(preso.left, x), y: numero(preso.top, y), escala: 1 };
    }
    if (Encaixe && typeof Encaixe.encaixeNaFolha === 'function') {
      return Encaixe.encaixeNaFolha(sticker, caixa);
    }
    return { x, y, escala: 1 };
  }

  function normalizarCaixa(valor) {
    const largura = numero(valor && valor.width, 0);
    const altura = numero(valor && valor.height, 0);
    return (largura > 0 && altura > 0) ? { width: largura, height: altura } : null;
  }

  function medirPapel(alvo, papel) {
    const daVez = normalizarCaixa({
      width: numero(String((papel && papel.width) || '').replace(/px$/, ''), 0),
      height: numero(String((papel && papel.height) || '').replace(/px$/, ''), 0)
    });
    if (daVez) {
      if (alvo.dataset) {
        alvo.dataset.papelLargura = String(Math.round(daVez.width));
        alvo.dataset.papelAltura = String(Math.round(daVez.height));
      }
      return daVez;
    }
    const guardada = normalizarCaixa({
      width: numero(alvo.dataset && alvo.dataset.papelLargura, 0),
      height: numero(alvo.dataset && alvo.dataset.papelAltura, 0)
    });
    if (guardada) return guardada;
    return normalizarCaixa({ width: alvo.clientWidth, height: alvo.clientHeight })
      || normalizarCaixa({ width: alvo.offsetWidth, height: alvo.offsetHeight });
  }

  function aplicarPapelDoLivrinho(alvo, papel, opcoes = {}) {
    if (!alvo || !alvo.style || typeof alvo.style.setProperty !== 'function') return;
    const medida = medirPapel(alvo, papel);
    const largura = medida ? medida.width : 0;
    const altura = medida ? medida.height : 0;
    const fit = Math.max(0.01, numero(alvo.dataset.escalaDaFolha, 1) || 1);
    const proporcao = (opcoes && Number.isFinite(Number(opcoes.entrada)))
      ? Number(opcoes.entrada)
      : 1;
    const entrada = Math.max(0.01, Math.min(1, proporcao));
    alvo.style.setProperty('--flip-entrada', String(Number(entrada.toFixed(4))));
    const texto = alvo.querySelector ? alvo.querySelector('.flip-page-text') : null;
    if (largura > 0 && altura > 0) {
      alvo.style.setProperty('--flip-papel-largura', `${Math.round(largura)}px`);
      const encolhido = (opcoes && Number.isFinite(Number(opcoes.escala)))
        ? Math.max(0.01, Number(opcoes.escala))
        : fit * entrada;
      const daLombada = (alvo.dataset && alvo.dataset.pattern === 'spiral') ? 48 : 24;
      const naRegua = (valor) => Math.round(valor * 100) / 100;
      const cima = naRegua(18 * encolhido);
      const direita = naRegua(16 * encolhido);
      const baixo = naRegua(20 * encolhido);
      const esquerda = naRegua(daLombada * encolhido);
      if (texto) {
        texto.style.padding = `${cima}px ${direita}px ${baixo}px ${esquerda}px`;
        texto.style.width = `${Math.round(largura * encolhido)}px`;
        texto.style.height = `${Math.round(altura * encolhido)}px`;
      }
    } else {
      alvo.style.removeProperty('--flip-papel-largura');
      if (texto) {
        texto.style.removeProperty('padding');
        texto.style.removeProperty('width');
        texto.style.removeProperty('height');
      }
    }
  }

  const numero = (valor, padrao = 0) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  };

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stickerHtml(sticker, { interativo = false, caixaDaFolha = null, posicao = null } = {}) {
    if (!sticker || !sticker.src) return '';
    const largura = Number(sticker.width) || 85;
    const rotacao = Number(sticker.rotation) || 0;
    const zIndex = Number(sticker.zIndex) || 12;
    const sombra = sticker.shadowColor || 'var(--accent-taupe)';
    const ehDesenho = sticker.kind === 'drawing';
    const ehVideo = sticker.mediaType === 'video' || /^video:/i.test(String(sticker.src || ''));
    const altura = Number(sticker.height) || 0;
    const classes = ['placed-sticker', 'flip-sticker'];
    if (ehVideo) classes.push('is-video');
    if (ehDesenho) classes.push('is-drawing');
    if (!ehDesenho && sticker.hasShadow !== false) classes.push('with-shadow');
    if (!ehDesenho && sticker.hasBorder) classes.push('with-border');
    if (sticker.locked) classes.push('is-locked');
    if (sticker.enfeite) classes.push('is-enfeite');
    if (sticker.enfeite) classes.push('is-caneta-da-mesa');
    const espelhado = (sticker.flip === true || sticker.flip === '1') ? ' scaleX(-1)' : '';
    const bordinha = sticker.borderColor ? ` --sticker-border:${escapar(sticker.borderColor)};` : '';
    const alturaCss = ((ehDesenho || ehVideo) && altura > 0)
      ? ` height:${Math.max(1, Math.round(altura))}px;`
      : '';
    const encaixe = posicao
      ? { x: numero(posicao.x, 0), y: numero(posicao.y, 0), escala: 1 }
      : encaixarNaRegua(sticker, caixaDaFolha);
    const giro = `rotate(${rotacao}deg)${espelhado}`;
    const transformar = encaixe.escala < 1
      ? `scale(${Number(encaixe.escala.toFixed(4))}) ${giro}`
      : giro;
    const origem = encaixe.escala < 1 ? ' transform-origin: top left;' : '';
    const legenda = String(sticker.caption || '').trim();
    const emCima = sticker.captionPosition === 'above';
    const texto = legenda
      ? `<span class="sticker-caption${emCima ? ' is-above' : ' is-below'}">${escapar(legenda)}</span>`
      : '';
    const alcas = (interativo || sticker.enfeite)
      ? '<div class="sticker-handle-rotate" title="Girar Livremente">🔄</div>' +
        '<div class="sticker-handle-resize" title="Redimensionar">↘️</div>' +
        '<div class="sticker-handle-del" title="Excluir">✕</div>'
      : '';
    const poster = (ehVideo && sticker.poster)
      ? ` poster="${escapar(sticker.poster)}"`
      : '';
    const midia = ehVideo
      ? `<video class="sticker-video" data-ref="${escapar(sticker.src)}"${poster}` +
        ` style="width:${largura}px;${alturaCss}" muted loop autoplay playsinline` +
        ' preload="metadata" aria-label="vídeo"></video>'
      : `<img src="${escapar(sticker.src)}" style="width:${largura}px;${alturaCss}" alt="${ehDesenho ? 'desenho' : 'adesivo'}">`;
    return `<div class="${classes.join(' ')}"${interativo ? '' : ' data-readonly="1"'}` +
      (ehDesenho ? ' data-kind="drawing"' : '') +
      ` data-rotation="${rotacao}"` +
      (espelhado ? ' data-flip="1"' : '') +
      ` style="left:${Number(encaixe.x.toFixed(2))}px; top:${Number(encaixe.y.toFixed(2))}px;` +
      ` transform: ${transformar}; z-index:${zIndex};` +
      ` --sticker-shadow:${escapar(sombra)};${bordinha}${origem}">` +
      (emCima ? texto : '') +
      midia +
      (emCima ? '' : texto) +
      alcas +
      '</div>';
  }

  function formatarData(dateStr) {
    const texto = String(dateStr || '');
    const partes = texto.split('-');
    if (partes.length !== 3) return texto;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function textsHtml(page, moduloTexto, escaper) {
    const lista = Array.isArray(page && page.texts) ? page.texts : [];
    if (!lista.length || !moduloTexto) return '';
    return lista.map((item) => {
      const textinho = moduloTexto.normalizar(item);
      if (!textinho.text) return '';
      const trancado = textinho.locked ? ' is-locked' : '';
      return '<div class="placed-text flip-text' + trancado + '" style="' + moduloTexto.estiloCss(textinho) + '">' +
        '<span class="placed-text-body">' + escaper(textinho.text) + '</span></div>';
    }).join('');
  }

  function artDaCapa(capaDados, moduloTexto, styling) {
    const escaparCom = styling && styling.escapeHtml
      ? (texto) => styling.escapeHtml(texto)
      : escapar;
    const adesivos = (Array.isArray(capaDados && capaDados.stickers) ? capaDados.stickers : [])
      .map((sticker) => stickerHtml(sticker, { interativo: false }))
      .join('');
    const textinhos = textsHtml({ texts: capaDados && capaDados.texts }, moduloTexto, escaparCom);
    return '<div class="flip-cover-art-stickers">' + adesivos + '</div>' +
      '<div class="flip-cover-art-texts">' + textinhos + '</div>';
  }

  function caixaDoElemento(elemento) {
    if (!elemento) return null;
    const largura = Number(elemento.clientWidth) || Number(elemento.offsetWidth) || 0;
    const altura = Number(elemento.clientHeight) || Number(elemento.offsetHeight) || 0;
    if (largura > 0 && altura > 0) return { width: largura, height: altura };
    if (typeof elemento.getBoundingClientRect === 'function') {
      const caixa = elemento.getBoundingClientRect();
      if (caixa && caixa.width > 0 && caixa.height > 0) {
        return { width: caixa.width, height: caixa.height };
      }
    }
    return null;
  }

  function enquadramentoDaCaixa(caixa, regua) {
    if (!caixa) return null;
    if (Encaixe && typeof Encaixe.enquadramento === 'function') {
      return Encaixe.enquadramento(caixa, regua, Encaixe.LIMITES_DA_CAPA);
    }
    const medida = (regua && regua.width > 0 && regua.height > 0) ? regua : caixa;
    const escala = Math.min(caixa.width / medida.width, caixa.height / medida.height);
    const dentro = (Number.isFinite(escala) && escala > 0) ? Math.min(4, Math.max(0.02, escala)) : 1;
    return {
      escala: dentro,
      x: (caixa.width - medida.width * dentro) / 2,
      y: (caixa.height - medida.height * dentro) / 2
    };
  }

  function pintarCorDaPagina(alvo, corDaPagina, styling) {
    if (!alvo) return;
    alvo.style.removeProperty('background-color');
    alvo.style.removeProperty('--flip-dots');
    alvo.style.removeProperty('--dot-size');
    const estilo = styling && styling.sanitizeDiaryStyle
      ? styling.sanitizeDiaryStyle(corDaPagina)
      : null;
    if (!estilo) return;
    alvo.style.setProperty('background-color', estilo.paperColor, 'important');
    if (estilo.dots && estilo.dots !== 'none') {
      alvo.style.setProperty('--flip-dots',
        `radial-gradient(${estilo.dotColor} 1.6px, transparent 1.6px)`);
      alvo.style.setProperty('--dot-size',
        `${styling && styling.dotSpacing ? styling.dotSpacing(estilo.dots) : 20}px`);
    }
  }

  function pintarLetraDaPagina(alvo, letraDaPagina, styling) {
    if (!alvo) return;
    alvo.style.removeProperty('--flip-ink');
    alvo.style.removeProperty('--flip-stroke');
    alvo.style.removeProperty('--flip-paint-order');
    const letra = styling && styling.sanitizeTextStyle
      ? styling.sanitizeTextStyle(letraDaPagina)
      : null;
    if (!letra) return;
    if (letra.color) alvo.style.setProperty('--flip-ink', letra.color);
    alvo.style.setProperty('--flip-stroke', letra.outline ? `2px ${letra.outlineColor}` : '0');
    alvo.style.setProperty('--flip-paint-order', letra.outline ? 'stroke fill' : 'normal');
  }

  function montar(opcoes = {}) {
    const doc = opcoes.documento || (typeof document !== 'undefined' ? document : null);
    if (!doc) throw new Error('o livrinho precisa de um documento');
    const model = opcoes.modelo || (typeof window !== 'undefined' ? window.PooftieFlipModel : null);
    const sound = opcoes.som || (typeof window !== 'undefined' ? window.PooftiePageSound : null);
    const styling = opcoes.estilo || (typeof window !== 'undefined' ? window.PooftieDiaryStyling : null);
    const moduloTexto = opcoes.textos || (typeof window !== 'undefined' ? window.PooftiePageText : null);
    if (!model) throw new Error('o livrinho precisa do flip-model.js');

    const busca = (id) => doc.getElementById(id);
    const el = {
      modal: busca('flip-modal'),
      bookWrap: busca('flip-book-wrap'),
      book: busca('flip-book'),
      cover: busca('flip-cover-closed'),
      coverStage: busca('flip-cover-stage'),
      coverArt: busca('flip-cover-art'),
      coverTitle: busca('flip-cover-title'),
      coverSubtitle: busca('flip-cover-subtitle'),
      coverOpen: busca('flip-cover-open'),
      openFlap: busca('flip-open-flap'),
      spread: busca('flip-spread'),
      leavesBox: busca('flip-leaves'),
      leftLeaf: busca('flip-leaf-left'),
      rightLeaf: busca('flip-leaf-right'),
      leftText: busca('flip-left-text'),
      rightText: busca('flip-right-text'),
      counter: busca('flip-page-counter'),
      hint: busca('flip-page-hint'),
      btnPrev: busca('flip-prev'),
      btnNext: busca('flip-next'),
      btnSave: busca('flip-save'),
      btnFinalizar: busca('flip-finalize'),
      btnNewPage: busca('flip-new-page'),
      btnWrite: busca('flip-write'),
      penLayer: busca('flip-pen-layer'),
      btnPenPicker: busca('flip-pens'),
      penPicker: busca('flip-pen-picker'),
      paperSelect: busca('flip-paper-select'),
      btnClose: busca('flip-close'),
      zonePrev: busca('flip-zone-prev'),
      zoneNext: busca('flip-zone-next')
    };

    const somenteLeitura = opcoes.somenteLeitura !== false;
    const podeMexerAqui = () => !somenteLeitura;

    let spreads = [];
    let indice = -1;
    let medidaDaFolhaAtual = null;
    let medidaDaCapaAtual = null;
    let alvoDaCapinha = null;
    let capaDados = model.coverPage({});
    let animando = false;
    let abrindo = false;
    let pedidoPendente = 0;
    let folhas = [];
    const rolagens = new Map();

    const escapado = (texto) => (styling && styling.escapeHtml
      ? styling.escapeHtml(texto)
      : escapar(texto));

    function htmlDoTexto(page) {
      if (!page) return '';
      const spans = Array.isArray(page.textSpans) ? page.textSpans : [];
      if (!styling || !styling.parseTextSpans || !spans.length) {
        return escapado(page.body || '');
      }
      const pedacos = styling.parseTextSpans(page.body || '', spans);
      const texto = String(page.body || '');
      let cursor = 0;
      let saida = '';
      pedacos.forEach((pedaco) => {
        if (pedaco.start > cursor) saida += escapado(texto.slice(cursor, pedaco.start));
        const css = styling.decorationToCss(pedaco.decoration);
        const trecho = escapado(texto.slice(pedaco.start, pedaco.end));
        saida += css ? `<span style="${css}">${trecho}</span>` : trecho;
        cursor = pedaco.end;
      });
      saida += escapado(texto.slice(cursor));
      return saida;
    }

    function enfeitesDaPagina() {
      return '' +
        '<div class="flip-page-lace top" aria-hidden="true"></div>' +
        '<div class="flip-page-lace" aria-hidden="true"></div>';
    }

    function assinaturaDaPagina(page) {
      if (!page) return 'vazio||';
      const adesivos = (Array.isArray(page.stickers) ? page.stickers : [])
        .map((s) => `${s.kind || 'sticker'}|${s.src}|${s.x}|${s.y}|${s.width}|${s.height || ''}|${s.rotation}|${s.zIndex}|${s.caption || ''}|${s.captionPosition || ''}|${s.hasShadow === false ? 'sem-sombra' : 'com-sombra'}|${s.hasBorder ? `borda-${s.borderColor || 'branca'}` : 'sem-borda'}|${s.flip ? 'espelhado' : 'normal'}`)
        .join('~');
      const textinhos = (Array.isArray(page.texts) ? page.texts : [])
        .map((t) => `${t.id || ''}|${t.text || ''}|${t.x}|${t.y}|${t.size}|${t.rotation}|${t.zIndex}`)
        .join('~');
      const cor = page.diaryStyle
        ? `${page.diaryStyle.paperColor || ''}/${page.diaryStyle.dotColor || ''}/${page.diaryStyle.dots || ''}`
        : '-';
      const letra = page.textStyle
        ? `${page.textStyle.color || ''}/${page.textStyle.outline ? 'bordinha' : 'lisinha'}/${page.textStyle.outlineColor || ''}`
        : '-';
      return [
        page.kind || '',
        page.pageId || '',
        page.date || '',
        page.title || '',
        padraoValido(page.pattern),
        cor,
        letra,
        page.motivo || '',
        adesivos,
        textinhos
      ].join('||');
    }

    function textoDoElemento(elemento) {
      if (!elemento) return '';
      const texto = elemento.innerText || elemento.textContent || '';
      return texto
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/, '');
    }

    function pintarCorpo(corpo, page, ehVazia) {
      if (!corpo) return;
      const texto = (page && page.body) || '';
      corpo.dataset.pattern = padraoValido(page && page.pattern);
      const assinatura = `${texto}\u0000${JSON.stringify((page && page.textSpans) || [])}`;
      const igual = corpo.dataset.corpoSig === assinatura && textoDoElemento(corpo) === texto;
      if (igual) return;

      corpo.innerHTML = ehVazia && !texto ? '' : htmlDoTexto(page);
      corpo.dataset.corpoSig = assinatura;
      corpo.dataset.vazio = texto ? '0' : '1';
      if (ehVazia && !texto) corpo.dataset.recado = 'escreve aqui a sua memória… ⋆ ˚｡⋆';
    }

    const ehCanetinhaDeTela = (sticker) => Boolean(sticker && sticker.enfeite);

    function posicaoDaCanetinha(sticker, caixaDaTela, caixaDoLivro, regua) {
      const fracX = Number(sticker && sticker.penX);
      const fracY = Number(sticker && sticker.penY);
      if (Number.isFinite(fracX) && Number.isFinite(fracY)) {
        return {
          x: fracX * (caixaDaTela ? caixaDaTela.width : 0),
          y: fracY * (caixaDaTela ? caixaDaTela.height : 0)
        };
      }
      const livro = caixaDoLivro || {
        x: 0, y: 0,
        width: (caixaDaTela && caixaDaTela.width) || 0,
        height: (caixaDaTela && caixaDaTela.height) || 0
      };
      const medida = regua || livro;
      const relX = numero(sticker && sticker.x, 0) / Math.max(1, numero(medida && medida.width, 1));
      const relY = numero(sticker && sticker.y, 0) / Math.max(1, numero(medida && medida.height, 1));
      return { x: livro.x + relX * livro.width, y: livro.y + relY * livro.height };
    }

    function caixaDoLivroNaCamada() {
      const livro = el.book || el.bookWrap;
      if (!livro || !el.penLayer
        || typeof livro.getBoundingClientRect !== 'function'
        || typeof el.penLayer.getBoundingClientRect !== 'function') return null;
      const doLivro = livro.getBoundingClientRect();
      const daTela = el.penLayer.getBoundingClientRect();
      if (!doLivro || !daTela || !doLivro.width || !doLivro.height) return null;
      return {
        x: doLivro.left - daTela.left,
        y: doLivro.top - daTela.top,
        width: doLivro.width,
        height: doLivro.height
      };
    }

    function reguaDoAlvo(alvo) {
      if (!alvo || !alvo.style || typeof alvo.style.getPropertyValue !== 'function') return null;
      const largura = Number(alvo.style.getPropertyValue('--flip-base-largura'));
      const altura = Number(alvo.style.getPropertyValue('--flip-base-altura'));
      return (largura > 0 && altura > 0) ? { width: largura, height: altura } : null;
    }

    function desenharCanetinhasDaTela(lista, page, lado, alvoDaRegua = null) {
      if (!el.penLayer) return;
      const caixaDaTela = caixaDoElemento(el.penLayer);
      if (!caixaDaTela) return;
      const caixaDoLivro = caixaDoLivroNaCamada();
      const regua = reguaDoAlvo(alvoDaRegua) || medidaDaFolhaAtual;
      el.penLayer.innerHTML = (lista || [])
        .map((sticker) => stickerHtml(sticker, {
          interativo: false,
          posicao: posicaoDaCanetinha(sticker, caixaDaTela, caixaDoLivro, regua)
        }))
        .join('');
      if (opcoes.aoDesenharAdesivos && el.penLayer.querySelector('.placed-sticker')) {
        opcoes.aoDesenharAdesivos(el.penLayer, page, lado, { somenteEnfeites: true });
      }
    }

    function desenharPagina(alvo, page, lado, { ehCopia = false, redesenhar = false } = {}) {
      if (!alvo) return;
      const assinatura = assinaturaDaPagina(page);

      const escrevivel = paginaEscrevivel();
      const vivoAqui = Boolean(escrevivel && escrevivel.lado === lado);
      const interativo = podeMexerAqui() && vivoAqui;

      const podeMexer = redesenhar
        || alvo.dataset.sig !== assinatura
        || alvo.dataset.live !== (interativo ? '1' : '0');

      if (podeMexer) {
        const todosOsAdesivos = Array.isArray(page && page.stickers) ? page.stickers : [];
        const stickers = todosOsAdesivos.filter((s) => !ehCanetinhaDeTela(s));
        const caixaDoLivrinho = caixaDaFolhaDe(alvo);
        const medida = escalaDaFolhaDoLivrinho(caixaDoLivrinho, page, opcoes.medidaDaFolha || medidaDaFolhaAtual);
        const escalaDaFolha = medida.escala;
        const caixaDaFolha = {
          width: medida.largura || caixaDoLivrinho.width,
          height: medida.altura || caixaDoLivrinho.height
        };
        alvo.dataset.escalaDaFolha = String(escalaDaFolha);
        alvo.style.setProperty('--flip-base-largura', `${Math.round(caixaDaFolha.width)}px`);
        alvo.style.setProperty('--flip-base-altura', `${Math.round(caixaDaFolha.height)}px`);
        const enfeites = stickers
          .map((s) => stickerHtml(s, { interativo, caixaDaFolha }))
          .join('');
        const adesivos = `<div class="flip-stickers${interativo ? ' is-live' : ''}"` +
          ` data-caixa-folha="${Math.round(caixaDaFolha.width)}x${Math.round(caixaDaFolha.height)}"` +
          (interativo ? '' : ' data-readonly="1"') + `>${enfeites}</div>`;
        const textinhos = `<div class="flip-texts" data-readonly="1">` +
          `${textsHtml(page, moduloTexto, escapado)}</div>`;
        alvo.dataset.sig = assinatura;
        alvo.dataset.live = interativo ? '1' : '0';
        alvo.dataset.kind = page ? page.kind : 'blank';
        alvo.dataset.page = lado;
        alvo.classList.toggle('is-blank', !page || page.kind === 'blank');
        alvo.classList.toggle('is-intro', Boolean(page && page.kind === 'intro'));
        alvo.dataset.pattern = padraoValido(page && page.pattern);
        pintarCorDaPagina(alvo, page && page.diaryStyle, styling);
        pintarLetraDaPagina(alvo, page && page.textStyle, styling);
        alvo.style.setProperty('--flip-fit', String(escalaDaFolha));
        alvo.style.setProperty('--flip-letra-fit', String(escalaDaFolha));
        alvo.dataset.precisaFit = '1';

        if (page && page.kind === 'intro') {
          alvo.innerHTML =
            '<div class="flip-page-text">' +
              '<div class="flip-page-head is-plain">' +
                '<span class="flip-intro-title">Dear diary <span class="flip-intro-heart">♡</span></span>' +
              '</div>' +
              '<div class="flip-page-body is-empty" data-readonly="1"></div>' +
              enfeitesDaPagina() +
            '</div>' + adesivos + textinhos;
          const corpoIntro = alvo.querySelector('.flip-page-body');
          if (corpoIntro) corpoIntro.dataset.pattern = padraoValido(page.pattern);
        } else {
          const ehVazia = !page || page.kind === 'blank';
          const titulo = ehVazia ? '' : (page.title || '');
          const data = ehVazia
            ? (page && page.date ? formatarData(page.date) : 'sua próxima página ⋆ ˚｡⋆')
            : formatarData(page.date);

          alvo.innerHTML =
            '<div class="flip-page-text">' +
              '<div class="flip-page-head">' +
                `<span class="flip-page-date">${escapado(data)}</span>` +
                (titulo ? `<h4 class="flip-page-title">${escapado(titulo)}</h4>` : '') +
                (page.letterFrom ? `<span class="flip-letter-seal">💌 carta de ${escapado(page.letterFrom)}</span>` : '') +
              '</div>' +
              '<div class="flip-page-body' + (ehVazia ? ' is-empty' : '') + '"' +
                ' data-readonly="1"' +
                '></div>' +
              enfeitesDaPagina() +
            '</div>' + adesivos + textinhos;
        }

        aplicarPapelDoLivrinho(alvo, caixaDaFolha);

        const caminha = alvo.querySelector('.flip-stickers');
        if (interativo && opcoes.aoDesenharAdesivos) {
          opcoes.aoDesenharAdesivos(caminha, page, lado);
        } else if (opcoes.aoDesenharAdesivos
          && caminha && caminha.querySelector('.placed-sticker.is-enfeite')) {
          opcoes.aoDesenharAdesivos(caminha, page, lado, { somenteEnfeites: true });
        }
      }

      if (vivoAqui && !ehCopia) {
        desenharCanetinhasDaTela(
          (Array.isArray(page && page.stickers) ? page.stickers : []).filter(ehCanetinhaDeTela),
          page, lado, alvo
        );
      }

      const corpo = alvo.querySelector('.flip-page-body');
      pintarCorpo(corpo, page, !page || page.kind === 'blank');
      if (corpo && (somenteLeitura || ehCopia) && corpo.dataset.ligado === '1') {
        delete corpo.dataset.ligado;
        corpo.contentEditable = 'false';
        corpo.setAttribute('data-readonly', '1');
      }
    }

    function ajustarParaCaber(alvo) {
      if (!alvo) return 1;
      const corpo = alvo.querySelector('.flip-page-body');
      if (!corpo) return 1;
      const escalaDaFolha = Number(alvo.dataset.escalaDaFolha) || 1;
      const base = escalaDaFolha;
      const proporcao = 1;
      alvo.style.setProperty('--flip-entrada', '1');
      alvo.style.setProperty('--flip-fit', String(base));
      let letra = base;
      alvo.style.setProperty('--flip-letra-fit', String(letra));
      aplicarPapelDoLivrinho(alvo, {
        width: alvo.style.getPropertyValue('--flip-base-largura') || 0,
        height: alvo.style.getPropertyValue('--flip-base-altura') || 0
      }, { entrada: proporcao, escala: base });

      const minimo = base * 0.5;
      for (let volta = 0; volta < 4; volta++) {
        const altura = corpo.clientHeight;
        const conteudo = corpo.scrollHeight;
        if (!altura || conteudo <= altura + 2) break;
        const passo = Math.max(0.55, Math.min(1, altura / conteudo));
        const proximo = Math.max(minimo, letra * passo);
        if (Math.abs(proximo - letra) < 0.001) break;
        letra = proximo;
        alvo.style.setProperty('--flip-letra-fit', String(letra));
      }
      aplicarPapelDoLivrinho(alvo, {
        width: alvo.style.getPropertyValue('--flip-base-largura') || 0,
        height: alvo.style.getPropertyValue('--flip-base-altura') || 0
      }, { entrada: proporcao, escala: base });
      alvo.dataset.fit = String(letra);
      alvo.dataset.precisaFit = '0';
      alvo.classList.toggle('is-fitted', letra < base - 0.001);
      return letra;
    }

    function ajustarFits() {
      if (!estaAberto()) return;
      [el.leftText, el.rightText].forEach(ajustarParaCaber);
      redesenharFolhasQueVirão();
      folhas.forEach((folha) => {
        folha.querySelectorAll('.flip-face').forEach((face) => {
          if (face.dataset.precisaFit !== '1') return;
          ajustarParaCaber(face);
        });
      });
      ajustarEncaixeDaCapa();
    }

    let timerAjuste = null;
    function agendarAjuste(atraso = 420) {
      if (timerAjuste) clearTimeout(timerAjuste);
      timerAjuste = setTimeout(() => {
        timerAjuste = null;
        ajustarFits();
      }, atraso);
    }

    function buscarPagina(lado) {
      const folha = spreads[indice];
      return folha ? folha[lado] : null;
    }

    function guardarRolagem() {
      const esquerda = el.leftText && el.leftText.querySelector('.flip-page-body');
      const direita = el.rightText && el.rightText.querySelector('.flip-page-body');
      if (esquerda) rolagens.set(`${indice}-left`, esquerda.scrollTop);
      if (direita) rolagens.set(`${indice}-right`, direita.scrollTop);
    }

    function devolverRolagem() {
      const esquerda = el.leftText && el.leftText.querySelector('.flip-page-body');
      const direita = el.rightText && el.rightText.querySelector('.flip-page-body');
      if (esquerda) esquerda.scrollTop = rolagens.get(`${indice}-left`) || 0;
      if (direita) direita.scrollTop = rolagens.get(`${indice}-right`) || 0;
    }

    function pintarCapa(dadosDaCapa) {
      if (dadosDaCapa && typeof dadosDaCapa === 'object') {
        capaDados = model.coverPage(dadosDaCapa);
        const regua = (Encaixe && typeof Encaixe.normalizarMedida === 'function')
          ? Encaixe.normalizarMedida(dadosDaCapa.medida)
          : null;
        if (regua) medidaDaCapaAtual = regua;
      }
      if (el.coverTitle) el.coverTitle.textContent = capaDados.title || '';
      if (el.coverSubtitle) el.coverSubtitle.textContent = capaDados.subtitle || '';
      if (el.coverArt) {
        el.coverArt.innerHTML = artDaCapa(capaDados, moduloTexto, styling);
        const temArte = Boolean(el.coverArt.querySelector('.placed-sticker, .placed-text'));
        if (el.cover) el.cover.classList.toggle('tem-arte', temArte);
        ajustarEncaixeDaCapa();
      }
      if (el.openFlap) {
        el.openFlap.innerHTML =
          '<div class="flip-open-flap-inner">' +
            '<span class="flip-open-flap-sparkle">✦ ⋆ ˚｡⋆</span>' +
            `<span class="flip-open-flap-title">${escapado(capaDados.title || '')}</span>` +
            `<span class="flip-open-flap-subtitle">${escapado(capaDados.subtitle || '')}</span>` +
            '<span class="flip-open-flap-heart">♡</span>' +
          '</div>';
      }
    }

    function reguaDaCapa() {
      const doApp = (Encaixe && typeof Encaixe.normalizarMedida === 'function')
        ? Encaixe.normalizarMedida(medidaDaCapaAtual)
        : null;
      if (doApp) return doApp;
      return caixaDoElemento(doc.getElementById('dayol-notebook'));
    }

    function ajustarEncaixeDaCapa() {
      if (!el.cover || !el.coverArt) return null;
      const caixa = caixaDoElemento(el.cover);
      if (!caixa) { agendarEncaixeDaCapa(); return null; }
      const regua = reguaDaCapa();
      const enquadrado = enquadramentoDaCaixa(caixa, regua);
      const escala = enquadrado ? enquadrado.escala : 1;
      const deslocX = enquadrado ? enquadrado.x : 0;
      const deslocY = enquadrado ? enquadrado.y : 0;
      el.cover.style.setProperty('--cover-art-fit', String(escala));
      el.cover.style.setProperty('--cover-art-x', `${Math.round(deslocX)}px`);
      el.cover.style.setProperty('--cover-art-y', `${Math.round(deslocY)}px`);
      if (regua) {
        el.cover.style.setProperty('--cover-art-largura', `${Math.round(regua.width)}px`);
        el.cover.style.setProperty('--cover-art-altura', `${Math.round(regua.height)}px`);
      }
      return escala;
    }

    let timerEncaixeDaCapa = null;
    let tentativasEncaixeDaCapa = 0;

    function agendarEncaixeDaCapa(atraso = 40) {
      if (timerEncaixeDaCapa) return;
      timerEncaixeDaCapa = setTimeout(() => {
        timerEncaixeDaCapa = null;
        if (ajustarEncaixeDaCapa() !== null) { tentativasEncaixeDaCapa = 0; return; }
        tentativasEncaixeDaCapa += 1;
        if (tentativasEncaixeDaCapa < 20) agendarEncaixeDaCapa(60);
      }, atraso);
    }

    function paginaDaFrente(j) {
      const folha = spreads[j];
      return folha ? folha.right : null;
    }

    function paginaDoVerso(j) {
      const folha = spreads[j + 1];
      return folha ? folha.left : null;
    }

    function quantasFolhas() {
      return Math.max(0, spreads.length - 1);
    }

    function construirFolhas() {
      if (!el.leavesBox) return;
      el.leavesBox.innerHTML = '';
      folhas = [];
      const total = quantasFolhas();
      for (let j = 0; j < total; j++) {
        const folha = doc.createElement('div');
        folha.className = 'flip-turn-leaf';
        folha.dataset.folha = String(j);
        folha.innerHTML =
          '<div class="flip-face flip-face-front"></div>' +
          '<div class="flip-face flip-face-back"></div>';
        const frente = folha.querySelector('.flip-face-front');
        const verso = folha.querySelector('.flip-face-back');
        desenharPagina(frente, paginaDaFrente(j), 'right', { ehCopia: true });
        desenharPagina(verso, paginaDoVerso(j), 'left', { ehCopia: true });
        el.leavesBox.appendChild(folha);
        folhas.push(folha);
      }
      aplicarEstadoDasFolhas();
    }

    function folhaMedidaCerta(face) {
      if (!face) return false;
      const largura = numero(face.clientWidth, 0) || numero(face.offsetWidth, 0);
      if (largura <= 0) return false;
      const caminha = face.querySelector ? face.querySelector('.flip-page-text') : null;
      const desenhada = caminha && caminha.style
        ? numero(String(caminha.style.width || '').replace(/px$/, ''), 0)
        : 0;
      return desenhada > 0 && Math.abs(desenhada - largura) <= 1.5;
    }

    function redesenharFolhasQueVirão() {
      if (!el.leavesBox || el.book && el.book.hidden) return 0;
      let redesenhadas = 0;
      folhas.forEach((folha, j) => {
        const frente = folha.querySelector('.flip-face-front');
        const verso = folha.querySelector('.flip-face-back');
        if (folhaMedidaCerta(frente) && folhaMedidaCerta(verso)) return;
        desenharPagina(frente, paginaDaFrente(j), 'right', { ehCopia: true, redesenhar: true });
        desenharPagina(verso, paginaDoVerso(j), 'left', { ehCopia: true, redesenhar: true });
        redesenhadas += 1;
      });
      if (redesenhadas) aplicarEstadoDasFolhas();
      return redesenhadas;
    }

    function aplicarEstadoDasFolhas() {
      const total = folhas.length;
      folhas.forEach((folha, j) => {
        const virada = indice >= 0 && j < indice;
        if (folha.classList.contains('is-flipped') !== virada) {
          folha.classList.toggle('is-flipped', virada);
        }
        folha.classList.remove('is-turning');
        folha.style.zIndex = String(virada
          ? (Z_PARADAS + j)
          : (Z_PARADAS + total + (total - j)));
      });
    }

    function atualizarContador() {
      const fechado = indice < 0;
      if (el.counter) {
        el.counter.textContent = fechado
          ? 'fechado'
          : `${indice + 1} / ${Math.max(1, spreads.length)}`;
      }
      if (el.hint) {
        if (fechado) el.hint.textContent = 'capinha · clique nela pra abrir';
        else {
          const folha = spreads[indice];
          el.hint.textContent =
            `${model.pageLabel(folha && folha.left)} · ${model.pageLabel(folha && folha.right)}`
            + (somenteLeitura ? ' · só leitura' : '');
        }
      }
      if (el.btnPrev) el.btnPrev.disabled = !fechado && !model.hasPrevious(indice);
      if (el.btnNext) el.btnNext.disabled = !fechado && !model.hasNext(indice, spreads.length);
      if (el.btnWrite) el.btnWrite.disabled = fechado;
      if (!somenteLeitura) {
        if (el.btnSave) el.btnSave.disabled = fechado;
        if (el.btnFinalizar) el.btnFinalizar.disabled = fechado;
        if (el.btnNewPage) el.btnNewPage.disabled = fechado;
        if (el.paperSelect) {
          el.paperSelect.disabled = fechado || !paginaEscrevivel();
          const aberta = paginaEscrevivel();
          if (aberta && aberta.page) el.paperSelect.value = padraoValido(aberta.page.pattern);
        }
      }
    }

    function mostrarCapa() {
      indice = -1;
      pintarCapa();
      el.modal?.classList.toggle('is-cover', true);
      el.modal?.classList.remove('is-opening');
      if (el.coverStage) el.coverStage.hidden = false;
      if (el.cover) el.cover.hidden = false;
      if (el.book) el.book.hidden = true;
      if (el.openFlap) el.openFlap.hidden = true;
      if (el.spread) el.spread.hidden = false;
      aplicarEstadoDasFolhas();
      if (el.penLayer) el.penLayer.innerHTML = '';
      ajustarEncaixeDaCapa();
      atualizarContador();
    }

    function mostrarFolhaAberta() {
      el.modal?.classList.remove('is-cover');
      if (el.coverStage) el.coverStage.hidden = true;
      if (el.cover) el.cover.hidden = true;
      if (el.book) el.book.hidden = false;
      if (el.openFlap) el.openFlap.hidden = true;
      if (el.spread) el.spread.hidden = false;
      aplicarEstadoDasFolhas();
      desenharFolha();
      redesenharFolhasQueVirão();
      ligarEdicao();
    }

    function desenharFolha() {
      const folha = spreads[indice] || { left: model.blankPage(), right: model.blankPage() };
      desenharPagina(el.leftText, folha.left, 'left');
      desenharPagina(el.rightText, folha.right, 'right');
      if (!paginaEscrevivel() && el.penLayer) el.penLayer.innerHTML = '';
      ligarEdicao();
      atualizarContador();
      devolverRolagem();
      agendarAjuste(80);
    }

    function prepararPaginasParadas(destino) {
      desenharPagina(el.leftText, destino.left, 'left');
      desenharPagina(el.rightText, destino.right, 'right');
      atualizarContador();
    }

    function animarFolha(folha, virar, { instantaneo = false } = {}) {
      return new Promise((resolve) => {
        if (!folha) { resolve(); return; }
        if (instantaneo) {
          folha.classList.toggle('is-flipped', virar);
          resolve();
          return;
        }

        let terminado = false;
        const fim = () => {
          if (terminado) return;
          terminado = true;
          folha.removeEventListener('transitionend', aoTerminar);
          resolve();
        };
        const aoTerminar = (evento) => {
          if (evento.target === folha && evento.propertyName === 'transform') fim();
        };

        folha.addEventListener('transitionend', aoTerminar);
        folha.classList.add('is-turning');
        folha.style.zIndex = String(Z_GIRANDO);
        void folha.offsetWidth;
        folha.classList.toggle('is-flipped', virar);
        setTimeout(fim, DURACAO_VIRADA + 160);
      });
    }

    function folhear(direcao) {
      if (indice < 0) return Promise.resolve(false);
      const passo = Number(direcao) < 0 ? -1 : 1;
      if (animando) {
        pedidoPendente = passo;
        return Promise.resolve(false);
      }
      if (passo > 0 ? !model.hasNext(indice, spreads.length) : !model.hasPrevious(indice)) {
        return Promise.resolve(false);
      }

      const destino = spreads[indice + passo];
      if (!destino) return Promise.resolve(false);
      const numero = passo > 0 ? indice : indice - 1;
      const folha = folhas[numero];
      const virar = passo > 0;

      animando = true;
      el.modal?.classList.add('flipping');
      guardarRolagem();
      const saindo = paginaEscrevivel();
      if (saindo && opcoes.aoSairDaPagina) {
        opcoes.aoSairDaPagina({
          page: saindo.page,
          lado: saindo.lado,
          camada: camadaDeAdesivos(saindo.lado)
        });
      }
      if (sound && sound.tocar) sound.tocar({ direcao: passo });

      desenharPagina(el.leftText, destino.left, 'left');

      if (virar) desenharPagina(el.rightText, destino.right, 'right');

      return animarFolha(folha, virar).then(() => {
        indice = model.clampSpread(indice + passo, spreads.length);
        if (!virar) desenharPagina(el.rightText, destino.right, 'right');
        animando = false;
        el.modal?.classList.remove('flipping');
        aplicarEstadoDasFolhas();
        desenharFolha();
        agendarAjuste(90);
        if (opcoes.aoFolhear) opcoes.aoFolhear(indice, spreads[indice]);

        if (pedidoPendente) {
          const proximo = pedidoPendente;
          pedidoPendente = 0;
          folhear(proximo);
        }
        return true;
      });
    }

    function terminarDeAbrir() {
      abrindo = false;
      el.modal?.classList.remove('is-opening');
      el.modal?.classList.remove('is-cover');
      if (indice < 0) indice = 0;
      indice = model.clampSpread(indice, spreads.length);
      aplicarEstadoDasFolhas();
      mostrarFolhaAberta();
      agendarAjuste(60);
      if (opcoes.aoAbrir) opcoes.aoAbrir(indice, spreads[indice]);
    }

    function abrirLivro(alvo) {
      if (indice >= 0 || abrindo) return Promise.resolve(false);
      abrindo = true;
      const escolhido = Number.isFinite(alvo) ? alvo : alvoDaCapinha;
      if (Number.isFinite(escolhido)) indice = model.clampSpread(escolhido, spreads.length);
      if (sound && sound.tocar) sound.tocar({ direcao: 1 });
      el.modal?.classList.add('is-opening');
      return new Promise((resolve) => {
        setTimeout(() => {
          terminarDeAbrir();
          resolve(true);
        }, DURACAO_ABRIR);
      });
    }

    function abrirSemAnimacao() {
      terminarDeAbrir();
      return true;
    }

    function aplicarModoDeLeitura() {
      if (el.modal) el.modal.classList.toggle('somente-leitura', somenteLeitura);
      if (el.paperSelect) {
        el.paperSelect.disabled = true;
        if (somenteLeitura) el.paperSelect.setAttribute('tabindex', '-1');
      }
      [el.btnSave, el.btnFinalizar, el.btnNewPage].forEach((botao) => {
        if (!botao) return;
        botao.hidden = somenteLeitura;
      });
    }

    function paginaAberta() {
      if (indice < 0) return null;
      return spreads[indice] || null;
    }

    function corpoDoLado(lado) {
      const alvo = lado === 'left' ? el.leftText : el.rightText;
      return alvo ? alvo.querySelector('.flip-page-body') : null;
    }

    function camadaDeAdesivos(lado) {
      const alvo = lado === 'left' ? el.leftText : el.rightText;
      return alvo ? alvo.querySelector('.flip-stickers') : null;
    }

    function camadaDaPaginaAberta() {
      const alvo = paginaEscrevivel();
      return alvo ? camadaDeAdesivos(alvo.lado) : null;
    }

    function paginaEscrevivel() {
      if (indice < 0) return null;
      const folha = spreads[indice];
      if (!folha) return null;
      if (folha.left && folha.left.kind === 'intro') {
        const page = folha.right;
        return page && (page.kind === 'blank' || page.kind === 'entry') ? { lado: 'right', page } : null;
      }
      const page = model.writablePage(folha);
      if (!page) return null;
      return { lado: model.openEntrySide(folha), page };
    }

    function textoDaPaginaAberta() {
      const alvo = paginaEscrevivel();
      if (!alvo) return '';
      const corpo = corpoDoLado(alvo.lado);
      return corpo ? textoDoElemento(corpo) : (alvo.page.body || '');
    }

    function escreverNaPaginaAberta(texto) {
      const alvo = paginaEscrevivel();
      if (!alvo) return false;
      const corpo = corpoDoLado(alvo.lado);
      if (!corpo) return false;
      const novo = String(texto == null ? '' : texto);
      if (textoDoElemento(corpo) === novo) return false;
      corpo.textContent = novo;
      corpo.dataset.vazio = novo ? '0' : '1';
      corpo.dataset.corpoSig = `${novo}\u0000${JSON.stringify(alvo.page.textSpans || [])}`;
      alvo.page.body = novo;
      return true;
    }

    function avisarDigitou(lado) {
      const corpo = corpoDoLado(lado);
      if (!corpo) return;
      const folha = spreads[indice];
      const pagina = folha ? folha[lado === 'left' ? 'left' : 'right'] : null;
      if (!pagina || pagina.kind === 'intro') return;
      if (pagina.kind === 'entry' && folhas.length) {
        const j = lado === 'right' ? indice : indice - 1;
        const face = lado === 'right' ? '.flip-face-front' : '.flip-face-back';
        const alvoFace = folhas[j] ? folhas[j].querySelector(face) : null;
        if (alvoFace) desenharPagina(alvoFace, pagina, lado, { ehCopia: true });
      }
      if (!opcoes.aoDigitar) return;
      opcoes.aoDigitar({
        lado,
        texto: textoDoElemento(corpo),
        pagina,
        folha
      });
    }

    function ligarEdicao() {
      if (somenteLeitura) return;
      [['left', el.leftText], ['right', el.rightText]].forEach(([lado, alvo]) => {
        const corpo = alvo && alvo.querySelector('.flip-page-body');
        if (!corpo || corpo.dataset.ligado === '1') return;
        corpo.dataset.ligado = '1';
        corpo.addEventListener('input', () => {
          corpo.dataset.vazio = textoDoElemento(corpo) ? '0' : '1';
          corpo.dataset.corpoSig = `${textoDoElemento(corpo)}\u0000${JSON.stringify(
            (spreads[indice] && spreads[indice][lado] && spreads[indice][lado].textSpans) || []
          )}`;
          avisarDigitou(lado);
        });
        corpo.addEventListener('input', () => {
          agendarAjuste(560);
        });
        corpo.addEventListener('paste', (evento) => {
          const texto = evento.clipboardData && evento.clipboardData.getData('text/plain');
          if (texto == null) return;
          evento.preventDefault();
          doc.execCommand('insertText', false, texto);
        });
        corpo.addEventListener('pointerup', () => {
          if (opcoes.aoSelecionarTexto) opcoes.aoSelecionarTexto();
        });
        corpo.addEventListener('focus', () => atualizarContador());
      });
    }

    function chaveDaFolha(folha) {
      if (!folha) return '';
      const lado = (pagina) => (pagina
        ? `${pagina.pageId || pagina.date || pagina.kind}|${pagina.title || ''}`
        : '-');
      return `${lado(folha.left)}#${lado(folha.right)}`;
    }

    function definirConteudo(entries, coverData, opcoesNovas = {}) {
      const chaveAnterior = spreads[indice] ? chaveDaFolha(spreads[indice]) : '';
      const idAnterior = (spreads[indice] && spreads[indice].left && spreads[indice].left.pageId)
        || (spreads[indice] && spreads[indice].right && spreads[indice].right.pageId)
        || '';
      const medidaDaFolha = opcoesNovas.medidaDaFolha || null;
      if (medidaDaFolha) medidaDaFolhaAtual = medidaDaFolha;
      capaDados = model.coverPage(coverData || {});
      spreads = model.spreadsFromEntries(entries, coverData, {
        paginaLivre: opcoesNovas.paginaLivre,
        medidaDaFolha: opcoesNovas.medidaDaFolha || null
      });
      rolagens.clear();

      if (opcoesNovas.irPara === 'primeira') indice = 0;
      else if (opcoesNovas.irPara === 'ultima') indice = spreads.length - 1;
      else if (Number.isFinite(opcoesNovas.indice)) indice = model.clampSpread(opcoesNovas.indice, spreads.length);
      else if (opcoesNovas.forcar) {
        indice = indice < 0 ? -1 : model.clampSpread(indice, spreads.length);
      } else {
        let achou = idAnterior ? model.spreadOfPage(spreads, idAnterior) : -1;
        if (achou < 0 && chaveAnterior) {
          achou = spreads.findIndex((folha) => chaveDaFolha(folha) === chaveAnterior);
        }
        indice = achou >= 0 ? achou : (indice < 0 ? -1 : model.clampSpread(indice, spreads.length));
      }

      if (indice >= 0) indice = model.clampSpread(indice, spreads.length);
      pintarCapa(coverData || {});
      construirFolhas();
      if (estaAberto()) {
        if (indice < 0) mostrarCapa();
        else mostrarFolhaAberta();
      }
      return { spreads, indice };
    }

    function folhaDaData(date) {
      if (!date) return -1;
      return spreads.findIndex((folha) =>
        (folha.left && folha.left.date === date) || (folha.right && folha.right.date === date));
    }

    function folhaDaPagina(pageId) {
      return model.spreadOfPage(spreads, pageId);
    }

    function trocarFolhaDaPagina(pattern) {
      const alvo = paginaEscrevivel();
      if (!alvo || !alvo.page) return false;
      const novo = padraoValido(pattern);
      alvo.page.pattern = novo;
      const par = spreads[indice];
      const outro = alvo.lado === 'left' ? par.right : par.left;
      if (outro) outro.pattern = novo;
      desenharFolha();
      construirFolhas();
      return true;
    }

    function trocarCor(estilo, capaEstilo) {
      if (!el.book) return;
      const cor = (estilo && estilo.paperColor) || '#ffffff';
      el.book.style.setProperty('--flip-paper', cor);
      el.book.dataset.dots = (estilo && estilo.dots) || 'none';
      el.book.style.setProperty('--dot-color', (estilo && estilo.dotColor) || 'var(--accent-taupe)');
      el.book.style.setProperty('--dot-size',
        `${styling && styling.dotSpacing ? styling.dotSpacing(estilo && estilo.dots) : 20}px`);

      const capa = capaEstilo || {};
      const corDaCapa = capa.paperColor || 'var(--cover-bg, #fcfbfb)';
      if (el.cover) {
        el.cover.style.setProperty('--flip-cover-paper', corDaCapa);
        el.cover.dataset.coverDots = capa.dots || 'none';
        el.cover.style.setProperty('--cover-dot-color', capa.dotColor || 'var(--accent-taupe)');
        el.cover.style.setProperty('--cover-dot-size',
          `${styling && styling.dotSpacing ? styling.dotSpacing(capa.dots) : 20}px`);
      }
    }

    let toqueComecouNoLivrinho = false;
    doc.addEventListener('pointerdown', (evento) => {
      toqueComecouNoLivrinho = Boolean(el.modal && el.modal.contains(evento.target));
    }, true);

    const toqueDoLivrinho = () => toqueComecouNoLivrinho;

    if (el.btnNext) el.btnNext.addEventListener('click', () => proximaPagina());
    if (el.btnPrev) el.btnPrev.addEventListener('click', () => folhear(-1));
    if (el.zoneNext) el.zoneNext.addEventListener('click', () => proximaPagina());
    if (el.zonePrev) el.zonePrev.addEventListener('click', () => folhear(-1));
    if (el.coverOpen) {
      el.coverOpen.addEventListener('click', () => { if (toqueDoLivrinho()) abrirLivro(); });
      el.coverOpen.addEventListener('pointerup', () => { if (toqueDoLivrinho()) abrirLivro(); });
    }
    if (el.cover) {
      el.cover.addEventListener('click', (evento) => {
        if (evento.target === el.coverOpen || (el.coverOpen && el.coverOpen.contains(evento.target))) return;
        if (!toqueDoLivrinho()) return;
        abrirLivro();
      });
      el.cover.addEventListener('pointerup', (evento) => {
        if (evento.target === el.coverOpen || (el.coverOpen && el.coverOpen.contains(evento.target))) return;
        if (!toqueDoLivrinho()) return;
        abrirLivro();
      });
    }
    if (el.btnSave) el.btnSave.addEventListener('click', () => {
      if (!podeMexerAqui()) return;
      if (opcoes.aoSalvar) opcoes.aoSalvar({ aoFechar: false });
    });
    if (el.btnFinalizar) el.btnFinalizar.addEventListener('click', () => {
      if (!podeMexerAqui()) return;
      if (opcoes.aoFinalizarPagina) opcoes.aoFinalizarPagina();
    });
    if (el.btnNewPage) el.btnNewPage.addEventListener('click', () => {
      if (!podeMexerAqui()) return;
      if (opcoes.aoProximaPagina) opcoes.aoProximaPagina();
    });
    if (el.paperSelect) el.paperSelect.addEventListener('change', () => {
      if (!podeMexerAqui()) return;
      trocarFolhaDaPagina(el.paperSelect.value);
      if (opcoes.aoTrocarFolha) opcoes.aoTrocarFolha(el.paperSelect.value);
    });
    if (el.btnWrite) el.btnWrite.addEventListener('click', () => {
      const pagina = paginaAberta();
      if (opcoes.aoIrEscrever) opcoes.aoIrEscrever(pagina);
      fechar();
    });
    if (el.btnPenPicker) el.btnPenPicker.hidden = false;
    if (el.penPicker) el.penPicker.hidden = true;
    aplicarModoDeLeitura();
    if (el.btnClose) el.btnClose.addEventListener('click', () => {
      if (opcoes.aoFechar) opcoes.aoFechar();
      fechar();
    });

    if (el.modal) {
      el.modal.addEventListener('click', (event) => {
        const noFundo = event.target === el.modal
          || (event.target.classList && event.target.classList.contains('flip-backdrop'));
        if (!noFundo || !toqueDoLivrinho()) return;
        if (opcoes.aoFechar) opcoes.aoFechar();
        fechar();
      });
    }

    doc.addEventListener('keydown', (event) => {
      if (!estaAberto()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (opcoes.aoFechar) opcoes.aoFechar();
        fechar();
        return;
      }
      if (event.key === 'ArrowRight') { event.preventDefault(); proximaPagina(); return; }
      if (indice < 0) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); folhear(-1); }
    });

    [['next', el.zoneNext, 1], ['prev', el.zonePrev, -1]].forEach(([, zona, direcao]) => {
      if (!zona) return;
      let inicio = null;
      zona.addEventListener('pointerdown', (evento) => { inicio = evento.clientX; });
      zona.addEventListener('pointerup', (evento) => {
        if (inicio === null) return;
        const arrastou = Math.abs(evento.clientX - inicio) > 24;
        inicio = null;
        if (!arrastou) return;
        folhear(direcao);
      });
    });

    const velocidadeMinima = 0.35;

    function virarPeloArrasto(dx) {
      const passo = dx < 0 ? 1 : -1;
      if (indice < 0) {
        if (passo > 0) abrirLivro();
        return;
      }
      folhear(passo);
    }

    function temTextoMarcado() {
      const selecao = doc.getSelection ? doc.getSelection() : null;
      return Boolean(selecao && !selecao.isCollapsed && String(selecao).trim());
    }

    if (el.bookWrap) {
      let ultimoArrastoDeToque = 0;

      let toque = null;
      el.bookWrap.addEventListener('touchstart', (evento) => {
        const ponto = evento.touches && evento.touches[0];
        const alvo = evento.target;
        const bloqueado = Boolean(alvo && alvo.closest
          && (alvo.closest('.placed-sticker') || alvo.closest('button')));
        toque = (!ponto || bloqueado) ? null : {
          x: ponto.clientX,
          y: ponto.clientY,
          tempo: Date.now(),
          valendo: false
        };
      }, { passive: true });

      el.bookWrap.addEventListener('touchmove', (evento) => {
        if (!toque) return;
        const ponto = evento.touches && evento.touches[0];
        if (!ponto) return;
        const dx = ponto.clientX - toque.x;
        const dy = Math.abs(ponto.clientY - toque.y);
        if (toque.valendo) {
          toque.ultimoX = ponto.clientX;
          toque.ultimoY = ponto.clientY;
          if (evento.cancelable) evento.preventDefault();
          return;
        }
        if (Math.abs(dx) < 30 || Math.abs(dx) < dy * 1.6) return;
        const velocidade = Math.abs(dx) / Math.max(1, Date.now() - toque.tempo);
        if (velocidade < velocidadeMinima) return;
        toque.valendo = true;
        toque.ultimoX = ponto.clientX;
        toque.ultimoY = ponto.clientY;
        if (evento.cancelable) evento.preventDefault();
      }, { passive: false });

      el.bookWrap.addEventListener('touchend', (evento) => {
        const comecou = toque;
        toque = null;
        if (!comecou || !comecou.valendo) return;
        const ponto = (evento.changedTouches && evento.changedTouches[0])
          || { clientX: comecou.ultimoX, clientY: comecou.ultimoY };
        if (ponto.clientX === undefined || animando) return;
        const dx = ponto.clientX - comecou.x;
        const velocidade = Math.abs(dx) / Math.max(1, Date.now() - comecou.tempo);
        if (Math.abs(dx) < 46 || velocidade < 0.25) return;
        if (temTextoMarcado()) return;
        ultimoArrastoDeToque = Date.now();
        virarPeloArrasto(dx);
      }, { passive: true });

      el.bookWrap.addEventListener('touchcancel', () => { toque = null; });

      let inicioX = null;
      let inicioY = null;
      let podeArrastar = false;

      el.bookWrap.addEventListener('pointerdown', (evento) => {
        const alvo = evento.target;
        podeArrastar = !(alvo && alvo.closest && (alvo.closest('.placed-sticker') || alvo.closest('button')));
        inicioX = evento.clientX;
        inicioY = evento.clientY;
      });

      el.bookWrap.addEventListener('pointerup', (evento) => {
        const comecou = inicioX;
        const y0 = inicioY;
        inicioX = null;
        inicioY = null;
        if (!podeArrastar || comecou === null || animando) return;
        if (Date.now() - ultimoArrastoDeToque < 600) return;
        const dx = evento.clientX - comecou;
        const dy = Math.abs(evento.clientY - (y0 || 0));
        if (Math.abs(dx) < 46 || Math.abs(dx) < dy * 2) return;
        if (temTextoMarcado()) return;
        virarPeloArrasto(dx);
      });

      el.bookWrap.addEventListener('pointercancel', () => { inicioX = null; inicioY = null; });
    }

    if (typeof root !== 'undefined' && root.addEventListener) {
      root.addEventListener('resize', () => agendarAjuste(240));
      root.addEventListener('orientationchange', () => agendarAjuste(300));
    }

    function abrir(alvo) {
      if (!el.modal) return;
      const jaEstavaAberto = el.modal.classList.contains('open');
      el.modal.classList.add('open');
      if (jaEstavaAberto && indice >= 0) {
        mostrarFolhaAberta();
        return;
      }
      if (Number.isFinite(alvo)) indice = model.clampSpread(alvo, spreads.length);
      if (indice >= 0) alvoDaCapinha = indice;
      mostrarCapa();
    }

    function fechar() {
      guardarRolagem();
      const alvo = paginaEscrevivel();
      if (alvo && opcoes.aoSairDaPagina) {
        opcoes.aoSairDaPagina({
          page: alvo.page,
          lado: alvo.lado,
          camada: camadaDeAdesivos(alvo.lado)
        });
      }
      if (el.modal) el.modal.classList.remove('open', 'is-cover', 'is-opening');
      if (sound && sound.tocar) sound.tocar({ direcao: -1, volume: 0.05 });
    }

    function estaAberto() {
      return Boolean(el.modal && el.modal.classList.contains('open'));
    }

    function irPara(novoIndice) {
      const alvo = model.clampSpread(novoIndice, spreads.length);
      if (alvo === indice) return Promise.resolve(false);
      return folhear(alvo > indice ? 1 : -1);
    }

    function proximaPagina() {
      if (indice < 0) return abrirLivro();
      return folhear(1);
    }

    return {
      el,
      abrir,
      abrirLivro,
      abrirSemAnimacao,
      fechar,
      estaAberto,
      definirConteudo,
      desenharFolha,
      folhear,
      irPara,
      proximaPagina,
      trocarCor,
      trocarFolhaDaPagina,
      textoDaPaginaAberta,
      escreverNaPaginaAberta,
      paginaEscrevivel,
      podeEscrever: () => Boolean(paginaEscrevivel()),
      textoDoElemento,
      corpoDoLado,
      camadaDeAdesivos,
      camadaDaPaginaAberta,
      ajustarFits,
      agendarAjuste,
      redesenharFolhasQueVirão,
      folhaDaData,
      folhaDaPagina,
      chaveDaFolha,
      get spreads() { return spreads; },
      get folhas() { return folhas; },
      get indice() { return indice; },
      get fechado() { return indice < 0; },
      get animando() { return animando; }
    };
  }

  return { montar, stickerHtml, textsHtml, DURACAO_VIRADA, DURACAO_ABRIR, formatarData, PADROES };
});
