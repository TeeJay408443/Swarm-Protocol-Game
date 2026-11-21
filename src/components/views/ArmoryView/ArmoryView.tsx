import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { ArmoryEmptyState } from '../../ui/EmptyState'
import ValidatedInput from '../../ui/ValidatedInput'
import { useToast } from '../../ui/ToastContainer'
import { ValidationPresets } from '../../../hooks/useValidation'
import { useSupabase } from '../../../hooks/useSupabase'
import { useLoadouts } from '../../../hooks/useLoadouts'
import { heroes, upgrades } from '../../../db/seedData'
import { AREA_TWO_UPGRADES, isAreaTwoUpgrade, isAreaTwoUpgradesUnlocked } from '../../../config/areaUpgrades'
import { getLocalPlayerTelemetry } from '../../../services/scores'
import { GAME_CONFIG } from '../../../config/gameConstants'
import { getHeroAbility, getHeroDamageReduction } from '../../../config/heroAbilities'
import {
  formatAccessoryStatSummary,
  FUSION_COPIES_REQUIRED,
  type GearStackEntry,
  getHighestOwnedStar,
  getItemSalvageValue,
  getStackCount,
  getStarScaledWeaponStats,
  isBadGearRarity,
  MAX_EQUIPPED_ACCESSORIES,
  MAX_GEAR_STARS,
  RARITY_META,
  shopWeaponsAsUpgrades,
  useShopState
} from '../../../services/shop'
import type { ExtendedLoadout } from '../../../services/loadouts'
import {
  FusionAnimationOverlay,
  type FusionAnimationPayload,
  type FusionRepeatAction
} from './FusionAnimationOverlay'

type ArmoryTab = 'inventory' | 'forge' | 'loadouts' | 'builder'
type InventoryFilter = 'all' | 'weapon' | 'accessory' | 'fusable'

function calculateUpgradeDps(damage: number, cooldownSeconds: number): number | null {
  if (damage <= 0) return 0
  if (cooldownSeconds <= 0) return null
  return Number((damage / cooldownSeconds).toFixed(1))
}

function renderStarGlyphs(stars: number): string {
  const filled = Math.max(0, Math.min(MAX_GEAR_STARS, Math.floor(stars)))
  return `${'★'.repeat(filled)}${'☆'.repeat(MAX_GEAR_STARS - filled)}`
}

export function ArmoryView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const { user } = useSupabase()
  const {
    loadouts,
    loading,
    error,
    isGuestMode,
    createLoadout,
    updateLoadout,
    deleteLoadout
  } = useLoadouts()

  const effectiveUserId = user?.id || 'guest_user'
  const {
    shopState,
    inventoryStacks,
    bonuses,
    equippedWeapon,
    equippedWeaponStars,
    equippedAccessories,
    salvageItem,
    fuseItem,
    setEquippedWeapon,
    toggleAccessory
  } = useShopState(effectiveUserId)

  const highestWeaponStarsMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const id of shopState.ownedIds) {
      if (!id.startsWith('wpn_')) continue
      if (shopState.equippedWeaponId === id) {
        map[id] = shopState.equippedWeaponStars || 0
      } else {
        const best = getHighestOwnedStar(shopState, id)
        if (best !== null) map[id] = best
      }
    }
    return map
  }, [shopState])

  const shopUpgradeRows = useMemo(
    () => shopWeaponsAsUpgrades(highestWeaponStarsMap),
    [highestWeaponStarsMap]
  )
  const ownedSet = useMemo(() => new Set(shopState.ownedIds), [shopState.ownedIds])
  const equippedAccessorySet = useMemo(
    () => new Set(shopState.equippedAccessoryIds),
    [shopState.equippedAccessoryIds]
  )
  const ownedShopUpgrades = useMemo(
    () => shopUpgradeRows.filter((u) => ownedSet.has(u.id)),
    [shopUpgradeRows, ownedSet]
  )
  const area2Unlocked = useMemo(
    () =>
      isAreaTwoUpgradesUnlocked({
        wave15Cleared: getLocalPlayerTelemetry(effectiveUserId).wave_15_cleared
      }),
    [effectiveUserId]
  )
  const allSelectableUpgrades = useMemo(
    () => [
      ...ownedShopUpgrades,
      ...upgrades,
      ...(area2Unlocked ? AREA_TWO_UPGRADES : [])
    ],
    [ownedShopUpgrades, area2Unlocked]
  )
  const allKnownUpgrades = useMemo(
    () => [...shopUpgradeRows, ...upgrades, ...AREA_TWO_UPGRADES],
    [shopUpgradeRows]
  )

  const [activeTab, setActiveTab] = useState<ArmoryTab>('inventory')
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all')
  const [forgeSelection, setForgeSelection] = useState<{ itemId: string; stars: number } | null>(
    null
  )
  const [fusionAnim, setFusionAnim] = useState<FusionAnimationPayload | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadoutName, setLoadoutName] = useState('')
  const [selectedHeroId, setSelectedHeroId] = useState<string>(heroes[0].id)
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string>(heroes[0].starting_upgrade_id)
  const [upgradeManuallyChosen, setUpgradeManuallyChosen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<ExtendedLoadout | null>(null)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'gear' || tabParam === 'inventory') {
      setActiveTab('inventory')
      return
    }
    if (tabParam === 'forge') {
      setActiveTab('forge')
      return
    }
    if (tabParam === 'loadouts') {
      setActiveTab('loadouts')
      return
    }

    const heroParam = searchParams.get('heroId')
    if (heroParam) {
      const heroMatch = heroes.find((h) => h.id === heroParam)
      if (heroMatch) {
        setEditingId(null)
        setSelectedHeroId(heroMatch.id)
        setSelectedUpgradeId(heroMatch.starting_upgrade_id)
        setLoadoutName(`${heroMatch.name} Spec`)
        setUpgradeManuallyChosen(false)
        setActiveTab('builder')
      }
    }
  }, [searchParams])

  const fusableStacks = useMemo(
    () =>
      inventoryStacks.filter(
        (entry) => entry.stars < MAX_GEAR_STARS && entry.count >= FUSION_COPIES_REQUIRED
      ),
    [inventoryStacks]
  )

  const nonFusableStacks = useMemo(
    () =>
      inventoryStacks.filter(
        (entry) => !(entry.stars < MAX_GEAR_STARS && entry.count >= FUSION_COPIES_REQUIRED)
      ),
    [inventoryStacks]
  )

  const totalCopiesCount = useMemo(
    () => inventoryStacks.reduce((sum, entry) => sum + entry.count, 0),
    [inventoryStacks]
  )

  const filteredInventory = useMemo(() => {
    if (inventoryFilter === 'weapon') {
      return inventoryStacks.filter((e) => e.item.kind === 'weapon')
    }
    if (inventoryFilter === 'accessory') {
      return inventoryStacks.filter((e) => e.item.kind === 'accessory')
    }
    if (inventoryFilter === 'fusable') {
      return fusableStacks
    }
    return inventoryStacks
  }, [inventoryFilter, inventoryStacks, fusableStacks])

  // Keep Fusion Workbench populated cleanly when entering Forge or after consuming a stack
  const activeForgeStack: GearStackEntry | null = useMemo(() => {
    if (forgeSelection) {
      const match = inventoryStacks.find(
        (e) => e.itemId === forgeSelection.itemId && e.stars === forgeSelection.stars
      )
      if (match) return match
    }
    return fusableStacks[0] || inventoryStacks.find((e) => e.stars < MAX_GEAR_STARS) || null
  }, [forgeSelection, inventoryStacks, fusableStacks])

  const selectedHero = useMemo(
    () => heroes.find((h) => h.id === selectedHeroId) || heroes[0],
    [selectedHeroId]
  )

  const selectedUpgrade = useMemo(
    () => allKnownUpgrades.find((u) => u.id === selectedUpgradeId) || upgrades[0],
    [allKnownUpgrades, selectedUpgradeId]
  )

  const handleSelectHero = (heroId: string) => {
    setSelectedHeroId(heroId)
    if (!upgradeManuallyChosen && !editingId) {
      const hero = heroes.find((h) => h.id === heroId)
      if (hero) setSelectedUpgradeId(hero.starting_upgrade_id)
    }
  }

  const handleSelectUpgrade = (upgradeId: string) => {
    setSelectedUpgradeId(upgradeId)
    setUpgradeManuallyChosen(true)
  }

  const startCreate = () => {
    setEditingId(null)
    setLoadoutName('')
    setSelectedHeroId(heroes[0].id)
    setSelectedUpgradeId(heroes[0].starting_upgrade_id)
    setUpgradeManuallyChosen(false)
    setActiveTab('builder')
  }

  const startEdit = (loadout: ExtendedLoadout) => {
    setEditingId(loadout.id)
    setLoadoutName(loadout.loadout_name)
    setSelectedHeroId(loadout.hero_id)
    setSelectedUpgradeId(loadout.primary_upgrade_id)
    setUpgradeManuallyChosen(true)
    setActiveTab('builder')
  }

  const resetBuilder = () => {
    setEditingId(null)
    setLoadoutName('')
    setSelectedHeroId(heroes[0].id)
    setSelectedUpgradeId(heroes[0].starting_upgrade_id)
    setUpgradeManuallyChosen(false)
  }

  const handleSubmit = async () => {
    const trimmed = loadoutName.trim()
    if (trimmed.length < 3 || trimmed.length > 50) {
      toast.warning('Loadout name must be between 3 and 50 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingId) {
        const updated = await updateLoadout(editingId, {
          loadout_name: trimmed,
          hero_id: selectedHeroId,
          primary_upgrade_id: selectedUpgradeId
        })
        if (updated) {
          toast.success(`Updated loadout "${trimmed}"`)
          resetBuilder()
          setActiveTab('loadouts')
        } else {
          toast.error('Unable to update loadout')
        }
      } else {
        const created = await createLoadout({
          loadout_name: trimmed,
          hero_id: selectedHeroId,
          primary_upgrade_id: selectedUpgradeId
        })
        if (created) {
          toast.success(`Saved loadout "${trimmed}"`)
          resetBuilder()
          setActiveTab('loadouts')
        } else {
          toast.error('Unable to save loadout')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return
    const target = confirmDeleteTarget
    setConfirmDeleteTarget(null)
    const ok = await deleteLoadout(target.id)
    if (ok) {
      toast.info(`Deleted loadout "${target.loadout_name}"`)
    } else {
      toast.error('Failed to delete loadout')
    }
  }

  const handleEquipWeapon = (weaponId: string | null, stars?: number) => {
    const res = setEquippedWeapon(weaponId, stars)
    if (!res.success && res.error) {
      toast.warning(res.error)
      return
    }
    if (weaponId === null) {
      toast.info('Cleared Crate weapon override — heroes will deploy with their default weapon.')
    } else if (res.item) {
      toast.success(`Equipped ${res.item.name} (${res.stars ?? 0}★) for combat deployments!`)
    }
  }

  const handleToggleAccessory = (accessoryId: string, stars?: number) => {
    const wasEquipped = equippedAccessorySet.has(accessoryId)
    const prevStar = shopState.equippedAccessoryStars?.[accessoryId] ?? 0
    const res = toggleAccessory(accessoryId, stars)
    if (!res.success && res.error) {
      toast.warning(res.error)
      return
    }
    if (res.item) {
      if (wasEquipped && stars !== undefined && prevStar !== stars) {
        toast.success(`Switched ${res.item.name} to ${res.stars ?? stars}★!`)
      } else {
        toast.success(
          wasEquipped
            ? `Unequipped ${res.item.name}`
            : `Equipped ${res.item.name} (${res.stars ?? 0}★)`
        )
      }
    }
  }

  const handleSalvageStack = (itemId: string, stars: number) => {
    const res = salvageItem(itemId, stars)
    if (!res.success && res.error) {
      toast.warning(res.error)
      return
    }
    if (res.item) {
      toast.info(
        `Salvaged 1× ${res.item.name} (${res.stars ?? stars}★) for +${res.refundCoins || 0} Battle Coins.`
      )
    }
  }

  const handleOpenInForge = (itemId: string, stars: number) => {
    setForgeSelection({ itemId, stars })
    setActiveTab('forge')
  }

  const handleFuseStack = (itemId: string, sourceStars: number) => {
    const res = fuseItem(itemId, sourceStars)
    if (!res.success) {
      if (res.error) toast.warning(res.error)
      return
    }
    if (res.item) {
      const fromStars = res.fromStars ?? sourceStars
      const toStars = res.toStars ?? sourceStars + 1
      toast.success(
        `Fused 2× ${res.item.name} (${fromStars}★) → 1× ${toStars}★!`
      )

      let nextRepeatAction: FusionRepeatAction | null = null
      if ((res.remainingSourceCount ?? 0) >= FUSION_COPIES_REQUIRED) {
        setForgeSelection({ itemId, stars: sourceStars })
        nextRepeatAction = {
          label: `Fuse Another ${fromStars}★ → ${toStars}★`,
          itemId,
          stars: fromStars
        }
      } else if (
        toStars < MAX_GEAR_STARS &&
        getStackCount(res.state, itemId, toStars) >= FUSION_COPIES_REQUIRED
      ) {
        setForgeSelection({ itemId, stars: toStars })
        nextRepeatAction = {
          label: `Fuse ${toStars}★ → ${toStars + 1}★`,
          itemId,
          stars: toStars
        }
      } else if (toStars < MAX_GEAR_STARS && getStackCount(res.state, itemId, toStars) >= 1) {
        setForgeSelection({ itemId, stars: toStars })
      } else {
        setForgeSelection(null)
      }

      setFusionAnim({
        key: Date.now() + Math.random(),
        item: res.item,
        fromStars,
        toStars,
        nextRepeatAction
      })
    }
  }

  const previewDps = calculateUpgradeDps(selectedUpgrade.damage, selectedUpgrade.cooldown_s)

  const equippedWeaponScaled = equippedWeapon
    ? getStarScaledWeaponStats(equippedWeapon, equippedWeaponStars)
    : null
  const equippedWeaponDps = equippedWeaponScaled
    ? calculateUpgradeDps(equippedWeaponScaled.damage, equippedWeaponScaled.cooldown_s)
    : null

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-cyan-accent tracking-tight">ARMORY</h1>
          <p className="text-gray-400 mt-2">
            Manage stacked crate drops, equip top-star gear, and fuse matching copies up to 5★.
            {user ? (
              <span className="ml-2 text-cyan-accent">Synced: {user.email}</span>
            ) : (
              <span className="ml-2 text-hazard-gold">Guest Mode · Local Save</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/shop')}>
            Shop ({shopState.balance.toLocaleString()} Coins)
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/play')}>
            Deploy to Arena
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Equipped Gear & Passive Bonuses Loadout Bar */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Weapon Slot */}
            <div
              className={`rounded-lg p-3.5 border flex flex-col justify-between ${
                equippedWeapon ? 'bg-gray-800 border-hazard-gold/60' : 'bg-gray-950/60 border-gray-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-gray-400 mb-1">
                  <span>Equipped Weapon</span>
                  {equippedWeapon && (
                    <span className="text-hazard-gold font-semibold">
                      {equippedWeaponStars}★
                    </span>
                  )}
                </div>
                {equippedWeapon ? (
                  <>
                    <p className="text-sm font-bold text-white truncate">{equippedWeapon.name}</p>
                    <p className="text-xs text-hazard-gold tabular-nums mt-0.5">
                      {renderStarGlyphs(equippedWeaponStars)} ·{' '}
                      {equippedWeaponDps === null ? 'DoT' : `${equippedWeaponDps} DPS`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-300">Hero Starter Only</p>
                    <p className="text-xs text-gray-500 mt-0.5">Equip a bonus weapon below (keeps hero starter)</p>
                  </>
                )}
              </div>
              {equippedWeapon && (
                <button
                  type="button"
                  onClick={() => handleEquipWeapon(null)}
                  className="mt-2 text-left text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Unequip Weapon
                </button>
              )}
            </div>

            {/* 3 Accessory Slots */}
            {Array.from({ length: MAX_EQUIPPED_ACCESSORIES }).map((_, slotIdx) => {
              const acc = equippedAccessories[slotIdx]
              const accStars = acc ? shopState.equippedAccessoryStars?.[acc.id] ?? 0 : 0
              return (
                <div
                  key={`slot-${slotIdx}`}
                  className={`rounded-lg p-3.5 border flex flex-col justify-between ${
                    acc ? 'bg-gray-800 border-cyan-accent/60' : 'bg-gray-950/60 border-gray-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase text-gray-400 mb-1">
                      <span>Accessory Slot {slotIdx + 1}</span>
                      {acc && <span className="text-cyan-accent font-semibold">{accStars}★</span>}
                    </div>
                    {acc ? (
                      <>
                        <p className="text-sm font-bold text-white truncate">{acc.name}</p>
                        <p className="text-xs text-cyan-accent mt-0.5 truncate">
                          {renderStarGlyphs(accStars)} · {formatAccessoryStatSummary(acc, accStars)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-500">Empty Slot</p>
                        <p className="text-xs text-gray-500 mt-0.5">Equip from Inventory</p>
                      </>
                    )}
                  </div>
                  {acc && (
                    <button
                      type="button"
                      onClick={() => handleToggleAccessory(acc.id)}
                      className="mt-2 text-left text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      Unequip
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Combined Passive Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
            <div className="bg-gray-800/80 rounded p-2.5 text-center">
              <p className="text-[11px] uppercase text-gray-400">Bonus HP</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">+{bonuses.bonusHp}</p>
            </div>
            <div className="bg-gray-800/80 rounded p-2.5 text-center">
              <p className="text-[11px] uppercase text-gray-400">Armor</p>
              <p className="text-sm font-bold text-white tabular-nums">
                -{Math.round(bonuses.damageReduction * 100)}% dmg
              </p>
            </div>
            <div className="bg-gray-800/80 rounded p-2.5 text-center">
              <p className="text-[11px] uppercase text-gray-400">Move Speed</p>
              <p className="text-sm font-bold text-cyan-accent tabular-nums">
                {Math.round(bonuses.speedMultiplier * 100)}%
              </p>
            </div>
            <div className="bg-gray-800/80 rounded p-2.5 text-center">
              <p className="text-[11px] uppercase text-gray-400">Damage</p>
              <p className="text-sm font-bold text-alert-red tabular-nums">
                {Math.round(bonuses.damageMultiplier * 100)}%
              </p>
            </div>
            <div className="bg-gray-800/80 rounded p-2.5 text-center">
              <p className="text-[11px] uppercase text-gray-400">Fire Rate</p>
              <p className="text-sm font-bold text-cyan-accent tabular-nums">
                {Math.round(bonuses.cooldownRateMultiplier * 100)}%
              </p>
            </div>
            <div className="bg-gray-800/80 rounded p-2.5 text-center">
              <p className="text-[11px] uppercase text-gray-400">Bonus Coins</p>
              <p className="text-sm font-bold text-hazard-gold tabular-nums">
                +{Math.round(bonuses.bonusCoinChance * 100)}%
              </p>
            </div>
          </div>
        </section>

        {/* Primary Armory Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === 'inventory' ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab('inventory')
              resetBuilder()
            }}
          >
            Inventory ({totalCopiesCount})
          </Button>
          <Button
            variant={activeTab === 'forge' ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab('forge')
              resetBuilder()
            }}
          >
            Fusion Forge ({fusableStacks.length} Ready)
          </Button>
          <Button
            variant={activeTab === 'loadouts' ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab('loadouts')
              resetBuilder()
            }}
          >
            Saved Loadouts ({loadouts.length})
          </Button>
          <Button
            variant={activeTab === 'builder' ? 'primary' : 'secondary'}
            onClick={() => {
              if (!editingId) startCreate()
              else setActiveTab('builder')
            }}
          >
            {editingId ? 'Editing Loadout' : '+ Create Loadout'}
          </Button>
        </div>

        {loading && (
          <Card className="bg-gray-900 text-center py-12">
            <p className="text-gray-400">Loading Armory...</p>
          </Card>
        )}

        {error && !loading && (
          <Card className="bg-gray-900 border border-alert-red mb-6">
            <p className="text-alert-red">{error}</p>
          </Card>
        )}

        {/* INVENTORY TAB */}
        {!loading && activeTab === 'inventory' && (
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={inventoryFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setInventoryFilter('all')}
                >
                  All Stacks ({inventoryStacks.length})
                </Button>
                <Button
                  variant={inventoryFilter === 'weapon' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setInventoryFilter('weapon')}
                >
                  Weapons ({inventoryStacks.filter((e) => e.item.kind === 'weapon').length})
                </Button>
                <Button
                  variant={inventoryFilter === 'accessory' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setInventoryFilter('accessory')}
                >
                  Accessories ({inventoryStacks.filter((e) => e.item.kind === 'accessory').length})
                </Button>
                <Button
                  variant={inventoryFilter === 'fusable' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setInventoryFilter('fusable')}
                >
                  Ready to Fuse ({fusableStacks.length})
                </Button>
              </div>

              <p className="text-xs text-gray-400 tabular-nums">
                Unique Items: <span className="text-white font-semibold">{shopState.ownedIds.length}</span> · Total
                Copies: <span className="text-white font-semibold">{totalCopiesCount}</span> · Can Fuse:{' '}
                <span className="text-hazard-gold font-semibold">{fusableStacks.length}</span>
              </p>
            </div>

            {inventoryStacks.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-10 text-center">
                <h2 className="text-xl font-bold text-white mb-2">Your Inventory Is Empty</h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                  Open Supply Crates or buy accessories in the Shop to collect gear stacks starting at
                  0★, then fuse duplicates here up to 5★.
                </p>
                <Button variant="primary" onClick={() => navigate('/shop')}>
                  Open Shop &amp; Crates
                </Button>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-400">
                  No gear stacks match this filter right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInventory.map((entry) => {
                  const { item, stars, count } = entry
                  const rarityMeta = RARITY_META[item.rarity]
                  const isBad = isBadGearRarity(item.rarity)
                  const canFuse = stars < MAX_GEAR_STARS && count >= FUSION_COPIES_REQUIRED
                  const salvageCoins = getItemSalvageValue(item, stars)

                  const isWeapon = item.kind === 'weapon'
                  const isEquippedThisStar = isWeapon
                    ? shopState.equippedWeaponId === item.id && equippedWeaponStars === stars
                    : equippedAccessorySet.has(item.id) &&
                      (shopState.equippedAccessoryStars?.[item.id] ?? 0) === stars
                  const isEquippedOtherStar =
                    !isWeapon &&
                    equippedAccessorySet.has(item.id) &&
                    (shopState.equippedAccessoryStars?.[item.id] ?? 0) !== stars

                  const weaponScaled = isWeapon ? getStarScaledWeaponStats(item, stars) : null
                  const weaponDps = weaponScaled
                    ? calculateUpgradeDps(weaponScaled.damage, weaponScaled.cooldown_s)
                    : null

                  return (
                    <article
                      key={`${item.id}-${stars}`}
                      className={`bg-gray-900 border rounded-lg p-4 flex flex-col justify-between transition-colors ${
                        isEquippedThisStar
                          ? 'border-cyan-accent'
                          : canFuse
                            ? 'border-hazard-gold/60'
                            : isBad
                              ? 'border-alert-red/40'
                              : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs font-mono uppercase mb-1.5">
                          <span style={{ color: rarityMeta.color }} className="truncate">
                            {rarityMeta.label} · {isWeapon ? item.category : item.slotLabel}
                          </span>
                          <span className="font-bold text-white tabular-nums shrink-0">
                            ×{count}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <h3 className="text-base font-bold text-white truncate">{item.name}</h3>
                          <span className="text-xs font-mono text-hazard-gold shrink-0 tabular-nums">
                            {renderStarGlyphs(stars)} {stars}★
                          </span>
                        </div>

                        {isEquippedThisStar ? (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-accent mb-2">
                            Equipped at {stars}★
                          </p>
                        ) : canFuse ? (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-hazard-gold mb-2">
                            Fusion Ready ({count}/{FUSION_COPIES_REQUIRED} copies → {stars + 1}★)
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
                            {stars >= MAX_GEAR_STARS
                              ? 'Max Tier (5★)'
                              : `${count}/${FUSION_COPIES_REQUIRED} copies toward ${stars + 1}★`}
                          </p>
                        )}

                        {isWeapon && weaponScaled ? (
                          <p className="text-xs text-gray-200 mb-2 tabular-nums">
                            {weaponScaled.damage} dmg · {weaponScaled.cooldown_s}s cd ·{' '}
                            <span
                              className={
                                isBad ? 'text-alert-red font-semibold' : 'text-hazard-gold font-semibold'
                              }
                            >
                              {weaponDps === null ? 'DoT' : `${weaponDps} DPS`}
                            </span>
                          </p>
                        ) : (
                          <p
                            className={`text-xs font-semibold mb-2 ${
                              isBad ? 'text-alert-red' : 'text-cyan-accent'
                            }`}
                          >
                            {formatAccessoryStatSummary(item as Extract<typeof item, { kind: 'accessory' }>, stars)}
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mb-2">{item.function_desc}</p>
                        {isWeapon && item.pairedHeroLabel && (
                          <p className="text-xs font-semibold text-rose-400 mb-3">
                            {item.pairedHeroLabel}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={isEquippedThisStar ? 'danger' : 'primary'}
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            isWeapon
                              ? handleEquipWeapon(isEquippedThisStar ? null : item.id, stars)
                              : handleToggleAccessory(item.id, stars)
                          }
                        >
                          {isEquippedThisStar
                            ? 'Unequip'
                            : isEquippedOtherStar
                              ? `Equip ${stars}★`
                              : 'Equip'}
                        </Button>

                        {canFuse && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenInForge(item.id, stars)}
                          >
                            Fuse
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSalvageStack(item.id, stars)}
                        >
                          Salvage +{salvageCoins}c
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* FUSION FORGE TAB */}
        {!loading && activeTab === 'forge' && (
          <div className="space-y-6">
            {/* Fusion Workbench */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-hazard-gold">Gear Fusion Forge</h2>
                  <p className="text-sm text-gray-400">
                    Combine {FUSION_COPIES_REQUIRED} identical copies at the same star rating (0★ → 5★)
                    to forge a stronger tier with higher damage, faster fire rate, or boosted modifiers.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate('/shop')}>
                  Get More Copies in Shop
                </Button>
              </div>

              {activeForgeStack ? (
                (() => {
                  const { item, stars, count } = activeForgeStack
                  const nextStars = Math.min(MAX_GEAR_STARS, stars + 1)
                  const canForge = stars < MAX_GEAR_STARS && count >= FUSION_COPIES_REQUIRED
                  const rarityMeta = RARITY_META[item.rarity]
                  const isWeapon = item.kind === 'weapon'

                  const beforeWeapon = isWeapon ? getStarScaledWeaponStats(item, stars) : null
                  const afterWeapon = isWeapon ? getStarScaledWeaponStats(item, nextStars) : null
                  const beforeDps = beforeWeapon
                    ? calculateUpgradeDps(beforeWeapon.damage, beforeWeapon.cooldown_s)
                    : null
                  const afterDps = afterWeapon
                    ? calculateUpgradeDps(afterWeapon.damage, afterWeapon.cooldown_s)
                    : null

                  return (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-stretch">
                        {/* Input Slot 1 + Slot 2 */}
                        <div className="md:col-span-5 grid grid-cols-2 gap-3">
                          {[0, 1].map((slotIdx) => {
                            const filled = count > slotIdx
                            return (
                              <div
                                key={slotIdx}
                                className={`rounded-lg p-4 border flex flex-col justify-between ${
                                  filled
                                    ? 'bg-gray-800 border-gray-700'
                                    : 'bg-gray-950/60 border-gray-800 border-dashed opacity-70'
                                }`}
                              >
                                <div>
                                  <p className="text-[11px] font-mono uppercase text-gray-400 mb-1">
                                    Material {slotIdx + 1}
                                  </p>
                                  <p className="text-sm font-bold text-white truncate">{item.name}</p>
                                  <p className="text-xs font-mono text-hazard-gold mt-1">
                                    {renderStarGlyphs(stars)} {stars}★
                                  </p>
                                </div>
                                <p
                                  className={`text-xs mt-3 font-medium ${
                                    filled ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {filled ? 'Ready (1×)' : 'Missing copy'}
                                </p>
                              </div>
                            )
                          })}
                        </div>

                        {/* Arrow */}
                        <div className="md:col-span-1 flex items-center justify-center">
                          <span className="text-2xl font-bold text-hazard-gold">→</span>
                        </div>

                        {/* Result Preview */}
                        <div className="md:col-span-5 rounded-lg p-4 border border-hazard-gold/50 bg-gray-800 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs font-mono uppercase mb-1">
                              <span style={{ color: rarityMeta.color }}>{rarityMeta.label}</span>
                              <span className="text-hazard-gold font-bold">
                                {stars}★ → {nextStars}★
                              </span>
                            </div>
                            <p className="text-base font-bold text-white">{item.name}</p>
                            <p className="text-xs font-mono text-hazard-gold mt-0.5 mb-2">
                              {renderStarGlyphs(nextStars)} ({nextStars}/5 Stars)
                            </p>

                            {isWeapon && beforeWeapon && afterWeapon ? (
                              <div className="text-xs space-y-1 tabular-nums">
                                <p className="text-gray-400">
                                  Current ({stars}★): {beforeWeapon.damage} dmg · {beforeWeapon.cooldown_s}s cd ·{' '}
                                  {beforeDps === null ? 'DoT' : `${beforeDps} DPS`}
                                </p>
                                <p className="text-emerald-400 font-semibold">
                                  After Fusion ({nextStars}★): {afterWeapon.damage} dmg · {afterWeapon.cooldown_s}s cd ·{' '}
                                  {afterDps === null ? 'DoT' : `${afterDps} DPS`}
                                </p>
                              </div>
                            ) : (
                              <div className="text-xs space-y-1">
                                <p className="text-gray-400">
                                  Current ({stars}★):{' '}
                                  {formatAccessoryStatSummary(
                                    item as Extract<typeof item, { kind: 'accessory' }>,
                                    stars
                                  )}
                                </p>
                                <p className="text-emerald-400 font-semibold">
                                  After Fusion ({nextStars}★):{' '}
                                  {formatAccessoryStatSummary(
                                    item as Extract<typeof item, { kind: 'accessory' }>,
                                    nextStars
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-800">
                        <p className="text-xs text-gray-400 tabular-nums">
                          Owned at {stars}★: <span className="text-white font-semibold">×{count}</span> · Consumes{' '}
                          {FUSION_COPIES_REQUIRED} copies → Produces 1× {item.name} ({nextStars}★)
                        </p>
                        <Button
                          variant="primary"
                          disabled={!canForge}
                          onClick={() => handleFuseStack(item.id, stars)}
                        >
                          {canForge
                            ? `Fuse 2× ${stars}★ → ${nextStars}★`
                            : `Need ${FUSION_COPIES_REQUIRED - count} More ${stars}★ Copy`}
                        </Button>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-400 mb-3">
                    Collect at least {FUSION_COPIES_REQUIRED} copies of any gear at the same star tier to fuse it.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/shop')}>
                    Visit Shop
                  </Button>
                </div>
              )}
            </section>

            {/* Fusable Stacks List */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-1">
                Ready to Fuse ({fusableStacks.length})
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Stacks with {FUSION_COPIES_REQUIRED}+ copies below {MAX_GEAR_STARS}★ can be upgraded right now.
              </p>

              {fusableStacks.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No stacks currently have {FUSION_COPIES_REQUIRED}+ matching copies below {MAX_GEAR_STARS}★.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fusableStacks.map((entry) => {
                    const rarityMeta = RARITY_META[entry.item.rarity]
                    const isSelected =
                      activeForgeStack?.itemId === entry.itemId &&
                      activeForgeStack?.stars === entry.stars
                    return (
                      <div
                        key={`fuse-${entry.itemId}-${entry.stars}`}
                        className={`rounded-lg p-4 border flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gray-800 border-hazard-gold'
                            : 'bg-gray-800/60 border-gray-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-mono uppercase mb-1">
                            <span style={{ color: rarityMeta.color }}>{rarityMeta.label}</span>
                            <span className="text-white font-bold tabular-nums">×{entry.count}</span>
                          </div>
                          <h4 className="font-bold text-white text-sm">{entry.item.name}</h4>
                          <p className="text-xs font-mono text-hazard-gold mt-0.5 mb-3">
                            {entry.stars}★ → {entry.stars + 1}★
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => setForgeSelection({ itemId: entry.itemId, stars: entry.stars })}
                          >
                            Preview
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleFuseStack(entry.itemId, entry.stars)}
                          >
                            Fuse Now
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Other Gear Progress */}
            {nonFusableStacks.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-1">
                  Other Inventory Stacks ({nonFusableStacks.length})
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Single copies awaiting duplicates or already forged to maximum {MAX_GEAR_STARS}★.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {nonFusableStacks.map((entry) => {
                    const rarityMeta = RARITY_META[entry.item.rarity]
                    return (
                      <button
                        type="button"
                        key={`other-${entry.itemId}-${entry.stars}`}
                        onClick={() =>
                          entry.stars < MAX_GEAR_STARS
                            ? setForgeSelection({ itemId: entry.itemId, stars: entry.stars })
                            : undefined
                        }
                        className="text-left rounded-lg p-3 bg-gray-800/50 border border-gray-800 hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono uppercase mb-1">
                          <span style={{ color: rarityMeta.color }}>{rarityMeta.label}</span>
                          <span className="text-white tabular-nums">×{entry.count}</span>
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{entry.item.name}</p>
                        <p className="text-xs font-mono text-hazard-gold mt-0.5 tabular-nums">
                          {renderStarGlyphs(entry.stars)} ·{' '}
                          {entry.stars >= MAX_GEAR_STARS ? 'MAX 5★' : `${entry.count}/2 copies`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Saved Loadouts Grid */}
        {!loading && activeTab === 'loadouts' && (
          <>
            {loadouts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadouts.map((loadout) => {
                  const hero = heroes.find((h) => h.id === loadout.hero_id)
                  const upgrade = allKnownUpgrades.find((u) => u.id === loadout.primary_upgrade_id)
                  const dps = upgrade
                    ? calculateUpgradeDps(upgrade.damage, upgrade.cooldown_s)
                    : 0

                  return (
                    <Card
                      key={loadout.id}
                      className="bg-gray-900 border border-gray-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-white">
                              {loadout.loadout_name}
                            </h3>
                            <p className="text-sm text-cyan-accent">
                              {hero?.name || loadout.hero_id} ({hero?.archetype || 'Operative'})
                            </p>
                          </div>
                          {isGuestMode && (
                            <span className="text-xs font-mono uppercase text-gray-400">Local</span>
                          )}
                        </div>

                        {upgrade && (
                          <div className="bg-gray-800/80 rounded p-3 mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-hazard-gold text-sm">
                                {upgrade.name}
                              </span>
                              <span className="text-xs text-gray-400 uppercase font-mono">
                                {upgrade.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{upgrade.function_desc}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                          <div className="bg-gray-800 rounded p-2">
                            <p className="text-xs text-gray-400">HP</p>
                            <p className="font-semibold text-white tabular-nums">
                              {hero?.hp ?? 100}
                            </p>
                          </div>
                          <div className="bg-gray-800 rounded p-2">
                            <p className="text-xs text-gray-400">Speed</p>
                            <p className="font-semibold text-cyan-accent tabular-nums">
                              {Math.round((hero?.speed ?? 1) * GAME_CONFIG.BASE_PLAYER_SPEED)}
                            </p>
                          </div>
                          <div className="bg-gray-800 rounded p-2">
                            <p className="text-xs text-gray-400">Output</p>
                            <p className="font-semibold text-hazard-gold tabular-nums">
                              {dps === null ? 'DoT' : `${dps} DPS`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/play?loadoutId=${loadout.id}`)}
                        >
                          Deploy
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startEdit(loadout)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteTarget(loadout)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="bg-gray-900">
                <ArmoryEmptyState onCreateLoadout={startCreate} />
              </Card>
            )}
          </>
        )}

        {/* Loadout Builder / Editor */}
        {!loading && activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Hero & Single Primary Upgrade */}
            <div className="space-y-6">
              <Card className="bg-gray-900">
                <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                  1. Select Hero Operative
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {heroes.map((hero) => {
                    const spec = getHeroAbility(hero.id)
                    return (
                      <button
                        type="button"
                        key={hero.id}
                        onClick={() => handleSelectHero(hero.id)}
                        className={`text-left bg-gray-800 rounded-lg p-3 transition-all border-2 ${
                          selectedHeroId === hero.id
                            ? 'border-cyan-accent bg-gray-800/90'
                            : 'border-transparent hover:border-gray-600'
                        }`}
                      >
                        <h4 className="font-semibold text-white text-sm">{hero.name}</h4>
                        <p className="text-xs text-cyan-accent mb-0.5">{hero.archetype}</p>
                        <p className="text-[11px] font-semibold text-amber-300 mb-1">
                          {spec.shortTag}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {hero.hp} HP · {Math.round(hero.speed * GAME_CONFIG.BASE_PLAYER_SPEED)} px/s
                        </p>
                      </button>
                    )
                  })}
                </div>
              </Card>

              <Card className="bg-gray-900">
                <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                  2. Select Primary Upgrade (1 per Loadout)
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {allSelectableUpgrades.map((upgrade) => {
                    const isSelected = selectedUpgradeId === upgrade.id
                    const isShopWpn = upgrade.id.startsWith('wpn_')
                    const starLabel = isShopWpn ? highestWeaponStarsMap[upgrade.id] ?? 0 : null
                    const dps = calculateUpgradeDps(upgrade.damage, upgrade.cooldown_s)
                    return (
                      <button
                        type="button"
                        key={upgrade.id}
                        onClick={() => handleSelectUpgrade(upgrade.id)}
                        className={`w-full text-left rounded p-3 transition-colors border ${
                          isSelected
                            ? 'border-cyan-accent bg-gray-800'
                            : 'border-gray-800 bg-gray-800/50 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-white text-sm">
                              {upgrade.name}
                              {isShopWpn && (
                                <span className="ml-2 text-xs text-hazard-gold font-normal">
                                  Crate Weapon · {starLabel}★
                                </span>
                              )}
                              {isAreaTwoUpgrade(upgrade.id) && (
                                <span className="ml-2 text-xs text-emerald-400 font-normal">
                                  Area 2 Unlock
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-400">{upgrade.function_desc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-semibold tabular-nums ${
                                isSelected ? 'text-cyan-accent' : 'text-hazard-gold'
                              }`}
                            >
                              {dps === null ? `${upgrade.damage}/tick` : `${dps} DPS`}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </Card>
            </div>

            {/* Right Column: Name, Dynamic Stat Calculator & Save */}
            <div className="space-y-6">
              <Card className="bg-gray-900">
                <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                  3. Name Your Loadout
                </h3>
                <ValidatedInput
                  name="loadout_name"
                  label="Loadout Name"
                  value={loadoutName}
                  onChange={setLoadoutName}
                  placeholder="e.g. Vanguard Overload"
                  rules={ValidationPresets.loadoutName}
                  showSuccess
                  helpText="3–50 characters"
                />
              </Card>

              <Card className="bg-gray-900">
                <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                  Dynamic Stat Calculator
                </h3>

                <div className="space-y-4">
                  <div className="bg-gray-800 rounded p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-400">Operative</span>
                      <span className="text-xs font-mono uppercase text-cyan-accent">
                        {selectedHero.archetype}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white">{selectedHero.name}</p>
                    <p className="text-xs font-semibold text-amber-300 mt-1">
                      Signature: {getHeroAbility(selectedHero.id).abilityName}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {getHeroAbility(selectedHero.id).description}
                    </p>
                    {getHeroDamageReduction(selectedHero.id) > 0 && (
                      <p className="text-xs text-emerald-300 font-semibold mt-1">
                        Base Damage Reduction: +{Math.round(getHeroDamageReduction(selectedHero.id) * 100)}%
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-800 rounded p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-400">Primary Weapon</span>
                      <span className="text-xs font-mono uppercase text-hazard-gold">
                        {selectedUpgrade.category}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-hazard-gold">{selectedUpgrade.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{selectedUpgrade.function_desc}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <p className="text-xs text-gray-400">Max HP</p>
                      <p className="text-xl font-bold text-white tabular-nums">
                        {selectedHero.hp + bonuses.bonusHp}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <p className="text-xs text-gray-400">Move Speed</p>
                      <p className="text-xl font-bold text-cyan-accent tabular-nums">
                        {Math.round(selectedHero.speed * GAME_CONFIG.BASE_PLAYER_SPEED * bonuses.speedMultiplier)} px/s
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center col-span-2 sm:col-span-1">
                      <p className="text-xs text-gray-400">Computed DPS</p>
                      <p className="text-xl font-bold text-hazard-gold tabular-nums">
                        {previewDps === null
                          ? 'Continuous'
                          : `${(previewDps * bonuses.damageMultiplier * bonuses.cooldownRateMultiplier).toFixed(1)}`}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <p className="text-xs text-gray-400">Hit Damage</p>
                      <p className="text-lg font-semibold text-white tabular-nums">
                        {Math.round(selectedUpgrade.damage * bonuses.damageMultiplier)}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <p className="text-xs text-gray-400">Cooldown</p>
                      <p className="text-lg font-semibold text-white tabular-nums">
                        {(selectedUpgrade.cooldown_s / bonuses.cooldownRateMultiplier).toFixed(2)}s
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <p className="text-xs text-gray-400">Trait</p>
                      <p className="text-sm font-semibold text-gray-200 truncate">
                        {selectedUpgrade.special || 'Standard'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-900">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    className="flex-1"
                    disabled={isSubmitting || loadoutName.trim().length < 3}
                  >
                    {isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save Loadout'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      resetBuilder()
                      setActiveTab('loadouts')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Gear Fusion Sequence Overlay */}
      <FusionAnimationOverlay
        payload={fusionAnim}
        onClose={() => setFusionAnim(null)}
        onFuseAnother={(itemId, stars) => handleFuseStack(itemId, stars)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!confirmDeleteTarget}
        onClose={() => setConfirmDeleteTarget(null)}
        title="Delete Loadout"
        size="sm"
      >
        <p className="text-gray-300 mb-6">
          Remove <strong className="text-white">{confirmDeleteTarget?.loadout_name}</strong> from your Armory?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete Loadout
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default ArmoryView
