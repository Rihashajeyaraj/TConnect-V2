import React from 'react'
import { Award, Trophy, TrendingUp, DollarSign, Calendar, Star, UserCheck } from 'lucide-react'

const LEADERBOARD_DATA = [
  { rank: 1, name: 'Aisha Sharma', visits: 41, targetPct: '104%', conversionPct: '52%', wonValue: '₹8,40,000', rating: '4.9 ★' },
  { rank: 2, name: 'Arjun Patel', visits: 38, targetPct: '98%', conversionPct: '47%', wonValue: '₹6,20,000', rating: '4.8 ★' },
  { rank: 3, name: 'Vikram Singh', visits: 31, targetPct: '94%', conversionPct: '44%', wonValue: '₹5,50,000', rating: '4.7 ★' },
  { rank: 4, name: 'Ashwini E', visits: 29, targetPct: '92%', conversionPct: '43%', wonValue: '₹4,80,000', rating: '4.8 ★' },
]

export default function ManagerLeaderboard() {
  return (
    <div className="space-y-6 font-sans text-slate-900">
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" /> Sales Executive Team Leaderboard & Rankings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Performance ranking of sales representatives based on deal revenue, conversion %, client visits, and customer rating.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Rank</th>
              <th className="px-5 py-3.5">Sales Executive</th>
              <th className="px-5 py-3.5">Deals Revenue</th>
              <th className="px-5 py-3.5">Target %</th>
              <th className="px-5 py-3.5">Conversion %</th>
              <th className="px-5 py-3.5">Visits</th>
              <th className="px-5 py-3.5">Customer Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {LEADERBOARD_DATA.map((row) => (
              <tr key={row.rank} className="hover:bg-slate-50 transition">
                <td className="px-5 py-4">
                  <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-xs">
                    #{row.rank}
                  </span>
                </td>
                <td className="px-5 py-4 font-black text-slate-900 text-sm">{row.name}</td>
                <td className="px-5 py-4 font-black text-emerald-600">{row.wonValue}</td>
                <td className="px-5 py-4 font-bold text-teal-700">{row.targetPct}</td>
                <td className="px-5 py-4 font-bold text-slate-800">{row.conversionPct}</td>
                <td className="px-5 py-4 font-bold text-slate-800">{row.visits} Visits</td>
                <td className="px-5 py-4 font-bold text-amber-600">{row.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
