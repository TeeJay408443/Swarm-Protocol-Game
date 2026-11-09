/**
 * Score Manager for Swarm Protocol: Survivor
 * Phase 3: Game Design - Manages scoring system with formula: S = 10t + 25c
 */

import type { ScoreBreakdown } from '../types/game'
import { SCORING_CONFIG } from '../config/gameConstants'

// ============================================
// SCORE MANAGER CLASS
// ============================================

export class ScoreManager {
  private survivalSeconds: number = 0
  private coinsCollected: number = 0
  private enemiesDefeated: number = 0
  private damageFreeWaveStreak: number = 0
  private longestDamageFreeStreak: number = 0
  
  // Timing
  private startTime: number = 0
  private lastUpdateTime: number = 0
  private isRunning: boolean = false
  
  // Callbacks
  private onScoreChangedCallback: ((score: number, breakdown: ScoreBreakdown) => void) | null = null
  private onCoinCollectedCallback: ((amount: number, total: number) => void) | null = null
  
  constructor() {
    this.reset()
  }
  
  // ============================================
  // PUBLIC METHODS
  // ============================================
  
  start(): void {
    this.startTime = Date.now()
    this.lastUpdateTime = this.startTime
    this.isRunning = true
  }
  
  stop(): void {
    this.update()
    this.isRunning = false
  }
  
  reset(): void {
    this.survivalSeconds = 0
    this.coinsCollected = 0
    this.enemiesDefeated = 0
    this.damageFreeWaveStreak = 0
    this.longestDamageFreeStreak = 0
    this.startTime = 0
    this.lastUpdateTime = 0
    this.isRunning = false
  }
  
  update(): void {
    if (!this.isRunning) return
    
    const now = Date.now()
    const deltaTime = now - this.lastUpdateTime
    
    this.survivalSeconds += deltaTime / 1000
    this.lastUpdateTime = now
  }
  
  // ============================================
  // SCORE CALCULATION
  // ============================================
  
  /**
   * Calculate final score using the formula: S = 10t + 25c
   * @returns Final score
   */
  calculateFinalScore(): number {
    const survivalScore = Math.floor(this.survivalSeconds * SCORING_CONFIG.SECONDS_MULTIPLIER)
    const coinScore = this.coinsCollected * SCORING_CONFIG.COINS_MULTIPLIER
    return survivalScore + coinScore
  }
  
  /**
   * Get detailed score breakdown
   */
  getScoreBreakdown(): ScoreBreakdown {
    return {
      survivalScore: Math.floor(this.survivalSeconds * SCORING_CONFIG.SECONDS_MULTIPLIER),
      coinScore: this.coinsCollected * SCORING_CONFIG.COINS_MULTIPLIER,
      totalScore: this.calculateFinalScore(),
      survivalSeconds: this.survivalSeconds,
      coinsCollected: this.coinsCollected,
    }
  }
  
  /**
   * Get current score (updates survival time first)
   */
  getCurrentScore(): number {
    this.update()
    return this.calculateFinalScore()
  }
  
  // ============================================
  // SCORE COMPONENTS
  // ============================================
  
  getSurvivalSeconds(): number {
    return this.survivalSeconds
  }
  
  getCoinsCollected(): number {
    return this.coinsCollected
  }
  
  getEnemiesDefeated(): number {
    return this.enemiesDefeated
  }
  
  getDamageFreeWaveStreak(): number {
    return this.damageFreeWaveStreak
  }
  
  getLongestDamageFreeStreak(): number {
    return this.longestDamageFreeStreak
  }
  
  // ============================================
  // CALLBACK REGISTRATION
  // ============================================
  
  onScoreChanged(callback: (score: number, breakdown: ScoreBreakdown) => void): void {
    this.onScoreChangedCallback = callback
  }
  
  onCoinCollected(callback: (amount: number, total: number) => void): void {
    this.onCoinCollectedCallback = callback
  }
  
  // ============================================
  // SCORE UPDATES
  // ============================================
  
  addCoins(amount: number): void {
    this.coinsCollected += amount
    this.triggerScoreChanged()
    this.onCoinCollectedCallback?.(amount, this.coinsCollected)
    console.log(`💰 +${amount} coins (Total: ${this.coinsCollected})`)
  }
  
  addEnemyDefeated(): void {
    this.enemiesDefeated++
    this.triggerScoreChanged()
  }
  
  incrementDamageFreeWaveStreak(): void {
    this.damageFreeWaveStreak++
    this.longestDamageFreeStreak = Math.max(
      this.longestDamageFreeStreak,
      this.damageFreeWaveStreak
    )
    this.triggerScoreChanged()
  }
  
  resetDamageFreeWaveStreak(): void {
    this.damageFreeWaveStreak = 0
    this.triggerScoreChanged()
  }
  
  // ============================================
  // SCORE BONUSES
  // ============================================
  
  addWaveClearBonus(): void {
    this.addCoins(SCORING_CONFIG.WAVE_CLEAR_BONUS / SCORING_CONFIG.COINS_MULTIPLIER)
    console.log(`🎯 Wave clear bonus: +${SCORING_CONFIG.WAVE_CLEAR_BONUS / SCORING_CONFIG.COINS_MULTIPLIER} coins`)
  }
  
  addBossKillBonus(): void {
    this.addCoins(SCORING_CONFIG.BOSS_KILL_BONUS / SCORING_CONFIG.COINS_MULTIPLIER)
    console.log(`👑 Boss kill bonus: +${SCORING_CONFIG.BOSS_KILL_BONUS / SCORING_CONFIG.COINS_MULTIPLIER} coins`)
  }
  
  // ============================================
  // SCORE RATINGS
  // ============================================
  
  getScoreRating(score: number = this.getCurrentScore()): string {
    if (score >= SCORING_CONFIG.PLATINUM_SCORE) return 'Platinum'
    if (score >= SCORING_CONFIG.GOLD_SCORE) return 'Gold'
    if (score >= SCORING_CONFIG.SILVER_SCORE) return 'Silver'
    if (score >= SCORING_CONFIG.BRONZE_SCORE) return 'Bronze'
    return 'Beginner'
  }
  
  getScoreRatingColor(score: number = this.getCurrentScore()): string {
    switch (this.getScoreRating(score)) {
      case 'Platinum': return '#E5E4E2' // Platinum color
      case 'Gold': return '#FFD700'
      case 'Silver': return '#C0C0C0'
      case 'Bronze': return '#CD7F32'
      default: return '#8B4513' // Brown for Beginner
    }
  }
  
  // ============================================
  // SCORE FORMATTING
  // ============================================
  
  formatScore(score: number = this.getCurrentScore()): string {
    return score.toLocaleString()
  }
  
  formatTime(seconds: number = this.survivalSeconds): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  // ============================================
  // PRIVATE METHODS
  // ============================================
  
  private triggerScoreChanged(): void {
    const score = this.getCurrentScore()
    const breakdown = this.getScoreBreakdown()
    this.onScoreChangedCallback?.(score, breakdown)
  }
  
  // ============================================
  // SCORE SUBMISSION
  // ============================================
  
  /**
   * Prepare score data for submission to database
   */
  prepareScoreData(playerName: string, heroId: string, userId: string | null = null): ScoreData {
    return {
      userId,
      playerName,
      finalScore: this.calculateFinalScore(),
      survivalSeconds: Math.floor(this.survivalSeconds),
      coinsCollected: this.coinsCollected,
      enemiesDefeated: this.enemiesDefeated,
      damageFreeWaveStreak: this.longestDamageFreeStreak,
      heroId,
    }
  }
}

// ============================================
// TYPES
// ============================================

export interface ScoreData {
  userId: string | null
  playerName: string
  finalScore: number
  survivalSeconds: number
  coinsCollected: number
  enemiesDefeated: number
  damageFreeWaveStreak: number
  heroId: string
}

export default ScoreManager
