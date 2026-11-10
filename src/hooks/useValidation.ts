/**
 * Validation Hook
 * Phase 8: Features & Polish - Input Validation Guards
 */

import { useState, useCallback } from 'react'
import { ValidationRule } from '../components/ui/ValidatedInput'

interface ValidationErrors {
  [key: string]: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationErrors
}

interface UseValidationReturn {
  validate: (name: string, value: string, rules?: ValidationRule[]) => ValidationResult
  validateAll: (fields: Record<string, { value: string, rules?: ValidationRule[] }>) => ValidationResult
  errors: ValidationErrors
  isValid: (name: string) => boolean
  hasErrors: boolean
  clearErrors: () => void
  clearError: (name: string) => void
}

/**
 * Validation rules presets
 */
export const ValidationPresets = {
  // Player name validation
  playerName: [
    { type: 'required', message: 'Player name is required' },
    { type: 'minLength', value: 3, message: 'Player name must be at least 3 characters' },
    { type: 'maxLength', value: 20, message: 'Player name must be at most 20 characters' },
    { type: 'pattern', value: /^[a-zA-Z0-9_\- ]+$/, message: 'Player name can only contain letters, numbers, spaces, underscores, and hyphens' }
  ] as ValidationRule[],
  
  // Loadout name validation
  loadoutName: [
    { type: 'required', message: 'Loadout name is required' },
    { type: 'minLength', value: 3, message: 'Loadout name must be at least 3 characters' },
    { type: 'maxLength', value: 50, message: 'Loadout name must be at most 50 characters' }
  ] as ValidationRule[],
  
  // Email validation
  email: [
    { type: 'required', message: 'Email is required' },
    { type: 'pattern', value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address' }
  ] as ValidationRule[],
  
  // Password validation
  password: [
    { type: 'required', message: 'Password is required' },
    { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
    { type: 'pattern', value: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
    { type: 'pattern', value: /[0-9]/, message: 'Password must contain at least one number' }
  ] as ValidationRule[],
  
  // Search validation
  search: [
    { type: 'minLength', value: 2, message: 'Please enter at least 2 characters to search' }
  ] as ValidationRule[]
}

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  // Basic HTML tag removal
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Custom hook for form validation
 */
export const useValidation = (): UseValidationReturn => {
  const [errors, setErrors] = useState<ValidationErrors>({})

  /**
   * Validate a single field
   */
  const validate = useCallback((
    name: string,
    value: string,
    rules: ValidationRule[] = []
  ): ValidationResult => {
    const newErrors: ValidationErrors = { ...errors }
    let isFieldValid = true
    let firstError = ''

    // Clear previous error for this field
    delete newErrors[name]

    // Run validation rules
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!value || value.trim() === '') {
            newErrors[name] = rule.message
            firstError = rule.message
            isFieldValid = false
          }
          break
          
        case 'minLength':
          if (value.length < (rule.value || 0)) {
            newErrors[name] = rule.message
            firstError = rule.message
            isFieldValid = false
          }
          break
          
        case 'maxLength':
          if (value.length > (rule.value || Infinity)) {
            newErrors[name] = rule.message
            firstError = rule.message
            isFieldValid = false
          }
          break
          
        case 'pattern':
          if (rule.value && typeof rule.value === 'object') {
            if (!rule.value.test(value)) {
              newErrors[name] = rule.message
              firstError = rule.message
              isFieldValid = false
            }
          }
          break
          
        case 'custom':
          if (typeof rule.value === 'function') {
            const result = rule.value(value)
            if (result !== true) {
              newErrors[name] = rule.message
              firstError = rule.message
              isFieldValid = false
            }
          }
          break
      }
      
      // Stop at first error
      if (!isFieldValid && firstError) break
    }

    setErrors(newErrors)
    
    return {
      isValid: isFieldValid,
      errors: newErrors
    }
  }, [errors])

  /**
   * Validate all fields at once
   */
  const validateAll = useCallback((
    fields: Record<string, { value: string, rules?: ValidationRule[] }>
  ): ValidationResult => {
    const newErrors: ValidationErrors = {}
    let isFormValid = true

    for (const [name, { value, rules = [] }] of Object.entries(fields)) {
      for (const rule of rules) {
        switch (rule.type) {
          case 'required':
            if (!value || value.trim() === '') {
              newErrors[name] = rule.message
              isFormValid = false
            }
            break
            
          case 'minLength':
            if (value.length < (rule.value || 0)) {
              newErrors[name] = rule.message
              isFormValid = false
            }
            break
            
          case 'maxLength':
            if (value.length > (rule.value || Infinity)) {
              newErrors[name] = rule.message
              isFormValid = false
            }
            break
            
          case 'pattern':
            if (rule.value && typeof rule.value === 'object') {
              if (!rule.value.test(value)) {
                newErrors[name] = rule.message
                isFormValid = false
              }
            }
            break
            
          case 'custom':
            if (typeof rule.value === 'function') {
              const result = rule.value(value)
              if (result !== true) {
                newErrors[name] = rule.message
                isFormValid = false
              }
            }
            break
        }
      }
    }

    setErrors(newErrors)
    
    return {
      isValid: isFormValid,
      errors: newErrors
    }
  }, [])

  /**
   * Check if a specific field is valid
   */
  const isValid = useCallback((name: string): boolean => {
    return !errors[name]
  }, [errors])

  /**
   * Check if there are any errors
   */
  const hasErrors = Object.keys(errors).length > 0

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  /**
   * Clear error for a specific field
   */
  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
  }, [])

  return {
    validate,
    validateAll,
    errors,
    isValid,
    hasErrors,
    clearErrors,
    clearError
  }
}

export default useValidation
