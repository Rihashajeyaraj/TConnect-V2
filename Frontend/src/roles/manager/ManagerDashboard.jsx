import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  IndianRupee,
  Target,
  Building2,
  MapPin,
  Clock,
  Plus,
  Download,
  Search,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  TrendingUp,
  Award,
  ChevronRight,
  Eye,
  X,
  FileText,
  Calendar,
  UserCheck,
  AlertCircle,
  Briefcase,
  Layers,
  Activity,
  Percent,
} from 'lucide-react'
import { hrmsAPI, crmAPI, customerAPI, visitAPI, salesAPI, attendanceAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { formatDate, getDateFilterRange, isDateWithinFilterRange } from '../../utils/dateUtils.js'
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils.js'
import DateRangeFilter from '../../common/DateRangeFilter.jsx'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  const managerId = String(currentUser.id || currentUser.user_id || currentUser.employee_code || '').trim()
  const managerEmail = (currentUser.email || '').toLowerCase().trim()
  const managerName = currentUser.name || currentUser.full_name || 'Sales Manager'
  const todayFormatted = formatDate(new Date())

  // ── Global Date Filter State ────────────────────────────────────────────────
  const [dateFilterMode, setDateFilterMode] = useState('This Month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const activeDateRange = useMemo(() => {
    return getDateFilterRange(dateFilterMode, customStartDate, customEndDate)
  }, [dateFilterMode, customStartDate, customEndDate])

  // ── Core Raw Data States ────────────────────────────────────────────────────
  const [allEmployees, setAllEmployees] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  const [allVisits, setAllVisits] = useState([])
  const [allTargets, setAllTargets] = useState([])
  const [allAttendance, setAllAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── UI Modal & Filter States ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExecutiveDetail, setSelectedExecutiveDetail] = useState(null)
  const [showAddTargetModal, setShowAddTargetModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [activeSection, setActiveSection] = useState(null) // null | 'executives' | 'targets' | 'leads' | 'visits'
  const [leadTab, setLeadTab] = useState('Hot') // 'Hot' | 'Warm' | 'Cold'
  const [visitSearch, setVisitSearch] = useState('')
  const [visitTodayOnly, setVisitTodayOnly] = useState(false)

  // ── Total Revenue Drill-Down State ──────────────────────────────────────────
  const [showRevenueBreakdownModal, setShowRevenueBreakdownModal] = useState(false)
  const [revenueBreakdownData, setRevenueBreakdownData] = useState(null)
  const [revenueBreakdownLoading, setRevenueBreakdownLoading] = useState(false)
  // Modal-local date filter (independent of main dashboard filter)
  const [modalDateMode, setModalDateMode] = useState('This Month')
  const [modalCustomStart, setModalCustomStart] = useState('')
  const [modalCustomEnd, setModalCustomEnd] = useState('')

  // ── Add Target Form State ───────────────────────────────────────────────────
  const [targetForm, setTargetForm] = useState({
    executive_id: '',
    target_amount: 500000,
    period: 'Monthly',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    notes: '',
  })

  // ── Fetch All Live Data on Mount ────────────────────────────────────────────
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [empRes, leadsRes, custRes, visitsRes, targetsRes, attRes] = await Promise.allSettled([
        hrmsAPI.getEmployees(),
        crmAPI.getLeads(),
        customerAPI.getCustomers(),
        visitAPI.getVisits(),
        salesAPI.getTargets(),
        attendanceAPI.getLiveAttendance ? attendanceAPI.getLiveAttendance() : Promise.resolve([]),
      ])

      const emps = empRes.status === 'fulfilled' ? (Array.isArray(empRes.value) ? empRes.value : empRes.value?.data || []) : []
      const leads = leadsRes.status === 'fulfilled'
        ? (Array.isArray(leadsRes.value) ? leadsRes.value : leadsRes.value?.data || []).map((l) => {
            const rawStatus = (l.status || "NEW").toUpperCase();
            const statusMap = {
              "NEW": "New",
              "FOLLOW_UP": "Moved to Follow-ups",
              "VISIT_SCHEDULED": "Visit Scheduled",
              "CONVERTED": "Converted to Customer",
              "LOST": "Not Converted / Lost",
            };
            return {
              ...l,
              id: l.lead_id || l.id,
              leadNumber: l.lead_number || `LD-${String(l.lead_id || l.id || "").slice(-8).toUpperCase()}`,
              company: l.company_name || l.company || "Prospect Lead",
              company_name: l.company_name || l.company || "Prospect Lead",
              person: l.contact_person || l.contact_name || "Point of Contact",
              contact_name: l.contact_person || l.contact_name || "Point of Contact",
              phone: l.mobile || l.contact_phone || "",
              email: l.email || l.contact_email || "",
              city: l.city || "Chennai",
              product: l.product_name || l.product || "TwiteConnect CRM",
              product_name: l.product_name || l.product || "TwiteConnect CRM",
              title: l.product_name || l.product || "TwiteConnect CRM",
              category: l.category || "Warm",
              priority: l.priority || "Medium",
              status: statusMap[rawStatus] || l.status || "New",
              value: l.expected_value ? `₹${Number(l.expected_value).toLocaleString("en-IN")}` : "₹0",
              assignedTo: l.assigned_to || '',
              assignedToEmail: l.assigned_to_email || '',
              notes: l.notes || l.remarks || "",
              customerId: l.customer_id || null,
            };
          })
        : []
      const custs = custRes.status === 'fulfilled' ? (Array.isArray(custRes.value) ? custRes.value : custRes.value?.data || []) : []
      const visits = visitsRes.status === 'fulfilled' ? (Array.isArray(visitsRes.value) ? visitsRes.value : visitsRes.value?.data || []) : []
      const targets = targetsRes.status === 'fulfilled' ? (Array.isArray(targetsRes.value) ? targetsRes.value : targetsRes.value?.data || []) : []
      const atts = attRes.status === 'fulfilled' ? (Array.isArray(attRes.value) ? attRes.value : attRes.value?.data || []) : []

      setAllEmployees(emps)
      setAllLeads(leads)
      setAllCustomers(custs)
      setAllVisits(visits)
      setAllTargets(targets)
      setAllAttendance(atts)
    } catch (err) {
      console.warn('Dashboard data fetch notice:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    if (activeSection) {
      setTimeout(() => {
        const el = document.getElementById(`${activeSection}-section`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [activeSection])

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardData().then(() => {
      showToast('Dashboard data refreshed live from Supabase!', 'success')
    })
  }

  // ── 1. DYNAMIC ASSIGNED EXECUTIVES SCOPING (Source of Truth: HRMS Assignment)
  const assignedExecutives = useMemo(() => {
    if (!allEmployees.length) return []

    return allEmployees.filter((emp) => {
      if (!emp) return false

      const empManagerId = String(emp.reporting_manager_id || emp.reporting_manager || '').trim()
      const empManagerEmail = String(emp.reporting_manager_email || '').toLowerCase().trim()
      const empManagerName = String(emp.reporting_manager_name || '').toLowerCase().trim()

      const myId = String(currentUser.id || '').trim()
      const myUserId = String(currentUser.user_id || '').trim()
      const myCode = String(currentUser.employee_code || '').trim()
      const myEmail = String(currentUser.email || '').toLowerCase().trim()
      const myName = String(currentUser.name || currentUser.full_name || '').toLowerCase().trim()

      const idMatch = !!(empManagerId && (
        (myId && empManagerId === myId) ||
        (myUserId && empManagerId === myUserId) ||
        (myCode && empManagerId === myCode)
      ))

      const emailMatch = !!(empManagerEmail && myEmail && empManagerEmail === myEmail)

      const nameMatch = !!(empManagerName && myName && empManagerName === myName)

      return idMatch || emailMatch || nameMatch
    })
  }, [allEmployees, currentUser])

  // Helper set to match records owned by assigned executives
  const assignedIdentifiers = useMemo(() => {
    const emails = new Set()
    const names = new Set()
    const codes = new Set()
    const ids = new Set()

    assignedExecutives.forEach((ex) => {
      if (ex.email) emails.add(ex.email.toLowerCase().trim())
      if (ex.name || ex.full_name) names.add((ex.name || ex.full_name).toLowerCase().trim())
      if (ex.employee_code || ex.employee_id) codes.add((ex.employee_code || ex.employee_id).toLowerCase().trim())
      if (ex.id) ids.add(String(ex.id).trim())
    })

    return { emails, names, codes, ids }
  }, [assignedExecutives])

  const matchesAssignedTeam = (item) => {
    if (!item) return false
    if (assignedExecutives.length === 0) return false // No assignment set

    const iEmail = String(item.assigned_to_email || item.assignedToEmail || item.executiveEmail || item.email || '').toLowerCase().trim()
    const iName = String(item.assigned_to || item.assignedTo || item.executive || item.person || '').toLowerCase().trim()
    const iCode = String(item.employee_code || item.employee_id || item.employeeId || '').toLowerCase().trim()
    const iId = String(item.user_id || item.userId || item.executive_id || '').trim()

    if (iEmail && assignedIdentifiers.emails.has(iEmail)) return true
    if (iCode && assignedIdentifiers.codes.has(iCode)) return true
    if (iId && assignedIdentifiers.ids.has(iId)) return true
    if (iName) {
      for (let n of assignedIdentifiers.names) {
        if (iName.includes(n) || n.includes(iName)) return true
      }
    }

    return false
  }

  // ── 2. FILTERED TEAM DATA (Within Date Range) ───────────────────────────────
  const filteredTeamLeads = useMemo(() => {
    return allLeads.filter((l) => {
      const match = matchesAssignedTeam(l)
      const inDate = isDateWithinFilterRange(l.createdAt || l.date || l.created_at, activeDateRange)
      return match && inDate
    })
  }, [allLeads, activeDateRange, assignedIdentifiers])

  const filteredTeamCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const match = matchesAssignedTeam(c)
      const inDate = isDateWithinFilterRange(c.created_at || c.onboardDate || c.date, activeDateRange)
      return match && inDate
    })
  }, [allCustomers, activeDateRange, assignedIdentifiers])

  const filteredTeamVisits = useMemo(() => {
    return allLeads.filter((l) => {
      const match = matchesAssignedTeam(l)
      const inDate = isDateWithinFilterRange(l.createdAt || l.date || l.created_at, activeDateRange)
      const isVisitScheduled = String(l.status || '').toLowerCase().match(/visit_scheduled|visit scheduled/i)
      return match && inDate && isVisitScheduled
    })
  }, [allLeads, activeDateRange, assignedIdentifiers])

  const displayedVisits = useMemo(() => {
    return filteredTeamVisits.filter((v) => {
      if (!v) return false
      const q = visitSearch.toLowerCase().trim()
      const cName = (v.customer_name || v.company || v.title || '').toLowerCase()
      const poc = (v.poc_name || v.person || v.contact_person || '').toLowerCase()
      const execName = (v.assigned_to || v.executive || '').toLowerCase()
      const execEmail = (v.assigned_to_email || v.email || '').toLowerCase()
      const loc = (v.location || v.city || v.address || '').toLowerCase()
      const prod = (v.product || v.product_name || v.title || '').toLowerCase()

      const matchesSearch = !q ||
        cName.includes(q) ||
        poc.includes(q) ||
        execName.includes(q) ||
        execEmail.includes(q) ||
        loc.includes(q) ||
        prod.includes(q)

      let matchesToday = true
      if (visitTodayOnly) {
        const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        const vDateStr = String(v.visit_date || v.visitDate || v.date || '')
        let vDate = vDateStr.split('T')[0].split(' ')[0]
        if (vDate.includes('/')) {
          const parts = vDate.split('/')
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              vDate = `${parts[2]}-${parts[1]}-${parts[0]}`
            } else if (parts[0].length === 4) {
              vDate = `${parts[0]}-${parts[1]}-${parts[2]}`
            }
          }
        }
        matchesToday = vDate === todayStr
      }

      return matchesSearch && matchesToday
    })
  }, [filteredTeamVisits, visitSearch, visitTodayOnly])

  // ── 3. COMBINED TEAM REVENUE CALCULATION ────────────────────────────────────
  // Formula: SUM(revenue generated by all currently assigned Sales Executives in the selected date range)
  const totalTeamRevenue = useMemo(() => {
    if (!assignedExecutives || assignedExecutives.length === 0) return 0
    let sum = 0

    // Converted Customers with contract value (same logic as Executive's dashboard 'totalSeRevenue')
    filteredTeamCustomers.forEach((cust) => {
      const valStr = cust.contractValue || cust.value || cust.revenue || cust.budget || "0"
      const val = typeof valStr === 'number' ? valStr : (parseFloat(String(valStr).replace(/[^\d.]/g, "")) || 0)
      sum += val
    })

    return sum
  }, [filteredTeamCustomers, assignedExecutives])

  // ── 4. SALES TARGET VS ACHIEVED CALCULATIONS ────────────────────────────────
  const teamTargetsSummary = useMemo(() => {
    let totalTarget = 0

    // Match targets for assigned executives
    const relevantTargets = allTargets.filter((t) => {
      const eEmail = String(t.executive_email || '').toLowerCase().trim()
      const eId = String(t.executive_id || '').trim()
      return (eEmail && assignedIdentifiers.emails.has(eEmail)) || (eId && assignedIdentifiers.ids.has(eId))
    })

    if (relevantTargets.length > 0) {
      relevantTargets.forEach((t) => {
        totalTarget += parseFloat(t.target_amount) || 0
      })
    } else {
      // Default baseline based on assigned executives count
      totalTarget = (assignedExecutives.length || 1) * 500000
    }

    const achieved = totalTeamRevenue
    const remaining = Math.max(0, totalTarget - achieved)
    const achievementPct = totalTarget > 0 ? Math.min(100, Math.round((achieved / totalTarget) * 1000) / 10) : 0

    return {
      target: totalTarget,
      achieved,
      remaining,
      achievementPct,
      list: relevantTargets,
    }
  }, [allTargets, assignedIdentifiers, assignedExecutives, totalTeamRevenue])

  // ── 5. PER-EXECUTIVE METRIC BREAKDOWN ───────────────────────────────────────
  const executiveMetricsList = useMemo(() => {
    return assignedExecutives.map((exec) => {
      const execEmail = String(exec.email || '').toLowerCase().trim()
      const execName = String(exec.name || exec.full_name || 'Executive').toLowerCase().trim()
      const execId = String(exec.id || exec.employee_code || '').trim()

      const matchThisExec = (item) => {
        const itemEmail = String(item.assigned_to_email || item.assignedToEmail || item.executiveEmail || item.email || '').toLowerCase().trim()
        const itemName = String(item.assigned_to || item.assignedTo || item.executive || '').toLowerCase().trim()
        const itemId = String(item.user_id || item.userId || item.executive_id || '').trim()
        const itemCode = String(item.employee_code || item.employee_id || item.employeeId || '').toLowerCase().trim()
        const execCode = String(exec.employee_code || exec.employee_id || '').toLowerCase().trim()

        if (execEmail && itemEmail === execEmail) return true
        if (execId && itemId === execId) return true
        if (execCode && itemCode === execCode) return true
        if (execName && (itemName.includes(execName) || execName.includes(itemName))) return true
        return false
      }

      // Executive's filtered items
      // Executive's filtered items (excluding converted/won/customer leads to match active leads page)
      const execLeads = filteredTeamLeads.filter(matchThisExec).filter((l) => {
        const status = String(l.status || "").toLowerCase();
        return !status.includes("converted") && !status.includes("customer") && !status.includes("won");
      })
      const execCustomers = filteredTeamCustomers.filter(matchThisExec)
      // Count of visit schedules (from leads page with status 'Visit Scheduled')
      const execVisits = filteredTeamLeads.filter(matchThisExec).filter((l) => {
        const status = String(l.status || "").toLowerCase();
        return status === "visit scheduled" || status === "visit_scheduled";
      })

      // Target for this executive
      const targetObj = allTargets.find(
        (t) => String(t.executive_email || '').toLowerCase().trim() === execEmail || String(t.executive_id || '').trim() === execId
      )
      const execTarget = targetObj ? parseFloat(targetObj.target_amount) : 500000

      // Revenue generated (same logic as Executive's dashboard 'totalSeRevenue')
      let execRevenue = 0
      execCustomers.forEach((c) => {
        const valStr = c.contractValue || c.value || c.revenue || c.budget || "0"
        const val = typeof valStr === 'number' ? valStr : (parseFloat(String(valStr).replace(/[^\d.]/g, "")) || 0)
        execRevenue += val
      })
      const execAchievePct = execTarget > 0 ? Math.min(100, Math.round((execRevenue / execTarget) * 1000) / 10) : 0

      // Attendance status
      const attRecord = allAttendance.find(
        (a) => String(a.employee_id || a.employee_code || '').trim() === execId || String(a.email || '').toLowerCase().trim() === execEmail
      )
      const attStatus = attRecord ? (attRecord.status || 'Present') : 'Absent'

      return {
        id: exec.id || exec.employee_code,
        employee_code: exec.employee_code || exec.employee_id || 'EMP-100',
        name: exec.name || exec.full_name || 'Sales Executive',
        department: exec.department || exec.dept || 'Sales & BD',
        designation: exec.designation || exec.role || 'Sales Executive',
        phone: exec.phone || exec.mobile || '+91 98765 00000',
        email: exec.email || 'executive@tconnect.com',
        status: exec.status || 'Active',
        attendanceStatus: attStatus,
        leadsCount: execLeads.length,
        customersCount: execCustomers.length,
        visitsCount: execVisits.length,
        revenue: execRevenue,
        targetAmount: execTarget,
        achievementPct: execAchievePct,
        rawEmployee: exec,
      }
    })
  }, [assignedExecutives, filteredTeamLeads, filteredTeamCustomers, filteredTeamVisits, allTargets, allAttendance])

  // ── Fetch Revenue Breakdown for My Team Revenue Modal ──────────────────────
  const fetchRevenueBreakdown = async () => {
    try {
      setRevenueBreakdownLoading(true)
      const params = { mode: modalDateMode }
      if (modalDateMode === 'Custom') {
        if (modalCustomStart) params.start_date = modalCustomStart
        if (modalCustomEnd) params.end_date = modalCustomEnd
      }
      const res = await salesAPI.getTeamRevenueBreakdown(params)
      const breakdown = res.data || res || null
      setRevenueBreakdownData(breakdown)
    } catch (err) {
      console.warn('Backend team revenue breakdown fetch notice, using local fallback:', err)
      const fallbackExecs = executiveMetricsList.map((e) => ({
        employee_id: e.employee_code || e.id,
        employee_code: e.employee_code || e.id,
        name: e.name,
        email: e.email,
        revenue: e.revenue,
        incentive: Math.round(e.revenue * 0.05),
        deals_count: e.leadsCount + e.customersCount,
      }))
      const sumRev = fallbackExecs.reduce((acc, curr) => acc + (curr.revenue || 0), 0)
      const sumInc = fallbackExecs.reduce((acc, curr) => acc + (curr.incentive || 0), 0)
      const fmtDate = (d) => d ? d.toISOString().slice(0, 10) : ''
      setRevenueBreakdownData({
        manager_id: managerId,
        manager_name: managerName,
        period: {
          mode: dateFilterMode,
          start_date: fmtDate(activeDateRange.start),
          end_date: fmtDate(activeDateRange.end),
        },
        executives: fallbackExecs,
        total_revenue: sumRev,
        total_incentive: sumInc,
        incentive_rate_pct: 5.0,
      })
    } finally {
      setRevenueBreakdownLoading(false)
    }
  }

  useEffect(() => {
    if (!showRevenueBreakdownModal) return
    // For Custom mode, only auto-fetch when both dates are filled
    if (modalDateMode === 'Custom' && (!modalCustomStart || !modalCustomEnd)) return
    fetchRevenueBreakdown()
  }, [modalDateMode, modalCustomStart, modalCustomEnd, showRevenueBreakdownModal])

  // Filtered by Search Query
  const displayedExecutives = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return executiveMetricsList
    return executiveMetricsList.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.phone.includes(q)
    )
  }, [executiveMetricsList, searchQuery])

  // Deduplicated Team Leads (avoids showing duplicates from double-clicks)
  const deduplicatedTeamLeads = useMemo(() => {
    const seen = new Set()
    return filteredTeamLeads.filter((lead) => {
      if (!lead) return false
      const exec = String(lead.assigned_to || lead.assignedTo || lead.executive || '').toLowerCase().trim()
      const client = String(lead.contact_person || lead.contact_name || lead.person || '').toLowerCase().trim()
      const company = String(lead.company_name || lead.company || '').toLowerCase().trim()
      const product = String(lead.title || lead.product || lead.product_name || '').toLowerCase().trim()

      const key = `${exec}|${client}|${company}|${product}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [filteredTeamLeads])

  // Leads Filtered by Current Selected Tab (Hot, Warm, Cold)
  const leadsByTab = useMemo(() => {
    const getLeadCat = (lead) => {
      const cat = String(lead.category || lead.priority || lead.status || '').toLowerCase().trim()
      if (cat.includes('hot') || cat.includes('high') || cat === 'won' || cat === 'converted') return 'hot'
      if (cat.includes('warm') || cat.includes('medium')) return 'warm'
      return 'cold'
    }
    const target = leadTab.toLowerCase().trim()
    return deduplicatedTeamLeads.filter((lead) => getLeadCat(lead) === target)
  }, [deduplicatedTeamLeads, leadTab])

  // ── 6. ADD SALES TARGET HANDLER ─────────────────────────────────────────────
  const handleCreateTarget = async (e) => {
    e.preventDefault()
    if (!targetForm.executive_id) {
      showToast('Please select a Sales Executive.', 'error')
      return
    }

    const selectedExec = assignedExecutives.find(
      (ex) => String(ex.id || ex.employee_code) === String(targetForm.executive_id)
    )

    try {
      const payload = {
        manager_id: managerId,
        manager_name: managerName,
        manager_email: managerEmail,
        executive_id: targetForm.executive_id,
        executive_code: selectedExec?.employee_code || selectedExec?.employee_id || 'EMP-100',
        executive_name: selectedExec?.name || selectedExec?.full_name || 'Sales Executive',
        executive_email: selectedExec?.email || '',
        target_amount: Number(targetForm.target_amount) || 500000,
        period: targetForm.period,
        start_date: targetForm.start_date,
        end_date: targetForm.end_date,
        notes: targetForm.notes,
        status: 'Active',
      }

      const res = await salesAPI.createTarget(payload)
      setAllTargets((prev) => [res, ...prev.filter((t) => t.id !== res.id)])
      setShowAddTargetModal(false)
      showToast(`🎯 Sales target of ₹${Number(targetForm.target_amount).toLocaleString('en-IN')} assigned to ${payload.executive_name}! Saved to Supabase.`, 'success')
    } catch (err) {
      console.error(err)
      showToast('Error saving target to Supabase.', 'error')
    }
  }

  // ── Quick Actions Data ──────────────────────────────────────────────────────
  const quickActions = [
    {
      title: 'View My Executives',
      desc: `${assignedExecutives.length} assigned members`,
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-400',
      iconBg: 'bg-blue-200 text-blue-700',
      action: () => {
        setActiveSection('executives')
        setTimeout(() => {
          const el = document.getElementById('executives-section')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      },
    },
    {
      title: 'Attendance',
      desc: 'Live biometric & field check-ins',
      icon: Clock,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400',
      iconBg: 'bg-emerald-200 text-emerald-700',
      action: () => navigate('/manager/attendance'),
    },
    {
      title: 'Add Sales Target',
      desc: 'Set revenue quota in Supabase',
      icon: Target,
      color: 'bg-mgr-primary-50 text-mgr-primary-700 border-mgr-primary-200 hover:bg-mgr-primary-100 hover:border-mgr-primary-400',
      iconBg: 'bg-mgr-primary-200 text-mgr-primary-700',
      action: () => {
        setActiveSection('targets')
        setShowAddTargetModal(true)
      },
    },
    {
      title: 'View Reports',
      desc: 'Analytics & EOD reports',
      icon: FileText,
      color: 'bg-mgr-secondary-50 text-mgr-secondary-700 border-mgr-secondary-200 hover:bg-mgr-secondary-100 hover:border-mgr-secondary-400',
      iconBg: 'bg-mgr-secondary-200 text-mgr-secondary-700',
      action: () => navigate('/manager/reports'),
    },
  ]

  return (
    <div className="space-y-5 font-sans text-slate-900 bg-slate-50/50 min-h-screen pb-16">
      {/* ── 1. COMPACT HERO GREETING & GLOBAL DATE FILTER ─────────────────── */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Manager Overview
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Track performance, attendance, won revenue, and sales quotas for your assigned sales team.
          </p>
        </div>

        {/* Global Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            selectedMode={dateFilterMode}
            onChangeMode={(mode) => setDateFilterMode(mode)}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onApplyCustom={(s, e) => {
              setCustomStartDate(s)
              setCustomEndDate(e)
              setDateFilterMode('Custom')
            }}
            onClear={() => {
              setDateFilterMode('This Month')
              setCustomStartDate('')
              setCustomEndDate('')
            }}
          />

          <button
            type="button"
            onClick={handleRefresh}
            className="mgr-card p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-mgr-primary-600' : ''} />
          </button>
        </div>
      </div>

      {/* ── 2. COMPACT, SIMPLE KPI CARDS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Revenue — Clickable Drill-down */}
        <div
          onClick={() => { setShowRevenueBreakdownModal(true); fetchRevenueBreakdown() }}
          className="mgr-card bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between space-y-2 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-sm transition cursor-pointer group"
          title="Click to view My Team Revenue breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Team Revenue (total revenue generated)</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <IndianRupee size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-emerald-900 tracking-tight">
              ₹{totalTeamRevenue.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
              <TrendingUp size={11} /> Click for Team Drill-down 📊
            </span>
          </div>
        </div>

        {/* Card 2: Total Leads */}
        <div
          onClick={() => setActiveSection(activeSection === 'leads' ? null : 'leads')}
          className={`mgr-card p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between space-y-2 transition cursor-pointer border ${
            activeSection === 'leads'
              ? 'bg-violet-100 border-violet-500 ring-2 ring-violet-400/30'
              : 'bg-violet-50 border-violet-200 hover:bg-violet-100 hover:border-violet-400 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-violet-700 uppercase tracking-wider">Total Leads</span>
            <div className="w-6 h-6 rounded-lg bg-violet-200 text-violet-700 flex items-center justify-center font-bold">
              <Layers size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-violet-900 tracking-tight">
              {deduplicatedTeamLeads.length}
            </div>
            <span className="text-[10px] font-bold text-violet-600 mt-0.5 block">
              In Selected Period (Click to View)
            </span>
          </div>
        </div>

        {/* Card 3: Total Customers */}
        <div className="mgr-card bg-teal-50 border border-teal-200 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between space-y-2 hover:bg-teal-100 hover:border-teal-400 hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-teal-700 uppercase tracking-wider">Customers</span>
            <div className="w-6 h-6 rounded-lg bg-teal-200 text-teal-700 flex items-center justify-center font-bold">
              <Building2 size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-teal-900 tracking-tight">
              {filteredTeamCustomers.length}
            </div>
            <span className="text-[10px] font-bold text-teal-600 mt-0.5 block">
              Active Client Accounts
            </span>
          </div>
        </div>

        {/* Card 4: Visits */}
        <div
          onClick={() => setActiveSection(activeSection === 'visits' ? null : 'visits')}
          className={`mgr-card p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between space-y-2 transition cursor-pointer border ${
            activeSection === 'visits'
              ? 'bg-rose-100 border-rose-500 ring-2 ring-rose-400/30'
              : 'bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-400 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-rose-700 uppercase tracking-wider">Field Visits</span>
            <div className="w-6 h-6 rounded-lg bg-rose-200 text-rose-700 flex items-center justify-center font-bold">
              <MapPin size={13} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-rose-900 tracking-tight">
              {filteredTeamVisits.length}
            </div>
            <span className="text-[10px] font-bold text-rose-600 mt-0.5 block">
              In Selected Period (Click to View)
            </span>
          </div>
        </div>

        {/* Card 5: Target Achievement */}
      </div>

      {/* ── 3. QUICK ACTIONS BAR ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={13} className="text-mgr-primary-600" /> Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {quickActions.map((qa) => {
            const Icon = qa.icon
            return (
              <button
                key={qa.title}
                type="button"
                onClick={qa.action}
                className={`mgr-card p-3 rounded-2xl border transition text-left flex flex-col justify-between gap-2 cursor-pointer shadow-2xs hover:shadow-sm hover:scale-[1.02] ${qa.color}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${qa.iconBg}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-xs font-black leading-tight">{qa.title}</div>
                  <div className="text-[10px] font-semibold opacity-70 mt-0.5 truncate">{qa.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 4. SALES TARGET PROGRESS CARD ────────────────────────────────── */}
      {activeSection === 'targets' && (
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-2xs space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-mgr-primary-500 text-white flex items-center justify-center font-bold shadow-2xs">
                <Target size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  Team Sales Target & Quota Performance
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Supabase sales.sales_target
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Dynamic target tracking for {assignedExecutives.length} assigned sales executives.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddTargetModal(true)}
                className="mgr-card px-3 py-1.5 rounded-xl bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Plus size={13} /> Add Sales Target
              </button>
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="mgr-card p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer border border-transparent"
                title="Close section"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 4-Column Target Metrics Display */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Target</span>
              <span className="text-sm sm:text-base font-black text-slate-900 mt-0.5 block">
                ₹{teamTargetsSummary.target.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Achieved Revenue</span>
              <span className="text-sm sm:text-base font-black text-emerald-900 mt-0.5 block">
                ₹{teamTargetsSummary.achieved.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-mgr-primary-50/60 rounded-xl border border-mgr-primary-200">
              <span className="text-[10px] font-black text-mgr-primary-800 uppercase tracking-wider block">Remaining Quota</span>
              <span className="text-sm sm:text-base font-black text-mgr-primary-950 mt-0.5 block">
                ₹{teamTargetsSummary.remaining.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">Achievement %</span>
              <span className="text-sm sm:text-base font-black text-blue-950 mt-0.5 block">
                {teamTargetsSummary.achievementPct}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-gradient-to-r from-mgr-primary-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, teamTargetsSummary.achievementPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>0%</span>
              <span>Target Achieved: {teamTargetsSummary.achievementPct}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4b. DYNAMIC LEADS DETAILS SECTION ─────────────────────────────── */}
      {activeSection === 'leads' && (
        <div id="leads-section" className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden space-y-4 p-4 sm:p-5 animate-in fade-in duration-200">
          <div className="relative flex items-center justify-center border-b border-slate-100 pb-3">
            {/* Center Toggles */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              {[
                { name: 'Hot', color: 'bg-emerald-600 text-white shadow-xs' },
                { name: 'Warm', color: 'bg-yellow-500 text-yellow-950 shadow-xs' },
                { name: 'Cold', color: 'bg-rose-600 text-white shadow-xs' }
              ].map((t) => {
                const active = leadTab === t.name
                const getLeadCat = (l) => {
                  const cat = String(l.category || l.priority || l.status || '').toLowerCase().trim()
                  if (cat.includes('hot') || cat.includes('high') || cat === 'won' || cat === 'converted') return 'hot'
                  if (cat.includes('warm') || cat.includes('medium')) return 'warm'
                  return 'cold'
                }
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setLeadTab(t.name)}
                    className={`mgr-card px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${active ? t.color : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t.name} ({
                      deduplicatedTeamLeads.filter((l) => getLeadCat(l) === t.name.toLowerCase()).length
                    })
                  </button>
                )
              })}
            </div>

            {/* Absolute close button on the right */}
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="mgr-card absolute right-0 p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer border border-transparent"
              title="Close section"
            >
              <X size={15} />
            </button>
          </div>

          {/* Leads Table */}
          {leadsByTab.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold space-y-2">
              <AlertCircle size={32} className="mx-auto text-slate-300" />
              <p className="text-xs">No {leadTab} leads found in the selected date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Executive Name</th>
                    <th className="py-3 px-3">Client Name & Company</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {leadsByTab.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatDate(lead.created_at || lead.createdAt || lead.date)}
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-bold">
                        👤 {lead.assigned_to || lead.assignedTo || lead.executive || 'Unassigned'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {lead.contact_name || lead.contact_person || lead.person || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          🏢 {lead.company_name || lead.company || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        📦 {lead.title || lead.product || 'CRM Software'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium max-w-xs truncate" title={lead.notes || lead.remarks}>
                        {lead.notes || lead.remarks || 'No remarks recorded.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 4c. DYNAMIC VISITS DETAILS SECTION ─────────────────────────────── */}
      {activeSection === 'visits' && (
        <div id="visits-section" className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden space-y-4 p-4 sm:p-5 animate-in fade-in duration-200">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-2xs">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  Team Field Visits Overview
                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    Live Telemetry
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Visits scheduled or logged by your assigned sales representatives.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pr-8">
              {/* Search Bar */}
              <div className="relative w-48 sm:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search visits, SE, client, product..."
                  value={visitSearch}
                  onChange={(e) => setVisitSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-950 focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-semibold"
                />
              </div>

              {/* Today Toggle Pill */}
              <button
                type="button"
                onClick={() => setVisitTodayOnly(!visitTodayOnly)}
                className={`mgr-card h-9 px-4 rounded-xl text-xs font-black transition cursor-pointer border flex items-center gap-1.5 ${visitTodayOnly
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                <Clock size={13} />
                Today
              </button>
            </div>

            {/* Absolute close button on the right */}
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="mgr-card absolute right-0 top-0 p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer border border-transparent"
              title="Close section"
            >
              <X size={15} />
            </button>
          </div>

          {/* Visits Table */}
          {displayedVisits.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold space-y-2">
              <AlertCircle size={32} className="mx-auto text-slate-300 animate-pulse" />
              <p className="text-xs">No visits found matching the filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date of Visit Scheduled</th>
                    <th className="py-3 px-4">Name of Executive</th>
                    <th className="py-3 px-4">Client Name & Company Name</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {displayedVisits.map((v) => {
                    const vDateStr = v.visit_date || v.visitDate || v.date || v.created_at
                    const formattedDate = formatDate(vDateStr)
                    const timeStr = v.visit_time || v.time || ''
                    return (
                      <tr key={v.id || v.visit_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formattedDate} {timeStr && `• ${timeStr}`}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-bold">
                          👤 {v.assigned_to || v.executive || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {v.poc_name || v.contact_person || v.person || 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            🏢 {v.customer_name || v.company || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          📦 {v.product || v.product_name || v.title || 'CRM Software'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          📍 {v.location || v.city || v.address || 'Chennai'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 5. ASSIGNED SALES EXECUTIVES DETAILS TABLE ─────────────────────── */}
      {activeSection === 'executives' && (
        <div id="executives-section" className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden space-y-3 p-4 sm:p-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                Assigned Sales Executives ({displayedExecutives.length})
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Live data scoped strictly from Admin HRMS reporting manager assignments.
              </p>
            </div>

            {/* Search Input & Close Action */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search executive, code, dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="mgr-card p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer border border-transparent"
                title="Close section"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {displayedExecutives.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold space-y-2">
              <AlertCircle size={32} className="mx-auto text-slate-300" />
              <p className="text-xs">No Sales Executives assigned under your profile in HRMS.</p>
              <p className="text-[10px] text-slate-400">
                When Admin assigns an executive to your reporting manager account, they will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Executive</th>
                    <th className="py-3 px-3">Contact & Dept</th>
                    <th className="py-3 px-3">Attendance</th>
                    <th className="py-3 px-3 text-center">Leads</th>
                    <th className="py-3 px-3 text-center">Customers</th>
                    <th className="py-3 px-3 text-center">Visits</th>
                    <th className="py-3 px-3 text-right">Won Revenue</th>
                    <th className="py-3 px-3 text-right">Target %</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {displayedExecutives.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-50/80 transition">
                      {/* Executive */}
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900 text-xs">{exec.name}</div>
                        <div className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md inline-block mt-0.5">
                          🪪 {exec.employee_code}
                        </div>
                      </td>

                      {/* Contact & Dept */}
                      <td className="py-3 px-3">
                        <div className="text-[11px] font-bold text-slate-800">{exec.phone}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{exec.department} · {exec.designation}</div>
                      </td>

                      {/* Attendance */}
                      <td className="py-3 px-3">
                        {exec.attendanceStatus.toLowerCase().includes('absent') ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {exec.attendanceStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {exec.attendanceStatus}
                          </span>
                        )}
                      </td>

                      {/* Leads */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {exec.leadsCount}
                      </td>

                      {/* Customers */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {exec.customersCount}
                      </td>

                      {/* Visits */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {exec.visitsCount}
                      </td>

                      {/* Won Revenue */}
                      <td className="py-3 px-3 text-right font-black text-emerald-700">
                        ₹{exec.revenue.toLocaleString('en-IN')}
                      </td>

                      {/* Target % */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-slate-900 text-xs">{exec.achievementPct}%</div>
                        <div className="text-[9px] text-slate-400">of ₹{(exec.targetAmount / 100000).toFixed(1)}L</div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedExecutiveDetail(exec)}
                          className="mgr-card px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-extrabold text-[11px] inline-flex items-center gap-1 border border-slate-200 transition cursor-pointer"
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 6. ADD SALES TARGET MODAL ─────────────────────────────────────── */}
      {showAddTargetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-mgr-primary-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Target size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Sales Quota / Target</h3>
                  <p className="text-xs text-slate-500 font-semibold">Persists directly to Supabase sales.sales_target</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTargetModal(false)}
                className="mgr-card p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTarget} className="space-y-3.5 text-xs font-semibold">
              {/* Sales Executive Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Select Sales Executive <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetForm.executive_id}
                  onChange={(e) => setTargetForm({ ...targetForm, executive_id: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mgr-primary-500"
                  required
                >
                  <option value="">-- Choose Assigned Executive --</option>
                  {assignedExecutives.map((ex) => (
                    <option key={ex.id || ex.employee_code} value={ex.id || ex.employee_code}>
                      {ex.name || ex.full_name} ({ex.employee_code || ex.employee_id || 'EMP'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Amount */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Target Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  value={targetForm.target_amount}
                  onChange={(e) => setTargetForm({ ...targetForm, target_amount: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mgr-primary-500"
                  required
                />
              </div>

              {/* Target Period & Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Period</label>
                  <select
                    value={targetForm.period}
                    onChange={(e) => setTargetForm({ ...targetForm, period: e.target.value })}
                    className="w-full h-9 px-2 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mgr-primary-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={targetForm.start_date}
                    onChange={(e) => setTargetForm({ ...targetForm, start_date: e.target.value })}
                    className="w-full h-9 px-2 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mgr-primary-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={targetForm.end_date}
                    onChange={(e) => setTargetForm({ ...targetForm, end_date: e.target.value })}
                    className="w-full h-9 px-2 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mgr-primary-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Optional Notes / Key Deliverables</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focus on enterprise CRM conversion and GPS fleet onboarding..."
                  value={targetForm.notes}
                  onChange={(e) => setTargetForm({ ...targetForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-mgr-primary-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTargetModal(false)}
                  className="mgr-card px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgr-card px-4 py-2 rounded-xl bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Target size={14} /> Save Target in Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. EXECUTIVE DETAILS AUDIT MODAL ──────────────────────────────── */}
      {selectedExecutiveDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedExecutiveDetail.name}</h3>
                <p className="text-xs text-blue-600 font-bold">
                  {selectedExecutiveDetail.employee_code} · {selectedExecutiveDetail.designation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExecutiveDetail(null)}
                className="mgr-card p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Phone</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedExecutiveDetail.phone}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Email</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">{selectedExecutiveDetail.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-200 text-center">
                  <span className="text-[10px] font-black text-violet-700 uppercase">Leads</span>
                  <p className="text-sm font-black text-violet-950 mt-0.5">{selectedExecutiveDetail.leadsCount}</p>
                </div>
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-center">
                  <span className="text-[10px] font-black text-teal-700 uppercase">Customers</span>
                  <p className="text-sm font-black text-teal-950 mt-0.5">{selectedExecutiveDetail.customersCount}</p>
                </div>
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-center">
                  <span className="text-[10px] font-black text-rose-700 uppercase">Visits</span>
                  <p className="text-sm font-black text-rose-950 mt-0.5">{selectedExecutiveDetail.visitsCount}</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-800 uppercase">Won Sales Generated</span>
                  <p className="text-base font-black text-emerald-950">₹{selectedExecutiveDetail.revenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-800 uppercase">Target Achievement</span>
                  <p className="text-base font-black text-emerald-950">{selectedExecutiveDetail.achievementPct}%</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedExecutiveDetail(null)}
                className="mgr-card px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MY TEAM REVENUE BREAKDOWN MODAL ──────────────────────────────── */}
      {showRevenueBreakdownModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowRevenueBreakdownModal(false) }}>
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-sm shrink-0">
                  <IndianRupee size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">My Team Revenue</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Revenue &amp; incentive breakdown by Sales Executive
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRevenueBreakdownModal(false)}
                className="mgr-card p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Date Filter Bar */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Today', 'This Week', 'This Month', 'Custom'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setModalDateMode(m); if (m !== 'Custom') setModalCustomStart(''); if (m !== 'Custom') setModalCustomEnd('') }}
                    className={`mgr-card px-3 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer border ${
                      modalDateMode === m
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {modalDateMode === 'Custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider shrink-0">From</label>
                    <input
                      type="date"
                      value={modalCustomStart}
                      onChange={(e) => setModalCustomStart(e.target.value)}
                      className="mgr-card px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider shrink-0">To</label>
                    <input
                      type="date"
                      value={modalCustomEnd}
                      onChange={(e) => setModalCustomEnd(e.target.value)}
                      className="mgr-card px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchRevenueBreakdown}
                    disabled={!modalCustomStart || !modalCustomEnd}
                    className="mgr-card px-3 py-1.5 rounded-xl text-[11px] font-black bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              )}
              {revenueBreakdownData?.period?.start_date && (
                <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <Calendar size={11} className="text-mgr-primary-500" />
                  Showing: <strong className="text-slate-600 ml-0.5">{revenueBreakdownData.period.start_date}</strong>
                  <span className="text-slate-300">→</span>
                  <strong className="text-slate-600">{revenueBreakdownData.period.end_date}</strong>
                </p>
              )}
            </div>

            {/* Content */}
            {revenueBreakdownLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Fetching team revenue &amp; incentive breakdown...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                    <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">Total Team Revenue Generated</span>
                    <p className="text-2xl font-black text-emerald-950 mt-1">₹{(revenueBreakdownData?.total_revenue || 0).toLocaleString('en-IN')}</p>
                    <span className="text-[11px] text-emerald-700 block mt-0.5">Sum of all assigned executive revenues</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-mgr-secondary-50 to-purple-50 border border-mgr-secondary-200">
                    <span className="text-[10px] font-black text-mgr-secondary-900 uppercase tracking-wider block">Total Executive Incentive (5%)</span>
                    <p className="text-2xl font-black text-mgr-secondary-950 mt-1">₹{(revenueBreakdownData?.total_incentive || 0).toLocaleString('en-IN')}</p>
                    <span className="text-[11px] text-mgr-secondary-700 block mt-0.5">Standard 5% commission on generated sales</span>
                  </div>
                </div>

                {/* Executive Table */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  {(!revenueBreakdownData?.executives || revenueBreakdownData.executives.length === 0) ? (
                    <div className="p-10 text-center">
                      <div className="text-3xl mb-2">📊</div>
                      <p className="text-sm font-bold text-slate-500">No Sales Executives assigned or no revenue for this period.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3 px-4 text-left">#</th>
                            <th className="py-3 px-4 text-left">Sales Executive</th>
                            <th className="py-3 px-4 text-right">Revenue Generated</th>
                            <th className="py-3 px-4 text-right text-emerald-700">Incentive (5%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {revenueBreakdownData.executives.map((exec, idx) => (
                            <tr key={exec.employee_id || idx} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-3.5 px-4">
                                <div className="font-black text-slate-900">{exec.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">{exec.employee_code || exec.employee_id}</span>
                                  {exec.email && <span className="text-[11px] text-slate-400 truncate max-w-[160px]">{exec.email}</span>}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">₹{(exec.revenue || 0).toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4 text-right font-black text-emerald-700 whitespace-nowrap">₹{(exec.incentive || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                          <tr className="font-black text-sm text-slate-800">
                            <td className="py-3.5 px-4" colSpan={2}>
                              <span className="text-[10px] uppercase tracking-widest text-slate-600 font-black">TOTAL REVENUE GENERATED</span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-950 whitespace-nowrap">₹{(revenueBreakdownData?.total_revenue || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 text-right text-emerald-800 whitespace-nowrap">₹{(revenueBreakdownData?.total_incentive || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowRevenueBreakdownModal(false)}
                className="mgr-card px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer"
              >
                Close Revenue View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
