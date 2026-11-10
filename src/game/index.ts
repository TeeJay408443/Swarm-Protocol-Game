/**
 * Game Systems Index
 * Phase 7: Build the Game - Exports all game systems and components
 */

// Phase 3 Systems
export { WaveManager } from './WaveManager'
export type { Wave, WaveConfig, SpawnPoint } from './WaveManager'

export { XPManager } from './XPManager'
export type { LevelUpCard, ScoreBreakdown } from '../types/game'

export { AutoTargeting } from './AutoTargeting'
export type { TargetingMode, TargetInfo } from './AutoTargeting'

export { ScoreManager } from './ScoreManager'
export type { ScoreData } from './ScoreManager'

// Phase 7 Systems
export { RenderSystem } from './systems/RenderSystem'
export { CollisionSystem } from './systems/CollisionSystem'
export { CombatSystem } from './systems/CombatSystem'
export { SpawnSystem } from './systems/SpawnSystem'
export type { Renderable, RenderLayer, RenderStats } from './systems/RenderSystem'
export type { CollisionEvent, CollisionResult } from './systems/CollisionSystem'
export type { CombatStats, DamageInfo, KillInfo } from './systems/CombatSystem'
export type { SpawnPoint as SpawnPointType, SpawnGroup, SpawnWave, SpawnStats } from './systems/SpawnSystem'

// Phase 7 Engine
export { Camera, type CameraOptions } from './engine/Camera'
export { InputManager } from './engine/InputManager'
export { GameEngine, type GameEngineOptions, type GameStats } from './engine/GameEngine'

// Phase 7 Entities
export { Player, type PlayerOptions } from './entities/Player'
export { Enemy, type EnemyType, type EnemyOptions, type EnemyProjectile } from './entities/Enemy'
export { Projectile, type ProjectileType, type ProjectileOptions, type ProjectileHitInfo } from './entities/Projectile'
export { Coin, type CoinType, type CoinOptions } from './entities/Coin'

// Phase 7 Utilities
export { Vector2, Vectors } from './utils/vector'
export { Collision } from './utils/collision'
export { Easing } from './utils/easing'
export type { Vector2 as Vector2Type, Rectangle, Circle, Point, Line } from './utils/collision'
