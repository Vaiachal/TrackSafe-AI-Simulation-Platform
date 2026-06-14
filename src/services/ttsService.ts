class NarrationEngine {
  private synth: SpeechSynthesis;
  private isMuted: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.synth.getVoices();
    }
  }

  private getBestVoice(): SpeechSynthesisVoice | null {
    const voices = this.synth.getVoices();
    if (voices.length === 0) return null;
    return voices.find(v => 
      v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('English')
    ) || voices[0];
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  speak(text: string): void {
    if (this.isMuted) return;

    // Cancel any ongoing speech to avoid overlapping
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const preferredVoice = this.getBestVoice();
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.pitch = 1.0;
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.volume = 1.0;

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  getSpeakingStatus(): boolean {
    return this.synth.speaking;
  }

  stop(): void {
    this.synth.cancel();
  }
}

export const ttsService = new NarrationEngine();
