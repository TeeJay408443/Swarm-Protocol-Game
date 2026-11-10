/**
 * Empty State Component
 * Phase 8: Features & Polish - Tactical Empty States
 */

import React, { ReactNode } from 'react'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost'
  }
  className?: string
  compact?: boolean
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className = '',
  compact = false
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${compact ? 'py-8' : 'py-16'}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      {icon && (
        <div className="mb-6 text-6xl">
          {icon}
        </div>
      )}
      
      {/* Title */}
      <h3
        className={`
          font-bold text-xl
          ${compact ? 'text-lg' : 'text-2xl'}
          text-white mb-2
        `}
      >
        {title}
      </h3>
      
      {/* Message */}
      <p
        className={`
          text-white/70
          ${compact ? 'text-sm max-w-xs' : 'text-lg max-w-md'}
          mb-6
        `}
      >
        {message}
      </p>
      
      {/* Action Button */}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'primary'}
          size={compact ? 'sm' : 'md'}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Pre-built empty states for different views

interface CodexEmptyStateProps {
  onClearFilters?: () => void
  className?: string
}

export const CodexEmptyState: React.FC<CodexEmptyStateProps> = ({
  onClearFilters,
  className
}) => {
  return (
    <EmptyState
      icon="📖"
      title="No Entities Found"
      message="Try adjusting your search or filter criteria to find entities."
      action={onClearFilters ? {
        label: 'Clear Filters',
        onClick: onClearFilters,
        variant: 'secondary'
      } : undefined}
      className={className}
    />
  )
}

interface ArmoryEmptyStateProps {
  onCreateLoadout: () => void
  className?: string
}

export const ArmoryEmptyState: React.FC<ArmoryEmptyStateProps> = ({
  onCreateLoadout,
  className
}) => {
  return (
    <EmptyState
      icon="⚔️"
      title="No Loadouts Created"
      message="Create your first loadout to start playing with different hero and upgrade combinations."
      action={{
        label: 'Create Loadout',
        onClick: onCreateLoadout,
        variant: 'primary'
      }}
      className={className}
    />
  )
}

interface LeaderboardsEmptyStateProps {
  onPlayNow?: () => void
  className?: string
}

export const LeaderboardsEmptyState: React.FC<LeaderboardsEmptyStateProps> = ({
  onPlayNow,
  className
}) => {
  return (
    <EmptyState
      icon="🏆"
      title="No Scores Yet"
      message="Be the first to play and set a high score for others to beat!"
      action={onPlayNow ? {
        label: 'Play Now',
        onClick: onPlayNow,
        variant: 'primary'
      } : undefined}
      className={className}
    />
  )
}

interface ProfileEmptyStateProps {
  onViewChallenges?: () => void
  className?: string
}

export const ProfileEmptyState: React.FC<ProfileEmptyStateProps> = ({
  onViewChallenges,
  className
}) => {
  return (
    <EmptyState
      icon="🎖️"
      title="No Achievements Unlocked"
      message="Complete in-game challenges to earn badges and show off your skills."
      action={onViewChallenges ? {
        label: 'View Challenges',
        onClick: onViewChallenges,
        variant: 'secondary'
      } : undefined}
      className={className}
    />
  )
}

// Generic empty state with common icons
interface GenericEmptyStateProps {
  type: 'search' | 'data' | 'error' | 'success' | 'custom'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost'
  }
  className?: string
}

export const GenericEmptyState: React.FC<GenericEmptyStateProps> = ({
  type,
  title,
  message,
  action,
  className
}) => {
  const getIcon = () => {
    switch (type) {
      case 'search':
        return '🔍'
      case 'data':
        return '📊'
      case 'error':
        return '❌'
      case 'success':
        return '✅'
      case 'custom':
      default:
        return 'ℹ️'
    }
  }

  return (
    <EmptyState
      icon={getIcon()}
      title={title}
      message={message}
      action={action}
      className={className}
    />
  )
}

export default EmptyState
