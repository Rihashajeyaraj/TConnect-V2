import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  GitBranch,
  Users,
  FileText,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/ceo' },
  { label: 'Executive Summary', icon: TrendingUp, path: '/ceo/executive-summary' },
  { label: 'Sales Overview', icon: BarChart3, path: '/ceo/sales-overview' },
  { label: 'Sales Pipeline', icon: GitBranch, path: '/ceo/pipeline' },
  { label: 'Team Performance', icon: Users, path: '/ceo/team-performance' },
  { label: 'Reports & Analytics', icon: FileText, path: '/ceo/reports' },
  { label: 'Notifications', icon: Bell, path: '/ceo/notifications' },
  { label: 'Settings', icon: Settings, path: '/ceo/settings' },
]

function CeoLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()

  const activeNav = navItems.find((item) => location.pathname === item.path)

  const pageTitles = {
    '/ceo': 'Dashboard',
    '/ceo/executive-summary': 'Executive Summary',
    '/ceo/sales-overview': 'Sales Overview',
    '/ceo/pipeline': 'Sales Pipeline',
    '/ceo/team-performance': 'Team Performance',
    '/ceo/reports': 'Reports & Analytics',
    '/ceo/notifications': 'Notifications',
    '/ceo/settings': 'Settings',
  }

  const pageSubtitle = {
    '/ceo': 'CEO / Founder · Strategic Overview',
    '/ceo/executive-summary': 'CEO / Founder · Growth & Performance',
    '/ceo/sales-overview': 'CEO / Founder · Sales Analytics',
    '/ceo/pipeline': 'CEO / Founder · Deal Pipeline',
    '/ceo/team-performance': 'CEO / Founder · Team Insights',
    '/ceo/reports': 'CEO / Founder · Business Reports',
    '/ceo/notifications': 'CEO / Founder · Alerts & Updates',
    '/ceo/settings': 'CEO / Founder · Preferences',
  }

  return (
    <div className="flex min-h-screen bg-[#0a1020]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-emerald-500/10 bg-[#0f172a] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-emerald-500/10 px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
            <svg
              className="size-6"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8.8 6.5h18.4c1.4 0 2.2 1.6 1.4 2.7l-6.2 8.1h4.1c1.5 0 2.2 1.8 1.2 2.8L15.1 32c-1.2 1.1-3.1 0-2.7-1.6l2.3-9H8.9c-1.3 0-2.1-1.5-1.4-2.6l4.8-7.1H8.8c-1.4 0-2.2-1.7-1.3-2.8l.1-.1c.3-.4.7-.7 1.2-.7V6.5Z"
                fill="url(#sidebar-logo-gradient)"
              />
              <defs>
                <linearGradient id="sidebar-logo-gradient" x1="6" y1="5" x2="31" y2="31">
                  <stop stopColor="#10b981" />
                  <stop offset=".5" stopColor="#34d399" />
                  <stop offset="1" stopColor="#6ee7b7" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <div>
            <p className="m-0 text-lg font-black tracking-[-0.04em] text-white">
              Twite <span className="text-emerald-400">Connect</span>
            </p>
            <p className="m-0 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-emerald-400/60">
              CEO Dashboard
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-300 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                }`}
              >
                <Icon className={`size-5 ${isActive ? 'text-emerald-400' : ''}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-emerald-500/10 p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-500/10 hover:text-red-400">
            <LogOut className="size-5" />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-emerald-500/10 bg-[#0f172a]/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="rounded-xl p-2 text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">
                {pageTitles[location.pathname] || activeNav?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-slate-500">
                {pageSubtitle[location.pathname] || 'CEO / Founder'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative rounded-xl p-2 text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-300">
                <Bell className="size-5" />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-emerald-400 ring-2 ring-[#0f172a]" />
              </button>

              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded-xl p-1.5 text-sm text-slate-300 transition hover:bg-emerald-500/10"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-300 text-sm font-bold text-white">
                    JD
                  </span>
                  <span className="hidden text-sm font-medium sm:block">John Doe</span>
                  <ChevronDown className={`size-4 text-slate-500 transition ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-emerald-500/10 bg-[#1e293b] p-2 shadow-2xl shadow-black/40">
                      <Link
                        to="/ceo/settings"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                      >
                        <Settings className="size-4" />
                        Settings
                      </Link>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10">
                        <LogOut className="size-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <footer className="border-t border-emerald-500/10 px-6 py-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <p>&copy; 2026 TwiteConnect. All rights reserved.</p>
            <p>CEO Dashboard v1.0</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default CeoLayout
