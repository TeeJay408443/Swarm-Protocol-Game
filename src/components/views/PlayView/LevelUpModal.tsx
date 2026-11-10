/**
 * Level Up Modal
 * Phase 7: Build the Game - Level Up System
 */

import React, { useState, useEffect } from 'react'

interface UpgradeOption {
  id: string
  name: string
  category: string
  damage: number
  cooldown: number
}

interface LevelUpModalProps {
  level: number
  options: UpgradeOption[]
  onSelect: (upgradeId: string) => void
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ level, options, onSelect }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<string | null>(null)

  // Auto-select first option on mount
  useEffect(() => {
    if (options.length > 0) {
      setSelectedOption(options[0].id)
    }
  }, [options])

  // Handle selection
  const handleSelect = (upgradeId: string) => {
    setSelectedOption(upgradeId)
    onSelect(upgradeId)
  }

  // Get category color
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Summon':
        return 'bg-purple-500'
      case 'AoE Weapon':
        return 'bg-orange-500'
      case 'Beam Weapon':
        return 'bg-cyan-500'
      case 'Utility':
        return 'bg-green-500'
      case 'Projectile':
        return 'bg-yellow-500'
      case 'Ranged':
        return 'bg-blue-500'
      case 'Heavy AoE':
        return 'bg-red-500'
      case 'Melee Weapon':
        return 'bg-pink-500'
      case 'Passive':
        return 'bg-indigo-500'
      case 'Defensive':
        return 'bg-teal-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Get category icon
  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'Summon':
        return '🤖'
      case 'AoE Weapon':
        return '💥'
      case 'Beam Weapon':
        return '⚡'
      case 'Utility':
        return '🔧'
      case 'Projectile':
        return '🎯'
      case 'Ranged':
        return '🏹'
      case 'Heavy AoE':
        return '💣'
      case 'Melee Weapon':
        return '⚔️'
      case 'Passive':
        return '🛡️'
      case 'Defensive':
        return '🔒'
      default:
        return '❓'
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50">
      <div className="bg-slate-800 border-2 border-cyan-500 rounded-xl p-8 max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-cyan-400 mb-2">LEVEL UP!</h2>
          <p className="text-white text-lg">Level {level}</p>
          <p className="text-white/80 text-sm mt-2">Choose an upgrade to continue</p>
        </div>
        
        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {options.map((option, index) => {
            const isSelected = selectedOption === option.id
            const categoryColor = getCategoryColor(option.category)
            const categoryIcon = getCategoryIcon(option.category)
            
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setShowDetails(option.id)}
                onMouseLeave={() => setShowDetails(null)}
                className={`
                  relative bg-slate-700 rounded-lg p-4 transition-all duration-200
                  ${isSelected ? 'ring-2 ring-cyan-500' : 'hover:ring-1 ring-cyan-400/50'}
                  ${isSelected ? 'transform scale-105' : ''}
                `}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${categoryColor}`}>
                    {option.category}
                  </div>
                  <span className="text-2xl">{categoryIcon}</span>
                </div>
                
                {/* Card Title */}
                <h3 className="text-white font-bold text-lg mb-2">{option.name}</h3>
                
                {/* Card Stats */}
                <div className="space-y-1 text-left">
                  {option.damage > 0 && (
                    <div className="text-red-400 text-sm">
                      Damage: {option.damage}
                    </div>
                  )}
                  {option.cooldown > 0 && (
                    <div className="text-cyan-400 text-sm">
                      Cooldown: {option.cooldown}s
                    </div>
                  )}
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 bg-cyan-500/10 rounded-lg pointer-events-none" />
                )}
              </button>
            )
          })}
        </div>
        
        {/* Details Panel */}
        {showDetails && (
          <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30">
            {options.find(o => o.id === showDetails) && (
              <>
                <h4 className="text-white font-bold mb-2">
                  {options.find(o => o.id === showDetails)!.name}
                </h4>
                <p className="text-white/80 text-sm">
                  {options.find(o => o.id === showDetails)!.category}
                </p>
              </>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="text-center text-white/60 text-xs mt-4">
          Click an upgrade to continue playing
        </div>
      </div>
    </div>
  )
}

export default LevelUpModal
