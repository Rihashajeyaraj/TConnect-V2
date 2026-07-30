import { useState } from 'react'
import { Calendar, Search, AlertCircle, CheckCircle, Clock, Receipt, MoreVertical } from 'lucide-react'

const initialExpenses = [
  { id: '1', name: 'John Doe', type: 'Travel (Fuel)', amount: 1500, date: '28 Apr 2026', bill: 'Fuel_Bill_45.pdf', status: 'Pending' },
  { id: '2', name: 'Mary Jane', type: 'Client Lunch', amount: 3200, date: '27 Apr 2026', bill: 'Food_Bill_92.pdf', status: 'Approved' },
  { id: '3', name: 'Robert Smith', type: 'Travel (Flight)', amount: 12500, date: '25 Apr 2026', bill: 'Flight_Ticket.pdf', status: 'Approved' },
  { id: '4', name: 'David Brown', type: 'Office Supplies', amount: 800, date: '24 Apr 2026', bill: 'Stationery_Bill.pdf', status: 'Approved' },
]

const STATUS_COLORS = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-100',
  Approved: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-100',
}

function Expenses() {
  const [search, setSearch] = useState('')
  const filtered = initialExpenses.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expenses Claims</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Home &gt; Expenses</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by representative..."
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
              <th className="px-6 py-4">Expense Type</th>
              <th className="px-6 py-4 text-right">Amount (₹)</th>
              <th className="px-6 py-4">Claim Date</th>
              <th className="px-6 py-4">Receipt</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-900 font-bold">{e.name}</td>
                <td className="px-6 py-4 text-slate-700">{e.type}</td>
                <td className="px-6 py-4 text-right text-slate-950 font-bold">₹{e.amount.toLocaleString()}</td>
                <td className="px-6 py-4 flex items-center gap-1.5"><Calendar className="size-3.5 text-slate-400" />{e.date}</td>
                <td className="px-6 py-4 text-blue-600 flex items-center gap-1"><Receipt className="size-3.5" />{e.bill}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[e.status]}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <MoreVertical className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Expenses
