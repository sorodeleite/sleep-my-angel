(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieFlipFit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SOBRA_PASSEIO = 22;

  const FOLHA_DE_MENTIRINHA = { width: 200, height: 290 };

  const LIMITES_DE_ESCALA = { min: 0.2, max: 1.6 };

  const LIMITES_DA_CAPA = { min: 0.02, max: 4 };

  const LIMITE_DA_REGUA = 6;

  const REGUA_MINIMA = { width: 120, height: 200 };

  const LIMITES_DA_ARTE = { min: 0.2, max: 6 };

  const numero = (valor, padrao = 0) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  };

  function caixaDaFolhaDe(alvo) {
    const largura = (alvo && (alvo.clientWidth || alvo.offsetWidth)) || 0;
    const altura = (alvo && (alvo.clientHeight || alvo.offsetHeight)) || 0;
    if (largura > 0 && altura > 0) return { width: largura, height: altura };
    return { ...FOLHA_DE_MENTIRINHA };
  }

  function normalizarMedida(valor) {
    if (!valor || typeof valor !== 'object') return null;
    const largura = numero(valor.width, 0);
    const altura = numero(valor.height, 0);
    if (largura <= 0 || altura <= 0) return null;
    return { width: largura, height: altura };
  }

  function reguaConfiavel(valor) {
    const medida = normalizarMedida(valor);
    if (!medida) return false;
    return medida.width >= REGUA_MINIMA.width && medida.height >= REGUA_MINIMA.height;
  }

  function mudancaSoDeAltura(de, para, tolerancia = 1.5) {
    const origem = normalizarMedida(de);
    const destino = normalizarMedida(para);
    if (!origem || !destino) return false;
    return Math.abs(origem.width - destino.width) <= tolerancia
      && Math.abs(origem.height - destino.height) > tolerancia;
  }

  function podeReancorar(de, para, opcoes = {}) {
    const destino = normalizarMedida(para);
    if (!destino || destino.width < REGUA_MINIMA.width || destino.height < REGUA_MINIMA.height) {
      return false;
    }
    const origem = normalizarMedida(de);
    if (!origem) return true;
    if (opcoes.editando) {
      const larguraMudou = Math.abs(origem.width - destino.width) > 40;
      if (!larguraMudou) return false;
    }
    return true;
  }

  function podeArrumarCapa(de, para, opcoes = {}) {
    const destino = normalizarMedida(para);
    if (!destino) return false;
    const origem = normalizarMedida(de);
    if (!origem) return !opcoes.editando;
    const tolerancia = Math.max(0, numero(opcoes.tolerancia, 8));
    const mudouLargura = Math.abs(origem.width - destino.width) > tolerancia;
    if (!mudouLargura) return false;
    if (opcoes.editando) {
      return Math.abs(origem.width - destino.width) > 40;
    }
    return true;
  }

  function escalaDaMedida(caixaDaFolha, medida, limites = LIMITES_DE_ESCALA) {
    const largura = numero(caixaDaFolha && caixaDaFolha.width, 0);
    const altura = numero(caixaDaFolha && caixaDaFolha.height, 0);
    const regua = normalizarMedida(medida);
    if (!regua || largura <= 0 || altura <= 0) return 1;
    const escala = Math.min(largura / regua.width, altura / regua.height);
    if (!Number.isFinite(escala) || escala <= 0) return 1;
    const menor = numero(limites && limites.min, LIMITES_DE_ESCALA.min);
    const maior = Math.max(menor, numero(limites && limites.max, LIMITES_DE_ESCALA.max));
    return Math.min(Math.max(escala, menor), maior);
  }

  function reguaDaCapa(opcoes = {}) {
    const guardada = normalizarMedida(opcoes.medida);
    if (guardada) return guardada;

    const largura = numero(opcoes.caixa && opcoes.caixa.width, 0);
    const altura = numero(opcoes.caixa && opcoes.caixa.height, 0);
    if (largura <= 0 || altura <= 0) return null;

    const limite = Math.max(1, numero(opcoes.limite, LIMITE_DA_REGUA));
    const desenhos = Array.isArray(opcoes.desenhos) ? opcoes.desenhos : [];
    let fugiu = false;
    let maiorLargura = largura;
    let maiorAltura = altura;
    for (const desenho of desenhos) {
      const item = caixaDoDesenho(desenho);
      if (item.x > largura || item.y > altura) fugiu = true;
      maiorLargura = Math.max(maiorLargura, item.x + item.width);
      maiorAltura = Math.max(maiorAltura, item.y + item.height);
    }
    if (!fugiu) return { width: largura, height: altura };
    return {
      width: Math.min(largura * limite, Math.max(largura, Math.round(maiorLargura))),
      height: Math.min(altura * limite, Math.max(altura, Math.round(maiorAltura)))
    };
  }

  function enquadramento(caixa, regua, limites = LIMITES_DE_ESCALA) {
    const largura = numero(caixa && caixa.width, 0);
    const altura = numero(caixa && caixa.height, 0);
    if (largura <= 0 || altura <= 0) return null;
    const medida = normalizarMedida(regua);
    const escala = escalaDaMedida({ width: largura, height: altura }, medida, limites);
    if (!Number.isFinite(escala) || escala <= 0) return null;
    const base = medida || { width: largura, height: altura };
    return {
      escala,
      x: (largura - base.width * escala) / 2,
      y: (altura - base.height * escala) / 2
    };
  }

  function caixaDoDesenho(item, padrao = 85) {
    const dados = (item && typeof item === 'object') ? item : {};
    const largura = numero(dados.width, 0) || numero(dados.largura, 0) || padrao;
    const altura = numero(dados.height, 0) || numero(dados.altura, 0) || largura;
    return {
      x: numero(dados.x, 0),
      y: numero(dados.y, 0),
      width: Math.max(0, largura),
      height: Math.max(0, altura)
    };
  }

  function tamanhoDe(sticker) {
    const largura = numero(sticker && sticker.width, 0) || 85;
    const alturaGuardada = numero(sticker && sticker.height, 0);
    return { width: largura, height: alturaGuardada > 0 ? alturaGuardada : largura };
  }

  function encaixeNaFolha(sticker, caixaDaFolha, opcoes = {}) {
    const x = numero(sticker && sticker.x, 0);
    const y = numero(sticker && sticker.y, 0);
    const tamanho = tamanhoDe(sticker);
    const folhaLargura = numero(caixaDaFolha && caixaDaFolha.width, 0);
    const folhaAltura = numero(caixaDaFolha && caixaDaFolha.height, 0);
    const sobraPedida = numero(opcoes.sobra, SOBRA_PASSEIO);
    if (folhaLargura <= 0 || folhaAltura <= 0 || tamanho.width <= 0) {
      return { x, y, escala: 1 };
    }

    const sobraX = Math.min(Math.max(0, sobraPedida), tamanho.width);
    const sobraY = Math.min(Math.max(0, sobraPedida), tamanho.height);
    const minX = -sobraX;
    const maxX = folhaLargura + sobraX - tamanho.width;
    const minY = -sobraY;
    const maxY = folhaAltura + sobraY - tamanho.height;

    if (minX <= maxX && minY <= maxY) {
      return {
        x: Math.min(Math.max(x, minX), maxX) + 0,
        y: Math.min(Math.max(y, minY), maxY) + 0,
        escala: 1
      };
    }

    const escalaX = (folhaLargura + sobraX * 2) / tamanho.width;
    const escalaY = (folhaAltura + sobraY * 2) / tamanho.height;
    const escala = Math.max(0.05, Math.min(1, escalaX, escalaY));
    return {
      x: Math.min(Math.max(x, 0), Math.max(0, folhaLargura - tamanho.width * escala)) + 0,
      y: Math.min(Math.max(y, 0), Math.max(0, folhaAltura - tamanho.height * escala)) + 0,
      escala
    };
  }

  function arteNaRegua(lista, de, para) {
    const origem = normalizarMedida(de);
    const destino = normalizarMedida(para);
    if (!origem || !destino || !Array.isArray(lista) || !lista.length) return lista;
    if (Math.abs(origem.width - destino.width) < 1.5
      && Math.abs(origem.height - destino.height) < 1.5) return lista;
    const escalaX = destino.width / origem.width;
    const escalaY = destino.height / origem.height;
    const fora = (valor) => !Number.isFinite(valor)
      || valor < LIMITES_DA_ARTE.min || valor > LIMITES_DA_ARTE.max;
    if (fora(escalaX) || fora(escalaY)) return lista;
    const escalaTamanho = (escalaX + escalaY) / 2;
    const arredondar = (valor) => Math.round(valor * 100) / 100;
    return lista.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const novo = { ...item };
      novo.x = arredondar(numero(item.x, 0) * escalaX);
      novo.y = arredondar(numero(item.y, 0) * escalaY);
      const largura = numero(item.width, 0);
      if (largura > 0) novo.width = arredondar(largura * escalaTamanho);
      const altura = numero(item.height, 0);
      if (altura > 0) novo.height = arredondar(altura * escalaTamanho);
      return novo;
    });
  }

  return {
    SOBRA_PASSEIO,
    FOLHA_DE_MENTIRINHA,
    LIMITES_DE_ESCALA,
    LIMITES_DA_CAPA,
    LIMITE_DA_REGUA,
    REGUA_MINIMA,
    LIMITES_DA_ARTE,
    caixaDaFolhaDe,
    normalizarMedida,
    reguaConfiavel,
    mudancaSoDeAltura,
    podeReancorar,
    podeArrumarCapa,
    escalaDaMedida,
    reguaDaCapa,
    enquadramento,
    caixaDoDesenho,
    tamanhoDe,
    encaixeNaFolha,
    arteNaRegua
  };
});
