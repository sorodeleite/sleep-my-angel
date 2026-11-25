(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieFlipModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PADROES = ['lines', 'dots', 'grid', 'blank', 'spiral'];
  const padraoValido = (valor) => (PADROES.includes(valor) ? valor : 'lines');

  const ordemValida = (valor) => {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.trunc(numero) : null;
  };

  function blankPage(motivo, date, pattern, cor, medida) {
    return {
      kind: 'blank',
      motivo: motivo || 'fim',
      pageId: '',
      date: String(date || ''),
      title: '',
      body: '',
      pattern: padraoValido(pattern),
      textSpans: [],
      stickers: [],
      diaryStyle: corDaPagina(cor && cor.diaryStyle ? cor : cor),
      textStyle: letraDaPagina(cor),
      medida: medidaDaPagina(cor && cor.medida ? cor : null) || medidaDaPagina(medida)
    };
  }

  function medidaDaPagina(pagina, padrao) {
    const fontes = [
      pagina && pagina.medida,
      pagina && pagina.folhaMedida,
      pagina,
      padrao && padrao.medida,
      padrao
    ];
    for (const fonte of fontes) {
      if (!fonte || typeof fonte !== 'object') continue;
      const largura = Number(fonte.width);
      const altura = Number(fonte.height);
      if (largura > 0 && altura > 0) return { width: largura, height: altura };
    }
    return null;
  }

  function corDaPagina(pagina) {
    if (!pagina || !pagina.diaryStyle || typeof pagina.diaryStyle !== 'object') return null;
    const cor = String(pagina.diaryStyle.paperColor || '').trim();
    const daBolinha = String(pagina.diaryStyle.dotColor || '').trim();
    const bolinhas = String(pagina.diaryStyle.dots || '').trim();
    if (!cor && !daBolinha && !bolinhas) return null;
    return { paperColor: cor, dotColor: daBolinha, dots: bolinhas };
  }

  function letraDaPagina(pagina) {
    if (!pagina || !pagina.textStyle || typeof pagina.textStyle !== 'object') return null;
    const cor = String(pagina.textStyle.color || '').trim();
    const daBordinha = String(pagina.textStyle.outlineColor || '').trim();
    const bordinha = Boolean(pagina.textStyle.outline);
    if (!cor && !daBordinha && pagina.textStyle.outline === undefined) return null;
    return { color: cor, outline: bordinha, outlineColor: daBordinha };
  }

  function pageFromEntryPage(entry, pagina, index = 0, medidaPadrao = null) {
    return {
      kind: 'entry',
      entry,
      entryId: entry && entry.id,
      ordem: ordemValida(pagina && pagina.ordem),
      pageId: String((pagina && pagina.id) || `pag-${(entry && entry.date) || 'sem-dia'}-${index + 1}`),
      date: (entry && entry.date) || '',
      title: (pagina && pagina.title) || '',
      body: (pagina && pagina.body) || '',
      pattern: padraoValido(pagina && pagina.pattern),
      diaryStyle: corDaPagina(pagina),
      textStyle: letraDaPagina(pagina),
      medida: medidaDaPagina(pagina, entry) || medidaDaPagina(medidaPadrao),
      textSpans: Array.isArray(pagina && pagina.textSpans) ? pagina.textSpans : [],
      stickers: Array.isArray(pagina && pagina.stickers) ? pagina.stickers : [],
      texts: Array.isArray(pagina && pagina.texts) ? pagina.texts : [],
      letterFrom: (pagina && pagina.letterFrom) || null,
      letterArt: (pagina && pagina.letterArt) || null
    };
  }

  function paginaDeMemoriaAntiga(entry) {
    const memoria = entry || {};
    return {
      title: memoria.title,
      body: memoria.body,
      pattern: memoria.pattern,
      textSpans: memoria.textSpans,
      stickers: memoria.stickers,
      texts: memoria.texts,
      diaryStyle: memoria.diaryStyle,
      textStyle: memoria.textStyle,
      medida: memoria.medida
    };
  }

  function pageFromEntry(entry, medidaPadrao = null) {
    if (!entry) return blankPage();
    const pagina = Array.isArray(entry.pages) && entry.pages.length
      ? entry.pages[0]
      : paginaDeMemoriaAntiga(entry);
    return pageFromEntryPage(entry, pagina, 0, medidaPadrao);
  }

  function pagesFromEntry(entry, medidaPadrao = null) {
    if (!entry) return [];
    const paginas = Array.isArray(entry.pages) && entry.pages.length
      ? entry.pages
      : [paginaDeMemoriaAntiga(entry)];
    return paginas.map((pagina, index) => pageFromEntryPage(entry, pagina, index, medidaPadrao));
  }

  function coverPage(coverData) {
    const data = coverData || {};
    const semTitulo = Boolean(data.semTitulo);
    return {
      kind: 'cover',
      semTitulo,
      title: semTitulo ? '' : String(data.title || ''),
      subtitle: semTitulo ? '' : String(data.subtitle || ''),
      stickers: Array.isArray(data.stickers) ? data.stickers : [],
      texts: Array.isArray(data.texts) ? data.texts : [],
      textSpans: []
    };
  }

  function introPage() {
    return {
      kind: 'intro',
      title: 'Dear diary',
      body: '',
      textSpans: [],
      stickers: []
    };
  }

  function normalizarPaginaLivre(valor) {
    if (!valor) return null;
    if (typeof valor === 'string') return { date: valor, id: '', pattern: '', diaryStyle: null, textStyle: null, medida: null };
    if (typeof valor === 'object') {
      return {
        date: String(valor.date || ''),
        id: String(valor.id || ''),
        pattern: String(valor.pattern || ''),
        title: String(valor.title || ''),
        diaryStyle: corDaPagina(valor),
        textStyle: letraDaPagina(valor),
        medida: medidaDaPagina(valor)
      };
    }
    return null;
  }

  function buildPages(entries, coverData, opcoes = {}) {
    const medidaPadrao = medidaDaPagina(opcoes.medidaDaFolha);
    const paginas = [introPage()];
    const lista = Array.isArray(entries) ? entries : [];

    const daMemoria = [];
    lista.forEach((entry) => {
      pagesFromEntry(entry, medidaPadrao).forEach((pagina) => daMemoria.push(pagina));
    });
    if (daMemoria.some((pagina) => ordemValida(pagina.ordem) !== null)) {
      const posicaoDeSempre = new Map(daMemoria.map((pagina, index) => [pagina, index]));
      daMemoria.sort((a, b) => {
        const da = ordemValida(a.ordem);
        const db = ordemValida(b.ordem);
        const ordemA = da === null ? Infinity : da;
        const ordemB = db === null ? Infinity : db;
        if (ordemA !== ordemB) return ordemA - ordemB;
        return (posicaoDeSempre.get(a) ?? 0) - (posicaoDeSempre.get(b) ?? 0);
      });
    }
    daMemoria.forEach((pagina) => paginas.push(pagina));

    const livre = normalizarPaginaLivre(opcoes.paginaLivre);
    const folhaLivre = blankPage('livre', livre && livre.date, null, livre, medidaPadrao);
    if (livre && livre.id) folhaLivre.pageId = livre.id;
    if (livre && livre.pattern) folhaLivre.pattern = padraoValido(livre.pattern);
    if (livre && livre.title) folhaLivre.title = livre.title;

    if ((paginas.length + 1) % 2 !== 0) paginas.push(blankPage('fim', livre && livre.date, null, null, medidaPadrao));
    paginas.push(folhaLivre);
    return paginas;
  }

  function toSpreads(pages) {
    const lista = Array.isArray(pages) ? pages : [];
    const folhas = [];
    for (let i = 0; i < lista.length; i += 2) {
      folhas.push({
        index: folhas.length,
        left: lista[i] || blankPage(),
        right: lista[i + 1] || blankPage()
      });
    }
    return folhas.length ? folhas : [{ index: 0, left: blankPage(), right: blankPage() }];
  }

  function spreadsFromEntries(entries, coverData, opcoes = {}) {
    return toSpreads(buildPages(entries, coverData, opcoes));
  }

  function clampSpread(index, total) {
    const max = Math.max(0, (Number(total) || 1) - 1);
    const value = Math.floor(Number(index) || 0);
    return Math.min(Math.max(value, 0), max);
  }

  function nextSpreadIndex(index, total, direction = 1) {
    return clampSpread((Number(index) || 0) + (Number(direction) < 0 ? -1 : 1), total);
  }

  function hasPrevious(index) {
    return Math.floor(Number(index) || 0) > 0;
  }

  function hasNext(index, total) {
    return clampSpread(index, total) < Math.max(0, (Number(total) || 1) - 1);
  }

  function openEntrySide(spread) {
    if (!spread) return 'right';
    if (spread.left && spread.left.kind === 'intro') return 'right';
    if (spread.right && spread.right.kind === 'blank') return 'right';
    if (spread.left && spread.left.kind === 'blank') return 'left';
    return 'right';
  }

  function writablePage(spread) {
    if (!spread) return null;
    const side = openEntrySide(spread);
    const page = spread[side];
    return page && (page.kind === 'blank' || page.kind === 'entry') ? page : null;
  }

  function withText(page, { title, body } = {}) {
    if (!page) return page;
    return {
      ...page,
      title: title === undefined ? page.title || '' : String(title),
      body: body === undefined ? page.body || '' : String(body)
    };
  }

  function pageLabel(page) {
    if (!page) return 'página';
    if (page.kind === 'cover') return 'capa';
    if (page.kind === 'intro') return 'abertura';
    if (page.kind === 'blank') return page.motivo === 'fim' ? 'página em branco' : 'página livre';
    return page.date || 'memória';
  }

  function spreadOfPage(spreads, pageId) {
    if (!pageId) return -1;
    const lista = Array.isArray(spreads) ? spreads : [];
    return lista.findIndex((folha) => folha
      && ((folha.left && folha.left.pageId === pageId) || (folha.right && folha.right.pageId === pageId)));
  }

  return {
    PADROES,
    padraoValido,
    blankPage,
    medidaDaPagina,
    corDaPagina,
    letraDaPagina,
    pageFromEntry,
    pagesFromEntry,
    coverPage,
    introPage,
    buildPages,
    toSpreads,
    spreadsFromEntries,
    clampSpread,
    nextSpreadIndex,
    hasPrevious,
    hasNext,
    openEntrySide,
    writablePage,
    withText,
    pageLabel,
    spreadOfPage
  };
});
