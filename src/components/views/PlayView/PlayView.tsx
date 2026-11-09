import { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { heroes } from '../../../db/seedData';

export function PlayView() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameOver'>('menu');
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [currentWave, setCurrentWave] = useState(1);
  const [coins, setCoins] = useState(0);
  const [time, setTime] = useState(0);
  const [playerHP, setPlayerHP] = useState(100);
  
  // Get hero by ID
  const getHero = (id: string) => heroes.find(h => h.id === id);
  
  // Start game
  const startGame = (heroId: string) => {
    setSelectedHero(heroId);
    setGameState('playing');
    setPlayerHP(100);
    setCurrentWave(1);
    setCoins(0);
    setTime(0);
  };
  
  // End game
  const endGame = () => {
    setGameState('gameOver');
  };
  
  // Resume game
  const resumeGame = () => {
    setGameState('playing');
  };
  
  // Restart game
  const restartGame = () => {
    setGameState('menu');
    setSelectedHero(null);
  };
  
  // Calculate score using formula S = 10t + 25c
  const calculatedScore = 10 * time + 25 * coins;
  
  // Simulate time progression
  // In a real game, this would be tied to the game loop
  
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-slate-carbon text-white p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-cyan-accent">PLAY</h1>
          <p className="text-gray-400 mt-2">Select Your Hero and Begin the Battle</p>
        </header>
        
        <main className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <h2 className="text-2xl font-semibold text-hazard-gold mb-6">Select Your Hero</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {heroes.map(hero => (
                <div 
                  key={hero.id}
                  className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700"
                  onClick={() => startGame(hero.id)}
                >
                  <div className="text-cyan-accent text-3xl mb-2 text-center">🎮</div>
                  <h3 className="font-semibold text-white text-center">{hero.name}</h3>
                  <p className="text-sm text-gray-400 text-center">{hero.archetype}</p>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p>HP: {hero.hp}</p>
                    <p>Speed: {hero.speed}x</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          <Card className="bg-gray-900">
            <h2 className="text-xl font-semibold text-hazard-gold mb-4">Game Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-cyan-accent mb-2">✅ Wave System</h3>
                <p className="text-sm text-gray-300">30s active + 3s breather</p>
                <p className="text-sm text-gray-300">Boss every 5th wave</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-cyan-accent mb-2">✅ Scoring</h3>
                <p className="text-sm text-gray-300">Formula: S = 10t + 25c</p>
                <p className="text-sm text-gray-300">Time × 10 + Coins × 25</p>
              </div>
            </div>
          </Card>
        </main>
      </div>
    );
  }
  
  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-slate-carbon text-white p-6 flex items-center justify-center">
        <Card className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-alert-red mb-4">GAME OVER</h1>
          <p className="text-xl text-gray-300 mb-6">
            {selectedHero && `Hero ${getHero(selectedHero)?.name} has fallen in battle`}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-cyan-accent font-semibold">Wave Reached</p>
              <p className="text-3xl font-bold">{currentWave}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-hazard-gold font-semibold">Final Score</p>
              <p className="text-3xl font-bold">{calculatedScore}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-cyan-accent font-semibold">Time</p>
              <p className="text-3xl font-bold">{time}s</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-hazard-gold font-semibold">Coins</p>
              <p className="text-3xl font-bold">{coins}</p>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button variant="primary" onClick={restartGame}>
              Play Again
            </Button>
            <Button variant="secondary" onClick={() => setGameState('menu')}>
              Back to Menu
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-carbon text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cyan-accent">SWARM PROTOCOL: SURVIVOR</h1>
          <p className="text-sm text-gray-400">
            {selectedHero && `Hero: ${getHero(selectedHero)?.name || 'Unknown'}`}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800 rounded px-4 py-2">
            <span className="text-cyan-accent font-semibold">Wave: {currentWave}</span>
          </div>
          <div className="bg-gray-800 rounded px-4 py-2">
            <span className="text-hazard-gold font-semibold">Score: {calculatedScore}</span>
          </div>
          <div className="bg-gray-800 rounded px-4 py-2">
            <span className="text-alert-red font-semibold">HP: {playerHP}</span>
          </div>
          <Button variant="secondary" onClick={() => setGameState('paused')}>
            Pause
          </Button>
          <Button variant="secondary" onClick={() => setGameState('menu')}>
            Quit
          </Button>
        </div>
      </header>
      
      {/* Main Game Area */}
      <main className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* Game Canvas */}
          <div className="bg-gray-900 rounded-lg border-2 border-gray-700 relative overflow-hidden mb-4" style={{ height: '600px' }}>
            {/* Player */}
            <div 
              className="absolute bg-cyan-accent rounded-full flex items-center justify-center text-black font-bold z-10"
              style={{
                width: '40px',
                height: '40px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              P
            </div>
            
            {/* HUD */}
            <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 rounded px-4 py-2 z-20">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-white font-semibold">Time: {time}s</span>
                </div>
                <div>
                  <span className="text-hazard-gold font-semibold">Coins: {coins}</span>
                </div>
              </div>
              
              {/* Score Breakdown */}
              <div className="mt-2 text-xs text-gray-400">
                Score: 10 × {time} + 25 × {coins} = {calculatedScore}
              </div>
            </div>
            
            {/* Wave Info */}
            <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded px-4 py-2 z-20">
              <div className="text-center">
                <div className="text-cyan-accent font-bold text-xl">WAVE {currentWave}</div>
                <div className="text-gray-400 text-sm">Active</div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-4 mb-4">
            <Button variant="primary" onClick={() => setCoins(c => c + 10)}>
              Collect Coins (+10)
            </Button>
            <Button variant="warning" onClick={() => setTime(t => t + 30)}>
              Advance Time (+30s)
            </Button>
            <Button variant="danger" onClick={() => endGame()}>
              End Game
            </Button>
          </div>
          
          {/* Game Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-2">Score Breakdown</h3>
              <p className="text-gray-300">Time: {time}s × 10 = {10 * time} pts</p>
              <p className="text-gray-300">Coins: {coins} × 25 = {25 * coins} pts</p>
              <p className="text-hazard-gold font-bold mt-2">Total: {calculatedScore} pts</p>
            </Card>
            
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-2">Current Stats</h3>
              <p className="text-gray-300">Wave: {currentWave}</p>
              <p className="text-gray-300">HP: {playerHP}</p>
              <p className="text-gray-300">Time: {time}s</p>
              <p className="text-gray-300">Coins: {coins}</p>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Pause Menu */}
      {gameState === 'paused' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <Card className="max-w-md text-center">
            <h2 className="text-2xl font-bold text-cyan-accent mb-4">PAUSED</h2>
            <p className="text-gray-300 mb-6">Game is paused</p>
            <div className="flex justify-center space-x-4">
              <Button variant="primary" onClick={resumeGame}>
                Resume
              </Button>
              <Button variant="secondary" onClick={() => setGameState('menu')}>
                Quit
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
