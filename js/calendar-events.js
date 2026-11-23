/* ═════════════════════════════════════════════════════════════════
   ✧ OS EVENTOS DO CALENDÁRIO (os que atravessam vários dias) ✧
   ------------------------------------------------------------------
   Na agenda da foto, um evento pode começar num dia e terminar
   noutro: a barra colorida passa por cima dos quadradinhos, do
   jeitinho de "기말고사" (a prova) que pega três dias seguidos.

   Aqui moram as continhas purinhas (nada de DOM!):
     • guardar/ler os eventos do navegador (`pooftie_cal_events`);
     • deixar qualquer coisa que veio de fora redondinha e segura;
     • dizer quais eventos aparecem no dia / no mês;
     • e, o mais importante, MONTAR A GRADE: em qual "linha" cada
       barrinha cai em cada semana, sem uma encavalar na outra.

   Quem desenha é o app.js (as barrinhas são posicionadas por cima
   dos quadradinhos). Os testes ficam em test/calendar-events.test.mjs. ✧
   ═════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieCalendarEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CHAVE = 'pooftie_cal_events';
  const VERSAO = 1;
  const LIMITE_DO_TITULO = 60;
  const LIMITE_DA_LISTA = 400;

  // ✧ as cores das barrinhas (as mesmas da agenda coreana: rosinha clarinho
  // com letra escura, rosa forte com letra branca, cinzinha, areia…). As
  // escurinhas pedem letrinha branca; as clarinhas, letrinha marrom. ✧
  const CORES = ['#f9c8d7', '#ef93ae', '#b3aeab', '#e9d7bf', '#b9a8dd', '#93b8d8', '#f1e0a3'];
  const COR_PADRAO = CORES[0];

  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

  const lista = (valor) => (Array.isArray(valor) ? valor : []);
  const objeto = (valor) => (valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : null);

  function expandirCor(curta) {
    return ('#' + curta[1] + curta[1] + curta[2] + curta[2] + curta[3] + curta[3]).toLowerCase();
  }

  /** Uma cor em hexadecimal (#abc ou #aabbcc); o resto cai no rosinha. */
  function normalizarCor(valor) {
    const texto = String(valor == null ? '' : valor).trim();
    if (!HEX.test(texto)) return COR_PADRAO;
    return texto.length === 4 ? expandirCor(texto) : texto.toLowerCase();
  }

  /** A cor da letrinha em cima da barrinha (clara? escura; escura? clara). */
  function corDeTexto(cor) {
    const tratada = normalizarCor(cor);
    const r = parseInt(tratada.slice(1, 3), 16);
    const g = parseInt(tratada.slice(3, 5), 16);
    const b = parseInt(tratada.slice(5, 7), 16);
    // a continha da luminância (o olho humano vê o verde mais que o azul) ✧
    const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminancia > 0.72 ? '#4a3a34' : '#ffffff';
  }

  /** A data "YYYY-MM-DD" (de verdade, sem 2026-02-31). */
  function normalizarData(valor) {
    const texto = String(valor == null ? '' : valor).trim();
    const partes = DATA.exec(texto);
    if (!partes) return '';
    const ano = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
    const data = new Date(ano, mes - 1, dia);
    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return '';
    return texto;
  }

  /** A data de texto em Date (no fuso de casa, sem susto de virada). */
  function dataDeTexto(iso) {
    const partes = DATA.exec(String(iso || ''));
    if (!partes) return null;
    const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  /** O mesmo "YYYY-MM-DD", `n` dias depois (ou antes, com n negativo). */
  function somarDias(iso, n) {
    const data = dataDeTexto(normalizarData(iso));
    if (!data) return '';
    data.setDate(data.getDate() + Math.trunc(Number(n) || 0));
    return chaveDaData(data);
  }

  /** "YYYY-MM-DD" de um Date (sem passar pelo UTC, que vira o dia à noite). */
  function chaveDaData(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

  /** Um "nome" só pro evento (não precisa ser bonito, só não repetir). */
  function idNovo() {
    const sorte = Math.random().toString(36).slice(2, 8);
    return `ev-${Date.now().toString(36)}-${sorte}`;
  }

  /** Deixa um evento torto num evento redondinho (ou null, se não dá). */
  function normalizarEvento(entrada) {
    const cru = objeto(entrada);
    if (!cru) return null;
    const titulo = String(cru.titulo ?? cru.title ?? cru.texto ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, LIMITE_DO_TITULO);
    if (!titulo) return null;
    const inicio = normalizarData(cru.inicio ?? cru.start ?? cru.data);
    if (!inicio) return null;
    let fim = normalizarData(cru.fim ?? cru.end) || inicio;
    if (fim < inicio) fim = inicio;
    return {
      id: String(cru.id || '').trim().slice(0, 40) || idNovo(),
      titulo,
      inicio,
      fim,
      cor: normalizarCor(cru.cor ?? cru.color),
      criado: Number(cru.criado) || Date.now()
    };
  }

  /** A listinha inteira, sem repetir id e sem passar do teto. */
  function normalizarLista(entrada) {
    const vistos = new Set();
    const eventos = [];
    for (const item of lista(entrada)) {
      const evento = normalizarEvento(item);
      if (!evento) continue;
      if (vistos.has(evento.id)) evento.id = idNovo();
      vistos.add(evento.id);
      eventos.push(evento);
      if (eventos.length >= LIMITE_DA_LISTA) break;
    }
    return eventos;
  }

  function ler(storage) {
    try {
      const cru = storage && storage.getItem(CHAVE);
      if (!cru) return [];
      return normalizarLista(JSON.parse(cru));
    } catch (erro) {
      return [];
    }
  }

  function guardar(storage, eventos) {
    try {
      if (!storage) return false;
      storage.setItem(CHAVE, JSON.stringify(normalizarLista(eventos)));
      return true;
    } catch (erro) {
      return false;
    }
  }

  /** Um evento novinho (o app só chama depois de validar o formulário). */
  function criar({ titulo, inicio, fim, cor } = {}) {
    return normalizarEvento({
      titulo,
      inicio,
      fim: fim || inicio,
      cor: cor || COR_PADRAO,
      id: idNovo()
    });
  }

  /** A lista com o evento entrando no fim (e sem encher demais). */
  function comEvento(listaAtual, evento) {
    const novo = normalizarEvento(evento);
    const base = normalizarLista(listaAtual).filter((item) => !novo || item.id !== novo.id);
    if (!novo) return base;
    return normalizarLista([...base, novo]);
  }

  function semEvento(listaAtual, id) {
    const alvo = String(id || '');
    return normalizarLista(listaAtual).filter((evento) => evento.id !== alvo);
  }

  /**
   * Os eventos que encostam no intervalo [inicio, fim] (as datas em texto
   * comparam certinho, porque são sempre "YYYY-MM-DD").
   */
  function eventosNoIntervalo(eventos, inicio, fim) {
    const de = normalizarData(inicio);
    const ate = normalizarData(fim);
    if (!de || !ate) return [];
    return normalizarLista(eventos).filter((evento) => evento.inicio <= ate && evento.fim >= de);
  }

  /** Os eventos que passam por esse dia (inclusive os de vários dias). */
  function eventosDoDia(eventos, dia) {
    const alvo = normalizarData(dia);
    if (!alvo) return [];
    return normalizarLista(eventos).filter((evento) => evento.inicio <= alvo && evento.fim >= alvo);
  }

  /**
   * ✧ A GRADE ✧
   * Recebe os dias visíveis (7 por semana, em ordem) e as faixas que vão
   * ser desenhadas — os eventos de vários dias E as tarefinhas de um dia
   * só (cada uma é uma faixa de um quadradinho). Devolve, pra cada semana:
   *   • `totalFaixas` — quantas "linhas" de barrinha aquela semana usa
   *     (é com isso que o quadradinho cresce pra caber tudo);
   *   • `celulas` — pra cada dia, as barrinhas que passam por ele, com a
   *     linha (`lane`), a cor e se a barrinha começa/termina/continua.
   */
  function montarGrade({ dias, faixas } = {}) {
    const datas = lista(dias).map(normalizarData);
    const barras = lista(faixas)
      .map((faixa) => {
        const inicio = normalizarData(faixa && faixa.inicio);
        const fim = normalizarData(faixa && faixa.fim) || inicio;
        if (!inicio || !fim || fim < inicio) return null;
        return {
          id: String(faixa.id || ''),
          titulo: String(faixa.titulo == null ? '' : faixa.titulo),
          cor: normalizarCor(faixa.cor),
          textoCor: faixa.textoCor || corDeTexto(faixa.cor),
          tipo: faixa.tipo === 'evento' ? 'evento' : 'tarefa',
          idEvento: faixa.idEvento ? String(faixa.idEvento) : '',
          // a ordem em que a pessoa escreveu (as tarefinhas ficam na ordem
          // das linhas, sem embaralhar) ✧
          ordem: Number(faixa.ordem) || 0,
          inicio,
          fim
        };
      })
      .filter(Boolean);

    const semanas = [];
    for (let base = 0; base + 6 < datas.length; base += 7) {
      const diasDaSemana = datas.slice(base, base + 7);
      const primeiro = diasDaSemana[0];
      const ultimo = diasDaSemana[6];
      const daSemana = barras
        .filter((barra) => barra.inicio <= ultimo && barra.fim >= primeiro)
        .map((barra) => {
          const deAntes = barra.inicio < primeiro;
          const vaiDepois = barra.fim > ultimo;
          const achaInicio = diasDaSemana.indexOf(barra.inicio);
          const achaFim = diasDaSemana.indexOf(barra.fim);
          const colInicio = deAntes ? 0 : Math.max(0, achaInicio);
          const colFim = vaiDepois ? 6 : Math.min(6, achaFim < 0 ? 6 : achaFim);
          return { ...barra, deAntes, vaiDepois, colInicio, colFim };
        })
        .filter((barra) => barra.colInicio <= barra.colFim)
        // quem começa antes vai em cima; quem é mais comprido também; e,
        // no empate, a ordem em que a pessoa escreveu ✧
        .sort((a, b) => (
          a.colInicio - b.colInicio
          || (b.colFim - b.colInicio) - (a.colFim - a.colInicio)
          || a.ordem - b.ordem
          || a.titulo.localeCompare(b.titulo)
        ));

      const ocupadas = Array.from({ length: 7 }, () => []);
      const celulas = Array.from({ length: 7 }, () => []);
      let totalFaixas = 0;

      for (const barra of daSemana) {
        let linha = 0;
        while (true) {
          let encavalada = false;
          for (let coluna = barra.colInicio; coluna <= barra.colFim; coluna += 1) {
            if (ocupadas[linha] && ocupadas[linha][coluna]) { encavalada = true; break; }
          }
          if (!encavalada) break;
          linha += 1;
        }
        for (let coluna = barra.colInicio; coluna <= barra.colFim; coluna += 1) {
          if (!ocupadas[linha]) ocupadas[linha] = [];
          ocupadas[linha][coluna] = true;
        }
        totalFaixas = Math.max(totalFaixas, linha + 1);
        for (let coluna = barra.colInicio; coluna <= barra.colFim; coluna += 1) {
          celulas[coluna].push({
            id: barra.id,
            idEvento: barra.idEvento,
            titulo: barra.titulo,
            cor: barra.cor,
            textoCor: barra.textoCor,
            tipo: barra.tipo,
            inicio: barra.inicio,
            fim: barra.fim,
            lane: linha + 1,
            // a letrinha aparece só no pedacinho em que a barrinha COMEÇA
            // (é uma linha só, do começo ao fim; nas semanas seguintes a
            // barrinha continua sem repetir o nome) ✧
            mostrarTitulo: coluna === barra.colInicio && !barra.deAntes,
            comecaAqui: coluna === barra.colInicio && !barra.deAntes,
            terminaAqui: coluna === barra.colFim && !barra.vaiDepois,
            deAntes: barra.deAntes,
            vaiDepois: barra.vaiDepois
          });
        }
      }

      semanas.push({ totalFaixas, celulas });
    }
    return { semanas };
  }

  return {
    CHAVE,
    VERSAO,
    LIMITE_DO_TITULO,
    LIMITE_DA_LISTA,
    CORES,
    COR_PADRAO,
    normalizarCor,
    corDeTexto,
    normalizarData,
    dataDeTexto,
    chaveDaData,
    somarDias,
    idNovo,
    normalizarEvento,
    normalizarLista,
    ler,
    guardar,
    criar,
    comEvento,
    semEvento,
    eventosNoIntervalo,
    eventosDoDia,
    montarGrade
  };
});
