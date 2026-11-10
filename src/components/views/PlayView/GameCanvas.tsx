/**
 * Game Canvas
 * Phase 7: Build the Game - Canvas Component
 */

import React, { forwardRef } from 'react'

interface GameCanvasProps {
  className?: string
  style?: React.CSSProperties
}

const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ className = '', style = {} }, ref) => {
    return (
      <canvas
        ref={ref}
        className={`absolute top-0 left-0 ${className}`}
        style={{
          background: 'transparent',
          display: 'block',
          ...style
        }}
      />
    )
  }
)

GameCanvas.displayName = 'GameCanvas'

export default GameCanvas
