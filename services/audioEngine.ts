
import { SoundParams } from "../types";

/**
 * 音響エンジン - 坂本龍一⇔小室哲哉スタイルクロスフェード対応
 * 
 * Bus A: 坂本龍一スタイル（アンビエント/ピアノ）
 * Bus B: 小室哲哉スタイル（トランス/シンセ）
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private rhythmInterval: number | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private currentParams: SoundParams | null = null;
  private backgroundNoise: AudioBufferSourceNode | null = null;

  // デュアルバスシステム
  private sakamotoBusGain: GainNode | null = null;  // 坂本バス
  private komuroBusGain: GainNode | null = null;    // 小室バス
  private currentStyleRatio: number = 0.3;          // 0.0=坂本, 1.0=小室
  private targetStyleRatio: number = 0.3;
  private currentBpm: number = 70;
  private targetBpm: number = 70;

  // トランスゲート用LFO
  private gateLfoNode: OscillatorNode | null = null;
  private gateGainNode: GainNode | null = null;

  private isInitialized = false;

  async init(): Promise<boolean> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
        console.log('AudioContext resumed');
      }
      return true;
    }

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
        console.log('AudioContext created and resumed');
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.2;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // デュアルバスの初期化
      this.sakamotoBusGain = this.ctx.createGain();
      this.sakamotoBusGain.gain.value = 0.7;

      this.komuroBusGain = this.ctx.createGain();
      this.komuroBusGain.gain.value = 0.3;

      // トランスゲート用ノード
      this.gateGainNode = this.ctx.createGain();
      this.gateGainNode.gain.value = 1.0;

      // Deep ASMR Reverb（坂本スタイル用の深いリバーブ）
      this.reverbNode = this.ctx.createConvolver();
      const length = this.ctx.sampleRate * 8;
      const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
      for (let i = 0; i < 2; i++) {
        const channelData = impulse.getChannelData(i);
        for (let j = 0; j < length; j++) {
          channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2.5);
        }
      }
      this.reverbNode.buffer = impulse;

      // ルーティング
      this.sakamotoBusGain.connect(this.reverbNode);
      this.reverbNode.connect(this.masterGain);

      this.komuroBusGain.connect(this.gateGainNode);
      this.gateGainNode.connect(this.masterGain);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.setupTextureNoise();
      this.setupTransGate();
      this.isInitialized = true;
      console.log('🎵 AudioEngine initialized with dual-bus system (Sakamoto ⇔ Komuro)');
      return true;
    } catch (e) {
      console.error("Audio initialization failed:", e);
      return false;
    }
  }

  private setupTransGate() {
    if (!this.ctx || !this.gateGainNode) return;

    this.gateLfoNode = this.ctx.createOscillator();
    this.gateLfoNode.type = 'square';
    this.gateLfoNode.frequency.value = 4;

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0;

    this.gateLfoNode.connect(lfoGain);
    lfoGain.connect(this.gateGainNode.gain);
    this.gateLfoNode.start();
  }

  private setupTextureNoise() {
    if (!this.ctx || !this.sakamotoBusGain) return;
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.03;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sakamotoBusGain);
    source.start();
    this.backgroundNoise = source;
  }

  async update(params: SoundParams) {
    if (!this.isInitialized || !this.ctx) {
      const success = await this.init();
      if (!success) {
        console.warn('AudioEngine failed to initialize');
        return;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    }

    if (!this.ctx || !params) return;
    this.currentParams = params;
    this.stopRhythm();

    this.targetStyleRatio = params.styleRatio ?? 0.3;
    this.targetBpm = params.bpm ?? (70 + params.rhythmSpeed * 70);

    this.startParameterLerp();

    const intervalTime = (60 / this.currentBpm) * 250;
    let noteIndex = 0;
    let lastPadTime = 0;

    const tick = () => {
      if (!this.ctx || !this.masterGain || this.ctx.state === 'closed') return;
      const p = this.currentParams;
      if (!p) return;

      const now = this.ctx.currentTime;
      const scale = p.musicalScale?.length ? p.musicalScale : [p.baseFrequency || 220];
      const ratio = this.currentStyleRatio;

      // 坂本スタイル
      if (ratio < 0.7 && Math.random() > 0.3) {
        const idx = Math.random() > 0.7
          ? Math.floor(Math.random() * scale.length)
          : noteIndex % scale.length;
        const freq = scale[idx];
        noteIndex++;

        this.playSakamotoNote(freq, now, p);

        if (Math.random() > 0.75) {
          const harmonic = freq * (Math.random() > 0.5 ? 1.5 : 1.25);
          this.playSakamotoNote(harmonic, now + 0.05, p, true);
        }
      }

      // 小室スタイル
      if (ratio > 0.3) {
        const komuroIntensity = (ratio - 0.3) / 0.7;

        if (Math.random() < komuroIntensity * 0.8) {
          const idx = noteIndex % scale.length;
          const freq = scale[idx];
          noteIndex++;

          this.playKomuroSuperSaw(freq, now, p);

          if (Math.random() > 0.5) {
            const arpFreqs = [freq, freq * 1.25, freq * 1.5, freq * 2];
            arpFreqs.forEach((f, i) => {
              this.playKomuroSuperSaw(f, now + i * 0.1, p, true);
            });
          }
        }

        if (ratio > 0.7 && noteIndex % 4 === 0) {
          this.playKick(now);
        }
      }

      // パッド
      if (now - lastPadTime > 6 && Math.random() > 0.85) {
        lastPadTime = now;
        const randomIdx = Math.floor(Math.random() * scale.length);
        this.playPadNote(scale[randomIdx], now, p);
      }
    };

    this.rhythmInterval = window.setInterval(tick, intervalTime);
    tick();

    console.log(`🎵 Music updated: styleRatio=${this.targetStyleRatio.toFixed(2)}, BPM=${this.targetBpm}`);
  }

  private startParameterLerp() {
    const lerpStep = () => {
      const ratioDiff = this.targetStyleRatio - this.currentStyleRatio;
      if (Math.abs(ratioDiff) > 0.01) {
        this.currentStyleRatio += ratioDiff * 0.05;
        this.updateBusGains();
      }

      const bpmDiff = this.targetBpm - this.currentBpm;
      if (Math.abs(bpmDiff) > 0.5) {
        this.currentBpm += bpmDiff * 0.02;
      }

      if (this.rhythmInterval) {
        requestAnimationFrame(lerpStep);
      }
    };
    requestAnimationFrame(lerpStep);
  }

  private updateBusGains() {
    if (!this.ctx || !this.sakamotoBusGain || !this.komuroBusGain) return;
    const now = this.ctx.currentTime;

    this.sakamotoBusGain.gain.setTargetAtTime(1 - this.currentStyleRatio, now, 0.1);
    this.komuroBusGain.gain.setTargetAtTime(this.currentStyleRatio, now, 0.1);
  }

  // 坂本龍一スタイル：フェルトピアノ的な柔らかい音
  private playSakamotoNote(freq: number, startTime: number, params: SoundParams, isTexture = false) {
    if (!this.ctx || !this.sakamotoBusGain) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 1.002, startTime);

    filter.type = 'lowpass';
    const baseCutoff = params.filterFrequency || 800;
    filter.frequency.setValueAtTime(baseCutoff, startTime);
    filter.Q.setValueAtTime(isTexture ? 8 : 1.5, startTime);
    filter.frequency.exponentialRampToValueAtTime(100, startTime + (params.release || 8));

    const attack = isTexture ? 0.02 : 0.01;
    const decay = 0.3;
    const sustain = isTexture ? 0.02 : 0.05;
    const release = params.release || 10.0;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(isTexture ? 0.03 : 0.08, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(sustain, startTime + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay + release);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sakamotoBusGain);

    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + attack + decay + release + 0.1);
    osc2.stop(startTime + attack + decay + release + 0.1);
  }

  // 小室哲哉スタイル：SuperSaw（デチューンされた鋸波の積層）
  private playKomuroSuperSaw(freq: number, startTime: number, params: SoundParams, isArp = false) {
    if (!this.ctx || !this.komuroBusGain) return;

    const oscillators: OscillatorNode[] = [];
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const detuneAmounts = [-30, -20, -10, 0, 10, 20, 30];
    const oscGain = this.ctx.createGain();
    oscGain.gain.value = 0.15;

    detuneAmounts.forEach(detune => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.detune.setValueAtTime(detune, startTime);
      osc.connect(oscGain);
      oscillators.push(osc);
    });

    oscGain.connect(filter);

    filter.type = 'lowpass';
    const baseCutoff = params.filterFrequency || 2000;
    filter.frequency.setValueAtTime(baseCutoff, startTime);
    filter.Q.setValueAtTime(2, startTime);

    const attack = isArp ? 0.01 : 0.02;
    const decay = 0.1;
    const sustain = isArp ? 0.1 : 0.3;
    const release = isArp ? 0.3 : 1.5;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(isArp ? 0.15 : 0.25, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(sustain, startTime + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay + release);

    filter.connect(gain);
    gain.connect(this.komuroBusGain);

    oscillators.forEach(osc => {
      osc.start(startTime);
      osc.stop(startTime + attack + decay + release + 0.1);
    });
  }

  // キック（4つ打ち用）
  private playKick(startTime: number) {
    if (!this.ctx || !this.komuroBusGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);

    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

    osc.connect(gain);
    gain.connect(this.komuroBusGain);

    osc.start(startTime);
    osc.stop(startTime + 0.35);
  }

  // パッド/ドローン音
  private playPadNote(freq: number, startTime: number, params: SoundParams) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    osc3.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 1.005, startTime);
    osc3.frequency.setValueAtTime(freq * 2, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, startTime);
    filter.Q.setValueAtTime(2, startTime);
    filter.frequency.linearRampToValueAtTime(400, startTime + 5);

    const attack = 2.0;
    const release = 8.0;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.04, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + release);

    osc.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);

    if (this.currentStyleRatio < 0.5 && this.sakamotoBusGain) {
      gain.connect(this.sakamotoBusGain);
    } else if (this.komuroBusGain) {
      gain.connect(this.komuroBusGain);
    } else {
      gain.connect(this.masterGain);
    }

    osc.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);
    osc.stop(startTime + attack + release + 0.1);
    osc2.stop(startTime + attack + release + 0.1);
    osc3.stop(startTime + attack + release + 0.1);
  }

  getAnalyserData() {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return null;
  }

  getStyleRatio(): number {
    return this.currentStyleRatio;
  }

  getBpm(): number {
    return this.currentBpm;
  }

  stopRhythm() {
    if (this.rhythmInterval) {
      clearInterval(this.rhythmInterval);
      this.rhythmInterval = null;
    }
  }
}

export const audioEngine = new AudioEngine();
