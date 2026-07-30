import { useState } from 'react'
import { Calendar, Search, MapPin, Clock, CheckCircle } from 'lucide-react'

const initialAttendance = [
  { id: '1', name: 'John Doe', date: '28 Apr 2026', checkin: '09:05 AM', checkout: '06:15 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.12' },
  { id: '2', name: 'Mary Jane', date: '28 Apr 2026', checkin: '08:55 AM', checkout: '05:45 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.10' },
  { id: '3', name: 'Robert Smith', date: '28 Apr 2026', checkin: '09:15 AM', checkout: '06:30 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.11' },
  { id: '4', name: 'David Brown', date: '28 Apr 2026', checkin: '09:00 AM', checkout: '06:00 PM', status: 'Present', device: 'Mobile', ip: '192.168.1.14' },
  { id: '5', name: 'Vikram Singh', date: '28 Apr 2026', checkin: '--', checkout: '--', status: 'Absent', device: '--', ip: '--' },
]

function Attendance() {
  const [search, setSearch] = useState('')
  const filtered = initialAttendance.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daily Attendance Sheet</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Attendance</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search representatives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Employee Name</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Check-In</th>
              <th className="px-6 py-4">Check-Out</th>
              <th className="px-6 py-4">Device</th>
              <th className="px-6 py-4">IP Address</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-900 font-bold">{a.name}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Calendar className="size-3.5 text-slate-400" />{a.date}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Clock className="size-3.5 text-emerald-500" />{a.checkin}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Clock className="size-3.5 text-rose-500" />{a.checkout}</td>
                <td className="px-6 py-4 text-slate-500">{a.device}</td>
                <td className="px-6 py-4 text-slate-500">{a.ip}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Attendance
