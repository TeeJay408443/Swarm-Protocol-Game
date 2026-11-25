export const ENDLESS_MODIFIERS = [
  {
    id: 'boss_tempo',
    name: 'Boss Tempo',
    description: 'Bosses fire and launch special attacks 20% more often.',
    accentColor: '#FB7185'
  },
  {
    id: 'scarce_repairs',
    name: 'Scarce Repairs',
    description: 'All healing restores 50% less health.',
    accentColor: '#FBBF24'
  },
  {
    id: 'hazard_pulse',
    name: 'Hazard Pulse',
    description: 'A warning ring erupts near you every 22 seconds. Move out before it detonates.',
    accentColor: '#A78BFA'
  }
] as const

export type EndlessModifierId = (typeof ENDLESS_MODIFIERS)[number]['id']

export const ENDLESS_BOSS_ATTACK_RATE = 1.2
export const ENDLESS_SCARCE_HEALING_MULTIPLIER = 0.5

export const ENDLESS_HAZARD_CONFIG = {
  intervalSeconds: 22,
  warningSeconds: 1.25,
  impactSeconds: 0.42,
  radius: 138,
  damage: 28
} as const

export function isPlayerInsideEndlessHazard(
  playerCenter: { x: number; y: number },
  hazardCenter: { x: number; y: number },
  playerRadius: number,
  hazardRadius: number = ENDLESS_HAZARD_CONFIG.radius
): boolean {
  return (
    Math.hypot(playerCenter.x - hazardCenter.x, playerCenter.y - hazardCenter.y) <=
    hazardRadius + playerRadius * 0.35
  )
}
