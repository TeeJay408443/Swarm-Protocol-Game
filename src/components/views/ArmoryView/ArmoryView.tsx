/**
 * ArmoryView - Enhanced with useLoadouts Hook
 * Phase 6: Core Build - Loadout Builder with CRUD
 */

import { useState } from 'react'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Badge } from '../../ui/Badge'
import { useSupabase } from '../../../hooks/useSupabase'
import { useLoadouts } from '../../../hooks/useLoadouts'
import { heroes, upgrades } from '../../../db/seedData'
import type { HeroesRow, UpgradesRow } from '../../../types/database'

// Define type for loadout
interface Loadout {
  id: string
  name: string
  heroId: string
  upgradeIds: string[]
  createdAt: Date
}

export function ArmoryView() {
  const { user, loading: authLoading } = useSupabase()
  const { 
    loadouts: dbLoadouts, 
    createLoadout, 
    updateLoadout, 
    deleteLoadout,
    loading: loadoutsLoading,
    error: loadoutsError,
    validate
  } = useLoadouts()

  // Local state for the loadout builder
  const [activeTab, setActiveTab] = useState<'loadouts' | 'create'>('loadouts')
  const [selectedHero, setSelectedHero] = useState<string | null>(null)
  const [selectedUpgrades, setSelectedUpgrades] = useState<string[]>([])
  const [loadoutName, setLoadoutName] = useState('')
  const [localLoadouts, setLocalLoadouts] = useState<Loadout[]>([])

  // Get hero by ID
  const getHero = (id: string) => heroes.find(h => h.id === id)

  // Get upgrade by ID
  const getUpgrade = (id: string) => upgrades.find(u => u.id === id)

  // Toggle upgrade selection
  const toggleUpgrade = (upgradeId: string) => {
    setSelectedUpgrades(prev => {
      if (prev.includes(upgradeId)) {
        return prev.filter(id => id !== upgradeId)
      } else {
        return [...prev, upgradeId]
      }
    })
  }

  // Create a new loadout (local for now, will connect to DB later)
  const createNewLoadout = () => {
    if (!selectedHero || selectedUpgrades.length === 0 || !loadoutName.trim()) {
      alert('Please select a hero, at least one upgrade, and enter a loadout name')
      return
    }

    const newLoadout: Loadout = {
      id: `loadout_${Date.now()}`,
      name: loadoutName.trim(),
      heroId: selectedHero,
      upgradeIds: selectedUpgrades,
      createdAt: new Date(),
    }

    setLocalLoadouts([...localLoadouts, newLoadout])
    resetForm()
    setActiveTab('loadouts')
  }

  // Delete a loadout (local for now)
  const deleteLocalLoadout = (loadoutId: string) => {
    if (window.confirm('Are you sure you want to delete this loadout?')) {
      setLocalLoadouts(localLoadouts.filter(l => l.id !== loadoutId))
    }
  }

  // Reset form
  const resetForm = () => {
    setSelectedHero(null)
    setSelectedUpgrades([])
    setLoadoutName('')
  }

  // Calculate loadout stats
  const calculateLoadoutStats = (loadout: Loadout) => {
    const hero = getHero(loadout.heroId)
    const loadoutUpgrades = loadout.upgradeIds.map(id => getUpgrade(id)).filter(Boolean)

    const totalDamage = (hero?.hp || 0) + loadoutUpgrades.reduce((sum, u) => sum + (u?.damage || 0), 0)
    const totalRange = (hero?.speed || 0) + loadoutUpgrades.reduce((sum, u) => sum + (u?.cooldown_s || 0), 0)

    return {
      damage: totalDamage,
      range: totalRange,
      upgradeCount: loadoutUpgrades.length,
    }
  }

  // Check if user is authenticated
  const isAuthenticated = !!user

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">ARMORY</h1>
        <p className="text-gray-400 mt-2">
          Loadout Builder - Create and Manage Your Builds
          {isAuthenticated && <span className="ml-2 text-cyan-accent">(Authenticated as: {user.email})</span>}
        </p>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Loading State */}
        {(authLoading || loadoutsLoading) && !loadoutsError && (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4 animate-pulse">🗡️</div>
            <p className="text-gray-400">Loading Armory...</p>
          </Card>
        )}

        {/* Error State */}
        {loadoutsError && (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4 text-alert-red">⚠️</div>
            <p className="text-gray-400 mb-4">Error: {loadoutsError}</p>
          </Card>
        )}

        {/* Authentication Notice */}
        {!isAuthenticated && !authLoading && (
          <Card className="bg-gray-900 border border-hazard-gold mb-6">
            <p className="text-hazard-gold">
              ⚠️ Please sign in to save and manage your loadouts. 
              Local loadouts will not persist across sessions.
            </p>
          </Card>
        )}

        {/* Main Content */}
        {!authLoading && (
          <>
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={activeTab === 'loadouts' ? 'primary' : 'secondary'}
                onClick={() => {
                  setActiveTab('loadouts')
                  resetForm()
                }}
              >
                My Loadouts ({localLoadouts.length})
              </Button>
              <Button
                variant={activeTab === 'create' ? 'primary' : 'secondary'}
                onClick={() => {
                  setActiveTab('create')
                  resetForm()
                }}
              >
                Create Loadout
              </Button>
            </div>

            {activeTab === 'loadouts' && (
              /* Loadouts List */
              <div className="space-y-6">
                {localLoadouts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localLoadouts.map(loadout => {
                      const hero = getHero(loadout.heroId)
                      const stats = calculateLoadoutStats(loadout)

                      return (
                        <Card key={loadout.id} className="bg-gray-900">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-white">{loadout.name}</h3>
                              <p className="text-sm text-gray-400">
                                {hero?.name || 'Unknown Hero'}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="danger"
                                onClick={() => deleteLocalLoadout(loadout.id)}
                                className="text-xs px-3 py-1"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-800 rounded p-2 text-center">
                              <p className="text-gray-400 text-xs">Upgrades</p>
                              <p className="text-white font-semibold">{stats.upgradeCount}</p>
                            </div>
                            <div className="bg-gray-800 rounded p-2 text-center">
                              <p className="text-gray-400 text-xs">Total Damage</p>
                              <p className="text-hazard-gold font-semibold">{stats.damage}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {loadout.upgradeIds.map(upgradeId => {
                              const upgrade = getUpgrade(upgradeId)
                              return upgrade ? (
                                <Badge key={upgradeId} variant="primary" size="sm">
                                  {upgrade.name}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="bg-gray-900 text-center py-12">
                    <div className="text-6xl mb-4">🗡️</div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Loadouts Created</h3>
                    <p className="text-gray-400 mb-4">Create your first loadout to get started</p>
                    <Button variant="primary" onClick={() => setActiveTab('create')}>
                      Create Loadout
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'create' && (
              /* Loadout Builder */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Hero and Upgrade Selection */}
                <div className="space-y-6">
                  <Card className="bg-gray-900">
                    <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                      Select Hero
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {heroes.map(hero => (
                        <div
                          key={hero.id}
                          className={`bg-gray-800 rounded-lg p-3 cursor-pointer transition-all border-2 ${
                            selectedHero === hero.id ? 'border-cyan-accent' : 'border-transparent hover:border-gray-600'
                          }`}
                          onClick={() => setSelectedHero(hero.id)}
                        >
                          <div className="text-center">
                            <div className="text-3xl mb-2">🎮</div>
                            <h4 className="font-semibold text-white text-sm">{hero.name}</h4>
                            <p className="text-xs text-gray-400">{hero.archetype}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedHero && (
                      <div className="mt-4 p-3 bg-gray-800 rounded">
                        <p className="text-sm text-gray-400">Selected: </p>
                        <p className="text-white font-semibold">{getHero(selectedHero)?.name}</p>
                      </div>
                    )}
                  </Card>

                  <Card className="bg-gray-900">
                    <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                      Select Upgrades
                    </h3>

                    <div className="max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {upgrades.map(upgrade => (
                          <div
                            key={upgrade.id}
                            className={`bg-gray-800 rounded p-3 cursor-pointer transition-colors ${
                              selectedUpgrades.includes(upgrade.id) 
                                ? 'border border-cyan-accent bg-gray-700' 
                                : 'hover:bg-gray-700'
                            }`}
                            onClick={() => toggleUpgrade(upgrade.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-white text-sm">{upgrade.name}</h4>
                                <p className="text-xs text-gray-400">{upgrade.category}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="warning" size="sm">
                                  +{upgrade.damage} DMG
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedUpgrades.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-800 rounded">
                        <p className="text-sm text-gray-400 mb-2">
                          Selected Upgrades ({selectedUpgrades.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedUpgrades.map(upgradeId => {
                            const upgrade = getUpgrade(upgradeId)
                            return upgrade ? (
                              <Badge 
                                key={upgradeId}
                                variant="primary"
                                size="sm"
                              >
                                {upgrade.name}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Right Column - Loadout Preview and Actions */}
                <div className="space-y-6">
                  <Card className="bg-gray-900">
                    <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                      Loadout Name
                    </h3>
                    <Input
                      type="text"
                      value={loadoutName}
                      onChange={(e) => setLoadoutName(e.target.value)}
                      placeholder="Enter loadout name..."
                      label="Name"
                    />
                  </Card>

                  <Card className="bg-gray-900">
                    <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                      Loadout Preview
                    </h3>

                    {selectedHero ? (
                      <div className="space-y-4">
                        {/* Hero Preview */}
                        <div className="bg-gray-800 rounded p-4">
                          <h4 className="font-semibold text-white mb-2">Hero</h4>
                          <div className="flex items-center space-x-3">
                            <span className="text-3xl">🎮</span>
                            <div>
                              <p className="font-semibold text-white">{getHero(selectedHero)?.name}</p>
                              <p className="text-sm text-gray-400">{getHero(selectedHero)?.archetype}</p>
                            </div>
                          </div>
                        </div>

                        {/* Upgrades Preview */}
                        <div className="bg-gray-800 rounded p-4">
                          <h4 className="font-semibold text-white mb-2">
                            Upgrades ({selectedUpgrades.length})
                          </h4>
                          {selectedUpgrades.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                              {selectedUpgrades.map(upgradeId => {
                                const upgrade = getUpgrade(upgradeId)
                                return upgrade ? (
                                  <div 
                                    key={upgradeId} 
                                    className="flex items-center justify-between p-2 bg-gray-700 rounded"
                                  >
                                    <p className="font-semibold text-white text-sm">{upgrade.name}</p>
                                    <Badge variant="warning" size="sm">
                                      +{upgrade.damage} DMG
                                    </Badge>
                                  </div>
                                ) : null
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">No upgrades selected</p>
                          )}
                        </div>

                        {/* Stats Preview */}
                        {selectedHero && (
                          <div className="bg-gray-800 rounded p-4">
                            <h4 className="font-semibold text-white mb-2">Loadout Stats</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { 
                                  label: 'Total Damage', 
                                  value: calculateLoadoutStats({
                                    id: 'preview',
                                    name: loadoutName || 'Preview',
                                    heroId: selectedHero,
                                    upgradeIds: selectedUpgrades,
                                    createdAt: new Date(),
                                  }).damage 
                                },
                                { 
                                  label: 'Total Range', 
                                  value: calculateLoadoutStats({
                                    id: 'preview',
                                    name: loadoutName || 'Preview',
                                    heroId: selectedHero,
                                    upgradeIds: selectedUpgrades,
                                    createdAt: new Date(),
                                  }).range 
                                },
                                { label: 'Upgrades', value: selectedUpgrades.length },
                              ].map((stat, index) => (
                                <div key={index} className="text-center">
                                  <p className="text-gray-400 text-xs">{stat.label}</p>
                                  <p className="text-white font-semibold">{stat.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-center py-8">
                        Select a hero to preview your loadout
                      </p>
                    )}
                  </Card>

                  <Card className="bg-gray-900">
                    <h3 className="text-lg font-semibold text-cyan-accent mb-4">
                      Actions
                    </h3>
                    <div className="space-y-3">
                      <Button
                        variant="primary"
                        onClick={createNewLoadout}
                        className="w-full"
                        disabled={!selectedHero || selectedUpgrades.length === 0 || !loadoutName.trim()}
                      >
                        Create Loadout
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          resetForm()
                          setActiveTab('loadouts')
                        }}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default ArmoryView
