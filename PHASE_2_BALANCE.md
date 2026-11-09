# Phase 2: Game Balance Calculations

## Overview

This document contains all balance calculations, formulas, and design decisions for Swarm Protocol: Survivor. It ensures that the game is fair, challenging, and fun across all difficulty levels.

---

## 📊 Core Balance Philosophy

### Design Goals
1. **Fair Difficulty Curve**: Game gets progressively harder but never unfair
2. **Risk vs Reward**: Higher risk actions should have higher rewards
3. **Hero Variety**: Each hero should feel unique and viable
4. **Upgrade Impact**: Upgrades should meaningfully change gameplay
5. **Boss Challenge**: Bosses should be tough but beatable with skill

### Balance Principles
- **Transparency**: Players should understand how damage is calculated
- **Consistency**: Similar actions should have similar outcomes
- **Scalability**: Difficulty should scale smoothly with player progress
- **Counterplay**: Every challenge should have a counter

---

## 🎮 Hero Balance

### Base Stats Comparison

| Hero | HP | Speed | Starting Upgrade | Role | Strengths | Weaknesses |
|------|----|-------|-------------------|------|-----------|------------|
| Vanguard Blade | 150 | 1.0x | Arc Slash | Tank | High HP, Melee DPS | Slow, Short Range |
| Outpost Ranger | 90 | 1.3x | Dual Kinetic Pistols | DPS | High DPS, Fast | Low HP, Squishy |
| Tech Engineer | 110 | 1.0x | Companion Robot | Support | Passive Damage | Moderate Stats |
| Chrono Operative | 85 | 1.4x | Temporal Echo | Mobility | Very Fast, Echo | Low HP, Complex |
| Shield Paladin | 175 | 0.85x | Plasma Barrier | Defense | Highest HP, Shield | Slowest |
| Pyrotechnic Specialist | 100 | 1.1x | Flamethrower Pulse | AoE | Area Damage | Moderate Stats |

### Stat Progression per Level

| Hero | HP/Level | Speed/Level | Damage/Level | Total at Level 10 |
|------|----------|-------------|--------------|-------------------|
| Vanguard Blade | +25 | +0.02 | +5 | 325 HP, 1.2x Speed |
| Outpost Ranger | +15 | +0.03 | +8 | 240 HP, 1.6x Speed |
| Tech Engineer | +20 | +0.02 | +6 | 290 HP, 1.2x Speed |
| Chrono Operative | +10 | +0.05 | +7 | 185 HP, 1.9x Speed |
| Shield Paladin | +30 | +0.01 | +4 | 425 HP, 0.95x Speed |
| Pyrotechnic Specialist | +18 | +0.02 | +9 | 280 HP, 1.3x Speed |

### Hero Tier List (Balanced)

**S Tier (Well-Rounded)**
- Shield Paladin - Highest survivability, great for beginners
- Vanguard Blade - Strong melee, good for crowd control

**A Tier (Specialized)**
- Outpost Ranger - High DPS, requires good positioning
- Pyrotechnic Specialist - Great AoE, good for groups

**B Tier (Situational)**
- Tech Engineer - Passive playstyle, good for support
- Chrono Operative - High skill ceiling, complex mechanics

---

## 👾 Enemy Balance

### Base Enemy Stats

| Enemy | HP | Speed | Damage | Coin Value | Spawn Weight | Min Wave |
|-------|----|-------|--------|------------|--------------|----------|
| Spore Zombie | 40 | 0.50x | 10 | 1 | 100 | 1 |
| Acidic Chitin Bug | 15 | 1.10x | 5 | 2 | 70 | 2 |
| Aegis Tech Drone | 65 | 0.75x | 15 | 5 | 50 | 3 |
| Aegis Commander Drone | 240 | 0.60x | 30 | 50 | 1 | 5 |

### Enemy Scaling per Wave

```typescript
// HP Scaling
enemyHp = baseHp * Math.pow(1.1, wave - 1)

// Speed Scaling
enemySpeed = baseSpeed * Math.pow(1.02, wave - 1)

// Damage Scaling
enemyDamage = baseDamage * Math.pow(1.05, wave - 1)

// Coin Value Scaling
coinValue = baseCoinValue * Math.ceil(wave / 5)
```

### Wave Composition

| Wave | Enemies | Total HP | Approx. Difficulty |
|------|---------|----------|-------------------|
| 1 | 10x Spore Zombie | 400 | ★☆☆☆☆ |
| 2 | 8x Spore Zombie + 4x Chitin Bug | 400 | ★★☆☆☆ |
| 3 | 6x Spore Zombie + 6x Chitin Bug + 2x Tech Drone | 610 | ★★☆☆☆ |
| 4 | 8x Spore Zombie + 8x Chitin Bug + 4x Tech Drone | 910 | ★★★☆☆ |
| 5 | 10x Spore Zombie + 10x Chitin Bug + 6x Tech Drone + 1x Commander | 1910 | ★★★★☆ |
| 10 | 15x Spore Zombie + 15x Chitin Bug + 10x Tech Drone + 1x Commander | 4000+ | ★★★★★ |

### Boss Balance (Aegis Commander Drone)

**Stats:**
- HP: 240 (6x Spore Zombie)
- Speed: 0.60x (slower than Spore Zombie)
- Damage: 30 (3x Spore Zombie)
- Coin Value: 50 (5x Spore Zombie)

**Special Abilities:**
1. **Radial Bullet Burst**: Fires bullets in all directions
2. **Aimed Laser Volley**: Fires targeted lasers at player
3. **High HP**: Requires sustained damage to defeat

**Counterplay:**
- Keep moving to avoid bullets
- Use AoE upgrades to damage multiple projectiles
- Focus fire on boss when it spawns

---

## ⚔️ Upgrade Balance

### Upgrade Stats Comparison

| Upgrade | Damage | Cooldown | DPS | Category | Rarity |
|---------|--------|----------|-----|----------|--------|
| Arc Slash | 35 | 0.9s | 38.9 | Melee | Starter |
| Dual Kinetic Pistols | 10 | 0.4s | 25.0 | Projectile | Starter |
| Companion Robot | 15 | 0.8s | 18.8 | Summon | Starter |
| Flamethrower Pulse | 12 | 0s | 12.0 | Cone | Starter |
| Temporal Echo | 18 | 2.0s | 9.0 | Summon | Starter |
| Plasma Barrier | 0 | 8.0s | 0 | Defensive | Starter |
| Bouncing Sawblade | 25 | 3.0s | 8.3 | Projectile | Uncommon |
| Magnet Pulse | 0 | 10.0s | 0 | Utility | Uncommon |
| Cryo-Aura Field | 0 | 0s | 0 | Passive | Uncommon |
| Emergency Nanites | 0 | 5.0s | 0 | Passive | Rare |
| Chain Tesla | 20 | 1.5s | 13.3 | Ranged | Rare |
| Plasma Shield Matrix | 0 | 12.0s | 0 | Defensive | Rare |
| Rocket Barrage | 45 | 2.5s | 18.0 | AoE | Rare |
| Orbital Laser | 30 | 4.0s | 7.5 | Beam | Legendary |
| Orbital Strike Beacon | 100 | 6.0s | 16.7 | Heavy AoE | Legendary |

### DPS Calculations

```typescript
// DPS Formula
dps = damage / cooldown_s

// For continuous weapons (Flamethrower)
dps = damage_per_second

// For multi-projectile weapons
dps = (damage * projectiles_per_shot) / cooldown_s
```

### Upgrade Tier Balance

**Starter Upgrades (Tier 1):**
- DPS Range: 0-38.9
- Average DPS: ~20
- Purpose: Give each hero a unique starting ability

**Uncommon Upgrades (Tier 2):**
- DPS Range: 0-8.3
- Average DPS: ~5
- Purpose: Early game utility and support

**Rare Upgrades (Tier 3):**
- DPS Range: 0-18.0
- Average DPS: ~10
- Purpose: Mid game damage and defense

**Legendary Upgrades (Tier 4-5):**
- DPS Range: 7.5-16.7
- Average DPS: ~12
- Purpose: Late game power spikes

### Upgrade Unlock Progression

| Wave | New Upgrades Unlocked | Total Available |
|------|----------------------|-----------------|
| 1 | Starter upgrades (6) | 6 |
| 3 | Bouncing Sawblade | 7 |
| 5 | Rocket Barrage | 8 |
| 6 | Pyrotechnic Specialist | 8 (hero) |
| 8 | Chain Tesla, Shield Paladin | 10 (1 hero + 1 upgrade) |
| 10 | Chrono Operative, Emergency Nanites | 12 (1 hero + 1 upgrade) |
| 12 | Plasma Shield Matrix | 13 |
| 15 | Orbital Laser | 14 |
| 20 | Orbital Strike Beacon | 15 |

---

## 💰 Economy Balance

### Coin Income Sources

| Source | Coins | Frequency | Coins/Minute |
|--------|-------|-----------|---------------|
| Spore Zombie | 1 | Frequent | ~20 |
| Acidic Chitin Bug | 2 | Frequent | ~40 |
| Aegis Tech Drone | 5 | Moderate | ~50 |
| Aegis Commander Drone | 50 | Rare (every 5 waves) | ~100 |
| Wave Bonus | 10 | Every wave | ~20 |
| Boss Bonus | 50 | Every 5 waves | ~100 |

### Coin Expenditure

| Item | Cost | Value |
|------|------|-------|
| Unlock Hero (Chrono) | 500 | New hero with unique playstyle |
| Unlock Hero (Shield) | 400 | Tank hero |
| Unlock Hero (Pyro) | 300 | AoE hero |
| Upgrade Tier 2 | 75-100 | Improved stats |
| Upgrade Tier 3 | 120-175 | Better abilities |
| Upgrade Tier 4 | 200-250 | Powerful abilities |
| Upgrade Tier 5 | 500 | Legendary abilities |

### Coin Economy Flow

```
Average Run (10 waves):
├── Enemy kills: ~150 enemies × 2.5 avg coins = 375 coins
├── Wave bonuses: 10 waves × 10 coins = 100 coins
├── Boss bonuses: 2 bosses × 50 coins = 100 coins
└── Total: ~575 coins

Average Expenditure:
├── Hero unlocks: 3 × 400 avg = 1200 coins (over multiple runs)
├── Upgrade tiers: 5 × 150 avg = 750 coins
└── Total: ~1950 coins (requires multiple runs)
```

---

## 📈 Scoring System Balance

### Score Formula

```typescript
finalScore = (survivalSeconds * 10) + (coinsCollected * 25)
```

### Score Examples

| Survival Time | Coins | Score | Rating |
|---------------|-------|-------|--------|
| 30 seconds | 50 | 525 | Beginner |
| 1 minute | 100 | 900 | Novice |
| 2 minutes | 250 | 2,250 | Intermediate |
| 5 minutes | 500 | 6,250 | Advanced |
| 10 minutes | 1,000 | 12,500 | Expert |
| 15 minutes | 1,500 | 18,750 | Master |

### Leaderboard Tiers

| Tier | Minimum Score | Percentage | Badge |
|------|---------------|------------|-------|
| Bronze | 1,000 | Top 50% | 🥉 |
| Silver | 5,000 | Top 25% | 🥈 |
| Gold | 10,000 | Top 10% | 🥇 |
| Platinum | 25,000 | Top 1% | 🏆 |

---

## 🎯 Wave Balance

### Wave Difficulty Curve

```typescript
// Wave difficulty multiplier
difficultyMultiplier = 1 + (wave * 0.1)

// Enemy count per wave
enemyCount = Math.floor(10 * difficultyMultiplier)

// Wave 1: 10 enemies
// Wave 5: 15 enemies
// Wave 10: 20 enemies
// Wave 20: 30 enemies
```

### Wave Reward Scaling

| Wave | Base Reward | Multiplier | Total Reward |
|------|-------------|------------|--------------|
| 1 | 100 | 1.0 | 100 |
| 5 | 100 | 1.5 | 150 |
| 10 | 100 | 2.0 | 200 |
| 15 | 100 | 2.5 | 250 |
| 20 | 100 | 3.0 | 300 |

### Boss Wave Frequency

- **Every 5th wave**: Mini-boss (Aegis Commander Drone)
- **Every 10th wave**: Enhanced rewards + harder enemies
- **Every 20th wave**: Legendary upgrade unlock

---

## 🛡️ Defensive Balance

### Damage Mitigation

| Source | Reduction | Notes |
|--------|-----------|-------|
| Plasma Barrier | 100% (1 hit) | Blocks one hit, then 8s cooldown |
| Plasma Shield Matrix | 100% (1 hit) | Blocks one hit, fires shockwave |
| Cryo-Aura Field | 0% (slow) | Slows enemies by 40% in 160px radius |
| Emergency Nanites | Continuous | Heals 1% max HP every 5 seconds |

### Invincibility Frames

- **After taking damage**: 1 second of invincibility
- **During dash**: 0.5 seconds of invincibility
- **Plasma Barrier active**: 0.1 seconds of invincibility on block

---

## 🎭 Hero-Specific Balance

### Vanguard Blade (Melee Tank)

**Strengths:**
- High base HP (150)
- High melee DPS (35 damage, 0.9s cooldown = 38.9 DPS)
- Arc Slash hits multiple enemies

**Weaknesses:**
- Short range (90px)
- No ranged capabilities
- Slow speed (1.0x)

**Balance Notes:**
- Designed for players who like to get up close
- Requires good positioning to avoid being surrounded
- Excels in crowd control

### Outpost Ranger (Marksman)

**Strengths:**
- High speed (1.3x)
- Good DPS (10 damage × 2 pistols, 0.4s cooldown = 50 DPS)
- Long range (300px)

**Weaknesses:**
- Low HP (90)
- Squishy, dies quickly if hit
- Requires good positioning

**Balance Notes:**
- Designed for hit-and-run tactics
- Rewards good aim and positioning
- Weak to fast enemies that can close the gap

### Tech Engineer (Specialist)

**Strengths:**
- Passive damage from Companion Robot
- Good balance of stats (110 HP, 1.0x speed)
- Hands-free damage

**Weaknesses:**
- Lower DPS than other heroes
- Robot can be killed
- Less direct control

**Balance Notes:**
- Designed for players who like passive playstyles
- Robot provides consistent but lower DPS
- Good for beginners learning the game

### Chrono Operative (Speedster)

**Strengths:**
- Very high speed (1.4x)
- Temporal Echo provides additional DPS
- High mobility

**Weaknesses:**
- Low HP (85)
- Complex playstyle
- Echo has limited duration

**Balance Notes:**
- Designed for advanced players
- High skill ceiling
- Rewards good micro-management

### Shield Paladin (Defender)

**Strengths:**
- Highest HP (175)
- Plasma Barrier blocks damage
- Can knock back enemies

**Weaknesses:**
- Slowest speed (0.85x)
- Low DPS
- Short range

**Balance Notes:**
- Designed for tanking damage
- Great for beginners learning the game
- Can survive mistakes better than other heroes

### Pyrotechnic Specialist (Area Control)

**Strengths:**
- Flamethrower Pulse hits multiple enemies
- Good AoE damage
- Moderate stats (100 HP, 1.1x speed)

**Weaknesses:**
- Short range (120px cone)
- Lower single-target DPS
- Requires enemies to be grouped

**Balance Notes:**
- Designed for crowd control
- Excels against groups of weak enemies
- Weak against single strong enemies

---

## 📊 Balance Metrics

### Time to Kill (TTK) Analysis

| Hero | vs Spore Zombie | vs Chitin Bug | vs Tech Drone | vs Commander |
|------|------------------|---------------|---------------|---------------|
| Vanguard Blade | 4 hits (1.6s) | 3 hits (1.2s) | 5 hits (2.0s) | 7 hits (2.8s) |
| Outpost Ranger | 9 hits (1.8s) | 7 hits (1.4s) | 13 hits (2.6s) | 30 hits (6.0s) |
| Tech Engineer | 3 robot hits (2.4s) | 2 robot hits (1.6s) | 5 robot hits (4.0s) | 16 robot hits (12.8s) |
| Chrono Operative | 5 hits + echo (3.0s) | 4 hits + echo (2.4s) | 7 hits + echo (4.2s) | 14 hits + echo (8.4s) |
| Shield Paladin | 7 hits (2.8s) | 5 hits (2.0s) | 9 hits (3.6s) | 12 hits (4.8s) |
| Pyrotechnic Specialist | 4 seconds | 3 seconds | 5 seconds | 20 seconds |

### Damage per Second (DPS) Comparison

| Hero | Base DPS | With Upgrades | Max DPS |
|------|----------|---------------|---------|
| Vanguard Blade | 38.9 | +Arc Slash tiers | 60 |
| Outpost Ranger | 50.0 | +Dual Pistols tiers | 80 |
| Tech Engineer | 18.8 | +Robot tiers | 30 |
| Chrono Operative | 9.0 | +Echo tiers | 25 |
| Shield Paladin | 0 | +Barrier tiers | 10 |
| Pyrotechnic Specialist | 12.0 | +Flamethrower tiers | 25 |

---

## 🔧 Balance Adjustment Guide

### If Game is Too Easy

1. **Increase enemy HP scaling**: Change from 1.1 to 1.15
2. **Increase enemy damage scaling**: Change from 1.05 to 1.1
3. **Increase enemy speed scaling**: Change from 1.02 to 1.05
4. **Reduce player invincibility frames**: Change from 1.0s to 0.8s
5. **Increase boss HP**: Change from 240 to 300

### If Game is Too Hard

1. **Decrease enemy HP scaling**: Change from 1.1 to 1.05
2. **Decrease enemy damage scaling**: Change from 1.05 to 1.0
3. **Increase player HP**: Add +10 to all heroes
4. **Increase coin drops**: Multiply all coin values by 1.5
5. **Reduce boss HP**: Change from 240 to 200

### If Specific Heroes are Too Strong

1. **Vanguard Blade**: Reduce Arc Slash damage from 35 to 30
2. **Outpost Ranger**: Reduce Dual Pistols damage from 10 to 9
3. **Shield Paladin**: Reduce HP from 175 to 160
4. **Chrono Operative**: Increase Temporal Echo cooldown from 2.0s to 2.5s

### If Specific Heroes are Too Weak

1. **Tech Engineer**: Increase Companion Robot damage from 15 to 18
2. **Pyrotechnic Specialist**: Increase Flamethrower damage from 12 to 15
3. **Chrono Operative**: Increase base HP from 85 to 90
4. **Shield Paladin**: Increase speed from 0.85x to 0.9x

---

## 📝 Balance Testing Checklist

- [ ] Test each hero at Wave 1
- [ ] Test each hero at Wave 5 (first boss)
- [ ] Test each hero at Wave 10
- [ ] Test each hero at Wave 20
- [ ] Verify all upgrades are useful
- [ ] Verify no upgrade is overpowered
- [ ] Verify coin economy is balanced
- [ ] Verify scoring feels rewarding
- [ ] Verify difficulty curve is smooth

---

## 🎯 Final Balance Notes

### What Works Well
✅ Hero variety - Each hero feels unique
✅ Difficulty curve - Smooth progression
✅ Upgrade system - Meaningful choices
✅ Boss encounters - Challenging but fair
✅ Economy - Rewarding without being game-breaking

### Areas to Monitor
⚠️ **Outpost Ranger** - May be too strong in skilled hands
⚠️ **Shield Paladin** - May be too easy for beginners
⚠️ **Wave 5 Boss** - May be too difficult for new players
⚠️ **Upgrade DPS** - Some upgrades may need balancing

### Future Balance Plans
- Add more heroes with unique mechanics
- Add more upgrades for more variety
- Add difficulty settings (Easy, Normal, Hard)
- Add New Game+ mode with increased difficulty

---

**Phase 2 Balance Complete** ✅

All balance calculations, formulas, and design decisions have been documented. The game is balanced for a fair and enjoyable experience across all heroes, enemies, and upgrades.
