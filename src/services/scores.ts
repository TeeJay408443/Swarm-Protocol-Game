/**
 * Scores, Player Telemetry & Achievements Service
 * Connects Gameplay Telemetry, HQView, LeaderboardsView, and ProfileView
 * to Supabase PostgreSQL with persistent localStorage fallback for Guest/Offline play.
 */

import { supabase } from './supabase'
import { achievements as seedAchievements } from '../db/seedData'
import { ACHIEVEMENT_THRESHOLDS, SCORING_CONFIG } from '../config/gameConstants'
import { creditShopCoins, getShopAccountState } from './shop'
import type { ScoresRow, PlayerStatsRow, AchievementsRow } from '../types/database'

const SCORES_STORAGE_KEY = 'swarm_protocol_scores_v1'
const STATS_STORAGE_KEY = 'swarm_protocol_player_stats_v1'
const PROFILE_STORAGE_KEY = 'swarm_protocol_operative_profile_v1'

export interface OperativeProfile {
  username: string
  targetingMode: 'closest' | 'weakest' | 'strongest' | 'most_dangerous' | 'random'
  difficulty: 'easy' | 'normal' | 'hard' | 'expert'
  updatedAt: string
}

export interface LocalRunRecord {
  id: string
  user_id: string | null
  player_name: string
  final_score: number
  survival_seconds: number
  coins_collected: number
  enemies_defeated: number
  damage_free_wave_streak: number
  hero_used: string
  wave_reached: number
  created_at: string
  isCurrentUser?: boolean
}

export interface HeroAggregateStat {
  heroId: string
  gamesPlayed: number
  highestWave: number
  highestScore: number
  totalScore: number
}

export interface LocalPlayerTelemetry extends PlayerStatsRow {
  total_games: number
  highest_wave: number
  highest_score: number
  total_score: number
  max_single_run_coins: number
  total_xp: number
  level: number
  favorite_hero: string
  hero_stats: Record<string, HeroAggregateStat>
  recent_runs: LocalRunRecord[]
}

export interface AchievementProgress {
  achievement: AchievementsRow
  unlocked: boolean
  current: number
  target: number
  percent: number
}

export interface SubmitScoreInput {
  userId?: string | null
  playerName?: string
  survivalSeconds: number
  coinsCollected: number
  enemiesDefeated: number
  damageFreeWaveStreak: number
  waveReached?: number
  heroUsed: string
  coinsAlreadyBanked?: boolean
}

const DEFAULT_PROFILE: OperativeProfile = {
  username: 'Guest Operative',
  targetingMode: 'closest',
  difficulty: 'normal',
  updatedAt: new Date().toISOString()
}

/**
 * Canonical scoring formula: S = 10t + 25c
 */
export function calculateScoreFormula(survivalSeconds: number, coinsCollected: number): number {
  const safeSeconds = Math.max(0, Math.floor(survivalSeconds))
  const safeCoins = Math.max(0, Math.floor(coinsCollected))
  return safeSeconds * SCORING_CONFIG.SECONDS_MULTIPLIER + safeCoins * SCORING_CONFIG.COINS_MULTIPLIER
}

/**
 * Compute wave reached from survival seconds (33s per full cycle)
 */
export function estimateWaveFromSeconds(survivalSeconds: number): number {
  return Math.max(1, Math.floor(Math.max(0, survivalSeconds) / 33) + 1)
}

const memoryScoreStorage = new Map<string, string>()

function safeReadStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
    const mem = memoryScoreStorage.get(key)
    return mem ? (JSON.parse(mem) as T) : fallback
  } catch {
    const mem = memoryScoreStorage.get(key)
    if (mem) {
      try {
        return JSON.parse(mem) as T
      } catch {
        return fallback
      }
    }
    return fallback
  }
}

function safeWriteStorage<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value)
  memoryScoreStorage.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore storage quota errors in constrained environments
  }
}

function getStatsStorageKey(userId = 'guest_user'): string {
  return !userId || userId === 'guest_user'
    ? STATS_STORAGE_KEY
    : `${STATS_STORAGE_KEY}_${userId}`
}

function getProfileStorageKey(userId = 'guest_user'): string {
  return !userId || userId === 'guest_user'
    ? PROFILE_STORAGE_KEY
    : `${PROFILE_STORAGE_KEY}_${userId}`
}

export function getOperativeProfile(userId = 'guest_user'): OperativeProfile {
  return {
    ...DEFAULT_PROFILE,
    ...safeReadStorage<Partial<OperativeProfile>>(getProfileStorageKey(userId), {})
  }
}

export function saveOperativeProfile(
  updates: Partial<OperativeProfile>,
  userId = 'guest_user'
): OperativeProfile {
  const next: OperativeProfile = {
    ...getOperativeProfile(userId),
    ...updates,
    updatedAt: new Date().toISOString()
  }
  safeWriteStorage(getProfileStorageKey(userId), next)
  return next
}

function getLocalScores(): LocalRunRecord[] {
  const stored = safeReadStorage<LocalRunRecord[] | null>(SCORES_STORAGE_KEY, null)
  if (!stored || stored.length === 0) {
    return []
  }
  const filtered = stored.filter((entry) => !entry.id.startsWith('seed_score_'))
  if (filtered.length !== stored.length) {
    safeWriteStorage(SCORES_STORAGE_KEY, filtered)
  }
  return filtered
}

function getDefaultTelemetry(userId = 'guest_user'): LocalPlayerTelemetry {
  return {
    user_id: userId,
    total_enemies_defeated: 0,
    total_coins_collected: 0,
    longest_damage_free_wave_streak: 0,
    updated_at: new Date().toISOString(),
    total_games: 0,
    highest_wave: 0,
    highest_score: 0,
    total_score: 0,
    max_single_run_coins: 0,
    total_xp: 0,
    level: 1,
    favorite_hero: 'hero_01',
    hero_stats: {},
    recent_runs: []
  }
}

export function getLocalPlayerTelemetry(userId = 'guest_user'): LocalPlayerTelemetry {
  const stored = safeReadStorage<LocalPlayerTelemetry | null>(getStatsStorageKey(userId), null)
  if (!stored) {
    return getDefaultTelemetry(userId)
  }
  return {
    ...getDefaultTelemetry(userId),
    ...stored,
    user_id: userId
  }
}

/**
 * Evaluate all 4 achievements against current player telemetry
 */
export function evaluateAchievements(
  telemetry: Pick<
    LocalPlayerTelemetry,
    'total_enemies_defeated' | 'max_single_run_coins' | 'longest_damage_free_wave_streak'
  >
): AchievementProgress[] {
  return seedAchievements.map((achievement) => {
    let current = 0
    let target = 1

    switch (achievement.id) {
      case 'ach_01':
        current = telemetry.total_enemies_defeated
        target = ACHIEVEMENT_THRESHOLDS.FIRST_CONTACT_ENEMIES
        break
      case 'ach_02':
        current = telemetry.max_single_run_coins
        target = ACHIEVEMENT_THRESHOLDS.GOLD_HOARDER_COINS
        break
      case 'ach_03':
        current = telemetry.total_enemies_defeated
        target = ACHIEVEMENT_THRESHOLDS.SWARMSLAYER_ENEMIES
        break
      case 'ach_04':
        current = telemetry.longest_damage_free_wave_streak
        target = ACHIEVEMENT_THRESHOLDS.UNTOUCHABLE_STREAK
        break
      default:
        current = 0
        target = 1
    }

    const percent = Math.min(100, Math.round((current / target) * 100))
    return {
      achievement,
      unlocked: current >= target,
      current,
      target,
      percent
    }
  })
}

/**
 * Submit a completed run score & update lifetime player telemetry
 */
export async function submitScore(input: SubmitScoreInput): Promise<{
  scoreRecord: LocalRunRecord
  telemetry: LocalPlayerTelemetry
  newlyUnlocked: AchievementProgress[]
}> {
  const effectiveUserId = input.userId || 'guest_user'
  const profile = getOperativeProfile(effectiveUserId)
  const survivalSeconds = Math.max(0, Math.floor(input.survivalSeconds))
  const coinsCollected = Math.max(0, Math.floor(input.coinsCollected))
  const enemiesDefeated = Math.max(0, Math.floor(input.enemiesDefeated))
  const streak = Math.max(0, Math.floor(input.damageFreeWaveStreak))
  const waveReached = Math.max(1, input.waveReached || estimateWaveFromSeconds(survivalSeconds))
  const finalScore = calculateScoreFormula(survivalSeconds, coinsCollected)
  const playerName = (input.playerName || profile.username || 'Guest Operative').trim()

  const prevTelemetry = getLocalPlayerTelemetry(effectiveUserId)
  const prevUnlockedIds = new Set(
    evaluateAchievements(prevTelemetry)
      .filter((a) => a.unlocked)
      .map((a) => a.achievement.id)
  )

  let insertedRow: ScoresRow | null = null

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scores')
        .insert({
          user_id: input.userId || null,
          player_name: playerName,
          final_score: finalScore,
          survival_seconds: survivalSeconds,
          coins_collected: coinsCollected,
          enemies_defeated: enemiesDefeated,
          damage_free_wave_streak: streak,
          hero_used: input.heroUsed
        })
        .select()
        .single()

      if (!error && data) {
        insertedRow = data as ScoresRow
      }
    } catch (err) {
      console.warn('Supabase score insert unavailable, persisting locally', err)
    }
  }

  const scoreRecord: LocalRunRecord = insertedRow
    ? {
        ...insertedRow,
        wave_reached: waveReached,
        isCurrentUser: true
      }
    : {
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id: input.userId || null,
        player_name: playerName,
        final_score: finalScore,
        survival_seconds: survivalSeconds,
        coins_collected: coinsCollected,
        enemies_defeated: enemiesDefeated,
        damage_free_wave_streak: streak,
        hero_used: input.heroUsed,
        wave_reached: waveReached,
        created_at: new Date().toISOString(),
        isCurrentUser: true
      }

  // Persist to local score table so leaderboards immediately reflect local & guest runs
  const currentScores = getLocalScores()
  const nextScores = [scoreRecord, ...currentScores]
  safeWriteStorage(SCORES_STORAGE_KEY, nextScores)

  // Update telemetry
  const prevHeroStat = prevTelemetry.hero_stats[input.heroUsed] || {
    heroId: input.heroUsed,
    gamesPlayed: 0,
    highestWave: 0,
    highestScore: 0,
    totalScore: 0
  }

  const nextHeroStats: Record<string, HeroAggregateStat> = {
    ...prevTelemetry.hero_stats,
    [input.heroUsed]: {
      heroId: input.heroUsed,
      gamesPlayed: prevHeroStat.gamesPlayed + 1,
      highestWave: Math.max(prevHeroStat.highestWave, waveReached),
      highestScore: Math.max(prevHeroStat.highestScore, finalScore),
      totalScore: prevHeroStat.totalScore + finalScore
    }
  }

  // Favorite hero is the one with the most games played
  let favoriteHero = input.heroUsed
  let maxGames = -1
  for (const stat of Object.values(nextHeroStats)) {
    if (stat.gamesPlayed > maxGames) {
      maxGames = stat.gamesPlayed
      favoriteHero = stat.heroId
    }
  }

  const earnedXP = Math.max(25, enemiesDefeated * 10 + waveReached * 50)
  const nextTotalXP = prevTelemetry.total_xp + earnedXP

  const nextTelemetry: LocalPlayerTelemetry = {
    user_id: input.userId || prevTelemetry.user_id || 'guest_user',
    total_enemies_defeated: prevTelemetry.total_enemies_defeated + enemiesDefeated,
    total_coins_collected: prevTelemetry.total_coins_collected + coinsCollected,
    longest_damage_free_wave_streak: Math.max(prevTelemetry.longest_damage_free_wave_streak, streak),
    updated_at: new Date().toISOString(),
    total_games: prevTelemetry.total_games + 1,
    highest_wave: Math.max(prevTelemetry.highest_wave, waveReached),
    highest_score: Math.max(prevTelemetry.highest_score, finalScore),
    total_score: prevTelemetry.total_score + finalScore,
    max_single_run_coins: Math.max(prevTelemetry.max_single_run_coins, coinsCollected),
    total_xp: nextTotalXP,
    level: Math.max(1, Math.floor(nextTotalXP / 500) + 1),
    favorite_hero: favoriteHero,
    hero_stats: nextHeroStats,
    recent_runs: [scoreRecord, ...prevTelemetry.recent_runs].slice(0, 20)
  }

  // Initialize Shop wallet from pre-run telemetry before writing updated telemetry to avoid double-seeding
  getShopAccountState(effectiveUserId)

  safeWriteStorage(getStatsStorageKey(effectiveUserId), nextTelemetry)

  if (!input.coinsAlreadyBanked && coinsCollected > 0) {
    creditShopCoins(effectiveUserId, coinsCollected)
  }

  // Also sync authenticated user telemetry to Supabase player_stats if configured
  if (supabase && input.userId) {
    try {
      const { data: existingStats } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', input.userId)
        .maybeSingle()

      const mergedEnemies = (existingStats?.total_enemies_defeated || 0) + enemiesDefeated
      const mergedCoins = (existingStats?.total_coins_collected || 0) + coinsCollected
      const mergedStreak = Math.max(existingStats?.longest_damage_free_wave_streak || 0, streak)

      await supabase.from('player_stats').upsert({
        user_id: input.userId,
        total_enemies_defeated: mergedEnemies,
        total_coins_collected: mergedCoins,
        longest_damage_free_wave_streak: mergedStreak,
        updated_at: new Date().toISOString()
      })
    } catch (err) {
      console.warn('Supabase player_stats sync failed, kept local telemetry', err)
    }
  }

  const nextAchievementState = evaluateAchievements(nextTelemetry)
  const newlyUnlocked = nextAchievementState.filter(
    (item) => item.unlocked && !prevUnlockedIds.has(item.achievement.id)
  )

  return {
    scoreRecord,
    telemetry: nextTelemetry,
    newlyUnlocked
  }
}

export interface GetScoresOptions {
  timeRange?: 'allTime' | 'daily' | 'weekly' | 'monthly'
  heroId?: string
  search?: string
  sortBy?: 'final_score' | 'survival_seconds' | 'coins_collected' | 'wave_reached'
  currentUserId?: string | null
  limit?: number
}

/**
 * Fetch leaderboard scores from Supabase with local/baseline merge
 */
export async function getScores(options: GetScoresOptions = {}): Promise<LocalRunRecord[]> {
  const {
    timeRange = 'allTime',
    heroId = 'all',
    search = '',
    sortBy = 'final_score',
    currentUserId = null,
    limit = 100
  } = options

  let records: LocalRunRecord[] = getLocalScores()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .order('final_score', { ascending: false })
        .limit(limit)

      if (!error && data && data.length > 0) {
        const remoteIds = new Set(data.map((r: ScoresRow) => r.id))
        const remoteRecords: LocalRunRecord[] = (data as ScoresRow[]).map((row) => ({
          ...row,
          wave_reached: estimateWaveFromSeconds(row.survival_seconds),
          isCurrentUser: Boolean(currentUserId && row.user_id === currentUserId)
        }))
        const localOnly = records.filter((r) => !remoteIds.has(r.id))
        records = [...remoteRecords, ...localOnly]
      }
    } catch (err) {
      console.warn('Supabase scores fetch unavailable, using local leaderboard', err)
    }
  }

  const now = Date.now()
  if (timeRange === 'daily') {
    records = records.filter((r) => now - new Date(r.created_at).getTime() <= 86400000)
  } else if (timeRange === 'weekly') {
    records = records.filter((r) => now - new Date(r.created_at).getTime() <= 86400000 * 7)
  } else if (timeRange === 'monthly') {
    records = records.filter((r) => now - new Date(r.created_at).getTime() <= 86400000 * 30)
  }

  if (heroId && heroId !== 'all') {
    records = records.filter((r) => r.hero_used === heroId)
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    records = records.filter((r) => r.player_name.toLowerCase().includes(q))
  }

  records.sort((a, b) => {
    const aVal = a[sortBy] ?? a.final_score
    const bVal = b[sortBy] ?? b.final_score
    return bVal - aVal
  })

  return records.slice(0, limit)
}

export async function getTopScores(limit = 3, currentUserId?: string | null): Promise<LocalRunRecord[]> {
  return getScores({ limit, currentUserId })
}

export async function getPlayerTelemetry(userId?: string | null): Promise<LocalPlayerTelemetry> {
  const local = getLocalPlayerTelemetry(userId || 'guest_user')

  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!error && data) {
        return {
          ...local,
          total_enemies_defeated: Math.max(local.total_enemies_defeated, data.total_enemies_defeated),
          total_coins_collected: Math.max(local.total_coins_collected, data.total_coins_collected),
          longest_damage_free_wave_streak: Math.max(
            local.longest_damage_free_wave_streak,
            data.longest_damage_free_wave_streak
          ),
          updated_at: data.updated_at || local.updated_at
        }
      }
    } catch {
      // Fallback to local telemetry
    }
  }

  return local
}
