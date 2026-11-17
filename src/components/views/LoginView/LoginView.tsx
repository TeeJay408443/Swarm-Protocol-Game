import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import ValidatedInput from '../../ui/ValidatedInput'
import { useToast } from '../../ui/ToastContainer'
import { useSupabase } from '../../../hooks/useSupabase'
import { heroes } from '../../../db/seedData'
import {
  listSavedAccounts,
  loginAccount,
  logoutAccount,
  registerAccount,
  type PublicAccountSummary
} from '../../../services/auth'
import {
  getPlayerTelemetry,
  saveOperativeProfile,
  type LocalPlayerTelemetry
} from '../../../services/scores'

type AuthTab = 'login' | 'register'

export function LoginView() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useSupabase()

  const [mode, setMode] = useState<AuthTab>('register')
  const [identifier, setIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [favoriteHero, setFavoriteHero] = useState(heroes[0].id)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savedAccounts, setSavedAccounts] = useState<PublicAccountSummary[]>(() => listSavedAccounts())
  const [telemetry, setTelemetry] = useState<LocalPlayerTelemetry | null>(null)
  const [showSwitchForm, setShowSwitchForm] = useState(false)

  useEffect(() => {
    setSavedAccounts(listSavedAccounts())
    if (user?.id) {
      getPlayerTelemetry(user.id).then(setTelemetry).catch(() => {})
    } else {
      setTelemetry(null)
    }
  }, [user?.id])

  const activeCallsign =
    (user?.user_metadata?.username as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Guest Operative'

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (registerPassword !== confirmPassword) {
      const msg = 'Passwords do not match.'
      setErrorMsg(msg)
      toast.error(msg)
      return
    }

    setSubmitting(true)
    try {
      const result = await registerAccount({
        username,
        email,
        password: registerPassword,
        favoriteHero
      })

      if (!result.success || !result.user) {
        const msg = result.error || 'Could not create account.'
        setErrorMsg(msg)
        toast.error(msg)
        return
      }

      saveOperativeProfile({ username: username.trim() }, result.user.id)
      setSavedAccounts(listSavedAccounts())
      setUsername('')
      setEmail('')
      setRegisterPassword('')
      setConfirmPassword('')
      setShowSwitchForm(false)
      toast.success(`Account created! Welcome, ${result.user.user_metadata?.username || username.trim()}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create account.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const result = await loginAccount({
        identifier,
        password: loginPassword
      })

      if (!result.success || !result.user) {
        const msg = result.error || 'Invalid credentials.'
        setErrorMsg(msg)
        toast.error(msg)
        return
      }

      const signedCallsign =
        (result.user.user_metadata?.username as string | undefined) ||
        result.user.email?.split('@')[0] ||
        'Operative'
      saveOperativeProfile({ username: signedCallsign }, result.user.id)
      setSavedAccounts(listSavedAccounts())
      setIdentifier('')
      setLoginPassword('')
      setShowSwitchForm(false)
      toast.success(`Welcome back, ${signedCallsign}!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await logoutAccount()
    setShowSwitchForm(false)
    setMode('login')
    toast.info('Signed out of Tactical Command.')
  }

  const prefillAccountLogin = (acct: PublicAccountSummary) => {
    setMode('login')
    setIdentifier(acct.email)
    setLoginPassword('')
    setErrorMsg(null)
    setShowSwitchForm(true)
  }

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">LOG IN & ACCOUNTS</h1>
        <p className="text-gray-400 mt-2">
          Create an Operative account or sign in to save your runs, loadouts, and rank progression separately.
        </p>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {user && !showSwitchForm ? (
            <Card className="bg-gray-900 border-cyan-accent/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-accent to-hazard-gold flex items-center justify-center text-2xl font-bold text-slate-950 shrink-0">
                    {activeCallsign.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold text-white">{activeCallsign}</h2>
                      <Badge variant="success" size="sm">Active Account</Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
                  </div>
                </div>

                <Button variant="danger" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 my-6">
                <div className="bg-gray-800 rounded p-3 text-center">
                  <p className="text-xs text-gray-400">Runs</p>
                  <p className="text-xl font-bold text-white">{telemetry?.total_games ?? 0}</p>
                </div>
                <div className="bg-gray-800 rounded p-3 text-center">
                  <p className="text-xs text-gray-400">Best Wave</p>
                  <p className="text-xl font-bold text-cyan-accent">{telemetry?.highest_wave ?? 0}</p>
                </div>
                <div className="bg-gray-800 rounded p-3 text-center">
                  <p className="text-xs text-gray-400">Best Score</p>
                  <p className="text-xl font-bold text-hazard-gold">
                    {(telemetry?.highest_score ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => navigate('/play')}>
                  Deploy Now
                </Button>
                <Button variant="secondary" onClick={() => navigate('/armory')}>
                  Open Armory
                </Button>
                <Button variant="secondary" onClick={() => navigate('/profile')}>
                  View Profile
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowSwitchForm(true)
                    setMode('register')
                  }}
                >
                  Create or Switch Account
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-gray-900">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === 'login' ? 'primary' : 'secondary'}
                    onClick={() => {
                      setMode('login')
                      setErrorMsg(null)
                    }}
                  >
                    Log In
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'register' ? 'primary' : 'secondary'}
                    onClick={() => {
                      setMode('register')
                      setErrorMsg(null)
                    }}
                  >
                    Create Account
                  </Button>
                </div>

                {user && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSwitchForm(false)}
                  >
                    Back to Active Account
                  </Button>
                )}
              </div>

              {errorMsg && (
                <div className="mb-4 px-4 py-3 rounded bg-red-950/60 border border-alert-red text-red-200 text-sm">
                  {errorMsg}
                </div>
              )}

              {mode === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <ValidatedInput
                    name="register_username"
                    label="Operative Callsign"
                    value={username}
                    onChange={setUsername}
                    placeholder="e.g. NovaStriker"
                    rules={[
                      { type: 'required', message: 'Callsign is required' },
                      { type: 'minLength', value: 3, message: 'At least 3 characters' },
                      { type: 'maxLength', value: 20, message: 'Maximum 20 characters' }
                    ]}
                  />

                  <ValidatedInput
                    name="register_email"
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="operative@swarm.io"
                    rules={[{ type: 'required', message: 'Email is required' }]}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidatedInput
                      name="register_password"
                      label="Password"
                      type="password"
                      value={registerPassword}
                      onChange={setRegisterPassword}
                      placeholder="Minimum 6 characters"
                      rules={[
                        { type: 'required', message: 'Password is required' },
                        { type: 'minLength', value: 6, message: 'Minimum 6 characters' }
                      ]}
                    />

                    <ValidatedInput
                      name="register_confirm_password"
                      label="Confirm Password"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Re-enter password"
                      rules={[{ type: 'required', message: 'Please confirm your password' }]}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register_hero"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Preferred Hero Unit
                    </label>
                    <select
                      id="register_hero"
                      value={favoriteHero}
                      onChange={(e) => setFavoriteHero(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-accent"
                    >
                      {heroes.map((hero) => (
                        <option key={hero.id} value={hero.id}>
                          {hero.name} ({hero.archetype})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? 'Creating Account...' : 'Create Operative Account'}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <ValidatedInput
                    name="login_identifier"
                    label="Email or Callsign"
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder="operative@swarm.io or NovaStriker"
                    rules={[{ type: 'required', message: 'Email or callsign is required' }]}
                  />

                  <ValidatedInput
                    name="login_password"
                    label="Password"
                    type="password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    placeholder="Enter your password"
                    rules={[{ type: 'required', message: 'Password is required' }]}
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? 'Signing In...' : 'Log In to Account'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-gray-900">
            <h3 className="text-lg font-semibold text-cyan-accent mb-3">
              Saved Accounts ({savedAccounts.length})
            </h3>
            {savedAccounts.length === 0 ? (
              <p className="text-sm text-gray-400">
                No accounts created yet. Register on the left to save separate loadouts, achievements, and scores for each player.
              </p>
            ) : (
              <div className="space-y-2.5">
                {savedAccounts.map((acct) => {
                  const isCurrent = user?.id === acct.id
                  const heroName = heroes.find((h) => h.id === acct.favoriteHero)?.name || 'Vanguard Blade'
                  return (
                    <div
                      key={acct.id}
                      className={`p-3 rounded border ${
                        isCurrent
                          ? 'bg-cyan-accent/10 border-cyan-accent/60'
                          : 'bg-gray-800/80 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{acct.username}</p>
                          <p className="text-xs text-gray-400 truncate">{acct.email}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{heroName}</p>
                        </div>
                        {isCurrent ? (
                          <Badge variant="success" size="sm">Online</Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => prefillAccountLogin(acct)}
                          >
                            Log In
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="bg-gray-900">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-hazard-gold mb-2">
              Account Perks
            </h3>
            <ul className="text-xs text-gray-300 space-y-2">
              <li>• Dedicated Armory loadouts saved per operative</li>
              <li>• Separate rank progression, stats, and achievements</li>
              <li>• Instant Leaderboard attribution under your callsign</li>
              <li>• Quick switching between multiple players on one device</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default LoginView
