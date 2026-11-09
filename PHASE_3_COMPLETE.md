# Phase 3: Game Design - COMPLETE ✅

## Core Objective
Lock core loop & wave logic - Design the fundamental gameplay systems including waves, XP, leveling, targeting, and scoring.

## Status: ✅ COMPLETED

---

## 🎮 What Was Accomplished

### ✅ Core Game Loop Designed
Created comprehensive **`PHASE_3_GAME_DESIGN.md`** documenting:
- **Complete game loop**: Start → Wave Active → Breather → Level Up → Repeat
- **State machine**: 9 game states with transitions
- **Visual diagrams**: ASCII flowcharts of game systems
- **TypeScript code snippets**: Implementation examples for all systems

### ✅ Wave System Implemented
Created **`src/game/WaveManager.ts`** with:
- **Wave timing**: 30s active, 3s breather (33s total cycle)
- **Enemy spawning**: Dynamic spawn points around arena
- **Wave scaling**: Difficulty increases with wave number
- **Boss waves**: Every 5th wave spawns Aegis Commander Drone
- **Wave transitions**: Smooth state changes between phases
- **Event callbacks**: onWaveStart, onWaveComplete, onBossSpawn, onBreatherStart, onLevelUp

**Key Features:**
```typescript
// Wave configuration
const WAVE_DURATION = 30000 // 30 seconds
const BREATHER_DURATION = 3000 // 3 seconds
const BOSS_WAVE_INTERVAL = 5 // Every 5th wave

// Enemy spawn logic
spawnEnemy(enemyData: Enemy, position: Position)
spawnBoss(wave: number, position: Position)
```

### ✅ XP Curve & Level-Up System Implemented
Created **`src/game/XPManager.ts`** with:
- **XP sources**: Enemy kills (10), boss kills (100), wave clears (100), survival (1/sec)
- **XP to level**: 100 XP per level
- **Max level**: 10 levels per run
- **Level-up cards**: 3 random upgrades to choose from
- **Event callbacks**: onLevelUp, onXPGained

**Key Features:**
```typescript
// XP management
addXP(amount: number, source: string)
addEnemyKillXP()
addBossKillXP()
addWaveClearXP()

// Level up system
generateLevelUpCards(): LevelUpCard[]
getLevel(): number
getXPProgress(): number
```

### ✅ Auto-Targeting System Implemented
Created **`src/game/AutoTargeting.ts`** with:
- **Targeting modes**: Closest, Weakest, Strongest, Most Dangerous, Random
- **Max target distance**: 500px
- **Threat scoring**: Calculates danger based on distance, damage, speed, direction
- **Event callbacks**: onTargetChanged
- **Visual indicators**: Targeting reticle and line rendering

**Key Features:**
```typescript
// Targeting modes
setTargetingMode(mode: TargetingMode)
findTarget(player: Player, enemies: Enemy[])
updateTarget(player: Player, enemies: Enemy[])

// Threat calculation
calculateThreatScore(player: Player, enemy: Enemy): number
calculateDirectionScore(player: Player, enemy: Enemy): number
```

### ✅ Scoring System Implemented
Created **`src/game/ScoreManager.ts`** with:
- **Score formula**: `S = 10t + 25c` (Seconds × 10 + Coins × 25)
- **Score components**: Survival score + Coin score
- **Score tracking**: Time, coins, enemies defeated, damage-free streaks
- **Score bonuses**: Wave clear (+100), boss kill (+500)
- **Score ratings**: Beginner, Bronze, Silver, Gold, Platinum
- **Event callbacks**: onScoreChanged, onCoinCollected

**Key Features:**
```typescript
// Score calculation
calculateFinalScore(): number
getScoreBreakdown(): ScoreBreakdown

// Score updates
addCoins(amount: number)
addEnemyDefeated()
incrementDamageFreeWaveStreak()

// Score formatting
formatScore(score: number): string
formatTime(seconds: number): string
getScoreRating(score: number): string
```

### ✅ Boss Spawn System
- **Boss**: Aegis Commander Drone
- **Spawn interval**: Every 5th wave
- **Scaling**: HP, damage, and coin value scale with wave number
- **Announcement**: Visual and audio effects when boss spawns

---

## 📁 Files Created (5 files)

| File | Description | Lines | Status |
|------|-------------|-------|--------|
| `PHASE_3_GAME_DESIGN.md` | Complete game design specification | 1,000+ | ✅ |
| `src/game/WaveManager.ts` | Wave system implementation | 300+ | ✅ |
| `src/game/XPManager.ts` | XP and level-up system implementation | 200+ | ✅ |
| `src/game/AutoTargeting.ts` | Auto-targeting system implementation | 250+ | ✅ |
| `src/game/ScoreManager.ts` | Scoring system implementation | 250+ | ✅ |
| `src/game/index.ts` | Game systems export index | 20+ | ✅ |

---

## 📊 Game Systems Summary

### 1. Wave System
- **Duration**: 30s active + 3s breather = 33s total
- **Enemy Spawning**: Dynamic, scales with wave number
- **Boss Waves**: Every 5th wave (5, 10, 15, 20...)
- **Spawn Points**: Distributed around arena edges
- **Difficulty Scaling**: Enemy count, HP, damage, speed increase per wave

### 2. XP & Level-Up System
- **XP Sources**:
  - Enemy kill: +10 XP
  - Boss kill: +100 XP
  - Wave clear: +100 XP
  - Survival: +1 XP/second
- **Level Up**: Every 100 XP
- **Max Level**: 10
- **Level-Up Cards**: 3 random upgrades to choose from
- **Auto-Select**: Random selection after 30 seconds

### 3. Auto-Targeting System
- **Modes**: Closest, Weakest, Strongest, Most Dangerous, Random
- **Range**: 500px maximum
- **Threat Scoring**: Distance, damage, speed, direction
- **Visual Feedback**: Reticle and targeting line

### 4. Scoring System
- **Formula**: `Final Score = (Seconds Survived × 10) + (Coins Collected × 25)`
- **Components**:
  - Survival Score: Seconds × 10
  - Coin Score: Coins × 25
- **Bonuses**:
  - Wave clear: +100 coins equivalent
  - Boss kill: +500 coins equivalent
- **Ratings**:
  - Beginner: < 1,000
  - Bronze: 1,000-4,999
  - Silver: 5,000-9,999
  - Gold: 10,000-24,999
  - Platinum: 25,000+

---

## 🎯 Core Game Loop Visualization

```
START RUN
  ↓
SELECT LOADOUT (Hero + Upgrade)
  ↓
ENTER ARENA
  ↓
┌─────────────────────────────────────┐
│ WAVE 1 (30 seconds)                  │
│ ├─ Spawn Enemies                     │
│ ├─ Player Combat                    │
│ ├─ Collect Coins                    │
│ └─ Gain XP                          │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ WAVE BREATHER (3 seconds)            │
│ ├─ Safe Zone                         │
│ ├─ Collect Remaining Coins          │
│ └─ Prepare for Next Wave            │
└─────────────────────────────────────┘
  ↓
IF ALL ENEMIES DEFEATED:
  ↓
┌─────────────────────────────────────┐
│ LEVEL UP (30 seconds timeout)        │
│ ├─ Show 3 Random Upgrade Cards       │
│ ├─ Player Selects One                │
│ └─ Apply Upgrade                    │
└─────────────────────────────────────┘
  ↓
NEXT WAVE (Repeat)
  ↓
IF PLAYER HP = 0:
  ↓
GAME OVER
  ↓
SUBMIT SCORE
  ↓
RETURN TO MENU
```

---

## 📊 Balance Overview

### XP Economy
| Action | XP | Frequency | XP/Minute |
|--------|----|-----------|-----------|
| Kill Spore Zombie | 10 | ~20/min | 200 |
| Kill Chitin Bug | 10 | ~15/min | 150 |
| Kill Tech Drone | 10 | ~10/min | 100 |
| Kill Boss | 100 | ~2/min | 200 |
| Clear Wave | 100 | ~2/min | 200 |
| Survival | 1/sec | Continuous | 60 |
| **Total** | - | - | **~910 XP/min** |

**Time to Max Level (10):** ~1 minute

### Score Progression
| Time | Coins | Score | Rating |
|------|-------|-------|--------|
| 30s | 50 | 1,550 | Beginner |
| 1m | 100 | 3,100 | Novice |
| 2m | 250 | 7,250 | Intermediate |
| 5m | 500 | 15,500 | Advanced |
| 10m | 1,000 | 31,000 | Expert |
| 15m | 1,500 | 46,500 | Master |

---

## 🔗 Integration Guide

### Using the Game Systems

```typescript
import { WaveManager, XPManager, AutoTargeting, ScoreManager } from './game'

// Initialize game systems
const waveManager = new WaveManager(1280, 720)
const xpManager = new XPManager()
const autoTargeting = new AutoTargeting(500)
const scoreManager = new ScoreManager()

// Set up callbacks
waveManager.onWaveStart((wave) => {
  console.log(`Wave ${wave} started`)
})

waveManager.onWaveComplete((wave, allDefeated) => {
  if (allDefeated) {
    xpManager.addWaveClearXP()
    scoreManager.addWaveClearBonus()
  }
})

waveManager.onBossSpawn((wave) => {
  console.log(`Boss spawned in wave ${wave}`)
})

xpManager.onLevelUp((level, cards) => {
  console.log(`Level ${level}! Choose an upgrade:`)
  cards.forEach(card => console.log(`- ${card.name}`))
})

autoTargeting.onTargetChanged((target) => {
  console.log(`Targeting: ${target?.name || 'none'}`)
})

scoreManager.onScoreChanged((score, breakdown) => {
  console.log(`Score: ${score}`)
})

// Start the game
waveManager.start()
scoreManager.start()

// Game loop
gameLoop() {
  // Update systems
  waveManager.update()
  scoreManager.update()
  
  // Find target
  const target = autoTargeting.findTarget(player, enemies)
  
  // ... rest of game logic
}
```

---

## 📝 Key Design Decisions

### 1. Wave Duration (30s + 3s)
**Decision**: 30 seconds active, 3 seconds breather
**Rationale**: 
- 30s is long enough for meaningful combat
- 3s breather provides a brief respite without breaking flow
- 33s total cycle = ~1.8 waves per minute

### 2. XP to Level (100 XP)
**Decision**: 100 XP per level, max level 10
**Rationale**:
- Achievable in ~1 minute of gameplay
- Provides regular rewards without being too frequent
- 10 levels = good progression curve

### 3. Score Formula (S = 10t + 25c)
**Decision**: Simple linear formula with two components
**Rationale**:
- Easy to understand and calculate
- Rewards both survival and coin collection
- Scales well with gameplay length
- Allows for high scores in long runs

### 4. Auto-Targeting Default (Closest)
**Decision**: Closest targeting as default
**Rationale**:
- Most intuitive for players
- Matches typical game behavior
- Can be changed for different playstyles

### 5. Boss Spawn Interval (Every 5th Wave)
**Decision**: Boss every 5 waves
**Rationale**:
- Provides regular challenges
- Not too frequent (would be overwhelming)
- Not too rare (would feel missing)
- Creates natural progression milestones

---

## ✅ Deliverables Checklist

| Task | Status | File/Location |
|------|--------|---------------|
| Lock core loop | ✅ | PHASE_3_GAME_DESIGN.md |
| Design wave logic (30s active, 3s breather) | ✅ | WaveManager.ts |
| Design Wave 5 boss spawns | ✅ | WaveManager.ts, PHASE_3_GAME_DESIGN.md |
| Design XP curve | ✅ | XPManager.ts, PHASE_3_GAME_DESIGN.md |
| Design auto-targeting system | ✅ | AutoTargeting.ts, PHASE_3_GAME_DESIGN.md |
| Design score math (S = 10t + 25c) | ✅ | ScoreManager.ts, PHASE_3_GAME_DESIGN.md |
| Create implementation code | ✅ | src/game/*.ts |
| Document all systems | ✅ | PHASE_3_GAME_DESIGN.md |
| Export all systems | ✅ | src/game/index.ts |

---

## 🎯 Next Phase

**Phase 4: App Design**
- Wireframe 6 web views (HQ, Play, Codex, Armory, Leaderboards, Profile)
- Lock 10 custom web features
- Design UI/UX for all views
- Create navigation flow

---

## 📝 Git Information

- **Branch**: `phase/3-game-design`
- **Status**: Ready for merge into main
- **Files Added**: 6 new files
- **Files Modified**: 0
- **Total Changes**: 6 files, ~2,400+ lines added

---

**Phase 3 Complete** ✅

All core gameplay systems have been designed and implemented:
- ✅ Wave System (30s active, 3s breather)
- ✅ XP Curve & Level-Up System
- ✅ Auto-Targeting System
- ✅ Scoring System (S = 10t + 25c)
- ✅ Boss Spawn System (every 5th wave)

The game design is locked and ready for Phase 4: App Design!
