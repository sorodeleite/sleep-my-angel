(function () {
  const SMA = window.SMA;
  if (!SMA) return;

  const SCRIPT_KEY = 'sma_shift_scripts';
  const CATEGORY_KEY = 'sma_shift_categories';
  const EVENT_KEY = 'sma_planner_events';
  const TASK_KEY = 'sma_planner_tasks';
  const DEFAULT_CATEGORIES = ['geral', 'aparência', 'personalidade', 'relacionamentos', 'rotina', 'regras'];
  const CalendarEvents = window.PooftieCalendarEvents || null;
  const state = {
    scriptId: null,
    scriptFiles: [],
    scriptImages: [],
    imagePositions: {},
    pendingPreviewUrls: [],
    drag: null,
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDay: dateKey(new Date()),
    photoUrls: new Map()
  };

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function escape(value) {
    return SMA.escapeHTML(value == null ? '' : String(value));
  }

  function readList(key) {
    const value = SMA.readJSON(key, []);
    return Array.isArray(value) ? value : [];
  }

  function writeList(key, value) {
    if (!SMA.writeJSON(key, value)) {
      SMA.toast('não consegui salvar. talvez o armazenamento esteja cheio.', 'error');
      return false;
    }
    return true;
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function parseDate(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || !parts.every(Number.isFinite)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dateLabel(value, options) {
    return parseDate(value).toLocaleDateString('pt-BR', options || { day: 'numeric', month: 'long' });
  }

  function initScripts() {
    const root = document.getElementById('shift-scripts-root');
    if (!root || root.dataset.ready) return;
    root.innerHTML = '<div class="studio-shell shift-shell"><header class="studio-heading"><div><span class="studio-kicker">your desired reality · personal archive</span><h1>shift scripts <span>♡</span></h1><p>seus roteiros, detalhes, regras e referências em um só lugar.</p></div><button class="studio-primary" type="button" data-shift-action="new">＋ novo script</button></header><div class="studio-category-row" id="shift-category-list"></div><div class="shift-script-grid" id="shift-script-list"></div><div class="studio-modal" id="shift-editor" hidden><form class="studio-modal-card shift-editor-card" id="shift-script-form"><div class="studio-modal-head"><div><span class="studio-kicker">a little world of your own</span><h2 id="shift-editor-heading">novo script</h2></div><button class="studio-icon-btn" type="button" data-shift-action="close" aria-label="fechar">×</button></div><label class="studio-field">nome do script<input id="shift-title" maxlength="90" required placeholder="ex.: minha realidade desejada"></label><div class="studio-field-row"><label class="studio-field">categoria<select id="shift-category"></select></label><label class="studio-field">outra categoria<input id="shift-new-category" maxlength="32" placeholder="criar categoria"></label></div><label class="studio-field">pequena descrição<input id="shift-summary" maxlength="180" placeholder="uma frase para identificar esse script"></label><div class="studio-field notion-page-field"><span class="studio-field-label">sua página</span><div class="notion-toolbar"><button type="button" data-editor-command="bold"><b>B</b></button><button type="button" data-editor-command="italic"><i>I</i></button><button type="button" data-editor-command="underline"><u>U</u></button><button type="button" data-editor-command="formatBlock" data-editor-value="h2">H</button><button type="button" data-editor-command="insertUnorderedList">☷</button><button type="button" data-editor-command="insertOrderedList">1.</button><button type="button" data-editor-command="formatBlock" data-editor-value="blockquote">❝</button><button type="button" data-editor-command="formatBlock" data-editor-value="p">¶</button></div><div id="shift-body" class="notion-editor" contenteditable="true" data-placeholder="Comece a escrever... use títulos, listas, divisões e tudo o que precisar."></div></div><div class="studio-field milanote-field"><div class="milanote-board-head"><div><span class="studio-field-label">moodboard · seu espaço criativo</span><small>arraste as imagens para organizar como quiser ♡</small></div><label class="studio-upload">＋ adicionar fotos<input id="shift-photos" type="file" accept="image/*" multiple hidden></label></div><div class="milanote-board" id="shift-image-preview"><div class="milanote-board-hint">seu mural começa aqui ✧</div></div></div><div class="studio-modal-actions"><button class="studio-secondary" type="button" data-shift-action="close">cancelar</button><button class="studio-primary" type="submit">salvar script ♡</button></div></form></div></div>';
    root.addEventListener('click', handleScriptClick);
    root.addEventListener('submit', handleScriptSubmit);
    root.addEventListener('change', handleScriptChange);
    root.addEventListener('click', handleEditorToolbar);
    const board = root.querySelector('#shift-image-preview');
    board.addEventListener('pointerdown', handleBoardPointerDown);
    board.addEventListener('pointermove', handleBoardPointerMove);
    board.addEventListener('pointerup', handleBoardPointerUp);
    board.addEventListener('pointercancel', handleBoardPointerUp);
    renderScripts();
    root.dataset.ready = '1';
  }

  function scripts() {
    return readList(SCRIPT_KEY);
  }

  function categories() {
    const saved = readList(CATEGORY_KEY);
    return Array.from(new Set(DEFAULT_CATEGORIES.concat(saved).filter(Boolean)));
  }

  function renderScripts() {
    const root = document.getElementById('shift-scripts-root');
    if (!root) return;
    const categoryRow = root.querySelector('#shift-category-list');
    const list = root.querySelector('#shift-script-list');
    if (!categoryRow || !list) return;
    const selected = categoryRow.dataset.selected || 'todas';
    const all = scripts().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    categoryRow.innerHTML = ['todas'].concat(categories()).map(function (category) {
      return '<button class="studio-chip' + (selected === category ? ' active' : '') + '" type="button" data-shift-action="filter" data-category="' + escape(category) + '">' + escape(category) + '</button>';
    }).join('');
    categoryRow.dataset.selected = selected;
    const visible = selected === 'todas' ? all : all.filter(function (item) { return item.category === selected; });
    if (!visible.length) {
      list.innerHTML = '<div class="studio-empty"><span>୨୧</span><strong>seu cantinho ainda está vazio</strong><p>crie seu primeiro script e comece a organizar os detalhes da sua realidade desejada.</p><button class="studio-primary" type="button" data-shift-action="new">criar primeiro script</button></div>';
      return;
    }
    list.innerHTML = visible.map(function (item) {
      return '<article class="shift-script-card" data-script-id="' + escape(item.id) + '"><div class="shift-card-top"><span class="studio-tag">' + escape(item.category || 'geral') + '</span><button class="studio-icon-btn" type="button" data-shift-action="edit" data-id="' + escape(item.id) + '" aria-label="editar">···</button></div><button class="shift-card-open" type="button" data-shift-action="edit" data-id="' + escape(item.id) + '"><h2>' + escape(item.title) + '</h2><p>' + escape(item.summary || 'seu script pessoal') + '</p></button><div class="shift-card-collage" data-script-collage="' + escape(item.id) + '"></div><div class="shift-card-bottom"><span>' + (item.images || []).length + ' referências</span><button class="studio-text-btn" type="button" data-shift-action="delete" data-id="' + escape(item.id) + '">apagar</button></div></article>';
    }).join('');
    visible.forEach(function (item) { paintScriptCollage(item); });
  }

  async function paintScriptCollage(item) {
    const holder = document.querySelector('[data-script-collage="' + CSS.escape(item.id) + '"]');
    if (!holder) return;
    const ids = (item.images || []).slice(0, 4);
    const records = await Promise.all(ids.map(function (id) { return SMA.studioStore.getShiftImage(id); }));
    if (!holder.isConnected) return;
    holder.innerHTML = records.filter(function (record) { return record && record.blob; }).map(function (record) {
      const url = SMA.studioStore.imageUrl('shift', record.id, record.blob);
      return '<img src="' + url + '" alt="" loading="lazy">';
    }).join('');
  }

  function openScriptEditor(item) {
    const root = document.getElementById('shift-scripts-root');
    const modal = root.querySelector('#shift-editor');
    const form = root.querySelector('#shift-script-form');
    state.scriptId = item ? item.id : null;
    state.scriptFiles = [];
    state.scriptImages = item && Array.isArray(item.images) ? item.images.slice() : [];
    state.imagePositions = item && item.imagePositions ? Object.assign({}, item.imagePositions) : {};
    state.pendingPreviewUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    state.pendingPreviewUrls = [];
    state.drag = null;
    root.querySelector('#shift-editor-heading').textContent = item ? 'editar script' : 'novo script';
    root.querySelector('#shift-title').value = item ? item.title : '';
    root.querySelector('#shift-summary').value = item ? item.summary || '' : '';
    const editor = root.querySelector('#shift-body');
    editor.innerHTML = item ? editorContent(item.body || '', item.rules || '') : '<p><br></p>';
    root.querySelector('#shift-new-category').value = '';
    const select = root.querySelector('#shift-category');
    select.innerHTML = categories().map(function (category) {
      return '<option value="' + escape(category) + '">' + escape(category) + '</option>';
    }).join('');
    select.value = item && item.category && categories().includes(item.category) ? item.category : 'geral';
    root.querySelector('#shift-photos').value = '';
    modal.hidden = false;
    renderShiftImagePreview();
    root.querySelector('#shift-title').focus();
  }

  async function renderShiftImagePreview() {
    const holder = document.getElementById('shift-image-preview');
    if (!holder) return;
    state.pendingPreviewUrls.forEach(URL.revokeObjectURL);
    state.pendingPreviewUrls = [];
    const ids = state.scriptImages.slice();
    const records = await Promise.all(ids.map(function (id) { return SMA.studioStore.getShiftImage(id); }));
    if (!holder.isConnected) return;
    const cards = records.filter(function (record) { return record && record.blob; }).map(function (record) {
      const position = state.imagePositions[record.id] || {};
      const left = Number.isFinite(position.x) ? position.x : 4 + (ids.indexOf(record.id) % 3) * 29;
      const top = Number.isFinite(position.y) ? position.y : 5 + (ids.indexOf(record.id) % 4) * 19;
      const width = Number.isFinite(position.width) ? position.width : 170;
      return '<div class="milanote-image" data-image-id="' + escape(record.id) + '" style="left:' + left + '%;top:' + top + '%;width:' + width + 'px"><img src="' + SMA.studioStore.imageUrl('shift', record.id, record.blob) + '" alt="" draggable="false"><button type="button" data-shift-action="remove-image" data-id="' + escape(record.id) + '" aria-label="remover imagem">×</button></div>';
    }).join('');
    const pending = state.scriptFiles.map(function (file, index) {
      const id = 'pending-' + index;
      const position = state.imagePositions[id] || {};
      const url = URL.createObjectURL(file);
      state.pendingPreviewUrls.push(url);
      return '<div class="milanote-image is-pending" data-image-id="' + id + '" style="left:' + (Number.isFinite(position.x) ? position.x : 5 + (index % 3) * 29) + '%;top:' + (Number.isFinite(position.y) ? position.y : 8 + (index % 4) * 19) + '%;width:' + (Number.isFinite(position.width) ? position.width : 170) + 'px"><img src="' + url + '" alt="" draggable="false"><button type="button" data-shift-action="remove-pending" data-index="' + index + '" aria-label="remover imagem">×</button></div>';
    }).join('');
    holder.innerHTML = cards + pending + ((!cards && !pending) ? '<div class="milanote-board-hint">seu mural começa aqui ✧<br>adicione fotos e arraste para decorar</div>' : '');
  }

  function handleBoardPointerDown(event) {
    if (event.target.closest('[data-shift-action]')) return;
    const card = event.target.closest('.milanote-image');
    if (!card) return;
    const holder = document.getElementById('shift-image-preview');
    const bounds = holder.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    state.drag = { card: card, id: card.dataset.imageId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, bounds: bounds };
    card.classList.add('is-dragging');
    card.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleBoardPointerMove(event) {
    if (!state.drag) return;
    const drag = state.drag;
    const width = drag.bounds.width || 1;
    const height = drag.bounds.height || 1;
    const x = Math.max(0, Math.min(100, ((event.clientX - drag.bounds.left - drag.offsetX) / width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - drag.bounds.top - drag.offsetY) / height) * 100));
    drag.card.style.left = x + '%';
    drag.card.style.top = y + '%';
    state.imagePositions[drag.id] = Object.assign({}, state.imagePositions[drag.id], { x: x, y: y });
  }

  function handleBoardPointerUp() {
    if (!state.drag) return;
    state.drag.card.classList.remove('is-dragging');
    state.drag = null;
  }

  function editorContent(body, rules) {
    const text = String(body || '');
    const html = /<\\/?(p|h[1-3]|ul|ol|li|strong|em|u|blockquote|br|hr)\\b/i.test(text)
      ? text
      : text.split(/\\n{2,}/).map(function (part) { return '<p>' + escape(part).replace(/\\n/g, '<br>') + '</p>'; }).join('');
    const extra = rules ? '<h2>regras e observações</h2><p>' + escape(rules).replace(/\\n/g, '<br>') + '</p>' : '';
    return cleanEditorHTMLFromString(html + extra);
  }

  function cleanEditorHTMLFromString(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    const allowed = new Set(['P', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'STRONG', 'B', 'EM', 'I', 'U', 'BR', 'HR', 'DIV']);
    function clean(parent) {
      Array.from(parent.childNodes).forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!allowed.has(node.tagName)) {
            node.replaceWith(document.createTextNode(node.textContent || ''));
            return;
          }
          Array.from(node.attributes).forEach(function (attribute) { node.removeAttribute(attribute.name); });
          clean(node);
        } else if (node.nodeType !== Node.TEXT_NODE) {
          node.remove();
        }
      });
    }
    clean(template.content);
    return template.innerHTML || '<p><br></p>';
  }

  function cleanEditorHTML(editor) {
    return cleanEditorHTMLFromString(editor.innerHTML);
  }

  function handleEditorToolbar(event) {
    const button = event.target.closest('[data-editor-command]');
    if (!button) return;
    const editor = document.getElementById('shift-body');
    if (!editor) return;
    editor.focus();
    const command = button.dataset.editorCommand;
    document.execCommand(command, false, button.dataset.editorValue || null);
  }

  function handleScriptClick(event) {
    const button = event.target.closest('[data-shift-action]');
    if (!button) return;
    const action = button.dataset.shiftAction;
    const id = button.dataset.id;
    if (action === 'new') openScriptEditor(null);
    if (action === 'close') document.getElementById('shift-editor').hidden = true;
    if (action === 'filter') {
      const row = document.getElementById('shift-category-list');
      row.dataset.selected = button.dataset.category;
      renderScripts();
    }
    if (action === 'edit') {
      const item = scripts().find(function (script) { return script.id === id; });
      if (item) openScriptEditor(item);
    }
    if (action === 'delete') {
      const item = scripts().find(function (script) { return script.id === id; });
      if (!item || !window.confirm('apagar o script "' + item.title + '"?')) return;
      Promise.all((item.images || []).map(function (imageId) { return SMA.studioStore.removeShiftImage(imageId); }));
      writeList(SCRIPT_KEY, scripts().filter(function (script) { return script.id !== id; }));
      renderScripts();
      SMA.toast('script apagado');
    }
    if (action === 'remove-image') {
      state.scriptImages = state.scriptImages.filter(function (imageId) { return imageId !== id; });
      delete state.imagePositions[id];
      renderShiftImagePreview();
    }
    if (action === 'remove-pending') {
      const pendingId = 'pending-' + Number(button.dataset.index);
      delete state.imagePositions[pendingId];
      state.scriptFiles.splice(Number(button.dataset.index), 1);
      renderShiftImagePreview();
    }
  }

  function handleScriptChange(event) {
    if (event.target.id !== 'shift-photos') return;
    const files = Array.from(event.target.files || []).filter(function (file) {
      return file.type.indexOf('image/') === 0 && file.size <= 12 * 1024 * 1024;
    });
    const available = Math.max(0, 12 - state.scriptImages.length - state.scriptFiles.length);
    state.scriptFiles = state.scriptFiles.concat(files.slice(0, available));
    if (files.length > available) SMA.toast('cada script pode ter até 12 imagens');
    if (Array.from(event.target.files || []).some(function (file) { return file.size > 12 * 1024 * 1024; })) {
      SMA.toast('algumas fotos passaram do limite de 12 MB');
    }
    event.target.value = '';
    renderShiftImagePreview();
  }

  async function handleScriptSubmit(event) {
    if (event.target.id !== 'shift-script-form') return;
    event.preventDefault();
    const root = document.getElementById('shift-scripts-root');
    const title = root.querySelector('#shift-title').value.trim();
    if (!title) return;
    let category = root.querySelector('#shift-new-category').value.trim().toLowerCase();
    if (!category) category = root.querySelector('#shift-category').value;
    if (!category) category = 'geral';
    if (category.length > 32) category = category.slice(0, 32);
    if (!categories().includes(category)) {
      const next = categories().concat(category);
      writeList(CATEGORY_KEY, next);
    }
    const current = scripts();
    const previous = current.find(function (item) { return item.id === state.scriptId; });
    const images = state.scriptImages.slice();
    const removedImages = previous && Array.isArray(previous.images) ? previous.images.filter(function (id) { return !images.includes(id); }) : [];
    await Promise.all(removedImages.map(function (id) { return SMA.studioStore.removeShiftImage(id); }));
    for (const file of state.scriptFiles) {
      const imageId = uid('shift-image');
      const saved = await SMA.studioStore.putShiftImage(imageId, file);
      if (saved) {
        images.push(imageId);
        const pendingPosition = state.imagePositions['pending-' + state.scriptFiles.indexOf(file)];
        if (pendingPosition) state.imagePositions[imageId] = pendingPosition;
      }
    }
    const item = {
      id: state.scriptId || uid('script'),
      title: title.slice(0, 90),
      category: category,
      summary: root.querySelector('#shift-summary').value.trim().slice(0, 180),
      body: cleanEditorHTML(root.querySelector('#shift-body')),
      rules: '',
      images: images.slice(0, 12),
      imagePositions: Object.keys(state.imagePositions).reduce(function (positions, key) {
        if (images.includes(key)) positions[key] = state.imagePositions[key];
        else if (key.indexOf('pending-') === 0) {
          const index = Number(key.slice(8));
          const file = state.scriptFiles[index];
          const imageIndex = file ? state.scriptFiles.indexOf(file) : -1;
          const savedId = imageIndex >= 0 ? images[state.scriptImages.length + imageIndex] : null;
          if (savedId) positions[savedId] = state.imagePositions[key];
        }
        return positions;
      }, {}),
      createdAt: previous ? previous.createdAt : Date.now(),
      updatedAt: Date.now()
    };
    const next = current.filter(function (script) { return script.id !== item.id; });
    next.unshift(item);
    if (!writeList(SCRIPT_KEY, next)) return;
    root.querySelector('#shift-editor').hidden = true;
    root.querySelector('#shift-category-list').dataset.selected = 'todas';
    renderScripts();
    SMA.toast('script salvo ♡');
  }

  function initPlanner() {
    const root = document.getElementById('planner-root');
    if (!root || root.dataset.ready) return;
    root.innerHTML = '<div class="studio-shell planner-shell"><header class="studio-heading"><div><span class="studio-kicker">little plans, lovely days</span><h1>calendar <span>♡</span></h1><p>compromissos, datas especiais e pequenas tarefas.</p></div></header><div class="planner-layout"><section class="planner-calendar-card"><div class="planner-month-head"><button class="studio-icon-btn" type="button" data-planner-action="prev" aria-label="mês anterior">‹</button><h2 id="planner-month-label"></h2><button class="studio-icon-btn" type="button" data-planner-action="next" aria-label="próximo mês">›</button></div><div class="planner-weekdays"><span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sáb</span><span>dom</span></div><div class="planner-days" id="planner-days"></div><div class="planner-legend"><span><i></i> compromisso</span><span><b>♡</b> hoje</span></div></section><section class="planner-agenda-card"><div class="planner-agenda-head"><div><span class="studio-kicker">selected day</span><h2 id="planner-selected-label"></h2></div><button class="studio-primary" type="button" data-planner-action="new-event">＋ evento</button></div><div class="planner-events" id="planner-events"></div><form class="planner-task-form" id="planner-task-form"><label class="studio-field">nova tarefa<input id="planner-task-input" maxlength="150" placeholder="uma coisinha para fazer..." required></label><input id="planner-task-date" type="date" aria-label="data da tarefa"><button class="studio-primary" type="submit">＋</button></form><div class="planner-task-list" id="planner-task-list"></div></section></div><div class="studio-modal" id="planner-event-modal" hidden><form class="studio-modal-card planner-event-form" id="planner-event-form"><div class="studio-modal-head"><div><span class="studio-kicker">save the date</span><h2>novo compromisso</h2></div><button class="studio-icon-btn" type="button" data-planner-action="close-event" aria-label="fechar">×</button></div><label class="studio-field">nome<input id="planner-event-title" maxlength="100" required placeholder="ex.: consulta, encontro, aniversário"></label><div class="studio-field-row"><label class="studio-field">início<input id="planner-event-date" type="date" required></label><label class="studio-field">fim<input id="planner-event-end" type="date"></label></div><label class="studio-field">observações<textarea id="planner-event-notes" rows="3" placeholder="detalhes, endereço, lembretes..."></textarea></label><div class="studio-modal-actions"><button class="studio-secondary" type="button" data-planner-action="close-event">cancelar</button><button class="studio-primary" type="submit">salvar evento</button></div></form></div></div>';
    root.addEventListener('click', handlePlannerClick);
    root.addEventListener('submit', handlePlannerSubmit);
    renderPlanner();
    root.dataset.ready = '1';
  }

  function events() {
    if (!CalendarEvents) return readList(EVENT_KEY);
    let list = CalendarEvents.ler(localStorage);
    if (!list.length) {
      const legacy = readList(EVENT_KEY);
      if (legacy.length) {
        list = legacy.map(function (item) {
          return CalendarEvents.criar({
            titulo: item.title,
            inicio: item.date,
            fim: item.endDate || item.date,
            cor: CalendarEvents.CORES[0]
          });
        }).filter(Boolean);
        CalendarEvents.guardar(localStorage, list);
      }
    }
    return list;
  }

  function saveEvents(list) {
    if (CalendarEvents) return CalendarEvents.guardar(localStorage, list);
    return writeList(EVENT_KEY, list);
  }

  function tasks() {
    return readList(TASK_KEY);
  }

  function renderPlanner() {
    const root = document.getElementById('planner-root');
    if (!root) return;
    const monthLabel = root.querySelector('#planner-month-label');
    const days = root.querySelector('#planner-days');
    if (!monthLabel || !days) return;
    monthLabel.textContent = state.month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const first = new Date(state.month.getFullYear(), state.month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0).getDate();
    const today = dateKey(new Date());
    const marked = new Set();
    events().forEach(function (item) {
      if (CalendarEvents) {
        let day = item.inicio;
        while (day <= item.fim) { marked.add(day); day = CalendarEvents.somarDias(day, 1); }
      } else marked.add(item.date);
    });
    let cells = '';
    for (let i = 0; i < offset; i += 1) cells += '<span class="planner-day is-empty"></span>';
    for (let day = 1; day <= count; day += 1) {
      const key = dateKey(new Date(state.month.getFullYear(), state.month.getMonth(), day));
      const classes = ['planner-day'];
      if (key === today) classes.push('is-today');
      if (key === state.selectedDay) classes.push('is-selected');
      if (marked.has(key)) classes.push('has-event');
      cells += '<button class="' + classes.join(' ') + '" type="button" data-planner-action="select-day" data-date="' + key + '">' + day + '<i></i></button>';
    }
    days.innerHTML = cells;
    root.querySelector('#planner-selected-label').textContent = dateLabel(state.selectedDay, { weekday: 'long', day: 'numeric', month: 'long' });
    const dayEvents = events().filter(function (item) {
      return CalendarEvents ? item.inicio <= state.selectedDay && item.fim >= state.selectedDay : item.date === state.selectedDay;
    }).sort(function (a, b) {
      return String(a.horario || a.time || '').localeCompare(String(b.horario || b.time || ''));
    });
    root.querySelector('#planner-events').innerHTML = dayEvents.length ? dayEvents.map(function (item) {
      const title = item.titulo || item.title;
      const when = CalendarEvents ? (item.inicio === item.fim ? 'dia todo' : dateLabel(item.inicio, { day: 'numeric', month: 'short' }) + ' – ' + dateLabel(item.fim, { day: 'numeric', month: 'short' })) : (item.time || 'dia todo');
      return '<article class="planner-event"><div class="planner-event-time"><i style="background:' + escape(item.cor || '#f9c8d7') + '"></i>' + escape(when) + '</div><div class="planner-event-copy"><strong>' + escape(title) + '</strong></div><button type="button" data-planner-action="delete-event" data-id="' + escape(item.id) + '" aria-label="apagar evento">×</button></article>';
    }).join('') : '<div class="planner-empty">nenhum compromisso por aqui ♡</div>';
    root.querySelector('#planner-task-date').value = state.selectedDay;
    const dayTasks = tasks().filter(function (item) { return !item.date || item.date === state.selectedDay; });
    root.querySelector('#planner-task-list').innerHTML = dayTasks.length ? dayTasks.map(function (item) {
      return '<label class="planner-task' + (item.done ? ' is-done' : '') + '"><input type="checkbox" data-planner-action="toggle-task" data-id="' + escape(item.id) + '"' + (item.done ? ' checked' : '') + '><span>' + escape(item.text) + '</span>' + (item.date ? '<small>' + escape(dateLabel(item.date, { day: 'numeric', month: 'short' })) + '</small>' : '') + '<button type="button" data-planner-action="delete-task" data-id="' + escape(item.id) + '" aria-label="apagar tarefa">×</button></label>';
    }).join('') : '<div class="planner-empty">suas tarefas vão aparecer aqui ‧°✧</div>';
  }

  function handlePlannerClick(event) {
    const button = event.target.closest('[data-planner-action]');
    if (!button) return;
    const action = button.dataset.plannerAction;
    if (action === 'prev') state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
    if (action === 'next') state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    if (action === 'select-day') {
      state.selectedDay = button.dataset.date;
      const selected = parseDate(state.selectedDay);
      state.month = new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    if (action === 'new-event') {
      const modal = document.getElementById('planner-event-modal');
      modal.hidden = false;
      document.getElementById('planner-event-date').value = state.selectedDay;
      document.getElementById('planner-event-title').focus();
    }
    if (action === 'close-event') document.getElementById('planner-event-modal').hidden = true;
    if (action === 'delete-event') {
      const remaining = events().filter(function (item) { return item.id !== button.dataset.id; });
      if (CalendarEvents) saveEvents(CalendarEvents.semEvento(remaining, button.dataset.id));
      else saveEvents(remaining);
    }
    if (action === 'delete-task') {
      writeList(TASK_KEY, tasks().filter(function (item) { return item.id !== button.dataset.id; }));
    }
    if (action === 'toggle-task') {
      const list = tasks();
      const item = list.find(function (task) { return task.id === button.dataset.id; });
      if (item) item.done = button.checked;
      writeList(TASK_KEY, list);
    }
    renderPlanner();
  }

  function handlePlannerSubmit(event) {
    if (event.target.id === 'planner-task-form') {
      event.preventDefault();
      const input = document.getElementById('planner-task-input');
      const text = input.value.trim();
      if (!text) return;
      const list = tasks();
      list.unshift({ id: uid('task'), text: text.slice(0, 150), date: document.getElementById('planner-task-date').value || state.selectedDay, done: false, createdAt: Date.now() });
      if (writeList(TASK_KEY, list)) {
        input.value = '';
        renderPlanner();
      }
    }
    if (event.target.id === 'planner-event-form') {
      event.preventDefault();
      const title = document.getElementById('planner-event-title').value.trim();
      const date = document.getElementById('planner-event-date').value;
      if (!title || !date) return;
      const list = events();
      if (CalendarEvents) {
        const endDate = document.getElementById('planner-event-end').value || date;
        const event = CalendarEvents.criar({ titulo: title, inicio: date, fim: endDate, cor: CalendarEvents.CORES[list.length % CalendarEvents.CORES.length] });
        if (event) list.push(event);
      } else {
        list.push({ id: uid('event'), title: title.slice(0, 100), date: date, time: document.getElementById('planner-event-time').value, notes: document.getElementById('planner-event-notes').value.trim().slice(0, 500), createdAt: Date.now() });
      }
      if (saveEvents(list)) {
        state.selectedDay = date;
        const parsed = parseDate(date);
        state.month = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        document.getElementById('planner-event-modal').hidden = true;
        event.target.reset();
        renderPlanner();
      }
    }
  }

  SMA.ShiftScripts = { init: initScripts };
  SMA.PersonalPlanner = { init: initPlanner };
})();