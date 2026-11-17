import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { heroes } from '../../../db/seedData'
import { useSupabase } from '../../../hooks/useSupabase'
import {
  getTopScores,
  getPlayerTelemetry,
  getOperativeProfile,
  type LocalRunRecord,
  type LocalPlayerTelemetry
} from '../../../services/scores'

export function HQView() {
  const { user } = useSupabase()
  const [topScores, setTopScores] = useState<LocalRunRecord[]>([])
  const [telemetry, setTelemetry] = useState<LocalPlayerTelemetry | null>(null)
  const [operativeName, setOperativeName] = useState('Guest Operative')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadBriefing = async () => {
      try {
        setLoading(true)
        const profile = getOperativeProfile()
        const displayName = user?.email ? user.email.split('@')[0] : profile.username
        const [scoresData, telemetryData] = await Promise.all([
          getTopScores(3, user?.id),
          getPlayerTelemetry(user?.id)
        ])

        if (!active) return
        setOperativeName(displayName)
        setTopScores(scoresData)
        setTelemetry(telemetryData)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBriefing()
    return () => {
      active = false
    }
  }, [user?.id, user?.email])

  const getHeroName = (heroId: string) =>
    heroes.find((h) => h.id === heroId)?.name || 'Vanguard Blade'

  const lastRun = telemetry?.recent_runs?.[0]

  const quickStats = [
    { label: 'Total Runs', value: telemetry?.total_games ?? 0 },
    { label: 'Best Wave', value: telemetry?.highest_wave ?? 0 },
    { label: 'Total Kills', value: telemetry?.total_enemies_defeated ?? 0 },
    { label: 'Total Coins', value: telemetry?.total_coins_collected ?? 0 }
  ]

  const recentBriefings = [
    'Wave 5 Protocol Active: Aegis Commander Drone deploys every 5th wave.',
    'Arsenal Online: 6 Heroes, 20 Upgrades (Lv 1–5 Overdrive), and live DPS calculations ready in Armory.',
    'Scoring Telemetry Verified: S = 10t + 25c syncs directly to Mission Leaderboards.'
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <Card className="text-center py-10">
          <Badge variant="primary" size="sm" className="mb-4">
            SECTOR BRIEFING // LIVE TELEMETRY
          </Badge>
          <h1 className="text-4xl font-bold text-cyan-accent mb-3">
            MISSION BRIEFING
          </h1>
          <p className="text-gray-200 text-lg mb-2">
            Welcome back, <span className="text-cyan-accent font-semibold">{operativeName}</span>!
          </p>
          <p className="text-gray-400 mb-8">
            {lastRun
              ? `Your last run: ${getHeroName(lastRun.hero_used)} • Wave ${lastRun.wave_reached} • Score ${lastRun.final_score.toLocaleString()}`
              : 'No deployments logged yet. Select an operative in the Armory or launch straight into combat.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/play">
              <Button variant="primary" size="lg">
                ▶ LAUNCH MISSION
              </Button>
            </Link>
            <Link to="/armory">
              <Button variant="secondary" size="lg">
                ⚔️ CONFIGURE LOADOUT
              </Button>
            </Link>
          </div>
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
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-400">Syncing leaderboard records...</div>
          ) : topScores.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              No mission scores recorded yet. Launch a run to log your first score!
            </div>
          ) : (
            <div className="space-y-3">
              {topScores.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 bg-gray-900 rounded border ${
                    entry.isCurrentUser ? 'border-cyan-accent/60' : 'border-gray-800'
                  }`}
                >
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      <span>{entry.player_name}</span>
                      {entry.isCurrentUser && (
                        <Badge variant="primary" size="sm">You</Badge>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {getHeroName(entry.hero_used)} • {entry.survival_seconds}s survived
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-accent font-bold">
                      {entry.final_score.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Wave {entry.wave_reached}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Stats */}
        <Card>
          <h2 className="text-xl font-semibold text-hazard-gold mb-4">
            📊 QUICK STATS
          </h2>
          <div className="space-y-4">
            {quickStats.map((stat) => (
              <div key={stat.label} className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-400">{stat.label}</span>
                <span className="text-white font-semibold">{stat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Link to="/profile" className="text-cyan-accent text-sm hover:underline">
              View Operative Profile →
            </Link>
            <Link to="/codex" className="text-gray-300 text-sm hover:text-cyan-accent">
              Codex (34)
            </Link>
          </div>
        </Card>
      </div>

      {/* Tactical Comms */}
      <div className="mt-8">
        <Card>
          <h2 className="text-xl font-semibold text-hazard-gold mb-4">
            📡 TACTICAL COMMS
          </h2>
          <ul className="space-y-3">
            {recentBriefings.map((item) => (
              <li key={item} className="text-gray-300 flex items-start gap-2">
                <span className="text-cyan-accent">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default HQView
