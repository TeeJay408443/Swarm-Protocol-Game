/**
 * Game Container - 60 FPS Arena Combat Engine
 * Phases 7 & 9: Full real-time game loop with ref-based mutable state,
 * circle-to-circle collisions, auto-targeting weapons, wave/breather timing,
 * Wave 5 Mini-Boss, XP leveling, and Supabase/localStorage telemetry submission.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import astralGalaxyBackgroundUrl from '../../../../attached_assets/image_1795561136880.png'
import { Camera } from '../../../game/engine/Camera'
import { InputManager } from '../../../game/engine/InputManager'
import { isVisiblePlayerWeaponId, Player } from '../../../game/entities/Player'
import {
  BossArenaBounds,
  checkBossTelegraphHit,
  checkAstralScourgeTailHit,
  checkDevourerSegmentHit,
  checkEnemyAoeHit,
  Enemy,
  resolveEnemyCollisions
} from '../../../game/entities/Enemy'
import { Projectile } from '../../../game/entities/Projectile'
import { Coin } from '../../../game/entities/Coin'
import { Summon } from '../../../game/entities/Summon'
import { Collision } from '../../../game/utils/collision'
import { enemies as seedEnemies, upgrades as seedUpgrades } from '../../../db/seedData'
import { ALL_HEROES } from '../../../config/unlockableHeroes'
import {
  COIN_CONFIG,
  GAME_CONFIG,
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
  ASTRAL_SCOURGE_BOSS_ID,
  ASTRAL_SCOURGE_PHASE_ONE_HP,
  ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS,
  BossCutsceneKind,
  BossCutsceneTheme,
  computeBossCutsceneShake,
  computeDevourerCutsceneCameraFrame,
  DEVOURER_CUTSCENE_DURATION_SECONDS,
  DEVOURER_CUTSCENE_THEME,
  getAreaBossTemplateForWave,
  getAreaById,
  getAreaFinalBossCombatProfile,
  getAreaFinalBossCutsceneTheme,
  getAreaFinalBossHp,
  getAreaMaxWave,
  getAreaMiniBossCap,
  getAreaOneBossBuff,
  getAreaTwoBossBuff,
  getAstralScourgePhaseTwoCutsceneTheme,
  getDevSpawnableEnemyById,
  getWave15CutsceneTheme,
  SECRET_DEVOURER_OF_GODS_ID,
  SECRET_DEVOURER_OF_GODS_TEMPLATE,
  selectAreaEnemyTemplateForWave,
  shouldSpawnRegularEnemiesInWave,
  WAVE_15_CUTSCENE_DURATION_SECONDS
} from '../../../config/arenas'
import { PLAYABLE_BOSS_DROP_SETS } from '../../../config/bossCrafting'
import {
  computeDifficultyCoinPayout,
  DifficultyId,
  formatDifficultyCoinLabel,
  getDifficultyById
} from '../../../config/difficulties'
import {
  computeHeroBurnPerTick,
  getArcSlashConfig,
  getChronoCloneConfig,
  getEngineerSummonBonuses,
  getGrimReaperWeaponConfig,
  getHeroAbility,
  getHeroCritBonuses,
  getHeroDamageReduction,
  getHeroFireRateBonus,
  getMuramasaWeaponConfig,
  getPairedHeroArcSlashBonus,
  getPaladinConfig,
  getPyroBurnConfig,
  getRangerHomingConfig,
  getStormAssassinConfig,
  getSummonCountForUpgrade,
  getTempestSphereWeaponConfig,
  getVanguardConfig,
  HERO_ABILITY_CONSTANTS,
  resolveStartingUpgradeIds,
  shouldApplyHomingForHero
} from '../../../config/heroAbilities'
import {
  AREA_TWO_UPGRADES,
  getAvailableRunUpgrades
} from '../../../config/areaUpgrades'
import {
  CRIT_CONFIG,
  UNIVERSAL_CRIT_UPGRADE_IDS,
  UNIVERSAL_CRIT_UPGRADES,
  computeCritTextSwayAngle,
  formatDamageFloatingText,
  getPassiveCritUpgradeBonuses,
  getWeaponCritProfile,
  rollCriticalHit
} from '../../../config/critSystem'
import type { UpgradesRow } from '../../../types/database'
import {
  calculateScoreFormula,
  getLocalPlayerTelemetry,
  getOperativeProfile,
  submitScore
} from '../../../services/scores'
import {
  computeEquippedAccessoryBonuses,
  awardBossDropsForEnemy,
  creditShopCoins,
  getShopAccountState,
  shopWeaponsAsUpgrades,
  type ComputedAccessoryBonuses
} from '../../../services/shop'
import {
  computeHeroMasteryBonuses,
  getHeroMasteryProgress,
  recordHeroRoundsCompleted,
  type HeroMasteryBonuses
} from '../../../services/heroMastery'
import { getHeroUpgradeLevel } from '../../../services/heroUpgrades'
import { checkAndSyncMilestoneHeroUnlocks } from '../../../services/heroUnlocks'
import {
  setDevRunStatus,
  subscribeDevActions,
  useDevSettings
} from '../../../services/devTools'
import { useSupabase } from '../../../hooks/useSupabase'
import { useAudio } from '../../../context/AudioContext'
import { useToast } from '../../ui/ToastContainer'
import YouTubeBossMusicPlayer from '../../ui/YouTubeBossMusicPlayer'
import GameCanvas from './GameCanvas'
import HUD, { type ActiveBossHudState } from './HUD'
import LevelUpModal, { UpgradeOption } from './LevelUpModal'
import PauseMenu from './PauseMenu'
import GameOverScreen, { type GameOverStats } from './GameOverScreen'

export interface GameContainerProps {
  onBack?: () => void
  selectedHeroId?: string
  startingUpgradeId?: string
  loadoutName?: string
  areaId?: ArenaId
  difficultyId?: DifficultyId
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
  maxTimer?: number
  isCrit?: boolean
  swayPhase?: number
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
  summon?: Summon
  originX?: number
  originY?: number
  color?: string
  critChanceBonus?: number
  critDamageBonus?: number
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

interface SolarFlailFx {
  x: number
  y: number
  originX: number
  originY: number
  angle: number
  maxDistance: number
  traveled: number
  phase: 'outbound' | 'apex' | 'returning'
  apexTimer: number
  apexDuration: number
  speed: number
  spinAngle: number
  headRadius: number
  damage: number
  burnDamage: number
  burnRadius: number
  burnDuration: number
  isLv5: boolean
  isCloneCast: boolean
  cloneId?: number
  trailDropDist: number
  critChanceBonus?: number
  critDamageBonus?: number
  hitCooldowns: Map<Enemy, number>
  timer: number
  trail: Array<{ x: number; y: number }>
}

interface TornadoFx {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  timer: number
  duration: number
  damage: number
  isLv5: boolean
  isCloneCast: boolean
  hitCooldowns: Map<Enemy, number>
}

interface StarfallMeteorFx {
  targetX: number
  targetY: number
  radius: number
  timer: number
  impactTime: number
  damage: number
  isLv5: boolean
  isCloneCast: boolean
}

interface TempestSphereFx {
  targetX: number
  targetY: number
  startX: number
  startY: number
  impactRadius: number
  pulseRadius: number
  timer: number
  fallTime: number
  impactDamage: number
  pulseDamage: number
  critChanceBonus: number
  critDamageBonus: number
  isPairedHero: boolean
  isLv5: boolean
  isCloneCast: boolean
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
  | {
      kind: 'lightning_pulse_wave'
      x: number
      y: number
      radius: number
      color: string
      secondaryColor: string
      timer: number
      duration: number
    }

type DogCutsceneParticle =
  | {
      kind: 'shard'
      x: number
      y: number
      vx: number
      vy: number
      size: number
      angle: number
      spin: number
      timer: number
      duration: number
      color: string
    }
  | {
      kind: 'spark'
      x: number
      y: number
      vx: number
      vy: number
      size: number
      timer: number
      duration: number
      color: string
      attractX?: number
      attractY?: number
    }
  | {
      kind: 'shockwave'
      x: number
      y: number
      maxRadius: number
      lineWidth: number
      timer: number
      duration: number
      color: string
    }
  | {
      kind: 'lightning'
      points: Array<{ x: number; y: number }>
      timer: number
      duration: number
      color: string
    }
  | {
      kind: 'flame'
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      riseSpeed: number
      swayPhase: number
      swayAmp: number
      timer: number
      duration: number
      color: string
      coreColor: string
    }
  | {
      kind: 'ember'
      x: number
      y: number
      vx: number
      vy: number
      size: number
      timer: number
      duration: number
      color: string
      swayPhase: number
    }
  | {
      kind: 'orbit_star'
      x: number
      y: number
      centerX: number
      centerY: number
      radius: number
      angle: number
      angularSpeed: number
      radialSpeed: number
      size: number
      timer: number
      duration: number
      color: string
    }

interface DogGroundCrack {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>
  timer: number
  maxDuration: number
  color: string
}

const DOG_SHARD_PALETTE = ['#22D3EE', '#E879F9', '#A855F7', '#F0ABFC', '#67E8F9']

function createDogGroundCracks(
  originX: number,
  originY: number,
  branchCount: number,
  maxReach: number,
  maxDuration: number,
  palette: string[] = ['#22D3EE', '#E879F9']
): DogGroundCrack[] {
  const cracks: DogGroundCrack[] = []
  const colors = palette.length > 0 ? palette : ['#22D3EE', '#E879F9']
  for (let b = 0; b < branchCount; b++) {
    const baseAngle = (b / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }> = []
    let cx = originX + Math.cos(baseAngle) * 18
    let cy = originY + Math.sin(baseAngle) * 10
    let angle = baseAngle
    const steps = 4 + Math.floor(Math.random() * 3)
    const stepLen = maxReach / steps
    for (let s = 0; s < steps; s++) {
      angle += (Math.random() - 0.5) * 0.65
      const len = stepLen * (0.75 + Math.random() * 0.5)
      const nx = cx + Math.cos(angle) * len
      const ny = cy + Math.sin(angle) * len
      segs.push({
        x1: cx,
        y1: cy,
        x2: nx,
        y2: ny,
        width: Math.max(1.2, 4.2 - s * 0.65)
      })
      if (s >= 1 && Math.random() < 0.55) {
        const subAngle = angle + (Math.random() < 0.5 ? 0.55 : -0.55)
        segs.push({
          x1: nx,
          y1: ny,
          x2: nx + Math.cos(subAngle) * (len * 0.6),
          y2: ny + Math.sin(subAngle) * (len * 0.6),
          width: 1.5
        })
      }
      cx = nx
      cy = ny
    }
    cracks.push({
      segments: segs,
      timer: 0,
      maxDuration,
      color: colors[b % colors.length]
    })
  }
  return cracks
}

function createDogLightningArc(
  originX: number,
  originY: number,
  angle: number,
  reach: number,
  color: string
): DogCutsceneParticle {
  const points: Array<{ x: number; y: number }> = [{ x: originX, y: originY }]
  const segments = 5
  for (let i = 1; i <= segments; i++) {
    const frac = i / segments
    const jitter = i < segments ? (Math.random() - 0.5) * 34 : 0
    const perp = angle + Math.PI / 2
    points.push({
      x: originX + Math.cos(angle) * reach * frac + Math.cos(perp) * jitter,
      y: originY + Math.sin(angle) * reach * frac + Math.sin(perp) * jitter
    })
  }
  return {
    kind: 'lightning',
    points,
    timer: 0,
    duration: 0.22 + Math.random() * 0.14,
    color
  }
}

function pushDogDestructiveBurst(
  list: DogCutsceneParticle[],
  originX: number,
  originY: number,
  options: {
    shards: number
    sparks: number
    bolts: number
    speedScale?: number
    palette?: string[]
    shockwaves?: Array<{ maxRadius: number; color: string; lineWidth: number; duration: number }>
  }
): void {
  const spd = options.speedScale ?? 1
  const pal = options.palette && options.palette.length > 0 ? options.palette : DOG_SHARD_PALETTE
  const primaryCol = pal[0]
  const secondaryCol = pal[1 % pal.length]
  for (let i = 0; i < options.shards; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (140 + Math.random() * 340) * spd
    list.push({
      kind: 'shard',
      x: originX + Math.cos(angle) * (6 + Math.random() * 24),
      y: originY + Math.sin(angle) * (4 + Math.random() * 14),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 9,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 16,
      timer: 0,
      duration: 0.55 + Math.random() * 0.55,
      color: pal[i % pal.length]
    })
  }
  for (let i = 0; i < options.sparks; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (220 + Math.random() * 420) * spd
    list.push({
      kind: 'spark',
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      timer: 0,
      duration: 0.35 + Math.random() * 0.4,
      color: i % 2 === 0 ? primaryCol : secondaryCol
    })
  }
  for (let i = 0; i < options.bolts; i++) {
    const angle = (i / Math.max(1, options.bolts)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const reach = (110 + Math.random() * 170) * spd
    list.push(
      createDogLightningArc(
        originX,
        originY,
        angle,
        reach,
        i % 2 === 0 ? primaryCol : secondaryCol
      )
    )
  }
  if (options.shockwaves) {
    for (const sw of options.shockwaves) {
      list.push({
        kind: 'shockwave',
        x: originX,
        y: originY,
        maxRadius: sw.maxRadius,
        lineWidth: sw.lineWidth,
        timer: 0,
        duration: sw.duration,
        color: sw.color
      })
    }
  }
}

function pushBossAreaInfernoBurst(
  list: DogCutsceneParticle[],
  originX: number,
  originY: number,
  options: {
    flames: number
    embers: number
    speedScale?: number
    palette: string[]
    coreColor: string
    shockwaves?: Array<{ maxRadius: number; color: string; lineWidth: number; duration: number }>
  }
): void {
  const spd = options.speedScale ?? 1
  const pal = options.palette.length > 0 ? options.palette : ['#F97316', '#EF4444', '#FDE047']
  for (let i = 0; i < options.flames; i++) {
    const angle = Math.random() * Math.PI * 2
    const ringRadius = 10 + Math.random() * 44
    const radialSpeed = (65 + Math.random() * 230) * spd
    list.push({
      kind: 'flame',
      x: originX + Math.cos(angle) * ringRadius,
      y: originY + Math.sin(angle) * ringRadius * 0.65 + 8,
      vx: Math.cos(angle) * radialSpeed,
      vy: Math.sin(angle) * radialSpeed * 0.55 - (70 + Math.random() * 120) * spd,
      radius: (10 + Math.random() * 15) * (0.85 + spd * 0.2),
      riseSpeed: (130 + Math.random() * 170) * spd,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 28 + Math.random() * 48,
      timer: 0,
      duration: 0.48 + Math.random() * 0.52,
      color: pal[i % pal.length],
      coreColor: options.coreColor
    })
  }
  for (let i = 0; i < options.embers; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (110 + Math.random() * 290) * spd
    list.push({
      kind: 'ember',
      x: originX + (Math.random() - 0.5) * 48,
      y: originY + (Math.random() - 0.5) * 32,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.65 - (60 + Math.random() * 110) * spd,
      size: 2.2 + Math.random() * 3.4,
      timer: 0,
      duration: 0.55 + Math.random() * 0.65,
      color: pal[i % pal.length],
      swayPhase: Math.random() * Math.PI * 2
    })
  }
  if (options.shockwaves) {
    for (const sw of options.shockwaves) {
      list.push({
        kind: 'shockwave',
        x: originX,
        y: originY,
        maxRadius: sw.maxRadius,
        lineWidth: sw.lineWidth,
        timer: 0,
        duration: sw.duration,
        color: sw.color
      })
    }
  }
}

function pushSeraphSolarBurst(
  list: DogCutsceneParticle[],
  originX: number,
  originY: number,
  intensity = 1
): void {
  const scale = Math.max(0.25, intensity)
  const palette = ['#FACC15', '#34D399', '#FEF9C3']
  const sparkCount = Math.round(34 * scale)
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (110 + Math.random() * 260) * scale
    list.push({
      kind: 'spark',
      x: originX + Math.cos(angle) * (8 + Math.random() * 22),
      y: originY + Math.sin(angle) * (6 + Math.random() * 18),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.4 + Math.random() * 3.8,
      timer: 0,
      duration: 0.45 + Math.random() * 0.45,
      color: palette[i % palette.length]
    })
  }
  for (let i = 0; i < Math.max(1, Math.round(4 * scale)); i++) {
    list.push(
      createDogLightningArc(
        originX,
        originY,
        (i / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
        (130 + Math.random() * 170) * scale,
        i % 2 === 0 ? '#FACC15' : '#34D399'
      )
    )
  }
  list.push(
    {
      kind: 'shockwave',
      x: originX,
      y: originY,
      maxRadius: 220 * scale,
      lineWidth: 4,
      timer: 0,
      duration: 0.72,
      color: '#FACC15'
    },
    {
      kind: 'shockwave',
      x: originX,
      y: originY,
      maxRadius: 150 * scale,
      lineWidth: 2.5,
      timer: 0,
      duration: 0.58,
      color: '#34D399'
    }
  )
}

function pushAstralPhaseTwoRiftBurst(
  list: DogCutsceneParticle[],
  originX: number,
  originY: number,
  intensity = 1
): void {
  const scale = Math.max(0.25, intensity)
  const palette = ['#34D399', '#FACC15', '#A78BFA', '#E0F2FE']
  const starCount = Math.round(26 * scale)

  for (let i = 0; i < starCount; i++) {
    pushAstralOrbitStar(list, originX, originY, scale, palette[i % palette.length], i % 2 === 0)
  }

  for (let i = 0; i < Math.max(1, Math.round(2 * scale)); i++) {
    list.push({
      kind: 'shockwave',
      x: originX,
      y: originY,
      maxRadius: (190 + i * 110) * scale,
      lineWidth: Math.max(2.5, 5 - i),
      timer: 0,
      duration: 0.45 + i * 0.12,
      color: i % 2 === 0 ? '#34D399' : '#FACC15'
    })
  }

  for (let i = 0; i < Math.round(6 * scale); i++) {
    list.push(
      createDogLightningArc(
        originX,
        originY,
        (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
        (100 + Math.random() * 190) * scale,
        i % 2 === 0 ? '#34D399' : '#FACC15'
      )
    )
  }
}

function pushAstralOrbitStar(
  list: DogCutsceneParticle[],
  originX: number,
  originY: number,
  scale = 1,
  color?: string,
  clockwise = Math.random() < 0.5
): void {
  const angle = Math.random() * Math.PI * 2
  const radius = 55 + Math.random() * 300 * scale
  list.push({
    kind: 'orbit_star',
    x: originX + Math.cos(angle) * radius,
    y: originY + Math.sin(angle) * radius * 0.76,
    centerX: originX,
    centerY: originY,
    radius,
    angle,
    angularSpeed: (1.5 + Math.random() * 2.3) * (clockwise ? 1 : -1),
    radialSpeed: (30 + Math.random() * 70) * scale,
    size: (4 + Math.random() * 6) * scale,
    timer: 0,
    duration: 1.1 + Math.random() * 1.6,
    color: color ?? ['#34D399', '#FACC15', '#A78BFA', '#E0F2FE'][Math.floor(Math.random() * 4)]
  })
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
  difficultyId = 'normal',
  autoStart = true
}) => {
  const activeArea = getAreaById(areaId)
  const areaRef = useRef(activeArea)
  areaRef.current = activeArea

  const activeDifficulty = getDifficultyById(difficultyId)
  const difficultyRef = useRef(activeDifficulty)
  difficultyRef.current = activeDifficulty

  const { user } = useSupabase()
  const { authorized: isDevUser, settings: devSettings } = useDevSettings(user?.email)
  const {
    playSound,
    playMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    youtubePlaybackStarted,
    youtubeCurrentTime
  } = useAudio()
  const toast = useToast()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const astralGalaxyImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const galaxyImage = new Image()
    galaxyImage.decoding = 'async'
    galaxyImage.src = astralGalaxyBackgroundUrl
    astralGalaxyImageRef.current = galaxyImage
    return () => {
      astralGalaxyImageRef.current = null
    }
  }, [])

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
  const [activeBossHud, setActiveBossHud] = useState<ActiveBossHudState | null>(null)
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[]>([])
  const [finalScore, setFinalScore] = useState<number>(0)
  const [isVictory, setIsVictory] = useState<boolean>(false)
  const [isEndlessMode, setIsEndlessMode] = useState<boolean>(false)
  const [dogCutsceneUi, setDogCutsceneUi] = useState<{
    active: boolean
    showSecondLine: boolean
    opacity: number
    theme: BossCutsceneTheme
  } | null>(null)
  const [finalStats, setFinalStats] = useState<GameOverStats>({
    survivalSeconds: 0,
    coinsCollected: 0,
    enemiesDefeated: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    damageBlocked: 0,
    bossesDefeated: 0,
    totalHits: 0,
    criticalHits: 0,
    highestHit: 0,
    levelReached: 1,
    damageFreeWaveStreak: 0,
    upgrades: []
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
  const solarFlailsRef = useRef<SolarFlailFx[]>([])
  const tornadoesRef = useRef<TornadoFx[]>([])
  const meteorsRef = useRef<StarfallMeteorFx[]>([])
  const tempestSpheresRef = useRef<TempestSphereFx[]>([])
  const prismBladeHitCooldownsRef = useRef<Map<Enemy, number>>(new Map())
  const area2UnlockedRef = useRef<boolean>(false)
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
  const dogCutsceneRef = useRef<{
    active: boolean
    kind: BossCutsceneKind
    theme: BossCutsceneTheme
    elapsed: number
    wallElapsed: number
    duration: number
    line2Delay: number
    portalX: number
    portalY: number
    triggeredPhase2Sound: boolean
    lastOpacityStep: number
    particleAccumulator: number
    pulseStep: number
  } | null>(null)
  const dogPostDropRef = useRef<{
    elapsed: number
    duration: number
    line2Delay: number
    theme: BossCutsceneTheme
  } | null>(null)
  const dogCutsceneParticlesRef = useRef<DogCutsceneParticle[]>([])
  const dogGroundCracksRef = useRef<DogGroundCrack[]>([])

  const timeSurvivedRef = useRef<number>(0)
  const coinsCollectedRef = useRef<number>(0)
  const coinsBankedRef = useRef<number>(0)
  const bonusCoinCarryRef = useRef<number>(0)
  const hpRegenCarryRef = useRef<number>(0)
  const equippedBonusesRef = useRef<ComputedAccessoryBonuses>(computeEquippedAccessoryBonuses([]))
  const masteryBonusesRef = useRef<HeroMasteryBonuses>(computeHeroMasteryBonuses('hero_01', 0))
  const heroUpgradeLevelRef = useRef<number>(0)
  const baseHeroSpeedRef = useRef<number>(GAME_CONFIG.BASE_PLAYER_SPEED)
  const equippedWeaponIdRef = useRef<string | null>(null)
  const equippedWeaponStarsRef = useRef<number>(0)
  const startingWeaponIdsRef = useRef<Set<string>>(new Set())
  const enemiesDefeatedRef = useRef<number>(0)
  const bossesDefeatedRef = useRef<number>(0)
  const totalDamageDealtRef = useRef<number>(0)
  const totalDamageTakenRef = useRef<number>(0)
  const damageBlockedRef = useRef<number>(0)
  const totalHitsRef = useRef<number>(0)
  const criticalHitsRef = useRef<number>(0)
  const highestHitRef = useRef<number>(0)
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
  const playMusicRef = useRef(playMusic)
  playMusicRef.current = playMusic
  const stopMusicRef = useRef(stopMusic)
  stopMusicRef.current = stopMusic
  const pauseMusicRef = useRef(pauseMusic)
  pauseMusicRef.current = pauseMusic
  const resumeMusicRef = useRef(resumeMusic)
  resumeMusicRef.current = resumeMusic
  const youtubePlaybackStartedRef = useRef<boolean>(youtubePlaybackStarted)
  youtubePlaybackStartedRef.current = youtubePlaybackStarted
  const youtubeCurrentTimeRef = useRef<number | null>(youtubeCurrentTime)
  youtubeCurrentTimeRef.current = youtubeCurrentTime
  const dogBossActiveRef = useRef<boolean>(false)

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
    const basePool = getAvailableRunUpgrades({
      areaId: areaRef.current.id,
      wave15Cleared: area2UnlockedRef.current
    })
    const candidatePool = [
      ...basePool,
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
      dogBossActiveRef.current = false
      stopMusicRef.current()
      setDevRunStatus({ isInRun: false })
      setIsVictory(victory)
      setEngineState('gameover')
      playSoundRef.current(victory ? 'levelup' : 'gameover')

      const survived = Math.floor(timeSurvivedRef.current)
      const collected = coinsCollectedRef.current
      const defeated = enemiesDefeatedRef.current
      const computedScore = calculateScoreFormula(survived, collected)
      const summaryUpgrades = activeUpgradesRef.current.map((u) => {
        const lv = upgradeLevelsRef.current[u.id] || 1
        return {
          id: u.id,
          name: u.name,
          category: u.category,
          level: lv,
          isMaxLevel: lv >= MAX_WEAPON_UPGRADE_LEVEL,
          isEquippedWeapon: u.id === equippedWeaponIdRef.current
        }
      })

      setTimeSurvived(survived)
      setScore(computedScore)
      setFinalScore(computedScore)
      setFinalStats({
        survivalSeconds: survived,
        coinsCollected: collected,
        enemiesDefeated: defeated,
        totalDamageDealt: Math.round(totalDamageDealtRef.current),
        totalDamageTaken: Math.round(totalDamageTakenRef.current),
        damageBlocked: Math.round(damageBlockedRef.current),
        bossesDefeated: bossesDefeatedRef.current,
        totalHits: totalHitsRef.current,
        criticalHits: criticalHitsRef.current,
        highestHit: Math.round(highestHitRef.current),
        levelReached: levelRef.current,
        damageFreeWaveStreak: longestDamageFreeStreakRef.current,
        heroName:
          playerRef.current?.hero?.name ||
          ALL_HEROES.find((h) => h.id === (selectedHeroId || 'hero_01'))?.name ||
          'Operative',
        areaName: areaRef.current.name,
        upgrades: summaryUpgrades
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
            const areaMaxWave = getAreaMaxWave(areaRef.current.id)
            const heroUnlocks = checkAndSyncMilestoneHeroUnlocks(
              user?.id || 'guest_user',
              Math.max(waveRef.current, victory ? areaMaxWave : waveRef.current)
            )
            toast.success(
              victory
                ? areaRef.current.id === 'astral_citadel'
                  ? `VICTORY! Astral Scourge Vanquished — Wave ${areaMaxWave} Cleared! Score: ${computedScore.toLocaleString()}`
                  : `VICTORY! Wave ${areaMaxWave} Cleared — Area 2 Unlocked! Score: ${computedScore.toLocaleString()}`
                : `Mission logged! Final Score: ${computedScore.toLocaleString()}`
            )
            for (const unlockedHero of heroUnlocks) {
              toast.success(`HERO UNLOCKED: ${unlockedHero.name}!`)
            }
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

  const syncPlayerMountedWeapons = useCallback((player: Player | null) => {
    if (!player) return
    const eqId = equippedWeaponIdRef.current
    const mounted = activeUpgradesRef.current
      .filter((u) => u.id.startsWith('wpn_') || startingWeaponIdsRef.current.has(u.id))
      .map((u) => ({
        id: u.id,
        level: upgradeLevelsRef.current[u.id] || 1
      }))
    if (eqId) {
      mounted.sort((a, b) => (a.id === eqId ? -1 : b.id === eqId ? 1 : 0))
    }
    player.setActiveWeapons(mounted)
  }, [])

  const syncSummonsForUpgrade = useCallback(
    (upgrade: UpgradesRow, player: Player | null, level = 1) => {
      if (!player) return
      const pc = player.getCenter()
      const heroId = player.hero?.id || selectedHeroId || 'hero_01'
      const isEngineer = heroId === 'hero_03'
      const heroUpgradeLv = heroUpgradeLevelRef.current
      const engineerBonuses = isEngineer ? getEngineerSummonBonuses(heroUpgradeLv) : null
      const passiveCritBonuses = getPassiveCritUpgradeBonuses(upgradeLevelsRef.current)
      const dmgMult =
        (equippedBonusesRef.current.damageMultiplier +
          masteryBonusesRef.current.damageMultiplier +
          passiveCritBonuses.weaponDamageMultiplierBonus) *
        (engineerBonuses ? engineerBonuses.damageMultiplier : 1)
      const rateMult =
        (equippedBonusesRef.current.cooldownRateMultiplier +
          masteryBonusesRef.current.fireRateMultiplier) *
        (engineerBonuses ? engineerBonuses.fireRateMultiplier : 1)
      const scaledDmg = Math.max(1, Math.round(upgrade.damage * dmgMult))

      if (upgrade.id === 'upg_01') {
        const desiredBots = getSummonCountForUpgrade(upgrade.id, level, heroId, heroUpgradeLv)
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
        const desiredEchoes = getSummonCountForUpgrade(upgrade.id, level, heroId, heroUpgradeLv)
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
        const desiredTurrets = getSummonCountForUpgrade(upgrade.id, level, heroId, heroUpgradeLv)
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
      } else if (upgrade.id === 'upg_a2_02') {
        const desiredStriders = getSummonCountForUpgrade(upgrade.id, level, heroId, heroUpgradeLv)
        let current = summonsRef.current.filter((s) => s.kind === 'laser_strider')
        while (current.length < desiredStriders) {
          const offsetAngle = (current.length / Math.max(1, desiredStriders)) * Math.PI * 2
          summonsRef.current.push(
            new Summon({
              kind: 'laser_strider',
              upgradeId: upgrade.id,
              x: pc.x + Math.cos(offsetAngle) * 86,
              y: pc.y + Math.sin(offsetAngle) * 86,
              damage: scaledDmg,
              cooldown: (upgrade.cooldown_s || 0.72) / rateMult,
              level
            })
          )
          current = summonsRef.current.filter((s) => s.kind === 'laser_strider')
        }
        current.forEach((strider, idx) => {
          strider.slotIndex = idx
          strider.totalSlots = current.length
          strider.damage = scaledDmg
          strider.cooldown = Math.max(0.2, (upgrade.cooldown_s || 0.9) / rateMult)
          strider.level = level
        })
      } else if (upgrade.id === 'wpn_grim_reaper') {
        const reaperCfg = getGrimReaperWeaponConfig(scaledDmg, level, heroId)
        const desiredReapers = reaperCfg.reaperCount
        let current = summonsRef.current.filter((s) => s.kind === 'grim_reaper')
        while (current.length < desiredReapers) {
          const offsetAngle = (current.length / Math.max(1, desiredReapers)) * Math.PI * 2
          summonsRef.current.push(
            new Summon({
              kind: 'grim_reaper',
              upgradeId: upgrade.id,
              x: pc.x + Math.cos(offsetAngle) * 88,
              y: pc.y + Math.sin(offsetAngle) * 88,
              damage: reaperCfg.damage,
              cooldown: ((upgrade.cooldown_s || 1.05) * reaperCfg.cooldownScale) / rateMult,
              level,
              isPairedHero: reaperCfg.isPairedHero,
              scytheCount: reaperCfg.scytheCount,
              siphonTargetCount: reaperCfg.siphonTargets,
              healPerTarget: reaperCfg.healPerTarget
            })
          )
          current = summonsRef.current.filter((s) => s.kind === 'grim_reaper')
        }
        current.forEach((reaper, idx) => {
          reaper.slotIndex = idx
          reaper.totalSlots = current.length
          reaper.damage = reaperCfg.damage
          reaper.cooldown = Math.max(
            0.22,
            ((upgrade.cooldown_s || 1.05) * reaperCfg.cooldownScale) / rateMult
          )
          reaper.level = level
          reaper.isPairedHero = reaperCfg.isPairedHero
          reaper.scytheCount = reaperCfg.scytheCount
          reaper.siphonTargetCount = reaperCfg.siphonTargets
          reaper.healPerTarget = reaperCfg.healPerTarget
        })
      }
    },
    [selectedHeroId]
  )

  const spawnEnemyForWave = useCallback(
    (waveNumber: number, forceBoss = false, allowRanged = true) => {
      const player = playerRef.current
      if (!player) return
      if (
        dogBossActiveRef.current ||
        enemiesRef.current.some((e) => e.isAlive && e.isDevourerOfGods)
      ) {
        return
      }

      const areaMeta = areaRef.current
      const isAreaTwo = areaMeta.id === 'astral_citadel'
      const areaMaxWave = getAreaMaxWave(areaMeta.id)
      const bossTemplate = forceBoss ? getAreaBossTemplateForWave(areaMeta.id, waveNumber) : null
      const isWave15AreaTwoBoss =
        isAreaTwo && forceBoss && waveNumber === 15 && bossTemplate?.id === 'boss_a2_15'
      const isFinalAreaBoss = forceBoss && waveNumber === areaMaxWave && !endlessModeRef.current
      const isWormBoss = bossTemplate?.id === ASTRAL_SCOURGE_BOSS_ID
      const isStationaryArenaBoss = (isFinalAreaBoss || isWave15AreaTwoBoss) && !isWormBoss
      const bossArena = bossArenaRef.current
      const playerCenter = player.getCenter()

      let spawnX: number
      let spawnY: number
      if (isStationaryArenaBoss && bossArena) {
        spawnX = bossArena.left + bossArena.width / 2 - 46
        spawnY = bossArena.top + 195 - 46
      } else if (isFinalAreaBoss && isWormBoss) {
        spawnX = Math.max(140, Math.min(ARENA_SIZE - 140, playerCenter.x)) - 38
        spawnY = Math.max(120, Math.min(ARENA_SIZE - 160, playerCenter.y - 235)) - 38
      } else {
        const angle = Math.random() * Math.PI * 2
        const distance = forceBoss ? 320 : 260 + Math.random() * 200
        spawnX = Math.max(40, Math.min(ARENA_SIZE - 80, playerCenter.x + Math.cos(angle) * distance))
        spawnY = Math.max(40, Math.min(ARENA_SIZE - 80, playerCenter.y + Math.sin(angle) * distance))
      }

      let template = isAreaTwo ? AREA_TWO_ENEMIES[0] : seedEnemies[0]
      if (bossTemplate) {
        template = bossTemplate
      } else {
        const rangedLimit = getWaveRangedSpawnLimit(waveNumber) + (isAreaTwo ? 3 : 0)
        const underRangedCap = allowRanged && rangedSpawnedInWaveRef.current < rangedLimit
        const waveProgress = Math.min(1, waveElapsedRef.current / WAVE_CONFIG.WAVE_DURATION_SECONDS)
        const expectedRangedSoFar = Math.floor(waveProgress * rangedLimit)

        if (isAreaTwo) {
          const activeMiniBossCount = enemiesRef.current.filter(
            (e) => e.isAlive && e.isMiniBoss && !e.isBoss
          ).length
          const miniBossCap = getAreaMiniBossCap(waveNumber)
          const needsGuaranteedMiniBoss =
            allowRanged && waveNumber >= 3 && waveElapsedRef.current >= 5 && activeMiniBossCount === 0

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
        isStationaryArenaBoss && bossArena
          ? {
              x: bossArena.left + bossArena.width / 2,
              y: bossArena.top + Math.max(210, Math.round(bossArena.height * 0.27))
            }
          : null

      const enemy = new Enemy({
        x: spawnX,
        y: spawnY,
        enemyData: template,
        target: player,
        isBoss: forceBoss,
        isStationaryBoss: isStationaryArenaBoss,
        isFinalBoss: isFinalAreaBoss,
        isWave15SpecialBoss: isWave15AreaTwoBoss,
        anchorPos,
        arenaBounds: isStationaryArenaBoss ? bossArena : null
      })

      const beginAreaBossCutscene = (theme: BossCutsceneTheme) => {
        if (dogBossActiveRef.current) return
        const duration = theme.durationSeconds ?? WAVE_15_CUTSCENE_DURATION_SECONDS
        const focusPos = anchorPos || enemy.getCenter()
        enemy.isSpawning = true
        enemy.spawnTime = 0
        enemy.spawnDelay = duration
        enemy.cutsceneDelayTimer = duration
        player.isInvulnerable = true
        player.invulnerabilityTimer = Math.max(player.invulnerabilityTimer, duration + 0.5)
        dogCutsceneRef.current = {
          active: true,
          kind: theme.kind,
          theme,
          elapsed: 0,
          wallElapsed: 0,
          duration,
          line2Delay: theme.revealDelaySeconds ?? 1.6,
          portalX: focusPos.x,
          portalY: focusPos.y,
          triggeredPhase2Sound: false,
          lastOpacityStep: 100,
          particleAccumulator: 0,
          pulseStep: 0
        }
        dogPostDropRef.current = null
        dogCutsceneParticlesRef.current = []
        dogGroundCracksRef.current = createDogGroundCracks(
          focusPos.x,
          focusPos.y,
          8,
          220,
          duration + 1.8,
          [theme.primaryColor, theme.secondaryColor]
        )
        if (theme.kind === 'w15_seraph') {
          pushSeraphSolarBurst(dogCutsceneParticlesRef.current, focusPos.x, focusPos.y, 0.9)
        } else {
          pushBossAreaInfernoBurst(dogCutsceneParticlesRef.current, focusPos.x, focusPos.y, {
            flames: 32,
            embers: 28,
            speedScale: 0.95,
            palette: theme.palette,
            coreColor: theme.coreColor,
            shockwaves: [
              { maxRadius: 230, color: theme.primaryColor, lineWidth: 4.5, duration: 0.65 }
            ]
          })
        }
        setDogCutsceneUi({
          active: true,
          showSecondLine: false,
          opacity: 1,
          theme
        })
      }

      // Overtime, wave, area & difficulty progression scaling
      const scaling = getEnemyScaling(waveNumber, timeSurvivedRef.current)
      const diffMeta = difficultyRef.current
      if (isFinalAreaBoss) {
        const finalCombat = getAreaFinalBossCombatProfile(areaMeta.id)
        const finalHp = isWormBoss
          ? ASTRAL_SCOURGE_PHASE_ONE_HP
          : Math.round(
              getAreaFinalBossHp(areaMeta.id) *
                finalCombat.hpMultiplier *
                diffMeta.enemyHpMultiplier
            )
        enemy.maxHealth = finalHp
        enemy.health = finalHp
        enemy.damage = Math.round(
          (isWormBoss ? 36 : 32) *
            Math.min(2.5, scaling.damageMultiplier * 0.7) *
            areaMeta.enemyDamageMultiplier *
            diffMeta.enemyDamageMultiplier *
            finalCombat.damageMultiplier
        )
        enemy.powerScale = finalHp / 2300
        enemy.damageScale =
          Math.min(2.4, scaling.damageMultiplier * 0.6) *
          areaMeta.enemyDamageMultiplier *
          diffMeta.enemyDamageMultiplier *
          finalCombat.damageMultiplier
        enemy.coinValue = Math.round(
          (isWormBoss ? 450 : 250) * areaMeta.coinBonusMultiplier * finalCombat.coinMultiplier
        )
        enemy.damageReduction = finalCombat.damageReduction
        enemy.enableEnrage = true
        enemy.shootCooldownMax = Math.max(0.9, enemy.shootCooldownMax * finalCombat.shootCooldownScale)
        enemy.specialCooldownMax = Math.max(
          2.0,
          enemy.specialCooldownMax * finalCombat.specialCooldownScale
        )
        enemy.bossTier = isAreaTwo ? 4 : 3
        enemy.bossTitle =
          areaMeta.id === 'astral_citadel'
            ? 'ASTRAL SCOURGE — FINAL BOSS (W20)'
            : 'OMEGA OVERLORD — FINAL BOSS (W15)'

        beginAreaBossCutscene(getAreaFinalBossCutsceneTheme(areaMeta.id))
      } else {
        const bossBuff = forceBoss
          ? isAreaTwo
            ? getAreaTwoBossBuff(waveNumber)
            : getAreaOneBossBuff(waveNumber, false)
          : null
        enemy.maxHealth = Math.max(
          1,
          Math.round(
            enemy.maxHealth *
              scaling.hpMultiplier *
              areaMeta.enemyHpMultiplier *
              diffMeta.enemyHpMultiplier *
              (bossBuff ? bossBuff.hpMultiplier : 1)
          )
        )
        enemy.health = enemy.maxHealth
        enemy.baseSpeed *=
          scaling.speedMultiplier *
          areaMeta.enemySpeedMultiplier *
          diffMeta.enemySpeedMultiplier *
          (bossBuff ? bossBuff.speedMultiplier : 1)
        enemy.speed = enemy.baseSpeed
        enemy.damage = Math.max(
          1,
          Math.round(
            enemy.damage *
              scaling.damageMultiplier *
              areaMeta.enemyDamageMultiplier *
              diffMeta.enemyDamageMultiplier *
              (bossBuff ? bossBuff.damageMultiplier : 1)
          )
        )
        enemy.coinValue = Math.max(
          1,
          Math.round(
            enemy.coinValue * areaMeta.coinBonusMultiplier * (bossBuff ? bossBuff.coinMultiplier : 1)
          )
        )
        enemy.powerScale =
          scaling.hpMultiplier *
          areaMeta.enemyHpMultiplier *
          diffMeta.enemyHpMultiplier *
          (bossBuff ? bossBuff.hpMultiplier : 1)
        enemy.damageScale =
          scaling.damageMultiplier *
          areaMeta.enemyDamageMultiplier *
          diffMeta.enemyDamageMultiplier *
          (bossBuff ? bossBuff.damageMultiplier : 1)

        if (bossBuff) {
          enemy.damageReduction = bossBuff.damageReduction
          enemy.enableEnrage = bossBuff.enableEnrage
          enemy.shootCooldownMax = Math.max(0.85, enemy.shootCooldownMax * bossBuff.shootCooldownScale)
          enemy.specialCooldownMax = Math.max(2.2, enemy.specialCooldownMax * bossBuff.specialCooldownScale)
        }

        if (forceBoss) {
          const tier = Math.max(1, Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL))
          enemy.bossTier = tier
          enemy.bossTitle = isAreaTwo
            ? template.id === ASTRAL_SCOURGE_BOSS_ID
              ? `ASTRAL SCOURGE (W${waveNumber})`
              : template.id === 'boss_a2_15'
                ? `SOLAR ARCHON SERAPH (W${waveNumber})`
                : template.id === 'boss_a2_10'
                  ? `ASTRAL VORTEX COLOSSUS (W${waveNumber})`
                  : `EMERALD PRISM MONARCH (W${waveNumber})`
            : tier >= 3
              ? `APEX LEVIATHAN (W${waveNumber})`
              : tier === 2
                ? `OMEGA DREADNOUGHT (W${waveNumber})`
                : `AEGIS COMMANDER (W${waveNumber})`
        }

        if (isWave15AreaTwoBoss) {
          enemy.bossTitle = 'SOLAR ARCHON SERAPH — WAVE 15 APEX'
          beginAreaBossCutscene(getWave15CutsceneTheme('astral_citadel'))
        }
      }

      enemiesRef.current.push(enemy)
      if (forceBoss && !dogBossActiveRef.current) {
        playMusicRef.current(enemy.isAstralScourge ? 'astral_scourge' : 'boss')
      }
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

    const telemetry = getLocalPlayerTelemetry(effectiveUserId)
    area2UnlockedRef.current =
      areaRef.current.id === 'astral_citadel' || Boolean(telemetry.wave_15_cleared)

    const allKnownUpgrades = [
      ...seedUpgrades,
      ...AREA_TWO_UPGRADES,
      ...UNIVERSAL_CRIT_UPGRADES,
      ...shopWeaponsAsUpgrades(starOverrides)
    ]
    const hero = ALL_HEROES.find((h) => h.id === selectedHeroId) || ALL_HEROES[0]
    const masteryProgress = getHeroMasteryProgress(effectiveUserId, hero.id)
    masteryBonusesRef.current = masteryProgress.totalBonuses
    heroUpgradeLevelRef.current = getHeroUpgradeLevel(effectiveUserId, hero.id)

    const startingUpgradeIds = resolveStartingUpgradeIds({
      heroStartingUpgradeId: hero.starting_upgrade_id,
      loadoutUpgradeId: startingUpgradeId,
      equippedWeaponId: shopState.equippedWeaponId
    })
    startingWeaponIdsRef.current = new Set(
      startingUpgradeIds.filter((id) => isVisiblePlayerWeaponId(id))
    )
    const initialUpgrades: UpgradesRow[] = startingUpgradeIds
      .map((id) => allKnownUpgrades.find((u) => u.id === id))
      .filter((u): u is UpgradesRow => Boolean(u))
    if (initialUpgrades.length === 0) {
      initialUpgrades.push(seedUpgrades[0])
    }

    const newPlayer = new Player({
      x: ARENA_SIZE / 2 - 20,
      y: ARENA_SIZE / 2 - 20,
      hero
    })
    baseHeroSpeedRef.current = newPlayer.speed
    const totalBonusHp = bonuses.bonusHp + masteryBonusesRef.current.bonusHp
    if (totalBonusHp > 0) {
      newPlayer.maxHealth += totalBonusHp
      newPlayer.health = newPlayer.maxHealth
    }
    basePlayerMaxHealthRef.current = newPlayer.maxHealth
    if (isDevUserRef.current && devSettingsRef.current.healthMultiplier > 1) {
      newPlayer.maxHealth = Math.round(
        basePlayerMaxHealthRef.current * devSettingsRef.current.healthMultiplier
      )
      newPlayer.health = newPlayer.maxHealth
    }
    newPlayer.speed *= bonuses.speedMultiplier + masteryBonusesRef.current.speedMultiplier

    const rect = containerRef.current?.getBoundingClientRect()
    canvas.width = Math.max(320, Math.floor(rect?.width || window.innerWidth))
    canvas.height = Math.max(480, Math.floor(rect?.height || window.innerHeight - 116))

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
      getChronoCloneConfig(heroUpgradeLevelRef.current).spawnInterval -
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
    solarFlailsRef.current = []
    tornadoesRef.current = []
    meteorsRef.current = []
    tempestSpheresRef.current = []
    prismBladeHitCooldownsRef.current.clear()
    playerTrailRef.current = [newPlayer.getCenter()]
    explosionsRef.current = []
    attackEffectsRef.current = []
    floatingTextsRef.current = []
    cryoDotTimerRef.current = 0

    const clonedStartUpgrades: UpgradesRow[] = initialUpgrades.map((upg) => {
      const stats = getUpgradeLevelStats(upg.damage, upg.cooldown_s, 1)
      return {
        ...upg,
        damage: stats.damage,
        cooldown_s: stats.cooldown_s
      }
    })
    activeUpgradesRef.current = clonedStartUpgrades
    upgradeLevelsRef.current = {}
    upgradeCooldownsRef.current = {}
    clonedStartUpgrades.forEach((upg, idx) => {
      upgradeLevelsRef.current[upg.id] = 1
      upgradeCooldownsRef.current[upg.id] = 0.08 + idx * 0.04
      syncSummonsForUpgrade(upg, newPlayer, 1)
    })
    syncPlayerMountedWeapons(newPlayer)

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
    dogCutsceneRef.current = null
    dogPostDropRef.current = null
    dogCutsceneParticlesRef.current = []
    dogGroundCracksRef.current = []
    dogBossActiveRef.current = false
    setDogCutsceneUi(null)
    setIsVictory(false)

    timeSurvivedRef.current = 0
    coinsCollectedRef.current = 0
    coinsBankedRef.current = 0
    bonusCoinCarryRef.current = 0
    hpRegenCarryRef.current = 0
    enemiesDefeatedRef.current = 0
    bossesDefeatedRef.current = 0
    totalDamageDealtRef.current = 0
    totalDamageTakenRef.current = 0
    damageBlockedRef.current = 0
    totalHitsRef.current = 0
    criticalHitsRef.current = 0
    highestHitRef.current = 0
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
    setActiveUpgradeNames(clonedStartUpgrades.map((u) => `${u.name} Lv.1`))
    setShieldActive(
      clonedStartUpgrades.some((u) => u.id === 'upg_11' || u.id === 'upg_15')
    )
    setActiveBossHud(null)

    const warpToWaveInternal = (targetWave: number) => {
      const safeWave = Math.max(1, Math.floor(targetWave))
      const areaMaxWave = getAreaMaxWave(areaRef.current.id)
      const isFinalWave = safeWave === areaMaxWave
      const isEndless = safeWave > areaMaxWave
      const locksBossArena = isFinalWave && areaRef.current.id !== 'astral_citadel'

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

      if (isFinalWave) {
        if (locksBossArena) {
          const aw = canvas.width
          const ah = canvas.height
          const pcNow = newPlayer.getCenter()
          const left = Math.max(24, Math.min(ARENA_SIZE - aw - 24, pcNow.x - aw / 2))
          const top = Math.max(24, Math.min(ARENA_SIZE - ah - 24, pcNow.y - ah / 2))
          bossArenaRef.current = { left, top, width: aw, height: ah }
          const bossAnchorX = left + aw / 2
          const bossAnchorY = top + Math.max(210, Math.round(ah * 0.27))
          if (Math.hypot(pcNow.x - bossAnchorX, pcNow.y - bossAnchorY) < 130) {
            newPlayer.y = Math.min(top + ah - newPlayer.height - 40, bossAnchorY + 185)
          }
        } else {
          bossArenaRef.current = null
        }
        finalBossSpawnedRef.current = true
        bossSpawnedWaveRef.current = areaMaxWave
        spawnEnemyForWave(areaMaxWave, true)
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

    const areaMaxWave = getAreaMaxWave(areaRef.current.id)
    const isStartBossWave =
      startWave === areaMaxWave || startWave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0
    if (!isStartBossWave) {
      playMusicRef.current('gameplay')
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
    syncPlayerMountedWeapons,
    syncSummonsForUpgrade,
    user?.id
  ])

  // Flush any earned battle coins and clear live Dev run state when leaving the arena
  useEffect(() => {
    return () => {
      flushBankedCoins()
      stopMusicRef.current()
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
        const areaMaxWave = getAreaMaxWave(areaRef.current.id)
        const isFinalWave = targetWave === areaMaxWave
        const isEndless = targetWave > areaMaxWave
        const locksBossArena = isFinalWave && areaRef.current.id !== 'astral_citadel'

        enemiesRef.current = []
        playerProjectilesRef.current = []
        dogCutsceneRef.current = null
        dogPostDropRef.current = null
        dogCutsceneParticlesRef.current = []
        dogGroundCracksRef.current = []
        setDogCutsceneUi(null)
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

        if (isFinalWave) {
          if (locksBossArena && canvas) {
            const aw = canvas.width
            const ah = canvas.height
            const pcNow = player.getCenter()
            const left = Math.max(24, Math.min(ARENA_SIZE - aw - 24, pcNow.x - aw / 2))
            const top = Math.max(24, Math.min(ARENA_SIZE - ah - 24, pcNow.y - ah / 2))
            bossArenaRef.current = { left, top, width: aw, height: ah }
            const bossAnchorX = left + aw / 2
            const bossAnchorY = top + Math.max(210, Math.round(ah * 0.27))
            if (Math.hypot(pcNow.x - bossAnchorX, pcNow.y - bossAnchorY) < 130) {
              player.y = Math.min(top + ah - player.height - 40, bossAnchorY + 185)
            }
          } else {
            bossArenaRef.current = null
          }
          finalBossSpawnedRef.current = true
          bossSpawnedWaveRef.current = areaMaxWave
          spawnEnemyForWave(areaMaxWave, true)
        } else {
          bossArenaRef.current = null
          finalBossSpawnedRef.current = false
          dogBossActiveRef.current = false
          bossSpawnedWaveRef.current = targetWave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0 ? targetWave : 0
          const burst = getWaveSpawnConfig(targetWave, timeSurvivedRef.current).waveBurst
          for (let i = 0; i < burst; i++) {
            spawnEnemyForWave(targetWave, false, false)
          }
          if (targetWave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0) {
            spawnEnemyForWave(targetWave, true)
          } else {
            playMusicRef.current('gameplay')
          }
        }
        playSoundRef.current('wave')
      } else if (action.type === 'spawn_enemy') {
        const spawnOpt = getDevSpawnableEnemyById(action.enemyId)
        if (!spawnOpt) return

        const pc = player.getCenter()
        const areaMeta = areaRef.current
        const diffMeta = difficultyRef.current
        const scaling = getEnemyScaling(waveRef.current, timeSurvivedRef.current)

        if (spawnOpt.id === SECRET_DEVOURER_OF_GODS_ID) {
          const portalX = Math.max(140, Math.min(ARENA_SIZE - 140, pc.x))
          const portalY = Math.max(120, Math.min(ARENA_SIZE - 160, pc.y - 235))
          const boss = new Enemy({
            x: portalX - 38,
            y: portalY - 38,
            enemyData: SECRET_DEVOURER_OF_GODS_TEMPLATE,
            target: player,
            isBoss: true
          })
          boss.maxHealth = Math.max(
            100000,
            Math.round(boss.maxHealth * diffMeta.enemyHpMultiplier)
          )
          boss.health = boss.maxHealth
          boss.damage = Math.max(24, Math.round(46 * diffMeta.enemyDamageMultiplier))
          boss.powerScale = Math.max(2.0, boss.maxHealth / 400000)
          boss.damageScale = Math.max(1.2, diffMeta.enemyDamageMultiplier * 1.4)
          boss.coinValue = Math.round(
            SECRET_DEVOURER_OF_GODS_TEMPLATE.coin_value * areaMeta.coinBonusMultiplier
          )
          const cutsceneDur = DEVOURER_CUTSCENE_DURATION_SECONDS
          boss.isSpawning = true
          boss.spawnTime = 0
          boss.spawnDelay = cutsceneDur
          boss.cutsceneDelayTimer = cutsceneDur

          // Clear all currently alive enemies and pause arena/wave spawns while Devourer of Gods reigns
          enemiesRef.current = [boss]
          bossArenaRef.current = null
          spawnAccumulatorRef.current = 0
          if (isBreatherRef.current) {
            isBreatherRef.current = false
            breatherElapsedRef.current = 0
            setIsBreather(false)
          }

          player.isInvulnerable = true
          player.invulnerabilityTimer = cutsceneDur + 0.5
          dogCutsceneRef.current = {
            active: true,
            kind: 'dog',
            theme: DEVOURER_CUTSCENE_THEME,
            elapsed: 0,
            wallElapsed: 0,
            duration: cutsceneDur,
            line2Delay: 3.4,
            portalX,
            portalY,
            triggeredPhase2Sound: false,
            lastOpacityStep: 100,
            particleAccumulator: 0,
            pulseStep: 0
          }
          dogPostDropRef.current = null
          dogCutsceneParticlesRef.current = []
          dogGroundCracksRef.current = createDogGroundCracks(
            portalX,
            portalY,
            8,
            230,
            cutsceneDur + 1.8,
            [DEVOURER_CUTSCENE_THEME.primaryColor, DEVOURER_CUTSCENE_THEME.secondaryColor]
          )
          pushDogDestructiveBurst(dogCutsceneParticlesRef.current, portalX, portalY, {
            shards: 28,
            sparks: 24,
            bolts: 6,
            speedScale: 0.95,
            palette: DEVOURER_CUTSCENE_THEME.palette,
            shockwaves: [
              {
                maxRadius: 230,
                color: DEVOURER_CUTSCENE_THEME.secondaryColor,
                lineWidth: 4.5,
                duration: 0.65
              }
            ]
          })
          dogBossActiveRef.current = true
          setDogCutsceneUi({
            active: true,
            showSecondLine: false,
            opacity: 1,
            theme: DEVOURER_CUTSCENE_THEME
          })
          playMusicRef.current('universal_collapse')
          return
        }

        const count = spawnOpt.isBoss
          ? 1
          : Math.max(1, Math.min(25, Math.round(action.count ?? 1)))
        for (let k = 0; k < count; k++) {
          const angle = (k / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.45
          const dist = spawnOpt.isBoss ? 300 : 210 + Math.random() * 140
          const sx = Math.max(40, Math.min(ARENA_SIZE - 80, pc.x + Math.cos(angle) * dist))
          const sy = Math.max(40, Math.min(ARENA_SIZE - 80, pc.y + Math.sin(angle) * dist))
          const spawned = new Enemy({
            x: sx,
            y: sy,
            enemyData: spawnOpt.template,
            target: player,
            isBoss: spawnOpt.isBoss
          })

          const isDevAstralScourge = spawnOpt.id === ASTRAL_SCOURGE_BOSS_ID
          const bossBuff = spawnOpt.isBoss
            ? spawnOpt.id === 'ene_04'
              ? getAreaOneBossBuff(waveRef.current, false)
              : isDevAstralScourge
                ? getAreaFinalBossCombatProfile('astral_citadel')
                : spawnOpt.id.startsWith('boss_a2_')
                  ? getAreaTwoBossBuff(waveRef.current)
                  : null
            : null

          if (isDevAstralScourge) {
            const finalHp = Math.round(
              getAreaFinalBossHp('astral_citadel') *
                (bossBuff ? bossBuff.hpMultiplier : 1) *
                diffMeta.enemyHpMultiplier
            )
            spawned.maxHealth = finalHp
            spawned.health = finalHp
            spawned.damage = Math.max(
              20,
              Math.round(
                36 *
                  Math.min(2.5, scaling.damageMultiplier * 0.7) *
                  areaMeta.enemyDamageMultiplier *
                  diffMeta.enemyDamageMultiplier *
                  (bossBuff ? bossBuff.damageMultiplier : 1)
              )
            )
            spawned.coinValue = Math.round(
              450 * areaMeta.coinBonusMultiplier * (bossBuff ? bossBuff.coinMultiplier : 1)
            )
            spawned.powerScale = finalHp / 2300
            spawned.damageScale =
              Math.min(2.4, scaling.damageMultiplier * 0.6) *
              areaMeta.enemyDamageMultiplier *
              diffMeta.enemyDamageMultiplier *
              (bossBuff ? bossBuff.damageMultiplier : 1)
            spawned.spawnDelay = 0.5
            spawned.cutsceneDelayTimer = 0
          } else {
            spawned.maxHealth = Math.max(
              1,
              Math.round(
                spawned.maxHealth *
                  scaling.hpMultiplier *
                  areaMeta.enemyHpMultiplier *
                  diffMeta.enemyHpMultiplier *
                  (bossBuff ? bossBuff.hpMultiplier : 1)
              )
            )
            spawned.health = spawned.maxHealth
            spawned.baseSpeed *=
              scaling.speedMultiplier *
              areaMeta.enemySpeedMultiplier *
              diffMeta.enemySpeedMultiplier *
              (bossBuff && 'speedMultiplier' in bossBuff ? bossBuff.speedMultiplier : 1)
            spawned.speed = spawned.baseSpeed
            spawned.damage = Math.max(
              1,
              Math.round(
                spawned.damage *
                  scaling.damageMultiplier *
                  areaMeta.enemyDamageMultiplier *
                  diffMeta.enemyDamageMultiplier *
                  (bossBuff ? bossBuff.damageMultiplier : 1)
              )
            )
            spawned.coinValue = Math.max(
              1,
              Math.round(
                spawned.coinValue *
                  areaMeta.coinBonusMultiplier *
                  (bossBuff ? bossBuff.coinMultiplier : 1)
              )
            )
            spawned.powerScale =
              scaling.hpMultiplier *
              areaMeta.enemyHpMultiplier *
              diffMeta.enemyHpMultiplier *
              (bossBuff ? bossBuff.hpMultiplier : 1)
            spawned.damageScale =
              scaling.damageMultiplier *
              areaMeta.enemyDamageMultiplier *
              diffMeta.enemyDamageMultiplier *
              (bossBuff ? bossBuff.damageMultiplier : 1)
          }

          if (bossBuff) {
            spawned.damageReduction = bossBuff.damageReduction
            if ('enableEnrage' in bossBuff) {
              spawned.enableEnrage = bossBuff.enableEnrage
            }
            spawned.shootCooldownMax = Math.max(
              0.85,
              spawned.shootCooldownMax * bossBuff.shootCooldownScale
            )
            spawned.specialCooldownMax = Math.max(
              2.2,
              spawned.specialCooldownMax * bossBuff.specialCooldownScale
            )
          }

          if (spawnOpt.isBoss) {
            spawned.bossTitle = spawnOpt.name.toUpperCase()
            spawned.bossTier = isDevAstralScourge
              ? 4
              : Math.max(1, Math.floor(waveRef.current / WAVE_CONFIG.BOSS_WAVE_INTERVAL))
          }

          enemiesRef.current.push(spawned)
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

  // Responsive ResizeObserver + window resize so canvas fills enlarged container without resetting Camera position
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const w = Math.max(320, Math.floor(rect.width))
      const h = Math.max(480, Math.floor(rect.height))
      if (canvasRef.current.width !== w || canvasRef.current.height !== h) {
        canvasRef.current.width = w
        canvasRef.current.height = h
      }
      if (cameraRef.current) {
        cameraRef.current.width = w
        cameraRef.current.height = h
      }
    }

    handleResize()
    const observer =
      typeof ResizeObserver !== 'undefined' && containerRef.current
        ? new ResizeObserver(() => handleResize())
        : null
    if (observer && containerRef.current) {
      observer.observe(containerRef.current)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      observer?.disconnect()
    }
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
    const paladinCfg = getPaladinConfig(heroUpgradeLevelRef.current)
    dashDirRef.current = dir
    dashTimerRef.current = HERO_ABILITY_CONSTANTS.PALADIN_DASH_DURATION
    dashCooldownRef.current = paladinCfg.dashCooldown
    dashHitEnemiesRef.current.clear()

    player.facingAngle = Math.atan2(dir.y, dir.x)
    player.isInvulnerable = true
    player.invulnerabilityTimer = Math.max(
      player.invulnerabilityTimer,
      HERO_ABILITY_CONSTANTS.PALADIN_DASH_IFRAMES
    )
    setDashCooldown(paladinCfg.dashCooldown)

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

    const startAstralScourgePhaseTwoCutscene = (enemy: Enemy) => {
      enemy.pendingAstralPhaseTwoCutscene = false
      const theme = getAstralScourgePhaseTwoCutsceneTheme()
      const duration = ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS
      const player = playerRef.current
      const playerCenter = player?.getCenter() || enemy.getCenter()
      const startX = Math.max(140, Math.min(ARENA_SIZE - 140, playerCenter.x - 440))
      const endX = Math.max(140, Math.min(ARENA_SIZE - 140, playerCenter.x + 440))
      const endY = Math.max(180, Math.min(ARENA_SIZE - 140, playerCenter.y + 420))
      enemy.beginAstralScourgePhaseTwoRush(
        { x: startX, y: -160 },
        { x: endX, y: endY }
      )

      if (player) {
        player.isInvulnerable = true
        player.invulnerabilityTimer = Math.max(player.invulnerabilityTimer, duration + 0.5)
      }
      dogCutsceneRef.current = {
        active: true,
        kind: theme.kind,
        theme,
        elapsed: 0,
        wallElapsed: 0,
        duration,
        line2Delay: 0.8,
        portalX: playerCenter.x,
        portalY: playerCenter.y,
        triggeredPhase2Sound: false,
        lastOpacityStep: 100,
        particleAccumulator: 0,
        pulseStep: 0
      }
      dogPostDropRef.current = null
      dogCutsceneParticlesRef.current = []
      dogGroundCracksRef.current = createDogGroundCracks(
        playerCenter.x,
        playerCenter.y,
        14,
        390,
        duration + 1.6,
        [theme.primaryColor, theme.secondaryColor]
      )
      pushAstralPhaseTwoRiftBurst(dogCutsceneParticlesRef.current, playerCenter.x, playerCenter.y, 1.1)
      explosionsRef.current.push({
        x: playerCenter.x,
        y: playerCenter.y,
        radius: 380,
        timer: 0,
        duration: 0.8,
        color: 'rgba(52, 211, 153, 0.8)'
      })
      setDogCutsceneUi({
        active: true,
        showSecondLine: false,
        opacity: 1,
        theme
      })
      playSoundRef.current('wave')
    }

    const damageEnemy = (
      enemy: Enemy,
      amount: number,
      knockbackFrom?: { x: number; y: number },
      options?: {
        isBurnTick?: boolean
        isStormProc?: boolean
        color?: string
        critChanceBonus?: number
        critDamageBonus?: number
        canCrit?: boolean
      }
    ) => {
      if (!enemy.isAlive) return
      const devMult = isDevUserRef.current ? devSettingsRef.current.damageMultiplier : 1
      const baseScaledDamage = Math.max(1, Math.round(amount * devMult))
      const passiveCrit = getPassiveCritUpgradeBonuses(upgradeLevelsRef.current)
      const activeHeroId = playerRef.current?.hero?.id || 'hero_01'
      const heroCrit = getHeroCritBonuses(activeHeroId, heroUpgradeLevelRef.current)
      const critRoll = rollCriticalHit({
        baseDamage: baseScaledDamage,
        heroCritChance: heroCrit.critChanceBonus,
        accessoryCritChance: equippedBonusesRef.current.critChance,
        upgradeCritChance: passiveCrit.critChanceBonus,
        weaponCritChance: options?.critChanceBonus ?? 0,
        heroCritDamageBonus: heroCrit.critDamageBonus,
        accessoryCritDamageBonus: equippedBonusesRef.current.critDamageBonus,
        upgradeCritDamageBonus: passiveCrit.critDamageBonus,
        weaponCritDamageBonus: options?.critDamageBonus ?? 0,
        canCrit: options?.canCrit ?? (!options?.isBurnTick && !options?.isStormProc)
      })
      const finalDamage = critRoll.damage
      const displayedDamage =
        enemy.damageReduction > 0
          ? Math.max(1, Math.round(finalDamage * (1 - Math.min(0.75, Math.max(0, enemy.damageReduction)))))
          : finalDamage
      const effectiveHitDamage =
        enemy.phaseTransitionTimer > 0
          ? Math.max(1, Math.round(displayedDamage * 0.15))
          : displayedDamage
      const wasSpawningBeforeHit = enemy.isSpawning
      const wasKilled = enemy.takeDamage(finalDamage)
      if (enemy.pendingAstralScourgePhaseOneDeath) {
        enemy.pendingAstralScourgePhaseOneDeath = false
        const focus = enemy.getCenter()
        const player = playerRef.current
        if (player) {
          player.isInvulnerable = true
          player.invulnerabilityTimer = Math.max(
            player.invulnerabilityTimer,
            enemy.astralPhaseTwoActivationTimer + 0.4
          )
        }
        explosionsRef.current.push({
          x: focus.x,
          y: focus.y,
          radius: 300,
          timer: 0,
          duration: 0.75,
          color: 'rgba(250, 204, 21, 0.82)'
        })
      }
      if (!wasSpawningBeforeHit) {
        totalDamageDealtRef.current += effectiveHitDamage
        totalHitsRef.current += 1
        if (critRoll.isCrit) {
          criticalHitsRef.current += 1
        }
        if (effectiveHitDamage > highestHitRef.current) {
          highestHitRef.current = effectiveHitDamage
        }
      }
      playSoundRef.current('hit')

      const textDuration = critRoll.isCrit
        ? CRIT_CONFIG.CRIT_TEXT_DURATION
        : CRIT_CONFIG.NORMAL_TEXT_DURATION
      floatingTextsRef.current.push({
        x: enemy.getCenter().x,
        y: enemy.y - 6,
        text: formatDamageFloatingText(displayedDamage, critRoll.isCrit),
        color: critRoll.isCrit
          ? CRIT_CONFIG.CRIT_TEXT_COLOR
          : options?.color || (devMult > 1 ? '#FACC15' : '#FFFFFF'),
        timer: textDuration,
        maxTimer: textDuration,
        isCrit: critRoll.isCrit,
        swayPhase: critRoll.isCrit ? Math.random() * Math.PI * 2 : 0
      })

      // Storm Assassin: Critical hits trigger Storm Overload lightning arcs, shockwave burst, and solo Thunderstrike
      if (
        critRoll.isCrit &&
        !options?.isBurnTick &&
        !options?.isStormProc &&
        activeHeroId === 'hero_07'
      ) {
        const stormCfg = getStormAssassinConfig(heroUpgradeLevelRef.current)
        const originCenter = enemy.getCenter()
        const arcDamage = Math.max(1, Math.round(finalDamage * stormCfg.stormArcDamageRatio))
        const nearbyTargets = enemiesRef.current
          .filter((other) => other !== enemy && other.isAlive && !other.isSpawning)
          .map((other) => ({
            enemy: other,
            center: other.getCenter(),
            dist: Math.hypot(
              other.getCenter().x - originCenter.x,
              other.getCenter().y - originCenter.y
            )
          }))
          .filter((item) => item.dist <= stormCfg.arcRadius)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, stormCfg.stormArcTargets)

        const shockedEnemies = new Set<Enemy>()
        if (nearbyTargets.length > 0) {
          const arcPoints: Array<{ x: number; y: number }> = [originCenter]
          for (const targetItem of nearbyTargets) {
            arcPoints.push(targetItem.center)
            shockedEnemies.add(targetItem.enemy)
            damageEnemy(targetItem.enemy, arcDamage, originCenter, {
              isStormProc: true,
              canCrit: false,
              color: '#38BDF8'
            })
          }
          attackEffectsRef.current.push({
            kind: 'lightning',
            points: arcPoints,
            color: '#A855F7',
            timer: 0,
            duration: 0.24
          })
        }

        // Electric crit micro-shockwave + pulse ring on critical hit
        const shockDamage = Math.max(1, Math.round(finalDamage * stormCfg.shockwaveDamageRatio))
        attackEffectsRef.current.push({
          kind: 'lightning_pulse_wave',
          x: originCenter.x,
          y: originCenter.y,
          radius: stormCfg.shockwaveRadius,
          color: '#A855F7',
          secondaryColor: '#38BDF8',
          timer: 0,
          duration: 0.26
        })
        for (const other of enemiesRef.current) {
          if (other === enemy || shockedEnemies.has(other) || !other.isAlive || other.isSpawning) {
            continue
          }
          const oc = other.getCenter()
          if (Math.hypot(oc.x - originCenter.x, oc.y - originCenter.y) <= stormCfg.shockwaveRadius + other.width / 2) {
            damageEnemy(other, shockDamage, originCenter, {
              isStormProc: true,
              canCrit: false,
              color: '#C084FC'
            })
          }
        }

        // Single-target / Boss Overcharge Thunderstrike when fewer extra targets exist around the crit victim
        if (nearbyTargets.length < stormCfg.stormArcTargets && enemy.isAlive) {
          const strikeDamage = Math.max(1, Math.round(finalDamage * stormCfg.bossStrikeRatio))
          attackEffectsRef.current.push({
            kind: 'lightning',
            points: [
              { x: originCenter.x + 16, y: originCenter.y - 250 },
              { x: originCenter.x - 10, y: originCenter.y - 125 },
              originCenter
            ],
            color: '#E879F9',
            timer: 0,
            duration: 0.26
          })
          damageEnemy(enemy, strikeDamage, undefined, {
            isStormProc: true,
            canCrit: false,
            color: '#E879F9'
          })
        }
      }

      // Pyrotechnic Specialist: every weapon hit ignites the enemy for scorching burn damage
      if (
        !options?.isBurnTick &&
        !wasKilled &&
        !enemy.isSpawning &&
        activeHeroId === 'hero_06'
      ) {
        const pyroCfg = getPyroBurnConfig(heroUpgradeLevelRef.current)
        enemy.applyBurn(
          computeHeroBurnPerTick(finalDamage, heroUpgradeLevelRef.current),
          pyroCfg.duration
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
        if (enemy.isBoss) {
          bossesDefeatedRef.current += 1
        }
        if (enemy.isBoss || enemy.isMiniBoss) {
          const loot = awardBossDropsForEnemy(
            user?.id || 'guest_user',
            enemy.enemyId,
            enemy.isFinalBoss
          )
          if (loot.success) {
            const bossSet = PLAYABLE_BOSS_DROP_SETS.find((boss) =>
              boss.materials.some((material) => material.id === loot.materials?.[0])
            )
            toast.success(`${bossSet?.name || 'Boss'} defeated — 3 crafting materials added to your Armory.`)
          }
        }
        const baseXpGain = enemy.isBoss ? LEVEL_UP_CONFIG.XP_PER_BOSS_KILL : LEVEL_UP_CONFIG.XP_PER_ENEMY_KILL
        const totalXpMult =
          equippedBonusesRef.current.xpMultiplier + masteryBonusesRef.current.xpMultiplier
        const xpGain = Math.max(1, Math.round(baseXpGain * totalXpMult))
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

        if (enemy.isDevourerOfGods) {
          explosionsRef.current.push({
            x: coinCenter.x,
            y: coinCenter.y,
            radius: 260,
            timer: 0,
            duration: 0.7,
            color: 'rgba(34, 211, 238, 0.72)'
          })
          playSoundRef.current('levelup')
          toast.success('DEVOURER OF GODS VANQUISHED! +1,000 Coin drop!')
          const anyDogLeft = enemiesRef.current.some(
            (other) => other !== enemy && other.isAlive && other.isDevourerOfGods
          )
          if (!anyDogLeft) {
            dogBossActiveRef.current = false
            spawnAccumulatorRef.current = 0
            const anyRegularBossLeft = enemiesRef.current.some(
              (other) => other !== enemy && other.isAlive && other.isBoss
            )
            playMusicRef.current(anyRegularBossLeft ? 'boss' : 'gameplay')
          }
        } else if (enemy.isBoss && !enemy.isFinalBoss && !dogBossActiveRef.current) {
          const anyBossLeft = enemiesRef.current.some(
            (other) => other !== enemy && other.isAlive && other.isBoss
          )
          if (!anyBossLeft) {
            playMusicRef.current('gameplay')
          }
        }

        // Victory trigger upon defeating the Wave 15 Final Boss!
        if (enemy.isFinalBoss) {
          const totalBonusCoinChanceW15 =
            equippedBonusesRef.current.bonusCoinChance + masteryBonusesRef.current.bonusCoinChance
          const w15Payout = computeDifficultyCoinPayout({
            baseCoinValue: enemy.coinValue,
            difficultyId: difficultyRef.current.id,
            bonusCoinChance: totalBonusCoinChanceW15,
            carry: bonusCoinCarryRef.current
          })
          bonusCoinCarryRef.current = w15Payout.nextCarry
          coinsCollectedRef.current += w15Payout.coinsAwarded
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
          area2UnlockedRef.current = true
          const heroIdForMastery = playerRef.current?.hero?.id || selectedHeroId || 'hero_01'
          const bossMastery = recordHeroRoundsCompleted(
            user?.id || 'guest_user',
            heroIdForMastery,
            1
          )
          masteryBonusesRef.current = bossMastery.progress.totalBonuses
          if (bossMastery.unlockedNewTier) {
            toast.success(
              `Mastery Tier ${bossMastery.unlockedNewTier.tier} Unlocked: ${bossMastery.unlockedNewTier.title} (${bossMastery.unlockedNewTier.summary})`
            )
          }
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
      if (dogCutsceneRef.current?.active) return false
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
          damageBlockedRef.current += Math.max(1, Math.round(amount))
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

      const heroDr = getHeroDamageReduction(
        player.hero?.id || 'hero_01',
        heroUpgradeLevelRef.current
      )
      const dmgReduction = Math.min(
        0.85,
        equippedBonusesRef.current.damageReduction + masteryBonusesRef.current.damageReduction + heroDr
      )
      const rawIncomingDmg = Math.max(1, Math.round(amount))
      const finalIncomingDmg = Math.max(1, Math.round(amount * (1 - dmgReduction)))
      damageBlockedRef.current += Math.max(0, rawIncomingDmg - finalIncomingDmg)
      totalDamageTakenRef.current += finalIncomingDmg
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
      const passiveCritBonuses = getPassiveCritUpgradeBonuses(upgradeLevelsRef.current)
      const weaponCrit = getWeaponCritProfile(upg.id)
      const totalWeaponDmgMult =
        equippedBonusesRef.current.damageMultiplier +
        masteryBonusesRef.current.damageMultiplier +
        passiveCritBonuses.weaponDamageMultiplierBonus
      const weaponDmg = Math.max(1, Math.round(scaledBaseDmg * totalWeaponDmgMult))
      const triggerMount = (aim?: number) => {
        if (!isCloneCast) {
          player.triggerWeaponAction(upg.id, aim ?? player.facingAngle)
        }
      }

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
          triggerMount(baseAngle)
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
          triggerMount(Math.atan2(targets[0].enemy.getCenter().y - pc.y, targets[0].enemy.getCenter().x - pc.x))
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
          triggerMount(baseAngle)
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
          triggerMount(baseAngle)
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
          triggerMount(baseAngle)
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
          triggerMount(nearest ? Math.atan2(targetCenter.y - pc.y, targetCenter.x - pc.x) : player.facingAngle)
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
          triggerMount(baseAngle)
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
          triggerMount(baseAngle)
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
              color: isCloneCast ? '#C084FC' : undefined,
              critChanceBonus: weaponCrit.critChanceBonus,
              critDamageBonus: weaponCrit.critDamageBonus
            })
          }
          triggerMount(nearest ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x) : startAngle)
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
          triggerMount(nearest ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x) : player.facingAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_cryo_railgun': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const barrelCount = isLv5 ? 3 : lv >= 3 ? 2 : 1
          const span = (barrelCount - 1) * 0.14
          for (let i = 0; i < barrelCount; i++) {
            const off = barrelCount === 1 ? 0 : -span / 2 + (i / (barrelCount - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 22 + lv * 2,
                height: 10,
                speed: 680 + lv * 26,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#E0F2FE' : '#38BDF8',
                maxLifetime: 1.05,
                maxPierces: 4 + lv + (isLv5 ? 1 : 0),
                explosionRadius: 34 + lv * 8,
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus,
                type: 'IceShard'
              })
            )
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_permafrost_spire': {
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const count = isLv5 ? 3 : lv >= 3 ? 2 : 1
          const span = (count - 1) * 0.18
          const freezeDuration = 1.5 + (lv - 1) * 0.15
          for (let i = 0; i < count; i++) {
            const off = count === 1 ? 0 : -span / 2 + (i / (count - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 18 + lv * 2,
                height: 14 + lv,
                speed: 560 + lv * 26,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#E0F2FE' : '#38BDF8',
                maxLifetime: 1.05,
                maxPierces: 3 + lv,
                explosionRadius: 52 + lv * 12,
                explodeAtEnd: true,
                freezeDuration,
                type: 'IceShard'
              })
            )
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_solar_flail': {
          // Legendary Solar Flare Flail: Launches spinning spiked solar mace(s) on a molten chain
          // toward enemies, erupting into a fire AoE ONLY at full extension before whipping back.
          const targetCenter = nearest ? nearest.getCenter() : null
          const baseAngle = targetCenter
            ? Math.atan2(targetCenter.y - pc.y, targetCenter.x - pc.x)
            : player.facingAngle
          const flailCount = isLv5 ? 3 : lv >= 3 ? 2 : 1
          const spreadSpan = flailCount === 1 ? 0 : flailCount === 2 ? 0.55 : 0.78
          const targetDist = targetCenter ? Math.hypot(targetCenter.x - pc.x, targetCenter.y - pc.y) : 230
          const reach = Math.max(190, Math.min(360, targetDist + 65 + lv * 18))
          const burnDamage = Math.max(isCloneCast ? 5 : 10, Math.round(weaponDmg * 0.42))
          const burnRadius = 64 + lv * 16
          const burnDuration = 2.6 + lv * 0.35

          for (let f = 0; f < flailCount; f++) {
            const offset =
              flailCount === 1 ? 0 : -spreadSpan / 2 + (f / (flailCount - 1)) * spreadSpan
            const launchAngle = baseAngle + offset
            solarFlailsRef.current.push({
              x: pc.x,
              y: pc.y,
              originX: pc.x,
              originY: pc.y,
              angle: launchAngle,
              maxDistance: reach,
              traveled: 0,
              phase: 'outbound',
              apexTimer: 0,
              apexDuration: 0.2,
              speed: 620 + lv * 34,
              spinAngle: f * 1.4,
              headRadius: 22 + lv * 3.2,
              damage: weaponDmg,
              burnDamage,
              burnRadius,
              burnDuration,
              isLv5,
              isCloneCast,
              cloneId,
              trailDropDist: 0,
              critChanceBonus: weaponCrit.critChanceBonus,
              critDamageBonus: weaponCrit.critDamageBonus,
              hitCooldowns: new Map(),
              timer: 0,
              trail: [{ x: pc.x, y: pc.y }]
            })
          }

          explosionsRef.current.push({
            x: pc.x,
            y: pc.y,
            radius: 44 + lv * 6,
            timer: 0,
            duration: 0.22,
            color: isCloneCast ? 'rgba(192, 132, 252, 0.55)' : 'rgba(251, 146, 60, 0.65)'
          })
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_crimson_railblade': {
          // Rare Crimson Precision Edge: high-crit mono-edge slash + piercing crimson wave projectile
          const targetCenter = nearest ? nearest.getCenter() : null
          const baseAngle = targetCenter
            ? Math.atan2(targetCenter.y - pc.y, targetCenter.x - pc.x)
            : player.facingAngle
          const cleaveRadius = 112 + lv * 16
          attackEffectsRef.current.push({
            kind: 'slash',
            x: pc.x,
            y: pc.y,
            angle: baseAngle,
            radius: cleaveRadius,
            color: isCloneCast ? '#C084FC' : isLv5 ? '#FFD700' : '#FF2E43',
            timer: 0,
            duration: 0.26
          })
          for (const e of aliveEnemies) {
            if (Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y) <= cleaveRadius + e.width / 2) {
              damageEnemy(e, weaponDmg, pc, {
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus
              })
            }
          }
          const waveCount = isLv5 ? 3 : lv >= 3 ? 2 : 1
          const waveSpan = waveCount === 1 ? 0 : (waveCount - 1) * 0.24
          for (let i = 0; i < waveCount; i++) {
            const off = waveCount === 1 ? 0 : -waveSpan / 2 + (i / (waveCount - 1)) * waveSpan
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 18 + lv * 1.5,
                height: 12,
                speed: 560 + lv * 22,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: Math.max(1, Math.round(weaponDmg * 0.85)),
                color: isLv5 ? '#FFD700' : '#FF2E43',
                maxLifetime: 0.72,
                maxPierces: 3 + lv,
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus,
                type: 'ChronoBlade'
              })
            )
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_phantom_sniper': {
          // Epic Deadeye Phantom Railrifle: hyper-velocity piercing bolts with extreme crit chance
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const boltCount = isLv5 ? 3 : lv >= 4 ? 2 : 1
          const span = boltCount === 1 ? 0 : (boltCount - 1) * 0.1
          for (let i = 0; i < boltCount; i++) {
            const off = boltCount === 1 ? 0 : -span / 2 + (i / (boltCount - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 24 + lv * 2,
                height: 7,
                speed: 820 + lv * 35,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#F43F5E',
                maxLifetime: 1.15,
                maxPierces: 4 + lv * 2,
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus,
                type: 'Laser'
              })
            )
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_void_reaper': {
          const targetCenter = nearest ? nearest.getCenter() : pc
          const baseAngle = nearest
            ? Math.atan2(targetCenter.y - pc.y, targetCenter.x - pc.x)
            : timeSurvivedRef.current * 4
          const cleaveRadius = 105 + lv * 20
          attackEffectsRef.current.push({
            kind: 'slash',
            x: pc.x,
            y: pc.y,
            angle: baseAngle,
            radius: cleaveRadius,
            color: isCloneCast ? '#C084FC' : isLv5 ? '#FFD700' : '#A855F7',
            timer: 0,
            duration: 0.28
          })
          for (const e of aliveEnemies) {
            if (Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y) <= cleaveRadius + e.width / 2) {
              damageEnemy(e, weaponDmg, pc, {
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus
              })
            }
          }
          const vortexRadius = 90 + lv * 18
          const vortexCenters =
            isLv5 || lv >= 3
              ? [
                  { x: targetCenter.x - 60, y: targetCenter.y },
                  { x: targetCenter.x + 60, y: targetCenter.y }
                ]
              : [targetCenter]
          for (const vc of vortexCenters) {
            voidVorticesRef.current.push({
              x: vc.x,
              y: vc.y,
              radius: vortexRadius,
              timer: 0,
              duration: 2.0 + lv * 0.15,
              damage: Math.max(1, Math.round(weaponDmg * 0.72)),
              isLv5
            })
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_crafted_solar_void_reaper': {
          const targetCenter = nearest
            ? nearest.getCenter()
            : {
                x: pc.x + Math.cos(player.facingAngle) * 240,
                y: pc.y + Math.sin(player.facingAngle) * 240
              }
          const baseAngle = Math.atan2(targetCenter.y - pc.y, targetCenter.x - pc.x)
          const cleaveRadius = 142 + lv * 18
          attackEffectsRef.current.push({
            kind: 'slash',
            x: pc.x,
            y: pc.y,
            angle: baseAngle,
            radius: cleaveRadius,
            color: isCloneCast ? '#C084FC' : isLv5 ? '#FEF08A' : '#F97316',
            timer: 0,
            duration: 0.32
          })
          for (const e of aliveEnemies) {
            if (Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y) <= cleaveRadius + e.width / 2) {
              damageEnemy(e, weaponDmg, pc, {
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus
              })
            }
          }

          voidVorticesRef.current.push({
            x: targetCenter.x,
            y: targetCenter.y,
            radius: 92 + lv * 15,
            timer: 0,
            duration: 1.8 + lv * 0.12,
            damage: Math.max(1, Math.round(weaponDmg * 0.52)),
            isLv5
          })

          const targetDist = Math.hypot(targetCenter.x - pc.x, targetCenter.y - pc.y)
          solarFlailsRef.current.push({
            x: pc.x,
            y: pc.y,
            originX: pc.x,
            originY: pc.y,
            angle: baseAngle,
            maxDistance: Math.max(185, Math.min(320, targetDist + 45 + lv * 12)),
            traveled: 0,
            phase: 'outbound',
            apexTimer: 0,
            apexDuration: 0.22,
            speed: 560 + lv * 30,
            spinAngle: 0,
            headRadius: 24 + lv * 2,
            damage: Math.max(1, Math.round(weaponDmg * 0.8)),
            burnDamage: Math.max(4, Math.round(weaponDmg * 0.24)),
            burnRadius: 56 + lv * 10,
            burnDuration: 2 + lv * 0.2,
            isLv5,
            isCloneCast,
            cloneId,
            trailDropDist: 0,
            critChanceBonus: weaponCrit.critChanceBonus,
            critDamageBonus: weaponCrit.critDamageBonus,
            hitCooldowns: new Map(),
            timer: 0,
            trail: [{ x: pc.x, y: pc.y }]
          })

          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_muramasa': {
          const heroId = player.hero?.id || 'hero_01'
          const muramasaCfg = getMuramasaWeaponConfig(weaponDmg, lv, heroId)
          const baseAngle = nearest
            ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x)
            : player.facingAngle
          for (let w = 0; w < muramasaCfg.waveCount; w++) {
            const angleOffset =
              muramasaCfg.waveCount === 1
                ? 0
                : w === 0
                  ? 0
                  : w === 1
                    ? Math.PI
                    : (w % 2 === 0 ? 0.55 : -0.55)
            const waveAngle = baseAngle + angleOffset
            attackEffectsRef.current.push({
              kind: 'muramasa_slash',
              x: pc.x,
              y: pc.y,
              angle: waveAngle,
              radius: muramasaCfg.radius,
              color: isCloneCast ? '#C084FC' : w === 0 ? '#FF2E63' : '#FB7185',
              timer: 0,
              duration: 0.34
            })
          }
          if (muramasaCfg.isPairedHero) {
            explosionsRef.current.push({
              x: pc.x,
              y: pc.y,
              radius: muramasaCfg.radius * 0.82,
              timer: 0,
              duration: 0.26,
              color: isCloneCast ? 'rgba(192, 132, 252, 0.35)' : 'rgba(255, 46, 99, 0.36)'
            })
          }
          for (const e of aliveEnemies) {
            const d = Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y)
            if (d <= muramasaCfg.radius + e.width / 2) {
              damageEnemy(e, muramasaCfg.damage, pc, {
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus
              })
            }
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'wpn_tempest_sphere': {
          const heroId = player.hero?.id || 'hero_01'
          const sphereCfg = getTempestSphereWeaponConfig(weaponDmg, lv, heroId)
          const sortedTargets = [...aliveEnemies].sort((a, b) => {
            const da = Math.hypot(a.getCenter().x - pc.x, a.getCenter().y - pc.y)
            const db = Math.hypot(b.getCenter().x - pc.x, b.getCenter().y - pc.y)
            return da - db
          })
          for (let s = 0; s < sphereCfg.sphereCount; s++) {
            const pick =
              sortedTargets.length > 0
                ? sortedTargets[(s * 2) % sortedTargets.length].getCenter()
                : {
                    x: pc.x + Math.cos(player.facingAngle + s * 0.9) * 180,
                    y: pc.y + Math.sin(player.facingAngle + s * 0.9) * 180
                  }
            const jitterX = s > 0 ? Math.cos(s * 2.2) * 34 : 0
            const jitterY = s > 0 ? Math.sin(s * 2.2) * 34 : 0
            const tx = pick.x + jitterX
            const ty = pick.y + jitterY
            tempestSpheresRef.current.push({
              targetX: tx,
              targetY: ty,
              startX: tx - 34 + (s % 2 === 0 ? -18 : 18),
              startY: ty - 440,
              impactRadius: sphereCfg.impactRadius,
              pulseRadius: sphereCfg.pulseRadius,
              timer: -s * 0.08,
              fallTime: 0.3,
              impactDamage: sphereCfg.impactDamage,
              pulseDamage: sphereCfg.pulseDamage,
              critChanceBonus: weaponCrit.critChanceBonus,
              critDamageBonus: weaponCrit.critDamageBonus,
              isPairedHero: sphereCfg.isPairedHero,
              isLv5,
              isCloneCast
            })
          }
          triggerMount(
            sortedTargets.length > 0
              ? Math.atan2(sortedTargets[0].getCenter().y - pc.y, sortedTargets[0].getCenter().x - pc.x)
              : player.facingAngle
          )
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
          triggerMount(baseAngle)
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
          triggerMount(nearest ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x) : startAngle)
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
            const pulseDmg = Math.max(1, Math.round(lv * 10 * damageScale * totalWeaponDmgMult))
            for (const e of aliveEnemies) {
              if (Math.hypot(e.getCenter().x - pc.x, e.getCenter().y - pc.y) <= radius + e.width / 2) {
                damageEnemy(e, pulseDmg, pc)
              }
            }
          }
          triggerMount()
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
          triggerMount(baseAngle)
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
            damageEnemy(item.enemy, weaponDmg, pc)
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
          if (chainPoints.length > 1) {
            triggerMount(Math.atan2(chainPoints[1].y - pc.y, chainPoints[1].x - pc.x))
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
                damageEnemy(e, weaponDmg, strike)
              }
            }
          }
          triggerMount(Math.atan2(targetPos.y - pc.y, targetPos.x - pc.x))
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
            Math.round(weaponDmg * (streamCount === 1 ? 1 : 0.65))
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
          triggerMount(baseAngle)
          return
        }
        case 'upg_12': {
          // Arc Slash - Vanguard Blade gains Muramasa Bloodmoon Slash buff & bonus resonance with Mythic Muramasa
          const heroId = player.hero?.id || 'hero_01'
          const arcCfg = getArcSlashConfig(weaponDmg, lv, heroId, heroUpgradeLevelRef.current)
          const pairResonance = getPairedHeroArcSlashBonus(
            heroId,
            activeUpgradesRef.current.map((u) => u.id)
          )
          const finalArcDamage = Math.max(1, Math.round(arcCfg.damage * pairResonance))
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
              damageEnemy(e, finalArcDamage, pc, {
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus
              })
            }
          }
          triggerMount(slashAngle)
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
          triggerMount(baseAngle)
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
          triggerMount(baseAngle)
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
          triggerMount(Math.atan2(targetCenter.y - pc.y, targetCenter.x - pc.x))
          playSoundRef.current('shoot')
          return
        }
        case 'upg_18': {
          // Frost Nova Spire: 4 -> 6 -> 8 -> 10 -> 12 radial crystalline ice shards that freeze foes
          const count = 2 + lv * 2
          const freezeDuration = 0.85 + (lv - 1) * 0.15
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
                freezeDuration,
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
          triggerMount()
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
            damageEnemy(item.enemy, weaponDmg)
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
          triggerMount(Math.atan2(targets[0].enemy.getCenter().y - pc.y, targets[0].enemy.getCenter().x - pc.x))
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
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'upg_a2_01': {
          // Cyclone Tempest: spawns howling bouncing plasma tornadoes
          const tornadoCount = isLv5 ? 3 : lv >= 3 ? 2 : 1
          const baseAngle = nearest
            ? Math.atan2(nearest.getCenter().y - pc.y, nearest.getCenter().x - pc.x)
            : timeSurvivedRef.current * 2.1
          const speed = 245 + lv * 22
          const radius = 64 + lv * 14
          const duration = 3.6 + lv * 0.28
          const tickDmg = Math.max(isCloneCast ? 5 : 10, Math.round(weaponDmg * 0.72))

          for (let t = 0; t < tornadoCount; t++) {
            const ang =
              baseAngle +
              (tornadoCount === 1
                ? 0
                : tornadoCount === 2
                  ? (t === 0 ? -0.45 : 0.45)
                  : (t - 1) * 0.95)
            tornadoesRef.current.push({
              x: pc.x + Math.cos(ang) * 28,
              y: pc.y + Math.sin(ang) * 28,
              vx: Math.cos(ang) * speed,
              vy: Math.sin(ang) * speed,
              radius,
              timer: 0,
              duration,
              damage: tickDmg,
              isLv5,
              isCloneCast,
              hitCooldowns: new Map()
            })
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'upg_a2_03': {
          // Astral Javelin: hurls piercing spears that burst into an AoE shockwave at the end
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const spearCount = isLv5 ? 4 : lv >= 4 ? 3 : lv >= 3 ? 2 : 1
          const spreadSpan = spearCount === 1 ? 0 : (spearCount - 1) * 0.16
          const pierces = isLv5 ? 14 : 3 + lv * 2
          const endBurstRadius = 66 + lv * 18

          for (let i = 0; i < spearCount; i++) {
            const off =
              spearCount === 1 ? 0 : -spreadSpan / 2 + (i / (spearCount - 1)) * spreadSpan
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 15 + lv,
                height: 11 + lv * 0.6,
                speed: 620 + lv * 24,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#FFD700' : '#34D399',
                maxLifetime: 0.78 + lv * 0.06,
                maxPierces: pierces,
                explosionRadius: endBurstRadius,
                explodeAtEnd: true,
                critChanceBonus: weaponCrit.critChanceBonus,
                critDamageBonus: weaponCrit.critDamageBonus,
                type: 'Spear'
              })
            )
          }
          triggerMount(baseAngle)
          playSoundRef.current('shoot')
          return
        }
        case 'upg_a2_04': {
          // Starfall Meteor: calls down blazing emerald-gold meteors on enemy clusters
          const meteorCount = lv
          const meteorRadius = 78 + lv * 17
          const candidates = [...aliveEnemies].sort((a, b) => {
            const da = Math.hypot(a.getCenter().x - pc.x, a.getCenter().y - pc.y)
            const db = Math.hypot(b.getCenter().x - pc.x, b.getCenter().y - pc.y)
            return da - db
          })
          for (let m = 0; m < meteorCount; m++) {
            const pick =
              candidates.length > 0
                ? candidates[(m * 2) % candidates.length].getCenter()
                : {
                    x: pc.x + Math.cos(m * 1.4) * 140,
                    y: pc.y + Math.sin(m * 1.4) * 140
                  }
            meteorsRef.current.push({
              targetX: pick.x + (m > 0 ? Math.cos(m * 2.1) * 28 : 0),
              targetY: pick.y + (m > 0 ? Math.sin(m * 2.1) * 28 : 0),
              radius: meteorRadius,
              timer: -m * 0.06,
              impactTime: 0.24,
              damage: weaponDmg,
              isLv5,
              isCloneCast
            })
          }
          triggerMount(
            candidates.length > 0
              ? Math.atan2(candidates[0].getCenter().y - pc.y, candidates[0].getCenter().x - pc.x)
              : player.facingAngle
          )
          playSoundRef.current('shoot')
          return
        }
        case 'upg_a2_06': {
          // Permafrost Cryo-Nova: launches frost orbs that detonate in freezing cryo-novas
          if (!nearest) return
          const ec = nearest.getCenter()
          const baseAngle = Math.atan2(ec.y - pc.y, ec.x - pc.x)
          const orbCount = isLv5 ? 4 : lv >= 4 ? 3 : lv >= 2 ? 2 : 1
          const span = orbCount === 1 ? 0 : (orbCount - 1) * 0.22
          const novaRadius = 78 + lv * 18
          const freezeDuration = 1.5 + (lv - 1) * 0.175
          for (let i = 0; i < orbCount; i++) {
            const off = orbCount === 1 ? 0 : -span / 2 + (i / (orbCount - 1)) * span
            const a = baseAngle + off
            playerProjectilesRef.current.push(
              new Projectile({
                x: pc.x,
                y: pc.y,
                width: 18 + lv * 1.5,
                height: 18 + lv * 1.5,
                speed: 380 + lv * 22,
                direction: { x: Math.cos(a), y: Math.sin(a) },
                damage: weaponDmg,
                color: isLv5 ? '#E0F2FE' : '#38BDF8',
                maxLifetime: 0.92 + lv * 0.06,
                maxPierces: lv >= 3 ? lv - 1 : 0,
                explosionRadius: novaRadius,
                explodeAtEnd: lv >= 3,
                freezeDuration,
                type: 'FrostOrb'
              })
            )
          }
          triggerMount(baseAngle)
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
          triggerMount(Math.atan2(ec.y - pc.y, ec.x - pc.x))
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

      const rangerCfg = getRangerHomingConfig(heroUpgradeLevelRef.current)
      let lockPos: { x: number; y: number } | null = null
      if (shouldApplyHomingForHero(heroId)) {
        let bestDist = rangerCfg.lockRange
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
            rangerCfg.homingStrength
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

      // Chrono Operative: active clones copy every attack at upgraded damage ratio
      if (heroId === 'hero_04' && chronoClonesRef.current.length > 0) {
        const chronoCfg = getChronoCloneConfig(heroUpgradeLevelRef.current)
        for (const clone of chronoClonesRef.current) {
          if (clone.timer >= clone.duration) continue
          const cloneProjIdx = playerProjectilesRef.current.length
          const cloneCenter = { x: clone.x, y: clone.y }
          executeWeaponFire(
            upg,
            player,
            cloneCenter,
            chronoCfg.damageRatio,
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
        color:
          proj.burnRadius > 0
            ? 'rgba(249, 115, 22, 0.55)'
            : proj.freezeDuration > 0
              ? 'rgba(56, 189, 248, 0.55)'
              : 'rgba(255, 215, 0, 0.45)'
      })
      for (const aoeTarget of enemiesRef.current) {
        if (!aoeTarget.isAlive || aoeTarget.isSpawning) continue
        if (
          Math.hypot(aoeTarget.getCenter().x - proj.x, aoeTarget.getCenter().y - proj.y) <=
          proj.explosionRadius + aoeTarget.width / 2
        ) {
          damageEnemy(aoeTarget, proj.damage, { x: proj.x, y: proj.y }, {
            color: proj.freezeDuration > 0 ? '#7DD3FC' : undefined,
            critChanceBonus: proj.critChanceBonus,
            critDamageBonus: proj.critDamageBonus
          })
          if (proj.freezeDuration > 0 && aoeTarget.isAlive) {
            aoeTarget.applyFreeze(proj.freezeDuration)
          }
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
        let cutsceneZoom = 1
        if (dogCutsceneRef.current?.active && gameStateRef.current !== 'playing') {
          const cs = dogCutsceneRef.current
          const liveCutsceneBoss = enemiesRef.current.find(
            (e) =>
              (cs.kind === 'dog' ? e.isDevourerOfGods : e.isFinalBoss || e.isWave15SpecialBoss) &&
              e.isAlive
          )
          const camFrame = computeDevourerCutsceneCameraFrame({
            elapsed: cs.elapsed,
            duration: cs.duration,
            playerCenter: player.getCenter(),
            bossFocus: liveCutsceneBoss ? liveCutsceneBoss.getCenter() : { x: cs.portalX, y: cs.portalY }
          })
          cutsceneZoom = camFrame.zoom
        }
        if (gameStateRef.current === 'playing') {
          timeSurvivedRef.current += deltaTime

          // Advance active boss entrance cutscene (Devourer of Gods beat-drop sync OR Wave 15 Final Boss)
          const activeCutscene = dogCutsceneRef.current
          if (activeCutscene?.active) {
            activeCutscene.wallElapsed += deltaTime
            if (activeCutscene.kind === 'dog') {
              const ytPlaying = youtubePlaybackStartedRef.current
              const ytTime = youtubeCurrentTimeRef.current
              if (ytPlaying && ytTime !== null) {
                // Lock cutscene progression directly to the live YouTube stream timestamp so it ends right on the beat drop
                activeCutscene.elapsed = Math.min(
                  activeCutscene.duration,
                  Math.max(activeCutscene.elapsed, ytTime)
                )
              } else if (activeCutscene.wallElapsed > 3.5) {
                // Offline/blocked embed fallback: continue advancing smoothly toward drop duration
                activeCutscene.elapsed = Math.min(
                  activeCutscene.duration,
                  activeCutscene.elapsed + deltaTime
                )
              } else {
                // Gentle rift buildup crawl while YouTube embed buffers audio
                activeCutscene.elapsed = Math.min(1.0, activeCutscene.elapsed + deltaTime * 0.45)
              }
            } else {
              activeCutscene.elapsed = Math.min(
                activeCutscene.duration,
                activeCutscene.elapsed + deltaTime
              )
            }

            const remainingCutscene = Math.max(0, activeCutscene.duration - activeCutscene.elapsed)
            for (const e of enemiesRef.current) {
              if (
                e.isAlive &&
                (activeCutscene.kind === 'dog' ? e.isDevourerOfGods : e.isFinalBoss || e.isWave15SpecialBoss)
              ) {
                e.cutsceneDelayTimer = Math.max(0.02, remainingCutscene)
              }
            }
            player.isInvulnerable = true
            player.invulnerabilityTimer = Math.max(0.4, remainingCutscene + 0.35)

            const theme = activeCutscene.theme
            if (!activeCutscene.triggeredPhase2Sound && activeCutscene.elapsed >= activeCutscene.line2Delay) {
              activeCutscene.triggeredPhase2Sound = true
              if (activeCutscene.kind !== 'dog') {
                playSoundRef.current('levelup')
              }
              setDogCutsceneUi({
                active: true,
                showSecondLine: true,
                opacity: 1,
                theme
              })
              dogGroundCracksRef.current.push(
                ...createDogGroundCracks(
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  6,
                  295,
                  Math.max(3.5, remainingCutscene + 1.6),
                  [theme.primaryColor, theme.secondaryColor]
                )
              )
              if (activeCutscene.kind === 'dog') {
                pushDogDestructiveBurst(
                  dogCutsceneParticlesRef.current,
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  {
                    shards: 34,
                    sparks: 28,
                    bolts: 7,
                    speedScale: 1.15,
                    palette: theme.palette,
                    shockwaves: [
                      { maxRadius: 340, color: theme.primaryColor, lineWidth: 5, duration: 0.85 },
                      { maxRadius: 240, color: theme.secondaryColor, lineWidth: 3.5, duration: 0.65 }
                    ]
                  }
                )
              } else if (activeCutscene.kind === 'w15_seraph') {
                pushSeraphSolarBurst(
                  dogCutsceneParticlesRef.current,
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  1.05
                )
              } else if (theme.presentation === 'dialogue') {
                pushAstralPhaseTwoRiftBurst(
                  dogCutsceneParticlesRef.current,
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  1
                )
              } else {
                pushBossAreaInfernoBurst(
                  dogCutsceneParticlesRef.current,
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  {
                    flames: 42,
                    embers: 36,
                    speedScale: 1.15,
                    palette: theme.palette,
                    coreColor: theme.coreColor,
                    shockwaves: [
                      { maxRadius: 340, color: theme.primaryColor, lineWidth: 5, duration: 0.85 },
                      { maxRadius: 240, color: theme.secondaryColor, lineWidth: 3.5, duration: 0.65 }
                    ]
                  }
                )
              }
            }

            // Continuous boss entrance particle buildup (cosmic rift for DoG vs area-themed flames/embers for Wave 15)
            const buildupRatio = Math.min(1, activeCutscene.elapsed / activeCutscene.duration)
            activeCutscene.particleAccumulator += deltaTime * (16 + buildupRatio * 34)
            const liveBossHead = enemiesRef.current.find(
              (e) =>
                (activeCutscene.kind === 'dog'
                  ? e.isDevourerOfGods
                  : e.isFinalBoss || e.isWave15SpecialBoss) && e.isAlive
            )
            const burstOrigin = liveBossHead
              ? liveBossHead.getCenter()
              : { x: activeCutscene.portalX, y: activeCutscene.portalY }
            while (activeCutscene.particleAccumulator >= 1) {
              activeCutscene.particleAccumulator -= 1
              if (activeCutscene.kind === 'dog') {
                const ang = Math.random() * Math.PI * 2
                const spawnDist = 110 + Math.random() * 190
                dogCutsceneParticlesRef.current.push({
                  kind: 'spark',
                  x: activeCutscene.portalX + Math.cos(ang) * spawnDist,
                  y: activeCutscene.portalY + Math.sin(ang) * spawnDist * 0.65,
                  vx: -Math.cos(ang) * (160 + buildupRatio * 180),
                  vy: -Math.sin(ang) * (120 + buildupRatio * 140),
                  size: 2.2 + Math.random() * 2.6,
                  timer: 0,
                  duration: 0.42 + Math.random() * 0.25,
                  color: Math.random() < 0.5 ? theme.primaryColor : theme.secondaryColor,
                  attractX: activeCutscene.portalX,
                  attractY: activeCutscene.portalY
                })
                if (
                  activeCutscene.elapsed >= activeCutscene.line2Delay * 0.75 &&
                  Math.random() < 0.48 + buildupRatio * 0.35
                ) {
                  const sAng = Math.random() * Math.PI * 2
                  const sSpd = 95 + Math.random() * (180 + buildupRatio * 220)
                  dogCutsceneParticlesRef.current.push({
                    kind: 'shard',
                    x: burstOrigin.x + (Math.random() - 0.5) * 32,
                    y: burstOrigin.y + (Math.random() - 0.5) * 24,
                    vx: Math.cos(sAng) * sSpd,
                    vy: Math.sin(sAng) * sSpd,
                    size: 4 + Math.random() * 7.5,
                    angle: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 14,
                    timer: 0,
                    duration: 0.48 + Math.random() * 0.42,
                    color: theme.palette[Math.floor(Math.random() * theme.palette.length)]
                  })
                }
                if (Math.random() < 0.22 + buildupRatio * 0.28) {
                  dogCutsceneParticlesRef.current.push(
                    createDogLightningArc(
                      activeCutscene.portalX,
                      activeCutscene.portalY,
                      Math.random() * Math.PI * 2,
                      90 + Math.random() * (110 + buildupRatio * 110),
                      Math.random() < 0.5 ? theme.primaryColor : theme.coreColor
                    )
                  )
                }
              } else if (activeCutscene.kind === 'w15_seraph') {
                const angle = Math.random() * Math.PI * 2
                const speed = 90 + Math.random() * 170
                dogCutsceneParticlesRef.current.push({
                  kind: 'spark',
                  x: burstOrigin.x,
                  y: burstOrigin.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size: 2.5 + Math.random() * 2.5,
                  timer: 0,
                  duration: 0.5 + Math.random() * 0.35,
                  color: Math.random() < 0.5 ? theme.primaryColor : theme.secondaryColor
                })
                if (Math.random() < 0.08) {
                  dogCutsceneParticlesRef.current.push(
                    createDogLightningArc(
                      burstOrigin.x,
                      burstOrigin.y,
                      Math.random() * Math.PI * 2,
                      90 + Math.random() * 100,
                      theme.primaryColor
                    )
                  )
                }
              } else if (theme.presentation === 'dialogue') {
                if (Math.random() < 0.24) {
                  pushAstralOrbitStar(
                    dogCutsceneParticlesRef.current,
                    burstOrigin.x,
                    burstOrigin.y,
                    0.65
                  )
                }
                if (Math.random() < 0.035) {
                  dogCutsceneParticlesRef.current.push(
                    createDogLightningArc(
                      burstOrigin.x,
                      burstOrigin.y,
                      Math.random() * Math.PI * 2,
                      80 + Math.random() * 150,
                      Math.random() < 0.5 ? theme.primaryColor : theme.secondaryColor
                    )
                  )
                }
              } else {
                // Area-themed roaring flame tongues & convective rising embers around Wave 15 Final Boss
                const fAng = Math.random() * Math.PI * 2
                const ringR = 16 + Math.random() * (56 + buildupRatio * 48)
                const radialOut = 32 + buildupRatio * 105
                dogCutsceneParticlesRef.current.push({
                  kind: 'flame',
                  x: burstOrigin.x + Math.cos(fAng) * ringR,
                  y: burstOrigin.y + Math.sin(fAng) * ringR * 0.55 + 16,
                  vx: Math.cos(fAng) * radialOut,
                  vy: Math.sin(fAng) * radialOut * 0.35 - (55 + Math.random() * 95),
                  radius: 9 + Math.random() * (12 + buildupRatio * 9),
                  riseSpeed: 120 + Math.random() * (140 + buildupRatio * 110),
                  swayPhase: Math.random() * Math.PI * 2,
                  swayAmp: 24 + Math.random() * 38,
                  timer: 0,
                  duration: 0.45 + Math.random() * 0.45,
                  color: theme.palette[Math.floor(Math.random() * theme.palette.length)],
                  coreColor: theme.coreColor
                })
                if (Math.random() < 0.72 + buildupRatio * 0.25) {
                  const eAng = Math.random() * Math.PI * 2
                  const eSpd = 65 + Math.random() * (145 + buildupRatio * 140)
                  dogCutsceneParticlesRef.current.push({
                    kind: 'ember',
                    x: burstOrigin.x + (Math.random() - 0.5) * 90,
                    y: burstOrigin.y + (Math.random() - 0.5) * 45 + 12,
                    vx: Math.cos(eAng) * eSpd,
                    vy: -75 - Math.random() * (110 + buildupRatio * 90),
                    size: 2.0 + Math.random() * 3.0,
                    timer: 0,
                    duration: 0.55 + Math.random() * 0.55,
                    color: Math.random() < 0.5 ? theme.primaryColor : theme.secondaryColor,
                    swayPhase: Math.random() * Math.PI * 2
                  })
                }
              }
            }

            // Rhythmic pre-drop shockwave pulses during final buildup crescendo
            const preDropStart =
              activeCutscene.kind === 'dog'
                ? Math.max(4.5, activeCutscene.duration - 3.6)
                : Math.max(activeCutscene.line2Delay + 0.5, activeCutscene.duration - 2.0)
            const pulseInterval = activeCutscene.kind === 'dog' ? 0.85 : 0.62
            if (activeCutscene.elapsed >= preDropStart) {
              const pulseBucket = Math.floor((activeCutscene.elapsed - preDropStart) / pulseInterval) + 1
              if (pulseBucket > activeCutscene.pulseStep) {
                activeCutscene.pulseStep = pulseBucket
                if (activeCutscene.kind === 'dog') {
                  pushDogDestructiveBurst(
                    dogCutsceneParticlesRef.current,
                    activeCutscene.portalX,
                    activeCutscene.portalY,
                    {
                      shards: 16,
                      sparks: 16,
                      bolts: 5,
                      speedScale: 1.05,
                      palette: theme.palette,
                      shockwaves: [
                        {
                          maxRadius: 240 + pulseBucket * 38,
                          color: pulseBucket % 2 === 0 ? theme.primaryColor : theme.secondaryColor,
                          lineWidth: 4,
                          duration: 0.55
                        }
                      ]
                    }
                  )
                } else if (activeCutscene.kind === 'w15_seraph') {
                  pushSeraphSolarBurst(
                    dogCutsceneParticlesRef.current,
                    activeCutscene.portalX,
                    activeCutscene.portalY,
                    0.55
                  )
                } else if (theme.presentation === 'dialogue') {
                  pushAstralPhaseTwoRiftBurst(
                    dogCutsceneParticlesRef.current,
                    activeCutscene.portalX,
                    activeCutscene.portalY,
                    0.55
                  )
                } else {
                  pushBossAreaInfernoBurst(
                    dogCutsceneParticlesRef.current,
                    activeCutscene.portalX,
                    activeCutscene.portalY,
                    {
                      flames: 26,
                      embers: 22,
                      speedScale: 1.08,
                      palette: theme.palette,
                      coreColor: theme.coreColor,
                      shockwaves: [
                        {
                          maxRadius: 240 + pulseBucket * 38,
                          color: pulseBucket % 2 === 0 ? theme.primaryColor : theme.secondaryColor,
                          lineWidth: 4,
                          duration: 0.55
                        }
                      ]
                    }
                  )
                }
              }
            }

            const fadeSpan = activeCutscene.kind === 'dog' ? 1.1 : 0.75
            const fadeStart = Math.max(0, activeCutscene.duration - fadeSpan)
            if (activeCutscene.elapsed >= fadeStart && activeCutscene.elapsed < activeCutscene.duration) {
              const fadeAlpha = Math.max(0, Math.min(1, remainingCutscene / fadeSpan))
              const quantized = Math.round(fadeAlpha * 20) * 5
              if (quantized !== activeCutscene.lastOpacityStep) {
                activeCutscene.lastOpacityStep = quantized
                setDogCutsceneUi({
                  active: true,
                  showSecondLine: true,
                  opacity: fadeAlpha,
                  theme
                })
              }
            }
            if (activeCutscene.elapsed >= activeCutscene.duration) {
              for (const e of enemiesRef.current) {
                if (
                  e.isAlive &&
                  (activeCutscene.kind === 'dog'
                    ? e.isDevourerOfGods
                    : e.isFinalBoss || e.isWave15SpecialBoss)
                ) {
                  e.cutsceneDelayTimer = 0
                  e.spawnTime = Math.max(e.spawnTime, e.spawnDelay)
                  e.isSpawning = false
                }
              }
              explosionsRef.current.push({
                x: activeCutscene.portalX,
                y: activeCutscene.portalY,
                radius: 340,
                timer: 0,
                duration: 0.65,
                color: theme.secondaryColor
              })
              dogGroundCracksRef.current.push(
                ...createDogGroundCracks(
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  10,
                  360,
                  1.8,
                  [theme.primaryColor, theme.secondaryColor]
                )
              )
              if (activeCutscene.kind === 'dog') {
                pushDogDestructiveBurst(
                  dogCutsceneParticlesRef.current,
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  {
                    shards: 64,
                    sparks: 56,
                    bolts: 12,
                    speedScale: 1.45,
                    palette: theme.palette,
                    shockwaves: [
                      { maxRadius: 520, color: theme.primaryColor, lineWidth: 7, duration: 0.78 },
                      { maxRadius: 380, color: theme.secondaryColor, lineWidth: 5.5, duration: 0.6 },
                      { maxRadius: 260, color: '#FFFFFF', lineWidth: 4, duration: 0.42 }
                    ]
                  }
                )
              } else if (theme.presentation === 'dialogue') {
                pushAstralPhaseTwoRiftBurst(
                  dogCutsceneParticlesRef.current,
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  1.5
                )
              } else {
                pushBossAreaInfernoBurst(
                  dogCutsceneParticlesRef.current,
                  activeCutscene.portalX,
                  activeCutscene.portalY,
                  {
                    flames: 72,
                    embers: 68,
                    speedScale: 1.45,
                    palette: theme.palette,
                    coreColor: theme.coreColor,
                    shockwaves: [
                      { maxRadius: 520, color: theme.primaryColor, lineWidth: 7, duration: 0.78 },
                      { maxRadius: 380, color: theme.secondaryColor, lineWidth: 5.5, duration: 0.6 },
                      { maxRadius: 260, color: '#FFFFFF', lineWidth: 4, duration: 0.42 }
                    ]
                  }
                )
              }
              dogPostDropRef.current = {
                elapsed: 0,
                duration: activeCutscene.duration,
                line2Delay: activeCutscene.line2Delay,
                theme
              }
              dogCutsceneRef.current = null
              setDogCutsceneUi(null)
              playSoundRef.current('wave')
            }
          }

          // 1. Movement (Keyboard + Touch D-pad + Shield Paladin Spacebar Dash)
          dashCooldownRef.current = Math.max(0, dashCooldownRef.current - deltaTime)
          const kbMove = inputRef.current?.getMovementVector() || { x: 0, y: 0 }
          const touchMove = touchDirRef.current
          let moveX = kbMove.x + touchMove.x
          let moveY = kbMove.y + touchMove.y
          const mag = Math.hypot(moveX, moveY)
          if (mag > 1) {
            moveX /= mag
            moveY /= mag
          }
          if (mag > 0.05) {
            lastMoveDirRef.current = { x: moveX, y: moveY }
          }

          if (dashTimerRef.current > 0) {
            dashTimerRef.current = Math.max(0, dashTimerRef.current - deltaTime)
            player.x = Math.max(
              0,
              Math.min(
                ARENA_SIZE - player.width,
                player.x + dashDirRef.current.x * HERO_ABILITY_CONSTANTS.PALADIN_DASH_SPEED * deltaTime
              )
            )
            player.y = Math.max(
              0,
              Math.min(
                ARENA_SIZE - player.height,
                player.y + dashDirRef.current.y * HERO_ABILITY_CONSTANTS.PALADIN_DASH_SPEED * deltaTime
              )
            )
            player.update({ x: 0, y: 0 }, deltaTime)
            dashAfterimagesRef.current.push({
              x: player.x,
              y: player.y,
              timer: 0,
              duration: 0.24
            })
            if (dashAfterimagesRef.current.length > 12) {
              dashAfterimagesRef.current.shift()
            }

            // Shield bash knockback + impact damage during dash
            const dashPc = player.getCenter()
            for (const enemy of enemiesRef.current) {
              if (!enemy.isAlive || enemy.isSpawning || dashHitEnemiesRef.current.has(enemy)) continue
              const ec = enemy.getCenter()
              const dist = Math.hypot(ec.x - dashPc.x, ec.y - dashPc.y)
              if (dist <= player.width / 2 + enemy.width / 2 + 16) {
                dashHitEnemiesRef.current.add(enemy)
                const pushLen = dist || 1
                if (!enemy.isStationaryBoss) {
                  enemy.x += ((ec.x - dashPc.x) / pushLen) * 38
                  enemy.y += ((ec.y - dashPc.y) / pushLen) * 38
                }
                damageEnemy(
                  enemy,
                  Math.max(
                    12,
                    Math.round(player.maxHealth * getPaladinConfig(heroUpgradeLevelRef.current).bashDamageRatio)
                  ),
                  dashPc
                )
              }
            }
          } else {
            player.update({ x: moveX, y: moveY }, deltaTime)
          }

          for (let ai = dashAfterimagesRef.current.length - 1; ai >= 0; ai--) {
            dashAfterimagesRef.current[ai].timer += deltaTime
            if (dashAfterimagesRef.current[ai].timer >= dashAfterimagesRef.current[ai].duration) {
              dashAfterimagesRef.current.splice(ai, 1)
            }
          }

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
          const activeCutsceneCamera = dogCutsceneRef.current
          if (activeCutsceneCamera?.active) {
            const liveFocusBoss = enemiesRef.current.find(
              (e) =>
                (activeCutsceneCamera.kind === 'dog'
                  ? e.isDevourerOfGods
                  : e.isFinalBoss || e.isWave15SpecialBoss) && e.isAlive
            )
            const bossFocus = liveFocusBoss
              ? liveFocusBoss.getCenter()
              : { x: activeCutsceneCamera.portalX, y: activeCutsceneCamera.portalY }
            const camFrame = computeDevourerCutsceneCameraFrame({
              elapsed: activeCutsceneCamera.elapsed,
              duration: activeCutsceneCamera.duration,
              playerCenter: updatedCenter,
              bossFocus
            })
            camera.updateWithLerp(camFrame.focusX, camFrame.focusY, 0.24)
            cutsceneZoom = camFrame.zoom
          } else if (bossArenaRef.current) {
            const ba = bossArenaRef.current
            camera.update(ba.left + ba.width / 2, ba.top + ba.height / 2)
          } else {
            camera.update(updatedCenter.x, updatedCenter.y)
          }

          // 2. Wave + Breather State Machine (paused completely while Devourer of Gods is active)
          const areaMaxWave = getAreaMaxWave(areaRef.current.id)
          if (dogBossActiveRef.current) {
            spawnAccumulatorRef.current = 0
          } else if (isBreatherRef.current) {
            breatherElapsedRef.current += deltaTime
            if (breatherElapsedRef.current >= WAVE_CONFIG.BREATHER_DURATION_SECONDS) {
              isBreatherRef.current = false
              breatherElapsedRef.current = 0
              if (waveRef.current < areaMaxWave || endlessModeRef.current) {
                waveRef.current += 1
              }
              waveElapsedRef.current = 0
              rangedSpawnedInWaveRef.current = 0
              waveTookDamageRef.current = false
              setIsBreather(false)
              setWave(waveRef.current)
              setDevRunStatus({ currentWave: waveRef.current })
              playSoundRef.current('wave')
              const newlyUnlockedHeroes = checkAndSyncMilestoneHeroUnlocks(
                user?.id || 'guest_user',
                waveRef.current
              )
              for (const unlockedHero of newlyUnlockedHeroes) {
                toast.success(`HERO UNLOCKED: ${unlockedHero.name}!`)
              }

              if (waveRef.current === areaMaxWave && !endlessModeRef.current) {
                // Disable regular spawns & remove leftover regular adds for pure Final Boss duel
                enemiesRef.current = enemiesRef.current.filter((e) => e.isBoss && e.isAlive)

                if (areaRef.current.id !== 'astral_citadel') {
                  // Lock visible Boss Arena around current screen for stationary Area 1 Wave 15 Final Boss
                  if (!bossArenaRef.current) {
                    const aw = canvas.width
                    const ah = canvas.height
                    const left = Math.max(24, Math.min(ARENA_SIZE - aw - 24, updatedCenter.x - aw / 2))
                    const top = Math.max(24, Math.min(ARENA_SIZE - ah - 24, updatedCenter.y - ah / 2))
                    bossArenaRef.current = { left, top, width: aw, height: ah }
                    const bossAnchorX = left + aw / 2
                    const bossAnchorY = top + Math.max(210, Math.round(ah * 0.27))
                    if (Math.hypot(updatedCenter.x - bossAnchorX, updatedCenter.y - bossAnchorY) < 130) {
                      player.y = Math.min(top + ah - player.height - 40, bossAnchorY + 185)
                    }
                  }
                } else {
                  // Area 2 Wave 20 Astral Scourge roams/lunges freely across the full arena like a cosmic worm
                  bossArenaRef.current = null
                }

                if (!finalBossSpawnedRef.current) {
                  finalBossSpawnedRef.current = true
                  bossSpawnedWaveRef.current = areaMaxWave
                  spawnEnemyForWave(areaMaxWave, true)
                  toast.warning(
                    areaRef.current.id === 'astral_citadel'
                      ? 'FINAL WAVE 20 — ASTRAL SCOURGE: Evade laser grids, portal lunges & splitting astral orbs!'
                      : 'FINAL WAVE 15: Dodge closing side lasers, tracking strikes & bullet hell!'
                  )
                }
              } else {
                // Wave-start swarm reinforcement surge scaled per wave (melee first so ranged don't stack)
                if (
                  shouldSpawnRegularEnemiesInWave(
                    waveRef.current,
                    endlessModeRef.current,
                    dogBossActiveRef.current,
                    areaRef.current.id
                  )
                ) {
                  const waveCfg = getWaveSpawnConfig(waveRef.current, timeSurvivedRef.current)
                  for (
                    let i = 0;
                    i < waveCfg.waveBurst && enemiesRef.current.length < waveCfg.maxActiveEnemies;
                    i++
                  ) {
                    spawnEnemyForWave(waveRef.current, false, false)
                  }
                }

                // Boss alert every 5 waves (Wave 5, 10, Area 2 Wave 15, and Endless bosses)
                if (waveRef.current % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0) {
                  spawnEnemyForWave(waveRef.current, true)
                  bossSpawnedWaveRef.current = waveRef.current
                  toast.warning(`Wave ${waveRef.current} BOSS INCOMING: Watch for red telegraph indicators!`)
                }
              }
            }
          } else {
            waveElapsedRef.current += deltaTime

            // Continuous swarm spawning (disabled during Final Boss showdown & Devourer of Gods)
            if (
              shouldSpawnRegularEnemiesInWave(
                waveRef.current,
                endlessModeRef.current,
                dogBossActiveRef.current,
                areaRef.current.id
              )
            ) {
              const waveCfg = getWaveSpawnConfig(waveRef.current, timeSurvivedRef.current)
              const diffMeta = difficultyRef.current
              const areaMeta = areaRef.current
              const capMult =
                (diffMeta.id === 'expert'
                  ? 1.15
                  : diffMeta.id === 'hard'
                    ? 1.08
                    : diffMeta.id === 'easy'
                      ? 0.85
                      : 1) * (areaMeta.id === 'astral_citadel' ? 1.15 : 1)
              const effectiveMaxActive = Math.min(380, Math.round(waveCfg.maxActiveEnemies * capMult))
              spawnAccumulatorRef.current +=
                waveCfg.spawnRate *
                diffMeta.spawnRateMultiplier *
                areaMeta.enemySpawnRateMultiplier *
                deltaTime
              while (
                spawnAccumulatorRef.current >= 1 &&
                enemiesRef.current.length < effectiveMaxActive
              ) {
                spawnAccumulatorRef.current -= 1
                spawnEnemyForWave(waveRef.current, false)
              }
            }

            if (
              (waveRef.current < areaMaxWave || endlessModeRef.current) &&
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

              // Hero Mastery: record completed round & unlock passive bonuses live
              const masteryResult = recordHeroRoundsCompleted(
                user?.id || 'guest_user',
                player.hero?.id || selectedHeroId || 'hero_01',
                1
              )
              masteryBonusesRef.current = masteryResult.progress.totalBonuses
              if (masteryResult.unlockedNewTier) {
                const newTier = masteryResult.unlockedNewTier
                const bonusHpGain = newTier.bonuses.bonusHp || 0
                if (bonusHpGain > 0) {
                  basePlayerMaxHealthRef.current += bonusHpGain
                  const devHpMult =
                    isDevUserRef.current && devSettingsRef.current.healthMultiplier > 1
                      ? devSettingsRef.current.healthMultiplier
                      : 1
                  player.maxHealth = Math.round(basePlayerMaxHealthRef.current * devHpMult)
                  player.heal(Math.round(bonusHpGain * devHpMult))
                  setMaxHealth(player.maxHealth)
                  setHealth(player.health)
                }
                player.speed =
                  baseHeroSpeedRef.current *
                  (equippedBonusesRef.current.speedMultiplier +
                    masteryBonusesRef.current.speedMultiplier)
                for (const upg of activeUpgradesRef.current) {
                  if (
                    upg.id === 'upg_01' ||
                    upg.id === 'upg_14' ||
                    upg.id === 'upg_20' ||
                    upg.id === 'upg_a2_02' ||
                    upg.id === 'wpn_grim_reaper'
                  ) {
                    syncSummonsForUpgrade(upg, player, upgradeLevelsRef.current[upg.id] || 1)
                  }
                }
                playSoundRef.current('levelup')
                floatingTextsRef.current.push({
                  x: updatedCenter.x,
                  y: player.y - 26,
                  text: `MASTERY TIER ${newTier.tier}: ${newTier.title.toUpperCase()}!`,
                  color: '#FACC15',
                  timer: 1.5
                })
                toast.success(
                  `Hero Mastery Tier ${newTier.tier} Unlocked: ${newTier.title} (${newTier.summary})`
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

          // Passive HP regeneration from equipped Accessories + Hero Mastery
          const totalHpRegenPerSec =
            equippedBonusesRef.current.hpRegenPerSec + masteryBonusesRef.current.hpRegenPerSec
          if (totalHpRegenPerSec > 0 && player.isAlive && player.health < player.maxHealth) {
            hpRegenCarryRef.current += totalHpRegenPerSec * deltaTime
            if (hpRegenCarryRef.current >= 1) {
              const healWhole = Math.floor(hpRegenCarryRef.current)
              hpRegenCarryRef.current -= healWhole
              player.heal(healWhole)
            }
          }

          // 4. Auto-Fire Equipped Upgrades (Summons are updated autonomously below)
          const fireRateMultiplier =
            equippedBonusesRef.current.cooldownRateMultiplier +
            masteryBonusesRef.current.fireRateMultiplier +
            getHeroFireRateBonus(player.hero?.id || 'hero_01', heroUpgradeLevelRef.current)
          for (const upg of activeUpgradesRef.current) {
            if (
              upg.id === 'upg_08' ||
              upg.id === 'upg_01' ||
              upg.id === 'upg_14' ||
              upg.id === 'upg_20' ||
              upg.id === 'upg_a2_02' ||
              upg.id === 'upg_a2_05' ||
              upg.id === 'wpn_grim_reaper' ||
              UNIVERSAL_CRIT_UPGRADE_IDS.has(upg.id)
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
              let baseCd = upg.cooldown_s > 0 ? upg.cooldown_s : 0.35
              if (upg.id === 'upg_12' && player.hero?.id === 'hero_01') {
                baseCd *= getVanguardConfig(heroUpgradeLevelRef.current).cooldownMultiplier
              }
              if (upg.id === 'wpn_muramasa' && player.hero?.id === 'hero_01') {
                baseCd *= getMuramasaWeaponConfig(
                  upg.damage,
                  upgradeLevelsRef.current[upg.id] || 1,
                  player.hero.id
                ).cooldownScale
              }
              if (upg.id === 'wpn_tempest_sphere' && player.hero?.id === 'hero_07') {
                baseCd *= getTempestSphereWeaponConfig(
                  upg.damage,
                  upgradeLevelsRef.current[upg.id] || 1,
                  player.hero.id
                ).cooldownScale
              }
              upgradeCooldownsRef.current[upg.id] = baseCd
            } else {
              upgradeCooldownsRef.current[upg.id] = nextCd
            }
          }

          // 4b. Autonomous Summons & Chrono Operative Clones
          const rangerHomingActive = shouldApplyHomingForHero(player.hero?.id || 'hero_01')
          const activeRangerCfg = getRangerHomingConfig(heroUpgradeLevelRef.current)
          for (const summon of summonsRef.current) {
            const action = summon.update(deltaTime, player, enemiesRef.current, playerTrailRef.current)
            const spawnedList = [
              ...(action?.projectile ? [action.projectile] : []),
              ...(action?.extraProjectiles || [])
            ]
            const summonCrit = getWeaponCritProfile(summon.upgradeId)
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
                  maxPierces: pData.maxPierces,
                  critChanceBonus: summonCrit.critChanceBonus,
                  critDamageBonus: summonCrit.critDamageBonus,
                  homingStrength: rangerHomingActive ? activeRangerCfg.homingStrength : 0
                })
              )
            }
            if (spawnedList.length > 0) {
              const firstDir = spawnedList[0].direction
              player.triggerWeaponAction(summon.upgradeId, Math.atan2(firstDir.y, firstDir.x))
              playSoundRef.current('shoot')
            }
            if (action?.beams && action.beams.length > 0) {
              player.triggerWeaponAction(summon.upgradeId, action.beams[0].angle)
              for (const beamSpec of action.beams) {
                activeBeamsRef.current.push({
                  angle: beamSpec.angle,
                  angularSpeed: beamSpec.angularSpeed ?? 0,
                  length: beamSpec.length,
                  damage: beamSpec.damage,
                  timer: 0,
                  duration: beamSpec.duration,
                  hitCooldowns: new Map(),
                  summon,
                  originX: summon.x,
                  originY: summon.y,
                  color: beamSpec.color,
                  critChanceBonus: summonCrit.critChanceBonus,
                  critDamageBonus: summonCrit.critDamageBonus
                })
              }
              playSoundRef.current('shoot')
            }
            if (action?.siphon && action.siphon.targets.length > 0) {
              const firstTarget = action.siphon.targets[0]
              const pCenterNow = player.getCenter()
              player.triggerWeaponAction(
                summon.upgradeId,
                Math.atan2(firstTarget.y - pCenterNow.y, firstTarget.x - pCenterNow.x)
              )
              const playerPos = pCenterNow
              for (const st of action.siphon.targets) {
                if (st.enemy.isAlive && !st.enemy.isSpawning) {
                  damageEnemy(st.enemy, st.damage, { x: summon.x, y: summon.y }, {
                    color: '#FF2E63',
                    critChanceBonus: summonCrit.critChanceBonus,
                    critDamageBonus: summonCrit.critDamageBonus
                  })
                }
                attackEffectsRef.current.push({
                  kind: 'siphon',
                  from: { x: st.x, y: st.y },
                  to: { x: summon.x, y: summon.y },
                  color: action.siphon.color,
                  timer: 0,
                  duration: 0.32
                })
              }
              attackEffectsRef.current.push({
                kind: 'siphon',
                from: { x: summon.x, y: summon.y },
                to: playerPos,
                color: '#FDA4AF',
                timer: 0,
                duration: 0.34
              })
              if (action.siphon.healAmount > 0 && player.isAlive) {
                player.heal(action.siphon.healAmount)
                floatingTextsRef.current.push({
                  x: playerPos.x,
                  y: player.y - 20,
                  text: `+${action.siphon.healAmount} HP`,
                  color: '#FDA4AF',
                  timer: 0.65
                })
              }
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

          // Chrono Operative: spawn holographic clones that copy player attacks
          if (player.hero?.id === 'hero_04') {
            const chronoCfg = getChronoCloneConfig(heroUpgradeLevelRef.current)
            chronoCloneSpawnTimerRef.current += deltaTime
            if (chronoCloneSpawnTimerRef.current >= chronoCfg.spawnInterval) {
              chronoCloneSpawnTimerRef.current -= chronoCfg.spawnInterval
              const id = chronoCloneNextIdRef.current++
              const slotOffsetAngle = (id % 2 === 0 ? 1 : -1) * 2.15
              chronoClonesRef.current.push({
                id,
                x: updatedCenter.x + Math.cos(slotOffsetAngle) * 58,
                y: updatedCenter.y + Math.sin(slotOffsetAngle) * 58,
                timer: 0,
                duration: chronoCfg.duration,
                slotOffsetAngle
              })
            }
            for (let ci = chronoClonesRef.current.length - 1; ci >= 0; ci--) {
              const clone = chronoClonesRef.current[ci]
              clone.timer += deltaTime
              if (clone.timer >= clone.duration) {
                chronoClonesRef.current.splice(ci, 1)
                continue
              }
              const orbitAngle =
                player.facingAngle +
                clone.slotOffsetAngle +
                Math.sin(timeSurvivedRef.current * 2 + clone.id) * 0.25
              const desiredX = updatedCenter.x + Math.cos(orbitAngle) * 58
              const desiredY = updatedCenter.y + Math.sin(orbitAngle) * 58
              const follow = Math.min(1, deltaTime * 10)
              clone.x += (desiredX - clone.x) * follow
              clone.y += (desiredY - clone.y) * follow
            }
          }

          // 4c. Sweeping Orbital & Aimed Strider Laser Beams
          for (let b = activeBeamsRef.current.length - 1; b >= 0; b--) {
            const beam = activeBeamsRef.current[b]
            beam.timer += deltaTime
            beam.angle += beam.angularSpeed * deltaTime
            if (beam.timer >= beam.duration) {
              activeBeamsRef.current.splice(b, 1)
              continue
            }
            const activeClone =
              beam.cloneId !== undefined
                ? chronoClonesRef.current.find((c) => c.id === beam.cloneId)
                : undefined
            const bx = beam.summon
              ? beam.summon.x
              : beam.cloneId !== undefined
                ? (activeClone?.x ?? beam.originX ?? updatedCenter.x)
                : updatedCenter.x
            const by = beam.summon
              ? beam.summon.y
              : beam.cloneId !== undefined
                ? (activeClone?.y ?? beam.originY ?? updatedCenter.y)
                : updatedCenter.y
            beam.originX = bx
            beam.originY = by
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
                damageEnemy(enemy, beam.damage, { x: bx, y: by }, {
                  critChanceBonus: beam.critChanceBonus,
                  critDamageBonus: beam.critDamageBonus
                })
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

          // 4f. Legendary Solar Flare Flails (Launch spinning mace out -> apex fire pool -> whip back)
          for (let sf = solarFlailsRef.current.length - 1; sf >= 0; sf--) {
            const flail = solarFlailsRef.current[sf]
            flail.timer += deltaTime
            flail.spinAngle += deltaTime * 24

            const activeClone =
              flail.cloneId !== undefined
                ? chronoClonesRef.current.find((c) => c.id === flail.cloneId)
                : undefined
            const ox =
              flail.cloneId !== undefined
                ? (activeClone?.x ?? updatedCenter.x)
                : updatedCenter.x
            const oy =
              flail.cloneId !== undefined
                ? (activeClone?.y ?? updatedCenter.y)
                : updatedCenter.y
            flail.originX = ox
            flail.originY = oy

            if (flail.phase === 'outbound') {
              const step = flail.speed * deltaTime
              flail.x += Math.cos(flail.angle) * step
              flail.y += Math.sin(flail.angle) * step
              flail.traveled += step

              if (flail.traveled >= flail.maxDistance) {
                flail.phase = 'apex'
                flail.apexTimer = 0
                // Emit magma fire AoE ONLY at full extension (apex) before returning
                explosionsRef.current.push({
                  x: flail.x,
                  y: flail.y,
                  radius: flail.burnRadius * 1.25,
                  timer: 0,
                  duration: 0.36,
                  color: flail.isCloneCast
                    ? 'rgba(192, 132, 252, 0.72)'
                    : 'rgba(250, 204, 21, 0.85)'
                })
                burnZonesRef.current.push({
                  x: flail.x,
                  y: flail.y,
                  radius: flail.burnRadius,
                  timer: 0,
                  duration: flail.burnDuration,
                  tickTimer: 0.35,
                  damagePerTick: flail.burnDamage,
                  isLv5: flail.isLv5
                })
                for (const enemy of enemiesRef.current) {
                  if (!enemy.isAlive || enemy.isSpawning) continue
                  const ec = enemy.getCenter()
                  if (Math.hypot(ec.x - flail.x, ec.y - flail.y) <= flail.burnRadius + enemy.width / 2) {
                    damageEnemy(enemy, Math.round(flail.damage * 0.85), { x: flail.x, y: flail.y }, {
                      color: '#FB923C',
                      critChanceBonus: flail.critChanceBonus,
                      critDamageBonus: flail.critDamageBonus
                    })
                  }
                }
              }
            } else if (flail.phase === 'apex') {
              flail.apexTimer += deltaTime
              if (flail.apexTimer >= flail.apexDuration) {
                flail.phase = 'returning'
                // Reset per-enemy hit cooldowns cleanly for the return pull cleave
                flail.hitCooldowns.clear()
              }
            } else {
              const dx = ox - flail.x
              const dy = oy - flail.y
              const dist = Math.hypot(dx, dy)
              const returnSpeed = flail.speed * 1.28
              if (dist <= Math.max(24, returnSpeed * deltaTime + 8)) {
                solarFlailsRef.current.splice(sf, 1)
                continue
              }
              flail.x += (dx / dist) * returnSpeed * deltaTime
              flail.y += (dy / dist) * returnSpeed * deltaTime
            }

            flail.trail.push({ x: flail.x, y: flail.y })
            if (flail.trail.length > 9) {
              flail.trail.shift()
            }

            // Smash any enemy touched by the spinning solar mace
            for (const enemy of enemiesRef.current) {
              if (!enemy.isAlive || enemy.isSpawning) continue
              const lastHit = flail.hitCooldowns.get(enemy) ?? -1
              if (flail.timer - lastHit < 0.22) continue
              const ec = enemy.getCenter()
              if (Math.hypot(ec.x - flail.x, ec.y - flail.y) <= flail.headRadius + enemy.width / 2) {
                flail.hitCooldowns.set(enemy, flail.timer)
                const smashDmg = flail.phase === 'returning' ? Math.round(flail.damage * 1.15) : flail.damage
                damageEnemy(enemy, smashDmg, { x: flail.x, y: flail.y }, {
                  color: '#FDE047',
                  critChanceBonus: flail.critChanceBonus,
                  critDamageBonus: flail.critDamageBonus
                })
                explosionsRef.current.push({
                  x: ec.x,
                  y: ec.y,
                  radius: 36,
                  timer: 0,
                  duration: 0.18,
                  color: flail.isCloneCast ? 'rgba(192, 132, 252, 0.55)' : 'rgba(249, 115, 22, 0.65)'
                })
              }
            }
          }

          // 4g. Cyclone Tempest Bouncing Tornadoes (bounces inside arena/boss bounds, pulls & shreds)
          for (let t = tornadoesRef.current.length - 1; t >= 0; t--) {
            const tor = tornadoesRef.current[t]
            tor.timer += deltaTime
            if (tor.timer >= tor.duration) {
              tornadoesRef.current.splice(t, 1)
              continue
            }

            // Slight spiral drift
            const turnAngle = Math.sin(tor.timer * 3.4 + t) * 0.65 * deltaTime
            const cosT = Math.cos(turnAngle)
            const sinT = Math.sin(turnAngle)
            const nvx = tor.vx * cosT - tor.vy * sinT
            const nvy = tor.vx * sinT + tor.vy * cosT
            tor.vx = nvx
            tor.vy = nvy

            tor.x += tor.vx * deltaTime
            tor.y += tor.vy * deltaTime

            const bounds = bossArenaRef.current
              ? {
                  minX: bossArenaRef.current.left + tor.radius * 0.4,
                  maxX: bossArenaRef.current.left + bossArenaRef.current.width - tor.radius * 0.4,
                  minY: bossArenaRef.current.top + tor.radius * 0.4,
                  maxY: bossArenaRef.current.top + bossArenaRef.current.height - tor.radius * 0.4
                }
              : {
                  minX: tor.radius * 0.4,
                  maxX: ARENA_SIZE - tor.radius * 0.4,
                  minY: tor.radius * 0.4,
                  maxY: ARENA_SIZE - tor.radius * 0.4
                }

            if (tor.x < bounds.minX) {
              tor.x = bounds.minX
              tor.vx = Math.abs(tor.vx)
            } else if (tor.x > bounds.maxX) {
              tor.x = bounds.maxX
              tor.vx = -Math.abs(tor.vx)
            }
            if (tor.y < bounds.minY) {
              tor.y = bounds.minY
              tor.vy = Math.abs(tor.vy)
            } else if (tor.y > bounds.maxY) {
              tor.y = bounds.maxY
              tor.vy = -Math.abs(tor.vy)
            }

            const pullRadius = tor.radius * 1.45
            for (const enemy of enemiesRef.current) {
              if (!enemy.isAlive || enemy.isSpawning) continue
              const ec = enemy.getCenter()
              const dx = tor.x - ec.x
              const dy = tor.y - ec.y
              const dist = Math.hypot(dx, dy)
              if (dist > 10 && dist <= pullRadius) {
                const pull = (tor.isLv5 ? 165 : 110) * deltaTime
                enemy.x += (dx / dist) * pull
                enemy.y += (dy / dist) * pull
              }
              if (dist <= tor.radius + enemy.width / 2) {
                const lastHit = tor.hitCooldowns.get(enemy) ?? -1
                if (tor.timer - lastHit >= 0.24) {
                  tor.hitCooldowns.set(enemy, tor.timer)
                  damageEnemy(
                    enemy,
                    tor.damage,
                    { x: tor.x, y: tor.y },
                    { color: tor.isLv5 ? '#FFD700' : '#38BDF8' }
                  )
                }
              }
            }
          }

          // 4h. Starfall Meteors (descent telegraph -> fiery emerald/gold crater impact)
          for (let m = meteorsRef.current.length - 1; m >= 0; m--) {
            const meteor = meteorsRef.current[m]
            meteor.timer += deltaTime
            if (meteor.timer >= meteor.impactTime) {
              explosionsRef.current.push({
                x: meteor.targetX,
                y: meteor.targetY,
                radius: meteor.radius,
                timer: 0,
                duration: 0.42,
                color: meteor.isCloneCast
                  ? 'rgba(192, 132, 252, 0.7)'
                  : meteor.isLv5
                    ? 'rgba(255, 215, 0, 0.78)'
                    : 'rgba(52, 211, 153, 0.72)'
              })
              for (const enemy of enemiesRef.current) {
                if (!enemy.isAlive || enemy.isSpawning) continue
                const ec = enemy.getCenter()
                if (
                  Math.hypot(ec.x - meteor.targetX, ec.y - meteor.targetY) <=
                  meteor.radius + enemy.width / 2
                ) {
                  damageEnemy(
                    enemy,
                    meteor.damage,
                    { x: meteor.targetX, y: meteor.targetY },
                    { color: meteor.isLv5 ? '#FDE047' : '#34D399' }
                  )
                }
              }
              meteorsRef.current.splice(m, 1)
            }
          }

          // 4h-2. Tempest Spheres (falling sky lightning orbs -> ground crash + expanding pulse wave)
          for (let s = tempestSpheresRef.current.length - 1; s >= 0; s--) {
            const sphere = tempestSpheresRef.current[s]
            sphere.timer += deltaTime
            if (sphere.timer >= sphere.fallTime) {
              const primaryColor = sphere.isCloneCast
                ? '#C084FC'
                : sphere.isPairedHero
                  ? '#E879F9'
                  : sphere.isLv5
                    ? '#FDE047'
                    : '#38BDF8'
              const secondaryColor = sphere.isPairedHero ? '#38BDF8' : '#A855F7'

              explosionsRef.current.push({
                x: sphere.targetX,
                y: sphere.targetY,
                radius: sphere.impactRadius,
                timer: 0,
                duration: 0.34,
                color: sphere.isPairedHero
                  ? 'rgba(168, 85, 247, 0.78)'
                  : 'rgba(56, 189, 248, 0.72)'
              })

              attackEffectsRef.current.push({
                kind: 'lightning_pulse_wave',
                x: sphere.targetX,
                y: sphere.targetY,
                radius: sphere.pulseRadius,
                color: primaryColor,
                secondaryColor,
                timer: 0,
                duration: 0.44
              })

              for (const enemy of enemiesRef.current) {
                if (!enemy.isAlive || enemy.isSpawning) continue
                const ec = enemy.getCenter()
                const dist = Math.hypot(ec.x - sphere.targetX, ec.y - sphere.targetY)
                if (dist <= sphere.impactRadius + enemy.width / 2) {
                  damageEnemy(
                    enemy,
                    sphere.impactDamage,
                    { x: sphere.targetX, y: sphere.targetY },
                    {
                      color: primaryColor,
                      critChanceBonus: sphere.critChanceBonus,
                      critDamageBonus: sphere.critDamageBonus
                    }
                  )
                }
                if (enemy.isAlive && dist <= sphere.pulseRadius + enemy.width / 2) {
                  damageEnemy(
                    enemy,
                    sphere.pulseDamage,
                    { x: sphere.targetX, y: sphere.targetY },
                    {
                      color: secondaryColor,
                      critChanceBonus: sphere.critChanceBonus * 0.7,
                      critDamageBonus: sphere.critDamageBonus
                    }
                  )
                }
              }

              playSoundRef.current('hit')
              tempestSpheresRef.current.splice(s, 1)
            }
          }

          // 4i. Prism Satellite Blades (continuous orbiting chakrams slicing nearby hostiles)
          const prismUpg = activeUpgradesRef.current.find((u) => u.id === 'upg_a2_05')
          const prismLv = upgradeLevelsRef.current['upg_a2_05'] || 0
          if (prismUpg && prismLv > 0) {
            const bladeCount = 1 + prismLv
            const orbitRadius = 92 + prismLv * 15
            const spinSpeed = 2.6 + prismLv * 0.38
            const baseSpin = timeSurvivedRef.current * spinSpeed
            const pCenter = player.getCenter()
            const dmgMult =
              equippedBonusesRef.current.damageMultiplier +
              masteryBonusesRef.current.damageMultiplier +
              getPassiveCritUpgradeBonuses(upgradeLevelsRef.current).weaponDamageMultiplierBonus +
              (isDevUserRef.current && devSettingsRef.current.damageMultiplier > 1
                ? devSettingsRef.current.damageMultiplier - 1
                : 0)
            const bladeDamage = Math.max(1, Math.round(prismUpg.damage * dmgMult))

            for (let b = 0; b < bladeCount; b++) {
              const ba = baseSpin + (b / bladeCount) * Math.PI * 2
              const bx = pCenter.x + Math.cos(ba) * orbitRadius
              const by = pCenter.y + Math.sin(ba) * orbitRadius
              for (const enemy of enemiesRef.current) {
                if (!enemy.isAlive || enemy.isSpawning) continue
                const ec = enemy.getCenter()
                if (Math.hypot(ec.x - bx, ec.y - by) <= 22 + enemy.width / 2) {
                  const lastHit = prismBladeHitCooldownsRef.current.get(enemy) ?? -1
                  if (timeSurvivedRef.current - lastHit >= 0.25) {
                    prismBladeHitCooldownsRef.current.set(enemy, timeSurvivedRef.current)
                    damageEnemy(enemy, bladeDamage, pCenter, {
                      color: prismLv >= MAX_WEAPON_UPGRADE_LEVEL ? '#FFD700' : '#34D399'
                    })
                    explosionsRef.current.push({
                      x: ec.x,
                      y: ec.y,
                      radius: 28,
                      timer: 0,
                      duration: 0.16,
                      color:
                        prismLv >= MAX_WEAPON_UPGRADE_LEVEL
                          ? 'rgba(255, 215, 0, 0.6)'
                          : 'rgba(52, 211, 153, 0.58)'
                    })
                  }
                }
              }
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
            if (enemy.pendingAstralPhaseTwoCutscene) {
              startAstralScourgePhaseTwoCutscene(enemy)
            }
            if (enemy.isBoss && enemy.pendingPhaseAnnouncement !== null) {
              const phaseNum = enemy.pendingPhaseAnnouncement
              enemy.pendingPhaseAnnouncement = null
              playSoundRef.current('wave')
              if (enemy.isFinalBoss || enemy.isWave15SpecialBoss) {
                const solarSeraph = enemy.isWave15SpecialBoss && enemy.enemyId === 'boss_a2_15'
                const phaseMsg = solarSeraph
                  ? phaseNum === 2
                    ? 'PHASE 2: SERAPH SUNLANCE — THE PRISM OPENS!'
                    : 'PHASE 3: CROWN LATTICE — SUNFALL!'
                  : phaseNum === 2
                    ? 'PHASE 2 UNLOCKED: ROTATING X-BEAMS & VOID METEOR SALVO!'
                    : 'FINAL PHASE 3: APOCALYPSE LASER GRID & OVERDRIVE!'
                toast.warning(`${enemy.bossTitle} — ${phaseMsg}`)
                floatingTextsRef.current.push({
                  x: ec.x,
                  y: enemy.y - 24,
                  text: solarSeraph
                    ? phaseNum === 2
                      ? 'SERAPH: SUNLANCE!'
                      : 'SERAPH: CROWN LATTICE!'
                    : phaseNum === 2
                      ? 'PHASE 2: CROSSFIRE!'
                      : 'PHASE 3: OVERDRIVE!',
                  color: solarSeraph
                    ? phaseNum === 2
                      ? '#FACC15'
                      : '#34D399'
                    : phaseNum === 2
                      ? '#38BDF8'
                      : '#FF0055',
                  timer: 1.8
                })
              } else if (enemy.isDevourerOfGods) {
                toast.warning(
                  `${enemy.bossTitle} — PHASE 2: UNIVERSAL COLLAPSE & DIAGONAL LASER WEBS!`
                )
                floatingTextsRef.current.push({
                  x: ec.x,
                  y: enemy.y - 26,
                  text: 'UNIVERSAL COLLAPSE!',
                  color: '#E879F9',
                  timer: 2.0
                })
              } else {
                toast.warning(`${enemy.bossTitle} ENRAGED!`)
                floatingTextsRef.current.push({
                  x: ec.x,
                  y: enemy.y - 20,
                  text: 'BOSS ENRAGED!',
                  color: '#FF0055',
                  timer: 1.4
                })
              }
            }
            if (enemy.isAlive && !enemy.isSpawning) {
              const burnDmg = enemy.tickBurn(deltaTime)
              if (burnDmg > 0) {
                damageEnemy(enemy, burnDmg, undefined, { isBurnTick: true, color: '#FB923C' })
              }
            }
          }

          // Separate overlapping enemies cleanly via spatial-grid circle collision
          resolveEnemyCollisions(enemiesRef.current, ARENA_SIZE)

          for (const enemy of enemiesRef.current) {
            if (!enemy.isAlive) continue
            const ec = enemy.getCenter()
            const enemyCircle = { x: ec.x, y: ec.y, radius: enemy.width / 2 }
            if (!enemy.isSpawning && Collision.circleCircle(playerCircle, enemyCircle)) {
              damagePlayer(enemy.damage, ec)
            } else if (!enemy.isSpawning && checkAstralScourgeTailHit(enemy, playerCircle)) {
              const tail = enemy.dogSegments[enemy.dogSegments.length - 1]
              damagePlayer(enemy.damage, tail)
            } else if (!enemy.isSpawning && checkDevourerSegmentHit(enemy, playerCircle)) {
              damagePlayer(Math.max(12, Math.round(enemy.damage * 0.65)), ec)
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
                  telegraph.kind === 'half_arena' ||
                  telegraph.kind === 'rotating_cross_lasers' ||
                  telegraph.kind === 'void_meteor_salvo' ||
                  telegraph.kind === 'singularity_grid' ||
                  telegraph.kind === 'cosmic_laser_walls' ||
                  telegraph.kind === 'astral_orbital_grid' ||
                  telegraph.kind === 'astral_targeted_lasers' ||
                  telegraph.kind === 'cosmic_portal_lunge' ||
                  telegraph.kind === 'cosmic_orb_barrage'

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
                  telegraph.kind === 'mega_laser' ||
                  telegraph.kind === 'rotating_cross_lasers' ||
                  telegraph.kind === 'singularity_grid' ||
                  telegraph.kind === 'cosmic_laser_walls' ||
                  telegraph.kind === 'astral_orbital_grid' ||
                  telegraph.kind === 'astral_targeted_lasers'
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
          const heroHoming = shouldApplyHomingForHero(player.hero?.id || 'hero_01')
          const homingCfg = getRangerHomingConfig(heroUpgradeLevelRef.current)
          for (let i = playerProjectilesRef.current.length - 1; i >= 0; i--) {
            const proj = playerProjectilesRef.current[i]
            if (heroHoming || proj.homingStrength > 0) {
              if (heroHoming) {
                proj.homingStrength = Math.max(
                  proj.homingStrength,
                  homingCfg.homingStrength
                )
              }
              let lockEnemy: Enemy | null = null
              let lockDist = heroHoming ? homingCfg.lockRange : 750
              for (const enemy of enemiesRef.current) {
                if (!enemy.isAlive || enemy.isSpawning) continue
                const ec = enemy.getCenter()
                const d = Math.hypot(ec.x - proj.x, ec.y - proj.y)
                if (d < lockDist) {
                  lockDist = d
                  lockEnemy = enemy
                }
              }
              if (lockEnemy) {
                proj.homingTarget = lockEnemy.getCenter()
              }
            }
            proj.update(deltaTime)

            if (!proj.isAlive) {
              if (proj.burnRadius > 0 || (proj.explodeAtEnd && proj.explosionRadius > 0)) {
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
              if ((proj.explodeAtEnd || enemy.isWormBoss) && proj.hitEntities.has(enemy)) continue
              const ec = enemy.getCenter()
              const enemyCircle = { x: ec.x, y: ec.y, radius: enemy.width / 2 }

              if (Collision.circleCircle(projCircle, enemyCircle) || checkDevourerSegmentHit(enemy, projCircle)) {
                if (enemy.isWormBoss) {
                  proj.hitEntities.add(enemy)
                }
                if (proj.explodeAtEnd) {
                  proj.hitEntities.add(enemy)
                  const willExpireNow = proj.pierceCount >= proj.maxPierces
                  if (willExpireNow && proj.explosionRadius > 0) {
                    detonateProjectileImpact(proj)
                  } else {
                    damageEnemy(enemy, proj.damage, { x: proj.x, y: proj.y }, {
                      color: proj.freezeDuration > 0 ? '#7DD3FC' : proj.color,
                      critChanceBonus: proj.critChanceBonus,
                      critDamageBonus: proj.critDamageBonus
                    })
                    if (proj.freezeDuration > 0 && enemy.isAlive) {
                      enemy.applyFreeze(proj.freezeDuration)
                    }
                    explosionsRef.current.push({
                      x: ec.x,
                      y: ec.y,
                      radius: 30,
                      timer: 0,
                      duration: 0.18,
                      color:
                        proj.freezeDuration > 0
                          ? 'rgba(56, 189, 248, 0.55)'
                          : proj.color === '#FFD700'
                            ? 'rgba(255, 215, 0, 0.55)'
                            : 'rgba(52, 211, 153, 0.55)'
                    })
                  }
                } else if (proj.explosionRadius > 0) {
                  detonateProjectileImpact(proj)
                } else {
                  damageEnemy(enemy, proj.damage, { x: proj.x, y: proj.y }, {
                    color: proj.freezeDuration > 0 ? '#7DD3FC' : undefined,
                    critChanceBonus: proj.critChanceBonus,
                    critDamageBonus: proj.critDamageBonus
                  })
                  if (proj.freezeDuration > 0 && enemy.isAlive) {
                    enemy.applyFreeze(proj.freezeDuration)
                  }
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
          const totalMagnetMult =
            equippedBonusesRef.current.magnetRangeMultiplier +
            masteryBonusesRef.current.magnetRangeMultiplier
          const magnetRange = baseMagnet * totalMagnetMult
          const totalBonusCoinChance =
            equippedBonusesRef.current.bonusCoinChance + masteryBonusesRef.current.bonusCoinChance
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
              const payout = computeDifficultyCoinPayout({
                baseCoinValue: coin.value,
                difficultyId: difficultyRef.current.id,
                bonusCoinChance: totalBonusCoinChance,
                carry: bonusCoinCarryRef.current
              })
              bonusCoinCarryRef.current = payout.nextCarry
              coinsCollectedRef.current += payout.coinsAwarded
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
            const ft = floatingTextsRef.current[i]
            ft.timer -= deltaTime
            ft.y -= (ft.isCrit ? 14 : 28) * deltaTime
            if (ft.timer <= 0) {
              floatingTextsRef.current.splice(i, 1)
            }
          }

          if (dogPostDropRef.current) {
            dogPostDropRef.current.elapsed += deltaTime
            if (dogPostDropRef.current.elapsed >= 0.95) {
              dogPostDropRef.current = null
            }
          }
          for (let i = dogGroundCracksRef.current.length - 1; i >= 0; i--) {
            const crack = dogGroundCracksRef.current[i]
            crack.timer += deltaTime
            if (crack.timer >= crack.maxDuration) {
              dogGroundCracksRef.current.splice(i, 1)
            }
          }
          for (let i = dogCutsceneParticlesRef.current.length - 1; i >= 0; i--) {
            const pt = dogCutsceneParticlesRef.current[i]
            pt.timer += deltaTime
            if (pt.timer >= pt.duration) {
              dogCutsceneParticlesRef.current.splice(i, 1)
              continue
            }
            if (pt.kind === 'shard') {
              pt.x += pt.vx * deltaTime
              pt.y += pt.vy * deltaTime
              pt.vx *= Math.pow(0.28, deltaTime)
              pt.vy *= Math.pow(0.28, deltaTime)
              pt.angle += pt.spin * deltaTime
            } else if (pt.kind === 'spark') {
              if (pt.attractX !== undefined && pt.attractY !== undefined) {
                const dx = pt.attractX - pt.x
                const dy = pt.attractY - pt.y
                const dist = Math.hypot(dx, dy) || 1
                pt.vx += (dx / dist) * 780 * deltaTime
                pt.vy += (dy / dist) * 780 * deltaTime
              }
              pt.x += pt.vx * deltaTime
              pt.y += pt.vy * deltaTime
            } else if (pt.kind === 'orbit_star') {
              pt.angle += pt.angularSpeed * deltaTime
              pt.radius = Math.max(12, pt.radius - pt.radialSpeed * deltaTime)
              pt.x = pt.centerX + Math.cos(pt.angle) * pt.radius
              pt.y = pt.centerY + Math.sin(pt.angle) * pt.radius * 0.76
            } else if (pt.kind === 'flame') {
              pt.vy -= pt.riseSpeed * deltaTime
              pt.vx *= Math.pow(0.32, deltaTime)
              pt.x += (pt.vx + Math.sin(pt.timer * 14 + pt.swayPhase) * pt.swayAmp) * deltaTime
              pt.y += pt.vy * deltaTime
            } else if (pt.kind === 'ember') {
              pt.vy -= 145 * deltaTime
              pt.x += (pt.vx + Math.sin(pt.timer * 10 + pt.swayPhase) * 42) * deltaTime
              pt.y += pt.vy * deltaTime
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
            setDashCooldown(Math.max(0, dashCooldownRef.current))
            setWaveTimeRemaining(
              isBreatherRef.current
                ? Math.max(0, WAVE_CONFIG.BREATHER_DURATION_SECONDS - breatherElapsedRef.current)
                : Math.max(0, WAVE_CONFIG.WAVE_DURATION_SECONDS - waveElapsedRef.current)
            )
            const liveBoss = enemiesRef.current.find(
              (e) => e.isBoss && e.isAlive && !e.isAstralScourgeIntermission
            )
            if (liveBoss) {
              setActiveBossHud({
                title: liveBoss.bossTitle,
                health: liveBoss.health,
                maxHealth: liveBoss.maxHealth,
                phase: liveBoss.bossPhase,
                totalPhases: liveBoss.isAstralScourge
                  ? 2
                  : liveBoss.isFinalBoss || liveBoss.isWave15SpecialBoss
                    ? 3
                    : liveBoss.enableEnrage
                      ? 2
                      : 1,
                damageReduction: liveBoss.damageReduction,
                isEnraged: liveBoss.isEnraged,
                isFinalBoss: liveBoss.isFinalBoss || liveBoss.isWave15SpecialBoss
              })
            } else {
              setActiveBossHud((prev) => (prev === null ? prev : null))
            }
          }
        }

        // --- RENDER FRAME ---
        const currentArea = areaRef.current
        const astralScourgeBackdropActive =
          currentArea.id === 'astral_citadel' &&
          enemiesRef.current.some((enemy) => enemy.isAstralScourge && enemy.isAlive)
        ctx.fillStyle = currentArea.floorColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        if (astralScourgeBackdropActive) {
          const galaxyImage = astralGalaxyImageRef.current
          ctx.save()
          if (galaxyImage?.complete && galaxyImage.naturalWidth > 0) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.globalAlpha = 0.96
            ctx.drawImage(galaxyImage, 0, 0, canvas.width, canvas.height)
          } else {
            const fallbackGlow = ctx.createRadialGradient(
              canvas.width * 0.48,
              canvas.height * 0.42,
              4,
              canvas.width * 0.48,
              canvas.height * 0.42,
              Math.max(canvas.width, canvas.height) * 0.8
            )
            fallbackGlow.addColorStop(0, '#171333')
            fallbackGlow.addColorStop(0.6, '#090a20')
            fallbackGlow.addColorStop(1, '#02040f')
            ctx.fillStyle = fallbackGlow
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(12, 8, 38, 0.18)'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          const galaxyVignette = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.height * 0.14,
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height) * 0.82
          )
          galaxyVignette.addColorStop(0, 'rgba(2, 4, 20, 0)')
          galaxyVignette.addColorStop(1, 'rgba(2, 3, 16, 0.5)')
          ctx.fillStyle = galaxyVignette
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.restore()
        }

        const activeShake = dogCutsceneRef.current?.active
          ? computeBossCutsceneShake({
              elapsed: dogCutsceneRef.current.elapsed,
              duration: dogCutsceneRef.current.duration,
              sampleTime: dogCutsceneRef.current.wallElapsed,
              line2Time: dogCutsceneRef.current.line2Delay
            })
          : dogPostDropRef.current
            ? computeBossCutsceneShake({
                elapsed: dogPostDropRef.current.duration + dogPostDropRef.current.elapsed,
                duration: dogPostDropRef.current.duration,
                sampleTime: timeSurvivedRef.current,
                line2Time: dogPostDropRef.current.line2Delay
              })
            : { offsetX: 0, offsetY: 0, intensity: 0, flashAlpha: 0 }

        const hasWorldTransform =
          cutsceneZoom > 1.001 ||
          Math.abs(activeShake.offsetX) > 0.05 ||
          Math.abs(activeShake.offsetY) > 0.05

        if (hasWorldTransform) {
          ctx.save()
          ctx.translate(activeShake.offsetX, activeShake.offsetY)
          if (cutsceneZoom > 1.001) {
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.scale(cutsceneZoom, cutsceneZoom)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
          }
        }

        // Tactical Grid
        const gridSize = 64
        const gridPad = hasWorldTransform ? gridSize * 2 : 0
        const startX = -(camera.x % gridSize)
        const startY = -(camera.y % gridSize)
        ctx.strokeStyle = currentArea.gridColor
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = startX - gridPad; x < canvas.width + gridPad; x += gridSize) {
          ctx.moveTo(x, -gridPad)
          ctx.lineTo(x, canvas.height + gridPad)
        }
        for (let y = startY - gridPad; y < canvas.height + gridPad; y += gridSize) {
          ctx.moveTo(-gridPad, y)
          ctx.lineTo(canvas.width + gridPad, y)
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

        // Arena ground fracture fault lines scarred by the Devourer of Gods' cosmic rift
        for (const crack of dogGroundCracksRef.current) {
          const remain = Math.max(0, crack.maxDuration - crack.timer)
          const crackAlpha =
            crack.timer < 0.18
              ? crack.timer / 0.18
              : remain < 0.75
                ? Math.max(0, remain / 0.75)
                : 0.92
          ctx.save()
          ctx.lineCap = 'round'
          ctx.globalAlpha = crackAlpha * 0.42
          ctx.strokeStyle = crack.color
          for (const seg of crack.segments) {
            const p1 = camera.worldToScreen(seg.x1, seg.y1)
            const p2 = camera.worldToScreen(seg.x2, seg.y2)
            ctx.lineWidth = seg.width * 2.4
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
          ctx.globalAlpha = crackAlpha * 0.9
          ctx.strokeStyle = '#F8FAFC'
          for (const seg of crack.segments) {
            const p1 = camera.worldToScreen(seg.x1, seg.y1)
            const p2 = camera.worldToScreen(seg.x2, seg.y2)
            ctx.lineWidth = Math.max(0.8, seg.width * 0.55)
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
          ctx.restore()
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

        // Cryo Aura Ring (crystalline frost rune ring + orbiting ice glints)
        const activeCryoLv = upgradeLevelsRef.current['upg_08'] || 0
        if (activeCryoLv > 0) {
          const pc = camera.worldToScreen(player.getCenter().x, player.getCenter().y)
          const r = 105 + activeCryoLv * 28
          const rot = timeSurvivedRef.current * 0.85
          ctx.save()
          ctx.fillStyle =
            activeCryoLv >= MAX_WEAPON_UPGRADE_LEVEL
              ? 'rgba(56, 189, 248, 0.08)'
              : 'rgba(34, 211, 238, 0.05)'
          ctx.beginPath()
          ctx.arc(pc.x, pc.y, r, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle =
            activeCryoLv >= MAX_WEAPON_UPGRADE_LEVEL
              ? 'rgba(125, 211, 252, 0.6)'
              : 'rgba(0, 240, 255, 0.35)'
          ctx.lineWidth = activeCryoLv >= MAX_WEAPON_UPGRADE_LEVEL ? 3 : 2
          ctx.setLineDash([14, 8])
          ctx.lineDashOffset = -rot * 36
          ctx.beginPath()
          ctx.arc(pc.x, pc.y, r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          const crystalCount = 4 + activeCryoLv * 2
          for (let c = 0; c < crystalCount; c++) {
            const ca = rot + (c / crystalCount) * Math.PI * 2
            const cx = pc.x + Math.cos(ca) * r
            const cy = pc.y + Math.sin(ca) * r
            ctx.fillStyle = c % 2 === 0 ? '#E0F2FE' : '#38BDF8'
            ctx.beginPath()
            ctx.moveTo(cx, cy - 5)
            ctx.lineTo(cx + 4, cy)
            ctx.lineTo(cx, cy + 5)
            ctx.lineTo(cx - 4, cy)
            ctx.closePath()
            ctx.fill()
          }
          ctx.restore()
        }

        // Void Singularity Vortices (swirling accretion spiral arms + event horizon)
        for (const vortex of voidVorticesRef.current) {
          const vp = camera.worldToScreen(vortex.x, vortex.y)
          const progress = Math.min(1, vortex.timer / vortex.duration)
          const outerR = Math.max(12, vortex.radius)
          const coreR = Math.max(8, outerR * (0.28 + 0.14 * Math.sin(progress * Math.PI * 8)))
          const swirl = vortex.timer * 4.5
          ctx.save()
          const grad = ctx.createRadialGradient(vp.x, vp.y, coreR * 0.4, vp.x, vp.y, outerR)
          grad.addColorStop(0, 'rgba(15, 23, 42, 0.72)')
          grad.addColorStop(0.5, vortex.isLv5 ? 'rgba(192, 132, 252, 0.34)' : 'rgba(147, 51, 234, 0.25)')
          grad.addColorStop(1, 'rgba(88, 28, 135, 0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(vp.x, vp.y, outerR, 0, Math.PI * 2)
          ctx.fill()

          // Swirling gravity spiral arms
          const arms = vortex.isLv5 ? 4 : 3
          for (let a = 0; a < arms; a++) {
            const baseA = swirl + (a / arms) * Math.PI * 2
            ctx.strokeStyle = a % 2 === 0 ? (vortex.isLv5 ? '#FFD700' : '#E879F9') : '#A855F7'
            ctx.lineWidth = 2.4
            ctx.beginPath()
            ctx.arc(vp.x, vp.y, outerR * 0.72, baseA, baseA + 1.15)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(vp.x, vp.y, outerR * 0.44, -baseA, -baseA + 1.05)
            ctx.stroke()
          }

          // Event horizon core
          ctx.strokeStyle = vortex.isLv5 ? '#FDE047' : '#F0ABFC'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(vp.x, vp.y, coreR, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = '#05070E'
          ctx.beginPath()
          ctx.arc(vp.x, vp.y, Math.max(4, coreR * 0.65), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Scorching Magma Fire Areas (Inferno Fireball & Solar Flare Flail fire pools)
        for (const zone of burnZonesRef.current) {
          const zp = camera.worldToScreen(zone.x, zone.y)
          const remaining = Math.max(0, zone.duration - zone.timer)
          const fade = Math.min(1, remaining / 0.45)
          const pulse = 1 + Math.sin(zone.timer * 14) * 0.045
          const r = Math.max(14, zone.radius * pulse)

          ctx.save()
          ctx.globalAlpha = fade
          const magmaGrad = ctx.createRadialGradient(zp.x, zp.y, r * 0.12, zp.x, zp.y, r)
          magmaGrad.addColorStop(0, zone.isLv5 ? 'rgba(250, 204, 21, 0.48)' : 'rgba(251, 146, 60, 0.42)')
          magmaGrad.addColorStop(0.65, 'rgba(234, 88, 12, 0.32)')
          magmaGrad.addColorStop(1, 'rgba(153, 27, 27, 0.08)')
          ctx.fillStyle = magmaGrad
          ctx.beginPath()
          ctx.arc(zp.x, zp.y, r, 0, Math.PI * 2)
          ctx.fill()

          // Glowing magma outer ring & inner ring
          ctx.strokeStyle = zone.isLv5 ? '#FDE047' : '#FB923C'
          ctx.lineWidth = 2.4
          ctx.beginPath()
          ctx.arc(zp.x, zp.y, r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(zp.x, zp.y, r * 0.66, 0, Math.PI * 2)
          ctx.stroke()

          // Orbiting magma embers & multi-layered flame tongues
          const flameCount = zone.isLv5 ? 9 : 6
          for (let f = 0; f < flameCount; f++) {
            const ang = (f / flameCount) * Math.PI * 2 + zone.timer * 1.75
            const dist = r * (0.34 + ((f % 2) * 0.28))
            const fx = zp.x + Math.cos(ang) * dist
            const fy = zp.y + Math.sin(ang) * dist
            const flameH = 9 + Math.sin(zone.timer * 24 + f * 3) * 3.5
            ctx.fillStyle = f % 2 === 0 ? '#F97316' : '#FDE047'
            ctx.beginPath()
            ctx.moveTo(fx - 4.5, fy + 2.5)
            ctx.lineTo(fx, fy - flameH)
            ctx.lineTo(fx + 4.5, fy + 2.5)
            ctx.closePath()
            ctx.fill()

            ctx.fillStyle = '#FEF9C3'
            ctx.beginPath()
            ctx.arc(fx, fy - flameH * 0.25, 1.8, 0, Math.PI * 2)
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

        // Explosions (radial energy blast, white-hot flash core, double shock rings & spark needles)
        for (const fx of explosionsRef.current) {
          const sp = camera.worldToScreen(fx.x, fx.y)
          const progress = Math.min(1, fx.timer / fx.duration)
          const outerR = Math.max(3, fx.radius * (0.35 + progress * 0.65))
          ctx.save()
          ctx.globalAlpha = Math.max(0, 1 - progress)

          const blastGrad = ctx.createRadialGradient(sp.x, sp.y, outerR * 0.1, sp.x, sp.y, outerR)
          blastGrad.addColorStop(0, 'rgba(255, 255, 255, 0.72)')
          blastGrad.addColorStop(0.45, fx.color)
          blastGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = blastGrad
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, outerR, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = fx.color
          ctx.lineWidth = 3 * (1 - progress * 0.45)
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, outerR, 0, Math.PI * 2)
          ctx.stroke()

          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, Math.max(1, outerR * 0.68), 0, Math.PI * 2)
          ctx.stroke()

          const sparkCount = 8
          for (let k = 0; k < sparkCount; k++) {
            const sa = (k / sparkCount) * Math.PI * 2 + fx.x * 0.05
            const r1 = outerR * 0.55
            const r2 = outerR * (0.95 + progress * 0.25)
            ctx.strokeStyle = k % 2 === 0 ? '#FFFFFF' : '#FDE047'
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.moveTo(sp.x + Math.cos(sa) * r1, sp.y + Math.sin(sa) * r1)
            ctx.lineTo(sp.x + Math.cos(sa) * r2, sp.y + Math.sin(sa) * r2)
            ctx.stroke()
          }
          ctx.restore()
        }

        // Reworked Weapon Attack Effects (Lightning, Crescent Slash, Muramasa Bloodmoon, Sky Beam, Siphon, Heal Wave)
        for (const fx of attackEffectsRef.current) {
          const progress = Math.min(1, fx.timer / fx.duration)
          const alpha = Math.max(0, 1 - progress)
          ctx.save()
          ctx.globalAlpha = alpha

          if (fx.kind === 'lightning' && fx.points.length > 1) {
            const screenPts = fx.points.map((pt) => camera.worldToScreen(pt.x, pt.y))
            const drawJagged = (lineW: number, strokeColor: string, branch = false) => {
              ctx.strokeStyle = strokeColor
              ctx.lineWidth = lineW
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              ctx.beginPath()
              ctx.moveTo(screenPts[0].x, screenPts[0].y)
              for (let i = 1; i < screenPts.length; i++) {
                const a = screenPts[i - 1]
                const b = screenPts[i]
                const steps = 5
                for (let s = 1; s < steps; s++) {
                  const t = s / steps
                  const jitter = Math.sin(i * 19 + s * 37 + fx.timer * 105) * (branch ? 18 : 13)
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
            drawJagged(9, fx.color, true)
            drawJagged(5, fx.color)
            drawJagged(2.2, '#FFFFFF')
            for (let i = 1; i < screenPts.length; i++) {
              const p = screenPts[i]
              ctx.fillStyle = fx.color
              ctx.beginPath()
              ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2)
              ctx.fill()
              ctx.fillStyle = '#FFFFFF'
              ctx.beginPath()
              ctx.arc(p.x, p.y, 3.8, 0, Math.PI * 2)
              ctx.fill()
            }
          } else if (fx.kind === 'slash') {
            const sp = camera.worldToScreen(fx.x, fx.y)
            const sweepStart = fx.angle - 1.48 + progress * 0.42
            const sweepEnd = fx.angle + 1.48 + progress * 0.42
            const rOuter = Math.max(14, fx.radius * (0.76 + progress * 0.28))
            const rMid = rOuter * 0.82
            const rInner = Math.max(7, rOuter * 0.62)

            // Outer glow crescent wave
            ctx.fillStyle = fx.color
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rOuter, sweepStart, sweepEnd)
            ctx.arc(sp.x, sp.y, rInner, sweepEnd, sweepStart, true)
            ctx.closePath()
            ctx.fill()

            // Inner echo ribbon
            ctx.strokeStyle = fx.color
            ctx.lineWidth = 2.4
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rMid * 0.9, sweepStart - 0.14, sweepEnd + 0.1)
            ctx.stroke()

            // Razor white cutting edge + slice glints
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 3.6
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rOuter, sweepStart, sweepEnd)
            ctx.stroke()

            for (let s = 0; s < 5; s++) {
              const ang = sweepStart + (s / 4) * (sweepEnd - sweepStart)
              const dist = rOuter * 0.92
              ctx.strokeStyle = '#FFFFFF'
              ctx.lineWidth = 1.8
              ctx.beginPath()
              ctx.moveTo(sp.x + Math.cos(ang - 0.1) * dist, sp.y + Math.sin(ang - 0.1) * dist)
              ctx.lineTo(
                sp.x + Math.cos(ang + 0.12) * (dist + 14),
                sp.y + Math.sin(ang + 0.12) * (dist + 14)
              )
              ctx.stroke()
            }
          } else if (fx.kind === 'muramasa_slash') {
            // Terraria Calamity Muramasa-inspired Bloodmoon Crimson multi-layered crescent wave
            const sp = camera.worldToScreen(fx.x, fx.y)
            const sweepStart = fx.angle - 2.15 + progress * 0.5
            const sweepEnd = fx.angle + 2.15 + progress * 0.5
            const rOuter = Math.max(20, fx.radius * (0.76 + progress * 0.32))
            const rMid = rOuter * 0.8
            const rInner = Math.max(10, rOuter * 0.54)

            // Outer blood-obsidian crimson shockwave aura
            ctx.fillStyle = fx.color === '#C084FC' ? 'rgba(126, 34, 206, 0.78)' : 'rgba(127, 29, 29, 0.84)'
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rOuter, sweepStart, sweepEnd)
            ctx.arc(sp.x, sp.y, rInner, sweepEnd, sweepStart, true)
            ctx.closePath()
            ctx.fill()

            // Neon crimson Muramasa plasma core
            ctx.fillStyle = fx.color
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rOuter * 0.94, sweepStart + 0.08, sweepEnd - 0.08)
            ctx.arc(sp.x, sp.y, rMid * 0.84, sweepEnd - 0.08, sweepStart + 0.08, true)
            ctx.closePath()
            ctx.fill()

            // Twin counter-sweeping echo blood-arcs
            ctx.strokeStyle = fx.color === '#C084FC' ? '#E879F9' : '#FB7185'
            ctx.lineWidth = 2.8
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rMid, sweepStart - 0.2, sweepEnd + 0.15)
            ctx.stroke()

            // Incandescent white-rose razor cutting edge
            ctx.strokeStyle = '#FFE4E6'
            ctx.lineWidth = 4.5
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, rOuter, sweepStart, sweepEnd)
            ctx.stroke()

            // High-velocity crimson katana glint needles
            const streakCount = 9
            for (let s = 0; s < streakCount; s++) {
              const frac = s / (streakCount - 1)
              const ang = sweepStart + frac * (sweepEnd - sweepStart)
              const dist = rMid * (0.82 + (s % 2) * 0.18)
              const lx1 = sp.x + Math.cos(ang - 0.13) * dist
              const ly1 = sp.y + Math.sin(ang - 0.13) * dist
              const lx2 = sp.x + Math.cos(ang + 0.15) * (dist + 22)
              const ly2 = sp.y + Math.sin(ang + 0.15) * (dist + 22)
              ctx.strokeStyle = s % 2 === 0 ? '#FFFFFF' : '#FF2E63'
              ctx.lineWidth = 2.2
              ctx.beginPath()
              ctx.moveTo(lx1, ly1)
              ctx.lineTo(lx2, ly2)
              ctx.stroke()
            }
          } else if (fx.kind === 'orbital_strike') {
            const sp = camera.worldToScreen(fx.x, fx.y)
            const beamHalfW = Math.max(5, fx.radius * 0.28 * (1 - progress * 0.55))
            const groundR = Math.max(10, fx.radius * (0.35 + progress * 0.65))

            // Outer ionization pillar + inner white-hot core + energy helix
            ctx.fillStyle = fx.color
            ctx.globalAlpha = alpha * 0.42
            ctx.fillRect(sp.x - beamHalfW * 1.4, 0, beamHalfW * 2.8, sp.y)
            ctx.fillStyle = '#FFFFFF'
            ctx.globalAlpha = alpha * 0.9
            ctx.fillRect(sp.x - beamHalfW * 0.4, 0, beamHalfW * 0.8, sp.y)

            ctx.globalAlpha = alpha
            ctx.strokeStyle = '#FEF08A'
            ctx.lineWidth = 2.2
            ctx.beginPath()
            for (let y = 0; y <= sp.y; y += 18) {
              const hx = sp.x + Math.sin(y * 0.05 + fx.timer * 26) * (beamHalfW * 1.55)
              if (y === 0) ctx.moveTo(hx, y)
              else ctx.lineTo(hx, y)
            }
            ctx.stroke()

            // Triple concentric ground targeting rings + scorch core
            ctx.strokeStyle = fx.color
            ctx.lineWidth = 3.2
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, groundR, 0, Math.PI * 2)
            ctx.stroke()
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 1.6
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, groundR * 0.62, 0, Math.PI * 2)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(sp.x - groundR * 0.55, sp.y)
            ctx.lineTo(sp.x + groundR * 0.55, sp.y)
            ctx.moveTo(sp.x, sp.y - groundR * 0.55)
            ctx.lineTo(sp.x, sp.y + groundR * 0.55)
            ctx.stroke()
          } else if (fx.kind === 'siphon') {
            const a = camera.worldToScreen(fx.from.x, fx.from.y)
            const b = camera.worldToScreen(fx.to.x, fx.to.y)
            const wave = Math.sin(fx.timer * 28) * 16
            const midX1 = (a.x + b.x) / 2 + wave
            const midY1 = (a.y + b.y) / 2 - Math.cos(fx.timer * 28) * 16
            const midX2 = (a.x + b.x) / 2 - wave
            const midY2 = (a.y + b.y) / 2 + Math.cos(fx.timer * 28) * 16

            ctx.strokeStyle = fx.color
            ctx.lineWidth = 3.5
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.quadraticCurveTo(midX1, midY1, b.x, b.y)
            ctx.stroke()

            ctx.strokeStyle = '#FDA4AF'
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.quadraticCurveTo(midX2, midY2, b.x, b.y)
            ctx.stroke()

            const t = progress
            const orbX = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * midX1 + t * t * b.x
            const orbY = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * midY1 + t * t * b.y
            ctx.fillStyle = '#FFE4E6'
            ctx.beginPath()
            ctx.arc(orbX, orbY, 5.2, 0, Math.PI * 2)
            ctx.fill()
          } else if (fx.kind === 'heal_wave') {
            const sp = camera.worldToScreen(fx.x, fx.y)
            const r = Math.max(10, fx.radius * (0.35 + progress * 0.65))
            ctx.strokeStyle = '#10B981'
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
            ctx.stroke()
            ctx.strokeStyle = '#6EE7B7'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r * 0.65, 0, Math.PI * 2)
            ctx.stroke()
            ctx.fillStyle = '#34D399'
            ctx.fillRect(sp.x - 3, sp.y - 14 - progress * 18, 6, 20)
            ctx.fillRect(sp.x - 10, sp.y - 7 - progress * 18, 20, 6)
          } else if (fx.kind === 'lightning_pulse_wave') {
            const sp = camera.worldToScreen(fx.x, fx.y)
            const waveR = Math.max(12, fx.radius * (0.14 + progress * 0.86))
            const innerR = Math.max(6, waveR * 0.72)

            const ringGrad = ctx.createRadialGradient(sp.x, sp.y, innerR * 0.45, sp.x, sp.y, waveR)
            ringGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
            ringGrad.addColorStop(0.65, `${fx.secondaryColor}33`)
            ringGrad.addColorStop(0.92, `${fx.color}77`)
            ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
            ctx.fillStyle = ringGrad
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, waveR, 0, Math.PI * 2)
            ctx.fill()

            // Main high-voltage expanding pulse wave ring
            ctx.strokeStyle = fx.color
            ctx.lineWidth = Math.max(2, 6 * (1 - progress * 0.5))
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, waveR, 0, Math.PI * 2)
            ctx.stroke()

            // Crisp white-cyan inner shock ring
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 2.2
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, waveR * 0.94, 0, Math.PI * 2)
            ctx.stroke()

            // Crackling secondary trailing arc wave
            ctx.strokeStyle = fx.secondaryColor
            ctx.lineWidth = 2.5
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, innerR, 0, Math.PI * 2)
            ctx.stroke()

            // Jagged electric arcs snapping around the pulse wavefront
            const arcSegments = 12
            ctx.strokeStyle = '#E0F2FE'
            ctx.lineWidth = 2
            ctx.beginPath()
            for (let k = 0; k <= arcSegments; k++) {
              const a = (k / arcSegments) * Math.PI * 2 + fx.timer * 14
              const jitter = (k % 2 === 0 ? 1 : -1) * Math.sin(fx.timer * 90 + k * 5) * 9
              const rx = sp.x + Math.cos(a) * (waveR + jitter)
              const ry = sp.y + Math.sin(a) * (waveR + jitter)
              if (k === 0) ctx.moveTo(rx, ry)
              else ctx.lineTo(rx, ry)
            }
            ctx.closePath()
            ctx.stroke()
          }

          ctx.restore()
        }

        // Sweeping Orbital Laser Beams (outer glow + core + traveling pulse rings + tip flare)
        for (const beam of activeBeamsRef.current) {
          const originWorldX = beam.originX ?? player.getCenter().x
          const originWorldY = beam.originY ?? player.getCenter().y
          const pcScreen = camera.worldToScreen(originWorldX, originWorldY)
          const cos = Math.cos(beam.angle)
          const sin = Math.sin(beam.angle)
          const endX = pcScreen.x + cos * beam.length
          const endY = pcScreen.y + sin * beam.length
          const beamGlow =
            beam.color === '#34D399'
              ? 'rgba(52, 211, 153, 0.44)'
              : beam.color === '#FFD700'
                ? 'rgba(255, 215, 0, 0.45)'
                : beam.color
                  ? 'rgba(192, 132, 252, 0.45)'
                  : 'rgba(0, 240, 255, 0.42)'
          const beamTipColor =
            beam.color === '#34D399'
              ? '#A7F3D0'
              : beam.color === '#FFD700'
                ? '#FEF08A'
                : beam.color
                  ? '#E9D5FF'
                  : '#BAE6FD'

          ctx.save()
          ctx.strokeStyle = beamGlow
          ctx.lineWidth = 17
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(pcScreen.x, pcScreen.y)
          ctx.lineTo(endX, endY)
          ctx.stroke()

          ctx.strokeStyle = beam.color || '#38BDF8'
          ctx.lineWidth = 8.5
          ctx.beginPath()
          ctx.moveTo(pcScreen.x, pcScreen.y)
          ctx.lineTo(endX, endY)
          ctx.stroke()

          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 3.5
          ctx.beginPath()
          ctx.moveTo(pcScreen.x, pcScreen.y)
          ctx.lineTo(endX, endY)
          ctx.stroke()

          // Traveling focus pulse nodes along the laser beam
          for (let p = 0; p < 3; p++) {
            const frac = ((beam.timer * 2.2 + p / 3) % 1) * beam.length
            const nx = pcScreen.x + cos * frac
            const ny = pcScreen.y + sin * frac
            ctx.fillStyle = '#FFFFFF'
            ctx.beginPath()
            ctx.arc(nx, ny, 4.5, 0, Math.PI * 2)
            ctx.fill()
          }
          // Bright tip flare
          ctx.fillStyle = beamTipColor
          ctx.beginPath()
          ctx.arc(endX, endY, 7 + Math.sin(beam.timer * 32) * 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Legendary Boomerang Spinning Solar Flare Flails (Molten Chain + Blazing Spiked Mace Head)
        for (const flail of solarFlailsRef.current) {
          const originScr = camera.worldToScreen(flail.originX, flail.originY)
          const headScr = camera.worldToScreen(flail.x, flail.y)
          ctx.save()

          // Fiery afterimage trail behind mace head
          for (let t = 0; t < flail.trail.length; t++) {
            const pt = camera.worldToScreen(flail.trail[t].x, flail.trail[t].y)
            const frac = (t + 1) / flail.trail.length
            ctx.globalAlpha = frac * 0.42
            ctx.fillStyle = flail.isCloneCast ? '#C084FC' : t % 2 === 0 ? '#EA580C' : '#FACC15'
            ctx.beginPath()
            ctx.arc(pt.x, pt.y, Math.max(4, flail.headRadius * 0.72 * frac), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1

          // Molten energy chain from wielder to spinning mace head
          const cdx = headScr.x - originScr.x
          const cdy = headScr.y - originScr.y
          const chainLen = Math.hypot(cdx, cdy)
          if (chainLen > 4) {
            // Outer plasma chain tether glow
            ctx.strokeStyle = flail.isCloneCast
              ? 'rgba(192, 132, 252, 0.55)'
              : 'rgba(249, 115, 22, 0.65)'
            ctx.lineWidth = 6
            ctx.beginPath()
            ctx.moveTo(originScr.x, originScr.y)
            ctx.lineTo(headScr.x, headScr.y)
            ctx.stroke()

            // Individual glowing chain links
            const linkCount = Math.max(4, Math.floor(chainLen / 18))
            for (let l = 1; l < linkCount; l++) {
              const frac = l / linkCount
              const lx = originScr.x + cdx * frac
              const ly = originScr.y + cdy * frac
              ctx.fillStyle = l % 2 === 0 ? '#FEF08A' : '#F97316'
              ctx.strokeStyle = '#7C2D12'
              ctx.lineWidth = 1.4
              ctx.beginPath()
              ctx.arc(lx, ly, 3.6, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
            }
          }

          // Spinning Spiked Solar Mace Head
          ctx.translate(headScr.x, headScr.y)
          const r = flail.headRadius

          // Outer blazing solar aura & sweeping flare arcs
          ctx.fillStyle = flail.isCloneCast
            ? 'rgba(168, 85, 247, 0.32)'
            : 'rgba(251, 146, 60, 0.34)'
          ctx.beginPath()
          ctx.arc(0, 0, r * 1.42, 0, Math.PI * 2)
          ctx.fill()

          ctx.rotate(flail.spinAngle)
          for (let arcIdx = 0; arcIdx < 2; arcIdx++) {
            const a0 = arcIdx * Math.PI
            ctx.strokeStyle = flail.isCloneCast ? '#E9D5FF' : '#FDE047'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(0, 0, r * 1.24, a0, a0 + 1.35)
            ctx.stroke()
          }

          // Spiked Solar Flail Star Silhouette (10 heavy magma spikes)
          const spikes = 10
          ctx.fillStyle = flail.isCloneCast ? '#9333EA' : '#EA580C'
          ctx.strokeStyle = flail.isCloneCast ? '#F3E8FF' : '#FEF08A'
          ctx.lineWidth = 2
          ctx.beginPath()
          for (let s = 0; s < spikes * 2; s++) {
            const sa = (s / (spikes * 2)) * Math.PI * 2
            const sr = s % 2 === 0 ? r * 1.15 : r * 0.64
            const sx = Math.cos(sa) * sr
            const sy = Math.sin(sa) * sr
            if (s === 0) ctx.moveTo(sx, sy)
            else ctx.lineTo(sx, sy)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Apex full-extension solar flare ring pulsing right before snap-back
          if (flail.phase === 'apex') {
            const apexFrac = Math.min(1, flail.apexTimer / Math.max(0.01, flail.apexDuration))
            ctx.save()
            ctx.strokeStyle = flail.isCloneCast
              ? 'rgba(233, 213, 255, 0.85)'
              : 'rgba(251, 146, 60, 0.9)'
            ctx.lineWidth = 3.5
            ctx.beginPath()
            ctx.arc(0, 0, flail.burnRadius * (0.45 + apexFrac * 0.55), 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }

          // Incandescent white-gold solar star core
          ctx.fillStyle = flail.isCloneCast ? '#E9D5FF' : '#FEF9C3'
          ctx.beginPath()
          ctx.arc(0, 0, Math.max(5, r * 0.44), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Cyclone Tempest Tornadoes (swirling stacked wind funnel rings + crackling core)
        for (const tor of tornadoesRef.current) {
          const ts = camera.worldToScreen(tor.x, tor.y)
          const remaining = Math.max(0, tor.duration - tor.timer)
          const fade = Math.min(1, Math.min(tor.timer / 0.25, remaining / 0.35))
          ctx.save()
          ctx.globalAlpha = fade

          // Ground suction vortex shadow & glow
          const grad = ctx.createRadialGradient(ts.x, ts.y, 6, ts.x, ts.y, tor.radius)
          grad.addColorStop(
            0,
            tor.isLv5 ? 'rgba(255, 215, 0, 0.36)' : 'rgba(56, 189, 248, 0.34)'
          )
          grad.addColorStop(1, 'rgba(56, 189, 248, 0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(ts.x, ts.y, tor.radius, 0, Math.PI * 2)
          ctx.fill()

          // Rising stacked funnel ellipses
          const rings = 5
          for (let k = 0; k < rings; k++) {
            const frac = k / (rings - 1)
            const ringR = tor.radius * (0.34 + frac * 0.62)
            const wobbleX = Math.sin(tor.timer * 14 + k * 1.4) * 5
            const ry = ts.y - k * 8.5
            ctx.strokeStyle =
              k % 2 === 0
                ? tor.isCloneCast
                  ? '#C084FC'
                  : tor.isLv5
                    ? '#FFD700'
                    : '#38BDF8'
                : '#E0F2FE'
            ctx.lineWidth = 2.6 - frac * 0.8
            const spinA = tor.timer * (8 + k * 1.6) + k
            ctx.beginPath()
            ctx.ellipse(ts.x + wobbleX, ry, ringR, ringR * 0.42, 0, spinA, spinA + Math.PI * 1.45)
            ctx.stroke()
          }

          // Orbiting wind debris streaks
          for (let d = 0; d < 6; d++) {
            const da = tor.timer * 9 + (d / 6) * Math.PI * 2
            const dr = tor.radius * (0.55 + (d % 2) * 0.3)
            const dx = ts.x + Math.cos(da) * dr
            const dy = ts.y - (d % 3) * 10 + Math.sin(da) * dr * 0.45
            ctx.fillStyle = d % 2 === 0 ? '#FFFFFF' : tor.isLv5 ? '#FDE047' : '#67E8F9'
            ctx.beginPath()
            ctx.arc(dx, dy, 2.4, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }

        // Falling Starfall Meteors (ground target ring + diagonal blazing sky meteor streak)
        for (const meteor of meteorsRef.current) {
          if (meteor.timer < 0) continue
          const frac = Math.min(1, meteor.timer / meteor.impactTime)
          const mp = camera.worldToScreen(meteor.targetX, meteor.targetY)
          const startX = mp.x - 160 * (1 - frac)
          const startY = mp.y - 340 * (1 - frac)
          const accent = meteor.isCloneCast
            ? '#C084FC'
            : meteor.isLv5
              ? '#FFD700'
              : '#34D399'

          ctx.save()
          // Ground impact crater preview reticle
          ctx.strokeStyle = accent
          ctx.globalAlpha = 0.35 + frac * 0.55
          ctx.lineWidth = 2.4
          ctx.beginPath()
          ctx.arc(mp.x, mp.y, meteor.radius * (0.4 + frac * 0.6), 0, Math.PI * 2)
          ctx.stroke()

          // Descending meteor sky trail
          ctx.globalAlpha = 1
          ctx.strokeStyle = accent
          ctx.lineWidth = 8
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(startX - 42, startY - 90)
          ctx.lineTo(startX, startY)
          ctx.stroke()

          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(startX, startY, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Descending Tempest Spheres (falling high-voltage lightning orbs + ground crash & pulse reticle)
        for (const sphere of tempestSpheresRef.current) {
          if (sphere.timer < 0) continue
          const frac = Math.min(1, sphere.timer / sphere.fallTime)
          const easeFrac = frac * frac
          const curWorldX = sphere.startX + (sphere.targetX - sphere.startX) * easeFrac
          const curWorldY = sphere.startY + (sphere.targetY - sphere.startY) * easeFrac
          const gp = camera.worldToScreen(sphere.targetX, sphere.targetY)
          const sp = camera.worldToScreen(curWorldX, curWorldY)
          const coreColor = sphere.isCloneCast
            ? '#C084FC'
            : sphere.isPairedHero
              ? '#E879F9'
              : sphere.isLv5
                ? '#FDE047'
                : '#38BDF8'
          const auraColor = sphere.isPairedHero ? '#A855F7' : '#0EA5E9'

          ctx.save()
          // Ground impact & pulse wave telegraph rings
          ctx.strokeStyle = auraColor
          ctx.globalAlpha = 0.25 + frac * 0.45
          ctx.lineWidth = 2
          ctx.setLineDash([8, 6])
          ctx.beginPath()
          ctx.arc(gp.x, gp.y, sphere.pulseRadius * (0.45 + frac * 0.55), 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.strokeStyle = coreColor
          ctx.globalAlpha = 0.5 + frac * 0.5
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(gp.x, gp.y, sphere.impactRadius * (0.35 + frac * 0.65), 0, Math.PI * 2)
          ctx.stroke()

          // Vertical sky lightning wake above falling sphere
          ctx.globalAlpha = 0.85
          ctx.strokeStyle = coreColor
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.moveTo(sp.x - 10, sp.y - 115)
          ctx.lineTo(sp.x + 8, sp.y - 58)
          ctx.lineTo(sp.x - 6, sp.y - 24)
          ctx.lineTo(sp.x, sp.y)
          ctx.stroke()

          // Descending crackling Lightning Sphere orb
          const orbR = sphere.isPairedHero ? 26 : 21
          const orbGrad = ctx.createRadialGradient(sp.x, sp.y, 3, sp.x, sp.y, orbR * 1.65)
          orbGrad.addColorStop(0, '#FFFFFF')
          orbGrad.addColorStop(0.45, coreColor)
          orbGrad.addColorStop(0.78, auraColor)
          orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = orbGrad
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, orbR * 1.65, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, orbR * 0.52, 0, Math.PI * 2)
          ctx.fill()

          // Orbiting crackling tendrils on sphere
          ctx.strokeStyle = '#E0F2FE'
          ctx.lineWidth = 2
          for (let t = 0; t < 4; t++) {
            const ta = frac * 12 + (t * Math.PI) / 2
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, orbR * 0.95, ta, ta + 0.95)
            ctx.stroke()
          }
          ctx.restore()
        }

        // Boss Cutscene Dimensional Rift (Devourer of Gods) OR Area Inferno Pyre Crown (Wave 15 Final Bosses)
        if (dogCutsceneRef.current?.active) {
          const cs = dogCutsceneRef.current
          const pScr = camera.worldToScreen(cs.portalX, cs.portalY)
          const tFrac = Math.min(1, cs.elapsed / cs.duration)
          const openFrac = tFrac < 0.25 ? tFrac / 0.25 : tFrac > 0.85 ? Math.max(0, (1 - tFrac) / 0.15) : 1

          ctx.save()
          if (cs.kind === 'dog') {
            const riftRx = 42 + openFrac * 86
            const riftRy = 16 + openFrac * 34

            ctx.globalAlpha = 0.88 * openFrac
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
            ctx.beginPath()
            ctx.ellipse(pScr.x, pScr.y, riftRx * 1.18, riftRy * 1.18, 0, 0, Math.PI * 2)
            ctx.fill()

            ctx.globalAlpha = 0.26 * openFrac
            ctx.fillStyle = cs.theme.secondaryColor
            ctx.beginPath()
            ctx.ellipse(pScr.x, pScr.y, riftRx * 1.38, riftRy * 1.38, 0, 0, Math.PI * 2)
            ctx.fill()

            ctx.globalAlpha = 0.92
            ctx.strokeStyle = cs.theme.secondaryColor
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.ellipse(pScr.x, pScr.y, riftRx, riftRy, 0, 0, Math.PI * 2)
            ctx.stroke()

            ctx.strokeStyle = cs.theme.primaryColor
            ctx.lineWidth = 2
            ctx.setLineDash([12, 8])
            ctx.lineDashOffset = -cs.elapsed * 95
            ctx.beginPath()
            ctx.ellipse(pScr.x, pScr.y, riftRx * 0.78, riftRy * 0.78, 0, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])
          } else if (cs.kind === 'w15_omega') {
            const coreR = 56 + openFrac * (74 + tFrac * 30)
            const corePulse = 0.9 + Math.sin(cs.elapsed * 14) * 0.1
            ctx.globalAlpha = 0.22 * openFrac * corePulse
            ctx.fillStyle = cs.theme.primaryColor
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, coreR * 1.55, 0, Math.PI * 2)
            ctx.fill()

            ctx.save()
            ctx.translate(pScr.x, pScr.y)
            ctx.rotate(-cs.elapsed * 0.42)
            for (let ring = 0; ring < 3; ring++) {
              const ringR = coreR * (0.72 + ring * 0.22)
              ctx.globalAlpha = (0.72 - ring * 0.12) * openFrac
              ctx.strokeStyle = ring % 2 === 0 ? cs.theme.primaryColor : cs.theme.secondaryColor
              ctx.lineWidth = ring === 1 ? 3 : 2
              ctx.setLineDash(ring === 1 ? [14, 9] : [])
              ctx.beginPath()
              ctx.arc(0, 0, ringR, ring * 0.7, Math.PI * 1.55 + ring * 0.7)
              ctx.stroke()
            }
            ctx.setLineDash([])

            ctx.rotate(cs.elapsed * 0.95)
            ctx.globalAlpha = 0.88 * openFrac
            ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
            ctx.strokeStyle = cs.theme.coreColor
            ctx.lineWidth = 3
            ctx.beginPath()
            for (let side = 0; side < 8; side++) {
              const angle = (side / 8) * Math.PI * 2 - Math.PI / 8
              const px = Math.cos(angle) * coreR * 0.48
              const py = Math.sin(angle) * coreR * 0.48
              if (side === 0) ctx.moveTo(px, py)
              else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
            ctx.restore()

            const core = ctx.createRadialGradient(pScr.x, pScr.y, 2, pScr.x, pScr.y, coreR * 0.34)
            core.addColorStop(0, '#FFFFFF')
            core.addColorStop(0.42, cs.theme.coreColor)
            core.addColorStop(1, cs.theme.primaryColor)
            ctx.globalAlpha = 0.9 * openFrac
            ctx.fillStyle = core
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, coreR * 0.34, 0, Math.PI * 2)
            ctx.fill()
          } else if (cs.kind === 'w15_seraph') {
            const sunR = 52 + openFrac * (76 + tFrac * 34)
            const pulse = 0.88 + Math.sin(cs.elapsed * 11) * 0.12
            ctx.globalAlpha = 0.18 * openFrac * pulse
            ctx.fillStyle = cs.theme.primaryColor
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, sunR * 1.38, 0, Math.PI * 2)
            ctx.fill()

            ctx.save()
            ctx.translate(pScr.x, pScr.y)
            ctx.rotate(cs.elapsed * 0.18)
            for (let ray = 0; ray < 16; ray++) {
              const angle = (ray / 16) * Math.PI * 2
              const inner = sunR * (ray % 2 === 0 ? 0.86 : 0.98)
              const outer = sunR * (1.3 + (ray % 3) * 0.08)
              ctx.globalAlpha = 0.42 * openFrac
              ctx.strokeStyle = ray % 2 === 0 ? cs.theme.primaryColor : cs.theme.secondaryColor
              ctx.lineWidth = ray % 4 === 0 ? 3 : 1.8
              ctx.beginPath()
              ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
              ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
              ctx.stroke()
            }
            ctx.restore()

            ctx.globalAlpha = 0.85 * openFrac
            ctx.strokeStyle = cs.theme.primaryColor
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, sunR, cs.elapsed * 0.22, cs.elapsed * 0.22 + Math.PI * 1.72)
            ctx.stroke()
            ctx.strokeStyle = cs.theme.secondaryColor
            ctx.lineWidth = 2
            ctx.setLineDash([8, 7])
            ctx.lineDashOffset = -cs.elapsed * 68
            ctx.beginPath()
            ctx.arc(
              pScr.x,
              pScr.y,
              sunR * 0.72,
              -cs.elapsed * 0.18,
              -cs.elapsed * 0.18 + Math.PI * 1.55
            )
            ctx.stroke()
            ctx.setLineDash([])

            const coreGradient = ctx.createRadialGradient(
              pScr.x,
              pScr.y,
              3,
              pScr.x,
              pScr.y,
              sunR * 0.58
            )
            coreGradient.addColorStop(0, '#FFFFFF')
            coreGradient.addColorStop(0.36, cs.theme.coreColor)
            coreGradient.addColorStop(1, `${cs.theme.primaryColor}00`)
            ctx.globalAlpha = 0.82 * openFrac
            ctx.fillStyle = coreGradient
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, sunR * 0.58, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // Area-specific blazing inferno / solar pyre pedestal beneath Wave 15 Boss
            const blazeR = 64 + openFrac * (68 + tFrac * 34)
            const flicker = 0.92 + Math.sin(cs.elapsed * 22) * 0.08

            ctx.globalAlpha = 0.36 * openFrac * flicker
            ctx.fillStyle = cs.theme.primaryColor
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, blazeR * 1.35, 0, Math.PI * 2)
            ctx.fill()

            ctx.globalAlpha = 0.42 * openFrac * flicker
            ctx.fillStyle = cs.theme.secondaryColor
            ctx.beginPath()
            ctx.ellipse(pScr.x, pScr.y + 18, blazeR * 1.15, blazeR * 0.48, 0, 0, Math.PI * 2)
            ctx.fill()

            // Swirling flame petals around the awakening boss core
            const petalCount = 10
            for (let f = 0; f < petalCount; f++) {
              const fa = cs.elapsed * 3.4 + (f / petalCount) * Math.PI * 2
              const fx = pScr.x + Math.cos(fa) * (blazeR * 0.72)
              const fy = pScr.y + Math.sin(fa) * (blazeR * 0.34)
              const fh = 24 + openFrac * 26 + Math.sin(cs.elapsed * 16 + f) * 7
              ctx.globalAlpha = 0.55 * openFrac
              ctx.fillStyle = f % 2 === 0 ? cs.theme.primaryColor : cs.theme.secondaryColor
              ctx.beginPath()
              ctx.moveTo(fx, fy - fh)
              ctx.quadraticCurveTo(fx + fh * 0.42, fy - fh * 0.25, fx, fy + fh * 0.22)
              ctx.quadraticCurveTo(fx - fh * 0.42, fy - fh * 0.25, fx, fy - fh)
              ctx.fill()
            }

            ctx.globalAlpha = 0.85 * openFrac
            ctx.strokeStyle = cs.theme.coreColor
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.ellipse(pScr.x, pScr.y + 12, blazeR * 0.88, blazeR * 0.36, 0, 0, Math.PI * 2)
            ctx.stroke()
          }

          // Burst shockwave ring when second phase triggers & pre-drop surge
          if (cs.elapsed >= cs.line2Delay && cs.elapsed <= cs.line2Delay + 1.1) {
            const burstFrac = (cs.elapsed - cs.line2Delay) / 1.1
            ctx.globalAlpha = Math.max(0, 1 - burstFrac)
            ctx.strokeStyle = cs.theme.primaryColor
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, 40 + burstFrac * 260, 0, Math.PI * 2)
            ctx.stroke()
          }
          if (cs.elapsed >= cs.duration - 0.85) {
            const dropFrac = Math.min(1, (cs.elapsed - (cs.duration - 0.85)) / 0.85)
            ctx.globalAlpha = 0.25 + dropFrac * 0.65
            ctx.strokeStyle = cs.theme.coreColor
            ctx.lineWidth = 5
            ctx.beginPath()
            ctx.arc(pScr.x, pScr.y, 22 + dropFrac * 180, 0, Math.PI * 2)
            ctx.stroke()
          }
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

        // Autonomous Summons (Companion Robots, Temporal Echoes, Sentinel Turrets & Laser Striders)
        for (const summon of summonsRef.current) {
          summon.draw(ctx, camera, player)
        }

        // Orbiting Prism Satellite Blades (spinning emerald-gold prism chakrams around player)
        const activePrismLv = upgradeLevelsRef.current['upg_a2_05'] || 0
        if (activePrismLv > 0) {
          const pScr = camera.worldToScreen(player.getCenter().x, player.getCenter().y)
          const bladeCount = 1 + activePrismLv
          const orbitR = 92 + activePrismLv * 15
          const spinSpeed = 2.6 + activePrismLv * 0.38
          const baseSpin = timeSurvivedRef.current * spinSpeed
          const isLv5Prism = activePrismLv >= MAX_WEAPON_UPGRADE_LEVEL

          ctx.save()
          ctx.strokeStyle = isLv5Prism ? 'rgba(255, 215, 0, 0.32)' : 'rgba(52, 211, 153, 0.25)'
          ctx.lineWidth = 1.4
          ctx.setLineDash([8, 8])
          ctx.beginPath()
          ctx.arc(pScr.x, pScr.y, orbitR, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          for (let b = 0; b < bladeCount; b++) {
            const ba = baseSpin + (b / bladeCount) * Math.PI * 2
            const bx = pScr.x + Math.cos(ba) * orbitR
            const by = pScr.y + Math.sin(ba) * orbitR
            ctx.save()
            ctx.translate(bx, by)
            ctx.rotate(timeSurvivedRef.current * 14 + b)
            ctx.fillStyle = isLv5Prism ? 'rgba(255, 215, 0, 0.28)' : 'rgba(52, 211, 153, 0.28)'
            ctx.beginPath()
            ctx.arc(0, 0, 18, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = isLv5Prism ? '#FFD700' : '#34D399'
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 1.6
            ctx.beginPath()
            for (let k = 0; k < 8; k++) {
              const ka = (k / 8) * Math.PI * 2
              const kr = k % 2 === 0 ? 15 : 6.5
              const px = Math.cos(ka) * kr
              const py = Math.sin(ka) * kr
              if (k === 0) ctx.moveTo(px, py)
              else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.fill()
            ctx.stroke()

            ctx.fillStyle = '#FFFFFF'
            ctx.beginPath()
            ctx.arc(0, 0, 3.6, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
          ctx.restore()
        }

        // Shield Paladin Dash Spectral Afterimages (glowing golden shield bursts)
        for (const img of dashAfterimagesRef.current) {
          const sp = camera.worldToScreen(img.x + player.width / 2, img.y + player.height / 2)
          const alpha = Math.max(0, (1 - img.timer / img.duration) * 0.65)
          const r = player.width * (0.48 + (img.timer / img.duration) * 0.25)
          ctx.save()
          ctx.globalAlpha = alpha
          ctx.fillStyle = 'rgba(250, 204, 21, 0.35)'
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, r * 1.25, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#FEF08A'
          ctx.lineWidth = 2.6
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        // Chrono Operative 3s Holographic Clones (50% damage attack mimic)
        for (const clone of chronoClonesRef.current) {
          const cs = camera.worldToScreen(clone.x, clone.y)
          const remainFrac = Math.max(0, 1 - clone.timer / clone.duration)
          const pulseR = 16 + Math.sin(clone.timer * 14) * 1.5
          ctx.save()
          // 3.0s countdown arc indicator
          ctx.strokeStyle = '#00F0FF'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(cs.x, cs.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remainFrac)
          ctx.stroke()

          // Holographic violet silhouette
          ctx.globalAlpha = 0.72
          ctx.fillStyle = '#7E22CE'
          ctx.strokeStyle = '#C084FC'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(cs.x, cs.y, pulseR, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = '#E9D5FF'
          ctx.beginPath()
          ctx.arc(cs.x, cs.y, 7, 0, Math.PI * 2)
          ctx.fill()

          ctx.globalAlpha = 0.95
          ctx.font = 'bold 9px monospace'
          ctx.textAlign = 'center'
          ctx.fillStyle = '#E9D5FF'
          ctx.fillText(`${Math.max(0, clone.duration - clone.timer).toFixed(1)}s`, cs.x, cs.y - 28)
          ctx.restore()
        }

        // Player
        player.draw(ctx, camera)

        // Floating Damage Numbers (Crit numbers are bright red, linger longer, end in "!", and sway cleanly around center)
        for (const ft of floatingTextsRef.current) {
          const sp = camera.worldToScreen(ft.x, ft.y)
          if (ft.isCrit) {
            const maxDur = ft.maxTimer ?? CRIT_CONFIG.CRIT_TEXT_DURATION
            const age = Math.max(0, maxDur - ft.timer)
            const swayAngle = computeCritTextSwayAngle(age, ft.swayPhase ?? 0)
            const popScale = age < 0.14 ? 1 + (1 - age / 0.14) * 0.22 : 1
            const alpha = ft.timer < 0.28 ? Math.max(0, ft.timer / 0.28) : 1
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.translate(sp.x, sp.y)
            ctx.rotate(swayAngle)
            ctx.scale(popScale, popScale)
            ctx.font = 'bold 16px monospace'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.lineWidth = 3.2
            ctx.strokeStyle = 'rgba(24, 2, 10, 0.92)'
            ctx.strokeText(ft.text, 0, 0)
            ctx.fillStyle = ft.color
            ctx.fillText(ft.text, 0, 0)
            ctx.restore()
          } else {
            ctx.save()
            ctx.font = 'bold 12px monospace'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'alphabetic'
            ctx.fillStyle = ft.color
            ctx.fillText(ft.text, sp.x, sp.y)
            ctx.restore()
          }
        }

        // Devourer of Gods destructive cutscene particles (debris shards, implosion sparks, lightning, shockwaves)
        for (const pt of dogCutsceneParticlesRef.current) {
          const frac = Math.min(1, pt.timer / pt.duration)
          const alpha = Math.max(0, 1 - frac)
          ctx.save()
          if (pt.kind === 'shard') {
            const sp = camera.worldToScreen(pt.x, pt.y)
            ctx.translate(sp.x, sp.y)
            ctx.rotate(pt.angle)
            ctx.globalAlpha = alpha * 0.95
            ctx.fillStyle = pt.color
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 1.1
            ctx.beginPath()
            ctx.moveTo(pt.size * 1.1, 0)
            ctx.lineTo(-pt.size * 0.55, pt.size * 0.55)
            ctx.lineTo(-pt.size * 0.9, 0)
            ctx.lineTo(-pt.size * 0.45, -pt.size * 0.6)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
          } else if (pt.kind === 'spark') {
            const sp = camera.worldToScreen(pt.x, pt.y)
            const tailScale = 0.032
            ctx.globalAlpha = alpha
            ctx.strokeStyle = pt.color
            ctx.lineWidth = pt.size
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(sp.x, sp.y)
            ctx.lineTo(sp.x - pt.vx * tailScale, sp.y - pt.vy * tailScale)
            ctx.stroke()
          } else if (pt.kind === 'shockwave') {
            const sp = camera.worldToScreen(pt.x, pt.y)
            const r = 18 + pt.maxRadius * (1 - Math.pow(1 - frac, 2.2))
            ctx.globalAlpha = alpha * 0.88
            ctx.strokeStyle = pt.color
            ctx.lineWidth = pt.lineWidth * (1 - frac * 0.45)
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
            ctx.stroke()
          } else if (pt.kind === 'lightning') {
            ctx.globalAlpha = alpha
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.strokeStyle = pt.color
            ctx.lineWidth = 4.2
            ctx.beginPath()
            pt.points.forEach((p, idx) => {
              const sp = camera.worldToScreen(p.x, p.y)
              if (idx === 0) ctx.moveTo(sp.x, sp.y)
              else ctx.lineTo(sp.x, sp.y)
            })
            ctx.stroke()
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 1.6
            ctx.stroke()
          } else if (pt.kind === 'flame') {
            const sp = camera.worldToScreen(pt.x, pt.y)
            const r = Math.max(2, pt.radius * (1 - frac * 0.68))
            const tilt = Math.atan2(pt.vy, pt.vx) + Math.PI / 2
            ctx.translate(sp.x, sp.y)
            ctx.rotate(tilt * 0.25)

            // Soft fire aura glow
            ctx.globalAlpha = alpha * 0.34
            ctx.fillStyle = pt.color
            ctx.beginPath()
            ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2)
            ctx.fill()

            // Outer flame tongue teardrop
            ctx.globalAlpha = alpha * 0.88
            ctx.fillStyle = pt.color
            ctx.beginPath()
            ctx.moveTo(0, -r * 1.75)
            ctx.quadraticCurveTo(r * 0.95, -r * 0.25, 0, r * 0.72)
            ctx.quadraticCurveTo(-r * 0.95, -r * 0.25, 0, -r * 1.75)
            ctx.closePath()
            ctx.fill()

            // White-hot inner flame core
            ctx.globalAlpha = alpha * 0.92
            ctx.fillStyle = pt.coreColor
            ctx.beginPath()
            ctx.moveTo(0, -r * 0.85)
            ctx.quadraticCurveTo(r * 0.45, -r * 0.05, 0, r * 0.38)
            ctx.quadraticCurveTo(-r * 0.45, -r * 0.05, 0, -r * 0.85)
            ctx.closePath()
            ctx.fill()
          } else if (pt.kind === 'ember') {
            const sp = camera.worldToScreen(pt.x, pt.y)
            ctx.globalAlpha = alpha * 0.42
            ctx.fillStyle = pt.color
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, pt.size * 2.1, 0, Math.PI * 2)
            ctx.fill()

            ctx.globalAlpha = alpha * 0.95
            ctx.fillStyle = '#FFFFFF'
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, Math.max(1, pt.size * 0.65), 0, Math.PI * 2)
            ctx.fill()
          } else if (pt.kind === 'orbit_star') {
            const sp = camera.worldToScreen(pt.x, pt.y)
            const twinkle = 0.72 + Math.sin(pt.timer * 22 + pt.angle) * 0.28
            const radius = pt.size * (0.7 + (1 - frac) * 0.45)
            ctx.translate(sp.x, sp.y)
            ctx.rotate(pt.angle * 1.4)
            ctx.globalAlpha = alpha * twinkle
            ctx.shadowColor = pt.color
            ctx.shadowBlur = 12
            ctx.fillStyle = pt.color
            ctx.beginPath()
            ctx.moveTo(0, -radius * 1.8)
            ctx.lineTo(radius * 0.32, -radius * 0.32)
            ctx.lineTo(radius * 1.8, 0)
            ctx.lineTo(radius * 0.32, radius * 0.32)
            ctx.lineTo(0, radius * 1.8)
            ctx.lineTo(-radius * 0.32, radius * 0.32)
            ctx.lineTo(-radius * 1.8, 0)
            ctx.lineTo(-radius * 0.32, -radius * 0.32)
            ctx.closePath()
            ctx.fill()
            ctx.shadowBlur = 0
            ctx.fillStyle = '#FFFFFF'
            ctx.globalAlpha = alpha * twinkle * 0.86
            ctx.beginPath()
            ctx.arc(0, 0, Math.max(1.2, radius * 0.25), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }

        if (hasWorldTransform) {
          ctx.restore()
        }

        // Screen-space atmospheric vignette & impact flash during boss cutscene / final drop
        if (dogCutsceneRef.current?.active) {
          const cs = dogCutsceneRef.current
          const tFrac = Math.min(1, cs.elapsed / cs.duration)
          const openFrac =
            tFrac < 0.25 ? tFrac / 0.25 : tFrac > 0.9 ? Math.max(0.25, (1 - tFrac) / 0.1) : 1
          const shakePulse = Math.min(1, activeShake.intensity / 14)
          ctx.save()
          const edgeGlow = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            Math.min(canvas.width, canvas.height) * 0.28,
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height) * 0.74
          )
          edgeGlow.addColorStop(0, 'rgba(0, 0, 0, 0)')
          edgeGlow.addColorStop(
            0.75,
            cs.theme.vignetteInnerRgba.replace(/1\)$/, `${((0.24 + shakePulse * 0.18) * openFrac).toFixed(3)})`)
          )
          edgeGlow.addColorStop(
            1,
            cs.theme.vignetteOuterRgba.replace(/1\)$/, `${((0.2 + shakePulse * 0.22) * openFrac).toFixed(3)})`)
          )
          ctx.fillStyle = edgeGlow
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.restore()
        }
        if (activeShake.flashAlpha > 0.01) {
          const flashTheme =
            dogCutsceneRef.current?.theme ?? dogPostDropRef.current?.theme ?? DEVOURER_CUTSCENE_THEME
          ctx.save()
          ctx.globalAlpha = activeShake.flashAlpha
          ctx.fillStyle = dogPostDropRef.current ? flashTheme.flashDropColor : flashTheme.flashBuildColor
          ctx.fillRect(0, 0, canvas.width, canvas.height)
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
        const selected = [
          ...seedUpgrades,
          ...AREA_TWO_UPGRADES,
          ...UNIVERSAL_CRIT_UPGRADES,
          ...shopWeaponsAsUpgrades(starOverrides)
        ].find((u) => u.id === upgradeId)
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

          if (selected.id === 'upg_crit_02' && playerRef.current) {
            for (const activeUpg of activeUpgradesRef.current) {
              if (
                activeUpg.id === 'upg_01' ||
                activeUpg.id === 'upg_14' ||
                activeUpg.id === 'upg_20' ||
                activeUpg.id === 'upg_a2_02' ||
                activeUpg.id === 'wpn_grim_reaper'
              ) {
                syncSummonsForUpgrade(
                  activeUpg,
                  playerRef.current,
                  upgradeLevelsRef.current[activeUpg.id] || 1
                )
              }
            }
          }

          syncPlayerMountedWeapons(playerRef.current)
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
    [pickLevelUpOptions, setEngineState, syncPlayerMountedWeapons, syncSummonsForUpgrade, toast]
  )

  const handlePauseToggle = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      pauseMusicRef.current()
      setEngineState('paused')
    } else if (gameStateRef.current === 'paused') {
      resumeMusicRef.current()
      setEngineState('playing')
    }
  }, [setEngineState])

  const handleContinueEndless = useCallback(() => {
    const player = playerRef.current
    const endlessStartWave = getAreaMaxWave(areaRef.current.id) + 1
    endlessModeRef.current = true
    dogBossActiveRef.current = false
    setIsEndlessMode(true)
    bossArenaRef.current = null
    enemiesRef.current = []
    waveRef.current = endlessStartWave
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
    playMusicRef.current('gameplay')
    playSoundRef.current('wave')
    toast.success(
      `ENDLESS MODE ENGAGED! Wave ${endlessStartWave}+ unlocked — bosses arrive every 5 waves!`
    )
  }, [setEngineState, spawnEnemyForWave, toast])

  const setTouchVector = (x: number, y: number) => {
    touchDirRef.current = { x, y }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-116px)] min-h-[540px] bg-slate-carbon border border-gray-700 rounded-xl overflow-hidden select-none"
    >
      <GameCanvas ref={canvasRef} />
      <YouTubeBossMusicPlayer />

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
          maxWave={getAreaMaxWave(activeArea.id)}
          time={timeSurvived}
          enemiesDefeated={enemiesDefeated}
          waveTimeRemaining={waveTimeRemaining}
          isBreather={isBreather}
          isEndless={isEndlessMode}
          heroName={heroName}
          heroAbilityTag={heroAbilityTag}
          hasSpaceDash={hasSpaceDash}
          dashCooldown={dashCooldown}
          areaName={activeArea.name}
          difficultyName={activeDifficulty.name}
          difficultyCoinLabel={formatDifficultyCoinLabel(activeDifficulty)}
          activeUpgrades={activeUpgradeNames}
          shieldActive={shieldActive}
          activeBoss={activeBossHud}
          onPause={handlePauseToggle}
        />
      )}

      {/* Boss Entrance Cutscene Presentation: Dialogue Banner (DoG) OR Flashing Top & Bottom Warning Strips (Wave 15 Area 1/2) */}
      {gameState === 'playing' && dogCutsceneUi?.active && dogCutsceneUi.theme.presentation === 'dialogue' && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-12 sm:bottom-16 z-30 flex justify-center px-4 transition-opacity duration-300"
          style={{ opacity: dogCutsceneUi.opacity }}
          role="status"
          aria-live="assertive"
        >
          <div
            className={`max-w-2xl w-full bg-slate-950/90 border rounded-xl px-6 py-4 text-center ${dogCutsceneUi.theme.borderClass}`}
          >
            <div
              className={`text-[11px] font-mono uppercase tracking-[0.28em] mb-1.5 ${dogCutsceneUi.theme.speakerClass}`}
            >
              {dogCutsceneUi.theme.speaker}
            </div>
            <p
              className={`text-lg sm:text-2xl font-black tracking-[0.14em] ${dogCutsceneUi.theme.line1Class}`}
            >
              {dogCutsceneUi.theme.line1}
            </p>
            {dogCutsceneUi.showSecondLine && (
              <p
                className={`mt-1.5 text-sm sm:text-lg font-extrabold tracking-[0.1em] ${dogCutsceneUi.theme.line2Class}`}
              >
                {dogCutsceneUi.theme.line2}
              </p>
            )}
          </div>
        </div>
      )}

      {gameState === 'playing' && dogCutsceneUi?.active && dogCutsceneUi.theme.presentation === 'warning' && (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between transition-opacity duration-200"
          style={{ opacity: dogCutsceneUi.opacity }}
          role="status"
          aria-live="assertive"
        >
          {(['top', 'bottom'] as const).map((edge) => (
            <div
              key={edge}
              className={`relative w-full overflow-hidden bg-slate-950/92 animate-boss-warning-flash ${
                edge === 'top' ? 'border-b-2' : 'border-t-2'
              } ${dogCutsceneUi.theme.borderClass}`}
            >
              <div
                className="h-2 w-full opacity-90"
                style={{
                  backgroundImage: `repeating-linear-gradient(-45deg, ${dogCutsceneUi.theme.stripeHex}, ${dogCutsceneUi.theme.stripeHex} 14px, rgba(15, 23, 42, 0.96) 14px, rgba(15, 23, 42, 0.96) 28px)`
                }}
              />
              <div className="relative py-2.5 sm:py-3 px-4 flex flex-col items-center justify-center text-center">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-25 animate-boss-warning-sweep"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${dogCutsceneUi.theme.primaryColor}, transparent)`
                  }}
                />
                <div className="relative z-10 flex items-center justify-center gap-2.5 sm:gap-4">
                  <span
                    className={`text-base sm:text-xl font-black ${dogCutsceneUi.theme.line1Class}`}
                    aria-hidden="true"
                  >
                    ⚠
                  </span>
                  <span
                    className={`text-sm sm:text-xl font-black uppercase tracking-[0.2em] ${dogCutsceneUi.theme.line1Class}`}
                  >
                    {dogCutsceneUi.theme.warningTitle}
                  </span>
                  <span
                    className={`text-base sm:text-xl font-black ${dogCutsceneUi.theme.line1Class}`}
                    aria-hidden="true"
                  >
                    ⚠
                  </span>
                </div>
                <div
                  className={`relative z-10 mt-0.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.26em] ${dogCutsceneUi.theme.line2Class}`}
                >
                  {dogCutsceneUi.showSecondLine
                    ? dogCutsceneUi.theme.warningCriticalText
                    : dogCutsceneUi.theme.warningSubtitle}
                </div>
              </div>
              <div
                className="h-2 w-full opacity-90"
                style={{
                  backgroundImage: `repeating-linear-gradient(-45deg, ${dogCutsceneUi.theme.stripeHex}, ${dogCutsceneUi.theme.stripeHex} 14px, rgba(15, 23, 42, 0.96) 14px, rgba(15, 23, 42, 0.96) 28px)`
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Mobile / Touch Shield Paladin Dash Trigger */}
      {gameState === 'playing' && hasSpaceDash && (
        <button
          type="button"
          onClick={triggerPaladinDash}
          disabled={dashCooldown > 0}
          className={`md:hidden absolute bottom-16 left-4 z-20 w-16 h-16 rounded-full border-2 font-mono font-extrabold text-xs flex flex-col items-center justify-center transition-all ${
            dashCooldown <= 0
              ? 'bg-yellow-500/85 border-yellow-200 text-slate-950 shadow-lg shadow-yellow-500/30'
              : 'bg-slate-900/80 border-slate-600 text-slate-300'
          }`}
          aria-label="Trigger Aegis Dash"
        >
          <span>DASH</span>
          <span className="text-[10px]">
            {dashCooldown <= 0 ? 'READY' : `${dashCooldown.toFixed(1)}s`}
          </span>
        </button>
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
          onResume={() => {
            resumeMusicRef.current()
            setEngineState('playing')
          }}
          onRestart={() => {
            flushBankedCoins()
            initRun()
          }}
          onQuit={() => {
            flushBankedCoins()
            dogBossActiveRef.current = false
            stopMusicRef.current()
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
              {activeArea.name} • Wave {getAreaMaxWave(activeArea.id)} Cleared
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-yellow-300 mb-3">
              {activeArea.id === 'astral_citadel'
                ? 'ASTRAL SCOURGE VANQUISHED!'
                : 'SECTOR BOSS DEFEATED!'}
            </h2>
            <p className="text-slate-200 text-sm sm:text-base mb-6">
              You conquered the {activeArea.name} Final Boss! Extract now to lock in your Victory, or
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
                GO ON FOREVER (ENDLESS WAVE {getAreaMaxWave(activeArea.id) + 1}+)
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
          maxWave={getAreaMaxWave(activeArea.id)}
          difficultyName={activeDifficulty.name}
          difficultyCoinLabel={formatDifficultyCoinLabel(activeDifficulty)}
          difficultyColor={activeDifficulty.accentColor}
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
