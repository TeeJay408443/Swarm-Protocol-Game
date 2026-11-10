/**
 * Collision Detection Utilities
 * Phase 7: Build the Game - Collision System
 */

import { Vector2 } from './vector'

/**
 * Rectangle collision detection
 */
export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Circle collision detection
 */
export interface Circle {
  x: number
  y: number
  radius: number
}

/**
 * Point collision detection
 */
export interface Point {
  x: number
  y: number
}

/**
 * Line segment collision detection
 */
export interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Collision utilities
 */
export const Collision = {
  /**
   * Check if two rectangles overlap (AABB - Axis-Aligned Bounding Box)
   */
  rectRect(rect1: Rectangle, rect2: Rectangle): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  },

  /**
   * Check if a point is inside a rectangle
   */
  pointInRect(point: Point, rect: Rectangle): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    )
  },

  /**
   * Check if two circles overlap
   */
  circleCircle(circle1: Circle, circle2: Circle): boolean {
    const dx = circle1.x - circle2.x
    const dy = circle1.y - circle2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < circle1.radius + circle2.radius
  },

  /**
   * Check if a point is inside a circle
   */
  pointInCircle(point: Point, circle: Circle): boolean {
    const dx = point.x - circle.x
    const dy = point.y - circle.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < circle.radius
  },

  /**
   * Check if a rectangle and circle overlap
   */
  rectCircle(rect: Rectangle, circle: Circle): boolean {
    // Find the closest point on the rectangle to the circle
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width))
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height))
    
    // Calculate distance between closest point and circle center
    const dx = closestX - circle.x
    const dy = closestY - circle.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return distance < circle.radius
  },

  /**
   * Check if a point is inside a polygon
   */
  pointInPolygon(point: Point, vertices: Vector2[]): boolean {
    let inside = false
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x
      const yi = vertices[i].y
      const xj = vertices[j].x
      const yj = vertices[j].y
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
      
      if (intersect) inside = !inside
    }
    return inside
  },

  /**
   * Check line-line collision
   */
  lineLine(line1: Line, line2: Line): boolean {
    // Calculate determinants
    const det1 = (line1.x2 - line1.x1) * (line2.y2 - line2.y1) - 
                  (line2.x2 - line2.x1) * (line1.y2 - line1.y1)
    
    if (det1 === 0) {
      // Lines are parallel, check if they're collinear and overlapping
      return this.lineLineParallel(line1, line2)
    }
    
    // Calculate parameters for intersection point
    const t = ((line2.x2 - line2.x1) * (line1.y1 - line2.y1) - 
               (line2.y2 - line2.y1) * (line1.x1 - line2.x1)) / det1
    const u = ((line1.x2 - line1.x1) * (line1.y1 - line2.y1) - 
               (line1.y2 - line1.y1) * (line1.x1 - line2.x1)) / det1
    
    // Check if intersection is within both line segments
    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  },

  /**
   * Check if parallel lines overlap
   */
  private lineLineParallel(line1: Line, line2: Line): boolean {
    // Check if points are on the same line
    const onLine = (x: number, y: number, line: Line): boolean => {
      const cross = (x - line.x1) * (line.y2 - line.y1) - 
                     (y - line.y1) * (line.x2 - line.x1)
      return Math.abs(cross) < 0.0001
    }
    
    // Check if line1 points are on line2
    if (!onLine(line1.x1, line1.y1, line2) || !onLine(line1.x2, line1.y2, line2)) {
      return false
    }
    
    // Check if line2 points are on line1
    if (!onLine(line2.x1, line2.y1, line1) || !onLine(line2.x2, line2.y2, line1)) {
      return false
    }
    
    // Check if segments overlap
    const min1 = Math.min(line1.x1, line1.x2)
    const max1 = Math.max(line1.x1, line1.x2)
    const min2 = Math.min(line2.x1, line2.x2)
    const max2 = Math.max(line2.x1, line2.x2)
    
    return max1 >= min2 && max2 >= min1
  },

  /**
   * Get collision normal between two rectangles
   */
  getRectRectNormal(rect1: Rectangle, rect2: Rectangle): Vector2 | null {
    // Calculate overlap on each axis
    const overlapX = Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - 
                     Math.max(rect1.x, rect2.x)
    const overlapY = Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - 
                     Math.max(rect1.y, rect2.y)
    
    // If no overlap, no collision
    if (overlapX <= 0 || overlapY <= 0) return null
    
    // Determine which axis has smaller overlap (the collision normal)
    if (overlapX < overlapY) {
      // Horizontal collision
      if (rect1.x < rect2.x) {
        return { x: -1, y: 0 } // Left
      } else {
        return { x: 1, y: 0 } // Right
      }
    } else {
      // Vertical collision
      if (rect1.y < rect2.y) {
        return { x: 0, y: -1 } // Top
      } else {
        return { x: 0, y: 1 } // Bottom
      }
    }
  },

  /**
   * Get penetration depth between two rectangles
   */
  getRectRectPenetration(rect1: Rectangle, rect2: Rectangle): Vector2 | null {
    const normal = this.getRectRectNormal(rect1, rect2)
    if (!normal) return null
    
    // Calculate penetration depth
    const overlapX = Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - 
                     Math.max(rect1.x, rect2.x)
    const overlapY = Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - 
                     Math.max(rect1.y, rect2.y)
    
    if (overlapX < overlapY) {
      return { x: normal.x * overlapX, y: 0 }
    } else {
      return { x: 0, y: normal.y * overlapY }
    }
  },

  /**
   * Check if entity is within range
   */
  inRange(x1: number, y1: number, x2: number, y2: number, range: number): boolean {
    const dx = x1 - x2
    const dy = y1 - y2
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= range
  },

  /**
   * Get distance squared (faster for comparisons)
   */
  distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2
    const dy = y1 - y2
    return dx * dx + dy * dy
  },

  /**
   * Swept AABB collision (for moving entities)
   * Returns the time of collision (0-1) or -1 if no collision
   */
  sweptRectRect(
    rect1: Rectangle & { vx: number, vy: number },
    rect2: Rectangle,
    deltaTime: number
  ): number {
    // Calculate broadphase - if already overlapping, return 0
    if (this.rectRect(rect1, rect2)) {
      return 0
    }
    
    // Calculate movement
    const moveX = rect1.vx * deltaTime
    const moveY = rect1.vy * deltaTime
    
    // Check X axis
    let tx1 = (rect2.x - (rect1.x + rect1.width)) / moveX
    let tx2 = (rect2.x + rect2.width - rect1.x) / moveX
    
    // Check Y axis
    let ty1 = (rect2.y - (rect1.y + rect1.height)) / moveY
    let ty2 = (rect2.y + rect2.height - rect1.y) / moveY
    
    // Fix division by zero
    if (moveX === 0) {
      tx1 = -Infinity
      tx2 = Infinity
    }
    if (moveY === 0) {
      ty1 = -Infinity
      ty2 = Infinity
    }
    
    // Ensure tx1 is the entry time and tx2 is the exit time
    if (tx1 > tx2) [tx1, tx2] = [tx2, tx1]
    if (ty1 > ty2) [ty1, ty2] = [ty2, ty1]
    
    // Find the earliest entry time and latest exit time
    const entryTime = Math.max(tx1, ty1)
    const exitTime = Math.min(tx2, ty2)
    
    // If entry time is before exit time and within [0, 1], collision occurs
    if (entryTime >= 0 && entryTime <= 1 && entryTime <= exitTime) {
      return entryTime
    }
    
    return -1
  }
}

export default Collision
