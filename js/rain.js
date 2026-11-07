(function () {
  const SMA = window.SMA;

  const PRESETS = {
    soft: { lowpass: 1400, highpass: 160, gain: 0.5, sway: 0.1 },
    window: { lowpass: 2100, highpass: 220, gain: 0.62, sway: 0.16 },
    storm: { lowpass: 3000, highpass: 90, gain: 0.82, sway: 0.24 }
  };

  function fillRain(buffer, context) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    let lowLeft = 0;
    let lowRight = 0;
    for (let index = 0; index < left.length; index += 1) {
      const whiteLeft = Math.random() * 2 - 1;
      const whiteRight = Math.random() * 2 - 1;
      lowLeft += 0.03 * (whiteLeft - lowLeft);
      lowRight += 0.03 * (whiteRight - lowRight);
      left[index] = whiteLeft * 0.42 + lowLeft * 0.85;
      right[index] = whiteRight * 0.42 + lowRight * 0.85;
    }
    const drops = Math.floor((buffer.length / context.sampleRate) * 28);
    for (let drop = 0; drop < drops; drop += 1) {
      const channel = Math.random() > 0.5 ? left : right;
      const start = Math.floor(Math.random() * channel.length);
      const frequency = 900 + Math.random() * 2600;
      const decay = 30 + Math.random() * 70;
      const amplitude = 0.04 + Math.random() * 0.12;
      const length = Math.min(channel.length - start, Math.floor(context.sampleRate * 0.08));
      for (let index = 0; index < length; index += 1) {
        const time = index / context.sampleRate;
        channel[start + index] += Math.sin(2 * Math.PI * frequency * time) * Math.exp(-decay * time) * amplitude;
      }
    }
  }

  class Rain {
    constructor() {
      this.context = null;
      this.master = null;
      this.source = null;
      this.filter = null;
      this.preset = 'soft';
      this.level = 0.7;
    }

    get active() {
      return Boolean(this.source);
    }

    ensure() {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      if (!this.context) {
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') {
        this.context.resume();
      }
      return this.context;
    }

    buildBuffer() {
      const seconds = 8;
      const sampleRate = this.context.sampleRate;
      const length = Math.floor(sampleRate * seconds);
      const buffer = this.context.createBuffer(2, length, sampleRate);
      fillRain(buffer, this.context);
      return buffer;
    }

    start(preset, level) {
      const context = this.ensure();
      if (!context) return false;
      const settings = PRESETS[preset] || PRESETS.soft;
      this.preset = PRESETS[preset] ? preset : 'soft';
      this.level = SMA.clamp(typeof level === 'number' ? level : this.level, 0, 1);
      this.stop(0.3);
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const highpass = context.createBiquadFilter();
      source.buffer = this.buildBuffer();
      source.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = settings.lowpass;
      filter.Q.value = 0.6;
      highpass.type = 'highpass';
      highpass.frequency.value = settings.highpass;
      source.connect(filter);
      filter.connect(highpass);
      highpass.connect(this.master);
      this.master.gain.cancelScheduledValues(context.currentTime);
      this.master.gain.setValueAtTime(0.0001, context.currentTime);
      this.master.gain.linearRampToValueAtTime(Math.max(0.0001, this.level * settings.gain), context.currentTime + 1.4);
      source.start();
      this.source = source;
      this.filter = filter;
      return true;
    }

    stop(fade) {
      if (!this.source || !this.context) return;
      const now = this.context.currentTime;
      const source = this.source;
      const delay = typeof fade === 'number' ? fade : 1;
      this.source = null;
      this.filter = null;
      try {
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(0, now, Math.max(0.05, delay / 3));
        source.stop(now + delay + 0.4);
      } catch (error) {
        this.master.gain.value = 0;
      }
    }

    setVolume(level) {
      if (!this.context || !this.master || !this.source) return;
      this.level = SMA.clamp(typeof level === 'number' ? level : 0, 0, 1);
      const settings = PRESETS[this.preset] || PRESETS.soft;
      this.master.gain.setTargetAtTime(Math.max(0.0001, this.level * settings.gain), this.context.currentTime, 0.12);
    }

    setPreset(preset) {
      this.preset = PRESETS[preset] ? preset : 'soft';
    }
  }

  SMA.Rain = Rain;
})();
