/**
 * Game Systems
 * Phase 7: Build the Game - System Exports
 */

export { RenderSystem } from './RenderSystem'
export { CollisionSystem } from './CollisionSystem'
export { CombatSystem } from './CombatSystem'
export { SpawnSystem } from './SpawnSystem'

export type { Renderable, RenderLayer, RenderStats } from './RenderSystem'
export type { CollisionEvent, CollisionResult } from './CollisionSystem'
export type { CombatStats, DamageInfo, KillInfo } from './CombatSystem'
export type { SpawnPoint, SpawnGroup, SpawnWave, SpawnStats } from './SpawnSystem'
