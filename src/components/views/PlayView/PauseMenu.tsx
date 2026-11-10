/**
 * Pause Menu
 * Phase 7: Build the Game - Pause System
 */

import React from 'react'

interface PauseMenuProps {
  onResume: () => void
  onRestart: () => void
  onQuit: () => void
}

const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRestart, onQuit }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50">
      <div className="bg-slate-800 border-2 border-cyan-500 rounded-xl p-8 max-w-md w-full mx-4 text-center">
        {/* Header */}
        <h2 className="text-3xl font-bold text-cyan-400 mb-8">PAUSED</h2>
        
        {/* Buttons */}
        <div className="space-y-4">
          <button
            onClick={onResume}
            className="w-full px-6 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-lg rounded-lg transition-colors"
          >
            RESUME
          </button>
          
          <button
            onClick={onRestart}
            className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-lg transition-colors"
          >
            RESTART
          </button>
          
          <button
            onClick={onQuit}
            className="w-full px-6 py-4 bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold text-lg rounded-lg transition-colors"
          >
            QUIT TO MENU
          </button>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-white/60 text-sm">
          <p>Game is paused</p>
        </div>
      </div>
    </div>
  )
}

export default PauseMenu
