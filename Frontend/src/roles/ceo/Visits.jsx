import { useState } from 'react'
import { Calendar, Search, MapPin, CheckCircle, Clock } from 'lucide-react'

const initialVisits = [
  { id: '1', exec: 'John Doe', client: 'ABC Pvt Ltd', date: '28 Apr 2026', time: '10:05 AM', checkin: '10:05 AM', checkout: '11:15 AM', location: 'Chennai', status: 'Completed' },
  { id: '2', exec: 'Mary Jane', client: 'Tech Solutions', date: '28 Apr 2026', time: '11:30 AM', checkin: '12:45 PM', checkout: '1:45 PM', location: 'Chennai', status: 'Completed' },
  { id: '3', exec: 'Robert Smith', client: 'Global Corp', date: '27 Apr 2026', time: '02:00 PM', checkin: '02:10 PM', checkout: '03:10 PM', location: 'Bangalore', status: 'Completed' },
  { id: '4', exec: 'David Brown', client: 'Prime Systems', date: '27 Apr 2026', time: '10:20 AM', checkin: '11:05 AM', checkout: '12:05 PM', location: 'Chennai', status: 'Completed' },
]

function Visits() {
  const [search, setSearch] = useState('')
  const filtered = initialVisits.filter(v => v.exec.toLowerCase().includes(search.toLowerCase()) || v.client.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Client Visits Log</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Visits</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search visits by representative or client..."
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
              <th className="px-6 py-4">Sales Executive</th>
              <th className="px-6 py-4">Client Name</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Check-In</th>
              <th className="px-6 py-4">Check-Out</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-900 font-bold">{v.exec}</td>
                <td className="px-6 py-4">{v.client}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Calendar className="size-3.5 text-slate-400" />{v.date}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Clock className="size-3.5 text-emerald-500" />{v.checkin}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Clock className="size-3.5 text-rose-500" />{v.checkout}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><MapPin className="size-3.5 text-slate-400" />{v.location}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle className="size-3.5" /> {v.status}
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

export default Visits
