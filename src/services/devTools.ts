/**
 * Developer Panel & Runtime Override Service
 * Strictly restricted to the authorized developer email: 408443@guhsd.net.
 */

import { useEffect, useState } from 'react'
import { creditShopCoins } from './shop'

export const DEV_AUTHORIZED_EMAIL = '408443@guhsd.net'

const DEV_STORAGE_KEY = 'swarm_protocol_dev_settings_v1'
const DEV_SETTINGS_EVENT = 'swarm_dev_settings_updated'
const DEV_ACTION_EVENT = 'swarm_dev_action_dispatched'
const DEV_RUN_STATE_EVENT = 'swarm_dev_run_state_updated'

export interface DevSettings {
  damageMultiplier: number
  healthMultiplier: number
  godMode: boolean
  startingWaveOverride: number
}

export const DEFAULT_DEV_SETTINGS: DevSettings = {
  damageMultiplier: 1,
  healthMultiplier: 1,
  godMode: false,
  startingWaveOverride: 1
}

export type DevLiveAction =
  | { type: 'grant_coins'; amount: number }
  | { type: 'heal_full' }
  | { type: 'set_health'; amount: number }
  | { type: 'add_max_health'; amount: number }
  | { type: 'apply_health_multiplier'; multiplier: number }
  | { type: 'skip_wave'; mode: 'delta' | 'set'; value: number }

export interface DevRunStatus {
  isInRun: boolean
  currentWave: number
  areaId: string
}

const memoryStore = new Map<string, string>()
const actionListeners = new Set<(action: DevLiveAction) => void>()
const settingsListeners = new Set<() => void>()
const runStatusListeners = new Set<() => void>()

let currentRunStatus: DevRunStatus = {
  isInRun: false,
  currentWave: 1,
  areaId: 'carbon_sector'
}

export function isDevAuthorizedEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  return email.trim().toLowerCase() === DEV_AUTHORIZED_EMAIL
}

function readRaw(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(DEV_STORAGE_KEY)
      if (val !== null) return val
    }
  } catch {
    // Fallback to in-memory store
  }
  return memoryStore.get(DEV_STORAGE_KEY) ?? null
}

function writeRaw(raw: string): void {
  memoryStore.set(DEV_STORAGE_KEY, raw)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEV_STORAGE_KEY, raw)
    }
  } catch {
    // Ignore storage quota errors
  }
}

function sanitizeSettings(partial?: Partial<DevSettings>): DevSettings {
  const dmg = Number(partial?.damageMultiplier)
  const hpMult = Number(partial?.healthMultiplier)
  const wave = Number(partial?.startingWaveOverride)

  return {
    damageMultiplier:
      Number.isFinite(dmg) && dmg >= 1 ? Math.min(10000, Math.round(dmg * 100) / 100) : 1,
    healthMultiplier:
      Number.isFinite(hpMult) && hpMult >= 1 ? Math.min(1000, Math.round(hpMult * 100) / 100) : 1,
    godMode: Boolean(partial?.godMode),
    startingWaveOverride:
      Number.isFinite(wave) && wave >= 1 ? Math.min(999, Math.floor(wave)) : 1
  }
}

export function getDevSettings(email?: string | null): DevSettings {
  if (!isDevAuthorizedEmail(email)) {
    return { ...DEFAULT_DEV_SETTINGS }
  }
  const raw = readRaw()
  if (!raw) return { ...DEFAULT_DEV_SETTINGS }
  try {
    return sanitizeSettings(JSON.parse(raw) as Partial<DevSettings>)
  } catch {
    return { ...DEFAULT_DEV_SETTINGS }
  }
}

export function updateDevSettings(
  email: string | null | undefined,
  partial: Partial<DevSettings>
): { success: boolean; settings: DevSettings; error?: string } {
  if (!isDevAuthorizedEmail(email)) {
    return {
      success: false,
      settings: { ...DEFAULT_DEV_SETTINGS },
      error: 'Unauthorized: Developer tools require 408443@guhsd.net.'
    }
  }

  const current = getDevSettings(email)
  const next = sanitizeSettings({ ...current, ...partial })
  writeRaw(JSON.stringify(next))

  for (const listener of settingsListeners) {
    listener()
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEV_SETTINGS_EVENT, { detail: next }))
  }

  return { success: true, settings: next }
}

export function resetDevSettings(
  email: string | null | undefined
): { success: boolean; settings: DevSettings; error?: string } {
  return updateDevSettings(email, DEFAULT_DEV_SETTINGS)
}

export function grantDevCoins(
  userId: string,
  email: string | null | undefined,
  amount: number
): { success: boolean; newBalance?: number; error?: string } {
  if (!isDevAuthorizedEmail(email)) {
    return {
      success: false,
      error: 'Unauthorized: Only 408443@guhsd.net can grant dev coins.'
    }
  }
  const safeAmount = Math.floor(Number(amount))
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { success: false, error: 'Coin grant amount must be positive.' }
  }

  const updated = creditShopCoins(userId, safeAmount)
  dispatchDevAction(email, { type: 'grant_coins', amount: safeAmount })
  return { success: true, newBalance: updated.balance }
}

export function dispatchDevAction(
  email: string | null | undefined,
  action: DevLiveAction
): { success: boolean; error?: string } {
  if (!isDevAuthorizedEmail(email)) {
    return {
      success: false,
      error: 'Unauthorized: Developer actions require 408443@guhsd.net.'
    }
  }

  for (const listener of actionListeners) {
    listener(action)
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEV_ACTION_EVENT, { detail: action }))
  }

  return { success: true }
}

export function subscribeDevActions(listener: (action: DevLiveAction) => void): () => void {
  actionListeners.add(listener)
  return () => {
    actionListeners.delete(listener)
  }
}

export function setDevRunStatus(next: Partial<DevRunStatus>): void {
  currentRunStatus = { ...currentRunStatus, ...next }
  for (const listener of runStatusListeners) {
    listener()
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEV_RUN_STATE_EVENT, { detail: currentRunStatus }))
  }
}

export function getDevRunStatus(): DevRunStatus {
  return currentRunStatus
}

export function useDevSettings(email?: string | null): {
  authorized: boolean
  settings: DevSettings
  runStatus: DevRunStatus
} {
  const authorized = isDevAuthorizedEmail(email)
  const [settings, setSettings] = useState<DevSettings>(() => getDevSettings(email))
  const [runStatus, setRunStatus] = useState<DevRunStatus>(() => getDevRunStatus())

  useEffect(() => {
    setSettings(getDevSettings(email))

    const syncSettings = () => setSettings(getDevSettings(email))
    const syncRun = () => setRunStatus(getDevRunStatus())

    settingsListeners.add(syncSettings)
    runStatusListeners.add(syncRun)

    if (typeof window !== 'undefined') {
      window.addEventListener(DEV_SETTINGS_EVENT, syncSettings)
      window.addEventListener(DEV_RUN_STATE_EVENT, syncRun)
      window.addEventListener('storage', syncSettings)
    }

    return () => {
      settingsListeners.delete(syncSettings)
      runStatusListeners.delete(syncRun)
      if (typeof window !== 'undefined') {
        window.removeEventListener(DEV_SETTINGS_EVENT, syncSettings)
        window.removeEventListener(DEV_RUN_STATE_EVENT, syncRun)
        window.removeEventListener('storage', syncSettings)
      }
    }
  }, [email])

  return {
    authorized,
    settings: authorized ? settings : { ...DEFAULT_DEV_SETTINGS },
    runStatus
  }
}
