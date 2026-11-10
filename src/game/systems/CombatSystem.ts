/**
 * Combat System
 * Phase 7: Build the Game - Combat Logic
 */

import { Vector2 } from '../utils/vector'
import { Player } from '../entities/Player'
import { Enemy } from '../entities/Enemy'
import { Projectile } from '../entities/Projectile'
import { Coin } from '../entities/Coin'
import { WaveManager } from '../WaveManager'
import { XPManager } from '../XPManager'
import { ScoreManager } from '../ScoreManager'

export interface CombatStats {
  totalDamageDealt: number
  totalDamageTaken: number
  enemiesKilled: number
  coinsCollected: number
  currentKillStreak: number
  maxKillStreak: number
}

export interface DamageInfo {
  amount: number
  type: 'normal' | 'critical' | 'explosion' | 'aoe'
  source: 'player' | 'enemy' | 'environment'
  position: Vector2
}

export interface KillInfo {
  killer: 'player' | 'enemy' | 'environment'
  victim: any
  xpGained: number
  coinsDropped: number
}

export class CombatSystem {
  /** Combat participants */
  private player: Player | null = null
  private enemies: Enemy[] = []
  private playerProjectiles: Projectile[] = []
  private enemyProjectiles: Projectile[] = []
  private coins: Coin[] = []
  
  /** Game systems */
  private waveManager: WaveManager | null = null
  private xpManager: XPManager | null = null
  private scoreManager: ScoreManager | null = null
  
  /** Combat stats */
  private stats: CombatStats = {
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    enemiesKilled: 0,
    coinsCollected: 0,
    currentKillStreak: 0,
    maxKillStreak: 0
  }
  
  /** Combat modifiers */
  private damageMultipliers: Map<string, number> = new Map()
  private defenseMultipliers: Map<string, number> = new Map()
  private critChance: number = 0.1 // 10% critical chance
  private critMultiplier: number = 1.5 // 50% more damage
  
  /** Invulnerability */
  private invulnerableEntities: Set<any> = new Set()
  
  /** Kill tracking */
  private recentKills: KillInfo[] = []
  private killStreakTimeout: number = 5 // seconds
  private killStreakTimer: number = 0

  constructor() {
    // Initialize with default values
  }

  /**
   * Set player reference
   */
  setPlayer(player: Player): void {
    this.player = player
  }

  /**
   * Set wave manager
   */
  setWaveManager(manager: WaveManager): void {
    this.waveManager = manager
  }

  /**
   * Set XP manager
   */
  setXPManager(manager: XPManager): void {
    this.xpManager = manager
  }

  /**
   * Set score manager
   */
  setScoreManager(manager: ScoreManager): void {
    this.scoreManager = manager
  }

  /**
   * Add enemy
   */
  addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy)
  }

  /**
   * Remove enemy
   */
  removeEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy)
    if (index !== -1) {
      this.enemies.splice(index, 1)
    }
  }

  /**
   * Add player projectile
   */
  addPlayerProjectile(projectile: Projectile): void {
    this.playerProjectiles.push(projectile)
  }

  /**
   * Remove player projectile
   */
  removePlayerProjectile(projectile: Projectile): void {
    const index = this.playerProjectiles.indexOf(projectile)
    if (index !== -1) {
      this.playerProjectiles.splice(index, 1)
    }
  }

  /**
   * Add enemy projectile
   */
  addEnemyProjectile(projectile: Projectile): void {
    this.enemyProjectiles.push(projectile)
  }

  /**
   * Remove enemy projectile
   */
  removeEnemyProjectile(projectile: Projectile): void {
    const index = this.enemyProjectiles.indexOf(projectile)
    if (index !== -1) {
      this.enemyProjectiles.splice(index, 1)
    }
  }

  /**
   * Add coin
   */
  addCoin(coin: Coin): void {
    this.coins.push(coin)
  }

  /**
   * Remove coin
   */
  removeCoin(coin: Coin): void {
    const index = this.coins.indexOf(coin)
    if (index !== -1) {
      this.coins.splice(index, 1)
    }
  }

  /**
   * Clear all combat entities
   */
  clearAll(): void {
    this.player = null
    this.enemies = []
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.coins = []
    this.invulnerableEntities.clear()
    this.recentKills = []
    this.killStreakTimer = 0
  }

  /**
   * Update combat system
   */
  update(deltaTime: number): void {
    // Update kill streak timer
    if (this.stats.currentKillStreak > 0) {
      this.killStreakTimer += deltaTime
      if (this.killStreakTimer >= this.killStreakTimeout) {
        this.stats.currentKillStreak = 0
        this.killStreakTimer = 0
      }
    }
    
    // Clean up recent kills
    if (this.recentKills.length > 10) {
      this.recentKills.shift()
    }
  }

  /**
   * Apply damage to an entity
   */
  applyDamage(
    target: any,
    damageInfo: DamageInfo
  ): boolean {
    // Check if target is invulnerable
    if (this.invulnerableEntities.has(target)) {
      return false
    }
    
    // Calculate actual damage
    let actualDamage = damageInfo.amount
    
    // Apply damage multipliers
    if (this.damageMultipliers.has(damageInfo.source)) {
      actualDamage *= this.damageMultipliers.get(damageInfo.source)! + 1
    }
    
    // Apply defense multipliers
    const targetType = this.getEntityType(target)
    if (this.defenseMultipliers.has(targetType)) {
      actualDamage *= 1 - this.defenseMultipliers.get(targetType)!
    }
    
    // Apply critical hit
    if (damageInfo.type !== 'aoe' && Math.random() < this.critChance) {
      actualDamage *= this.critMultiplier
      damageInfo.type = 'critical'
    }
    
    // Ensure minimum damage
    actualDamage = Math.max(1, actualDamage)
    
    // Apply damage based on entity type
    if (target instanceof Player) {
      this.stats.totalDamageTaken += actualDamage
      return target.takeDamage(actualDamage)
    } else if (target instanceof Enemy) {
      this.stats.totalDamageDealt += actualDamage
      return target.takeDamage(actualDamage)
    }
    
    return false
  }

  /**
   * Heal an entity
   */
  healEntity(target: any, amount: number): void {
    if (target instanceof Player) {
      target.heal(amount)
    } else if (target instanceof Enemy) {
      target.heal(amount)
    }
  }

  /**
   * Handle entity death
   */
  handleDeath(
    entity: any,
    killer: 'player' | 'enemy' | 'environment' = 'environment'
  ): KillInfo | null {
    if (entity instanceof Enemy) {
      return this.handleEnemyDeath(entity, killer)
    } else if (entity instanceof Player) {
      return this.handlePlayerDeath(entity, killer)
    }
    
    return null
  }

  /**
   * Handle enemy death
   */
  private handleEnemyDeath(
    enemy: Enemy,
    killer: 'player' | 'enemy' | 'environment'
  ): KillInfo {
    const xpGained = this.calculateXPForKill(enemy)
    const coinsDropped = this.calculateCoinsForKill(enemy)
    
    // Award XP to player if killed by player
    if (killer === 'player' && this.xpManager) {
      this.xpManager.addXP(xpGained)
    }
    
    // Drop coins
    if (killer === 'player' && this.scoreManager) {
      this.scoreManager.addCoins(coinsDropped)
    }
    
    // Update stats
    this.stats.enemiesKilled++
    
    // Update kill streak
    if (killer === 'player') {
      this.stats.currentKillStreak++
      if (this.stats.currentKillStreak > this.stats.maxKillStreak) {
        this.stats.maxKillStreak = this.stats.currentKillStreak
      }
      this.killStreakTimer = 0
    } else {
      // Reset kill streak if killed by something other than player
      this.stats.currentKillStreak = 0
      this.killStreakTimer = 0
    }
    
    // Spawn coins
    for (let i = 0; i < coinsDropped; i++) {
      const coin = new Coin({
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        value: enemy.getCoinValue(),
        type: this.getCoinTypeForEnemy(enemy)
      })
      this.addCoin(coin)
    }
    
    // Record kill
    const killInfo: KillInfo = {
      killer,
      victim: enemy,
      xpGained,
      coinsDropped
    }
    this.recentKills.push(killInfo)
    
    // Update wave manager
    if (this.waveManager) {
      this.waveManager.enemyKilled(enemy)
    }
    
    return killInfo
  }

  /**
   * Handle player death
   */
  private handlePlayerDeath(
    player: Player,
    killer: 'player' | 'enemy' | 'environment'
  ): KillInfo {
    // Reset kill streak
    this.stats.currentKillStreak = 0
    this.killStreakTimer = 0
    
    // Record kill
    const killInfo: KillInfo = {
      killer,
      victim: player,
      xpGained: 0,
      coinsDropped: 0
    }
    this.recentKills.push(killInfo)
    
    return killInfo
  }

  /**
   * Calculate XP for killing an enemy
   */
  private calculateXPForKill(enemy: Enemy): number {
    let xp = 10
    
    // Base XP based on enemy type
    switch (enemy.type) {
      case 'Swarm':
        xp = 10
        break
      case 'Fast Flanker':
        xp = 15
        break
      case 'Ranged Sniper':
        xp = 20
        break
      case 'Mini-Boss':
        xp = 50
        break
      case 'Boss':
        xp = 100
        break
    }
    
    // Bonus for kill streak
    xp += Math.floor(this.stats.currentKillStreak * 2)
    
    // Bonus for boss enemies
    if (enemy.isBoss) {
      xp *= 2
    }
    
    return xp
  }

  /**
   * Calculate coins for killing an enemy
   */
  private calculateCoinsForKill(enemy: Enemy): number {
    return enemy.getCoinValue()
  }

  /**
   * Get coin type for enemy
   */
  private getCoinTypeForEnemy(enemy: Enemy): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' {
    switch (enemy.type) {
      case 'Swarm':
        return 'Bronze'
      case 'Fast Flanker':
        return 'Silver'
      case 'Ranged Sniper':
        return 'Gold'
      case 'Mini-Boss':
      case 'Boss':
        return 'Platinum'
      default:
        return 'Bronze'
    }
  }

  /**
   * Collect coin
   */
  collectCoin(coin: Coin): number {
    const value = coin.value
    this.stats.coinsCollected += value
    
    if (this.scoreManager) {
      this.scoreManager.addCoins(value)
    }
    
    // Remove coin
    this.removeCoin(coin)
    
    return value
  }

  /**
   * Make entity invulnerable
   */
  makeInvulnerable(entity: any, duration: number = 1): void {
    this.invulnerableEntities.add(entity)
    
    // Remove after duration
    setTimeout(() => {
      this.invulnerableEntities.delete(entity)
    }, duration * 1000)
  }

  /**
   * Set damage multiplier for a source
   */
  setDamageMultiplier(source: string, multiplier: number): void {
    this.damageMultipliers.set(source, multiplier)
  }

  /**
   * Set defense multiplier for a target type
   */
  setDefenseMultiplier(targetType: string, multiplier: number): void {
    this.defenseMultipliers.set(targetType, multiplier)
  }

  /**
   * Set critical chance
   */
  setCritChance(chance: number): void {
    this.critChance = Math.max(0, Math.min(1, chance))
  }

  /**
   * Set critical multiplier
   */
  setCritMultiplier(multiplier: number): void {
    this.critMultiplier = Math.max(1, multiplier)
  }

  /**
   * Get entity type as string
   */
  private getEntityType(entity: any): string {
    if (entity instanceof Player) return 'player'
    if (entity instanceof Enemy) return 'enemy'
    if (entity instanceof Projectile) return 'projectile'
    return 'unknown'
  }

  /**
   * Get combat stats
   */
  getStats(): CombatStats {
    return { ...this.stats }
  }

  /**
   * Get recent kills
   */
  getRecentKills(): KillInfo[] {
    return [...this.recentKills]
  }

  /**
   * Get current kill streak
   */
  getKillStreak(): number {
    return this.stats.currentKillStreak
  }

  /**
   * Get max kill streak
   */
  getMaxKillStreak(): number {
    return this.stats.maxKillStreak
  }

  /**
   * Check if entity is invulnerable
   */
  isInvulnerable(entity: any): boolean {
    return this.invulnerableEntities.has(entity)
  }

  /**
   * Spawn coins at position
   */
  spawnCoins(
    position: Vector2,
    count: number,
    value: number = 1,
    type: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze'
  ): Coin[] {
    const coins: Coin[] = []
    
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 50
      const offsetY = (Math.random() - 0.5) * 50
      
      const coin = new Coin({
        x: position.x + offsetX,
        y: position.y + offsetY,
        value,
        type
      })
      
      coins.push(coin)
      this.addCoin(coin)
    }
    
    return coins
  }

  /**
   * Spawn explosion
   */
  spawnExplosion(
    position: Vector2,
    radius: number,
    damage: number,
    source: 'player' | 'enemy' = 'player'
  ): void {
    // Get all enemies in radius
    const enemiesInRange = this.enemies.filter(enemy => {
      const distance = Vector2.distance(enemy.getCenter(), position)
      return distance <= radius
    })
    
    // Apply damage to all enemies in range
    for (const enemy of enemiesInRange) {
      this.applyDamage(enemy, {
        amount: damage * (1 - distance / radius), // Falloff damage
        type: 'explosion',
        source,
        position
      })
    }
  }

  /**
   * Get all enemies
   */
  getEnemies(): Enemy[] {
    return [...this.enemies]
  }

  /**
   * Get all coins
   */
  getCoins(): Coin[] {
    return [...this.coins]
  }

  /**
   * Get player
   */
  getPlayer(): Player | null {
    return this.player
  }
}

export default CombatSystem
