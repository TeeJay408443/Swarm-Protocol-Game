import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  dot?: boolean
}

export function Badge({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  dot = false,
}: BadgeProps) {
  const variantClasses = {
    primary: 'bg-cyan-accent text-slate-carbon',
    secondary: 'bg-gray-700 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-hazard-gold text-slate-carbon',
    danger: 'bg-alert-red text-white',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70"></span>
      )}
      {children}
    </span>
  )
}

export default Badge
