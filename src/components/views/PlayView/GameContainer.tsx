/**
 * Game Container
 * Phase 7: Build the Game - React Integration
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { GameEngine } from '../../../game/engine/GameEngine'
import { Camera } from '../../../game/engine/Camera'
import { InputManager } from '../../../game/engine/InputManager'
import { Player } from '../../../game/entities/Player'
import { Enemy } from '../../../game/entities/Enemy'
import { Projectile } from '../../../game/entities/Projectile'
import { Coin } from '../../../game/entities/Coin'
import { WaveManager } from '../../../game/WaveManager'
import { XPManager } from '../../../game/XPManager'
import { ScoreManager } from '../../../game/ScoreManager'
import { AutoTargeting } from '../../../game/AutoTargeting'
import { RenderSystem } from '../../../game/systems/RenderSystem'
import { CollisionSystem } from '../../../game/systems/CollisionSystem'
import { CombatSystem } from '../../../game/systems/CombatSystem'
import { SpawnSystem } from '../../../game/systems/SpawnSystem'
import type { HeroesRow } from '../../../types/database'
import { heroes } from '../../../db/seedData'
import GameCanvas from './GameCanvas'
import HUD from './HUD'
import LevelUpModal from './LevelUpModal'
import PauseMenu from './PauseMenu'
import GameOverScreen from './GameOverScreen'

export interface GameContainerProps {
  onBack?: () => void
  selectedHeroId?: string
}

const GameContainer: React.FC<GameContainerProps> = ({ onBack, selectedHeroId }) => {
  /** Refs */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const renderSystemRef = useRef<RenderSystem | null>(null)
  const collisionSystemRef = useRef<CollisionSystem | null>(null)
  const combatSystemRef = useRef<CombatSystem | null>(null)
  const spawnSystemRef = useRef<SpawnSystem | null>(null)
  
  /** State */
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover' | 'levelup'>('menu')
  const [player, setPlayer] = useState<Player | null>(null)
  const [score, setScore] = useState<number>(0)
  const [coins, setCoins] = useState<number>(0)
  const [xp, setXP] = useState<number>(0)
  const [level, setLevel] = useState<number>(1)
  const [health, setHealth] = useState<number>(100)
  const [maxHealth, setMaxHealth] = useState<number>(100)
  const [wave, setWave] = useState<number>(1)
  const [enemiesDefeated, setEnemiesDefeated] = useState<number>(0)
  const [timeSurvived, setTimeSurvived] = useState<number>(0)
  const [selectedHero, setSelectedHero] = useState<HeroesRow | null>(null)
  const [levelUpOptions, setLevelUpOptions] = useState<any[]>([])
  const [showLevelUp, setShowLevelUp] = useState<boolean>(false)
  const [finalScore, setFinalScore] = useState<number>(0)
  const [finalStats, setFinalStats] = useState<{
    survivalSeconds: number
    coinsCollected: number
    enemiesDefeated: number
  }>({ survivalSeconds: 0, coinsCollected: 0, enemiesDefeated: 0 })
  
  /** Timers */
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  /** Initialize game */
  const initGame = useCallback((heroId?: string) => {
    if (!canvasRef.current) return
    
    // Clean up any existing game
    cleanupGame()
    
    // Get selected hero
    const hero = heroes.find(h => h.id === heroId) || heroes[0]
    setSelectedHero(hero)
    
    // Create player
    const newPlayer = new Player({
      x: 1000,
      y: 1000,
      hero
    })
    setPlayer(newPlayer)
    setHealth(newPlayer.health)
    setMaxHealth(newPlayer.maxHealth)
    
    // Create game systems
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    
    // Set canvas size
    canvas.width = window.innerWidth - 200
    canvas.height = window.innerHeight - 100
    
    const camera = new Camera({
      width: canvas.width,
      height: canvas.height,
      zoom: 1,
      lerpFactor: 0.1
    })
    
    const inputManager = new InputManager()
    
    const waveManager = new WaveManager(canvas.width, canvas.height)
    const xpManager = new XPManager()
    const scoreManager = new ScoreManager()
    const autoTargeting = new AutoTargeting(500)
    
    // Create render system
    const renderSystem = new RenderSystem(camera, ctx, canvas.width, canvas.height)
    renderSystemRef.current = renderSystem
    
    // Create collision system
    const collisionSystem = new CollisionSystem()
    collisionSystemRef.current = collisionSystem
    
    // Create combat system
    const combatSystem = new CombatSystem()
    combatSystem.setXPManager(xpManager)
    combatSystem.setScoreManager(scoreManager)
    combatSystem.setWaveManager(waveManager)
    combatSystem.setPlayer(newPlayer)
    combatSystemRef.current = combatSystem
    
    // Create spawn system
    const spawnSystem = new SpawnSystem(waveManager)
    spawnSystemRef.current = spawnSystem
    
    // Create game engine
    const gameEngine = new GameEngine({
      canvas,
      width: canvas.width,
      height: canvas.height,
      targetFPS: 60
    })
    gameEngineRef.current = gameEngine
    
    // Replace engine's systems with our custom ones
    gameEngine.camera = camera
    gameEngine.inputManager = inputManager
    gameEngine.waveManager = waveManager
    gameEngine.xpManager = xpManager
    gameEngine.scoreManager = scoreManager
    gameEngine.autoTargeting = autoTargeting
    
    // Add player to render system
    renderSystem.addEntity(newPlayer, 'player')
    
    // Add player to collision system
    collisionSystem.addEntity(newPlayer, 'player')
    
    // Set up wave manager callbacks
    waveManager.onWaveStart((waveNumber) => {
      setWave(waveNumber)
    })
    
    waveManager.onWaveEnd((waveNumber) => {
      // Start next wave
      spawnSystem.startNewWave(waveNumber + 1)
    })
    
    // Set up XP manager callbacks
    xpManager.onLevelUp((newLevel) => {
      setLevel(newLevel)
      setShowLevelUp(true)
      setGameState('levelup')
      
      // Generate level up options
      const options = generateLevelUpOptions()
      setLevelUpOptions(options)
    })
    
    xpManager.onXPChange((currentXP) => {
      setXP(currentXP)
    })
    
    // Set up score manager callbacks
    scoreManager.onScoreChange((currentScore) => {
      setScore(currentScore)
    })
    
    scoreManager.onCoinsChange((currentCoins) => {
      setCoins(currentCoins)
    })
    
    // Set up collision callbacks
    collisionSystem.onCollision('player-enemy', (event) => {
      if (player && !player.isInvulnerable) {
        const damage = event.damage || 10
        const wasKilled = combatSystem.applyDamage(player, {
          amount: damage,
          type: 'normal',
          source: 'enemy',
          position: player.getCenter()
        })
        
        if (wasKilled) {
          endGame()
        }
      }
    })
    
    collisionSystem.onCollision('player-projectile', (event) => {
      if (player && !player.isInvulnerable) {
        const projectile = event.entity2 as Projectile
        if (projectile.owner === 'enemy') {
          const damage = projectile.damage
          const wasKilled = combatSystem.applyDamage(player, {
            amount: damage,
            type: 'normal',
            source: 'enemy',
            position: player.getCenter()
          })
          
          if (wasKilled) {
            endGame()
          }
        }
      }
    })
    
    collisionSystem.onCollision('player-coin', (event) => {
      const coin = event.entity2 as Coin
      if (coin && !coin.isCollected) {
        combatSystem.collectCoin(coin)
      }
    })
    
    collisionSystem.onCollision('enemy-projectile', (event) => {
      const projectile = event.entity1 as Projectile
      const enemy = event.entity2 as Enemy
      
      if (projectile && enemy) {
        if (projectile.owner === 'player') {
          const wasKilled = combatSystem.applyDamage(enemy, {
            amount: projectile.damage,
            type: projectile.type === 'Laser' ? 'normal' : 'normal',
            source: 'player',
            position: enemy.getCenter()
          })
          
          if (wasKilled) {
            // Add XP and coins
            xpManager.addXP(10)
            scoreManager.addCoins(enemy.getCoinValue())
            
            // Spawn coins
            spawnSystem.spawnCoinsAt(
              enemy.getCenter(),
              enemy.getCoinValue(),
              enemy.getCoinValue()
            )
          }
        }
      }
    })
    
    // Start game loop
    startGameLoop()
    
    // Start wave
    waveManager.startWave(1)
    spawnSystem.startNewWave(1)
    
    // Start timer
    startGameTimer()
    
    setGameState('playing')
    
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Generate level up options */
  const generateLevelUpOptions = useCallback((): any[] => {
    // Get available upgrades
    const allUpgrades = [
      { id: 'upg_01', name: 'Companion Robot', category: 'Summon', damage: 15, cooldown: 0.8 },
      { id: 'upg_02', name: 'Rocket Barrage', category: 'AoE Weapon', damage: 45, cooldown: 2.5 },
      { id: 'upg_03', name: 'Orbital Laser', category: 'Beam Weapon', damage: 30, cooldown: 4.0 },
      { id: 'upg_05', name: 'Bouncing Sawblade', category: 'Projectile', damage: 25, cooldown: 3.0 },
      { id: 'upg_06', name: 'Chain Tesla', category: 'Ranged', damage: 20, cooldown: 1.5 },
      { id: 'upg_08', name: 'Cryo-Aura Field', category: 'Passive', damage: 0, cooldown: 0 },
      { id: 'upg_09', name: 'Emergency Nanites', category: 'Passive', damage: 0, cooldown: 5.0 },
      { id: 'upg_12', name: 'Arc Slash', category: 'Melee Weapon', damage: 35, cooldown: 0.9 },
      { id: 'upg_13', name: 'Dual Kinetic Pistols', category: 'Projectile', damage: 10, cooldown: 0.4 },
    ]
    
    // Select 3 random upgrades
    const shuffled = [...allUpgrades].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 3)
  }, [])

  /** Start game loop */
  const startGameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !gameEngineRef.current) return
    
    const gameEngine = gameEngineRef.current
    const renderSystem = renderSystemRef.current
    const collisionSystem = collisionSystemRef.current
    const combatSystem = combatSystemRef.current
    const spawnSystem = spawnSystemRef.current
    
    let lastTime = 0
    
    const gameLoop = (timestamp: number) => {
      if (!gameEngine || !renderSystem || !collisionSystem || !combatSystem || !spawnSystem) {
        return
      }
      
      // Calculate delta time
      const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : 0
      lastTime = timestamp
      
      // Cap delta time to prevent large jumps
      const cappedDeltaTime = Math.min(deltaTime, 0.1)
      
      // Update systems
      if (gameState === 'playing') {
        // Update player from input
        if (player) {
          const movement = gameEngine.inputManager.getMovementVector()
          player.update(movement, cappedDeltaTime)
          
          // Update camera to follow player
          gameEngine.camera.update(player.x, player.y)
          
          // Update player stats
          setHealth(player.health)
          setMaxHealth(player.maxHealth)
        }
        
        // Update wave manager
        gameEngine.waveManager.update(cappedDeltaTime)
        
        // Update spawn system
        spawnSystem.update(cappedDeltaTime, player?.getPosition())
        
        // Update combat system
        combatSystem.update(cappedDeltaTime)
        
        // Sync entities with render system
        const activeEnemies = spawnSystem.getActiveEnemies()
        const activeCoins = spawnSystem.getActiveCoins()
        
        // Clear and re-add entities to render system
        renderSystem.clearLayer('enemies')
        renderSystem.clearLayer('coins')
        
        for (const enemy of activeEnemies) {
          renderSystem.addEntity(enemy, 'enemies')
          collisionSystem.addEntity(enemy, 'enemies')
          
          // Update enemy with player reference
          enemy.update(cappedDeltaTime, player || undefined)
        }
        
        for (const coin of activeCoins) {
          renderSystem.addEntity(coin, 'coins')
          collisionSystem.addEntity(coin, 'coins')
          coin.update(cappedDeltaTime, player?.getPosition())
        }
        
        // Check collisions
        collisionSystem.checkCollisions(cappedDeltaTime)
        
        // Update enemies defeated count
        setEnemiesDefeated(combatSystem.getStats().enemiesKilled)
      }
      
      // Render
      renderSystem.render(cappedDeltaTime)
      
      // Continue loop
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
    
    // Start the loop
    animationFrameRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, player]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Start game timer */
  const startGameTimer = useCallback(() => {
    let seconds = 0
    
    gameTimerRef.current = setInterval(() => {
      seconds++
      setTimeSurvived(seconds)
    }, 1000)
  }, [])

  /** Clean up game */
  const cleanupGame = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Clear game timer
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }
    
    // Clear systems
    gameEngineRef.current = null
    renderSystemRef.current = null
    collisionSystemRef.current = null
    combatSystemRef.current = null
    spawnSystemRef.current = null
  }, [])

  /** End game */
  const endGame = useCallback(() => {
    cleanupGame()
    
    // Calculate final score using formula: S = 10t + 25c
    const finalScoreValue = Math.floor(10 * timeSurvived + 25 * coins)
    setFinalScore(finalScoreValue)
    setFinalStats({
      survivalSeconds: timeSurvived,
      coinsCollected: coins,
      enemiesDefeated
    })
    
    setGameState('gameover')
  }, [timeSurvived, coins, enemiesDefeated]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Handle level up selection */
  const handleLevelUpSelect = useCallback((upgradeId: string) => {
    // Apply upgrade to player
    if (player && gameEngineRef.current?.xpManager) {
      // In a real implementation, we would apply the upgrade here
      console.log(`Selected upgrade: ${upgradeId}`)
    }
    
    setShowLevelUp(false)
    setGameState('playing')
  }, [player])

  /** Handle pause */
  const handlePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused')
    } else if (gameState === 'paused') {
      setGameState('playing')
    }
  }, [gameState])

  /** Handle resume */
  const handleResume = useCallback(() => {
    setGameState('playing')
  }, [])

  /** Handle restart */
  const handleRestart = useCallback(() => {
    setGameState('menu')
    setScore(0)
    setCoins(0)
    setXP(0)
    setLevel(1)
    setHealth(100)
    setMaxHealth(100)
    setWave(1)
    setEnemiesDefeated(0)
    setTimeSurvived(0)
    setFinalScore(0)
    setFinalStats({ survivalSeconds: 0, coinsCollected: 0, enemiesDefeated: 0 })
    setSelectedHero(null)
    setPlayer(null)
  }, [])

  /** Handle start game */
  const handleStartGame = useCallback(() => {
    const heroId = selectedHeroId || selectedHero?.id || heroes[0].id
    initGame(heroId)
  }, [selectedHeroId, selectedHero, initGame])

  /** Handle window resize */
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current
        canvas.width = window.innerWidth - 200
        canvas.height = window.innerHeight - 100
        
        if (renderSystemRef.current) {
          renderSystemRef.current.resize(canvas.width, canvas.height)
        }
        
        if (gameEngineRef.current) {
          gameEngineRef.current.camera = new Camera({
            width: canvas.width,
            height: canvas.height,
            zoom: gameEngineRef.current.camera.zoom,
            lerpFactor: gameEngineRef.current.camera.lerpFactor
          })
        }
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /** Clean up on unmount */
  useEffect(() => {
    return () => {
      cleanupGame()
    }
  }, [cleanupGame])

  /** Render based on game state */
  const renderGameState = () => {
    switch (gameState) {
      case 'menu':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80">
            <h2 className="text-4xl font-bold text-cyan-400 mb-8">SWARM PROTOCOL: SURVIVOR</h2>
            <div className="text-center mb-8">
              <p className="text-white text-lg">Select a Hero to Begin</p>
            </div>
            <button
              onClick={handleStartGame}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xl rounded-lg transition-colors"
            >
              START GAME
            </button>
          </div>
        )
      
      case 'playing':
      case 'paused':
        return (
          <>
            <GameCanvas ref={canvasRef} />
            <HUD
              score={score}
              coins={coins}
              xp={xp}
              level={level}
              health={health}
              maxHealth={maxHealth}
              wave={wave}
              time={timeSurvived}
              enemiesDefeated={enemiesDefeated}
              onPause={handlePause}
            />
            {gameState === 'paused' && (
              <PauseMenu onResume={handleResume} onRestart={handleRestart} onQuit={onBack} />
            )}
          </>
        )
      
      case 'levelup':
        return (
          <>
            <GameCanvas ref={canvasRef} />
            <HUD
              score={score}
              coins={coins}
              xp={xp}
              level={level}
              health={health}
              maxHealth={maxHealth}
              wave={wave}
              time={timeSurvived}
              enemiesDefeated={enemiesDefeated}
              onPause={handlePause}
            />
            <LevelUpModal
              level={level}
              options={levelUpOptions}
              onSelect={handleLevelUpSelect}
            />
          </>
        )
      
      case 'gameover':
        return (
          <>
            <GameCanvas ref={canvasRef} />
            <GameOverScreen
              score={finalScore}
              stats={finalStats}
              onRestart={handleRestart}
              onQuit={onBack}
            />
          </>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      {renderGameState()}
    </div>
  )
}

export default GameContainer
