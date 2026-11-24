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

// Score, Telemetry & Achievement Services
export {
  calculateScoreFormula,
  estimateWaveFromSeconds,
  getOperativeProfile,
  saveOperativeProfile,
  getLocalPlayerTelemetry,
  evaluateAchievements,
  submitScore,
  getScores,
  getTopScores,
  getPlayerTelemetry
} from './scores'
export type {
  OperativeProfile,
  LocalRunRecord,
  HeroAggregateStat,
  LocalPlayerTelemetry,
  AchievementProgress,
  SubmitScoreInput,
  GetScoresOptions
} from './scores'

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

// Hero Mastery Service
export {
  HERO_MASTERY_TIERS,
  getHeroMasteryTiers,
  computeHeroMasteryBonuses,
  formatMasteryBonusSummary,
  evaluateHeroMasteryProgress,
  getHeroMasteryAccountState,
  getHeroMasteryProgress,
  recordHeroRoundsCompleted,
  useHeroMastery
} from './heroMastery'
export type {
  HeroMasteryBonuses,
  HeroMasteryTier,
  HeroMasteryProgress,
  HeroMasteryAccountState
} from './heroMastery'

// Hero Signature Coin Upgrades Service
export {
  getHeroUpgradesAccountState,
  getHeroUpgradeLevel,
  getAllHeroUpgradeLevels,
  purchaseHeroSignatureUpgrade,
  subscribeHeroUpgrades,
  useHeroUpgrades
} from './heroUpgrades'
export type {
  HeroUpgradesAccountState,
  PurchaseHeroUpgradeResult
} from './heroUpgrades'

// Hero Unlocks Service
export {
  getHeroUnlocksAccountState,
  isHeroUnlocked,
  unlockHeroWithCoins,
  checkAndSyncMilestoneHeroUnlocks,
  setHeroUnlockedForDev,
  subscribeHeroUnlocks,
  useHeroUnlocks
} from './heroUnlocks'
export type {
  HeroUnlocksAccountState,
  UnlockHeroResult
} from './heroUnlocks'
