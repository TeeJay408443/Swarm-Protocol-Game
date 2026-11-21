import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import ValidatedInput from '../../ui/ValidatedInput'
import { useToast } from '../../ui/ToastContainer'
import { ValidationPresets } from '../../../hooks/useValidation'
import { useSupabase } from '../../../hooks/useSupabase'
import { useAudio } from '../../../context/AudioContext'
import { heroes } from '../../../db/seedData'
import { GAME_CONFIG } from '../../../config/gameConstants'
import {
  getPlayerTelemetry,
  evaluateAchievements,
  getOperativeProfile,
  saveOperativeProfile,
  type LocalPlayerTelemetry,
  type OperativeProfile
} from '../../../services/scores'
import { updateLocalAccountUsername } from '../../../services/auth'
import { formatMasteryBonusSummary, useHeroMastery } from '../../../services/heroMastery'

type ActiveTab = 'overview' | 'stats' | 'achievements' | 'settings'

export function ProfileView() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useSupabase()
  const {
    settings: audioSettings,
    setSfxVolume,
    setMusicVolume,
    toggleMute
  } = useAudio()

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [telemetry, setTelemetry] = useState<LocalPlayerTelemetry | null>(null)
  const { getProgress: getMasteryProgress } = useHeroMastery(user?.id)
  const [profile, setProfile] = useState<OperativeProfile>(() => getOperativeProfile(user?.id))
  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [targetingMode, setTargetingMode] = useState<OperativeProfile['targetingMode']>(
    () => getOperativeProfile(user?.id).targetingMode
  )
  const [difficulty, setDifficulty] = useState<OperativeProfile['difficulty']>(
    () => getOperativeProfile(user?.id).difficulty
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const data = await getPlayerTelemetry(user?.id)
        if (!active) return
        setTelemetry(data)
        const storedProfile = getOperativeProfile(user?.id)
        setProfile(storedProfile)
        setTargetingMode(storedProfile.targetingMode)
        setDifficulty(storedProfile.difficulty)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [user?.id])

  const getHero = (id: string) => heroes.find(h => h.id === id) || heroes[0]

  const achievementProgress = telemetry
    ? evaluateAchievements(telemetry)
    : evaluateAchievements({
        total_enemies_defeated: 0,
        max_single_run_coins: 0,
        longest_damage_free_wave_streak: 0
      })

  const unlockedCount = achievementProgress.filter(a => a.unlocked).length
  const totalXP = telemetry?.total_xp ?? 0
  const level = telemetry?.level ?? 1
  const xpIntoLevel = totalXP % 500
  const xpPercent = Math.min(100, (xpIntoLevel / 500) * 100)

  const displayName =
    (user?.user_metadata?.username as string | undefined) ||
    (profile.username !== 'Guest Operative' ? profile.username : '') ||
    user?.email?.split('@')[0] ||
    profile.username ||
    'Guest Operative'
  const favoriteHero = getHero(telemetry?.favorite_hero || 'hero_01')

  const startEditing = () => {
    setEditUsername(displayName)
    setIsEditing(true)
  }

  const saveProfile = () => {
    const trimmed = editUsername.trim()
    if (trimmed.length < 3 || trimmed.length > 20) {
      toast.warning('Callsign must be between 3 and 20 characters.')
      return
    }
    const updated = saveOperativeProfile({ username: trimmed }, user?.id)
    if (user?.id) {
      updateLocalAccountUsername(user.id, trimmed)
    }
    setProfile(updated)
    setIsEditing(false)
    toast.success(`Callsign updated to "${updated.username}"`)
  }

  const handleSavePreferences = () => {
    const updated = saveOperativeProfile({
      targetingMode,
      difficulty
    }, user?.id)
    setProfile(updated)
    toast.success('Combat preferences saved!')
  }

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">PROFILE</h1>
        <p className="text-gray-400 mt-2">Operative Service Record, Mastery & Preferences</p>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="bg-gray-900 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-accent to-hazard-gold rounded-full flex items-center justify-center text-4xl border-4 border-gray-700 shrink-0">
              🛡️
            </div>

            <div className="flex-grow w-full">
              {isEditing ? (
                <div className="space-y-3 max-w-md">
                  <ValidatedInput
                    name="operative_callsign"
                    label="Operative Callsign"
                    value={editUsername}
                    onChange={setEditUsername}
                    rules={ValidationPresets.playerName}
                    showSuccess
                  />
                  <div className="flex space-x-2">
                    <Button variant="primary" onClick={saveProfile} size="sm">
                      Save Callsign
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditing(false)} size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{displayName}</h2>
                    <Badge variant="primary" size="sm">Level {level}</Badge>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    {user?.email || 'Guest Operative (Persisted Locally)'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last Updated: {new Date(profile.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-4 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-hazard-gold">
                  {telemetry?.total_games ?? 0}
                </p>
                <p className="text-xs text-gray-400">Runs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-accent">
                  {telemetry?.highest_wave ?? 0}
                </p>
                <p className="text-xs text-gray-400">Best Wave</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {(telemetry?.highest_score ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">Best Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-hazard-gold">
                  {(telemetry?.total_coins_collected ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">Total Coins</p>
              </div>
            </div>

            {!isEditing && (
              <Button variant="secondary" onClick={startEditing} size="sm">
                Edit Callsign
              </Button>
            )}
          </div>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview' as ActiveTab, label: 'Overview', icon: '📊' },
            { id: 'stats' as ActiveTab, label: 'Statistics', icon: '📈' },
            {
              id: 'achievements' as ActiveTab,
              label: `Achievements (${unlockedCount}/${achievementProgress.length})`,
              icon: '🏆'
            },
            { id: 'settings' as ActiveTab, label: 'Settings', icon: '⚙️' }
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

        {loading && (
          <Card className="bg-gray-900 text-center py-12">
            <p className="text-gray-400">Loading operative telemetry...</p>
          </Card>
        )}

        {/* Overview Tab */}
        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Recent Deployments</h3>
              {telemetry && telemetry.recent_runs.length > 0 ? (
                <div className="space-y-3">
                  {telemetry.recent_runs.slice(0, 5).map(run => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded"
                    >
                      <div>
                        <p className="text-white font-semibold">
                          {getHero(run.hero_used).name} • Wave {run.wave_reached}
                        </p>
                        <p className="text-xs text-gray-400">
                          {run.survival_seconds}s survived • {run.coins_collected} coins • {run.enemies_defeated} kills
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-hazard-gold font-bold">
                          {run.final_score.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(run.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No completed missions recorded yet.</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/play')}>
                    Launch First Run
                  </Button>
                </div>
              )}
            </Card>

            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Primary Operative</h3>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-3xl border-2 border-cyan-accent shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white">{favoriteHero.name}</h4>
                  <p className="text-cyan-accent text-sm">{favoriteHero.archetype}</p>
                  <p className="text-gray-400 text-xs mt-1">{favoriteHero.lore}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-gray-800 rounded p-2 text-center">
                      <p className="text-xs text-gray-400">Base HP</p>
                      <p className="text-white font-semibold">{favoriteHero.hp}</p>
                    </div>
                    <div className="bg-gray-800 rounded p-2 text-center">
                      <p className="text-xs text-gray-400">Speed</p>
                      <p className="text-white font-semibold">
                        {Math.round(favoriteHero.speed * GAME_CONFIG.BASE_PLAYER_SPEED)} px/s
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const favMastery = getMasteryProgress(favoriteHero.id)
                    return (
                      <div className="mt-3 bg-gray-800/80 border border-gray-700 rounded p-2.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-amber-300 tabular-nums">
                            Mastery Rank {favMastery.currentTier}/{favMastery.maxTier}
                          </span>
                          <span className="text-gray-400 tabular-nums">
                            {favMastery.roundsCompleted} rounds
                          </span>
                        </div>
                        <p className="text-xs text-emerald-300">
                          {formatMasteryBonusSummary(favMastery.totalBonuses)}
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Statistics Tab */}
        {!loading && activeTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Combat Telemetry</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Runs', value: telemetry?.total_games ?? 0 },
                  { label: 'Highest Wave', value: telemetry?.highest_wave ?? 0 },
                  { label: 'Enemies Defeated', value: (telemetry?.total_enemies_defeated ?? 0).toLocaleString() },
                  { label: 'Best No-Hit Streak', value: `${telemetry?.longest_damage_free_wave_streak ?? 0} waves` },
                  { label: 'Total Coins', value: (telemetry?.total_coins_collected ?? 0).toLocaleString() },
                  { label: 'Highest Score', value: (telemetry?.highest_score ?? 0).toLocaleString() }
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-800 rounded p-3 text-center">
                    <p className="text-xs text-gray-400">{stat.label}</p>
                    <p className="text-lg font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Operative Rank Progression</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Level {level}</span>
                  <span>Level {level + 1}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div
                    className="bg-cyan-accent h-4 rounded-full transition-all duration-300"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Total XP: {totalXP.toLocaleString()}</span>
                  <span>{xpIntoLevel} / 500 XP</span>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-900 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold text-cyan-accent">Hero Mastery Records</h3>
                <span className="text-xs text-gray-400">
                  Clear combat waves with each hero to unlock permanent passive bonuses
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {heroes.map(hero => {
                  const stat = telemetry?.hero_stats?.[hero.id]
                  const mastery = getMasteryProgress(hero.id)
                  return (
                    <div key={hero.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700/80 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h4 className="font-semibold text-white">{hero.name}</h4>
                            <p className="text-xs text-cyan-accent">{hero.archetype}</p>
                          </div>
                          <Badge variant={mastery.currentTier > 0 ? 'primary' : 'secondary'} size="sm">
                            Rank {mastery.currentTier}/{mastery.maxTier}
                          </Badge>
                        </div>

                        <div className="mt-2">
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1 tabular-nums">
                            <span>{mastery.roundsCompleted} rounds cleared</span>
                            <span>
                              {mastery.nextTier
                                ? `${mastery.roundsToNextTier} to Tier ${mastery.nextTier.tier}`
                                : 'Mastered'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                mastery.currentTier >= mastery.maxTier ? 'bg-hazard-gold' : 'bg-cyan-accent'
                              }`}
                              style={{ width: `${mastery.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-emerald-300 mt-2.5 leading-snug">
                          {formatMasteryBonusSummary(mastery.totalBonuses)}
                        </p>

                        <div className="mt-2 space-y-1">
                          {mastery.tiers.map(t => (
                            <div
                              key={t.tier}
                              className={`text-[11px] flex items-center justify-between gap-2 px-2 py-0.5 rounded ${
                                t.unlocked ? 'bg-emerald-950/50 text-emerald-200' : 'bg-gray-900/70 text-gray-500'
                              }`}
                            >
                              <span className="truncate">
                                {t.unlocked ? '✓' : '•'} T{t.tier} {t.title}
                              </span>
                              <span className="shrink-0 tabular-nums">{t.requiredRounds} rds</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-gray-700/70">
                        <div>
                          <p className="text-gray-400">Runs</p>
                          <p className="text-white font-semibold tabular-nums">{stat?.gamesPlayed ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Best Wave</p>
                          <p className="text-cyan-accent font-semibold tabular-nums">{stat?.highestWave ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Best Score</p>
                          <p className="text-hazard-gold font-semibold tabular-nums">
                            {(stat?.highestScore ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Achievements Tab */}
        {!loading && activeTab === 'achievements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-gray-900">
                <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                  Achievements ({unlockedCount}/{achievementProgress.length} Unlocked)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievementProgress.map(item => (
                    <div
                      key={item.achievement.id}
                      className={`rounded p-4 border ${
                        item.unlocked
                          ? 'bg-gray-800 border-cyan-accent'
                          : 'bg-gray-800/60 border-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-white">{item.achievement.title}</h4>
                          <p className="text-xs text-gray-400">{item.achievement.requirement}</p>
                        </div>
                        <Badge variant={item.unlocked ? 'success' : 'secondary'} size="sm">
                          {item.unlocked ? 'Unlocked' : 'Locked'}
                        </Badge>
                      </div>

                      <div className="w-full bg-gray-700 rounded-full h-2 mt-3 mb-1">
                        <div
                          className={`h-2 rounded-full ${
                            item.unlocked ? 'bg-cyan-accent' : 'bg-hazard-gold'
                          }`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Badge: {item.achievement.reward_badge}</span>
                        <span>
                          {Math.min(item.current, item.target).toLocaleString()} / {item.target.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Completion Progress</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Badges Earned</span>
                <span className="text-white font-semibold">
                  {unlockedCount} / {achievementProgress.length}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4">
                <div
                  className="bg-hazard-gold h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${achievementProgress.length ? (unlockedCount / achievementProgress.length) * 100 : 0}%`
                  }}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {!loading && activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Operative Identity</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400">Callsign</label>
                  <p className="text-white font-semibold">{displayName}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-400">Session Type</label>
                  <p className="text-white">
                    {user?.email ? `Authenticated (${user.email})` : 'Guest Operative (Local Telemetry)'}
                  </p>
                </div>
                <Button variant="secondary" onClick={startEditing} className="w-full">
                  Change Callsign
                </Button>
                <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
                  {user ? 'Switch Account / Sign Out' : 'Log In or Create Account'}
                </Button>
              </div>
            </Card>

            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Combat & Audio Preferences</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white">Master Audio</span>
                  <Button
                    variant={audioSettings.isMuted ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={toggleMute}
                  >
                    {audioSettings.isMuted ? 'MUTED' : 'ON'}
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white">Sound Effects (SFX)</span>
                  <Button
                    variant={audioSettings.sfxVolume === 0 ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => setSfxVolume(audioSettings.sfxVolume === 0 ? 80 : 0)}
                  >
                    {audioSettings.sfxVolume === 0 ? 'OFF' : `ON (${audioSettings.sfxVolume}%)`}
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white">Music Channel</span>
                  <Button
                    variant={audioSettings.musicVolume === 0 ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => setMusicVolume(audioSettings.musicVolume === 0 ? 50 : 0)}
                  >
                    {audioSettings.musicVolume === 0 ? 'OFF' : `ON (${audioSettings.musicVolume}%)`}
                  </Button>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Auto-Target Priority</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-accent"
                    value={targetingMode}
                    onChange={(e) =>
                      setTargetingMode(e.target.value as OperativeProfile['targetingMode'])
                    }
                  >
                    <option value="closest">Closest Enemy</option>
                    <option value="weakest">Lowest HP</option>
                    <option value="strongest">Highest HP</option>
                    <option value="most_dangerous">Most Dangerous</option>
                    <option value="random">Random Target</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Deployment Intensity</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-accent"
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value as OperativeProfile['difficulty'])
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <Button variant="primary" onClick={handleSavePreferences} className="w-full">
                  Save Combat Preferences
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProfileView
