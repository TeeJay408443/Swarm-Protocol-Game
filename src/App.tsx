import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-slate-carbon text-white">
      <header className="p-6 border-b border-gray-700">
        <h1 className="text-3xl font-bold text-cyan-accent">
          SWARM PROTOCOL: SURVIVOR
        </h1>
        <p className="text-gray-400 mt-2">
          Tactical Command Terminal - Phase 0: Setup Complete
        </p>
      </header>
      
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-hazard-gold mb-4">
              Mission Briefing
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Welcome to Swarm Protocol: Survivor. This is a 2D top-down arena horde 
              survival game built with React, HTML5 Canvas, Supabase, and Tailwind CSS.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Phase 0 setup is complete. The project structure is ready for development.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-cyan-accent text-2xl mb-2">🎮</div>
              <h3 className="font-semibold mb-2">Game Engine</h3>
              <p className="text-sm text-gray-400">HTML5 Canvas @ 60 FPS</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-hazard-gold text-2xl mb-2">🗄️</div>
              <h3 className="font-semibold mb-2">Database</h3>
              <p className="text-sm text-gray-400">Supabase PostgreSQL</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-alert-red text-2xl mb-2">⚡</div>
              <h3 className="font-semibold mb-2">UI Framework</h3>
              <p className="text-sm text-gray-400">Tailwind CSS</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <h3 className="font-semibold text-cyan-accent mb-2">Next Steps:</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Phase 1: Define game concept & identity</li>
              <li>Phase 2: Build seed dataset (29 entities)</li>
              <li>Phase 3: Design core game loop & wave logic</li>
              <li>Phase 4: Wireframe application views</li>
              <li>Phase 5: Create database schema & setup Supabase</li>
              <li>Phase 6: Build web application & CRUD UI</li>
              <li>Phase 7: Build HTML5 Canvas game engine</li>
              <li>Phase 8: Add features & polish</li>
              <li>Phase 9: Test & deploy to Vercel</li>
            </ol>
          </div>
        </div>
      </main>
      
      <footer className="p-6 border-t border-gray-700 text-center text-gray-500">
        <p>Swarm Protocol: Survivor - Built with ❤️ for the Web Development Class</p>
      </footer>
    </div>
  )
}

export default App
