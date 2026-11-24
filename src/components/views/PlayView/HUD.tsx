/**
 * HUD Component
 * Phase 7 & 9: Real-time 60 FPS Heads-Up Display
 */

import React from 'react'
import { getXpForNextLevel, WAVE_CONFIG } from '../../../config/gameConstants'

export interface ActiveBossHudState {
  title: string
  health: number
  maxHealth: number
  phase: number
  totalPhases: number
  damageReduction: number
  isEnraged: boolean
  isFinalBoss: boolean
}

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
  difficultyName?: string
  difficultyCoinLabel?: string
  activeUpgrades?: string[]
  shieldActive?: boolean
  hasSpaceDash?: boolean
  dashCooldown?: number
  activeBoss?: ActiveBossHudState | null
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
  difficultyName,
  difficultyCoinLabel,
  activeUpgrades = [],
  shieldActive = false,
  hasSpaceDash = false,
  dashCooldown = 0,
  activeBoss = null,
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

  const bossHpPct = activeBoss
    ? Math.max(0, Math.min(100, (activeBoss.health / Math.max(1, activeBoss.maxHealth)) * 100))
    : 0
  const bossPhaseLabel = activeBoss
    ? activeBoss.totalPhases >= 3
      ? activeBoss.phase >= 3
        ? 'PHASE 3 • OVERDRIVE'
        : activeBoss.phase === 2
          ? 'PHASE 2 • CROSSFIRE'
          : 'PHASE 1'
      : activeBoss.isEnraged
        ? 'ENRAGED'
        : activeBoss.totalPhases === 2
          ? 'PHASE 1'
          : ''
    : ''

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-3">
      {/* Top HUD Stack (Clean, compact vertical hierarchy so Boss HP is always unobscured) */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-gray-700/80">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <div className="flex items-center space-x-1.5">
              <span className="text-cyan-400 font-bold text-xs sm:text-sm">SCORE</span>
              <span className="text-white font-bold text-sm sm:text-lg font-mono tabular-nums">
                {score.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-yellow-400 font-bold text-sm sm:text-base">🪙</span>
              <span className="text-hazard-gold font-bold text-sm sm:text-lg font-mono tabular-nums">
                {coins}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-gray-400 text-[11px] uppercase">Time</span>
              <span className="text-white font-mono text-xs sm:text-base tabular-nums">
                {formatTime(time)}
              </span>
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
                {difficultyName && (
                  <span className="text-amber-300 mr-1.5">
                    {difficultyName}
                    {difficultyCoinLabel ? ` (${difficultyCoinLabel})` : ''} ·
                  </span>
                )}
                {isBreather
                  ? 'BREATHER WINDOW'
                  : isFinalBossWave
                    ? `WAVE ${wave} / ${WAVE_CONFIG.MAX_WAVE} • FINAL BOSS`
                    : isEndless
                      ? `WAVE ${wave} • ENDLESS${wave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0 ? ' • BOSS' : ''}`
                      : `WAVE ${wave} / ${WAVE_CONFIG.MAX_WAVE}${wave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0 ? ' • BOSS' : ''}`}
              </div>
              {isFinalBossWave && !isBreather ? (
                <div className="text-[11px] text-hazard-gold font-mono font-semibold">
                  DEFEAT FINAL BOSS • NO TIME LIMIT
                </div>
              ) : (
                typeof waveTimeRemaining === 'number' && (
                  <div className="text-[11px] text-gray-300 font-mono tabular-nums">
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
              className="pointer-events-auto px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-gray-600 text-white font-bold text-xs rounded transition-colors cursor-pointer"
              aria-label="Pause game"
            >
              PAUSE
            </button>
          </div>
        </div>

        {/* Health & XP Bars */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/85 rounded-lg px-2.5 py-1.5 border border-gray-800">
            <div className="flex justify-between items-center text-[11px] text-white/85 mb-1 gap-2">
              <span className="font-mono font-semibold tabular-nums">
                HP: {Math.ceil(health)}/{maxHealth}
              </span>
              <div className="flex items-center gap-2 truncate">
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
                {shieldActive && <span className="text-cyan-accent font-semibold">🛡️ SHIELD</span>}
              </div>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-alert-red transition-all duration-150"
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/85 rounded-lg px-2.5 py-1.5 border border-gray-800">
            <div className="flex justify-between text-[11px] text-white/85 mb-1">
              <span className="text-cyan-400 font-bold font-mono">LEVEL {level}</span>
              <span className="font-mono tabular-nums">
                XP: {xpDisplay}/{xpForNextLevel}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-200"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dedicated Boss Health Bar (positioned cleanly below Player HP/XP so it is never obscured) */}
        {activeBoss && (
          <div
            className={`max-w-2xl mx-auto w-full bg-slate-950/92 backdrop-blur-sm rounded-lg px-3 py-1.5 border shadow-lg ${
              activeBoss.phase >= 3 || activeBoss.isEnraged
                ? 'border-rose-500 shadow-rose-950/50'
                : activeBoss.phase === 2
                  ? 'border-sky-400 shadow-sky-950/50'
                  : 'border-amber-400/75 shadow-amber-950/30'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-display font-bold text-amber-300 truncate">
                  ⚠ {activeBoss.title}
                </span>
                {bossPhaseLabel && (
                  <span
                    className={`font-mono font-bold text-[11px] shrink-0 ${
                      activeBoss.phase >= 3 || activeBoss.isEnraged
                        ? 'text-rose-400'
                        : activeBoss.phase === 2
                          ? 'text-sky-300'
                          : 'text-amber-200'
                    }`}
                  >
                    · {bossPhaseLabel}
                  </span>
                )}
                {activeBoss.damageReduction > 0 && (
                  <span className="font-mono text-[11px] text-slate-300 shrink-0">
                    · ARMOR {Math.round(activeBoss.damageReduction * 100)}%
                  </span>
                )}
              </div>
              <span className="font-mono font-bold text-white tabular-nums shrink-0">
                {Math.ceil(activeBoss.health).toLocaleString()} /{' '}
                {activeBoss.maxHealth.toLocaleString()} ({Math.ceil(bossHpPct)}%)
              </span>
            </div>
            <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
              <div
                className={`h-full transition-all duration-100 ${
                  activeBoss.phase >= 3 || activeBoss.isEnraged
                    ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-400'
                    : activeBoss.phase === 2
                      ? 'bg-gradient-to-r from-sky-500 via-rose-500 to-amber-400'
                      : 'bg-gradient-to-r from-rose-600 to-amber-500'
                }`}
                style={{ width: `${bossHpPct}%` }}
              />
              {activeBoss.totalPhases >= 3 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                    style={{ left: '33%' }}
                    title="Phase 3 Threshold (33%)"
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                    style={{ left: '66%' }}
                    title="Phase 2 Threshold (66%)"
                  />
                </>
              )}
              {activeBoss.totalPhases === 2 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                  style={{ left: '50%' }}
                  title="Enrage Threshold (50%)"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div className="flex items-end justify-between gap-2">
        <div className="bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-300 flex items-center gap-3">
          <span>
            Kills: <span className="text-white font-bold font-mono tabular-nums">{enemiesDefeated}</span>
          </span>
          {activeUpgrades.length > 0 && (
            <span className="hidden sm:inline text-cyan-accent max-w-xl truncate">
              · {activeUpgrades.join(' • ')}
            </span>
          )}
        </div>

        <div className="bg-slate-900/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-gray-800">
          <span className="text-[11px] text-cyan-400 font-mono">S = 10t + 25c</span>
        </div>
      </div>
    </div>
  )
}

export default HUD
