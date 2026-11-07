(function () {
  const SMA = window.SMA;

  const STORAGE_KEY = 'cookbook_recipes_v3';
  const CHECKS_KEY = 'cookbook_checks_v1';
  const LEGACY_KEYS = ['cookbook_recipes_v2', 'cookbook_recipes', 'user_recipes'];
  const LEGACY_DEFAULT_IDS = [
    'leite-quente', 'moon-milk', 'golden-milk', 'chocolate-noturno',
    'waffles', 'carrot-cake', 'pancakes', 'sausage-risotto', 'carbonara-sauce'
  ];

  const DEFAULTS = [
    {
      id: 'leite-dos-sonhos',
      title: 'leite dos sonhos',
      tag: 'bebida',
      intro: 'o leite quentinho que a minha vó fazia quando eu não conseguia dormir. mel, canela e baunilha — simples, doce e do tamanho exato de um abraço.',
      image: 'assets/recips/leite_dos_sonhos.webp',
      caption: 'leite dos sonhos ‧ canela & mel',
      ingredients: [
        'leite integral ou de aveia: 250 ml',
        'mel: 1 colher de chá',
        'canela em pó: 1 pitada',
        'essência de baunilha: 2 gotinhas'
      ],
      steps: [
        'Aqueça o leite em fogo bem baixinho, sem deixar ferver.',
        'Desligue o fogo e misture o mel e a baunilha.',
        'Despeje na caneca favorita e polvilhe a canela por cima.',
        'Beba em goles pequenos, sentindo o corpo relaxar.'
      ]
    },
    {
      id: 'waffles',
      title: 'waffles crocantes',
      tag: 'café',
      intro: 'waffles douradinhos por fora e macios por dentro. a massa é rápida e o cheiro toma conta da cozinha inteira.',
      image: 'assets/recips/waffles.webp',
      caption: 'waffles ‧ crocantes & quentinhos',
      ingredients: [
        'farinha de trigo: 2 xícaras de chá',
        'sal: 1 colher de chá',
        'fermento em pó: 4 colheres de chá',
        'açúcar: 2 colheres de sopa',
        'ovos: 2 unidades',
        'leite morno: 1 e 1/2 xícara de chá',
        'manteiga derretida: 1/3 de xícara de chá',
        'extrato de baunilha: 1 colher de chá'
      ],
      steps: [
        'Em uma tigela grande, misture a farinha, o sal, o fermento e o açúcar. Reserve.',
        'Pré-aqueça a máquina de waffle na temperatura desejada (eu deixo no máximo).',
        'Em outra tigela, bata os ovos. Acrescente o leite, a manteiga e a baunilha. Despeje a mistura de leite na mistura de farinha e bata com um fouet até incorporar.',
        'Coloque a massa na máquina pré-aquecida. Cozinhe até dourar e ficar crocante. Sirva imediatamente.'
      ]
    },
    {
      id: 'cookies',
      title: 'cookies americanos',
      tag: 'doce',
      intro: 'borda crocante, centro macio e gotas de chocolate derretendo. a dica da geladeira faz toda a diferença.',
      image: 'assets/recips/cookies.webp',
      caption: 'cookies ‧ gotas de chocolate',
      ingredients: [
        'manteiga sem sal: 200 g, em ponto de pomada',
        'açúcar mascavo: 200 g',
        'açúcar branco: 100 g',
        'ovo: 1',
        'essência de baunilha: 1 colher de chá',
        'farinha de trigo: 450 g',
        'bicarbonato de sódio: 5 g',
        'fermento: 5 g',
        'sal: 5 g',
        'gotas de chocolate: 350 g'
      ],
      steps: [
        'Amoleça a manteiga até o ponto de pomada.',
        'Misture em um recipiente a farinha, o bicarbonato, o fermento e o sal. Reserve.',
        'Na batedeira, com o batedor plano, bata a manteiga, o açúcar branco e o mascavo em velocidade média até misturar bem e começar a clarear.',
        'Adicione o ovo e a essência de baunilha. Bata em velocidade média até ficar claro e leve.',
        'Adicione a mistura de farinha em duas partes, batendo devagar entre cada adição.',
        'Quando estiver bem incorporado, adicione as gotas de chocolate.',
        'Se quiser, acrescente nozes, castanhas ou outras oleaginosas.',
        'Dica: guarde a massa na geladeira por 12 a 24 horas para deixar os cookies ainda mais gostosos.',
        'Retire a massa da geladeira, espere voltar à temperatura ambiente e faça bolinhas de 60 g cada.',
        'Congele as bolinhas ou asse imediatamente.',
        'Pré-aqueça o forno a 160 °C (elétrico) ou 180 °C (a gás).',
        'Asse em assadeira forrada com papel-manteiga por 8 a 10 minutos, até as bordas dourarem e o centro ainda parecer mais claro.'
      ]
    },
    {
      id: 'bolinho-air-fryer',
      title: 'bolinho de chocolate na air fryer',
      tag: 'air fryer',
      intro: 'um bolinho pequeno, de casquinha firme e interior cremoso, pra matar a vontade de doce sem ligar o forno.',
      image: 'assets/recips/brownie_na_air_fryer.webp',
      caption: 'bolinho de chocolate ‧ air fryer',
      ingredients: [
        'ovo: 1',
        'açúcar: 4 colheres de sopa',
        'manteiga derretida: 2 colheres de sopa',
        'chocolate em pó 50%: 4 colheres de sopa',
        'farinha de trigo: 3 a 4 colheres de sopa',
        'chocolate meio amargo: pedaços, opcional'
      ],
      steps: [
        'Bata o ovo com o açúcar até formar uma espuma clara.',
        'Acrescente a manteiga derretida e misture novamente.',
        'Adicione o chocolate em pó e mexa. Depois, incorpore a farinha aos poucos até a massa ficar pesada e homogênea.',
        'Despeje em uma forminha de 15 a 18 cm untada com manteiga e chocolate em pó. Espalhe pedaços de chocolate meio amargo por cima.',
        'Asse na air fryer pré-aquecida a 180 °C por cerca de 10 minutos. O ponto ideal é quando a casquinha estiver firme, mas o interior ainda cremoso.',
        'Retire com cuidado e espere esfriar antes de cortar.'
      ]
    },
    {
      id: 'cupcakes',
      title: 'cupcakes de micro-ondas',
      tag: 'doce',
      intro: 'cupcakes fofinhos em poucos minutos, direto no micro-ondas. perfeitos pra emergência de vontade de bolo.',
      image: 'assets/recips/cupcake.webp',
      caption: 'cupcakes ‧ micro-ondas',
      ingredients: [
        'farinha de trigo: 1/2 xícara',
        'açúcar: 1/2 xícara',
        'fermento em pó: 1 colher de chá',
        'leite: 1/3 de xícara',
        'óleo: 1/3 de xícara',
        'ovo: 1',
        'chocolate: 1 barrinha de 25 g, opcional'
      ],
      steps: [
        'Em um recipiente, passe pela peneira a farinha, o açúcar e o fermento. Acrescente o ovo, o leite e o óleo.',
        'Corte o chocolate em pedaços pequenos e coloque na massa.',
        'Misture muito bem e coloque em forminhas de papel.',
        'Leve ao micro-ondas por 2 minutos.',
        'Decore como preferir.'
      ]
    }
  ];

  const DEFAULT_IDS = new Set(DEFAULTS.map(function (recipe) { return recipe.id; }));

  let recipes = [];
  let checks = {};
  let root = null;
  let editingId = null;
  let editingImage = '';
  let editingCaption = '';
  let editingFromDetail = false;
  let activeRecipeId = null;
  let filter = 'all';
  let search = '';
  let lastSearch = '';

  const el = {};

  function uniqueId() {
    return 'recipe-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function cleanText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeForSearch(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function splitIngredients(value) {
    const source = Array.isArray(value)
      ? value
      : String(value || '').split(/\r?\n|;/);
    return source
      .map(function (item) {
        return String(item).replace(/^[-–•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      })
      .filter(Boolean);
  }

  function splitSteps(value) {
    let source;
    if (Array.isArray(value)) {
      source = value.slice();
    } else {
      source = String(value || '').split(/\r?\n+/);
      if (source.length === 1) {
        const single = source[0].trim();
        if (single.length > 260) {
          source = single.split(/(?<=[.!?])\s+/);
        }
      }
    }
    return source
      .map(function (item) {
        return String(item)
          .replace(/^\s*[-–•*]\s*/, '')
          .replace(/^\s*\d+[.)]\s*/, '')
          .trim();
      })
      .filter(Boolean);
  }

  function normalize(recipe) {
    recipe = recipe && typeof recipe === 'object' ? recipe : {};
    const title = cleanText(recipe.title) || 'receita sem nome';
    const steps = splitSteps(recipe.steps != null ? recipe.steps : recipe.prep);
    return {
      id: String(recipe.id || uniqueId()),
      title: title,
      tag: cleanText(recipe.tag) || 'da noite',
      intro: cleanText(recipe.intro || recipe.description || ''),
      image: cleanText(recipe.image),
      caption: cleanText(recipe.caption) || title,
      ingredients: splitIngredients(recipe.ingredients),
      steps: steps,
      prep: steps.join('\n'),
      createdAt: Number(recipe.createdAt) || Date.now()
    };
  }

  function load() {
    const saved = SMA.readJSON(STORAGE_KEY, null);
    if (Array.isArray(saved)) {
      return saved.map(normalize);
    }

    const custom = [];
    const seen = new Set();
    LEGACY_KEYS.forEach(function (key) {
      const previous = SMA.readJSON(key, null);
      if (!Array.isArray(previous)) return;
      previous.forEach(function (recipe) {
        const rawId = String(recipe && recipe.id ? recipe.id : '');
        if (rawId && (LEGACY_DEFAULT_IDS.indexOf(rawId) !== -1 || DEFAULT_IDS.has(rawId))) return;
        const normalized = normalize(recipe);
        if (seen.has(normalized.id)) return;
        seen.add(normalized.id);
        custom.push(normalized);
      });
    });
    return DEFAULTS.map(normalize).concat(custom);
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

  function ingredientParts(line) {
    const separator = line.indexOf(':');
    if (separator === -1) return { name: '', note: line };
    return {
      name: line.slice(0, separator).trim(),
      note: line.slice(separator + 1).trim()
    };
  }

  function checkedSet(recipeId, kind) {
    const entry = checks[recipeId] || {};
    const source = Array.isArray(entry[kind]) ? entry[kind] : [];
    return new Set(source.map(Number).filter(function (index) { return Number.isInteger(index) && index >= 0; }));
  }

  function validCount(recipeId, kind, length) {
    const set = checkedSet(recipeId, kind);
    let total = 0;
    set.forEach(function (index) {
      if (index < length) total += 1;
    });
    return total;
  }

  function totalItems(recipe) {
    return recipe.ingredients.length + recipe.steps.length;
  }

  function doneCount(recipe) {
    return validCount(recipe.id, 'ingredients', recipe.ingredients.length)
      + validCount(recipe.id, 'steps', recipe.steps.length);
  }

  function progressText(recipe) {
    const done = doneCount(recipe);
    const total = totalItems(recipe);
    if (total === 0) return 'sem itens';
    if (done === total && total > 0) return 'tudo pronto ✧';
    if (done > 0) return done + '/' + total + ' feitos';
    return recipe.ingredients.length + (recipe.ingredients.length === 1 ? ' ingrediente' : ' ingredientes');
  }

  function pruneChecks() {
    const known = new Set(recipes.map(function (recipe) { return recipe.id; }));
    Object.keys(checks).forEach(function (id) {
      if (!known.has(id)) {
        delete checks[id];
        return;
      }
      const recipe = findRecipe(id);
      const entry = checks[id];
      if (!recipe || !entry || typeof entry !== 'object') {
        delete checks[id];
        return;
      }
      ['ingredients', 'steps'].forEach(function (kind) {
        const max = kind === 'ingredients' ? recipe.ingredients.length : recipe.steps.length;
        if (!Array.isArray(entry[kind])) {
          entry[kind] = [];
          return;
        }
        entry[kind] = entry[kind]
          .map(Number)
          .filter(function (index) { return Number.isInteger(index) && index >= 0 && index < max; });
      });
    });
  }

  function saveChecks() {
    SMA.writeJSON(CHECKS_KEY, checks);
  }

  function recipeMatchesFilter(recipe) {
    if (filter === 'all') return true;
    const haystack = normalizeForSearch(recipe.title + ' ' + recipe.tag);
    if (filter === 'minhas') return !DEFAULT_IDS.has(recipe.id);
    if (filter === 'bebidas') return /bebida|leite|cha|quente|noite/.test(haystack);
    if (filter === 'doces') return /doce|cookie|bolo|cupcake|waffle|chocolate|sobremesa/.test(haystack);
    if (filter === 'airfryer') return /air\s*fryer|airfryer/.test(haystack);
    return true;
  }

  function visibleRecipes() {
    const query = normalizeForSearch(search.trim());
    return recipes.filter(function (recipe) {
      if (!recipeMatchesFilter(recipe)) return false;
      if (!query) return true;
      const haystack = normalizeForSearch(
        recipe.title + ' ' + recipe.tag + ' ' + recipe.intro + ' '
        + recipe.ingredients.join(' ') + ' ' + recipe.steps.join(' ')
      );
      return haystack.indexOf(query) !== -1;
    });
  }

  function photoNode(recipe) {
    const media = createElement('div', 'recipe-card-media');
    if (recipe.image) {
      const image = document.createElement('img');
      image.src = recipe.image;
      image.alt = recipe.title;
      image.loading = 'lazy';
      image.decoding = 'async';
      media.appendChild(image);
    } else {
      const fallback = createElement('div', 'recipe-card-fallback');
      fallback.appendChild(createElement('span', 'recipe-card-moon', '☾'));
      fallback.appendChild(createElement('small', '', recipe.title));
      media.appendChild(fallback);
    }
    media.appendChild(createElement('span', 'recipe-card-tag', recipe.tag));
    return media;
  }

  function cardFor(recipe) {
    const card = createElement('article', 'recipe-card');
    card.dataset.id = recipe.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'abrir receita ' + recipe.title);
    card.appendChild(photoNode(recipe));

    const actions = createElement('div', 'recipe-card-actions');
    const edit = createElement('button', 'recipe-card-action', '✎');
    edit.type = 'button';
    edit.dataset.action = 'edit';
    edit.title = 'editar receita';
    edit.setAttribute('aria-label', 'editar ' + recipe.title);
    const remove = createElement('button', 'recipe-card-action recipe-card-action-remove', '×');
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.title = 'apagar receita';
    remove.setAttribute('aria-label', 'apagar ' + recipe.title);
    actions.appendChild(edit);
    actions.appendChild(remove);
    card.appendChild(actions);

    const body = createElement('div', 'recipe-card-body');
    body.appendChild(createElement('h3', 'recipe-card-title', recipe.title));
    const sub = createElement('p', 'recipe-card-sub');
    sub.appendChild(createElement('span', 'recipe-card-sub-tag', recipe.tag));
    sub.appendChild(createElement('span', 'recipe-card-dot', '‧'));
    const progress = createElement('span', 'recipe-card-progress', progressText(recipe));
    progress.dataset.progress = recipe.id;
    sub.appendChild(progress);
    body.appendChild(sub);
    card.appendChild(body);
    return card;
  }

  function emptyCopy() {
    if (recipes.length === 0) {
      return {
        title: 'seu cookbook está vazinho',
        hint: 'toque em “nova receita” pra guardar a primeira'
      };
    }
    if (filter === 'minhas') {
      return {
        title: 'você ainda não criou nenhuma receita',
        hint: 'as receitas que você adicionar aparecem aqui'
      };
    }
    if (search.trim()) {
      return {
        title: 'nenhuma receita combina com essa busca',
        hint: 'tenta buscar por outro ingrediente ou volta pras receitas todas'
      };
    }
    return {
      title: 'nada por aqui nesse filtro',
      hint: 'volta pra “todas” pra ver o cookbook inteirinho'
    };
  }

  function renderGrid() {
    if (!el.grid) return;
    const visible = visibleRecipes();
    el.grid.textContent = '';
    if (el.count) {
      el.count.textContent = visible.length + (visible.length === 1 ? ' receita' : ' receitas');
    }
    if (visible.length === 0) {
      const copy = emptyCopy();
      const empty = createElement('div', 'cookbook-empty');
      empty.appendChild(createElement('span', 'cookbook-empty-icon', '☾'));
      empty.appendChild(createElement('p', '', copy.title));
      empty.appendChild(createElement('span', '', copy.hint));
      el.grid.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    visible.forEach(function (recipe) {
      fragment.appendChild(cardFor(recipe));
    });
    el.grid.appendChild(fragment);
  }

  function updateCardProgress(recipe) {
    if (!el.grid) return;
    const target = el.grid.querySelector('[data-progress="' + recipe.id + '"]');
    if (target) target.textContent = progressText(recipe);
  }

  function checklistItem(recipe, kind, index) {
    const checked = checkedSet(recipe.id, kind).has(index);
    const row = createElement('label', 'recipe-check' + (checked ? ' is-done' : ''));
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'recipe-check-input';
    input.checked = checked;
    input.dataset.kind = kind;
    input.dataset.index = String(index);
    row.appendChild(input);

    const mark = createElement('span', 'recipe-check-mark');
    mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    row.appendChild(mark);

    const copy = createElement('span', 'recipe-check-copy');
    if (kind === 'ingredients') {
      const parts = ingredientParts(recipe.ingredients[index]);
      if (parts.name) {
        copy.appendChild(createElement('strong', '', parts.name));
        if (parts.note) copy.appendChild(createElement('span', 'recipe-check-note', parts.note));
      } else {
        copy.appendChild(createElement('span', 'recipe-check-text', parts.note));
      }
    } else {
      copy.appendChild(createElement('span', 'recipe-step-index', String(index + 1).padStart(2, '0')));
      copy.appendChild(createElement('span', 'recipe-check-text', recipe.steps[index]));
    }
    row.appendChild(copy);
    return row;
  }

  function renderChecklist(container, recipe, kind) {
    if (!container) return;
    container.textContent = '';
    const items = kind === 'ingredients' ? recipe.ingredients : recipe.steps;
    if (items.length === 0) {
      container.appendChild(createElement('p', 'recipe-check-empty', kind === 'ingredients'
        ? 'essa receita ainda não tem ingredientes anotados'
        : 'essa receita ainda não tem passos anotados'));
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach(function (_, index) {
      fragment.appendChild(checklistItem(recipe, kind, index));
    });
    container.appendChild(fragment);
  }

  function updateDetailProgress(recipe) {
    const ingDone = validCount(recipe.id, 'ingredients', recipe.ingredients.length);
    const stepDone = validCount(recipe.id, 'steps', recipe.steps.length);
    const total = totalItems(recipe);
    const done = ingDone + stepDone;
    const ratio = total > 0 ? done / total : 0;
    if (el.progressFill) {
      el.progressFill.style.transform = 'scaleX(' + ratio + ')';
    }
    if (el.progressLabel) {
      el.progressLabel.textContent = done + ' de ' + total + ' marcados';
    }
    if (el.ingCount) {
      el.ingCount.textContent = ingDone + '/' + recipe.ingredients.length;
    }
    if (el.stepCount) {
      el.stepCount.textContent = stepDone + '/' + recipe.steps.length;
    }
  }

  function openDetail(recipeId) {
    const recipe = findRecipe(recipeId);
    if (!recipe) return;
    activeRecipeId = recipe.id;
    if (el.viewTitle) el.viewTitle.textContent = recipe.title;
    if (el.viewTag) el.viewTag.textContent = recipe.tag;
    if (el.viewIntro) {
      el.viewIntro.textContent = recipe.intro;
      el.viewIntro.hidden = !recipe.intro;
    }
    if (el.viewImage) {
      if (recipe.image) {
        el.viewImage.src = recipe.image;
        el.viewImage.alt = recipe.title;
        el.viewImage.hidden = false;
        if (el.viewFallback) el.viewFallback.hidden = true;
      } else {
        el.viewImage.removeAttribute('src');
        el.viewImage.hidden = true;
        if (el.viewFallback) el.viewFallback.hidden = false;
      }
    }
    renderChecklist(el.viewIngredients, recipe, 'ingredients');
    renderChecklist(el.viewSteps, recipe, 'steps');
    updateDetailProgress(recipe);
    if (el.sheetScroll) el.sheetScroll.scrollTop = 0;
    el.sheetModal?.classList.add('open');
  }

  function closeDetail() {
    activeRecipeId = null;
    el.sheetModal?.classList.remove('open');
  }

  function toggleCheck(kind, index, checked) {
    const recipe = findRecipe(activeRecipeId);
    if (!recipe) return;
    const length = kind === 'ingredients' ? recipe.ingredients.length : recipe.steps.length;
    if (!Number.isInteger(index) || index < 0 || index >= length) return;
    if (!checks[recipe.id] || typeof checks[recipe.id] !== 'object') {
      checks[recipe.id] = { ingredients: [], steps: [] };
    }
    const entry = checks[recipe.id];
    if (!Array.isArray(entry[kind])) entry[kind] = [];
    const list = entry[kind];
    const position = list.indexOf(index);
    if (checked && position === -1) {
      list.push(index);
      list.sort(function (a, b) { return a - b; });
    } else if (!checked && position !== -1) {
      list.splice(position, 1);
    }
    saveChecks();
    const row = el.sheet?.querySelector(
      '.recipe-check-input[data-kind="' + kind + '"][data-index="' + index + '"]'
    );
    if (row) row.closest('.recipe-check')?.classList.toggle('is-done', checked);
    updateDetailProgress(recipe);
    updateCardProgress(recipe);
  }

  function resetChecks() {
    const recipe = findRecipe(activeRecipeId);
    if (!recipe) return;
    delete checks[recipe.id];
    saveChecks();
    renderChecklist(el.viewIngredients, recipe, 'ingredients');
    renderChecklist(el.viewSteps, recipe, 'steps');
    updateDetailProgress(recipe);
    updateCardProgress(recipe);
    SMA.toast('marcações zeradas ‧°');
  }

  function deleteRecipe(recipeId, fromDetail) {
    const recipe = findRecipe(recipeId);
    if (!recipe) return;
    if (!window.confirm('apagar a receita "' + recipe.title + '"?')) return;
    recipes = recipes.filter(function (item) { return item.id !== recipe.id; });
    delete checks[recipe.id];
    persist();
    saveChecks();
    if (fromDetail) closeDetail();
    renderGrid();
    SMA.toast('receita apagada');
  }

  function buildShell() {
    root.textContent = '';
    const page = createElement('div', 'cookbook');

    const header = createElement('header', 'cookbook-header');
    const titleGroup = createElement('div', 'cookbook-title-group');
    titleGroup.appendChild(createElement('h1', 'cookbook-title', 'Cookbook'));
    titleGroup.appendChild(createElement('p', 'cookbook-subtitle', 'receitinhas pequenas pra desacelerar, adoçar o dia e cuidar de você ‧°'));
    header.appendChild(titleGroup);

    const actions = createElement('div', 'cookbook-actions');
    const searchBox = createElement('label', 'search-box cookbook-search');
    searchBox.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    el.searchInput = document.createElement('input');
    el.searchInput.type = 'search';
    el.searchInput.id = 'recipe-search';
    el.searchInput.placeholder = 'buscar receita ou ingrediente...';
    el.searchInput.setAttribute('aria-label', 'buscar receitas');
    searchBox.appendChild(el.searchInput);
    actions.appendChild(searchBox);

    el.addButton = createElement('button', 'recipe-add-btn', '＋ nova receita');
    el.addButton.type = 'button';
    el.addButton.id = 'btn-add-recipe';
    actions.appendChild(el.addButton);
    header.appendChild(actions);
    page.appendChild(header);

    const filtersRow = createElement('div', 'cookbook-filters');
    el.filters = createElement('div', 'pill-filters recipe-filters');
    [
      ['all', 'Todas'],
      ['bebidas', 'Bebidas'],
      ['doces', 'Doces'],
      ['airfryer', 'Air fryer'],
      ['minhas', 'Minhas']
    ].forEach(function (item, index) {
      const pill = createElement('button', 'filter-pill' + (index === 0 ? ' active' : ''), item[1]);
      pill.type = 'button';
      pill.dataset.filter = item[0];
      el.filters.appendChild(pill);
    });
    filtersRow.appendChild(el.filters);
    el.count = createElement('span', 'cookbook-count');
    filtersRow.appendChild(el.count);
    page.appendChild(filtersRow);

    el.grid = createElement('div', 'recipe-grid');
    el.grid.id = 'recipe-grid';
    page.appendChild(el.grid);
    root.appendChild(page);
  }

  function openRecipeModal(recipe, fromDetail) {
    editingId = recipe ? recipe.id : null;
    editingFromDetail = Boolean(fromDetail && recipe);
    editingImage = recipe ? recipe.image : '';
    editingCaption = recipe ? recipe.caption : '';
    if (editingFromDetail) closeDetail();

    const name = SMA.select('#recipe-name-input');
    const tag = SMA.select('#recipe-tag-input');
    const intro = SMA.select('#recipe-intro-input');
    const ingredients = SMA.select('#recipe-ingredients-input');
    const steps = SMA.select('#recipe-prep-input');
    const title = SMA.select('#recipe-modal-title');
    const preview = SMA.select('#recipe-photo-preview');
    const removePhoto = SMA.select('#btn-recipe-photo-remove');
    const restore = SMA.select('#btn-recipe-restore');

    if (title) title.textContent = recipe ? 'Editar Receitinha' : 'Nova Receitinha';
    if (name) name.value = recipe ? recipe.title : '';
    if (tag) tag.value = recipe ? recipe.tag : 'da noite';
    if (intro) intro.value = recipe ? recipe.intro : '';
    if (ingredients) ingredients.value = recipe ? recipe.ingredients.join('\n') : '';
    if (steps) steps.value = recipe ? recipe.steps.join('\n') : '';
    if (preview) {
      preview.src = editingImage || '';
      preview.hidden = !editingImage;
    }
    if (removePhoto) removePhoto.hidden = !editingImage;
    if (restore) restore.hidden = !recipe || !DEFAULT_IDS.has(recipe.id);

    SMA.select('#modal-recipe')?.classList.add('open');
    setTimeout(function () {
      if (name) name.focus();
    }, 60);
  }

  function readPhoto(file) {
    if (!file) return;
    SMA.readImageFile(file, 1200, 0.85).then(function (dataUrl) {
      editingImage = dataUrl;
      const preview = SMA.select('#recipe-photo-preview');
      if (preview) {
        preview.src = dataUrl;
        preview.hidden = false;
      }
      const removePhoto = SMA.select('#btn-recipe-photo-remove');
      if (removePhoto) removePhoto.hidden = false;
    }).catch(function () {
      SMA.toast('não consegui abrir essa foto');
    });
  }

  function saveRecipe() {
    const name = SMA.select('#recipe-name-input');
    const tag = SMA.select('#recipe-tag-input');
    const intro = SMA.select('#recipe-intro-input');
    const ingredients = SMA.select('#recipe-ingredients-input');
    const stepsInput = SMA.select('#recipe-prep-input');
    const title = name.value.trim();
    const items = splitIngredients(ingredients.value);
    const steps = splitSteps(stepsInput.value);
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
      tag: tag.value,
      intro: intro.value,
      image: editingImage,
      caption: editingCaption || title,
      ingredients: items,
      steps: steps,
      createdAt: previous ? previous.createdAt : Date.now()
    });

    if (previous) {
      const changed = previous.ingredients.join('\n') !== recipe.ingredients.join('\n')
        || previous.steps.join('\n') !== recipe.steps.join('\n');
      if (changed) {
        delete checks[previous.id];
        saveChecks();
      }
      recipes = recipes.map(function (item) { return item.id === previous.id ? recipe : item; });
    } else {
      recipes.push(recipe);
    }
    persist();
    SMA.select('#modal-recipe')?.classList.remove('open');
    renderGrid();
    if (editingFromDetail) {
      openDetail(recipe.id);
    } else if (!previous) {
      const card = el.grid?.querySelector('[data-id="' + recipe.id + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    editingFromDetail = false;
    SMA.toast(previous ? 'receitinha atualizada ‧°' : 'receitinha guardada ‧°');
  }

  function restoreOriginal() {
    const current = editingId ? findRecipe(editingId) : null;
    const original = current ? DEFAULTS.find(function (item) { return item.id === current.id; }) : null;
    if (!original) return;
    if (!window.confirm('voltar essa receita pro jeito original? as suas marcações também vão sumir.')) return;
    const restored = normalize(original);
    recipes = recipes.map(function (item) { return item.id === current.id ? restored : item; });
    delete checks[current.id];
    persist();
    saveChecks();
    SMA.select('#modal-recipe')?.classList.remove('open');
    renderGrid();
    openDetail(restored.id);
    editingFromDetail = false;
    SMA.toast('receitinha restaurada ‧°');
  }

  function bind() {
    el.addButton?.addEventListener('click', function () {
      openRecipeModal(null, false);
    });

    el.searchInput?.addEventListener('input', SMA.debounce(function () {
      const value = el.searchInput.value;
      if (value === lastSearch) return;
      lastSearch = value;
      search = value;
      renderGrid();
    }, 140));

    el.filters?.addEventListener('click', function (event) {
      const pill = event.target.closest('.filter-pill');
      if (!pill) return;
      SMA.selectAll('.filter-pill', el.filters).forEach(function (item) {
        item.classList.toggle('active', item === pill);
      });
      filter = pill.dataset.filter || 'all';
      renderGrid();
    });

    el.grid?.addEventListener('click', function (event) {
      const card = event.target.closest('.recipe-card');
      if (!card) return;
      const id = card.dataset.id;
      const action = event.target.closest('[data-action]');
      if (action) {
        event.stopPropagation();
        if (action.dataset.action === 'edit') openRecipeModal(findRecipe(id), false);
        if (action.dataset.action === 'delete') deleteRecipe(id, false);
        return;
      }
      openDetail(id);
    });

    el.grid?.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('.recipe-card');
      if (!card || event.target !== card) return;
      event.preventDefault();
      openDetail(card.dataset.id);
    });

    el.sheet?.addEventListener('change', function (event) {
      const input = event.target.closest('.recipe-check-input');
      if (!input) return;
      toggleCheck(input.dataset.kind, Number(input.dataset.index), input.checked);
    });

    SMA.select('#recipe-view-close')?.addEventListener('click', closeDetail);
    SMA.select('#recipe-view-reset')?.addEventListener('click', resetChecks);
    SMA.select('#recipe-view-edit')?.addEventListener('click', function () {
      openRecipeModal(findRecipe(activeRecipeId), true);
    });
    SMA.select('#recipe-view-delete')?.addEventListener('click', function () {
      deleteRecipe(activeRecipeId, true);
    });
    el.sheetModal?.addEventListener('click', function (event) {
      if (event.target === el.sheetModal) closeDetail();
    });

    const photoInput = SMA.select('#recipe-photo-input');
    SMA.select('#btn-recipe-photo')?.addEventListener('click', function () {
      photoInput?.click();
    });
    photoInput?.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      readPhoto(file);
    });
    SMA.select('#btn-recipe-photo-remove')?.addEventListener('click', function () {
      editingImage = '';
      const preview = SMA.select('#recipe-photo-preview');
      if (preview) {
        preview.removeAttribute('src');
        preview.hidden = true;
      }
      const removePhoto = SMA.select('#btn-recipe-photo-remove');
      if (removePhoto) removePhoto.hidden = true;
    });
    SMA.select('#modal-cancel-recipe')?.addEventListener('click', function () {
      SMA.select('#modal-recipe')?.classList.remove('open');
      editingFromDetail = false;
    });
    SMA.select('#modal-save-recipe')?.addEventListener('click', saveRecipe);
    SMA.select('#btn-recipe-restore')?.addEventListener('click', restoreOriginal);
    SMA.select('#modal-recipe')?.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        saveRecipe();
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && activeRecipeId) closeDetail();
    });
  }

  function init() {
    root = SMA.select('#cookbook-root');
    if (!root) return;

    el.sheetModal = SMA.select('#modal-recipe-view');
    el.sheet = el.sheetModal ? el.sheetModal.querySelector('.recipe-sheet') : null;
    el.sheetScroll = SMA.select('.recipe-sheet-scroll');
    el.viewTitle = SMA.select('#recipe-view-title');
    el.viewTag = SMA.select('#recipe-view-tag');
    el.viewIntro = SMA.select('#recipe-view-intro');
    el.viewImage = SMA.select('#recipe-view-image');
    el.viewFallback = SMA.select('#recipe-view-fallback');
    el.viewIngredients = SMA.select('#recipe-view-ingredients');
    el.viewSteps = SMA.select('#recipe-view-steps');
    el.progressFill = SMA.select('#recipe-view-progress-fill');
    el.progressLabel = SMA.select('#recipe-view-progress-label');
    el.ingCount = SMA.select('#recipe-view-ing-count');
    el.stepCount = SMA.select('#recipe-view-step-count');

    checks = SMA.readJSON(CHECKS_KEY, {});
    if (!checks || typeof checks !== 'object' || Array.isArray(checks)) checks = {};

    recipes = load();
    pruneChecks();
    persist();
    saveChecks();

    buildShell();
    renderGrid();
    bind();
  }

  SMA.Recipes = { init: init };
})();
