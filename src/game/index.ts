/**
 * Game Systems Index
 * Phase 3: Game Design - Exports all game systems
 */

export { WaveManager } from './WaveManager'
export type { Wave, WaveConfig, SpawnPoint } from './WaveManager'

export { XPManager } from './XPManager'
export type { LevelUpCard, ScoreBreakdown } from '../types/game'

export { AutoTargeting } from './AutoTargeting'
export type { TargetingMode, TargetInfo } from './AutoTargeting'

export { ScoreManager } from './ScoreManager'
export type { ScoreData } from './ScoreManager'
