/**
 * Weapon & Gear Procedural Sprite Renderer
 * Provides unified 2D canvas sprites for:
 *  1) In-game character-held / mounted weapons with live swing, thrust, recoil & muzzle-flash animations
 *  2) Clean Armory / Shop / Codex boxed item sprites for all weapons & accessories
 */

export type WeaponVisualKind =
  | 'melee_swing'
  | 'hammer_swing'
  | 'flail_whip'
  | 'ranged_recoil'
  | 'gatling_spin'
  | 'spear_thrust'
  | 'glaive_spin'
  | 'catalyst_pulse'
  | 'beam_emitter'

export interface WeaponVisualBehavior {
  kind: WeaponVisualKind
  duration: number
  primaryColor: string
  secondaryColor: string
  accentColor: string
  label: string
}

export interface WorldWeaponDrawOptions {
  weaponId: string
  aimAngle: number
  actionProgress: number // 0 = idle, 0..1 = active swing/recoil progress
  swingParity?: number // +1 or -1 for alternating sword arcs
  animTime?: number
  isLv5?: boolean
  scale?: number
  showMuzzleFlash?: boolean
}

const WEAPON_BEHAVIORS: Record<string, WeaponVisualBehavior> = {
  // Hero Starters & Canonical Weapons
  upg_01: {
    kind: 'catalyst_pulse',
    duration: 0.24,
    primaryColor: '#38BDF8',
    secondaryColor: '#1E293B',
    accentColor: '#7DD3FC',
    label: 'Drone Controller'
  },
  upg_02: {
    kind: 'ranged_recoil',
    duration: 0.24,
    primaryColor: '#DC2626',
    secondaryColor: '#334155',
    accentColor: '#FB923C',
    label: 'Rocket Pod'
  },
  upg_03: {
    kind: 'beam_emitter',
    duration: 0.35,
    primaryColor: '#00F0FF',
    secondaryColor: '#0F172A',
    accentColor: '#E0F2FE',
    label: 'Orbital Lens'
  },
  upg_04: {
    kind: 'catalyst_pulse',
    duration: 0.3,
    primaryColor: '#FACC15',
    secondaryColor: '#475569',
    accentColor: '#FEF08A',
    label: 'Magnet Coil'
  },
  upg_05: {
    kind: 'glaive_spin',
    duration: 0.28,
    primaryColor: '#FACC15',
    secondaryColor: '#64748B',
    accentColor: '#FFFFFF',
    label: 'Sawblade'
  },
  upg_06: {
    kind: 'catalyst_pulse',
    duration: 0.24,
    primaryColor: '#38BDF8',
    secondaryColor: '#1E293B',
    accentColor: '#E0F2FE',
    label: 'Tesla Arc Rod'
  },
  upg_07: {
    kind: 'catalyst_pulse',
    duration: 0.32,
    primaryColor: '#FF0055',
    secondaryColor: '#1E293B',
    accentColor: '#FDA4AF',
    label: 'Strike Beacon'
  },
  upg_10: {
    kind: 'ranged_recoil',
    duration: 0.2,
    primaryColor: '#EA580C',
    secondaryColor: '#475569',
    accentColor: '#FDE047',
    label: 'Flamethrower'
  },
  upg_12: {
    kind: 'melee_swing',
    duration: 0.26,
    primaryColor: '#00F0FF',
    secondaryColor: '#1E293B',
    accentColor: '#FFFFFF',
    label: 'Arc Katana'
  },
  upg_13: {
    kind: 'ranged_recoil',
    duration: 0.16,
    primaryColor: '#38BDF8',
    secondaryColor: '#1E293B',
    accentColor: '#BAE6FD',
    label: 'Kinetic Pistol'
  },
  upg_14: {
    kind: 'catalyst_pulse',
    duration: 0.26,
    primaryColor: '#A855F7',
    secondaryColor: '#312E81',
    accentColor: '#E9D5FF',
    label: 'Chrono Focus'
  },
  upg_16: {
    kind: 'ranged_recoil',
    duration: 0.22,
    primaryColor: '#38BDF8',
    secondaryColor: '#0F172A',
    accentColor: '#7DD3FC',
    label: 'Ion Scattergun'
  },
  upg_17: {
    kind: 'catalyst_pulse',
    duration: 0.32,
    primaryColor: '#A855F7',
    secondaryColor: '#1E1B4B',
    accentColor: '#E879F9',
    label: 'Void Orb'
  },
  upg_18: {
    kind: 'catalyst_pulse',
    duration: 0.26,
    primaryColor: '#22D3EE',
    secondaryColor: '#0E7490',
    accentColor: '#ECFEFF',
    label: 'Frost Spire'
  },
  upg_19: {
    kind: 'catalyst_pulse',
    duration: 0.28,
    primaryColor: '#F43F5E',
    secondaryColor: '#4C0519',
    accentColor: '#FDA4AF',
    label: 'Blood Siphon'
  },
  upg_20: {
    kind: 'ranged_recoil',
    duration: 0.2,
    primaryColor: '#F59E0B',
    secondaryColor: '#334155',
    accentColor: '#FEF08A',
    label: 'Turret Relay'
  },
  upg_21: {
    kind: 'catalyst_pulse',
    duration: 0.26,
    primaryColor: '#F97316',
    secondaryColor: '#7C2D12',
    accentColor: '#FEF08A',
    label: 'Inferno Wand'
  },

  // Area 2 Weapons
  upg_a2_01: {
    kind: 'catalyst_pulse',
    duration: 0.3,
    primaryColor: '#38BDF8',
    secondaryColor: '#0F172A',
    accentColor: '#BAE6FD',
    label: 'Cyclone Vane'
  },
  upg_a2_02: {
    kind: 'beam_emitter',
    duration: 0.28,
    primaryColor: '#34D399',
    secondaryColor: '#064E3B',
    accentColor: '#A7F3D0',
    label: 'Strider Relay'
  },
  upg_a2_03: {
    kind: 'spear_thrust',
    duration: 0.24,
    primaryColor: '#34D399',
    secondaryColor: '#065F46',
    accentColor: '#FEF08A',
    label: 'Astral Javelin'
  },
  upg_a2_04: {
    kind: 'catalyst_pulse',
    duration: 0.3,
    primaryColor: '#10B981',
    secondaryColor: '#064E3B',
    accentColor: '#FDE047',
    label: 'Starfall Staff'
  },
  upg_a2_05: {
    kind: 'glaive_spin',
    duration: 0.25,
    primaryColor: '#34D399',
    secondaryColor: '#065F46',
    accentColor: '#FEF08A',
    label: 'Prism Blade'
  },
  upg_a2_06: {
    kind: 'catalyst_pulse',
    duration: 0.28,
    primaryColor: '#38BDF8',
    secondaryColor: '#0C4A6E',
    accentColor: '#E0F2FE',
    label: 'Cryo-Nova Orb'
  },

  // Shop / Crate Weapons
  wpn_rusty_pistol: {
    kind: 'ranged_recoil',
    duration: 0.18,
    primaryColor: '#9CA3AF',
    secondaryColor: '#57534E',
    accentColor: '#D6D3D1',
    label: 'Scrap Pistol'
  },
  wpn_misfire_coil: {
    kind: 'catalyst_pulse',
    duration: 0.24,
    primaryColor: '#F87171',
    secondaryColor: '#7F1D1D',
    accentColor: '#FCA5A5',
    label: 'Spark Coil'
  },
  wpn_bent_launcher: {
    kind: 'ranged_recoil',
    duration: 0.26,
    primaryColor: '#F87171',
    secondaryColor: '#44403C',
    accentColor: '#FDBA74',
    label: 'Pea Mortar'
  },
  wpn_pulse_carbine: {
    kind: 'ranged_recoil',
    duration: 0.18,
    primaryColor: '#E2E8F0',
    secondaryColor: '#334155',
    accentColor: '#38BDF8',
    label: 'Pulse Carbine'
  },
  wpn_plasma_lance: {
    kind: 'ranged_recoil',
    duration: 0.2,
    primaryColor: '#00F0FF',
    secondaryColor: '#0F172A',
    accentColor: '#FFFFFF',
    label: 'Plasma Lance'
  },
  wpn_nova_hammer: {
    kind: 'hammer_swing',
    duration: 0.32,
    primaryColor: '#34D399',
    secondaryColor: '#1E293B',
    accentColor: '#FDE047',
    label: 'Nova Hammer'
  },
  wpn_storm_glaive: {
    kind: 'glaive_spin',
    duration: 0.28,
    primaryColor: '#38BDF8',
    secondaryColor: '#1E3A8A',
    accentColor: '#E0F2FE',
    label: 'Storm Glaive'
  },
  wpn_chrono_gatling: {
    kind: 'gatling_spin',
    duration: 0.16,
    primaryColor: '#A855F7',
    secondaryColor: '#1E1B4B',
    accentColor: '#38BDF8',
    label: 'Chrono Gatling'
  },
  wpn_abyss_beam: {
    kind: 'beam_emitter',
    duration: 0.36,
    primaryColor: '#FFD700',
    secondaryColor: '#312E81',
    accentColor: '#FEF9C3',
    label: 'Abyssal Prism'
  },
  wpn_celestial_swarm: {
    kind: 'ranged_recoil',
    duration: 0.24,
    primaryColor: '#C084FC',
    secondaryColor: '#3B0764',
    accentColor: '#F472B6',
    label: 'Seeker Pod'
  },
  wpn_cryo_railgun: {
    kind: 'ranged_recoil',
    duration: 0.22,
    primaryColor: '#38BDF8',
    secondaryColor: '#0F172A',
    accentColor: '#E0F2FE',
    label: 'Cryo Railcannon'
  },
  wpn_solar_flail: {
    kind: 'flail_whip',
    duration: 0.34,
    primaryColor: '#F97316',
    secondaryColor: '#7C2D12',
    accentColor: '#FEF08A',
    label: 'Solar Flail'
  },
  wpn_void_reaper: {
    kind: 'melee_swing',
    duration: 0.3,
    primaryColor: '#A855F7',
    secondaryColor: '#1E1B4B',
    accentColor: '#F5D0FE',
    label: 'Void Scythe'
  },
  wpn_crafted_solar_void_reaper: {
    kind: 'melee_swing',
    duration: 0.34,
    primaryColor: '#F97316',
    secondaryColor: '#312E81',
    accentColor: '#FEF08A',
    label: 'Solar Void Reaper'
  },
  wpn_muramasa: {
    kind: 'melee_swing',
    duration: 0.3,
    primaryColor: '#FF2E63',
    secondaryColor: '#18181B',
    accentColor: '#FFE4E6',
    label: 'Muramasa'
  },
  wpn_permafrost_spire: {
    kind: 'catalyst_pulse',
    duration: 0.26,
    primaryColor: '#C084FC',
    secondaryColor: '#0C4A6E',
    accentColor: '#E0F2FE',
    label: 'Glacier Spire'
  },
  wpn_grim_reaper: {
    kind: 'melee_swing',
    duration: 0.32,
    primaryColor: '#FF2E63',
    secondaryColor: '#1E1B4B',
    accentColor: '#A855F7',
    label: 'Soul Scythe'
  },
  wpn_crimson_railblade: {
    kind: 'melee_swing',
    duration: 0.26,
    primaryColor: '#FF2E43',
    secondaryColor: '#1F2937',
    accentColor: '#FECDD3',
    label: 'Crimson Blade'
  },
  wpn_phantom_sniper: {
    kind: 'ranged_recoil',
    duration: 0.22,
    primaryColor: '#F43F5E',
    secondaryColor: '#0F172A',
    accentColor: '#FFE4E6',
    label: 'Phantom Rifle'
  },
  wpn_tempest_sphere: {
    kind: 'catalyst_pulse',
    duration: 0.32,
    primaryColor: '#A855F7',
    secondaryColor: '#1E1B4B',
    accentColor: '#38BDF8',
    label: 'Tempest Sphere'
  }
}

const DEFAULT_BEHAVIOR: WeaponVisualBehavior = {
  kind: 'ranged_recoil',
  duration: 0.2,
  primaryColor: '#38BDF8',
  secondaryColor: '#1E293B',
  accentColor: '#FFFFFF',
  label: 'Tactical Arm'
}

export function getWeaponVisualBehavior(weaponId: string): WeaponVisualBehavior {
  return WEAPON_BEHAVIORS[weaponId] || DEFAULT_BEHAVIOR
}

/**
 * Draw weapon geometry oriented along +X from grip/origin (0,0), scaled cleanly for world & box use.
 */
function drawWeaponGeometry(
  ctx: CanvasRenderingContext2D,
  weaponId: string,
  behavior: WeaponVisualBehavior,
  opts: { animTime: number; isLv5: boolean; flashStrength: number }
): void {
  const { primaryColor, secondaryColor, accentColor } = behavior
  const edge = opts.isLv5 ? '#FFD700' : primaryColor
  const glow = opts.isLv5 ? '#FEF9C3' : accentColor

  // 1. Katana / Precision Blades (Muramasa, Arc Slash, Crimson Edge)
  if (
    weaponId === 'wpn_muramasa' ||
    weaponId === 'upg_12' ||
    weaponId === 'wpn_crimson_railblade'
  ) {
    const bladeLen = weaponId === 'wpn_muramasa' ? 38 : weaponId === 'wpn_crimson_railblade' ? 33 : 30
    // Handle + pommel
    ctx.fillStyle = '#0F172A'
    ctx.strokeStyle = edge
    ctx.lineWidth = 1.4
    ctx.fillRect(-6, -2.2, 10, 4.4)
    ctx.strokeRect(-6, -2.2, 10, 4.4)

    // Tsuba handguard
    ctx.fillStyle = opts.isLv5 ? '#FFD700' : '#F43F5E'
    ctx.fillRect(3.5, -6, 3, 12)

    // Curved katana blade spine + glowing edge
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(6.5, -2.5)
    ctx.quadraticCurveTo(bladeLen * 0.65, -4.5, bladeLen, -1)
    ctx.lineTo(bladeLen - 4, 2.5)
    ctx.quadraticCurveTo(bladeLen * 0.6, 1.5, 6.5, 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Incandescent razor highlight
    ctx.strokeStyle = glow
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(8, -2.2)
    ctx.quadraticCurveTo(bladeLen * 0.65, -4.2, bladeLen, -1)
    ctx.stroke()
    return
  }

  // 2. Scythes (Void Singularity Scythe, Grim Reaper Soul Harvester)
  if (
    weaponId === 'wpn_void_reaper' ||
    weaponId === 'wpn_grim_reaper' ||
    weaponId === 'wpn_crafted_solar_void_reaper'
  ) {
    const shaftLen =
      weaponId === 'wpn_grim_reaper' ? 34 : weaponId === 'wpn_crafted_solar_void_reaper' ? 36 : 31
    // Dark metal shaft
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 3.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-6, 1)
    ctx.lineTo(shaftLen, -1)
    ctx.stroke()

    ctx.strokeStyle = edge
    ctx.lineWidth = 1.6
    ctx.stroke()

    // Curved crescent scythe blade perpendicular from tip
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(shaftLen - 4, -2)
    ctx.quadraticCurveTo(shaftLen + 8, -16, shaftLen - 11, -21)
    ctx.quadraticCurveTo(shaftLen - 2, -11, shaftLen - 5, 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Razor edge highlight + soul core jewel
    ctx.strokeStyle = glow
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(shaftLen - 2, -3)
    ctx.quadraticCurveTo(shaftLen + 7, -15, shaftLen - 10, -20)
    ctx.stroke()

    ctx.fillStyle = edge
    ctx.beginPath()
    ctx.arc(shaftLen - 2, -1, 3.3, 0, Math.PI * 2)
    ctx.fill()
    if (weaponId === 'wpn_crafted_solar_void_reaper') {
      ctx.strokeStyle = glow
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(shaftLen - 2, -1, 7, -0.9, 1.7)
      ctx.stroke()
      ctx.fillStyle = '#F97316'
      ctx.beginPath()
      ctx.arc(shaftLen - 2, -1, 2.1, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  // 3. Heavy Hammer (Nova Shock Hammer)
  if (weaponId === 'wpn_nova_hammer') {
    ctx.strokeStyle = '#94A3B8'
    ctx.lineWidth = 3.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.lineTo(24, 0)
    ctx.stroke()

    // Twin anvil hammer head
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(18, -12, 11, 24, 3)
    ctx.fill()
    ctx.stroke()

    // Impact glow face
    ctx.fillStyle = glow
    ctx.fillRect(20, -9, 7, 4)
    ctx.fillRect(20, 5, 7, 4)
    return
  }

  // 4. Solar Flare Flail (Chain handle + Spiked Mace Head)
  if (weaponId === 'wpn_solar_flail') {
    // Handle grip
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = '#FDBA74'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(-5, -2.5, 14, 5, 2)
    ctx.fill()
    ctx.stroke()

    // Short taut chain link
    ctx.strokeStyle = glow
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(9, 0)
    ctx.lineTo(19, 0)
    ctx.stroke()

    // Spiked Solar Mace orb
    const cx = 25
    const r = 8
    ctx.fillStyle = edge
    ctx.strokeStyle = glow
    ctx.lineWidth = 1.6
    ctx.beginPath()
    for (let s = 0; s < 12; s++) {
      const a = (s / 12) * Math.PI * 2 + opts.animTime * 4
      const sr = s % 2 === 0 ? r * 1.25 : r * 0.65
      const px = cx + Math.cos(a) * sr
      const py = Math.sin(a) * sr
      if (s === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#FEF9C3'
    ctx.beginPath()
    ctx.arc(cx, 0, 3.2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  // 5. Spears / Javelins (Astral Javelin)
  if (weaponId === 'upg_a2_03') {
    ctx.strokeStyle = '#065F46'
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(-8, 0)
    ctx.lineTo(24, 0)
    ctx.stroke()

    ctx.fillStyle = edge
    ctx.strokeStyle = glow
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(37, 0)
    ctx.lineTo(21, -5.5)
    ctx.lineTo(24, 0)
    ctx.lineTo(21, 5.5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    return
  }

  // 6. Spinning Discs / Glaives / Sawblades (Storm Glaive, Bouncing Sawblade, Prism Blades)
  if (
    weaponId === 'wpn_storm_glaive' ||
    weaponId === 'upg_05' ||
    weaponId === 'upg_a2_05'
  ) {
    ctx.save()
    ctx.translate(14, 0)
    ctx.rotate(opts.animTime * 7)
    const blades = weaponId === 'wpn_storm_glaive' ? 3 : weaponId === 'upg_a2_05' ? 4 : 8
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 1.8
    ctx.beginPath()
    for (let i = 0; i < blades * 2; i++) {
      const a = (i / (blades * 2)) * Math.PI * 2
      const r = i % 2 === 0 ? 11.5 : 4.8
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  // 7. Sniper / Railcannon / Plasma Lance (long precision barrels)
  if (
    weaponId === 'wpn_phantom_sniper' ||
    weaponId === 'wpn_plasma_lance' ||
    weaponId === 'wpn_cryo_railgun' ||
    weaponId === 'wpn_pulse_carbine'
  ) {
    const barrelLen = weaponId === 'wpn_phantom_sniper' ? 34 : weaponId === 'wpn_plasma_lance' ? 31 : 27
    // Stock & body
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.roundRect(-4, -3.5, 16, 7, 2)
    ctx.fill()
    ctx.stroke()

    // Twin magnetic rails
    ctx.fillStyle = '#0F172A'
    ctx.fillRect(10, -3.2, barrelLen - 10, 2.2)
    ctx.fillRect(10, 1, barrelLen - 10, 2.2)
    ctx.strokeStyle = edge
    ctx.lineWidth = 1.3
    ctx.strokeRect(10, -3.2, barrelLen - 10, 2.2)
    ctx.strokeRect(10, 1, barrelLen - 10, 2.2)

    // Glowing plasma core strip
    ctx.fillStyle = glow
    ctx.fillRect(11, -0.8, barrelLen - 12, 1.6)

    // Optic scope for sniper
    if (weaponId === 'wpn_phantom_sniper') {
      ctx.fillStyle = '#F43F5E'
      ctx.fillRect(3, -6.2, 10, 2.5)
    }

    if (opts.flashStrength > 0.05) {
      ctx.fillStyle = glow
      ctx.globalAlpha = opts.flashStrength
      ctx.beginPath()
      ctx.arc(barrelLen + 2, 0, 5 + opts.flashStrength * 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    return
  }

  // 8. Gatling / Heavy Launchers / Scattergun / Flamethrower
  if (
    weaponId === 'wpn_chrono_gatling' ||
    weaponId === 'upg_02' ||
    weaponId === 'wpn_celestial_swarm' ||
    weaponId === 'wpn_bent_launcher' ||
    weaponId === 'upg_16' ||
    weaponId === 'upg_10' ||
    weaponId === 'upg_20'
  ) {
    // Bulky receiver housing
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 1.7
    ctx.beginPath()
    ctx.roundRect(-3, -5, 19, 10, 2.5)
    ctx.fill()
    ctx.stroke()

    if (weaponId === 'wpn_chrono_gatling') {
      // Multi-barrel rotary cluster
      const jitter = Math.sin(opts.animTime * 40) * 1.4
      ctx.fillStyle = '#1E293B'
      ctx.strokeStyle = edge
      ctx.lineWidth = 1.2
      ctx.fillRect(15, -4 + jitter * 0.4, 13, 2.3)
      ctx.fillRect(15, -1.1, 14, 2.2)
      ctx.fillRect(15, 1.8 - jitter * 0.4, 13, 2.3)
      ctx.strokeRect(15, -4 + jitter * 0.4, 13, 2.3)
      ctx.strokeRect(15, 1.8 - jitter * 0.4, 13, 2.3)
    } else if (weaponId === 'upg_10') {
      // Flamethrower nozzle + live pilot flame
      ctx.fillStyle = '#475569'
      ctx.fillRect(15, -2.5, 11, 5)
      ctx.fillStyle = '#F97316'
      ctx.beginPath()
      ctx.arc(28, 0, 3.8 + Math.sin(opts.animTime * 22) * 1.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FEF08A'
      ctx.beginPath()
      ctx.arc(27, 0, 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Wide cannon / launcher barrel
      ctx.fillStyle = edge
      ctx.fillRect(15, -3.5, 10, 7)
      ctx.fillStyle = glow
      ctx.fillRect(22, -2, 3, 4)
    }

    if (opts.flashStrength > 0.05) {
      ctx.fillStyle = glow
      ctx.globalAlpha = opts.flashStrength
      ctx.beginPath()
      ctx.arc(29, 0, 5.5 + opts.flashStrength * 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    return
  }

  // 9. Pistols (Dual Kinetic Pistols, Rusty Scrap Blaster)
  if (weaponId === 'upg_13' || weaponId === 'wpn_rusty_pistol') {
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(0, -3, 18, 5.5, 1.5)
    ctx.fill()
    ctx.stroke()

    // Pistol grip
    ctx.fillRect(0, 2, 5, 5)
    ctx.fillStyle = glow
    ctx.fillRect(14, -2, 4, 2)

    if (opts.flashStrength > 0.05) {
      ctx.fillStyle = glow
      ctx.globalAlpha = opts.flashStrength
      ctx.beginPath()
      ctx.arc(20, -0.5, 4 + opts.flashStrength * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    return
  }

  // 10. Tempest Sphere / Void Singularity / Inferno / Frost / Cryo / Tesla / Beams / Staffs
  if (weaponId === 'wpn_tempest_sphere' || weaponId === 'upg_17' || weaponId === 'upg_a2_06') {
    const cx = 16
    const orbR = weaponId === 'wpn_tempest_sphere' ? 8.5 : 7
    // Floating crackling sphere catalyst
    ctx.fillStyle = secondaryColor
    ctx.strokeStyle = edge
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, 0, orbR, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Orbiting energy ring
    ctx.strokeStyle = glow
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(
      cx,
      0,
      orbR * 1.45,
      orbR * 0.52,
      opts.animTime * 4,
      0,
      Math.PI * 2
    )
    ctx.stroke()

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(cx, 0, orbR * 0.42, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  // Default Staff / Coil / Emitter (Chain Tesla, Orbital Laser, Abyss Beam, Permafrost, Vampiric, etc.)
  ctx.strokeStyle = secondaryColor
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, 0)
  ctx.lineTo(18, 0)
  ctx.stroke()

  ctx.strokeStyle = edge
  ctx.lineWidth = 1.6
  ctx.stroke()

  // Emitter crystal / prism head
  ctx.fillStyle = edge
  ctx.strokeStyle = glow
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(26, 0)
  ctx.lineTo(19, -5.5)
  ctx.lineTo(14, 0)
  ctx.lineTo(19, 5.5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  if (opts.flashStrength > 0.05) {
    ctx.fillStyle = glow
    ctx.globalAlpha = opts.flashStrength
    ctx.beginPath()
    ctx.arc(21, 0, 7 + opts.flashStrength * 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

/**
 * Draw an actively held/mounted weapon on the player operative in world space.
 * Coordinates expect `ctx` already translated to player screen center `(cx, cy)`.
 */
export function drawWorldWeaponSprite(
  ctx: CanvasRenderingContext2D,
  opts: WorldWeaponDrawOptions
): void {
  const behavior = getWeaponVisualBehavior(opts.weaponId)
  const scale = opts.scale ?? 1
  const animTime = opts.animTime ?? 0
  const p = Math.max(0, Math.min(1, opts.actionProgress))
  const parity = opts.swingParity ?? 1
  const isLv5 = Boolean(opts.isLv5)

  let renderAngle = opts.aimAngle
  let offsetX = 12 * scale
  let offsetY = 5 * scale
  let flashStrength = 0

  if (behavior.kind === 'melee_swing') {
    if (p > 0) {
      // Smooth wide slash sweep across front arc
      const ease = 1 - Math.pow(1 - p, 2)
      const sweep = -1.25 + ease * 2.5
      renderAngle = opts.aimAngle + sweep * parity
      offsetX = 14 * scale
      offsetY = 0
      flashStrength = Math.sin(p * Math.PI)
    } else {
      renderAngle = opts.aimAngle + 0.55 * parity
      offsetX = 10 * scale
      offsetY = 7 * scale * parity
    }
  } else if (behavior.kind === 'hammer_swing') {
    if (p > 0) {
      const slamCurve = Math.sin(p * Math.PI)
      renderAngle = opts.aimAngle + (-1.1 + p * 2.2) * parity
      offsetX = (14 + slamCurve * 6) * scale
      offsetY = 0
      flashStrength = slamCurve
    } else {
      renderAngle = opts.aimAngle + 0.65
      offsetX = 9 * scale
      offsetY = 9 * scale
    }
  } else if (behavior.kind === 'flail_whip') {
    if (p > 0) {
      const snap = Math.sin(p * Math.PI)
      renderAngle = opts.aimAngle + Math.sin(p * Math.PI * 2) * 0.45
      offsetX = (12 + snap * 10) * scale
      offsetY = 0
      flashStrength = snap
    } else {
      renderAngle = opts.aimAngle + Math.sin(animTime * 4) * 0.25
      offsetX = 11 * scale
      offsetY = 8 * scale
    }
  } else if (behavior.kind === 'spear_thrust') {
    if (p > 0) {
      const thrust = Math.sin(p * Math.PI)
      offsetX = (10 + thrust * 16) * scale
      offsetY = 3 * scale
      flashStrength = thrust
    }
  } else if (behavior.kind === 'ranged_recoil' || behavior.kind === 'gatling_spin') {
    if (p > 0) {
      const kick = Math.sin(p * Math.PI)
      offsetX = (11 - kick * 5.5) * scale
      flashStrength = Math.max(0, 1 - p * 1.4)
    }
  } else {
    // glaive_spin / catalyst_pulse / beam_emitter
    if (p > 0) {
      const pulse = Math.sin(p * Math.PI)
      offsetX = (13 + pulse * 4) * scale
      flashStrength = pulse
    }
  }

  ctx.save()
  ctx.rotate(renderAngle)
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  // Subtle melee motion blur trail arc during swing
  if (
    p > 0 &&
    (behavior.kind === 'melee_swing' || behavior.kind === 'hammer_swing')
  ) {
    ctx.save()
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.45
    ctx.strokeStyle = isLv5 ? '#FFD700' : behavior.primaryColor
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, 0, 26, -0.5 * parity, 0.25 * parity, parity < 0)
    ctx.stroke()
    ctx.restore()
  }

  drawWeaponGeometry(ctx, opts.weaponId, behavior, {
    animTime,
    isLv5,
    flashStrength: opts.showMuzzleFlash === false ? 0 : flashStrength
  })
  ctx.restore()
}

const ACCESSORY_COLORS: Record<
  string,
  { primary: string; secondary: string; accent: string; shape: 'armor' | 'boots' | 'coil' | 'orb' | 'crest' | 'visor' | 'magnet' | 'cross' }
> = {
  acc_cracked_plating: { primary: '#9CA3AF', secondary: '#374151', accent: '#6B7280', shape: 'armor' },
  acc_lead_boots: { primary: '#F87171', secondary: '#44403C', accent: '#A8A29E', shape: 'boots' },
  acc_shorted_capacitor: { primary: '#F87171', secondary: '#450A0A', accent: '#FDE047', shape: 'coil' },
  acc_alloy_vest: { primary: '#E2E8F0', secondary: '#334155', accent: '#94A3B8', shape: 'armor' },
  acc_titanium_core: { primary: '#34D399', secondary: '#064E3B', accent: '#A7F3D0', shape: 'orb' },
  acc_flux_thrusters: { primary: '#34D399', secondary: '#0F172A', accent: '#38BDF8', shape: 'boots' },
  acc_magnet_array: { primary: '#38BDF8', secondary: '#1E3A8A', accent: '#FFD700', shape: 'magnet' },
  acc_overclock_coil: { primary: '#38BDF8', secondary: '#0F172A', accent: '#7DD3FC', shape: 'coil' },
  acc_crimson_amp: { primary: '#C084FC', secondary: '#3B0764', accent: '#FB7185', shape: 'crest' },
  acc_regen_matrix: { primary: '#FFD700', secondary: '#065F46', accent: '#34D399', shape: 'cross' },
  acc_aegis_plating: { primary: '#38BDF8', secondary: '#1E293B', accent: '#E0F2FE', shape: 'armor' },
  acc_chrono_accelerator: { primary: '#C084FC', secondary: '#1E1B4B', accent: '#00F0FF', shape: 'orb' },
  acc_berserker_crest: { primary: '#FFD700', secondary: '#7F1D1D', accent: '#FB7185', shape: 'crest' },
  acc_calamity_heart: { primary: '#FF2E63', secondary: '#18181B', accent: '#FDE047', shape: 'orb' },
  acc_targeting_visor: { primary: '#38BDF8', secondary: '#0F172A', accent: '#FF2E63', shape: 'visor' },
  acc_assassin_core: { primary: '#C084FC', secondary: '#1E1B4B', accent: '#FF2E63', shape: 'crest' }
}

function drawAccessoryGeometry(
  ctx: CanvasRenderingContext2D,
  itemId: string
): void {
  const cfg = ACCESSORY_COLORS[itemId] || {
    primary: '#38BDF8',
    secondary: '#1E293B',
    accent: '#E2E8F0',
    shape: 'orb' as const
  }

  ctx.save()
  if (cfg.shape === 'armor') {
    // Tactical chestplate silhouette
    ctx.fillStyle = cfg.secondary
    ctx.strokeStyle = cfg.primary
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-14, -14)
    ctx.lineTo(-5, -17)
    ctx.lineTo(0, -12)
    ctx.lineTo(5, -17)
    ctx.lineTo(14, -14)
    ctx.lineTo(17, -4)
    ctx.lineTo(12, 15)
    ctx.lineTo(0, 19)
    ctx.lineTo(-12, 15)
    ctx.lineTo(-17, -4)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Core plate / crack accent
    ctx.strokeStyle = cfg.accent
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-8, -3)
    ctx.lineTo(0, 3)
    ctx.lineTo(8, -3)
    ctx.stroke()
    if (itemId === 'acc_cracked_plating') {
      ctx.strokeStyle = '#EF4444'
      ctx.beginPath()
      ctx.moveTo(-6, -10)
      ctx.lineTo(1, -2)
      ctx.lineTo(-3, 7)
      ctx.stroke()
    }
  } else if (cfg.shape === 'boots') {
    // Twin angled armored combat boots + jet wake
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * 8, side * 2)
      ctx.fillStyle = cfg.secondary
      ctx.strokeStyle = cfg.primary
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-5, -13)
      ctx.lineTo(4, -13)
      ctx.lineTo(5, 3)
      ctx.lineTo(10, 7)
      ctx.lineTo(10, 12)
      ctx.lineTo(-6, 12)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = cfg.accent
      ctx.fillRect(-5, -7, 9, 3)
      ctx.restore()
    }
  } else if (cfg.shape === 'coil') {
    // High-voltage inductor coil cylinder
    ctx.fillStyle = cfg.secondary
    ctx.strokeStyle = cfg.primary
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.roundRect(-12, -16, 24, 32, 5)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = cfg.accent
    ctx.lineWidth = 2.2
    for (let r = -9; r <= 9; r += 6) {
      ctx.beginPath()
      ctx.moveTo(-10, r)
      ctx.lineTo(10, r)
      ctx.stroke()
    }
    ctx.fillStyle = cfg.accent
    ctx.beginPath()
    ctx.arc(0, -18, 3.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (cfg.shape === 'magnet') {
    // Quantum Coin Magnet horseshoe coil
    ctx.strokeStyle = cfg.primary
    ctx.lineWidth = 7
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.arc(0, -2, 13, Math.PI, 0, false)
    ctx.stroke()
    ctx.fillStyle = cfg.secondary
    ctx.fillRect(-16.5, -2, 7, 14)
    ctx.fillRect(9.5, -2, 7, 14)
    ctx.fillStyle = cfg.accent
    ctx.fillRect(-16.5, 7, 7, 5)
    ctx.fillRect(9.5, 7, 7, 5)
  } else if (cfg.shape === 'cross') {
    // Bio-synth nanite hex core with cross
    ctx.fillStyle = cfg.secondary
    ctx.strokeStyle = cfg.primary
    ctx.lineWidth = 2.2
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * 17
      const py = Math.sin(a) * 17
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = cfg.accent
    ctx.fillRect(-3.5, -10, 7, 20)
    ctx.fillRect(-10, -3.5, 20, 7)
  } else if (cfg.shape === 'visor') {
    // Sleek cybernetic targeting optics visor
    ctx.fillStyle = cfg.secondary
    ctx.strokeStyle = cfg.primary
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-19, -5)
    ctx.lineTo(0, -10)
    ctx.lineTo(19, -5)
    ctx.lineTo(15, 8)
    ctx.lineTo(3, 5)
    ctx.lineTo(-3, 5)
    ctx.lineTo(-15, 8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = cfg.accent
    ctx.beginPath()
    ctx.arc(8, -1, 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = cfg.accent
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-13, -1)
    ctx.lineTo(2, -1)
    ctx.stroke()
  } else if (cfg.shape === 'crest') {
    // Horned tactical crest / sigil
    ctx.fillStyle = cfg.secondary
    ctx.strokeStyle = cfg.primary
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(0, -18)
    ctx.lineTo(7, -8)
    ctx.lineTo(17, -14)
    ctx.lineTo(12, 4)
    ctx.lineTo(0, 18)
    ctx.lineTo(-12, 4)
    ctx.lineTo(-17, -14)
    ctx.lineTo(-7, -8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = cfg.accent
    ctx.beginPath()
    ctx.moveTo(0, -8)
    ctx.lineTo(6, 1)
    ctx.lineTo(0, 10)
    ctx.lineTo(-6, 1)
    ctx.closePath()
    ctx.fill()
  } else {
    // Reactor Core / Chrono Orb / Calamity Heart
    ctx.fillStyle = cfg.secondary
    ctx.strokeStyle = cfg.primary
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(0, 0, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = cfg.accent
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.ellipse(0, 0, 19, 7, 0.55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, 0, 19, 7, -0.55, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = cfg.accent
    ctx.beginPath()
    ctx.arc(0, 0, 6.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export interface BoxSpriteOptions {
  glowColor?: string
  stars?: number
  isEquipped?: boolean
}

/**
 * Draw a centered, crisp item sprite for UI boxes (Armory Grid, Inspect Modal, Equipped Slots).
 */
export function drawCatalogItemSprite(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  size: number,
  opts: BoxSpriteOptions = {}
): void {
  ctx.clearRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2

  const isWeapon = itemId.startsWith('wpn_') || itemId.startsWith('upg_')
  const behavior = isWeapon ? getWeaponVisualBehavior(itemId) : null
  const accColor = ACCESSORY_COLORS[itemId]?.primary
  const glowColor = opts.glowColor || behavior?.primaryColor || accColor || '#38BDF8'

  // Subtle radial backdrop aura matching rarity / item accent
  const grad = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.46)
  grad.addColorStop(0, `${glowColor}44`)
  grad.addColorStop(0.65, `${glowColor}14`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(cx, cy)

  if (isWeapon && behavior) {
    // Center weapon nicely inside the square box at a dynamic -35° showcase angle
    const baseScale = (size / 64) * 1.18
    ctx.rotate(-0.62)
    ctx.translate(-12 * baseScale, 2 * baseScale)
    ctx.scale(baseScale, baseScale)
    drawWeaponGeometry(ctx, itemId, behavior, {
      animTime: 0.4,
      isLv5: (opts.stars ?? 0) >= 5,
      flashStrength: 0
    })
  } else {
    const baseScale = (size / 64) * 1.25
    ctx.scale(baseScale, baseScale)
    drawAccessoryGeometry(ctx, itemId)
  }

  ctx.restore()
}
