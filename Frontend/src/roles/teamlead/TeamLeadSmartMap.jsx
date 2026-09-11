import React, { useState, lazy, Suspense } from 'react'
import { hasPermission } from '../../utils/permissionUtils.js'
import { MapPin, Users, Compass } from 'lucide-react'

// Lazy-load both heavy map components so only the active tab chunk is downloaded
const ManagerSmartMap = lazy(() => import('../manager/ManagerSmartMap.jsx'))
const SmartClientMap = lazy(() => import('../sales/SmartClientMap.jsx'))

// Lightweight fallback while the map chunk downloads
function MapLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-[#FAF6F0] rounded-2xl border border-[#E8D8C8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#966038]/20 border-t-[#966038] rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Loading Map…</span>
      </div>
    </div>
  )
}

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
              Smart Client &amp; Live Tracking Radar (Team Lead)
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

      {/* Render selected view — lazy-loaded on first visit */}
      <Suspense fallback={<MapLoader />}>
        {activeTab === 'team' && canViewTeamMap ? <ManagerSmartMap /> : <SmartClientMap />}
      </Suspense>
    </div>
  )
}
