(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieLettersModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const TAMANHO = 8;
  const TOTAL_DE_ARTES = 15;
  const VALIDADE_DIAS = 7;

  const ARTES = Array.from({ length: TOTAL_DE_ARTES }, (_, i) => `letter${i + 1}`);

  function normalizarCodigo(valor) {
    return String(valor == null ? '' : valor)
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .replace(/I/g, 'L')
      .slice(0, TAMANHO);
  }

  function codigoValido(valor) {
    const codigo = normalizarCodigo(valor);
    if (codigo.length !== TAMANHO) return false;
    for (const letra of codigo) if (!ALFABETO.includes(letra)) return false;
    return true;
  }

  function formatarCodigo(valor) {
    const codigo = normalizarCodigo(valor);
    return codigo.length === TAMANHO ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : codigo;
  }

  function arteValida(valor) {
    return ARTES.includes(String(valor || ''));
  }

  function arteDaCarta(valor) {
    return arteValida(valor) ? String(valor) : 'letter1';
  }

  function srcDaArte(valor) {
    return `assets/images/letters/${arteDaCarta(valor)}.webp`;
  }

  function linkDaCarta(codigo, base) {
    const raiz = String(base || 'https://little-place.vercel.app').replace(/\/+$/, '');
    return `${raiz}/#carta=${formatarCodigo(codigo)}`;
  }

  function linkDaAmiga(codigo, base) {
    const raiz = String(base || 'https://little-place.vercel.app').replace(/\/+$/, '');
    return `${raiz}/#amiga=${formatarCodigo(codigo)}`;
  }

  function textoParaCompartilhar({ apelido, codigo, link, base } = {}) {
    const quem = String(apelido || '').trim();
    const url = link || linkDaCarta(codigo, base);
    return [
      quem ? `💌 ${quem} te mandou uma cartinha!` : '💌 você recebeu uma cartinha!',
      '',
      `código: ${formatarCodigo(codigo)}`,
      `abre aqui: ${url}`,
      '',
      `(vale ${VALIDADE_DIAS} dias e abre uma vez só ♡)`
    ].join('\n');
  }

  function lerHash(hash) {
    let params;
    try {
      params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    } catch (error) {
      return { carta: '', amiga: '' };
    }
    const carta = params.get('carta') || params.get('letter') || '';
    const amiga = params.get('amiga') || params.get('friend') || '';
    return {
      carta: codigoValido(carta) ? normalizarCodigo(carta) : '',
      amiga: codigoValido(amiga) ? normalizarCodigo(amiga) : ''
    };
  }

  function estadoDaCarta(carta, agora) {
    const quando = agora instanceof Date ? agora.getTime() : Number(agora) || Date.now();
    if (carta && carta.openedAt) return { chave: 'aberta', rotulo: 'aberta 💌' };
    const expira = Date.parse((carta && carta.expiresAt) || '');
    if (Number.isFinite(expira) && expira <= quando) return { chave: 'expirada', rotulo: 'expirada 🍂' };
    return { chave: 'aguardando', rotulo: 'ainda não aberta ⏳' };
  }

  function contarCartas(numero) {
    const n = Math.max(0, Math.trunc(Number(numero) || 0));
    if (n === 0) return 'nenhuma cartinha nova';
    return n === 1 ? '1 cartinha nova' : `${n} cartinhas novas`;
  }

  function resumoDaPagina(pagina) {
    const titulo = String((pagina && pagina.title) || '').trim();
    const texto = String((pagina && pagina.body) || '').replace(/\s+/g, ' ').trim();
    if (titulo) return titulo;
    if (texto) return texto.length > 48 ? `${texto.slice(0, 48)}…` : texto;
    return 'uma página com enfeites ⋆ ˚｡⋆';
  }

  return {
    ALFABETO,
    TAMANHO,
    VALIDADE_DIAS,
    TOTAL_DE_ARTES,
    ARTES,
    normalizarCodigo,
    codigoValido,
    formatarCodigo,
    arteValida,
    arteDaCarta,
    srcDaArte,
    linkDaCarta,
    linkDaAmiga,
    textoParaCompartilhar,
    lerHash,
    estadoDaCarta,
    contarCartas,
    resumoDaPagina
  };
});
