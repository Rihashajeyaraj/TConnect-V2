import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Target,
  DollarSign,
  Calendar,
  Clock,
  Check,
  CalendarDays,
  Filter,
  Search,
  X,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate } from '../../utils/dateUtils.js'

const NOTIFICATIONS_LIST = [
  {
    id: 1,
    title: '🎉 New Deal Converted!',
    message: 'Ashwini E won and converted Zenith Logistics (₹8,90,000).',
    time: '10 mins ago',
    date: '2026-08-05',
    read: false,
    type: 'success',
  },
  {
    id: 2,
    title: 'Field Visit Completed',
    message: 'Suresh Raina completed site meeting at ABC Hospital.',
    time: '45 mins ago',
    date: '2026-08-05',
    read: false,
    type: 'info',
  },
  {
    id: 3,
    title: 'Expense Claim Submitted',
    message: 'Ashwini E submitted ₹3,500 travel reimbursement claim for approval.',
    time: '1 hour ago',
    date: '2026-08-05',
    read: false,
    type: 'alert',
  },
  {
    id: 4,
    title: 'Attendance Check-In Alert',
    message: 'Karthik Raja checked in at 09:35 AM at Adyar IT Corridor.',
    time: '2 hours ago',
    date: '2026-08-04',
    read: true,
    type: 'info',
  },
]

export default function ManagerNotifications() {
  const { showToast } = useToast()
  const [list, setList] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_app_notifications')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const managerAlerts = parsed.filter((n) => !n.recipientRole || n.recipientRole === 'manager')
          if (managerAlerts.length > 0) {
            return managerAlerts
          }
        }
      }
    } catch (e) {}
    return NOTIFICATIONS_LIST
  })

  // Date Wise Filter State
  const [dateFilter, setDateFilter] = useState('All') // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom Date'
  const [customDate, setCustomDate] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tc_app_notifications', JSON.stringify(list))
    } catch (e) {}
  }, [list])

  const markAllRead = () => {
    setList((prev) => prev.map((item) => ({ ...item, read: true })))
    showToast('All notifications marked as read!', 'success')
  }

  const todayStr = formatDate(new Date())
  const yesterdayStr = formatDate(new Date(Date.now() - 86400000))

  // Filtered Notifications
  const filteredList = list.filter((item) => {
    const searchKw = search.toLowerCase().trim()
    const matchesSearch =
      !searchKw ||
      (item.title || '').toLowerCase().includes(searchKw) ||
      (item.message || '').toLowerCase().includes(searchKw)

    const matchesType = typeFilter === 'All' || (item.type || '').toLowerCase() === typeFilter.toLowerCase()

    let matchesDate = true
    const itemDate = item.date || '2026-08-05'

    if (dateFilter === 'Today') {
      matchesDate = itemDate.includes('2026-08-05') || itemDate === todayStr
    } else if (dateFilter === 'Yesterday') {
      matchesDate = itemDate.includes('2026-08-04') || itemDate === yesterdayStr
    } else if (dateFilter === 'Custom Date' && customDate) {
      matchesDate = itemDate.includes(customDate)
    }

    return matchesSearch && matchesType && matchesDate
  })

  const unreadCount = filteredList.filter((n) => !n.read).length

  return (
    <div className="space-y-6 font-sans text-slate-900 bg-slate-50 min-h-screen pb-12">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-amber-200 p-6 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-[#ca8a04]" /> Manager System Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time notifications for lead conversions by Executives, visit check-ins, EOD reports, and expense claims.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2.5 rounded-xl bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-yellow-600/20 shrink-0"
          >
            <Check size={15} /> Mark All as Read ({unreadCount} Unread)
          </button>
        )}
      </div>

      {/* ── Date & Multi-Filter Bar ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notification title, executive, deal message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-amber-50/50 border border-amber-300 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Date Wise Filter */}
          <div className="flex items-center gap-1.5 bg-[#fffdf5] border border-amber-300 rounded-xl px-3 py-1.5 font-extrabold text-amber-900">
            <CalendarDays size={15} className="text-[#ca8a04]" />
            <span>Date Filter:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-amber-950 font-black focus:outline-none cursor-pointer"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom Date">Custom Date</option>
            </select>
          </div>

          {dateFilter === 'Custom Date' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-9 bg-white border border-amber-300 rounded-xl px-2.5 text-xs font-bold focus:outline-none text-slate-900"
            />
          )}

          {/* Alert Type Filter */}
          <div className="flex items-center gap-1.5 bg-[#fffdf5] border border-amber-300 rounded-xl px-3 py-1.5 font-extrabold text-amber-900">
            <Filter size={14} className="text-[#ca8a04]" />
            <span>Alert Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-amber-950 font-black focus:outline-none cursor-pointer"
            >
              <option value="All">All Alert Types</option>
              <option value="success">Deals & Wins</option>
              <option value="info">Visits & Check-ins</option>
              <option value="alert">Expense Claims</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Notification List ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-semibold text-xs">
            No system notifications found matching your filter selection.
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition flex items-start justify-between gap-4 ${
                item.read
                  ? 'bg-white border-slate-200'
                  : 'bg-[#fffdf5] border-amber-300 shadow-2xs'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{item.title}</h3>
                  {item.date && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      📅 {item.date}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">{item.message}</p>
                <span className="text-[10px] font-bold text-slate-400 block pt-1">{item.time || 'Just now'}</span>
              </div>

              {!item.read && (
                <span className="w-3 h-3 rounded-full bg-[#ca8a04] shrink-0 mt-1 shadow-2xs" title="Unread Alert" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
