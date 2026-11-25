(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieWidgetConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CHAVE = 'pooftie_widget_config';
  const VERSAO = 3;
  const MODOS = ['calendario', 'escrever'];
  const LAYOUTS = ['deitado', 'quadrado'];
  const TAMANHOS = ['pequeno', 'medio', 'grande'];
  const FONTES = ['app', 'caveat', 'patrick', 'nunito', 'gloria', 'marck', 'indie'];
  const COR_PADRAO = '#f8f0ea';
  const MAX_ADESIVOS = 8;
  const LIMITE_DO_SRC = 240 * 1024;
  const LIMITE_DA_IMAGEM = 480 * 1024;
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const IMAGEM_DO_APP = /^assets\/[A-Za-z0-9_(). /-]+\.(?:webp|png|jpe?g|gif)$/i;
  const IMAGEM_DATA = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

  let contador = 0;

  const numero = (valor, padrao, minimo, maximo) => {
    const n = Number(valor);
    if (!Number.isFinite(n)) return padrao;
    return Math.max(minimo, Math.min(maximo, n));
  };

  const arredondar = (valor) => Math.round(valor * 10000) / 10000;

  function expandirCor(curta) {
    return ('#' + curta[1] + curta[1] + curta[2] + curta[2] + curta[3] + curta[3]).toLowerCase();
  }

  function normalizarCor(valor, padrao = COR_PADRAO) {
    const texto = String(valor == null ? '' : valor).trim();
    if (!HEX.test(texto)) return padrao;
    return texto.length === 4 ? expandirCor(texto) : texto.toLowerCase();
  }

  function normalizarImagem(valor) {
    const src = String(valor == null ? '' : valor).trim();
    if (!src || src.length > LIMITE_DA_IMAGEM) return '';
    if (/^data:image\//i.test(src)) return IMAGEM_DATA.test(src) ? src : '';
    if (src.includes('..')) return '';
    return IMAGEM_DO_APP.test(src) ? src : '';
  }

  function padrao() {
    return {
      version: VERSAO,
      modo: 'calendario',
      layout: 'deitado',
      tamanho: 'medio',
      corFundo: COR_PADRAO,
      fonte: 'app',
      imagem: '',
      adesivos: []
    };
  }

  function idNovo() {
    contador += 1;
    return `w-${Date.now().toString(36)}-${contador.toString(36)}`;
  }

  function normalizarAdesivo(item, indice = 0) {
    if (!item || typeof item !== 'object') return null;
    const src = String(item.src || '').trim();
    if (!src || src.length > LIMITE_DO_SRC) return null;
    const id = String(item.id || `w-${indice + 1}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    return {
      id: id || `w-${indice + 1}`,
      src,
      x: arredondar(numero(item.x, 0.5, 0, 1)),
      y: arredondar(numero(item.y, 0.5, 0, 1)),
      tamanho: arredondar(numero(item.tamanho, 0.26, 0.06, 0.62)),
      rotacao: Math.round(numero(item.rotacao, 0, -180, 180)),
      flip: Boolean(item.flip)
    };
  }

  function normalizar(valor) {
    const cru = (valor && typeof valor === 'object') ? valor : {};
    const modo = MODOS.includes(cru.modo) ? cru.modo : 'calendario';
    const layout = LAYOUTS.includes(cru.layout) ? cru.layout : 'deitado';
    const tamanho = TAMANHOS.includes(cru.tamanho) ? cru.tamanho : 'medio';
    const fonte = FONTES.includes(cru.fonte) ? cru.fonte : 'app';
    const vistos = new Set();
    const adesivos = [];
    (Array.isArray(cru.adesivos) ? cru.adesivos : []).forEach((item, indice) => {
      const adesivo = normalizarAdesivo(item, indice);
      if (!adesivo || vistos.has(adesivo.id)) return;
      if (adesivos.length >= MAX_ADESIVOS) return;
      vistos.add(adesivo.id);
      adesivos.push(adesivo);
    });
    return {
      version: VERSAO,
      modo,
      layout,
      tamanho,
      corFundo: normalizarCor(cru.corFundo),
      fonte,
      imagem: normalizarImagem(cru.imagem),
      adesivos
    };
  }

  function ler(storage) {
    try {
      const cru = storage && storage.getItem(CHAVE);
      return cru ? normalizar(JSON.parse(cru)) : padrao();
    } catch (error) {
      return padrao();
    }
  }

  function guardar(storage, valor) {
    const config = normalizar(valor);
    try {
      if (storage) storage.setItem(CHAVE, JSON.stringify(config));
      return { ok: true, config };
    } catch (error) {
      return { ok: false, config, erro: error };
    }
  }

  function novoAdesivo(src, extras = {}) {
    return normalizarAdesivo({ ...extras, src, id: extras.id || idNovo() }, 0);
  }

  function adicionar(valor, src, extras = {}) {
    const config = normalizar(valor);
    if (config.adesivos.length >= MAX_ADESIVOS) return config;
    const adesivo = novoAdesivo(src, extras);
    if (!adesivo) return config;
    return normalizar({ ...config, adesivos: [...config.adesivos, adesivo] });
  }

  function atualizar(valor, id, mudancas = {}) {
    const config = normalizar(valor);
    return normalizar({
      ...config,
      adesivos: config.adesivos.map((item) => (
        item.id === id ? { ...item, ...mudancas, id: item.id, src: item.src } : item
      ))
    });
  }

  function remover(valor, id) {
    const config = normalizar(valor);
    return normalizar({ ...config, adesivos: config.adesivos.filter((item) => item.id !== id) });
  }

  function paraNativo(valor) {
    const config = normalizar(valor);
    return {
      modo: config.modo,
      layout: config.layout,
      tamanho: config.tamanho,
      corFundo: config.corFundo,
      fonte: config.fonte,
      imagem: config.imagem,
      adesivos: config.adesivos.map((item) => ({
        src: item.src,
        x: item.x,
        y: item.y,
        tamanho: item.tamanho,
        rotacao: item.rotacao,
        flip: item.flip
      }))
    };
  }

  return {
    CHAVE,
    VERSAO,
    MODOS,
    LAYOUTS,
    TAMANHOS,
    FONTES,
    COR_PADRAO,
    MAX_ADESIVOS,
    LIMITE_DO_SRC,
    LIMITE_DA_IMAGEM,
    padrao,
    normalizar,
    normalizarAdesivo,
    normalizarCor,
    normalizarImagem,
    ler,
    guardar,
    novoAdesivo,
    adicionar,
    atualizar,
    remover,
    paraNativo
  };
});
