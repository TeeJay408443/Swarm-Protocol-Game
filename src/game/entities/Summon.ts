/**
 * Summon Entity (Companion Robot, Temporal Echo & Sentinel Turret)
 * Autonomous allied units with dedicated animated sprites, targeting, Lv 1-5 scaling, and Overdrive attacks.
 */

import { Camera } from '../engine/Camera'
import { Vector2 } from '../utils/vector'
import { Enemy } from './Enemy'
import { Player } from './Player'
import type { ProjectileType } from './Projectile'

export type SummonKind = 'companion_robot' | 'temporal_echo' | 'sentinel_turret'

export interface SummonAttackResult {
  projectile?: {
    x: number
    y: number
    direction: Vector2
    speed: number
    damage: number
    color: string
    type: ProjectileType
    maxPierces: number
    width: number
    height: number
  }
  extraProjectiles?: Array<{
    x: number
    y: number
    direction: Vector2
    speed: number
    damage: number
    color: string
    type: ProjectileType
    maxPierces: number
    width: number
    height: number
  }>
  pulse?: {
    x: number
    y: number
    radius: number
    damage: number
    color: string
  }
}

export interface SummonOptions {
  kind: SummonKind
  upgradeId: string
  x: number
  y: number
  damage: number
  cooldown: number
  level?: number
  slotIndex?: number
  totalSlots?: number
}

export class Summon {
  kind: SummonKind
  upgradeId: string
  x: number
  y: number
  damage: number
  cooldown: number
  level: number
  cooldownTimer: number = 0.15
  slotIndex: number
  totalSlots: number
  aimAngle: number = 0
  private animTime: number = Math.random() * Math.PI * 2
  private trailHistory: Array<{ x: number; y: number }> = []
  private afterimages: Array<{ x: number; y: number; alpha: number }> = []

  constructor(options: SummonOptions) {
    this.kind = options.kind
    this.upgradeId = options.upgradeId
    this.x = options.x
    this.y = options.y
    this.damage = options.damage
    this.cooldown = Math.max(0.22, options.cooldown)
    this.level = Math.max(1, Math.min(5, options.level ?? 1))
    this.slotIndex = options.slotIndex ?? 0
    this.totalSlots = Math.max(1, options.totalSlots ?? 1)
  }

  update(
    deltaTime: number,
    player: Player,
    enemies: Enemy[],
    playerTrail: ReadonlyArray<{ x: number; y: number }>
  ): SummonAttackResult | null {
    this.animTime += deltaTime
    const pc = player.getCenter()

    if (this.kind === 'companion_robot') {
      // Smooth orbital hover around the player
      const baseOffset = (this.slotIndex / Math.max(1, this.totalSlots)) * Math.PI * 2
      const orbitAngle = this.animTime * 1.45 + baseOffset
      const orbitRadius = 62 + this.slotIndex * 8
      const desiredX = pc.x + Math.cos(orbitAngle) * orbitRadius
      const desiredY = pc.y + Math.sin(orbitAngle) * orbitRadius + Math.sin(this.animTime * 4) * 4

      const followRate = Math.min(1, deltaTime * 9)
      this.x += (desiredX - this.x) * followRate
      this.y += (desiredY - this.y) * followRate
    } else if (this.kind === 'sentinel_turret') {
      // Planted automated gun platform with a 210px tactical reposition leash
      const distFromPlayer = Math.hypot(this.x - pc.x, this.y - pc.y)
      if (distFromPlayer > 210) {
        const slotAngle =
          (this.slotIndex / Math.max(1, this.totalSlots)) * Math.PI * 2 + 0.65
        const targetX = pc.x + Math.cos(slotAngle) * 95
        const targetY = pc.y + Math.sin(slotAngle) * 95
        const repositionRate = Math.min(1, deltaTime * 5.2)
        this.x += (targetX - this.x) * repositionRate
        this.y += (targetY - this.y) * repositionRate
      }
    } else {
      // Temporal Echo follows delayed player movement trail or orbits slowly when stationary
      const delaySteps = 12 + this.slotIndex * 10
      const targetIndex = Math.max(0, playerTrail.length - 1 - delaySteps)
      const trailPoint = playerTrail[targetIndex]
      const distFromPlayer = trailPoint ? Math.hypot(trailPoint.x - pc.x, trailPoint.y - pc.y) : 0

      let desiredX = pc.x
      let desiredY = pc.y
      if (trailPoint && distFromPlayer > 14) {
        desiredX = trailPoint.x
        desiredY = trailPoint.y
      } else {
        const angle = -this.animTime * 1.8 + this.slotIndex * Math.PI
        desiredX = pc.x + Math.cos(angle) * 56
        desiredY = pc.y + Math.sin(angle) * 56
      }

      const followRate = Math.min(1, deltaTime * 11)
      this.x += (desiredX - this.x) * followRate
      this.y += (desiredY - this.y) * followRate

      this.trailHistory.push({ x: this.x, y: this.y })
      if (this.trailHistory.length > 6) {
        this.trailHistory.shift()
      }
      if (Math.random() < 0.45) {
        this.afterimages.push({ x: this.x, y: this.y, alpha: 0.45 })
        if (this.afterimages.length > 5) {
          this.afterimages.shift()
        }
      }
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].alpha -= deltaTime * 1.4
        if (this.afterimages[i].alpha <= 0) {
          this.afterimages.splice(i, 1)
        }
      }
    }

    // Acquire nearest living enemy within 640px
    let nearest: Enemy | null = null
    let nearestDist = 640
    for (const enemy of enemies) {
      if (!enemy.isAlive || enemy.isSpawning) continue
      const ec = enemy.getCenter()
      const dist = Math.hypot(ec.x - this.x, ec.y - this.y)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = enemy
      }
    }

    if (nearest) {
      const ec = nearest.getCenter()
      this.aimAngle = Math.atan2(ec.y - this.y, ec.x - this.x)
    } else if (this.kind === 'companion_robot' || this.kind === 'sentinel_turret') {
      this.aimAngle += deltaTime * 1.6
    } else {
      this.aimAngle = Math.atan2(pc.y - this.y, pc.x - this.x) + Math.PI
    }

    this.cooldownTimer -= deltaTime
    if (this.cooldownTimer > 0 || !nearest) {
      return null
    }

    this.cooldownTimer = Math.max(0.22, this.cooldown)
    const dir = { x: Math.cos(this.aimAngle), y: Math.sin(this.aimAngle) }
    const isLv5 = this.level >= 5

    if (this.kind === 'companion_robot') {
      const muzzleDist = 14
      const botSpeed = 500 + this.level * 28
      if (isLv5) {
        // Level 5 Overdrive: fires piercing twin cyan burst
        const perp = { x: -dir.y, y: dir.x }
        return {
          projectile: {
            x: this.x + dir.x * muzzleDist + perp.x * 4,
            y: this.y + dir.y * muzzleDist + perp.y * 4,
            direction: dir,
            speed: botSpeed,
            damage: this.damage,
            color: '#00F0FF',
            type: 'Laser',
            maxPierces: 2,
            width: 12,
            height: 12
          },
          extraProjectiles: [
            {
              x: this.x + dir.x * muzzleDist - perp.x * 4,
              y: this.y + dir.y * muzzleDist - perp.y * 4,
              direction: dir,
              speed: botSpeed,
              damage: this.damage,
              color: '#00F0FF',
              type: 'Laser',
              maxPierces: 2,
              width: 12,
              height: 12
            }
          ]
        }
      }

      return {
        projectile: {
          x: this.x + dir.x * muzzleDist,
          y: this.y + dir.y * muzzleDist,
          direction: dir,
          speed: botSpeed,
          damage: this.damage,
          color: '#00F0FF',
          type: 'Laser',
          maxPierces: this.level >= 4 ? 2 : this.level >= 3 ? 1 : 0,
          width: 7 + this.level,
          height: 7 + this.level
        }
      }
    }

    if (this.kind === 'sentinel_turret') {
      const muzzleDist = 16
      const turretSpeed = 540 + this.level * 30
      if (this.level >= 4) {
        // Level 4-5: Twin-Rail barrels (Lv 5 fires overcharged 3-pierce gold lasers)
        const perp = { x: -dir.y, y: dir.x }
        const pierces = isLv5 ? 3 : 1
        const pType = isLv5 ? 'Laser' : 'Basic'
        const size = isLv5 ? 12 : 10
        return {
          projectile: {
            x: this.x + dir.x * muzzleDist + perp.x * 5,
            y: this.y + dir.y * muzzleDist + perp.y * 5,
            direction: dir,
            speed: turretSpeed,
            damage: this.damage,
            color: '#FACC15',
            type: pType,
            maxPierces: pierces,
            width: size,
            height: size
          },
          extraProjectiles: [
            {
              x: this.x + dir.x * muzzleDist - perp.x * 5,
              y: this.y + dir.y * muzzleDist - perp.y * 5,
              direction: dir,
              speed: turretSpeed,
              damage: this.damage,
              color: '#FACC15',
              type: pType,
              maxPierces: pierces,
              width: size,
              height: size
            }
          ]
        }
      }

      return {
        projectile: {
          x: this.x + dir.x * muzzleDist,
          y: this.y + dir.y * muzzleDist,
          direction: dir,
          speed: turretSpeed,
          damage: this.damage,
          color: '#FACC15',
          type: 'Basic',
          maxPierces: this.level >= 3 ? 1 : 0,
          width: 8 + this.level,
          height: 8 + this.level
        }
      }
    }

    // Temporal Echo fires piercing phase crescent blades + emits close-range temporal shockwave
    const echoSpeed = 420 + this.level * 28
    const echoRadius = 65 + this.level * 20
    return {
      projectile: {
        x: this.x + dir.x * 12,
        y: this.y + dir.y * 12,
        direction: dir,
        speed: echoSpeed,
        damage: this.damage,
        color: isLv5 ? '#F0ABFC' : '#C084FC',
        type: 'ChronoBlade',
        maxPierces: this.level,
        width: 11 + this.level * 1.4,
        height: 11 + this.level * 1.4
      },
      pulse: {
        x: this.x,
        y: this.y,
        radius: echoRadius,
        damage: Math.max(4, Math.round(this.damage * (0.55 + this.level * 0.1))),
        color: isLv5 ? 'rgba(232, 121, 249, 0.55)' : 'rgba(192, 132, 252, 0.42)'
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera, player: Player): void {
    const sp = camera.worldToScreen(this.x, this.y)
    const playerScreen = camera.worldToScreen(player.getCenter().x, player.getCenter().y)

    if (this.kind === 'companion_robot') {
      this.drawCompanionRobot(ctx, sp, playerScreen)
    } else if (this.kind === 'sentinel_turret') {
      this.drawSentinelTurret(ctx, sp)
    } else {
      this.drawTemporalEcho(ctx, sp, playerScreen, camera)
    }
  }

  private drawCompanionRobot(
    ctx: CanvasRenderingContext2D,
    sp: Vector2,
    playerScreen: Vector2
  ): void {
    const isLv5 = this.level >= 5
    const accent = isLv5 ? '#FFD700' : '#00F0FF'
    ctx.save()

    // Subtle energy link tether to operator
    ctx.strokeStyle = isLv5 ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 240, 255, 0.16)'
    ctx.lineWidth = 1.2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(playerScreen.x, playerScreen.y)
    ctx.lineTo(sp.x, sp.y)
    ctx.stroke()
    ctx.setLineDash([])

    // Ground hover shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)'
    ctx.beginPath()
    ctx.ellipse(sp.x, sp.y + 15, 10, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Hover glow
    ctx.fillStyle = isLv5 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 240, 255, 0.14)'
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, isLv5 ? 20 : 17, 0, Math.PI * 2)
    ctx.fill()

    // Rotating orbital stabilization ring
    ctx.save()
    ctx.translate(sp.x, sp.y)
    ctx.rotate(this.animTime * (isLv5 ? 3.6 : 2.4))
    ctx.strokeStyle = isLv5 ? 'rgba(255, 215, 0, 0.75)' : 'rgba(0, 240, 255, 0.55)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, 14, 0, Math.PI * 0.65)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, 14, Math.PI, Math.PI * 1.65)
    ctx.stroke()
    ctx.restore()

    // Rotated drone chassis & muzzle
    ctx.translate(sp.x, sp.y)
    ctx.rotate(this.aimAngle)

    // Side thruster pods
    ctx.fillStyle = '#1E293B'
    ctx.strokeStyle = '#64748B'
    ctx.lineWidth = 1
    ctx.fillRect(-10, -11, 8, 4)
    ctx.fillRect(-10, 7, 8, 4)

    // Thruster ion exhaust
    const flameLen = 4 + Math.sin(this.animTime * 22) * 2
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.moveTo(-10, -9)
    ctx.lineTo(-10 - flameLen, -9)
    ctx.lineTo(-10, -7)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-10, 9)
    ctx.lineTo(-10 - flameLen, 9)
    ctx.lineTo(-10, 7)
    ctx.closePath()
    ctx.fill()

    // Turret barrel(s)
    ctx.fillStyle = '#94A3B8'
    if (isLv5) {
      ctx.fillRect(6, -4.5, 12, 3)
      ctx.fillRect(6, 1.5, 12, 3)
      ctx.fillStyle = '#FFD700'
      ctx.fillRect(16, -4, 3, 2)
      ctx.fillRect(16, 2, 3, 2)
    } else {
      ctx.fillRect(6, -2.5, 11, 5)
      ctx.fillStyle = '#00F0FF'
      ctx.fillRect(15, -1.5, 3, 3)
    }

    // Main hexagonal drone body
    ctx.fillStyle = '#0F172A'
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(10, 0)
    ctx.lineTo(4, -9)
    ctx.lineTo(-8, -7)
    ctx.lineTo(-11, 0)
    ctx.lineTo(-8, 7)
    ctx.lineTo(4, 9)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Glowing optic core
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(2, 0, 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(3, -0.5, 1.4, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawSentinelTurret(ctx: CanvasRenderingContext2D, sp: Vector2): void {
    const isLv5 = this.level >= 5
    const accent = isLv5 ? '#FACC15' : '#00F0FF'
    ctx.save()

    // Base shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.beginPath()
    ctx.ellipse(sp.x, sp.y + 12, 16, 7, 0, 0, Math.PI * 2)
    ctx.fill()

    // Overdrive radar ring
    if (isLv5) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, 19 + Math.sin(this.animTime * 6) * 2, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Tripod stabilizer legs
    ctx.strokeStyle = '#64748B'
    ctx.lineWidth = 3
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6
      ctx.beginPath()
      ctx.moveTo(sp.x, sp.y)
      ctx.lineTo(sp.x + Math.cos(a) * 15, sp.y + Math.sin(a) * 15)
      ctx.stroke()
    }

    // Armored octagonal base plate
    ctx.fillStyle = '#1E293B'
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Rotating turret head & twin barrels
    ctx.translate(sp.x, sp.y)
    ctx.rotate(this.aimAngle)

    ctx.fillStyle = '#CBD5E1'
    ctx.fillRect(6, -5.5, 13, 3.5)
    ctx.fillRect(6, 2, 13, 3.5)
    ctx.fillStyle = accent
    ctx.fillRect(17, -5, 3, 2.5)
    ctx.fillRect(17, 2.5, 3, 2.5)

    // Gun housing
    ctx.fillStyle = '#0F172A'
    ctx.strokeStyle = isLv5 ? '#FACC15' : '#94A3B8'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.roundRect(-8, -8, 16, 16, 4)
    ctx.fill()
    ctx.stroke()

    // Targeting optic lens
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(2, 0, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(3, 0, 1.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawTemporalEcho(
    ctx: CanvasRenderingContext2D,
    sp: Vector2,
    playerScreen: Vector2,
    camera: Camera
  ): void {
    const isLv5 = this.level >= 5
    ctx.save()

    // Trailing holographic ghosts
    for (const ghost of this.afterimages) {
      const gp = camera.worldToScreen(ghost.x, ghost.y)
      ctx.globalAlpha = Math.max(0.05, ghost.alpha * 0.5)
      ctx.fillStyle = isLv5 ? '#F0ABFC' : '#A855F7'
      ctx.beginPath()
      ctx.arc(gp.x, gp.y, isLv5 ? 15 : 12, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 0.9

    // Chronal tether
    ctx.strokeStyle = isLv5 ? 'rgba(240, 171, 252, 0.38)' : 'rgba(168, 85, 247, 0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(playerScreen.x, playerScreen.y)
    ctx.lineTo(sp.x, sp.y)
    ctx.stroke()

    // Distortion aura
    const pulseR = Math.max(4, (isLv5 ? 23 : 18) + Math.sin(this.animTime * 6) * 2.5)
    ctx.fillStyle = isLv5 ? 'rgba(240, 171, 252, 0.24)' : 'rgba(168, 85, 247, 0.16)'
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, pulseR, 0, Math.PI * 2)
    ctx.fill()

    // Counter-rotating temporal rings
    ctx.save()
    ctx.translate(sp.x, sp.y)
    ctx.rotate(-this.animTime * (isLv5 ? 4.4 : 3))
    ctx.strokeStyle = isLv5 ? 'rgba(255, 215, 0, 0.85)' : 'rgba(0, 240, 255, 0.65)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, isLv5 ? 18 : 15, 0, Math.PI * 1.1)
    ctx.stroke()
    ctx.restore()

    // Phase shadow silhouette rotated toward target
    ctx.translate(sp.x, sp.y)
    ctx.rotate(this.aimAngle)

    ctx.fillStyle = isLv5 ? 'rgba(168, 85, 247, 0.85)' : 'rgba(126, 34, 206, 0.72)'
    ctx.strokeStyle = isLv5 ? '#FFD700' : '#E879F9'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(14, 0)
    ctx.lineTo(-4, -10)
    ctx.lineTo(-12, -5)
    ctx.lineTo(-8, 0)
    ctx.lineTo(-12, 5)
    ctx.lineTo(-4, 10)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Chrono visor / core
    ctx.fillStyle = isLv5 ? '#FFD700' : '#00F0FF'
    ctx.beginPath()
    ctx.arc(3, 0, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(4, 0, 1.6, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}
