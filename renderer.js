const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('btn-play');
const playIcon = document.getElementById('play-icon');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const shuffleBtn = document.getElementById('btn-shuffle');
const loopBtn = document.getElementById('btn-loop');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const currentTimeLabel = document.getElementById('current-time');
const totalDurationLabel = document.getElementById('total-duration');
const volumeSlider = document.getElementById('volume-slider');
const nowTitle = document.getElementById('now-title');
const nowArtist = document.getElementById('now-artist');
const nowCover = document.getElementById('now-cover');
const musicGrid = document.getElementById('music-grid');
const trackCountLabel = document.getElementById('track-count-label');

let allTracks = [];
let currentTrackIndex = -1;
let isShuffle = false;
let isLoop = false;
let currentFilter = 'all';

const tumblrImages = [
  'assets/readme-photos/tumblr_095bd1f9adbbfc70eabb0168b575af87_0802485b_1280.jpg',
  'assets/readme-photos/tumblr_3627acec240809122de5d5afa6912f5b_16b02d5f_1280.webp',
  'assets/readme-photos/tumblr_91662fd1300010d18e42efd98b8460b6_324119a2_1280.jpg',
  'assets/readme-photos/tumblr_bd8e9efc0a9c6fd799342197e304508b_3adc1fa5_1280.jpg',
  'assets/readme-photos/tumblr_db6ab36987b578f88c6ed96f4578a05c_fcb8ffe3_400.png'
];

document.getElementById('btn-close')?.addEventListener('click', () => {
  if (window.api) window.api.windowControl('close');
});

document.getElementById('btn-min')?.addEventListener('click', () => {
  if (window.api) window.api.windowControl('minimize');
});

document.getElementById('btn-max')?.addEventListener('click', () => {
  if (window.api) window.api.windowControl('maximize');
});

function initDateDisplay() {
  const dateText = document.getElementById('date-text');
  if (!dateText) return;
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const today = new Date();
  const formatted = today.toLocaleDateString('en-US', options);
  dateText.textContent = formatted;
}

const tabButtons = document.querySelectorAll('.nav-tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const target = btn.dataset.tab;
    const targetPane = document.getElementById(target);
    if (targetPane) targetPane.classList.add('active');
  });
});

['user-name-input', 'user-mood-input', 'user-goal-input'].forEach(id => {
  const input = document.getElementById(id);
  if (!input) return;
  const saved = localStorage.getItem(id);
  if (saved) input.value = saved;
  input.addEventListener('input', () => {
    localStorage.setItem(id, input.value);
  });
});

function getRandomCover(index) {
  return tumblrImages[index % tumblrImages.length];
}

async function loadTracks() {
  let tracks = [];
  if (window.api) {
    try {
      tracks = await window.api.getAudios();
    } catch {
      tracks = [];
    }
  }

  if (!tracks || tracks.length === 0) {
    tracks = [
      {
        id: 'chuva-demo-1',
        title: 'chuva suave na janela ‧°',
        category: 'chuva',
        fileUrl: '',
        isSynthesized: true,
        type: 'rain'
      },
      {
        id: 'chuva-demo-2',
        title: 'chuva relaxante 10 minutos',
        category: 'chuva',
        fileUrl: '',
        isSynthesized: true,
        type: 'rain'
      },
      {
        id: 'meditacao-demo-1',
        title: 'Adyashanti - Apenas Seja',
        category: 'meditacao',
        fileUrl: '',
        isSynthesized: true,
        type: 'pink'
      },
      {
        id: 'meditacao-demo-2',
        title: 'Thich Nhat Hanh - Relaxe seu Corpo',
        category: 'meditacao',
        fileUrl: '',
        isSynthesized: true,
        type: 'pink'
      },
      {
        id: 'ondas-demo-1',
        title: 'Theta Wave 2.0 - Pure Frequency',
        category: 'ondas',
        fileUrl: '',
        isSynthesized: true,
        type: 'theta'
      },
      {
        id: 'ondas-demo-2',
        title: 'Pink Noise Black Screen ˚.⁺',
        category: 'ondas',
        fileUrl: '',
        isSynthesized: true,
        type: 'pink'
      }
    ];
  }

  const customPlaylists = getCustomPlaylists();
  customPlaylists.forEach(pl => {
    tracks.push({
      id: `pl-${pl.id}`,
      title: pl.name,
      category: 'playlists',
      isPlaylist: true,
      color: pl.color,
      fileUrl: tracks[0]?.fileUrl || ''
    });
  });

  allTracks = tracks;
  renderTrackGrid();
}

function renderTrackGrid() {
  if (!musicGrid) return;
  musicGrid.innerHTML = '';

  const searchVal = document.getElementById('library-search')?.value.toLowerCase() || '';
  const filtered = allTracks.filter(track => {
    const matchCategory = currentFilter === 'all' || track.category === currentFilter;
    const matchSearch = track.title.toLowerCase().includes(searchVal);
    return matchCategory && matchSearch;
  });

  if (trackCountLabel) {
    trackCountLabel.textContent = `${filtered.length} itens`;
  }

  filtered.forEach((track, index) => {
    const card = document.createElement('div');
    card.className = 'music-card';

    const coverSrc = getRandomCover(index);
    const subtitle = track.isPlaylist 
      ? `Playlist • ${track.title.split(' ')[0]}` 
      : `Áudio • ${track.category}`;

    card.innerHTML = `
      <img src="${coverSrc}" class="card-cover" alt="${track.title}">
      <div class="card-title">${track.title}</div>
      <div class="card-sub">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${track.color || '#a1a1aa'};"></span>
        <span>${subtitle}</span>
      </div>
      <div class="play-hover-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </div>
    `;

    card.addEventListener('click', () => {
      const globalIndex = allTracks.findIndex(t => t.id === track.id);
      playTrack(globalIndex);
    });

    musicGrid.appendChild(card);
  });
}

let synthContext = null;
let synthGain = null;
let synthSource = null;

function stopSynthesizer() {
  if (synthSource) {
    try {
      synthSource.stop();
      synthSource.disconnect();
    } catch {}
    synthSource = null;
  }
}

function playSynthesizer(type) {
  stopSynthesizer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!synthContext) synthContext = new AudioCtx();
  if (synthContext.state === 'suspended') synthContext.resume();

  const bufferSize = synthContext.sampleRate * 2;
  const buffer = synthContext.createBuffer(1, bufferSize, synthContext.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (type === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    } else {
      b0 = 0.99 * b0 + white * 0.05;
      data[i] = b0 * 0.18;
    }
  }

  synthSource = synthContext.createBufferSource();
  synthSource.buffer = buffer;
  synthSource.loop = true;

  if (!synthGain) {
    synthGain = synthContext.createGain();
    synthGain.connect(synthContext.destination);
  }
  synthGain.gain.setValueAtTime(volumeSlider.value * 0.4, synthContext.currentTime);

  synthSource.connect(synthGain);
  synthSource.start();
}

function playTrack(index) {
  if (index < 0 || index >= allTracks.length) return;
  currentTrackIndex = index;
  const track = allTracks[index];

  nowTitle.textContent = track.title;
  nowArtist.textContent = `sleep my angel ‧ ${track.category}`;
  nowCover.src = getRandomCover(index);

  stopSynthesizer();

  if (track.fileUrl && track.fileUrl.startsWith('file://')) {
    audioPlayer.src = track.fileUrl;
    audioPlayer.play().then(() => {
      updatePlayButton(true);
    }).catch(() => {
      playSynthesizer('pink');
      updatePlayButton(true);
    });
  } else {
    playSynthesizer(track.type || 'pink');
    updatePlayButton(true);
  }
}

function updatePlayButton(isPlaying) {
  if (isPlaying) {
    playIcon.innerHTML = `
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    `;
  } else {
    playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
  }
}

playBtn?.addEventListener('click', () => {
  if (currentTrackIndex === -1) {
    if (allTracks.length > 0) playTrack(0);
    return;
  }

  if (audioPlayer.paused && !synthSource) {
    playTrack(currentTrackIndex);
  } else if (!audioPlayer.paused) {
    audioPlayer.pause();
    updatePlayButton(false);
  } else if (synthSource) {
    stopSynthesizer();
    updatePlayButton(false);
  } else {
    playTrack(currentTrackIndex);
  }
});

prevBtn?.addEventListener('click', () => {
  if (allTracks.length === 0) return;
  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) prevIndex = allTracks.length - 1;
  playTrack(prevIndex);
});

nextBtn?.addEventListener('click', () => {
  if (allTracks.length === 0) return;
  let nextIndex = currentTrackIndex + 1;
  if (isShuffle) {
    nextIndex = Math.floor(Math.random() * allTracks.length);
  } else if (nextIndex >= allTracks.length) {
    nextIndex = 0;
  }
  playTrack(nextIndex);
});

shuffleBtn?.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
});

loopBtn?.addEventListener('click', () => {
  isLoop = !isLoop;
  loopBtn.classList.toggle('active', isLoop);
  audioPlayer.loop = isLoop;
});

audioPlayer.addEventListener('timeupdate', () => {
  if (audioPlayer.duration) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = `${progress}%`;
    currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
    totalDurationLabel.textContent = formatTime(audioPlayer.duration);
  }
});

audioPlayer.addEventListener('ended', () => {
  if (!isLoop) {
    nextBtn.click();
  }
});

progressBar?.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  if (audioPlayer.duration) {
    audioPlayer.currentTime = ratio * audioPlayer.duration;
  }
});

volumeSlider?.addEventListener('input', () => {
  const vol = parseFloat(volumeSlider.value);
  audioPlayer.volume = vol;
  if (synthGain && synthContext) {
    synthGain.gain.setValueAtTime(vol * 0.4, synthContext.currentTime);
  }
});

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const filterPills = document.querySelectorAll('.filter-pill');
filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    filterPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter;
    renderTrackGrid();
  });
});

document.getElementById('library-search')?.addEventListener('input', () => {
  renderTrackGrid();
});

document.getElementById('btn-open-folder')?.addEventListener('click', async () => {
  if (!window.api) return;
  const custom = await window.api.selectAudioFolder();
  if (custom && custom.length > 0) {
    allTracks.push(...custom);
    renderTrackGrid();
  }
});

function getCustomPlaylists() {
  try {
    return JSON.parse(localStorage.getItem('custom_playlists')) || [];
  } catch {
    return [];
  }
}

function saveCustomPlaylist(playlist) {
  const current = getCustomPlaylists();
  current.push(playlist);
  localStorage.setItem('custom_playlists', JSON.stringify(current));
}

const modalPlaylist = document.getElementById('modal-playlist');
document.getElementById('btn-add-playlist')?.addEventListener('click', () => {
  modalPlaylist.classList.add('open');
});

document.getElementById('modal-cancel-playlist')?.addEventListener('click', () => {
  modalPlaylist.classList.remove('open');
});

let selectedColor = '#e2ece0';
document.querySelectorAll('.color-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedColor = opt.dataset.color;
  });
});

document.getElementById('modal-save-playlist')?.addEventListener('click', () => {
  const nameInput = document.getElementById('playlist-name-input');
  const name = nameInput.value.trim();
  if (!name) return;

  saveCustomPlaylist({
    id: Date.now().toString(),
    name: name,
    color: selectedColor
  });

  nameInput.value = '';
  modalPlaylist.classList.remove('open');
  loadTracks();
});

const defaultAffirmations = [
  {
    quote: "Não peça a ninguém lá fora. A sua imaginação é Deus em ação. Ao deitar a cabeça no travesseiro, aceite plenamente a sensação de que o que você quer já existe.",
    author: "Edward Art ‧ O Criador Interior"
  },
  {
    quote: "O sono não é um esquecimento; é a entrada sagrada no templo da sua imaginação. O que você aceita como verdade ao adormecer floresce no seu mundo físico.",
    author: "Edward Art ‧ Descanse no Fim"
  },
  {
    quote: "Eu já sou. Eu não preciso lutar, provar nada ou esperar. Toda a realidade se curva diante da minha aceitação interna.",
    author: "Neville Goddard"
  },
  {
    quote: "A paz que eu sinto nesta cama agora é a mesma paz de quem já tem tudo aquilo que ama.",
    author: "Sleep Angel"
  },
  {
    quote: "Sinta o alívio. Esse é o segredo de Edward Art: não se trata de força, mas da doçura do alívio.",
    author: "Edward Art"
  }
];

let activeQuoteIndex = 0;
function loadAffirmations() {
  const saved = localStorage.getItem('user_affirmations');
  let list = saved ? JSON.parse(saved) : defaultAffirmations;

  const quoteEl = document.getElementById('active-quote');
  const gridEl = document.getElementById('affirmations-grid');
  if (!gridEl) return;

  if (quoteEl && list[activeQuoteIndex]) {
    quoteEl.textContent = `"${list[activeQuoteIndex].quote}"`;
  }

  gridEl.innerHTML = '';
  list.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'affirmation-card';
    card.innerHTML = `
      <p>"${item.quote}"</p>
      <div class="affirmation-footer">
        <span>${item.author}</span>
        <button class="action-btn" style="width:24px; height:24px;" data-idx="${idx}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
      </div>
    `;

    card.querySelector('button')?.addEventListener('click', () => {
      activeQuoteIndex = idx;
      quoteEl.textContent = `"${item.quote}"`;
      speakAffirmation(item.quote);
    });

    gridEl.appendChild(card);
  });
}

function speakAffirmation(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.85;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
}

document.getElementById('btn-next-quote')?.addEventListener('click', () => {
  const saved = localStorage.getItem('user_affirmations');
  const list = saved ? JSON.parse(saved) : defaultAffirmations;
  activeQuoteIndex = (activeQuoteIndex + 1) % list.length;
  loadAffirmations();
});

document.getElementById('btn-read-aloud')?.addEventListener('click', () => {
  const quoteEl = document.getElementById('active-quote');
  if (quoteEl) speakAffirmation(quoteEl.textContent);
});

const modalAffirmation = document.getElementById('modal-affirmation');
document.getElementById('btn-add-affirmation')?.addEventListener('click', () => {
  modalAffirmation.classList.add('open');
});

document.getElementById('modal-cancel-affirmation')?.addEventListener('click', () => {
  modalAffirmation.classList.remove('open');
});

document.getElementById('modal-save-affirmation')?.addEventListener('click', () => {
  const textInput = document.getElementById('affirmation-text-input');
  const authorInput = document.getElementById('affirmation-author-input');
  const text = textInput.value.trim();
  const author = authorInput.value.trim() || 'Meu Eu Ideal';

  if (!text) return;

  const saved = localStorage.getItem('user_affirmations');
  const list = saved ? JSON.parse(saved) : [...defaultAffirmations];
  list.push({ quote: text, author: author });
  localStorage.setItem('user_affirmations', JSON.stringify(list));

  textInput.value = '';
  authorInput.value = '';
  modalAffirmation.classList.remove('open');
  loadAffirmations();
});

const defaultRecipes = [
  {
    title: 'Leite Quente Tradicional da Vovó',
    tag: 'favorito',
    ingredients: '250ml de leite integral ou de aveia, 1 colher de chá de mel puro, 1 pitadinha de canela e 2 gotinhas de essência de baunilha.',
    prep: 'Aqueça o leite em fogo bem baixinho até ficar quentinho e aconchegante (sem deixar ferver). Misture o mel e a baunilha, coloque na sua caneca favorita e polvilhe a canela por cima.'
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
    prep: 'Dissolva o cacau no leite quente e finalize com a noz-moscada ralada na hora. A noz-moscada possui propriedades naturais que induzem o sono.'
  }
];

function loadRecipes() {
  const container = document.getElementById('recipes-container');
  if (!container) return;

  const saved = localStorage.getItem('user_recipes');
  const recipes = saved ? JSON.parse(saved) : defaultRecipes;

  container.innerHTML = '';
  recipes.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <div class="recipe-header">
        <h4 class="recipe-title">${r.title}</h4>
        <span class="recipe-tag">${r.tag || 'cozy'}</span>
      </div>
      <div class="recipe-ingredients">
        <strong>Ingredientes:</strong> ${r.ingredients}
      </div>
      <div class="recipe-prep">
        <strong>Preparo:</strong> ${r.prep}
      </div>
    `;
    container.appendChild(card);
  });
}

const modalRecipe = document.getElementById('modal-recipe');
document.getElementById('btn-add-recipe')?.addEventListener('click', () => {
  modalRecipe.classList.add('open');
});

document.getElementById('modal-cancel-recipe')?.addEventListener('click', () => {
  modalRecipe.classList.remove('open');
});

document.getElementById('modal-save-recipe')?.addEventListener('click', () => {
  const nameInput = document.getElementById('recipe-name-input');
  const ingInput = document.getElementById('recipe-ingredients-input');
  const prepInput = document.getElementById('recipe-prep-input');

  const name = nameInput.value.trim();
  const ing = ingInput.value.trim();
  const prep = prepInput.value.trim();

  if (!name || !ing) return;

  const saved = localStorage.getItem('user_recipes');
  const recipes = saved ? JSON.parse(saved) : [...defaultRecipes];
  recipes.unshift({
    title: name,
    tag: 'meu ritual',
    ingredients: ing,
    prep: prep
  });

  localStorage.setItem('user_recipes', JSON.stringify(recipes));

  nameInput.value = '';
  ingInput.value = '';
  prepInput.value = '';
  modalRecipe.classList.remove('open');
  loadRecipes();
});

let timerMinutes = 30;
let timerSecondsRemaining = 30 * 60;
let timerInterval = null;
let isTimerRunning = false;

const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const btnToggleTimer = document.getElementById('btn-toggle-timer');

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timerMinutes = parseInt(btn.dataset.minutes, 10);
    resetTimer();
  });
});

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerSecondsRemaining = timerMinutes * 60;
  updateTimerDisplay();
  btnToggleTimer.textContent = 'Iniciar Contador';
  timerStatus.textContent = 'timer para desligar o som suavemente';
}

function updateTimerDisplay() {
  const m = Math.floor(timerSecondsRemaining / 60);
  const s = timerSecondsRemaining % 60;
  timerDisplay.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
}

btnToggleTimer?.addEventListener('click', () => {
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    btnToggleTimer.textContent = 'Continuar';
    timerStatus.textContent = 'pausado';
  } else {
    isTimerRunning = true;
    btnToggleTimer.textContent = 'Pausar';
    timerStatus.textContent = 'contando... bom sono ‧°';

    timerInterval = setInterval(() => {
      timerSecondsRemaining--;
      updateTimerDisplay();

      if (timerSecondsRemaining <= 60 && timerSecondsRemaining > 0) {
        const factor = timerSecondsRemaining / 60;
        audioPlayer.volume = Math.max(0, volumeSlider.value * factor);
      }

      if (timerSecondsRemaining <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        audioPlayer.pause();
        stopSynthesizer();
        updatePlayButton(false);
        timerStatus.textContent = 'som desligado com sucesso 🌙';
        btnToggleTimer.textContent = 'Reiniciar';
      }
    }, 1000);
  }
});

const defaultScript = `# meu script de sono & realidade desejada ‧°
*lei da suposição ‧ odette.exe*

### 1. como eu me sinto agora
- completamente em paz e protegida no meu quarto
- a sensação doce de que tudo que eu desejo já é meu fato consumado
- corpo relaxado, mente silenciosa e serena

### 2. afirmações da noite
- eu não preciso forçar a 3d. a imaginação é a única causa.
- ao fechar meus olhos hoje, eu acordo na versão perfeita da minha vida.
- eu sou grata pela harmonia, pelo descanso profundo e pelo meu futuro brilhante.

### 3. ritual de amanhã
- acordar no meu próprio ritmo
- tomar meu cafezinho com calma
- manter a suposição do meu desejo vivo o dia todo ✨
`;

async function initNotionScript() {
  const editor = document.getElementById('script-editor');
  if (!editor) return;

  let content = defaultScript;
  if (window.api) {
    const fileContent = await window.api.getScriptFile();
    if (fileContent && fileContent.text) {
      content = fileContent.text;
    }
  }

  const savedLocal = localStorage.getItem('offline_script');
  if (savedLocal) content = savedLocal;

  editor.value = content;

  editor.addEventListener('input', () => {
    localStorage.setItem('offline_script', editor.value);
  });

  document.getElementById('btn-save-script')?.addEventListener('click', async () => {
    const text = editor.value;
    localStorage.setItem('offline_script', text);
    if (window.api) {
      await window.api.saveScriptFile({ text, updated: new Date().toISOString() });
    }
    const btn = document.getElementById('btn-save-script');
    btn.textContent = 'Salvo!';
    setTimeout(() => { btn.textContent = 'Salvar Offline'; }, 1500);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initDateDisplay();
  loadTracks();
  loadAffirmations();
  loadRecipes();
  resetTimer();
  initNotionScript();
});
