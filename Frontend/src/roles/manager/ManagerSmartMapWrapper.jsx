import React, { useState } from 'react'
import SmartClientMap from '../sales/SmartClientMap.jsx'
import ManagerSmartMap from './ManagerSmartMap.jsx'
import { MapPin, Users, Compass } from 'lucide-react'

export default function ManagerSmartMapWrapper() {
  const [activeTab, setActiveTab] = useState('team')

  return (
    <div className="space-y-4 font-sans">
      {/* Dynamic Permissions Combined Header Bar */}
      <div className="bg-white border border-[#E8D8C8] p-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 px-2">
          <MapPin className="w-5 h-5 text-[#966038]" />
          <div>
            <h2 className="text-xs font-black text-[#543D30] uppercase tracking-wider">
              Smart Client & Live Tracking Radar (Sales Manager)
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold">
              Toggle between live team location tracking and personal client radar navigation map.
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
      </div>

      {/* Render selected view */}
      {activeTab === 'team' ? <ManagerSmartMap /> : <SmartClientMap />}
    </div>
  )
}
