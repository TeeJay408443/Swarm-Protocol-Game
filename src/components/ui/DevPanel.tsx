/**
 * Developer Panel Overlay
 * Strictly visible and accessible ONLY when signed in as 408443@guhsd.net.
 */

import React, { useState } from 'react'
import { useSupabase } from '../../hooks/useSupabase'
import { useToast } from './ToastContainer'
import { useShopState } from '../../services/shop'
import {
  DEV_AUTHORIZED_EMAIL,
  dispatchDevAction,
  grantDevCoins,
  isDevAuthorizedEmail,
  resetDevSettings,
  updateDevSettings,
  useDevSettings
} from '../../services/devTools'
import {
  DEV_SPAWNABLE_ENEMIES,
  getDevSpawnableEnemyById,
  SECRET_DEVOURER_OF_GODS_ID
} from '../../config/arenas'

const DAMAGE_PRESETS = [1, 2, 5, 10, 50, 100, 1000]
const HEALTH_MULT_PRESETS = [1, 2, 5, 10]
const COIN_PRESETS = [1000, 10000, 100000]
const SPAWN_COUNT_PRESETS = [1, 5, 10]

export const DevPanel: React.FC = () => {
  const { user } = useSupabase()
  const toast = useToast()
  const { authorized, settings, runStatus } = useDevSettings(user?.email)
  const { shopState } = useShopState(user?.id)

  const [isOpen, setIsOpen] = useState(false)
  const [coinInput, setCoinInput] = useState('5000')
  const [damageInput, setDamageInput] = useState(String(settings.damageMultiplier))
  const [customHealthInput, setCustomHealthInput] = useState('1000')
  const [waveInput, setWaveInput] = useState('15')
  const [selectedEnemyId, setSelectedEnemyId] = useState<string>(
    DEV_SPAWNABLE_ENEMIES[0]?.id || 'ene_01'
  )
  const [spawnCount, setSpawnCount] = useState<number>(1)

  // Strict authorization gate: never render or expose Dev Panel to any other user/guest
  if (!user || !authorized || !isDevAuthorizedEmail(user.email)) {
    return null
  }

  const handleGrantCoins = (amount: number) => {
    const res = grantDevCoins(user.id, user.email, amount)
    if (res.success) {
      toast.success(`Dev: +${amount.toLocaleString()} Battle Coins granted`)
    } else if (res.error) {
      toast.error(res.error)
    }
  }

  const handleSetDamageMultiplier = (mult: number) => {
    const safeMult = Math.max(1, Math.min(10000, Number(mult) || 1))
    setDamageInput(String(safeMult))
    const res = updateDevSettings(user.email, { damageMultiplier: safeMult })
    if (res.success) {
      toast.info(`Dev: Damage Multiplier set to ${res.settings.damageMultiplier}x`)
    }
  }

  const handleSetHealthMultiplier = (mult: number) => {
    const safeMult = Math.max(1, Math.min(1000, Number(mult) || 1))
    const res = updateDevSettings(user.email, { healthMultiplier: safeMult })
    if (res.success) {
      dispatchDevAction(user.email, { type: 'apply_health_multiplier', multiplier: safeMult })
      toast.info(`Dev: Max Health Multiplier set to ${res.settings.healthMultiplier}x`)
    }
  }

  const handleWaveJump = (mode: 'delta' | 'set', value: number) => {
    const target = Math.max(1, Math.floor(value))
    if (runStatus.isInRun) {
      dispatchDevAction(user.email, { type: 'skip_wave', mode, value })
      toast.success(
        mode === 'delta'
          ? `Dev: Skipped +${value} wave${value > 1 ? 's' : ''}`
          : `Dev: Warped to Wave ${target}`
      )
    } else if (mode === 'set') {
      updateDevSettings(user.email, { startingWaveOverride: target })
      toast.info(`Dev: Next run will start on Wave ${target}`)
    } else {
      const nextWave = Math.max(1, settings.startingWaveOverride + value)
      updateDevSettings(user.email, { startingWaveOverride: nextWave })
      toast.info(`Dev: Starting Wave set to ${nextWave}`)
    }
  }

  const selectedSpawnOption = getDevSpawnableEnemyById(selectedEnemyId) || DEV_SPAWNABLE_ENEMIES[0]

  const handleSpawnEnemy = (enemyId: string, requestedCount = 1) => {
    if (!runStatus.isInRun) {
      toast.warning('Start an Arena run first to spawn enemies.')
      return
    }
    const target = getDevSpawnableEnemyById(enemyId)
    if (!target) return
    const safeCount = target.isBoss ? 1 : Math.max(1, Math.min(25, Math.floor(requestedCount)))
    const res = dispatchDevAction(user.email, {
      type: 'spawn_enemy',
      enemyId: target.id,
      count: safeCount
    })
    if (res.success) {
      if (target.id === SECRET_DEVOURER_OF_GODS_ID) {
        setIsOpen(false)
      } else {
        toast.success(
          `Dev: Spawned ${safeCount > 1 ? `${safeCount}× ` : ''}${target.name}`
        )
      }
    } else if (res.error) {
      toast.error(res.error)
    }
  }

  return (
    <>
      {/* Floating Dev Trigger Button (bottom-left so it never overlaps audio/D-pad) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 left-4 z-50 px-3.5 py-2 rounded-full bg-slate-950/95 hover:bg-slate-900 border-2 border-emerald-400 text-emerald-300 font-mono font-bold text-xs shadow-[0_0_20px_rgba(52,211,153,0.35)] flex items-center gap-2 transition-all cursor-pointer"
        aria-label="Open Developer Panel"
        title={`Developer Console (${DEV_AUTHORIZED_EMAIL})`}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>DEV PANEL</span>
        {settings.damageMultiplier > 1 && (
          <span className="text-amber-300">{settings.damageMultiplier}x DMG</span>
        )}
        {settings.godMode && <span className="text-cyan-300">GOD</span>}
      </button>

      {isOpen && (
        <div
          className="fixed bottom-16 left-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] max-h-[82vh] overflow-y-auto bg-slate-950/95 backdrop-blur-md border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.28)] p-4 text-white"
          role="dialog"
          aria-label="Developer Control Panel"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Authorized Dev Console
              </div>
              <h3 className="text-base font-extrabold text-white leading-tight">
                {user.email}
              </h3>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {runStatus.isInRun
                  ? `ACTIVE RUN • WAVE ${runStatus.currentWave} (${runStatus.areaId})`
                  : `STANDBY • START WAVE ${settings.startingWaveOverride}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              aria-label="Close Developer Panel"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Coins Injector */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 uppercase tracking-wider">
                  1. Battle Coins
                </span>
                <span className="font-mono text-amber-200">
                  Wallet: {shopState.balance.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {COIN_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleGrantCoins(amt)}
                    className="px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-mono font-bold transition-colors"
                  >
                    +{(amt / 1000).toLocaleString()}K
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={coinInput}
                  onChange={(e) => setCoinInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-400"
                  placeholder="Amount"
                  aria-label="Custom coin grant amount"
                />
                <button
                  type="button"
                  onClick={() => handleGrantCoins(Math.max(1, Number(coinInput) || 0))}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold transition-colors"
                >
                  Give Coins
                </button>
              </div>
            </section>

            {/* 2. Damage Multiplier */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 uppercase tracking-wider">
                  2. Damage Multiplier
                </span>
                <span className="font-mono font-bold text-rose-200">
                  {settings.damageMultiplier}x
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAMAGE_PRESETS.map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => handleSetDamageMultiplier(mult)}
                    className={`px-2 py-1 rounded-lg font-mono font-bold border transition-colors ${
                      settings.damageMultiplier === mult
                        ? 'bg-rose-500 text-white border-rose-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step="0.5"
                  value={damageInput}
                  onChange={(e) => setDamageInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-rose-400"
                  aria-label="Custom damage multiplier"
                />
                <button
                  type="button"
                  onClick={() => handleSetDamageMultiplier(Number(damageInput))}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-extrabold transition-colors"
                >
                  Apply DMG
                </button>
              </div>
            </section>

            {/* 3. Health Controls */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 uppercase tracking-wider">
                  3. Health & God Mode
                </span>
                <span className="font-mono text-emerald-200">
                  Max HP: {settings.healthMultiplier}x
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    dispatchDevAction(user.email, { type: 'heal_full' })
                    toast.success('Dev: Restored 100% HP')
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-200 font-bold"
                >
                  Full Heal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextGod = !settings.godMode
                    updateDevSettings(user.email, { godMode: nextGod })
                    toast.info(`Dev: Invincibility ${nextGod ? 'ENABLED' : 'DISABLED'}`)
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold border transition-colors ${
                    settings.godMode
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {settings.godMode ? 'God Mode: ON' : 'God Mode: OFF'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {HEALTH_MULT_PRESETS.map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => handleSetHealthMultiplier(mult)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold border transition-colors ${
                      settings.healthMultiplier === mult
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {mult}x HP
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const bonus = Math.max(1, Number(customHealthInput) || 500)
                    dispatchDevAction(user.email, { type: 'add_max_health', amount: bonus })
                    toast.success(`Dev: +${bonus} Max & Current HP`)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/50 text-emerald-200 font-bold"
                >
                  +Max HP
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={customHealthInput}
                  onChange={(e) => setCustomHealthInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-400"
                  aria-label="Custom health value"
                />
                <button
                  type="button"
                  onClick={() => {
                    const amt = Math.max(1, Number(customHealthInput) || 100)
                    dispatchDevAction(user.email, { type: 'set_health', amount: amt })
                    toast.info(`Dev: Health set to ${amt}`)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold transition-colors"
                >
                  Set HP
                </button>
              </div>
            </section>

            {/* 4. Wave Skips */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 uppercase tracking-wider">
                  4. Wave Skips
                </span>
                <span className="font-mono text-cyan-200">
                  {runStatus.isInRun ? `Now: W${runStatus.currentWave}` : `Start: W${settings.startingWaveOverride}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleWaveJump('delta', 1)}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 font-bold"
                >
                  +1 Wave
                </button>
                <button
                  type="button"
                  onClick={() => handleWaveJump('delta', 5)}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 font-bold"
                >
                  +5 Waves
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 21].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleWaveJump('set', w)}
                    className={`px-2 py-1 rounded-lg font-mono font-bold border transition-colors ${
                      w === 15 || w === 20
                        ? 'bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border-amber-400/60'
                        : w >= 21
                          ? 'bg-purple-500/25 hover:bg-purple-500/40 text-purple-200 border-purple-400/60'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    W{w}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={waveInput}
                  onChange={(e) => setWaveInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                  aria-label="Target wave number"
                />
                <button
                  type="button"
                  onClick={() => handleWaveJump('set', Math.max(1, Number(waveInput) || 1))}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold transition-colors"
                >
                  Skip to Wave
                </button>
              </div>
            </section>

            {/* 5. Spawn Enemy & Secret Calamity Boss */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fuchsia-300 uppercase tracking-wider">
                  5. Spawn Enemy
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {runStatus.isInRun ? 'Arena Ready' : 'Requires Active Run'}
                </span>
              </div>

              <select
                value={selectedEnemyId}
                onChange={(e) => {
                  const nextId = e.target.value
                  setSelectedEnemyId(nextId)
                  const nextOpt = getDevSpawnableEnemyById(nextId)
                  if (nextOpt?.isBoss) setSpawnCount(1)
                }}
                aria-label="Select enemy to spawn"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-fuchsia-400"
              >
                {(['Area 1', 'Area 2', 'Bosses', 'Secret Boss'] as const).map((group) => (
                  <optgroup key={group} label={group}>
                    {DEV_SPAWNABLE_ENEMIES.filter((item) => item.group === group).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                {!selectedSpawnOption.isBoss &&
                  SPAWN_COUNT_PRESETS.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSpawnCount(cnt)}
                      className={`px-2 py-1.5 rounded-lg font-mono font-bold border transition-colors ${
                        spawnCount === cnt
                          ? 'bg-fuchsia-500 text-slate-950 border-fuchsia-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      {cnt}x
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => handleSpawnEnemy(selectedEnemyId, spawnCount)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Spawn {selectedSpawnOption.isBoss ? 'Boss' : `${spawnCount}x Enemy`}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSpawnEnemy(SECRET_DEVOURER_OF_GODS_ID, 1)}
                className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-950 via-indigo-950 to-fuchsia-950 hover:from-cyan-900 hover:to-fuchsia-900 border border-cyan-400/70 text-cyan-200 font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
              >
                Summon Devourer of Gods (Secret Boss)
              </button>
            </section>

            {/* Footer Reset */}
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => {
                  resetDevSettings(user.email)
                  dispatchDevAction(user.email, { type: 'apply_health_multiplier', multiplier: 1 })
                  setDamageInput('1')
                  toast.info('Dev overrides reset to defaults')
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Reset Defaults
              </button>
              <span className="text-[10px] font-mono text-slate-500">
                Restricted: {DEV_AUTHORIZED_EMAIL}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DevPanel
