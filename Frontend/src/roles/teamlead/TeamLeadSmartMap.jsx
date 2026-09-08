import React, { useState } from 'react'
import SmartClientMap from '../sales/SmartClientMap.jsx'
import ManagerSmartMap from '../manager/ManagerSmartMap.jsx'
import { hasPermission } from '../../utils/permissionUtils.js'
import { MapPin, Users, Compass, ShieldCheck } from 'lucide-react'

export default function TeamLeadSmartMap() {
  const canViewTeamMap = hasPermission('system.smart_map.team')
  const [activeTab, setActiveTab] = useState(canViewTeamMap ? 'team' : 'own')

  return (
    <div className="space-y-4 font-sans">
      {/* Dynamic Permissions Combined Header Bar */}
      <div className="bg-white border border-[#E8D8C8] p-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 px-2">
          <MapPin className="w-5 h-5 text-[#966038]" />
          <div>
            <h2 className="text-xs font-black text-[#543D30] uppercase tracking-wider">
              Smart Client & Live Tracking Radar (Team Lead)
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold">
              Toggle between live team location tracking and personal client radar navigation map.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#FAF6F0] p-1 rounded-xl shrink-0 border border-[#E8D8C8]">
          {canViewTeamMap && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'team'
                  ? 'bg-[#543D30] text-white shadow-xs'
                  : 'text-[#6B4E3D] hover:text-[#543D30]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#D49A6A]" /> Team Live Radar Map
            </button>
          )}
          <button
            onClick={() => setActiveTab('own')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'own'
                ? 'bg-[#966038] text-white shadow-xs'
                : 'text-[#6B4E3D] hover:text-[#543D30]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-200" /> Personal Smart Map
          </button>
        </div>
      </div>

      {/* Render selected view */}
      {activeTab === 'team' && canViewTeamMap ? <ManagerSmartMap /> : <SmartClientMap />}
    </div>
  )
}
