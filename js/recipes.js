(function () {
  const SMA = window.SMA;

  const STORAGE_KEY = 'cookbook_recipes_v2';
  const PREVIOUS_KEY = 'cookbook_recipes';
  const LEGACY_KEY = 'user_recipes';
  const REMOVED_DEFAULTS = ['waffles', 'carrot-cake', 'pancakes', 'sausage-risotto', 'carbonara-sauce'];

  const DEFAULTS = [
    {
      id: 'leite-quente',
      title: 'leite quente da vovó',
      tag: 'favorito',
      intro: 'o clássico que minha avó fazia quando eu não conseguia dormir. leite quentinho, mel e canela — simples, doce e do tamanho exato de um abraço.',
      image: 'assets/images/recipes/leite-quente.jpg',
      caption: 'leite quente ‧ canela & mel',
      ingredients: [
        'leite integral ou de aveia: 250ml, aqueça em fogo bem baixinho sem deixar ferver',
        'mel puro: 1 colher de chá, adoce no final pra não perder o aroma',
        'canela em pó: 1 pitada por cima, abraça o cheiro de casa',
        'essência de baunilha: só 2 gotinhas, o suficiente pra perfumar'
      ],
      prep: 'Aqueça o leite devagar até ficar quentinho e aconchegante. Misture o mel e a baunilha, despeje na sua caneca favorita e polvilhe a canela. Beba em pequenos goles, sentindo o corpo relaxar.'
    },
    {
      id: 'moon-milk',
      title: 'moon milk de camomila & lavanda',
      tag: 'relaxamento',
      intro: 'leite lilás de camomila e lavanda pra quando a cabeça não desliga. o cheiro sozinho já muda o clima do quarto.',
      image: 'assets/images/recipes/moon-milk.jpg',
      caption: 'moon milk ‧ camomila & lavanda',
      ingredients: [
        'leite de amêndoas: 200ml, o mais cremoso que você tiver',
        'camomila seca: 1 colher de flores, infusione no leite morno por 5 minutos',
        'lavanda: um toque de flores, só pra perfumar — não exagere no sabor',
        'mel: 1 colher de chá, ou o quanto o seu coração pedir'
      ],
      prep: 'Infusione a camomila e a lavanda no leite morno, coe com cuidado e adoce com mel. Beba devagar, respirando fundo entre um gole e outro, com as luzes bem baixinhas.'
    },
    {
      id: 'golden-milk',
      title: 'chá dourado (golden milk)',
      tag: 'anti-estresse',
      intro: 'açafrão-da-terra, pimenta-do-reino e mel num leite aveludado. aquece por dentro e faz o corpo entender que o dia acabou.',
      image: 'assets/images/recipes/golden-milk.jpg',
      caption: 'golden milk ‧ cúrcuma & especiarias',
      ingredients: [
        'leite vegetal: 200ml, de coco, amêndoas ou aveia',
        'cúrcuma em pó: 1/2 colher de chá, o dourado da xícara',
        'pimenta-do-reino: uma pitada, ajuda o corpo a absorver a cúrcuma',
        'óleo de coco: 1/2 colher de chá, deixa tudo mais cremoso',
        'mel: 1 colher de chá, pra equilibrar o amargor'
      ],
      prep: 'Aqueça tudo junto mexendo com um batedor pequeno até formar uma espuminha aveludada. Não deixe ferver. Sirva quente e sinta o calor subir devagar pelos ombros.'
    },
    {
      id: 'chocolate-noturno',
      title: 'chocolate noturno suave',
      tag: 'conforto',
      intro: 'cacau de verdade, leite quente e uma pitada de noz-moscada. é o abraço em forma de caneca pra encerrar o dia sem pressa.',
      image: 'assets/images/recipes/chocolate.jpg',
      caption: 'chocolate noturno ‧ cacau & noz-moscada',
      ingredients: [
        'leite quente: 1 xícara, integral ou vegetal',
        'cacau 100%: 1 colher de sopa, sem açúcar escondido',
        'açúcar demerara ou mel: 1 colher de chá, ajuste ao seu gosto',
        'noz-moscada: uma pitada ralada na hora',
        'chantilly ou marshmallows: opcional, só pra deixar mais fofo'
      ],
      prep: 'Dissolva o cacau no leite quente e finalize com a noz-moscada ralada na hora. A noz-moscada tem propriedades naturais que ajudam a induzir o sono — beba devagar, de preferência sem tela.'
    }
  ];

  let recipes = [];
  let root = null;
  let editingId = null;
  let editingImage = '';
  let editingCaption = '';

  function uniqueId() {
    return 'recipe-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  function cleanText(value) {
    return String(value == null ? '' : value).trim();
  }

  function splitIngredients(value) {
    const source = Array.isArray(value)
      ? value
      : String(value || '').split(/\r?\n|;/);
    return source
      .map(function (item) { return String(item).replace(/^[-•*]\s*/, '').trim(); })
      .filter(Boolean);
  }

  function normalize(recipe) {
    const title = cleanText(recipe.title) || 'receita sem nome';
    return {
      id: String(recipe.id || uniqueId()),
      title: title,
      tag: cleanText(recipe.tag) || 'da noite',
      intro: cleanText(recipe.intro || recipe.description || ''),
      image: cleanText(recipe.image),
      caption: cleanText(recipe.caption) || title,
      ingredients: splitIngredients(recipe.ingredients),
      prep: cleanText(recipe.prep || recipe.preparation),
      createdAt: Number(recipe.createdAt) || Date.now()
    };
  }

  function load() {
    const saved = SMA.readJSON(STORAGE_KEY, null);
    if (Array.isArray(saved) && saved.length > 0) return saved.map(normalize);

    const custom = [];
    const previous = SMA.readJSON(PREVIOUS_KEY, null);
    if (Array.isArray(previous)) {
      previous.forEach(function (recipe) {
        if (REMOVED_DEFAULTS.indexOf(String(recipe.id)) !== -1) return;
        custom.push(normalize(recipe));
      });
    }
    const legacy = SMA.readJSON(LEGACY_KEY, null);
    if (Array.isArray(legacy)) {
      legacy.forEach(function (recipe) {
        custom.push(normalize({
          title: recipe.title,
          tag: recipe.tag,
          intro: '',
          ingredients: recipe.ingredients,
          prep: recipe.prep
        }));
      });
    }
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

  function photoFigure(recipe, className) {
    const figure = createElement('figure', 'zine-photo ' + className);
    if (recipe.image) {
      const image = document.createElement('img');
      image.src = recipe.image;
      image.alt = recipe.title;
      image.loading = 'lazy';
      figure.appendChild(image);
    } else {
      const placeholder = createElement('div', 'zine-photo-empty');
      placeholder.appendChild(createElement('span', 'zine-photo-moon', '☾'));
      placeholder.appendChild(createElement('span', 'zine-photo-word', recipe.title));
      figure.appendChild(placeholder);
    }
    const caption = createElement('figcaption', 'zine-watermark');
    caption.appendChild(document.createTextNode('sleep my angel'));
    caption.appendChild(createElement('span', '', "'s guides"));
    figure.appendChild(caption);
    return figure;
  }

  function ingredientList(recipe) {
    const list = createElement('div', 'zine-ingredients');
    const items = recipe.ingredients.length ? recipe.ingredients : ['sem ingredientes anotados'];
    items.forEach(function (line) {
      const row = createElement('p', 'zine-ingredient');
      const parts = ingredientParts(line);
      if (parts.name) {
        row.appendChild(createElement('strong', '', parts.name));
        row.appendChild(document.createTextNode(': ' + parts.note));
      } else {
        row.textContent = parts.note;
      }
      list.appendChild(row);
    });
    return list;
  }

  function recipeCard(recipe, index) {
    const card = createElement('article', 'zine-recipe' + (index % 2 === 1 ? ' is-flipped' : ''));
    card.dataset.id = recipe.id;

    const photo = photoFigure(recipe, 'zine-recipe-photo');
    const body = createElement('div', 'zine-copy');

    const actions = createElement('div', 'zine-actions');
    const edit = createElement('button', 'zine-action', 'editar');
    edit.type = 'button';
    const remove = createElement('button', 'zine-action zine-action-remove', '×');
    remove.type = 'button';
    remove.title = 'apagar receita';
    remove.setAttribute('aria-label', 'apagar ' + recipe.title);
    actions.appendChild(edit);
    actions.appendChild(remove);
    body.appendChild(actions);

    const heading = createElement('h2', 'zine-recipe-title', recipe.title);
    body.appendChild(heading);

    const meta = createElement('div', 'zine-recipe-meta');
    meta.appendChild(createElement('span', 'zine-tag', recipe.tag));
    meta.appendChild(createElement('span', 'zine-handle-small', '@sleepmyangel'));
    body.appendChild(meta);

    if (recipe.intro) body.appendChild(createElement('p', 'zine-text', recipe.intro));

    body.appendChild(createElement('h3', 'zine-label', 'ingredientes'));
    body.appendChild(ingredientList(recipe));

    if (recipe.prep) {
      body.appendChild(createElement('h3', 'zine-label', 'modo de preparo'));
      body.appendChild(createElement('p', 'zine-text', recipe.prep));
    }

    card.appendChild(photo);
    card.appendChild(body);

    edit.addEventListener('click', function () { openRecipeModal(recipe); });
    remove.addEventListener('click', function () {
      if (!window.confirm('apagar a receita "' + recipe.title + '"?')) return;
      recipes = recipes.filter(function (item) { return item.id !== recipe.id; });
      persist();
      render();
      SMA.toast('receita apagada');
    });

    return card;
  }

  function render() {
    if (!root) return;
    root.textContent = '';
    const page = createElement('div', 'zine');

    const top = createElement('header', 'zine-top');
    top.appendChild(createElement('span', '', 'sleep my angel : ☾'));
    top.appendChild(createElement('span', 'zine-top-mid', '✧, noites de ' + new Date().getFullYear() + ' !!'));
    top.appendChild(createElement('span', '', '# night drinks'));
    page.appendChild(top);

    const hero = createElement('section', 'zine-hero');
    const copy = createElement('div', 'zine-hero-copy');
    copy.appendChild(createElement('h1', 'zine-title', 'night drinks'));
    copy.appendChild(createElement('p', 'zine-handle', '@sleepmyangel'));
    copy.appendChild(createElement('p', 'zine-text zine-hero-text', 'bebidas quentinhas pra desacelerar antes de dormir. leite, especiarias e mel — receitas pequenas pra noites em que a cabeça não para.'));
    copy.appendChild(createElement('p', 'zine-text zine-hero-text', 'nada de pressa: aqueça o leite em fogo baixo, respire fundo e trate esse momento como um ritual.'));

    const add = createElement('button', 'zine-add', '＋ nova receita');
    add.type = 'button';
    add.addEventListener('click', function () { openRecipeModal(null); });
    copy.appendChild(add);

    hero.appendChild(copy);
    hero.appendChild(photoFigure({
      title: 'night drinks',
      image: 'assets/images/recipes/hero.jpg'
    }, 'zine-hero-photo'));
    page.appendChild(hero);

    const list = createElement('div', 'zine-list');
    recipes.forEach(function (recipe, index) {
      list.appendChild(recipeCard(recipe, index));
    });
    page.appendChild(list);

    const footer = createElement('footer', 'zine-footer');
    footer.appendChild(createElement('p', '', 'toque em editar pra trocar ingredientes, foto ou modo de preparo ‧°'));
    footer.appendChild(createElement('p', 'zine-credits', 'fotos ‧ flickr cc by / cc by-sa ‧ créditos no readme'));
    page.appendChild(footer);

    root.appendChild(page);
  }

  function openRecipeModal(recipe) {
    editingId = recipe ? recipe.id : null;
    editingImage = recipe ? recipe.image : '';
    editingCaption = recipe ? recipe.caption : '';
    const name = SMA.select('#recipe-name-input');
    const tag = SMA.select('#recipe-tag-input');
    const intro = SMA.select('#recipe-intro-input');
    const ingredients = SMA.select('#recipe-ingredients-input');
    const prep = SMA.select('#recipe-prep-input');
    const title = SMA.select('#recipe-modal-title');
    const preview = SMA.select('#recipe-photo-preview');
    if (title) title.textContent = recipe ? 'Editar Receitinha' : 'Nova Receitinha';
    if (name) name.value = recipe ? recipe.title : '';
    if (tag) tag.value = recipe ? recipe.tag : 'da noite';
    if (intro) intro.value = recipe ? recipe.intro : '';
    if (ingredients) ingredients.value = recipe ? recipe.ingredients.join('\n') : '';
    if (prep) prep.value = recipe ? recipe.prep : '';
    if (preview) {
      preview.src = editingImage || '';
      preview.hidden = !editingImage;
    }
    SMA.select('#modal-recipe')?.classList.add('open');
    setTimeout(function () {
      if (name) name.focus();
    }, 60);
  }

  function readPhoto(file) {
    if (!file) return;
    SMA.readImageFile(file, 1000, 0.82).then(function (dataUrl) {
      editingImage = dataUrl;
      const preview = SMA.select('#recipe-photo-preview');
      if (preview) {
        preview.src = dataUrl;
        preview.hidden = false;
      }
    }).catch(function () {
      SMA.toast('não consegui abrir essa foto');
    });
  }

  function saveRecipe() {
    const name = SMA.select('#recipe-name-input');
    const tag = SMA.select('#recipe-tag-input');
    const intro = SMA.select('#recipe-intro-input');
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
      tag: tag.value,
      intro: intro.value,
      image: editingImage,
      caption: editingCaption || title,
      ingredients: items,
      prep: prep.value,
      createdAt: previous ? previous.createdAt : Date.now()
    });
    if (previous) {
      recipes = recipes.map(function (item) { return item.id === previous.id ? recipe : item; });
    } else {
      recipes.push(recipe);
    }
    persist();
    SMA.select('#modal-recipe')?.classList.remove('open');
    render();
    if (!previous) {
      const cards = root.querySelectorAll('.zine-recipe');
      const last = cards[cards.length - 1];
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    SMA.toast(previous ? 'receitinha atualizada ‧°' : 'receitinha guardada ‧°');
  }

  function init() {
    root = SMA.select('#cookbook-root');
    if (!root) return;
    recipes = load();
    persist();
    render();

    const photoInput = SMA.select('#recipe-photo-input');
    SMA.select('#btn-recipe-photo')?.addEventListener('click', function () {
      photoInput?.click();
    });
    photoInput?.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      readPhoto(file);
    });
    SMA.select('#modal-cancel-recipe')?.addEventListener('click', function () {
      SMA.select('#modal-recipe')?.classList.remove('open');
    });
    SMA.select('#modal-save-recipe')?.addEventListener('click', saveRecipe);
  }

  SMA.Recipes = { init: init };
})();
