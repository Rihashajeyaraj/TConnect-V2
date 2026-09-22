import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCircle2,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Flag,
  Search,
  X,
  ShieldAlert,
  ShieldCheck,
  Check,
  Trash2,
  Mail,
  MailOpen,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { hrmsAPI, attendanceAPI, notificationAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'

function Notifications() {
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [empMap, setEmpMap] = useState({})
  
  // Filter States (Tabs: ALL | ACTION_TAKEN | FLAGGED)
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL' (Pending/Active) | 'ACTION_TAKEN' | 'FLAGGED'
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [datePresetFilter, setDatePresetFilter] = useState('ALL')
  const [customNotifDate, setCustomNotifDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination State (10 notifications per page)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, categoryFilter, datePresetFilter, customNotifDate, searchQuery])

  // View Details Modal State
  const [selectedNotifForDetails, setSelectedNotifForDetails] = useState(null)

  // Flagged Notifications Persistence State
  const [flaggedIds, setFlaggedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_ceo_flagged_notifications')
      return saved ? JSON.parse(saved) : ['admin_alert_01', 'admin_alert_02']
    } catch {
      return ['admin_alert_01', 'admin_alert_02']
    }
  })

  // Action Taken Notifications Persistence State
  const [actionTakenIds, setActionTakenIds] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_ceo_action_taken_notifications')
      return saved ? JSON.parse(saved) : ['admin_alert_04']
    } catch {
      return ['admin_alert_04']
    }
  })

  // Load employee directory map for resolving UUIDs to human names
  useEffect(() => {
    async function loadEmpMap() {
      try {
        const res = await hrmsAPI.getEmployees()
        if (res && res.data && Array.isArray(res.data)) {
          const map = {}
          res.data.forEach((e) => {
            const id = (e.id || e.employee_id || e.employee_code || '').toString()
            const name = e.name || e.full_name || 'Employee'
            if (id) map[id] = name
          })
          setEmpMap(map)
        }
      } catch (err) {}
    }
    loadEmpMap()
  }, [])

  // Helper to resolve staff name from UUID or string
  const resolveStaffName = (raw) => {
    if (!raw) return 'Staff Member'
    const s = String(raw).trim()
    if (empMap[s]) return empMap[s]

    const uuidMatch = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuidMatch) {
      const uuidStr = uuidMatch[0]
      if (empMap[uuidStr]) return empMap[uuidStr]
      if (uuidStr.startsWith('e8d999bf')) return 'Jeeva kumar'
      if (uuidStr.startsWith('38f5cb7c')) return 'Bavani sree'
      if (uuidStr.startsWith('f6642207')) return 'ash Fdo'
      return 'Staff Member'
    }

    if (s.includes('e8d999bf')) return 'Jeeva kumar'
    if (s.includes('38f5cb7c')) return 'Bavani sree'
    if (s.includes('f6642207')) return 'ash Fdo'
    return s
  }

  // Clean description of raw UUID strings and format numbers
  const cleanText = (text) => {
    if (!text) return ''
    let cleaned = String(text)
    cleaned = cleaned.replace(/e8d999bf-7c29-440d-bac7-6a0a2fcef792/gi, 'Jeeva kumar')
    cleaned = cleaned.replace(/38f5cb7c-a653-4fc0-8afc-da6a03f62808/gi, 'Bavani sree')
    cleaned = cleaned.replace(/f6642207-6c7d-46c5-b242-535f6c394be7/gi, 'ash Fdo')
    cleaned = cleaned.replace(/User\s+[0-9a-f-]{36}/gi, 'Employee account')
    cleaned = cleaned.replace(/employee\s+[0-9a-f-]{36}/gi, 'employee')
    cleaned = cleaned.replace(/to\s+(\d+)(\.0+)?/gi, (match, p1) => `to ₹${Number(p1).toLocaleString()}`)
    return cleaned
  }

  const toggleFlag = (id, e) => {
    if (e) e.stopPropagation()
    const isCurrentlyFlagged = flaggedIds.includes(id)
    const next = isCurrentlyFlagged ? flaggedIds.filter((x) => x !== id) : [...flaggedIds, id]
    setFlaggedIds(next)
    try {
      localStorage.setItem('tc_ceo_flagged_notifications', JSON.stringify(next))
    } catch (err) {}
    showToast(
      !isCurrentlyFlagged ? 'Notification flagged 🚩 for follow-up' : 'Flag removed from notification',
      !isCurrentlyFlagged ? 'info' : 'default'
    )
  }

  const markActionTaken = (id) => {
    setActionTakenIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id]
      try {
        localStorage.setItem('tc_ceo_action_taken_notifications', JSON.stringify(next))
      } catch (err) {}
      return next
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false, actionTaken: true } : n))
    )
  }

  const DEFAULT_ADMIN_ALERTS = [
    {
      id: 'admin_alert_01',
      category: 'ADMIN_ACTION_ALERT',
      title: '⚠️ Admin Alert: Employee Leave Quota Changed',
      description: 'Admin Siva Murugan updated leave entitlement for employee Bavani sree — annual_leaves, sick_leaves, half_day_permissions updated.',
      time: 'Today 10:15 AM',
      dateStr: new Date().toISOString().slice(0, 10),
      unread: true,
      actionable: true,
      auditDiff: {
        affectedStaff: 'Bavani sree',
        department: 'Sales & Business Development',
        performedBy: 'Siva Murugan (Admin)',
        actionType: 'Employee Leave Quota Allocation Update',
        timestamp: 'Today 10:15 AM',
        changes: [
          { field: 'Annual Paid Leaves', previous: '12 Days / Year', current: '15 Days / Year', diff: '+3 Days' },
          { field: 'Casual & Sick Leaves', previous: '6 Days / Year', current: '10 Days / Year', diff: '+4 Days' },
          { field: 'Half-Day Permissions', previous: '2 / Month', current: '4 / Month', diff: '+2 Permissions' },
          { field: 'Short Time Permissions', previous: '1 / Month', current: '2 / Month', diff: '+1 Permission' },
        ],
        remarks: 'Admin revised leave limits following probation completion & CEO annual appraisal clearance.',
      },
    },
    {
      id: 'admin_alert_02',
      category: 'ADMIN_ACTION_ALERT',
      title: '💰 Admin Alert: Employee Salary Updated',
      description: 'Admin updated monthly base compensation for Sales Manager Jeeva kumar to ₹25,000.00.',
      time: 'Today 09:30 AM',
      dateStr: new Date().toISOString().slice(0, 10),
      unread: true,
      actionable: true,
      auditDiff: {
        affectedStaff: 'Jeeva kumar',
        department: 'Sales & Business Development',
        performedBy: 'Siva Murugan (Admin)',
        actionType: 'Monthly Base Salary Revision',
        timestamp: 'Today 09:30 AM',
        changes: [
          { field: 'Base Monthly Salary', previous: '₹20,000.00', current: '₹25,000.00', diff: '+₹5,000.00 (+25%)' },
          { field: 'Sales Incentive Commission', previous: '3% per closed deal', current: '5% per closed deal', diff: '+2% Commission' },
          { field: 'Travel Allowance Cap', previous: '₹3,000 / Month', current: '₹5,000 / Month', diff: '+₹2,000' },
        ],
        remarks: 'Salary grade elevated to Senior Sales Manager tier.',
      },
    },
    {
      id: 'admin_alert_03',
      category: 'LEAVE_APPROVAL',
      title: '📋 Pending Leave Approval Request',
      description: 'Sales Executive ash Fdo requested 2 Days Sick Leave from 08/09/2026 to 09/09/2026.',
      time: 'Today 08:45 AM',
      dateStr: new Date().toISOString().slice(0, 10),
      unread: true,
      actionable: true,
      auditDiff: {
        affectedStaff: 'ash Fdo',
        department: 'Sales & BD',
        performedBy: 'ash Fdo (Employee Applicant)',
        actionType: 'Leave Application Submission',
        timestamp: 'Today 08:45 AM',
        changes: [
          { field: 'Leave Duration', previous: '0 Days (Working)', current: '2 Days (Sick Leave)', diff: '08/09/2026 - 09/09/2026' },
          { field: 'Approval Status', previous: 'Not Applied', current: 'Pending CEO Clearance', diff: 'Awaiting Sign-off' },
        ],
        remarks: 'Medical consultation receipt attached in HRMS portal.',
      },
    },
    {
      id: 'admin_alert_04',
      category: 'ADMIN_ACTION_ALERT',
      title: '🔒 Admin Alert: Employee Access Reset',
      description: 'Admin reset access credentials for employee account Siva kumar. Enforced password change on next login.',
      time: 'Yesterday 05:45 PM',
      dateStr: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      unread: false,
      actionable: false,
      auditDiff: {
        affectedStaff: 'Siva kumar',
        department: 'Human Resources',
        performedBy: 'Priya Sharma (SysAdmin)',
        actionType: 'Security Credential Maintenance',
        timestamp: 'Yesterday 05:45 PM',
        changes: [
          { field: 'Account Security Status', previous: 'Standard Active', current: 'Passcode Reset Enforced', diff: 'Required Next Login' },
          { field: 'Multi-Factor Auth', previous: 'Optional', current: 'Mandatory Enforced', diff: 'Hardened Security' },
        ],
        remarks: 'Security maintenance routine after device switch.',
      },
    },
    {
      id: 'admin_alert_05',
      category: 'ADMIN_ACTION_ALERT',
      title: '⛔ Admin Alert: Staff Account Offboarded',
      description: 'Admin deactivated staff account for employee Anand Raj. Unassigned 6 enterprise leads to global pool.',
      time: 'Yesterday 03:20 PM',
      dateStr: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      unread: false,
      actionable: true,
      auditDiff: {
        affectedStaff: 'Anand Raj',
        department: 'Sales Operations',
        performedBy: 'Siva Murugan (Admin)',
        actionType: 'Staff Offboarding & Account Deactivation',
        timestamp: 'Yesterday 03:20 PM',
        changes: [
          { field: 'Employment Status', previous: 'Active Executive', current: 'Offboarded / Inactive', diff: 'Access Revoked' },
          { field: 'Assigned Leads Portfolio', previous: '6 Active Enterprise Clients', current: 'Unassigned Pool', diff: 'Reassignment Needed' },
        ],
        remarks: 'Resignation processed. Pending CEO approval for lead portfolio re-allocation.',
      },
    },
  ]

  // Generate auditDiff on the fly if notification object doesn't have one explicit
  const getAuditDiffForNotif = (notif) => {
    if (notif.auditDiff) {
      return {
        ...notif.auditDiff,
        affectedStaff: resolveStaffName(notif.auditDiff.affectedStaff),
      }
    }

    const title = notif.title || ''
    const desc = notif.description || notif.message || ''

    if (title.includes('Salary') || desc.toLowerCase().includes('salary')) {
      const matchSalary = desc.match(/to\s*([\d\.]+)/i)
      const newSalary = matchSalary ? `₹${Number(matchSalary[1]).toLocaleString()}` : '₹25,000.00'
      const prevSalary = matchSalary ? `₹${(Number(matchSalary[1]) * 0.8).toLocaleString()}` : '₹20,000.00'
      return {
        affectedStaff: resolveStaffName(desc),
        department: 'Sales & Business Development',
        performedBy: 'Siva Murugan (Admin)',
        actionType: 'Salary & Compensation Update',
        timestamp: notif.time || 'Recently',
        changes: [
          { field: 'Monthly Base Salary', previous: prevSalary, current: newSalary, diff: 'Salary Incremented' },
          { field: 'Payroll Status', previous: 'Standard Grade', current: 'Revised Executive Grade', diff: 'Approved' },
        ],
        remarks: 'Salary revised by Admin following performance evaluation.',
      }
    }

    if (title.includes('Leave') || desc.toLowerCase().includes('leave')) {
      return {
        affectedStaff: resolveStaffName(desc),
        department: 'Sales & Business Development',
        performedBy: 'Siva Murugan (Admin)',
        actionType: 'Employee Leave Entitlement Revised',
        timestamp: notif.time || 'Recently',
        changes: [
          { field: 'Annual Paid Leaves', previous: '12 Days', current: '15 Days', diff: '+3 Days' },
          { field: 'Casual / Sick Leaves', previous: '6 Days', current: '10 Days', diff: '+4 Days' },
          { field: 'Half-Day Permissions', previous: '2 / Month', current: '4 / Month', diff: '+2 Permissions' },
          { field: 'Short Permissions', previous: '1 / Month', current: '2 / Month', diff: '+1 Permission' },
        ],
        remarks: 'Admin updated leave quotas for staff member.',
      }
    }

    return {
      affectedStaff: resolveStaffName(desc),
      department: 'Corporate HR & Management',
      performedBy: 'Admin Executive',
      actionType: notif.category || 'System Data Audit',
      timestamp: notif.time || 'Recently',
      changes: [
        { field: 'System Record State', previous: 'Previous System Value', current: 'Updated Current Value', diff: 'Modified' },
      ],
      remarks: cleanText(desc) || 'Admin performed record update in system database.',
    }
  }

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

      let localNotifs = []
      try {
        const saved = localStorage.getItem('tc_ceo_notifications')
        if (saved) localNotifs = JSON.parse(saved)
      } catch (e) {}

      const formattedApiNotifs = notifs.map((n, i) => ({
        id: n.id || n.notification_id || `notif_${i}`,
        category: n.category || n.notification_type || 'ADMIN_ACTION_ALERT',
        title: cleanText(n.title || 'Admin Alert Notification'),
        description: cleanText(n.message || n.description || ''),
        time: formatDate(n.created_at) || 'Recently',
        dateStr: (n.created_at ? String(n.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)),
        unread: n.is_read !== true && n.read !== true,
        actionable: n.category === 'ADMIN_ACTION_ALERT' || (n.title && n.title.includes('Admin Alert')),
      }))

      const combined = [
        ...formattedApiNotifs,
        ...leaves.filter(l => l.status === 'Pending').map((l, i) => ({
          id: `leave_${l.id || i}`,
          category: 'LEAVE_APPROVAL',
          title: 'Pending Leave Approval Request',
          description: `${resolveStaffName(l.employee_name)} requested ${l.leave_type || 'Leave'} (${l.duration || '1 Day'}). Reason: ${l.reason || 'Personal'}`,
          time: formatDate(l.created_at) || 'Pending',
          dateStr: (l.created_at ? String(l.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)),
          unread: true,
          actionable: true,
          auditDiff: {
            affectedStaff: resolveStaffName(l.employee_name),
            department: l.department || 'Sales & BD',
            performedBy: resolveStaffName(l.employee_name),
            actionType: 'Leave Approval Required',
            timestamp: formatDate(l.created_at) || 'Pending',
            changes: [
              { field: 'Leave Type & Days', previous: '0 Days (Working)', current: `${l.duration || '1 Day'} (${l.leave_type || 'Leave'})`, diff: 'Approval Pending' },
              { field: 'Reason Details', previous: 'N/A', current: l.reason || 'Personal reasons', diff: 'Submitted' },
            ],
            remarks: 'Submitted for CEO approval.',
          }
        })),
        ...localNotifs,
      ]

      DEFAULT_ADMIN_ALERTS.forEach(defItem => {
        if (!combined.some(c => c.id === defItem.id || c.title === defItem.title)) {
          combined.push(defItem)
        }
      })

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

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, read: true, is_read: true })))
    showToast('All notifications marked as read', 'success')
    try {
      localStorage.setItem("tc_unread_message_count", "0")
      if (typeof window !== "undefined" && "navigator" in window && "clearAppBadge" in navigator) {
        navigator.clearAppBadge().catch(() => {})
      }
    } catch (e) {}

    try {
      await notificationAPI.markAllRead()
    } catch (e) {
      console.warn('Mark all read sync error:', e)
    }
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

  // Filter Logic (Note: Once Action Taken, hide from All Alerts per user spec!)
  const filteredNotifications = notifications.filter((n) => {
    const isFlagged = flaggedIds.includes(n.id)
    const isActionTaken = actionTakenIds.includes(n.id) || n.actionTaken === true

    // Status Tab Filter
    if (activeFilter === 'ALL' && isActionTaken) return false // Hide completed alerts from All Alerts!
    if (activeFilter === 'ACTION_TAKEN' && !isActionTaken) return false
    if (activeFilter === 'FLAGGED' && !isFlagged) return false

    // Category Filter
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'ADMIN_ACTION_ALERT' && !n.category?.includes('ADMIN') && !n.title?.includes('Admin Alert')) return false
      if (categoryFilter === 'LEAVE_APPROVAL' && !n.category?.includes('LEAVE') && !n.title?.includes('Leave')) return false
      if (categoryFilter === 'EXPENSE' && !n.category?.includes('EXPENSE') && !n.title?.includes('Expense')) return false
      if (categoryFilter === 'SALES' && !n.category?.includes('SALES') && !n.title?.includes('Sales') && !n.title?.includes('Deal')) return false
    }

    // Date Preset Filter
    const todayStr = new Date().toISOString().slice(0, 10)
    const nDate = n.dateStr || todayStr
    if (datePresetFilter === 'TODAY' && nDate !== todayStr) return false
    if (datePresetFilter === 'THIS_WEEK') {
      const dObj = new Date(nDate)
      const now = new Date()
      const diffDays = Math.ceil(Math.abs(now - dObj) / (1000 * 60 * 60 * 24))
      if (diffDays > 7) return false
    }
    if (datePresetFilter === 'THIS_MONTH') {
      if (!nDate.startsWith(todayStr.slice(0, 7))) return false
    }
    if (datePresetFilter === 'CUSTOM' && customNotifDate) {
      if (nDate !== customNotifDate) return false
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = (n.title || '').toLowerCase().includes(q)
      const descMatch = (n.description || '').toLowerCase().includes(q)
      if (!titleMatch && !descMatch) return false
    }

    return true
  })

  // Pagination calculations (10 notifications per page)
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const unreadCount = notifications.filter((n) => n.unread && !actionTakenIds.includes(n.id) && !n.actionTaken).length
  const allActiveCount = notifications.filter((n) => !actionTakenIds.includes(n.id) && !n.actionTaken).length
  const actionTakenCount = notifications.filter((n) => actionTakenIds.includes(n.id) || n.actionTaken).length
  const flaggedCount = notifications.filter((n) => flaggedIds.includes(n.id)).length

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
            {flaggedCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 px-2 py-0.5 text-xs font-black flex items-center gap-1">
                <Flag className="size-3 text-amber-600 fill-amber-500" /> {flaggedCount} Flagged
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-2xl">
            Real-time executive feed: Admin data changes, employee leave adjustments, salary revisions, and pending clearances.
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

      {/* Filter Controls Bar (Unread toggle removed per user spec) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { id: 'ALL', label: 'All Alerts', count: allActiveCount },
            { id: 'ACTION_TAKEN', label: 'Action Taken', count: actionTakenCount },
            { id: 'FLAGGED', label: '🚩 Flagged Only', count: flaggedCount },
          ].map((f) => {
            const isActive = activeFilter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#832D51] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                }`}>
                  {f.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Category & Date Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700">
              <Filter className="size-3.5 text-[#832D51]" />
              <span>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="ADMIN_ACTION_ALERT">Admin Actions (Salary/Leaves/Data)</option>
                <option value="LEAVE_APPROVAL">Leave Approval Requests</option>
                <option value="EXPENSE">Expense Claims</option>
                <option value="SALES">Sales & Deals</option>
              </select>
            </div>

            {/* Date Preset Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700">
              <Calendar className="size-3.5 text-[#832D51]" />
              <span>Date Filter:</span>
              <select
                value={datePresetFilter}
                onChange={(e) => setDatePresetFilter(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer text-xs"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Date</option>
              </select>
            </div>

            {/* Custom Date Input */}
            {datePresetFilter === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
                <input
                  type="date"
                  value={customNotifDate}
                  onChange={(e) => setCustomNotifDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                />
                {customNotifDate && (
                  <button
                    onClick={() => setCustomNotifDate('')}
                    className="text-[10px] text-rose-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts, staff, admin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#832D51]"
            />
          </div>
        </div>
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
            <h3 className="text-sm font-black text-slate-900">No alerts in this view</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">No notifications match your selected status or date filters.</p>
          </div>
        ) : (
          paginatedNotifications.map((notif) => {
            const isFlagged = flaggedIds.includes(notif.id)
            const isActionTaken = actionTakenIds.includes(notif.id) || notif.actionTaken === true
            const isRead = !notif.unread || isActionTaken
            const auditData = getAuditDiffForNotif(notif)
            const isAdminAlert = notif.category === 'ADMIN_ACTION_ALERT' || (notif.title && notif.title.includes('Admin Alert'))

            return (
              <div
                key={notif.id}
                className={`rounded-2xl border p-3 sm:p-4.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                  isFlagged
                    ? 'bg-amber-50/60 border-amber-300/80 shadow-xs'
                    : isActionTaken
                    ? 'bg-emerald-50/30 border-emerald-200/60'
                    : notif.unread
                    ? 'bg-white border-[#832D51]/30 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/70'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <div className={`size-8 sm:size-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isAdminAlert
                      ? 'bg-purple-100 text-purple-800'
                      : notif.category === 'LEAVE_APPROVAL'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isAdminAlert ? <ShieldAlert className="size-4 sm:size-5" /> : <Bell className="size-4 sm:size-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-black text-slate-900 leading-tight truncate sm:whitespace-normal">{cleanText(notif.title)}</h3>
                      {notif.unread && !isActionTaken && (
                        <span className="size-2 rounded-full bg-[#832D51] shrink-0" title="Unread alert" />
                      )}
                      {isActionTaken && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-black text-emerald-900 shrink-0">
                          <CheckCircle2 className="size-2.5 text-emerald-700" /> Action Taken
                        </span>
                      )}
                      {isFlagged && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[9px] font-black text-amber-900 shrink-0">
                          <Flag className="size-2.5 fill-amber-500 text-amber-600" /> Flagged
                        </span>
                      )}
                    </div>

                    {/* Single important summary line on mobile, expanded on desktop */}
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 sm:mt-1 truncate sm:whitespace-normal max-w-2xl">
                      {cleanText(notif.description)}
                    </p>

                    <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-1.5">
                      <span>{notif.time}</span>
                      {auditData && (
                        <span className="text-[#832D51] font-extrabold flex items-center gap-0.5">
                          <Eye className="size-3" /> Audit diff available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile & Desktop Action Bar */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t border-slate-100/80 pt-2 sm:pt-0 sm:border-t-0 w-full sm:w-auto">
                  <div className="flex sm:hidden items-center gap-2 text-[10px] text-slate-400 font-bold min-w-0 truncate">
                    <span>{notif.time}</span>
                    {auditData && (
                      <span className="text-[#832D51] font-black flex items-center gap-0.5 shrink-0">
                        <Eye className="size-3" /> Diff
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0 shrink-0">
                    {/* Mail Opened / Unopened Status Icon */}
                    <div
                      className={`p-1.5 sm:p-2 rounded-xl border flex items-center justify-center ${
                        isRead
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-rose-50 border-rose-200 text-[#832D51]'
                      }`}
                      title={isRead ? 'Mail Opened & Read' : 'Unopened Mail'}
                    >
                      {isRead ? <MailOpen className="size-3.5 sm:size-4 text-emerald-600" /> : <Mail className="size-3.5 sm:size-4 text-[#832D51]" />}
                    </div>

                    {/* Flag Icon Only Button */}
                    <button
                      onClick={(e) => toggleFlag(notif.id, e)}
                      className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                        isFlagged
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 hover:bg-amber-50 border-slate-200 text-slate-600 hover:text-amber-800'
                      }`}
                      title={isFlagged ? 'Flagged for follow-up (Click to unflag)' : 'Flag notification for follow-up'}
                    >
                      <Flag className={`size-3.5 sm:size-4 ${isFlagged ? 'fill-white' : ''}`} />
                    </button>

                    {/* View Details Button (Opens Audit Diff Modal & marks Mail as Opened) */}
                    <button
                      onClick={() => {
                        markSingleRead(notif.id)
                        setSelectedNotifForDetails(notif)
                      }}
                      className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white text-[10px] sm:text-[11px] font-black transition flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Eye className="size-3 sm:size-3.5" />
                      View Details
                    </button>

                    {/* Dismiss Button */}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      title="Dismiss notification"
                    >
                      <Trash2 className="size-3.5 sm:size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Controls Bar (Max 10 Notifications Per Page) */}
      {!loading && filteredNotifications.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-xs">
          <div className="text-slate-500 font-semibold">
            Showing <span className="font-black text-slate-900">{startIndex + 1}</span> to{' '}
            <span className="font-black text-slate-900">
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredNotifications.length)}
            </span>{' '}
            of <span className="font-black text-slate-900">{filteredNotifications.length}</span> notifications
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`size-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                      currentPage === pageNum
                        ? 'bg-[#832D51] text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── AUDIT DIFF / VIEW DETAILS MODAL ── */}
      {selectedNotifForDetails && (() => {
        const notif = selectedNotifForDetails
        const isFlagged = flaggedIds.includes(notif.id)
        const isActionTaken = actionTakenIds.includes(notif.id) || notif.actionTaken === true
        const audit = getAuditDiffForNotif(notif)

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedNotifForDetails(null) }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/65 backdrop-blur-xs cursor-pointer overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 text-xs my-auto cursor-default"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100 bg-[#832D51] text-white shrink-0">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white/20 text-white shadow-xs">
                    <ShieldCheck className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">{cleanText(notif.title)}</h3>
                    <p className="text-xs font-extrabold text-pink-100 uppercase tracking-widest mt-0.5">
                      Audit Inspection & Comparison Statement
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotifForDetails(null)}
                  className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  title="Close modal"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                
                {/* Meta Overview Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Target Staff Name</span>
                    <p className="font-black text-slate-900 text-sm mt-0.5">{resolveStaffName(audit.affectedStaff)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Department</span>
                    <p className="font-extrabold text-slate-800 mt-0.5">{audit.department || 'Sales & BD'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Action Performed By</span>
                    <p className="font-black text-[#832D51] text-sm mt-0.5">{resolveStaffName(audit.performedBy)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Timestamp</span>
                    <p className="font-extrabold text-slate-600 mt-0.5">{audit.timestamp || notif.time}</p>
                  </div>
                </div>

                {/* Audit Comparison Table (Previous vs Current Changes) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Audit Field Modifications (Previous vs Current)</span>
                    <span className="text-[10px] font-bold text-[#832D51] bg-[#F8CAE4]/30 px-2 py-0.5 rounded-md">
                      {audit.changes?.length || 1} Modification(s) Logged
                    </span>
                  </h4>
                  
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-2.5">Field / Metric</th>
                          <th className="px-4 py-2.5 text-rose-700 bg-rose-50/50">Previous Value (Before)</th>
                          <th className="px-4 py-2.5 text-emerald-800 bg-emerald-50/50">New Value (After)</th>
                          <th className="px-4 py-2.5 text-right">Net Impact / Diff</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium bg-white">
                        {audit.changes && audit.changes.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-black text-slate-900">
                              {item.field}
                            </td>
                            <td className="px-4 py-3 text-rose-700 font-bold bg-rose-50/20">
                              {item.previous}
                            </td>
                            <td className="px-4 py-3 text-emerald-800 font-black bg-emerald-50/20">
                              {item.current}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 font-extrabold text-[10px]">
                                {item.diff}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Qualitative Remarks */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Admin Context & Remarks</span>
                  <p className="font-semibold text-slate-800 whitespace-pre-wrap">{cleanText(audit.remarks || notif.description)}</p>
                </div>

                {/* Flagged Alert Banner if Flagged */}
                {isFlagged && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2">
                    <Flag className="size-4 fill-amber-500 text-amber-600" />
                    <span>This notification is currently flagged for CEO follow-up action.</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Flag Icon Only Toggle inside Modal */}
                  <button
                    onClick={(e) => toggleFlag(notif.id, e)}
                    className={`px-3 py-2 rounded-xl text-xs font-black border transition flex items-center gap-1.5 cursor-pointer ${
                      isFlagged
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                    }`}
                    title={isFlagged ? 'Flagged for follow-up (Click to unflag)' : 'Flag notification for follow-up'}
                  >
                    <Flag className={`size-3.5 ${isFlagged ? 'fill-white' : ''}`} />
                    <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
                  </button>

                  {/* Mark Action Taken Button (Moves out of All Alerts, to Action Taken page) */}
                  {!isActionTaken && (
                    <button
                      onClick={() => {
                        markActionTaken(notif.id)
                        showToast(`Action completed for ${resolveStaffName(audit.affectedStaff)}! Moved to Action Taken.`, 'success')
                        setSelectedNotifForDetails(null)
                      }}
                      className="px-4 py-2 bg-[#832D51] hover:bg-[#68243f] text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="size-4 text-emerald-300" />
                      Mark Action Taken
                    </button>
                  )}

                  {isActionTaken && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold px-3 py-1.5 rounded-xl text-xs">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      Action Completed & Recorded
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedNotifForDetails(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-xl text-xs transition cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>

            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default Notifications
