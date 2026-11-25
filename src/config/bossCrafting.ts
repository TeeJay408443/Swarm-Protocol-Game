export interface BossDropMaterial {
  id: string
  name: string
  description: string
  accentColor: string
}

export interface BossCraftingBossSet {
  id: string
  name: string
  materials: [BossDropMaterial, BossDropMaterial, BossDropMaterial]
  recipeId: string
  itemId: string
}

export interface BossCraftingRecipe {
  id: string
  bossId: string
  itemId: string
  materials: Array<{ materialId: string; quantity: number }>
  gearIngredients?: Array<{ itemId: string; quantity: number }>
}

function createMaterials(
  bossId: string,
  entries: Array<[string, string, string, string]>
): [BossDropMaterial, BossDropMaterial, BossDropMaterial] {
  return entries.map(([name, description, suffix, accentColor]) => ({
    id: `mat_${bossId}_${suffix}`,
    name,
    description,
    accentColor
  })) as [BossDropMaterial, BossDropMaterial, BossDropMaterial]
}

export const PLAYABLE_BOSS_DROP_SETS: BossCraftingBossSet[] = [
  {
    id: 'aegis_commander',
    name: 'Aegis Commander Drone',
    materials: createMaterials('aegis_commander', [
      ['Aegis Command Core', 'A precision command processor recovered from the drone.', 'core', '#F87171'],
      ['Redline Capacitor', 'A charged capacitor still pulsing with Aegis weapon energy.', 'capacitor', '#FB7185'],
      ['Commander Alloy', 'Dense armor plating stamped with the Aegis unit mark.', 'alloy', '#FCA5A5']
    ]),
    recipeId: 'recipe_aegis_commander',
    itemId: 'wpn_crafted_aegis_commander'
  },
  {
    id: 'omega_overlord',
    name: 'Omega Overlord',
    materials: createMaterials('omega_overlord', [
      ['Overlord Crown Shard', 'A fractured segment from Omega Overlord’s command crown.', 'crown', '#FF2E63'],
      ['Omega Reactor Cell', 'A reactor cell containing the Overlord’s final-phase charge.', 'reactor', '#F43F5E'],
      ['Calamity Hull Plate', 'A blackened plate from the Overlord’s outer armor.', 'plate', '#BE123C']
    ]),
    recipeId: 'recipe_omega_overlord',
    itemId: 'acc_crafted_omega_overlord'
  },
  {
    id: 'astral_bastion_warden',
    name: 'Astral Bastion Warden',
    materials: createMaterials('astral_bastion_warden', [
      ['Bastion Mortar Lens', 'A targeting lens from the Warden’s telegraphed mortar array.', 'lens', '#F59E0B'],
      ['Citadel Anchor Stone', 'An emerald stone stabilizing the Warden’s armor frame.', 'stone', '#D97706'],
      ['Warden Bastion Plate', 'A heavy plate salvaged from the Astral Bastion shell.', 'plate', '#FBBF24']
    ]),
    recipeId: 'recipe_astral_bastion_warden',
    itemId: 'acc_crafted_astral_bastion_warden'
  },
  {
    id: 'emerald_prism_monarch',
    name: 'Emerald Prism Monarch',
    materials: createMaterials('emerald_prism_monarch', [
      ['Monarch Prism', 'A clear emerald prism from the Monarch’s shield array.', 'prism', '#10B981'],
      ['Sovereign Facet', 'A razor-edged facet carrying the Monarch’s laser charge.', 'facet', '#34D399'],
      ['Emerald Crown Filament', 'A luminous filament from the Monarch’s orbital crown.', 'filament', '#6EE7B7']
    ]),
    recipeId: 'recipe_emerald_prism_monarch',
    itemId: 'wpn_crafted_emerald_prism_monarch'
  },
  {
    id: 'astral_vortex_colossus',
    name: 'Astral Vortex Colossus',
    materials: createMaterials('astral_vortex_colossus', [
      ['Vortex Singularity', 'A contained gravity core from the Colossus dreadnought.', 'singularity', '#38BDF8'],
      ['Colossus Hull Fragment', 'A reinforced hull segment warped by the vortex.', 'hull', '#0EA5E9'],
      ['Astral Drive Coil', 'A charged coil recovered from the Colossus propulsion system.', 'coil', '#7DD3FC']
    ]),
    recipeId: 'recipe_astral_vortex_colossus',
    itemId: 'wpn_crafted_astral_vortex_colossus'
  },
  {
    id: 'solar_archon_seraph',
    name: 'Solar Archon Seraph',
    materials: createMaterials('solar_archon_seraph', [
      ['Seraph Sunstone', 'A radiant core shard from the Seraph’s solar crown.', 'sunstone', '#FACC15'],
      ['Archon Wing Sigil', 'A golden sigil from the Seraph’s celestial armor.', 'sigil', '#FDE047'],
      ['Solar Lattice Thread', 'A strand of the Seraph’s crossfire lattice.', 'thread', '#FEF08A']
    ]),
    recipeId: 'recipe_solar_archon_seraph',
    itemId: 'acc_crafted_solar_archon_seraph'
  },
  {
    id: 'astral_scourge',
    name: 'Astral Scourge',
    materials: createMaterials('astral_scourge', [
      ['Scourge Starheart', 'A dense starheart recovered after the Scourge’s final phase.', 'starheart', '#34D399'],
      ['Riftborne Scale', 'A shimmering scale from the Scourge’s segmented hide.', 'scale', '#22D3EE'],
      ['Astral Tail Splice', 'A charged tail fragment still resonating with the Scourge.', 'splice', '#A7F3D0']
    ]),
    recipeId: 'recipe_astral_scourge',
    itemId: 'wpn_crafted_astral_scourge'
  },
  {
    id: 'crucible_brute',
    name: 'Crucible Brute',
    materials: createMaterials('crucible_brute', [
      ['Crucible Core', 'A hot iron heart recovered from the Brute’s chest furnace.', 'core', '#F97316'],
      ['Basalt Knuckle', 'A dense basalt plate from the Brute’s armored fists.', 'knuckle', '#B45309'],
      ['Forge Ash', 'A pouch of ember-rich ash from the Brute’s exhaust vents.', 'ash', '#FDBA74']
    ]),
    recipeId: 'recipe_crucible_brute',
    itemId: 'acc_crafted_crucible_brute'
  },
  {
    id: 'cinder_crown',
    name: 'Cinder Crown',
    materials: createMaterials('cinder_crown', [
      ['Cinder Crown Shard', 'A glowing crown fragment from the Cinder Crown.', 'crown', '#FB923C'],
      ['Emberglass Lens', 'A lens that focuses the boss’s molten projectiles.', 'lens', '#FBBF24'],
      ['Ashen Signet', 'A heat-sealed signet from its command armor.', 'signet', '#C2410C']
    ]),
    recipeId: 'recipe_cinder_crown',
    itemId: 'acc_crafted_cinder_crown'
  },
  {
    id: 'magma_artificer',
    name: 'Magma Artificer',
    materials: createMaterials('magma_artificer', [
      ['Artificer Crucible', 'A miniature crucible still holding the boss’s molten charge.', 'crucible', '#F97316'],
      ['Runesmith Sigil', 'A carved rune from the Artificer’s spell-forging array.', 'sigil', '#FACC15'],
      ['Magma Thread', 'A filament of hardened magma drawn from its armor seams.', 'thread', '#EA580C']
    ]),
    recipeId: 'recipe_magma_artificer',
    itemId: 'acc_crafted_magma_artificer'
  },
  {
    id: 'searing_juggernaut',
    name: 'Searing Juggernaut',
    materials: createMaterials('searing_juggernaut', [
      ['Juggernaut Furnace Plate', 'A massive armor plate that retains the Juggernaut’s heat.', 'plate', '#C2410C'],
      ['Searing Drive Core', 'A reactor core from the Wave 15 champion’s charge engine.', 'core', '#F97316'],
      ['Cinderwall Rivet', 'A reinforced rivet from its layered siege armor.', 'rivet', '#FDBA74']
    ]),
    recipeId: 'recipe_searing_juggernaut',
    itemId: 'acc_crafted_searing_juggernaut'
  },
  {
    id: 'furnace_leviathan',
    name: 'Furnace Leviathan',
    materials: createMaterials('furnace_leviathan', [
      ['Leviathan Scale', 'A heat-tempered scale from the Furnace Leviathan.', 'scale', '#F97316'],
      ['Pyroclast Vent', 'A vent nozzle that once propelled its sweeping rushes.', 'vent', '#FDBA74'],
      ['Foundry Heart', 'A dense heartstone from its molten reactor chamber.', 'heart', '#FACC15']
    ]),
    recipeId: 'recipe_furnace_leviathan',
    itemId: 'acc_crafted_furnace_leviathan'
  },
  {
    id: 'primordial_starforge',
    name: 'Inferno Champion',
    materials: createMaterials('primordial_starforge', [
      ['Inferno Flameheart', 'A burning core fragment from Inferno Champion.', 'starheart', '#FDE047'],
      ['Molten Wing Shard', 'A basalt feather shard still glowing with furnace heat.', 'shard', '#FB923C'],
      ['Champion’s Cinder Sigil', 'A victory mark forged in the Starforge’s final chamber.', 'sigil', '#EA580C']
    ]),
    recipeId: 'recipe_primordial_starforge',
    itemId: 'acc_crafted_primordial_starforge'
  }
]

export const BOSS_CRAFTING_RECIPES: BossCraftingRecipe[] = PLAYABLE_BOSS_DROP_SETS.map(
  (boss) => ({
    id: boss.recipeId,
    bossId: boss.id,
    itemId: boss.itemId,
    materials: boss.materials.map((material) => ({
      materialId: material.id,
      quantity: 1
    }))
  })
)

export const GEAR_FUSION_RECIPES: BossCraftingRecipe[] = [
  {
    id: 'recipe_solar_void_reaper',
    bossId: 'astral_scourge',
    itemId: 'wpn_crafted_solar_void_reaper',
    gearIngredients: [
      { itemId: 'wpn_void_reaper', quantity: 1 },
      { itemId: 'wpn_solar_flail', quantity: 1 }
    ],
    materials: [{ materialId: 'mat_astral_scourge_starheart', quantity: 1 }]
  },
  {
    id: 'recipe_eclipse_aegis',
    bossId: 'astral_scourge',
    itemId: 'acc_crafted_eclipse_aegis',
    gearIngredients: [
      { itemId: 'acc_crafted_omega_overlord', quantity: 1 },
      { itemId: 'acc_crafted_solar_archon_seraph', quantity: 1 }
    ],
    materials: [{ materialId: 'mat_astral_scourge_starheart', quantity: 1 }]
  },
  {
    id: 'recipe_vortex_harness',
    bossId: 'astral_vortex_colossus',
    itemId: 'acc_crafted_vortex_harness',
    gearIngredients: [
      { itemId: 'wpn_crafted_astral_vortex_colossus', quantity: 1 },
      { itemId: 'acc_crafted_astral_bastion_warden', quantity: 1 }
    ],
    materials: [{ materialId: 'mat_astral_vortex_colossus_singularity', quantity: 1 }]
  }
]

export const ALL_CRAFTING_RECIPES: BossCraftingRecipe[] = [
  ...BOSS_CRAFTING_RECIPES,
  ...GEAR_FUSION_RECIPES
]

export const BOSS_DROP_MATERIALS: BossDropMaterial[] = PLAYABLE_BOSS_DROP_SETS.flatMap(
  (boss) => boss.materials
)

/**
 * Resolve a defeated in-game enemy to its loot set. The Area 1 final-boss
 * encounter shares the Aegis enemy template, so its final-boss flag identifies
 * the distinct Omega Overlord set.
 */
export function getBossDropSetId(
  enemyId: string,
  isFinalBoss = false
): string | null {
  if (enemyId === 'ene_04') return isFinalBoss ? 'omega_overlord' : 'aegis_commander'
  if (enemyId === 'ene_a2_05') return 'astral_bastion_warden'
  if (enemyId === 'boss_a2_05') return 'emerald_prism_monarch'
  if (enemyId === 'boss_a2_10') return 'astral_vortex_colossus'
  if (enemyId === 'boss_a2_15') return 'solar_archon_seraph'
  if (enemyId === 'boss_a2_20') return 'astral_scourge'
  if (enemyId === 'ene_a3_05') return 'crucible_brute'
  if (enemyId === 'boss_a3_05') return 'cinder_crown'
  if (enemyId === 'boss_a3_10') return 'magma_artificer'
  if (enemyId === 'boss_a3_15') return 'searing_juggernaut'
  if (enemyId === 'ene_a3_06') return 'furnace_leviathan'
  if (enemyId === 'boss_a3_20') return 'primordial_starforge'
  return null
}
