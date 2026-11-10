# Phase 7: Build the Game - 60 FPS HTML5 Canvas Engine

## Objective
Build a high-performance 60 FPS HTML5 Canvas game engine that powers SWARM PROTOCOL: SURVIVOR. This phase focuses on the core game loop, rendering, input handling, and game mechanics.

## 🎯 Core Deliverables

### 1. Game Engine Foundation
- [ ] Implement requestAnimationFrame loop in React useRef
- [ ] Create GameCanvas component with proper sizing
- [ ] Implement delta time calculation for frame-independent movement
- [ ] Setup performance monitoring (FPS counter)
- [ ] Implement game state management (menu, playing, paused, gameOver)

### 2. Input System
- [ ] WASD keyboard controls for movement
- [ ] Touch controls for mobile devices
- [ ] Vector math for movement calculations
- [ ] Mouse/touch targeting for attacks
- [ ] Input buffering for responsive controls

### 3. Rendering Engine
- [ ] Entity rendering system (sprites, colors, animations)
- [ ] Particle effects (explosions, coins, damage indicators)
- [ ] Camera system with smooth follow
- [ ] Layered rendering (background, entities, foreground, UI)
- [ ] Off-screen culling for performance

### 4. Entity System
- [ ] Player entity with movement, collision, and combat
- [ ] Enemy entities with AI behavior
- [ ] Projectile entities (bullets, rockets, etc.)
- [ ] Coin entities with collection logic
- [ ] Entity pooling for performance

### 5. Combat System
- [ ] Enemy spawning based on wave system
- [ ] Auto-targeting integration (from Phase 3)
- [ ] Damage calculation and application
- [ ] Health and death handling
- [ ] Knockback and hit reactions

### 6. Game Systems Integration
- [ ] WaveManager integration (from Phase 3)
- [ ] XPManager integration (from Phase 3)
- [ ] ScoreManager integration (from Phase 3)
- [ ] Level-Up card modal
- [ ] Score auto-sync with leaderboard

### 7. UI Integration
- [ ] In-game HUD (health, XP, score, wave, etc.)
- [ ] Level-up modal with upgrade selection
- [ ] Pause menu
- [ ] Game over screen
- [ ] Settings menu

## 📁 Folder Structure

```
src/
├── game/
│   ├── engine/
│   │   ├── GameEngine.ts          # Main game engine class
│   │   ├── GameCanvas.tsx         # Canvas component
│   │   ├── GameLoop.ts            # Game loop manager
│   │   ├── InputManager.ts        # Input handling
│   │   ├── Camera.ts              # Camera system
│   │   └── PerformanceMonitor.ts  # FPS monitoring
│   ├── entities/
│   │   ├── Entity.ts              # Base entity class
│   │   ├── Player.ts              # Player entity
│   │   ├── Enemy.ts               # Enemy entity
│   │   ├── Projectile.ts          # Projectile entity
│   │   ├── Coin.ts                # Coin entity
│   │   └── Particle.ts            # Particle system
│   ├── systems/
│   │   ├── RenderSystem.ts        # Rendering system
│   │   ├── CollisionSystem.ts     # Collision detection
│   │   ├── CombatSystem.ts        # Combat logic
│   │   ├── SpawnSystem.ts         # Enemy spawning
│   │   └── AnimationSystem.ts     # Animation handling
│   ├── components/
│   │   ├── GameCanvas.tsx         # React canvas wrapper
│   │   ├── HUD.tsx                # In-game heads-up display
│   │   ├── LevelUpModal.tsx       # Level-up card selector
│   │   ├── PauseMenu.tsx          # Pause menu
│   │   └── GameOverScreen.tsx     # Game over screen
│   └── utils/
│       ├── vector.ts              # Vector math utilities
│       ├── collision.ts           # Collision utilities
│       └── easing.ts              # Easing functions
├── components/
│   └── views/
│       └── PlayView/
│           ├── PlayView.tsx       # Enhanced with game engine
│           └── GameContainer.tsx   # Game engine container
└── App.tsx
```

## 🎮 Technical Implementation

### 1. GameCanvas Component

```tsx
// src/game/components/GameCanvas.tsx
import { useRef, useEffect } from 'react'
import { GameEngine } from '../engine/GameEngine'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    
    // Initialize game engine
    engineRef.current = new GameEngine(canvasRef.current)
    
    // Start game loop
    engineRef.current.start()
    
    // Cleanup
    return () => {
      engineRef.current?.stop()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  )
}
```

### 2. GameEngine Class

```typescript
// src/game/engine/GameEngine.ts
import { InputManager } from './InputManager'
import { Camera } from './Camera'
import { RenderSystem } from '../systems/RenderSystem'
import { Player } from '../entities/Player'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private inputManager: InputManager
  private camera: Camera
  private renderSystem: RenderSystem
  private player: Player
  
  private lastTime: number = 0
  private running: boolean = false
  private frameId: number | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.inputManager = new InputManager()
    this.camera = new Camera(canvas.width, canvas.height)
    this.renderSystem = new RenderSystem(this.ctx, this.camera)
    this.player = new Player(0, 0)
  }

  start() {
    this.running = true
    this.lastTime = performance.now()
    this.gameLoop()
  }

  stop() {
    this.running = false
    if (this.frameId) {
      cancelAnimationFrame(this.frameId)
    }
  }

  private gameLoop = () => {
    if (!this.running) return
    
    const now = performance.now()
    const deltaTime = (now - this.lastTime) / 1000 // Convert to seconds
    this.lastTime = now
    
    // Update
    this.update(deltaTime)
    
    // Render
    this.render()
    
    // Continue loop
    this.frameId = requestAnimationFrame(this.gameLoop)
  }

  private update(deltaTime: number) {
    // Update input
    this.inputManager.update()
    
    // Update player based on input
    const movement = this.inputManager.getMovementVector()
    this.player.update(movement, deltaTime)
    
    // Update camera
    this.camera.update(this.player.x, this.player.y)
    
    // Update all entities
    // ...
  }

  private render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Render with camera
    this.renderSystem.begin()
    
    // Render entities
    this.renderSystem.renderEntity(this.player)
    // ... render other entities
    
    this.renderSystem.end()
  }

  getCanvas() {
    return this.canvas
  }

  getContext() {
    return this.ctx
  }
}
```

### 3. InputManager

```typescript
// src/game/engine/InputManager.ts
export class InputManager {
  private keys: Record<string, boolean> = {}
  private mousePosition: { x: number, y: number } = { x: 0, y: 0 }
  private touchPosition: { x: number, y: number } | null = null

  constructor() {
    // Keyboard listeners
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    
    // Mouse listeners
    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('mousedown', this.handleMouseDown)
    window.addEventListener('mouseup', this.handleMouseUp)
    
    // Touch listeners
    window.addEventListener('touchstart', this.handleTouchStart)
    window.addEventListener('touchmove', this.handleTouchMove)
    window.addEventListener('touchend', this.handleTouchEnd)
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('mousedown', this.handleMouseDown)
    window.removeEventListener('mouseup', this.handleMouseUp)
    window.removeEventListener('touchstart', this.handleTouchStart)
    window.removeEventListener('touchmove', this.handleTouchMove)
    window.removeEventListener('touchend', this.handleTouchEnd)
  }

  update() {
    // Reset transient states if needed
  }

  getMovementVector(): { x: number, y: number } {
    let x = 0
    let y = 0
    
    // WASD or Arrow keys
    if (this.keys['w'] || this.keys['ArrowUp']) y -= 1
    if (this.keys['s'] || this.keys['ArrowDown']) y += 1
    if (this.keys['a'] || this.keys['ArrowLeft']) x -= 1
    if (this.keys['d'] || this.keys['ArrowRight']) x += 1
    
    // Normalize diagonal movement
    const length = Math.sqrt(x * x + y * y)
    if (length > 0) {
      x /= length
      y /= length
    }
    
    return { x, y }
  }

  isKeyPressed(key: string): boolean {
    return this.keys[key] || false
  }

  getMousePosition(): { x: number, y: number } {
    return { ...this.mousePosition }
  }

  getTouchPosition(): { x: number, y: number } | null {
    return this.touchPosition
  }

  // Event handlers
  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key] = true
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key] = false
  }

  private handleMouseMove = (e: MouseEvent) => {
    this.mousePosition = { x: e.clientX, y: e.clientY }
  }

  private handleMouseDown = (e: MouseEvent) => {
    // Handle mouse click
  }

  private handleMouseUp = (e: MouseEvent) => {
    // Handle mouse release
  }

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.touchPosition = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      }
    }
  }

  private handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.touchPosition = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      }
    }
  }

  private handleTouchEnd = (e: TouchEvent) => {
    this.touchPosition = null
  }
}
```

### 4. Camera System

```typescript
// src/game/engine/Camera.ts
export class Camera {
  x: number
  y: number
  width: number
  height: number
  zoom: number

  constructor(width: number, height: number, zoom: number = 1) {
    this.x = 0
    this.y = 0
    this.width = width
    this.height = height
    this.zoom = zoom
  }

  update(targetX: number, targetY: number, lerpFactor: number = 0.1) {
    // Smooth follow with linear interpolation
    this.x = this.lerp(this.x, targetX - this.width / 2, lerpFactor)
    this.y = this.lerp(this.y, targetY - this.height / 2, lerpFactor)
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(x: number, y: number): { x: number, y: number } {
    return {
      x: (x - this.x) * this.zoom,
      y: (y - this.y) * this.zoom
    }
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(x: number, y: number): { x: number, y: number } {
    return {
      x: x / this.zoom + this.x,
      y: y / this.zoom + this.y
    }
  }

  // Check if an entity is visible on screen
  isVisible(x: number, y: number, width: number, height: number): boolean {
    const screenX = (x - this.x) * this.zoom
    const screenY = (y - this.y) * this.zoom
    const screenWidth = width * this.zoom
    const screenHeight = height * this.zoom
    
    return (
      screenX + screenWidth >= 0 &&
      screenX <= this.width &&
      screenY + screenHeight >= 0 &&
      screenY <= this.height
    )
  }
}
```

### 5. Player Entity

```typescript
// src/game/entities/Player.ts
import { Vector2 } from '../utils/vector'

export class Player {
  x: number
  y: number
  width: number
  height: number
  speed: number
  color: string
  health: number
  maxHealth: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.width = 40
    this.height = 40
    this.speed = 200 // pixels per second
    this.color = '#00F0FF' // Cyan
    this.health = 100
    this.maxHealth = 100
  }

  update(movement: Vector2, deltaTime: number) {
    // Apply movement
    this.x += movement.x * this.speed * deltaTime
    this.y += movement.y * this.speed * deltaTime
    
    // Clamp to screen bounds (optional)
    // ...
  }

  takeDamage(amount: number) {
    this.health -= amount
    if (this.health < 0) this.health = 0
    return this.health <= 0
  }

  heal(amount: number) {
    this.health += amount
    if (this.health > this.maxHealth) this.health = this.maxHealth
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera) {
    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    
    // Draw player
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw health bar
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = '#FF0055' // Alert red
    ctx.fillRect(
      screenX,
      screenY - 10,
      this.width * healthPercent,
      4
    )
  }
}
```

### 6. Vector Utilities

```typescript
// src/game/utils/vector.ts
export interface Vector2 {
  x: number
  y: number
}

export const Vector2 = {
  zero: (): Vector2 => ({ x: 0, y: 0 }),
  
  create: (x: number, y: number): Vector2 => ({ x, y }),
  
  add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
  
  subtract: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
  
  multiply: (v: Vector2, scalar: number): Vector2 => ({ x: v.x * scalar, y: v.y * scalar }),
  
  divide: (v: Vector2, scalar: number): Vector2 => ({ x: v.x / scalar, y: v.y / scalar }),
  
  length: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  
  normalize: (v: Vector2): Vector2 => {
    const len = Vector2.length(v)
    return len > 0 ? Vector2.divide(v, len) : Vector2.zero()
  },
  
  distance: (a: Vector2, b: Vector2): number => {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  },
  
  lerp: (a: Vector2, b: Vector2, t: number): Vector2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  })
}
```

### 7. RenderSystem

```typescript
// src/game/systems/RenderSystem.ts
import { Camera } from '../engine/Camera'
import { Player } from '../entities/Player'

export class RenderSystem {
  private ctx: CanvasRenderingContext2D
  private camera: Camera

  constructor(ctx: CanvasRenderingContext2D, camera: Camera) {
    this.ctx = ctx
    this.camera = camera
  }

  begin() {
    this.ctx.save()
    
    // Apply camera transform
    this.ctx.translate(-this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom)
    this.ctx.scale(this.camera.zoom, this.camera.zoom)
  }

  end() {
    this.ctx.restore()
  }

  renderEntity(entity: any) {
    if (entity.draw) {
      entity.draw(this.ctx, this.camera)
    }
  }

  renderCircle(x: number, y: number, radius: number, color: string) {
    const { x: screenX, y: screenY } = this.camera.worldToScreen(x, y)
    
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
    this.ctx.fill()
  }

  renderRect(x: number, y: number, width: number, height: number, color: string) {
    const { x: screenX, y: screenY } = this.camera.worldToScreen(x, y)
    
    this.ctx.fillStyle = color
    this.ctx.fillRect(screenX, screenY, width, height)
  }

  renderText(text: string, x: number, y: number, color: string, size: number) {
    const { x: screenX, y: screenY } = this.camera.worldToScreen(x, y)
    
    this.ctx.fillStyle = color
    this.ctx.font = `${size}px sans-serif`
    this.ctx.fillText(text, screenX, screenY)
  }
}
```

### 8. GameContainer Component

```tsx
// src/components/views/PlayView/GameContainer.tsx
import { useState, useEffect, useRef } from 'react'
import { GameEngine } from '../../../game/engine/GameEngine'
import { WaveManager, XPManager, ScoreManager, AutoTargeting } from '../../../game'
import { heroes, enemies, upgrades } from '../../../db/seedData'

export function GameContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const waveManagerRef = useRef<WaveManager | null>(null)
  const xpManagerRef = useRef<XPManager | null>(null)
  const scoreManagerRef = useRef<ScoreManager | null>(null)
  const autoTargetingRef = useRef<AutoTargeting | null>(null)

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameOver'>('menu')
  const [selectedHero, setSelectedHero] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [health, setHealth] = useState(100)

  // Initialize game systems
  useEffect(() => {
    if (!canvasRef.current) return
    
    // Create game engine
    engineRef.current = new GameEngine(canvasRef.current)
    
    // Create game systems
    waveManagerRef.current = new WaveManager(canvasRef.current.width, canvasRef.current.height)
    xpManagerRef.current = new XPManager()
    scoreManagerRef.current = new ScoreManager()
    autoTargetingRef.current = new AutoTargeting(500)
    
    // Setup event listeners
    waveManagerRef.current.onWaveStart((wave) => {
      setWave(wave)
    })
    
    waveManagerRef.current.onWaveComplete((wave, allDefeated) => {
      if (allDefeated) {
        xpManagerRef.current?.addWaveClearXP()
        scoreManagerRef.current?.addWaveClearBonus()
      }
    })
    
    xpManagerRef.current.onLevelUp((newLevel) => {
      setLevel(newLevel)
    })
    
    xpManagerRef.current.onXPGained((_amount, total) => {
      setXp(total)
    })
    
    scoreManagerRef.current.onScoreChanged((newScore) => {
      setScore(newScore)
    })
    
    return () => {
      engineRef.current?.stop()
      waveManagerRef.current?.stop()
    }
  }, [])

  // Start game
  const startGame = (heroId: string) => {
    setSelectedHero(heroId)
    setGameState('playing')
    setHealth(100)
    
    waveManagerRef.current?.start()
    scoreManagerRef.current?.start()
    engineRef.current?.start()
  }

  // End game
  const endGame = () => {
    setGameState('gameOver')
    waveManagerRef.current?.stop()
    scoreManagerRef.current?.stop()
    engineRef.current?.stop()
  }

  // Resume game
  const resumeGame = () => {
    setGameState('playing')
  }

  // Calculate score using formula S = 10t + 25c
  const manualScore = 10 * Math.floor(scoreManagerRef.current?.getTime() || 0) + 
                      25 * (scoreManagerRef.current?.getCoins() || 0)

  return (
    <div className="min-h-screen bg-slate-carbon text-white">
      {/* Game Canvas */}
      <div className="relative w-full h-screen">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
        />
        
        {/* HUD Overlay */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 bg-opacity-90 rounded px-4 py-2">
                <span className="text-white font-semibold">Wave: {wave}</span>
              </div>
              <div className="bg-gray-800 bg-opacity-90 rounded px-4 py-2">
                <span className="text-hazard-gold font-semibold">Score: {manualScore}</span>
              </div>
              <div className="bg-gray-800 bg-opacity-90 rounded px-4 py-2">
                <span className="text-cyan-accent font-semibold">Level: {level}</span>
              </div>
              <div className="bg-gray-800 bg-opacity-90 rounded px-4 py-2">
                <span className="text-alert-red font-semibold">HP: {health}</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                className="bg-gray-800 bg-opacity-90 hover:bg-gray-700 rounded px-4 py-2 text-white transition-colors"
                onClick={() => setGameState('paused')}
              >
                Pause
              </button>
              <button 
                className="bg-gray-800 bg-opacity-90 hover:bg-gray-700 rounded px-4 py-2 text-white transition-colors"
                onClick={endGame}
              >
                Quit
              </button>
            </div>
          </div>
        )}
        
        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-3xl font-bold text-cyan-accent mb-6 text-center">
                SWARM PROTOCOL: SURVIVOR
              </h2>
              
              <h3 className="text-xl font-semibold text-white mb-4">
                Select Your Hero
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {heroes.map(hero => (
                  <div
                    key={hero.id}
                    className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors text-center"
                    onClick={() => startGame(hero.id)}
                  >
                    <div className="text-2xl mb-1">🎮</div>
                    <p className="font-semibold text-white text-sm">{hero.name}</p>
                    <p className="text-xs text-gray-400">{hero.archetype}</p>
                  </div>
                ))}
              </div>
              
              <p className="text-gray-400 text-center text-sm">
                Use WASD to move | Click to attack | Survive the waves!
              </p>
            </div>
          </div>
        )}
        
        {/* Pause Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-cyan-accent mb-4">PAUSED</h2>
              <button
                className="bg-cyan-accent text-slate-carbon rounded px-6 py-2 font-semibold hover:opacity-90 transition-opacity"
                onClick={resumeGame}
              >
                Resume
              </button>
            </div>
          </div>
        )}
        
        {/* Game Over Overlay */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold text-alert-red mb-4">GAME OVER</h2>
              <p className="text-white mb-4">
                Final Score: {manualScore}
              </p>
              <p className="text-gray-400 mb-6">
                Wave Reached: {wave}
              </p>
              <div className="space-x-4">
                <button
                  className="bg-cyan-accent text-slate-carbon rounded px-6 py-2 font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => setGameState('menu')}
                >
                  Main Menu
                </button>
                <button
                  className="bg-hazard-gold text-slate-carbon rounded px-6 py-2 font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => startGame(selectedHero || heroes[0].id)}
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameContainer
```

## 📊 Success Criteria

1. **Performance**: Maintain 60 FPS on most devices
2. **Responsiveness**: Works on desktop and mobile
3. **Input**: Smooth WASD and touch controls
4. **Rendering**: Clean visuals with proper layering
5. **Gameplay**: All game systems integrated and functional
6. **Error Handling**: Graceful degradation on unsupported devices

## 🔧 Dependencies

- React 19+
- TypeScript
- HTML5 Canvas API
- All existing dependencies from Phase 0-6

## 📅 Timeline

This phase requires significant development time:
- Core engine: 2-3 days
- Input system: 1 day
- Rendering: 2 days
- Entity system: 2 days
- Combat & integration: 2-3 days
- **Total**: ~10-14 days

## 🎯 Next Phase

Phase 8: Features & Polish
- Floating toast alerts
- Input validation guards
- Tactical empty states
- Audio preferences
- High-contrast accessibility theme

---

**Phase 7 Status**: 🚧 IN PROGRESS
**Branch**: `phase/7-build-the-game`
**Priority**: Critical (Core gameplay)
