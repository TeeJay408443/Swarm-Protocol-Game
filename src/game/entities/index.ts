/**
 * Game Entities
 * Phase 7: Build the Game - Entity Exports
 */

export { Player, type PlayerOptions } from './Player'
export {
  Enemy,
  checkEnemyAoeHit,
  type EnemyType,
  type EnemyOptions,
  type EnemyProjectile,
  type EnemyAoeProjectile
} from './Enemy'
export { Projectile, type ProjectileType, type ProjectileOptions, type ProjectileHitInfo } from './Projectile'
export { Coin, type CoinType, type CoinOptions } from './Coin'
export { Summon, type SummonKind, type SummonOptions, type SummonAttackResult } from './Summon'
