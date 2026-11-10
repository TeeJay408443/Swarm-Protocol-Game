/**
 * Audio Context
 * Phase 8: Features & Polish - Audio Preferences System
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { AudioService, AudioSettings, getAudioService, initializeAudio } from '../services/AudioService'

interface AudioContextType {
  audioService: AudioService | null
  settings: AudioSettings
  isReady: boolean
  updateSettings: (settings: Partial<AudioSettings>) => void
  setMasterVolume: (volume: number) => void
  setMusicVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void
  toggleMute: () => void
  playSound: (soundType: string) => void
  playMusic: (name: 'main' | 'gameplay' | 'boss') => void
  stopMusic: () => void
  pauseMusic: () => void
  resumeMusic: () => void
  stopAll: () => void
  resetSettings: () => void
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

interface AudioProviderProps {
  children: ReactNode
  config?: {
    soundPath?: string
    musicPath?: string
    autoInit?: boolean
  }
}

export const AudioProvider: React.FC<AudioProviderProps> = ({
  children,
  config = {}
}) => {
  const { soundPath, musicPath, autoInit = true } = config
  const [audioService, setAudioService] = useState<AudioService | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [settings, setSettings] = useState<AudioSettings>({
    masterVolume: 70,
    musicVolume: 50,
    sfxVolume: 80,
    isMuted: false
  })

  // Initialize audio service
  useEffect(() => {
    const init = async () => {
      try {
        const service = getAudioService({
          soundPath,
          musicPath
        })
        
        if (autoInit) {
          await service.initialize()
        }
        
        setAudioService(service)
        setSettings(service.getSettings())
        setIsReady(autoInit)
      } catch (error) {
        console.error('Failed to initialize audio service:', error)
      }
    }
    
    init()
    
    return () => {
      if (audioService) {
        audioService.destroy()
      }
    }
  }, [soundPath, musicPath, autoInit])

  // Update settings and sync with service
  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    if (audioService) {
      audioService.updateSettings(newSettings)
      setSettings(prev => ({ ...prev, ...newSettings }))
    }
  }, [audioService])

  // Convenience methods
  const setMasterVolume = useCallback((volume: number) => {
    updateSettings({ masterVolume: volume })
  }, [updateSettings])

  const setMusicVolume = useCallback((volume: number) => {
    updateSettings({ musicVolume: volume })
  }, [updateSettings])

  const setSfxVolume = useCallback((volume: number) => {
    updateSettings({ sfxVolume: volume })
  }, [updateSettings])

  const toggleMute = useCallback(() => {
    updateSettings({ isMuted: !settings.isMuted })
  }, [updateSettings, settings.isMuted])

  const playSound = useCallback((soundType: string) => {
    if (audioService && isReady) {
      audioService.playSound(soundType as any)
    }
  }, [audioService, isReady])

  const playMusic = useCallback((name: 'main' | 'gameplay' | 'boss') => {
    if (audioService && isReady) {
      audioService.playMusic(name)
    }
  }, [audioService, isReady])

  const stopMusic = useCallback(() => {
    if (audioService) {
      audioService.stopMusic()
    }
  }, [audioService])

  const pauseMusic = useCallback(() => {
    if (audioService) {
      audioService.pauseMusic()
    }
  }, [audioService])

  const resumeMusic = useCallback(() => {
    if (audioService) {
      audioService.resumeMusic()
    }
  }, [audioService])

  const stopAll = useCallback(() => {
    if (audioService) {
      audioService.stopAll()
    }
  }, [audioService])

  const resetSettings = useCallback(() => {
    if (audioService) {
      audioService.resetSettings()
      setSettings(audioService.getSettings())
    }
  }, [audioService])

  const value: AudioContextType = {
    audioService,
    settings,
    isReady,
    updateSettings,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    toggleMute,
    playSound,
    playMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    stopAll,
    resetSettings
  }

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}

/**
 * Hook to use audio context
 */
export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext)
  
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  
  return context
}

/**
 * Hook to use audio with auto-initialization
 */
export const useAudioWithInit = (): AudioContextType => {
  const context = useAudio()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (context.audioService && !context.isReady) {
      const init = async () => {
        await context.audioService.initialize()
        context.audioService.updateSettings(context.settings)
      }
      init()
      setIsInitialized(true)
    }
  }, [context.audioService, context.isReady, context.settings])

  return context
}

export default AudioContext
