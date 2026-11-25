(function () {
  'use strict';

  const SMA = window.SMA;
  if (!SMA) return;

  const Style = window.PooftieCalendarStyle || null;
  const Events = window.PooftieCalendarEvents || null;

  const NOTE_KEY = 'sma_cal_notes';
  const REACTION_KEY = 'sma_cal_reactions';
  const PHOTO_KEY = 'sma_cal_photos';
  const STICKER_KEY = 'sma_cal_stickers';
  const ZOOM_KEY = 'sma_cal_zoom';
  const LEGACY_TASK_KEY = 'sma_planner_tasks';
  const LEGACY_EVENT_KEY = 'sma_planner_events';
  const TASKS_MIGRATED_KEY = 'sma_cal_tasks_migrated';
  const EVENTS_MIGRATED_KEY = 'sma_cal_events_migrated';
  const STICKER_MANIFEST = 'assets/stickers/manifest.json';

  const MONTHS = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const REACTIONS = ['🍰', '🌸', '🎀', '🧸', '☕', '🌧️'];
  const FUNDO_NOMES = {
    nenhum: 'lisinho', bolinhas: 'bolinhas', nuvens: 'nuvens', coracoes: 'corações',
    xadrez: 'xadrez', listras: 'listras', estrelinhas: 'estrelinhas', papel: 'papel', foto: 'minha foto'
  };
  const QUADRO_NOMES = { grade: 'grade', cartoes: 'cartões', redondos: 'redondos', limpos: 'limpos' };
  const FONTE_NOMES = {
    batang: 'Gowun Batang (romance)', nunito: 'Nunito (limpa)', patrick: 'Patrick Hand (gostosa)',
    caveat: 'Caveat (caligrafia)', gloria: 'Gloria (giz de cera)', indie: 'Indie Flower (despojada)',
    vt323: 'VT323 (retrô)'
  };
  const MINI_NOMES = {
    nada: 'sem numerinho', dia: 'dia do ano (1…366)', semana: 'semana do ano (1…53)',
    mesdia: 'data curtinha (10.1)'
  };
  const PALETA_NOMES = {
    romantica: 'romântica (rosa, creme…)', terrosa: 'terrosa (areia, cacau…)',
    pastel: 'pastel (azul, rosa…)', neutra: 'neutra (cinzinhas)'
  };
  const STICKER_CATEGORY_LABELS = {
    agere: 'fofos', animais: 'bichinhos', canetinhas: 'canetinhas', comidinhas: 'comidinhas',
    coracaozinhos: 'corações', emoticons: 'emoticons', lacinhos: 'lacinhos', natureza: 'natureza',
    pelucias: 'pelúcias', pooftie: 'pooftie', random: 'variados', 'rendinhas-e-bordas': 'rendinhas'
  };

  migrateLittlePlaceData();

  const state = {
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selected: '',
    notes: readObject(NOTE_KEY),
    reactions: readObject(REACTION_KEY),
    photos: readObject(PHOTO_KEY),
    stickers: [],
    zoom: readZoom(),
    style: Style ? Style.ler(localStorage) : null,
    eventColor: (Events && Events.CORES[0]) || '#f9c8d7',
    draft: null,
    drag: null,
    selectedSticker: null,
    zCounter: 20,
    stickersLoaded: false,
    stickersLoading: false,
    stickerAll: [],
    stickerCategories: ['all'],
    stickerCategory: 'all',
    stickerQuery: '',
    stickerLimit: 120,
    stickerOpen: false,
    resizeRaf: 0,
    savedOnce: false
  };

  let root = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function escape(value) {
    return SMA.escapeHTML(value == null ? '' : String(value));
  }

  function dateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function migrateLittlePlaceData() {
    try {
      const pairs = [
        ['pooftie_cal_notes', NOTE_KEY],
        ['pooftie_cal_reactions', REACTION_KEY],
        ['pooftie_cal_photos', PHOTO_KEY]
      ];
      pairs.forEach(function (pair) {
        if (localStorage.getItem(pair[1])) return;
        const raw = localStorage.getItem(pair[0]);
        if (raw) localStorage.setItem(pair[1], raw);
      });
      if (!localStorage.getItem(STICKER_KEY)) {
        const raw = localStorage.getItem('pooftie_calendar_stickers');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const fixed = list.map(function (item) {
              if (!item || typeof item !== 'object') return null;
              return Object.assign({}, item, { src: fixStickerSrc(item.src) });
            }).filter(Boolean);
            localStorage.setItem(STICKER_KEY, JSON.stringify(fixed));
          }
        }
      }
      localStorage.setItem('sma_lp_migrated', '1');
    } catch (error) {
      /* se não couber, seguimos com o que já tem */
    }
  }

  function fixStickerSrc(value) {
    const src = String(value == null ? '' : value);
    if (!src) return '';
    const marker = '/little-place/assets/';
    const at = src.indexOf(marker);
    if (at >= 0) return 'assets/' + src.slice(at + marker.length);
    if (src.indexOf('little-place/assets/') === 0) return src.slice('little-place/'.length);
    return src;
  }

  function parseDate(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || !parts.every(Number.isFinite)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function saveObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function readZoom() {
    try {
      return clamp(Number(localStorage.getItem(ZOOM_KEY)) || 1, 0.75, 1.25);
    } catch (error) {
      return 1;
    }
  }

  function noteLines(text) {
    return Style ? Style.linhasDaNota(text) : String(text || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  }

  function applyStyle() {
    if (!Style || !root) return;
    Style.aplicar(root, state.style);
    root.style.setProperty('--cal-zoom', String(state.zoom));
  }

  function migrateLegacy() {
    if (!localStorage.getItem(TASKS_MIGRATED_KEY)) {
      readArray(LEGACY_TASK_KEY).forEach(function (task) {
        const text = String(task && task.text || '').replace(/\s+/g, ' ').trim();
        const date = String(task && task.date || '');
        if (!text || !parseDate(date)) return;
        const current = String(state.notes[date] || '');
        state.notes[date] = current ? current + '\n' + text : text;
      });
      saveObject(NOTE_KEY, state.notes);
      try { localStorage.setItem(TASKS_MIGRATED_KEY, '1'); } catch (error) { /* sem espaço */ }
    }

    if (Events && !localStorage.getItem(EVENTS_MIGRATED_KEY)) {
      const legacy = readArray(LEGACY_EVENT_KEY);
      if (legacy.length) {
        let list = Events.ler(localStorage);
        legacy.forEach(function (item) {
          const evento = Events.criar({
            titulo: item.title || item.titulo,
            inicio: item.date || item.inicio,
            fim: item.endDate || item.fim || item.date || item.inicio,
            cor: item.cor || item.color
          });
          if (evento) list = Events.comEvento(list, evento);
        });
        Events.guardar(localStorage, list);
      }
      try { localStorage.setItem(EVENTS_MIGRATED_KEY, '1'); } catch (error) { /* sem espaço */ }
    }
  }

  function events() {
    return Events ? Events.ler(localStorage) : [];
  }

  function saveEvents(list) {
    return Events ? Events.guardar(localStorage, list) : false;
  }

  function shell() {
    const weekdays = WEEKDAYS.map(function (day) {
      return '<span data-dia="' + day + '">' + day + '</span>';
    }).join('');

    return ''
      + '<div class="calendar-wrapper">'
      + '  <div class="calendar-top-controls">'
      + '    <div class="cal-month-nav">'
      + '      <button class="cal-nav-btn" type="button" data-cal="prev" aria-label="mês anterior" title="mês anterior">‹</button>'
      + '      <h1 class="cal-month-title" id="cal-month-title"></h1>'
      + '      <button class="cal-nav-btn" type="button" data-cal="next" aria-label="próximo mês" title="próximo mês">›</button>'
      + '    </div>'
      + '    <div class="cal-zoom-controls">'
      + '      <button class="cal-zoom-btn cal-theme-btn" type="button" data-cal="theme" title="personalizar o calendário" aria-label="personalizar o calendário">🎨</button>'
      + '      <button class="cal-zoom-btn cal-sticker-btn" type="button" data-cal="stickers" title="adesivos do calendário" aria-label="adesivos do calendário">🎀</button>'
      + '      <button class="cal-zoom-btn" type="button" data-cal="zoom-out" title="diminuir calendário" aria-label="diminuir calendário">−</button>'
      + '      <button class="cal-zoom-btn" type="button" data-cal="zoom-in" title="aumentar calendário" aria-label="aumentar calendário">＋</button>'
      + '    </div>'
      + '  </div>'
      + '  <div class="calendar-decor-card" id="cal-card">'
      + '    <div class="weekdays-grid">' + weekdays + '</div>'
      + '    <div class="days-grid" id="cal-days-grid"></div>'
      + '    <div class="stickers-overlay" id="cal-stickers-overlay"></div>'
      + '  </div>'
      + '</div>'

      + '<div class="cal-modal" id="cal-day-modal">'
      + '  <div class="cal-modal-backdrop" data-cal="close-day"></div>'
      + '  <div class="cal-modal-card cal-day-card" role="dialog" aria-modal="true" aria-labelledby="cal-day-title">'
      + '    <button class="cal-modal-x" type="button" data-cal="close-day" aria-label="fechar">×</button>'
      + '    <h2 class="cal-day-title" id="cal-day-title">tarefinhas do dia</h2>'
      + '    <p class="cal-day-date" id="cal-day-date"></p>'
      + '    <p class="cal-day-hint">cada linha vira uma tarefinha colorida no dia ⋆</p>'
      + '    <textarea id="cal-day-notes" class="cal-day-notes" maxlength="1200" placeholder="ex.: regar as plantinhas&#10;tomar meu chá…"></textarea>'
      + '    <div class="cal-day-preview" id="cal-day-preview"></div>'
      + '    <section class="cal-section">'
      + '      <p class="cal-section-title">a carinha do dia ⋆</p>'
      + '      <div class="cal-reactions" id="cal-reactions"></div>'
      + '    </section>'
      + '    <section class="cal-section">'
      + '      <p class="cal-section-title">evento de vários dias ⋆</p>'
      + '      <form class="cal-event-form" id="cal-event-form">'
      + '        <input id="cal-event-title" class="cal-event-input" type="text" maxlength="60" placeholder="ex.: viagem, prova, aniversário…" aria-label="nome do evento">'
      + '        <div class="cal-event-row">'
      + '          <label class="cal-event-label" for="cal-event-end">até</label>'
      + '          <input id="cal-event-end" class="cal-event-date" type="date" aria-label="último dia do evento">'
      + '          <div class="cal-event-colors" id="cal-event-colors" role="group" aria-label="cor do evento"></div>'
      + '          <button class="cal-mini-btn" type="submit">+ adicionar</button>'
      + '        </div>'
      + '      </form>'
      + '      <div class="cal-event-list" id="cal-event-list"></div>'
      + '      <p class="cal-event-hint">o evento começa no dia aberto e pinta até a data que você escolher ⋆</p>'
      + '    </section>'
      + '    <section class="cal-section">'
      + '      <p class="cal-section-title">foto do dia ⋆</p>'
      + '      <div class="cal-photo-box">'
      + '        <div class="cal-photo-preview" id="cal-photo-preview"></div>'
      + '        <div class="cal-photo-actions">'
      + '          <label class="cal-mini-btn" for="cal-photo-file">🖼️ escolher foto</label>'
      + '          <button class="cal-mini-btn" type="button" data-cal="clear-photo" id="cal-photo-clear" hidden>tirar</button>'
      + '          <label class="cal-switch"><input type="checkbox" id="cal-photo-front"><span>na frente</span></label>'
      + '        </div>'
      + '      </div>'
      + '      <p class="cal-event-hint">a foto preenche o quadradinho do dia ⋆</p>'
      + '    </section>'
      + '    <div class="cal-day-actions">'
      + '      <button class="cal-btn ghost" type="button" data-cal="close-day">deixar pra lá</button>'
      + '      <button class="cal-btn ghost danger" type="button" data-cal="clear-day">apagar</button>'
      + '      <button class="cal-btn primary" type="button" data-cal="save-day">guardar ♡</button>'
      + '    </div>'
      + '  </div>'
      + '</div>'

      + '<div class="cal-modal" id="cal-theme-modal">'
      + '  <div class="cal-modal-backdrop" data-cal="close-theme"></div>'
      + '  <div class="cal-modal-card cal-theme-card" role="dialog" aria-modal="true" aria-labelledby="cal-theme-title">'
      + '    <div class="cal-theme-head">'
      + '      <div><span class="cal-kicker">meu calendário</span><h2 id="cal-theme-title">🎨 do seu jeitinho</h2></div>'
      + '      <button class="cal-modal-x" type="button" data-cal="close-theme" aria-label="fechar">×</button>'
      + '    </div>'
      + '    <div class="cal-theme-body">'
      + '      <p class="cal-theme-label">fundo</p>'
      + '      <div class="cal-fundo-grid" id="cal-fundo-grid" role="radiogroup" aria-label="fundo do calendário"></div>'
      + '      <div class="cal-theme-row">'
      + '        <label class="cal-theme-field" for="cal-fundo-cor">fundo <input type="color" id="cal-fundo-cor" value="#ffffff"></label>'
      + '        <label class="cal-theme-field" for="cal-detalhe-cor">detalhe <input type="color" id="cal-detalhe-cor" value="#f9dbe5"></label>'
      + '        <button class="cal-mini-btn" type="button" data-cal="theme-photo">🖼️ minha foto</button>'
      + '        <button class="cal-mini-btn" type="button" data-cal="theme-photo-clear" id="cal-bg-clear" hidden>tirar foto</button>'
      + '      </div>'
      + '      <p class="cal-theme-label">quadradinhos</p>'
      + '      <div class="cal-quadros-grid" id="cal-quadros-grid" role="radiogroup" aria-label="estilo dos quadradinhos"></div>'
      + '      <div class="cal-theme-row">'
      + '        <label class="cal-theme-field" for="cal-celula-cor">quadrado <input type="color" id="cal-celula-cor" value="#ffffff"></label>'
      + '        <label class="cal-theme-field" for="cal-linha-cor">linha <input type="color" id="cal-linha-cor" value="#eee1e7"></label>'
      + '        <label class="cal-theme-field" for="cal-texto-cor">número <input type="color" id="cal-texto-cor" value="#2f2a2c"></label>'
      + '      </div>'
      + '      <div class="cal-theme-row">'
      + '        <label class="cal-theme-field wide" for="cal-fonte-select">letra'
      + '          <select id="cal-fonte-select">' + Object.keys(FONTE_NOMES).map(function (key) { return '<option value="' + key + '">' + FONTE_NOMES[key] + '</option>'; }).join('') + '</select>'
      + '        </label>'
      + '      </div>'
      + '      <div class="cal-theme-row">'
      + '        <label class="cal-theme-field wide" for="cal-mini-select">numerinho do lado'
      + '          <select id="cal-mini-select">' + Object.keys(MINI_NOMES).map(function (key) { return '<option value="' + key + '">' + MINI_NOMES[key] + '</option>'; }).join('') + '</select>'
      + '        </label>'
      + '      </div>'
      + '      <div class="cal-theme-row">'
      + '        <label class="cal-theme-field wide" for="cal-paleta-select">cor das tarefinhas'
      + '          <select id="cal-paleta-select">' + Object.keys(PALETA_NOMES).map(function (key) { return '<option value="' + key + '">' + PALETA_NOMES[key] + '</option>'; }).join('') + '</select>'
      + '        </label>'
      + '        <label class="cal-switch"><input type="checkbox" id="cal-domingo-vermelho"><span>domingo vermelho</span></label>'
      + '      </div>'
      + '      <p class="cal-theme-hint">a foto do fundo fica guardada dentro do app (bem pequenininha). os adesivinhos continuam soltos por cima, do jeitinho que você colar ♡</p>'
      + '    </div>'
      + '    <div class="cal-theme-foot">'
      + '      <button class="cal-mini-btn" type="button" data-cal="reset-theme">voltar ao padrão</button>'
      + '      <button class="cal-btn primary" type="button" data-cal="close-theme">pronto ♡</button>'
      + '    </div>'
      + '  </div>'
      + '</div>'

      + '<div class="cal-sticker-drawer" id="cal-sticker-drawer">'
      + '  <div class="cal-sticker-head">'
      + '    <div><span class="cal-kicker">adesivos</span><h2>🎀 colar no calendário</h2></div>'
      + '    <button class="cal-modal-x" type="button" data-cal="close-stickers" aria-label="fechar adesivos">×</button>'
      + '  </div>'
      + '  <div class="cal-sticker-cats" id="cal-sticker-cats"></div>'
      + '  <input class="cal-sticker-search" id="cal-sticker-search" type="search" placeholder="buscar adesivo..." aria-label="buscar adesivo">'
      + '  <div class="cal-sticker-grid" id="cal-sticker-grid"></div>'
      + '  <p class="cal-sticker-hint">toca num adesivo pra colar; arrasta ele, gira na bolinha de cima e aumenta na bolinha do canto ♡</p>'
      + '</div>'

      + '<input type="file" id="cal-photo-file" accept="image/*" hidden>'
      + '<input type="file" id="cal-bg-file" accept="image/*" hidden>';
  }

  function init() {
    root = document.getElementById('planner-root');
    if (!root || root.dataset.ready) return;
    if (!Style || !Events) {
      root.innerHTML = '<div class="planner-error"><strong>não consegui abrir Calendar</strong><p>recarregue a página. se continuar, me avise.</p></div>';
      return;
    }
    state.selected = todayKey();
    state.style = Style.ler(localStorage);
    state.stickers = readArray(STICKER_KEY).map(normalizeSticker).filter(Boolean);
    state.zCounter = state.stickers.reduce(function (max, item) { return Math.max(max, item.z || 0); }, 20);
    migrateLegacy();
    root.classList.add('planner-cal');
    root.innerHTML = shell();
    applyStyle();
    bind();
    renderCalendar();
    restoreStickers();
    applyZoom();
    root.dataset.ready = '1';

    const navButton = document.querySelector('[data-tab="tab-planner"]');
    if (navButton) {
      navButton.addEventListener('click', function () {
        window.setTimeout(positionBars, 80);
        window.setTimeout(clampStickers, 80);
      });
    }
    if (typeof ResizeObserver === 'function') {
      const grid = root.querySelector('#cal-days-grid');
      if (grid) {
        const observer = new ResizeObserver(function () {
          if (state.resizeRaf) return;
          state.resizeRaf = requestAnimationFrame(function () {
            state.resizeRaf = 0;
            positionBars();
            clampStickers();
          });
        });
        observer.observe(grid);
      }
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { window.setTimeout(positionBars, 0); }).catch(function () {});
      if (typeof document.fonts.addEventListener === 'function') {
        document.fonts.addEventListener('loadingdone', function () { positionBars(); });
      }
    }
    window.addEventListener('resize', onViewportChange);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
  }

  function onViewportChange() {
    if (state.resizeRaf) cancelAnimationFrame(state.resizeRaf);
    state.resizeRaf = requestAnimationFrame(function () {
      state.resizeRaf = 0;
      positionBars();
      clampStickers();
    });
  }

  function bind() {
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    root.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('pointerdown', function (event) {
      if (!state.selectedSticker) return;
      const sticker = event.target.closest ? event.target.closest('.placed-sticker') : null;
      const drawer = event.target.closest ? event.target.closest('#cal-sticker-drawer') : null;
      if (!sticker && !drawer) selectSticker(null);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (root.querySelector('#cal-theme-modal').classList.contains('is-open')) return closeTheme();
      if (root.querySelector('#cal-day-modal').classList.contains('is-open')) return closeDay();
      if (state.stickerOpen) return toggleStickers(false);
    });
  }

  function onClick(event) {
    const action = event.target.closest('[data-cal]');
    if (action && action.dataset.cal) {
      const name = action.dataset.cal;
      if (name === 'prev' || name === 'next') {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() + (name === 'next' ? 1 : -1), 1);
        renderCalendar();
        return;
      }
      if (name === 'zoom-in') return setZoom(state.zoom + 0.1);
      if (name === 'zoom-out') return setZoom(state.zoom - 0.1);
      if (name === 'theme') return openTheme();
      if (name === 'close-theme') return closeTheme();
      if (name === 'stickers') return toggleStickers();
      if (name === 'close-stickers') return toggleStickers(false);
      if (name === 'theme-photo') return root.querySelector('#cal-bg-file').click();
      if (name === 'theme-photo-clear') return clearThemePhoto();
      if (name === 'reset-theme') return resetTheme();
      if (name === 'close-day') return closeDay();
      if (name === 'save-day') return saveDay();
      if (name === 'clear-day') return clearDay();
      if (name === 'clear-photo') return clearDayPhoto();
    }

    const day = event.target.closest('.cal-day-cell');
    if (day && day.dataset.date) return openDay(day.dataset.date);

    const bar = event.target.closest('.cal-faixa');
    if (bar && bar.dataset.date) return openDay(bar.dataset.date);

    const fundo = event.target.closest('[data-fundo]');
    if (fundo) {
      changeTheme({ fundo: fundo.dataset.fundo });
      renderTheme();
      return;
    }
    const quadro = event.target.closest('[data-quadro]');
    if (quadro) {
      changeTheme({ quadros: quadro.dataset.quadro });
      renderTheme();
      return;
    }
    const cat = event.target.closest('[data-st-cat]');
    if (cat) {
      state.stickerCategory = cat.dataset.stCat;
      state.stickerLimit = 120;
      renderStickerDrawer();
      return;
    }
    const more = event.target.closest('[data-st-more]');
    if (more) {
      state.stickerLimit += 120;
      renderStickerGrid();
      return;
    }
    const stickerItem = event.target.closest('[data-st-src]');
    if (stickerItem) {
      placeSticker(stickerItem.dataset.stSrc);
      return;
    }
    const eventColor = event.target.closest('[data-event-color]');
    if (eventColor) {
      state.eventColor = eventColor.dataset.eventColor;
      renderEventColors();
      return;
    }
    const reaction = event.target.closest('[data-reaction]');
    if (reaction) {
      if (!state.draft) return;
      const value = reaction.dataset.reaction || '';
      state.draft.reaction = state.draft.reaction === value ? '' : value;
      renderReactions();
      return;
    }
    const deleteEvent = event.target.closest('[data-delete-event]');
    if (deleteEvent) {
      const id = deleteEvent.dataset.deleteEvent;
      saveEvents(Events.semEvento(events(), id));
      renderEventList();
      renderCalendar();
      return;
    }
    const deleteSticker = event.target.closest('.sticker-handle-del');
    if (deleteSticker) {
      const el = deleteSticker.closest('.placed-sticker');
      removeSticker(el ? el.dataset.id : '');
      return;
    }
  }

  function onSubmit(event) {
    if (event.target.id !== 'cal-event-form') return;
    event.preventDefault();
    if (!state.draft) return;
    const title = root.querySelector('#cal-event-title').value.trim();
    if (!title) return;
    let end = root.querySelector('#cal-event-end').value || state.draft.date;
    if (end < state.draft.date) end = state.draft.date;
    const evento = Events.criar({ titulo: title, inicio: state.draft.date, fim: end, cor: state.eventColor });
    if (!evento) return;
    saveEvents(Events.comEvento(events(), evento));
    root.querySelector('#cal-event-title').value = '';
    root.querySelector('#cal-event-end').value = state.draft.date;
    renderEventList();
    renderCalendar();
    SMA.toast('evento guardado ♡');
  }

  function onInput(event) {
    if (event.target.id === 'cal-day-notes') {
      renderDayPreview();
      return;
    }
    if (event.target.id === 'cal-sticker-search') {
      state.stickerQuery = event.target.value;
      state.stickerLimit = 120;
      renderStickerGrid();
    }
  }

  function onChange(event) {
    const target = event.target;
    if (target.id === 'cal-photo-file') return useDayPhoto(target);
    if (target.id === 'cal-bg-file') return useThemePhoto(target);
    if (target.id === 'cal-photo-front') {
      if (state.draft && state.draft.photo) state.draft.photo.frente = target.checked;
      return;
    }
    if (target.id === 'cal-fundo-cor') return changeTheme({ fundoCor: target.value }, false);
    if (target.id === 'cal-detalhe-cor') return changeTheme({ detalheCor: target.value }, false);
    if (target.id === 'cal-celula-cor') return changeTheme({ celulaCor: target.value }, false);
    if (target.id === 'cal-linha-cor') return changeTheme({ linhaCor: target.value }, false);
    if (target.id === 'cal-texto-cor') return changeTheme({ textoCor: target.value }, false);
    if (target.id === 'cal-fonte-select') return changeTheme({ fonte: target.value });
    if (target.id === 'cal-mini-select') return changeTheme({ mini: target.value });
    if (target.id === 'cal-paleta-select') return changeTheme({ paleta: target.value });
    if (target.id === 'cal-domingo-vermelho') return changeTheme({ domingoVermelho: target.checked });
  }

  function renderCalendar() {
    const grid = root.querySelector('#cal-days-grid');
    const label = root.querySelector('#cal-month-title');
    if (!grid || !label) return;
    applyStyle();
    label.textContent = MONTHS[state.month.getMonth()] + ' ' + state.month.getFullYear();

    const year = state.month.getFullYear();
    const month = state.month.getMonth();
    const offset = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const previousTotal = new Date(year, month, 0).getDate();
    const today = todayKey();
    const dates = [];
    const cells = [];
    const hasEntry = new Set(Object.keys(state.notes).concat(Object.keys(state.reactions), Object.keys(state.photos)));

    grid.innerHTML = '';

    function addCell(day, date) {
      const key = dateKey(date);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell';
      if (date.getMonth() !== month) cell.classList.add('other-month');
      if (date.getDay() === 0) cell.classList.add('is-domingo');
      if (key === today) cell.classList.add('today');
      if (hasEntry.has(key)) cell.classList.add('has-entry');
      cell.dataset.date = key;

      const photo = state.photos[key];
      if (photo && photo.src) {
        cell.classList.add('tem-foto');
        if (photo.frente) cell.classList.add('foto-na-frente');
        const image = document.createElement('img');
        image.className = 'cal-day-photo';
        image.src = photo.src;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        cell.appendChild(image);
      }

      const top = document.createElement('span');
      top.className = 'cal-day-top';
      const number = document.createElement('span');
      number.className = 'cal-day-num';
      number.textContent = String(day);
      top.appendChild(number);
      const mini = Style.miniDoDia(key, state.style.mini);
      if (mini) {
        const tiny = document.createElement('span');
        tiny.className = 'cal-day-mini';
        tiny.textContent = mini;
        top.appendChild(tiny);
      }
      cell.appendChild(top);

      const reaction = state.reactions[key];
      if (reaction) {
        const badge = document.createElement('span');
        badge.className = 'cal-day-reaction';
        badge.textContent = reaction;
        cell.appendChild(badge);
      }

      const tasks = noteLines(state.notes[key]);
      const aria = day + ' de ' + MONTHS[date.getMonth()] + (tasks.length ? ': ' + tasks.join(', ') : '');
      cell.setAttribute('aria-label', aria);
      grid.appendChild(cell);
      dates.push(key);
      cells.push(cell);
    }

    for (let i = offset - 1; i >= 0; i -= 1) {
      addCell(previousTotal - i, new Date(year, month - 1, previousTotal - i));
    }
    for (let day = 1; day <= total; day += 1) {
      addCell(day, new Date(year, month, day));
    }
    const trailing = (7 - ((offset + total) % 7)) % 7;
    for (let i = 1; i <= trailing; i += 1) {
      addCell(i, new Date(year, month + 1, i));
    }

    const faixas = [];
    events().forEach(function (evento, index) {
      faixas.push({
        id: 'evento:' + evento.id,
        idEvento: evento.id,
        titulo: evento.titulo,
        cor: evento.cor,
        textoCor: Events.corDeTexto(evento.cor),
        inicio: evento.inicio,
        fim: evento.fim,
        tipo: 'evento',
        ordem: index
      });
    });
    Object.keys(state.notes).forEach(function (key) {
      noteLines(state.notes[key]).forEach(function (title, index) {
        faixas.push({
          id: 'tarefa:' + key + ':' + index,
          titulo: title,
          cor: Style.corDaTarefa(state.style, index),
          inicio: key,
          fim: key,
          tipo: 'tarefa',
          ordem: index
        });
      });
    });

    const grade = Events.montarGrade({ dias: dates, faixas: faixas });
    let maxLanes = 0;
    if (grade && grade.semanas) {
      grade.semanas.forEach(function (week) { maxLanes = Math.max(maxLanes, week.totalFaixas || 0); });
    }
    cells.forEach(function (cell) { cell.style.setProperty('--cal-linhas', String(maxLanes)); });

    renderBars(grade, dates, cells);
  }

  function renderBars(grade, dates, cells) {
    const grid = root.querySelector('#cal-days-grid');
    if (!grid) return;
    const old = grid.querySelector('.cal-days-overlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.className = 'cal-days-overlay';
    grid.style.setProperty('--cal-faixa-passo', String(getBarStep()) + 'px');

    if (grade && grade.semanas) {
      const passo = getBarStep();
      grade.semanas.forEach(function (week, weekIndex) {
        const groups = [];
        const byId = new Map();
        for (let column = 0; column < 7; column += 1) {
          const segments = week.celulas[column] || [];
          segments.forEach(function (segment) {
            const previous = byId.get(segment.id);
            if (previous && previous.columnEnd === column - 1) previous.columnEnd = column;
            else {
              const group = { segment: segment, columnStart: column, columnEnd: column };
              groups.push(group);
              byId.set(segment.id, group);
            }
          });
        }
        groups.forEach(function (group) {
          const startCell = cells[weekIndex * 7 + group.columnStart];
          const endCell = cells[weekIndex * 7 + group.columnEnd];
          if (!startCell || !endCell) return;
          const segment = group.segment;
          const top = startCell.querySelector('.cal-day-top');
          const base = (top ? top.offsetTop + top.offsetHeight : 0) + 3;
          const date = dates[weekIndex * 7 + group.columnStart];
          const bar = document.createElement('button');
          bar.type = 'button';
          bar.className = 'cal-faixa'
            + (segment.comecaAqui ? ' comeca-aqui' : '')
            + (segment.terminaAqui ? ' termina-aqui' : '')
            + (segment.tipo === 'evento' ? ' is-evento' : ' is-tarefa');
          bar.dataset.date = segment.tipo === 'evento' ? segment.inicio : date;
          bar.style.setProperty('--faixa-cor', segment.cor);
          bar.style.setProperty('--faixa-texto', segment.textoCor || '#4a3a34');
          bar.style.top = String(startCell.offsetTop + base + (segment.lane - 1) * passo) + 'px';
          const left = Math.max(0, startCell.offsetLeft + (segment.comecaAqui ? 4 : -1));
          const right = endCell.offsetLeft + endCell.offsetWidth - (segment.terminaAqui ? 4 : -1);
          bar.style.left = String(left) + 'px';
          bar.style.width = String(Math.max(6, right - left)) + 'px';
          bar.style.height = String(Math.max(9, passo - 3)) + 'px';
          bar.textContent = segment.mostrarTitulo ? segment.titulo : '';
          bar.title = segment.tipo === 'evento'
            ? segment.titulo + ' · ' + rangeLabel(segment.inicio, segment.fim)
            : segment.titulo;
          bar.setAttribute('aria-label', bar.title);
          overlay.appendChild(bar);
        });
      });
    }
    grid.appendChild(overlay);
  }

  function getBarStep() {
    const grid = root.querySelector('#cal-days-grid');
    const width = grid ? grid.clientWidth : 0;
    return Math.max(13, Math.min(24, (width || 380) * 0.032));
  }

  function rangeLabel(start, end) {
    if (!start) return '';
    if (!end || end === start) return shortDate(start);
    return shortDate(start) + ' – ' + shortDate(end);
  }

  function shortDate(key) {
    const date = parseDate(key);
    if (!date) return '';
    return date.getDate() + ' ' + MONTHS[date.getMonth()].slice(0, 3);
  }

  function positionBars() {
    const grid = root.querySelector('#cal-days-grid');
    if (!grid || !state.style) return;
    const dates = [];
    grid.querySelectorAll('.cal-day-cell').forEach(function (cell) { dates.push(cell.dataset.date); });
    const cells = Array.prototype.slice.call(grid.querySelectorAll('.cal-day-cell'));
    if (!cells.length) return;

    const faixas = [];
    events().forEach(function (evento, index) {
      faixas.push({
        id: 'evento:' + evento.id,
        idEvento: evento.id,
        titulo: evento.titulo,
        cor: evento.cor,
        textoCor: Events.corDeTexto(evento.cor),
        inicio: evento.inicio,
        fim: evento.fim,
        tipo: 'evento',
        ordem: index
      });
    });
    Object.keys(state.notes).forEach(function (key) {
      noteLines(state.notes[key]).forEach(function (title, index) {
        faixas.push({
          id: 'tarefa:' + key + ':' + index,
          titulo: title,
          cor: Style.corDaTarefa(state.style, index),
          inicio: key,
          fim: key,
          tipo: 'tarefa',
          ordem: index
        });
      });
    });
    const grade = Events.montarGrade({ dias: dates, faixas: faixas });
    renderBars(grade, dates, cells);
  }

  function openDay(key) {
    if (!state.style) return;
    const date = parseDate(key);
    if (!date) return;
    const photo = state.photos[key];
    state.draft = {
      date: key,
      notes: state.notes[key] || '',
      reaction: state.reactions[key] || '',
      photo: photo && photo.src ? { src: photo.src, frente: Boolean(photo.frente) } : null
    };
    const modal = root.querySelector('#cal-day-modal');
    modal.querySelector('#cal-day-date').textContent = date.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    modal.querySelector('#cal-day-notes').value = state.draft.notes;
    modal.querySelector('#cal-event-title').value = '';
    modal.querySelector('#cal-event-end').value = key;
    modal.querySelector('#cal-event-end').min = key;
    root.querySelector('#cal-photo-file').value = '';
    modal.classList.add('is-open');
    renderDayPreview();
    renderReactions();
    renderEventColors();
    renderEventList();
    renderDayPhoto();
    if (window.innerWidth > 700) {
      window.setTimeout(function () { modal.querySelector('#cal-day-notes').focus(); }, 60);
    }
  }

  function closeDay() {
    const modal = root.querySelector('#cal-day-modal');
    if (modal) modal.classList.remove('is-open');
    state.draft = null;
  }

  function renderDayPreview() {
    const box = root.querySelector('#cal-day-preview');
    if (!box || !state.draft) return;
    const textarea = root.querySelector('#cal-day-notes');
    const lines = noteLines(textarea ? textarea.value : '');
    box.innerHTML = lines.length
      ? lines.map(function (line, index) {
        return '<span class="cal-day-task" style="--cal-tarefa-cor:' + Style.corDaTarefa(state.style, index) + '">' + escape(line) + '</span>';
      }).join('')
      : '<span class="cal-day-preview-empty">as tarefinhas aparecem aqui ⋆</span>';
  }

  function renderReactions() {
    const box = root.querySelector('#cal-reactions');
    if (!box || !state.draft) return;
    box.innerHTML = REACTIONS.map(function (emoji) {
      const chosen = state.draft.reaction === emoji;
      return '<button class="cal-reaction' + (chosen ? ' is-chosen' : '') + '" type="button" data-reaction="' + emoji + '" aria-label="marcar o dia com ' + emoji + '" aria-pressed="' + (chosen ? 'true' : 'false') + '">' + emoji + '</button>';
    }).join('') + '<button class="cal-reaction cal-reaction-clear' + (state.draft.reaction ? '' : ' is-chosen') + '" type="button" data-reaction="" aria-label="sem carinha">sem carinha</button>';
  }

  function renderEventColors() {
    const box = root.querySelector('#cal-event-colors');
    if (!box) return;
    box.innerHTML = Events.CORES.map(function (color) {
      return '<button class="cal-color' + (color === state.eventColor ? ' is-chosen' : '') + '" type="button" data-event-color="' + color + '" style="--cal-color:' + color + '" aria-label="cor ' + color + '"></button>';
    }).join('');
  }

  function renderEventList() {
    const box = root.querySelector('#cal-event-list');
    if (!box || !state.draft) return;
    const list = Events.eventosDoDia(events(), state.draft.date).sort(function (a, b) {
      return a.inicio.localeCompare(b.inicio);
    });
    box.innerHTML = list.length ? list.map(function (evento) {
      return '<div class="cal-event-item">'
        + '<i style="--cal-color:' + evento.cor + '"></i>'
        + '<div><strong>' + escape(evento.titulo) + '</strong><small>' + escape(rangeLabel(evento.inicio, evento.fim)) + '</small></div>'
        + '<button type="button" data-delete-event="' + escape(evento.id) + '" aria-label="apagar evento">×</button>'
        + '</div>';
    }).join('') : '<p class="cal-event-empty">nenhum evento por aqui ♡</p>';
  }

  function renderDayPhoto() {
    const box = root.querySelector('#cal-photo-preview');
    const clear = root.querySelector('#cal-photo-clear');
    const front = root.querySelector('#cal-photo-front');
    if (!box) return;
    const photo = state.draft && state.draft.photo;
    box.innerHTML = photo && photo.src ? '<img src="' + escape(photo.src) + '" alt="foto do dia">' : '<span class="cal-photo-empty">nenhuma fotinha ainda ⋆</span>';
    if (clear) clear.hidden = !photo;
    if (front) front.checked = Boolean(photo && photo.frente);
  }

  async function useDayPhoto(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !state.draft) return;
    const data = await shrinkImage(file, 520, 190 * 1024);
    if (!data) {
      SMA.toast('essa foto é grande demais 🌧️ tenta outra?', 'error');
      return;
    }
    state.draft.photo = { src: data, frente: false };
    renderDayPhoto();
  }

  function clearDayPhoto() {
    if (!state.draft) return;
    state.draft.photo = null;
    renderDayPhoto();
  }

  function saveDay() {
    if (!state.draft) return;
    const key = state.draft.date;
    const text = root.querySelector('#cal-day-notes').value.trim();
    if (text) state.notes[key] = text;
    else delete state.notes[key];
    if (state.draft.reaction) state.reactions[key] = state.draft.reaction;
    else delete state.reactions[key];
    if (state.draft.photo && state.draft.photo.src) state.photos[key] = state.draft.photo;
    else delete state.photos[key];
    const savedNotes = saveObject(NOTE_KEY, state.notes);
    const savedReactions = saveObject(REACTION_KEY, state.reactions);
    const savedPhotos = saveObject(PHOTO_KEY, state.photos);
    const saved = savedNotes && savedReactions && savedPhotos;
    closeDay();
    renderCalendar();
    SMA.toast(saved ? 'dia guardado ♡' : 'não consegui guardar tudo. o armazenamento pode estar cheio.', saved ? undefined : 'error');
  }

  function clearDay() {
    if (!state.draft) return;
    const key = state.draft.date;
    delete state.notes[key];
    delete state.reactions[key];
    delete state.photos[key];
    saveObject(NOTE_KEY, state.notes);
    saveObject(REACTION_KEY, state.reactions);
    saveObject(PHOTO_KEY, state.photos);
    closeDay();
    renderCalendar();
    SMA.toast('dia limpinho ♡');
  }

  function setZoom(value) {
    state.zoom = clamp(Math.round(value * 100) / 100, 0.75, 1.25);
    applyZoom();
    try { localStorage.setItem(ZOOM_KEY, String(state.zoom)); } catch (error) { /* sem espaço */ }
    positionBars();
  }

  function applyZoom() {
    const card = root.querySelector('#cal-card');
    if (!card) return;
    card.style.transform = 'scale(' + state.zoom + ')';
    root.style.setProperty('--cal-zoom', String(state.zoom));
  }

  function openTheme() {
    renderTheme();
    root.querySelector('#cal-theme-modal').classList.add('is-open');
  }

  function closeTheme() {
    root.querySelector('#cal-theme-modal').classList.remove('is-open');
  }

  function changeTheme(patch, redraw) {
    state.style = Style.normalizar(Object.assign({}, state.style, patch));
    Style.guardar(localStorage, state.style);
    applyStyle();
    if (redraw !== false) renderCalendar();
  }

  function renderTheme() {
    const style = state.style;
    const fundos = Style.FUNDOS.filter(function (fundo) { return fundo !== 'foto' || style.foto; });
    const fundoGrid = root.querySelector('#cal-fundo-grid');
    fundoGrid.innerHTML = fundos.map(function (fundo) {
      const sample = Style.fundoCss(Object.assign({}, style, { fundo: fundo }));
      return '<button class="cal-fundo-option' + (style.fundo === fundo ? ' is-chosen' : '') + '" type="button" data-fundo="' + fundo + '" title="fundo ' + (FUNDO_NOMES[fundo] || fundo) + '" aria-label="fundo ' + (FUNDO_NOMES[fundo] || fundo) + '" style="background:' + escape(sample) + '"><span>' + (FUNDO_NOMES[fundo] || fundo) + '</span></button>';
    }).join('');

    root.querySelector('#cal-quadros-grid').innerHTML = Style.QUADROS.map(function (quadro) {
      return '<button class="cal-quadro-option' + (style.quadros === quadro ? ' is-chosen' : '') + '" type="button" data-quadro="' + quadro + '" title="quadradinhos ' + (QUADRO_NOMES[quadro] || quadro) + '">'
        + '<span class="cal-quadro-preview q-' + quadro + '"><i></i><i></i><i></i><i></i></span>'
        + '<span>' + (QUADRO_NOMES[quadro] || quadro) + '</span></button>';
    }).join('');

    root.querySelector('#cal-fundo-cor').value = style.fundoCor;
    root.querySelector('#cal-detalhe-cor').value = style.detalheCor;
    root.querySelector('#cal-celula-cor').value = style.celulaCor;
    root.querySelector('#cal-linha-cor').value = style.linhaCor;
    root.querySelector('#cal-texto-cor').value = style.textoCor;
    root.querySelector('#cal-fonte-select').value = style.fonte;
    root.querySelector('#cal-mini-select').value = style.mini;
    root.querySelector('#cal-paleta-select').value = style.paleta;
    root.querySelector('#cal-domingo-vermelho').checked = style.domingoVermelho;
    root.querySelector('#cal-bg-clear').hidden = !style.foto;
  }

  async function useThemePhoto(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const data = await shrinkImage(file, 900, Style.LIMITE_DA_FOTO);
    if (!data) {
      SMA.toast('essa foto é grande demais 🌧️ tenta outra?', 'error');
      return;
    }
    changeTheme({ fundo: 'foto', foto: data });
    renderTheme();
  }

  function clearThemePhoto() {
    changeTheme({ foto: '', fundo: state.style.fundo === 'foto' ? 'nuvens' : state.style.fundo });
    renderTheme();
  }

  function resetTheme() {
    state.style = Style.padrao();
    Style.guardar(localStorage, state.style);
    applyStyle();
    renderCalendar();
    renderTheme();
    SMA.toast('calendário de volta ao padrão ♡');
  }

  async function shrinkImage(file, maxSide, maxBytes) {
    let source = null;
    try {
      source = await loadBitmap(file);
    } catch (error) {
      return '';
    }
    if (!source) return '';
    const width = source.width || source.naturalWidth || 1;
    const height = source.height || source.naturalHeight || 1;
    let scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement('canvas');
    for (let attempt = 0; attempt < 6; attempt += 1) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/webp', attempt < 2 ? 0.76 : 0.6);
      if (!url || url === 'data:,') continue;
      if (url.length <= maxBytes || attempt === 5) return url;
      scale *= 0.78;
    }
    return '';
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return window.createImageBitmap(file).catch(function () { return loadImageElement(file); });
    }
    return loadImageElement(file);
  }

  function loadImageElement(file) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('imagem inválida'));
      };
      image.src = url;
    });
  }

  /* ── adesivos ───────────────────────────────────────────── */

  function normalizeSticker(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const src = String(raw.src || '').trim();
    if (!src) return null;
    return {
      id: String(raw.id || uid('st')),
      src: src,
      x: clamp(raw.x, -400, 4000),
      y: clamp(raw.y, -400, 4000),
      width: clamp(raw.width || 85, 24, 600),
      rotation: clamp(raw.rotation, -180, 180),
      flip: Boolean(raw.flip),
      border: Boolean(raw.border),
      z: Number(raw.z) || 21 + (index || 0)
    };
  }

  function saveStickers() {
    if (saveObject(STICKER_KEY, state.stickers)) return;
    if (state.savedOnce) return;
    state.savedOnce = true;
    SMA.toast('não consegui guardar os adesivos. o armazenamento pode estar cheio.', 'error');
  }

  function overlay() {
    return root.querySelector('#cal-stickers-overlay');
  }

  function restoreStickers() {
    const layer = overlay();
    if (!layer) return;
    state.stickers.forEach(function (item) { createStickerEl(item); });
    clampStickers();
  }

  function createStickerEl(item) {
    const layer = overlay();
    if (!layer) return null;
    const el = document.createElement('div');
    el.className = 'placed-sticker with-shadow' + (item.border ? ' with-border' : '');
    el.dataset.id = item.id;
    el.style.left = item.x + 'px';
    el.style.top = item.y + 'px';
    el.style.zIndex = String(item.z);
    const image = document.createElement('img');
    image.src = item.src;
    image.alt = 'adesivo';
    image.draggable = false;
    image.style.width = item.width + 'px';
    image.loading = 'lazy';
    image.addEventListener('load', function () { clampStickerEl(el, item); });
    el.appendChild(image);
    el.insertAdjacentHTML('beforeend', ''
      + '<span class="sticker-handle-rotate" title="girar">🔄</span>'
      + '<span class="sticker-handle-resize" title="aumentar">↘️</span>'
      + '<span class="sticker-handle-del" title="tirar">✕</span>');
    applyStickerTransform(el, item);
    layer.appendChild(el);
    return el;
  }

  function applyStickerTransform(el, item) {
    el.style.transform = 'rotate(' + item.rotation + 'deg)' + (item.flip ? ' scaleX(-1)' : '');
    const image = el.querySelector('img');
    if (image) image.style.width = item.width + 'px';
  }

  function placeSticker(src) {
    if (!src) return;
    const layer = overlay();
    if (!layer) return;
    const width = layer.clientWidth || 600;
    const height = layer.clientHeight || 520;
    const item = {
      id: uid('st'),
      src: src,
      x: Math.max(8, width * 0.58 + (state.stickers.length % 5) * 14),
      y: Math.max(8, height * 0.3 + (state.stickers.length % 5) * 14),
      width: 85,
      rotation: 0,
      flip: false,
      border: false,
      z: ++state.zCounter
    };
    state.stickers.push(item);
    const el = createStickerEl(item);
    clampStickerEl(el, item);
    saveStickers();
    selectSticker(el);
  }

  function selectSticker(el) {
    if (state.selectedSticker && state.selectedSticker !== el) {
      state.selectedSticker.classList.remove('selected');
    }
    state.selectedSticker = el || null;
    if (el) el.classList.add('selected');
  }

  function stickerItem(id) {
    return state.stickers.find(function (item) { return item.id === id; }) || null;
  }

  function removeSticker(id) {
    const item = stickerItem(id);
    const el = overlay() ? overlay().querySelector('.placed-sticker[data-id="' + String(id).replace(/"/g, '\\"') + '"]') : null;
    state.stickers = state.stickers.filter(function (entry) { return entry.id !== id; });
    if (el && el.parentElement) el.parentElement.removeChild(el);
    if (state.selectedSticker === el) state.selectedSticker = null;
    if (item) saveStickers();
  }

  function onPointerDown(event) {
    const el = event.target.closest ? event.target.closest('.placed-sticker') : null;
    if (!el || !overlay() || !overlay().contains(el)) return;
    const item = stickerItem(el.dataset.id);
    if (!item) return;
    if (event.target.closest('.sticker-handle-del')) return;
    event.preventDefault();
    selectSticker(el);
    const elRect = el.getBoundingClientRect();
    const rotate = Boolean(event.target.closest('.sticker-handle-rotate'));
    const resize = Boolean(event.target.closest('.sticker-handle-resize'));
    state.drag = {
      type: rotate ? 'rotate' : (resize ? 'resize' : 'move'),
      el: el,
      item: item,
      startX: event.clientX,
      startY: event.clientY,
      origX: item.x,
      origY: item.y,
      origWidth: item.width,
      origRotation: item.rotation,
      centerX: elRect.left + elRect.width / 2,
      centerY: elRect.top + elRect.height / 2,
      startAngle: Math.atan2(event.clientY - (elRect.top + elRect.height / 2), event.clientX - (elRect.left + elRect.width / 2)) * 180 / Math.PI
    };
    el.classList.add('is-dragging');
  }

  function onPointerMove(event) {
    const drag = state.drag;
    if (!drag) return;
    event.preventDefault();
    const scale = state.zoom || 1;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    const item = drag.item;
    const el = drag.el;

    if (drag.type === 'move') {
      item.x = drag.origX + dx;
      item.y = drag.origY + dy;
      el.style.left = item.x + 'px';
      el.style.top = item.y + 'px';
      clampStickerEl(el, item);
      return;
    }

    if (drag.type === 'rotate') {
      const angle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX) * 180 / Math.PI;
      item.rotation = normalizeAngle(drag.origRotation + (angle - drag.startAngle));
      applyStickerTransform(el, item);
      return;
    }

    const radians = item.rotation * Math.PI / 180;
    const delta = dx * Math.cos(radians) + dy * Math.sin(radians);
    item.width = clamp(drag.origWidth + delta, 24, 620);
    applyStickerTransform(el, item);
  }

  function onPointerUp() {
    if (!state.drag) return;
    state.drag.el.classList.remove('is-dragging');
    state.drag = null;
    saveStickers();
  }

  function normalizeAngle(value) {
    let angle = Number(value) || 0;
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  function clampStickerEl(el, item) {
    const layer = overlay();
    if (!layer || !el) return;
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    if (!width || !height) return;
    const image = el.querySelector('img');
    const stickerWidth = item.width || (image ? image.clientWidth : 85);
    const stickerHeight = image ? (image.clientHeight || stickerWidth) : stickerWidth;
    const minX = 0;
    const maxX = width - stickerWidth - 2;
    const minY = 4;
    const maxY = height - stickerHeight - 4;
    const nextX = clamp(item.x, minX, Math.max(minX, maxX));
    const nextY = clamp(item.y, minY, Math.max(minY, maxY));
    if (nextX !== item.x || nextY !== item.y) {
      item.x = nextX;
      item.y = nextY;
      el.style.left = nextX + 'px';
      el.style.top = nextY + 'px';
    }
  }

  function clampStickers() {
    const layer = overlay();
    if (!layer) return;
    layer.querySelectorAll('.placed-sticker').forEach(function (el) {
      const item = stickerItem(el.dataset.id);
      if (item) clampStickerEl(el, item);
    });
  }

  function toggleStickers(force) {
    state.stickerOpen = typeof force === 'boolean' ? force : !state.stickerOpen;
    const drawer = root.querySelector('#cal-sticker-drawer');
    if (!drawer) return;
    drawer.classList.toggle('is-open', state.stickerOpen);
    if (state.stickerOpen) {
      renderStickerDrawer();
      if (!state.stickersLoaded && !state.stickersLoading) loadStickers();
      const search = root.querySelector('#cal-sticker-search');
      if (search && window.innerWidth > 700) window.setTimeout(function () { search.focus(); }, 120);
    }
  }

  async function loadStickers() {
    state.stickersLoading = true;
    renderStickerGrid();
    try {
      let list = Array.isArray(window.SMA_STICKER_MANIFEST) ? window.SMA_STICKER_MANIFEST : null;
      if (!list) {
        const response = await fetch(STICKER_MANIFEST);
        const data = await response.json();
        list = Array.isArray(data && data.stickers) ? data.stickers : [];
      }
      const categories = new Set(['all']);
      state.stickerAll = list.map(function (rel) {
        const parts = String(rel).split('/');
        const category = parts.length >= 4 ? parts[2] : 'random';
        categories.add(category);
        return {
          src: String(rel),
          category: category,
          name: (parts[parts.length - 1] || '').replace(/\.[^.]+$/, '').toLowerCase()
        };
      }).filter(function (item) { return item.src; });
      state.stickerCategories = ['all'].concat(Array.from(categories).filter(function (cat) { return cat !== 'all'; }).sort());
      state.stickersLoaded = true;
    } catch (error) {
      state.stickerAll = [];
      state.stickersLoaded = true;
    } finally {
      state.stickersLoading = false;
      renderStickerDrawer();
    }
  }

  function renderStickerDrawer() {
    if (!state.stickerOpen) return;
    const cats = root.querySelector('#cal-sticker-cats');
    if (cats) {
      cats.innerHTML = state.stickerCategories.map(function (cat) {
        const label = cat === 'all' ? 'todos' : (STICKER_CATEGORY_LABELS[cat] || cat);
        return '<button class="cal-st-cat' + (state.stickerCategory === cat ? ' is-active' : '') + '" type="button" data-st-cat="' + escape(cat) + '">' + escape(label) + '</button>';
      }).join('');
    }
    const search = root.querySelector('#cal-sticker-search');
    if (search && search.value !== state.stickerQuery) search.value = state.stickerQuery;
    renderStickerGrid();
  }

  function renderStickerGrid() {
    const grid = root.querySelector('#cal-sticker-grid');
    if (!grid) return;
    if (state.stickersLoading) {
      grid.innerHTML = '<p class="cal-st-empty">carregando adesivos...</p>';
      return;
    }
    if (!state.stickersLoaded) {
      grid.innerHTML = '<p class="cal-st-empty">abrindo a gavetinha...</p>';
      return;
    }
    const query = state.stickerQuery.trim().toLowerCase();
    const list = state.stickerAll.filter(function (item) {
      if (state.stickerCategory !== 'all' && item.category !== state.stickerCategory) return false;
      return !query || item.name.indexOf(query) !== -1;
    });
    const visible = list.slice(0, state.stickerLimit);
    const more = list.length > visible.length
      ? '<button class="cal-st-more" type="button" data-st-more>mostrar mais (' + (list.length - visible.length) + ')</button>'
      : '';
    grid.innerHTML = visible.length ? visible.map(function (item) {
      return '<button class="cal-st-item" type="button" data-st-src="' + escape(item.src) + '" title="' + escape(item.name) + '">'
        + '<img src="' + escape(item.src) + '" alt="' + escape(item.name) + '" loading="lazy">'
        + '</button>';
    }).join('') + more : '<p class="cal-st-empty">nenhum adesivo encontrado</p>';
  }

  SMA.PersonalPlanner = { init: init };
})();
