import React, { useState, useEffect } from 'react'
import { MapPin, Navigation, Phone, CheckCircle, Bell, X, Compass, ExternalLink, UserCheck } from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'

const NEARBY_CLIENT_ACCOUNTS = [
  {
    id: 'cust_201',
    company: 'Zenith Logistics & Transport',
    contactPerson: 'Karthik Raja (VP Fleet)',
    phone: '+91 98765 11223',
    address: 'Plot 45, Guindy Industrial Estate, Chennai',
    distanceKm: '0.4 km away on your route',
    tier: 'Platinum Account',
    status: 'Active Client',
    lastVisitDate: '28/07/2026',
    notes: 'Requested quarterly service review and offline telemetry demonstration.',
  },
  {
    id: 'cust_202',
    company: 'Apex Healthcare & Diagnostic Center',
    contactPerson: 'Dr. Meena Swaminathan',
    phone: '+91 98765 99887',
    address: 'GST Road, Tambaram, Chennai',
    distanceKm: '0.8 km away on your route',
    tier: 'Gold Enterprise',
    status: 'Active Client',
    lastVisitDate: '01/08/2026',
    notes: 'Interested in adding 20 more user licenses for new medical branch.',
  },
]

export default function ProximityClientAlert({ onScheduleVisit }) {
  const { showToast } = useToast()
  const [activeAlert, setActiveAlert] = useState(null)
  const [dismissedIds, setDismissedIds] = useState([])
  const [simulating, setSimulating] = useState(false)

  // Auto trigger proximity alert after component mounts or when navigating
  useEffect(() => {
    const timer = setTimeout(() => {
      const available = NEARBY_CLIENT_ACCOUNTS.filter((c) => !dismissedIds.includes(c.id))
      if (available.length > 0) {
        setActiveAlert(available[0])
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [dismissedIds])

  const handleDismiss = () => {
    if (activeAlert) {
      setDismissedIds((prev) => [...prev, activeAlert.id])
      setActiveAlert(null)
    }
  }

  const handleSimulateGPS = () => {
    setSimulating(true)
    setTimeout(() => {
      setSimulating(false)
      setDismissedIds([])
      setActiveAlert(NEARBY_CLIENT_ACCOUNTS[0])
      showToast('📍 Live GPS Route Scan: Identified 2 existing clients nearby!', 'info')
    }, 800)
  }

  const handleAddQuickVisit = () => {
    if (!activeAlert) return
    try {
      const existingVisits = JSON.parse(localStorage.getItem('tc_sales_visits') || '[]')
      const newVisit = {
        id: `vis_${Date.now()}`,
        clientName: activeAlert.company,
        location: activeAlert.address,
        purpose: `Courtesy Check-in (Proximity Alert: ${activeAlert.distanceKm})`,
        status: 'Scheduled',
        time: 'Today (En-Route)',
        date: new Date().toISOString().slice(0, 10),
        contactPerson: activeAlert.contactPerson,
        phone: activeAlert.phone,
      }
      localStorage.setItem('tc_sales_visits', JSON.stringify([newVisit, ...existingVisits]))
      showToast(`🚗 Added Quick Courtesy Visit for ${activeAlert.company}!`, 'success')
      if (onScheduleVisit) onScheduleVisit(newVisit)
    } catch (e) {}
    handleDismiss()
  }

  if (!activeAlert) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ca8a04] text-white flex items-center justify-center font-black shadow-xs">
            <Compass size={16} className="animate-spin" />
          </div>
          <div>
            <span className="font-extrabold text-amber-950 block">Live Proximity Route Scanner</span>
            <span className="text-[11px] text-amber-800 font-semibold">Scanning 2.0 km radius for existing client accounts en-route...</span>
          </div>
        </div>

        <button
          onClick={handleSimulateGPS}
          disabled={simulating}
          className="px-3 py-1.5 rounded-xl bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-[11px] cursor-pointer transition flex items-center gap-1 shadow-2xs shrink-0"
        >
          <Navigation size={13} /> {simulating ? 'Scanning GPS...' : 'Scan Nearby Clients'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-amber-900 via-amber-950 to-slate-900 text-white rounded-3xl p-5 border-2 border-amber-400 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <MapPin size={22} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                <Bell size={11} /> PROXIMITY ROUTE ALERT
              </span>
              <span className="text-amber-300 text-xs font-mono font-bold">{activeAlert.distanceKm}</span>
            </div>
            <h4 className="text-base font-black text-white mt-1 leading-tight">{activeAlert.company}</h4>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 text-amber-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3 text-xs space-y-1.5 relative z-10">
        <div className="flex flex-wrap items-center justify-between text-amber-100 font-semibold gap-2">
          <span>👤 {activeAlert.contactPerson} ({activeAlert.phone})</span>
          <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded border border-amber-400/30 font-extrabold">{activeAlert.tier}</span>
        </div>
        <p className="text-amber-200/90 text-[11px] font-medium leading-relaxed truncate">📍 {activeAlert.address}</p>
        <p className="text-white/80 text-[11px] font-semibold italic border-t border-white/10 pt-1.5">
          "{activeAlert.notes}"
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-1 relative z-10">
        <a
          href={`tel:${activeAlert.phone}`}
          className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs transition flex items-center gap-1.5"
        >
          <Phone size={14} /> Call Contact
        </a>

        <button
          onClick={handleAddQuickVisit}
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md cursor-pointer transition flex items-center gap-1.5"
        >
          <Navigation size={14} /> Add Courtesy Drop-In Visit
        </button>
      </div>
    </div>
  )
}
