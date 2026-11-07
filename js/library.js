(function () {
  const SMA = window.SMA;

  const COVERS = [
    'assets/readme-photos/tumblr_095bd1f9adbbfc70eabb0168b575af87_0802485b_1280.jpg',
    'assets/readme-photos/tumblr_3627acec240809122de5d5afa6912f5b_16b02d5f_1280.webp',
    'assets/readme-photos/tumblr_91662fd1300010d18e42efd98b8460b6_324119a2_1280.jpg',
    'assets/readme-photos/tumblr_bd8e9efc0a9c6fd799342197e304508b_3adc1fa5_1280.jpg',
    'assets/readme-photos/tumblr_db6ab36987b578f88c6ed96f4578a05c_fcb8ffe3_400.png'
  ];

  const DEMO_TRACKS = [
    {
      id: 'chuva-demo-suave',
      title: 'chuva suave na janela ‧°',
      category: 'chuva',
      type: 'rain'
    },
    {
      id: 'chuva-demo-lenta',
      title: 'chuva relaxante de outono',
      category: 'chuva',
      type: 'rain'
    },
    {
      id: 'meditacao-demo-apenas-seja',
      title: 'Adyashanti - Apenas Seja',
      category: 'meditacao',
      type: 'pink'
    },
    {
      id: 'meditacao-demo-relaxe',
      title: 'Thich Nhat Hanh - Relaxe seu Corpo',
      category: 'meditacao',
      type: 'theta'
    },
    {
      id: 'ondas-demo-theta',
      title: 'Theta Wave - frequência pura',
      category: 'ondas',
      type: 'theta'
    },
    {
      id: 'ondas-demo-pink',
      title: 'Pink Noise - tela preta',
      category: 'ondas',
      type: 'pink'
    },
    {
      id: 'ondas-demo-marrom',
      title: 'Brown Noise - sono profundo',
      category: 'ondas',
      type: 'brown'
    }
  ];

  const AUDIO_FILES = /\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i;
  const CATEGORY_LABELS = {
    chuva: 'chuva',
    meditacao: 'meditação',
    ondas: 'ondas & frequências',
    custom: 'importado',
    playlists: 'playlist'
  };

  class Library {
    constructor(player) {
      this.player = player;
      this.tracks = [];
      this.playlists = [];
      this.filter = 'all';
      this.search = '';
      this.activePlaylistId = null;
      this.selectedColor = '#e2ece0';
      this.grid = SMA.select('#music-grid');
      this.countLabel = SMA.select('#track-count-label');
      this.searchInput = SMA.select('#library-search');
      this.fileInput = SMA.select('#mobile-audio-input');
      this.context = SMA.select('#library-context');
      this.contextName = SMA.select('#library-context-name');
      this.contextCount = SMA.select('#library-context-count');
      this.playlistModal = SMA.select('#modal-playlist');
      this.playlistName = SMA.select('#playlist-name-input');
      this.playlistTracks = SMA.select('#playlist-track-list');
      this.playlistHint = SMA.select('#playlist-selection-hint');
    }

    async init() {
      this.playlists = this.normalizePlaylists(SMA.readJSON('custom_playlists', []));
      this.bind();
      await this.loadTracks();
      await this.loadImports();
      this.render();
    }

    normalizePlaylists(value) {
      if (!Array.isArray(value)) return [];
      return value
        .filter(function (playlist) {
          return playlist && typeof playlist.name === 'string';
        })
        .map(function (playlist) {
          return {
            id: String(playlist.id || Date.now() + Math.random()),
            name: playlist.name.slice(0, 60),
            color: playlist.color || '#e2ece0',
            trackIds: Array.isArray(playlist.trackIds) ? playlist.trackIds.map(String) : []
          };
        });
    }

    async loadTracks() {
      let tracks = [];
      const platform = SMA.platform();
      if (platform === 'desktop' && window.api) {
        try {
          tracks = await window.api.getAudios();
        } catch (error) {
          tracks = [];
        }
      } else if (platform === 'web') {
        tracks = await this.fetchSiteTracks();
      }
      if (!tracks || tracks.length === 0) {
        tracks = DEMO_TRACKS.slice();
      }
      this.tracks = tracks.map((track, index) => this.decorate(track, index));
    }

    async fetchSiteTracks() {
      try {
        const response = await fetch('api/tracks', { cache: 'no-store' });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }

    async loadImports() {
      const records = await SMA.audioStore.all();
      if (!records.length) return;
      const existing = new Set(this.tracks.map((track) => track.id));
      records.forEach((record) => {
        if (!record.blob || existing.has(record.id)) return;
        this.tracks.push(this.decorate({
          id: record.id,
          title: this.cleanTitle(record.name || 'áudio importado'),
          category: 'custom',
          fileName: record.name || '',
          fileUrl: SMA.audioStore.url(record.id, record.blob)
        }, this.tracks.length));
      });
    }

    decorate(track, coverIndex) {
      const id = String(track.id || 'track-' + SMA.hash((track.title || '') + (track.fileUrl || '')));
      const cover = track.cover
        || (Number.isInteger(coverIndex) ? COVERS[coverIndex % COVERS.length] : this.coverFor(id));
      return {
        id: id,
        title: track.title || 'áudio sem nome',
        category: track.category || 'custom',
        fileName: track.fileName || '',
        fileUrl: track.fileUrl || '',
        type: track.type || 'pink',
        cover: cover
      };
    }

    coverFor(key) {
      return COVERS[SMA.hash(key) % COVERS.length];
    }

    cleanTitle(fileName) {
      return String(fileName)
        .replace(AUDIO_FILES, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    bind() {
      const self = this;

      if (this.searchInput) {
        this.searchInput.addEventListener('input', SMA.debounce(function () {
          self.search = self.searchInput.value.trim().toLowerCase();
          self.render();
        }, 120));
      }

      SMA.selectAll('.filter-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          SMA.selectAll('.filter-pill').forEach(function (item) {
            item.classList.remove('active');
          });
          pill.classList.add('active');
          self.filter = pill.dataset.filter || 'all';
          self.activePlaylistId = null;
          self.render();
        });
      });

      SMA.select('#btn-add-playlist')?.addEventListener('click', function () {
        self.openPlaylistModal();
      });

      SMA.select('#modal-cancel-playlist')?.addEventListener('click', function () {
        self.playlistModal.classList.remove('open');
      });

      SMA.select('#modal-save-playlist')?.addEventListener('click', function () {
        self.savePlaylist();
      });

      SMA.selectAll('.color-option').forEach(function (option) {
        option.addEventListener('click', function () {
          SMA.selectAll('.color-option').forEach(function (item) {
            item.classList.remove('selected');
          });
          option.classList.add('selected');
          self.selectedColor = option.dataset.color || '#e2ece0';
        });
      });

      SMA.select('#btn-open-folder')?.addEventListener('click', function () {
        self.import();
      });

      this.fileInput?.addEventListener('change', function (event) {
        self.importFiles(Array.from(event.target.files || []));
        event.target.value = '';
      });

      SMA.select('#btn-close-playlist')?.addEventListener('click', function () {
        self.closePlaylist();
      });

      SMA.select('#btn-play-playlist')?.addEventListener('click', function () {
        self.playActivePlaylist();
      });

      if (this.grid) {
        this.grid.addEventListener('dragover', function (event) {
          event.preventDefault();
          self.grid.classList.add('is-dragging');
        });
        this.grid.addEventListener('dragleave', function () {
          self.grid.classList.remove('is-dragging');
        });
        this.grid.addEventListener('drop', function (event) {
          event.preventDefault();
          self.grid.classList.remove('is-dragging');
          const files = Array.from(event.dataTransfer?.files || []);
          if (files.length) self.importFiles(files);
        });
      }
    }

    playlistCards() {
      const self = this;
      return this.playlists.map(function (playlist) {
        return {
          id: 'playlist-' + playlist.id,
          playlistId: playlist.id,
          title: playlist.name,
          category: 'playlists',
          isPlaylist: true,
          color: playlist.color,
          trackIds: playlist.trackIds,
          cover: self.coverFor(playlist.id),
          fileUrl: ''
        };
      });
    }

    visibleTracks() {
      if (this.activePlaylistId) {
        const playlist = this.playlists.find((item) => item.id === this.activePlaylistId);
        if (!playlist) return [];
        return playlist.trackIds
          .map((id) => this.tracks.find((track) => track.id === id))
          .filter(Boolean)
          .filter((track) => {
            if (!this.search) return true;
            return (track.title + ' ' + (CATEGORY_LABELS[track.category] || '')).toLowerCase().indexOf(this.search) !== -1;
          });
      }

      const cards = this.filter === 'playlists'
        ? this.playlistCards()
        : this.tracks.concat(this.playlistCards());

      return cards.filter((track) => {
        const matchesFilter = this.filter === 'all'
          || (this.filter === 'playlists' ? track.isPlaylist : track.category === this.filter);
        const haystack = (track.title + ' ' + (CATEGORY_LABELS[track.category] || '')).toLowerCase();
        const matchesSearch = !this.search || haystack.indexOf(this.search) !== -1;
        return matchesFilter && matchesSearch;
      });
    }

    render() {
      if (!this.grid) return;
      this.grid.textContent = '';
      const visible = this.visibleTracks();
      const playlist = this.activePlaylistId
        ? this.playlists.find((item) => item.id === this.activePlaylistId)
        : null;

      if (this.countLabel) {
        this.countLabel.textContent = visible.length + (visible.length === 1 ? ' item' : ' itens');
      }

      if (this.context) {
        this.context.hidden = !playlist;
        if (playlist) {
          this.contextName.textContent = playlist.name;
          this.contextCount.textContent = playlist.trackIds.length + (playlist.trackIds.length === 1 ? ' som' : ' sons');
        }
      }

      if (visible.length === 0) {
        this.grid.appendChild(this.emptyState(playlist
          ? 'essa playlist ainda não tem sons'
          : 'nada por aqui ainda ‧°'));
        return;
      }

      visible.forEach((track) => {
        this.grid.appendChild(this.buildCard(track, playlist));
      });

      this.markPlaying(this.player.current());
    }

    emptyState(message) {
      const box = document.createElement('div');
      box.className = 'empty-state';
      box.innerHTML = '<div class="empty-icon">☾</div><p></p><span>importe um áudio ou crie uma playlist para começar</span>';
      box.querySelector('p').textContent = message;
      return box;
    }

    buildCard(track, playlistContext) {
      const self = this;
      const card = document.createElement('article');
      card.className = 'music-card' + (track.isPlaylist ? ' is-playlist' : '');
      card.dataset.id = track.id;
      if (this.player.current() && this.player.current().id === track.id) {
        card.classList.add('is-playing');
      }

      const cover = document.createElement('div');
      cover.className = 'card-cover';
      if (track.isPlaylist) {
        cover.classList.add('playlist-cover');
        cover.style.backgroundColor = track.color;
        cover.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
      } else {
        const image = document.createElement('img');
        image.className = 'cover-img';
        image.src = track.cover;
        image.alt = '';
        image.loading = 'lazy';
        cover.appendChild(image);
      }
      card.appendChild(cover);

      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = track.title;
      title.title = track.title;
      card.appendChild(title);

      const subtitle = document.createElement('div');
      subtitle.className = 'card-sub';
      const dot = document.createElement('span');
      dot.className = 'card-dot';
      dot.style.backgroundColor = track.color || '#a1a1aa';
      const text = document.createElement('span');
      text.textContent = track.isPlaylist
        ? track.trackIds.length + (track.trackIds.length === 1 ? ' som' : ' sons')
        : 'áudio ‧ ' + (CATEGORY_LABELS[track.category] || track.category);
      subtitle.appendChild(dot);
      subtitle.appendChild(text);
      card.appendChild(subtitle);

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'play-hover-btn';
      play.setAttribute('aria-label', track.isPlaylist ? 'tocar playlist' : 'tocar áudio');
      play.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      play.addEventListener('click', function (event) {
        event.stopPropagation();
        if (track.isPlaylist) {
          self.playPlaylist(track.playlistId);
        } else {
          self.playTrack(track);
        }
      });
      card.appendChild(play);

      if (track.isPlaylist) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'card-remove';
        remove.setAttribute('aria-label', 'apagar playlist');
        remove.textContent = '×';
        remove.addEventListener('click', function (event) {
          event.stopPropagation();
          self.removePlaylist(track.playlistId);
        });
        card.appendChild(remove);
      }

      card.addEventListener('click', function () {
        if (track.isPlaylist) {
          self.openPlaylist(track.playlistId);
        } else {
          self.playTrack(track);
        }
      });

      if (playlistContext) {
        card.classList.add('in-playlist');
      }

      return card;
    }

    playableQueue(track) {
      if (this.activePlaylistId) {
        return this.visibleTracks();
      }
      const visible = this.visibleTracks().filter((item) => !item.isPlaylist);
      if (visible.some((item) => item.id === track.id)) return visible;
      return this.tracks.filter((item) => !item.isPlaylist);
    }

    playTrack(track) {
      const queue = this.playableQueue(track);
      const index = queue.findIndex((item) => item.id === track.id);
      this.player.setQueue(queue, index < 0 ? 0 : index);
    }

    playPlaylist(playlistId) {
      const playlist = this.playlists.find((item) => item.id === playlistId);
      if (!playlist) return;
      const queue = playlist.trackIds
        .map((id) => this.tracks.find((track) => track.id === id))
        .filter(Boolean);
      if (queue.length === 0) {
        SMA.toast('essa playlist ainda está vazia');
        return;
      }
      this.player.setQueue(queue, 0);
    }

    playActivePlaylist() {
      if (this.activePlaylistId) this.playPlaylist(this.activePlaylistId);
    }

    openPlaylist(playlistId) {
      const playlist = this.playlists.find((item) => item.id === playlistId);
      if (!playlist) return;
      this.activePlaylistId = playlistId;
      this.filter = 'all';
      SMA.selectAll('.filter-pill').forEach(function (pill) {
        pill.classList.toggle('active', pill.dataset.filter === 'all');
      });
      this.render();
      if (this.grid) this.grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    closePlaylist() {
      this.activePlaylistId = null;
      this.render();
    }

    markPlaying(track) {
      if (!this.grid) return;
      SMA.selectAll('.music-card', this.grid).forEach(function (card) {
        card.classList.toggle('is-playing', Boolean(track && card.dataset.id === track.id));
      });
    }

    openPlaylistModal() {
      this.playlistName.value = '';
      this.selectedColor = '#e2ece0';
      SMA.selectAll('.color-option').forEach(function (option) {
        option.classList.toggle('selected', option.dataset.color === '#e2ece0');
      });
      this.renderPlaylistPicker();
      this.playlistModal.classList.add('open');
      setTimeout(() => this.playlistName.focus(), 50);
    }

    renderPlaylistPicker() {
      if (!this.playlistTracks) return;
      this.playlistTracks.textContent = '';
      if (this.tracks.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'picker-empty';
        empty.textContent = 'importe alguns áudios antes de montar uma playlist';
        this.playlistTracks.appendChild(empty);
        this.updatePlaylistHint();
        return;
      }
      this.tracks.forEach((track) => {
        const row = document.createElement('label');
        row.className = 'picker-row';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = track.id;
        checkbox.addEventListener('change', () => this.updatePlaylistHint());
        const text = document.createElement('span');
        text.className = 'picker-title';
        text.textContent = track.title;
        const meta = document.createElement('span');
        meta.className = 'picker-meta';
        meta.textContent = CATEGORY_LABELS[track.category] || track.category;
        row.appendChild(checkbox);
        row.appendChild(text);
        row.appendChild(meta);
        this.playlistTracks.appendChild(row);
      });
      this.updatePlaylistHint();
    }

    updatePlaylistHint() {
      if (!this.playlistHint) return;
      const total = this.playlistTracks
        ? this.playlistTracks.querySelectorAll('input[type="checkbox"]:checked').length
        : 0;
      this.playlistHint.textContent = total + (total === 1 ? ' som selecionado' : ' sons selecionados');
    }

    savePlaylist() {
      const name = this.playlistName.value.trim();
      if (!name) {
        SMA.toast('dá um nome pra playlist primeiro');
        this.playlistName.focus();
        return;
      }
      const trackIds = SMA.selectAll('input[type="checkbox"]:checked', this.playlistTracks)
        .map((input) => input.value);
      if (trackIds.length === 0) {
        SMA.toast('escolha pelo menos um som');
        return;
      }
      this.playlists.push({
        id: String(Date.now()),
        name: name.slice(0, 60),
        color: this.selectedColor,
        trackIds: trackIds
      });
      this.persistPlaylists();
      this.playlistModal.classList.remove('open');
      this.filter = 'playlists';
      this.activePlaylistId = null;
      SMA.selectAll('.filter-pill').forEach(function (pill) {
        pill.classList.toggle('active', pill.dataset.filter === 'playlists');
      });
      this.render();
      SMA.toast('playlist criada ‧°');
    }

    removePlaylist(playlistId) {
      const playlist = this.playlists.find((item) => item.id === playlistId);
      if (!playlist) return;
      if (!window.confirm('apagar a playlist "' + playlist.name + '"?')) return;
      this.playlists = this.playlists.filter((item) => item.id !== playlistId);
      this.persistPlaylists();
      if (this.activePlaylistId === playlistId) this.activePlaylistId = null;
      this.render();
      SMA.toast('playlist apagada');
    }

    persistPlaylists() {
      const saved = this.playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        color: playlist.color,
        trackIds: playlist.trackIds
      }));
      SMA.writeJSON('custom_playlists', saved);
    }

    async import() {
      if (SMA.platform() === 'desktop' && window.api) {
        try {
          const tracks = await window.api.selectAudioFolder();
          if (tracks && tracks.length) {
            this.addTracks(tracks);
          }
        } catch (error) {
          SMA.toast('não consegui abrir essa pasta');
        }
        return;
      }
      this.fileInput?.click();
    }

    async importFiles(files) {
      const audioFiles = files.filter((file) => file.type.startsWith('audio/') || AUDIO_FILES.test(file.name));
      if (audioFiles.length === 0) {
        SMA.toast('nenhum áudio encontrado');
        return;
      }
      const added = [];
      for (const file of audioFiles) {
        const id = await SMA.audioStore.put(file);
        added.push(this.decorate({
          id: id || 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          title: this.cleanTitle(file.name),
          category: 'custom',
          fileName: file.name,
          fileUrl: id ? SMA.audioStore.url(id, file) : URL.createObjectURL(file)
        }));
      }
      this.addTracks(added);
      SMA.toast(added.length + (added.length === 1 ? ' áudio adicionado' : ' áudios adicionados'));
    }

    addTracks(tracks) {
      const known = new Set(this.tracks.map((track) => track.fileUrl || track.id));
      tracks.forEach((track) => {
        const decorated = this.decorate(track, this.tracks.length);
        if (known.has(decorated.fileUrl || decorated.id)) return;
        known.add(decorated.fileUrl || decorated.id);
        this.tracks.push(decorated);
      });
      this.render();
    }
  }

  SMA.Library = Library;
})();
