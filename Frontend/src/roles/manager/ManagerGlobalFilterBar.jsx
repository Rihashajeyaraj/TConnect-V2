import React, { useState, useEffect } from 'react'
import {
  Filter,
  UserCheck,
  Calendar,
  Search,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useManagerFilter } from './ManagerFilterContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { hrmsAPI } from '../../services/api.js'

export default function ManagerGlobalFilterBar() {
  const {
    filters,
    setExecutive,
    setDateRange,
    setFromDate,
    setToDate,
    setStatus,
    setSearchKeyword,
    resetFilters,
  } = useManagerFilter()

  const currentUser = useCurrentUser()
  const managerId = String(currentUser.id || currentUser.user_id || currentUser.employee_code || '').trim()
  const managerEmail = (currentUser.email || '').toLowerCase().trim()
  const managerName = currentUser.name || currentUser.full_name || 'Sales Manager'

  const [assignedExecutives, setAssignedExecutives] = useState([])

  useEffect(() => {
    hrmsAPI
      .getEmployees()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        const filtered = raw.filter((emp) => {
          if (!emp) return false

          const empManagerId = String(emp.reporting_manager_id || emp.reporting_manager || '').trim()
          const empManagerEmail = String(emp.reporting_manager_email || '').toLowerCase().trim()
          const empManagerName = String(emp.reporting_manager_name || '').toLowerCase().trim()

          const myId = String(currentUser.id || '').trim()
          const myUserId = String(currentUser.user_id || '').trim()
          const myCode = String(currentUser.employee_code || '').trim()
          const myEmail = String(currentUser.email || '').toLowerCase().trim()
          const myName = String(currentUser.name || currentUser.full_name || '').toLowerCase().trim()

          const idMatch = !!(empManagerId && (
            (myId && empManagerId === myId) ||
            (myUserId && empManagerId === myUserId) ||
            (myCode && empManagerId === myCode)
          ))

          const emailMatch = !!(empManagerEmail && myEmail && empManagerEmail === myEmail)

          const nameMatch = !!(empManagerName && myName && empManagerName === myName)

          return idMatch || emailMatch || nameMatch
        })
        setAssignedExecutives(filtered)
      })
      .catch(() => {})
  }, [managerId, managerEmail, managerName, currentUser])

  // Calculate Active Filters Count
  let activeCount = 0
  if (filters.selectedExecutive !== 'All') activeCount++
  if (filters.dateRange !== 'all') activeCount++
  if (filters.statusFilter !== 'All') activeCount++
  if (filters.searchKeyword && filters.searchKeyword.trim() !== '') activeCount++

  return (
    <div className="bg-[#fffdf5] border border-mgr-primary-300 rounded-3xl p-4 shadow-sm mb-6 space-y-3">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mgr-primary-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#c2410c] text-white flex items-center justify-center font-bold shadow-2xs">
            <Filter size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
              Sales Manager Team Filter System
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#c2410c] text-white text-[10px] font-black shadow-2xs">
                  {activeCount} Filter{activeCount > 1 ? 's' : ''} Active
                </span>
              )}
            </h3>
            <p className="text-[10px] font-semibold text-slate-500">
              Filter applies across Dashboard, Leads, Field Visits, Expenses, Customers, Team Reports & HRMS.
            </p>
          </div>
        </div>

        {/* Reset Button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="mgr-card px-3 py-1 rounded-xl bg-mgr-primary-100 hover:bg-mgr-primary-200 text-mgr-primary-950 font-black text-[11px] flex items-center gap-1.5 transition cursor-pointer border border-mgr-primary-300"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        )}
      </div>

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-semibold">
        {/* 1. REQUIRED: Dynamic Sales Executive Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-mgr-primary-950 uppercase tracking-wider flex items-center gap-1">
            <UserCheck size={13} className="text-[#c2410c]" /> Required: Sales Executive
          </label>
          <select
            value={filters.selectedExecutive}
            onChange={(e) => setExecutive(e.target.value)}
            className="mgr-card w-full h-9 bg-white border border-mgr-primary-300 rounded-xl px-3 text-xs font-black text-slate-900 focus:outline-none focus:border-[#c2410c] shadow-2xs cursor-pointer"
          >
            <option value="All">All Assigned Executives ({assignedExecutives.length})</option>
            {assignedExecutives.map((se) => (
              <option key={se.id || se.employee_code} value={se.name || se.full_name}>
                {se.name || se.full_name} ({se.employee_code || se.employee_id || 'EMP'})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Date Range Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-mgr-primary-950 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={13} className="text-[#c2410c]" /> Date Period
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="mgr-card w-full h-9 bg-white border border-mgr-primary-300 rounded-xl px-3 text-xs font-black text-slate-900 focus:outline-none focus:border-[#c2410c] shadow-2xs cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* 3. Status Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-mgr-primary-950 uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal size={13} className="text-[#c2410c]" /> Status Filter
          </label>
          <select
            value={filters.statusFilter}
            onChange={(e) => setStatus(e.target.value)}
            className="mgr-card w-full h-9 bg-white border border-mgr-primary-300 rounded-xl px-3 text-xs font-black text-slate-900 focus:outline-none focus:border-[#c2410c] shadow-2xs cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active / Approved / Completed</option>
            <option value="Pending">Pending / In Progress</option>
            <option value="Hot">Hot Leads / High Priority</option>
          </select>
        </div>

        {/* 4. Instant Search Keyword */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-mgr-primary-950 uppercase tracking-wider flex items-center gap-1">
            <Search size={13} className="text-[#c2410c]" /> Instant Search
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search keyword, name, ID..."
              value={filters.searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full h-9 bg-white border border-mgr-primary-300 rounded-xl pl-8 pr-7 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#c2410c] shadow-2xs"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {filters.searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="mgr-card absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Pickers (Shown if dateRange === 'custom') */}
      {filters.dateRange === 'custom' && (
        <div className="flex items-center gap-3 pt-2 border-t border-mgr-primary-200/60 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-mgr-primary-950">From Date:</span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 bg-white border border-mgr-primary-300 rounded-lg px-2 text-xs font-bold focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-mgr-primary-950">To Date:</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 bg-white border border-mgr-primary-300 rounded-lg px-2 text-xs font-bold focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
