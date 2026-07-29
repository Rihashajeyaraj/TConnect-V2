import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const kpiData = [
  {
    label: 'Total Revenue',
    value: '$2.4M',
    change: '+12.5%',
    up: true,
    icon: DollarSign,
  },
  {
    label: 'Active Leads',
    value: '1,842',
    change: '+8.2%',
    up: true,
    icon: Target,
  },
  {
    label: 'Converted Customers',
    value: '486',
    change: '+15.3%',
    up: true,
    icon: Users,
  },
  {
    label: 'Team Productivity',
    value: '94.2%',
    change: '-2.1%',
    up: false,
    icon: TrendingUp,
  },
]

const revenueData = [
  { month: 'Jan', revenue: 320000 },
  { month: 'Feb', revenue: 280000 },
  { month: 'Mar', revenue: 410000 },
  { month: 'Apr', revenue: 380000 },
  { month: 'May', revenue: 520000 },
  { month: 'Jun', revenue: 490000 },
]

function CeoDashboard() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Welcome back, John</h2>
        <p className="mt-1 text-slate-400">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="group rounded-2xl border border-emerald-500/10 bg-[#1e293b] p-5 transition hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Icon className="size-5" />
                </span>
                <span
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                    kpi.up
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {kpi.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {kpi.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="mt-1 text-sm text-slate-400">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/10 bg-[#1e293b] p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Revenue Overview</h3>
              <p className="text-sm text-slate-400">Last 6 months</p>
            </div>
            <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400">
              +12.5%
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/10 bg-[#1e293b] p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'View Full Reports', desc: 'Export PDF / Excel' },
              { label: 'Sales Pipeline', desc: 'Review deal stages' },
              { label: 'Team Performance', desc: 'Monitor targets' },
              { label: 'Executive Summary', desc: 'Monthly growth analysis' },
            ].map((action) => (
              <button
                key={action.label}
                className="w-full rounded-xl border border-emerald-500/10 px-4 py-3 text-left transition hover:border-emerald-500/25 hover:bg-emerald-500/5"
              >
                <p className="text-sm font-semibold text-slate-200">{action.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CeoDashboard
