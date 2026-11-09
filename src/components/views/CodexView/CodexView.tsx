import { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { heroes, enemies, upgrades, achievements } from '../../../db/seedData';
import type { HeroesRow, EnemiesRow, UpgradesRow, AchievementsRow } from '../../../types/database';

type EntityType = 'heroes' | 'enemies' | 'upgrades' | 'achievements';

export function CodexView() {
  const [activeTab, setActiveTab] = useState<EntityType>('heroes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow | null>(null);
  
  // Get data based on active tab
  const getData = (): (HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow)[] => {
    switch (activeTab) {
      case 'heroes':
        return heroes;
      case 'enemies':
        return enemies;
      case 'upgrades':
        return upgrades;
      case 'achievements':
        return achievements;
      default:
        return [];
    }
  };
  
  // Get entity name (handles both name and title)
  const getEntityName = (entity: HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow): string => {
    return 'name' in entity ? entity.name : entity.title;
  };
  
  // Get entity category/type
  const getEntityCategory = (_entity: HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow): string => {
    if ('archetype' in _entity) return _entity.archetype;
    if ('category' in _entity) return _entity.category;
    return (_entity as AchievementsRow).reward_badge || 'General';
  };
  
  // Filter and search data
  const filteredData = getData().filter(entity => {
    const entityName = getEntityName(entity);
    const matchesSearch = 
      entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  
  // Sort data
  const sortedData = [...filteredData].sort((a, b) => getEntityName(a).localeCompare(getEntityName(b)));
  
  // Tab configuration
  const tabs = [
    { id: 'heroes' as EntityType, label: 'Heroes', count: heroes.length },
    { id: 'enemies' as EntityType, label: 'Enemies', count: enemies.length },
    { id: 'upgrades' as EntityType, label: 'Upgrades', count: upgrades.length },
    { id: 'achievements' as EntityType, label: 'Achievements', count: achievements.length },
  ];
  
  // Get entity details for display
  const getEntityDetails = (entity: HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow) => {
    const entityName = getEntityName(entity);
    
    if ('hp' in entity && 'speed' in entity && 'archetype' in entity) {
      // Hero
      const hero = entity as HeroesRow;
      return {
        title: entityName,
        subtitle: hero.archetype,
        stats: [
          { label: 'HP', value: hero.hp },
          { label: 'Speed', value: `${hero.speed}x` },
        ],
        description: hero.lore || 'No lore available',
      };
    } else if ('hp' in entity && 'speed' in entity && 'coin_value' in entity) {
      // Enemy
      const enemy = entity as EnemiesRow;
      return {
        title: entityName,
        subtitle: enemy.category,
        stats: [
          { label: 'HP', value: enemy.hp },
          { label: 'Speed', value: `${enemy.speed}x` },
          { label: 'Coin Value', value: enemy.coin_value },
        ],
        description: enemy.description || 'No description available',
      };
    } else if ('damage' in entity && 'cooldown_s' in entity) {
      // Upgrade
      const upgrade = entity as UpgradesRow;
      return {
        title: entityName,
        subtitle: upgrade.category,
        stats: [
          { label: 'Damage', value: upgrade.damage },
          { label: 'Cooldown', value: `${upgrade.cooldown_s}s` },
        ],
        description: upgrade.function_desc || 'No description available',
      };
    } else {
      // Achievement
      const achievement = entity as AchievementsRow;
      return {
        title: entityName,
        subtitle: achievement.reward_badge || 'General',
        stats: [
          { label: 'Requirement', value: achievement.requirement },
        ],
        description: achievement.requirement,
      };
    }
  };
  
  const details = selectedEntity ? getEntityDetails(selectedEntity) : null;
  
  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">CODEX</h1>
        <p className="text-gray-400 mt-2">Game Entity Database - 29 Entities Cataloged</p>
      </header>
      
      <main className="max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => (
            <Button 
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'secondary'}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedEntity(null);
                setSearchQuery('');
              }}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Search */}
          <div className="space-y-6">
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-cyan-accent mb-4">Search</h3>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-accent"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Card>
            
            <Card className="bg-gray-900">
              <h3 className="text-lg font-semibold text-hazard-gold mb-4">Statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Entities:</span>
                  <span className="text-white">{getData().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Filtered:</span>
                  <span className="text-cyan-accent">{filteredData.length}</span>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Main Content - Entity List */}
          <div className="lg:col-span-2">
            {selectedEntity ? (
              /* Entity Detail View */
              <div className="space-y-6">
                <Button variant="secondary" onClick={() => setSelectedEntity(null)} className="mb-4">
                  ← Back to List
                </Button>
                
                {details && (
                  <Card className="bg-gray-900">
                    <div className="flex flex-col gap-6">
                      {/* Entity Title */}
                      <div>
                        <h2 className="text-2xl font-bold text-white">{details.title}</h2>
                        <p className="text-cyan-accent">{details.subtitle}</p>
                      </div>
                      
                      {/* Entity Description */}
                      <div>
                        <p className="text-gray-300">{details.description}</p>
                      </div>
                      
                      {/* Entity Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        {details.stats.map((stat, index) => (
                          <div key={index} className="bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-400 text-sm">{stat.label}</p>
                            <p className="text-white font-semibold">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              /* Entity List */
              <div className="space-y-4">
                {sortedData.length > 0 ? (
                  <>
                    <p className="text-gray-400 mb-4">
                      Showing {sortedData.length} of {getData().length} entities
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedData.map(entity => {
                        const entityName = getEntityName(entity);
                        const category = getEntityCategory(entity);
                        
                        return (
                          <Card 
                            key={entity.id}
                            className="bg-gray-900 cursor-pointer hover:bg-gray-800 transition-colors"
                            onClick={() => setSelectedEntity(entity)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-grow min-w-0">
                                <h3 className="font-semibold text-white truncate">{entityName}</h3>
                                <p className="text-sm text-gray-400 truncate">{category}</p>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="text-cyan-accent">→</span>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <Card className="bg-gray-900 text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-white mb-2">No entities found</h3>
                    <p className="text-gray-400">Try adjusting your search criteria</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
