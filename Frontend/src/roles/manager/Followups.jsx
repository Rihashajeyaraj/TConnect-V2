import { useState } from 'react'
import { MessageSquare, Search, Clock, CheckCircle } from 'lucide-react'

const initialFollowups = []

export default function ManagerFollowups() {
  const [search, setSearch] = useState('')

  const filtered = initialFollowups.filter(
    (f) =>
      f.rep.toLowerCase().includes(search.toLowerCase()) ||
      f.client.toLowerCase().includes(search.toLowerCase()) ||
      f.notes.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-400" /> Team Follow-ups Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">Track pending client calls, emails, and follow-up activities assigned to representatives.</p>
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rep, client, or notes..."
            className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold border-b border-slate-700">
            <tr>
              <th className="px-6 py-3.5">Representative</th>
              <th className="px-6 py-3.5">Client</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Due Date & Time</th>
              <th className="px-6 py-3.5">Notes</th>
              <th className="px-6 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 font-medium">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-700/40 transition">
                <td className="px-6 py-4 font-bold text-white">{item.rep}</td>
                <td className="px-6 py-4 text-purple-300">{item.client}</td>
                <td className="px-6 py-4">{item.type}</td>
                <td className="px-6 py-4 flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-purple-400" /> {item.dueDate}
                </td>
                <td className="px-6 py-4 text-slate-300 max-w-xs truncate">{item.notes}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    item.status === 'Completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-mgr-primary-950 text-mgr-primary-300 border border-mgr-primary-800'
                  }`}>
                    {item.status}
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
