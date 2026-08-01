import { useState } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import {
  LayoutDashboard,
  Clock,
  MapPin,
  Target,
  DollarSign,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Executive Dashboard', icon: LayoutDashboard, path: '/sales' },
  { label: 'Clock In / Out & GPS', icon: Clock, path: '/sales/clock' },
  { label: 'Log Field Visit', icon: MapPin, path: '/sales/visit' },
  { label: 'My Leads', icon: Target, path: '/sales/leads' },
  { label: 'Claim Expense', icon: DollarSign, path: '/sales/expense' },
]

function SalesLayout() {
  const { showToast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    showToast('Logged out successfully', 'info')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Mobile Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/sales" className="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-xs">SE</span>
            <span>TConnect Field App</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs"
          >
            SE
          </button>
          {profileOpen && (
            <div className="absolute right-4 top-14 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 border-b border-slate-800 text-xs">
                <p className="font-semibold text-white">Sales Executive</p>
                <p className="text-slate-400">executive@tconnect.com</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={`fixed inset-y-0 left-0 z-20 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static pt-16 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-4xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Bottom Quick Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-30 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default SalesLayout
