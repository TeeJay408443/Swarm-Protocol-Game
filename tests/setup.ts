/**
 * Test Setup
 * Phase 9: Test & Deploy - Test Configuration
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock ResizeObserver for tests
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver for tests
class IntersectionObserverMock {
  constructor(callback: any, options?: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock AudioContext for tests
class AudioContextMock {
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      type: 'sine',
      frequency: { value: 0 }
    }
  }
  createGain() {
    return {
      connect: () => {},
      gain: { value: 0 }
    }
  }
  destination = {}
  currentTime = 0
}

// Mock Image for tests
class ImageMock {
  src = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 0
  height = 0
  complete = false
}

// Apply mocks
global.ResizeObserver = ResizeObserverMock as any
global.IntersectionObserver = IntersectionObserverMock as any
global.AudioContext = AudioContextMock as any
global.Image = ImageMock as any

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return index < keys.length ? keys[index] : null
    },
    length: Object.keys(store).length
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
})

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: (element: Element) => ({
    getPropertyValue: (property: string) => {
      if (property === 'display') return 'block'
      if (property === 'visibility') return 'visible'
      if (property === 'opacity') return '1'
      return ''
    }
  })
})

// Mock performance
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntries: () => [],
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => {},
    clearMeasures: () => {},
    clearResourceTimings: () => {}
  }
})

// Mock requestAnimationFrame
let animationFrameCallbacks: ((timestamp: number) => void)[] = []
const originalRequestAnimationFrame = window.requestAnimationFrame
const originalCancelAnimationFrame = window.cancelAnimationFrame

window.requestAnimationFrame = (callback) => {
  const id = animationFrameCallbacks.length
  animationFrameCallbacks.push(callback)
  return id
}

window.cancelAnimationFrame = (id) => {
  animationFrameCallbacks[id] = () => {}
}

// Restore original methods after tests
if (originalRequestAnimationFrame) {
  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame
    window.cancelAnimationFrame = originalCancelAnimationFrame
  })
}

// Mock console methods to suppress warnings in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    const message = args[0]
    // Suppress specific warnings
    if (typeof message === 'string') {
      if (message.includes('Error:') || message.includes('Warning:')) {
        // Only log actual test failures
        if (!message.includes('React does not recognize') &&
            !message.includes('Invalid hook call') &&
            !message.includes('Memory leak')) {
          originalConsoleError(...args)
        }
      } else {
        originalConsoleError(...args)
      }
    } else {
      originalConsoleError(...args)
    }
  }
  
  console.warn = (...args: any[]) => {
    const message = args[0]
    if (typeof message === 'string') {
      if (!message.includes('React does not recognize') &&
          !message.includes('Invalid hook call') &&
          !message.includes('Memory leak')) {
        originalConsoleWarn(...args)
      }
    } else {
      originalConsoleWarn(...args)
    }
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

export {}
