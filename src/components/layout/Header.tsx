import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-slate-carbon border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/hq" className="flex items-center space-x-2">
            <div className="text-cyan-accent text-2xl">🎮</div>
            <span className="text-cyan-accent text-xl font-bold">
              SWARM PROTOCOL
            </span>
            <span className="text-gray-400 text-sm hidden md:block">SURVIVOR</span>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link 
              to="/hq" 
              className="px-4 py-2 text-gray-300 hover:text-cyan-accent hover:bg-gray-800 rounded transition-colors"
            >
              HQ
            </Link>
            <Link 
              to="/play" 
              className="px-4 py-2 text-gray-300 hover:text-cyan-accent hover:bg-gray-800 rounded transition-colors"
            >
              Play
            </Link>
            <Link 
              to="/codex" 
              className="px-4 py-2 text-gray-300 hover:text-cyan-accent hover:bg-gray-800 rounded transition-colors"
            >
              Codex
            </Link>
            <Link 
              to="/armory" 
              className="px-4 py-2 text-gray-300 hover:text-cyan-accent hover:bg-gray-800 rounded transition-colors"
            >
              Armory
            </Link>
            <Link 
              to="/leaderboards" 
              className="px-4 py-2 text-gray-300 hover:text-cyan-accent hover:bg-gray-800 rounded transition-colors"
            >
              Leaderboards
            </Link>
            <Link 
              to="/profile" 
              className="px-4 py-2 text-gray-300 hover:text-cyan-accent hover:bg-gray-800 rounded transition-colors"
            >
              Profile
            </Link>
          </nav>
          
          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-300 hover:text-cyan-accent">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
