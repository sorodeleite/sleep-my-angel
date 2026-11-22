(function () {
  const SMA = window.SMA;

  const PRESETS = {
    soft: { lowpass: 1050, highpass: 90, gain: 0.42, drops: 12, texture: 0.28 },
    window: { lowpass: 2600, highpass: 260, gain: 0.48, drops: 54, texture: 0.18 },
    storm: { lowpass: 4200, highpass: 55, gain: 0.78, drops: 34, texture: 0.58 },
    thunder: { lowpass: 4200, highpass: 55, gain: 0.76, drops: 34, texture: 0.58, thunder: true }
  };

  function fillRain(buffer, settings, context) {
    const sampleRate = context.sampleRate;
    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      let brown = 0;
      let pink = 0;
      for (let index = 0; index < channel.length; index += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.018 * white) / 1.018;
        pink = 0.985 * pink + 0.015 * white;
        channel[index] = white * settings.texture + pink * 0.34 + brown * 3.1;
      }

      const seconds = buffer.length / sampleRate;
      const drops = Math.floor(seconds * settings.drops);
      for (let drop = 0; drop < drops; drop += 1) {
        const start = Math.floor(Math.random() * (channel.length - 1));
        const frequency = 650 + Math.random() * (settings.drops > 40 ? 4200 : 2200);
        const decay = 38 + Math.random() * 90;
        const amplitude = 0.025 + Math.random() * (settings.drops > 40 ? 0.16 : 0.09);
        const length = Math.min(channel.length - start, Math.floor(sampleRate * 0.12));
        for (let index = 0; index < length; index += 1) {
          const time = index / sampleRate;
          const envelope = Math.exp(-decay * time);
          channel[start + index] += Math.sin(2 * Math.PI * frequency * time) * envelope * amplitude;
        }
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
      this.thunderTimer = null;
      this.thunderSources = new Set();
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
      if (this.context.state === 'suspended') this.context.resume();
      return this.context;
    }

    buildBuffer(settings) {
      const seconds = 12;
      const sampleRate = this.context.sampleRate;
      const buffer = this.context.createBuffer(2, Math.floor(sampleRate * seconds), sampleRate);
      fillRain(buffer, settings, this.context);
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
      const lowpass = context.createBiquadFilter();
      const highpass = context.createBiquadFilter();
      const texture = context.createGain();
      source.buffer = this.buildBuffer(settings);
      source.loop = true;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = settings.lowpass;
      lowpass.Q.value = 0.45;
      highpass.type = 'highpass';
      highpass.frequency.value = settings.highpass;
      texture.gain.value = 1;
      source.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(texture);
      texture.connect(this.master);

      this.master.gain.cancelScheduledValues(context.currentTime);
      this.master.gain.setValueAtTime(0.0001, context.currentTime);
      this.master.gain.linearRampToValueAtTime(Math.max(0.0001, this.level * settings.gain), context.currentTime + 2);
      source.start();
      this.source = source;
      this.filter = lowpass;
      if (settings.thunder) this.scheduleThunder();
      return true;
    }

    scheduleThunder() {
      clearTimeout(this.thunderTimer);
      this.thunderTimer = setTimeout(() => {
        if (!this.active || this.preset !== 'thunder') return;
        this.playThunder();
        this.scheduleThunder();
      }, 14000 + Math.random() * 18000);
    }

    playThunder() {
      const context = this.context;
      if (!context || !this.active) return;
      const duration = 5.5;
      const length = Math.floor(context.sampleRate * duration);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      let low = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        low = low * 0.992 + white * 0.008;
        data[i] = white * 0.22 + low * 7;
      }

      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.value = 190;
      filter.Q.value = 0.7;
      const now = context.currentTime;
      const volume = this.level * 0.58;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.18);
      gain.gain.setTargetAtTime(volume * 0.52, now + 0.2, 0.8);
      gain.gain.setTargetAtTime(0.0001, now + 2.1, 1.1);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(now);
      source.stop(now + duration);
      this.thunderSources.add(source);
      source.onended = () => this.thunderSources.delete(source);
    }

    stop(fade) {
      clearTimeout(this.thunderTimer);
      this.thunderTimer = null;
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
      this.thunderSources.forEach((item) => {
        try { item.stop(now + Math.max(0.1, delay)); } catch (error) {}
      });
      this.thunderSources.clear();
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
