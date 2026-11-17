/**
 * Audio Service
 * Phase 8: Features & Polish - Audio Preferences System
 * Uses Web Audio API procedural synthesis when static audio files are not bundled,
 * avoiding failed asset fetches while honoring master/music/sfx volumes & mute.
 */

import { Howl, Howler } from 'howler'

export type SoundType = 'shoot' | 'hit' | 'coin' | 'levelup' | 'gameover' | 'wave' | 'click' | 'error'

export interface AudioSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  isMuted: boolean
}

export interface AudioServiceConfig {
  soundPath?: string
  musicPath?: string
  defaultSettings?: Partial<AudioSettings>
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 70,
  musicVolume: 50,
  sfxVolume: 80,
  isMuted: false
}

const SOUND_PROFILES: Record<
  SoundType,
  { freq: number; endFreq: number; duration: number; wave: OscillatorType; gain: number }
> = {
  shoot: { freq: 680, endFreq: 220, duration: 0.08, wave: 'sawtooth', gain: 0.14 },
  hit: { freq: 180, endFreq: 70, duration: 0.1, wave: 'square', gain: 0.16 },
  coin: { freq: 880, endFreq: 1320, duration: 0.11, wave: 'sine', gain: 0.16 },
  levelup: { freq: 440, endFreq: 880, duration: 0.28, wave: 'triangle', gain: 0.2 },
  gameover: { freq: 240, endFreq: 55, duration: 0.45, wave: 'sawtooth', gain: 0.22 },
  wave: { freq: 330, endFreq: 520, duration: 0.22, wave: 'triangle', gain: 0.16 },
  click: { freq: 520, endFreq: 620, duration: 0.05, wave: 'sine', gain: 0.12 },
  error: { freq: 190, endFreq: 110, duration: 0.18, wave: 'square', gain: 0.16 }
}

/**
 * Audio Service for managing sound effects and music
 */
export class AudioService {
  private settings: AudioSettings
  private soundCache: Map<string, Howl> = new Map()
  private musicCache: Map<string, Howl> = new Map()
  private currentMusic: Howl | null = null
  private audioCtx: AudioContext | null = null
  private isInitialized: boolean = false
  private storageKey: string = 'swarm-protocol-audio-settings'

  constructor(config: AudioServiceConfig = {}) {
    void config.soundPath
    void config.musicPath
    this.settings = { ...DEFAULT_SETTINGS, ...config.defaultSettings }
    this.loadSettings()
  }

  /**
   * Initialize the audio service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    this.updateGlobalVolume()
    this.isInitialized = true
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        this.audioCtx = new Ctx()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {})
    }
    return this.audioCtx
  }

  /**
   * Play a sound effect (Howl cache if loaded, otherwise synthesized Web Audio tone)
   */
  playSound(soundType: SoundType): void {
    if (this.settings.isMuted) return

    const sfxLevel = this.getSfxVolume()
    if (sfxLevel <= 0) return

    const sound = this.soundCache.get(soundType)
    if (sound) {
      sound.volume(sfxLevel)
      sound.play()
      return
    }

    const ctx = this.getAudioContext()
    const profile = SOUND_PROFILES[soundType] || SOUND_PROFILES.click
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.type = profile.wave
      osc.frequency.setValueAtTime(profile.freq, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, profile.endFreq), now + profile.duration)

      const peak = Math.max(0.001, profile.gain * sfxLevel)
      gainNode.gain.setValueAtTime(peak, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + profile.duration)

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + profile.duration)
    } catch {
      // Ignore autoplay blocks prior to user gesture
    }
  }

  /**
   * Play music
   */
  playMusic(name: 'main' | 'gameplay' | 'boss'): void {
    if (this.settings.isMuted) return

    this.stopMusic()
    const music = this.musicCache.get(name)
    if (!music) return

    music.volume(this.getMusicVolume())
    music.play()
    this.currentMusic = music
  }

  /**
   * Stop music
   */
  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.stop()
      this.currentMusic = null
    }
  }

  /**
   * Pause music
   */
  pauseMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause()
    }
  }

  /**
   * Resume music
   */
  resumeMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.play()
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    Howler.stop()
    this.currentMusic = null
  }

  /**
   * Update audio settings
   */
  updateSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveSettings()
    this.updateGlobalVolume()

    if (this.currentMusic) {
      this.currentMusic.volume(this.getMusicVolume())
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  setMasterVolume(volume: number): void {
    this.updateSettings({ masterVolume: Math.max(0, Math.min(100, volume)) })
  }

  setMusicVolume(volume: number): void {
    this.updateSettings({ musicVolume: Math.max(0, Math.min(100, volume)) })
  }

  setSfxVolume(volume: number): void {
    this.updateSettings({ sfxVolume: Math.max(0, Math.min(100, volume)) })
  }

  toggleMute(): void {
    this.updateSettings({ isMuted: !this.settings.isMuted })
  }

  private getMasterVolume(): number {
    return this.settings.masterVolume / 100
  }

  private getMusicVolume(): number {
    return (this.settings.musicVolume / 100) * this.getMasterVolume()
  }

  private getSfxVolume(): number {
    return (this.settings.sfxVolume / 100) * this.getMasterVolume()
  }

  private updateGlobalVolume(): void {
    Howler.volume(this.getMasterVolume())
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings))
    } catch {
      // Ignore storage errors
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AudioSettings>
        this.settings = { ...this.settings, ...parsed }
      }
    } catch {
      // Ignore storage errors
    }
  }

  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
    this.updateGlobalVolume()
  }

  isReady(): boolean {
    return this.isInitialized
  }

  getSoundTypes(): SoundType[] {
    return Object.keys(SOUND_PROFILES) as SoundType[]
  }

  getMusicTypes(): ('main' | 'gameplay' | 'boss')[] {
    return ['main', 'gameplay', 'boss']
  }

  destroy(): void {
    this.stopAll()
    this.soundCache.clear()
    this.musicCache.clear()
    this.currentMusic = null
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    this.isInitialized = false
  }
}

let audioServiceInstance: AudioService | null = null

export const getAudioService = (config?: AudioServiceConfig): AudioService => {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioService(config)
  }
  return audioServiceInstance
}

export const initializeAudio = async (config?: AudioServiceConfig): Promise<AudioService> => {
  const service = getAudioService(config)
  await service.initialize()
  return service
}

export const playSound = (soundType: SoundType): void => {
  const service = getAudioService()
  if (service.isReady()) {
    service.playSound(soundType)
  }
}

export const playMusic = (name: 'main' | 'gameplay' | 'boss'): void => {
  const service = getAudioService()
  if (service.isReady()) {
    service.playMusic(name)
  }
}

export const stopMusic = (): void => {
  const service = getAudioService()
  service.stopMusic()
}

export default AudioService
