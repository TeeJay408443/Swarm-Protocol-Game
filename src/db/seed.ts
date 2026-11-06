import { createClient } from '@supabase/supabase-js'
import { upgrades, enemies, achievements, heroes } from './seedData'

// Use environment variables from process (Node.js) or import.meta.env (Vite)
const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Seed order matters: upgrades must be created before heroes
    // because heroes.starting_upgrade_id references public.upgrades(id)

    console.log('📦 Seeding upgrades...')
    const { error: upgradeError } = await supabase
      .from('upgrades')
      .insert(upgrades)
    
    if (upgradeError) {
      console.error('❌ Error seeding upgrades:', upgradeError)
      throw upgradeError
    }
    console.log(`✅ Seeded ${upgrades.length} upgrades`)

    console.log('👾 Seeding enemies...')
    const { error: enemyError } = await supabase
      .from('enemies')
      .insert(enemies)
    
    if (enemyError) {
      console.error('❌ Error seeding enemies:', enemyError)
      throw enemyError
    }
    console.log(`✅ Seeded ${enemies.length} enemies`)

    console.log('🏆 Seeding achievements...')
    const { error: achievementError } = await supabase
      .from('achievements')
      .insert(achievements)
    
    if (achievementError) {
      console.error('❌ Error seeding achievements:', achievementError)
      throw achievementError
    }
    console.log(`✅ Seeded ${achievements.length} achievements`)

    console.log('🦸 Seeding heroes...')
    const { error: heroError } = await supabase
      .from('heroes')
      .insert(heroes)
    
    if (heroError) {
      console.error('❌ Error seeding heroes:', heroError)
      throw heroError
    }
    console.log(`✅ Seeded ${heroes.length} heroes`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log(`📊 Total entities seeded: ${upgrades.length + enemies.length + achievements.length + heroes.length}`)
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase()
