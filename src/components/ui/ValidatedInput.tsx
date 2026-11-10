/**
 * Validated Input Component
 * Phase 8: Features & Polish - Input Validation Guards
 */

import React, { useState, useEffect, useCallback, InputHTMLAttributes } from 'react'
import { useValidation } from '../../hooks/useValidation'

export type ValidationRule = {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  value?: any
  message: string
}

export interface ValidatedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  name: string
  value: string
  onChange: (value: string) => void
  label?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  rules?: ValidationRule[]
  errorClassName?: string
  successClassName?: string
  showSuccess?: boolean
  helpText?: string
}

const ValidatedInput: React.FC<ValidatedInputProps> = ({
  name,
  value,
  onChange,
  label,
  type = 'text',
  placeholder,
  rules = [],
  errorClassName = 'border-red-500',
  successClassName = 'border-green-500',
  showSuccess = false,
  helpText,
  ...props
}) => {
  const { validate, errors, isValid } = useValidation()
  const [isTouched, setIsTouched] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Validate on change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Validate the new value
    validate(name, newValue, rules)
    
    if (!isTouched) {
      setIsTouched(true)
    }
  }, [name, onChange, rules, validate, isTouched])

  // Validate on blur
  const handleBlur = useCallback(() => {
    setIsFocused(false)
    if (!isTouched) {
      setIsTouched(true)
    }
    validate(name, value, rules)
  }, [name, value, rules, validate, isTouched])

  // Validate on focus
  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  // Get error message for this field
  const errorMessage = isTouched ? errors[name] : ''
  
  // Determine border color
  const getBorderColor = () => {
    if (isFocused) {
      return 'border-cyan-500 ring-2 ring-cyan-500/20'
    }
    if (isTouched && errorMessage) {
      return errorClassName
    }
    if (isTouched && isValid(name) && showSuccess) {
      return successClassName
    }
    return 'border-gray-600'
  }

  // Get input padding based on type
  const getInputPadding = () => {
    if (type === 'password' || type === 'email') {
      return 'pr-10'
    }
    return ''
  }

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-white/80 mb-2"
        >
          {label}
          {rules.some(rule => rule.type === 'required') && (
            <span className="text-red-500" aria-hidden="true"> *</span>
          )}
        </label>
      )}
      
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-2 bg-slate-800 rounded-lg border ${getBorderColor()} 
            text-white placeholder-white/50 transition-all duration-200
            focus:outline-none focus:ring-0 ${getInputPadding()}
          `}
          aria-invalid={isTouched && !!errorMessage}
          aria-describedby={isTouched && errorMessage ? `${name}-error` : undefined}
          {...props}
        />
        
        {/* Clear button for text inputs */}
        {type === 'text' && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white transition-colors"
            aria-label="Clear input"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Password toggle */}
        {type === 'password' && value && (
          <button
            type="button"
            onClick={() => {
              // This would require state management for password visibility
              // For now, just show a placeholder
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white transition-colors"
            aria-label="Toggle password visibility"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Error message */}
      {isTouched && errorMessage && (
        <p
          id={`${name}-error`}
          className="mt-1 text-sm text-red-500"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
      
      {/* Help text */}
      {helpText && !errorMessage && (
        <p className="mt-1 text-sm text-white/60">{helpText}</p>
      )}
    </div>
  )
}

export default ValidatedInput
