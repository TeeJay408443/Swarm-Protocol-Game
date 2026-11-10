/**
 * Audio Service
 * Phase 8: Features & Polish - Audio Preferences System
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

const SOUND_FILES: Record<SoundType, string> = {
  shoot: 'shoot.mp3',
  hit: 'hit.mp3',
  coin: 'coin.mp3',
  levelup: 'levelup.mp3',
  gameover: 'gameover.mp3',
  wave: 'wave.mp3',
  click: 'click.mp3',
  error: 'error.mp3'
}

const MUSIC_FILES = {
  main: 'main-theme.mp3',
  gameplay: 'gameplay.mp3',
  boss: 'boss.mp3'
}

/**
 * Audio Service for managing sound effects and music
 */
export class AudioService {
  private settings: AudioSettings
  private soundCache: Map<string, Howl> = new Map()
  private musicCache: Map<string, Howl> = new Map()
  private currentMusic: Howl | null = null
  private soundPath: string
  private musicPath: string
  private isInitialized: boolean = false
  private storageKey: string = 'swarm-protocol-audio-settings'

  constructor(config: AudioServiceConfig = {}) {
    this.soundPath = config.soundPath || '/sounds/'
    this.musicPath = config.musicPath || '/music/'
    this.settings = { ...DEFAULT_SETTINGS, ...config.defaultSettings }
    this.loadSettings()
  }

  /**
   * Initialize the audio service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Preload all sound effects
    await this.preloadSounds()
    
    // Set global volume
    this.updateGlobalVolume()
    
    this.isInitialized = true
  }

  /**
   * Preload all sound effects
   */
  private async preloadSounds(): Promise<void> {
    const preloadPromises: Promise<void>[] = []
    
    for (const [soundType, filename] of Object.entries(SOUND_FILES)) {
      preloadPromises.push(this.preloadSound(soundType as SoundType))
    }
    
    // Preload music files
    for (const filename of Object.values(MUSIC_FILES)) {
      preloadPromises.push(this.preloadMusic(filename))
    }
    
    await Promise.all(preloadPromises)
  }

  /**
   * Preload a single sound effect
   */
  private async preloadSound(soundType: SoundType): Promise<void> {
    const filename = SOUND_FILES[soundType]
    const url = `${this.soundPath}${filename}`
    
    const sound = new Howl({
      src: [url],
      preload: true,
      volume: this.getSfxVolume()
    })
    
    this.soundCache.set(soundType, sound)
  }

  /**
   * Preload a music file
   */
  private async preloadMusic(filename: string): Promise<void> {
    const url = `${this.musicPath}${filename}`
    
    const music = new Howl({
      src: [url],
      preload: true,
      loop: true,
      volume: this.getMusicVolume()
    })
    
    const name = filename.replace('.mp3', '')
    this.musicCache.set(name, music)
  }

  /**
   * Play a sound effect
   */
  playSound(soundType: SoundType): void {
    if (this.settings.isMuted) return
    
    const sound = this.soundCache.get(soundType)
    if (!sound) {
      console.warn(`Sound not loaded: ${soundType}`)
      return
    }
    
    sound.volume(this.getSfxVolume())
    sound.play()
  }

  /**
   * Play music
   */
  playMusic(name: 'main' | 'gameplay' | 'boss'): void {
    if (this.settings.isMuted) return
    
    // Stop current music
    this.stopMusic()
    
    const music = this.musicCache.get(name)
    if (!music) {
      console.warn(`Music not loaded: ${name}`)
      return
    }
    
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
    
    // Update current music volume
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

  /**
   * Set master volume (0-100)
   */
  setMasterVolume(volume: number): void {
    this.updateSettings({ masterVolume: Math.max(0, Math.min(100, volume)) })
  }

  /**
   * Set music volume (0-100)
   */
  setMusicVolume(volume: number): void {
    this.updateSettings({ musicVolume: Math.max(0, Math.min(100, volume)) })
  }

  /**
   * Set SFX volume (0-100)
   */
  setSfxVolume(volume: number): void {
    this.updateSettings({ sfxVolume: Math.max(0, Math.min(100, volume)) })
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.updateSettings({ isMuted: !this.settings.isMuted })
  }

  /**
   * Get master volume (0-1)
   */
  private getMasterVolume(): number {
    return this.settings.masterVolume / 100
  }

  /**
   * Get music volume (0-1)
   */
  private getMusicVolume(): number {
    return (this.settings.musicVolume / 100) * this.getMasterVolume()
  }

  /**
   * Get SFX volume (0-1)
   */
  private getSfxVolume(): number {
    return (this.settings.sfxVolume / 100) * this.getMasterVolume()
  }

  /**
   * Update global volume for all sounds
   */
  private updateGlobalVolume(): void {
    Howler.volume(this.getMasterVolume())
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Could not save audio settings:', error)
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AudioSettings>
        this.settings = { ...this.settings, ...parsed }
      }
    } catch (error) {
      console.warn('Could not load audio settings:', error)
    }
  }

  /**
   * Reset to default settings
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
    this.updateGlobalVolume()
  }

  /**
   * Check if audio service is initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Get all available sound types
   */
  getSoundTypes(): SoundType[] {
    return Object.keys(SOUND_FILES) as SoundType[]
  }

  /**
   * Get all available music types
   */
  getMusicTypes(): ('main' | 'gameplay' | 'boss')[] {
    return Object.keys(MUSIC_FILES) as ('main' | 'gameplay' | 'boss')[]
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAll()
    this.soundCache.clear()
    this.musicCache.clear()
    this.currentMusic = null
    this.isInitialized = false
  }
}

// Singleton instance
let audioServiceInstance: AudioService | null = null

/**
 * Get or create the audio service singleton
 */
export const getAudioService = (config?: AudioServiceConfig): AudioService => {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioService(config)
  }
  return audioServiceInstance
}

/**
 * Initialize audio service
 */
export const initializeAudio = async (config?: AudioServiceConfig): Promise<AudioService> => {
  const service = getAudioService(config)
  await service.initialize()
  return service
}

/**
 * Play sound effect (convenience function)
 */
export const playSound = (soundType: SoundType): void => {
  const service = getAudioService()
  if (service.isReady()) {
    service.playSound(soundType)
  }
}

/**
 * Play music (convenience function)
 */
export const playMusic = (name: 'main' | 'gameplay' | 'boss'): void => {
  const service = getAudioService()
  if (service.isReady()) {
    service.playMusic(name)
  }
}

/**
 * Stop music (convenience function)
 */
export const stopMusic = (): void => {
  const service = getAudioService()
  service.stopMusic()
}

export default AudioService
