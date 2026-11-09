import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  // Variant styles
  const variantClasses = {
    primary: 'bg-cyan-accent text-slate-carbon hover:opacity-90',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600',
    danger: 'bg-alert-red text-white hover:opacity-90',
    warning: 'bg-hazard-gold text-slate-carbon hover:opacity-90',
    ghost: 'bg-transparent text-gray-300 hover:bg-gray-800 border border-gray-700',
  }
  
  // Size styles
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded font-semibold transition-all duration-200
        ${className}
      `}
    >
      {children}
    </button>
  )
}

export default Button
