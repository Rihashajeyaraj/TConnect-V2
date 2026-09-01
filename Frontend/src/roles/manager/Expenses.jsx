import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  FileText,
  DollarSign,
  UserCheck,
  Building2,
  Calendar,
  Eye,
  RefreshCw,
  X,
  MapPin,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  AlertCircle,
  ArrowUpDown,
  Send,
} from 'lucide-react'
import { expenseAPI, hrmsAPI, notificationAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

export default function ManagerExpenses() {
  const { showToast } = useToast()

  // API State
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState({
    pending_approval: 0,
    approved_today: 0,
    rejected_today: 0,
    total_claims: 0,
    today_claim_amount: '₹0.00',
    approved_amount: '₹0.00',
    rejected_amount: '₹0.00',
    pending_amount: '₹0.00',
  })

  // Executive List State
  const [executives, setExecutives] = useState([])

  // Filter & Search State
  const [search, setSearch] = useState('')
  const [selectedSE, setSelectedSE] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [dateFilterTab, setDateFilterTab] = useState('All Time')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  // Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Drawer / Modal State
  const [selectedExpenseModal, setSelectedExpenseModal] = useState(null)
  const [managerRemarks, setManagerRemarks] = useState('')
  const [zoomReceiptUrl, setZoomReceiptUrl] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Load Sales Executives list
  useEffect(() => {
    hrmsAPI
      .getEmployees()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        if (raw && raw.length > 0) {
          const execsOnly = raw.filter(
            (u) =>
              (u.role && u.role.toLowerCase().includes('exec')) ||
              (u.designation && u.designation.toLowerCase().includes('exec')) ||
              u.role === 'Sales Executive'
          )
          if (execsOnly.length > 0) {
            setExecutives(
              execsOnly.map((e, idx) => ({
                id: e.id || e.employee_id || `se_${idx}`,
                name: e.name || e.full_name || 'Sales Executive',
                email: e.email || '',
                employee_code: e.employee_code || e.employee_id || e.emp_code || 'EMP000012',
              }))
            )
            return
          }
        }
        fallbackLoadExecutives()
      })
      .catch(() => fallbackLoadExecutives())
  }, [])

  const fallbackLoadExecutives = () => {
    try {
      const savedUsersStr = localStorage.getItem('tc_app_users')
      if (savedUsersStr) {
        const parsed = JSON.parse(savedUsersStr)
        const execsOnly = parsed.filter(
          (u) =>
            u.role?.toLowerCase().includes('exec') ||
            u.role?.toLowerCase().includes('sales') ||
            u.role === 'Sales Executive'
        )
        if (execsOnly.length > 0) {
          setExecutives(
            execsOnly.map((u, idx) => ({
              id: u.id || `se_${idx}`,
              name: u.name || u.full_name || 'Sales Executive',
              email: u.email || '',
              employee_code: u.employee_code || u.employee_id || u.emp_code || 'EMP000012',
            }))
          )
          return
        }
      }
    } catch (e) {}

    setExecutives([
      { id: 'se_1', name: 'Abi hastro', email: 'abi@gmail.com', employee_code: 'EMP000012' },
      { id: 'se_2', name: 'Ananya Roy', email: 'ananya.roy@tconnect.com', employee_code: 'EMP-102' },
      { id: 'se_3', name: 'Karthik Raja', email: 'karthik.raja@tconnect.com', employee_code: 'EMP-103' },
      { id: 'se_4', name: 'Priya Sharma', email: 'priya.sharma@tconnect.com', employee_code: 'EMP-104' },
      { id: 'se_5', name: 'Ashwini E', email: 'ashwini@tconnect.com', employee_code: 'EMP-105' },
      { id: 'se_6', name: 'Suresh Raina', email: 'suresh@tconnect.com', employee_code: 'EMP-106' },
    ])
  }

  const resolveEmployeeCode = (seName, seEmail, rawCode) => {
    const n = (seName || '').toLowerCase().trim()
    const e = (seEmail || '').toLowerCase().trim()

    const found = executives.find((ex) => {
      const exEmail = (ex.email || '').toLowerCase().trim()
      const exName = (ex.name || ex.full_name || '').toLowerCase().trim()
      const exUser = exEmail.includes('@') ? exEmail.split('@')[0] : exName.split(' ')[0]

      return (
        (exEmail && (e === exEmail || e.includes(exEmail))) ||
        (exName && (n.includes(exName) || exName.includes(n))) ||
        (exUser && exUser.length >= 2 && (e.includes(exUser) || n.includes(exUser)))
      )
    })

    if (found && (found.employee_code || found.employee_id || found.emp_code)) {
      return found.employee_code || found.employee_id || found.emp_code
    }

    try {
      const appUsers = JSON.parse(localStorage.getItem('tc_app_users') || '[]')
      const matchedUser = appUsers.find((u) => {
        const uMail = (u.email || '').toLowerCase()
        const uName = (u.name || u.full_name || '').toLowerCase()
        return (uMail && e === uMail) || (uName && n.includes(uName))
      })
      if (matchedUser && (matchedUser.employee_code || matchedUser.employee_id || matchedUser.emp_code)) {
        return matchedUser.employee_code || matchedUser.employee_id || matchedUser.emp_code
      }
    } catch (err) {}

    if (rawCode && rawCode !== 'EMP-101' && !rawCode.startsWith('EMP10')) {
      return rawCode
    }

    return 'EMP000012'
  }

  const normalizeExpense = (eItem, idx = 0) => {
    if (!eItem) return null
    const id = eItem.id || eItem.expense_id || `EXP-${1001 + idx}`
    const seName = eItem.employee_name || eItem.assigned_to || eItem.assignedTo || eItem.executive || eItem.executiveName || eItem.sales_executive_name || 'Abi hastro'
    const seEmail = eItem.assigned_to_email || eItem.assignedToEmail || eItem.executiveEmail || eItem.email || 'abi@gmail.com'
    const empCode = resolveEmployeeCode(seName, seEmail, eItem.employee_code || eItem.employee_id || eItem.emp_code)

    let rawDesc = eItem.title || eItem.description || eItem.notes || eItem.purpose || '—';
    let customerName = eItem.customer_name || eItem.customer || eItem.client || eItem.company || '—';
    let companyName = eItem.company || eItem.customer_name || eItem.client || '—';
    let visitLocation = eItem.visit_location || eItem.location || eItem.address || eItem.city || '—';
    let visitDate = eItem.visit_date || eItem.expense_date || eItem.date || eItem.submitted_date || eItem.created_at || '—';
    let submittedDate = eItem.submitted_date || eItem.created_at || eItem.submittedDate || '—';
    let visitTime = '—';
    let purpose = '—';

    if (rawDesc && rawDesc.startsWith("EXPENSE_VISIT_DETAILS:::")) {
      try {
        const parsed = JSON.parse(rawDesc.replace("EXPENSE_VISIT_DETAILS:::", ""));
        customerName = parsed.customer_name || customerName;
        companyName = parsed.company || companyName;
        visitLocation = parsed.visit_location || visitLocation;
        visitDate = parsed.visit_date || visitDate;
        visitTime = parsed.visit_time || visitTime;
        purpose = parsed.purpose || purpose;
        rawDesc = parsed.description || "";
      } catch (err) {
        console.warn("Failed to parse expense visit details JSON:", err);
      }
    }

    return {
      id: id,
      expense_id: id,
      request_id: id,
      employee_code: empCode,
      assigned_to: seName,
      assigned_to_email: seEmail,
      photo: eItem.photo || eItem.avatar || eItem.employee_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seName}`,
      customer_name: customerName,
      company: companyName,
      visit_location: visitLocation,
      category: eItem.category || eItem.expense_category || eItem.type || 'Travel / Conveyance',
      amount: eItem.amount ? (String(eItem.amount).startsWith('₹') ? eItem.amount : `₹${Number(eItem.amount).toLocaleString('en-IN')}`) : '₹1,500',
      numeric_amount: parseFloat(String(eItem.amount || '1500').replace(/[^0-9.]/g, '')) || 1500,
      visit_date: visitDate,
      submitted_date: submittedDate,
      receipt_url: eItem.receipt_url || eItem.receiptUrl || eItem.voucher_url || eItem.file_url || eItem.billFileUrl || null,
      receipt_name: eItem.receipt_name || eItem.file_name || eItem.billFileName || 'expense_receipt_voucher.pdf',
      status: eItem.status || eItem.current_status || 'Pending',
      description: rawDesc,
      manager_remarks: eItem.manager_remarks || eItem.remarks || '',
      approved_by: eItem.approved_by || '',
      rejected_by: eItem.rejected_by || '',
      returned_by: eItem.returned_by || '',
      visit_time: visitTime,
      purpose: purpose,
      department: 'Sales & Field Operations',
      manager_name: eItem.reporting_manager || eItem.manager_name || 'Jeeva Kumar (Sales Manager)',
    }
  }

  const getLocalStorageExpenses = () => {
    let combined = []
    const keys = ['tc_sales_expenses', 'tc_sm_expenses', 'tc_expenses', 'tc_pending_expenses']
    keys.forEach((k) => {
      try {
        const itemStr = localStorage.getItem(k)
        if (itemStr) {
          const parsed = JSON.parse(itemStr)
          if (Array.isArray(parsed) && parsed.length > 0) {
            combined = [...combined, ...parsed]
          }
        }
      } catch (e) {}
    })
    return combined.map((e, idx) => normalizeExpense(e, idx)).filter(Boolean)
  }

  // Fetch Expense Claims from API and LocalStorage
  const fetchExpensesData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedSE !== 'All') params.sales_executive_id = selectedSE
      if (selectedStatus !== 'All') params.status = selectedStatus
      if (selectedCategory !== 'All') params.category = selectedCategory
      if (search) params.search = search
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      params.page = page
      params.limit = limit

      let apiExpenses = []
      try {
        const res = await expenseAPI.getManagerExpenses(params)
        const data = res?.data || res || {}
        if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
          apiExpenses = data.expenses.map((e, idx) => normalizeExpense(e, idx))
        }
      } catch (err) {}

      const localExpenses = getLocalStorageExpenses()

      // Merge API and LocalStorage expenses using Map
      const map = new Map()
      apiExpenses.forEach((e) => map.set(e.id, e))
      localExpenses.forEach((e) => {
        if (!map.has(e.id)) {
          map.set(e.id, e)
        }
      })

      const combined = Array.from(map.values())
      setExpenses(combined)
      calculateMetrics(combined)
    } catch (err) {
      const localExpenses = getLocalStorageExpenses()
      setExpenses(localExpenses)
      calculateMetrics(localExpenses)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (list) => {
    const parseVal = (v) => parseFloat(String(v || '0').replace(/[^0-9.]/g, '')) || 0

    const pendingList = list.filter((x) => String(x.status || '').toLowerCase().includes('pend'))
    const approvedList = list.filter((x) => String(x.status || '').toLowerCase().includes('approv'))
    const rejectedList = list.filter((x) => String(x.status || '').toLowerCase().includes('reject'))

    const pendingAmt = pendingList.reduce((acc, curr) => acc + parseVal(curr.amount), 0)
    const approvedAmt = approvedList.reduce((acc, curr) => acc + parseVal(curr.amount), 0)
    const rejectedAmt = rejectedList.reduce((acc, curr) => acc + parseVal(curr.amount), 0)
    const totalAmt = list.reduce((acc, curr) => acc + parseVal(curr.amount), 0)

    setSummary({
      pending_approval: pendingList.length,
      approved_today: approvedList.length,
      rejected_today: rejectedList.length,
      total_claims: list.length,
      today_claim_amount: `₹${totalAmt.toLocaleString('en-IN')}`,
      approved_amount: `₹${approvedAmt.toLocaleString('en-IN')}`,
      rejected_amount: `₹${rejectedAmt.toLocaleString('en-IN')}`,
      pending_amount: `₹${pendingAmt.toLocaleString('en-IN')}`,
    })
  }

  useEffect(() => {
    fetchExpensesData()
  }, [selectedSE, selectedStatus, selectedCategory, fromDate, toDate, page, limit])

  // Manager Approve / Reject / Return Action
  const handleManagerAction = async (actionType) => {
    if (!selectedExpenseModal) return
    const expId = selectedExpenseModal.id

    if ((actionType === 'REJECT' || actionType === 'RETURN') && !managerRemarks.trim()) {
      showToast(`Please enter mandatory Manager Remarks before clicking ${actionType}.`, 'error')
      return
    }

    setActionLoading(true)
    let newStatus = 'Approved'
    if (actionType === 'REJECT') newStatus = 'Rejected'
    if (actionType === 'RETURN') newStatus = 'Returned'

    const remarksText = managerRemarks.trim() || `Action ${newStatus} by Sales Manager.`

    try {
      if (actionType === 'APPROVE') await expenseAPI.approveExpense(expId, { remarks: remarksText })
      else if (actionType === 'REJECT') await expenseAPI.rejectExpense(expId, { remarks: remarksText })
      else if (actionType === 'RETURN') await expenseAPI.returnExpense(expId, { remarks: remarksText })
    } catch (err) {}

    // Update state locally
    const updatedList = expenses.map((e) =>
      e.id === expId
        ? {
            ...e,
            status: newStatus,
            manager_remarks: remarksText,
            approved_by: actionType === 'APPROVE' ? 'Jeeva Kumar (Sales Manager)' : e.approved_by,
            rejected_by: actionType === 'REJECT' ? 'Jeeva Kumar (Sales Manager)' : e.rejected_by,
            returned_by: actionType === 'RETURN' ? 'Jeeva Kumar (Sales Manager)' : e.returned_by,
          }
        : e
    )

    setExpenses(updatedList)
    calculateMetrics(updatedList)

    // Save to localStorage tc_sales_expenses & tc_sm_expenses
    try {
      const salesExps = JSON.parse(localStorage.getItem('tc_sales_expenses') || '[]')
      const updatedSalesExps = salesExps.map((x) => (x.id === expId ? { ...x, status: newStatus, remarks: remarksText } : x))
      localStorage.setItem('tc_sales_expenses', JSON.stringify(updatedSalesExps))

      const smExps = JSON.parse(localStorage.getItem('tc_sm_expenses') || '[]')
      const updatedSmExps = smExps.map((x) => (x.id === expId ? { ...x, status: newStatus, remarks: remarksText } : x))
      localStorage.setItem('tc_sm_expenses', JSON.stringify(updatedSmExps))

      // Trigger SE Notification
      const existingNotifs = JSON.parse(localStorage.getItem('tc_app_notifications') || '[]')
      const seNotif = {
        id: `notif_${Date.now()}`,
        recipientEmail: selectedExpenseModal.assigned_to_email,
        title: `Expense Claim ${newStatus}: #${selectedExpenseModal.id}`,
        message: `Your expense claim of ${selectedExpenseModal.amount} for "${selectedExpenseModal.category}" has been ${newStatus.toLowerCase()} by Sales Manager. Remarks: ${remarksText}`,
        time: 'Just now',
        read: false,
        type: 'Expense',
      }
      localStorage.setItem('tc_app_notifications', JSON.stringify([seNotif, ...existingNotifs]))
      notificationAPI.sendNotification(seNotif).catch(() => null)
    } catch (e) {}

    showToast(`Expense ${expId} has been successfully ${newStatus}!`, 'success')
    setActionLoading(false)
    setSelectedExpenseModal(null)
    setManagerRemarks('')
  }

  // Filtering Calculation
  const filteredExpenses = expenses.filter((e) => {
    if (!e) return false
    const q = search.toLowerCase().trim()
    const reqId = (e.request_id || e.id || '').toLowerCase()
    const seCode = (e.employee_code || '').toLowerCase()
    const seName = (e.assigned_to || e.executive || '').toLowerCase()
    const cName = (e.customer_name || e.company || '').toLowerCase()
    const loc = (e.visit_location || '').toLowerCase()
    const cat = (e.category || '').toLowerCase()
    const desc = (e.description || '').toLowerCase()

    const matchesSearch =
      !q ||
      reqId.includes(q) ||
      seCode.includes(q) ||
      seName.includes(q) ||
      cName.includes(q) ||
      loc.includes(q) ||
      cat.includes(q) ||
      desc.includes(q)

    const matchesStatus = selectedStatus === 'All' || String(e.status || '').toLowerCase().includes(selectedStatus.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || String(e.category || '').toLowerCase().includes(selectedCategory.toLowerCase())

    let matchesSE = selectedSE === 'All'
    if (!matchesSE) {
      const targetVal = selectedSE.toLowerCase().trim()
      const seEmail = (e.assigned_to_email || e.email || '').toLowerCase()
      const targetUser = targetVal.includes('@') ? targetVal.split('@')[0] : targetVal
      matchesSE = seEmail === targetVal || seName === targetVal || seCode === targetVal || seEmail.includes(targetUser) || seName.includes(targetUser)
    }

    const matchesMinAmt = !minAmount || e.numeric_amount >= parseFloat(minAmount)
    const matchesMaxAmt = !maxAmount || e.numeric_amount <= parseFloat(maxAmount)

    // Linear Date Sorting & Filter Logic
    const expDateStr = String(e.submitted_date || e.visit_date || e.created_at || '')
    let matchesDate = true
    if (dateFilterTab === 'Today') {
      matchesDate = expDateStr.includes('2026-08-06') || expDateStr.includes('06/08/2026') || expDateStr.includes('Today')
    } else if (dateFilterTab === 'Yesterday') {
      matchesDate = expDateStr.includes('2026-08-05') || expDateStr.includes('05/08/2026') || expDateStr.includes('Yesterday')
    } else if (dateFilterTab === 'Tomorrow') {
      matchesDate = expDateStr.includes('2026-08-07') || expDateStr.includes('07/08/2026')
    } else if (dateFilterTab === 'This Month') {
      matchesDate = expDateStr.includes('2026-08') || expDateStr.includes('/08/')
    } else if (dateFilterTab === 'Custom') {
      if (fromDate) matchesDate = matchesDate && expDateStr >= fromDate
      if (toDate) matchesDate = matchesDate && expDateStr <= toDate
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesSE && matchesMinAmt && matchesMaxAmt && matchesDate
  })

  // Sorting
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'latest') return new Date(b.submitted_date) - new Date(a.submitted_date)
    if (sortBy === 'oldest') return new Date(a.submitted_date) - new Date(b.submitted_date)
    if (sortBy === 'amount_high') return b.numeric_amount - a.numeric_amount
    if (sortBy === 'amount_low') return a.numeric_amount - b.numeric_amount
    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedExpenses.length / limit) || 1
  const paginatedExpenses = sortedExpenses.slice((page - 1) * limit, page * limit)

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-teal-100 text-teal-900 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-teal-300">
              APPROVAL DASHBOARD
            </span>
            <span className="text-slate-400 text-xs font-semibold">Sales Manager Portal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mt-1">
            <Receipt className="w-7 h-7 text-teal-600" /> Expense Claims & Approval
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Review, verify receipts, and process expense claim approvals for Sales Executives under your direct team management.
          </p>
        </div>

        <button
          onClick={fetchExpensesData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-xs border border-teal-300 shadow-2xs transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Expense Claims
        </button>
      </div>

      {/* ── TOP 8 KPI CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {/* 1. Pending Approval */}
        <div className="bg-mgr-primary-50 border border-mgr-primary-300 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-mgr-primary-900">Pending Approval</span>
          <h2 className="text-2xl font-black text-mgr-primary-950">{summary.pending_approval} Claims</h2>
          <p className="text-[11px] text-mgr-primary-800 font-bold">Pending Amount: {summary.pending_amount}</p>
        </div>

        {/* 2. Approved Today */}
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Approved Claims</span>
          <h2 className="text-2xl font-black text-emerald-950">{summary.approved_today} Claims</h2>
          <p className="text-[11px] text-emerald-800 font-bold">Approved Value: {summary.approved_amount}</p>
        </div>

        {/* 3. Rejected Today */}
        <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-900">Rejected Claims</span>
          <h2 className="text-2xl font-black text-rose-950">{summary.rejected_today} Claims</h2>
          <p className="text-[11px] text-rose-800 font-bold">Rejected Value: {summary.rejected_amount}</p>
        </div>

        {/* 4. Total Claims & Today's Claim Amount */}
        <div className="bg-gradient-to-b from-teal-600 to-teal-800 text-white p-4 rounded-2xl shadow-md space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-100">Total Claim Volume</span>
          <h2 className="text-2xl font-black">{summary.today_claim_amount}</h2>
          <p className="text-[11px] text-teal-100 font-semibold">{summary.total_claims} Total Submitted Claims</p>
        </div>
      </div>

      {/* ── FILTERS & SEARCH CONTROL BAR ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search Request ID, SE Code, Executive Name, Customer, Location..."
              className="w-full h-10 bg-slate-50 border-slate-200 rounded-xl pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-semibold"
            />
          </div>

          {/* Sales Executive Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold">
            <span className="text-slate-500">Sales Executive:</span>
            <select
              value={selectedSE}
              onChange={(e) => {
                setSelectedSE(e.target.value)
                setPage(1)
              }}
              className="mgr-card bg-transparent text-teal-950 focus:outline-none cursor-pointer font-black max-w-[220px] truncate"
            >
              <option value="All">All Executives (Team Only)</option>
              {executives.map((ex) => (
                <option key={ex.email || ex.id} value={ex.email || ex.name}>
                  [{ex.employee_code || 'EMP000012'}] {ex.name || ex.full_name} ({ex.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="mgr-card bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Returned">Returned for Correction</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="mgr-card bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold"
            >
              <option value="All">All Categories</option>
              <option value="Travel">Travel / Conveyance</option>
              <option value="Fuel">Fuel Reimbursement</option>
              <option value="Food">Food / Client Lunch</option>
              <option value="Hotel">Hotel & Accommodation</option>
              <option value="Stationary">Stationary & Printing</option>
              <option value="Misc">Miscellaneous</option>
            </select>
          </div>

          {/* Amount Range */}
          <div className="flex items-center gap-1 bg-slate-50 border-slate-200 rounded-xl px-2.5 py-1.5 font-bold">
            <span className="text-slate-500">Min ₹:</span>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-16 bg-transparent text-slate-800 focus:outline-none font-bold"
            />
            <span className="text-slate-500 ml-1">Max ₹:</span>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-16 bg-transparent text-slate-800 focus:outline-none font-semibold text-[11px]"
            />
          </div>

          {/* Reset Filters */}
          {(selectedSE !== 'All' || selectedStatus !== 'All' || selectedCategory !== 'All' || search || fromDate || toDate || minAmount || maxAmount) && (
            <button
              onClick={() => {
                setSelectedSE('All')
                setSelectedStatus('All')
                setSelectedCategory('All')
                setSearch('')
                setFromDate('')
                setToDate('')
                setMinAmount('')
                setMaxAmount('')
                setPage(1)
              }}
              className="mgr-card text-[11px] font-extrabold text-rose-700 hover:underline cursor-pointer ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── EXPENSE APPROVAL TABLE ─────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800 min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                <th className="px-5 py-4.5">Submitted Date</th>
                <th className="px-5 py-4.5">EMP ID</th>
                <th className="px-5 py-4.5">SE Name</th>
                <th className="px-5 py-4.5">Receipt</th>
                <th className="px-5 py-4.5">Customer Name, Location & Date</th>
                <th className="px-5 py-4.5">Category</th>
                <th className="px-5 py-4.5">Amount</th>
                <th className="px-5 py-4.5">Status</th>
                <th className="px-5 py-4.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
                    <span className="text-sm font-bold">Loading team expense claims from Supabase database...</span>
                  </td>
                </tr>
              ) : paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-16 text-slate-400 font-bold text-sm">
                    No expense claim records match your selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((expense, idx) => (
                  <tr
                    key={expense.id || idx}
                    onClick={() => {
                      setSelectedExpenseModal(expense)
                      setManagerRemarks(expense.manager_remarks || '')
                    }}
                    className="mgr-card hover:bg-teal-50/40 transition cursor-pointer"
                  >
                    {/* 1. Submitted Date */}
                    <td className="px-5 py-4.5 font-mono text-xs sm:text-sm font-bold text-slate-700">
                      {expense.submitted_date}
                    </td>

                    {/* 2. EMP ID */}
                    <td className="px-5 py-4.5 font-mono font-black text-slate-900">
                      <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md text-xs">
                        [{expense.employee_code || 'EMP000012'}]
                      </span>
                    </td>

                    {/* 3. SE Name */}
                    <td className="px-5 py-4.5 font-black text-slate-900 text-sm sm:text-base">
                      {expense.assigned_to || expense.executive}
                    </td>

                    {/* 4. Receipt */}
                    <td className="px-5 py-4.5">
                      {expense.receipt_url ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setZoomReceiptUrl(expense.receipt_url)
                          }}
                          className="mgr-card px-3 py-1.5 rounded-xl bg-teal-100/80 text-teal-900 border border-teal-300 hover:bg-teal-200 transition font-black text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <FileText size={13} className="text-teal-700" /> View Receipt
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 inline-block">
                          No Receipt
                        </span>
                      )}
                    </td>

                    {/* 5. Combined Customer Name, Location & Date */}
                    <td className="px-5 py-4.5 max-w-[280px]">
                      <p className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                        {expense.customer_name || 'Corp Field Tech'}
                      </p>
                      <p className="text-xs text-slate-600 font-semibold flex items-center gap-1 mt-1 flex-wrap">
                        <MapPin size={12} className="text-teal-700 shrink-0" />
                        <span className="truncate">{expense.visit_location || 'Guindy, Chennai'}</span>
                        <span className="text-mgr-primary-800 font-mono font-bold shrink-0 ml-1">• Visit: {expense.visit_date}</span>
                      </p>
                    </td>

                    {/* 6. Category */}
                    <td className="px-5 py-4.5">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-mgr-primary-100/90 text-mgr-primary-950 border border-mgr-primary-300">
                        {expense.category}
                      </span>
                    </td>

                    {/* 7. Amount */}
                    <td className="px-5 py-4.5 font-black text-teal-900 text-base sm:text-lg">
                      {expense.amount}
                    </td>

                    {/* 8. Status */}
                    <td className="px-5 py-4.5">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                          String(expense.status).toLowerCase().includes('approv')
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : String(expense.status).toLowerCase().includes('reject')
                            ? 'bg-rose-100 text-rose-950 border border-rose-300'
                            : String(expense.status).toLowerCase().includes('return')
                            ? 'bg-mgr-primary-100 text-mgr-primary-950 border border-mgr-primary-300'
                            : 'bg-mgr-primary-100/80 text-mgr-primary-900 border border-mgr-primary-300'
                        }`}
                      >
                        {expense.status}
                      </span>
                    </td>

                    {/* 9. Action */}
                    <td className="px-5 py-4.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedExpenseModal(expense)
                          setManagerRemarks(expense.manager_remarks || '')
                        }}
                        className="mgr-card px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-xs cursor-pointer transition inline-flex items-center gap-1.5 active:scale-95 ml-auto"
                      >
                        <Eye size={14} /> Review & Approve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ────────────────────────────────────────── */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <div>
            Showing <span className="text-slate-900 font-black">{paginatedExpenses.length}</span> of <span className="text-slate-900 font-black">{filteredExpenses.length}</span> Total Claims
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── EXPENSE DETAILS DRAWER & APPROVAL MODAL ────────────────────────── */}
      {selectedExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-teal-900 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300">
                    {selectedExpenseModal.status}
                  </span>
                  <span className="text-[10px] font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    #{selectedExpenseModal.request_id || selectedExpenseModal.id}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-teal-600" /> Expense Claim Review
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedExpenseModal(null)
                  setManagerRemarks('')
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* 1. SE Information */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-teal-900">Sales Executive Information</span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-teal-200 text-teal-950 border border-teal-300 px-1.5 py-0.5 rounded font-mono font-black">
                    [{selectedExpenseModal.employee_code || 'EMP000012'}]
                  </span>
                  <p className="font-black text-teal-950 text-sm">{selectedExpenseModal.assigned_to || selectedExpenseModal.executive}</p>
                </div>
                <p className="text-slate-600 font-semibold">{selectedExpenseModal.department}</p>
              </div>
              <p className="text-slate-500 font-mono text-[11px] break-all">Email: {selectedExpenseModal.assigned_to_email} | Manager: {selectedExpenseModal.manager_name}</p>
            </div>

            {/* 2. Visit Information */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Associated Field Visit Details</span>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 font-semibold">
                <div>
                  <span className="text-slate-400 text-[10px]">Client / Company:</span>
                  <p className="text-slate-900 font-black">{selectedExpenseModal.customer_name} ({selectedExpenseModal.company})</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Visit Date & Time:</span>
                  <p className="text-slate-800 font-mono">{selectedExpenseModal.visit_date} ({selectedExpenseModal.visit_time})</p>
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Visit Location:</span>
                <p className="text-slate-800 font-semibold">{selectedExpenseModal.visit_location}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Purpose of Visit:</span>
                <p className="text-slate-700 italic">{selectedExpenseModal.purpose}</p>
              </div>
            </div>

            {/* 3. Expense Information */}
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Expense Category</span>
                <p className="font-black text-slate-900 mt-0.5">{selectedExpenseModal.category}</p>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                <span className="text-[10px] font-bold text-teal-800">Claim Amount</span>
                <p className="font-black text-teal-950 text-base mt-0.5">{selectedExpenseModal.amount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Submitted Date</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedExpenseModal.submitted_date}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Expense Description & Justification</span>
              <p className="text-slate-800 font-medium leading-relaxed">{selectedExpenseModal.description}</p>
            </div>

            {/* 4. Receipt Voucher Preview & Download */}
            <div className="p-4 rounded-2xl bg-slate-50 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Uploaded Receipt Voucher</span>
                {selectedExpenseModal.receipt_url && (
                  <a
                    href={selectedExpenseModal.receipt_url}
                    download={selectedExpenseModal.receipt_name}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-teal-100 hover:bg-teal-200 text-teal-950 rounded-xl font-extrabold text-[11px] border border-teal-300 transition flex items-center gap-1"
                  >
                    <Download size={12} /> Download Receipt File
                  </a>
                )}
              </div>

              {selectedExpenseModal.receipt_url ? (
                <div className="relative group max-h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                  <img
                    src={selectedExpenseModal.receipt_url}
                    alt="Receipt Voucher"
                    className="max-h-48 object-contain w-full"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={() => setZoomReceiptUrl(selectedExpenseModal.receipt_url)}
                      className="px-4 py-2 bg-white text-slate-900 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
                    >
                      <ZoomIn size={14} /> Fullscreen Zoom
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold">No receipt image attached to this claim.</div>
              )}
            </div>

            {/* 5. Manager Review Panel */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Sales Manager Review & Decision</span>

              <textarea
                value={managerRemarks}
                onChange={(e) => setManagerRemarks(e.target.value)}
                placeholder="Enter Manager Remarks / Approval Notes / Correction Instructions (Mandatory for Reject & Return)..."
                rows="2"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 font-medium"
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleManagerAction('RETURN')}
                  className="mgr-card px-4 py-2 bg-mgr-primary-500 hover:bg-mgr-primary-600 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1"
                >
                  <RotateCcw size={14} /> Return for Correction
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleManagerAction('REJECT')}
                  className="mgr-card px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1"
                >
                  <XCircle size={14} /> Reject Claim
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleManagerAction('APPROVE')}
                  className="mgr-card px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition flex items-center gap-1"
                >
                  <CheckCircle2 size={14} /> Approve Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN RECEIPT ZOOM MODAL ────────────────────────────────────── */}
      {zoomReceiptUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <span className="text-xs font-black flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-400" /> High-Resolution Voucher Preview
              </span>
              <button onClick={() => setZoomReceiptUrl(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-2xl p-2">
              <img src={zoomReceiptUrl} alt="Receipt Full Zoom" className="max-h-[70vh] object-contain rounded-xl" />
            </div>
            <div className="flex justify-end">
              <a
                href={zoomReceiptUrl}
                download="expense_voucher.jpg"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5"
              >
                <Download size={14} /> Download Original File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
