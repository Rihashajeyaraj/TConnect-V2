import React, { useState, useEffect } from 'react'
import {
  Clock,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  CalendarDays,
  UserCheck,
  LayoutGrid,
  Table,
  Eye,
  X,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'

const DEFAULT_ATTENDANCE = [
  {
    id: 'ATT-001',
    name: 'Ashwini E',
    code: 'EMP-105',
    designation: 'Senior Sales Executive',
    status: 'Present',
    checkInTime: '09:00 AM',
    checkOutTime: '06:00 PM',
    workingHours: '9h 00m',
    gpsLocation: 'Guindy Industrial Estate, Chennai (Verified)',
    selfieUploaded: true,
    date: '05/08/2026',
  },
  {
    id: 'ATT-002',
    name: 'Suresh Raina',
    code: 'EMP-106',
    designation: 'Field Sales Executive',
    status: 'Present',
    checkInTime: '09:15 AM',
    checkOutTime: '06:15 PM',
    workingHours: '9h 00m',
    gpsLocation: 'Tambaram Main Road, Chennai (Verified)',
    selfieUploaded: true,
    date: '05/08/2026',
  },
  {
    id: 'ATT-003',
    name: 'Priya Sharma',
    code: 'EMP-104',
    designation: 'Inside Sales Specialist',
    status: 'Present',
    checkInTime: '09:05 AM',
    checkOutTime: '06:00 PM',
    workingHours: '8h 55m',
    gpsLocation: 'HQ Corporate Office, Chennai',
    selfieUploaded: true,
    date: '05/08/2026',
  },
  {
    id: 'ATT-004',
    name: 'Abi hastro',
    code: 'EMP000012',
    designation: 'Sales Executive',
    status: 'Late',
    checkInTime: '09:45 AM',
    checkOutTime: '06:30 PM',
    workingHours: '8h 45m',
    gpsLocation: 'Adyar IT Corridor, Chennai (Verified)',
    selfieUploaded: true,
    date: '05/08/2026',
  },
]

const STATUS_COLORS = {
  Present: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Late: 'bg-amber-100 text-amber-800 border-amber-300',
  Absent: 'bg-rose-100 text-rose-800 border-rose-300',
  'Half Day': 'bg-sky-100 text-sky-800 border-sky-300',
  'On Leave': 'bg-slate-100 text-slate-600 border-slate-300',
}

export default function ManagerAttendance() {
  const { showToast } = useToast()

  const [viewMode, setViewMode] = useState('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedItem, setSelectedItem] = useState(null)

  const [logs, setLogs] = useState([])

  useEffect(() => {
    let combined = [...DEFAULT_ATTENDANCE]
    try {
      const savedStr = localStorage.getItem('tc_attendance_logs')
      if (savedStr) {
        const parsed = JSON.parse(savedStr)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((l, idx) => ({
            id: l.id || `att_${3000 + idx}`,
            name: l.name || l.executiveName || l.executive || 'Sales Executive',
            code: l.code || l.employee_code || l.empCode || 'EMP000012',
            designation: l.designation || 'Sales Executive',
            status: l.status || 'Present',
            checkInTime: l.checkInTime || l.check_in || l.timeIn || 'N/A',
            checkOutTime: l.checkOutTime || l.check_out || l.timeOut || 'N/A',
            workingHours: l.workingHours || l.working_hours || l.hours || 'N/A',
            gpsLocation: l.gpsLocation || l.location || l.gps_location || 'Location Not Tracked',
            selfieUploaded: !!l.selfieUploaded || !!l.selfie_url || false,
            date: l.date || '05/08/2026',
          }))
          const map = new Map()
          combined.forEach((d) => map.set(`${d.name}_${d.date}`, d))
          normalized.forEach((n) => map.set(`${n.name}_${n.date}`, n))
          combined = Array.from(map.values())
        }
      }
    } catch (e) {}
    setLogs(combined)
  }, [])

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase()
    const matchesSearch =
      (log.name || '').toLowerCase().includes(q) ||
      (log.code || '').toLowerCase().includes(q) ||
      (log.gpsLocation || '').toLowerCase().includes(q) ||
      (log.designation || '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPresent = logs.filter((l) => l.status === 'Present').length
  const totalLate = logs.filter((l) => l.status === 'Late').length
  const totalAbsent = logs.filter((l) => l.status === 'Absent').length
  const totalOnTime = logs.filter((l) => l.status === 'Present').length

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-600" /> Team Attendance & GPS Telemetry Log
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track daily attendance, selfie verification, working hours, check-in/out timestamps, and GPS coordinates for your team.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'cards' ? 'bg-white text-teal-700 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={14} /> Cards View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-teal-700 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table size={14} /> Table View
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Present Today</span>
          <h2 className="text-2xl font-black text-emerald-600 mt-1">{totalPresent + totalLate} / {logs.length}</h2>
          <span className="text-[11px] text-emerald-600 font-bold">
            {logs.length > 0 ? Math.round(((totalPresent + totalLate) / logs.length) * 100) : 0}% On Duty
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">On Time</span>
          <h2 className="text-2xl font-black text-teal-700 mt-1">{totalOnTime}</h2>
          <span className="text-[11px] text-teal-700 font-bold">Punctual Check-in</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Late Arrival</span>
          <h2 className="text-2xl font-black text-amber-600 mt-1">{totalLate}</h2>
          <span className="text-[11px] text-amber-600 font-bold">After 09:30 AM</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Absentees</span>
          <h2 className="text-2xl font-black text-slate-400 mt-1">{totalAbsent}</h2>
          <span className="text-[11px] text-slate-400 font-semibold">{totalAbsent === 0 ? 'Zero Absentees' : 'Absent Today'}</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, employee code, GPS location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
          <span className="text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
            <option value="Half Day">Half Day</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* CONTENT: CARDS OR TABLE */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLogs.length === 0 ? (
            <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 font-semibold text-xs">
              No attendance records match your search or filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedItem(log)}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-teal-400/50 transition cursor-pointer space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-300">
                        [{log.code}]
                      </span>
                      <h3 className="text-base font-black text-slate-900">{log.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{log.designation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${STATUS_COLORS[log.status] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                      ● {log.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{log.date}</span>
                  </div>
                </div>

                {/* Time Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-700 block uppercase">Check-In</span>
                    <span className="font-black text-emerald-950">{log.checkInTime}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 space-y-0.5">
                    <span className="text-[10px] font-bold text-rose-700 block uppercase">Check-Out</span>
                    <span className="font-black text-rose-950">{log.checkOutTime}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Hours</span>
                    <span className="font-black text-teal-700">{log.workingHours}</span>
                  </div>
                </div>

                {/* GPS */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <MapPin size={13} className="text-rose-500 shrink-0" />
                  {log.gpsLocation}
                </div>

                {/* Selfie Badge */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${log.selfieUploaded ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-300'}`}>
                    {log.selfieUploaded ? '✓ Selfie Verification Done' : '✗ Selfie Not Uploaded'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Employee Code</th>
                  <th className="px-4 py-3.5">Name & Designation</th>
                  <th className="px-4 py-3.5">Check-In</th>
                  <th className="px-4 py-3.5">Check-Out</th>
                  <th className="px-4 py-3.5">Working Hours</th>
                  <th className="px-4 py-3.5">GPS Location</th>
                  <th className="px-4 py-3.5">Selfie</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-slate-400">No attendance records match your search or filter criteria.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-teal-50/20 transition cursor-pointer" onClick={() => setSelectedItem(log)}>
                      <td className="px-4 py-3.5 font-mono font-black text-teal-900">
                        <span className="bg-teal-50 border border-teal-300 px-1.5 py-0.5 rounded text-[10px]">[{log.code}]</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-slate-900">{log.name}</div>
                        <div className="text-[11px] text-slate-400 font-semibold">{log.designation}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-700">{log.checkInTime}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-700">{log.checkOutTime}</td>
                      <td className="px-4 py-3.5 font-bold text-teal-700">{log.workingHours}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin size={13} className="text-rose-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{log.gpsLocation}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${log.selfieUploaded ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {log.selfieUploaded ? '✓ Done' : '✗ Missing'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${STATUS_COLORS[log.status] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                          ● {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedItem(log) }}
                          className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition flex items-center gap-1 ml-auto"
                        >
                          <Eye size={11} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-300">[{selectedItem.code}]</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${STATUS_COLORS[selectedItem.status] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>{selectedItem.status}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{selectedItem.name}</h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedItem.designation}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Check-In</span>
                <p className="font-black text-emerald-950">{selectedItem.checkInTime}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Check-Out</span>
                <p className="font-black text-rose-950">{selectedItem.checkOutTime}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Hours</span>
                <p className="font-black text-teal-700">{selectedItem.workingHours}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <MapPin size={14} className="text-rose-500 shrink-0" />
              <span className="text-slate-800 font-semibold">{selectedItem.gpsLocation}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`px-3 py-1 rounded-full font-extrabold border ${selectedItem.selfieUploaded ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {selectedItem.selfieUploaded ? '✓ Selfie Verification Completed' : '✗ Selfie Not Uploaded'}
              </span>
              <span className="font-mono text-slate-400 text-[10px]">Date: {selectedItem.date}</span>
            </div>

            <div className="flex justify-end pt-1 border-t border-slate-100">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
