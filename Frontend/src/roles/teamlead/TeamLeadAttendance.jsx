import React, { useState } from 'react'
import Attendance from '../sales/Attendance.jsx'
import ManagerAttendance from '../manager/ManagerAttendance.jsx'
import { hasPermission } from '../../utils/permissionUtils.js'
import { Clock, Users, ShieldCheck } from 'lucide-react'

export default function TeamLeadAttendance() {
  const canMarkOwn = hasPermission('hrms.attendance.mark')
  const canViewTeam = hasPermission('hrms.attendance.view_team')
  
  // Default tab based on admin permission
  const [activeTab, setActiveTab] = useState(canViewTeam ? 'team' : 'own')

  return (
    <div className="space-y-4 font-sans">
      {/* Dynamic Permissions Combined Header Bar */}
      {canMarkOwn && canViewTeam && (
        <div className="bg-white border border-[#E8D8C8] p-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 px-2">
            <ShieldCheck className="w-5 h-5 text-[#966038]" />
            <div>
              <h2 className="text-xs font-black text-[#543D30] uppercase tracking-wider">
                Attendance Hub (Team Lead)
              </h2>
              <p className="text-[10px] text-slate-500 font-semibold">
                Switch between your personal selfie GPS check-in and team attendance logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#FAF6F0] p-1 rounded-xl shrink-0 border border-[#E8D8C8]">
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'team'
                  ? 'bg-[#543D30] text-white shadow-xs'
                  : 'text-[#6B4E3D] hover:text-[#543D30]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#D49A6A]" /> Team Attendance
            </button>
            <button
              onClick={() => setActiveTab('own')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'own'
                  ? 'bg-[#966038] text-white shadow-xs'
                  : 'text-[#6B4E3D] hover:text-[#543D30]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-200" /> My Selfie Check-In
            </button>
          </div>
        </div>
      )}

      {/* Render selected view */}
      {activeTab === 'team' && canViewTeam && <ManagerAttendance />}
      {activeTab === 'own' && canMarkOwn && <Attendance />}
    </div>
  )
}
