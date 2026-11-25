(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieBackup = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const APP = 'crechezinha-diary';

  const CHAVE_ENTRIES = 'pooftie_entries';
  const CHAVE_TODOS = 'pooftie_todos';
  const CHAVE_NOTAS = 'pooftie_cal_notes';
  const CHAVE_REACOES = 'pooftie_cal_reactions';

  const lista = (valor) => (Array.isArray(valor) ? valor : []);
  const objeto = (valor) => (
    valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : null
  );
  const ehData = (valor) => /^\d{4}-\d{2}-\d{2}/.test(String(valor || ''));
  const dia = (valor) => String(valor || '').slice(0, 10);
  const vazio = (valor) => valor === null || valor === undefined
    || valor === ''
    || (Array.isArray(valor) && !valor.length);

  function erro(motivo, recado) {
    const problema = new Error(recado);
    problema.motivo = motivo;
    return problema;
  }

  function pacoteVazio() {
    return {
      entries: [],
      todos: [],
      days: [],
      settings: null,
      veioDe: 'arquivo',
      exportadoEm: null,
      usuario: ''
    };
  }


  function normalizarMemoria(item) {
    const cru = objeto(item);
    if (!cru) return null;
    const date = dia(cru.date || cru.data);
    if (!ehData(date)) return null;
    return { ...cru, date };
  }

  function normalizarTarefa(item) {
    const cru = objeto(item);
    if (!cru) return null;
    const texto = String(cru.text ?? cru.titulo ?? cru.nome ?? '').trim();
    if (!texto) return null;
    return { text: texto, checked: Boolean(cru.checked ?? cru.done ?? cru.feito) };
  }

  function normalizarDia(item) {
    const cru = objeto(item);
    if (!cru) return null;
    const date = dia(cru.date || cru.data);
    if (!ehData(date)) return null;
    const nota = cru.note ?? cru.nota ?? null;
    const reacao = cru.reaction ?? cru.reacao ?? null;
    return {
      date,
      note: vazio(nota) ? null : String(nota),
      reaction: vazio(reacao) ? null : String(reacao)
    };
  }

  function diasDe(calendario, dias) {
    const cru = objeto(calendario) || {};
    const diretos = Array.isArray(dias) ? dias : lista(cru.days);
    if (diretos.length) return diretos;
    const notas = objeto(cru.notes) || {};
    const reacoes = objeto(cru.reactions) || {};
    const datas = [...new Set([...Object.keys(notas), ...Object.keys(reacoes)])];
    return datas.map((date) => ({
      date,
      note: notas[date] ?? null,
      reaction: reacoes[date] ?? null
    }));
  }

  function ler(texto) {
    let dado;
    try {
      const cru = String(texto === null || texto === undefined ? '' : texto).trim();
      if (!cru) throw new Error('vazio');
      dado = JSON.parse(cru);
    } catch (problema) {
      throw erro('sem-json', 'esse arquivo não é um backup do diário (não consegui ler ele) 🌧️');
    }
    if (!dado || typeof dado !== 'object') {
      throw erro('sem-json', 'esse arquivo não é um backup do diário (não consegui ler ele) 🌧️');
    }

    const pacote = pacoteVazio();

    if (Array.isArray(dado)) {
      pacote.entries = dado;
      pacote.veioDe = 'lista';
    } else if (Array.isArray(dado[CHAVE_ENTRIES])) {
      pacote.entries = dado[CHAVE_ENTRIES];
      pacote.todos = lista(dado[CHAVE_TODOS]);
      pacote.days = diasDe({ notes: dado[CHAVE_NOTAS], reactions: dado[CHAVE_REACOES] }, null);
      pacote.veioDe = 'navegador';
    } else if (Array.isArray(dado.entries) || dado.calendar || Array.isArray(dado.days)) {
      pacote.entries = lista(dado.entries);
      pacote.todos = lista(dado.todos);
      pacote.days = diasDe(dado.calendar, dado.days);
      pacote.settings = objeto(dado.settings);
      pacote.veioDe = dado.app === APP ? 'backup' : 'arquivo';
      pacote.exportadoEm = dado.exportedAt || null;
      pacote.usuario = String(dado.user || '');
    } else {
      throw erro('sem-memorias', 'não achei nenhuma memória nesse arquivo... ele é o "Backup (.json)" da nuvem? 🌸');
    }

    pacote.entries = pacote.entries.map(normalizarMemoria).filter(Boolean);
    pacote.todos = pacote.todos.map(normalizarTarefa).filter(Boolean);
    pacote.days = pacote.days.map(normalizarDia).filter(Boolean);

    if (!pacote.entries.length && !pacote.todos.length && !pacote.days.length) {
      throw erro('vazio', 'o arquivo não tem memória, nem tarefinha, nem recadinho do calendário 🌸');
    }
    return pacote;
  }

  function contar(pacote) {
    const p = objeto(pacote) || pacoteVazio();
    return {
      memorias: lista(p.entries).length,
      tarefas: lista(p.todos).length,
      dias: lista(p.days).length
    };
  }


  function ordenar(itens) {
    const porDia = new Map();
    for (const item of lista(itens)) {
      if (!item || !item.date) continue;
      const chave = String(item.date);
      if (!porDia.has(chave)) porDia.set(chave, item);
    }
    return [...porDia.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function semVazios(valor) {
    const cru = objeto(valor);
    if (!cru) return {};
    return Object.fromEntries(Object.entries(cru).filter(([, v]) => !vazio(v)));
  }

  function juntar(local, pacote, opcoes = {}) {
    const trocar = opcoes.trocar === true;
    const jaTem = objeto(local) || {};
    const veio = objeto(pacote) || pacoteVazio();

    const locais = lista(jaTem.entries).map(normalizarMemoria).filter(Boolean);
    const importadas = lista(veio.entries).map(normalizarMemoria).filter(Boolean);
    const datasLocais = new Set(locais.map((item) => String(item.date)));
    const soDoArquivo = importadas.filter((item) => !datasLocais.has(String(item.date)));
    const entries = ordenar(trocar ? importadas : [...locais, ...soDoArquivo]);

    const chaveDaTarefa = (item) => String(item && item.text || '').trim().toLowerCase();
    const tarefasLocais = lista(jaTem.todos).map(normalizarTarefa).filter(Boolean);
    const tarefasDoArquivo = lista(veio.todos).map(normalizarTarefa).filter(Boolean);
    const jaTinha = new Set(tarefasLocais.map(chaveDaTarefa));
    const tarefasNovas = tarefasDoArquivo.filter((item) => !jaTinha.has(chaveDaTarefa(item)));
    const todos = trocar ? tarefasDoArquivo : [...tarefasLocais, ...tarefasNovas];

    const notes = trocar ? {} : { ...(objeto(jaTem.notes) || {}) };
    const reactions = trocar ? {} : { ...(objeto(jaTem.reactions) || {}) };
    let dias = 0;
    for (const item of lista(veio.days).map(normalizarDia).filter(Boolean)) {
      const antesNota = notes[item.date] || null;
      const antesReacao = reactions[item.date] || null;
      if (!trocar && (antesNota || antesReacao)) continue;
      if (item.note) notes[item.date] = item.note; else delete notes[item.date];
      if (item.reaction) reactions[item.date] = item.reaction; else delete reactions[item.date];
      if ((notes[item.date] || null) !== antesNota || (reactions[item.date] || null) !== antesReacao) {
        dias += 1;
      }
    }

    const capaDoArquivo = objeto((veio.settings || {}).coverData);
    const capaDaqui = objeto(jaTem.coverData);
    let coverData = capaDaqui;
    if (capaDoArquivo) {
      coverData = trocar ? capaDoArquivo : { ...capaDoArquivo, ...semVazios(capaDaqui) };
    }

    const papelDoArquivo = (veio.settings && veio.settings.paperPattern)
      ? String(veio.settings.paperPattern) : null;
    const fonteDoArquivo = (veio.settings && veio.settings.font)
      ? String(veio.settings.font) : null;
    const papel = trocar ? papelDoArquivo : (jaTem.papel || papelDoArquivo);
    const fonte = trocar ? fonteDoArquivo : (jaTem.fonte || fonteDoArquivo);

    const contas = {
      trocou: trocar,
      entraram: soDoArquivo.length,
      tarefas: trocar ? tarefasDoArquivo.length : tarefasNovas.length,
      dias,
      memorias: entries.length
    };

    return { entries, todos, notes, reactions, coverData, papel, fonte, contas };
  }

  function recado(contas) {
    const c = objeto(contas) || {};
    const plural = (n, um, muitos) => `${n} ${n === 1 ? um : muitos}`;
    const partes = [];
    if (c.trocou) {
      partes.push(plural(Number(c.memorias) || 0, 'memória', 'memórias'));
    } else if (c.entraram) {
      partes.push(`${plural(Number(c.entraram) || 0, 'memória', 'memórias')} de volta`);
    }
    if (c.tarefas) partes.push(plural(Number(c.tarefas) || 0, 'tarefinha', 'tarefinhas'));
    if (c.dias) partes.push(plural(Number(c.dias) || 0, 'dia', 'dias') + ' do calendário');

    if (!partes.length) {
      return c.trocou
        ? '📥 o diário agora é o do arquivo ✧'
        : '✧ o arquivo já estava aqui inteirinho — não tinha nada de novo pra trazer';
    }
    return `${c.trocou ? '📥 trocado pelo arquivo:' : '📥'} ${partes.join(' + ')} ✧`;
  }

  return {
    APP,
    CHAVE_ENTRIES,
    CHAVE_TODOS,
    CHAVE_NOTAS,
    CHAVE_REACOES,
    pacoteVazio,
    ler,
    contar,
    juntar,
    ordenar,
    recado
  };
});
