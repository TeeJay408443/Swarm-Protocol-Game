import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { upgrades } from '../../../db/seedData'
import { ALL_HEROES, getUnlockableHeroSpec } from '../../../config/unlockableHeroes'
import { AREA_TWO_UPGRADES } from '../../../config/areaUpgrades'
import { UNIVERSAL_CRIT_UPGRADES } from '../../../config/critSystem'
import { GAME_CONFIG } from '../../../config/gameConstants'
import { ArenaId, GAME_AREAS, getAreaById, isAreaUnlocked } from '../../../config/arenas'
import {
  DifficultyId,
  formatDifficultyCoinLabel,
  GAME_DIFFICULTIES,
  getDifficultyById,
  getStoredDifficultyId,
  isValidDifficultyId,
  saveDifficultyId
} from '../../../config/difficulties'
import { useLoadouts } from '../../../hooks/useLoadouts'
import { useSupabase } from '../../../hooks/useSupabase'
import { getPlayerTelemetry } from '../../../services/scores'
import {
  MAX_EQUIPPED_ACCESSORIES,
  shopWeaponsAsUpgrades,
  useShopState
} from '../../../services/shop'
import { formatMasteryBonusSummary, useHeroMastery } from '../../../services/heroMastery'
import {
  formatHeroUpgradeStats,
  getHeroAbility,
  getHeroUpgradeSpec,
  MAX_HERO_UPGRADE_LEVEL
} from '../../../config/heroAbilities'
import { useHeroUpgrades } from '../../../services/heroUpgrades'
import { useHeroUnlocks } from '../../../services/heroUnlocks'
import { useToast } from '../../ui/ToastContainer'
import { ARENA_PREVIEW_IMAGES } from '../HQView/arenaAssets'
import GameContainer from './GameContainer'

export function PlayView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useSupabase()
  const toast = useToast()
  const { loadouts } = useLoadouts()
  const { equippedWeapon, equippedAccessories, shopState } = useShopState(user?.id)
  const { getProgress: getMasteryProgress } = useHeroMastery(user?.id)
  const { getLevel: getHeroUpgradeLv, getNextCost, upgradeHero } = useHeroUpgrades(user?.id)
  const allUpgrades = [...shopWeaponsAsUpgrades(), ...upgrades, ...AREA_TWO_UPGRADES, ...UNIVERSAL_CRIT_UPGRADES]

  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedAreaId, setSelectedAreaId] = useState<ArenaId>('carbon_sector')
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<DifficultyId>(() => {
    const requested = searchParams.get('difficulty')
    if (isValidDifficultyId(requested)) {
      saveDifficultyId(requested)
      return requested
    }
    return getStoredDifficultyId()
  })
  const [wave15Cleared, setWave15Cleared] = useState(false)
  const [highestWave, setHighestWave] = useState(0)
  const { isUnlocked: isHeroAvailable, unlockWithCoins } = useHeroUnlocks(user?.id, highestWave)
  const [selectedHeroId, setSelectedHeroId] = useState<string>(ALL_HEROES[0].id)
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string>(ALL_HEROES[0].starting_upgrade_id)
  const [selectedLoadoutName, setSelectedLoadoutName] = useState<string | undefined>(undefined)

  // Check Wave 15 clear status to enforce Area 2 access
  useEffect(() => {
    let active = true
    getPlayerTelemetry(user?.id).then((telemetry) => {
      if (!active) return
      const cleared = Boolean(telemetry.wave_15_cleared)
      setWave15Cleared(cleared)
      setHighestWave(telemetry.highest_wave || 0)

      const requestedArea = searchParams.get('area') as ArenaId | null
      if (requestedArea && isAreaUnlocked(requestedArea, telemetry)) {
        setSelectedAreaId(requestedArea)
      } else if (requestedArea === 'astral_citadel' && !cleared) {
        setSelectedAreaId('carbon_sector')
      }
    })
    return () => {
      active = false
    }
  }, [user?.id, searchParams])

  // Deep-link support: /play?loadoutId=... or /play?heroId=...
  useEffect(() => {
    const loadoutId = searchParams.get('loadoutId')
    const heroId = searchParams.get('heroId')

    if (loadoutId && loadouts.length > 0) {
      const found = loadouts.find((l) => l.id === loadoutId)
      if (found) {
        setSelectedHeroId(found.hero_id)
        setSelectedUpgradeId(found.primary_upgrade_id)
        setSelectedLoadoutName(found.loadout_name)
        return
      }
    }

    if (heroId) {
      const foundHero = ALL_HEROES.find((h) => h.id === heroId)
      if (foundHero && isHeroAvailable(foundHero.id)) {
        setSelectedHeroId(foundHero.id)
        setSelectedUpgradeId(foundHero.starting_upgrade_id)
        setSelectedLoadoutName(undefined)
      }
    }
  }, [searchParams, loadouts, isHeroAvailable])

  // Sync ?difficulty= URL parameter if navigated from HQ
  useEffect(() => {
    const requestedDifficulty = searchParams.get('difficulty')
    if (isValidDifficultyId(requestedDifficulty)) {
      setSelectedDifficultyId(requestedDifficulty)
      saveDifficultyId(requestedDifficulty)
    }
  }, [searchParams])

  const handleSelectArea = (areaId: ArenaId) => {
    if (!isAreaUnlocked(areaId, { wave_15_cleared: wave15Cleared })) return
    setSelectedAreaId(areaId)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('area', areaId)
    setSearchParams(nextParams, { replace: true })
  }

  const handleSelectDifficulty = (difficultyId: DifficultyId) => {
    setSelectedDifficultyId(difficultyId)
    saveDifficultyId(difficultyId)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('difficulty', difficultyId)
    setSearchParams(nextParams, { replace: true })
  }

  const handleSelectHero = (heroId: string) => {
    const hero = ALL_HEROES.find((h) => h.id === heroId)
    if (!hero) return
    if (!isHeroAvailable(hero.id)) {
      const unlockSpec = getUnlockableHeroSpec(hero.id)
      toast.warning(
        unlockSpec
          ? `${hero.name} is locked (${unlockSpec.unlockSummary}).`
          : `${hero.name} is currently locked.`
      )
      return
    }
    setSelectedHeroId(hero.id)
    setSelectedUpgradeId(hero.starting_upgrade_id)
    setSelectedLoadoutName(undefined)
    setIsPlaying(true)
  }

  const handleLaunchLoadout = (heroId: string, upgradeId: string, name: string) => {
    if (!isHeroAvailable(heroId)) {
      toast.warning('Unlock this hero before deploying with this loadout.')
      return
    }
    setSelectedHeroId(heroId)
    setSelectedUpgradeId(upgradeId)
    setSelectedLoadoutName(name)
    setIsPlaying(true)
  }

  const currentArea = getAreaById(selectedAreaId)
  const currentDifficulty = getDifficultyById(selectedDifficultyId)

  if (isPlaying) {
    return (
      <div className="flex-1 flex flex-col bg-slate-carbon text-white px-2 sm:px-3 pt-1.5 pb-2">
        <div className="w-full max-w-[1920px] mx-auto flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-1.5 px-1">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-cyan-accent font-display truncate">
                SWARM PROTOCOL · {currentArea.name} ({currentDifficulty.shortLabel} ·{' '}
                {formatDifficultyCoinLabel(currentDifficulty)})
              </h1>
              <span className="hidden lg:inline text-xs text-gray-400 whitespace-nowrap">
                WASD / Arrows to move · P / ESC to pause
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setIsPlaying(false)} className="shrink-0">
              Abort & Return
            </Button>
          </div>

          <GameContainer
            selectedHeroId={selectedHeroId}
            startingUpgradeId={selectedUpgradeId}
            loadoutName={selectedLoadoutName}
            areaId={selectedAreaId}
            difficultyId={selectedDifficultyId}
            autoStart={true}
            onBack={() => setIsPlaying(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-cyan-accent font-display">DEPLOY TO ARENA</h1>
          <p className="text-gray-400 mt-1">
            Pick an unlocked Arena, then launch with a Hero Unit or Saved Loadout
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => handleSelectHero(selectedHeroId)}
          className="rounded-full px-6"
        >
          Quick Deploy: {currentArea.name}
        </Button>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {/* Arena / Area Switcher */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAME_AREAS.map((area) => {
            const unlocked = isAreaUnlocked(area.id, { wave_15_cleared: wave15Cleared })
            const selected = selectedAreaId === area.id
            return (
              <button
                key={area.id}
                type="button"
                disabled={!unlocked}
                onClick={() => handleSelectArea(area.id)}
                className={`text-left rounded-2xl overflow-hidden border transition-all flex items-center gap-4 p-3 ${
                  selected
                    ? 'bg-slate-800/95 border-cyan-accent shadow-[0_0_24px_rgba(56,189,248,0.2)]'
                    : unlocked
                      ? 'bg-gray-900/90 border-gray-800 hover:border-gray-600'
                      : 'bg-gray-900/50 border-gray-800/70 opacity-65 cursor-not-allowed'
                }`}
              >
                <div className="w-28 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-950 relative">
                  <img
                    src={ARENA_PREVIEW_IMAGES[area.id]}
                    alt={`${area.name} arena preview`}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${!unlocked ? 'grayscale brightness-50' : ''}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-400">
                    Area {area.order} · {unlocked ? `${area.difficultyLabel} · ${area.maxWave} Waves` : `Locked · Beat Wave 15 (${highestWave}/15)`}
                  </div>
                  <div className="font-bold text-white font-display truncate">
                    {area.name} <span className="text-sm font-normal text-gray-400">({area.subtitle})</span>
                  </div>
                  <div className="text-xs text-cyan-accent mt-0.5">
                    {selected
                      ? 'Selected for Deployment'
                      : unlocked
                        ? area.coinBonusPercent > 0
                          ? `+${area.coinBonusPercent}% Battle Coins · Click to select`
                          : 'Standard Rules · Click to select'
                        : 'Defeat Wave 15 Final Boss to unlock'}
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* Difficulty Selector */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-white font-display">Select Combat Difficulty</h2>
            <span className="text-xs text-gray-400">
              Active:{' '}
              <strong style={{ color: currentDifficulty.accentColor }}>
                {currentDifficulty.name}
              </strong>{' '}
              ({formatDifficultyCoinLabel(currentDifficulty)})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {GAME_DIFFICULTIES.map((diff) => {
              const selected = selectedDifficultyId === diff.id
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => handleSelectDifficulty(diff.id)}
                  aria-pressed={selected}
                  className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                    selected
                      ? 'bg-slate-800/95 shadow-lg'
                      : 'bg-gray-900/90 border-gray-800 hover:border-gray-600'
                  }`}
                  style={
                    selected
                      ? {
                          borderColor: diff.accentColor,
                          boxShadow: `0 0 22px ${diff.accentColor}2A`
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="font-display font-extrabold text-lg"
                      style={{ color: diff.accentColor }}
                    >
                      {diff.name}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded tabular-nums ${
                        diff.coinBonusPercent > 0
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                          : diff.coinBonusPercent < 0
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {formatDifficultyCoinLabel(diff)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-snug mb-3">{diff.description}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-400 tabular-nums border-t border-gray-800 pt-2">
                    <span>
                      HP:{' '}
                      <strong className="text-gray-200">
                        {Math.round(diff.enemyHpMultiplier * 100)}%
                      </strong>
                    </span>
                    <span>
                      DMG:{' '}
                      <strong className="text-gray-200">
                        {Math.round(diff.enemyDamageMultiplier * 100)}%
                      </strong>
                    </span>
                    <span>
                      Speed:{' '}
                      <strong className="text-gray-200">
                        {Math.round(diff.enemySpeedMultiplier * 100)}%
                      </strong>
                    </span>
                    <span>
                      Spawns:{' '}
                      <strong className="text-gray-200">
                        {Math.round(diff.spawnRateMultiplier * 100)}%
                      </strong>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Equipped Armory Shop Gear Summary */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Bonus Equipped Weapon
              </p>
              <p className="text-sm font-bold text-hazard-gold">
                {equippedWeapon ? `${equippedWeapon.name} (+ Hero Starter)` : 'Hero Starting Weapon Only'}
              </p>
              {equippedWeapon?.pairedHeroLabel && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">
                  {equippedWeapon.pairedHeroLabel}
                </p>
              )}
            </div>
            <div className="h-8 w-px bg-gray-800 hidden sm:block" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Equipped Accessories ({equippedAccessories.length}/{MAX_EQUIPPED_ACCESSORIES})
              </p>
              <p className="text-sm font-medium text-cyan-accent">
                {equippedAccessories.length > 0
                  ? equippedAccessories.map((a) => a.name).join(' • ')
                  : 'None equipped'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/armory?tab=gear" className="text-cyan-accent hover:underline font-medium">
              Equip Gear in Armory
            </Link>
            <Link to="/shop" className="text-hazard-gold hover:underline font-medium tabular-nums">
              Shop ({shopState.balance.toLocaleString()} Coins)
            </Link>
          </div>
        </section>

        {/* Saved Loadouts Quick Deploy */}
        {loadouts.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-hazard-gold font-display">Saved Armory Loadouts</h2>
              <Link to="/armory" className="text-sm text-cyan-accent hover:underline">
                Manage in Armory →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loadouts.map((loadout) => {
                const hero = ALL_HEROES.find((h) => h.id === loadout.hero_id)
                const upg = allUpgrades.find((u) => u.id === loadout.primary_upgrade_id)
                return (
                  <div
                    key={loadout.id}
                    className="bg-gray-800/90 border border-gray-700 hover:border-cyan-accent rounded-xl p-4 flex flex-col justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-white">{loadout.loadout_name}</h3>
                        <Badge variant="primary" size="sm">{hero?.archetype || 'Unit'}</Badge>
                      </div>
                      <p className="text-sm text-gray-300">{hero?.name || loadout.hero_id}</p>
                      <p className="text-xs text-cyan-accent mt-1">
                        Weapon: {upg?.name || loadout.primary_upgrade_id}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() =>
                        handleLaunchLoadout(
                          loadout.hero_id,
                          loadout.primary_upgrade_id,
                          loadout.loadout_name
                        )
                      }
                    >
                      ▶ Launch Loadout
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Standard Hero Deployment */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <h2 className="text-2xl font-semibold text-hazard-gold font-display">Select Your Hero Unit</h2>
            <span className="text-xs text-gray-400 tabular-nums">
              Wallet: <strong className="text-hazard-gold">{shopState.balance.toLocaleString()} Coins</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_HEROES.map((hero) => {
              const unlocked = isHeroAvailable(hero.id)
              const unlockSpec = getUnlockableHeroSpec(hero.id)
              const startUpgrade = upgrades.find((u) => u.id === hero.starting_upgrade_id)
              const pixelSpeed = Math.round(hero.speed * GAME_CONFIG.BASE_PLAYER_SPEED)
              const mastery = getMasteryProgress(hero.id)
              const sigLevel = getHeroUpgradeLv(hero.id)
              const nextSigCost = getNextCost(hero.id)
              const canAffordSig = nextSigCost !== null && shopState.balance >= nextSigCost
              const ability = getHeroAbility(hero.id)
              const spec = getHeroUpgradeSpec(hero.id)
              const canAffordUnlock = Boolean(
                unlockSpec && shopState.balance >= unlockSpec.unlockCoinCost
              )
              return (
                <div
                  key={hero.id}
                  onClick={() => {
                    if (unlocked) handleSelectHero(hero.id)
                  }}
                  className={`rounded-xl p-5 transition-colors border flex flex-col justify-between ${
                    unlocked
                      ? 'bg-gray-800 cursor-pointer hover:bg-gray-700/80 border-gray-700 hover:border-cyan-accent'
                      : 'bg-gray-900/90 border-purple-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-bold text-lg text-white">{hero.name}</h3>
                      <Badge variant={unlocked ? 'secondary' : 'warning'} size="sm">
                        {unlocked ? hero.archetype : 'Locked Hero'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{hero.lore}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-gray-900 rounded p-2">
                        <span className="text-gray-400">HP: </span>
                        <span className="text-alert-red font-bold">{hero.hp}</span>
                      </div>
                      <div className="bg-gray-900 rounded p-2">
                        <span className="text-gray-400">Speed: </span>
                        <span className="text-cyan-accent font-bold">{pixelSpeed} px/s</span>
                      </div>
                    </div>

                    {!unlocked && unlockSpec ? (
                      <div
                        className="bg-purple-950/40 border border-purple-400/40 rounded-lg p-3 mb-3 space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-purple-300">Unlock Operative</span>
                          <span className="text-amber-300 font-semibold tabular-nums">
                            Wave {Math.min(highestWave, unlockSpec.unlockWave)}/{unlockSpec.unlockWave}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-snug">
                          Reach <strong className="text-white">Wave {unlockSpec.unlockWave}</strong> in combat
                          for free, or recruit immediately with Battle Coins:
                        </p>
                        <Button
                          variant={canAffordUnlock ? 'primary' : 'secondary'}
                          size="sm"
                          className="w-full text-xs"
                          disabled={!canAffordUnlock}
                          onClick={() => {
                            const res = unlockWithCoins(hero.id)
                            if (res.success) {
                              toast.success(`${hero.name} unlocked and ready to deploy!`)
                            } else if (res.error) {
                              toast.warning(res.error)
                            }
                          }}
                        >
                          {canAffordUnlock
                            ? `Recruit ${hero.name} • ${unlockSpec.unlockCoinCost.toLocaleString()} Coins`
                            : `Need ${(unlockSpec.unlockCoinCost - shopState.balance).toLocaleString()} More Coins`}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Hero Signature Coin Upgrade */}
                        <div
                          className="bg-gray-900/90 border border-gray-700/80 rounded-lg p-2.5 mb-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold truncate pr-2" style={{ color: ability.accentColor }}>
                              {ability.abilityName}
                            </span>
                            <span className="font-semibold text-cyan-accent shrink-0 tabular-nums">
                              Lv.{sigLevel}/{MAX_HERO_UPGRADE_LEVEL}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 leading-snug mb-2 tabular-nums">
                            {formatHeroUpgradeStats(hero.id, sigLevel)}
                          </p>
                          {nextSigCost !== null ? (
                            <Button
                              variant={canAffordSig ? 'primary' : 'secondary'}
                              size="sm"
                              className="w-full text-xs py-1"
                              disabled={!canAffordSig}
                              onClick={() => {
                                const res = upgradeHero(hero.id)
                                if (res.success) {
                                  toast.success(
                                    `${hero.name} ${spec.upgradeTitle} upgraded to Lv.${res.newLevel}/${MAX_HERO_UPGRADE_LEVEL}!`
                                  )
                                } else if (res.error) {
                                  toast.warning(res.error)
                                }
                              }}
                            >
                              {canAffordSig
                                ? `Upgrade Signature • ${nextSigCost.toLocaleString()} Coins`
                                : `Upgrade: ${nextSigCost.toLocaleString()} Coins`}
                            </Button>
                          ) : (
                            <p className="text-[11px] font-semibold text-hazard-gold">
                              Signature Fully Upgraded (Lv.{MAX_HERO_UPGRADE_LEVEL})
                            </p>
                          )}
                        </div>

                        {/* Hero Mastery Rank & Passive Summary */}
                        <div className="bg-gray-900/90 border border-gray-700/80 rounded-lg p-2.5 mb-3">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-amber-300 tabular-nums">
                              Mastery Rank {mastery.currentTier}/{mastery.maxTier}
                            </span>
                            <span className="text-gray-400 tabular-nums">
                              {mastery.roundsCompleted} rds
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1.5">
                            <div
                              className={`h-full transition-all duration-300 ${
                                mastery.currentTier >= mastery.maxTier ? 'bg-hazard-gold' : 'bg-cyan-accent'
                              }`}
                              style={{ width: `${mastery.progressPercent}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-emerald-300 leading-snug">
                            {mastery.currentTier > 0
                              ? formatMasteryBonusSummary(mastery.totalBonuses)
                              : `Unlock Lv.1 at 3 rounds: ${mastery.nextTier?.summary || ''}`}
                          </p>
                          {mastery.currentTier > 0 && mastery.nextTier && (
                            <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                              Next ({mastery.nextTier.requiredRounds} rds): {mastery.nextTier.summary}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {startUpgrade && (
                      <p className="text-xs text-hazard-gold mb-4">
                        Starting Weapon: {startUpgrade.name}
                      </p>
                    )}
                  </div>
                  {unlocked ? (
                    <Button variant="primary" size="sm" className="w-full">
                      Deploy {hero.name}
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      Locked — {unlockSpec?.unlockSummary || 'Unlock Required'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Tactical Rules */}
        <Card className="bg-gray-900">
          <h2 className="text-xl font-semibold text-hazard-gold mb-4 font-display">Mission Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-cyan-accent mb-1">Wave Cadence</h3>
              <p className="text-sm text-gray-300">30s active swarm + 3s breather. Area 1 runs 15 waves; Area 2 spans 20 waves ending in Astral Scourge.</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-cyan-accent mb-1">Scoring Formula</h3>
              <p className="text-sm text-gray-300">S = 10t + 25c (10 pts/sec + 25 pts/coin)</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-cyan-accent mb-1">Auto-Combat</h3>
              <p className="text-sm text-gray-300">Move with WASD/Arrows; weapons auto-target nearest threats.</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}

export default PlayView
