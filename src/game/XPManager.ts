/**
 * XP Manager for Swarm Protocol: Survivor
 * Phase 3: Game Design - Manages XP, leveling, and level-up cards
 */

import type { Upgrade, LevelUpCard } from '../types/game'
import { LEVEL_UP_CONFIG } from '../config/gameConstants'
import { upgrades } from '../db/seedData'

// ============================================
// XP MANAGER CLASS
// ============================================

export class XPManager {
  private xp: number = 0
  private level: number = 1
  private totalXPEarned: number = 0
  
  // Callbacks
  private onLevelUpCallback: ((level: number, cards: LevelUpCard[]) => void) | null = null
  private onXPGainedCallback: ((amount: number, total: number) => void) | null = null
  
  constructor() {
    this.xp = 0
    this.level = 1
    this.totalXPEarned = 0
  }
  
  // ============================================
  // PUBLIC METHODS
  // ============================================
  
  addXP(amount: number, source: string = 'unknown'): void {
    const oldLevel = this.level
    
    this.xp += amount
    this.totalXPEarned += amount
    
    // Trigger XP gained callback
    this.onXPGainedCallback?.(amount, this.totalXPEarned)
    
    console.log(`✨ +${amount} XP from ${source} (Total: ${this.totalXPEarned})`)
    
    // Check for level up
    while (this.xp >= LEVEL_UP_CONFIG.XP_TO_LEVEL && this.level < LEVEL_UP_CONFIG.MAX_LEVEL) {
      this.levelUp()
    }
    
    // Return true if leveled up
    return this.level > oldLevel
  }
  
  getLevel(): number {
    return this.level
  }
  
  getXP(): number {
    return this.xp
  }
  
  getTotalXP(): number {
    return this.totalXPEarned
  }
  
  getXPToNextLevel(): number {
    return LEVEL_UP_CONFIG.XP_TO_LEVEL - this.xp
  }
  
  getXPProgress(): number {
    return (this.xp / LEVEL_UP_CONFIG.XP_TO_LEVEL) * 100
  }
  
  isMaxLevel(): boolean {
    return this.level >= LEVEL_UP_CONFIG.MAX_LEVEL
  }
  
  reset(): void {
    this.xp = 0
    this.level = 1
    this.totalXPEarned = 0
  }
  
  // ============================================
  // CALLBACK REGISTRATION
  // ============================================
  
  onLevelUp(callback: (level: number, cards: LevelUpCard[]) => void): void {
    this.onLevelUpCallback = callback
  }
  
  onXPGained(callback: (amount: number, total: number) => void): void {
    this.onXPGainedCallback = callback
  }
  
  // ============================================
  // LEVEL UP SYSTEM
  // ============================================
  
  private levelUp(): void {
    this.level++
    this.xp -= LEVEL_UP_CONFIG.XP_TO_LEVEL
    
    console.log(`🎉 Level Up! Now level ${this.level}`)
    
    // Generate level up cards
    const cards = this.generateLevelUpCards()
    
    // Trigger level up callback
    this.onLevelUpCallback?.(this.level, cards)
  }
  
  generateLevelUpCards(): LevelUpCard[] {
    const availableUpgrades = this.getAvailableUpgrades()
    const cards: LevelUpCard[] = []
    
    // Select 3 random upgrades
    for (let i = 0; i < LEVEL_UP_CONFIG.LEVEL_UP_OPTIONS; i++) {
      const upgrade = this.selectRandomUpgrade(availableUpgrades)
      if (upgrade) {
        cards.push(this.createLevelUpCard(upgrade))
      }
    }
    
    return cards
  }
  
  private getAvailableUpgrades(): Upgrade[] {
    // For now, return all upgrades (in a real game, this would be filtered)
    return upgrades
  }
  
  private selectRandomUpgrade(availableUpgrades: Upgrade[]): Upgrade | null {
    if (availableUpgrades.length === 0) return null
    return availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)]
  }
  
  private createLevelUpCard(upgrade: Upgrade): LevelUpCard {
    return {
      id: `card_${upgrade.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      upgradeId: upgrade.id,
      name: upgrade.name,
      description: upgrade.function_desc,
      category: upgrade.category,
      damage: upgrade.damage,
      cooldown: upgrade.cooldown_s,
      color: this.getUpgradeColor(upgrade.category),
      icon: this.getUpgradeIcon(upgrade.category),
      isSelected: false,
      isHovered: false,
    }
  }
  
  private getUpgradeColor(category: string): string {
    const colors: Record<string, string> = {
      'Summon': '#00F0FF',
      'AoE Weapon': '#FF0055',
      'Projectile': '#FFD700',
      'Ranged': '#00FFFF',
      'Beam Weapon': '#00AAFF',
      'Cone Weapon': '#FF4400',
      'Heavy AoE': '#FF0000',
      'Utility': '#FFD700',
      'Passive': '#00FF00',
      'Defensive': '#00FFFF',
      'Melee Weapon': '#FFFFFF',
    }
    return colors[category] || '#FFFFFF'
  }
  
  private getUpgradeIcon(category: string): string {
    const icons: Record<string, string> = {
      'Summon': '🤖',
      'AoE Weapon': '💥',
      'Projectile': '🎯',
      'Ranged': '⚡',
      'Beam Weapon': '🔦',
      'Cone Weapon': '🔥',
      'Heavy AoE': '💣',
      'Utility': '🧲',
      'Passive': '🛡️',
      'Defensive': '🛡️',
      'Melee Weapon': '⚔️',
    }
    return icons[category] || '❓'
  }
  
  // ============================================
  // XP SOURCES
  // ============================================
  
  addEnemyKillXP(): void {
    this.addXP(LEVEL_UP_CONFIG.XP_PER_ENEMY_KILL, 'enemy kill')
  }
  
  addBossKillXP(): void {
    this.addXP(LEVEL_UP_CONFIG.XP_PER_BOSS_KILL, 'boss kill')
  }
  
  addWaveClearXP(): void {
    this.addXP(LEVEL_UP_CONFIG.XP_PER_WAVE, 'wave clear')
  }
  
  addSurvivalXP(deltaTime: number): void {
    const seconds = deltaTime / 1000
    const xp = seconds * LEVEL_UP_CONFIG.XP_PER_WAVE / 30 // Pro-rated for wave duration
    this.addXP(Math.floor(xp), 'survival')
  }
}

export default XPManager
