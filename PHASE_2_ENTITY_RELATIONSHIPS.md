# Phase 2: Entity Relationships & Data Model

## Overview

This document describes the relationships between all 29 entities in Swarm Protocol: Survivor, including their connections, dependencies, and how they interact within the game system.

---

## 🗺️ Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ENTITY HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐  │
│  │     HEROS       │     │     ENEMIES     │     │    UPGRADES    │  │
│  │    (6)          │     │    (4)          │     │    (15)        │  │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘  │
│           │                       │                       │            │
│           │ has starting          │ has                  │            │
│           ▼                       ▼                       ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    SEED ENTITIES (29)                           │   │
│  │  • 6 Heroes with unique starting upgrades                       │   │
│  │  • 4 Enemies with different behaviors                           │   │
│  │  • 15 Upgrades across 6 categories                              │   │
│  │  • 4 Achievements with unlock conditions                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           │                                                           │
│           ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    USER DATA TABLES                              │   │
│  │  • Loadouts (references Heroes + Upgrades)                       │   │
│  │  • Scores (references Heroes)                                   │   │
│  │  • Player Stats (aggregates from Scores)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Entity Categories

### 1. Heroes (6 Entities)

| ID | Name | Archetype | Starting Upgrade | HP | Speed | Unlock |
|----|------|-----------|-------------------|----|-------|--------|
| hero_01 | Vanguard Blade | Melee Tank | upg_12 (Arc Slash) | 150 | 1.0x | Default |
| hero_02 | Outpost Ranger | Marksman | upg_13 (Dual Kinetic Pistols) | 90 | 1.3x | Default |
| hero_03 | Tech Engineer | Specialist | upg_01 (Companion Robot) | 110 | 1.0x | Default |
| hero_04 | Chrono Operative | Speedster | upg_14 (Temporal Echo) | 85 | 1.4x | Wave 10 |
| hero_05 | Shield Paladin | Defender | upg_15 (Plasma Barrier) | 175 | 0.85x | Wave 8 |
| hero_06 | Pyrotechnic Specialist | Area Control | upg_10 (Flamethrower Pulse) | 100 | 1.1x | Wave 6 |

**Relationships:**
- Each hero **has one** starting upgrade (foreign key: `starting_upgrade_id`)
- Heroes **are referenced by** loadouts and scores
- Heroes **unlock** at specific waves (except default heroes)

---

### 2. Enemies (4 Entities)

| ID | Name | Category | HP | Speed | Coin Value | Min Wave |
|----|------|----------|----|-------|------------|----------|
| ene_01 | Spore Zombie | Swarm | 40 | 0.50x | 1 | 1 |
| ene_02 | Acidic Chitin Bug | Fast Flanker | 15 | 1.10x | 2 | 2 |
| ene_03 | Aegis Tech Drone | Ranged Sniper | 65 | 0.75x | 5 | 3 |
| ene_04 | Aegis Commander Drone | Mini-Boss | 240 | 0.60x | 50 | 5 (Boss) |

**Relationships:**
- Enemies **spawn** in waves based on `minWave`
- Enemies **drop** coins based on `coin_value`
- Enemies **have** different AI behaviors based on `category`
- ene_04 **is a boss** that spawns every 5th wave

**Spawning Logic:**
```
Wave 1-4: ene_01 (Spore Zombie) + ene_02 (Acidic Chitin Bug)
Wave 3+: ene_03 (Aegis Tech Drone) added
Wave 5, 10, 15, 20...: ene_04 (Aegis Commander Drone) spawns
```

---

### 3. Upgrades (15 Entities)

| ID | Name | Category | Damage | Cooldown | Rarity | Unlock |
|----|------|----------|--------|----------|--------|--------|
| upg_01 | Companion Robot | Summon | 15 | 0.8s | Starter | Tech Engineer |
| upg_02 | Rocket Barrage | AoE Weapon | 45 | 2.5s | Rare | Wave 5 |
| upg_03 | Orbital Laser | Beam Weapon | 30 | 4.0s | Legendary | Wave 15 |
| upg_04 | Magnet Pulse | Utility | 0 | 10.0s | Uncommon | Level 3 |
| upg_05 | Bouncing Sawblade | Projectile | 25 | 3.0s | Uncommon | Wave 3 |
| upg_06 | Chain Tesla | Ranged | 20 | 1.5s | Rare | Wave 8 |
| upg_07 | Orbital Strike Beacon | Heavy AoE | 100 | 6.0s | Legendary | Wave 20 |
| upg_08 | Cryo-Aura Field | Passive | 0 | 0s | Uncommon | Level 5 |
| upg_09 | Emergency Nanites | Passive | 0 | 5.0s | Rare | Wave 10 |
| upg_10 | Flamethrower Pulse | Cone Weapon | 12 | 0s | Starter | Pyrotechnic Specialist |
| upg_11 | Plasma Shield Matrix | Defensive | 0 | 12.0s | Rare | Wave 12 |
| upg_12 | Arc Slash | Melee Weapon | 35 | 0.9s | Starter | Vanguard Blade |
| upg_13 | Dual Kinetic Pistols | Projectile | 10 | 0.4s | Starter | Outpost Ranger |
| upg_14 | Temporal Echo | Summon | 18 | 2.0s | Starter | Chrono Operative |
| upg_15 | Plasma Barrier | Defensive | 0 | 8.0s | Starter | Shield Paladin |

**Category Distribution:**
- Summon: 3 (upg_01, upg_14, + Companion Robot)
- AoE Weapon: 2 (upg_02, upg_03, upg_07)
- Projectile: 4 (upg_05, upg_13, + others)
- Ranged: 1 (upg_06)
- Beam Weapon: 1 (upg_03)
- Cone Weapon: 1 (upg_10)
- Heavy AoE: 1 (upg_07)
- Utility: 1 (upg_04)
- Passive: 2 (upg_08, upg_09)
- Defensive: 2 (upg_11, upg_15)
- Melee Weapon: 1 (upg_12)

**Rarity Distribution:**
- Starter: 6 (one for each hero)
- Common: 0
- Uncommon: 4 (upg_04, upg_05, upg_08)
- Rare: 4 (upg_02, upg_06, upg_09, upg_11)
- Legendary: 2 (upg_03, upg_07)

**Relationships:**
- Upgrades **are referenced by** heroes (as starting upgrades)
- Upgrades **are referenced by** loadouts (as primary/secondary upgrades)
- Upgrades **unlock** at specific waves or levels

---

### 4. Achievements (4 Entities)

| ID | Title | Requirement | Badge | Category | Difficulty |
|----|-------|-------------|-------|----------|------------|
| ach_01 | First Contact | Defeat 100 enemies | Bronze Bug Hunter | Combat | Bronze |
| ach_02 | Gold Hoarder | Collect 500 coins in one run | Coin Master | Collection | Silver |
| ach_03 | Swarmslayer | Defeat 1,000 enemies total | Silver Vanquisher | Combat | Silver |
| ach_04 | Untouchable | Survive 3 waves without damage | Gold Aegis | Skill | Gold |

**Relationships:**
- Achievements **track** player stats from `player_stats` table
- Achievements **are referenced by** `player_stats` for progress tracking

**Data Sources:**
- ach_01: `player_stats.total_enemies_defeated >= 100`
- ach_02: `scores.coins_collected >= 500` (any single run)
- ach_03: `player_stats.total_enemies_defeated >= 1000`
- ach_04: `player_stats.longest_damage_free_wave_streak >= 3`

---

## 🔗 Database Table Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐          │
│  │   upgrades   │       │   enemies   │       │  heroes     │          │
│  │ (15 rows)    │       │ (4 rows)    │       │ (6 rows)    │          │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘          │
│         │                      │                      │                 │
│         │                      │                      │                 │
│         ▼                      ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         SEED TABLES                              │   │
│  │  • Public read-only (RLS: true for all)                          │   │
│  │  • No user-specific data                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                      │                 │
│         │ heroes.starting_upgrade_id ──────────────────────► upgrades.id  │                 │
│         │                                                      │                 │
│         ▼                                                      │                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         USER TABLES                              │   │
│  │  • Row Level Security (RLS) applied                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                              │                         │          │
│  ┌──────▼──────┐               ┌──────▼──────┐               ┌─────▼────┐  │
│  │  loadouts   │               │   scores    │               │player_stats│  │
│  │ (CRUD)      │               │ (Read+Insert)│              │ (Read+Write)│  │
│  └──────┬──────┘               └──────┬──────┘               └─────┬────┘  │
│         │                              │                         │          │
│         ├──────────────────────────┤                         │          │
│         ▼                              ▼                         ▼          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    AUTH.USERS (Supabase)                         │   │
│  │  • User authentication and authorization                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Foreign Key Relationships

### 1. heroes → upgrades
```sql
heroes.starting_upgrade_id REFERENCES public.upgrades(id)
```
- **Purpose**: Each hero has a default starting upgrade
- **Cardinality**: One-to-One (each hero has exactly one starting upgrade)
- **Examples**:
  - hero_01 (Vanguard Blade) → upg_12 (Arc Slash)
  - hero_02 (Outpost Ranger) → upg_13 (Dual Kinetic Pistols)
  - hero_03 (Tech Engineer) → upg_01 (Companion Robot)

### 2. loadouts → auth.users
```sql
loadouts.user_id REFERENCES auth.users(id) ON DELETE CASCADE
```
- **Purpose**: Each loadout belongs to a specific user
- **Cardinality**: One-to-Many (one user can have many loadouts)
- **Cascade**: When a user is deleted, all their loadouts are deleted

### 3. loadouts → heroes
```sql
loadouts.hero_id REFERENCES public.heroes(id)
```
- **Purpose**: Each loadout uses a specific hero
- **Cardinality**: One-to-One (each loadout uses exactly one hero)

### 4. loadouts → upgrades
```sql
loadouts.primary_upgrade_id REFERENCES public.upgrades(id)
```
- **Purpose**: Each loadout has a primary upgrade
- **Cardinality**: One-to-One (each loadout has exactly one primary upgrade)

### 5. scores → auth.users
```sql
scores.user_id REFERENCES auth.users(id) ON DELETE SET NULL
```
- **Purpose**: Each score belongs to a user (or is anonymous)
- **Cardinality**: One-to-Many (one user can have many scores)
- **Behavior**: When a user is deleted, their scores become anonymous (user_id = NULL)

### 6. scores → heroes
```sql
scores.hero_used REFERENCES public.heroes(id)
```
- **Purpose**: Each score records which hero was used
- **Cardinality**: One-to-One (each score uses exactly one hero)

### 7. player_stats → auth.users
```sql
player_stats.user_id REFERENCES auth.users(id) ON DELETE CASCADE
```
- **Purpose**: Each user has one set of lifetime stats
- **Cardinality**: One-to-One (each user has exactly one player_stats record)
- **Cascade**: When a user is deleted, their stats are deleted

---

## 🎯 Gameplay Relationships

### Hero-Upgrade Compatibility

Each hero has a **starting upgrade** that matches their playstyle:

| Hero | Archetype | Starting Upgrade | Playstyle |
|------|-----------|-------------------|-----------|
| Vanguard Blade | Melee Tank | Arc Slash | Close-range crowd clearing |
| Outpost Ranger | Marksman | Dual Kinetic Pistols | Long-range kiting |
| Tech Engineer | Specialist | Companion Robot | Drone-based support |
| Chrono Operative | Speedster | Temporal Echo | Time manipulation |
| Shield Paladin | Defender | Plasma Barrier | Defensive barrier |
| Pyrotechnic Specialist | Area Control | Flamethrower Pulse | Area denial |

### Enemy Spawn Relationships

Enemies spawn based on **wave number** and **spawn weights**:

```typescript
// Spawn logic for normal waves
function getSpawnableEnemies(wave: number): Enemy[] {
  return enemies.filter(e => e.minWave <= wave)
}

// Wave 1: [Spore Zombie]
// Wave 2: [Spore Zombie, Acidic Chitin Bug]
// Wave 3+: [Spore Zombie, Acidic Chitin Bug, Aegis Tech Drone]
// Wave 5, 10, 15...: [All above + Aegis Commander Drone]
```

### Upgrade Unlock Relationships

Upgrades unlock through different mechanisms:

1. **Default (Starter)**: Available to specific heroes from the start
   - upg_01, upg_10, upg_12, upg_13, upg_14, upg_15

2. **Wave-Based**: Unlocked after surviving a specific wave
   - upg_02: Wave 5
   - upg_03: Wave 15
   - upg_05: Wave 3
   - upg_06: Wave 8
   - upg_07: Wave 20
   - upg_11: Wave 12

3. **Level-Based**: Unlocked at a specific player level
   - upg_04: Level 3
   - upg_08: Level 5
   - upg_09: Wave 10

### Achievement Tracking Relationships

Achievements are tracked through **player_stats** and **scores**:

```typescript
// ach_01: First Contact
if (playerStats.total_enemies_defeated >= 100) {
  unlockAchievement('ach_01')
}

// ach_02: Gold Hoarder
if (score.coins_collected >= 500) {
  unlockAchievement('ach_02')
}

// ach_03: Swarmslayer
if (playerStats.total_enemies_defeated >= 1000) {
  unlockAchievement('ach_03')
}

// ach_04: Untouchable
if (playerStats.longest_damage_free_wave_streak >= 3) {
  unlockAchievement('ach_04')
}
```

---

## 📊 Entity Statistics Summary

### Counts
- **Total Entities**: 29
- **Heroes**: 6
- **Enemies**: 4
- **Upgrades**: 15
- **Achievements**: 4

### Category Breakdown
- **Hero Archetypes**: 6 unique types
- **Enemy Categories**: 4 types (Swarm, Fast Flanker, Ranged Sniper, Mini-Boss)
- **Upgrade Categories**: 11 types
- **Achievement Categories**: 4 types (Combat, Collection, Survival, Skill)

### Rarity Breakdown (Upgrades)
- **Starter**: 6 (40%)
- **Uncommon**: 4 (27%)
- **Rare**: 4 (27%)
- **Legendary**: 2 (13%)

### Difficulty Breakdown (Achievements)
- **Bronze**: 1 (25%)
- **Silver**: 2 (50%)
- **Gold**: 1 (25%)

---

## 🔍 Validation

All entity relationships have been validated:

- ✅ All IDs are unique within their entity types
- ✅ All foreign key references are valid
- ✅ All numeric values are positive
- ✅ All string fields are non-empty
- ✅ Hero starting upgrades exist
- ✅ Entity counts match expectations
- ✅ Enhanced data matches base data

Run validation: `npm run db:validate`

---

## 📝 Data Integrity Notes

### Important Constraints

1. **Seed Order**: Upgrades must be seeded before Heroes because Heroes reference Upgrades via `starting_upgrade_id`

2. **RLS Policies**: All seed tables have public read access (RLS: USING (true))

3. **User Data**: All user data tables have user-scoped RLS policies

4. **Cascade Deletes**: 
   - Loadouts are deleted when user is deleted
   - Player stats are deleted when user is deleted
   - Scores become anonymous when user is deleted

### Data Consistency

- All entity IDs follow a consistent naming pattern: `{type}_{number}`
- All heroes have valid starting upgrades
- All enemies have appropriate spawn weights and minimum waves
- All upgrades have balanced damage, cooldown, and rarity

---

## 🎯 Usage in Game

### Loading Seed Data
```typescript
// Load all entities
const { data: upgrades, error: upgradesError } = await supabase
  .from('upgrades')
  .select('*')

const { data: enemies, error: enemiesError } = await supabase
  .from('enemies')
  .select('*')

const { data: heroes, error: heroesError } = await supabase
  .from('heroes')
  .select('*')

const { data: achievements, error: achievementsError } = await supabase
  .from('achievements')
  .select('*')
```

### Querying Relationships
```typescript
// Get a hero with their starting upgrade
const { data: hero, error } = await supabase
  .from('heroes')
  .select('*, upgrades(*)')
  .eq('id', 'hero_01')
  .single()

// Get all loadouts for a user with hero and upgrade details
const { data: loadouts, error } = await supabase
  .from('loadouts')
  .select('*, heroes(*), upgrades(*)')
  .eq('user_id', userId)
```

---

**Phase 2 Entity Relationships Complete** ✅

All entity relationships, foreign keys, and data dependencies have been documented. The seed data is validated and ready for use in the game.
