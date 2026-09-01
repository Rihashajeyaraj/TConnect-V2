import { useState, useEffect } from 'react'
import { Calendar, Search, MapPin, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import { attendanceAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'

function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await attendanceAPI.getLogs().catch(() => null)
      if (res && res.data && Array.isArray(res.data)) {
        setAttendance(res.data.map((a, i) => ({
          id: a.id || `ATT-${i + 1}`,
          name: a.employee_name || a.name || 'Team Member',
          date: formatDate(a.check_in_time) || 'Today',
          checkin: a.check_in_time ? String(a.check_in_time).slice(11, 16) : '--',
          checkout: a.check_out_time ? String(a.check_out_time).slice(11, 16) : '--',
          status: a.status || (a.check_out_time ? 'Logged off' : 'Present'),
          device: a.mode || 'Biometric',
          ip: a.ip_address || '--',
        })))
      } else {
        setAttendance([])
      }
    } catch (e) {
      console.error('Error loading attendance logs:', e)
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = attendance.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daily Attendance Sheet</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Live attendance & check-in verification log</p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search representatives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition focus:border-[#832D51] focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-[#832D51]" />
            Loading attendance records from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            No attendance logs found in database.
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Representative</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Check-In</th>
                <th className="px-5 py-3">Check-Out</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Verification Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{a.name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{a.date}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-700">{a.checkin}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-700">{a.checkout}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{a.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Attendance
