/**
 * Accessibility Context
 * Phase 8: Features & Polish - High-Contrast Accessibility Theme
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import {
  AccessibilitySettings,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  ACCESSIBILITY_STORAGE_KEY,
  saveAccessibilitySettings,
  loadAccessibilitySettings
} from '../themes/accessibility'

interface AccessibilityContextType {
  settings: AccessibilitySettings
  isHighContrast: boolean
  isLargeText: boolean
  isReducedMotion: boolean
  toggleHighContrast: () => void
  toggleLargeText: () => void
  toggleReducedMotion: () => void
  setSettings: (settings: AccessibilitySettings) => void
  resetSettings: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
  defaultSettings?: AccessibilitySettings
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  defaultSettings
}) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const loaded = loadAccessibilitySettings()
    return defaultSettings ? { ...loaded, ...defaultSettings } : loaded
  })

  // Save settings to localStorage when they change
  useEffect(() => {
    saveAccessibilitySettings(settings)
  }, [settings])

  // Apply settings to document
  useEffect(() => {
    // High contrast class
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }

    // Large text class
    if (settings.largeText) {
      document.documentElement.classList.add('large-text')
    } else {
      document.documentElement.classList.remove('large-text')
    }

    // Reduced motion class
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduced-motion')
    } else {
      document.documentElement.classList.remove('reduced-motion')
    }
  }, [settings])

  // Toggle functions
  const toggleHighContrast = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      highContrast: !prev.highContrast
    }))
  }, [])

  const toggleLargeText = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      largeText: !prev.largeText
    }))
  }, [])

  const toggleReducedMotion = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      reducedMotion: !prev.reducedMotion
    }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS)
  }, [])

  const value: AccessibilityContextType = {
    settings,
    isHighContrast: settings.highContrast,
    isLargeText: settings.largeText,
    isReducedMotion: settings.reducedMotion,
    toggleHighContrast,
    toggleLargeText,
    toggleReducedMotion,
    setSettings,
    resetSettings
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

/**
 * Hook to use accessibility context
 */
export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext)
  
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  
  return context
}

/**
 * Component to apply accessibility classes to the document
 */
export const AccessibilityStyles: React.FC = () => {
  const { settings } = useAccessibility()
  const { getColors } = require('../themes/accessibility')
  const colors = getColors(settings)

  return (
    <style jsx global>{`
      .high-contrast {
        --color-background: ${colors.background};
        --color-surface: ${colors.surface};
        --color-text: ${colors.text};
        --color-text-secondary: ${colors.textSecondary};
        --color-primary: ${colors.primary};
        --color-accent: ${colors.accent};
        --color-error: ${colors.error};
        --color-warning: ${colors.warning};
        --color-success: ${colors.success};
        --color-border: ${colors.border};
      }
      
      .large-text {
        font-size: 1.125rem;
      }
      
      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `}</style>
  )
}

export default AccessibilityContext
