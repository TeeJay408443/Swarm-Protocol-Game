/**
 * Input Manager
 * Phase 7: Build the Game - Input Handling
 */

import { Vector2 } from '../utils/vector'

export interface InputState {
  keys: Record<string, boolean>
  mousePosition: Vector2
  mouseDown: boolean
  mouseButtons: Record<number, boolean>
  touchPosition: Vector2 | null
  touches: Vector2[]
}

export class InputManager {
  /** Current input state */
  private state: InputState
  
  /** Callback for key down events */
  private onKeyDownCallbacks: ((key: string) => void)[] = []
  
  /** Callback for key up events */
  private onKeyUpCallbacks: ((key: string) => void)[] = []
  
  /** Callback for mouse move events */
  private onMouseMoveCallbacks: ((position: Vector2) => void)[] = []
  
  /** Callback for mouse down events */
  private onMouseDownCallbacks: ((button: number, position: Vector2) => void)[] = []
  
  /** Callback for mouse up events */
  private onMouseUpCallbacks: ((button: number, position: Vector2) => void)[] = []

  constructor() {
    this.state = {
      keys: {},
      mousePosition: Vector2.zero(),
      mouseDown: false,
      mouseButtons: {},
      touchPosition: null,
      touches: []
    }
    
    this.setupEventListeners()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    
    // Mouse events
    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('mousedown', this.handleMouseDown)
    window.addEventListener('mouseup', this.handleMouseUp)
    window.addEventListener('mouseleave', this.handleMouseLeave)
    
    // Touch events
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false })
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    window.addEventListener('touchend', this.handleTouchEnd)
    window.addEventListener('touchcancel', this.handleTouchEnd)
    
    // Prevent default touch behavior
    window.addEventListener('touchmove', (e) => {
      if (this.state.touches.length > 0) {
        e.preventDefault()
      }
    }, { passive: false })
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('mousedown', this.handleMouseDown)
    window.removeEventListener('mouseup', this.handleMouseUp)
    window.removeEventListener('mouseleave', this.handleMouseLeave)
    window.removeEventListener('touchstart', this.handleTouchStart)
    window.removeEventListener('touchmove', this.handleTouchMove)
    window.removeEventListener('touchend', this.handleTouchEnd)
    window.removeEventListener('touchcancel', this.handleTouchEnd)
  }

  /**
   * Update input state (called once per frame)
   */
  update(): void {
    // Update can be used for any per-frame input processing
  }

  /**
   * Get movement vector from keyboard input
   * Returns a normalized vector for WASD or arrow keys
   */
  getMovementVector(): Vector2 {
    let x = 0
    let y = 0
    
    // WASD keys
    if (this.state.keys['w'] || this.state.keys['W'] || this.state.keys['ArrowUp']) y -= 1
    if (this.state.keys['s'] || this.state.keys['S'] || this.state.keys['ArrowDown']) y += 1
    if (this.state.keys['a'] || this.state.keys['A'] || this.state.keys['ArrowLeft']) x -= 1
    if (this.state.keys['d'] || this.state.keys['D'] || this.state.keys['ArrowRight']) x += 1
    
    // Normalize diagonal movement
    const length = Math.sqrt(x * x + y * y)
    if (length > 0) {
      return { x: x / length, y: y / length }
    }
    
    return { x: 0, y: 0 }
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return this.state.keys[key] || false
  }

  /**
   * Check if a key was just pressed (requires tracking previous state)
   */
  isKeyJustPressed(key: string): boolean {
    // This would require tracking previous state
    // For now, just return current state
    return this.isKeyPressed(key)
  }

  /**
   * Get mouse position in screen coordinates
   */
  getMousePosition(): Vector2 {
    return Vector2.copy(this.state.mousePosition)
  }

  /**
   * Get mouse position in world coordinates (requires camera)
   */
  getMouseWorldPosition(camera: { screenToWorld: (x: number, y: number) => Vector2 }): Vector2 {
    return camera.screenToWorld(this.state.mousePosition.x, this.state.mousePosition.y)
  }

  /**
   * Check if mouse is currently down
   */
  isMouseDown(): boolean {
    return this.state.mouseDown
  }

  /**
   * Check if a specific mouse button is down
   */
  isMouseButtonDown(button: number): boolean {
    return this.state.mouseButtons[button] || false
  }

  /**
   * Get touch position (first touch)
   */
  getTouchPosition(): Vector2 | null {
    return this.state.touchPosition ? Vector2.copy(this.state.touchPosition) : null
  }

  /**
   * Get all touch positions
   */
  getAllTouches(): Vector2[] {
    return this.state.touches.map(t => Vector2.copy(t))
  }

  /**
   * Check if any touch is active
   */
  hasTouch(): boolean {
    return this.state.touches.length > 0
  }

  /**
   * Get touch movement vector (for virtual joystick)
   */
  getTouchMovementVector(): Vector2 {
    if (this.state.touches.length === 0) {
      return Vector2.zero()
    }
    
    // For now, just return the first touch position as a vector
    // In a real implementation, you'd track touch start position
    const touch = this.state.touches[0]
    return { x: touch.x, y: touch.y }
  }

  /**
   * Register callback for key down
   */
  onKeyDown(callback: (key: string) => void): void {
    this.onKeyDownCallbacks.push(callback)
  }

  /**
   * Register callback for key up
   */
  onKeyUp(callback: (key: string) => void): void {
    this.onKeyUpCallbacks.push(callback)
  }

  /**
   * Register callback for mouse move
   */
  onMouseMove(callback: (position: Vector2) => void): void {
    this.onMouseMoveCallbacks.push(callback)
  }

  /**
   * Register callback for mouse down
   */
  onMouseDown(callback: (button: number, position: Vector2) => void): void {
    this.onMouseDownCallbacks.push(callback)
  }

  /**
   * Register callback for mouse up
   */
  onMouseUp(callback: (button: number, position: Vector2) => void): void {
    this.onMouseUpCallbacks.push(callback)
  }

  /**
   * Event handlers
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    this.state.keys[e.key] = true
    this.onKeyDownCallbacks.forEach(cb => cb(e.key))
  }

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.state.keys[e.key] = false
    this.onKeyUpCallbacks.forEach(cb => cb(e.key))
  }

  private handleMouseMove = (e: MouseEvent): void => {
    this.state.mousePosition = { x: e.clientX, y: e.clientY }
    this.onMouseMoveCallbacks.forEach(cb => cb(Vector2.copy(this.state.mousePosition)))
  }

  private handleMouseDown = (e: MouseEvent): void => {
    this.state.mouseDown = true
    this.state.mouseButtons[e.button] = true
    this.state.mousePosition = { x: e.clientX, y: e.clientY }
    this.onMouseDownCallbacks.forEach(cb => cb(e.button, Vector2.copy(this.state.mousePosition)))
  }

  private handleMouseUp = (e: MouseEvent): void => {
    this.state.mouseDown = false
    this.state.mouseButtons[e.button] = false
    this.state.mousePosition = { x: e.clientX, y: e.clientY }
    this.onMouseUpCallbacks.forEach(cb => cb(e.button, Vector2.copy(this.state.mousePosition)))
  }

  private handleMouseLeave = (): void => {
    this.state.mouseDown = false
    this.state.mouseButtons = {}
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault()
    const touches: Vector2[] = []
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      touches.push({ x: touch.clientX, y: touch.clientY })
    }
    
    this.state.touches = touches
    if (touches.length > 0) {
      this.state.touchPosition = touches[0]
    }
  }

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault()
    const touches: Vector2[] = []
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      touches.push({ x: touch.clientX, y: touch.clientY })
    }
    
    this.state.touches = touches
    if (touches.length > 0) {
      this.state.touchPosition = touches[0]
    }
  }

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault()
    const remainingTouches: Vector2[] = []
    
    // Get current touches that weren't removed
    const changedTouchIds = new Set()
    for (let i = 0; i < e.changedTouches.length; i++) {
      changedTouchIds.add(e.changedTouches[i].identifier)
    }
    
    for (const touch of this.state.touches) {
      // This is a simplified approach - in a real implementation,
      // you'd track touch identifiers
      remainingTouches.push(touch)
    }
    
    this.state.touches = remainingTouches
    if (remainingTouches.length > 0) {
      this.state.touchPosition = remainingTouches[0]
    } else {
      this.state.touchPosition = null
    }
  }

  /**
   * Get the current input state (read-only)
   */
  getState(): InputState {
    return {
      keys: { ...this.state.keys },
      mousePosition: Vector2.copy(this.state.mousePosition),
      mouseDown: this.state.mouseDown,
      mouseButtons: { ...this.state.mouseButtons },
      touchPosition: this.state.touchPosition ? Vector2.copy(this.state.touchPosition) : null,
      touches: this.state.touches.map(t => Vector2.copy(t))
    }
  }

  /**
   * Reset all input state
   */
  reset(): void {
    this.state = {
      keys: {},
      mousePosition: Vector2.zero(),
      mouseDown: false,
      mouseButtons: {},
      touchPosition: null,
      touches: []
    }
  }
}

// Singleton instance for global access
export const inputManager = new InputManager()

export default InputManager
