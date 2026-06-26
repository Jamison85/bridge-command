const AUDIO_DEFAULTS = {
  masterVolume: 0.32,
  humVolume: 0.12,
  clickVolume: 0.18,
  leverVolume: 0.08,
  warpVolume: 0.26
};

/**
 * Placeholder sci-fi audio built entirely with the Web Audio API.
 * This keeps the first milestone asset-free while leaving clear swap points
 * for real sound files later.
 */
export function createAudioController(options = {}) {
  const config = { ...AUDIO_DEFAULTS, ...options };

  let context = null;
  let masterGain = null;
  let humGain = null;
  let humOscillator = null;
  let humModulator = null;
  let humModulationGain = null;
  let throttleTone = null;
  let throttleToneGain = null;
  let isUnlocked = false;
  let humStarted = false;
  let lastLeverTick = 0;

  function ensureContext() {
    if (context) return context;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("Web Audio API is not supported in this browser.");
      return null;
    }

    context = new AudioContextClass();

    masterGain = context.createGain();
    masterGain.gain.value = config.masterVolume;
    masterGain.connect(context.destination);

    humGain = context.createGain();
    humGain.gain.value = 0;
    humGain.connect(masterGain);

    throttleToneGain = context.createGain();
    throttleToneGain.gain.value = 0;
    throttleToneGain.connect(masterGain);

    return context;
  }

  async function unlock() {
    const ctx = ensureContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (!humStarted) {
      startHum();
    }

    isUnlocked = true;
    return true;
  }

  function startHum() {
    const ctx = ensureContext();
    if (!ctx || humStarted) return;

    const humFilter = ctx.createBiquadFilter();
    humFilter.type = "lowpass";
    humFilter.frequency.value = 340;
    humFilter.Q.value = 0.9;
    humFilter.connect(humGain);

    humOscillator = ctx.createOscillator();
    humOscillator.type = "sawtooth";
    humOscillator.frequency.value = 54;
    humOscillator.connect(humFilter);

    humModulator = ctx.createOscillator();
    humModulator.type = "sine";
    humModulator.frequency.value = 0.16;

    humModulationGain = ctx.createGain();
    humModulationGain.gain.value = 0.018;
    humModulator.connect(humModulationGain);
    humModulationGain.connect(humGain.gain);

    throttleTone = ctx.createOscillator();
    throttleTone.type = "triangle";
    throttleTone.frequency.value = 110;
    throttleTone.connect(throttleToneGain);

    humOscillator.start();
    humModulator.start();
    throttleTone.start();

    smoothGain(humGain.gain, config.humVolume, 1.2);
    humStarted = true;
  }

  function setThrottle(value) {
    if (!context || !humStarted) return;

    const throttle = clamp01(value);
    const now = context.currentTime;

    smoothGain(humGain.gain, config.humVolume + throttle * 0.08, 0.18);
    smoothGain(throttleToneGain.gain, throttle * config.leverVolume, 0.12);
    throttleTone.frequency.setTargetAtTime(110 + throttle * 260, now, 0.08);

    const tickAllowed = performance.now() - lastLeverTick > 90;

    if (tickAllowed && throttle > 0.04) {
      playLeverTick(throttle);
      lastLeverTick = performance.now();
    }
  }

  function playClick(intensity = 1) {
    const ctx = ensureContext();
    if (!ctx || !isUnlocked) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "square";
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    filter.type = "bandpass";
    filter.frequency.value = 700;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(config.clickVolume * intensity, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  function playLeverTick(throttle) {
    const ctx = ensureContext();
    if (!ctx || !isUnlocked) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(120 + throttle * 180, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(config.leverVolume * 0.7, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  function playWarp() {
    const ctx = ensureContext();
    if (!ctx || !isUnlocked) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(88, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.72);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(5200, now + 0.72);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(config.warpVolume, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 1.05);
  }

  function smoothGain(audioParam, value, timeConstant) {
    if (!context) return;
    audioParam.setTargetAtTime(value, context.currentTime, timeConstant);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  return {
    unlock,
    setThrottle,
    playClick,
    playWarp
  };
}
