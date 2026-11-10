/**
 * Collision System
 * Phase 7: Build the Game - Collision Detection
 */

import { Vector2 } from '../utils/vector'
import { Player } from '../entities/Player'
import { Enemy } from '../entities/Enemy'
import { Projectile } from '../entities/Projectile'
import { Coin } from '../entities/Coin'
import { Collision, Rectangle, Circle } from '../utils/collision'

export interface CollisionEvent {
  type: 'player-enemy' | 'player-projectile' | 'player-coin' | 
         'enemy-projectile' | 'enemy-enemy' | 'projectile-projectile'
  entity1: any
  entity2: any
  damage?: number
  position: Vector2
}

export interface CollisionResult {
  hit: boolean
  normal: Vector2 | null
  penetration: Vector2 | null
  distance: number
}

export class CollisionSystem {
  /** Collision layers */
  private layers: {
    player: any[]
    enemies: any[]
    playerProjectiles: any[]
    enemyProjectiles: any[]
    coins: any[]
    walls: Rectangle[]
  }
  
  /** Collision callbacks */
  private callbacks: Map<string, (event: CollisionEvent) => void>
  
  /** World bounds */
  private worldBounds: Rectangle = {
    x: 0,
    y: 0,
    width: 2000,
    height: 2000
  }
  
  /** Performance optimization */
  private useSpatialPartitioning: boolean = false
  private gridSize: number = 100
  private spatialGrid: Map<string, any[]> = new Map()

  constructor() {
    this.layers = {
      player: [],
      enemies: [],
      playerProjectiles: [],
      enemyProjectiles: [],
      coins: [],
      walls: []
    }
    this.callbacks = new Map()
  }

  /**
   * Add entity to collision system
   */
  addEntity(entity: any, layer: string): void {
    if (this.layers[layer]) {
      this.layers[layer].push(entity)
      
      // Add to spatial grid if enabled
      if (this.useSpatialPartitioning && entity.getPosition) {
        this.addToSpatialGrid(entity, layer)
      }
    }
  }

  /**
   * Remove entity from collision system
   */
  removeEntity(entity: any, layer: string): void {
    if (this.layers[layer]) {
      const index = this.layers[layer].indexOf(entity)
      if (index !== -1) {
        this.layers[layer].splice(index, 1)
        
        // Remove from spatial grid
        if (this.useSpatialPartitioning) {
          this.removeFromSpatialGrid(entity, layer)
        }
      }
    }
  }

  /**
   * Add to spatial grid
   */
  private addToSpatialGrid(entity: any, layer: string): void {
    const pos = entity.getPosition()
    const cellX = Math.floor(pos.x / this.gridSize)
    const cellY = Math.floor(pos.y / this.gridSize)
    const cellKey = `${cellX},${cellY}`
    
    if (!this.spatialGrid.has(cellKey)) {
      this.spatialGrid.set(cellKey, [])
    }
    this.spatialGrid.get(cellKey)!.push({ entity, layer })
  }

  /**
   * Remove from spatial grid
   */
  private removeFromSpatialGrid(entity: any, layer: string): void {
    const pos = entity.getPosition()
    const cellX = Math.floor(pos.x / this.gridSize)
    const cellY = Math.floor(pos.y / this.gridSize)
    const cellKey = `${cellX},${cellY}`
    
    const cell = this.spatialGrid.get(cellKey)
    if (cell) {
      const index = cell.findIndex(item => item.entity === entity && item.layer === layer)
      if (index !== -1) {
        cell.splice(index, 1)
      }
    }
  }

  /**
   * Clear all entities from a layer
   */
  clearLayer(layer: string): void {
    this.layers[layer] = []
    if (this.useSpatialPartitioning) {
      this.spatialGrid.clear()
    }
  }

  /**
   * Clear all entities
   */
  clearAll(): void {
    for (const layer in this.layers) {
      this.layers[layer] = []
    }
    this.spatialGrid.clear()
  }

  /**
   * Register collision callback
   */
  onCollision(type: string, callback: (event: CollisionEvent) => void): void {
    this.callbacks.set(type, callback)
  }

  /**
   * Remove collision callback
   */
  offCollision(type: string): void {
    this.callbacks.delete(type)
  }

  /**
   * Update spatial grid (call when entities move)
   */
  updateSpatialGrid(): void {
    if (!this.useSpatialPartitioning) return
    
    this.spatialGrid.clear()
    
    for (const layer in this.layers) {
      for (const entity of this.layers[layer]) {
        if (entity.getPosition) {
          this.addToSpatialGrid(entity, layer)
        }
      }
    }
  }

  /**
   * Check all collisions
   */
  checkCollisions(deltaTime: number): CollisionEvent[] {
    const events: CollisionEvent[] = []
    
    // Player vs Enemies
    events.push(...this.checkPlayerEnemyCollisions())
    
    // Player vs Enemy Projectiles
    events.push(...this.checkPlayerProjectileCollisions('enemyProjectiles'))
    
    // Player vs Coins
    events.push(...this.checkPlayerCoinCollisions())
    
    // Player Projectiles vs Enemies
    events.push(...this.checkProjectileEnemyCollisions('playerProjectiles', 'enemies'))
    
    // Enemy Projectiles vs Player
    events.push(...this.checkProjectileEnemyCollisions('enemyProjectiles', 'player'))
    
    // Enemy vs Enemy (optional)
    // events.push(...this.checkEnemyEnemyCollisions())
    
    // Trigger callbacks
    for (const event of events) {
      const callback = this.callbacks.get(event.type)
      if (callback) {
        callback(event)
      }
    }
    
    return events
  }

  /**
   * Check player vs enemy collisions
   */
  private checkPlayerEnemyCollisions(): CollisionEvent[] {
    const events: CollisionEvent[] = []
    const player = this.layers.player[0]
    
    if (!player || !player.isAlive) return events
    
    for (const enemy of this.layers.enemies) {
      if (!enemy.isAlive || enemy.isSpawning) continue
      
      if (this.checkCollision(player, enemy)) {
        events.push({
          type: 'player-enemy',
          entity1: player,
          entity2: enemy,
          damage: enemy.damage,
          position: player.getCenter()
        })
      }
    }
    
    return events
  }

  /**
   * Check player vs projectile collisions
   */
  private checkPlayerProjectileCollisions(layer: string): CollisionEvent[] {
    const events: CollisionEvent[] = []
    const player = this.layers.player[0]
    
    if (!player || !player.isAlive) return events
    
    const projectiles = this.layers[layer]
    if (!projectiles) return events
    
    for (const projectile of projectiles) {
      if (!projectile.isAlive) continue
      
      if (this.checkCollision(player, projectile)) {
        events.push({
          type: 'player-projectile',
          entity1: player,
          entity2: projectile,
          damage: projectile.damage,
          position: player.getCenter()
        })
        
        // Mark projectile for removal
        projectile.isAlive = false
        if (projectile.explosionRadius > 0) {
          projectile.isExploding = true
          projectile.explosionTimer = 0
        }
      }
    }
    
    return events
  }

  /**
   * Check player vs coin collisions
   */
  private checkPlayerCoinCollisions(): CollisionEvent[] {
    const events: CollisionEvent[] = []
    const player = this.layers.player[0]
    
    if (!player) return events
    
    for (let i = this.layers.coins.length - 1; i >= 0; i--) {
      const coin = this.layers.coins[i]
      if (!coin.isAlive || coin.isCollected) continue
      
      if (this.checkCollision(player, coin)) {
        events.push({
          type: 'player-coin',
          entity1: player,
          entity2: coin,
          position: coin.getCenter()
        })
        
        // Collect coin
        coin.collect()
      }
    }
    
    return events
  }

  /**
   * Check projectile vs enemy collisions
   */
  private checkProjectileEnemyCollisions(
    projectileLayer: string,
    targetLayer: string
  ): CollisionEvent[] {
    const events: CollisionEvent[] = []
    const projectiles = this.layers[projectileLayer]
    const targets = this.layers[targetLayer]
    
    if (!projectiles || !targets) return events
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i]
      if (!projectile.isAlive) continue
      
      for (const target of targets) {
        if (!target.isAlive) continue
        
        if (this.checkCollision(projectile, target)) {
          const isPlayerProjectile = projectileLayer === 'playerProjectiles'
          
          events.push({
            type: 'enemy-projectile',
            entity1: isPlayerProjectile ? projectile : target,
            entity2: isPlayerProjectile ? target : projectile,
            damage: projectile.damage,
            position: target.getCenter()
          })
          
          // Handle projectile
          if (projectile.hitEntity()) {
            // Projectile is destroyed
            if (projectile.explosionRadius > 0) {
              projectile.isExploding = true
              projectile.explosionTimer = 0
            }
          }
          
          break // Projectile can only hit one target unless it pierces
        }
      }
    }
    
    return events
  }

  /**
   * Check enemy vs enemy collisions
   */
  private checkEnemyEnemyCollisions(): CollisionEvent[] {
    const events: CollisionEvent[] = []
    const enemies = this.layers.enemies
    
    for (let i = 0; i < enemies.length; i++) {
      const enemy1 = enemies[i]
      if (!enemy1.isAlive) continue
      
      for (let j = i + 1; j < enemies.length; j++) {
        const enemy2 = enemies[j]
        if (!enemy2.isAlive) continue
        
        if (this.checkCollision(enemy1, enemy2)) {
          // Push enemies apart
          const normal = Collision.getRectRectNormal(
            enemy1.getBounds(),
            enemy2.getBounds()
          )
          if (normal) {
            enemy1.x -= normal.x * 0.5
            enemy1.y -= normal.y * 0.5
            enemy2.x += normal.x * 0.5
            enemy2.y += normal.y * 0.5
          }
        }
      }
    }
    
    return events
  }

  /**
   * Check collision between two entities
   */
  private checkCollision(entity1: any, entity2: any): boolean {
    // Get bounds for both entities
    const bounds1 = this.getEntityBounds(entity1)
    const bounds2 = this.getEntityBounds(entity2)
    
    if (!bounds1 || !bounds2) return false
    
    // Check AABB collision
    return Collision.rectRect(bounds1, bounds2)
  }

  /**
   * Get bounds for an entity
   */
  private getEntityBounds(entity: any): Rectangle | null {
    if (entity.getBounds) {
      const bounds = entity.getBounds()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top
      }
    }
    return null
  }

  /**
   * Check if point is inside world bounds
   */
  isInWorldBounds(x: number, y: number): boolean {
    return (
      x >= this.worldBounds.x &&
      x <= this.worldBounds.x + this.worldBounds.width &&
      y >= this.worldBounds.y &&
      y <= this.worldBounds.y + this.worldBounds.height
    )
  }

  /**
   * Clamp position to world bounds
   */
  clampToWorldBounds(entity: { x: number, y: number, width: number, height: number }): void {
    if (entity.x < this.worldBounds.x) {
      entity.x = this.worldBounds.x
    }
    if (entity.y < this.worldBounds.y) {
      entity.y = this.worldBounds.y
    }
    if (entity.x + entity.width > this.worldBounds.x + this.worldBounds.width) {
      entity.x = this.worldBounds.x + this.worldBounds.width - entity.width
    }
    if (entity.y + entity.height > this.worldBounds.y + this.worldBounds.height) {
      entity.y = this.worldBounds.y + this.worldBounds.height - entity.height
    }
  }

  /**
   * Set world bounds
   */
  setWorldBounds(bounds: Rectangle): void {
    this.worldBounds = bounds
  }

  /**
   * Enable spatial partitioning
   */
  enableSpatialPartitioning(gridSize: number = 100): void {
    this.useSpatialPartitioning = true
    this.gridSize = gridSize
    this.updateSpatialGrid()
  }

  /**
   * Disable spatial partitioning
   */
  disableSpatialPartitioning(): void {
    this.useSpatialPartitioning = false
    this.spatialGrid.clear()
  }

  /**
   * Get nearest entity of type to position
   */
  getNearestEntity(
    position: Vector2,
    layer: string,
    maxDistance: number = Infinity
  ): any | null {
    const entities = this.layers[layer]
    if (!entities) return null
    
    let nearest: any = null
    let nearestDistance = maxDistance
    
    for (const entity of entities) {
      if (!entity.isAlive) continue
      
      const entityPos = entity.getPosition()
      const dx = entityPos.x - position.x
      const dy = entityPos.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < nearestDistance) {
        nearest = entity
        nearestDistance = distance
      }
    }
    
    return nearest
  }

  /**
   * Get all entities in range
   */
  getEntitiesInRange(
    position: Vector2,
    layer: string,
    range: number
  ): any[] {
    const entities = this.layers[layer]
    if (!entities) return []
    
    const result: any[] = []
    
    for (const entity of entities) {
      if (!entity.isAlive) continue
      
      const entityPos = entity.getPosition()
      const dx = entityPos.x - position.x
      const dy = entityPos.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance <= range) {
        result.push(entity)
      }
    }
    
    return result
  }

  /**
   * Check line of sight between two positions
   */
  hasLineOfSight(
    start: Vector2,
    end: Vector2,
    obstacles: Rectangle[] = []
  ): boolean {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const direction = { x: dx / distance, y: dy / distance }
    
    // Check against walls
    for (const wall of this.layers.walls) {
      if (this.lineRectIntersection(start, direction, distance, wall)) {
        return false
      }
    }
    
    // Check against custom obstacles
    for (const obstacle of obstacles) {
      if (this.lineRectIntersection(start, direction, distance, obstacle)) {
        return false
      }
    }
    
    return true
  }

  /**
   * Check if line intersects with rectangle
   */
  private lineRectIntersection(
    start: Vector2,
    direction: Vector2,
    maxDistance: number,
    rect: Rectangle
  ): boolean {
    // Calculate intersection with rectangle edges
    const invDirX = 1 / direction.x
    const invDirY = 1 / direction.y
    
    // Calculate intersection with left and right edges
    let tmin = -Infinity
    let tmax = Infinity
    
    if (invDirX >= 0) {
      const t1 = (rect.x - start.x) * invDirX
      const t2 = (rect.x + rect.width - start.x) * invDirX
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
    } else {
      const t1 = (rect.x + rect.width - start.x) * invDirX
      const t2 = (rect.x - start.x) * invDirX
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
    }
    
    if (invDirY >= 0) {
      const t1 = (rect.y - start.y) * invDirY
      const t2 = (rect.y + rect.height - start.y) * invDirY
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
    } else {
      const t1 = (rect.y + rect.height - start.y) * invDirY
      const t2 = (rect.y - start.y) * invDirY
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
    }
    
    return tmin <= tmax && tmin <= maxDistance && tmax >= 0
  }

  /**
   * Get collision system stats
   */
  getStats(): {
    entitiesByLayer: Record<string, number>
    totalEntities: number
    spatialPartitioningEnabled: boolean
  } {
    const stats: any = {
      entitiesByLayer: {},
      totalEntities: 0,
      spatialPartitioningEnabled: this.useSpatialPartitioning
    }
    
    for (const layer in this.layers) {
      stats.entitiesByLayer[layer] = this.layers[layer].filter((e: any) => e.isAlive).length
      stats.totalEntities += stats.entitiesByLayer[layer]
    }
    
    return stats
  }
}

export default CollisionSystem
