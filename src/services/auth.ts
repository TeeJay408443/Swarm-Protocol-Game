/**
 * Account & Session Service
 * Manages account creation, credential verification, session persistence,
 * and reactive auth state notifications (delegating to Supabase when configured,
 * with salted hashed local account storage so accounts work seamlessly offline/in-browser).
 */

import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

const ACCOUNTS_STORAGE_KEY = 'swarm_protocol_accounts_v1'
const SESSION_STORAGE_KEY = 'swarm_protocol_session_v1'

export interface StoredAccount {
  id: string
  email: string
  username: string
  passwordHash: string
  salt: string
  favoriteHero: string
  createdAt: string
  lastLoginAt: string
}

export interface PublicAccountSummary {
  id: string
  email: string
  username: string
  favoriteHero: string
  createdAt: string
  lastLoginAt: string
}

export interface AuthSession {
  userId: string
  email: string
  username: string
  signedInAt: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  favoriteHero?: string
}

export interface LoginInput {
  identifier: string // Email or Callsign/Username
  password: string
}

export interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

type AuthListener = (user: User | null, session: Session | null) => void

const listeners = new Set<AuthListener>()
const memoryStorage = new Map<string, string>()

function readStore(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key)
      if (val !== null) return val
    }
  } catch {
    // Fall back to in-memory store
  }
  return memoryStorage.get(key) ?? null
}

function writeStore(key: string, value: string): void {
  memoryStorage.set(key, value)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
  } catch {
    // Keep in-memory store updated when localStorage is unavailable or full
  }
}

function removeStore(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage errors
  }
  memoryStorage.delete(key)
}

function readAccounts(): StoredAccount[] {
  const raw = readStore(ACCOUNTS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  writeStore(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
}

function generateSalt(): string {
  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const payload = `${salt}:${password}:swarm_protocol`
  try {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
      const encoded = new TextEncoder().encode(payload)
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded)
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    // Fall through to deterministic non-SubtleCrypto hash when crypto.subtle is unavailable
  }

  // Fallback non-SubtleCrypto hash for restricted environments
  let h1 = 0xdeadbeef ^ payload.length
  let h2 = 0x41c6ce57 ^ payload.length
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`
}

function toUserObject(account: StoredAccount): User {
  return {
    id: account.id,
    app_metadata: { provider: 'local' },
    user_metadata: {
      username: account.username,
      favorite_hero: account.favoriteHero
    },
    aud: 'authenticated',
    created_at: account.createdAt,
    email: account.email
  } as User
}

function toSessionObject(account: StoredAccount): Session {
  const user = toUserObject(account)
  return {
    access_token: `local_token_${account.id}`,
    refresh_token: `local_refresh_${account.id}`,
    expires_in: 86400 * 30,
    token_type: 'bearer',
    user
  } as Session
}

function notifyAuthListeners(): void {
  const { user, session } = getLocalAuthState()
  for (const listener of listeners) {
    try {
      listener(user, session)
    } catch {
      // Ignore individual subscriber errors
    }
  }
}

export function subscribeLocalAuth(listener: AuthListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLocalAuthState(): { user: User | null; session: Session | null } {
  const raw = readStore(SESSION_STORAGE_KEY)
  if (!raw) return { user: null, session: null }
  try {
    const sessionData = JSON.parse(raw) as AuthSession
    const account = readAccounts().find((a) => a.id === sessionData.userId)
    if (!account) {
      removeStore(SESSION_STORAGE_KEY)
      return { user: null, session: null }
    }
    return {
      user: toUserObject(account),
      session: toSessionObject(account)
    }
  } catch {
    return { user: null, session: null }
  }
}

export function listSavedAccounts(): PublicAccountSummary[] {
  return readAccounts().map(({ id, email, username, favoriteHero, createdAt, lastLoginAt }) => ({
    id,
    email,
    username,
    favoriteHero,
    createdAt,
    lastLoginAt
  }))
}

export function validateRegistrationInput(input: RegisterInput): { valid: boolean; error?: string } {
  const username = input.username.trim()
  const email = input.email.trim().toLowerCase()

  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: 'Callsign must be between 3 and 20 characters.' }
  }
  if (!/^[a-zA-Z0-9_ -]+$/.test(username)) {
    return { valid: false, error: 'Callsign may only contain letters, numbers, spaces, _ or -.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Please enter a valid email address.' }
  }
  if (input.password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' }
  }
  return { valid: true }
}

export async function registerAccount(input: RegisterInput): Promise<AuthResult> {
  const validation = validateRegistrationInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const email = input.email.trim().toLowerCase()
  const username = input.username.trim()
  const favoriteHero = input.favoriteHero || 'hero_01'

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: { username, favorite_hero: favoriteHero }
        }
      })
      if (!error && data.user) {
        return { success: true, user: data.user }
      }
      if (error && !/fetch|network|timeout/i.test(error.message)) {
        return { success: false, error: error.message }
      }
    } catch {
      // Fall back to local account creation if remote Supabase endpoint is unreachable
    }
  }

  const accounts = readAccounts()
  if (accounts.some((a) => a.email.toLowerCase() === email)) {
    return { success: false, error: 'An account with this email already exists.' }
  }
  if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'That operative callsign is already taken.' }
  }

  const salt = generateSalt()
  const passwordHash = await hashPassword(input.password, salt)
  const now = new Date().toISOString()

  const newAccount: StoredAccount = {
    id: `acct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    username,
    passwordHash,
    salt,
    favoriteHero,
    createdAt: now,
    lastLoginAt: now
  }

  accounts.unshift(newAccount)
  writeAccounts(accounts)

  const session: AuthSession = {
    userId: newAccount.id,
    email: newAccount.email,
    username: newAccount.username,
    signedInAt: now
  }
  writeStore(SESSION_STORAGE_KEY, JSON.stringify(session))
  notifyAuthListeners()

  return {
    success: true,
    user: toUserObject(newAccount)
  }
}

export async function loginAccount(input: LoginInput): Promise<AuthResult> {
  const identifier = input.identifier.trim().toLowerCase()
  if (!identifier) {
    return { success: false, error: 'Enter your email or operative callsign.' }
  }
  if (!input.password) {
    return { success: false, error: 'Enter your password.' }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: input.password
      })
      if (!error && data.user) {
        return { success: true, user: data.user }
      }
      if (error && !/fetch|network|timeout/i.test(error.message)) {
        return { success: false, error: error.message }
      }
    } catch {
      // Fall back to local account verification if remote endpoint is unreachable
    }
  }

  const accounts = readAccounts()
  const account = accounts.find(
    (a) => a.email.toLowerCase() === identifier || a.username.toLowerCase() === identifier
  )
  if (!account) {
    return { success: false, error: 'No account found with that email or callsign.' }
  }

  const candidateHash = await hashPassword(input.password, account.salt)
  if (candidateHash !== account.passwordHash) {
    return { success: false, error: 'Incorrect password.' }
  }

  account.lastLoginAt = new Date().toISOString()
  writeAccounts(accounts)

  const session: AuthSession = {
    userId: account.id,
    email: account.email,
    username: account.username,
    signedInAt: account.lastLoginAt
  }
  writeStore(SESSION_STORAGE_KEY, JSON.stringify(session))
  notifyAuthListeners()

  return {
    success: true,
    user: toUserObject(account)
  }
}

export async function logoutAccount(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut()
    } catch {
      // Proceed with local session sign-out
    }
  }
  removeStore(SESSION_STORAGE_KEY)
  notifyAuthListeners()
}

export function updateLocalAccountUsername(userId: string, username: string): void {
  const trimmed = username.trim()
  if (!trimmed) return
  const accounts = readAccounts()
  const target = accounts.find((a) => a.id === userId)
  if (!target) return
  target.username = trimmed
  writeAccounts(accounts)

  const rawSession = readStore(SESSION_STORAGE_KEY)
  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession) as AuthSession
      if (parsed.userId === userId) {
        parsed.username = trimmed
        writeStore(SESSION_STORAGE_KEY, JSON.stringify(parsed))
      }
    } catch {
      // Ignore malformed session
    }
  }
  notifyAuthListeners()
}
