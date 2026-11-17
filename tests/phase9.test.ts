/**
 * Phase 9: Test & Deploy - Automated Verification Suite
 * Run via: npm test
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  GAME_CONFIG,
  WAVE_CONFIG,
  SCORING_CONFIG,
  LEVEL_UP_CONFIG,
  MAX_WEAPON_UPGRADE_LEVEL,
  getEnemyScaling,
  getWaveRangedSpawnLimit,
  getWaveSpawnConfig,
  selectEnemyTypeIndexForWave,
  getUpgradeLevelStats,
  getUpgradeLevelPerkHint,
  getUpgradeOverdriveHint,
  getXpForNextLevel
} from '../src/config/gameConstants'
import { heroes, enemies, upgrades, achievements } from '../src/db/seedData'
import { validateSeedData } from '../src/db/validateSeed'
import {
  calculateScoreFormula,
  estimateWaveFromSeconds,
  evaluateAchievements,
  getScores
} from '../src/services/scores'
import { validateLoadoutInput } from '../src/services/loadouts'
import { Collision } from '../src/game/utils/collision'
import { ScoreManager } from '../src/game/ScoreManager'
import { XPManager } from '../src/game/XPManager'
import { WaveManager } from '../src/game/WaveManager'
import { Player } from '../src/game/entities/Player'
import {
  checkBossTelegraphHit,
  Enemy,
  resolveEnemyCollisions
} from '../src/game/entities/Enemy'
import { Coin } from '../src/game/entities/Coin'
import { Projectile } from '../src/game/entities/Projectile'
import { Summon } from '../src/game/entities/Summon'
import {
  registerAccount,
  loginAccount,
  logoutAccount,
  getLocalAuthState,
  listSavedAccounts
} from '../src/services/auth'
import { getLocalPlayerTelemetry, submitScore } from '../src/services/scores'
import { isConfiguredSupabase } from '../src/services/supabase'
import {
  computeEquippedAccessoryBonuses,
  creditShopCoins,
  equipShopWeapon,
  fuseGearStacks,
  FUSION_COPIES_REQUIRED,
  getInventoryStacks,
  getShopAccountState,
  getShopItemById,
  getShopWeaponById,
  getShopAccessoryById,
  getStackCount,
  getStarScaledAccessoryBonuses,
  getStarScaledWeaponStats,
  getSupplyCrateById,
  getTotalStackCount,
  isBadGearRarity,
  MAX_EQUIPPED_ACCESSORIES,
  MAX_GEAR_STARS,
  openSupplyCrate,
  pickRarityFromCrate,
  purchaseShopItem,
  salvageShopItem,
  SHOP_ACCESSORIES,
  SHOP_WEAPONS,
  shopWeaponsAsUpgrades,
  SUPPLY_CRATES,
  toggleEquipAccessory
} from '../src/services/shop'
import { createLoadout, getExtendedLoadout } from '../src/services/loadouts'

describe('Phase 9: Swarm Protocol Core Mechanics & Data Integrity', () => {
  it('validates canonical seed data (35 entities + foreign keys)', () => {
    const result = validateSeedData()
    assert.equal(result.valid, true, `Seed validation failed: ${result.errors.join('; ')}`)
    assert.equal(heroes.length, 6)
    assert.equal(enemies.length, 4)
    assert.equal(upgrades.length, 21)
    assert.equal(achievements.length, 4)

    const fireball = upgrades.find(u => u.id === 'upg_21')
    assert.ok(fireball, 'Inferno Fireball upg_21 must exist in seedData')
    assert.equal(fireball.name, 'Inferno Fireball')
    assert.equal(fireball.category, 'AoE Weapon')

    const boss = enemies.find(e => e.id === 'ene_04')
    assert.ok(boss, 'Boss ene_04 must exist in seedData')
    assert.equal(boss.name, 'Aegis Commander Drone')
    assert.equal(boss.hp, 240)
    assert.equal(boss.coin_value, 50)
  })

  it('enforces scoring formula S = 10t + 25c and edge cases', () => {
    assert.equal(SCORING_CONFIG.SECONDS_MULTIPLIER, 10)
    assert.equal(SCORING_CONFIG.COINS_MULTIPLIER, 25)

    assert.equal(calculateScoreFormula(600, 400), 16000)
    assert.equal(calculateScoreFormula(0, 0), 0)
    assert.equal(calculateScoreFormula(-12, -5), 0)
    assert.equal(calculateScoreFormula(45.9, 10), 450 + 250)
    assert.equal(estimateWaveFromSeconds(0), 1)
    assert.equal(estimateWaveFromSeconds(132), 5)

    const manager = new ScoreManager()
    manager.start()
    manager.update(60000) // 60 seconds
    manager.addCoins(12)
    assert.equal(manager.calculateFinalScore(), 60 * 10 + 12 * 25)
  })

  it('calibrates player and enemy speeds relative to BASE_PLAYER_SPEED = 220 px/s', () => {
    assert.equal(GAME_CONFIG.BASE_PLAYER_SPEED, 220)

    const ranger = heroes.find(h => h.id === 'hero_02')!
    const player = new Player({ hero: ranger })
    assert.equal(player.maxHealth, ranger.hp)
    assert.equal(player.speed, ranger.speed * 220)

    const spore = enemies.find(e => e.id === 'ene_01')!
    const enemy = new Enemy({ enemyData: spore })
    assert.equal(enemy.speed, spore.speed * 220)
  })

  it('enforces exact circle-to-circle collision detection', () => {
    // Distance 50 < (32 + 24) => collision
    assert.equal(
      Collision.circleCircle({ x: 0, y: 0, radius: 32 }, { x: 50, y: 0, radius: 24 }),
      true
    )
    // Distance 60 > (32 + 24) => no collision
    assert.equal(
      Collision.circleCircle({ x: 0, y: 0, radius: 32 }, { x: 60, y: 0, radius: 24 }),
      false
    )
  })

  it('triggers Wave 5 Mini-Boss schedule and 30s+3s wave cycle constants', () => {
    assert.equal(WAVE_CONFIG.WAVE_DURATION_SECONDS, 30)
    assert.equal(WAVE_CONFIG.BREATHER_DURATION_SECONDS, 3)
    assert.equal(WAVE_CONFIG.TOTAL_CYCLE_SECONDS, 33)
    assert.equal(WaveManager.isBossWave(5), true)
    assert.equal(WaveManager.isBossWave(10), true)
    assert.equal(WaveManager.isBossWave(4), false)

    const boss = WaveManager.getBossEnemy()
    assert.ok(boss)
    assert.equal(boss.id, 'ene_04')
  })

  it('levels up at 100 XP and generates 3 upgrade cards', () => {
    const xp = new XPManager()
    let leveledUpTo = 0
    let offeredCards = 0

    xp.onLevelUp((level, cards) => {
      leveledUpTo = level
      offeredCards = cards.length
    })

    const didLevel = xp.addXP(LEVEL_UP_CONFIG.XP_TO_LEVEL, 'test')
    assert.equal(didLevel, true)
    assert.equal(leveledUpTo, 2)
    assert.equal(offeredCards, 3)
  })

  it('validates Armory loadout creation constraints', () => {
    const invalidEmpty = validateLoadoutInput({
      loadout_name: '   ',
      hero_id: '',
      primary_upgrade_id: ''
    })
    assert.equal(invalidEmpty.valid, false)
    assert.equal(invalidEmpty.errors.length, 3)

    const validLoadout = validateLoadoutInput({
      loadout_name: 'Vanguard Overload',
      hero_id: 'hero_01',
      primary_upgrade_id: 'upg_12'
    })
    assert.equal(validLoadout.valid, true)
    assert.equal(validLoadout.errors.length, 0)
  })

  it('evaluates achievement unlock thresholds accurately (ach_01..ach_04)', () => {
    const locked = evaluateAchievements({
      total_enemies_defeated: 50,
      max_single_run_coins: 200,
      longest_damage_free_wave_streak: 2
    })
    assert.equal(locked.filter(a => a.unlocked).length, 0)

    const unlocked = evaluateAchievements({
      total_enemies_defeated: 1200,
      max_single_run_coins: 550,
      longest_damage_free_wave_streak: 3
    })
    assert.equal(unlocked.filter(a => a.unlocked).length, 4)
  })

  it('keeps Coin dimensions strictly positive on initial spawn frames to prevent IndexSizeError', () => {
    const coin = new Coin({ x: 100, y: 100, value: 1 })
    coin.update(0.016)
    assert.ok(coin.width / 2 - 2 > 0, `Expected inner coin radius > 0, got ${coin.width / 2 - 2}`)
    coin.update(0.6)
    assert.equal(coin.width, 20)
  })

  it('supports endless leveling past level 10 with scaling XP thresholds', () => {
    assert.equal(LEVEL_UP_CONFIG.MAX_LEVEL, Number.POSITIVE_INFINITY)
    assert.equal(getXpForNextLevel(1), 100)
    assert.ok(getXpForNextLevel(12) > getXpForNextLevel(1))

    const xp = new XPManager()
    xp.addXP(5000, 'endless test')
    assert.ok(xp.getLevel() > 12, `Expected level > 12, got ${xp.getLevel()}`)
    assert.equal(xp.isMaxLevel(), false)
  })

  it('scales enemy HP, speed, and damage over waves and survival time', () => {
    const early = getEnemyScaling(1, 0)
    const mid = getEnemyScaling(4, 180)
    const late = getEnemyScaling(10, 480)

    assert.equal(early.hpMultiplier, 1)
    assert.ok(mid.hpMultiplier > early.hpMultiplier)
    assert.ok(late.hpMultiplier > mid.hpMultiplier)
    assert.ok(late.speedMultiplier > mid.speedMultiplier)
    assert.ok(late.damageMultiplier > mid.damageMultiplier)
  })

  it('activates Companion Robot and Temporal Echo summon attacks', () => {
    const hero = heroes.find(h => h.id === 'hero_03')!
    const player = new Player({ x: 500, y: 500, hero })
    const spore = enemies.find(e => e.id === 'ene_01')!
    const enemy = new Enemy({ x: 600, y: 500, enemyData: spore, target: player })
    enemy.isSpawning = false

    const bot = new Summon({
      kind: 'companion_robot',
      upgradeId: 'upg_01',
      x: 540,
      y: 500,
      damage: 15,
      cooldown: 0.8
    })
    const botResult = bot.update(0.25, player, [enemy], [{ x: 500, y: 500 }])
    assert.ok(botResult?.projectile, 'Companion Robot must fire a laser projectile when ready')
    assert.equal(botResult?.projectile?.damage, 15)

    const echo = new Summon({
      kind: 'temporal_echo',
      upgradeId: 'upg_14',
      x: 470,
      y: 500,
      damage: 18,
      cooldown: 2.0
    })
    const echoResult = echo.update(0.25, player, [enemy], [{ x: 460, y: 500 }, { x: 500, y: 500 }])
    assert.ok(echoResult?.projectile, 'Temporal Echo must fire a piercing phase bolt')
    assert.ok(echoResult?.pulse, 'Temporal Echo must emit a temporal distortion pulse')
  })

  it('keeps blue Ranged Sniper drones inside visible skirmish range rather than fleeing to screen edge', () => {
    const hero = heroes.find(h => h.id === 'hero_01')!
    const player = new Player({ x: 1000, y: 1000, hero })
    const droneData = enemies.find(e => e.id === 'ene_03')!

    // Drone starts far away (420px): should move closer toward visible mid-range
    const farDrone = new Enemy({ x: 1420, y: 1000, enemyData: droneData, target: player })
    farDrone.isSpawning = false
    const initialFarDist = Math.hypot(
      farDrone.getCenter().x - player.getCenter().x,
      farDrone.getCenter().y - player.getCenter().y
    )
    farDrone.update(0.5, player)
    const afterFarDist = Math.hypot(
      farDrone.getCenter().x - player.getCenter().x,
      farDrone.getCenter().y - player.getCenter().y
    )
    assert.ok(
      afterFarDist < initialFarDist,
      `Expected far blue sniper drone to close in from ${initialFarDist}px, got ${afterFarDist}px`
    )

    // Drone at mid-range (210px): should circle-strafe around player without retreating to edge
    const midDrone = new Enemy({ x: 1210, y: 1000, enemyData: droneData, target: player })
    midDrone.isSpawning = false
    midDrone.update(0.4, player)
    const afterMidDist = Math.hypot(
      midDrone.getCenter().x - player.getCenter().x,
      midDrone.getCenter().y - player.getCenter().y
    )
    assert.ok(
      afterMidDist >= 150 && afterMidDist <= 265,
      `Expected blue sniper drone to stay in 150-265px visible range, got ${afterMidDist}px`
    )
  })

  it('creates accounts, authenticates logins, rejects bad credentials, ignores placeholder Supabase config, and isolates telemetry', async () => {
    assert.equal(
      isConfiguredSupabase('https://your-project-id.supabase.co', 'your-supabase-anon-key-here'),
      false
    )
    assert.equal(isConfiguredSupabase('', ''), false)
    assert.equal(
      isConfiguredSupabase('https://realproject123.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_valid_len'),
      true
    )

    const reg = await registerAccount({
      username: 'CyberNova',
      email: 'nova@swarm.test',
      password: 'password123',
      favoriteHero: 'hero_02'
    })
    assert.equal(reg.success, true)
    assert.ok(reg.user)
    assert.equal(getLocalAuthState().user?.email, 'nova@swarm.test')
    assert.ok(listSavedAccounts().some(a => a.username === 'CyberNova'))

    // Duplicate email rejected
    const dup = await registerAccount({
      username: 'OtherName',
      email: 'nova@swarm.test',
      password: 'password123'
    })
    assert.equal(dup.success, false)

    // Logout clears session
    await logoutAccount()
    assert.equal(getLocalAuthState().user, null)

    // Wrong password rejected
    const badLogin = await loginAccount({ identifier: 'nova@swarm.test', password: 'wrong' })
    assert.equal(badLogin.success, false)

    // Valid login via callsign restores session
    const goodLogin = await loginAccount({ identifier: 'CyberNova', password: 'password123' })
    assert.equal(goodLogin.success, true)
    assert.equal(goodLogin.user?.id, reg.user?.id)

    // Per-account telemetry isolation
    await submitScore({
      userId: reg.user!.id,
      playerName: 'CyberNova',
      survivalSeconds: 120,
      coinsCollected: 40,
      enemiesDefeated: 25,
      damageFreeWaveStreak: 2,
      heroUsed: 'hero_02'
    })
    const acctStats = getLocalPlayerTelemetry(reg.user!.id)
    const otherStats = getLocalPlayerTelemetry('acct_unrelated_test')
    assert.equal(acctStats.total_games, 1)
    assert.equal(otherStats.total_games, 0)
  })

  it('starts with no pre-seeded fake leaderboard entries and computes Lv 1-5 Overdrive + Sentinel Turret', async () => {
    const currentScores = await getScores()
    assert.equal(
      currentScores.some((s) => s.id.startsWith('seed_score_')),
      false,
      'Pre-seeded fake ranked leaderboard entries must be removed'
    )

    assert.equal(MAX_WEAPON_UPGRADE_LEVEL, 5)
    const lv1 = getUpgradeLevelStats(20, 1.0, 1)
    const lv2 = getUpgradeLevelStats(20, 1.0, 2)
    const lv3 = getUpgradeLevelStats(20, 1.0, 3)
    const lv4 = getUpgradeLevelStats(20, 1.0, 4)
    const lv5 = getUpgradeLevelStats(20, 1.0, 5)

    // Upgrades start weak at Lv 1 and scale monotonically through Lv 5 Overdrive
    assert.equal(lv1.damage, 11)
    assert.ok(lv1.cooldown_s > 1.0)
    assert.equal(lv1.isMaxEvolution, false)
    assert.ok(lv1.damage < lv2.damage && lv2.damage < lv3.damage && lv3.damage < lv4.damage && lv4.damage < lv5.damage)
    assert.ok(lv1.cooldown_s > lv2.cooldown_s && lv2.cooldown_s > lv3.cooldown_s && lv3.cooldown_s > lv4.cooldown_s && lv4.cooldown_s > lv5.cooldown_s)
    assert.ok(lv5.damage >= lv4.damage * 1.6, 'Level 5 Overdrive should deliver a massive damage jump')
    assert.equal(lv5.isMaxEvolution, true)
    assert.ok(getUpgradeLevelPerkHint('upg_10', 2).length > 0)
    assert.ok(getUpgradeOverdriveHint('upg_20').includes('LV 5 OVERDRIVE'))

    // Higher enemy spawn counts per wave and reduced ranged drone weight
    const spawnW1 = getWaveSpawnConfig(1, 0)
    const spawnW3 = getWaveSpawnConfig(3, 66)
    assert.ok(spawnW1.spawnRate >= 1.8 && spawnW1.waveBurst >= 6)
    assert.ok(spawnW3.spawnRate > spawnW1.spawnRate)
    assert.ok(spawnW3.waveBurst > spawnW1.waveBurst)
    assert.ok(spawnW3.maxActiveEnemies > spawnW1.maxActiveEnemies)
    assert.equal(selectEnemyTypeIndexForWave(3, 0.55), 0)
    assert.equal(selectEnemyTypeIndexForWave(3, 0.89), 1)
    assert.equal(selectEnemyTypeIndexForWave(3, 0.90), 2)

    // Wave-by-wave enemy scaling check
    const w1 = getEnemyScaling(1, 0)
    const w2 = getEnemyScaling(2, 33)
    const w5 = getEnemyScaling(5, 132)
    assert.equal(w1.hpMultiplier, 1)
    assert.ok(w2.hpMultiplier > w1.hpMultiplier && w2.hpMultiplier >= 1.3 && w2.damageMultiplier > 1.2)
    assert.ok(w5.hpMultiplier > w2.hpMultiplier * 2.1)

    // Sentinel Turret (upg_20) Lv 1 & Lv 5 Overdrive attack behavior
    const hero = heroes.find(h => h.id === 'hero_03')!
    const player = new Player({ x: 500, y: 500, hero })
    const spore = enemies.find(e => e.id === 'ene_01')!
    const enemy = new Enemy({ x: 610, y: 500, enemyData: spore, target: player })
    enemy.isSpawning = false

    const turretLv1 = new Summon({
      kind: 'sentinel_turret',
      upgradeId: 'upg_20',
      x: 520,
      y: 500,
      damage: 20,
      cooldown: 0.65,
      level: 1
    })
    const res1 = turretLv1.update(0.25, player, [enemy], [{ x: 500, y: 500 }])
    assert.ok(res1?.projectile)
    assert.equal(res1?.extraProjectiles, undefined)

    const turretLv5 = new Summon({
      kind: 'sentinel_turret',
      upgradeId: 'upg_20',
      x: 520,
      y: 500,
      damage: lv5.damage,
      cooldown: lv5.cooldown_s,
      level: 5
    })
    const res5 = turretLv5.update(0.25, player, [enemy], [{ x: 500, y: 500 }])
    assert.ok(res5?.projectile && res5?.extraProjectiles?.length === 1)
    assert.equal(res5?.projectile?.maxPierces, 3)

    // Distinct attack projectile sprites (Flame, IceShard, ChronoBlade) & level-up heal behavior
    const flame = new Projectile({ type: 'Flame', damage: 12, color: '#FF5500' })
    const shard = new Projectile({ type: 'IceShard', damage: 22, color: '#22D3EE' })
    const chrono = new Projectile({ type: 'ChronoBlade', damage: 18, color: '#C084FC' })
    assert.equal(flame.type, 'Flame')
    assert.equal(shard.type, 'IceShard')
    assert.equal(chrono.type, 'ChronoBlade')
    flame.update(0.1)
    assert.equal(flame.trail.length, 1)

    player.takeDamage(60)
    const damagedHp = player.health
    const healAmount = Math.max(15, Math.round(player.maxHealth * 0.4))
    player.heal(healAmount)
    assert.ok(player.health > damagedHp && player.health <= player.maxHealth)
  })

  it('prevents overlapping enemies via resolveEnemyCollisions, caps wave ranged spawns (5-10 scaling higher), and triggers boss dodgeable telegraph attacks', () => {
    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 500, y: 500, hero })
    const spore = enemies.find((e) => e.id === 'ene_01')!
    const bossData = enemies.find((e) => e.id === 'ene_04')!

    // 1. Overlapping enemies at identical/close positions must separate cleanly
    const e1 = new Enemy({ x: 600, y: 500, enemyData: spore, target: player })
    const e2 = new Enemy({ x: 600, y: 500, enemyData: spore, target: player })
    const e3 = new Enemy({ x: 608, y: 504, enemyData: spore, target: player })
    resolveEnemyCollisions([e1, e2, e3], 2000, 4)
    const pairs: Array<[Enemy, Enemy]> = [
      [e1, e2],
      [e1, e3],
      [e2, e3]
    ]
    for (const [a, b] of pairs) {
      const dist = Math.hypot(
        a.getCenter().x - b.getCenter().x,
        a.getCenter().y - b.getCenter().y
      )
      assert.ok(
        dist >= a.width / 2 + b.width / 2 - 1,
        `Expected separated enemy centers >= ${a.width / 2 + b.width / 2 - 1}px, got ${dist}px`
      )
    }

    // 2. Per-wave ranged enemy quota stays 5-10 in standard waves and scales slightly higher later
    assert.equal(getWaveRangedSpawnLimit(1), 0)
    assert.equal(getWaveRangedSpawnLimit(2), 0)
    assert.equal(getWaveRangedSpawnLimit(3), 5)
    assert.equal(getWaveRangedSpawnLimit(5), 7)
    assert.equal(getWaveRangedSpawnLimit(8), 10)
    assert.ok(getWaveRangedSpawnLimit(14) > 10 && getWaveRangedSpawnLimit(14) <= 16)
    assert.notEqual(selectEnemyTypeIndexForWave(5, 0.99, false), 2)

    // 3. Wave 5 Boss spawns big dodgeable telegraph indicators that hit inside and miss when dodged
    const boss = new Enemy({ x: 760, y: 500, enemyData: bossData, target: player, isBoss: true })
    boss.isSpawning = false
    boss.specialCooldown = 0.05
    boss.update(0.1, player)
    assert.equal(boss.telegraphs.length, 1, 'Boss must initiate a telegraphed big attack')

    const slam = boss.telegraphs[0]
    assert.equal(slam.hasTriggered, false)
    const playerCircle = { x: player.getCenter().x, y: player.getCenter().y, radius: player.width / 2 }
    assert.equal(checkBossTelegraphHit(slam, playerCircle), true)

    // Player dodges outside the indicator radius before charge completes
    const dodgedCircle = {
      x: slam.x + slam.radius + 80,
      y: slam.y,
      radius: player.width / 2
    }
    assert.equal(checkBossTelegraphHit(slam, dodgedCircle), false)

    // Advance telegraph through full wind-up -> triggers blast
    boss.update(slam.chargeDuration + 0.05, player)
    assert.equal(slam.hasTriggered, true)

    // Check Mega Laser corridor telegraph hit & dodge
    const laser = boss.spawnTelegraphedAttack('mega_laser')!
    assert.ok(laser && laser.kind === 'mega_laser')
    assert.equal(checkBossTelegraphHit(laser, playerCircle), true)
    const perpX = -Math.sin(laser.angle || 0)
    const perpY = Math.cos(laser.angle || 0)
    const sideStepCircle = {
      x: playerCircle.x + perpX * (laser.radius + 60),
      y: playerCircle.y + perpY * (laser.radius + 60),
      radius: playerCircle.radius
    }
    assert.equal(checkBossTelegraphHit(laser, sideStepCircle), false)
  })

  it('credits Battle Coins from combat, blocks direct weapon buys, sells accessories, and equips crate gear in Armory', async () => {
    const shopTestUser = `shop_user_${Date.now()}`

    // Canonical seed upgrade count is 21 (including Inferno Fireball) while shop exposes 10 crate weapons + 10 accessories
    assert.equal(upgrades.length, 21)
    assert.equal(SHOP_WEAPONS.length, 10)
    assert.equal(SHOP_ACCESSORIES.length, 10)
    assert.equal(shopWeaponsAsUpgrades().length, 10)

    // Higher Shop pricing verified
    assert.ok((getShopItemById('wpn_plasma_lance')?.price ?? 0) >= 200)
    assert.ok((getShopItemById('wpn_celestial_swarm')?.price ?? 0) >= 2000)

    // Initial empty wallet
    const initial = getShopAccountState(shopTestUser)
    assert.equal(initial.balance, 0)
    assert.equal(initial.ownedIds.length, 0)

    // Battle coins credited via submitScore (when not pre-banked) and live creditShopCoins without double counting
    await submitScore({
      userId: shopTestUser,
      playerName: 'ShopTester',
      survivalSeconds: 60,
      coinsCollected: 50,
      enemiesDefeated: 20,
      damageFreeWaveStreak: 1,
      heroUsed: 'hero_01'
    })
    assert.equal(getShopAccountState(shopTestUser).balance, 50)

    // Live banking during run + submitScore(coinsAlreadyBanked: true) must NOT double count
    creditShopCoins(shopTestUser, 100)
    await submitScore({
      userId: shopTestUser,
      playerName: 'ShopTester',
      survivalSeconds: 45,
      coinsCollected: 100,
      enemiesDefeated: 30,
      damageFreeWaveStreak: 1,
      heroUsed: 'hero_01',
      coinsAlreadyBanked: true
    })
    assert.equal(getShopAccountState(shopTestUser).balance, 150)

    // Cannot equip unowned weapon, cannot direct-buy weapons or crateOnly salvage, and cannot buy accessory exceeding wallet
    const unownedEquip = equipShopWeapon(shopTestUser, 'wpn_plasma_lance')
    assert.equal(unownedEquip.success, false)
    const directWeaponBlocked = purchaseShopItem(shopTestUser, 'wpn_plasma_lance')
    assert.equal(directWeaponBlocked.success, false)
    const crateOnlyDirect = purchaseShopItem(shopTestUser, 'wpn_rusty_pistol')
    assert.equal(crateOnlyDirect.success, false)
    const tooExpensiveAcc = purchaseShopItem(shopTestUser, 'acc_regen_matrix')
    assert.equal(tooExpensiveAcc.success, false)

    // Top up wallet for direct accessory purchases (total 150 + 1850 = 2000)
    creditShopCoins(shopTestUser, 1850) // balance -> 2000

    // Direct weapon purchase remains blocked even with plenty of coins
    assert.equal(purchaseShopItem(shopTestUser, 'wpn_plasma_lance').success, false)

    // Unlock Plasma Lance via Tactical Crate roll (rng: 0.65 -> uncommon, then pick wpn_plasma_lance index 0)
    const crateRolls = [0.65, 0.01]
    let cIdx = 0
    const crateUnlock = openSupplyCrate(shopTestUser, 'crate_tactical', () => crateRolls[cIdx++] ?? 0)
    assert.equal(crateUnlock.success, true)
    assert.equal(crateUnlock.item?.id, 'wpn_plasma_lance')
    assert.equal(getShopAccountState(shopTestUser).balance, 1740) // 2000 - 260

    // Purchase 4 accessories directly at higher prices (180 + 260 + 420 + 560 = 1420 -> 320 left)
    assert.equal(purchaseShopItem(shopTestUser, 'acc_titanium_core').success, true)
    assert.equal(purchaseShopItem(shopTestUser, 'acc_flux_thrusters').success, true)
    assert.equal(purchaseShopItem(shopTestUser, 'acc_magnet_array').success, true)
    assert.equal(purchaseShopItem(shopTestUser, 'acc_overclock_coil').success, true)
    assert.equal(getShopAccountState(shopTestUser).balance, 320)

    // Buying an already-owned accessory stacks another 0★ copy for Armory Fusion
    const secondTitanium = purchaseShopItem(shopTestUser, 'acc_titanium_core')
    assert.equal(secondTitanium.success, true)
    assert.equal(secondTitanium.stars, 0)
    assert.equal(secondTitanium.newCount, 2)
    assert.equal(getTotalStackCount(secondTitanium.state, 'acc_titanium_core'), 2)
    assert.equal(secondTitanium.state.balance, 140)

    // Equip crate-unlocked weapon in Armory (defaults to 0★)
    const eqWpn = equipShopWeapon(shopTestUser, 'wpn_plasma_lance')
    assert.equal(eqWpn.success, true)
    assert.equal(eqWpn.state.equippedWeaponId, 'wpn_plasma_lance')
    assert.equal(eqWpn.state.equippedWeaponStars, 0)

    // Equip 3 accessories cleanly; 4th rejected until one is unequipped
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_titanium_core').success, true)
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_flux_thrusters').success, true)
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_magnet_array').success, true)
    const overSlot = toggleEquipAccessory(shopTestUser, 'acc_overclock_coil')
    assert.equal(overSlot.success, false)
    assert.equal(overSlot.state.equippedAccessoryIds.length, MAX_EQUIPPED_ACCESSORIES)

    // Unequip one accessory and verify combined stat bonuses
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_flux_thrusters').success, true)
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_overclock_coil').success, true)

    const finalState = getShopAccountState(shopTestUser)
    const bonuses = computeEquippedAccessoryBonuses(
      finalState.equippedAccessoryIds,
      finalState.equippedAccessoryStars
    )
    assert.equal(bonuses.bonusHp, 40)
    assert.equal(bonuses.damageReduction, 0.1)
    assert.equal(bonuses.magnetRangeMultiplier, 1.9)
    assert.equal(bonuses.bonusCoinChance, 0.25)
    assert.equal(bonuses.cooldownRateMultiplier, 1.15)

    // Loadouts referencing crate-unlocked Shop weapons resolve full primary_upgrade metadata
    const createdLoadout = await createLoadout(
      {
        loadout_name: 'Shop Plasma Spec',
        hero_id: 'hero_02',
        primary_upgrade_id: 'wpn_plasma_lance'
      },
      shopTestUser
    )
    const extended = await getExtendedLoadout(createdLoadout.id)
    assert.ok(extended?.primary_upgrade)
    assert.equal(extended?.primary_upgrade?.name, 'Plasma Lance Mk.II')

    // Shop weapons & Inferno Fireball support Lv 1 -> Lv 5 Overdrive hints and Fireball AoE burn stats
    assert.ok(getUpgradeOverdriveHint('wpn_plasma_lance').includes('LV 5 OVERDRIVE'))
    assert.ok(getUpgradeLevelPerkHint('wpn_celestial_swarm', 3).length > 0)
    assert.ok(getUpgradeLevelPerkHint('upg_21', 1).toLowerCase().includes('burn'))
    assert.ok(getUpgradeOverdriveHint('upg_21').includes('LV 5 OVERDRIVE'))

    const fireballProj = new Projectile({
      type: 'Fireball',
      damage: 32,
      explosionRadius: 72,
      burnRadius: 72,
      burnDuration: 2.65,
      burnDamage: 10
    })
    assert.equal(fireballProj.type, 'Fireball')
    assert.equal(fireballProj.burnRadius, 72)
    assert.equal(fireballProj.burnDuration, 2.65)
    assert.equal(fireballProj.burnDamage, 10)
  })

  it('opens Supply Crates with bad-item risk, rarer high-tier drops, 0★ stacking duplicates, and Armory salvaging', () => {
    const crateUser = `crate_user_${Date.now()}`
    assert.equal(SUPPLY_CRATES.length, 3)

    const salvageCrate = getSupplyCrateById('crate_salvage')!
    const apexCrate = getSupplyCrateById('crate_apex')!

    // Scarcity order: high-tier drops are much rarer than common/bad drops on salvage crates, and apex has higher rare+ odds
    const salvageBadWeight = (salvageCrate.rarityWeights.scrap || 0) + (salvageCrate.rarityWeights.faulty || 0)
    const salvageHighWeight =
      (salvageCrate.rarityWeights.rare || 0) +
      (salvageCrate.rarityWeights.epic || 0) +
      (salvageCrate.rarityWeights.legendary || 0)
    const apexHighWeight =
      (apexCrate.rarityWeights.rare || 0) +
      (apexCrate.rarityWeights.epic || 0) +
      (apexCrate.rarityWeights.legendary || 0)

    assert.ok(salvageBadWeight > 0.45)
    assert.ok(salvageHighWeight < 0.1)
    assert.ok(apexHighWeight > salvageHighWeight)

    assert.equal(pickRarityFromCrate(salvageCrate, 0.05), 'scrap')
    assert.equal(pickRarityFromCrate(salvageCrate, 0.9995), 'legendary')

    creditShopCoins(crateUser, 1500)

    // Deterministic roll 1: roll into Scrap gear (bad item) at 0★
    const rollsBad = [0.05, 0.6]
    let idxBad = 0
    const badResult = openSupplyCrate(crateUser, 'crate_salvage', () => rollsBad[idxBad++] ?? 0)
    assert.equal(badResult.success, true)
    assert.equal(badResult.rarity, 'scrap')
    assert.equal(badResult.stars, 0)
    assert.equal(badResult.newCount, 1)
    assert.equal(badResult.isBadGear, true)
    assert.equal(isBadGearRarity(badResult.rarity!), true)
    assert.equal(badResult.isDuplicate, false)
    assert.ok(badResult.item)

    // Deterministic roll 2: rolling exact same scrap item stacks 0★ count to 2 for fusion
    let idxDup = 0
    const dupResult = openSupplyCrate(crateUser, 'crate_salvage', () => rollsBad[idxDup++] ?? 0)
    assert.equal(dupResult.success, true)
    assert.equal(dupResult.isDuplicate, true)
    assert.equal(dupResult.stars, 0)
    assert.equal(dupResult.newCount, 2)
    assert.equal(dupResult.totalOwnedCount, 2)
    assert.equal(dupResult.refundCoins, 0)

    // Deterministic roll 3: Apex crate high roll yields Legendary gear
    const rollsLegend = [0.99, 0.1]
    let idxLeg = 0
    const legendResult = openSupplyCrate(crateUser, 'crate_apex', () => rollsLegend[idxLeg++] ?? 0)
    assert.equal(legendResult.success, true)
    assert.equal(legendResult.rarity, 'legendary')
    assert.equal(legendResult.isBadGear, false)

    // Check negative accessory penalty & salvage 1 copy at a time from stack
    const badAccBonuses = computeEquippedAccessoryBonuses(['acc_lead_boots'])
    assert.ok(badAccBonuses.speedMultiplier < 1)

    const beforeSalvageBalance = getShopAccountState(crateUser).balance
    const salvageOne = salvageShopItem(crateUser, badResult.item!.id, 0)
    assert.equal(salvageOne.success, true)
    assert.equal(salvageOne.newCount, 1)
    assert.equal(salvageOne.refundCoins, badResult.item!.salvageValue)
    assert.equal(salvageOne.state.balance, beforeSalvageBalance + badResult.item!.salvageValue)
    assert.equal(salvageOne.state.ownedIds.includes(badResult.item!.id), true)

    const salvageTwo = salvageShopItem(crateUser, badResult.item!.id, 0)
    assert.equal(salvageTwo.success, true)
    assert.equal(salvageTwo.newCount, 0)
    assert.equal(salvageTwo.state.ownedIds.includes(badResult.item!.id), false)
  })

  it('stacks multiple gear copies starting at 0★ and fuses them in Armory Forge up to 5★', () => {
    const forgeUser = `forge_user_${Date.now()}`
    assert.equal(MAX_GEAR_STARS, 5)
    assert.equal(FUSION_COPIES_REQUIRED, 2)

    // Give enough coins for 32 direct purchases of Standard Alloy Vest (32 * 110 = 3520) + crates
    creditShopCoins(forgeUser, 12000)

    // Buy 32 copies of acc_alloy_vest (0★) -> enough for 0★->1★->2★->3★->4★->5★
    for (let i = 0; i < 32; i++) {
      const buyRes = purchaseShopItem(forgeUser, 'acc_alloy_vest')
      assert.equal(buyRes.success, true)
    }

    const beforeForge = getShopAccountState(forgeUser)
    assert.equal(getStackCount(beforeForge, 'acc_alloy_vest', 0), 32)
    assert.equal(getTotalStackCount(beforeForge, 'acc_alloy_vest'), 32)

    // Equip 0★ Alloy Vest before fusing to verify equipped star tier auto-promotes during fusion
    assert.equal(toggleEquipAccessory(forgeUser, 'acc_alloy_vest', 0).success, true)
    assert.equal(getShopAccountState(forgeUser).equippedAccessoryStars['acc_alloy_vest'], 0)

    // Cascade fusions: 32x 0★ -> 16x 1★ -> 8x 2★ -> 4x 3★ -> 2x 4★ -> 1x 5★
    let countForTier = 16
    for (let star = 0; star < MAX_GEAR_STARS; star++) {
      for (let f = 0; f < countForTier; f++) {
        const fuseRes = fuseGearStacks(forgeUser, 'acc_alloy_vest', star)
        assert.equal(fuseRes.success, true)
        assert.equal(fuseRes.fromStars, star)
        assert.equal(fuseRes.toStars, star + 1)
      }
      countForTier = countForTier / 2
    }

    const afterFiveStar = getShopAccountState(forgeUser)
    assert.equal(getStackCount(afterFiveStar, 'acc_alloy_vest', 5), 1)
    assert.equal(getTotalStackCount(afterFiveStar, 'acc_alloy_vest'), 1)
    assert.equal(afterFiveStar.equippedAccessoryStars['acc_alloy_vest'], 5)

    // Cannot fuse past 5★ or when fewer than 2 copies remain
    const maxFuseFail = fuseGearStacks(forgeUser, 'acc_alloy_vest', 5)
    assert.equal(maxFuseFail.success, false)

    // Verify 5★ accessory stat scaling (+100% HP: 15 -> 30 Max HP) propagates to combat bonuses
    const vest = getShopAccessoryById('acc_alloy_vest')!
    const vest5Stats = getStarScaledAccessoryBonuses(vest, 5)
    assert.equal(vest5Stats.bonusHp, 30)
    const fiveStarBonuses = computeEquippedAccessoryBonuses(
      afterFiveStar.equippedAccessoryIds,
      afterFiveStar.equippedAccessoryStars
    )
    assert.equal(fiveStarBonuses.bonusHp, 30)

    // Verify Crate Weapon stacking + fusion (2 copies of Plasma Lance -> 1★) and stat scaling
    const crateRolls = [0.65, 0.01, 0.65, 0.01]
    let rIdx = 0
    openSupplyCrate(forgeUser, 'crate_tactical', () => crateRolls[rIdx++] ?? 0)
    openSupplyCrate(forgeUser, 'crate_tactical', () => crateRolls[rIdx++] ?? 0)
    assert.equal(getStackCount(getShopAccountState(forgeUser), 'wpn_plasma_lance', 0), 2)

    assert.equal(equipShopWeapon(forgeUser, 'wpn_plasma_lance', 0).success, true)
    const fuseWeapon = fuseGearStacks(forgeUser, 'wpn_plasma_lance', 0)
    assert.equal(fuseWeapon.success, true)
    assert.equal(fuseWeapon.toStars, 1)
    assert.equal(fuseWeapon.state.equippedWeaponStars, 1)

    const plasma = getShopWeaponById('wpn_plasma_lance')!
    const baseStats = getStarScaledWeaponStats(plasma, 0)
    const fiveStarWpnStats = getStarScaledWeaponStats(plasma, 5)
    assert.ok(fiveStarWpnStats.damage >= baseStats.damage * 2)
    assert.ok(fiveStarWpnStats.cooldown_s < baseStats.cooldown_s)

    const upgradeRows = shopWeaponsAsUpgrades({ wpn_plasma_lance: 5 })
    const scaledRow = upgradeRows.find((u) => u.id === 'wpn_plasma_lance')!
    assert.equal(scaledRow.damage, fiveStarWpnStats.damage)

    // Inventory stack entries list both 5★ Alloy Vest and 1★ Plasma Lance
    const inv = getInventoryStacks(fuseWeapon.state)
    assert.ok(inv.some((e) => e.itemId === 'acc_alloy_vest' && e.stars === 5 && e.count === 1))
    assert.ok(inv.some((e) => e.itemId === 'wpn_plasma_lance' && e.stars === 1 && e.count === 1))
  })
})
