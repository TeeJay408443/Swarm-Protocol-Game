/**
 * Post-Game Summary Screen
 * Displays detailed performance statistics after a session ends.
 */

import React from 'react'
import {
  computePostGameMetrics,
  type GameOverStats
} from '../../../config/postGameSummary'

export type { GameOverStats } from '../../../config/postGameSummary'

export interface GameOverScreenProps {
  score: number
  stats: GameOverStats
  isVictory?: boolean
  isEndless?: boolean
  waveReached?: number
  maxWave?: number
  difficultyName?: string
  difficultyCoinLabel?: string
  difficultyColor?: string
  onRestart: () => void
  onQuit: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  stats,
  isVictory = false,
  isEndless = false,
  waveReached,
  maxWave = 15,
  difficultyName,
  difficultyCoinLabel,
  difficultyColor,
  onRestart,
  onQuit
}) => {
  const areaMaxWave = Math.max(1, maxWave)
  const metrics = computePostGameMetrics(stats)
  const endedInEndless = isEndless || (typeof waveReached === 'number' && waveReached > areaMaxWave)

  const waveStatusText = isVictory
    ? endedInEndless
      ? `Endless Record: Reached Wave ${waveReached || areaMaxWave + 1}`
      : `Wave ${areaMaxWave} Final Boss Defeated`
    : waveReached
      ? endedInEndless
        ? `Eliminated on Endless Wave ${waveReached}`
        : `Eliminated on Wave ${waveReached} of ${areaMaxWave}`
      : 'Session Complete'

  const metadataParts: Array<{ key: string; label: string; color?: string }> = []
  if (stats.heroName) {
    metadataParts.push({ key: 'hero', label: stats.heroName })
  }
  if (stats.areaName) {
    metadataParts.push({ key: 'area', label: stats.areaName })
  }
  if (difficultyName) {
    const diffText = difficultyCoinLabel
      ? `${difficultyName} (${difficultyCoinLabel})`
      : difficultyName
    metadataParts.push({
      key: 'difficulty',
      label: diffText,
      color: difficultyColor || '#38BDF8'
    })
  }
  metadataParts.push({ key: 'wave', label: waveStatusText })

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-game-summary-title"
    >
      <div
        className={`my-auto w-full max-w-3xl rounded-xl bg-slate-900 border p-6 sm:p-8 text-left shadow-2xl animate-pop-in ${
          isVictory ? 'border-amber-400/80' : 'border-rose-500/80'
        }`}
      >
        {/* Header: Outcome & Final Score */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold tracking-wide mb-1 ${
                isVictory ? 'text-amber-300' : 'text-rose-400'
              }`}
            >
              {isVictory ? 'Mission Complete' : 'Run Ended'}
            </p>
            <h2
              id="post-game-summary-title"
              className={`font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-balance ${
                isVictory ? 'text-amber-300' : 'text-white'
              }`}
            >
              {isVictory ? 'Victory Summary' : 'Mission Summary'}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
              {metadataParts.map((part, idx) => (
                <React.Fragment key={part.key}>
                  {idx > 0 && (
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <span style={part.color ? { color: part.color, fontWeight: 600 } : undefined}>
                    {part.label}
                  </span>
                </React.Fragment>
              ))}
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <div className="text-xs font-medium text-slate-400">Final Score</div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-cyan-400 leading-tight">
              {score.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
              10×{metrics.survivalSeconds}s + 25×{metrics.coinsCollected}c ={' '}
              {metrics.calculatedScore.toLocaleString()}
            </div>
          </div>
        </header>

        {/* Primary Performance Strip */}
        <section
          aria-label="Key Run Metrics"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-800"
        >
          <div className="bg-slate-950/60 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-400">Damage Dealt</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white mt-0.5">
              {metrics.totalDamageDealt.toLocaleString()}
            </div>
            <div className="text-xs font-mono tabular-nums text-cyan-300/90 mt-1">
              {metrics.averageDps.toLocaleString()} DPS avg
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-400">Enemies Defeated</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-rose-400 mt-0.5">
              {metrics.enemiesDefeated.toLocaleString()}
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-300 mt-1">
              {metrics.bossesDefeated > 0
                ? `${metrics.bossesDefeated} ${metrics.bossesDefeated === 1 ? 'Boss' : 'Bosses'} · ${metrics.killsPerMinute}/min`
                : `${metrics.killsPerMinute} kills/min`}
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-400">Time Survived</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-cyan-300 mt-0.5">
              {metrics.formattedTime}
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-300 mt-1">
              Level {metrics.levelReached}
              {typeof waveReached === 'number' ? ` · Wave ${waveReached}` : ''}
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-400">Battle Coins</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-300 mt-0.5">
              +{metrics.coinsCollected.toLocaleString()}
            </div>
            <div className="text-xs text-slate-300 mt-1">Added to Shop Wallet</div>
          </div>
        </section>

        {/* Detailed Breakdown: Combat Telemetry & Loadout Build */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 py-5">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-200 mb-2">
              Combat Telemetry
            </h3>
            <dl className="divide-y divide-slate-800/80 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-400">Hits Landed</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-100">
                  {metrics.totalHits.toLocaleString()}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-400">Critical Strikes</dt>
                <dd className="font-mono tabular-nums font-semibold text-amber-300">
                  {metrics.criticalHits.toLocaleString()} ({metrics.critRatePercent}%)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-400">Highest Single Hit</dt>
                <dd className="font-mono tabular-nums font-semibold text-white">
                  {metrics.highestHit.toLocaleString()} dmg
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-400">Damage Taken</dt>
                <dd className="font-mono tabular-nums font-semibold text-rose-300">
                  {metrics.totalDamageTaken.toLocaleString()} dmg
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-400">Damage Mitigated</dt>
                <dd className="font-mono tabular-nums font-semibold text-emerald-300">
                  {metrics.damageBlocked.toLocaleString()} dmg
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-400">Best No-Hit Streak</dt>
                <dd className="font-mono tabular-nums font-semibold text-cyan-300">
                  {metrics.damageFreeWaveStreak}{' '}
                  {metrics.damageFreeWaveStreak === 1 ? 'wave' : 'waves'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-sm font-bold text-slate-200">
                Arsenal & Upgrades
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {metrics.sortedUpgrades.length} active
              </span>
            </div>
            {metrics.sortedUpgrades.length > 0 ? (
              <ul className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto pr-1 text-xs sm:text-sm">
                {metrics.sortedUpgrades.map((upg) => (
                  <li
                    key={upg.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-100 truncate">
                        {upg.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {upg.isEquippedWeapon ? `Equipped Weapon · ${upg.category}` : upg.category}
                      </div>
                    </div>
                    <span
                      className={`font-mono tabular-nums text-xs font-bold shrink-0 ${
                        upg.isMaxLevel ? 'text-amber-300' : 'text-cyan-300'
                      }`}
                    >
                      {upg.isMaxLevel ? `Lv.${upg.level} Max` : `Lv.${upg.level}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 py-4">
                No weapon or upgrade modules recorded for this run.
              </p>
            )}
          </div>
        </section>

        {/* Actions Footer */}
        <footer className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Spend earned Battle Coins in the Shop or fuse gear in the Armory.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onQuit}
              className="flex-1 sm:flex-initial min-h-[44px] px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Main Menu
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="flex-1 sm:flex-initial min-h-[44px] px-7 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Play Again
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default GameOverScreen
