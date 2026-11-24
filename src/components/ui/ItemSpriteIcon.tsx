import { useEffect, useRef } from 'react'
import { drawCatalogItemSprite } from '../../game/weaponVisuals'

interface ItemSpriteIconProps {
  itemId: string
  size?: number
  glowColor?: string
  stars?: number
  className?: string
  altLabel?: string
}

/**
 * High-DPI Canvas sprite badge rendering the exact item/weapon silhouette inside a clean frame.
 */
export function ItemSpriteIcon({
  itemId,
  size = 64,
  glowColor,
  stars = 0,
  className = '',
  altLabel
}: ItemSpriteIconProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.scale(dpr, dpr)
    drawCatalogItemSprite(ctx, itemId, size, { glowColor, stars })
    ctx.restore()
  }, [itemId, size, glowColor, stars])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-label={altLabel || itemId}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`block shrink-0 ${className}`}
    />
  )
}

export default ItemSpriteIcon
