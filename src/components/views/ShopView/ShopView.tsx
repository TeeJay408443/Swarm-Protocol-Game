import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/ToastContainer'
import { useSupabase } from '../../../hooks/useSupabase'
import {
  type CrateOpenResult,
  type GearRarity,
  getTotalStackCount,
  MAX_EQUIPPED_ACCESSORIES,
  RARITY_META,
  SHOP_ACCESSORIES,
  SHOP_WEAPONS,
  SUPPLY_CRATES,
  type ShopAccessoryItem,
  type SupplyCrateTier,
  useShopState
} from '../../../services/shop'

type ShopFilter = 'all' | 'crates' | 'accessory'

function computeWeaponDps(damage: number, cooldownSeconds: number): string {
  if (cooldownSeconds <= 0) return `${damage}/tick`
  return `${(damage / cooldownSeconds).toFixed(1)} DPS`
}

function formatOddsPct(weight: number | undefined): string {
  if (!weight) return '0%'
  const pct = weight * 100
  return pct < 1 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`
}

function getCrateSummaryOdds(crate: SupplyCrateTier) {
  const bad = (crate.rarityWeights.scrap || 0) + (crate.rarityWeights.faulty || 0)
  const common = crate.rarityWeights.common || 0
  const uncommon = crate.rarityWeights.uncommon || 0
  const rarePlus =
    (crate.rarityWeights.rare || 0) +
    (crate.rarityWeights.epic || 0) +
    (crate.rarityWeights.legendary || 0)
  return {
    bad,
    common,
    uncommon,
    rare: crate.rarityWeights.rare || 0,
    epic: crate.rarityWeights.epic || 0,
    legendary: crate.rarityWeights.legendary || 0,
    rarePlus
  }
}

export function ShopView() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useSupabase()
  const effectiveUserId = user?.id || 'guest_user'

  const { shopState, buyItem, openCrate } = useShopState(effectiveUserId)
  const [filter, setFilter] = useState<ShopFilter>('all')
  const [crateResult, setCrateResult] = useState<CrateOpenResult | null>(null)

  const directAccessories = useMemo(
    () => SHOP_ACCESSORIES.filter((a) => !a.crateOnly),
    []
  )

  const ownedSet = useMemo(() => new Set(shopState.ownedIds), [shopState.ownedIds])
  const equippedAccessorySet = useMemo(
    () => new Set(shopState.equippedAccessoryIds),
    [shopState.equippedAccessoryIds]
  )

  const totalGearCopies = useMemo(
    () =>
      Object.values(shopState.gearStacks || {}).reduce(
        (sum, arr) => sum + arr.reduce((a, b) => a + (b > 0 ? b : 0), 0),
        0
      ),
    [shopState.gearStacks]
  )

  const handleBuy = (itemId: string) => {
    const result = buyItem(itemId)
    if (result.success && result.item) {
      toast.success(
        `Purchased ${result.item.name} (0★ · ×${result.newCount || 1} in stack)!`
      )
    } else if (result.error) {
      toast.warning(result.error)
    }
  }

  const handleOpenCrate = (crateId: string) => {
    const result = openCrate(crateId)
    if (!result.success) {
      if (result.error) toast.warning(result.error)
      return
    }
    setCrateResult(result)
    if (result.item) {
      if (result.isDuplicate) {
        toast.info(
          `Stacked ${result.item.name} (0★ · ×${result.totalOwnedCount || 1} owned) — fuse duplicates in Armory!`
        )
      } else if (result.isBadGear) {
        toast.warning(
          `Crate rolled ${result.item.name} (0★ · ${RARITY_META[result.item.rarity].label}).`
        )
      } else {
        toast.success(
          `Unlocked ${result.item.name} (0★ · ${RARITY_META[result.item.rarity].label})!`
        )
      }
    }
  }

  const showCrates = filter === 'all' || filter === 'crates'
  const showAccessories = filter === 'all' || filter === 'accessory'

  const renderCrateCard = (crate: SupplyCrateTier) => {
    const canAfford = shopState.balance >= crate.price
    const shortfall = Math.max(0, crate.price - shopState.balance)
    const odds = getCrateSummaryOdds(crate)

    return (
      <article
        key={crate.id}
        className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg p-5 flex flex-col justify-between transition-colors"
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono tracking-wide uppercase mb-2">
            <span style={{ color: crate.accentColor }}>{crate.tagline}</span>
            <span className="text-hazard-gold font-semibold tabular-nums">
              {crate.price.toLocaleString()} Coins
            </span>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">{crate.name}</h3>
          <p className="text-sm text-gray-400 mb-4">{crate.description}</p>

          <div className="border-t border-b border-gray-800 py-3 mb-4 space-y-1.5 text-xs tabular-nums">
            <div className="flex justify-between">
              <span className="text-red-400">Scrap / Faulty (Bad Gear)</span>
              <span className="font-semibold text-red-400">{formatOddsPct(odds.bad)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Common</span>
              <span className="font-semibold text-gray-300">{formatOddsPct(odds.common)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400">Uncommon</span>
              <span className="font-semibold text-emerald-400">{formatOddsPct(odds.uncommon)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sky-400">Rare</span>
              <span className="font-semibold text-sky-400">{formatOddsPct(odds.rare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">Epic</span>
              <span className="font-semibold text-purple-400">{formatOddsPct(odds.epic)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hazard-gold">Legendary</span>
              <span className="font-semibold text-hazard-gold">{formatOddsPct(odds.legendary)}</span>
            </div>
          </div>
        </div>

        <Button
          variant={canAfford ? 'primary' : 'secondary'}
          size="sm"
          className="w-full"
          disabled={!canAfford}
          onClick={() => handleOpenCrate(crate.id)}
        >
          {canAfford
            ? `Open Crate • ${crate.price.toLocaleString()} Coins`
            : `Need ${shortfall.toLocaleString()} More Coins`}
        </Button>
      </article>
    )
  }

  const renderAccessoryCard = (acc: ShopAccessoryItem) => {
    const totalOwned = getTotalStackCount(shopState, acc.id)
    const isOwned = totalOwned > 0 || ownedSet.has(acc.id)
    const isEquipped = equippedAccessorySet.has(acc.id)
    const canAfford = shopState.balance >= acc.price
    const shortfall = Math.max(0, acc.price - shopState.balance)
    const rarity = RARITY_META[acc.rarity]

    return (
      <article
        key={acc.id}
        className={`bg-gray-900 border rounded-lg p-5 flex flex-col justify-between transition-colors ${
          isEquipped
            ? 'border-cyan-accent'
            : isOwned
              ? 'border-emerald-500/40'
              : 'border-gray-800 hover:border-gray-700'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono tracking-wide uppercase mb-2">
            <span style={{ color: rarity.color }}>
              {rarity.label} · {acc.slotLabel}
            </span>
            {isEquipped ? (
              <span className="text-cyan-accent font-semibold tabular-nums">
                Equipped · ×{totalOwned}
              </span>
            ) : isOwned ? (
              <span className="text-emerald-400 font-semibold tabular-nums">
                Owned · ×{totalOwned}
              </span>
            ) : (
              <span className="text-hazard-gold font-semibold tabular-nums">
                {acc.price.toLocaleString()} Coins
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{acc.name}</h3>
          <p className="text-sm font-medium text-cyan-accent mb-2">{acc.statSummary}</p>
          <p className="text-sm text-gray-400 mb-5">{acc.function_desc}</p>
        </div>

        {isOwned ? (
          <div className="flex gap-2">
            <Button
              variant={canAfford ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1"
              disabled={!canAfford}
              onClick={() => handleBuy(acc.id)}
            >
              {canAfford
                ? `Buy Another · ${acc.price.toLocaleString()} Coins`
                : `Need ${shortfall.toLocaleString()} More`}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/armory?tab=inventory')}
            >
              Armory
            </Button>
          </div>
        ) : (
          <Button
            variant={canAfford ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            disabled={!canAfford}
            onClick={() => handleBuy(acc.id)}
          >
            {canAfford
              ? `Buy Accessory · ${acc.price.toLocaleString()} Coins`
              : `Need ${shortfall.toLocaleString()} More Coins`}
          </Button>
        )}
      </article>
    )
  }

  const droppedRarityMeta = crateResult?.rarity
    ? RARITY_META[crateResult.rarity as GearRarity]
    : null

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header & Battle Coin Wallet */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 mb-8 border-b border-gray-800">
          <div>
            <h1 className="text-4xl font-bold text-cyan-accent tracking-tight">ARMORY SHOP</h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Open Supply Crates with Battle Coins for a shot at rare weapons and gear—or buy
              tactical accessories directly.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:px-6 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Battle Coin Wallet</p>
              <p className="text-3xl font-bold text-hazard-gold tabular-nums">
                {shopState.balance.toLocaleString()} Coins
              </p>
            </div>
            <div className="h-10 w-px bg-gray-800 hidden sm:block" />
            <div className="text-xs text-gray-400 space-y-1 tabular-nums">
              <p>
                Owned Gear:{' '}
                <span className="text-white font-semibold">
                  {shopState.ownedIds.length} / {SHOP_WEAPONS.length + SHOP_ACCESSORIES.length} ({totalGearCopies} copies)
                </span>
              </p>
              <p>
                Crates Opened:{' '}
                <span className="text-cyan-accent font-semibold">
                  {shopState.cratesOpened || 0}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/armory?tab=inventory')}>
                Open Armory
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/play')}>
                Earn Coins
              </Button>
            </div>
          </div>
        </header>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({SUPPLY_CRATES.length + directAccessories.length})
            </Button>
            <Button
              variant={filter === 'crates' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('crates')}
            >
              Supply Crates ({SUPPLY_CRATES.length})
            </Button>
            <Button
              variant={filter === 'accessory' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('accessory')}
            >
              Direct Accessories ({directAccessories.length})
            </Button>
          </div>

          <p className="text-xs text-gray-400 tabular-nums">
            Total Earned:{' '}
            <span className="text-white">{shopState.totalEarned.toLocaleString()}</span> · Total
            Spent: <span className="text-white">{shopState.totalSpent.toLocaleString()}</span>
          </p>
        </div>

        {/* Supply Crates Section */}
        {showCrates && (
          <section className="mb-10">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">Supply Crates</h2>
              <p className="text-sm text-gray-400">
                The only way to unlock Shop weapons, plus a gamble on rare accessories. Cheaper
                crates carry higher Scrap/Faulty risk while high-tier drops are scarce; duplicates
                stack at 0★ so you can fuse gear up to 5★ in the Armory.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SUPPLY_CRATES.map(renderCrateCard)}
            </div>
          </section>
        )}

        {/* Direct Accessories Section */}
        {showAccessories && (
          <section>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">Direct Tactical Accessories</h2>
              <p className="text-sm text-gray-400">
                Equip up to {MAX_EQUIPPED_ACCESSORIES} accessories in the Armory for persistent
                combat modifiers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {directAccessories.map(renderAccessoryCard)}
            </div>
          </section>
        )}
      </div>

      {/* Crate Drop Reveal Modal */}
      <Modal
        isOpen={Boolean(crateResult?.success && crateResult?.item)}
        onClose={() => setCrateResult(null)}
        title={crateResult?.crate ? `${crateResult.crate.name} Opened` : 'Supply Crate Result'}
        size="sm"
      >
        {crateResult?.item && droppedRarityMeta && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono uppercase">
              <span style={{ color: droppedRarityMeta.color }} className="font-bold">
                {droppedRarityMeta.label} ·{' '}
                {crateResult.item.kind === 'weapon' ? 'Weapon' : 'Accessory'}
              </span>
              {crateResult.isDuplicate ? (
                <span className="text-hazard-gold font-semibold tabular-nums">
                  Stacked · ×{crateResult.totalOwnedCount || 1} Owned (0★)
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">New Unlock · 0★</span>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white">{crateResult.item.name}</h3>
              <p className="text-xs font-mono text-gray-400 mt-0.5">☆☆☆☆☆ · 0★ Base Drop</p>
              <p className="text-sm text-gray-300 mt-2">{crateResult.item.function_desc}</p>
            </div>

            {crateResult.item.kind === 'weapon' ? (
              <div className="grid grid-cols-3 gap-2 text-center border-t border-b border-gray-700 py-3">
                <div>
                  <p className="text-[11px] uppercase text-gray-400">Damage</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {crateResult.item.damage}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-gray-400">Cooldown</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {crateResult.item.cooldown_s}s
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-gray-400">Output</p>
                  <p className="text-sm font-bold text-hazard-gold tabular-nums">
                    {computeWeaponDps(crateResult.item.damage, crateResult.item.cooldown_s)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-t border-b border-gray-700 py-3">
                <p className="text-xs uppercase text-gray-400 mb-1">Modifier (0★)</p>
                <p
                  className={`text-sm font-semibold ${
                    crateResult.isBadGear ? 'text-red-400' : 'text-cyan-accent'
                  }`}
                >
                  {crateResult.item.statSummary}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400">
              {crateResult.newCount && crateResult.newCount >= 2
                ? `You have ×${crateResult.newCount} copies at 0★—ready to fuse into 1★ in the Armory Fusion Forge!`
                : 'Collect 2 matching copies at the same star tier to fuse them stronger (up to 5★).'}
            </p>

            {crateResult.isBadGear && (
              <p className="text-xs text-red-300">
                Bad gear drop: weaker or flawed performance. Fuse duplicates to shrink penalties or salvage in the Armory for {crateResult.item.salvageValue} Coins.
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {crateResult.crate && shopState.balance >= crateResult.crate.price && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenCrate(crateResult.crate!.id)}
                >
                  Open Another ({crateResult.crate.price} Coins)
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const canFuseNow = (crateResult.newCount ?? 0) >= 2
                  setCrateResult(null)
                  navigate(canFuseNow ? '/armory?tab=forge' : '/armory?tab=inventory')
                }}
              >
                {crateResult.newCount && crateResult.newCount >= 2 ? 'Fuse in Armory' : 'Open Armory'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCrateResult(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ShopView
