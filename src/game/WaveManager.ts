/**
 * Wave Manager for Swarm Protocol: Survivor
 * Phase 3: Game Design - Manages wave spawning, timing, and progression
 */

import type { Position } from '../types/game'
import type { EnhancedEnemy } from '../db/seedDataEnhanced'
import { WAVE_CONFIG } from '../config/gameConstants'
import { enhancedEnemies } from '../db/seedDataEnhanced'

// ============================================
// WAVE TYPES
// ============================================

export interface Wave {
  number: number
  waveNumber: number
  startTime: number
  isActive: boolean
  isBreather: boolean
  enemiesSpawned: number
  enemiesDefeated: number
  allEnemiesDefeated: boolean
  isBossWave: boolean
  bossSpawned: boolean
  bossDefeated: boolean
  getRemainingEnemies: () => number
}

export interface WaveConfig {
  wave: number
  enemyCount: number
  spawnRate: number
  difficulty: number
}

export interface SpawnPoint {
  x: number
  y: number
}

// ============================================
// WAVE MANAGER CLASS
// ============================================

export class WaveManager {
  private currentWave: Wave
  private wavesCompleted: number = 0
  private spawnPoints: Position[] = []
  private enemySpawnQueue: { enemy: EnhancedEnemy; spawnTime: number; position: Position }[] = []
  private spawnTimer: NodeJS.Timeout | null = null
  private waveTimer: NodeJS.Timeout | null = null
  
  // Callbacks
  private onWaveStartCallback: ((wave: number) => void) | null = null
  private onWaveCompleteCallback: ((wave: number, allDefeated: boolean) => void) | null = null
  private onBossSpawnCallback: ((wave: number) => void) | null = null
  private onBreatherStartCallback: ((wave: number) => void) | null = null
  private onLevelUpCallback: ((wave: number) => void) | null = null
  
  constructor(canvasWidth: number, canvasHeight: number) {
    // Initialize spawn points around the edges of the canvas
    this.initializeSpawnPoints(canvasWidth, canvasHeight)
    
    // Initialize first wave
    this.currentWave = this.createWave(1)
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  private initializeSpawnPoints(width: number, height: number): void {
    const padding = 100 // Spawn padding from edges
    const spacing = 200 // Spacing between spawn points
    
    // Top edge spawn points
    for (let x = padding; x < width - padding; x += spacing) {
      this.spawnPoints.push({ x, y: padding })
    }
    
    // Bottom edge spawn points
    for (let x = padding; x < width - padding; x += spacing) {
      this.spawnPoints.push({ x, y: height - padding })
    }
    
    // Left edge spawn points
    for (let y = padding + spacing; y < height - padding; y += spacing) {
      this.spawnPoints.push({ x: padding, y })
    }
    
    // Right edge spawn points
    for (let y = padding + spacing; y < height - padding; y += spacing) {
      this.spawnPoints.push({ x: width - padding, y })
    }
  }
  
  private createWave(number: number): Wave {
    const waveConfig = this.getWaveConfig(number)
    const wave: Wave = {
      number,
      waveNumber: number,
      startTime: Date.now(),
      isActive: false,
      isBreather: false,
      enemiesSpawned: 0,
      enemiesDefeated: 0,
      allEnemiesDefeated: false,
      isBossWave: number % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0,
      bossSpawned: false,
      bossDefeated: false,
      getRemainingEnemies: () => Math.max(0, waveConfig.enemyCount - wave.enemiesSpawned)
    }
    return wave
  }
  
  // ============================================
  // PUBLIC METHODS
  // ============================================
  
  start(): void {
    this.startWave()
  }
  
  startWave(waveNumber?: number): void {
    const num = waveNumber !== undefined ? waveNumber : this.currentWave.number
    this.currentWave = this.createWave(num)
    this.currentWave.isActive = true
    
    // Schedule enemy spawns
    this.scheduleEnemySpawns()
    
    // Start wave timer
    this.startWaveTimer()
    
    // Trigger wave start callback
    this.onWaveStartCallback?.(num)
    
    console.log(`🌊 Wave ${num} started`)
  }

  resize(width: number, height: number): void {
    this.spawnPoints = []
    this.initializeSpawnPoints(width, height)
  }

  update(_deltaTime?: number): void {
    // Wave state updates if needed
  }

  render(_ctx?: CanvasRenderingContext2D, _deltaTime?: number): void {
    // Wave render overlay if needed
  }

  enemySpawned(_enemy?: any): void {
    this.currentWave.enemiesSpawned++
  }

  enemyKilled(_enemy?: any): void {
    this.enemyDefeated()
  }
  
  stop(): void {
    this.clearTimers()
  }
  
  reset(): void {
    this.stop()
    this.wavesCompleted = 0
    this.currentWave = this.createWave(1)
  }
  
  getCurrentWave(): Wave {
    return this.currentWave
  }
  
  getWavesCompleted(): number {
    return this.wavesCompleted
  }
  
  getTotalWaves(): number {
    return this.wavesCompleted + (this.currentWave.isActive || this.currentWave.isBreather ? 1 : 0)
  }
  
  // ============================================
  // CALLBACK REGISTRATION
  // ============================================
  
  onWaveStart(callback: (wave: number) => void): void {
    this.onWaveStartCallback = callback
  }
  
  onWaveEnd(callback: (wave: number) => void): void {
    this.onWaveCompleteCallback = (wave, _allDefeated) => callback(wave)
  }

  onWaveComplete(callback: (wave: number, allDefeated: boolean) => void): void {
    this.onWaveCompleteCallback = callback
  }
  
  onBossSpawn(callback: (wave: number) => void): void {
    this.onBossSpawnCallback = callback
  }
  
  onBreatherStart(callback: (wave: number) => void): void {
    this.onBreatherStartCallback = callback
  }
  
  onLevelUp(callback: (wave: number) => void): void {
    this.onLevelUpCallback = callback
  }
  
  // ============================================
  // WAVE LIFECYCLE
  // ============================================
  
  private scheduleEnemySpawns(): void {
    const waveConfig = this.getWaveConfig(this.currentWave.number)
    const spawnableEnemies = this.getSpawnableEnemies(this.currentWave.number)
    const enemyCount = waveConfig.enemyCount
    
    // Calculate spawn delay
    const spawnDelay = WAVE_CONFIG.WAVE_DURATION_SECONDS * 1000 / enemyCount
    
    // Schedule spawns
    for (let i = 0; i < enemyCount; i++) {
      const spawnTime = Date.now() + i * spawnDelay
      const enemy = this.selectRandomEnemy(spawnableEnemies)
      const position = this.getRandomSpawnPoint()
      
      this.enemySpawnQueue.push({
        enemy,
        spawnTime,
        position,
      })
    }
    
    // Start spawn timer
    this.startSpawnTimer()
  }
  
  private startSpawnTimer(): void {
    this.spawnTimer = setInterval(() => {
      const now = Date.now()
      
      // Process spawn queue
      for (let i = this.enemySpawnQueue.length - 1; i >= 0; i--) {
        const spawn = this.enemySpawnQueue[i]
        if (now >= spawn.spawnTime) {
          // Spawn enemy
          this.spawnEnemy(spawn.enemy, spawn.position)
          this.enemySpawnQueue.splice(i, 1)
        }
      }
    }, 100) // Check every 100ms
  }
  
  private startWaveTimer(): void {
    this.waveTimer = setTimeout(() => {
      // Wave time expired, transition to breather
      this.transitionToBreather(false)
    }, WAVE_CONFIG.WAVE_DURATION_SECONDS * 1000)
  }
  
  // ============================================
  // ENEMY SPAWNING
  // ============================================
  
  private getWaveConfig(wave: number): WaveConfig {
    const baseCount = 10
    const scaling = 0.5
    const enemyCount = Math.floor(baseCount + wave * scaling)
    
    return {
      wave,
      enemyCount,
      spawnRate: 1.0 + wave * 0.05,
      difficulty: wave,
    }
  }
  
  private getSpawnableEnemies(wave: number): EnhancedEnemy[] {
    return enhancedEnemies.filter(enemy => enemy.minWave <= wave)
  }
  
  private selectRandomEnemy(enemies: EnhancedEnemy[]): EnhancedEnemy {
    return enemies[Math.floor(Math.random() * enemies.length)]
  }
  
  private getRandomSpawnPoint(): Position {
    return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)]
  }
  
  spawnEnemy(enemyData: EnhancedEnemy, _position: Position): void {
    this.currentWave.enemiesSpawned++
    
    // Check if this is a boss wave and we haven't spawned the boss yet
    if (this.currentWave.isBossWave && !this.currentWave.bossSpawned && enemyData.category === 'Mini-Boss') {
      this.currentWave.bossSpawned = true
      this.onBossSpawnCallback?.(this.currentWave.number)
      console.log(`👑 Boss spawned for wave ${this.currentWave.number}`)
    }
    
    // This prototype renders enemies from the React view's wave list.
    // The manager only tracks wave spawn/defeat counts.
  }
  
  // ============================================
  // WAVE TRANSITIONS
  // ============================================
  
  enemyDefeated(): void {
    this.currentWave.enemiesDefeated++
    
    // Check if all enemies are defeated
    if (this.currentWave.enemiesDefeated >= this.currentWave.enemiesSpawned) {
      this.currentWave.allEnemiesDefeated = true
      this.transitionToBreather(true)
    }
  }
  
  private transitionToBreather(allDefeated: boolean): void {
    // Clear timers
    this.clearTimers()
    
    // Update wave state
    this.currentWave.isActive = false
    this.currentWave.isBreather = true
    
    // Trigger breather start callback
    this.onBreatherStartCallback?.(this.currentWave.number)
    
    console.log(`🌬️ Breather started for wave ${this.currentWave.number}`)
    
    // Start breather timer
    setTimeout(() => {
      this.endBreather(allDefeated)
    }, WAVE_CONFIG.BREATHER_DURATION_SECONDS * 1000)
  }
  
  private endBreather(allDefeated: boolean): void {
    // Update wave state
    this.currentWave.isBreather = false
    
    // Trigger wave complete callback
    this.onWaveCompleteCallback?.(this.currentWave.number, allDefeated)
    
    // If wave was cleared, trigger level up
    if (allDefeated) {
      this.onLevelUpCallback?.(this.currentWave.number)
      console.log(`⬆️ Level up triggered after wave ${this.currentWave.number}`)
    }
    
    // Increment waves completed
    this.wavesCompleted++
    
    // Start next wave
    this.startWave()
  }
  
  // ============================================
  // BOSS MANAGEMENT
  // ============================================
  
  isBossWave(): boolean {
    return this.currentWave.isBossWave
  }
  
  bossDefeated(): void {
    this.currentWave.bossDefeated = true
    console.log(`☠️ Boss defeated in wave ${this.currentWave.number}`)
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  
  private clearTimers(): void {
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer)
      this.spawnTimer = null
    }
    if (this.waveTimer) {
      clearTimeout(this.waveTimer)
      this.waveTimer = null
    }
  }
  
  // ============================================
  // STATIC UTILITIES
  // ============================================
  
  static isBossWave(wave: number): boolean {
    return wave % WAVE_CONFIG.BOSS_WAVE_INTERVAL === 0
  }
  
  static getBossEnemy(): EnhancedEnemy | undefined {
    return enhancedEnemies.find(enemy => enemy.category === 'Mini-Boss')
  }
}

export default WaveManager
