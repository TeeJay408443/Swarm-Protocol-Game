// Database Services
export { supabase, type SupabaseClient, type Session, type User } from './supabase'
export {
  getHeroes,
  getHero,
  getEnemies,
  getEnemy,
  getUpgrades,
  getUpgrade,
  getAchievements,
  getAchievement,
  getAllSeedData,
  searchByName,
  filterByCategory,
  sortEntities
} from './database'
export type { HeroesRow, EnemiesRow, UpgradesRow, AchievementsRow } from '../types/database'

// Loadout Services
export {
  createLoadout,
  getLoadouts,
  getLoadout,
  getExtendedLoadout,
  updateLoadout,
  deleteLoadout,
  isLoadoutOwner,
  getUserLoadoutsWithDetails,
  validateLoadoutInput
} from './loadouts'
export type { ExtendedLoadout, CreateLoadoutInput, UpdateLoadoutInput } from './loadouts'

// Audio Service
export {
  AudioService,
  getAudioService,
  initializeAudio,
  playSound,
  playMusic,
  stopMusic
} from './AudioService'
export type { AudioSettings, SoundType, AudioServiceConfig } from './AudioService'
