(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieCalendarStyle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CHAVE = 'pooftie_calendar_style';
  const VERSAO = 2;

  const FUNDOS = ['nenhum', 'bolinhas', 'nuvens', 'coracoes', 'xadrez', 'listras', 'estrelinhas', 'papel', 'foto'];
  const QUADROS = ['grade', 'cartoes', 'redondos', 'limpos'];
  const FONTES = ['batang', 'nunito', 'patrick', 'caveat', 'gloria', 'indie', 'vt323'];
  const MINIS = ['nada', 'dia', 'semana', 'mesdia'];
  const PALETAS = ['romantica', 'terrosa', 'pastel', 'neutra'];

  const FAMILIAS = {
    batang: "'Gowun Batang', Georgia, 'Times New Roman', serif",
    nunito: "'Nunito', sans-serif",
    patrick: "'Patrick Hand', cursive",
    caveat: "'Caveat', cursive",
    gloria: "'Gloria Hallelujah', 'Patrick Hand', cursive",
    indie: "'Indie Flower', cursive",
    vt323: "'VT323', monospace"
  };

  const CORES_DAS_PALETAS = {
    romantica: ['#f9c8d7', '#b3aeab', '#e9d7bf', '#ef93ae'],
    terrosa: ['#edd6c3', '#e0bda6', '#f3e5d7', '#ccb3a1'],
    pastel: ['#d9ecf6', '#fbe0ee', '#e8f2d9', '#f8e8c3'],
    neutra: ['#eae5e2', '#dad2ce', '#f4f0ed', '#ccc4be']
  };

  const CORES_PADRAO = {
    fundoCor: '#ffffff',
    detalheCor: '#f9dbe5',
    celulaCor: '#ffffff',
    linhaCor: '#eee1e7',
    textoCor: '#2f2a2c',
    domingoCor: '#e8617e'
  };

  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const LIMITE_DA_FOTO = 300 * 1024;

  function expandirCor(curta) {
    return ('#' + curta[1] + curta[1] + curta[2] + curta[2] + curta[3] + curta[3]).toLowerCase();
  }

  function normalizarCor(valor, padrao) {
    const texto = String(valor == null ? '' : valor).trim();
    if (!HEX.test(texto)) return padrao;
    return texto.length === 4 ? expandirCor(texto) : texto.toLowerCase();
  }

  function comAlfa(cor, alfa) {
    const valor = Math.max(0, Math.min(1, Number(alfa)));
    const byte = Math.round(valor * 255).toString(16).padStart(2, '0');
    return `${normalizarCor(cor, '#ffffff')}${byte}`;
  }

  const escolha = (lista, valor, padrao) => (lista.includes(valor) ? valor : padrao);

  function ehFalso(valor) {
    return valor === false || valor === 0 || valor === '0' || valor === 'false' || valor === '';
  }
  const texto = (valor, padrao = '') => {
    const limpo = String(valor == null ? '' : valor).trim();
    return limpo || padrao;
  };

  function fotoValida(valor) {
    const src = String(valor == null ? '' : valor).trim();
    if (!src || src.length > LIMITE_DA_FOTO) return '';
    if (!/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(src)) return '';
    return src;
  }

  function padrao() {
    return {
      version: VERSAO,
      fundo: 'nenhum',
      fundoCor: CORES_PADRAO.fundoCor,
      detalheCor: CORES_PADRAO.detalheCor,
      quadros: 'grade',
      celulaCor: CORES_PADRAO.celulaCor,
      linhaCor: CORES_PADRAO.linhaCor,
      textoCor: CORES_PADRAO.textoCor,
      domingoCor: CORES_PADRAO.domingoCor,
      domingoVermelho: true,
      fonte: 'batang',
      mini: 'mesdia',
      paleta: 'romantica',
      foto: ''
    };
  }

  const TROCAS_DA_V1 = {
    fundo: ['nuvens', 'nenhum'],
    fundoCor: ['#fceaf1', CORES_PADRAO.fundoCor],
    detalheCor: ['#ffffff', CORES_PADRAO.detalheCor],
    celulaCor: ['#fffdfd', CORES_PADRAO.celulaCor],
    linhaCor: ['#f3dae3', CORES_PADRAO.linhaCor],
    textoCor: ['#3f3a38', CORES_PADRAO.textoCor],
    domingoCor: ['#e2687f', CORES_PADRAO.domingoCor],
    fonte: ['nunito', 'batang'],
    mini: ['nada', 'mesdia']
  };

  function migrar(entrada) {
    if (!entrada || typeof entrada !== 'object') return entrada;
    if (Number(entrada.version) >= VERSAO) return entrada;
    const novo = { ...entrada };
    Object.keys(TROCAS_DA_V1).forEach((chave) => {
      const [de, para] = TROCAS_DA_V1[chave];
      if (novo[chave] === de) novo[chave] = para;
    });
    return novo;
  }

  function normalizar(original) {
    const base = padrao();
    const entrada = migrar(original);
    if (!entrada || typeof entrada !== 'object') return base;
    const foto = fotoValida(entrada.foto);
    const fundo = escolha(FUNDOS, entrada.fundo, base.fundo);
    return {
      version: VERSAO,
      fundo: fundo === 'foto' && !foto ? base.fundo : fundo,
      fundoCor: normalizarCor(entrada.fundoCor, base.fundoCor),
      detalheCor: normalizarCor(entrada.detalheCor, base.detalheCor),
      quadros: escolha(QUADROS, entrada.quadros, base.quadros),
      celulaCor: normalizarCor(entrada.celulaCor, base.celulaCor),
      linhaCor: normalizarCor(entrada.linhaCor, base.linhaCor),
      textoCor: normalizarCor(entrada.textoCor, base.textoCor),
      domingoCor: normalizarCor(entrada.domingoCor, base.domingoCor),
      domingoVermelho: !ehFalso(entrada.domingoVermelho),
      fonte: escolha(FONTES, entrada.fonte, base.fonte),
      mini: escolha(MINIS, entrada.mini, base.mini),
      paleta: escolha(PALETAS, entrada.paleta, base.paleta),
      foto
    };
  }

  function ler(storage) {
    try {
      const cru = storage && storage.getItem(CHAVE);
      if (!cru) return padrao();
      return normalizar(JSON.parse(cru));
    } catch (erro) {
      return padrao();
    }
  }

  function guardar(storage, estilo) {
    try {
      if (!storage) return false;
      storage.setItem(CHAVE, JSON.stringify(normalizar(estilo)));
      return true;
    } catch (erro) {
      return false;
    }
  }

  function corDaTarefa(estilo, indice) {
    const paleta = CORES_DAS_PALETAS[(estilo && estilo.paleta) || 'romantica'] || CORES_DAS_PALETAS.romantica;
    const numero = Math.trunc(Number(indice) || 0);
    const posicao = ((numero % paleta.length) + paleta.length) % paleta.length;
    return paleta[posicao];
  }

  function coresDaPaleta(estilo) {
    return (CORES_DAS_PALETAS[(estilo && estilo.paleta) || 'romantica'] || CORES_DAS_PALETAS.romantica).slice();
  }

  function fundoCss(estilo) {
    const s = normalizar(estilo);
    const base = s.fundoCor;
    const det = s.detalheCor;
    const suave = comAlfa(det, 0.55);
    const fraco = comAlfa(det, 0.3);

    switch (s.fundo) {
      case 'bolinhas':
        return [
          `radial-gradient(circle, ${comAlfa(det, 0.75)} 1.5px, transparent 1.6px) 0 0 / 17px 17px`,
          `radial-gradient(circle, ${comAlfa(det, 0.45)} 2.2px, transparent 2.3px) 9px 9px / 34px 34px`,
          base
        ].join(', ');

      case 'nuvens':
        return [
          `radial-gradient(ellipse 26% 22% at 16% 22%, ${comAlfa(det, 0.85)} 0 55%, transparent 78%)`,
          `radial-gradient(ellipse 32% 26% at 82% 34%, ${comAlfa(det, 0.85)} 0 52%, transparent 76%)`,
          `radial-gradient(ellipse 28% 22% at 44% 66%, ${comAlfa(det, 0.5)} 0 55%, transparent 80%)`,
          `radial-gradient(ellipse 22% 18% at 94% 80%, ${comAlfa(det, 0.85)} 0 52%, transparent 76%)`,
          `radial-gradient(ellipse 30% 24% at 6% 92%, ${comAlfa(det, 0.5)} 0 55%, transparent 78%)`,
          base
        ].join(', ');

      case 'coracoes': {
        const coracao = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><path d='M13 22s-8-5.2-10.2-9.8C1 8.4 3.2 5 6.7 5c2.1 0 3.7 1.2 4.5 2.5C12 6.2 13.6 5 15.7 5c3.5 0 5.7 3.4 3.9 6.9C21 16.8 13 22 13 22z' fill='${comAlfa(det, 0.55)}'/></svg>`;
        return [`url("data:image/svg+xml,${encodeURIComponent(coracao)}") 0 0 / 26px 26px`, base].join(', ');
      }

      case 'xadrez':
        return [
          `repeating-linear-gradient(0deg, ${fraco} 0 7px, transparent 7px 14px)`,
          `repeating-linear-gradient(90deg, ${fraco} 0 7px, transparent 7px 14px)`,
          `repeating-linear-gradient(0deg, ${suave} 0 14px, transparent 14px 28px)`,
          `repeating-linear-gradient(90deg, ${suave} 0 14px, transparent 14px 28px)`,
          base
        ].join(', ');

      case 'listras':
        return [
          `repeating-linear-gradient(45deg, ${suave} 0 8px, transparent 8px 17px)`,
          base
        ].join(', ');

      case 'estrelinhas': {
        const estrela = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M12 3l1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6z' fill='${comAlfa(det, 0.6)}'/></svg>`;
        return [`url("data:image/svg+xml,${encodeURIComponent(estrela)}") 0 0 / 24px 24px`, base].join(', ');
      }

      case 'papel':
        return [
          `repeating-linear-gradient(0deg, ${fraco} 0 1px, transparent 1px 12px)`,
          `repeating-linear-gradient(90deg, ${fraco} 0 1px, transparent 1px 12px)`,
          base
        ].join(', ');

      case 'foto':
        if (!s.foto) return base;
        return [`url("${s.foto}") center / cover no-repeat`, base].join(', ');

      default:
        return base;
    }
  }

  function aplicar(elemento, estilo) {
    if (!elemento || !elemento.style || !elemento.dataset) return null;
    const s = normalizar(estilo);
    elemento.dataset.quadros = s.quadros;
    elemento.dataset.fonte = s.fonte;
    elemento.dataset.mini = s.mini;
    elemento.dataset.domingo = s.domingoVermelho ? 'sim' : 'nao';
    elemento.style.setProperty('--cal-fundo', fundoCss(s));
    elemento.style.setProperty('--cal-celula', comAlfa(s.celulaCor, 0.86));
    elemento.style.setProperty('--cal-celula-cheia', s.celulaCor);
    elemento.style.setProperty('--cal-linha', s.linhaCor);
    elemento.style.setProperty('--cal-texto', s.textoCor);
    elemento.style.setProperty('--cal-domingo-cor', s.domingoCor);
    elemento.style.setProperty('--cal-cabecalho', comAlfa(s.domingoCor, 0.075));
    elemento.style.setProperty('--cal-hoje', comAlfa(s.domingoCor, 0.1));
    elemento.style.setProperty('--cal-fonte', FAMILIAS[s.fonte] || FAMILIAS.batang);
    return s;
  }

  function linhasDaNota(nota) {
    return String(nota == null ? '' : nota)
      .split(/\r?\n/)
      .map((linha) => linha.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  function dataDeTexto(dateStr) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
    if (!partes) return null;
    const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function diaDoAno(data) {
    if (!data || Number.isNaN(data.getTime())) return 0;
    const inicio = Date.UTC(data.getFullYear(), 0, 1);
    const agora = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate());
    return Math.floor((agora - inicio) / 86400000) + 1;
  }

  function semanaDoAno(data) {
    if (!data || Number.isNaN(data.getTime())) return 0;
    const dia = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
    const diaDaSemana = dia.getUTCDay() || 7;
    dia.setUTCDate(dia.getUTCDate() + 4 - diaDaSemana);
    const inicio = Date.UTC(dia.getUTCFullYear(), 0, 1);
    return Math.ceil((((dia.getTime() - inicio) / 86400000) + 1) / 7);
  }

  function miniDoDia(dateStr, modo) {
    if (!MINIS.includes(modo) || modo === 'nada') return '';
    const data = dataDeTexto(dateStr);
    if (!data) return '';
    if (modo === 'dia') return String(diaDoAno(data));
    if (modo === 'semana') return String(semanaDoAno(data));
    return `${data.getMonth() + 1}.${data.getDate()}`;
  }

  return {
    CHAVE,
    VERSAO,
    FUNDOS,
    QUADROS,
    FONTES,
    MINIS,
    PALETAS,
    FAMILIAS,
    CORES_DAS_PALETAS,
    LIMITE_DA_FOTO,
    normalizarCor,
    comAlfa,
    padrao,
    normalizar,
    ler,
    guardar,
    corDaTarefa,
    coresDaPaleta,
    fundoCss,
    aplicar,
    linhasDaNota,
    dataDeTexto,
    diaDoAno,
    semanaDoAno,
    miniDoDia
  };
});
