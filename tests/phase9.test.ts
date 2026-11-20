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
import {
  AREA_TWO_BOSSES,
  AREA_TWO_ENEMIES,
  GAME_AREAS,
  getAreaBossTemplateForWave,
  getAreaById,
  getAreaEnemies,
  getAreaMiniBossCap,
  getWave15FinalBossHp,
  isAreaUnlocked,
  selectAreaEnemyTemplateForWave,
  shouldSpawnRegularEnemiesInWave,
  WAVE_15_FINAL_BOSS_BASE_HP
} from '../src/config/arenas'
import { heroes, enemies, upgrades, achievements } from '../src/db/seedData'
import { validateSeedData } from '../src/db/validateSeed'
import { getEnemies } from '../src/services/database'
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
  BossArenaBounds,
  ClosingSideLaserMode,
  checkBossTelegraphHit,
  checkEnemyAoeHit,
  Enemy,
  getClosingSideLaserRects,
  getClosingSideLaserTrackRects,
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
  DEV_AUTHORIZED_EMAIL,
  DevLiveAction,
  dispatchDevAction,
  getDevSettings,
  grantDevCoins,
  isDevAuthorizedEmail,
  resetDevSettings,
  subscribeDevActions,
  updateDevSettings
} from '../src/services/devTools'
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
    assert.equal(WAVE_CONFIG.MAX_WAVE, 15)
    assert.equal(WaveManager.isBossWave(5), true)
    assert.equal(WaveManager.isBossWave(10), true)
    assert.equal(WaveManager.isBossWave(15), true)
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

  it('caps waves at Wave 15, anchors Final Boss in upper center, fires closing side lasers past half screen, tracking attacks, and bullet hell', () => {
    assert.equal(WAVE_CONFIG.MAX_WAVE, 15)
    assert.equal(WAVE_CONFIG.MAX_NORMAL_WAVE, 15)
    assert.equal(WaveManager.isBossWave(15), true)

    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 980, y: 1120, hero })
    const bossTemplate = enemies.find((e) => e.id === 'ene_04')!
    const arenaBounds: BossArenaBounds = { left: 360, top: 640, width: 1280, height: 720 }
    const anchorPos = { x: arenaBounds.left + arenaBounds.width / 2, y: arenaBounds.top + 195 }

    const finalBoss = new Enemy({
      x: anchorPos.x - 46,
      y: anchorPos.y - 46,
      enemyData: bossTemplate,
      target: player,
      isBoss: true,
      isStationaryBoss: true,
      isFinalBoss: true,
      anchorPos,
      arenaBounds
    })
    finalBoss.isSpawning = false

    // Stationary boss stays anchored in upper center even after collision resolution & movement ticks
    const collidingAdd = new Enemy({
      x: anchorPos.x - 15,
      y: anchorPos.y - 15,
      enemyData: enemies[0],
      target: player
    })
    collidingAdd.isSpawning = false
    resolveEnemyCollisions([finalBoss, collidingAdd], 2000, 4)
    assert.equal(Math.round(finalBoss.getCenter().x), anchorPos.x)
    assert.equal(Math.round(finalBoss.getCenter().y), anchorPos.y)

    finalBoss.specialCooldown = 0.05
    finalBoss.update(0.1, player)
    assert.ok(
      Math.abs(finalBoss.getCenter().x - anchorPos.x) < 1 &&
        Math.abs(finalBoss.getCenter().y - anchorPos.y) <= 4,
      'Wave 15 Final Boss must remain anchored at the upper center of the screen'
    )

    // First auto-selected special is closing_side_lasers reaching half way across the screen (0.5)
    assert.equal(finalBoss.telegraphs.length, 1)
    const firstTelegraph = finalBoss.telegraphs[0]
    assert.equal(firstTelegraph.kind, 'closing_side_lasers')
    assert.equal(firstTelegraph.hasTriggered, false)
    assert.equal(firstTelegraph.closingReachRatio, 0.5)
    assert.ok(firstTelegraph.safeRect)

    // Verify all 3 closing side laser modes ('left', 'right', 'pincer') stop at half screen (50%) & hit inside beam
    const sideModes: ClosingSideLaserMode[] = ['left', 'right', 'pincer']
    for (const mode of sideModes) {
      const atk = finalBoss.spawnTelegraphedAttack('closing_side_lasers', undefined, mode)!
      assert.equal(atk.kind, 'closing_side_lasers')
      assert.equal(atk.sideMode, mode)
      assert.equal(atk.closingReachRatio, 0.5)

      const trackRects = getClosingSideLaserTrackRects(atk)
      assert.ok(trackRects.length >= 1)
      for (const tr of trackRects) {
        assert.equal(tr.width, arenaBounds.width * 0.5, `${mode} laser track must extend half way across screen`)
      }

      // Advance to full laser sweep
      atk.hasTriggered = true
      atk.activeTimer = atk.activeDuration * 0.85
      const activeRects = getClosingSideLaserRects(atk)
      assert.equal(activeRects[0].width, arenaBounds.width * 0.5)

      // Player standing inside the swept half-screen beam gets hit; player inside safeRect dodges cleanly
      const laserZone = activeRects[0]
      const hitTarget = {
        x: laserZone.x + laserZone.width * 0.75,
        y: laserZone.y + laserZone.height * 0.5,
        radius: player.width / 2
      }
      const sr = atk.safeRect!
      const safeTarget = {
        x: sr.x + sr.width * 0.5,
        y: sr.y + sr.height * 0.5,
        radius: player.width / 2
      }
      assert.equal(checkBossTelegraphHit(atk, hitTarget), true)
      assert.equal(checkBossTelegraphHit(atk, safeTarget), false)
    }

    // Verify closing_side_lasers re-arms hit flag after cooldown while active
    finalBoss.telegraphs = [firstTelegraph]
    firstTelegraph.hasTriggered = true
    firstTelegraph.hasDamagedPlayer = true
    firstTelegraph.hitCooldown = 0
    finalBoss.update(0.6, player)
    assert.equal(firstTelegraph.hasDamagedPlayer, false, 'closing_side_lasers should re-arm after 0.55s hitCooldown')

    // Verify player-following tracking_strikes spawns sequential reticles at player's updated footsteps
    finalBoss.telegraphs = []
    const trackingAtk = finalBoss.spawnTelegraphedAttack('tracking_strikes')!
    assert.equal(trackingAtk.kind, 'tracking_strikes')
    assert.equal(trackingAtk.trackingBlasts?.length, 1)
    player.x += 220
    player.y += 90
    finalBoss.update(0.1, player)
    finalBoss.update(0.55, player)
    assert.ok((trackingAtk.trackingBlasts?.length ?? 0) >= 2, 'tracking_strikes must spawn follow-up blasts at new player coords')
    const newestBlast = trackingAtk.trackingBlasts![trackingAtk.trackingBlasts!.length - 1]
    assert.ok(Math.abs(newestBlast.x - player.getCenter().x) < 20)

    // Verify player-following pursuit_beam tracks initially, then locks aim 0.3s before firing and stays locked
    finalBoss.telegraphs = []
    player.x = anchorPos.x - 320
    player.y = anchorPos.y + 300
    const pursuitAtk = finalBoss.spawnTelegraphedAttack('pursuit_beam')!
    const initialBeamAngle = pursuitAtk.angle!
    player.x = anchorPos.x + 320
    finalBoss.update(0.4, player)
    assert.notEqual(pursuitAtk.angle, initialBeamAngle, 'pursuit_beam must track player during early windup')

    // Advance into the final 0.3s lock-in window and move player to opposite side -> angle must stay locked
    pursuitAtk.chargeTimer = pursuitAtk.chargeDuration - 0.28
    const lockedAngleBeforeFire = pursuitAtk.angle!
    player.x = anchorPos.x - 420
    finalBoss.update(0.2, player)
    assert.equal(pursuitAtk.angle, lockedAngleBeforeFire, 'pursuit_beam must stop tracking 0.3s before firing')

    // Trigger active fire and move player again -> angle must stay locked while firing
    finalBoss.update(0.15, player)
    assert.equal(pursuitAtk.hasTriggered, true)
    assert.equal(pursuitAtk.angle, lockedAngleBeforeFire, 'pursuit_beam must remain locked once firing')

    // Verify bullet_hell emits dense spiral projectile curtains
    finalBoss.telegraphs = []
    finalBoss.projectiles = []
    const bulletHellAtk = finalBoss.spawnTelegraphedAttack('bullet_hell')!
    assert.equal(bulletHellAtk.kind, 'bullet_hell')
    finalBoss.update(1.0, player)
    finalBoss.update(0.5, player)
    assert.ok(finalBoss.projectiles.length >= 20, 'bullet_hell must emit multi-spoke projectile curtains')

    // Verify Wave 15 shoot rotation includes homing seeker orbs
    finalBoss.telegraphs = []
    finalBoss.projectiles = []
    finalBoss.attackPatternIndex = 0
    finalBoss.shootCooldown = 0
    finalBoss.update(0.05, player)
    const homingOrb = finalBoss.projectiles.find((p) => (p.homingTurnRate ?? 0) > 0)
    assert.ok(
      homingOrb,
      'Wave 15 boss must fire homing seeker orbs that curve toward the player'
    )
    const initialDirX = homingOrb.direction.x
    const initialDirY = homingOrb.direction.y
    player.x = anchorPos.x - 420
    player.y = anchorPos.y + 420
    finalBoss.update(0.25, player)
    assert.ok(
      homingOrb.direction.x !== initialDirX || homingOrb.direction.y !== initialDirY,
      'Homing seeker orb trajectory must steer toward the player position'
    )
  })

  it('defines 2 distinct areas and unlocks Area 2 only after beating Wave 15', async () => {
    assert.equal(GAME_AREAS.length, 2)
    const area1 = getAreaById('carbon_sector')
    const area2 = getAreaById('astral_citadel')
    assert.equal(area1.id, 'carbon_sector')
    assert.equal(area2.id, 'astral_citadel')
    assert.notEqual(area1.floorColor, area2.floorColor)
    assert.equal(area2.unlockWaveRequirement, 15)
    assert.ok(area2.coinBonusMultiplier > 1)

    const areaUser = `area_user_${Date.now()}`
    const freshTelemetry = getLocalPlayerTelemetry(areaUser)
    assert.equal(isAreaUnlocked('carbon_sector', freshTelemetry), true)
    assert.equal(isAreaUnlocked('astral_citadel', freshTelemetry), false)

    // Reaching Wave 15 and losing must keep Area 2 locked
    await submitScore({
      userId: areaUser,
      playerName: 'AreaTester',
      survivalSeconds: 470,
      coinsCollected: 80,
      enemiesDefeated: 120,
      damageFreeWaveStreak: 1,
      waveReached: 15,
      victory: false,
      heroUsed: 'hero_01'
    })
    const afterLoss = getLocalPlayerTelemetry(areaUser)
    assert.equal(afterLoss.highest_wave, 15)
    assert.equal(afterLoss.wave_15_cleared, false)
    assert.equal(isAreaUnlocked('astral_citadel', afterLoss), false)

    // Beating Wave 15 (victory: true) unlocks Area 2
    await submitScore({
      userId: areaUser,
      playerName: 'AreaTester',
      survivalSeconds: 510,
      coinsCollected: 150,
      enemiesDefeated: 180,
      damageFreeWaveStreak: 2,
      waveReached: 15,
      victory: true,
      heroUsed: 'hero_01'
    })
    const afterVictory = getLocalPlayerTelemetry(areaUser)
    assert.equal(afterVictory.wave_15_cleared, true)
    assert.equal(afterVictory.boss_victories, 1)
    assert.equal(isAreaUnlocked('astral_citadel', afterVictory), true)
  })

  it('populates Area 2 with 5 distinct enemies including slow tanky AoE-indicator mini-boss', async () => {
    const a2Enemies = getAreaEnemies('astral_citadel')
    assert.equal(a2Enemies.length, 5)
    assert.equal(AREA_TWO_ENEMIES.length, 5)

    const [tankSwarm, fastSwarm, rangedOne, rangedTwo, miniBoss] = a2Enemies
    const standardSwarm = enemies.find((e) => e.id === 'ene_01')!

    // 1. Slower, tankier swarmer vs faster, slightly weaker swarmer
    assert.ok(tankSwarm.hp > standardSwarm.hp, 'Area 2 tank swarmer must be tankier than Spore Zombie')
    assert.ok(tankSwarm.speed < standardSwarm.speed, 'Area 2 tank swarmer must be slower than Spore Zombie')
    assert.ok(fastSwarm.speed > tankSwarm.speed, 'Area 2 fast swarmer must be much faster than tank swarmer')
    assert.ok(fastSwarm.hp < standardSwarm.hp && fastSwarm.hp < tankSwarm.hp, 'Area 2 fast swarmer must be weaker')

    // 2. Two distinct ranged enemies shoot projectiles at player
    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 800, y: 800, hero })

    const r1 = new Enemy({ x: 1020, y: 800, enemyData: rangedOne, target: player })
    r1.isSpawning = false
    r1.shootCooldown = 0
    r1.update(0.05, player)
    assert.equal(r1.canShoot, true)
    assert.equal(r1.projectiles.length, 1, 'Prism Bolt Weaver should fire focused single crystal bolt')

    const r2 = new Enemy({ x: 1020, y: 800, enemyData: rangedTwo, target: player })
    r2.isSpawning = false
    r2.shootCooldown = 0
    r2.update(0.05, player)
    assert.equal(r2.canShoot, true)
    assert.equal(r2.projectiles.length, 3, 'Astral Arcanist should fire 3-orb fanned projectile spread')

    // 3. Slow tanky mini-boss launches AoE projectile with ground landing indicator so player can dodge
    assert.ok(miniBoss.hp >= 240, 'Mini-boss must be tanky')
    assert.ok(miniBoss.speed < tankSwarm.speed, 'Mini-boss must be slow')

    const warden = new Enemy({ x: 1120, y: 800, enemyData: miniBoss, target: player })
    warden.isSpawning = false
    warden.isBoss = false
    assert.equal(warden.isMiniBoss, true)
    assert.equal(warden.launchesAoeProjectiles, true)

    warden.aoeCooldown = 0.02
    warden.update(0.05, player)
    assert.equal(warden.aoeProjectiles.length, 1, 'Mini-boss must launch an AoE mortar projectile')

    const aoe = warden.aoeProjectiles[0]
    assert.equal(aoe.hasDetonated, false)
    assert.ok(aoe.radius >= 80, 'AoE indicator radius should be clearly visible')
    assert.ok(aoe.flightDuration >= 1.2, 'AoE flight duration must give player time to dodge')

    const playerInsideZone = { x: aoe.targetX, y: aoe.targetY, radius: player.width / 2 }
    const playerDodged = { x: aoe.targetX + aoe.radius + 70, y: aoe.targetY, radius: player.width / 2 }
    assert.equal(checkEnemyAoeHit(aoe, playerInsideZone), true)
    assert.equal(checkEnemyAoeHit(aoe, playerDodged), false)

    // Advance past flightDuration -> mortar lands and detonates
    warden.update(aoe.flightDuration + 0.05, player)
    assert.equal(aoe.hasDetonated, true)

    // 4. Area 2 wave spawning selects all 5 archetypes cleanly & respects caps
    assert.equal(getAreaMiniBossCap(2), 0)
    assert.equal(getAreaMiniBossCap(3), 1)
    assert.equal(getAreaMiniBossCap(8), 2)

    assert.equal(
      selectAreaEnemyTemplateForWave('astral_citadel', 1, { roll: 0.2 }).template.id,
      'ene_a2_01'
    )
    assert.equal(
      selectAreaEnemyTemplateForWave('astral_citadel', 1, { roll: 0.8 }).template.id,
      'ene_a2_02'
    )
    assert.equal(
      selectAreaEnemyTemplateForWave('astral_citadel', 2, { roll: 0.85, subRoll: 0.2, canSpawnRanged: true }).template.id,
      'ene_a2_03'
    )
    assert.equal(
      selectAreaEnemyTemplateForWave('astral_citadel', 2, { roll: 0.85, subRoll: 0.8, canSpawnRanged: true }).template.id,
      'ene_a2_04'
    )
    assert.equal(
      selectAreaEnemyTemplateForWave('astral_citadel', 3, { roll: 0.95, canSpawnMiniBoss: true }).template.id,
      'ene_a2_05'
    )

    // 5. Codex enemy database lists Area 1 (4), Area 2 enemies (5), and Area 2 bosses (3) = 12 entries
    const codexEnemies = await getEnemies()
    assert.ok(codexEnemies.length >= 12)
    for (const a2 of AREA_TWO_ENEMIES) {
      assert.ok(codexEnemies.some((e) => e.id === a2.id))
    }
    for (const b2 of AREA_TWO_BOSSES) {
      assert.ok(codexEnemies.some((e) => e.id === b2.id))
    }
  })

  it('spawns dedicated Area 2 bosses every 5 waves, disables regular spawns on ~150k HP Wave 15 bosses, and enables Endless Mode in Area 2', () => {
    // 1. Area 2 defines 3 distinct bosses every 5 waves + Endless alternating bosses
    assert.equal(AREA_TWO_BOSSES.length, 3)
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 5).id, 'boss_a2_05')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 10).id, 'boss_a2_10')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 15).id, 'boss_a2_15')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 20).id, 'boss_a2_10')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 25).id, 'boss_a2_05')
    assert.equal(getAreaBossTemplateForWave('carbon_sector', 15).id, 'ene_04')

    // 2. Wave 15 Final Boss HP is ~150k in Area 1 and scaled ~187.5k in Area 2
    assert.equal(WAVE_15_FINAL_BOSS_BASE_HP, 150000)
    assert.equal(getWave15FinalBossHp('carbon_sector'), 150000)
    assert.equal(getWave15FinalBossHp('astral_citadel'), 187500)

    // 3. Wave 15 disables regular enemy spawns while normal waves & Endless Mode (16+) allow regular spawns
    assert.equal(shouldSpawnRegularEnemiesInWave(14, false), true)
    assert.equal(shouldSpawnRegularEnemiesInWave(15, false), false)
    assert.equal(shouldSpawnRegularEnemiesInWave(16, true), true)
    assert.equal(shouldSpawnRegularEnemiesInWave(20, true), true)

    // 4. Verify Area 2 bosses instantiate with boss flags, balanced contact damage, and AoE/telegraph attacks
    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 960, y: 980, hero })

    const w5Boss = new Enemy({
      x: 640,
      y: 640,
      enemyData: getAreaBossTemplateForWave('astral_citadel', 5),
      target: player,
      isBoss: true
    })
    assert.equal(w5Boss.isBoss, true)
    assert.equal(w5Boss.canShoot, true)

    const w10Boss = new Enemy({
      x: 640,
      y: 640,
      enemyData: getAreaBossTemplateForWave('astral_citadel', 10),
      target: player,
      isBoss: true
    })
    assert.equal(w10Boss.isBoss, true)
    assert.equal(w10Boss.launchesAoeProjectiles, true)

    const w15Seraph = new Enemy({
      x: 960,
      y: 360,
      enemyData: getAreaBossTemplateForWave('astral_citadel', 15),
      target: player,
      isBoss: true,
      isStationaryBoss: true,
      isFinalBoss: true,
      anchorPos: { x: 960, y: 360 },
      arenaBounds: { left: 320, top: 160, width: 1280, height: 720 }
    })
    w15Seraph.isSpawning = false
    assert.equal(w15Seraph.isBoss, true)
    assert.equal(w15Seraph.isFinalBoss, true)
    assert.equal(w15Seraph.isStationaryBoss, true)
    assert.equal(w15Seraph.launchesAoeProjectiles, true)
    assert.equal(w15Seraph.maxHealth, 150000)
    assert.ok(w15Seraph.damage < 100, 'W15 Seraph contact damage must remain balanced (not 20% of 150k HP)')

    w15Seraph.specialCooldown = 0.02
    w15Seraph.update(0.05, player)
    assert.equal(w15Seraph.telegraphs[0]?.kind, 'closing_side_lasers')
  })

  it('restricts Dev Panel exclusively to 408443@guhsd.net and supports coins, damage multipliers, health, and wave skips', () => {
    assert.equal(DEV_AUTHORIZED_EMAIL, '408443@guhsd.net')
    assert.equal(isDevAuthorizedEmail('408443@guhsd.net'), true)
    assert.equal(isDevAuthorizedEmail(' 408443@GUHSD.NET '), true)
    assert.equal(isDevAuthorizedEmail(null), false)
    assert.equal(isDevAuthorizedEmail(undefined), false)
    assert.equal(isDevAuthorizedEmail('other@guhsd.net'), false)
    assert.equal(isDevAuthorizedEmail('admin@swarm.io'), false)

    const outsiderUser = `outsider_${Date.now()}`
    const devUser = `dev_${Date.now()}`

    // Outsider emails cannot grant coins, edit multipliers, or dispatch live actions
    const blockedCoins = grantDevCoins(outsiderUser, 'other@guhsd.net', 5000)
    assert.equal(blockedCoins.success, false)
    assert.equal(getShopAccountState(outsiderUser).balance, 0)

    const blockedSettings = updateDevSettings('other@guhsd.net', {
      damageMultiplier: 50,
      healthMultiplier: 10,
      godMode: true
    })
    assert.equal(blockedSettings.success, false)
    assert.equal(getDevSettings('other@guhsd.net').damageMultiplier, 1)

    const blockedWaveSkip = dispatchDevAction('other@guhsd.net', {
      type: 'skip_wave',
      mode: 'set',
      value: 15
    })
    assert.equal(blockedWaveSkip.success, false)

    // Authorized account 408443@guhsd.net can grant coins, scale damage & health, and dispatch wave skips
    const receivedActions: DevLiveAction[] = []
    const unsub = subscribeDevActions((action) => receivedActions.push(action))

    const coinGrant = grantDevCoins(devUser, '408443@guhsd.net', 25000)
    assert.equal(coinGrant.success, true)
    assert.equal(coinGrant.newBalance, 25000)
    assert.equal(getShopAccountState(devUser).balance, 25000)

    const updated = updateDevSettings('408443@guhsd.net', {
      damageMultiplier: 25,
      healthMultiplier: 5,
      godMode: true,
      startingWaveOverride: 10
    })
    assert.equal(updated.success, true)
    assert.equal(updated.settings.damageMultiplier, 25)
    assert.equal(updated.settings.healthMultiplier, 5)
    assert.equal(updated.settings.godMode, true)
    assert.equal(updated.settings.startingWaveOverride, 10)

    assert.equal(dispatchDevAction('408443@guhsd.net', { type: 'heal_full' }).success, true)
    assert.equal(
      dispatchDevAction('408443@guhsd.net', { type: 'skip_wave', mode: 'set', value: 15 }).success,
      true
    )

    unsub()
    assert.ok(receivedActions.some((a) => a.type === 'grant_coins' && a.amount === 25000))
    assert.ok(receivedActions.some((a) => a.type === 'heal_full'))
    assert.ok(receivedActions.some((a) => a.type === 'skip_wave' && a.value === 15))

    const reset = resetDevSettings('408443@guhsd.net')
    assert.equal(reset.success, true)
    assert.equal(reset.settings.damageMultiplier, 1)
    assert.equal(reset.settings.healthMultiplier, 1)
    assert.equal(reset.settings.godMode, false)
  })
})


