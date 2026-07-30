import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import {
  LayoutDashboard,
  Target,
  Users,
  Calendar as CalendarIcon,
  MessageSquare,
  GitBranch,
  UserCheck,
  Clock,
  CalendarDays,
  DollarSign,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Search,
  Plus,
  Bell,
  ChevronLeft,
  ChevronRight,
  User,
  PlusCircle,
  Briefcase,
  CheckCircle,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/ceo' },
  { label: 'Leads', icon: Target, path: '/ceo/leads' },
  { label: 'Customer', icon: UserCheck, path: '/ceo/customer' },
  { label: 'Visits', icon: CalendarIcon, path: '/ceo/visits' },
  { label: 'Follow-ups', icon: MessageSquare, path: '/ceo/followups' },
  { label: 'Sales Pipeline', icon: GitBranch, path: '/ceo/opportunities' },
  { label: 'HRMS', icon: Users, path: '/ceo/hrms' },
  { label: 'Expenses', icon: DollarSign, path: '/ceo/expenses' },
  { label: 'Reports', icon: FileText, path: '/ceo/reports' },
  { label: 'Settings', icon: Settings, path: '/ceo/settings' },
]

function CeoLayout() {
  const { showToast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [quickActionOpen, setQuickActionOpen] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Quick Action form state
  const [actionType, setActionType] = useState('lead') // lead or opportunity
  const [leadName, setLeadName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadSource, setLeadSource] = useState('Website')
  const [leadAssigned, setLeadAssigned] = useState('John Doe')
  const [oppValue, setOppValue] = useState('')
  const [oppStage, setOppStage] = useState('Lead')

  const location = useLocation()
  const navigate = useNavigate()



  // Sync state with pages using custom window event
  const dispatchStateUpdate = () => {
    window.dispatchEvent(new Event('tc_state_update'))
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Handle global search filtering
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const results = []

    // Search pages
    navItems.forEach(item => {
      if (item.label.toLowerCase().includes(query)) {
        results.push({ type: 'page', title: `Go to ${item.label}`, path: item.path, desc: 'Sidebar Menu Page' })
      }
    })

    // Search leads from localStorage
    const savedLeads = JSON.parse(localStorage.getItem('tc_leads')) || []
    savedLeads.forEach(lead => {
      if (lead.name.toLowerCase().includes(query) || lead.company.toLowerCase().includes(query)) {
        results.push({ type: 'lead', title: lead.name, path: '/ceo/leads', desc: `Lead at ${lead.company}` })
      }
    })

    // Search opportunities
    const savedOpps = JSON.parse(localStorage.getItem('tc_opportunities')) || []
    savedOpps.forEach(opp => {
      if (opp.company.toLowerCase().includes(query)) {
        results.push({ type: 'opportunity', title: `Deal: ${opp.company}`, path: '/ceo/opportunities', desc: `Value: ₹${opp.value.toLocaleString()} (${opp.stage})` })
      }
    })

    setSearchResults(results)
  }, [searchQuery])

  // Handle Quick Action submissions
  const handleQuickActionSubmit = (e) => {
    e.preventDefault()

    if (actionType === 'lead') {
      if (!leadName || !companyName) {
        showToast('Please fill out all required fields!', 'error')
        return
      }
      const savedLeads = JSON.parse(localStorage.getItem('tc_leads')) || []
      const newLead = {
        id: Date.now().toString(),
        name: leadName,
        company: companyName,
        status: 'New',
        source: leadSource,
        assigned: leadAssigned,
        phone: leadPhone || '+91 99999 88888',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        color: 'bg-blue-600',
      }
      localStorage.setItem('tc_leads', JSON.stringify([newLead, ...savedLeads]))
      
      // Auto-add customer as well
      const savedCustomers = JSON.parse(localStorage.getItem('tc_customers')) || []
      const newCust = {
        id: Date.now().toString(),
        name: companyName,
        contact: leadName,
        email: `${leadName.toLowerCase().replace(' ', '')}@${companyName.toLowerCase().replace(' ', '')}.com`,
        phone: leadPhone || '+91 99999 88888',
        location: 'Chennai',
        value: '₹0',
        color: 'bg-blue-500',
      }
      localStorage.setItem('tc_customers', JSON.stringify([newCust, ...savedCustomers]))

      // Reset
      setLeadName('')
      setCompanyName('')
      setLeadPhone('')
      showToast(`Lead for ${companyName} created successfully!`, 'success')
    } else {
      if (!companyName || !oppValue) {
        showToast('Please fill out all required fields!', 'error')
        return
      }
      const savedOpps = JSON.parse(localStorage.getItem('tc_opportunities')) || []
      const newOpp = {
        id: Date.now().toString(),
        company: companyName,
        rep: leadAssigned,
        value: parseFloat(oppValue) || 10000,
        stage: oppStage,
        probability: oppStage === 'Won' ? 100 : oppStage === 'Lost' ? 0 : 30,
        age: 1,
      }
      localStorage.setItem('tc_opportunities', JSON.stringify([newOpp, ...savedOpps]))
      
      // Reset
      setCompanyName('')
      setOppValue('')
      setOppStage('Lead')
      showToast(`Opportunity for ${companyName} created successfully!`, 'success')
    }

    dispatchStateUpdate()
    setQuickActionOpen(false)
  }

  // Handle Sign Out
  const handleSignOut = () => {
    showToast('Logged out successfully', 'info')
    navigate('/')
  }

  const activeNav = navItems.find((item) => location.pathname === item.path)

  const pageTitles = {
    '/ceo': 'Dashboard',
    '/ceo/leads': 'Leads',
    '/ceo/customer': 'Customer Database',
    '/ceo/visits': 'Client Visits Log',
    '/ceo/followups': 'Follow-ups Dashboard',
    '/ceo/opportunities': 'Opportunities Pipeline',
    '/ceo/employee': 'Employee Performance',
    '/ceo/attendance': 'Daily Attendance Sheet',
    '/ceo/leaves': 'Leave Management',
    '/ceo/expenses': 'Expenses Claims',
    '/ceo/reports': 'Reports & Analytics',
    '/ceo/settings': 'Settings',
  }

  const pageSubtitle = {
    '/ceo': 'CEO / Founder · Strategic Overview',
    '/ceo/leads': 'CEO / Founder · Lead Tracking',
    '/ceo/customer': 'CEO / Founder · Customer Profiles',
    '/ceo/visits': 'CEO / Founder · Field Logs',
    '/ceo/followups': 'CEO / Founder · Action Items',
    '/ceo/opportunities': 'CEO / Founder · Opportunity Kanban Board',
    '/ceo/employee': 'CEO / Founder · Team Performance Analytics',
    '/ceo/attendance': 'CEO / Founder · Time Logs',
    '/ceo/leaves': 'CEO / Founder · Leave Approvals',
    '/ceo/expenses': 'CEO / Founder · Expense Reimbursements',
    '/ceo/reports': 'CEO / Founder · Business Analytics',
    '/ceo/settings': 'CEO / Founder · Preferences',
  }

  const mockNotifications = [
    { id: 1, title: 'Big Deal Won!', desc: 'Global Corp moved to Won (₹2.5L)', time: '5m ago', read: false },
    { id: 2, title: 'New Lead Assigned', desc: 'Next Gen Tech assigned to Mary Jane', time: '1h ago', read: false },
    { id: 3, title: 'Weekly Reports Ready', desc: 'Sales performance reports are compiled', time: '5h ago', read: true },
  ]

  // Mock Calendar agenda
  const mockAgenda = [
    { id: 1, title: 'Visit ABC Pvt Ltd', exec: 'John Doe', time: '10:05 AM - 11:15 AM' },
    { id: 2, title: 'Demo at Tech Solutions', exec: 'Mary Jane', time: '11:30 AM - 12:45 PM' },
    { id: 3, title: 'Contract Call Global Corp', exec: 'Robert Smith', time: '02:00 PM - 03:00 PM' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F8FC] text-slate-800 font-sans antialiased">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 w-64 lg:static lg:h-screen lg:shrink-0 ${
          isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'}`}
      >
        {/* Branding header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
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
              <div className="animate-in fade-in duration-300">
                <p className="m-0 text-md font-extrabold tracking-tight text-slate-900">
                  Twite<span className="text-blue-600">Connect</span>
                </p>
              </div>
            )}
          </div>
          
          {/* Collapse toggle (Desktop only, at the top) */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:grid size-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 ml-2"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="size-4.5" /> : <ChevronLeft className="size-4.5" />}
          </button>

          <button
            className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={isSidebarCollapsed ? item.label : ''}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#A8C2FF] to-[#3B82F6] text-black font-semibold border border-[#2563EB]/35 shadow-[0_4px_12px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`size-5 shrink-0 ${isActive ? 'text-black' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>



        {/* User profile section */}
        <div className="border-t border-slate-200/80 p-4 shrink-0">
          <div className={`flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-bold text-white shadow-sm">
              JD
            </span>
            {!isSidebarCollapsed && (
              <div className="flex-1 overflow-hidden animate-in fade-in duration-150">
                <p className="m-0 text-xs font-bold text-slate-950 truncate">John Doe</p>
                <p className="m-0 text-[0.65rem] font-medium text-slate-500 truncate">CEO & Founder</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button
                onClick={handleSignOut}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/50 hover:text-red-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden h-screen">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-6 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <button
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            {/* CEO Badge (Top) & Date (Bottom) with Pulsing Radar Light */}
            <div className="hidden items-center gap-3 border-r border-slate-200 pr-4 mr-2 shrink-0 lg:flex">
              <span className="relative flex size-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-blue-600"></span>
              </span>
              <div className="flex flex-col justify-center">
                <span className="text-base font-extrabold tracking-wider text-blue-600 uppercase leading-none">
                  CEO
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-1 leading-none">
                  {currentDate}
                </span>
              </div>
            </div>

            {/* Global Search Bar (Matching ceo.png, now interactive!) */}
            <div className="relative hidden w-72 sm:block md:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, customers, phone, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchResults(true)
                }}
                onFocus={() => setShowSearchResults(true)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />
                  <div className="absolute left-0 top-full z-50 mt-2.5 w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl ring-1 ring-slate-950/5">
                    <div className="px-3 py-1.5 border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results</div>
                    <div className="max-h-64 overflow-y-auto space-y-1 py-1">
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
                          <span className="text-[10px] text-slate-400 font-semibold">{res.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">


            {/* Interactive Calendar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={`rounded-xl p-2 transition ${calendarOpen ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              >
                <CalendarIcon className="size-5" />
              </button>

              {calendarOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2.5 w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl ring-1 ring-slate-950/5">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                      <p className="text-sm font-bold text-slate-900">Today's Visits Schedule</p>
                      <button
                        onClick={() => {
                          navigate('/ceo/visits')
                          setCalendarOpen(false)
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        View calendar
                      </button>
                    </div>
                    <div className="space-y-3">
                      {mockAgenda.map(item => (
                        <div key={item.id} className="border-l-4 border-blue-500 pl-3">
                          <p className="text-xs font-bold text-slate-900">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.time}</p>
                          <p className="text-[9px] text-slate-400 font-medium">Rep: {item.exec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <Bell className="size-5" />
                <span className="absolute right-2 top-2 size-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2.5 w-80 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl ring-1 ring-slate-950/5">
                    <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                      <p className="text-sm font-bold text-slate-900">Notifications</p>
                      <button className="text-xs font-semibold text-blue-600 hover:underline">Mark all read</button>
                    </div>
                    <div className="space-y-2">
                      {mockNotifications.map((notif) => (
                        <div key={notif.id} className="rounded-xl p-2.5 transition hover:bg-slate-50">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                            <span className="text-[0.65rem] text-slate-400 whitespace-nowrap">{notif.time}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">{notif.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-xl p-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-xs font-bold text-white shadow-sm shrink-0">
                  JD
                </span>
                <div className="hidden text-left sm:block">
                  <p className="m-0 text-xs font-bold text-slate-900 leading-none">John Doe</p>
                  <span className="mt-1 inline-block rounded-full bg-blue-50 border border-blue-100 px-1.5 py-0.2 text-[8px] font-extrabold text-blue-700 leading-none">
                    CEO
                  </span>
                </div>
                <ChevronDown className={`size-4 text-slate-450 transition ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2.5 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-slate-950/5">
                    <Link
                      to="/ceo/settings"
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="size-4 text-slate-400" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F8FC] relative">
          {/* Glowing Ambient Background Shades */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-blue-300/10 blur-[100px] pointer-events-none z-0" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-indigo-300/10 blur-[100px] pointer-events-none z-0" />
          
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white px-8 py-4 shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <p>&copy; 2026 TwiteConnect. All rights reserved.</p>
          </div>
        </footer>
      </div>

      {/* Global Quick Action Modal */}
      {quickActionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setQuickActionOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>
            
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Global Quick Action</h3>
              <p className="text-xs font-medium text-slate-500">Log new data directly to state databases.</p>
            </div>

            {/* Selector tabs */}
            <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActionType('lead')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${actionType === 'lead' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <span className="flex items-center justify-center gap-1"><PlusCircle className="size-3.5" /> New Lead</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType('opp')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${actionType === 'opp' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <span className="flex items-center justify-center gap-1"><Briefcase className="size-3.5" /> New Opportunity</span>
              </button>
            </div>

            <form onSubmit={handleQuickActionSubmit} className="space-y-4">
              {actionType === 'lead' ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 98765..."
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Source Channel</label>
                      <select
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="Website">Website</option>
                        <option value="Referral">Referral</option>
                        <option value="Cold Call">Cold Call</option>
                        <option value="Walk-In">Walk-In</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Deal Value (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="50000"
                        value={oppValue}
                        onChange={(e) => setOppValue(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Stage</label>
                      <select
                        value={oppStage}
                        onChange={(e) => setOppStage(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">Assign Sales Representative</label>
                <select
                  value={leadAssigned}
                  onChange={(e) => setLeadAssigned(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="John Doe">John Doe</option>
                  <option value="Mary Jane">Mary Jane</option>
                  <option value="Robert Smith">Robert Smith</option>
                  <option value="David Brown">David Brown</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-4 rounded-full bg-gradient-to-r from-[#A8C2FF] to-[#3B82F6] text-sm font-bold text-black border border-[#2563EB]/40 shadow-[0_8px_20px_-3px_rgba(59,130,246,0.3),inset_0_1.5px_0_rgba(255,255,255,0.45)] hover:from-[#95B6FF] hover:to-[#2563EB] hover:shadow-[0_12px_24px_-3px_rgba(59,130,246,0.4),inset_0_1.5px_0_rgba(255,255,255,0.5)] transition-all duration-300 active:scale-[0.98]"
              >
                Log Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CeoLayout
