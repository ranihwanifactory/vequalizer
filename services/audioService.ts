export class AudioController {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  
  // Filters
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;

  private audioElement: HTMLAudioElement | null = null;
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    // Lazy initialization handled in setup methods
  }

  initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setOnEnded(callback: () => void) {
    this.onEndedCallback = callback;
    if (this.audioElement) {
      this.audioElement.onended = this.onEndedCallback;
    }
  }

  async setupMicrophone(): Promise<void> {
    this.initContext();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Stop previous source if exists
    this.disconnect();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(stream);
    
    this.createGraph();
  }

  async setupFile(file: File): Promise<void> {
    this.initContext();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.disconnect();

    // Create an audio element for playback control
    const url = URL.createObjectURL(file);
    this.audioElement = new Audio(url);
    // this.audioElement.loop = true; // Loop removed for playlist support
    
    if (this.onEndedCallback) {
      this.audioElement.onended = this.onEndedCallback;
    }
    
    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.createGraph();
    
    try {
      await this.audioElement.play();
    } catch (e) {
      console.warn("Autoplay policy prevented automatic playback", e);
    }
  }

  private createGraph() {
    if (!this.audioContext || !this.source) return;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048; // High resolution
    this.analyser.smoothingTimeConstant = 0.85;

    this.gainNode = this.audioContext.createGain();

    // Equalizer filters
    this.bassFilter = this.audioContext.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 250; 

    this.midFilter = this.audioContext.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1;

    this.trebleFilter = this.audioContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 4000;

    // Chain: Source -> Bass -> Mid -> Treble -> Gain -> Analyser -> Destination
    this.source.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    
    // Only connect to destination (speakers) if it's NOT a microphone stream
    // to avoid feedback loops.
    if (this.source instanceof MediaElementAudioSourceNode) {
      this.analyser.connect(this.audioContext.destination);
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  setVolume(value: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = value;
    }
    if (this.audioElement) {
      this.audioElement.volume = value;
    }
  }

  setFilters(bass: number, mid: number, treble: number) {
    if (this.bassFilter) this.bassFilter.gain.value = bass;
    if (this.midFilter) this.midFilter.gain.value = mid;
    if (this.trebleFilter) this.trebleFilter.gain.value = treble;
  }

  play() {
    this.audioContext?.resume();
    this.audioElement?.play();
  }

  pause() {
    this.audioElement?.pause();
  }

  disconnect() {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    // Note: We don't close AudioContext to reuse it, but we can suspend
  }
}

export const audioController = new AudioController();
