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
  MailOpen,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate } from '../../utils/dateUtils.js'
import { notificationAPI } from '../../services/api.js'

export default function ManagerNotifications() {
  const { showToast } = useToast()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  // Date Wise Filter State
  const [dateFilter, setDateFilter] = useState('All') // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom Date'
  const [customDate, setCustomDate] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await notificationAPI.getNotifications()
      const raw = Array.isArray(res) ? res : res?.data || []
      setList(
        raw.map((n) => ({
          ...n,
          read: n.is_read || n.read || false,
          type: n.category || n.type || 'info',
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          date: n.created_at ? n.created_at.slice(0, 10) : '2026-08-05',
        }))
      )
    } catch (e) {
      console.error("Failed to load notifications:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAllRead = async () => {
    try {
      const unreadList = list.filter((n) => !n.read)
      await Promise.allSettled(unreadList.map((n) => notificationAPI.markRead(n.id)))
      showToast('All notifications marked as read!', 'success')
      fetchNotifications()
    } catch (e) {
      showToast('Failed to mark notifications as read', 'error')
    }
  }

  const markSingleRead = async (id) => {
    try {
      await notificationAPI.markRead(id)
      setList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      showToast('Notification marked as read', 'success')
    } catch (e) {
      showToast('Failed to update notification', 'error')
    }
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
      <div className="bg-white border border-mgr-primary-200 p-6 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-mgr-primary-700" /> Manager System Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time notifications for lead conversions by Executives, visit check-ins, EOD reports, and expense claims.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="mgr-card px-4 py-2.5 rounded-xl bg-mgr-primary-700 hover:bg-mgr-primary-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-yellow-600/20 shrink-0"
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
            className="w-full h-9 bg-mgr-primary-50/50 border border-mgr-primary-300 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-mgr-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Date Wise Filter */}
          <div className="flex items-center gap-1.5 bg-[#fffdf5] border border-mgr-primary-300 rounded-xl px-3 py-1.5 font-extrabold text-mgr-primary-900">
            <CalendarDays size={15} className="text-mgr-primary-700" />
            <span>Date Filter:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="mgr-card bg-transparent text-mgr-primary-950 font-black focus:outline-none cursor-pointer"
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
              className="h-9 bg-white border border-mgr-primary-300 rounded-xl px-2.5 text-xs font-bold focus:outline-none text-slate-900"
            />
          )}

          {/* Alert Type Filter */}
          <div className="flex items-center gap-1.5 bg-[#fffdf5] border border-mgr-primary-300 rounded-xl px-3 py-1.5 font-extrabold text-mgr-primary-900">
            <Filter size={14} className="text-mgr-primary-700" />
            <span>Alert Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mgr-card bg-transparent text-mgr-primary-950 font-black focus:outline-none cursor-pointer"
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
                  : 'bg-[#fffdf5] border-mgr-primary-300 shadow-2xs'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{item.title}</h3>
                  {item.date && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-mgr-primary-100 text-mgr-primary-900 border border-mgr-primary-300">
                      📅 {item.date}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">{item.message}</p>
                <span className="text-[10px] font-bold text-slate-400 block pt-1">{item.time || 'Just now'}</span>
              </div>

              {!item.read && (
                <button
                  type="button"
                  onClick={() => markSingleRead(item.id)}
                  className="mgr-card p-1.5 rounded-xl bg-mgr-primary-50 hover:bg-mgr-primary-100 text-mgr-primary-800 border border-mgr-primary-200 transition active:scale-95 cursor-pointer shrink-0 mt-0.5 flex items-center justify-center"
                  title="Mark as Read"
                >
                  <MailOpen className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
