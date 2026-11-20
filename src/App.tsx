import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HQView } from './components/views/HQView'
import { PlayView } from './components/views/PlayView/PlayView'
import { CodexView } from './components/views/CodexView'
import { ArmoryView } from './components/views/ArmoryView'
import { ShopView } from './components/views/ShopView'
import { LeaderboardsView } from './components/views/LeaderboardsView'
import { ProfileView } from './components/views/ProfileView'
import { LoginView } from './components/views/LoginView'
import { ToastProvider } from './components/ui/ToastContainer'
import { AudioSettingsButton } from './components/ui/AudioSettings'
import { AccessibilitySettingsButton } from './components/ui/AccessibilitySettings'
import { DevPanel } from './components/ui/DevPanel'
import { AudioProvider } from './context/AudioContext'
import { AccessibilityProvider, AccessibilityStyles } from './context/AccessibilityContext'

function App() {
  return (
    <AccessibilityProvider>
      <AudioProvider>
        <ToastProvider position="top-right">
          <AccessibilityStyles />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Default redirect to HQ */}
                <Route index element={<Navigate to="/hq" replace />} />

                {/* Main Game Views */}
                <Route path="hq" element={<HQView />} />
                <Route path="play" element={<PlayView />} />
                <Route path="codex" element={<CodexView />} />
                <Route path="armory" element={<ArmoryView />} />
                <Route path="shop" element={<ShopView />} />
                <Route path="leaderboards" element={<LeaderboardsView />} />
                <Route path="profile" element={<ProfileView />} />
                <Route path="login" element={<LoginView />} />

                {/* Fallback for unknown routes */}
                <Route path="*" element={<Navigate to="/hq" replace />} />
              </Route>
            </Routes>
            <DevPanel />
          </BrowserRouter>
          <AccessibilitySettingsButton />
          <AudioSettingsButton />
        </ToastProvider>
      </AudioProvider>
    </AccessibilityProvider>
  )
}

export default App
