import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSupabase } from '../../hooks/useSupabase'
import { useToast } from '../ui/ToastContainer'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import ValidatedInput from '../ui/ValidatedInput'
import { getOperativeProfile, saveOperativeProfile } from '../../services/scores'
import { loginAccount, logoutAccount, registerAccount } from '../../services/auth'
import { useShopState } from '../../services/shop'

const NAV_ITEMS = [
  { to: '/hq', label: 'HQ' },
  { to: '/play', label: 'Play' },
  { to: '/codex', label: 'Codex' },
  { to: '/armory', label: 'Armory' },
  { to: '/shop', label: 'Shop' },
  { to: '/leaderboards', label: 'Leaderboards' },
  { to: '/profile', label: 'Profile' },
  { to: '/login', label: 'Log In' }
]

export function Header() {
  const location = useLocation()
  const { user } = useSupabase()
  const toast = useToast()
  const { shopState } = useShopState(user?.id)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [operativeName, setOperativeName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const displayName =
    (user?.user_metadata?.username as string | undefined) ||
    (user?.email ? user.email.split('@')[0] : getOperativeProfile().username)

  const isActive = (path: string) => location.pathname === path || (path === '/hq' && location.pathname === '/')

  const handleSignOut = async () => {
    await logoutAccount()
    toast.info('Signed out of Tactical Command')
    setAuthModalOpen(false)
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    if (!email.trim() || password.length < 6) {
      const msg = 'Enter a valid email and password (6+ characters).'
      setAuthError(msg)
      toast.error(msg)
      return
    }

    setSubmitting(true)
    try {
      if (authMode === 'signin') {
        const res = await loginAccount({ identifier: email.trim(), password })
        if (!res.success || !res.user) {
          const msg = res.error || 'Failed to sign in.'
          setAuthError(msg)
          toast.error(msg)
        } else {
          const callsign =
            (res.user.user_metadata?.username as string | undefined) ||
            res.user.email?.split('@')[0] ||
            'Operative'
          saveOperativeProfile({ username: callsign }, res.user.id)
          toast.success(`Authenticated as ${callsign}`)
          setEmail('')
          setPassword('')
          setAuthModalOpen(false)
        }
      } else {
        const callsign = operativeName.trim() || email.trim().split('@')[0]
        const res = await registerAccount({
          username: callsign,
          email: email.trim(),
          password
        })
        if (!res.success || !res.user) {
          const msg = res.error || 'Could not create account.'
          setAuthError(msg)
          toast.error(msg)
        } else {
          saveOperativeProfile({ username: callsign }, res.user.id)
          toast.success(`Operative account created! Welcome, ${callsign}.`)
          setOperativeName('')
          setEmail('')
          setPassword('')
          setAuthModalOpen(false)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to process account request.'
      setAuthError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <header className="bg-[#0F1733]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/hq" className="flex items-center space-x-2 shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <div className="text-sky-300 text-2xl">🎮</div>
            <span className="font-display text-sky-300 text-xl font-extrabold tracking-wide whitespace-nowrap">
              SWARM PROTOCOL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3.5 py-1.5 rounded-full transition-colors text-sm font-semibold whitespace-nowrap shrink-0 ${
                  isActive(item.to)
                    ? 'bg-sky-400/20 text-sky-200 border border-sky-300/45'
                    : 'text-slate-300 hover:text-sky-200 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <Link
              to="/shop"
              className="ml-2 px-3 py-1.5 rounded-full border border-amber-300/45 bg-amber-400/10 text-xs font-bold text-amber-200 hover:bg-amber-400/20 transition-colors tabular-nums whitespace-nowrap shrink-0"
              title="Battle Coins available in Shop"
            >
              {shopState.balance.toLocaleString()} Coins
            </Link>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="ml-2 px-3.5 py-1.5 rounded-full border border-sky-300/45 bg-sky-400/10 text-xs font-semibold text-sky-200 hover:bg-sky-400/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Operative account settings"
            >
              {user ? displayName : `${displayName} (Guest)`}
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-gray-300 hover:text-cyan-accent rounded focus:outline-none focus:ring-2 focus:ring-cyan-accent"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 pt-2 border-t border-gray-800 space-y-1" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm font-medium ${
                  isActive(item.to)
                    ? 'bg-gray-800 text-cyan-accent border-l-2 border-cyan-accent'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-cyan-accent'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm font-semibold text-hazard-gold hover:bg-gray-800 tabular-nums"
            >
              Shop Wallet: {shopState.balance.toLocaleString()} Coins
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setAuthModalOpen(true)
              }}
              className="w-full text-left px-3 py-2 rounded text-sm font-semibold text-hazard-gold hover:bg-gray-800"
            >
              Operative: {displayName}
            </button>
          </nav>
        )}
      </div>

      {/* Operative Auth / Callsign Modal */}
      <Modal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={user ? 'Operative Session' : 'Operative Identity'}
        size="sm"
      >
        {user ? (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded p-4">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-white font-semibold">{user.email}</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setAuthModalOpen(false)}>
                Close
              </Button>
              <Button variant="danger" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="flex space-x-2 mb-2">
              <Button
                type="button"
                size="sm"
                variant={authMode === 'signin' ? 'primary' : 'secondary'}
                onClick={() => {
                  setAuthMode('signin')
                  setAuthError(null)
                }}
              >
                Sign In
              </Button>
              <Button
                type="button"
                size="sm"
                variant={authMode === 'signup' ? 'primary' : 'secondary'}
                onClick={() => {
                  setAuthMode('signup')
                  setAuthError(null)
                }}
              >
                Create Account
              </Button>
            </div>
            {authError && (
              <div className="px-3 py-2 rounded bg-red-950/60 border border-alert-red text-red-200 text-xs">
                {authError}
              </div>
            )}
            {authMode === 'signup' && (
              <ValidatedInput
                name="operative_name"
                label="Callsign"
                value={operativeName}
                onChange={setOperativeName}
                placeholder="NovaStriker"
                rules={[
                  { type: 'required', message: 'Callsign is required' },
                  { type: 'minLength', value: 3, message: 'Please enter 3-20 characters' },
                  { type: 'maxLength', value: 20, message: 'Please enter 3-20 characters' }
                ]}
              />
            )}
            <ValidatedInput
              name="auth_email"
              label={authMode === 'signin' ? 'Email or Callsign' : 'Email'}
              type={authMode === 'signup' ? 'email' : 'text'}
              value={email}
              onChange={setEmail}
              placeholder="operative@swarm.io"
              rules={[{ type: 'required', message: 'Email or callsign is required' }]}
            />
            <ValidatedInput
              name="auth_password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Minimum 6 characters"
              rules={[
                { type: 'required', message: 'Password is required' },
                { type: 'minLength', value: 6, message: 'At least 6 characters' }
              ]}
            />

            <div className="flex justify-between items-center pt-2">
              <Link
                to="/login"
                onClick={() => setAuthModalOpen(false)}
                className="text-xs text-cyan-accent hover:underline"
              >
                Open full Log In tab
              </Link>
              <div className="flex space-x-2">
                <Button type="button" variant="ghost" onClick={() => setAuthModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting
                    ? 'Processing...'
                    : authMode === 'signin'
                      ? 'Sign In'
                      : 'Create Account'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </header>
  )
}

export default Header
