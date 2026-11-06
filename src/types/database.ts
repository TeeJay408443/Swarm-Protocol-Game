// Database Types for Swarm Protocol: Survivor

// ============================================
// SEED ENTITIES (Public Read-Only)
// ============================================

export interface Upgrade {
  id: string
  name: string
  category: string
  function_desc: string
  damage: number
  cooldown_s: number
  special: string | null
}

export interface Enemy {
  id: string
  name: string
  category: string
  hp: number
  speed: number
  coin_value: number
  description: string
}

export interface Achievement {
  id: string
  title: string
  requirement: string
  reward_badge: string
}

export interface Hero {
  id: string
  name: string
  archetype: string
  hp: number
  speed: number
  starting_upgrade_id: string
  lore: string
}

// ============================================
// USER DATA TABLES (CRUD)
// ============================================

export interface Loadout {
  id: string
  user_id: string | null
  loadout_name: string
  hero_id: string | null
  primary_upgrade_id: string | null
  created_at: string
}

export interface Score {
  id: string
  user_id: string | null
  player_name: string
  final_score: number
  survival_seconds: number
  coins_collected: number
  enemies_defeated: number
  damage_free_wave_streak: number
  hero_used: string
  created_at: string
}

export interface PlayerStats {
  user_id: string
  total_enemies_defeated: number
  total_coins_collected: number
  longest_damage_free_wave_streak: number
  updated_at: string
}

// ============================================
// DATABASE ROW TYPES (for Supabase)
// ============================================

export interface UpgradesRow {
  id: string
  name: string
  category: string
  function_desc: string
  damage: number
  cooldown_s: number
  special: string | null
}

export interface EnemiesRow {
  id: string
  name: string
  category: string
  hp: number
  speed: number
  coin_value: number
  description: string
}

export interface AchievementsRow {
  id: string
  title: string
  requirement: string
  reward_badge: string
}

export interface HeroesRow {
  id: string
  name: string
  archetype: string
  hp: number
  speed: number
  starting_upgrade_id: string
  lore: string
}

export interface LoadoutsRow {
  id: string
  user_id: string
  loadout_name: string
  hero_id: string
  primary_upgrade_id: string
  created_at: string
}

export interface ScoresRow {
  id: string
  user_id: string | null
  player_name: string
  final_score: number
  survival_seconds: number
  coins_collected: number
  enemies_defeated: number
  damage_free_wave_streak: number
  hero_used: string
  created_at: string
}

export interface PlayerStatsRow {
  user_id: string
  total_enemies_defeated: number
  total_coins_collected: number
  longest_damage_free_wave_streak: number
  updated_at: string
}
