import { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { heroes } from '../../../db/seedData';

// Mock leaderboard entry
interface LeaderboardEntry {
  id: string;
  rank: number;
  playerName: string;
  heroId: string;
  score: number;
  wave: number;
  time: number;
  coins: number;
  date: Date;
  isCurrentUser?: boolean;
}

// Mock leaderboard data
const mockLeaderboardData: LeaderboardEntry[] = [
  { id: '1', rank: 1, playerName: 'TeeJay408443', heroId: 'hero_001', score: 15840, wave: 25, time: 1200, coins: 584, date: new Date(), isCurrentUser: true },
  { id: '2', rank: 2, playerName: 'CommanderX', heroId: 'hero_002', score: 14230, wave: 23, time: 1100, coins: 520, date: new Date(Date.now() - 86400000) },
  { id: '3', rank: 3, playerName: 'SwarmQueen', heroId: 'hero_003', score: 12890, wave: 21, time: 950, coins: 480, date: new Date(Date.now() - 172800000) },
  { id: '4', rank: 4, playerName: 'TacticalPro', heroId: 'hero_004', score: 11560, wave: 19, time: 850, coins: 430, date: new Date(Date.now() - 259200000) },
  { id: '5', rank: 5, playerName: 'SurvivalKing', heroId: 'hero_005', score: 10240, wave: 17, time: 750, coins: 380, date: new Date(Date.now() - 345600000) },
  { id: '6', rank: 6, playerName: 'WaveMaster', heroId: 'hero_006', score: 9120, wave: 15, time: 650, coins: 340, date: new Date(Date.now() - 432000000) },
];

type TimeRange = 'allTime' | 'daily' | 'weekly' | 'monthly';

export function LeaderboardsView() {
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('allTime');
  const [searchQuery, setSearchQuery] = useState('');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  
  // Simulate data loading
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      let filteredData = [...mockLeaderboardData];
      
      // Filter by time range
      if (activeTimeRange === 'daily') {
        const oneDayAgo = new Date(Date.now() - 86400000);
        filteredData = filteredData.filter(entry => entry.date >= oneDayAgo);
      } else if (activeTimeRange === 'weekly') {
        const oneWeekAgo = new Date(Date.now() - 604800000);
        filteredData = filteredData.filter(entry => entry.date >= oneWeekAgo);
      } else if (activeTimeRange === 'monthly') {
        const oneMonthAgo = new Date(Date.now() - 2592000000);
        filteredData = filteredData.filter(entry => entry.date >= oneMonthAgo);
      }
      
      // Filter by search
      if (searchQuery) {
        filteredData = filteredData.filter(entry => 
          entry.playerName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Sort by score (descending) and update ranks
      filteredData.sort((a, b) => b.score - a.score);
      filteredData = filteredData.map((entry, index) => ({ ...entry, rank: index + 1 }));
      
      setLeaderboardData(filteredData);
      setCurrentPage(1);
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [activeTimeRange, searchQuery]);
  
  // Get hero by ID
  const getHero = (id: string) => heroes.find(h => h.id === id);
  
  // Pagination
  const totalPages = Math.ceil(leaderboardData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, leaderboardData.length);
  const paginatedData = leaderboardData.slice(startIndex, endIndex);
  
  // Calculate score using formula S = 10t + 25c
  const calculateScore = (time: number, coins: number) => 10 * time + 25 * coins;
  
  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    
    if (days === 0) {
      if (hours === 0) {
        return 'Just now';
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return '1 day ago';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">LEADERBOARDS</h1>
        <p className="text-gray-400 mt-2">Compete for the Highest Score - S = 10t + 25c</p>
      </header>
      
      <main className="max-w-7xl mx-auto">
        {/* Filters and Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gray-900">
            <h3 className="text-sm font-semibold text-cyan-accent mb-2">Time Range</h3>
            <div className="flex space-x-2">
              {[
                { id: 'allTime' as TimeRange, label: 'All Time' },
                { id: 'daily' as TimeRange, label: 'Daily' },
                { id: 'weekly' as TimeRange, label: 'Weekly' },
                { id: 'monthly' as TimeRange, label: 'Monthly' },
              ].map(range => (
                <Button
                  key={range.id}
                  variant={activeTimeRange === range.id ? 'primary' : 'secondary'}
                  onClick={() => setActiveTimeRange(range.id)}
                  className="text-xs px-3 py-1"
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </Card>
          
          <Card className="bg-gray-900">
            <h3 className="text-sm font-semibold text-cyan-accent mb-2">Search Player</h3>
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-cyan-accent"
              placeholder="Search player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Card>
        </div>
        
        {/* Leaderboard Header */}
        <Card className="bg-gray-900 mb-4">
          <div className="grid grid-cols-8 gap-4 px-4 py-3 text-sm font-semibold text-gray-400 border-b border-gray-700">
            <div className="col-span-1">Rank</div>
            <div className="col-span-2">Player</div>
            <div className="col-span-1">Hero</div>
            <div className="col-span-1 text-right">Score</div>
            <div className="col-span-1 text-right">Wave</div>
            <div className="col-span-1 text-right">Time</div>
            <div className="col-span-1">Date</div>
          </div>
        </Card>
        
        {/* Leaderboard Entries */}
        {isLoading ? (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-400">Loading leaderboard...</p>
          </Card>
        ) : paginatedData.length > 0 ? (
          <div className="space-y-2 mb-6">
            {paginatedData.map((entry) => (
              <Card 
                key={entry.id} 
                className={`bg-gray-900 px-4 py-3 ${entry.isCurrentUser ? 'border border-cyan-accent' : ''}`}
              >
                <div className="grid grid-cols-8 gap-4 items-center">
                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    {entry.rank === 1 ? (
                      <span className="text-2xl text-hazard-gold">🥇</span>
                    ) : entry.rank === 2 ? (
                      <span className="text-2xl">🥈</span>
                    ) : entry.rank === 3 ? (
                      <span className="text-2xl">🥉</span>
                    ) : (
                      <span className="text-gray-400">#{entry.rank}</span>
                    )}
                  </div>
                  
                  {/* Player */}
                  <div className="col-span-2">
                    <p className="font-semibold text-white">{entry.playerName}</p>
                    {entry.isCurrentUser && (
                      <p className="text-xs text-cyan-accent">You</p>
                    )}
                  </div>
                  
                  {/* Hero */}
                  <div className="col-span-1">
                    <p className="text-sm text-gray-400">
                      {getHero(entry.heroId)?.name.split(' ')[0] || '?'}
                    </p>
                  </div>
                  
                  {/* Score */}
                  <div className="col-span-1 text-right">
                    <p className="font-semibold text-hazard-gold">{entry.score.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{calculateScore(entry.time, entry.coins)}</p>
                  </div>
                  
                  {/* Wave */}
                  <div className="col-span-1 text-right">
                    <p className="font-semibold text-cyan-accent">{entry.wave}</p>
                  </div>
                  
                  {/* Time */}
                  <div className="col-span-1 text-right">
                    <p className="text-sm text-gray-400">{entry.time}s</p>
                  </div>
                  
                  {/* Date */}
                  <div className="col-span-1">
                    <p className="text-xs text-gray-400">{formatDate(entry.date)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-gray-400">Try adjusting your filters or search criteria</p>
          </Card>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="bg-gray-900">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{endIndex} of {leaderboardData.length} entries
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gray-800 rounded text-white">
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
        <Card className="bg-gray-900 mt-8">
          <h3 className="text-lg font-semibold text-cyan-accent mb-4">Scoring Formula</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-white mb-2">Formula: S = 10t + 25c</h4>
              <p className="text-gray-400 mb-4">
                Where:
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><span className="text-cyan-accent">S</span> = Total Score</li>
                <li><span className="text-cyan-accent">t</span> = Time survived in seconds</li>
                <li><span className="text-hazard-gold">c</span> = Coins collected</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Example Calculation</h4>
              <p className="text-gray-400 mb-2">
                If you survive for 600 seconds and collect 400 coins:
              </p>
              <p className="text-white">
                S = 10 × 600 + 25 × 400 = 6,000 + 10,000 = <span className="text-hazard-gold font-bold">16,000</span>
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
