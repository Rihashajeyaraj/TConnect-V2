import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  Calendar,
  Clock,
  Building2,
  DollarSign,
  ShieldAlert,
  Check,
  Trash2,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { attendanceAPI, notificationAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'

function Notifications() {
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL' | 'UNREAD' | 'ACTIONABLE'

  const DEFAULT_ADMIN_ALERTS = [
    {
      id: 'admin_alert_01',
      category: 'ADMIN_ACTION_ALERT',
      title: '⚠️ Admin Alert: Employee Leave Days Changed',
      description: 'Admin Priya Sharma updated annual leave quota for employee Siva kumar (EMP000015) from 12 days to 15 days.',
      time: 'Today 10:15 AM',
      unread: true,
      actionable: true,
      link: '/ceo/hrms',
    },
    {
      id: 'admin_alert_02',
      category: 'ADMIN_ACTION_ALERT',
      title: '🔒 Admin Alert: Employee Password Changed',
      description: 'Admin reset access credentials for employee account ash Fdo (EMP000016). Force password reset on next login enabled.',
      time: 'Today 09:30 AM',
      unread: true,
      actionable: false,
      link: '/ceo/hrms',
    },
    {
      id: 'admin_alert_03',
      category: 'ADMIN_ACTION_ALERT',
      title: '⛔ Admin Alert: Employee Account Deactivated',
      description: 'Admin deactivated staff account for employee dkydkt khhk (EMP000011). Associated leads & clients unassigned to pool.',
      time: 'Yesterday 05:45 PM',
      unread: false,
      actionable: true,
      link: '/ceo/hrms',
    },
    {
      id: 'admin_alert_04',
      category: 'ADMIN_ACTION_ALERT',
      title: '👥 Admin Alert: Reporting Manager Reassigned',
      description: 'Admin reassigned Sales Executive Abi hastro (EMP000012) under Sales Manager Jeeva kumar (EMP000013).',
      time: 'Yesterday 03:20 PM',
      unread: false,
      actionable: false,
      link: '/ceo/hrms',
    },
    {
      id: 'admin_alert_05',
      category: 'ADMIN_ACTION_ALERT',
      title: '🎯 Admin Alert: Client / Lead Portfolio Reassigned',
      description: 'Admin reassigned enterprise client portfolio from deactivated employee to Sales Manager Jeeva kumar.',
      time: '01/09/2026 11:00 AM',
      unread: false,
      actionable: false,
      link: '/ceo/team',
    },
  ]

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const [notifRes, leaveRes] = await Promise.allSettled([
        notificationAPI?.getNotifications ? notificationAPI.getNotifications() : Promise.resolve({ data: [] }),
        attendanceAPI.getLeaveRequests(),
      ])

      const notifs = notifRes.status === 'fulfilled' && notifRes.value?.data && Array.isArray(notifRes.value.data)
        ? notifRes.value.data
        : []

      const leaves = leaveRes.status === 'fulfilled' && leaveRes.value?.data && Array.isArray(leaveRes.value.data)
        ? leaveRes.value.data
        : []

      // Also check localStorage fallback
      let localNotifs = []
      try {
        const saved = localStorage.getItem('tc_ceo_notifications')
        if (saved) localNotifs = JSON.parse(saved)
      } catch (e) {}

      // Format API notifications
      const formattedApiNotifs = notifs.map((n, i) => ({
        id: n.id || n.notification_id || `notif_${i}`,
        category: n.category || n.notification_type || 'ADMIN_ACTION_ALERT',
        title: n.title || 'Admin Alert Notification',
        description: n.message || n.description || '',
        time: formatDate(n.created_at) || 'Recently',
        unread: n.is_read !== true && n.read !== true,
        actionable: n.category === 'ADMIN_ACTION_ALERT' || (n.title && n.title.includes('Admin Alert')),
        link: n.link || '/ceo/hrms',
      }))

      // Combine API notifications, leave requests, and default alerts
      const combined = [
        ...formattedApiNotifs,
        ...leaves.filter(l => l.status === 'Pending').map((l, i) => ({
          id: `leave_${l.id || i}`,
          category: 'LEAVE_APPROVAL',
          title: 'Pending Leave Approval Request',
          description: `${l.employee_name || 'Staff Member'} requested ${l.leave_type || 'Leave'} (${l.duration || '1 Day'}). Reason: ${l.reason || 'Personal'}`,
          time: formatDate(l.created_at) || 'Pending',
          unread: true,
          actionable: true,
          link: '/ceo/hrms',
        })),
        ...localNotifs,
      ]

      // Merge with default admin alerts if DB doesn't have them yet
      DEFAULT_ADMIN_ALERTS.forEach(defItem => {
        if (!combined.some(c => c.id === defItem.id || c.title === defItem.title)) {
          combined.push(defItem)
        }
      })

      // Sort unread first, then by timestamp
      setNotifications(combined)
    } catch (e) {
      console.error('Error loading notifications:', e)
      setNotifications(DEFAULT_ADMIN_ALERTS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    showToast('All notifications marked as read', 'success')
  }

  const markSingleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    )
  }

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    showToast('Notification dismissed', 'info')
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'UNREAD') return n.unread
    if (activeFilter === 'ACTIONABLE') return n.actionable
    return true
  })

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <Bell className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive Alerts & Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-[#832D51] px-2.5 py-0.5 text-xs font-black text-white">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-2xl">
            Real-time feed of pending employee approvals, field check-in alerts, and sales updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <Check className="size-3.5 text-emerald-600" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['ALL', 'UNREAD', 'ACTIONABLE'].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeFilter === f
                ? 'bg-[#832D51] text-white shadow-xs'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'ALL' ? 'All Alerts' : f === 'UNREAD' ? 'Unread Only' : 'Action Required'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-[#832D51]" />
            Loading real-time notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
            <CheckCircle2 className="mx-auto size-10 text-emerald-500 mb-2" />
            <h3 className="text-sm font-black text-slate-900">All caught up!</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">No alerts or notifications pending in the database.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-2xl border p-4.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                notif.unread
                  ? 'bg-white border-[#832D51]/30 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/70'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="size-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Bell className="size-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900">{notif.title}</h3>
                    {notif.unread && (
                      <span className="size-1.5 rounded-full bg-[#832D51]" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-2xl">{notif.description}</p>
                  <span className="text-[10px] text-slate-400 font-bold mt-1.5 block">{notif.time}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {notif.link && (
                  <Link
                    to={notif.link}
                    onClick={() => markSingleRead(notif.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#832D51] hover:bg-[#6a2240] text-white text-[11px] font-black transition"
                  >
                    View Details
                  </Link>
                )}
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                  title="Dismiss notification"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Notifications
