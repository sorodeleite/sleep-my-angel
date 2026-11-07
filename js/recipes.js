(function () {
  const SMA = window.SMA;

  const DEFAULTS = [
    {
      title: 'Leite Quente Tradicional da Vovó',
      tag: 'favorito',
      ingredients: '250ml de leite integral ou de aveia, 1 colher de chá de mel puro, 1 pitadinha de canela e 2 gotinhas de essência de baunilha.',
      prep: 'Aqueça o leite em fogo bem baixinho até ficar quentinho e aconchegante, sem deixar ferver. Misture o mel e a baunilha, coloque na sua caneca favorita e polvilhe a canela por cima.'
    },
    {
      title: 'Moon Milk de Camomila & Lavanda',
      tag: 'relaxamento',
      ingredients: '200ml de leite de amêndoas, 1 colher de flores de camomila secas, toque de flor de lavanda e mel.',
      prep: 'Infusione as flores no leite morno por 5 minutos, coe delicadamente, adoce com mel e beba bem devagar enquanto respira fundo.'
    },
    {
      title: 'Chá Dourado (Golden Milk) Noturno',
      tag: 'anti-estresse',
      ingredients: '200ml de leite vegetal, 1/2 colher de chá de cúrcuma em pó, pitada de pimenta-do-reino, óleo de coco e mel.',
      prep: 'Aqueça tudo mexendo com um batedor pequeno até formar uma espuminha aveludada. Aquece o corpo e acalma a mente.'
    },
    {
      title: 'Chocolate Noturno Suave',
      tag: 'conforto',
      ingredients: '1 xícara de leite quente, 1 colher de cacau 100%, 1 colherzinha de açúcar demerara ou mel, pitada de noz-moscada.',
      prep: 'Dissolva o cacau no leite quente e finalize com a noz-moscada ralada na hora. A noz-moscada tem propriedades naturais que ajudam a induzir o sono.'
    }
  ];

  let recipes = [];
  let container = null;

  function normalize(item) {
    return {
      title: String(item.title || 'receita sem nome').trim(),
      tag: String(item.tag || 'cozy').trim() || 'cozy',
      ingredients: String(item.ingredients || '').trim(),
      prep: String(item.prep || '').trim()
    };
  }

  function load() {
    const saved = SMA.readJSON('user_recipes', null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map(normalize);
    }
    return DEFAULTS.slice();
  }

  function render() {
    if (!container) return;
    container.textContent = '';
    if (recipes.length === 0) recipes = DEFAULTS.slice();
    recipes.forEach(function (recipe) {
      const card = document.createElement('article');
      card.className = 'recipe-card';

      const header = document.createElement('div');
      header.className = 'recipe-header';
      const title = document.createElement('h4');
      title.className = 'recipe-title';
      title.textContent = recipe.title;
      const tag = document.createElement('span');
      tag.className = 'recipe-tag';
      tag.textContent = recipe.tag;
      header.appendChild(title);
      header.appendChild(tag);

      const ingredients = document.createElement('div');
      ingredients.className = 'recipe-ingredients';
      const ingredientsLabel = document.createElement('strong');
      ingredientsLabel.textContent = 'Ingredientes: ';
      ingredients.appendChild(ingredientsLabel);
      ingredients.appendChild(document.createTextNode(recipe.ingredients));

      const prep = document.createElement('div');
      prep.className = 'recipe-prep';
      const prepLabel = document.createElement('strong');
      prepLabel.textContent = 'Preparo: ';
      prep.appendChild(prepLabel);
      prep.appendChild(document.createTextNode(recipe.prep));

      card.appendChild(header);
      card.appendChild(ingredients);
      card.appendChild(prep);
      container.appendChild(card);
    });
  }

  function addRecipe() {
    const nameInput = SMA.select('#recipe-name-input');
    const ingredientsInput = SMA.select('#recipe-ingredients-input');
    const prepInput = SMA.select('#recipe-prep-input');
    const title = nameInput.value.trim();
    const ingredients = ingredientsInput.value.trim();
    const prep = prepInput.value.trim();
    if (!title || !ingredients) {
      SMA.toast('nome e ingredientes são obrigatórios');
      return;
    }
    recipes.unshift(normalize({
      title: title,
      tag: 'meu ritual',
      ingredients: ingredients,
      prep: prep
    }));
    SMA.writeJSON('user_recipes', recipes);
    nameInput.value = '';
    ingredientsInput.value = '';
    prepInput.value = '';
    SMA.select('#modal-recipe').classList.remove('open');
    render();
    SMA.toast('receita guardada ‧°');
  }

  function init() {
    container = SMA.select('#recipes-container');
    if (!container) return;
    recipes = load();
    render();

    SMA.select('#btn-add-recipe')?.addEventListener('click', function () {
      SMA.select('#modal-recipe').classList.add('open');
      setTimeout(function () {
        SMA.select('#recipe-name-input').focus();
      }, 50);
    });

    SMA.select('#modal-cancel-recipe')?.addEventListener('click', function () {
      SMA.select('#modal-recipe').classList.remove('open');
    });

    SMA.select('#modal-save-recipe')?.addEventListener('click', addRecipe);
  }

  SMA.Recipes = { init: init };
})();
