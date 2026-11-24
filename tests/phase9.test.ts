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
  ASTRAL_SCOURGE_PHASE_ONE_HP,
  ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS,
  ASTRAL_SCOURGE_PHASE_TWO_DELAY_SECONDS,
  ASTRAL_SCOURGE_PHASE_TWO_HP,
  ASTRAL_SCOURGE_PHASE_TWO_ORBIT_RADIUS,
  ASTRAL_SCOURGE_PHASE_TWO_SEGMENT_COUNT,
  computeBossCutsceneShake,
  computeDevourerCutsceneCameraFrame,
  computeDevourerCutsceneShake,
  DEVOURER_CUTSCENE_DURATION_SECONDS,
  DEVOURER_CUTSCENE_THEME,
  DEV_SPAWNABLE_ENEMIES,
  GAME_AREAS,
  getAreaBossTemplateForWave,
  getAreaById,
  getAreaEnemies,
  getAreaMiniBossCap,
  getAreaOneBossBuff,
  getAreaTwoBossBuff,
  getAstralScourgePhaseTwoCutsceneTheme,
  getDevSpawnableEnemyById,
  getWave15BossCombatProfile,
  getWave15CutsceneTheme,
  getWave15FinalBossHp,
  isAreaUnlocked,
  isSecretDevOnlyBossId,
  SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES,
  SECRET_DEVOURER_OF_GODS_ID,
  SECRET_DEVOURER_OF_GODS_TEMPLATE,
  selectAreaEnemyTemplateForWave,
  shouldSpawnRegularEnemiesInWave,
  WAVE_15_CUTSCENE_DURATION_SECONDS,
  WAVE_15_FINAL_BOSS_BASE_HP
} from '../src/config/arenas'
import {
  computeHeroBurnPerTick,
  getArcSlashConfig,
  getChronoCloneConfig,
  getEngineerSummonBonuses,
  getGrimReaperWeaponConfig,
  getHeroAbility,
  getHeroDamageReduction,
  getHeroFireRateBonus,
  getHeroUpgradeCost,
  getMuramasaWeaponConfig,
  getPairedHeroArcSlashBonus,
  getPaladinConfig,
  getPyroBurnConfig,
  getRangerHomingConfig,
  getStormAssassinConfig,
  getHeroCritBonuses,
  getSummonCountForUpgrade,
  getTempestSphereWeaponConfig,
  HERO_ABILITY_CONSTANTS,
  HERO_UPGRADE_COSTS,
  MAX_HERO_UPGRADE_LEVEL,
  resolveStartingUpgradeIds,
  shouldApplyHomingForHero
} from '../src/config/heroAbilities'
import {
  ALL_HEROES,
  getUnlockableHeroSpec,
  isUnlockableHero
} from '../src/config/unlockableHeroes'
import {
  AREA_TWO_UPGRADES,
  getAvailableRunUpgrades,
  isAreaTwoUpgradesUnlocked
} from '../src/config/areaUpgrades'
import {
  CRIT_CONFIG,
  UNIVERSAL_CRIT_UPGRADES,
  computeCritTextSwayAngle,
  formatDamageFloatingText,
  getPassiveCritUpgradeBonuses,
  getWeaponCritProfile,
  rollCriticalHit
} from '../src/config/critSystem'
import { heroes, enemies, upgrades, achievements } from '../src/db/seedData'
import { validateSeedData } from '../src/db/validateSeed'
import { getEnemies, getHeroes, getUpgrades } from '../src/services/database'
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
import { isVisiblePlayerWeaponId, Player } from '../src/game/entities/Player'
import {
  BossArenaBounds,
  ClosingSideLaserMode,
  checkBossTelegraphHit,
  checkAstralScourgeTailHit,
  checkDevourerSegmentHit,
  checkEnemyAoeHit,
  Enemy,
  getAstralOrbitalGridLines,
  getAstralScourgePhaseTwoAttackKind,
  getAstralTargetedLaserLines,
  getWave15BossAttackKind,
  getRotatingCrossLaserSegments,
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
import { computePostGameMetrics, formatSurvivalClock } from '../src/config/postGameSummary'
import AudioService, {
  ASTRAL_SCOURGE_YOUTUBE_URL,
  ASTRAL_SCOURGE_YOUTUBE_VIDEO_ID,
  buildYouTubeEmbedUrl,
  DEVOURER_BEAT_DROP_SECONDS,
  DEVOURER_YOUTUBE_URL,
  DEVOURER_YOUTUBE_VIDEO_ID,
  MUSIC_TRACK_METADATA,
  parseYouTubeVideoId
} from '../src/services/AudioService'
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
  formatRotationCountdown,
  fuseGearStacks,
  FUSION_COPIES_REQUIRED,
  getInventoryStacks,
  getShopAccountState,
  getShopItemById,
  getShopRotation,
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
  openMultipleSupplyCrates,
  openSupplyCrate,
  pickRarityFromCrate,
  purchaseShopItem,
  salvageShopItem,
  SHOP_ACCESSORIES,
  SHOP_CATALOG,
  SHOP_ROTATION_INTERVAL_MS,
  SHOP_WEAPONS,
  shopWeaponsAsUpgrades,
  sortGearStacks,
  SUPPLY_CRATES,
  toggleEquipAccessory
} from '../src/services/shop'
import { getWeaponVisualBehavior } from '../src/game/weaponVisuals'
import {
  computeDifficultyCoinPayout,
  formatDifficultyCoinLabel,
  GAME_DIFFICULTIES,
  getDifficultyById
} from '../src/config/difficulties'
import {
  computeHeroMasteryBonuses,
  evaluateHeroMasteryProgress,
  formatMasteryBonusSummary,
  getHeroMasteryProgress,
  getHeroMasteryTiers,
  HERO_MASTERY_TIERS,
  recordHeroRoundsCompleted
} from '../src/services/heroMastery'
import {
  getAllHeroUpgradeLevels,
  getHeroUpgradeLevel,
  purchaseHeroSignatureUpgrade
} from '../src/services/heroUpgrades'
import {
  checkAndSyncMilestoneHeroUnlocks,
  isHeroUnlocked,
  setHeroUnlockedForDev,
  unlockHeroWithCoins
} from '../src/services/heroUnlocks'
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

    // Canonical seed upgrade count is 21 (including Inferno Fireball) while shop exposes 19 crate weapons + 16 accessories
    assert.equal(upgrades.length, 21)
    assert.equal(SHOP_WEAPONS.length, 19)
    assert.equal(SHOP_ACCESSORIES.length, 16)
    assert.equal(shopWeaponsAsUpgrades().length, 19)

    // Higher Shop pricing & Celestial Seeker Swarm Epic rarity verified
    assert.ok((getShopItemById('wpn_plasma_lance')?.price ?? 0) >= 200)
    assert.ok((getShopItemById('wpn_void_reaper')?.price ?? 0) >= 2000)
    assert.equal(getShopWeaponById('wpn_celestial_swarm')?.rarity, 'epic')
    assert.equal(getShopWeaponById('wpn_celestial_swarm')?.tierLabel, 'Epic')
    assert.equal(getShopWeaponById('wpn_celestial_swarm')?.accentColor, '#C084FC')

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

    // Deterministic 10-minute rotation timestamp (weapons & accessories on sale)
    const testNowMs = 1_700_000_000_000
    const rotation = getShopRotation(testNowMs)
    assert.equal(rotation.entries.length, 6)
    assert.equal(rotation.entries.filter((e) => e.item.kind === 'weapon').length, 3)
    assert.equal(rotation.entries.filter((e) => e.item.kind === 'accessory').length, 3)
    assert.ok(rotation.remainingMs > 0 && rotation.remainingMs <= SHOP_ROTATION_INTERVAL_MS)
    assert.equal(formatRotationCountdown(61_000), '01:01')
    for (const entry of rotation.entries) {
      assert.equal(isBadGearRarity(entry.item.rarity), false)
      assert.ok(entry.salePrice < entry.originalPrice)
      assert.ok(entry.discountPercent >= 15 && entry.discountPercent <= 35)
    }

    // Advancing 10 minutes advances windowIndex and rotates inventory
    const nextRotation = getShopRotation(testNowMs + SHOP_ROTATION_INTERVAL_MS)
    assert.equal(nextRotation.windowIndex, rotation.windowIndex + 1)
    assert.notDeepEqual(
      nextRotation.entries.map((e) => e.item.id),
      rotation.entries.map((e) => e.item.id)
    )

    // Cannot equip unowned weapon, cannot direct-buy permanent/non-rotation items or bad crate gear, and cannot buy sale item exceeding wallet
    const unownedEquip = equipShopWeapon(shopTestUser, 'wpn_plasma_lance')
    assert.equal(unownedEquip.success, false)
    const nonRotationWeaponBlocked = purchaseShopItem(shopTestUser, 'wpn_plasma_lance', testNowMs)
    assert.equal(nonRotationWeaponBlocked.success, false)
    const nonRotationAccBlocked = purchaseShopItem(shopTestUser, 'acc_titanium_core', testNowMs)
    assert.equal(nonRotationAccBlocked.success, false)
    const crateOnlyDirect = purchaseShopItem(shopTestUser, 'wpn_rusty_pistol', testNowMs)
    assert.equal(crateOnlyDirect.success, false)
    // At testNowMs, acc_chrono_accelerator is on sale for 865c (> 150c balance)
    const tooExpensiveSaleAcc = purchaseShopItem(shopTestUser, 'acc_chrono_accelerator', testNowMs)
    assert.equal(tooExpensiveSaleAcc.success, false)

    // Top up wallet for rotation sale purchases & crate roll (total 150 + 3850 = 4000)
    creditShopCoins(shopTestUser, 3850) // balance -> 4000

    // Non-rotation items remain blocked even with plenty of coins
    assert.equal(purchaseShopItem(shopTestUser, 'wpn_plasma_lance', testNowMs).success, false)
    assert.equal(purchaseShopItem(shopTestUser, 'acc_titanium_core', testNowMs).success, false)

    // Unlock Plasma Lance via Tactical Crate roll (rng: 0.65 -> uncommon, then pick wpn_plasma_lance index 0)
    const crateRolls = [0.65, 0.01]
    let cIdx = 0
    const crateUnlock = openSupplyCrate(shopTestUser, 'crate_tactical', () => crateRolls[cIdx++] ?? 0)
    assert.equal(crateUnlock.success, true)
    assert.equal(crateUnlock.item?.id, 'wpn_plasma_lance')
    assert.equal(getShopAccountState(shopTestUser).balance, 3740) // 4000 - 260

    // Purchase a rotating Weapon & 3 rotating Accessories at their discounted sale prices
    const rotWeapon = rotation.entries.find((e) => e.item.kind === 'weapon')!
    const rotAccessories = rotation.entries.filter((e) => e.item.kind === 'accessory')
    assert.equal(rotAccessories.length, 3)

    const boughtRotWeapon = purchaseShopItem(shopTestUser, rotWeapon.item.id, testNowMs)
    assert.equal(boughtRotWeapon.success, true)
    assert.equal(boughtRotWeapon.pricePaid, rotWeapon.salePrice)
    assert.equal(boughtRotWeapon.discountPercent, rotWeapon.discountPercent)

    for (const accEntry of rotAccessories) {
      const res = purchaseShopItem(shopTestUser, accEntry.item.id, testNowMs)
      assert.equal(res.success, true)
      assert.equal(res.pricePaid, accEntry.salePrice)
    }

    // Buying an already-owned rotating item stacks another 0★ copy for Armory Fusion
    const secondAccCopy = purchaseShopItem(shopTestUser, rotAccessories[0].item.id, testNowMs)
    assert.equal(secondAccCopy.success, true)
    assert.equal(secondAccCopy.stars, 0)
    assert.equal(secondAccCopy.newCount, 2)
    assert.equal(getTotalStackCount(secondAccCopy.state, rotAccessories[0].item.id), 2)

    // Acquire a 4th distinct accessory from the next 10-minute rotation to test the 3-slot accessory cap
    const fourthAccEntry = nextRotation.entries.find(
      (e) =>
        e.item.kind === 'accessory' &&
        !rotAccessories.some((existing) => existing.item.id === e.item.id)
    )!
    assert.equal(
      purchaseShopItem(shopTestUser, fourthAccEntry.item.id, testNowMs + SHOP_ROTATION_INTERVAL_MS)
        .success,
      true
    )

    // Equip crate-unlocked weapon in Armory (defaults to 0★)
    const eqWpn = equipShopWeapon(shopTestUser, 'wpn_plasma_lance')
    assert.equal(eqWpn.success, true)
    assert.equal(eqWpn.state.equippedWeaponId, 'wpn_plasma_lance')
    assert.equal(eqWpn.state.equippedWeaponStars, 0)

    // Equip 3 accessories cleanly; 4th rejected until one is unequipped
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_chrono_accelerator').success, true)
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_magnet_array').success, true)
    assert.equal(toggleEquipAccessory(shopTestUser, 'acc_flux_thrusters').success, true)
    const overSlot = toggleEquipAccessory(shopTestUser, fourthAccEntry.item.id)
    assert.equal(overSlot.success, false)
    assert.equal(overSlot.state.equippedAccessoryIds.length, MAX_EQUIPPED_ACCESSORIES)

    // Verify combined stat bonuses from the 3 equipped rotation accessories
    const finalState = getShopAccountState(shopTestUser)
    const bonuses = computeEquippedAccessoryBonuses(
      finalState.equippedAccessoryIds,
      finalState.equippedAccessoryStars
    )
    assert.equal(bonuses.speedMultiplier, 1.3) // 1 + 0.12 (chrono) + 0.18 (flux)
    assert.equal(bonuses.cooldownRateMultiplier, 1.24)
    assert.equal(bonuses.xpMultiplier, 1.15)
    assert.equal(bonuses.magnetRangeMultiplier, 1.9)
    assert.equal(bonuses.bonusCoinChance, 0.25)

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
    assert.equal(SUPPLY_CRATES.length, 4)

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
      (apexCrate.rarityWeights.legendary || 0) +
      (apexCrate.rarityWeights.mythic || 0)

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

    // Deterministic roll 3: Apex crate roll in [0.955, 0.99) yields Legendary gear
    const rollsLegend = [0.97, 0.1]
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

    // Give enough coins for 32 crate pulls of Standard Alloy Vest (32 * 95 = 3040)
    creditShopCoins(forgeUser, 12000)

    // Collect 32 copies of acc_alloy_vest (0★) via deterministic Salvage Crate rolls (0.6 -> common, 0.9 -> acc_alloy_vest)
    const alloySeq = [0.6, 0.9]
    for (let i = 0; i < 32; i++) {
      let sIdx = 0
      const dropRes = openSupplyCrate(forgeUser, 'crate_salvage', () => alloySeq[sIdx++] ?? 0)
      assert.equal(dropRes.success, true)
      assert.equal(dropRes.item?.id, 'acc_alloy_vest')
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

    // 5. Codex enemy database lists Area 1 (4), Area 2 enemies (5), and Area 2 bosses (4) = 13 entries
    const codexEnemies = await getEnemies()
    assert.ok(codexEnemies.length >= 13)
    for (const a2 of AREA_TWO_ENEMIES) {
      assert.ok(codexEnemies.some((e) => e.id === a2.id))
    }
    for (const b2 of AREA_TWO_BOSSES) {
      assert.ok(codexEnemies.some((e) => e.id === b2.id))
    }
  })

  it('spawns dedicated Area 2 bosses every 5 waves, disables regular spawns on ~150k HP Wave 15 bosses, and enables Endless Mode in Area 2', () => {
    // 1. Area 2 defines 4 distinct bosses, including the Wave 20 final boss
    assert.equal(AREA_TWO_BOSSES.length, 4)
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 5).id, 'boss_a2_05')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 10).id, 'boss_a2_10')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 15).id, 'boss_a2_15')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 20).id, 'boss_a2_20')
    assert.equal(getAreaBossTemplateForWave('astral_citadel', 25).id, 'boss_a2_05')
    assert.equal(getAreaBossTemplateForWave('carbon_sector', 15).id, 'ene_04')

    // 2. Wave 15 Final Boss HP is ~150k in Area 1 and scaled higher in harder Area 2 (+55% threat)
    const area2Meta = getAreaById('astral_citadel')
    assert.ok(area2Meta.enemyHpMultiplier >= 1.5)
    assert.ok(area2Meta.enemyDamageMultiplier >= 1.2)
    assert.ok(area2Meta.enemySpawnRateMultiplier >= 1.15)
    assert.equal(WAVE_15_FINAL_BOSS_BASE_HP, 150000)
    assert.equal(getWave15FinalBossHp('carbon_sector'), 150000)
    assert.equal(getWave15FinalBossHp('astral_citadel'), 232500)

    const a2W5Buff = getAreaTwoBossBuff(5)
    const a2W10Buff = getAreaTwoBossBuff(10)
    assert.ok(a2W5Buff.hpMultiplier >= 3.0 && a2W5Buff.damageReduction >= 0.2)
    assert.ok(a2W10Buff.hpMultiplier > a2W5Buff.hpMultiplier && a2W10Buff.enableEnrage)

    // 3. Wave 15 and active Devourer of Gods disable regular enemy spawns; normal waves & Endless Mode allow regular spawns
    assert.equal(shouldSpawnRegularEnemiesInWave(14, false), true)
    assert.equal(shouldSpawnRegularEnemiesInWave(15, false), false)
    assert.equal(shouldSpawnRegularEnemiesInWave(16, true), true)
    assert.equal(shouldSpawnRegularEnemiesInWave(20, true), true)
    assert.equal(shouldSpawnRegularEnemiesInWave(5, false, true), false)
    assert.equal(shouldSpawnRegularEnemiesInWave(16, true, true), false)

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
      isWave15SpecialBoss: true,
      anchorPos: { x: 960, y: 360 },
      arenaBounds: { left: 320, top: 160, width: 1280, height: 720 }
    })
    w15Seraph.isSpawning = false
    assert.equal(w15Seraph.isBoss, true)
    assert.equal(w15Seraph.isFinalBoss, false)
    assert.equal(w15Seraph.isWave15SpecialBoss, true)
    assert.equal(w15Seraph.isStationaryBoss, true)
    assert.equal(w15Seraph.launchesAoeProjectiles, true)
    assert.equal(w15Seraph.maxHealth, 150000)
    assert.equal(w15Seraph.spawnDelay, 6.2)
    assert.ok(w15Seraph.damage < 100, 'W15 Seraph contact damage must remain balanced (not 20% of 150k HP)')

    w15Seraph.specialCooldown = 0.02
    w15Seraph.update(0.05, player)
    assert.equal(w15Seraph.telegraphs[0]?.kind, 'pursuit_beam')
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

  it('equips all 6 reworked heroes with distinct signature abilities', () => {
    assert.equal(heroes.length, 6)
    for (const h of heroes) {
      const spec = getHeroAbility(h.id)
      assert.equal(spec.heroId, h.id)
      assert.ok(spec.abilityName.length > 0 && spec.shortTag.length > 0)
    }

    // 1. Vanguard Blade (hero_01): Buffed Muramasa Arc Slash (larger radius, higher damage, faster cooldown)
    const vanguardArc = getArcSlashConfig(40, 1, 'hero_01')
    const standardArc = getArcSlashConfig(40, 1, 'hero_02')
    assert.equal(vanguardArc.isMuramasa, true)
    assert.equal(standardArc.isMuramasa, false)
    assert.ok(vanguardArc.radius > standardArc.radius)
    assert.ok(vanguardArc.damage > standardArc.damage)
    assert.ok(vanguardArc.cooldownScale < 1)

    // 2. Outpost Ranger (hero_02): Homing guidance applied to ALL projectiles
    assert.equal(shouldApplyHomingForHero('hero_02'), true)
    assert.equal(shouldApplyHomingForHero('hero_01'), false)
    const homingBullet = new Projectile({
      x: 100,
      y: 100,
      direction: { x: 1, y: 0 },
      speed: 400,
      damage: 25,
      type: 'Basic',
      homingTarget: { x: 100, y: 260 },
      homingStrength: HERO_ABILITY_CONSTANTS.RANGER_HOMING_STRENGTH
    })
    homingBullet.update(0.1)
    assert.ok(homingBullet.direction.y > 0.2, 'Outpost Ranger projectile must steer toward enemy target')

    // 3. Tech Engineer (hero_03): Extra minions (+2 drones, +1 echoes/turrets) & +15% minion fire rate
    assert.equal(getSummonCountForUpgrade('upg_01', 1, 'hero_03'), 3)
    assert.equal(getSummonCountForUpgrade('upg_01', 1, 'hero_01'), 1)
    assert.equal(getSummonCountForUpgrade('upg_01', 5, 'hero_03'), 5)
    assert.equal(getSummonCountForUpgrade('upg_14', 1, 'hero_03'), 2)
    assert.equal(getSummonCountForUpgrade('upg_20', 1, 'hero_03'), 2)
    assert.ok(HERO_ABILITY_CONSTANTS.ENGINEER_SUMMON_FIRE_RATE_BONUS > 1)

    // 4. Chrono Operative (hero_04): 3-second clones copying player attacks at 50% damage
    assert.equal(HERO_ABILITY_CONSTANTS.CHRONO_CLONE_DURATION, 3.0)
    assert.equal(HERO_ABILITY_CONSTANTS.CHRONO_CLONE_DAMAGE_RATIO, 0.5)

    // 5. Shield Paladin (hero_05): 25% damage reduction + 10s Spacebar dash
    assert.equal(getHeroDamageReduction('hero_05'), 0.25)
    assert.equal(getHeroDamageReduction('hero_01'), 0)
    assert.equal(HERO_ABILITY_CONSTANTS.PALADIN_DASH_COOLDOWN, 10.0)

    // 6. Pyrotechnic Specialist (hero_06): Burn DoT applied on every hit
    const paladinTargetPlayer = new Player({ x: 100, y: 100, hero: heroes[5] })
    const burnDummy = new Enemy({
      x: 200,
      y: 100,
      enemyData: enemies[0],
      target: paladinTargetPlayer
    })
    burnDummy.isSpawning = false
    const perTick = computeHeroBurnPerTick(50)
    assert.equal(perTick, 15) // 30% of 50 = 15
    burnDummy.applyBurn(perTick, HERO_ABILITY_CONSTANTS.PYRO_BURN_DURATION)
    assert.equal(burnDummy.burnTimer, 3.0)
    assert.equal(burnDummy.tickBurn(0.25), 0)
    assert.equal(burnDummy.tickBurn(0.3), 15)

    // 7. Heroes keep their starting weapon even when a Shop weapon and/or Loadout weapon is equipped
    const vanguardWithShopWeapon = resolveStartingUpgradeIds({
      heroStartingUpgradeId: 'upg_12',
      equippedWeaponId: 'wpn_plasma_lance'
    })
    assert.deepEqual(vanguardWithShopWeapon, ['upg_12', 'wpn_plasma_lance'])

    const vanguardWithLoadoutAndShopWeapon = resolveStartingUpgradeIds({
      heroStartingUpgradeId: 'upg_12',
      loadoutUpgradeId: 'wpn_chrono_gatling',
      equippedWeaponId: 'wpn_plasma_lance'
    })
    assert.deepEqual(vanguardWithLoadoutAndShopWeapon, [
      'upg_12',
      'wpn_chrono_gatling',
      'wpn_plasma_lance'
    ])

    // Deduplicates if loadout/equipped already matches hero's starter or each other
    const dedupedStarter = resolveStartingUpgradeIds({
      heroStartingUpgradeId: 'upg_12',
      loadoutUpgradeId: 'upg_12',
      equippedWeaponId: 'wpn_plasma_lance'
    })
    assert.deepEqual(dedupedStarter, ['upg_12', 'wpn_plasma_lance'])
  })

  it('provides 2000-coin Mythic crate (4% mythic, 10% legendary, no common/scrap), 1% mythic in 3rd crate, new weapons/gears, and Mythic Muramasa Vanguard pairing', () => {
    const apexCrate = getSupplyCrateById('crate_apex')!
    assert.ok(apexCrate)
    assert.equal(apexCrate.rarityWeights.mythic, 0.01)
    assert.equal(pickRarityFromCrate(apexCrate, 0.995), 'mythic')

    const mythicCrate = getSupplyCrateById('crate_mythic')!
    assert.ok(mythicCrate)
    assert.equal(mythicCrate.price, 2000)
    assert.equal(mythicCrate.rarityWeights.mythic, 0.04)
    assert.equal(mythicCrate.rarityWeights.legendary, 0.1)
    assert.equal(mythicCrate.rarityWeights.common || 0, 0)
    assert.equal(mythicCrate.rarityWeights.scrap || 0, 0)
    assert.equal(mythicCrate.rarityWeights.faulty || 0, 0)

    // Sweeping deterministic roll range across [0, 1) never returns scrap, faulty, or common
    for (let i = 0; i < 200; i++) {
      const r = i / 200
      const rarity = pickRarityFromCrate(mythicCrate, r)
      assert.notEqual(rarity, 'scrap')
      assert.notEqual(rarity, 'faulty')
      assert.notEqual(rarity, 'common')
    }
    assert.equal(pickRarityFromCrate(mythicCrate, 0.965), 'mythic')
    assert.equal(pickRarityFromCrate(mythicCrate, 0.92), 'legendary')

    // Verify new weapons & accessories exist with proper rarities and Overdrive hints
    const newWeaponIds = ['wpn_cryo_railgun', 'wpn_solar_flail', 'wpn_void_reaper', 'wpn_muramasa']
    for (const id of newWeaponIds) {
      const wpn = getShopWeaponById(id)
      assert.ok(wpn, `Expected weapon ${id} to exist`)
      assert.ok(getUpgradeOverdriveHint(id).includes('LV 5 OVERDRIVE'))
    }
    const solarFlail = getShopWeaponById('wpn_solar_flail')!
    assert.equal(solarFlail.rarity, 'legendary')
    assert.equal(solarFlail.tierLabel, 'Legendary')
    assert.equal(solarFlail.accentColor, '#FFD700')
    assert.ok(solarFlail.special.toLowerCase().includes('fire area'))
    assert.ok(getUpgradeOverdriveHint('wpn_solar_flail').toLowerCase().includes('solar mace'))

    const newAccIds = [
      'acc_aegis_plating',
      'acc_chrono_accelerator',
      'acc_berserker_crest',
      'acc_calamity_heart'
    ]
    for (const id of newAccIds) {
      assert.ok(getShopAccessoryById(id), `Expected accessory ${id} to exist`)
    }

    // Verify Muramasa is Mythic tier, crate-only, high base damage, and drops from the 2000-coin crate 1% roll
    const muramasa = getShopWeaponById('wpn_muramasa')!
    assert.equal(muramasa.rarity, 'mythic')
    assert.equal(muramasa.crateOnly, true)
    assert.equal(muramasa.pairedHeroId, 'hero_01')
    assert.ok(muramasa.damage >= 120)

    const calamityHeart = getShopAccessoryById('acc_calamity_heart')!
    assert.equal(calamityHeart.rarity, 'mythic')
    assert.equal(calamityHeart.crateOnly, true)

    const mythicUser = `mythic_user_${Date.now()}`
    creditShopCoins(mythicUser, 2000)
    // First mythic item in SHOP_CATALOG is wpn_muramasa (index 0 -> second rng roll 0.01)
    const rolls = [0.995, 0.01]
    let rIdx = 0
    const openRes = openSupplyCrate(mythicUser, 'crate_mythic', () => rolls[rIdx++] ?? 0)
    assert.equal(openRes.success, true)
    assert.equal(openRes.rarity, 'mythic')
    assert.equal(openRes.item?.id, 'wpn_muramasa')
    assert.equal(openRes.state.balance, 0)

    // Direct purchase of Mythic Muramasa / Calamity Heart remains blocked outside rotation
    const nonMythicRotationNowMs = 1_700_000_000_000
    assert.equal(purchaseShopItem(mythicUser, 'wpn_muramasa', nonMythicRotationNowMs).success, false)
    assert.equal(purchaseShopItem(mythicUser, 'acc_calamity_heart', nonMythicRotationNowMs).success, false)

    // Equipping Mythic Muramasa pairs with Vanguard Blade (hero_01) for huge damage, wider cleave, faster cooldown, extra wave
    const otherHeroMuramasa = getMuramasaWeaponConfig(138, 1, 'hero_02')
    const vanguardMuramasa = getMuramasaWeaponConfig(138, 1, 'hero_01')
    assert.equal(otherHeroMuramasa.isPairedHero, false)
    assert.equal(vanguardMuramasa.isPairedHero, true)
    assert.ok(vanguardMuramasa.damage > otherHeroMuramasa.damage * 1.4)
    assert.ok(vanguardMuramasa.radius > otherHeroMuramasa.radius)
    assert.ok(vanguardMuramasa.cooldownScale < 1)
    assert.ok(vanguardMuramasa.waveCount > otherHeroMuramasa.waveCount)

    // Vanguard Blade keeping starter Arc Slash + equipped Muramasa triggers Arc Slash resonance bonus too
    const pairedStarters = resolveStartingUpgradeIds({
      heroStartingUpgradeId: 'upg_12',
      equippedWeaponId: 'wpn_muramasa'
    })
    assert.deepEqual(pairedStarters, ['upg_12', 'wpn_muramasa'])
    assert.equal(getPairedHeroArcSlashBonus('hero_01', pairedStarters), 1.25)
    assert.equal(getPairedHeroArcSlashBonus('hero_02', pairedStarters), 1)
  })

  it('tracks Hero Mastery rounds per hero and unlocks passive stat bonuses across all 6 heroes', () => {
    const masteryUser = `mastery_user_${Date.now()}`
    const otherUser = `mastery_other_${Date.now()}`

    // Every hero defines 5 ordered Mastery tiers with positive passive bonuses
    for (const hero of heroes) {
      const tiers = getHeroMasteryTiers(hero.id)
      assert.equal(tiers.length, 5)
      assert.ok(HERO_MASTERY_TIERS[hero.id])
      for (let i = 1; i < tiers.length; i++) {
        assert.ok(tiers[i].requiredRounds > tiers[i - 1].requiredRounds)
      }
    }

    // Initially 0 rounds -> Rank 0, zero bonuses
    const initProgress = getHeroMasteryProgress(masteryUser, 'hero_01')
    assert.equal(initProgress.roundsCompleted, 0)
    assert.equal(initProgress.currentTier, 0)
    assert.equal(initProgress.nextTier?.tier, 1)
    assert.equal(initProgress.roundsToNextTier, 3)
    assert.equal(initProgress.totalBonuses.damageMultiplier, 0)

    // Clearing 2 rounds keeps Tier 1 locked
    const twoRounds = recordHeroRoundsCompleted(masteryUser, 'hero_01', 2)
    assert.equal(twoRounds.unlockedNewTier, null)
    assert.equal(twoRounds.progress.currentTier, 0)
    assert.equal(twoRounds.progress.roundsToNextTier, 1)

    // Clearing 1 more round reaches 3 -> unlocks Tier 1 (+12% damage for Vanguard Blade)
    const threeRounds = recordHeroRoundsCompleted(masteryUser, 'hero_01', 1)
    assert.ok(threeRounds.unlockedNewTier)
    assert.equal(threeRounds.unlockedNewTier?.tier, 1)
    assert.equal(threeRounds.progress.currentTier, 1)
    assert.equal(threeRounds.progress.totalBonuses.damageMultiplier, 0.12)
    assert.ok(formatMasteryBonusSummary(threeRounds.progress.totalBonuses).includes('+12% Dmg'))

    // Other heroes for same user and same hero for different user remain unaffected
    assert.equal(getHeroMasteryProgress(masteryUser, 'hero_05').roundsCompleted, 0)
    assert.equal(getHeroMasteryProgress(otherUser, 'hero_01').roundsCompleted, 0)

    // Shield Paladin (hero_05) full mastery at 40 rounds grants HP, DR, regen & damage passives
    const paladinFull = evaluateHeroMasteryProgress('hero_05', 40)
    assert.equal(paladinFull.currentTier, 5)
    assert.equal(paladinFull.nextTier, null)
    assert.equal(paladinFull.progressPercent, 100)
    assert.equal(paladinFull.totalBonuses.bonusHp, 100) // 35 + 65
    assert.equal(paladinFull.totalBonuses.damageReduction, 0.18) // 0.08 + 0.10
    assert.equal(paladinFull.totalBonuses.hpRegenPerSec, 3.0) // 1.5 + 1.5
    assert.equal(paladinFull.totalBonuses.damageMultiplier, 0.18)

    // Zero rounds yields zero bonuses
    const emptyBonuses = computeHeroMasteryBonuses('hero_05', 0)
    assert.equal(emptyBonuses.bonusHp, 0)
    assert.equal(emptyBonuses.damageReduction, 0)
  })

  it('opens 10 Supply Crates at once with stacked drops, Mythic detection, and atomic balance checks', () => {
    const batchUser = `batch_crate_user_${Date.now()}`

    // Insufficient coins fails atomically without altering balance or inventory
    creditShopCoins(batchUser, 2500) // enough for 1 Mythic crate (2000), not 10 (20000)
    const failBatch = openMultipleSupplyCrates(batchUser, 'crate_mythic', 10)
    assert.equal(failBatch.success, false)
    assert.equal(failBatch.drops.length, 0)
    assert.equal(getShopAccountState(batchUser).balance, 2500)

    // Top up for 10x Mythic crate open (20,000 coins total -> 2,500 remaining)
    creditShopCoins(batchUser, 20000)

    // Deterministic roll sequence: 1st crate drops Mythic Muramasa (0.995, 0.01), next 9 drop Legendary/Epic/Rare
    const seq = [0.995, 0.01, 0.92, 0.2]
    let seqIdx = 0
    const batchRes = openMultipleSupplyCrates(
      batchUser,
      'crate_mythic',
      10,
      () => seq[seqIdx++ % seq.length]
    )

    assert.equal(batchRes.success, true)
    assert.equal(batchRes.countRequested, 10)
    assert.equal(batchRes.totalCost, 20000)
    assert.equal(batchRes.drops.length, 10)
    assert.equal(batchRes.hasMythic, true)
    assert.equal(batchRes.hasLegendary, true)
    assert.equal(batchRes.highestRarity, 'mythic')
    assert.equal(batchRes.drops[0].rarity, 'mythic')
    assert.equal(batchRes.drops[0].item.id, 'wpn_muramasa')
    assert.equal(batchRes.state.balance, 2500)
    assert.ok(getTotalStackCount(batchRes.state, 'wpn_muramasa') >= 1)
  })

  it('promotes Abyssal Prism Beam to Legendary and unlocks Area 2 upgrades upon reaching Area 2', async () => {
    const prismBeam = getShopWeaponById('wpn_abyss_beam')!
    assert.ok(prismBeam)
    assert.equal(prismBeam.rarity, 'legendary')
    assert.equal(prismBeam.tierLabel, 'Legendary')
    assert.equal(prismBeam.accentColor, '#FFD700')

    // Area 2 exclusive upgrades stay locked in Area 1 before Wave 15 is cleared
    assert.equal(
      isAreaTwoUpgradesUnlocked({ areaId: 'carbon_sector', wave15Cleared: false }),
      false
    )
    const beforeUnlock = getAvailableRunUpgrades({
      areaId: 'carbon_sector',
      wave15Cleared: false
    })
    assert.equal(beforeUnlock.length, upgrades.length + UNIVERSAL_CRIT_UPGRADES.length)
    assert.equal(beforeUnlock.some((u) => u.id === 'upg_a2_01'), false)

    // Unlocking Area 2 (entering Astral Citadel OR beating Wave 15) unlocks all Area 2 upgrades
    assert.equal(
      isAreaTwoUpgradesUnlocked({ areaId: 'astral_citadel', wave15Cleared: false }),
      true
    )
    assert.equal(
      isAreaTwoUpgradesUnlocked({ areaId: 'carbon_sector', wave15Cleared: true }),
      true
    )
    const afterUnlock = getAvailableRunUpgrades({
      areaId: 'astral_citadel',
      wave15Cleared: true
    })
    assert.equal(
      afterUnlock.length,
      upgrades.length + AREA_TWO_UPGRADES.length + UNIVERSAL_CRIT_UPGRADES.length
    )
    for (const a2Upg of AREA_TWO_UPGRADES) {
      assert.ok(afterUnlock.some((u) => u.id === a2Upg.id))
      assert.ok(getUpgradeLevelPerkHint(a2Upg.id, 1).length > 0)
      assert.ok(getUpgradeOverdriveHint(a2Upg.id).includes('LV 5 OVERDRIVE'))
    }

    // Codex getUpgrades includes Area 2 & universal crit upgrades cleanly
    const codexUpgrades = await getUpgrades()
    assert.equal(
      codexUpgrades.length,
      upgrades.length + AREA_TWO_UPGRADES.length + UNIVERSAL_CRIT_UPGRADES.length
    )

    // Vanguard Laser Strider (upg_a2_02): walks near player and fires piercing laser bolts (+ Engineer bonus)
    assert.equal(getSummonCountForUpgrade('upg_a2_02', 1, 'hero_01'), 1)
    assert.equal(getSummonCountForUpgrade('upg_a2_02', 3, 'hero_01'), 2)
    assert.equal(getSummonCountForUpgrade('upg_a2_02', 1, 'hero_03'), 2)
    assert.equal(getSummonCountForUpgrade('upg_a2_02', 3, 'hero_03'), 3)

    const hero = heroes[0]
    const player = new Player({ x: 500, y: 500, hero })
    const dummyEnemy = new Enemy({
      x: 680,
      y: 500,
      enemyData: enemies[0],
      target: player
    })
    dummyEnemy.isSpawning = false

    const strider = new Summon({
      kind: 'laser_strider',
      upgradeId: 'upg_a2_02',
      x: 500,
      y: 500,
      damage: 34,
      cooldown: 0.25,
      level: 5
    })
    strider.cooldownTimer = 0.01
    const striderShot = strider.update(0.05, player, [dummyEnemy], [])
    assert.ok(striderShot?.beams && striderShot.beams.length === 3)
    assert.equal(striderShot?.beams?.[0]?.angularSpeed, 0)
    assert.ok((striderShot?.beams?.[0]?.length ?? 0) >= 350)

    const striderLv1 = new Summon({
      kind: 'laser_strider',
      upgradeId: 'upg_a2_02',
      x: 500,
      y: 500,
      damage: 34,
      cooldown: 0.25,
      level: 1
    })
    striderLv1.cooldownTimer = 0.01
    const striderLv1Shot = striderLv1.update(0.05, player, [dummyEnemy], [])
    assert.equal(striderLv1Shot?.beams?.length, 1)
    assert.equal(striderLv1Shot?.beams?.[0]?.angularSpeed, 0)

    // Astral Javelin (upg_a2_03): Spear pierces enemies cleanly and explodes only at the end
    const spear = new Projectile({
      x: 100,
      y: 100,
      direction: { x: 1, y: 0 },
      speed: 620,
      damage: 58,
      type: 'Spear',
      maxPierces: 3,
      explosionRadius: 110,
      explodeAtEnd: true
    })
    assert.equal(spear.hitEntity(), false) // pierce 1
    assert.equal(spear.isAlive, true)
    assert.equal(spear.isExploding, false)
    assert.equal(spear.hitEntity(), false) // pierce 2
    assert.equal(spear.hitEntity(), false) // pierce 3
    assert.equal(spear.hitEntity(), true) // final hit -> end burst explosion!
    assert.equal(spear.isAlive, false)
    assert.equal(spear.isExploding, true)
    assert.equal(spear.explosionRadius, 110)
  })

  it('adds Mythic Grim Reaper Tech Engineer weapon (scythes + life steal) and Frost Freeze attacks', () => {
    // 1. Mythic Grim Reaper weapon catalog & Tech Engineer (hero_03) pairing
    const reaperWpn = getShopWeaponById('wpn_grim_reaper')!
    assert.ok(reaperWpn)
    assert.equal(reaperWpn.rarity, 'mythic')
    assert.equal(reaperWpn.crateOnly, true)
    assert.equal(reaperWpn.pairedHeroId, 'hero_03')
    assert.ok(getUpgradeLevelPerkHint('wpn_grim_reaper', 2).length > 0)
    assert.ok(getUpgradeOverdriveHint('wpn_grim_reaper').includes('LV 5 OVERDRIVE'))

    const nonEngReaper = getGrimReaperWeaponConfig(88, 1, 'hero_01')
    const engReaper = getGrimReaperWeaponConfig(88, 1, 'hero_03')
    const engReaperLv5 = getGrimReaperWeaponConfig(88, 5, 'hero_03')
    assert.equal(nonEngReaper.isPairedHero, false)
    assert.equal(engReaper.isPairedHero, true)
    assert.equal(nonEngReaper.reaperCount, 1)
    assert.equal(engReaper.reaperCount, 1) // Always strictly 1 towering Reaper; upgrades buff attacks!
    assert.equal(engReaperLv5.reaperCount, 1)
    assert.equal(getSummonCountForUpgrade('wpn_grim_reaper', 5, 'hero_03'), 1)
    assert.ok(engReaper.damage > nonEngReaper.damage * 1.4)
    assert.ok(engReaperLv5.damage > engReaper.damage * 1.4)
    assert.ok(engReaper.cooldownScale < 1)
    assert.ok(engReaperLv5.cooldownScale < engReaper.cooldownScale)
    assert.ok(engReaper.scytheCount > nonEngReaper.scytheCount)
    assert.ok(engReaperLv5.scytheCount >= 5)
    assert.ok(engReaper.siphonTargets > nonEngReaper.siphonTargets)
    assert.ok(engReaperLv5.siphonTargets >= 6)
    assert.ok(engReaper.healPerTarget > nonEngReaper.healPerTarget)

    // Grim Reaper summon throws Scythe projectiles and siphons nearby enemies
    const engHero = heroes.find((h) => h.id === 'hero_03') || heroes[0]
    const engPlayer = new Player({ x: 400, y: 400, hero: engHero })
    const victim = new Enemy({
      x: 520,
      y: 400,
      enemyData: enemies[0],
      target: engPlayer
    })
    victim.isSpawning = false
    const grimSummon = new Summon({
      kind: 'grim_reaper',
      upgradeId: 'wpn_grim_reaper',
      x: 440,
      y: 400,
      damage: engReaper.damage,
      cooldown: 0.4,
      level: 3,
      isPairedHero: true,
      scytheCount: 2,
      siphonTargetCount: 2,
      healPerTarget: engReaper.healPerTarget
    })
    grimSummon.cooldownTimer = 0.01
    const grimAction = grimSummon.update(0.05, engPlayer, [victim], [])
    assert.equal(grimAction?.projectile?.type, 'Scythe')
    assert.equal(grimAction?.extraProjectiles?.length, 1)
    assert.ok(grimAction?.siphon && grimAction.siphon.targets.length === 1)
    assert.ok((grimAction?.siphon?.healAmount ?? 0) >= 4)

    // 2. Frost Freeze status + Glacier Permafrost Spire (wpn_permafrost_spire) + Permafrost Cryo-Nova (upg_a2_06)
    const frostWeapon = getShopWeaponById('wpn_permafrost_spire')!
    assert.ok(frostWeapon)
    assert.equal(frostWeapon.rarity, 'epic')
    assert.ok(getUpgradeLevelPerkHint('wpn_permafrost_spire', 1).toLowerCase().includes('freeze'))
    assert.ok(getUpgradeOverdriveHint('wpn_permafrost_spire').includes('LV 5 OVERDRIVE'))
    assert.ok(AREA_TWO_UPGRADES.some((u) => u.id === 'upg_a2_06'))
    assert.ok(getUpgradeLevelPerkHint('upg_a2_06', 1).toLowerCase().includes('freez'))

    const frozenTarget = new Enemy({
      x: 600,
      y: 400,
      enemyData: enemies[0],
      target: engPlayer
    })
    frozenTarget.isSpawning = false
    const startX = frozenTarget.x
    const startY = frozenTarget.y
    frozenTarget.applyFreeze(1.5)
    assert.ok(frozenTarget.freezeTimer >= 1.45)
    frozenTarget.update(0.25, engPlayer)
    // Movement is halted while frozen!
    assert.equal(frozenTarget.x, startX)
    assert.equal(frozenTarget.y, startY)
    // Advance past freeze timer -> enemy unfreezes cleanly and resumes chasing
    frozenTarget.update(1.4, engPlayer)
    assert.equal(frozenTarget.freezeTimer, 0)
    frozenTarget.update(0.1, engPlayer)
    assert.ok(frozenTarget.x !== startX || frozenTarget.y !== startY)
  })

  it('indexes all shop weapons & accessories in Codex and applies Easy/Normal/Hard/Expert difficulty coin & enemy modifiers', () => {
    // 1. Codex Gear Index completeness (every weapon + every accessory appears cleanly in SHOP_CATALOG)
    assert.equal(SHOP_CATALOG.length, SHOP_WEAPONS.length + SHOP_ACCESSORIES.length)
    for (const wpn of SHOP_WEAPONS) {
      assert.ok(SHOP_CATALOG.some((item) => item.id === wpn.id && item.kind === 'weapon'))
    }
    for (const acc of SHOP_ACCESSORIES) {
      assert.ok(SHOP_CATALOG.some((item) => item.id === acc.id && item.kind === 'accessory'))
    }

    // 2. Difficulties exist in exact Easy -> Normal -> Hard -> Expert order
    assert.deepEqual(
      GAME_DIFFICULTIES.map((d) => d.id),
      ['easy', 'normal', 'hard', 'expert']
    )

    const easy = getDifficultyById('easy')
    const normal = getDifficultyById('normal')
    const hard = getDifficultyById('hard')
    const expert = getDifficultyById('expert')

    assert.equal(easy.coinBonusPercent, -25)
    assert.equal(normal.coinBonusPercent, 0)
    assert.equal(hard.coinBonusPercent, 25)
    assert.equal(expert.coinBonusPercent, 150)

    assert.equal(formatDifficultyCoinLabel(easy), '-25% Coins')
    assert.equal(formatDifficultyCoinLabel(normal), 'Standard Coins')
    assert.equal(formatDifficultyCoinLabel(hard), '+25% Coins')
    assert.equal(formatDifficultyCoinLabel(expert), '+150% Coins')

    // Enemy threat scales strictly upwards across Easy < Normal < Hard < Expert
    assert.ok(
      easy.enemyHpMultiplier < normal.enemyHpMultiplier &&
        normal.enemyHpMultiplier < hard.enemyHpMultiplier &&
        hard.enemyHpMultiplier < expert.enemyHpMultiplier
    )
    assert.ok(
      easy.enemyDamageMultiplier < normal.enemyDamageMultiplier &&
        normal.enemyDamageMultiplier < hard.enemyDamageMultiplier &&
        hard.enemyDamageMultiplier < expert.enemyDamageMultiplier
    )
    assert.ok(
      easy.enemySpeedMultiplier < normal.enemySpeedMultiplier &&
        normal.enemySpeedMultiplier < hard.enemySpeedMultiplier &&
        hard.enemySpeedMultiplier < expert.enemySpeedMultiplier
    )
    assert.ok(
      easy.spawnRateMultiplier < normal.spawnRateMultiplier &&
        normal.spawnRateMultiplier < hard.spawnRateMultiplier &&
        hard.spawnRateMultiplier < expert.spawnRateMultiplier
    )

    // 3. Exact coin payouts over 100 1-coin pickups using fractional carry (0 bonusCoinChance)
    const simulate100Coins = (diffId: 'easy' | 'normal' | 'hard' | 'expert') => {
      let total = 0
      let carry = 0
      for (let i = 0; i < 100; i++) {
        const res = computeDifficultyCoinPayout({
          baseCoinValue: 1,
          difficultyId: diffId,
          bonusCoinChance: 0,
          carry
        })
        total += res.coinsAwarded
        carry = res.nextCarry
      }
      return total
    }

    assert.equal(simulate100Coins('easy'), 75) // -25%
    assert.equal(simulate100Coins('normal'), 100) // Standard
    assert.equal(simulate100Coins('hard'), 125) // +25%
    assert.equal(simulate100Coins('expert'), 250) // +150%
  })

  it('supports single towering Grim Reaper attack scaling, Solar Flail apex fire AoE metadata, and full Crit system + red swaying "!" text', () => {
    // 1. Towering Grim Reaper throws enlarged scythes & upgrades scale attack volume instead of count
    const reaperLv1Cfg = getGrimReaperWeaponConfig(88, 1, 'hero_01')
    const reaperLv5Cfg = getGrimReaperWeaponConfig(88, 5, 'hero_01')
    assert.equal(reaperLv1Cfg.reaperCount, 1)
    assert.equal(reaperLv5Cfg.reaperCount, 1)
    assert.ok(reaperLv5Cfg.scytheCount > reaperLv1Cfg.scytheCount)
    assert.ok(reaperLv5Cfg.siphonTargets > reaperLv1Cfg.siphonTargets)
    assert.ok(reaperLv5Cfg.cooldownScale < reaperLv1Cfg.cooldownScale)
    assert.ok(reaperLv5Cfg.damage > reaperLv1Cfg.damage * 1.5)

    const engHero = heroes.find((h) => h.id === 'hero_03') || heroes[0]
    const engPlayer = new Player({ x: 300, y: 300, hero: engHero })
    const reaperTarget = new Enemy({
      x: 420,
      y: 300,
      enemyData: enemies[0],
      target: engPlayer
    })
    reaperTarget.isSpawning = false
    const bigReaper = new Summon({
      kind: 'grim_reaper',
      upgradeId: 'wpn_grim_reaper',
      x: 340,
      y: 300,
      damage: reaperLv5Cfg.damage,
      cooldown: 0.4,
      level: 5,
      isPairedHero: true,
      scytheCount: reaperLv5Cfg.scytheCount,
      siphonTargetCount: reaperLv5Cfg.siphonTargets,
      healPerTarget: reaperLv5Cfg.healPerTarget
    })
    bigReaper.cooldownTimer = 0.01
    const bigShot = bigReaper.update(0.05, engPlayer, [reaperTarget], [])
    assert.ok((bigShot?.projectile?.width ?? 0) >= 42)

    // 2. Solar Flare Flail notes full-extension apex fire AoE behavior
    const solarFlail = getShopWeaponById('wpn_solar_flail')!
    assert.ok(solarFlail.function_desc.toLowerCase().includes('full extension'))

    // 3. Crit Weapons, Crit Accessories & Passive Crit Upgrades
    const crimsonEdge = getShopWeaponById('wpn_crimson_railblade')!
    const phantomSniper = getShopWeaponById('wpn_phantom_sniper')!
    assert.equal(crimsonEdge.rarity, 'rare')
    assert.equal(phantomSniper.rarity, 'epic')
    assert.ok(getWeaponCritProfile('wpn_crimson_railblade').critChanceBonus >= 0.2)
    assert.ok(getWeaponCritProfile('wpn_phantom_sniper').critChanceBonus >= 0.3)
    assert.ok(getWeaponCritProfile('wpn_muramasa').critChanceBonus >= 0.15)
    assert.ok(getWeaponCritProfile('wpn_grim_reaper').critChanceBonus >= 0.15)

    const visor = getShopAccessoryById('acc_targeting_visor')!
    const core = getShopAccessoryById('acc_assassin_core')!
    const heart = getShopAccessoryById('acc_calamity_heart')!
    assert.ok((visor.bonuses.critChance ?? 0) > 0)
    assert.ok((core.bonuses.critChance ?? 0) > 0 && (core.bonuses.critDamageMultiplier ?? 0) > 0)
    assert.ok((heart.bonuses.critChance ?? 0) > 0)

    const accCritBonuses = computeEquippedAccessoryBonuses(
      ['acc_targeting_visor', 'acc_assassin_core', 'acc_calamity_heart'],
      { acc_assassin_core: 2 }
    )
    assert.ok(accCritBonuses.critChance > 0.5)
    assert.ok(accCritBonuses.critDamageBonus >= 0.5)

    // Passive crit upgrades are available in all areas + Codex + Lv 1-5 hints
    const carbonUpgs = getAvailableRunUpgrades({ areaId: 'carbon_sector', wave15Cleared: false })
    for (const critUpg of UNIVERSAL_CRIT_UPGRADES) {
      assert.ok(carbonUpgs.some((u) => u.id === critUpg.id))
      assert.ok(getUpgradeLevelPerkHint(critUpg.id, 1).length > 0)
      assert.ok(getUpgradeOverdriveHint(critUpg.id).includes('LV 5 OVERDRIVE'))
    }
    const passiveBonuses = getPassiveCritUpgradeBonuses({ upg_crit_01: 5, upg_crit_02: 5 })
    assert.ok(passiveBonuses.critChanceBonus >= 0.45)
    assert.ok(passiveBonuses.critDamageBonus >= 0.8)
    assert.ok(passiveBonuses.weaponDamageMultiplierBonus >= 0.3)

    // 4. Critical Hit rolling, Projectile crit propagation, and burn non-crit enforcement
    const critHit = rollCriticalHit({
      baseDamage: 100,
      accessoryCritChance: accCritBonuses.critChance,
      upgradeCritChance: passiveBonuses.critChanceBonus,
      weaponCritChance: getWeaponCritProfile('wpn_phantom_sniper').critChanceBonus,
      accessoryCritDamageBonus: accCritBonuses.critDamageBonus,
      upgradeCritDamageBonus: passiveBonuses.critDamageBonus,
      weaponCritDamageBonus: getWeaponCritProfile('wpn_phantom_sniper').critDamageBonus,
      rng: () => 0.1
    })
    assert.equal(critHit.isCrit, true)
    assert.equal(critHit.critChance, CRIT_CONFIG.MAX_CRIT_CHANCE)
    assert.ok(critHit.damage >= 300)

    const nonCritBurn = rollCriticalHit({
      baseDamage: 100,
      accessoryCritChance: 0.7,
      canCrit: false,
      rng: () => 0.0
    })
    assert.equal(nonCritBurn.isCrit, false)
    assert.equal(nonCritBurn.damage, 100)

    const critProj = new Projectile({
      x: 0,
      y: 0,
      damage: 70,
      critChanceBonus: 0.34,
      critDamageBonus: 0.5
    })
    assert.equal(critProj.critChanceBonus, 0.34)
    assert.equal(critProj.critDamageBonus, 0.5)

    // 5. Crit floating text: ends with "!", red (#FF2E43), lingers longer, rotates side to side symmetrically
    assert.equal(formatDamageFloatingText(critHit.damage, true), `${critHit.damage}!`)
    assert.equal(formatDamageFloatingText(100, false), '100')
    assert.equal(CRIT_CONFIG.CRIT_TEXT_COLOR, '#FF2E43')
    assert.ok(CRIT_CONFIG.CRIT_TEXT_DURATION > CRIT_CONFIG.NORMAL_TEXT_DURATION * 2)

    const swayLeft = computeCritTextSwayAngle(Math.PI / (2 * CRIT_CONFIG.CRIT_TEXT_SWAY_SPEED), 0)
    const swayRight = computeCritTextSwayAngle((3 * Math.PI) / (2 * CRIT_CONFIG.CRIT_TEXT_SWAY_SPEED), 0)
    assert.ok(swayLeft > 0.2 && swayRight < -0.2)
    assert.ok(Math.abs(swayLeft + swayRight) < 1e-6)
  })

  it('weakens Outpost Ranger base homing and supports coin-purchasable 5-tier signature upgrades for all 6 heroes', () => {
    // 1. Outpost Ranger starts with weak subtle homing that scales dramatically with coin upgrades
    assert.ok(HERO_ABILITY_CONSTANTS.RANGER_HOMING_STRENGTH <= 3.0)
    const lv0Homing = getRangerHomingConfig(0)
    const lv5Homing = getRangerHomingConfig(5)
    assert.equal(lv0Homing.homingStrength, HERO_ABILITY_CONSTANTS.RANGER_HOMING_STRENGTH)
    assert.ok(lv5Homing.homingStrength >= lv0Homing.homingStrength * 4)
    assert.ok(lv5Homing.lockRange > lv0Homing.lockRange)

    const baseBullet = new Projectile({
      x: 100,
      y: 100,
      direction: { x: 1, y: 0 },
      speed: 400,
      damage: 25,
      type: 'Basic',
      homingTarget: { x: 100, y: 260 },
      homingStrength: lv0Homing.homingStrength
    })
    const upgradedBullet = new Projectile({
      x: 100,
      y: 100,
      direction: { x: 1, y: 0 },
      speed: 400,
      damage: 25,
      type: 'Basic',
      homingTarget: { x: 100, y: 260 },
      homingStrength: lv5Homing.homingStrength
    })
    baseBullet.update(0.1)
    upgradedBullet.update(0.1)
    assert.ok(
      upgradedBullet.direction.y > baseBullet.direction.y * 2.5,
      'Upgraded Lv.5 Outpost Ranger homing must curve sharply stronger than Lv.0 base homing'
    )

    // 2. Coin purchase transactions: insufficient balance rejection, incremental deduction, Lv.5 cap
    const upgradeTestUser = `hero_upg_tester_${Date.now()}`
    assert.equal(getHeroUpgradeLevel(upgradeTestUser, 'hero_02'), 0)

    const failInsufficient = purchaseHeroSignatureUpgrade(upgradeTestUser, 'hero_02')
    assert.equal(failInsufficient.success, false)
    assert.equal(failInsufficient.newLevel, 0)

    const totalAllFiveCost = HERO_UPGRADE_COSTS.reduce((sum, c) => sum + c, 0)
    creditShopCoins(upgradeTestUser, totalAllFiveCost + 500)

    for (let expectedLv = 1; expectedLv <= MAX_HERO_UPGRADE_LEVEL; expectedLv++) {
      const expectedCost = getHeroUpgradeCost(expectedLv - 1)
      const res = purchaseHeroSignatureUpgrade(upgradeTestUser, 'hero_02')
      assert.equal(res.success, true)
      assert.equal(res.previousLevel, expectedLv - 1)
      assert.equal(res.newLevel, expectedLv)
      assert.equal(res.costPaid, expectedCost)
    }

    assert.equal(getHeroUpgradeLevel(upgradeTestUser, 'hero_02'), 5)
    assert.equal(getShopAccountState(upgradeTestUser).balance, 500)
    assert.equal(getShopAccountState(upgradeTestUser).totalSpent, totalAllFiveCost)

    const capReject = purchaseHeroSignatureUpgrade(upgradeTestUser, 'hero_02')
    assert.equal(capReject.success, false)
    assert.equal(capReject.newLevel, 5)
    assert.equal(getShopAccountState(upgradeTestUser).balance, 500)

    const allLevels = getAllHeroUpgradeLevels(upgradeTestUser)
    assert.equal(allLevels.hero_02, 5)
    assert.equal(allLevels.hero_01, 0)

    // 3. Verify signature upgrade scaling across all other 5 heroes
    const vanLv0 = getArcSlashConfig(50, 1, 'hero_01', 0)
    const vanLv5 = getArcSlashConfig(50, 1, 'hero_01', 5)
    assert.ok(vanLv5.radius > vanLv0.radius)
    assert.ok(vanLv5.damage > vanLv0.damage)
    assert.ok(vanLv5.cooldownScale < vanLv0.cooldownScale)

    const engLv0 = getEngineerSummonBonuses(0)
    const engLv5 = getEngineerSummonBonuses(5)
    assert.ok(engLv5.fireRateMultiplier > engLv0.fireRateMultiplier)
    assert.ok(engLv5.damageMultiplier > engLv0.damageMultiplier)
    assert.ok(getSummonCountForUpgrade('upg_01', 1, 'hero_03', 5) > getSummonCountForUpgrade('upg_01', 1, 'hero_03', 0))
    assert.ok(getSummonCountForUpgrade('upg_20', 1, 'hero_03', 5) > getSummonCountForUpgrade('upg_20', 1, 'hero_03', 0))

    const chronoLv0 = getChronoCloneConfig(0)
    const chronoLv5 = getChronoCloneConfig(5)
    assert.ok(chronoLv5.duration > chronoLv0.duration)
    assert.ok(chronoLv5.damageRatio > chronoLv0.damageRatio)
    assert.ok(chronoLv5.spawnInterval < chronoLv0.spawnInterval)

    const palLv0 = getPaladinConfig(0)
    const palLv5 = getPaladinConfig(5)
    assert.ok(getHeroDamageReduction('hero_05', 5) > getHeroDamageReduction('hero_05', 0))
    assert.ok(palLv5.dashCooldown < palLv0.dashCooldown)
    assert.ok(palLv5.bashDamageRatio > palLv0.bashDamageRatio)

    const pyroLv0 = getPyroBurnConfig(0)
    const pyroLv5 = getPyroBurnConfig(5)
    assert.ok(pyroLv5.duration > pyroLv0.duration)
    assert.ok(computeHeroBurnPerTick(100, 5) > computeHeroBurnPerTick(100, 0))
  })

  it('buffs Area 1 bosses with massive HP multipliers, armored damage reduction, Phase 2 Enrage, and freeze resistance', () => {
    const w5Buff = getAreaOneBossBuff(5, false)
    const w10Buff = getAreaOneBossBuff(10, false)
    const w15Buff = getAreaOneBossBuff(15, true)

    assert.ok(w5Buff.hpMultiplier >= 4.0)
    assert.ok(w10Buff.hpMultiplier > w5Buff.hpMultiplier)
    assert.ok(w5Buff.damageReduction > 0.15)
    assert.ok(w10Buff.damageReduction > w5Buff.damageReduction)
    assert.ok(w15Buff.damageReduction >= 0.35)
    assert.equal(w5Buff.enableEnrage, true)
    assert.equal(w15Buff.enableEnrage, true)

    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 500, y: 500, hero })
    const bossTemplate = enemies.find((e) => e.id === 'ene_04')!
    const buffedW10Boss = new Enemy({
      x: 780,
      y: 500,
      enemyData: bossTemplate,
      target: player,
      isBoss: true
    })
    buffedW10Boss.isSpawning = false
    buffedW10Boss.bossTier = 2
    buffedW10Boss.maxHealth = 10000
    buffedW10Boss.health = 10000
    buffedW10Boss.damageReduction = w10Buff.damageReduction
    buffedW10Boss.enableEnrage = true
    const preEnrageSpeed = buffedW10Boss.baseSpeed
    const preEnrageShootCd = buffedW10Boss.shootCooldownMax

    // 1. Armored plating reduces raw incoming damage (30% DR -> 1000 raw deals 700)
    buffedW10Boss.takeDamage(1000)
    assert.equal(buffedW10Boss.health, 9300)
    assert.equal(buffedW10Boss.isEnraged, false)

    // 2. Dropping <= 50% HP triggers Phase 2 Enrage (faster movement & faster attack cooldowns)
    buffedW10Boss.takeDamage(7000) // 7000 * 0.7 = 4900 -> 4400 HP (<= 5000)
    assert.equal(buffedW10Boss.isEnraged, true)
    assert.ok(buffedW10Boss.speed > preEnrageSpeed)
    assert.ok(buffedW10Boss.shootCooldownMax < preEnrageShootCd)

    // 3. Tier 2 / Enraged bosses fire 12-bullet radial bursts and 5-bolt aimed laser spreads
    buffedW10Boss.shootCooldown = 0
    buffedW10Boss.update(0.05, player)
    assert.equal(buffedW10Boss.projectiles.length, 12)
    buffedW10Boss.projectiles = []
    buffedW10Boss.shootCooldown = 0
    buffedW10Boss.update(0.05, player)
    assert.equal(buffedW10Boss.projectiles.length, 5)

    // 4. Armored Area 1 bosses resist long frost stunlocks
    buffedW10Boss.applyFreeze(2.2)
    assert.ok(buffedW10Boss.freezeTimer <= 0.6)
    assert.ok(buffedW10Boss.freezeImmuneTimer >= 1.2)
  })

  it('gives Wave 15 Final Boss massively boosted HP and 2 new combat phases with new attacks', () => {
    const a1Combat = getWave15BossCombatProfile('carbon_sector')
    const a2Combat = getWave15BossCombatProfile('astral_citadel')
    assert.ok(a1Combat.hpMultiplier >= 3.0)
    assert.ok(a2Combat.hpMultiplier >= 2.5)
    assert.ok(getWave15FinalBossHp('carbon_sector') * a1Combat.hpMultiplier >= 450000)
    assert.equal(a1Combat.totalPhases, 3)

    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 960, y: 820, hero })
    const w15Boss = new Enemy({
      x: 960,
      y: 360,
      enemyData: getAreaBossTemplateForWave('carbon_sector', 15),
      target: player,
      isBoss: true,
      isStationaryBoss: true,
      isFinalBoss: true,
      anchorPos: { x: 960, y: 360 },
      arenaBounds: { left: 320, top: 140, width: 1280, height: 720 }
    })
    w15Boss.isSpawning = false
    w15Boss.maxHealth = 480000
    w15Boss.health = 480000
    w15Boss.damageReduction = a1Combat.damageReduction
    w15Boss.enableEnrage = true
    assert.equal(w15Boss.bossPhase, 1)

    // Phase 2 triggers cleanly at <= 66% HP (even against massive spike damage, clamps to phase threshold)
    w15Boss.takeDamage(500000)
    assert.equal(w15Boss.bossPhase, 2)
    assert.equal(w15Boss.health, Math.floor(480000 * 0.66))
    assert.equal(w15Boss.pendingPhaseAnnouncement, 2)
    assert.ok(w15Boss.phaseTransitionTimer > 0)
    assert.equal(w15Boss.telegraphs[0]?.kind, 'rotating_cross_lasers')

    // Rotating cross lasers advance rotation smoothly, have radial dodge gaps >= 150px, and avoid hits inside gaps
    const crossAtk = w15Boss.telegraphs[0]!
    const preSpinAngle = crossAtk.angle!
    crossAtk.hasTriggered = true
    w15Boss.phaseTransitionTimer = 0
    w15Boss.update(0.4, player)
    assert.notEqual(crossAtk.angle, preSpinAngle)

    const crossSegments = getRotatingCrossLaserSegments(crossAtk)
    assert.ok(crossSegments.length >= 3, 'Spinning cross lasers should be broken into multiple segments')
    for (let i = 0; i < crossSegments.length - 1; i++) {
      const gapWidth = crossSegments[i + 1][0] - crossSegments[i][1]
      assert.ok(gapWidth >= 150, `Expected dodge gap >= 150px, got ${gapWidth}`)
    }
    const activeAngle = crossAtk.angle!
    const segMidDist = (crossSegments[1][0] + crossSegments[1][1]) / 2
    assert.equal(
      checkBossTelegraphHit(crossAtk, {
        x: crossAtk.x + Math.cos(activeAngle) * segMidDist,
        y: crossAtk.y + Math.sin(activeAngle) * segMidDist,
        radius: 18
      }),
      true
    )
    const gapMidDist = (crossSegments[0][1] + crossSegments[1][0]) / 2
    assert.equal(
      checkBossTelegraphHit(crossAtk, {
        x: crossAtk.x + Math.cos(activeAngle) * gapMidDist,
        y: crossAtk.y + Math.sin(activeAngle) * gapMidDist,
        radius: 18
      }),
      false
    )

    // Void Meteor Salvo creates 7 blast zones in Phase 2+
    const salvoAtk = w15Boss.spawnTelegraphedAttack('void_meteor_salvo')!
    assert.equal(salvoAtk.kind, 'void_meteor_salvo')
    assert.equal(salvoAtk.subTargets?.length, 7)
    const firstZone = salvoAtk.subTargets![0]
    assert.equal(
      checkBossTelegraphHit(salvoAtk, { x: firstZone.x, y: firstZone.y, radius: 16 }),
      true
    )

    // Phase 3 triggers cleanly at <= 33% HP and spawns Singularity Grid + Enraged Overdrive
    w15Boss.telegraphs = []
    w15Boss.takeDamage(500000)
    assert.equal(w15Boss.bossPhase, 3)
    assert.equal(w15Boss.isEnraged, true)
    assert.equal(w15Boss.health, Math.floor(480000 * 0.33))
    assert.equal(w15Boss.pendingPhaseAnnouncement, 3)
    const gridAtk = w15Boss.telegraphs[0]!
    assert.equal(gridAtk.kind, 'singularity_grid')
    assert.equal(gridAtk.gridRects?.length, 4)

    // Singularity Grid hits inside beam corridor and leaves safe cells between lanes
    const vLane = gridAtk.gridRects![0]
    assert.equal(
      checkBossTelegraphHit(gridAtk, {
        x: vLane.x + vLane.width / 2,
        y: vLane.y + vLane.height / 2,
        radius: 16
      }),
      true
    )
    assert.equal(
      checkBossTelegraphHit(gridAtk, {
        x: gridAtk.bounds!.left + 40,
        y: gridAtk.bounds!.top + 40,
        radius: 16
      }),
      false
    )

    // Phase 3 escalates shooter volleys to 6 homing seekers
    w15Boss.projectiles = []
    w15Boss.attackPatternIndex = 0
    w15Boss.shootCooldown = 0
    w15Boss.phaseTransitionTimer = 0
    w15Boss.update(0.05, player)
    const p3Seekers = w15Boss.projectiles.filter((p) => (p.homingTurnRate ?? 0) > 0)
    assert.equal(p3Seekers.length, 6)
  })

  it('separates Omega Overlord and Solar Archon Seraph attack phases', () => {
    assert.equal(getWave15BossAttackKind('omega_overlord', 1, 0), 'closing_side_lasers')
    assert.equal(getWave15BossAttackKind('solar_archon_seraph', 1, 0), 'pursuit_beam')
    assert.equal(getWave15BossAttackKind('omega_overlord', 2, 0), 'rotating_cross_lasers')
    assert.equal(getWave15BossAttackKind('solar_archon_seraph', 2, 0), 'pursuit_beam')
    assert.equal(getWave15BossAttackKind('omega_overlord', 3, 0), 'singularity_grid')
    assert.equal(getWave15BossAttackKind('solar_archon_seraph', 3, 0), 'cosmic_laser_walls')

    const player = new Player({ x: 900, y: 860, hero: heroes[0] })
    const seraph = new Enemy({
      x: 900,
      y: 360,
      enemyData: getAreaBossTemplateForWave('astral_citadel', 15),
      target: player,
      isBoss: true,
      isStationaryBoss: true,
      isWave15SpecialBoss: true,
      anchorPos: { x: 900, y: 360 },
      arenaBounds: { left: 260, top: 140, width: 1280, height: 720 }
    })
    seraph.isSpawning = false
    seraph.specialCooldown = 100
    const opening = seraph.spawnTelegraphedAttack()
    assert.equal(opening?.kind, 'pursuit_beam')
    assert.equal(opening?.accentPrimary, '#FACC15')
    assert.equal(opening?.warningLabel, 'SERAPH SUNLANCE — BREAK THE LOCK!')

    seraph.telegraphs = []
    seraph.takeDamage(55_000)
    assert.equal(seraph.bossPhase, 2)
    assert.equal(seraph.telegraphs[0]?.kind, 'pursuit_beam')

    seraph.telegraphs = []
    for (let hit = 0; hit < 8 && seraph.bossPhase < 3; hit++) {
      seraph.takeDamage(50_000)
    }
    assert.equal(seraph.bossPhase, 3)
    const crownLattice = seraph.telegraphs[0]
    assert.equal(crownLattice?.kind, 'cosmic_laser_walls')
    assert.equal(crownLattice?.warningLabel, '⚠ SERAPH CROWN LATTICE — WEAVE GAPS!')
    assert.ok(crownLattice?.gridLines?.some((line) => line.color === '#FACC15'))
    assert.ok(crownLattice?.gridLines?.some((line) => line.color === '#34D399'))
  })

  it('gives Astral Scourge a damaging tail and a delayed two-phase arena rush', () => {
    const scourge = new Enemy({
      x: 500,
      y: 500,
      enemyData: AREA_TWO_BOSSES[3],
      isBoss: true,
      isFinalBoss: true
    })
    scourge.isSpawning = false

    assert.equal(scourge.isAstralScourge, true)
    assert.equal(scourge.maxHealth, ASTRAL_SCOURGE_PHASE_ONE_HP)

    const tail = scourge.dogSegments[scourge.dogSegments.length - 1]
    assert.equal(
      checkAstralScourgeTailHit(scourge, { x: tail.x, y: tail.y, radius: 12 }),
      true
    )
    assert.equal(checkAstralScourgeTailHit(scourge, { x: 0, y: 0, radius: 12 }), false)

    scourge.damageReduction = 0
    assert.equal(scourge.takeDamage(ASTRAL_SCOURGE_PHASE_ONE_HP), false)
    assert.equal(scourge.bossPhase, 1)
    assert.equal(scourge.health, 0)
    assert.equal(scourge.isAstralScourgeIntermission, true)
    assert.equal(
      scourge.astralPhaseTwoActivationTimer,
      ASTRAL_SCOURGE_PHASE_TWO_DELAY_SECONDS
    )
    assert.equal(scourge.pendingAstralScourgePhaseOneDeath, true)
    assert.equal(scourge.pendingAstralPhaseTwoCutscene, false)
    assert.equal(scourge.maxHealth, ASTRAL_SCOURGE_PHASE_ONE_HP)

    scourge.update(ASTRAL_SCOURGE_PHASE_TWO_DELAY_SECONDS - 0.1)
    assert.equal(scourge.isAstralScourgeIntermission, true)
    assert.equal(scourge.bossPhase, 1)
    assert.equal(scourge.maxHealth, ASTRAL_SCOURGE_PHASE_ONE_HP)

    scourge.update(0.11)
    assert.equal(scourge.isAstralScourgeIntermission, false)
    assert.equal(scourge.bossPhase, 2)
    assert.equal(scourge.maxHealth, ASTRAL_SCOURGE_PHASE_TWO_HP)
    assert.equal(scourge.health, ASTRAL_SCOURGE_PHASE_TWO_HP)
    assert.equal(scourge.isAlive, true)
    assert.equal(scourge.pendingAstralPhaseTwoCutscene, true)

    scourge.beginAstralScourgePhaseTwoRush({ x: 300, y: -160 }, { x: 1200, y: 1500 })
    assert.equal(scourge.dogSegments.length, ASTRAL_SCOURGE_PHASE_TWO_SEGMENT_COUNT)
    assert.ok(
      scourge.dogSegments.length * 24 >= 2 * Math.PI * ASTRAL_SCOURGE_PHASE_TWO_ORBIT_RADIUS
    )
    assert.equal(scourge.isAstralPhaseTwoRushing, true)
    scourge.update(ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS)
    assert.equal(scourge.isAstralPhaseTwoRushing, false)
    assert.ok(Math.abs(scourge.getCenter().x - 1200) < 1)
    assert.ok(Math.abs(scourge.getCenter().y - 1500) < 1)

    scourge.isSpawning = false
    scourge.phaseTransitionTimer = 0
    assert.equal(scourge.takeDamage(ASTRAL_SCOURGE_PHASE_TWO_HP), true)
    assert.equal(scourge.isAlive, false)

    const phaseTwoTheme = getAstralScourgePhaseTwoCutsceneTheme()
    assert.equal(phaseTwoTheme.presentation, 'dialogue')
    assert.equal(phaseTwoTheme.line1, "IT'S NOT OVER YET")
  })

  it('locks Astral Scourge into a formed circle and keeps weighted grids stationary', () => {
    const scourge = new Enemy({
      x: 500,
      y: 500,
      enemyData: AREA_TWO_BOSSES[3],
      isBoss: true,
      isFinalBoss: true
    })
    const player = new Player({ x: 700, y: 680, hero: heroes[0] })
    scourge.isSpawning = false
    scourge.bossPhase = 2
    scourge.specialCooldown = 100
    scourge.update(0.01, player)
    const startingHead = scourge.getCenter()
    scourge.dogSegments = Array.from({ length: ASTRAL_SCOURGE_PHASE_TWO_SEGMENT_COUNT }, (_, index) => ({
      x: startingHead.x,
      y: startingHead.y - (index + 1) * 2,
      angle: Math.PI / 2
    }))

    const grid = scourge.spawnTelegraphedAttack('astral_orbital_grid')
    assert.ok(grid)
    assert.equal(grid?.kind, 'astral_orbital_grid')
    assert.ok([6, 8, 10].includes(grid?.gridLines?.length ?? 0))
    assert.ok((grid?.gridLines?.filter((line) => line.aimMode === 'random').length ?? 0) >= 3)
    assert.ok(grid?.gridLines?.every((line) => line.aimMode === 'random'))
    assert.ok(grid?.gridLines?.every((line) => line.width <= 6))
    assert.ok([3, 4, 5].includes(grid?.gridOffsets?.length ?? 0))
    assert.equal(grid?.orbitRadius, ASTRAL_SCOURGE_PHASE_TWO_ORBIT_RADIUS)
    assert.equal(grid?.chargeDuration, 5)
    assert.equal(grid?.laserDuration, 1.8, 'The firing window expands to multiple volleys after ring lock')
    assert.equal(grid?.escapeDuration, 1.35)
    assert.ok(Math.abs((grid?.activeDuration ?? 0) - 3.15) < 0.001)
    const firstGridLine = grid!.gridLines![0]
    assert.equal(
      checkBossTelegraphHit(grid!, {
        x: (firstGridLine.x1 + firstGridLine.x2) / 2,
        y: (firstGridLine.y1 + firstGridLine.y2) / 2,
        radius: 10
      }),
      false
    )

    const fixedOrbitCenter = { x: grid!.orbitCenterX!, y: grid!.orbitCenterY! }
    const fixedGridLines = grid!.gridLines!.map((line) => ({ ...line }))
    player.x += 45
    scourge.projectiles = []
    scourge.shootCooldown = 0
    scourge.slowMultiplier = 0.55
    scourge.update(0.1, player)
    assert.equal(scourge.projectiles.length, 0)
    assert.ok(
      Math.abs(
        Math.hypot(
          scourge.getCenter().x - fixedOrbitCenter.x,
          scourge.getCenter().y - fixedOrbitCenter.y
        ) - grid!.orbitRadius!
      ) < 2
    )
    assert.equal(grid!.orbitCenterX, fixedOrbitCenter.x)
    assert.equal(grid!.orbitCenterY, fixedOrbitCenter.y)
    assert.deepEqual(grid!.gridLines, fixedGridLines, 'The grid must not track player movement')

    for (let step = 0; step < 50; step++) {
      scourge.update(0.1, player)
    }
    assert.equal(grid!.hasTriggered, true)
    assert.equal(grid!.ringLocked, true)
    assert.equal(grid!.ringLockedSegments?.length, ASTRAL_SCOURGE_PHASE_TWO_SEGMENT_COUNT)
    assert.ok(grid!.gridPulseCount === 3 || grid!.gridPulseCount === 4)
    assert.equal(grid!.gridPulseIndex, 0)
    assert.equal(grid!.gridPulseFiring, false)
    assert.equal(grid!.gridPulseWarningDuration, 0.24)
    assert.equal(grid!.gridPulseFirstWarningDuration, 0.24)
    assert.equal(grid!.gridPulseFollowupWarningDuration, 0.64)
    assert.equal(grid!.gridPulseFireDuration, 0.34)
    assert.equal(grid!.gridPulseGapDuration, 0.22)
    const expectedLaserDuration =
      grid!.gridPulseFirstWarningDuration! +
      grid!.gridPulseFireDuration! +
      (grid!.gridPulseCount! - 1) *
        (grid!.gridPulseFollowupWarningDuration! +
          grid!.gridPulseFireDuration! +
          grid!.gridPulseGapDuration!)
    assert.ok(Math.abs(grid!.laserDuration! - expectedLaserDuration) < 0.001)
    assert.ok(Math.abs(grid!.activeDuration - (expectedLaserDuration + 1.35)) < 0.001)
    const lockedSegments = grid!.ringLockedSegments!.map((segment) => ({ ...segment }))
    const lockedLines = grid!.gridLines!.map((line) => ({ ...line }))
    const lockedHead = { x: grid!.ringLockedHeadX!, y: grid!.ringLockedHeadY! }
    const lockedRadii = lockedSegments.map((segment) =>
      Math.hypot(segment.x - fixedOrbitCenter.x, segment.y - fixedOrbitCenter.y)
    )
    assert.ok(
      lockedRadii.every((radius) => Math.abs(radius - grid!.orbitRadius!) < 5),
      'All segments should be on the completed circle when the grid begins'
    )

    player.x += 110
    scourge.slowMultiplier = 0.55
    scourge.update(0.25, player)
    assert.deepEqual(scourge.dogSegments, lockedSegments, 'Tail segments should remain frozen after the circle forms')
    assert.deepEqual(scourge.getCenter(), lockedHead, 'The head should remain fixed during the grid firing window')
    assert.deepEqual(grid!.gridLines, lockedLines, 'The grid should stay at its original world position')

    scourge.update(0.25, player)
    assert.equal(grid!.gridPulseFiring, true, 'Each grid pulse warns before its damage window')
    const firstPulseLines = grid!.gridLines!.map((line) => ({ ...line }))
    const pulsePoint = firstPulseLines[0]
    assert.equal(
      checkBossTelegraphHit(grid!, {
        x: (pulsePoint.x1 + pulsePoint.x2) / 2,
        y: (pulsePoint.y1 + pulsePoint.y2) / 2,
        radius: 10
      }),
      true
    )
    while (grid!.gridPulseIndex === 0) scourge.update(0.1, player)
    assert.equal(grid!.gridPulseIndex, 1)
    assert.equal(grid!.gridPulseWarningDuration, 0.64)
    assert.equal(grid!.gridPulseFiring, false)
    assert.notDeepEqual(grid!.gridLines, firstPulseLines, 'Each volley should roll a fresh grid orientation')
    assert.deepEqual(scourge.dogSegments, lockedSegments)
    assert.deepEqual(scourge.getCenter(), lockedHead)

    grid!.activeTimer = grid!.laserDuration!
    const distanceBeforeEscape = Math.hypot(
      scourge.getCenter().x - player.getCenter().x,
      scourge.getCenter().y - player.getCenter().y
    )
    assert.equal(checkBossTelegraphHit(grid!, { x: grid!.x, y: grid!.y, radius: 10 }), false)
    scourge.update(0.1, player)
    assert.equal(grid!.isEscaping, true)
    const distanceAfterEscape = Math.hypot(
      scourge.getCenter().x - player.getCenter().x,
      scourge.getCenter().y - player.getCenter().y
    )
    assert.ok(distanceAfterEscape > distanceBeforeEscape + 40)

    assert.equal(scourge.spawnTelegraphedAttack('rotating_cross_lasers')?.kind, 'astral_orbital_grid')
    const nextAttacks = Array.from({ length: 5 }, () => scourge.spawnTelegraphedAttack())
    assert.ok(nextAttacks.every((attack) => attack?.kind !== 'rotating_cross_lasers'))
    assert.ok(nextAttacks.every((attack) => attack?.kind !== 'cosmic_orb_barrage'))
    assert.ok(
      nextAttacks.every((attack) =>
        ['astral_orbital_grid', 'astral_targeted_lasers', 'cosmic_laser_walls', 'cosmic_portal_lunge'].includes(
          attack?.kind ?? ''
        )
      )
    )

    const targeted = scourge.spawnTelegraphedAttack('astral_targeted_lasers')
    assert.equal(targeted?.gridLines?.length, 3)
    assert.ok(targeted?.gridLines?.every((line) => line.aimMode === 'targeted' && line.width <= 6))
    assert.equal(targeted?.targetLockTime, 0.28)
    assert.equal(
      checkBossTelegraphHit(targeted!, {
        x: player.getCenter().x,
        y: player.getCenter().y,
        radius: 10
      }),
      true
    )

    scourge.telegraphs = []
    scourge.projectiles = []
    scourge.shootCooldown = 0
    scourge.specialCooldown = 100
    const distanceBeforeRam = Math.hypot(
      scourge.getCenter().x - player.getCenter().x,
      scourge.getCenter().y - player.getCenter().y
    )
    scourge.update(0.01, player)
    assert.equal(scourge.projectiles.length, 3)
    const distanceAfterRam = Math.hypot(
      scourge.getCenter().x - player.getCenter().x,
      scourge.getCenter().y - player.getCenter().y
    )
    assert.ok(distanceAfterRam < distanceBeforeRam)

    const lines = getAstralOrbitalGridLines({ x: 0, y: 0 }, Math.PI / 4, [-120, 0, 120])
    assert.equal(lines.length, 6)
    assert.ok(lines.every((line) => line.width < 10))
    const perpendicularFamily = lines[3]
    assert.ok(Math.abs(Math.abs(Math.atan2(
      perpendicularFamily.y2 - perpendicularFamily.y1,
      perpendicularFamily.x2 - perpendicularFamily.x1
    ) - Math.atan2(lines[0].y2 - lines[0].y1, lines[0].x2 - lines[0].x1)) - Math.PI / 2) < 0.001)

    assert.equal(getAstralScourgePhaseTwoAttackKind(0), 'astral_orbital_grid')
    assert.equal(getAstralScourgePhaseTwoAttackKind(0.39), 'astral_orbital_grid')
    assert.equal(getAstralScourgePhaseTwoAttackKind(0.4), 'astral_targeted_lasers')
    assert.equal(getAstralScourgePhaseTwoAttackKind(0.6), 'cosmic_laser_walls')
    assert.equal(getAstralScourgePhaseTwoAttackKind(0.8), 'cosmic_portal_lunge')
    assert.equal(getAstralTargetedLaserLines({ x: 0, y: 0 }, { x: 100, y: 0 }).length, 3)
  })

  it('sets base crit chance to 1% and introduces unlockable Storm Assassin hero (hero_07)', async () => {
    // 1. Base critical chance calibrated to 1%
    assert.equal(CRIT_CONFIG.BASE_CRIT_CHANCE, 0.01)
    const missCrit = rollCriticalHit({ baseDamage: 100, rng: () => 0.02 })
    assert.equal(missCrit.isCrit, false)
    assert.equal(missCrit.damage, 100)
    const landCrit = rollCriticalHit({ baseDamage: 100, rng: () => 0.005 })
    assert.equal(landCrit.isCrit, true)
    assert.equal(landCrit.damage, 200)

    // 2. Canonical seed remains 6 heroes while full roster & database include Storm Assassin (hero_07)
    assert.equal(validateSeedData().valid, true)
    assert.equal(heroes.length, 6)
    assert.equal(ALL_HEROES.length, 7)
    const dbHeroes = await getHeroes()
    assert.equal(dbHeroes.length, 7)

    const stormSpec = getUnlockableHeroSpec('hero_07')!
    assert.ok(stormSpec)
    assert.equal(stormSpec.name, 'Storm Assassin')
    assert.equal(stormSpec.archetype, 'Crit Striker')
    assert.equal(stormSpec.hp, 115)
    assert.equal(stormSpec.speed, 1.42)
    assert.equal(stormSpec.starting_upgrade_id, 'upg_06')
    assert.equal(stormSpec.unlockWave, 8)
    assert.equal(stormSpec.unlockCoinCost, 1500)
    assert.equal(isUnlockableHero('hero_07'), true)
    assert.equal(isUnlockableHero('hero_01'), false)

    // 3. Storm Assassin entity, buffed passive scaling & 5-tier Hero Mastery
    const stormPlayer = new Player({ hero: stormSpec })
    assert.equal(stormPlayer.maxHealth, 115)
    assert.equal(stormPlayer.speed, 1.42 * GAME_CONFIG.BASE_PLAYER_SPEED)
    assert.equal(getHeroAbility('hero_07').abilityName, 'Overcharge Execution')
    assert.equal(HERO_MASTERY_TIERS.hero_07.length, 5)

    const lv0Storm = getStormAssassinConfig(0)
    const lv5Storm = getStormAssassinConfig(5)
    assert.ok(lv0Storm.critChanceBonus >= 0.22)
    assert.ok(lv5Storm.critChanceBonus >= 0.55)
    assert.ok(lv0Storm.critDamageBonus >= 0.5)
    assert.ok(lv5Storm.critDamageBonus >= 1.5)
    assert.ok(lv0Storm.fireRateBonus >= 0.15)
    assert.ok(lv5Storm.fireRateBonus > lv0Storm.fireRateBonus)
    assert.ok(lv0Storm.bossStrikeRatio >= 0.55)
    assert.ok(lv5Storm.stormArcTargets > lv0Storm.stormArcTargets)
    assert.ok(lv5Storm.stormArcDamageRatio > lv0Storm.stormArcDamageRatio)
    assert.equal(getHeroCritBonuses('hero_07', 0).critChanceBonus, lv0Storm.critChanceBonus)
    assert.equal(getHeroCritBonuses('hero_01', 5).critChanceBonus, 0)
    assert.equal(getHeroFireRateBonus('hero_07', 0), lv0Storm.fireRateBonus)
    assert.equal(getHeroFireRateBonus('hero_01', 5), 0)
    assert.ok(getWeaponCritProfile('upg_06').critChanceBonus >= 0.08)

    // 4. Starter heroes unlocked by default; Storm Assassin starts locked & blocks upgrades until unlocked
    const uidCoins = `test_storm_coins_${Date.now()}`
    assert.equal(isHeroUnlocked(uidCoins, 'hero_01'), true)
    assert.equal(isHeroUnlocked(uidCoins, 'hero_07'), false)

    const lockedUpgradeAttempt = purchaseHeroSignatureUpgrade(uidCoins, 'hero_07')
    assert.equal(lockedUpgradeAttempt.success, false)

    const poorUnlock = unlockHeroWithCoins(uidCoins, 'hero_07')
    assert.equal(poorUnlock.success, false)

    creditShopCoins(uidCoins, 2000)
    const coinUnlock = unlockHeroWithCoins(uidCoins, 'hero_07')
    assert.equal(coinUnlock.success, true)
    assert.equal(coinUnlock.costPaid, 1500)
    assert.equal(isHeroUnlocked(uidCoins, 'hero_07'), true)
    assert.equal(getShopAccountState(uidCoins).balance, 500)

    creditShopCoins(uidCoins, 5000)
    const sigUpgrade = purchaseHeroSignatureUpgrade(uidCoins, 'hero_07')
    assert.equal(sigUpgrade.success, true)
    assert.equal(getHeroUpgradeLevel(uidCoins, 'hero_07'), 1)

    // 5. Wave 8 milestone auto-unlock flow (and dev lock/unlock toggle)
    const uidWave = `test_storm_wave_${Date.now()}`
    assert.deepEqual(checkAndSyncMilestoneHeroUnlocks(uidWave, 7), [])
    assert.equal(isHeroUnlocked(uidWave, 'hero_07'), false)
    const unlockedByWave = checkAndSyncMilestoneHeroUnlocks(uidWave, 8)
    assert.equal(unlockedByWave.length, 1)
    assert.equal(unlockedByWave[0].id, 'hero_07')
    assert.equal(isHeroUnlocked(uidWave, 'hero_07'), true)

    setHeroUnlockedForDev(uidWave, 'hero_07', false)
    assert.equal(isHeroUnlocked(uidWave, 'hero_07'), false)
    setHeroUnlockedForDev(uidWave, 'hero_07', true)
    assert.equal(isHeroUnlocked(uidWave, 'hero_07'), true)

    // 6. Paired Mythic weapon: Tempest Sphere: Skyfall (pairs with Storm Assassin hero_07)
    const tempestWpn = getShopWeaponById('wpn_tempest_sphere')!
    assert.ok(tempestWpn)
    assert.equal(tempestWpn.rarity, 'mythic')
    assert.equal(tempestWpn.crateOnly, true)
    assert.equal(tempestWpn.pairedHeroId, 'hero_07')
    assert.ok(getWeaponCritProfile('wpn_tempest_sphere').critChanceBonus >= 0.25)
    assert.ok(getUpgradeLevelPerkHint('wpn_tempest_sphere', 1).length > 0)
    assert.ok(getUpgradeOverdriveHint('wpn_tempest_sphere').includes('LV 5 OVERDRIVE'))

    const genericSphere = getTempestSphereWeaponConfig(118, 1, 'hero_02')
    const pairedSphere = getTempestSphereWeaponConfig(118, 1, 'hero_07')
    const pairedSphereLv5 = getTempestSphereWeaponConfig(118, 5, 'hero_07')
    assert.equal(genericSphere.isPairedHero, false)
    assert.equal(pairedSphere.isPairedHero, true)
    assert.ok(pairedSphere.impactDamage > genericSphere.impactDamage * 1.4)
    assert.ok(pairedSphere.pulseDamage > genericSphere.pulseDamage * 1.5)
    assert.ok(pairedSphere.pulseRadius > pairedSphere.impactRadius * 1.4)
    assert.ok(pairedSphere.pulseRadius > genericSphere.pulseRadius)
    assert.ok(pairedSphere.sphereCount > genericSphere.sphereCount)
    assert.ok(pairedSphere.cooldownScale < 1)
    assert.equal(pairedSphereLv5.sphereCount, 4)

    const tempestLoadout = resolveStartingUpgradeIds({
      heroStartingUpgradeId: 'upg_06',
      equippedWeaponId: 'wpn_tempest_sphere'
    })
    assert.deepEqual(tempestLoadout, ['upg_06', 'wpn_tempest_sphere'])
  })

  it('mounts and animates all visible weapons on Player and sorts Armory gear stacks across all sort modes', () => {
    // 1. Every Shop weapon, canonical active weapon upgrade, and Area 2 weapon resolves a visual behavior
    for (const w of SHOP_WEAPONS) {
      const behavior = getWeaponVisualBehavior(w.id)
      assert.ok(behavior.label.length > 0, `Missing visual label for ${w.id}`)
      assert.ok(behavior.duration > 0)
    }
    for (const u of [...upgrades, ...AREA_TWO_UPGRADES]) {
      if (['upg_08', 'upg_09', 'upg_11', 'upg_15'].includes(u.id)) continue
      const behavior = getWeaponVisualBehavior(u.id)
      assert.ok(behavior.label.length > 0, `Missing visual label for ${u.id}`)
      assert.ok(behavior.duration > 0)
    }

    assert.equal(getWeaponVisualBehavior('wpn_muramasa').kind, 'melee_swing')
    assert.equal(getWeaponVisualBehavior('wpn_solar_flail').kind, 'flail_whip')
    assert.equal(getWeaponVisualBehavior('wpn_phantom_sniper').kind, 'ranged_recoil')
    assert.equal(getWeaponVisualBehavior('wpn_chrono_gatling').kind, 'gatling_spin')
    assert.equal(getWeaponVisualBehavior('upg_a2_03').kind, 'spear_thrust')
    assert.equal(getWeaponVisualBehavior('wpn_storm_glaive').kind, 'glaive_spin')

    // 2. Player mounts ONLY actual weapons (wpn_* + handheld starters), filtering out upgrades/passives/summons
    assert.equal(isVisiblePlayerWeaponId('wpn_muramasa'), true)
    assert.equal(isVisiblePlayerWeaponId('wpn_tempest_sphere'), true)
    assert.equal(isVisiblePlayerWeaponId('upg_12'), true)
    assert.equal(isVisiblePlayerWeaponId('upg_13'), true)
    assert.equal(isVisiblePlayerWeaponId('upg_01'), false)
    assert.equal(isVisiblePlayerWeaponId('upg_04'), false)
    assert.equal(isVisiblePlayerWeaponId('upg_14'), false)
    assert.equal(isVisiblePlayerWeaponId('upg_17'), false)
    assert.equal(isVisiblePlayerWeaponId('upg_crit_01'), false)
    assert.equal(isVisiblePlayerWeaponId('upg_a2_04'), false)

    const vanguard = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 500, y: 500, hero: vanguard })
    assert.equal(player.getActiveWeapons().length, 1)
    assert.equal(player.getActiveWeapons()[0].id, 'upg_12')

    const engineer = heroes.find((h) => h.id === 'hero_03')!
    const engineerPlayer = new Player({ x: 500, y: 500, hero: engineer })
    assert.equal(engineerPlayer.getActiveWeapons().length, 0)

    player.setActiveWeapons([
      { id: 'wpn_muramasa', level: 3 },
      { id: 'upg_12', level: 5 },
      { id: 'upg_crit_01', level: 2 },
      { id: 'upg_04', level: 3 },
      { id: 'upg_01', level: 2 },
      { id: 'upg_17', level: 4 },
      { id: 'wpn_phantom_sniper', level: 2 },
      { id: 'wpn_muramasa', level: 4 }
    ])
    assert.deepEqual(
      player.getActiveWeapons().map((w) => w.id),
      ['wpn_muramasa', 'upg_12', 'wpn_phantom_sniper']
    )

    player.triggerWeaponAction('wpn_muramasa', Math.PI / 4)
    const firstSwing = player.getWeaponActionState('wpn_muramasa')!
    assert.ok(firstSwing)
    assert.equal(firstSwing.aimAngle, Math.PI / 4)
    assert.equal(firstSwing.swingParity, 1)
    assert.ok(firstSwing.timer > 0)

    player.update({ x: 0, y: 0 }, 0.1)
    const decayedSwing = player.getWeaponActionState('wpn_muramasa')!
    assert.ok(decayedSwing.timer < firstSwing.timer)

    // Re-triggering alternates swingParity for melee sweep arcs
    player.triggerWeaponAction('wpn_muramasa', 0)
    const secondSwing = player.getWeaponActionState('wpn_muramasa')!
    assert.equal(secondSwing.swingParity, -1)

    // 3. Armory sortGearStacks supports equipped, rarity_desc/asc, stars_desc, count_desc, power_desc, and name_asc
    const sortUser = `sort_armory_${Date.now()}`
    creditShopCoins(sortUser, 50000)
    const openDeterministic = (crateId: Parameters<typeof openSupplyCrate>[1], seq: number[]) => {
      let i = 0
      return openSupplyCrate(sortUser, crateId, () => seq[i++] ?? 0)
    }
    // Tactical: 0.65 (uncommon), 0.01 (wpn_plasma_lance) x3 -> fuse 2 to 1★, keep 1x 0★
    openDeterministic('crate_tactical', [0.65, 0.01])
    openDeterministic('crate_tactical', [0.65, 0.01])
    openDeterministic('crate_tactical', [0.65, 0.01])
    fuseGearStacks(sortUser, 'wpn_plasma_lance', 0)
    // Salvage: 0.05 (scrap), 0.01 (first scrap item) x2 so count=2
    openDeterministic('crate_salvage', [0.05, 0.01])
    openDeterministic('crate_salvage', [0.05, 0.01])
    // Mythic crate: 0.995 (mythic), 0.01 (wpn_muramasa)
    openDeterministic('crate_mythic', [0.995, 0.01])

    // Equip 0★ Plasma Lance so it tests equipped-first vs 1★ / mythic
    assert.equal(equipShopWeapon(sortUser, 'wpn_plasma_lance', 0).success, true)
    const state = getShopAccountState(sortUser)
    const stacks = getInventoryStacks(state)
    assert.ok(stacks.length >= 4)

    const byEquipped = sortGearStacks(stacks, 'equipped', state)
    assert.equal(byEquipped[0].itemId, 'wpn_plasma_lance')
    assert.equal(byEquipped[0].stars, 0)

    const byRarityDesc = sortGearStacks(stacks, 'rarity_desc', state)
    assert.equal(byRarityDesc[0].item.rarity, 'mythic')
    assert.equal(byRarityDesc[byRarityDesc.length - 1].item.rarity, 'scrap')

    const byRarityAsc = sortGearStacks(stacks, 'rarity_asc', state)
    assert.equal(byRarityAsc[0].item.rarity, 'scrap')
    assert.equal(byRarityAsc[byRarityAsc.length - 1].item.rarity, 'mythic')

    const byStarsDesc = sortGearStacks(stacks, 'stars_desc', state)
    assert.equal(byStarsDesc[0].stars, 1)

    const byCountDesc = sortGearStacks(stacks, 'count_desc', state)
    assert.equal(byCountDesc[0].count, 2)

    const byNameAsc = sortGearStacks(stacks, 'name_asc', state)
    for (let i = 1; i < byNameAsc.length; i++) {
      assert.ok(byNameAsc[i - 1].item.name.localeCompare(byNameAsc[i].item.name) <= 0)
    }

    const byPowerDesc = sortGearStacks(stacks, 'power_desc', state)
    assert.equal(byPowerDesc[0].itemId, 'wpn_muramasa')
  })

  it('computes detailed post-game summary metrics including DPS, crit rate, survival clock, and upgrade ordering', () => {
    assert.equal(formatSurvivalClock(0), '00:00')
    assert.equal(formatSurvivalClock(125), '02:05')
    assert.equal(formatSurvivalClock(3665), '1:01:05')

    const metrics = computePostGameMetrics({
      survivalSeconds: 300,
      coinsCollected: 120,
      enemiesDefeated: 450,
      totalDamageDealt: 180000,
      totalDamageTaken: 420,
      damageBlocked: 195,
      bossesDefeated: 3,
      totalHits: 1000,
      criticalHits: 125,
      highestHit: 2450,
      levelReached: 14,
      damageFreeWaveStreak: 6,
      heroName: 'Storm Assassin',
      areaName: 'Carbon Sector',
      upgrades: [
        { id: 'upg_12', name: 'Arc Slash', category: 'Melee Weapon', level: 5, isMaxLevel: true },
        { id: 'upg_04', name: 'Orbiting Pulse', category: 'AoE Weapon', level: 3, isMaxLevel: false },
        {
          id: 'wpn_tempest_sphere',
          name: 'Tempest Sphere',
          category: 'Shop Weapon',
          level: 4,
          isMaxLevel: false,
          isEquippedWeapon: true
        }
      ]
    })

    assert.equal(metrics.formattedTime, '05:00')
    assert.equal(metrics.averageDps, 600)
    assert.equal(metrics.killsPerMinute, 90)
    assert.equal(metrics.critRatePercent, 12.5)
    assert.equal(metrics.calculatedScore, 10 * 300 + 25 * 120)
    assert.equal(metrics.bossesDefeated, 3)
    assert.equal(metrics.totalDamageTaken, 420)
    assert.equal(metrics.damageBlocked, 195)
    assert.equal(metrics.highestHit, 2450)
    assert.equal(metrics.levelReached, 14)
    assert.equal(metrics.damageFreeWaveStreak, 6)
    assert.deepEqual(
      metrics.sortedUpgrades.map((u) => u.id),
      ['wpn_tempest_sphere', 'upg_12', 'upg_04']
    )

    // Zero-duration and empty optional telemetry safe defaults
    const zeroMetrics = computePostGameMetrics({
      survivalSeconds: 0,
      coinsCollected: 0,
      enemiesDefeated: 0
    })
    assert.equal(zeroMetrics.formattedTime, '00:00')
    assert.equal(zeroMetrics.averageDps, 0)
    assert.equal(zeroMetrics.killsPerMinute, 0)
    assert.equal(zeroMetrics.critRatePercent, 0)
    assert.equal(zeroMetrics.levelReached, 1)
    assert.equal(zeroMetrics.sortedUpgrades.length, 0)
  })

  it('restricts Secret Devourer of Gods strictly to Dev Panel spawn_enemy, verifies exact cutscene lines, and simulates 22-segment Calamity boss', () => {
    // 1. Strictly excluded from canonical seedData & all normal wave/boss spawners
    assert.equal(enemies.length, 4)
    assert.equal(enemies.some((e) => e.id === SECRET_DEVOURER_OF_GODS_ID), false)
    assert.equal(AREA_TWO_ENEMIES.some((e) => e.id === SECRET_DEVOURER_OF_GODS_ID), false)
    assert.equal(AREA_TWO_BOSSES.some((e) => e.id === SECRET_DEVOURER_OF_GODS_ID), false)
    assert.equal(getAreaEnemies('carbon_sector').some((e) => e.id === SECRET_DEVOURER_OF_GODS_ID), false)
    assert.equal(getAreaEnemies('astral_citadel').some((e) => e.id === SECRET_DEVOURER_OF_GODS_ID), false)

    for (const w of [1, 5, 10, 15, 20, 25]) {
      assert.notEqual(getAreaBossTemplateForWave('carbon_sector', w).id, SECRET_DEVOURER_OF_GODS_ID)
      assert.notEqual(getAreaBossTemplateForWave('astral_citadel', w).id, SECRET_DEVOURER_OF_GODS_ID)
      for (const roll of [0.05, 0.5, 0.85, 0.95]) {
        assert.notEqual(
          selectAreaEnemyTemplateForWave('carbon_sector', w, { roll }).template.id,
          SECRET_DEVOURER_OF_GODS_ID
        )
        assert.notEqual(
          selectAreaEnemyTemplateForWave('astral_citadel', w, {
            roll,
            canSpawnRanged: true,
            canSpawnMiniBoss: true
          }).template.id,
          SECRET_DEVOURER_OF_GODS_ID
        )
      }
    }

    assert.equal(isSecretDevOnlyBossId(SECRET_DEVOURER_OF_GODS_ID), true)
    assert.equal(isSecretDevOnlyBossId('ene_04'), false)

    const dogEntry = getDevSpawnableEnemyById(SECRET_DEVOURER_OF_GODS_ID)
    assert.ok(dogEntry)
    assert.equal(dogEntry.isBoss, true)
    assert.equal(dogEntry.isSecretDevOnly, true)
    assert.equal(dogEntry.group, 'Secret Boss')
    assert.ok(DEV_SPAWNABLE_ENEMIES.length >= 12)

    // 2. Exact Calamity cutscene lines
    assert.equal(SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES.line1, 'YOU ARE NO GOD')
    assert.equal(
      SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES.line2,
      'BUT I SHALL FEAST UPON YOUR ESSENCE REGARDLESS'
    )

    // 3. Dev-only authorization gate for spawn_enemy
    const blockedSpawn = dispatchDevAction('player@swarm.test', {
      type: 'spawn_enemy',
      enemyId: SECRET_DEVOURER_OF_GODS_ID,
      count: 1
    })
    assert.equal(blockedSpawn.success, false)

    const receivedActions: DevLiveAction[] = []
    const unsubscribe = subscribeDevActions((act) => receivedActions.push(act))
    const allowedSpawn = dispatchDevAction(DEV_AUTHORIZED_EMAIL, {
      type: 'spawn_enemy',
      enemyId: SECRET_DEVOURER_OF_GODS_ID,
      count: 1
    })
    unsubscribe()
    assert.equal(allowedSpawn.success, true)
    assert.equal(receivedActions.length, 1)
    assert.deepEqual(receivedActions[0], {
      type: 'spawn_enemy',
      enemyId: SECRET_DEVOURER_OF_GODS_ID,
      count: 1
    })

    // 4. Devourer of Gods Enemy initialization, beat-drop synced emergence, 22 articulated segments & segment contact check
    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 800, y: 800, hero })
    const dog = new Enemy({
      x: 762,
      y: 520,
      enemyData: SECRET_DEVOURER_OF_GODS_TEMPLATE,
      target: player,
      isBoss: true
    })

    assert.equal(dog.isBoss, true)
    assert.equal(dog.isDevourerOfGods, true)
    assert.equal(dog.bossTitle, 'DEVOURER OF GODS')
    assert.equal(dog.dogSegments.length, 22)
    assert.equal(dog.cutsceneDelayTimer, DEVOURER_CUTSCENE_DURATION_SECONDS)
    assert.equal(dog.isSpawning, true)

    // Still spawning midway through buildup cutscene before beat drop (6.0s < 11.6s)
    for (let i = 0; i < 120; i++) {
      dog.update(0.05, player)
    }
    assert.equal(dog.isSpawning, true)

    // Finishes full 11.6s emergence cutscene cleanly right on beat drop
    for (let i = 0; i < 120; i++) {
      dog.update(0.05, player)
    }
    assert.equal(dog.isSpawning, false)
    assert.equal(dog.cutsceneDelayTimer, 0)

    // Advance combat frames so head and segments slither toward player
    const segBefore = { ...dog.dogSegments[4] }
    for (let i = 0; i < 15; i++) {
      dog.update(0.05, player)
    }
    const segAfter = dog.dogSegments[4]
    assert.ok(
      Math.hypot(segAfter.x - segBefore.x, segAfter.y - segBefore.y) > 1,
      'Devourer of Gods body segments should follow articulated kinematics'
    )

    // Verify segment hit detection intersects on segment and misses far away
    const targetSeg = dog.dogSegments[6]
    assert.equal(
      checkDevourerSegmentHit(dog, { x: targetSeg.x, y: targetSeg.y, radius: 18 }),
      true
    )
    assert.equal(
      checkDevourerSegmentHit(dog, { x: targetSeg.x + 900, y: targetSeg.y + 900, radius: 18 }),
      false
    )

    // Regular & endless wave enemy spawning halts whenever Devourer of Gods is active
    assert.equal(shouldSpawnRegularEnemiesInWave(6, false, true), false)
    assert.equal(shouldSpawnRegularEnemiesInWave(20, true, true), false)
  })

  it('executes Calamity Devourer of Gods cosmic laser walls, portal lunge, splitting nebula stars, Phase 2 Universal Collapse, and cutscene camera zoom', () => {
    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 900, y: 900, hero })
    const playerCenter = player.getCenter()
    const dog = new Enemy({
      x: 862,
      y: 520,
      enemyData: SECRET_DEVOURER_OF_GODS_TEMPLATE,
      target: player,
      isBoss: true
    })

    // 1. Cutscene zoom-in curve starts at player (zoom 1.0), zooms onto boss (>1.65x), and eases back out at beat drop
    const startCam = computeDevourerCutsceneCameraFrame({
      elapsed: 0,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS,
      playerCenter,
      bossFocus: dog.getCenter()
    })
    assert.equal(startCam.zoom, 1)
    assert.equal(startCam.focusX, playerCenter.x)
    assert.equal(startCam.focusY, playerCenter.y)

    const midCam = computeDevourerCutsceneCameraFrame({
      elapsed: DEVOURER_CUTSCENE_DURATION_SECONDS * 0.5,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS,
      playerCenter,
      bossFocus: dog.getCenter()
    })
    assert.ok(midCam.zoom >= 1.75, `Expected cutscene peak zoom >= 1.75, got ${midCam.zoom}`)
    assert.ok(
      Math.hypot(midCam.focusX - dog.getCenter().x, midCam.focusY - dog.getCenter().y) < 1,
      'Mid-cutscene camera should focus directly on the Devourer of Gods'
    )

    const endCam = computeDevourerCutsceneCameraFrame({
      elapsed: DEVOURER_CUTSCENE_DURATION_SECONDS,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS,
      playerCenter,
      bossFocus: dog.getCenter()
    })
    assert.equal(endCam.zoom, 1)
    assert.ok(Math.hypot(endCam.focusX - playerCenter.x, endCam.focusY - playerCenter.y) < 0.01)

    // Cutscene screen-shake & impact flash curve peaks across rift tear, emergence, crescendo & beat-drop aftershock
    const tearShake = computeDevourerCutsceneShake({
      elapsed: 0.05,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS
    })
    assert.ok(tearShake.intensity >= 7, 'Initial rift tear should shake screen noticeably')
    const line2Shake = computeDevourerCutsceneShake({
      elapsed: 3.45,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS
    })
    assert.ok(line2Shake.intensity >= 9 && line2Shake.flashAlpha > 0.15)
    const preDropShake = computeDevourerCutsceneShake({
      elapsed: DEVOURER_CUTSCENE_DURATION_SECONDS - 0.1,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS
    })
    assert.ok(preDropShake.intensity >= 14, 'Pre-drop buildup should ramp high shake intensity')
    const postDropShake = computeDevourerCutsceneShake({
      elapsed: DEVOURER_CUTSCENE_DURATION_SECONDS + 0.05,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS
    })
    assert.ok(postDropShake.intensity >= 17 && postDropShake.flashAlpha >= 0.45)
    const settledShake = computeDevourerCutsceneShake({
      elapsed: DEVOURER_CUTSCENE_DURATION_SECONDS + 1.1,
      duration: DEVOURER_CUTSCENE_DURATION_SECONDS
    })
    assert.equal(settledShake.intensity, 0)
    assert.equal(settledShake.flashAlpha, 0)

    // Finish emergence cutscene
    dog.cutsceneDelayTimer = 0
    dog.isSpawning = false

    // 2. Cosmic Laser Walls (P1 orthogonal web): intersects beam line, leaves grid cell center safe
    dog.spawnTelegraphedAttack('cosmic_laser_walls')
    const wallTel = dog.telegraphs[dog.telegraphs.length - 1]
    assert.equal(wallTel.kind, 'cosmic_laser_walls')
    assert.ok(wallTel.gridLines && wallTel.gridLines.length === 8)
    wallTel.hasTriggered = true

    const firstLaser = wallTel.gridLines[0]
    assert.equal(
      checkBossTelegraphHit(wallTel, { x: firstLaser.x1, y: wallTel.y, radius: 14 }),
      true
    )
    assert.equal(
      checkBossTelegraphHit(wallTel, { x: wallTel.x, y: wallTel.y, radius: 14 }),
      false
    )

    // 3. Cosmic Portal Rift Ambush & Jaw Lunge teleports boss head to portal and triggers dash lunge
    dog.telegraphs = []
    dog.spawnTelegraphedAttack('cosmic_portal_lunge')
    const portalTel = dog.telegraphs[dog.telegraphs.length - 1]
    assert.equal(portalTel.kind, 'cosmic_portal_lunge')
    assert.ok(portalTel.portalX !== undefined && portalTel.portalY !== undefined)

    for (let s = 0; s < 30; s++) {
      dog.update(0.05, player)
      if (portalTel.hasTriggered) break
    }
    assert.equal(portalTel.hasTriggered, true)
    assert.ok(dog.dogDashTimer > 0, 'Portal ambush should initiate a high-speed jaw lunge dash')
    assert.equal(
      checkBossTelegraphHit(portalTel, {
        x: (portalTel.x + (portalTel.endX ?? portalTel.x)) / 2,
        y: (portalTel.y + (portalTel.endY ?? portalTel.y)) / 2,
        radius: 16
      }),
      true
    )

    // 4. Splitting Nebula Stars & Cosmic Orb Barrage spawn splitting stars mid-flight
    dog.telegraphs = []
    dog.projectiles = []
    dog.spawnTelegraphedAttack('cosmic_orb_barrage')
    const orbTel = dog.telegraphs[dog.telegraphs.length - 1]
    assert.equal(orbTel.kind, 'cosmic_orb_barrage')
    for (let s = 0; s < 40; s++) {
      dog.update(0.05, player)
      if (dog.projectiles.some((p) => p.isCosmicStar)) break
    }
    const splitStar = dog.projectiles.find((p) => p.isCosmicStar && !p.splitDone)
    assert.ok(splitStar, 'Cosmic orb barrage should fire splitting Nebula Stars')
    const countBeforeSplit = dog.projectiles.length
    for (let s = 0; s < 20; s++) {
      dog.update(0.05, player)
    }
    assert.ok(
      dog.projectiles.length > countBeforeSplit,
      'Splitting Nebula Star should fragment radially after its splitAfter delay'
    )

    // 5. Phase 2 "Universal Collapse" triggers at <= 60% HP with diagonal diamond laser web + enrage
    dog.telegraphs = []
    const dropToPhase2 = Math.floor(dog.maxHealth * 0.85)
    dog.takeDamage(dropToPhase2)
    assert.equal(dog.isEnraged, true)
    assert.equal(dog.pendingPhaseAnnouncement, 2)
    assert.ok(
      dog.telegraphs.some((t) => t.kind === 'cosmic_laser_walls'),
      'Phase 2 awakening should unleash an immediate Cosmic Laser Wall pattern'
    )

    // 6. Universal Collapse YouTube-exclusive music & beat-drop sync verification
    assert.equal(DEVOURER_BEAT_DROP_SECONDS, 11.6)
    assert.equal(DEVOURER_CUTSCENE_DURATION_SECONDS, DEVOURER_BEAT_DROP_SECONDS)
    assert.equal(
      DEVOURER_YOUTUBE_URL,
      'https://www.youtube.com/watch?v=EaB1utQkmT8&list=RDEaB1utQkmT8&start_radio=1'
    )
    assert.equal(DEVOURER_YOUTUBE_VIDEO_ID, 'EaB1utQkmT8')
    assert.equal(parseYouTubeVideoId(DEVOURER_YOUTUBE_URL), 'EaB1utQkmT8')
    assert.equal(parseYouTubeVideoId('https://youtu.be/EaB1utQkmT8'), 'EaB1utQkmT8')
    assert.equal(parseYouTubeVideoId('not-a-valid-video'), null)
    const embedUrl = buildYouTubeEmbedUrl(DEVOURER_YOUTUBE_VIDEO_ID, {
      autoplay: true,
      loop: true,
      enableJsApi: true
    })
    assert.ok(embedUrl.startsWith('https://www.youtube.com/embed/EaB1utQkmT8?'))
    assert.ok(embedUrl.includes('autoplay=1'))
    assert.ok(embedUrl.includes('loop=1'))
    assert.ok(embedUrl.includes('playlist=EaB1utQkmT8'))
    assert.ok(embedUrl.includes('enablejsapi=1'))

    const audio = new AudioService({
      defaultSettings: { masterVolume: 80, musicVolume: 65, sfxVolume: 75, isMuted: false }
    })
    assert.equal(audio.getMusicTypes().includes('universal_collapse'), true)
    assert.equal(MUSIC_TRACK_METADATA.universal_collapse.title, 'Universal Collapse')
    assert.equal(MUSIC_TRACK_METADATA.universal_collapse.bpm, 148)
    assert.equal(MUSIC_TRACK_METADATA.universal_collapse.stepCount, 128)
    assert.equal(MUSIC_TRACK_METADATA.universal_collapse.youtubeVideoId, 'EaB1utQkmT8')
    assert.equal(MUSIC_TRACK_METADATA.universal_collapse.youtubeUrl, DEVOURER_YOUTUBE_URL)
    assert.equal(MUSIC_TRACK_METADATA.universal_collapse.beatDropSeconds, DEVOURER_BEAT_DROP_SECONDS)
    assert.equal(audio.getEffectiveMusicVolumePercent(), 52)

    audio.playMusic('universal_collapse')
    assert.equal(audio.getCurrentMusicTrack(), 'universal_collapse')
    assert.equal(audio.isMusicPlaying(), true)
    assert.equal(audio.isExternalYouTubeActive(), true)

    audio.pauseMusic()
    assert.equal(audio.isMusicPlaying(), false)
    assert.equal(audio.getCurrentMusicTrack(), 'universal_collapse')

    audio.resumeMusic()
    assert.equal(audio.isMusicPlaying(), true)

    audio.toggleMute()
    assert.equal(audio.isMusicPlaying(), false)
    assert.equal(audio.getEffectiveMusicVolumePercent(), 0)
    audio.toggleMute()
    assert.equal(audio.isMusicPlaying(), true)
    assert.equal(audio.getEffectiveMusicVolumePercent(), 52)

    audio.stopMusic()
    assert.equal(audio.getCurrentMusicTrack(), null)
    assert.equal(audio.isMusicPlaying(), false)
    assert.equal(audio.isExternalYouTubeActive(), false)
    assert.ok(audio.getMusicTypes().includes('astral_scourge'))
    assert.equal(MUSIC_TRACK_METADATA.astral_scourge.title, 'Astral Scourge')
    assert.equal(MUSIC_TRACK_METADATA.astral_scourge.youtubeVideoId, ASTRAL_SCOURGE_YOUTUBE_VIDEO_ID)
    assert.equal(MUSIC_TRACK_METADATA.astral_scourge.youtubeUrl, ASTRAL_SCOURGE_YOUTUBE_URL)
    assert.equal(parseYouTubeVideoId(ASTRAL_SCOURGE_YOUTUBE_URL), ASTRAL_SCOURGE_YOUTUBE_VIDEO_ID)
    audio.playMusic('astral_scourge')
    assert.equal(audio.getCurrentMusicTrack(), 'astral_scourge')
    assert.equal(audio.isExternalYouTubeActive(), true)
    audio.stopMusic()
    audio.destroy()
  })

  it('gives both Wave 15 bosses distinct cinematic entrances and correctly timed emergence', () => {
    assert.equal(WAVE_15_CUTSCENE_DURATION_SECONDS, 4.6)

    const a1Theme = getWave15CutsceneTheme('carbon_sector')
    const a2Theme = getWave15CutsceneTheme('astral_citadel')
    assert.equal(a1Theme.kind, 'w15_omega')
    assert.equal(a1Theme.durationSeconds, 5.4)
    assert.equal(a1Theme.revealDelaySeconds, 1.8)
    assert.equal(a1Theme.presentation, 'warning')
    assert.equal(a1Theme.particleStyle, 'carbon_inferno')
    assert.equal(a1Theme.speaker, 'Omega Overlord')
    assert.equal(a1Theme.warningTitle, 'BOSS WARNING // OMEGA OVERLORD')
    assert.ok(a1Theme.warningSubtitle.includes('CARBON SECTOR'))
    assert.ok(a1Theme.warningCriticalText.length > 0)

    assert.equal(a2Theme.kind, 'w15_seraph')
    assert.equal(a2Theme.durationSeconds, 6.2)
    assert.equal(a2Theme.revealDelaySeconds, 2.2)
    assert.equal(a2Theme.presentation, 'warning')
    assert.equal(a2Theme.particleStyle, 'astral_solar_fire')
    assert.equal(a2Theme.speaker, 'Solar Archon Seraph')
    assert.equal(a2Theme.warningTitle, 'BOSS WARNING // SOLAR ARCHON SERAPH')
    assert.ok(a2Theme.warningSubtitle.includes('ASTRAL CITADEL'))
    assert.ok(a2Theme.warningCriticalText.length > 0)

    assert.equal(DEVOURER_CUTSCENE_THEME.presentation, 'dialogue')
    assert.equal(DEVOURER_CUTSCENE_THEME.particleStyle, 'cosmic_rift')
    assert.equal(DEVOURER_CUTSCENE_THEME.line1, SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES.line1)
    assert.equal(DEVOURER_CUTSCENE_THEME.line2, SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES.line2)

    // Screen-shake & flash curve over Wave 15 4.6s duration (line 2 at 1.6s)
    const tear = computeBossCutsceneShake({
      elapsed: 0.05,
      duration: WAVE_15_CUTSCENE_DURATION_SECONDS,
      line2Time: 1.6
    })
    assert.ok(tear.intensity >= 7)
    const line2 = computeBossCutsceneShake({
      elapsed: 1.65,
      duration: WAVE_15_CUTSCENE_DURATION_SECONDS,
      line2Time: 1.6
    })
    assert.ok(line2.intensity >= 9 && line2.flashAlpha > 0.15)
    const preDrop = computeBossCutsceneShake({
      elapsed: WAVE_15_CUTSCENE_DURATION_SECONDS - 0.1,
      duration: WAVE_15_CUTSCENE_DURATION_SECONDS,
      line2Time: 1.6
    })
    assert.ok(preDrop.intensity >= 14)
    const postDrop = computeBossCutsceneShake({
      elapsed: WAVE_15_CUTSCENE_DURATION_SECONDS + 0.05,
      duration: WAVE_15_CUTSCENE_DURATION_SECONDS,
      line2Time: 1.6
    })
    assert.ok(postDrop.intensity >= 17 && postDrop.flashAlpha >= 0.45)
    const settled = computeBossCutsceneShake({
      elapsed: WAVE_15_CUTSCENE_DURATION_SECONDS + 1.1,
      duration: WAVE_15_CUTSCENE_DURATION_SECONDS,
      line2Time: 1.6
    })
    assert.equal(settled.intensity, 0)
    assert.equal(settled.flashAlpha, 0)

    // Wave 15 Final Boss entities hold emergence lock through their own scene durations
    const hero = heroes.find((h) => h.id === 'hero_01')!
    const player = new Player({ x: 900, y: 860, hero })
    for (const areaId of ['carbon_sector', 'astral_citadel'] as const) {
      const theme = getWave15CutsceneTheme(areaId)
      const w15 = new Enemy({
        x: 900,
        y: 360,
        enemyData: getAreaBossTemplateForWave(areaId, 15),
        target: player,
        isBoss: true,
        isStationaryBoss: true,
        isFinalBoss: true,
        anchorPos: { x: 900, y: 360 },
        arenaBounds: { left: 260, top: 140, width: 1280, height: 720 }
      })
      assert.equal(w15.isSpawning, true)
      assert.equal(w15.spawnDelay, theme.durationSeconds)
      assert.equal(w15.cutsceneDelayTimer, theme.durationSeconds)

      for (let i = 0; i < 40; i++) {
        w15.update(0.05, player)
      }
      assert.equal(w15.isSpawning, true)

      const remainingSteps = Math.ceil(((theme.durationSeconds ?? 0) - 2) / 0.05) + 2
      for (let i = 0; i < remainingSteps; i++) {
        w15.update(0.05, player)
      }
      assert.equal(w15.isSpawning, false)
      assert.equal(w15.cutsceneDelayTimer, 0)
    }
  })
})









