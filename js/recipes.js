(function () {
  const SMA = window.SMA;

  const STORAGE_KEY = 'cookbook_recipes';
  const LEGACY_KEY = 'user_recipes';
  const STICKER_EMOJIS = ['🍓', '🍰', '🧁', '🍯', '🌙', '✧', '☁️', '🌸', '🍪', '🥞', '🍲', '🧸', '🎀', '🕯️', '🍵', '🥛'];

  const DEFAULTS = [
    {
      id: 'waffles',
      title: 'waffles',
      section: 'sweet',
      tag: 'sweet',
      ingredients: [
        '1/2 cup flour',
        '1/2 cup milk',
        '1 egg',
        '1 tablespoon butter',
        '1 tablespoon sugar',
        'a pinch of baking powder'
      ],
      prep: 'Misture tudo com carinho, aqueça a máquina de waffle e deixe dourar. Sirva quentinho com mel ou frutinhas.',
      stickers: []
    },
    {
      id: 'carrot-cake',
      title: 'carrot cake',
      section: 'sweet',
      tag: 'sweet',
      ingredients: [
        '2 cenouras raladas',
        '1 xícara de farinha',
        '1/2 xícara de açúcar mascavo',
        '2 ovos',
        '1/3 xícara de óleo',
        '1 colher de chá de canela'
      ],
      prep: 'Bata a cenoura, os ovos e o óleo. Junte os secos e leve ao forno a 180°C por uns 35 minutos.',
      stickers: []
    },
    {
      id: 'pancakes',
      title: 'pancakes',
      section: 'sweet',
      tag: 'sweet',
      ingredients: [
        '1 xícara de farinha',
        '1 xícara de leite',
        '1 ovo',
        '1 colher de sopa de açúcar',
        '1 colher de chá de fermento'
      ],
      prep: 'Misture até ficar lisinho e faça panquecas pequenas numa frigideira antiaderente. Empilhe com mel.',
      stickers: []
    },
    {
      id: 'sausage-risotto',
      title: 'sausage risotto',
      section: 'savory',
      tag: 'savory',
      ingredients: [
        '1 xícara de arroz arbóreo',
        '2 linguiças desmanchadas',
        '1/2 cebola picadinha',
        '4 xícaras de caldo quente',
        'queijo parmesão',
        'manteiga'
      ],
      prep: 'Refogue a cebola e a linguiça, junte o arroz e vá adicionando o caldo aos poucos, mexendo até ficar cremoso. Finalize com manteiga e parmesão.',
      stickers: []
    },
    {
      id: 'carbonara-sauce',
      title: 'carbonara sauce',
      section: 'savory',
      tag: 'savory',
      ingredients: [
        '2 gemas',
        '1 ovo inteiro',
        '50g de parmesão ralado',
        '100g de pancetta ou bacon',
        'pimenta-do-reino',
        'massa de sua escolha'
      ],
      prep: 'Doure a pancetta, misture os ovos com o queijo e a pimenta, e junte à massa quente fora do fogo para o creme não talhar.',
      stickers: []
    }
  ];

  let recipes = [];
  let root = null;
  let editingId = null;
  let selectedSticker = null;
  let activeLayer = null;
  let activeRecipeId = null;
  let activeControls = null;

  function uniqueId() {
    return 'recipe-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function cleanText(value) {
    return String(value == null ? '' : value).trim();
  }

  function splitIngredients(value) {
    if (Array.isArray(value)) {
      return value.map(cleanText).filter(Boolean);
    }
    return String(value || '')
      .split(/\r?\n|;/)
      .map(function (item) { return item.replace(/^[-•*]\s*/, '').trim(); })
      .filter(Boolean);
  }

  function normalize(recipe) {
    const ingredients = splitIngredients(recipe.ingredients);
    const stickers = Array.isArray(recipe.stickers)
      ? recipe.stickers
        .filter(function (sticker) { return sticker && (sticker.value || sticker.content); })
        .map(function (sticker) {
          return {
            id: String(sticker.id || Math.random().toString(36).slice(2, 8)),
            kind: sticker.kind === 'image' ? 'image' : 'emoji',
            value: String(sticker.value || sticker.content || ''),
            x: Number.isFinite(Number(sticker.x)) ? Number(sticker.x) : 50,
            y: Number.isFinite(Number(sticker.y)) ? Number(sticker.y) : 50,
            size: Number.isFinite(Number(sticker.size)) ? Number(sticker.size) : 38,
            rotate: Number.isFinite(Number(sticker.rotate)) ? Number(sticker.rotate) : 0
          };
        })
      : [];
    return {
      id: String(recipe.id || uniqueId()),
      title: cleanText(recipe.title) || 'receita sem nome',
      section: recipe.section === 'savory' ? 'savory' : 'sweet',
      tag: cleanText(recipe.tag) || (recipe.section === 'savory' ? 'savory' : 'sweet'),
      ingredients: ingredients,
      prep: cleanText(recipe.prep || recipe.preparation),
      stickers: stickers,
      createdAt: Number(recipe.createdAt) || Date.now()
    };
  }

  function load() {
    const saved = SMA.readJSON(STORAGE_KEY, null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map(normalize);
    }
    const legacy = SMA.readJSON(LEGACY_KEY, null);
    if (Array.isArray(legacy) && legacy.length > 0) {
      return legacy.map(function (recipe) {
        return normalize({
          title: recipe.title,
          section: /chá|leite|moon|chocolate|golden/i.test(recipe.title || '') ? 'sweet' : 'sweet',
          tag: recipe.tag,
          ingredients: recipe.ingredients,
          prep: recipe.prep
        });
      });
    }
    return DEFAULTS.map(normalize);
  }

  function persist() {
    if (!SMA.writeJSON(STORAGE_KEY, recipes)) {
      SMA.toast('as receitas estão grandes demais para guardar neste navegador');
    }
  }

  function findRecipe(id) {
    return recipes.find(function (recipe) { return recipe.id === id; }) || null;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function paintSticker(element, sticker) {
    element.style.left = sticker.x + '%';
    element.style.top = sticker.y + '%';
    element.style.fontSize = sticker.size + 'px';
    element.style.transform = 'translate(-50%, -50%) rotate(' + sticker.rotate + 'deg)';
    element.dataset.stickerId = sticker.id;
    if (sticker.kind === 'image') {
      let image = element.querySelector('img');
      if (!image) {
        image = document.createElement('img');
        image.alt = 'adesivo';
        image.draggable = false;
        element.appendChild(image);
      }
      image.src = sticker.value;
    } else {
      let glyph = element.querySelector('.sticker-glyph');
      if (!glyph) {
        glyph = document.createElement('span');
        glyph.className = 'sticker-glyph';
        element.insertBefore(glyph, element.firstChild);
      }
      glyph.textContent = sticker.value;
    }
  }

  function renderStickerLayer(layer, recipe, editing) {
    layer.textContent = '';
    layer.classList.toggle('is-editing', editing);
    recipe.stickers.forEach(function (sticker) {
      const element = createElement('span', 'cookbook-sticker');
      paintSticker(element, sticker);
      if (editing) {
        const remove = createElement('button', 'sticker-remove', '×');
        remove.type = 'button';
        remove.setAttribute('aria-label', 'remover adesivo');
        remove.addEventListener('click', function (event) {
          event.stopPropagation();
          recipe.stickers = recipe.stickers.filter(function (item) { return item.id !== sticker.id; });
          if (selectedSticker && selectedSticker.id === sticker.id) selectedSticker = null;
          persist();
          renderStickerLayer(layer, recipe, true);
        });
        element.appendChild(remove);
        element.addEventListener('pointerdown', function (event) {
          if (event.target === remove) return;
          startStickerDrag(event, element, layer, recipe, sticker);
        });
      }
      layer.appendChild(element);
    });
  }

  function startStickerDrag(event, element, layer, recipe, sticker) {
    event.preventDefault();
    selectedSticker = sticker;
    activeRecipeId = recipe.id;
    activeLayer = layer;
    const detail = element.closest('.cookbook-detail');
    activeControls = detail ? detail.querySelector('.sticker-controls') : null;
    element.classList.add('is-selected');
    const rect = layer.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    element.setPointerCapture(event.pointerId);
    const move = function (moveEvent) {
      sticker.x = SMA.clamp(((moveEvent.clientX - rect.left) / rect.width) * 100, 2, 98);
      sticker.y = SMA.clamp(((moveEvent.clientY - rect.top) / rect.height) * 100, 2, 98);
      paintSticker(element, sticker);
    };
    const up = function () {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      persist();
      renderStickerControls();
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    renderStickerControls();
  }

  function renderStickerControls() {
    const controls = activeControls;
    if (!controls) return;
    controls.hidden = !selectedSticker;
    if (!selectedSticker) return;
    const sizeLabel = controls.querySelector('.sticker-size');
    if (sizeLabel) sizeLabel.textContent = Math.round(selectedSticker.size) + 'px';
  }

  function mutateSelected(mutator) {
    if (!selectedSticker || !activeLayer) return;
    const recipe = findRecipe(activeRecipeId);
    if (!recipe) return;
    mutator(selectedSticker);
    persist();
    renderStickerLayer(activeLayer, recipe, true);
    renderStickerControls();
  }

  function addSticker(recipe, value, kind) {
    const sticker = {
      id: Math.random().toString(36).slice(2, 9),
      kind: kind === 'image' ? 'image' : 'emoji',
      value: value,
      x: 50 + (Math.random() * 24 - 12),
      y: 46 + (Math.random() * 20 - 10),
      size: kind === 'image' ? 72 : 38,
      rotate: Math.round(Math.random() * 24 - 12)
    };
    recipe.stickers.push(sticker);
    persist();
    if (activeLayer) {
      renderStickerLayer(activeLayer, recipe, true);
      const detail = activeLayer.closest('.cookbook-detail');
      activeControls = detail ? detail.querySelector('.sticker-controls') : activeControls;
    }
    selectedSticker = sticker;
    renderStickerControls();
  }

  function sectionBlock(section) {
    const block = createElement('section', 'cookbook-section');
    const label = createElement('div', 'cookbook-section-label', section === 'savory' ? 'savory' : 'sweet');
    block.appendChild(label);
    const list = createElement('ul', 'cookbook-list');
    const entries = recipes.filter(function (recipe) { return recipe.section === section; });
    const order = section === 'savory'
      ? ['sausage-risotto', 'carbonara-sauce']
      : ['carrot-cake', 'pancakes', 'waffles'];
    entries.sort(function (a, b) {
      const left = order.indexOf(a.id);
      const right = order.indexOf(b.id);
      return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
    });
    if (entries.length === 0) {
      const empty = createElement('li', 'cookbook-empty', 'nenhuma receitinha aqui ainda ‧°');
      list.appendChild(empty);
    }
    entries.forEach(function (recipe) {
      list.appendChild(recipeEntry(recipe));
    });
    block.appendChild(list);
    return block;
  }

  function recipeEntry(recipe) {
    const item = createElement('li', 'cookbook-entry');
    item.dataset.id = recipe.id;
    const toggle = createElement('button', 'cookbook-toggle');
    toggle.type = 'button';
    const triangle = createElement('span', 'cookbook-triangle', '▶');
    const title = createElement('span', 'cookbook-recipe-title', recipe.title);
    toggle.appendChild(triangle);
    toggle.appendChild(title);
    const detail = createElement('div', 'cookbook-detail');
    detail.hidden = recipe.id !== 'waffles';
    toggle.setAttribute('aria-expanded', detail.hidden ? 'false' : 'true');
    if (!detail.hidden) triangle.textContent = '▼';

    const ingredients = createElement('ul', 'cookbook-ingredients');
    (recipe.ingredients.length ? recipe.ingredients : ['sem ingredientes anotados']).forEach(function (ingredient) {
      ingredients.appendChild(createElement('li', '', ingredient));
    });
    detail.appendChild(ingredients);

    if (recipe.prep) {
      const prep = createElement('p', 'cookbook-prep');
      prep.appendChild(createElement('strong', '', 'modo de preparo: '));
      prep.appendChild(document.createTextNode(recipe.prep));
      detail.appendChild(prep);
    }

    const layer = createElement('div', 'cookbook-sticker-layer');
    renderStickerLayer(layer, recipe, false);
    detail.appendChild(layer);

    const actions = createElement('div', 'cookbook-actions');
    const stickerButton = createElement('button', 'btn-secondary', '✧ adesivos');
    stickerButton.type = 'button';
    const editButton = createElement('button', 'btn-secondary', 'editar');
    editButton.type = 'button';
    const deleteButton = createElement('button', 'action-btn cookbook-delete', '×');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', 'apagar receita');
    deleteButton.title = 'apagar receita';
    actions.appendChild(stickerButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    detail.appendChild(actions);

    const tray = createElement('div', 'sticker-tray');
    tray.hidden = true;
    const emojiRow = createElement('div', 'sticker-emoji-row');
    STICKER_EMOJIS.forEach(function (emoji) {
      const button = createElement('button', 'sticker-emoji', emoji);
      button.type = 'button';
      button.setAttribute('aria-label', 'adicionar adesivo ' + emoji);
      button.addEventListener('click', function () {
        addSticker(recipe, emoji, 'emoji');
      });
      emojiRow.appendChild(button);
    });
    tray.appendChild(emojiRow);

    const uploadRow = createElement('div', 'sticker-upload-row');
    const upload = createElement('input');
    upload.type = 'file';
    upload.accept = 'image/*';
    upload.className = 'sticker-upload-input';
    upload.hidden = true;
    const uploadButton = createElement('button', 'btn-secondary', '＋ adesivo da galeria');
    uploadButton.type = 'button';
    uploadButton.addEventListener('click', function () { upload.click(); });
    upload.addEventListener('change', async function () {
      const file = upload.files && upload.files[0];
      upload.value = '';
      if (!file) return;
      try {
        const dataUrl = await SMA.readImageFile(file, 420, 0.86);
        addSticker(recipe, dataUrl, 'image');
      } catch (error) {
        SMA.toast('não consegui abrir essa imagem');
      }
    });

    const controls = createElement('div', 'sticker-controls');
    controls.hidden = true;
    const sizeLabel = createElement('span', 'sticker-size', '38px');
    const smaller = createElement('button', 'sticker-control', 'A−');
    smaller.type = 'button';
    smaller.title = 'diminuir adesivo';
    smaller.addEventListener('click', function () {
      mutateSelected(function (sticker) { sticker.size = SMA.clamp(sticker.size - 6, 18, 140); });
    });
    const bigger = createElement('button', 'sticker-control', 'A＋');
    bigger.type = 'button';
    bigger.title = 'aumentar adesivo';
    bigger.addEventListener('click', function () {
      mutateSelected(function (sticker) { sticker.size = SMA.clamp(sticker.size + 6, 18, 140); });
    });
    const rotate = createElement('button', 'sticker-control', '↻');
    rotate.type = 'button';
    rotate.title = 'girar adesivo';
    rotate.addEventListener('click', function () {
      mutateSelected(function (sticker) { sticker.rotate = (sticker.rotate + 12) % 360; });
    });
    controls.appendChild(sizeLabel);
    controls.appendChild(smaller);
    controls.appendChild(bigger);
    controls.appendChild(rotate);
    tray.appendChild(controls);
    tray.appendChild(uploadRow);
    uploadRow.appendChild(uploadButton);
    uploadRow.appendChild(upload);
    detail.appendChild(tray);

    stickerButton.addEventListener('click', function () {
      tray.hidden = !tray.hidden;
      stickerButton.classList.toggle('active', !tray.hidden);
      activeRecipeId = recipe.id;
      activeLayer = layer;
      activeControls = controls;
      selectedSticker = null;
      renderStickerLayer(layer, recipe, !tray.hidden);
      renderStickerControls();
    });

    editButton.addEventListener('click', function () {
      openRecipeModal(recipe);
    });

    deleteButton.addEventListener('click', function () {
      if (!window.confirm('apagar a receita "' + recipe.title + '"?')) return;
      recipes = recipes.filter(function (item) { return item.id !== recipe.id; });
      persist();
      render();
      SMA.toast('receita apagada');
    });

    toggle.addEventListener('click', function () {
      detail.hidden = !detail.hidden;
      toggle.setAttribute('aria-expanded', detail.hidden ? 'false' : 'true');
      triangle.textContent = detail.hidden ? '▶' : '▼';
      if (detail.hidden) {
        activeLayer = null;
        activeControls = null;
        selectedSticker = null;
      }
    });

    item.appendChild(toggle);
    item.appendChild(detail);
    return item;
  }

  function render() {
    if (!root) return;
    root.textContent = '';
    const page = createElement('div', 'cookbook-page');
    const hero = createElement('header', 'cookbook-hero');
    const titleRow = createElement('div', 'cookbook-title-row');
    const title = createElement('h1', 'cookbook-title');
    title.appendChild(document.createTextNode('cookbook '));
    title.appendChild(createElement('span', 'cookbook-sparkles', '.°✧'));
    titleRow.appendChild(title);
    const add = createElement('button', 'btn-secondary cookbook-add', '＋ nova receita');
    add.type = 'button';
    add.addEventListener('click', function () { openRecipeModal(null); });
    titleRow.appendChild(add);
    hero.appendChild(titleRow);
    hero.appendChild(createElement('p', 'cookbook-subtitle', '( ᵕ. ᵕ ) ‧₊˚'));
    page.appendChild(hero);
    page.appendChild(sectionBlock('sweet'));
    page.appendChild(sectionBlock('savory'));
    const footer = createElement('p', 'cookbook-footer', 'toque numa receitinha pra abrir ‧ adicione adesivos pra deixar a sua cara ✧');
    page.appendChild(footer);
    root.appendChild(page);
  }

  function openRecipeModal(recipe) {
    editingId = recipe ? recipe.id : null;
    const modal = SMA.select('#modal-recipe');
    const name = SMA.select('#recipe-name-input');
    const section = SMA.select('#recipe-section-input');
    const tag = SMA.select('#recipe-tag-input');
    const ingredients = SMA.select('#recipe-ingredients-input');
    const prep = SMA.select('#recipe-prep-input');
    const title = SMA.select('#recipe-modal-title');
    if (title) title.textContent = recipe ? 'Editar Receitinha' : 'Nova Receitinha';
    if (name) name.value = recipe ? recipe.title : '';
    if (section) section.value = recipe ? recipe.section : 'sweet';
    if (tag) tag.value = recipe ? recipe.tag : 'sweet';
    if (ingredients) ingredients.value = recipe ? recipe.ingredients.join('\n') : '';
    if (prep) prep.value = recipe ? recipe.prep : '';
    modal?.classList.add('open');
    setTimeout(function () {
      if (name) name.focus();
    }, 60);
  }

  function saveRecipe() {
    const name = SMA.select('#recipe-name-input');
    const section = SMA.select('#recipe-section-input');
    const tag = SMA.select('#recipe-tag-input');
    const ingredients = SMA.select('#recipe-ingredients-input');
    const prep = SMA.select('#recipe-prep-input');
    const title = name.value.trim();
    const items = splitIngredients(ingredients.value);
    if (!title) {
      SMA.toast('dá um nome pra receitinha primeiro');
      name.focus();
      return;
    }
    if (items.length === 0) {
      SMA.toast('escreve pelo menos um ingrediente');
      ingredients.focus();
      return;
    }
    const previous = editingId ? findRecipe(editingId) : null;
    const recipe = normalize({
      id: previous ? previous.id : uniqueId(),
      title: title,
      section: section.value,
      tag: tag.value,
      ingredients: items,
      prep: prep.value,
      stickers: previous ? previous.stickers : [],
      createdAt: previous ? previous.createdAt : Date.now()
    });
    if (previous) {
      recipes = recipes.map(function (item) { return item.id === previous.id ? recipe : item; });
    } else {
      recipes.unshift(recipe);
    }
    persist();
    SMA.select('#modal-recipe')?.classList.remove('open');
    render();
    SMA.toast(previous ? 'receitinha atualizada ‧°' : 'receitinha guardada ‧°');
  }

  function init() {
    root = SMA.select('#cookbook-root');
    if (!root) return;
    recipes = load();
    persist();
    render();

    SMA.select('#modal-cancel-recipe')?.addEventListener('click', function () {
      SMA.select('#modal-recipe')?.classList.remove('open');
    });

    SMA.select('#modal-save-recipe')?.addEventListener('click', saveRecipe);
  }

  SMA.Recipes = { init: init };
})();
