import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../ui/Button'
import { useToast } from '../../ui/ToastContainer'
import { useSupabase } from '../../../hooks/useSupabase'
import {
  formatRotationCountdown,
  getTotalStackCount,
  RARITY_META,
  SHOP_ACCESSORIES,
  SHOP_ROTATION_INTERVAL_MS,
  SHOP_WEAPONS,
  SUPPLY_CRATES,
  type ShopRotationEntry,
  type SupplyCrateTier,
  useShopState
} from '../../../services/shop'
import { ALL_HEROES, getUnlockableHeroSpec } from '../../../config/unlockableHeroes'
import {
  formatHeroUpgradeStats,
  getHeroAbility,
  getHeroUpgradeSpec,
  MAX_HERO_UPGRADE_LEVEL
} from '../../../config/heroAbilities'
import { useHeroUpgrades } from '../../../services/heroUpgrades'
import { useHeroUnlocks } from '../../../services/heroUnlocks'
import { getLocalPlayerTelemetry } from '../../../services/scores'
import { CrateOpeningOverlay, type CrateOpeningPayload } from './CrateOpeningOverlay'

type ShopFilter = 'all' | 'rotation' | 'crates' | 'heroes'

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
    (crate.rarityWeights.legendary || 0) +
    (crate.rarityWeights.mythic || 0)
  return {
    bad,
    common,
    uncommon,
    rare: crate.rarityWeights.rare || 0,
    epic: crate.rarityWeights.epic || 0,
    legendary: crate.rarityWeights.legendary || 0,
    mythic: crate.rarityWeights.mythic || 0,
    rarePlus
  }
}

export function ShopView() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useSupabase()
  const effectiveUserId = user?.id || 'guest_user'

  const { shopState, rotation, buyItem, openCrate, openCrates } = useShopState(effectiveUserId)
  const { getLevel: getHeroUpgradeLv, getNextCost, upgradeHero } = useHeroUpgrades(effectiveUserId)
  const highestWave = getLocalPlayerTelemetry(effectiveUserId).highest_wave || 0
  const { isUnlocked: isHeroUnlockedForUser, unlockWithCoins } = useHeroUnlocks(
    effectiveUserId,
    highestWave
  )
  const [filter, setFilter] = useState<ShopFilter>('all')
  const [crateOverlay, setCrateOverlay] = useState<CrateOpeningPayload | null>(null)
  const overlaySeqRef = useRef(1)

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
        `Purchased ${result.item.name} (-${result.discountPercent ?? 0}% Sale · 0★ · ×${result.newCount || 1} in stack)!`
      )
    } else if (result.error) {
      toast.warning(result.error)
    }
  }

  const handleUpgradeHero = (heroId: string, heroName: string) => {
    const result = upgradeHero(heroId)
    if (result.success) {
      toast.success(
        `${heroName} ${getHeroUpgradeSpec(heroId).upgradeTitle} upgraded to Lv.${result.newLevel}/${MAX_HERO_UPGRADE_LEVEL}!`
      )
    } else if (result.error) {
      toast.warning(result.error)
    }
  }

  const handleOpenCrate = (crateId: string, count: number = 1) => {
    if (count > 1) {
      const batch = openCrates(crateId, count)
      if (!batch.success || !batch.crate) {
        if (batch.error) toast.warning(batch.error)
        return
      }
      setCrateOverlay({
        key: overlaySeqRef.current++,
        crate: batch.crate,
        drops: batch.drops,
        highestRarity: batch.highestRarity || 'common',
        hasMythic: batch.hasMythic,
        hasLegendary: batch.hasLegendary
      })
      if (batch.hasMythic) {
        toast.success(`MYTHIC DROP pulled from ${count}× ${batch.crate.name}!`)
      } else if (batch.hasLegendary) {
        toast.success(`Legendary gear pulled from ${count}× ${batch.crate.name}!`)
      } else {
        toast.info(`Opened ${count}× ${batch.crate.name}!`)
      }
      return
    }

    const result = openCrate(crateId)
    if (!result.success || !result.crate || !result.item || !result.rarity) {
      if (result.error) toast.warning(result.error)
      return
    }
    setCrateOverlay({
      key: overlaySeqRef.current++,
      crate: result.crate,
      drops: [
        {
          item: result.item,
          rarity: result.rarity,
          stars: result.stars ?? 0,
          isNewUnlock: Boolean(result.isNewUnlock),
          isBadGear: Boolean(result.isBadGear),
          isDuplicate: Boolean(result.isDuplicate),
          newCount: result.newCount ?? 1,
          totalOwnedCount: result.totalOwnedCount ?? 1
        }
      ],
      highestRarity: result.rarity,
      hasMythic: result.rarity === 'mythic',
      hasLegendary: result.rarity === 'legendary'
    })
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

  const showRotation = filter === 'all' || filter === 'rotation'
  const showCrates = filter === 'all' || filter === 'crates'
  const showHeroes = filter === 'all' || filter === 'heroes'

  const renderHeroUpgradeCard = (hero: (typeof ALL_HEROES)[number]) => {
    const unlocked = isHeroUnlockedForUser(hero.id)
    const unlockSpec = getUnlockableHeroSpec(hero.id)
    const lv = getHeroUpgradeLv(hero.id)
    const isMaxed = lv >= MAX_HERO_UPGRADE_LEVEL
    const nextCost = getNextCost(hero.id)
    const canAfford = nextCost !== null && shopState.balance >= nextCost
    const shortfall = nextCost !== null ? Math.max(0, nextCost - shopState.balance) : 0
    const ability = getHeroAbility(hero.id)
    const spec = getHeroUpgradeSpec(hero.id)
    const currentStats = formatHeroUpgradeStats(hero.id, lv)
    const nextStats = !isMaxed ? formatHeroUpgradeStats(hero.id, lv + 1) : null
    const canAffordUnlock = Boolean(unlockSpec && shopState.balance >= unlockSpec.unlockCoinCost)
    const unlockShortfall = unlockSpec ? Math.max(0, unlockSpec.unlockCoinCost - shopState.balance) : 0

    return (
      <article
        key={hero.id}
        className={`bg-gray-900 border rounded-lg p-5 flex flex-col justify-between transition-colors ${
          !unlocked
            ? 'border-purple-500/50'
            : isMaxed
              ? 'border-hazard-gold/70'
              : 'border-gray-800 hover:border-gray-700'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono tracking-wide uppercase mb-2">
            <span style={{ color: ability.accentColor }}>{hero.archetype}</span>
            <span
              className={`font-semibold tabular-nums ${
                !unlocked
                  ? 'text-purple-300'
                  : isMaxed
                    ? 'text-hazard-gold'
                    : 'text-cyan-accent'
              }`}
            >
              {!unlocked ? `LOCKED · Wave ${highestWave}/${unlockSpec?.unlockWave ?? 8}` : `Lv.${lv} / ${MAX_HERO_UPGRADE_LEVEL}`}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white">{hero.name}</h3>
          <p className="text-xs font-semibold text-amber-300 mt-0.5 mb-2">
            {spec.upgradeTitle} · {ability.abilityName}
          </p>
          <p className="text-xs text-gray-400 mb-3">
            {unlocked ? spec.summary : hero.lore}
          </p>

          {unlocked ? (
            <>
              {/* 5-segment progress track */}
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((rank) => (
                  <div
                    key={rank}
                    className={`h-1.5 rounded-sm transition-colors ${
                      lv >= rank
                        ? isMaxed
                          ? 'bg-hazard-gold'
                          : 'bg-cyan-accent'
                        : 'bg-gray-800'
                    }`}
                  />
                ))}
              </div>

              <div className="bg-gray-950/70 border border-gray-800 rounded p-2.5 text-xs space-y-1 mb-4 tabular-nums">
                <p className="text-gray-300">
                  <span className="text-gray-500">Current:</span>{' '}
                  <strong className="text-white">{currentStats}</strong>
                </p>
                {nextStats && (
                  <p className="text-emerald-300">
                    <span className="text-emerald-400/80">Next Lv.{lv + 1}:</span> {nextStats}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-purple-950/35 border border-purple-400/35 rounded p-2.5 text-xs space-y-1 mb-4 tabular-nums">
              <p className="text-purple-200 font-semibold">Unlock Options:</p>
              <p className="text-gray-300">• Reach Wave {unlockSpec?.unlockWave ?? 8} in any run (Free)</p>
              <p className="text-amber-300">• Or recruit now for {(unlockSpec?.unlockCoinCost ?? 1500).toLocaleString()} Coins</p>
            </div>
          )}
        </div>

        {!unlocked && unlockSpec ? (
          <Button
            variant={canAffordUnlock ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            disabled={!canAffordUnlock}
            onClick={() => {
              const res = unlockWithCoins(hero.id)
              if (res.success) {
                toast.success(`${hero.name} unlocked! Ready for deployment and upgrades.`)
              } else if (res.error) {
                toast.warning(res.error)
              }
            }}
          >
            {canAffordUnlock
              ? `Unlock Hero • ${unlockSpec.unlockCoinCost.toLocaleString()} Coins`
              : `Need ${unlockShortfall.toLocaleString()} More Coins (${unlockSpec.unlockCoinCost.toLocaleString()}c)`}
          </Button>
        ) : isMaxed || nextCost === null ? (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            MAX LEVEL REACHED (Lv.{MAX_HERO_UPGRADE_LEVEL})
          </Button>
        ) : (
          <Button
            variant={canAfford ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            disabled={!canAfford}
            onClick={() => handleUpgradeHero(hero.id, hero.name)}
          >
            {canAfford
              ? `Upgrade to Lv.${lv + 1} • ${nextCost.toLocaleString()} Coins`
              : `Need ${shortfall.toLocaleString()} More Coins (${nextCost.toLocaleString()}c)`}
          </Button>
        )}
      </article>
    )
  }

  const renderCrateCard = (crate: SupplyCrateTier) => {
    const canAffordOne = shopState.balance >= crate.price
    const canAffordTen = shopState.balance >= crate.price * 10
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
              <span className={odds.bad === 0 ? 'text-gray-500' : 'text-red-400'}>
                Scrap / Faulty (Bad Gear)
              </span>
              <span className={`font-semibold ${odds.bad === 0 ? 'text-gray-500' : 'text-red-400'}`}>
                {odds.bad === 0 ? 'Excluded (0%)' : formatOddsPct(odds.bad)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={odds.common === 0 ? 'text-gray-500' : 'text-gray-300'}>Common</span>
              <span className={`font-semibold ${odds.common === 0 ? 'text-gray-500' : 'text-gray-300'}`}>
                {odds.common === 0 ? 'Excluded (0%)' : formatOddsPct(odds.common)}
              </span>
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
            <div className="flex justify-between">
              <span className={odds.mythic > 0 ? 'text-rose-400 font-semibold' : 'text-gray-500'}>
                Mythic
              </span>
              <span className={`font-semibold ${odds.mythic > 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                {formatOddsPct(odds.mythic)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant={canAffordOne ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            disabled={!canAffordOne}
            onClick={() => handleOpenCrate(crate.id, 1)}
          >
            {canAffordOne
              ? `Open 1 • ${crate.price.toLocaleString()} Coins`
              : `Need ${shortfall.toLocaleString()} More Coins`}
          </Button>
          <Button
            variant={canAffordTen ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full"
            disabled={!canAffordTen}
            onClick={() => handleOpenCrate(crate.id, 10)}
          >
            {`Open ×10 • ${(crate.price * 10).toLocaleString()} Coins`}
          </Button>
        </div>
      </article>
    )
  }

  const renderRotationCard = (entry: ShopRotationEntry) => {
    const { item, originalPrice, salePrice, discountPercent } = entry
    const totalOwned = getTotalStackCount(shopState, item.id)
    const isOwned = totalOwned > 0 || ownedSet.has(item.id)
    const isEquipped =
      item.kind === 'weapon'
        ? shopState.equippedWeaponId === item.id
        : equippedAccessorySet.has(item.id)
    const canAfford = shopState.balance >= salePrice
    const shortfall = Math.max(0, salePrice - shopState.balance)
    const rarity = RARITY_META[item.rarity]
    const savings = Math.max(0, originalPrice - salePrice)
    const weaponDps =
      item.kind === 'weapon' && item.cooldown_s > 0
        ? Math.round(item.damage / item.cooldown_s)
        : null

    return (
      <article
        key={item.id}
        className="bg-gray-900 border-2 rounded-lg p-5 flex flex-col justify-between transition-colors"
        style={{
          borderColor: isEquipped ? rarity.color : `${rarity.color}BB`,
          boxShadow: isEquipped ? `0 0 18px ${rarity.color}33` : undefined
        }}
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono tracking-wide uppercase mb-2">
            <span style={{ color: rarity.color }}>
              {rarity.label} · {item.kind === 'weapon' ? 'Weapon' : `Accessory (${item.slotLabel})`}
            </span>
            <span className="bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 font-bold px-2 py-0.5 rounded-sm tabular-nums">
              -{discountPercent}% SALE
            </span>
          </div>

          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-lg font-bold text-white">{item.name}</h3>
            {isEquipped ? (
              <span className="text-xs font-mono text-cyan-accent font-semibold shrink-0 tabular-nums">
                Equipped · ×{totalOwned}
              </span>
            ) : isOwned ? (
              <span className="text-xs font-mono text-emerald-400 font-semibold shrink-0 tabular-nums">
                Owned · ×{totalOwned}
              </span>
            ) : null}
          </div>

          {item.kind === 'weapon' ? (
            <div className="space-y-1 mb-2">
              <p className="text-xs font-medium text-cyan-accent tabular-nums">
                {item.damage} DMG · {item.cooldown_s}s CD{weaponDps ? ` · ${weaponDps} DPS` : ''} · {item.special}
              </p>
              {item.pairedHeroLabel && (
                <p className="text-xs font-semibold text-rose-400">★ {item.pairedHeroLabel}</p>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium text-cyan-accent mb-2">{item.statSummary}</p>
          )}

          <p className="text-sm text-gray-400 mb-4">{item.function_desc}</p>
        </div>

        <div>
          <div className="bg-gray-950/80 border border-gray-800 rounded px-3 py-2 mb-3 flex items-center justify-between text-xs tabular-nums">
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500 line-through">
                {originalPrice.toLocaleString()} Coins
              </span>
              <span className="text-base font-bold text-hazard-gold">
                {salePrice.toLocaleString()} Coins
              </span>
            </div>
            <span className="text-emerald-400 font-semibold">
              Save {savings.toLocaleString()}c
            </span>
          </div>

          {isOwned ? (
            <div className="flex gap-2">
              <Button
                variant={canAfford ? 'primary' : 'secondary'}
                size="sm"
                className="flex-1"
                disabled={!canAfford}
                onClick={() => handleBuy(item.id)}
              >
                {canAfford
                  ? `Buy Copy • ${salePrice.toLocaleString()}c`
                  : `Need ${shortfall.toLocaleString()}c`}
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
              onClick={() => handleBuy(item.id)}
            >
              {canAfford
                ? `Buy ${item.kind === 'weapon' ? 'Weapon' : 'Accessory'} • ${salePrice.toLocaleString()} Coins`
                : `Need ${shortfall.toLocaleString()} More Coins`}
            </Button>
          )}
        </div>
      </article>
    )
  }

  const rotationElapsedPct = Math.max(
    0,
    Math.min(
      100,
      ((SHOP_ROTATION_INTERVAL_MS - rotation.remainingMs) / SHOP_ROTATION_INTERVAL_MS) * 100
    )
  )

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header & Battle Coin Wallet */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 mb-8 border-b border-gray-800">
          <div>
            <h1 className="text-4xl font-bold text-cyan-accent tracking-tight">ARMORY SHOP</h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Snag discounted weapons and tactical accessories from the 10-minute Rotating Shop
              deals, open Supply Crates, or recruit and upgrade operatives.
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
              All ({rotation.entries.length + SUPPLY_CRATES.length + ALL_HEROES.length})
            </Button>
            <Button
              variant={filter === 'rotation' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('rotation')}
            >
              Rotating Sale ({rotation.entries.length})
            </Button>
            <Button
              variant={filter === 'crates' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('crates')}
            >
              Supply Crates ({SUPPLY_CRATES.length})
            </Button>
            <Button
              variant={filter === 'heroes' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('heroes')}
            >
              Heroes &amp; Upgrades ({ALL_HEROES.length})
            </Button>
          </div>

          <p className="text-xs text-gray-400 tabular-nums">
            Total Earned:{' '}
            <span className="text-white">{shopState.totalEarned.toLocaleString()}</span> · Total
            Spent: <span className="text-white">{shopState.totalSpent.toLocaleString()}</span>
          </p>
        </div>

        {/* 10-Minute Rotating Sale Section */}
        {showRotation && (
          <section className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 bg-gray-900/90 border border-gray-800 rounded-lg p-4">
              <div>
                <h2 className="text-2xl font-bold text-white">10-Minute Rotating Shop Deals</h2>
                <p className="text-sm text-gray-400">
                  Weapons &amp; tactical accessories go on sale every 10 minutes at 15%–35% off.
                  Permanent direct purchases have been replaced by this rotating stock.
                </p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded px-4 py-2.5 min-w-[190px] shrink-0">
                <div className="flex items-center justify-between gap-4 text-xs text-gray-400 uppercase tracking-wider mb-1">
                  <span>Next Rotation</span>
                  <span className="text-cyan-accent font-mono font-bold text-base tabular-nums">
                    {formatRotationCountdown(rotation.remainingMs)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-cyan-accent transition-all duration-500"
                    style={{ width: `${rotationElapsedPct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rotation.entries.map(renderRotationCard)}
            </div>
          </section>
        )}

        {/* Supply Crates Section */}
        {showCrates && (
          <section className="mb-10">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">Supply Crates</h2>
              <p className="text-sm text-gray-400">
                Roll Supply Crates anytime for weapons and accessories across every tier. Cheaper
                crates carry higher Scrap/Faulty risk while high-tier drops are scarce; duplicates
                stack at 0★ so you can fuse gear up to 5★ in the Armory.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {SUPPLY_CRATES.map(renderCrateCard)}
            </div>
          </section>
        )}

        {/* Hero Signature Upgrades Section */}
        {showHeroes && (
          <section className="mb-10">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">Hero Recruitment &amp; Signature Upgrades</h2>
              <p className="text-sm text-gray-400">
                Unlock new operatives or permanently upgrade each hero&apos;s signature combat trait
                using Battle Coins.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ALL_HEROES.map(renderHeroUpgradeCard)}
            </div>
          </section>
        )}
      </div>

      {/* Animated Crate Drop Reveal Overlay */}
      <CrateOpeningOverlay
        payload={crateOverlay}
        balance={shopState.balance}
        onClose={() => setCrateOverlay(null)}
        onOpenMore={(crateId, count) => handleOpenCrate(crateId, count)}
        onNavigateArmory={(tab) => {
          setCrateOverlay(null)
          navigate(`/armory?tab=${tab}`)
        }}
      />
    </div>
  )
}

export default ShopView
