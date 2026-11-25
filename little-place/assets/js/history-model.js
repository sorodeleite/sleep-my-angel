(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieHistory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LIMITE_PADRAO = 40;
  const SEQ_VERSION = 1;

  function retrato(dados, opcoes = {}) {
    const quando = Number(opcoes.quando);
    return {
      onde: String(opcoes.onde || 'page'),
      rotulo: String(opcoes.rotulo || ''),
      quando: Number.isFinite(quando) && quando > 0 ? quando : Date.now(),
      dados: dados === undefined || dados === null ? null : JSON.parse(JSON.stringify(dados))
    };
  }

  function criar(inicial = null, opcoes = {}) {
    const pedido = Number(opcoes.limite);
    const limite = Number.isFinite(pedido) ? Math.max(2, Math.floor(pedido)) : LIMITE_PADRAO;
    const desfazerPilha = [];
    const refazerPilha = [];

    const assinatura = (r) => (r ? `${JSON.stringify(r.dados)}|${r.onde}` : '');
    const copia = (r) => (r === null || r === undefined ? r : JSON.parse(JSON.stringify(r)));

    if (inicial) desfazerPilha.push(copia(inicial));

    function atual() {
      return desfazerPilha.length ? desfazerPilha[desfazerPilha.length - 1] : null;
    }

    function guardar(dados, opcoes = {}) {
      const novo = retrato(dados, opcoes);
      const topo = atual();
      if (topo && assinatura(topo) === assinatura(novo)) return false;
      desfazerPilha.push(novo);
      while (desfazerPilha.length > limite) desfazerPilha.shift();
      refazerPilha.length = 0;
      return true;
    }

    function podeDesfazer() {
      return desfazerPilha.length > 1;
    }

    function podeRefazer() {
      return refazerPilha.length > 0;
    }

    function desfazer() {
      if (!podeDesfazer()) return null;
      const saindo = desfazerPilha.pop();
      refazerPilha.push(saindo);
      return copia(atual());
    }

    function refazer() {
      if (!refazerPilha.length) return null;
      const voltando = refazerPilha.pop();
      desfazerPilha.push(voltando);
      return copia(voltando);
    }

    function estado() {
      return {
        podeDesfazer: podeDesfazer(),
        podeRefazer: podeRefazer(),
        degraus: desfazerPilha.length,
        futuros: refazerPilha.length
      };
    }

    function limpar(novoInicial = null) {
      desfazerPilha.length = 0;
      refazerPilha.length = 0;
      if (novoInicial) desfazerPilha.push(copia(novoInicial));
      return estado();
    }

    return {
      guardar,
      desfazer,
      refazer,
      podeDesfazer,
      podeRefazer,
      atual,
      estado,
      limpar,
      limite
    };
  }

  return { SEQ_VERSION, LIMITE_PADRAO, retrato, criar };
});
