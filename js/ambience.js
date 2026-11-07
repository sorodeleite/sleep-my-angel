(function () {
  const SMA = window.SMA;

  function pinkChannel(length, sampleRate, random) {
    void sampleRate;
    const data = new Float32Array(length);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return data;
  }

  function brownChannel(length, sampleRate, random) {
    void sampleRate;
    const data = new Float32Array(length);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return data;
  }

  function rainChannel(length, sampleRate, random) {
    const data = new Float32Array(length);
    let low = 0;
    for (let i = 0; i < length; i += 1) {
      const white = random() * 2 - 1;
      low += 0.14 * (white - low);
      data[i] = low * 0.9;
    }
    const drops = Math.floor((length / sampleRate) * 22);
    for (let d = 0; d < drops; d += 1) {
      const start = Math.floor(random() * length);
      const frequency = 700 + random() * 2100;
      const decay = 26 + random() * 55;
      const amplitude = 0.05 + random() * 0.16;
      const duration = Math.min(length - start, Math.floor(sampleRate * 0.09));
      for (let i = 0; i < duration; i += 1) {
        const t = i / sampleRate;
        data[start + i] += Math.sin(2 * Math.PI * frequency * t) * Math.exp(-decay * t) * amplitude;
      }
    }
    return data;
  }

  function thetaChannel(length, sampleRate, random) {
    void sampleRate;
    const base = pinkChannel(length, sampleRate, random);
    const data = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const breathe = 0.72 + 0.28 * Math.sin(2 * Math.PI * 6 * t);
      data[i] = base[i] * breathe;
    }
    return data;
  }

  class Ambience {
    constructor() {
      this.context = null;
      this.master = null;
      this.source = null;
      this.voice = null;
      this.currentType = null;
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

    buildBuffer(type, seconds) {
      const sampleRate = this.context.sampleRate;
      const length = Math.floor(sampleRate * seconds);
      const buffer = this.context.createBuffer(2, length, sampleRate);
      const make = type === 'rain'
        ? rainChannel
        : type === 'brown'
          ? brownChannel
          : type === 'theta'
            ? thetaChannel
            : pinkChannel;
      buffer.getChannelData(0).set(make(length, sampleRate, Math.random));
      buffer.getChannelData(1).set(make(length, sampleRate, Math.random));
      return buffer;
    }

    start(type, volume) {
      const context = this.ensure();
      if (!context) return false;
      this.stop();
      this.currentType = type;
      const seconds = type === 'rain' ? 9 : 7;
      const buffer = this.buildBuffer(type, seconds);
      const source = context.createBufferSource();
      const voice = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      voice.gain.value = 0;
      source.connect(voice);
      voice.connect(this.master);
      this.master.gain.setTargetAtTime(Math.max(0.0001, volume * 0.55), context.currentTime, 0.12);
      voice.gain.setValueAtTime(0, context.currentTime);
      voice.gain.linearRampToValueAtTime(1, context.currentTime + 1.6);
      source.start();
      this.source = source;
      this.voice = voice;
      return true;
    }

    stop() {
      if (!this.source || !this.context) return;
      const now = this.context.currentTime;
      const source = this.source;
      const voice = this.voice;
      this.source = null;
      this.voice = null;
      this.currentType = null;
      try {
        voice.gain.cancelScheduledValues(now);
        voice.gain.setTargetAtTime(0, now, 0.08);
        source.stop(now + 0.5);
      } catch (error) {
        void error;
      }
    }

    setVolume(volume) {
      if (!this.master || !this.context) return;
      this.master.gain.setTargetAtTime(Math.max(0.0001, volume * 0.55), this.context.currentTime, 0.08);
    }

    suspend() {
      if (this.context && this.context.state === 'running') {
        this.context.suspend();
      }
    }

    resume() {
      if (this.context && this.context.state === 'suspended') {
        this.context.resume();
      }
    }
  }

  SMA.Ambience = Ambience;
})();
