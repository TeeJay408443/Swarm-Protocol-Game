import { useState, useEffect, useRef } from 'react'
import { WaveManager, XPManager, AutoTargeting, ScoreManager } from './game'
import { heroes, enemies, upgrades } from './db/seedData'
import './App.css'

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused'>('menu')
  const [selectedHero, setSelectedHero] = useState<string | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpCards, setLevelUpCards] = useState<any[]>([])
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  
  // Game system refs
  const waveManagerRef = useRef<WaveManager | null>(null)
  const xpManagerRef = useRef<XPManager | null>(null)
  const scoreManagerRef = useRef<ScoreManager | null>(null)
  const autoTargetingRef = useRef<AutoTargeting | null>(null)
  
  // Game state
  const [currentWave, setCurrentWave] = useState(1)
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const [enemiesInWave, setEnemiesInWave] = useState<any[]>([])
  const [playerHP, setPlayerHP] = useState(100)
  
  // Initialize game systems
  useEffect(() => {
    // Create game systems
    waveManagerRef.current = new WaveManager(1280, 720)
    xpManagerRef.current = new XPManager()
    scoreManagerRef.current = new ScoreManager()
    autoTargetingRef.current = new AutoTargeting(500)
    
    // Set up callbacks
    waveManagerRef.current.onWaveStart((wave) => {
      setCurrentWave(wave)
      setEnemiesInWave(generateWaveEnemies(wave))
    })
    
    waveManagerRef.current.onWaveComplete((wave, allDefeated) => {
      if (allDefeated) {
        xpManagerRef.current?.addWaveClearXP()
        scoreManagerRef.current?.addWaveClearBonus()
      }
    })
    
    waveManagerRef.current.onBossSpawn((wave) => {
      // Boss spawned!
      console.log(`Boss spawned in wave ${wave}!`)
    })
    
    waveManagerRef.current.onLevelUp((wave) => {
      setShowLevelUp(true)
      const cards = xpManagerRef.current?.generateLevelUpCards() || []
      setLevelUpCards(cards)
    })
    
    xpManagerRef.current.onLevelUp((newLevel, cards) => {
      setLevel(newLevel)
      setLevelUpCards(cards)
      setShowLevelUp(true)
    })
    
    xpManagerRef.current.onXPGained((amount, total) => {
      setXp(total)
    })
    
    scoreManagerRef.current.onScoreChanged((newScore, breakdown) => {
      setScore(newScore)
      setCoins(breakdown.coinsCollected)
    })
    
    return () => {
      waveManagerRef.current?.stop()
    }
  }, [])
  
  // Generate enemies for a wave
  const generateWaveEnemies = (wave: number) => {
    const spawnableEnemies = enemies.filter(e => e.minWave <= wave)
    const enemyCount = Math.floor(10 + wave * 0.5)
    const waveEnemies: any[] = []
    
    for (let i = 0; i < enemyCount; i++) {
      const enemy = spawnableEnemies[Math.floor(Math.random() * spawnableEnemies.length)]
      waveEnemies.push({
        ...enemy,
        id: `${enemy.id}_${i}_${Date.now()}`,
        position: {
          x: Math.random() * 1000 + 140,
          y: Math.random() * 500 + 110
        }
      })
    }
    
    return waveEnemies
  }
  
  // Start game
  const startGame = (heroId: string) => {
    setSelectedHero(heroId)
    setGameState('playing')
    setPlayerHP(100)
    
    // Start game systems
    scoreManagerRef.current?.start()
    waveManagerRef.current?.start()
    
    // Set initial enemies
    setEnemiesInWave(generateWaveEnemies(1))
  }
  
  // Select card
  const selectCard = (card: any) => {
    setSelectedCard(card.upgradeId)
    setShowLevelUp(false)
    // In a real game, this would apply the upgrade
  }
  
  // Simulate enemy defeat
  const defeatEnemy = (enemyId: string) => {
    setEnemiesInWave(prev => prev.filter(e => e.id !== enemyId))
    xpManagerRef.current?.addEnemyKillXP()
    scoreManagerRef.current?.addCoins(enemies.find(e => e.id === enemyId.split('_')[0])?.coin_value || 1)
    
    // Check if all enemies defeated
    if (enemiesInWave.length <= 1) {
      waveManagerRef.current?.enemyDefeated()
    }
  }
  
  // Take damage
  const takeDamage = () => {
    setPlayerHP(prev => {
      const newHP = prev - 10
      if (newHP <= 0) {
        endGame()
        return 0
      }
      return newHP
    })
    waveManagerRef.current?.enemyDefeated() // Reset damage free streak
  }
  
  // End game
  const endGame = () => {
    setGameState('menu')
    waveManagerRef.current?.stop()
    scoreManagerRef.current?.stop()
    setSelectedHero(null)
  }
  
  // Get hero by ID
  const getHero = (id: string) => heroes.find(h => h.id === id)
  
  // Calculate score
  const calculatedScore = Math.floor(scoreManagerRef.current?.getCurrentScore() || 0)
  
  return (
    <div className="min-h-screen bg-slate-carbon text-white">
      {gameState === 'menu' && (
        <>
          <header className="p-6 border-b border-gray-700">
            <h1 className="text-3xl font-bold text-cyan-accent">
              SWARM PROTOCOL: SURVIVOR
            </h1>
            <p className="text-gray-400 mt-2">
              Tactical Command Terminal - Phases 0-3 Complete
            </p>
          </header>
          
          <main className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-hazard-gold mb-4">
                  Select Your Hero
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {heroes.map(hero => (
                    <div 
                      key={hero.id}
                      className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => startGame(hero.id)}
                    >
                      <div className="text-cyan-accent text-2xl mb-2">🎮</div>
                      <h3 className="font-semibold text-white">{hero.name}</h3>
                      <p className="text-sm text-gray-400">{hero.archetype}</p>
                      <p className="text-xs text-gray-500 mt-2">HP: {hero.hp} | Speed: {hero.speed}x</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-hazard-gold mb-4">
                  Game Features (Phases 0-3)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-cyan-accent mb-2">✅ Wave System</h3>
                    <p className="text-sm text-gray-300">30s active + 3s breather</p>
                    <p className="text-sm text-gray-300">Boss every 5th wave</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-cyan-accent mb-2">✅ XP & Level-Up</h3>
                    <p className="text-sm text-gray-300">100 XP per level, max level 10</p>
                    <p className="text-sm text-gray-300">3 random upgrades per level</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-cyan-accent mb-2">✅ Auto-Targeting</h3>
                    <p className="text-sm text-gray-300">5 targeting modes</p>
                    <p className="text-sm text-gray-300">Smart threat scoring</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-cyan-accent mb-2">✅ Scoring System</h3>
                    <p className="text-sm text-gray-300">Formula: S = 10t + 25c</p>
                    <p className="text-sm text-gray-300">Leaderboard ready</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-cyan-accent mb-2">Next Phases:</h3>
                <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Phase 4: Wireframe application views</li>
                  <li>Phase 5: Database schema & Supabase setup</li>
                  <li>Phase 6: Build web application & CRUD UI</li>
                  <li>Phase 7: Build HTML5 Canvas game engine</li>
                  <li>Phase 8: Add features & polish</li>
                  <li>Phase 9: Test & deploy to Vercel</li>
                </ol>
              </div>
            </div>
          </main>
          
          <footer className="p-6 border-t border-gray-700 text-center text-gray-500">
            <p>Swarm Protocol: Survivor - Built with ❤️ for the Web Development Class</p>
          </footer>
        </>
      )}
      
      {gameState === 'playing' && (
        <>
          <header className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-cyan-accent">
                SWARM PROTOCOL: SURVIVOR
              </h1>
              <p className="text-sm text-gray-400">
                {selectedHero && `Hero: ${getHero(selectedHero)?.name || 'Unknown'}`}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 rounded px-4 py-2">
                <span className="text-cyan-accent font-semibold">Wave: {currentWave}</span>
              </div>
              <div className="bg-gray-800 rounded px-4 py-2">
                <span className="text-hazard-gold font-semibold">Score: {calculatedScore}</span>
              </div>
              <div className="bg-gray-800 rounded px-4 py-2">
                <span className="text-alert-red font-semibold">HP: {playerHP}</span>
              </div>
              <button 
                className="bg-gray-700 hover:bg-gray-600 rounded px-4 py-2 transition-colors"
                onClick={() => setGameState('menu')}
              >
                Quit
              </button>
            </div>
          </header>
          
          <main className="p-4">
            <div className="max-w-6xl mx-auto">
              {/* Game Canvas Area */}
              <div className="bg-gray-900 rounded-lg border-2 border-gray-700 relative overflow-hidden" style={{ height: '600px' }}>
                {/* Player */}
                <div 
                  className="absolute bg-cyan-accent rounded-full flex items-center justify-center text-black font-bold"
                  style={{
                    width: '40px',
                    height: '40px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  P
                </div>
                
                {/* Enemies */}
                {enemiesInWave.map(enemy => (
                  <div 
                    key={enemy.id}
                    className="absolute bg-alert-red rounded-full flex items-center justify-center text-white text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      width: '30px',
                      height: '30px',
                      left: `${enemy.position.x}px`,
                      top: `${enemy.position.y}px`
                    }}
                    onClick={() => defeatEnemy(enemy.id)}
                    title={`Click to defeat ${enemy.name} (HP: ${enemy.hp}, Damage: ${enemy.damage})`}
                  >
                    {enemy.name.split(' ').map(n => n[0]).join('')}
                  </div>
                ))}
                
                {/* Coins */}
                {Array.from({ length: Math.min(coins, 20) }).map((_, i) => (
                  <div 
                    key={`coin_${i}`}
                    className="absolute bg-hazard-gold rounded-full w-6 h-6 flex items-center justify-center text-black text-xs"
                    style={{
                      left: `${Math.random() * 1100 + 100}px`,
                      top: `${Math.random() * 500 + 100}px`
                    }}
                  >
                    💰
                  </div>
                ))}
                
                {/* HUD */}
                <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 rounded px-4 py-2">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-cyan-accent font-semibold">Level: {level}</span>
                      <span className="text-gray-400 ml-2">XP: {xp}/{level * 100}</span>
                    </div>
                    <div>
                      <span className="text-hazard-gold font-semibold">Coins: {coins}</span>
                    </div>
                    <div>
                      <span className="text-white font-semibold">Enemies: {enemiesInWave.length}</span>
                    </div>
                  </div>
                  
                  {/* XP Progress Bar */}
                  <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-cyan-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(xp % 100) / 100 * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Wave Info */}
                <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded px-4 py-2">
                  <div className="text-center">
                    <div className="text-cyan-accent font-bold text-xl">WAVE {currentWave}</div>
                    <div className="text-gray-400 text-sm">
                      {waveManagerRef.current?.getCurrentWave().isBossWave ? 'BOSS WAVE!' : 'Active'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="mt-4 flex justify-center space-x-4">
                <button 
                  className="bg-cyan-accent text-slate-carbon rounded px-6 py-2 font-semibold hover:opacity-80 transition-opacity"
                  onClick={() => defeatEnemy(enemiesInWave[0]?.id)}
                >
                  Attack
                </button>
                <button 
                  className="bg-hazard-gold text-slate-carbon rounded px-6 py-2 font-semibold hover:opacity-80 transition-opacity"
                  onClick={() => takeDamage()}
                >
                  Take Damage (-10)
                </button>
                <button 
                  className="bg-gray-700 text-white rounded px-6 py-2 font-semibold hover:bg-gray-60 transition-colors"
                  onClick={() => setShowLevelUp(true)}
                >
                  Test Level Up
                </button>
              </div>
              
              {/* Level Up Modal */}
              {showLevelUp && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <h2 className="text-2xl font-bold text-cyan-accent mb-4">LEVEL UP!</h2>
                    <p className="text-gray-300 mb-4">
                      Choose an upgrade for Wave {currentWave + 1}:
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      {levelUpCards.map(card => (
                        <div 
                          key={card.id}
                          className={`bg-gray-700 rounded-lg p-4 cursor-pointer transition-all ${selectedCard === card.upgradeId ? 'ring-2 ring-cyan-accent' : 'hover:bg-gray-600'}`}
                          onClick={() => selectCard(card)}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{card.icon}</span>
                            <div>
                              <h3 className="font-semibold text-white">{card.name}</h3>
                              <p className="text-sm text-gray-400">{card.description}</p>
                              <p className="text-xs text-cyan-accent mt-1">
                                Category: {card.category} | Damage: {card.damage}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button 
                        className="bg-gray-600 hover:bg-gray-500 rounded px-4 py-2 transition-colors"
                        onClick={() => setShowLevelUp(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  )
}

export default App
