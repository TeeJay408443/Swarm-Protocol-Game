/**
 * Auto-Targeting System for Swarm Protocol: Survivor
 * Phase 3: Game Design - Manages enemy targeting for player weapons
 */

import type { Enemy, Player, Position, Vector } from '../types/game'

// ============================================
// TARGETING TYPES
// ============================================

export type TargetingMode = 'closest' | 'weakest' | 'strongest' | 'most_dangerous' | 'random'

export interface TargetInfo {
  enemy: Enemy
  distance: number
  threatScore: number
}

// ============================================
// AUTO-TARGETING CLASS
// ============================================

export class AutoTargeting {
  private targetingMode: TargetingMode = 'closest'
  private maxTargetDistance: number = 500
  private currentTarget: Enemy | null = null
  
  // Callbacks
  private onTargetChangedCallback: ((target: Enemy | null) => void) | null = null
  
  constructor(maxDistance: number = 500) {
    this.maxTargetDistance = maxDistance
  }
  
  // ============================================
  // PUBLIC METHODS
  // ============================================
  
  setTargetingMode(mode: TargetingMode): void {
    this.targetingMode = mode
    console.log(`🎯 Targeting mode set to: ${mode}`)
  }
  
  getTargetingMode(): TargetingMode {
    return this.targetingMode
  }
  
  getCurrentTarget(): Enemy | null {
    return this.currentTarget
  }
  
  setMaxTargetDistance(distance: number): void {
    this.maxTargetDistance = distance
  }
  
  getMaxTargetDistance(): number {
    return this.maxTargetDistance
  }
  
  // ============================================
  // CALLBACK REGISTRATION
  // ============================================
  
  onTargetChanged(callback: (target: Enemy | null) => void): void {
    this.onTargetChangedCallback = callback
  }
  
  // ============================================
  // TARGETING LOGIC
  // ============================================
  
  findTarget(player: Player, enemies: Enemy[]): Enemy | null {
    // Filter enemies within range
    const enemiesInRange = enemies.filter(enemy => 
      this.calculateDistance(player.position, enemy.position) <= this.maxTargetDistance
    )
    
    if (enemiesInRange.length === 0) {
      this.setTarget(null)
      return null
    }
    
    // Select target based on mode
    let target: Enemy | null = null
    
    switch (this.targetingMode) {
      case 'closest':
        target = this.findClosestTarget(player, enemiesInRange)
        break
      case 'weakest':
        target = this.findWeakestTarget(enemiesInRange)
        break
      case 'strongest':
        target = this.findStrongestTarget(enemiesInRange)
        break
      case 'most_dangerous':
        target = this.findMostDangerousTarget(player, enemiesInRange)
        break
      case 'random':
        target = this.findRandomTarget(enemiesInRange)
        break
      default:
        target = this.findClosestTarget(player, enemiesInRange)
    }
    
    // Update current target
    this.setTarget(target)
    
    return target
  }
  
  updateTarget(player: Player, enemies: Enemy[]): void {
    this.findTarget(player, enemies)
  }
  
  clearTarget(): void {
    this.setTarget(null)
  }
  
  // ============================================
  // TARGET SELECTION METHODS
  // ============================================
  
  private findClosestTarget(player: Player, enemies: Enemy[]): Enemy {
    let closest = enemies[0]
    let minDistance = this.calculateDistance(player.position, closest.position)
    
    for (const enemy of enemies) {
      const distance = this.calculateDistance(player.position, enemy.position)
      if (distance < minDistance) {
        minDistance = distance
        closest = enemy
      }
    }
    
    return closest
  }
  
  private findWeakestTarget(enemies: Enemy[]): Enemy {
    let weakest = enemies[0]
    let minHP = weakest.hp
    
    for (const enemy of enemies) {
      if (enemy.hp < minHP) {
        minHP = enemy.hp
        weakest = enemy
      }
    }
    
    return weakest
  }
  
  private findStrongestTarget(enemies: Enemy[]): Enemy {
    let strongest = enemies[0]
    let maxHP = strongest.hp
    
    for (const enemy of enemies) {
      if (enemy.hp > maxHP) {
        maxHP = enemy.hp
        strongest = enemy
      }
    }
    
    return strongest
  }
  
  private findMostDangerousTarget(player: Player, enemies: Enemy[]): Enemy {
    const threats = enemies.map(enemy => ({
      enemy,
      score: this.calculateThreatScore(player, enemy)
    }))
    
    // Sort by threat score (descending)
    threats.sort((a, b) => b.score - a.score)
    
    return threats[0].enemy
  }
  
  private findRandomTarget(enemies: Enemy[]): Enemy {
    return enemies[Math.floor(Math.random() * enemies.length)]
  }
  
  // ============================================
  // THREAT SCORING
  // ============================================
  
  private calculateThreatScore(player: Player, enemy: Enemy): number {
    let score = 0
    
    // Distance factor (closer = more dangerous)
    const distance = this.calculateDistance(player.position, enemy.position)
    score += (this.maxTargetDistance - distance) / this.maxTargetDistance * 100
    
    // Damage factor (higher damage = more dangerous)
    score += enemy.damage * 10
    
    // Speed factor (faster = more dangerous)
    score += enemy.speed * 50
    
    // HP factor (higher HP = more dangerous for boss)
    if (enemy.category === 'mini_boss') {
      score += enemy.hp
    }
    
    // Direction factor (moving toward player = more dangerous)
    const directionScore = this.calculateDirectionScore(player, enemy)
    score += directionScore * 20
    
    return score
  }
  
  private calculateDirectionScore(player: Player, enemy: Enemy): number {
    // Calculate vector from enemy to player
    const dx = player.position.x - enemy.position.x
    const dy = player.position.y - enemy.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return 1
    
    // Normalize vector
    const nx = dx / distance
    const ny = dy / distance
    
    // Calculate dot product with enemy velocity
    const dotProduct = nx * enemy.velocity.x + ny * enemy.velocity.y
    
    // If enemy is moving toward player (dot product > 0), it's more dangerous
    return Math.max(0, dotProduct)
  }
  
  // ============================================
  // DISTANCE CALCULATION
  // ============================================
  
  calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  calculateDistanceSquared(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return dx * dx + dy * dy
  }
  
  // ============================================
  // TARGET MANAGEMENT
  // ============================================
  
  private setTarget(target: Enemy | null): void {
    if (this.currentTarget !== target) {
      this.currentTarget = target
      this.onTargetChangedCallback?.(target)
    }
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  getTargetPosition(): Position | null {
    if (!this.currentTarget) return null
    return this.currentTarget.position
  }
  
  getTargetDistance(player: Player): number | null {
    if (!this.currentTarget) return null
    return this.calculateDistance(player.position, this.currentTarget.position)
  }
  
  getTargetDirection(player: Player): Vector | null {
    if (!this.currentTarget) return null
    
    const dx = this.currentTarget.position.x - player.position.x
    const dy = this.currentTarget.position.y - player.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return { x: 0, y: 0 }
    
    return {
      x: dx / distance,
      y: dy / distance,
    }
  }
  
  isTargetInRange(player: Player, maxRange: number): boolean {
    if (!this.currentTarget) return false
    return this.calculateDistance(player.position, this.currentTarget.position) <= maxRange
  }
  
  // ============================================
  // TARGETING VISUALIZATION
  // ============================================
  
  renderTargetIndicator(ctx: CanvasRenderingContext2D, player: Player): void {
    if (!this.currentTarget) return
    
    const target = this.currentTarget
    
    // Draw targeting reticle
    ctx.save()
    ctx.strokeStyle = '#FF0055'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(
      target.position.x,
      target.position.y,
      target.radius + 5,
      0,
      Math.PI * 2
    )
    ctx.stroke()
    ctx.restore()
    
    // Draw line from player to target
    ctx.save()
    ctx.strokeStyle = '#FF0055'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(player.position.x, player.position.y)
    ctx.lineTo(target.position.x, target.position.y)
    ctx.stroke()
    ctx.restore()
  }
}

export default AutoTargeting
