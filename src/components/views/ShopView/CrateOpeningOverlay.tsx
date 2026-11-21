import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../ui/Button'
import { useAudio } from '../../../context/AudioContext'
import {
  type CrateDropEntry,
  type GearRarity,
  RARITY_META,
  type SupplyCrateTier
} from '../../../services/shop'

export interface CrateOpeningPayload {
  key: number
  crate: SupplyCrateTier
  drops: CrateDropEntry[]
  highestRarity: GearRarity
  hasMythic: boolean
  hasLegendary: boolean
}

interface CrateOpeningOverlayProps {
  payload: CrateOpeningPayload | null
  balance: number
  onClose: () => void
  onOpenMore: (crateId: string, count: number) => void
  onNavigateArmory: (tab: 'inventory' | 'forge') => void
}

type CratePhase = 'charging' | 'burst' | 'reveal'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  decay: number
  color: string
  isStar?: boolean
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  rot: number
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / 4
    const px = Math.cos(angle) * r
    const py = Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function computeWeaponDps(damage: number, cooldownSeconds: number): string {
  if (cooldownSeconds <= 0) return `${damage}/tick`
  return `${(damage / cooldownSeconds).toFixed(1)} DPS`
}

export function CrateOpeningOverlay({
  payload,
  balance,
  onClose,
  onOpenMore,
  onNavigateArmory
}: CrateOpeningOverlayProps) {
  const { playSound } = useAudio()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [phase, setPhase] = useState<CratePhase>('charging')
  const [cycle, setCycle] = useState(0)
  const phaseRef = useRef<CratePhase>('charging')
  const phaseStartRef = useRef<number>(0)
  const burstSpawnedRef = useRef<boolean>(false)
  const particlesRef = useRef<Particle[]>([])

  const startSequence = useCallback(() => {
    if (!payload) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    particlesRef.current = []
    burstSpawnedRef.current = false
    phaseStartRef.current = performance.now()

    if (prefersReduced) {
      phaseRef.current = 'reveal'
      setPhase('reveal')
      playSound(payload.hasMythic ? 'levelup' : 'coin')
      return
    }

    phaseRef.current = 'charging'
    setPhase('charging')
    setCycle((c) => c + 1)
    playSound('wave')
  }, [payload, playSound])

  useEffect(() => {
    if (!payload) return
    startSequence()
  }, [payload, startSequence])

  useEffect(() => {
    if (!payload) return
    if (phaseRef.current === 'reveal') return

    const burstDelay = 620
    const revealDelay = payload.hasMythic ? 1580 : 1120

    const tBurst = window.setTimeout(() => {
      phaseRef.current = 'burst'
      phaseStartRef.current = performance.now()
      setPhase('burst')
      playSound(payload.hasMythic ? 'levelup' : 'explosion')
    }, burstDelay)

    const tReveal = window.setTimeout(() => {
      phaseRef.current = 'reveal'
      phaseStartRef.current = performance.now()
      setPhase('reveal')
      playSound(payload.hasMythic || payload.hasLegendary ? 'levelup' : 'coin')
    }, revealDelay)

    return () => {
      window.clearTimeout(tBurst)
      window.clearTimeout(tReveal)
    }
  }, [payload, cycle, playSound])

  const skipToReveal = useCallback(() => {
    if (!payload) return
    phaseRef.current = 'reveal'
    phaseStartRef.current = performance.now()
    setPhase('reveal')
    playSound(payload.hasMythic || payload.hasLegendary ? 'levelup' : 'coin')
  }, [payload, playSound])

  useEffect(() => {
    if (!payload) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phaseRef.current !== 'reveal') skipToReveal()
        else onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [payload, onClose, skipToReveal])

  useEffect(() => {
    if (!payload) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isMythic = payload.hasMythic
    const highestColor = RARITY_META[payload.highestRarity].color
    const crateColor = payload.crate.accentColor

    let rafId = 0
    let lastTime = performance.now()

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000))
      lastTime = now

      const rect = canvas.getBoundingClientRect()
      const w = Math.max(300, Math.floor(rect.width))
      const h = Math.max(190, Math.floor(rect.height))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const cx = w / 2
      const cy = h / 2
      const curPhase = phaseRef.current
      const elapsed = (now - phaseStartRef.current) / 1000

      ctx.clearRect(0, 0, w, h)

      // Ambient radial aura
      const auraRadius =
        curPhase === 'burst'
          ? isMythic
            ? 260
            : 185
          : curPhase === 'reveal'
            ? isMythic
              ? 220
              : 150
            : 115
      const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, auraRadius)
      if (isMythic && curPhase !== 'charging') {
        grad.addColorStop(0, 'rgba(255, 46, 99, 0.45)')
        grad.addColorStop(0.45, 'rgba(255, 215, 0, 0.2)')
        grad.addColorStop(1, 'rgba(11, 15, 25, 0)')
      } else {
        const rgbGlow = curPhase === 'charging' ? crateColor : highestColor
        ctx.save()
        ctx.globalAlpha = 0.26
        ctx.fillStyle = rgbGlow
        ctx.beginPath()
        ctx.arc(cx, cy, auraRadius * 0.65, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.2)')
        grad.addColorStop(1, 'rgba(11, 15, 25, 0)')
      }
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      if (curPhase === 'charging') {
        const shake = Math.sin(now * 0.08) * (3 + elapsed * 7)
        const tilt = Math.sin(now * 0.06) * 0.09
        const boxW = 76
        const boxH = 68

        ctx.save()
        ctx.translate(cx + shake, cy + Math.cos(now * 0.09) * 2)
        ctx.rotate(tilt)
        ctx.fillStyle = '#111827'
        ctx.strokeStyle = isMythic ? '#FF2E63' : crateColor
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 10)
        ctx.fill()
        ctx.stroke()

        // Glowing crate core seam
        ctx.strokeStyle = isMythic ? '#FFD700' : '#00F0FF'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(-boxW / 2 + 6, -6)
        ctx.lineTo(boxW / 2 - 6, -6)
        ctx.stroke()

        ctx.fillStyle = isMythic ? '#FF2E63' : crateColor
        ctx.beginPath()
        ctx.arc(0, -6, 8 + Math.sin(now * 0.03) * 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        if (Math.random() < 0.75) {
          const ang = Math.random() * Math.PI * 2
          const dist = 80 + Math.random() * 65
          particlesRef.current.push({
            x: cx + Math.cos(ang) * dist,
            y: cy + Math.sin(ang) * dist,
            vx: -Math.cos(ang) * 140,
            vy: -Math.sin(ang) * 140,
            size: 2.5 + Math.random() * 2.5,
            alpha: 0.9,
            decay: 1.7,
            color: crateColor
          })
        }
      } else if (curPhase === 'burst') {
        if (!burstSpawnedRef.current) {
          burstSpawnedRef.current = true
          const count = isMythic ? 95 : 45
          for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + Math.random() * 0.25
            const spd = (isMythic ? 140 : 95) + Math.random() * (isMythic ? 320 : 190)
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: isMythic ? 3 + Math.random() * 4.5 : 2 + Math.random() * 3.5,
              alpha: 1,
              decay: isMythic ? 0.85 + Math.random() * 0.45 : 1.2 + Math.random() * 0.6,
              color:
                isMythic
                  ? i % 3 === 0
                    ? '#FF2E63'
                    : i % 3 === 1
                      ? '#FFD700'
                      : '#FFE4E6'
                  : i % 2 === 0
                    ? highestColor
                    : '#FFFFFF',
              isStar: isMythic || i % 3 === 0
            })
          }
        }

        // Expanding shockwave ring
        const progress = Math.min(1, elapsed / (isMythic ? 0.96 : 0.5))
        ctx.save()
        ctx.strokeStyle = isMythic ? '#FF2E63' : highestColor
        ctx.lineWidth = isMythic ? 5 : 3.5
        ctx.globalAlpha = Math.max(0, 1 - progress)
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(12, progress * (isMythic ? 240 : 170)), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // Special Mythic Effect: Counter-rotating Calamity crimson crescent slash waves & rift bolts
        if (isMythic) {
          const slashRadius = 55 + progress * 135
          for (let w = 0; w < 2; w++) {
            const sweep = elapsed * 7.5 + w * Math.PI
            ctx.save()
            ctx.globalAlpha = Math.max(0, 1 - progress * 0.55)
            ctx.fillStyle = w === 0 ? 'rgba(255, 46, 99, 0.82)' : 'rgba(255, 215, 0, 0.72)'
            ctx.beginPath()
            ctx.arc(cx, cy, slashRadius, sweep - 1.4, sweep + 1.4)
            ctx.arc(cx, cy, slashRadius * 0.62, sweep + 1.4, sweep - 1.4, true)
            ctx.closePath()
            ctx.fill()

            ctx.strokeStyle = '#FFE4E6'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(cx, cy, slashRadius, sweep - 1.4, sweep + 1.4)
            ctx.stroke()
            ctx.restore()
          }

          // Crimson-gold rift bolts
          ctx.save()
          ctx.strokeStyle = '#FFD700'
          ctx.lineWidth = 2.2
          ctx.globalAlpha = Math.max(0.2, 1 - progress)
          for (let b = 0; b < 6; b++) {
            const ang = (b / 6) * Math.PI * 2 + elapsed * 3
            const r1 = 22
            const r2 = slashRadius * 1.15
            ctx.beginPath()
            ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1)
            ctx.lineTo(
              cx + Math.cos(ang + 0.18) * ((r1 + r2) * 0.52),
              cy + Math.sin(ang + 0.18) * ((r1 + r2) * 0.52)
            )
            ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2)
            ctx.stroke()
          }
          ctx.restore()
        }
      } else {
        // Reveal subtle ambient sparkle / Mythic aura
        if (Math.random() < (isMythic ? 0.55 : 0.2)) {
          particlesRef.current.push({
            x: cx + (Math.random() - 0.5) * w * 0.8,
            y: h - 10,
            vx: (Math.random() - 0.5) * 26,
            vy: -40 - Math.random() * 55,
            size: isMythic ? 3 + Math.random() * 2.5 : 2 + Math.random() * 2,
            alpha: 0.85,
            decay: 0.9,
            color: isMythic ? (Math.random() < 0.65 ? '#FF2E63' : '#FFD700') : highestColor,
            isStar: isMythic
          })
        }
      }

      // Render & step all particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.alpha -= p.decay * dt
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha))
        ctx.fillStyle = p.color
        if (p.isStar) {
          drawFourPointStar(ctx, p.x, p.y, p.size * 1.5, p.size * 0.55, now * 0.004 + i)
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      rafId = requestAnimationFrame(renderFrame)
    }

    rafId = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(rafId)
  }, [payload, cycle])

  const summary = useMemo(() => {
    if (!payload) return null
    const newCount = payload.drops.filter((d) => d.isNewUnlock).length
    const fusableCount = payload.drops.filter((d) => d.newCount >= 2).length
    return { newCount, fusableCount }
  }, [payload])

  if (!payload) return null

  const { crate, drops, hasMythic, highestRarity } = payload
  const isBatch = drops.length > 1
  const singleDrop = drops[0]
  const highestMeta = RARITY_META[highestRarity]
  const canOpenOne = balance >= crate.price
  const canOpenTen = balance >= crate.price * 10
  const hasAnyFusable = (summary?.fusableCount ?? 0) > 0

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={() => {
        if (phase === 'reveal') onClose()
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${
          isBatch ? 'max-w-4xl' : 'max-w-lg'
        } max-h-[92vh] my-auto flex flex-col overflow-hidden rounded-xl border bg-gray-900 shadow-2xl ${
          hasMythic
            ? 'border-rose-500 shadow-[0_0_50px_rgba(255,46,99,0.45)]'
            : payload.hasLegendary
              ? 'border-hazard-gold shadow-[0_0_36px_rgba(255,215,0,0.3)]'
              : 'border-cyan-accent/60'
        }`}
      >
        {/* Pinned Header */}
        <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between gap-4 shrink-0 bg-gray-950/70">
          <div className="min-w-0">
            <p
              className="text-xs font-mono uppercase tracking-wider truncate"
              style={{ color: hasMythic ? '#FF2E63' : highestMeta.color }}
            >
              {hasMythic
                ? 'MYTHIC CALAMITY DROP UNLOCKED'
                : `${crate.name} · ${isBatch ? `${drops.length}× Batch` : 'Single Drop'}`}
            </p>
            <h2 className="text-lg font-bold text-white truncate">
              {phase === 'charging'
                ? 'Unlocking Supply Vault...'
                : phase === 'burst'
                  ? hasMythic
                    ? 'Calamity Resonance Surge!'
                    : 'Crate Breached!'
                  : isBatch
                    ? `Opened ${drops.length}× ${crate.name}`
                    : singleDrop?.item.name || 'Crate Opened'}
            </h2>
          </div>

          <button
            type="button"
            onClick={phase === 'reveal' ? onClose : skipToReveal}
            className="text-xs font-semibold text-gray-300 hover:text-white px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 shrink-0"
          >
            {phase === 'reveal' ? 'Close' : 'Skip'}
          </button>
        </div>

        {/* Scrollable Body (Never exceeds viewport height) */}
        <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-5 space-y-4">
          {/* Animation Stage */}
          <div
            className={`relative rounded-lg border overflow-hidden ${
              phase === 'reveal' ? 'h-32 sm:h-36' : 'h-56 sm:h-64'
            } transition-all duration-200 ${
              hasMythic ? 'border-rose-500/60 bg-slate-950' : 'border-gray-800 bg-slate-950'
            }`}
          >
            <canvas ref={canvasRef} className="w-full h-full block" />
            {phase === 'burst' && hasMythic && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-4">
                  <p className="text-xs font-mono uppercase tracking-[0.3em] text-hazard-gold">
                    1% Calamity Anomaly
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-rose-400 drop-shadow-[0_0_16px_rgba(255,46,99,0.9)]">
                    MYTHIC PULL!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Reveal Results */}
          {phase === 'reveal' && !isBatch && singleDrop && (
            <div
              className={`rounded-lg border p-4 space-y-3 ${
                singleDrop.rarity === 'mythic'
                  ? 'border-rose-500 bg-rose-950/25'
                  : 'border-gray-800 bg-gray-950/70'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono uppercase">
                <span style={{ color: RARITY_META[singleDrop.rarity].color }} className="font-bold">
                  {RARITY_META[singleDrop.rarity].label} ·{' '}
                  {singleDrop.item.kind === 'weapon' ? 'Weapon' : 'Accessory'}
                </span>
                {singleDrop.isDuplicate ? (
                  <span className="text-hazard-gold font-semibold tabular-nums">
                    Stacked · ×{singleDrop.totalOwnedCount} Owned (0★)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">New Unlock · 0★</span>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">{singleDrop.item.name}</h3>
                <p className="text-xs font-mono text-gray-400">☆☆☆☆☆ · 0★ Base Drop</p>
                <p className="text-sm text-gray-300 mt-1.5">{singleDrop.item.function_desc}</p>
                {singleDrop.item.kind === 'weapon' && singleDrop.item.pairedHeroLabel && (
                  <p className="text-xs font-semibold text-rose-400 mt-1.5">
                    Hero Pairing: {singleDrop.item.pairedHeroLabel}
                  </p>
                )}
              </div>

              {singleDrop.item.kind === 'weapon' ? (
                <div className="grid grid-cols-3 gap-2 text-center border-t border-b border-gray-800 py-2.5">
                  <div>
                    <p className="text-[11px] uppercase text-gray-400">Damage</p>
                    <p className="text-sm font-bold text-white tabular-nums">
                      {singleDrop.item.damage}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-gray-400">Cooldown</p>
                    <p className="text-sm font-bold text-white tabular-nums">
                      {singleDrop.item.cooldown_s}s
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-gray-400">Output</p>
                    <p className="text-sm font-bold text-hazard-gold tabular-nums">
                      {computeWeaponDps(singleDrop.item.damage, singleDrop.item.cooldown_s)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-t border-b border-gray-800 py-2.5">
                  <p className="text-[11px] uppercase text-gray-400 mb-0.5">Modifier (0★)</p>
                  <p
                    className={`text-sm font-semibold ${
                      singleDrop.isBadGear ? 'text-red-400' : 'text-cyan-accent'
                    }`}
                  >
                    {singleDrop.item.statSummary}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                {singleDrop.newCount >= 2
                  ? `You have ×${singleDrop.newCount} copies at 0★—ready to fuse into 1★ in the Armory!`
                  : 'Collect 2 matching copies at the same star tier to fuse them stronger (up to 5★).'}
              </p>
            </div>
          )}

          {phase === 'reveal' && isBatch && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300 bg-gray-950/80 border border-gray-800 rounded-lg px-3.5 py-2.5 tabular-nums">
                <span>
                  Best Pull:{' '}
                  <strong style={{ color: highestMeta.color }}>{highestMeta.label}</strong>
                </span>
                <span>
                  New Unlocks:{' '}
                  <strong className="text-emerald-400">{summary?.newCount ?? 0}</strong> · Ready to
                  Fuse: <strong className="text-hazard-gold">{summary?.fusableCount ?? 0}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {drops.map((drop, idx) => {
                  const rMeta = RARITY_META[drop.rarity]
                  const isMyth = drop.rarity === 'mythic'
                  const isLeg = drop.rarity === 'legendary'
                  return (
                    <div
                      key={`${drop.item.id}-${idx}`}
                      className={`rounded-lg border p-3 flex flex-col justify-between ${
                        isMyth
                          ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(255,46,99,0.35)]'
                          : isLeg
                            ? 'bg-amber-950/25 border-hazard-gold/80'
                            : 'bg-gray-950/70 border-gray-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono uppercase mb-1">
                          <span style={{ color: rMeta.color }} className="font-bold truncate">
                            {rMeta.label}
                          </span>
                          <span
                            className={
                              drop.isNewUnlock ? 'text-emerald-400 font-semibold' : 'text-gray-400'
                            }
                          >
                            {drop.isNewUnlock ? 'NEW' : `×${drop.totalOwnedCount}`}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white leading-snug mb-1">
                          {drop.item.name}
                        </p>
                        <p className="text-[11px] text-gray-400 leading-tight">
                          {drop.item.kind === 'weapon'
                            ? `${drop.item.damage} dmg · ${drop.item.cooldown_s}s`
                            : drop.item.statSummary}
                        </p>
                      </div>
                      {drop.newCount >= 2 && (
                        <p className="text-[10px] text-hazard-gold font-semibold mt-2">
                          Fusion Ready!
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer Actions */}
        <div className="px-5 py-3.5 border-t border-gray-800 bg-gray-950/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <p className="text-xs text-gray-400 tabular-nums">
            Wallet: <span className="text-hazard-gold font-semibold">{balance.toLocaleString()} Coins</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {phase === 'reveal' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canOpenOne}
                  onClick={() => onOpenMore(crate.id, 1)}
                >
                  Open 1 ({crate.price.toLocaleString()}c)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canOpenTen}
                  onClick={() => onOpenMore(crate.id, 10)}
                >
                  Open ×10 ({(crate.price * 10).toLocaleString()}c)
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigateArmory(hasAnyFusable ? 'forge' : 'inventory')}
                >
                  {hasAnyFusable ? 'Fuse in Armory' : 'Open Armory'}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={phase === 'reveal' ? onClose : skipToReveal}>
              {phase === 'reveal' ? 'Close' : 'Skip Animation'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CrateOpeningOverlay
