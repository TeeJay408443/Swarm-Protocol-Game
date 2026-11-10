/**
 * Camera System
 * Phase 7: Build the Game - Camera Management
 */

import { Vector2 } from '../utils/vector'

export interface CameraOptions {
  width: number
  height: number
  zoom?: number
  lerpFactor?: number
}

export class Camera {
  /** Camera position (world coordinates) */
  x: number
  y: number
  
  /** Viewport dimensions */
  width: number
  height: number
  
  /** Zoom level */
  zoom: number
  
  /** Smooth follow factor (0-1) */
  lerpFactor: number

  constructor(options: CameraOptions) {
    this.x = 0
    this.y = 0
    this.width = options.width
    this.height = options.height
    this.zoom = options.zoom || 1
    this.lerpFactor = options.lerpFactor || 0.1
  }

  /**
   * Update camera position to follow a target
   */
  update(targetX: number, targetY: number): void {
    this.x = this.lerp(this.x, targetX - this.width / 2, this.lerpFactor)
    this.y = this.lerp(this.y, targetY - this.height / 2, this.lerpFactor)
  }

  /**
   * Update camera with custom lerp factor
   */
  updateWithLerp(targetX: number, targetY: number, lerpFactor: number): void {
    this.x = this.lerp(this.x, targetX - this.width / 2, lerpFactor)
    this.y = this.lerp(this.y, targetY - this.height / 2, lerpFactor)
  }

  /**
   * Set camera position directly
   */
  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(zoom, 10)) // Clamp zoom
  }

  /**
   * Zoom in by a factor
   */
  zoomIn(factor: number = 1.1): void {
    this.setZoom(this.zoom * factor)
  }

  /**
   * Zoom out by a factor
   */
  zoomOut(factor: number = 1.1): void {
    this.setZoom(this.zoom / factor)
  }

  /**
   * Linear interpolation
   */
  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(x: number, y: number): Vector2 {
    return {
      x: (x - this.x) * this.zoom,
      y: (y - this.y) * this.zoom
    }
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(x: number, y: number): Vector2 {
    return {
      x: x / this.zoom + this.x,
      y: y / this.zoom + this.y
    }
  }

  /**
   * Convert world coordinates to screen coordinates with Vector2
   */
  worldToScreenV(worldPos: Vector2): Vector2 {
    return this.worldToScreen(worldPos.x, worldPos.y)
  }

  /**
   * Convert screen coordinates to world coordinates with Vector2
   */
  screenToWorldV(screenPos: Vector2): Vector2 {
    return this.screenToWorld(screenPos.x, screenPos.y)
  }

  /**
   * Check if a point is visible on screen
   */
  isPointVisible(x: number, y: number): boolean {
    const screenX = (x - this.x) * this.zoom
    const screenY = (y - this.y) * this.zoom
    return (
      screenX >= 0 && screenX <= this.width &&
      screenY >= 0 && screenY <= this.height
    )
  }

  /**
   * Check if a rectangle is visible on screen
   */
  isRectVisible(x: number, y: number, width: number, height: number): boolean {
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

  /**
   * Get camera bounds in world coordinates
   */
  getWorldBounds(): { left: number, right: number, top: number, bottom: number } {
    return {
      left: this.x,
      right: this.x + this.width / this.zoom,
      top: this.y,
      bottom: this.y + this.height / this.zoom
    }
  }

  /**
   * Reset camera to origin
   */
  reset(): void {
    this.x = 0
    this.y = 0
    this.zoom = 1
  }

  /**
   * Get camera state as an object
   */
  getState(): { x: number, y: number, zoom: number } {
    return { x: this.x, y: this.y, zoom: this.zoom }
  }

  /**
   * Set camera state from an object
   */
  setState(state: { x: number, y: number, zoom: number }): void {
    this.x = state.x
    this.y = state.y
    this.zoom = state.zoom
  }
}

export default Camera
