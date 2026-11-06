-- PostgreSQL Database Schema for Swarm Protocol: Survivor
-- Run this in Supabase SQL Editor before seeding

-- ============================================
-- 1. SEED ENTITY TABLES (Public Read-Only)
-- Note: upgrades is created first because heroes references it.
-- ============================================

CREATE TABLE public.upgrades (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    function_desc TEXT NOT NULL,
    damage INTEGER NOT NULL DEFAULT 0,
    cooldown_s NUMERIC(4,1) NOT NULL DEFAULT 0,
    special TEXT
);

CREATE TABLE public.enemies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    hp INTEGER NOT NULL,
    speed NUMERIC(3,2) NOT NULL,
    coin_value INTEGER NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    requirement TEXT NOT NULL,
    reward_badge TEXT NOT NULL
);

CREATE TABLE public.heroes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    archetype TEXT NOT NULL,
    hp INTEGER NOT NULL,
    speed NUMERIC(3,2) NOT NULL,
    starting_upgrade_id TEXT REFERENCES public.upgrades(id),
    lore TEXT NOT NULL
);

-- ============================================
-- 2. DYNAMIC USER DATA TABLES (CRUD, High Scores & Lifetime Telemetry)
-- ============================================

CREATE TABLE public.loadouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    loadout_name TEXT NOT NULL,
    hero_id TEXT REFERENCES public.heroes(id),
    primary_upgrade_id TEXT REFERENCES public.upgrades(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    player_name TEXT NOT NULL DEFAULT 'Guest Operative',
    final_score INTEGER NOT NULL,
    survival_seconds INTEGER NOT NULL,
    coins_collected INTEGER NOT NULL,
    enemies_defeated INTEGER NOT NULL DEFAULT 0,
    damage_free_wave_streak INTEGER NOT NULL DEFAULT 0,
    hero_used TEXT NOT NULL REFERENCES public.heroes(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.player_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_enemies_defeated INTEGER NOT NULL DEFAULT 0,
    total_coins_collected INTEGER NOT NULL DEFAULT 0,
    longest_damage_free_wave_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enemies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loadouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Public read access for all seed/catalog data
CREATE POLICY "Public read heroes" ON public.heroes FOR SELECT USING (true);
CREATE POLICY "Public read enemies" ON public.enemies FOR SELECT USING (true);
CREATE POLICY "Public read upgrades" ON public.upgrades FOR SELECT USING (true);
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);

-- Scores: public read (leaderboards) + insert open to guests,
-- but a signed-in user can only post under their own id (anti-spoofing).
CREATE POLICY "Public read scores" ON public.scores FOR SELECT USING (true);
CREATE POLICY "Insert scores" ON public.scores
    FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Loadouts: full CRUD scoped to the owning user
CREATE POLICY "Read user loadouts" ON public.loadouts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Create user loadouts" ON public.loadouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update user loadouts" ON public.loadouts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete user loadouts" ON public.loadouts
    FOR DELETE USING (auth.uid() = user_id);

-- Lifetime telemetry: read/write restricted to the owning user
CREATE POLICY "Read own stats" ON public.player_stats
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Create own stats" ON public.player_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own stats" ON public.player_stats
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
