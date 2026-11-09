import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  onClick?: () => void
}

export function Card({
  children,
  className = '',
  padding = 'md',
  hoverable = false,
  onClick,
}: CardProps) {
  // Padding classes
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }
  
  return (
    <div
      onClick={onClick}
      className={`
        bg-gray-800 rounded-lg border border-gray-700
        ${hoverable || onClick ? 'hover:border-cyan-accent transition-colors cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default Card
