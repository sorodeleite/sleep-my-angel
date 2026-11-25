(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieEntryStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CHAVE = 'pooftie_entries';
  const CHAVE_RASCUNHO = 'pooftie_draft';
  const CHAVE_DIARIOS = 'pooftie_diaries';
  const CHAVE_DIARIO_ATIVO = 'pooftie_active_diary';

  const PADROES = ['lines', 'dots', 'grid', 'blank', 'spiral'];
  const padraoValido = (valor) => (PADROES.includes(valor) ? valor : 'lines');

  const ordemValida = (valor) => {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.trunc(numero) : null;
  };

  let contadorDeIds = 0;

  function novoIdPagina(date) {
    contadorDeIds += 1;
    return `pag-${Date.now().toString(36)}-${contadorDeIds.toString(36)}-${String(date || '').slice(5)}`;
  }

  function normalizarCorDaPagina(valor) {
    if (!valor || typeof valor !== 'object') return null;
    const cor = String(valor.paperColor || '').trim();
    const corDaBolinha = String(valor.dotColor || '').trim();
    const bolinhas = String(valor.dots || '').trim();
    if (!cor && !corDaBolinha && !bolinhas) return null;
    return {
      paperColor: cor,
      dotColor: corDaBolinha,
      dots: bolinhas
    };
  }

  function normalizarLetraDaPagina(valor) {
    if (!valor || typeof valor !== 'object') return null;
    const cor = String(valor.color || '').trim();
    const corDaBordinha = String(valor.outlineColor || '').trim();
    const bordinha = valor.outline === true;
    if (!cor && !corDaBordinha && valor.outline === undefined) return null;
    return {
      color: cor,
      outline: bordinha,
      outlineColor: corDaBordinha
    };
  }

  function normalizarMedidaDaPagina(valor) {
    if (!valor || typeof valor !== 'object') return null;
    const largura = Number(valor.width);
    const altura = Number(valor.height);
    if (!Number.isFinite(largura) || !Number.isFinite(altura)) return null;
    if (largura <= 0 || altura <= 0) return null;
    return { width: largura, height: altura };
  }

  function normalizarPagina(page, { date, index = 0 } = {}) {
    if (!page || typeof page !== 'object') return null;
    const dia = String((page.date || date || ''));
    const ordem = ordemValida(page.ordem);
    const letterFrom = String(page.letterFrom || '').trim().slice(0, 32) || null;
    const letterArt = /^letter([1-9]|1[0-5])$/.test(String(page.letterArt || '').trim())
      ? String(page.letterArt).trim()
      : null;
    return {
      id: String(page.id || '').trim() || `pag-${dia || 'sem-dia'}-${index + 1}`,
      ...(ordem !== null ? { ordem } : {}),
      title: page.title == null ? '' : String(page.title),
      body: page.body == null ? '' : String(page.body),
      pattern: padraoValido(page.pattern),
      diaryStyle: normalizarCorDaPagina(page.diaryStyle),
      textStyle: normalizarLetraDaPagina(page.textStyle),
      medida: normalizarMedidaDaPagina(page.medida),
      textSpans: Array.isArray(page.textSpans) ? page.textSpans : [],
      stickers: Array.isArray(page.stickers) ? page.stickers : [],
      texts: Array.isArray(page.texts) ? page.texts : [],
      ...(letterFrom ? { letterFrom } : {}),
      ...(letterFrom && letterArt ? { letterArt } : {}),
      createdAt: page.createdAt || null,
      updatedAt: page.updatedAt || null
    };
  }

  function normalizarEntrada(entry) {
    if (!entry || !entry.date) return null;
    const date = String(entry.date);

    let paginas = Array.isArray(entry.pages)
      ? entry.pages.map((pagina, index) => normalizarPagina(pagina, { date, index })).filter(Boolean)
      : [];

    if (!paginas.length) {
      const titulo = entry.title && entry.title !== 'Sem título ୨୧' ? entry.title : '';
      paginas = [normalizarPagina({
        id: entry.pageId || `pag-${date}-1`,
        title: titulo,
        body: entry.body || '',
        pattern: entry.pattern,
        textSpans: entry.textSpans,
        stickers: entry.stickers,
        texts: entry.texts,
        diaryStyle: entry.diaryStyle,
        textStyle: entry.textStyle,
        medida: entry.medida
      }, { date, index: 0 })];
    }

    const primeira = paginas[0];
    return {
      ...entry,
      id: entry.id || date,
      date,
      title: primeira.title || entry.title || 'Sem título ୨୧',
      body: primeira.body || '',
      textSpans: primeira.textSpans,
      stickers: primeira.stickers,
      texts: primeira.texts,
      pattern: primeira.pattern,
      medida: primeira.medida || normalizarMedidaDaPagina(entry.medida),
      pages: paginas
    };
  }

  const PESO_DO_ESPELHO = 32 * 1024;

  function pesoDoJson(valor) {
    try {
      return JSON.stringify(valor === undefined ? null : valor).length * 2;
    } catch (erro) {
      return Infinity;
    }
  }

  function paraGuardar(entrada) {
    if (!entrada || !Array.isArray(entrada.pages) || !entrada.pages.length) return entrada;
    const espelho = {
      title: entrada.title,
      body: entrada.body,
      stickers: entrada.stickers,
      texts: entrada.texts,
      textSpans: entrada.textSpans,
      pattern: entrada.pattern,
      medida: entrada.medida
    };
    if (pesoDoJson(espelho) < PESO_DO_ESPELHO) return entrada;
    const enxuta = { ...entrada };
    delete enxuta.title;
    delete enxuta.body;
    delete enxuta.stickers;
    delete enxuta.texts;
    delete enxuta.textSpans;
    delete enxuta.pattern;
    delete enxuta.medida;
    return enxuta;
  }

  function ordenar(lista) {
    return [...(Array.isArray(lista) ? lista : [])]
      .filter((entry) => entry && entry.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  const memoriasLidas = new WeakMap();

  function ler(storage) {
    let cru = null;
    try {
      cru = storage.getItem(CHAVE);
      if (!cru) {
        memoriasLidas.delete(storage);
        return [];
      }
      const lembrada = memoriasLidas.get(storage);
      if (lembrada && lembrada.cru === cru) return lembrada.lista.slice();

      const lista = JSON.parse(cru);
      const normalizada = Array.isArray(lista)
        ? lista.map((item) => normalizarEntrada(item) || item)
        : [];
      memoriasLidas.set(storage, { cru, lista: normalizada });
      return normalizada.slice();
    } catch (error) {
      memoriasLidas.delete(storage);
      return [];
    }
  }

  const ehErroDeQuota = (error) => /quota|exceeded|full/i.test(
    String(error && error.name) + String(error && error.message)
  );

  const ehPromessa = (valor) => Boolean(valor) && typeof valor.then === 'function';

  function gravar(storage, lista, opcoes = {}) {
    const ordenada = ordenar(lista);
    const textoDe = (alvo) => JSON.stringify(ordenar(alvo).map(paraGuardar));
    const tentar = (alvo) => {
      try {
        storage.setItem(CHAVE, textoDe(alvo));
        return { ok: true, motivo: null };
      } catch (error) {
        return {
          ok: false,
          motivo: ehErroDeQuota(error) ? 'quota' : 'storage',
          erro: error
        };
      }
    };

    const primeira = tentar(ordenada);
    if (primeira.ok || primeira.motivo !== 'quota') {
      return Promise.resolve({ ...primeira, enxugou: false, lista: ordenada });
    }

    const enxugar = typeof opcoes.aoPrecisarDeEspaco === 'function' ? opcoes.aoPrecisarDeEspaco : null;
    if (!enxugar) return Promise.resolve({ ...primeira, enxugou: false, lista: ordenada });

    const comAListaEnxuta = (enxuta) => {
      const listaEnxuta = enxuta && Array.isArray(enxuta.lista) ? enxuta.lista : null;
      if (!listaEnxuta) return { ...primeira, enxugou: false, lista: ordenada };
      const segunda = tentar(listaEnxuta);
      if (segunda.ok) return { ...segunda, enxugou: true, lista: ordenar(listaEnxuta) };
      return { ...segunda, enxugou: false, lista: ordenada };
    };

    let enxuta = null;
    try {
      enxuta = enxugar(ordenada);
    } catch (erro) {
      enxuta = null;
    }
    if (ehPromessa(enxuta)) {
      return enxuta
        .then((resolvida) => comAListaEnxuta(resolvida))
        .catch(() => ({ ...primeira, enxugou: false, lista: ordenada }));
    }
    return Promise.resolve(comAListaEnxuta(enxuta));
  }

  function gravarSincrono(storage, lista) {
    try {
      const ordenada = ordenar(lista);
      storage.setItem(CHAVE, JSON.stringify(ordenada.map(paraGuardar)));
      return { ok: true, motivo: null, enxugou: false, lista: ordenada };
    } catch (error) {
      return {
        ok: false,
        motivo: ehErroDeQuota(error) ? 'quota' : 'storage',
        erro: error,
        enxugou: false,
        lista: ordenar(lista)
      };
    }
  }

  function salvar(storage, entry, opcoes = {}) {
    const nova = normalizarEntrada(entry);
    if (!nova) return Promise.resolve({ ok: false, motivo: 'sem-data', lista: ler(storage), entry: null });

    const atuais = ler(storage);
    const semEla = atuais.filter((item) => item && item.date !== nova.date);
    const lista = ordenar([nova, ...semEla]);
    return gravar(storage, lista, opcoes).then((resultado) => ({ ...resultado, lista, entry: nova }));
  }

  function salvarPagina(storage, date, pagina, opcoes = {}) {
    const dia = String(date || (pagina && pagina.date) || '');
    if (!dia) return Promise.resolve({ ok: false, motivo: 'sem-data', lista: ler(storage), entry: null, page: null });

    const nova = normalizarPagina(pagina, { date: dia, index: 0 });
    if (!nova) return Promise.resolve({ ok: false, motivo: 'sem-pagina', lista: ler(storage), entry: null, page: null });

    const atuais = ler(storage);
    const anterior = atuais.find((item) => item && item.date === dia) || null;
    const entrada = anterior
      ? normalizarEntrada(anterior)
      : { id: dia, date: dia, title: '', body: '', textSpans: [], stickers: [], pattern: 'lines', pages: [] };
    const posicao = entrada.pages.findIndex((item) => item.id === nova.id);

    if (posicao < 0 && ordemValida(nova.ordem) === null) {
      const maiorOrdem = atuais.reduce((maior, item) => (item.pages || [])
        .reduce((m, pagina) => {
          const valor = ordemValida(pagina.ordem);
          return valor === null ? m : Math.max(m, valor);
        }, maior), -1);
      if (maiorOrdem >= 0) nova.ordem = maiorOrdem + 1;
    }

    const paginas = posicao >= 0
      ? entrada.pages.map((item, index) => (index === posicao
        ? { ...item, ...nova, createdAt: item.createdAt || nova.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
        : item))
      : [...entrada.pages, { ...nova, createdAt: nova.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }];

    const salva = normalizarEntrada({ ...entrada, pages: paginas });
    const semEla = atuais.filter((item) => item && item.date !== dia);
    return gravar(storage, ordenar([salva, ...semEla]), opcoes).then((resultado) => {
      const listaFinal = resultado.lista || ordenar([salva, ...semEla]);
      if (resultado.enxugou && resultado.lista) {
        const entradaEnxuta = listaFinal.find((item) => item && item.date === dia) || salva;
        return {
          ...resultado,
          lista: listaFinal,
          entry: entradaEnxuta,
          page: (entradaEnxuta.pages || [])[posicao >= 0 ? posicao : (entradaEnxuta.pages || []).length - 1] || null
        };
      }
      return {
        ...resultado,
        lista: listaFinal,
        entry: salva,
        page: salva.pages[posicao >= 0 ? posicao : salva.pages.length - 1]
      };
    });
  }


  function ehImagemGuardada(valor) {
    return typeof valor === 'string' && /^data:image\//i.test(valor);
  }

  function pesoDoDataUrl(valor) {
    const texto = String(valor || '');
    const virgula = texto.indexOf(',');
    if (virgula < 0) return 0;
    const corpo = texto.length - virgula - 1;
    return Math.round((corpo * 3) / 4);
  }

  function enxugarImagens(lista, reduzir, opcoes = {}) {
    const limite = Math.max(1024, Number(opcoes.pesoMinimo) || 24 * 1024);
    let antes = 0;
    let depois = 0;
    let trocadas = 0;
    let assincrono = false;

    const encolher = (src) => {
      if (!ehImagemGuardada(src)) return src;
      const peso = pesoDoDataUrl(src);
      antes += peso;
      if (peso < limite) {
        depois += peso;
        return src;
      }
      let novo = null;
      try {
        novo = reduzir ? reduzir(src) : null;
      } catch (erro) {
        novo = null;
      }
      if (ehPromessa(novo)) {
        return novo
          .catch(() => null)
          .then((resolvido) => {
            if (ehImagemGuardada(resolvido) && pesoDoDataUrl(resolvido) < peso) {
              trocadas += 1;
              depois += pesoDoDataUrl(resolvido);
              return resolvido;
            }
            depois += peso;
            return src;
          });
      }
      if (ehImagemGuardada(novo) && pesoDoDataUrl(novo) < peso) {
        trocadas += 1;
        depois += pesoDoDataUrl(novo);
        return novo;
      }
      depois += peso;
      return src;
    };

    const encolherStickers = (stickers) => {
      if (!Array.isArray(stickers)) return { stickers, assincrono: false };
      let assincrono = false;
      const novos = stickers.map((sticker) => {
        if (!sticker) return sticker;
        if (ehImagemGuardada(sticker.src)) {
          const src = encolher(sticker.src);
          if (ehPromessa(src)) assincrono = true;
          return { ...sticker, src };
        }
        if (ehImagemGuardada(sticker.content)) {
          const content = encolher(sticker.content);
          if (ehPromessa(content)) assincrono = true;
          return { ...sticker, content };
        }
        return sticker;
      });
      if (!assincrono) return { stickers: novos, assincrono: false };
      return {
        assincrono: true,
        stickers: Promise.all(novos.map(async (item) => {
          if (!item || (!ehPromessa(item.src) && !ehPromessa(item.content))) return item;
          return {
            ...item,
            src: ehPromessa(item.src) ? await item.src : item.src,
            content: ehPromessa(item.content) ? await item.content : item.content
          };
        }))
      };
    };

    const listaEnxuta = (Array.isArray(lista) ? lista : []).map((entrada) => {
      if (!entrada || !Array.isArray(entrada.pages)) return entrada;
      const pages = entrada.pages.map((pagina) => {
        if (!pagina) return pagina;
        if (!Array.isArray(pagina.stickers)) return pagina;
        const resultado = encolherStickers(pagina.stickers);
        if (resultado.assincrono) assincrono = true;
        return { ...pagina, stickers: resultado.stickers };
      });
      const doEspelho = encolherStickers(entrada.stickers);
      if (doEspelho.assincrono) assincrono = true;
      return {
        ...entrada,
        pages,
        stickers: doEspelho.stickers
      };
    });

    if (!assincrono) return { lista: listaEnxuta, antes, depois, trocadas };
    const comAsImagens = (entrada) => {
      if (!entrada || !Array.isArray(entrada.pages)) return Promise.resolve(entrada);
      const pages = entrada.pages.map((pagina) => (
        pagina && ehPromessa(pagina.stickers)
          ? pagina.stickers.then((prontos) => ({ ...pagina, stickers: prontos }))
          : pagina
      ));
      const espelho = ehPromessa(entrada.stickers)
        ? entrada.stickers
        : Promise.resolve(entrada.stickers);
      return Promise.all([Promise.all(pages), espelho]).then(([paginas, stickers]) => ({
        ...entrada,
        pages: paginas,
        stickers
      }));
    };
    return Promise.all(listaEnxuta.map(comAsImagens))
      .then((listaPronta) => ({ lista: listaPronta, antes, depois, trocadas }));
  }

  function enxugarDiario(lista, reduzir, opcoes = {}) {
    const resultado = enxugarImagens(lista, reduzir, opcoes);
    if (ehPromessa(resultado)) {
      return resultado.then((resolvido) => (resolvido.trocadas ? resolvido : null));
    }
    if (!resultado.trocadas) return null;
    return resultado;
  }

  function enxugarCapa(adesivos, capa, reduzir, opcoes = {}) {
    const limite = Math.max(1024, Number(opcoes.pesoMinimo) || 24 * 1024);
    let assincrono = false;
    const encolherUm = (valor) => {
      if (!ehImagemGuardada(valor)) return valor;
      if (pesoDoDataUrl(valor) < limite) return valor;
      let novo = null;
      try {
        novo = reduzir ? reduzir(valor) : null;
      } catch (erro) {
        novo = null;
      }
      const pesoAntigo = pesoDoDataUrl(valor);
      if (ehPromessa(novo)) {
        assincrono = true;
        return novo.catch(() => null).then((resolvido) => (
          ehImagemGuardada(resolvido) && pesoDoDataUrl(resolvido) < pesoAntigo ? resolvido : valor
        ));
      }
      if (ehImagemGuardada(novo) && pesoDoDataUrl(novo) < pesoAntigo) return novo;
      return valor;
    };
    const passear = (stickers) => {
      if (!Array.isArray(stickers)) return { stickers, mudou: 0 };
      let mudou = 0;
      let assincronoAqui = false;
      const novos = stickers.map((sticker) => {
        if (!sticker) return sticker;
        if (ehImagemGuardada(sticker.src)) {
          const src = encolherUm(sticker.src);
          if (ehPromessa(src)) assincronoAqui = true;
          else if (src !== sticker.src) mudou += 1;
          return { ...sticker, src };
        }
        if (ehImagemGuardada(sticker.content)) {
          const content = encolherUm(sticker.content);
          if (ehPromessa(content)) assincronoAqui = true;
          else if (content !== sticker.content) mudou += 1;
          return { ...sticker, content };
        }
        return sticker;
      });
      if (!assincronoAqui) return { stickers: novos, mudou };
      const caixa = { stickers: null, mudou: 0 };
      caixa.stickers = Promise.all(novos.map(async (item, indice) => {
        const antes = stickers[indice];
        if (!item || (!ehPromessa(item.src) && !ehPromessa(item.content))) {
          if (antes) {
            const mudouEsse = ehImagemGuardada(antes.src)
              ? Boolean(item && item.src !== antes.src)
              : Boolean(ehImagemGuardada(antes.content) && item && item.content !== antes.content);
            if (mudouEsse) caixa.mudou += 1;
          }
          return item;
        }
        const src = ehPromessa(item.src) ? await item.src : item.src;
        const content = ehPromessa(item.content) ? await item.content : item.content;
        if (antes) {
          const mudouEsse = ehImagemGuardada(antes.src)
            ? Boolean(src !== antes.src)
            : Boolean(ehImagemGuardada(antes.content) && content !== antes.content);
          if (mudouEsse) caixa.mudou += 1;
        }
        return { ...item, src, content };
      }));
      return caixa;
    };

    const daChave = passear(adesivos);
    const daCapa = passear(capa && capa.stickers);
    const juntar = () => {
      const trocadas = daChave.mudou + daCapa.mudou;
      if (!trocadas) return null;
      return {
        trocadas,
        adesivos: daChave.stickers,
        capa: capa ? { ...capa, stickers: daCapa.stickers } : capa
      };
    };
    if (!assincrono) return juntar();
    return Promise.all([
      ehPromessa(daChave.stickers) ? daChave.stickers : Promise.resolve(daChave.stickers),
      ehPromessa(daCapa.stickers) ? daCapa.stickers : Promise.resolve(daCapa.stickers)
    ]).then(([adesivosProntos, capaPronta]) => {
      const trocadas = daChave.mudou + daCapa.mudou;
      if (!trocadas) return null;
      return {
        trocadas,
        adesivos: adesivosProntos,
        capa: capa ? { ...capa, stickers: capaPronta } : capa
      };
    });
  }

  function apagarPagina(storage, date, pageId) {
    const dia = String(date || '');
    const atuais = ler(storage);
    const anterior = atuais.find((item) => item && item.date === dia) || null;
    if (!anterior) return { ok: false, motivo: 'sem-dia', lista: atuais };

    const paginas = (anterior.pages || []).filter((item) => item.id !== pageId);
    const semEla = atuais.filter((item) => item && item.date !== dia);
    const lista = paginas.length
      ? ordenar([normalizarEntrada({ ...anterior, pages: paginas }), ...semEla])
      : ordenar(semEla);

    const resultado = gravarSincrono(storage, lista);
    return { ...resultado, lista };
  }

  function moverPagina(storage, date, pageId, direcao) {
    const dia = String(date || '');
    const passo = Number(direcao) < 0 ? -1 : 1;
    const atuais = ler(storage);
    const anterior = atuais.find((item) => item && item.date === dia) || null;
    if (!anterior) return { ok: false, motivo: 'sem-dia', lista: atuais, entry: null };

    const planas = todasAsPaginas(storage);
    const posicao = planas.findIndex((item) => item.date === dia && item.id === pageId);
    if (posicao < 0) return { ok: false, motivo: 'sem-pagina', lista: atuais, entry: anterior };

    const destino = posicao + passo;
    if (destino < 0 || destino >= planas.length) {
      return { ok: false, motivo: 'na-borda', lista: atuais, entry: anterior };
    }

    const vizinha = planas[destino];
    const temOrdem = atuais.some((item) => (item.pages || [])
      .some((pagina) => ordemValida(pagina.ordem) !== null));

    if (!temOrdem && vizinha.date === dia) {
      const paginas = (anterior.pages || []).slice();
      const a = paginas.findIndex((item) => item.id === pageId);
      const b = paginas.findIndex((item) => item.id === vizinha.id);
      if (a < 0 || b < 0) return { ok: false, motivo: 'sem-pagina', lista: atuais, entry: anterior };
      [paginas[a], paginas[b]] = [paginas[b], paginas[a]];
      const salva = normalizarEntrada({ ...anterior, pages: paginas });
      const semEla = atuais.filter((item) => item && item.date !== dia);
      const lista = ordenar([salva, ...semEla]);
      const resultado = gravarSincrono(storage, lista);
      return { ...resultado, lista, entry: salva, dias: [dia] };
    }

    const arrumadas = planas.slice();
    [arrumadas[posicao], arrumadas[destino]] = [arrumadas[destino], arrumadas[posicao]];
    const chave = (pagina) => `${pagina.date}|${pagina.id}`;
    const ordens = new Map(arrumadas.map((pagina, index) => [chave(pagina), index]));

    const novasEntradas = atuais.map((entrada) => {
      const paginas = (entrada.pages || [])
        .map((pagina) => {
          const valor = ordens.get(`${entrada.date}|${pagina.id}`);
          return valor == null ? pagina : { ...pagina, ordem: valor };
        })
        .sort((a, b) => {
          const da = Number(a.ordem);
          const db = Number(b.ordem);
          if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
          return 0;
        });
      return normalizarEntrada({ ...entrada, pages: paginas });
    });

    const resultado = gravarSincrono(storage, novasEntradas);
    const lista = resultado.lista || ordenar(novasEntradas);
    return {
      ...resultado,
      lista,
      entry: lista.find((item) => item && item.date === dia) || null,
      dias: [...new Set([dia, vizinha.date])]
    };
  }

  function apagarPaginas(storage, itens) {
    const pedidos = (Array.isArray(itens) ? itens : [])
      .map((item) => ({
        dia: String((item && (item.date || item.dia)) || ''),
        id: String((item && (item.pageId || item.id)) || '')
      }))
      .filter((item) => item.dia && item.id);
    if (!pedidos.length) return { ok: false, motivo: 'sem-pagina', lista: ler(storage) };

    const atuais = ler(storage);
    const porDia = new Map();
    pedidos.forEach((item) => {
      if (!porDia.has(item.dia)) porDia.set(item.dia, new Set());
      porDia.get(item.dia).add(item.id);
    });

    const lista = [];
    atuais.forEach((entrada) => {
      if (!entrada || !entrada.date) return;
      const tirar = porDia.get(entrada.date);
      if (!tirar) { lista.push(entrada); return; }
      const paginas = (entrada.pages || []).filter((pagina) => !tirar.has(pagina.id));
      if (paginas.length) lista.push(normalizarEntrada({ ...entrada, pages: paginas }));
    });

    const resultado = gravarSincrono(storage, lista);
    return { ...resultado, lista: ordenar(lista) };
  }

  function apagar(storage, date) {
    const lista = ler(storage).filter((entry) => entry && entry.date !== date);
    const resultado = gravarSincrono(storage, lista);
    return { ...resultado, lista };
  }

  function buscar(storage, date) {
    if (!date) return null;
    return ler(storage).find((entry) => entry && entry.date === date) || null;
  }

  function buscarPagina(storage, pageId) {
    if (!pageId) return null;
    for (const entrada of ler(storage)) {
      const pagina = (entrada.pages || []).find((item) => item.id === pageId);
      if (pagina) return { ...pagina, date: entrada.date, entryId: entrada.id };
    }
    return null;
  }

  function todasAsPaginas(storage) {
    const lista = [];
    ordenar(ler(storage)).forEach((entrada) => {
      (entrada.pages || []).forEach((pagina, index) => {
        lista.push({
          ...pagina,
          date: entrada.date,
          entryId: entrada.id,
          ordemNoDia: index,
          indicePadrao: lista.length
        });
      });
    });
    if (!lista.some((pagina) => ordemValida(pagina.ordem) !== null)) {
      return lista.map(({ indicePadrao, ordemNoDia, ...pagina }) => ({ ...pagina, ordem: ordemNoDia }));
    }
    return lista
      .sort((a, b) => {
        const da = ordemValida(a.ordem);
        const db = ordemValida(b.ordem);
        const ordemA = da === null ? Infinity : da;
        const ordemB = db === null ? Infinity : db;
        if (ordemA !== ordemB) return ordemA - ordemB;
        return a.indicePadrao - b.indicePadrao;
      })
      .map(({ indicePadrao, ordemNoDia, ...pagina }) => pagina);
  }

  function juntar(storage, remotas, { replace = false } = {}) {
    const porData = new Map(ler(storage).map((entry) => [entry.date, entry]));
    (Array.isArray(remotas) ? remotas : []).forEach((entry) => {
      const nova = normalizarEntrada(entry);
      if (!nova) return;
      if (!porData.has(nova.date) || replace) porData.set(nova.date, nova);
    });
    const lista = ordenar([...porData.values()]);
    return gravar(storage, lista).then((resultado) => ({ ...resultado, lista }));
  }


  function rascunhoVazio(date) {
    return {
      date: date || '',
      pageId: '',
      title: '',
      body: '',
      pattern: 'lines',
      diaryStyle: null,
      textStyle: null,
      textSpans: [],
      texts: []
    };
  }

  function lerRascunho(storage) {
    try {
      const cru = storage.getItem(CHAVE_RASCUNHO);
      if (!cru) return null;
      const dado = JSON.parse(cru);
      if (!dado || typeof dado !== 'object') return null;
      return {
        date: String(dado.date || ''),
        pageId: String(dado.pageId || ''),
        title: String(dado.title || ''),
        body: String(dado.body || ''),
        pattern: padraoValido(dado.pattern),
        diaryStyle: normalizarCorDaPagina(dado.diaryStyle),
        textStyle: normalizarLetraDaPagina(dado.textStyle),
        textSpans: Array.isArray(dado.textSpans) ? dado.textSpans : [],
        texts: Array.isArray(dado.texts) ? dado.texts : []
      };
    } catch (error) {
      return null;
    }
  }

  function guardarRascunho(storage, rascunho) {
    const dado = rascunhoVazio(rascunho && rascunho.date);
    if (rascunho && typeof rascunho === 'object') {
      dado.pageId = String(rascunho.pageId || '');
      dado.title = String(rascunho.title || '');
      dado.body = String(rascunho.body || '');
      dado.pattern = padraoValido(rascunho.pattern);
      dado.diaryStyle = normalizarCorDaPagina(rascunho.diaryStyle);
      dado.textStyle = normalizarLetraDaPagina(rascunho.textStyle);
      dado.textSpans = Array.isArray(rascunho.textSpans) ? rascunho.textSpans : [];
      dado.texts = Array.isArray(rascunho.texts) ? rascunho.texts : [];
    }
    try {
      storage.setItem(CHAVE_RASCUNHO, JSON.stringify(dado));
      return { ok: true, rascunho: dado };
    } catch (error) {
      return { ok: false, motivo: 'quota', rascunho: dado };
    }
  }


  const DIARIO_PRINCIPAL = 'principal';

  function diarioNovo(dados = {}) {
    return {
      id: String(dados.id || ''),
      nome: String(dados.nome || 'meu diário'),
      titulo: String(dados.titulo || 'melting log'),
      subtitulo: String(dados.subtitulo || ''),
      senha: dados.senha ? String(dados.senha) : '',
      sal: String(dados.sal || ''),
      criadoEm: dados.criadoEm || new Date().toISOString()
    };
  }

  function lerDiarios(storage) {
    let lista = [];
    try {
      const cru = storage.getItem(CHAVE_DIARIOS);
      const dado = cru ? JSON.parse(cru) : null;
      if (Array.isArray(dado)) lista = dado.map((item) => diarioNovo(item)).filter((item) => item.id);
    } catch (error) {
      lista = [];
    }
    if (!lista.some((item) => item.id === DIARIO_PRINCIPAL)) {
      lista.unshift(diarioNovo({ id: DIARIO_PRINCIPAL, nome: 'meu diário' }));
    }
    return lista;
  }

  function gravarDiarios(storage, lista) {
    try {
      storage.setItem(CHAVE_DIARIOS, JSON.stringify((lista || []).map((item) => diarioNovo(item))));
      return { ok: true, lista: (lista || []).map((item) => diarioNovo(item)) };
    } catch (error) {
      return { ok: false, motivo: 'quota', lista: lista || [] };
    }
  }

  function salvarDiario(storage, diario) {
    const cru = diario || {};
    if (!cru.id) return { ok: false, motivo: 'sem-id', lista: lerDiarios(storage) };
    const lista = lerDiarios(storage);
    const posicao = lista.findIndex((item) => item.id === cru.id);
    const atual = posicao >= 0 ? lista[posicao] : diarioNovo({ id: cru.id });
    const novo = diarioNovo({ ...atual, ...cru });
    const comEle = posicao >= 0
      ? lista.map((item, index) => (index === posicao ? novo : item))
      : [...lista, novo];
    const resultado = gravarDiarios(storage, comEle);
    return { ...resultado, diario: novo };
  }

  function apagarDiario(storage, id) {
    if (!id || id === DIARIO_PRINCIPAL) {
      return { ok: false, motivo: 'principal', lista: lerDiarios(storage) };
    }
    const lista = lerDiarios(storage).filter((item) => item.id !== id);
    const resultado = gravarDiarios(storage, lista);
    return { ...resultado, lista };
  }

  function diarioAtivo(storage) {
    const id = storage.getItem(CHAVE_DIARIO_ATIVO);
    const lista = lerDiarios(storage);
    return lista.some((item) => item.id === id) ? id : DIARIO_PRINCIPAL;
  }

  function trocarDiarioAtivo(storage, id) {
    const lista = lerDiarios(storage);
    const escolhido = lista.some((item) => item.id === id) ? id : DIARIO_PRINCIPAL;
    storage.setItem(CHAVE_DIARIO_ATIVO, escolhido);
    return escolhido;
  }

  function chaveDoDiario(id, chave) {
    return !id || id === DIARIO_PRINCIPAL ? chave : `pd:${id}:${chave}`;
  }

  function storageDoDiario(storage, id) {
    const prefixo = (chave) => chaveDoDiario(id, chave);
    return {
      getItem: (chave) => storage.getItem(prefixo(chave)),
      setItem: (chave, valor) => storage.setItem(prefixo(chave), valor),
      removeItem: (chave) => storage.removeItem(prefixo(chave)),
      get length() { return storage.length; },
      key: (indice) => storage.key(indice)
    };
  }

  function limparDiario(storage, id) {
    storageDoDiario(storage, id).removeItem(CHAVE);
    storageDoDiario(storage, id).removeItem(CHAVE_RASCUNHO);
    return { ok: true };
  }

  return {
    CHAVE,
    CHAVE_RASCUNHO,
    CHAVE_DIARIOS,
    CHAVE_DIARIO_ATIVO,
    DIARIO_PRINCIPAL,
    PADROES,
    novoIdPagina,
    normalizarPagina,
    normalizarEntrada,
    normalizarMedidaDaPagina,
    normalizarCorDaPagina,
    normalizarLetraDaPagina,
    ordenar,
    paraGuardar,
    ler,
    gravar,
    gravarSincrono,
    salvar,
    salvarPagina,
    enxugarImagens,
    enxugarDiario,
    enxugarCapa,
    ehImagemGuardada,
    pesoDoDataUrl,
    moverPagina,
    apagarPagina,
    apagarPaginas,
    apagar,
    buscar,
    buscarPagina,
    todasAsPaginas,
    juntar,
    rascunhoVazio,
    lerRascunho,
    guardarRascunho,
    diarioNovo,
    lerDiarios,
    gravarDiarios,
    salvarDiario,
    apagarDiario,
    diarioAtivo,
    trocarDiarioAtivo,
    chaveDoDiario,
    storageDoDiario,
    limparDiario
  };
});
