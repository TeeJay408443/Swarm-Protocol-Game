import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

export function Layout() {
  const location = useLocation()
  const isFrontPage = location.pathname === '/hq' || location.pathname === '/'

  return (
    <div className="min-h-screen bg-slate-carbon text-white flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col">
        <div key={location.pathname} className="animate-screen-enter flex-grow flex flex-col">
          <Outlet />
        </div>
      </main>
      {!isFrontPage && <Footer />}
    </div>
  )
}

export default Layout
