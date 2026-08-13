import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearUserCache } from '../../utils/userScope.js'
import { notificationAPI } from '../../services/api.js'
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  UserCheck2,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell,
  CheckCheck,
  Info,
  Clock,
  UserPlus,
  MapPin,
  ShieldAlert,
  GripVertical,
  Network,
  Layers,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Company Overview', icon: Building2, path: '/admin/company' },
  { label: 'User Management', icon: Users, path: '/admin/users' },
  { label: 'Role Management', icon: ShieldCheck, path: '/admin/roles' },
  { label: 'HRMS', icon: UserCheck2, path: '/admin/hrms' },
  { label: 'Organization & Master Data', icon: Layers, path: '/admin/organization' },
  { label: 'Reports & Analytics', icon: FileText, path: '/admin/reports' },
  { label: 'Security & Audit Logs', icon: ShieldCheck, path: '/admin/audit' },
  { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
]

const initialNotifications = [
  {
    id: 'n1',
    title: 'New Account Creation',
    message: 'New Sales Executive account created for Arun Kumar.',
    time: '10 mins ago',
    type: 'user',
    read: false,
    icon: UserPlus,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'n2',
    title: 'Field Representative Check-In',
    message: 'John Doe logged check-in at Client Site - Guindy, Chennai.',
    time: '25 mins ago',
    type: 'visit',
    read: false,
    icon: MapPin,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'n3',
    title: 'System Security Audit Log',
    message: 'Role permissions matrix updated for Sales Manager role.',
    time: '2 hours ago',
    type: 'security',
    read: false,
    icon: ShieldAlert,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    id: 'n4',
    title: 'Leave Request Pending',
    message: 'Mary Jane submitted Casual Leave request for 10 May 2026.',
    time: '1 day ago',
    type: 'hrms',
    read: true,
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
]

function AdminLayout() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [selectedNotif, setSelectedNotif] = useState(null)

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications()
      if (res && res.data) {
        const mapped = res.data.map((n) => ({
          id: n.id,
          title: n.title || 'System Notification',
          message: n.message || n.description || '',
          time: n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN') : 'Recently',
          type: n.type || 'INFO',
          read: n.is_read || false,
          icon: Bell,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
        }))
        setNotifications(mapped)
      }
    } catch (err) {
      console.warn('Failed to fetch notifications from database:', err)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const location = useLocation()
  const navigate = useNavigate()

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const [sidebarItems, setSidebarItems] = useState(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_admin_${userEmail}`);
    if (saved) {
      try {
        const labels = JSON.parse(saved);
        const ordered = [];
        labels.forEach(label => {
          const match = navItems.find(n => n.label === label);
          if (match) ordered.push(match);
        });
        navItems.forEach(n => {
          if (!ordered.some(o => o.label === n.label)) {
            ordered.push(n);
          }
        });
        return ordered;
      } catch (e) {
        return navItems;
      }
    }
    return navItems;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`tc_sidebar_order_admin_${userEmail}`);
    if (saved) {
      try {
        const labels = JSON.parse(saved);
        const ordered = [];
        labels.forEach(label => {
          const match = navItems.find(n => n.label === label);
          if (match) ordered.push(match);
        });
        navItems.forEach(n => {
          if (!ordered.some(o => o.label === n.label)) {
            ordered.push(n);
          }
        });
        setSidebarItems(ordered);
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
    localStorage.setItem(`tc_sidebar_order_admin_${userEmail}`, JSON.stringify(labels));
    setIsCustomizing(false);
    showToast("Sidebar layout order saved successfully!", "success");
  };
  const resetCustomization = () => {
    localStorage.removeItem(`tc_sidebar_order_admin_${userEmail}`);
    setSidebarItems(navItems);
    setIsCustomizing(false);
    showToast("Sidebar layout reset to default.", "info");
  };

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleLogout = () => {
    clearUserCache()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    showToast('All notifications marked as read', 'info')
    const unread = notifications.filter(n => !n.read)
    for (const n of unread) {
      try {
        await notificationAPI.markRead(n.id)
      } catch (e) {}
    }
  }

  const handleSelectNotif = async (notif) => {
    setSelectedNotif(notif)
    setNotificationsOpen(false)
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      try {
        await notificationAPI.markRead(notif.id)
      } catch (err) {
        console.warn('Failed to mark read in Supabase:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/admin" className="flex items-center gap-2.5 font-extrabold text-xl text-blue-600">
            <span className="bg-blue-600 text-white px-2.5 py-1 rounded-xl text-sm shadow-md shadow-blue-600/30">TC</span>
            <span className="text-slate-900 tracking-tight">TConnect Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                setProfileOpen(false)
              }}
              className="relative p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition cursor-pointer"
              title="System Alerts & Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-900 text-xs">System Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => {
                    const NotifIcon = n.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleSelectNotif(n)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition cursor-pointer ${
                          !n.read ? 'bg-blue-50/40 font-semibold' : ''
                        }`}
                      >
                        <span className={`p-2 rounded-xl border shrink-0 ${n.color}`}>
                          <NotifIcon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-extrabold text-slate-900 truncate">{n.title}</p>
                            <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="p-2 border-t border-slate-100 text-center bg-slate-50 rounded-b-2xl">
                  <p className="text-[10px] font-bold text-slate-500">Showing recent administrative notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* System Admin User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-2.5 p-1.5 px-3 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/60 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-600/20">
                {currentUser.initials || 'AD'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-bold text-xs text-slate-800 leading-tight">{currentUser.name || 'Admin'}</span>
                <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">{currentUser.email}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200/90 rounded-2xl shadow-2xl py-2 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name || 'Admin'}</p>
                  <p className="text-[11px] font-semibold text-blue-600 truncate">{currentUser.email || 'admin@tconnect.com'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase">
                    {currentUser.role || 'Admin'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-600 font-bold hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-slate-200/90 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static pt-16 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-3 border-b border-slate-100 bg-slate-50/80 font-bold text-[11px] uppercase tracking-wider text-blue-600 px-4">
            Module Navigation
          </div>
          <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname.replace(/\/$/, '') === item.path.replace(/\/$/, '') || (item.path === '/admin' && (location.pathname === '/admin' || location.pathname === '/admin/'))
              return (
                <div
                  key={item.path}
                  draggable={isCustomizing}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative ${isCustomizing ? "cursor-move animate-pulse border border-dashed border-blue-600/20 rounded-xl" : ""}`}
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
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      !isCustomizing && isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                    }`}
                  >
                    {isCustomizing && <GripVertical size={14} className="text-slate-450 shrink-0" />}
                    <Icon className={`w-4 h-4 ${!isCustomizing && isActive ? 'text-white' : 'text-blue-600'}`} />
                    <span>{item.label}</span>
                  </Link>
                </div>
              )
            })}
            <div className="pt-2">
              {isCustomizing ? (
                <div className="pt-2 border-t border-slate-100 space-y-1.5 px-1">
                  <button
                    type="button"
                    onClick={saveCustomization}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Save Order
                  </button>
                  <button
                    type="button"
                    onClick={resetCustomization}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomizing(true)}
                  className="w-full py-2 px-3 border border-dashed border-slate-200 hover:border-blue-400 text-slate-500 hover:text-blue-600 rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚙️ Customize Sidebar</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-100/70">
          <Outlet />
        </main>
      </div>

      {/* Selected Notification Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Notification Details
              </span>
              <button onClick={() => setSelectedNotif(null)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </h3>
            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedNotif.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{selectedNotif.time}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800">
                {selectedNotif.message}
              </div>
            </div>
            <button
              onClick={() => setSelectedNotif(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminLayout
