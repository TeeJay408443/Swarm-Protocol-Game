/**
 * Game Engine
 * Phase 7: Build the Game - Core Engine
 */

import { Camera } from './Camera'
import type { CameraOptions } from './Camera'
import { InputManager } from './InputManager'
import { Vector2 } from '../utils/vector'
import { WaveManager } from '../WaveManager'
import { XPManager } from '../XPManager'
import { ScoreManager } from '../ScoreManager'
import { AutoTargeting } from '../AutoTargeting'

export interface GameEngineOptions {
  canvas: HTMLCanvasElement
  width?: number
  height?: number
  targetFPS?: number
}

export interface GameStats {
  fps: number
  frameTime: number
  totalFrames: number
  uptime: number
}

export class GameEngine {
  /** Canvas element */
  private canvas: HTMLCanvasElement
  
  /** Canvas context */
  private ctx: CanvasRenderingContext2D
  
  /** Camera */
  camera: Camera
  
  /** Input manager */
  inputManager: InputManager
  
  /** Game systems */
  waveManager: WaveManager
  xpManager: XPManager
  scoreManager: ScoreManager
  autoTargeting: AutoTargeting
  
  /** Game state */
  private running: boolean = false
  private frameId: number | null = null
  
  /** Timing */
  private lastTime: number = 0
  private frameCount: number = 0
  private fpsUpdateTime: number = 0
  private fps: number = 0
  private startTime: number = 0
  
  /** Target FPS */
  private targetFPS: number
  private targetFrameTime: number
  
  /** Game stats */
  private stats: GameStats = {
    fps: 0,
    frameTime: 0,
    totalFrames: 0,
    uptime: 0
  }
  
  /** Callbacks */
  private updateCallbacks: ((deltaTime: number) => void)[] = []
  private renderCallbacks: ((ctx: CanvasRenderingContext2D, deltaTime: number) => void)[] = []
  private startCallbacks: (() => void)[] = []
  private stopCallbacks: (() => void)[] = []

  constructor(options: GameEngineOptions) {
    this.canvas = options.canvas
    this.ctx = this.canvas.getContext('2d')!
    
    // Setup camera
    const cameraOptions: CameraOptions = {
      width: options.width || this.canvas.width,
      height: options.height || this.canvas.height,
      zoom: 1,
      lerpFactor: 0.1
    }
    this.camera = new Camera(cameraOptions)
    
    // Setup input manager
    this.inputManager = new InputManager()
    
    // Setup game systems
    this.waveManager = new WaveManager(this.canvas.width, this.canvas.height)
    this.xpManager = new XPManager()
    this.scoreManager = new ScoreManager()
    this.autoTargeting = new AutoTargeting(500)
    
    // Target FPS
    this.targetFPS = options.targetFPS || 60
    this.targetFrameTime = 1000 / this.targetFPS
    
    // Handle canvas resize
    this.setupResizeListener()
  }

  /**
   * Setup canvas resize listener
   */
  private setupResizeListener(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.resize(width, height)
      }
    })
    
    resizeObserver.observe(this.canvas)
    
    // Store reference for cleanup
    ;(this as any).resizeObserver = resizeObserver
  }

  /**
   * Handle canvas resize
   */
  resize(width: number, height: number): void {
    // Update canvas size
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    
    // Scale context for high DPI
    this.ctx.scale(dpr, dpr)
    
    // Update camera
    this.camera.width = width
    this.camera.height = height
    
    // Update wave manager
    this.waveManager.resize(width, height)
  }

  /**
   * Start the game engine
   */
  start(): void {
    if (this.running) return
    
    this.running = true
    this.startTime = performance.now()
    this.lastTime = performance.now()
    this.frameCount = 0
    this.fpsUpdateTime = performance.now()
    
    // Trigger start callbacks
    this.startCallbacks.forEach(cb => cb())
    
    // Start game systems
    this.waveManager.start()
    this.scoreManager.start()
    
    // Start game loop
    this.gameLoop()
  }

  /**
   * Stop the game engine
   */
  stop(): void {
    if (!this.running) return
    
    this.running = false
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
    
    // Trigger stop callbacks
    this.stopCallbacks.forEach(cb => cb())
    
    // Stop game systems
    this.waveManager.stop()
    this.scoreManager.stop()
  }

  /**
   * Main game loop
   */
  private gameLoop = () => {
    if (!this.running) return
    
    const now = performance.now()
    const deltaTime = (now - this.lastTime) / 1000 // Convert to seconds
    this.lastTime = now
    
    // Update FPS counter
    this.frameCount++
    this.stats.totalFrames++
    
    const fpsUpdateElapsed = now - this.fpsUpdateTime
    if (fpsUpdateElapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / fpsUpdateElapsed)
      this.frameCount = 0
      this.fpsUpdateTime = now
    }
    
    // Update stats
    this.stats.fps = this.fps
    this.stats.frameTime = deltaTime * 1000
    this.stats.uptime = (now - this.startTime) / 1000
    
    // Update input
    this.inputManager.update()
    
    // Update game systems
    this.updateGameSystems(deltaTime)
    
    // Trigger update callbacks
    this.updateCallbacks.forEach(cb => cb(deltaTime))
    
    // Update camera
    // Note: Camera update should be done in the update callbacks
    // or by the game systems that use it
    
    // Render
    this.render(deltaTime)
    
    // Trigger render callbacks
    this.renderCallbacks.forEach(cb => cb(this.ctx, deltaTime))
    
    // Continue loop
    this.frameId = requestAnimationFrame(this.gameLoop)
  }

  /**
   * Update game systems
   */
  private updateGameSystems(deltaTime: number): void {
    // Update wave manager
    this.waveManager.update(deltaTime)
    
    // Update XP manager
    this.xpManager.update(deltaTime)
    
    // Update score manager
    this.scoreManager.update(deltaTime)
  }

  /**
   * Render the game
   */
  private render(deltaTime: number): void {
    // Clear canvas
    this.clear()
    
    // Save context state
    this.ctx.save()
    
    // Apply camera transform
    this.ctx.translate(-this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom)
    this.ctx.scale(this.camera.zoom, this.camera.zoom)
    
    // Render game systems
    this.waveManager.render(this.ctx, deltaTime)
    
    // Restore context
    this.ctx.restore()
    
    // Render HUD (not affected by camera)
    this.renderHUD()
  }

  /**
   * Clear the canvas
   */
  clear(color: string = '#0B0F19'): void {
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Render HUD
   */
  private renderHUD(): void {
    const wave = this.waveManager.getCurrentWave()
    const score = this.scoreManager.getCurrentScore()
    const xp = this.xpManager.getCurrentXP()
    const level = this.xpManager.getCurrentLevel()
    
    // Draw HUD background
    this.ctx.fillStyle = 'rgba(11, 15, 25, 0.9)'
    this.ctx.fillRect(10, 10, 300, 80)
    
    // Draw stats
    this.ctx.fillStyle = '#00F0FF' // Cyan
    this.ctx.font = '14px sans-serif'
    this.ctx.fillText(`Wave: ${wave.number}`, 20, 30)
    
    this.ctx.fillStyle = '#FFD700' // Hazard Gold
    this.ctx.fillText(`Score: ${Math.floor(score)}`, 20, 50)
    
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fillText(`Level: ${level}`, 20, 70)
    
    this.ctx.fillStyle = '#00F0FF'
    this.ctx.fillText(`XP: ${xp}`, 150, 70)
    
    // Draw FPS counter
    this.ctx.fillStyle = '#888888'
    this.ctx.font = '12px sans-serif'
    this.ctx.fillText(`FPS: ${this.stats.fps}`, this.canvas.width - 80, 20)
  }

  /**
   * Register update callback
   */
  onUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.push(callback)
  }

  /**
   * Unregister update callback
   */
  offUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback)
  }

  /**
   * Register render callback
   */
  onRender(callback: (ctx: CanvasRenderingContext2D, deltaTime: number) => void): void {
    this.renderCallbacks.push(callback)
  }

  /**
   * Unregister render callback
   */
  offRender(callback: (ctx: CanvasRenderingContext2D, deltaTime: number) => void): void {
    this.renderCallbacks = this.renderCallbacks.filter(cb => cb !== callback)
  }

  /**
   * Register start callback
   */
  onStart(callback: () => void): void {
    this.startCallbacks.push(callback)
  }

  /**
   * Unregister start callback
   */
  offStart(callback: () => void): void {
    this.startCallbacks = this.startCallbacks.filter(cb => cb !== callback)
  }

  /**
   * Register stop callback
   */
  onStop(callback: () => void): void {
    this.stopCallbacks.push(callback)
  }

  /**
   * Unregister stop callback
   */
  offStop(callback: () => void): void {
    this.stopCallbacks = this.stopCallbacks.filter(cb => cb !== callback)
  }

  /**
   * Get game stats
   */
  getStats(): GameStats {
    return { ...this.stats }
  }

  /**
   * Get canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  /**
   * Get context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  /**
   * Get input manager
   */
  getInputManager(): InputManager {
    return this.inputManager
  }

  /**
   * Get camera
   */
  getCamera(): Camera {
    return this.camera
  }

  /**
   * Get wave manager
   */
  getWaveManager(): WaveManager {
    return this.waveManager
  }

  /**
   * Get XP manager
   */
  getXPManager(): XPManager {
    return this.xpManager
  }

  /**
   * Get score manager
   */
  getScoreManager(): ScoreManager {
    return this.scoreManager
  }

  /**
   * Get auto targeting
   */
  getAutoTargeting(): AutoTargeting {
    return this.autoTargeting
  }

  /**
   * Check if engine is running
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop()
    this.inputManager.destroy()
    
    if ((this as any).resizeObserver) {
      (this as any).resizeObserver.disconnect()
    }
  }
}

export default GameEngine
