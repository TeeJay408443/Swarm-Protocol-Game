# PHASE 9: TEST & DEPLOY — SWARM PROTOCOL: SURVIVOR

This document summarizes Phase 9 end-to-end verification, security/schema auditing, automated test coverage, and production deployment readiness for **Swarm Protocol: Survivor**.

---

## 1. End-to-End Wiring Verification

### Global App Providers (`/src/App.tsx`, `/src/components/layout/Header.tsx`)
- Wrapped all routes in `AccessibilityProvider`, `AudioProvider`, and `ToastProvider` (`top-right`), mounting `AccessibilityStyles`, `AccessibilitySettingsButton`, and `AudioSettingsButton` globally.
- Implemented active-route highlighting, mobile hamburger navigation drawer, and Operative Identity modal (supports Supabase email/password sign-in/sign-up when configured and Guest Operative callsign persistence offline).

### Real 60 FPS Arena Engine (`/src/components/views/PlayView/`)
- Rebuilt `GameContainer.tsx` with a ref-driven `requestAnimationFrame` simulation loop synchronized to HUD state:
  - Velocity calibration: `BASE_PLAYER_SPEED = 220 px/s` across `Player` and `Enemy` entities.
  - Circle-to-circle collisions (`Distance < Radius_1 + Radius_2`) via `Collision.circleCircle`.
  - Auto-targeting combat loop supporting all 15 seed upgrades (`upg_01`–`upg_15`).
  - Wave cadence: `30s` active swarm phase + `3s` coin-collection breather (`33s` total cycle).
  - Mini-Boss spawns every 5th wave (`ene_04` — *Aegis Commander Drone*, 240 HP, 50 coin reward, alternating 8-way radial bursts and aimed 3-shot laser volleys).
  - Automatic run telemetry submission to `scores` & `player_stats` (Supabase + `localStorage` fallback) using `S = 10t + 25c`.
  - Mobile on-screen D-pad controls & Web Audio synthesized SFX fallback (`/src/services/AudioService.ts`).

### Connected Meta Views
- **HQ (`/hq`)**: Fetches live top 3 leaderboard runs (`getTopScores(3)`), operative display name, last deployment summary, and cumulative lifetime telemetry (`getPlayerTelemetry`).
- **Codex (`/codex`)**: Displays full stat breakdowns (`HP`, `px/s` speeds, coin rewards, damage, cooldowns, computed upgrade DPS), multi-field search (`name`, `title`, `lore`, `description`, `function_desc`, `requirement`), entity inspection `<Modal>`, and `<CodexEmptyState />`.
- **Armory (`/armory`)**: Complete Create / Read / Update / Delete loadout workflow via `useLoadouts()`, working in both Authenticated and Guest modes, with `ValidatedInput` guards, live DPS calculator, in-app `<Modal>` delete confirmation, and 1-click `/play?loadoutId=...` deployment.
- **Leaderboards (`/leaderboards`)**: Live query across time range (`allTime`, `daily`, `weekly`, `monthly`), hero filter (`hero_01`–`hero_06`), callsign search, and sortable metrics (`final_score`, `wave_reached`, `survival_seconds`, `coins_collected`).
- **Profile (`/profile`)**: Displays recent deployments, per-hero stats across `hero_01`–`hero_06`, operative rank progression, dynamic achievement progress (`ach_01`–`ach_04`), callsign editing, and persisted combat/audio preferences.

---

## 2. Automated Verification Results

- **Phase 9 Test Suite** (`npm test` -> `tsx --test tests/phase9.test.ts`):
  - **8 / 8 tests passed** (`0 failed`):
    1. Canonical seed data integrity (`29` entities: `6` heroes, `4` enemies, `15` upgrades, `4` achievements; valid FKs; `ene_04` boss stats).
    2. Canonical scoring formula (`S = 10t + 25c`), negative/fractional clamping, `ScoreManager` integration, and wave estimation.
    3. Speed scaling relative to `BASE_PLAYER_SPEED = 220 px/s` for `Player` and `Enemy`.
    4. Exact circle-to-circle collision math (`Distance < R1 + R2`).
    5. Wave schedule (`30s` active + `3s` breather = `33s`) and Wave 5 Mini-Boss trigger (`ene_04`).
    6. `XPManager` level-up threshold (`100` XP) and 3-card upgrade generation.
    7. Armory loadout input validation constraints.
    8. Achievement unlock threshold evaluation (`ach_01`–`ach_04`).
- **Seed Data Validation** (`npm run db:validate` -> `tsx src/db/validateSeed.ts`):
  - **17 / 17 checks passed** (`0 failed`, `0 warnings`).
- **Production TypeScript & Vite Build** (`npm run build` -> `tsc -b && vite build`):
  - **Passed** (`0 TypeScript errors`, clean production bundle output).
- **Linter** (`npm run lint` -> `oxlint`):
  - **0 errors**.

---

## 3. SQL Schema & Security Audit (`/src/db/schema.sql`)

- **Creation Order**: `upgrades` is created and seeded before `heroes`, satisfying `heroes.starting_upgrade_id REFERENCES upgrades(id)`.
- **Row-Level Security (RLS)**:
  - Seed catalog tables (`heroes`, `enemies`, `upgrades`, `achievements`): Public read-only (`SELECT` allowed, writes restricted).
  - `loadouts`: Scoped to owner (`auth.uid() = user_id`).
  - `scores`: Public read for global leaderboards; insert permitted for authenticated users matching `auth.uid() = user_id` or guest runs (`user_id IS NULL`).
  - `player_stats`: Scoped to owner (`auth.uid() = user_id`).
- **Offline / Preview Resilience**: When `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset, all services cleanly fall back to persisted browser `localStorage` without runtime errors.

---

## 4. Vercel Deployment Configuration (`/vercel.json`)

- Configured Vite build command (`npm run build`) and output directory (`dist`).
- Added SPA fallback rewrite (`/(.*) -> /index.html`) so direct navigation to `/hq`, `/play`, `/codex`, `/armory`, `/leaderboards`, and `/profile` never returns HTTP 404.
- Configured immutable `Cache-Control: max-age=31536000, immutable` headers on `/assets/(.*)`.
- To enable shared remote persistence on Vercel, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Project Environment Variables and execute `/src/db/schema.sql` + `npm run db:seed` against your Supabase project.
