/**
 * Game Container - 60 FPS Arena Combat Engine
 * Phases 7 & 9: Full real-time game loop with ref-based mutable state,
 * circle-to-circle collisions, auto-targeting weapons, wave/breather timing,
 * Wave 5 Mini-Boss, XP leveling, and Supabase/localStorage telemetry submission.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Camera } from '../../../game/engine/Camera'
import { InputManager } from '../../../game/engine/InputManager'
import { Player } from '../../../game/entities/Player'
import {
  BossArenaBounds,
  checkBossTelegraphHit,
  checkEnemyAoeHit,
  Enemy,
  resolveEnemyCollisions
} from '../../../game/entities/Enemy'
import { Projectile } from '../../../game/entities/Projectile'
import { Coin } from '../../../game/entities/Coin'
import { Summon } from '../../../game/entities/Summon'
import { Collision } from '../../../game/utils/collision'
import { heroes, enemies as seedEnemies, upgrades as seedUpgrades } from '../../../db/seedData'
import {
  COIN_CONFIG,
  getEnemyScaling,
  getUpgradeLevelPerkHint,
  getUpgradeLevelStats,
  getUpgradeOverdriveHint,
  getWaveRangedSpawnLimit,
  getWaveSpawnConfig,
  getXpForNextLevel,
  LEVEL_UP_CONFIG,
  MAX_WEAPON_UPGRADE_LEVEL,
  selectEnemyTypeIndexForWave,
  WAVE_CONFIG
} from '../../../config/gameConstants'
import {
  AREA_TWO_ENEMIES,
  ArenaId,
  getAreaBossTemplateForWave,
  getAreaById,
  getAreaMiniBossCap,
  getWave15FinalBossHp,
  selectAreaEnemyTemplateForWave,
  shouldSpawnRegularEnemiesInWave
} from '../../../config/arenas'
import {
  computeHeroBurnPerTick,
  getArcSlashConfig,
  getHeroAbility,
  getHeroDamageReduction,
  getSummonCountForUpgrade,
  HERO_ABILITY_CONSTANTS,
  shouldApplyHomingForHero
} from '../../../config/heroAbilities'
import type { UpgradesRow } from '../../../types/database'
import { calculateScoreFormula, getOperativeProfile, submitScore } from '../../../services/scores'
import {
  computeEquippedAccessoryBonuses,
  creditShopCoins,
  getShopAccountState,
  shopWeaponsAsUpgrades,
  type ComputedAccessoryBonuses
} from '../../../services/shop'
import {
  setDevRunStatus,
  subscribeDevActions,
  useDevSettings
} from '../../../services/devTools'
import { useSupabase } from '../../../hooks/useSupabase'
import { useAudio } from '../../../context/AudioContext'
import { useToast } from '../../ui/ToastContainer'
import GameCanvas from './GameCanvas'
import HUD from './HUD'
import LevelUpModal, { UpgradeOption } from './LevelUpModal'
import PauseMenu from './PauseMenu'
import GameOverScreen from './GameOverScreen'

export interface GameContainerProps {
  onBack?: () => void
  selectedHeroId?: string
  startingUpgradeId?: string
  loadoutName?: string
  areaId?: ArenaId
  autoStart?: boolean
}

type EngineState = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelup' | 'victory_choice'

interface ExplosionFx {
  x: number
  y: number
  radius: number
  timer: number
  duration: number
  color: string
}

interface FloatingTextFx {
  x: number
  y: number
  text: string
  color: string
  timer: number
}

interface OrbitalBeamFx {
  angle: number
  angularSpeed: number
  length: number
  damage: number
  timer: number
  duration: number
  hitCooldowns: Map<Enemy, number>
  cloneId?: number
  originX?: number
  originY?: number
  color?: string
}

interface VoidVortexFx {
  x: number
  y: number
  radius: number
  timer: number
  duration: number
  damage: number
  isLv5: boolean
}

interface BurnZoneFx {
  x: number
  y: number
  radius: number
  timer: number
  duration: number
  tickTimer: number
  damagePerTick: number
  isLv5: boolean
}

type AttackFx =
  | {
      kind: 'lightning'
      points: Array<{ x: number; y: number }>
      color: string
      timer: number
      duration: number
    }
  | {
      kind: 'slash'
      x: number
      y: number
      angle: number
      radius: number
      color: string
      timer: number
      duration: number
    }
  | {
      kind: 'orbital_strike'
      x: number
      y: number
      radius: number
      color: string
      timer: number
      duration: number
    }
  | {
      kind: 'siphon'
      from: { x: number; y: number }
      to: { x: number; y: number }
      color: string
      timer: number
      duration: number
    }
  | {
      kind: 'muramasa_slash'
      x: number
      y: number
      angle: number
      radius: number
      color: string
      timer: number
      duration: number
    }
  | {
      kind: 'heal_wave'
      x: number
      y: number
      radius: number
      timer: number
      duration: number
    }

interface ChronoClone {
  id: number
  x: number
  y: number
  timer: number
  duration: number
  slotOffsetAngle: number
}

interface DashAfterimage {
  x: number
  y: number
  timer: number
  duration: number
}

const ARENA_SIZE = 2000

const GameContainer: React.FC<GameContainerProps> = ({
  onBack,
  selectedHeroId,
  startingUpgradeId,
  loadoutName,
  areaId = 'carbon_sector',
  autoStart = true
}) => {
  const activeArea = getAreaById(areaId)
  const areaRef = useRef(activeArea)
  areaRef.current = activeArea

  const { user } = useSupabase()
  const { authorized: isDevUser, settings: devSettings } = useDevSettings(user?.email)
  const { playSound } = useAudio()
  const toast = useToast()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // React UI state (synced periodically or on discrete events)
  const [gameState, setGameState] = useState<EngineState>('menu')
  const [score, setScore] = useState<number>(0)
  const [coins, setCoins] = useState<number>(0)
  const [xp, setXP] = useState<number>(0)
  const [level, setLevel] = useState<number>(1)
  const [health, setHealth] = useState<number>(100)
  const [maxHealth, setMaxHealth] = useState<number>(100)
  const [wave, setWave] = useState<number>(1)
  const [waveTimeRemaining, setWaveTimeRemaining] = useState<number>(WAVE_CONFIG.WAVE_DURATION_SECONDS)
  const [isBreather, setIsBreather] = useState<boolean>(false)
  const [enemiesDefeated, setEnemiesDefeated] = useState<number>(0)
  const [timeSurvived, setTimeSurvived] = useState<number>(0)
  const [heroName, setHeroName] = useState<string>('')
  const [heroAbilityTag, setHeroAbilityTag] = useState<string>('')
  const [hasSpaceDash, setHasSpaceDash] = useState<boolean>(false)
  const [dashCooldown, setDashCooldown] = useState<number>(0)
  const [activeUpgradeNames, setActiveUpgradeNames] = useState<string[]>([])
  const [shieldActive, setShieldActive] = useState<boolean>(false)
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[]>([])
  const [finalScore, setFinalScore] = useState<number>(0)
  const [isVictory, setIsVictory] = useState<boolean>(false)
  const [isEndlessMode, setIsEndlessMode] = useState<boolean>(false)
  const [finalStats, setFinalStats] = useState({
    survivalSeconds: 0,
    coinsCollected: 0,
    enemiesDefeated: 0
  })

  // Mutable 60 FPS loop refs (eliminates stale closure bugs)
  const gameStateRef = useRef<EngineState>('menu')
  const playerRef = useRef<Player | null>(null)
  const cameraRef = useRef<Camera | null>(null)
  const inputRef = useRef<InputManager | null>(null)
  const enemiesRef = useRef<Enemy[]>([])
  const playerProjectilesRef = useRef<Projectile[]>([])
  const coinsRef = useRef<Coin[]>([])
  const summonsRef = useRef<Summon[]>([])
  const chronoClonesRef = useRef<ChronoClone[]>([])
  const chronoCloneSpawnTimerRef = useRef<number>(0)
  const chronoCloneNextIdRef = useRef<number>(1)
  const dashCooldownRef = useRef<number>(0)
  const dashTimerRef = useRef<number>(0)
  const dashDirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 })
  const lastMoveDirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 })
  const dashAfterimagesRef = useRef<DashAfterimage[]>([])
  const dashHitEnemiesRef = useRef<Set<Enemy>>(new Set())
  const activeBeamsRef = useRef<OrbitalBeamFx[]>([])
  const voidVorticesRef = useRef<VoidVortexFx[]>([])
  const burnZonesRef = useRef<BurnZoneFx[]>([])
  const playerTrailRef = useRef<Array<{ x: number; y: number }>>([])
  const explosionsRef = useRef<ExplosionFx[]>([])
  const attackEffectsRef = useRef<AttackFx[]>([])
  const floatingTextsRef = useRef<FloatingTextFx[]>([])
  const activeUpgradesRef = useRef<UpgradesRow[]>([])
  const upgradeLevelsRef = useRef<Record<string, number>>({})
  const upgradeCooldownsRef = useRef<Record<string, number>>({})
  const cryoDotTimerRef = useRef<number>(0)

  const waveRef = useRef<number>(1)
  const waveElapsedRef = useRef<number>(0)
  const breatherElapsedRef = useRef<number>(0)
  const isBreatherRef = useRef<boolean>(false)
  const endlessModeRef = useRef<boolean>(false)
  const clearedWave15BossRef = useRef<boolean>(false)
  const spawnAccumulatorRef = useRef<number>(0)
  const rangedSpawnedInWaveRef = useRef<number>(0)
  const bossSpawnedWaveRef = useRef<number>(0)
  const bossArenaRef = useRef<BossArenaBounds | null>(null)
  const finalBossSpawnedRef = useRef<boolean>(false)
  const announcedHalfTelegraphIdsRef = useRef<Set<string>>(new Set())

  const timeSurvivedRef = useRef<number>(0)
  const coinsCollectedRef = useRef<number>(0)
  const coinsBankedRef = useRef<number>(0)
  const bonusCoinCarryRef = useRef<number>(0)
  const hpRegenCarryRef = useRef<number>(0)
  const equippedBonusesRef = useRef<ComputedAccessoryBonuses>(computeEquippedAccessoryBonuses([]))
  const equippedWeaponIdRef = useRef<string | null>(null)
  const equippedWeaponStarsRef = useRef<number>(0)
  const enemiesDefeatedRef = useRef<number>(0)
  const xpRef = useRef<number>(0)
  const levelRef = useRef<number>(1)
  const pendingLevelUpsRef = useRef<number>(0)
  const hudSyncTimerRef = useRef<number>(0)

  const waveTookDamageRef = useRef<boolean>(false)
  const currentDamageFreeStreakRef = useRef<number>(0)
  const longestDamageFreeStreakRef = useRef<number>(0)
  const hasSubmittedRunRef = useRef<boolean>(false)

  const isDevUserRef = useRef<boolean>(isDevUser)
  isDevUserRef.current = isDevUser
  const devSettingsRef = useRef(devSettings)
  devSettingsRef.current = devSettings
  const basePlayerMaxHealthRef = useRef<number>(100)

  // Virtual mobile directional pad state
  const touchDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Keep latest callbacks in refs for loop safety
  const playSoundRef = useRef(playSound)
  playSoundRef.current = playSound

  const setEngineState = useCallback((next: EngineState) => {
    gameStateRef.current = next
    setGameState(next)
  }, [])

  const flushBankedCoins = useCallback(() => {
    const unbanked = coinsCollectedRef.current - coinsBankedRef.current
    if (unbanked > 0) {
      creditShopCoins(user?.id || 'guest_user', unbanked)
      coinsBankedRef.current += unbanked
    }
  }, [user?.id])

  const pickLevelUpOptions = useCallback((): UpgradeOption[] => {
    const ownedShopWeapons = activeUpgradesRef.current.filter((u) => u.id.startsWith('wpn_'))
    const starOverrides =
      equippedWeaponIdRef.current && equippedWeaponStarsRef.current > 0
        ? { [equippedWeaponIdRef.current]: equippedWeaponStarsRef.current }
        : undefined
    const candidatePool = [
      ...seedUpgrades,
      ...shopWeaponsAsUpgrades(starOverrides).filter((w) =>
        ownedShopWeapons.some((owned) => owned.id === w.id)
      )
    ]
    const eligible = candidatePool.filter(
      (u) => (upgradeLevelsRef.current[u.id] || 0) < MAX_WEAPON_UPGRADE_LEVEL
    )

    if (eligible.length === 0) {
      return [
        {
          id: 'overclock_surge',
          name: 'Overclock Core Surge',
          category: 'Utility',
          damage: 120,
          cooldown: 0,
          currentLevel: 5,
          nextLevel: 5,
          description: 'All weapons maxed! Restores 50% Max HP and fires a 320px EMP nova.',
          overdriveHint: 'Instant 50% HP recovery & EMP blast'
        }
      ]
    }

    // Bias toward already-owned Lv 1-4 upgrades so players can reliably max them to Lv 5
    const remaining = eligible.map((u) => {
      const curLv = upgradeLevelsRef.current[u.id] || 0
      const weight = curLv > 0 ? 3.2 + curLv * 0.75 : 1.0
      return { upgrade: u, weight, currentLevel: curLv }
    })

    const selected: typeof remaining = []
    const targetCount = Math.min(3, remaining.length)
    while (selected.length < targetCount && remaining.length > 0) {
      const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0)
      let roll = Math.random() * totalWeight
      let pickedIndex = remaining.length - 1
      for (let i = 0; i < remaining.length; i++) {
        roll -= remaining[i].weight
        if (roll <= 0) {
          pickedIndex = i
          break
        }
      }
      selected.push(remaining[pickedIndex])
      remaining.splice(pickedIndex, 1)
    }

    return selected.map(({ upgrade: u, currentLevel }) => {
      const nextLevel = Math.min(MAX_WEAPON_UPGRADE_LEVEL, currentLevel + 1)
      const stats = getUpgradeLevelStats(u.damage, u.cooldown_s, nextLevel)
      return {
        id: u.id,
        name: u.name,
        category: u.category,
        damage: stats.damage,
        cooldown: stats.cooldown_s,
        currentLevel,
        nextLevel,
        description: u.function_desc,
        perkHint:
          nextLevel < MAX_WEAPON_UPGRADE_LEVEL
            ? getUpgradeLevelPerkHint(u.id, nextLevel)
            : undefined,
        overdriveHint:
          nextLevel >= MAX_WEAPON_UPGRADE_LEVEL ? getUpgradeOverdriveHint(u.id) : undefined
      }
    })
  }, [])

  const triggerEndGame = useCallback(
    (victory = false) => {
      if (gameStateRef.current === 'gameover') return

      flushBankedCoins()
      setDevRunStatus({ isInRun: false })
      setIsVictory(victory)
      setEngineState('gameover')
      playSoundRef.current(victory ? 'levelup' : 'gameover')

      const survived = Math.floor(timeSurvivedRef.current)
      const collected = coinsCollectedRef.current
      const defeated = enemiesDefeatedRef.current
      const computedScore = calculateScoreFormula(survived, collected)

      setTimeSurvived(survived)
      setScore(computedScore)
      setFinalScore(computedScore)
      setFinalStats({
        survivalSeconds: survived,
        coinsCollected: collected,
        enemiesDefeated: defeated
      })

      if (!hasSubmittedRunRef.current) {
        hasSubmittedRunRef.current = true
        const heroId = playerRef.current?.hero?.id || selectedHeroId || 'hero_01'
        const profile = getOperativeProfile(user?.id)
        const playerName =
          (user?.user_metadata?.username as string | undefined) ||
          (user?.email ? user.email.split('@')[0] : profile.username)

        submitScore({
          userId: user?.id || null,
          playerName,
          survivalSeconds: survived,
          coinsCollected: collected,
          enemiesDefeated: defeated,
          damageFreeWaveStreak: longestDamageFreeStreakRef.current,
          waveReached: waveRef.current,
          victory,
          heroUsed: heroId,
          coinsAlreadyBanked: true
        })
          .then(({ newlyUnlocked }) => {
            toast.success(
              victory
                ? `VICTORY! Wave 15 Cleared — Area 2 Unlocked! Score: ${computedScore.toLocaleString()}`
                : `Mission logged! Final Score: ${computedScore.toLocaleString()}`
            )
            for (const ach of newlyUnlocked) {
              toast.info(`Achievement Unlocked: ${ach.achievement.title} (${ach.achievement.reward_badge})`)
            }
          })
          .catch(() => {
            // Persisted locally by default
          })
      }
    },
    [flushBankedCoins, selectedHeroId, setEngineState, toast, user]
  )

  const syncSummonsForUpgrade = useCallback(
    (upgrade: UpgradesRow, player: Player | null, level = 1) => {
      if (!player) return
      const pc = player.getCenter()
      const heroId = player.hero?.id || selectedHeroId || 'hero_01'
      const isEngineer = heroId === 'hero_03'
      const dmgMult = equippedBonusesRef.current.damageMultiplier
      const rateMult =
        equippedBonusesRef.current.cooldownRateMultiplier *
        (isEngineer ? HERO_ABILITY_CONSTANTS.ENGINEER_SUMMON_FIRE_RATE_BONUS : 1)
      const scaledDmg = Math.max(1, Math.round(upgrade.damage * dmgMult))

      if (upgrade.id === 'upg_01') {
        const desiredBots = getSummonCountForUpgrade(upgrade.id, level, heroId)
        let current = summonsRef.current.filter((s) => s.kind === 'companion_robot')
        while (current.length < desiredBots) {
          const offsetAngle = (current.length / desiredBots) * Math.PI * 2
          summonsRef.current.push(
            new Summon({
              kind: 'companion_robot',
              upgradeId: upgrade.id,
              x: pc.x + Math.cos(offsetAngle) * 62,
              y: pc.y + Math.sin(offsetAngle) * 62,
              damage: scaledDmg,
              cooldown: (upgrade.cooldown_s || 0.8) / rateMult,
              level
            })
          )
          current = summonsRef.current.filter((s) => s.kind === 'companion_robot')
        }
        current.forEach((bot, idx) => {
          bot.slotIndex = idx
          bot.totalSlots = current.length
          bot.damage = scaledDmg
          bot.cooldown = Math.max(0.18, (upgrade.cooldown_s || 0.8) / rateMult)
          bot.level = level
        })
      } else if (upgrade.id === 'upg_14') {
        const desiredEchoes = getSummonCountForUpgrade(upgrade.id, level, heroId)
        let current = summonsRef.current.filter((s) => s.kind === 'temporal_echo')
        while (current.length < desiredEchoes) {
          summonsRef.current.push(
            new Summon({
              kind: 'temporal_echo',
              upgradeId: upgrade.id,
              x: pc.x - 42,
              y: pc.y,
              damage: scaledDmg,
              cooldown: (upgrade.cooldown_s || 2.0) / rateMult,
              level
            })
          )
          current = summonsRef.current.filter((s) => s.kind === 'temporal_echo')
        }
        current.forEach((echo, idx) => {
          echo.slotIndex = idx
          echo.totalSlots = current.length
          echo.damage = scaledDmg
          echo.cooldown = Math.max(0.28, (upgrade.cooldown_s || 2.0) / rateMult)
          echo.level = level
        })
      } else if (upgrade.id === 'upg_20') {
        const desiredTurrets = getSummonCountForUpgrade(upgrade.id, level, heroId)
        let current = summonsRef.current.filter((s) => s.kind === 'sentinel_turret')
        while (current.length < desiredTurrets) {
          const offsetAngle = current.length * Math.PI + 0.65
          summonsRef.current.push(
            new Summon({
              kind: 'sentinel_turret',
              upgradeId: upgrade.id,
              x: pc.x + Math.cos(offsetAngle) * 85,
              y: pc.y + Math.sin(offsetAngle) * 85,
              damage: scaledDmg,
              cooldown: (upgrade.cooldown_s || 0.65) / rateMult,
              level
            })
          )
          current = summonsRef.current.filter((s) => s.kind === 'sentinel_turret')
        }
        current.forEach((turret, idx) => {
          turret.slotIndex = idx
          turret.totalSlots = current.length
          turret.damage = scaledDmg
          turret.cooldown = Math.max(0.18, (upgrade.cooldown_s || 0.65) / rateMult)
          turret.level = level
        })
      }
    },
    [selectedHeroId]
  )

  const spawnEnemyForWave = useCallback(
    (waveNumber: number, forceBoss = false, allowRanged = true) => {
      const player = playerRef.current
      if (!player) return

      const isWave15Boss =
        forceBoss && waveNumber === WAVE_CONFIG.MAX_WAVE && !endlessModeRef.current
      const bossArena = bossArenaRef.current
      const playerCenter = player.getCenter()

      let spawnX: number
      let spawnY: number
      if (isWave15Boss && bossArena) {
        spawnX = bossArena.left + bossArena.width / 2 - 46
        spawnY = bossArena.top + 195 - 46
      } else {
        const angle = Math.random() * Math.PI * 2
        const distance = forceBoss ? 320 : 260 + Math.random() * 200
        spawnX = Math.max(40, Math.min(ARENA_SIZE - 80, playerCenter.x + Math.cos(angle) * distance))
        spawnY = Math.max(40, Math.min(ARENA_SIZE - 80, playerCenter.y + Math.sin(angle) * distance))
      }

      const isAreaTwo = areaRef.current.id === 'astral_citadel'
      let template = isAreaTwo ? AREA_TWO_ENEMIES[0] : seedEnemies[0]
      if (forceBoss) {
        template = getAreaBossTemplateForWave(areaRef.current.id, waveNumber)
      } else {
        const rangedLimit = getWaveRangedSpawnLimit(waveNumber)
        const underRangedCap = allowRanged && rangedSpawnedInWaveRef.current < rangedLimit
        const waveProgress = Math.min(1, waveElapsedRef.current / WAVE_CONFIG.WAVE_DURATION_SECONDS)
        const expectedRangedSoFar = Math.floor(waveProgress * rangedLimit)

        if (isAreaTwo) {
          const activeMiniBossCount = enemiesRef.current.filter(
            (e) => e.isAlive && e.isMiniBoss && !e.isBoss
          ).length
          const miniBossCap = getAreaMiniBossCap(waveNumber)
          const needsGuaranteedMiniBoss =
            allowRanged && waveNumber >= 3 && waveElapsedRef.current >= 7 && activeMiniBossCount === 0

          if (needsGuaranteedMiniBoss && miniBossCap > 0) {
            template = AREA_TWO_ENEMIES[4]
          } else if (underRangedCap && rangedSpawnedInWaveRef.current < expectedRangedSoFar) {
            template = Math.random() < 0.5 ? AREA_TWO_ENEMIES[2] : AREA_TWO_ENEMIES[3]
            rangedSpawnedInWaveRef.current += 1
          } else {
            const canRollRanged =
              underRangedCap && rangedSpawnedInWaveRef.current <= expectedRangedSoFar + 1
            const pick = selectAreaEnemyTemplateForWave('astral_citadel', waveNumber, {
              roll: Math.random(),
              subRoll: Math.random(),
              canSpawnRanged: canRollRanged,
              canSpawnMiniBoss: allowRanged && activeMiniBossCount < miniBossCap
            })
            template = pick.template
            if (pick.isRanged) {
              rangedSpawnedInWaveRef.current += 1
            }
          }
        } else {
          let idx: 0 | 1 | 2
          if (underRangedCap && rangedSpawnedInWaveRef.current < expectedRangedSoFar) {
            idx = 2
          } else {
            const canRollRanged =
              underRangedCap && rangedSpawnedInWaveRef.current <= expectedRangedSoFar + 1
            idx = selectEnemyTypeIndexForWave(waveNumber, Math.random(), canRollRanged)
          }

          if (idx === 2) {
            rangedSpawnedInWaveRef.current += 1
          }
          template = seedEnemies[idx] || seedEnemies[0]
        }
      }

      const anchorPos =
        isWave15Boss && bossArena
          ? { x: bossArena.left + bossArena.width / 2, y: bossArena.top + 195 }
          : null

      const enemy = new Enemy({
        x: spawnX,
        y: spawnY,
        enemyData: template,
        target: player,
        isBoss: forceBoss,
        isStationaryBoss: isWave15Boss,
        isFinalBoss: isWave15Boss,
        anchorPos,
        arenaBounds: isWave15Boss ? bossArena : null
      })

      // Overtime, wave, & area progression scaling
      const scaling = getEnemyScaling(waveNumber, timeSurvivedRef.current)
      const areaMeta = areaRef.current
      if (isWave15Boss) {
        const w15Hp = getWave15FinalBossHp(areaMeta.id)
        enemy.maxHealth = w15Hp
        enemy.health = w15Hp
        enemy.damage = Math.round(
          32 * Math.min(2.5, scaling.damageMultiplier * 0.7) * areaMeta.enemyHpMultiplier
        )
        enemy.powerScale = w15Hp / 2300
        enemy.damageScale = Math.min(2.4, scaling.damageMultiplier * 0.6)
        enemy.coinValue = Math.round(250 * areaMeta.coinBonusMultiplier)
        enemy.bossTier = 3
        enemy.bossTitle =
          areaMeta.id === 'astral_citadel'
            ? 'SOLAR ARCHON SERAPH — FINAL BOSS (W15)'
            : 'OMEGA OVERLORD — FINAL BOSS (W15)'
      } else {
        enemy.maxHealth = Math.round(enemy.maxHealth * scaling.hpMultiplier * areaMeta.enemyHpMultiplier)
        enemy.health = enemy.maxHealth
        enemy.baseSpeed *= scaling.speedMultiplier * areaMeta.enemySpeedMultiplier
        enemy.speed = enemy.baseSpeed
        enemy.damage = Math.round(enemy.damage * scaling.damageMultiplier)
        enemy.coinValue = Math.max(1, Math.round(enemy.coinValue * areaMeta.coinBonusMultiplier))
        enemy.powerScale = scaling.hpMultiplier
        enemy.damageScale = scaling.damageMultiplier

        if (forceBoss) {
          const tier = Math.max(1, Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL))
          enemy.bossTier = tier
          enemy.bossTitle = isAreaTwo
            ? template.id === 'boss_a2_10'
              ? `ASTRAL VORTEX COLOSSUS (W${waveNumber})`
              : `EMERALD PRISM MONARCH (W${waveNumber})`
            : tier >= 3
              ? `APEX LEVIATHAN (W${waveNumber})`
              : tier === 2
                ? `OMEGA DREADNOUGHT (W${waveNumber})`
                : `AEGIS COMMANDER (W${waveNumber})`
        }
      }

      enemiesRef.current.push(enemy)
    },
    []
  )

  const initRun = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    flushBankedCoins()

    const effectiveUserId = user?.id || 'guest_user'
    const shopState = getShopAccountState(effectiveUserId)
    const bonuses = computeEquippedAccessoryBonuses(
      shopState.equippedAccessoryIds,
      shopState.equippedAccessoryStars
    )
    equippedBonusesRef.current = bonuses

    const chosenWeaponId =
      startingUpgradeId && startingUpgradeId.startsWith('wpn_')
        ? startingUpgradeId
        : shopState.equippedWeaponId
    const chosenWeaponStars =
      chosenWeaponId && shopState.equippedWeaponId === chosenWeaponId
        ? shopState.equippedWeaponStars || 0
        : chosenWeaponId
          ? shopState.gearStacks?.[chosenWeaponId]?.reduceRight((best, cnt, s) => (best >= 0 ? best : cnt > 0 ? s : -1), -1) ?? 0
          : 0
    equippedWeaponIdRef.current = chosenWeaponId || null
    equippedWeaponStarsRef.current = Math.max(0, chosenWeaponStars)

    const starOverrides =
      equippedWeaponIdRef.current && equippedWeaponStarsRef.current > 0
        ? { [equippedWeaponIdRef.current]: equippedWeaponStarsRef.current }
        : undefined

    const allKnownUpgrades = [...seedUpgrades, ...shopWeaponsAsUpgrades(starOverrides)]
    const hero = heroes.find((h) => h.id === selectedHeroId) || heroes[0]
    const chosenStartId =
      startingUpgradeId && startingUpgradeId.startsWith('wpn_')
        ? startingUpgradeId
        : shopState.equippedWeaponId || startingUpgradeId || hero.starting_upgrade_id
    const initialUpgrade =
      allKnownUpgrades.find((u) => u.id === chosenStartId) || seedUpgrades[0]

    const newPlayer = new Player({
      x: ARENA_SIZE / 2 - 20,
      y: ARENA_SIZE / 2 - 20,
      hero
    })
    if (bonuses.bonusHp > 0) {
      newPlayer.maxHealth += bonuses.bonusHp
      newPlayer.health = newPlayer.maxHealth
    }
    basePlayerMaxHealthRef.current = newPlayer.maxHealth
    if (isDevUserRef.current && devSettingsRef.current.healthMultiplier > 1) {
      newPlayer.maxHealth = Math.round(
        basePlayerMaxHealthRef.current * devSettingsRef.current.healthMultiplier
      )
      newPlayer.health = newPlayer.maxHealth
    }
    newPlayer.speed *= bonuses.speedMultiplier

    const rect = containerRef.current?.getBoundingClientRect()
    canvas.width = Math.max(320, Math.floor(rect?.width || window.innerWidth))
    canvas.height = Math.max(420, Math.floor(rect?.height || Math.min(680, window.innerHeight - 180)))

    const cam = new Camera({
      width: canvas.width,
      height: canvas.height,
      zoom: 1,
      lerpFactor: 0.14
    })
    cam.x = newPlayer.x - canvas.width / 2
    cam.y = newPlayer.y - canvas.height / 2

    if (!inputRef.current) {
      inputRef.current = new InputManager()
    } else {
      inputRef.current.reset()
    }

    playerRef.current = newPlayer
    cameraRef.current = cam
    enemiesRef.current = []
    playerProjectilesRef.current = []
    coinsRef.current = []
    summonsRef.current = []
    chronoClonesRef.current = []
    chronoCloneSpawnTimerRef.current =
      HERO_ABILITY_CONSTANTS.CHRONO_CLONE_SPAWN_INTERVAL -
      HERO_ABILITY_CONSTANTS.CHRONO_CLONE_FIRST_SPAWN_DELAY
    chronoCloneNextIdRef.current = 1
    dashCooldownRef.current = 0
    dashTimerRef.current = 0
    dashDirRef.current = { x: 1, y: 0 }
    lastMoveDirRef.current = { x: 1, y: 0 }
    dashAfterimagesRef.current = []
    dashHitEnemiesRef.current.clear()
    activeBeamsRef.current = []
    voidVorticesRef.current = []
    burnZonesRef.current = []
    playerTrailRef.current = [newPlayer.getCenter()]
    explosionsRef.current = []
    attackEffectsRef.current = []
    floatingTextsRef.current = []
    cryoDotTimerRef.current = 0

    const startStats = getUpgradeLevelStats(initialUpgrade.damage, initialUpgrade.cooldown_s, 1)
    const clonedStartUpgrade: UpgradesRow = {
      ...initialUpgrade,
      damage: startStats.damage,
      cooldown_s: startStats.cooldown_s
    }
    activeUpgradesRef.current = [clonedStartUpgrade]
    upgradeLevelsRef.current = { [clonedStartUpgrade.id]: 1 }
    upgradeCooldownsRef.current = { [clonedStartUpgrade.id]: 0.1 }
    syncSummonsForUpgrade(clonedStartUpgrade, newPlayer, 1)

    waveRef.current = 1
    waveElapsedRef.current = 0
    breatherElapsedRef.current = 0
    isBreatherRef.current = false
    endlessModeRef.current = false
    clearedWave15BossRef.current = false
    setIsEndlessMode(false)
    spawnAccumulatorRef.current = 0
    rangedSpawnedInWaveRef.current = 0
    bossSpawnedWaveRef.current = 0
    bossArenaRef.current = null
    finalBossSpawnedRef.current = false
    announcedHalfTelegraphIdsRef.current.clear()
    setIsVictory(false)

    timeSurvivedRef.current = 0
    coinsCollectedRef.current = 0
    coinsBankedRef.current = 0
    bonusCoinCarryRef.current = 0
    hpRegenCarryRef.current = 0
    enemiesDefeatedRef.current = 0
    xpRef.current = 0
    levelRef.current = 1
    pendingLevelUpsRef.current = 0
    hudSyncTimerRef.current = 0

    waveTookDamageRef.current = false
    currentDamageFreeStreakRef.current = 0
    longestDamageFreeStreakRef.current = 0
    hasSubmittedRunRef.current = false

    const abilitySpec = getHeroAbility(hero.id)
    setHeroName(loadoutName ? `${hero.name} (${loadoutName})` : hero.name)
    setHeroAbilityTag(abilitySpec.shortTag)
    setHasSpaceDash(hero.id === 'hero_05')
    setDashCooldown(0)
    setHealth(newPlayer.health)
    setMaxHealth(newPlayer.maxHealth)
    setWave(1)
    setWaveTimeRemaining(WAVE_CONFIG.WAVE_DURATION_SECONDS)
    setIsBreather(false)
    setScore(0)
    setCoins(0)
    setXP(0)
    setLevel(1)
    setEnemiesDefeated(0)
    setTimeSurvived(0)
    setActiveUpgradeNames([`${clonedStartUpgrade.name} Lv.1`])
    setShieldActive(
      clonedStartUpgrade.id === 'upg_11' || clonedStartUpgrade.id === 'upg_15'
    )

    const warpToWaveInternal = (targetWave: number) => {
      const safeWave = Math.max(1, Math.floor(targetWave))
      const isW15 = safeWave === WAVE_CONFIG.MAX_WAVE
      const isEndless = safeWave > WAVE_CONFIG.MAX_WAVE

      enemiesRef.current = []
      playerProjectilesRef.current = []
      waveRef.current = safeWave
      waveElapsedRef.current = 0
      breatherElapsedRef.current = 0
      isBreatherRef.current = false
      endlessModeRef.current = isEndless
      setIsEndlessMode(isEndless)
      rangedSpawnedInWaveRef.current = 0
      spawnAccumulatorRef.current = 0
      waveTookDamageRef.current = false
      setWave(safeWave)
      setIsBreather(false)
      setWaveTimeRemaining(WAVE_CONFIG.WAVE_DURATION_SECONDS)
      setDevRunStatus({ isInRun: true, currentWave: safeWave, areaId: areaRef.current.id })

      if (isW15) {
        const aw = canvas.width
        const ah = canvas.height
        const pcNow = newPlayer.getCenter()
        const left = Math.max(24, Math.min(ARENA_SIZE - aw - 24, pcNow.x - aw / 2))
        const top = Math.max(24, Math.min(ARENA_SIZE - ah - 24, pcNow.y - ah / 2))
        bossArenaRef.current = { left, top, width: aw, height: ah }
        const bossAnchorX = left + aw / 2
        const bossAnchorY = top + 195
        if (Math.hypot(pcNow.x - bossAnchorX, pcNow.y - bossAnchorY) < 130) {
          newPlayer.y = Math.min(top + ah - newPlayer.height - 40, top + 360)
        }
        finalBossSpawnedRef.current = true
        bossSpawnedWaveRef.current = WAVE_CONFIG.MAX_WAVE
        spawnEnemyForWave(WAVE_CONFIG.MAX_WAVE, true)
      } else {
        bossArenaRef.current = null
        finalBossSpawnedRef.current = false
        bossSpawnedWaveRef.current = safeWave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0 ? safeWave : 0
        const burst = getWaveSpawnConfig(safeWave, timeSurvivedRef.current).waveBurst
        for (let i = 0; i < burst; i++) {
          spawnEnemyForWave(safeWave, false, false)
        }
        if (safeWave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0) {
          spawnEnemyForWave(safeWave, true)
        }
      }
    }

    // Initial wave swarm (supports Dev startingWaveOverride)
    const startWave =
      isDevUserRef.current && devSettingsRef.current.startingWaveOverride > 1
        ? devSettingsRef.current.startingWaveOverride
        : 1
    if (startWave > 1) {
      warpToWaveInternal(startWave)
    } else {
      const initialBurst = getWaveSpawnConfig(1, 0).waveBurst
      for (let i = 0; i < initialBurst; i++) {
        spawnEnemyForWave(1, false, false)
      }
      setDevRunStatus({ isInRun: true, currentWave: 1, areaId: areaRef.current.id })
    }

    setEngineState('playing')
    playSoundRef.current('wave')
  }, [
    flushBankedCoins,
    loadoutName,
    selectedHeroId,
    setEngineState,
    spawnEnemyForWave,
    startingUpgradeId,
    syncSummonsForUpgrade,
    user?.id
  ])

  // Flush any earned battle coins and clear live Dev run state when leaving the arena
  useEffect(() => {
    return () => {
      flushBankedCoins()
      setDevRunStatus({ isInRun: false })
    }
  }, [flushBankedCoins])

  // Subscribe to authorized Dev Panel live actions (Coins, Health, Wave Skips)
  useEffect(() => {
    return subscribeDevActions((action) => {
      if (!isDevUserRef.current) return
      const player = playerRef.current

      if (action.type === 'grant_coins') {
        coinsCollectedRef.current += action.amount
        coinsBankedRef.current += action.amount
        setCoins(coinsCollectedRef.current)
        return
      }

      if (!player) return

      if (action.type === 'heal_full') {
        player.heal(player.maxHealth)
        setHealth(player.health)
      } else if (action.type === 'set_health') {
        const targetHp = Math.max(1, Math.round(action.amount))
        player.maxHealth = Math.max(player.maxHealth, targetHp)
        player.health = targetHp
        setMaxHealth(player.maxHealth)
        setHealth(player.health)
      } else if (action.type === 'add_max_health') {
        const bonus = Math.max(1, Math.round(action.amount))
        basePlayerMaxHealthRef.current += bonus
        player.maxHealth += bonus
        player.heal(bonus)
        setMaxHealth(player.maxHealth)
        setHealth(player.health)
      } else if (action.type === 'apply_health_multiplier') {
        const nextMax = Math.max(1, Math.round(basePlayerMaxHealthRef.current * action.multiplier))
        const ratio = player.maxHealth > 0 ? player.health / player.maxHealth : 1
        player.maxHealth = nextMax
        player.health = Math.max(1, Math.min(nextMax, Math.round(nextMax * ratio)))
        setMaxHealth(player.maxHealth)
        setHealth(player.health)
      } else if (action.type === 'skip_wave') {
        const canvas = canvasRef.current
        const targetWave =
          action.mode === 'delta'
            ? Math.max(1, waveRef.current + Math.round(action.value))
            : Math.max(1, Math.round(action.value))
        const isW15 = targetWave === WAVE_CONFIG.MAX_WAVE
        const isEndless = targetWave > WAVE_CONFIG.MAX_WAVE

        enemiesRef.current = []
        playerProjectilesRef.current = []
        waveRef.current = targetWave
        waveElapsedRef.current = 0
        breatherElapsedRef.current = 0
        isBreatherRef.current = false
        endlessModeRef.current = isEndless
        setIsEndlessMode(isEndless)
        rangedSpawnedInWaveRef.current = 0
        spawnAccumulatorRef.current = 0
        waveTookDamageRef.current = false
        setWave(targetWave)
        setIsBreather(false)
        setWaveTimeRemaining(WAVE_CONFIG.WAVE_DURATION_SECONDS)
        setDevRunStatus({ isInRun: true, currentWave: targetWave, areaId: areaRef.current.id })

        if (isW15 && canvas) {
          const aw = canvas.width
          const ah = canvas.height
          const pcNow = player.getCenter()
          const left = Math.max(24, Math.min(ARENA_SIZE - aw - 24, pcNow.x - aw / 2))
          const top = Math.max(24, Math.min(ARENA_SIZE - ah - 24, pcNow.y - ah / 2))
          bossArenaRef.current = { left, top, width: aw, height: ah }
          const bossAnchorX = left + aw / 2
          const bossAnchorY = top + 195
          if (Math.hypot(pcNow.x - bossAnchorX, pcNow.y - bossAnchorY) < 130) {
            player.y = Math.min(top + ah - player.height - 40, top + 360)
          }
          finalBossSpawnedRef.current = true
          bossSpawnedWaveRef.current = WAVE_CONFIG.MAX_WAVE
          spawnEnemyForWave(WAVE_CONFIG.MAX_WAVE, true)
        } else {
          bossArenaRef.current = null
          finalBossSpawnedRef.current = false
          bossSpawnedWaveRef.current = targetWave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0 ? targetWave : 0
          const burst = getWaveSpawnConfig(targetWave, timeSurvivedRef.current).waveBurst
          for (let i = 0; i < burst; i++) {
            spawnEnemyForWave(targetWave, false, false)
          }
          if (targetWave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0) {
            spawnEnemyForWave(targetWave, true)
          }
        }
        playSoundRef.current('wave')
      }
    })
  }, [spawnEnemyForWave])

  // Auto-start when mounted inside PlayView
  useEffect(() => {
    if (autoStart) {
      const id = requestAnimationFrame(() => initRun())
      return () => cancelAnimationFrame(id)
    }
  }, [autoStart, initRun])

  // Resize observer
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const w = Math.max(320, Math.floor(rect.width))
      const h = Math.max(420, Math.floor(rect.height))
      canvasRef.current.width = w
      canvasRef.current.height = h
      if (cameraRef.current) {
        cameraRef.current = new Camera({
          width: w,
          height: h,
          zoom: 1,
          lerpFactor: 0.14
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const triggerPaladinDash = useCallback(() => {
    const player = playerRef.current
    if (!player || !player.isAlive || gameStateRef.current !== 'playing') return
    if (player.hero?.id !== 'hero_05') return
    if (dashCooldownRef.current > 0 || dashTimerRef.current > 0) return

    const kbMove = inputRef.current?.getMovementVector() || { x: 0, y: 0 }
    const touchMove = touchDirRef.current
    let dx = kbMove.x + touchMove.x
    let dy = kbMove.y + touchMove.y
    let mag = Math.hypot(dx, dy)
    if (mag <= 0.05) {
      dx = lastMoveDirRef.current.x
      dy = lastMoveDirRef.current.y
      mag = Math.hypot(dx, dy)
    }
    if (mag <= 0.05) {
      dx = Math.cos(player.facingAngle)
      dy = Math.sin(player.facingAngle)
      mag = Math.hypot(dx, dy) || 1
    }
    const dir = { x: dx / mag, y: dy / mag }
    dashDirRef.current = dir
    dashTimerRef.current = HERO_ABILITY_CONSTANTS.PALADIN_DASH_DURATION
    dashCooldownRef.current = HERO_ABILITY_CONSTANTS.PALADIN_DASH_COOLDOWN
    dashHitEnemiesRef.current.clear()

    player.facingAngle = Math.atan2(dir.y, dir.x)
    player.isInvulnerable = true
    player.invulnerabilityTimer = Math.max(
      player.invulnerabilityTimer,
      HERO_ABILITY_CONSTANTS.PALADIN_DASH_IFRAMES
    )
    setDashCooldown(HERO_ABILITY_CONSTANTS.PALADIN_DASH_COOLDOWN)

    const pc = player.getCenter()
    explosionsRef.current.push({
      x: pc.x,
      y: pc.y,
      radius: 78,
      timer: 0,
      duration: 0.28,
      color: 'rgba(250, 204, 21, 0.55)'
    })
    floatingTextsRef.current.push({
      x: pc.x,
      y: player.y - 14,
      text: 'AEGIS DASH!',
      color: '#FACC15',
      timer: 0.75
    })
    playSoundRef.current('wave')
  }, [])

  // Pause (Escape/P) & Shield Paladin Spacebar Dash shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (gameStateRef.current === 'playing' && playerRef.current?.hero?.id === 'hero_05') {
          e.preventDefault()
          triggerPaladinDash()
          return
        }
      }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameStateRef.current === 'playing') {
          setEngineState('paused')
        } else if (gameStateRef.current === 'paused') {
          setEngineState('playing')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (inputRef.current) {
        inputRef.current.destroy()
        inputRef.current = null
      }
    }
  }, [setEngineState, triggerPaladinDash])

  // Main 60 FPS RequestAnimationFrame Simulation & Canvas Renderer
  useEffect(() => {
    let rafId = 0
    let lastTime = 0

    const damageEnemy = (
      enemy: Enemy,
      amount: number,
      knockbackFrom?: { x: number; y: number },
      options?: { isBurnTick?: boolean; color?: string }
    ) => {
      if (!enemy.isAlive) return
      const devMult = isDevUserRef.current ? devSettingsRef.current.damageMultiplier : 1
      const finalDamage = Math.max(1, Math.round(amount * devMult))
      const wasKilled = enemy.takeDamage(finalDamage)
      playSoundRef.current('hit')

      floatingTextsRef.current.push({
        x: enemy.getCenter().x,
        y: enemy.y - 6,
        text: `${Math.round(finalDamage)}`,
        color: options?.color || (devMult > 1 ? '#FACC15' : '#FFFFFF'),
        timer: 0.45
      })

      // Pyrotechnic Specialist: every weapon hit ignites the enemy for scorching burn damage
      if (
        !options?.isBurnTick &&
        !wasKilled &&
        !enemy.isSpawning &&
        playerRef.current?.hero?.id === 'hero_06'
      ) {
        enemy.applyBurn(
          computeHeroBurnPerTick(finalDamage),
          HERO_ABILITY_CONSTANTS.PYRO_BURN_DURATION
        )
      }

      if (knockbackFrom && !enemy.isStationaryBoss) {
        const ec = enemy.getCenter()
        const dx = ec.x - knockbackFrom.x
        const dy = ec.y - knockbackFrom.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        enemy.x += (dx / len) * 18
        enemy.y += (dy / len) * 18
      }

      if (wasKilled) {
        enemiesDefeatedRef.current += 1
        const baseXpGain = enemy.isBoss ? LEVEL_UP_CONFIG.XP_PER_BOSS_KILL : LEVEL_UP_CONFIG.XP_PER_ENEMY_KILL
        const xpGain = Math.max(1, Math.round(baseXpGain * equippedBonusesRef.current.xpMultiplier))
        xpRef.current += xpGain

        // Spawn dropped coin(s)
        const coinCenter = enemy.getCenter()
        if (enemy.isBoss) {
          coinsRef.current.push(
            new Coin({ x: coinCenter.x, y: coinCenter.y, value: enemy.coinValue, type: 'Platinum' })
          )
        } else {
          coinsRef.current.push(
            new Coin({ x: coinCenter.x, y: coinCenter.y, value: enemy.coinValue })
          )
        }

        // Victory trigger upon defeating the Wave 15 Final Boss!
        if (enemy.isFinalBoss) {
          coinsCollectedRef.current += enemy.coinValue
          setCoins(coinsCollectedRef.current)
          explosionsRef.current.push({
            x: coinCenter.x,
            y: coinCenter.y,
            radius: 240,
            timer: 0,
            duration: 0.65,
            color: 'rgba(250, 204, 21, 0.7)'
          })
          clearedWave15BossRef.current = true
          if (areaRef.current.id === 'astral_citadel') {
            playSoundRef.current('levelup')
            setEngineState('victory_choice')
          } else {
            triggerEndGame(true)
          }
          return
        }

        // Endless leveling: subtract threshold per level so player can never get stuck at level 10
        let leveled = false
        while (xpRef.current >= getXpForNextLevel(levelRef.current)) {
          xpRef.current -= getXpForNextLevel(levelRef.current)
          levelRef.current += 1
          pendingLevelUpsRef.current += 1
          leveled = true
        }
        if (leveled) {
          setLevel(levelRef.current)
          setXP(xpRef.current)
          setLevelUpOptions(pickLevelUpOptions())
          playSoundRef.current('levelup')
          setEngineState('levelup')
        }
      }
    }

    const damagePlayer = (amount: number, knockbackOrigin?: { x: number; y: number }): boolean => {
      const player = playerRef.current
      if (!player || !player.isAlive || player.isInvulnerable) return false
      if (isDevUserRef.current && devSettingsRef.current.godMode) return false

      // Check Defensive Matrix / Plasma Barrier cooldown
      const shieldReady = activeUpgradesRef.current.some(
        (u) => (u.id === 'upg_11' || u.id === 'upg_15') && (upgradeCooldownsRef.current[u.id] || 0) <= 0
      )

      if (shieldReady) {
        const shieldUpg = activeUpgradesRef.current.find(
          (u) => (u.id === 'upg_11' || u.id === 'upg_15') && (upgradeCooldownsRef.current[u.id] || 0) <= 0
        )
        if (shieldUpg) {
          const shieldLv = upgradeLevelsRef.current[shieldUpg.id] || 1
          const isLv5 = shieldLv >= MAX_WEAPON_UPGRADE_LEVEL
          const blastRadius = 95 + shieldLv * 30
          upgradeCooldownsRef.current[shieldUpg.id] = shieldUpg.cooldown_s || (isLv5 ? 4.5 : 8)
          player.isInvulnerable = true
          player.invulnerabilityTimer = 0.45 + shieldLv * 0.12
          setShieldActive(false)
          explosionsRef.current.push({
            x: player.getCenter().x,
            y: player.getCenter().y,
            radius: blastRadius,
            timer: 0,
            duration: 0.38,
            color: isLv5 ? 'rgba(255, 215, 0, 0.55)' : 'rgba(0, 240, 255, 0.5)'
          })
          // Knockback nearby foes (+ scaling shockwave damage from Lv 2+)
          const pc = player.getCenter()
          for (const enemy of enemiesRef.current) {
            if (!enemy.isAlive) continue
            const ec = enemy.getCenter()
            const dist = Math.hypot(ec.x - pc.x, ec.y - pc.y)
            if (dist < blastRadius && dist > 0) {
              const pushDist = 65 + shieldLv * 14
              enemy.x += ((ec.x - pc.x) / dist) * pushDist
              enemy.y += ((ec.y - pc.y) / dist) * pushDist
              if (shieldLv >= 2) {
                damageEnemy(enemy, shieldLv * 15, pc)
              }
            }
          }
          return true
        }
      }

      const heroDr = getHeroDamageReduction(player.hero?.id || 'hero_01')
      const dmgReduction = Math.min(0.85, equippedBonusesRef.current.damageReduction + heroDr)
      const finalIncomingDmg = Math.max(1, Math.round(amount * (1 - dmgReduction)))
      const killed = player.takeDamage(finalIncomingDmg)
      waveTookDamageRef.current = true
      currentDamageFreeStreakRef.current = 0
      setHealth(player.health)
      playSoundRef.current('hit')

      if (knockbackOrigin) {
        const pc = player.getCenter()
        const dx = pc.x - knockbackOrigin.x
        const dy = pc.y - knockbackOrigin.y
        const len = Math.hypot(dx, dy) || 1
        const ba = bossArenaRef.current
        const minX = ba ? ba.left + 16 : 0
        const maxX = ba ? ba.left + ba.width - player.width - 16 : ARENA_SIZE - player.width
        const minY = ba ? ba.top + 16 : 0
        const maxY = ba ? ba.top + ba.height - player.height - 16 : ARENA_SIZE - player.height
        player.x = Math.max(minX, Math.min(maxX, player.x + (dx / len) * 20))
        player.y = Math.max(minY, Math.min(maxY, player.y + (dy / len) * 20))
      }

      if (killed) {
        triggerEndGame(clearedWave15BossRef.current)
      }
      return true
    }

    const executeWeaponFire = (
      upg: UpgradesRow,
      player: Player,
      originCenter: { x: number; y: number },
      damageScale = 1,
      isCloneCast = false,
      cloneId?: number
    ) => {
      const pc = originCenter
      const aliveEnemies = enemiesRef.current.filter((e) => e.isAlive)
      const lv = upgradeLevelsRef.current[upg.id] || 1
      const isLv5 = lv >= MAX_WEAPON_UPGRADE_LEVEL
      const scaledBaseDmg = Math.max(1, Math.round(upg.damage * damageScale))
      const weaponDmg = Math.max(
        1,
        Math.round(scaledBaseDmg * equippedBonusesRef.current.damageMultiplier)
      )

      // Nearest target within 620px
      let nearest: Enemy | null = null
      let nearestDist = 620
      for (const e of aliveEnemies) {
        const ec = e.getCenter()
        const d = Math.hypot(ec.x - pc.x, ec.y - pc.y)
        if (d < nearestDist) {
          nearestDist = d
          nearest = e
        }
      }

      switch (upg.id) {
        case 'wpn_rusty_pistol': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const count = isLv5 ? 3 : lv >= 3 ? 2 : 1
          const span = (count - 1) * 0.2
          for (let i = 0; i < count; i++) {
            const off = count === 1 ? 0 : -span / 2 + (i / (count - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 8,
                height: 8,
                speed: 300 + lv * 18,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: '#9CA3AF',
                maxLifetime: 0.9,
                maxPierces: isLv5 ? 1 : 0,
                type: 'Basic'
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_misfire_coil': {
          if (!nearest) return
          const range = 135 + lv * 22
          const maxTargets = lv
          const targets = [...aliveEnemies]
            .map((e) => ({
              enemy: e,
              dist: Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y)
            }))
            .filter((item) => item.dist <= range)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, maxTargets)
          if (targets.length === 0) return
          const points: Array<{ x: number; y: number }> = [pc]
          for (const t of targets) {
            points.push(t.enemy.getCenter())
            damageEnemy(t.enemy, weaponDmg, pc)
          }
          attackEffectsRef.current.push({
            kind: 'lightning',
            points,
            color: '#F87171',
            timer: 0,
            duration: 0.18
          })
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_bent_launcher': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const count = isLv5 ? 3 : lv >= 3 ? 2 : 1
          const span = (count - 1) * 0.28
          for (let i = 0; i < count; i++) {
            const off = count === 1 ? 0 : -span / 2 + (i / (count - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 11,
                height: 11,
                speed: 280 + lv * 18,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: '#F87171',
                type: 'Rocket',
                explosionRadius: 32 + lv * 8
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_pulse_carbine': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const count = Math.min(5, 1 + lv)
          const span = (count - 1) * 0.1
          for (let i = 0; i < count; i++) {
            const off = count === 1 ? 0 : -span / 2 + (i / (count - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 10,
                height: 8,
                speed: 480 + lv * 22,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: '#E2E8F0',
                type: isLv5 ? 'Laser' : 'Basic',
                maxPierces: isLv5 ? 2 : lv >= 4 ? 1 : 0
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_plasma_lance': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const count = lv
          const span = (count - 1) * 0.12
          for (let i = 0; i < count; i++) {
            const off = count === 1 ? 0 : -span / 2 + (i / (count - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 18 + lv * 1.5,
                height: 8,
                speed: 580 + lv * 28,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#00F0FF',
                maxLifetime: 1.0,
                maxPierces: 3 + lv,
                type: 'Laser'
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_nova_hammer': {
          const targetCenter = nearest ? nearest.getCenter() : pc
          const radius = 95 + lv * 20
          const slams = isLv5
            ? [
                targetCenter,
                { x: targetCenter.x - 85, y: targetCenter.y + 55 },
                { x: targetCenter.x + 85, y: targetCenter.y - 55 }
              ]
            : lv >= 3
              ? [
                  { x: targetCenter.x - 45, y: targetCenter.y },
                  { x: targetCenter.x + 45, y: targetCenter.y }
                ]
              : [targetCenter]
          for (const slam of slams) {
            explosionsRef.current.push({
              x: slam.x,
              y: slam.y,
              radius,
              timer: 0,
              duration: 0.36,
              color: isLv5 ? 'rgba(255, 215, 0, 0.58)' : 'rgba(245, 158, 11, 0.48)'
            })
            for (const e of aliveEnemies) {
              if (Math.hypot(e.getCenter().x - slam.x, e.getCenter().y - slam.y) <= radius + e.width / 2) {
                damageEnemy(e, weaponDmg, slam)
              }
            }
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_storm_glaive': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const offsets = isLv5 ? [-0.35, 0, 0.35] : lv >= 3 ? [-0.2, 0.2] : [0]
          for (const off of offsets) {
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 18 + lv * 2,
                height: 18 + lv * 2,
                speed: 380 + lv * 24,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#38BDF8',
                type: 'Sawblade',
                maxBounces: 7 + lv * 2,
                maxPierces: 3 + lv
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_chrono_gatling': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const roundCount = 2 + lv
          const span = 0.22 + lv * 0.03
          for (let i = 0; i < roundCount; i++) {
            const off = -span / 2 + (i / (roundCount - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: isLv5 ? 14 : 10 + lv,
                height: 6,
                speed: 620 + lv * 25,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#A855F7',
                type: 'Laser',
                maxLifetime: 0.9,
                maxPierces: isLv5 ? 3 : lv >= 3 ? 2 : 1
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_abyss_beam': {
          const startAngle = nearest
            ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x) - 0.6
            : Math.random() * Math.PI * 2
          const beamCount = isLv5 ? 4 : lv >= 4 ? 3 : 2
          for (let i = 0; i < beamCount; i++) {
            activeBeamsRef.current.push({
              angle: startAngle + (i / beamCount) * Math.PI * 2,
              angularSpeed: 2.7 + lv * 0.45,
              length: 245 + lv * 35,
              damage: weaponDmg,
              timer: 0,
              duration: 1.35 + lv * 0.22,
              hitCooldowns: new Map(),
              cloneId,
              originX: pc.x,
              originY: pc.y,
              color: isCloneCast ? '#C084FC' : undefined
            })
          }
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_celestial_swarm': {
          const missileCount = 3 + lv
          for (let i = 0; i < missileCount; i++) {
            const spread = (i / missileCount) * Math.PI * 2
            const target = aliveEnemies.length > 0 ? aliveEnemies[i % aliveEnemies.length] : null
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 15 + lv,
                height: 15 + lv,
                speed: 440 + lv * 22,
                direction: { x: Math.cos(spread), y: Math.sin(spread) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#F472B6',
                type: 'Rocket',
                maxLifetime: 1.8,
                explosionRadius: 70 + lv * 10,
                homingTarget: target ? target.getCenter() : null,
                homingStrength: target ? 6.5 : 0
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_02': {
          // Rocket Barrage: 1 -> 1 -> 2 -> 2 -> 3 rockets; blast radius 68 -> 84 -> 100 -> 116 -> 132px
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const angles = isLv5
            ? [baseAngle - 0.22, baseAngle, baseAngle + 0.22]
            : lv >= 3
              ? [baseAngle - 0.12, baseAngle + 0.12]
              : [baseAngle]
          for (const a of angles) {
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 13 + lv * 1.4,
                height: 13 + lv * 1.4,
                speed: 410 + lv * 24,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#FF0055',
                type: 'Rocket',
                explosionRadius: 52 + lv * 16
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_03': {
          // Orbital Laser: length 200 -> 235 -> 270 -> 305 -> 340px; dual opposing beams at Lv 5
          const startAngle = nearest
            ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x) - 0.8
            : Math.random() * Math.PI * 2
          const offsets = isLv5 ? [0, Math.PI] : [0]
          for (const off of offsets) {
            activeBeamsRef.current.push({
              angle: startAngle + off,
              angularSpeed: 2.4 + lv * 0.4,
              length: 165 + lv * 35,
              damage: weaponDmg,
              timer: 0,
              duration: 1.15 + lv * 0.2,
              hitCooldowns: new Map(),
              cloneId,
              originX: pc.x,
              originY: pc.y,
              color: isCloneCast ? '#C084FC' : undefined
            })
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_04': {
          // Magnet Pulse - radius 148 -> 176 -> 204 -> 232 -> 260px; Lv 2+ deals EMP pulse damage
          if (!isCloneCast) {
            for (const coin of coinsRef.current) {
              coin.magnetize(pc)
            }
          }
          const radius = 120 + lv * 28
          explosionsRef.current.push({
            x: pc.x,
            y: pc.y,
            radius,
            timer: 0,
            duration: 0.35,
            color: isCloneCast
              ? 'rgba(192, 132, 252, 0.4)'
              : isLv5
                ? 'rgba(255, 215, 0, 0.55)'
                : 'rgba(255, 215, 0, 0.3)'
          })
          if (lv >= 2) {
            const pulseDmg = Math.max(1, Math.round(lv * 10 * damageScale))
            for (const e of aliveEnemies) {
              if (Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y) <= radius + e.width / 2) {
                damageEnemy(e, pulseDmg, pc)
              }
            }
          }
          return
        }
        case 'upg_05': {
          // Bouncing Sawblade: 1 -> 1 -> 2 -> 2 -> 3 blades; bounces 4 -> 6 -> 8 -> 10 -> 12
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const offsets = isLv5 ? [-0.36, 0, 0.36] : lv >= 3 ? [-0.22, 0.22] : [0]
          for (const off of offsets) {
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 14 + lv * 2,
                height: 14 + lv * 2,
                speed: 290 + lv * 22,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: '#FFD700',
                type: 'Sawblade',
                maxBounces: 2 + lv * 2,
                maxPierces: lv + 1
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_06': {
          // Chain Tesla - targets 3 -> 5 -> 7 -> 9 -> 11; range 255 -> 300 -> 345 -> 390 -> 435px
          if (!nearest) return
          const maxTargets = 1 + lv * 2
          const range = 210 + lv * 45
          const sorted = [...aliveEnemies]
            .map((e) => ({
              enemy: e,
              dist: Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y)
            }))
            .filter((item) => item.dist <= range)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, maxTargets)
          const chainPoints: Array<{ x: number; y: number }> = [pc]
          for (const item of sorted) {
            const targetPt = item.enemy.getCenter()
            chainPoints.push(targetPt)
            damageEnemy(item.enemy, scaledBaseDmg, pc)
          }
          if (chainPoints.length > 1) {
            attackEffectsRef.current.push({
              kind: 'lightning',
              points: chainPoints,
              color: isCloneCast ? '#C084FC' : isLv5 ? '#FFD700' : '#00F0FF',
              timer: 0,
              duration: 0.22
            })
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_07': {
          // Orbital Strike Beacon: 1 -> 1 -> 2 -> 2 -> 3 strikes; radius 93 -> 111 -> 129 -> 147 -> 165px
          if (!nearest) return
          const targetPos = nearest.getCenter()
          const r = 75 + lv * 18
          const strikes = isLv5
            ? [
                { x: targetPos.x, y: targetPos.y, r },
                { x: targetPos.x - 95, y: targetPos.y + 65, r: Math.round(r * 0.85) },
                { x: targetPos.x + 95, y: targetPos.y - 65, r: Math.round(r * 0.85) }
              ]
            : lv >= 3
              ? [
                  { x: targetPos.x - 45, y: targetPos.y, r },
                  { x: targetPos.x + 45, y: targetPos.y, r: Math.round(r * 0.9) }
                ]
              : [{ x: targetPos.x, y: targetPos.y, r }]
          for (const strike of strikes) {
            attackEffectsRef.current.push({
              kind: 'orbital_strike',
              x: strike.x,
              y: strike.y,
              radius: strike.r,
              color: isCloneCast ? '#C084FC' : isLv5 ? '#FFD700' : '#FF0055',
              timer: 0,
              duration: 0.45
            })
            for (const e of aliveEnemies) {
              if (Math.hypot(e.getCenter().x - strike.x, e.getCenter().y - strike.y) <= strike.r + e.width / 2) {
                damageEnemy(e, scaledBaseDmg, strike)
              }
            }
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_09': {
          if (isCloneCast) return
          // Emergency Nanites (0.6% -> 1.2% -> 1.8% -> 2.4% -> 5% Max HP)
          const healPct = isLv5 ? 0.05 : 0.006 * lv
          player.heal(Math.max(1, player.maxHealth * healPct))
          return
        }
        case 'upg_10': {
          // Flamethrower Pulse - 1 stream at Lv 1, growing to 5-stream inferno cone at Lv 5
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const streamCount = lv
          const span = (streamCount - 1) * 0.14
          const plumeDamage = Math.max(
            isCloneCast ? 2 : 4,
            Math.round(scaledBaseDmg * (streamCount === 1 ? 1 : 0.65))
          )
          for (let i = 0; i < streamCount; i++) {
            const off = streamCount === 1 ? 0 : -span / 2 + (i / (streamCount - 1)) * span
            const a = baseAngle + off
            const speedJitter = (i % 2 === 0 ? 1 : 0.9) * (310 + lv * 24)
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 14 + lv * 2.2,
                height: 14 + lv * 2.2,
                speed: speedJitter,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: plumeDamage,
                color: isLv5 ? '#FACC15' : '#FF5500',
                maxLifetime: 0.34 + lv * 0.055,
                maxPierces: isLv5 ? 6 : lv,
                type: 'Flame'
              })
            )
          }
          return
        }
        case 'upg_12': {
          // Arc Slash - Vanguard Blade gains Muramasa Bloodmoon Slash buff & VFX
          const heroId = player.hero?.id || 'hero_01'
          const arcCfg = getArcSlashConfig(scaledBaseDmg, lv, heroId)
          const slashRadius = arcCfg.radius
          const slashAngle = nearest
            ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x)
            : timeSurvivedRef.current * 4
          attackEffectsRef.current.push({
            kind: arcCfg.isMuramasa ? 'muramasa_slash' : 'slash',
            x: pc.x,
            y: pc.y,
            angle: slashAngle,
            radius: slashRadius,
            color: isCloneCast
              ? '#C084FC'
              : arcCfg.isMuramasa
                ? '#FF0055'
                : isLv5
                  ? '#FF0055'
                  : '#00F0FF',
            timer: 0,
            duration: arcCfg.isMuramasa ? 0.3 : 0.24
          })
          for (const e of aliveEnemies) {
            const d = Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y)
            if (d <= slashRadius + e.width / 2) {
              damageEnemy(e, arcCfg.damage, pc)
            }
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_13': {
          // Kinetic Pistols: 1 bullet at Lv 1 -> 2 -> 3 -> 4 -> 5-bullet piercing storm at Lv 5
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const bulletCount = lv
          const span = (bulletCount - 1) * 0.09
          for (let i = 0; i < bulletCount; i++) {
            const offset = bulletCount === 1 ? 0 : -span / 2 + (i / (bulletCount - 1)) * span
            const a = baseAngle + offset
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                speed: 480 + lv * 26,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#00F0FF',
                maxPierces: isLv5 ? 2 : lv >= 4 ? 1 : 0,
                type: isLv5 ? 'Laser' : 'Basic',
                width: isLv5 ? 14 : 9 + lv * 0.6,
                height: isLv5 ? 10 : 9 + lv * 0.6
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_16': {
          // Ion Scattergun: 3 -> 4 -> 5 -> 6 -> 7 pellets per shot
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const count = 2 + lv
          const arcSpan = 0.34 + lv * 0.05
          for (let i = 0; i < count; i++) {
            const offset = -arcSpan / 2 + (i / (count - 1)) * arcSpan
            const a = baseAngle + offset
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 9 + lv,
                height: 8 + lv * 0.6,
                speed: 490 + lv * 22,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#38BDF8',
                maxLifetime: 0.55 + lv * 0.04,
                maxPierces: isLv5 ? 3 : lv >= 3 ? 2 : 1,
                type: 'Laser'
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_17': {
          // Void Singularity: radius 107 -> 129 -> 151 -> 173 -> 195px; spawns twin vortices at Lv 5
          const targetCenter = nearest
            ? nearest.getCenter()
            : { x: pc.x + 120, y: pc.y }
          const vRadius = 85 + lv * 22
          const centers = isLv5
            ? [
                { x: targetCenter.x - 70, y: targetCenter.y },
                { x: targetCenter.x + 70, y: targetCenter.y }
              ]
            : [targetCenter]
          for (const c of centers) {
            voidVorticesRef.current.push({
              x: c.x,
              y: c.y,
              radius: vRadius,
              timer: 0,
              duration: 1.8 + lv * 0.1,
              damage: weaponDmg,
              isLv5
            })
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_18': {
          // Frost Nova Spire: 4 -> 6 -> 8 -> 10 -> 12 radial crystalline ice shards
          const count = 2 + lv * 2
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 11 + lv,
                height: 11 + lv,
                speed: 390 + lv * 20,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#E0F2FE' : '#22D3EE',
                maxLifetime: 0.78 + lv * 0.05,
                maxPierces: lv,
                type: 'IceShard'
              })
            )
          }
          explosionsRef.current.push({
            x: pc.x,
            y: pc.y,
            radius: 65 + lv * 14,
            timer: 0,
            duration: 0.25,
            color: 'rgba(34, 211, 238, 0.28)'
          })
          playSoundRef.current('shoot')
          return
        }
        case 'upg_19': {
          // Vampiric Siphon: drains 2 -> 3 -> 4 -> 5 -> 6 enemies within 146 -> 172 -> 198 -> 224 -> 250px
          const range = 120 + lv * 26
          const maxDrain = 1 + lv
          const targets = [...aliveEnemies]
            .map((e) => ({
              enemy: e,
              dist: Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y)
            }))
            .filter((item) => item.dist <= range)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, maxDrain)

          if (targets.length === 0) return
          for (const item of targets) {
            const ec = item.enemy.getCenter()
            damageEnemy(item.enemy, scaledBaseDmg)
            attackEffectsRef.current.push({
              kind: 'siphon',
              from: ec,
              to: pc,
              color: isCloneCast ? '#C084FC' : isLv5 ? '#FB7185' : '#F43F5E',
              timer: 0,
              duration: 0.3
            })
          }
          if (!isCloneCast) {
            const healAmount = targets.length * (lv >= 4 ? 3 : 2)
            player.heal(healAmount)
            floatingTextsRef.current.push({
              x: pc.x,
              y: pc.y - 24,
              text: `+${healAmount} HP`,
              color: '#FDA4AF',
              timer: 0.65
            })
          }
          playSoundRef.current('shoot')
          return
        }
        case 'upg_21': {
          // Inferno Fireball: 1 -> 1 -> 2 -> 2 -> 3 roaring fireballs leaving burning AoE pools
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const angles = isLv5
            ? [baseAngle - 0.28, baseAngle, baseAngle + 0.28]
            : lv >= 3
              ? [baseAngle - 0.16, baseAngle + 0.16]
              : [baseAngle]
          const zoneRadius = 54 + lv * 18
          const burnDamage = Math.max(
            isCloneCast ? 2 : 4,
            Math.round(weaponDmg * (isLv5 ? 0.42 : 0.3 + lv * 0.025))
          )
          const burnDuration = 2.3 + lv * 0.35

          for (const a of angles) {
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 15 + lv * 1.8,
                height: 15 + lv * 1.8,
                speed: 360 + lv * 20,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FACC15' : '#F97316',
                maxLifetime: 0.95 + lv * 0.06,
                type: 'Fireball',
                explosionRadius: zoneRadius,
                burnRadius: zoneRadius,
                burnDuration,
                burnDamage
              })
            )
          }
          playSoundRef.current('shoot')
          return
        }
        default: {
          // Targeted fallback projectile
          if (!nearest) return
          const ec = nearest.getCenter()
          const d = Math.hypot(ec.x - pc.x, ec.y - pc.y) || 1
          playerProjectilesRef.current.push(
            new Projectile({
              x: pc.x,
              y: pc.y,
              speed: 460,
              direction: { x: (ec.x - pc.x) / d, y: (ec.y - pc.y) / d },
              damage: weaponDmg,
              upgradeData: upg
            })
          )
          playSoundRef.current('shoot')
        }
      }
    }

    const applyPostSpawnHeroEffects = (
      startProjIdx: number,
      origin: { x: number; y: number },
      heroId: string,
      isCloneCast: boolean
    ) => {
      const projectiles = playerProjectilesRef.current
      if (startProjIdx >= projectiles.length) return

      let lockPos: { x: number; y: number } | null = null
      if (shouldApplyHomingForHero(heroId)) {
        let bestDist = 720
        for (const e of enemiesRef.current) {
          if (!e.isAlive || e.isSpawning) continue
          const ec = e.getCenter()
          const d = Math.hypot(ec.x - origin.x, ec.y - origin.y)
          if (d < bestDist) {
            bestDist = d
            lockPos = ec
          }
        }
      }

      for (let idx = startProjIdx; idx < projectiles.length; idx++) {
        const proj = projectiles[idx]
        if (shouldApplyHomingForHero(heroId)) {
          proj.homingStrength = Math.max(
            proj.homingStrength,
            HERO_ABILITY_CONSTANTS.RANGER_HOMING_STRENGTH
          )
          if (!proj.homingTarget && lockPos) {
            proj.homingTarget = lockPos
          }
        }
        if (isCloneCast) {
          proj.color = '#C084FC'
          proj.baseColor = '#C084FC'
        }
      }
    }

    const fireUpgrade = (upg: UpgradesRow, player: Player) => {
      const heroId = player.hero?.id || 'hero_01'
      const playerCenter = player.getCenter()
      const startProjIdx = playerProjectilesRef.current.length
      executeWeaponFire(upg, player, playerCenter, 1, false)
      applyPostSpawnHeroEffects(startProjIdx, playerCenter, heroId, false)

      // Chrono Operative: active 3s clones copy every attack at 50% damage
      if (heroId === 'hero_04' && chronoClonesRef.current.length > 0) {
        for (const clone of chronoClonesRef.current) {
          if (clone.timer >= clone.duration) continue
          const cloneProjIdx = playerProjectilesRef.current.length
          const cloneCenter = { x: clone.x, y: clone.y }
          executeWeaponFire(
            upg,
            player,
            cloneCenter,
            HERO_ABILITY_CONSTANTS.CHRONO_CLONE_DAMAGE_RATIO,
            true,
            clone.id
          )
          applyPostSpawnHeroEffects(cloneProjIdx, cloneCenter, heroId, true)
        }
      }
    }

    const detonateProjectileImpact = (proj: Projectile) => {
      explosionsRef.current.push({
        x: proj.x,
        y: proj.y,
        radius: proj.explosionRadius,
        timer: 0,
        duration: 0.3,
        color: proj.burnRadius > 0 ? 'rgba(249, 115, 22, 0.55)' : 'rgba(255, 215, 0, 0.45)'
      })
      for (const aoeTarget of enemiesRef.current) {
        if (!aoeTarget.isAlive || aoeTarget.isSpawning) continue
        if (
          Math.hypot(aoeTarget.getCenter().x - proj.x, aoeTarget.getCenter().y - proj.y) <=
          proj.explosionRadius + aoeTarget.width / 2
        ) {
          damageEnemy(aoeTarget, proj.damage, { x: proj.x, y: proj.y })
        }
      }
      if (proj.burnRadius > 0) {
        burnZonesRef.current.push({
          x: proj.x,
          y: proj.y,
          radius: proj.burnRadius,
          timer: 0,
          duration: proj.burnDuration > 0 ? proj.burnDuration : 2.8,
          tickTimer: 0.25,
          damagePerTick:
            proj.burnDamage > 0 ? proj.burnDamage : Math.max(4, Math.round(proj.damage * 0.32)),
          isLv5: proj.color === '#FACC15'
        })
      }
    }

    const frame = (timestamp: number) => {
      const deltaTime = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016
      lastTime = timestamp

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      const player = playerRef.current
      const camera = cameraRef.current

      if (canvas && ctx && player && camera) {
        if (gameStateRef.current === 'playing') {
          timeSurvivedRef.current += deltaTime

          // 1. Movement (Keyboard + Touch D-pad)
          const kbMove = inputRef.current?.getMovementVector() || { x: 0, y: 0 }
          const touchMove = touchDirRef.current
          let moveX = kbMove.x + touchMove.x
          let moveY = kbMove.y + touchMove.y
          const mag = Math.hypot(moveX, moveY)
          if (mag > 1) {
            moveX /= mag
            moveY /= mag
          }
          player.update({ x: moveX, y: moveY }, deltaTime)
          if (bossArenaRef.current) {
            const ba = bossArenaRef.current
            player.x = Math.max(ba.left + 16, Math.min(ba.left + ba.width - player.width - 16, player.x))
            player.y = Math.max(ba.top + 16, Math.min(ba.top + ba.height - player.height - 16, player.y))
          }
          const updatedCenter = player.getCenter()
          playerTrailRef.current.push({ x: updatedCenter.x, y: updatedCenter.y })
          if (playerTrailRef.current.length > 48) {
            playerTrailRef.current.shift()
          }
          if (bossArenaRef.current) {
            const ba = bossArenaRef.current
            camera.update(ba.left + ba.width / 2, ba.top + ba.height / 2)
          } else {
            camera.update(updatedCenter.x, updatedCenter.y)
          }

          // 2. Wave + Breather State Machine (30s Active / 3s Breather; Wave 15 Boss solo showdown; Endless 16+ in Area 2)
          if (isBreatherRef.current) {
            breatherElapsedRef.current += deltaTime
            if (breatherElapsedRef.current >= WAVE_CONFIG.BREATHER_DURATION_SECONDS) {
              isBreatherRef.current = false
              breatherElapsedRef.current = 0
              if (waveRef.current < WAVE_CONFIG.MAX_WAVE || endlessModeRef.current) {
                waveRef.current += 1
              }
              waveElapsedRef.current = 0
              rangedSpawnedInWaveRef.current = 0
              waveTookDamageRef.current = false
              setIsBreather(false)
              setWave(waveRef.current)
              setDevRunStatus({ currentWave: waveRef.current })
              playSoundRef.current('wave')

              if (waveRef.current === WAVE_CONFIG.MAX_WAVE && !endlessModeRef.current) {
                // Disable regular spawns & remove leftover regular adds for pure Wave 15 Final Boss duel
                enemiesRef.current = enemiesRef.current.filter((e) => e.isBoss && e.isAlive)

                // Lock visible Boss Arena around current screen and spawn stationary upper-center Wave 15 Final Boss
                if (!bossArenaRef.current) {
                  const aw = canvas.width
                  const ah = canvas.height
                  const left = Math.max(24, Math.min(ARENA_SIZE - aw - 24, updatedCenter.x - aw / 2))
                  const top = Math.max(24, Math.min(ARENA_SIZE - ah - 24, updatedCenter.y - ah / 2))
                  bossArenaRef.current = { left, top, width: aw, height: ah }
                  // Ensure player is not spawned overlapping the upper-center boss perch
                  const bossAnchorX = left + aw / 2
                  const bossAnchorY = top + 195
                  if (Math.hypot(updatedCenter.x - bossAnchorX, updatedCenter.y - bossAnchorY) < 130) {
                    player.y = Math.min(top + ah - player.height - 40, top + 360)
                  }
                }
                if (!finalBossSpawnedRef.current) {
                  finalBossSpawnedRef.current = true
                  bossSpawnedWaveRef.current = WAVE_CONFIG.MAX_WAVE
                  spawnEnemyForWave(WAVE_CONFIG.MAX_WAVE, true)
                  toast.warning(
                    areaRef.current.id === 'astral_citadel'
                      ? 'FINAL WAVE 15: Dodge closing side lasers, tracking strikes & bullet hell!'
                      : 'FINAL WAVE 15: Dodge closing side lasers, tracking strikes & bullet hell!'
                  )
                }
              } else {
                // Wave-start swarm reinforcement surge scaled per wave (melee first so ranged don't stack)
                if (shouldSpawnRegularEnemiesInWave(waveRef.current, endlessModeRef.current)) {
                  const waveCfg = getWaveSpawnConfig(waveRef.current, timeSurvivedRef.current)
                  for (
                    let i = 0;
                    i < waveCfg.waveBurst && enemiesRef.current.length < waveCfg.maxActiveEnemies;
                    i++
                  ) {
                    spawnEnemyForWave(waveRef.current, false, false)
                  }
                }

                // Boss alert every 5 waves (Wave 5, 10, and Endless Wave 20, 25, 30...)
                if (waveRef.current % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0) {
                  spawnEnemyForWave(waveRef.current, true)
                  bossSpawnedWaveRef.current = waveRef.current
                  toast.warning(`Wave ${waveRef.current} BOSS INCOMING: Watch for red telegraph indicators!`)
                }
              }
            }
          } else {
            waveElapsedRef.current += deltaTime

            // Continuous swarm spawning (completely disabled during Wave 15 Final Boss showdown)
            if (shouldSpawnRegularEnemiesInWave(waveRef.current, endlessModeRef.current)) {
              const waveCfg = getWaveSpawnConfig(waveRef.current, timeSurvivedRef.current)
              spawnAccumulatorRef.current += waveCfg.spawnRate * deltaTime
              while (
                spawnAccumulatorRef.current >= 1 &&
                enemiesRef.current.length < waveCfg.maxActiveEnemies
              ) {
                spawnAccumulatorRef.current -= 1
                spawnEnemyForWave(waveRef.current, false)
              }
            }

            if (
              (waveRef.current < WAVE_CONFIG.MAX_WAVE || endlessModeRef.current) &&
              waveElapsedRef.current >= WAVE_CONFIG.WAVE_DURATION_SECONDS
            ) {
              isBreatherRef.current = true
              breatherElapsedRef.current = 0
              setIsBreather(true)

              // Evaluate damage-free wave streak
              if (!waveTookDamageRef.current) {
                currentDamageFreeStreakRef.current += 1
                longestDamageFreeStreakRef.current = Math.max(
                  longestDamageFreeStreakRef.current,
                  currentDamageFreeStreakRef.current
                )
              }
            }
          }

          // 3. Cryo-Aura Passive Slow/Blizzard (radius, slow & DoT scale per level) & Shield UI Status
          const cryoLv = upgradeLevelsRef.current['upg_08'] || 0
          const hasCryo = cryoLv > 0
          const cryoRadius = 105 + cryoLv * 28
          const cryoSlow = Math.max(0.38, 0.78 - cryoLv * 0.08)
          let applyCryoDot = false
          if (cryoLv >= 3) {
            cryoDotTimerRef.current += deltaTime
            if (cryoDotTimerRef.current >= 0.5) {
              cryoDotTimerRef.current -= 0.5
              applyCryoDot = true
            }
          }
          const shieldReady = activeUpgradesRef.current.some(
            (u) => (u.id === 'upg_11' || u.id === 'upg_15') && (upgradeCooldownsRef.current[u.id] || 0) <= 0
          )

          // Passive HP regeneration from equipped Accessories
          if (equippedBonusesRef.current.hpRegenPerSec > 0 && player.isAlive && player.health < player.maxHealth) {
            hpRegenCarryRef.current += equippedBonusesRef.current.hpRegenPerSec * deltaTime
            if (hpRegenCarryRef.current >= 1) {
              const healWhole = Math.floor(hpRegenCarryRef.current)
              hpRegenCarryRef.current -= healWhole
              player.heal(healWhole)
            }
          }

          // 4. Auto-Fire Equipped Upgrades (Summons are updated autonomously below)
          const fireRateMultiplier = equippedBonusesRef.current.cooldownRateMultiplier
          for (const upg of activeUpgradesRef.current) {
            if (
              upg.id === 'upg_08' ||
              upg.id === 'upg_01' ||
              upg.id === 'upg_14' ||
              upg.id === 'upg_20'
            ) {
              continue
            }
            if (upg.id === 'upg_11' || upg.id === 'upg_15') {
              upgradeCooldownsRef.current[upg.id] = Math.max(
                0,
                (upgradeCooldownsRef.current[upg.id] || 0) - deltaTime * fireRateMultiplier
              )
              continue
            }

            const prevCd = upgradeCooldownsRef.current[upg.id] ?? 0
            const nextCd = prevCd - deltaTime * fireRateMultiplier
            if (nextCd <= 0) {
              fireUpgrade(upg, player)
              const baseCd = upg.cooldown_s > 0 ? upg.cooldown_s : 0.35
              upgradeCooldownsRef.current[upg.id] = baseCd
            } else {
              upgradeCooldownsRef.current[upg.id] = nextCd
            }
          }

          // 4b. Autonomous Summons (Companion Robot, Temporal Echo & Sentinel Turret)
          for (const summon of summonsRef.current) {
            const action = summon.update(deltaTime, player, enemiesRef.current, playerTrailRef.current)
            const spawnedList = [
              ...(action?.projectile ? [action.projectile] : []),
              ...(action?.extraProjectiles || [])
            ]
            for (const pData of spawnedList) {
              playerProjectilesRef.current.push(
                new Projectile({
                  x: pData.x,
                  y: pData.y,
                  width: pData.width,
                  height: pData.height,
                  speed: pData.speed,
                  direction: pData.direction,
                  damage: pData.damage,
                  color: pData.color,
                  type: pData.type,
                  maxPierces: pData.maxPierces
                })
              )
            }
            if (spawnedList.length > 0) {
              playSoundRef.current('shoot')
            }
            if (action?.pulse) {
              explosionsRef.current.push({
                x: action.pulse.x,
                y: action.pulse.y,
                radius: action.pulse.radius,
                timer: 0,
                duration: 0.3,
                color: action.pulse.color
              })
              for (const enemy of enemiesRef.current) {
                if (!enemy.isAlive || enemy.isSpawning) continue
                const ec = enemy.getCenter()
                if (Math.hypot(ec.x - action.pulse.x, ec.y - action.pulse.y) <= action.pulse.radius + enemy.width / 2) {
                  damageEnemy(enemy, action.pulse.damage, { x: action.pulse.x, y: action.pulse.y })
                }
              }
            }
          }

          // 4c. Sweeping Orbital Laser Beams
          for (let b = activeBeamsRef.current.length - 1; b >= 0; b--) {
            const beam = activeBeamsRef.current[b]
            beam.timer += deltaTime
            beam.angle += beam.angularSpeed * deltaTime
            if (beam.timer >= beam.duration) {
              activeBeamsRef.current.splice(b, 1)
              continue
            }
            const bx = updatedCenter.x
            const by = updatedCenter.y
            const ex = bx + Math.cos(beam.angle) * beam.length
            const ey = by + Math.sin(beam.angle) * beam.length

            for (const enemy of enemiesRef.current) {
              if (!enemy.isAlive || enemy.isSpawning) continue
              const lastHit = beam.hitCooldowns.get(enemy) ?? -1
              if (beam.timer - lastHit < 0.25) continue

              const ec = enemy.getCenter()
              const l2 = beam.length * beam.length
              const t = Math.max(0, Math.min(1, ((ec.x - bx) * (ex - bx) + (ec.y - by) * (ey - by)) / l2))
              const projX = bx + t * (ex - bx)
              const projY = by + t * (ey - by)
              const dist = Math.hypot(ec.x - projX, ec.y - projY)
              if (dist <= enemy.width / 2 + 12) {
                beam.hitCooldowns.set(enemy, beam.timer)
                damageEnemy(enemy, beam.damage, updatedCenter)
              }
            }
          }

          // 4d. Void Singularity Vortices (Gravity pull + collapse detonation)
          for (let v = voidVorticesRef.current.length - 1; v >= 0; v--) {
            const vortex = voidVorticesRef.current[v]
            vortex.timer += deltaTime
            const pullRadius = vortex.radius * 1.35
            for (const enemy of enemiesRef.current) {
              if (!enemy.isAlive || enemy.isSpawning) continue
              const ec = enemy.getCenter()
              const dx = vortex.x - ec.x
              const dy = vortex.y - ec.y
              const dist = Math.hypot(dx, dy)
              if (dist > 8 && dist <= pullRadius) {
                const pullStrength = vortex.isLv5 ? 190 : 125
                enemy.x += (dx / dist) * pullStrength * deltaTime
                enemy.y += (dy / dist) * pullStrength * deltaTime
              }
            }

            if (vortex.timer >= vortex.duration) {
              explosionsRef.current.push({
                x: vortex.x,
                y: vortex.y,
                radius: vortex.radius,
                timer: 0,
                duration: 0.4,
                color: vortex.isLv5 ? 'rgba(232, 121, 249, 0.65)' : 'rgba(168, 85, 247, 0.5)'
              })
              const detonateDamage = vortex.isLv5 ? Math.round(vortex.damage * 1.45) : vortex.damage
              for (const enemy of enemiesRef.current) {
                if (!enemy.isAlive || enemy.isSpawning) continue
                const ec = enemy.getCenter()
                if (Math.hypot(ec.x - vortex.x, ec.y - vortex.y) <= vortex.radius + enemy.width / 2) {
                  damageEnemy(enemy, detonateDamage, { x: vortex.x, y: vortex.y })
                }
              }
              voidVorticesRef.current.splice(v, 1)
            }
          }

          // 4e. Inferno Fireball Burning Ground Zones (periodic burn damage to all enemies inside)
          for (let bz = burnZonesRef.current.length - 1; bz >= 0; bz--) {
            const zone = burnZonesRef.current[bz]
            zone.timer += deltaTime
            zone.tickTimer += deltaTime
            if (zone.tickTimer >= 0.45) {
              zone.tickTimer -= 0.45
              for (const enemy of enemiesRef.current) {
                if (!enemy.isAlive || enemy.isSpawning) continue
                const ec = enemy.getCenter()
                if (Math.hypot(ec.x - zone.x, ec.y - zone.y) <= zone.radius + enemy.width / 2) {
                  damageEnemy(enemy, zone.damagePerTick)
                }
              }
            }
            if (zone.timer >= zone.duration) {
              burnZonesRef.current.splice(bz, 1)
            }
          }

          const pc = player.getCenter()
          const playerCircle = { x: pc.x, y: pc.y, radius: player.width / 2 }

          // 5. Update Enemies, Resolve Enemy-to-Enemy Collisions & Check Player Hits + Boss Telegraphs
          for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
            const enemy = enemiesRef.current[i]
            if (!enemy.isAlive) {
              if (enemy.updateDeath(deltaTime) || !enemy.isDying) {
                enemiesRef.current.splice(i, 1)
              }
              continue
            }

            const ec = enemy.getCenter()
            if (hasCryo && Math.hypot(ec.x - pc.x, ec.y - pc.y) <= cryoRadius) {
              enemy.slowMultiplier = cryoSlow
              if (applyCryoDot && !enemy.isSpawning) {
                damageEnemy(enemy, (cryoLv - 2) * 4)
                if (!enemy.isAlive) continue
              }
            }

            enemy.update(deltaTime, player)
          }

          // Separate overlapping enemies cleanly via spatial-grid circle collision
          resolveEnemyCollisions(enemiesRef.current, ARENA_SIZE)

          for (const enemy of enemiesRef.current) {
            if (!enemy.isAlive) continue
            const ec = enemy.getCenter()
            const enemyCircle = { x: ec.x, y: ec.y, radius: enemy.width / 2 }
            if (!enemy.isSpawning && Collision.circleCircle(playerCircle, enemyCircle)) {
              damagePlayer(enemy.damage, ec)
            }

            // Enemy projectile collisions against player
            for (let p = enemy.projectiles.length - 1; p >= 0; p--) {
              const ep = enemy.projectiles[p]
              const epCircle = { x: ep.x, y: ep.y, radius: ep.width / 2 }
              if (Collision.circleCircle(playerCircle, epCircle)) {
                enemy.projectiles.splice(p, 1)
                damagePlayer(ep.damage, { x: ep.x, y: ep.y })
              }
            }

            // Mini-boss dodgeable AoE projectile detonation hits
            if (enemy.aoeProjectiles.length > 0) {
              for (const aoe of enemy.aoeProjectiles) {
                if (aoe.hasDetonated && !aoe.hasDamagedPlayer) {
                  aoe.hasDamagedPlayer = true
                  if (checkEnemyAoeHit(aoe, playerCircle)) {
                    damagePlayer(aoe.damage, { x: aoe.targetX, y: aoe.targetY })
                  }
                }
              }
            }

            // Boss big telegraphed attack warning sound + active collision checks
            if (enemy.isBoss && enemy.telegraphs.length > 0) {
              for (const telegraph of enemy.telegraphs) {
                const isMajorWave15Warning =
                  telegraph.kind === 'closing_side_lasers' ||
                  telegraph.kind === 'pursuit_beam' ||
                  telegraph.kind === 'bullet_hell' ||
                  telegraph.kind === 'tracking_strikes' ||
                  telegraph.kind === 'half_arena'

                if (
                  isMajorWave15Warning &&
                  !telegraph.hasTriggered &&
                  !announcedHalfTelegraphIdsRef.current.has(telegraph.id)
                ) {
                  announcedHalfTelegraphIdsRef.current.add(telegraph.id)
                  playSoundRef.current('wave')
                }

                if (!telegraph.hasTriggered) continue

                if (telegraph.kind === 'tracking_strikes' && telegraph.trackingBlasts) {
                  // Evaluate each sequential target-lock blast independently when it detonates
                  for (const blast of telegraph.trackingBlasts) {
                    if (blast.hasDetonated && !blast.hasDamagedPlayer) {
                      blast.hasDamagedPlayer = true
                      if (
                        Math.hypot(playerCircle.x - blast.x, playerCircle.y - blast.y) <=
                        blast.radius + playerCircle.radius * 0.65
                      ) {
                        damagePlayer(telegraph.damage, { x: blast.x, y: blast.y })
                      }
                    }
                  }
                } else if (
                  telegraph.kind === 'closing_side_lasers' ||
                  telegraph.kind === 'pursuit_beam' ||
                  telegraph.kind === 'mega_laser'
                ) {
                  // Sweeping/active beams stay lethal across frames and only lock out after actually landing
                  if (!telegraph.hasDamagedPlayer && checkBossTelegraphHit(telegraph, playerCircle)) {
                    const hitOrigin =
                      telegraph.kind === 'closing_side_lasers' && telegraph.bounds
                        ? {
                            x: telegraph.bounds.left + telegraph.bounds.width / 2,
                            y: playerCircle.y
                          }
                        : { x: telegraph.x, y: telegraph.y }
                    if (damagePlayer(telegraph.damage, hitOrigin)) {
                      telegraph.hasDamagedPlayer = true
                      telegraph.hitCooldown = 0
                    }
                  }
                } else if (!telegraph.hasDamagedPlayer) {
                  if (checkBossTelegraphHit(telegraph, playerCircle)) {
                    if (damagePlayer(telegraph.damage, { x: telegraph.x, y: telegraph.y })) {
                      telegraph.hasDamagedPlayer = true
                    }
                  } else {
                    // Instant burst telegraphs evaluate once at trigger time
                    telegraph.hasDamagedPlayer = true
                  }
                }
              }
            }
          }

          // 6. Update Player Projectiles & Check Circle-to-Circle Enemy Hits
          for (let i = playerProjectilesRef.current.length - 1; i >= 0; i--) {
            const proj = playerProjectilesRef.current[i]
            proj.update(deltaTime)

            if (!proj.isAlive) {
              if (proj.burnRadius > 0) {
                detonateProjectileImpact(proj)
              }
              playerProjectilesRef.current.splice(i, 1)
              continue
            }

            // Bounce Bouncing Sawblade off arena boundaries
            if (proj.maxBounces > 0) {
              if (proj.x <= 10 || proj.x >= ARENA_SIZE - 10) proj.bounce({ x: 1, y: 0 })
              if (proj.y <= 10 || proj.y >= ARENA_SIZE - 10) proj.bounce({ x: 0, y: 1 })
            }

            const projCircle = { x: proj.x, y: proj.y, radius: proj.width / 2 }
            for (const enemy of enemiesRef.current) {
              if (!enemy.isAlive || enemy.isSpawning) continue
              const ec = enemy.getCenter()
              const enemyCircle = { x: ec.x, y: ec.y, radius: enemy.width / 2 }

              if (Collision.circleCircle(projCircle, enemyCircle)) {
                if (proj.explosionRadius > 0) {
                  detonateProjectileImpact(proj)
                } else {
                  damageEnemy(enemy, proj.damage, { x: proj.x, y: proj.y })
                }

                proj.hitEntity()
                if (!proj.isAlive) {
                  playerProjectilesRef.current.splice(i, 1)
                  break
                }
              }
            }
          }

          // 7. Coins Magnetism & Collection
          const baseMagnet = isBreatherRef.current ? COIN_CONFIG.COIN_MAGNET_RANGE * 2.2 : COIN_CONFIG.COIN_MAGNET_RANGE
          const magnetRange = baseMagnet * equippedBonusesRef.current.magnetRangeMultiplier
          for (let i = coinsRef.current.length - 1; i >= 0; i--) {
            const coin = coinsRef.current[i]
            const dist = Math.hypot(coin.x - pc.x, coin.y - pc.y)

            if (dist <= magnetRange && !coin.isMagnetized) {
              coin.magnetize(pc)
            } else if (coin.isMagnetized) {
              coin.magnetTarget = pc
            }

            coin.update(deltaTime, pc)
            if (coin.isCollected) {
              let earned = coin.value
              if (equippedBonusesRef.current.bonusCoinChance > 0) {
                bonusCoinCarryRef.current += coin.value * equippedBonusesRef.current.bonusCoinChance
                if (bonusCoinCarryRef.current >= 1) {
                  const extra = Math.floor(bonusCoinCarryRef.current)
                  bonusCoinCarryRef.current -= extra
                  earned += extra
                }
              }
              coinsCollectedRef.current += earned
              playSoundRef.current('coin')
              coinsRef.current.splice(i, 1)
            }
          }

          // 8. Visual FX Updates
          for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
            explosionsRef.current[i].timer += deltaTime
            if (explosionsRef.current[i].timer >= explosionsRef.current[i].duration) {
              explosionsRef.current.splice(i, 1)
            }
          }
          for (let i = attackEffectsRef.current.length - 1; i >= 0; i--) {
            attackEffectsRef.current[i].timer += deltaTime
            if (attackEffectsRef.current[i].timer >= attackEffectsRef.current[i].duration) {
              attackEffectsRef.current.splice(i, 1)
            }
          }
          for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
            floatingTextsRef.current[i].timer -= deltaTime
            floatingTextsRef.current[i].y -= 28 * deltaTime
            if (floatingTextsRef.current[i].timer <= 0) {
              floatingTextsRef.current.splice(i, 1)
            }
          }

          // 9. Periodic HUD State Sync & Battle Coin Wallet Sync (~10 Hz to keep React ultra-fast)
          hudSyncTimerRef.current += deltaTime
          if (hudSyncTimerRef.current >= 0.1) {
            hudSyncTimerRef.current = 0
            flushBankedCoins()
            const survivedSec = Math.floor(timeSurvivedRef.current)
            setTimeSurvived(survivedSec)
            setCoins(coinsCollectedRef.current)
            setScore(calculateScoreFormula(survivedSec, coinsCollectedRef.current))
            setXP(xpRef.current)
            setHealth(player.health)
            setEnemiesDefeated(enemiesDefeatedRef.current)
            setShieldActive(shieldReady)
            setWaveTimeRemaining(
              isBreatherRef.current
                ? Math.max(0, WAVE_CONFIG.BREATHER_DURATION_SECONDS - breatherElapsedRef.current)
                : Math.max(0, WAVE_CONFIG.WAVE_DURATION_SECONDS - waveElapsedRef.current)
            )
          }
        }

        // --- RENDER FRAME ---
        const currentArea = areaRef.current
        ctx.fillStyle = currentArea.floorColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Tactical Grid
        const gridSize = 64
        const startX = -(camera.x % gridSize)
        const startY = -(camera.y % gridSize)
        ctx.strokeStyle = currentArea.gridColor
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = startX; x < canvas.width; x += gridSize) {
          ctx.moveTo(x, 0)
          ctx.lineTo(x, canvas.height)
        }
        for (let y = startY; y < canvas.height; y += gridSize) {
          ctx.moveTo(0, y)
          ctx.lineTo(canvas.width, y)
        }
        ctx.stroke()

        // Area 2 Emerald Crystal Floor Nodes for distinctive landmark visuals
        if (currentArea.id === 'astral_citadel') {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.14)'
          for (let x = startX; x < canvas.width; x += gridSize * 2) {
            for (let y = startY; y < canvas.height; y += gridSize * 2) {
              ctx.beginPath()
              ctx.moveTo(x, y - 4)
              ctx.lineTo(x + 4, y)
              ctx.lineTo(x, y + 4)
              ctx.lineTo(x - 4, y)
              ctx.closePath()
              ctx.fill()
            }
          }
        }

        // Arena Boundary
        const topLeft = camera.worldToScreen(0, 0)
        ctx.strokeStyle = currentArea.borderColor
        ctx.lineWidth = 3
        ctx.strokeRect(topLeft.x, topLeft.y, ARENA_SIZE, ARENA_SIZE)

        // Locked Wave 15 Final Boss Arena Containment Border
        if (bossArenaRef.current) {
          const ba = bossArenaRef.current
          const baTopLeft = camera.worldToScreen(ba.left, ba.top)
          ctx.save()
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)'
          ctx.lineWidth = 4
          ctx.strokeRect(baTopLeft.x + 2, baTopLeft.y + 2, ba.width - 4, ba.height - 4)
          ctx.restore()
        }

        // Cryo Aura Ring (radius grows from 133px at Lv 1 to 245px at Lv 5)
        const activeCryoLv = upgradeLevelsRef.current['upg_08'] || 0
        if (activeCryoLv > 0) {
          const pc = camera.worldToScreen(player.getCenter().x, player.getCenter().y)
          const r = 105 + activeCryoLv * 28
          ctx.strokeStyle =
            activeCryoLv >= MAX_WEAPON_UPGRADE_LEVEL
              ? 'rgba(56, 189, 248, 0.45)'
              : 'rgba(0, 240, 255, 0.25)'
          ctx.lineWidth = activeCryoLv >= MAX_WEAPON_UPGRADE_LEVEL ? 3 : 2
          ctx.beginPath()
          ctx.arc(pc.x, pc.y, r, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Void Singularity Vortices
        for (const vortex of voidVorticesRef.current) {
          const vp = camera.worldToScreen(vortex.x, vortex.y)
          const progress = Math.min(1, vortex.timer / vortex.duration)
          const coreR = Math.max(8, vortex.radius * (0.3 + 0.25 * Math.sin(progress * Math.PI * 6)))
          ctx.save()
          ctx.fillStyle = vortex.isLv5 ? 'rgba(168, 85, 247, 0.28)' : 'rgba(147, 51, 234, 0.2)'
          ctx.beginPath()
          ctx.arc(vp.x, vp.y, Math.max(10, vortex.radius), 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = vortex.isLv5 ? '#FFD700' : '#E879F9'
          ctx.lineWidth = 2.2
          ctx.beginPath()
          ctx.arc(vp.x, vp.y, Math.max(8, coreR), 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = '#0B0F19'
          ctx.beginPath()
          ctx.arc(vp.x, vp.y, Math.max(4, coreR * 0.45), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Inferno Fireball Burning Ground Zones
        for (const zone of burnZonesRef.current) {
          const zp = camera.worldToScreen(zone.x, zone.y)
          const remaining = Math.max(0, zone.duration - zone.timer)
          const fade = Math.min(1, remaining / 0.45)
          const pulse = 1 + Math.sin(zone.timer * 14) * 0.04
          const r = Math.max(12, zone.radius * pulse)

          ctx.save()
          ctx.globalAlpha = fade
          ctx.fillStyle = zone.isLv5 ? 'rgba(234, 88, 12, 0.34)' : 'rgba(194, 65, 12, 0.28)'
          ctx.beginPath()
          ctx.arc(zp.x, zp.y, r, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = zone.isLv5 ? '#FACC15' : '#F97316'
          ctx.lineWidth = 2.2
          ctx.beginPath()
          ctx.arc(zp.x, zp.y, r, 0, Math.PI * 2)
          ctx.stroke()

          // Inner scorching magma tongues
          const flameCount = zone.isLv5 ? 7 : 5
          for (let f = 0; f < flameCount; f++) {
            const ang = (f / flameCount) * Math.PI * 2 + zone.timer * 1.4
            const dist = r * (0.38 + ((f % 2) * 0.22))
            const fx = zp.x + Math.cos(ang) * dist
            const fy = zp.y + Math.sin(ang) * dist
            const flameH = 7 + Math.sin(zone.timer * 22 + f * 3) * 3
            ctx.fillStyle = f % 2 === 0 ? '#FB923C' : '#FEF08A'
            ctx.beginPath()
            ctx.moveTo(fx - 4, fy + 2)
            ctx.lineTo(fx, fy - flameH)
            ctx.lineTo(fx + 4, fy + 2)
            ctx.closePath()
            ctx.fill()
          }
          ctx.restore()
        }

        // Boss & Mini-Boss Floor Telegraph Indicators (rendered under characters so dodging stays clear)
        for (const enemy of enemiesRef.current) {
          if (enemy.aoeProjectiles.length > 0) {
            enemy.drawAoeIndicators(ctx, camera)
          }
          if (enemy.isBoss && enemy.telegraphs.length > 0) {
            enemy.drawTelegraphs(ctx, camera)
          }
        }

        // Coins
        for (const coin of coinsRef.current) {
          coin.draw(ctx, camera)
        }

        // Explosions (ring + radial shockwave)
        for (const fx of explosionsRef.current) {
          const sp = camera.worldToScreen(fx.x, fx.y)
          const progress = Math.min(1, fx.timer / fx.duration)
          const outerR = Math.max(2, fx.radius * (0.4 + progress * 0.6))
          ctx.save()
          ctx.globalAlpha = Math.max(0, 1 - progress)
          ctx.fillStyle = fx.color
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, outerR, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = fx.color
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, outerR, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        // Authentic Weapon Attack Effects (Lightning, Crescent Slash, Sky Beam, Siphon, Heal Wave)
        for (const fx of attackEffectsRef.current) {
          const progress = Math.min(1, fx.timer / fx.duration)
          const alpha = Math.max(0, 1 - progress)
          ctx.save()
          ctx.globalAlpha = alpha

          if (fx.kind === 'lightning' && fx.points.length > 1) {
            const screenPts = fx.points.map((pt) => camera.worldToScreen(pt.x, pt.y))
            // Build jagged segments between chained targets
            const drawJagged = (lineW: number, strokeColor: string) => {
              ctx.strokeStyle = strokeColor
              ctx.lineWidth = lineW
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              ctx.beginPath()
              ctx.moveTo(screenPts[0].x, screenPts[0].y)
              for (let i = 1; i < screenPts.length; i++) {
                const a = screenPts[i - 1]
                const b = screenPts[i]
                const steps = 4
                for (let s = 1; s < steps; s++) {
                  const t = s / steps
                  const jitter = Math.sin((i * 17 + s * 31 + fx.timer * 90)) * 12
                  const dx = b.x - a.x
                  const dy = b.y - a.y
                  const len = Math.hypot(dx, dy) || 1
                  const px = a.x + dx * t + (-dy / len) * jitter
                  const py = a.y + dy * t + (dx / len) * jitter
                  ctx.lineTo(px, py)
                }
                ctx.lineTo(b.x, b.y)
              }
              ctx.stroke()
            }
            drawJagged(6, fx.color)
            drawJagged(2.2, '#FFFFFF')
            for (let i = 1; i < screenPts.length; i++) {
              ctx.fillStyle = '#FFFFFF'
              ctx.beginPath()
              ctx.arc(screenPts[i].x, screenPts[i].y, 4.5, 0, Math.PI * 2)
              ctx.fill()
            }
          } else if (fx.kind === 'slash') {
            const sp = camera.worldToScreen(fx.x, fx.y)
            const sweepStart = fx.angle - 1.35 + progress * 0.35
            const sweepEnd = fx.angle + 1.35 + progress * 0.35
            const rOuter = Math.max(12, fx.radius * (0.78 + progress * 0.25))
            const rInner = Math.max(6, rOuter * 0.66)

            // Crescent energy blade silhouette
            ctx.fillStyle = fx.color
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rOuter, sweepStart, sweepEnd)
            ctx.arc(sp.x, sp.y, rInner, sweepEnd, sweepStart, true)
            ctx.closePath()
            ctx.fill()

            // Razor white cutting edge
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rOuter, sweepStart, sweepEnd)
            ctx.stroke()
          } else if (fx.kind === 'orbital_strike') {
            const sp = camera.worldToScreen(fx.x, fx.y)
            const beamHalfW = Math.max(4, fx.radius * 0.24 * (1 - progress * 0.6))
            const groundR = Math.max(8, fx.radius * (0.35 + progress * 0.65))

            // Vertical orbital satellite beam pillar from top of screen
            ctx.fillStyle = fx.color
            ctx.globalAlpha = alpha * 0.45
            ctx.fillRect(sp.x - beamHalfW, 0, beamHalfW * 2, sp.y)
            ctx.fillStyle = '#FFFFFF'
            ctx.globalAlpha = alpha * 0.85
            ctx.fillRect(sp.x - beamHalfW * 0.35, 0, beamHalfW * 0.7, sp.y)

            // Ground targeting reticle + scorched shockwave ring
            ctx.globalAlpha = alpha
            ctx.strokeStyle = fx.color
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, groundR, 0, Math.PI * 2)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(sp.x - groundR * 0.5, sp.y)
            ctx.lineTo(sp.x + groundR * 0.5, sp.y)
            ctx.moveTo(sp.x, sp.y - groundR * 0.5)
            ctx.lineTo(sp.x, sp.y + groundR * 0.5)
            ctx.stroke()
          } else if (fx.kind === 'siphon') {
            const a = camera.worldToScreen(fx.from.x, fx.from.y)
            const b = camera.worldToScreen(fx.to.x, fx.to.y)
            const midX = (a.x + b.x) / 2 + Math.sin(fx.timer * 25) * 14
            const midY = (a.y + b.y) / 2 - Math.cos(fx.timer * 25) * 14

            ctx.strokeStyle = fx.color
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.quadraticCurveTo(midX, midY, b.x, b.y)
            ctx.stroke()

            // Animated blood-energy orb traveling toward player
            const t = progress
            const orbX = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * midX + t * t * b.x
            const orbY = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * midY + t * t * b.y
            ctx.fillStyle = '#FFE4E6'
            ctx.beginPath()
            ctx.arc(orbX, orbY, 4.5, 0, Math.PI * 2)
            ctx.fill()
          } else if (fx.kind === 'heal_wave') {
            const sp = camera.worldToScreen(fx.x, fx.y)
            const r = Math.max(8, fx.radius * (0.35 + progress * 0.65))
            ctx.strokeStyle = '#10B981'
            ctx.lineWidth = 3.5
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
            ctx.stroke()
            ctx.fillStyle = '#34D399'
            ctx.fillRect(sp.x - 3, sp.y - 12 - progress * 16, 6, 18)
            ctx.fillRect(sp.x - 9, sp.y - 6 - progress * 16, 18, 6)
          }

          ctx.restore()
        }

        // Sweeping Orbital Laser Beams
        for (const beam of activeBeamsRef.current) {
          const pcScreen = camera.worldToScreen(player.getCenter().x, player.getCenter().y)
          const endX = pcScreen.x + Math.cos(beam.angle) * beam.length
          const endY = pcScreen.y + Math.sin(beam.angle) * beam.length
          ctx.save()
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)'
          ctx.lineWidth = 14
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(pcScreen.x, pcScreen.y)
          ctx.lineTo(endX, endY)
          ctx.stroke()
          ctx.strokeStyle = '#E0F2FE'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(pcScreen.x, pcScreen.y)
          ctx.lineTo(endX, endY)
          ctx.stroke()
          ctx.restore()
        }

        // Enemies
        for (const enemy of enemiesRef.current) {
          enemy.draw(ctx, camera)
        }

        // Projectiles
        for (const proj of playerProjectilesRef.current) {
          proj.draw(ctx, camera)
        }

        // Autonomous Summons (Companion Robots & Temporal Echoes)
        for (const summon of summonsRef.current) {
          summon.draw(ctx, camera, player)
        }

        // Player
        player.draw(ctx, camera)

        // Floating Damage Numbers
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        for (const ft of floatingTextsRef.current) {
          const sp = camera.worldToScreen(ft.x, ft.y)
          ctx.fillStyle = ft.color
          ctx.fillText(ft.text, sp.x, sp.y)
        }

        // Active Boss Health Bar Banner
        const activeBoss = enemiesRef.current.find((e) => e.isBoss && e.isAlive)
        if (activeBoss) {
          const barW = Math.min(440, canvas.width - 64)
          const barH = 14
          const bx = (canvas.width - barW) / 2
          const by = 122
          const hpPct = Math.max(0, Math.min(1, activeBoss.health / activeBoss.maxHealth))
          ctx.save()
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
          ctx.fillRect(bx - 6, by - 22, barW + 12, barH + 28)
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)'
          ctx.lineWidth = 1.5
          ctx.strokeRect(bx - 6, by - 22, barW + 12, barH + 28)
          ctx.fillStyle = '#FFD700'
          ctx.font = 'bold 11px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(
            `⚠ ${activeBoss.bossTitle}  (${Math.ceil(activeBoss.health)} / ${activeBoss.maxHealth})`,
            canvas.width / 2,
            by - 7
          )
          ctx.fillStyle = '#1E293B'
          ctx.fillRect(bx, by, barW, barH)
          ctx.fillStyle = '#FF0055'
          ctx.fillRect(bx, by, barW * hpPct, barH)
          ctx.restore()
        }
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [pickLevelUpOptions, setEngineState, spawnEnemyForWave, toast, triggerEndGame])

  const handleLevelUpSelect = useCallback(
    (upgradeId: string) => {
      if (upgradeId === 'heal_instead') {
        const player = playerRef.current
        if (player) {
          const healAmount = Math.max(15, Math.round(player.maxHealth * 0.4))
          const beforeHp = player.health
          if (player.health < player.maxHealth) {
            player.heal(healAmount)
            const gained = Math.max(1, Math.round(player.health - beforeHp))
            setHealth(player.health)
            toast.success(`Emergency Repair: Restored +${gained} HP`)
            floatingTextsRef.current.push({
              x: player.getCenter().x,
              y: player.y - 14,
              text: `+${gained} HP`,
              color: '#34D399',
              timer: 0.9
            })
          } else {
            player.maxHealth += 5
            player.health = player.maxHealth
            setMaxHealth(player.maxHealth)
            setHealth(player.health)
            toast.success('Hull Reinforced: +5 Max HP')
            floatingTextsRef.current.push({
              x: player.getCenter().x,
              y: player.y - 14,
              text: '+5 MAX HP',
              color: '#34D399',
              timer: 0.9
            })
          }
          const pc = player.getCenter()
          attackEffectsRef.current.push({
            kind: 'heal_wave',
            x: pc.x,
            y: pc.y,
            radius: 120,
            timer: 0,
            duration: 0.45
          })
          playSoundRef.current('coin')
        }
      } else if (upgradeId === 'overclock_surge') {
        const player = playerRef.current
        if (player) {
          player.heal(Math.max(10, player.maxHealth * 0.5))
          setHealth(player.health)
          const pc = player.getCenter()
          explosionsRef.current.push({
            x: pc.x,
            y: pc.y,
            radius: 320,
            timer: 0,
            duration: 0.45,
            color: 'rgba(255, 215, 0, 0.55)'
          })
          toast.success('Overclock Core Surge activated!')
        }
      } else {
        const starOverrides =
          equippedWeaponIdRef.current && equippedWeaponStarsRef.current > 0
            ? { [equippedWeaponIdRef.current]: equippedWeaponStarsRef.current }
            : undefined
        const selected = [...seedUpgrades, ...shopWeaponsAsUpgrades(starOverrides)].find(
          (u) => u.id === upgradeId
        )
        if (selected) {
          const prevLv = upgradeLevelsRef.current[selected.id] || 0
          const nextLv = Math.min(MAX_WEAPON_UPGRADE_LEVEL, prevLv + 1)
          upgradeLevelsRef.current[selected.id] = nextLv
          const nextStats = getUpgradeLevelStats(selected.damage, selected.cooldown_s, nextLv)

          let targetUpgrade = activeUpgradesRef.current.find((u) => u.id === selected.id)
          if (!targetUpgrade) {
            targetUpgrade = {
              ...selected,
              damage: nextStats.damage,
              cooldown_s: nextStats.cooldown_s
            }
            activeUpgradesRef.current.push(targetUpgrade)
            upgradeCooldownsRef.current[targetUpgrade.id] = 0.05
            syncSummonsForUpgrade(targetUpgrade, playerRef.current, nextLv)
            toast.success(`Equipped: ${targetUpgrade.name} (Lv.${nextLv})`)
          } else {
            targetUpgrade.damage = nextStats.damage
            targetUpgrade.cooldown_s = nextStats.cooldown_s
            syncSummonsForUpgrade(targetUpgrade, playerRef.current, nextLv)
            if (nextLv >= MAX_WEAPON_UPGRADE_LEVEL) {
              toast.success(`OVERDRIVE EVOLVED: ${targetUpgrade.name} (LV 5 MAX)!`)
            } else {
              toast.success(`Upgraded: ${targetUpgrade.name} → Lv.${nextLv}`)
            }
          }

          setActiveUpgradeNames(
            activeUpgradesRef.current.map((u) => {
              const lv = upgradeLevelsRef.current[u.id] || 1
              return lv >= MAX_WEAPON_UPGRADE_LEVEL ? `${u.name} Lv.5 ★` : `${u.name} Lv.${lv}`
            })
          )
        }
      }

      pendingLevelUpsRef.current = Math.max(0, pendingLevelUpsRef.current - 1)
      if (pendingLevelUpsRef.current > 0) {
        setLevelUpOptions(pickLevelUpOptions())
        setEngineState('levelup')
      } else {
        setEngineState('playing')
      }
    },
    [pickLevelUpOptions, setEngineState, syncSummonsForUpgrade, toast]
  )

  const handlePauseToggle = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setEngineState('paused')
    } else if (gameStateRef.current === 'paused') {
      setEngineState('playing')
    }
  }, [setEngineState])

  const handleContinueEndless = useCallback(() => {
    const player = playerRef.current
    endlessModeRef.current = true
    setIsEndlessMode(true)
    bossArenaRef.current = null
    enemiesRef.current = []
    waveRef.current = WAVE_CONFIG.MAX_WAVE + 1
    waveElapsedRef.current = 0
    breatherElapsedRef.current = 0
    isBreatherRef.current = false
    rangedSpawnedInWaveRef.current = 0
    spawnAccumulatorRef.current = 0
    waveTookDamageRef.current = false
    setWave(waveRef.current)
    setDevRunStatus({ currentWave: waveRef.current })
    setIsBreather(false)
    setWaveTimeRemaining(WAVE_CONFIG.WAVE_DURATION_SECONDS)

    if (player) {
      player.heal(player.maxHealth)
      player.isInvulnerable = true
      player.invulnerabilityTimer = 2.0
      setHealth(player.health)
    }

    const waveCfg = getWaveSpawnConfig(waveRef.current, timeSurvivedRef.current)
    for (
      let i = 0;
      i < waveCfg.waveBurst && enemiesRef.current.length < waveCfg.maxActiveEnemies;
      i++
    ) {
      spawnEnemyForWave(waveRef.current, false, false)
    }

    setEngineState('playing')
    playSoundRef.current('wave')
    toast.success('ENDLESS MODE ENGAGED! Wave 16+ unlocked — bosses arrive every 5 waves!')
  }, [setEngineState, spawnEnemyForWave, toast])

  const setTouchVector = (x: number, y: number) => {
    touchDirRef.current = { x, y }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[640px] sm:h-[720px] bg-slate-carbon border border-gray-700 rounded-xl overflow-hidden select-none"
    >
      <GameCanvas ref={canvasRef} />

      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-30 p-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-cyan-accent mb-4">
            SWARM PROTOCOL: SURVIVOR
          </h2>
          <p className="text-gray-300 mb-6">
            WASD / Arrow Keys to move • Auto-weapons engage nearest hostiles
          </p>
          <button
            onClick={initRun}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-lg rounded-lg transition-colors"
          >
            DEPLOY INTO ARENA
          </button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'paused' || gameState === 'levelup') && (
        <HUD
          score={score}
          coins={coins}
          xp={xp}
          xpToNext={getXpForNextLevel(level)}
          level={level}
          health={health}
          maxHealth={maxHealth}
          wave={wave}
          time={timeSurvived}
          enemiesDefeated={enemiesDefeated}
          waveTimeRemaining={waveTimeRemaining}
          isBreather={isBreather}
          isEndless={isEndlessMode}
          heroName={heroName}
          areaName={activeArea.name}
          activeUpgrades={activeUpgradeNames}
          shieldActive={shieldActive}
          onPause={handlePauseToggle}
        />
      )}

      {/* Mobile / Touch On-Screen D-Pad */}
      {gameState === 'playing' && (
        <div className="md:hidden absolute bottom-14 right-4 z-20 grid grid-cols-3 gap-1.5 opacity-80">
          <div />
          <button
            type="button"
            onTouchStart={() => setTouchVector(0, -1)}
            onTouchEnd={() => setTouchVector(0, 0)}
            onMouseDown={() => setTouchVector(0, -1)}
            onMouseUp={() => setTouchVector(0, 0)}
            className="w-11 h-11 bg-slate-800 border border-cyan-accent/50 rounded flex items-center justify-center text-white font-bold"
            aria-label="Move Up"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            onTouchStart={() => setTouchVector(-1, 0)}
            onTouchEnd={() => setTouchVector(0, 0)}
            onMouseDown={() => setTouchVector(-1, 0)}
            onMouseUp={() => setTouchVector(0, 0)}
            className="w-11 h-11 bg-slate-800 border border-cyan-accent/50 rounded flex items-center justify-center text-white font-bold"
            aria-label="Move Left"
          >
            ◀
          </button>
          <button
            type="button"
            onTouchStart={() => setTouchVector(0, 1)}
            onTouchEnd={() => setTouchVector(0, 0)}
            onMouseDown={() => setTouchVector(0, 1)}
            onMouseUp={() => setTouchVector(0, 0)}
            className="w-11 h-11 bg-slate-800 border border-cyan-accent/50 rounded flex items-center justify-center text-white font-bold"
            aria-label="Move Down"
          >
            ▼
          </button>
          <button
            type="button"
            onTouchStart={() => setTouchVector(1, 0)}
            onTouchEnd={() => setTouchVector(0, 0)}
            onMouseDown={() => setTouchVector(1, 0)}
            onMouseUp={() => setTouchVector(0, 0)}
            className="w-11 h-11 bg-slate-800 border border-cyan-accent/50 rounded flex items-center justify-center text-white font-bold"
            aria-label="Move Right"
          >
            ▶
          </button>
        </div>
      )}

      {gameState === 'paused' && (
        <PauseMenu
          onResume={() => setEngineState('playing')}
          onRestart={() => {
            flushBankedCoins()
            initRun()
          }}
          onQuit={() => {
            flushBankedCoins()
            if (onBack) onBack()
            else setEngineState('menu')
          }}
        />
      )}

      {gameState === 'levelup' && (
        <LevelUpModal
          level={level}
          options={levelUpOptions}
          onSelect={handleLevelUpSelect}
          currentHealth={health}
          maxHealth={maxHealth}
        />
      )}

      {gameState === 'victory_choice' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-50 p-4">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-2xl p-7 max-w-lg w-full text-center shadow-[0_0_50px_rgba(52,211,153,0.28)]">
            <div className="text-xs font-mono tracking-widest uppercase text-emerald-300 mb-2">
              Astral Citadel • Wave 15 Cleared
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-yellow-300 mb-3">
              SOLAR ARCHON DEFEATED!
            </h2>
            <p className="text-slate-200 text-sm sm:text-base mb-6">
              You conquered the Astral Citadel Final Boss! Extract now to lock in your Victory, or
              push into <span className="text-emerald-300 font-bold">Endless Mode</span> with
              full HP, unlocked arena walls, and bosses every 5 waves.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-800/80 rounded-xl p-3 border border-slate-700">
              <div>
                <div className="text-[11px] text-slate-400">TIME</div>
                <div className="text-white font-bold font-mono">{timeSurvived}s</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">COINS</div>
                <div className="text-yellow-400 font-bold font-mono">{coins}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">KILLS</div>
                <div className="text-emerald-400 font-bold font-mono">{enemiesDefeated}</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContinueEndless}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-base sm:text-lg rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                GO ON FOREVER (ENDLESS WAVE 16+)
              </button>
              <button
                onClick={() => triggerEndGame(true)}
                className="w-full px-6 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-base rounded-xl transition-colors border border-slate-500"
              >
                CLAIM VICTORY & EXTRACT
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <GameOverScreen
          score={finalScore}
          stats={finalStats}
          isVictory={isVictory}
          isEndless={isEndlessMode}
          waveReached={wave}
          onRestart={initRun}
          onQuit={() => {
            flushBankedCoins()
            if (onBack) onBack()
            else setEngineState('menu')
          }}
        />
      )}
    </div>
  )
}

export default GameContainer
