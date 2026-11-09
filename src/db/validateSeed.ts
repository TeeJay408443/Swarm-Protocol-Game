/**
 * Seed Data Validation Script for Swarm Protocol: Survivor
 * Phase 2: Game Content - Validate all seed data integrity
 * 
 * Run with: npm run db:validate
 */

import {
  upgrades,
  enemies,
  achievements,
  heroes,
} from './seedData'
import {
  enhancedUpgrades,
  enhancedEnemies,
  enhancedHeroes,
  enhancedAchievements,
} from './seedDataEnhanced'

// ============================================
// VALIDATION RESULTS TYPE
// ============================================

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  info: string[]
}

interface ValidationStats {
  totalChecks: number
  passed: number
  failed: number
  warnings: number
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate that all entities have unique IDs
 */
function validateUniqueIds<T extends { id: string }>(
  entities: T[],
  entityType: string
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  const ids = new Set<string>()
  const duplicates: string[] = []

  for (const entity of entities) {
    if (ids.has(entity.id)) {
      duplicates.push(entity.id)
      result.valid = false
    }
    ids.add(entity.id)
  }

  if (duplicates.length > 0) {
    result.errors.push(
      `❌ ${entityType}: Found ${duplicates.length} duplicate IDs: ${duplicates.join(', ')}`
    )
  } else {
    result.info.push(`✅ ${entityType}: All ${entities.length} IDs are unique`)
  }

  return result
}

/**
 * Validate that all referenced IDs exist
 */
function validateReferences(
  entities: any[],
  entityType: string,
  referenceField: string,
  targetEntities: any[],
  targetType: string
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  const targetIds = new Set(targetEntities.map((e: any) => e.id))
  const missingReferences: string[] = []

  for (const entity of entities) {
    const refId = entity[referenceField]
    if (refId && !targetIds.has(refId)) {
      missingReferences.push(`${entity.id} -> ${refId}`)
      result.valid = false
    }
  }

  if (missingReferences.length > 0) {
    result.errors.push(
      `❌ ${entityType}: Found ${missingReferences.length} missing references to ${targetType}: ${missingReferences.join(', ')}`
    )
  } else {
    result.info.push(
      `✅ ${entityType}: All ${entities.length} references to ${targetType} are valid`
    )
  }

  return result
}

/**
 * Validate that numeric values are positive
 */
function validatePositiveNumbers<T>(
  entities: T[],
  entityType: string,
  fields: (keyof T)[]
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  const invalidEntities: string[] = []

  for (const entity of entities) {
    for (const field of fields) {
      const value = (entity as any)[field]
      if (typeof value === 'number' && value <= 0) {
        invalidEntities.push(`${entityType}.${(entity as any).id}.${String(field)} = ${value}`)
        result.valid = false
      }
    }
  }

  if (invalidEntities.length > 0) {
    result.errors.push(
      `❌ ${entityType}: Found ${invalidEntities.length} non-positive numeric values: ${invalidEntities.join(', ')}`
    )
  } else {
    result.info.push(
      `✅ ${entityType}: All specified numeric fields have positive values`
    )
  }

  return result
}

/**
 * Validate that string fields are non-empty
 */
function validateNonEmptyStrings<T>(
  entities: T[],
  entityType: string,
  fields: (keyof T)[]
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  const emptyFields: string[] = []

  for (const entity of entities) {
    for (const field of fields) {
      const value = (entity as any)[field]
      if (typeof value === 'string' && value.trim() === '') {
        emptyFields.push(`${entityType}.${(entity as any).id}.${String(field)}`)
        result.valid = false
      }
    }
  }

  if (emptyFields.length > 0) {
    result.errors.push(
      `❌ ${entityType}: Found ${emptyFields.length} empty string fields: ${emptyFields.join(', ')}`
    )
  } else {
    result.info.push(
      `✅ ${entityType}: All specified string fields have non-empty values`
    )
  }

  return result
}

/**
 * Validate entity counts
 */
function validateEntityCounts(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  const expectedCounts = {
    upgrades: 15,
    enemies: 4,
    achievements: 4,
    heroes: 6,
    total: 29,
  }

  const actualCounts = {
    upgrades: upgrades.length,
    enemies: enemies.length,
    achievements: achievements.length,
    heroes: heroes.length,
    total: upgrades.length + enemies.length + achievements.length + heroes.length,
  }

  let allMatch = true

  for (const [type, expected] of Object.entries(expectedCounts)) {
    const actual = (actualCounts as any)[type]
    if (actual !== expected) {
      result.errors.push(
        `❌ ${type}: Expected ${expected} entities, found ${actual}`
      )
      allMatch = false
    } else {
      result.info.push(`✅ ${type}: Found ${actual} entities (expected ${expected})`)
    }
  }

  if (allMatch) {
    result.info.push(
      `✅ Total: All ${actualCounts.total} entities match expected count`
    )
  }

  result.valid = allMatch
  return result
}

/**
 * Validate category distributions
 */
function validateCategoryDistributions(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  // Check upgrade categories
  const upgradeCategories = new Map<string, number>()
  for (const upgrade of upgrades) {
    const count = upgradeCategories.get(upgrade.category) || 0
    upgradeCategories.set(upgrade.category, count + 1)
  }

  result.info.push(
    `ℹ️ Upgrade categories: ${Array.from(upgradeCategories.entries())
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ')}`
  )

  // Check enemy categories
  const enemyCategories = new Map<string, number>()
  for (const enemy of enemies) {
    const count = enemyCategories.get(enemy.category) || 0
    enemyCategories.set(enemy.category, count + 1)
  }

  result.info.push(
    `ℹ️ Enemy categories: ${Array.from(enemyCategories.entries())
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ')}`
  )

  // Check hero archetypes
  const heroArchetypes = new Map<string, number>()
  for (const hero of heroes) {
    const count = heroArchetypes.get(hero.archetype) || 0
    heroArchetypes.set(hero.archetype, count + 1)
  }

  result.info.push(
    `ℹ️ Hero archetypes: ${Array.from(heroArchetypes.entries())
      .map(([arch, count]) => `${arch}: ${count}`)
      .join(', ')}`
  )

  return result
}

/**
 * Validate hero starting upgrades
 */
function validateHeroStartingUpgrades(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  const upgradeIds = new Set(upgrades.map(u => u.id))
  const missingUpgrades: string[] = []

  for (const hero of heroes) {
    if (!upgradeIds.has(hero.starting_upgrade_id)) {
      missingUpgrades.push(`${hero.id} -> ${hero.starting_upgrade_id}`)
      result.valid = false
    }
  }

  if (missingUpgrades.length > 0) {
    result.errors.push(
      `❌ Heroes: Found ${missingUpgrades.length} heroes with invalid starting upgrades: ${missingUpgrades.join(', ')}`
    )
  } else {
    result.info.push(
      `✅ Heroes: All ${heroes.length} heroes have valid starting upgrades`
    )
  }

  // Check for unique starting upgrades
  const startingUpgradeUsage = new Map<string, string[]>()
  for (const hero of heroes) {
    const upgradeId = hero.starting_upgrade_id
    const heroesWithUpgrade = startingUpgradeUsage.get(upgradeId) || []
    heroesWithUpgrade.push(hero.id)
    startingUpgradeUsage.set(upgradeId, heroesWithUpgrade)
  }

  for (const [upgradeId, heroIds] of startingUpgradeUsage) {
    if (heroIds.length > 1) {
      result.warnings.push(
        `⚠️ Upgrade ${upgradeId} is the starting upgrade for multiple heroes: ${heroIds.join(', ')}`
      )
    }
  }

  return result
}

/**
 * Validate balance values
 */
function validateBalance(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  // Check that no hero has 0 HP or speed
  for (const hero of heroes) {
    if (hero.hp <= 0) {
      result.errors.push(`❌ Hero ${hero.id}: HP must be greater than 0`)
      result.valid = false
    }
    if (hero.speed <= 0) {
      result.errors.push(`❌ Hero ${hero.id}: Speed must be greater than 0`)
      result.valid = false
    }
  }

  // Check that no enemy has 0 HP or speed
  for (const enemy of enemies) {
    if (enemy.hp <= 0) {
      result.errors.push(`❌ Enemy ${enemy.id}: HP must be greater than 0`)
      result.valid = false
    }
    if (enemy.speed <= 0) {
      result.errors.push(`❌ Enemy ${enemy.id}: Speed must be greater than 0`)
      result.valid = false
    }
    if (enemy.coin_value <= 0) {
      result.errors.push(`❌ Enemy ${enemy.id}: Coin value must be greater than 0`)
      result.valid = false
    }
  }

  // Check upgrade cooldowns
  for (const upgrade of upgrades) {
    if (upgrade.cooldown_s < 0) {
      result.errors.push(`❌ Upgrade ${upgrade.id}: Cooldown cannot be negative`)
      result.valid = false
    }
  }

  if (result.valid) {
    result.info.push('✅ Balance: All numeric values are valid')
  }

  return result
}

/**
 * Validate enhanced data consistency
 */
function validateEnhancedData(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  // Check that enhanced data has same IDs as base data
  const upgradeIds = new Set(upgrades.map(u => u.id))
  const enhancedUpgradeIds = new Set(enhancedUpgrades.map(u => u.id))
  
  if (upgradeIds.size !== enhancedUpgradeIds.size) {
    result.errors.push(
      `❌ Enhanced upgrades: Base has ${upgradeIds.size}, enhanced has ${enhancedUpgradeIds.size}`
    )
    result.valid = false
  }

  const enemyIds = new Set(enemies.map(e => e.id))
  const enhancedEnemyIds = new Set(enhancedEnemies.map(e => e.id))
  
  if (enemyIds.size !== enhancedEnemyIds.size) {
    result.errors.push(
      `❌ Enhanced enemies: Base has ${enemyIds.size}, enhanced has ${enhancedEnemyIds.size}`
    )
    result.valid = false
  }

  const heroIds = new Set(heroes.map(h => h.id))
  const enhancedHeroIds = new Set(enhancedHeroes.map(h => h.id))
  
  if (heroIds.size !== enhancedHeroIds.size) {
    result.errors.push(
      `❌ Enhanced heroes: Base has ${heroIds.size}, enhanced has ${enhancedHeroIds.size}`
    )
    result.valid = false
  }

  const achievementIds = new Set(achievements.map(a => a.id))
  const enhancedAchievementIds = new Set(enhancedAchievements.map(a => a.id))
  
  if (achievementIds.size !== enhancedAchievementIds.size) {
    result.errors.push(
      `❌ Enhanced achievements: Base has ${achievementIds.size}, enhanced has ${enhancedAchievementIds.size}`
    )
    result.valid = false
  }

  if (result.valid) {
    result.info.push('✅ Enhanced data: All enhanced datasets match base datasets')
  }

  return result
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

export function validateSeedData(): ValidationResult & { stats: ValidationStats } {
  const allResults: ValidationResult[] = []
  const stats: ValidationStats = {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  }

  // Run all validations
  
  // 1. Entity counts
  allResults.push(validateEntityCounts())
  
  // 2. Unique IDs
  allResults.push(validateUniqueIds(upgrades, 'Upgrades'))
  allResults.push(validateUniqueIds(enemies, 'Enemies'))
  allResults.push(validateUniqueIds(achievements, 'Achievements'))
  allResults.push(validateUniqueIds(heroes, 'Heroes'))
  
  // 3. References
  allResults.push(validateReferences(heroes, 'Heroes', 'starting_upgrade_id', upgrades, 'Upgrades'))
  
  // 4. Numeric validation
  allResults.push(validatePositiveNumbers(upgrades, 'Upgrades', ['damage', 'cooldown_s']))
  allResults.push(validatePositiveNumbers(enemies, 'Enemies', ['hp', 'speed', 'coin_value']))
  allResults.push(validatePositiveNumbers(heroes, 'Heroes', ['hp', 'speed']))
  
  // 5. String validation
  allResults.push(validateNonEmptyStrings(upgrades, 'Upgrades', ['id', 'name', 'category', 'function_desc']))
  allResults.push(validateNonEmptyStrings(enemies, 'Enemies', ['id', 'name', 'category', 'description']))
  allResults.push(validateNonEmptyStrings(achievements, 'Achievements', ['id', 'title', 'requirement', 'reward_badge']))
  allResults.push(validateNonEmptyStrings(heroes, 'Heroes', ['id', 'name', 'archetype', 'lore']))
  
  // 6. Category distributions
  allResults.push(validateCategoryDistributions())
  
  // 7. Hero starting upgrades
  allResults.push(validateHeroStartingUpgrades())
  
  // 8. Balance validation
  allResults.push(validateBalance())
  
  // 9. Enhanced data validation
  allResults.push(validateEnhancedData())

  // Aggregate results
  const mergedResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  }

  for (const result of allResults) {
    stats.totalChecks += 1
    if (result.valid) {
      stats.passed += 1
    } else {
      stats.failed += 1
    }
    stats.warnings += result.warnings.length
    
    mergedResult.valid = mergedResult.valid && result.valid
    mergedResult.errors.push(...result.errors)
    mergedResult.warnings.push(...result.warnings)
    mergedResult.info.push(...result.info)
  }

  return {
    ...mergedResult,
    stats,
  }
}

// ============================================
// RUN VALIDATION AND PRINT RESULTS
// ============================================

function printResults(result: ValidationResult & { stats: ValidationStats }): void {
  console.log('\n' + '='.repeat(70))
  console.log('SWARM PROTOCOL: SURVIVOR - SEED DATA VALIDATION')
  console.log('='.repeat(70) + '\n')

  // Print stats
  console.log('📊 VALIDATION STATISTICS')
  console.log('-'.repeat(70))
  console.log(`Total Checks: ${result.stats.totalChecks}`)
  console.log(`Passed: ${result.stats.passed}`)
  console.log(`Failed: ${result.stats.failed}`)
  console.log(`Warnings: ${result.stats.warnings}`)
  console.log('-'.repeat(70) + '\n')

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ ERRORS')
    console.log('-'.repeat(70))
    for (const error of result.errors) {
      console.log(`  ${error}`)
    }
    console.log('-'.repeat(70) + '\n')
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS')
    console.log('-'.repeat(70))
    for (const warning of result.warnings) {
      console.log(`  ${warning}`)
    }
    console.log('-'.repeat(70) + '\n')
  }

  // Print info
  if (result.info.length > 0) {
    console.log('ℹ️  INFO')
    console.log('-'.repeat(70))
    for (const info of result.info) {
      console.log(`  ${info}`)
    }
    console.log('-'.repeat(70) + '\n')
  }

  // Final result
  console.log('='.repeat(70))
  if (result.valid) {
    console.log('✅ ALL VALIDATIONS PASSED!')
    console.log('Seed data is ready for production use.')
  } else {
    console.log('❌ VALIDATION FAILED!')
    console.log('Please fix the errors above before using seed data.')
  }
  console.log('='.repeat(70) + '\n')
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateSeedData()
  printResults(result)
  process.exit(result.valid ? 0 : 1)
}

export default validateSeedData
