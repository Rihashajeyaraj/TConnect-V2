import { useState } from 'react'
import { Calendar, Search, AlertCircle, CheckCircle } from 'lucide-react'

const initialFollowups = [
  { id: '1', client: 'ABC Industries', exec: 'John Doe', date: '30 Apr 2026', note: 'Send updated enterprise contract', status: 'Pending' },
  { id: '2', client: 'Tech Solutions', exec: 'Mary Jane', date: '01 May 2026', note: 'Product demo for engineering team', status: 'Pending' },
  { id: '3', client: 'Global Corp', exec: 'Robert Smith', date: '25 Apr 2026', note: 'Follow up on negotiation email', status: 'Overdue' },
  { id: '4', client: 'Prime Systems', exec: 'David Brown', date: '27 Apr 2026', note: 'Initial call completed, setup visit', status: 'Completed' },
]

const STATUS_COLORS = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-100',
  Overdue: 'text-rose-600 bg-rose-50 border-rose-100',
  Completed: 'text-emerald-600 bg-emerald-50 border-emerald-100',
}

function Followups() {
  const [search, setSearch] = useState('')
  const filtered = initialFollowups.filter(f => f.client.toLowerCase().includes(search.toLowerCase()) || f.exec.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Follow-ups Dashboard</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Follow-Ups</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search follow-ups by client or representative..."
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
              <th className="px-6 py-4">Client Name</th>
              <th className="px-6 py-4">Representative</th>
              <th className="px-6 py-4">Scheduled Date</th>
              <th className="px-6 py-4">Notes / Remarks</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filtered.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-900 font-bold">{f.client}</td>
                <td className="px-6 py-4">{f.exec}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Calendar className="size-3.5 text-slate-400" />{f.date}</td>
                <td className="px-6 py-4 text-slate-500 font-medium max-w-xs truncate">{f.note}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[f.status]}`}>
                    {f.status === 'Completed' ? <CheckCircle className="size-3" /> : <AlertCircle className="size-3" />}
                    {f.status}
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

export default Followups
