import React, { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Building2,
  Users,
  Award,
  Wallet,
  Receipt,
  FileSpreadsheet,
  Download,
  CreditCard,
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
import { useToast } from '../../common/ToastContext.jsx'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'

const MONTHLY_FINANCE_TREND = [
  { month: 'Jan', revenue: 380000, target: 350000, expenses: 95000, profit: 285000 },
  { month: 'Feb', revenue: 420000, target: 380000, expenses: 110000, profit: 310000 },
  { month: 'Mar', revenue: 490000, target: 450000, expenses: 125000, profit: 365000 },
  { month: 'Apr', revenue: 510000, target: 480000, expenses: 130000, profit: 380000 },
  { month: 'May', revenue: 560000, target: 500000, expenses: 140000, profit: 420000 },
  { month: 'Jun', revenue: 530000, target: 520000, expenses: 135000, profit: 395000 },
  { month: 'Jul', revenue: 620000, target: 550000, expenses: 155000, profit: 465000 },
  { month: 'Aug', revenue: 580000, target: 550000, expenses: 142000, profit: 438000 },
]

const MANAGER_REVENUE = [
  { name: 'Vikram Singh (South Region)', revenue: 1650000, target: 2000000, percentage: '58.1%', color: '#004749' },
  { name: 'Suresh V (Tech & West Region)', revenue: 1190000, target: 1500000, percentage: '41.9%', color: '#b09b72' },
]

const EXECUTIVE_REVENUE = [
  { name: 'Ananya Roy', manager: 'Vikram Singh', revenue: 940000, deals: 8, share: '33.1%' },
  { name: 'Karthik Raja', manager: 'Suresh V', revenue: 710000, deals: 6, share: '25.0%' },
  { name: 'Robert Smith', manager: 'Vikram Singh', revenue: 710000, deals: 6, share: '25.0%' },
  { name: 'Mary Jane', manager: 'Suresh V', revenue: 480000, deals: 4, share: '16.9%' },
]

const CUSTOMER_REVENUE = [
  { company: 'Apex Technologies Pvt Ltd', value: 450000, type: 'Enterprise ERP License', date: '2026-08-05' },
  { company: 'Star Tech Enterprises', value: 380000, type: 'Spatial Force Tracking', date: '2026-08-03' },
  { company: 'Vertex Systems Group', value: 300000, type: 'Cloud Retainer Support', date: '2026-08-01' },
  { company: 'Global Corp Solutions', value: 250000, type: 'SaaS Multi-branch CRM', date: '2026-08-04' },
  { company: 'Zenith Logistics Hub', value: 180000, type: 'Logistics Core Module', date: '2026-07-28' },
]

const EXPENSE_SUMMARY = [
  { category: 'Field Travel & Fuel Allowances', amount: 320000, percentage: '31%' },
  { category: 'Client Hospitality & Meeting Demos', amount: 240000, percentage: '23%' },
  { category: 'Cloud Infrastructure & API Services', amount: 290000, percentage: '28%' },
  { category: 'Operational & Office Administration', amount: 182000, percentage: '18%' },
]

function RevenueFinance() {
  const { showToast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState('This Year')

  // Financial totals
  const totalRevenue = 2840000
  const monthlyRevenue = 580000
  const totalExpenses = 1032000
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1)
  const annualTarget = 3500000
  const targetAchievement = ((totalRevenue / annualTarget) * 100).toFixed(1)

  const handleExport = (format) => {
    const data = [
      { Metric: 'Total Realized Revenue', Amount: `₹${totalRevenue.toLocaleString()}` },
      { Metric: 'Monthly Run Rate', Amount: `₹${monthlyRevenue.toLocaleString()}` },
      { Metric: 'Total Operational Expenses', Amount: `₹${totalExpenses.toLocaleString()}` },
      { Metric: 'Net Executive Profit', Amount: `₹${netProfit.toLocaleString()}` },
      { Metric: 'Profit Margin', Amount: `${profitMargin}%` },
      { Metric: 'Sales Target Achievement', Amount: `${targetAchievement}%` },
    ]

    if (format === 'csv') exportToCSV(data, 'Revenue_Finance_Report')
    else if (format === 'excel') exportToExcel(data, 'Revenue_Finance_Report')
    else if (format === 'pdf') {
      exportToPDF(
        data,
        [
          { header: 'Financial Metric', dataKey: 'Metric' },
          { header: 'Amount / Ratio', dataKey: 'Amount' },
        ],
        'Revenue_Finance_Report',
        'Twite Connect - CEO Revenue & Financial Statement'
      )
    }
    showToast(`Financial overview exported as ${format.toUpperCase()}`, 'success')
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <DollarSign className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive Revenue & Financial Management
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Strategic breakdown of corporate revenue, manager & executive collections, sales target vs actual realization, expense summaries, and net profit margins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl bg-[#004749] hover:bg-[#013b3f] text-white px-4 py-2 text-xs font-black transition shadow-xs"
          >
            <Download className="size-3.5" />
            Export Statement
          </button>
        </div>
      </div>

      {/* Financial Headline KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Revenue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Revenue</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <DollarSign className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</p>
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="size-3.5" />
              <span>+18.4% YoY</span>
            </div>
          </div>
        </div>

        {/* 2. Monthly Revenue Run Rate */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Revenue</span>
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <Calendar className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-[#004749]">₹{monthlyRevenue.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Current Active Month</p>
          </div>
        </div>

        {/* 3. Operational Expenses */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Expense Summary</span>
            <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-700">
              <Receipt className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-rose-600">₹{totalExpenses.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">All Approved Claims</p>
          </div>
        </div>

        {/* 4. Net Profit Overview */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Profit & Margin</span>
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-[#b09b72]">
              <Wallet className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900">₹{netProfit.toLocaleString()}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#004749]">
              <span className="bg-teal-100/80 px-1.5 py-0.5 rounded text-[10px]">{profitMargin}% Net Margin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target vs Actual Progress */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Sales Target vs Actual Realization
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Realized ₹28.40L against Annual Corporate Target of ₹35.00L ({targetAchievement}%)
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
            {targetAchievement}% Achieved
          </span>
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#004749] via-[#013b3f] to-[#b09b72]"
              style={{ width: `${targetAchievement}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-semibold text-slate-400">
            <span>₹0 (Starting Baseline)</span>
            <span>Target: ₹35,00,000</span>
          </div>
        </div>
      </div>

      {/* Revenue Trend vs Expenses & Net Profit */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Monthly Revenue, Expenses & Net Profit Trend
            </h2>
            <p className="text-xs text-slate-500 font-medium">Financial trajectory across cycles</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#004749]" />
              <span className="text-slate-600">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-rose-500" />
              <span className="text-slate-600">Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#b09b72]" />
              <span className="text-slate-600">Net Profit</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_FINANCE_TREND} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val / 1000}k`}
              />
              <Tooltip
                formatter={(val) => [`₹${Number(val).toLocaleString()}`, '']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '12px',
                }}
              />
              <Bar dataKey="revenue" fill="#004749" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#b09b72" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdowns: By Manager, By Executive, By Customer */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue by Manager */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Revenue by Sales Manager
            </h3>
            <p className="text-xs text-slate-500 font-medium">Regional leadership attribution</p>
          </div>

          <div className="space-y-3.5">
            {MANAGER_REVENUE.map((mgr, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800">{mgr.name}</span>
                  <span className="text-slate-900 font-black">₹{mgr.revenue.toLocaleString()}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: mgr.percentage, backgroundColor: mgr.color }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Share: {mgr.percentage}</span>
                  <span>Target: ₹{(mgr.target / 100000).toFixed(1)}L</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Executive */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Revenue by Executive
            </h3>
            <p className="text-xs text-slate-500 font-medium">Individual sales output</p>
          </div>

          <div className="space-y-3">
            {EXECUTIVE_REVENUE.map((exec, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
              >
                <div>
                  <p className="font-extrabold text-slate-900">{exec.name}</p>
                  <p className="text-[10px] text-slate-400">{exec.deals} Deals Won · {exec.share} share</p>
                </div>
                <span className="font-black text-[#004749]">₹{exec.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Expense Allocation Breakdown
            </h3>
            <p className="text-xs text-slate-500 font-medium">Reimbursements & operations</p>
          </div>

          <div className="space-y-3">
            {EXPENSE_SUMMARY.map((exp, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">{exp.category}</span>
                  <span className="font-black text-rose-600">₹{exp.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-400"
                    style={{ width: exp.percentage }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue by Customer Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Key Customer Revenue Streams
          </h2>
          <p className="text-xs text-slate-500 font-medium">Direct billing accounts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Customer Company</th>
                <th className="pb-3">Product / Service License</th>
                <th className="pb-3">Receipt Date</th>
                <th className="pb-3 text-right">Realized Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {CUSTOMER_REVENUE.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 font-extrabold text-slate-900">{c.company}</td>
                  <td className="py-3 text-slate-600">{c.type}</td>
                  <td className="py-3 text-slate-400">{c.date}</td>
                  <td className="py-3 text-right font-black text-emerald-700">
                    ₹{c.value.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RevenueFinance
