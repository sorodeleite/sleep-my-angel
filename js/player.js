(function () {
  const SMA = window.SMA;

  class Player {
    constructor() {
      this.audio = document.getElementById('audio-player');
      this.ambience = new SMA.Ambience();
      this.queue = [];
      this.index = -1;
      this.shuffle = false;
      this.loop = false;
      this.playing = false;
      this.isSynth = false;
      this.fade = 1;
      this.synthElapsed = 0;
      this.synthStartedAt = 0;
      this.synthTicker = null;
      this.userVolume = SMA.readJSON('sma_volume', 0.8);
      if (typeof this.userVolume !== 'number' || !Number.isFinite(this.userVolume)) {
        this.userVolume = 0.8;
      }
      this.userVolume = SMA.clamp(this.userVolume, 0, 1);
      this.audio.volume = this.userVolume;
      this.bindAudio();
      this.bindMediaSession();
    }

    emit(name, detail) {
      document.dispatchEvent(new CustomEvent(name, { detail: detail }));
    }

    current() {
      return this.queue[this.index] || null;
    }

    effectiveVolume() {
      return SMA.clamp(this.userVolume * this.fade, 0, 1);
    }

    bindAudio() {
      this.audio.addEventListener('timeupdate', () => {
        if (this.isSynth) return;
        this.emit('player:time', {
          currentTime: this.audio.currentTime,
          duration: this.audio.duration,
          synth: false
        });
      });

      this.audio.addEventListener('loadedmetadata', () => {
        if (this.isSynth) return;
        this.emit('player:time', {
          currentTime: this.audio.currentTime,
          duration: this.audio.duration,
          synth: false
        });
        this.updatePositionState();
      });

      this.audio.addEventListener('play', () => {
        if (this.isSynth) return;
        this.playing = true;
        this.emit('player:state', { playing: true });
        this.syncNative();
        this.updateMediaState();
      });

      this.audio.addEventListener('pause', () => {
        if (this.isSynth) return;
        this.playing = false;
        this.emit('player:state', { playing: false });
        this.syncNative();
        this.updateMediaState();
      });

      this.audio.addEventListener('ended', () => {
        if (this.loop) {
          this.audio.currentTime = 0;
          this.audio.play().catch(() => {});
          return;
        }
        this.next(true);
      });

      this.audio.addEventListener('error', () => {
        if (!this.current() || this.isSynth) return;
        this.handlePlaybackFailure();
      });
    }

    bindMediaSession() {
      if (!('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        navigator.mediaSession.setActionHandler('stop', () => this.pause());
      } catch (error) {}
    }

    updateMediaMetadata() {
      if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
      const track = this.current();
      if (!track) return;
      const cover = track.cover || '';
      const canUseArtwork = /^https?:$/.test(location.protocol)
        || cover.indexOf('data:') === 0
        || cover.indexOf('blob:') === 0;
      const artwork = canUseArtwork && cover
        ? [{ src: cover, sizes: '512x512' }]
        : [];
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.isPlaylist
            ? 'sleep my angel ‧ playlist'
            : (track.artist || 'sleep my angel ‧ ' + track.category),
          album: 'sleep my angel',
          artwork: artwork
        });
      } catch (error) {}
    }

    updateMediaState() {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused';
    }

    updatePositionState() {
      if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
      const duration = this.audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: this.audio.playbackRate || 1,
          position: Math.min(this.audio.currentTime, duration)
        });
      } catch (error) {}
    }

    syncNative() {
      if (!SMA.keepAlive) return;
      const track = this.current();
      SMA.keepAlive.set('player', this.playing, track ? track.title : 'sleep my angel');
    }

    fallbackType(track) {
      if (track.type && track.type !== 'rain') return track.type;
      if (/theta/i.test(track.title || '')) return 'theta';
      if (/brown|marrom/i.test(track.title || '')) return 'brown';
      return track.category === 'meditacao' ? 'theta' : 'pink';
    }

    handlePlaybackFailure() {
      if (this.isSynth) return;
      const track = this.current();
      if (!track) return;
      if (track.fileUrl && track.category !== 'custom' && !this.isSynth) {
        track.failedUrl = track.fileUrl;
        if (this.startFallback(track)) return;
      }
      const code = this.audio.error ? this.audio.error.code : 0;
      const message = code === 4 ? 'não consegui abrir esse áudio' : 'o áudio parou de responder';
      this.playing = false;
      this.emit('player:error', { message: message });
      this.emit('player:state', { playing: false });
    }

    startFallback(track) {
      const started = this.ambience.start(this.fallbackType(track), this.effectiveVolume());
      if (!started) return false;
      this.isSynth = true;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio.volume = 0;
      this.synthElapsed = 0;
      this.synthStartedAt = Date.now();
      this.playing = true;
      this.emit('player:state', { playing: true });
      this.emit('player:time', { currentTime: 0, duration: 0, synth: true });
      this.emit('player:fallback', { title: track.title, type: this.fallbackType(track) });
      this.startSynthTicker();
      this.syncNative();
      this.updateMediaState();
      return true;
    }

    setQueue(tracks, startIndex) {
      this.queue = Array.isArray(tracks) ? tracks.slice() : [];
      this.index = -1;
      this.emit('player:queue', { length: this.queue.length });
      if (this.queue.length > 0) {
        const index = typeof startIndex === 'number' ? startIndex : 0;
        this.playTrack(index);
      }
    }

    playTrack(index) {
      if (index < 0 || index >= this.queue.length) return;
      const track = this.queue[index];
      this.audio.pause();
      this.stopSynthTicker();
      this.ambience.stop();
      const failed = Boolean(track.failedUrl && track.failedUrl === track.fileUrl);
      this.isSynth = Boolean(track.synth) || !track.fileUrl || failed;
      this.index = index;
      this.emit('player:track', { track: track, index: index });
      this.updateMediaMetadata();

      if (this.isSynth) {
        this.audio.volume = 0;
        this.synthElapsed = 0;
        this.synthStartedAt = Date.now();
        const started = this.ambience.start(this.fallbackType(track), this.effectiveVolume());
        if (!started) {
          this.emit('player:error', { message: 'seu navegador não suporta os sons gerados' });
          return;
        }
        this.playing = true;
        this.emit('player:state', { playing: true });
        this.emit('player:time', { currentTime: 0, duration: 0, synth: true });
        this.startSynthTicker();
        this.syncNative();
        this.updateMediaState();
        return;
      }

      this.audio.volume = this.effectiveVolume();
      this.audio.loop = this.loop;
      this.audio.src = track.fileUrl;
      this.audio.play().catch(() => {
        this.handlePlaybackFailure();
      });
    }

    play() {
      if (this.index < 0) {
        if (this.queue.length > 0) this.playTrack(0);
        return;
      }
      const track = this.current();
      if (!track) return;

      if (this.isSynth) {
        if (!this.ambience.active) {
          const started = this.ambience.start(this.fallbackType(track), this.effectiveVolume());
          if (!started) return;
        } else {
          this.ambience.resume();
        }
        this.synthStartedAt = Date.now();
        this.playing = true;
        this.emit('player:state', { playing: true });
        this.emit('player:time', {
          currentTime: this.synthElapsed,
          duration: 0,
          synth: true
        });
        this.startSynthTicker();
        this.syncNative();
        this.updateMediaState();
        return;
      }

      if (!this.audio.src) {
        this.playTrack(this.index);
        return;
      }
      this.audio.play().catch(() => {
        this.handlePlaybackFailure();
      });
    }

    pause() {
      if (this.isSynth) {
        if (this.playing) {
          this.synthElapsed += (Date.now() - this.synthStartedAt) / 1000;
        }
        this.stopSynthTicker();
        this.ambience.suspend();
        this.playing = false;
        this.emit('player:state', { playing: false });
        this.syncNative();
        this.updateMediaState();
        return;
      }
      this.audio.pause();
    }

    toggle() {
      if (this.playing) {
        this.pause();
      } else {
        this.play();
      }
    }

    next(fromEnd) {
      if (this.queue.length === 0) return;
      if (this.shuffle && this.queue.length > 1) {
        let next = this.index;
        while (next === this.index) {
          next = Math.floor(Math.random() * this.queue.length);
        }
        this.playTrack(next);
        return;
      }
      if (this.queue.length === 1 && fromEnd) {
        this.playTrack(0);
        return;
      }
      const next = this.index + 1 >= this.queue.length ? 0 : this.index + 1;
      this.playTrack(next);
    }

    prev() {
      if (this.queue.length === 0) return;
      if (!this.isSynth && this.audio.currentTime > 3) {
        this.audio.currentTime = 0;
        return;
      }
      const prev = this.index - 1 < 0 ? this.queue.length - 1 : this.index - 1;
      this.playTrack(prev);
    }

    seek(ratio) {
      if (this.isSynth) return;
      if (!Number.isFinite(this.audio.duration) || this.audio.duration <= 0) return;
      this.audio.currentTime = SMA.clamp(ratio, 0, 1) * this.audio.duration;
      this.emit('player:time', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration,
        synth: false
      });
      this.updatePositionState();
    }

    setVolume(value) {
      this.userVolume = SMA.clamp(value, 0, 1);
      this.audio.volume = this.effectiveVolume();
      this.ambience.setVolume(this.effectiveVolume());
      SMA.writeJSON('sma_volume', this.userVolume);
      this.emit('player:volume', { volume: this.userVolume, fade: this.fade });
    }

    setFade(value) {
      this.fade = SMA.clamp(value, 0, 1);
      this.audio.volume = this.effectiveVolume();
      this.ambience.setVolume(this.effectiveVolume());
      this.emit('player:volume', { volume: this.userVolume, fade: this.fade });
    }

    setShuffle(value) {
      this.shuffle = Boolean(value);
      this.emit('player:mode', { shuffle: this.shuffle, loop: this.loop });
    }

    setLoop(value) {
      this.loop = Boolean(value);
      this.audio.loop = this.loop;
      this.emit('player:mode', { shuffle: this.shuffle, loop: this.loop });
    }

    startSynthTicker() {
      this.stopSynthTicker();
      this.synthTicker = setInterval(() => {
        if (!this.playing || !this.isSynth) return;
        const elapsed = this.synthElapsed + (Date.now() - this.synthStartedAt) / 1000;
        this.emit('player:time', {
          currentTime: elapsed,
          duration: 0,
          synth: true
        });
      }, 1000);
    }

    stopSynthTicker() {
      if (this.synthTicker) {
        clearInterval(this.synthTicker);
        this.synthTicker = null;
      }
    }
  }

  SMA.Player = Player;
})();
