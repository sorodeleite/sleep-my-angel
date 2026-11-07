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

  function initDate() {
    const label = SMA.select('#date-text');
    if (label) label.textContent = SMA.todayLabel();
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
        if (window.innerWidth < 769) {
          const area = SMA.select('.tab-content-area');
          if (area) area.scrollTop = 0;
        }
      });
    });
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
    const shuffleButton = SMA.select('#btn-shuffle');
    const loopButton = SMA.select('#btn-loop');
    const categoryNames = {
      chuva: 'chuva',
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
      if (nowTitle) nowTitle.textContent = track.title;
      if (nowArtist) {
        nowArtist.textContent = track.isPlaylist
          ? 'sleep my angel ‧ playlist'
          : 'sleep my angel ‧ ' + (categoryNames[track.category] || track.category);
      }
      if (nowCover && track.cover) nowCover.src = track.cover;
      document.title = track.title + ' ‧ sleep my angel';
      resetProgress();
      library.markPlaying(track);
    }

    function handleTime(detail) {
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
      paintPlayButton(Boolean(event.detail.playing));
    });
    document.addEventListener('player:time', function (event) {
      handleTime(event.detail);
    });
    document.addEventListener('player:error', function (event) {
      const track = player.current();
      if (SMA.platform() === 'android' && track && String(track.fileUrl || '').indexOf('audios/') === 0) {
        SMA.toast('no android, toque no ✎ do cartão e importe esse áudio uma vez');
        return;
      }
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
    initTabs();
    initProfileFields();
    initAvatar();
    initModals();

    const player = new SMA.Player();
    const library = new SMA.Library(player);
    await library.init();
    const timer = new SMA.SleepTimer(player);
    timer.init();

    SMA.Affirmations.init();
    SMA.Recipes.init();
    await SMA.Books.init();
    SMA.ScriptNotes.init();
    bindPlayer(player, library);
    initKeyboard(player);
    initServiceWorker();

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
