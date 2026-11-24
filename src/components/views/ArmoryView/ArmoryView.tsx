import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { ItemSpriteIcon } from '../../ui/ItemSpriteIcon'
import { ArmoryEmptyState } from '../../ui/EmptyState'
import ValidatedInput from '../../ui/ValidatedInput'
import { useToast } from '../../ui/ToastContainer'
import { ValidationPresets } from '../../../hooks/useValidation'
import { useSupabase } from '../../../hooks/useSupabase'
import { useLoadouts } from '../../../hooks/useLoadouts'
import { upgrades } from '../../../db/seedData'
import { ALL_HEROES, getUnlockableHeroSpec } from '../../../config/unlockableHeroes'
import { AREA_TWO_UPGRADES, isAreaTwoUpgrade, isAreaTwoUpgradesUnlocked } from '../../../config/areaUpgrades'
import { CRIT_CONFIG, getWeaponCritProfile, UNIVERSAL_CRIT_UPGRADES } from '../../../config/critSystem'
import { getLocalPlayerTelemetry } from '../../../services/scores'
import { BOSS_CRAFTING_RECIPES, PLAYABLE_BOSS_DROP_SETS } from '../../../config/bossCrafting'
import { GAME_CONFIG, getUpgradeOverdriveHint } from '../../../config/gameConstants'
import {
  getHeroAbility,
  getHeroCritBonuses,
  getHeroDamageReduction,
  getHeroSignatureTierSummary,
  MAX_HERO_SIGNATURE_LEVEL
} from '../../../config/heroAbilities'
import { useHeroUpgrades } from '../../../services/heroUpgrades'
import { isHeroUnlocked, useHeroUnlocks } from '../../../services/heroUnlocks'
import {
  type ArmorySortOption,
  formatAccessoryStatSummary,
  craftBossRecipe,
  FUSION_COPIES_REQUIRED,
  type GearStackEntry,
  getHighestOwnedStar,
  getShopItemById,
  getTotalStackCount,
  getItemSalvageValue,
  getStackCount,
  getStarScaledWeaponStats,
  isBadGearRarity,
  MAX_EQUIPPED_ACCESSORIES,
  MAX_GEAR_STARS,
  RARITY_META,
  shopWeaponsAsUpgrades,
  sortGearStacks,
  useShopState
} from '../../../services/shop'
import type { ExtendedLoadout } from '../../../services/loadouts'
import {
  FusionAnimationOverlay,
  type FusionAnimationPayload,
  type FusionRepeatAction
} from './FusionAnimationOverlay'

type ArmoryTab = 'inventory' | 'forge' | 'crafting' | 'loadouts' | 'builder'
type InventoryFilter = 'all' | 'weapon' | 'accessory' | 'fusable'

const ARMORY_SORT_OPTIONS: ReadonlyArray<{ value: ArmorySortOption; label: string }> = [
  { value: 'equipped', label: 'Equipped First' },
  { value: 'rarity_desc', label: 'Rarity (High to Low)' },
  { value: 'rarity_asc', label: 'Rarity (Low to High)' },
  { value: 'stars_desc', label: 'Star Tier (5★ to 0★)' },
  { value: 'power_desc', label: 'Power / Value' },
  { value: 'count_desc', label: 'Quantity (High to Low)' },
  { value: 'name_asc', label: 'Name (A to Z)' }
]

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
  const { getSignatureLevel } = useHeroUpgrades(effectiveUserId)
  const highestWave = getLocalPlayerTelemetry(effectiveUserId).highest_wave || 0
  const { isUnlocked: isHeroAvailable } = useHeroUnlocks(user?.id, highestWave)

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
    () => [...shopUpgradeRows, ...upgrades, ...AREA_TWO_UPGRADES, ...UNIVERSAL_CRIT_UPGRADES],
    [shopUpgradeRows]
  )

  const [activeTab, setActiveTab] = useState<ArmoryTab>('inventory')
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all')
  const [inventorySort, setInventorySort] = useState<ArmorySortOption>('equipped')
  const [inspectedStack, setInspectedStack] = useState<{ itemId: string; stars: number } | null>(
    null
  )
  const [forgeSelection, setForgeSelection] = useState<{ itemId: string; stars: number } | null>(
    null
  )
  const [fusionAnim, setFusionAnim] = useState<FusionAnimationPayload | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadoutName, setLoadoutName] = useState('')
  const [selectedHeroId, setSelectedHeroId] = useState<string>(ALL_HEROES[0].id)
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string>(ALL_HEROES[0].starting_upgrade_id)
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
    if (tabParam === 'crafting') {
      setActiveTab('crafting')
      return
    }
    if (tabParam === 'loadouts') {
      setActiveTab('loadouts')
      return
    }

    const heroParam = searchParams.get('heroId')
    if (heroParam) {
      const heroMatch = ALL_HEROES.find((h) => h.id === heroParam)
      if (heroMatch) {
        if (!isHeroUnlocked(user?.id, heroMatch.id, highestWave)) {
          const spec = getUnlockableHeroSpec(heroMatch.id)
          toast.warning(
            `${heroMatch.name} is locked. ${spec?.unlockSummary || 'Unlock first in Play or Shop.'}`
          )
          return
        }
        setEditingId(null)
        setSelectedHeroId(heroMatch.id)
        setSelectedUpgradeId(heroMatch.starting_upgrade_id)
        setLoadoutName(`${heroMatch.name} Spec`)
        setUpgradeManuallyChosen(false)
        setActiveTab('builder')
      }
    }
  }, [searchParams, user?.id, highestWave])

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
    const base =
      inventoryFilter === 'weapon'
        ? inventoryStacks.filter((e) => e.item.kind === 'weapon')
        : inventoryFilter === 'accessory'
          ? inventoryStacks.filter((e) => e.item.kind === 'accessory')
          : inventoryFilter === 'fusable'
            ? fusableStacks
            : inventoryStacks
    return sortGearStacks(base, inventorySort, shopState)
  }, [inventoryFilter, inventorySort, inventoryStacks, fusableStacks, shopState])

  const inspectedEntry = useMemo(() => {
    if (!inspectedStack) return null
    return (
      inventoryStacks.find(
        (e) => e.itemId === inspectedStack.itemId && e.stars === inspectedStack.stars
      ) || null
    )
  }, [inspectedStack, inventoryStacks])

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
    () => ALL_HEROES.find((h) => h.id === selectedHeroId) || ALL_HEROES[0],
    [selectedHeroId]
  )

  const selectedUpgrade = useMemo(
    () => allKnownUpgrades.find((u) => u.id === selectedUpgradeId) || upgrades[0],
    [allKnownUpgrades, selectedUpgradeId]
  )

  const handleSelectHero = (heroId: string) => {
    if (!isHeroAvailable(heroId)) {
      const spec = getUnlockableHeroSpec(heroId)
      const hero = ALL_HEROES.find((h) => h.id === heroId)
      toast.warning(
        `${hero?.name || 'Hero'} is locked! ${spec?.unlockSummary || 'Unlock in Shop or Play.'}`
      )
      return
    }
    setSelectedHeroId(heroId)
    if (!upgradeManuallyChosen && !editingId) {
      const hero = ALL_HEROES.find((h) => h.id === heroId)
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
    setSelectedHeroId(ALL_HEROES[0].id)
    setSelectedUpgradeId(ALL_HEROES[0].starting_upgrade_id)
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
    setSelectedHeroId(ALL_HEROES[0].id)
    setSelectedUpgradeId(ALL_HEROES[0].starting_upgrade_id)
    setUpgradeManuallyChosen(false)
  }

  const handleSubmit = async () => {
    const trimmed = loadoutName.trim()
    if (trimmed.length < 3 || trimmed.length > 50) {
      toast.warning('Loadout name must be between 3 and 50 characters.')
      return
    }
    if (!isHeroAvailable(selectedHeroId)) {
      const spec = getUnlockableHeroSpec(selectedHeroId)
      toast.warning(
        `Cannot save loadout: ${spec?.name || 'Hero'} is locked (${spec?.unlockSummary || 'Unlock first'}).`
      )
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

  const handleCraftRecipe = (recipeId: string) => {
    const result = craftBossRecipe(effectiveUserId, recipeId)
    if (!result.success) {
      if (result.error) toast.warning(result.error)
      return
    }
    toast.success(`Crafted ${result.item?.name || 'new gear'} and added it to your inventory.`)
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
              className={`rounded-lg p-3.5 flex items-center gap-3 transition-colors ${
                equippedWeapon ? 'bg-gray-800 border-2' : 'bg-gray-950/60 border border-gray-800'
              }`}
              style={
                equippedWeapon
                  ? {
                      borderColor: RARITY_META[equippedWeapon.rarity].color,
                      boxShadow: `0 0 14px ${RARITY_META[equippedWeapon.rarity].color}22`
                    }
                  : undefined
              }
            >
              {equippedWeapon ? (
                <button
                  type="button"
                  onClick={() =>
                    setInspectedStack({ itemId: equippedWeapon.id, stars: equippedWeaponStars })
                  }
                  className="shrink-0 w-13 h-13 rounded-lg bg-gray-950/85 border flex items-center justify-center transition-colors"
                  style={{ borderColor: `${RARITY_META[equippedWeapon.rarity].color}88` }}
                  aria-label={`Inspect ${equippedWeapon.name}`}
                >
                  <ItemSpriteIcon
                    itemId={equippedWeapon.id}
                    size={44}
                    glowColor={RARITY_META[equippedWeapon.rarity].color}
                    stars={equippedWeaponStars}
                    altLabel={equippedWeapon.name}
                  />
                </button>
              ) : (
                <div className="shrink-0 w-13 h-13 rounded-lg bg-gray-900/80 border border-gray-800 flex items-center justify-center text-xs font-mono text-gray-500">
                  BASE
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-gray-400 mb-0.5">
                  <span>Weapon Slot</span>
                  {equippedWeapon && (
                    <span className="text-hazard-gold font-semibold tabular-nums">
                      {equippedWeaponStars}★
                    </span>
                  )}
                </div>
                {equippedWeapon ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setInspectedStack({ itemId: equippedWeapon.id, stars: equippedWeaponStars })
                      }
                      className="text-left text-sm font-bold text-white hover:text-hazard-gold truncate block w-full"
                    >
                      {equippedWeapon.name}
                    </button>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-hazard-gold tabular-nums truncate">
                        {equippedWeaponDps === null ? 'DoT' : `${equippedWeaponDps} DPS`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEquipWeapon(null)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium whitespace-nowrap shrink-0"
                      >
                        Unequip
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-300 truncate">Hero Starter Only</p>
                    <p className="text-xs text-gray-500 truncate">Click an item box below</p>
                  </>
                )}
              </div>
            </div>

            {/* 3 Accessory Slots */}
            {Array.from({ length: MAX_EQUIPPED_ACCESSORIES }).map((_, slotIdx) => {
              const acc = equippedAccessories[slotIdx]
              const accStars = acc ? shopState.equippedAccessoryStars?.[acc.id] ?? 0 : 0
              const accRarityColor = acc ? RARITY_META[acc.rarity].color : undefined
              return (
                <div
                  key={`slot-${slotIdx}`}
                  className={`rounded-lg p-3.5 flex items-center gap-3 transition-colors ${
                    acc ? 'bg-gray-800 border-2' : 'bg-gray-950/60 border border-gray-800'
                  }`}
                  style={
                    accRarityColor
                      ? {
                          borderColor: accRarityColor,
                          boxShadow: `0 0 14px ${accRarityColor}22`
                        }
                      : undefined
                  }
                >
                  {acc ? (
                    <button
                      type="button"
                      onClick={() => setInspectedStack({ itemId: acc.id, stars: accStars })}
                      className="shrink-0 w-13 h-13 rounded-lg bg-gray-950/85 border flex items-center justify-center transition-colors"
                      style={{ borderColor: `${accRarityColor}88` }}
                      aria-label={`Inspect ${acc.name}`}
                    >
                      <ItemSpriteIcon
                        itemId={acc.id}
                        size={44}
                        glowColor={RARITY_META[acc.rarity].color}
                        stars={accStars}
                        altLabel={acc.name}
                      />
                    </button>
                  ) : (
                    <div className="shrink-0 w-13 h-13 rounded-lg bg-gray-900/60 border border-dashed border-gray-800 flex items-center justify-center text-xs font-mono text-gray-600 tabular-nums">
                      0{slotIdx + 1}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase text-gray-400 mb-0.5">
                      <span>Accessory {slotIdx + 1}</span>
                      {acc && (
                        <span className="text-cyan-accent font-semibold tabular-nums">
                          {accStars}★
                        </span>
                      )}
                    </div>
                    {acc ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setInspectedStack({ itemId: acc.id, stars: accStars })}
                          className="text-left text-sm font-bold text-white hover:text-cyan-accent truncate block w-full"
                        >
                          {acc.name}
                        </button>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-xs text-cyan-accent truncate">
                            {formatAccessoryStatSummary(acc, accStars)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleAccessory(acc.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium whitespace-nowrap shrink-0"
                          >
                            Unequip
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-500">Empty Slot</p>
                        <p className="text-xs text-gray-500 truncate">Click an item box below</p>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Combined Passive Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
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
              <p className="text-[11px] uppercase text-gray-400">Crit Chance</p>
              <p className="text-sm font-bold text-rose-400 tabular-nums">
                {Math.min(
                  90,
                  Math.round((CRIT_CONFIG.BASE_CRIT_CHANCE + bonuses.critChance) * 100)
                )}
                %
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
            variant={activeTab === 'crafting' ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab('crafting')
              resetBuilder()
            }}
          >
            Crafting ({BOSS_CRAFTING_RECIPES.length} Recipes)
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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={inventoryFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setInventoryFilter('all')}
                >
                  All ({inventoryStacks.length})
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
                  Fuse Ready ({fusableStacks.length})
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="armory-sort-select"
                    className="text-xs font-mono uppercase text-gray-400 whitespace-nowrap"
                  >
                    Sort
                  </label>
                  <select
                    id="armory-sort-select"
                    aria-label="Sort inventory"
                    value={inventorySort}
                    onChange={(e) => setInventorySort(e.target.value as ArmorySortOption)}
                    className="bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-cyan-accent whitespace-nowrap"
                  >
                    {ARMORY_SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                  <span className="text-white font-semibold">{totalCopiesCount}</span> Copies ·{' '}
                  <span className="text-hazard-gold font-semibold">{fusableStacks.length}</span> Fusable
                </p>
              </div>
            </div>

            {inventoryStacks.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-10 text-center">
                <h2 className="text-xl font-bold text-white mb-2">Your Inventory Is Empty</h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                  Open Supply Crates or grab discounted gear in the 10-minute Rotating Shop to collect
                  stacks starting at 0★, then fuse duplicates here up to 5★.
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
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Select any gear box to inspect full stats, hero pairings, equip, fuse, or salvage.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                  {filteredInventory.map((entry) => {
                    const { item, stars, count } = entry
                    const rarityMeta = RARITY_META[item.rarity]
                    const isBad = isBadGearRarity(item.rarity)
                    const canFuse = stars < MAX_GEAR_STARS && count >= FUSION_COPIES_REQUIRED
                    const isWeapon = item.kind === 'weapon'
                    const isEquippedThisStar = isWeapon
                      ? shopState.equippedWeaponId === item.id && equippedWeaponStars === stars
                      : equippedAccessorySet.has(item.id) &&
                        (shopState.equippedAccessoryStars?.[item.id] ?? 0) === stars

                    const statusLabel = isEquippedThisStar
                      ? 'Equipped'
                      : canFuse
                        ? 'Fuse Ready'
                        : stars >= MAX_GEAR_STARS
                          ? '5★ Max'
                          : rarityMeta.label

                    const statusColorClass = isEquippedThisStar
                      ? 'text-cyan-accent'
                      : canFuse
                        ? 'text-hazard-gold'
                        : isBad
                          ? 'text-alert-red'
                          : 'text-gray-400'

                    return (
                      <button
                        type="button"
                        key={`${item.id}-${stars}`}
                        onClick={() => setInspectedStack({ itemId: item.id, stars })}
                        className="group text-left bg-gray-900 border-2 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-accent"
                        style={{
                          borderColor: rarityMeta.color,
                          boxShadow: isEquippedThisStar
                            ? `0 0 18px ${rarityMeta.color}48`
                            : `0 0 10px ${rarityMeta.color}1C`
                        }}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                          <span className="text-hazard-gold font-bold tabular-nums">
                            {stars}★
                          </span>
                          <span className="text-white/90 font-semibold tabular-nums">
                            ×{count}
                          </span>
                        </div>

                        <div
                          className="w-full aspect-square rounded-lg border flex items-center justify-center mb-2.5 overflow-hidden transition-transform group-hover:scale-[1.03]"
                          style={{
                            borderColor: `${rarityMeta.color}66`,
                            background: `radial-gradient(circle at 50% 45%, ${rarityMeta.color}26 0%, #090d16 74%)`
                          }}
                        >
                          <ItemSpriteIcon
                            itemId={item.id}
                            size={74}
                            glowColor={rarityMeta.color}
                            stars={stars}
                            altLabel={item.name}
                          />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <p
                            className={`text-[11px] font-semibold uppercase tracking-wide mt-0.5 truncate ${statusColorClass}`}
                          >
                            {statusLabel}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* BOSS CRAFTING TAB */}
        {!loading && activeTab === 'crafting' && (
          <section className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-cyan-accent">Boss Drop Crafting</h2>
              <p className="text-sm text-gray-400 mt-1">
                Defeat bosses in either arena to collect their three materials. Each recipe consumes
                one of each material and adds usable gear to your inventory.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {BOSS_CRAFTING_RECIPES.map((recipe) => {
                const boss = PLAYABLE_BOSS_DROP_SETS.find((entry) => entry.id === recipe.bossId)
                const item = getShopItemById(recipe.itemId)
                if (!boss || !item) return null
                const canCraft = recipe.materials.every(
                  ({ materialId, quantity }) =>
                    (shopState.bossMaterials[materialId] || 0) >= quantity
                )
                const ownedCount = getTotalStackCount(shopState, item.id)

                return (
                  <article
                    key={recipe.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">{boss.name}</p>
                        <h3 className="text-lg font-bold text-white">{item.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{item.function_desc}</p>
                      </div>
                      <span
                        className="shrink-0 rounded border px-2 py-1 text-xs font-semibold"
                        style={{ color: item.accentColor, borderColor: `${item.accentColor}88` }}
                      >
                        {item.kind === 'weapon' ? item.tierLabel : item.slotLabel}
                      </span>
                    </div>

                    <div className="rounded-lg bg-gray-950/70 border border-gray-800 p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-14 h-14 rounded-md bg-gray-900 border flex items-center justify-center shrink-0"
                          style={{ borderColor: `${item.accentColor}88` }}
                        >
                          <ItemSpriteIcon
                            itemId={item.id}
                            size={48}
                            glowColor={item.accentColor}
                            altLabel={item.name}
                          />
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-500">Result</p>
                          {item.kind === 'weapon' ? (
                            <p className="text-sm text-white">
                              {item.damage} damage · {item.cooldown_s}s cooldown · {item.special}
                            </p>
                          ) : (
                            <p className="text-sm text-white">
                              {formatAccessoryStatSummary(item)}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Owned: ×{ownedCount}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                        Required Materials
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {recipe.materials.map(({ materialId, quantity }) => {
                          const material = boss.materials.find((entry) => entry.id === materialId)
                          const owned = shopState.bossMaterials[materialId] || 0
                          return (
                            <div
                              key={materialId}
                              className="rounded border bg-gray-950/60 p-3"
                              style={{ borderColor: `${material?.accentColor || '#64748B'}66` }}
                            >
                              <p className="text-sm font-semibold text-white">
                                {material?.name || materialId}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Need {quantity} · Owned {owned}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      className="w-full"
                      disabled={!canCraft}
                      onClick={() => handleCraftRecipe(recipe.id)}
                    >
                      {canCraft ? `Craft ${item.name}` : 'Missing Boss Materials'}
                    </Button>
                  </article>
                )
              })}
            </div>
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
                                className={`rounded-lg p-4 flex flex-col justify-between ${
                                  filled
                                    ? 'bg-gray-800 border-2'
                                    : 'bg-gray-950/60 border border-gray-800 border-dashed opacity-70'
                                }`}
                                style={filled ? { borderColor: `${rarityMeta.color}CC` } : undefined}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-12 h-12 rounded-md bg-gray-950/85 border flex items-center justify-center shrink-0"
                                    style={{ borderColor: `${rarityMeta.color}77` }}
                                  >
                                    <ItemSpriteIcon
                                      itemId={item.id}
                                      size={40}
                                      glowColor={rarityMeta.color}
                                      stars={stars}
                                      altLabel={item.name}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-mono uppercase text-gray-400">
                                      Material {slotIdx + 1}
                                    </p>
                                    <p className="text-sm font-bold text-white truncate">{item.name}</p>
                                    <p className="text-xs font-mono text-hazard-gold tabular-nums">
                                      {stars}★
                                    </p>
                                  </div>
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
                        <div
                          className="md:col-span-5 rounded-lg p-4 border-2 bg-gray-800 flex items-center gap-4"
                          style={{
                            borderColor: rarityMeta.color,
                            boxShadow: `0 0 18px ${rarityMeta.color}26`
                          }}
                        >
                          <div
                            className="w-16 h-16 rounded-lg bg-gray-950/90 border flex items-center justify-center shrink-0"
                            style={{ borderColor: `${rarityMeta.color}88` }}
                          >
                            <ItemSpriteIcon
                              itemId={item.id}
                              size={56}
                              glowColor={rarityMeta.color}
                              stars={nextStars}
                              altLabel={item.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between text-xs font-mono uppercase mb-0.5">
                              <span style={{ color: rarityMeta.color }}>{rarityMeta.label}</span>
                              <span className="text-hazard-gold font-bold tabular-nums">
                                {stars}★ → {nextStars}★
                              </span>
                            </div>
                            <p className="text-base font-bold text-white truncate">{item.name}</p>
                            <p className="text-xs font-mono text-hazard-gold mt-0.5 mb-2 tabular-nums">
                              {renderStarGlyphs(nextStars)} ({nextStars}/5 Stars)
                            </p>

                            {isWeapon && beforeWeapon && afterWeapon ? (
                              <div className="text-xs space-y-0.5 tabular-nums">
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
                              <div className="text-xs space-y-0.5">
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
                        className={`rounded-lg p-4 border-2 flex flex-col justify-between transition-colors ${
                          isSelected ? 'bg-gray-800' : 'bg-gray-800/60'
                        }`}
                        style={{
                          borderColor: isSelected ? rarityMeta.color : `${rarityMeta.color}99`,
                          boxShadow: isSelected ? `0 0 16px ${rarityMeta.color}30` : undefined
                        }}
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
                        className="text-left rounded-lg p-3 bg-gray-800/50 border-2 transition-colors"
                        style={{ borderColor: `${rarityMeta.color}99` }}
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
                  const hero = ALL_HEROES.find((h) => h.id === loadout.hero_id)
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
                  {ALL_HEROES.map((hero) => {
                    const spec = getHeroAbility(hero.id)
                    const unlocked = isHeroAvailable(hero.id)
                    const unlockSpec = getUnlockableHeroSpec(hero.id)
                    return (
                      <button
                        type="button"
                        key={hero.id}
                        onClick={() => handleSelectHero(hero.id)}
                        className={`text-left bg-gray-800 rounded-lg p-3 transition-all border-2 ${
                          !unlocked
                            ? 'border-purple-500/30 opacity-65 hover:border-purple-400/60'
                            : selectedHeroId === hero.id
                              ? 'border-cyan-accent bg-gray-800/90'
                              : 'border-transparent hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="font-semibold text-white text-sm">{hero.name}</h4>
                          {!unlocked && unlockSpec && (
                            <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-200 border border-purple-500/40">
                              Locked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-cyan-accent mb-0.5">{hero.archetype}</p>
                        <p className="text-[11px] font-semibold text-amber-300 mb-1">
                          {spec.shortTag}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {hero.hp} HP · {Math.round(hero.speed * GAME_CONFIG.BASE_PLAYER_SPEED)} px/s
                        </p>
                        {!unlocked && unlockSpec && (
                          <p className="text-[10px] text-purple-300 mt-1">
                            Wave {unlockSpec.unlockWave} or {unlockSpec.unlockCoinCost.toLocaleString()} Coins
                          </p>
                        )}
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
                    {(() => {
                      const sigLv = getSignatureLevel(selectedHero.id)
                      const sigSummary = getHeroSignatureTierSummary(selectedHero.id, sigLv)
                      const dr = getHeroDamageReduction(selectedHero.id, sigLv)
                      const heroCrit = getHeroCritBonuses(selectedHero.id, sigLv)
                      return (
                        <>
                          <p className="text-xs font-semibold text-amber-300 mt-1 tabular-nums">
                            Signature: {getHeroAbility(selectedHero.id).abilityName} · Lv.{sigLv}/{MAX_HERO_SIGNATURE_LEVEL}
                          </p>
                          <p className="text-xs text-cyan-200 mt-0.5 tabular-nums">
                            {sigSummary.currentSummary}
                          </p>
                          {dr > 0 && (
                            <p className="text-xs text-emerald-300 font-semibold mt-1 tabular-nums">
                              Base Damage Reduction: +{Math.round(dr * 100)}%
                            </p>
                          )}
                          {heroCrit.critChanceBonus > 0 && (
                            <p className="text-xs text-purple-300 font-semibold mt-1 tabular-nums">
                              Innate Crit: +{Math.round(heroCrit.critChanceBonus * 100)}% Chance · +
                              {Math.round(heroCrit.critDamageBonus * 100)}% Crit Damage
                            </p>
                          )}
                        </>
                      )
                    })()}
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

      {/* Item Box Inspection Modal */}
      <Modal
        isOpen={!!inspectedEntry}
        onClose={() => setInspectedStack(null)}
        title={inspectedEntry ? inspectedEntry.item.name : 'Gear Details'}
        size="md"
      >
        {inspectedEntry &&
          (() => {
            const { item, stars, count } = inspectedEntry
            const rarityMeta = RARITY_META[item.rarity]
            const isBad = isBadGearRarity(item.rarity)
            const isWeapon = item.kind === 'weapon'
            const canFuse = stars < MAX_GEAR_STARS && count >= FUSION_COPIES_REQUIRED
            const salvageCoins = getItemSalvageValue(item, stars)

            const isEquippedThisStar = isWeapon
              ? shopState.equippedWeaponId === item.id && equippedWeaponStars === stars
              : equippedAccessorySet.has(item.id) &&
                (shopState.equippedAccessoryStars?.[item.id] ?? 0) === stars
            const isEquippedOtherStar =
              isWeapon
                ? shopState.equippedWeaponId === item.id && equippedWeaponStars !== stars
                : equippedAccessorySet.has(item.id) &&
                  (shopState.equippedAccessoryStars?.[item.id] ?? 0) !== stars
            const currentEquippedStar = isWeapon
              ? equippedWeaponStars
              : shopState.equippedAccessoryStars?.[item.id] ?? 0

            const weaponScaled = isWeapon ? getStarScaledWeaponStats(item, stars) : null
            const weaponDps = weaponScaled
              ? calculateUpgradeDps(weaponScaled.damage, weaponScaled.cooldown_s)
              : null
            const weaponCrit = isWeapon ? getWeaponCritProfile(item.id) : null
            const overdriveHint = isWeapon ? getUpgradeOverdriveHint(item.id) : null

            return (
              <div className="space-y-5">
                {/* Sprite & Core Identity Header */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div
                    className="w-28 h-28 rounded-xl border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: rarityMeta.color,
                      boxShadow: `0 0 22px ${rarityMeta.color}33`,
                      background: `radial-gradient(circle at 50% 45%, ${rarityMeta.color}30 0%, #090d16 74%)`
                    }}
                  >
                    <ItemSpriteIcon
                      itemId={item.id}
                      size={96}
                      glowColor={rarityMeta.color}
                      stars={stars}
                      altLabel={item.name}
                    />
                  </div>

                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p
                      className="text-xs font-mono uppercase tracking-wider font-semibold"
                      style={{ color: rarityMeta.color }}
                    >
                      {rarityMeta.label} · {isWeapon ? item.category : item.slotLabel}
                    </p>
                    <p className="text-base font-mono text-hazard-gold mt-1 tabular-nums">
                      {renderStarGlyphs(stars)} ({stars}/{MAX_GEAR_STARS} Stars)
                    </p>
                    <p className="text-xs text-gray-300 mt-1 tabular-nums">
                      Owned at {stars}★: <span className="font-bold text-white">×{count}</span>
                      {' · '}
                      Salvage Value:{' '}
                      <span className="font-semibold text-hazard-gold">+{salvageCoins} Coins</span>
                    </p>
                    {isEquippedThisStar && (
                      <p className="text-xs font-semibold text-cyan-accent mt-1.5">
                        Currently Equipped in Arena Loadout
                      </p>
                    )}
                    {isEquippedOtherStar && (
                      <p className="text-xs font-semibold text-amber-300 mt-1.5">
                        Another tier ({currentEquippedStar}★) is currently equipped
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats Block */}
                {isWeapon && weaponScaled ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                        <p className="text-[11px] uppercase text-gray-400">Damage</p>
                        <p className="text-base font-bold text-white tabular-nums">
                          {weaponScaled.damage}
                        </p>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                        <p className="text-[11px] uppercase text-gray-400">Cooldown</p>
                        <p className="text-base font-bold text-white tabular-nums">
                          {weaponScaled.cooldown_s}s
                        </p>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                        <p className="text-[11px] uppercase text-gray-400">Output DPS</p>
                        <p
                          className={`text-base font-bold tabular-nums ${
                            isBad ? 'text-alert-red' : 'text-hazard-gold'
                          }`}
                        >
                          {weaponDps === null ? 'DoT' : weaponDps}
                        </p>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                        <p className="text-[11px] uppercase text-gray-400">Bonus Crit</p>
                        <p className="text-base font-bold text-rose-400 tabular-nums">
                          {weaponCrit && weaponCrit.critChanceBonus > 0
                            ? `+${Math.round(weaponCrit.critChanceBonus * 100)}%`
                            : '0%'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3.5 space-y-1.5 text-xs">
                      <p className="text-gray-200 leading-relaxed">{item.function_desc}</p>
                      <p className="text-cyan-accent font-medium">
                        Special: {item.special}
                        {weaponCrit && weaponCrit.critDamageBonus > 0
                          ? ` · +${Math.round(weaponCrit.critDamageBonus * 100)}% Crit Damage`
                          : ''}
                      </p>
                      {item.pairedHeroLabel && (
                        <p className="text-rose-400 font-semibold">{item.pairedHeroLabel}</p>
                      )}
                      {overdriveHint && (
                        <p className="text-hazard-gold/90 font-medium">Lv.5 Overdrive: {overdriveHint}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3.5 space-y-2 text-xs">
                    <p
                      className={`text-sm font-bold ${
                        isBad ? 'text-alert-red' : 'text-cyan-accent'
                      }`}
                    >
                      {formatAccessoryStatSummary(
                        item as Extract<typeof item, { kind: 'accessory' }>,
                        stars
                      )}
                    </p>
                    <p className="text-gray-200 leading-relaxed">{item.function_desc}</p>
                    <p className="text-gray-400">
                      Star Scaling: Higher star tiers (up to 5★) amplify positive modifiers or soften
                      cursed penalties.
                    </p>
                  </div>
                )}

                {/* Inspection Modal Actions */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-800">
                  <Button
                    variant={isEquippedThisStar ? 'danger' : 'primary'}
                    className="flex-1 min-w-[140px]"
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
                      onClick={() => {
                        setInspectedStack(null)
                        handleOpenInForge(item.id, stars)
                      }}
                    >
                      Fuse in Forge
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => handleSalvageStack(item.id, stars)}
                  >
                    Salvage 1× (+{salvageCoins}c)
                  </Button>
                </div>
              </div>
            )
          })()}
      </Modal>

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
