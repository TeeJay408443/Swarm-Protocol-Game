/**
 * HUD Component
 * Phase 7 & 9: Real-time 60 FPS Heads-Up Display
 */

import React from 'react'
import { getXpForNextLevel, WAVE_CONFIG } from '../../../config/gameConstants'

export interface HUDProps {
  score: number
  coins: number
  xp: number
  xpToNext?: number
  level: number
  health: number
  maxHealth: number
  wave: number
  time: number
  enemiesDefeated: number
  waveTimeRemaining?: number
  isBreather?: boolean
  isEndless?: boolean
  heroName?: string
  heroAbilityTag?: string
  areaName?: string
  activeUpgrades?: string[]
  shieldActive?: boolean
  hasSpaceDash?: boolean
  dashCooldown?: number
  onPause: () => void
}

const HUD: React.FC<HUDProps> = ({
  score,
  coins,
  xp,
  xpToNext,
  level,
  health,
  maxHealth,
  wave,
  time,
  enemiesDefeated,
  waveTimeRemaining,
  isBreather = false,
  isEndless = false,
  heroName,
  heroAbilityTag,
  areaName,
  activeUpgrades = [],
  shieldActive = false,
  hasSpaceDash = false,
  dashCooldown = 0,
  onPause
}) => {
  const xpForNextLevel = Math.max(1, xpToNext ?? getXpForNextLevel(level))
  const xpDisplay = Math.max(0, Math.floor(xp))
  const xpProgress = Math.min(100, Math.max(0, (xpDisplay / xpForNextLevel) * 100))
  const healthPercent = maxHealth > 0 ? Math.max(0, Math.min(100, (health / maxHealth) * 100)) : 0
  const isFinalBossWave = wave === WAVE_CONFIG.MAX_WAVE && !isEndless

  const formatTime = (seconds: number): string => {
    const safe = Math.max(0, Math.floor(seconds))
    const mins = Math.floor(safe / 60)
    const secs = safe % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* Top HUD */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-gray-700/80">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center space-x-2">
              <span className="text-cyan-400 font-bold text-sm sm:text-lg">SCORE</span>
              <span className="text-white font-bold text-sm sm:text-xl font-mono">
                {score.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-yellow-400 font-bold text-base sm:text-lg">🪙</span>
              <span className="text-hazard-gold font-bold text-sm sm:text-xl font-mono">{coins}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-gray-400 text-xs uppercase">Time</span>
              <span className="text-white font-mono text-sm sm:text-lg">{formatTime(time)}</span>
            </div>

            {heroName && (
              <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
                <span className="text-cyan-accent">{heroName}</span>
                {heroAbilityTag && (
                  <span className="text-amber-300/90 font-mono text-[11px]">
                    [{heroAbilityTag}]
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div
                className={`text-xs font-bold uppercase ${
                  isBreather
                    ? 'text-hazard-gold'
                    : isFinalBossWave
                      ? 'text-alert-red'
                      : 'text-cyan-accent'
                }`}
              >
                {areaName && <span className="text-gray-400 mr-1.5">{areaName} ·</span>}
                {isBreather
                  ? 'BREATHER WINDOW'
                  : isFinalBossWave
                    ? `WAVE ${wave} / ${WAVE_CONFIG.MAX_WAVE} • FINAL BOSS`
                    : isEndless
                      ? `WAVE ${wave} • ENDLESS${wave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0 ? ' • BOSS' : ''}`
                      : `WAVE ${wave} / ${WAVE_CONFIG.MAX_WAVE}${wave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0 ? ' • BOSS' : ''}`}
              </div>
              {isFinalBossWave && !isBreather ? (
                <div className="text-xs text-hazard-gold font-mono font-semibold">
                  DEFEAT FINAL BOSS • NO TIME LIMIT
                </div>
              ) : (
                typeof waveTimeRemaining === 'number' && (
                  <div className="text-xs text-gray-300 font-mono">
                    {Math.ceil(waveTimeRemaining)}s left
                  </div>
                )
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onPause()
              }}
              className="pointer-events-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-gray-600 text-white font-bold text-xs sm:text-sm rounded transition-colors"
              aria-label="Pause game"
            >
              PAUSE
            </button>
          </div>
        </div>

        {/* Health & XP Bars */}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-slate-900/80 rounded p-2 border border-gray-800">
            <div className="flex justify-between items-center text-xs text-white/80 mb-1 gap-2">
              <span>HP: {Math.ceil(health)}/{maxHealth}</span>
              <div className="flex items-center gap-2">
                {hasSpaceDash && (
                  <span
                    className={`font-mono font-bold ${
                      dashCooldown <= 0 ? 'text-yellow-300' : 'text-slate-400'
                    }`}
                  >
                    {dashCooldown <= 0
                      ? '⚡ [SPACE] DASH READY'
                      : `⏳ DASH ${dashCooldown.toFixed(1)}s`}
                  </span>
                )}
                {shieldActive && <span className="text-cyan-accent font-semibold">🛡️ SHIELD READY</span>}
              </div>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-alert-red transition-all duration-150"
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/80 rounded p-2 border border-gray-800">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span className="text-cyan-400 font-bold">LEVEL {level}</span>
              <span>XP: {xpDisplay}/{xpForNextLevel}</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-200"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="flex items-end justify-between gap-2">
        <div className="bg-slate-900/85 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-800 text-xs text-gray-300 space-y-1">
          <div>
            Kills: <span className="text-white font-bold">{enemiesDefeated}</span>
          </div>
          {activeUpgrades.length > 0 && (
            <div className="hidden sm:block text-cyan-accent max-w-md truncate">
              Weapons: {activeUpgrades.join(' • ')}
            </div>
          )}
        </div>

        <div className="bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-800">
          <span className="text-xs text-cyan-400 font-mono">S = 10t + 25c</span>
        </div>
      </div>
    </div>
  )
}

export default HUD
