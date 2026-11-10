# Phase 6: Core Build - Web Application & CRUD UI

## Objective
Build the web application shell with persistent navigation, Codex data explorer (Search/Filter/Sort), and Armory loadout builder (Full Loadout CRUD).

## 🎯 Core Deliverables

### 1. Persistent Header Navigation ✅ (Already Implemented in Phase 4)
- [x] Header component with navigation links to all 6 views
- [x] Sticky positioning for persistent visibility
- [x] Mobile-responsive design
- [x] Active link highlighting

### 2. Codex Data Explorer (Enhance Existing)
- [ ] Connect to Supabase for real data
- [ ] Implement Search functionality
- [ ] Implement Filter by category/type
- [ ] Implement Sort by name, damage, rarity, etc.
- [ ] Add pagination for large datasets
- [ ] Display detailed entity information

### 3. Armory Loadout Builder (Enhance Existing)
- [ ] Connect to Supabase for real data
- [ ] Create Loadout (CRUD: Create)
- [ ] Read Loadout (CRUD: Read)
- [ ] Update Loadout (CRUD: Update)
- [ ] Delete Loadout (CRUD: Delete)
- [ ] Save loadouts to database
- [ ] Load saved loadouts from database
- [ ] Share loadouts (future feature)

## 📁 Folder Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx (Enhanced with auth state)
│   │   ├── Footer.tsx
│   │   └── Layout.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx (NEW)
│   │   ├── Select.tsx (NEW)
│   │   ├── Badge.tsx (NEW)
│   │   └── ...
│   └── views/
│       ├── CodexView/
│       │   ├── CodexView.tsx (Enhanced with CRUD)
│       │   ├── searchUtils.ts (NEW)
│       │   ├── filterUtils.ts (NEW)
│       │   └── sortUtils.ts (NEW)
│       ├── ArmoryView/
│       │   ├── ArmoryView.tsx (Enhanced with CRUD)
│       │   ├── loadoutUtils.ts (NEW)
│       │   └── validation.ts (NEW)
│       └── ...
├── hooks/
│   ├── useSupabase.ts (NEW)
│   ├── useCodex.ts (NEW)
│   ├── useLoadouts.ts (NEW)
│   └── useAuth.ts (NEW)
├── services/
│   ├── supabase.ts (NEW - Enhanced client)
│   ├── database.ts (NEW - Database operations)
│   └── auth.ts (NEW - Auth operations)
├── types/
│   ├── database.ts (Existing)
│   ├── game.ts (Existing)
│   └── api.ts (NEW - API response types)
├── utils/
│   ├── constants.ts (NEW)
│   ├── helpers.ts (NEW)
│   └── validation.ts (NEW)
└── App.tsx (Updated with enhanced routing)
```

## 🔧 Technical Implementation

### Supabase Setup

#### 1. Enhanced Supabase Client (`src/services/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### 2. Database Operations (`src/services/database.ts`)
```typescript
// Fetch all heroes
export const getHeroes = async () => {
  const { data, error } = await supabase.from('heroes').select('*')
  if (error) throw error
  return data
}

// Fetch all upgrades
export const getUpgrades = async () => {
  const { data, error } = await supabase.from('upgrades').select('*')
  if (error) throw error
  return data
}

// Fetch all enemies
export const getEnemies = async () => {
  const { data, error } = await supabase.from('enemies').select('*')
  if (error) throw error
  return data
}

// Fetch all achievements
export const getAchievements = async () => {
  const { data, error } = await supabase.from('achievements').select('*')
  if (error) throw error
  return data
}
```

#### 3. Loadout CRUD Operations (`src/services/loadouts.ts`)
```typescript
// Create a loadout
export const createLoadout = async (loadout: Loadout) => {
  const { data, error } = await supabase
    .from('loadouts')
    .insert(loadout)
    .select()
  if (error) throw error
  return data[0]
}

// Get all loadouts for a user
export const getLoadouts = async (userId: string) => {
  const { data, error } = await supabase
    .from('loadouts')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

// Get a single loadout
export const getLoadout = async (id: string) => {
  const { data, error } = await supabase
    .from('loadouts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Update a loadout
export const updateLoadout = async (id: string, updates: Partial<Loadout>) => {
  const { data, error } = await supabase
    .from('loadouts')
    .update(updates)
    .eq('id', id)
    .select()
  if (error) throw error
  return data[0]
}

// Delete a loadout
export const deleteLoadout = async (id: string) => {
  const { error } = await supabase
    .from('loadouts')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}
```

### Custom Hooks

#### 1. useSupabase (`src/hooks/useSupabase.ts`)
```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

export const useSupabase = () => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { supabase, session, user }
}
```

#### 2. useCodex (`src/hooks/useCodex.ts`)
```typescript
import { useState, useEffect } from 'react'
import { getHeroes, getUpgrades, getEnemies, getAchievements } from '../services/database'

export const useCodex = () => {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [upgrades, setUpgrades] = useState<Upgrade[]>([])
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const [heroesData, upgradesData, enemiesData, achievementsData] = await Promise.all([
          getHeroes(),
          getUpgrades(),
          getEnemies(),
          getAchievements()
        ])
        setHeroes(heroesData || [])
        setUpgrades(upgradesData || [])
        setEnemies(enemiesData || [])
        setAchievements(achievementsData || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return { heroes, upgrades, enemies, achievements, loading, error }
}
```

#### 3. useLoadouts (`src/hooks/useLoadouts.ts`)
```typescript
import { useState, useEffect } from 'react'
import { 
  createLoadout as createLoadoutApi,
  getLoadouts as getLoadoutsApi,
  getLoadout as getLoadoutApi,
  updateLoadout as updateLoadoutApi,
  deleteLoadout as deleteLoadoutApi
} from '../services/loadouts'

export const useLoadouts = (userId: string | null) => {
  const [loadouts, setLoadouts] = useState<Loadout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    const fetchLoadouts = async () => {
      try {
        setLoading(true)
        const data = await getLoadoutsApi(userId)
        setLoadouts(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLoadouts()
  }, [userId])

  const createLoadout = async (loadout: Omit<Loadout, 'id' | 'created_at'>) => {
    try {
      const newLoadout = await createLoadoutApi({ ...loadout, user_id: userId })
      setLoadouts(prev => [...prev, newLoadout])
      return newLoadout
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const updateLoadout = async (id: string, updates: Partial<Loadout>) => {
    try {
      const updatedLoadout = await updateLoadoutApi(id, updates)
      setLoadouts(prev => prev.map(l => l.id === id ? updatedLoadout : l))
      return updatedLoadout
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const removeLoadout = async (id: string) => {
    try {
      await deleteLoadoutApi(id)
      setLoadouts(prev => prev.filter(l => l.id !== id))
      return true
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return { loadouts, createLoadout, updateLoadout, removeLoadout, loading, error }
}
```

### Enhanced UI Components

#### 1. Input Component (`src/components/ui/Input.tsx`)
```typescript
import type { ReactNode } from 'react'

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search'
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  className = '',
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-gray-400 mb-1">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-gray-800 border ${error ? 'border-alert-red' : 'border-gray-700'} rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-accent ${className}`}
      />
      {error && (
        <p className="text-xs text-alert-red mt-1">{error}</p>
      )}
    </div>
  )
}
```

#### 2. Select Component (`src/components/ui/Select.tsx`)
```typescript
interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: SelectOption[]
  label?: string
  disabled?: boolean
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  label,
  disabled = false,
  className = '',
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-gray-400 mb-1">{label}</label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-accent ${className}`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

#### 3. Badge Component (`src/components/ui/Badge.tsx`)
```typescript
interface BadgeProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantClasses = {
    primary: 'bg-cyan-accent text-slate-carbon',
    secondary: 'bg-gray-700 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-hazard-gold text-slate-carbon',
    danger: 'bg-alert-red text-white',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={`rounded-full font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  )
}
```

### Enhanced Views

#### 1. Enhanced CodexView
- Connect to real Supabase data
- Add search input with debounce
- Add category filters
- Add sort dropdown
- Add loading states
- Add error handling

#### 2. Enhanced ArmoryView
- Connect to real Supabase data
- Add user authentication check
- Load user's saved loadouts
- Save new loadouts to database
- Update existing loadouts
- Delete loadouts
- Add validation

## 📋 Implementation Checklist

- [ ] Create `src/services/supabase.ts` - Supabase client
- [ ] Create `src/services/database.ts` - Database operations
- [ ] Create `src/services/loadouts.ts` - Loadout CRUD operations
- [ ] Create `src/hooks/useSupabase.ts` - Auth state hook
- [ ] Create `src/hooks/useCodex.ts` - Codex data hook
- [ ] Create `src/hooks/useLoadouts.ts` - Loadout management hook
- [ ] Create `src/components/ui/Input.tsx` - Input component
- [ ] Create `src/components/ui/Select.tsx` - Select component
- [ ] Create `src/components/ui/Badge.tsx` - Badge component
- [ ] Update `src/components/views/CodexView/CodexView.tsx` - Connect to Supabase
- [ ] Update `src/components/views/ArmoryView/ArmoryView.tsx` - Connect to Supabase
- [ ] Update `src/components/layout/Header.tsx` - Add auth state
- [ ] Update `src/App.tsx` - Add auth provider if needed

## 🎯 Success Criteria

1. Codex view displays real data from Supabase
2. Search, filter, and sort work correctly in Codex
3. Armory view can create, read, update, and delete loadouts
4. All CRUD operations persist to Supabase
5. UI is responsive and user-friendly
6. Error handling is implemented for all operations
7. Loading states are shown during data fetching

## 🔗 Dependencies

- @supabase/supabase-js
- react-router-dom (already installed)
- All existing dependencies from Phase 0-4

## 📅 Timeline

This phase builds on Phase 5 (Foundation). Once Supabase is set up, this phase can be completed in 1-2 days of focused development.

---

**Phase 6 Status**: 🚧 IN PROGRESS
**Branch**: `phase/6-core-build`
**Priority**: High (Core functionality)
