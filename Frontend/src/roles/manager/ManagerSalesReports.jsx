import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Users,
  Target,
  ArrowUpRight,
  TrendingDown,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Send,
  Save,
  CheckCircle
} from 'lucide-react'
import { reportAPI, crmAPI, pipelineAPI, salesAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts'

export default function ManagerSalesReports() {
  const { showToast } = useToast()

  // Tab State: 'weekly' | 'monthly'
  const [reportType, setReportType] = useState('weekly')

  // Date selectors
  const [selectedWeek, setSelectedWeek] = useState('2026-W35') // default format
  const [selectedMonth, setSelectedMonth] = useState('2026-08')

  // Live aggregated data from API
  const [leadsList, setLeadsList] = useState([])
  const [opportunitiesList, setOpportunitiesList] = useState([])
  const [eodReports, setEodReports] = useState([])
  const [historicalReports, setHistoricalReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Editable Manager metrics/remarks state
  const [targetVal, setTargetVal] = useState('')
  const [keyAchievements, setKeyAchievements] = useState('')
  const [pendingActivities, setPendingActivities] = useState('')
  const [issuesEscalations, setIssuesEscalations] = useState('')
  const [nextPeriodPlan, setNextPeriodPlan] = useState('')
  const [prevMonthComparison, setPrevMonthComparison] = useState('5% Increase')
  const [majorChallenges, setMajorChallenges] = useState('')
  const [lostDealAnalysis, setLostDealAnalysis] = useState('')
  const [forecastVal, setForecastVal] = useState('')

  // View mode for list: 'new' (prepare report) | 'history' (view past submissions)
  const [activeTab, setActiveTab] = useState('new')
  const [selectedReportDetail, setSelectedReportDetail] = useState(null)

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true)
    try {
      const [leadsRes, oppsRes, eodRes, reportsRes] = await Promise.allSettled([
        crmAPI.getTeamLeads(),
        pipelineAPI.getOpportunities(),
        reportAPI.getEODReports(),
        reportAPI.getSalesReports()
      ])

      if (leadsRes.status === 'fulfilled' && leadsRes.value?.data) {
        const rawLeads = leadsRes.value.data
        setLeadsList(Array.isArray(rawLeads) ? rawLeads : (rawLeads.leads || []))
      } else {
        setLeadsList([])
      }
      if (oppsRes.status === 'fulfilled' && oppsRes.value?.data) {
        const rawOpps = oppsRes.value.data
        setOpportunitiesList(Array.isArray(rawOpps) ? rawOpps : (rawOpps.opportunities || []))
      } else {
        setOpportunitiesList([])
      }
      if (eodRes.status === 'fulfilled' && eodRes.value?.data) {
        const rawEod = eodRes.value.data
        setEodReports(Array.isArray(rawEod) ? rawEod : [])
      } else {
        setEodReports([])
      }
      if (reportsRes.status === 'fulfilled' && reportsRes.value?.data) {
        const rawReports = reportsRes.value.data
        setHistoricalReports(Array.isArray(rawReports) ? rawReports : [])
      } else {
        setHistoricalReports([])
      }
    } catch (err) {
      showToast('Error loading CRM report datasets', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Helper: Get start and end date for a selected week (e.g. 2026-W35)
  const weekRange = useMemo(() => {
    if (!selectedWeek.includes('-W')) return { start: null, end: null }
    const [yearStr, weekStr] = selectedWeek.split('-W')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)
    
    // Find first day of the year
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dayOfWeek = simple.getDay()
    const ISOweekStart = simple
    if (dayOfWeek <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
    }
    
    const start = new Date(ISOweekStart)
    const end = new Date(ISOweekStart)
    end.setDate(end.getDate() + 6)
    
    const pad = (num) => String(num).padStart(2, '0')
    const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
    const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
    
    return { start: startStr, end: endStr }
  }, [selectedWeek])

  // Helper: Get start and end date for a selected month (e.g. 2026-08)
  const monthRange = useMemo(() => {
    if (!selectedMonth.includes('-')) return { start: null, end: null }
    const [year, month] = selectedMonth.split('-')
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    
    const pad = (num) => String(num).padStart(2, '0')
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${pad(lastDay)}`
    }
  }, [selectedMonth])

  // Current active date range limits
  const activeRange = useMemo(() => {
    return reportType === 'weekly' ? weekRange : monthRange
  }, [reportType, weekRange, monthRange])

  // Calculate dynamic report metrics from live CRM datasets
  const calculatedMetrics = useMemo(() => {
    const { start, end } = activeRange
    if (!start || !end) return {
      actualRevenue: 0,
      dealsWon: 0,
      dealsLost: 0,
      leadsGenerated: 0,
      meetingsCompleted: 0,
      followupsCompleted: 0,
      activeOpportunities: 0,
      pipelineValue: 0,
      conversionRate: 0,
      salespersonPerformance: []
    }

    const opps = Array.isArray(opportunitiesList) ? opportunitiesList : []
    const leads = Array.isArray(leadsList) ? leadsList : []
    const eod = Array.isArray(eodReports) ? eodReports : []

    // 1. Opportunities within active date range
    const rangeOpps = opps.filter(o => {
      const d = o.updated_at || o.created_at || ''
      const dStr = d.substring(0, 10)
      return dStr >= start && dStr <= end
    })

    const dealsWonList = rangeOpps.filter(o => (o.stage || '').toLowerCase() === 'won' || (o.status || '').toLowerCase() === 'won')
    const dealsLostList = rangeOpps.filter(o => (o.stage || '').toLowerCase() === 'lost' || (o.status || '').toLowerCase() === 'lost')
    
    const actualRevenue = dealsWonList.reduce((sum, o) => sum + Number(o.deal_value || o.value || o.amount || 0), 0)

    // 2. Active (open) opportunities and pipeline value
    const activeOppsList = opps.filter(o => {
      const stage = (o.stage || '').toLowerCase()
      return stage !== 'won' && stage !== 'lost' && stage !== 'closed'
    })
    const activeOpportunities = activeOppsList.length
    const pipelineValue = activeOppsList.reduce((sum, o) => sum + Number(o.deal_value || o.value || o.amount || 0), 0)

    // 3. Leads generated
    const leadsInRange = leads.filter(l => {
      const d = l.created_at || ''
      const dStr = d.substring(0, 10)
      return dStr >= start && dStr <= end
    })
    const leadsGenerated = leadsInRange.length

    // 4. Meetings and followups completed (from EOD reports)
    const rangeEOD = eod.filter(r => {
      const d = r.report_date || r.date || ''
      const dStr = d.substring(0, 10)
      return dStr >= start && dStr <= end
    })
    const meetingsCompleted = rangeEOD.reduce((sum, r) => sum + Number(r.visits_count || r.visitsCompleted || 0), 0)
    const followupsCompleted = rangeEOD.reduce((sum, r) => sum + Number(r.followups_scheduled || r.followupsScheduled || 0), 0)

    // 5. Conversion rate
    const conversionRate = rangeOpps.length > 0 
      ? Math.round((dealsWonList.length / rangeOpps.length) * 100) 
      : 0

    // 6. Salesperson-wise performance
    const salespersonsMap = {}
    opps.forEach(o => {
      const execName = o.assigned_to_name || o.executive || o.employee_name || 'Unassigned'
      if (!salespersonsMap[execName]) {
        salespersonsMap[execName] = {
          name: execName,
          leads: 0,
          meetings: 0,
          wonDeals: 0,
          lostDeals: 0,
          revenue: 0,
          pipeline: 0
        }
      }
      
      const d = o.updated_at || o.created_at || ''
      const dStr = d.substring(0, 10)
      const inRange = dStr >= start && dStr <= end

      const stage = (o.stage || '').toLowerCase()
      if (inRange) {
        if (stage === 'won') {
          salespersonsMap[execName].wonDeals += 1
          salespersonsMap[execName].revenue += Number(o.deal_value || o.value || 0)
        } else if (stage === 'lost') {
          salespersonsMap[execName].lostDeals += 1
        }
      }
      if (stage !== 'won' && stage !== 'lost') {
        salespersonsMap[execName].pipeline += Number(o.deal_value || o.value || 0)
      }
    })

    // Add leads to performance map
    leads.forEach(l => {
      const d = l.created_at || ''
      const dStr = d.substring(0, 10)
      if (dStr >= start && dStr <= end) {
        const execName = l.assigned_to_name || l.executive_name || 'Unassigned'
        if (salespersonsMap[execName]) {
          salespersonsMap[execName].leads += 1
        }
      }
    })

    const salespersonPerformance = Object.values(salespersonsMap)

    return {
      actualRevenue,
      dealsWon: dealsWonList.length,
      dealsLost: dealsLostList.length,
      leadsGenerated,
      meetingsCompleted,
      followupsCompleted,
      activeOpportunities,
      pipelineValue,
      conversionRate,
      salespersonPerformance
    }
  }, [activeRange, leadsList, opportunitiesList, eodReports])

  // Initialize targets based on selected type
  useEffect(() => {
    if (reportType === 'weekly') {
      setTargetVal('500000') // ₹5 Lakh default weekly target
    } else {
      setTargetVal('2000000') // ₹20 Lakh default monthly target
    }
  }, [reportType])

  const currentTarget = Number(targetVal) || 1
  const achievementPct = Math.round((calculatedMetrics.actualRevenue / currentTarget) * 100)

  // Target Status Helper
  const getAchievementStatus = (pct) => {
    if (pct >= 100) return { label: 'Target Achieved', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
    if (pct >= 70) return { label: 'On Track', color: 'bg-blue-50 text-blue-800 border-blue-200' }
    return { label: 'At Risk', color: 'bg-rose-50 text-rose-800 border-rose-200' }
  }
  const achStatus = getAchievementStatus(achievementPct)

  // Chart data formatting
  const comparisonChartData = [
    { name: 'Sales Target', Amount: currentTarget },
    { name: 'Actual Revenue', Amount: calculatedMetrics.actualRevenue },
    { name: 'Pipeline Value', Amount: calculatedMetrics.pipelineValue }
  ]

  const salespersonChartData = useMemo(() => {
    return calculatedMetrics.salespersonPerformance.map(sp => ({
      name: sp.name.split(' ')[0],
      Revenue: sp.revenue,
      Pipeline: sp.pipeline
    })).slice(0, 5)
  }, [calculatedMetrics.salespersonPerformance])

  // Top Performer
  const topPerformer = useMemo(() => {
    if (calculatedMetrics.salespersonPerformance.length === 0) return 'N/A'
    const sorted = [...calculatedMetrics.salespersonPerformance].sort((a, b) => b.revenue - a.revenue)
    return sorted[0].revenue > 0 ? `${sorted[0].name} (₹${sorted[0].revenue.toLocaleString()})` : 'N/A'
  }, [calculatedMetrics.salespersonPerformance])

  // Top Deals
  const topDealsList = useMemo(() => {
    const { start, end } = activeRange
    const rangeOpps = opportunitiesList.filter(o => {
      const d = o.updated_at || o.created_at || ''
      const dStr = d.substring(0, 10)
      return dStr >= start && dStr <= end && (o.stage || '').toLowerCase() === 'won'
    })
    return rangeOpps.sort((a, b) => Number(b.deal_value || 0) - Number(a.deal_value || 0)).slice(0, 3)
  }, [opportunitiesList, activeRange])

  // Form submission handler
  const handleSaveReport = async (status = 'Draft') => {
    setSubmitting(true)
    const period = reportType === 'weekly' ? selectedWeek : selectedMonth
    const metricsPayload = {
      target: currentTarget,
      actualRevenue: calculatedMetrics.actualRevenue,
      achievementPct,
      newLeads: calculatedMetrics.leadsGenerated,
      followups: calculatedMetrics.followupsCompleted,
      meetings: calculatedMetrics.meetingsCompleted,
      dealsWon: calculatedMetrics.dealsWon,
      dealsLost: calculatedMetrics.dealsLost,
      activeOpps: calculatedMetrics.activeOpportunities,
      pipelineValue: calculatedMetrics.pipelineValue,
      conversionRate: calculatedMetrics.conversionRate,
      topPerformer,
      keyAchievements,
      pendingActivities,
      issuesEscalations,
      nextPeriodPlan,
      prevMonthComparison,
      majorChallenges,
      lostDealAnalysis,
      forecastVal,
      salespersonPerformance: calculatedMetrics.salespersonPerformance
    }

    const payload = {
      report_type: reportType,
      report_period: period,
      metrics: metricsPayload,
      status
    }

    try {
      const res = await reportAPI.submitSalesReport(payload)
      if (res && res.data) {
        showToast(status === 'Draft' ? 'Report saved as draft!' : 'Report submitted to CEO!', 'success')
        fetchData()
        setActiveTab('history')
      }
    } catch (err) {
      showToast('Failed to save report', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 text-slate-800 bg-slate-50/50 min-h-screen pb-12 font-sans">
      
      {/* ── HEADER & GLOBAL CONTROLS ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="size-6 text-[#832D51]" />
            Sales Performance Reports
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Submit weekly and monthly sales reports directly to the CEO for review.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition cursor-pointer ${
              activeTab === 'new' ? 'bg-[#832D51] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Prepare Report
          </button>
          <button
            onClick={() => {
              setActiveTab('history')
              setSelectedReportDetail(null)
            }}
            className={`px-4 py-2 text-xs font-black rounded-lg transition cursor-pointer ${
              activeTab === 'history' ? 'bg-[#832D51] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Past Reports
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <>
          {/* ── REPORT SELECTION & PERIOD CONTROLS ───────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setReportType('weekly')}
                  className={`px-5 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                    reportType === 'weekly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Weekly Report
                </button>
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-5 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                    reportType === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Monthly Report
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Select Period</span>
                {reportType === 'weekly' ? (
                  <input
                    type="week"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#832D51] focus:ring-1 focus:ring-[#832D51]"
                  />
                ) : (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-[#832D51] focus:ring-1 focus:ring-[#832D51]"
                  />
                )}
              </div>
            </div>

            {/* ── KPI HIGHLIGHT CARDS ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200/70 p-5 rounded-2xl relative space-y-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Target Quota</span>
                  <Target className="size-4 text-[#832D51]" />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={targetVal}
                    onChange={(e) => setTargetVal(e.target.value)}
                    className="text-lg font-black bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#832D51] focus:outline-none text-slate-900 w-full"
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-bold">Manager assigned quota</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 p-5 rounded-2xl relative space-y-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Actual Revenue</span>
                  <DollarSign className="size-4 text-[#832D51]" />
                </div>
                <h4 className="text-lg font-black text-slate-900 mt-2">
                  ₹{calculatedMetrics.actualRevenue.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 font-bold">Auto-calculated closed won value</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 p-5 rounded-2xl relative space-y-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Quota Achieved</span>
                  <TrendingUp className="size-4 text-[#832D51]" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-lg font-black text-slate-900">{achievementPct}%</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${achStatus.color}`}>
                    {achStatus.label}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold">Achievement vs Sales Target</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 p-5 rounded-2xl relative space-y-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Pipeline Strength</span>
                  <Layers className="size-4 text-[#832D51]" />
                </div>
                <h4 className="text-lg font-black text-slate-900 mt-2">
                  ₹{calculatedMetrics.pipelineValue.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 font-bold">Active opportunities pipeline</p>
              </div>
            </div>

            {/* ── ADDITIONAL SUB-KPI GRID ────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4.5 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">New Leads</span>
                <span className="text-sm font-black text-slate-800">{calculatedMetrics.leadsGenerated} Leads</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Customer Meetings</span>
                <span className="text-sm font-black text-slate-800">{calculatedMetrics.meetingsCompleted} Completed</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Deals Won / Lost</span>
                <span className="text-sm font-black text-slate-800">{calculatedMetrics.dealsWon} Won / {calculatedMetrics.dealsLost} Lost</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block">Conversion Rate</span>
                <span className="text-sm font-black text-[#832D51]">{calculatedMetrics.conversionRate}% Rate</span>
              </div>
            </div>

            {/* ── VISUAL CHARTS BREAKDOWN ────────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="border border-slate-100 p-5 rounded-2xl bg-white shadow-2xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="size-4 text-[#832D51]" />
                  Sales Quota vs Revenue Realization
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                      <Bar dataKey="Amount" fill="#832D51" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-100 p-5 rounded-2xl bg-white shadow-2xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="size-4 text-[#832D51]" />
                  Top Salespersons Pipeline (Revenue vs active deals)
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salespersonChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`]} />
                      <Legend fontSize={10} />
                      <Bar dataKey="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pipeline" fill="#832D51" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── SALESPERSON PERFORMANCE BREAKDOWN ──────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Salesperson Performance Summary Table
              </h3>
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Salesperson</th>
                      <th className="px-4 py-3 text-right">Leads</th>
                      <th className="px-4 py-3 text-right">Deals Won</th>
                      <th className="px-4 py-3 text-right">Deals Lost</th>
                      <th className="px-4 py-3 text-right">Realized Revenue</th>
                      <th className="px-4 py-3 text-right">Pipeline Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800 bg-white">
                    {calculatedMetrics.salespersonPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 font-semibold">
                          No team sales activities recorded during this period.
                        </td>
                      </tr>
                    ) : (
                      calculatedMetrics.salespersonPerformance.map((sp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3 font-bold text-slate-900">{sp.name}</td>
                          <td className="px-4 py-3 text-right">{sp.leads}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-bold">{sp.wonDeals}</td>
                          <td className="px-4 py-3 text-right text-rose-700">{sp.lostDeals}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-950">₹{sp.revenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-[#832D51]">₹{sp.pipeline.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── TOP DEALS AND SUMMARY STATS ────────────────────────────────── */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl space-y-3.5">
                <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                  <Award className="size-4 text-emerald-600" />
                  Key Won Deals / Top Customers (Realized Revenue)
                </h4>
                {topDealsList.length === 0 ? (
                  <p className="text-xs text-emerald-700 italic">No won deals recorded in this period range.</p>
                ) : (
                  <div className="space-y-2">
                    {topDealsList.map((deal, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100/70">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{deal.customer_name || deal.company_name || 'Customer Agreement'}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">Rep: {deal.assigned_to_name || 'Sales Rep'}</span>
                        </div>
                        <span className="text-xs font-black text-emerald-800">
                          ₹{Number(deal.deal_value || deal.value || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200/70 p-5 rounded-2xl space-y-3.5">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Top Performer & forecast
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Top Revenue Producer</span>
                    <span className="text-xs font-bold text-slate-800">{topPerformer}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Lead Conversion Rate</span>
                    <span className="text-xs font-bold text-slate-800">{calculatedMetrics.conversionRate}% success</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── QUALITATIVE MANAGER INPUTS (WEEKLY vs MONTHLY) ───────────────── */}
            <div className="space-y-5 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#832D51]">
                Qualitative Analysis & Executive Remarks
              </h3>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Key Achievements</label>
                  <textarea
                    rows={3}
                    placeholder="Describe major wins, completed client SLAs, team milestones..."
                    value={keyAchievements}
                    onChange={(e) => setKeyAchievements(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                  />
                </div>

                {reportType === 'weekly' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pending Activities</label>
                      <textarea
                        rows={3}
                        placeholder="Pending proposals, ongoing demonstrations, follow-up backlog..."
                        value={pendingActivities}
                        onChange={(e) => setPendingActivities(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Issues / Escalations</label>
                      <textarea
                        rows={3}
                        placeholder="Pricing blocks, client objections, delays in dispatch..."
                        value={issuesEscalations}
                        onChange={(e) => setIssuesEscalations(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Major Challenges</label>
                      <textarea
                        rows={3}
                        placeholder="Market competition, product feature requests, resource bottlenecks..."
                        value={majorChallenges}
                        onChange={(e) => setMajorChallenges(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lost Deal Analysis</label>
                      <textarea
                        rows={3}
                        placeholder="Why did we lose deals? Pricing, timeline mismatch, competitor win..."
                        value={lostDealAnalysis}
                        onChange={(e) => setLostDealAnalysis(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Next Month Sales Forecast (₹)</label>
                      <input
                        type="number"
                        placeholder="₹ Expected target completion forecast value"
                        value={forecastVal}
                        onChange={(e) => setForecastVal(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Previous Month Comparison Details</label>
                      <input
                        type="text"
                        placeholder="e.g. 5% Increase in conversion, 10L revenue boost..."
                        value={prevMonthComparison}
                        onChange={(e) => setPrevMonthComparison(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    {reportType === 'weekly' ? 'Next Week Action Plan' : 'Next Month Action Plan'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Outline targeted accounts, campaigns, training, or strategic moves..."
                    value={nextPeriodPlan}
                    onChange={(e) => setNextPeriodPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:border-[#832D51] text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* ── ACTION TRIGGER BUTTONS ─────────────────────────────────────── */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                disabled={submitting}
                onClick={() => handleSaveReport('Draft')}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              >
                <Save className="size-4 text-slate-500" />
                Save as Draft
              </button>
              <button
                disabled={submitting}
                onClick={() => handleSaveReport('Submitted')}
                className="px-5 py-2.5 rounded-xl bg-[#832D51] hover:bg-[#6e2343] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                <Send className="size-4" />
                Submit Report to CEO
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ── REPORTS LOG / ARCHIVE ─────────────────────────────────────────── */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">Submitted Reports History</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Review previously prepared reports, status, and CEO feedback.</p>
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Reporting Period</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">Revenue Won</th>
                  <th className="px-4 py-3 text-right">Achievement %</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">CEO Remarks</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800 bg-white">
                {historicalReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                      No reports drafted or submitted yet. Use the "Prepare Report" tab to start.
                    </td>
                  </tr>
                ) : (
                  historicalReports.map((rep) => {
                    const met = rep.metrics || {}
                    const isWeekly = rep.report_type === 'weekly'
                    
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50/40">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {isWeekly ? `Week ${rep.report_period.replace('-W', ' W')}` : rep.report_period}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${
                            isWeekly ? 'bg-sky-50 text-sky-800 border-sky-100' : 'bg-violet-50 text-violet-800 border-violet-100'
                          }`}>
                            {rep.report_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">₹{Number(met.target || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">₹{Number(met.actualRevenue || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">{met.achievementPct || 0}%</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                            rep.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            rep.status === 'Submitted' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {rep.status === 'Reviewed' ? '✅ Reviewed' :
                             rep.status === 'Submitted' ? '⏳ Submitted' :
                             '📝 Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic max-w-[200px] truncate" title={rep.ceo_remarks}>
                          {rep.ceo_remarks || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedReportDetail(rep)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REPORT DETAIL MODAL popup ─────────────────────────────────────── */}
      {selectedReportDetail && (() => {
        const rep = selectedReportDetail
        const met = rep.metrics || {}
        const isWeekly = rep.report_type === 'weekly'
        const ach = met.achievementPct || 0
        const achDetails = getAchievementStatus(ach)
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 text-xs">
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isWeekly ? 'Weekly' : 'Monthly'} Sales Performance Report
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Period: {rep.report_period} | Submitted by {rep.manager_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReportDetail(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Scorecard grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <span className="text-[9px] uppercase text-slate-400 font-black block">Sales Target</span>
                    <span className="text-sm font-black text-slate-900">₹{Number(met.target || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <span className="text-[9px] uppercase text-slate-400 font-black block">Actual Revenue</span>
                    <span className="text-sm font-black text-slate-900">₹{Number(met.actualRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <span className="text-[9px] uppercase text-slate-400 font-black block">Achievement %</span>
                    <span className="text-sm font-black text-slate-900">{ach}%</span>
                    <span className={`inline-block ml-2 px-2 py-0.5 rounded-full text-[8px] font-black border ${achDetails.color}`}>
                      {achDetails.label}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <span className="text-[9px] uppercase text-slate-400 font-black block">Pipeline Strength</span>
                    <span className="text-sm font-black text-slate-900">₹{Number(met.pipelineValue || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Sub KPI Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <div>
                    <span className="text-[8px] uppercase text-slate-400 font-black">Leads Generated</span>
                    <p className="font-bold text-slate-800 text-xs">{met.newLeads || 0} Leads</p>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase text-slate-400 font-black">Customer Meetings</span>
                    <p className="font-bold text-slate-800 text-xs">{met.meetings || 0} Meetings</p>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase text-slate-400 font-black">Deals Won / Lost</span>
                    <p className="font-bold text-slate-800 text-xs">{met.dealsWon || 0} Won / {met.dealsLost || 0} Lost</p>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase text-slate-400 font-black">Conversion rate</span>
                    <p className="font-bold text-slate-800 text-xs">{met.conversionRate || 0}% Conversion</p>
                  </div>
                </div>

                {/* Performance Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Team Performance Breakdown</h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase">
                          <th className="px-3 py-2">Salesperson</th>
                          <th className="px-3 py-2 text-right">Leads</th>
                          <th className="px-3 py-2 text-right">Won</th>
                          <th className="px-3 py-2 text-right">Revenue Won</th>
                          <th className="px-3 py-2 text-right">Pipeline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {!met.salespersonPerformance || met.salespersonPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-400">No performance records.</td>
                          </tr>
                        ) : (
                          met.salespersonPerformance.map((sp, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-bold">{sp.name}</td>
                              <td className="px-3 py-2 text-right">{sp.leads}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 font-bold">{sp.wonDeals}</td>
                              <td className="px-3 py-2 text-right">₹{Number(sp.revenue || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-[#832D51]">₹{Number(sp.pipeline || 0).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Analysis & Remarks details */}
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-black uppercase text-[#832D51] tracking-wider">Manager Analysis Remarks</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-black block">Key Achievements</span>
                      <p className="font-semibold text-slate-850 mt-1 whitespace-pre-wrap">{met.keyAchievements || 'None'}</p>
                    </div>
                    {isWeekly ? (
                      <>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[9px] uppercase text-slate-400 font-black block">Pending Activities</span>
                          <p className="font-semibold text-slate-850 mt-1 whitespace-pre-wrap">{met.pendingActivities || 'None'}</p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[9px] uppercase text-slate-400 font-black block">Issues / Escalations</span>
                          <p className="font-semibold text-rose-900 mt-1 whitespace-pre-wrap">{met.issuesEscalations || 'None'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[9px] uppercase text-slate-400 font-black block">Major Challenges</span>
                          <p className="font-semibold text-slate-850 mt-1 whitespace-pre-wrap">{met.majorChallenges || 'None'}</p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[9px] uppercase text-slate-400 font-black block">Lost Deal Analysis</span>
                          <p className="font-semibold text-slate-850 mt-1 whitespace-pre-wrap">{met.lostDealAnalysis || 'None'}</p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[9px] uppercase text-slate-400 font-black block">Forecast Forecast (₹)</span>
                          <p className="font-bold text-slate-900 mt-1">₹{Number(met.forecastVal || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                          <span className="text-[9px] uppercase text-slate-400 font-black block">Month-on-Month Trend</span>
                          <p className="font-semibold text-slate-800 mt-1">{met.prevMonthComparison || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-black block">Action Plan / Next Steps</span>
                      <p className="font-semibold text-slate-850 mt-1 whitespace-pre-wrap">{met.nextPeriodPlan || 'None'}</p>
                    </div>
                  </div>
                </div>

                {/* CEO remarks block */}
                <div className="bg-[#832D51]/5 border border-[#832D51]/15 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black uppercase text-[#832D51] tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="size-4" />
                    CEO Review & Remarks Feedback
                  </h4>
                  <p className="font-bold text-slate-900">
                    Status: <span className="underline">{rep.status}</span>
                  </p>
                  <p className="font-semibold text-slate-650 italic">
                    "{rep.ceo_remarks || 'Pending CEO feedback review. The CEO will analyze and enter remarks shortly.'}"
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedReportDetail(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                >
                  Close View
                </button>
              </div>

            </div>
          </div>
        )
      })()}

    </div>
  )
}
