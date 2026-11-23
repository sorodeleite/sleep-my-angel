(function () {
  const SMA = window.SMA;

  function setPlatform() {
    const platform = SMA.platform();
    document.documentElement.classList.add('platform-' + platform);
    document.body.classList.add('platform-' + platform);
    if (platform === 'web') document.body.classList.add('is-web');
    const title = SMA.select('#titlebar-title');
    if (title) {
      title.textContent = platform === 'desktop'
        ? 'odette.exe ‧ sleep my angel'
        : platform === 'android'
          ? 'sleep my angel ‧ app'
          : 'sleep my angel ‧ web';
    }
  }

  function initWindowControls() {
    const api = window.api;
    if (!api) return;
    SMA.select('#btn-close')?.addEventListener('click', function () {
      api.windowControl('close');
    });
    SMA.select('#btn-min')?.addEventListener('click', function () {
      api.windowControl('minimize');
    });
    SMA.select('#btn-max')?.addEventListener('click', function () {
      api.windowControl('maximize');
    });
  }

  function initTheme() {
    const button = document.getElementById('btn-theme-switch');
    if (!button) return;
    const moon = '<path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.7 8.7 0 1 0 20.2 15.4Z"></path>';
    const sun = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>';
    function applyTheme(theme) {
      const dark = theme === 'dark';
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17151b' : '#f4f4f5');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (dark ? sun : moon) + '</svg>';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'desativar tema escuro' : 'ativar tema escuro');
      button.title = dark ? 'apagar modo escuro' : 'acender modo escuro';
    }
    let theme = SMA.readText('sma_theme', 'light') === 'dark' ? 'dark' : 'light';
    applyTheme(theme);
    button.addEventListener('click', function () {
      theme = theme === 'dark' ? 'light' : 'dark';
      SMA.writeText('sma_theme', theme);
      button.classList.remove('is-switching');
      void button.offsetWidth;
      button.classList.add('is-switching');
      applyTheme(theme);
      window.setTimeout(function () { button.classList.remove('is-switching'); }, 520);
    });
  }

  function initDate() {
    const label = SMA.select('#date-text');
    if (label) label.textContent = SMA.todayLabel();
  }

  const lazyTabs = {
    'tab-books': function () { return SMA.Books.init(); },
    'tab-moodboard': function () { return SMA.Moodboard.init(); },
    'tab-shift-scripts': function () { return SMA.ShiftScripts.init(); },
    'tab-planner': function () { return SMA.PersonalPlanner.init(); }
  };
  const lazyStarted = Object.create(null);

  function ensureTab(tabId) {
    const loader = lazyTabs[tabId];
    if (!loader || lazyStarted[tabId]) return;
    lazyStarted[tabId] = true;
    try {
      const result = loader();
      if (result && typeof result.catch === 'function') {
        result.catch(function () {
          lazyStarted[tabId] = false;
        });
      }
    } catch (error) {
      lazyStarted[tabId] = false;
    }
  }

  function initTabs() {
    const buttons = SMA.selectAll('.nav-tab-btn');
    const panes = SMA.selectAll('.tab-pane');
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        buttons.forEach(function (item) {
          item.classList.toggle('active', item === button);
        });
        panes.forEach(function (pane) {
          pane.classList.toggle('active', pane.id === button.dataset.tab);
        });
        const area = SMA.select('.tab-content-area');
        if (area && window.innerWidth < 769) area.scrollTop = 0;
        ensureTab(button.dataset.tab);
      });
    });
    const active = buttons.find(function (button) { return button.classList.contains('active'); });
    if (active) ensureTab(active.dataset.tab);
  }

  function initProfileFields() {
    ['user-name-input', 'user-mood-input', 'user-goal-input'].forEach(function (id) {
      const input = document.getElementById(id);
      if (!input) return;
      const saved = SMA.readText(id, '');
      if (saved) input.value = saved;
      input.addEventListener('input', function () {
        SMA.writeText(id, input.value);
      });
    });
  }

  function initAvatar() {
    const container = SMA.select('#avatar-container');
    const input = SMA.select('#avatar-file-input');
    const image = SMA.select('#profile-avatar-img');
    if (!container || !input || !image) return;

    const saved = SMA.readText('user_avatar', '');
    if (saved && saved.indexOf('data:image/') === 0) {
      image.src = saved;
    }

    container.addEventListener('click', function () {
      input.click();
    });

    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const bitmap = new Image();
      bitmap.onload = function () {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        const scale = Math.max(size / bitmap.width, size / bitmap.height);
        const width = bitmap.width * scale;
        const height = bitmap.height * scale;
        context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        image.src = dataUrl;
        if (!SMA.writeText('user_avatar', dataUrl)) {
          SMA.toast('essa foto é grande demais para guardar');
        }
        URL.revokeObjectURL(url);
      };
      bitmap.onerror = function () {
        URL.revokeObjectURL(url);
        SMA.toast('não consegui abrir essa foto');
      };
      bitmap.src = url;
    });
  }

  function initModals() {
    SMA.selectAll('.modal-backdrop').forEach(function (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) modal.classList.remove('open');
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      SMA.selectAll('.modal-backdrop.open').forEach(function (modal) {
        modal.classList.remove('open');
      });
    });
  }

  function initKeyboard(player) {
    document.addEventListener('keydown', function (event) {
      const target = event.target;
      if (target && target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        player.toggle();
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        player.next();
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        player.prev();
      }
    });
  }

  function bindPlayer(player, library) {
    document.querySelector('.bottom-player')?.classList.add('is-empty');
    const playButton = SMA.select('#btn-play');
    const playIcon = SMA.select('#play-icon');
    const progressBar = SMA.select('#progress-bar');
    const progressFill = SMA.select('#progress-fill');
    const currentLabel = SMA.select('#current-time');
    const totalLabel = SMA.select('#total-duration');
    const volumeSlider = SMA.select('#volume-slider');
    const nowTitle = SMA.select('#now-title');
    const nowArtist = SMA.select('#now-artist');
    const nowCover = SMA.select('#now-cover');
    const bottomPlayer = SMA.select('.bottom-player');
    const shuffleButton = SMA.select('#btn-shuffle');
    const loopButton = SMA.select('#btn-loop');
    const categoryNames = {
      meditacao: 'meditação',
      ondas: 'ondas & frequências',
      custom: 'importado',
      playlists: 'playlist'
    };

    const playIconMarkup = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    const pauseIconMarkup = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

    function paintPlayButton(playing) {
      if (!playIcon) return;
      playIcon.innerHTML = playing ? pauseIconMarkup : playIconMarkup;
      if (playButton) {
        playButton.setAttribute('aria-label', playing ? 'pausar' : 'tocar');
        playButton.classList.toggle('is-playing', playing);
      }
    }

    function resetProgress() {
      if (progressBar) progressBar.classList.remove('is-ambient');
      if (progressFill) progressFill.style.width = '0%';
      if (currentLabel) currentLabel.textContent = '0:00';
      if (totalLabel) totalLabel.textContent = '0:00';
    }

    function handleTrack(detail) {
      const track = detail.track;
      if (!track) return;
      bottomPlayer?.classList.remove('is-empty');
      if (nowTitle) nowTitle.textContent = track.title;
      if (nowArtist) {
        nowArtist.textContent = track.isPlaylist
          ? 'sleep my angel ‧ playlist'
          : (track.artist || 'sleep my angel ‧ ' + (categoryNames[track.category] || track.category));
      }
      if (nowCover && track.cover) nowCover.src = track.cover;
      updateExpandedPlayer(track);
      document.title = track.title + ' ‧ sleep my angel';
      resetProgress();
      library.markPlaying(null);
    }

    function updateExpandedPlayer(track) {
      let panel = document.getElementById('expanded-player');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'expanded-player';
        panel.className = 'expanded-player';
        panel.innerHTML = '<button class="expanded-close" type="button" aria-label="fechar">×</button><div class="expanded-art-wrap"><img class="expanded-art" alt="capa do áudio"></div><div class="expanded-info"><h2></h2><p></p></div><div class="expanded-progress"><span class="expanded-current">0:00</span><div class="expanded-track"><i></i></div><span class="expanded-total">0:00</span></div><div class="expanded-controls"><button data-player="prev" aria-label="anterior">◀◀</button><button data-player="toggle" class="expanded-toggle" aria-label="pausar">Ⅱ</button><button data-player="next" aria-label="próximo">▶▶</button></div></div>';
        document.body.appendChild(panel);
        panel.querySelector('.expanded-close').addEventListener('click', () => panel.classList.remove('open'));
        panel.addEventListener('click', event => {
          const action = event.target.closest('[data-player]')?.dataset.player;
          if (action === 'prev') player.prev();
          if (action === 'next') player.next();
          if (action === 'toggle') player.toggle();
        });
      }
      panel.querySelector('.expanded-art').src = track.cover || '';
      panel.querySelector('.expanded-info h2').textContent = track.title || '';
      panel.querySelector('.expanded-info p').textContent = track.artist || 'sleep my angel';
      const image = panel.querySelector('.expanded-art');
      image.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0, 1, 1);
          const pixel = context.getImageData(0, 0, 1, 1).data;
          panel.style.setProperty('--player-tint', 'rgb(' + pixel[0] + ' ' + pixel[1] + ' ' + pixel[2] + ')');
        } catch (error) { panel.style.setProperty('--player-tint', '#dce8ed'); }
      };
      panel.classList.add('has-track');
      const left = document.querySelector('.player-left');
      if (left && !left.dataset.expandedBound) {
        left.dataset.expandedBound = '1';
        left.addEventListener('click', () => panel.classList.add('open'));
      }
    }

    function handleTime(detail) {
      const expanded = document.getElementById('expanded-player');
      if (expanded) {
        const current = expanded.querySelector('.expanded-current');
        const total = expanded.querySelector('.expanded-total');
        const fill = expanded.querySelector('.expanded-track i');
        if (current) current.textContent = SMA.formatTime(detail.currentTime);
        if (total) total.textContent = detail.synth ? '∞' : SMA.formatTime(Number.isFinite(detail.duration) ? detail.duration : 0);
        if (fill) fill.style.width = detail.synth ? '100%' : (detail.duration > 0 ? Math.min(100, detail.currentTime / detail.duration * 100) : 0) + '%';
      }
      if (!progressFill || !currentLabel || !totalLabel) return;
      if (detail.synth) {
        progressBar?.classList.add('is-ambient');
        progressFill.style.width = '100%';
        currentLabel.textContent = SMA.formatTime(detail.currentTime);
        totalLabel.textContent = '∞';
        return;
      }
      progressBar?.classList.remove('is-ambient');
      const duration = Number.isFinite(detail.duration) ? detail.duration : 0;
      const ratio = duration > 0 ? Math.min(1, detail.currentTime / duration) : 0;
      progressFill.style.width = ratio * 100 + '%';
      currentLabel.textContent = SMA.formatTime(detail.currentTime);
      totalLabel.textContent = SMA.formatTime(duration);
    }

    document.addEventListener('player:track', function (event) {
      handleTrack(event.detail);
    });
    document.addEventListener('player:state', function (event) {
      const playing = Boolean(event.detail.playing);
      paintPlayButton(playing);
      const expandedToggle = document.querySelector('.expanded-toggle');
      if (expandedToggle) expandedToggle.textContent = playing ? 'Ⅱ' : '▶';
      library.markPlaying(playing ? player.current() : null);
    });
    document.addEventListener('player:time', function (event) {
      handleTime(event.detail);
    });
    let fallbackNoticeAt = 0;
    document.addEventListener('player:fallback', function () {
      library.markPlaying(player.current());
      if (Date.now() - fallbackNoticeAt < 12000) return;
      fallbackNoticeAt = Date.now();
      SMA.toast('essa faixa não veio no app ‧ tocando um som gerado parecido');
    });
    document.addEventListener('player:error', function (event) {
      library.markPlaying(null);
      SMA.toast(event.detail.message || 'algo saiu do tom');
    });
    document.addEventListener('player:mode', function (event) {
      shuffleButton?.classList.toggle('active', Boolean(event.detail.shuffle));
      loopButton?.classList.toggle('active', Boolean(event.detail.loop));
    });
    document.addEventListener('player:volume', function (event) {
      if (volumeSlider && document.activeElement !== volumeSlider) {
        volumeSlider.value = String(event.detail.volume);
      }
    });

    playButton?.addEventListener('click', function () {
      if (player.queue.length === 0 && library.tracks.length > 0) {
        library.playTrack(library.tracks[0]);
        return;
      }
      player.toggle();
    });

    SMA.select('#btn-prev')?.addEventListener('click', function () {
      player.prev();
    });
    SMA.select('#btn-next')?.addEventListener('click', function () {
      player.next();
    });
    shuffleButton?.addEventListener('click', function () {
      player.setShuffle(!player.shuffle);
    });
    loopButton?.addEventListener('click', function () {
      player.setLoop(!player.loop);
    });

    let dragging = false;
    function seekAt(event) {
      if (!progressBar || player.isSynth) return;
      const rect = progressBar.getBoundingClientRect();
      if (!rect.width) return;
      player.seek((event.clientX - rect.left) / rect.width);
    }
    progressBar?.addEventListener('pointerdown', function (event) {
      if (player.isSynth) {
        SMA.toast('esse som é contínuo, não tem linha do tempo');
        return;
      }
      dragging = true;
      progressBar.setPointerCapture(event.pointerId);
      seekAt(event);
    });
    progressBar?.addEventListener('pointermove', function (event) {
      if (dragging) seekAt(event);
    });
    progressBar?.addEventListener('pointerup', function (event) {
      dragging = false;
      if (progressBar.hasPointerCapture(event.pointerId)) {
        progressBar.releasePointerCapture(event.pointerId);
      }
    });
    progressBar?.addEventListener('pointercancel', function () {
      dragging = false;
    });
    progressBar?.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.stopPropagation();
      if (player.isSynth) return;
      const duration = player.audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 10 : -10;
      player.seek((player.audio.currentTime + step) / duration);
    });

    if (volumeSlider) {
      volumeSlider.value = String(player.userVolume);
      volumeSlider.addEventListener('input', function () {
        player.setVolume(Number(volumeSlider.value));
      });
    }

    paintPlayButton(false);
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (SMA.platform() !== 'web') return;
    if (location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  async function boot() {
    setPlatform();
    initWindowControls();
    initDate();
    initTheme();
    initTabs();
    try {
      if (SMA.ShiftScripts) SMA.ShiftScripts.init();
    } catch (error) {
      console.error('não foi possível iniciar Scripts:', error);
      const root = document.getElementById('shift-scripts-root');
      if (root) root.innerHTML = '<div class="studio-empty"><strong>não consegui abrir Scripts</strong><p>feche e abra a página novamente. se continuar, me avise.</p></div>';
    }
    try {
      if (SMA.PersonalPlanner) SMA.PersonalPlanner.init();
    } catch (error) {
      console.error('não foi possível iniciar Calendar:', error);
      const root = document.getElementById('planner-root');
      if (root) root.innerHTML = '<div class="studio-empty"><strong>não consegui abrir Calendar</strong><p>feche e abra a página novamente. se continuar, me avise.</p></div>';
    }
    initProfileFields();
    initAvatar();
    initModals();
    if (SMA.Reminders) SMA.Reminders.init();

    const player = new SMA.Player();
    const library = new SMA.Library(player);
    await library.init();
    const timer = new SMA.SleepTimer(player);
    timer.init();

    SMA.Affirmations.init();
    SMA.Recipes.init();
    bindPlayer(player, library);
    initKeyboard(player);
    initServiceWorker();

    if (SMA.Updater) {
      try {
        const updater = SMA.Updater.init();
        if (updater && typeof updater.catch === 'function') updater.catch(function () {});
      } catch (error) {
      }
    }

    SMA.App = {
      player: player,
      library: library,
      timer: timer
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
