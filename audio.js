class HypnosAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeNodes = [];
    this.currentMode = 'off';
    this.volume = 0.4;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stop() {
    this.activeNodes.forEach(node => {
      try { node.stop(); } catch (_) {}
      try { node.disconnect(); } catch (_) {}
    });
    this.activeNodes = [];
    this.currentMode = 'off';
  }

  createNoiseBuffer(type) {
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'rain') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }
    } else {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 0.25;
      }
    }
    return buffer;
  }

  play(mode) {
    if (mode === 'off') {
      this.stop();
      return;
    }
    this.init();
    this.stop();
    this.currentMode = mode;

    if (mode === 'rain' || mode === 'brown') {
      const source = this.ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(mode);
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = mode === 'rain' ? 1300 : 380;

      source.connect(filter);
      filter.connect(this.masterGain);
      source.start();
      this.activeNodes.push(source, filter);
    } else if (mode === 'warm') {
      const freqs = [174, 175.5, 261.6];
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      filter.connect(this.masterGain);

      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.value = idx === 2 ? 0.04 : 0.09;
        osc.connect(gain);
        gain.connect(filter);
        osc.start();
        this.activeNodes.push(osc, gain);
      });
      this.activeNodes.push(filter);
    }
  }

  setVolume(percent) {
    this.volume = Math.max(0, Math.min(1, Number(percent) / 100));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }
}

window.HypnosAudio = new HypnosAudioEngine();
