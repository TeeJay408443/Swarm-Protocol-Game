/**
 * Toast Container
 * Phase 8: Features & Polish - Toast Notification System
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Toast, { ToastType, ToastProps } from './Toast'

interface ToastContextType {
  addToast: (message: string, options?: Omit<ToastProps, 'id' | 'onDismiss'>) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
}

interface ToastProviderProps {
  children: ReactNode
  maxToasts?: number
  defaultDuration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastId = 0

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
  position = 'top-right'
}) => {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([])

  const generateId = useCallback(() => {
    return `toast-${++toastId}`
  }, [])

  const addToast = useCallback((message: string, options: Omit<ToastProps, 'id' | 'onDismiss'> = {}) => {
    const id = generateId()
    
    const newToast: ToastProps & { id: string } = {
      id,
      message,
      type: 'info',
      duration: defaultDuration,
      position,
      ...options,
      onDismiss: (toastId) => dismissToast(toastId)
    }
    
    setToasts((prev) => {
      // Remove oldest toast if we exceed max
      if (prev.length >= maxToasts) {
        const newToasts = [...prev]
        newToasts.shift()
        return [...newToasts, newToast]
      }
      return [...prev, newToast]
    })
    
    return id
  }, [generateId, defaultDuration, maxToasts, position])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  const value: ToastContextType = {
    addToast,
    dismissToast,
    clearToasts
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          title={toast.title}
          duration={toast.duration}
          onDismiss={toast.onDismiss}
          position={toast.position || position}
        />
      ))}
    </ToastContext.Provider>
  )
}

// Custom hook for using toasts
export const useToast = () => {
  const context = useContext(ToastContext)
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  
  const { addToast, dismissToast, clearToasts } = context
  
  // Convenience methods for different toast types
  const success = useCallback((message: string, options?: Omit<ToastProps, 'id' | 'onDismiss' | 'type'>) => {
    return addToast(message, { type: 'success', ...options })
  }, [addToast])
  
  const error = useCallback((message: string, options?: Omit<ToastProps, 'id' | 'onDismiss' | 'type'>) => {
    return addToast(message, { type: 'error', duration: 8000, ...options })
  }, [addToast])
  
  const warning = useCallback((message: string, options?: Omit<ToastProps, 'id' | 'onDismiss' | 'type'>) => {
    return addToast(message, { type: 'warning', ...options })
  }, [addToast])
  
  const info = useCallback((message: string, options?: Omit<ToastProps, 'id' | 'onDismiss' | 'type'>) => {
    return addToast(message, { type: 'info', ...options })
  }, [addToast])
  
  return {
    addToast,
    success,
    error,
    warning,
    info,
    dismissToast,
    clearToasts
  }
}

export default ToastProvider
