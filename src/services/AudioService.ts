export type SoundCue = 'key' | 'delete' | 'submit' | 'correct' | 'present' | 'absent' | 'win' | 'loss' | 'record' | 'click'

export class AudioService {
  private context: AudioContext | null = null
  private musicTimer = 0
  private sfx = true
  private musicIndex = 0

  public setMusic(enabled: boolean): void {
    window.clearInterval(this.musicTimer)
    if (enabled) {
      this.musicIndex = 0
      this.playMusicNote()
      this.musicTimer = window.setInterval(() => this.playMusicNote(), 720)
    }
  }

  public setSfx(enabled: boolean): void {
    this.sfx = enabled
  }

  public play(cue: SoundCue): void {
    if (!this.sfx) return
    const notes: Record<SoundCue, [number, number, OscillatorType]> = {
      key: [510, 0.045, 'square'], delete: [280, 0.05, 'square'], submit: [420, 0.09, 'triangle'],
      correct: [720, 0.14, 'sine'], present: [520, 0.11, 'triangle'], absent: [220, 0.08, 'square'],
      win: [880, 0.32, 'sine'], loss: [180, 0.28, 'triangle'], record: [1040, 0.38, 'sine'], click: [360, 0.05, 'square'],
    }
    this.playTone(...notes[cue])
  }

  public dispose(): void {
    window.clearInterval(this.musicTimer)
    void this.context?.close()
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume = 0.035): void {
    try {
      const context = this.context ?? new AudioContext()
      this.context = context
      if (context.state === 'suspended') void context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + duration + 0.02)
    } catch {
      // Audio remains an optional enhancement when Web Audio is unavailable.
    }
  }

  private playMusicNote(): void {
    const notes = [261.6, 329.6, 392, 329.6, 293.7, 349.2, 440, 349.2]
    this.playTone(notes[this.musicIndex++ % notes.length], 0.48, 'sine', 0.012)
  }
}
