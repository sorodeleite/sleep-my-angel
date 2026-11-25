(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieMediaStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DB_NOME = 'pooftie-media';
  const DB_VERSAO = 1;
  const LOJA = 'audio';
  const memoria = new Map();

  function temIndexedDB() {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch (error) {
      return false;
    }
  }

  function abrirBanco() {
    return new Promise((resolve, reject) => {
      if (!temIndexedDB()) {
        reject(new Error('este navegador não tem IndexedDB'));
        return;
      }
      const pedido = indexedDB.open(DB_NOME, DB_VERSAO);
      pedido.onupgradeneeded = () => {
        const banco = pedido.result;
        if (!banco.objectStoreNames.contains(LOJA)) banco.createObjectStore(LOJA);
      };
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error || new Error('não consegui abrir o banco'));
    });
  }

  function comLoja(modo, tarefa) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const transacao = banco.transaction(LOJA, modo);
      const loja = transacao.objectStore(LOJA);
      let resultado;
      try {
        resultado = tarefa(loja);
      } catch (error) {
        reject(error);
        return;
      }
      transacao.oncomplete = () => {
        banco.close();
        resolve(resultado && resultado.result !== undefined ? resultado.result : resultado);
      };
      transacao.onerror = () => {
        banco.close();
        reject(transacao.error || new Error('deu ruim no banco'));
      };
      transacao.onabort = () => {
        banco.close();
        reject(transacao.error || new Error('a gravação foi cancelada'));
      };
    }));
  }

  async function salvar(file, chave) {
    const key = String(chave || '').trim() || `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const registro = {
      blob: file,
      name: (file && file.name) || 'musiquinha',
      type: (file && file.type) || 'audio/mpeg',
      size: (file && file.size) || 0,
      savedAt: Date.now()
    };
    try {
      await comLoja('readwrite', (loja) => loja.put(registro, key));
      return { key, guardado: 'banco' };
    } catch (error) {
      memoria.set(key, registro);
      console.warn('[crechezinha] guardei a música só na memória desta sessão:', error.message);
      return { key, guardado: 'memoria' };
    }
  }

  async function pegar(chave) {
    const key = String(chave || '').trim();
    if (!key) return null;
    try {
      const doBanco = await comLoja('readonly', (loja) => loja.get(key));
      if (doBanco) return doBanco;
    } catch (error) {
    }
    return memoria.get(key) || null;
  }

  async function pegarBlob(chave) {
    const registro = await pegar(chave);
    return registro ? registro.blob : null;
  }

  async function urlTocavel(chave) {
    const blob = await pegarBlob(chave);
    if (!blob) return null;
    if (typeof URL === 'undefined' || !URL.createObjectURL) return null;
    return URL.createObjectURL(blob);
  }

  async function apagar(chave) {
    const key = String(chave || '').trim();
    if (!key) return false;
    memoria.delete(key);
    try {
      await comLoja('readwrite', (loja) => loja.delete(key));
      return true;
    } catch (error) {
      return false;
    }
  }

  async function listarChaves() {
    try {
      const chaves = await comLoja('readonly', (loja) => loja.getAllKeys());
      return Array.isArray(chaves) ? chaves.map(String) : [];
    } catch (error) {
      return [...memoria.keys()];
    }
  }

  async function limparNaoUsados(chavesEmUso = []) {
    const usadas = new Set((chavesEmUso || []).map(String));
    const todas = await listarChaves();
    const sobras = todas.filter((chave) => !usadas.has(chave));
    await Promise.all(sobras.map((chave) => apagar(chave)));
    return sobras;
  }

  return {
    DB_NOME,
    LOJA,
    salvar,
    pegar,
    pegarBlob,
    urlTocavel,
    apagar,
    listarChaves,
    limparNaoUsados,
    get memoria() { return memoria; }
  };
});
