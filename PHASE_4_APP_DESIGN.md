# Phase 4: App Design Specification

## Core Objective
Wireframe 6 web views & lock 10 custom web features.

## Status: IN PROGRESS

## Design System

### Colors
- Slate Carbon: #0B0F19 (background)
- Cyan: #00F0FF (primary)
- Hazard Gold: #FFD700 (secondary)
- Alert Red: #FF0055 (danger)

### Typography
- H1: 2.25rem, bold, cyan
- H2: 1.5rem, bold, white
- Body: 1rem, gray-300

## 6 Application Views

### 1. HQ Dashboard
- Tactical briefing hub
- Launch mission button
- Top 3 global scores
- Quick stats (runs, best wave, kills, coins)

### 2. Play View
- HTML5 Canvas game area
- HUD: Wave, Score, HP, Level, XP
- Level-Up modal
- Game Over screen

### 3. Swarm Codex
- Searchable database
- Multi-filter by category
- Sort by attributes
- Entity cards with details

### 4. Armory
- Loadout CRUD
- Hero selection
- Upgrade selection
- Real-time stat calculator

### 5. Leaderboards
- Global high scores
- Filter by time/hero
- Sort by score/wave/coins
- Pagination

### 6. Profile
- User profile card
- Lifetime stats
- Achievement tracker
- Progress bars

## 10 Custom Features

| # | Feature | View | Status |
|---|---------|------|--------|
| 1 | Live Text Search | Codex | Implemented |
| 2 | Category Multi-Filter | Codex | Implemented |
| 3 | Attribute Sorting | Codex | Implemented |
| 4 | Loadout CRUD | Armory | Implemented |
| 5 | Dynamic Stat Calculator | Armory | Implemented |
| 6 | Real-Time Score Sync | All | Implemented |
| 7 | Achievement Tracker | Profile | Implemented |
| 8 | Audio Controller | Settings | Phase 8 |
| 9 | High-Contrast Theme | Settings | Phase 8 |
| 10 | Toast Notifications | All | Phase 8 |

## Component Structure

src/components/
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Layout.tsx
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── ...
└── views/
    ├── HQView/
    ├── PlayView/
    ├── CodexView/
    ├── ArmoryView/
    ├── LeaderboardsView/
    └── ProfileView/

## Navigation

Routes:
- / → HQView
- /play → PlayView
- /codex → CodexView
- /armory → ArmoryView
- /leaderboards → LeaderboardsView
- /profile → ProfileView

## Next: Phase 5
Database schema & Auth setup
