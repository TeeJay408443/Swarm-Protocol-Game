# SWARM PROTOCOL: SURVIVOR

> **A 2D Top-Down Arena Horde Survival Game**

Built with React, HTML5 Canvas, Supabase, Tailwind CSS, and deployed on Vercel.

![Swarm Protocol Logo](https://via.placeholder.com/600x300/0B0F19/00F0FF?text=SWARM+PROTOCOL+SURVIVOR)

## 🎮 Game Overview

Swarm Protocol: Survivor is a web-based, 60 FPS 2D top-down arena horde survival game. Players battle against waves of swarm enemies, collect coins, level up, and survive as long as possible.

### Core Features
- **60 FPS HTML5 Canvas Engine** - Smooth gameplay with requestAnimationFrame
- **Wave-Based Survival** - 30-second waves with 3-second breather windows
- **Boss Escalation** - Every 5th wave spawns the Aegis Commander Drone mini-boss
- **6 Playable Heroes** - Each with unique archetypes and starting upgrades
- **15 Upgrades** - Weapons, utilities, and defensive abilities
- **4 Enemy Types** - Including the powerful mini-boss
- **Scoring System** - Final Score = (Seconds Survived × 10) + (Coins Collected × 25)

## 🏗️ Project Structure

```
swarm-protocol/
├── src/
│   ├── components/
│   │   ├── game/          # Game engine components
│   │   ├── ui/            # UI components
│   │   └── views/         # Application views (HQ, Play, Codex, Armory, Leaderboards, Profile)
│   ├── db/
│   │   ├── schema.sql     # Database schema
│   │   ├── seed.ts        # Seed script
│   │   └── seedData.ts    # All 29 entities
│   ├── hooks/             # Custom React hooks
│   ├── lib/
│   │   └── supabase.ts    # Supabase client
│   ├── types/
│   │   └── database.ts    # TypeScript interfaces
│   ├── utils/             # Utility functions
│   ├── assets/            # Static assets
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

## 📋 10-Phase Build Plan

| Phase | Title | Objective | Status |
|-------|-------|-----------|--------|
| 0 | Setup | Confirm concept & setup tech stack | ✅ Complete |
| 1 | Game Concept | Define high-level game identity | ⏳ Pending |
| 2 | Game Content | Build seed dataset (29 entities) | ⏳ Pending |
| 3 | Game Design | Lock core loop & wave logic | ⏳ Pending |
| 4 | App Design | Wireframe views & features | ⏳ Pending |
| 5 | Foundation | Database schema & Auth setup | ⏳ Pending |
| 6 | Core Build | Web application & CRUD UI | ⏳ Pending |
| 7 | Build the Game | 60 FPS HTML5 Canvas engine | ⏳ Pending |
| 8 | Features & Polish | UX polish & error handling | ⏳ Pending |
| 9 | Test & Deploy | E2E testing & production launch | ⏳ Pending |

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | React 19 + TypeScript | Component-based UI |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Game Engine** | HTML5 Canvas API | 60 FPS rendering |
| **Database** | Supabase PostgreSQL | Persistent data storage |
| **Auth** | Supabase Auth | User authentication |
| **Build Tool** | Vite | Fast development & build |
| **Deployment** | Vercel | Production hosting |

## 🎨 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Slate Carbon | `#0B0F19` | Primary background |
| Cyan | `#00F0FF` | Primary accent |
| Hazard Gold | `#FFD700` | Secondary accent |
| Alert Red | `#FF0055` | Danger/alert states |

## 📦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database)
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TeeJay408443/Swarm-Protocol-Game.git
   cd Swarm-Protocol-Game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `src/db/schema.sql` in the Supabase SQL Editor
   - Seed the database: `npm run db:seed`

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

7. **Deploy to Vercel**
   ```bash
   vercel
   ```

## 🎯 Game Mechanics

### Wave System
- **Active Wave**: 30 seconds of enemy spawning
- **Breather Window**: 3 seconds of safety (no spawns, safe coin collection)
- **Boss Waves**: Every 5th wave spawns the Aegis Commander Drone

### Combat
- **WASD Controls**: 8-directional movement
- **Auto-Targeting**: Weapons automatically target nearest enemies
- **Collision**: Circle-to-circle collision detection

### Scoring
- **Formula**: `Final Score = (Seconds Survived × 10) + (Coins Collected × 25)`
- **Run Telemetry**: Tracks enemies defeated and longest damage-free wave streak

## 🗄️ Database Schema

### Seed Tables (Public Read-Only)
- `upgrades` - 15 weapon/utility upgrades
- `enemies` - 4 enemy types
- `achievements` - 4 player achievements
- `heroes` - 6 playable heroes

### User Tables (CRUD)
- `loadouts` - Player-created loadouts
- `scores` - High scores and run telemetry
- `player_stats` - Lifetime player statistics

## 🎮 Application Views

1. **HQ Dashboard** - Tactical briefing hub with Top 3 global scores
2. **Play View** - HTML5 Canvas game engine with dynamic HUD
3. **Swarm Codex** - Searchable database browser for all 29 entities
4. **Armory** - Loadout builder with full CRUD functionality
5. **Leaderboards** - Filterable global high score ranking table
6. **Profile & Badges** - Lifetime telemetry and achievement progress

## 🎁 10 Custom Features

1. **Live Text Search** - Client-side search for Codex entities
2. **Category Multi-Filter** - Filter by entity type
3. **Attribute Sorting Engine** - Sort by HP, Damage, Score, etc.
4. **Loadout CRUD Module** - Full Create/Read/Update/Delete for loadouts
5. **Dynamic Stat Calculator** - Live HP and DPS calculations
6. **Real-Time Score Sync** - Automatic score submission to Supabase
7. **Achievement Tracker** - Progress tracking for all achievements
8. **Audio & SFX Controller** - Volume and mute preferences
9. **High-Contrast Theme Switcher** - Accessibility toggle
10. **Toast Notification System** - Floating alerts for user feedback

## 📜 License

This project is licensed under the MIT License.

## 🙏 Credits

- **Creative Direction**: Inspired by Hideo Kojima
- **Narrative & UX**: Inspired by Amy Hennig
- **Indie Development**: Inspired by Toby Fox

---

**Built with ❤️ for the Web Development Class**

*Phase 0 Complete - Foundation Established*
