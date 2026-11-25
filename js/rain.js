(function () {
  const SMA = window.SMA;
  const TAU = Math.PI * 2;

  const PRESETS = {
    soft: {
      lowpass: 2400,
      highpass: 120,
      gain: 0.55,
      texture: 0.14,
      body: 0.62,
      low: 1.15,
      gust: 0.14,
      drops: 24,
      dropAmp: [0.015, 0.07],
      dropDecay: [55, 130],
      thunder: false
    },
    window: {
      lowpass: 5600,
      highpass: 280,
      gain: 0.6,
      texture: 0.24,
      body: 0.5,
      low: 0.75,
      gust: 0.1,
      drops: 78,
      dropAmp: [0.012, 0.075],
      dropDecay: [45, 115],
      thunder: false
    },
    storm: {
      lowpass: 8800,
      highpass: 55,
      gain: 0.95,
      texture: 0.32,
      body: 0.62,
      low: 1.7,
      gust: 0.2,
      drops: 62,
      dropAmp: [0.018, 0.11],
      dropDecay: [40, 100],
      thunder: false
    },
    thunder: {
      lowpass: 8800,
      highpass: 55,
      gain: 0.92,
      texture: 0.34,
      body: 0.64,
      low: 1.75,
      gust: 0.22,
      drops: 70,
      dropAmp: [0.018, 0.11],
      dropDecay: [40, 100],
      thunder: true
    }
  };

  function makePink() {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    return function (white) {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const out = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      return out;
    };
  }

  function paintBed(channel, settings, sampleRate, phaseA, phaseB) {
    const pink = makePink();
    let brown = 0;
    const block = 128;
    for (let start = 0; start < channel.length; start += block) {
      const time = start / sampleRate;
      const gust = 1 + settings.gust * (
        0.62 * Math.sin(TAU * 0.055 * time + phaseA) +
        0.38 * Math.sin(TAU * 0.17 * time + phaseB)
      );
      const end = Math.min(channel.length, start + block);
      for (let index = start; index < end; index += 1) {
        const white = Math.random() * 2 - 1;
        const pinkValue = pink(white);
        brown = (brown + 0.014 * white) / 1.014;
        channel[index] = (white * settings.texture + pinkValue * settings.body + brown * settings.low) * gust;
      }
    }
  }

  function paintDrops(left, right, settings, sampleRate) {
    const total = Math.floor((left.length / sampleRate) * settings.drops);
    for (let drop = 0; drop < total; drop += 1) {
      const start = Math.floor(Math.random() * Math.max(1, left.length - 2));
      const maxLength = Math.min(
        Math.floor(sampleRate * (0.03 + Math.random() * 0.07)),
        left.length - start
      );
      if (maxLength < 8) continue;
      const decay = settings.dropDecay[0] + Math.random() * (settings.dropDecay[1] - settings.dropDecay[0]);
      const amplitude = settings.dropAmp[0] + Math.random() * (settings.dropAmp[1] - settings.dropAmp[0]);
      const pan = Math.random() * 2 - 1;
      const leftGain = Math.sqrt((1 - pan) / 2);
      const rightGain = Math.sqrt((1 + pan) / 2);
      let previous = 0;
      for (let index = 0; index < maxLength; index += 1) {
        const time = index / sampleRate;
        const envelope = Math.exp(-decay * time) * (1 - Math.exp(-time * 2200));
        const white = Math.random() * 2 - 1;
        const high = (white - previous) * 0.5;
        previous = white;
        const value = (high * 0.8 + white * 0.2) * envelope * amplitude;
        left[start + index] += value * leftGain;
        right[start + index] += value * rightGain;
      }
    }
  }

  function fillRain(buffer, settings, context) {
    const sampleRate = context.sampleRate;
    const length = buffer.length;
    const fadeLength = Math.min(length - 1, Math.floor(sampleRate * 0.6));
    const renderLength = length + fadeLength;
    const left = new Float32Array(renderLength);
    const right = new Float32Array(renderLength);

    paintBed(left, settings, sampleRate, Math.random() * TAU, Math.random() * TAU);
    paintBed(right, settings, sampleRate, Math.random() * TAU + 1.7, Math.random() * TAU + 2.9);
    paintDrops(left, right, settings, sampleRate);

    // crossfades the end of the buffer into the beginning, so the loop has no seam
    for (let index = 0; index < fadeLength; index += 1) {
      const angle = (index / fadeLength) * (Math.PI / 2);
      const rise = Math.sin(angle);
      const fall = Math.cos(angle);
      left[index] = left[index] * rise + left[length + index] * fall;
      right[index] = right[index] * rise + right[length + index] * fall;
    }

    let peak = 0;
    for (let index = 0; index < length; index += 1) {
      peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
    }
    const scale = peak > 0.9 ? 0.9 / peak : 1;
    const outLeft = buffer.getChannelData(0);
    const outRight = buffer.getChannelData(1);
    for (let index = 0; index < length; index += 1) {
      outLeft[index] = left[index] * scale;
      outRight[index] = right[index] * scale;
    }
  }

  function fillThunder(buffer, context) {
    const sampleRate = context.sampleRate;
    const length = buffer.length;
    const seconds = length / sampleRate;
    const close = Math.random() < 0.55;
    const events = [];
    const count = 3 + Math.floor(Math.random() * 3) + (close ? 1 : 0);
    for (let index = 0; index < count; index += 1) {
      events.push({
        start: 0.03 + Math.random() * (close ? 1.2 : 2.6),
        decay: 0.45 + Math.random() * 2.2,
        amp: 0.34 + Math.random() * 0.4,
        pan: Math.random() * 2 - 1
      });
    }
    if (close) {
      events[0].start = 0.02 + Math.random() * 0.05;
      events[0].amp = 0.7;
      events[0].decay = 0.9 + Math.random() * 0.8;
      events[0].pan = Math.random() * 0.6 - 0.3;
    } else {
      events[0].start = 0.05 + Math.random() * 0.2;
    }
    const crackAmp = close ? 0.6 + Math.random() * 0.2 : 0;
    const crackStart = Math.floor(events[0].start * sampleRate);
    const crackDecay = Math.exp(-1 / (0.16 * sampleRate));
    const ripDecay = Math.exp(-1 / (0.5 * sampleRate));
    const crackAttack = Math.max(1, Math.floor(0.004 * sampleRate));

    for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
      const data = buffer.getChannelData(channelIndex);
      const prepared = events.map(function (event) {
        return {
          start: Math.floor(event.start * sampleRate),
          attack: Math.max(1, Math.floor((close ? 0.012 : 0.05) * sampleRate)),
          decay: Math.exp(-1 / (event.decay * sampleRate)),
          lowDecay: Math.exp(-1 / (event.decay * 1.7 * sampleRate)),
          amp: event.amp,
          pan: channelIndex === 0 ? Math.sqrt((1 - event.pan) / 2) : Math.sqrt((1 + event.pan) / 2),
          env: 0,
          lowEnv: 0
        };
      });
      const firstPan = prepared.length ? prepared[0].pan : 1;
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let lp1 = 0;
      let lp2 = 0;
      let lowMid = 0;
      let mid = 0;
      let crackEnv = 0;
      let ripEnv = 0;
      const alpha = 1 - Math.exp(-TAU * (close ? 150 : 85) / sampleRate);
      const bodyAlpha = 1 - Math.exp(-TAU * 260 / sampleRate);
      const midAlpha = 1 - Math.exp(-TAU * 1400 / sampleRate);
      const phase = Math.random() * TAU;

      for (let index = 0; index < length; index += 1) {
        const time = index / sampleRate;
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        const brown = (b0 + b1 + b2) * 0.11;
        lp1 += alpha * (white - lp1);
        lp2 += alpha * (lp1 - lp2);
        lowMid += bodyAlpha * (white - lowMid);
        mid += midAlpha * (white - mid);
        const midBand = mid - lowMid;
        const highBand = white - mid;

        let env = 0;
        let lowEnv = 0;
        for (let eventIndex = 0; eventIndex < prepared.length; eventIndex += 1) {
          const event = prepared[eventIndex];
          if (index < event.start) continue;
          const distance = index - event.start;
          if (distance === 0) {
            event.env = 1;
            event.lowEnv = 1;
          } else {
            event.env *= event.decay;
            event.lowEnv *= event.lowDecay;
          }
          const attack = Math.min(1, distance / event.attack);
          env += event.amp * attack * event.env * event.pan;
          lowEnv += event.amp * attack * event.lowEnv * event.pan;
        }

        const head = Math.min(1, time / 0.012);
        const tail = Math.min(1, (seconds - time) / 0.6);
        const fade = Math.max(0, Math.min(head, tail));
        const rumble = (brown * 1.25 + lp2 * 2.6 + midBand * 1.15) * lowEnv;
        const tear = highBand * env * 0.12;
        let crack = 0;
        if (crackAmp > 0) {
          const distance = index - crackStart;
          if (distance >= 0) {
            if (distance === 0) {
              crackEnv = 1;
              ripEnv = 1;
            } else {
              crackEnv *= crackDecay;
              ripEnv *= ripDecay;
            }
            if (crackEnv > 0.0005) {
              const attack = Math.min(1, distance / crackAttack);
              const thump = Math.sin(TAU * 48 * time + phase) * 0.35;
              crack = Math.tanh(
                (white * 0.45 + highBand * 1.0 + midBand * 0.55 + (b0 + b1) * 0.5 + thump) *
                crackEnv * attack * crackAmp
              );
              crack += highBand * ripEnv * attack * crackAmp * 0.22;
            }
          }
        }
        data[index] = (rumble + tear + crack * firstPan) * fade;
      }
    }

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    let mean = 0;
    for (let index = 0; index < length; index += 1) {
      mean += left[index] + right[index];
    }
    mean /= length * 2;

    let peak = 0;
    for (let index = 0; index < length; index += 1) {
      left[index] -= mean;
      right[index] -= mean;
      peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
    }
    const scale = peak > 0.95 ? 0.95 / peak : 1;
    if (scale !== 1) {
      for (let index = 0; index < length; index += 1) {
        left[index] *= scale;
        right[index] *= scale;
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
      const seconds = 14;
      const sampleRate = this.context.sampleRate;
      const buffer = this.context.createBuffer(2, Math.floor(sampleRate * seconds), sampleRate);
      fillRain(buffer, settings, this.context);
      return buffer;
    }

    buildThunder() {
      const seconds = 7.5;
      const sampleRate = this.context.sampleRate;
      const buffer = this.context.createBuffer(2, Math.floor(sampleRate * seconds), sampleRate);
      fillThunder(buffer, this.context);
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
      highpass.Q.value = 0.7;
      texture.gain.value = 1;
      source.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(texture);
      texture.connect(this.master);

      this.master.gain.cancelScheduledValues(context.currentTime);
      this.master.gain.setValueAtTime(0.0001, context.currentTime);
      this.master.gain.linearRampToValueAtTime(
        Math.max(0.0001, this.level * settings.gain),
        context.currentTime + 2
      );
      source.start();
      this.source = source;
      this.filter = lowpass;
      if (settings.thunder) this.scheduleThunder(true);
      return true;
    }

    scheduleThunder(first) {
      clearTimeout(this.thunderTimer);
      const delay = first
        ? 6000 + Math.random() * 8000
        : 10000 + Math.random() * 14000;
      this.thunderTimer = setTimeout(() => {
        this.thunderTimer = null;
        if (!this.active || this.preset !== 'thunder') return;
        this.playThunder();
        this.scheduleThunder(false);
      }, delay);
    }

    playThunder() {
      const context = this.context;
      if (!context || !this.active) return;
      const buffer = this.buildThunder();
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = 0.62 + Math.random() * 0.16;
      source.connect(gain);
      gain.connect(this.master);
      const now = context.currentTime;
      source.start(now);
      source.stop(now + buffer.duration);
      this.thunderSources.add(source);
      source.onended = () => this.thunderSources.delete(source);
    }

    stop(fade) {
      clearTimeout(this.thunderTimer);
      this.thunderTimer = null;
      const now = this.context ? this.context.currentTime : 0;
      this.thunderSources.forEach((item) => {
        try { item.stop(now + Math.max(0.1, fade || 1)); } catch (error) {}
      });
      this.thunderSources.clear();
      if (!this.source || !this.context) return;
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
      this.level = SMA.clamp(typeof level === 'number' ? level : 0, 0, 1);
      if (!this.context || !this.master || !this.source) return;
      const settings = PRESETS[this.preset] || PRESETS.soft;
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(
        Math.max(0.0001, this.level * settings.gain),
        now,
        0.12
      );
    }

    setPreset(preset) {
      this.preset = PRESETS[preset] ? preset : 'soft';
    }
  }

  SMA.Rain = Rain;
})();
