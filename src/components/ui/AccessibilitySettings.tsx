/**
 * Accessibility Settings Component
 * Phase 8: Features & Polish - High-Contrast Accessibility Theme
 */

import React, { useState } from 'react'
import { useAccessibility } from '../../context/AccessibilityContext'
import { Modal } from './Modal'
import { Button } from './Button'

interface AccessibilitySettingsProps {
  isOpen: boolean
  onClose: () => void
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    isHighContrast,
    isLargeText,
    isReducedMotion,
    toggleHighContrast,
    toggleLargeText,
    toggleReducedMotion,
    resetSettings
  } = useAccessibility()

  // Toggle functions
  const handleToggleHighContrast = () => {
    toggleHighContrast()
  }

  const handleToggleLargeText = () => {
    toggleLargeText()
  }

  const handleToggleReducedMotion = () => {
    toggleReducedMotion()
  }

  // Handle reset
  const handleReset = () => {
    resetSettings()
    onClose()
  }

  // Toggle switch component
  const ToggleSwitch: React.FC<{
    label: string
    description: string
    isActive: boolean
    onToggle: () => void
    icon: React.ReactNode
  }> = ({ label, description, isActive, onToggle, icon }) => {
    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <label className="text-white font-medium">{label}</label>
            <p className="text-white/60 text-xs">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`
            relative inline-flex items-center h-6 rounded-full w-11 transition-colors
            ${isActive ? 'bg-cyan-500' : 'bg-slate-600'}
          `}
          aria-label={isActive ? `Disable ${label}` : `Enable ${label}`}
        >
          <span
            className={`
              inline-block w-4 h-4 transform bg-white rounded-full transition-transform
              ${isActive ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Accessibility Settings" size="md">
      <div className="space-y-4">
        <p className="text-white/80 text-sm">
          Customize the game to fit your needs and preferences.
        </p>

        {/* High Contrast Toggle */}
        <ToggleSwitch
          label="High Contrast"
          description="Increases color contrast for better visibility"
          isActive={isHighContrast}
          onToggle={handleToggleHighContrast}
          icon="🎨"
        />

        {/* Large Text Toggle */}
        <ToggleSwitch
          label="Large Text"
          description="Increases font size for easier reading"
          isActive={isLargeText}
          onToggle={handleToggleLargeText}
          icon="🔤"
        />

        {/* Reduced Motion Toggle */}
        <ToggleSwitch
          label="Reduced Motion"
          description="Disables animations and transitions"
          isActive={isReducedMotion}
          onToggle={handleToggleReducedMotion}
          icon="🚫"
        />

        {/* Preview Section */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-white/80 text-sm font-medium mb-3">Preview</h3>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-white/80 text-sm mb-2">Sample text for preview</p>
            <Button variant="primary" size="sm">
              Sample Button
            </Button>
            <div className="mt-3 h-2 w-full bg-slate-700 rounded-full">
              <div className="h-2 w-1/3 bg-cyan-500 rounded-full" />
            </div>
          </div>
          <p className="text-white/60 text-xs mt-2">
            Toggle settings to see changes in real-time
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 border-t border-slate-700 pt-4">
          <Button onClick={handleReset} variant="secondary" size="sm">
            Reset to Defaults
          </Button>
          <Button onClick={onClose} variant="primary" size="sm">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Floating accessibility settings button
export const AccessibilitySettingsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-20 w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-white transition-colors shadow-lg"
        aria-label="Accessibility Settings"
        title="Accessibility Settings"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4zM10 11a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v1.5a.5.5 0 01-1 0V6a1 1 0 01-1-1H9a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
      <AccessibilitySettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export default AccessibilitySettings
