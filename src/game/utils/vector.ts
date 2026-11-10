/**
 * Vector2 Utilities
 * Phase 7: Build the Game - Vector Math
 */

export interface Vector2 {
  x: number
  y: number
}

/**
 * Vector2 utility functions
 */
export const Vector2 = {
  /**
   * Create a zero vector
   */
  zero(): Vector2 {
    return { x: 0, y: 0 }
  },

  /**
   * Create a new vector
   */
  create(x: number, y: number): Vector2 {
    return { x, y }
  },

  /**
   * Add two vectors
   */
  add(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y }
  },

  /**
   * Subtract vector b from vector a
   */
  subtract(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y }
  },

  /**
   * Multiply vector by scalar
   */
  multiply(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar }
  },

  /**
   * Divide vector by scalar
   */
  divide(v: Vector2, scalar: number): Vector2 {
    return scalar !== 0 ? { x: v.x / scalar, y: v.y / scalar } : this.zero()
  },

  /**
   * Calculate vector length (magnitude)
   */
  length(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y)
  },

  /**
   * Calculate squared length (faster, no sqrt)
   */
  lengthSquared(v: Vector2): number {
    return v.x * v.x + v.y * v.y
  },

  /**
   * Normalize vector (make it unit length)
   */
  normalize(v: Vector2): Vector2 {
    const len = this.length(v)
    return len > 0 ? this.divide(v, len) : this.zero()
  },

  /**
   * Calculate distance between two vectors
   */
  distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  },

  /**
   * Calculate squared distance (faster)
   */
  distanceSquared(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy
  },

  /**
   * Linear interpolation between two vectors
   */
  lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    }
  },

  /**
   * Dot product of two vectors
   */
  dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y
  },

  /**
   * Cross product (2D returns scalar)
   */
  cross(a: Vector2, b: Vector2): number {
    return a.x * b.y - a.y * b.x
  },

  /**
   * Rotate vector by angle (in radians)
   */
  rotate(v: Vector2, angle: number): Vector2 {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    }
  },

  /**
   * Get angle of vector (in radians)
   */
  angle(v: Vector2): number {
    return Math.atan2(v.y, v.x)
  },

  /**
   * Create vector from angle and length
   */
  fromAngle(angle: number, length: number = 1): Vector2 {
    return {
      x: Math.cos(angle) * length,
      y: Math.sin(angle) * length
    }
  },

  /**
   * Clamp vector to maximum length
   */
  clampLength(v: Vector2, maxLength: number): Vector2 {
    const len = this.length(v)
    if (len <= maxLength) return { ...v }
    return this.multiply(this.normalize(v), maxLength)
  },

  /**
   * Check if two vectors are approximately equal
   */
  equals(a: Vector2, b: Vector2, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(a.x - b.x) < epsilon &&
      Math.abs(a.y - b.y) < epsilon
    )
  },

  /**
   * Copy a vector
   */
  copy(v: Vector2): Vector2 {
    return { x: v.x, y: v.y }
  }
}

/**
 * Common vector constants
 */
export const Vectors = {
  ZERO: Vector2.zero(),
  ONE: Vector2.create(1, 1),
  UP: Vector2.create(0, -1),
  DOWN: Vector2.create(0, 1),
  LEFT: Vector2.create(-1, 0),
  RIGHT: Vector2.create(1, 0),
  UP_LEFT: Vector2.create(-1, -1),
  UP_RIGHT: Vector2.create(1, -1),
  DOWN_LEFT: Vector2.create(-1, 1),
  DOWN_RIGHT: Vector2.create(1, 1)
}

export default Vector2
