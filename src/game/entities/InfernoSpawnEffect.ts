import { Camera } from '../engine/Camera'
import { Vector2 } from '../utils/vector'

/** Bounded, time-driven entrance effects around an unmoving boss. */
export function drawInfernoSpawnEffect(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  center: Vector2,
  progress: number,
  time: number
): void {
  const position = camera.worldToScreen(center.x, center.y)
  const fade = Math.min(1, progress * 6) * Math.min(1, (1 - progress) * 8)
  const radius = (95 + Math.sin(progress * Math.PI) * 65) * camera.zoom
  ctx.save()
  ctx.translate(position.x, position.y)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = fade
  const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, radius * 1.8)
  aura.addColorStop(0, 'rgba(255, 247, 200, 0.6)')
  aura.addColorStop(0.35, 'rgba(251, 146, 60, 0.3)')
  aura.addColorStop(1, 'rgba(234, 88, 12, 0)')
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2)
  ctx.fill()

  // Counter-rotating broken seals and glowing runes.
  for (let ring = 0; ring < 2; ring++) {
    ctx.save()
    ctx.rotate(time * (ring === 0 ? 0.4 : -0.28))
    ctx.strokeStyle = ring === 0 ? '#FB923C' : '#FDE047'
    ctx.lineWidth = (ring === 0 ? 3 : 1.5) * camera.zoom
    for (let segment = 0; segment < 8; segment++) {
      const angle = segment * Math.PI / 4
      const r = radius * (1 + ring * 0.25)
      ctx.beginPath()
      ctx.arc(0, 0, r, angle, angle + 0.52)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
      ctx.lineTo(Math.cos(angle) * (r + 14), Math.sin(angle) * (r + 14))
      ctx.stroke()
    }
    ctx.restore()
  }

  // Rising ember streams form a fiery wing silhouette behind the body.
  for (let index = 0; index < 32; index++) {
    const side = index % 2 === 0 ? -1 : 1
    const travel = (time * 0.45 + index * 0.137) % 1
    const spread = (40 + (index % 8) * 16) * camera.zoom
    const x = side * spread * (0.4 + travel * 0.8)
    const y = (70 - travel * (110 + (index % 5) * 17)) * camera.zoom
    ctx.globalAlpha = fade * Math.sin(travel * Math.PI)
    ctx.strokeStyle = index % 3 === 0 ? '#FFF7CC' : '#FB923C'
    ctx.lineWidth = (2 + index % 3) * camera.zoom
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - side * 5 * camera.zoom, y + 13 * camera.zoom)
    ctx.stroke()
  }

  // One expanding release ring as the seals dissolve.
  const release = Math.max(0, (progress - 0.78) / 0.22)
  if (release > 0) {
    ctx.globalAlpha = (1 - release) * 0.8
    ctx.strokeStyle = '#FFF7CC'
    ctx.lineWidth = (5 - release * 4) * camera.zoom
    ctx.beginPath()
    ctx.arc(0, 0, (100 + release * 240) * camera.zoom, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}
