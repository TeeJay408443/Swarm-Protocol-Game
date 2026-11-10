/**
 * HUD Component
 * Phase 7: Build the Game - Heads-Up Display
 */

import React from 'react'

interface HUDProps {
  score: number
  coins: number
  xp: number
  level: number
  health: number
  maxHealth: number
  wave: number
  time: number
  enemiesDefeated: number
  onPause: () => void
}

const HUD: React.FC<HUDProps> = ({
  score,
  coins,
  xp,
  level,
  health,
  maxHealth,
  wave,
  time,
  enemiesDefeated,
  onPause
}) => {
  // Calculate XP progress
  const xpForNextLevel = 100
  const xpProgress = (xp % xpForNextLevel) / xpForNextLevel * 100
  
  // Calculate health percentage
  const healthPercent = (health / maxHealth) * 100

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Format score with commas
  const formatScore = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 backdrop-blur-sm">
        {/* Left Side - Score, Coins, Time */}
        <div className="flex items-center space-x-6">
          {/* Score */}
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 font-bold text-xl">SCORE</span>
            <span className="text-white font-bold text-xl">{formatScore(score)}</span>
          </div>
          
          {/* Coins */}
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400 font-bold text-xl">💰</span>
            <span className="text-white font-bold text-xl">{coins}</span>
          </div>
          
          {/* Time */}
          <div className="flex items-center space-x-2">
            <span className="text-white/80 font-mono text-xl">{formatTime(time)}</span>
          </div>
        </div>
        
        {/* Right Side - Pause Button */}
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPause()
            }}
            className="pointer-events-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
          >
            PAUSE
          </button>
        </div>
      </div>
      
      {/* Health Bar */}
      <div className="px-4 py-2">
        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-200"
            style={{ width: `${healthPercent}%` }}
          />
          <div
            className="absolute inset-0 h-full bg-gradient-to-r from-red-500 to-red-400 opacity-70"
            style={{ width: `${healthPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-white/80">
          <span>HP: {health}/{maxHealth}</span>
        </div>
      </div>
      
      {/* XP Bar */}
      <div className="px-4 py-2">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400 font-bold text-sm">LEVEL {level}</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-white/80">
          <span>XP: {xp}/{xpForNextLevel * level}</span>
        </div>
      </div>
      
      {/* Wave Info */}
      <div className="absolute top-20 right-4 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg">
        <div className="text-center">
          <div className="text-white/80 text-xs">WAVE</div>
          <div className="text-cyan-400 font-bold text-2xl">{wave}</div>
        </div>
      </div>
      
      {/* Stats Panel (Bottom Left) */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg">
        <div className="text-white/80 text-sm">
          <div>Enemies: {enemiesDefeated}</div>
        </div>
      </div>
      
      {/* Score Formula Display */}
      <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur-sm px-3 py-1 rounded-lg">
        <span className="text-xs text-cyan-400">S = 10t + 25c</span>
      </div>
    </div>
  )
}

export default HUD
