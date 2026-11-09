import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HQView } from './components/views/HQView';
import { PlayView } from './components/views/PlayView';
import { CodexView } from './components/views/CodexView';
import { ArmoryView } from './components/views/ArmoryView';
import { LeaderboardsView } from './components/views/LeaderboardsView';
import { ProfileView } from './components/views/ProfileView';

function App() {
  return (
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
          <Route path="leaderboards" element={<LeaderboardsView />} />
          <Route path="profile" element={<ProfileView />} />
          
          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/hq" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
