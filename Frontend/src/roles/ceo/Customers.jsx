import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Filter,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  Sparkles,
  Info,
  Layers,
  UserCheck,
  Briefcase,
  Target
} from 'lucide-react'
import { customerAPI, hrmsAPI, crmAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { formatDDMMYYYY } from '../../utils/formatUtils.js'

function CeoCustomers() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const isAdmin = currentUser.role?.toLowerCase() === 'admin'

  // Raw Data State
  const [data, setData] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('tc_ceo_customers_cache')
    } catch {
      return true
    }
  })
  const [error, setError] = useState(null)

  // Reassignment & View state
  const [activeTab, setActiveTab] = useState('customers') // 'customers' | 'leads'
  const [employees, setEmployees] = useState([])
  const [selectedCustIds, setSelectedCustIds] = useState([])
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManager, setSelectedManager] = useState('All')
  const [selectedTeamLead, setSelectedTeamLead] = useState('All')
  const [selectedExecutive, setSelectedExecutive] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Date Filter States
  const [datePreset, setDatePreset] = useState('All') // 'All' | 'Today' | 'This Week' | 'This Month' | 'Custom'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Expansion States
  const [expandedManagers, setExpandedManagers] = useState({})
  const [expandedExecutives, setExpandedExecutives] = useState({})

  // Detail Drawer & Pop-up Table Modal States
  const [selectedCust, setSelectedCust] = useState(null)
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)

  // ── Helper Utilities ────────────────────────────────────────────────────────
  const normName = (str) => (str || '').trim().toLowerCase()

  const parseDateToYYYYMMDD = (rawDate) => {
    if (!rawDate) return ''
    const str = String(rawDate).trim()
    if (!str || str === '—' || str === 'N/A' || str === 'null' || str === 'undefined') return ''
    const isoPart = str.split('T')[0].split(' ')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) {
      return isoPart
    }
    if (str.includes('/')) {
      const parts = str.split('/')
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        } else if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
        }
      }
    }
    const dObj = new Date(str)
    if (!isNaN(dObj.getTime())) {
      return dObj.toISOString().split('T')[0]
    }
    return ''
  }

  const checkDateMatch = (rawDate, preset, startDt, endDt) => {
    if (preset === 'All' && !startDt && !endDt) return true
    const dateStr = parseDateToYYYYMMDD(rawDate)
    if (!dateStr) return true

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (preset === 'Today') {
      return dateStr === todayStr
    }

    if (preset === 'This Week') {
      const curr = new Date()
      const day = curr.getDay()
      const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(curr.setDate(diffToMon)).toISOString().split('T')[0]
      const sunday = new Date(curr.setDate(diffToMon + 6)).toISOString().split('T')[0]
      return dateStr >= monday && dateStr <= sunday
    }

    if (preset === 'This Month') {
      const curr = new Date()
      const monthStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`
      return dateStr.startsWith(monthStr)
    }

    if (preset === 'Custom' || startDt || endDt) {
      if (startDt && dateStr < startDt) return false
      if (endDt && dateStr > endDt) return false
      return true
    }

    return true
  }

  const resetAllFilters = () => {
    setSelectedManager('All')
    setSelectedTeamLead('All')
    setSelectedExecutive('All')
    setSelectedProduct('All')
    setSelectedCategory('All')
    setDatePreset('All')
    setStartDate('')
    setEndDate('')
    setSearchQuery('')
  }

  const loadCustomerDirectory = async () => {
    try {
      if (!data || !localStorage.getItem('tc_ceo_customers_cache')) {
        setLoading(true)
      }
      setError(null)
      const res = await customerAPI.getCeoCustomerDirectory()
      if (res && res.data) {
        setData(res.data)
        
        // Auto-expand all managers by default so CEO gets full immediate visibility
        const mgrExpand = {}
        const execExpand = {}
        ;(res.data.managers || []).forEach(m => {
          mgrExpand[m.manager_id] = true
          ;(m.executives || []).forEach((e, ei) => {
            if (e.customer_count > 0) {
              execExpand[`${m.manager_id}_${e.executive_id || e.executive_name || 'ex'}_${ei}`] = true
            }
          })
        })
        setExpandedManagers(mgrExpand)
        setExpandedExecutives(execExpand)
      } else {
        setData({ managers: [], totals: { managers: 0, executives: 0, customers: 0, revenue: 0 } })
      }

      // Load active employees for assignment dropdown
      const empRes = await hrmsAPI.getEmployees().catch(() => null)
      if (empRes && (empRes.data || empRes)) {
        const rawEmps = empRes.data || empRes
        if (Array.isArray(rawEmps)) {
          setEmployees(rawEmps)
        }
      }

      // Load leads
      const leadsRes = await crmAPI.getLeads().catch(() => null)
      if (leadsRes && leadsRes.data && Array.isArray(leadsRes.data)) {
        setLeads(leadsRes.data)
      }
    } catch (err) {
      console.error('Failed to load customer directory:', err)
      setError(err?.message || 'Failed to fetch customer directory')
      showToast('Error loading customer directory', 'error')
    } finally {
      try { localStorage.setItem('tc_ceo_customers_cache', '1') } catch (_) {}
      setLoading(false)
    }
  }

  // Helper to check if a person is a Team Lead or non-manager
  function isTeamLeadOrNonManager(personName) {
    if (!personName) return true
    const norm = normName(personName)
    const empMatch = employees.find(emp => {
      const eName = normName(emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`)
      return eName === norm
    })
    if (empMatch) {
      const r = (empMatch.role || empMatch.designation || '').toLowerCase()
      if (r.includes('lead') || r.includes('tl') || !r.includes('manager')) {
        return true
      }
    }
    return false
  }

  // Helper to check if a person is specifically a Team Lead
  function isPersonTeamLead(personName) {
    if (!personName || personName === 'Unassigned' || personName === 'Direct / Unassigned' || personName === 'Unassigned / Direct') return false
    const norm = normName(personName)
    const empMatch = employees.find(emp => {
      const eName = normName(emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`)
      return eName === norm || (eName && (norm.includes(eName) || eName.includes(norm)))
    })
    if (empMatch) {
      const r = (empMatch.role || empMatch.designation || '').toLowerCase()
      return r.includes('team lead') || r.includes('team_lead') || r.includes('lead') || r.includes('tl')
    }
    return false
  }

  // Map executive -> team lead & manager from employees array
  const empByNameMap = {}
  const execToTeamLeadMap = {}
  const execToManagerMap = {}

  employees.forEach(emp => {
    const eName = (emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim()
    if (eName) {
      empByNameMap[eName.toLowerCase()] = emp
    }
  })

  employees.forEach(emp => {
    const eName = (emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim()
    if (!eName) return
    const key = eName.toLowerCase()

    let tlName = emp.reporting_team_lead_name || emp.reporting_team_lead || emp.team_lead_name || emp.team_lead || emp.reporting_tl_name || ''
    let mgrName = emp.reporting_manager_name || emp.reporting_manager || emp.manager_name || emp.sales_manager || emp.manager || emp.reporting_manager_email || ''

    if (mgrName.includes('@')) {
      const mgrEmp = employees.find(e => (e.email || '').toLowerCase().trim() === mgrName.toLowerCase().trim())
      if (mgrEmp) {
        mgrName = (mgrEmp.name || mgrEmp.full_name || `${mgrEmp.first_name || ''} ${mgrEmp.last_name || ''}`).trim()
      } else {
        mgrName = mgrName.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
      }
    }

    if (tlName.includes('@')) {
      const tlEmp = employees.find(e => (e.email || '').toLowerCase().trim() === tlName.toLowerCase().trim())
      if (tlEmp) {
        tlName = (tlEmp.name || tlEmp.full_name || `${tlEmp.first_name || ''} ${tlEmp.last_name || ''}`).trim()
      } else {
        tlName = tlName.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
      }
    }

    // Check if mgrName is actually a Team Lead
    if (mgrName && isTeamLeadOrNonManager(mgrName)) {
      if (!tlName || tlName === 'Unassigned' || tlName === 'Direct / Unassigned') {
        tlName = mgrName
      }
      const tlEmp = employees.find(e => normName(e.name || e.full_name) === normName(mgrName))
      if (tlEmp && tlEmp.reporting_manager_name) {
        mgrName = tlEmp.reporting_manager_name
      } else {
        mgrName = 'Unassigned'
      }
    }

    if ((!mgrName || mgrName === 'Direct / Unassigned' || mgrName === 'Unassigned' || mgrName === 'Unassigned / Direct') && tlName) {
      const tlEmp = empByNameMap[tlName.toLowerCase()]
      if (tlEmp) {
        const m = tlEmp.reporting_manager_name || tlEmp.reporting_manager || tlEmp.manager_name || tlEmp.sales_manager || tlEmp.manager || ''
        if (m && !m.includes('@') && !isTeamLeadOrNonManager(m)) mgrName = m
      }
    }

    if (tlName && tlName !== 'Unassigned' && tlName !== 'Direct / Unassigned' && tlName !== 'Unassigned / Direct') {
      execToTeamLeadMap[key] = tlName
    }
    if (mgrName && mgrName !== 'Unassigned' && mgrName !== 'CEO Office' && mgrName !== 'Direct / Unassigned' && mgrName !== 'Unassigned / Direct' && !isTeamLeadOrNonManager(mgrName)) {
      execToManagerMap[key] = mgrName
    }
  })

  // ── Flatten the hierarchy into a flat list of customers ────────────────
  const rawCustomers = []
  const seenCustKeys = new Set()

  const addCustRecord = (cust, mgrId = '', mgrName = '', execId = '', execName = '') => {
    if (!cust) return
    const custId = String(cust.customer_id || cust.id || cust.name || cust.company_name || cust.company || Math.random()).toLowerCase().trim()
    if (seenCustKeys.has(custId)) return
    seenCustKeys.add(custId)

    const rawExecName = execName || cust.executive_name || cust.sales_executive || cust.assigned_to || ''
    const execKey = rawExecName.toLowerCase().trim()

    const execIsTL = isPersonTeamLead(rawExecName)

    // 1. Resolve Team Lead and Manager
    let tlFromCust = cust.team_lead_name || cust.team_lead || cust.reporting_team_lead_name || ''
    let mgrFromCust = mgrName || cust.manager_name || cust.sales_manager || cust.reporting_manager_name || ''

    if (execIsTL) {
      tlFromCust = rawExecName
    }

    if (mgrFromCust && isTeamLeadOrNonManager(mgrFromCust)) {
      if (!tlFromCust || tlFromCust === 'Unassigned') {
        tlFromCust = mgrFromCust
      }
      const tlEmp = employees.find(e => normName(e.name || e.full_name) === normName(mgrFromCust))
      if (tlEmp && tlEmp.reporting_manager_name) {
        mgrFromCust = tlEmp.reporting_manager_name
      } else {
        mgrFromCust = 'Unassigned'
      }
    }

    const tlFromMap = execToTeamLeadMap[execKey] || ''
    let finalTL = (tlFromCust && tlFromCust !== 'Unassigned' && tlFromCust !== 'Direct / Unassigned' && tlFromCust !== 'Unassigned / Direct')
      ? tlFromCust
      : (tlFromMap || (execIsTL ? rawExecName : 'Unassigned'))

    const isDirectTL = execIsTL || (finalTL && rawExecName && normName(finalTL) === normName(rawExecName))
    if (isDirectTL && rawExecName) {
      finalTL = rawExecName
    }

    // 2. Resolve Sales Manager
    const mgrFromMap = execToManagerMap[execKey] || (finalTL !== 'Unassigned' ? execToManagerMap[finalTL.toLowerCase()] : '') || ''
    let finalMgrName = (mgrFromCust && mgrFromCust !== 'Unassigned' && mgrFromCust !== 'Unassigned / Direct' && mgrFromCust !== 'Direct / Unassigned')
      ? mgrFromCust
      : (mgrFromMap || 'Unassigned')

    if (finalMgrName && isTeamLeadOrNonManager(finalMgrName)) {
      finalMgrName = 'Unassigned'
    }

    rawCustomers.push({
      ...cust,
      customer_id: cust.customer_id || cust.id || custId,
      customer_name: cust.customer_name || cust.name || cust.company_name || cust.company || 'Customer Account',
      company_name: cust.company_name || cust.company || cust.customer_name || cust.name || 'Company',
      manager_id: mgrId || cust.manager_id || '',
      manager_name: finalMgrName,
      executive_id: isDirectTL ? '' : (execId || cust.executive_id || ''),
      executive_name: isDirectTL ? '' : (rawExecName || 'Unassigned'),
      team_lead_name: finalTL,
      is_direct_tl: isDirectTL,
      raw_executive_name: rawExecName,
      product: cust.product || cust.product_name || 'TwiteConnect CRM',
      amount: cust.amount || cust.contract_value || cust.revenue || 0,
      date: cust.date || cust.onboarding_date || cust.created_at || ''
    })
  }

  if (data) {
    if (Array.isArray(data.managers)) {
      data.managers.forEach(mgr => {
        if (mgr && Array.isArray(mgr.executives)) {
          mgr.executives.forEach(exec => {
            if (exec && Array.isArray(exec.customers)) {
              exec.customers.forEach(cust => {
                addCustRecord(cust, mgr.manager_id, mgr.manager_name, exec.executive_id, exec.executive_name)
              })
            }
          })
        }
      })
    }
    if (Array.isArray(data.customers)) {
      data.customers.forEach(cust => addCustRecord(cust))
    }
    if (data.customerSummary && Array.isArray(data.customerSummary.customersList)) {
      data.customerSummary.customersList.forEach(cust => addCustRecord(cust))
    }
  }



  const getLeadManagerName = (lead) => {
    if (!lead) return 'Unassigned'
    let mgr = lead.manager_name || lead.sales_manager || lead.reporting_manager_name || ''

    if (mgr && isTeamLeadOrNonManager(mgr)) {
      const tlEmp = employees.find(e => normName(e.name || e.full_name) === normName(mgr))
      if (tlEmp && tlEmp.reporting_manager_name && !isTeamLeadOrNonManager(tlEmp.reporting_manager_name)) {
        mgr = tlEmp.reporting_manager_name
      } else {
        const mappedFromTL = execToManagerMap[normName(mgr)]
        mgr = (mappedFromTL && !isTeamLeadOrNonManager(mappedFromTL)) ? mappedFromTL : 'Unassigned'
      }
    }

    if (mgr && mgr !== 'Unassigned' && mgr !== 'Direct / Unassigned' && mgr !== 'Unassigned / Direct' && !isTeamLeadOrNonManager(mgr)) {
      return mgr
    }

    const execName = (lead.sales_executive || lead.assigned_to || '').toLowerCase().trim()
    const mappedMgr = execToManagerMap[execName]
    if (mappedMgr && !isTeamLeadOrNonManager(mappedMgr)) return mappedMgr

    const mappedTL = execToTeamLeadMap[execName]
    if (mappedTL && execToManagerMap[mappedTL.toLowerCase()] && !isTeamLeadOrNonManager(execToManagerMap[mappedTL.toLowerCase()])) {
      return execToManagerMap[mappedTL.toLowerCase()]
    }

    return 'Unassigned'
  }

  const getLeadTeamLeadName = (lead) => {
    if (!lead) return 'Unassigned'
    const execName = (lead.sales_executive || lead.assigned_to || '').trim()
    if (execName && isPersonTeamLead(execName)) return execName
    const tl = lead.team_lead_name || lead.team_lead || lead.reporting_team_lead_name || ''
    if (tl && tl !== 'Unassigned' && tl !== 'Direct / Unassigned' && tl !== 'Unassigned / Direct') return tl
    return execToTeamLeadMap[execName.toLowerCase()] || 'Unassigned'
  }

  // Extract filter dropdown options from raw data
  const allManagersList = Array.from(new Set([
    ...employees.filter(emp => {
      const r = (emp.role || emp.designation || '').toLowerCase()
      return r.includes('manager') && !r.includes('lead') && !r.includes('tl')
    }).map(emp => emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()),
    ...rawCustomers.map(c => c.manager_name)
  ]))
    .filter(name => name && name !== 'Unassigned / Direct' && name !== 'Unassigned')
    .filter(name => !isTeamLeadOrNonManager(name))

  const allTeamLeadsList = Array.from(new Set([
    ...employees.filter(emp => {
      const r = (emp.role || emp.designation || '').toLowerCase()
      return r.includes('team lead') || r.includes('team_lead') || r.includes('lead') || r.includes('tl')
    }).map(emp => emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()),
    ...rawCustomers
      .filter(c => selectedManager === 'All' || normName(c.manager_name) === normName(selectedManager) || normName(c.manager_name).includes(normName(selectedManager)))
      .map(c => c.team_lead_name)
  ])).filter(name => name && name !== 'Unassigned / Direct' && name !== 'Unassigned')

  const allExecutivesList = Array.from(new Set([
    ...employees.filter(emp => {
      const r = (emp.role || emp.designation || '').toLowerCase()
      return r.includes('executive')
    }).map(emp => emp.name || emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()),
    ...rawCustomers
      .filter(c => selectedManager === 'All' || normName(c.manager_name) === normName(selectedManager) || normName(c.manager_name).includes(normName(selectedManager)))
      .filter(c => selectedTeamLead === 'All' || normName(c.team_lead_name) === normName(selectedTeamLead) || normName(c.team_lead_name).includes(normName(selectedTeamLead)))
      .map(c => c.executive_name)
  ])).filter(name => name && name !== 'Direct / Unassigned' && name !== 'Unassigned')

  const allProductsList = Array.from(new Set([
    ...rawCustomers.map(c => c.product),
    ...leads.map(l => l.product_name || l.product)
  ])).filter(Boolean)

  const q = normName(searchQuery)

  const leadsCount = leads.length

  // Filtered flat customer list
  const filteredCustomers = rawCustomers.filter(cust => {
    // 1. Search Query Filter
    if (q) {
      const matchCust = normName(cust.customer_name || cust.name).includes(q)
      const matchComp = normName(cust.company_name || cust.company).includes(q)
      const matchID = normName(cust.customer_id || cust.id).includes(q)
      const matchProd = normName(cust.product).includes(q)
      const matchExec = normName(cust.executive_name || cust.sales_executive).includes(q)
      const matchTL = normName(cust.team_lead_name).includes(q)
      const matchMgr = normName(cust.manager_name || cust.sales_manager).includes(q)
      if (!matchCust && !matchComp && !matchID && !matchProd && !matchExec && !matchTL && !matchMgr) return false
    }

    // 2. Manager Dropdown Filter (Normalized)
    if (selectedManager !== 'All') {
      const cMgr = normName(cust.manager_name || cust.sales_manager)
      const sMgr = normName(selectedManager)
      if (cMgr !== sMgr && !cMgr.includes(sMgr) && !sMgr.includes(cMgr)) return false
    }

    // 3. Team Lead Dropdown Filter (Normalized)
    if (selectedTeamLead !== 'All') {
      const cTL = normName(cust.team_lead_name)
      const sTL = normName(selectedTeamLead)
      if (cTL !== sTL && !cTL.includes(sTL) && !sTL.includes(cTL)) return false
    }

    // 4. Executive Dropdown Filter (Normalized)
    if (selectedExecutive !== 'All') {
      const cExec = normName(cust.executive_name || cust.sales_executive)
      const sExec = normName(selectedExecutive)
      if (cExec !== sExec && !cExec.includes(sExec) && !sExec.includes(cExec)) return false
    }

    // 5. Product Dropdown Filter
    if (selectedProduct !== 'All') {
      if (normName(cust.product) !== normName(selectedProduct)) return false
    }

    // 6. Date Range Filter
    if (!checkDateMatch(cust.date || cust.onboarding_date || cust.created_at, datePreset, startDate, endDate)) {
      return false
    }

    return true
  })

  // Filtered flat leads list
  const filteredLeads = leads.filter(lead => {
    // 1. Search Query Filter
    if (q) {
      const matchLead = normName(lead.name || lead.contact_name).includes(q)
      const matchComp = normName(lead.company_name || lead.company).includes(q)
      const matchID = normName(lead.id || lead.lead_id).includes(q)
      const matchProd = normName(lead.product_name || lead.product).includes(q)
      const matchLoc = normName(lead.location || lead.city || lead.address).includes(q)
      const matchExec = normName(lead.sales_executive || lead.assigned_to).includes(q)
      if (!matchLead && !matchComp && !matchID && !matchProd && !matchLoc && !matchExec) return false
    }

    // 2. Category Filter
    if (selectedCategory !== 'All') {
      const leadCat = lead.category || 'Warm'
      if (normName(leadCat) !== normName(selectedCategory)) return false
    }

    // 3. Product Filter
    if (selectedProduct !== 'All') {
      const leadProd = lead.product_name || lead.product || ''
      if (normName(leadProd) !== normName(selectedProduct)) return false
    }

    // 4. Date Range Filter
    if (!checkDateMatch(lead.date || lead.created_at, datePreset, startDate, endDate)) {
      return false
    }

    return true
  })

  // Filter active Sales Executives for assignment dropdown
  const activeExecutives = employees.filter(emp => {
    const isInactive = ['inactive', 'deactivated', 'terminated', 'disabled', 'resigned', 'left'].includes((emp.status || '').toLowerCase())
    const isNotActive = emp.is_active === false
    const isExec = (emp.role || emp.designation || '').toLowerCase().includes('executive')
    return !isInactive && !isNotActive && isExec
  })

  // Static overall company totals (never change when selecting manager cards)
  const totalCompanyCustomers = rawCustomers.length
  const totalCompanyRevenue = rawCustomers.reduce((sum, c) => sum + (c.amount || c.contract_value || 0), 0)

  // Dynamic filtered counts for modal table
  const liveUniqueCustomers = filteredCustomers.length
  const liveTotalRevenue = filteredCustomers.reduce((sum, c) => sum + (c.amount || 0), 0)

  // Pagination & Sorting (10 rows per page, sorted datewise descending)
  const ITEMS_PER_PAGE = 10
  const [customerPage, setCustomerPage] = useState(1)
  const [leadPage, setLeadPage] = useState(1)

  useEffect(() => {
    loadCustomerDirectory()
  }, [])

  useEffect(() => {
    setCustomerPage(1)
    setLeadPage(1)
  }, [searchQuery, selectedManager, selectedTeamLead, selectedExecutive, selectedProduct, selectedCategory, datePreset, startDate, endDate])

  // Datewise Sorting (Latest Date First)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const dA = String(a.date || a.created_at || a.created_date || '1970-01-01')
    const dB = String(b.date || b.created_at || b.created_date || '1970-01-01')
    return dB.localeCompare(dA)
  })

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const dA = String(a.date || a.created_at || a.created_date || '1970-01-01')
    const dB = String(b.date || b.created_at || b.created_date || '1970-01-01')
    return dB.localeCompare(dA)
  })

  // Paginated Slices (10 rows only per page)
  const customerTotalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE) || 1
  const paginatedCustomers = sortedCustomers.slice((customerPage - 1) * ITEMS_PER_PAGE, customerPage * ITEMS_PER_PAGE)

  const leadTotalPages = Math.ceil(sortedLeads.length / ITEMS_PER_PAGE) || 1
  const paginatedLeads = sortedLeads.slice((leadPage - 1) * ITEMS_PER_PAGE, leadPage * ITEMS_PER_PAGE)

  // Managers and executives count based on filtered dataset
  const liveManagersCount = Array.from(new Set(
    filteredCustomers
      .map(c => c.manager_name)
      .filter(name => name && name !== 'Unassigned / Direct' && name !== 'Unassigned')
  )).length

  const liveExecutivesCount = Array.from(new Set(
    filteredCustomers
      .map(c => c.executive_name)
      .filter(name => name && name !== 'Direct / Unassigned' && name !== 'Unassigned')
  )).length

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <Building2 className="size-4.5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Clients Directory
            </h1>
          </div>
        </div>

        <button
          onClick={loadCustomerDirectory}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Directory
        </button>
      </div>

      {/* View Tabs Toggle Pill (Compact & Click Effect) */}
      <div className="flex bg-white border border-slate-200/90 p-0.5 sm:p-1 rounded-xl self-start lg:self-auto shrink-0 max-w-[280px] shadow-2xs">
        <button
          onClick={() => {
            setActiveTab('customers')
            setSelectedCustIds([])
            setSelectedManager('All')
            setSelectedExecutive('All')
            setSelectedProduct('All')
            setSelectedCategory('All')
            setSearchQuery('')
            setIsTableModalOpen(false)
          }}
          className={`flex-1 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-extrabold uppercase rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${activeTab === 'customers'
              ? 'bg-[#832D51] text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          Clients
        </button>
        <button
          onClick={() => {
            setActiveTab('leads')
            setSelectedCustIds([])
            setSelectedManager('All')
            setSelectedExecutive('All')
            setSelectedProduct('All')
            setSelectedCategory('All')
            setSearchQuery('')
            setIsTableModalOpen(false)
          }}
          className={`flex-1 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-extrabold uppercase rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${activeTab === 'leads'
              ? 'bg-[#832D51] text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          Leads ({leadsCount})
        </button>
      </div>

      {/* Summary KPI Cards Grid */}
      {activeTab === 'customers' ? (
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Emerald Theme - Total Customers */}
          <div
            onClick={() => {
              setSelectedManager('All')
              setSelectedExecutive('All')
              setSelectedProduct('All')
              setSearchQuery('')
              setIsTableModalOpen(true)
            }}
            className="bg-[#DCFCE7] border-2 border-[#16A34A] rounded-xl p-2.5 shadow-2xs transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#15803D]">Total Clients</span>
              <span className="p-1 rounded-lg bg-[#16A34A]/20 text-[#15803D]">
                <Building2 className="size-3.5" />
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                {totalCompanyCustomers}
              </p>
              <span className="text-[9px] font-bold text-[#166534]">Accounts</span>
            </div>
            <div className="mt-1.5 pt-1 border-t border-[#16A34A]/25 flex items-center gap-1 text-[9px] font-bold text-[#15803D]">
              <span>▶ Click card to view pop-up table</span>
            </div>
          </div>

          {/* Card 2: Blue Theme - Total Revenue Portfolio (CEO Only) or Assignment Summary (Admin) */}
          {!isAdmin ? (
            <div
              onClick={() => {
                setSelectedManager('All')
                setSelectedExecutive('All')
                setSelectedProduct('All')
                setSearchQuery('')
                setIsTableModalOpen(true)
              }}
              className="bg-[#DBEAFE] border-2 border-[#2563EB] rounded-xl p-2.5 shadow-2xs transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#1E40AF]">Total Revenue Portfolio</span>
                <span className="p-1 rounded-lg bg-[#2563EB]/20 text-[#1E40AF]">
                  <DollarSign className="size-3.5" />
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                  ₹{totalCompanyRevenue.toLocaleString()}
                </p>
                <span className="text-[9px] font-bold text-[#1D4ED8]">Portfolio</span>
              </div>
              <div className="mt-1.5 pt-1 border-t border-[#2563EB]/25 flex items-center gap-1 text-[9px] font-bold text-[#1E40AF]">
                <span>▶ Click card to view pop-up table</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                setSelectedManager('All')
                setSelectedExecutive('All')
                setSelectedProduct('All')
                setSearchQuery('')
                setIsTableModalOpen(true)
              }}
              className="bg-[#DBEAFE] border-2 border-[#2563EB] rounded-xl p-2.5 shadow-2xs transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#1E40AF]">Unassigned Client Accounts</span>
                <span className="p-1 rounded-lg bg-[#2563EB]/20 text-[#1E40AF]">
                  <UserCheck className="size-3.5" />
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                  {rawCustomers.filter(c => !c.executive_id || c.executive_name === 'Unassigned' || c.executive_name === 'Direct / Unassigned').length}
                </p>
                <span className="text-[9px] font-bold text-[#1D4ED8]">Pending Assign</span>
              </div>
              <div className="mt-1.5 pt-1 border-t border-[#2563EB]/25 flex items-center gap-1 text-[9px] font-bold text-[#1E40AF]">
                <span>▶ Click card to assign accounts</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* LEADS PRIORITY CARDS */
        <div className="grid gap-3.5 sm:grid-cols-3">
          <div
            onClick={() => {
              setSelectedCategory('Hot')
              setSelectedProduct('All')
              setSearchQuery('')
              setIsTableModalOpen(true)
            }}
            className="bg-[#FEE2E2] border-2 border-[#EF4444] rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#991B1B]">Hot Leads</span>
              <span className="size-2.5 rounded-full bg-rose-500 inline-block ring-2 ring-rose-300" />
            </div>
            <p className="text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950">
              {filteredLeads.filter(l => (l.category || '').toLowerCase() === 'hot').length}
            </p>
            <p className="text-[10px] font-bold text-[#B91C1C] mt-0.5">High conversion priority</p>
            <div className="mt-2 pt-1.5 border-t border-[#EF4444]/30 flex items-center gap-1 text-[10px] font-bold text-[#991B1B]">
              <span>▶ Click card to view pop-up table</span>
            </div>
          </div>

          <div
            onClick={() => {
              setSelectedCategory('Warm')
              setSelectedProduct('All')
              setSearchQuery('')
              setIsTableModalOpen(true)
            }}
            className="bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#92400E]">Warm Leads</span>
              <span className="size-2.5 rounded-full bg-amber-500 inline-block ring-2 ring-amber-300" />
            </div>
            <p className="text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950">
              {filteredLeads.filter(l => (l.category || '').toLowerCase() === 'warm').length}
            </p>
            <p className="text-[10px] font-bold text-[#B45309] mt-0.5">Medium conversion priority</p>
            <div className="mt-2 pt-1.5 border-t border-[#F59E0B]/30 flex items-center gap-1 text-[10px] font-bold text-[#92400E]">
              <span>▶ Click card to view pop-up table</span>
            </div>
          </div>

          <div
            onClick={() => {
              setSelectedCategory('Cold')
              setSelectedProduct('All')
              setSearchQuery('')
              setIsTableModalOpen(true)
            }}
            className="bg-[#CFFAFE] border-2 border-[#0891B2] rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#155E75]">Cold Leads</span>
              <span className="size-2.5 rounded-full bg-cyan-500 inline-block ring-2 ring-cyan-300" />
            </div>
            <p className="text-xl sm:text-2xl font-black tracking-tight mt-2 text-slate-950">
              {filteredLeads.filter(l => (l.category || '').toLowerCase() === 'cold').length}
            </p>
            <p className="text-[10px] font-bold text-[#0E7490] mt-0.5">Low conversion priority</p>
            <div className="mt-2 pt-1.5 border-t border-[#0891B2]/30 flex items-center gap-1 text-[10px] font-bold text-[#155E75]">
              <span>▶ Click card to view pop-up table</span>
            </div>
          </div>
        </div>
      )}

      {/* Sales Manager Directory Cards (Click card to filter deals) */}
      {activeTab === 'customers' && allManagersList.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">SALES MANAGERS DIRECTORY</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {allManagersList.map((mgr, idx) => {
              const mgrCusts = rawCustomers.filter(c => (c.manager_name || c.sales_manager || '').trim().toLowerCase() === mgr.toLowerCase())
              const totalVal = mgrCusts.reduce((s, c) => s + (c.amount || c.contract_value || 0), 0)
              const isSelected = selectedManager === mgr
              const themes = [
                { bg: 'bg-[#DCFCE7]', border: 'border-2 border-[#16A34A]', text: 'text-[#15803D]', badge: 'bg-[#16A34A]/20' },
                { bg: 'bg-[#DBEAFE]', border: 'border-2 border-[#2563EB]', text: 'text-[#1E40AF]', badge: 'bg-[#2563EB]/20' },
                { bg: 'bg-[#F3E8FF]', border: 'border-2 border-[#9333EA]', text: 'text-[#6B21A8]', badge: 'bg-[#9333EA]/20' },
                { bg: 'bg-[#FEF08A]', border: 'border-2 border-[#CA8A04]', text: 'text-[#854D0E]', badge: 'bg-[#CA8A04]/20' },
              ]
              const theme = themes[idx % themes.length]

              return (
                <div
                  key={mgr}
                  onClick={() => {
                    setSelectedManager(mgr)
                    setSelectedTeamLead('All')
                    setSelectedExecutive('All')
                    setSelectedProduct('All')
                    setSearchQuery('')
                    setIsTableModalOpen(true)
                  }}
                  className={`${theme.bg} ${theme.border} rounded-2xl p-3.5 shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-95 cursor-pointer text-slate-900 ${isSelected ? 'ring-4 ring-[#832D51]/30 scale-[1.02]' : ''
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-slate-950/10 flex items-center justify-center font-black text-slate-950 text-xs">
                        {mgr.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Manager</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${theme.text} ${theme.badge}`}>
                      {mgrCusts.length} Accounts
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-950 mt-2">{mgr}</h4>

                  {!isAdmin ? (
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-slate-700">Portfolio Value:</span>
                      <span className="font-black text-slate-950">₹{totalVal.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-slate-700">Client Accounts:</span>
                      <span className="font-black text-slate-950">{mgrCusts.length} Managed</span>
                    </div>
                  )}

                  <div className={`mt-2 pt-1 border-t border-black/10 flex items-center justify-between text-[10px] font-black ${theme.text}`}>
                    <span>Click to view {mgr}'s deals</span>
                    <span>→</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* POP-UP DATA TABLE MODAL (Triggered when any card is clicked) */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header with Title & Close (X) Symbol */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#832D51] text-white font-black">
                  <Layers className="size-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {activeTab === 'customers'
                      ? (selectedManager !== 'All' ? `${selectedManager}'s Client Accounts` : 'Client Accounts Directory Table')
                      : (selectedCategory !== 'All' ? `${selectedCategory} Priority Leads Directory` : 'Leads Directory Table')}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Showing {activeTab === 'customers' ? filteredCustomers.length : filteredLeads.length} matching records datewise (10 per page)
                  </p>
                </div>
              </div>

              {/* Close Icon (X) Button */}
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                title="Close Table Modal"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content Area */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/30">
              {/* Filters Strip */}
              <div className={`bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs grid gap-3 ${
                activeTab === 'leads' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-6'
              }`}>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'leads' ? "Search leads..." : "Search Client / Company / Executive / TL..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51] transition"
                  />
                </div>

                {activeTab === 'customers' ? (
                  <>
                    <select
                      value={selectedManager}
                      onChange={(e) => {
                        setSelectedManager(e.target.value)
                        setSelectedTeamLead('All')
                        setSelectedExecutive('All')
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
                    >
                      <option value="All">All Sales Managers</option>
                      {allManagersList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <select
                      value={selectedTeamLead}
                      onChange={(e) => {
                        setSelectedTeamLead(e.target.value)
                        setSelectedExecutive('All')
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
                    >
                      <option value="All">All Team Leads</option>
                      {allTeamLeadsList.map(tl => (
                        <option key={tl} value={tl}>{tl}</option>
                      ))}
                    </select>

                    <select
                      value={selectedExecutive}
                      onChange={(e) => setSelectedExecutive(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
                    >
                      <option value="All">All Sales Executives</option>
                      {allExecutivesList.map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                )}

                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
                >
                  <option value="All">All Products</option>
                  {allProductsList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                {/* Date Preset Filter */}
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
                >
                  <option value="All">All Time (Dates)</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom">Custom Date Range</option>
                </select>
              </div>

              {/* Custom Date Range Pickers & Filter Reset Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                  <Calendar className="size-4 text-[#832D51]" />
                  <span>Date Range:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setDatePreset('Custom')
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setDatePreset('Custom')
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51]"
                  />
                </div>

                {(selectedManager !== 'All' || selectedTeamLead !== 'All' || selectedExecutive !== 'All' || selectedProduct !== 'All' || selectedCategory !== 'All' || datePreset !== 'All' || startDate || endDate || searchQuery) && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <X className="size-3.5" />
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Centralized Lead & Customer Reassignment Banner */}
              {selectedCustIds.length > 0 && isAdmin && (
                <div className="flex items-center justify-between bg-[#832D51]/10 border border-[#832D51]/20 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
                  <span className="text-xs font-black text-[#832D51]">
                    {selectedCustIds.length} {activeTab === 'leads' ? (selectedCustIds.length === 1 ? 'Lead' : 'Leads') : (selectedCustIds.length === 1 ? 'Client' : 'Clients')} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExecutiveId('')
                      setIsAssignModalOpen(true)
                    }}
                    className="px-4 py-2 bg-[#832D51] text-white rounded-xl text-xs font-black shadow-sm hover:bg-[#6c2442] transition cursor-pointer"
                  >
                    Assign Selected
                  </button>
                </div>
              )}

              {/* Dynamic Customers vs Leads Registry List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-3 text-[#832D51]" />
                    Loading organization records...
                  </div>
                ) : activeTab === 'customers' ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto overflow-y-auto max-h-[62vh] relative">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-2xs">
                          <tr className="bg-slate-100 border-b border-slate-250 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                            {isAdmin && (
                              <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 w-12">
                                <input
                                  type="checkbox"
                                  checked={filteredCustomers.length > 0 && selectedCustIds.length === filteredCustomers.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCustIds(filteredCustomers.map(c => c.customer_id || c.id).filter(Boolean))
                                    } else {
                                      setSelectedCustIds([])
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
                                />
                              </th>
                            )}
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Date</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Client Name</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Company Name</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Product</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Sales Manager</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Team Lead</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Sales Executive</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 text-center">Assignment Status</th>
                            {!isAdmin && <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 text-right">Amount</th>}
                            {isAdmin && <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 text-center">Action</th>}

                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {paginatedCustomers.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="text-center py-12 text-slate-400 font-semibold italic">
                                <div className="space-y-2">
                                  <p className="not-italic text-slate-500 font-bold">No client records found matching the active filters.</p>
                                  <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="px-3 py-1.5 bg-[#832D51] text-white hover:bg-[#6c2442] rounded-xl text-xs font-black transition cursor-pointer not-italic inline-flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <RefreshCw className="size-3.5" />
                                    Clear & Reset All Filters
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            paginatedCustomers.map((cust, ci) => {
                              const custId = cust.customer_id || cust.id
                              const isDirectTL = cust.is_direct_tl || (cust.raw_executive_name && isPersonTeamLead(cust.raw_executive_name)) || (cust.executive_name && isPersonTeamLead(cust.executive_name)) || (cust.team_lead_name && isPersonTeamLead(cust.team_lead_name) && (!cust.executive_name || cust.executive_name === cust.team_lead_name))
                              const finalTL = isDirectTL ? (cust.team_lead_name || cust.raw_executive_name || cust.executive_name) : (cust.team_lead_name || 'Unassigned')
                              const hasExec = isDirectTL ? true : !!(cust.executive_id && cust.executive_name && cust.executive_name !== 'Direct / Unassigned' && cust.executive_name !== 'Unassigned')
                              const isManagerUnassigned = !cust.manager_name || cust.manager_name === 'Unassigned / Direct' || cust.manager_name === 'Unassigned'

                              return (
                                <tr
                                  key={`${custId}_${ci}`}
                                  className={`transition cursor-pointer ${
                                    isDirectTL
                                      ? 'bg-amber-50/45 hover:bg-amber-100/60 border-l-4 border-l-amber-500 shadow-2xs'
                                      : 'hover:bg-slate-50/60'
                                  }`}
                                  onClick={() => setSelectedCust(cust)}
                                >
                                  {isAdmin && (
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={selectedCustIds.includes(custId)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedCustIds(prev => [...prev, custId])
                                          } else {
                                            setSelectedCustIds(prev => prev.filter(id => id !== custId))
                                          }
                                        }}
                                        className="rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
                                      />
                                    </td>
                                  )}
                                  <td className="px-4 py-3 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                                    {formatDDMMYYYY(cust.date || cust.created_at)}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-900 hover:text-[#832D51]">
                                    {cust.customer_name}
                                  </td>
                                  <td className="px-4 py-3 text-slate-650">
                                    {cust.company_name}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {cust.product}
                                  </td>
                                  <td className="px-4 py-3 text-[#3a7d63] font-bold">
                                    {isManagerUnassigned ? 'Unassigned' : cust.manager_name}
                                  </td>
                                  <td className="px-4 py-3 text-indigo-700 font-bold">
                                    {finalTL && finalTL !== 'Unassigned' ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        {isDirectTL && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase border border-amber-250 shadow-2xs">
                                            TL Direct
                                          </span>
                                        )}
                                        {finalTL}
                                      </span>
                                    ) : (
                                      'Unassigned'
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-slate-900 font-bold">
                                    {isDirectTL ? (
                                      <span className="text-slate-400 italic font-semibold text-[11px]">—</span>
                                    ) : hasExec ? (
                                      cust.executive_name
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                        NOT ASSIGNED
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${
                                      isDirectTL
                                        ? 'bg-amber-100/80 text-amber-900 border-amber-300'
                                        : !hasExec
                                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                                          : (cust.reassigned_at ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-250')
                                    }`}>
                                      {isDirectTL ? 'Assigned (TL Direct)' : (!hasExec ? 'Not Assigned' : (cust.reassigned_at ? 'Reassigned' : 'Assigned'))}
                                    </span>
                                  </td>
                                  {!isAdmin && (
                                    <td className="px-4 py-3 text-right font-black text-slate-950">
                                      ₹{(cust.amount || 0).toLocaleString()}
                                    </td>
                                  )}

                                  {isAdmin && (
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedCustIds([custId])
                                          setSelectedExecutiveId(cust.executive_id || '')
                                          setIsAssignModalOpen(true)
                                        }}
                                        className="px-2.5 py-1 bg-[#832D51] text-white hover:bg-[#6c2442] rounded-md text-[10px] font-black shadow-2xs transition cursor-pointer"
                                      >
                                        {hasExec ? 'Reassign' : 'Assign'}
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION BAR FOR CUSTOMERS (10 ROWS PER PAGE) */}
                    {sortedCustomers.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200/80">
                        <div className="text-xs text-slate-500 font-medium">
                          Showing <span className="font-black text-slate-900">{Math.min((customerPage - 1) * ITEMS_PER_PAGE + 1, sortedCustomers.length)}</span> to <span className="font-black text-slate-900">{Math.min(customerPage * ITEMS_PER_PAGE, sortedCustomers.length)}</span> of <span className="font-black text-slate-900">{sortedCustomers.length.toLocaleString()}</span> records
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCustomerPage(prev => Math.max(1, prev - 1))}
                            disabled={customerPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                          >
                            <ChevronLeft className="size-3.5" />
                            Previous
                          </button>

                          <div className="flex items-center gap-1 px-2">
                            <span className="text-xs font-black text-slate-800">
                              Page {customerPage} of {customerTotalPages}
                            </span>
                          </div>

                          <button
                            onClick={() => setCustomerPage(prev => Math.min(customerTotalPages, prev + 1))}
                            disabled={customerPage >= customerTotalPages}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                          >
                            Next
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto overflow-y-auto max-h-[62vh] relative">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-2xs">
                          <tr className="bg-slate-100 border-b border-slate-250 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                            {isAdmin && (
                              <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 w-12">
                                <input
                                  type="checkbox"
                                  checked={filteredLeads.length > 0 && selectedCustIds.length === filteredLeads.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCustIds(filteredLeads.map(l => l.id || l.lead_id).filter(Boolean))
                                    } else {
                                      setSelectedCustIds([])
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
                                />
                              </th>
                            )}
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Date</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Name</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Company Name</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Sales Manager</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Team Lead</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Sales Executive</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Location</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Category</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3">Product</th>
                            <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 text-center">Assignment Status</th>
                            {isAdmin && <th className="sticky top-0 bg-slate-100 z-20 px-4 py-3 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {paginatedLeads.length === 0 ? (
                            <tr>
                              <td colSpan="11" className="text-center py-12 text-slate-400 font-semibold italic">No lead records found</td>
                            </tr>
                          ) : (
                            paginatedLeads.map((lead, li) => {
                              const leadId = lead.id || lead.lead_id
                              const execName = (lead.sales_executive || lead.assigned_to || '').trim()
                              const isDirectTL = isPersonTeamLead(execName) || (lead.team_lead_name && isPersonTeamLead(lead.team_lead_name) && (!execName || execName === lead.team_lead_name))
                              const finalTL = isDirectTL ? (execName || getLeadTeamLeadName(lead)) : getLeadTeamLeadName(lead)
                              const hasOwner = isDirectTL ? true : !!(lead.sales_executive || lead.assigned_to || lead.assigned_to_email || lead.employee_code)

                              return (
                                <tr
                                  key={`${leadId}_${li}`}
                                  className={`transition ${
                                    isDirectTL
                                      ? 'bg-amber-50/45 hover:bg-amber-100/60 border-l-4 border-l-amber-500 shadow-2xs'
                                      : 'hover:bg-slate-50/60'
                                  }`}
                                >
                                  {isAdmin && (
                                    <td className="px-4 py-3">
                                      <input
                                        type="checkbox"
                                        checked={selectedCustIds.includes(leadId)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedCustIds(prev => [...prev, leadId])
                                          } else {
                                            setSelectedCustIds(prev => prev.filter(id => id !== leadId))
                                          }
                                        }}
                                        className="rounded border-slate-300 text-[#832D51] focus:ring-[#832D51] cursor-pointer"
                                      />
                                    </td>
                                  )}
                                  <td className="px-4 py-3 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                                    {formatDDMMYYYY(lead.date || lead.created_at)}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-900">
                                    {lead.name || lead.contact_name}
                                  </td>
                                  <td className="px-4 py-3 text-slate-650">
                                    {lead.company_name || lead.company}
                                  </td>
                                  <td className="px-4 py-3 text-[#3a7d63] font-bold">
                                    {getLeadManagerName(lead)}
                                  </td>
                                  <td className="px-4 py-3 text-indigo-700 font-bold">
                                    {finalTL && finalTL !== 'Unassigned' ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        {isDirectTL && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase border border-amber-250 shadow-2xs">
                                            TL Direct
                                          </span>
                                        )}
                                        {finalTL}
                                      </span>
                                    ) : (
                                      'Unassigned'
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-slate-900 font-bold">
                                    {isDirectTL ? (
                                      <span className="text-slate-400 italic font-semibold text-[11px]">—</span>
                                    ) : hasOwner ? (
                                      lead.sales_executive || lead.assigned_to
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                        NOT ASSIGNED
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-slate-550">
                                    {lead.location || lead.city || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${(lead.category || 'Warm').toLowerCase() === 'hot'
                                        ? 'bg-red-50 text-red-700 border border-red-100'
                                        : (lead.category || 'Warm').toLowerCase() === 'warm'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                                      }`}>
                                      {lead.category || 'Warm'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {lead.product_name || lead.product}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${!hasOwner
                                        ? 'bg-slate-50 text-slate-500 border-slate-200'
                                        : (lead.reassigned_at ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-250')
                                      }`}>
                                      {!hasOwner ? 'Not Assigned' : (lead.reassigned_at ? 'Reassigned' : 'Assigned')}
                                    </span>
                                  </td>
                                  {isAdmin && (
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedCustIds([leadId])
                                          setSelectedExecutiveId(lead.employee_id || '')
                                          setIsAssignModalOpen(true)
                                        }}
                                        className="px-2.5 py-1 bg-[#832D51] text-white hover:bg-[#6c2442] rounded-md text-[10px] font-black shadow-2xs transition cursor-pointer"
                                      >
                                        {hasOwner ? 'Reassign' : 'Assign'}
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION BAR FOR LEADS (10 ROWS PER PAGE) */}
                    {sortedLeads.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200/80">
                        <div className="text-xs text-slate-500 font-medium">
                          Showing <span className="font-black text-slate-900">{Math.min((leadPage - 1) * ITEMS_PER_PAGE + 1, sortedLeads.length)}</span> to <span className="font-black text-slate-900">{Math.min(leadPage * ITEMS_PER_PAGE, sortedLeads.length)}</span> of <span className="font-black text-slate-900">{sortedLeads.length.toLocaleString()}</span> records
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setLeadPage(prev => Math.max(1, prev - 1))}
                            disabled={leadPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                          >
                            <ChevronLeft className="size-3.5" />
                            Previous
                          </button>

                          <div className="flex items-center gap-1 px-2">
                            <span className="text-xs font-black text-slate-800">
                              Page {leadPage} of {leadTotalPages}
                            </span>
                          </div>

                          <button
                            onClick={() => setLeadPage(prev => Math.min(leadTotalPages, prev + 1))}
                            disabled={leadPage >= leadTotalPages}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                          >
                            Next
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity">
          <div className="h-full w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/25 text-[#832D51]">
                  <Building2 className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedCust.customer_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedCust.company_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCust(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Assignment Hierarchy
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Sales Manager:</span>
                  <span className="text-slate-900 font-black">{selectedCust.manager_name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Sales Executive:</span>
                  <span className="text-slate-900 font-black">{selectedCust.executive_name || 'Unassigned'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Product / Service:</span>
                  <span className="text-slate-900 font-bold">{selectedCust.product}</span>
                </div>
                {!isAdmin && (
                  <div className="flex justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Contract / Deal Value:</span>
                    <span className="text-[#832D51] font-black text-sm">₹{(selectedCust.amount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Account Status:</span>
                  <span className="text-emerald-700 font-black">{selectedCust.status}</span>
                </div>

                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Onboarding Date:</span>
                  <span className="text-slate-900 font-bold">{selectedCust.date || 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Customer ID:</span>
                  <span className="text-slate-400 font-mono text-[10px]">{selectedCust.customer_id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Modal */}
      {isAssignModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {activeTab === 'leads' ? 'Assign Selected Leads' : 'Assign Selected Customers'}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Select an active Sales Executive to own these {selectedCustIds.length} {activeTab === 'leads' ? 'leads' : 'customers'}.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Active Sales Executive
              </label>
              <select
                value={selectedExecutiveId}
                onChange={(e) => setSelectedExecutiveId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#832D51] cursor-pointer"
              >
                <option value="">-- Select Active Executive --</option>
                {activeExecutives.map(exec => (
                  <option key={exec.employee_id || exec.id} value={exec.employee_id || exec.id}>
                    {exec.name} ({exec.employee_code || 'No Code'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedExecutiveId || assigning}
                onClick={async () => {
                  setAssigning(true)
                  try {
                    const isLeads = activeTab === 'leads'
                    const res = isLeads
                      ? await crmAPI.reassignLeads({
                        lead_ids: selectedCustIds,
                        new_employee_id: selectedExecutiveId
                      })
                      : await customerAPI.reassignCustomers({
                        customer_ids: selectedCustIds,
                        new_employee_id: selectedExecutiveId
                      })
                    if (res && (res.success || res.data)) {
                      showToast(`Successfully reassigned ${selectedCustIds.length} ${isLeads ? 'leads' : 'customers'}`, 'success')
                      setSelectedCustIds([])
                      setIsAssignModalOpen(false)
                      loadCustomerDirectory()
                    } else {
                      showToast(res?.message || 'Reassignment failed', 'error')
                    }
                  } catch (err) {
                    console.error('Reassignment error:', err)
                    const errorMsg = err?.detail || err?.message || err?.error || "Failed to complete reassignment"
                    showToast(errorMsg, 'error')
                  } finally {
                    setAssigning(false)
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 transition cursor-pointer"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CeoCustomers
