/**
 * Validation Hook Unit Tests
 * Phase 9: Test & Deploy - Unit Testing
 */

import { renderHook, act } from '@testing-library/react'
import { useValidation, ValidationPresets, sanitizeInput } from '../../src/hooks/useValidation'

describe('useValidation Hook', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  describe('Basic Validation', () => {
    test('should validate required fields', () => {
      const { result } = renderHook(() => useValidation())
      
      // Test empty value
      act(() => {
        result.current.validate('testField', '', [
          { type: 'required', message: 'Field is required' }
        ])
      })
      
      expect(result.current.errors.testField).toBe('Field is required')
      expect(result.current.hasErrors).toBe(true)
      expect(result.current.isValid('testField')).toBe(false)
      
      // Test non-empty value
      act(() => {
        result.current.validate('testField', 'value', [
          { type: 'required', message: 'Field is required' }
        ])
      })
      
      expect(result.current.errors.testField).toBeUndefined()
      expect(result.current.isValid('testField')).toBe(true)
    })

    test('should validate minLength', () => {
      const { result } = renderHook(() => useValidation())
      
      act(() => {
        result.current.validate('testField', 'abc', [
          { type: 'minLength', value: 5, message: 'Must be at least 5 characters' }
        ])
      })
      
      expect(result.current.errors.testField).toBe('Must be at least 5 characters')
      
      act(() => {
        result.current.validate('testField', 'abcdef', [
          { type: 'minLength', value: 5, message: 'Must be at least 5 characters' }
        ])
      })
      
      expect(result.current.errors.testField).toBeUndefined()
    })

    test('should validate maxLength', () => {
      const { result } = renderHook(() => useValidation())
      
      act(() => {
        result.current.validate('testField', 'abcdefghij', [
          { type: 'maxLength', value: 5, message: 'Must be at most 5 characters' }
        ])
      })
      
      expect(result.current.errors.testField).toBe('Must be at most 5 characters')
      
      act(() => {
        result.current.validate('testField', 'abcde', [
          { type: 'maxLength', value: 5, message: 'Must be at most 5 characters' }
        ])
      })
      
      expect(result.current.errors.testField).toBeUndefined()
    })

    test('should validate pattern', () => {
      const { result } = renderHook(() => useValidation())
      
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      
      act(() => {
        result.current.validate('email', 'invalid-email', [
          { type: 'pattern', value: emailPattern, message: 'Invalid email format' }
        ])
      })
      
      expect(result.current.errors.email).toBe('Invalid email format')
      
      act(() => {
        result.current.validate('email', 'test@example.com', [
          { type: 'pattern', value: emailPattern, message: 'Invalid email format' }
        ])
      })
      
      expect(result.current.errors.email).toBeUndefined()
    })

    test('should validate custom rules', () => {
      const { result } = renderHook(() => useValidation())
      
      const customRule = (value: string) => {
        return value === 'valid' ? true : 'Must be "valid"'
      }
      
      act(() => {
        result.current.validate('testField', 'invalid', [
          { type: 'custom', value: customRule, message: 'Must be "valid"' }
        ])
      })
      
      expect(result.current.errors.testField).toBe('Must be "valid"')
      
      act(() => {
        result.current.validate('testField', 'valid', [
          { type: 'custom', value: customRule, message: 'Must be "valid"' }
        ])
      })
      
      expect(result.current.errors.testField).toBeUndefined()
    })
  })

  describe('Multiple Rules', () => {
    test('should validate multiple rules', () => {
      const { result } = renderHook(() => useValidation())
      
      act(() => {
        result.current.validate('testField', '', [
          { type: 'required', message: 'Field is required' },
          { type: 'minLength', value: 3, message: 'Must be at least 3 characters' }
        ])
      })
      
      expect(result.current.errors.testField).toBe('Field is required')
      
      act(() => {
        result.current.validate('testField', 'ab', [
          { type: 'required', message: 'Field is required' },
          { type: 'minLength', value: 3, message: 'Must be at least 3 characters' }
        ])
      })
      
      expect(result.current.errors.testField).toBe('Must be at least 3 characters')
      
      act(() => {
        result.current.validate('testField', 'abcdef', [
          { type: 'required', message: 'Field is required' },
          { type: 'minLength', value: 3, message: 'Must be at least 3 characters' }
        ])
      })
      
      expect(result.current.errors.testField).toBeUndefined()
    })

    test('should stop at first error', () => {
      const { result } = renderHook(() => useValidation())
      
      act(() => {
        result.current.validate('testField', '', [
          { type: 'required', message: 'Field is required' },
          { type: 'minLength', value: 3, message: 'Must be at least 3 characters' },
          { type: 'maxLength', value: 10, message: 'Must be at most 10 characters' }
        ])
      })
      
      // Should only show first error
      expect(result.current.errors.testField).toBe('Field is required')
    })
  })

  describe('validateAll', () => {
    test('should validate all fields at once', () => {
      const { result } = renderHook(() => useValidation())
      
      act(() => {
        result.current.validateAll({
          name: {
            value: '',
            rules: [{ type: 'required', message: 'Name is required' }]
          },
          email: {
            value: 'invalid',
            rules: [{ type: 'pattern', value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }]
          },
          password: {
            value: 'short',
            rules: [{ type: 'minLength', value: 8, message: 'Password too short' }]
          }
        })
      })
      
      expect(result.current.errors.name).toBe('Name is required')
      expect(result.current.errors.email).toBe('Invalid email')
      expect(result.current.errors.password).toBe('Password too short')
      expect(result.current.hasErrors).toBe(true)
    })

    test('should return isValid: true when all fields pass', () => {
      const { result } = renderHook(() => useValidation())
      
      const validationResult = act(() => {
        return result.current.validateAll({
          name: {
            value: 'John Doe',
            rules: [{ type: 'required', message: 'Name is required' }]
          },
          email: {
            value: 'john@example.com',
            rules: [{ type: 'pattern', value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }]
          },
          password: {
            value: 'password123',
            rules: [{ type: 'minLength', value: 8, message: 'Password too short' }]
          }
        })
      })
      
      expect(validationResult.isValid).toBe(true)
      expect(Object.keys(result.current.errors).length).toBe(0)
    })
  })

  describe('Error Management', () => {
    test('should clear all errors', () => {
      const { result } = renderHook(() => useValidation())
      
      act(() => {
        result.current.validate('field1', '', [{ type: 'required', message: 'Required' }])
        result.current.validate('field2', '', [{ type: 'required', message: 'Required' }])
      })
      
      expect(result.current.hasErrors).toBe(true)
      
      act(() => {
        result.current.clearErrors()
      })
      
      expect(result.current.hasErrors).toBe(false)
      expect(Object.keys(result.current.errors).length).toBe(0)
    })

    test('should clear specific error', () => {
      const { result } = renderHook(() => useValidation())
      
      act(() => {
        result.current.validate('field1', '', [{ type: 'required', message: 'Required' }])
        result.current.validate('field2', '', [{ type: 'required', message: 'Required' }])
      })
      
      expect(result.current.errors.field1).toBe('Required')
      expect(result.current.errors.field2).toBe('Required')
      
      act(() => {
        result.current.clearError('field1')
      })
      
      expect(result.current.errors.field1).toBeUndefined()
      expect(result.current.errors.field2).toBe('Required')
    })
  })
})

describe('ValidationPresets', () => {
  test('should have playerName preset', () => {
    expect(ValidationPresets.playerName).toBeDefined()
    expect(ValidationPresets.playerName.length).toBeGreaterThan(0)
    
    const requiredRule = ValidationPresets.playerName.find(r => r.type === 'required')
    expect(requiredRule).toBeDefined()
    
    const minLengthRule = ValidationPresets.playerName.find(r => r.type === 'minLength')
    expect(minLengthRule).toBeDefined()
    expect((minLengthRule as any).value).toBe(3)
    
    const maxLengthRule = ValidationPresets.playerName.find(r => r.type === 'maxLength')
    expect(maxLengthRule).toBeDefined()
    expect((maxLengthRule as any).value).toBe(20)
  })

  test('should have email preset', () => {
    expect(ValidationPresets.email).toBeDefined()
    expect(ValidationPresets.email.length).toBeGreaterThan(0)
    
    const patternRule = ValidationPresets.email.find(r => r.type === 'pattern')
    expect(patternRule).toBeDefined()
  })

  test('should have password preset', () => {
    expect(ValidationPresets.password).toBeDefined()
    expect(ValidationPresets.password.length).toBeGreaterThan(0)
    
    const minLengthRule = ValidationPresets.password.find(r => r.type === 'minLength')
    expect(minLengthRule).toBeDefined()
    expect((minLengthRule as any).value).toBe(8)
  })
})

describe('sanitizeInput', () => {
  test('should remove HTML tags', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")')
    expect(sanitizeInput('<div>test</div>')).toBe('test')
    expect(sanitizeInput('<p>paragraph</p>')).toBe('paragraph')
  })

  test('should handle empty input', () => {
    expect(sanitizeInput('')).toBe('')
  })

  test('should handle input without tags', () => {
    expect(sanitizeInput('plain text')).toBe('plain text')
    expect(sanitizeInput('12345')).toBe('12345')
  })

  test('should handle nested tags', () => {
    expect(sanitizeInput('<div><span>nested</span></div>')).toBe('nested')
  })

  test('should handle self-closing tags', () => {
    expect(sanitizeInput('<img src="test.jpg" />')).toBe('')
    expect(sanitizeInput('<br />')).toBe('')
  })
})
