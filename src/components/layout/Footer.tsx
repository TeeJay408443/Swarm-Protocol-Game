import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-slate-carbon border-t border-gray-700 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-500 text-sm">
              SWARM PROTOCOL: SURVIVOR
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Tactical Command Terminal - Phase 4 Complete
            </p>
          </div>
          
          <div className="flex space-x-4 mb-4 md:mb-0">
            <Link 
              to="/hq" 
              className="text-gray-400 hover:text-cyan-accent transition-colors text-sm"
            >
              HQ
            </Link>
            <Link 
              to="/play" 
              className="text-gray-400 hover:text-cyan-accent transition-colors text-sm"
            >
              Play
            </Link>
            <Link 
              to="/codex" 
              className="text-gray-400 hover:text-cyan-accent transition-colors text-sm"
            >
              Codex
            </Link>
            <Link 
              to="/armory" 
              className="text-gray-400 hover:text-cyan-accent transition-colors text-sm"
            >
              Armory
            </Link>
            <Link 
              to="/leaderboards" 
              className="text-gray-400 hover:text-cyan-accent transition-colors text-sm"
            >
              Leaderboards
            </Link>
            <Link 
              to="/profile" 
              className="text-gray-400 hover:text-cyan-accent transition-colors text-sm"
            >
              Profile
            </Link>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-gray-500 text-sm">
              Built with ❤️ for the Web Development Class
            </p>
            <p className="text-gray-600 text-xs mt-1">
              © 2024 | React + TypeScript + Tailwind CSS + Supabase
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
