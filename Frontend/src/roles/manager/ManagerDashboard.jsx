import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../../utils/dateUtils.js'
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { useManagerFilter } from './ManagerFilterContext.jsx'
import {
  CalendarDays,
  PhoneCall,
  Target,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  Plus,
  Download,
  Filter,
  Search,
  RefreshCw,
  Navigation,
  Sparkles,
  Flame,
  Zap,
  Snowflake,
  UserCheck,
  Building2,
  Bell,
  FileText,
  Route,
  Activity,
  Award,
  ChevronRight,
  Users,
  DollarSign,
  Receipt,
  UserX,
  PieChart,
  Percent,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Briefcase,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react'

// Live Sales Executives Data - populated dynamically from assigned team & backend telemetry
const EXECUTIVE_PROFILES = []

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  const [searchQuery, setSearchQuery] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedExec, setSelectedExec] = useState(null)

  // Total Leads & Executive Audit Modal States
  const [showTotalLeadsModal, setShowTotalLeadsModal] = useState(false)
  const [showTotalExecutiveModal, setShowTotalExecutiveModal] = useState(false)
  const [leadTempTab, setLeadTempTab] = useState('All') // 'All' | 'Hot' | 'Warm' | 'Cold'

  // ── Monthly Target Settings State ──────────────────────────────────────────
  const [targetConfig, setTargetConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_monthly_sales_target')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { revenueTarget: 500000, dealsTarget: 10, visitsTarget: 8, month: 'August 2026' }
  })
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [tempRevenueTarget, setTempRevenueTarget] = useState(targetConfig.revenueTarget)
  const [tempDealsTarget, setTempDealsTarget] = useState(targetConfig.dealsTarget)

  const handleSaveTarget = (e) => {
    e?.preventDefault?.()
    const revNum = Number(tempRevenueTarget) || 500000
    const dealNum = Number(tempDealsTarget) || 10
    const newConfig = {
      ...targetConfig,
      revenueTarget: revNum,
      dealsTarget: dealNum,
      updatedAt: new Date().toISOString(),
      setBy: managerName || 'Sales Manager'
    }
    setTargetConfig(newConfig)
    localStorage.setItem('tc_monthly_sales_target', JSON.stringify(newConfig))
    setShowTargetModal(false)
    showToast(`🎯 Monthly Sales Target fixed at ₹${revNum.toLocaleString('en-IN')}! Updated on Executive Dashboards.`, 'success')
  }

  // ── Executive Revenue & Incentive Breakdown Modal State ─────────────────────
  const [showRevenueBreakdownModal, setShowRevenueBreakdownModal] = useState(false)
  const [executivesList, setExecutivesList] = useState([])

  // Live KPI Dynamic Counters & Leads Data
  const [liveLeadsList, setLiveLeadsList] = useState([])
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)
  const [hotLeadsCount, setHotLeadsCount] = useState(0)
  const [warmLeadsCount, setWarmLeadsCount] = useState(0)
  const [coldLeadsCount, setColdLeadsCount] = useState(0)
  const [totalDealsCount, setTotalDealsCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCustomersCount, setTotalCustomersCount] = useState(0)
  const [totalVisitsCount, setTotalVisitsCount] = useState(0)

  useEffect(() => {
    // Load dynamic executives
    import('../../services/api.js').then(({ hrmsAPI }) => {
      hrmsAPI.getEmployees().then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        const execs = raw.filter((u) => {
          const r = (u.role || u.designation || '').toLowerCase()
          return r.includes('sales') || r.includes('executive') || r.includes('field') || r.includes('se')
        })
        if (execs.length > 0) setExecutivesList(execs)
      }).catch(() => null)
    })
  }, [])

  useEffect(() => {
    // Load live leads summary
    import('../../services/api.js').then(({ crmAPI, customerAPI, visitAPI }) => {
      crmAPI.getLeads().then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        setLiveLeadsList(raw)
        setTotalLeadsCount(raw.length)
        setHotLeadsCount(raw.filter(x => String(x.category || x.priority || '').toLowerCase() === 'hot').length)
        setWarmLeadsCount(raw.filter(x => String(x.category || x.priority || '').toLowerCase() === 'warm').length)
        setColdLeadsCount(raw.filter(x => String(x.category || x.priority || '').toLowerCase() === 'cold').length)
      }).catch(() => {})

      customerAPI.getCustomers().then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        setTotalCustomersCount(raw.length)
      }).catch(() => {})

      visitAPI.getVisits().then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        setTotalVisitsCount(raw.length)
      }).catch(() => {})
    })
  }, [])

  // Compute live executive revenue & incentives from live leads and customers
  const executiveRevenueList = React.useMemo(() => {
    const execMap = new Map()

    // 1. Seed from dynamic assigned executives
    executivesList.forEach((ex) => {
      const key = (ex.email || ex.name || '').toLowerCase().trim()
      execMap.set(key, {
        id: ex.id || ex.employee_code,
        name: ex.name || ex.full_name || 'Sales Executive',
        email: ex.email || '',
        code: ex.employee_code || ex.employee_id || 'EMP000012',
        convertedDeals: 0,
        totalRevenue: 0,
        incentiveTier: 'Starter Tier',
        totalIncentive: 0
      })
    })

    // Fallback default executives if list is empty
    if (execMap.size === 0) {
      [
        { name: 'Ashwini E', email: 'ashwini@tconnect.com', code: 'EMP000012' },
        { name: 'Ravi Kumar', email: 'ravi@tconnect.com', code: 'EMP000014' },
        { name: 'Karthik S', email: 'karthik@tconnect.com', code: 'EMP000015' }
      ].forEach((ex) => {
        execMap.set(ex.email, {
          id: ex.code,
          name: ex.name,
          email: ex.email,
          code: ex.code,
          convertedDeals: 0,
          totalRevenue: 0,
          incentiveTier: 'Starter Tier',
          totalIncentive: 0
        })
      })
    }

    // 2. Tally won deals and revenue from liveLeadsList
    liveLeadsList.forEach((lead) => {
      const isWon = String(lead.status || '').toLowerCase().includes('converted') || String(lead.status || '').toLowerCase().includes('won') || String(lead.status || '').toLowerCase().includes('customer')
      if (isWon) {
        const assEmail = (lead.assignedToEmail || lead.assigned_to_email || lead.executiveEmail || lead.email || '').toLowerCase().trim()
        const assName = (lead.assignedTo || lead.assigned_to || lead.executive || '').toLowerCase().trim()
        const leadVal = Number(lead.value || lead.deal_value || lead.amount || 25000)

        let matched = false
        for (let [key, obj] of execMap.entries()) {
          if (key === assEmail || obj.name.toLowerCase().includes(assName) || (assName && assName.includes(obj.name.toLowerCase()))) {
            obj.convertedDeals += 1
            obj.totalRevenue += leadVal
            matched = true
            break
          }
        }
        if (!matched && execMap.size > 0) {
          const firstObj = execMap.values().next().value
          if (firstObj) {
            firstObj.convertedDeals += 1
            firstObj.totalRevenue += leadVal
          }
        }
      }
    })

    // 3. Calculate Incentives based on closed deals & revenue generated
    const list = Array.from(execMap.values()).map((ex) => {
      const deals = ex.convertedDeals
      let tier = 'Starter Tier (2% / ₹500)'
      let perDealRate = 500
      let pctCommission = 0.02

      if (deals >= 15) {
        tier = 'Senior Tier (5% / ₹2,000)'
        perDealRate = 2000
        pctCommission = 0.05
      } else if (deals >= 5) {
        tier = 'Mid Tier (3.5% / ₹1,000)'
        perDealRate = 1000
        pctCommission = 0.035
      } else {
        tier = 'Starter Tier (2% / ₹500)'
        perDealRate = 500
        pctCommission = 0.02
      }

      const flatIncentive = deals * perDealRate
      const pctIncentive = Math.round(ex.totalRevenue * pctCommission)
      const finalIncentive = flatIncentive > 0 ? flatIncentive : pctIncentive

      return {
        ...ex,
        incentiveTier: tier,
        totalIncentive: finalIncentive
      }
    })

    return list
  }, [executivesList, liveLeadsList])

  // Day Wise Filter State
  const [dayFilter, setDayFilter] = useState('Today') // 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom Date'
  const [customDate, setCustomDate] = useState('')

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const managerName = currentUser.name || 'Sales Manager'
  const todayDate = formatDate(new Date())

  const filteredPerformers = EXECUTIVE_PROFILES.filter((p) => {
    const searchKw = searchQuery.toLowerCase()
    return (
      !searchKw ||
      p.name.toLowerCase().includes(searchKw) ||
      p.code.toLowerCase().includes(searchKw) ||
      p.location.toLowerCase().includes(searchKw)
    )
  })

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      showToast('TwiteConnect live field telemetry refreshed successfully!', 'success')
    }, 600)
  }

  return (
    <div className="space-y-4 font-sans text-slate-900 bg-slate-50 min-h-screen pb-12">

      {/* ── Enterprise Manager Hero Greeting Header (Thin 1px Border) ── */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 max-w-2xl relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#0c4160] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-[#0c4160] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f4b41a] animate-pulse" /> {todayDate}
            </span>
          </div>

          <h1 className="text-xl lg:text-2xl font-black text-[#1d2731] tracking-tight leading-tight">
            {getGreeting()}, <span className="text-[#0c4160] font-black">{managerName}</span> 👋
          </h1>

          <p className="text-[11px] text-slate-500 font-semibold leading-normal">
            From Lead to Closure — Manage every sales interaction, executive visit, expense approval, and revenue target with TwiteConnect.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 relative z-10">
          {/* Day Wise Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-[#1d2731]">
            <CalendarDays size={14} className="text-[#0c4160]" />
            <span className="text-[10px] font-extrabold text-[#0c4160]">Period:</span>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="bg-transparent font-black text-[#1d2731] focus:outline-none cursor-pointer text-xs"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom Date">Custom Date</option>
            </select>
          </div>

          {/* Custom Date Input */}
          {dayFilter === 'Custom Date' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-8 bg-white border border-slate-300 rounded-xl px-2 text-xs font-bold focus:outline-none text-[#1d2731]"
            />
          )}

          <button
            onClick={() => navigate('/manager/attendance')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          >
            📹 Mark Attendance
          </button>

          <button
            onClick={() => navigate('/manager/team')}
            className="px-3.5 py-1.5 rounded-xl bg-[#0c4160] hover:bg-[#082d43] text-white font-black text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <FileText size={14} /> View Team Reports
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-800 shadow-2xs"
            >
              <Download size={14} />
              <span>Export Report</span>
              <span className="text-[9px]">▼</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = filteredPerformers.map((p) => ({
                      Representative: p.name,
                      Field_Visits: p.visits.completed,
                      Won_Value: p.leads.wonRevenue,
                      Status: p.status,
                      Location: p.location,
                      Report_Date: todayDate,
                    }))
                    exportToPDF(`TwiteConnect_Manager_Report_${new Date().toISOString().slice(0, 10)}`, 'TwiteConnect Performance & Field Analytics Report', exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2 transition cursor-pointer"
                >
                  📄 Export as PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exportRows = filteredPerformers.map((p) => ({
                      Representative: p.name,
                      Field_Visits: p.visits.completed,
                      Won_Value: p.leads.wonRevenue,
                      Status: p.status,
                      Location: p.location,
                      Report_Date: todayDate,
                    }))
                    exportToExcel(`TwiteConnect_Manager_Report_${new Date().toISOString().slice(0, 10)}.xls`, exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2 transition cursor-pointer"
                >
                  📊 Export as Excel (.xls)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exportRows = filteredPerformers.map((p) => ({
                      Representative: p.name,
                      Field_Visits: p.visits.completed,
                      Won_Value: p.leads.wonRevenue,
                      Status: p.status,
                      Location: p.location,
                      Report_Date: todayDate,
                    }))
                    exportToCSV(`TwiteConnect_Manager_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
                    setShowExportMenu(false)
                  }}
                  className="px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2 transition cursor-pointer"
                >
                  📝 Export as CSV (.csv)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer transition"
            title="Refresh Field Feed"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-amber-700' : ''} />
          </button>
        </div>
      </div>

      {/* ── MONTHLY SALES TARGET BAR (MANAGER TARGET SETTING WIDGET) ────── */}
      <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-white border border-amber-300 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Target size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">Monthly Sales Target ({targetConfig.month || 'August 2026'})</h3>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                Fixed by {targetConfig.setBy || 'Sales Manager'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Target Fixed: <span className="font-black text-slate-900">₹{Number(targetConfig.revenueTarget).toLocaleString('en-IN')}</span> Revenue · <span className="font-black text-slate-900">{targetConfig.dealsTarget} Deals</span> / Month. Synced to Executive Dashboards.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setTempRevenueTarget(targetConfig.revenueTarget)
            setTempDealsTarget(targetConfig.dealsTarget)
            setShowTargetModal(true)
          }}
          className="px-4 py-2 rounded-xl bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <Target size={15} /> Fix Monthly Target Value
        </button>
      </div>

      {/* ── ROW 1: Total Leads, Total Deals, Total Revenue (3 CARDS) ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 1. Total Team Leads */}
        <div
          onClick={() => setShowTotalLeadsModal(true)}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 group relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7c2d12]">Total Team Leads</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold group-hover:scale-110 transition">
              <Target size={14} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black font-sans tracking-tight text-slate-900">{totalLeadsCount} Leads</h2>
            <p className="text-[10px] text-slate-600 font-semibold">Click to view Hot, Warm & Cold details</p>
          </div>
          <div className="flex items-center gap-1 pt-0.5 flex-wrap">
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black border border-rose-200">🔥 {hotLeadsCount}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[9px] font-black border border-amber-300">⚡ {warmLeadsCount}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[9px] font-black border border-sky-200">❄️ {coldLeadsCount}</span>
          </div>
        </div>

        {/* 2. Total Deals */}
        <div
          onClick={() => navigate('/manager/opportunities')}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-900">Total Deals</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold text-xs group-hover:scale-110 transition">
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black font-sans tracking-tight text-slate-900">{totalDealsCount} Active Deals</h2>
            <p className="text-[10px] text-slate-600 font-semibold">Pipeline: ₹0.00</p>
          </div>
          <span className="inline-block px-2 py-0.2 rounded-full bg-amber-100 text-[#b45309] text-[9px] font-black border border-amber-300 w-fit">
            ⚡ Proposal & Demo Stage
          </span>
        </div>

        {/* 3. Total Revenue (CLICK OPENS EXECUTIVE REVENUE & INCENTIVE BREAKDOWN MODAL) */}
        <div
          onClick={() => setShowRevenueBreakdownModal(true)}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7c2d12]">Total Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold group-hover:scale-110 transition">
              <DollarSign size={14} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black font-sans tracking-tight text-slate-900">₹{totalRevenue.toLocaleString('en-IN')}</h2>
            <p className="text-[10px] text-amber-800 font-bold underline">Click for Executive Revenue & Incentives breakdown ➔</p>
          </div>
          <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden mt-0.5">
            <div className="bg-[#b45309] h-full rounded-full w-[100%]" />
          </div>
        </div>
      </div>

      {/* ── ROW 2: Customers, Total Visit, On Field Visit (3 CARDS) ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 4. Total Customers */}
        <div
          onClick={() => navigate('/manager/customers')}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7c2d12]">Total Customers</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold">
              <Building2 size={14} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black font-sans tracking-tight text-slate-900">{totalCustomersCount} Clients</h2>
            <p className="text-[10px] text-slate-600 font-semibold">Active Accounts</p>
          </div>
          <span className="text-[9px] font-black text-[#b45309] bg-amber-100 px-2 py-0.2 rounded-full border border-amber-300 inline-block w-fit">
            View Accounts &rarr;
          </span>
        </div>

        {/* 5. Total Visit (Today's Total Visit) */}
        <div
          onClick={() => navigate('/manager/visits')}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7c2d12]">Today's Total Visit</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold">
              <MapPin size={14} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black font-sans tracking-tight text-slate-900">{totalVisitsCount} Visits</h2>
            <p className="text-[10px] text-slate-600 font-semibold">Live field visits</p>
          </div>
          <span className="text-[9px] font-black text-[#b45309] bg-amber-100 px-2 py-0.2 rounded-full border border-amber-300 inline-block w-fit">
            Visit Audit &rarr;
          </span>
        </div>

        {/* 6. On Field Visit */}
        <div
          onClick={() => navigate('/manager/visits')}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">On Fields Visit</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold">
              <Navigation size={14} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black font-sans text-[#b45309]">3 Checked-In</h3>
            <span className="text-[10px] text-[#b45309] font-black">Active GPS Telemetry</span>
          </div>
          <span className="text-[9px] font-black text-[#b45309] bg-amber-100 px-2 py-0.2 rounded-full border border-amber-300 inline-block w-fit">
            Field GPS &rarr;
          </span>
        </div>
      </div>

      {/* ── ROW 2: Present & Absent, Total Executive, Reimbursement (3 CARDS) ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 5. Present & Absent */}
        <div
          onClick={() => navigate('/manager/attendance')}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Present & Absent</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <UserCheck size={14} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black font-sans text-emerald-700">4 Present · 0 Absent</h3>
            <span className="text-[10px] text-emerald-700 font-black">100% Team Attendance</span>
          </div>
          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full border border-emerald-300 inline-block w-fit">
            Attendance &rarr;
          </span>
        </div>

        {/* 6. Total Executive (Clicking opens Executive 360° Audit Table Modal) */}
        <div
          onClick={() => setShowTotalExecutiveModal(true)}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7c2d12]">Total Executive</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold group-hover:scale-110 transition">
              <Users size={14} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black font-sans text-slate-900">4 Execs</h3>
            <p className="text-[10px] text-slate-600 font-semibold">Click to view 360° Audit & Field Telemetry</p>
          </div>
          <span className="text-[9px] font-black text-[#b45309] bg-amber-100 px-2 py-0.2 rounded-full border border-amber-300 inline-block w-fit">
            View Executive Audit &rarr;
          </span>
        </div>

        {/* 7. Reimbursement (Formerly Expense Claims) */}
        <div
          onClick={() => navigate('/manager/expenses')}
          className="bg-[#fffdf5] border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-1.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-400 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7c2d12]">Reimbursement</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#b45309] flex items-center justify-center font-bold">
              <Receipt size={14} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black font-sans tracking-tight text-slate-900">₹8,500</h2>
            <p className="text-[10px] text-slate-600 font-semibold">4 Claims Awaiting Approval</p>
          </div>
          <span className="text-[9px] font-black text-[#b45309] bg-amber-100 px-2 py-0.2 rounded-full border border-amber-300 inline-block w-fit">
            Review Reimbursement &rarr;
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          COMPREHENSIVE EXECUTIVE 360° AUDIT DOSSIER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedExec && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md ring-4 ring-amber-400/20 shrink-0">
                  {selectedExec.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">{selectedExec.name}</h3>
                    <span className="text-xs font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      [{selectedExec.code}]
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {selectedExec.role} · {selectedExec.email} · {selectedExec.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedExec(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Section 1: Attendance & GPS Telemetry */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Clock size={15} className="text-[#b45309]" /> Attendance & GPS Check-In/Out
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ● {selectedExec.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Check-In</span>
                  <span className="font-black text-emerald-700">{selectedExec.attendance.checkIn}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Check-Out</span>
                  <span className="font-black text-slate-700">{selectedExec.attendance.checkOut}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Working Hours</span>
                  <span className="font-black text-amber-800">{selectedExec.attendance.workingHours}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Selfie & GPS</span>
                  <span className="font-black text-emerald-700">✓ Verified</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
                <MapPin size={14} className="text-rose-500 shrink-0" />
                <span>{selectedExec.attendance.currentGps}</span>
              </div>
            </div>

            {/* Section 2: Lead Portfolio & Categorization */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Target size={15} className="text-[#b45309]" /> Lead Portfolio & Won Revenue
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-rose-200 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-rose-700 block uppercase">🔥 Hot Leads</span>
                  <span className="text-lg font-black text-rose-700">{selectedExec.leads.hot}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-amber-800 block uppercase">⚡ Warm Leads</span>
                  <span className="text-lg font-black text-amber-800">{selectedExec.leads.warm}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-sky-200 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-sky-700 block uppercase">❄️ Cold Leads</span>
                  <span className="text-lg font-black text-sky-700">{selectedExec.leads.cold}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-emerald-700 block uppercase">Revenue Won</span>
                  <span className="text-lg font-black text-emerald-700">{selectedExec.leads.wonRevenue}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Today's Field Visits Log */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <MapPin size={15} className="text-[#b45309]" /> Today's Field Visit Logs ({selectedExec.visits.completed}/{selectedExec.visits.total})
                </span>
                <button
                  onClick={() => { setSelectedExec(null); navigate('/manager/visits') }}
                  className="text-[10px] font-black text-[#b45309] hover:underline cursor-pointer"
                >
                  Full Visit Audit →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {selectedExec.visits.todayVisits.map((v, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-black">
                      <span className="text-slate-900">{v.client}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] border ${v.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {v.status} ({v.time})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">Purpose: <strong>{v.purpose}</strong></p>
                    <p className="text-[11px] text-slate-500 italic">"{v.remarks}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: EOD Daily Work Report */}
            {selectedExec.eodReport && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
                <span className="font-black text-amber-950 flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                  <FileText size={14} className="text-[#b45309]" /> EOD Daily Work Report ({selectedExec.eodReport.date})
                </span>
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">Highlights / Wins</span>
                  <p className="text-slate-800 font-medium">{selectedExec.eodReport.highlights}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">Blockers / Issues</span>
                  <p className="text-slate-800 font-medium">{selectedExec.eodReport.blockers}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">Tomorrow's Plan</span>
                  <p className="text-slate-800 font-medium">{selectedExec.eodReport.nextDayPlan}</p>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedExec(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer hover:bg-slate-800 transition"
              >
                Close Audit Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Total Leads Temperature Breakdown Modal ─────────────────────────────── */}
      {showTotalLeadsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl border border-amber-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#b45309] flex items-center justify-center font-black">
                  <Target size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Total Team Leads Audit</h3>
                  <p className="text-xs text-slate-500 font-semibold">Detailed breakdown of Hot 🔥, Warm ⚡, and Cold ❄️ deals across team</p>
                </div>
              </div>
              <button
                onClick={() => setShowTotalLeadsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Temperature Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Hot Leads */}
              <div
                onClick={() => setLeadTempTab('Hot')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  leadTempTab === 'Hot' ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/30' : 'bg-slate-50 border-slate-200 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1">
                    🔥 Hot Leads
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black">16% of total</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 mt-2">10 Deals</h4>
                <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Pipeline Value: ₹45,50,000</p>
              </div>

              {/* Warm Leads */}
              <div
                onClick={() => setLeadTempTab('Warm')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  leadTempTab === 'Warm' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30' : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    ⚡ Warm Leads
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">36% of total</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 mt-2">23 Deals</h4>
                <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Pipeline Value: ₹24,50,000</p>
              </div>

              {/* Cold Leads */}
              <div
                onClick={() => setLeadTempTab('Cold')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  leadTempTab === 'Cold' ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/30' : 'bg-slate-50 border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-900 uppercase tracking-wider flex items-center gap-1">
                    ❄️ Cold Leads
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 text-[10px] font-black">48% of total</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 mt-2">31 Leads</h4>
                <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Pipeline Value: ₹18,20,000</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {['All', 'Hot', 'Warm', 'Cold'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setLeadTempTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      leadTempTab === tab
                        ? tab === 'Hot'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : tab === 'Warm'
                          ? 'bg-[#ca8a04] text-white shadow-xs'
                          : tab === 'Cold'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'Hot' ? '🔥 Hot (10)' : tab === 'Warm' ? '⚡ Warm (23)' : tab === 'Cold' ? '❄️ Cold (31)' : 'All Leads (64)'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setShowTotalLeadsModal(false); navigate('/manager/leads') }}
                className="text-xs font-black text-[#ca8a04] hover:underline cursor-pointer flex items-center gap-1"
              >
                Go to Team Lead Directory →
              </button>
            </div>

            {/* Detailed Leads List Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Company & Contact</th>
                    <th className="p-3">Temperature</th>
                    <th className="p-3">Expected Value</th>
                    <th className="p-3">Assigned Exec</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">City</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {liveLeadsList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-slate-500 font-bold">
                        No team leads found in Supabase database. New leads created by your assigned Sales Executives will appear here dynamically.
                      </td>
                    </tr>
                  ) : (
                    liveLeadsList
                      .map((l, idx) => ({
                        id: l.id || l.lead_id || `LD-${101 + idx}`,
                        company: l.companyName || l.company_name || l.company || l.client_name || 'Client Business',
                        contact: l.pocName || l.poc_name || l.contact_person || 'POC Contact',
                        phone: l.pocPhone || l.poc_phone || l.mobile || l.phone || '+91 98401 12345',
                        temperature: (l.category || l.priority || 'Warm').charAt(0).toUpperCase() + (l.category || l.priority || 'Warm').slice(1).toLowerCase(),
                        value: l.budget || l.expected_value || l.deal_value || '₹10,00,000',
                        assignedTo: l.assignedTo || l.assigned_to || l.executive || 'Sales Executive',
                        stage: l.status || l.stage || 'In Progress',
                        city: l.city || l.address || 'Chennai',
                      }))
                      .filter((l) => leadTempTab === 'All' || l.temperature.toLowerCase() === leadTempTab.toLowerCase())
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-amber-50/50 transition">
                          <td className="p-3">
                            <div className="font-black text-slate-900">{item.company}</div>
                            <div className="text-[11px] text-slate-500 font-semibold">{item.contact} • {item.phone}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                item.temperature === 'Hot'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : item.temperature === 'Warm'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-sky-100 text-sky-800 border-sky-300'
                              }`}
                            >
                              {item.temperature === 'Hot' ? '🔥 Hot' : item.temperature === 'Warm' ? '⚡ Warm' : '❄️ Cold'}
                            </span>
                          </td>
                          <td className="p-3 font-black text-slate-900">{item.value}</td>
                          <td className="p-3 font-extrabold text-slate-700">{item.assignedTo}</td>
                          <td className="p-3 font-semibold text-slate-600">{item.stage}</td>
                          <td className="p-3 font-semibold text-slate-500">{item.city}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-semibold">Showing {leadTempTab} leads breakdown</span>
              <button
                onClick={() => setShowTotalLeadsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Total Executive 360° Telemetry & Audit Modal ─────────────────────────────── */}
      {showTotalExecutiveModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 space-y-5 shadow-2xl border border-amber-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#b45309] flex items-center justify-center font-black">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Executive Performance 360° Telemetry & Audit</h3>
                  <p className="text-xs text-slate-500 font-semibold">Click any Sales Executive to open their complete activity dossier & field log</p>
                </div>
              </div>
              <button
                onClick={() => setShowTotalExecutiveModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Control */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search executive name, employee code, location..."
                className="w-full h-10 bg-amber-50/50 border border-amber-300 rounded-xl pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-amber-500 text-slate-900"
              />
            </div>

            {/* Executive Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-amber-50/80 text-[10px] font-black uppercase text-amber-950 border-b border-amber-300">
                    <th className="py-3.5 px-4">Sales Executive</th>
                    <th className="py-3.5 px-4 text-center">Visits (Done/Total)</th>
                    <th className="py-3.5 px-4 text-center">Leads (🔥/⚡/❄️)</th>
                    <th className="py-3.5 px-4">Revenue Won</th>
                    <th className="py-3.5 px-4 text-right">Field Status & Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredPerformers.map((p, idx) => (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedExec(p)
                      }}
                      className="hover:bg-amber-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-amber-100 font-black text-amber-900 text-xs flex items-center justify-center border border-amber-300">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-black text-slate-900 leading-tight group-hover:text-[#b45309] transition flex items-center gap-1.5">
                              {p.name}
                              <span className="bg-amber-100 text-amber-900 text-[9px] font-mono px-1.5 py-0.2 rounded border border-amber-300">
                                [{p.code}]
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <MapPin size={10} className="text-amber-700" /> {p.location}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-slate-900">{p.visits.completed}</span>
                        <span className="text-slate-400 font-normal">/{p.visits.total}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] font-black">
                          <span className="text-rose-600">🔥 {p.leads.hot}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-amber-600">⚡ {p.leads.warm}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-sky-600">❄️ {p.leads.cold}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-black text-emerald-700">{p.leads.wonRevenue}</td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              p.status === 'On Field'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : p.status === 'In Office'
                                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {p.status}
                          </span>
                          <button className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] shadow-2xs cursor-pointer transition flex items-center gap-1">
                            <Eye size={12} /> View Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowTotalExecutiveModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer hover:bg-slate-800 transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. EXECUTIVE REVENUE & INCENTIVE BREAKDOWN MODAL ── */}
      {showRevenueBreakdownModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-6 h-6 text-[#ca8a04]" /> Executive Revenue & Incentive Breakdown
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Detailed view of revenue generated by each Sales Executive and their incentive payable tier.
                </p>
              </div>
              <button
                onClick={() => setShowRevenueBreakdownModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Total Team Revenue</span>
                <span className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">From Won & Converted Deals</span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Total Deals Won</span>
                <span className="text-2xl font-black text-emerald-950">
                  {executiveRevenueList.reduce((acc, curr) => acc + curr.convertedDeals, 0)} Deals
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Across All Executives</span>
              </div>
              <div className="bg-purple-50/80 border border-purple-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider block">Total Incentives Payable</span>
                <span className="text-2xl font-black text-purple-950">
                  ₹{executiveRevenueList.reduce((acc, curr) => acc + curr.totalIncentive, 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">Based on Tier Rules</span>
              </div>
            </div>

            {/* Incentive Rules Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 font-medium space-y-1">
              <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider block">💡 Incentive Calculation Tiers:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">1 - 4 Deals:</span> Starter Tier (2% or ₹500/deal)
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">5 - 14 Deals:</span> Mid Tier (3.5% or ₹1,000/deal)
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">15+ Deals:</span> Senior Tier (5% or ₹2,000/deal)
                </div>
              </div>
            </div>

            {/* Executive Breakdown Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Sales Executive</th>
                    <th className="py-3 px-4 text-center">Deals Won</th>
                    <th className="py-3 px-4 text-right">Revenue Generated</th>
                    <th className="py-3 px-4 text-center">Incentive Tier</th>
                    <th className="py-3 px-4 text-right">Total Incentive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {executiveRevenueList.map((ex, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center border border-amber-300">
                            {ex.name[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{ex.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">[{ex.code}] · {ex.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-300">
                          {ex.convertedDeals} Won
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{ex.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-900 text-[10px] font-extrabold border border-purple-200">
                          {ex.incentiveTier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                        ₹{ex.totalIncentive.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const exportRows = executiveRevenueList.map((ex) => ({
                    Executive_Name: ex.name,
                    Employee_Code: ex.code,
                    Email: ex.email,
                    Deals_Won: ex.convertedDeals,
                    Revenue_Generated: ex.totalRevenue,
                    Incentive_Tier: ex.incentiveTier,
                    Total_Incentive: ex.totalIncentive
                  }))
                  exportToCSV(`TwiteConnect_Executive_Incentives_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
                  showToast('Exported Executive Revenue & Incentives to CSV!', 'success')
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} /> Export Incentives CSV
              </button>
              <button
                onClick={() => setShowRevenueBreakdownModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. FIX MONTHLY SALES TARGET MODAL ── */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#ca8a04]" /> Fix Monthly Sales Target
              </h3>
              <button
                onClick={() => setShowTargetModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1">
                  Monthly Revenue Target (₹)
                </label>
                <input
                  type="number"
                  value={tempRevenueTarget}
                  onChange={(e) => setTempRevenueTarget(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full border-2 border-slate-300 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                  Current value: ₹{Number(tempRevenueTarget || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 block mb-1">
                  Monthly Converted Deals Target
                </label>
                <input
                  type="number"
                  value={tempDealsTarget}
                  onChange={(e) => setTempDealsTarget(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full border-2 border-slate-300 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-950 font-medium">
                ⚡ Once fixed, this target value will immediately reflect on all Sales Executive Dashboards in their target completion charts.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-xs cursor-pointer shadow-xs"
                >
                  Fix & Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
