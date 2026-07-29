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
    value: '$2,482,000',
    change: '+12.5%',
    up: true,
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    label: 'Active Leads',
    value: '1,520',
    change: '+8.2%',
    up: true,
    icon: Target,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    label: 'Converted Customers',
    value: '486',
    change: '+15.3%',
    up: true,
    icon: Users,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  },
  {
    label: 'Team Productivity',
    value: '94.2%',
    change: '-2.1%',
    up: false,
    icon: TrendingUp,
    color: 'text-amber-600 bg-amber-50 border-amber-100',
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
    target: 'Next Gen Tech ($45,000)',
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
    target: 'Global Corp ($250,000)',
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-500/30"
            >
              <div className="flex items-center justify-between">
                <span className={`grid size-11 place-items-center rounded-xl border ${kpi.color}`}>
                  <Icon className="size-5" />
                </span>
                <span
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                    kpi.up
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}
                >
                  {kpi.up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {kpi.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{kpi.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trends Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Performance vs Target</h3>
              <p className="text-xs font-semibold text-slate-400">Monthly breakdown for the year 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-slate-300" /> Target
              </span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Lead Ingestion Sources</h3>
            <p className="text-xs font-semibold text-slate-400">Pipeline distribution by origin channels</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">1,520</span>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
            {leadSources.slice(0, 4).map((source) => (
              <div key={source.name} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                <span>{source.name} ({source.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activities & Quick Actions Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Operations & Activities */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Real-time Operations</h3>
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[0.65rem] font-bold text-blue-700">
              <span className="size-1.5 animate-pulse rounded-full bg-blue-600" /> LIVE STREAM
            </span>
          </div>
          <div className="space-y-4">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-4 text-sm font-medium text-slate-600">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  {act.avatar}
                </span>
                <div className="flex-1">
                  <p className="m-0 leading-5">
                    <span className="font-bold text-slate-950">{act.user}</span> {act.action}{' '}
                    <span className="font-semibold text-blue-600">{act.target}</span>
                  </p>
                  <span className="text-[0.65rem] font-bold text-slate-400">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Quick Navigation Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">CEO Control Actions</h3>
            <p className="text-xs font-semibold text-slate-400">Shortcuts to manage pipeline and active teams</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: 'Sales Pipeline',
                desc: 'Opportunity Kanban board',
                path: '/ceo/opportunities',
                icon: Briefcase,
                color: 'hover:border-blue-500 hover:bg-blue-50/20 text-blue-600 bg-blue-50/50',
              },
              {
                title: 'Team Performance',
                desc: 'Target metrics & logs',
                path: '/ceo/employee',
                icon: Users,
                color: 'hover:border-indigo-500 hover:bg-indigo-50/20 text-indigo-600 bg-indigo-50/50',
              },
              {
                title: 'Leads Directory',
                desc: 'Sales ingestion flow',
                path: '/ceo/leads',
                icon: Target,
                color: 'hover:border-emerald-500 hover:bg-emerald-50/20 text-emerald-600 bg-emerald-50/50',
              },
              {
                title: 'Reports & Analytics',
                desc: 'Export details',
                path: '/ceo/reports',
                icon: FileText,
                color: 'hover:border-amber-500 hover:bg-amber-50/20 text-amber-600 bg-amber-50/50',
              },
            ].map((act) => {
              const Icon = act.icon
              return (
                <Link
                  key={act.title}
                  to={act.path}
                  className={`flex flex-col justify-between rounded-xl border border-slate-200 p-4 transition-all duration-300 ${act.color}`}
                >
                  <Icon className="size-5 mb-3" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1 group">
                      {act.title}
                      <ChevronRight className="size-3 text-slate-400 transition group-hover:translate-x-0.5" />
                    </h4>
                    <p className="mt-0.5 text-[0.7rem] font-semibold text-slate-400 leading-4">{act.desc}</p>
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
