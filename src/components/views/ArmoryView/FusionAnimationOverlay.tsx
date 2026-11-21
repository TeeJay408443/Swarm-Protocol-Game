import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../ui/Button'
import { useAudio } from '../../../context/AudioContext'
import {
  formatAccessoryStatSummary,
  type GearRarity,
  getStarScaledWeaponStats,
  MAX_GEAR_STARS,
  RARITY_META,
  type ShopCatalogItem
} from '../../../services/shop'

export interface FusionRepeatAction {
  label: string
  itemId: string
  stars: number
}

export interface FusionAnimationPayload {
  key: number
  item: ShopCatalogItem
  fromStars: number
  toStars: number
  nextRepeatAction: FusionRepeatAction | null
}

interface FusionAnimationOverlayProps {
  payload: FusionAnimationPayload | null
  onClose: () => void
  onFuseAnother: (itemId: string, stars: number) => void
}

type FusionPhase = 'charge' | 'converge' | 'reveal'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  decay: number
  color: string
  isStar?: boolean
}

const RARITY_BORDER_CLASS: Record<GearRarity, string> = {
  scrap: 'border-gray-500/70',
  faulty: 'border-red-400/80',
  common: 'border-slate-300/70',
  uncommon: 'border-emerald-400/80',
  rare: 'border-sky-400/85',
  epic: 'border-purple-400/90',
  legendary: 'border-hazard-gold',
  mythic: 'border-rose-500'
}

const RARITY_TEXT_CLASS: Record<GearRarity, string> = {
  scrap: 'text-gray-400',
  faulty: 'text-red-400',
  common: 'text-slate-200',
  uncommon: 'text-emerald-400',
  rare: 'text-sky-400',
  epic: 'text-purple-400',
  legendary: 'text-hazard-gold',
  mythic: 'text-rose-400'
}

function formatDps(damage: number, cooldown: number): string {
  if (cooldown <= 0) return `${damage}/tick`
  return `${(damage / cooldown).toFixed(1)} DPS`
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

export function FusionAnimationOverlay({
  payload,
  onClose,
  onFuseAnother
}: FusionAnimationOverlayProps) {
  const { playSound } = useAudio()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [phase, setPhase] = useState<FusionPhase>('charge')
  const [runCycle, setRunCycle] = useState<number>(0)
  const phaseRef = useRef<FusionPhase>('charge')
  const phaseStartRef = useRef<number>(0)
  const burstSpawnedRef = useRef<boolean>(false)
  const particlesRef = useRef<Particle[]>([])

  const startAnimation = useCallback(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    burstSpawnedRef.current = false
    particlesRef.current = []
    phaseStartRef.current = performance.now()

    if (prefersReduced) {
      phaseRef.current = 'reveal'
      setPhase('reveal')
      playSound('levelup')
      return
    }

    phaseRef.current = 'charge'
    setPhase('charge')
    setRunCycle((c) => c + 1)
    playSound('wave')
  }, [playSound])

  useEffect(() => {
    if (!payload) return
    startAnimation()
  }, [payload, startAnimation])

  // Drive timed phase transitions: charge (0-520ms) -> converge (520-980ms) -> reveal
  useEffect(() => {
    if (!payload) return
    if (phaseRef.current === 'reveal') return

    const tConverge = window.setTimeout(() => {
      phaseRef.current = 'converge'
      phaseStartRef.current = performance.now()
      setPhase('converge')
    }, 520)

    const tReveal = window.setTimeout(() => {
      phaseRef.current = 'reveal'
      phaseStartRef.current = performance.now()
      setPhase('reveal')
      playSound('levelup')
    }, 980)

    return () => {
      window.clearTimeout(tConverge)
      window.clearTimeout(tReveal)
    }
  }, [payload, runCycle, playSound]) // Intentionally scoped to each animation run

  const skipToReveal = useCallback(() => {
    phaseRef.current = 'reveal'
    phaseStartRef.current = performance.now()
    setPhase('reveal')
    playSound('levelup')
  }, [playSound])

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

  // 60 FPS Canvas particle, arc, shockwave, and star-flare renderer
  useEffect(() => {
    if (!payload) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rarityColor = RARITY_META[payload.item.rarity].color
    let rafId = 0
    let lastTime = performance.now()

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000))
      lastTime = now

      const rect = canvas.getBoundingClientRect()
      const w = Math.max(320, Math.floor(rect.width))
      const h = Math.max(260, Math.floor(rect.height))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const cx = w / 2
      const cy = h * 0.44
      const curPhase = phaseRef.current
      const elapsed = (now - phaseStartRef.current) / 1000

      ctx.clearRect(0, 0, w, h)

      // Ambient forge core glow
      const glowRadius = curPhase === 'reveal' ? 190 : curPhase === 'converge' ? 130 : 95
      const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, glowRadius)
      if (curPhase === 'reveal') {
        bgGrad.addColorStop(0, 'rgba(255, 215, 0, 0.34)')
        bgGrad.addColorStop(0.45, 'rgba(0, 240, 255, 0.14)')
        bgGrad.addColorStop(1, 'rgba(11, 15, 25, 0)')
      } else {
        bgGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)')
        bgGrad.addColorStop(0.55, 'rgba(255, 215, 0, 0.1)')
        bgGrad.addColorStop(1, 'rgba(11, 15, 25, 0)')
      }
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      if (curPhase === 'charge' || curPhase === 'converge') {
        // Energy beams arcing from Left & Right cards into center core
        const spread = curPhase === 'charge' ? Math.min(185, w * 0.27) : Math.max(24, 185 * (1 - elapsed * 2.1))
        const pulse = 0.55 + Math.sin(now * 0.024) * 0.35

        for (const side of [-1, 1]) {
          const sx = cx + side * spread
          const sy = cy
          ctx.save()
          ctx.strokeStyle = side < 0 ? '#00F0FF' : '#FFD700'
          ctx.globalAlpha = pulse
          ctx.lineWidth = curPhase === 'converge' ? 3.2 : 2.2
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          const midX = (sx + cx) / 2
          const waveY = sy + Math.sin(now * 0.03 + side * 2) * (curPhase === 'charge' ? 20 : 8)
          ctx.quadraticCurveTo(midX, waveY, cx, cy)
          ctx.stroke()
          ctx.restore()

          // Spawn inward energy sparks during charge/converge
          if (Math.random() < (curPhase === 'converge' ? 0.9 : 0.45)) {
            const angleToCenter = Math.atan2(cy - sy, cx - sx) + (Math.random() - 0.5) * 0.5
            const spd = 180 + Math.random() * 140
            particlesRef.current.push({
              x: sx + (Math.random() - 0.5) * 28,
              y: sy + (Math.random() - 0.5) * 36,
              vx: Math.cos(angleToCenter) * spd,
              vy: Math.sin(angleToCenter) * spd,
              radius: 2 + Math.random() * 2.2,
              alpha: 0.95,
              decay: 2.1,
              color: Math.random() > 0.4 ? '#FFD700' : rarityColor
            })
          }
        }

        // Spinning core reactor rings
        const ringR = curPhase === 'charge' ? 42 + Math.sin(now * 0.02) * 4 : Math.max(16, 46 - elapsed * 58)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(now * 0.006)
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 2.5
        ctx.setLineDash([12, 8])
        ctx.beginPath()
        ctx.arc(0, 0, ringR, 0, Math.PI * 2)
        ctx.stroke()

        ctx.rotate(-now * 0.013)
        ctx.strokeStyle = '#00F0FF'
        ctx.lineWidth = 1.8
        ctx.setLineDash([6, 10])
        ctx.beginPath()
        ctx.arc(0, 0, ringR * 0.68, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      if (curPhase === 'reveal') {
        if (!burstSpawnedRef.current) {
          burstSpawnedRef.current = true
          for (let i = 0; i < 48; i++) {
            const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.25
            const spd = 120 + Math.random() * 260
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              radius: 2.5 + Math.random() * 4.5,
              alpha: 1,
              decay: 0.75 + Math.random() * 0.85,
              color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#00F0FF' : rarityColor,
              isStar: i % 4 === 0
            })
          }
        }

        // Expanding shockwave rings on impact
        if (elapsed < 0.7) {
          const t = elapsed / 0.7
          const shockR = 24 + t * 235
          ctx.save()
          ctx.strokeStyle = '#FFD700'
          ctx.globalAlpha = Math.max(0, (1 - t) * 0.85)
          ctx.lineWidth = 4 * (1 - t) + 1
          ctx.beginPath()
          ctx.arc(cx, cy, shockR, 0, Math.PI * 2)
          ctx.stroke()

          if (elapsed < 0.52) {
            const t2 = elapsed / 0.52
            ctx.strokeStyle = rarityColor
            ctx.globalAlpha = Math.max(0, (1 - t2) * 0.75)
            ctx.lineWidth = 2.5
            ctx.beginPath()
            ctx.arc(cx, cy, 18 + t2 * 165, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.restore()
        }

        // Rotating radial light rays behind newly forged card
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(now * 0.0005)
        for (let r = 0; r < 10; r++) {
          ctx.rotate((Math.PI * 2) / 10)
          ctx.fillStyle = r % 2 === 0 ? 'rgba(255, 215, 0, 0.07)' : 'rgba(0, 240, 255, 0.05)'
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(-16, -240)
          ctx.lineTo(16, -240)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()

        // Gentle ambient golden shimmer around forged card
        if (Math.random() < 0.25) {
          const angle = Math.random() * Math.PI * 2
          const dist = 65 + Math.random() * 85
          particlesRef.current.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 14,
            vy: -22 - Math.random() * 24,
            radius: 2 + Math.random() * 2.5,
            alpha: 0.8,
            decay: 0.9,
            color: '#FFD700',
            isStar: true
          })
        }
      }

      // Update & draw particles
      const alive: Particle[] = []
      for (const p of particlesRef.current) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 0.96
        p.vy *= 0.96
        p.alpha -= p.decay * dt
        if (p.alpha <= 0) continue
        alive.push(p)

        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha))
        ctx.fillStyle = p.color
        if (p.isStar) {
          drawFourPointStar(ctx, p.x, p.y, p.radius * 1.9, p.radius * 0.55, now * 0.003)
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      particlesRef.current = alive

      rafId = window.requestAnimationFrame(renderFrame)
    }

    rafId = window.requestAnimationFrame(renderFrame)
    return () => window.cancelAnimationFrame(rafId)
  }, [payload, runCycle])

  const statsComparison = useMemo(() => {
    if (!payload) return null
    const { item, fromStars, toStars } = payload
    if (item.kind === 'weapon') {
      const before = getStarScaledWeaponStats(item, fromStars)
      const after = getStarScaledWeaponStats(item, toStars)
      return {
        kind: 'weapon' as const,
        beforeLine: `${before.damage} dmg · ${before.cooldown_s}s cd · ${formatDps(before.damage, before.cooldown_s)}`,
        afterLine: `${after.damage} dmg · ${after.cooldown_s}s cd · ${formatDps(after.damage, after.cooldown_s)}`
      }
    }
    return {
      kind: 'accessory' as const,
      beforeLine: formatAccessoryStatSummary(item, fromStars),
      afterLine: formatAccessoryStatSummary(item, toStars)
    }
  }, [payload])

  if (!payload || !statsComparison) return null

  const { item, fromStars, toStars, nextRepeatAction } = payload
  const rarityMeta = RARITY_META[item.rarity]
  const rarityBorder = RARITY_BORDER_CLASS[item.rarity]
  const rarityText = RARITY_TEXT_CLASS[item.rarity]
  const isWeapon = item.kind === 'weapon'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Fusing ${item.name} to ${toStars} stars`}
    >
      <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Background Canvas Stage */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center">
          {/* Top Title */}
          <div className="text-center mb-6">
            <p className="text-xs font-mono uppercase tracking-widest text-cyan-accent mb-1">
              {phase === 'charge'
                ? 'Channeling Gear Copies'
                : phase === 'converge'
                  ? 'Synthesizing Core'
                  : 'Star Upgrade Complete'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {phase === 'reveal'
                ? `${item.name} Reached ${toStars}★`
                : `Fusing 2× ${item.name}`}
            </h2>
          </div>

          {/* Central Animation Stage */}
          <div className="w-full min-h-[250px] flex items-center justify-center">
            {phase !== 'reveal' ? (
              <div className="w-full max-w-xl flex items-center justify-between gap-4 sm:gap-8 px-2">
                {/* Left Copy */}
                <div
                  key={`left-${runCycle}`}
                  className={`w-44 sm:w-52 bg-gray-800/95 border-2 ${rarityBorder} rounded-lg p-4 shadow-lg ${
                    phase === 'charge' ? 'animate-fuse-charge' : 'animate-fuse-converge-left'
                  }`}
                >
                  <p className={`text-[11px] font-mono uppercase ${rarityText} mb-1`}>
                    {rarityMeta.label} · Copy 1
                  </p>
                  <p className="text-sm font-bold text-white truncate mb-2">{item.name}</p>
                  <div className="flex items-center gap-1 text-hazard-gold">
                    {Array.from({ length: MAX_GEAR_STARS }).map((_, idx) => (
                      <span
                        key={idx}
                        className={idx < fromStars ? 'text-hazard-gold' : 'text-gray-600'}
                      >
                        {idx < fromStars ? '★' : '☆'}
                      </span>
                    ))}
                    <span className="ml-1 text-xs font-mono tabular-nums">{fromStars}★</span>
                  </div>
                </div>

                {/* Center Reactor Marker */}
                <div className="shrink-0 text-center">
                  <span className="text-lg font-mono font-bold text-hazard-gold">
                    {fromStars}★ → {toStars}★
                  </span>
                </div>

                {/* Right Copy */}
                <div
                  key={`right-${runCycle}`}
                  className={`w-44 sm:w-52 bg-gray-800/95 border-2 ${rarityBorder} rounded-lg p-4 shadow-lg ${
                    phase === 'charge' ? 'animate-fuse-charge' : 'animate-fuse-converge-right'
                  }`}
                >
                  <p className={`text-[11px] font-mono uppercase ${rarityText} mb-1`}>
                    {rarityMeta.label} · Copy 2
                  </p>
                  <p className="text-sm font-bold text-white truncate mb-2">{item.name}</p>
                  <div className="flex items-center gap-1 text-hazard-gold">
                    {Array.from({ length: MAX_GEAR_STARS }).map((_, idx) => (
                      <span
                        key={idx}
                        className={idx < fromStars ? 'text-hazard-gold' : 'text-gray-600'}
                      >
                        {idx < fromStars ? '★' : '☆'}
                      </span>
                    ))}
                    <span className="ml-1 text-xs font-mono tabular-nums">{fromStars}★</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Forged Result Card + Slamming New Star */
              <div
                key={`result-${runCycle}`}
                className={`w-full max-w-md bg-gray-800/95 border-2 ${rarityBorder} rounded-xl p-6 text-center shadow-2xl animate-fuse-result-reveal`}
              >
                <p className={`text-xs font-mono uppercase tracking-wider ${rarityText} mb-1`}>
                  {rarityMeta.label} · {isWeapon ? item.category : item.slotLabel}
                </p>
                <h3 className="text-2xl font-bold text-white mb-4">{item.name}</h3>

                {/* 5 Star Sockets — New Star Slams Into Index `fromStars` */}
                <div
                  className="flex items-center justify-center gap-2.5 mb-5"
                  aria-label={`${toStars} out of ${MAX_GEAR_STARS} stars`}
                >
                  {Array.from({ length: MAX_GEAR_STARS }).map((_, idx) => {
                    const isExistingStar = idx < fromStars
                    const isNewStar = idx === fromStars
                    const isLit = idx < toStars

                    return (
                      <div key={idx} className="relative flex items-center justify-center w-9 h-9">
                        {isNewStar && (
                          <span
                            className="absolute inset-0 rounded-full border-2 border-hazard-gold animate-fuse-star-halo pointer-events-none"
                            aria-hidden="true"
                          />
                        )}
                        <svg
                          viewBox="0 0 24 24"
                          className={`w-8 h-8 ${
                            isNewStar
                              ? 'text-hazard-gold animate-fuse-star-slam drop-shadow-[0_0_10px_rgba(255,215,0,0.85)]'
                              : isExistingStar
                                ? 'text-hazard-gold'
                                : 'text-gray-700'
                          }`}
                          fill={isLit ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="1.75"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                          />
                        </svg>
                      </div>
                    )
                  })}
                </div>

                {/* Before -> After Stat Upgrade */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-3.5 text-xs space-y-1.5 animate-fuse-fade-up">
                  <div className="flex items-center justify-between gap-2 text-gray-400 tabular-nums">
                    <span>Before ({fromStars}★)</span>
                    <span className="text-right">{statsComparison.beforeLine}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-emerald-400 font-semibold tabular-nums">
                    <span>Upgraded ({toStars}★)</span>
                    <span className="text-right">{statsComparison.afterLine}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-800">
            {phase !== 'reveal' ? (
              <>
                <span className="text-xs text-gray-400">Forging {toStars}★ equipment...</span>
                <Button variant="secondary" size="sm" onClick={skipToReveal}>
                  Skip Animation
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={startAnimation}>
                  Replay Animation
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  {nextRepeatAction && (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() =>
                        onFuseAnother(nextRepeatAction.itemId, nextRepeatAction.stars)
                      }
                    >
                      {nextRepeatAction.label}
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={onClose}>
                    Continue
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FusionAnimationOverlay
