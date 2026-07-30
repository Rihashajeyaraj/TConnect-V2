import { useState } from 'react'
import { Calendar, Search, AlertCircle, CheckCircle, Clock } from 'lucide-react'

const initialLeaves = [
  { id: '1', name: 'John Doe', type: 'Sick Leave', start: '30 Apr 2026', end: '01 May 2026', days: 2, reason: 'High fever', status: 'Pending' },
  { id: '2', name: 'Mary Jane', type: 'Casual Leave', start: '10 May 2026', end: '12 May 2026', days: 3, reason: 'Family function', status: 'Approved' },
  { id: '3', name: 'Robert Smith', type: 'Paid Leave', start: '05 May 2026', end: '05 May 2026', days: 1, reason: 'Personal work', status: 'Approved' },
  { id: '4', name: 'Vikram Singh', type: 'Sick Leave', start: '20 Apr 2026', end: '21 Apr 2026', days: 2, reason: 'Doctor checkup', status: 'Approved' },
]

const STATUS_COLORS = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-100',
  Approved: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-100',
}

function Leaves() {
  const [search, setSearch] = useState('')
  const filtered = initialLeaves.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Leave Management</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Leave Management</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leaves by representative..."
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
              <th className="px-6 py-4">Leave Type</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4 text-center">Days</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-900 font-bold">{l.name}</td>
                <td className="px-6 py-4 text-slate-700">{l.type}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Calendar className="size-3.5 text-slate-400" />{l.start} to {l.end}</td>
                <td className="px-6 py-4 text-center font-bold text-slate-950">{l.days}</td>
                <td className="px-6 py-4 text-slate-500 font-medium max-w-xs truncate">{l.reason}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[l.status]}`}>
                    {l.status}
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

export default Leaves
