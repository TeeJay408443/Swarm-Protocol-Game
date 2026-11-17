/**
 * Level Up Modal
 * Phase 7: Build the Game - Level Up System (Zero-jitter hover layout)
 */

import React, { useState, useEffect } from 'react'

export interface UpgradeOption {
  id: string
  name: string
  category: string
  damage: number
  cooldown: number
  currentLevel?: number
  nextLevel?: number
  description?: string
  perkHint?: string
  overdriveHint?: string
}

export interface LevelUpModalProps {
  level: number
  options: UpgradeOption[]
  onSelect: (upgradeId: string) => void
  currentHealth?: number
  maxHealth?: number
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({
  level,
  options,
  onSelect,
  currentHealth,
  maxHealth
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

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
        return 'bg-purple-500 text-white'
      case 'AoE Weapon':
        return 'bg-orange-500 text-white'
      case 'Beam Weapon':
        return 'bg-cyan-500 text-slate-950'
      case 'Utility':
        return 'bg-green-500 text-slate-950'
      case 'Projectile':
        return 'bg-yellow-500 text-slate-950'
      case 'Ranged':
        return 'bg-blue-500 text-white'
      case 'Heavy AoE':
        return 'bg-red-500 text-white'
      case 'Melee Weapon':
        return 'bg-pink-500 text-white'
      case 'Passive':
        return 'bg-indigo-500 text-white'
      case 'Defensive':
        return 'bg-teal-500 text-slate-950'
      default:
        return 'bg-gray-500 text-white'
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

  const safeMax = Math.max(1, maxHealth ?? 100)
  const safeCur = currentHealth ?? safeMax
  const missing = Math.max(0, Math.round(safeMax - safeCur))
  const healAmount = Math.max(15, Math.round(safeMax * 0.4))
  const effectiveHeal = Math.min(missing, healAmount)
  const isFullHp = missing <= 0

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50">
      <div className="bg-slate-800 border-2 border-cyan-500 rounded-xl p-6 sm:p-8 max-w-3xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-5">
          <h2 className="text-3xl sm:text-4xl font-bold text-cyan-400 mb-1">LEVEL UP!</h2>
          <p className="text-white text-lg">Operative Level {level}</p>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Upgrades start weak at Lv 1 and gain extra projectiles, radius, or Overdrive per level
          </p>
        </div>

        {/* Options Grid (stable sizing — zero hover scale or dynamic panels to prevent jitter) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 items-stretch">
          {options.map((option) => {
            const isSelected = selectedOption === option.id
            const categoryColor = getCategoryColor(option.category)
            const categoryIcon = getCategoryIcon(option.category)
            const currentLv = option.currentLevel ?? 0
            const nextLv = option.nextLevel ?? 1
            const isEvolution = nextLv >= 5

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={`
                  flex flex-col justify-between text-left rounded-lg p-4 border-2 transition-colors duration-150 cursor-pointer
                  ${
                    isEvolution
                      ? 'bg-slate-900 border-hazard-gold hover:bg-slate-900/90'
                      : isSelected
                        ? 'bg-slate-700 border-cyan-400 hover:border-cyan-300'
                        : 'bg-slate-700 border-slate-600 hover:border-cyan-400/80 hover:bg-slate-700/90'
                  }
                `}
              >
                <div>
                  {/* Level Progression Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        isEvolution
                          ? 'bg-hazard-gold text-slate-950'
                          : currentLv === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      }`}
                    >
                      {isEvolution
                        ? 'LV 4 → LV 5 MAX'
                        : currentLv === 0
                          ? 'NEW • LV 1'
                          : `LV ${currentLv} → LV ${nextLv}`}
                    </span>
                    <span className="text-xl">{categoryIcon}</span>
                  </div>

                  {/* Category Tag */}
                  <div className="mb-2">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${categoryColor}`}>
                      {option.category}
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3 className="text-white font-bold text-base sm:text-lg mb-1.5">{option.name}</h3>

                  {option.description && (
                    <p className="text-xs text-gray-300 mb-2.5 line-clamp-2">{option.description}</p>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {/* Card Stats */}
                  <div className="space-y-0.5">
                    {option.damage > 0 && (
                      <div className="text-red-300 text-xs font-semibold">
                        Damage: {option.damage}
                      </div>
                    )}
                    {option.cooldown > 0 && (
                      <div className="text-cyan-300 text-xs font-semibold">
                        Cooldown: {option.cooldown}s
                      </div>
                    )}
                  </div>

                  {/* Per-level Growth / Lv 5 Overdrive Callout */}
                  {(option.overdriveHint || option.perkHint) && (
                    <div
                      className={`p-2 rounded text-[11px] font-semibold border ${
                        isEvolution
                          ? 'bg-hazard-gold/15 border-hazard-gold/40 text-hazard-gold'
                          : 'bg-cyan-950/50 border-cyan-500/30 text-cyan-200'
                      }`}
                    >
                      {isEvolution ? `⚡ ${option.overdriveHint}` : `▲ ${option.perkHint}`}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Heal Instead Option */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => handleSelect('heal_instead')}
            className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border-2 border-emerald-400/60 hover:border-emerald-300 text-left transition-colors duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💚</span>
              <div>
                <div className="text-emerald-300 font-bold text-sm sm:text-base">
                  Skip Upgrade &amp; Emergency Repair
                </div>
                <div className="text-emerald-100/80 text-xs">
                  {isFullHp
                    ? 'Already at full HP — reinforces hull with +5 Max HP instead'
                    : `Restores up to +${healAmount} HP (+${effectiveHeal} HP right now)`}
                </div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 rounded self-start sm:self-center">
              HP {Math.round(safeCur)} / {Math.round(safeMax)}
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-white/60 text-xs">
          Click an upgrade or choose Emergency Repair to continue playing
        </div>
      </div>
    </div>
  )
}

export default LevelUpModal
