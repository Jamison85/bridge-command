export class AudioEngine {
  constructor(config) {
    this.config = config;
    this.context = null;
    this.buffers = new Map();
    this.loopSources = new Map();
    this.masterGain = null;
    this.ready = false;
  }

  async init() {
    if (this.ready) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.config.masterVolume;
    this.masterGain.connect(this.context.destination);

    await Promise.allSettled(
      Object.entries(this.config.paths).map(async ([name, path]) => {
        try {
          const response = await fetch(path);

          if (!response.ok) {
            console.info(`External audio missing, using generated fallback: ${path}`);
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = await this.context.decodeAudioData(arrayBuffer);
          this.buffers.set(name, buffer);
        } catch (error) {
          console.info(`External audio unavailable, using generated fallback: ${path}`, error);
        }
      })
    );

    if (this.config.useGeneratedFallback) {
      this.installGeneratedFallbacks();
    }

    this.ready = true;
  }

  installGeneratedFallbacks() {
    Object.keys(this.config.paths).forEach((name) => {
      if (!this.buffers.has(name)) {
        this.buffers.set(name, this.createGeneratedBuffer(name));
      }
    });
  }

  createGeneratedBuffer(name) {
    const sampleRate = this.context.sampleRate;
    const durationMap = {
      bridgeAmbience: 4,
      enginePulse: 4,
      buttonConfirm: 0.18,
      panelBeep: 0.18,
      leverClunk: 0.36,
      scanPing: 0.72,
      softAlert: 2,
      warpCharge: 1.25
    };

    const duration = durationMap[name] ?? 0.3;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const sine = (frequency, time) => Math.sin(Math.PI * 2 * frequency * time);
    const noise = () => Math.random() * 2 - 1;
    const clamp = (value) => Math.max(-1, Math.min(1, value));

    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const x = t / duration;
      let sample = 0;

      if (name === "bridgeAmbience") {
        const shimmer = 0.016 * sine(620, t) + 0.01 * sine(1240, t);
        const hum = 0.09 * sine(55, t) + 0.045 * sine(110, t) + 0.02 * sine(220, t);
        sample = (hum + shimmer + noise() * 0.025) * (0.75 + 0.08 * sine(0.5, t));
      }

      if (name === "enginePulse") {
        const pulse = 0.5 + 0.5 * sine(1.5, t);
        const hum = 0.13 * sine(42, t) + 0.07 * sine(84, t) + 0.035 * sine(168, t);
        sample = (hum + noise() * 0.018) * (0.55 + 0.35 * pulse);
      }

      if (name === "buttonConfirm") {
        const env = Math.exp(-t * 13);
        sample = (0.55 * sine(740, t) + 0.35 * sine(990, t)) * env;
      }

      if (name === "panelBeep") {
        const env = Math.exp(-t * 14);
        const frequency = t < duration / 2 ? 880 : 660;
        sample = 0.7 * sine(frequency, t) * env;
      }

      if (name === "leverClunk") {
        const click = noise() * Math.exp(-t * 30) * 0.64;
        const low = 0.45 * sine(120, t) * Math.exp(-t * 7);
        const thud = 0.35 * sine(62, t) * Math.exp(-t * 10);
        sample = click + low + thud;
      }

      if (name === "scanPing") {
        const env = Math.exp(-t * 3.2);
        const frequency = 520 + 420 * x;
        sample = (0.55 * sine(frequency, t) + 0.25 * sine(frequency * 2.01, t)) * env;
      }

      if (name === "softAlert") {
        const phase = t % 1;
        const beepEnv = phase < 0.45 ? Math.exp(-phase * 9) : 0;
        sample = 0.28 * sine(440, t) * beepEnv + 0.16 * sine(660, t) * beepEnv + 0.03 * sine(90, t);
      }

      if (name === "warpCharge") {
        const frequency = 90 + 1050 * x ** 1.7;
        const attack = Math.min(1, x * 2.5);
        const release = x < 0.87 ? 1 : Math.max(0, 1 - (x - 0.87) / 0.13);
        const env = attack * release;
        sample = (0.4 * sine(frequency, t) + 0.18 * sine(frequency * 1.5, t) + noise() * 0.04) * env;
      }

      data[i] = clamp(sample * 0.85);
    }

    return buffer;
  }

  async resume() {
    if (!this.context) {
      await this.init();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  playOneShot(name, volume = 1) {
    if (!this.ready || !this.buffers.has(name)) return;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.get(name);
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  playLoop(name, volume = 0.45) {
    if (!this.ready || !this.buffers.has(name) || this.loopSources.has(name)) return;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.get(name);
    source.loop = true;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    this.loopSources.set(name, { source, gain });
  }
}
