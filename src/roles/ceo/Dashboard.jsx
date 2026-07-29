import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
  Award,
  Globe,
  Smartphone,
  PhoneCall,
  Activity,
  Briefcase,
  FileText,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const kpiData = [
  {
    label: 'Total Revenue',
    value: '₹24,82,000',
    change: '+12.5%',
    up: true,
    icon: DollarSign,
    bgClass: 'bg-[#ECFDF5]/80 border-emerald-100/80 hover:border-emerald-300 hover:shadow-emerald-500/5',
    iconColor: 'text-emerald-700 bg-emerald-100 border-emerald-200/60',
    sparkline: 'M 4 30 Q 24 10, 44 20 T 84 6',
    sparklineColor: '#10b981',
  },
  {
    label: 'Active Leads',
    value: '1,520',
    change: '+8.2%',
    up: true,
    icon: Target,
    bgClass: 'bg-[#F0F6FF]/80 border-blue-100/80 hover:border-blue-300 hover:shadow-blue-500/5',
    iconColor: 'text-blue-700 bg-blue-100 border-blue-200/60',
    sparkline: 'M 4 25 Q 24 25, 44 10 T 84 4',
    sparklineColor: '#2563eb',
  },
  {
    label: 'Converted Customers',
    value: '486',
    change: '+15.3%',
    up: true,
    icon: Users,
    bgClass: 'bg-[#F5F3FF]/80 border-indigo-100/80 hover:border-indigo-300 hover:shadow-indigo-500/5',
    iconColor: 'text-indigo-700 bg-indigo-100 border-indigo-200/60',
    sparkline: 'M 4 32 Q 24 16, 44 24 T 84 8',
    sparklineColor: '#6366f1',
  },
  {
    label: 'Team Productivity',
    value: '94.2%',
    change: '-2.1%',
    up: false,
    icon: TrendingUp,
    bgClass: 'bg-[#FFFBEB]/80 border-amber-100/80 hover:border-amber-300 hover:shadow-amber-500/5',
    iconColor: 'text-amber-700 bg-amber-100 border-amber-200/60',
    sparkline: 'M 4 6 Q 24 14, 44 10 T 84 28',
    sparklineColor: '#f59e0b',
  },
]

const revenueData = [
  { month: 'Jan', revenue: 320000, target: 300000 },
  { month: 'Feb', revenue: 280000, target: 300000 },
  { month: 'Mar', revenue: 410000, target: 350000 },
  { month: 'Apr', revenue: 380000, target: 350000 },
  { month: 'May', revenue: 520000, target: 400000 },
  { month: 'Jun', revenue: 490000, target: 400000 },
  { month: 'Jul', revenue: 572000, target: 450000 },
]

const leadSources = [
  { name: 'Website', value: 450, color: '#2563eb' },
  { name: 'Referral', value: 320, color: '#10b981' },
  { name: 'Cold Call', value: 290, color: '#6366f1' },
  { name: 'Walk-In', value: 180, color: '#f59e0b' },
  { name: 'Social Media', value: 280, color: '#ec4899' },
]

const recentActivities = [
  {
    id: 1,
    type: 'deal',
    user: 'Mary Jane',
    action: 'qualified opportunity',
    target: 'Next Gen Tech (₹45,000)',
    time: '12m ago',
    avatar: 'MJ',
    color: 'bg-emerald-500',
  },
  {
    id: 2,
    type: 'visit',
    user: 'Karthik R',
    action: 'completed client visit at',
    target: 'ABC Pvt Ltd (GPS verified)',
    time: '45m ago',
    avatar: 'KR',
    color: 'bg-blue-500',
  },
  {
    id: 3,
    type: 'deal',
    user: 'Robert Smith',
    action: 'won high priority deal',
    target: 'Global Corp (₹2,50,000)',
    time: '2h ago',
    avatar: 'RS',
    color: 'bg-indigo-500',
  },
  {
    id: 4,
    type: 'lead',
    user: 'David Brown',
    action: 'converted cold lead to contact',
    target: 'Vertex Systems',
    time: '3h ago',
    avatar: 'DB',
    color: 'bg-amber-500',
  },
]

function CeoDashboard() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back, John</h2>
            <Sparkles className="size-5 text-amber-500 fill-amber-500" />
          </div>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Here is the high-level performance metrics of your sales and field teams today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 self-start sm:self-center">
          <Activity className="size-4 text-blue-600" />
          SYSTEM LIVE AND OPERATIONAL
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className={`group relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-100/85 active:scale-[0.98] ${kpi.bgClass}`}
            >
              {/* Card Header Info */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight leading-none pt-1">{kpi.value}</p>
                </div>
                <span className={`grid size-10 place-items-center rounded-xl border ${kpi.iconColor} shadow-sm shrink-0`}>
                  <Icon className="size-4.5" />
                </span>
              </div>

              {/* Sparkline & Trend Section */}
              <div className="mt-6 flex items-center justify-between gap-4 relative z-10">
                {/* Dynamic Trend Pill */}
                <span
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold border ${
                    kpi.up
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60'
                      : 'bg-red-50 text-red-700 border-red-100/60'
                  }`}
                >
                  {kpi.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {kpi.change}
                </span>

                {/* Micro Sparkline Chart */}
                <div className="h-8 w-20 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <svg className="h-full w-full" viewBox="0 0 88 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d={kpi.sparkline}
                      stroke={kpi.sparklineColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trends Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Revenue vs Target Trends</h3>
              <p className="text-[11px] font-bold text-slate-400">Monthly business projection metrics for 2026</p>
            </div>
            <div className="flex items-center gap-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5 bg-blue-50/50 border border-blue-100 rounded-lg px-2 py-1">
                <span className="size-2 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="size-2 rounded-full bg-slate-350" /> Target
              </span>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-xl backdrop-blur-md text-white font-sans text-[11px] animate-in fade-in zoom-in-95 duration-100">
                          <p className="font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider">{label} 2026</p>
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-6 mt-1">
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="font-semibold text-slate-350">{p.name}:</span>
                              </span>
                              <span className="font-black text-white">₹{p.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#revenueGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-50 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Lead Ingestion Channels</h3>
            <p className="text-[11px] font-bold text-slate-400">Total pipeline split by origin sources</p>
          </div>
          <div className="h-56 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur-md text-white font-sans text-[11px]">
                          <span className="font-extrabold">{data.name}</span>: <span className="font-black text-blue-400">{data.value} Leads</span>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">1,520</span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">Total Leads</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500 border-t border-slate-50 pt-4">
            {leadSources.slice(0, 4).map((source) => (
              <div key={source.name} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-1.5">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                  <span className="truncate">{source.name}</span>
                </span>
                <span className="text-slate-950 font-extrabold pl-1">{source.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activities & Quick Actions Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Operations & Activities - Vertical Timeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Real-time Operations Stream</h3>
              <p className="text-[11px] font-bold text-slate-400">Live operational activity feed from regional offices</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[9px] font-extrabold text-blue-700 tracking-wider">
              <span className="size-1.5 animate-pulse rounded-full bg-blue-600" /> LIVE
            </span>
          </div>

          <div className="relative pl-6 space-y-6">
            {/* Timeline Vertical Connector track */}
            <div className="absolute left-[11px] top-1.5 bottom-1.5 w-0.5 bg-slate-100" />

            {recentActivities.map((act) => (
              <div key={act.id} className="relative flex items-start gap-4 text-xs font-semibold text-slate-500">
                {/* Timeline Node Icon/Avatar */}
                <span className="absolute -left-[23px] top-0 grid size-6 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-white text-[9px] font-extrabold text-slate-700 shadow-sm ring-4 ring-white">
                  {act.avatar}
                </span>

                <div className="flex-1 space-y-1">
                  <p className="m-0 leading-relaxed text-slate-600">
                    <span className="font-extrabold text-slate-900">{act.user}</span> {act.action}{' '}
                    <span className="font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-1.5 py-0.2 ml-0.5">{act.target}</span>
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 block">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Quick Navigation Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="border-b border-slate-50 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">CEO Hub Shortcuts</h3>
            <p className="text-[11px] font-bold text-slate-400">Direct workspace actions to access performance modules</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Sales Pipeline',
                desc: 'Access opportunity stages and deals',
                path: '/ceo/opportunities',
                icon: Briefcase,
                color: 'hover:border-blue-300 hover:bg-blue-50/15 text-blue-600 border-blue-100/50 bg-blue-50/30',
              },
              {
                title: 'Team Performance',
                desc: 'Analyze rep targets and progress logs',
                path: '/ceo/employee',
                icon: Users,
                color: 'hover:border-indigo-300 hover:bg-indigo-50/15 text-indigo-600 border-indigo-100/50 bg-indigo-50/30',
              },
              {
                title: 'Leads Directory',
                desc: 'Review pipeline ingestion and status',
                path: '/ceo/leads',
                icon: Target,
                color: 'hover:border-emerald-300 hover:bg-emerald-50/15 text-emerald-600 border-emerald-100/50 bg-emerald-50/30',
              },
              {
                title: 'Reports Hub',
                desc: 'Generate business performance logs',
                path: '/ceo/reports',
                icon: FileText,
                color: 'hover:border-amber-300 hover:bg-amber-50/15 text-amber-600 border-amber-100/50 bg-amber-50/30',
              },
            ].map((act) => {
              const Icon = act.icon
              return (
                <Link
                  key={act.title}
                  to={act.path}
                  className={`group flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] ${act.color}`}
                >
                  <Icon className="size-5 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1">
                      {act.title}
                      <ChevronRight className="size-3 text-slate-400 transition group-hover:translate-x-0.5" />
                    </h4>
                    <p className="mt-1 text-[9px] font-bold text-slate-400 leading-normal">{act.desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CeoDashboard
