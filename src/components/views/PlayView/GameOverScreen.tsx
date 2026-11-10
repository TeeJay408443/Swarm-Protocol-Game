/**
 * Game Over Screen
 * Phase 7: Build the Game - Game Over System
 */

import React from 'react'

interface GameOverStats {
  survivalSeconds: number
  coinsCollected: number
  enemiesDefeated: number
}

interface GameOverScreenProps {
  score: number
  stats: GameOverStats
  onRestart: () => void
  onQuit: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, stats, onRestart, onQuit }) => {
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

  // Calculate score using formula: S = 10t + 25c
  const calculatedScore = Math.floor(10 * stats.survivalSeconds + 25 * stats.coinsCollected)

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-50">
      <div className="bg-slate-800 border-2 border-red-500 rounded-xl p-8 max-w-lg w-full mx-4 text-center">
        {/* Header */}
        <h2 className="text-4xl font-bold text-red-400 mb-2">GAME OVER</h2>
        <p className="text-white/80 text-lg mb-8">Your run has ended</p>
        
        {/* Final Score */}
        <div className="mb-8">
          <div className="text-white/60 text-sm mb-1">FINAL SCORE</div>
          <div className="text-5xl font-bold text-cyan-400">{formatScore(score)}</div>
          <div className="text-white/80 text-xs mt-1">S = 10t + 25c = 10×{stats.survivalSeconds} + 25×{stats.coinsCollected} = {calculatedScore}</div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 bg-slate-700/50 rounded-lg p-4">
          <div className="text-center">
            <div className="text-white/60 text-xs">TIME</div>
            <div className="text-white font-bold">{formatTime(stats.survivalSeconds)}</div>
          </div>
          <div className="text-center">
            <div className="text-white/60 text-xs">COINS</div>
            <div className="text-yellow-400 font-bold">{stats.coinsCollected}</div>
          </div>
          <div className="text-center">
            <div className="text-white/60 text-xs">KILLS</div>
            <div className="text-red-400 font-bold">{stats.enemiesDefeated}</div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="space-y-4">
          <button
            onClick={onRestart}
            className="w-full px-6 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-lg rounded-lg transition-colors"
          >
            PLAY AGAIN
          </button>
          
          <button
            onClick={onQuit}
            className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-lg transition-colors"
          >
            MAIN MENU
          </button>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-white/60 text-sm">
          <p>Keep surviving to climb the leaderboards!</p>
        </div>
      </div>
    </div>
  )
}

export default GameOverScreen
