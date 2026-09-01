import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Globe,
  Map,
  ShoppingBag,
  Sparkles,
  Award,
  RefreshCw,
  DollarSign,
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
import { reportAPI, customerAPI } from '../../services/api.js'

const COLORS = ['#832D51', '#EA6993', '#3a7d63', '#0891b2', '#d97706', '#4f46e5', '#64748b']

function ExecutiveSummary() {
  const [loading, setLoading] = useState(true)
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    activeLeads: 0,
    wonDeals: 0,
    totalCustomers: 0,
    forecastData: [],
    productData: [],
    managerPerformance: [],
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, dirRes] = await Promise.allSettled([
        reportAPI.getCeoDashboard(),
        customerAPI.getCeoCustomerDirectory(),
      ])

      const dashData = dashRes.status === 'fulfilled' && dashRes.value?.data ? dashRes.value.data : null
      const dirData = dirRes.status === 'fulfilled' && dirRes.value?.data ? dirRes.value.data : null

      const m = dashData?.metrics || {}
      const trends = dashData?.revenueTrends || []

      // Extract products distribution from real customers
      const productCounts = {}
      ;(dirData?.managers || []).forEach(mgr => {
        (mgr.executives || []).forEach(ex => {
          (ex.customers || []).forEach(c => {
            const p = c.product || 'Software License'
            productCounts[p] = (productCounts[p] || 0) + (Number(c.amount) || 0)
          })
        })
      })

      const prodData = Object.entries(productCounts).map(([name, val], idx) => ({
        name,
        value: val,
        color: COLORS[idx % COLORS.length]
      }))

      setSummaryData({
        totalRevenue: m.totalRevenue || 0,
        activeLeads: m.activeLeads || 0,
        wonDeals: m.wonDeals || 0,
        totalCustomers: dirData?.totals?.customers || m.totalCustomers || 0,
        forecastData: trends.map(t => ({
          month: t.month,
          actual: t.revenue || 0,
          projected: t.target || 500000
        })),
        productData: prodData,
        managerPerformance: dashData?.managerPerformance || []
      })
    } catch (e) {
      console.error('Error loading executive summary:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <Sparkles className="size-4.5" />
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Performance Brief</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Strategic organization-wide performance analysis based on live Supabase CRM & HRMS records.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Brief
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">₹{summaryData.totalRevenue.toLocaleString()}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Live closed won deals</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Customers</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{summaryData.totalCustomers}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Active customer accounts</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Leads</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{summaryData.activeLeads}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Open sales pipeline inquiries</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Won Deals</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{summaryData.wonDeals}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Total won opportunities</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Forecast Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Revenue Actuals vs Target Run Rate</h3>
              <p className="text-xs text-slate-400 font-semibold">Monthly performance against targets</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {summaryData.forecastData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                No revenue trend data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={summaryData.forecastData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Bar dataKey="actual" fill="#832D51" radius={[4, 4, 0, 0]} name="Actual Won" />
                  <Line type="monotone" dataKey="projected" stroke="#3a7d63" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} name="Target" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Product Revenue Share */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Product Portfolio Share</h3>
            <p className="text-xs text-slate-400 font-semibold">Contract distribution by product</p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {summaryData.productData.length === 0 ? (
              <div className="text-xs text-slate-400 font-bold text-center">
                No customer contract products recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryData.productData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {summaryData.productData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExecutiveSummary
