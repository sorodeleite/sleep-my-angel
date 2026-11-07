(function () {
  const SMA = window.SMA;

  const DEFAULTS = [
    {
      quote: 'Não peça a ninguém lá fora. A sua imaginação é Deus em ação. Ao deitar a cabeça no travesseiro, aceite plenamente a sensação de que o que você quer já existe.',
      author: 'Edward Art ‧ O Criador Interior'
    },
    {
      quote: 'O sono não é um esquecimento; é a entrada sagrada no templo da sua imaginação. O que você aceita como verdade ao adormecer floresce no seu mundo físico.',
      author: 'Edward Art ‧ Descanse no Fim'
    },
    {
      quote: 'Eu já sou. Eu não preciso lutar, provar nada ou esperar. Toda a realidade se curva diante da minha aceitação interna.',
      author: 'Neville Goddard'
    },
    {
      quote: 'A paz que eu sinto nesta cama agora é a mesma paz de quem já tem tudo aquilo que ama.',
      author: 'Sleep Angel'
    },
    {
      quote: 'Sinta o alívio. Esse é o segredo de Edward Art: não se trata de força, mas da doçura do alívio.',
      author: 'Edward Art'
    }
  ];

  let quotes = [];
  let activeIndex = 0;
  let elements = {};

  function normalize(item) {
    return {
      quote: String(item.quote || '').trim(),
      author: String(item.author || 'Meu Eu Ideal').trim() || 'Meu Eu Ideal'
    };
  }

  function load() {
    const saved = SMA.readJSON('user_affirmations', null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map(normalize).filter(function (item) {
        return item.quote.length > 0;
      });
    }
    return DEFAULTS.slice();
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      SMA.toast('seu navegador não tem voz para ler as afirmações');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/^"|"$/g, ''));
    utterance.lang = 'pt-BR';
    utterance.rate = 0.84;
    utterance.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const portuguese = voices.find(function (voice) {
      return voice.lang && voice.lang.toLowerCase().startsWith('pt');
    });
    if (portuguese) utterance.voice = portuguese;
    window.speechSynthesis.speak(utterance);
  }

  function render() {
    if (!elements.quote || !elements.grid) return;
    if (quotes.length === 0) quotes = DEFAULTS.slice();
    if (activeIndex < 0 || activeIndex >= quotes.length) activeIndex = 0;
    const current = quotes[activeIndex];
    elements.quote.textContent = '“' + current.quote + '”';
    if (elements.author) elements.author.textContent = current.author;
    elements.grid.textContent = '';

    quotes.forEach(function (item, index) {
      const card = document.createElement('article');
      card.className = 'affirmation-card';
      const text = document.createElement('p');
      text.textContent = '“' + item.quote + '”';
      const footer = document.createElement('div');
      footer.className = 'affirmation-footer';
      const author = document.createElement('span');
      author.textContent = item.author;
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'action-btn';
      play.setAttribute('aria-label', 'ouvir afirmação');
      play.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      play.addEventListener('click', function () {
        activeIndex = index;
        render();
        speak(item.quote);
      });
      footer.appendChild(author);
      footer.appendChild(play);
      card.appendChild(text);
      card.appendChild(footer);
      elements.grid.appendChild(card);
    });
  }

  function addAffirmation() {
    const textInput = SMA.select('#affirmation-text-input');
    const authorInput = SMA.select('#affirmation-author-input');
    const text = textInput.value.trim();
    if (!text) {
      SMA.toast('escreve a afirmação primeiro');
      textInput.focus();
      return;
    }
    quotes.push(normalize({
      quote: text,
      author: authorInput.value.trim() || 'Meu Eu Ideal'
    }));
    SMA.writeJSON('user_affirmations', quotes);
    activeIndex = quotes.length - 1;
    textInput.value = '';
    authorInput.value = '';
    SMA.select('#modal-affirmation').classList.remove('open');
    render();
    SMA.toast('afirmação guardada ‧°');
  }

  function init() {
    elements = {
      quote: SMA.select('#active-quote'),
      author: SMA.select('#active-quote-author'),
      grid: SMA.select('#affirmations-grid')
    };
    if (!elements.quote || !elements.grid) return;
    quotes = load();
    render();

    SMA.select('#btn-next-quote')?.addEventListener('click', function () {
      activeIndex = (activeIndex + 1) % quotes.length;
      render();
    });

    SMA.select('#btn-read-aloud')?.addEventListener('click', function () {
      const current = quotes[activeIndex];
      if (current) speak(current.quote);
    });

    SMA.select('#btn-add-affirmation')?.addEventListener('click', function () {
      SMA.select('#modal-affirmation').classList.add('open');
      setTimeout(function () {
        SMA.select('#affirmation-text-input').focus();
      }, 50);
    });

    SMA.select('#modal-cancel-affirmation')?.addEventListener('click', function () {
      SMA.select('#modal-affirmation').classList.remove('open');
    });

    SMA.select('#modal-save-affirmation')?.addEventListener('click', addAffirmation);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }

  SMA.Affirmations = { init: init };
})();
