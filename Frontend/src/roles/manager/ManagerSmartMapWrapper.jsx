import React, { useState, lazy, Suspense } from 'react'
import { MapPin, Users, Compass } from 'lucide-react'
import useCurrentUser from '../../hooks/useCurrentUser.js'

// Lazy-load both heavy map components so only the active tab is downloaded
const ManagerSmartMap = lazy(() => import('./ManagerSmartMap.jsx'))
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

export default function ManagerSmartMapWrapper() {
  const [activeTab, setActiveTab] = useState('team')
  const currentUser = useCurrentUser()

  const isCeo = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/ceo') ||
    String(currentUser?.role || currentUser?.designation || '').toLowerCase().includes('ceo') ||
    String(currentUser?.role || currentUser?.designation || '').toLowerCase().includes('founder')
  )

  return (
    <div className="space-y-4 font-sans">
      {/* Dynamic Permissions Combined Header Bar */}
      <div className="bg-white border border-[#E8D8C8] p-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 px-2">
          <MapPin className="w-5 h-5 text-[#966038]" />
          <div>
            <h2 className="text-xs font-black text-[#543D30] uppercase tracking-wider">
              {isCeo
                ? 'SMART CLIENT & LIVE TRACKING RADAR (CEO)'
                : 'Smart Client & Live Tracking Radar (Sales Manager)'}
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold">
              {isCeo
                ? 'Real-time live team location tracking and field activity radar.'
                : 'Toggle between live team location tracking and personal client radar navigation map.'}
            </p>
          </div>
        </div>

        {!isCeo ? (
          <div className="flex items-center gap-1 bg-[#FAF6F0] p-1 rounded-xl shrink-0 border border-[#E8D8C8]">
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
        ) : (
          <div className="flex items-center gap-1.5 bg-[#543D30] px-4 py-1.5 rounded-xl shrink-0 border border-[#543D30] text-xs font-black text-white shadow-xs">
            <Users className="w-3.5 h-3.5 text-[#D49A6A]" />
            <span>Team Live Radar Map</span>
          </div>
        )}
      </div>

      {/* Render selected view — loaded lazily on first tab switch */}
      <Suspense fallback={<MapLoader />}>
        {isCeo || activeTab === 'team' ? <ManagerSmartMap /> : <SmartClientMap />}
      </Suspense>
    </div>
  )
}
