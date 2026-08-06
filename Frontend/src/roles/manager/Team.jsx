import { useState } from 'react'
import { Users, Search, MapPin, CheckCircle2, Shield } from 'lucide-react'

const teamMembers = [
  { code: 'EMP-002', name: 'Suresh Raina', role: 'Sales Executive', status: 'Active - On Field', location: 'Guindy, Chennai', visitsToday: 4, dealsClosed: 2 },
  { code: 'EMP-003', name: 'Priya Sharma', role: 'Sales Executive', status: 'Active - In Office', location: 'HQ Chennai', visitsToday: 3, dealsClosed: 1 },
  { code: 'EMP-004', name: 'Karthik Raja', role: 'Sales Executive', status: 'Active - On Field', location: 'Adyar, Chennai', visitsToday: 2, dealsClosed: 1 },
  { code: 'EMP-005', name: 'Arun Kumar', role: 'Sales Executive', status: 'Active - On Field', location: 'Velachery, Chennai', visitsToday: 2, dealsClosed: 0 },
]

export default function ManagerTeam() {
  const [search, setSearch] = useState('')

  const filtered = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" /> Sales Team Directory & Attendance
          </h1>
          <p className="text-xs text-slate-400 mt-1">Overview of assigned sales representatives, live locations, and daily output.</p>
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team member name or location..."
            className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((member) => (
          <div key={member.code} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-4 hover:border-purple-500/50 transition shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-300 font-black text-sm flex items-center justify-center border border-purple-500/40">
                  {member.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">{member.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{member.code} • {member.role}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {member.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-center">
              <div className="p-2 rounded-xl bg-slate-900/60">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Current Location</p>
                <p className="text-xs font-bold text-purple-300 mt-0.5 truncate">{member.location}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Visits Today</p>
                <p className="text-xs font-bold text-white mt-0.5">{member.visitsToday}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Deals Closed</p>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">{member.dealsClosed}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
