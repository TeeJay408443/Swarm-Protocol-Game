/**
 * Unlockable Heroes Registry
 * Keeps canonical 6 seedData heroes (35-entity validation) untouched while adding unlockable operatives.
 */

import { heroes as seedHeroes } from '../db/seedData'
import type { HeroesRow } from '../types/database'

export interface UnlockableHeroSpec extends HeroesRow {
  unlockCoinCost: number
  unlockWave: number
  unlockSummary: string
  tagline: string
  accentColor: string
}

export const UNLOCKABLE_HEROES: UnlockableHeroSpec[] = [
  {
    id: 'hero_07',
    name: 'Storm Assassin',
    archetype: 'Crit Striker',
    hp: 115,
    speed: 1.42,
    starting_upgrade_id: 'upg_06',
    lore: 'High-voltage shadow assassin whose Overcharge Optics (+22%..+56% Crit, +15%..+35% Fire Rate) unleash crackling Storm Overload lightning arcs, crit shockwaves, and single-target thunderstrikes.',
    unlockCoinCost: 1500,
    unlockWave: 8,
    unlockSummary: 'Reach Wave 8 or Recruit for 1,500 Coins',
    tagline: 'Hyper-Crit & Storm Overload Assassin',
    accentColor: '#A855F7'
  }
]

export const ALL_HEROES: HeroesRow[] = [...seedHeroes, ...UNLOCKABLE_HEROES]

export const UNLOCKABLE_HERO_IDS = new Set<string>(UNLOCKABLE_HEROES.map((h) => h.id))

export function isUnlockableHero(heroId: string): boolean {
  return UNLOCKABLE_HERO_IDS.has(heroId)
}

export function getUnlockableHeroSpec(heroId: string): UnlockableHeroSpec | undefined {
  return UNLOCKABLE_HEROES.find((h) => h.id === heroId)
}

export function getAllHeroes(): HeroesRow[] {
  return ALL_HEROES
}

export function getHeroFromRoster(heroId: string): HeroesRow | undefined {
  return ALL_HEROES.find((h) => h.id === heroId)
}
