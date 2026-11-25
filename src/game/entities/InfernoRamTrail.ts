import { Camera } from '../engine/Camera'
import { Vector2 } from '../utils/vector'

interface TrailPoint extends Vector2 {
  age: number
  dash: number
}

interface Ember extends Vector2 {
  vx: number
  vy: number
  age: number
  lifetime: number
  size: number
}

/** Short-lived, bounded cosmetic effects; never creates damaging projectiles. */
export class InfernoRamTrail {
  readonly points: TrailPoint[] = []
  readonly embers: Ember[] = []
  private dash = 0

  beginDash(): void {
    this.dash++
  }

  update(dt: number): void {
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].age += dt
      if (this.points[i].age >= 0.55) this.points.splice(i, 1)
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const ember = this.embers[i]
      ember.age += dt
      ember.x += ember.vx * dt
      ember.y += ember.vy * dt
      ember.vy -= 45 * dt
      if (ember.age >= ember.lifetime) this.embers.splice(i, 1)
    }
  }

  emit(from: Vector2, to: Vector2): void {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const distance = Math.hypot(dx, dy)
    if (distance < 0.5) return
    const count = Math.min(8, Math.max(1, Math.ceil(distance / 18)))
    const nx = -dy / distance
    const ny = dx / distance
    if (this.points.at(-1)?.dash !== this.dash) {
      this.points.push({ ...from, age: 0, dash: this.dash })
    }
    for (let step = 1; step <= count; step++) {
      const progress = step / count
      const x = from.x + dx * progress
      const y = from.y + dy * progress
      this.points.push({ x, y, age: 0, dash: this.dash })
      for (const side of [-1, 1]) {
        this.embers.push({
          x, y,
          vx: nx * side * (35 + Math.random() * 85) - dx / distance * 65,
          vy: ny * side * (35 + Math.random() * 85) - dy / distance * 65,
          age: 0,
          lifetime: 0.3 + Math.random() * 0.3,
          size: 2 + Math.random() * 3
        })
      }
    }
    if (this.points.length > 64) this.points.splice(0, this.points.length - 64)
    if (this.embers.length > 96) this.embers.splice(0, this.embers.length - 96)
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.points.length && !this.embers.length) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    for (let index = 1; index < this.points.length; index++) {
      const previous = this.points[index - 1]
      const point = this.points[index]
      if (point.dash !== previous.dash) continue // Never connect separate teleports.
      const from = camera.worldToScreen(previous.x, previous.y)
      const to = camera.worldToScreen(point.x, point.y)
      const life = Math.max(0, 1 - point.age / 0.55)
      for (const [width, color, alpha] of [
        [42, '#EA580C', 0.12], [20, '#FB923C', 0.32], [5, '#FFF7CC', 0.8]
      ] as const) {
        ctx.globalAlpha = life * alpha
        ctx.strokeStyle = color
        ctx.lineWidth = width * life * camera.zoom
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
      }
    }
    for (const ember of this.embers) {
      const position = camera.worldToScreen(ember.x, ember.y)
      const life = Math.max(0, 1 - ember.age / ember.lifetime)
      ctx.globalAlpha = life * 0.9
      ctx.strokeStyle = ember.size > 3.5 ? '#FEF08A' : '#FB923C'
      ctx.lineWidth = Math.max(0.5, ember.size * life * camera.zoom)
      ctx.beginPath()
      ctx.moveTo(position.x, position.y)
      ctx.lineTo(position.x - ember.vx * 0.045 * camera.zoom, position.y - ember.vy * 0.045 * camera.zoom)
      ctx.stroke()
    }
    ctx.restore()
  }
}
