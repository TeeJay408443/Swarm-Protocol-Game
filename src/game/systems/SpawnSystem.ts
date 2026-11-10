/**
 * Spawn System
 * Phase 7: Build the Game - Enemy Spawning
 */

import { Vector2 } from '../utils/vector'
import { Enemy, EnemyType } from '../entities/Enemy'
import { Coin } from '../entities/Coin'
import { WaveManager } from '../WaveManager'
import { enemies as seedEnemies } from '../../db/seedData'
import { EnemiesRow } from '../../types/database'

export interface SpawnPoint {
  x: number
  y: number
  weight: number
}

export interface SpawnGroup {
  enemyTypes: EnemyType[]
  count: number
  spawnRadius: number
  delayBetweenSpawns: number
}

export interface SpawnWave {
  groups: SpawnGroup[]
  totalEnemies: number
  bossSpawn?: boolean
}

export interface SpawnStats {
  totalEnemiesSpawned: number
  totalBossesSpawned: number
  totalCoinsSpawned: number
  currentWave: number
}

export class SpawnSystem {
  /** Wave manager */
  private waveManager: WaveManager | null = null
  
  /** Spawn points */
  private spawnPoints: SpawnPoint[] = []
  
  /** Active enemies */
  private activeEnemies: Enemy[] = []
  
  /** Active coins */
  private activeCoins: Coin[] = []
  
  /** Spawn queue */
  private spawnQueue: { enemy: Enemy, delay: number }[] = []
  
  /** Spawn timer */
  private spawnTimer: number = 0
  
  /** Spawn stats */
  private stats: SpawnStats = {
    totalEnemiesSpawned: 0,
    totalBossesSpawned: 0,
    totalCoinsSpawned: 0,
    currentWave: 0
  }
  
  /** World bounds */
  private worldBounds: { minX: number, minY: number, maxX: number, maxY: number }
  
  /** Spawn settings */
  private settings: {
    spawnRadius: number
    minSpawnDistance: number
    maxActiveEnemies: number
    bossSpawnInterval: number
    coinSpawnChance: number
    coinSpawnCount: { min: number, max: number }
  }

  constructor(waveManager?: WaveManager) {
    this.waveManager = waveManager || null
    
    // Initialize world bounds
    this.worldBounds = {
      minX: 0,
      minY: 0,
      maxX: 2000,
      maxY: 2000
    }
    
    // Initialize settings
    this.settings = {
      spawnRadius: 500,
      minSpawnDistance: 200,
      maxActiveEnemies: 100,
      bossSpawnInterval: 5,
      coinSpawnChance: 0.1,
      coinSpawnCount: { min: 1, max: 3 }
    }
    
    // Initialize spawn points
    this.initializeSpawnPoints()
  }

  /**
   * Initialize spawn points around the map
   */
  private initializeSpawnPoints(): void {
    // Create spawn points at the edges of the world
    const edgePoints = [
      { x: this.worldBounds.minX, y: this.worldBounds.minY, weight: 1 },
      { x: this.worldBounds.maxX, y: this.worldBounds.minY, weight: 1 },
      { x: this.worldBounds.minX, y: this.worldBounds.maxY, weight: 1 },
      { x: this.worldBounds.maxX, y: this.worldBounds.maxY, weight: 1 },
      { x: this.worldBounds.minX + (this.worldBounds.maxX - this.worldBounds.minX) / 2, y: this.worldBounds.minY, weight: 1 },
      { x: this.worldBounds.minX + (this.worldBounds.maxX - this.worldBounds.minX) / 2, y: this.worldBounds.maxY, weight: 1 },
      { x: this.worldBounds.minX, y: this.worldBounds.minY + (this.worldBounds.maxY - this.worldBounds.minY) / 2, weight: 1 },
      { x: this.worldBounds.maxX, y: this.worldBounds.minY + (this.worldBounds.maxY - this.worldBounds.minY) / 2, weight: 1 }
    ]
    
    this.spawnPoints = edgePoints
  }

  /**
   * Set wave manager
   */
  setWaveManager(manager: WaveManager): void {
    this.waveManager = manager
  }

  /**
   * Set world bounds
   */
  setWorldBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    this.worldBounds = { minX, minY, maxX, maxY }
    this.initializeSpawnPoints()
  }

  /**
   * Set spawn settings
   */
  setSettings(settings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...settings }
  }

  /**
   * Add custom spawn point
   */
  addSpawnPoint(point: SpawnPoint): void {
    this.spawnPoints.push(point)
  }

  /**
   * Remove spawn point
   */
  removeSpawnPoint(index: number): void {
    this.spawnPoints.splice(index, 1)
  }

  /**
   * Clear all spawn points
   */
  clearSpawnPoints(): void {
    this.spawnPoints = []
  }

  /**
   * Update spawn system
   */
  update(deltaTime: number, playerPosition?: Vector2): void {
    // Update spawn timer
    this.spawnTimer += deltaTime
    
    // Process spawn queue
    this.processSpawnQueue(deltaTime)
    
    // Clean up dead enemies
    this.cleanupDeadEnemies()
    
    // Clean up collected coins
    this.cleanupCollectedCoins()
    
    // Check if we need to spawn more enemies
    if (this.waveManager) {
      this.checkWaveSpawning()
    }
    
    // Random coin spawning
    if (Math.random() < this.settings.coinSpawnChance * deltaTime) {
      this.spawnRandomCoin()
    }
  }

  /**
   * Process spawn queue
   */
  private processSpawnQueue(deltaTime: number): void {
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i]
      item.delay -= deltaTime
      
      if (item.delay <= 0) {
        // Spawn the enemy
        this.activeEnemies.push(item.enemy)
        this.spawnQueue.splice(i, 1)
        this.stats.totalEnemiesSpawned++
        
        // Add to wave manager if available
        if (this.waveManager) {
          this.waveManager.enemySpawned(item.enemy)
        }
      }
    }
  }

  /**
   * Check if we need to spawn more enemies based on wave
   */
  private checkWaveSpawning(): void {
    if (!this.waveManager) return
    
    const currentWave = this.waveManager.getCurrentWave()
    if (currentWave === null) return
    
    // Update current wave stat
    this.stats.currentWave = currentWave.waveNumber
    
    // Check if wave is active
    if (currentWave.isActive) {
      // Get remaining enemies to spawn
      const remainingEnemies = currentWave.getRemainingEnemies()
      
      // Check if we can spawn more
      if (remainingEnemies > 0 && 
          this.activeEnemies.length < this.settings.maxActiveEnemies) {
        
        // Get spawn group for this wave
        const spawnGroup = this.getSpawnGroupForWave(currentWave.waveNumber)
        
        // Spawn enemies from the group
        this.spawnEnemyGroup(spawnGroup, currentWave.waveNumber)
      }
      
      // Check for boss spawn
      if (currentWave.waveNumber % this.settings.bossSpawnInterval === 0 &&
          !currentWave.bossSpawned) {
        this.spawnBossEnemy(currentWave.waveNumber)
        currentWave.bossSpawned = true
      }
    }
  }

  /**
   * Get spawn group for a wave
   */
  private getSpawnGroupForWave(waveNumber: number): SpawnGroup {
    // Determine enemy types based on wave number
    const enemyTypes: EnemyType[] = []
    
    // Always include basic swarm
    enemyTypes.push('Swarm')
    
    // Add more types as waves progress
    if (waveNumber >= 2) {
      enemyTypes.push('Fast Flanker')
    }
    if (waveNumber >= 4) {
      enemyTypes.push('Ranged Sniper')
    }
    if (waveNumber >= 10) {
      enemyTypes.push('Mini-Boss')
    }
    
    // Calculate count based on wave number
    const count = Math.min(5 + Math.floor(waveNumber * 1.5), 20)
    
    return {
      enemyTypes,
      count,
      spawnRadius: this.settings.spawnRadius,
      delayBetweenSpawns: 0.2
    }
  }

  /**
   * Spawn enemy group
   */
  private spawnEnemyGroup(group: SpawnGroup, waveNumber: number): void {
    const playerPos = waveNumber > 0 ? 
      this.getRandomPositionOutsideRadius({ x: 1000, y: 1000 }, this.settings.minSpawnDistance) :
      this.getRandomSpawnPosition()
    
    for (let i = 0; i < group.count; i++) {
      // Select random enemy type from group
      const enemyType = group.enemyTypes[
        Math.floor(Math.random() * group.enemyTypes.length)
      ]
      
      // Get enemy data for the type
      const enemyData = this.getEnemyDataForType(enemyType)
      
      // Create enemy
      const enemy = new Enemy({
        enemyData,
        x: playerPos.x + (Math.random() - 0.5) * group.spawnRadius * 2,
        y: playerPos.y + (Math.random() - 0.5) * group.spawnRadius * 2,
        isBoss: false
      })
      
      // Scale enemy stats based on wave number
      this.scaleEnemyForWave(enemy, waveNumber)
      
      // Add to spawn queue with delay
      this.spawnQueue.push({
        enemy,
        delay: i * group.delayBetweenSpawns
      })
    }
  }

  /**
   * Spawn boss enemy
   */
  private spawnBossEnemy(waveNumber: number): void {
    // Get boss data (use Mini-Boss for now, or create special boss)
    const enemyData = this.getEnemyDataForType('Mini-Boss')
    
    const playerPos = this.getRandomPositionOutsideRadius({ x: 1000, y: 1000 }, this.settings.minSpawnDistance)
    
    const enemy = new Enemy({
      enemyData,
      x: playerPos.x,
      y: playerPos.y,
      isBoss: true
    })
    
    // Scale boss for wave
    this.scaleEnemyForWave(enemy, waveNumber)
    
    // Boss gets extra scaling
    enemy.maxHealth *= 2
    enemy.health = enemy.maxHealth
    enemy.damage *= 1.5
    enemy.coinValue *= 5
    
    // Add directly (no delay for boss)
    this.activeEnemies.push(enemy)
    this.stats.totalEnemiesSpawned++
    this.stats.totalBossesSpawned++
    
    if (this.waveManager) {
      this.waveManager.enemySpawned(enemy)
    }
  }

  /**
   * Get enemy data for type
   */
  private getEnemyDataForType(type: EnemyType): EnemiesRow | undefined {
    const enemy = seedEnemies.find(e => e.category === type)
    return enemy
  }

  /**
   * Scale enemy stats based on wave number
   */
  private scaleEnemyForWave(enemy: Enemy, waveNumber: number): void {
    const scaleFactor = 1 + (waveNumber - 1) * 0.1
    
    enemy.maxHealth = Math.floor(enemy.maxHealth * scaleFactor)
    enemy.health = enemy.maxHealth
    enemy.damage = Math.floor(enemy.damage * scaleFactor)
    enemy.speed *= scaleFactor
    enemy.coinValue = Math.floor(enemy.coinValue * scaleFactor)
  }

  /**
   * Get random spawn position
   */
  private getRandomSpawnPosition(): Vector2 {
    if (this.spawnPoints.length === 0) {
      return {
        x: this.worldBounds.minX + Math.random() * (this.worldBounds.maxX - this.worldBounds.minX),
        y: this.worldBounds.minY + Math.random() * (this.worldBounds.maxY - this.worldBounds.minY)
      }
    }
    
    // Select random spawn point based on weight
    const totalWeight = this.spawnPoints.reduce((sum, point) => sum + point.weight, 0)
    let random = Math.random() * totalWeight
    
    for (const point of this.spawnPoints) {
      random -= point.weight
      if (random <= 0) {
        return { x: point.x, y: point.y }
      }
    }
    
    return { x: this.spawnPoints[0].x, y: this.spawnPoints[0].y }
  }

  /**
   * Get random position outside radius from center
   */
  private getRandomPositionOutsideRadius(center: Vector2, minDistance: number): Vector2 {
    const angle = Math.random() * Math.PI * 2
    const distance = minDistance + Math.random() * (this.settings.spawnRadius - minDistance)
    
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance
    }
  }

  /**
   * Spawn random coin
   */
  private spawnRandomCoin(): void {
    const count = Math.floor(
      Math.random() * (this.settings.coinSpawnCount.max - this.settings.coinSpawnCount.min + 1) + 
      this.settings.coinSpawnCount.min
    )
    
    for (let i = 0; i < count; i++) {
      const position = this.getRandomSpawnPosition()
      
      const coin = new Coin({
        x: position.x + (Math.random() - 0.5) * 100,
        y: position.y + (Math.random() - 0.5) * 100,
        value: 1,
        type: ['Bronze', 'Silver', 'Gold'][Math.floor(Math.random() * 3)] as 'Bronze' | 'Silver' | 'Gold'
      })
      
      this.activeCoins.push(coin)
      this.stats.totalCoinsSpawned++
    }
  }

  /**
   * Spawn coin at specific position
   */
  spawnCoinAt(position: Vector2, value: number = 1, type?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'): Coin {
    const coin = new Coin({
      x: position.x,
      y: position.y,
      value,
      type
    })
    
    this.activeCoins.push(coin)
    this.stats.totalCoinsSpawned++
    
    return coin
  }

  /**
   * Spawn multiple coins at position
   */
  spawnCoinsAt(position: Vector2, count: number, value: number = 1): Coin[] {
    const coins: Coin[] = []
    
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 30
      const offsetY = (Math.random() - 0.5) * 30
      
      const coin = this.spawnCoinAt(
        { x: position.x + offsetX, y: position.y + offsetY },
        value
      )
      coins.push(coin)
    }
    
    return coins
  }

  /**
   * Clean up dead enemies
   */
  private cleanupDeadEnemies(): void {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i]
      if (!enemy.isAlive && !enemy.isDying) {
        this.activeEnemies.splice(i, 1)
      }
    }
  }

  /**
   * Clean up collected coins
   */
  private cleanupCollectedCoins(): void {
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i]
      if (!coin.isAlive) {
        this.activeCoins.splice(i, 1)
      }
    }
  }

  /**
   * Get all active enemies
   */
  getActiveEnemies(): Enemy[] {
    return [...this.activeEnemies]
  }

  /**
   * Get all active coins
   */
  getActiveCoins(): Coin[] {
    return [...this.activeCoins]
  }

  /**
   * Get spawn queue
   */
  getSpawnQueue(): { enemy: Enemy, delay: number }[] {
    return [...this.spawnQueue]
  }

  /**
   * Get spawn stats
   */
  getStats(): SpawnStats {
    return { ...this.stats }
  }

  /**
   * Remove enemy from active list
   */
  removeEnemy(enemy: Enemy): void {
    const index = this.activeEnemies.indexOf(enemy)
    if (index !== -1) {
      this.activeEnemies.splice(index, 1)
    }
  }

  /**
   * Remove coin from active list
   */
  removeCoin(coin: Coin): void {
    const index = this.activeCoins.indexOf(coin)
    if (index !== -1) {
      this.activeCoins.splice(index, 1)
    }
  }

  /**
   * Start new wave
   */
  startNewWave(waveNumber: number): void {
    this.stats.currentWave = waveNumber
    
    // Clear existing enemies and queue
    this.activeEnemies = []
    this.spawnQueue = []
    
    // Spawn initial enemies for this wave
    const spawnGroup = this.getSpawnGroupForWave(waveNumber)
    this.spawnEnemyGroup(spawnGroup, waveNumber)
  }

  /**
   * End current wave
   */
  endCurrentWave(): void {
    // Clear spawn queue
    this.spawnQueue = []
    
    // Mark all enemies for removal (they'll be cleaned up)
    for (const enemy of this.activeEnemies) {
      enemy.isAlive = false
    }
  }

  /**
   * Spawn powerup at position
   */
  spawnPowerupAt(position: Vector2, type: string): void {
    // In this game, powerups are handled through the LevelUp system
    // This is a placeholder for future expansion
    console.log(`Spawning powerup: ${type} at (${position.x}, ${position.y})`)
  }
}

export default SpawnSystem
