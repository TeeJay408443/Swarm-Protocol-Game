import { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { heroes, achievements } from '../../../db/seedData';

// Mock user data
const mockUser = {
  username: 'TeeJay408443',
  email: 'tee.jay@example.com',
  joinDate: new Date('2024-01-15'),
  totalGames: 47,
  totalScore: 158400,
  highestWave: 25,
  highestScore: 15840,
  totalCoins: 5840,
  totalXP: 4700,
  level: 10,
  favoriteHero: 'hero_001',
  achievements: ['achievement_001', 'achievement_002', 'achievement_003'],
};

type ActiveTab = 'overview' | 'stats' | 'achievements' | 'settings';

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ username: mockUser.username, email: mockUser.email });
  
  // Calculate XP progress to next level
  const xpForNextLevel = mockUser.level * 100;
  const xpProgress = (mockUser.totalXP % xpForNextLevel) / xpForNextLevel * 100;
  
  // Get hero by ID
  const getHero = (id: string) => heroes.find(h => h.id === id);
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Save profile changes
  const saveProfile = () => {
    setIsEditing(false);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({ username: mockUser.username, email: mockUser.email });
  };
  
  // Start editing
  const startEditing = () => {
    setEditData({
      username: mockUser.username,
      email: mockUser.email,
    });
    setIsEditing(true);
  };
  
  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">PROFILE</h1>
        <p className="text-gray-400 mt-2">Your Swarm Protocol Journey</p>
      </header>
      
      <main className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="bg-gray-900 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-accent to-hazard-gold rounded-full flex items-center justify-center text-4xl border-4 border-gray-700">
              🎮
            </div>
            
            {/* Profile Info */}
            <div className="flex-grow">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-accent"
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                  />
                  <input
                    type="email"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-accent"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  />
                  <div className="flex space-x-2">
                    <Button variant="primary" onClick={saveProfile} className="text-sm">
                      Save
                    </Button>
                    <Button variant="secondary" onClick={cancelEditing} className="text-sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-white">{mockUser.username}</h2>
                  <p className="text-gray-400">{mockUser.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-cyan-accent">⭐</span>
                    <span className="text-white">Level {mockUser.level}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Joined {formatDate(mockUser.joinDate)}
                  </p>
                </div>
              )}
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-hazard-gold">{mockUser.totalGames}</p>
                <p className="text-sm text-gray-400">Games Played</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-accent">{mockUser.highestWave}</p>
                <p className="text-sm text-gray-400">Highest Wave</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{mockUser.highestScore.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Highest Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-hazard-gold">{mockUser.totalCoins.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Total Coins</p>
              </div>
            </div>
            
            {/* Edit Button */}
            {!isEditing && (
              <Button variant="secondary" onClick={startEditing} className="text-sm">
                Edit Profile
              </Button>
            )}
          </div>
        </Card>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview' as ActiveTab, label: 'Overview', icon: '📊' },
            { id: 'stats' as ActiveTab, label: 'Statistics', icon: '📈' },
            { id: 'achievements' as ActiveTab, label: 'Achievements', icon: '🏆' },
            { id: 'settings' as ActiveTab, label: 'Settings', icon: '⚙️' },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center space-x-2"
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { type: 'game', action: 'Completed', wave: 25, score: 15840, date: '2 hours ago' },
                  { type: 'achievement', action: 'Unlocked', name: 'Wave Master', date: '1 day ago' },
                  { type: 'game', action: 'Completed', wave: 23, score: 14230, date: '3 days ago' },
                  { type: 'achievement', action: 'Unlocked', name: 'Survival Expert', date: '1 week ago' },
                  { type: 'game', action: 'Completed', wave: 21, score: 12890, date: '2 weeks ago' },
                ].map((activity: any, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm">
                      {activity.type === 'game' ? '🎮' : '🏆'}
                    </div>
                    <div className="flex-grow">
                      <p className="text-white">
                        <span className="text-cyan-accent">{activity.action}</span> 
                        {activity.type === 'game' ? (
                          <span>wave {activity.wave} with score {activity.score?.toLocaleString()}</span>
                        ) : (
                          <span>{activity.name}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            {/* Favorite Hero */}
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Favorite Hero</h3>
              {mockUser.favoriteHero && (
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-3xl border-2 border-cyan-accent">
                    🎮
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white">{getHero(mockUser.favoriteHero)?.name}</h4>
                    <p className="text-gray-400">{getHero(mockUser.favoriteHero)?.archetype}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="bg-gray-800 rounded p-2 text-center">
                        <p className="text-xs text-gray-400">HP</p>
                        <p className="text-white font-semibold">{getHero(mockUser.favoriteHero)?.hp}</p>
                      </div>
                      <div className="bg-gray-800 rounded p-2 text-center">
                        <p className="text-xs text-gray-400">Speed</p>
                        <p className="text-white font-semibold">{getHero(mockUser.favoriteHero)?.speed}x</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
            
            {/* Time Played */}
            <Card className="bg-gray-900 lg:col-span-2">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{mockUser.totalGames}</p>
                  <p className="text-sm text-gray-400">Games Played</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-accent">{mockUser.highestWave}</p>
                  <p className="text-sm text-gray-400">Highest Wave</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{mockUser.highestScore.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Highest Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-hazard-gold">{mockUser.totalCoins.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Total Coins</p>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Game Statistics */}
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Game Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Games', value: mockUser.totalGames, color: 'white' },
                  { label: 'Highest Wave', value: mockUser.highestWave, color: 'cyan-accent' },
                  { label: 'Total Score', value: mockUser.totalScore.toLocaleString(), color: 'hazard-gold' },
                  { label: 'Highest Score', value: mockUser.highestScore.toLocaleString(), color: 'white' },
                  { label: 'Total Coins', value: mockUser.totalCoins.toLocaleString(), color: 'hazard-gold' },
                  { label: 'Total XP', value: mockUser.totalXP.toLocaleString(), color: 'cyan-accent' },
                  { label: 'Current Level', value: mockUser.level, color: 'white' },
                ].map((stat, index) => (
                  <div key={index} className="bg-gray-800 rounded p-3 text-center">
                    <p className="text-sm text-gray-400">{stat.label}</p>
                    <p className={`font-semibold text-${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </Card>
            
            {/* XP Progress */}
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">XP Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">Level {mockUser.level}</span>
                    <span className="text-sm text-gray-400">Level {mockUser.level + 1}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div 
                      className="bg-cyan-accent h-4 rounded-full transition-all duration-300"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>{mockUser.totalXP - (mockUser.totalXP % xpForNextLevel)} XP</span>
                    <span>{mockUser.totalXP % xpForNextLevel} / {xpForNextLevel} XP</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-accent">{xpProgress.toFixed(0)}%</p>
                  <p className="text-sm text-gray-400">to next level</p>
                </div>
              </div>
            </Card>
            
            {/* Hero Statistics */}
            <Card className="bg-gray-900 lg:col-span-2">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Hero Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {heroes.map(hero => {
                  // Mock data for each hero
                  const gamesPlayed = Math.floor(Math.random() * 20) + 5;
                  const highestWave = Math.floor(Math.random() * 15) + 10;
                  const totalScore = (Math.floor(Math.random() * 10000) + 5000) * gamesPlayed;
                  
                  return (
                    <div key={hero.id} className="bg-gray-800 rounded p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-2xl">🎮</span>
                        <div>
                          <h4 className="font-semibold text-white">{hero.name}</h4>
                          <p className="text-xs text-gray-400">{hero.archetype}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-center">
                          <p className="text-gray-400">Games</p>
                          <p className="text-white font-semibold">{gamesPlayed}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Wave</p>
                          <p className="text-cyan-accent font-semibold">{highestWave}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Score</p>
                          <p className="text-hazard-gold font-semibold">{totalScore.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
        
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Achievements List */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-900">
                <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                  Achievements ({achievements.length} Total)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map(achievement => {
                    const isCompleted = mockUser.achievements.includes(achievement.id);
                    
                    return (
                      <div
                        key={achievement.id}
                        className={`rounded p-4 ${isCompleted ? 'bg-gray-800 border border-cyan-accent' : 'bg-gray-800 opacity-70'}`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-3xl">🏆</span>
                          <div className="flex-grow">
                            <h4 className="font-semibold text-white">{achievement.title}</h4>
                            <p className="text-sm text-gray-400">{achievement.requirement}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {achievement.reward_badge}
                            </p>
                            {isCompleted && (
                              <p className="text-xs text-cyan-accent mt-1">Completed</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
            
            {/* Achievements Stats */}
            <div>
              <Card className="bg-gray-900">
                <h3 className="text-lg font-semibold text-cyan-accent mb-4">Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Completed</span>
                      <span className="text-sm text-white">{mockUser.achievements.length}/{achievements.length}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-hazard-gold h-4 rounded-full"
                        style={{ width: `${(mockUser.achievements.length / achievements.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Settings */}
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Username</label>
                  <p className="text-white">{mockUser.username}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <p className="text-white">{mockUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Member Since</label>
                  <p className="text-white">{formatDate(mockUser.joinDate)}</p>
                </div>
                <div className="pt-4">
                  <Button variant="secondary" onClick={startEditing} className="w-full">
                    Edit Profile
                  </Button>
                </div>
              </div>
            </Card>
            
            {/* Game Preferences */}
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Game Preferences</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white">Audio Effects</span>
                  <Button variant="primary" className="text-sm">ON</Button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">Music</span>
                  <Button variant="primary" className="text-sm">ON</Button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">Notifications</span>
                  <Button variant="primary" className="text-sm">ON</Button>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Targeting Mode</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-accent"
                    defaultValue="closest"
                  >
                    <option value="closest">Closest</option>
                    <option value="weakest">Weakest</option>
                    <option value="strongest">Strongest</option>
                    <option value="mostDangerous">Most Dangerous</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-accent"
                    defaultValue="normal"
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="pt-4">
                  <Button variant="primary" onClick={() => alert('Preferences saved!')} className="w-full">
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
