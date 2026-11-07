(function () {
  const SMA = window.SMA;

  class SleepTimer {
    constructor(player) {
      this.player = player;
      this.minutes = 30;
      this.remaining = 30 * 60;
      this.interval = null;
      this.running = false;
      this.done = false;
      this.display = SMA.select('#timer-display');
      this.status = SMA.select('#timer-status');
      this.button = SMA.select('#btn-toggle-timer');
    }

    init() {
      const saved = Number(SMA.readJSON('sma_timer_minutes', 30));
      if ([15, 30, 45, 60, 90, 120].indexOf(saved) !== -1) this.minutes = saved;
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
      this.button?.addEventListener('click', () => this.toggle());
      this.render('idle');
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
      this.render('running');
      clearInterval(this.interval);
      this.interval = setInterval(() => this.tick(), 1000);
    }

    pause() {
      clearInterval(this.interval);
      this.interval = null;
      this.running = false;
      this.player.setFade(1);
      this.render('paused');
    }

    reset() {
      clearInterval(this.interval);
      this.interval = null;
      this.running = false;
      this.done = false;
      this.remaining = this.minutes * 60;
      this.player.setFade(1);
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
      if (this.remaining <= 60 && this.remaining > 0) {
        this.player.setFade(this.remaining / 60);
      } else {
        this.player.setFade(1);
      }
    }

    finish() {
      clearInterval(this.interval);
      this.interval = null;
      this.running = false;
      this.done = true;
      this.remaining = 0;
      this.player.pause();
      this.player.setFade(1);
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
        this.status.textContent = 'pausado ‧ o som continua';
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
