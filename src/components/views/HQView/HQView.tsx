import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../../../hooks/useSupabase'
import {
  getOperativeProfile,
  getPlayerTelemetry,
  type LocalPlayerTelemetry
} from '../../../services/scores'
import { useShopState } from '../../../services/shop'
import { ArenaId, GAME_AREAS, getAreaById, isAreaUnlocked } from '../../../config/arenas'
import {
  DifficultyId,
  formatDifficultyCoinLabel,
  GAME_DIFFICULTIES,
  getDifficultyById,
  getStoredDifficultyId,
  saveDifficultyId
} from '../../../config/difficulties'
import { ARENA_PREVIEW_IMAGES } from './arenaAssets'

interface SideScreenTab {
  id: string
  label: string
  subtitle: string
  to: string
  icon: string
}

const SIDE_TABS: SideScreenTab[] = [
  { id: 'armory', label: 'Armory', subtitle: 'Loadouts & Fusion', to: '/armory', icon: '⚔️' },
  { id: 'shop', label: 'Shop', subtitle: 'Crates & Gear', to: '/shop', icon: '🛒' },
  { id: 'codex', label: 'Codex', subtitle: 'Heroes & Foes', to: '/codex', icon: '📘' },
  { id: 'leaderboards', label: 'Rankings', subtitle: 'Top Scores', to: '/leaderboards', icon: '🏆' },
  { id: 'profile', label: 'Profile', subtitle: 'Stats & Medals', to: '/profile', icon: '🎖️' }
]

export function HQView() {
  const navigate = useNavigate()
  const { user } = useSupabase()
  const { shopState } = useShopState(user?.id)

  const [telemetry, setTelemetry] = useState<LocalPlayerTelemetry | null>(null)
  const [operativeName, setOperativeName] = useState('Guest Operative')
  const [selectedAreaId, setSelectedAreaId] = useState<ArenaId>('carbon_sector')
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<DifficultyId>(() =>
    getStoredDifficultyId()
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [lockMessage, setLockMessage] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const profile = getOperativeProfile(user?.id)
    const displayName =
      (user?.user_metadata?.username as string | undefined) ||
      (user?.email ? user.email.split('@')[0] : profile.username)
    setOperativeName(displayName)

    getPlayerTelemetry(user?.id).then((data) => {
      if (!active) return
      setTelemetry(data)
    })

    return () => {
      active = false
    }
  }, [user?.id, user?.email, user?.user_metadata])

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const highestWave = telemetry?.highest_wave ?? 0
  const selectedArea = getAreaById(selectedAreaId)
  const selectedDifficulty = getDifficultyById(selectedDifficultyId)

  const transitionToRoute = (to: string, tabId?: string) => {
    if (transitioning) return
    setDropdownOpen(false)
    setActiveTabId(tabId ?? null)
    setTransitioning(true)
    window.setTimeout(() => {
      navigate(to)
    }, 150)
  }

  const handleSelectDifficulty = (difficultyId: DifficultyId) => {
    setSelectedDifficultyId(difficultyId)
    saveDifficultyId(difficultyId)
  }

  const handleSelectCenterArea = (areaId: ArenaId) => {
    const unlocked = isAreaUnlocked(areaId, telemetry)
    if (unlocked) {
      setSelectedAreaId(areaId)
      setLockMessage(null)
    } else {
      setLockMessage(
        areaId === 'molten_starforge'
          ? 'Defeat Astral Scourge at Area 2 Wave 20 to unlock the Molten Starforge.'
          : `Beat Wave 15 in Area 1 to unlock ${getAreaById(areaId).name} (Current best: Wave ${highestWave}/15)`
      )
    }
  }

  const handlePlayArea = (areaId: ArenaId) => {
    if (!isAreaUnlocked(areaId, telemetry)) {
      setLockMessage(
        areaId === 'molten_starforge'
          ? 'Defeat Astral Scourge at Area 2 Wave 20 to unlock the Molten Starforge.'
          : `Beat Wave 15 in Area 1 to unlock ${getAreaById(areaId).name} (Current best: Wave ${highestWave}/15)`
      )
      return
    }
    transitionToRoute(`/play?area=${areaId}&difficulty=${selectedDifficultyId}`)
  }

  return (
    <div
      className={`relative flex-grow flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#131D3D] via-[#0F1733] to-[#090F24] px-4 sm:px-8 py-6 transition-all ${
        transitioning ? 'animate-screen-exit-left pointer-events-none' : ''
      }`}
    >
      {/* Ambient Bubbly Backdrop Spheres (GPU compositor-only) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float-bubble absolute -top-20 -left-16 w-80 h-80 rounded-full bg-sky-400/12 blur-2xl" />
        <div className="animate-float-bubble-slow absolute top-1/4 -right-24 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="animate-float-bubble absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-amber-300/10 blur-2xl" />
      </div>

      {/* Main Front Page Workspace: Left Side Tabs + Center Two-Area Stage */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex-grow flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8">
        {/* Left Side Navigation Tabs */}
        <aside
          aria-label="Screen navigation tabs"
          className="lg:w-60 shrink-0 flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:justify-center"
        >
          {SIDE_TABS.map((tab) => {
            const isTabActive = activeTabId === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => transitionToRoute(tab.to, tab.id)}
                className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-3xl border text-left transition-all duration-150 shrink-0 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_20px_rgba(0,0,0,0.28)] ${
                  isTabActive
                    ? 'bg-sky-400/20 border-sky-300/70 -translate-y-0.5'
                    : 'bg-[#19254A]/85 hover:bg-[#223161] border-white/10 hover:border-sky-300/50 hover:-translate-y-0.5'
                }`}
              >
                <span className="w-10 h-10 rounded-2xl bg-slate-950/55 border border-white/10 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                  {tab.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-white text-base leading-tight whitespace-nowrap">
                    {tab.label}
                  </span>
                  <span className="block text-xs text-slate-300/80 whitespace-nowrap">
                    {tab.subtitle}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-sky-300/70 group-hover:text-sky-200 group-hover:translate-x-0.5 transition-all text-sm font-bold hidden lg:inline"
                >
                  ›
                </span>
              </button>
            )
          })}
        </aside>

        {/* Center Showcase: Title + Two Areas Displayed in Center */}
        <section className="flex-1 flex flex-col items-center justify-center min-w-0">
          {/* Compact Bubbly Greeting Header */}
          <div className="text-center max-w-2xl mb-6">
            <p className="text-xs sm:text-sm font-medium text-sky-200/85 mb-1.5 tabular-nums">
              {operativeName} · Best Wave {highestWave}/15 · {shopState.balance.toLocaleString()} Coins
            </p>
            <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-white [text-wrap:balance]">
              Choose Your Battle Arena
            </h1>
          </div>

          {/* Center Two Areas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 w-full max-w-6xl">
            {GAME_AREAS.map((area) => {
              const unlocked = isAreaUnlocked(area.id, telemetry)
              const isSelected = selectedAreaId === area.id

              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleSelectCenterArea(area.id)}
                  aria-pressed={isSelected}
                  className={`group relative rounded-[28px] p-3.5 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_32px_rgba(0,0,0,0.38)] ${
                    isSelected
                      ? 'bg-[#1D2C58] border-2 border-sky-300 -translate-y-1 shadow-[0_18px_40px_rgba(56,189,248,0.22)]'
                      : unlocked
                        ? 'bg-[#172347]/90 border-2 border-white/12 hover:border-emerald-300/60 hover:-translate-y-0.5'
                        : 'bg-[#131C3A]/85 border-2 border-white/10 hover:border-amber-300/40'
                  }`}
                >
                  {/* Area Artwork Frame */}
                  <div className="relative w-full aspect-[16/9] rounded-[20px] overflow-hidden bg-slate-950 mb-3.5">
                    <img
                      src={ARENA_PREVIEW_IMAGES[area.id]}
                      alt={`${area.name} - ${area.subtitle}`}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        unlocked
                          ? 'group-hover:scale-105'
                          : 'grayscale brightness-[0.45] saturate-50'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

                    {/* Top-left subtle area indicator text */}
                    <div className="absolute top-3 left-3.5 text-xs font-bold text-white/95 drop-shadow">
                      Area {area.order} · {area.subtitle}
                    </div>

                    {/* Compact lock badge keeps area names readable on three-column layouts. */}
                    {!unlocked && (
                      <div className="absolute top-3 right-3 rounded-full bg-slate-950/85 border border-amber-300/50 px-2.5 py-1 text-[11px] font-bold text-amber-200 shadow-lg">
                        🔒 Locked
                      </div>
                    )}

                    {/* Bottom overlay area title */}
                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2">
                      <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white leading-tight drop-shadow">
                        {area.name}
                      </h2>
                      <span
                        className={`text-xs font-bold whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'text-sky-300'
                            : unlocked
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                        }`}
                      >
                        {isSelected ? 'Selected' : unlocked ? 'Ready' : 'Locked'}
                      </span>
                    </div>
                  </div>

                  {/* Area Info Body */}
                  <div className="px-1.5 pb-1 flex flex-col gap-2">
                    <p className="text-sm text-slate-200/90 leading-snug">
                      {area.description}
                    </p>
                    {!unlocked && (
                      <p className="text-xs text-amber-200/90">
                        {area.id === 'molten_starforge'
                          ? 'Defeat Astral Scourge at Area 2 Wave 20 to unlock.'
                          : 'Defeat the Area 1 Wave 15 boss to unlock.'}
                      </p>
                    )}
                    <div className="text-xs text-slate-300/80 font-medium tabular-nums pt-1 border-t border-white/10 flex items-center justify-between">
                      <span>{area.difficultyLabel}</span>
                      <span className={area.coinBonusPercent > 0 ? 'text-amber-300 font-semibold' : ''}>
                        {area.coinBonusPercent > 0
                          ? `+${area.coinBonusPercent}% Coin Rewards`
                          : 'Standard Rewards'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {lockMessage && (
            <p
              role="status"
              className="mt-4 text-sm font-medium text-amber-200 bg-amber-950/50 border border-amber-300/35 rounded-full px-5 py-2 animate-pop-in text-center"
            >
              {lockMessage}
            </p>
          )}

          {/* Compact Run Difficulty Selector */}
          <div className="mt-5 w-full max-w-4xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {GAME_DIFFICULTIES.map((diff) => {
                const active = selectedDifficultyId === diff.id
                return (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => handleSelectDifficulty(diff.id)}
                    aria-pressed={active}
                    className={`rounded-2xl px-3.5 py-2.5 border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#1D2C58] border-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] -translate-y-0.5'
                        : 'bg-[#162244]/85 border-white/10 hover:border-white/30'
                    }`}
                    style={
                      active
                        ? {
                            borderColor: diff.accentColor,
                            boxShadow: `0 0 18px ${diff.accentColor}30`
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-display font-extrabold text-sm tracking-wide"
                        style={{ color: diff.accentColor }}
                      >
                        {diff.name}
                      </span>
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          diff.coinBonusPercent > 0
                            ? 'text-amber-300'
                            : diff.coinBonusPercent < 0
                              ? 'text-rose-300'
                              : 'text-slate-300'
                        }`}
                      >
                        {formatDifficultyCoinLabel(diff)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300/80 mt-0.5 truncate tabular-nums">
                      HP {Math.round(diff.enemyHpMultiplier * 100)}% · DMG{' '}
                      {Math.round(diff.enemyDamageMultiplier * 100)}%
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Dock: Big Bubbly Play Button + Area Dropdown */}
      <div className="relative z-20 pt-6 pb-2 flex flex-col items-center justify-center">
        <div ref={dropdownRef} className="relative inline-flex items-stretch">
          {/* Little Area Selector Dropdown Menu (opens upward from Play bar) */}
          {dropdownOpen && (
            <div
              role="menu"
              aria-label="Select Area to Play"
              className="animate-pop-in absolute bottom-full mb-3 right-0 w-72 sm:w-80 rounded-3xl bg-[#182449]/95 backdrop-blur-xl border border-white/15 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-300/80">
                Jump to Arena Area
              </div>
              <div className="space-y-1.5 mt-1">
                {GAME_AREAS.map((area) => {
                  const unlocked = isAreaUnlocked(area.id, telemetry)
                  const isCurrent = selectedAreaId === area.id
                  return (
                    <button
                      key={area.id}
                      type="button"
                      role="menuitem"
                      disabled={!unlocked}
                      onClick={() => handlePlayArea(area.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors ${
                        unlocked
                          ? isCurrent
                            ? 'bg-sky-400/25 border border-sky-300/60 text-white hover:bg-sky-400/35 cursor-pointer'
                            : 'bg-white/5 hover:bg-white/15 border border-transparent text-white cursor-pointer'
                          : 'bg-slate-950/45 border border-white/5 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm leading-tight truncate">
                          Area {area.order}: {area.name}
                        </div>
                        <div className="text-xs text-slate-300/75 truncate">
                          {unlocked
                            ? area.coinBonusPercent > 0
                              ? `${area.subtitle} · +${area.coinBonusPercent}% Coins`
                              : `${area.subtitle} · Click to Play`
                            : area.id === 'molten_starforge'
                              ? 'Defeat Astral Scourge · Area 2 Wave 20'
                              : `Beat Wave 15 to unlock (${highestWave}/15)`}
                        </div>
                      </div>
                      <span className="text-xs font-bold shrink-0">
                        {unlocked ? 'Go →' : '🔒'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Compound Big Bubbly Play Button + Attached Area Dropdown Trigger */}
          <button
            type="button"
            onClick={() => handlePlayArea(selectedArea.id)}
            className="px-10 sm:px-14 py-4 rounded-l-full bg-gradient-to-b from-cyan-300 via-sky-400 to-sky-500 hover:brightness-105 active:translate-y-0.5 text-slate-950 border-b-[5px] border-sky-700 shadow-[0_14px_34px_rgba(56,189,248,0.38)] transition-all duration-150 flex items-center gap-3 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-slate-950/15 flex items-center justify-center text-base">
              ▶
            </span>
            <span className="text-left leading-none">
              <span className="block font-display font-black text-2xl sm:text-3xl tracking-wide">
                PLAY
              </span>
              <span className="block text-xs font-bold text-slate-900/85 mt-0.5 whitespace-nowrap">
                {selectedArea.name} · {selectedDifficulty.name} ({formatDifficultyCoinLabel(selectedDifficulty)})
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="Choose area dropdown"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            className="px-5 py-4 rounded-r-full bg-gradient-to-b from-sky-400 to-cyan-600 hover:brightness-110 active:translate-y-0.5 text-slate-950 border-l border-slate-950/20 border-b-[5px] border-sky-800 shadow-[0_14px_34px_rgba(56,189,248,0.28)] transition-all duration-150 flex items-center justify-center cursor-pointer"
          >
            <span
              className={`text-lg font-black transition-transform duration-150 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            >
              ▾
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default HQView
