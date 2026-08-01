import { useState } from 'react'
import { Target, Users, Calendar, DollarSign, TrendingUp, Award, CheckCircle } from 'lucide-react'

function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sales Manager Dashboard</h1>
        <p className="text-sm text-slate-400">Team performance oversight, lead allocation, and pipeline tracking.</p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Team Active Leads</span>
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">18</h3>
          <span className="text-xs text-purple-400 font-medium">Assigned to Executives</span>
        </div>

        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Pipeline Value</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-400 mt-2">₹18,50,000</h3>
          <span className="text-xs text-slate-400 font-medium">Active Opportunities</span>
        </div>

        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Today Field Visits</span>
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">8</h3>
          <span className="text-xs text-blue-400 font-medium">Logged with Remarks</span>
        </div>

        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Team Executives</span>
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">6</h3>
          <span className="text-xs text-amber-400 font-medium">Active Field Staff</span>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" /> Sales Executive Performance Leaderboard
        </h3>
        <div className="space-y-3">
          {[
            { name: 'Suresh Raina', code: 'EMP-002', leads: 6, visits: 12, won: '₹6,50,000' },
            { name: 'Priya Sharma', code: 'EMP-003', leads: 5, visits: 9, won: '₹5,00,000' },
            { name: 'Karthik Raja', code: 'EMP-004', leads: 4, visits: 8, won: '₹3,50,000' },
          ].map((exec, idx) => (
            <div key={exec.code} className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                  #{idx + 1}
                </span>
                <div>
                  <p className="font-semibold text-white text-sm">{exec.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{exec.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-300">
                <div>Leads: <strong className="text-white">{exec.leads}</strong></div>
                <div>Visits: <strong className="text-white">{exec.visits}</strong></div>
                <div>Deals Won: <strong className="text-emerald-400">{exec.won}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard
