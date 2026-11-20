import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { heroes, upgrades } from '../../../db/seedData'
import { GAME_CONFIG } from '../../../config/gameConstants'
import { ArenaId, GAME_AREAS, getAreaById, isAreaUnlocked } from '../../../config/arenas'
import { useLoadouts } from '../../../hooks/useLoadouts'
import { useSupabase } from '../../../hooks/useSupabase'
import { getPlayerTelemetry } from '../../../services/scores'
import {
  MAX_EQUIPPED_ACCESSORIES,
  shopWeaponsAsUpgrades,
  useShopState
} from '../../../services/shop'
import { ARENA_PREVIEW_IMAGES } from '../HQView/arenaAssets'
import GameContainer from './GameContainer'

export function PlayView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useSupabase()
  const { loadouts } = useLoadouts()
  const { equippedWeapon, equippedAccessories, shopState } = useShopState(user?.id)
  const allUpgrades = [...shopWeaponsAsUpgrades(), ...upgrades]

  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedAreaId, setSelectedAreaId] = useState<ArenaId>('carbon_sector')
  const [wave15Cleared, setWave15Cleared] = useState(false)
  const [highestWave, setHighestWave] = useState(0)
  const [selectedHeroId, setSelectedHeroId] = useState<string>(heroes[0].id)
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string>(heroes[0].starting_upgrade_id)
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
      const foundHero = heroes.find((h) => h.id === heroId)
      if (foundHero) {
        setSelectedHeroId(foundHero.id)
        setSelectedUpgradeId(foundHero.starting_upgrade_id)
        setSelectedLoadoutName(undefined)
      }
    }
  }, [searchParams, loadouts])

  const handleSelectArea = (areaId: ArenaId) => {
    if (!isAreaUnlocked(areaId, { wave_15_cleared: wave15Cleared })) return
    setSelectedAreaId(areaId)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('area', areaId)
    setSearchParams(nextParams, { replace: true })
  }

  const handleSelectHero = (heroId: string) => {
    const hero = heroes.find((h) => h.id === heroId)
    if (!hero) return
    setSelectedHeroId(hero.id)
    setSelectedUpgradeId(hero.starting_upgrade_id)
    setSelectedLoadoutName(undefined)
    setIsPlaying(true)
  }

  const handleLaunchLoadout = (heroId: string, upgradeId: string, name: string) => {
    setSelectedHeroId(heroId)
    setSelectedUpgradeId(upgradeId)
    setSelectedLoadoutName(name)
    setIsPlaying(true)
  }

  const currentArea = getAreaById(selectedAreaId)

  if (isPlaying) {
    return (
      <div className="min-h-screen bg-slate-carbon text-white p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-cyan-accent font-display">
                SWARM PROTOCOL — {currentArea.name.toUpperCase()}
              </h1>
              <p className="text-xs text-gray-400">
                Move with WASD / Arrow Keys (or touch D-Pad). Press P or ESC to pause.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setIsPlaying(false)}>
              Abort & Return
            </Button>
          </div>

          <GameContainer
            selectedHeroId={selectedHeroId}
            startingUpgradeId={selectedUpgradeId}
            loadoutName={selectedLoadoutName}
            areaId={selectedAreaId}
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
                    Area {area.order} · {unlocked ? area.difficultyLabel : `Locked · Beat Wave 15 (${highestWave}/15)`}
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

        {/* Equipped Armory Shop Gear Summary */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Armory Weapon Override
              </p>
              <p className="text-sm font-bold text-hazard-gold">
                {equippedWeapon ? equippedWeapon.name : 'Hero / Loadout Default'}
              </p>
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
                const hero = heroes.find((h) => h.id === loadout.hero_id)
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
          <h2 className="text-2xl font-semibold text-hazard-gold mb-6 font-display">Select Your Hero Unit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {heroes.map((hero) => {
              const startUpgrade = upgrades.find((u) => u.id === hero.starting_upgrade_id)
              const pixelSpeed = Math.round(hero.speed * GAME_CONFIG.BASE_PLAYER_SPEED)
              return (
                <div
                  key={hero.id}
                  onClick={() => handleSelectHero(hero.id)}
                  className="bg-gray-800 rounded-xl p-5 cursor-pointer hover:bg-gray-700/80 transition-colors border border-gray-700 hover:border-cyan-accent flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-white">{hero.name}</h3>
                      <Badge variant="secondary" size="sm">{hero.archetype}</Badge>
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
                    {startUpgrade && (
                      <p className="text-xs text-hazard-gold mb-4">
                        Starting Weapon: {startUpgrade.name}
                      </p>
                    )}
                  </div>
                  <Button variant="primary" size="sm" className="w-full">
                    Deploy {hero.name}
                  </Button>
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
              <p className="text-sm text-gray-300">30s active swarm + 3s breather. Beat Wave 15 Final Boss to unlock Area 2.</p>
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
