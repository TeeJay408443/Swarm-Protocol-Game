/**
 * Audio Service
 * Phase 8: Features & Polish - Audio Preferences System
 * Uses Web Audio API procedural synthesis for both SFX and multi-voice soundtrack loops
 * (including the Calamity-inspired "Universal Collapse" boss theme),
 * avoiding failed asset fetches while honoring master/music/sfx volumes & mute.
 */

import { Howl, Howler } from 'howler'

export type SoundType = 'shoot' | 'hit' | 'coin' | 'levelup' | 'gameover' | 'wave' | 'click' | 'error'
export type MusicTrackName = 'main' | 'gameplay' | 'boss' | 'universal_collapse' | 'astral_scourge'

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

export const DEVOURER_YOUTUBE_URL =
  'https://www.youtube.com/watch?v=EaB1utQkmT8&list=RDEaB1utQkmT8&start_radio=1'
export const DEVOURER_YOUTUBE_VIDEO_ID = 'EaB1utQkmT8'
export const DEVOURER_BEAT_DROP_SECONDS = 11.6
export const ASTRAL_SCOURGE_YOUTUBE_URL =
  'https://www.youtube.com/watch?v=W70Q1R-inLc&list=PLsuCmTriuYXdOYZVaKyex5lIy3lT9K_PW&index=18'
export const ASTRAL_SCOURGE_YOUTUBE_VIDEO_ID = 'W70Q1R-inLc'

export function parseYouTubeVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim()
  if (!trimmed) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const candidate = parsed.pathname.split('/').filter(Boolean)[0]
      return candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const vParam = parsed.searchParams.get('v')
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam
      const segments = parsed.pathname.split('/').filter(Boolean)
      if (
        (segments[0] === 'embed' || segments[0] === 'shorts') &&
        segments[1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(segments[1])
      ) {
        return segments[1]
      }
    }
  } catch {
    return null
  }
  return null
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  options: { autoplay?: boolean; loop?: boolean; origin?: string; enableJsApi?: boolean } = {}
): string {
  const cleanId = parseYouTubeVideoId(videoId) || DEVOURER_YOUTUBE_VIDEO_ID
  const params = new URLSearchParams()
  params.set('autoplay', options.autoplay === false ? '0' : '1')
  if (options.enableJsApi !== false) {
    params.set('enablejsapi', '1')
  }
  if (options.loop !== false) {
    params.set('loop', '1')
    params.set('playlist', cleanId)
  }
  params.set('playsinline', '1')
  params.set('rel', '0')
  params.set('modestbranding', '1')
  params.set('iv_load_policy', '3')
  if (options.origin) {
    params.set('origin', options.origin)
  }
  return `https://www.youtube.com/embed/${cleanId}?${params.toString()}`
}

export interface MusicTrackMetadata {
  id: MusicTrackName
  title: string
  bpm?: number
  stepCount?: number
  youtubeVideoId?: string
  youtubeUrl?: string
  beatDropSeconds?: number
}

export const MUSIC_TRACK_METADATA: Record<MusicTrackName, MusicTrackMetadata> = {
  main: {
    id: 'main',
    title: 'Protocol Standby',
    bpm: 110,
    stepCount: 64
  },
  gameplay: {
    id: 'gameplay',
    title: 'Neon Swarm',
    bpm: 128,
    stepCount: 64
  },
  boss: {
    id: 'boss',
    title: 'Overlord Engagement',
    bpm: 138,
    stepCount: 64
  },
  astral_scourge: {
    id: 'astral_scourge',
    title: 'Astral Scourge',
    youtubeVideoId: ASTRAL_SCOURGE_YOUTUBE_VIDEO_ID,
    youtubeUrl: ASTRAL_SCOURGE_YOUTUBE_URL
  },
  universal_collapse: {
    id: 'universal_collapse',
    title: 'Universal Collapse',
    bpm: 148,
    stepCount: 128,
    youtubeVideoId: DEVOURER_YOUTUBE_VIDEO_ID,
    youtubeUrl: DEVOURER_YOUTUBE_URL,
    beatDropSeconds: DEVOURER_BEAT_DROP_SECONDS
  }
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

const midiToHz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12)

// MIDI note constants for standard arena procedural themes
const NOTE = {
  E2: 40,
  Fs2: 42,
  G2: 43,
  A2: 45,
  B2: 47,
  C3: 48,
  D3: 50,
  E3: 52,
  G3: 55,
  A3: 57,
  B3: 59,
  C4: 60
} as const

/**
 * Audio Service for managing sound effects and music
 */
export class AudioService {
  private settings: AudioSettings
  private soundCache: Map<string, Howl> = new Map()
  private musicCache: Map<string, Howl> = new Map()
  private currentMusic: Howl | null = null
  private currentMusicName: MusicTrackName | null = null
  private isMusicPaused: boolean = false
  private externalYouTubeActive: boolean = false
  private audioCtx: AudioContext | null = null
  private musicGainNode: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private schedulerTimer: ReturnType<typeof setInterval> | null = null
  private nextStepTime: number = 0
  private currentStep: number = 0
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
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        this.audioCtx = new Ctx()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {})
    }
    if (this.audioCtx && !this.musicGainNode) {
      this.musicGainNode = this.audioCtx.createGain()
      this.musicGainNode.gain.setValueAtTime(
        this.settings.isMuted ? 0 : this.getMusicVolume(),
        this.audioCtx.currentTime
      )
      this.musicGainNode.connect(this.audioCtx.destination)
    }
    return this.audioCtx
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer | null {
    if (this.noiseBuffer) return this.noiseBuffer
    try {
      const length = Math.floor(ctx.sampleRate * 0.25)
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1
      }
      this.noiseBuffer = buffer
      return buffer
    } catch {
      return null
    }
  }

  private syncMusicGainNode(): void {
    if (!this.audioCtx || !this.musicGainNode) return
    const suppressProcedural =
      this.externalYouTubeActive &&
      Boolean(this.currentMusicName && MUSIC_TRACK_METADATA[this.currentMusicName]?.youtubeVideoId)
    const targetGain = this.settings.isMuted || suppressProcedural ? 0 : this.getMusicVolume()
    try {
      this.musicGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.03)
    } catch {
      this.musicGainNode.gain.value = targetGain
    }
  }

  setExternalYouTubeActive(active: boolean): void {
    this.externalYouTubeActive = active
    this.syncMusicGainNode()
  }

  isExternalYouTubeActive(): boolean {
    return this.externalYouTubeActive
  }

  getEffectiveMusicVolumePercent(): number {
    if (this.settings.isMuted) return 0
    return Math.max(0, Math.min(100, Math.round(this.getMusicVolume() * 100)))
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
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, profile.endFreq),
        now + profile.duration
      )

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
   * Play music track (YouTube stream for YouTube-backed boss themes, otherwise Howl/Web Audio synth)
   */
  playMusic(name: MusicTrackName): void {
    this.stopMusic()
    this.currentMusicName = name
    this.isMusicPaused = false

    if (MUSIC_TRACK_METADATA[name]?.youtubeVideoId) {
      // YouTube-backed boss themes play strictly via the hidden player.
      this.externalYouTubeActive = true
      this.syncMusicGainNode()
      return
    }

    const music = this.musicCache.get(name)
    if (music) {
      if (!this.settings.isMuted) {
        music.volume(this.getMusicVolume())
        music.play()
      }
      this.currentMusic = music
      return
    }

    this.startProceduralMusic(name)
  }

  private startProceduralMusic(name: MusicTrackName): void {
    if (MUSIC_TRACK_METADATA[name]?.youtubeVideoId) return
    const ctx = this.getAudioContext()
    if (!ctx || !this.musicGainNode) return

    this.syncMusicGainNode()
    const meta = MUSIC_TRACK_METADATA[name]
    const stepDuration = 60 / (meta.bpm ?? 120) / 4 // 16th-note grid
    const stepCount = meta.stepCount ?? 64
    this.currentStep = 0
    this.nextStepTime = ctx.currentTime + 0.04

    const scheduleAheadTime = 0.14
    this.schedulerTimer = setInterval(() => {
      if (!this.audioCtx || !this.currentMusicName || this.isMusicPaused) return
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {})
      }
      while (this.nextStepTime < this.audioCtx.currentTime + scheduleAheadTime) {
        this.scheduleMusicStep(this.currentMusicName, this.currentStep, this.nextStepTime, stepDuration)
        this.nextStepTime += stepDuration
        this.currentStep = (this.currentStep + 1) % stepCount
      }
    }, 35)
  }

  private scheduleMusicStep(
    track: MusicTrackName,
    step: number,
    time: number,
    stepDur: number
  ): void {
    const ctx = this.audioCtx
    const dest = this.musicGainNode
    if (!ctx || !dest || this.settings.isMuted || this.getMusicVolume() <= 0) return
    if (MUSIC_TRACK_METADATA[track]?.youtubeVideoId) return

    if (track === 'boss') {
      const bassPattern = [NOTE.E2, NOTE.E2, NOTE.G2, NOTE.A2, NOTE.B2, NOTE.A2, NOTE.G2, NOTE.Fs2]
      const chordIdx = Math.floor(step / 16) % 4
      const root = bassPattern[chordIdx * 2 + (Math.floor(step / 8) % 2)]
      if (step % 2 === 0) {
        this.triggerSynthTone(ctx, dest, midiToHz(root), time, stepDur * 1.5, 'sawtooth', 0.14, 900)
      }
      if (step % 4 === 0) {
        this.triggerKick(ctx, dest, time, 0.24)
      }
      if (step % 8 === 4) {
        this.triggerSnare(ctx, dest, time, 0.14)
      }
      if (step % 2 === 1) {
        this.triggerHiHat(ctx, dest, time, 0.05)
      }
      return
    }

    if (track === 'gameplay') {
      const arpNotes = [NOTE.A2, NOTE.E3, NOTE.A3, NOTE.C4, NOTE.B3, NOTE.E3, NOTE.G3, NOTE.B3]
      if (step % 2 === 0) {
        const idx = (step / 2) % arpNotes.length
        this.triggerSynthTone(ctx, dest, midiToHz(arpNotes[idx]), time, stepDur * 1.4, 'triangle', 0.09, 1400)
      }
      if (step % 4 === 0) {
        this.triggerKick(ctx, dest, time, 0.18)
      }
      if (step % 8 === 4) {
        this.triggerSnare(ctx, dest, time, 0.09)
      }
      return
    }

    // 'main' ambient standby pulse
    if (step % 16 === 0) {
      const padNotes = [NOTE.E3, NOTE.B3, NOTE.C3, NOTE.D3]
      const n = padNotes[Math.floor(step / 16) % padNotes.length]
      this.triggerSynthTone(ctx, dest, midiToHz(n), time, stepDur * 12, 'sine', 0.08, 800)
    }
  }

  private triggerSynthTone(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    wave: OscillatorType,
    peakGain: number,
    cutoffHz: number
  ): void {
    try {
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()

      osc.type = wave
      osc.frequency.setValueAtTime(freq, time)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(cutoffHz, time)

      gain.gain.setValueAtTime(0.0001, time)
      gain.gain.linearRampToValueAtTime(peakGain, time + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(dest)

      osc.start(time)
      osc.stop(time + duration + 0.02)
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }

  private triggerKick(ctx: AudioContext, dest: AudioNode, time: number, peakGain: number): void {
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(145, time)
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.09)
      gain.gain.setValueAtTime(peakGain, time)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(time)
      osc.stop(time + 0.14)
    } catch {
      // Ignore
    }
  }

  private triggerSnare(ctx: AudioContext, dest: AudioNode, time: number, peakGain: number): void {
    const noiseBuf = this.getNoiseBuffer(ctx)
    try {
      if (noiseBuf) {
        const noise = ctx.createBufferSource()
        noise.buffer = noiseBuf
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(1850, time)
        const nGain = ctx.createGain()
        nGain.gain.setValueAtTime(peakGain, time)
        nGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)
        noise.connect(filter)
        filter.connect(nGain)
        nGain.connect(dest)
        noise.start(time)
        noise.stop(time + 0.13)
      }
      const body = ctx.createOscillator()
      const bGain = ctx.createGain()
      body.type = 'triangle'
      body.frequency.setValueAtTime(195, time)
      body.frequency.exponentialRampToValueAtTime(95, time + 0.06)
      bGain.gain.setValueAtTime(peakGain * 0.75, time)
      bGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08)
      body.connect(bGain)
      bGain.connect(dest)
      body.start(time)
      body.stop(time + 0.09)
    } catch {
      // Ignore
    }
  }

  private triggerHiHat(ctx: AudioContext, dest: AudioNode, time: number, peakGain: number): void {
    const noiseBuf = this.getNoiseBuffer(ctx)
    if (!noiseBuf) return
    try {
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuf
      const filter = ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.setValueAtTime(6800, time)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(peakGain, time)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(dest)
      noise.start(time)
      noise.stop(time + 0.05)
    } catch {
      // Ignore
    }
  }

  /**
   * Stop music
   */
  stopMusic(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
    if (this.currentMusic) {
      this.currentMusic.stop()
      this.currentMusic = null
    }
    this.currentMusicName = null
    this.isMusicPaused = false
    this.externalYouTubeActive = false
    this.syncMusicGainNode()
  }

  /**
   * Pause music
   */
  pauseMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause()
    }
    this.isMusicPaused = true
  }

  /**
   * Resume music
   */
  resumeMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.play()
    }
    this.isMusicPaused = false
    if (this.audioCtx) {
      this.nextStepTime = this.audioCtx.currentTime + 0.04
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    Howler.stop()
    this.stopMusic()
  }

  getCurrentMusicTrack(): MusicTrackName | null {
    return this.currentMusicName
  }

  isMusicPlaying(): boolean {
    return this.currentMusicName !== null && !this.isMusicPaused && !this.settings.isMuted
  }

  /**
   * Update audio settings
   */
  updateSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveSettings()
    this.updateGlobalVolume()
    this.syncMusicGainNode()

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
    this.syncMusicGainNode()
  }

  isReady(): boolean {
    return this.isInitialized
  }

  getSoundTypes(): SoundType[] {
    return Object.keys(SOUND_PROFILES) as SoundType[]
  }

  getMusicTypes(): MusicTrackName[] {
    return ['main', 'gameplay', 'boss', 'universal_collapse', 'astral_scourge']
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
    this.musicGainNode = null
    this.noiseBuffer = null
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

export const playMusic = (name: MusicTrackName): void => {
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
