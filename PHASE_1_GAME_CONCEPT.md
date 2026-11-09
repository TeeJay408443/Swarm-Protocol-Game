# Phase 1: Game Concept Definition - COMPLETE ✅

## Core Objective
Define high-level game identity, lock all foundational game design decisions.

## Status: ✅ COMPLETED

---

## 🎮 Game Identity

### Official Title
**SWARM PROTOCOL: SURVIVOR**

### Tagline
> "Survive the Swarm. Command the Protocol."

### Genre Classification
- **Primary**: 2D Top-Down Arena Horde Survival
- **Sub-Genre**: Tactical Action / Roguelike Elements
- **Perspective**: Top-down isometric view
- **Gameplay**: Real-time action with strategic elements

---

## 🎨 Tactical Aesthetic

### Visual Style
- **Theme**: Sci-Fi Military / Cyber Tactical
- **Color Palette**: 
  - Primary: Slate Carbon (#0B0F19) - Dark tactical backgrounds
  - Secondary: Cyan (#00F0FF) - HUD elements, player indicators
  - Accent: Hazard Gold (#FFD700) - Highlights, warnings
  - Alert: Red (#FF0055) - Danger, damage, enemies
- **Lighting**: Glowing neon effects, dark atmosphere with bright UI
- **Art Style**: Pixel-art inspired with modern vector graphics

### Audio Design
- **Music**: Synthwave / Cyberpunk electronic soundtrack
- **SFX**: Futuristic weapon sounds, robotic enemy noises
- **Ambience**: Subtle hum of machinery, distant alarm sounds

### UI Style
- **Terminal Aesthetic**: Command-line inspired interfaces
- **HUD**: Clean, minimal, tactical display
- **Typography**: Monospace fonts for code-like feel, sans-serif for readability

---

## 🎯 Core Gameplay Loop

```
START RUN
  ↓
SELECT LOADOUT (Hero + Upgrade)
  ↓
ENTER ARENA
  ↓
WAVE 1 (30 seconds)
  ├─ Spawn Enemies
  ├─ Player Combat
  ├─ Collect Coins
  └─ Survive
  ↓
WAVE BREATHER (3 seconds)
  ├─ Safe Zone
  ├─ Collect Remaining Coins
  └─ Prepare for Next Wave
  ↓
WAVE 2+ (Repeat)
  ↓
LEVEL UP (After Wave Clear)
  ├─ Random Card Selection (3 options)
  ├─ Choose Upgrade
  └─ Continue Run
  ↓
BOSS WAVE (Every 5th Wave)
  ├─ Aegis Commander Drone
  ├─ Enhanced Difficulty
  └─ Bonus Rewards
  ↓
GAME OVER (On Player Death)
  ├─ Submit Score
  ├─ Update Stats
  └─ Return to HQ
  ↓
RESTART RUN
```

---

## 🕹️ Control Scheme

### Primary Controls (WASD)
| Key | Action | Description |
|-----|--------|-------------|
| W | Move Up | Move player forward (north) |
| A | Move Left | Move player left (west) |
| S | Move Down | Move player backward (south) |
| D | Move Right | Move player right (east) |
| W+A | Diagonal | Move northwest (315°) |
| W+D | Diagonal | Move northeast (45°) |
| S+A | Diagonal | Move southwest (225°) |
| S+D | Diagonal | Move southeast (135°) |

### Secondary Controls
| Key | Action | Description |
|-----|--------|-------------|
| Left Click | Primary Attack | Use equipped weapon |
| Right Click | Secondary Attack | Use special ability |
| Space | Dash / Roll | Quick evasive maneuver |
| Shift | Sprint | Temporary speed boost |
| E | Interact | Pick up items, open doors |
| Tab | Pause Menu | Pause game, view options |
| Esc | Exit | Return to main menu |

### Touch Controls (Mobile)
- **Virtual Joystick**: Left side of screen for movement
- **Attack Button**: Right side for primary attack
- **Special Button**: Right side for secondary attack
- **Tap to Move**: Alternative movement method

### Gamepad Support (Future)
- Left Stick: Movement
- Right Stick: Aim (if applicable)
- A Button: Primary Attack
- B Button: Secondary Attack
- X Button: Dash
- Y Button: Interact
- Start: Pause
- Select: Exit

---

## 🏆 Win/Lose Conditions

### Win Conditions
1. **Survival Time**: Survive as long as possible
2. **Wave Completion**: Clear as many waves as possible
3. **Score Achievement**: Achieve high scores on leaderboards
4. **Challenge Completion**: Complete special challenges (achievements)

### Lose Conditions
1. **Player Death**: HP reaches 0
   - Triggered by: Enemy attacks, environmental damage
   - Result: Game Over screen, score submission

### Game Over Triggers
- Player HP ≤ 0
- No respawn mechanic (perma-death for runs)
- Run ends immediately on death

### Victory States (Soft Wins)
- **Wave 10**: "Swarm Commander" achievement
- **Wave 20**: "Swarm Overlord" achievement
- **Wave 50**: "Swarm God" achievement
- **Survive 5 minutes**: "Endurance" milestone
- **Survive 10 minutes**: "Unstoppable" milestone

---

## 🎭 Game World & Setting

### Lore Overview
In the year 2187, humanity's last defense against the Swarm lies in the **Swarm Protocol** - a tactical AI system designed to coordinate the final stand. As a **Protocol Operative**, you are deployed into contaminated zones to eliminate Swarm threats and survive against overwhelming odds.

### Arena Setting
- **Location**: Contained Swarm Zones (CSZ)
- **Environment**: Abandoned military installations, ruined cities
- **Atmosphere**: Dark, industrial, with neon tactical overlays
- **Boundaries**: Invisible walls (soft boundaries with visual indicators)

### Factions
- **Protocol Forces** (Player): Human defenders with advanced technology
- **The Swarm** (Enemies): Mutated bio-mechanical entities
- **Aegis Corporation** (Neutral): Former defense contractor, now compromised

---

## 🎯 Game Design Pillars

### 1. Accessibility
- Simple controls (WASD + Click)
- Clear visual feedback
- Colorblind-friendly UI
- High contrast mode available

### 2. Replayability
- Randomized enemy spawns
- Randomized upgrade selection
- Multiple hero choices
- Procedural wave difficulty

### 3. Strategic Depth
- Hero selection matters
- Upgrade combinations create different playstyles
- Positioning and movement are key to survival
- Resource management (coins for upgrades)

### 4. Satisfying Progression
- Visual and audio feedback on hits
- Screen shake on big impacts
- Number popups for damage/coins
- Level-up celebration

### 5. Tactical Feel
- Military HUD aesthetic
- Terminal-style interfaces
- Glowing neon effects
- Cyberpunk soundtrack

---

## 📋 Phase 1 Deliverables

### ✅ Completed
- [x] Lock title: **Swarm Protocol: Survivor**
- [x] Define genre: 2D Top-Down Arena Horde Survival
- [x] Define tactical aesthetic (colors, theme, style)
- [x] Confirm WASD controls (8-directional movement)
- [x] Define win/lose conditions
- [x] Document core gameplay loop
- [x] Define control scheme (keyboard, touch, gamepad)
- [x] Create lore and setting
- [x] Establish game design pillars

### 📁 Files Created
1. `PHASE_1_GAME_CONCEPT.md` - This document
2. `src/types/game.ts` - Game type definitions
3. `src/config/gameConstants.ts` - Game configuration constants
4. `src/config/controls.ts` - Control scheme definitions

---

## 🔗 Related Files

- `src/types/game.ts` - TypeScript interfaces for game entities
- `src/config/gameConstants.ts` - Numerical constants and settings
- `src/config/controls.ts` - Control mappings
- `src/db/seedData.ts` - Entity data (already created in Phase 0)

---

## 🎯 Next Phase

**Phase 2: Game Content**
- Build seed dataset for all 29 entities
- Finalize entity attributes and balances
- Create entity relationship maps

---

**Phase 1 Complete** ✅

All foundational game design decisions are locked. Ready for Phase 2: Game Content.
