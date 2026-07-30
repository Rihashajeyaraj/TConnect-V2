import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  TrendingUpIcon,
  Globe,
  Map,
  ShoppingBag,
  Sparkles,
  Award,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

// Forecast data
const forecastData = [
  { month: 'Jan', actual: 320000 },
  { month: 'Feb', actual: 280000 },
  { month: 'Mar', actual: 410000 },
  { month: 'Apr', actual: 380000 },
  { month: 'May', actual: 520000 },
  { month: 'Jun', actual: 490000 },
  { month: 'Jul', actual: 572000, projected: 572000 },
  { month: 'Aug', projected: 610000 },
  { month: 'Sep', projected: 630000 },
  { month: 'Oct', projected: 680000 },
  { month: 'Nov', projected: 720000 },
  { month: 'Dec', projected: 750000 },
]

// Product categorization
const productData = [
  { name: 'Enterprise License', value: 1250000, color: '#2563eb' },
  { name: 'SaaS Professional', value: 850000, color: '#10b981' },
  { name: 'Custom Integrations', value: 250000, color: '#6366f1' },
  { name: 'Consulting & Setup', value: 132000, color: '#f59e0b' },
]

// Geographic performance
const regionData = [
  { subject: 'North America', A: 120, B: 110, fullMark: 150 },
  { subject: 'Europe', A: 98, B: 130, fullMark: 150 },
  { subject: 'Asia Pacific', A: 86, B: 130, fullMark: 150 },
  { subject: 'Latin America', A: 65, B: 100, fullMark: 150 },
  { subject: 'Middle East & Africa', A: 45, B: 90, fullMark: 150 },
]

function ExecutiveSummary() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Business Summary</h2>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Strategic business growth analysis, revenue forecasting, and market segments.
          </p>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Year-on-Year Growth</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold text-slate-900">+24.8%</span>
            <span className="flex items-center gap-0.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              <TrendingUp className="size-3" /> YoY
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Exceeding annual baseline target of +18.0%.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projected Q3 Revenue</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold text-slate-900">₹1.92M</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5">
              Forecast
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Based on active deal pipeline and current win rates.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Sector Share</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold text-slate-900">54.2%</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5">
              Enterprise
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Enterprise license agreements remain main driver.</p>
        </div>
      </div>

      {/* Composed Chart: Revenue Actual vs Forecast */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Q3-Q4 Growth Projections</h3>
          <p className="text-xs font-semibold text-slate-400">Actual revenue (Jan-Jul) plotted alongside projected forecast models (Aug-Dec)</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip />
              {/* Actual revenue */}
              <Area type="monotone" dataKey="actual" fill="#dbeafe" stroke="#2563eb" strokeWidth={2.5} />
              {/* Projected forecast */}
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Double Distribution layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Product segments pie */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Revenue by Product Line</h3>
            <p className="text-xs font-semibold text-slate-400">Segmentation of the total ₹2.48M current revenue</p>
          </div>
          <div className="h-64 relative flex items-center justify-center my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <ShoppingBag className="size-5 text-blue-600 mb-1" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Products</span>
            </div>
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-4">
            {productData.map((prod) => (
              <div key={prod.name} className="flex items-center justify-between text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: prod.color }} />
                  <span>{prod.name}</span>
                </div>
                <span className="text-slate-900">₹{(prod.value / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic radar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Regional Team Performance</h3>
            <p className="text-xs font-semibold text-slate-400">Comparison of sales targets met vs client visits completed</p>
          </div>
          <div className="h-68 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={regionData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Radar name="Target Score" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} />
                <Radar name="Visits Count" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-500" /> Target Met
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Client Visits
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExecutiveSummary
