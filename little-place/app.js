document.addEventListener('DOMContentLoaded', () => {

  const EntryStore = window.PooftieEntryStore || null;

  let diarioAtivoId = (EntryStore && EntryStore.diarioAtivo(localStorage)) || 'principal';

  function storageDoDiarioAtual() {
    return EntryStore
      ? EntryStore.storageDoDiario(localStorage, diarioAtivoId)
      : localStorage;
  }

  function definirDiarioAtivo(id) {
    diarioAtivoId = id || 'principal';
    if (EntryStore) EntryStore.trocarDiarioAtivo(localStorage, diarioAtivoId);
    return diarioAtivoId;
  }

  const storeDiario = {
    getItem: (chave) => storageDoDiarioAtual().getItem(chave),
    setItem: (chave, valor) => storageDoDiarioAtual().setItem(chave, valor),
    removeItem: (chave) => storageDoDiarioAtual().removeItem(chave),
    get length() { return localStorage.length; },
    key: (indice) => localStorage.key(indice)
  };

  function lerDoDiario(chave, fallback) {
    try {
      const cru = storeDiario.getItem(chave);
      return cru ? JSON.parse(cru) : fallback;
    } catch (error) {
      console.warn(`[crechezinha] ${chave} estava corrompido, recomeçando:`, error.message);
      return fallback;
    }
  }

  function lerTextoDoDiario(chave, fallback) {
    const cru = storeDiario.getItem(chave);
    return cru === null || cru === undefined || cru === '' ? fallback : String(cru);
  }

  const PLAYLISTS_DO_PROJETO = {
    base: {
      name: '🌸 Base Music',
      cover: 'assets/audio/base music/cover.webp',
      tracks: [
        { name: 'wash the porcelain tea set', file: 'assets/audio/base music/wash_the_porcelain_tea_set.mp3' },
        { name: 'dust the bookshelves', file: 'assets/audio/base music/dust_the_bookshelves.mp3' },
        { name: 'eat a slice of cake', file: 'assets/audio/base music/eat_a_slice_of_cake.mp3' },
        { name: 'fluff the pillows', file: 'assets/audio/base music/fluff_the_pillows.mp3' },
        { name: 'light a scented candle', file: 'assets/audio/base music/light_a_scented_candle.mp3' },
        { name: 'open the ruffle curtains', file: 'assets/audio/base music/open_the_ruffle_curtains.mp3' },
        { name: 'put on my favorite ribbon', file: 'assets/audio/base music/put_on_my_favorite_ribbon.mp3' },
        { name: 'water the pot of daisies', file: 'assets/audio/base music/water_the_pot_of_daisies.mp3' }
      ]
    },
    extra: {
      name: '☁️ Extra Musics',
      cover: 'assets/audio/extra musics/cover2.webp',
      tracks: [
        { name: 'BTG', file: 'assets/audio/extra musics/BTG.m4a' },
        { name: 'Buttlerflies', file: 'assets/audio/extra musics/Buttlerflies.m4a' },
        { name: 'Cameo Love', file: 'assets/audio/extra musics/Cameo Love.m4a' },
        { name: 'FOCUS', file: 'assets/audio/extra musics/FOCUS.m4a' },
        { name: 'GPT', file: 'assets/audio/extra musics/GPT.m4a' },
        { name: 'GRWM', file: 'assets/audio/extra musics/GRWM.m4a' },
        { name: 'Hazy(daisy)', file: 'assets/audio/extra musics/Hazy(daisy).m4a' },
        { name: 'Hey Hi', file: 'assets/audio/extra musics/Hey Hi.m4a' },
        { name: 'Iconic Heart', file: 'assets/audio/extra musics/Iconic Heart.m4a' },
        { name: 'Jellyous', file: 'assets/audio/extra musics/Jellyous.m4a' },
        { name: 'Shadow', file: 'assets/audio/extra musics/Shadow.m4a' },
        { name: 'Sweet Witches', file: 'assets/audio/extra musics/Sweet Witches.m4a' },
        { name: 'Take It Slow', file: 'assets/audio/extra musics/Take It Slow.mp3' }
      ]
    }
  };

  const state = {
    currentView: 'cover',
    currentMood: '🌸 feliz',
    selectedStickerEl: null,
    audioContext: null,
    calZoom: 1.0,
    calendarDate: new Date(),
    isLooping: true,
    username: localStorage.getItem('pooftie_username') || '',
    currentPlaylistKey: 'base',
    currentTrackIndex: 0,
    isPlayingMusic: false,

    customStickers: JSON.parse(localStorage.getItem('pooftie_custom_stickers') || '[]'),
    coverStickers: lerDoDiario('pooftie_cover_stickers', []),
    calendarStickers: JSON.parse(localStorage.getItem('pooftie_calendar_stickers') || '[]'),
    todoStickers: JSON.parse(localStorage.getItem('pooftie_todo_stickers') || '[]'),
    ipodStickers: JSON.parse(localStorage.getItem('pooftie_ipod_stickers') || '[]'),
    todoItems: JSON.parse(localStorage.getItem('pooftie_todos') || '[]'),
    calendarNotes: JSON.parse(localStorage.getItem('pooftie_cal_notes') || '{}'),
    calendarReactions: JSON.parse(localStorage.getItem('pooftie_cal_reactions') || '{}'),

    calendarStyle: (window.PooftieCalendarStyle ? window.PooftieCalendarStyle.ler(localStorage) : null),
    calendarNoteColors: JSON.parse(localStorage.getItem('pooftie_cal_note_colors') || '{}'),
    calendarEvents: (window.PooftieCalendarEvents ? window.PooftieCalendarEvents.ler(localStorage) : []),
    calendarPhotos: JSON.parse(localStorage.getItem('pooftie_cal_photos') || '{}'),

    emojiStyle: localStorage.getItem('pooftie_emoji_style') || 'aparelho',

    coverData: lerDoDiario('pooftie_cover_data', {
      title: 'melting log',
      subtitle: 'melting me slowly & softly ♥'
    }),

    favorites: JSON.parse(localStorage.getItem('pooftie_favorite_stickers') || '[]'),

    coverStyle: lerDoDiario('pooftie_cover_style', null),
    diaryStyle: lerDoDiario('pooftie_diary_style', {}),
    textDecoration: lerDoDiario('pooftie_text_decoration', {}),
    textSpans: lerDoDiario('pooftie_text_spans', []),

    penColor: lerTextoDoDiario('pooftie_pen_color', '#463529'),
    penSize: lerTextoDoDiario('pooftie_pen_size', 'media'),
    penActive: false,

    playlists: [],
    playlistsCarregadas: false,

    draft: lerDoDiario('pooftie_draft', { date: '', pageId: '', title: '', body: '', pattern: 'lines', textSpans: [], texts: [], diaryStyle: null, textStyle: null }),
    editingId: null,
    editingPageId: '',

    paperPattern: lerTextoDoDiario('pooftie_paper_pattern', 'lines'),

    diaries: (EntryStore && EntryStore.lerDiarios(localStorage)) || [],

    reminderDate: ''
  };

  const WidgetConfig = window.PooftieWidgetConfig || null;
  let widgetConfig = WidgetConfig ? WidgetConfig.ler(localStorage) : null;

  let avisoDeArmazenamentoDado = false;

  function avisarArmazenamentoCheio(chave, error) {
    console.warn(`[crechezinha] não consegui guardar "${chave}":`, error && error.message);
    if (avisoDeArmazenamentoDado) return false;
    avisoDeArmazenamentoDado = true;
    setTimeout(() => { avisoDeArmazenamentoDado = false; }, 8000);
    try {
      alert('⚠️ O navegador está sem espacinho pra guardar 😢\n\n' +
        'Eu já tentei encolher as fotos e os desenhos pra caber, mas ainda não deu.\n' +
        'Tenta uma dessas:\n' +
        '  • tirar uma foto/adesivo bem grande de alguma página;\n' +
        '  • fazer o Backup (.json) lá na Nuvem e apagar páginas antigas;\n' +
        '  • fechar outras abas do navegador (elas também usam esse espacinho).\n\n' +
        'O que você escreveu continua na tela e no rascunho — nada se perdeu!');
    } catch (erroDoAlerta) {   }
    return false;
  }

  function guardarNoNavegador(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
      return true;
    } catch (error) {
      return avisarArmazenamentoCheio(chave, error);
    }
  }

  const Styling = window.PooftieDiaryStyling || {};

  function guardarNoDiario(chave, valor) {
    try {
      storeDiario.setItem(chave, valor);
      return true;
    } catch (error) {
      return avisarArmazenamentoCheio(chave, error);
    }
  }

  const PlaylistsModel = window.PooftiePlaylists || null;
  const MediaStore = window.PooftieMediaStore || null;

  const MediaKind = window.PooftieMediaKind || null;
  const ImageEncode = window.PooftieImageEncode || null;
  const ehVideoRef = MediaKind
    ? MediaKind.isVideoRef
    : (valor) => /^video:/i.test(String(valor == null ? '' : valor).trim());
  const chaveDoVideo = MediaKind
    ? MediaKind.videoKey
    : (valor) => (/^video:/i.test(String(valor || '')) ? String(valor).slice(6).trim() : '');
  const referenciaDeVideo = MediaKind
    ? MediaKind.videoRef
    : (chave) => (chave ? `video:${String(chave).trim()}` : '');
  const ehArquivoDeVideo = MediaKind
    ? MediaKind.isVideoFile
    : (file) => Boolean(file) && (/^video\//i.test(file.type || '') || /\.(mp4|m4v|webm|ogv|mov|avi|mkv|3gp|3g2|mpeg|mpg)$/i.test(file.name || ''));
  const ehVideoSource = MediaKind
    ? MediaKind.isVideoSource
    : (valor) => ehVideoRef(valor) || /^data:video\//i.test(String(valor || ''));

  function ehAdesivoDeVideo(item, src) {
    if (item && typeof item === 'object' && (item.mediaType === 'video' || item.video === true)) return true;
    const valor = src !== undefined
      ? src
      : (typeof item === 'string' ? item : (item && item.content));
    return ehVideoSource(valor);
  }

  function escaparAtributo(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const urlsDeVideo = new Map();
  function urlDoVideo(referencia) {
    const chave = chaveDoVideo(referencia);
    if (!chave || !MediaStore) return Promise.resolve('');
    if (urlsDeVideo.has(chave)) return urlsDeVideo.get(chave);
    const promessa = Promise.resolve()
      .then(() => MediaStore.urlTocavel(chave))
      .then((url) => {
        if (!url) urlsDeVideo.delete(chave);
        return url || '';
      })
      .catch(() => {
        urlsDeVideo.delete(chave);
        return '';
      });
    urlsDeVideo.set(chave, promessa);
    return promessa;
  }

  function hidratarVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    if (video.getAttribute('preload') == null) video.setAttribute('preload', 'metadata');
    const referencia = video.dataset.ref || video.getAttribute('data-ref') || '';
    if (!ehVideoRef(referencia)) return;
    if (video.dataset.hidratado === '1') return;
    video.dataset.hidratado = '1';
    urlDoVideo(referencia).then((url) => {
      if (!url || video.dataset.ref !== referencia) {
        video.classList.add('video-sem-fonte');
        return;
      }
      video.classList.remove('video-sem-fonte');
      video.src = url;
      try {
        const tentativa = video.play();
        if (tentativa && typeof tentativa.catch === 'function') tentativa.catch(() => {});
      } catch (erro) {   }
    });
  }

  function hidratarVideosEm(raiz) {
    if (!raiz) return;
    if (raiz.tagName === 'VIDEO') hidratarVideo(raiz);
    if (typeof raiz.querySelectorAll !== 'function') return;
    raiz.querySelectorAll('video[data-ref]').forEach(hidratarVideo);
  }

  if (typeof MutationObserver !== 'undefined' && document.body) {
    let olhadinhaAgendada = false;
    const agendarOlhadinha = () => {
      if (olhadinhaAgendada) return;
      olhadinhaAgendada = true;
      setTimeout(() => {
        olhadinhaAgendada = false;
        hidratarVideosEm(document);
      }, 0);
    };
    const olhinhoDosVideos = new MutationObserver((mudancas) => {
      mudancas.forEach((mudanca) => {
        mudanca.addedNodes.forEach((node) => {
          if (node && node.nodeType === 1 && node.tagName === 'VIDEO') hidratarVideo(node);
        });
      });
      agendarOlhadinha();
    });
    olhinhoDosVideos.observe(document.body, { childList: true, subtree: true });
    hidratarVideosEm(document);
  }

  async function guardarVideoNoBanco(file, prefixo = 'video') {
    if (!MediaStore) throw new Error('este navegador não tem banco para vídeos');
    const chave = `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const salvo = await MediaStore.salvar(file, chave);
    return {
      chave: salvo.key,
      referencia: referenciaDeVideo(salvo.key),
      guardado: salvo.guardado
    };
  }

  function prepararVideoDoArquivo(file) {
    const vazio = { width: 0, height: 0, poster: '' };
    return new Promise((resolve) => {
      if (!file || typeof document === 'undefined' || typeof URL === 'undefined'
        || typeof URL.createObjectURL !== 'function') {
        resolve(vazio);
        return;
      }
      let url = '';
      try {
        url = URL.createObjectURL(file);
      } catch (erro) {
        resolve(vazio);
        return;
      }
      const video = document.createElement('video');
      let terminou = false;
      const terminar = (dados) => {
        if (terminou) return;
        terminou = true;
        clearTimeout(relogio);
        try { URL.revokeObjectURL(url); } catch (erro) {   }
        resolve(dados);
      };
      const relogio = setTimeout(() => terminar(vazio), 6000);
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.onerror = () => terminar(vazio);
      video.onloadeddata = () => {
        const largura = video.videoWidth || 0;
        const altura = video.videoHeight || 0;
        let poster = '';
        if (largura && altura) {
          try {
            const escala = Math.min(1, 480 / Math.max(largura, altura));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(largura * escala));
            canvas.height = Math.max(1, Math.round(altura * escala));
            const contexto = canvas.getContext('2d');
            contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
            poster = canvas.toDataURL('image/jpeg', 0.72);
          } catch (erro) {   }
        }
        terminar({ width: largura, height: altura, poster });
      };
      video.src = url;
      try { video.load(); } catch (erro) { terminar(vazio); }
    });
  }

  function carregarPlaylists() {
    if (!PlaylistsModel || state.playlistsCarregadas) return state.playlists;
    state.playlists = PlaylistsModel.parse(localStorage.getItem(PlaylistsModel.STORE_KEY) || '[]');
    state.playlistsCarregadas = true;
    return state.playlists;
  }

  function guardarPlaylists() {
    if (!PlaylistsModel) return;
    try {
      localStorage.setItem(PlaylistsModel.STORE_KEY, JSON.stringify(state.playlists || []));
    } catch (error) {
      console.warn('[crechezinha] não consegui guardar as playlists:', error.message);
    }
  }

  carregarPlaylists();


  function readEntries() {
    if (EntryStore) return EntryStore.ler(storeDiario);
    try {
      return JSON.parse(storeDiario.getItem('pooftie_entries') || '[]');
    } catch (error) {
      console.warn('[crechezinha] as memórias salvas estavam corrompidas:', error.message);
      return [];
    }
  }

  let cacheDeDatasComMemoria = null;
  let cacheDeDatasEm = 0;
  function datasComMemoria() {
    if (cacheDeDatasComMemoria && Date.now() - cacheDeDatasEm < 5000) return cacheDeDatasComMemoria;
    cacheDeDatasComMemoria = new Set(readEntries().map((entrada) => entrada.date));
    cacheDeDatasEm = Date.now();
    return cacheDeDatasComMemoria;
  }
  function esquecerDatasComMemoria() {
    cacheDeDatasComMemoria = null;
  }

  function gravarEntradas(lista) {
    esquecerDatasComMemoria();
    if (EntryStore) return Promise.resolve(EntryStore.gravar(storeDiario, lista)).then((r) => r.ok);
    return Promise.resolve(guardarNoDiario('pooftie_entries', JSON.stringify(lista || [])));
  }

  function escreverEntradas(entry) {
    if (!entry || !entry.date) return Promise.resolve(false);
    if (EntryStore) return Promise.resolve(EntryStore.salvar(storeDiario, entry)).then((r) => r.ok);
    const lista = readEntries().filter((e) => e.date !== entry.date);
    lista.unshift(entry);
    lista.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return gravarEntradas(lista);
  }

  function escreverPagina(date, page) {
    if (!date || !page) return Promise.resolve(null);
    if (EntryStore) {
      return Promise.resolve(EntryStore.salvarPagina(storeDiario, date, page, {
        aoPrecisarDeEspaco: (lista) => reduzirAsImagensDoDiario(lista)
      })).then((resultado) => {
        if (resultado.ok && resultado.enxugou) estadoDoEspaco.enxugou = true;
        return resultado.ok ? resultado.page : null;
      });
    }
    return Promise.resolve(null);
  }

  const estadoDoEspaco = { enxugou: false };


  function reducaoDeImagem(largura, altura, maiorLado = 900) {
    const maior = Math.max(largura, altura);
    return maior > maiorLado ? maiorLado / maior : 1;
  }

  const PESO_MINIMO_PRA_ENCOLHER = 12 * 1024;

  async function carregarImagem(dataUrl) {
    const imagem = new Image();
    const pronta = new Promise((resolve) => {
      imagem.onload = () => resolve();
      imagem.onerror = () => resolve();
    });
    imagem.src = dataUrl;
    await Promise.race([
      pronta,
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
    return imagem;
  }

  function canvasTemDesenho(canvas) {
    try {
      const contexto = canvas.getContext('2d');
      if (!contexto) return false;
      const { width, height } = canvas;
      if (!width || !height) return false;
      const dados = contexto.getImageData(0, 0, width, height).data;
      const passo = Math.max(4, Math.floor(dados.length / 4 / 400) * 4);
      for (let i = 3; i < dados.length; i += passo) {
        if (dados[i] !== 0) return true;
      }
      return false;
    } catch (erro) {
      return true;
    }
  }

  function canvasTemTransparencia(canvas) {
    try {
      const contexto = canvas.getContext('2d');
      if (!contexto) return true;
      const { width, height } = canvas;
      if (!width || !height) return true;
      const dados = contexto.getImageData(0, 0, width, height).data;
      if (ImageEncode && ImageEncode.temTransparencia) {
        return ImageEncode.temTransparencia(dados);
      }
      for (let i = 3; i < dados.length; i += 4) {
        if (dados[i] < 255) return true;
      }
      return false;
    } catch (erro) {
      return true;
    }
  }

  function menorDataUrlDaImagem(canvas, { qualidadeWebp = 0.86, qualidadeJpeg = 0.86 } = {}) {
    const candidatos = [];
    const transparencia = canvasTemTransparencia(canvas);
    try {
      const webp = canvas.toDataURL('image/webp', qualidadeWebp);
      if (/^data:image\//i.test(webp)) candidatos.push(webp);
    } catch (erro) {   }
    if (transparencia) {
      try {
        const png = canvas.toDataURL('image/png');
        if (/^data:image\//i.test(png) && !candidatos.includes(png)) candidatos.push(png);
      } catch (erro) {   }
    } else {
      try {
        const jpeg = canvas.toDataURL('image/jpeg', qualidadeJpeg);
        if (/^data:image\//i.test(jpeg)) candidatos.push(jpeg);
      } catch (erro) {   }
    }
    if (ImageEncode && ImageEncode.menorDataUrl) {
      return ImageEncode.menorDataUrl(candidatos, { semPerderTransparencia: transparencia });
    }
    let menor = '';
    candidatos.forEach((novo) => {
      if (transparencia && /^data:image\/jpe?g/i.test(novo)) return;
      if (!menor || novo.length < menor.length) menor = novo;
    });
    return menor;
  }

  function imagemEmDataUrl(img, { lado = 900, qualidade = 0.86 } = {}) {
    const largura = img.naturalWidth || img.width || 0;
    const altura = img.naturalHeight || img.height || 0;
    if (!largura || !altura) return '';
    const limite = Math.max(1, Number(lado) || 900);
    const escala = Math.min(1, limite / Math.max(largura, altura));
    const canvas = document.createElement('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') return '';
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) return '';
    contexto.clearRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(img, 0, 0, canvas.width, canvas.height);
    return menorDataUrlDaImagem(canvas, { qualidadeWebp: qualidade, qualidadeJpeg: qualidade });
  }

  async function reduzirImagemDeVerdade(dataUrl, canvasDoApp, opcoes = {}) {
    if (!EntryStore || !EntryStore.ehImagemGuardada(dataUrl)) return null;
    try {
      const imagem = await carregarImagem(dataUrl);
      const largura = imagem.naturalWidth || imagem.width;
      const altura = imagem.naturalHeight || imagem.height;
      if (!largura || !altura) return null;
      const escala = reducaoDeImagem(largura, altura, Number(opcoes.lado) || 900);
      const canvas = canvasDoApp || document.createElement('canvas');
      if (!canvas || typeof canvas.getContext !== 'function') return null;
      canvas.width = Math.max(1, Math.round(largura * escala));
      canvas.height = Math.max(1, Math.round(altura * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) return null;
      contexto.clearRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      if (!canvasTemDesenho(canvas)) return null;
      const pesoAntigo = EntryStore.pesoDoDataUrl(dataUrl);
      const novo = menorDataUrlDaImagem(canvas, { qualidadeWebp: 0.78, qualidadeJpeg: 0.8 });
      if (!EntryStore.ehImagemGuardada(novo)) return null;
      if (EntryStore.pesoDoDataUrl(novo) >= pesoAntigo) return null;
      return novo;
    } catch (erro) {
      return null;
    }
  }

  async function reduzirAsImagensDoDiario(lista) {
    if (!EntryStore || !EntryStore.enxugarDiario) return null;
    const doDiario = await EntryStore.enxugarDiario(
      lista,
      (dataUrl) => reduzirImagemDeVerdade(dataUrl),
      { pesoMinimo: PESO_MINIMO_PRA_ENCOLHER }
    );
    if (doDiario) return doDiario;
    const capa = await reduzirAsImagensDaCapa();
    if (capa) {
      return { lista, trocadas: capa.trocadas };
    }
    return null;
  }

  async function reduzirAsImagensDaCapa() {
    if (!EntryStore || !EntryStore.enxugarCapa) return null;
    let adesivos = state.coverStickers || [];
    try {
      const guardados = lerDoDiario('pooftie_cover_stickers', null);
      if (Array.isArray(guardados) && guardados.length) adesivos = guardados;
    } catch (erro) {   }
    const capa = state.coverData || {};
    const resultado = await EntryStore.enxugarCapa(
      adesivos,
      capa,
      (dataUrl) => reduzirImagemDeVerdade(dataUrl),
      { pesoMinimo: PESO_MINIMO_PRA_ENCOLHER }
    );
    if (!resultado) return null;
    guardarNoNavegador('pooftie_cover_stickers', JSON.stringify(resultado.adesivos));
    guardarNoNavegador('pooftie_cover_data', JSON.stringify(resultado.capa));
    if (state.coverData) state.coverData.stickers = resultado.capa.stickers;
    state.coverStickers = resultado.adesivos;
    return resultado;
  }

  async function apagarEntrada(date) {
    if (EntryStore) return EntryStore.apagar(storeDiario, date).ok;
    return gravarEntradas(readEntries().filter((e) => e.date !== date));
  }

  function apagarPaginaDoDia(date, pageId) {
    if (EntryStore) return EntryStore.apagarPagina(storeDiario, date, pageId).ok;
    return false;
  }

  function lerTodasAsPaginas() {
    if (EntryStore) return EntryStore.todasAsPaginas(storeDiario);
    return [];
  }

  const hojeStr = () => {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  };

  function diaSeguinte(dateStr) {
    const data = new Date(`${dateStr || hojeStr()}T12:00:00`);
    data.setDate(data.getDate() + 1);
    return data.toISOString().split('T')[0];
  }

  function proximoDiaLivre() {
    const ocupados = new Set(readEntries().map((e) => e.date));
    let dia = hojeStr();
    for (let i = 0; i < 60; i++) {
      if (!ocupados.has(dia)) return dia;
      dia = diaSeguinte(dia);
    }
    return dia;
  }

  function guardarRascunhoNoNavegador() {
    if (!state.draft) return false;
    if (EntryStore) return EntryStore.guardarRascunho(storeDiario, state.draft).ok;
    return guardarNoDiario('pooftie_draft', JSON.stringify(state.draft || {}));
  }

  function prepararRascunhoDeHoje() {
    const draft = (state.draft && typeof state.draft === 'object') ? state.draft : {};
    const data = draft.date || hojeStr();
    const salva = readEntries().find((e) => e.date === data) || null;
    const paginas = salva && Array.isArray(salva.pages) ? salva.pages : [];
    const escolhida = paginas.find((p) => p.id === draft.pageId) || paginas[0] || null;
    state.draft = {
      date: data,
      pageId: escolhida ? escolhida.id : (draft.pageId || ''),
      title: draft.title || (escolhida ? escolhida.title || '' : ''),
      body: draft.body || (escolhida ? escolhida.body || '' : ''),
      pattern: escolhida ? escolhida.pattern : (draft.pattern || state.paperPattern || 'lines'),
      diaryStyle: (escolhida && escolhida.diaryStyle) || draft.diaryStyle || null,
      textStyle: (escolhida && escolhida.textStyle) || draft.textStyle || null,
      textSpans: Array.isArray(draft.textSpans) && draft.textSpans.length
        ? draft.textSpans
        : (escolhida ? escolhida.textSpans || [] : []),
      texts: Array.isArray(draft.texts) && draft.texts.length
        ? draft.texts
        : (escolhida ? escolhida.texts || [] : [])
    };
    state.editingId = salva ? salva.id : null;
    state.editingPageId = state.draft.pageId || '';
    state.textSpans = state.draft.textSpans;
  }

  const History = window.PooftieHistory || null;
  const pilhaDeHistorico = History ? History.criar(null, { limite: 40 }) : null;
  let marcaDoHistorico = '';
  let voltandoNoTempo = false;
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');

  function adesivosDaFolhaViva() {
    const conhecida = state.draft && state.draft.pageId && EntryStore
      ? EntryStore.buscarPagina(storeDiario, state.draft.pageId)
      : null;
    if (typeof getStickersFromOverlay !== 'function') return (conhecida && conhecida.stickers) || [];
    const doLivrinho = typeof camadaDaPaginaAbertaNoLivrinho === 'function'
      ? camadaDaPaginaAbertaNoLivrinho()
      : (typeof camadaDeAdesivosDoLivrinho === 'function' ? camadaDeAdesivosDoLivrinho() : null);
    if (doLivrinho && livrinho) {
      const viva = livrinho.paginaEscrevivel ? livrinho.paginaEscrevivel() : null;
      const idVivo = (viva && viva.page && viva.page.pageId) || '';
      const idRascunho = (state.draft && state.draft.pageId) || '';
      if (!idVivo || idVivo === idRascunho) return adesivosComAsCanetinhas(doLivrinho);
    }
    return getStickersFromOverlay(pageStickersOverlay);
  }

  function adesivosComAsCanetinhas(camada) {
    return [...getStickersFromOverlay(camada), ...registrosDasCanetinhas()];
  }

  function tirarRetrato() {
    const capa = state.coverData || {};
    return {
      pen: { color: state.penColor || '#463529', size: state.penSize || 'media' },
      page: {
        date: (state.draft && state.draft.date) || hojeStr(),
        pageId: (state.draft && state.draft.pageId) || '',
        title: (state.draft && state.draft.title) || '',
        body: (state.draft && state.draft.body) || '',
        pattern: (state.draft && state.draft.pattern) || state.paperPattern || 'lines',
        diaryStyle: (state.draft && state.draft.diaryStyle) || null,
        textStyle: (state.draft && state.draft.textStyle) || null,
        textSpans: (state.draft && state.draft.textSpans) || state.textSpans || [],
        stickers: adesivosDaFolhaViva(),
        texts: typeof getTextsFromLayer === 'function'
          ? getTextsFromLayer(pageTextsOverlay)
          : []
      },
      cover: {
        title: capa.title || '',
        subtitle: capa.subtitle || '',
        semTitulo: Boolean(capa.semTitulo),
        stickers: typeof getStickersFromOverlay === 'function'
          ? getStickersFromOverlay(coverStickersOverlay)
          : [],
        texts: typeof getTextsFromLayer === 'function'
          ? getTextsFromLayer(coverTextsOverlay)
          : []
      }
    };
  }

  function retratoDeAgora() {
    if (typeof getStickersFromOverlay !== 'function' || !pageStickersOverlay) return null;
    const retrato = tirarRetrato();
    try {
      return { retrato, texto: JSON.stringify(retrato) };
    } catch (erro) {
      return null;
    }
  }

  function sincronizarRetrato() {
    if (voltandoNoTempo) return false;
    const atual = retratoDeAgora();
    if (!atual || atual.texto === marcaDoHistorico) return false;
    marcaDoHistorico = atual.texto;
    return true;
  }

  let timerRetrato = null;

  function registrarNoHistorico(rotulo, { imediato = false } = {}) {
    if (!pilhaDeHistorico) return false;
    if (voltandoNoTempo) return false;
    if (!rotulo && !imediato) {
      if (timerRetrato) clearTimeout(timerRetrato);
      timerRetrato = setTimeout(() => {
        timerRetrato = null;
        registrarNoHistorico('uma mexidinha', { imediato: true });
      }, 500);
      return false;
    }
    if (timerRetrato) {
      clearTimeout(timerRetrato);
      timerRetrato = null;
    }
    const atual = retratoDeAgora();
    if (!atual || atual.texto === marcaDoHistorico) return false;
    marcaDoHistorico = atual.texto;
    pilhaDeHistorico.guardar(atual.retrato, {
      onde: state.currentView === 'cover' ? 'cover' : 'page',
      rotulo: rotulo || 'uma mexidinha'
    });
    atualizarBotoesDeHistorico();
    return true;
  }

  function garantirRetratoInicial() {
    if (!pilhaDeHistorico) return false;
    if (pilhaDeHistorico.estado().degraus > 0) return false;
    const atual = retratoDeAgora();
    if (!atual) return false;
    marcaDoHistorico = atual.texto;
    pilhaDeHistorico.guardar(atual.retrato, { onde: 'page', rotulo: 'começo' });
    atualizarBotoesDeHistorico();
    return true;
  }

  function atualizarBotoesDeHistorico() {
    const estado = pilhaDeHistorico ? pilhaDeHistorico.estado() : { podeDesfazer: false, podeRefazer: false };
    if (btnUndo) {
      btnUndo.disabled = !estado.podeDesfazer;
      btnUndo.classList.toggle('is-off', !estado.podeDesfazer);
    }
    if (btnRedo) {
      btnRedo.disabled = !estado.podeRefazer;
      btnRedo.classList.toggle('is-off', !estado.podeRefazer);
    }
  }

  function desenharAdesivosNaCaminha(caminha, lista) {
    if (!caminha) return;
    caminha.innerHTML = '';
    restoreOverlayStickers(Array.isArray(lista) ? lista : [], caminha);
  }

  function desenharTextosNaCaminha(caminha, lista) {
    if (!caminha) return;
    caminha.innerHTML = '';
    restoreTexts(Array.isArray(lista) ? lista : [], caminha);
  }

  function restaurarRetrato(retrato) {
    if (!retrato || !retrato.dados) return false;
    const dados = retrato.dados;
    const pagina = dados.page || {};
    const capa = dados.cover || {};

    if (dados.pen) {
      state.penColor = dados.pen.color || state.penColor;
      state.penSize = dados.pen.size || state.penSize;
      aplicarCanetaNaTela();
    }

    const mesmaPagina = Boolean(pagina.pageId && pagina.pageId === (state.draft && state.draft.pageId));
    if (!mesmaPagina) {
      const entrada = readEntries().find((e) => e.date === pagina.date) || null;
      carregarMemoriaNoRascunho(entrada, pagina.date || hojeStr(), pagina.pageId || undefined);
    }
    state.draft.date = pagina.date || state.draft.date || hojeStr();
    state.draft.pageId = pagina.pageId || state.draft.pageId || '';
    state.draft.title = pagina.title || '';
    state.draft.body = pagina.body || '';
    state.draft.pattern = pagina.pattern || state.draft.pattern || 'lines';
    state.draft.diaryStyle = pagina.diaryStyle || null;
    state.draft.textStyle = pagina.textStyle || null;
    state.draft.textSpans = Array.isArray(pagina.textSpans) ? pagina.textSpans : [];
    state.textSpans = state.draft.textSpans;
    state.editingPageId = state.draft.pageId;

    desenharAdesivosNaCaminha(pageStickersOverlay, pagina.stickers);
    desenharTextosNaCaminha(pageTextsOverlay, pagina.texts);
    state.draft.texts = Array.isArray(pagina.texts) ? pagina.texts : [];
    applyPaperPattern(state.draft.pattern);
    sincronizarPapeizinho();
    applyTextDecoration();
    guardarRascunhoNoNavegador();

    if (!state.coverData) state.coverData = {};
    state.coverData.title = capa.title || state.coverData.title || '';
    state.coverData.subtitle = capa.subtitle || '';
    state.coverData.semTitulo = Boolean(capa.semTitulo);
    state.coverData.stickers = Array.isArray(capa.stickers) ? capa.stickers : [];
    state.coverData.texts = Array.isArray(capa.texts) ? capa.texts : [];
    state.coverStickers = state.coverData.stickers;
    if (coverTitleInput && document.activeElement !== coverTitleInput) {
      coverTitleInput.value = state.coverData.title;
    }
    if (coverSubtitleInput && document.activeElement !== coverSubtitleInput) {
      coverSubtitleInput.value = state.coverData.subtitle;
    }
    aplicarModoDaCapa();
    desenharAdesivosNaCaminha(coverStickersOverlay, state.coverData.stickers);
    desenharTextosNaCaminha(coverTextsOverlay, state.coverData.texts);

    deselectSticker();
    deselectTexto();
    if (livrinho && livrinho.estaAberto()) {
      atualizarLivrinho({ irPara: 'mesma', paginaLivre: paginaLivreAtual(), forcar: true });
      if (livrinho.escreverNaPaginaAberta) livrinho.escreverNaPaginaAberta(state.draft.body);
    }
    if (typeof salvarCapaNoNavegador === 'function') salvarCapaNoNavegador();
    agendarAutosave(500);
    return true;
  }

  function voltarNoTempo(direcao) {
    if (!pilhaDeHistorico) return false;
    if (!voltandoNoTempo) {
      const atual = retratoDeAgora();
      if (atual) {
        marcaDoHistorico = atual.texto;
        pilhaDeHistorico.guardar(atual.retrato, {
          onde: state.currentView === 'cover' ? 'cover' : 'page',
          rotulo: 'agora'
        });
      }
    }
    const alvo = direcao === 'refazer' ? pilhaDeHistorico.refazer() : pilhaDeHistorico.desfazer();
    if (!alvo) {
      atualizarBotoesDeHistorico();
      showToast(direcao === 'refazer' ? 'não tem mais nada pra refazer ⋆' : 'não tem mais nada pra desfazer ⋆');
      return false;
    }
    voltandoNoTempo = true;
    try {
      restaurarRetrato(alvo);
      marcaDoHistorico = JSON.stringify(tirarRetrato());
    } finally {
      voltandoNoTempo = false;
    }
    atualizarBotoesDeHistorico();
    playSfx(direcao === 'refazer' ? 1050 : 820);
    showToast(direcao === 'refazer'
      ? `↪️ refiz ${alvo.rotulo || 'a coisinha'}`
      : `↩️ desfiz ${alvo.rotulo || 'a coisinha'}`);
    return true;
  }

  function desfazer() { return voltarNoTempo('desfazer'); }
  function refazer() { return voltarNoTempo('refazer'); }

  if (btnUndo) btnUndo.addEventListener('click', () => desfazer());
  if (btnRedo) btnRedo.addEventListener('click', () => refazer());

  function capaVivaParaOLivrinho() {
    const capa = { ...(state.coverData || {}) };
    if (typeof getStickersFromOverlay === 'function' && coverStickersOverlay) {
      capa.stickers = getStickersFromOverlay(coverStickersOverlay);
      state.coverStickers = capa.stickers;
    }
    if (typeof getTextsFromLayer === 'function' && coverTextsOverlay) {
      capa.texts = getTextsFromLayer(coverTextsOverlay);
    }
    const medida = reguaDaCapinha() || medidaDaCapinha();
    if (medida) capa.medida = medida;
    return capa;
  }

  let ultimaMedidaDaCapinha = null;

  function medidaDaCapinha() {
    const caixa = caixaDaCapinha();
    if (caixa) {
      ultimaMedidaDaCapinha = caixa;
      return ultimaMedidaDaCapinha;
    }
    return ultimaMedidaDaCapinha;
  }

  function caixaDaCapinha() {
    if (!coverNotebook) return null;
    const largura = coverNotebook.clientWidth || coverNotebook.offsetWidth || 0;
    const altura = coverNotebook.clientHeight || coverNotebook.offsetHeight || 0;
    return (largura > 0 && altura > 0) ? { width: largura, height: altura } : null;
  }

  const Encaixe = window.PooftieFlipFit || null;

  function desenhosDaCapinha() {
    const lista = [];
    const adesivos = Array.isArray(state.coverStickers) ? state.coverStickers : [];
    adesivos.forEach((item) => {
      const largura = Number(item && item.width) || 85;
      const altura = Number(item && item.height) || largura;
      lista.push({
        x: Number(item && item.x) || 0,
        y: Number(item && item.y) || 0,
        width: largura,
        height: altura
      });
    });
    const textos = (state.coverData && Array.isArray(state.coverData.texts)) ? state.coverData.texts : [];
    textos.forEach((item) => {
      lista.push({
        x: Number(item && item.x) || 0,
        y: Number(item && item.y) || 0,
        width: 0,
        height: 0
      });
    });
    return lista;
  }

  function reguaDaCapinha() {
    const guardada = (Encaixe && Encaixe.normalizarMedida)
      ? Encaixe.normalizarMedida(state.coverData && state.coverData.medida)
      : null;
    if (guardada) return guardada;
    const caixa = caixaDaCapinha();
    if (!caixa) return null;
    if (Encaixe && Encaixe.reguaDaCapa) {
      return Encaixe.reguaDaCapa({ caixa, desenhos: desenhosDaCapinha() });
    }
    return caixa;
  }

  let ultimaCaixaDaCapinha = null;
  let tentativasDeEspera = 0;
  let capinhaDesenhada = false;

  function contarNaCaminha(caminha, seletor) {
    if (!caminha || typeof caminha.querySelectorAll !== 'function') return null;
    return caminha.querySelectorAll(seletor).length;
  }

  function arrumarCapinhaNaRegua() {
    const caixa = caixaDaCapinha();
    if (!caixa || !Encaixe || !Encaixe.reguaDaCapa || !Encaixe.enquadramento) return false;

    const assentou = ultimaCaixaDaCapinha
      && Math.abs(ultimaCaixaDaCapinha.width - caixa.width) <= 1
      && Math.abs(ultimaCaixaDaCapinha.height - caixa.height) <= 1;
    ultimaCaixaDaCapinha = caixa;
    if (!assentou) {
      if (tentativasDeEspera < 20) {
        tentativasDeEspera += 1;
        agendarEncaixeDaCapa(140);
      }
      return false;
    }
    tentativasDeEspera = 0;

    if (capinhaDesenhada) {
      const adesivosNaTela = contarNaCaminha(coverStickersOverlay, '.placed-sticker');
      const adesivosGuardados = Array.isArray(state.coverStickers) ? state.coverStickers.length : 0;
      const textosNaTela = (coverTextsOverlay && typeof getTextsFromLayer === 'function')
        ? getTextsFromLayer(coverTextsOverlay).length : null;
      const textosGuardados = (state.coverData && Array.isArray(state.coverData.texts))
        ? state.coverData.texts.length : 0;
      if ((adesivosNaTela !== null && adesivosNaTela !== adesivosGuardados)
        || (textosNaTela !== null && textosNaTela !== textosGuardados)) {
        return false;
      }
      if (coverStickersOverlay && typeof getStickersFromOverlay === 'function') {
        state.coverStickers = getStickersFromOverlay(coverStickersOverlay);
      }
      if (coverTextsOverlay && typeof getTextsFromLayer === 'function') {
        if (!state.coverData) state.coverData = {};
        state.coverData.texts = getTextsFromLayer(coverTextsOverlay);
      }
    }

    const guardada = Encaixe.normalizarMedida
      ? Encaixe.normalizarMedida(state.coverData && state.coverData.medida)
      : null;
    const pode = (Encaixe && typeof Encaixe.podeArrumarCapa === 'function')
      ? Encaixe.podeArrumarCapa(guardada, caixa, { editando: campoDeTextoEmEdicao() })
      : true;
    if (!pode) return false;

    const regua = Encaixe.reguaDaCapa({ caixa, medida: guardada, desenhos: desenhosDaCapinha() });
    if (!regua) return false;
    const diferenca = Math.max(
      Math.abs(regua.width - caixa.width) / Math.max(1, caixa.width),
      Math.abs(regua.height - caixa.height) / Math.max(1, caixa.height)
    );
    if (diferenca <= 0.01) return false;
    const enquadrado = Encaixe.enquadramento(caixa, regua, Encaixe.LIMITES_DA_CAPA);
    if (!enquadrado || !(enquadrado.escala > 0)) return false;
    if (Math.abs(enquadrado.escala - 1) < 0.001
      && Math.abs(enquadrado.x) < 0.5 && Math.abs(enquadrado.y) < 0.5) return false;

    const adesivos = (Array.isArray(state.coverStickers) ? state.coverStickers : [])
      .map((item) => naReguaDaCapinha(item, enquadrado, true));
    const textos = (state.coverData && Array.isArray(state.coverData.texts) ? state.coverData.texts : [])
      .map((item) => naReguaDaCapinha(item, enquadrado, false));
    state.coverStickers = adesivos;
    if (state.coverData) {
      if (Array.isArray(state.coverData.stickers)) state.coverData.stickers = adesivos;
      state.coverData.texts = textos;
      state.coverData.medida = { width: Math.round(caixa.width), height: Math.round(caixa.height) };
    }
    if (coverStickersOverlay) {
      coverStickersOverlay.innerHTML = '';
      restoreOverlayStickers(adesivos, coverStickersOverlay);
    }
    if (coverTextsOverlay) restoreTexts(textos, coverTextsOverlay);
    salvarCapaNoNavegador();
    return true;
  }

  function naReguaDaCapinha(item, enquadrado, comTamanho) {
    const dados = (item && typeof item === 'object') ? { ...item } : {};
    const escala = enquadrado.escala;
    dados.x = Math.round((Number(dados.x) || 0) * escala + enquadrado.x);
    dados.y = Math.round((Number(dados.y) || 0) * escala + enquadrado.y);
    if (comTamanho) {
      const largura = Number(dados.width) || 85;
      const altura = Number(dados.height) || 0;
      dados.width = Math.max(1, Math.round(largura * escala));
      if (altura > 0) dados.height = Math.max(1, Math.round(altura * escala));
    }
    if (Number(dados.size) > 0) {
      const novo = Number(dados.size) * escala;
      dados.size = PageText ? PageText.tamanhoValido(novo) : Math.max(8, Math.round(novo));
    }
    return dados;
  }

  let timerEncaixeDaCapa = null;

  function agendarEncaixeDaCapa(atraso = 160) {
    if (timerEncaixeDaCapa) clearTimeout(timerEncaixeDaCapa);
    timerEncaixeDaCapa = setTimeout(() => {
      timerEncaixeDaCapa = null;
      arrumarCapinhaNaRegua();
    }, atraso);
  }

  window.addEventListener('resize', () => agendarEncaixeDaCapa(160));
  window.addEventListener('orientationchange', () => agendarEncaixeDaCapa(240));

  let ultimaMedidaDaFolha = null;

  function reguaDaFolhaAgora() {
    const folha = document.getElementById('page-stickers-overlay')
      || document.getElementById('diary-paper');
    if (!folha) return null;
    const largura = Number(folha.clientWidth) || 0;
    const altura = Number(folha.clientHeight) || 0;
    if (largura > 0 && altura > 0) return { width: largura, height: altura };
    if (typeof folha.getBoundingClientRect === 'function') {
      const caixa = folha.getBoundingClientRect();
      if (caixa.width > 0 && caixa.height > 0) {
        return { width: caixa.width, height: caixa.height };
      }
    }
    return null;
  }

  function medidaDaFolha() {
    const agora = reguaDaFolhaAgora();
    if (agora) ultimaMedidaDaFolha = agora;
    return ultimaMedidaDaFolha;
  }

  const EscalaDaArte = () => window.PooftieFlipFit || null;

  function arrumarArteNaRegua(lista, de, para) {
    const encaixe = EscalaDaArte();
    if (!encaixe || typeof encaixe.arteNaRegua !== 'function') return lista;
    return encaixe.arteNaRegua(lista, de, para);
  }

  let reancorando = false;

  function campoDeTextoEmEdicao() {
    const ativo = document.activeElement;
    if (!ativo) return false;
    const tag = String(ativo.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select'
      || ativo.isContentEditable === true;
  }

  function reancorarArteDaPaginaAberta() {
    if (reancorando) return false;
    if (typeof state === 'undefined' || !state || !state.draft || state.editingId === null) return false;
    const agora = reguaDaFolhaAgora();
    if (!agora) return false;
    const paginaId = state.draft.pageId;
    const entrada = readEntries().find((e) => e.date === state.draft.date) || null;
    const paginas = (entrada && Array.isArray(entrada.pages)) ? entrada.pages : [];
    const pagina = (paginaId && paginas.find((p) => p.id === paginaId))
      || paginas[0]
      || null;
    if (!pagina) return false;
    const regua = pagina.medida || (entrada && entrada.medida) || null;
    const encaixe = EscalaDaArte();
    const pode = (encaixe && typeof encaixe.podeReancorar === 'function')
      ? encaixe.podeReancorar(regua, agora, { editando: campoDeTextoEmEdicao() })
      : true;
    if (!pode) return false;
    if (!regua) {
      if (campoDeTextoEmEdicao()) return false;
      pagina.medida = { width: Math.round(agora.width), height: Math.round(agora.height) };
      return true;
    }
    const caminhaDaPagina = document.getElementById('page-stickers-overlay');
    const naTela = caminhaDaPagina ? caminhaDaPagina.querySelectorAll('.placed-sticker').length : null;
    const guardados = Array.isArray(pagina.stickers) ? pagina.stickers.length : 0;
    if (naTela !== null && naTela > guardados) return false;
    const stickersDaPagina = Array.isArray(pagina.stickers) ? pagina.stickers : [];
    const textosDaPagina = Array.isArray(pagina.texts) ? pagina.texts : [];
    const nova = arrumarArteNaRegua(stickersDaPagina, regua, agora);
    const novosTextos = arrumarArteNaRegua(textosDaPagina, regua, agora);
    const mudou = JSON.stringify(nova) !== JSON.stringify(stickersDaPagina)
      || JSON.stringify(novosTextos) !== JSON.stringify(textosDaPagina);
    if (!mudou) return false;
    reancorando = true;
    try {
      escreverPagina(pagina.date || state.draft.date, {
        ...pagina,
        medida: { width: Math.round(agora.width), height: Math.round(agora.height) },
        stickers: nova,
        texts: novosTextos
      });
      trocarAdesivosDaFolha(nova);
      trocarTextosDaFolha(novosTextos);
    } finally {
      reancorando = false;
    }
    return true;
  }

  let timerReancorar = null;
  let timerReancorarConfirmacao = null;

  function agendarReancorarArte(atraso = 160) {
    if (timerReancorar) clearTimeout(timerReancorar);
    if (timerReancorarConfirmacao) clearTimeout(timerReancorarConfirmacao);
    timerReancorar = setTimeout(() => {
      timerReancorar = null;
      const primeira = reguaDaFolhaAgora();
      const encaixe = EscalaDaArte();
      const confiavel = (encaixe && typeof encaixe.reguaConfiavel === 'function')
        ? encaixe.reguaConfiavel(primeira)
        : Boolean(primeira);
      if (!confiavel) return;
      timerReancorarConfirmacao = setTimeout(() => {
        timerReancorarConfirmacao = null;
        const segunda = reguaDaFolhaAgora();
        if (!segunda
          || Math.abs(segunda.width - primeira.width) > 1.5
          || Math.abs(segunda.height - primeira.height) > 1.5) return;
        reancorarArteDaPaginaAberta();
      }, 90);
    }, atraso);
  }

  window.addEventListener('resize', () => agendarReancorarArte(220));
  window.addEventListener('orientationchange', () => agendarReancorarArte(320));

  document.addEventListener('keydown', (evento) => {
    const ctrl = evento.ctrlKey || evento.metaKey;
    if (!ctrl || evento.altKey) return;
    const tecla = String(evento.key || '').toLowerCase();
    if (tecla !== 'z' && tecla !== 'y') return;
    if (evento.target && typeof evento.target.closest === 'function'
      && evento.target.closest('input, textarea, [contenteditable="true"], .diary-textarea')) return;
    evento.preventDefault();
    if (tecla === 'y' || evento.shiftKey) refazer();
    else desfazer();
  });

  atualizarBotoesDeHistorico();

  function elementoPreguicoso(id) {
    let el = null;
    const pegar = () => {
      if (!el) el = document.getElementById(id);
      return el;
    };
    return new Proxy({}, {
      get(_, prop) {
        if (prop === '__el') return pegar();
        if (prop === 'then') return undefined;
        const alvo = pegar();
        if (!alvo) return undefined;
        const valor = alvo[prop];
        return typeof valor === 'function' ? valor.bind(alvo) : valor;
      },
      set(_, prop, valor) {
        const alvo = pegar();
        if (!alvo) return true;
        alvo[prop] = valor;
        return true;
      },
      has(_, prop) { return Boolean(pegar() && prop in pegar()); }
    });
  }

  const diaryTitle = elementoPreguicoso('diary-title');
  const diaryBody = elementoPreguicoso('diary-body');
  const diaryDateEl = elementoPreguicoso('diary-date');

  prepararRascunhoDeHoje();

  const urlsDeAudio = new Map();

  function soltarUrlDeAudio(chave) {
    const url = urlsDeAudio.get(chave);
    if (url) {
      urlsDeAudio.delete(chave);
      try { URL.revokeObjectURL(url); } catch (error) {   }
    }
  }

  function soltarTodasAsUrls() {
    [...urlsDeAudio.keys()].forEach(soltarUrlDeAudio);
  }

  async function resolverAudioDaMusica(track) {
    if (!track) return null;

    if (track.file) {
      const arquivo = String(track.file);
      if (/^assets\//.test(arquivo)) {
        const chave = 'arquivo:' + arquivo;
        if (urlsDeAudio.has(chave)) return urlsDeAudio.get(chave);
        try {
          const resposta = await fetch(encodeURI(arquivo));
          if (resposta.ok) {
            const blob = await resposta.blob();
            const url = URL.createObjectURL(blob);
            urlsDeAudio.set(chave, url);
            return url;
          }
        } catch (erro) {
        }
      }
      return arquivo;
    }

    if (!track.audioKey || !MediaStore) return null;
    if (urlsDeAudio.has(track.audioKey)) return urlsDeAudio.get(track.audioKey);
    const url = await MediaStore.urlTocavel(track.audioKey);
    if (url) urlsDeAudio.set(track.audioKey, url);
    return url;
  }

  const legacyCatalog = {
    personagens: [
      'assets/images/crechudo.webp',
      'assets/stickers/animais/m_01.webp',
      'assets/stickers/animais/m_02.webp',
      'assets/stickers/animais/m_03.webp',
      'assets/stickers/animais/unicornio.webp',
      'assets/stickers/ovelh apng.png',
      'assets/stickers/rendinhas-e-bordas/doutora.webp',
      'assets/stickers/animais/inpatia.webp',
      'assets/stickers/comidinhas/milk.webp',
      'assets/stickers/comidinhas/cupcake.webp',
      'assets/stickers/comidinhas/chantilliy.webp',
      'assets/stickers/agere/chupeta kk.webp'
    ],
    florais: [
      'assets/stickers/natureza/cloud.webp',
      'assets/stickers/comidinhas/tea.gif',
      'assets/stickers/natureza/snail.gif',
      'assets/stickers/pelucias/animation.webp',
      'assets/stickers/rendinhas-e-bordas/ajjdks.webp',
      'assets/stickers/random/2d4741c72b65024e95e164af8f99eea9.webp',
      'assets/stickers/natureza/flower_twig_1.webp',
      'assets/stickers/natureza/flower_twig_2.webp',
      'assets/stickers/natureza/flower_twig_3.webp',
      'assets/stickers/natureza/flower_twig_4.webp',
      'assets/stickers/natureza/flower_twig_5.webp',
      'assets/stickers/natureza/flower_twig_6.webp',
      'assets/stickers/natureza/flower_twig_7.webp',
      'assets/stickers/natureza/flower_twig_8.webp',
      'assets/stickers/natureza/flower_twig_9.webp',
      'assets/stickers/natureza/flower_twig_10.webp',
      'assets/stickers/natureza/flower_twig_11.webp',
      'assets/stickers/natureza/flower_twig_12.webp',
      'assets/stickers/natureza/flower_twig_13.webp',
      'assets/stickers/natureza/flower_twig_14.webp',
      'assets/stickers/natureza/leaves_1.webp',
      'assets/stickers/natureza/leaves_2.webp',
      'assets/stickers/natureza/leaves_3.webp',
      'assets/stickers/natureza/leaves_4.webp',
      'assets/stickers/natureza/leaves_5.webp',
      'assets/stickers/natureza/leaves_6.webp',
      'assets/stickers/natureza/leaves_7.webp'
    ],
    rendas: [
      'assets/stickers/rendinhas-e-bordas/borders.webp',
      'assets/stickers/rendinhas-e-bordas/border.webp',
      'assets/images/lace.webp',
      'assets/stickers/rendinhas-e-bordas/lace (1).webp',
      'assets/stickers/rendinhas-e-bordas/lace (2).webp',
      'assets/stickers/rendinhas-e-bordas/frame.webp'
    ],
    mimos: [
      'assets/stickers/natureza/delicate.webp',
      'assets/stickers/life.webp',
      'assets/stickers/lovely.webp',
      'assets/stickers/melody.webp',
      'assets/stickers/rendinhas-e-bordas/sign.webp',
      'assets/stickers/heart.webp',
      'assets/stickers/icon.webp',
      'assets/stickers/icon (1).webp',
      'assets/stickers/icon (2).webp',
      'assets/images/buttons1_left_index.webp',
      'assets/images/buttons1_right_index.webp',
      'assets/images/buttons2_left_index.webp',
      'assets/images/buttons2_right_index.webp',
      'assets/images/buttons1_left_about.webp',
      'assets/images/buttons1_right_about.webp',
      'assets/images/buttons2_left_about.webp',
      'assets/images/buttons2_right_about.webp'
    ],
    tumblr: []
  };

  for (let i = 1; i <= 42; i++) {
    legacyCatalog.personagens.push(`assets/stickers/sticker${i}.png`);
  }
  for (let i = 1; i <= 16; i++) {
    legacyCatalog.personagens.push(`assets/stickers/sticke${i}.png`);
  }

  const LEGACY_TABS = [
    { key: 'personagens', emoji: '🧸', label: 'Pelúcias' },
    { key: 'florais', emoji: '🌸', label: 'Florais' },
    { key: 'rendas', emoji: '🎀', label: 'Rendas' },
    { key: 'mimos', emoji: '🏷️', label: 'Mimos' },
    { key: 'tumblr', emoji: '🖼️', label: 'Tumblr' }
  ];

  const EXTRA_STICKERS = [
    'assets/images/crechudo.webp',
    'assets/images/lace.webp',
    'assets/images/buttons1_left_index.webp',
    'assets/images/buttons1_right_index.webp',
    'assets/images/buttons2_left_index.webp',
    'assets/images/buttons2_right_index.webp',
    'assets/images/buttons1_left_about.webp',
    'assets/images/buttons1_right_about.webp',
    'assets/images/buttons2_left_about.webp',
    'assets/images/buttons2_right_about.webp'
  ];

  const brokenStickers = [];
  const sanitizeStickerCatalog = () => {
    const index = window.PooftieStickerIndex;
    if (index && !index.ready) return;
    if (state.catalogSanitized) return;
    state.catalogSanitized = true;

    for (const [tab, list] of Object.entries(legacyCatalog)) {
      if (!Array.isArray(list) || list.length === 0) continue;
      const fixed = [];
      for (const item of list) {
        const isString = typeof item === 'string';
        const source = isString ? item : item.content;
        const resolved = resolveCatalogPath(source);
        if (!resolved) {
          brokenStickers.push(source);
          continue;
        }
        fixed.push(isString ? resolved : { ...item, content: resolved });
      }
      legacyCatalog[tab] = fixed;
    }

    if (brokenStickers.length) {
      console.info(
        `[crechezinha] ${brokenStickers.length} adesivo(s) do catálogo não existem mais e foram escondidos. ` +
        'Rode `npm run build:manifest` depois de arrumar os arquivos.'
      );
    }
  };

  function resolveCatalogPath(path) {
    const index = window.PooftieStickerIndex;
    if (!index || !index.ready) return path;
    return index.resolve(path);
  }

  function isAnimatedSticker(src) {
    const index = window.PooftieStickerIndex;
    if (index?.ready && index.isAnimated(src)) return true;
    return /\.gif(\?|$)/i.test(String(src || '')) || /^data:image\/gif/i.test(String(src || ''));
  }

  if (window.PooftieStickerIndex?.readyPromise) {
    window.PooftieStickerIndex.readyPromise.then(() => {
      sanitizeStickerCatalog();
      if (stickersDrawer?.classList.contains('open')) refreshStickerDrawer();
    });
  } else {
    setTimeout(sanitizeStickerCatalog, 400);
  }

  const tumblrCuts = [
    'tumblr_04dc89f99a83fccc3972e7a69c79ded1_78f0d8e8_500.png',
    'tumblr_058fc9937ec4354338f0e132d560f2f8_e4ddc663_500.png',
    'tumblr_068f61366946797f32a8ee0a3b5f91c0_365c216c_2048.png',
    'tumblr_0c50e2768009491a6114a9185dd4d7d9_823e6da7_1280.png',
    'tumblr_0d2255b447a90c5075d21ce08800bb6b_d30e33b1_500.png',
    'tumblr_12aa2c0ce6cb5231066c77328bc3e790_3380844d_500.png',
    'tumblr_177e5a87d4eb742b142a61bcef998767_6cec466a_1280.png',
    'tumblr_18a984e7ca46b92c3a8a0cfc8cf9f799_4e0036da_540.png',
    'tumblr_1b3a43ca49bd7ef455e45552322fe3da_a4cdb68d_1280.png',
    'tumblr_1d0eb4ddd2b68fb97f07a827c24c6388_27704125_1280.png',
    'tumblr_1dff054329fbfe50c2f0fd2e4c4b2369_0ebedb52_1280.png',
    'tumblr_1e80d655075d1878e0d5a84ad09a3055_89af6dff_500.png',
    'tumblr_2de4b5ef521c409a8e86c9339113268b_4f5dec69_250.png',
    'tumblr_2ed2938096d0cb8c5b3a6957d69d6570_516980a1_1280.png',
    'tumblr_2f77461f3ee446006ae152d093e7b76d_2a1a93e1_640.png',
    'tumblr_311cbe485039f26f673f90032467d08e_1709b43d_1280.gif',
    'tumblr_36c32e6cc6d06719d0a8f19a1a72cd7e_4a11c517_640.png',
    'tumblr_42cd6be77c5f81d60ab3e9ffcba13931_9f8513a8_1280.png',
    'tumblr_4935e88cd9c73b7001c91794fb28aba2_d321da51_1280.png',
    'tumblr_505957674e6c748495d244dc44df3220_890d5cab_1280.png',
    'tumblr_512e02ae4cfb1d60df554d7d1c9b59b0_94dccfb0_1280.png',
    'tumblr_6c701ca9f58f1592ecab93c7f324a19e_e1cf43db_1280.png',
    'tumblr_6d07fa4455717255be80d36438e61cd8_61a88a4c_400.png',
    'tumblr_75dddad9de7637e0aae8fe0ac0cf7249_7d361081_500.png',
    'tumblr_7746a31ea65904f4fb735dae6ec8bb24_5cb403ea_1280.png',
    'tumblr_7a918e0fd8acf220d1cd4c777d2963ea_68702a14_2048.png',
    'tumblr_7d4b0377e31ee5bcac3efec54407121f_f2bceb32_1280.png',
    'tumblr_7d6dc7b9571af87ef7f863f38c340f53_feae90e8_640.png',
    'tumblr_87f49bf4facd3ff06b87df4616fe4334_2c47b922_1280.png',
    'tumblr_909a72f35d99cdc964c89fa3fee1631d_670b0cc3_500.gif',
    'tumblr_912235b2551041e73a2700ecf93404c4_5804ef2e_1280.png',
    'tumblr_9c6c24eda0e39ac144999168e08340ce_d73d057a_1280.png',
    'tumblr_9d03c44bafc8141202e654016d1e712f_954de4ba_1280.png',
    'tumblr_a466273d736f9e3d4ec67847d18bcac0_15feb08f_2048.png',
    'tumblr_a709b00351970d9fc72a4e6fc7a9dce7_1470938c_2048.png',
    'tumblr_abd816825389d69ef059d3b1a1e758e4_11adbd0d_1280.png',
    'tumblr_ae506ebf6ba3c1c19c6568d7ace729bd_91a49841_1280.png',
    'tumblr_afab763bd42d3f819d3afbcfeca20284_46fe9bd8_540.png',
    'tumblr_b39e23caf67396feee936da5c219bda3_ae2788d4_1280.png',
    'tumblr_b4b9c52ed4d28abcb2a96b5c2404914a_1eda0caf_1280.png',
    'tumblr_ba63dc58da470c23fb13fff8b684d0ce_0f60366a_1280.png',
    'tumblr_bc08c44c8b5c90f3f7e4ccd485d2f490_01e0f067_2048.png',
    'tumblr_bf4d4bbc6c47dc0696dbf9482520dfc4_c97892e2_2048.png',
    'tumblr_ca9bc74de3e3f6069eacdc7cad0dff45_d0ed9c7b_1280.png',
    'tumblr_cacc788321c0eac337e26f40b1be999a_b95f3e53_500.png',
    'tumblr_d679b455e196f5dad93f5cc2b976b3e9_4acc1d19_500.png',
    'tumblr_d84e7732ff8776914de2e62d7798e53a_d521f8f4_1280.png',
    'tumblr_db32be9e6279434582831c431906cb62_9ed37910_2048.png',
    'tumblr_e254323568f124932b59ce50005a8d54_7cb59560_500.png',
    'tumblr_e614c9822b10ac09abf02b59e8e12b1c_b74e36dc_2048.png',
    'tumblr_ece3aab085aa1f4928653d144f2ecd2d_c1eab719_500.png',
    'tumblr_ef4e39b56fb66f4e8f39446cf17460c9_b68866d0_1280.png',
    'tumblr_efe50ed3e19ef2a0ffd70af6dd3a9d4a_a03d4c7e_2048.png',
    'tumblr_fd8f32ff6347b8adcab951b99883dedc_5b7b0066_1280.png',
    'tumblr_fff7685170aa29f091f919ec7d1a27b6_008c6edd_1280.png'
  ];
  tumblrCuts.forEach(file => legacyCatalog.tumblr.push(`assets/stickers/${file}`));

  function initAudioCtx() {
    if (!state.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) state.audioContext = new AudioCtx();
    }
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
  }

  function playSfx(freq = 900, duration = 0.1, type = 'sine') {
    try {
      initAudioCtx();
      if (!state.audioContext) return;
      const ctx = state.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playUnlockSfx() {
    try {
      initAudioCtx();
      const ctx = state.audioContext;
      if (!ctx) return;
      const agora = ctx.currentTime;

      const estalo = ctx.createBufferSource();
      const duracao = 0.09;
      const amostras = Math.max(1, Math.floor(ctx.sampleRate * duracao));
      const buffer = ctx.createBuffer(1, amostras, ctx.sampleRate);
      const dados = buffer.getChannelData(0);
      for (let i = 0; i < amostras; i += 1) {
        const sumindo = Math.pow(1 - i / amostras, 3);
        dados[i] = (Math.random() * 2 - 1) * sumindo;
      }
      estalo.buffer = buffer;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      if (filtro.frequency && filtro.frequency.setValueAtTime) filtro.frequency.setValueAtTime(2600, agora);
      if (filtro.Q && filtro.Q.setValueAtTime) filtro.Q.setValueAtTime(1.2, agora);
      const ganhoEstalo = ctx.createGain();
      ganhoEstalo.gain.setValueAtTime(0.17, agora);
      ganhoEstalo.gain.exponentialRampToValueAtTime(0.001, agora + duracao);
      estalo.connect(filtro);
      filtro.connect(ganhoEstalo);
      ganhoEstalo.connect(ctx.destination);
      estalo.start(agora);
      estalo.stop(agora + duracao);

      const trinco = ctx.createOscillator();
      const ganhoTrinco = ctx.createGain();
      trinco.type = 'triangle';
      trinco.frequency.setValueAtTime(190, agora + 0.03);
      trinco.frequency.exponentialRampToValueAtTime(118, agora + 0.22);
      ganhoTrinco.gain.setValueAtTime(0.0001, agora + 0.03);
      ganhoTrinco.gain.exponentialRampToValueAtTime(0.15, agora + 0.05);
      ganhoTrinco.gain.exponentialRampToValueAtTime(0.001, agora + 0.24);
      trinco.connect(ganhoTrinco);
      ganhoTrinco.connect(ctx.destination);
      trinco.start(agora + 0.03);
      trinco.stop(agora + 0.26);

      [[1046, 0.16, 0.07], [1568, 0.27, 0.055]].forEach(([freq, quando, volume]) => {
        const sino = ctx.createOscillator();
        const ganhoSino = ctx.createGain();
        sino.type = 'sine';
        sino.frequency.setValueAtTime(freq, agora + quando);
        ganhoSino.gain.setValueAtTime(0.0001, agora + quando);
        ganhoSino.gain.exponentialRampToValueAtTime(volume, agora + quando + 0.02);
        ganhoSino.gain.exponentialRampToValueAtTime(0.001, agora + quando + 0.3);
        sino.connect(ganhoSino);
        ganhoSino.connect(ctx.destination);
        sino.start(agora + quando);
        sino.stop(agora + quando + 0.32);
      });
    } catch (error) {   }
  }

  function playCrayonScratchSfx() {
    try {
      initAudioCtx();
      if (!state.audioContext) return;
      const ctx = state.audioContext;
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch(e) {}
  }

  const splashScreen = document.getElementById('splash-screen');
  const btnEnterApp = document.getElementById('btn-enter-app');
  const headerLogoBtn = document.getElementById('header-logo-btn');
  const splashUsernameInput = document.getElementById('splash-username-input');
  const splashNameEmoji = document.getElementById('splash-name-emoji');
  const splashNameBox = document.getElementById('splash-name-box');
  const btnEnterLabel = document.getElementById('btn-enter-label');
  const ipodUserTitle = document.getElementById('ipod-user-title');

  if (state.username) {
    splashUsernameInput.value = state.username;
    updateIpodTitle(state.username);
  }

  function prepararSplash() {
    if (!state.username) state.username = localStorage.getItem('pooftie_username') || '';
    if (splashUsernameInput) splashUsernameInput.value = state.username || '';
    if (splashNameBox) splashNameBox.hidden = false;
    if (btnEnterLabel) btnEnterLabel.textContent = state.username ? 'salvar meu nome' : 'entrar no diário';
  }
  prepararSplash();

  splashUsernameInput.addEventListener('input', () => {
    splashNameEmoji.classList.remove('pop');
    void splashNameEmoji.offsetWidth;
    splashNameEmoji.classList.add('pop');
  });

  function updateIpodTitle(name) {
    if (ipodUserTitle) {
      ipodUserTitle.textContent = name ? `ipod de ${name}` : 'ipod';
    }
  }

  function mostrarSplashDoNome() {
    if (!splashScreen) return;
    splashScreen.classList.remove('hidden');
    splashScreen.classList.add('mostrar');
    prepararSplash();
    setTimeout(() => splashUsernameInput?.focus(), 300);
  }

  function esconderSplashDoNome() {
    if (!splashScreen) return;
    splashScreen.classList.add('hidden');
    splashScreen.classList.remove('mostrar');
  }

  let splashBloqueada = false;
  let pularIntro = null;

  function esconderIntroInicial() {
    document.documentElement.classList.remove('intro-inicial');
    const tela = document.getElementById('intro-screen');
    if (tela) {
      tela.hidden = true;
      tela.classList.remove('saindo');
    }
  }

  function tocarIntro() {
    return new Promise((resolve) => {
      const tela = document.getElementById('intro-screen');
      const logo = document.getElementById('intro-logo');
      const nativo = window.CrechezinhaNative && window.CrechezinhaNative.isNative;
      if (!nativo || !tela || !logo) { esconderIntroInicial(); resolve(); return; }

      ['logo2.png', 'logo3.png'].forEach((nome) => {
        const img = new Image();
        img.src = 'assets/images/intro/' + nome;
      });

      let terminou = false;
      let audio1 = null;
      let audio2 = null;
      const timers = [];

      function pararAudios() {
        try { if (audio1) audio1.pause(); } catch (erro) {   }
        try { if (audio2) audio2.pause(); } catch (erro) {   }
      }

      function finalizar() {
        if (terminou) return;
        terminou = true;
        timers.forEach((timer) => clearTimeout(timer));
        pararAudios();
        esconderIntroInicial();
        tela.removeEventListener('click', pular);
        pularIntro = null;
        resolve();
      }

      function pular() {
        if (terminou) return;
        timers.forEach((timer) => clearTimeout(timer));
        pararAudios();
        tela.classList.add('saindo');
        setTimeout(finalizar, 800);
      }

      pularIntro = pular;

      audio1 = new Audio('assets/audio/logo/audiologo.mp3');
      audio2 = new Audio('assets/audio/logo/audiologo2.mp3');
      audio1.preload = 'auto';
      audio2.preload = 'auto';

      tela.hidden = false;
      tela.classList.remove('saindo');
      logo.src = 'assets/images/intro/logo1.png';
      tela.addEventListener('click', pular);

      const em = (ms, fn) => timers.push(setTimeout(fn, ms));

      em(3000, () => {
        logo.src = 'assets/images/intro/logo2.png';
        try { audio1.currentTime = 0; audio1.play().catch(() => {}); } catch (erro) {   }
      });

      em(5000, () => {
        logo.src = 'assets/images/intro/logo3.png';
        try { audio1.pause(); } catch (erro) {   }
        try { audio2.currentTime = 0; audio2.play().catch(() => {}); } catch (erro) {   }
      });

      em(9000, () => {
        try { audio2.pause(); } catch (erro) {   }
        tela.classList.add('saindo');
        em(800, finalizar);
      });
    });
  }

  let aberturaFeita = false;

  async function aberturaDoApp() {
    if (aberturaFeita) return;
    aberturaFeita = true;
    if (splashBloqueada) {
      esconderIntroInicial();
      esconderSplashDoNome();
      return;
    }

    const nativo = window.CrechezinhaNative && window.CrechezinhaNative.isNative;
    const temAtalho = Boolean(window.__crechezinhaTemAtalho);

    if (!temAtalho && nativo) {
      await tocarIntro();
    }
    esconderIntroInicial();
    if (splashBloqueada) return;

    if (temAtalho) {
      if (state.username) esconderSplashDoNome();
      else mostrarSplashDoNome();
      return;
    }

    if (state.username) {
      esconderSplashDoNome();
    } else {
      mostrarSplashDoNome();
    }
  }
  setTimeout(aberturaDoApp, 120);

  btnEnterApp.addEventListener('click', () => {
    const name = splashUsernameInput.value.trim();
    if (!name) {
      splashUsernameInput.focus();
      return;
    }
    state.username = name;
    guardarNoNavegador('pooftie_username', name);
    document.documentElement.classList.add('ja-tem-nome');
    updateIpodTitle(name);
    if (window.PooftieAPI) window.PooftieAPI.setUser(name);
    playSfx(1050, 0.15);
    esconderSplashDoNome();
    if (window.CrechezinhaCloud) window.CrechezinhaCloud.sync({ replace: false, silent: true });
    if (window.CrechezinhaCartas) window.CrechezinhaCartas.aoEntrarNoApp();
    setTimeout(consumirAtalhoPendente, 450);
    if (!window.__crechezinhaTemAtalho) setTimeout(abrirAvisoDeNovidades, 700);
  });

  headerLogoBtn.addEventListener('click', () => {
    mostrarSplashDoNome();
    if (btnEnterLabel) btnEnterLabel.textContent = 'salvar meu nome';
  });

  const NOTICE_VERSION = '2026-11-reordenar-folhas';
  const NOVIDADES = [
    {
      titulo: 'agora dá pra reordenar as folhas do diário (até por cima de outro dia)',
      texto: 'na seção "páginas", as setinhas ▲▼ mudam a ordem das folhas no diário inteirinho: dá pra levar uma folha pra cima ou pra baixo, inclusive pra cima de outro dia. A data de cada folhinha continua a dela — quem muda é o lugar no livro, e o livrinho de folhear mostra a mesma ordem. Cada folha continua com a sua cor, a sua letra, os seus adesivos e os seus textinhos. ✧'
    },
    {
      titulo: 'agora dá pra SUBSTITUIR a foto (e o adesivo) sem tirar do lugar',
      texto: 'colocou uma foto ou um adesivo e quer trocar por outro? acende ele (na folha, na capinha, no iPod, no To-Do…) e toca no "🖼️ Substituir": escolhe a imagem ou o vídeo novo e ele entra no mesmo cantinho, com o mesmo tamanho, o mesmo giro, a mesma sombrinha, a mesma bordinha, o mesmo espelhado e o mesmíssimo textinho. Vale pra foto, gif, vídeo e pros adesivinhos do projeto — só o desenho da caneta fica de fora, porque ele é tinta na folha. ✧'
    },
    {
      titulo: 'figurinha recortada não vira mais um quadrado preto',
      texto: 'quando o navegador enchia e o app encolhia as imagens pra caber tudo, uma figurinha com fundo transparente podia aparecer com um quadrado preto atrás dela. O culpado era o JPEG, que não guarda transparência: ele pintava o fundo de preto. Agora imagem transparente fica em WebP (ou PNG) e o fundo continua transparente, do jeitinho que você recortou. ✧'
    },
    {
      titulo: 'a capinha pode ficar sem título (e sem subtítulo)',
      texto: 'no painelzinho da capinha tem uma caixinha nova, "sem título": marca ela e o título e o subtítulo somem da capa, do diário fechadinho e da abertura — a capinha fica só com a sua arte (os adesivos, os textinhos e a foto livre). Desmarca e os dois campos voltam do jeitinho que estavam. Cada diário lembra a sua escolha. ✧'
    },
    {
      titulo: 'agora dá pra devolver o backup pro diário',
      texto: 'antes só dava pra baixar o "🎀 Backup (.json)" — não tinha como pôr o arquivo de volta. Agora, no painelzinho da nuvem, tem o "📥 Devolver um backup": escolhe o arquivinho que você baixou e as memórias voltam pro diário, junto com a capinha, as tarefinhas e os recadinhos do calendário. Funciona até SEM internet (é tudo no seu aparelho), e o arquivo só acrescenta o que falta — nada do que você já escreveu se perde.'
    },
    {
      titulo: 'agora dá pra apagar os adesivos que você mesma fez',
      texto: 'na gavetinha de adesivos, a aba "✧ Meus" ganhou um botãozinho "☑️ escolher": marca quantos adesivos quiser (ou o "☑️ todos") e apaga tudo de uma vez. Os adesivos das pastinhas do projeto ficam de fora — esses são do app — e o que já está colado na folha fica onde está.'
    },
    {
      titulo: 'a capinha ficou no tamanho certo (em qualquer telinha)',
      texto: 'a capinha agora guarda a RÉGUA dela: os adesivos e os textinhos ficam no tamanho do caderninho em que você arrumou. Abrindo o diário num celular (ou girando a tela), aparece tudo no tamanho certo — sem adesivo gigante e sem adesivo sumindo na beiradinha.'
    },
    {
      titulo: 'o diário fechadinho mostra a sua capinha inteirinha',
      texto: 'no folhear, a capinha vira uma miniatura fofinha da sua capa: cada adesivo no lugarzinho dele e NENHUM escapando pra fora — era isso que fazia o adesivo do cantinho desaparecer.'
    },
    {
      titulo: 'correção de bugs',
      texto: 'o "✨ salvar na minha coleção" agora fecha a janelinha e guarda o adesivo no primeiro toque: nada de clicar várias vezes achando que não foi e nascerem vários adesivos sem querer (e o adesivinho novo já aparece na gaveta, na aba "Meus"). O avisinho de "o navegador estava cheio" saiu de cena: o app continua encolhendo as imagens pra caber tudo, mas isso é trabalho dele — você não precisa ver.'
    },
    {
      titulo: 'nunca mais o "sem espacinho pra guardar"',
      texto: 'aquele aviso de que o navegador estava sem espacinho aparecia e não adiantava nada: o app dizia que tinha encolhido as fotos e os desenhos, mas o encolhedor desistia caladinho. Agora ele encolhe de verdade — e o diário ficou quase pela METADE, porque o texto e os adesivos da primeira página não são mais guardados duas vezes. Escreve, desenha e cola adesivo sem medo. ♡'
    },
    {
      titulo: 'agora o site é um APP de verdade',
      texto: 'dá pra instalar a Crechezinha no celular: no Android aparece o convite "instalar app" e no iPhone é pelo "Compartilhar → Adicionar à Tela de Início". Ela ganha um ícone novinho (um caderninho com um coração e uma fitinha), abre sem a barra do navegador e — o melhor — abre SEM internet: suas memórias ficam guardadinhas no aparelho.'
    }
  ];

  const updateNotice = document.getElementById('update-notice');
  const newsList = document.getElementById('news-list');
  const btnNewsThanks = document.getElementById('btn-news-thanks');
  const updateNoticeBackdrop = document.getElementById('update-notice-backdrop');
  const newsMuteCheckbox = document.getElementById('news-mute-checkbox');
  const CHAVE_AVISO_VISTO = 'pooftie_seen_notice';
  const CHAVE_AVISO_SILENCIADO = 'pooftie_notice_muted';

  function modoDeTesteLigado() {
    try {
      return new URLSearchParams(window.location.search).get('dev') === '1';
    } catch (error) {
      return false;
    }
  }

  function renderNovidades() {
    if (!newsList) return;
    newsList.innerHTML = '';
    NOVIDADES.forEach((novidade) => {
      const row = document.createElement('div');
      row.className = 'news-item';
      row.innerHTML = `
        <img class="news-bullet" src="assets/images/pontos.webp" alt="">
        <div class="news-item-text">
          <span class="news-item-title">${novidade.titulo}</span>
          <span class="news-item-desc">${novidade.texto}</span>
        </div>
      `;
      newsList.appendChild(row);
    });
  }

  function abrirAvisoDeNovidades({ forcar = false } = {}) {
    if (!updateNotice) return false;
    if (!forcar && modoDeTesteLigado()) return false;
    if (!forcar && localStorage.getItem(CHAVE_AVISO_SILENCIADO) === NOTICE_VERSION) return false;
    if (newsMuteCheckbox) newsMuteCheckbox.checked = false;
    renderNovidades();
    updateNotice.classList.add('open');
    return true;
  }

  function fecharAvisoDeNovidades() {
    if (updateNotice) updateNotice.classList.remove('open');
    const silenciar = Boolean(newsMuteCheckbox && newsMuteCheckbox.checked);
    if (silenciar) localStorage.setItem(CHAVE_AVISO_SILENCIADO, NOTICE_VERSION);
    else localStorage.removeItem(CHAVE_AVISO_SILENCIADO);
    localStorage.setItem(CHAVE_AVISO_VISTO, NOTICE_VERSION);
    playSfx(1200, 0.15);
    return silenciar;
  }

  if (btnNewsThanks) btnNewsThanks.addEventListener('click', () => fecharAvisoDeNovidades());
  if (updateNoticeBackdrop) updateNoticeBackdrop.addEventListener('click', () => fecharAvisoDeNovidades());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && updateNotice?.classList.contains('open')) fecharAvisoDeNovidades();
  });

  const ipodBackdropEl = document.getElementById('ipod-backdrop');
  const bgModal = document.getElementById('bg-modal');
  const bgModalTitle = document.getElementById('bg-modal-title');
  const bgPhotoLabel = document.getElementById('bg-photo-label');
  const btnCloseBg = document.getElementById('btn-close-bg');
  const bgBackdrop = document.getElementById('bg-backdrop');
  const bgOptionsGrid = document.getElementById('bg-options-grid');
  const btnIpodBg = document.getElementById('btn-ipod-bg');
  const btnTodoBg = document.getElementById('btn-todo-bg');
  const todoView = document.getElementById('view-todo');
  const flipWallpaper = document.getElementById('flip-wallpaper');
  const flipBackdropEl = document.getElementById('flip-backdrop');
  const flipModalEl = document.getElementById('flip-modal');

  const bgList = [
    { label: 'Branco Limpo', src: '' },
    { label: 'Quarto Florido', src: 'assets/images/bg (1).webp' },
    { label: 'Quarto com Dossel', src: 'assets/images/bg (2).webp' },
    { label: 'Rendas & Ponto', src: 'assets/images/bg (3).webp' },
    { label: 'Borda Renda', src: 'assets/images/bg (4).webp' },
    { label: 'Quarto Rosa', src: 'assets/images/bg.webp' },
    { label: 'Casa Completa', src: 'assets/images/bg.webp' }
  ];

  const IPOD_BG_PATTERN = 'radial-gradient(#f1e6e0 1.2px, transparent 1.2px), radial-gradient(#f1e6e0 1.2px, #fffdfa 1.2px)';

  let bgAlvo = 'ipod';

  const CHAVE_DO_FUNDO = { ipod: 'pooftie_ipod_bg', todo: 'pooftie_todo_bg', flip: 'pooftie_flip_bg' };

  function videoDeFundoDe(elemento) {
    if (!elemento || typeof elemento.querySelector !== 'function') return null;
    return elemento.querySelector('.video-de-fundo');
  }

  function tirarVideoDeFundo(elemento) {
    const video = videoDeFundoDe(elemento);
    if (!video) return;
    if (typeof video.remove === 'function') {
      video.remove();
    } else if (typeof elemento.removeChild === 'function') {
      elemento.removeChild(video);
    }
  }

  function pintarFundo(elemento, bgSrc) {
    if (!elemento) return;
    if (ehVideoRef(bgSrc)) {
      elemento.style.backgroundImage = 'none';
      elemento.style.backgroundColor = '#fffdfa';
      let video = videoDeFundoDe(elemento);
      if (!video) {
        video = document.createElement('video');
        video.className = 'video-de-fundo';
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('aria-hidden', 'true');
        video.setAttribute('preload', 'auto');
        video.dataset.ref = bgSrc;
        if (typeof elemento.prepend === 'function') elemento.prepend(video);
        else if (Array.isArray(elemento.children)) {
          video.parentElement = elemento;
          elemento.children.unshift(video);
        }
      } else if (video.dataset.ref !== bgSrc) {
        video.dataset.ref = bgSrc;
        video.dataset.hidratado = '';
        video.removeAttribute('src');
      }
      hidratarVideo(video);
      return;
    }
    tirarVideoDeFundo(elemento);
    if (!bgSrc) {
      elemento.style.backgroundImage = IPOD_BG_PATTERN;
      elemento.style.backgroundSize = '24px 24px';
      elemento.style.backgroundPosition = '0 0, 12px 12px';
      elemento.style.backgroundColor = '#fffdfa';
    } else {
      elemento.style.backgroundImage = `url("${bgSrc}")`;
      elemento.style.backgroundSize = 'cover';
      elemento.style.backgroundPosition = 'center';
      elemento.style.backgroundColor = '#ffffff';
    }
  }

  function applyFundo(alvo, bgSrc) {
    const qual = CHAVE_DO_FUNDO[alvo] ? alvo : 'ipod';
    const elemento = qual === 'todo' ? todoView : (qual === 'flip' ? flipWallpaper : ipodBackdropEl);
    pintarFundo(elemento, bgSrc);
    if (flipModalEl) flipModalEl.classList.toggle('tem-fundo', Boolean(bgSrc));
    if (qual === 'flip' && flipBackdropEl) {
      flipBackdropEl.style.backdropFilter = bgSrc ? 'none' : '';
      flipBackdropEl.style.webkitBackdropFilter = bgSrc ? 'none' : '';
      flipBackdropEl.style.background = bgSrc ? 'rgba(70, 53, 41, 0.12)' : '';
    }
    if (elemento && typeof elemento.getBoundingClientRect === 'function') {
      void elemento.getBoundingClientRect();
    }
    try {
      localStorage.setItem(CHAVE_DO_FUNDO[qual], bgSrc);
    } catch (error) {
      console.warn('[crechezinha] não consegui guardar o papel de parede:', error.message);
      alert('Essa foto ficou pesada demais pra guardar 😢 tenta uma menor?');
    }
  }

  function applyIpodBg(bgSrc) { return applyFundo('ipod', bgSrc); }
  function applyTodoBg(bgSrc) { return applyFundo('todo', bgSrc); }
  function applyFlipBg(bgSrc) { return applyFundo('flip', bgSrc); }

  const savedIpodBg = localStorage.getItem(CHAVE_DO_FUNDO.ipod);
  if (savedIpodBg !== null) applyIpodBg(savedIpodBg);
  const savedTodoBg = localStorage.getItem(CHAVE_DO_FUNDO.todo);
  if (savedTodoBg !== null) applyTodoBg(savedTodoBg);
  const savedFlipBg = localStorage.getItem(CHAVE_DO_FUNDO.flip);
  if (savedFlipBg !== null) applyFlipBg(savedFlipBg);

  function renderBgOptions() {
    if (!bgOptionsGrid) return;
    bgOptionsGrid.innerHTML = '';
    bgList.forEach(bg => {
      const card = document.createElement('div');
      card.className = 'bg-thumb-card';
      card.innerHTML = `
        <img src="${bg.src || 'assets/images/crechezinha.webp'}" alt="${bg.label}">
        <span>${bg.label}</span>
      `;
      card.addEventListener('click', () => {
        applyFundo(bgAlvo, bg.src);
        bgModal.classList.remove('open');
        playSfx(1150);
      });
      bgOptionsGrid.appendChild(card);
    });
  }

  function abrirSeletorDeFundo(alvo) {
    bgAlvo = CHAVE_DO_FUNDO[alvo] ? alvo : 'ipod';
    if (bgModalTitle) {
      bgModalTitle.textContent = bgAlvo === 'todo'
        ? '🖼️ Papel de Parede do To-Do'
        : (bgAlvo === 'flip'
          ? '🖼️ Fundo do diário (e do deitado!)'
          : '🖼️ Papel de Parede do iPod');
    }
    if (bgPhotoLabel) {
      bgPhotoLabel.textContent = bgAlvo === 'todo'
        ? '🖼️ Usar uma foto ou vídeo meu no To-Do'
        : (bgAlvo === 'flip'
          ? '🖼️ Usar uma foto ou vídeo meu de fundo do diário'
          : '🖼️ Usar uma foto ou vídeo meu de fundo');
    }
    renderBgOptions();
    bgModal.classList.add('open');
    playSfx(900);
  }

  if (btnIpodBg) btnIpodBg.addEventListener('click', () => abrirSeletorDeFundo('ipod'));
  if (btnTodoBg) btnTodoBg.addEventListener('click', () => abrirSeletorDeFundo('todo'));

  const bgPhotoUpload = document.getElementById('bg-photo-upload');

  function guardarFotoDeFundo(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = imagemEmDataUrl(img, { lado: 1400, qualidade: 0.86 });
        if (!dataUrl) {
          alert('Não consegui abrir essa imagem 😢 tenta outra?');
          return;
        }
        applyFundo(bgAlvo, dataUrl);
        bgModal.classList.remove('open');
        playSfx(1150);
      };
      img.onerror = () => alert('Não consegui abrir essa imagem 😢 tenta outra?');
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function guardarVideoDeFundo(file) {
    try {
      const salvo = await guardarVideoNoBanco(file, `fundo-${bgAlvo}`);
      applyFundo(bgAlvo, salvo.referencia);
      bgModal.classList.remove('open');
      playSfx(1150);
      showToast(salvo.guardado === 'memoria'
        ? '🎬 vídeo de fundo colado — mas ele só fica nesta sessão 🌧️'
        : '🎬 vídeo de fundo colado! ele toca mudinho, em loop ✧');
    } catch (erro) {
      showToast('não consegui usar esse vídeo de fundo 🌧️ tenta outro?', true);
    }
  }

  if (bgPhotoUpload) {
    bgPhotoUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && ehArquivoDeVideo(file)) guardarVideoDeFundo(file);
      else if (file) guardarFotoDeFundo(file);
      e.target.value = '';
    });
  }
  if (btnCloseBg) btnCloseBg.addEventListener('click', () => bgModal.classList.remove('open'));
  if (bgBackdrop) bgBackdrop.addEventListener('click', () => bgModal.classList.remove('open'));

  const audioEl = document.getElementById('main-audio-player');
  const btnPlaySound = document.getElementById('btn-play-sound');
  const btnPrevSound = document.getElementById('btn-prev-sound');
  const btnNextSound = document.getElementById('btn-next-sound');
  const trackNameEl = document.getElementById('track-name');
  const musicDot = document.getElementById('music-dot');
  const tapeLeft = document.getElementById('tape-left');
  const tapeRight = document.getElementById('tape-right');
  const musicFileUpload = document.getElementById('music-file-upload');

  const btnOpenIpod = document.getElementById('btn-open-ipod');
  const ipodModal = document.getElementById('ipod-modal');
  const btnCloseIpod = document.getElementById('btn-close-ipod');
  const ipodAlbumArt = document.getElementById('ipod-album-art');
  const ipodStickersOverlay = document.getElementById('ipod-stickers-overlay');

  const ipodRefTitle = document.getElementById('ipod-ref-title');
  const ipodRefArtist = document.getElementById('ipod-ref-artist');
  const ipodRefAlbum = document.getElementById('ipod-ref-album');
  const ipodTimeCurrent = document.getElementById('ipod-time-current');
  const ipodTimeRemaining = document.getElementById('ipod-time-remaining');
  const ipodProgressFill = document.getElementById('ipod-progress-fill');
  const ipodScreenModeTitle = document.getElementById('ipod-screen-mode-title');
  const ipodStatusPlayIndicator = document.getElementById('ipod-status-play-indicator');

  const ipodNowPlayingView = document.getElementById('ipod-now-playing-view');
  const ipodMenuView = document.getElementById('ipod-menu-view');
  const ipodPlaylistContainer = document.getElementById('ipod-playlist-container');

  audioEl.loop = state.isLooping;

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  audioEl.addEventListener('timeupdate', () => {
    const pct = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
    if (ipodProgressFill) ipodProgressFill.style.width = pct + '%';
    if (ipodTimeCurrent) ipodTimeCurrent.textContent = formatTime(audioEl.currentTime);
    if (ipodTimeRemaining) {
      const remaining = (audioEl.duration || 0) - audioEl.currentTime;
      ipodTimeRemaining.textContent = '-' + formatTime(remaining);
    }
  });

  const ipodProgressTrack = document.getElementById('ipod-progress-track');
  if (ipodProgressTrack) {
    const seekFromPointer = (clientX) => {
      if (!audioEl.duration) return;
      const rect = ipodProgressTrack.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      audioEl.currentTime = ratio * audioEl.duration;
      if (ipodProgressFill) ipodProgressFill.style.width = (ratio * 100) + '%';
    };
    ipodProgressTrack.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      seekFromPointer(e.clientX);
      const onMove = (ev) => seekFromPointer(ev.clientX);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  function customPlaylist(key) {
    if (!PlaylistsModel) return null;
    return PlaylistsModel.findPlaylist(state.playlists || [], key);
  }

  function activePlaylist() {
    return customPlaylist(state.currentPlaylistKey) || PLAYLISTS_DO_PROJETO[state.currentPlaylistKey] || null;
  }

  function usandoPlaylistDaPessoa() {
    return Boolean(customPlaylist(state.currentPlaylistKey));
  }

  function playableTracks(playlist = activePlaylist()) {
    const tracks = playlist && Array.isArray(playlist.tracks) ? playlist.tracks : [];
    if (PlaylistsModel && playlist && playlist.tracks && !playlist.tracks.some((t) => 'hidden' in t)) {
      return PlaylistsModel.visibleTracks(playlist);
    }
    return tracks.filter((track) => !track.hidden);
  }

  function getActiveTracks() {
    const playlist = activePlaylist();
    return playlist ? playlist.tracks : [];
  }

  function currentPlayableIndex() {
    const tracks = playableTracks();
    return tracks.findIndex((track) => track === getActiveTracks()[state.currentTrackIndex]);
  }

  function atualizarMediaSession(track) {
    if (!track || !('mediaSession' in navigator)) return;
    const Meta = window.MediaMetadata;
    if (typeof Meta !== 'function') return;
    try {
      navigator.mediaSession.metadata = new Meta({
        title: track.name || 'musiquinha',
        artist: 'Middlepot',
        album: activePlaylist()?.name || 'crechezinha'
      });
    } catch (error) {   }
  }

  function avisarUsuario(mensagem, erro = false) {
    if (typeof showToast === 'function') showToast(mensagem, erro);
    else console.log('[crechezinha]', mensagem);
  }

  async function irParaMusica(indice) {
    const tracks = getActiveTracks();
    if (!tracks.length) {
      const playlist = activePlaylist();
      if (trackNameEl) trackNameEl.textContent = '♪ sem musiquinhas ainda';
      if (ipodRefTitle) ipodRefTitle.textContent = 'nenhuma música';
      if (ipodRefArtist) ipodRefArtist.textContent = playlist?.name || 'crechezinha';
      if (ipodRefAlbum) ipodRefAlbum.textContent = 'adiciona uma música na playlist ♡';
      renderIpodTracks();
      return false;
    }

    let posicao = PlaylistsModel
      ? activePlaylist().tracks.findIndex((track) => track === tracks[indice])
      : Math.max(0, Math.min(Number(indice) || 0, tracks.length - 1));
    if (posicao < 0) posicao = 0;
    if (PlaylistsModel && activePlaylist().tracks[posicao]?.hidden) {
      const livre = PlaylistsModel.nextPlayableIndex(activePlaylist(), posicao - 1, 1);
      if (livre < 0) {
        avisarUsuario('todas as músicas dessa playlist estão ocultas 🙈');
        return false;
      }
      posicao = livre;
    }

    state.currentTrackIndex = posicao;
    const current = tracks[posicao];
    const url = await resolverAudioDaMusica(current);

    if (!url) {
      avisarUsuario('não achei o arquivo dessa musiquinha 😢', true);
      if (trackNameEl) trackNameEl.textContent = `♪ ${current.name} (sem arquivo)`;
      renderIpodTracks();
      return false;
    }

    audioEl.src = url;
    audioEl.loop = Boolean(state.isLooping && !usandoPlaylistDaPessoa());

    if (trackNameEl) trackNameEl.textContent = '♪ ' + current.name;

    const playlist = activePlaylist();
    if (ipodRefTitle) ipodRefTitle.textContent = current.name;
    if (ipodRefArtist) ipodRefArtist.textContent = 'Middlepot';
    if (ipodRefAlbum) ipodRefAlbum.textContent = playlist?.name || '';
    if (ipodAlbumArt) ipodAlbumArt.src = playlist?.cover || 'assets/audio/base music/cover.webp';
    atualizarMediaSession(current);

    renderIpodTracks();

    if (PlaylistsModel) {
      const proxima = PlaylistsModel.nextPlayableIndex(activePlaylist(), posicao, 1);
      if (proxima >= 0 && tracks[proxima]) {
        resolverAudioDaMusica(tracks[proxima]).catch(() => {});
      }
    }

    return true;
  }

  function loadTrack(index) {
    const tracks = getActiveTracks();
    if (!tracks.length) { irParaMusica(0); return; }
    const posicao = ((Number(index) || 0) % tracks.length + tracks.length) % tracks.length;
    if (tracks[posicao] && tracks[posicao].hidden) {
      const pulada = PlaylistsModel
        ? PlaylistsModel.nextPlayableIndex(activePlaylist(), posicao - 1, 1)
        : posicao;
      if (pulada < 0) {
        avisarUsuario('essa música está oculta 🙈 desoculta ela pra ouvir!');
        return;
      }
      return irParaMusica(pulada);
    }
    return irParaMusica(posicao);
  }

  function pularMusica(direcao) {
    const alvo = currentPlayableIndex();
    const partida = alvo >= 0 ? alvo : (direcao > 0 ? -1 : 0);
    const proximo = PlaylistsModel ? PlaylistsModel.nextPlayableIndex(activePlaylist(), partida, direcao) : -1;
    if (proximo < 0) {
      avisarUsuario('só tem música oculta por aqui 🙈', true);
      return Promise.resolve(false);
    }
    return irParaMusica(proximo);
  }

  function togglePlay() {
    initAudioCtx();
    if (!audioEl.src) { loadTrack(state.currentTrackIndex); return; }

    if (audioEl.paused) {
      audioEl.play().then(() => {
        state.isPlayingMusic = true;
        btnPlaySound.textContent = '❚❚';
        if (musicDot) musicDot.classList.add('playing');
        if (tapeLeft) tapeLeft.classList.add('spinning');
        if (tapeRight) tapeRight.classList.add('spinning');
        if (ipodStatusPlayIndicator) ipodStatusPlayIndicator.textContent = '❚❚';
        renderIpodTracks();
      }).catch(err => console.log('Autoplay prevented:', err));
    } else {
      audioEl.pause();
      state.isPlayingMusic = false;
      btnPlaySound.textContent = '▶';
      if (musicDot) musicDot.classList.remove('playing');
      if (tapeLeft) tapeLeft.classList.remove('spinning');
      if (tapeRight) tapeRight.classList.remove('spinning');
      if (ipodStatusPlayIndicator) ipodStatusPlayIndicator.textContent = '▶';
      renderIpodTracks();
    }
  }

  audioEl.addEventListener('ended', () => {
    if (!state.isPlayingMusic) return;
    const proximo = PlaylistsModel ? PlaylistsModel.nextPlayableIndex(activePlaylist(), state.currentTrackIndex, 1) : -1;
    if (proximo < 0) {
      state.isPlayingMusic = false;
      if (btnPlaySound) btnPlaySound.textContent = '▶';
      renderIpodTracks();
      return;
    }
    irParaMusica(proximo).then((ok) => {
      if (ok) audioEl.play().catch(() => {});
    });
  });

  if (btnPlaySound) btnPlaySound.addEventListener('click', togglePlay);
  if (btnNextSound) btnNextSound.addEventListener('click', () => { pularMusica(1).then(() => { if (state.isPlayingMusic) audioEl.play().catch(() => {}); }); playSfx(1050); });
  if (btnPrevSound) btnPrevSound.addEventListener('click', () => { pularMusica(-1).then(() => { if (state.isPlayingMusic) audioEl.play().catch(() => {}); }); playSfx(850); });

  let isShowingMenu = false;
  function showNowPlaying() {
    isShowingMenu = false;
    if (ipodNowPlayingView) {
      ipodNowPlayingView.style.display = '';
      ipodNowPlayingView.classList.remove('hidden');
    }
    if (ipodMenuView) {
      ipodMenuView.style.display = '';
      ipodMenuView.classList.add('hidden');
    }
    if (ipodScreenModeTitle) ipodScreenModeTitle.textContent = 'Now Playing';
  }
  function showMenu() {
    isShowingMenu = true;
    if (ipodNowPlayingView) {
      ipodNowPlayingView.style.display = '';
      ipodNowPlayingView.classList.add('hidden');
    }
    if (ipodMenuView) {
      ipodMenuView.style.display = '';
      ipodMenuView.classList.remove('hidden');
    }
    if (ipodScreenModeTitle) ipodScreenModeTitle.textContent = 'Playlists';
    renderIpodTracks();
  }

  const wheelMenu = document.getElementById('wheel-menu');
  const wheelPlay = document.getElementById('wheel-play');
  const wheelNext = document.getElementById('wheel-next');
  const wheelPrev = document.getElementById('wheel-prev');
  const wheelCenter = document.getElementById('wheel-center');

  if (wheelMenu) wheelMenu.addEventListener('click', () => {
    if (isShowingMenu) showNowPlaying();
    else showMenu();
    playSfx(1200);
  });
  if (wheelPlay) wheelPlay.addEventListener('click', togglePlay);
  if (wheelNext) wheelNext.addEventListener('click', () => { pularMusica(1).then(() => { if (state.isPlayingMusic) audioEl.play().catch(() => {}); }); playSfx(1050); });
  if (wheelPrev) wheelPrev.addEventListener('click', () => { pularMusica(-1).then(() => { if (state.isPlayingMusic) audioEl.play().catch(() => {}); }); playSfx(850); });
  if (wheelCenter) wheelCenter.addEventListener('click', () => {
    if (isShowingMenu) showNowPlaying();
    else togglePlay();
  });

  function montarAbasDoIpod() {
    const caixa = document.querySelector('.ipod-menu-playlist-selector');
    if (!caixa) return;
    caixa.innerHTML = '';

    const todas = [
      ...Object.entries(PLAYLISTS_DO_PROJETO).map(([key, playlist]) => ({ key, playlist, daPessoa: false })),
      ...(state.playlists || []).map((playlist) => ({ key: playlist.id, playlist, daPessoa: true }))
    ];

    todas.forEach(({ key, playlist, daPessoa }) => {
      const btn = document.createElement('button');
      btn.className = 'ipod-tab-btn' + (key === state.currentPlaylistKey ? ' active' : '');
      btn.dataset.playlist = key;
      btn.textContent = `${daPessoa ? '🎧' : '🌸'} ${playlist.name}`;
      btn.title = daPessoa ? 'playlist sua' : 'playlist do projeto';
      btn.addEventListener('click', () => {
        caixa.querySelectorAll('.ipod-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentPlaylistKey = key;
        audioEl.loop = Boolean(state.isLooping && !usandoPlaylistDaPessoa());
        loadTrack(0);
        playSfx(950);
      });
      caixa.appendChild(btn);
    });

    const btnNova = document.createElement('button');
    btnNova.className = 'ipod-tab-btn nova';
    btnNova.type = 'button';
    btnNova.textContent = '✚ playlist';
    btnNova.title = 'Criar uma playlist nova';
    btnNova.addEventListener('click', () => {
      playSfx(1150);
      abrirPlaylists('nova');
    });
    caixa.appendChild(btnNova);
  }

  function renderIpodTracks() {
    if (!ipodPlaylistContainer) return;
    ipodPlaylistContainer.innerHTML = '';
    const tracks = getActiveTracks();

    if (!tracks.length) {
      const vazio = document.createElement('div');
      vazio.className = 'ipod-track-row empty';
      vazio.innerHTML = '<span>nenhuma musiquinha ainda 🌸</span><span>♡</span>';
      ipodPlaylistContainer.appendChild(vazio);
      return;
    }

    tracks.forEach((track, idx) => {
      const row = document.createElement('div');
      row.className = 'ipod-track-row'
        + (idx === state.currentTrackIndex ? ' active' : '')
        + (track.hidden ? ' hidden-track' : '');
      row.title = track.hidden ? 'música oculta — desoculta na playlist pra ouvir' : 'tocar essa musiquinha';
      row.innerHTML = `
        <span class="ipod-track-name">${track.name}</span>
        <span class="ipod-track-flag">${track.hidden ? '✕' : (idx === state.currentTrackIndex && state.isPlayingMusic ? '❚❚' : '▶')}</span>
      `;
      row.addEventListener('click', () => {
        if (track.hidden) {
          avisarUsuario('essa música está oculta 🙈 desoculta ela na playlist!');
          playSfx(400, 0.12, 'triangle');
          return;
        }
        loadTrack(idx);
        showNowPlaying();
        audioEl.play().then(() => {
          state.isPlayingMusic = true;
          btnPlaySound.textContent = '❚❚';
          if (musicDot) musicDot.classList.add('playing');
          if (tapeLeft) tapeLeft.classList.add('spinning');
          if (tapeRight) tapeRight.classList.add('spinning');
          if (ipodStatusPlayIndicator) ipodStatusPlayIndicator.textContent = '❚❚';
          renderIpodTracks();
        }).catch(() => {});
      });
      ipodPlaylistContainer.appendChild(row);
    });
  }

  if (btnOpenIpod) {
    btnOpenIpod.addEventListener('click', () => {
      renderIpodTracks();
      showNowPlaying();
      ipodModal.classList.add('open');
      playSfx(1100);
    });
  }
  if (btnCloseIpod) btnCloseIpod.addEventListener('click', () => {
    ipodModal.classList.remove('open');
    deselectSticker();
  });

  if (ipodBackdropEl) {
    ipodBackdropEl.addEventListener('click', (e) => {
      if (e.target === ipodBackdropEl) {
        ipodModal.classList.remove('open');
        deselectSticker();
      }
    });
  }

  const playlistsModal = document.getElementById('playlists-modal');
  const playlistsBackdrop = document.getElementById('playlists-backdrop');
  const playlistsBody = document.getElementById('playlists-body');
  const playlistsTitle = document.getElementById('playlists-title');
  const btnClosePlaylists = document.getElementById('btn-close-playlists');
  const btnIpodPlaylists = document.getElementById('btn-ipod-playlists');
  const playlistCoverUpload = document.getElementById('playlist-cover-upload');
  const playlistAudioUpload = document.getElementById('playlist-audio-upload');
  const playlistCoverLabel = document.getElementById('playlist-cover-label');
  const playlistAudioLabel = document.getElementById('playlist-audio-label');

  let playlistAberta = '';

  function abrirPlaylists(vista = 'lista') {
    if (vista === 'nova') {
      playlistAberta = '';
      const nome = window.prompt('como vai chamar a sua playlist? 🎧', 'minhas músicas');
      if (nome && nome.trim()) {
        state.playlists = PlaylistsModel.createPlaylist(state.playlists, { name: nome });
        guardarPlaylists();
        playlistAberta = state.playlists[state.playlists.length - 1].id;
        playSfx(1200);
      }
    } else if (vista && vista !== 'lista') {
      playlistAberta = vista;
    }
    renderPlaylistsModal();
    playlistsModal?.classList.add('open');
    montarAbasDoIpod();
    renderIpodTracks();
  }

  function fecharPlaylists() {
    definirPlaylistAberta('');
    playlistsModal?.classList.remove('open');
  }

  function definirPlaylistAberta(id) {
    playlistAberta = id || '';
  }

  function aplicarCapa(id, file) {
    const reader = new FileReader();
    reader.onload = (evento) => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = imagemEmDataUrl(img, { lado: 320, qualidade: 0.82 });
        if (!dataUrl) {
          avisarUsuario('não consegui abrir essa imagem 😢', true);
          return;
        }
        if (dataUrl.length > 600000) {
          avisarUsuario('essa capa ficou pesada demais 😢 tenta uma menor?', true);
          return;
        }
        state.playlists = PlaylistsModel.setCover(state.playlists, id, dataUrl);
        guardarPlaylists();
        renderPlaylistsModal();
        montarAbasDoIpod();
        renderIpodTracks();
        playSfx(1150);
      };
      img.onerror = () => avisarUsuario('não consegui abrir essa imagem 😢', true);
      img.src = evento.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPlaylistsLista() {
    if (playlistsTitle) playlistsTitle.textContent = '🎵 Minhas Playlists';
    if (playlistCoverLabel) playlistCoverLabel.style.display = 'none';
    if (playlistAudioLabel) playlistAudioLabel.style.display = 'none';

    const grade = document.createElement('div');
    grade.className = 'playlists-grid';

    (state.playlists || []).forEach((playlist) => {
      const resumo = PlaylistsModel.describe(playlist);
      const card = document.createElement('div');
      card.className = 'playlist-card' + (playlist.id === state.currentPlaylistKey ? ' is-playing' : '');
      card.innerHTML = `
        <img class="playlist-cover" src="${playlist.cover || 'assets/audio/base music/cover.webp'}" alt="">
        <div class="playlist-card-info">
          <span class="playlist-card-name">${playlist.name}</span>
          <span class="playlist-card-meta">${resumo.texto}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        definirPlaylistAberta(playlist.id);
        renderPlaylistsModal();
        playSfx(950);
      });
      grade.appendChild(card);
    });

    const novo = document.createElement('div');
    novo.className = 'playlist-card playlist-new-card';
    novo.innerHTML = '<span class="plus">＋</span><span>criar playlist</span>';
    novo.addEventListener('click', () => {
      const nome = window.prompt('como vai chamar a sua playlist? 🎧', 'minhas músicas');
      if (!nome || !nome.trim()) return;
      state.playlists = PlaylistsModel.createPlaylist(state.playlists, { name: nome });
      guardarPlaylists();
      definirPlaylistAberta(state.playlists[state.playlists.length - 1].id);
      renderPlaylistsModal();
      montarAbasDoIpod();
      renderIpodTracks();
      playSfx(1200);
    });
    grade.appendChild(novo);

    playlistsBody.innerHTML = '';
    playlistsBody.appendChild(grade);
  }

  function montarLinhaMusica(track, indice, opcoes) {
    const linha = document.createElement('div');
    linha.className = 'playlist-track-row' + (track.hidden ? ' is-hidden' : '');
    linha.innerHTML = `
      <span class="playlist-track-name">${indice + 1}. ${track.name}</span>
      ${opcoes.existente ? '<span class="playlist-track-tag">já está aqui</span>' : ''}
      ${track.hidden ? '<span class="playlist-track-tag">oculta</span>' : ''}
      ${opcoes.ocultavel ? `<button class="playlist-eye-btn" type="button" title="${track.hidden ? 'Desocultar (voltar a poder ouvir)' : 'Ocultar essa música'}">${track.hidden ? '🙈' : '👁️'}</button>` : ''}
      ${opcoes.removivel ? '<button class="playlist-track-del" type="button" title="Tirar da playlist">✕</button>' : ''}
    `;
    const olho = linha.querySelector('.playlist-eye-btn');
    if (olho) {
      olho.addEventListener('click', (evento) => {
        evento.stopPropagation();
        state.playlists = PlaylistsModel.toggleTrackHidden(state.playlists, opcoes.playlistId, track.id);
        guardarPlaylists();
        renderPlaylistsModal();
        renderIpodTracks();
        playSfx(track.hidden ? 1150 : 620);
        avisarUsuario(track.hidden ? '👁️ música desocultada, já pode ouvir!' : '🙈 música ocultada (ela continua aqui!)');
      });
    }
    const lixeira = linha.querySelector('.playlist-track-del');
    if (lixeira) {
      lixeira.addEventListener('click', (evento) => {
        evento.stopPropagation();
        if (!window.confirm(`Tirar "${track.name}" da playlist?`)) return;
        state.playlists = PlaylistsModel.removeTrack(state.playlists, opcoes.playlistId, track.id);
        guardarPlaylists();
        if (track.audioKey) {
          soltarUrlDeAudio(track.audioKey);
          MediaStore?.apagar(track.audioKey);
        }
        renderPlaylistsModal();
        renderIpodTracks();
        playSfx(550);
      });
    }
    return linha;
  }

  function renderPlaylistsDetalhe(playlist) {
    const resumo = PlaylistsModel.describe(playlist);
    if (playlistsTitle) playlistsTitle.textContent = '🎵 ' + playlist.name;
    if (playlistCoverLabel) playlistCoverLabel.style.display = '';
    if (playlistAudioLabel) playlistAudioLabel.style.display = '';

    playlistsBody.innerHTML = '';

    const voltar = document.createElement('button');
    voltar.type = 'button';
    voltar.className = 'playlist-ghost-btn';
    voltar.textContent = '‹ todas as playlists';
    voltar.addEventListener('click', () => {
      definirPlaylistAberta('');
      renderPlaylistsModal();
      playSfx(850);
    });
    playlistsBody.appendChild(voltar);

    const cabeca = document.createElement('div');
    cabeca.className = 'playlist-detail-head';
    cabeca.innerHTML = `
      <img class="playlist-detail-cover" id="playlist-detail-cover" src="${playlist.cover || 'assets/audio/base music/cover.webp'}" title="Trocar a capa" alt="">
      <div class="playlist-detail-fields">
        <input type="text" class="playlist-name-input" id="playlist-name-input" maxlength="40" value="${playlist.name.replace(/"/g, '&quot;')}">
        <span class="playlist-detail-meta">${resumo.texto}</span>
        <label class="playlist-loop-toggle">
          <input type="checkbox" id="playlist-loop-check" ${playlist.loop ? 'checked' : ''}>
          tocar em loop
        </label>
        <div class="playlist-detail-actions">
          <button class="playlist-ghost-btn" id="btn-play-playlist" type="button">▶ tocar</button>
          <label class="playlist-ghost-btn" for="playlist-cover-upload" style="cursor:pointer;">🖼️ capa</label>
          <label class="playlist-ghost-btn" for="playlist-audio-upload" style="cursor:pointer;">🎧 músicas</label>
          <button class="playlist-ghost-btn danger" id="btn-delete-playlist" type="button">🗑️ apagar</button>
        </div>
      </div>
    `;
    playlistsBody.appendChild(cabeca);

    const capa = cabeca.querySelector('#playlist-detail-cover');
    if (capa) capa.addEventListener('click', () => playlistCoverUpload?.click());

    const nomeInput = cabeca.querySelector('#playlist-name-input');
    if (nomeInput) {
      nomeInput.addEventListener('change', () => {
        state.playlists = PlaylistsModel.renamePlaylist(state.playlists, playlist.id, nomeInput.value);
        guardarPlaylists();
        arranjarPlaylistAberta();
        renderPlaylistsModal();
        montarAbasDoIpod();
        renderIpodTracks();
        playSfx(950);
      });
    }

    const loop = cabeca.querySelector('#playlist-loop-check');
    if (loop) {
      loop.addEventListener('change', () => {
        state.playlists = PlaylistsModel.replacePlaylist(state.playlists, playlist.id, { loop: loop.checked });
        guardarPlaylists();
        if (state.currentPlaylistKey === playlist.id) audioEl.loop = loop.checked;
        playSfx(900);
      });
    }

    const btnTocar = cabeca.querySelector('#btn-play-playlist');
    if (btnTocar) {
      btnTocar.addEventListener('click', async () => {
        state.currentPlaylistKey = playlist.id;
        audioEl.loop = Boolean(playlist.loop);
        montarAbasDoIpod();
        const primeira = PlaylistsModel.firstPlayableIndex(playlist);
        if (primeira < 0) {
          avisarUsuario('essa playlist só tem música oculta 🙈', true);
          return;
        }
        await irParaMusica(primeira);
        audioEl.play().then(() => { state.isPlayingMusic = true; renderIpodTracks(); }).catch(() => {});
        playSfx(1150);
      });
    }

    const btnApagar = cabeca.querySelector('#btn-delete-playlist');
    if (btnApagar) {
      btnApagar.addEventListener('click', () => {
        if (!window.confirm(`Apagar a playlist "${playlist.name}"? As músicas dela saem daqui.`)) return;
        (playlist.tracks || []).forEach((track) => {
          if (track.audioKey) {
            soltarUrlDeAudio(track.audioKey);
            MediaStore?.apagar(track.audioKey);
          }
        });
        state.playlists = PlaylistsModel.removePlaylist(state.playlists, playlist.id);
        guardarPlaylists();
        if (state.currentPlaylistKey === playlist.id) {
          state.currentPlaylistKey = 'base';
          loadTrack(0);
        }
        definirPlaylistAberta('');
        renderPlaylistsModal();
        montarAbasDoIpod();
        renderIpodTracks();
        playSfx(550);
      });
    }

    const tituloMusicas = document.createElement('div');
    tituloMusicas.className = 'playlist-section-title';
    tituloMusicas.innerHTML = `<span>músicas da playlist</span><span>${resumo.total}</span>`;
    playlistsBody.appendChild(tituloMusicas);

    if (!playlist.tracks.length) {
      const vazio = document.createElement('div');
      vazio.className = 'playlist-empty';
      vazio.innerHTML = 'nenhuma música ainda 🎧<br>usa o "🎧 músicas" aqui de cima ou o botão "＋" das músicas do projeto aqui embaixo!';
      playlistsBody.appendChild(vazio);
    } else {
      playlist.tracks.forEach((track, indice) => {
        playlistsBody.appendChild(montarLinhaMusica(track, indice, {
          playlistId: playlist.id,
          ocultavel: true,
          removivel: true
        }));
      });
    }

    const tituloProjeto = document.createElement('div');
    tituloProjeto.className = 'playlist-section-title';
    tituloProjeto.innerHTML = '<span>músicas do projeto</span><span>＋ pra adicionar</span>';
    playlistsBody.appendChild(tituloProjeto);

    Object.values(PLAYLISTS_DO_PROJETO).forEach((doProjeto) => {
      (doProjeto.tracks || []).forEach((track, indice) => {
        const jaTem = playlist.tracks.some((t) => t.name === track.name && (t.file === track.file || !t.audioKey));
        const linha = document.createElement('div');
        linha.className = 'playlist-track-row';
        linha.innerHTML = `
          <span class="playlist-track-name">${track.name}</span>
          <span class="playlist-track-tag">${doProjeto.name}</span>
          <button class="playlist-eye-btn" type="button" title="${jaTem ? 'já está na sua playlist' : 'adicionar na playlist'}" ${jaTem ? 'disabled' : ''}>${jaTem ? '✓' : '＋'}</button>
        `;
        linha.dataset.trackName = track.name;
        linha.dataset.trackFile = track.file || '';
        const botao = linha.querySelector('.playlist-eye-btn');
        if (botao) {
          botao.disabled = jaTem;
          botao.addEventListener('click', () => {
            state.playlists = PlaylistsModel.addTrack(state.playlists, playlist.id, { name: track.name, file: track.file });
            guardarPlaylists();
            renderPlaylistsModal();
            renderIpodTracks();
            playSfx(1100);
            avisarUsuario(`🎵 "${track.name}" entrou na playlist!`);
          });
        }
        playlistsBody.appendChild(linha);
      });
    });
  }

  function renderPlaylistsModal() {
    if (!playlistsBody) return;
    const playlist = playlistAberta ? PlaylistsModel.findPlaylist(state.playlists, playlistAberta) : null;
    if (playlist) renderPlaylistsDetalhe(playlist);
    else renderPlaylistsLista();
  }

  if (btnIpodPlaylists) btnIpodPlaylists.addEventListener('click', () => { playSfx(1100); abrirPlaylists('lista'); });
  if (btnClosePlaylists) btnClosePlaylists.addEventListener('click', fecharPlaylists);
  if (playlistsBackdrop) playlistsBackdrop.addEventListener('click', fecharPlaylists);

  if (playlistCoverUpload) {
    playlistCoverUpload.addEventListener('change', (evento) => {
      const file = evento.target.files[0];
      if (file && playlistAberta) aplicarCapa(playlistAberta, file);
      evento.target.value = '';
    });
  }

  if (playlistAudioUpload) {
    playlistAudioUpload.addEventListener('change', async (evento) => {
      const arquivos = [...(evento.target.files || [])];
      evento.target.value = '';
      if (!arquivos.length || !playlistAberta) return;
      const alvo = playlistAberta;
      for (const file of arquivos) {
        await subirMusica(file, alvo);
      }
      renderPlaylistsModal();
      renderIpodTracks();
    });
  }

  async function subirMusica(file, playlistId = null) {
    if (!file) return false;
    const alvoId = playlistId || (usandoPlaylistDaPessoa() ? state.currentPlaylistKey : (state.playlists[0]?.id || ''));
    if (!alvoId) {
      avisarUsuario('cria uma playlist primeiro pra guardar a música 🎧', true);
      return false;
    }

    const nome = file.name.replace(/\.[^/.]+$/, '').slice(0, 60) || 'musiquinha';
    const guardado = MediaStore ? await MediaStore.salvar(file) : { key: '', onde: 'memoria' };

    state.playlists = PlaylistsModel
      ? PlaylistsModel.addTrack(state.playlists, alvoId, { name: nome, audioKey: guardado.key })
      : state.playlists;
    guardarPlaylists();

    if (guardado.onde === 'memoria') {
      avisarUsuario('guardei a música só nesta sessão 😢 (o navegador não deixou salvar de vez)');
    } else {
      avisarUsuario(`🎧 "${nome}" entrou na playlist!`);
    }

    state.currentPlaylistKey = alvoId;
    const nova = PlaylistsModel ? PlaylistsModel.findPlaylist(state.playlists, alvoId) : null;
    if (nova) {
      const posicao = nova.tracks.findIndex((track) => track.audioKey === guardado.key || track.name === nome);
      await irParaMusica(posicao >= 0 ? posicao : 0);
      if (audioEl.paused) audioEl.play().then(() => { state.isPlayingMusic = true; }).catch(() => {});
    }
    montarAbasDoIpod();
    renderIpodTracks();
    if (playlistsModal?.classList.contains('open')) renderPlaylistsModal();
    return true;
  }

  if (musicFileUpload) {
    musicFileUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) subirMusica(file);
      e.target.value = '';
    });
  }

  montarAbasDoIpod();
  loadTrack(0);

  const views = {
    cover: document.getElementById('view-cover'),
    page: document.getElementById('view-page'),
    todo: document.getElementById('view-todo'),
    calendar: document.getElementById('view-calendar'),
    mural: document.getElementById('view-mural')
  };

  const navTabs = document.querySelectorAll('.nav-tab');
  const viewModeTitle = document.getElementById('view-mode-title');
  const notebookClasp = document.getElementById('notebook-clasp');

  function switchView(viewName) {
    state.currentView = viewName;
    if (typeof finalizarTraco === 'function') finalizarTraco();
    if (typeof ligarCaneta === 'function') ligarCaneta(false);
    deselectSticker();
    deselectTexto();
    playSfx(480, 0.08, 'triangle');
    Object.keys(views).forEach(key => {
      if (key === viewName) views[key].classList.add('active');
      else views[key].classList.remove('active');
    });
    navTabs.forEach(tab => {
      if (tab.dataset.view === viewName) tab.classList.add('active');
      else tab.classList.remove('active');
    });
    const muralTab = document.getElementById('btn-mural');
    if (muralTab) {
      muralTab.classList.toggle('active', viewName === 'mural');
      muralTab.setAttribute('aria-pressed', viewName === 'mural' ? 'true' : 'false');
    }
    if (viewName === 'page' && typeof medidaDaFolha === 'function') medidaDaFolha();
    if (viewName === 'page' && typeof agendarReancorarArte === 'function') agendarReancorarArte(160);
    if (viewName === 'page' && typeof ajeitarTextinhosDaFolha === 'function') {
      ajeitarTextinhosDaFolha(document.getElementById('page-texts-overlay'));
    }
    if (viewName === 'cover' && typeof ajeitarTextinhosDaFolha === 'function') {
      ajeitarTextinhosDaFolha(document.getElementById('cover-texts-overlay'));
    }
    if (viewName === 'cover' && typeof arrumarCapinhaNaRegua === 'function') arrumarCapinhaNaRegua();
    if (viewName === 'cover') viewModeTitle.textContent = 'capinha';
    else if (viewName === 'page') viewModeTitle.textContent = 'meu diário ୨୧';
    else if (viewName === 'todo') viewModeTitle.textContent = 'coisas para fazer';
    else if (viewName === 'calendar') {
      viewModeTitle.textContent = 'calendário ✦';
      renderCalendar();
    }
    else if (viewName === 'mural') {
      viewModeTitle.textContent = 'mural 📌';
      if (typeof renderMural === 'function') renderMural();
    }
  }

  navTabs.forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
  window.crechezinhaTrocarDeTela = switchView;

  const SELETORES_DO_DIARIO = '#notebook-clasp, #btn-open-flipbook';
  let ultimoToqueDoLivrinho = 0;
  let ondeComecouOToque = null;

  function abrirPeloToque() {
    const agora = Date.now();
    if (agora - ultimoToqueDoLivrinho < 600) return;
    ultimoToqueDoLivrinho = agora;
    abrirLivrinho();
  }

  document.addEventListener('pointerdown', (evento) => {
    ondeComecouOToque = { x: evento.clientX, y: evento.clientY };
  }, true);

  document.addEventListener('pointerup', (evento) => {
    const alvo = evento.target;
    const comecou = ondeComecouOToque;
    ondeComecouOToque = null;
    if (!alvo || !alvo.closest || !alvo.closest(SELETORES_DO_DIARIO)) return;
    if (comecou && Math.hypot(evento.clientX - comecou.x, evento.clientY - comecou.y) > 24) return;
    abrirPeloToque();
  }, true);

  if (notebookClasp) notebookClasp.addEventListener('click', abrirPeloToque);

  const coverTitleInput = document.getElementById('cover-title-input');
  const coverSubtitleInput = document.getElementById('cover-subtitle-input');
  const coverFreePhotoUpload = document.getElementById('cover-free-photo-upload');
  const coverStickersOverlay = document.getElementById('cover-stickers-overlay');
  const coverNotebook = document.getElementById('dayol-notebook');
  const coverTopBar = document.getElementById('cover-top-bar');
  const coverBlankTitleInput = document.getElementById('cover-blank-title');

  function aplicarModoDaCapa() {
    const semTitulo = Boolean(state.coverData && state.coverData.semTitulo);
    if (coverTopBar) coverTopBar.hidden = semTitulo;
    if (coverNotebook) coverNotebook.classList.toggle('is-sem-titulo', semTitulo);
    if (coverBlankTitleInput) {
      coverBlankTitleInput.checked = semTitulo;
      const rotulo = typeof coverBlankTitleInput.closest === 'function'
        ? coverBlankTitleInput.closest('.cover-mini-check')
        : null;
      if (rotulo && rotulo.classList) rotulo.classList.toggle('is-on', semTitulo);
    }
  }

  function definirCapaSemTitulo(semTitulo) {
    if (!state.coverData) state.coverData = {};
    state.coverData.semTitulo = Boolean(semTitulo);
    aplicarModoDaCapa();
    guardarNoDiario('pooftie_cover_data', JSON.stringify(state.coverData));
    agendarAutosave(3000);
    atualizarTituloDoLivrinho();
    if (livrinho) atualizarLivrinho({ irPara: 'mesma', forcar: true });
    return state.coverData.semTitulo;
  }

  if (coverBlankTitleInput) {
    coverBlankTitleInput.addEventListener('change', () => {
      const semTitulo = definirCapaSemTitulo(coverBlankTitleInput.checked);
      playSfx(semTitulo ? 720 : 980);
      showToast(semTitulo
        ? '✧ a capinha ficou só com a sua arte (sem título)'
        : '✧ o título e o subtítulo voltaram pra capinha');
    });
  }

  aplicarModoDaCapa();

  if (state.coverData) {
    if (state.coverData.title && coverTitleInput) coverTitleInput.value = state.coverData.title;
    if (state.coverData.subtitle && coverSubtitleInput) coverSubtitleInput.value = state.coverData.subtitle;
  }

  if (coverTitleInput) coverTitleInput.addEventListener('input', () => {
    state.coverData.title = coverTitleInput.value;
    guardarNoDiario('pooftie_cover_data', JSON.stringify(state.coverData));
    agendarAutosave(3000);
  });

  if (coverSubtitleInput) coverSubtitleInput.addEventListener('input', () => {
    state.coverData.subtitle = coverSubtitleInput.value;
    guardarNoDiario('pooftie_cover_data', JSON.stringify(state.coverData));
    agendarAutosave(3000);
  });

  async function guardarVideoNaCapa(file) {
    try {
      showToast('🎬 preparando o vídeo da capinha…');
      const info = await prepararVideoDoArquivo(file);
      const salvo = await guardarVideoNoBanco(file, 'capa');
      const largura = 220;
      const altura = (info.width > 0 && info.height > 0)
        ? Math.max(1, Math.round(largura * (info.height / info.width)))
        : 0;
      const adesivo = {
        content: salvo.referencia,
        mediaType: 'video',
        width: largura,
        ...(altura ? { height: altura } : {}),
        ...(info.poster ? { poster: info.poster } : {})
      };
      if (!placeSticker(adesivo, { x: 100, y: 140 }, coverStickersOverlay)) {
        throw new Error('sem capinha aberta');
      }
      salvarCapaNoNavegador();
      agendarAutosave(600);
      playSfx(1150);
      showToast('🎬 vídeo colado na capinha! ele toca mudinho, em loop ✧');
    } catch (erro) {
      showToast('não consegui usar esse vídeo na capinha 🌧️ tenta outro?', true);
    }
  }

  if (coverFreePhotoUpload) {
    coverFreePhotoUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (ehArquivoDeVideo(file)) {
        e.target.value = '';
        guardarVideoNaCapa(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        placeSticker({ content: event.target.result, width: 140 }, { x: 100, y: 140 }, coverStickersOverlay);
        playSfx(1150);
      };
      reader.readAsDataURL(file);
    });
  }

  let livrinho = null;

  const paperPatternSelect = document.getElementById('paper-pattern-select');
  const diaryPaper = document.getElementById('diary-paper');
  const diaryPaperColor = document.getElementById('diary-paper-color');
  const diaryDotColor = document.getElementById('diary-dot-color');
  const diaryDotSize = document.getElementById('diary-dot-size');
  const btnPageStyleAll = document.getElementById('btn-page-style-all');
  const btnPageStyleReset = document.getElementById('btn-page-style-reset');

  function applyPaperPattern(pattern) {
    const escolhida = (EntryStore && EntryStore.PADROES.includes(pattern)) ? pattern : 'lines';
    state.paperPattern = escolhida;
    if (state.draft) state.draft.pattern = escolhida;
    if (diaryPaper) diaryPaper.className = 'custom-diary-paper paper-' + escolhida;
    guardarNoDiario('pooftie_paper_pattern', escolhida);
    if (state.draft) guardarRascunhoNoNavegador();
    if (paperPatternSelect && paperPatternSelect.value !== escolhida) paperPatternSelect.value = escolhida;
    if (livrinho) livrinho.trocarFolhaDaPagina(escolhida);
    return escolhida;
  }

  if (paperPatternSelect) {
    paperPatternSelect.addEventListener('change', (e) => {
      applyPaperPattern(e.target.value);
      playSfx(850);
    });
    const savedPaper = (state.draft && state.draft.pattern)
      || lerTextoDoDiario('pooftie_paper_pattern', 'lines');
    paperPatternSelect.value = savedPaper;
    applyPaperPattern(savedPaper);
  }

  const btnOpenFlipbook = document.getElementById('btn-open-flipbook');
  const btnNextPage = document.getElementById('btn-next-page');

  function sincronizarPapeizinho() {
    if (diaryBody) diaryBody.value = state.draft.body || '';
    if (diaryTitle) diaryTitle.value = state.draft.title || '';
    if (diaryDateEl) diaryDateEl.value = state.draft.date || hojeStr();
    if (paperPatternSelect && state.draft.pattern) {
      const papel = state.draft.pattern;
      if (paperPatternSelect.value !== papel) paperPatternSelect.value = papel;
      if (diaryPaper) diaryPaper.className = 'custom-diary-paper paper-' + papel;
    }
    const daPagina = estiloDaPaginaAtual();
    pintarPapelDeEscrever(daPagina);
    sincronizarControlesDaCor(daPagina);
    if (window.CrechezinhaCartas && typeof window.CrechezinhaCartas.atualizarSelo === 'function') {
      window.CrechezinhaCartas.atualizarSelo();
    }
  }

  function trocarRascunho(novo) {
    if (timerRascunho) {
      clearTimeout(timerRascunho);
      timerRascunho = null;
    }
    const rascunhoAnterior = state.draft || {};
    const mesmoRascunho = Boolean(novo && novo.pageId)
      && Boolean(rascunhoAnterior.pageId)
      && novo.pageId === rascunhoAnterior.pageId;
    state.draft = {
      date: (novo && novo.date) || hojeStr(),
      pageId: (novo && novo.pageId) || '',
      title: (novo && novo.title) || '',
      body: (novo && novo.body) || '',
      pattern: (novo && novo.pattern) || state.paperPattern || 'lines',
      diaryStyle: (novo && novo.diaryStyle)
        || (mesmoRascunho && rascunhoAnterior.diaryStyle)
        || null,
      textStyle: (novo && novo.textStyle)
        || (mesmoRascunho && rascunhoAnterior.textStyle)
        || null,
      textSpans: Array.isArray(novo && novo.textSpans) ? novo.textSpans : [],
      texts: Array.isArray(novo && novo.texts) ? novo.texts : []
    };
    state.editingPageId = state.draft.pageId;
    state.textSpans = state.draft.textSpans;
    sincronizarPapeizinho();
    guardarRascunhoNoNavegador();
    return state.draft;
  }

  function salvarRascunho(extra = {}) {
    if (!state.draft) {
      state.draft = { date: hojeStr(), pageId: '', title: '', body: '', pattern: state.paperPattern || 'lines', textSpans: [], texts: [], diaryStyle: null, textStyle: null };
    }
    if (extra.titulo !== undefined) state.draft.title = extra.titulo;
    if (extra.texto !== undefined) state.draft.body = extra.texto;
    if (extra.data) state.draft.date = extra.data;
    if (extra.pageId !== undefined) state.draft.pageId = extra.pageId;
    if (extra.pattern) state.draft.pattern = extra.pattern;
    state.draft.textSpans = state.textSpans || [];
    state.draft.texts = textosDaPaginaAberta();
    guardarRascunhoNoNavegador();
    sincronizarPapeizinho();
    refrescarSelecaoDoLivrinho();
  }
  window.crechezinhaSalvarRascunho = salvarRascunho;

  function espelharRascunhoNoLivrinho() {
    if (!livrinho || !livrinho.estaAberto()) return;
    const alvo = livrinho.paginaEscrevivel();
    if (!alvo) return;
    if (state.editingPageId && alvo.page && alvo.page.pageId
      && alvo.page.pageId !== state.editingPageId && alvo.page.kind === 'entry') return;
    if (alvo.page && alvo.page.body === (state.draft.body || '')) return;
    livrinho.escreverNaPaginaAberta(state.draft.body || '');
    if (alvo.page) alvo.page.body = state.draft.body || '';
  }

  function criarLivrinho() {
    if (livrinho || !window.PooftieFlipbook) return livrinho;
    try {
      livrinho = window.PooftieFlipbook.montar({
        modelo: window.PooftieFlipModel,
        som: window.PooftiePageSound,
        estilo: window.PooftieDiaryStyling,
        textos: window.PooftiePageText,
        somenteLeitura: true,

        aoIrEscrever: (folhaDoLivrinho) => {
          const alvo = livrinho && livrinho.paginaEscrevivel ? livrinho.paginaEscrevivel() : null;
          const pagina = (alvo && alvo.page) || null;
          if (pagina && pagina.pageId) {
            state.draft.pageId = pagina.pageId;
            state.editingPageId = pagina.pageId;
          }
          if (pagina && pagina.date) state.draft.date = pagina.date;
          if (pagina && pagina.kind === 'entry') {
            const entrada = readEntries().find((e) => e.date === pagina.date) || null;
            carregarMemoriaNoRascunho(entrada, pagina.date, pagina.pageId);
          }
          guardarRascunhoNoNavegador();
          switchView('page');
          sincronizarPapeizinho();
          agendarAutosave(400);
          showToast('✎ pode escrever aqui na folhinha ⋆ ˚｡⋆');
        },

        aoDigitar: ({ texto, pagina, folha }) => {
          const data = state.draft.date
            || (pagina && pagina.date)
            || (folha && folha.left && folha.left.date)
            || hojeStr();
          salvarRascunho({ texto, data });
          agendarAutosave(3000);
          if (pagina) {
            pagina.body = texto;
            if (!pagina.date) pagina.date = data;
          }
          if (folha) {
            if (folha.left && !folha.left.date && folha.left.kind === 'blank') folha.left.date = data;
            if (folha.right && !folha.right.date && folha.right.kind === 'blank') folha.right.date = data;
          }
        },

        aoFolhear: (indice, folha) => {
          if (!folha) return;
          aoTrocarDeFolha(folha);
        },

        aoAbrir: (indice, folha) => {
          if (folha) aoTrocarDeFolha(folha);
          const alvo = livrinho.paginaEscrevivel();
          if (alvo) livrinho.corpoDoLado(alvo.lado)?.focus();
        },

        aoSalvar: async () => {
          const pagina = await guardarMemoriaAtual({ avisar: true });
          if (pagina) atualizarLivrinho({ irPara: 'mesma' });
        },

        aoFinalizarPagina: () => finalizarPaginaAtual(),

        aoProximaPagina: () => passarParaAProximaPagina(),

        aoTrocarFolha: (pattern) => {
          salvarRascunho({ pattern });
          applyPaperPattern(pattern);
        },

        aoDesenharAdesivos: (camada, _pagina, _lado, opcoes = {}) => {
          if (!camada) return;
          const seletor = opcoes.somenteEnfeites ? '.placed-sticker.is-enfeite' : '.placed-sticker';
          camada.querySelectorAll(seletor).forEach((adesivo) => {
            if (adesivo.dataset.controles === '1') return;
            adesivo.dataset.controles = '1';
            setupFreeStickerControls(adesivo);
          });
        },

        aoSairDaPagina: ({ page, camada }) => {
          if (!page) return;
          page.stickers = [
            ...(camada ? getStickersFromOverlay(camada) : []),
            ...registrosDasCanetinhas()
          ];
        },

        aoFechar: () => {
          salvarRascunho();
          if (typeof fecharCanetinhas === 'function') fecharCanetinhas();
          if (typeof desvirarATela === 'function') desvirarATela();
          agendarAutosave(400);
          const camada = livrinho && livrinho.camadaDaPaginaAberta
            ? livrinho.camadaDaPaginaAberta()
            : null;
          if (camada) {
            const alvo = livrinho.paginaEscrevivel();
            const daPagina = [
              ...getStickersFromOverlay(camada),
              ...registrosDasCanetinhas()
            ];
            if (alvo && alvo.page) alvo.page.stickers = daPagina;
            trocarAdesivosDaFolha(daPagina);
          }
          if (state.draft && state.draft.date !== hojeStr()) {
            carregarMemoriaNoRascunho(readEntries().find((e) => e.date === hojeStr()) || null, hojeStr());
          }
          deselectSticker();
        },

        aoSelecionarTexto: () => refrescarSelecaoDoLivrinho()
      });
      window.CrechezinhaFlip = livrinho;
      atualizarLivrinho({ irPara: 'mesma' });
      sincronizarPinturaComLivrinho();
    } catch (error) {
      console.warn('[crechezinha] o livrinho não abriu:', error.message);
      livrinho = null;
    }
    return livrinho;
  }

  function sincronizarPinturaComLivrinho() {
    if (!livrinho) return;
    livrinho.trocarCor(state.diaryStyle || {}, state.coverStyle || {});
    const body = document.getElementById('diary-body');
    const book = document.getElementById('flip-book');
    if (body && book) {
      const letra = Styling.makeTextDecoration(state.textDecoration || {});
      book.style.setProperty('--flip-font', body.style.fontFamily || "'Caveat', cursive");
      book.style.setProperty('--flip-ink', letra.color || 'var(--text-chocolate)');
      book.style.setProperty('--flip-stroke', letra.outline ? `2px ${letra.outlineColor}` : '0');
      book.style.setProperty('--flip-paint-order', letra.outline ? 'stroke fill' : 'normal');
    }
  }

  function atualizarLivrinho({ irPara = 'mesma', indice, paginaLivre, forcar = false } = {}) {
    const book = criarLivrinho();
    if (!book) return;
    const ref = { irPara };
    if (Number.isFinite(indice)) ref.indice = indice;
    if (paginaLivre) ref.paginaLivre = paginaLivre;
    if (forcar) ref.forcar = true;
    const medida = medidaDaFolha();
    if (medida) ref.medidaDaFolha = medida;
    book.definirConteudo(readEntries(), capaVivaParaOLivrinho(), ref);
    sincronizarPinturaComLivrinho();
    reselecionarAdesivoRedesenhado();
  }

  function reselecionarAdesivoRedesenhado() {
    const velho = state.selectedStickerEl;
    if (!velho) return;
    if (document.contains(velho)) return;
    state.selectedStickerEl = null;
    const caminhas = [
      typeof camadaDasCanetinhas === 'function' ? camadaDasCanetinhas() : null,
      camadaDeAdesivosDoLivrinho(),
      getActiveOverlay()
    ].filter(Boolean);
    if (!caminhas.length) { hideEffectsPanel(); return; }
    const chave = assinaturaDaMidiaDoAdesivo(velho);
    const x = parseFloat(velho.style.left) || 0;
    const y = parseFloat(velho.style.top) || 0;
    const candidatos = caminhas
      .flatMap((caminha) => [...caminha.querySelectorAll('.placed-sticker')])
      .filter((el) => assinaturaDaMidiaDoAdesivo(el) === chave)
      .sort((a, b) => {
        const da = Math.hypot((parseFloat(a.style.left) || 0) - x, (parseFloat(a.style.top) || 0) - y);
        const db = Math.hypot((parseFloat(b.style.left) || 0) - x, (parseFloat(b.style.top) || 0) - y);
        return da - db;
      });
    if (candidatos.length) selectSticker(candidatos[0]);
    else hideEffectsPanel();
  }

  function paginaLivreAtual() {
    return {
      date: state.draft.date || hojeStr(),
      id: state.draft.pageId || '',
      pattern: state.draft.pattern || state.paperPattern || 'lines',
      title: state.draft.title || '',
      diaryStyle: state.draft.diaryStyle || null,
      textStyle: state.draft.textStyle || null,
      medida: medidaDaFolha()
    };
  }

  function carregarMemoriaNoRascunho(entry, data, pageId) {
    const dia = data || (entry && entry.date) || hojeStr();
    const entrada = (entry && entry.date === dia)
      ? entry
      : (readEntries().find((e) => e.date === dia) || entry || null);
    const paginas = entrada && Array.isArray(entrada.pages) ? entrada.pages : [];
    const escolhida = (pageId && paginas.find((p) => p.id === pageId))
      || paginas[0]
      || null;

    const mesmaFolha = Boolean(state.draft)
      && state.draft.date === dia
      && (escolhida ? state.draft.pageId === escolhida.id : !state.draft.pageId);
    if (state.draft && !mesmaFolha) {
      salvarRascunho();
      if (temOQueGuardar()) {
        salvarAutomatico({ nuvem: false, avisarNaTela: false }).catch(() => false);
      }
    }

    trocarRascunho({
      date: dia,
      pageId: escolhida ? escolhida.id : '',
      title: escolhida ? escolhida.title || '' : '',
      body: escolhida ? escolhida.body || '' : '',
      pattern: escolhida ? escolhida.pattern : (state.paperPattern || 'lines'),
      diaryStyle: escolhida ? escolhida.diaryStyle : null,
      textStyle: escolhida ? escolhida.textStyle : null,
      textSpans: escolhida && Array.isArray(escolhida.textSpans) ? escolhida.textSpans : [],
      texts: escolhida && Array.isArray(escolhida.texts) ? escolhida.texts : []
    });
    state.editingId = entrada ? entrada.id : null;
    state.editingPageId = escolhida ? escolhida.id : '';
    trocarAdesivosDaFolha(escolhida ? escolhida.stickers : []);
    trocarTextosDaFolha(escolhida ? escolhida.texts : []);
    espelharRascunhoNoLivrinho();
  }

  function trocarAdesivosDaFolha(lista) {
    if (!pageStickersOverlay || typeof restoreOverlayStickers !== 'function') return;
    pageStickersOverlay.innerHTML = '';
    restoreOverlayStickers(Array.isArray(lista) ? lista : [], pageStickersOverlay);
    if (typeof reancorarArteDaPaginaAberta === 'function') reancorarArteDaPaginaAberta();
  }

  function aoTrocarDeFolha(folha) {
    const alvo = livrinho && livrinho.paginaEscrevivel();
    const pagina = (alvo && alvo.page) || null;
    if (!pagina) return;
    const data = pagina.date || hojeStr();

    if (pagina.pageId && pagina.pageId === state.editingPageId) {
      salvarRascunho({ data, pattern: pagina.pattern || state.draft.pattern });
      return;
    }

    if (pagina.kind === 'entry') {
      const entry = pagina.entry || readEntries().find((e) => e.date === data) || null;
      carregarMemoriaNoRascunho(entry, data, pagina.pageId);
      return;
    }

    trocarRascunho({
      date: data,
      pageId: pagina.pageId || '',
      title: pagina.title || '',
      body: pagina.body || '',
      pattern: pagina.pattern || state.paperPattern || 'lines',
      diaryStyle: pagina.diaryStyle || null,
      textStyle: pagina.textStyle || null,
      textSpans: [],
      texts: Array.isArray(pagina.texts) ? pagina.texts : []
    });
    state.editingId = null;
    state.editingPageId = pagina.pageId || '';
    trocarAdesivosDaFolha(pagina.stickers || []);
    trocarTextosDaFolha(pagina.texts || []);
  }

  function paginaDoRascunho() {
    const data = state.draft.date || hojeStr();
    const anterior = readEntries().find((e) => e.date === data) || null;
    const paginas = anterior && Array.isArray(anterior.pages) ? anterior.pages : [];
    const conhecida = paginas.find((p) => p.id === state.draft.pageId) || null;
    const id = (conhecida && conhecida.id)
      || (EntryStore ? EntryStore.novoIdPagina(data) : `pag-${data}-${Date.now()}`);

    return {
      id,
      title: (state.draft.title || '').trim(),
      body: state.draft.body || '',
      pattern: state.draft.pattern || state.paperPattern || 'lines',
      textSpans: state.textSpans || [],
      diaryStyle: state.draft.diaryStyle || null,
      textStyle: state.draft.textStyle || null,
      medida: medidaDaFolha(),
      stickers: adesivosDaFolhaViva(),
      texts: textosDaPaginaAberta(conhecida),
      ...(conhecida && conhecida.letterFrom
        ? { letterFrom: conhecida.letterFrom, letterArt: conhecida.letterArt || null }
        : {}),
      createdAt: (conhecida && conhecida.createdAt) || new Date().toISOString()
    };
  }

  async function guardarMemoriaAtual({ avisar = false, nuvem = true } = {}) {
    const rascunhoDaVez = state.draft;
    salvarRascunho();
    const data = state.draft.date || hojeStr();
    const pagina = paginaDoRascunho();
    const versaoNoInicio = paginaVersao;
    const salva = await escreverPagina(data, pagina);

    if (salva) {
      if (paginaVersao === versaoNoInicio) paginaSuja = false;
      const entrada = readEntries().find((e) => e.date === data) || null;
      if (state.draft === rascunhoDaVez) {
        state.draft.pageId = salva.id;
        state.editingPageId = salva.id;
        state.editingId = entrada ? entrada.id : null;
        guardarRascunhoNoNavegador();
      }
      if (nuvem && window.CrechezinhaCloud && entrada) window.CrechezinhaCloud.pushEntry(entrada);
      sincronizarWidget();
      if (estadoDoEspaco.enxugou) estadoDoEspaco.enxugou = false;
      if (window.CrechezinhaCartas && typeof window.CrechezinhaCartas.atualizarSelo === 'function') {
        window.CrechezinhaCartas.atualizarSelo();
      }
    }

    if (avisar) {
      if (salva) showToast('🎀 Tudo guardadinho com carinho!');
      else showToast('⚠️ Não consegui guardar agora — tenta de novo, tá?', true);
    }
    return salva ? { ...salva, date: data } : null;
  }

  async function finalizarPaginaAtual({ avisar = true } = {}) {
    criarLivrinho();
    const data = state.draft.date || hojeStr();
    const salva = await guardarMemoriaAtual();
    if (!salva) {
      if (avisar) {
        showToast('⚠️ o navegador está sem espacinho — tira uma foto/desenho grande ou usa o Backup .json da Nuvem', true);
      }
      return null;
    }

    const novo = EntryStore ? EntryStore.novoIdPagina(data) : `pag-${data}-${Date.now()}`;
    const corDaAnterior = state.draft.diaryStyle || null;
    const letraDaAnterior = state.draft.textStyle || null;
    trocarRascunho({
      date: data,
      pageId: novo,
      title: '',
      body: '',
      pattern: state.paperPattern || 'lines',
      diaryStyle: corDaAnterior,
      textStyle: letraDaAnterior,
      textSpans: [],
      texts: []
    });
    state.editingId = (readEntries().find((e) => e.date === data) || {}).id || null;
    state.editingPageId = novo;
    trocarAdesivosDaFolha([]);
    trocarTextosDaFolha([]);
    if (livrinho) atualizarLivrinho({ irPara: 'ultima', paginaLivre: paginaLivreAtual(), forcar: true });

    const alvo = livrinho ? livrinho.paginaEscrevivel() : null;
    if (alvo && alvo.page) {
      alvo.page.body = '';
      livrinho.escreverNaPaginaAberta('');
    }
    if (alvo) livrinho.corpoDoLado(alvo.lado)?.focus();

    if (avisar) showToast('✧ página salva! pode escrever a próxima ⋆ ˚｡⋆');
    playSfx(1050);
    return salva;
  }

  function passarParaAProximaPagina() {
    criarLivrinho();
    const noLivrinho = Boolean(livrinho && livrinho.estaAberto() && !livrinho.fechado);

    const diaAtual = state.draft.date || hojeStr();
    const entradaAtual = readEntries().find((e) => e.date === diaAtual) || null;
    const paginaJaGuardada = Boolean(entradaAtual
      && (entradaAtual.pages || []).some((p) => p.id === state.draft.pageId));
    const temEscrito = Boolean((state.draft.body || '').trim() || (state.draft.title || '').trim());
    const temAdesivo = Boolean(pageStickersOverlay && pageStickersOverlay.querySelector('.placed-sticker'));
    const temTextinho = Boolean(pageTextsOverlay && pageTextsOverlay.querySelector('.placed-text'));
    if (paginaJaGuardada || temEscrito || temAdesivo || temTextinho) guardarMemoriaAtual();
    else salvarRascunho();

    const proximoDia = proximoDiaLivre();
    const novo = EntryStore ? EntryStore.novoIdPagina(proximoDia) : `pag-${proximoDia}-${Date.now()}`;
    const corDaAnterior = state.draft.diaryStyle || null;
    const letraDaAnterior = state.draft.textStyle || null;
    trocarRascunho({
      date: proximoDia,
      pageId: novo,
      title: '',
      body: '',
      pattern: state.paperPattern || 'lines',
      diaryStyle: corDaAnterior,
      textStyle: letraDaAnterior,
      textSpans: [],
      texts: []
    });
    state.editingId = null;
    state.editingPageId = novo;
    trocarAdesivosDaFolha([]);
    trocarTextosDaFolha([]);
    if (livrinho) atualizarLivrinho({ irPara: 'ultima', paginaLivre: paginaLivreAtual(), forcar: true });
    if (noLivrinho && livrinho) {
      const alvo = livrinho.paginaEscrevivel();
      if (alvo && alvo.page) {
        alvo.page.body = '';
        livrinho.escreverNaPaginaAberta('');
      }
      if (alvo) livrinho.corpoDoLado(alvo.lado)?.focus();
    }
    const dataBonita = proximoDia.split('-').reverse().join('/');
    showToast(noLivrinho
      ? '⋆ ˚｡⋆ folhinha nova prontinha pra escrever!'
      : `⋆ ˚｡⋆ dia novo (${dataBonita}) prontinho pra escrever!`);
    playSfx(1050);
  }

  async function abrirLivrinho({ abrirDireto = false } = {}) {
    if (temOQueGuardar()) await guardarMemoriaAtual({ nuvem: false });
    const fundoDoDiario = localStorage.getItem(CHAVE_DO_FUNDO.flip);
    if (fundoDoDiario !== null) applyFlipBg(fundoDoDiario);
    criarLivrinho();
    if (!livrinho) {
      const semFlipbook = !window.PooftieFlipbook;
      avisarUsuario(semFlipbook
        ? 'essa página está com uma versão velha guardada 😢 puxa a tela pra baixo pra recarregar que o livrinho volta!'
        : 'o livrinho não conseguiu abrir agora 😢', true);
      switchView('page');
      return;
    }
    atualizarLivrinho({ irPara: 'primeira', paginaLivre: paginaLivreAtual(), forcar: true });
    let posicao = state.draft.pageId ? livrinho.folhaDaPagina(state.draft.pageId) : -1;
    if (posicao < 0) posicao = livrinho.folhaDaData(state.draft.date);
    if (posicao >= 0) {
      livrinho.definirConteudo(readEntries(), capaVivaParaOLivrinho(), { indice: posicao, forcar: true });
    }
    const folhaEscolhida = posicao >= 0 ? posicao : livrinho.indice;
    sincronizarPinturaComLivrinho();
    garantirRetratoInicial();
    if (abrirDireto) {
      livrinho.abrir(folhaEscolhida);
      livrinho.abrirLivro(folhaEscolhida).then(() => {
        const alvo = livrinho.paginaEscrevivel();
        if (alvo) livrinho.corpoDoLado(alvo.lado)?.focus();
      });
    } else {
      livrinho.abrir(folhaEscolhida);
    }
    setTimeout(() => {
      const alvo = livrinho && livrinho.paginaEscrevivel();
      if (alvo) livrinho.corpoDoLado(alvo.lado)?.focus();
    }, 440);
    playSfx(1000);
  }

  if (btnOpenFlipbook) btnOpenFlipbook.addEventListener('click', abrirPeloToque);
  if (btnNextPage) btnNextPage.addEventListener('click', () => passarParaAProximaPagina());

  const btnFinishPage = document.getElementById('btn-finish-page');
  if (btnFinishPage) {
    btnFinishPage.addEventListener('click', () => {
      if (!livrinho || !livrinho.estaAberto()) {
        criarLivrinho();
      }
      finalizarPaginaAtual();
    });
  }

  sincronizarPapeizinho();
  setTextSpans(state.draft.textSpans || []);

  let timerRascunho = null;
  function agendarRascunho() {
    if (timerRascunho) clearTimeout(timerRascunho);
    timerRascunho = setTimeout(() => {
      timerRascunho = null;
      salvarRascunho();
    }, 350);
  }

  if (diaryBody) diaryBody.addEventListener('input', () => {
    state.draft.body = diaryBody.value;
    agendarRascunho();
    agendarAutosave(3000);
    espelharRascunhoNoLivrinho();
  });

  if (diaryTitle) diaryTitle.addEventListener('input', () => {
    state.draft.title = diaryTitle.value;
    agendarRascunho();
    agendarAutosave(3000);
  });

  window.addEventListener('beforeunload', () => {
    if (timerRascunho) clearTimeout(timerRascunho);
    guardarRascunhoNoNavegador();
    salvarAutomatico({ nuvem: false, avisarNaTela: false }).catch(() => false);
  });

  const newTodoInput = document.getElementById('new-todo-input');
  const btnAddTodo = document.getElementById('btn-add-todo');
  const todoItemsList = document.getElementById('todo-items-list');
  const todoStickersOverlay = document.getElementById('todo-stickers-overlay');
  const todoPageArea = document.getElementById('todo-page-area');

  const BRILHOS = ['✦', '✧', '⋆', '✩', '✫', '✷'];

  function playYayConfetti(area, ponto) {
    if (!area) return;
    const caixa = area.getBoundingClientRect();
    const centroX = ponto ? ponto.x : caixa.width / 2;
    const centroY = ponto ? ponto.y : caixa.height / 2;

    for (let i = 0; i < 16; i++) {
      const confete = document.createElement('span');
      confete.className = 'todo-confete';
      confete.textContent = BRILHOS[i % BRILHOS.length];
      const angulo = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
      const distancia = caixa.width * (0.28 + Math.random() * 0.42);
      confete.style.left = `${centroX}px`;
      confete.style.top = `${centroY}px`;
      confete.style.setProperty('--dx', `${Math.cos(angulo) * distancia}px`);
      confete.style.setProperty('--dy', `${Math.sin(angulo) * distancia * 0.72 - 26}px`);
      confete.style.setProperty('--giro', `${Math.round((Math.random() - 0.5) * 540)}deg`);
      confete.style.animationDelay = `${Math.random() * 0.12}s`;
      confete.style.fontSize = `${12 + Math.round(Math.random() * 7)}px`;
      confete.style.setProperty('--brilho-cor', i % 2 ? '#d98aa4' : '#ffffff');
      area.appendChild(confete);
      setTimeout(() => confete.remove(), 1500);
    }

    const yay = document.createElement('span');
    yay.className = 'todo-yay';
    yay.textContent = 'yay!';
    yay.style.left = `${Math.min(Math.max(centroX, 34), caixa.width - 34)}px`;
    yay.style.top = `${Math.max(centroY - 18, 12)}px`;
    area.appendChild(yay);
    setTimeout(() => yay.remove(), 1200);

    playSfx(880, 0.16, 'sine');
    setTimeout(() => playSfx(1180, 0.14, 'sine'), 90);
  }

  function renderTodoList() {
    if (!todoItemsList) return;
    todoItemsList.innerHTML = '';
    state.todoItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'todo-item-row';
      row.innerHTML = `
        <div class="todo-item-left">
          <div class="todo-checkbox ${item.checked ? 'checked' : ''}">${item.checked ? '✓' : ''}</div>
          <span class="todo-text ${item.checked ? 'checked' : ''}">${item.text}</span>
        </div>
        <button class="todo-del-btn" title="Excluir">✕</button>
      `;
      row.querySelector('.todo-item-left').addEventListener('click', () => {
        const caixaArea = todoPageArea?.getBoundingClientRect();
        const caixaLinha = row.getBoundingClientRect();
        const ponto = caixaArea
          ? { x: caixaLinha.left - caixaArea.left + caixaLinha.width / 2, y: caixaLinha.top - caixaArea.top + caixaLinha.height / 2 }
          : null;

        item.checked = !item.checked;
        localStorage.setItem('pooftie_todos', JSON.stringify(state.todoItems));
        renderTodoList();
        if (item.checked) playYayConfetti(todoPageArea || todoItemsList, ponto);
        else playSfx(700);
      });
      row.querySelector('.todo-del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        state.todoItems.splice(index, 1);
        localStorage.setItem('pooftie_todos', JSON.stringify(state.todoItems));
        renderTodoList();
        playSfx(550);
      });
      todoItemsList.appendChild(row);
    });
  }

  if (btnAddTodo) btnAddTodo.addEventListener('click', () => {
    const text = newTodoInput ? newTodoInput.value.trim() : '';
    if (text) {
      state.todoItems.push({ text, checked: false });
      localStorage.setItem('pooftie_todos', JSON.stringify(state.todoItems));
      newTodoInput.value = '';
      renderTodoList();
      playSfx(980);
    }
  });

  if (newTodoInput) newTodoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAddTodo.click();
  });

  renderTodoList();

  const pageStickersOverlay = document.getElementById('page-stickers-overlay');
  const calendarStickersOverlay = document.getElementById('calendar-stickers-overlay');

  function camadaDaPaginaAbertaNoLivrinho() {
    if (!livrinho || !livrinho.estaAberto() || livrinho.fechado) return null;
    return livrinho.camadaDaPaginaAberta ? livrinho.camadaDaPaginaAberta() : null;
  }

  function camadaDeAdesivosDoLivrinho() {
    const camada = camadaDaPaginaAbertaNoLivrinho();
    return camada && camada.classList.contains('is-live') ? camada : null;
  }

  function getActiveOverlay() {
    if (ipodModal && ipodModal.classList.contains('open')) return ipodStickersOverlay;
    const doLivrinho = camadaDeAdesivosDoLivrinho();
    if (doLivrinho) return doLivrinho;
    if (state.currentView === 'cover') return coverStickersOverlay;
    if (state.currentView === 'page') return pageStickersOverlay;
    if (state.currentView === 'todo') return todoStickersOverlay;
    return calendarStickersOverlay;
  }

  function deselectSticker() {
    if (state.selectedStickerEl) {
      state.selectedStickerEl.classList.remove('selected');
      state.selectedStickerEl = null;
    }
    hideEffectsPanel();
  }

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.placed-sticker') && !e.target.closest('.sticker-effects-panel')) {
      deselectSticker();
    }
  });

  function selectSticker(el) {
    if (state.selectedStickerEl) state.selectedStickerEl.classList.remove('selected');
    state.selectedStickerEl = el;
    el.classList.add('selected');
    if (typeof deselectTexto === 'function') deselectTexto();
    showEffectsPanel();
    sincronizarCaptionDoPainel();
  }

  const stickerEffectsPanel = document.getElementById('sticker-effects-panel');
  const btnFxUp = document.getElementById('btn-fx-up');
  const btnFxDown = document.getElementById('btn-fx-down');
  const btnFxShadow = document.getElementById('btn-fx-shadow');
  const stickerShadowColor = document.getElementById('sticker-shadow-color');

  function showEffectsPanel() {
    if (stickerEffectsPanel) stickerEffectsPanel.style.display = 'flex';
    posicionarPainelDeEfeitos();
  }

  function posicionarPainelDeEfeitos() {
    if (!stickerEffectsPanel || !state.selectedStickerEl) return;
    const caixa = state.selectedStickerEl.getBoundingClientRect();
    const meioDaTela = (window.innerWidth || 0) / 2;
    const centroX = caixa.left + caixa.width / 2;
    stickerEffectsPanel.classList.toggle('is-esquerda', centroX > meioDaTela);
  }

  function hideEffectsPanel() {
    if (stickerEffectsPanel) stickerEffectsPanel.style.display = 'none';
    refreshFxTextHint();
  }

  if (btnFxUp) btnFxUp.addEventListener('click', () => {
    if (!state.selectedStickerEl) return;
    const z = (parseInt(state.selectedStickerEl.style.zIndex) || 12) + 1;
    state.selectedStickerEl.style.zIndex = z;
    sincronizarAdesivoMexido(state.selectedStickerEl);
    playSfx(1050);
  });

  if (btnFxDown) btnFxDown.addEventListener('click', () => {
    if (!state.selectedStickerEl) return;
    const z = Math.max(1, (parseInt(state.selectedStickerEl.style.zIndex) || 12) - 1);
    state.selectedStickerEl.style.zIndex = z;
    sincronizarAdesivoMexido(state.selectedStickerEl);
    playSfx(850);
  });

  if (btnFxShadow) btnFxShadow.addEventListener('click', () => {
    if (!state.selectedStickerEl) return;
    const el = state.selectedStickerEl;
    el.classList.toggle('with-shadow');
    sincronizarCaptionDoPainel();
    sincronizarAdesivoMexido(el);
    agendarAutosave(900);
    playSfx(900);
  });

  if (stickerShadowColor) stickerShadowColor.addEventListener('input', () => {
    if (!state.selectedStickerEl) return;
    state.selectedStickerEl.style.setProperty('--sticker-shadow', stickerShadowColor.value);
    state.selectedStickerEl.classList.add('with-shadow');
    sincronizarAdesivoMexido(state.selectedStickerEl);
    sincronizarCaptionDoPainel();
    agendarAutosave(1200);
  });

  const btnFxBorder = document.getElementById('btn-fx-border');
  const stickerBorderColor = document.getElementById('sticker-border-color');

  if (btnFxBorder) btnFxBorder.addEventListener('click', () => {
    if (!state.selectedStickerEl) return;
    const el = state.selectedStickerEl;
    el.classList.toggle('with-border');
    if (el.classList.contains('with-border') && stickerBorderColor) {
      el.style.setProperty('--sticker-border', stickerBorderColor.value || '#ffffff');
    }
    sincronizarCaptionDoPainel();
    sincronizarAdesivoMexido(el);
    agendarAutosave(900);
    playSfx(el.classList.contains('with-border') ? 1150 : 700);
  });

  if (stickerBorderColor) stickerBorderColor.addEventListener('input', () => {
    if (!state.selectedStickerEl) return;
    state.selectedStickerEl.style.setProperty('--sticker-border', stickerBorderColor.value);
    state.selectedStickerEl.classList.add('with-border');
    sincronizarAdesivoMexido(state.selectedStickerEl);
    sincronizarCaptionDoPainel();
    agendarAutosave(1200);
  });

  const Pen = window.PooftiePenStroke || null;
  const btnPen = document.getElementById('btn-pen');
  const penBar = document.getElementById('pen-bar');
  const penColor = document.getElementById('pen-color');
  const penSize = document.getElementById('pen-size');
  const penPreview = document.getElementById('pen-preview');
  const btnPenDone = document.getElementById('btn-pen-done');

  let tracoAtivo = null;
  let canetaLigada = false;

  function pincelDaCaneta(largura) {
    if (!Pen) return 5;
    const folha = Number(largura) || (pageStickersOverlay && pageStickersOverlay.clientWidth) || 0;
    return Pen.pincel(state.penSize || Pen.GROSSURA_PADRAO, folha);
  }

  function camadaDaCaneta() {
    if (state.currentView === 'cover') return coverStickersOverlay;
    if (state.currentView === 'page') return pageStickersOverlay;
    return null;
  }

  function atualizarPenPreview() {
    if (!penPreview) return;
    const cor = (Pen && Pen.corValida(state.penColor)) || '#463529';
    const largura = Math.max(3, Math.min(22, pincelDaCaneta() + 2));
    penPreview.style.setProperty('background', cor);
    penPreview.style.width = `${largura}px`;
    penPreview.style.height = `${largura}px`;
  }

  function ligarCaneta(ligada) {
    const querLigada = Boolean(ligada) && Boolean(Pen);
    if (querLigada === canetaLigada) return canetaLigada;
    canetaLigada = querLigada;
    state.penActive = canetaLigada;
    if (penBar) penBar.hidden = !canetaLigada;
    if (btnPen) {
      btnPen.classList.toggle('is-on', canetaLigada);
      btnPen.setAttribute('aria-pressed', canetaLigada ? 'true' : 'false');
    }
    [pageStickersOverlay, coverStickersOverlay].forEach((caminha) => {
      if (caminha) caminha.classList.toggle('desenhando', canetaLigada);
    });
    if (canetaLigada) {
      deselectSticker();
      deselectTexto();
      atualizarPenPreview();
      playSfx(1000);
      showToast('🖊️ pode desenhar! escolhe a cor e a ponta aí embaixo ⋆');
    } else {
      finalizarTraco();
      playSfx(760);
    }
    return canetaLigada;
  }

  function comecarTraco(evento) {
    if (!canetaLigada || !Pen) return null;
    const caminha = camadaDaCaneta();
    if (!caminha) {
      showToast('a canetinha desenha na folha do diário e na capinha ✎');
      return null;
    }
    const caixa = caminha.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    if (typeof canvas.getContext !== 'function' || !canvas.getContext('2d')) return null;

    const largura = caminha.clientWidth || Math.round(caixa.width) || 1;
    const altura = caminha.clientHeight || Math.round(caixa.height) || 1;
    canvas.width = largura;
    canvas.height = altura;
    canvas.className = 'pen-canvas';
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;
    const contexto = canvas.getContext('2d');
    const ponto = pontoDoEvento(evento, caixa);

    tracoAtivo = {
      caminha,
      canvas,
      contexto,
      caixa,
      largura,
      altura,
      cor: (Pen.corValida(state.penColor)) || Pen.COR_PADRAO,
      pincel: pincelDaCaneta(largura),
      pontos: [ponto]
    };
    caminha.appendChild(canvas);
    pintarTracoAtivo();
    return tracoAtivo;
  }

  function pontoDoEvento(evento, caixa) {
    const x = Number(evento && evento.clientX);
    const y = Number(evento && evento.clientY);
    return {
      x: (Number.isFinite(x) ? x : 0) - caixa.left,
      y: (Number.isFinite(y) ? y : 0) - caixa.top
    };
  }

  function continuarTraco(evento) {
    if (!tracoAtivo) return;
    const ponto = pontoDoEvento(evento, tracoAtivo.caixa);
    const ultimo = tracoAtivo.pontos[tracoAtivo.pontos.length - 1];
    const andou = Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y);
    if (andou < 0.6) return;
    tracoAtivo.pontos.push(ponto);
    pintarTracoAtivo();
  }

  function pintarTracoAtivo() {
    if (!tracoAtivo || !Pen) return;
    const { contexto, largura, altura, cor, pincel } = tracoAtivo;
    if (!contexto) return;
    contexto.clearRect(0, 0, largura, altura);
    contexto.strokeStyle = cor;
    contexto.lineWidth = pincel;
    contexto.lineCap = 'round';
    contexto.lineJoin = 'round';
    const d = Pen.caminho(tracoAtivo.pontos);
    if (!d) return;
    try {
      contexto.stroke(new Path2D(d));
    } catch (erro) {
      const pontos = tracoAtivo.pontos;
      contexto.beginPath();
      pontos.forEach((p, i) => (i ? contexto.lineTo(p.x, p.y) : contexto.moveTo(p.x, p.y)));
      contexto.stroke();
    }
  }

  function finalizarTraco() {
    const traco = tracoAtivo;
    tracoAtivo = null;
    if (!traco || !Pen) return false;
    const caminha = traco.caminha;
    const pontosLimpos = Pen.limpar(traco.pontos);
    if (!pontosLimpos.length) {
      if (traco.canvas && traco.canvas.parentElement) traco.canvas.remove();
      return false;
    }

    try {
      const desenho = Pen.encaixar(traco.pontos, { pincel: traco.pincel, cor: traco.cor });
      const url = rasterizarDesenho(desenho, traco);
      if (traco.canvas && traco.canvas.parentElement) traco.canvas.remove();
      if (!url) return false;
      const el = placeSticker({
        kind: 'drawing',
        content: url,
        width: desenho.width,
        height: desenho.height,
        hasShadow: false,
        caption: '',
        locked: false
      }, { x: desenho.x, y: desenho.y }, caminha, { silencioso: true });
      if (el) {
        el.style.left = `${desenho.x}px`;
        el.style.top = `${desenho.y}px`;
        el.style.zIndex = String(20 + caminha.querySelectorAll('.placed-sticker').length);
        if (caminha === coverStickersOverlay) {
          state.coverStickers = getStickersFromOverlay(caminha);
          salvarCapaNoNavegador();
        }
        sincronizarAdesivoMexido(el);
        agendarAutosave(700);
      }
      playSfx(900, 0.08, 'triangle');
      return Boolean(el);
    } catch (erro) {
      if (traco.canvas && traco.canvas.parentElement) traco.canvas.remove();
      console.warn('[crechezinha] não consegui guardar esse desenho:', erro && erro.message);
      return false;
    }
  }

  function rasterizarDesenho(desenho, traco) {
    if (!desenho || !desenho.pontos.length) return '';
    const largura = Math.max(6, Math.ceil(desenho.width));
    const altura = Math.max(6, Math.ceil(desenho.height));
    const canvas = document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') return '';
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext('2d');
    if (!contexto) return '';
    contexto.clearRect(0, 0, largura, altura);
    contexto.strokeStyle = desenho.cor;
    contexto.lineWidth = desenho.pincel;
    contexto.lineCap = 'round';
    contexto.lineJoin = 'round';
    const d = Pen.caminho(desenho.pontos);
    try {
      contexto.stroke(new Path2D(d));
    } catch (erro) {
      contexto.beginPath();
      desenho.pontos.forEach((p, i) => (i ? contexto.lineTo(p.x, p.y) : contexto.moveTo(p.x, p.y)));
      contexto.stroke();
    }
    try {
      return canvas.toDataURL('image/png');
    } catch (erro) {
      return '';
    }
  }

  function ligarCanetaNaCaminha(caminha) {
    if (!caminha) return;
    caminha.addEventListener('pointerdown', (evento) => {
      if (!canetaLigada) return;
      if (evento.target && evento.target.closest && evento.target.closest('.placed-sticker')) return;
      if (evento.button !== undefined && evento.button !== 0) return;
      if (!comecarTraco(evento)) return;
      evento.preventDefault();
      arrastandoAdesivo = true;
      const aoMover = (ev) => {
        if (!tracoAtivo) return;
        if (ev.cancelable) ev.preventDefault();
        continuarTraco(ev);
      };
      const aoSoltar = () => {
        window.removeEventListener('pointermove', aoMover);
        window.removeEventListener('pointerup', aoSoltar);
        window.removeEventListener('pointercancel', aoSoltar);
        arrastandoAdesivo = false;
        finalizarTraco();
      };
      window.addEventListener('pointermove', aoMover);
      window.addEventListener('pointerup', aoSoltar);
      window.addEventListener('pointercancel', aoSoltar);
    });
  }

  ligarCanetaNaCaminha(pageStickersOverlay);
  ligarCanetaNaCaminha(coverStickersOverlay);

  if (btnPen) {
    btnPen.addEventListener('click', () => ligarCaneta(!canetaLigada));
  }
  if (btnPenDone) {
    btnPenDone.addEventListener('click', () => {
      finalizarTraco();
      ligarCaneta(false);
    });
  }
  if (penColor) {
    penColor.addEventListener('input', () => {
      state.penColor = (Pen && Pen.corValida(penColor.value)) || '#463529';
      guardarNoDiario('pooftie_pen_color', state.penColor);
      atualizarPenPreview();
    });
  }
  if (penSize) {
    penSize.addEventListener('change', () => {
      state.penSize = penSize.value;
      guardarNoDiario('pooftie_pen_size', state.penSize);
      atualizarPenPreview();
      playSfx(950);
    });
  }

  function aplicarCanetaNaTela() {
    if (penColor && Pen && Pen.corValida(state.penColor)) penColor.value = state.penColor;
    if (penSize && state.penSize) penSize.value = state.penSize;
    atualizarPenPreview();
  }
  aplicarCanetaNaTela();


  const btnFxFlip = document.getElementById('btn-fx-flip');

  if (btnFxFlip) btnFxFlip.addEventListener('click', () => {
    if (!state.selectedStickerEl) return;
    const el = state.selectedStickerEl;
    const espelhado = el.dataset.flip === '1';
    if (espelhado) delete el.dataset.flip;
    else el.dataset.flip = '1';
    applyStickerTransform(el);
    sincronizarCaptionDoPainel();
    sincronizarAdesivoMexido(el);
    agendarAutosave(900);
    playSfx(espelhado ? 800 : 1100);
  });

  const stickerCaptionInput = document.getElementById('sticker-caption-input');
  const btnCaptionAbove = document.getElementById('btn-caption-above');
  const btnCaptionBelow = document.getElementById('btn-caption-below');

  const btnFxReplace = document.getElementById('btn-fx-replace');
  const stickerReplaceUpload = document.getElementById('sticker-replace-upload');
  let adesivoParaSubstituir = null;

  function ehMidiaSubstituivel(el) {
    if (!el || el.dataset.kind === 'drawing' || el.classList.contains('is-drawing')) return false;
    const midia = midiaDoAdesivo(el);
    return Boolean(midia && (midia.tagName === 'IMG' || midia.tagName === 'VIDEO'));
  }

  function atualizarBotaoDeSubstituir(el) {
    if (!btnFxReplace) return;
    const pode = Boolean(el && ehMidiaSubstituivel(el));
    btnFxReplace.hidden = !pode;
    btnFxReplace.setAttribute('aria-hidden', pode ? 'false' : 'true');
  }

  if (btnFxReplace) {
    btnFxReplace.addEventListener('click', () => {
      const el = state.selectedStickerEl;
      if (!el || !ehMidiaSubstituivel(el) || !stickerReplaceUpload) return;
      adesivoParaSubstituir = el;
      stickerReplaceUpload.value = '';
      stickerReplaceUpload.click();
    });
  }

  function larguraDaMidiaDoAdesivo(el) {
    const midia = midiaDoAdesivo(el);
    const largura = parseFloat(midia && midia.style.width)
      || (midia && midia.offsetWidth)
      || 85;
    return Math.max(1, Math.round(largura));
  }

  function trocarMidiaDoAdesivo(el, nova) {
    const antiga = midiaDoAdesivo(el);
    if (!antiga || !antiga.parentNode) return null;
    if (typeof antiga.replaceWith === 'function') antiga.replaceWith(nova);
    else {
      antiga.parentNode.insertBefore(nova, antiga);
      antiga.parentNode.removeChild(antiga);
    }
    return nova;
  }

  function concluirTrocaDaMidia(el, oQue) {
    const caminha = el && el.parentElement;
    if (!caminha) return;
    if (caminha === coverStickersOverlay) {
      state.coverStickers = getStickersFromOverlay(caminha);
      salvarCapaNoNavegador();
    } else if (caminha === calendarStickersOverlay) {
      guardarNoNavegador('pooftie_calendar_stickers', JSON.stringify(getStickersFromOverlay(caminha)));
    } else if (caminha === todoStickersOverlay) {
      guardarNoNavegador('pooftie_todo_stickers', JSON.stringify(getStickersFromOverlay(caminha)));
    } else if (caminha === ipodStickersOverlay) {
      guardarNoNavegador('pooftie_ipod_stickers', JSON.stringify(getStickersFromOverlay(caminha)));
    }
    if (caminha.classList && caminha.classList.contains('flip-stickers')) {
      sincronizarAdesivosDoLivrinho({ guardar: true });
    }
    sincronizarAdesivoMexido(el);
    agendarAutosave(600);
    sincronizarCaptionDoPainel();
    playSfx(1150);
    showToast(`🖼️ ${oQue} trocada! ela ficou no mesmo lugarzinho ✧`);
  }

  function lerFotoComoDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evento) => resolve((evento.target && evento.target.result) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  function ehArquivoGif(file) {
    return Boolean(file)
      && (/^image\/gif/i.test(file.type || '') || /\.gif$/i.test(file.name || ''));
  }

  async function substituirAdesivoPorFoto(el, file) {
    const original = await lerFotoComoDataUrl(file);
    if (!original) throw new Error('não consegui ler a foto');
    const imagem = await carregarImagem(original);
    if (!(imagem.naturalWidth || imagem.width)) throw new Error('não consegui abrir a foto');

    const dataUrl = ehArquivoGif(file)
      ? original
      : (imagemEmDataUrl(imagem, { lado: 1600, qualidade: 0.88 }) || original);
    const largura = larguraDaMidiaDoAdesivo(el);
    const img = document.createElement('img');
    img.alt = 'foto';
    img.src = dataUrl;
    img.style.width = `${largura}px`;
    img.style.height = '';
    trocarMidiaDoAdesivo(el, img);
    el.classList.remove('is-video');
  }

  async function substituirAdesivoPorVideo(el, file) {
    showToast('🎬 preparando o vídeo…');
    const info = await prepararVideoDoArquivo(file);
    const salvo = await guardarVideoNoBanco(file, 'adesivo');
    const largura = larguraDaMidiaDoAdesivo(el);
    const altura = (info.width > 0 && info.height > 0)
      ? Math.max(1, Math.round(largura * (info.height / info.width)))
      : 0;
    const video = document.createElement('video');
    video.className = 'sticker-video';
    video.dataset.ref = salvo.referencia;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    video.setAttribute('aria-label', 'vídeo');
    if (info.poster) video.setAttribute('poster', info.poster);
    video.style.width = `${largura}px`;
    if (altura) video.style.height = `${altura}px`;
    trocarMidiaDoAdesivo(el, video);
    el.classList.add('is-video');
    hidratarVideo(video);
    return salvo.guardado;
  }

  if (stickerReplaceUpload) {
    stickerReplaceUpload.addEventListener('change', async (evento) => {
      const file = evento.target.files && evento.target.files[0];
      evento.target.value = '';
      const el = (adesivoParaSubstituir && adesivoParaSubstituir.isConnected)
        ? adesivoParaSubstituir
        : state.selectedStickerEl;
      adesivoParaSubstituir = null;
      if (!file || !el || !ehMidiaSubstituivel(el)) return;
      try {
        if (ehArquivoDeVideo(file)) {
          const guardado = await substituirAdesivoPorVideo(el, file);
          concluirTrocaDaMidia(el, 'a memória');
          if (guardado === 'memoria') {
            showToast('🎬 vídeo trocado — ele só fica nesta sessão 🌧️', true);
          }
        } else {
          await substituirAdesivoPorFoto(el, file);
          concluirTrocaDaMidia(el, 'a foto');
        }
      } catch (erro) {
        showToast('não consegui trocar a foto 🌧️ tenta outra?', true);
      }
    });
  }

  function sincronizarCaptionDoPainel() {
    const el = state.selectedStickerEl;
    if (btnFxShadow) {
      btnFxShadow.textContent = (el && el.classList.contains('with-shadow')) ? '☁️ Sombra ✓' : '☁️ + Sombra';
    }
    if (stickerShadowColor && el) {
      const cor = String(el.style.getPropertyValue('--sticker-shadow') || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(cor) && stickerShadowColor.value !== cor) stickerShadowColor.value = cor;
    }
    if (btnFxBorder) {
      btnFxBorder.textContent = (el && el.classList.contains('with-border')) ? '⬜ Bordinha ✓' : '⬜ + Bordinha';
    }
    if (stickerBorderColor && el) {
      const corBorda = String(el.style.getPropertyValue('--sticker-border') || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(corBorda) && stickerBorderColor.value !== corBorda) {
        stickerBorderColor.value = corBorda;
      }
    }
    if (btnFxFlip) {
      btnFxFlip.textContent = (el && el.dataset.flip === '1') ? '🔁 Espelhado ✓' : '🔁 Espelhar';
    }
    atualizarBotaoDeSubstituir(el);
    atualizarBotaoDeTrancar();
    if (!stickerCaptionInput) return;
    const { caption, position } = captionDoAdesivo(el);
    if (stickerCaptionInput.value !== caption) stickerCaptionInput.value = caption;
    if (btnCaptionAbove) btnCaptionAbove.classList.toggle('active', position === 'above');
    if (btnCaptionBelow) btnCaptionBelow.classList.toggle('active', position !== 'above');
  }

  function anotarCaption(el, texto, posicao) {
    aplicarCaption(el, texto, posicao);
    if (el) {
      el.dataset.caption = String(texto == null ? '' : texto).trim();
      el.dataset.captionPosition = posicao === 'above' ? 'above' : 'below';
      sincronizarAdesivoMexido(el);
    }
  }

  if (stickerCaptionInput) {
    stickerCaptionInput.addEventListener('input', () => {
      if (!state.selectedStickerEl) return;
      const posicao = state.selectedStickerEl.dataset.captionPosition || 'below';
      anotarCaption(state.selectedStickerEl, stickerCaptionInput.value, posicao);
    });
    stickerCaptionInput.addEventListener('change', () => {
      if (state.selectedStickerEl) playSfx(1050);
    });
  }

  if (btnCaptionAbove) {
    btnCaptionAbove.addEventListener('click', () => {
      if (!state.selectedStickerEl) return;
      anotarCaption(state.selectedStickerEl, stickerCaptionInput ? stickerCaptionInput.value : '', 'above');
      sincronizarCaptionDoPainel();
      playSfx(1100);
    });
  }

  if (btnCaptionBelow) {
    btnCaptionBelow.addEventListener('click', () => {
      if (!state.selectedStickerEl) return;
      anotarCaption(state.selectedStickerEl, stickerCaptionInput ? stickerCaptionInput.value : '', 'below');
      sincronizarCaptionDoPainel();
      playSfx(950);
    });
  }

  const btnFxLock = document.getElementById('btn-fx-lock');

  function objetoAceso() {
    return state.selectedStickerEl || textoSelecionado || null;
  }

  function atualizarBotaoDeTrancar() {
    if (!btnFxLock) return;
    const el = objetoAceso();
    const trancado = Boolean(el && el.classList.contains('is-locked'));
    btnFxLock.textContent = trancado ? '🔓 Destrancar' : '🔒 Trancar';
    btnFxLock.classList.toggle('is-on', trancado);
  }

  if (btnFxLock) {
    btnFxLock.addEventListener('click', () => {
      const el = objetoAceso();
      if (!el) return;
      const trancando = !el.classList.contains('is-locked');
      el.classList.toggle('is-locked', trancando);
      const corpo = el.querySelector('.placed-text-body');
      if (corpo && corpo.isContentEditable !== undefined) {
        corpo.setAttribute('contenteditable', trancando ? 'false' : 'true');
      }
      if (el.classList.contains('placed-text')) sincronizarTextosDaTela();
      sincronizarAdesivoMexido(el);
      if (coverStickersOverlay) state.coverStickers = getStickersFromOverlay(coverStickersOverlay);
      salvarCapaNoNavegador();
      atualizarBotaoDeTrancar();
      agendarAutosave(600);
      registrarNoHistorico(trancando ? 'trancou um objeto' : 'destrancou um objeto');
      playSfx(trancando ? 620 : 1120);
      showToast(trancando
        ? '🔒 trancadinho! agora ele não sai do lugar'
        : '🔓 destrancado, pode mexer de novo');
    });
  }

  const StickerPlacement = window.PooftieStickerPlacement;

  function stickerBoxOf(overlay) {
    if (overlay && overlay.dataset && overlay.dataset.caixaFolha) {
      const medida = String(overlay.dataset.caixaFolha).split('x').map(Number);
      if (medida.length === 2 && medida[0] > 0 && medida[1] > 0) {
        return { width: medida[0], height: medida[1] };
      }
    }
    return { width: overlay.clientWidth, height: overlay.clientHeight };
  }

  function stickerSizeOf(el) {
    return { width: el.offsetWidth || 85, height: el.offsetHeight || 85 };
  }

  function ipodKeepOut(overlay) {
    if (!ipodStickersOverlay || overlay !== ipodStickersOverlay || !ipodModal) return null;
    const tela = ipodModal.querySelector('.ipod-screen-portal');
    if (!tela) return null;
    const caixa = overlay.getBoundingClientRect();
    const telaRect = tela.getBoundingClientRect();
    if (!telaRect.width) return null;
    const escala = telaRect.width / 369;
    const moldura = 10 * escala;
    return {
      left: telaRect.left - caixa.left - moldura,
      top: telaRect.top - caixa.top - moldura,
      right: telaRect.right - caixa.left + moldura,
      bottom: telaRect.bottom - caixa.top + moldura
    };
  }

  function safeStickerPosition(el, pos, medidas = null) {
    const overlay = el.parentElement;
    if (!overlay || !StickerPlacement) return pos;
    const caixa = (medidas && medidas.caixa) || stickerBoxOf(overlay);
    const tamanho = (medidas && medidas.tamanho) || stickerSizeOf(el);
    const podePassear = typeof StickerPlacement.clampKeepingVisible === 'function';

    if (overlay === pageStickersOverlay || overlay === coverStickersOverlay) {
      return podePassear
        ? StickerPlacement.clampKeepingVisible(pos, tamanho, caixa)
        : StickerPlacement.clampToBox(pos, tamanho, caixa);
    }

    if (ehMesaDasCanetinhas(overlay)) {
      return podePassear
        ? StickerPlacement.clampKeepingVisible(pos, tamanho, caixa)
        : StickerPlacement.clampToBox(pos, tamanho, caixa);
    }

    if (overlay.classList.contains('flip-stickers')) {
      return podePassear
        ? StickerPlacement.clampKeepingVisible(pos, tamanho, caixa)
        : StickerPlacement.clampToBox(pos, tamanho, caixa);
    }

    if (!ipodStickersOverlay || overlay !== ipodStickersOverlay) return pos;
    return StickerPlacement.placeStickerSafely(
      pos,
      tamanho,
      caixa,
      ipodKeepOut(overlay),
      { minVisible: podePassear ? StickerPlacement.SOBRA_PADRAO : 0 }
    );
  }


  function captionDoAdesivo(el) {
    const span = el && el.querySelector('.sticker-caption');
    if (!span) return { caption: '', position: 'below' };
    return {
      caption: span.textContent || '',
      position: span.classList.contains('is-above') ? 'above' : 'below'
    };
  }

  function aplicarCaption(el, texto, posicao) {
    if (!el) return;
    const limpo = String(texto == null ? '' : texto).trim();
    let span = el.querySelector('.sticker-caption');
    if (!limpo) {
      if (span) span.remove();
      return;
    }
    if (!span) {
      span = document.createElement('span');
      span.className = 'sticker-caption';
      el.appendChild(span);
    }
    span.textContent = limpo;
    span.classList.toggle('is-above', posicao === 'above');
    span.classList.toggle('is-below', posicao !== 'above');
  }

  function placeSticker(src, savedPos = null, overlayTarget = null, { silencioso = false } = {}) {
    if (!silencioso) playSfx(980, 0.1, 'triangle');
    const overlay = overlayTarget || getActiveOverlay();
    if (!overlay) return null;

    const stickerEl = document.createElement('div');
    const ehDesenho = Boolean(src && typeof src === 'object' && src.kind === 'drawing');
    const temSombra = !ehDesenho && !(src && src.hasShadow === false);
    const temBorda = !ehDesenho && Boolean(src && src.hasBorder);
    const classes = ['placed-sticker'];
    const naMesaDasCanetinhas = ehMesaDasCanetinhas(overlay);
    if (naMesaDasCanetinhas) classes.push('flip-sticker', 'is-enfeite');
    if (ehDesenho) classes.push('is-drawing');
    if (temSombra) classes.push('with-shadow');
    const ehVideo = ehAdesivoDeVideo(src);
    if (ehVideo) classes.push('is-video');
    if (temBorda) classes.push('with-border');
    if (src && src.locked) classes.push('is-locked');
    if (src && src.enfeite) classes.push('is-enfeite');
    stickerEl.className = classes.join(' ');
    if (ehDesenho) stickerEl.dataset.kind = 'drawing';
    stickerEl.dataset.rotation = (src && src.rotation) ? src.rotation : '0';
    if (src && (src.flip === true || src.flip === '1')) stickerEl.dataset.flip = '1';

    const imgSrc = String((typeof src === 'string' ? src : (src && src.content)) || '');
    const stickerWidth = (src && src.width) ? src.width : (ehVideo ? 200 : 85);
    const proporcao = (src && src.height) ? (src.height / (src.width || src.height)) : 1;
    const alturaDoAdesivo = (src && src.height)
      ? (ehDesenho || ehVideo ? Math.max(1, Math.round(stickerWidth * proporcao)) : 0)
      : 0;
    const estiloAltura = alturaDoAdesivo ? ` height: ${alturaDoAdesivo}px;` : '';

    const posterDoVideo = ehVideo && src && src.poster
      ? ` poster="${escaparAtributo(src.poster)}"`
      : '';
    const midiaHtml = ehVideo
      ? `<video class="sticker-video" data-ref="${escaparAtributo(imgSrc)}"${posterDoVideo}` +
        ` style="width: ${stickerWidth}px;${estiloAltura}"` +
        ' muted loop autoplay playsinline preload="metadata" aria-label="vídeo"></video>'
      : `<img src="${escaparAtributo(imgSrc)}" style="width: ${stickerWidth}px;${estiloAltura}" alt="${ehDesenho ? 'desenho' : 'sticker'}">`;

    stickerEl.innerHTML = `
      ${midiaHtml}
      <div class="sticker-handle-rotate" title="Girar Livremente">🔄</div>
      <div class="sticker-handle-resize" title="Redimensionar">↘️</div>
      <div class="sticker-handle-del" title="Excluir">✕</div>
    `;

    if (src && src.zIndex) stickerEl.style.zIndex = src.zIndex;
    if (src && src.shadowColor) stickerEl.style.setProperty('--sticker-shadow', src.shadowColor);
    if (src && src.pen) {
      stickerEl.dataset.pen = '1';
      if (Number.isFinite(Number(src.penX))) stickerEl.dataset.penx = String(Number(src.penX));
      if (Number.isFinite(Number(src.penY))) stickerEl.dataset.peny = String(Number(src.penY));
    }
    if (src && src.borderColor) stickerEl.style.setProperty('--sticker-border', src.borderColor);
    if (src && src.caption) {
      aplicarCaption(stickerEl, src.caption, src.captionPosition === 'above' ? 'above' : 'below');
    }

    applyStickerTransform(stickerEl);
    setupFreeStickerControls(stickerEl);
    overlay.appendChild(stickerEl);

    const fracaoDaCanetinha = (src && src.pen && !naMesaDasCanetinhas
      && Number.isFinite(Number(src.penX)) && Number.isFinite(Number(src.penY)))
      ? {
        x: Number(src.penX) * (overlay.clientWidth || 0),
        y: Number(src.penY) * (overlay.clientHeight || 0)
      }
      : null;
    const partida = fracaoDaCanetinha || savedPos;
    const jaColados = overlay.querySelectorAll('.placed-sticker').length;
    const escadinha = (partida || ehDesenho) ? 0 : (jaColados % 6) * 16;
    const seguro = ehDesenho
      ? { left: (partida ? partida.x : 0), top: (partida ? partida.y : 0) }
      : safeStickerPosition(stickerEl, {
        left: (partida ? partida.x : 130) + escadinha,
        top: (partida ? partida.y : 180) + escadinha
      });
    stickerEl.style.left = `${seguro.left}px`;
    stickerEl.style.top = `${seguro.top}px`;
    if (!ehDesenho && overlay.classList.contains('flip-stickers')) {
      prenderNaMesaDoLivrinho(stickerEl);
      if (globalThis.__DBG_P2) {
        globalThis.__DBG_P2.push({
          overlay: overlay.className,
          caixaOverlay: stickerBoxOf(overlay),
          dataCaixaFolha: overlay.dataset.caixaFolha || '(sem)',
          client: [overlay.clientWidth, overlay.clientHeight],
          depois: [stickerEl.style.left, stickerEl.style.top],
          imgW: imgSrc && String(imgSrc).slice(0, 30)
        });
      }
    }
    if (!silencioso) selectSticker(stickerEl);
    if (!silencioso) {
      if (overlay === pageStickersOverlay && livrinho) {
        atualizarLivrinho({ irPara: 'mesma' });
      } else if (overlay.classList.contains('flip-stickers')
        || ehMesaDasCanetinhas(overlay)) {
        sincronizarAdesivosDoLivrinho({ guardar: true });
      }
      if (overlay === coverStickersOverlay && typeof getStickersFromOverlay === 'function') {
        state.coverStickers = getStickersFromOverlay(overlay);
      }
      agendarAutosave(900);
    }
    return stickerEl;
  }

  function sincronizarAdesivosDoLivrinho({ guardar = false } = {}) {
    const alvo = livrinho && livrinho.paginaEscrevivel ? livrinho.paginaEscrevivel() : null;
    if (!alvo || !alvo.page) return;
    const camada = camadaDeAdesivosDoLivrinho();
    const daFolha = camada
      ? getStickersFromOverlay(camada)
      : (Array.isArray(alvo.page.stickers) ? alvo.page.stickers.filter((s) => !(s && s.enfeite)) : []);
    alvo.page.stickers = [...daFolha, ...registrosDasCanetinhas()];
    if (guardar) {
      Promise.resolve(guardarPaginaDoLivrinho(alvo.page)).catch((erro) => {
        console.warn('[crechezinha] não consegui guardar a página do livrinho:', erro && erro.message);
      });
    }
  }

  async function guardarPaginaDoLivrinho(pagina) {
    if (!pagina || !pagina.pageId || !pagina.date) return false;
    if (state.draft && state.draft.pageId === pagina.pageId) {
      return Boolean(await guardarMemoriaAtual({ nuvem: false }));
    }
    return Boolean(await escreverPagina(pagina.date, {
      id: pagina.pageId,
      date: pagina.date,
      title: pagina.title || '',
      body: pagina.body || '',
      pattern: pagina.pattern || state.paperPattern || 'lines',
      diaryStyle: pagina.diaryStyle || null,
      textStyle: pagina.textStyle || null,
      medida: pagina.medida || null,
      textSpans: Array.isArray(pagina.textSpans) ? pagina.textSpans : [],
      texts: Array.isArray(pagina.texts) ? pagina.texts : [],
      stickers: Array.isArray(pagina.stickers) ? pagina.stickers : []
    }));
  }

  function applyStickerTransform(el) {
    const rot = el.dataset.rotation || '0';
    const espelhado = el.dataset.flip === '1' ? ' scaleX(-1)' : '';
    el.style.transform = `rotate(${rot}deg)${espelhado}`;
  }

  function sincronizarAdesivoMexido(el) {
    if (el && el.classList.contains('flip-sticker')) {
      prenderNaMesaDoLivrinho(el);
      const naMesa = ehMesaDasCanetinhas(el.parentElement);
      sincronizarAdesivosDoLivrinho({ guardar: naMesa });
    }
    if (stickerEffectsPanel && stickerEffectsPanel.style.display !== 'none') posicionarPainelDeEfeitos();
    if (typeof agendarAutosave === 'function') agendarAutosave(1500);
  }

  function midiaDoAdesivo(el) {
    if (!el || typeof el.querySelector !== 'function') return null;
    return el.querySelector('video') || el.querySelector('img');
  }

  function assinaturaDaMidiaDoAdesivo(el) {
    const video = el && typeof el.querySelector === 'function' ? el.querySelector('video') : null;
    if (video) return `${video.dataset.ref || ''}|${video.style.width}`;
    const img = el && typeof el.querySelector === 'function' ? el.querySelector('img') : null;
    return `${img ? img.src : ''}|${img ? img.style.width : ''}`;
  }

  function prenderNaMesaDoLivrinho(el) {
    const caminha = el && el.parentElement;
    if (!caminha || !StickerPlacement || typeof StickerPlacement.clampKeepingVisible !== 'function') return;
    const naMesa = ehMesaDasCanetinhas(caminha);
    const caixa = naMesa
      ? { width: caminha.clientWidth, height: caminha.clientHeight }
      : stickerBoxOf(caminha);
    if (!caixa.width || !caixa.height) return;
    const midia = midiaDoAdesivo(el);
    const largura = midia ? (parseFloat(midia.style.width) || el.offsetWidth || 85) : (el.offsetWidth || 85);
    const altura = midia
      ? (parseFloat(midia.style.height)
        || (midia.tagName === 'VIDEO' ? midia.offsetHeight : 0)
        || largura)
      : largura;
    const posicao = {
      left: parseFloat(el.style.left) || 0,
      top: parseFloat(el.style.top) || 0
    };
    const seguro = StickerPlacement.clampKeepingVisible(posicao, { width: largura, height: altura }, caixa);
    if (Math.abs(seguro.left - posicao.left) < 0.5 && Math.abs(seguro.top - posicao.top) < 0.5) return;
    el.style.left = `${seguro.left}px`;
    el.style.top = `${seguro.top}px`;
  }

  function escalaDaCamada(camada) {
    if (!camada || !camada.classList || !camada.classList.contains('flip-stickers')) return 1;
    const folha = camada.parentElement;
    const valor = folha ? parseFloat(folha.style.getPropertyValue('--flip-fit')) : NaN;
    return Number.isFinite(valor) && valor > 0 ? valor : 1;
  }

  function setupFreeStickerControls(el) {
    const rotateHandle = el.querySelector('.sticker-handle-rotate');
    const resizeHandle = el.querySelector('.sticker-handle-resize');
    const delHandle = el.querySelector('.sticker-handle-del');
    const img = midiaDoAdesivo(el);
    if (!delHandle || !rotateHandle || !resizeHandle) return;
    const segurar = () => {
      arrastandoAdesivo = true;
      el.classList.add('is-arrastando');
    };
    const soltar = () => {
      arrastandoAdesivo = false;
      el.classList.remove('is-arrastando');
    };

    const trancado = () => el.classList.contains('is-locked');

    delHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (trancado()) { selectSticker(el); return; }
      const camada = el.parentElement;
      const doLivrinho = Boolean(camada && camada.classList
        && (camada.classList.contains('flip-stickers') || ehMesaDasCanetinhas(camada)));
      el.remove();
      deselectSticker();
      if (doLivrinho) sincronizarAdesivosDoLivrinho({ guardar: true });
      if (camada === coverStickersOverlay) {
        state.coverStickers = getStickersFromOverlay(camada);
        agendarAutosave(600);
      }
      playSfx(550);
    });

    rotateHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (trancado()) { selectSticker(el); return; }
      segurar();
      selectSticker(el);
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      function onRotateMove(ev) {
        const currentX = ev.clientX || (ev.touches && ev.touches[0].clientX);
        const currentY = ev.clientY || (ev.touches && ev.touches[0].clientY);
        const radians = Math.atan2(currentY - centerY, currentX - centerX);
        let degrees = radians * (180 / Math.PI) + 90;
        el.dataset.rotation = degrees;
        applyStickerTransform(el);
      }

      function onRotateUp() {
        window.removeEventListener('pointermove', onRotateMove);
        window.removeEventListener('pointerup', onRotateUp);
        soltar();
        sincronizarAdesivoMexido(el);
      }

      window.addEventListener('pointermove', onRotateMove);
      window.addEventListener('pointerup', onRotateUp);
    });

    resizeHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (trancado()) { selectSticker(el); return; }
      segurar();
      selectSticker(el);
      const startX = e.clientX || (e.touches && e.touches[0].clientX);
      const startWidth = parseFloat(img.style.width) || img.offsetWidth || 85;
      const escala = escalaDaCamada(el.parentElement);
      const ehDesenho = el.dataset.kind === 'drawing';
      const manterProporcao = ehDesenho || el.classList.contains('is-video');
      const startHeight = parseFloat(img.style.height) || img.offsetHeight || 0;
      const razao = (manterProporcao && startWidth > 0 && startHeight > 0) ? (startHeight / startWidth) : 0;
      const caixaDoGesto = stickerBoxOf(el.parentElement);
      const proporcaoAltura = (startWidth > 0 && startHeight > 0) ? (startHeight / startWidth) : 1;

      function onResizeMove(ev) {
        const currentX = ev.clientX || (ev.touches && ev.touches[0].clientX);
        const delta = (currentX - startX) / escala;
        const newWidth = Math.max(20, Math.min(900, startWidth + delta));
        img.style.width = newWidth + 'px';
        if (razao > 0) img.style.height = `${Math.max(1, newWidth * razao)}px`;
        const seguro = safeStickerPosition(el, {
          left: parseFloat(el.style.left) || 0,
          top: parseFloat(el.style.top) || 0
        }, {
          caixa: caixaDoGesto,
          tamanho: { width: newWidth, height: Math.max(1, newWidth * proporcaoAltura) }
        });
        el.style.left = `${seguro.left}px`;
        el.style.top = `${seguro.top}px`;
      }

      function onResizeUp() {
        window.removeEventListener('pointermove', onResizeMove);
        window.removeEventListener('pointerup', onResizeUp);
        soltar();
        sincronizarAdesivoMexido(el);
      }

      window.addEventListener('pointermove', onResizeMove);
      window.addEventListener('pointerup', onResizeUp);
    });

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.sticker-handle-rotate') ||
          e.target.closest('.sticker-handle-resize') ||
          e.target.closest('.sticker-handle-del')) return;
      if (trancado()) { selectSticker(el); return; }
      segurar();
      selectSticker(el);
      const startX = e.clientX || (e.touches && e.touches[0].clientX);
      const startY = e.clientY || (e.touches && e.touches[0].clientY);
      const initialLeft = parseFloat(el.style.left) || 0;
      const initialTop = parseFloat(el.style.top) || 0;
      const escala = escalaDaCamada(el.parentElement);
      const medidasDoGesto = {
        caixa: stickerBoxOf(el.parentElement),
        tamanho: stickerSizeOf(el)
      };

      function onDragMove(ev) {
        const currentX = ev.clientX || (ev.touches && ev.touches[0].clientX);
        const currentY = ev.clientY || (ev.touches && ev.touches[0].clientY);
        const seguro = safeStickerPosition(el, {
          left: initialLeft + (currentX - startX) / escala,
          top: initialTop + (currentY - startY) / escala
        }, medidasDoGesto);
        el.style.left = `${seguro.left}px`;
        el.style.top = `${seguro.top}px`;
      }

      function onDragUp() {
        window.removeEventListener('pointermove', onDragMove);
        window.removeEventListener('pointerup', onDragUp);
        soltar();
        sincronizarAdesivoMexido(el);
      }

      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragUp);
    });
  }

  const PageText = window.PooftiePageText || null;
  const pageTextsOverlay = document.getElementById('page-texts-overlay');
  const coverTextsOverlay = document.getElementById('cover-texts-overlay');
  const btnAddText = document.getElementById('btn-add-text');
  const autosavePill = document.getElementById('autosave-pill');

  let textoSelecionado = null;
  let arrastandoAdesivo = false;

  function camadaDeTextosAtual() {
    if (state.currentView === 'cover') return coverTextsOverlay;
    if (state.currentView === 'page') return pageTextsOverlay;
    return null;
  }

  function deselectTexto() {
    if (!textoSelecionado) return;
    textoSelecionado.classList.remove('selected');
    textoSelecionado = null;
  }

  function selecionarTexto(el) {
    if (!el) return;
    if (textoSelecionado && textoSelecionado !== el) textoSelecionado.classList.remove('selected');
    textoSelecionado = el;
    el.classList.add('selected');
    if (typeof deselectSticker === 'function') deselectSticker();
  }

  function getTextsFromLayer(camada) {
    const lista = [];
    if (!camada) return lista;
    camada.querySelectorAll('.placed-text').forEach((el) => {
      const corpo = el.querySelector('.placed-text-body');
      const texto = PageText
        ? PageText.textoLimpo(corpo ? corpo.textContent : '')
        : String(corpo ? corpo.textContent : '').trim();
      if (!texto) return;
      lista.push({
        id: el.dataset.textId || '',
        text: texto,
        x: parseFloat(el.style.left) || 0,
        y: parseFloat(el.style.top) || 0,
        size: parseFloat(el.style.fontSize) || (PageText ? PageText.TAMANHO_PADRAO : 21),
        rotation: parseFloat(el.dataset.rotation) || 0,
        zIndex: parseInt(el.style.zIndex, 10) || (PageText ? PageText.Z_PADRAO : 30),
        locked: el.classList.contains('is-locked')
      });
    });
    return lista;
  }

  function posicaoDoTextinho(desejada, tamanho, caixa) {
    if (!PageText) return { left: desejada.left, top: desejada.top };
    return PageText.caberDentro(desejada, tamanho, caixa);
  }

  function ajeitarTextinhosDaFolha(caminha = null) {
    const alvos = caminha
      ? [caminha]
      : [document.getElementById('page-texts-overlay'), document.getElementById('cover-texts-overlay')];
    let mudou = false;
    alvos.filter(Boolean).forEach((alvo) => {
      const largura = Number(alvo.clientWidth) || 0;
      const altura = Number(alvo.clientHeight) || 0;
      if (largura <= 0 || altura <= 0) return;
      alvo.querySelectorAll('.placed-text').forEach((el) => {
        const atual = { left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0 };
        const tamanho = { width: el.offsetWidth || 90, height: el.offsetHeight || 30 };
        const posicao = posicaoDoTextinho(atual, tamanho, { width: largura, height: altura });
        if (Math.round(posicao.left) === Math.round(atual.left)
          && Math.round(posicao.top) === Math.round(atual.top)) return;
        el.style.left = `${posicao.left}px`;
        el.style.top = `${posicao.top}px`;
        mudou = true;
      });
    });
    if (mudou) {
      sincronizarTextosDaTela();
      guardarRascunhoNoNavegador();
    }
    return mudou;
  }

  let timerAjeitarTextos = null;

  function agendarAjeitarTextinhos(caminha = null) {
    if (timerAjeitarTextos) clearTimeout(timerAjeitarTextos);
    timerAjeitarTextos = setTimeout(() => {
      timerAjeitarTextos = null;
      ajeitarTextinhosDaFolha(caminha);
    }, 80);
  }

  function criarTextinho(dados = {}, { silencioso = false, foco = false, camada = null } = {}) {
    const alvo = camada || camadaDeTextosAtual();
    if (!alvo) {
      if (!silencioso) showToast('os textinhos moram no diário e na capinha ✎');
      return null;
    }
    const item = PageText
      ? PageText.normalizar(dados, alvo.querySelectorAll('.placed-text').length)
      : {
        id: String(dados.id || `txt-${Date.now()}`),
        text: String(dados.text || ''),
        x: Number(dados.x) || 0,
        y: Number(dados.y) || 0,
        size: Number(dados.size) || 21,
        rotation: Number(dados.rotation) || 0,
        zIndex: Number(dados.zIndex) || 30,
        locked: Boolean(dados.locked)
      };

    const el = document.createElement('div');
    el.className = 'placed-text';
    el.dataset.textId = item.id;
    el.style.fontSize = `${item.size}px`;
    el.style.zIndex = String(item.zIndex);
    if (item.rotation) {
      el.dataset.rotation = String(item.rotation);
      el.style.transform = `rotate(${item.rotation}deg)`;
    }
    if (item.locked) el.classList.add('is-locked');
    el.innerHTML =
      '<span class="placed-text-body" contenteditable="true" spellcheck="false" ' +
        'role="textbox" aria-label="textinho do diário"></span>' +
      '<div class="text-handle-drag" title="Arrastar o textinho">✥</div>' +
      '<div class="text-handle-size" title="Crescer a letra">A</div>' +
      '<div class="text-handle-del" title="Apagar o textinho">✕</div>';
    const corpo = el.querySelector('.placed-text-body');
    if (item.text) corpo.textContent = item.text;
    if (el.classList.contains('is-locked')) corpo.setAttribute('contenteditable', 'false');
    setupTextControls(el);
    alvo.appendChild(el);

    const caixa = { width: alvo.clientWidth, height: alvo.clientHeight };
    const tamanho = { width: el.offsetWidth || 90, height: el.offsetHeight || 30 };
    const jaTem = alvo.querySelectorAll('.placed-text').length;
    const escadinha = (item.x || item.y) ? 0 : ((jaTem - 1) % 5) * 16;
    const posicao = posicaoDoTextinho({
      left: (item.x || Math.round(caixa.width * 0.1)) + escadinha,
      top: (item.y || Math.round(caixa.height * 0.28)) + escadinha
    }, tamanho, caixa);
    el.style.left = `${posicao.left}px`;
    el.style.top = `${posicao.top}px`;
    if (caixa.width <= 0 || caixa.height <= 0) agendarAjeitarTextinhos(alvo);

    if (!silencioso) {
      selecionarTexto(el);
      playSfx(1000);
    }
    if (foco) setTimeout(() => corpo.focus(), 40);
    return el;
  }

  function setupTextControls(el) {
    const corpo = el.querySelector('.placed-text-body');
    const alcaArrastar = el.querySelector('.text-handle-drag');
    const alcaTamanho = el.querySelector('.text-handle-size');
    const alcaApagar = el.querySelector('.text-handle-del');

    const trancado = () => el.classList.contains('is-locked');

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.text-handle-drag')
        || e.target.closest('.text-handle-size')
        || e.target.closest('.text-handle-del')) return;
      selecionarTexto(el);
    });

    corpo.addEventListener('input', () => {
      if (trancado()) return;
      agendarTextosDaTela();
      agendarAutosave(1200);
    });
    corpo.addEventListener('blur', () => sincronizarTextosDaTela());

    alcaArrastar.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      selecionarTexto(el);
      if (trancado()) return;
      const caminha = el.parentElement;
      const caixa = { width: caminha.clientWidth, height: caminha.clientHeight };
      const inicioX = e.clientX;
      const inicioY = e.clientY;
      const baseLeft = parseFloat(el.style.left) || 0;
      const baseTop = parseFloat(el.style.top) || 0;

      function aoArrastar(ev) {
        const tamanho = { width: el.offsetWidth, height: el.offsetHeight };
        const posicao = PageText
          ? PageText.caberDentro({
            left: baseLeft + (ev.clientX - inicioX),
            top: baseTop + (ev.clientY - inicioY)
          }, tamanho, caixa)
          : { left: baseLeft + (ev.clientX - inicioX), top: baseTop + (ev.clientY - inicioY) };
        el.style.left = `${posicao.left}px`;
        el.style.top = `${posicao.top}px`;
      }

      function aoSoltar() {
        window.removeEventListener('pointermove', aoArrastar);
        window.removeEventListener('pointerup', aoSoltar);
        window.removeEventListener('pointercancel', aoSoltar);
        sincronizarTextosDaTela();
        agendarAutosave(600);
      }

      window.addEventListener('pointermove', aoArrastar);
      window.addEventListener('pointerup', aoSoltar);
      window.addEventListener('pointercancel', aoSoltar);
    });

    alcaTamanho.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      selecionarTexto(el);
      if (trancado()) return;
      const atual = parseFloat(el.style.fontSize) || (PageText ? PageText.TAMANHO_PADRAO : 21);
      const novo = PageText ? PageText.passoDoTamanho(atual, 1) : atual;
      el.style.fontSize = `${novo}px`;
      playSfx(1150);
      sincronizarTextosDaTela();
      agendarAutosave(600);
    });

    alcaApagar.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (trancado()) return;
      el.remove();
      if (textoSelecionado === el) textoSelecionado = null;
      playSfx(520);
      sincronizarTextosDaTela();
      agendarAutosave(400);
    });
  }

  let timerTextos = null;

  function agendarTextosDaTela() {
    if (timerTextos) clearTimeout(timerTextos);
    timerTextos = setTimeout(() => {
      timerTextos = null;
      sincronizarTextosDaTela();
    }, 320);
  }

  function sincronizarTextosDaTela() {
    if (timerTextos) { clearTimeout(timerTextos); timerTextos = null; }
    const caminha = document.getElementById('page-texts-overlay');
    const daPagina = (state.draft && state.draft.pageId) || '';
    if (state.draft && caminha && caminha.dataset.pagina === daPagina) {
      state.draft.texts = getTextsFromLayer(caminha);
    }
    if (state.coverData && coverTextsOverlay) state.coverData.texts = getTextsFromLayer(coverTextsOverlay);
    guardarRascunhoNoNavegador();
  }

  function textosDaPaginaAberta(conhecida = null) {
    const doRascunho = Array.isArray(state.draft && state.draft.texts)
      ? state.draft.texts
      : ((conhecida && Array.isArray(conhecida.texts)) ? conhecida.texts : []);
    const caminha = document.getElementById('page-texts-overlay');
    if (!caminha || typeof getTextsFromLayer !== 'function') return doRascunho;
    const daPagina = (state.draft && state.draft.pageId) || '';
    if (caminha.dataset.pagina !== daPagina) return doRascunho;
    return getTextsFromLayer(caminha);
  }

  function marcarCaminhaDeTextos(caminha) {
    if (!caminha || !caminha.dataset) return;
    caminha.dataset.pagina = (state.draft && state.draft.pageId) || '';
  }

  function trocarTextosDaFolha(lista) {
    if (!pageTextsOverlay) return;
    restoreTexts(Array.isArray(lista) ? lista : [], pageTextsOverlay);
    marcarCaminhaDeTextos(pageTextsOverlay);
    if (state.draft) state.draft.texts = Array.isArray(lista) ? lista : [];
    agendarAjeitarTextinhos(pageTextsOverlay);
  }

  function restoreTexts(lista, caminha) {
    if (!caminha) return;
    caminha.innerHTML = '';
    const itens = PageText
      ? PageText.listaNormalizada(lista)
      : (Array.isArray(lista) ? lista.filter((t) => t && t.text) : []);
    itens.forEach((item) => criarTextinho(item, { silencioso: true, camada: caminha }));
  }

  function salvarCapaNoNavegador() {
    if (!state.coverData) state.coverData = {};
    const regua = typeof reguaDaCapinha === 'function' ? reguaDaCapinha() : null;
    const editando = typeof campoDeTextoEmEdicao === 'function' && campoDeTextoEmEdicao();
    if (regua && !editando) {
      state.coverData.medida = { width: Math.round(regua.width), height: Math.round(regua.height) };
    }
    if (coverTextsOverlay && capinhaDesenhada) state.coverData.texts = getTextsFromLayer(coverTextsOverlay);
    let adesivos = Array.isArray(state.coverStickers) ? state.coverStickers : [];
    if (coverStickersOverlay && capinhaDesenhada && typeof getStickersFromOverlay === 'function') {
      adesivos = getStickersFromOverlay(coverStickersOverlay);
    }
    state.coverStickers = adesivos;
    state.coverData.stickers = adesivos;
    guardarNoDiario('pooftie_cover_stickers', JSON.stringify(adesivos));
    const guardou = guardarNoDiario('pooftie_cover_data', JSON.stringify(state.coverData));
    if (guardou) capaSuja = false;
    return guardou;
  }

  if (btnAddText) {
    btnAddText.addEventListener('click', () => {
      const caminha = camadaDeTextosAtual();
      if (!caminha) {
        showToast('os textinhos moram no diário e na capinha ✎');
        return;
      }
      criarTextinho({}, { foco: true });
      agendarAutosave(700);
    });
  }

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.placed-text')) deselectTexto();
  });

  const AUTOSAVE_MS = 20000;
  const AUTOSAVE_NUVEM_MS = 60000;
  let timerAutosave = null;
  let timerPillAutosave = null;
  let autosaveSujo = false;
  let ultimaNuvemEm = 0;
  let paginaSuja = false;
  let capaSuja = false;
  let paginaVersao = 0;

  function temOQueGuardar() {
    if (!state.draft) return false;
    const escrito = String(state.draft.body || '').trim() || String(state.draft.title || '').trim();
    const adesivos = (typeof getStickersFromOverlay === 'function' && pageStickersOverlay)
      ? getStickersFromOverlay(pageStickersOverlay)
      : [];
    const pintada = Boolean(state.draft.diaryStyle);
    const letrada = Boolean(state.draft.textStyle);
    return Boolean(escrito || adesivos.length || pintada || letrada || getTextsFromLayer(pageTextsOverlay).length);
  }

  function piscarAvisinhoDeAutosave() {
    if (!autosavePill) return;
    autosavePill.classList.add('show');
    if (timerPillAutosave) clearTimeout(timerPillAutosave);
    timerPillAutosave = setTimeout(() => {
      timerPillAutosave = null;
      autosavePill.classList.remove('show');
    }, 2200);
  }

  let adesivosDosCantinhosProntos = false;
  const ultimosAdesivosDosCantinhos = new Map();
  function guardarAdesivosDosCantinhos() {
    if (!adesivosDosCantinhosProntos || typeof getStickersFromOverlay !== 'function') return;
    [
      ['pooftie_calendar_stickers', 'calendar-stickers-overlay', (lista) => { state.calendarStickers = lista; }],
      ['pooftie_todo_stickers', 'todo-stickers-overlay', (lista) => { state.todoStickers = lista; }],
      ['pooftie_ipod_stickers', 'ipod-stickers-overlay', (lista) => { state.ipodStickers = lista; }]
    ].forEach(([chave, id, lembrar]) => {
      const camada = document.getElementById(id);
      if (!camada) return;
      const lista = getStickersFromOverlay(camada);
      lembrar(lista);
      const json = JSON.stringify(lista);
      if (ultimosAdesivosDosCantinhos.get(chave) === json) return;
      ultimosAdesivosDosCantinhos.set(chave, json);
      guardarNoNavegador(chave, json);
    });
  }

  function agendarAutosave(atraso = 2500) {
    autosaveSujo = true;
    guardarAdesivosDosCantinhos();
    if (state.currentView === 'cover') {
      capaSuja = true;
    } else {
      paginaSuja = true;
      paginaVersao += 1;
    }
    if (typeof registrarNoHistorico === 'function') registrarNoHistorico();
    if (timerAutosave) clearTimeout(timerAutosave);
    timerAutosave = setTimeout(() => {
      timerAutosave = null;
      salvarAutomatico();
    }, atraso);
  }

  async function salvarAutomatico({ nuvem = true, avisarNaTela = true } = {}) {
    autosaveSujo = false;
    if (timerAutosave) { clearTimeout(timerAutosave); timerAutosave = null; }
    guardarAdesivosDosCantinhos();
    if (!state.draft) return false;

    const salvouCapa = capaSuja ? salvarCapaNoNavegador() : false;

    if (!paginaSuja) {
      if (salvouCapa && avisarNaTela) piscarAvisinhoDeAutosave();
      return Boolean(salvouCapa);
    }
    if (!temOQueGuardar()) {
      paginaSuja = false;
      if (salvouCapa && avisarNaTela) piscarAvisinhoDeAutosave();
      return Boolean(salvouCapa);
    }

    const agora = Date.now();
    const podeNuvem = nuvem && (agora - ultimaNuvemEm) > AUTOSAVE_NUVEM_MS;
    if (podeNuvem) ultimaNuvemEm = agora;

    const salva = await guardarMemoriaAtual({ nuvem: podeNuvem });
    if (!salva) return false;
    if (livrinho && livrinho.estaAberto() && !livrinho.animando && !arrastandoAdesivo) {
      atualizarLivrinho({ irPara: 'mesma' });
    }
    if (avisarNaTela) piscarAvisinhoDeAutosave();
    return true;
  }

  function guardarAntesDeSair() {
    if (timerRascunho) clearTimeout(timerRascunho);
    guardarRascunhoNoNavegador();
    salvarAutomatico({ nuvem: false, avisarNaTela: false }).catch(() => false);
  }

  window.addEventListener('pagehide', guardarAntesDeSair);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') guardarAntesDeSair();
  });
  setInterval(() => {
    if (autosaveSujo) salvarAutomatico();
  }, AUTOSAVE_MS);

  function restoreOverlayStickers(list, overlay) {
    if (list && list.length > 0) {
      list.forEach(st => {
        placeSticker({
          content: st.src,
          width: st.width,
          kind: st.kind,
          height: st.height,
          mediaType: st.mediaType,
          poster: st.poster,
          rotation: st.rotation,
          zIndex: st.zIndex,
          shadowColor: st.shadowColor,
          hasShadow: st.hasShadow,
          hasBorder: st.hasBorder,
          borderColor: st.borderColor,
          flip: st.flip,
          locked: st.locked,
          enfeite: st.enfeite,
          pen: st.pen,
          penX: st.penX,
          penY: st.penY,
          caption: st.caption,
          captionPosition: st.captionPosition
        }, { x: st.x, y: st.y }, overlay, { silencioso: true });
      });
    }
  }

  const capinhaJaArrumada = arrumarCapinhaNaRegua();
  if (!capinhaJaArrumada) {
    restoreOverlayStickers(state.coverStickers, coverStickersOverlay);
  }
  restoreOverlayStickers(state.calendarStickers, calendarStickersOverlay);
  restoreOverlayStickers(state.todoStickers, todoStickersOverlay);
  restoreOverlayStickers(state.ipodStickers, ipodStickersOverlay);
  adesivosDosCantinhosProntos = true;
  if (!capinhaJaArrumada) {
    restoreTexts(state.coverData && state.coverData.texts, coverTextsOverlay);
  }
  capinhaDesenhada = true;
  if (state.draft && state.editingId !== null) {
    const paginaAberta = (state.draft.pageId && EntryStore)
      ? EntryStore.buscarPagina(storeDiario, state.draft.pageId)
      : null;
    const memoriaDoDia = readEntries().find((e) => e.date === state.draft.date) || null;
    const adesivos = paginaAberta ? paginaAberta.stickers : (memoriaDoDia && memoriaDoDia.stickers);
    if (adesivos) restoreOverlayStickers(adesivos, pageStickersOverlay);
    restoreTexts(
      (paginaAberta && paginaAberta.texts) || (memoriaDoDia && memoriaDoDia.texts) || state.draft.texts,
      pageTextsOverlay
    );
    marcarCaminhaDeTextos(pageTextsOverlay);
  } else if (state.draft) {
    restoreTexts(state.draft.texts, pageTextsOverlay);
    marcarCaminhaDeTextos(pageTextsOverlay);
  }
  agendarAjeitarTextinhos(pageTextsOverlay);
  garantirRetratoInicial();
  reancorarArteDaPaginaAberta();

  const stickersDrawer = document.getElementById('stickers-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const btnOpenStickers = document.getElementById('btn-open-stickers');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const stickersGrid = document.getElementById('stickers-grid');
  const drawerTabsEl = document.getElementById('drawer-tabs');
  const stickerFilterEl = document.getElementById('sticker-filter');
  const stickerPickBar = document.getElementById('sticker-pick-bar');
  const btnStickerPick = document.getElementById('btn-sticker-pick');
  const btnStickerPickAll = document.getElementById('btn-sticker-pick-all');
  const btnStickerPickCancel = document.getElementById('btn-sticker-pick-cancel');
  const btnStickerPickDelete = document.getElementById('btn-sticker-pick-delete');
  const stickerPickCount = document.getElementById('sticker-pick-count');

  const StickerCategories = window.PooftieStickerCategories;
  const MEDIA_FILTERS = (StickerCategories && StickerCategories.MEDIA) || [{ key: 'all', emoji: '✨', label: 'tudo' }];

  let stickerCategories = [];
  let activeStickerCategory = null;
  let activeStickerMedia = 'all';
  let escolhendoAdesivos = false;
  const adesivosEscolhidos = new Set();

  const FAVORITES_CATEGORY = { key: 'favoritos', emoji: '💗', label: 'Favoritos' };


  function ehImagemDaPessoa(src) {
    const texto = String(src || '').trim();
    return /^data:image\//i.test(texto) || ehVideoRef(texto);
  }

  function idDoMeuAdesivo(item) {
    if (item && typeof item === 'object' && item.id) return String(item.id);
    if (typeof item === 'string' && (item.startsWith('src:') || item.startsWith('meu-'))) return item;
    const src = typeof item === 'string' ? item : (item && item.content);
    return `src:${src}`;
  }

  function meusAdesivosUnicos() {
    const vistos = new Set();
    return (state.customStickers || []).filter((item) => {
      const chave = idDoMeuAdesivo(item);
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
  }

  function adesivoDela(entry) {
    if (!entry) return false;
    if (entry.custom) return true;
    return ehImagemDaPessoa(entry.item && entry.item.content) || ehImagemDaPessoa(entry.src);
  }

  function itensDaCategoria(categoria) {
    if (!categoria) return [];
    if (categoria.favorites) return favoriteItems();
    if (categoria.custom) {
      return (state.customStickers || []).map((item) => {
        const src = typeof item === 'string' ? item : item.content;
        const video = ehAdesivoDeVideo(item, src);
        return { src, item, animated: !video && isAnimatedSticker(src), video };
      });
    }
    return Array.isArray(categoria.items) ? categoria.items : [];
  }

  function itensDaCategoriaVista() {
    const ativa = activeStickerCat();
    if (!ativa || ativa.favorites) return [];
    return itensDaCategoria(ativa).filter(adesivoDela);
  }

  function temAdesivoMeuNaAba() {
    return itensDaCategoriaVista().length > 0;
  }

  function atualizarBarraDeEscolherAdesivos() {
    const quantos = adesivosEscolhidos.size;
    const temMeus = temAdesivoMeuNaAba();
    if (!temMeus && escolhendoAdesivos) escolhendoAdesivos = false;
    if (stickersDrawer) stickersDrawer.classList.toggle('is-escolhendo-adesivo', escolhendoAdesivos);
    if (btnStickerPick) {
      btnStickerPick.hidden = !temMeus;
      btnStickerPick.classList.toggle('active', escolhendoAdesivos);
      btnStickerPick.textContent = escolhendoAdesivos ? '☑️ escolhendo' : '☑️ escolher';
    }
    if (stickerPickBar) {
      stickerPickBar.hidden = !escolhendoAdesivos;
      stickerPickBar.style.display = escolhendoAdesivos ? 'flex' : 'none';
    }
    if (btnStickerPickAll) {
      const todos = itensDaCategoriaVista();
      btnStickerPickAll.hidden = !escolhendoAdesivos;
      btnStickerPickAll.disabled = !todos.length
        || todos.every((entrada) => adesivosEscolhidos.has(idDoMeuAdesivo(entrada.item ?? entrada.src)));
    }
    if (btnStickerPickCancel) btnStickerPickCancel.hidden = !escolhendoAdesivos;
    if (btnStickerPickDelete) {
      btnStickerPickDelete.hidden = !escolhendoAdesivos;
      btnStickerPickDelete.disabled = quantos === 0;
      btnStickerPickDelete.textContent = quantos ? `🗑️ apagar (${quantos})` : '🗑️ apagar';
    }
    if (stickerPickCount) {
      stickerPickCount.textContent = !escolhendoAdesivos
        ? ''
        : (quantos
          ? `${quantos} escolhido${quantos === 1 ? '' : 's'}`
          : 'escolhe os adesivinhos');
    }
  }

  function modoEscolherAdesivos(ligado) {
    escolhendoAdesivos = Boolean(ligado) && temAdesivoMeuNaAba();
    if (!escolhendoAdesivos) adesivosEscolhidos.clear();
    renderStickersGrid();
  }

  function alternarEscolhaDoAdesivo(chave) {
    const nome = idDoMeuAdesivo(chave);
    if (adesivosEscolhidos.has(nome)) adesivosEscolhidos.delete(nome);
    else adesivosEscolhidos.add(nome);
    playSfx(adesivosEscolhidos.has(nome) ? 1120 : 820, 0.08, 'triangle');
    atualizarBarraDeEscolherAdesivos();
    renderStickersGrid();
  }

  function meuAdesivoPeloNome(nome) {
    const chave = idDoMeuAdesivo(nome);
    return meusAdesivosUnicos().find((item) => idDoMeuAdesivo(item) === chave) || null;
  }

  function apagarAdesivosEscolhidos() {
    const escolhidos = new Set(adesivosEscolhidos);
    if (!escolhidos.size) {
      showToast('escolhe pelo menos um adesivinho pra apagar 🌸', true);
      return;
    }
    const alvos = [...escolhidos]
      .map((nome) => meuAdesivoPeloNome(nome))
      .filter(Boolean);
    if (!alvos.length) {
      showToast('esses adesivos não são da sua coleção 🌸', true);
      adesivosEscolhidos.clear();
      renderStickersGrid();
      return;
    }
    const aviso = alvos.length === 1
      ? 'Apagar esse adesivo da sua coleção? 🌧️'
      : `Apagar ${alvos.length} adesivos da sua coleção? 🌧️`;
    if (!confirm(`${aviso}\n(os que já estão colados na folha ficam onde estão)`)) return;

    const vaoEmbora = new Set(alvos);
    const desenhos = new Set(alvos.map((item) => item.content).filter(Boolean));
    const adesivos = state.customStickers || [];
    state.customStickers = adesivos.filter((item) => {
      if (vaoEmbora.has(item)) return false;
      const desenho = typeof item === 'string' ? item : item.content;
      if (!desenho || !desenhos.has(desenho)) return true;
      const gemeos = adesivos.filter((outro) => (typeof outro === 'string' ? outro : outro.content) === desenho);
      return gemeos.length > 1;
    });
    const quantos = Math.max(1, adesivos.length - state.customStickers.length);

    const favoritosAntes = state.favorites || [];
    state.favorites = favoritosAntes.filter((src) => !desenhos.has(src));
    if (state.favorites.length !== favoritosAntes.length) {
      guardarNoNavegador('pooftie_favorite_stickers', state.favorites);
    }

    const guardou = guardarNoNavegador('pooftie_custom_stickers', JSON.stringify(state.customStickers));
    adesivosEscolhidos.clear();
    escolhendoAdesivos = false;
    renderStickersGrid();
    playSfx(520);
    if (!guardou) {
      showToast('não consegui guardar a sua coleção agora 🌧️ tenta de novo?', true);
      return;
    }
    showToast(`🗑️ ${quantos} adesivo${quantos === 1 ? '' : 's'} apagado${quantos === 1 ? '' : 's'} da sua coleção`);
  }

  function favoriteItems() {
    const lista = [];
    const vistos = new Set();
    stickerCategories.forEach((categoria) => {
      (categoria.items || []).forEach((item) => {
        if (!vistos.has(item.src) && Styling.isFavorite(state.favorites || [], item.src)) {
          vistos.add(item.src);
          lista.push(item);
        }
      });
    });
    return lista;
  }

  function favoritesCategory() {
    if (!(state.favorites || []).length) return null;
    return { ...FAVORITES_CATEGORY, items: favoriteItems(), favorites: true };
  }

  function buildStickerCategories() {
    const index = window.PooftieStickerIndex;
    let categorias;

    if (index?.ready && StickerCategories) {
      const extraItems = EXTRA_STICKERS.map(resolveCatalogPath).filter(Boolean);
      categorias = StickerCategories.buildCategories({
        folders: index.folders,
        rootFiles: index.rootFiles,
        animated: index.animatedSet,
        customItems: state.customStickers,
        extraItems
      });
    } else {
      sanitizeStickerCatalog();
      categorias = LEGACY_TABS
        .map((tab) => ({
          ...tab,
          items: (legacyCatalog[tab.key] || []).map((item) => {
            const src = typeof item === 'string' ? item : item.content;
            return { src, item, animated: isAnimatedSticker(src) };
          })
        }))
        .filter((categoria) => categoria.items.length);

      categorias.push({
        key: 'meus',
        emoji: '✂️',
        label: 'Meus',
        custom: true,
        items: state.customStickers.map((item) => {
          const src = typeof item === 'string' ? item : item.content;
          const video = ehAdesivoDeVideo(item, src);
          return { src, item, animated: !video && isAnimatedSticker(src), video };
        })
      });
    }

    stickerCategories = categorias;
    const favoritos = favoritesCategory();
    if (favoritos) categorias = [favoritos, ...categorias];
    return categorias;
  }

  function itemsOfCategory(categoria) {
    if (!categoria) return [];
    if (categoria.favorites) return favoriteItems();
    return Array.isArray(categoria.items) ? categoria.items : [];
  }

  function activeStickerCat() {
    if (StickerCategories) return StickerCategories.findCategory(stickerCategories, activeStickerCategory);
    return stickerCategories.find((c) => c.key === activeStickerCategory) || stickerCategories[0] || null;
  }

  function renderStickerTabs(active) {
    if (!drawerTabsEl) return;
    drawerTabsEl.innerHTML = '';
    stickerCategories.forEach((categoria) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (active && categoria.key === active.key ? ' active' : '');
      btn.dataset.tab = categoria.key;
      const total = itemsOfCategory(categoria).length;
      btn.textContent = `${categoria.emoji} ${categoria.label}`;
      btn.title = `${total} adesivo(s)`;
      drawerTabsEl.appendChild(btn);
    });

    const ativa = drawerTabsEl.querySelector('.tab-btn.active');
    if (ativa) ativa.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function renderStickerFilter(active) {
    if (!stickerFilterEl) return;
    const items = itensDaCategoria(active);
    const counts = StickerCategories
      ? StickerCategories.countByMedia(items)
      : {
        all: items.length,
        photo: items.filter((i) => !i.animated && !i.video).length,
        gif: items.filter((i) => i.animated).length,
        video: items.filter((i) => i.video).length
      };

    stickerFilterEl.innerHTML = '';
    stickerFilterEl.style.display = items.length ? 'flex' : 'none';
    MEDIA_FILTERS.forEach(({ key, emoji, label }) => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (activeStickerMedia === key ? ' active' : '');
      btn.dataset.media = key;
      btn.textContent = `${emoji} ${label} ${counts[key] ?? 0}`;
      stickerFilterEl.appendChild(btn);
    });
  }

  function toggleStickerFavorite(src, card) {
    state.favorites = Styling.toggleFavorite(state.favorites || [], src);
    localStorage.setItem('pooftie_favorite_stickers', JSON.stringify(state.favorites));
    const favoritado = Styling.isFavorite(state.favorites, src);
    if (card) {
      card.classList.toggle('is-favorite', favoritado);
      const coracao = card.querySelector('.sticker-fav-btn');
      if (coracao) {
        coracao.textContent = favoritado ? '♥' : '♡';
        coracao.title = favoritado ? 'Tirar dos favoritos' : 'Favoritar adesivo';
        coracao.setAttribute('aria-pressed', favoritado ? 'true' : 'false');
      }
    }
    playSfx(favoritado ? 1250 : 800, 0.1, 'triangle');
    showToast(favoritado ? '💗 adesivo favoritado!' : 'tirei dos favoritos 🌸');
    setTimeout(() => {
      if (stickersDrawer?.classList.contains('open')) refreshStickerDrawer();
    }, 220);
  }

  function renderStickersGrid() {
    if (!stickersGrid) return;
    const active = activeStickerCat();
    renderStickerTabs(active);
    renderStickerFilter(active);
    stickersGrid.innerHTML = '';

    if (!active) {
      atualizarBarraDeEscolherAdesivos();
      stickersGrid.innerHTML = '<div class="sticker-empty">Nenhum adesivo por aqui ainda 🌸</div>';
      return;
    }

    const items = StickerCategories
      ? StickerCategories.filterByMedia(itensDaCategoria(active), activeStickerMedia)
      : itensDaCategoria(active);

    if (!items.length) {
      atualizarBarraDeEscolherAdesivos();
      const vazio = active.favorites
        ? 'Nenhum favorito ainda 🌸<br>Toca no ♡ de um adesivo pra guardar aqui!'
        : activeStickerMedia === 'gif'
          ? 'Nenhum gif nessa categoria 🌸'
          : activeStickerMedia === 'video'
            ? 'Nenhum vídeo nessa categoria 🌸<br>Toque em "Carregar Imagem, GIF ou Vídeo" pra trazer um!'
            : activeStickerMedia === 'photo'
              ? 'Nenhuma foto nessa categoria 🌸'
              : (active.custom ? 'Você ainda não criou adesivos personalizados!<br>Toque em "Carregar Imagem, GIF ou Vídeo" abaixo 🌸' : 'Essa categoria está vazia 🌸');
      stickersGrid.innerHTML = `<div class="sticker-empty">${vazio}</div>`;
      return;
    }

    items.forEach((entry) => {
      const favoritado = Styling.isFavorite(state.favorites || [], entry.src);
      const meu = adesivoDela(entry);
      const chave = meu ? idDoMeuAdesivo(entry.item ?? entry.src) : '';
      const escolhido = Boolean(meu && escolhendoAdesivos && adesivosEscolhidos.has(chave));
      const card = document.createElement('div');
      card.className = 'sticker-item'
        + (entry.video ? ' is-video' : (entry.animated ? ' is-gif' : ''))
        + (favoritado ? ' is-favorite' : '')
        + (meu ? ' is-meu' : '') + (escolhido ? ' is-escolhido' : '');
      card.dataset.tab = active.key;
      if (chave) card.dataset.meu = chave;
      const posterDoCartao = entry.item && entry.item.poster
        ? ` poster="${escaparAtributo(entry.item.poster)}"`
        : '';
      const midiaDoCartao = entry.video
        ? `<video class="sticker-video-da-gaveta" data-ref="${escaparAtributo(entry.src)}"${posterDoCartao}` +
          ' muted loop autoplay playsinline preload="metadata" aria-label="vídeo"></video>'
        : `<img src="${escaparAtributo(entry.src)}" alt="sticker" loading="lazy">`;
      card.innerHTML = `
        ${midiaDoCartao}
        ${entry.video
          ? '<span class="gif-badge video-badge">VÍDEO</span>'
          : (entry.animated ? '<span class="gif-badge">GIF</span>' : '')}
        ${meu ? `<span class="sticker-item-check" aria-hidden="true">${escolhido ? '✓' : ''}</span>` : ''}
        <button class="sticker-fav-btn" type="button" aria-pressed="${favoritado ? 'true' : 'false'}"
                title="${favoritado ? 'Tirar dos favoritos' : 'Favoritar adesivo'}">${favoritado ? '♥' : '♡'}</button>
      `;
      card.querySelector('.sticker-fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStickerFavorite(entry.src, card);
      });
      if (escolhendoAdesivos && meu) {
        card.title = escolhido ? 'tirar da escolha' : 'escolher esse adesivo';
        card.addEventListener('click', () => alternarEscolhaDoAdesivo(chave));
      } else {
        card.title = 'colar na folha';
        card.addEventListener('click', () => {
          placeSticker(entry.item ?? entry.src);
          if (stickersDrawer) stickersDrawer.classList.remove('open');
        });
      }
      stickersGrid.appendChild(card);
    });

    atualizarBarraDeEscolherAdesivos();
  }

  function refreshStickerDrawer() {
    stickerCategories = buildStickerCategories();
    if (!stickerCategories.some((c) => c.key === activeStickerCategory)) {
      activeStickerCategory = stickerCategories[0]?.key || null;
      activeStickerMedia = 'all';
    }
    renderStickersGrid();
  }

  const flipPensBtn = document.getElementById('flip-pens');
  const flipPenPicker = document.getElementById('flip-pen-picker');
  const flipPenStrip = document.getElementById('flip-pen-strip');
  const flipPenClose = document.getElementById('flip-pen-close');

  function categoriaDasCanetinhas() {
    if (!stickerCategories.length) {
      try { stickerCategories = buildStickerCategories(); } catch (error) { stickerCategories = []; }
    }
    const pareceCaneta = (categoria) => /caneta|canetinha|pen/i.test(`${categoria.key} ${categoria.label}`);
    return stickerCategories.find((categoria) => categoria.key === 'canetinhas')
      || stickerCategories.find(pareceCaneta)
      || null;
  }

  function fecharCanetinhas() {
    if (flipPenPicker) flipPenPicker.hidden = true;
  }

  function abrirOFolhear() {
    if (!livrinho || !livrinho.estaAberto()) return Promise.resolve(false);
    if (!livrinho.fechado) return Promise.resolve(true);
    return Promise.resolve(livrinho.abrirLivro()).then((abriu) => {
      if (abriu) return true;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(Boolean(livrinho && livrinho.estaAberto() && !livrinho.fechado));
        }, 480);
      });
    });
  }

  function caixaDaPaginaViva() {
    const alvo = livrinho && livrinho.paginaEscrevivel ? livrinho.paginaEscrevivel() : null;
    if (!alvo || !livrinho.el) return null;
    const lado = alvo.lado === 'left' ? livrinho.el.leftText : livrinho.el.rightText;
    const folha = (lado && lado.parentElement) || lado;
    const caixa = folha && typeof folha.getBoundingClientRect === 'function'
      ? folha.getBoundingClientRect()
      : null;
    return caixa && caixa.width > 0 && caixa.height > 0 ? caixa : null;
  }

  function porCanetinhaNaPagina(src) {
    return abrirOFolhear().then((aberto) => {
      const tela = camadaDasCanetinhas();
      const pagina = aberto ? caixaDaPaginaViva() : null;
      if (!tela || !pagina) {
        showToast('✎ abre o diário (folhear) pra pôr a canetinha na página ⋆');
        return null;
      }
      const larguraCaneta = (src && src.width) || 150;
      const alturaCaneta = (src && src.height) || larguraCaneta;
      const daTela = tela.getBoundingClientRect();
      const alvo = {
        x: Math.round(pagina.left - daTela.left + (pagina.width - larguraCaneta) / 2),
        y: Math.round(pagina.top - daTela.top + (pagina.height - alturaCaneta) / 2)
      };
      const base = (src && typeof src === 'object') ? { ...src } : { content: src };
      const adesivo = placeSticker({
        ...base,
        width: larguraCaneta,
        enfeite: true,
        pen: true
      }, alvo, tela);
      if (!adesivo) return null;
      adesivo.classList.add('is-enfeite', 'flip-sticker', 'is-caneta-da-mesa');
      selectSticker(adesivo);
      showToast('✎ canetinha na página! arrasta ela pra qualquer cantinho da tela ⋆ ˚｡⋆');
      return adesivo;
    });
  }

  function abrirCanetinhas() {
    if (!flipPenPicker || !flipPenStrip) return;
    const categoria = categoriaDasCanetinhas();
    const itens = categoria ? (categoria.items || []) : [];
    flipPenStrip.innerHTML = '';
    if (!itens.length) {
      flipPenStrip.innerHTML = '<span class="flip-pen-empty">não achei as canetinhas 🌧️ (a pasta assets/stickers/canetinhas está vazia?)</span>';
    }
    itens.forEach((item) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'flip-pen-item';
      botao.title = 'Pôr essa canetinha na página (dá pra arrastar pela tela toda)';
      botao.innerHTML = `<img src="${item.src}" alt="canetinha" loading="lazy" decoding="async">`;
      botao.addEventListener('click', () => {
        porCanetinhaNaPagina(item.item ?? item.src);
        fecharCanetinhas();
      });
      flipPenStrip.appendChild(botao);
    });
    flipPenPicker.hidden = false;
    playSfx(1050);
  }

  if (flipPensBtn) flipPensBtn.addEventListener('click', () => {
    if (flipPenPicker && !flipPenPicker.hidden) fecharCanetinhas();
    else abrirCanetinhas();
  });
  if (flipPenClose) flipPenClose.addEventListener('click', fecharCanetinhas);

  window.crechezinhaPorCanetinha = porCanetinhaNaPagina;

  const btnFlipRotate = document.getElementById('flip-rotate');
  const btnFlipBg = document.getElementById('flip-bg');
  if (btnFlipBg) btnFlipBg.addEventListener('click', () => abrirSeletorDeFundo('flip'));

  const telaEstaDeitada = () => Boolean(
    (window.screen && window.screen.orientation
      && String(window.screen.orientation.type || '').startsWith('landscape'))
    || (flipModalEl && flipModalEl.classList.contains('is-deitado'))
  );

  function atualizarBotaoDeitar() {
    if (btnFlipRotate) btnFlipRotate.textContent = telaEstaDeitada() ? '⟲ levantar' : '⟳ deitar';
  }

  async function virarATela() {
    const orientacao = window.screen ? window.screen.orientation : null;
    const podeTravar = Boolean(orientacao && typeof orientacao.lock === 'function'
      && window.matchMedia('(pointer: coarse)').matches);
    if (podeTravar) {
      try {
        if (!document.fullscreenElement && flipModalEl && flipModalEl.requestFullscreen) {
          await flipModalEl.requestFullscreen();
        }
        await orientacao.lock(telaEstaDeitada() ? 'portrait' : 'landscape');
        atualizarBotaoDeitar();
        if (livrinho) livrinho.agendarAjuste(280);
        playSfx(1100);
        return;
      } catch (error) {
      }
    }
    if (flipModalEl) flipModalEl.classList.toggle('is-deitado');
    atualizarBotaoDeitar();
    if (livrinho) livrinho.agendarAjuste(280);
    playSfx(telaEstaDeitada() ? 1100 : 820);
  }

  function desvirarATela() {
    if (flipModalEl) flipModalEl.classList.remove('is-deitado');
    const orientacao = window.screen ? window.screen.orientation : null;
    if (orientacao && typeof orientacao.unlock === 'function' && telaEstaDeitada()) {
      try { orientacao.unlock(); } catch (error) {   }
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      try { document.exitFullscreen(); } catch (error) {   }
    }
    atualizarBotaoDeitar();
  }

  if (btnFlipRotate) btnFlipRotate.addEventListener('click', virarATela);
  if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
    window.screen.orientation.addEventListener('change', atualizarBotaoDeitar);
  }

  function openStickersDrawer() {
    playSfx(880);
    refreshStickerDrawer();
    fecharCanetinhas();
    if (stickersDrawer) stickersDrawer.classList.add('open');
  }

  if (btnOpenStickers) btnOpenStickers.addEventListener('click', () => openStickersDrawer());

  const btnIpodStickers = document.getElementById('btn-ipod-stickers');
  if (btnIpodStickers) btnIpodStickers.addEventListener('click', () => openStickersDrawer());

  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', () => stickersDrawer.classList.remove('open'));
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => stickersDrawer.classList.remove('open'));

  if (drawerTabsEl) {
    drawerTabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn || !drawerTabsEl.contains(btn)) return;
      adesivosEscolhidos.clear();
      escolhendoAdesivos = false;
      activeStickerCategory = btn.dataset.tab;
      activeStickerMedia = 'all';
      playSfx(950);
      renderStickersGrid();
    });
  }

  if (btnStickerPick) {
    btnStickerPick.addEventListener('click', () => {
      playSfx(escolhendoAdesivos ? 820 : 1050);
      modoEscolherAdesivos(!escolhendoAdesivos);
    });
  }
  if (btnStickerPickAll) {
    btnStickerPickAll.addEventListener('click', () => {
      itensDaCategoriaVista().forEach((entry) => {
        adesivosEscolhidos.add(idDoMeuAdesivo(entry.item ?? entry.src));
      });
      playSfx(1120, 0.08, 'triangle');
      renderStickersGrid();
    });
  }
  if (btnStickerPickCancel) {
    btnStickerPickCancel.addEventListener('click', () => {
      playSfx(820);
      modoEscolherAdesivos(false);
    });
  }
  if (btnStickerPickDelete) {
    btnStickerPickDelete.addEventListener('click', () => apagarAdesivosEscolhidos());
  }

  if (stickerFilterEl) {
    stickerFilterEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn || !stickerFilterEl.contains(btn)) return;
      activeStickerMedia = btn.dataset.media;
      playSfx(900);
      renderStickersGrid();
    });
  }

  const btnClearStickers = document.getElementById('btn-clear-stickers');
  if (btnClearStickers) btnClearStickers.addEventListener('click', () => {
    const overlay = getActiveOverlay();
    if (!overlay) return;
    if (confirm('Deseja retirar os adesivos desta tela? 🌸')) {
      const doLivrinho = overlay.classList.contains('flip-stickers');
      overlay.innerHTML = '';
      deselectSticker();
      if (doLivrinho) sincronizarAdesivosDoLivrinho();
      if (overlay === coverStickersOverlay) state.coverStickers = [];
      registrarNoHistorico('limpou os adesivos');
      agendarAutosave(600);
      playSfx(480);
    }
  });

  const btnNewSticker = document.getElementById('btn-new-sticker');
  const customStickerUpload = document.getElementById('custom-sticker-upload');
  const stickerCreatorModal = document.getElementById('sticker-creator-modal');
  const btnCloseCreator = document.getElementById('btn-close-creator');
  const creatorPreviewImg = document.getElementById('creator-preview-img');
  const creatorCanvas = document.getElementById('creator-canvas');
  const btnRemoveBg = document.getElementById('btn-remove-bg');
  const btnConfirmSticker = document.getElementById('btn-confirm-sticker');
  const optWhiteBorder = document.getElementById('opt-white-border');
  const optShadow = document.getElementById('opt-shadow');
  const optWandTolerance = document.getElementById('opt-wand-tolerance');

  let uploadedStickerData = null;
  let salvandoAdesivo = false;
  let criadorJaSalvou = false;

  if (btnNewSticker) btnNewSticker.addEventListener('click', () => customStickerUpload && customStickerUpload.click());

  async function salvarVideoNaColecao(file) {
    try {
      showToast('🎬 preparando o seu vídeo…');
      const info = await prepararVideoDoArquivo(file);
      const salvo = await guardarVideoNoBanco(file, 'adesivo');
      const largura = 200;
      const altura = (info.width > 0 && info.height > 0)
        ? Math.max(1, Math.round(largura * (info.height / info.width)))
        : 0;
      const stickerObj = {
        id: `meu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content: salvo.referencia,
        mediaType: 'video',
        width: largura,
        ...(altura ? { height: altura } : {}),
        ...(info.poster ? { poster: info.poster } : {}),
        hasBorder: optWhiteBorder ? optWhiteBorder.checked : false,
        borderColor: '#ffffff',
        hasShadow: optShadow ? optShadow.checked : true
      };
      const guardou = guardarAdesivoNaColecao(stickerObj);
      placeSticker(stickerObj);
      if (stickersDrawer?.classList.contains('open')) {
        activeStickerCategory = 'meus';
        activeStickerMedia = 'all';
        refreshStickerDrawer();
      }
      playSfx(1250);
      if (!guardou) {
        showToast('🌧️ não consegui guardar o vídeo na coleção — o navegador está cheio', true);
      } else if (salvo.guardado === 'memoria') {
        showToast('🎬 vídeo colado! ele só fica nesta sessão (o navegador não deixou guardar) 🌧️', true);
      } else {
        showToast('🎬 vídeo salvo na sua coleção! ele fica neste aparelho ✧');
      }
    } catch (erro) {
      showToast('não consegui abrir esse vídeo 🌧️ tenta outro?', true);
    }
  }

  if (customStickerUpload) {
    customStickerUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (ehArquivoDeVideo(file)) {
        e.target.value = '';
        salvarVideoNaColecao(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        abrirCriadorCom(event.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function corDoFundo(dados, largura, altura) {
    const pontos = [
      [2, 2], [largura - 3, 2], [2, altura - 3], [largura - 3, altura - 3]
    ];
    let r = 0, g = 0, b = 0;
    pontos.forEach(([x, y]) => {
      const i = (Math.max(0, Math.min(altura - 1, y)) * largura + Math.max(0, Math.min(largura - 1, x))) * 4;
      r += dados[i]; g += dados[i + 1]; b += dados[i + 2];
    });
    return { r: r / pontos.length, g: g / pontos.length, b: b / pontos.length };
  }

  function distanciaDoFundo(dados, i, cor) {
    const dr = dados[i] - cor.r;
    const dg = dados[i + 1] - cor.g;
    const db = dados[i + 2] - cor.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function tirarOFundoComAVarinha({ larguraMaxima = 900, tolerancia = 42 } = {}) {
    if (!creatorPreviewImg || !creatorPreviewImg.src) return null;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = creatorPreviewImg.src;
    const natural = Math.max(img.naturalWidth, img.naturalHeight) || 0;
    const escala = natural > larguraMaxima ? larguraMaxima / natural : 1;
    const largura = Math.max(1, Math.round((img.naturalWidth || 1) * escala));
    const altura = Math.max(1, Math.round((img.naturalHeight || 1) * escala));

    creatorCanvas.width = largura;
    creatorCanvas.height = altura;
    const ctx = creatorCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, largura, altura);

    const imgData = ctx.getImageData(0, 0, largura, altura);
    const dados = imgData.data;
    const cor = corDoFundo(dados, largura, altura);
    const limite = Math.max(6, Number(tolerancia) || 42);
    const suave = limite * 0.7;
    const visitado = new Uint8Array(largura * altura);
    const pilha = [];

    const enfileirar = (x, y) => {
      if (x < 0 || y < 0 || x >= largura || y >= altura) return;
      const p = y * largura + x;
      if (visitado[p]) return;
      visitado[p] = 1;
      pilha.push(p);
    };

    for (let x = 0; x < largura; x++) { enfileirar(x, 0); enfileirar(x, altura - 1); }
    for (let y = 0; y < altura; y++) { enfileirar(0, y); enfileirar(largura - 1, y); }

    while (pilha.length) {
      const p = pilha.pop();
      const i = p * 4;
      const dist = distanciaDoFundo(dados, i, cor);
      if (dist > limite) continue;
      dados[i + 3] = dist <= suave
        ? 0
        : Math.round(255 * (dist - suave) / Math.max(1, limite - suave));
      const x = p % largura;
      const y = (p - x) / largura;
      enfileirar(x + 1, y);
      enfileirar(x - 1, y);
      enfileirar(x, y + 1);
      enfileirar(x, y - 1);
    }

    for (let p = 0; p < largura * altura; p++) {
      const i = p * 4;
      if (dados[i + 3] === 0) continue;
      if (distanciaDoFundo(dados, i, cor) > limite * 0.55) continue;
      const x = p % largura;
      const vizinhoTransparente =
        (x > 0 && dados[(p - 1) * 4 + 3] === 0)
        || (x < largura - 1 && dados[(p + 1) * 4 + 3] === 0)
        || (p >= largura && dados[(p - largura) * 4 + 3] === 0)
        || (p + largura < largura * altura && dados[(p + largura) * 4 + 3] === 0);
      if (vizinhoTransparente) dados[i + 3] = 90;
    }

    ctx.putImageData(imgData, 0, 0);
    return creatorCanvas.toDataURL('image/png');
  }

  if (btnRemoveBg) {
    btnRemoveBg.addEventListener('click', () => {
      if (!creatorPreviewImg || !creatorPreviewImg.src) return;
      const tolerancia = optWandTolerance ? Number(optWandTolerance.value) || 42 : 42;
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const semFundo = tirarOFundoComAVarinha({ tolerancia });
          if (!semFundo) return;
          uploadedStickerData = semFundo;
          creatorPreviewImg.src = semFundo;
          playSfx(1250, 0.15, 'triangle');
          showToast('🪄 Fundo removido! (dá pra ajustar a força da varinha e tentar de novo)');
        } catch (error) {
          showToast('não consegui tirar o fundo dessa imagem 🌧️', true);
        }
      };
      img.onerror = () => showToast('não consegui abrir essa imagem 🌧️', true);
      img.src = creatorPreviewImg.src;
    });
  }

  function fecharCriador() {
    if (stickerCreatorModal) stickerCreatorModal.classList.remove('open');
    uploadedStickerData = null;
    criadorJaSalvou = false;
    salvandoAdesivo = false;
    if (creatorPreviewImg) creatorPreviewImg.src = '';
    if (btnConfirmSticker) btnConfirmSticker.disabled = false;
  }

  if (btnCloseCreator) btnCloseCreator.addEventListener('click', () => fecharCriador());


  function abrirCriadorCom(dataUrl) {
    uploadedStickerData = dataUrl;
    criadorJaSalvou = false;
    salvandoAdesivo = false;
    if (creatorPreviewImg) creatorPreviewImg.src = dataUrl;
    if (btnConfirmSticker) {
      btnConfirmSticker.disabled = false;
      btnConfirmSticker.textContent = '✨ Salvar na Minha Coleção';
    }
    if (stickerCreatorModal) stickerCreatorModal.classList.add('open');
  }

  function guardarAdesivoNaColecao(stickerObj) {
    state.customStickers = Array.isArray(state.customStickers) ? state.customStickers : [];
    state.customStickers.push(stickerObj);
    return guardarNoNavegador('pooftie_custom_stickers', JSON.stringify(state.customStickers));
  }

  if (btnConfirmSticker) {
    btnConfirmSticker.addEventListener('click', () => {
      if (salvandoAdesivo || criadorJaSalvou) return;
      if (!uploadedStickerData) return;
      salvandoAdesivo = true;
      if (btnConfirmSticker) btnConfirmSticker.disabled = true;
      try {
        const stickerObj = {
          id: `meu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: uploadedStickerData,
          hasBorder: optWhiteBorder ? optWhiteBorder.checked : false,
          borderColor: '#ffffff',
          hasShadow: optShadow ? optShadow.checked : true
        };
        const guardou = guardarAdesivoNaColecao(stickerObj);
        criadorJaSalvou = true;

        if (stickerCreatorModal) stickerCreatorModal.classList.remove('open');
        uploadedStickerData = null;
        const colou = Boolean(placeSticker(stickerObj));
        if (stickersDrawer?.classList.contains('open')) {
          activeStickerCategory = 'meus';
          activeStickerMedia = 'all';
          refreshStickerDrawer();
        }
        playSfx(1250);
        if (!guardou) {
          showToast('🌧️ não consegui guardar na coleção — o navegador está cheio', true);
        } else if (colou) {
          showToast('✨ adesivinho salvo na sua coleção!');
        } else {
          showToast('✨ adesivinho salvo na sua coleção! ele está na aba "Meus"');
        }
      } catch (erro) {
        criadorJaSalvou = false;
        showToast('não consegui salvar esse adesivo 🌧️ tenta de novo?', true);
      } finally {
        salvandoAdesivo = false;
        if (btnConfirmSticker && !criadorJaSalvou) btnConfirmSticker.disabled = false;
      }
    });
  }

  const fontFamilySelect = document.getElementById('font-family-select');
  const customFontUpload = document.getElementById('custom-font-upload');

  function elementoPreguicoso(id) {
    let el = null;
    const pegar = () => {
      if (!el) el = document.getElementById(id);
      return el;
    };
    return new Proxy({}, {
      get(_, prop) {
        if (prop === '__el') return pegar();
        if (prop === 'then') return undefined;
        const alvo = pegar();
        if (!alvo) return undefined;
        const valor = alvo[prop];
        return typeof valor === 'function' ? valor.bind(alvo) : valor;
      },
      set(_, prop, valor) {
        const alvo = pegar();
        if (!alvo) return true;
        alvo[prop] = valor;
        return true;
      },
      has(_, prop) { return Boolean(pegar() && prop in pegar()); }
    });
  }

  function applyFont(fontFamily) {
    const letraComEmoji = fontFamily ? `${fontFamily}, var(--fonte-emoji)` : fontFamily;
    if (diaryTitle) diaryTitle.style.fontFamily = letraComEmoji;
    if (diaryBody) diaryBody.style.fontFamily = letraComEmoji;
    [pageTextsOverlay, coverTextsOverlay].forEach((caminha) => {
      if (caminha) caminha.style.setProperty('--text-font', fontFamily);
    });
    localStorage.setItem('pooftie_active_font', fontFamily);
    sincronizarPinturaComLivrinho();
  }

  if (fontFamilySelect) fontFamilySelect.addEventListener('change', (e) => applyFont(e.target.value));

  const savedFont = localStorage.getItem('pooftie_active_font');
  if (savedFont && fontFamilySelect) {
    fontFamilySelect.value = savedFont;
    applyFont(savedFont);
  }

  if (customFontUpload) {
    customFontUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const fontName = 'UserCustomFont_' + Date.now();
          const buffer = await file.arrayBuffer();
          const fontFace = new FontFace(fontName, buffer);
          await fontFace.load();
          document.fonts.add(fontFace);
          const newOpt = document.createElement('option');
          newOpt.value = `'${fontName}', cursive`;
          newOpt.textContent = `★ ${file.name.replace(/\.[^/.]+$/, "")} (Minha)`;
          fontFamilySelect.appendChild(newOpt);
          fontFamilySelect.value = newOpt.value;
          applyFont(newOpt.value);
          playSfx(1100);
          alert(`🔤 Fonte "${file.name}" carregada com sucesso!`);
        } catch (err) {
          alert('Não foi possível carregar a fonte.');
        }
      }
    });
  }

  const coverPaperColor = document.getElementById('cover-paper-color');
  const coverDotColor = document.getElementById('cover-dot-color');
  const coverDotSize = document.getElementById('cover-dot-size');
  const textColorInput = document.getElementById('text-color-input');
  const textOutlineColor = document.getElementById('text-outline-color');
  const btnTextColorAll = document.getElementById('btn-text-color-all');
  const btnTextOutline = document.getElementById('btn-text-outline');
  const fxTextHint = document.getElementById('fx-text-hint');
  const btnFxTextColor = document.getElementById('btn-fx-text-color');
  const btnFxTextOutline = document.getElementById('btn-fx-text-outline');


  function applyCoverStyle() {
    const estilo = Styling.makeDiaryStyle(state.coverStyle || {});
    state.coverStyle = estilo;
    const dotSize = `${Styling.dotSpacing(estilo.dots)}px`;

    if (coverNotebook) {
      coverNotebook.style.backgroundColor = estilo.paperColor;
      coverNotebook.dataset.dots = estilo.dots;
      coverNotebook.style.setProperty('--dot-color', estilo.dotColor);
      coverNotebook.style.setProperty('--dot-size', dotSize);
    }
    if (coverPaperColor) coverPaperColor.value = estilo.paperColor;
    if (coverDotColor) coverDotColor.value = estilo.dotColor;
    if (coverDotSize) coverDotSize.value = estilo.dots;

    guardarNoDiario('pooftie_cover_style', JSON.stringify(estilo));
    medidaDaCapinha();
    sincronizarPinturaComLivrinho();
    return estilo;
  }


  function estiloDaPaginaAtual() {
    return Styling.makeDiaryStyle((state.draft && state.draft.diaryStyle) || state.diaryStyle || {});
  }

  function letraDaPaginaAtual() {
    return Styling.textStyleDaPagina(
      { textStyle: state.draft && state.draft.textStyle },
      state.textDecoration || {}
    );
  }

  function paginaAtualTemCorPropria() {
    return Boolean(state.draft && state.draft.diaryStyle);
  }

  function paginaAtualTemLetraPropria() {
    return Boolean(state.draft && Styling.sanitizeTextStyle(state.draft.textStyle));
  }

  function paginaAtualTemPinturaPropria() {
    return paginaAtualTemCorPropria() || paginaAtualTemLetraPropria();
  }

  function pintarPapelDeEscrever(estilo) {
    if (!diaryPaper) return;
    diaryPaper.style.backgroundColor = estilo.paperColor;
    diaryPaper.dataset.dots = estilo.dots;
    diaryPaper.style.setProperty('--dot-color', estilo.dotColor);
    diaryPaper.style.setProperty('--dot-size', `${Styling.dotSpacing(estilo.dots)}px`);
  }

  function sincronizarControlesDaCor(estilo) {
    if (diaryPaperColor) diaryPaperColor.value = estilo.paperColor;
    if (diaryDotColor) diaryDotColor.value = estilo.dotColor;
    if (diaryDotSize) diaryDotSize.value = estilo.dots;
    atualizarBotoesDaCorDaPagina();
  }

  function atualizarBotoesDaCorDaPagina() {
    const propria = paginaAtualTemPinturaPropria();
    if (btnPageStyleReset) btnPageStyleReset.hidden = !propria;
    if (btnPageStyleAll) btnPageStyleAll.hidden = false;
  }

  function applyDiaryStyle(opcoes = {}) {
    const estilo = Styling.makeDiaryStyle(state.diaryStyle || {});
    state.diaryStyle = estilo;
    guardarNoDiario('pooftie_diary_style', JSON.stringify(estilo));

    if (opcoes.soDaPagina) {
      pintarPapelDeEscrever(estiloDaPaginaAtual());
      sincronizarControlesDaCor(estiloDaPaginaAtual());
      if (livrinho) livrinho.trocarCor(state.diaryStyle || {}, state.coverStyle || {});
      return estilo;
    }

    const daPagina = estiloDaPaginaAtual();
    pintarPapelDeEscrever(daPagina);
    sincronizarControlesDaCor(daPagina);

    sincronizarPinturaComLivrinho();
    return estilo;
  }

  function definirCorDaPagina(patch, { limpar = false } = {}) {
    if (!state.draft) return null;
    if (limpar) {
      state.draft.diaryStyle = null;
    } else {
      const atual = state.draft.diaryStyle || Styling.makeDiaryStyle(state.diaryStyle || {});
      state.draft.diaryStyle = Styling.customizarDiaryStyle(atual, patch);
    }
    sincronizarPapeizinho();
    const daPagina = estiloDaPaginaAtual();
    pintarPapelDeEscrever(daPagina);
    sincronizarControlesDaCor(daPagina);
    if (livrinho) livrinho.trocarCor(state.diaryStyle || {}, state.coverStyle || {});
    guardarRascunhoNoNavegador();
    return state.draft.diaryStyle;
  }

  async function aplicarCorATodasAsPaginas() {
    const estilo = estiloDaPaginaAtual();
    const entradas = readEntries();
    let quantas = 0;
    entradas.forEach((entrada) => {
      (entrada.pages || []).forEach((pagina) => {
        pagina.diaryStyle = { ...estilo };
        quantas += 1;
      });
    });
    if (quantas) await gravarEntradas(entradas);
    state.diaryStyle = estilo;
    guardarNoDiario('pooftie_diary_style', JSON.stringify(estilo));
    if (livrinho && livrinho.estaAberto()) atualizarLivrinho({ irPara: 'mesma' });
    registrarNoHistorico('pintou todas as páginas');
    agendarAutosave(600);
    return quantas;
  }

  async function aplicarLetraATodasAsPaginas() {
    const letra = letraDaPaginaAtual();
    const entradas = readEntries();
    let quantas = 0;
    entradas.forEach((entrada) => {
      (entrada.pages || []).forEach((pagina) => {
        pagina.textStyle = { ...letra };
        quantas += 1;
      });
    });
    if (quantas) await gravarEntradas(entradas);
    state.textDecoration = { ...letra };
    guardarNoDiario('pooftie_text_decoration', JSON.stringify(state.textDecoration));
    if (livrinho && livrinho.estaAberto()) atualizarLivrinho({ irPara: 'mesma' });
    registrarNoHistorico('pintou a letra de todas as páginas');
    agendarAutosave(600);
    return quantas;
  }

  function definirLetraDaPagina(patch, { limpar = false } = {}) {
    if (!state.draft) return null;
    if (limpar) {
      state.draft.textStyle = null;
    } else {
      const atual = state.draft.textStyle
        || Styling.makeTextDecoration(state.textDecoration || {});
      state.draft.textStyle = Styling.customizarTextStyle(atual, patch);
    }
    applyTextDecoration();
    guardarRascunhoNoNavegador();
    return state.draft.textStyle;
  }

  function bindDiaryStyleControls(corInput, bolinhaInput, tamanhoSelect, alvo = 'page') {
    const ehCapa = alvo === 'cover';
    const lerEstilo = () => (ehCapa
      ? (state.coverStyle || {})
      : (state.draft && state.draft.diaryStyle) || state.diaryStyle || {});
    const guardarEstilo = (novo) => {
      if (ehCapa) {
        state.coverStyle = novo;
        return;
      }
      definirCorDaPagina(novo);
    };
    const pintar = () => (ehCapa ? applyCoverStyle() : applyDiaryStyle({ soDaPagina: true }));
    const comecarMexida = () => registrarNoHistorico('pintou o diário');

    if (corInput) {
      corInput.addEventListener('pointerdown', comecarMexida);
      corInput.addEventListener('focus', comecarMexida);
      corInput.addEventListener('input', () => {
        guardarEstilo({ ...lerEstilo(), paperColor: corInput.value });
        pintar();
      });
      corInput.addEventListener('change', () => registrarNoHistorico('pintou o diário'));
    }
    if (bolinhaInput) {
      bolinhaInput.addEventListener('pointerdown', comecarMexida);
      bolinhaInput.addEventListener('focus', comecarMexida);
      bolinhaInput.addEventListener('input', () => {
        const tamanho = tamanhoSelect && tamanhoSelect.value !== 'none' ? tamanhoSelect.value : 'medium';
        guardarEstilo({ ...lerEstilo(), dotColor: bolinhaInput.value, dots: tamanho });
        pintar();
      });
      bolinhaInput.addEventListener('change', () => registrarNoHistorico('pintou as bolinhas'));
    }
    if (tamanhoSelect) {
      tamanhoSelect.addEventListener('change', () => {
        guardarEstilo({ ...lerEstilo(), dots: tamanhoSelect.value });
        pintar();
        registrarNoHistorico('trocou as bolinhas');
        playSfx(900);
      });
    }
  }

  bindDiaryStyleControls(coverPaperColor, coverDotColor, coverDotSize, 'cover');
  bindDiaryStyleControls(diaryPaperColor, diaryDotColor, diaryDotSize, 'page');

  if (btnPageStyleAll) {
    btnPageStyleAll.addEventListener('click', async () => {
      const quantas = await aplicarCorATodasAsPaginas();
      await aplicarLetraATodasAsPaginas();
      playSfx(1100);
      showToast(quantas
        ? `🎨 pintei as ${quantas} páginas com essa corzinha e essa letra`
        : 'não achei nenhuma página pra pintar ainda ⋆');
    });
  }

  if (btnPageStyleReset) {
    btnPageStyleReset.addEventListener('click', () => {
      definirCorDaPagina(null, { limpar: true });
      definirLetraDaPagina(null, { limpar: true });
      applyDiaryStyle();
      applyTextDecoration();
      registrarNoHistorico('voltou a página pro diário');
      agendarAutosave(600);
      playSfx(820);
      showToast('↺ essa página voltou pro combinadinho do diário');
    });
  }

  function pintarLetraNaFolha(letra) {
    const contorno = letra.outline ? `2px ${letra.outlineColor}` : '';
    [diaryBody, diaryTitle].forEach((alvo) => {
      if (!alvo) return;
      alvo.style.color = letra.color || '';
      alvo.style.webkitTextStroke = contorno;
      alvo.style.paintOrder = letra.outline ? 'stroke fill' : '';
    });
  }

  function applyTextDecoration() {
    const doDiario = Styling.makeTextDecoration(state.textDecoration || {});
    state.textDecoration = doDiario;
    const daPagina = letraDaPaginaAtual();

    pintarLetraNaFolha(daPagina);

    if (textColorInput && daPagina.color) textColorInput.value = daPagina.color;
    if (textOutlineColor) textOutlineColor.value = daPagina.outlineColor;
    if (btnTextOutline) {
      btnTextOutline.classList.toggle('active', daPagina.outline);
      btnTextOutline.textContent = daPagina.outline ? 'bordinha ✓' : 'bordinha';
    }
    atualizarBotoesDaCorDaPagina();
    guardarNoDiario('pooftie_text_decoration', JSON.stringify(doDiario));
    [[pageTextsOverlay, daPagina], [coverTextsOverlay, doDiario]].forEach(([caminha, letra]) => {
      if (!caminha) return;
      caminha.style.setProperty('--text-ink', letra.color || 'var(--text-chocolate)');
      caminha.style.setProperty('--text-stroke', letra.outline ? `2px ${letra.outlineColor}` : '0');
      caminha.style.setProperty('--text-paint-order', letra.outline ? 'stroke fill' : 'normal');
    });
    sincronizarPinturaComLivrinho();
  }

  function setTextSpans(list) {
    state.textSpans = Styling.parseTextSpans(diaryBody ? diaryBody.value : '', list || []);
    guardarNoDiario('pooftie_text_spans', JSON.stringify(state.textSpans));
  }

  let textoAnterior = diaryBody ? diaryBody.value : '';
  if (diaryBody) {
    diaryBody.addEventListener('input', () => {
      const texto = diaryBody.value;
      const cursor = diaryBody.selectionStart ?? texto.length;
      const diferenca = texto.length - textoAnterior.length;
      const mexidos = (state.textSpans || []).map((span) => {
        if (span.start >= cursor) return { ...span, start: span.start + diferenca, end: span.end + diferenca };
        if (span.end > cursor) return { ...span, end: span.end + diferenca };
        return span;
      });
      textoAnterior = texto;
      setTextSpans(mexidos);
    });
  }

  function selectedTextRange() {
    if (!diaryBody) return null;
    const start = diaryBody.selectionStart;
    const end = diaryBody.selectionEnd;
    if (!Styling.hasRange(diaryBody.value, start, end)) return null;
    return Styling.normalizeRange(diaryBody.value, start, end);
  }

  function selecaoDoLivrinho() {
    if (!livrinho || !livrinho.estaAberto() || !window.getSelection) return null;
    const alvo = livrinho.paginaEscrevivel();
    if (!alvo) return null;
    const corpo = livrinho.corpoDoLado(alvo.lado);
    if (!corpo) return null;
    const selecao = window.getSelection();
    if (!selecao || selecao.rangeCount === 0 || selecao.isCollapsed) return null;
    const range = selecao.getRangeAt(0);
    if (!corpo.contains(range.startContainer) || !corpo.contains(range.endContainer)) return null;

    const deslocamento = (no, offset) => {
      const medida = document.createRange();
      medida.setStart(corpo, 0);
      try {
        medida.setEnd(no, offset);
      } catch (error) {
        return null;
      }
      const texto = medida.toString();
      return texto.length;
    };

    const inicio = deslocamento(range.startContainer, range.startOffset);
    const fim = deslocamento(range.endContainer, range.endOffset);
    if (inicio === null || fim === null || fim <= inicio) return null;

    const texto = state.draft.body || '';
    if (!Styling.hasRange(texto, inicio, fim)) return null;
    return Styling.normalizeRange(texto, inicio, fim);
  }

  function refrescarSelecaoDoLivrinho() {
    refreshFxTextHint();
  }

  function refreshFxTextHint() {
    if (!fxTextHint) return;
    const temSelecao = Boolean(selectedTextRange() || selecaoDoLivrinho());
    fxTextHint.style.display = temSelecao ? 'flex' : 'none';
  }

  function styleSelectedText({ cor = false, bordinha = false, silencioso = false } = {}) {
    const range = selectedTextRange() || selecaoDoLivrinho();
    if (!range) {
      if (!silencioso) showToast('seleciona um trechinho do texto primeiro 🌸', true);
      return false;
    }
    const decoration = letraDaPaginaAtual();
    if (cor && textColorInput) decoration.color = Styling.normalizeColor(textColorInput.value) || decoration.color;
    if (bordinha) {
      decoration.outline = !decoration.outline;
      if (textOutlineColor) decoration.outlineColor = Styling.normalizeColor(textOutlineColor.value) || decoration.outlineColor;
    }
    setTextSpans([...state.textSpans, { ...range, decoration }]);
    playSfx(1150, 0.12, 'triangle');
    showToast('✧ pedacinho pintado!');
    deselectSticker();
    return true;
  }

  if (textColorInput) textColorInput.addEventListener('input', () => {
    if (!styleSelectedText({ cor: true, silencioso: true })) {
      definirLetraDaPagina({ color: textColorInput.value });
    }
  });

  if (textOutlineColor) textOutlineColor.addEventListener('input', () => {
    definirLetraDaPagina({ outlineColor: textOutlineColor.value });
    if (selectedTextRange()) styleSelectedText({ bordinha: true, silencioso: true });
  });

  if (btnTextColorAll) btnTextColorAll.addEventListener('click', async () => {
    const cor = textColorInput ? textColorInput.value : '#463529';
    definirLetraDaPagina({ color: cor });
    const quantas = await aplicarLetraATodasAsPaginas();
    playSfx(1050);
    showToast(quantas ? `🎨 pintei a letra das ${quantas} páginas` : '🎨 texto todo pintado!');
  });

  if (btnTextOutline) btnTextOutline.addEventListener('click', () => {
    definirLetraDaPagina({ outline: !letraDaPaginaAtual().outline });
    playSfx(950);
  });

  if (btnFxTextColor) btnFxTextColor.addEventListener('click', () => styleSelectedText({ cor: true }));
  if (btnFxTextOutline) btnFxTextOutline.addEventListener('click', () => {
    if (textOutlineColor) definirLetraDaPagina({ outlineColor: textOutlineColor.value });
    styleSelectedText({ bordinha: true });
  });

  if (diaryBody) {
    ['pointerup', 'keyup', 'mouseup'].forEach((evento) => {
      diaryBody.addEventListener(evento, () => setTimeout(refreshFxTextHint, 0));
    });
    diaryBody.addEventListener('blur', () => setTimeout(refreshFxTextHint, 0));
  }

  applyCoverStyle();
  applyDiaryStyle();
  applyTextDecoration();
  setTextSpans(state.textSpans);

  const calendarMonthYear = document.getElementById('calendar-month-year');
  const calendarDaysGrid = document.getElementById('calendar-days-grid');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const btnZoomInCal = document.getElementById('btn-zoom-in-cal');
  const btnZoomOutCal = document.getElementById('btn-zoom-out-cal');
  const calendarCard = document.getElementById('calendar-card');
  const calendarView = document.getElementById('view-calendar');

  const Calendario = window.PooftieCalendarStyle || null;
  if (!state.calendarStyle) state.calendarStyle = Calendario ? Calendario.ler(localStorage) : null;

  const Eventos = window.PooftieCalendarEvents || null;
  if (!Array.isArray(state.calendarEvents)) {
    state.calendarEvents = Eventos ? Eventos.ler(localStorage) : [];
  }
  function guardarEventos() {
    if (Eventos) Eventos.guardar(localStorage, state.calendarEvents);
    else localStorage.setItem('pooftie_cal_events', JSON.stringify(state.calendarEvents || []));
  }

  const NOMES_DOS_FUNDOS = {
    nenhum: 'lisinho',
    bolinhas: 'bolinhas',
    nuvens: 'nuvens',
    coracoes: 'corações',
    xadrez: 'xadrez',
    listras: 'listras',
    estrelinhas: 'estrelinhas',
    papel: 'papel',
    foto: 'minha foto'
  };
  const NOMES_DOS_QUADROS = { grade: 'grade', cartoes: 'cartões', redondos: 'redondos', limpos: 'limpos' };

  function aplicarTemaDoCalendario() {
    if (!Calendario || !calendarView || !state.calendarStyle) return;
    Calendario.aplicar(calendarView, state.calendarStyle);
    const modalDoDia = document.getElementById('reminder-modal');
    if (modalDoDia) Calendario.aplicar(modalDoDia, state.calendarStyle);
  }

  function guardarTemaDoCalendario() {
    if (Calendario) Calendario.guardar(localStorage, state.calendarStyle);
  }

  function corDoDia(dateStr) {
    return (state.calendarNoteColors && state.calendarNoteColors[dateStr]) || '';
  }

  function corDaTarefinha(dateStr, indice) {
    const doDia = corDoDia(dateStr);
    if (doDia) return doDia;
    return Calendario ? Calendario.corDaTarefa(state.calendarStyle, indice) : '#f9d3e0';
  }

  function criarTarefinha(texto, cor, classe = 'cal-day-task') {
    const chip = document.createElement('span');
    chip.className = classe;
    chip.textContent = texto;
    chip.title = texto;
    chip.style.setProperty('--cal-tarefa-cor', cor);
    return chip;
  }

  const reminderModal = document.getElementById('reminder-modal');
  const reminderBackdrop = document.getElementById('reminder-backdrop');
  const reminderInput = document.getElementById('reminder-input');
  const reminderDateLabel = document.getElementById('reminder-date-label');
  const reminderPreview = document.getElementById('reminder-preview');
  const reminderColors = document.getElementById('reminder-colors');
  const btnReminderSave = document.getElementById('btn-reminder-save');
  const btnReminderCancel = document.getElementById('btn-reminder-cancel');
  const btnReminderClear = document.getElementById('btn-reminder-clear');

  const TOQUE_DUPLO_MS = 360;

  function renderPreviaDoDia() {
    if (!reminderPreview) return;
    const dateStr = state.reminderDate;
    const tarefas = Calendario ? Calendario.linhasDaNota(reminderInput ? reminderInput.value : '') : [];
    reminderPreview.innerHTML = '';
    if (!tarefas.length) {
      const vazio = document.createElement('span');
      vazio.className = 'reminder-preview-vazio';
      vazio.textContent = 'nenhuma tarefinha por aqui ainda ⋆';
      reminderPreview.appendChild(vazio);
      return;
    }
    tarefas.slice(0, 6).forEach((texto, indice) => {
      reminderPreview.appendChild(criarTarefinha(texto, corDaTarefinha(dateStr, indice)));
    });
    if (tarefas.length > 6) {
      const mais = criarTarefinha(`+${tarefas.length - 6}`, 'transparent', 'cal-day-task tarefa-mais');
      reminderPreview.appendChild(mais);
    }
  }

  function renderCoresDoDia() {
    if (!reminderColors || !Calendario) return;
    const dateStr = state.reminderDate;
    const escolhida = corDoDia(dateStr);
    reminderColors.innerHTML = '';

    const auto = document.createElement('button');
    auto.type = 'button';
    auto.className = 'reminder-color auto' + (escolhida ? '' : ' is-escolhido');
    auto.title = 'cores automáticas (uma pra cada tarefinha)';
    auto.setAttribute('aria-label', 'usar as cores automáticas');
    auto.addEventListener('click', () => definirCorDoDia(''));
    reminderColors.appendChild(auto);

    Calendario.coresDaPaleta(state.calendarStyle).forEach((cor) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'reminder-color' + (escolhida === cor ? ' is-escolhido' : '');
      botao.style.background = cor;
      botao.title = `pintar as tarefinhas do dia com ${cor}`;
      botao.setAttribute('aria-label', `usar a cor ${cor} nas tarefinhas do dia`);
      botao.addEventListener('click', () => definirCorDoDia(cor));
      reminderColors.appendChild(botao);
    });
  }

  function definirCorDoDia(cor) {
    const dateStr = state.reminderDate;
    if (!dateStr) return;
    if (cor) state.calendarNoteColors[dateStr] = cor;
    else delete state.calendarNoteColors[dateStr];
    guardarNoNavegador('pooftie_cal_note_colors', JSON.stringify(state.calendarNoteColors));
    renderCoresDoDia();
    renderPreviaDoDia();
    renderCalendar();
    playSfx(1120, 0.05);
  }

  const reminderReactions = document.getElementById('reminder-reactions');
  const CARINHAS_DO_DIA = ['🍰', '🌸', '🎀', '🧸', '☕', '🌧️'];

  function renderCarinhasDoDia() {
    if (!reminderReactions) return;
    const dateStr = state.reminderDate;
    const atual = (state.calendarReactions[dateStr] || '');
    reminderReactions.innerHTML = '';
    CARINHAS_DO_DIA.forEach((emoji) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'reminder-reacao' + (atual === emoji ? ' is-escolhido' : '');
      botao.dataset.reaction = emoji;
      botao.textContent = emoji;
      botao.title = `marcar o dia com ${emoji}`;
      botao.setAttribute('aria-label', `marcar o dia com ${emoji}`);
      botao.setAttribute('aria-pressed', atual === emoji ? 'true' : 'false');
      botao.addEventListener('click', () => definirCarinhaDoDia(emoji));
      reminderReactions.appendChild(botao);
    });
    const sem = document.createElement('button');
    sem.type = 'button';
    sem.className = 'reminder-reacao sem-carinha' + (atual ? '' : ' is-escolhido');
    sem.textContent = 'sem carinha';
    sem.title = 'deixar o dia sem carinha';
    sem.setAttribute('aria-label', 'deixar o dia sem carinha');
    sem.addEventListener('click', () => definirCarinhaDoDia(''));
    reminderReactions.appendChild(sem);
  }

  function definirCarinhaDoDia(emoji) {
    const dateStr = state.reminderDate;
    if (!dateStr) return;
    if (!emoji || state.calendarReactions[dateStr] === emoji) delete state.calendarReactions[dateStr];
    else state.calendarReactions[dateStr] = emoji;
    guardarNoNavegador('pooftie_cal_reactions', JSON.stringify(state.calendarReactions));
    renderCarinhasDoDia();
    renderCalendar();
    playSfx(emoji ? 1200 : 880, 0.05);
  }

  const eventTitleInput = document.getElementById('event-title');
  const eventEndInput = document.getElementById('event-end');
  const eventColorsBox = document.getElementById('event-colors');
  const eventListBox = document.getElementById('event-list');
  const btnEventAdd = document.getElementById('btn-event-add');
  const CORES_DOS_EVENTOS = (Eventos && Eventos.CORES) || ['#f7b0c6'];
  let corDoEvento = CORES_DOS_EVENTOS[0];

  function formatarIntervalo(inicio, fim) {
    const curto = (iso) => {
      const partes = String(iso || '').split('-');
      return partes.length === 3 ? `${Number(partes[2])}/${Number(partes[1])}` : String(iso || '');
    };
    if (!fim || fim === inicio) return curto(inicio);
    return `${curto(inicio)} até ${curto(fim)}`;
  }

  function renderCoresDoEvento() {
    if (!eventColorsBox) return;
    eventColorsBox.innerHTML = '';
    CORES_DOS_EVENTOS.forEach((cor) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'reminder-color' + (corDoEvento === cor ? ' is-escolhido' : '');
      botao.style.background = cor;
      botao.title = `pintar o evento com ${cor}`;
      botao.setAttribute('aria-label', `pintar o evento com ${cor}`);
      botao.addEventListener('click', () => {
        corDoEvento = cor;
        renderCoresDoEvento();
        playSfx(1080, 0.04);
      });
      eventColorsBox.appendChild(botao);
    });
  }

  function renderEventosDoDia() {
    if (!eventListBox) return;
    const dateStr = state.reminderDate;
    eventListBox.innerHTML = '';
    const eventos = Eventos ? Eventos.eventosDoDia(state.calendarEvents, dateStr) : [];
    if (!eventos.length) {
      const vazio = document.createElement('span');
      vazio.className = 'reminder-event-empty';
      vazio.textContent = 'nenhum evento comprido por aqui ainda ⋆';
      eventListBox.appendChild(vazio);
      return;
    }
    eventos.forEach((evento) => {
      const item = document.createElement('div');
      item.className = 'reminder-event-item';

      const bolinha = document.createElement('span');
      bolinha.className = 'reminder-event-dot';
      bolinha.style.background = evento.cor;
      item.appendChild(bolinha);

      const texto = document.createElement('span');
      texto.className = 'reminder-event-text';
      const titulo = document.createElement('strong');
      titulo.textContent = evento.titulo;
      const quando = document.createElement('small');
      quando.textContent = formatarIntervalo(evento.inicio, evento.fim);
      texto.appendChild(titulo);
      texto.appendChild(quando);
      item.appendChild(texto);

      const tirar = document.createElement('button');
      tirar.type = 'button';
      tirar.className = 'reminder-event-remove';
      tirar.textContent = '✕';
      tirar.title = `tirar "${evento.titulo}"`;
      tirar.setAttribute('aria-label', `tirar o evento ${evento.titulo}`);
      tirar.addEventListener('click', () => removerEvento(evento.id));
      item.appendChild(tirar);

      eventListBox.appendChild(item);
    });
  }

  function adicionarEvento() {
    if (!Eventos) return;
    const dateStr = state.reminderDate;
    if (!dateStr) return;
    const titulo = eventTitleInput ? eventTitleInput.value.trim() : '';
    if (!titulo) {
      showToast('escreve o nome do evento primeiro 🌸', true);
      eventTitleInput?.focus();
      return;
    }
    let fim = Eventos.normalizarData(eventEndInput ? eventEndInput.value : '') || dateStr;
    if (fim < dateStr) fim = dateStr;
    const novo = Eventos.criar({ titulo, inicio: dateStr, fim, cor: corDoEvento });
    if (!novo) {
      showToast('não consegui guardar esse evento 🌧️', true);
      return;
    }
    state.calendarEvents = Eventos.comEvento(state.calendarEvents, novo);
    guardarEventos();
    if (eventTitleInput) eventTitleInput.value = '';
    if (eventEndInput) eventEndInput.value = dateStr;
    renderEventosDoDia();
    renderCalendar();
    playSfx(1250, 0.14, 'triangle');
    showToast(`📅 ${novo.titulo} guardado!`);
  }

  function removerEvento(id) {
    if (!Eventos) return;
    state.calendarEvents = Eventos.semEvento(state.calendarEvents, id);
    guardarEventos();
    renderEventosDoDia();
    renderCalendar();
    playSfx(620, 0.12, 'triangle');
    showToast('evento tirado 🌧️');
  }

  const photoPreview = document.getElementById('photo-preview');
  const photoUpload = document.getElementById('photo-upload');
  const btnPhotoClear = document.getElementById('btn-photo-clear');
  const photoNaFrente = document.getElementById('photo-na-frente');
  const LIMITE_DA_FOTO_DO_DIA = 130 * 1024;

  function guardarFotosDoCalendario() {
    try {
      localStorage.setItem('pooftie_cal_photos', JSON.stringify(state.calendarPhotos || {}));
      return true;
    } catch (erro) {
      showToast('o navegador tá sem espacinho pra mais fotinhas 🌧️ tenta tirar alguma', true);
      return false;
    }
  }

  function fotoDoDia(dateStr) {
    return (state.calendarPhotos && state.calendarPhotos[dateStr]) || null;
  }

  function renderFotoDoDia() {
    if (!photoPreview) return;
    const foto = fotoDoDia(state.reminderDate);
    photoPreview.innerHTML = '';
    photoPreview.classList.toggle('tem-foto', Boolean(foto));
    if (foto) {
      const imagem = document.createElement('img');
      imagem.src = foto.src;
      imagem.alt = 'foto do dia';
      photoPreview.appendChild(imagem);
    } else {
      const vazio = document.createElement('span');
      vazio.className = 'reminder-photo-empty';
      vazio.textContent = 'nenhuma fotinha ainda ⋆';
      photoPreview.appendChild(vazio);
    }
    if (btnPhotoClear) btnPhotoClear.hidden = !foto;
    if (photoNaFrente) {
      photoNaFrente.checked = Boolean(foto && foto.frente);
      photoNaFrente.disabled = !foto;
      photoNaFrente.closest('.reminder-photo-switch')?.classList.toggle('is-off', !foto);
    }
  }

  async function encolherFotoDoDia(file) {
    const bitmap = await createImageBitmap(file);
    const lado = Math.max(bitmap.width, bitmap.height) || 1;
    let escala = Math.min(1, 720 / lado);
    const tentativas = [0.72, 0.62, 0.5, 0.4];
    for (const qualidade of tentativas) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/webp', qualidade);
      if (url.length <= LIMITE_DA_FOTO_DO_DIA) return url;
      escala *= 0.82;
    }
    return '';
  }

  async function trocarFotoDoDia(file) {
    const dateStr = state.reminderDate;
    if (!dateStr || !file) return;
    try {
      const src = await encolherFotoDoDia(file);
      if (!src) {
        showToast('essa foto é grande demais 🌧️ tenta outra?', true);
        return;
      }
      const antes = state.calendarPhotos[dateStr] || {};
      state.calendarPhotos[dateStr] = { src, frente: Boolean(antes.frente) };
      if (!guardarFotosDoCalendario()) {
        if (antes.src) state.calendarPhotos[dateStr] = antes;
        else delete state.calendarPhotos[dateStr];
        return;
      }
      renderFotoDoDia();
      renderCalendar();
      playSfx(1150);
      showToast('🖼️ fotinha do dia guardada!');
    } catch (erro) {
      showToast('não consegui usar essa foto 🌧️', true);
    } finally {
      if (photoUpload) photoUpload.value = '';
    }
  }

  function tirarFotoDoDia() {
    const dateStr = state.reminderDate;
    if (!dateStr || !state.calendarPhotos[dateStr]) return;
    delete state.calendarPhotos[dateStr];
    guardarFotosDoCalendario();
    renderFotoDoDia();
    renderCalendar();
    playSfx(620, 0.12, 'triangle');
    showToast('foto tirada 🌧️');
  }

  function trocarCamadaDaFoto(frente) {
    const dateStr = state.reminderDate;
    const foto = fotoDoDia(dateStr);
    if (!foto) return;
    state.calendarPhotos[dateStr] = { ...foto, frente: Boolean(frente) };
    guardarFotosDoCalendario();
    renderFotoDoDia();
    renderCalendar();
    playSfx(1080, 0.04);
  }

  if (photoUpload) {
    photoUpload.addEventListener('change', () => {
      const file = photoUpload.files && photoUpload.files[0];
      if (file) trocarFotoDoDia(file);
    });
  }
  if (btnPhotoClear) btnPhotoClear.addEventListener('click', tirarFotoDoDia);
  if (photoNaFrente) {
    photoNaFrente.addEventListener('change', () => trocarCamadaDaFoto(photoNaFrente.checked));
  }

  if (btnEventAdd) btnEventAdd.addEventListener('click', adicionarEvento);
  if (eventTitleInput) {
    eventTitleInput.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        adicionarEvento();
      }
    });
  }

  function abrirLembrete(dateStr, day, month) {
    if (!reminderModal) return;
    state.reminderDate = dateStr;
    if (reminderInput) reminderInput.value = state.calendarNotes[dateStr] || '';
    if (reminderDateLabel) {
      const dataBonita = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
      reminderDateLabel.textContent = `dia ${dataBonita} ⋆ tarefinhas rapidinhas`;
    }
    corDoEvento = CORES_DOS_EVENTOS[(state.calendarEvents || []).length % CORES_DOS_EVENTOS.length];
    if (eventTitleInput) eventTitleInput.value = '';
    if (eventEndInput) eventEndInput.value = dateStr;
    renderPreviaDoDia();
    renderCoresDoDia();
    renderCarinhasDoDia();
    renderCoresDoEvento();
    renderEventosDoDia();
    renderFotoDoDia();
    reminderModal.classList.add('open');
    setTimeout(() => reminderInput?.focus(), 60);
    playSfx(1150);
  }

  function fecharLembrete() {
    if (reminderModal) reminderModal.classList.remove('open');
    state.reminderDate = '';
  }

  function guardarLembrete(apagar = false) {
    const dateStr = state.reminderDate;
    if (!dateStr) { fecharLembrete(); return; }
    const texto = apagar ? '' : (reminderInput ? reminderInput.value.trim() : '');
    if (texto) state.calendarNotes[dateStr] = texto.slice(0, 600);
    else delete state.calendarNotes[dateStr];
    localStorage.setItem('pooftie_cal_notes', JSON.stringify(state.calendarNotes));
    renderCalendar();
    fecharLembrete();
    playSfx(apagar ? 620 : 1250, 0.14, 'triangle');
    showToast(apagar ? 'tarefinhas apagadas 🌧️' : '📝 tarefinhas guardadas!');
  }

  if (btnReminderSave) btnReminderSave.addEventListener('click', () => guardarLembrete(false));
  if (btnReminderClear) btnReminderClear.addEventListener('click', () => guardarLembrete(true));
  if (btnReminderCancel) btnReminderCancel.addEventListener('click', fecharLembrete);
  if (reminderBackdrop) reminderBackdrop.addEventListener('click', fecharLembrete);
  if (reminderInput) {
    reminderInput.addEventListener('input', renderPreviaDoDia);
    reminderInput.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
        evento.preventDefault();
        guardarLembrete(false);
      }
      if (evento.key === 'Escape') fecharLembrete();
    });
  }
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && reminderModal?.classList.contains('open')) fecharLembrete();
  });


  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  function montarTopoDoDia(day, dateStr) {
    const topo = document.createElement('div');
    topo.className = 'cal-day-top';
    const numero = document.createElement('span');
    numero.className = 'cal-day-num';
    numero.textContent = String(day);
    topo.appendChild(numero);

    const mini = Calendario ? Calendario.miniDoDia(dateStr, state.calendarStyle ? state.calendarStyle.mini : 'mesdia') : '';
    if (mini) {
      const numerinho = document.createElement('span');
      numerinho.className = 'cal-day-mini';
      numerinho.textContent = mini;
      numerinho.title = state.calendarStyle.mini === 'dia'
        ? 'dia do ano'
        : (state.calendarStyle.mini === 'semana' ? 'semana do ano' : 'data curtinha');
      topo.appendChild(numerinho);
    }
    return topo;
  }

  function chaveDaData(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

  let gradeDoMes = null;
  let datasDaGrade = [];
  let celulasDaGrade = [];
  let larguraDaGrade = 0;

  function criarCelulaDoDia(day, dateStr, { outroMes = false, domingo = false, mes = 0, temMemoria = false } = {}) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell' + (outroMes ? ' other-month' : '');
    if (domingo) cell.classList.add('is-domingo');
    if (dateStr === hojeStr()) cell.classList.add('today');
    if (temMemoria) cell.classList.add('has-entry');

    const foto = fotoDoDia(dateStr);
    if (foto && foto.src) {
      cell.classList.add('tem-foto');
      if (foto.frente) cell.classList.add('foto-na-frente');
      const imagem = document.createElement('img');
      imagem.className = 'cal-day-photo';
      imagem.src = foto.src;
      imagem.alt = '';
      imagem.loading = 'lazy';
      imagem.decoding = 'async';
      cell.appendChild(imagem);
    }

    cell.appendChild(montarTopoDoDia(day, dateStr));

    const tarefas = Calendario ? Calendario.linhasDaNota(state.calendarNotes[dateStr]) : [];
    cell.setAttribute(
      'aria-label',
      `${day} de ${monthNames[mes]}${tarefas.length ? ': ' + tarefas.join(', ') : ''}`
    );

    if (state.calendarReactions[dateStr]) {
      const reactBadge = document.createElement('span');
      reactBadge.className = 'cal-day-reaction';
      reactBadge.textContent = state.calendarReactions[dateStr];
      cell.appendChild(reactBadge);
    }

    let ultimoToque = 0;
    cell.dataset.date = dateStr;
    cell.dataset.day = String(day);
    cell.addEventListener('click', () => {
      const agora = Date.now();
      if (agora - ultimoToque < TOQUE_DUPLO_MS) {
        ultimoToque = 0;
        abrirLembrete(dateStr, day, mes);
        return;
      }
      ultimoToque = agora;
      if (diaryDateEl) diaryDateEl.value = dateStr;
      const found = readEntries().find((e) => e.date === dateStr);
      loadEntryIntoPage(found || null);
      setTimeout(() => {
        if (state.reminderDate) return;
        abrirLivrinho();
      }, TOQUE_DUPLO_MS);
    });

    return cell;
  }

  function renderCalendar() {
    if (!calendarDaysGrid) return;
    aplicarTemaDoCalendario();
    calendarDaysGrid.innerHTML = '';
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    if (calendarMonthYear) calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const datasComPagina = datasComMemoria();

    larguraDaGrade = calendarDaysGrid.clientWidth || larguraDaGrade;
    const passo = Math.max(13, Math.min(24, (larguraDaGrade || 380) * 0.032));
    calendarDaysGrid.style.setProperty('--cal-faixa-passo', `${passo}px`);

    datasDaGrade = [];
    celulasDaGrade = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dia = prevMonthDays - i;
      const data = new Date(year, month - 1, dia);
      const dateStr = chaveDaData(data);
      const cell = criarCelulaDoDia(dia, dateStr, {
        outroMes: true,
        domingo: data.getDay() === 0,
        mes: data.getMonth(),
        temMemoria: datasComPagina.has(dateStr)
      });
      calendarDaysGrid.appendChild(cell);
      datasDaGrade.push(dateStr);
      celulasDaGrade.push(cell);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = criarCelulaDoDia(day, dateStr, {
        domingo: new Date(year, month, day).getDay() === 0,
        mes: month,
        temMemoria: datasComPagina.has(dateStr)
      });
      calendarDaysGrid.appendChild(cell);
      datasDaGrade.push(dateStr);
      celulasDaGrade.push(cell);
    }

    const sobram = (7 - ((firstDayIndex + totalDays) % 7)) % 7;
    for (let i = 1; i <= sobram; i++) {
      const data = new Date(year, month + 1, i);
      const dateStr = chaveDaData(data);
      const cell = criarCelulaDoDia(i, dateStr, {
        outroMes: true,
        domingo: data.getDay() === 0,
        mes: data.getMonth(),
        temMemoria: datasComPagina.has(dateStr)
      });
      calendarDaysGrid.appendChild(cell);
      datasDaGrade.push(dateStr);
      celulasDaGrade.push(cell);
    }

    const faixas = [];
    (state.calendarEvents || []).forEach((evento, indice) => {
      faixas.push({
        id: `evento:${evento.id}`,
        idEvento: evento.id,
        titulo: evento.titulo,
        cor: evento.cor,
        inicio: evento.inicio,
        fim: evento.fim,
        tipo: 'evento',
        ordem: indice
      });
    });
    Object.keys(state.calendarNotes || {}).forEach((dateStr) => {
      const tarefas = Calendario ? Calendario.linhasDaNota(state.calendarNotes[dateStr]) : [];
      tarefas.forEach((titulo, indice) => {
        faixas.push({
          id: `tarefa:${dateStr}:${indice}`,
          titulo,
          cor: corDaTarefinha(dateStr, indice),
          inicio: dateStr,
          fim: dateStr,
          tipo: 'tarefa',
          ordem: indice
        });
      });
    });

    gradeDoMes = Eventos ? Eventos.montarGrade({ dias: datasDaGrade, faixas }) : null;

    if (gradeDoMes) {
      const linhasDaSemana = gradeDoMes.semanas.map((semana) => semana.totalFaixas);
      const maxFaixas = linhasDaSemana.length ? Math.max(...linhasDaSemana) : 0;
      celulasDaGrade.forEach((celula) => {
        celula.style.setProperty('--cal-linhas', String(maxFaixas));
      });
    }

    posicionarFaixas();
  }

  function posicionarFaixas() {
    if (!calendarDaysGrid) return;
    const largura = calendarDaysGrid.clientWidth || 0;
    if (!largura) return;

    const antigo = calendarDaysGrid.querySelector('.cal-days-overlay');
    if (antigo) antigo.remove();
    const overlay = document.createElement('div');
    overlay.className = 'cal-days-overlay';

    larguraDaGrade = largura;
    const passo = Math.max(13, Math.min(24, largura * 0.032));
    calendarDaysGrid.style.setProperty('--cal-faixa-passo', `${passo}px`);
    const altura = Math.max(9, passo - 3);

    if (gradeDoMes) {
      gradeDoMes.semanas.forEach((semana, indiceDaSemana) => {
        const grupos = [];
        const grupoDaFaixa = new Map();
        for (let coluna = 0; coluna < 7; coluna += 1) {
          for (const segmento of semana.celulas[coluna] || []) {
            const anterior = grupoDaFaixa.get(segmento.id);
            if (anterior && anterior.colFim === coluna - 1) {
              anterior.colFim = coluna;
            } else {
              const grupo = { segmento, colInicio: coluna, colFim: coluna };
              grupos.push(grupo);
              grupoDaFaixa.set(segmento.id, grupo);
            }
          }
        }

        grupos.forEach(({ segmento, colInicio, colFim }) => {
          const celulaInicio = celulasDaGrade[indiceDaSemana * 7 + colInicio];
          const celulaFim = celulasDaGrade[indiceDaSemana * 7 + colFim];
          if (!celulaInicio || !celulaFim) return;
          const topo = celulaInicio.querySelector('.cal-day-top');
          const baseDoTopo = (topo ? topo.offsetTop + topo.offsetHeight : 0) + 3;
          const dateStr = datasDaGrade[indiceDaSemana * 7 + colInicio];

          const barra = document.createElement('button');
          barra.type = 'button';
          barra.className = 'cal-faixa'
            + (segmento.comecaAqui ? ' comeca-aqui' : '')
            + (segmento.terminaAqui ? ' termina-aqui' : '')
            + (segmento.tipo === 'evento' ? ' is-evento' : ' is-tarefa');
          barra.style.setProperty('--faixa-cor', segmento.cor);
          barra.style.setProperty('--faixa-texto', segmento.textoCor);
          barra.style.top = `${celulaInicio.offsetTop + baseDoTopo + (segmento.lane - 1) * passo}px`;

          const esquerda = Math.max(0, celulaInicio.offsetLeft + (segmento.comecaAqui ? 4 : -1));
          const direita = celulaFim.offsetLeft + celulaFim.offsetWidth - (segmento.terminaAqui ? 4 : -1);
          barra.style.left = `${esquerda}px`;
          barra.style.width = `${Math.max(6, direita - esquerda)}px`;
          barra.style.height = `${altura}px`;
          barra.textContent = segmento.mostrarTitulo ? segmento.titulo : '';
          barra.title = segmento.tipo === 'evento'
            ? `${segmento.titulo} · ${formatarIntervalo(segmento.inicio, segmento.fim)}`
            : segmento.titulo;
          barra.setAttribute('aria-label', barra.title);
          barra.addEventListener('click', (evento) => {
            evento.stopPropagation();
            const alvo = segmento.tipo === 'evento' ? segmento.inicio : dateStr;
            const [ano, mes, dia] = String(alvo).split('-').map(Number);
            abrirLembrete(alvo, dia, mes - 1);
          });
          overlay.appendChild(barra);
        });
      });
    }

    calendarDaysGrid.appendChild(overlay);
  }

  if (calendarDaysGrid && typeof ResizeObserver === 'function') {
    let agendado = 0;
    const observador = new ResizeObserver(() => {
      if (agendado) return;
      agendado = requestAnimationFrame(() => {
        agendado = 0;
        if (Math.abs((calendarDaysGrid.clientWidth || 0) - larguraDaGrade) <= 2) return;
        posicionarFaixas();
      });
    });
    observador.observe(calendarDaysGrid);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(posicionarFaixas, 0)).catch(() => {});
    if (typeof document.fonts.addEventListener === 'function') {
      document.fonts.addEventListener('loadingdone', () => posicionarFaixas());
    }
  }


  const calThemeModal = document.getElementById('calendar-theme-modal');
  const calThemeBackdrop = document.getElementById('calendar-theme-backdrop');
  const btnCalendarTheme = document.getElementById('btn-calendar-theme');
  const btnCalThemeClose = document.getElementById('btn-cal-theme-close');
  const btnCalThemeDone = document.getElementById('btn-cal-theme-done');
  const btnCalThemeReset = document.getElementById('btn-cal-theme-reset');
  const btnSettingsCalendar = document.getElementById('btn-settings-calendar');
  const calFundoGrid = document.getElementById('cal-fundo-grid');
  const calQuadrosGrid = document.getElementById('cal-quadros-grid');
  const calFundoCor = document.getElementById('cal-fundo-cor');
  const calDetalheCor = document.getElementById('cal-detalhe-cor');
  const calCelulaCor = document.getElementById('cal-celula-cor');
  const calLinhaCor = document.getElementById('cal-linha-cor');
  const calTextoCor = document.getElementById('cal-texto-cor');
  const calFonteSelect = document.getElementById('cal-fonte-select');
  const calMiniSelect = document.getElementById('cal-mini-select');
  const calPaletaSelect = document.getElementById('cal-paleta-select');
  const calDomingoVermelho = document.getElementById('cal-domingo-vermelho');
  const calFotoUpload = document.getElementById('cal-foto-upload');
  const btnCalFoto = document.getElementById('btn-cal-foto');
  const btnCalFotoClear = document.getElementById('btn-cal-foto-clear');

  function mudarTemaDoCalendario(mudanca, { redesenhar = true } = {}) {
    if (!Calendario) return;
    state.calendarStyle = Calendario.normalizar({ ...state.calendarStyle, ...mudanca });
    guardarTemaDoCalendario();
    aplicarTemaDoCalendario();
    if (redesenhar) renderCalendar();
  }

  function renderTemaDoCalendario() {
    const estilo = state.calendarStyle;
    if (!Calendario || !estilo) return;

    if (calFundoGrid) {
      calFundoGrid.innerHTML = '';
      const fundos = Calendario.FUNDOS.filter((fundo) => fundo !== 'foto' || estilo.foto);
      fundos.forEach((fundo) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'cal-fundo-option' + (estilo.fundo === fundo ? ' is-escolhido' : '');
        botao.title = `fundo ${NOMES_DOS_FUNDOS[fundo] || fundo}`;
        botao.setAttribute('aria-label', `fundo ${NOMES_DOS_FUNDOS[fundo] || fundo}`);
        botao.style.background = Calendario.fundoCss({ ...estilo, fundo });
        const nome = document.createElement('span');
        nome.className = 'cal-fundo-nome';
        nome.textContent = NOMES_DOS_FUNDOS[fundo] || fundo;
        botao.appendChild(nome);
        botao.addEventListener('click', () => {
          mudarTemaDoCalendario({ fundo });
          renderTemaDoCalendario();
          playSfx(1080, 0.04);
        });
        calFundoGrid.appendChild(botao);
      });
    }

    if (calQuadrosGrid) {
      calQuadrosGrid.innerHTML = '';
      Calendario.QUADROS.forEach((quadros) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'cal-quadro-option' + (estilo.quadros === quadros ? ' is-escolhido' : '');
        botao.title = `quadradinhos ${NOMES_DOS_QUADROS[quadros] || quadros}`;
        const amostra = document.createElement('span');
        amostra.className = `cal-quadro-preview q-${quadros}`;
        for (let i = 0; i < 4; i++) amostra.appendChild(document.createElement('i'));
        botao.appendChild(amostra);
        const nome = document.createElement('span');
        nome.textContent = NOMES_DOS_QUADROS[quadros] || quadros;
        botao.appendChild(nome);
        botao.addEventListener('click', () => {
          mudarTemaDoCalendario({ quadros });
          renderTemaDoCalendario();
          playSfx(1080, 0.04);
        });
        calQuadrosGrid.appendChild(botao);
      });
    }

    if (calFundoCor) calFundoCor.value = estilo.fundoCor;
    if (calDetalheCor) calDetalheCor.value = estilo.detalheCor;
    if (calCelulaCor) calCelulaCor.value = estilo.celulaCor;
    if (calLinhaCor) calLinhaCor.value = estilo.linhaCor;
    if (calTextoCor) calTextoCor.value = estilo.textoCor;
    if (calFonteSelect) calFonteSelect.value = estilo.fonte;
    if (calMiniSelect) calMiniSelect.value = estilo.mini;
    if (calPaletaSelect) calPaletaSelect.value = estilo.paleta;
    if (calDomingoVermelho) calDomingoVermelho.checked = estilo.domingoVermelho;
    if (btnCalFotoClear) btnCalFotoClear.hidden = !estilo.foto;
  }

  function abrirTemaDoCalendario() {
    if (!calThemeModal) return;
    renderTemaDoCalendario();
    calThemeModal.classList.add('open');
    playSfx(1080, 0.05);
  }

  function fecharTemaDoCalendario() {
    if (calThemeModal) calThemeModal.classList.remove('open');
  }

  if (btnCalendarTheme) btnCalendarTheme.addEventListener('click', abrirTemaDoCalendario);
  if (btnSettingsCalendar) {
    btnSettingsCalendar.addEventListener('click', () => {
      fecharEngrenagem();
      abrirTemaDoCalendario();
    });
  }
  if (btnCalThemeClose) btnCalThemeClose.addEventListener('click', fecharTemaDoCalendario);
  if (btnCalThemeDone) btnCalThemeDone.addEventListener('click', () => {
    fecharTemaDoCalendario();
    playSfx(1200);
    showToast('🗓️ calendário do seu jeitinho!');
  });
  if (calThemeBackdrop) calThemeBackdrop.addEventListener('click', fecharTemaDoCalendario);
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && calThemeModal?.classList.contains('open')) fecharTemaDoCalendario();
  });

  if (btnCalThemeReset) {
    btnCalThemeReset.addEventListener('click', () => {
      if (!Calendario) return;
      state.calendarStyle = Calendario.padrao();
      guardarTemaDoCalendario();
      aplicarTemaDoCalendario();
      renderCalendar();
      renderTemaDoCalendario();
      playSfx(900);
    });
  }

  [
    [calFundoCor, 'fundoCor'],
    [calDetalheCor, 'detalheCor'],
    [calCelulaCor, 'celulaCor'],
    [calLinhaCor, 'linhaCor'],
    [calTextoCor, 'textoCor']
  ].forEach(([entrada, chave]) => {
    if (!entrada) return;
    entrada.addEventListener('input', () => {
      mudarTemaDoCalendario({ [chave]: entrada.value }, { redesenhar: false });
    });
    entrada.addEventListener('change', () => renderCalendar());
  });

  if (calFonteSelect) calFonteSelect.addEventListener('change', () => mudarTemaDoCalendario({ fonte: calFonteSelect.value }));
  if (calMiniSelect) calMiniSelect.addEventListener('change', () => mudarTemaDoCalendario({ mini: calMiniSelect.value }));
  if (calPaletaSelect) calPaletaSelect.addEventListener('change', () => {
    mudarTemaDoCalendario({ paleta: calPaletaSelect.value });
    renderPreviaDoDia();
    renderCoresDoDia();
  });
  if (calDomingoVermelho) calDomingoVermelho.addEventListener('change', () => {
    mudarTemaDoCalendario({ domingoVermelho: calDomingoVermelho.checked });
  });

  async function encolherFotoDoFundo(file) {
    const bitmap = await createImageBitmap(file);
    const lado = Math.max(bitmap.width, bitmap.height) || 1;
    let escala = Math.min(1, 900 / lado);
    const tentativas = [0.72, 0.6, 0.45];
    for (const qualidade of tentativas) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/webp', qualidade);
      if (url.length <= (Calendario ? Calendario.LIMITE_DA_FOTO : 300 * 1024)) return url;
      escala *= 0.8;
    }
    return '';
  }

  if (btnCalFoto && calFotoUpload) {
    btnCalFoto.addEventListener('click', () => calFotoUpload.click());
  }
  if (calFotoUpload) {
    calFotoUpload.addEventListener('change', async () => {
      const file = calFotoUpload.files && calFotoUpload.files[0];
      if (!file) return;
      try {
        const foto = await encolherFotoDoFundo(file);
        if (!foto) {
          showToast('essa foto é grande demais 🌧️ tenta outra?', true);
          return;
        }
        mudarTemaDoCalendario({ fundo: 'foto', foto });
        renderTemaDoCalendario();
        playSfx(1150);
      } catch (erro) {
        showToast('não consegui usar essa foto 🌧️', true);
      } finally {
        calFotoUpload.value = '';
      }
    });
  }
  if (btnCalFotoClear) {
    btnCalFotoClear.addEventListener('click', () => {
      mudarTemaDoCalendario({ foto: '', fundo: state.calendarStyle.fundo === 'foto' ? 'nuvens' : state.calendarStyle.fundo });
      renderTemaDoCalendario();
      playSfx(880);
    });
  }

  if (btnPrevMonth) btnPrevMonth.addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendar(); playSfx(850);
  });

  if (btnNextMonth) btnNextMonth.addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendar(); playSfx(950);
  });

  if (btnZoomInCal) btnZoomInCal.addEventListener('click', () => {
    state.calZoom = Math.min(1.25, state.calZoom + 0.1);
    calendarCard.style.transform = `scale(${state.calZoom})`;
    playSfx(1050);
  });

  if (btnZoomOutCal) btnZoomOutCal.addEventListener('click', () => {
    state.calZoom = Math.max(0.75, state.calZoom - 0.1);
    calendarCard.style.transform = `scale(${state.calZoom})`;
    playSfx(850);
  });

  aplicarTemaDoCalendario();

  const btnSaveCurrent = document.getElementById('btn-save-current');
  const btnEntriesHistory = document.getElementById('btn-entries-history');
  const historyModal = document.getElementById('history-modal');
  const btnCloseHistory = document.getElementById('btn-close-history');
  const historyBackdrop = document.getElementById('history-backdrop');
  const historyList = document.getElementById('history-list');

  if (diaryDateEl) diaryDateEl.value = state.draft.date || hojeStr();

  function registroDeAdesivo(el) {
    const midia = el && midiaDoAdesivo(el);
    if (!midia) return null;
    const legenda = captionDoAdesivo(el);
    const ehDesenho = el.dataset.kind === 'drawing';
    const ehVideo = midia.tagName === 'VIDEO' || el.classList.contains('is-video');
    const largura = parseFloat(midia.style.width) || midia.offsetWidth || 85;
    const altura = parseFloat(midia.style.height) || midia.offsetHeight || 0;
    const registro = {
      src: ehVideo ? (midia.dataset.ref || '') : midia.src,
      width: largura,
      ...(ehDesenho || ehVideo ? {
        ...(ehDesenho ? { kind: 'drawing' } : {}),
        ...(ehVideo ? { mediaType: 'video' } : {}),
        height: altura || 0
      } : {}),
      ...(ehVideo && midia.getAttribute && midia.getAttribute('poster')
        ? { poster: midia.getAttribute('poster') }
        : {}),
      rotation: el.dataset.rotation || '0',
      zIndex: el.style.zIndex || '12',
      shadowColor: el.style.getPropertyValue('--sticker-shadow') || '',
      hasShadow: el.classList.contains('with-shadow'),
      hasBorder: el.classList.contains('with-border'),
      borderColor: el.style.getPropertyValue('--sticker-border') || '',
      flip: el.dataset.flip === '1',
      locked: el.classList.contains('is-locked'),
      enfeite: el.classList.contains('is-enfeite'),
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      caption: legenda.caption,
      captionPosition: legenda.position
    };
    if (el.dataset.pen === '1') {
      registro.pen = true;
      registro.penX = Number(el.dataset.penx);
      registro.penY = Number(el.dataset.peny);
    }
    return registro;
  }

  function getStickersFromOverlay(overlay) {
    const list = [];
    if (!overlay) return list;
    overlay.querySelectorAll('.placed-sticker').forEach(el => {
      const registro = registroDeAdesivo(el);
      if (registro) list.push(registro);
    });
    return list;
  }

  function camadaDasCanetinhas() {
    return document.getElementById('flip-pen-layer');
  }

  function ehMesaDasCanetinhas(caminha) {
    const mesa = camadaDasCanetinhas();
    return Boolean(mesa && caminha && caminha === mesa);
  }

  function registrosDasCanetinhas() {
    const tela = camadaDasCanetinhas();
    if (!tela || typeof tela.querySelectorAll !== 'function') return [];
    const largura = tela.clientWidth || 1;
    const altura = tela.clientHeight || 1;
    const lista = [];
    tela.querySelectorAll('.placed-sticker').forEach((el) => {
      const registro = registroDeAdesivo(el);
      if (!registro) return;
      registro.enfeite = true;
      registro.pen = true;
      registro.penX = (parseFloat(el.style.left) || 0) / largura;
      registro.penY = (parseFloat(el.style.top) || 0) / altura;
      el.dataset.pen = '1';
      el.dataset.penx = String(registro.penX);
      el.dataset.peny = String(registro.penY);
      lista.push(registro);
    });
    return lista;
  }

  if (btnSaveCurrent) {
    btnSaveCurrent.addEventListener('click', async () => {
      playSfx(1100);
      salvarCapaNoNavegador();
      state.coverStickers = getStickersFromOverlay(coverStickersOverlay);
      guardarNoNavegador('pooftie_calendar_stickers', JSON.stringify(getStickersFromOverlay(calendarStickersOverlay)));
      guardarNoNavegador('pooftie_todo_stickers', JSON.stringify(getStickersFromOverlay(todoStickersOverlay)));
      guardarNoNavegador('pooftie_ipod_stickers', JSON.stringify(getStickersFromOverlay(ipodStickersOverlay)));

      const pagina = await guardarMemoriaAtual({ avisar: true });
      if (pagina) {
        atualizarLivrinho({ irPara: 'mesma' });
        playSfx(1200);
      }
    });
  }

  if (diaryDateEl) {
    diaryDateEl.addEventListener('change', () => {
      const data = diaryDateEl.value || hojeStr();
      const salva = readEntries().find((e) => e.date === data) || null;
      carregarMemoriaNoRascunho(salva, data);
      atualizarLivrinho({ irPara: 'mesma', paginaLivre: paginaLivreAtual() });
      const posicao = livrinho ? livrinho.folhaDaData(data) : -1;
      if (posicao >= 0) {
        livrinho.definirConteudo(readEntries(), capaVivaParaOLivrinho(), { indice: posicao, forcar: true });
      }
      showToast(salva ? `📖 memória de ${data} aberta` : `⋆ folhinha de ${data} prontinha`);
    });
  }

  function abrirPaginaParaEscrever(entry, pageId) {
    if (entry) loadEntryIntoPage(entry, pageId);
    historyModal.classList.remove('open');
    switchView('page');
    sincronizarPapeizinho();
    guardarRascunhoNoNavegador();
    agendarAutosave(400);
    if (diaryBody && typeof diaryBody.focus === 'function') diaryBody.focus();
    showToast('✎ a sua página abriu aqui na folhinha ⋆ ˚｡⋆');
    playSfx(1000);
  }

  function loadEntryIntoPage(entry, pageId) {
    const data = (entry && entry.date) || hojeStr();
    carregarMemoriaNoRascunho(entry, data, pageId);
    if (livrinho) {
      let posicao = state.draft.pageId ? livrinho.folhaDaPagina(state.draft.pageId) : -1;
      if (posicao < 0) posicao = livrinho.folhaDaData(data);
      if (posicao >= 0) {
        livrinho.definirConteudo(readEntries(), capaVivaParaOLivrinho(), { indice: posicao, forcar: true });
      }
    }
    sincronizarPapeizinho();
  }

  const DIAS_CURTOS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  function rotuloDoCartao(date) {
    const partes = String(date || '').split('-');
    if (partes.length !== 3) return date || 'sem data';
    const dia = new Date(`${date}T12:00:00`);
    const semana = Number.isNaN(dia.getTime()) ? '' : DIAS_CURTOS[dia.getDay()];
    return `${Number(partes[2])} ${semana} · ${partes[1]}/${partes[0]}`;
  }

  function resumoDaPagina(pagina) {
    const texto = String((pagina && pagina.body) || '').replace(/\s+/g, ' ').trim();
    if (!texto) return 'uma página esperando por você ⋆ ˚｡⋆';
    return texto.length > 74 ? `${texto.slice(0, 74)}…` : texto;
  }

  const pagesDrawer = document.getElementById('pages-drawer');
  const pagesHint = document.getElementById('pages-hint');
  const btnPagesSelect = document.getElementById('btn-pages-select');
  const btnPagesAll = document.getElementById('btn-pages-all');
  const btnPagesDelete = document.getElementById('btn-pages-delete');
  const btnPagesCancel = document.getElementById('btn-pages-cancel');
  const btnPagesCloseCorner = document.getElementById('btn-pages-close-corner');
  const pagesToolCount = document.getElementById('pages-tool-count');

  let escolhendoPaginas = false;
  const paginasEscolhidas = new Set();

  function chaveDaPagina(pagina) {
    return `${(pagina && pagina.date) || ''}|${(pagina && pagina.id) || ''}`;
  }

  function listaDaGaleria() {
    const paginas = lerTodasAsPaginas();
    const porId = new Set(paginas.map((p) => p.id));
    const rascunhoSolto = state.draft && state.draft.body && !porId.has(state.draft.pageId)
      ? [{
        id: state.draft.pageId || 'rascunho',
        date: state.draft.date || hojeStr(),
        title: state.draft.title || '',
        body: state.draft.body || '',
        pattern: state.draft.pattern || 'lines',
        stickers: [],
        texts: state.draft.texts || [],
        solta: true
      }]
      : [];
    return [...rascunhoSolto, ...paginas];
  }

  function atualizarBarraDaGaleria() {
    const quantas = paginasEscolhidas.size;
    if (pagesDrawer) pagesDrawer.classList.toggle('is-escolhendo', escolhendoPaginas);
    if (btnPagesSelect) {
      btnPagesSelect.classList.toggle('active', escolhendoPaginas);
      btnPagesSelect.textContent = escolhendoPaginas ? '☑️ escolhendo' : '☑️ escolher';
    }
    if (btnPagesAll) btnPagesAll.hidden = !escolhendoPaginas;
    if (btnPagesDelete) {
      btnPagesDelete.hidden = !escolhendoPaginas;
      btnPagesDelete.disabled = quantas === 0;
      btnPagesDelete.textContent = quantas ? `🗑️ apagar (${quantas})` : '🗑️ apagar';
    }
    if (btnPagesCancel) btnPagesCancel.hidden = !escolhendoPaginas;
    if (pagesToolCount) {
      pagesToolCount.textContent = !escolhendoPaginas
        ? ''
        : (quantas ? `${quantas} escolhida${quantas === 1 ? '' : 's'}` : 'escolhe as páginas');
    }
    if (pagesHint) {
      pagesHint.textContent = escolhendoPaginas
        ? 'toca nas páginas pra escolher várias — as setinhas ▲▼ mudam a ordem das folhas no diário ⋆ ˚｡⋆'
        : 'cada cartãozinho é uma página do diário — toca nela pra abrir e escrever; as setinhas ▲▼ mudam a ordem das folhas ⋆ ˚｡⋆';
    }
  }

  function modoEscolherPaginas(ligado) {
    escolhendoPaginas = Boolean(ligado);
    if (!escolhendoPaginas) paginasEscolhidas.clear();
    atualizarBarraDaGaleria();
    renderHistory();
  }

  function apagarPaginasEscolhidas() {
    const escolhidas = listaDaGaleria().filter((p) => !p.solta && paginasEscolhidas.has(chaveDaPagina(p)));
    if (!escolhidas.length) {
      showToast('escolhe pelo menos uma página pra apagar 🌸', true);
      return;
    }
    if (!confirm(`Apagar ${escolhidas.length} página${escolhidas.length === 1 ? '' : 's'}? 🌧️`)) return;

    EntryStore && EntryStore.apagarPaginas(storeDiario, escolhidas.map((p) => ({ date: p.date, pageId: p.id })));

    if (escolhidas.some((p) => p.id === state.draft.pageId)) {
      trocarRascunho({ date: hojeStr(), pageId: '', title: '', body: '', textSpans: [], texts: [] });
      trocarAdesivosDaFolha([]);
      trocarTextosDaFolha([]);
    }

    const diasMexidos = [...new Set(escolhidas.map((p) => p.date))];
    diasMexidos.forEach((dia) => {
      const entrada = readEntries().find((e) => e.date === dia) || null;
      if (!entrada && window.CrechezinhaCloud) window.CrechezinhaCloud.deleteEntry(dia);
      else if (entrada && window.CrechezinhaCloud) window.CrechezinhaCloud.pushEntry(entrada);
    });

    paginasEscolhidas.clear();
    atualizarLivrinho({ irPara: 'mesma', paginaLivre: paginaLivreAtual() });
    renderHistory();
    showToast(`🗑️ ${escolhidas.length} página${escolhidas.length === 1 ? '' : 's'} apagada${escolhidas.length === 1 ? '' : 's'}`);
    playSfx(620);
  }

  function moverPaginaDaGaleria(pagina, direcao) {
    if (!pagina || pagina.solta || !EntryStore) return;
    const resultado = EntryStore.moverPagina(storeDiario, pagina.date, pagina.id, direcao);
    if (!resultado.ok) {
      showToast('essa folha já está na pontinha 🌸', true);
      return;
    }
    const diasMexidos = Array.isArray(resultado.dias) && resultado.dias.length
      ? resultado.dias
      : [pagina.date];
    diasMexidos.forEach((dia) => {
      const entrada = readEntries().find((e) => e.date === dia) || null;
      if (entrada && window.CrechezinhaCloud) window.CrechezinhaCloud.pushEntry(entrada);
    });
    renderHistory();
    atualizarLivrinho({ irPara: 'mesma', paginaLivre: paginaLivreAtual() });
    playSfx(880);
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = '';

    const todas = listaDaGaleria();
    atualizarBarraDaGaleria();

    if (!todas.length) {
      historyList.innerHTML = '<div class="pages-empty">nenhuma página ainda…<br>escreve a primeira e toca em "💾 guardar" ⋆ ˚｡⋆</div>';
      return;
    }

    todas.forEach((pagina) => {
      const chave = chaveDaPagina(pagina);
      const escolhida = paginasEscolhidas.has(chave);
      const cartao = document.createElement('div');
      cartao.className = 'page-card'
        + (escolhida ? ' is-escolhida' : '')
        + (pagina.solta ? ' is-solta' : '');
      cartao.dataset.pattern = (EntryStore && EntryStore.PADROES.includes(pagina.pattern)) ? pagina.pattern : 'lines';
      cartao.dataset.chave = chave;
      cartao.title = escolhendoPaginas ? 'escolher essa página' : 'abrir essa página';

      const adesivos = (pagina.stickers || []).length
        ? `<span class="page-card-stickers">🎀 ${(pagina.stickers || []).length}</span>`
        : '';

      cartao.innerHTML = `
        <div class="page-card-sheet">
          <span class="page-card-check${escolhida ? ' is-on' : ''}" aria-hidden="true">✓</span>
          <span class="page-card-date">${rotuloDoCartao(pagina.date)}</span>
          <span class="page-card-title">${(pagina.title || '').trim() || 'sem título'}</span>
          ${pagina.letterFrom ? `<span class="page-card-letter">💌 carta de ${escaparAtributo(pagina.letterFrom)}</span>` : ''}
          <span class="page-card-text">${resumoDaPagina(pagina)}</span>
          ${adesivos}
          ${pagina.solta ? '<span class="page-card-unsaved">escrevendo agora</span>' : ''}
        </div>
        <div class="page-card-foot">
          <span class="page-card-label">${(pagina.title || '').trim() || rotuloDoCartao(pagina.date)}</span>
          <span class="page-card-moves">
            <button class="page-card-move" data-mover="-1" type="button" title="Mover pra cima (muda a ordem das folhas do diário)">▲</button>
            <button class="page-card-move" data-mover="1" type="button" title="Mover pra baixo (muda a ordem das folhas do diário)">▼</button>
          </span>
          <button class="page-card-del" type="button" title="Apagar essa página">🗑️</button>
        </div>
      `;

      cartao.addEventListener('click', (evento) => {
        if (evento.target.closest('.page-card-del')) return;
        const seta = evento.target.closest('.page-card-move');
        if (seta) {
          evento.stopPropagation();
          moverPaginaDaGaleria(pagina, Number(seta.dataset.mover));
          return;
        }
        if (escolhendoPaginas) {
          if (pagina.solta) {
            showToast('essa página ainda está sendo escrita 🌸 guarda ela primeiro', true);
            return;
          }
          if (paginasEscolhidas.has(chave)) paginasEscolhidas.delete(chave);
          else paginasEscolhidas.add(chave);
          renderHistory();
          playSfx(paginasEscolhidas.has(chave) ? 980 : 700);
          return;
        }
        abrirPaginaParaEscrever(
          pagina.solta ? null : (readEntries().find((e) => e.date === pagina.date) || null),
          pagina.solta ? '' : pagina.id
        );
      });

      const botaoApagar = cartao.querySelector('.page-card-del');
      if (botaoApagar) {
        botaoApagar.addEventListener('click', (evento) => {
          evento.stopPropagation();
          if (!confirm('Apagar essa página? 🌧️')) return;
          if (pagina.solta) {
            trocarRascunho({ date: pagina.date, pageId: '', title: '', body: '', textSpans: [], texts: [] });
            trocarAdesivosDaFolha([]);
            trocarTextosDaFolha([]);
          } else {
            apagarPaginaDoDia(pagina.date, pagina.id);
          }
          paginasEscolhidas.delete(chave);
          const entradas = readEntries();
          const entrada = entradas.find((e) => e.date === pagina.date) || null;
          if (!entrada && window.CrechezinhaCloud && pagina.date) {
            window.CrechezinhaCloud.deleteEntry(pagina.date);
          } else if (entrada && window.CrechezinhaCloud) {
            window.CrechezinhaCloud.pushEntry(entrada);
          }
          atualizarLivrinho({ irPara: 'mesma', paginaLivre: paginaLivreAtual() });
          renderHistory();
        });
      }

      historyList.appendChild(cartao);
    });
  }

  if (btnEntriesHistory) btnEntriesHistory.addEventListener('click', () => {
    escolhendoPaginas = false;
    paginasEscolhidas.clear();
    renderHistory();
    historyModal.classList.add('open');
  });

  const fecharGaleria = () => historyModal.classList.remove('open');

  if (btnPagesSelect) btnPagesSelect.addEventListener('click', () => {
    modoEscolherPaginas(!escolhendoPaginas);
    playSfx(escolhendoPaginas ? 1050 : 700);
  });

  if (btnPagesAll) btnPagesAll.addEventListener('click', () => {
    listaDaGaleria().forEach((p) => {
      if (!p.solta) paginasEscolhidas.add(chaveDaPagina(p));
    });
    renderHistory();
    playSfx(1100);
  });

  if (btnPagesDelete) btnPagesDelete.addEventListener('click', () => apagarPaginasEscolhidas());
  if (btnPagesCancel) btnPagesCancel.addEventListener('click', () => { modoEscolherPaginas(false); playSfx(700); });
  if (btnPagesCloseCorner) btnPagesCloseCorner.addEventListener('click', fecharGaleria);

  if (btnCloseHistory) btnCloseHistory.addEventListener('click', fecharGaleria);
  if (historyBackdrop) historyBackdrop.addEventListener('click', fecharGaleria);

  const btnDiaries = document.getElementById('btn-diaries');
  const btnNewDiary = document.getElementById('btn-new-diary');
  const diariesModal = document.getElementById('diaries-modal');
  const diariesList = document.getElementById('diaries-list');
  const btnCloseDiaries = document.getElementById('btn-close-diaries');
  const diariesBackdrop = document.getElementById('diaries-backdrop');
  const btnCreateDiary = document.getElementById('btn-create-diary');

  const lockModal = document.getElementById('diary-lock');
  const lockBackdrop = document.getElementById('lock-backdrop');
  const lockPasswordInput = document.getElementById('lock-password-input');
  const lockTitle = document.getElementById('lock-title');
  const lockSubtitle = document.getElementById('lock-subtitle');
  const lockError = document.getElementById('lock-error');
  const btnLockOpen = document.getElementById('btn-lock-open');
  const btnLockForget = document.getElementById('btn-lock-forget');

  let trancaPendente = null;

  function lerDestrancados() {
    try {
      const lista = JSON.parse(sessionStorage.getItem('pooftie_unlocked') || '[]');
      return Array.isArray(lista) ? lista : [];
    } catch (error) {
      return [];
    }
  }

  function destrancado(id) {
    return lerDestrancados().includes(id);
  }

  function marcarDestrancado(id) {
    const lista = lerDestrancados();
    if (!lista.includes(id)) lista.push(id);
    try { sessionStorage.setItem('pooftie_unlocked', JSON.stringify(lista)); } catch (error) {   }
  }

  async function embaralharSenha(senha, sal) {
    const texto = `${sal}::${senha}`;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        const bytes = new window.TextEncoder().encode(texto);
        const digest = await window.crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {   }
    }
    let h1 = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
      h1 ^= texto.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    let h2 = 0x9e3779b9;
    for (let i = texto.length - 1; i >= 0; i--) {
      h2 ^= texto.charCodeAt(i);
      h2 = Math.imul(h2, 0x85ebca6b);
    }
    return `s${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
  }

  function novoSal() {
    try {
      const bytes = new Uint8Array(8);
      window.crypto.getRandomValues(bytes);
      return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      return Math.random().toString(16).slice(2, 18);
    }
  }

  function diarioAgora() {
    return state.diaries.find((d) => d.id === diarioAtivoId) || state.diaries[0] || null;
  }

  function recarregarListaDeDiarios() {
    state.diaries = (EntryStore && EntryStore.lerDiarios(localStorage)) || [];
    return state.diaries;
  }

  function quantasPaginasTem(id) {
    if (!EntryStore) return 0;
    try {
      return EntryStore.todasAsPaginas(EntryStore.storageDoDiario(localStorage, id)).length;
    } catch (error) {
      return 0;
    }
  }

  function aplicarDiarioNaTela() {
    const diario = diarioAgora() || {};

    state.coverData = lerDoDiario('pooftie_cover_data', {
      title: diario.titulo || 'melting log',
      subtitle: diario.subtitulo || 'melting me slowly & softly ♥'
    }) || {};
    if (coverTitleInput) coverTitleInput.value = state.coverData.title || '';
    if (coverSubtitleInput) coverSubtitleInput.value = state.coverData.subtitle || '';
    aplicarModoDaCapa();
    state.coverStickers = lerDoDiario('pooftie_cover_stickers', []);
    if (coverStickersOverlay) {
      coverStickersOverlay.innerHTML = '';
      restoreOverlayStickers(state.coverStickers, coverStickersOverlay);
    }
    restoreTexts(state.coverData.texts, coverTextsOverlay);

    state.diaryStyle = lerDoDiario('pooftie_diary_style', {});
    state.coverStyle = lerDoDiario('pooftie_cover_style', state.diaryStyle || {});
    state.textDecoration = lerDoDiario('pooftie_text_decoration', {});
    state.paperPattern = lerTextoDoDiario('pooftie_paper_pattern', 'lines');
    state.penColor = lerTextoDoDiario('pooftie_pen_color', '#463529');
    state.penSize = lerTextoDoDiario('pooftie_pen_size', 'media');
    applyCoverStyle();
    applyDiaryStyle();
    applyTextDecoration();
    aplicarCanetaNaTela();
    ligarCaneta(false);

    state.textSpans = [];
    state.draft = lerDoDiario('pooftie_draft', null)
      || { date: hojeStr(), pageId: '', title: '', body: '', pattern: state.paperPattern, textSpans: [], texts: [] };
    state.editingId = null;
    state.editingPageId = state.draft.pageId || '';
    prepararRascunhoDeHoje();
    setTextSpans(state.draft.textSpans || []);
    sincronizarPapeizinho();

    const pagina = state.draft.pageId && EntryStore
      ? EntryStore.buscarPagina(storeDiario, state.draft.pageId)
      : null;
    trocarAdesivosDaFolha(pagina ? pagina.stickers : []);
    trocarTextosDaFolha(pagina ? pagina.texts : state.draft.texts);

    if (livrinho) atualizarLivrinho({ irPara: 'primeira', paginaLivre: paginaLivreAtual(), forcar: true });
    renderCalendar();
    renderHistory();
    atualizarTituloDoLivrinho();
  }

  function atualizarTituloDoLivrinho() {
    const titulo = document.getElementById('flip-top-title');
    if (!titulo) return;
    const diario = diarioAgora();
    const nome = (diario && diario.nome) || 'meu diário';
    titulo.textContent = `⋆ ˚｡⋆ ${nome} aberto ⋆ ˚｡⋆`;
    const semTitulo = Boolean(state.coverData && state.coverData.semTitulo);
    const capa = document.getElementById('flip-cover-title');
    if (capa) capa.textContent = semTitulo ? '' : ((state.coverData && state.coverData.title) || '');
    const subtitulo = document.getElementById('flip-cover-subtitle');
    if (subtitulo) subtitulo.textContent = semTitulo ? '' : ((state.coverData && state.coverData.subtitle) || '');
  }

  function trocarDeDiario(id, { semTranca = false } = {}) {
    const diario = state.diaries.find((d) => d.id === id);
    if (!diario) return false;
    if (!semTranca && diario.senha && !destrancado(diario.id)) {
      abrirTranca(diario.id, 'abrir');
      return false;
    }
    if (state.draft) { try { salvarRascunho(); } catch (error) {   } }
    definirDiarioAtivo(id);
    aplicarDiarioNaTela();
    if (pilhaDeHistorico) {
      if (timerRetrato) { clearTimeout(timerRetrato); timerRetrato = null; }
      pilhaDeHistorico.limpar();
      marcaDoHistorico = '';
      voltandoNoTempo = false;
      garantirRetratoInicial();
      atualizarBotoesDeHistorico();
    }
    return true;
  }

  function abrirTranca(id, acao = 'abrir') {
    const diario = state.diaries.find((d) => d.id === id);
    if (!diario || !lockModal) return;
    trancaPendente = { id, acao };

    if (lockTitle) {
      lockTitle.textContent = acao === 'definir' ? 'escolher uma senha' :
        (acao === 'tirar' ? 'tirar a senha do diário' : 'esse diário tem senha');
    }
    if (lockSubtitle) {
      lockSubtitle.textContent = acao === 'definir'
        ? `uma senha pro diário "${diario.nome}" — depois só com ela ele abre ⋆ ˚｡⋆`
        : (acao === 'tirar'
          ? `escreve a senha de "${diario.nome}" pra destrancar de vez`
          : `escreve a senha de "${diario.nome}" pra abrir ⋆ ˚｡⋆`);
    }
    if (btnLockOpen) btnLockOpen.textContent = acao === 'definir' ? 'guardar senha ♡' : 'abrir ♡';
    if (btnLockForget) btnLockForget.hidden = acao === 'definir';
    if (lockError) { lockError.hidden = true; lockError.textContent = 'essa senha não abriu o diário 🌧️ tenta de novo'; }
    if (lockPasswordInput) lockPasswordInput.value = '';
    lockModal.classList.add('open');
    setTimeout(() => lockPasswordInput?.focus(), 120);
  }

  function fecharTranca() {
    trancaPendente = null;
    lockModal?.classList.remove('open');
  }

  let tomatesVoando = 0;

  function jogarTomates(quantos = 8) {
    const camada = document.getElementById('tomato-layer');
    if (!camada) return 0;
    if (tomatesVoando > 24) return 0;
    const quantosMesmo = Math.max(1, Math.min(12, quantos));
    for (let i = 0; i < quantosMesmo; i += 1) {
      const tomate = document.createElement('span');
      tomate.className = 'tomate-voador';
      tomate.textContent = '🍅';
      const deX = (Math.random() * 2 - 1) * 130;
      const deY = (Math.random() * 2 - 1) * 130;
      tomate.style.setProperty('--tomate-x', `${(12 + Math.random() * 76).toFixed(1)}%`);
      tomate.style.setProperty('--tomate-y', `${(18 + Math.random() * 62).toFixed(1)}%`);
      tomate.style.setProperty('--tomate-de-x', `${deX.toFixed(1)}px`);
      tomate.style.setProperty('--tomate-de-y', `${deY.toFixed(1)}px`);
      tomate.style.setProperty('--tomate-giro', `${Math.round((Math.random() * 2 - 1) * 200)}deg`);
      tomate.style.setProperty('--tomate-tamanho', `${Math.round(26 + Math.random() * 20)}px`);
      tomate.style.setProperty('animation-delay', `${i * 60}ms`);
      camada.appendChild(tomate);
      tomatesVoando += 1;
      setTimeout(() => {
        tomatesVoando = Math.max(0, tomatesVoando - 1);
        if (typeof tomate.remove === 'function') tomate.remove();
      }, 2100 + i * 60);
    }
    return quantosMesmo;
  }

  async function confirmarTranca() {
    const pendente = trancaPendente;
    if (!pendente || !EntryStore) return;
    const diario = state.diaries.find((d) => d.id === pendente.id);
    if (!diario) return;
    const senha = lockPasswordInput ? lockPasswordInput.value : '';

    if (pendente.acao === 'definir') {
      if (String(senha).trim().length < 3) {
        if (lockError) {
          lockError.textContent = 'a senha precisa de pelo menos 3 letrinhas 🌸';
          lockError.hidden = false;
        }
        return;
      }
      const sal = novoSal();
      const hash = await embaralharSenha(senha.trim(), sal);
      EntryStore.salvarDiario(localStorage, { ...diario, senha: hash, sal });
      recarregarListaDeDiarios();
      fecharTranca();
      renderDiarios();
      showToast('🔒 senha guardada! só com ela o diário abre ✧');
      playSfx(1200);
      return;
    }

    const hash = await embaralharSenha(String(senha).trim(), diario.sal || '');
    if (hash !== diario.senha) {
      if (lockError) {
        lockError.textContent = 'essa senha não abriu o diário 🌧️ tenta de novo';
        lockError.hidden = false;
      }
      jogarTomates(8);
      if (lockModal) {
        lockModal.classList.remove('is-wrong');
        setTimeout(() => lockModal.classList.add('is-wrong'), 16);
        setTimeout(() => lockModal.classList.remove('is-wrong'), 620);
      }
      if (lockPasswordInput) {
        lockPasswordInput.value = '';
        if (typeof lockPasswordInput.focus === 'function') lockPasswordInput.focus();
      }
      showToast('🍅 xi, essa senha não é essa! tenta de novo ⋆', true);
      playSfx(240, 0.18, 'square');
      return;
    }

    marcarDestrancado(diario.id);
    fecharTranca();

    if (pendente.acao === 'tirar') {
      EntryStore.salvarDiario(localStorage, { ...diario, senha: '', sal: '' });
      recarregarListaDeDiarios();
      renderDiarios();
      showToast('🔓 a tranca saiu — esse diário abre direto agora');
      playUnlockSfx();
      return;
    }

    trocarDeDiario(diario.id, { semTranca: true });
    renderDiarios();
    showToast(`📖 ${diario.nome} aberto ⋆ ˚｡⋆`);
    playUnlockSfx();
  }

  function criarDiario() {
    if (!EntryStore) return null;
    const id = `d${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const quantos = Math.max(1, state.diaries.length);
    const nome = `diário ${quantos + 1}`;
    EntryStore.salvarDiario(localStorage, {
      id,
      nome,
      titulo: nome,
      subtitulo: 'meu cantinho novo ♡',
      senha: '',
      sal: ''
    });
    const storage = EntryStore.storageDoDiario(localStorage, id);
    storage.setItem('pooftie_cover_data', JSON.stringify({ title: nome, subtitle: 'meu cantinho novo ♡' }));
    recarregarListaDeDiarios();
    trocarDeDiario(id, { semTranca: true });
    renderDiarios();
    showToast('✧ diário novinho criado! escreve a primeira página ⋆ ˚｡⋆');
    playSfx(1150);
    return id;
  }

  function apagarDiario(id) {
    if (!EntryStore) return;
    const diario = state.diaries.find((d) => d.id === id);
    if (!diario) return;
    if (!confirm(`Apagar o diário "${diario.nome}" e TODAS as páginas dele? 🌧️`)) return;

    ['pooftie_entries', 'pooftie_draft', 'pooftie_cover_data', 'pooftie_cover_stickers',
      'pooftie_cover_style', 'pooftie_diary_style', 'pooftie_paper_pattern',
      'pooftie_text_decoration', 'pooftie_text_spans']
      .forEach((chave) => EntryStore.storageDoDiario(localStorage, id).removeItem(chave));
    EntryStore.apagarDiario(localStorage, id);
    recarregarListaDeDiarios();
    if (diarioAtivoId === id) trocarDeDiario(EntryStore.DIARIO_PRINCIPAL, { semTranca: true });
    renderDiarios();
    showToast('🗑️ diário apagado');
  }

  function renderDiarios() {
    if (!diariesList) return;
    recarregarListaDeDiarios();
    diariesList.innerHTML = '';

    state.diaries.forEach((diario) => {
      const ativo = diario.id === diarioAtivoId;
      const quantas = quantasPaginasTem(diario.id);
      const linha = document.createElement('div');
      linha.className = 'diary-card' + (ativo ? ' is-active' : '');
      linha.innerHTML = `
        <div class="diary-card-top">
          <input class="diary-card-name" value="${String(diario.nome || '').replace(/"/g, '&quot;')}"
                 maxlength="30" aria-label="nome do diário">
          <span class="diary-card-lock">${diario.senha ? '🔒' : ''}</span>
        </div>
        <span class="diary-card-meta">${quantas} página${quantas === 1 ? '' : 's'}${ativo ? ' · aberto agora' : ''}</span>
        <div class="diary-card-btns">
          ${ativo ? '' : '<button class="diary-btn" data-acao="abrir" type="button">abrir</button>'}
          <button class="diary-btn" data-acao="senha" type="button">${diario.senha ? '🔓 tirar senha' : '🔒 pôr senha'}</button>
          ${EntryStore && diario.id === EntryStore.DIARIO_PRINCIPAL ? '' : '<button class="diary-btn danger" data-acao="apagar" type="button">🗑️ apagar</button>'}
        </div>
      `;

      const campoNome = linha.querySelector('.diary-card-name');
      if (campoNome) {
        campoNome.addEventListener('change', () => {
          const nome = campoNome.value.trim() || 'meu diário';
          EntryStore.salvarDiario(localStorage, { ...diario, nome });
          recarregarListaDeDiarios();
          atualizarTituloDoLivrinho();
          showToast(`✎ agora ele se chama "${nome}"`);
        });
      }

      linha.querySelectorAll('.diary-btn').forEach((botao) => {
        botao.addEventListener('click', () => {
          const acao = botao.dataset.acao;
          if (acao === 'abrir') trocarDeDiario(diario.id);
          if (acao === 'senha') {
            if (diario.senha) {
              if (destrancado(diario.id)) {
                EntryStore.salvarDiario(localStorage, { ...diario, senha: '', sal: '' });
                recarregarListaDeDiarios();
                renderDiarios();
                showToast('🔓 a tranca saiu — esse diário abre direto agora');
              } else {
                abrirTranca(diario.id, 'tirar');
              }
            } else {
              abrirTranca(diario.id, 'definir');
            }
          }
          if (acao === 'apagar') apagarDiario(diario.id);
        });
      });

      diariesList.appendChild(linha);
    });
  }

  function abrirDiarios() {
    recarregarListaDeDiarios();
    renderDiarios();
    diariesModal?.classList.add('open');
  }

  if (btnDiaries) btnDiaries.addEventListener('click', () => { abrirDiarios(); playSfx(1000); });
  if (btnNewDiary) btnNewDiary.addEventListener('click', () => criarDiario());
  if (btnCreateDiary) btnCreateDiary.addEventListener('click', () => criarDiario());
  if (btnCloseDiaries) btnCloseDiaries.addEventListener('click', () => diariesModal?.classList.remove('open'));
  if (diariesBackdrop) diariesBackdrop.addEventListener('click', () => diariesModal?.classList.remove('open'));
  if (btnLockOpen) btnLockOpen.addEventListener('click', () => confirmarTranca());
  if (lockBackdrop) lockBackdrop.addEventListener('click', () => fecharTranca());
  if (lockPasswordInput) {
    lockPasswordInput.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') { evento.preventDefault(); confirmarTranca(); }
    });
  }

  if (btnLockForget) {
    btnLockForget.addEventListener('click', () => {
      const id = (trancaPendente && trancaPendente.id) || diarioAtivoId;
      const diario = state.diaries.find((d) => d.id === id);
      if (!diario || !EntryStore) return;
      const seguindo = confirm(
        `Sem a senha não dá pra abrir "${diario.nome}".\n\n` +
        'Se você tirar a tranca, as páginas continuam guardadinhas e o diário abre direto. ' +
        '(A senha é pra ninguém bisbilhotar no seu aparelho — quem entende de navegador ainda consegue ver, tá?)\n\n' +
        'Tirar a tranca?'
      );
      if (!seguindo) return;
      EntryStore.salvarDiario(localStorage, { ...diario, senha: '', sal: '' });
      marcarDestrancado(diario.id);
      recarregarListaDeDiarios();
      fecharTranca();
      trocarDeDiario(diario.id, { semTranca: true });
      renderDiarios();
      showToast('🔓 tranca tirada — o diário abriu ✧');
      playUnlockSfx();
    });
  }

  (function trancarSePrecisar() {
    recarregarListaDeDiarios();
    const diario = diarioAgora();
    atualizarTituloDoLivrinho();
    if (diario && diario.senha && !destrancado(diario.id)) abrirTranca(diario.id, 'abrir');
  })();

  const cloudButton = document.getElementById('btn-cloud-sync');
  const cloudStatus = document.getElementById('cloud-status');
  const cloudIcon = document.getElementById('cloud-icon');
  const cloudModal = document.getElementById('cloud-modal');
  const settingsButton = document.getElementById('btn-settings');
  const settingsMenu = document.getElementById('settings-menu');
  const settingsClose = document.getElementById('btn-settings-close');
  const settingsWrap = document.getElementById('header-settings');
  const cloudBackdrop = document.getElementById('cloud-backdrop');
  const cloudUserInput = document.getElementById('cloud-user-input');
  const cloudKeyInput = document.getElementById('cloud-key-input');
  const cloudHint = document.getElementById('cloud-hint');
  const btnCloudPush = document.getElementById('btn-cloud-push');
  const btnCloudPull = document.getElementById('btn-cloud-pull');
  const btnCloudClose = document.getElementById('btn-cloud-close');
  const linkCloudExport = document.getElementById('link-cloud-export');
  const Backup = window.PooftieBackup || null;
  const cloudImportInput = document.getElementById('cloud-import-input');
  const cloudImportReplace = document.getElementById('cloud-import-replace');
  const cloudImportLabel = document.getElementById('cloud-import-label');
  const toastEl = document.getElementById('pooftie-toast');

  let toastTimer = null;
  function showToast(message, isError = false) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.toggle('error', Boolean(isError));
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  const cloudApi = () => window.PooftieAPI || null;

  function stickerToRelative(src) {
    try {
      const url = new URL(src, window.location.href);
      const path = decodeURIComponent(url.pathname);
      const marker = path.indexOf('/assets/');
      return marker >= 0 ? path.slice(marker + 1) : src;
    } catch (error) {
      return src;
    }
  }

  function entryForCloud(entry) {
    const adesivos = (lista) => (lista || []).map(sticker => ({
      ...sticker,
      src: stickerToRelative(sticker.src)
    }));
    const textinhos = (lista) => (lista || []).map(item => ({
      id: item.id || '',
      text: item.text || '',
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      size: Number(item.size) || 21,
      rotation: Number(item.rotation) || 0,
      zIndex: Number(item.zIndex) || 30,
      locked: Boolean(item.locked)
    }));
    return {
      date: entry.date,
      title: entry.title,
      body: entry.body,
      textSpans: entry.textSpans || [],
      mood: entry.mood,
      stickers: adesivos(entry.stickers),
      texts: textinhos(entry.texts),
      pages: Array.isArray(entry.pages)
        ? entry.pages.map((pagina) => ({
          id: pagina.id,
          title: pagina.title || '',
          body: pagina.body || '',
          pattern: pagina.pattern || 'lines',
          diaryStyle: pagina.diaryStyle || null,
          textStyle: pagina.textStyle || null,
          medida: pagina.medida || null,
          textSpans: pagina.textSpans || [],
          stickers: adesivos(pagina.stickers),
          texts: textinhos(pagina.texts),
          ...(pagina.letterFrom ? {
            letterFrom: pagina.letterFrom,
            letterArt: pagina.letterArt || null
          } : {}),
          createdAt: pagina.createdAt || null,
          updatedAt: pagina.updatedAt || null
        }))
        : undefined
    };
  }

  function remoteToEntry(remote) {
    return {
      id: Date.parse(remote.date) || Date.now(),
      date: remote.date,
      mood: remote.mood,
      title: remote.title,
      body: remote.body,
      textSpans: remote.textSpans || [],
      stickers: remote.stickers || [],
      texts: remote.texts || [],
      pages: Array.isArray(remote.pages) ? remote.pages : undefined
    };
  }

  function setCloudStatus(text, mode) {
    if (cloudStatus) cloudStatus.textContent = text;
    if (!cloudButton) return;
    const cloudMode = mode === 'online' ? 'cloud-on' : mode === 'syncing' ? 'cloud-syncing' : 'cloud-off';
    cloudButton.classList.remove('cloud-on', 'cloud-off', 'cloud-syncing');
    cloudButton.classList.add(cloudMode);
    if (settingsWrap) {
      settingsWrap.classList.remove('cloud-on', 'cloud-off', 'cloud-syncing');
      settingsWrap.classList.add(cloudMode);
    }
    if (cloudIcon) cloudIcon.textContent = mode === 'syncing' ? '🌤️' : '☁️';
  }

  function abrirEngrenagem() {
    if (!settingsMenu || !settingsButton) return;
    settingsMenu.hidden = false;
    settingsButton.setAttribute('aria-expanded', 'true');
  }

  function fecharEngrenagem() {
    if (!settingsMenu || !settingsButton) return;
    settingsMenu.hidden = true;
    settingsButton.setAttribute('aria-expanded', 'false');
  }

  const EMOJI_MODOS = ['aparelho', 'iphone', 'android', 'minha'];
  const FAMILIAS_DOS_EMOJIS = {
    aparelho: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji'",
    iphone: "'Apple Color Emoji', 'Pooftie Apple Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji'",
    android: "'Noto Color Emoji', 'Segoe UI Emoji', 'Apple Color Emoji', 'Android Emoji'",
    minha: "'PooftieEmojiCustom', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'"
  };
  const CHAVE_DA_FONTE_DE_EMOJI = 'emoji-font';
  const CSS_DOS_EMOJIS = {
    android: 'assets/emoji/emoji.css',
    iphone: 'assets/emoji/apple-emoji.css'
  };

  const emojiStyleGrid = document.getElementById('emoji-style-grid');
  const emojiFontUpload = document.getElementById('emoji-font-upload');
  const btnEmojiFontClear = document.getElementById('btn-emoji-font-clear');

  const cssDeEmojiPedido = new Set();
  let fonteDeEmojiCarregada = false;

  function ehAparelhoDaApple() {
    try {
      const plataforma = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
      if (/mac|iphone|ipad|ipod/i.test(plataforma)) return true;
      return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent || '');
    } catch (erro) {
      return false;
    }
  }

  function podeDesenharAsCarinhasDaApple() {
    try {
      return !/Firefox\//i.test(navigator.userAgent || '');
    } catch (erro) {
      return true;
    }
  }

  function garantirCssDoEmoji(qual) {
    const caminho = CSS_DOS_EMOJIS[qual];
    if (!caminho || cssDeEmojiPedido.has(qual)) return;
    cssDeEmojiPedido.add(qual);
    const link = document.createElement('link');
    link.id = `emoji-font-css-${qual}`;
    link.rel = 'stylesheet';
    link.href = `${caminho}?v=2.31.0`;
    document.head.appendChild(link);
  }

  function aplicarEstiloDeEmoji(modo) {
    const escolhido = EMOJI_MODOS.includes(modo) ? modo : 'aparelho';
    state.emojiStyle = escolhido;
    document.documentElement.dataset.emoji = escolhido;
    const appleDoApp = escolhido === 'iphone' && !ehAparelhoDaApple() && podeDesenharAsCarinhasDaApple();
    const familia = escolhido === 'iphone' && !ehAparelhoDaApple() && !appleDoApp
      ? FAMILIAS_DOS_EMOJIS.aparelho
      : FAMILIAS_DOS_EMOJIS[escolhido];
    document.documentElement.style.setProperty('--fonte-emoji', familia);
    if (escolhido === 'android') garantirCssDoEmoji('android');
    if (appleDoApp) garantirCssDoEmoji('iphone');
    guardarNoNavegador('pooftie_emoji_style', escolhido);

    if (emojiStyleGrid) {
      emojiStyleGrid.querySelectorAll('[data-emoji]').forEach((botao) => {
        const ativo = botao.dataset.emoji === escolhido;
        botao.classList.toggle('is-escolhido', ativo);
        botao.setAttribute('aria-checked', ativo ? 'true' : 'false');
      });
    }
    if (btnEmojiFontClear) btnEmojiFontClear.hidden = !(escolhido === 'minha' && fonteDeEmojiCarregada);
  }

  async function registrarFonteDeEmoji(blob) {
    try {
      if (!blob || typeof FontFace !== 'function' || !document.fonts) return false;
      const buffer = await blob.arrayBuffer();
      const fonte = new FontFace('PooftieEmojiCustom', buffer);
      await fonte.load();
      document.fonts.add(fonte);
      fonteDeEmojiCarregada = true;
      return true;
    } catch (erro) {
      return false;
    }
  }

  async function lembrarFonteDeEmoji() {
    const banco = window.PooftieMediaStore;
    if (!banco || !banco.pegarBlob) return null;
    try {
      return await banco.pegarBlob(CHAVE_DA_FONTE_DE_EMOJI);
    } catch (erro) {
      return null;
    }
  }

  if (emojiStyleGrid) {
    emojiStyleGrid.addEventListener('click', async (evento) => {
      const botao = evento.target.closest('[data-emoji]');
      if (!botao) return;
      const modo = botao.dataset.emoji;
      if (modo === 'minha' && !fonteDeEmojiCarregada) {
        emojiFontUpload?.click();
        return;
      }
      aplicarEstiloDeEmoji(modo);
      playSfx(1120, 0.05);
    });
  }

  if (emojiFontUpload) {
    emojiFontUpload.addEventListener('change', async () => {
      const file = emojiFontUpload.files && emojiFontUpload.files[0];
      if (!file) return;
      const deuCerto = await registrarFonteDeEmoji(file);
      if (!deuCerto) {
        showToast('não consegui carregar essa fontinha 🌧️ tenta outra?', true);
        emojiFontUpload.value = '';
        return;
      }
      try { await window.PooftieMediaStore?.salvar?.(file, CHAVE_DA_FONTE_DE_EMOJI); } catch (erro) {   }
      aplicarEstiloDeEmoji('minha');
      showToast('🔤 carinhas novas!');
      playSfx(1250, 0.06);
      emojiFontUpload.value = '';
    });
  }

  if (btnEmojiFontClear) {
    btnEmojiFontClear.addEventListener('click', async () => {
      try { await window.PooftieMediaStore?.apagar?.(CHAVE_DA_FONTE_DE_EMOJI); } catch (erro) {   }
      fonteDeEmojiCarregada = false;
      aplicarEstiloDeEmoji('aparelho');
      showToast('voltei pras carinhas do aparelho ⋆');
    });
  }

  (async function iniciarAsCarinhas() {
    const salvo = localStorage.getItem('pooftie_emoji_style');
    if (salvo === 'minha') {
      const blob = await lembrarFonteDeEmoji();
      if (blob && await registrarFonteDeEmoji(blob)) {
        aplicarEstiloDeEmoji('minha');
        return;
      }
      aplicarEstiloDeEmoji('aparelho');
      return;
    }
    aplicarEstiloDeEmoji(salvo || 'aparelho');
  })();

  if (settingsButton) {
    settingsButton.addEventListener('click', (event) => {
      event.stopPropagation();
      playSfx(1000);
      if (settingsMenu && settingsMenu.hidden) abrirEngrenagem();
      else fecharEngrenagem();
    });
  }

  if (settingsClose) {
    settingsClose.addEventListener('click', (event) => {
      event.stopPropagation();
      fecharEngrenagem();
      settingsButton?.focus();
    });
  }

  document.addEventListener('click', (event) => {
    if (!settingsMenu || settingsMenu.hidden) return;
    if (settingsWrap && settingsWrap.contains(event.target)) return;
    fecharEngrenagem();
  });

  const NUVEM_LOTE_BYTES = 2 * 1024 * 1024;
  const NUVEM_PEDACO_ENTRADAS = 80;

  function tamanhoEmJson(valor) {
    try {
      const texto = JSON.stringify(valor);
      return typeof TextEncoder === 'function' ? new TextEncoder().encode(texto).length : texto.length;
    } catch (error) {
      return 0;
    }
  }

  function lotesDaNuvem(entries, limite = NUVEM_LOTE_BYTES) {
    const lotes = [];
    let atual = [];
    let bytes = 0;
    for (const entry of entries) {
      const custo = tamanhoEmJson(entry) + 1;
      if (atual.length && bytes + custo > limite) {
        lotes.push(atual);
        atual = [];
        bytes = 0;
      }
      atual.push(entry);
      bytes += custo;
    }
    if (atual.length) lotes.push(atual);
    return lotes;
  }

  function ehGrandeDemais(error) {
    return error?.code === 'payload_too_large' || error?.status === 413;
  }

  const CrechezinhaCloud = {
    get online() {
      const api = cloudApi();
      return Boolean(api && api.online);
    },

    async ping() {
      const api = cloudApi();
      if (!api) {
        setCloudStatus('sem api', 'offline');
        if (cloudHint) cloudHint.textContent = 'Esta cópia está sem a API (/api). O diário segue funcionando só com o navegador. 🌸';
        return false;
      }
      try {
        const data = await api.health();
        setCloudStatus(data?.storage?.persistent ? 'nuvem ok' : 'nuvem volátil', 'online');
        if (cloudHint) {
          cloudHint.textContent = data?.storage?.persistent
            ? `Conectada! Banco: ${data.storage.mode}. Suas memórias ficam guardadas de verdade. ✧`
            : 'A API respondeu, mas está sem banco configurado (modo memória). Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Vercel para as memórias durarem.';
        }
        if (linkCloudExport) linkCloudExport.href = api.exportUrl(true);
        return true;
      } catch (error) {
        setCloudStatus('offline', 'offline');
        if (cloudHint) cloudHint.textContent = 'Não achei a nuvem agora. Sem problema: o diário continua salvando no navegador. 🌧️';
        if (linkCloudExport) linkCloudExport.href = '#';
        return false;
      }
    },

    async push() {
      const api = cloudApi();
      if (!api) {
        showToast('Sem API nesta cópia 🌸', true);
        return false;
      }
      setCloudStatus('enviando...', 'syncing');
      try {
        const entries = readEntries();
        const days = Object.entries(state.calendarNotes || {}).map(([date, note]) => ({
          date,
          note,
          reaction: state.calendarReactions?.[date] || null
        }));
        const result = await api.pushSnapshot({
          entries: [],
          todos: (state.todoItems || []).map(item => ({ text: item.text, done: Boolean(item.checked) })),
          days,
          settings: {
            username: state.username || '',
            coverData: state.coverData || null,
            paperPattern: storeDiario.getItem('pooftie_paper_pattern') || null,
            font: localStorage.getItem('pooftie_active_font') || null
          }
        });

        const lotes = lotesDaNuvem(entries.map(entryForCloud));
        let enviadas = 0;
        for (let i = 0; i < lotes.length; i += 1) {
          const lote = lotes[i];
          try {
            const resposta = await api.pushSnapshot({ entries: lote });
            enviadas += resposta?.saved?.entries ?? lote.length;
          } catch (error) {
            if (ehGrandeDemais(error) && lote.length > 1) {
              const antes = enviadas;
              for (const sozinha of lote) {
                const r = await api.pushSnapshot({ entries: [sozinha] });
                enviadas += r?.saved?.entries ?? 1;
              }
              if (enviadas === antes) throw error;
              continue;
            }
            throw error;
          }
          if (lotes.length > 1) {
            setCloudStatus(`enviando ${i + 1}/${lotes.length}...`, 'syncing');
          }
        }

        setCloudStatus('nuvem ok', 'online');
        showToast(`☁️ Tudo salvo na nuvem! (${enviadas || result?.saved?.entries || 0} memórias) ୨୧`);
        return true;
      } catch (error) {
        setCloudStatus('offline', 'offline');
        const recado = ehGrandeDemais(error)
          ? 'uma memória sua é grande demais pra nuvem — tenta tirar um desenho/foto dela'
          : error.message;
        showToast(`Não consegui enviar: ${recado}`, true);
        return false;
      }
    },

    async pull({ replace = false } = {}) {
      const api = cloudApi();
      if (!api) return false;
      setCloudStatus('baixando...', 'syncing');
      try {
        let offset = 0;
        let data = null;
        let merged = [];
        const pedacos = [];
        for (let volta = 0; volta < 100; volta += 1) {
          const pedaco = await api.snapshot({ limit: NUVEM_PEDACO_ENTRADAS, offset });
          if (!data) data = pedaco;
          pedacos.push(...(Array.isArray(pedaco.entries) ? pedaco.entries : []));
          const proximo = pedaco.page?.nextOffset ?? null;
          if (!pedaco.page) break;
          if (proximo === null || proximo === undefined || proximo <= offset) break;
          offset = proximo;
          setCloudStatus(`baixando ${pedacos.length}...`, 'syncing');
          await new Promise((respirar) => setTimeout(respirar, 0));
        }

        if (EntryStore) {
          merged = (await Promise.resolve(EntryStore.juntar(localStorage, pedacos, { replace }))).lista;
        } else {
          const porData = new Map(readEntries().map((entry) => [entry.date, entry]));
          for (const remote of pedacos) {
            if (!porData.has(remote.date) || replace) {
              porData.set(remote.date, remoteToEntry(remote));
            }
          }
          merged = [...porData.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
          await gravarEntradas(merged);
        }

        const doDia = merged.find((e) => e.date === state.draft.date);
        if (doDia && (!state.editingId || doDia.id !== state.editingId)) {
          state.draft.title = state.draft.title || doDia.title || '';
          state.draft.body = state.draft.body || doDia.body || '';
          state.editingId = doDia.id;
        }
        if (livrinho) atualizarLivrinho({ irPara: 'mesma' });

        if (Array.isArray(data.todos) && data.todos.length) {
          state.todoItems = data.todos.map(todo => ({ text: todo.text, checked: Boolean(todo.done ?? todo.checked) }));
          localStorage.setItem('pooftie_todos', JSON.stringify(state.todoItems));
        }

        const days = data.calendar?.days || [];
        if (days.length) {
          for (const day of days) {
            if (day.note) state.calendarNotes[day.date] = day.note;
            else delete state.calendarNotes[day.date];
            if (day.reaction) state.calendarReactions[day.date] = day.reaction;
            else delete state.calendarReactions[day.date];
          }
          localStorage.setItem('pooftie_cal_notes', JSON.stringify(state.calendarNotes));
          localStorage.setItem('pooftie_cal_reactions', JSON.stringify(state.calendarReactions));
        }

        if (data.settings?.coverData) {
          state.coverData = { ...state.coverData, ...data.settings.coverData };
          guardarNoDiario('pooftie_cover_data', JSON.stringify(state.coverData));
          aplicarModoDaCapa();
          atualizarTituloDoLivrinho();
        }

        setCloudStatus('nuvem ok', 'online');
        renderCalendar();
        renderTodoList();
        return true;
      } catch (error) {
        setCloudStatus('offline', 'offline');
        showToast(`Não consegui baixar: ${error.message}`, true);
        return false;
      }
    },

    async importar(texto, { trocar = false, perguntarPelaNuvem = true } = {}) {
      if (!Backup) {
        showToast('esta cópia do app está sem o leitor de backup 🌸', true);
        return false;
      }
      let pacote;
      try {
        pacote = Backup.ler(texto);
      } catch (error) {
        showToast(`Não consegui abrir o backup: ${error.message}`, true);
        return false;
      }

      setCloudStatus('devolvendo...', 'syncing');
      try {
        const resultado = Backup.juntar({
          entries: readEntries(),
          todos: state.todoItems || [],
          notes: state.calendarNotes || {},
          reactions: state.calendarReactions || {},
          coverData: lerDoDiario('pooftie_cover_data', null),
          papel: storeDiario.getItem('pooftie_paper_pattern'),
          fonte: localStorage.getItem('pooftie_active_font')
        }, pacote, { trocar });

        const gravou = EntryStore
          ? await EntryStore.gravar(storeDiario, resultado.entries, {
            aoPrecisarDeEspaco: (lista) => reduzirAsImagensDoDiario(lista)
          })
          : { ok: await gravarEntradas(resultado.entries) };
        if (!gravou.ok) {
          setCloudStatus('offline', 'offline');
          showToast('não coube no navegador guardar essas memórias 🌧️', true);
          return false;
        }
        esquecerDatasComMemoria();

        state.todoItems = resultado.todos;
        guardarNoNavegador('pooftie_todos', JSON.stringify(resultado.todos));
        state.calendarNotes = resultado.notes;
        state.calendarReactions = resultado.reactions;
        guardarNoNavegador('pooftie_cal_notes', JSON.stringify(resultado.notes));
        guardarNoNavegador('pooftie_cal_reactions', JSON.stringify(resultado.reactions));

        if (resultado.coverData) {
          state.coverData = resultado.coverData;
          guardarNoDiario('pooftie_cover_data', JSON.stringify(state.coverData));
          if (coverTitleInput) coverTitleInput.value = state.coverData.title || '';
          if (coverSubtitleInput) coverSubtitleInput.value = state.coverData.subtitle || '';
          aplicarModoDaCapa();
          restoreTexts(state.coverData.texts, coverTextsOverlay);
          atualizarTituloDoLivrinho();
        }
        if (resultado.papel) applyPaperPattern(resultado.papel);
        if (resultado.fonte) {
          if (fontFamilySelect) fontFamilySelect.value = resultado.fonte;
          applyFont(resultado.fonte);
        }

        try {
          renderCalendar();
          renderTodoList();
          renderHistory();
          if (livrinho) atualizarLivrinho({ irPara: 'mesma' });
        } catch (error) {
          console.warn('[crechezinha] o backup voltou, mas a tela não se ajeitou toda:', error.message);
        }

        showToast(Backup.recado(resultado.contas));
        this.ping();

        const api = cloudApi();
        if (perguntarPelaNuvem && api && api.online && resultado.contas.entraram) {
          const quer = confirm(
            '✧ As memórias do arquivo voltaram pro navegador!\n\n' +
            'Quer mandar elas pra nuvem também? (assim elas aparecem nos outros aparelhos)'
          );
          if (quer) await this.push();
        }
        return true;
      } catch (error) {
        setCloudStatus('offline', 'offline');
        showToast(`Não consegui devolver o backup: ${error.message}`, true);
        return false;
      }
    },

    async sync({ replace = false, push = false, silent = false } = {}) {
      const api = cloudApi();
      if (!api) {
        setCloudStatus('sem api', 'offline');
        return false;
      }
      const alive = await this.ping();
      if (!alive) {
        if (!silent) showToast('Nuvem indisponível agora 🌧️', true);
        return false;
      }
      const downloaded = await this.pull({ replace });
      if (!downloaded) return false;
      if (push) return this.push();
      if (!silent) showToast('⋆｡˚ Memórias sincronizadas! ˚｡⋆');
      return true;
    },

    async pushEntry(entry) {
      const api = cloudApi();
      if (!api || !entry?.date) return false;
      try {
        await api.saveEntry(entryForCloud(entry));
        setCloudStatus('nuvem ok', 'online');
        return true;
      } catch (error) {
        setCloudStatus('offline', 'offline');
        console.warn('[crechezinha] não deu para enviar a memória:', error.message);
        return false;
      }
    },

    async deleteEntry(date) {
      const api = cloudApi();
      if (!api || !date) return false;
      try {
        await api.deleteEntry(date);
        return true;
      } catch (error) {
        return false;
      }
    },

    open() {
      if (!cloudModal) return;
      if (cloudUserInput) cloudUserInput.value = cloudApi()?.user || state.username || '';
      if (cloudKeyInput) cloudKeyInput.value = localStorage.getItem('pooftie_api_key') || '';
      cloudModal.classList.add('open');
      this.ping();
    },

    close() {
      if (cloudModal) cloudModal.classList.remove('open');
    }
  };

  window.CrechezinhaCloud = CrechezinhaCloud;

  if (cloudButton) {
    cloudButton.addEventListener('click', () => {
      fecharEngrenagem();
      playSfx(1000);
      CrechezinhaCloud.open();
    });
  }
  if (btnCloudClose) btnCloudClose.addEventListener('click', () => CrechezinhaCloud.close());
  if (cloudBackdrop) cloudBackdrop.addEventListener('click', () => CrechezinhaCloud.close());
  if (btnCloudPush) btnCloudPush.addEventListener('click', () => CrechezinhaCloud.push());
  if (btnCloudPull) {
    btnCloudPull.addEventListener('click', () => {
      CrechezinhaCloud.pull({ replace: false }).then(ok => {
        if (ok) showToast('⬇️ Memórias baixadas! ୨୧');
      });
    });
  }
  if (cloudUserInput) {
    cloudUserInput.addEventListener('change', () => {
      const user = cloudApi()?.setUser(cloudUserInput.value) || 'default';
      cloudUserInput.value = user;
      showToast(`Agora a nuvem é a de "${user}" ✧`);
      CrechezinhaCloud.ping();
    });
  }
  if (cloudKeyInput) {
    cloudKeyInput.addEventListener('change', () => {
      cloudApi()?.setKey(cloudKeyInput.value);
      showToast('🔑 Chave guardada!');
    });
  }

  function lerArquivoDeTexto(arquivo) {
    if (arquivo && typeof arquivo.text === 'function') return Promise.resolve(arquivo.text());
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result || ''));
      leitor.onerror = () => reject(new Error('não consegui ler o arquivo'));
      leitor.readAsText(arquivo);
    });
  }

  if (cloudImportInput) {
    cloudImportInput.addEventListener('change', async () => {
      const arquivo = cloudImportInput.files && cloudImportInput.files[0];
      if (!arquivo) return;
      const trocar = Boolean(cloudImportReplace && cloudImportReplace.checked);
      if (cloudImportLabel) cloudImportLabel.classList.add('carregando');
      try {
        const texto = await lerArquivoDeTexto(arquivo);
        await CrechezinhaCloud.importar(texto, { trocar });
      } catch (error) {
        showToast(`Não consegui abrir o arquivo: ${error.message}`, true);
      } finally {
        cloudImportInput.value = '';
        if (cloudImportLabel) cloudImportLabel.classList.remove('carregando');
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (settingsMenu && !settingsMenu.hidden) {
      fecharEngrenagem();
      settingsButton?.focus();
      return;
    }
    if (cloudModal) cloudModal.classList.remove('open');
  });

  (function autoSync() {
    if (!cloudApi()) {
      setCloudStatus('sem api', 'offline');
      return;
    }
    cloudApi().setUser(state.username || 'default');
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        CrechezinhaCloud.sync({ replace: false, silent: true });
      }
    }, 1800);
  })();

  const CartasModel = window.PooftieLettersModel || null;
  const MuralModel = window.PooftieMuralModel || null;
  const CARTA_CHAVE_IGNORAR = 'pooftie_letters_ignored';
  const CARTA_CHAVE_CODIGOS = 'pooftie_letter_codes';
  const CARTA_CHAVE_ABERTAS = 'pooftie_letters_opened';
  const CARTA_CHAVE_MEU_ICONE = 'pooftie_letter_my_icon';
  const CARTA_CHAVE_ICONES_AMIGAS = 'pooftie_letter_friend_icons';
  const CARTA_CHAVE_MURAL = 'pooftie_mural';
  const CARTA_CHAVE_PENDENTE = 'pooftie_letter_pending';
  const CARTA_CHAVE_CODIGO_PESSOAL = 'pooftie_letter_my_code';
  const CARTA_CHAVE_ESTILO = 'pooftie_letter_style';

  const CARTAS_ADESIVOS_GRUPOS = [
    {
      nome: '💗 corações',
      itens: [
        'assets/stickers/coracaozinhos/35ER6P_front_0_live.webp',
        'assets/stickers/coracaozinhos/4QZMVY_front_0_live.webp',
        'assets/stickers/coracaozinhos/B2XDSZ_front_0_live.webp',
        'assets/stickers/coracaozinhos/BLDHM2_front_0_live.webp',
        'assets/stickers/coracaozinhos/Internet_20250811_114222_112.webp',
        'assets/stickers/coracaozinhos/Internet_20250811_114222_131.webp',
        'assets/stickers/coracaozinhos/Internet_20250811_114222_154.webp',
        'assets/stickers/coracaozinhos/Internet_20250811_114222_156.webp',
        'assets/stickers/heart.webp',
      ],
    },
    {
      nome: '🎀 lacinhos',
      itens: [
        'assets/stickers/lacinhos/bow.webp',
        'assets/stickers/lacinhos/54WCFQ_front_0_live.webp',
        'assets/stickers/lacinhos/9LNF9S_front_0_live.webp',
        'assets/stickers/lacinhos/CVWJ2P_front_0_live.webp',
        'assets/stickers/lacinhos/2FFPXS_front_0_live(1).webp',
        'assets/stickers/lacinhos/JY5L5B_front_0_live.webp',
        'assets/stickers/lacinhos/K2TSJV_front_0_live.webp',
        'assets/stickers/lacinhos/LDB3AG_front_0_live.webp',
        'assets/stickers/lovely.webp',
      ],
    },
    {
      nome: '🌿 natureza',
      itens: [
        'assets/stickers/natureza/cloud.webp',
        'assets/stickers/natureza/delicate.webp',
        'assets/stickers/natureza/flower_twig_1.webp',
        'assets/stickers/natureza/flower_twig_2.webp',
        'assets/stickers/natureza/flower_twig_3.webp',
        'assets/stickers/natureza/flower_twig_4.webp',
        'assets/stickers/natureza/flower_twig_5.webp',
        'assets/stickers/natureza/flower_twig_6.webp',
        'assets/stickers/natureza/leaves_1.webp',
        'assets/stickers/natureza/leaves_2.webp',
        'assets/stickers/natureza/leaves_3.webp',
        'assets/stickers/natureza/leaves_4.webp',
        'assets/stickers/natureza/snail.gif',
      ],
    },
    {
      nome: '🍰 comidinhas',
      itens: [
        'assets/stickers/comidinhas/cupcake.webp',
        'assets/stickers/comidinhas/chantilliy.webp',
        'assets/stickers/comidinhas/8RD4G6_front_0_live.webp',
        'assets/stickers/comidinhas/FZT2CU_front_0_live.webp',
        'assets/stickers/comidinhas/tea.gif',
        'assets/stickers/life.webp',
      ],
    },
    {
      nome: '🧸 pelúcias',
      itens: [
        'assets/stickers/pelucias/animation.webp',
        'assets/stickers/pelucias/6QA7AE_thumbnail_live.webp',
        'assets/stickers/pelucias/FXPPEH_front_0_live.webp',
        'assets/stickers/pelucias/GEU9EH_thumbnail_live.webp',
        'assets/stickers/melody.webp',
      ],
    },
    {
      nome: '🐾 bichinhos',
      itens: [
        'assets/stickers/animais/IMG_5887.webp',
        'assets/stickers/animais/IMG_5894.webp',
        'assets/stickers/animais/IMG_8279.webp',
        'assets/stickers/animais/inpatia.webp',
      ],
    },
    {
      nome: '🌸 pooftie',
      itens: [
        'assets/stickers/pooftie/adesivo.webp',
        'assets/stickers/pooftie/adesivo1.webp',
        'assets/stickers/pooftie/adesivo5.webp',
        'assets/stickers/pooftie/adesivo10.webp',
        'assets/stickers/pooftie/sticker1.webp',
        'assets/stickers/pooftie/sticker2.webp',
        'assets/stickers/pooftie/sticker3.webp',
        'assets/stickers/pooftie/sticker4.webp',
      ],
    },
    {
      nome: '✏️ rabiscos',
      itens: [
        'assets/stickers/canetinhas/canetinha.webp',
        'assets/stickers/canetinhas/canetinha2.webp',
        'assets/stickers/emoticons/emo2.gif',
        'assets/stickers/emoticons/emo5.gif',
      ],
    },
  ];
  const CARTAS_ADESIVOS = CARTAS_ADESIVOS_GRUPOS.flatMap((grupo) => grupo.itens);
  const CARTAS_EMOJIS = [
    '🌸', '🌷', '🌼', '🍓', '🍒', '🍰', '🧁', '🍵',
    '🎀', '💌', '💗', '✨', '🌙', '⭐', '☁️', '🌈',
    '🐰', '🧸', '🐻', '🐱', '🦋', '🕊️', '🌿', '🍄',
  ];

  const cartasUi = {
    botao: document.getElementById('btn-letters'),
    badge: document.getElementById('letters-badge'),
    modal: document.getElementById('letters-modal'),
    backdrop: document.getElementById('letters-backdrop'),
    fechar: document.getElementById('btn-letters-close'),
    subtitulo: document.getElementById('letters-subtitle'),
    corpo: document.getElementById('letters-body'),
    carregando: document.getElementById('letters-loading'),
    painel: document.getElementById('letters-panel'),
    contadorRecebidas: document.getElementById('letters-received-count'),
    abas: [...document.querySelectorAll('[data-letter-tab]')],
    escrever: document.getElementById('btn-letter-write'),
    escreverCodigo: document.getElementById('btn-letter-code'),
    escreverAmiga: document.getElementById('btn-letter-friend'),

    compose: document.getElementById('letter-compose-modal'),
    composeBackdrop: document.getElementById('letter-compose-backdrop'),
    composeFechar: document.getElementById('btn-letter-compose-close'),
    artes: document.getElementById('letter-art-grid'),
    fonteAbas: [...document.querySelectorAll('[data-letter-source]')],
    fontePagina: document.getElementById('letter-source-page'),
    fonteNova: document.getElementById('letter-source-new'),
    paginaSelect: document.getElementById('letter-page-select'),
    paginaDica: document.getElementById('letter-page-hint'),
    titulo: document.getElementById('letter-title-input'),
    texto: document.getElementById('letter-body-input'),
    fotoInput: document.getElementById('letter-photo-upload'),
    fotoDica: document.getElementById('letter-photo-hint'),
    fotoLimpar: document.getElementById('btn-letter-photo-clear'),
    fotoPreview: document.getElementById('letter-photo-preview'),
    fotoImg: document.getElementById('letter-photo-img'),
    destinoDica: document.getElementById('letter-recipient-hint'),
    destinoAbas: [...document.querySelectorAll('[data-letter-dest]')],
    destinoCodigo: document.getElementById('letter-dest-code'),
    destinoAmigas: document.getElementById('letter-dest-friends'),
    amigosPicker: document.getElementById('letter-friend-picker'),
    destinoAmigaDica: document.getElementById('letter-dest-friend-hint'),
    previa: document.getElementById('letter-preview'),
    estado: document.getElementById('letter-compose-state'),
    enviar: document.getElementById('btn-letter-send'),

    folha: document.getElementById('letter-page-sheet'),
    adesivosLayer: document.getElementById('letter-stickers-layer'),
    adesivosFerramentas: document.getElementById('letter-sticker-tools'),
    paletaAdesivos: document.getElementById('letter-sticker-palette'),
    padroes: document.getElementById('letter-pattern-row'),
    fonteSelect: document.getElementById('letter-font-select'),
    corDaFolha: document.getElementById('letter-paper-color'),
    corDaLetra: document.getElementById('letter-text-color'),

    envelope: document.getElementById('letter-envelope-modal'),
    envelopeBackdrop: document.getElementById('letter-envelope-backdrop'),
    envelopeTitulo: document.getElementById('letter-envelope-title'),
    envelopeAbrir: document.getElementById('btn-open-envelope'),
    envelopeImg: document.getElementById('letter-envelope-img'),
    envelopeDe: document.getElementById('letter-envelope-from'),
    envelopeDica: document.getElementById('letter-envelope-hint'),
    envelopeErro: document.getElementById('letter-envelope-error'),
    envelopeFechar: document.getElementById('btn-envelope-close'),
    envelopeDepois: document.getElementById('letter-envelope-after'),
    envelopeDepoisTexto: document.getElementById('letter-envelope-after-text'),
    envelopePreview: document.getElementById('letter-envelope-preview'),
    envelopeSheet: document.getElementById('letter-envelope-sheet'),
    envelopeDiario: document.getElementById('btn-letter-to-diary'),
    envelopeMural: document.getElementById('btn-letter-to-mural'),
    envelopeAmiga: document.getElementById('btn-letter-befriend'),
    envelopeLer: document.getElementById('btn-letter-read'),

    compartilhar: document.getElementById('letter-share-modal'),
    compartilharBackdrop: document.getElementById('letter-share-backdrop'),
    shareArt: document.getElementById('letter-share-art'),
    shareCode: document.getElementById('letter-share-code'),
    shareLink: document.getElementById('letter-share-link'),
    shareText: document.getElementById('letter-share-text'),
    shareCopyCode: document.getElementById('btn-share-copy-code'),
    shareCopyLink: document.getElementById('btn-share-copy-link'),
    shareWhats: document.getElementById('link-share-whatsapp'),
    shareDone: document.getElementById('btn-share-done'),

    novas: document.getElementById('letters-new-modal'),
    novasBackdrop: document.getElementById('letters-new-backdrop'),
    novasTitulo: document.getElementById('letters-new-title'),
    novasTexto: document.getElementById('letters-new-text'),
    novasIgnorar: document.getElementById('btn-letters-ignore'),
    novasLer: document.getElementById('btn-letters-read'),

    selo: document.getElementById('letter-seal'),
    seloArt: document.getElementById('letter-seal-art'),
    seloNome: document.getElementById('letter-seal-name'),

    muralBotao: document.getElementById('btn-mural'),
    muralBadge: document.getElementById('mural-badge'),
    muralTitulo: document.getElementById('mural-title'),
    muralSubtitulo: document.getElementById('mural-subtitle'),
    muralBoard: document.getElementById('mural-board'),
    muralTint: document.getElementById('mural-board-tint'),
    muralLayer: document.getElementById('mural-layer'),
    muralToolbar: document.getElementById('mural-toolbar'),
    muralEmpty: document.getElementById('mural-empty'),
    muralPending: document.getElementById('mural-pending'),
    muralPendingList: document.getElementById('mural-pending-list'),
    muralAbrirTema: document.getElementById('btn-mural-theme'),
    muralArrumar: document.getElementById('btn-mural-arrange'),
    muralAbrirCartinhas: document.getElementById('btn-mural-open-letters'),
    muralEmptyCartinhas: document.getElementById('btn-mural-empty-letters'),

    tema: document.getElementById('mural-theme-modal'),
    temaBackdrop: document.getElementById('mural-theme-backdrop'),
    temaFechar: document.getElementById('btn-mural-theme-close'),
    temaFeito: document.getElementById('btn-mural-theme-done'),
    temaNome: document.getElementById('mural-title-input'),
    temaFundos: document.getElementById('mural-bg-grid'),
    temaCor: document.getElementById('mural-tint-input'),
    temaCorLimpar: document.getElementById('btn-mural-tint-clear'),
    temaAdesivos: document.getElementById('mural-sticker-palette'),
    temaEstado: document.getElementById('mural-theme-state'),

    leitor: document.getElementById('mural-reader'),
    leitorBackdrop: document.getElementById('mural-reader-backdrop'),
    leitorTitulo: document.getElementById('mural-reader-title'),
    leitorSubtitulo: document.getElementById('mural-reader-subtitle'),
    leitorFolha: document.getElementById('mural-reader-sheet'),
    leitorDe: document.getElementById('mural-reader-from'),
    leitorDiario: document.getElementById('btn-mural-reader-diary'),
    leitorMural: document.getElementById('btn-mural-reader-remove'),
    leitorFeito: document.getElementById('btn-mural-reader-done'),
    leitorFechar: document.getElementById('btn-mural-reader-close'),

    icone: document.getElementById('letter-icon-modal'),
    iconeBackdrop: document.getElementById('letter-icon-backdrop'),
    iconeFechar: document.getElementById('btn-letter-icon-close'),
    iconeTitulo: document.getElementById('letter-icon-title'),
    iconeSubtitulo: document.getElementById('letter-icon-subtitle'),
    iconePreview: document.getElementById('letter-icon-preview'),
    iconeTexto: document.getElementById('letter-icon-current-text'),
    iconeEmojis: document.getElementById('letter-icon-emoji-grid'),
    iconeAdesivos: document.getElementById('letter-icon-sticker-grid'),
    iconeInput: document.getElementById('letter-icon-upload'),
    iconeReset: document.getElementById('btn-letter-icon-reset'),
  };

  const Cartas = {
    dados: null,
    erro: '',
    aba: 'received',
    carregando: false,
    enviando: false,
    art: 'letter1',
    fonte: 'page',
    paginas: [],
    foto: '',
    envelope: null,
    ultimaCarta: null,
    compartilhar: null,
    pendente: null,
    destinoModo: 'code',
    amigaEscolhida: '',
    mural: null,
    muralDiario: '',
    muralSelecionado: '',
    leitorAberto: null,
    iconeAlvo: null,

    padrao: 'lines',
    letra: "'Caveat', cursive",
    corDaFolha: '#ffffff',
    corDaLetra: '#463529',
    adesivos: [],
    adesivoSeq: 0,
    adesivoSelecionado: '',

    codigoPessoal: null,
    codigoPessoalQuando: 0,
    codigoPessoalErro: '',
    codigoPessoalBuscando: false,
  };

  const cartasApi = () => window.PooftieAPI || null;
  const cartasModelo = () => CartasModel;

  function cartasFormatarCodigo(codigo) {
    return cartasModelo() ? cartasModelo().formatarCodigo(codigo) : String(codigo || '');
  }

  function cartasSrcDaArte(art) {
    if (cartasModelo()) return cartasModelo().srcDaArte(art);
    return `assets/images/letters/${art || 'letter1'}.webp`;
  }


  const CARTAS_ICONE_PADRAO = '🌸';
  const CARTAS_ICONES = (MuralModel && MuralModel.ICONES) || [
    '🌸', '🌷', '🎀', '🍓', '🐰', '🧸', '⭐', '🌙',
    '🍰', '🦋', '💌', '🐻', '🌼', '🍒', '☁️', '🕊️',
  ];
  const CARTAS_ICONES_ADESIVOS = (MuralModel && MuralModel.ICONES_ADESIVOS) || CARTAS_ADESIVOS;

  function cartasNormalizarIcone(valor, reserva = CARTAS_ICONE_PADRAO) {
    if (MuralModel) return MuralModel.normalizarIcone(valor, reserva);
    const texto = String(valor || '').trim();
    return texto ? texto.slice(0, 240) : reserva;
  }

  function cartasIconeEhImagem(valor) {
    if (MuralModel) return MuralModel.ehImagem(valor);
    return /^(?:data:image\/|assets\/)/i.test(String(valor || ''));
  }

  function cartasLerMeuIcone() {
    try {
      return cartasNormalizarIcone(localStorage.getItem(CARTA_CHAVE_MEU_ICONE), CARTAS_ICONE_PADRAO);
    } catch (error) {
      return CARTAS_ICONE_PADRAO;
    }
  }

  function cartasGuardarMeuIcone(icone) {
    const valor = cartasNormalizarIcone(icone, CARTAS_ICONE_PADRAO);
    try { localStorage.setItem(CARTA_CHAVE_MEU_ICONE, valor); } catch (error) {   }
    return valor;
  }

  function cartasLerIconesAmigas() {
    try {
      const dado = JSON.parse(localStorage.getItem(CARTA_CHAVE_ICONES_AMIGAS) || '{}');
      return dado && typeof dado === 'object' && !Array.isArray(dado) ? dado : {};
    } catch (error) {
      return {};
    }
  }

  function cartasGuardarMapaDeIcones(mapa) {
    try { localStorage.setItem(CARTA_CHAVE_ICONES_AMIGAS, JSON.stringify(mapa || {})); } catch (error) {   }
  }

  function cartasChaveDeAlias(alias) {
    return `nome:${String(alias || '').trim().toLowerCase()}`;
  }

  function cartasIconeDaAmiga(amiga) {
    if (!amiga) return CARTAS_ICONE_PADRAO;
    const mapa = cartasLerIconesAmigas();
    const porId = mapa[`id:${amiga.id}`];
    if (porId) return cartasNormalizarIcone(porId, CARTAS_ICONE_PADRAO);
    const porNome = mapa[cartasChaveDeAlias(amiga.alias)];
    if (porNome) return cartasNormalizarIcone(porNome, CARTAS_ICONE_PADRAO);
    return CARTAS_ICONE_PADRAO;
  }

  function cartasIconeDoAlias(alias) {
    const mapa = cartasLerIconesAmigas();
    return cartasNormalizarIcone(mapa[cartasChaveDeAlias(alias)], CARTAS_ICONE_PADRAO);
  }

  function cartasSalvarIconeDaAmiga(amiga, icone) {
    if (!amiga) return CARTAS_ICONE_PADRAO;
    const mapa = cartasLerIconesAmigas();
    const valor = cartasNormalizarIcone(icone, CARTAS_ICONE_PADRAO);
    if (amiga.id) mapa[`id:${amiga.id}`] = valor;
    mapa[cartasChaveDeAlias(amiga.alias)] = valor;
    cartasGuardarMapaDeIcones(mapa);
    return valor;
  }

  function cartasLembrarIconeDoRemetente(alias, icone) {
    const valor = cartasNormalizarIcone(icone, '');
    if (!valor || !alias) return;
    const mapa = cartasLerIconesAmigas();
    const chave = cartasChaveDeAlias(alias);
    if (!mapa[chave]) {
      mapa[chave] = valor;
      cartasGuardarMapaDeIcones(mapa);
    }
  }

  function cartasCriarIcone(icone, classe = '') {
    const valor = cartasNormalizarIcone(icone, CARTAS_ICONE_PADRAO);
    const caixa = cartasElemento('span', `letter-icon${classe ? ` ${classe}` : ''}`);
    if (cartasIconeEhImagem(valor)) {
      const img = document.createElement('img');
      img.src = valor;
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      caixa.appendChild(img);
    } else {
      caixa.textContent = valor;
    }
    return caixa;
  }

  function cartasRenderizarEscolhedorDeIcone() {
    const alvo = Cartas.iconeAlvo;
    if (!alvo) return;
    const atual = alvo.tipo === 'amiga' && alvo.amiga
      ? cartasIconeDaAmiga(alvo.amiga)
      : cartasLerMeuIcone();

    if (cartasUi.iconeTitulo) {
      cartasUi.iconeTitulo.textContent = alvo.tipo === 'amiga'
        ? `icon de ${alvo.amiga && alvo.amiga.alias ? alvo.amiga.alias : 'sua amiga'}`
        : 'meu icon';
    }
    if (cartasUi.iconeSubtitulo) {
      cartasUi.iconeSubtitulo.textContent = alvo.tipo === 'amiga'
        ? 'escolhe a carinha que vai aparecer do lado do nome dela ♡'
        : 'escolhe a carinha que vai aparecer pras suas amigas ⋆';
    }
    if (cartasUi.iconePreview) {
      cartasUi.iconePreview.innerHTML = '';
      cartasUi.iconePreview.appendChild(cartasCriarIcone(atual));
    }
    if (cartasUi.iconeTexto) {
      cartasUi.iconeTexto.textContent = atual === CARTAS_ICONE_PADRAO
        ? 'esse é o icon de sempre'
        : 'esse é o icon de agora';
    }

    if (cartasUi.iconeEmojis) {
      cartasUi.iconeEmojis.innerHTML = '';
      CARTAS_ICONES.forEach((emoji) => {
        const botao = cartasElemento('button', 'letter-icon-option' + (emoji === atual ? ' is-escolhido' : ''), emoji);
        botao.type = 'button';
        botao.title = `escolher ${emoji} como icon`;
        botao.setAttribute('aria-label', `escolher ${emoji} como icon`);
        botao.addEventListener('click', () => cartasAplicarIcone(emoji));
        cartasUi.iconeEmojis.appendChild(botao);
      });
    }

    if (cartasUi.iconeAdesivos) {
      cartasUi.iconeAdesivos.innerHTML = '';
      CARTAS_ICONES_ADESIVOS.forEach((src) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'letter-icon-option letter-icon-option-img' + (src === atual ? ' is-escolhido' : '');
        botao.title = 'escolher esse adesivo como icon';
        botao.setAttribute('aria-label', 'escolher esse adesivo como icon');
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        botao.appendChild(img);
        botao.addEventListener('click', () => cartasAplicarIcone(src));
        cartasUi.iconeAdesivos.appendChild(botao);
      });
    }
  }

  function cartasAbrirEscolhedorDeIcone(alvo) {
    if (!cartasUi.icone) return;
    Cartas.iconeAlvo = alvo || { tipo: 'meu' };
    cartasRenderizarEscolhedorDeIcone();
    cartasUi.icone.classList.add('open');
    playSfx(1050, 0.06);
  }

  function cartasFecharEscolhedorDeIcone() {
    if (cartasUi.icone) cartasUi.icone.classList.remove('open');
    Cartas.iconeAlvo = null;
  }

  function cartasAplicarIcone(icone) {
    const alvo = Cartas.iconeAlvo;
    if (!alvo) return;
    if (alvo.tipo === 'amiga' && alvo.amiga) {
      cartasSalvarIconeDaAmiga(alvo.amiga, icone);
      showToast('🌸 o icon da sua amiga mudou!');
    } else {
      cartasGuardarMeuIcone(icone);
      showToast('🌸 seu icon mudou!');
    }
    cartasRenderizarEscolhedorDeIcone();
    if (cartasUi.modal && cartasUi.modal.classList.contains('open')) cartasRenderizar();
    playSfx(1080, 0.05);
    setTimeout(() => cartasFecharEscolhedorDeIcone(), 220);
  }


  const CARTAS_PADROES = [
    { id: 'lines', nome: 'linhas' },
    { id: 'dots', nome: 'bolinhas' },
    { id: 'grid', nome: 'grade' },
    { id: 'blank', nome: 'lisa' },
    { id: 'spiral', nome: 'espiral' },
  ];

  const CARTAS_LETRAS = [
    "'Caveat', cursive",
    "'Patrick Hand', cursive",
    "'Gloria Hallelujah', cursive",
    "'Marck Script', cursive",
    "'Indie Flower', cursive",
    "'Nunito', sans-serif",
  ];

  function cartasLerEstiloSalvo() {
    try {
      const dado = JSON.parse(localStorage.getItem(CARTA_CHAVE_ESTILO) || 'null');
      if (!dado || typeof dado !== 'object') return null;
      return {
        padrao: CARTAS_PADROES.some((p) => p.id === dado.padrao) ? dado.padrao : 'lines',
        letra: CARTAS_LETRAS.includes(dado.letra) ? dado.letra : "'Caveat', cursive",
        corDaFolha: /^#[0-9a-f]{6}$/i.test(String(dado.corDaFolha || '')) ? dado.corDaFolha : '#ffffff',
        corDaLetra: /^#[0-9a-f]{6}$/i.test(String(dado.corDaLetra || '')) ? dado.corDaLetra : '#463529',
      };
    } catch (error) {
      return null;
    }
  }

  function cartasGuardarEstilo() {
    try {
      localStorage.setItem(CARTA_CHAVE_ESTILO, JSON.stringify({
        padrao: Cartas.padrao,
        letra: Cartas.letra,
        corDaFolha: Cartas.corDaFolha,
        corDaLetra: Cartas.corDaLetra,
      }));
    } catch (error) {   }
  }

  function cartasAplicarEstiloDaPagina() {
    if (cartasUi.folha) {
      cartasUi.folha.className = `custom-diary-paper letter-page-sheet paper-${Cartas.padrao}`;
      cartasUi.folha.style.setProperty('--letter-paper', Cartas.corDaFolha);
      cartasUi.folha.style.setProperty('--letter-ink', Cartas.corDaLetra);
      cartasUi.folha.style.setProperty('--letter-font', Cartas.letra);
      cartasUi.folha.style.backgroundColor = Cartas.corDaFolha;
      cartasUi.folha.style.color = Cartas.corDaLetra;
      cartasUi.folha.style.fontFamily = Cartas.letra;
    }
    if (cartasUi.corDaFolha) cartasUi.corDaFolha.value = Cartas.corDaFolha;
    if (cartasUi.corDaLetra) cartasUi.corDaLetra.value = Cartas.corDaLetra;
    if (cartasUi.fonteSelect) cartasUi.fonteSelect.value = Cartas.letra;
    if (cartasUi.padroes) {
      cartasUi.padroes.querySelectorAll('[data-pattern]').forEach((botao) => {
        const ativo = botao.dataset.pattern === Cartas.padrao;
        botao.classList.toggle('active', ativo);
        botao.setAttribute('aria-checked', ativo ? 'true' : 'false');
      });
    }
  }

  function cartasRenderizarPadroes() {
    if (!cartasUi.padroes) return;
    cartasUi.padroes.innerHTML = '';
    CARTAS_PADROES.forEach((item) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'letter-pattern-option';
      botao.dataset.pattern = item.id;
      botao.setAttribute('role', 'radio');
      botao.setAttribute('aria-label', `folha ${item.nome}`);
      botao.title = `folha ${item.nome}`;
      botao.appendChild(cartasElemento('span', '', item.nome));
      botao.addEventListener('click', () => {
        Cartas.padrao = item.id;
        cartasAplicarEstiloDaPagina();
        cartasGuardarEstilo();
        playSfx(1040, 0.05);
      });
      cartasUi.padroes.appendChild(botao);
    });
    cartasAplicarEstiloDaPagina();
  }


  function cartasMedirFolhaDaCarta() {
    const folha = cartasUi.folha;
    if (folha) {
      const caixa = folha.getBoundingClientRect();
      if (caixa.width > 0 && caixa.height > 0) {
        return { width: Math.round(caixa.width), height: Math.round(caixa.height) };
      }
    }
    return { width: 370, height: 480 };
  }

  function cartasProporcaoDaFolha() {
    const folha = cartasMedirFolhaDaCarta();
    return folha && folha.width > 0 && folha.height > 0 ? folha.width / folha.height : 3 / 4;
  }

  function cartasAdicionarAdesivo(src, { foto = false, aspect = 0 } = {}) {
    if (!src) return null;
    if (foto) {
      Cartas.adesivos = Cartas.adesivos.filter((item) => item.kind !== 'photo');
    }
    Cartas.adesivoSeq += 1;
    const quantos = Cartas.adesivos.filter((item) => item.kind !== 'photo').length;
    const largura = foto ? 0.44 : 0.21;
    const proporcaoDaFoto = foto && Number(aspect) > 0 ? Number(aspect) : 1.5;
    const alturaDaFoto = foto
      ? Math.min(0.74, Math.max(0.12, (largura * cartasProporcaoDaFolha()) / proporcaoDaFoto))
      : 0;
    const item = {
      id: `${foto ? 'foto' : 'enfeite'}-${Date.now().toString(36)}-${Cartas.adesivoSeq}`,
      src,
      kind: foto ? 'photo' : 'sticker',
      x: foto ? Math.max(0.03, (1 - largura) / 2) : 0.1 + (quantos % 3) * 0.25,
      y: foto ? Math.max(0.04, Math.min(0.6, (1 - alturaDaFoto) / 2)) : 0.26 + (quantos % 4) * 0.15,
      w: largura,
      rotation: foto ? -2 : -9 + (quantos % 5) * 4,
      zIndex: 40 + Cartas.adesivoSeq,
    };
    Cartas.adesivos.push(item);
    if (foto) Cartas.adesivoSelecionado = item.id;
    cartasRenderizarAdesivos();
    return item;
  }

  function cartasRemoverAdesivo(id) {
    Cartas.adesivos = Cartas.adesivos.filter((item) => item.id !== id);
    if (Cartas.adesivoSelecionado === id) Cartas.adesivoSelecionado = '';
    if (Cartas.foto && !Cartas.adesivos.some((item) => item.kind === 'photo')) {
      Cartas.foto = '';
      if (cartasUi.fotoImg) cartasUi.fotoImg.removeAttribute('src');
      if (cartasUi.fotoPreview) cartasUi.fotoPreview.hidden = true;
      if (cartasUi.fotoLimpar) cartasUi.fotoLimpar.hidden = true;
    }
    cartasRenderizarAdesivos();
  }


  function cartasAdesivoSelecionado() {
    return Cartas.adesivos.find((item) => item.id === Cartas.adesivoSelecionado) || null;
  }

  function cartasPosicionarFerramentas() {
    const ferramentas = cartasUi.adesivosFerramentas;
    const folha = cartasUi.folha;
    if (!ferramentas || !folha) return;
    const item = cartasAdesivoSelecionado();
    const elemento = item && cartasUi.adesivosLayer
      ? cartasUi.adesivosLayer.querySelector(`[data-id="${String(item.id).replace(/["\\]/g, '\\$&')}"]`)
      : null;
    if (!item || !elemento) {
      ferramentas.hidden = true;
      return;
    }
    const caixa = folha.getBoundingClientRect();
    const alvo = elemento.getBoundingClientRect();
    if (!caixa.width || !caixa.height) { ferramentas.hidden = true; return; }
    ferramentas.hidden = false;
    const largura = ferramentas.offsetWidth || 0;
    const altura = ferramentas.offsetHeight || 0;
    let esquerda = alvo.left - caixa.left + ((alvo.width - largura) / 2);
    let topo = alvo.top - caixa.top - altura - 7;
    if (topo < 4) topo = alvo.bottom - caixa.top + 7;
    esquerda = Math.min(Math.max(4, esquerda), Math.max(4, caixa.width - largura - 4));
    topo = Math.min(Math.max(4, topo), Math.max(4, caixa.height - altura - 4));
    ferramentas.style.left = `${Math.round(esquerda)}px`;
    ferramentas.style.top = `${Math.round(topo)}px`;
  }

  function cartasAtualizarSelecaoDeAdesivo() {
    if (!cartasUi.adesivosLayer) return;
    if (!cartasAdesivoSelecionado()) Cartas.adesivoSelecionado = '';
    cartasUi.adesivosLayer.querySelectorAll('.letter-page-sticker').forEach((el) => {
      el.classList.toggle('is-selected', el.dataset.id === Cartas.adesivoSelecionado);
    });
    cartasPosicionarFerramentas();
  }

  function cartasSelecionarAdesivo(id) {
    Cartas.adesivoSelecionado = id || '';
    cartasAtualizarSelecaoDeAdesivo();
  }

  function cartasAcaoDoAdesivo(acao) {
    const item = cartasAdesivoSelecionado();
    if (!item) return;
    if (acao === 'remover') {
      cartasRemoverAdesivo(item.id);
      playSfx(760, 0.04);
      return;
    }
    if (acao === 'menor' || acao === 'maior') {
      const elemento = cartasUi.adesivosLayer
        ? cartasUi.adesivosLayer.querySelector(`[data-id="${String(item.id).replace(/["\\]/g, '\\$&')}"]`)
        : null;
      item.w = Math.min(0.9, Math.max(0.08, Number(item.w || 0.2) + (acao === 'maior' ? 0.06 : -0.06)));
      if (elemento && cartasUi.folha) {
        elemento.style.width = `${item.w * 100}%`;
        const caixa = cartasUi.folha.getBoundingClientRect();
        const altura = caixa.height > 0 ? elemento.offsetHeight / caixa.height : 0;
        item.x = Math.min(Math.max(0, item.x), Math.max(0, 1 - item.w));
        item.y = Math.min(Math.max(0, item.y), Math.max(0, 1 - altura - 0.02));
      }
      playSfx(acao === 'maior' ? 1120 : 840, 0.04);
    } else if (acao === 'girar-esquerda' || acao === 'girar-direita') {
      const passo = acao === 'girar-direita' ? 15 : -15;
      item.rotation = Math.min(180, Math.max(-180, Number(item.rotation || 0) + passo));
      playSfx(980, 0.04);
    } else if (acao === 'frente') {
      const maior = Cartas.adesivos.reduce((topo, outro) => Math.max(topo, Number(outro.zIndex) || 0), 30);
      item.zIndex = maior + 1;
      playSfx(1160, 0.04);
    }
    cartasRenderizarAdesivos();
  }

  function cartasRenderizarAdesivos() {
    const camada = cartasUi.adesivosLayer;
    if (!camada) return;
    camada.innerHTML = '';
    Cartas.adesivos.forEach((item) => {
      const envelope = cartasElemento('div', 'letter-page-sticker');
      envelope.dataset.id = item.id;
      envelope.style.left = `${item.x * 100}%`;
      envelope.style.top = `${item.y * 100}%`;
      envelope.style.width = `${item.w * 100}%`;
      envelope.style.transform = `rotate(${item.rotation || 0}deg)`;
      envelope.style.zIndex = String(item.zIndex || 30);
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.kind === 'photo' ? 'foto da carta' : 'enfeite da carta';
      img.draggable = false;
      envelope.appendChild(img);
      envelope.addEventListener('pointerdown', (evento) => cartasArrastarAdesivo(evento, envelope, item));
      envelope.addEventListener('click', (evento) => {
        evento.stopPropagation();
        cartasSelecionarAdesivo(item.id);
      });
      camada.appendChild(envelope);
    });
    cartasAtualizarSelecaoDeAdesivo();
  }

  function cartasArrastarAdesivo(evento, elemento, item) {
    if (evento.target && evento.target.closest && evento.target.closest('.letter-page-sticker-del')) return;
    if (evento.button !== undefined && evento.button !== 0) return;
    const folha = cartasUi.folha;
    if (!folha) return;
    const caixa = folha.getBoundingClientRect();
    if (!caixa.width || !caixa.height) return;
    evento.preventDefault();
    evento.stopPropagation();
    cartasSelecionarAdesivo(item.id);
    const inicio = {
      x: evento.clientX,
      y: evento.clientY,
      baseX: item.x,
      baseY: item.y,
    };
    elemento.classList.add('is-dragging', 'is-selected');
    try { elemento.setPointerCapture(evento.pointerId); } catch (error) {   }
    const mover = (movendo) => {
      const dx = (movendo.clientX - inicio.x) / caixa.width;
      const dy = (movendo.clientY - inicio.y) / caixa.height;
      const altura = caixa.height > 0 ? elemento.offsetHeight / caixa.height : 0;
      item.x = Math.min(Math.max(0, 1 - item.w), Math.max(0, inicio.baseX + dx));
      item.y = Math.min(Math.max(0, 1 - altura - 0.01), Math.max(0, inicio.baseY + dy));
      elemento.style.left = `${item.x * 100}%`;
      elemento.style.top = `${item.y * 100}%`;
      cartasPosicionarFerramentas();
    };
    const soltar = () => {
      elemento.classList.remove('is-dragging');
      elemento.removeEventListener('pointermove', mover);
      elemento.removeEventListener('pointerup', soltar);
      elemento.removeEventListener('pointercancel', soltar);
      cartasPosicionarFerramentas();
    };
    elemento.addEventListener('pointermove', mover);
    elemento.addEventListener('pointerup', soltar);
    elemento.addEventListener('pointercancel', soltar);
  }

  function cartasCriarBotaoDeAdesivo(src, aoEscolher, { emoji = false, onde = 'na página' } = {}) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = emoji ? 'sticker-emoji-btn' : 'sticker-adesivo-btn';
    botao.title = emoji ? `colar ${src} ${onde}` : `colar esse enfeite ${onde}`;
    botao.setAttribute('aria-label', botao.title);
    if (emoji) {
      botao.textContent = src;
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      botao.appendChild(img);
    }
    botao.addEventListener('click', () => aoEscolher(src));
    return botao;
  }

  function cartasMontarGaleriaDeAdesivos(destino, { comEmojis = false, aoEscolher = null, onde = 'na página' } = {}) {
    if (!destino || typeof aoEscolher !== 'function') return;
    destino.innerHTML = '';
    const galeria = cartasElemento('div', 'sticker-gallery');
    CARTAS_ADESIVOS_GRUPOS.forEach((grupo) => {
      const bloco = cartasElemento('div', 'sticker-gallery-group');
      bloco.appendChild(cartasElemento('span', 'sticker-gallery-title', grupo.nome));
      const grade = cartasElemento('div', 'sticker-gallery-grid');
      grupo.itens.forEach((src) => {
        grade.appendChild(cartasCriarBotaoDeAdesivo(src, aoEscolher, { onde }));
      });
      bloco.appendChild(grade);
      galeria.appendChild(bloco);
    });
    if (comEmojis) {
      const bloco = cartasElemento('div', 'sticker-gallery-group');
      bloco.appendChild(cartasElemento('span', 'sticker-gallery-title', '😊 emojis'));
      const grade = cartasElemento('div', 'sticker-gallery-grid sticker-gallery-emojis');
      CARTAS_EMOJIS.forEach((src) => {
        grade.appendChild(cartasCriarBotaoDeAdesivo(src, aoEscolher, { emoji: true, onde }));
      });
      bloco.appendChild(grade);
      galeria.appendChild(bloco);
    }
    destino.appendChild(galeria);
  }

  function cartasRenderizarPaleta() {
    if (!cartasUi.paletaAdesivos) return;
    cartasMontarGaleriaDeAdesivos(cartasUi.paletaAdesivos, {
      onde: 'na cartinha',
      aoEscolher: (src) => {
        cartasAdicionarAdesivo(src);
        playSfx(1120, 0.06);
      },
    });
  }


  function cartasLerCodigoPessoalDoAparelho() {
    try {
      const dado = JSON.parse(localStorage.getItem(CARTA_CHAVE_CODIGO_PESSOAL) || 'null');
      if (!dado || !dado.code) return null;
      return dado;
    } catch (error) {
      return null;
    }
  }

  function cartasGuardarCodigoPessoal(info) {
    if (!info || !info.code) return;
    Cartas.codigoPessoal = info;
    Cartas.codigoPessoalQuando = Date.now();
    Cartas.codigoPessoalErro = '';
    try {
      localStorage.setItem(CARTA_CHAVE_CODIGO_PESSOAL, JSON.stringify({
        code: info.code,
        codeFormatted: info.codeFormatted || cartasFormatarCodigo(info.code),
        alias: info.alias || state.username || '',
      }));
    } catch (error) {   }
  }

  async function cartasCarregarCodigoPessoal({ silent = true, forcar = false } = {}) {
    const api = cartasApi();
    if (!api) {
      Cartas.codigoPessoalErro = 'a nuvem não está configurada nesta cópia do app 🌸';
      if (cartasUi.modal && cartasUi.modal.classList.contains('open')) cartasRenderizar();
      return null;
    }
    const cache = Cartas.codigoPessoal || cartasLerCodigoPessoalDoAparelho();
    if (cache && !Cartas.codigoPessoal) {
      Cartas.codigoPessoal = cache;
      Cartas.codigoPessoalQuando = 0;
    }
    if (!forcar && Cartas.codigoPessoal && Date.now() - Cartas.codigoPessoalQuando < 60 * 60 * 1000) {
      return Cartas.codigoPessoal;
    }
    if (Cartas.codigoPessoalBuscando) return Cartas.codigoPessoal;
    Cartas.codigoPessoalBuscando = true;
    const relogio = setTimeout(() => {
      if (!Cartas.codigoPessoal) {
        Cartas.codigoPessoalErro = 'a nuvem demorou demais pra responder — toca em "tentar de novo"';
        if (cartasUi.modal && cartasUi.modal.classList.contains('open')) cartasRenderizar();
      }
    }, 12000);
    try {
      const dado = await api.lettersMe(state.username || 'alguém');
      if (!dado || !dado.code) {
        throw new Error('a nuvem não devolveu o seu código');
      }
      cartasGuardarCodigoPessoal(dado);
      if (cartasUi.modal && cartasUi.modal.classList.contains('open')) cartasRenderizar();
      return dado;
    } catch (error) {
      Cartas.codigoPessoalErro = cartasRecadoDoErro(error, 'não consegui buscar o seu código agora');
      if (!silent && !Cartas.codigoPessoal) showToast(`💌 ${Cartas.codigoPessoalErro}`, true);
      if (cartasUi.modal && cartasUi.modal.classList.contains('open')) cartasRenderizar();
      return Cartas.codigoPessoal;
    } finally {
      clearTimeout(relogio);
      Cartas.codigoPessoalBuscando = false;
    }
  }

  function cartasBaseDoLink() {
    const nativo = Boolean(
      (window.CrechezinhaNative && window.CrechezinhaNative.isNative)
      || location.protocol === 'capacitor:'
      || location.protocol === 'file:'
    );
    const baseDaApi = String(
      (window.PooftieAPI && window.PooftieAPI.config
        && (window.PooftieAPI.config.activeBaseUrl || window.PooftieAPI.config.baseUrl))
      || window.POFTIE_API_BASE
      || ''
    ).replace(/\/+$/, '');
    if (nativo && baseDaApi) return `${baseDaApi}/`;
    const caminho = location.pathname.replace(/[^/]*$/, '');
    return `${location.origin}${caminho}`;
  }

  function cartasLinkDaCarta(codigo) {
    if (cartasModelo()) return cartasModelo().linkDaCarta(codigo, cartasBaseDoLink());
    return `${cartasBaseDoLink()}#carta=${cartasFormatarCodigo(codigo)}`;
  }

  function cartasLinkDaAmiga(codigo) {
    if (cartasModelo()) return cartasModelo().linkDaAmiga(codigo, cartasBaseDoLink());
    return `${cartasBaseDoLink()}#amiga=${cartasFormatarCodigo(codigo)}`;
  }

  function cartasTextoDeCompartilhar(codigo, apelido) {
    if (cartasModelo()) {
      return cartasModelo().textoParaCompartilhar({
        apelido,
        codigo,
        base: cartasBaseDoLink(),
      });
    }
    return `💌 uma cartinha pra você!\n\ncódigo: ${cartasFormatarCodigo(codigo)}\nabre aqui: ${cartasLinkDaCarta(codigo)}`;
  }

  function cartasRecadoDoErro(error, fallback = 'não consegui agora') {
    if (error && error.status === undefined) {
      return 'sem internet agora — a cartinha fica guardadinha pra quando a conexão voltar 🌧️';
    }
    return (error && error.message) || fallback;
  }

  function cartasDataCurta(valor) {
    const texto = String(valor || '');
    const data = /^\d{4}-\d{2}-\d{2}$/.test(texto)
      ? new Date(`${texto}T12:00:00`)
      : new Date(valor);
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  function cartasFechaEm(valor) {
    const expira = Date.parse(valor);
    if (!Number.isFinite(expira)) return '';
    const dias = Math.ceil((expira - Date.now()) / (24 * 60 * 60 * 1000));
    if (dias <= 0) return 'fechada';
    return dias === 1 ? 'fecha em 1 dia' : `fecha em ${dias} dias`;
  }

  function cartasElemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  function cartasBotao(texto, classe, aoClicar) {
    const botao = cartasElemento('button', classe || 'letter-mini-btn', texto);
    botao.type = 'button';
    if (typeof aoClicar === 'function') botao.addEventListener('click', aoClicar);
    return botao;
  }

  function cartasAtualizarBadge(numero) {
    const locais = cartasLerAbertas().length;
    const n = Math.max(0, Math.trunc(Number(numero) || 0)) + locais;
    if (cartasUi.badge) {
      cartasUi.badge.textContent = n > 99 ? '99+' : String(n);
      cartasUi.badge.hidden = n <= 0;
    }
    if (cartasUi.contadorRecebidas) {
      cartasUi.contadorRecebidas.textContent = n > 99 ? '99+' : String(n);
      cartasUi.contadorRecebidas.hidden = n <= 0;
    }
  }

  function cartasLerCodigos() {
    try {
      const dado = JSON.parse(localStorage.getItem(CARTA_CHAVE_CODIGOS) || '{}');
      return dado && typeof dado === 'object' && !Array.isArray(dado) ? dado : {};
    } catch (error) {
      return {};
    }
  }

  function cartasGuardarCodigos(mapa) {
    try {
      localStorage.setItem(CARTA_CHAVE_CODIGOS, JSON.stringify(mapa || {}));
    } catch (error) {   }
  }

  function cartasLembrarCodigo(id, info) {
    if (!id) return;
    const mapa = cartasLerCodigos();
    mapa[id] = { ...info, id };
    const chaves = Object.keys(mapa);
    if (chaves.length > 60) {
      chaves.slice(0, chaves.length - 60).forEach((chave) => delete mapa[chave]);
    }
    cartasGuardarCodigos(mapa);
  }

  function cartasLerPendente() {
    try {
      const dado = JSON.parse(sessionStorage.getItem(CARTA_CHAVE_PENDENTE) || 'null');
      return dado && (dado.carta || dado.amiga) ? dado : null;
    } catch (error) {
      return null;
    }
  }

  function cartasGuardarPendente(pendente) {
    try {
      if (!pendente) sessionStorage.removeItem(CARTA_CHAVE_PENDENTE);
      else sessionStorage.setItem(CARTA_CHAVE_PENDENTE, JSON.stringify(pendente));
    } catch (error) {   }
  }


  function cartasNormalizarAberta(item) {
    if (!item || typeof item !== 'object') return null;
    const carta = item.letter || item.carta;
    if (!carta || typeof carta !== 'object') return null;
    const pagina = carta.payload && carta.payload.page;
    if (!pagina || typeof pagina !== 'object') return null;
    if (!carta.id) return null;
    return {
      letter: {
        id: String(carta.id),
        art: cartasModelo() ? cartasModelo().arteDaCarta(carta.art) : (carta.art || 'letter1'),
        senderAlias: String(carta.senderAlias || 'alguém').slice(0, 32),
        senderIcon: cartasNormalizarIcone(carta.senderIcon || (carta.payload && carta.payload.icon), ''),
        payload: carta.payload,
      },
      openedAt: String(item.openedAt || item.abertaEm || new Date().toISOString()),
    };
  }

  function cartasLerAbertas() {
    const cru = lerDoDiario(CARTA_CHAVE_ABERTAS, []);
    const lista = Array.isArray(cru) ? cru : [];
    return lista.map(cartasNormalizarAberta).filter(Boolean).slice(0, 60);
  }

  function cartasGuardarAbertas(lista) {
    return guardarNoDiario(CARTA_CHAVE_ABERTAS, JSON.stringify(Array.isArray(lista) ? lista : []));
  }

  function cartasAbertaPorId(letterId) {
    return cartasLerAbertas().find((item) => item.letter.id === String(letterId)) || null;
  }

  function cartasRegistrarAberta(letter) {
    if (!letter || !letter.id) return null;
    const info = cartasPaginaDaCarta(letter);
    if (!info) return null;
    const registro = {
      letter: {
        id: String(letter.id),
        art: info.pagina.letterArt || cartasModelo()?.arteDaCarta(letter.art) || 'letter1',
        senderAlias: String(letter.senderAlias || 'alguém').slice(0, 32),
        senderIcon: cartasNormalizarIcone(letter.senderIcon || (letter.payload && letter.payload.icon), ''),
        payload: { ...(letter.payload || {}), page: info.pagina },
      },
      openedAt: new Date().toISOString(),
    };
    const lista = cartasLerAbertas().filter((item) => item.letter.id !== registro.letter.id);
    lista.unshift(registro);
    cartasGuardarAbertas(lista);
    cartasLembrarIconeDoRemetente(registro.letter.senderAlias, registro.letter.senderIcon);
    return registro;
  }

  function cartasRemoverAberta(letterId) {
    if (!letterId) return;
    const lista = cartasLerAbertas().filter((item) => item.letter.id !== String(letterId));
    cartasGuardarAbertas(lista);
  }

  async function cartasCopiar(texto, recado) {
    const valor = String(texto || '');
    if (!valor) return false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(valor);
      } else {
        cartasCopiarNaMarra(valor);
      }
      showToast(recado || '📋 copiado!');
      return true;
    } catch (error) {
      const copiou = cartasCopiarNaMarra(valor);
      if (copiou) showToast(recado || '📋 copiado!');
      else showToast('não consegui copiar — seleciona e copia na mão 🌸', true);
      return copiou;
    }
  }

  function cartasCopiarNaMarra(texto) {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      area.style.top = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (error) {
      return false;
    }
  }

  function cartasMostrarCarregando() {
    if (cartasUi.carregando) cartasUi.carregando.hidden = false;
    if (cartasUi.painel) cartasUi.painel.hidden = true;
  }

  function cartasTextoVazio(emoji, titulo, texto, acao) {
    const caixa = cartasElemento('div', 'letters-empty');
    caixa.appendChild(cartasElemento('span', 'letters-empty-emoji', emoji));
    caixa.appendChild(cartasElemento('span', 'letters-empty-title', titulo));
    caixa.appendChild(cartasElemento('p', 'letters-empty-text', texto));
    if (acao) {
      const linha = cartasElemento('div', 'letters-empty-acao');
      const botao = cartasBotao(acao.texto, 'letter-mini-btn primary', acao.aoClicar);
      linha.appendChild(botao);
      caixa.appendChild(linha);
    }
    return caixa;
  }

  function cartasCaixaDeCodigo() {
    const caixa = cartasElemento('div', 'letter-open-code');
    caixa.appendChild(cartasElemento('span', 'letter-open-code-title', '💌 tenho um código'));
    caixa.appendChild(cartasElemento(
      'p',
      'letter-open-code-text',
      'digita o código de 8 letras que veio no link ou no WhatsApp — a cartinha abre aqui ♡',
    ));
    const linha = cartasElemento('div', 'letter-add-friend');
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.maxLength = 9;
    campo.placeholder = 'ABCD-EFGH';
    campo.setAttribute('aria-label', 'código da cartinha');
    campo.autocomplete = 'off';
    campo.spellcheck = false;
    campo.addEventListener('input', () => {
      campo.value = campo.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
    });
    campo.addEventListener('blur', () => {
      const codigo = campo.value.replace(/[^0-9A-Z]/g, '');
      if (codigo.length === 8) campo.value = cartasFormatarCodigo(codigo);
    });
    const abrir = () => {
      const codigo = campo.value;
      const valido = cartasModelo() && typeof cartasModelo().codigoValido === 'function'
        ? cartasModelo().codigoValido(codigo)
        : String(codigo).replace(/[^0-9A-Z]/gi, '').length === 8;
      if (!valido) {
        showToast('o código tem 8 letras/números (sem O, 0, I ou 1) 🌸', true);
        campo.focus();
        return;
      }
      cartasAbrirPorCodigo(codigo);
    };
    campo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        abrir();
      }
    });
    linha.append(campo, cartasBotao('abrir 💌', 'letter-mini-btn primary', abrir));
    caixa.appendChild(linha);
    return caixa;
  }

  function cartasMeuCodigoAtual() {
    return Cartas.codigoPessoal || cartasLerCodigoPessoalDoAparelho();
  }

  function cartasCaixaDoMeuCodigo({ compacto = false } = {}) {
    const meu = cartasMeuCodigoAtual();

    if (compacto) {
      const linha = cartasElemento('div', 'letter-my-code-mini');
      const meuIcone = cartasElemento('button', 'letter-my-icon-mini', '');
      meuIcone.type = 'button';
      meuIcone.title = 'trocar o meu icon';
      meuIcone.setAttribute('aria-label', 'trocar o meu icon');
      meuIcone.appendChild(cartasCriarIcone(cartasLerMeuIcone()));
      meuIcone.addEventListener('click', () => cartasAbrirEscolhedorDeIcone({ tipo: 'meu' }));
      linha.appendChild(meuIcone);
      const rotulo = cartasElemento('span', 'letter-my-code-mini-label', 'seu código pessoal:');
      linha.appendChild(rotulo);
      if (meu) {
        linha.appendChild(cartasElemento('b', 'letter-my-code-mini-code', meu.codeFormatted || cartasFormatarCodigo(meu.code)));
        linha.appendChild(cartasBotao('copiar', 'letter-mini-btn', () => {
          cartasCopiar(meu.codeFormatted || meu.code, '💌 seu código copiado!');
        }));
      } else {
        linha.appendChild(cartasElemento(
          'span',
          'letter-my-code-mini-pending',
          Cartas.codigoPessoalErro ? 'sem internet agora 🌧️' : 'preparando…',
        ));
      }
      linha.appendChild(cartasBotao('ver amigas', 'letter-mini-btn', () => cartasTrocarAba('friends')));
      return linha;
    }

    const caixa = cartasElemento('div', 'letter-invite-box letter-my-code-box');
    caixa.appendChild(cartasElemento('span', 'letter-invite-title', '💌 seu código pessoal'));
    caixa.appendChild(cartasElemento(
      'p',
      'letter-invite-text',
      'não precisa criar nada: esse código já é seu, pra sempre. Manda pra alguém que você quer que mande cartinhas direto pra sua caixinha. Quem colar o seu código vira sua amiga. ✧',
    ));

    const iconeLinha = cartasElemento('div', 'letter-my-icon-row');
    const iconeBotao = cartasElemento('button', 'letter-my-icon-big');
    iconeBotao.type = 'button';
    iconeBotao.title = 'trocar o meu icon';
    iconeBotao.setAttribute('aria-label', 'trocar o meu icon');
    iconeBotao.appendChild(cartasCriarIcone(cartasLerMeuIcone()));
    iconeBotao.addEventListener('click', () => cartasAbrirEscolhedorDeIcone({ tipo: 'meu' }));
    iconeLinha.appendChild(iconeBotao);
    const iconeInfo = cartasElemento('div', 'letter-my-icon-info');
    iconeInfo.appendChild(cartasElemento('span', 'letter-my-icon-title', 'o seu icon de amizade'));
    iconeInfo.appendChild(cartasElemento('span', 'letter-my-icon-sub', 'é essa carinha que aparece do seu lado nas cartinhas ♡'));
    iconeLinha.appendChild(iconeInfo);
    iconeLinha.appendChild(cartasBotao('trocar', 'letter-mini-btn', () => {
      cartasAbrirEscolhedorDeIcone({ tipo: 'meu' });
    }));
    caixa.appendChild(iconeLinha);

    if (meu) {
      caixa.appendChild(cartasElemento('span', 'letter-invite-code', meu.codeFormatted || cartasFormatarCodigo(meu.code)));
      const acoes = cartasElemento('div', 'letter-invite-actions');
      acoes.appendChild(cartasBotao('copiar código', 'letter-mini-btn', () => {
        cartasCopiar(meu.codeFormatted || meu.code, '💌 seu código copiado!');
      }));
      acoes.appendChild(cartasBotao('copiar link', 'letter-mini-btn', () => {
        cartasCopiar(cartasLinkDaAmiga(meu.code), '🔗 link do convite copiado!');
      }));
      const whats = document.createElement('a');
      whats.className = 'letter-mini-btn';
      whats.href = `https://wa.me/?text=${encodeURIComponent(cartasTextoDeCompartilharGrande(meu.code))}`;
      whats.target = '_blank';
      whats.rel = 'noopener';
      whats.textContent = 'WhatsApp';
      acoes.appendChild(whats);
      caixa.appendChild(acoes);
    } else {
      caixa.appendChild(cartasElemento(
        'span',
        'letter-invite-code letter-invite-code-pending',
        Cartas.codigoPessoalErro ? 'sem internet agora 🌧️' : 'buscando seu código…',
      ));
      if (Cartas.codigoPessoalErro) {
        caixa.appendChild(cartasElemento('p', 'letter-hint', Cartas.codigoPessoalErro));
      }
      caixa.appendChild(cartasBotao('tentar de novo', 'letter-mini-btn primary', () => {
        cartasCarregarCodigoPessoal({ silent: false, forcar: true });
      }));
    }

    const adicionar = cartasElemento('div', 'letter-add-friend');
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.maxLength = 9;
    campo.placeholder = 'código da amiga';
    campo.setAttribute('aria-label', 'código de amiga');
    campo.addEventListener('input', () => {
      campo.value = campo.value.toUpperCase().replace(/[^0-9A-Z-]/g, '').slice(0, 9);
    });
    const botao = cartasBotao('adicionar ♡', 'letter-mini-btn primary', () => {
      const codigo = campo.value;
      if (!codigo.trim()) {
        showToast('escreve o código da sua amiga primeiro 🌸', true);
        return;
      }
      cartasAceitarConvite(codigo, { abrir: true });
    });
    adicionar.append(campo, botao);
    caixa.appendChild(adicionar);
    return caixa;
  }

  function cartasRenderizarAbertas(painel) {
    const abertas = cartasLerAbertas();
    if (!abertas.length) return;
    const caixa = cartasElemento('div', 'letter-open-box');
    caixa.appendChild(cartasElemento('span', 'letter-open-box-title', '💌 cartinhas abertas esperando um cantinho'));
    caixa.appendChild(cartasElemento(
      'p',
      'letter-open-box-text',
      'elas já abriram, mas ainda não escolheram se vão pro diário ou pro mural. Tocinha numa pra decidir ♡',
    ));

    abertas.forEach((item) => {
      const carta = item.letter;
      const pagina = carta.payload && carta.payload.page ? carta.payload.page : {};
      const linha = cartasElemento('div', 'letter-open-item');
      linha.appendChild(cartasCriarIcone(
        carta.senderIcon || cartasIconeDoAlias(carta.senderAlias),
        'letter-open-item-icon',
      ));
      const info = cartasElemento('div', 'letter-open-item-info');
      info.appendChild(cartasElemento('span', 'letter-open-item-title', `carta de ${carta.senderAlias || 'alguém'}`));
      const resumo = String(pagina.title || pagina.body || '').replace(/\s+/g, ' ').trim();
      info.appendChild(cartasElemento(
        'span',
        'letter-open-item-sub',
        resumo ? (resumo.length > 58 ? `${resumo.slice(0, 58)}…` : resumo) : 'uma cartinha com enfeites ⋆',
      ));
      linha.appendChild(info);

      const acoes = cartasElemento('div', 'letter-open-item-actions');
      acoes.appendChild(cartasBotao('ler', 'letter-mini-btn', () => {
        muralAbrirLeitor({ letter: carta, origem: 'aberta' });
      }));
      acoes.appendChild(cartasBotao('📖 diário', 'letter-mini-btn', () => {
        cartasEscolherDestinoDaAberta(carta, 'diario');
      }));
      acoes.appendChild(cartasBotao('📌 mural', 'letter-mini-btn primary', () => {
        cartasEscolherDestinoDaAberta(carta, 'mural');
      }));
      linha.appendChild(acoes);
      caixa.appendChild(linha);
    });
    painel.appendChild(caixa);
  }

  function cartasRenderizarRecebidas(painel) {
    painel.appendChild(cartasCaixaDoMeuCodigo({ compacto: true }));
    painel.appendChild(cartasCaixaDeCodigo());
    cartasRenderizarAbertas(painel);
    const lista = (Cartas.dados && Cartas.dados.inbox && Cartas.dados.inbox.letters) || [];
    if (!lista.length) {
      painel.appendChild(cartasTextoVazio(
        '💌',
        'nenhuma cartinha esperando',
        'quando alguém te mandar uma, ela aparece aqui com o envelope escolhido. Você também pode escrever a primeira! ♡',
        { texto: '✎ escrever uma carta', aoClicar: cartasAbrirCompose },
      ));
      return;
    }

    const listaEl = cartasElemento('div', 'letters-list');
    lista.forEach((carta) => {
      const item = cartasElemento('div', 'letter-item is-fresh');
      const envelope = cartasElemento('button', 'letter-item-envelope');
      envelope.type = 'button';
      envelope.title = 'abrir a cartinha';
      const img = document.createElement('img');
      img.src = cartasSrcDaArte(carta.art);
      img.alt = 'envelope da cartinha';
      img.loading = 'lazy';
      envelope.appendChild(img);
      envelope.addEventListener('click', () => {
        cartasAbrirEnvelope({
          id: carta.id,
          art: carta.art,
          senderAlias: carta.senderAlias,
        });
      });

      const info = cartasElemento('div', 'letter-item-info');
      const tituloLinha = cartasElemento('span', 'letter-item-title-row');
      tituloLinha.appendChild(cartasCriarIcone(cartasIconeDoAlias(carta.senderAlias), 'letter-item-avatar'));
      tituloLinha.appendChild(cartasElemento('span', 'letter-item-title', `carta de ${carta.senderAlias || 'alguém'}`));
      info.appendChild(tituloLinha);
      const quando = cartasDataCurta(carta.createdAt);
      info.appendChild(cartasElemento('span', 'letter-item-sub', `chegou ${quando || 'agorinha'} · ${cartasFechaEm(carta.expiresAt)}`));

      const acoes = cartasElemento('div', 'letter-item-actions');
      acoes.appendChild(cartasBotao('abrir 💌', 'letter-mini-btn primary', () => {
        cartasAbrirEnvelope({ id: carta.id, art: carta.art, senderAlias: carta.senderAlias });
      }));

      item.append(envelope, info, acoes);
      listaEl.appendChild(item);
    });
    painel.appendChild(listaEl);
  }

  function cartasRenderizarEnviadas(painel) {
    const lista = (Cartas.dados && Cartas.dados.sent && Cartas.dados.sent.letters) || [];
    if (!lista.length) {
      painel.appendChild(cartasTextoVazio(
        '🕊️',
        'nenhuma cartinha enviada ainda',
        'escolhe um envelope, uma página e manda uma cartinha pra alguém especial ⋆ ˚｡⋆',
        { texto: '💌 escrever carta', aoClicar: cartasAbrirCompose },
      ));
      return;
    }

    const codigos = cartasLerCodigos();
    const listaEl = cartasElemento('div', 'letters-list');
    lista.forEach((carta) => {
      const estado = cartasModelo()
        ? cartasModelo().estadoDaCarta(carta)
        : { chave: carta.openedAt ? 'aberta' : 'aguardando', rotulo: carta.openedAt ? 'aberta 💌' : 'ainda não aberta ⏳' };
      const codigo = codigos[carta.id] || null;

      const item = cartasElemento('div', 'letter-item');
      const envelope = cartasElemento('div', 'letter-item-envelope');
      const img = document.createElement('img');
      img.src = cartasSrcDaArte(carta.art);
      img.alt = '';
      img.loading = 'lazy';
      envelope.appendChild(img);

      const info = cartasElemento('div', 'letter-item-info');
      const tituloLinha = cartasElemento('span', 'letter-item-title-row');
      if (carta.recipientAlias) {
        tituloLinha.appendChild(cartasCriarIcone(cartasIconeDoAlias(carta.recipientAlias), 'letter-item-avatar'));
      } else {
        tituloLinha.appendChild(cartasCriarIcone('🔗', 'letter-item-avatar letter-item-avatar-code'));
      }
      tituloLinha.appendChild(cartasElemento(
        'span',
        'letter-item-title',
        carta.recipientAlias ? `para ${carta.recipientAlias}` : 'por código/link',
      ));
      info.appendChild(tituloLinha);
      const detalhes = cartasElemento('span', 'letter-item-sub');
      detalhes.appendChild(document.createTextNode(`mandada ${cartasDataCurta(carta.createdAt) || 'agorinha'}`));
      detalhes.appendChild(document.createTextNode(' · '));
      detalhes.appendChild(cartasElemento('span', `letter-status ${estado.chave}`, estado.rotulo));
      info.appendChild(detalhes);

      if (codigo) {
        const chip = cartasElemento('button', 'letter-code-chip', `${codigo.codeFormatted || cartasFormatarCodigo(codigo.code)} · copiar`);
        chip.type = 'button';
        chip.title = 'copiar o código da cartinha';
        chip.addEventListener('click', () => cartasCopiar(codigo.codeFormatted || codigo.code, '💌 código copiado!'));
        info.appendChild(chip);
      }

      const acoes = cartasElemento('div', 'letter-item-actions');
      if (codigo) {
        acoes.appendChild(cartasBotao('compartilhar', 'letter-mini-btn', () => cartasCompartilharEnviada(carta.id)));
      }
      if (estado.chave === 'aguardando') {
        acoes.appendChild(cartasBotao('cancelar', 'letter-mini-btn danger', () => cartasCancelar(carta.id)));
      }

      item.append(envelope, info, acoes);
      listaEl.appendChild(item);
    });
    painel.appendChild(listaEl);
  }

  function cartasRenderizarAmigas(painel) {
    const amigos = (Cartas.dados && Cartas.dados.friends && Cartas.dados.friends.friends) || [];
    painel.appendChild(cartasCaixaDoMeuCodigo());

    if (!amigos.length) {
      painel.appendChild(cartasTextoVazio(
        '🌷',
        'sua listinha está vazia',
        'cola o código de alguém no campinho acima — ou manda o seu pra pessoa te adicionar. Aí vocês aparecem na listinha um do outro. ♡',
      ));
      return;
    }

    const listaEl = cartasElemento('div', 'letters-list');
    amigos.forEach((amiga) => {
      const item = cartasElemento('div', 'letter-friend');
      const avatar = cartasElemento('button', 'letter-friend-avatar');
      avatar.type = 'button';
      avatar.title = 'trocar o icon da amiga';
      avatar.setAttribute('aria-label', `trocar o icon de ${amiga.alias || 'sua amiga'}`);
      avatar.appendChild(cartasCriarIcone(cartasIconeDaAmiga(amiga)));
      avatar.appendChild(cartasElemento('span', 'letter-friend-avatar-edit', '✎'));
      avatar.addEventListener('click', () => cartasAbrirEscolhedorDeIcone({ tipo: 'amiga', amiga }));
      item.appendChild(avatar);
      const info = cartasElemento('div', 'letter-friend-name');
      info.appendChild(document.createTextNode(amiga.alias || 'amiga'));
      info.appendChild(cartasElemento('span', 'letter-friend-since', `amigas desde ${cartasDataCurta(amiga.since) || 'agorinha'}`));
      item.appendChild(info);
      const acoes = cartasElemento('div', 'letter-friend-actions');
      acoes.appendChild(cartasBotao('💌 carta', 'letter-mini-btn primary', () => {
        cartasFecharCaixinha();
        cartasAbrirCompose({ destino: 'friend', amigaId: amiga.id });
      }));
      acoes.appendChild(cartasBotao('desfazer', 'letter-mini-btn danger', () => cartasRemoverAmiga(amiga.id, amiga.alias)));
      item.appendChild(acoes);
      listaEl.appendChild(item);
    });
    painel.appendChild(listaEl);
  }

  function cartasTextoDeCompartilharGrande(codigo) {
    const link = cartasLinkDaAmiga(codigo);
    return `💌 vamos ser amigas no diário?\n\ncódigo: ${cartasFormatarCodigo(codigo)}\n${link}\n\n(entra no app e toca em "cartinhas" → "amigas" → cola esse código ♡)`;
  }

  function cartasRenderizar() {
    if (!cartasUi.painel) return;
    if (cartasUi.carregando) cartasUi.carregando.hidden = true;
    cartasUi.painel.hidden = false;
    cartasUi.painel.innerHTML = '';

    cartasUi.abas.forEach((aba) => {
      const ativa = aba.dataset.letterTab === Cartas.aba;
      aba.classList.toggle('active', ativa);
      aba.setAttribute('aria-selected', ativa ? 'true' : 'false');
    });

    if (cartasUi.subtitulo) {
      cartasUi.subtitulo.textContent = Cartas.aba === 'sent'
        ? 'as cartinhas que você já soltou no mundo ⋆'
        : Cartas.aba === 'friends'
          ? 'amigas pra mandar cartinhas direto na caixinha ⋆'
          : 'pequenas cartas que chegam de mansinho ⋆ ˚｡⋆';
    }

    if (Cartas.erro && !Cartas.dados) {
      cartasRenderizarAbertas(cartasUi.painel);
      cartasUi.painel.appendChild(cartasTextoVazio(
        '🌧️',
        'não consegui abrir a caixinha',
        Cartas.erro,
        { texto: 'tentar de novo', aoClicar: () => cartasCarregar() },
      ));
      return;
    }

    if (Cartas.aba === 'sent') cartasRenderizarEnviadas(cartasUi.painel);
    else if (Cartas.aba === 'friends') cartasRenderizarAmigas(cartasUi.painel);
    else cartasRenderizarRecebidas(cartasUi.painel);
  }

  async function cartasCarregar({ silent = false } = {}) {
    const api = cartasApi();
    if (!api) {
      Cartas.erro = 'a nuvem não está configurada nesta cópia do app 🌸';
      cartasRenderizar();
      if (!silent) showToast(Cartas.erro, true);
      return false;
    }
    if (Cartas.carregando) return false;
    Cartas.carregando = true;
    Cartas.erro = '';
    if (!silent) cartasMostrarCarregando();
    try {
      const dados = await api.letters();
      Cartas.dados = dados || null;
      const total = (dados && dados.inbox && dados.inbox.count)
        || (dados && dados.inbox && dados.inbox.letters && dados.inbox.letters.length)
        || 0;
      cartasAtualizarBadge(total);
      return true;
    } catch (error) {
      Cartas.erro = cartasRecadoDoErro(error, 'não consegui falar com a nuvem agora');
      if (!silent) showToast(`💌 ${Cartas.erro}`, true);
      return false;
    } finally {
      Cartas.carregando = false;
      cartasRenderizar();
    }
  }

  function cartasAbrirCaixinha(aba) {
    if (aba) Cartas.aba = aba;
    if (cartasUi.modal) cartasUi.modal.classList.add('open');
    cartasRenderizar();
    cartasCarregar({ silent: Boolean(Cartas.dados) });
    cartasCarregarCodigoPessoal({ silent: true });
    playSfx(1000, 0.1);
  }

  function cartasFecharCaixinha() {
    if (cartasUi.modal) cartasUi.modal.classList.remove('open');
  }

  function cartasTrocarAba(aba) {
    if (!['received', 'sent', 'friends'].includes(aba)) return;
    Cartas.aba = aba;
    cartasRenderizar();
    if (aba === 'friends') {
      if (!Cartas.dados) cartasCarregar({ silent: true });
      cartasCarregarCodigoPessoal({ silent: true });
    }
  }

  async function cartasCancelar(id) {
    const api = cartasApi();
    if (!api || !id) return;
    if (!confirm('cancelar essa cartinha? ela não vai mais poder ser aberta. 🌧️')) return;
    try {
      await api.lettersCancel(id);
      const mapa = cartasLerCodigos();
      delete mapa[id];
      cartasGuardarCodigos(mapa);
      showToast('🍂 cartinha cancelada');
      await cartasCarregar({ silent: true });
    } catch (error) {
      showToast(`não consegui cancelar: ${cartasRecadoDoErro(error)}`, true);
    }
  }

  async function cartasAceitarConvite(codigo, { abrir = false } = {}) {
    const api = cartasApi();
    if (!api) {
      showToast('a nuvem não está configurada nesta cópia 🌸', true);
      return false;
    }
    const codigoLimpo = String(codigo || '').trim();
    if (!codigoLimpo) return false;
    try {
      const dados = await api.lettersAcceptInvite(codigoLimpo, state.username || 'alguém');
      const apelido = (dados && dados.friend && dados.friend.alias) || 'sua amiga';
      const pendente = cartasLerPendente();
      if (pendente && pendente.amiga) cartasGuardarPendente(null);
      showToast(`💌 agora você e ${apelido} são amigas!`);
      await cartasCarregar({ silent: true });
      if (abrir) cartasAbrirCaixinha('friends');
      return true;
    } catch (error) {
      showToast(`não consegui aceitar o convite: ${cartasRecadoDoErro(error)}`, true);
      return false;
    }
  }

  async function cartasRemoverAmiga(id, alias) {
    const api = cartasApi();
    if (!api || !id) return;
    if (!confirm(`desfazer a amizade com ${alias || 'essa pessoa'}? as cartinhas que já chegaram ficam no diário.`)) return;
    try {
      await api.lettersRemoveFriend(id);
      showToast('amizade desfeita — sem drama, as memórias ficam ♡');
      await cartasCarregar({ silent: true });
    } catch (error) {
      showToast(`não consegui desfazer: ${error.message}`, true);
    }
  }

  function cartasCompartilharEnviada(id) {
    const info = cartasLerCodigos()[id];
    if (!info) {
      showToast('o código dessa cartinha não está neste aparelho 🌧️', true);
      return;
    }
    cartasMostrarCompartilhar({
      code: info.code,
      codeFormatted: info.codeFormatted,
      art: info.art,
      letter: { id },
    });
  }

  function cartasMostrarCompartilhar({ code, codeFormatted, art, letter } = {}) {
    const codigo = codeFormatted || cartasFormatarCodigo(code);
    const link = cartasLinkDaCarta(code);
    const texto = cartasTextoDeCompartilhar(code, state.username || '');
    Cartas.compartilhar = { code, codigo, link, texto };

    if (cartasUi.shareCode) cartasUi.shareCode.textContent = codigo;
    if (cartasUi.shareLink) cartasUi.shareLink.value = link;
    if (cartasUi.shareText) cartasUi.shareText.value = texto;
    if (cartasUi.shareArt) cartasUi.shareArt.src = cartasSrcDaArte(art);
    if (cartasUi.shareWhats) {
      cartasUi.shareWhats.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    }
    if (cartasUi.compartilhar) cartasUi.compartilhar.classList.add('open');

    if (letter && letter.id) {
      cartasLembrarCodigo(letter.id, {
        code,
        codeFormatted: codigo,
        art: art || 'letter1',
        link,
        texto,
        createdAt: new Date().toISOString(),
      });
    }
  }

  function cartasFecharCompartilhar() {
    if (cartasUi.compartilhar) cartasUi.compartilhar.classList.remove('open');
  }


  function cartasRenderizarArtes() {
    if (!cartasUi.artes) return;
    cartasUi.artes.innerHTML = '';
    const artes = cartasModelo() ? cartasModelo().ARTES : Array.from({ length: 15 }, (_, i) => `letter${i + 1}`);
    artes.forEach((art) => {
      const botao = cartasElemento('button', 'letter-art-option' + (art === Cartas.art ? ' is-escolhida' : ''));
      botao.type = 'button';
      botao.setAttribute('role', 'radio');
      botao.setAttribute('aria-checked', art === Cartas.art ? 'true' : 'false');
      botao.title = `escolher o envelope ${art.replace('letter', '')}`;
      const img = document.createElement('img');
      img.src = cartasSrcDaArte(art);
      img.alt = `envelope ${art.replace('letter', '')}`;
      img.loading = 'lazy';
      botao.appendChild(img);
      botao.appendChild(cartasElemento('span', 'letter-art-check', '✓'));
      botao.addEventListener('click', () => {
        Cartas.art = art;
        cartasRenderizarArtes();
        cartasAtualizarPrevia();
        playSfx(1080, 0.06);
      });
      cartasUi.artes.appendChild(botao);
    });
  }

  function cartasPaginaEscolhida() {
    if (Cartas.fonte !== 'page') return null;
    const id = cartasUi.paginaSelect ? cartasUi.paginaSelect.value : '';
    return Cartas.paginas.find((pagina) => pagina.id === id) || null;
  }

  function cartasPreencherPaginas() {
    if (!cartasUi.paginaSelect) return;
    Cartas.paginas = lerTodasAsPaginas()
      .filter((pagina) => pagina && pagina.id)
      .slice(0, 200);
    cartasUi.paginaSelect.innerHTML = '';
    if (!Cartas.paginas.length) {
      const opcao = document.createElement('option');
      opcao.value = '';
      opcao.textContent = 'nenhuma página ainda — escreve uma cartinha';
      cartasUi.paginaSelect.appendChild(opcao);
      cartasUi.paginaSelect.disabled = true;
      if (cartasUi.paginaDica) cartasUi.paginaDica.textContent = 'seu diário ainda está em branco: escolhe "escrever uma cartinha" e capricha ♡';
      return;
    }
    cartasUi.paginaSelect.disabled = false;
    Cartas.paginas.forEach((pagina) => {
      const opcao = document.createElement('option');
      opcao.value = pagina.id;
      const rotulo = cartasDataCurta(pagina.date || '') || pagina.date || '';
      const resumo = cartasModelo() ? cartasModelo().resumoDaPagina(pagina) : (pagina.title || '');
      opcao.textContent = `${rotulo} — ${resumo}`.trim();
      cartasUi.paginaSelect.appendChild(opcao);
    });
    if (cartasUi.paginaDica) cartasUi.paginaDica.textContent = 'a página viaja com os adesivos, os textinhos e a corzinha dela ⋆';
  }

  function cartasPreencherDestinos() {
    if (!cartasUi.amigosPicker) return;
    const amigos = (Cartas.dados && Cartas.dados.friends && Cartas.dados.friends.friends) || [];
    if (Cartas.amigaEscolhida && !amigos.some((amiga) => amiga.id === Cartas.amigaEscolhida)) {
      Cartas.amigaEscolhida = '';
    }
    if (!Cartas.amigaEscolhida && amigos.length) Cartas.amigaEscolhida = amigos[0].id;

    cartasUi.amigosPicker.innerHTML = '';
    if (!amigos.length) {
      const vazio = cartasElemento('div', 'letter-friend-picker-empty');
      vazio.appendChild(cartasElemento('span', 'letter-friend-picker-emoji', '🌷'));
      vazio.appendChild(cartasElemento(
        'span',
        '',
        'sua listinha de amigas ainda está vazia — mas dá pra mandar por código agora mesmo. ♡',
      ));
      vazio.appendChild(cartasBotao('💌 ir pra amigas', 'letter-mini-btn', () => {
        cartasFecharCompose();
        cartasAbrirCaixinha('friends');
      }));
      cartasUi.amigosPicker.appendChild(vazio);
    } else {
      amigos.forEach((amiga) => {
        const escolhida = amiga.id === Cartas.amigaEscolhida;
        const botao = cartasElemento('button', 'letter-friend-chip' + (escolhida ? ' is-escolhida' : ''));
        botao.type = 'button';
        botao.title = `mandar a carta pra ${amiga.alias || 'minha amiga'}`;
        botao.setAttribute('aria-pressed', escolhida ? 'true' : 'false');
        botao.appendChild(cartasCriarIcone(cartasIconeDaAmiga(amiga), 'letter-friend-chip-icon'));
        botao.appendChild(cartasElemento('span', 'letter-friend-chip-name', amiga.alias || 'amiga'));
        botao.appendChild(cartasElemento('span', 'letter-friend-chip-check', '✓'));
        botao.addEventListener('click', () => {
          Cartas.amigaEscolhida = amiga.id;
          cartasPreencherDestinos();
          playSfx(1080, 0.05);
        });
        cartasUi.amigosPicker.appendChild(botao);
      });
    }
    cartasAtualizarDestino();
  }

  function cartasAtualizarDestino() {
    const modo = Cartas.destinoModo === 'friend' ? 'friend' : 'code';
    if (cartasUi.destinoCodigo) cartasUi.destinoCodigo.hidden = modo !== 'code';
    if (cartasUi.destinoAmigas) cartasUi.destinoAmigas.hidden = modo !== 'friend';
    cartasUi.destinoAbas.forEach((aba) => {
      const ativa = aba.dataset.letterDest === modo;
      aba.classList.toggle('active', ativa);
      aba.setAttribute('aria-selected', ativa ? 'true' : 'false');
    });
    const amigos = (Cartas.dados && Cartas.dados.friends && Cartas.dados.friends.friends) || [];
    const amiga = amigos.find((item) => item.id === Cartas.amigaEscolhida) || null;
    if (cartasUi.destinoAmigaDica) {
      cartasUi.destinoAmigaDica.textContent = amiga
        ? `a cartinha vai direto pra caixinha de ${amiga.alias || 'sua amiga'} ♡`
        : (amigos.length
          ? 'toca na sua amiga e a carta cai direto na caixinha dela ♡'
          : 'sem amigas na listinha ainda — manda por código que dá certo do mesmo jeito ✧');
    }
    if (cartasUi.destinoDica) {
      cartasUi.destinoDica.textContent = 'no fim, a cartinha vira um código de 8 letras e um link — manda pra quem você quiser. ✧';
    }
  }

  function cartasAtualizarFonte() {
    const pagina = Cartas.fonte === 'page';
    if (cartasUi.fontePagina) cartasUi.fontePagina.hidden = !pagina;
    if (cartasUi.fonteNova) cartasUi.fonteNova.hidden = pagina;
    document.querySelectorAll('[data-letter-only="new"]').forEach((item) => {
      item.hidden = pagina;
    });
    cartasUi.fonteAbas.forEach((aba) => {
      const ativa = aba.dataset.letterSource === Cartas.fonte;
      aba.classList.toggle('active', ativa);
      aba.setAttribute('aria-selected', ativa ? 'true' : 'false');
    });
    cartasAplicarEstiloDaPagina();
    cartasAtualizarPrevia();
  }

  function cartasAtualizarPrevia() {
    if (!cartasUi.previa) return;
    const pagina = cartasPaginaEscolhida();
    const ehNova = Cartas.fonte === 'new';
    const titulo = ehNova
      ? ((cartasUi.titulo && cartasUi.titulo.value.trim()) || 'uma cartinha novinha')
      : (pagina ? (pagina.title || cartasModelo()?.resumoDaPagina(pagina) || 'uma página do diário') : 'escolhe uma página');
    let texto = '';
    if (ehNova) {
      texto = (cartasUi.texto && cartasUi.texto.value.trim()) || 'escreve alguma coisinha (ou cola uma foto) ♡';
    } else if (pagina) {
      const enfeites = (pagina.stickers || []).length;
      texto = `${cartasDataCurta(pagina.date || '')} · ${enfeites ? `${enfeites} enfeite(s)` : 'sem enfeites'}${Cartas.foto ? ' · com a sua foto' : ''}`;
    } else {
      texto = 'escolhe uma página do diário pra mandar ⋆';
    }
    if (texto.length > 120) texto = `${texto.slice(0, 120)}…`;

    cartasUi.previa.innerHTML = '';
    const linha = cartasElemento('div', 'letter-preview-mini');
    const img = document.createElement('img');
    img.src = cartasSrcDaArte(Cartas.art);
    img.alt = '';
    linha.appendChild(img);
    const bloco = cartasElemento('div');
    bloco.appendChild(cartasElemento('b', '', titulo));
    bloco.appendChild(cartasElemento('span', '', texto));
    linha.appendChild(bloco);
    cartasUi.previa.appendChild(linha);
  }

  function cartasAbriuCompose() {
    return Boolean(cartasUi.compose && cartasUi.compose.classList.contains('open'));
  }

  function cartasAbrirCompose({ destino = 'code', amigaId = '' } = {}) {
    const api = cartasApi();
    if (!api) {
      showToast('a nuvem não está configurada nesta cópia do app 🌸', true);
      return;
    }
    Cartas.destinoModo = destino === 'friend' ? 'friend' : 'code';
    Cartas.amigaEscolhida = amigaId || '';
    Cartas.art = `letter${1 + Math.floor(Math.random() * 15)}`;
    Cartas.foto = '';
    Cartas.adesivos = [];
    Cartas.adesivoSelecionado = '';
    Cartas.adesivoSeq = 0;
    Cartas.enviando = false;
    if (cartasUi.titulo) cartasUi.titulo.value = '';
    if (cartasUi.texto) cartasUi.texto.value = '';
    if (cartasUi.fotoImg) cartasUi.fotoImg.removeAttribute('src');
    if (cartasUi.fotoPreview) cartasUi.fotoPreview.hidden = true;
    if (cartasUi.fotoLimpar) cartasUi.fotoLimpar.hidden = true;
    if (cartasUi.fotoDica) cartasUi.fotoDica.textContent = 'a transparência é preservada ✧';
    if (cartasUi.estado) cartasUi.estado.textContent = '';
    if (cartasUi.enviar) {
      cartasUi.enviar.disabled = false;
      cartasUi.enviar.textContent = 'mandar 💌';
    }

    const estilo = cartasLerEstiloSalvo();
    if (estilo) {
      Cartas.padrao = estilo.padrao;
      Cartas.letra = estilo.letra;
      Cartas.corDaFolha = estilo.corDaFolha;
      Cartas.corDaLetra = estilo.corDaLetra;
    }

    cartasPreencherPaginas();
    cartasPreencherDestinos();
    Cartas.fonte = 'new';
    cartasRenderizarArtes();
    cartasRenderizarPadroes();
    cartasRenderizarPaleta();
    cartasRenderizarAdesivos();
    cartasAplicarEstiloDaPagina();
    cartasAtualizarFonte();

    if (cartasUi.compose) cartasUi.compose.classList.add('open');
    playSfx(1080, 0.08);

    cartasCarregar({ silent: true }).then(() => {
      if (cartasAbriuCompose()) cartasPreencherDestinos();
    });
    cartasCarregarCodigoPessoal({ silent: true });
  }

  function cartasFecharCompose() {
    if (cartasUi.compose) cartasUi.compose.classList.remove('open');
    if (cartasUi.estado) cartasUi.estado.textContent = '';
    if (cartasUi.enviar) {
      cartasUi.enviar.disabled = false;
      cartasUi.enviar.textContent = 'mandar 💌';
    }
    Cartas.foto = '';
    Cartas.adesivos = [];
    Cartas.adesivoSelecionado = '';
    Cartas.enviando = false;
  }

  async function cartasEscolherFoto(arquivo) {
    if (!arquivo) return;
    if (cartasUi.estado) cartasUi.estado.textContent = 'preparando a foto…';
    let url = '';
    try {
      url = URL.createObjectURL(arquivo);
      const imagem = await carregarImagem(url);
      const data = imagemEmDataUrl(imagem, { lado: 1400, qualidade: 0.84 });
      if (!data) throw new Error('não consegui preparar essa imagem');
      Cartas.foto = data;
      if (cartasUi.fotoImg) cartasUi.fotoImg.src = data;
      if (cartasUi.fotoPreview) cartasUi.fotoPreview.hidden = false;
      if (cartasUi.fotoLimpar) cartasUi.fotoLimpar.hidden = false;
      if (cartasUi.fotoDica) cartasUi.fotoDica.textContent = 'foto pronta, com a transparência guardada ✧';
      const proporcao = (imagem.naturalWidth || imagem.width || 0) / (imagem.naturalHeight || imagem.height || 1);
      cartasAdicionarAdesivo(data, { foto: true, aspect: proporcao });
      cartasAtualizarPrevia();
    } catch (error) {
      showToast(`não consegui usar essa foto: ${error.message}`, true);
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (cartasUi.estado) cartasUi.estado.textContent = '';
      if (cartasUi.fotoInput) cartasUi.fotoInput.value = '';
    }
  }

  function cartasLimparFoto() {
    Cartas.foto = '';
    Cartas.adesivos = Cartas.adesivos.filter((item) => item.kind !== 'photo');
    Cartas.adesivoSelecionado = '';
    if (cartasUi.fotoImg) cartasUi.fotoImg.removeAttribute('src');
    if (cartasUi.fotoPreview) cartasUi.fotoPreview.hidden = true;
    if (cartasUi.fotoLimpar) cartasUi.fotoLimpar.hidden = true;
    if (cartasUi.fotoDica) cartasUi.fotoDica.textContent = 'a transparência é preservada ✧';
    cartasRenderizarAdesivos();
    cartasAtualizarPrevia();
  }

  function cartasClonar(valor) {
    try {
      return JSON.parse(JSON.stringify(valor));
    } catch (error) {
      return null;
    }
  }

  function cartasMontarPagina() {
    let pagina = null;
    if (Cartas.fonte === 'page') {
      const escolhida = cartasPaginaEscolhida();
      if (!escolhida) return null;
      pagina = cartasClonar(escolhida);
      if (!pagina) return null;
      delete pagina.date;
      delete pagina.entryId;
      delete pagina.solta;
      delete pagina.letterFrom;
      delete pagina.letterArt;
    } else {
      const medida = cartasMedirFolhaDaCarta();
      pagina = {
        id: `carta-${Date.now().toString(36)}`,
        title: (cartasUi.titulo && cartasUi.titulo.value.trim()) || '',
        body: (cartasUi.texto && cartasUi.texto.value) || '',
        pattern: Cartas.padrao || 'lines',
        diaryStyle: {
          paperColor: Cartas.corDaFolha,
          dotColor: '',
          dots: '',
        },
        textStyle: {
          color: Cartas.corDaLetra,
          outline: false,
          outlineColor: '',
        },
        medida,
        textSpans: [],
        stickers: [],
        texts: [],
      };
    }

    if (Cartas.adesivos.length) {
      const medida = pagina.medida || cartasMedirFolhaDaCarta();
      pagina.medida = medida;
      pagina.stickers = Array.isArray(pagina.stickers) ? pagina.stickers.slice() : [];
      Cartas.adesivos.forEach((item, indice) => {
        pagina.stickers.push({
          src: item.src,
          x: Math.round(item.x * (Number(medida.width) || 370)),
          y: Math.round(item.y * (Number(medida.height) || 480)),
          width: Math.max(24, Math.round(item.w * (Number(medida.width) || 370))),
          rotation: item.rotation || 0,
          zIndex: 40 + indice,
          hasShadow: true,
          hasBorder: false,
          flip: false,
          ...(item.kind === 'photo' ? { kind: 'photo' } : {}),
        });
      });
    }

    return pagina;
  }

  async function cartasEnviar() {
    if (Cartas.enviando) return;
    const api = cartasApi();
    if (!api) {
      showToast('a nuvem não está configurada nesta cópia do app 🌸', true);
      return;
    }

    const pagina = cartasMontarPagina();
    if (!pagina) {
      showToast('escolhe uma página do diário (ou escreve uma cartinha) 🌸', true);
      return;
    }
    const vaziaNova = Cartas.fonte === 'new'
      && !String(pagina.title || '').trim()
      && !String(pagina.body || '').trim()
      && !Cartas.adesivos.length;
    if (vaziaNova) {
      showToast('escreve alguma coisinha (ou cola um enfeite) antes de mandar ♡', true);
      return;
    }

    Cartas.enviando = true;
    if (cartasUi.enviar) {
      cartasUi.enviar.disabled = true;
      cartasUi.enviar.textContent = 'mandando…';
    }
    if (cartasUi.estado) cartasUi.estado.textContent = 'mandando a cartinha…';
    try {
      const modoAmiga = Cartas.destinoModo === 'friend';
      const amigaId = modoAmiga ? Cartas.amigaEscolhida : '';
      if (modoAmiga && !amigaId) {
        showToast('escolhe uma amiga (ou manda por código) 🌸', true);
        if (cartasUi.enviar) {
          cartasUi.enviar.disabled = false;
          cartasUi.enviar.textContent = 'mandar 💌';
        }
        if (cartasUi.estado) cartasUi.estado.textContent = '';
        Cartas.enviando = false;
        return;
      }
      const envio = await api.lettersSend({
        art: Cartas.art,
        alias: state.username || 'alguém',
        senderIcon: cartasLerMeuIcone(),
        ...(amigaId ? { friendId: amigaId } : {}),
        payload: { page: pagina },
      });

      if (!envio || !envio.code) {
        throw new Error('a nuvem não devolveu o código da cartinha — tenta de novo');
      }
      const info = {
        code: envio.code,
        codeFormatted: envio.codeFormatted || cartasFormatarCodigo(envio.code),
        art: (envio.letter && envio.letter.art) || Cartas.art,
        createdAt: new Date().toISOString(),
      };
      cartasLembrarCodigo(envio.letter && envio.letter.id, {
        ...info,
        link: cartasLinkDaCarta(envio.code),
        texto: cartasTextoDeCompartilhar(envio.code, state.username || ''),
      });
      cartasCarregarCodigoPessoal({ silent: true, forcar: true });
      cartasFecharCompose();
      cartasMostrarCompartilhar({ ...info, letter: envio.letter });
      cartasCarregar({ silent: true });
    } catch (error) {
      const recado = error.code === 'payload_too_large' || error.status === 413
        ? 'essa cartinha ficou grande demais — tenta uma foto menor'
        : cartasRecadoDoErro(error, 'não consegui mandar a cartinha');
      if (cartasUi.estado) cartasUi.estado.textContent = recado;
      showToast(`💌 ${recado}`, true);
    } finally {
      Cartas.enviando = false;
      if (cartasUi.enviar) {
        cartasUi.enviar.disabled = false;
        cartasUi.enviar.textContent = 'mandar 💌';
      }
    }
  }


  function cartasDesenharPaginaEm(elemento, page, classeBase = '') {
    if (!elemento) return;
    const pagina = page && typeof page === 'object' ? page : {};
    const padroes = EntryStore && Array.isArray(EntryStore.PADROES) ? EntryStore.PADROES : ['lines', 'dots', 'grid', 'blank', 'spiral'];
    const padrao = padroes.includes(pagina.pattern) ? pagina.pattern : 'lines';
    const medida = pagina.medida && Number(pagina.medida.width) > 0 && Number(pagina.medida.height) > 0
      ? pagina.medida
      : { width: 370, height: 480 };
    const corDaFolha = (pagina.diaryStyle && /^#[0-9a-f]{6}$/i.test(String(pagina.diaryStyle.paperColor || '')))
      ? pagina.diaryStyle.paperColor
      : '';
    const corDaLetra = (pagina.textStyle && /^#[0-9a-f]{6}$/i.test(String(pagina.textStyle.color || '')))
      ? pagina.textStyle.color
      : '';
    const proporcao = MuralModel
      ? MuralModel.proporcaoDaPagina(pagina)
      : (medida.width / medida.height || 3 / 4);

    elemento.className = `custom-diary-paper paper-${padrao} ${classeBase}`.trim();
    elemento.style.aspectRatio = String(proporcao);
    elemento.style.backgroundColor = corDaFolha || '';
    elemento.style.color = corDaLetra || '';
    elemento.style.fontFamily = "'Caveat', cursive";
    elemento.innerHTML = '';

    const titulo = cartasElemento('div', 'letter-preview-title', String(pagina.title || '').trim());
    if (!titulo.textContent) titulo.hidden = true;
    const corpo = cartasElemento('div', 'letter-preview-body', String(pagina.body || ''));
    if (!corpo.textContent.trim()) corpo.hidden = true;
    elemento.append(titulo, corpo);

    const camada = cartasElemento('div', 'letter-preview-stickers');
    (Array.isArray(pagina.stickers) ? pagina.stickers : []).slice(0, 40).forEach((sticker) => {
      const src = String(sticker && sticker.src || '').trim();
      if (!src) return;
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      img.style.left = `${(Number(sticker.x) || 0) / medida.width * 100}%`;
      img.style.top = `${(Number(sticker.y) || 0) / medida.height * 100}%`;
      img.style.width = `${Math.max(2, (Number(sticker.width) || 40) / medida.width * 100)}%`;
      img.style.transform = `rotate(${Number(sticker.rotation) || 0}deg)`;
      img.style.zIndex = String(Number(sticker.zIndex) || 20);
      if (sticker.flip) img.style.scale = '-1 1';
      camada.appendChild(img);
    });
    (Array.isArray(pagina.texts) ? pagina.texts : []).slice(0, 20).forEach((texto) => {
      const conteudo = String(texto && texto.text || '').trim();
      if (!conteudo) return;
      const span = cartasElemento('span', 'letter-preview-text', conteudo);
      span.style.left = `${(Number(texto.x) || 0) / medida.width * 100}%`;
      span.style.top = `${(Number(texto.y) || 0) / medida.height * 100}%`;
      span.style.fontSize = `${Math.max(9, (Number(texto.size) || 21) * 0.66)}px`;
      span.style.transform = `rotate(${Number(texto.rotation) || 0}deg)`;
      span.style.zIndex = String(Number(texto.zIndex) || 30);
      camada.appendChild(span);
    });
    elemento.appendChild(camada);
  }

  function cartasMostrarPreviaDaCarta(letter) {
    if (!cartasUi.envelopePreview || !cartasUi.envelopeSheet) return;
    const pagina = letter && letter.payload && letter.payload.page;
    if (!pagina) {
      cartasUi.envelopePreview.hidden = true;
      return;
    }
    cartasDesenharPaginaEm(cartasUi.envelopeSheet, pagina, 'letter-envelope-sheet');
    cartasUi.envelopePreview.hidden = false;
  }

  function cartasAbrirEnvelope({ code, id, art, senderAlias } = {}) {
    if (!code && !id) return;
    Cartas.envelope = { code: code || '', id: id || '', art: art || 'letter1', senderAlias: senderAlias || 'alguém' };
    Cartas.ultimaCarta = null;
    if (cartasUi.envelope) cartasUi.envelope.classList.remove('is-opening', 'is-opened');
    if (cartasUi.envelopeTitulo) cartasUi.envelopeTitulo.textContent = 'uma cartinha chegou pra você';
    if (cartasUi.envelopeImg) cartasUi.envelopeImg.src = cartasSrcDaArte(art);
    if (cartasUi.envelopeDe) cartasUi.envelopeDe.textContent = `de ${senderAlias || 'alguém'} com carinho`;
    if (cartasUi.envelopeDica) {
      cartasUi.envelopeDica.hidden = false;
      cartasUi.envelopeDica.textContent = 'toca na cartinha pra abrir ⋆';
    }
    if (cartasUi.envelopeErro) {
      cartasUi.envelopeErro.hidden = true;
      cartasUi.envelopeErro.textContent = '';
    }
    if (cartasUi.envelopePreview) cartasUi.envelopePreview.hidden = true;
    if (cartasUi.envelopeAbrir) cartasUi.envelopeAbrir.disabled = false;
    if (cartasUi.envelopeDepois) cartasUi.envelopeDepois.hidden = true;
    if (cartasUi.envelopeDiario) cartasUi.envelopeDiario.disabled = false;
    if (cartasUi.envelopeMural) cartasUi.envelopeMural.disabled = false;
    if (cartasUi.envelopeFechar) cartasUi.envelopeFechar.hidden = false;
    if (cartasUi.envelope) cartasUi.envelope.classList.add('open');
    playSfx(1050, 0.08);
  }

  function cartasFecharEnvelope() {
    if (cartasUi.envelope) cartasUi.envelope.classList.remove('open', 'is-opening', 'is-opened');
    if (cartasUi.envelopeTitulo) cartasUi.envelopeTitulo.textContent = 'uma cartinha chegou pra você';
    if (cartasUi.envelopePreview) cartasUi.envelopePreview.hidden = true;
    Cartas.envelope = null;
    Cartas.ultimaCarta = null;
  }

  function playBellSfx() {
    try {
      initAudioCtx();
      const ctx = state.audioContext;
      if (!ctx) return;
      const agora = ctx.currentTime + 0.02;
      [[1568, 0, 0.09], [2093, 0.09, 0.07], [2637, 0.18, 0.04]].forEach(([freq, atraso, volume]) => {
        const sino = ctx.createOscillator();
        const ganho = ctx.createGain();
        sino.type = 'sine';
        sino.frequency.setValueAtTime(freq, agora + atraso);
        ganho.gain.setValueAtTime(0.0001, agora + atraso);
        ganho.gain.exponentialRampToValueAtTime(volume, agora + atraso + 0.015);
        ganho.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + 0.9);
        sino.connect(ganho);
        ganho.connect(ctx.destination);
        sino.start(agora + atraso);
        sino.stop(agora + atraso + 0.95);
      });
    } catch (error) {   }
  }

  function cartasMostrarNovidades(numero) {
    const n = Math.max(1, Math.trunc(Number(numero) || 1));
    if (cartasUi.novasTitulo) {
      cartasUi.novasTitulo.textContent = n === 1 ? 'você tem 1 carta nova!' : `você tem ${n} cartas novas!`;
    }
    if (cartasUi.novasTexto) {
      cartasUi.novasTexto.textContent = n === 1
        ? 'alguém deixou uma cartinha na sua caixinha ⋆ ˚｡⋆'
        : 'tem cartinhas esperando pra serem abertas ⋆ ˚｡⋆';
    }
    if (cartasUi.novas) cartasUi.novas.classList.add('open');
  }

  function cartasFecharNovidades() {
    if (cartasUi.novas) cartasUi.novas.classList.remove('open');
  }

  function cartasMostrarNovidadesComCalma(numero, tentativas = 0) {
    const splashAberto = (() => {
      const splash = document.getElementById('splash-screen');
      if (!splash) return false;
      const estilo = getComputedStyle(splash);
      return estilo.display !== 'none' && estilo.visibility !== 'hidden' && !splash.classList.contains('hidden');
    })();
    const noticiasAbertas = Boolean(document.querySelector('#update-notice.open'));
    if ((splashAberto || noticiasAbertas) && tentativas < 8) {
      setTimeout(() => cartasMostrarNovidadesComCalma(numero, tentativas + 1), 900);
      return;
    }
    cartasMostrarNovidades(numero);
  }

  async function cartasVerificarNovas({ silent = false } = {}) {
    const api = cartasApi();
    if (!api) return 0;
    try {
      const caixinha = await api.lettersInbox();
      const total = (caixinha && caixinha.count) || (caixinha && caixinha.letters && caixinha.letters.length) || 0;
      cartasAtualizarBadge(total);
      if (Cartas.dados) Cartas.dados.inbox = caixinha;
      if (total > 0) {
        let ignorado = false;
        try { ignorado = sessionStorage.getItem(CARTA_CHAVE_IGNORAR) === '1'; } catch (error) {   }
        if (!ignorado) {
          playBellSfx();
          setTimeout(() => cartasMostrarNovidadesComCalma(total), 260);
        }
      }
      return total;
    } catch (error) {
      if (!silent) console.warn('[crechezinha] não consegui ver as cartinhas novas:', error.message);
      return 0;
    }
  }

  function cartasPaginaDaCarta(letter) {
    const crua = letter && letter.payload && letter.payload.page;
    if (!crua || typeof crua !== 'object') return null;
    const id = `carta-${String(letter.id || Date.now()).slice(0, 40)}`;
    const existente = EntryStore ? EntryStore.buscarPagina(storeDiario, id) : null;
    if (existente) return { pagina: existente, data: existente.date, jaEstava: true };

    const data = hojeStr();
    const pagina = {
      ...cartasClonar(crua),
      id,
      letterFrom: String(letter.senderAlias || 'alguém').slice(0, 32),
      letterArt: /^letter([1-9]|1[0-5])$/.test(String(letter.art || '')) ? letter.art : 'letter1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { pagina, data, jaEstava: false };
  }

  async function cartasEscreverNoDiario(letter) {
    const info = cartasPaginaDaCarta(letter);
    if (!info) return null;
    if (info.jaEstava) {
      const entrada = readEntries().find((item) => item.date === info.data) || null;
      return { entrada, pagina: info.pagina, data: info.data, jaEstava: true };
    }

    const salva = await escreverPagina(info.data, info.pagina);
    if (!salva) return null;
    const entrada = readEntries().find((item) => item.date === info.data) || null;
    if (entrada && window.CrechezinhaCloud) window.CrechezinhaCloud.pushEntry(entrada);
    try { if (typeof sincronizarWidget === 'function') sincronizarWidget(); } catch (error) {   }
    try {
      if (historyModal && historyModal.classList.contains('open')) renderHistory();
      if (livrinho) atualizarLivrinho({ irPara: 'mesma' });
    } catch (error) {   }
    return { entrada, pagina: salva, data: info.data, jaEstava: false };
  }

  async function cartasGuardarNoDiario(letter) {
    const guardada = await cartasEscreverNoDiario(letter);
    if (!guardada) return null;
    cartasRemoverAberta(letter && letter.id);
    if (typeof muralRemoverCartaPorLetterId === 'function') {
      muralRemoverCartaPorLetterId(letter && letter.id);
    }
    return guardada;
  }

  function cartasMostrarDepoisDaCarta(letter, { destino = '', guardada = false } = {}) {
    if (!cartasUi.envelopeDepois) return;
    cartasUi.envelopeDepois.hidden = false;
    if (cartasUi.envelope) cartasUi.envelope.classList.add('is-opened');
    if (cartasUi.envelopeTitulo) {
      cartasUi.envelopeTitulo.textContent = destino
        ? 'cartinha guardada!'
        : 'cartinha aberta!';
    }
    if (cartasUi.envelopeDica) cartasUi.envelopeDica.hidden = true;
    const apelido = (letter && letter.senderAlias) || 'alguém';
    if (cartasUi.envelopeDepoisTexto) {
      if (destino === 'diario') {
        cartasUi.envelopeDepoisTexto.textContent = `carta de ${apelido} guardada no seu diário ♡`;
      } else if (destino === 'mural') {
        cartasUi.envelopeDepoisTexto.textContent = `carta de ${apelido} pendurada no seu mural 📌♡`;
      } else if (guardada) {
        cartasUi.envelopeDepoisTexto.textContent = `carta de ${apelido} guardada no seu diário ♡`;
      } else {
        cartasUi.envelopeDepoisTexto.textContent = `carta de ${apelido} aberta! onde ela vai morar?`;
      }
    }
    if (cartasUi.envelopeFechar) cartasUi.envelopeFechar.hidden = false;
    if (cartasUi.envelopeAbrir) cartasUi.envelopeAbrir.disabled = true;

    if (cartasUi.envelopeDiario) cartasUi.envelopeDiario.hidden = Boolean(destino);
    if (cartasUi.envelopeMural) cartasUi.envelopeMural.hidden = Boolean(destino);

    const eu = String(state.username || '').trim().toLowerCase();
    const remetente = String(apelido).trim();
    const podeAmiga = Boolean(remetente) && remetente.toLowerCase() !== eu;
    if (cartasUi.envelopeAmiga) {
      cartasUi.envelopeAmiga.hidden = !podeAmiga;
      cartasUi.envelopeAmiga.disabled = false;
      cartasUi.envelopeAmiga.textContent = `guardar ${remetente} como amiga`;
    }
    if (cartasUi.envelopeLer) {
      cartasUi.envelopeLer.hidden = !destino;
      cartasUi.envelopeLer.textContent = destino === 'mural' ? 'ver no mural →' : 'ler no diário →';
    }
  }

  async function cartasEscolherDestino(destino) {
    const ultima = Cartas.ultimaCarta;
    if (!ultima || !ultima.letter) return;
    if (ultima.destino) return;
    const letter = ultima.letter;
    if (cartasUi.envelopeDiario) cartasUi.envelopeDiario.disabled = true;
    if (cartasUi.envelopeMural) cartasUi.envelopeMural.disabled = true;

    if (destino === 'diario') {
      const guardada = await cartasGuardarNoDiario(letter);
      if (!guardada) {
        showToast('não coube no diário agora 🌧️ — tenta o mural', true);
        if (cartasUi.envelopeDiario) cartasUi.envelopeDiario.disabled = false;
        if (cartasUi.envelopeMural) cartasUi.envelopeMural.disabled = false;
        return;
      }
      ultima.destino = 'diario';
      ultima.pagina = guardada.pagina;
      ultima.data = guardada.data;
      ultima.entrada = guardada.entrada;
      cartasMostrarDepoisDaCarta(letter, { destino: 'diario', guardada: true });
      showToast(`💌 carta de ${letter.senderAlias || 'alguém'} guardada no seu diário!`);
    } else {
      const cartao = muralAdicionarCarta(letter);
      if (!cartao) {
        showToast('não consegui pendurar no mural agora 🌧️', true);
        if (cartasUi.envelopeDiario) cartasUi.envelopeDiario.disabled = false;
        if (cartasUi.envelopeMural) cartasUi.envelopeMural.disabled = false;
        return;
      }
      ultima.destino = 'mural';
      ultima.cartao = cartao;
      cartasMostrarDepoisDaCarta(letter, { destino: 'mural' });
      showToast(`📌 carta de ${letter.senderAlias || 'alguém'} pendurada no mural!`);
    }
    cartasVerificarNovas({ silent: true });
    cartasCarregar({ silent: true });
    if (cartasUi.modal && cartasUi.modal.classList.contains('open')) cartasRenderizar();
  }

  async function cartasEscolherDestinoDaAberta(carta, destino) {
    if (!carta || !carta.id) return;
    if (destino === 'diario') {
      const guardada = await cartasGuardarNoDiario(carta);
      if (!guardada) {
        showToast('não coube no diário agora 🌧️', true);
        return;
      }
      showToast(`💌 carta de ${carta.senderAlias || 'alguém'} guardada no diário!`);
      if (Cartas.ultimaCarta && Cartas.ultimaCarta.letter && Cartas.ultimaCarta.letter.id === carta.id) {
        Cartas.ultimaCarta.destino = 'diario';
        Cartas.ultimaCarta.pagina = guardada.pagina;
        cartasMostrarDepoisDaCarta(carta, { destino: 'diario', guardada: true });
      }
    } else {
      const cartao = muralAdicionarCarta(carta);
      if (!cartao) {
        showToast('não consegui pendurar no mural agora 🌧️', true);
        return;
      }
      showToast(`📌 carta de ${carta.senderAlias || 'alguém'} pendurada no mural!`);
      if (Cartas.ultimaCarta && Cartas.ultimaCarta.letter && Cartas.ultimaCarta.letter.id === carta.id) {
        Cartas.ultimaCarta.destino = 'mural';
        Cartas.ultimaCarta.cartao = cartao;
        cartasMostrarDepoisDaCarta(carta, { destino: 'mural' });
      }
    }
    if (cartasUi.modal && cartasUi.modal.classList.contains('open')) cartasRenderizar();
  }

  async function cartasAbrirCarta() {
    const envelope = Cartas.envelope;
    if (!envelope) return;
    if (cartasUi.envelope && cartasUi.envelope.classList.contains('is-opening')) return;
    if (cartasUi.envelopeAbrir) cartasUi.envelopeAbrir.disabled = true;
    if (cartasUi.envelope) cartasUi.envelope.classList.add('is-opening');
    if (cartasUi.envelopeDica) cartasUi.envelopeDica.textContent = 'abrindo a cartinha…';
    if (cartasUi.envelopeErro) cartasUi.envelopeErro.hidden = true;

    try {
      if (window.PooftiePageSound && typeof window.PooftiePageSound.tocar === 'function') {
        window.PooftiePageSound.tocar({ volume: 0.16 });
      }
    } catch (error) {   }
    playSfx(1320, 0.12);

    await new Promise((resolve) => setTimeout(resolve, 680));

    const api = cartasApi();
    if (!api) {
      cartasErroAoAbrir('a nuvem não está configurada nesta cópia 🌸');
      return;
    }

    try {
      const resposta = await api.lettersOpen(
        envelope.code ? { code: envelope.code } : { id: envelope.id },
      );
      const letter = resposta && resposta.letter;
      if (!letter) throw new Error('a nuvem não devolveu a cartinha');
      cartasGuardarPendente(null);
      const registro = cartasRegistrarAberta(letter);
      Cartas.ultimaCarta = {
        letter: registro ? registro.letter : letter,
        pagina: registro ? registro.letter.payload.page : null,
        destino: '',
      };
      cartasMostrarPreviaDaCarta(letter);
      cartasMostrarDepoisDaCarta(letter, {});
      showToast(`💌 carta de ${letter.senderAlias || 'alguém'} aberta! escolhe onde guardar ♡`);
      cartasVerificarNovas({ silent: true });
      cartasCarregar({ silent: true });
    } catch (error) {
      cartasErroAoAbrir(cartasRecadoDoErro(error, 'não consegui abrir essa cartinha'));
    }
  }

  function cartasErroAoAbrir(recado) {
    if (cartasUi.envelope) cartasUi.envelope.classList.remove('is-opening', 'is-opened');
    if (cartasUi.envelopeAbrir) cartasUi.envelopeAbrir.disabled = false;
    if (cartasUi.envelopeDica) {
      cartasUi.envelopeDica.hidden = false;
      cartasUi.envelopeDica.textContent = 'toca na cartinha pra tentar de novo ⋆';
    }
    if (cartasUi.envelopeErro) {
      cartasUi.envelopeErro.hidden = false;
      cartasUi.envelopeErro.textContent = recado;
    }
    if (cartasUi.envelopeDepois) cartasUi.envelopeDepois.hidden = true;
  }

  async function cartasAbrirPorCodigo(codigo) {
    const api = cartasApi();
    if (!api) {
      showToast('a nuvem não está configurada nesta cópia do app 🌸', true);
      return;
    }
    try {
      const envelope = await api.lettersPeek(codigo);
      cartasAbrirEnvelope({
        code: codigo,
        art: envelope.art,
        senderAlias: envelope.senderAlias,
      });
    } catch (error) {
      if (error && (error.status === 404 || error.status === 410)) cartasGuardarPendente(null);
      showToast(`💌 ${cartasRecadoDoErro(error, 'não consegui abrir essa cartinha')}`, true);
    }
  }

  function cartasConsumirHash() {
    if (!cartasModelo() || !cartasModelo().lerHash) return;
    const achado = cartasModelo().lerHash(location.hash);
    if (!achado.carta && !achado.amiga) return;
    Cartas.pendente = achado;
    cartasGuardarPendente(achado);
    try {
      history.replaceState(null, '', `${location.pathname}${location.search}`);
    } catch (error) {   }
  }

  function cartasProcessarPendente() {
    if (!Cartas.pendente) Cartas.pendente = cartasLerPendente();
    const pendente = Cartas.pendente;
    if (!pendente || !state.username) return;
    Cartas.pendente = null;
    if (pendente.amiga) cartasAceitarConvite(pendente.amiga, { abrir: true });
    if (pendente.carta) cartasAbrirPorCodigo(pendente.carta);
  }

  async function cartasGuardarComoAmiga() {
    const ultima = Cartas.ultimaCarta;
    const api = cartasApi();
    if (!ultima || !ultima.letter || !api) return;
    if (cartasUi.envelopeAmiga) cartasUi.envelopeAmiga.disabled = true;
    try {
      const dados = await api.lettersBefriend(ultima.letter.id, state.username || 'alguém');
      const apelido = (dados && dados.friend && dados.friend.alias) || ultima.letter.senderAlias || 'sua amiga';
      cartasLembrarIconeDoRemetente(
        ultima.letter.senderAlias,
        ultima.letter.senderIcon || (ultima.letter.payload && ultima.letter.payload.icon),
      );
      showToast(`💌 ${apelido} agora está na sua listinha de amigas!`);
      if (cartasUi.envelopeAmiga) cartasUi.envelopeAmiga.hidden = true;
      cartasCarregar({ silent: true });
    } catch (error) {
      showToast(`não consegui guardar a amizade: ${error.message}`, true);
      if (cartasUi.envelopeAmiga) cartasUi.envelopeAmiga.disabled = false;
    }
  }

  function cartasLerNoDiario() {
    const ultima = Cartas.ultimaCarta;
    if (!ultima) {
      cartasFecharEnvelope();
      return;
    }
    cartasFecharEnvelope();
    cartasFecharCaixinha();
    cartasFecharCompartilhar();
    cartasFecharNovidades();

    if (ultima.destino === 'mural') {
      switchView('mural');
      setTimeout(() => muralSelecionarCartaDaCarta(ultima.letter && ultima.letter.id), 180);
      return;
    }
    if (ultima.destino !== 'diario' || !ultima.pagina) return;
    const entrada = readEntries().find((item) => item.date === ultima.data) || ultima.entrada || null;
    if (typeof abrirPaginaParaEscrever === 'function') abrirPaginaParaEscrever(entrada, ultima.pagina.id);
  }

  function cartasAtualizarSeloDaCarta() {
    if (!cartasUi.selo) return;
    let pagina = null;
    try {
      pagina = state.draft && state.draft.pageId && EntryStore
        ? EntryStore.buscarPagina(storeDiario, state.draft.pageId)
        : null;
    } catch (error) {
      pagina = null;
    }
    if (pagina && pagina.letterFrom) {
      cartasUi.selo.hidden = false;
      if (cartasUi.seloArt) cartasUi.seloArt.src = cartasSrcDaArte(pagina.letterArt);
      if (cartasUi.seloNome) cartasUi.seloNome.textContent = pagina.letterFrom;
    } else {
      cartasUi.selo.hidden = true;
    }
  }

  function cartasAoEntrarNoApp() {
    cartasProcessarPendente();
    if (state.username) {
      setTimeout(() => cartasVerificarNovas(), 900);
      setTimeout(() => cartasCarregarCodigoPessoal({ silent: true }), 1300);
    }
  }

  if (cartasUi.botao) {
    cartasUi.botao.addEventListener('click', () => {
      cartasAbrirCaixinha();
      cartasVerificarNovas({ silent: true });
    });
  }
  if (cartasUi.fechar) cartasUi.fechar.addEventListener('click', cartasFecharCaixinha);
  if (cartasUi.backdrop) cartasUi.backdrop.addEventListener('click', cartasFecharCaixinha);
  cartasUi.abas.forEach((aba) => {
    aba.addEventListener('click', () => cartasTrocarAba(aba.dataset.letterTab));
  });
  if (cartasUi.escrever) cartasUi.escrever.addEventListener('click', () => cartasAbrirCompose());
  if (cartasUi.escreverCodigo) {
    cartasUi.escreverCodigo.addEventListener('click', () => cartasAbrirCompose({ destino: 'code' }));
  }
  if (cartasUi.escreverAmiga) {
    cartasUi.escreverAmiga.addEventListener('click', () => cartasAbrirCompose({ destino: 'friend' }));
  }
  cartasUi.destinoAbas.forEach((aba) => {
    aba.addEventListener('click', () => {
      Cartas.destinoModo = aba.dataset.letterDest === 'friend' ? 'friend' : 'code';
      cartasAtualizarDestino();
      playSfx(1000, 0.05);
    });
  });

  if (cartasUi.composeFechar) cartasUi.composeFechar.addEventListener('click', cartasFecharCompose);
  if (cartasUi.composeBackdrop) cartasUi.composeBackdrop.addEventListener('click', cartasFecharCompose);
  cartasUi.fonteAbas.forEach((aba) => {
    aba.addEventListener('click', () => {
      Cartas.fonte = aba.dataset.letterSource === 'new' ? 'new' : 'page';
      cartasAtualizarFonte();
      playSfx(1000, 0.05);
    });
  });
  if (cartasUi.paginaSelect) cartasUi.paginaSelect.addEventListener('change', cartasAtualizarPrevia);
  if (cartasUi.titulo) cartasUi.titulo.addEventListener('input', cartasAtualizarPrevia);
  if (cartasUi.texto) cartasUi.texto.addEventListener('input', cartasAtualizarPrevia);

  if (cartasUi.fonteSelect) {
    cartasUi.fonteSelect.addEventListener('change', () => {
      Cartas.letra = cartasUi.fonteSelect.value || "'Caveat', cursive";
      cartasAplicarEstiloDaPagina();
      cartasGuardarEstilo();
    });
  }
  if (cartasUi.corDaFolha) {
    cartasUi.corDaFolha.addEventListener('input', () => {
      Cartas.corDaFolha = cartasUi.corDaFolha.value || '#ffffff';
      cartasAplicarEstiloDaPagina();
    });
    cartasUi.corDaFolha.addEventListener('change', cartasGuardarEstilo);
  }
  if (cartasUi.corDaLetra) {
    cartasUi.corDaLetra.addEventListener('input', () => {
      Cartas.corDaLetra = cartasUi.corDaLetra.value || '#463529';
      cartasAplicarEstiloDaPagina();
    });
    cartasUi.corDaLetra.addEventListener('change', cartasGuardarEstilo);
  }
  if (cartasUi.fotoInput) {
    cartasUi.fotoInput.addEventListener('change', () => {
      const arquivo = cartasUi.fotoInput.files && cartasUi.fotoInput.files[0];
      cartasEscolherFoto(arquivo);
    });
  }
  if (cartasUi.fotoLimpar) cartasUi.fotoLimpar.addEventListener('click', cartasLimparFoto);
  if (cartasUi.enviar) cartasUi.enviar.addEventListener('click', cartasEnviar);

  if (cartasUi.adesivosFerramentas) {
    cartasUi.adesivosFerramentas.addEventListener('click', (evento) => {
      const botao = evento.target.closest('[data-letter-sticker]');
      if (!botao) return;
      evento.preventDefault();
      evento.stopPropagation();
      cartasAcaoDoAdesivo(botao.dataset.letterSticker);
    });
  }
  if (cartasUi.folha) {
    cartasUi.folha.addEventListener('click', (evento) => {
      if (evento.target.closest('.letter-page-sticker')) return;
      if (evento.target.closest('.letter-sticker-tools')) return;
      cartasSelecionarAdesivo('');
    });
  }

  if (cartasUi.envelopeAbrir) cartasUi.envelopeAbrir.addEventListener('click', cartasAbrirCarta);
  if (cartasUi.envelopeFechar) cartasUi.envelopeFechar.addEventListener('click', cartasFecharEnvelope);
  if (cartasUi.envelopeBackdrop) cartasUi.envelopeBackdrop.addEventListener('click', cartasFecharEnvelope);
  if (cartasUi.envelopeAmiga) cartasUi.envelopeAmiga.addEventListener('click', cartasGuardarComoAmiga);
  if (cartasUi.envelopeLer) cartasUi.envelopeLer.addEventListener('click', cartasLerNoDiario);
  if (cartasUi.envelopeDiario) cartasUi.envelopeDiario.addEventListener('click', () => cartasEscolherDestino('diario'));
  if (cartasUi.envelopeMural) cartasUi.envelopeMural.addEventListener('click', () => cartasEscolherDestino('mural'));

  if (cartasUi.muralBotao) {
    cartasUi.muralBotao.addEventListener('click', () => {
      switchView('mural');
      playSfx(1050, 0.07);
    });
  }
  if (cartasUi.muralAbrirTema) cartasUi.muralAbrirTema.addEventListener('click', muralAbrirTema);
  if (cartasUi.muralArrumar) {
    cartasUi.muralArrumar.addEventListener('click', () => {
      Cartas.mural = MuralModel
        ? MuralModel.arrumarEmGrade(muralLer(), { columns: 2 })
        : muralLer();
      Cartas.muralSelecionado = '';
      muralGuardar();
      renderMural();
      showToast('✧ cartinhas arrumadinhas!');
      playSfx(1080, 0.06);
    });
  }

  if (cartasUi.muralToolbar) {
    cartasUi.muralToolbar.addEventListener('click', (evento) => {
      const botao = evento.target.closest('[data-mural-acao]');
      if (!botao) return;
      evento.preventDefault();
      evento.stopPropagation();
      muralAcaoDoItem(botao.dataset.muralAcao);
    });
  }
  if (cartasUi.muralBoard) {
    cartasUi.muralBoard.addEventListener('pointerdown', (evento) => {
      if (evento.target.closest('.mural-item')) return;
      if (evento.target.closest('.mural-toolbar')) return;
      if (evento.target.closest('.mural-empty')) return;
      Cartas.muralSelecionado = '';
      muralAtualizarSelecao();
    });
  }
  [cartasUi.muralAbrirCartinhas, cartasUi.muralEmptyCartinhas].forEach((botao) => {
    if (botao) {
      botao.addEventListener('click', () => {
        cartasAbrirCaixinha('received');
        cartasVerificarNovas({ silent: true });
      });
    }
  });
  if (cartasUi.temaFechar) cartasUi.temaFechar.addEventListener('click', muralFecharTema);
  if (cartasUi.temaBackdrop) cartasUi.temaBackdrop.addEventListener('click', muralFecharTema);
  if (cartasUi.temaFeito) cartasUi.temaFeito.addEventListener('click', muralFecharTema);
  if (cartasUi.temaNome) {
    cartasUi.temaNome.addEventListener('input', () => {
      const mural = muralLer();
      mural.title = String(cartasUi.temaNome.value || '').slice(0, 40);
      muralGuardar();
      if (cartasUi.muralTitulo) cartasUi.muralTitulo.textContent = mural.title || 'meu mural';
      muralAplicarTema();
    });
  }
  if (cartasUi.temaCor) {
    cartasUi.temaCor.addEventListener('input', () => {
      const mural = muralLer();
      mural.tint = /^#[0-9a-f]{6}$/i.test(cartasUi.temaCor.value) ? cartasUi.temaCor.value : '';
      muralGuardar();
      muralAplicarTema();
    });
  }
  if (cartasUi.temaCorLimpar) {
    cartasUi.temaCorLimpar.addEventListener('click', () => {
      const mural = muralLer();
      mural.tint = '';
      muralGuardar();
      muralAplicarTema();
    });
  }

  if (cartasUi.leitorFechar) cartasUi.leitorFechar.addEventListener('click', muralFecharLeitor);
  if (cartasUi.leitorFeito) cartasUi.leitorFeito.addEventListener('click', muralFecharLeitor);
  if (cartasUi.leitorBackdrop) cartasUi.leitorBackdrop.addEventListener('click', muralFecharLeitor);
  if (cartasUi.leitorDiario) {
    cartasUi.leitorDiario.addEventListener('click', async () => {
      const estado = Cartas.leitorAberto;
      if (!estado) return;
      const carta = estado.origem === 'mural'
        ? {
          id: estado.cartao.letterId || estado.cartao.id,
          art: estado.cartao.art,
          senderAlias: estado.cartao.senderAlias,
          senderIcon: estado.cartao.senderIcon,
          payload: { page: estado.cartao.page },
        }
        : estado.letter;
      if (!carta) return;
      cartasUi.leitorDiario.disabled = true;
      const guardada = await cartasGuardarNoDiario(carta);
      cartasUi.leitorDiario.disabled = false;
      if (!guardada) {
        showToast('não coube no diário agora 🌧️', true);
        return;
      }
      muralFecharLeitor();
      showToast(`💌 carta de ${carta.senderAlias || 'alguém'} guardada no diário!`);
      renderMural();
    });
  }
  if (cartasUi.leitorMural) {
    cartasUi.leitorMural.addEventListener('click', async () => {
      const estado = Cartas.leitorAberto;
      if (!estado) return;
      if (estado.origem === 'mural') {
        if (!confirm('tirar essa cartinha do mural? ela não vai ficar guardada em outro lugar. 🌧️')) return;
        muralRemoverCarta(estado.cartao);
        muralFecharLeitor();
        return;
      }
      const cartao = muralAdicionarCarta(estado.letter);
      if (!cartao) {
        showToast('não consegui pendurar no mural agora 🌧️', true);
        return;
      }
      muralFecharLeitor();
      showToast(`📌 carta de ${estado.letter.senderAlias || 'alguém'} pendurada no mural!`);
    });
  }

  if (cartasUi.iconeFechar) cartasUi.iconeFechar.addEventListener('click', cartasFecharEscolhedorDeIcone);
  if (cartasUi.iconeBackdrop) cartasUi.iconeBackdrop.addEventListener('click', cartasFecharEscolhedorDeIcone);
  if (cartasUi.iconeReset) {
    cartasUi.iconeReset.addEventListener('click', () => cartasAplicarIcone(CARTAS_ICONE_PADRAO));
  }
  if (cartasUi.iconeInput) {
    cartasUi.iconeInput.addEventListener('change', async () => {
      const arquivo = cartasUi.iconeInput.files && cartasUi.iconeInput.files[0];
      if (!arquivo) return;
      let url = '';
      try {
        url = URL.createObjectURL(arquivo);
        const imagem = await carregarImagem(url);
        const data = imagemEmDataUrl(imagem, { lado: 160, qualidade: 0.84 });
        if (!data) throw new Error('não consegui preparar essa foto');
        cartasAplicarIcone(data);
      } catch (error) {
        showToast(`não consegui usar essa foto: ${error.message}`, true);
      } finally {
        if (url) URL.revokeObjectURL(url);
        cartasUi.iconeInput.value = '';
      }
    });
  }

  if (cartasUi.shareCopyCode) {
    cartasUi.shareCopyCode.addEventListener('click', () => {
      const info = Cartas.compartilhar;
      if (info) cartasCopiar(info.codigo || info.codeFormatted || info.code, '💌 código copiado!');
    });
  }
  if (cartasUi.shareCopyLink) {
    cartasUi.shareCopyLink.addEventListener('click', () => {
      const info = Cartas.compartilhar;
      if (info) cartasCopiar(info.link, '🔗 link copiado!');
    });
  }
  if (cartasUi.shareDone) {
    cartasUi.shareDone.addEventListener('click', () => {
      cartasFecharCompartilhar();
      cartasAbrirCaixinha('sent');
    });
  }
  if (cartasUi.compartilharBackdrop) {
    cartasUi.compartilharBackdrop.addEventListener('click', cartasFecharCompartilhar);
  }

  if (cartasUi.novasIgnorar) {
    cartasUi.novasIgnorar.addEventListener('click', () => {
      try { sessionStorage.setItem(CARTA_CHAVE_IGNORAR, '1'); } catch (error) {   }
      cartasFecharNovidades();
    });
  }
  if (cartasUi.novasLer) {
    cartasUi.novasLer.addEventListener('click', () => {
      cartasFecharNovidades();
      cartasAbrirCaixinha('received');
    });
  }
  if (cartasUi.novasBackdrop) cartasUi.novasBackdrop.addEventListener('click', cartasFecharNovidades);

  cartasConsumirHash();

  window.addEventListener('hashchange', () => {
    cartasConsumirHash();
    if (Cartas.pendente) cartasProcessarPendente();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.username) {
      setTimeout(() => cartasVerificarNovas({ silent: true }), 600);
    }
  });


  function muralVazioLocal() {
    return MuralModel ? MuralModel.muralVazio() : {
      version: 1, title: 'meu mural', background: 'pinboard', tint: '', cards: [], stickers: [],
    };
  }

  function muralLer() {
    if (Cartas.mural && Cartas.muralDiario === diarioAtivoId) return Cartas.mural;
    const cru = lerDoDiario(CARTA_CHAVE_MURAL, null);
    Cartas.mural = MuralModel ? MuralModel.normalizarMural(cru) : muralVazioLocal();
    Cartas.muralDiario = diarioAtivoId;
    return Cartas.mural;
  }

  function muralGuardar() {
    const mural = muralLer();
    Cartas.mural = MuralModel ? MuralModel.normalizarMural(mural) : mural;
    Cartas.muralDiario = diarioAtivoId;
    const ok = guardarNoDiario(CARTA_CHAVE_MURAL, JSON.stringify(Cartas.mural));
    muralAtualizarBadge();
    if (cartasUi.temaEstado) {
      cartasUi.temaEstado.textContent = ok ? 'guardado sozinho ✧' : 'não coube no navegador 🌧️';
    }
    if (!ok) showToast('não coube no navegador guardar o mural 🌧️', true);
    return ok;
  }

  function muralAtualizarBadge() {
    const total = (() => {
      try { return (muralLer().cards || []).length; } catch (error) { return 0; }
    })();
    if (cartasUi.muralBadge) {
      cartasUi.muralBadge.textContent = total > 99 ? '99+' : String(total);
      cartasUi.muralBadge.hidden = total <= 0;
    }
  }

  function muralAplicarTema() {
    const mural = muralLer();
    if (cartasUi.muralTitulo && document.activeElement !== cartasUi.temaNome) {
      cartasUi.muralTitulo.textContent = mural.title || 'meu mural';
    }
    if (cartasUi.muralSubtitulo) {
      cartasUi.muralSubtitulo.textContent = mural.cards.length
        ? `${mural.cards.length} cartinha${mural.cards.length === 1 ? '' : 's'} guardada${mural.cards.length === 1 ? '' : 's'} com carinho ⋆`
        : 'as cartinhas que você escolheu guardar fora do diário ⋆';
    }
    if (cartasUi.muralBoard) {
      const fundo = MuralModel ? MuralModel.normalizarFundo(mural.background) : 'pinboard';
      [...cartasUi.muralBoard.classList].forEach((classe) => {
        if (classe.startsWith('mural-bg-')) cartasUi.muralBoard.classList.remove(classe);
      });
      cartasUi.muralBoard.classList.add(`mural-bg-${fundo}`);
      cartasUi.muralBoard.style.setProperty('--mural-tint', mural.tint || 'transparent');
    }
    if (cartasUi.muralTint) {
      cartasUi.muralTint.style.backgroundColor = mural.tint || 'transparent';
      cartasUi.muralTint.style.opacity = mural.tint ? '0.3' : '0';
    }
  }

  function muralProximoZ(mural) {
    const itens = [
      ...((mural && mural.cards) || []),
      ...((mural && mural.stickers) || []),
    ];
    return itens.reduce((maior, item) => Math.max(maior, Number(item.z) || 0), 10) + 1;
  }

  function muralMiniPagina(page) {
    const pagina = page && typeof page === 'object' ? page : {};
    const padroes = EntryStore && Array.isArray(EntryStore.PADROES) ? EntryStore.PADROES : ['lines', 'dots', 'grid', 'blank', 'spiral'];
    const padrao = padroes.includes(pagina.pattern) ? pagina.pattern : 'lines';
    const medida = pagina.medida && Number(pagina.medida.width) > 0 && Number(pagina.medida.height) > 0
      ? pagina.medida
      : { width: 370, height: 480 };
    const proporcao = MuralModel
      ? MuralModel.proporcaoDaPagina(pagina)
      : (medida.width / medida.height || 3 / 4);
    const folha = cartasElemento('div', `mural-card-sheet custom-diary-paper paper-${padrao}`);
    folha.style.setProperty('--mural-card-aspect', String(proporcao));
    const corDaFolha = pagina.diaryStyle && /^#[0-9a-f]{6}$/i.test(String(pagina.diaryStyle.paperColor || ''))
      ? pagina.diaryStyle.paperColor
      : '';
    const corDaLetra = pagina.textStyle && /^#[0-9a-f]{6}$/i.test(String(pagina.textStyle.color || ''))
      ? pagina.textStyle.color
      : '';
    if (corDaFolha) folha.style.backgroundColor = corDaFolha;
    if (corDaLetra) folha.style.color = corDaLetra;

    const titulo = cartasElemento('span', 'mural-card-title', String(pagina.title || '').trim() || 'uma cartinha ♡');
    const texto = String(pagina.body || '').replace(/\s+/g, ' ').trim();
    const corpo = cartasElemento('span', 'mural-card-body', texto ? (texto.length > 150 ? `${texto.slice(0, 150)}…` : texto) : 'com enfeites e um pedacinho do coração ⋆');
    const stickers = (Array.isArray(pagina.stickers) ? pagina.stickers : [])
      .filter((sticker) => sticker && String(sticker.src || '').trim());
    const foto = stickers.find((sticker) => sticker.kind === 'photo') || null;
    folha.appendChild(titulo);
    if (foto) {
      const moldura = cartasElemento('div', 'mural-card-photo');
      const img = document.createElement('img');
      img.src = String(foto.src);
      img.alt = 'foto da cartinha';
      img.loading = 'lazy';
      img.draggable = false;
      moldura.appendChild(img);
      folha.appendChild(moldura);
    }
    folha.appendChild(corpo);

    const camada = cartasElemento('div', 'mural-card-stickers');
    stickers.filter((sticker) => sticker !== foto).slice(0, 6).forEach((sticker) => {
      const src = String(sticker.src || '').trim();
      if (!src) return;
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      img.style.left = `${(Number(sticker.x) || 0) / medida.width * 100}%`;
      img.style.top = `${(Number(sticker.y) || 0) / medida.height * 100}%`;
      img.style.width = `${Math.max(5, (Number(sticker.width) || 40) / medida.width * 100)}%`;
      img.style.transform = `rotate(${Number(sticker.rotation) || 0}deg)`;
      img.style.zIndex = String(Number(sticker.zIndex) || 20);
      camada.appendChild(img);
    });
    folha.appendChild(camada);
    return folha;
  }


  function muralItemSelecionado() {
    const id = Cartas.muralSelecionado;
    if (!id) return null;
    const mural = muralLer();
    const carta = (mural.cards || []).find((item) => item.id === id);
    if (carta) return { item: carta, tipo: 'carta' };
    const adesivo = (mural.stickers || []).find((item) => item.id === id);
    if (adesivo) return { item: adesivo, tipo: 'adesivo' };
    return null;
  }

  function muralPosicionarToolbar() {
    const ferramentas = cartasUi.muralToolbar;
    const camada = cartasUi.muralLayer;
    if (!ferramentas || !camada) return;
    if (ferramentas.hidden) return;
    const elemento = camada.querySelector('.mural-item.is-selected');
    if (!elemento) { ferramentas.hidden = true; return; }
    const area = camada.getBoundingClientRect();
    const alvo = elemento.getBoundingClientRect();
    const largura = ferramentas.offsetWidth || 0;
    const altura = ferramentas.offsetHeight || 0;
    if (!area.width || !area.height) { ferramentas.hidden = true; return; }
    let esquerda = alvo.left - area.left + ((alvo.width - largura) / 2);
    let topo = alvo.top - area.top - altura - 10;
    if (topo < 4) topo = alvo.bottom - area.top + 10;
    esquerda = Math.min(Math.max(4, esquerda), Math.max(4, area.width - largura - 4));
    topo = Math.min(Math.max(4, topo), Math.max(4, area.height - altura - 4));
    ferramentas.style.left = `${Math.round(esquerda)}px`;
    ferramentas.style.top = `${Math.round(topo)}px`;
  }

  function muralRenderizarToolbar() {
    const ferramentas = cartasUi.muralToolbar;
    if (!ferramentas) return;
    const achado = muralItemSelecionado();
    if (!achado) {
      ferramentas.hidden = true;
      return;
    }
    const { tipo } = achado;
    const onde = tipo === 'carta' ? 'cartinha' : 'enfeite';
    const nomes = {
      ler: 'ler a cartinha',
      menor: `diminuir a ${onde}`,
      maior: `aumentar a ${onde}`,
      'girar-esquerda': `girar a ${onde} pra esquerda`,
      'girar-direita': `girar a ${onde} pra direita`,
      frente: `trazer a ${onde} pra frente`,
      tras: `mandar a ${onde} pra trás`,
      remover: tipo === 'carta' ? 'tirar a cartinha do mural' : 'tirar o enfeite do mural',
    };
    ferramentas.querySelectorAll('[data-mural-acao]').forEach((botao) => {
      const acao = botao.dataset.muralAcao;
      botao.hidden = acao === 'ler' && tipo !== 'carta';
      botao.title = nomes[acao] || acao;
      botao.setAttribute('aria-label', botao.title);
      botao.classList.toggle('danger', acao === 'remover');
    });
    ferramentas.hidden = false;
    muralPosicionarToolbar();
  }

  function muralLimitarTamanho(item, valor) {
    if (MuralModel && typeof MuralModel.mudarTamanho === 'function') {
      return MuralModel.mudarTamanho(item, Number(valor) - Number(item.w || 0));
    }
    item.w = Math.min(0.92, Math.max(0.05, Number(valor) || 0.2));
    return item.w;
  }

  function muralAplicarFonteDoEmoji(elemento, item) {
    if (!elemento || !item || item.page) return;
    if (MuralModel && MuralModel.ehImagem(item.src)) return;
    const tabuleiro = cartasUi.muralBoard;
    const largura = tabuleiro ? tabuleiro.getBoundingClientRect().width * Number(item.w || 0.12) : 40;
    elemento.style.setProperty('--mural-emoji-size', `${Math.max(14, Math.round(largura * 0.9))}px`);
  }

  function muralAjustarDepoisDoTamanho(item) {
    const camada = cartasUi.muralLayer;
    const tabuleiro = cartasUi.muralBoard;
    if (!camada || !tabuleiro || !item) return;
    const elemento = camada.querySelector(`[data-id="${String(item.id).replace(/["\\]/g, '\\$&')}"]`);
    if (!elemento) return;
    elemento.style.width = `${item.w * 100}%`;
    const caixa = tabuleiro.getBoundingClientRect();
    const altura = caixa.height > 0 ? elemento.offsetHeight / caixa.height : 0;
    item.x = Math.min(Math.max(0, 1 - item.w), Math.max(0, item.x));
    item.y = Math.min(Math.max(0, 0.98 - altura), Math.max(0, item.y));
    elemento.style.left = `${item.x * 100}%`;
    elemento.style.top = `${item.y * 100}%`;
    muralAplicarFonteDoEmoji(elemento, item);
  }

  function muralAcaoDoItem(acao) {
    const achado = muralItemSelecionado();
    if (!achado) return;
    const { item, tipo } = achado;
    if (acao === 'ler') {
      if (tipo === 'carta') muralAbrirLeitor({ cartao: item, origem: 'mural' });
      return;
    }
    if (acao === 'remover') {
      if (tipo === 'carta') {
        if (!confirm('tirar essa cartinha do mural? ela não vai ficar guardada em outro lugar. 🌧️')) return;
        muralRemoverCarta(item);
      } else {
        muralRemoverAdesivo(item);
      }
      return;
    }
    if (acao === 'menor' || acao === 'maior') {
      const passo = acao === 'maior' ? 0.06 : -0.06;
      muralLimitarTamanho(item, Number(item.w || 0.2) + passo);
      muralAjustarDepoisDoTamanho(item);
      playSfx(acao === 'maior' ? 1120 : 820, 0.04);
    } else if (acao === 'girar-esquerda' || acao === 'girar-direita') {
      const passo = acao === 'girar-direita' ? 15 : -15;
      if (MuralModel && typeof MuralModel.girarItem === 'function') MuralModel.girarItem(item, passo);
      else item.rotation = Math.min(180, Math.max(-180, Number(item.rotation || 0) + passo));
      playSfx(980, 0.04);
    } else if (acao === 'frente') {
      item.z = muralProximoZ(muralLer());
      playSfx(1160, 0.04);
    } else if (acao === 'tras') {
      const itens = [...(muralLer().cards || []), ...(muralLer().stickers || [])];
      const menor = itens.reduce((baixo, outro) => Math.min(baixo, Number(outro.z) || 0), 10);
      item.z = Math.max(1, menor - 1);
      playSfx(740, 0.04);
    }
    muralGuardar();
    renderMural();
  }

  function muralRenderizarItem(item, tipo) {
    const ehCarta = tipo === 'carta';
    const elemento = cartasElemento('div', `mural-item mural-item-${tipo}` + (Cartas.muralSelecionado === item.id ? ' is-selected' : ''));
    elemento.dataset.id = item.id;
    elemento.dataset.tipo = tipo;
    elemento.style.left = `${item.x * 100}%`;
    elemento.style.top = `${item.y * 100}%`;
    elemento.style.width = `${item.w * 100}%`;
    elemento.style.transform = `rotate(${item.rotation}deg)`;
    elemento.style.zIndex = String(item.z || 20);
    elemento.title = ehCarta
      ? 'arrastar a cartinha · tocar pra ler, aumentar ou girar'
      : 'arrastar o enfeite · tocar pra aumentar ou girar';

    if (ehCarta) {
      elemento.appendChild(cartasElemento('span', 'mural-pin', '📌'));
      const cartao = cartasElemento('div', 'mural-card');
      cartao.appendChild(muralMiniPagina(item.page));
      const info = cartasElemento('div', 'mural-card-info');
      info.appendChild(cartasCriarIcone(item.senderIcon || cartasIconeDoAlias(item.senderAlias), 'mural-card-icon'));
      const nomes = cartasElemento('span', 'mural-card-from');
      nomes.appendChild(cartasElemento('b', '', item.senderAlias || 'alguém'));
      nomes.appendChild(document.createTextNode(' · carta de amiga'));
      info.appendChild(nomes);
      cartao.appendChild(info);
      elemento.appendChild(cartao);
    } else if (MuralModel && !MuralModel.ehImagem(item.src)) {
      elemento.classList.add('mural-item-emoji');
      elemento.appendChild(cartasElemento('span', 'mural-emoji', item.src));
      muralAplicarFonteDoEmoji(elemento, item);
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = '';
      img.draggable = false;
      img.loading = 'lazy';
      elemento.appendChild(img);
    }

    const alca = cartasElemento('span', 'mural-resize', '⤡');
    alca.title = 'arrastar pra aumentar';
    alca.setAttribute('aria-hidden', 'true');
    alca.addEventListener('pointerdown', (evento) => muralRedimensionar(evento, elemento, item));
    elemento.appendChild(alca);

    elemento.addEventListener('pointerdown', (evento) => muralArrastar(evento, elemento, item, tipo));
    elemento.addEventListener('click', (evento) => {
      if (evento.target.closest('.mural-resize')) return;
      if (elemento.dataset.arrastou === '1') return;
      Cartas.muralSelecionado = item.id;
      muralAtualizarSelecao();
    });
    return elemento;
  }

  function muralAtualizarSelecao() {
    if (!cartasUi.muralLayer) return;
    if (!muralItemSelecionado()) Cartas.muralSelecionado = '';
    cartasUi.muralLayer.querySelectorAll('.mural-item').forEach((elemento) => {
      elemento.classList.toggle('is-selected', elemento.dataset.id === Cartas.muralSelecionado);
    });
    muralRenderizarToolbar();
  }

  function muralRedimensionar(evento, elemento, item) {
    if (evento.button !== undefined && evento.button !== 0) return;
    const tabuleiro = cartasUi.muralBoard;
    if (!tabuleiro) return;
    const caixa = tabuleiro.getBoundingClientRect();
    if (!caixa.width || !caixa.height) return;
    evento.preventDefault();
    evento.stopPropagation();
    Cartas.muralSelecionado = item.id;
    muralAtualizarSelecao();
    const inicioX = evento.clientX;
    const inicioW = Number(item.w) || 0.2;
    let moveu = false;
    elemento.classList.add('is-resizing');
    try { elemento.setPointerCapture(evento.pointerId); } catch (error) {   }
    const mover = (movendo) => {
      const dx = (movendo.clientX - inicioX) / caixa.width;
      if (Math.abs(movendo.clientX - inicioX) > 3) moveu = true;
      muralLimitarTamanho(item, inicioW + dx);
      elemento.style.width = `${item.w * 100}%`;
      const altura = caixa.height > 0 ? elemento.offsetHeight / caixa.height : 0;
      item.x = Math.min(Math.max(0, 1 - item.w), Math.max(0, item.x));
      item.y = Math.min(Math.max(0, 0.98 - altura), Math.max(0, item.y));
      elemento.style.left = `${item.x * 100}%`;
      elemento.style.top = `${item.y * 100}%`;
      muralAplicarFonteDoEmoji(elemento, item);
      muralPosicionarToolbar();
    };
    const soltar = () => {
      elemento.classList.remove('is-resizing');
      elemento.removeEventListener('pointermove', mover);
      elemento.removeEventListener('pointerup', soltar);
      elemento.removeEventListener('pointercancel', soltar);
      if (moveu) {
        muralGuardar();
        elemento.dataset.arrastou = '1';
        setTimeout(() => { delete elemento.dataset.arrastou; }, 60);
      }
      muralPosicionarToolbar();
    };
    elemento.addEventListener('pointermove', mover);
    elemento.addEventListener('pointerup', soltar);
    elemento.addEventListener('pointercancel', soltar);
  }

  function muralArrastar(evento, elemento, item, tipo) {
    if (evento.button !== undefined && evento.button !== 0) return;
    if (evento.target && evento.target.closest && evento.target.closest('.mural-resize')) return;
    if (evento.target && evento.target.closest && evento.target.closest('.mural-toolbar')) return;
    const tabuleiro = cartasUi.muralBoard;
    if (!tabuleiro) return;
    const caixa = tabuleiro.getBoundingClientRect();
    if (!caixa.width || !caixa.height) return;
    evento.preventDefault();
    evento.stopPropagation();
    Cartas.muralSelecionado = item.id;
    muralAtualizarSelecao();
    const z = muralProximoZ(muralLer());
    item.z = z;
    elemento.style.zIndex = String(z);

    const inicio = {
      x: evento.clientX,
      y: evento.clientY,
      baseX: item.x,
      baseY: item.y,
    };
    let moveu = false;
    elemento.classList.add('is-dragging');
    try { elemento.setPointerCapture(evento.pointerId); } catch (error) {   }

    const mover = (movendo) => {
      const dx = (movendo.clientX - inicio.x) / caixa.width;
      const dy = (movendo.clientY - inicio.y) / caixa.height;
      if (Math.abs(movendo.clientX - inicio.x) + Math.abs(movendo.clientY - inicio.y) > 3) moveu = true;
      const altura = caixa.height > 0 ? elemento.offsetHeight / caixa.height : 0;
      item.x = Math.min(Math.max(0, 1 - item.w), Math.max(0, inicio.baseX + dx));
      item.y = Math.min(Math.max(0, 0.98 - altura), Math.max(0, inicio.baseY + dy));
      elemento.style.left = `${item.x * 100}%`;
      elemento.style.top = `${item.y * 100}%`;
      muralPosicionarToolbar();
    };
    const soltar = () => {
      elemento.classList.remove('is-dragging');
      elemento.removeEventListener('pointermove', mover);
      elemento.removeEventListener('pointerup', soltar);
      elemento.removeEventListener('pointercancel', soltar);
      if (moveu) {
        elemento.dataset.arrastou = '1';
        muralGuardar();
        setTimeout(() => { delete elemento.dataset.arrastou; }, 60);
      }
      muralPosicionarToolbar();
    };
    elemento.addEventListener('pointermove', mover);
    elemento.addEventListener('pointerup', soltar);
    elemento.addEventListener('pointercancel', soltar);
  }

  function muralRemoverCarta(cartao) {
    if (!cartao) return;
    const mural = muralLer();
    mural.cards = mural.cards.filter((item) => item.id !== cartao.id);
    Cartas.muralSelecionado = '';
    muralGuardar();
    renderMural();
  }

  function muralRemoverCartaPorLetterId(letterId) {
    if (!letterId) return;
    const mural = muralLer();
    const antes = mural.cards.length;
    mural.cards = mural.cards.filter((item) => item.letterId !== String(letterId));
    if (mural.cards.length === antes) return;
    if (Cartas.muralSelecionado && !mural.cards.some((item) => item.id === Cartas.muralSelecionado)) {
      Cartas.muralSelecionado = '';
    }
    muralGuardar();
    if (state.currentView === 'mural') renderMural();
  }

  function muralRemoverAdesivo(adesivo) {
    if (!adesivo) return;
    const mural = muralLer();
    mural.stickers = mural.stickers.filter((item) => item.id !== adesivo.id);
    Cartas.muralSelecionado = '';
    muralGuardar();
    renderMural();
  }

  function muralAdicionarCarta(letter) {
    if (!letter || !letter.id) return null;
    const info = cartasPaginaDaCarta(letter);
    if (!info) return null;
    const letterId = String(letter.id);
    const mural = muralLer();
    const existente = mural.cards.find((item) => item.letterId === letterId);
    if (existente) {
      Cartas.muralSelecionado = existente.id;
      renderMural();
      return existente;
    }

    const posicao = MuralModel
      ? MuralModel.posicaoNova(mural.cards.length)
      : { x: 0.04, y: 0.05, w: 0.44, rotation: -2 };
    const art = info.pagina.letterArt || (cartasModelo() ? cartasModelo().arteDaCarta(letter.art) : 'letter1');
    const cartao = {
      id: `mural-${letterId}`,
      letterId,
      art,
      senderAlias: String(letter.senderAlias || 'alguém').slice(0, 32),
      senderIcon: cartasNormalizarIcone(letter.senderIcon || (letter.payload && letter.payload.icon), ''),
      page: info.pagina,
      ...posicao,
      z: muralProximoZ(mural),
      createdAt: new Date().toISOString(),
    };
    mural.cards.push(cartao);
    Cartas.mural = MuralModel ? MuralModel.normalizarMural(mural) : mural;
    Cartas.muralDiario = diarioAtivoId;
    muralGuardar();
    cartasRemoverAberta(letterId);
    cartasLembrarIconeDoRemetente(cartao.senderAlias, cartao.senderIcon);
    Cartas.muralSelecionado = cartao.id;
    if (state.currentView === 'mural') renderMural();
    else muralAtualizarBadge();
    return cartao;
  }

  function muralSelecionarCartaDaCarta(letterId) {
    if (!letterId) return;
    const cartao = muralLer().cards.find((item) => item.letterId === String(letterId));
    if (!cartao) return;
    Cartas.muralSelecionado = cartao.id;
    muralAtualizarSelecao();
    const elemento = cartasUi.muralLayer
      ? cartasUi.muralLayer.querySelector(`[data-id="${String(cartao.id).replace(/["\\]/g, '\\$&')}"]`)
      : null;
    if (elemento) {
      elemento.classList.add('is-pulando');
      setTimeout(() => elemento.classList.remove('is-pulando'), 900);
      try { elemento.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (error) {   }
    }
  }

  function muralRenderizarPendentes() {
    if (!cartasUi.muralPending || !cartasUi.muralPendingList) return;
    const abertas = cartasLerAbertas();
    cartasUi.muralPending.hidden = !abertas.length;
    cartasUi.muralPendingList.innerHTML = '';
    abertas.forEach((item) => {
      const carta = item.letter;
      const pagina = carta.payload && carta.payload.page ? carta.payload.page : {};
      const cabeca = cartasElemento('div', 'mural-pending-item');
      cabeca.appendChild(cartasCriarIcone(
        carta.senderIcon || cartasIconeDoAlias(carta.senderAlias),
        'mural-pending-icon',
      ));
      const info = cartasElemento('div', 'mural-pending-info');
      info.appendChild(cartasElemento('span', 'mural-pending-title', `carta de ${carta.senderAlias || 'alguém'}`));
      const resumo = String(pagina.title || pagina.body || '').replace(/\s+/g, ' ').trim();
      info.appendChild(cartasElemento(
        'span',
        'mural-pending-sub',
        resumo ? (resumo.length > 48 ? `${resumo.slice(0, 48)}…` : resumo) : 'com enfeites ⋆',
      ));
      cabeca.appendChild(info);
      const acoes = cartasElemento('div', 'mural-pending-actions');
      acoes.appendChild(cartasBotao('ler', 'letter-mini-btn', () => {
        muralAbrirLeitor({ letter: carta, origem: 'aberta' });
      }));
      acoes.appendChild(cartasBotao('📖 diário', 'letter-mini-btn', async () => {
        await cartasEscolherDestinoDaAberta(carta, 'diario');
        renderMural();
      }));
      acoes.appendChild(cartasBotao('📌 mural', 'letter-mini-btn primary', async () => {
        await cartasEscolherDestinoDaAberta(carta, 'mural');
        renderMural();
      }));
      cabeca.appendChild(acoes);
      cartasUi.muralPendingList.appendChild(cabeca);
    });
  }

  function renderMural() {
    if (!cartasUi.muralLayer) return;
    const mural = muralLer();
    muralAplicarTema();
    cartasUi.muralLayer.innerHTML = '';
    const itens = [
      ...mural.cards.map((carta) => ({ tipo: 'carta', item: carta })),
      ...mural.stickers.map((adesivo) => ({ tipo: 'adesivo', item: adesivo })),
    ].sort((a, b) => (Number(a.item.z) || 0) - (Number(b.item.z) || 0));
    itens.forEach(({ tipo, item }) => {
      cartasUi.muralLayer.appendChild(muralRenderizarItem(item, tipo));
    });
    if (cartasUi.muralEmpty) cartasUi.muralEmpty.hidden = itens.length > 0;
    muralRenderizarPendentes();
    muralAtualizarBadge();
    muralAtualizarSelecao();
  }

  function muralAbrirLeitor({ cartao = null, letter = null, origem = 'mural' } = {}) {
    const carta = cartao || null;
    const pagina = origem === 'mural' && carta
      ? carta.page
      : (letter && letter.payload && letter.payload.page);
    if (!pagina) return;
    Cartas.leitorAberto = { origem, cartao: carta, letter };
    if (cartasUi.leitorTitulo) cartasUi.leitorTitulo.textContent = origem === 'mural' ? 'uma cartinha do mural' : 'uma cartinha aberta';
    if (cartasUi.leitorSubtitulo) {
      cartasUi.leitorSubtitulo.textContent = origem === 'mural'
        ? 'guardada com carinho no seu mural ⋆'
        : 'ela ainda está esperando um cantinho ♡';
    }
    cartasDesenharPaginaEm(cartasUi.leitorFolha, pagina, 'mural-reader-sheet');
    if (cartasUi.leitorDe) {
      cartasUi.leitorDe.innerHTML = '';
      const apelido = (origem === 'mural' ? carta.senderAlias : letter.senderAlias) || 'alguém';
      cartasUi.leitorDe.appendChild(cartasCriarIcone(
        (origem === 'mural' ? carta.senderIcon : letter.senderIcon) || (letter && letter.payload && letter.payload.icon) || cartasIconeDoAlias(apelido),
        'mural-reader-icon',
      ));
      cartasUi.leitorDe.appendChild(cartasElemento('span', '', `de ${apelido}`));
    }
    if (cartasUi.leitorMural) {
      cartasUi.leitorMural.textContent = origem === 'mural' ? '✕ tirar do mural' : '📌 guardar no mural';
    }
    if (cartasUi.leitor) cartasUi.leitor.classList.add('open');
    playSfx(1050, 0.06);
  }

  function muralFecharLeitor() {
    if (cartasUi.leitor) cartasUi.leitor.classList.remove('open');
    Cartas.leitorAberto = null;
  }

  function muralRenderizarTema() {
    const mural = muralLer();
    if (cartasUi.temaNome) cartasUi.temaNome.value = mural.title || 'meu mural';
    if (cartasUi.temaCor) cartasUi.temaCor.value = mural.tint || '#f3c9d3';
    if (cartasUi.temaEstado) cartasUi.temaEstado.textContent = 'guardado sozinho ✧';

    if (cartasUi.temaFundos) {
      cartasUi.temaFundos.innerHTML = '';
      const nomes = {
        pinboard: 'cortiça',
        linho: 'linho',
        papel: 'papel',
        rosa: 'rosinha',
        noite: 'noite',
      };
      (MuralModel ? MuralModel.FUNDOS : ['pinboard', 'linho', 'papel', 'rosa', 'noite']).forEach((fundo) => {
        const botao = cartasElemento('button', `mural-bg-option mural-bg-preview-${fundo}` + (mural.background === fundo ? ' is-escolhido' : ''));
        botao.type = 'button';
        botao.title = `fundo ${nomes[fundo] || fundo}`;
        botao.setAttribute('aria-label', `fundo ${nomes[fundo] || fundo}`);
        botao.appendChild(cartasElemento('span', 'mural-bg-option-nome', nomes[fundo] || fundo));
        botao.addEventListener('click', () => {
          const atual = muralLer();
          atual.background = fundo;
          muralGuardar();
          muralAplicarTema();
          muralRenderizarTema();
          playSfx(1080, 0.04);
        });
        cartasUi.temaFundos.appendChild(botao);
      });
    }

    if (cartasUi.temaAdesivos) {
      cartasMontarGaleriaDeAdesivos(cartasUi.temaAdesivos, {
        comEmojis: true,
        onde: 'no mural',
        aoEscolher: (src) => muralAdicionarEnfeite(src),
      });
    }
  }

  function muralAbrirTema() {
    if (!cartasUi.tema) return;
    muralRenderizarTema();
    cartasUi.tema.classList.add('open');
    playSfx(1050, 0.06);
  }

  function muralFecharTema() {
    if (cartasUi.tema) cartasUi.tema.classList.remove('open');
    muralAplicarTema();
  }

  function muralAdicionarEnfeite(src) {
    if (!src) return null;
    const mural = muralLer();
    const indice = mural.stickers.length;
    const ehEmoji = Boolean(MuralModel && !MuralModel.ehImagem(src));
    const colunas = 5;
    const coluna = indice % colunas;
    const linha = Math.floor(indice / colunas);
    const adesivo = {
      id: `mural-sticker-${Date.now().toString(36)}-${indice + 1}`,
      src,
      x: Math.min(0.94, 0.05 + (coluna * 0.185)),
      y: Math.min(0.9, 0.07 + ((linha % 5) * 0.16)),
      w: ehEmoji ? 0.11 : 0.16,
      rotation: -8 + ((indice % 5) * 4),
      z: muralProximoZ(mural),
    };
    mural.stickers.push(adesivo);
    Cartas.mural = MuralModel ? MuralModel.normalizarMural(mural) : mural;
    Cartas.muralSelecionado = adesivo.id;
    muralGuardar();
    renderMural();
    showToast(ehEmoji ? `${src} colado no mural!` : '🎀 enfeite colado no mural!');
    playSfx(1120, 0.05);
    return adesivo;
  }

  muralAtualizarBadge();

  const cartasReposicionarFerramentas = () => {
    muralPosicionarToolbar();
    cartasPosicionarFerramentas();
  };
  window.addEventListener('resize', cartasReposicionarFerramentas);
  window.addEventListener('scroll', cartasReposicionarFerramentas, { passive: true });
  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    if (Cartas.muralSelecionado) {
      Cartas.muralSelecionado = '';
      muralAtualizarSelecao();
    }
    if (Cartas.adesivoSelecionado) cartasSelecionarAdesivo('');
  });

  window.CrechezinhaCartas = {
    aoEntrarNoApp: cartasAoEntrarNoApp,
    verificarNovas: cartasVerificarNovas,
    abrir: cartasAbrirCaixinha,
    abrirPorCodigo: cartasAbrirPorCodigo,
    aceitarConvite: cartasAceitarConvite,
    atualizarSelo: cartasAtualizarSeloDaCarta,
    abrirMural: () => switchView('mural'),
  };
  window.CrechezinhaMural = {
    abrir: () => switchView('mural'),
    render: renderMural,
    ler: muralLer,
    adicionarCarta: muralAdicionarCarta,
    cartinhasAbertas: cartasLerAbertas,
  };

  if (state.username) setTimeout(cartasAoEntrarNoApp, 1800);

  (async function modoDeTeste() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (error) {
      return;
    }
    if (params.get('dev') !== '1') return;

    const cenario = String(params.get('dbg') || '');

    if (cenario) splashBloqueada = true;

    const nome = params.get('nome') || 'teste';
    const comoNovo = params.get('novo') === '1';
    if (!comoNovo) {
      state.username = nome;
      guardarNoNavegador('pooftie_username', nome);
      guardarNoNavegador(CHAVE_AVISO_SILENCIADO, NOTICE_VERSION);
      updateIpodTitle(nome);
    }
    if (window.PooftieAPI && window.PooftieAPI.setUser) window.PooftieAPI.setUser('dev-teste');
    if (splashScreen) splashScreen.classList.add('hidden');

    if (!cenario) {
      if (!comoNovo) {
        if (splashNameBox) splashNameBox.hidden = true;
        if (btnEnterLabel) btnEnterLabel.textContent = 'entrar no diário';
      }
      return;
    }

    if (cenario === 'write' || cenario === 'book' || cenario === 'pages') {
      if (!readEntries().length) {
        const hoje = hojeStr();
        const diaAnterior = diaSeguinte(hoje);
        await escreverEntradas({
          id: Date.now(),
          date: hoje,
          title: params.get('titulo') || 'dia de chuva',
          body: params.get('texto') || 'hoje o dia foi calminho como uma nuvem. escrevi bastante no meu diário e guardei tudo com carinho ♡',
          textSpans: [],
          stickers: [],
          pages: [
            { id: `pag-${hoje}-1`, title: 'dia de chuva', body: 'hoje o dia foi calminho como uma nuvem. escrevi bastante no meu diário e guardei tudo com carinho ♡', pattern: 'lines', textSpans: [], stickers: [] },
            { id: `pag-${hoje}-2`, title: 'de tardezinha', body: 'de tardezinha eu fiz um chazinho e olhei a chuva pela janela ⋆ ˚｡⋆', pattern: 'spiral', textSpans: [], stickers: [] }
          ]
        });
        await escreverEntradas({
          id: Date.now() + 1,
          date: diaAnterior,
          title: 'ontem',
          body: 'ontem eu escrevi pouquinho, mas escrevi ♡',
          pattern: 'dots',
          textSpans: [],
          stickers: []
        });
        carregarMemoriaNoRascunho(readEntries().find((e) => e.date === hoje) || null, hoje);
      }
    }

    if (cenario === 'write' || cenario === 'book') {
      abrirLivrinho({ abrirDireto: cenario === 'write' });
    } else if (cenario === 'pages') {
      abrirLivrinho({ abrirDireto: true });
      setTimeout(() => {
        renderHistory();
        historyModal.classList.add('open');
      }, 320);
    } else if (cenario === 'diaries') {
      setTimeout(() => abrirDiarios(), 320);
    } else if (cenario === 'news') {
      renderNovidades();
      setTimeout(() => abrirAvisoDeNovidades({ forcar: true }), 320);
    } else if (cenario === 'cover') {
      switchView('cover');
    } else if (cenario === 'page') {
      switchView('page');
    } else if (cenario === 'folha') {
      const hojeDaFolha = hojeStr();
      const entradaDaFolha = readEntries().find((e) => e.date === hojeDaFolha) || null;
      if (entradaDaFolha) carregarMemoriaNoRascunho(entradaDaFolha, hojeDaFolha);
      switchView('page');
      const medirFolha = (alvo, base) => {
        if (!alvo || !base) return null;
        const caixa = base.getBoundingClientRect();
        const dono = alvo.getBoundingClientRect();
        if (!caixa.width || !caixa.height) return null;
        return {
          base: { x: caixa.x, y: caixa.y, w: caixa.width, h: caixa.height },
          caminha: { x: dono.x, y: dono.y, w: dono.width, h: dono.height },
          adesivos: [...alvo.querySelectorAll('.placed-sticker')].map((el) => {
            const r = el.getBoundingClientRect();
            return {
              esq: parseFloat(el.style.left) || 0,
              topo: parseFloat(el.style.top) || 0,
              x: r.x, y: r.y, w: r.width, h: r.height,
              xn: (r.x - dono.x) / dono.width,
              yn: (r.y - dono.y) / dono.height,
              wn: r.width / dono.width
            };
          })
        };
      };
      window.__DIAG_FOLHA__ = {
        escrever: medirFolha(pageStickersOverlay, document.getElementById('diary-paper')),
        folhear: null,
        janela: [window.innerWidth, window.innerHeight]
      };
      const anotarFolhear = () => {
        const folhas = [...document.querySelectorAll('.flip-page-sheet')].filter((f) => f.offsetWidth > 0);
        const comAdesivo = folhas.find((f) => f.querySelector('.flip-stickers .placed-sticker')) || folhas[0] || null;
        if (!comAdesivo) return false;
        const caminha = comAdesivo.querySelector('.flip-stickers');
        const medida = medirFolha(caminha, comAdesivo);
        if (!medida) return false;
        medida.regua = {
          fit: comAdesivo.style.getPropertyValue('--flip-fit'),
          entrada: comAdesivo.style.getPropertyValue('--flip-entrada'),
          baseL: comAdesivo.style.getPropertyValue('--flip-base-largura'),
          baseA: comAdesivo.style.getPropertyValue('--flip-base-altura')
        };
        window.__DIAG_FOLHA__.folhear = medida;
        return true;
      };
      abrirLivrinho({ abrirDireto: true });
      let tentativas = 0;
      const esperarFolhear = setInterval(() => {
        tentativas += 1;
        if (anotarFolhear() || tentativas > 40) clearInterval(esperarFolhear);
      }, 250);
    }
  })();

  const VERSAO_DO_APP = '2.31.0';

  function ligarOServiceWorker() {
    if (window.CrechezinhaNative && window.CrechezinhaNative.isNative) return;
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;
    try {
      navigator.serviceWorker.register(`sw.js?v=${VERSAO_DO_APP}`, { scope: './' })
        .then((registro) => {
          window.__crechezinhaSW = registro;
          if (registro.waiting) avisarQueAtualizou(registro);
          registro.addEventListener('updatefound', () => {
            const novo = registro.installing;
            if (!novo) return;
            novo.addEventListener('statechange', () => {
              if (novo.state === 'installed' && navigator.serviceWorker.controller) {
                avisarQueAtualizou(registro);
              }
            });
          });
        })
        .catch((erro) => {
          console.warn('[crechezinha] sem service worker (o app funciona igual):', erro && erro.message);
        });
    } catch (erro) {
      console.warn('[crechezinha] sem service worker (o app funciona igual):', erro && erro.message);
    }
  }

  let jaAvisouDaAtualizacao = false;
  function avisarQueAtualizou(registro) {
    if (jaAvisouDaAtualizacao) return;
    jaAvisouDaAtualizacao = true;
    const guardado = localStorage.getItem('pooftie_sw_version');
    if (guardado === VERSAO_DO_APP) return;
    localStorage.setItem('pooftie_sw_version', VERSAO_DO_APP);
    try {
      (registro.active || navigator.serviceWorker.controller || {}).postMessage?.({ tipo: 'limpar-cache' });
    } catch (erro) {   }
    showToast('✧ versão novinha! recarrega pra ver ⋆', true);
  }

  ligarOServiceWorker();

  let conviteDeInstalar = null;

  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    conviteDeInstalar = evento;
    window.__crechezinhaPodeInstalar = true;
  });

  window.addEventListener('appinstalled', () => {
    conviteDeInstalar = null;
    window.__crechezinhaPodeInstalar = false;
  });

  window.crechezinhaInstalarApp = async function instalarApp() {
    if (!conviteDeInstalar) return false;
    const convite = conviteDeInstalar;
    conviteDeInstalar = null;
    try {
      convite.prompt();
      const escolha = await convite.userChoice;
      return Boolean(escolha && escolha.outcome === 'accepted');
    } catch (erro) {
      return false;
    }
  };


  function irParaEscrever() {
    try {
      if (pularIntro) pularIntro();
      else esconderIntroInicial();
      splashBloqueada = true;
      splashScreen.classList.add('hidden');

      const modalDoLivrinho = document.getElementById('flip-modal');
      if (modalDoLivrinho && modalDoLivrinho.classList.contains('open')) {
        const fechar = document.getElementById('flip-close');
        if (fechar) fechar.click();
      }

      const corpo = document.getElementById('diary-body');
      if (corpo) {
        try { corpo.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (erro) {   }
        setTimeout(() => {
          try { corpo.focus({ preventScroll: true }); } catch (erro) {   }
        }, 350);
      }
    } catch (erro) {
      console.warn('[crechezinha] atalho de escrever:', erro && erro.message);
    }
  }

  function abrirAtalho(tipo) {
    const atalho = String(tipo || '');
    if (!atalho) return;
    window.__crechezinhaTemAtalho = true;
    if (!state.username) {
      window.__crechezinhaAtalhoPendente = atalho;
      return;
    }
    window.__crechezinhaAtalhoPendente = null;
    if (atalho === 'escrever') {
      irParaEscrever();
    } else if (atalho === 'folhear') {
      try { abrirOFolhear(); } catch (erro) { console.warn('[crechezinha] atalho de folhear:', erro && erro.message); }
    }
  }

  function consumirAtalhoPendente() {
    const pendente = window.__crechezinhaAtalhoPendente;
    if (pendente) abrirAtalho(pendente);
  }

  function consumirAtalho() {
    let atalho = window.__crechezinhaAtalhoPendente || '';
    if (!atalho) {
      try {
        atalho = new URLSearchParams(window.location.search).get('atalho') || '';
      } catch (erro) {   }
    }
    if (atalho) abrirAtalho(atalho);
  }

  window.addEventListener('crechezinha:atalho', (evento) => abrirAtalho(evento.detail));
  consumirAtalho();
  setTimeout(consumirAtalhoPendente, 800);
  setTimeout(consumirAtalhoPendente, 2200);

  const btnWidget = document.getElementById('btn-widget');
  const widgetModal = document.getElementById('widget-modal');
  const widgetBackdrop = document.getElementById('widget-backdrop');
  const btnWidgetClose = document.getElementById('btn-widget-close');
  const btnWidgetDone = document.getElementById('btn-widget-done');
  const widgetPreview = document.getElementById('widget-preview');
  const widgetPreviewCal = document.getElementById('widget-preview-cal');
  const widgetPreviewStickers = document.getElementById('widget-preview-stickers');
  const widgetPreviewFoto = document.getElementById('widget-preview-foto');
  const widgetFotoImg = document.getElementById('wp-foto-img');
  const widgetDayNumber = document.getElementById('wp-card-dia');
  const widgetDayMonth = document.getElementById('wp-card-mes');
  const widgetModeEl = document.getElementById('widget-mode');
  const widgetLayoutEl = document.getElementById('widget-layout');
  const widgetSizeEl = document.getElementById('widget-size');
  const widgetBgColor = document.getElementById('widget-bg-color');
  const widgetBgColorReset = document.getElementById('widget-bg-color-reset');
  const widgetFontEl = document.getElementById('widget-font');
  const widgetBgStrip = document.getElementById('widget-bg-strip');
  const widgetBgUpload = document.getElementById('widget-bg-upload');
  const widgetBgImageClear = document.getElementById('widget-bg-image-clear');
  const widgetSelectedEl = document.getElementById('widget-selected');
  const widgetSizeRange = document.getElementById('widget-sticker-size');
  const widgetRotationRange = document.getElementById('widget-sticker-rotation');
  const widgetFlipBtn = document.getElementById('widget-sticker-flip');
  const widgetDeleteBtn = document.getElementById('widget-sticker-del');
  const widgetCountEl = document.getElementById('widget-count');
  const widgetCategoryEl = document.getElementById('widget-category');
  const widgetStripEl = document.getElementById('widget-sticker-strip');
  const widgetSaveStateEl = document.getElementById('widget-save-state');

  let widgetSelecionado = '';
  let widgetCategoria = '';
  let timerSalvarWidget = null;

  const DIAS_DA_SEMANA_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const FAMILIA_DAS_FONTES = {
    app: '',
    caveat: "'Caveat', cursive",
    patrick: "'Patrick Hand', cursive",
    nunito: "'Nunito', sans-serif",
    gloria: "'Gloria Hallelujah', cursive",
    marck: "'Marck Script', cursive",
    indie: "'Indie Flower', cursive"
  };

  function adesivoSelecionadoDoWidget() {
    if (!widgetConfig || !widgetSelecionado) return null;
    return widgetConfig.adesivos.find((item) => item.id === widgetSelecionado) || null;
  }

  function desenharCalendarioDaPrevia() {
    if (!widgetPreviewCal) return;
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const hoje = agora.getDate();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const diasNoAnterior = new Date(ano, mes, 0).getDate();
    const comMemoria = new Set(readEntries().map((entrada) => entrada && entrada.date).filter(Boolean));

    let celulas = '';
    for (let i = 0; i < 42; i++) {
      const posicao = i - primeiroDia + 1;
      let dia = posicao;
      let fora = false;
      let data = '';
      if (posicao < 1) {
        dia = diasNoAnterior + posicao;
        fora = true;
      } else if (posicao > diasNoMes) {
        dia = posicao - diasNoMes;
        fora = true;
      }
      if (!fora) {
        data = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      }
      const classes = ['wp-cal-dia'];
      if (fora) classes.push('fora');
      if (!fora && dia === hoje) classes.push('hoje');
      if (data && comMemoria.has(data)) classes.push('memoria');
      celulas += `<span class="${classes.join(' ')}">${dia}</span>`;
    }

    widgetPreviewCal.innerHTML = `
      <div class="wp-cal-head">
        <span class="wp-cal-mes">${monthNames[mes]}</span>
        <span class="wp-cal-ano">${ano}</span>
      </div>
      <div class="wp-cal-semana">${DIAS_DA_SEMANA_CURTOS.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="wp-cal-grade">${celulas}</div>
      <div class="wp-cal-pill">toque pra abrir</div>
    `;
  }

  function atualizarCartaoDaPrevia() {
    const agora = new Date();
    if (widgetDayNumber) widgetDayNumber.textContent = String(agora.getDate());
    if (widgetDayMonth) widgetDayMonth.textContent = monthNames[agora.getMonth()];
  }

  function marcarAdesivoDoWidget(id) {
    widgetSelecionado = id || '';
    if (widgetPreviewStickers) {
      widgetPreviewStickers.querySelectorAll('.wp-sticker').forEach((img) => {
        img.classList.toggle('is-selected', img.dataset.id === widgetSelecionado);
      });
    }
    const item = adesivoSelecionadoDoWidget();
    if (widgetSelectedEl) widgetSelectedEl.hidden = !item;
    if (item) {
      if (widgetSizeRange) widgetSizeRange.value = String(Math.round(item.tamanho * 100));
      if (widgetRotationRange) widgetRotationRange.value = String(item.rotacao);
      if (widgetFlipBtn) widgetFlipBtn.setAttribute('aria-pressed', item.flip ? 'true' : 'false');
    }
  }

  function selecionarAdesivoDoWidget(id) {
    marcarAdesivoDoWidget(id);
  }

  function transformacaoDoAdesivoWidget(item) {
    return `translate(-50%, -50%) rotate(${item.rotacao}deg)${item.flip ? ' scaleX(-1)' : ''}`;
  }

  function arrastarAdesivoDoWidget(evento, id) {
    const item = widgetConfig && widgetConfig.adesivos.find((a) => a.id === id);
    if (!item || !widgetPreview) return;
    evento.preventDefault();
    evento.stopPropagation();
    marcarAdesivoDoWidget(id);
    const caixa = widgetPreview.getBoundingClientRect();
    if (!caixa.width || !caixa.height) return;
    const inicioX = evento.clientX;
    const inicioY = evento.clientY;
    const baseX = item.x;
    const baseY = item.y;
    const img = widgetPreviewStickers?.querySelector(`.wp-sticker[data-id="${id}"]`);

    function aoMover(ev) {
      const x = Math.max(0, Math.min(1, baseX + (ev.clientX - inicioX) / caixa.width));
      const y = Math.max(0, Math.min(1, baseY + (ev.clientY - inicioY) / caixa.height));
      item.x = Math.round(x * 10000) / 10000;
      item.y = Math.round(y * 10000) / 10000;
      if (img) {
        img.style.left = `${item.x * 100}%`;
        img.style.top = `${item.y * 100}%`;
      }
    }

    function aoSoltar() {
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
      window.removeEventListener('pointercancel', aoSoltar);
      widgetConfig = WidgetConfig.atualizar(widgetConfig, id, { x: item.x, y: item.y });
      agendarSalvarWidget();
    }

    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerup', aoSoltar);
    window.addEventListener('pointercancel', aoSoltar);
  }

  function renderizarAdesivosDaPrevia() {
    if (!widgetPreviewStickers) return;
    widgetPreviewStickers.innerHTML = '';
    if (!widgetConfig) return;
    widgetConfig.adesivos.forEach((item) => {
      const img = document.createElement('img');
      img.className = 'wp-sticker' + (item.id === widgetSelecionado ? ' is-selected' : '');
      img.dataset.id = item.id;
      img.src = item.src;
      img.alt = 'adesivo do widget';
      img.draggable = false;
      img.decoding = 'async';
      img.style.left = `${item.x * 100}%`;
      img.style.top = `${item.y * 100}%`;
      img.style.width = `${item.tamanho * 100}%`;
      img.style.transform = transformacaoDoAdesivoWidget(item);
      img.addEventListener('pointerdown', (evento) => arrastarAdesivoDoWidget(evento, item.id));
      widgetPreviewStickers.appendChild(img);
    });
  }

  function imagensDaGaleriaDoWidget() {
    const vistas = new Set();
    const itens = [];
    const adicionar = (label, src) => {
      const limpo = WidgetConfig && WidgetConfig.normalizarImagem
        ? WidgetConfig.normalizarImagem(src)
        : '';
      if (!limpo || vistas.has(limpo)) return;
      vistas.add(limpo);
      itens.push({ label, src: limpo });
    };

    try {
      if (typeof bgList !== 'undefined' && Array.isArray(bgList)) {
        bgList.forEach((bg) => {
          if (bg && bg.src) adicionar(bg.label, bg.src);
        });
      }
    } catch (error) {   }

    ['pooftie_ipod_bg', 'pooftie_todo_bg', 'pooftie_flip_bg'].forEach((chave) => {
      try {
        const salvo = localStorage.getItem(chave);
        if (salvo) adicionar('minha foto', salvo);
      } catch (error) {   }
    });

    if (widgetConfig && widgetConfig.imagem) adicionar('a do widget', widgetConfig.imagem);
    return itens;
  }

  function luminosidadeDaCor(hex) {
    const cor = String(hex || '').replace('#', '');
    if (cor.length !== 6) return 1;
    const r = parseInt(cor.slice(0, 2), 16) / 255;
    const g = parseInt(cor.slice(2, 4), 16) / 255;
    const b = parseInt(cor.slice(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function atualizarCoresDaPrevia() {
    if (!widgetPreview || !widgetConfig) return;
    const cor = widgetConfig.corFundo || (WidgetConfig ? WidgetConfig.COR_PADRAO : '#f8f0ea');
    const escuro = luminosidadeDaCor(cor) < 0.52;
    widgetPreview.style.setProperty('--wp-fundo', cor);
    widgetPreview.style.setProperty('--wp-ink', escuro ? '#fffdfc' : '#463529');
    widgetPreview.style.setProperty('--wp-muted', escuro ? 'rgba(255, 253, 252, 0.74)' : 'rgba(70, 53, 41, 0.62)');
    widgetPreview.style.setProperty('--wp-linha', escuro ? 'rgba(255, 253, 252, 0.28)' : 'rgba(70, 53, 41, 0.18)');
    widgetPreview.style.setProperty('--wp-hoje', escuro ? '#f0c9d0' : '#d9a3a3');
    widgetPreview.style.setProperty('--wp-hoje-texto', escuro ? '#4a3330' : '#ffffff');
    widgetPreview.style.setProperty('--wp-pilula', escuro ? 'rgba(255, 253, 252, 0.20)' : '#f5dee1');
    widgetPreview.style.setProperty('--wp-pilula-texto', escuro ? 'rgba(255, 253, 252, 0.94)' : '#6b4a44');
    widgetPreview.style.setProperty('--wp-ponto', escuro ? 'rgba(255, 253, 252, 0.85)' : '#c98b8b');
  }

  function definirImagemDoWidget(src) {
    if (!WidgetConfig || !widgetConfig) return;
    widgetConfig = WidgetConfig.normalizar({ ...widgetConfig, imagem: src });
    renderizarCarinhaDoWidget();
    agendarSalvarWidget();
    playSfx(1080, 0.06, 'triangle');
  }

  function renderizarGaleriaDoWidget() {
    if (!widgetBgStrip || !widgetConfig) return;
    const itens = imagensDaGaleriaDoWidget();
    widgetBgStrip.innerHTML = '';

    const sem = document.createElement('button');
    sem.type = 'button';
    sem.className = 'widget-bg-item sem' + (!widgetConfig.imagem ? ' is-active' : '');
    sem.textContent = 'sem';
    sem.title = 'sem imagem de fundo';
    sem.addEventListener('click', () => definirImagemDoWidget(''));
    widgetBgStrip.appendChild(sem);

    itens.forEach((item) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'widget-bg-item' + (widgetConfig.imagem === item.src ? ' is-active' : '');
      botao.title = item.label;
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.label;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      botao.appendChild(img);
      botao.addEventListener('click', () => definirImagemDoWidget(item.src));
      widgetBgStrip.appendChild(botao);
    });

    if (widgetBgImageClear) widgetBgImageClear.hidden = !widgetConfig.imagem;
  }

  function renderizarCarinhaDoWidget() {
    if (!widgetConfig) return;
    if (widgetPreview) {
      widgetPreview.classList.toggle('modo-escrever', widgetConfig.modo === 'escrever');
      widgetPreview.classList.toggle('modo-calendario', widgetConfig.modo !== 'escrever');
      widgetPreview.classList.toggle('layout-deitado', widgetConfig.layout === 'deitado');
      widgetPreview.classList.toggle('layout-quadrado', widgetConfig.layout !== 'deitado');
      widgetPreview.classList.toggle('fonte-escolhida', widgetConfig.fonte !== 'app');
      widgetPreview.dataset.fonte = widgetConfig.fonte;
      widgetPreview.classList.remove('tamanho-pequeno', 'tamanho-medio', 'tamanho-grande');
      widgetPreview.classList.add(`tamanho-${widgetConfig.tamanho}`);
      widgetPreview.style.setProperty('--wp-font', FAMILIA_DAS_FONTES[widgetConfig.fonte] || '');
      atualizarCoresDaPrevia();

      const foto = widgetConfig.imagem || '';
      widgetPreview.classList.toggle('tem-foto', Boolean(foto));
      if (widgetPreviewFoto && widgetFotoImg) {
        widgetPreviewFoto.hidden = !foto;
        if (foto) {
          if (widgetFotoImg.getAttribute('src') !== foto) widgetFotoImg.src = foto;
          widgetFotoImg.alt = 'imagem de fundo do widget';
        } else {
          widgetFotoImg.removeAttribute('src');
          widgetFotoImg.alt = '';
        }
      }
    }

    widgetModeEl?.querySelectorAll('button').forEach((botao) => {
      botao.classList.toggle('active', botao.dataset.modo === widgetConfig.modo);
    });
    widgetLayoutEl?.querySelectorAll('button').forEach((botao) => {
      botao.classList.toggle('active', botao.dataset.layout === widgetConfig.layout);
    });
    widgetSizeEl?.querySelectorAll('button').forEach((botao) => {
      botao.classList.toggle('active', botao.dataset.tamanho === widgetConfig.tamanho);
    });
    if (widgetBgColor) widgetBgColor.value = widgetConfig.corFundo;
    if (widgetFontEl) widgetFontEl.value = widgetConfig.fonte;
    renderizarGaleriaDoWidget();
  }

  function categoriaDoWidget() {
    if (!stickerCategories.length) {
      try { stickerCategories = buildStickerCategories(); } catch (error) { stickerCategories = []; }
    }
    return stickerCategories.find((categoria) => categoria.key === widgetCategoria)
      || stickerCategories[0]
      || null;
  }

  function renderizarCategoriasDoWidget() {
    if (!widgetCategoryEl) return;
    if (!stickerCategories.length) {
      try { stickerCategories = buildStickerCategories(); } catch (error) { stickerCategories = []; }
    }
    if (!stickerCategories.length) {
      widgetCategoryEl.innerHTML = '<option value="">sem adesivos 🌸</option>';
      return;
    }
    if (!widgetCategoria || !stickerCategories.some((c) => c.key === widgetCategoria)) {
      widgetCategoria = stickerCategories[0].key;
    }
    widgetCategoryEl.innerHTML = stickerCategories.map((categoria) => {
      const total = itensDaCategoria(categoria).length;
      return `<option value="${categoria.key}"${categoria.key === widgetCategoria ? ' selected' : ''}>${categoria.emoji} ${categoria.label} (${total})</option>`;
    }).join('');
  }

  function renderizarAdesivosDoWidget() {
    if (!widgetStripEl) return;
    const categoria = categoriaDoWidget();
    const itens = categoria ? itensDaCategoria(categoria) : [];
    if (!itens.length) {
      widgetStripEl.innerHTML = '<span class="widget-strip-vazio">essa pastinha está vazia 🌸</span>';
      return;
    }
    const limite = 120;
    widgetStripEl.innerHTML = '';
    itens.slice(0, limite).forEach((entry) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'widget-strip-item';
      botao.title = 'colar no widget';
      const img = document.createElement('img');
      img.src = entry.src;
      img.alt = 'adesivo';
      img.loading = 'lazy';
      img.decoding = 'async';
      botao.appendChild(img);
      botao.addEventListener('click', () => adicionarAdesivoNoWidget(entry.src));
      widgetStripEl.appendChild(botao);
    });
    if (itens.length > limite) {
      const aviso = document.createElement('span');
      aviso.className = 'widget-strip-vazio';
      aviso.textContent = `+${itens.length - limite} nesta pastinha`;
      widgetStripEl.appendChild(aviso);
    }
  }

  function renderizarMeuWidget() {
    if (!widgetConfig) return;
    renderizarCarinhaDoWidget();
    desenharCalendarioDaPrevia();
    atualizarCartaoDaPrevia();
    renderizarAdesivosDaPrevia();
    renderizarCategoriasDoWidget();
    renderizarAdesivosDoWidget();
    marcarAdesivoDoWidget(widgetSelecionado);
    if (widgetCountEl) {
      widgetCountEl.textContent = `${widgetConfig.adesivos.length} de ${WidgetConfig.MAX_ADESIVOS}`;
    }
  }

  async function prepararSrcDoAdesivoDoWidget(src) {
    const texto = String(src || '').trim();
    if (!texto) return '';
    if (!/^data:image\//i.test(texto)) {
      try { return stickerToRelative(texto); } catch (error) { return texto; }
    }
    if (texto.length <= 180 * 1024) return texto;
    try {
      const img = new Image();
      img.src = texto;
      if (img.decode) await img.decode();
      const lado = 320;
      const escala = Math.min(1, lado / Math.max(img.naturalWidth || lado, img.naturalHeight || lado));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round((img.naturalWidth || lado) * escala));
      canvas.height = Math.max(1, Math.round((img.naturalHeight || lado) * escala));
      const ctx = canvas.getContext('2d');
      if (!ctx) return texto;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL('image/webp', 0.86);
      return webp.length < texto.length ? webp : texto;
    } catch (error) {
      return texto;
    }
  }

  function lerArquivoComoDataUrl(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result || ''));
      leitor.onerror = () => reject(leitor.error || new Error('não consegui ler a imagem'));
      leitor.readAsDataURL(arquivo);
    });
  }

  function carregarImagemDaUrl(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('imagem inválida'));
      img.src = src;
    });
  }

  function desenharImagemEmDataUrl(img, lado, qualidade) {
    const largura = img.naturalWidth || img.width || lado;
    const altura = img.naturalHeight || img.height || lado;
    const escala = Math.min(1, lado / Math.max(largura, altura));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', qualidade);
  }

  async function prepararImagemDoWidget(arquivo) {
    if (!WidgetConfig) return '';
    const dataUrl = await lerArquivoComoDataUrl(arquivo);
    if (!dataUrl) return '';
    const img = await carregarImagemDaUrl(dataUrl);
    const tentativas = [
      [1000, 0.84],
      [820, 0.78],
      [620, 0.72]
    ];
    for (const [lado, qualidade] of tentativas) {
      const pronta = desenharImagemEmDataUrl(img, lado, qualidade);
      if (pronta && pronta.length <= WidgetConfig.LIMITE_DA_IMAGEM) return pronta;
    }
    return '';
  }

  async function adicionarAdesivoNoWidget(src) {
    if (!WidgetConfig || !widgetConfig) return;
    if (widgetConfig.adesivos.length >= WidgetConfig.MAX_ADESIVOS) {
      showToast(`o widget guarda até ${WidgetConfig.MAX_ADESIVOS} adesivos 🌸`, true);
      return;
    }
    const pronto = await prepararSrcDoAdesivoDoWidget(src);
    if (!pronto) return;
    const quantos = widgetConfig.adesivos.length;
    const deslocamento = (quantos % 3) * 0.06;
    const configurado = WidgetConfig.adicionar(widgetConfig, pronto, {
      x: Math.min(0.78, 0.42 + deslocamento),
      y: Math.min(0.75, 0.4 + deslocamento)
    });
    if (configurado.adesivos.length === quantos) {
      showToast('não consegui usar esse adesivo no widget 🌧️', true);
      return;
    }
    widgetConfig = configurado;
    const novo = widgetConfig.adesivos[widgetConfig.adesivos.length - 1];
    widgetSelecionado = novo ? novo.id : '';
    renderizarMeuWidget();
    agendarSalvarWidget();
    playSfx(980, 0.08, 'triangle');
  }

  function agendarSalvarWidget() {
    if (widgetSaveStateEl) {
      widgetSaveStateEl.textContent = 'guardando...';
      widgetSaveStateEl.classList.add('is-saving');
    }
    if (timerSalvarWidget) clearTimeout(timerSalvarWidget);
    timerSalvarWidget = setTimeout(() => {
      timerSalvarWidget = null;
      salvarMeuWidget();
    }, 450);
  }

  function salvarMeuWidget() {
    if (!WidgetConfig || !widgetConfig) return false;
    const resultado = WidgetConfig.guardar(localStorage, widgetConfig);
    widgetConfig = resultado.config;
    if (widgetSaveStateEl) {
      widgetSaveStateEl.textContent = resultado.ok ? 'guardado sozinho ✧' : 'não coube guardar 🌧️';
      widgetSaveStateEl.classList.remove('is-saving');
    }
    if (!resultado.ok) showToast('não consegui guardar o widget agora 🌧️', true);
    sincronizarWidget();
    return resultado.ok;
  }

  async function abrirMeuWidget() {
    if (!widgetModal) return;
    playSfx(1040, 0.08, 'triangle');
    fecharEngrenagem();
    widgetModal.classList.add('open');
    widgetModal.setAttribute('aria-hidden', 'false');
    try {
      const indice = window.PooftieStickerIndex;
      if (indice && indice.readyPromise && !indice.ready) await indice.readyPromise;
    } catch (error) {   }
    renderizarMeuWidget();
  }

  function fecharMeuWidget() {
    if (!widgetModal) return;
    widgetModal.classList.remove('open');
    widgetModal.setAttribute('aria-hidden', 'true');
    if (timerSalvarWidget) {
      clearTimeout(timerSalvarWidget);
      timerSalvarWidget = null;
      salvarMeuWidget();
    }
  }

  if (btnWidget) btnWidget.addEventListener('click', () => abrirMeuWidget());
  if (btnWidgetClose) btnWidgetClose.addEventListener('click', () => fecharMeuWidget());
  if (btnWidgetDone) btnWidgetDone.addEventListener('click', () => fecharMeuWidget());
  if (widgetBackdrop) widgetBackdrop.addEventListener('click', () => fecharMeuWidget());

  if (widgetModeEl) {
    widgetModeEl.addEventListener('click', (evento) => {
      const botao = evento.target.closest('button[data-modo]');
      if (!botao || !widgetConfig) return;
      widgetConfig = WidgetConfig.normalizar({ ...widgetConfig, modo: botao.dataset.modo });
      renderizarCarinhaDoWidget();
      agendarSalvarWidget();
      playSfx(950, 0.06, 'triangle');
    });
  }

  if (widgetLayoutEl) {
    widgetLayoutEl.addEventListener('click', (evento) => {
      const botao = evento.target.closest('button[data-layout]');
      if (!botao || !widgetConfig) return;
      widgetConfig = WidgetConfig.normalizar({ ...widgetConfig, layout: botao.dataset.layout });
      renderizarCarinhaDoWidget();
      agendarSalvarWidget();
      playSfx(960, 0.06, 'triangle');
    });
  }

  if (widgetSizeEl) {
    widgetSizeEl.addEventListener('click', (evento) => {
      const botao = evento.target.closest('button[data-tamanho]');
      if (!botao || !widgetConfig) return;
      widgetConfig = WidgetConfig.normalizar({ ...widgetConfig, tamanho: botao.dataset.tamanho });
      renderizarCarinhaDoWidget();
      agendarSalvarWidget();
      playSfx(980, 0.06, 'triangle');
    });
  }

  if (widgetBgColor) {
    widgetBgColor.addEventListener('input', () => {
      if (!widgetConfig) return;
      widgetConfig = WidgetConfig.normalizar({ ...widgetConfig, corFundo: widgetBgColor.value });
      atualizarCoresDaPrevia();
      agendarSalvarWidget();
    });
  }

  if (widgetBgColorReset) {
    widgetBgColorReset.addEventListener('click', () => {
      if (!widgetConfig) return;
      widgetConfig = WidgetConfig.normalizar({
        ...widgetConfig,
        corFundo: WidgetConfig.COR_PADRAO
      });
      renderizarCarinhaDoWidget();
      agendarSalvarWidget();
      playSfx(1000, 0.06, 'triangle');
    });
  }

  if (widgetFontEl) {
    widgetFontEl.addEventListener('change', () => {
      if (!widgetConfig) return;
      widgetConfig = WidgetConfig.normalizar({ ...widgetConfig, fonte: widgetFontEl.value });
      renderizarCarinhaDoWidget();
      agendarSalvarWidget();
      playSfx(1020, 0.06, 'triangle');
    });
  }

  if (widgetBgImageClear) {
    widgetBgImageClear.addEventListener('click', () => definirImagemDoWidget(''));
  }

  if (widgetBgUpload) {
    widgetBgUpload.addEventListener('change', async (evento) => {
      const arquivo = evento.target.files && evento.target.files[0];
      evento.target.value = '';
      if (!arquivo) return;
      if (!/^image\//i.test(arquivo.type || '')) {
        showToast('escolhe um PNG ou uma fotinho 🌸', true);
        return;
      }
      try {
        const pronta = await prepararImagemDoWidget(arquivo);
        if (!pronta) {
          showToast('essa imagem ficou grande demais, tenta uma menor 🌧️', true);
          return;
        }
        definirImagemDoWidget(pronta);
        showToast('imagem de fundo colada no widget ✧');
      } catch (error) {
        showToast('não consegui usar essa imagem 🌧️', true);
      }
    });
  }

  if (widgetSizeRange) {
    widgetSizeRange.addEventListener('input', () => {
      const item = adesivoSelecionadoDoWidget();
      if (!item) return;
      const tamanho = Math.max(6, Math.min(62, Number(widgetSizeRange.value) || 26)) / 100;
      widgetConfig = WidgetConfig.atualizar(widgetConfig, item.id, { tamanho });
      const img = widgetPreviewStickers?.querySelector(`.wp-sticker[data-id="${item.id}"]`);
      if (img) img.style.width = `${tamanho * 100}%`;
      agendarSalvarWidget();
    });
  }

  if (widgetRotationRange) {
    widgetRotationRange.addEventListener('input', () => {
      const item = adesivoSelecionadoDoWidget();
      if (!item) return;
      const rotacao = Number(widgetRotationRange.value) || 0;
      widgetConfig = WidgetConfig.atualizar(widgetConfig, item.id, { rotacao });
      const atualizado = adesivoSelecionadoDoWidget();
      const img = widgetPreviewStickers?.querySelector(`.wp-sticker[data-id="${item.id}"]`);
      if (img && atualizado) img.style.transform = transformacaoDoAdesivoWidget(atualizado);
      agendarSalvarWidget();
    });
  }

  if (widgetFlipBtn) {
    widgetFlipBtn.addEventListener('click', () => {
      const item = adesivoSelecionadoDoWidget();
      if (!item) return;
      widgetConfig = WidgetConfig.atualizar(widgetConfig, item.id, { flip: !item.flip });
      const atualizado = adesivoSelecionadoDoWidget();
      const img = widgetPreviewStickers?.querySelector(`.wp-sticker[data-id="${item.id}"]`);
      if (img && atualizado) img.style.transform = transformacaoDoAdesivoWidget(atualizado);
      widgetFlipBtn.setAttribute('aria-pressed', atualizado && atualizado.flip ? 'true' : 'false');
      agendarSalvarWidget();
    });
  }

  if (widgetDeleteBtn) {
    widgetDeleteBtn.addEventListener('click', () => {
      const item = adesivoSelecionadoDoWidget();
      if (!item) return;
      widgetConfig = WidgetConfig.remover(widgetConfig, item.id);
      widgetSelecionado = '';
      renderizarMeuWidget();
      agendarSalvarWidget();
      playSfx(620, 0.06, 'triangle');
    });
  }

  if (widgetCategoryEl) {
    widgetCategoryEl.addEventListener('change', () => {
      widgetCategoria = widgetCategoryEl.value || '';
      renderizarAdesivosDoWidget();
    });
  }

  if (widgetPreview) {
    widgetPreview.addEventListener('pointerdown', (evento) => {
      if (!evento.target.closest('.wp-sticker')) marcarAdesivoDoWidget('');
    });
  }

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && widgetModal && widgetModal.classList.contains('open')) {
      fecharMeuWidget();
    }
  });

  window.CrechezinhaMeuWidget = {
    abrir: abrirMeuWidget,
    fechar: fecharMeuWidget,
    salvar: salvarMeuWidget,
    config: () => (WidgetConfig ? WidgetConfig.paraNativo(widgetConfig) : null)
  };

  var ultimoWidgetSync = '';

  function sincronizarWidget() {
    try {
      const nativo = window.CrechezinhaNative;
      if (!nativo || !nativo.isNative || typeof nativo.syncWidget !== 'function') return;

      const dias = Array.from(
        new Set(readEntries().map((entrada) => entrada && entrada.date).filter(Boolean))
      ).sort();
      const config = WidgetConfig && widgetConfig
        ? JSON.stringify(WidgetConfig.paraNativo(widgetConfig))
        : '';
      const dados = { days: dias, today: hojeStr(), config };
      const chave = JSON.stringify(dados);
      if (chave === ultimoWidgetSync) return;
      ultimoWidgetSync = chave;
      nativo.syncWidget(dados);
    } catch (erro) {
      console.warn('[crechezinha] widget:', erro && erro.message);
    }
  }

  if (window.CrechezinhaNative && window.CrechezinhaNative.isNative) {
    const preaquecerMusica = () => {
      try {
        const tracks = getActiveTracks();
        const primeira = tracks[state.currentTrackIndex] || tracks[0];
        if (primeira) resolverAudioDaMusica(primeira).catch(() => {});
      } catch (erro) {
        console.warn('[crechezinha] pré-aquecer música:', erro && erro.message);
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preaquecerMusica, { timeout: 9000 });
    } else {
      setTimeout(preaquecerMusica, 6000);
    }
  }

  setTimeout(sincronizarWidget, 1200);
  setTimeout(sincronizarWidget, 6000);
  setInterval(sincronizarWidget, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sincronizarWidget();
  });

});
