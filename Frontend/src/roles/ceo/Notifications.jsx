import React, { useState } from 'react'
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
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'

const MOCK_CEO_NOTIFICATIONS = [
  {
    id: 1,
    category: 'LEAVE_APPROVAL',
    title: 'Urgent Leave Approval Request',
    description: 'Vikram Singh (Sales Manager) requested Sick Leave for 1 Day (Aug 9, 2026) due to medical migraine.',
    time: '15 mins ago',
    unread: true,
    actionable: true,
    link: '/ceo/hrms',
  },
  {
    id: 2,
    category: 'MAJOR_DEAL',
    title: 'Major Enterprise Deal Closed!',
    description: 'Ananya Roy won contract with Apex Technologies Pvt Ltd valued at ₹4,50,000 for Enterprise CRM implementation.',
    time: '45 mins ago',
    unread: true,
    actionable: false,
    link: '/ceo/sales-overview',
  },
  {
    id: 3,
    category: 'PERMISSION_REQUEST',
    title: 'Client Field Demo Permission Request',
    description: 'Ananya Roy submitted an Early Departure permission for key account keynote pitch in OMR IT Corridor.',
    time: '1 hour ago',
    unread: true,
    actionable: true,
    link: '/ceo/hrms',
  },
  {
    id: 4,
    category: 'TARGET_ACHIEVEMENT',
    title: 'Regional Sales Milestone Achieved',
    description: 'South Region led by Vikram Singh crossed 82.5% annual sales achievement target with 14 signed customer accounts.',
    time: '3 hours ago',
    unread: false,
    actionable: false,
    link: '/ceo/revenue-finance',
  },
  {
    id: 5,
    category: 'CUSTOMER_UPDATE',
    title: 'Key Account Retainer Renewed',
    description: 'Global Corp Solutions renewed their SaaS multi-branch subscription (₹2,50,000) for the upcoming fiscal quarter.',
    time: '5 hours ago',
    unread: false,
    actionable: false,
    link: '/ceo/customers',
  },
  {
    id: 6,
    category: 'SYSTEM_ALERT',
    title: 'Automated Daily Security & Database Backup',
    description: 'Cloud encrypted database replication completed successfully with 100% integrity across all regional clusters.',
    time: '1 day ago',
    unread: false,
    actionable: false,
    link: '/ceo/settings',
  },
]

const CATEGORY_CONFIG = {
  LEAVE_APPROVAL: { label: 'Leave Approvals', icon: Calendar, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  PERMISSION_REQUEST: { label: 'Permission Requests', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  MAJOR_DEAL: { label: 'Major Deals', icon: Award, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  CUSTOMER_UPDATE: { label: 'Customer Updates', icon: Building2, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  TARGET_ACHIEVEMENT: { label: 'Target Achievements', icon: DollarSign, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  SYSTEM_ALERT: { label: 'System Alerts', icon: ShieldAlert, color: 'text-slate-600 bg-slate-100 border-slate-200' },
}

function CeoNotifications() {
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState(MOCK_CEO_NOTIFICATIONS)
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  const unreadCount = notifications.filter((n) => n.unread).length

  // Filtered notifications
  const filteredNotifs = notifications.filter((n) => {
    if (selectedCategory === 'ALL') return true
    return n.category === selectedCategory
  })

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    showToast('All notifications marked as read', 'info')
  }

  const markItemRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    )
  }

  const handleAction = (id, decision) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    showToast(`Request ${decision} successfully`, decision === 'Approved' ? 'success' : 'info')
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <Bell className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              CEO Executive Notification Center
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Important CEO-level operational alerts: leave & permission clearances, major enterprise deal closures, customer milestone updates, and security logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3.5 py-2 text-xs font-bold transition"
            >
              <Check className="size-3.5" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { key: 'ALL', label: 'All Alerts', badge: unreadCount },
          { key: 'LEAVE_APPROVAL', label: 'Leave Requests' },
          { key: 'PERMISSION_REQUEST', label: 'Permission Requests' },
          { key: 'MAJOR_DEAL', label: 'Major Deals' },
          { key: 'CUSTOMER_UPDATE', label: 'Customer Updates' },
          { key: 'TARGET_ACHIEVEMENT', label: 'Target Achievements' },
          { key: 'SYSTEM_ALERT', label: 'System Alerts' },
        ].map((tab) => {
          const isActive = selectedCategory === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-[#004749] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`rounded-full px-2 py-0.2 text-[10px] font-black ${isActive ? 'bg-white text-[#004749]' : 'bg-[#540000] text-white'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Notifications Stream */}
      <div className="space-y-3">
        {filteredNotifs.map((notif) => {
          const conf = CATEGORY_CONFIG[notif.category] || CATEGORY_CONFIG.SYSTEM_ALERT
          const Icon = conf.icon

          return (
            <div
              key={notif.id}
              onClick={() => markItemRead(notif.id)}
              className={`rounded-2xl border p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                notif.unread
                  ? 'border-[#004749]/30 bg-white shadow-xs ring-1 ring-[#004749]/10'
                  : 'border-slate-200/80 bg-white/70 opacity-90'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${conf.color}`}>
                  <Icon className="size-5" />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-600">
                      {conf.label}
                    </span>
                    <h3 className="text-sm font-black text-slate-900">{notif.title}</h3>
                    {notif.unread && (
                      <span className="size-2 rounded-full bg-[#540000]" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">{notif.description}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{notif.time}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {notif.actionable ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAction(notif.id, 'Rejected')
                      }}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAction(notif.id, 'Approved')
                      }}
                      className="rounded-xl bg-[#004749] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#013b3f] transition shadow-xs"
                    >
                      Approve
                    </button>
                  </div>
                ) : (
                  <Link
                    to={notif.link}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 text-xs font-bold transition"
                  >
                    View Details
                  </Link>
                )}
              </div>
            </div>
          )
        })}

        {filteredNotifs.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            <CheckCircle2 className="size-10 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-700">No notifications in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CeoNotifications
