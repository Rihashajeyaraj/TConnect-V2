import React, { useState } from 'react'
import ManagerDashboard from '../manager/ManagerDashboard.jsx'
import ExecutiveDashboard from '../sales/Dashboard.jsx'
import { Users, User, LayoutDashboard } from 'lucide-react'

export default function TeamLeadDashboard() {
  const [activeView, setActiveView] = useState(() => {
    try {
      return localStorage.getItem('tc_tl_dashboard_active_view') || 'team'
    } catch {
      return 'team'
    }
  })

  const handleViewChange = (view) => {
    setActiveView(view)
    try {
      localStorage.setItem('tc_tl_dashboard_active_view', view)
    } catch {}
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Top Toggle Switch Bar */}
      <div className="bg-white border border-[#E8D8C8] p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#F3ECE2] text-[#966038] rounded-xl shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#543D30] uppercase tracking-wider flex items-center gap-2">
              Team Lead Workspace
              <span className="bg-[#FAF3EB] text-[#966038] border border-[#E8D8C8] text-[10px] px-2 py-0.5 rounded-full font-bold">
                {activeView === 'team' ? 'Team View' : 'Personal View'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeView === 'team'
                ? 'Supervise team revenue, executive performance, attendance and target quotas.'
                : 'Manage your personal field visits, assigned leads, revenue targets and daily schedule.'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-1.5 bg-[#FAF6F0] p-1.5 rounded-xl border border-[#E8D8C8] shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleViewChange('team')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeView === 'team'
                ? 'bg-[#543D30] text-white shadow-xs'
                : 'text-[#6B4E3D] hover:text-[#543D30] hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4 text-[#D49A6A]" /> Team Dashboard
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('personal')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeView === 'personal'
                ? 'bg-[#966038] text-white shadow-xs'
                : 'text-[#6B4E3D] hover:text-[#543D30] hover:bg-white/60'
            }`}
          >
            <User className="w-4 h-4 text-amber-200" /> My Personal Dashboard
          </button>
        </div>
      </div>

      {/* Main Dashboard View Content */}
      {activeView === 'team' ? (
        <ManagerDashboard title="Team Leader Overview" />
      ) : (
        <ExecutiveDashboard />
      )}
    </div>
  )
}
