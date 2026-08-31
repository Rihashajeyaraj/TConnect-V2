import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Users2,
  Briefcase,
  DollarSign,
  FileText,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar as CalendarIcon,
  Shield,
  Activity,
  CheckCircle2,
  GripVertical,
  Receipt,
} from 'lucide-react'

import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearUserCache } from '../../utils/userScope.js'

// Exactly the 9 requested CEO main navigation items
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/ceo' },
  { label: 'Customers', icon: Users, path: '/ceo/customers' },
  { label: 'Team Management', icon: Users2, path: '/ceo/team-management' },
  { label: 'HRMS', icon: Briefcase, path: '/ceo/hrms' },
  { label: 'Expense Claims', icon: Receipt, path: '/ceo/expenses' },
  { label: 'Sales & Revenue', icon: TrendingUp, path: '/ceo/sales-revenue' },
  { label: 'Reports', icon: FileText, path: '/ceo/reports' },
  { label: 'Notifications', icon: Bell, path: '/ceo/notifications', badge: '3' },
  { label: 'Settings', icon: Settings, path: '/ceo/settings' },
]

const resolveOrderedNavItems = (savedLabels) => {
  if (!savedLabels || !Array.isArray(savedLabels)) return navItems
  const normalizedLabels = savedLabels.map((lbl) => {
    if (lbl === 'Sales Overview' || lbl === 'Revenue & Finance') return 'Sales & Revenue'
    return lbl
  })
  const uniqueLabels = [...new Set(normalizedLabels)]
  const ordered = []
  uniqueLabels.forEach((label) => {
    const match = navItems.find((n) => n.label === label)
    if (match) ordered.push(match)
  })
  navItems.forEach((n) => {
    if (!ordered.some((o) => o.label === n.label)) {
      ordered.push(n)
    }
  })
  return ordered
}

function CeoLayout() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const [sidebarItems, setSidebarItems] = useState(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_ceo_${userEmail}`);
    if (saved) {
      try {
        const labels = JSON.parse(saved);
        return resolveOrderedNavItems(labels);
      } catch (e) {
        return navItems;
      }
    }
    return navItems;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_ceo_${userEmail}`);
    if (saved) {
      try {
        const labels = JSON.parse(saved);
        setSidebarItems(resolveOrderedNavItems(labels));
      } catch (e) {
        setSidebarItems(navItems);
      }
    } else {
      setSidebarItems(navItems);
    }
  }, [userEmail]);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
  };
  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...sidebarItems];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setSidebarItems(reordered);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  const saveCustomization = () => {
    const labels = sidebarItems.map(item => item.label);
    localStorage.setItem(`tc_sidebar_order_ceo_${userEmail}`, JSON.stringify(labels));
    setIsCustomizing(false);
    showToast("Sidebar layout order saved successfully!", "success");
  };
  const resetCustomization = () => {
    localStorage.removeItem(`tc_sidebar_order_ceo_${userEmail}`);
    setSidebarItems(navItems);
    setIsCustomizing(false);
    showToast("Sidebar layout reset to default.", "info");
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Global search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const results = []

    // 1. Search nav pages
    navItems.forEach((item) => {
      if (item.label.toLowerCase().includes(query)) {
        results.push({ type: 'page', title: `Go to ${item.label}`, path: item.path, desc: 'Executive Navigation' })
      }
    })

    // 2. Search customers
    try {
      const savedCusts = JSON.parse(localStorage.getItem('tc_customer_accounts') || '[]')
      savedCusts.forEach((c) => {
        const name = c.company || c.name || ''
        const prod = c.product || ''
        const exec = c.sales_executive || ''
        if (name.toLowerCase().includes(query) || prod.toLowerCase().includes(query) || exec.toLowerCase().includes(query)) {
          results.push({
            type: 'customer',
            title: `Client: ${name}`,
            path: '/ceo/customers',
            desc: `Product: ${prod} · Executive: ${exec}`
          })
        }
      })
    } catch (e) {}

    // 3. Search leads
    try {
      const savedLeads = JSON.parse(localStorage.getItem('tc_leads') || '[]')
      savedLeads.forEach((l) => {
        const company = l.company || ''
        const contact = l.contact_person || ''
        const status = l.status || ''
        if (company.toLowerCase().includes(query) || contact.toLowerCase().includes(query) || status.toLowerCase().includes(query)) {
          results.push({
            type: 'lead',
            title: `Lead: ${company}`,
            path: '/ceo/sales-revenue',
            desc: `Contact: ${contact} · Stage: ${status}`
          })
        }
      })
    } catch (e) {}

    // 4. Search team members
    try {
      const savedUsers = JSON.parse(localStorage.getItem('tc_app_users') || '[]')
      savedUsers.forEach((u) => {
        const name = u.name || ''
        const dept = u.dept || ''
        const role = u.role || ''
        if (name.toLowerCase().includes(query) || dept.toLowerCase().includes(query) || role.toLowerCase().includes(query)) {
          results.push({
            type: 'employee',
            title: `Staff: ${name}`,
            path: '/ceo/team-management',
            desc: `${role} · Dept: ${dept}`
          })
        }
      })
    } catch (e) {}

    setSearchResults(results)
  }, [searchQuery])

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      const firstResult = searchResults[0]
      navigate(firstResult.path)
      setShowSearchResults(false)
      setSearchQuery('')
    }
  }

  // Handle Sign Out
  const handleSignOut = () => {
    clearUserCache()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }

  // Active item matcher
  const isNavActive = (itemPath) => {
    if (itemPath === '/ceo') {
      return location.pathname === '/ceo' || location.pathname === '/ceo/' || location.pathname === '/ceo/dashboard'
    }
    return location.pathname.startsWith(itemPath)
  }

  const mockSchedule = [
    { id: 1, title: 'Quarterly Executive Review', time: '10:30 AM - 11:30 AM', rep: 'Sales Managers' },
    { id: 2, title: 'Enterprise Deal Review', time: '02:00 PM - 03:00 PM', rep: 'Sales Team' },
    { id: 3, title: 'HR & Approvals Clearance', time: '04:30 PM - 05:00 PM', rep: 'Operations' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f8] text-slate-800 font-sans antialiased relative">
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity" />
      )}
      {/* CEO Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#EA6993]/20 bg-[#832D51] text-white shadow-2xl transition-all duration-300 w-64 lg:static lg:h-screen lg:shrink-0 ${
          isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'}`}
      >
        {/* Sidebar Header & Brand */}
        <div className="flex h-16 items-center justify-between border-b border-[#EA6993]/20 px-4 shrink-0 bg-[#832D51]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3a7d63] text-white shadow-md shadow-[#3a7d63]/30 border border-[#3a7d63]/40">
              <svg
                className="size-5"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8.8 6.5h18.4c1.4 0 2.2 1.6 1.4 2.7l-6.2 8.1h4.1c1.5 0 2.2 1.8 1.2 2.8L15.1 32c-1.2 1.1-3.1 0-2.7-1.6l2.3-9H8.9c-1.3 0-2.1-1.5-1.4-2.6l4.8-7.1H8.8c-1.4 0-2.2-1.7-1.3-2.8l.1-.1c.3-.4.7-.7 1.2-.7V6.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            {!isSidebarCollapsed && (
              <div className="animate-in fade-in duration-200 truncate">
                <p className="m-0 text-base font-black tracking-tight text-white leading-none">
                  Twite<span className="text-[#CFDD9D]">Connect</span>
                </p>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F8CAE4]/90">
                  CEO Portal
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:grid size-7 place-items-center rounded-lg border border-[#EA6993]/40 bg-[#6a2240]/30 text-[#cccccc] hover:text-white hover:bg-[#6a2240]/60 transition shrink-0"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isSidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            className="ml-auto rounded-lg p-1 text-[#cccccc] hover:bg-[#6a2240]/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation List - 9 Executive Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 bg-[#832D51] scrollbar-thin scrollbar-thumb-[#6a2240]">
          {sidebarItems.map((item, index) => {
            const Icon = item.icon
            const active = isNavActive(item.path)
            return (
              <div
                key={item.path}
                draggable={isCustomizing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative ${isCustomizing ? "cursor-move animate-pulse border border-dashed border-[#EA6993]/20 rounded-xl" : ""}`}
              >
                <Link
                  to={isCustomizing ? "#" : item.path}
                  onClick={(e) => {
                    if (isCustomizing) {
                      e.preventDefault();
                      return;
                    }
                    setSidebarOpen(false);
                  }}
                  title={isSidebarCollapsed ? item.label : ''}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 group relative ${
                    !isCustomizing && active
                      ? 'bg-[#EA6993] text-white font-bold shadow-md shadow-black/10 border border-[#EA6993]'
                      : 'text-[#f8f0f2] hover:bg-[#6a2240]/55 hover:text-white'
                  }`}
                >
                  {isCustomizing && !isSidebarCollapsed && <GripVertical size={14} className="text-white/40 shrink-0" />}
                  <Icon
                    className={`size-5 shrink-0 transition-transform group-hover:scale-105 ${
                      !isCustomizing && active ? 'text-white' : 'text-[#CFDD9D] group-hover:text-white'
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        !isCustomizing && active
                          ? 'bg-[#832D51] text-white'
                          : 'bg-[#3a7d63] text-white shadow-xs'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isSidebarCollapsed && item.badge && (
                    <span className="absolute top-2 right-2 size-2 rounded-full bg-[#3a7d63]" />
                  )}
                </Link>
              </div>
            )
          })}
          {!isSidebarCollapsed && (
            <div className="pt-2">
              {isCustomizing ? (
                <div className="pt-2 border-t border-[#EA6993]/20 space-y-1.5">
                  <button
                    type="button"
                    onClick={saveCustomization}
                    className="w-full py-2 px-3 bg-[#CFDD9D] hover:bg-[#c0ce8e] text-[#832D51] rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Save Order
                  </button>
                  <button
                    type="button"
                    onClick={resetCustomization}
                    className="w-full py-2 px-3 bg-[#6a2240] hover:bg-[#591732] text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomizing(true)}
                  className="w-full py-2 px-3 border border-dashed border-[#EA6993]/30 hover:border-[#EA6993] text-[#d8d8d8] hover:text-white rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚙️ Customize Sidebar</span>
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer: CEO Profile & Chief Executive Officer designation & Logout */}
        <div className="border-t border-[#EA6993]/20 p-3.5 shrink-0 bg-[#591732]">
          <div
            className={`flex items-center gap-3 rounded-xl bg-[#6a2240]/25 p-2.5 border border-[#EA6993]/20 ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            {/* CEO Avatar */}
            <div className="relative">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#832D51] via-[#EA6993] to-[#CFDD9D] text-sm font-black text-white shadow-md border border-white/20">
                {currentUser?.initials || 'CEO'}
              </span>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#591732]" />
            </div>

            {/* Profile Info */}
            {!isSidebarCollapsed && (
              <div className="flex-1 overflow-hidden text-left">
                <p className="m-0 text-xs font-bold text-white truncate leading-tight">
                  {currentUser?.name || 'Dr. Twite Executive'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-[#CFDD9D]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#CFDD9D] tracking-wider uppercase">
                    Chief Executive Officer
                  </span>
                </div>
                <p className="m-0 text-[10px] font-medium text-[#f2e6eb] truncate mt-0.5">
                  {currentUser?.email || 'ceo@twiteconnect.com'}
                </p>
              </div>
            )}

            {/* Logout Button */}
            {!isSidebarCollapsed && (
              <button
                onClick={handleSignOut}
                className="rounded-lg p-2 text-[#cccccc] hover:bg-[#832D51]/30 hover:text-red-300 transition-colors shrink-0"
                title="Sign Out"
                aria-label="Logout"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
          {isSidebarCollapsed && (
            <button
              onClick={handleSignOut}
              className="mt-2 w-full flex items-center justify-center p-2 rounded-lg text-[#cccccc] hover:bg-[#832D51]/30 hover:text-red-300 transition-colors"
              title="Sign Out"
              aria-label="Logout"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden h-screen">
        {/* Top Header */}
        <header className="relative flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            {/* Mobile Menu Toggle */}
            <button
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search across sales, reports, teams, revenue..."
                value={searchQuery}
                onKeyDown={handleSearchKeyDown}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchResults(true)
                }}
                onFocus={() => setShowSearchResults(true)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#832D51] focus:bg-white focus:ring-2 focus:ring-[#832D51]/10"
              />

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Matching Modules & Records
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                      {searchResults.map((res, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            navigate(res.path)
                            setShowSearchResults(false)
                            setSearchQuery('')
                          }}
                          className="w-full text-left rounded-xl p-2 transition hover:bg-slate-50 flex flex-col"
                        >
                          <span className="text-xs font-bold text-slate-900">{res.title}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{res.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center: CEO Role Indicator Tag */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-200/80 rounded-full px-4.5 py-1.5 shadow-xs pointer-events-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span
                className="text-xs uppercase tracking-[0.25em] font-black"
                style={{
                  background: 'linear-gradient(to right, #475569 20%, #832D51 40%, #EA6993 60%, #475569 80%)',
                  backgroundSize: '200% auto',
                  color: 'transparent',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  animation: 'tc-shimmer-ceo 3s linear infinite',
                  display: 'inline-block'
                }}
              >
                {currentUser?.role || 'Chief Executive Officer'}
              </span>
              <style>{`
                @keyframes tc-shimmer-ceo {
                  to {
                    background-position: -200% center;
                  }
                }
              `}</style>
            </div>
          </div>

          {/* Right Header Quick Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Agenda / Schedule Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={`rounded-xl p-2 transition border ${
                  calendarOpen
                    ? 'bg-[#F8CAE4]/30 text-[#832D51] border-[#EA6993]/40'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Today's Executive Agenda"
              >
                <CalendarIcon className="size-4.5" />
              </button>

              {calendarOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2.5 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl text-left">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Executive Schedule Today
                      </p>
                      <span className="text-[10px] font-bold text-[#832D51] bg-[#F8CAE4]/40 px-2 py-0.5 rounded-md">
                        3 Events
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {mockSchedule.map((item) => (
                        <div key={item.id} className="border-l-4 border-[#EA6993] bg-[#F8CAE4]/10 rounded-r-xl p-2.5">
                          <p className="text-xs font-bold text-slate-900">{item.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{item.time}</p>
                          <p className="text-[10px] text-[#832D51] font-bold mt-1">Lead: {item.rep}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications Link */}
            <Link
              to="/ceo/notifications"
              className="relative rounded-xl p-2 text-slate-600 border border-slate-200 transition hover:bg-slate-50"
              title="CEO Notifications"
            >
              <Bell className="size-4.5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#EA6993] ring-2 ring-white" />
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f4f6f8] text-slate-800">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default CeoLayout
