/**
 * Audio Settings Component
 * Phase 8: Features & Polish - Audio Preferences System
 */

import React, { useState, useEffect } from 'react'
import { useAudio } from '../../context/AudioContext'
import { Modal } from './Modal'
import { Button } from './Button'

interface AudioSettingsProps {
  isOpen: boolean
  onClose: () => void
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useAudio()
  const [tempSettings, setTempSettings] = useState(settings)

  // Sync with context settings
  useEffect(() => {
    setTempSettings(settings)
  }, [settings, isOpen])

  // Handle volume change
  const handleVolumeChange = (type: 'masterVolume' | 'musicVolume' | 'sfxVolume', value: number) => {
    setTempSettings(prev => ({
      ...prev,
      [type]: value
    }))
  }

  // Handle mute toggle
  const handleMuteToggle = () => {
    setTempSettings(prev => ({
      ...prev,
      isMuted: !prev.isMuted
    }))
  }

  // Apply settings
  const handleApply = () => {
    updateSettings(tempSettings)
    onClose()
  }

  // Reset to defaults
  const handleReset = () => {
    resetSettings()
    setTempSettings({
      masterVolume: 70,
      musicVolume: 50,
      sfxVolume: 80,
      isMuted: false
    })
  }

  // Cancel changes
  const handleCancel = () => {
    setTempSettings(settings)
    onClose()
  }

  // Volume slider component
  const VolumeSlider: React.FC<{
    label: string
    type: 'masterVolume' | 'musicVolume' | 'sfxVolume'
    value: number
    onChange: (value: number) => void
    disabled?: boolean
  }> = ({ label, type, value, onChange, disabled = false }) => {
    const icon = getVolumeIcon(type)
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-white/80 text-sm font-medium">{label}</label>
          <span className="text-white/60 text-xs">{value}%</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-white/60">{icon}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled || tempSettings.isMuted}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="text-white/60">{getVolumeIcon(type, value)}</span>
        </div>
      </div>
    )
  }

  // Get volume icon based on type and value
  const getVolumeIcon = (type: string, value?: number) => {
    const currentValue = value !== undefined ? value : tempSettings[type as keyof typeof tempSettings]
    
    if (tempSettings.isMuted) {
      return '🔇'
    }
    
    if (currentValue === 0) {
      return '🔈'
    }
    
    if (currentValue < 33) {
      return '🔉'
    }
    
    if (currentValue < 66) {
      return '🔊'
    }
    
    return '🎵'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audio Settings" size="md">
      <div className="space-y-6">
        {/* Master Mute Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-white font-medium">Mute All</label>
            <p className="text-white/60 text-xs">Toggle all audio on/off</p>
          </div>
          <button
            onClick={handleMuteToggle}
            className={`
              relative inline-flex items-center h-6 rounded-full w-11 transition-colors
              ${tempSettings.isMuted ? 'bg-red-500' : 'bg-cyan-500'}
            `}
            aria-label={tempSettings.isMuted ? 'Unmute all audio' : 'Mute all audio'}
          >
            <span
              className={`
                inline-block w-4 h-4 transform bg-white rounded-full transition-transform
                ${tempSettings.isMuted ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="border-t border-slate-700 pt-4">
          {/* Master Volume */}
          <VolumeSlider
            label="Master Volume"
            type="masterVolume"
            value={tempSettings.masterVolume}
            onChange={(value) => handleVolumeChange('masterVolume', value)}
          />

          {/* Music Volume */}
          <VolumeSlider
            label="Music Volume"
            type="musicVolume"
            value={tempSettings.musicVolume}
            onChange={(value) => handleVolumeChange('musicVolume', value)}
          />

          {/* Sound Effects Volume */}
          <VolumeSlider
            label="Sound Effects Volume"
            type="sfxVolume"
            value={tempSettings.sfxVolume}
            onChange={(value) => handleVolumeChange('sfxVolume', value)}
          />
        </div>

        {/* Quick Test */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-white/80 text-sm font-medium mb-3">Test Sounds</h3>
          <div className="flex space-x-2">
            <Button
              onClick={() => {/* playSound('click') */}}
              variant="secondary"
              size="sm"
            >
              Click
            </Button>
            <Button
              onClick={() => {/* playSound('coin') */}}
              variant="warning"
              size="sm"
            >
              Coin
            </Button>
            <Button
              onClick={() => {/* playSound('shoot') */}}
              variant="primary"
              size="sm"
            >
              Shoot
            </Button>
            <Button
              onClick={() => {/* playSound('levelup') */}}
              variant="success"
              size="sm"
            >
              Level Up
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 border-t border-slate-700 pt-4">
          <Button onClick={handleReset} variant="secondary" size="sm">
            Reset to Defaults
          </Button>
          <Button onClick={handleCancel} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={handleApply} variant="primary" size="sm">
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Floating audio settings button
export const AudioSettingsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-white transition-colors shadow-lg"
        aria-label="Audio Settings"
        title="Audio Settings"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.816a1 1 0 011.617.816zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
        </svg>
      </button>
      <AudioSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export default AudioSettings
