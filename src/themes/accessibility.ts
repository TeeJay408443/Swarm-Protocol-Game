/**
 * Accessibility Theme
 * Phase 8: Features & Polish - High-Contrast Accessibility Theme
 */

import { ClassValue } from 'clsx'

/**
 * Accessibility settings
 */
export interface AccessibilitySettings {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
}

/**
 * Default accessibility settings
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false
}

/**
 * High-contrast color palette
 */
export const highContrastColors = {
  // Backgrounds
  background: '#000000', // Pure black
  surface: '#1a1a1a', // Very dark gray
  surfaceHover: '#2a2a2a',
  surfaceActive: '#3a3a3a',
  
  // Text
  text: '#FFFFFF', // Pure white
  textSecondary: '#CCCCCC',
  textTertiary: '#999999',
  textDisabled: '#666666',
  
  // Primary (Cyan)
  primary: '#00FFFF', // Brighter cyan
  primaryHover: '#00CCCC',
  primaryActive: '#00AAAA',
  primaryLight: '#66FFFF',
  primaryDark: '#009999',
  
  // Secondary (Slate)
  secondary: '#666666',
  secondaryHover: '#888888',
  secondaryActive: '#AAAAAA',
  
  // Accent (Hazard Gold)
  accent: '#FFFF00', // Bright yellow
  accentHover: '#CCCC00',
  accentActive: '#999900',
  
  // Error (Alert Red)
  error: '#FF0000', // Bright red
  errorHover: '#CC0000',
  errorActive: '#990000',
  errorLight: '#FF6666',
  
  // Warning
  warning: '#FF9900', // Bright orange
  warningHover: '#CC7700',
  warningActive: '#995500',
  
  // Success
  success: '#00FF00', // Bright green
  successHover: '#00CC00',
  successActive: '#009900',
  
  // Info
  info: '#0099FF',
  infoHover: '#0077CC',
  infoActive: '#005599',
  
  // Borders
  border: '#444444',
  borderLight: '#666666',
  borderDark: '#222222',
  
  // Focus
  focus: '#00FFFF',
  focusRing: 'rgba(0, 255, 255, 0.5)',
  
  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #00FFFF 0%, #00CCCC 100%)',
  gradientError: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
  
  // Shadows
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
  shadowLarge: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
}

/**
 * Standard color palette (from Tailwind config)
 */
export const standardColors = {
  // Backgrounds
  background: '#0B0F19', // Slate Carbon
  surface: '#1A1F2E',
  surfaceHover: '#252B3D',
  surfaceActive: '#31384A',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textTertiary: '#718096',
  textDisabled: '#4A5568',
  
  // Primary (Cyan)
  primary: '#00F0FF',
  primaryHover: '#00D4E0',
  primaryActive: '#00B8C4',
  primaryLight: '#40F7FF',
  primaryDark: '#00A3B8',
  
  // Secondary (Slate)
  secondary: '#4A5568',
  secondaryHover: '#6B7280',
  secondaryActive: '#8C95A4',
  
  // Accent (Hazard Gold)
  accent: '#FFD700',
  accentHover: '#E6C200',
  accentActive: '#CCAD00',
  
  // Error (Alert Red)
  error: '#FF0055',
  errorHover: '#E60049',
  errorActive: '#CC003D',
  errorLight: '#FF4D7A',
  
  // Warning
  warning: '#FFA500',
  warningHover: '#E69500',
  warningActive: '#CC8500',
  
  // Success
  success: '#00FF88',
  successHover: '#00E677',
  successActive: '#00CC66',
  
  // Info
  info: '#00B4FF',
  infoHover: '#0099E6',
  infoActive: '#0077CC',
  
  // Borders
  border: '#2D3748',
  borderLight: '#4A5568',
  borderDark: '#1A202C',
  
  // Focus
  focus: '#00F0FF',
  focusRing: 'rgba(0, 240, 255, 0.5)',
  
  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #00F0FF 0%, #00D4E0 100%)',
  gradientError: 'linear-gradient(135deg, #FF0055 0%, #E60049 100%)',
  
  // Shadows
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
  shadowLarge: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
}

/**
 * Get current colors based on accessibility settings
 */
export const getColors = (settings: AccessibilitySettings) => {
  return settings.highContrast ? highContrastColors : standardColors
}

/**
 * Get Tailwind classes for accessibility
 */
export const getAccessibilityClasses = (settings: AccessibilitySettings): ClassValue => {
  const classes: string[] = []
  
  // High contrast
  if (settings.highContrast) {
    classes.push('contrast-more')
  }
  
  // Large text
  if (settings.largeText) {
    classes.push('text-lg')
  }
  
  // Reduced motion
  if (settings.reducedMotion) {
    classes.push('motion-reduce')
  }
  
  return classes
}

/**
 * CSS variables for accessibility
 */
export const accessibilityCSSVariables = (settings: AccessibilitySettings): string => {
  const colors = getColors(settings)
  
  return `
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
    --color-focus: ${colors.focus};
    
    ${settings.largeText ? '--font-size-base: 1.125rem;' : ''}
    ${settings.reducedMotion ? '--transition-duration: 0ms;' : ''}
  `
}

/**
 * Media query for reduced motion preference
 */
export const reducedMotionQuery = '@media (prefers-reduced-motion: reduce)'

/**
 * Media query for high contrast preference
 */
export const highContrastQuery = '@media (prefers-contrast: high)'

/**
 * Storage key for accessibility settings
 */
export const ACCESSIBILITY_STORAGE_KEY = 'swarm-protocol-accessibility-settings'

/**
 * Save accessibility settings to localStorage
 */
export const saveAccessibilitySettings = (settings: AccessibilitySettings): void => {
  try {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('Could not save accessibility settings:', error)
  }
}

/**
 * Load accessibility settings from localStorage
 */
export const loadAccessibilitySettings = (): AccessibilitySettings => {
  try {
    const saved = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...JSON.parse(saved) }
    }
  } catch (error) {
    console.warn('Could not load accessibility settings:', error)
  }
  return { ...DEFAULT_ACCESSIBILITY_SETTINGS }
}

export default {
  highContrastColors,
  standardColors,
  getColors,
  getAccessibilityClasses,
  accessibilityCSSVariables,
  reducedMotionQuery,
  highContrastQuery,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  ACCESSIBILITY_STORAGE_KEY,
  saveAccessibilitySettings,
  loadAccessibilitySettings
}
