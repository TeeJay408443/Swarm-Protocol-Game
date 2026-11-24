import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { Select } from '../../ui/Select'
import { LeaderboardsEmptyState } from '../../ui/EmptyState'
import { ALL_HEROES as heroes } from '../../../config/unlockableHeroes'
import { useSupabase } from '../../../hooks/useSupabase'
import {
  getScores,
  calculateScoreFormula,
  type LocalRunRecord
} from '../../../services/scores'

type TimeRange = 'allTime' | 'daily' | 'weekly' | 'monthly'
type SortField = 'final_score' | 'wave_reached' | 'survival_seconds' | 'coins_collected'

export function LeaderboardsView() {
  const navigate = useNavigate()
  const { user } = useSupabase()

  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('allTime')
  const [heroFilter, setHeroFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortField>('final_score')
  const [searchQuery, setSearchQuery] = useState('')
  const [leaderboardData, setLeaderboardData] = useState<LocalRunRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const entriesPerPage = 10

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true)
    try {
      const results = await getScores({
        timeRange: activeTimeRange,
        heroId: heroFilter,
        search: searchQuery,
        sortBy,
        currentUserId: user?.id,
        limit: 100
      })
      setLeaderboardData(results)
      setCurrentPage(1)
    } finally {
      setIsLoading(false)
    }
  }, [activeTimeRange, heroFilter, searchQuery, sortBy, user?.id])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const getHeroName = (id: string) => heroes.find(h => h.id === id)?.name || id

  const totalPages = Math.max(1, Math.ceil(leaderboardData.length / entriesPerPage))
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = Math.min(startIndex + entriesPerPage, leaderboardData.length)
  const paginatedData = leaderboardData.slice(startIndex, endIndex)

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    const diff = Date.now() - date.getTime()
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)

    if (days === 0) {
      return hours === 0 ? 'Just now' : `${hours}h ago`
    }
    if (days === 1) return '1 day ago'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-cyan-accent">LEADERBOARDS</h1>
          <p className="text-gray-400 mt-2">
            Compete for the Highest Score — Formula: <span className="text-white font-mono">S = 10t + 25c</span>
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/play')}>
          ▶ Play New Run
        </Button>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Filters and Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-accent mb-2">
              Time Range
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'allTime' as TimeRange, label: 'All Time' },
                { id: 'daily' as TimeRange, label: 'Daily' },
                { id: 'weekly' as TimeRange, label: 'Weekly' },
                { id: 'monthly' as TimeRange, label: 'Monthly' }
              ].map(range => (
                <Button
                  key={range.id}
                  variant={activeTimeRange === range.id ? 'primary' : 'secondary'}
                  onClick={() => setActiveTimeRange(range.id)}
                  className="text-xs px-2.5 py-1"
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="bg-gray-900">
            <Select
              label="Filter by Hero"
              value={heroFilter}
              onChange={(e) => setHeroFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Heroes' },
                ...heroes.map(h => ({ value: h.id, label: h.name }))
              ]}
            />
          </Card>

          <Card className="bg-gray-900">
            <Select
              label="Sort Metric"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              options={[
                { value: 'final_score', label: 'Final Score' },
                { value: 'wave_reached', label: 'Wave Reached' },
                { value: 'survival_seconds', label: 'Survival Time' },
                { value: 'coins_collected', label: 'Coins Collected' }
              ]}
            />
          </Card>

          <Card className="bg-gray-900">
            <label className="block text-sm text-gray-400 mb-2">Search Operative</label>
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-accent"
              placeholder="Search callsign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Card>
        </div>

        {/* Leaderboard Table */}
        <Card className="bg-gray-900 mb-6 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs uppercase tracking-wider font-semibold text-gray-400 border-b border-gray-800">
              <div className="col-span-4">Operative</div>
              <div className="col-span-2">Hero</div>
              <div className="col-span-2 text-right">Score</div>
              <div className="col-span-1 text-right">Wave</div>
              <div className="col-span-1 text-right">Time</div>
              <div className="col-span-1 text-right">Coins</div>
              <div className="col-span-1 text-right">Date</div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 animate-pulse">⏳</div>
                <p className="text-gray-400">Loading leaderboard telemetry...</p>
              </div>
            ) : paginatedData.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {paginatedData.map((entry) => {
                  const verifiedScore = calculateScoreFormula(
                    entry.survival_seconds,
                    entry.coins_collected
                  )

                  return (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                        entry.isCurrentUser ? 'bg-cyan-accent/10 border-l-2 border-cyan-accent' : ''
                      }`}
                    >
                      <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-white truncate">
                          {entry.player_name}
                        </span>
                        {entry.isCurrentUser && (
                          <Badge variant="primary" size="sm">You</Badge>
                        )}
                      </div>

                      <div className="col-span-2 text-sm text-gray-300 truncate">
                        {getHeroName(entry.hero_used)}
                      </div>

                      <div className="col-span-2 text-right">
                        <p className="font-bold text-hazard-gold">
                          {entry.final_score.toLocaleString()}
                        </p>
                        {verifiedScore !== entry.final_score && (
                          <p className="text-[11px] text-gray-500">
                            Calc: {verifiedScore.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="col-span-1 text-right font-semibold text-cyan-accent">
                        {entry.wave_reached}
                      </div>

                      <div className="col-span-1 text-right text-sm text-gray-300">
                        {entry.survival_seconds}s
                      </div>

                      <div className="col-span-1 text-right text-sm text-hazard-gold">
                        {entry.coins_collected}
                      </div>

                      <div className="col-span-1 text-right text-xs text-gray-400">
                        {formatDate(entry.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <LeaderboardsEmptyState onPlayNow={() => navigate('/play')} />
            )}
          </div>
        </Card>

        {/* Pagination */}
        {leaderboardData.length > entriesPerPage && (
          <Card className="bg-gray-900 mb-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}–{endIndex} of {leaderboardData.length} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gray-800 rounded text-sm text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Score Formula Explanation */}
        <Card className="bg-gray-900">
          <h3 className="text-lg font-semibold text-cyan-accent mb-4">Scoring Formula</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-white mb-2 font-mono">S = 10t + 25c</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <span className="text-cyan-accent font-mono">t</span> = Survival duration in whole seconds (×10 pts/sec)
                </li>
                <li>
                  <span className="text-hazard-gold font-mono">c</span> = Swarm Coins collected (×25 pts/coin)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Verification Example</h4>
              <p className="text-gray-400 text-sm mb-2">
                Survive 600 seconds and collect 400 coins:
              </p>
              <p className="text-white text-sm font-mono">
                S = 10 × 600 + 25 × 400 ={' '}
                <span className="text-hazard-gold font-bold">
                  {calculateScoreFormula(600, 400).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}

export default LeaderboardsView
