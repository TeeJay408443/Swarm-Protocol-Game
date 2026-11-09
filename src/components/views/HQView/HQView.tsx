import { Link } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'

export function HQView() {
  // Mock data for top scores
  const topScores = [
    { rank: 1, player: 'Player1', score: 15450, wave: 12, hero: 'Vanguard Blade' },
    { rank: 2, player: 'Player2', score: 12300, wave: 10, hero: 'Outpost Ranger' },
    { rank: 3, player: 'Player3', score: 9800, wave: 8, hero: 'Tech Engineer' },
  ]
  
  // Mock data for quick stats
  const quickStats = [
    { label: 'Total Runs', value: 23 },
    { label: 'Best Wave', value: 12 },
    { label: 'Total Kills', value: 456 },
    { label: 'Total Coins', value: 2340 },
  ]
  
  // Mock data for recent news
  const recentNews = [
    'New hero added: Chrono Operative',
    'Balance update: Enemy HP adjusted',
    'Bug fixes: Wave transition improved',
  ]
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <Card className="text-center py-12">
          <h1 className="text-4xl font-bold text-cyan-accent mb-4">
            MISSION BRIEFING
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            Welcome back, Operative!
          </p>
          <p className="text-gray-400 mb-8">
            Your last run: Wave 5, Score: 3,100
          </p>
          <Link to="/play">
            <Button variant="primary" size="lg">
              ▶ LAUNCH MISSION
            </Button>
          </Link>
        </Card>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Scores */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-hazard-gold">
              🏆 TOP SCORES
            </h2>
            <Link to="/leaderboards" className="text-cyan-accent text-sm hover:underline">
              View All
            </Link>
          </div>
          
          <div className="space-y-3">
            {topScores.map((score, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-900 rounded"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-hazard-gold font-bold text-xl">
                    {score.rank}
                  </span>
                  <div>
                    <div className="text-white font-semibold">{score.player}</div>
                    <div className="text-gray-400 text-sm">{score.hero}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-cyan-accent font-bold">{score.score.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">Wave {score.wave}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Quick Stats */}
        <Card>
          <h2 className="text-xl font-semibold text-hazard-gold mb-4">
            📊 QUICK STATS
          </h2>
          <div className="space-y-4">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-400">{stat.label}</span>
                <span className="text-white font-semibold">{stat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/profile" className="text-cyan-accent text-sm hover:underline">
              View All Stats →
            </Link>
          </div>
        </Card>
      </div>
      
      {/* Recent News */}
      <div className="mt-8">
        <Card>
          <h2 className="text-xl font-semibold text-hazard-gold mb-4">
            🎮 RECENT NEWS
          </h2>
          <ul className="space-y-3">
            {recentNews.map((news, index) => (
              <li key={index} className="text-gray-300">
                • {news}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default HQView
