# Phase 5: Foundation

## Objective
Execute Supabase SQL migrations, scaffold React folder hierarchy, and setup Auth access rules.

## Core Deliverables

### 1. Database Schema & Supabase Setup
- [ ] Execute SQL migrations for 6 tables:
  - `upgrades` - Weapon/ability upgrades
  - `enemies` - Enemy definitions
  - `heroes` - Player hero definitions
  - `achievements` - Player achievements
  - `loadouts` - User-created loadouts
  - `scores` - Player scores and statistics
- [ ] Implement Row-Level Security (RLS) policies
- [ ] Create database types in TypeScript
- [ ] Setup Supabase client with proper configuration

### 2. React Folder Hierarchy
- [ ] Organize existing components into proper structure
- [ ] Create `src/pages/` for page-level components
- [ ] Create `src/hooks/` for custom React hooks
- [ ] Create `src/services/` for API/services layer
- [ ] Create `src/utils/` for utility functions
- [ ] Create `src/context/` for React context providers

### 3. Auth Access Rules
- [ ] Setup Supabase Auth configuration
- [ ] Create auth context provider
- [ ] Implement login/logout functionality
- [ ] Add user session management
- [ ] Create protected route wrapper

## Technical Specifications

### Database Tables

#### 1. upgrades
```sql
- id: uuid (primary key)
- name: text
- category: text
- function_desc: text
- damage: integer
- cooldown_s: float
- special: text (nullable)
```

#### 2. enemies
```sql
- id: uuid (primary key)
- name: text
- category: text
- hp: integer
- speed: float
- coin_value: integer
- description: text
```

#### 3. heroes
```sql
- id: uuid (primary key)
- name: text
- archetype: text
- hp: integer
- speed: float
- starting_upgrade_id: uuid (foreign key)
- lore: text
```

#### 4. achievements
```sql
- id: uuid (primary key)
- title: text
- requirement: text
- reward_badge: text
```

#### 5. loadouts
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- loadout_name: text
- hero_id: uuid (foreign key to heroes)
- primary_upgrade_id: uuid (foreign key to upgrades)
- created_at: timestamp
```

#### 6. scores
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users, nullable for guests)
- player_name: text
- final_score: integer
- survival_seconds: integer
- coins_collected: integer
- enemies_defeated: integer
- damage_free_wave_streak: integer
- hero_used: text
- created_at: timestamp
```

### RLS Policies
- Public read access for seed data tables (upgrades, enemies, heroes, achievements)
- User-specific access for loadouts and scores
- Admin access for all tables

### Folder Structure
```
src/
├── components/
│   ├── layout/
│   ├── ui/
│   └── views/
├── context/
│   └── AuthContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useSupabase.ts
│   └── useLocalStorage.ts
├── pages/
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   └── ...
├── services/
│   ├── supabase.ts
│   ├── auth.ts
│   └── database.ts
├── utils/
│   ├── constants.ts
│   └── helpers.ts
└── types/
    ├── database.ts
    └── game.ts
```

## Dependencies
- supabase (latest)
- @supabase/supabase-js
- react-router-dom

## Next Phase
Phase 6: Core Build - Web application & CRUD UI
