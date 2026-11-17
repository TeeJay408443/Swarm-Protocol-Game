\# SWARM PROTOCOL: SURVIVOR

Full Technical, Architectural, and Game Specification Document (Phases 1–9 Complete) — Revision 2 (Contradiction-Free)

\#\# 1\. EXECUTIVE SUMMARY \&amp; PROJECT ARCHITECTURE

Swarm Protocol: Survivor is a web-based, 2D top-down arena horde survival video game delivered as a full single-page application (SPA). Designed as an end-to-end Web Development class project, the application merges a 60 FPS HTML5 Canvas engine with a PostgreSQL backend (Supabase) and a high-tech "Tactical Command Terminal" UI.

\*\*SYSTEM ARCHITECTURE MATRIX\*\*

\| Core Stack: React \+ HTML5 Canvas \+ Tailwind CSS              \| Backend / Database: Supabase (PostgreSQL \+ RLS)               \|  
\| \------------------------------------------------------------ \| \------------------------------------------------------------- \|  
\| State Handling: React State (UI) / Mutable Ref (60 FPS Loop) \| Deployment Target: Vercel (Continuous Integration)            \|  
\| Primary Palette: Slate Carbon (\#0B0F19), Cyan (\#00F0FF)      \| Secondary Palette: Hazard Gold (\#FFD700), Alert Red (\#FF0055) \|

\*\*World Units Convention:\*\* All in-game speeds are multipliers of the base player velocity of \*\*220 px/s\*\* (e.g., 1.3x Speed \= 286 px/s). All distances and radii are expressed in \*\*pixels\*\*.

\#\# 2\. GAME DESIGN, PHYSICS \&amp; WAVE MECHANICS

The game loop executes frame updates at 60 FPS via requestAnimationFrame without triggering React re-renders. Player input translates directly into 8-directional movement, while weapons auto-target the nearest swarm units within detection range.

\- \*\*Game State Machine:\*\* MENU → LOADOUT\\\_SELECT → PLAYING ↔ LEVEL\\\_UP\\\_PAUSE → GAME\\\_OVER  
\- \*\*Wave Pacing:\*\* Timed 30-second waves followed by a 3-second WAVE\\\_BREATHER window (zero monster spawns, safe coin collection).  
\- \*\*Boss Escalation:\*\* Every 5th wave spawns the Mini-Boss \*\*Aegis Commander Drone (ene\\\_04)\*\* — 240 HP (6× the Spore Zombie baseline), a radial bullet burst plus aimed laser volley pattern, and a 50-coin drop (5× standard drop multiplier).  
\- \*\*Collision Physics:\*\* Circle-to-Circle collision detection where hit occurs when Distance \&lt; (Radius₁ \+ Radius₂).  
\- \*\*Scoring Formula:\*\* Final Score \= (Seconds Survived × 10\) \+ (Coins Collected × 25\)  
\- \*\*Run Telemetry:\*\* On every run, the engine tracks enemies defeated and the longest streak of consecutive waves survived without taking damage; both are persisted to the \`scores\` table at Game Over and aggregated into \`player\_stats\`.

\#\# 3\. COMPLETE DATABASE SEED CATALOG (29 ENTITIES)

\#\#\# 3.1 Playable Heroes (6 Entries)

\| ID       \| HERO NAME              \| ARCHETYPE    \| BASE STATS           \| STARTING UPGRADE               \| LORE PROFILE                                                            \|  
\| \-------- \| \---------------------- \| \------------ \| \-------------------- \| \------------------------------ \| \----------------------------------------------------------------------- \|  
\| hero\\\_01 \| Vanguard Blade         \| Melee Tank   \| 150 HP / 1.0x Speed  \| Arc Slash (upg\\\_12)            \| Heavy frontline unit built for close-range crowd clearing.              \|  
\| hero\\\_02 \| Outpost Ranger         \| Marksman     \| 90 HP / 1.3x Speed   \| Dual Kinetic Pistols (upg\\\_13) \| High-speed scout designed for long-range kiting tactics.                \|  
\| hero\\\_03 \| Tech Engineer          \| Specialist   \| 110 HP / 1.0x Speed  \| Companion Robot (upg\\\_01)      \| Drone operator who lets autonomous units handle the swarm.              \|  
\| hero\\\_04 \| Chrono Operative       \| Speedster    \| 85 HP / 1.4x Speed   \| Temporal Echo (upg\\\_14)        \| Time-warping agent who leaves damaging phase shadows.                   \|  
\| hero\\\_05 \| Shield Paladin         \| Defender     \| 175 HP / 0.85x Speed \| Plasma Barrier (upg\\\_15)       \| Heavily armored fortress who knocks back enemies on collision.          \|  
\| hero\\\_06 \| Pyrotechnic Specialist \| Area Control \| 100 HP / 1.1x Speed  \| Flamethrower Pulse (upg\\\_10)   \| Combat engineer who incinerates chokepoints and entrenched swarm nests. \|

\#\#\# 3.2 Swarm Enemies (4 Entries)

\| ID      \| ENEMY NAME            \| CATEGORY      \| BASE STATS           \| COIN VALUE \| BEHAVIOR DESCRIPTION                                                                                                                                      \|  
\| \------- \| \--------------------- \| \------------- \| \-------------------- \| \---------- \| \--------------------------------------------------------------------------------------------------------------------------------------------------------- \|  
\| ene\\\_01 \| Spore Zombie          \| Swarm         \| 40 HP / 0.50x Speed  \| 1 Coin     \| Bioluminescent infected corpse swarming in dense waves.                                                                                                   \|  
\| ene\\\_02 \| Acidic Chitin Bug     \| Fast Flanker  \| 15 HP / 1.10x Speed  \| 2 Coins    \| Mutated chitin insect that moves in quick zig-zag bursts.                                                                                                 \|  
\| ene\\\_03 \| Aegis Tech Drone      \| Ranged Sniper \| 65 HP / 0.75x Speed  \| 5 Coins    \| Hovering rogue drone that fires red laser bolts at the player.                                                                                            \|  
\| ene\\\_04 \| Aegis Commander Drone \| Mini-Boss     \| 240 HP / 0.60x Speed \| 50 Coins   \| Armored command unit spawning every 5th wave; alternates radial bullet bursts with aimed laser volleys. 6× Spore Zombie HP and a 5× coin drop multiplier. \|

\#\#\# 3.3 Weapons \&amp; Utilities (15 Entries)

\| ID      \| ITEM NAME             \| CATEGORY     \| PRIMARY FUNCTION                                 \| BASE STATS                     \|  
\| \------- \| \--------------------- \| \------------ \| \------------------------------------------------ \| \------------------------------ \|  
\| upg\\\_01 \| Companion Robot       \| Summon       \| Autonomous drone following player \&amp; firing   \| 15 dmg / 0.8s rate             \|  
\| upg\\\_02 \| Rocket Barrage        \| AoE Weapon   \| Fires explosive rockets into dense crowds        \| 45 dmg / 2.5s CD               \|  
\| upg\\\_03 \| Orbital Laser         \| Beam Weapon  \| Sweeps continuous energy beam around player      \| 30 dmg / 4.0s CD               \|  
\| upg\\\_04 \| Magnet Pulse          \| Utility      \| Pulls all map coins directly to player           \| 0 dmg / 10.0s CD               \|  
\| upg\\\_05 \| Bouncing Sawblade     \| Projectile   \| Heavy sawblade bouncing off canvas edges         \| 25 dmg / 3.0s CD / 5 bounces   \|  
\| upg\\\_06 \| Chain Tesla           \| Ranged       \| Arcs electric lightning across up to 5 foes      \| 20 dmg / 1.5s CD               \|  
\| upg\\\_07 \| Orbital Strike Beacon \| Heavy AoE    \| Drops massive satellite blast on target area     \| 100 dmg / 6.0s CD              \|  
\| upg\\\_08 \| Cryo-Aura Field       \| Passive      \| Emits freezing cold aura slowing foes by 40%     \| 0 dmg / passive / 160px radius \|  
\| upg\\\_09 \| Emergency Nanites     \| Passive      \| Regenerates 1% max player HP continuously        \| \+1% HP / 5.0s                  \|  
\| upg\\\_10 \| Flamethrower Pulse    \| Cone Weapon  \| Spray cone of fire dealing damage over time      \| 12 dmg/sec / 120px cone        \|  
\| upg\\\_11 \| Plasma Shield Matrix  \| Defensive    \| Blocks incoming hit and fires shockwave          \| 1 shield / 12.0s CD            \|  
\| upg\\\_12 \| Arc Slash             \| Melee Weapon \| Sweeping melee arc damaging all foes in front    \| 35 dmg / 0.9s rate / 90px arc  \|  
\| upg\\\_13 \| Dual Kinetic Pistols  \| Projectile   \| Twin pistols auto-firing at nearest targets      \| 10 dmg / 0.4s rate per pistol  \|  
\| upg\\\_14 \| Temporal Echo         \| Summon       \| Spawns a phase shadow that mimics player attacks \| 18 dmg / 2.0s CD               \|  
\| upg\\\_15 \| Plasma Barrier        \| Defensive    \| Absorbs one hit and knocks back nearby foes      \| 1 charge / 8.0s CD             \|

\#\#\# 3.4 Player Achievements (4 Entries)

\| ID      \| ACHIEVEMENT TITLE \| UNLOCK REQUIREMENT                                \| BACKING DATA SOURCE                                \| BADGE REWARD      \|  
\| \------- \| \----------------- \| \------------------------------------------------- \| \-------------------------------------------------- \| \----------------- \|  
\| ach\\\_01 \| First Contact     \| Defeat 100 total swarm enemies                    \| \`player\_stats.total\_enemies\_defeated ≥ 100\`        \| Bronze Bug Hunter \|  
\| ach\\\_02 \| Gold Hoarder      \| Gather 500 coins in a single run                  \| \`scores.coins\_collected ≥ 500\` (any single run)    \| Coin Master       \|  
\| ach\\\_03 \| Swarmslayer       \| Defeat 1,000 total enemies across all runs        \| \`player\_stats.total\_enemies\_defeated ≥ 1000\`       \| Silver Vanquisher \|  
\| ach\\\_04 \| Untouchable       \| Survive 3 consecutive waves without taking damage \| \`player\_stats.longest\_damage\_free\_wave\_streak ≥ 3\` \| Gold Aegis        \|

\#\# 4\. POSTGRESQL DATABASE SCHEMA \&amp; SECURITY SCRIPT

\> \*\*Seed order matters:\*\* \`upgrades\` must be created (and seeded) before \`heroes\`, because \`heroes.starting\_upgrade\_id\` references \`public.upgrades(id)\`.

\`\`\`sql  
\-- 1\. SEED ENTITY TABLES (Public Read-Only)  
\-- Note: upgrades is created first because heroes references it.  
CREATE TABLE public.upgrades (  
    id TEXT PRIMARY KEY,  
    name TEXT NOT NULL,  
    category TEXT NOT NULL,  
    function\_desc TEXT NOT NULL,  
    damage INTEGER NOT NULL DEFAULT 0,  
    cooldown\_s NUMERIC(4,1) NOT NULL DEFAULT 0,  
    special TEXT  
);

CREATE TABLE public.enemies (  
    id TEXT PRIMARY KEY,  
    name TEXT NOT NULL,  
    category TEXT NOT NULL,  
    hp INTEGER NOT NULL,  
    speed NUMERIC(3,2) NOT NULL,  
    coin\_value INTEGER NOT NULL,  
    description TEXT NOT NULL  
);

CREATE TABLE public.achievements (  
    id TEXT PRIMARY KEY,  
    title TEXT NOT NULL,  
    requirement TEXT NOT NULL,  
    reward\_badge TEXT NOT NULL  
);

CREATE TABLE public.heroes (  
    id TEXT PRIMARY KEY,  
    name TEXT NOT NULL,  
    archetype TEXT NOT NULL,  
    hp INTEGER NOT NULL,  
    speed NUMERIC(3,2) NOT NULL,  
    starting\_upgrade\_id TEXT REFERENCES public.upgrades(id),  
    lore TEXT NOT NULL  
);

\-- 2\. DYNAMIC USER DATA TABLES (CRUD, High Scores & Lifetime Telemetry)  
CREATE TABLE public.loadouts (  
    id UUID DEFAULT gen\_random\_uuid() PRIMARY KEY,  
    user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  
    loadout\_name TEXT NOT NULL,  
    hero\_id TEXT REFERENCES public.heroes(id),  
    primary\_upgrade\_id TEXT REFERENCES public.upgrades(id),  
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE TABLE public.scores (  
    id UUID DEFAULT gen\_random\_uuid() PRIMARY KEY,  
    user\_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  
    player\_name TEXT NOT NULL DEFAULT 'Guest Operative',  
    final\_score INTEGER NOT NULL,  
    survival\_seconds INTEGER NOT NULL,  
    coins\_collected INTEGER NOT NULL,  
    enemies\_defeated INTEGER NOT NULL DEFAULT 0,  
    damage\_free\_wave\_streak INTEGER NOT NULL DEFAULT 0,  
    hero\_used TEXT NOT NULL REFERENCES public.heroes(id),  
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE TABLE public.player\_stats (  
    user\_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,  
    total\_enemies\_defeated INTEGER NOT NULL DEFAULT 0,  
    total\_coins\_collected INTEGER NOT NULL DEFAULT 0,  
    longest\_damage\_free\_wave\_streak INTEGER NOT NULL DEFAULT 0,  
    updated\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- 3\. ENABLE ROW LEVEL SECURITY (RLS) POLICIES  
ALTER TABLE public.heroes ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.enemies ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.upgrades ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.loadouts ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.player\_stats ENABLE ROW LEVEL SECURITY;

\-- Public read access for all seed/catalog data  
CREATE POLICY "Public read heroes" ON public.heroes FOR SELECT USING (true);  
CREATE POLICY "Public read enemies" ON public.enemies FOR SELECT USING (true);  
CREATE POLICY "Public read upgrades" ON public.upgrades FOR SELECT USING (true);  
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);

\-- Scores: public read (leaderboards) \+ insert open to guests,  
\-- but a signed-in user can only post under their own id (anti-spoofing).  
CREATE POLICY "Public read scores" ON public.scores FOR SELECT USING (true);  
CREATE POLICY "Insert scores" ON public.scores  
    FOR INSERT WITH CHECK (user\_id IS NULL OR auth.uid() \= user\_id);

\-- Loadouts: full CRUD scoped to the owning user  
CREATE POLICY "Read user loadouts" ON public.loadouts  
    FOR SELECT USING (auth.uid() \= user\_id);  
CREATE POLICY "Create user loadouts" ON public.loadouts  
    FOR INSERT WITH CHECK (auth.uid() \= user\_id);  
CREATE POLICY "Update user loadouts" ON public.loadouts  
    FOR UPDATE USING (auth.uid() \= user\_id) WITH CHECK (auth.uid() \= user\_id);  
CREATE POLICY "Delete user loadouts" ON public.loadouts  
    FOR DELETE USING (auth.uid() \= user\_id);

\-- Lifetime telemetry: read/write restricted to the owning user  
CREATE POLICY "Read own stats" ON public.player\_stats  
    FOR SELECT USING (auth.uid() \= user\_id);  
CREATE POLICY "Create own stats" ON public.player\_stats  
    FOR INSERT WITH CHECK (auth.uid() \= user\_id);  
CREATE POLICY "Update own stats" ON public.player\_stats  
    FOR UPDATE USING (auth.uid() \= user\_id) WITH CHECK (auth.uid() \= user\_id);  
\`\`\`

\#\# 5\. WEB APPLICATION VIEWS \&amp; CUSTOM FEATURES

\#\#\# 5.1 Application Views Structure

1\. \*\*HQ Dashboard View:\*\* Tactical briefing hub, instant launch action button, and Top 3 global score summary.  
2\. \*\*Play View (HTML5 Canvas):\*\* 60 FPS gameplay engine, dynamic HUD overlay, Level-Up card modal, and Game Over telemetry posting.  
3\. \*\*Swarm Codex View:\*\* Searchable database browser for all 29 entities with multi-filtering and attribute sorting.  
4\. \*\*Armory View (CRUD Module):\*\* Loadout builder with Create, Read, Update, Delete features and real-time stat calculation previews.  
5\. \*\*Leaderboards View:\*\* Filterable global high score ranking table displaying time survived, coins, and hero selection.  
6\. \*\*Profile \&amp; Badges View:\*\* Lifetime player telemetry hub (from \`player\_stats\`) and dynamic achievement badge progress gallery.

\#\#\# 5.2 The 10 Custom Web Features

\| \#   \| FEATURE MODULE               \| TECHNICAL IMPLEMENTATION \&amp; BEHAVIOR DESCRIPTION                                                                                                                                                                      \|  
\| \--- \| \---------------------------- \| \------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ \|  
\| 1   \| Live Text Search             \| Client-side search input dynamically filtering Codex entities across name, title, and lore.                                                                                                                              \|  
\| 2   \| Category Multi-Filter        \| Filter chips dynamically isolating Heroes, Enemies, Weapons, and Achievements.                                                                                                                                           \|  
\| 3   \| Attribute Sorting Engine     \| Dropdown selectors sorting entity cards by HP/Damage (from \`heroes.hp\`, \`enemies.hp\`, \`upgrades.damage\`) and leaderboards by High Score.                                                                                 \|  
\| 4   \| Loadout CRUD Module          \| Full Create/Read/Update/Delete operational workflow connected to Supabase \`loadouts\`.                                                                                                                                    \|  
\| 5   \| Dynamic Stat Calculator      \| Calculates starting player HP (from \`heroes.hp\`) and DPS previews (from \`upgrades.damage ÷ cooldown\_s\`) live inside the Armory form.                                                                                     \|  
\| 6   \| Real-Time Score Sync         \| Automatic score payload submission to Supabase \`scores\` table upon Game Over, including \`enemies\_defeated\` and \`damage\_free\_wave\_streak\`; authenticated runs also upsert \`player\_stats\`.                                 \|  
\| 7   \| Achievement Tracker          \| Measures \`player\_stats\` lifetime metrics (total kills, damage-free streaks) and single-run coin counts against threshold goals with animated percentage progress bars. Guests see per-session progress via localStorage. \|  
\| 8   \| Audio \&amp; SFX Controller   \| Master mute toggle and volume preference persistence saved via localStorage.                                                                                                                                             \|  
\| 9   \| High-Contrast Theme Switcher \| Accessibility toggle switching between Tactical Slate Dark Mode and High-Contrast Mode.                                                                                                                                  \|  
\| 10  \| Toast Notification System    \| Floating animated alerts delivering feedback for CRUD actions and game events.                                                                                                                                           \|

\#\# 6\. VERCEL DEPLOYMENT \&amp; FINAL CHECKLIST

\*\*DEPLOYMENT ENVIRONMENT VARIABLES\*\*

\`\`\`text  
VITE\_SUPABASE\_URL=https\://your-project-id.supabase.co  
VITE\_SUPABASE\_ANON\_KEY=your-supabase-anon-key-here  
\`\`\`

\- \*\*Build Verification:\*\* Execute \`npm run build\` locally to verify clean bundle creation.  
\- \*\*Seed Order Audit:\*\* Seed \`upgrades\` before \`heroes\` (FK dependency on \`starting\_upgrade\_id\`).  
\- \*\*Database RLS Audit:\*\* Ensure public read access for seed tables and \`scores\`, and user-scoped access for \`loadouts\` and \`player\_stats\`.  
\- \*\*User Access Testing:\*\* Verify Guest Operative gameplay flow (null \`user\_id\` score inserts, session-only achievements) and Authenticated Loadout CRUD flow (plus lifetime achievement tracking).

\#\# 7\. REVISION 2 CHANGE LOG (CONTRADICTIONS FIXED)

1\. \*\*Entity count corrected:\*\* catalog contained 24 rows but claimed 22\. Catalog is now 6 heroes \+ 4 enemies \+ 15 upgrades \+ 4 achievements \= \*\*29 entities\*\*, and all references (Section 3 title, Codex view) updated to 29\.  
2\. \*\*Missing hero weapons added:\*\* Arc Slash (upg\\\_12), Dual Kinetic Pistols (upg\\\_13), Temporal Echo (upg\\\_14), and Plasma Barrier (upg\\\_15) were referenced as hero starting upgrades but had no catalog entries. All 6 starting upgrades now exist in the weapons catalog, and hero rows cite the exact upgrade IDs.  
3\. \*\*\`heroes.starting\_upgrade\_id\` now enforces its foreign key\*\* (\`REFERENCES public.upgrades(id)\`), matching the \`loadouts\` pattern; seed order documented.  
4\. \*\*\`upgrades\` table gained stat columns\*\* (\`damage\`, \`cooldown\_s\`, \`special\`) matching the catalog's BASE STATS, so the Dynamic Stat Calculator (DPS) and HP/Damage sorting have a data source.  
5\. \*\*Mini-Boss defined:\*\* Aegis Commander Drone added as \`ene\_04\` (240 HP \= 6× Spore Zombie baseline, 0.60x speed, 50 coins, radial burst \+ aimed laser volley), replacing the undefined boss referenced in Section 2\.  
6\. \*\*Achievement tracking made computable:\*\* new \`player\_stats\` table (lifetime kills, coins, damage-free streak) plus \`scores.enemies\_defeated\` and \`scores.damage\_free\_wave\_streak\` columns back ach\\\_01, ach\\\_03, and ach\\\_04; each achievement lists its data source.  
7\. \*\*SQL syntax repaired:\*\* trailing comma removed from the \`upgrades\` CREATE TABLE; the truncated \`loadouts\` RLS policies completed (SELECT, INSERT, UPDATE, DELETE all scoped to \`auth.uid() \= user\_id\`).  
8\. \*\*Score insert anti-spoofing:\*\* \`Insert scores\` policy changed from \`WITH CHECK (true)\` to \`(user\_id IS NULL OR auth.uid() \= user\_id)\` so guests can still post but no one can post under another user's id.  
9\. \*\*Speed typing unified:\*\* \`enemies.speed\` changed from TEXT ("Slow/Fast/Med") to \`NUMERIC(3,2)\` multipliers, matching \`heroes.speed\`; numeric speeds assigned to all enemies.  
10\. \*\*Units standardized:\*\* Cryo-Aura Field radius changed from "4m" to 160px; all distances now in pixels under a documented world-units convention (220 px/s base speed).  
11\. \*\*\`scores.hero\_used\` now references \`public.heroes(id)\`\*\* instead of free text, keeping leaderboard hero filters clean.  
12\. \*\*Tone fix:\*\* hero\\\_06 lore "grass fields" → "entrenched swarm nests"; ene\\\_02 "mutated grass insect" → "mutated chitin insect," consistent with the sci-fi arena setting.  
13\. \*\*Bouncing Sawblade given an explicit 3.0s cooldown\*\* so every active weapon has a complete damage/cooldown profile for the DPS calculator.  
