/**
 * Game Constants for Swarm Protocol: Survivor
 * All numerical values and game settings are defined here
 */

// ============================================
// GAME SETTINGS
// ============================================

export const GAME_CONFIG = {
  // Target frame rate
  TARGET_FPS: 60,
  
  // Canvas dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  
  // Base player velocity (pixels per second)
  // All speeds are multipliers of this base value
  BASE_PLAYER_SPEED: 220,
  
  // World units convention: All distances in pixels, speeds as multipliers of BASE_PLAYER_SPEED
} as const

// ============================================
// WAVE SYSTEM
// ============================================

export const WAVE_CONFIG = {
  // Duration of active wave (enemies spawn)
  WAVE_DURATION_SECONDS: 30,
  
  // Duration of breather window (no spawns, safe coin collection)
  BREATHER_DURATION_SECONDS: 3,
  
  // Total wave cycle duration
  TOTAL_CYCLE_SECONDS: 33, // WAVE_DURATION + BREATHER_DURATION
  
  // Boss wave interval
  BOSS_WAVE_INTERVAL: 5, // Every 5th wave
  
  // Wave difficulty scaling
  ENEMY_SPAWN_RATE_BASE: 1.8, // Enemies per second at wave 1
  ENEMY_SPAWN_RATE_SCALING: 0.65, // Additional enemies per second per wave
  ENEMY_HP_SCALING: 1.1, // HP multiplier per wave
  ENEMY_SPEED_SCALING: 1.02, // Speed multiplier per wave
  
  // Maximum wave (Wave 15 Final Boss)
  MAX_WAVE: 15,
  MAX_NORMAL_WAVE: 15,
} as const

export function getWaveSpawnConfig(
  waveNumber: number,
  survivalSeconds: number = 0
): { spawnRate: number; maxActiveEnemies: number; waveBurst: number } {
  const safeWave = Math.max(1, waveNumber)
  const elapsedMinutes = Math.max(0, survivalSeconds) / 60
  const spawnRate = Number(
    (
      WAVE_CONFIG.ENEMY_SPAWN_RATE_BASE +
      (safeWave - 1) * WAVE_CONFIG.ENEMY_SPAWN_RATE_SCALING +
      elapsedMinutes * 0.55
    ).toFixed(2)
  )
  const maxActiveEnemies = Math.min(340, 115 + safeWave * 18)
  const waveBurst = Math.min(14, 5 + safeWave)
  return { spawnRate, maxActiveEnemies, waveBurst }
}

/**
 * Caps ranged Aegis Tech Drone spawns per wave around 5-10, scaling gently at higher endless waves
 */
export function getWaveRangedSpawnLimit(waveNumber: number): number {
  const safeWave = Math.max(1, Math.floor(waveNumber))
  if (safeWave < 3) return 0
  if (safeWave <= 8) {
    return safeWave + 2 // W3: 5, W4: 6, W5: 7, W6: 8, W7: 9, W8: 10
  }
  if (safeWave <= 10) {
    return 10
  }
  return Math.min(16, 10 + Math.floor((safeWave - 8) / 3))
}

/**
 * Selects enemy index from [ene_01, ene_02, ene_03] with reduced ranged sniper spawn rate
 * and enforces the per-wave ranged quota via canSpawnRanged
 */
export function selectEnemyTypeIndexForWave(
  waveNumber: number,
  roll: number = Math.random(),
  canSpawnRanged: boolean = true
): 0 | 1 | 2 {
  if (waveNumber < 2) return 0
  if (waveNumber < 3 || !canSpawnRanged) {
    return roll < 0.65 ? 0 : 1
  }
  // Wave 3+: 56% Spore Zombie, 34% Chitin Bug, 10% Ranged Aegis Tech Drone
  if (roll < 0.56) return 0
  if (roll < 0.9) return 1
  return 2
}

export interface EnemyScalingFactors {
  hpMultiplier: number
  speedMultiplier: number
  damageMultiplier: number
  threatTier: number
}

/**
 * Overtime enemy scaling driven by both wave progression and elapsed survival time
 */
export function getEnemyScaling(waveNumber: number, survivalSeconds: number = 0): EnemyScalingFactors {
  const safeWave = Math.max(1, waveNumber)
  const elapsedMinutes = Math.max(0, survivalSeconds) / 60
  const waveFactor = safeWave - 1
  const threatTier = Number((waveFactor + elapsedMinutes * 0.85).toFixed(2))

  const hpMultiplier = Number(
    (Math.pow(1.30, waveFactor) * (1 + elapsedMinutes * 0.45)).toFixed(2)
  )
  const speedMultiplier = Number(
    Math.min(2.75, 1 + waveFactor * 0.07 + elapsedMinutes * 0.08).toFixed(2)
  )
  const damageMultiplier = Number(
    (1 + waveFactor * 0.24 + elapsedMinutes * 0.32).toFixed(2)
  )

  return {
    hpMultiplier,
    speedMultiplier,
    damageMultiplier,
    threatTier,
  }
}

// ============================================
// SCORING SYSTEM
// ============================================

export const SCORING_CONFIG = {
  // Score formula: Final Score = (Seconds Survived × SECONDS_MULTIPLIER) + (Coins Collected × COINS_MULTIPLIER)
  SECONDS_MULTIPLIER: 10,
  COINS_MULTIPLIER: 25,
  
  // Bonus multipliers
  WAVE_CLEAR_BONUS: 100, // Bonus for clearing a wave
  BOSS_KILL_BONUS: 500, // Bonus for killing a boss
  DAMAGE_FREE_STREAK_BONUS: 50, // Bonus per consecutive damage-free wave
  
  // High score thresholds
  BRONZE_SCORE: 1000,
  SILVER_SCORE: 5000,
  GOLD_SCORE: 10000,
  PLATINUM_SCORE: 25000,
} as const

// ============================================
// PLAYER CONFIGURATION
// ============================================

export const PLAYER_CONFIG = {
  // Base player stats
  BASE_HP: 100,
  BASE_SPEED: 1.0, // Multiplier of BASE_PLAYER_SPEED
  BASE_DAMAGE: 10,
  
  // Player collision
  PLAYER_RADIUS: 32, // pixels
  
  // Invincibility frames after taking damage
  INVINCIBILITY_DURATION_SECONDS: 1.0,
  
  // Default player name for guests
  DEFAULT_PLAYER_NAME: 'Guest Operative',
  
  // Respawn (disabled - perma death)
  REPAWN_ENABLED: false,
} as const

// ============================================
// ENEMY CONFIGURATION
// ============================================

export const ENEMY_CONFIG = {
  // Base enemy spawn distance from player
  SPAWN_DISTANCE_MIN: 200, // pixels
  SPAWN_DISTANCE_MAX: 300, // pixels
  
  // Enemy detection range (for targeting)
  DETECTION_RANGE: 500, // pixels
  
  // Enemy attack range
  ATTACK_RANGE: 100, // pixels
  
  // Coin drop configuration
  COIN_DROP_CHANCE: 1.0, // 100% chance to drop coins
  COIN_DROP_RADIUS: 50, // pixels from enemy death position
  
  // Enemy collision
  ENEMY_RADIUS_BASE: 24, // pixels (varies by enemy type)
} as const

// ============================================
// UPGRADE SYSTEM
// ============================================

export const UPGRADE_CONFIG = {
  // Number of upgrade options to choose from on level up
  LEVEL_UP_OPTIONS: 3,
  
  // Level up timing
  LEVEL_UP_AFTER_WAVE: 1, // Level up after every wave
  
  // Upgrade rarity (for random drops)
  COMMON_CHANCE: 0.70,
  UNCOMMON_CHANCE: 0.20,
  RARE_CHANCE: 0.08,
  LEGENDARY_CHANCE: 0.02,
  
  // Upgrade tiers (Level 1 -> Level 5 Overdrive)
  MAX_UPGRADE_TIER: 5,
  UPGRADE_TIER_MULTIPLIER: 1.5, // Damage/HP multiplier per tier
} as const

export const MAX_WEAPON_UPGRADE_LEVEL = 5

export function getUpgradeLevelStats(
  baseDamage: number,
  baseCooldown: number,
  level: number
): { damage: number; cooldown_s: number; isMaxEvolution: boolean } {
  const safeLevel = Math.max(1, Math.min(MAX_WEAPON_UPGRADE_LEVEL, Math.floor(level)))
  // Starts weak at Level 1 (55% damage, 125% cooldown) and ramps cleanly each level to Lv 5 Overdrive
  const damageMultipliers = [0.55, 0.85, 1.25, 1.85, 3.4]
  const cooldownMultipliers = [1.25, 1.05, 0.9, 0.76, 0.56]

  const dmgMult = damageMultipliers[safeLevel - 1]
  const cdMult = cooldownMultipliers[safeLevel - 1]

  const damage =
    baseDamage > 0 ? Math.max(1, Math.round(baseDamage * dmgMult)) : 0
  const cooldown_s =
    baseCooldown > 0
      ? Number(Math.max(0.22, baseCooldown * cdMult).toFixed(2))
      : 0

  return {
    damage,
    cooldown_s,
    isMaxEvolution: safeLevel >= MAX_WEAPON_UPGRADE_LEVEL
  }
}

export function getUpgradeLevelPerkHint(upgradeId: string, targetLevel: number): string {
  const lv = Math.max(1, Math.min(MAX_WEAPON_UPGRADE_LEVEL, Math.floor(targetLevel)))
  if (lv >= MAX_WEAPON_UPGRADE_LEVEL) {
    return getUpgradeOverdriveHint(upgradeId)
  }

  const perUpgrade: Record<string, Record<number, string>> = {
    upg_01: {
      1: 'Deploys 1 basic Scout Drone',
      2: 'Faster fire rate & +55% Drone damage',
      3: 'Deploys 2nd Companion Drone + piercing shots',
      4: 'Upgrades drones to 2-target piercing lasers'
    },
    upg_02: {
      1: 'Fires 1 micro-rocket (68px blast)',
      2: 'Larger 84px blast radius & faster reload',
      3: 'Fires 2-rocket volley + 100px blast radius',
      4: 'High-yield 116px twin rocket barrage'
    },
    upg_03: {
      1: 'Sweeps 1 short 200px beam',
      2: 'Extends beam to 235px & sweeps faster',
      3: 'Extends beam to 270px with longer burn',
      4: 'Extends beam to 305px rapid sweep'
    },
    upg_04: {
      1: 'Pulls nearby coins in 148px wave',
      2: '176px wave + deals shockwave damage',
      3: '204px wave + stronger EMP knockback',
      4: '232px wide pulse + heavy shockwave'
    },
    upg_05: {
      1: 'Throws 1 small sawblade (4 bounces)',
      2: 'Larger blade + 6 bounces & 3 pierces',
      3: 'Throws 2 sawblades + 8 bounces each',
      4: 'Heavy dual blades + 10 bounces & 5 pierces'
    },
    upg_06: {
      1: 'Arcs across 3 close enemies (255px)',
      2: 'Chains 5 enemies across 300px range',
      3: 'Chains 7 enemies across 345px range',
      4: 'Chains 9 enemies across 390px range'
    },
    upg_07: {
      1: 'Drops 1 narrow 93px orbital strike',
      2: 'Widens strike radius to 111px',
      3: 'Calls 2 orbital strikes (129px radius)',
      4: 'Twin heavy 147px orbital strikes'
    },
    upg_08: {
      1: '133px frost ring (22% enemy slow)',
      2: '161px frost ring (30% enemy slow)',
      3: '189px ring (38% slow) + frostbite DoT',
      4: '217px ring (46% slow) + heavy frostbite'
    },
    upg_09: {
      1: 'Minor 0.6% Max HP nanite repair',
      2: 'Doubles repair rate to 1.2% Max HP',
      3: 'Restores 1.8% Max HP more frequently',
      4: 'Restores 2.4% Max HP per cycle'
    },
    upg_10: {
      1: 'Narrow 1-stream flame jet',
      2: 'Adds 2nd flame stream & longer reach',
      3: 'Wide 3-stream flame jet + 3 pierces',
      4: '4-stream inferno cone + 4 pierces'
    },
    upg_11: {
      1: 'Blocks hit + small 125px pushback',
      2: '155px blast + deals shockwave damage',
      3: '185px blast + faster barrier recharge',
      4: '215px heavy counter-blast & longer shield'
    },
    upg_12: {
      1: 'Short 97px forward crescent slash',
      2: '119px slash with wider sweep arc',
      3: '141px wide crescent blade wave',
      4: '163px sweeping energy blade'
    },
    upg_13: {
      1: 'Fires 1 sidearm shot per volley',
      2: 'Dual-wield: fires 2 bullets per volley',
      3: 'Tri-shot fan (3 bullets) + faster fire',
      4: 'Quad-shot piercing fan (4 bullets)'
    },
    upg_14: {
      1: '1 Temporal Echo (85px pulse, 1 pierce)',
      2: '105px pulse radius & 2-target pierce',
      3: '125px pulse radius & 3-target pierce',
      4: 'Summons 2nd Echo + 145px pulse radius'
    },
    upg_15: {
      1: 'Absorbs hit + 125px knockback',
      2: '155px EMP knockback + shockwave dmg',
      3: '185px barrier burst & faster recharge',
      4: '215px heavy EMP counter-detonation'
    },
    upg_16: {
      1: 'Fires 3-pellet plasma scatter blast',
      2: 'Adds 4th pellet to scatter cone',
      3: '5-pellet blast + 2-target pierce',
      4: '6-pellet heavy scatter cone'
    },
    upg_17: {
      1: 'Small 107px gravity pull vortex',
      2: '129px vortex + stronger pull force',
      3: '151px vortex crushing wider crowds',
      4: '173px high-gravity singularity'
    },
    upg_18: {
      1: 'Fires 4 radial ice shards (0.85s freeze)',
      2: 'Fires 6 radial shards + 2 pierces (1.0s freeze)',
      3: 'Fires 8 radial shards + 3 pierces (1.15s freeze)',
      4: 'Fires 10 radial shards + 4 pierces (1.3s freeze)'
    },
    upg_19: {
      1: 'Drains 2 enemies within 146px',
      2: 'Drains 3 enemies within 172px',
      3: 'Drains 4 enemies within 198px',
      4: 'Drains 5 enemies within 224px'
    },
    upg_20: {
      1: 'Deploys 1 basic Sentinel Turret',
      2: 'Higher turret damage & faster fire rate',
      3: 'Turret rounds pierce +1 extra target',
      4: 'Upgrades to twin-barrel double shot'
    },
    upg_21: {
      1: 'Throws 1 fireball (72px burning zone)',
      2: 'Wider 90px burn zone & stronger scorch',
      3: 'Throws 2 fireballs + 108px burn zones',
      4: '126px twin inferno pools burn longer'
    },
    wpn_plasma_lance: {
      1: 'Fires 1 piercing plasma lance (4 targets)',
      2: 'Twin parallel lances + faster projectile',
      3: '3-lance spread piercing 6 targets',
      4: 'Wide 4-lance superheated beam volley'
    },
    wpn_nova_hammer: {
      1: 'Drops 1 seismic shockwave ring (115px)',
      2: 'Wider 135px tremor + heavy knockback',
      3: 'Twin staggered shockwaves on nearby pack',
      4: 'Dual 165px seismic shockwave hammers'
    },
    wpn_storm_glaive: {
      1: 'Hurls 1 ricochet storm glaive (9 bounces)',
      2: 'Faster spin + 11 bounces & 5 pierces',
      3: 'Launches 2 storm glaives in wide arc',
      4: 'Twin high-speed 13-bounce lightning glaives'
    },
    wpn_chrono_gatling: {
      1: 'Rapid 3-round kinetic burst fire',
      2: 'Tighter velocity + 4-round hyper burst',
      3: '5-round piercing gatling hailstorm',
      4: '6-round high-velocity phase barrage'
    },
    wpn_abyss_beam: {
      1: 'Dual opposing 280px sweeping beams',
      2: 'Faster sweep speed + 315px beam reach',
      3: 'Longer burn + 350px disintegration beams',
      4: 'Tri-spoke 385px abyssal beam array'
    },
    wpn_celestial_swarm: {
      1: 'Launches 4 homing explosive warheads',
      2: '5 warheads with larger 90px blast radius',
      3: '6 seeking warheads + faster flight',
      4: '7 high-yield seeker rockets'
    },
    wpn_rusty_pistol: {
      1: 'Fires 1 slow corroded slug',
      2: 'Slightly faster reload on rusty slide',
      3: 'Fires 2 wobbly scrap pellets',
      4: 'Jury-rigged double scrap volley'
    },
    wpn_misfire_coil: {
      1: 'Crackles 1 short 150px misfire spark',
      2: 'Arcs across 2 close enemies (175px)',
      3: 'Arcs across 3 enemies (200px)',
      4: 'Stabilized 4-target spark arc'
    },
    wpn_bent_launcher: {
      1: 'Lobs 1 small 38px dud shell',
      2: 'Slightly wider 46px blast wave',
      3: 'Fires 2 sluggish mortar shells',
      4: '58px twin mortar burst'
    },
    wpn_pulse_carbine: {
      1: 'Fires 2 steady kinetic pulse bolts',
      2: 'Faster muzzle velocity & tighter burst',
      3: '3-round pulse rifle burst',
      4: '4-round piercing carbine volley'
    },
    wpn_cryo_railgun: {
      1: 'Fires 1 piercing cryo rail slug (5 pierces)',
      2: 'Wider cryo shatter burst + faster cycle',
      3: 'Fires twin parallel cryo railguns',
      4: 'High-impact frost shatter rails (8 pierces)'
    },
    wpn_solar_flail: {
      1: 'Launches 1 spinning boomerang solar mace + fire pool',
      2: 'Longer chain reach & wider scorching fire area',
      3: 'Launches twin spinning solar maces in formation',
      4: 'Blazing magma trail + high-impact return smash'
    },
    wpn_void_reaper: {
      1: 'Abyssal scythe cleave + 90px void vortex',
      2: 'Wider 126px scythe sweep & deeper vortex pull',
      3: 'Launches twin void vortices on cleave',
      4: 'Massive 165px singularity reaper cleave'
    },
    wpn_muramasa: {
      1: 'Sweeps 176px Calamity crimson crescent wave',
      2: '202px Bloodmoon blade wave + fierce damage',
      3: '228px wide Muramasa cleave tearing through waves',
      4: '254px hyper-crimson katana sweep (Vanguard Pair Boost)'
    },
    wpn_grim_reaper: {
      1: 'Summons 1 Grim Reaper throwing scythes & draining HP',
      2: 'Reaper siphons 2 enemies & throws faster scythes',
      3: 'Throws twin spinning scythes per Reaper attack',
      4: 'Drains 3 enemies for soul heal (Tech Engineer +1 Reaper)'
    },
    wpn_permafrost_spire: {
      1: 'Fires freezing frost lance (1.5s freeze)',
      2: 'Wider 64px ice burst & 1.65s solid freeze',
      3: 'Launches twin parallel permafrost lances',
      4: 'Twin 7-pierce cryo lances freezing packs for 1.9s'
    },
    upg_a2_01: {
      1: 'Spawns 1 bouncing arena tornado (78px cyclone)',
      2: 'Faster cyclone travel & wider 92px suction',
      3: 'Spawns 2 bouncing tornadoes across the arena',
      4: 'Twin 108px high-velocity cyclones with stronger pull'
    },
    upg_a2_02: {
      1: 'Deploys 1 walking Laser Strider firing aimed beams',
      2: 'Longer 306px aimed laser beam & boosted damage',
      3: 'Deploys 2nd Laser Strider firing non-orbiting beams',
      4: 'Overcharged 362px aimed Citadel disintegration beams'
    },
    upg_a2_03: {
      1: 'Throws 1 piercing spear (5 pierces + 84px end burst)',
      2: '7-target spear pierce + wider 102px AoE burst',
      3: 'Hurls twin piercing spears + 120px shock burst',
      4: 'Throws 3 crystal spears (10 pierces + 138px burst)'
    },
    upg_a2_04: {
      1: 'Calls 1 falling starfall meteor (96px crater)',
      2: 'Calls twin meteors + wider 114px blast crater',
      3: 'Drops 3 staggered starfall meteors on clusters',
      4: 'Calls 4 blazing meteors (142px crater shockwave)'
    },
    upg_a2_05: {
      1: '2 orbiting emerald prism blades slice nearby foes',
      2: 'Adds 3rd orbiting blade & faster spin speed',
      3: '4 spinning prism blades + wider 137px orbit',
      4: '5 high-speed gold-edged prism chakram blades'
    },
    upg_a2_06: {
      1: 'Fires 1 Cryo-Nova frost orb freezing packs (1.5s)',
      2: 'Fires twin frost orbs + 1.65s solid freeze',
      3: 'Twin piercing Cryo-Nova orbs (114px freeze blast)',
      4: 'Launches 3 frost orbs freezing swarms for 2.0s'
    }
  }

  return perUpgrade[upgradeId]?.[lv] || `Increases weapon power & scaling to Level ${lv}`
}

export function getUpgradeOverdriveHint(upgradeId: string): string {
  const hints: Record<string, string> = {
    upg_01: 'LV 5 OVERDRIVE: Deploys 3 Drones firing piercing twin cyan lasers',
    upg_02: 'LV 5 OVERDRIVE: Launches 3-rocket salvo with massive 132px blast',
    upg_03: 'LV 5 OVERDRIVE: Dual opposing 340px hyper-beams sweep continuously',
    upg_04: 'LV 5 OVERDRIVE: 260px coin pull & heavy golden EMP detonation',
    upg_05: 'LV 5 OVERDRIVE: Hurls 3 giant gold sawblades with 12 bounces',
    upg_06: 'LV 5 OVERDRIVE: Chains super-arc lightning across 11 enemies (435px)',
    upg_07: 'LV 5 OVERDRIVE: Drops a 3-blast 165px orbital satellite cluster',
    upg_08: 'LV 5 OVERDRIVE: 245px blizzard aura dealing heavy continuous frost damage',
    upg_09: 'LV 5 OVERDRIVE: Restores 5% Max HP rapidly & boosts survivability',
    upg_10: 'LV 5 OVERDRIVE: Wide 5-stream inferno cone with 6-pierce fire jets',
    upg_11: 'LV 5 OVERDRIVE: Fast recharge & 245px shockwave detonation',
    upg_12: 'LV 5 OVERDRIVE: Massive 185px full-sweep crimson-cyan nova slash',
    upg_13: 'LV 5 OVERDRIVE: 5-bullet piercing kinetic bullet storm',
    upg_14: 'LV 5 OVERDRIVE: Dual Phase Shadows with 165px chrono shockwaves',
    upg_15: 'LV 5 OVERDRIVE: Rapid barrier recharge & 245px EMP counter-blast',
    upg_16: 'LV 5 OVERDRIVE: 7-pellet piercing hyper-scatter blast',
    upg_17: 'LV 5 OVERDRIVE: Twin 195px black hole vortices crush & pull swarms',
    upg_18: 'LV 5 OVERDRIVE: 12 radial piercing cryo shards freeze crowds',
    upg_19: 'LV 5 OVERDRIVE: Siphons HP from 6 enemies within 250px',
    upg_20: 'LV 5 OVERDRIVE: Deploys 2 Twin-Rail Overcharged Piercing Turrets',
    upg_21: 'LV 5 OVERDRIVE: Hurls 3 giant solar fireballs leaving 144px magma burn zones',
    wpn_plasma_lance: 'LV 5 OVERDRIVE: Fires 5-lance golden plasma fan piercing 8 foes',
    wpn_nova_hammer: 'LV 5 OVERDRIVE: Triple 195px golden nova slams crush entire packs',
    wpn_storm_glaive: 'LV 5 OVERDRIVE: Unleashes 3 massive 16-bounce storm glaives',
    wpn_chrono_gatling: 'LV 5 OVERDRIVE: Continuous 7-round piercing laser gatling storm',
    wpn_abyss_beam: 'LV 5 OVERDRIVE: 4-spoke 420px hyper-disintegration prism sweep',
    wpn_celestial_swarm: 'LV 5 OVERDRIVE: 8 homing apex warheads with 120px blasts',
    wpn_rusty_pistol: 'LV 5 OVERDRIVE: Salvaged 3-slug piercing scrap burst',
    wpn_misfire_coil: 'LV 5 OVERDRIVE: Overvolted 5-target 240px chain spark',
    wpn_bent_launcher: 'LV 5 OVERDRIVE: 3-shell 72px jury-rigged cluster mortar',
    wpn_pulse_carbine: 'LV 5 OVERDRIVE: 5-round high-velocity piercing carbine barrage',
    wpn_cryo_railgun: 'LV 5 OVERDRIVE: Tri-barrel 10-pierce sub-zero shatter rail volley',
    wpn_solar_flail: 'LV 5 OVERDRIVE: Launches 3 spinning solar maces scorching wide magma arenas',
    wpn_void_reaper: 'LV 5 OVERDRIVE: Cataclysmic 200px reaper arc + twin singularities',
    wpn_muramasa: 'LV 5 OVERDRIVE: Dual/Triple Calamity Muramasa crescent waves obliterating entire screens',
    wpn_grim_reaper: 'LV 5 OVERDRIVE: Twin/Triple Grim Reapers hurling 3 scythes & siphoning HP to you',
    wpn_permafrost_spire: 'LV 5 OVERDRIVE: Tri-lance glacial barrage freezing enemies solid for 2.1s',
    upg_a2_01: 'LV 5 OVERDRIVE: Spawns 3 hyper-cyclones bouncing wildly with crackling storm cores',
    upg_a2_02: 'LV 5 OVERDRIVE: Twin Apex Laser Striders sweep 3-beam non-orbiting laser arrays',
    upg_a2_03: 'LV 5 OVERDRIVE: Hurls 4 Golden Astral Spears (14 pierces) erupting in 160px supernovas',
    upg_a2_04: 'LV 5 OVERDRIVE: 5 Starfall Meteors bombard the arena leaving 164px super-craters',
    upg_a2_05: 'LV 5 OVERDRIVE: 6 Golden Prism Chakrams orbit at hypersonic speed shredding swarms',
    upg_a2_06: 'LV 5 OVERDRIVE: 4 Permafrost Cryo-Nova orbs freeze entire waves solid for 2.2s'
  }
  return hints[upgradeId] || 'LV 5 OVERDRIVE: Massive damage, speed, and evolved weapon pattern'
}

// ============================================
// COIN SYSTEM
// ============================================

export const COIN_CONFIG = {
  // Coin collection
  COIN_RADIUS: 20, // pixels
  COIN_MAGNET_RANGE: 150, // pixels (auto-collect range)
  COIN_MAGNET_SPEED: 500, // pixels per second
  
  // Coin values (per enemy type)
  COIN_VALUE_SPAWNER: 1,
  COIN_VALUE_FAST: 2,
  COIN_VALUE_RANGED: 5,
  COIN_VALUE_BOSS: 50,
  
  // Coin decay (if not collected)
  COIN_DECAY_ENABLED: false,
  COIN_DECAY_SECONDS: 10,
} as const

// ============================================
// COLLISION SYSTEM
// ============================================

export const COLLISION_CONFIG = {
  // Collision detection type
  COLLISION_TYPE: 'circle-to-circle' as const, // 'circle-to-circle' | 'aabb'
  
  // Circle collision: hit when Distance < (Radius₁ + Radius₂)
  // AABB collision: hit when rectangles overlap
} as const

// ============================================
// LEVEL UP SYSTEM
// ============================================

export const LEVEL_UP_CONFIG = {
  // Experience curve
  XP_PER_WAVE: 100,
  XP_PER_ENEMY_KILL: 10,
  XP_PER_BOSS_KILL: 100,
  
  // XP required for level up (scales smoothly in endless mode, 100 at level 1)
  XP_TO_LEVEL: 100,
  XP_PER_LEVEL_INCREMENT: 20,
  XP_LEVEL_CAP_STEP: 300,
  
  // Endless leveling (no level 10 cap)
  MAX_LEVEL: Number.POSITIVE_INFINITY,
  
  // Card selection timeout
  CARD_SELECTION_TIMEOUT_SECONDS: 30,
  
  // Auto-select if timeout
  AUTO_SELECT_ENABLED: true,
} as const

/**
 * Endless XP curve: 100 XP at level 1, scaling gently (+20/level, capped step growth at +300)
 */
export function getXpForNextLevel(currentLevel: number): number {
  const safeLevel = Math.max(1, Math.floor(currentLevel))
  return (
    LEVEL_UP_CONFIG.XP_TO_LEVEL +
    Math.min(LEVEL_UP_CONFIG.XP_LEVEL_CAP_STEP, (safeLevel - 1) * LEVEL_UP_CONFIG.XP_PER_LEVEL_INCREMENT)
  )
}

// ============================================
// ACHIEVEMENT THRESHOLDS
// ============================================

export const ACHIEVEMENT_THRESHOLDS = {
  // ach_01: First Contact
  FIRST_CONTACT_ENEMIES: 100,
  
  // ach_02: Gold Hoarder
  GOLD_HOARDER_COINS: 500,
  
  // ach_03: Swarmslayer
  SWARMSLAYER_ENEMIES: 1000,
  
  // ach_04: Untouchable
  UNTOUCHABLE_STREAK: 3,
  
  // Additional thresholds for display
  KILL_STREAK_THRESHOLDS: [5, 10, 20, 50, 100],
  WAVE_STREAK_THRESHOLDS: [3, 5, 10, 20, 50],
  COIN_COLLECTION_THRESHOLDS: [100, 500, 1000, 5000, 10000],
} as const

// ============================================
// GAME STATE MACHINE
// ============================================

export type GameState = 
  | 'MENU'
  | 'LOADOUT_SELECT'
  | 'PLAYING'
  | 'WAVE_BREATHER'
  | 'LEVEL_UP'
  | 'LEVEL_UP_PAUSE'
  | 'GAME_OVER'
  | 'PAUSED'

// Transition map
// MENU -> LOADOUT_SELECT -> PLAYING -> WAVE_BREATHER -> LEVEL_UP -> PLAYING
// PLAYING -> LEVEL_UP_PAUSE (when wave ends)
// PLAYING -> GAME_OVER (on player death)
// Any -> PAUSED (on pause)
// PAUSED -> Previous state (on resume)

// ============================================
// RENDERING CONFIGURATION
// ============================================

export const RENDER_CONFIG = {
  // Camera follow
  CAMERA_FOLLOW_SMOOTHING: 0.1, // 0 = instant, 1 = very smooth
  
  // Zoom level
  ZOOM_LEVEL: 1.0,
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2.0,
  
  // Particle effects
  PARTICLE_ENABLED: true,
  MAX_PARTICLES: 100,
  
  // Blood/splatter effects
  ENABLE_GORE: true,
  
  // Screen shake
  SCREEN_SHAKE_ENABLED: true,
  SCREEN_SHAKE_INTENSITY: 5, // pixels
  SCREEN_SHAKE_DURATION: 0.1, // seconds
} as const

// ============================================
// AUDIO CONFIGURATION
// ============================================

export const AUDIO_CONFIG = {
  // Master volume (0-1)
  MASTER_VOLUME: 0.7,
  
  // Individual volume channels
  MUSIC_VOLUME: 0.5,
  SFX_VOLUME: 0.8,
  AMBIENCE_VOLUME: 0.3,
  
  // Audio files (to be implemented)
  SOUNDTRACK_FILES: [
    'soundtrack_01.mp3',
    'soundtrack_02.mp3',
    'soundtrack_03.mp3',
  ],
  
  // SFX files
  SFX_FILES: {
    PLAYER_HIT: 'sfx_player_hit.mp3',
    ENEMY_HIT: 'sfx_enemy_hit.mp3',
    ENEMY_DEATH: 'sfx_enemy_death.mp3',
    COIN_COLLECT: 'sfx_coin_collect.mp3',
    LEVEL_UP: 'sfx_level_up.mp3',
    GAME_OVER: 'sfx_game_over.mp3',
    WAVE_START: 'sfx_wave_start.mp3',
    BOSS_SPAWN: 'sfx_boss_spawn.mp3',
  },
} as const

// ============================================
// ACCESSIBILITY CONFIGURATION
// ============================================

export const ACCESSIBILITY_CONFIG = {
  // High contrast mode
  HIGH_CONTRAST_ENABLED: false,
  
  // Colorblind modes
  COLORBLIND_MODE: 'none' as 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia',
  
  // Screen reader support
  SCREEN_READER_ENABLED: false,
  
  // Reduced motion
  REDUCED_MOTION_ENABLED: false,
  
  // Text size
  TEXT_SIZE: 'normal' as 'small' | 'normal' | 'large' | 'xlarge',
  
  // UI scale
  UI_SCALE: 1.0,
} as const
