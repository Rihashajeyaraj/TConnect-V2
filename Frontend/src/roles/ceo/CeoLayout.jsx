import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import TwiteConnectLogo from '../../common/TwiteConnectLogo.jsx'
import useNotificationCount from '../../hooks/useNotificationCount.js'
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
  ChevronDown,
  UserCircle,
  Search,
  Calendar as CalendarIcon,
  Shield,
  Activity,
  CheckCircle2,
  GripVertical,
  Receipt,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearUserCache } from '../../utils/userScope.js'

// Exactly the requested CEO main navigation items with Live Radar Map
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/ceo' },
  { label: 'Live Radar Map', icon: MapPin, path: '/ceo/smart-map' },
  { label: 'Clients', icon: Users, path: '/ceo/customers' },
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
    if (lbl === 'Customers') return 'Clients'
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
  const { unreadCount } = useNotificationCount()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('tc_sidebar_minimized') === 'true')

  const toggleSidebarMinimize = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('tc_sidebar_minimized', String(next))
      return next
    })
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

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
    <div className="h-screen overflow-hidden bg-purple-50/30 text-slate-800 flex flex-col font-sans antialiased relative">
      {/* ── CEO Portal Micro-Animations & Responsive Styles ───────────────── */}
      <style>{`
        /* Tactile Click Effect for All Buttons, Toggles & Cards */
        .ceo-portal-content button,
        .ceo-portal-content a,
        .ceo-portal-content [role="button"],
        header button,
        header a {
          transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease;
        }
        .ceo-portal-content button:active,
        .ceo-portal-content a:active,
        .ceo-portal-content [role="button"]:active,
        header button:active,
        header a:active {
          transform: scale(0.96) !important;
        }

        /* CEO Portal Global Font Size Increase & High Legibility Styles */
        .ceo-portal-content {
          font-size: 1rem; /* 16px base font size */
          line-height: 1.55;
        }
        .ceo-portal-content .text-xs {
          font-size: 0.84375rem !important; /* ~13.5px */
        }
        .ceo-portal-content .text-\[9px\],
        .ceo-portal-content .text-\[10px\],
        .ceo-portal-content .text-\[11px\] {
          font-size: 0.8125rem !important; /* ~13px minimum */
        }
        .ceo-portal-content .text-sm {
          font-size: 0.96875rem !important; /* ~15.5px */
        }
        .ceo-portal-content .text-base {
          font-size: 1.09375rem !important; /* ~17.5px */
        }
        .ceo-portal-content .text-lg {
          font-size: 1.28125rem !important; /* ~20.5px */
        }
        .ceo-portal-content .text-xl {
          font-size: 1.46875rem !important; /* ~23.5px */
        }
        .ceo-portal-content .text-2xl {
          font-size: 1.8125rem !important; /* ~29px */
        }
        .ceo-portal-content .text-3xl {
          font-size: 2.25rem !important; /* ~36px */
        }
        .ceo-portal-content .text-4xl {
          font-size: 2.625rem !important; /* ~42px */
        }

        @media (max-width: 640px) {
          .ceo-portal-content {
            font-size: 0.90625rem;
          }
          .ceo-portal-content h1 {
            font-size: 1.25rem !important;
            line-height: 1.35 !important;
          }
          .ceo-portal-content h2 {
            font-size: 1.125rem !important;
            line-height: 1.35 !important;
          }
          .ceo-portal-content h3 {
            font-size: 1rem !important;
            line-height: 1.35 !important;
          }
          .ceo-portal-content .text-sm {
            font-size: 0.84375rem !important;
          }
          .ceo-portal-content .text-xs {
            font-size: 0.78125rem !important;
          }
          .ceo-portal-content table th,
          .ceo-portal-content table td {
            padding: 0.625rem 0.625rem !important;
            font-size: 0.8125rem !important;
          }
          .ceo-portal-content .p-5,
          .ceo-portal-content .p-6,
          .ceo-portal-content .p-8 {
            padding: 1rem !important;
          }
          .ceo-portal-content .px-6,
          .ceo-portal-content .px-8 {
            padding-left: 0.875rem !important;
            padding-right: 0.875rem !important;
          }
          .ceo-portal-content .gap-4,
          .ceo-portal-content .gap-6 {
            gap: 0.875rem !important;
          }
        }
      `}</style>

      {/* ── Top Navigation Bar (Full Width) ────────────────────────────────── */}
      <header className="relative h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-purple-100 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 hover:bg-purple-50 cursor-pointer"
            aria-label="Toggle Navigation Sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-purple-700" /> : <Menu className="w-5 h-5 text-purple-700" />}
          </button>
          <Link to="/ceo" className="flex items-center gap-2">
            <TwiteConnectLogo className="w-7 h-7 sm:w-9 sm:h-9" />
          </Link>
        </div>

        {/* Center: CEO Role Tag Badge */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-purple-100 border border-purple-200 rounded-full px-3.5 sm:px-5 py-1 sm:py-1.5 shadow-2xs pointer-events-auto">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-purple-600"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-purple-900">
              CEO PORTAL
            </span>
          </div>
        </div>

        {/* Right Header Navigation & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Notification Bell */}
          <button
            onClick={() => navigate('/ceo/notifications')}
            className="p-1.5 sm:p-2 rounded-xl text-purple-700 hover:bg-purple-50 relative transition cursor-pointer border border-purple-200/80 bg-white"
            title="Notifications & Messages"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black shadow-xs ring-2 ring-white animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* CEO Profile Avatar + Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-purple-50 transition cursor-pointer border border-purple-200/80 bg-white"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-purple-200 border border-purple-300 flex items-center justify-center text-purple-950 font-black text-[11px] sm:text-xs shadow-2xs shrink-0">
                {currentUser?.initials || 'CEO'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-extrabold text-[11px] sm:text-xs text-slate-800 leading-tight flex items-center gap-1">
                  {currentUser?.name || 'Dr. Twite Executive'} <ChevronDown size={12} className="text-purple-400" />
                </span>
                <span className="text-[9px] sm:text-[10px] text-purple-700 font-extrabold leading-tight truncate max-w-[120px]">CEO</span>
              </div>
            </button>

            {profileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-white border border-purple-100 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden">
                  <div className="flex items-center gap-2.5 p-2.5 sm:p-3 bg-purple-100 border border-purple-200 rounded-xl text-purple-950 mb-2 shadow-2xs">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white text-purple-800 flex items-center justify-center text-xs sm:text-sm font-black shadow-md shrink-0">
                      {currentUser?.initials || 'CEO'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm truncate leading-tight">{currentUser?.name || 'Dr. Twite Executive'}</h4>
                      <p className="text-[10px] sm:text-[11px] opacity-90 truncate leading-tight mt-0.5">{currentUser?.email || 'ceo@twiteconnect.com'}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold tracking-wider uppercase">CEO</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to="/ceo/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 text-slate-700 font-bold text-xs transition"
                    >
                      <Settings size={14} className="text-purple-600" /> Account & Security Settings
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-purple-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      handleSignOut()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition cursor-pointer"
                  >
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout Body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 min-w-0 relative overflow-hidden">
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity" />
        )}

        {/* CEO Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-60 sm:w-64 bg-white text-slate-700 border-r border-purple-100 shadow-xl shadow-purple-950/5 transition-all duration-200 ease-in-out lg:translate-x-0 lg:static shrink-0 flex flex-col h-full ${
            isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Mobile-only Sidebar Close Header */}
          <div className="lg:hidden flex items-center justify-between px-3.5 py-2.5 border-b border-purple-200 bg-purple-100 text-purple-950 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-white flex items-center justify-center text-purple-700 text-[9px] font-black">TC</span>
              <span className="text-[11px] font-black text-white uppercase tracking-widest">CEO Portal</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-xl text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Minimize/Maximize Toggle Button */}
          <div className="hidden lg:flex items-center justify-end px-3 py-2 border-b border-purple-100">
            <button
              type="button"
              onClick={toggleSidebarMinimize}
              className={`p-1.5 rounded-xl hover:bg-purple-50 text-slate-500 hover:text-purple-700 transition cursor-pointer flex items-center gap-2 ${
                isSidebarCollapsed ? "w-full justify-center" : ""
              }`}
              title={isSidebarCollapsed ? "Maximize Sidebar" : "Minimize Sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={18} className="text-purple-600" />
              ) : (
                <>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Minimize</span>
                  <PanelLeftClose size={16} />
                </>
              )}
            </button>
          </div>

          {/* Navigation List - 9 Executive Items */}
          <nav className="flex-1 overflow-y-auto px-2.5 sm:px-3 py-3 sm:py-4 space-y-1 sm:space-y-1.5 bg-white scrollbar-thin scrollbar-thumb-purple-200">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              const active = isNavActive(item.path)
              return (
                <div
                  key={item.path}
                  draggable={isCustomizing && !isSidebarCollapsed}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative ${isCustomizing && !isSidebarCollapsed ? "cursor-move animate-pulse border border-dashed border-purple-300 rounded-xl" : ""}`}
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
                    title={item.label}
                    className={`flex items-center ${isSidebarCollapsed ? "justify-center p-3" : "gap-3 sm:gap-3.5 px-3.5 py-2.5 sm:px-4 sm:py-3"} rounded-xl text-sm sm:text-base font-bold transition-all duration-150 group relative ${
                      !isCustomizing && active
                        ? 'bg-purple-200 text-purple-950 border border-purple-300/80 font-extrabold shadow-2xs'
                        : 'text-slate-700 hover:bg-purple-50/80 hover:text-purple-800'
                    }`}
                  >
                    {isCustomizing && !isSidebarCollapsed && <GripVertical size={16} className="text-slate-400 shrink-0" />}
                    <div className="relative flex items-center justify-center shrink-0">
                      <Icon
                        className={`size-5 sm:size-5.5 shrink-0 transition-transform group-hover:scale-105 ${
                          !isCustomizing && active ? 'text-purple-950' : 'text-purple-600 group-hover:text-purple-700'
                        }`}
                      />
                      {isSidebarCollapsed && unreadCount > 0 && (item.path.includes("notifications") || item.label.includes("Notification") || item.label.includes("Message")) && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                      )}
                    </div>
                    {!isSidebarCollapsed && (
                      <span className="truncate flex-1 text-left text-sm sm:text-[15px] font-extrabold">{item.label}</span>
                    )}
                    {!isSidebarCollapsed && unreadCount > 0 && (item.path.includes("notifications") || item.label.includes("Notification") || item.label.includes("Message")) && (
                      <span className="ml-auto bg-rose-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs ring-2 ring-white animate-pulse">
                        🔴 {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {!isSidebarCollapsed && item.badge && !(item.path.includes("notifications") || item.label.includes("Notification") || item.label.includes("Message")) && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-black ${
                          !isCustomizing && active
                            ? 'bg-purple-300 text-purple-950 border border-purple-400'
                            : 'bg-purple-100 text-purple-700 border border-purple-200 shadow-xs'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              )
            })}
            {!isSidebarCollapsed && (
              <div className="pt-2">
                {isCustomizing ? (
                  <div className="pt-2 border-t border-purple-100 space-y-1.5">
                    <button
                      type="button"
                      onClick={saveCustomization}
                      className="w-full py-1.5 sm:py-2 px-3 bg-purple-200 hover:bg-purple-300 text-purple-950 border border-purple-300 rounded-xl text-xs font-black transition cursor-pointer shadow-2xs"
                    >
                      Save Order
                    </button>
                    <button
                      type="button"
                      onClick={resetCustomization}
                      className="w-full py-1.5 sm:py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-black transition cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomizing(true)}
                    className="w-full py-1.5 sm:py-2 px-3 border border-dashed border-purple-200 hover:border-purple-400 text-purple-700 hover:bg-purple-50 rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⚙️ Customize Sidebar</span>
                  </button>
                )}
              </div>
            )}
          </nav>
        </aside>

        {/* Dynamic Page Content - Scrollable Main Area */}
        <main className="ceo-portal-content flex-1 overflow-y-auto h-full p-3 sm:p-5 lg:p-6 bg-purple-50/20 text-slate-800">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default CeoLayout
