(function () {
  const SMA = window.SMA;

  const RAIN_LABELS = {
    off: 'sem chuva',
    soft: 'chuva suave',
    window: 'chuva na janela',
    storm: 'chuva forte'
  };

  class SleepTimer {
    constructor(player) {
      this.player = player;
      this.minutes = 30;
      this.remaining = 30 * 60;
      this.interval = null;
      this.running = false;
      this.done = false;
      this.rain = new SMA.Rain();
      this.rainPreset = 'off';
      this.rainVolume = 0.7;
      this.display = SMA.select('#timer-display');
      this.status = SMA.select('#timer-status');
      this.button = SMA.select('#btn-toggle-timer');
      this.rainLabel = SMA.select('#timer-rain-label');
    }

    init() {
      const saved = Number(SMA.readJSON('sma_timer_minutes', 30));
      if ([15, 30, 45, 60, 90, 120].indexOf(saved) !== -1) this.minutes = saved;
      const savedRain = SMA.readText('sma_timer_rain', 'off');
      if (RAIN_LABELS[savedRain]) this.rainPreset = savedRain;
      this.remaining = this.minutes * 60;
      SMA.selectAll('.preset-btn').forEach((button) => {
        button.classList.toggle('active', Number(button.dataset.minutes) === this.minutes);
        button.addEventListener('click', () => {
          this.minutes = Number(button.dataset.minutes) || 30;
          SMA.writeJSON('sma_timer_minutes', this.minutes);
          SMA.selectAll('.preset-btn').forEach((item) => {
            item.classList.toggle('active', item === button);
          });
          this.reset();
        });
      });
      SMA.selectAll('.rain-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.rain === this.rainPreset);
        button.addEventListener('click', () => {
          this.rainPreset = RAIN_LABELS[button.dataset.rain] ? button.dataset.rain : 'off';
          SMA.writeText('sma_timer_rain', this.rainPreset);
          SMA.selectAll('.rain-btn').forEach((item) => {
            item.classList.toggle('active', item === button);
          });
          this.paintRainLabel();
          if (this.running) this.startRain();
        });
      });
      this.button?.addEventListener('click', () => this.toggle());
      this.paintRainLabel();
      this.render('idle');
    }

    paintRainLabel() {
      if (!this.rainLabel) return;
      const label = RAIN_LABELS[this.rainPreset] || RAIN_LABELS.off;
      this.rainLabel.textContent = this.rainPreset === 'off'
        ? 'escolha uma chuva pra tocar em loop'
        : label + ' em loop até o fim do timer';
    }

    toggle() {
      if (this.running) {
        this.pause();
      } else {
        this.start();
      }
    }

    start() {
      if (this.done || this.remaining <= 0) {
        this.remaining = this.minutes * 60;
      }
      if (this.remaining <= 0) return;
      this.done = false;
      this.running = true;
      this.applyFade();
      this.startRain();
      this.render('running');
      clearInterval(this.interval);
      this.interval = setInterval(() => this.tick(), 1000);
    }

    startRain() {
      if (this.rainPreset === 'off') {
        this.rain.stop(0.6);
        this.setKeepAlive(false);
        return;
      }
      this.rain.setPreset(this.rainPreset);
      this.rain.start(this.rainPreset, this.rainVolume);
      this.setKeepAlive(true);
    }

    setKeepAlive(active) {
      if (!SMA.keepAlive) return;
      SMA.keepAlive.set('rain', active, 'chuva ‧ sleep timer');
    }

    pause() {
      clearInterval(this.interval);
      this.interval = null;
      this.running = false;
      this.player.setFade(1);
      this.rain.stop(1.2);
      this.setKeepAlive(false);
      this.render('paused');
    }

    reset() {
      clearInterval(this.interval);
      this.interval = null;
      this.running = false;
      this.done = false;
      this.remaining = this.minutes * 60;
      this.player.setFade(1);
      this.rain.stop(0.8);
      this.setKeepAlive(false);
      this.render('idle');
    }

    tick() {
      this.remaining -= 1;
      this.applyFade();
      if (this.remaining <= 0) {
        this.finish();
        return;
      }
      this.render('running');
    }

    applyFade() {
      const fade = this.remaining <= 60 && this.remaining > 0 ? this.remaining / 60 : 1;
      this.player.setFade(fade);
      if (this.rain.active) this.rain.setVolume(this.rainVolume * fade);
    }

    finish() {
      clearInterval(this.interval);
      this.interval = null;
      this.running = false;
      this.done = true;
      this.remaining = 0;
      this.player.pause();
      this.player.setFade(1);
      this.rain.stop(5);
      this.setKeepAlive(false);
      this.render('done');
    }

    render(state) {
      if (this.display) {
        const minutes = Math.floor(this.remaining / 60);
        const seconds = this.remaining % 60;
        this.display.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
      }
      if (!this.status || !this.button) return;
      if (state === 'running') {
        this.status.textContent = 'contando... bom sono ‧°';
        this.button.textContent = 'Pausar';
      } else if (state === 'paused') {
        this.status.textContent = 'pausado ‧ retome quando quiser';
        this.button.textContent = 'Continuar';
      } else if (state === 'done') {
        this.status.textContent = 'som desligado com sucesso 🌙';
        this.button.textContent = 'Reiniciar';
      } else {
        this.status.textContent = 'timer para desligar o som suavemente';
        this.button.textContent = 'Iniciar Contador';
      }
    }
  }

  SMA.SleepTimer = SleepTimer;
})();
