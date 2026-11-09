# Phase 3: Game Design Specification - SWARM PROTOCOL: SURVIVOR

## Core Objective
Lock core loop & wave logic - Design the fundamental gameplay systems including waves, XP, leveling, targeting, and scoring.

## Status: ✅ IN PROGRESS

---

## 🎮 Core Game Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SWARM PROTOCOL CORE LOOP                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │   START     │───▶│   WAVE     │───▶│  BREATHER   │────┐          │
│  │   RUN       │    │  ACTIVE    │    │  WINDOW     │    │          │
│  └─────────────┘    └─────────────┘    └─────────────┘    │          │
│          ▲                  │                  ▲            │          │
│          │                  │                  │            │          │
│          │                  ▼                  │            │          │
│          │         ┌─────────────┐          │            │          │
│          │         │  COMBAT    │◀─────────┘            │          │
│          │         │  PHASE     │                         │          │
│          │         └─────────────┘                         │          │
│          │                  │                                  │          │
│          │                  ▼                                  │          │
│          │         ┌─────────────┐                         │          │
│          │         │  ENEMY     │                         │          │
│          │         │  DEATH     │─────────────────────────┘          │
│          │         └─────────────┘                                 │
│          │                  │                                      │
│          │                  ▼                                      │
│          │         ┌─────────────┐    ┌─────────────┐          │
│          │         │  COIN      │───▶│   COLLECT   │          │
│          │         │  DROP      │    └─────────────┘          │
│          │         └─────────────┘                              │
│          │                                                  │
│          └──────────────────────────────────────────────────┘          │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ WAVE CLEAR  │───▶│ LEVEL UP    │───▶│ SELECT      │              │
│  │ CONDITION   │    │  CARD       │    │ UPGRADE     │              │
│  └─────────────┘    └─────────────┘    └─────────────┘              │
│          │                                                      │
│          ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WAVE LOGIC CONTINUES                       │   │
│  │              (Loop until player death)                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    GAME OVER CONDITION                        │   │
│  │              (Player HP reaches 0)                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⏱️ Wave System Design

### Wave Structure

**Core Design:**
- **Active Wave**: 30 seconds of enemy spawning and combat
- **Breather Window**: 3 seconds of safety (no enemy spawns, safe coin collection)
- **Total Cycle**: 33 seconds per wave

```typescript
// Wave timing constants
const WAVE_DURATION = 30000 // 30 seconds in milliseconds
const BREATHER_DURATION = 3000 // 3 seconds in milliseconds
const TOTAL_CYCLE_DURATION = WAVE_DURATION + BREATHER_DURATION // 33 seconds
```

### Wave State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                        WAVE STATE MACHINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   IDLE      │───▶│   ACTIVE    │───▶│  BREATHER    │────┐    │
│  │  (Pre-wave) │    │ (Spawning)  │    │ (Safe Zone) │    │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │    │
│          ▲                                                  │    │
│          │                                                  │    │
│          └──────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    WAVE TRANSITIONS                            │ │
│  │  IDLE -> ACTIVE: Wave starts, enemies begin spawning          │ │
│  │  ACTIVE -> BREATHER: All enemies defeated OR time expires     │ │
│  │  BREATHER -> ACTIVE: Next wave begins                          │ │
│  │  BREATHER -> LEVEL_UP: If wave is clear, show level up cards   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Wave Progression Logic

```typescript
class WaveManager {
  private currentWave: number = 0
  private waveStartTime: number = 0
  private isActive: boolean = false
  private isBreather: boolean = false
  
  update(deltaTime: number): void {
    const elapsedTime = Date.now() - this.waveStartTime
    
    if (this.isActive) {
      // Active wave phase
      if (elapsedTime >= WAVE_DURATION) {
        // Time expired, transition to breather
        this.transitionToBreather()
      } else if (this.allEnemiesDefeated()) {
        // All enemies dead, transition to breather early
        this.transitionToBreather()
      }
    } else if (this.isBreather) {
      // Breather phase
      if (elapsedTime >= WAVE_DURATION + BREATHER_DURATION) {
        // Breather complete, start next wave
        this.startNextWave()
      }
    }
  }
  
  private transitionToBreather(): void {
    this.isActive = false
    this.isBreather = true
    this.waveStartTime = Date.now()
    
    // Trigger level up if wave was cleared
    if (this.allEnemiesDefeated()) {
      this.triggerLevelUp()
    }
  }
  
  private startNextWave(): void {
    this.currentWave++
    this.isActive = true
    this.isBreather = false
    this.waveStartTime = Date.now()
    
    // Spawn enemies for new wave
    this.spawnWaveEnemies()
    
    // Check for boss wave
    if (this.isBossWave()) {
      this.spawnBoss()
    }
  }
  
  private isBossWave(): boolean {
    return this.currentWave % 5 === 0
  }
}
```

### Enemy Spawning Logic

```typescript
class EnemySpawner {
  private spawnInterval: number = 1000 // 1 second between spawns
  private lastSpawnTime: number = 0
  private spawnPoints: Position[] = [] // Around the arena
  
  spawnWaveEnemies(wave: number): void {
    const waveConfig = this.getWaveConfig(wave)
    const enemyTypes = this.getSpawnableEnemies(wave)
    
    // Spawn enemies over the wave duration
    const spawnCount = waveConfig.enemyCount
    const spawnDelay = WAVE_DURATION / spawnCount
    
    for (let i = 0; i < spawnCount; i++) {
      setTimeout(() => {
        const enemyType = this.selectRandomEnemy(enemyTypes)
        const spawnPoint = this.selectRandomSpawnPoint()
        this.spawnEnemy(enemyType, spawnPoint)
      }, i * spawnDelay)
    }
  }
  
  private getWaveConfig(wave: number): WaveConfig {
    // Scale difficulty with wave number
    const baseCount = 10
    const scaling = 0.5
    const enemyCount = Math.floor(baseCount + wave * scaling)
    
    return {
      wave: wave,
      enemyCount: enemyCount,
      spawnRate: 1.0 + wave * 0.05, // Faster spawns at higher waves
      difficulty: wave,
    }
  }
  
  private getSpawnableEnemies(wave: number): EnemyType[] {
    // Filter enemies by minimum wave requirement
    return enemies.filter(e => e.minWave <= wave)
  }
  
  private isBossWave(wave: number): boolean {
    return wave % 5 === 0
  }
  
  spawnBoss(wave: number): void {
    const boss = enemies.find(e => e.category === 'Mini-Boss')
    if (boss) {
      this.spawnEnemy(boss.id, this.getCenterPosition())
    }
  }
}
```

---

## 📈 XP Curve & Level-Up System

### XP System Design

**Core Formula:**
```typescript
// XP gained from various actions
const XP_SOURCES = {
  ENEMY_KILL: 10,      // Base XP per enemy kill
  BOSS_KILL: 100,      // Bonus XP for boss kills
  WAVE_CLEAR: 100,     // Bonus XP for clearing a wave
  SURVIVAL: 1,         // XP per second survived
  COIN_COLLECT: 0,     // No XP from coins (they're for score)
}

// XP required to level up
const XP_TO_LEVEL = 100

// Maximum player level per run
const MAX_LEVEL = 10
```

### XP Calculation

```typescript
class XPManager {
  private xp: number = 0
  private level: number = 1
  
  addXP(amount: number): void {
    this.xp += amount
    
    // Check for level up
    while (this.xp >= XP_TO_LEVEL && this.level < MAX_LEVEL) {
      this.levelUp()
    }
  }
  
  private levelUp(): void {
    this.level++
    this.xp -= XP_TO_LEVEL
    
    // Trigger level up card selection
    this.showLevelUpCards()
  }
  
  getLevel(): number {
    return this.level
  }
  
  getXP(): number {
    return this.xp
  }
  
  getXPProgress(): number {
    return (this.xp / XP_TO_LEVEL) * 100
  }
}
```

### Level-Up Card System

**Design:**
- **Cards Shown**: 3 random upgrades
- **Selection Time**: 30 seconds (configurable)
- **Auto-Select**: If timeout, randomly select one
- **Upgrade Application**: Selected upgrade is added to player's loadout

```typescript
class LevelUpSystem {
  private cards: LevelUpCard[] = []
  private selectedCard: LevelUpCard | null = null
  private selectionTimeout: number = 30000 // 30 seconds
  private timeoutHandle: NodeJS.Timeout | null = null
  
  showLevelUpCards(availableUpgrades: Upgrade[]): void {
    // Filter upgrades that player doesn't already have
    const eligibleUpgrades = availableUpgrades.filter(u => 
      !this.playerHasUpgrade(u.id)
    )
    
    // Select 3 random upgrades
    this.cards = this.selectRandomCards(eligibleUpgrades, 3)
    
    // Start timeout
    this.startSelectionTimeout()
  }
  
  selectCard(card: LevelUpCard): void {
    this.selectedCard = card
    this.clearTimeout()
    this.applyUpgrade(card.upgradeId)
    this.hideLevelUpCards()
  }
  
  private startSelectionTimeout(): void {
    this.timeoutHandle = setTimeout(() => {
      // Auto-select a random card
      const randomCard = this.cards[Math.floor(Math.random() * this.cards.length)]
      this.selectCard(randomCard)
    }, this.selectionTimeout)
  }
  
  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = null
    }
  }
  
  private applyUpgrade(upgradeId: string): void {
    // Add upgrade to player's loadout
    this.player.addUpgrade(upgradeId)
    
    // Apply immediate effects if applicable
    const upgrade = this.getUpgrade(upgradeId)
    if (upgrade.special === 'passive') {
      this.applyPassiveEffect(upgrade)
    }
  }
}
```

### XP Curve Visualization

```
Level 1:   0 XP    ████████████████████ 0%
Level 2: 100 XP    ████████████████████ 100%
Level 3: 200 XP    ████████████████████ 100%
Level 4: 300 XP    █████████████████████ 100%
...
Level 10: 900 XP   █████████████████████ 100%

Total XP needed to reach max level: 900 XP
```

### XP Sources Breakdown

| Action | XP | Frequency | XP/Minute |
|--------|----|-----------|-----------|
| Kill Spore Zombie | 10 | ~20/min | 200 |
| Kill Chitin Bug | 10 | ~15/min | 150 |
| Kill Tech Drone | 10 | ~10/min | 100 |
| Kill Boss | 100 | ~2/min (every 5 waves) | 200 |
| Clear Wave | 100 | ~2/min | 200 |
| Survival | 1/sec | Continuous | 60 |
| **Total** | - | - | **~910 XP/min** |

**Note:** At this rate, players can reach max level (10) in approximately 1 minute of gameplay.

---

## 🎯 Auto-Targeting System

### Design Philosophy

**Core Principles:**
1. **Smart but Simple**: Auto-targeting should feel intelligent without being complex
2. **Player Control**: Players should always feel in control
3. **Fair Priority**: Targeting should prioritize threats appropriately
4. **Visual Feedback**: Players should see what's being targeted

### Targeting Logic

```typescript
class AutoTargetingSystem {
  private targetingMode: TargetingMode = 'closest'
  private maxTargetDistance: number = 500 // pixels
  
  findTarget(player: Player, enemies: Enemy[]): Enemy | null {
    // Filter enemies within range
    const enemiesInRange = enemies.filter(e => 
      this.calculateDistance(player.position, e.position) <= this.maxTargetDistance
    )
    
    if (enemiesInRange.length === 0) {
      return null
    }
    
    // Select target based on mode
    switch (this.targetingMode) {
      case 'closest':
        return this.findClosestTarget(player, enemiesInRange)
      case 'weakest':
        return this.findWeakestTarget(enemiesInRange)
      case 'strongest':
        return this.findStrongestTarget(enemiesInRange)
      case 'most_dangerous':
        return this.findMostDangerousTarget(player, enemiesInRange)
      case 'random':
        return this.findRandomTarget(enemiesInRange)
      default:
        return this.findClosestTarget(player, enemiesInRange)
    }
  }
  
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
    // Calculate threat score for each enemy
    const threats = enemies.map(enemy => ({
      enemy,
      score: this.calculateThreatScore(player, enemy)
    }))
    
    // Sort by threat score (descending)
    threats.sort((a, b) => b.score - a.score)
    
    return threats[0].enemy
  }
  
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
    if (enemy.category === 'Mini-Boss') {
      score += enemy.hp
    }
    
    return score
  }
  
  private findRandomTarget(enemies: Enemy[]): Enemy {
    return enemies[Math.floor(Math.random() * enemies.length)]
  }
  
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return Math.sqrt(dx * dx + dy * dy)
  }
}
```

### Targeting Modes

| Mode | Description | Best For |
|------|-------------|----------|
| Closest | Target nearest enemy | General purpose, most intuitive |
| Weakest | Target enemy with lowest HP | Finishing off enemies quickly |
| Strongest | Target enemy with highest HP | Taking down tanks first |
| Most Dangerous | Target based on threat score | Smart targeting, contextual |
| Random | Target random enemy | Chaos mode, unpredictable |

### Visual Targeting Feedback

```typescript
class TargetIndicator {
  private target: Enemy | null = null
  private indicator: HTMLDivElement
  
  setTarget(enemy: Enemy | null): void {
    this.target = enemy
    this.updateIndicator()
  }
  
  private updateIndicator(): void {
    if (!this.target) {
      this.indicator.style.display = 'none'
      return
    }
    
    // Position indicator above target
    this.indicator.style.left = `${this.target.position.x}px`
    this.indicator.style.top = `${this.target.position.y - 20}px`
    this.indicator.style.display = 'block'
    
    // Update indicator based on enemy type
    this.indicator.className = `target-indicator ${this.target.category.toLowerCase()}`
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.target) return
    
    // Draw targeting reticle
    ctx.save()
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(
      this.target.position.x,
      this.target.position.y,
      this.target.radius + 5,
      0,
      Math.PI * 2
    )
    ctx.stroke()
    ctx.restore()
    
    // Draw line from player to target
    ctx.save()
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(player.position.x, player.position.y)
    ctx.lineTo(this.target.position.x, this.target.position.y)
    ctx.stroke()
    ctx.restore()
  }
}
```

---

## 🏆 Scoring System

### Score Formula

**Official Formula:**
```
Final Score = (Seconds Survived × 10) + (Coins Collected × 25)
```

**TypeScript Implementation:**
```typescript
class ScoreManager {
  private survivalSeconds: number = 0
  private coinsCollected: number = 0
  
  update(deltaTime: number): void {
    this.survivalSeconds += deltaTime / 1000 // Convert ms to seconds
  }
  
  addCoins(amount: number): void {
    this.coinsCollected += amount
  }
  
  calculateFinalScore(): number {
    const survivalScore = Math.floor(this.survivalSeconds * 10)
    const coinScore = this.coinsCollected * 25
    return survivalScore + coinScore
  }
  
  getScoreBreakdown(): ScoreBreakdown {
    return {
      survivalScore: Math.floor(this.survivalSeconds * 10),
      coinScore: this.coinsCollected * 25,
      totalScore: this.calculateFinalScore(),
      survivalSeconds: this.survivalSeconds,
      coinsCollected: this.coinsCollected,
    }
  }
}

interface ScoreBreakdown {
  survivalScore: number
  coinScore: number
  totalScore: number
  survivalSeconds: number
  coinsCollected: number
}
```

### Score Examples

| Survival Time | Coins | Calculation | Final Score | Rating |
|---------------|-------|-------------|-------------|--------|
| 30 seconds | 50 | (30 × 10) + (50 × 25) | 1,550 | Beginner |
| 1 minute | 100 | (60 × 10) + (100 × 25) | 3,100 | Novice |
| 2 minutes | 250 | (120 × 10) + (250 × 25) | 7,250 | Intermediate |
| 5 minutes | 500 | (300 × 10) + (500 × 25) | 15,500 | Advanced |
| 10 minutes | 1,000 | (600 × 10) + (1000 × 25) | 31,000 | Expert |
| 15 minutes | 1,500 | (900 × 10) + (1500 × 25) | 46,500 | Master |

### Score Components

**1. Survival Score**
- **Formula**: `Seconds Survived × 10`
- **Purpose**: Rewards players for lasting longer
- **Max Potential**: Unlimited (theoretical)
- **Typical Range**: 0 - 10,000+ (for 15+ minute runs)

**2. Coin Score**
- **Formula**: `Coins Collected × 25`
- **Purpose**: Rewards players for collecting coins
- **Max Potential**: Limited by coin drops and collection
- **Typical Range**: 0 - 25,000+ (for 1,000+ coins)

### Score Submission

```typescript
class ScoreSubmission {
  async submitScore(scoreData: ScoreData): Promise<void> {
    // Calculate final score
    const finalScore = scoreData.survivalSeconds * 10 + scoreData.coinsCollected * 25
    
    // Prepare score record
    const scoreRecord = {
      user_id: scoreData.userId || null,
      player_name: scoreData.playerName || 'Guest Operative',
      final_score: finalScore,
      survival_seconds: scoreData.survivalSeconds,
      coins_collected: scoreData.coinsCollected,
      enemies_defeated: scoreData.enemiesDefeated,
      damage_free_wave_streak: scoreData.damageFreeWaveStreak,
      hero_used: scoreData.heroId,
    }
    
    // Submit to Supabase
    const { error } = await supabase
      .from('scores')
      .insert(scoreRecord)
    
    if (error) {
      console.error('Error submitting score:', error)
      throw error
    }
    
    // Update player stats if authenticated
    if (scoreData.userId) {
      await this.updatePlayerStats(scoreData)
    }
  }
  
  private async updatePlayerStats(scoreData: ScoreData): Promise<void> {
    // Get current stats
    const { data: currentStats, error: fetchError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', scoreData.userId!)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = No rows found, which is expected for new users
      console.error('Error fetching player stats:', fetchError)
      return
    }
    
    // Calculate new stats
    const newStats = {
      user_id: scoreData.userId!,
      total_enemies_defeated: (
        currentStats?.total_enemies_defeated || 0
      ) + scoreData.enemiesDefeated,
      total_coins_collected: (
        currentStats?.total_coins_collected || 0
      ) + scoreData.coinsCollected,
      longest_damage_free_wave_streak: Math.max(
        currentStats?.longest_damage_free_wave_streak || 0,
        scoreData.damageFreeWaveStreak
      ),
      updated_at: new Date().toISOString(),
    }
    
    // Upsert stats
    const { error: upsertError } = await supabase
      .from('player_stats')
      .upsert(newStats)
    
    if (upsertError) {
      console.error('Error updating player stats:', upsertError)
    }
  }
}
```

---

## 🎮 Boss Spawn System

### Boss Design (Aegis Commander Drone)

**Stats:**
- **HP**: 240 (6× Spore Zombie)
- **Speed**: 0.60× (slower than most enemies)
- **Damage**: 30 (3× Spore Zombie)
- **Coin Value**: 50 (5× Spore Zombie)
- **Size**: XLarge (bigger than normal enemies)

**Special Abilities:**
1. **Radial Bullet Burst**: Fires bullets in all directions
2. **Aimed Laser Volley**: Fires targeted lasers at player
3. **High HP**: Requires sustained damage to defeat

### Boss Spawn Logic

```typescript
class BossSpawnSystem {
  private bossInterval: number = 5 // Every 5th wave
  
  shouldSpawnBoss(wave: number): boolean {
    return wave % this.bossInterval === 0
  }
  
  spawnBoss(wave: number, position: Position): Enemy {
    const boss = enemies.find(e => e.category === 'Mini-Boss')
    
    if (!boss) {
      throw new Error('No boss enemy defined')
    }
    
    // Scale boss stats with wave number
    const scaledBoss = this.scaleBossStats(boss, wave)
    
    return {
      ...scaledBoss,
      position: position,
      id: `boss_${wave}_${Date.now()}`,
    }
  }
  
  private scaleBossStats(boss: Enemy, wave: number): Enemy {
    // Boss HP scales with wave
    const hpScale = 1 + (wave / 10)
    const scaledHp = Math.floor(boss.hp * hpScale)
    
    // Boss damage scales with wave
    const damageScale = 1 + (wave / 20)
    const scaledDamage = Math.floor(boss.damage * damageScale)
    
    // Boss coin value scales with wave
    const coinScale = 1 + (wave / 10)
    const scaledCoins = Math.floor(boss.coin_value * coinScale)
    
    return {
      ...boss,
      hp: scaledHp,
      damage: scaledDamage,
      coin_value: scaledCoins,
    }
  }
}
```

### Boss Wave Announcement

```typescript
class BossAnnouncement {
  private announcementDuration: number = 3000 // 3 seconds
  
  announceBossWave(wave: number): void {
    // Show announcement on screen
    this.showAnnouncement(`BOSS WAVE ${wave}!`)
    
    // Play sound effect
    this.playSound('sfx_boss_spawn')
    
    // Screen shake effect
    this.screenShake(10, 500) // 10px intensity, 500ms duration
    
    // Freeze game briefly
    this.freezeGame(1000) // 1 second freeze
  }
  
  private showAnnouncement(message: string): void {
    const announcement = document.createElement('div')
    announcement.className = 'boss-announcement'
    announcement.textContent = message
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      announcement.remove()
    }, this.announcementDuration)
  }
}
```

---

## 🎯 Game State Machine

### Complete State Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE GAME STATE MACHINE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │    MENU     │    │  LOADOUT     │    │    PLAY     │         │
│  │ (Main Menu) │───▶│ SELECTION    │───▶│ (Gameplay)  │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│          ▲                                     │              │
│          │                                     │              │
│          │              ┌──────────────────────▼──────────────┐   │
│          │              │               PLAY STATES             │   │
│          │              ├─────────────┬─────────────┬─────────┤   │
│          │              │   ACTIVE    │  BREATHER   │ LEVEL UP │   │
│          │              │ (Spawning)  │ (Safe Zone) │ (Pause)  │   │
│          │              └──────┬──────┘──────┬──────┘────┬────┘   │
│          │                     │              │           │          │
│          │                     │              │           │          │
│          │              ┌──────▼──────┐      │           │          │
│          │              │ GAME OVER   │◀─────┘           │          │
│          │              │ (Death)     │                    │          │
│          │              └──────┬──────┘                    │          │
│          │                     │                         │          │
│          │              ┌──────▼──────┐                    │          │
│          │              │   SCORE     │◀───────────────────┘          │
│          │              │ SUBMISSION  │                              │
│          │              └─────────────┘                              │
│          │                                                        │
│          └────────────────────────────────────────────────────────┘  │
│                                                                     │
│  TRANSITIONS:                                                        │
│  - MENU -> LOADOUT_SELECT: Player clicks "Play"                      │
│  - LOADOUT_SELECT -> PLAY: Player selects loadout                    │
│  - PLAY -> ACTIVE: Game starts                                      │
│  - ACTIVE -> BREATHER: Wave complete or time expires                │
│  - BREATHER -> LEVEL_UP: Wave cleared, show cards                     │
│  - LEVEL_UP -> ACTIVE: Player selects upgrade                        │
│  - ACTIVE/BREATHER/LEVEL_UP -> GAME_OVER: Player HP = 0              │
│  - GAME_OVER -> SCORE_SUBMISSION: Submit score to database           │
│  - SCORE_SUBMISSION -> MENU: Return to main menu                     │
│  - Any -> PAUSED: Player presses pause                               │
│  - PAUSED -> Previous: Player presses resume                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### State Implementation

```typescript
type GameState = 
  | 'MENU'
  | 'LOADOUT_SELECT'
  | 'PLAY'
  | 'WAVE_ACTIVE'
  | 'WAVE_BREATHER'
  | 'LEVEL_UP'
  | 'GAME_OVER'
  | 'SCORE_SUBMISSION'
  | 'PAUSED'

class GameStateManager {
  private currentState: GameState = 'MENU'
  private previousState: GameState | null = null
  private stateStack: GameState[] = []
  
  transitionTo(newState: GameState): void {
    // Push current state to stack if not already there
    if (this.currentState !== newState) {
      this.stateStack.push(this.currentState)
      this.previousState = this.currentState
      this.currentState = newState
      
      // Handle state entry
      this.handleStateEntry(newState)
      
      // Log transition
      console.log(`State transition: ${this.previousState} -> ${newState}`)
    }
  }
  
  goBack(): void {
    if (this.stateStack.length > 0) {
      const previousState = this.stateStack.pop()!
      this.currentState = previousState
      this.handleStateEntry(previousState)
    }
  }
  
  private handleStateEntry(state: GameState): void {
    switch (state) {
      case 'MENU':
        this.handleMenuEntry()
        break
      case 'LOADOUT_SELECT':
        this.handleLoadoutSelectEntry()
        break
      case 'PLAY':
        this.handlePlayEntry()
        break
      case 'WAVE_ACTIVE':
        this.handleWaveActiveEntry()
        break
      case 'WAVE_BREATHER':
        this.handleWaveBreatherEntry()
        break
      case 'LEVEL_UP':
        this.handleLevelUpEntry()
        break
      case 'GAME_OVER':
        this.handleGameOverEntry()
        break
      case 'SCORE_SUBMISSION':
        this.handleScoreSubmissionEntry()
        break
      case 'PAUSED':
        this.handlePausedEntry()
        break
    }
  }
  
  // ... state handlers
}
```

---

## 📊 Game Constants Summary

### Wave System
- **Wave Duration**: 30,000ms (30 seconds)
- **Breather Duration**: 3,000ms (3 seconds)
- **Total Cycle**: 33,000ms (33 seconds)
- **Boss Interval**: 5 waves

### XP System
- **XP per Enemy Kill**: 10
- **XP per Boss Kill**: 100
- **XP per Wave Clear**: 100
- **XP per Second**: 1
- **XP to Level Up**: 100
- **Max Level**: 10

### Scoring System
- **Survival Multiplier**: 10
- **Coin Multiplier**: 25
- **Score Formula**: `(seconds * 10) + (coins * 25)`

### Auto-Targeting
- **Max Target Distance**: 500px
- **Default Mode**: Closest
- **Targeting Modes**: Closest, Weakest, Strongest, Most Dangerous, Random

---

## 🎯 Phase 3 Deliverables Checklist

| Task | Status | File/Location |
|------|--------|---------------|
| Lock core loop | ✅ | PHASE_3_GAME_DESIGN.md |
| Design wave logic (30s active, 3s breather) | ✅ | PHASE_3_GAME_DESIGN.md |
| Design Wave 5 boss spawns | ✅ | PHASE_3_GAME_DESIGN.md |
| Design XP curve | ✅ | PHASE_3_GAME_DESIGN.md |
| Design auto-targeting system | ✅ | PHASE_3_GAME_DESIGN.md |
| Design score math ($S = 10t + 25c$) | ✅ | PHASE_3_GAME_DESIGN.md |
| Create implementation code snippets | ✅ | PHASE_3_GAME_DESIGN.md |
| Create state machine documentation | ✅ | PHASE_3_GAME_DESIGN.md |

---

## 🚀 Next Steps

### Phase 4: App Design
- Wireframe 6 web views (HQ, Play, Codex, Armory, Leaderboards, Profile)
- Lock 10 custom web features
- Design UI/UX for all views
- Create navigation flow

---

**Phase 3 Game Design In Progress** 🎮

Core gameplay systems have been designed including wave logic, XP curve, level-up system, auto-targeting, and scoring. Implementation code snippets are provided for all systems.
