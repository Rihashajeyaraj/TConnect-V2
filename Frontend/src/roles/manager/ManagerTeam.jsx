// Sales Manager Team & Reports Module
import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Filter,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Award,
  Calendar,
  TrendingUp,
  DollarSign,
  UserCheck,
  FileText,
  AlertCircle,
  MessageSquare,
  CheckCircle,
  RefreshCw,
  Send,
  PhoneCall,
  UserPlus,
  Star,
  Target,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table,
  Eye,
  X,
  XCircle,
} from 'lucide-react'
import { hrmsAPI, reportAPI, attendanceAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate, getLeaveRequestDays } from '../../utils/dateUtils.js'
import { collectManagerSubordinates } from '../../utils/managerScoping.js'

const DEFAULT_EOD_REPORTS = []

import EmployeeProfileModal from '../../common/EmployeeProfileModal.jsx'

const getStoredUser = () => {
  try {
    const u = localStorage.getItem('user') || localStorage.getItem('tc_user')
    return u ? JSON.parse(u) : {}
  } catch (e) { return {} }
}

export default function ManagerTeam() {
  const { showToast } = useToast()

  // View Mode State: 'table' (default) or 'cards'
  const [viewMode, setViewMode] = useState('table')

  // Employee Profile Card Modal State
  const [viewingEmpProfile, setViewingEmpProfile] = useState(null)

  // Search & Filter State (EOD Reports)
  const [isTLOnlyMode, setIsTLOnlyMode] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTL, setSelectedTL] = useState('All')
  const [selectedSE, setSelectedSE] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedDateFilter, setSelectedDateFilter] = useState('All') // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom Date'
  const [customDateInput, setCustomDateInput] = useState('')

  // Expanded report cards state & modal state
  const [expandedCards, setExpandedCards] = useState({})
  const [ackComments, setAckComments] = useState({})
  const [selectedReportModal, setSelectedReportModal] = useState(null)

  const mgrUser = getStoredUser()
  const mgrEmail = (mgrUser.email || '').toLowerCase().trim()

  // EOD Reports List & Executives with Local Caching
  const [reports, setReports] = useState(() => {
    try {
      const cached = localStorage.getItem(`tc_cached_reports_${mgrEmail}`)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [executives, setExecutives] = useState(() => {
    try {
      const cached = localStorage.getItem(`tc_cached_team_executives_${mgrEmail}`)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(`tc_cached_reports_${mgrEmail}`)
      return !cached
    } catch { return true }
  })

  // Team Leave & Permission Requests State
  const [teamLeaveRequests, setTeamLeaveRequests] = useState(() => {
    try {
      const cached = localStorage.getItem(`tc_cached_team_leaves_${mgrEmail}`)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [activeTab, setActiveTab] = useState(null) // 'attendance' | 'permissions' | null
  const [teamLeads, setTeamLeads] = useState([])
  const [allSubordinates, setAllSubordinates] = useState([])
  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    try {
      const cached = localStorage.getItem(`tc_cached_team_attendance_logs_${mgrEmail}`)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })


  const isManagerUser = React.useCallback((emp) => {
    if (!emp) return false

    let name = ''
    let email = ''
    let role = ''
    let code = ''

    if (typeof emp === 'string') {
      name = emp.toLowerCase().trim()
      email = emp.toLowerCase().trim()
    } else {
      name = String(emp.name || emp.full_name || emp.employeeName || emp.executive || emp.executive_name || emp.employee_name || '').toLowerCase().trim()
      email = String(emp.email || emp.user_email || emp.executiveEmail || emp.executive_email || '').toLowerCase().trim()
      role = String(emp.role || emp.designation || '').toLowerCase().trim()
      code = String(emp.employee_code || emp.employee_id || emp.emp_code || emp.user_id || '').toLowerCase().trim()
    }

    const myEmail = (mgrUser.email || '').toLowerCase().trim()
    const myName = (mgrUser.name || mgrUser.full_name || '').toLowerCase().trim()
    const myId = String(mgrUser.id || mgrUser.employee_id || mgrUser.user_id || '').toLowerCase().trim()

    if (myEmail && email && (email === myEmail || email.includes(myEmail))) return true
    if (myId && code && code === myId) return true
    if (myName && name && (name === myName || name.includes(myName) || myName.includes(name))) return true

    if (role && (role.includes('manager') || role.includes('admin') || role.includes('ceo') || role.includes('founder') || role.includes('director'))) {
      return true
    }

    if (name.includes('manager') || name.includes('admin') || name.includes('ceo') || name.includes('jeeva')) {
      return true
    }

    return false
  }, [mgrUser])

  // Attendance Modal Filters
  const [attendanceTLFilter, setAttendanceTLFilter] = useState('All')
  const [attendanceExecutiveFilter, setAttendanceExecutiveFilter] = useState('All')
  const [attendanceTypeFilter, setAttendanceTypeFilter] = useState('All')

  const teamLogs = React.useMemo(() => {
    const logs = []
    const pool = allSubordinates.length > 0 ? allSubordinates : executives
    attendanceLogs.forEach(log => {
      const logEmpCode = String(log.employee_id || log.employee_code || log.emp_code || log.user_id || '').toLowerCase().trim();
      const logEmail = String(log.email || log.user_email || '').toLowerCase().trim();
      const logName = String(log.name || log.employee_name || '').toLowerCase().trim();
      const logRole = String(log.role || log.designation || '').toLowerCase().trim();

      // Exclude Managers & Self from team attendance logs
      if (isManagerUser({ name: logName, email: logEmail, employee_code: logEmpCode, role: logRole })) {
        return;
      }

      // Find if this log belongs to any assigned Team Lead or Executive
      const exec = pool.find(ex => {
        if (isManagerUser(ex)) return false;
        const targetEmpCode = String(ex.employee_code || ex.employee_id || '').toLowerCase().trim();
        const targetEmail = String(ex.email || '').toLowerCase().trim();
        const targetName = String(ex.name || '').toLowerCase().trim();

        if (targetEmpCode && logEmpCode && targetEmpCode === logEmpCode) return true;
        if (targetEmail && logEmail && targetEmail === logEmail) return true;
        if (targetName && logName && (logName.includes(targetName) || targetName.includes(logName))) return true;

        const targetFirstName = targetName.split(/\s+/)[0];
        const logFirstName = logName.split(/\s+/)[0];
        if (targetFirstName && logFirstName && targetFirstName.length > 2 && targetFirstName === logFirstName) return true;

        return false;
      });

      if (exec && !isManagerUser(exec)) {
        const checkInAddr = log.check_in_address || log.loginLocation || log.location || '';
        const isClientVisit = checkInAddr.startsWith("CLIENT_VISIT_DESTINATION:::");
        
        logs.push({
          ...log,
          employeeName: exec.name,
          employeeCode: exec.employee_code,
          employeeRole: exec.role || 'Executive',
          reportingManagerName: exec.reporting_manager_name || '',
          attendanceType: isClientVisit ? "Client Visit" : "Office",
          isClientVisit,
        });
      }
    });
    return logs;
  }, [attendanceLogs, allSubordinates, executives, isManagerUser]);

  const filteredTeamLogs = React.useMemo(() => {
    return teamLogs.filter(log => {
      const matchesType = attendanceTypeFilter === 'All' || log.attendanceType === attendanceTypeFilter;

      if (isTLOnlyMode) {
        const tlNames = teamLeads.map(t => (t.name || '').toLowerCase().trim())
        const tlEmails = teamLeads.map(t => (t.email || '').toLowerCase().trim())
        const empName = String(log.employeeName || '').toLowerCase().trim()
        const empEmail = String(log.email || '').toLowerCase().trim()

        const isBelongingToTL = tlNames.some(tn => tn && (empName.includes(tn) || tn.includes(empName))) || (empEmail && tlEmails.includes(empEmail))
        if (teamLeads.length > 0 && !isBelongingToTL) return false

        if (attendanceTLFilter !== 'All') {
          const targetTL = attendanceTLFilter.toLowerCase().trim()
          const matchesTL = empName.includes(targetTL) || empEmail.includes(targetTL)
          if (!matchesTL) return false
        }
        return matchesType
      }

      let matchesTL = attendanceTLFilter === 'All'
      if (!matchesTL) {
        const targetTL = attendanceTLFilter.toLowerCase().trim()
        const empName = String(log.employeeName || '').toLowerCase()
        const empCode = String(log.employeeCode || '').toLowerCase()
        const repTL = String(log.reportingManagerName || '').toLowerCase()
        matchesTL = empName.includes(targetTL) || empCode === targetTL || repTL.includes(targetTL)
      }

      let matchesExec = attendanceExecutiveFilter === 'All'
      if (!matchesExec) {
        const target = attendanceExecutiveFilter.toLowerCase().trim();
        const empName = String(log.employeeName || '').toLowerCase();
        const empCode = String(log.employeeCode || '').toLowerCase();
        matchesExec = empName.includes(target) || target.includes(empName) || empCode === target;
      }
      return matchesType && matchesTL && matchesExec;
    });
  }, [teamLogs, attendanceTypeFilter, attendanceTLFilter, attendanceExecutiveFilter, isTLOnlyMode, teamLeads]);

  // Leave modal filter state
  const [leaveTLFilter, setLeaveTLFilter] = useState('All')
  const [leaveExecutiveFilter, setLeaveExecutiveFilter] = useState('All')
  const [leaveDateTab, setLeaveDateTab] = useState('All Time')
  const [leaveFromDate, setLeaveFromDate] = useState('')
  const [leaveToDate, setLeaveToDate] = useState('')

  const handleLeaveDateTab = (tab) => {
    setLeaveDateTab(tab)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (tab === 'Today') {
      setLeaveFromDate(todayStr)
      setLeaveToDate(todayStr)
    } else if (tab === 'Yesterday') {
      const yest = new Date(now)
      yest.setDate(yest.getDate() - 1)
      const yestStr = yest.toISOString().split('T')[0]
      setLeaveFromDate(yestStr)
      setLeaveToDate(yestStr)
    } else if (tab === 'This Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      setLeaveFromDate(firstDay)
      setLeaveToDate(todayStr)
    } else if (tab === 'All Time') {
      setLeaveFromDate('')
      setLeaveToDate('')
    }
  }

  // Filter leave requests to include assigned Team Leads & Executives
  const filteredLeaveRequests = React.useMemo(() => {
    const pool = allSubordinates.length > 0 ? allSubordinates : executives
    return teamLeaveRequests.filter((req) => {
      if (!req) return false
      const reqRole = String(req.role || "").toLowerCase();
      const reqEmail = String(req.executive_email || req.email || "").toLowerCase().trim();
      const reqCode = String(req.employee_code || req.employee_id || req.emp_code || "").toLowerCase().trim();
      const reqName = String(req.executive_name || req.executive || req.employee_name || "").toLowerCase().trim();

      // Exclude Managers & Self
      if (isManagerUser({ name: reqName, email: reqEmail, employee_code: reqCode, role: reqRole })) {
        return false;
      }

      if (isTLOnlyMode) {
        const tlNames = teamLeads.map(t => (t.name || '').toLowerCase().trim())
        const tlEmails = teamLeads.map(t => (t.email || '').toLowerCase().trim())
        const isBelongingToTL = tlNames.some(tn => tn && (reqName.includes(tn) || tn.includes(reqName))) || (reqEmail && tlEmails.includes(reqEmail))
        if (teamLeads.length > 0 && !isBelongingToTL) return false

        if (leaveTLFilter !== 'All') {
          const targetTL = leaveTLFilter.toLowerCase().trim()
          const matchesTL = reqName.includes(targetTL) || reqEmail.includes(targetTL)
          if (!matchesTL) return false
        }
      } else {
        const matchedSub = pool.find((ex) => {
          const exEmail = String(ex.email || "").toLowerCase().trim();
          const exCode = String(ex.employee_code || ex.employee_id || ex.emp_code || "").toLowerCase().trim();
          const exName = String(ex.name || "").toLowerCase().trim();
          return (
            (exEmail && reqEmail === exEmail) ||
            (exCode && reqCode === exCode) ||
            (exName && (reqName.includes(exName) || exName.includes(reqName)))
          );
        });
        if (!matchedSub && pool.length > 0) return false;

        // Team Lead Filter check
        if (leaveTLFilter !== 'All') {
          const targetTL = leaveTLFilter.toLowerCase().trim();
          const reqRepTL = String(matchedSub?.reporting_manager_name || req.team_lead_name || "").toLowerCase();
          const matchesTL =
            reqName.includes(targetTL) ||
            targetTL.includes(reqName) ||
            reqCode === targetTL ||
            reqEmail === targetTL ||
            reqRepTL.includes(targetTL);
          if (!matchesTL) return false;
        }

        // Executive Filter check
        if (leaveExecutiveFilter !== 'All') {
          const targetVal = leaveExecutiveFilter.toLowerCase().trim();
          const matchesExec =
            reqName.includes(targetVal) ||
            targetVal.includes(reqName) ||
            reqCode === targetVal ||
            reqEmail === targetVal;
          if (!matchesExec) return false;
        }
      }

      // Date Filter check
      const rDateStr = String(req.start_date || req.leave_date || req.date || req.from_date || (req.created_at ? String(req.created_at).split('T')[0] : '') || '');
      if (rDateStr) {
        let cleanDate = rDateStr.split('T')[0].split(' ')[0];
        if (cleanDate.includes('/')) {
          const parts = cleanDate.split('/');
          if (parts.length === 3) {
            if (parts[2].length === 4) cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            else if (parts[0].length === 4) cleanDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
        if (leaveFromDate && cleanDate < leaveFromDate) return false;
        if (leaveToDate && cleanDate > leaveToDate) return false;
      }

      return true;
    });
  }, [teamLeaveRequests, allSubordinates, executives, leaveTLFilter, leaveExecutiveFilter, leaveFromDate, leaveToDate, isTLOnlyMode, teamLeads, isManagerUser])

  useEffect(() => {
    attendanceAPI.getLeaveRequests()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || [])
        if (Array.isArray(raw)) {
          setTeamLeaveRequests(raw)
          try {
            localStorage.setItem(`tc_cached_team_leaves_${mgrEmail}`, JSON.stringify(raw))
          } catch (e) {}
        }
      })
      .catch(() => null)
  }, [mgrEmail])

  const handleUpdateLeaveStatus = async (reqId, newStatus) => {
    const comment = ackComments[reqId] || `Leave request ${newStatus.toLowerCase()} by Sales Manager.`

    try {
      await attendanceAPI.updateLeaveStatus(reqId, newStatus, comment)
      setTeamLeaveRequests((prev) => prev.map((r) => (r.id === reqId || r.leave_id === reqId ? { ...r, status: newStatus, manager_comment: comment } : r)))
      showToast(`Leave request ${newStatus.toLowerCase()} successfully!`, newStatus === "Approved" ? "success" : "info")
    } catch (err) {
      showToast(`Failed to update leave status: ${err?.message || 'Server Error'}`, "error")
    }
  }



  // Process employees to extract Team Leads & Sales Executives
  const processSubordinates = (rawEmployees) => {
    const mgrUser = getStoredUser()
    const subordinates = collectManagerSubordinates(rawEmployees, mgrUser)
    const listToProcess = subordinates.length > 0 ? subordinates : rawEmployees

    const tlsMap = new Map()
    const execsMap = new Map()
    const allSubMap = new Map()

    listToProcess.forEach((e, idx) => {
      if (isManagerUser(e)) return // Skip all managers, admins, CEOs, and Jeeva kumar!

      const roleLower = String(e.role || e.designation || '').toLowerCase()
      const nameLower = String(e.name || e.full_name || e.executive || e.employee_name || '').toLowerCase()
      const isDrTwite = nameLower.includes('twite') || nameLower.includes('dr.') || nameLower.includes('executive')
      const isTL = (roleLower.includes('team lead') || roleLower.includes('tl') || roleLower.includes('lead')) && !isDrTwite

      const empObj = {
        id: e.id || e.employee_id || `emp_${idx}`,
        name: e.name || e.full_name || (isTL ? 'Team Lead' : 'Sales Executive'),
        email: e.email || '',
        employee_code: e.employee_code || e.employee_id || e.emp_code || `EMP${String(idx + 101).padStart(3, '0')}`,
        role: e.role || (isTL ? 'Team Lead' : 'Sales Executive'),
        reporting_manager_name: e.reporting_manager_name || e.reporting_manager || e.manager_name || '',
        reporting_manager_email: e.reporting_manager_email || e.manager_email || '',
      }

      allSubMap.set(empObj.email || empObj.name, empObj)

      if (isTL) {
        tlsMap.set(empObj.email || empObj.name, empObj)
      } else {
        execsMap.set(empObj.email || empObj.name, empObj)
      }
    })

    // Extract any Team Lead names from raw employees reporting_manager_name
    rawEmployees.forEach((e) => {
      const rName = String(e.reporting_manager_name || e.reporting_manager || '').trim()
      const rEmail = String(e.reporting_manager_email || '').trim()
      if (rName && !isManagerUser({ name: rName, email: rEmail, role: '' })) {
        const rLower = rName.toLowerCase()
        if (
          rLower !== 'not assigned' &&
          rLower !== 'none' &&
          rLower !== 'n/a' &&
          rLower !== 'null' &&
          !rLower.includes('twite') &&
          !rLower.includes('dr.') &&
          !rLower.includes('executive')
        ) {
          if (!tlsMap.has(rEmail || rName)) {
            const tlObj = {
              id: `tl_${tlsMap.size}`,
              name: rName,
              email: rEmail,
              employee_code: 'TL',
              role: 'Team Lead',
            }
            tlsMap.set(rEmail || rName, tlObj)
            allSubMap.set(rEmail || rName, tlObj)
          }
        }
      }
    })

    const finalTLs = Array.from(tlsMap.values()).filter(t => {
      if (isManagerUser(t)) return false
      const tName = (t.name || t.full_name || '').toLowerCase()
      if (tName.includes('twite') || tName.includes('dr.') || tName.includes('executive')) return false
      return true
    })
    const finalExecs = Array.from(execsMap.values()).filter(e => !isManagerUser(e))
    const finalAll = Array.from(allSubMap.values()).filter(a => !isManagerUser(a))

    setTeamLeads(finalTLs)
    setExecutives(finalExecs.length > 0 ? finalExecs : finalAll)
    setAllSubordinates(finalAll)
    try {
      localStorage.setItem(`tc_cached_team_executives_${mgrEmail}`, JSON.stringify(finalAll))
    } catch (e) {}
  }

  useEffect(() => {
    hrmsAPI.getEmployees().then((res) => {
      const raw = Array.isArray(res) ? res : res?.data || []
      if (raw && raw.length > 0) {
        processSubordinates(raw)
        return
      }
      fallbackLoadExecs()
    }).catch(() => fallbackLoadExecs())
  }, [mgrEmail])

  const fallbackLoadExecs = () => {
    try {
      const savedUsersStr = localStorage.getItem('tc_app_users')
      if (savedUsersStr) {
        const parsed = JSON.parse(savedUsersStr)
        if (Array.isArray(parsed) && parsed.length > 0) {
          processSubordinates(parsed)
          return
        }
      }
    } catch (e) {}

    setTeamLeads([])
    setExecutives([])
    setAllSubordinates([])
  }

  // Executives list dynamically filtered by selected Team Lead
  const availableExecutivesForEod = React.useMemo(() => {
    if (selectedTL === 'All') return executives
    const targetTL = selectedTL.toLowerCase().trim()
    const matched = executives.filter((ex) => {
      const rName = (ex.reporting_manager_name || '').toLowerCase()
      const rEmail = (ex.reporting_manager_email || '').toLowerCase()
      return rName.includes(targetTL) || rEmail.includes(targetTL)
    })
    return matched.length > 0 ? matched : executives
  }, [executives, selectedTL])

  const availableExecutivesForLeave = React.useMemo(() => {
    if (leaveTLFilter === 'All') return executives
    const targetTL = leaveTLFilter.toLowerCase().trim()
    const matched = executives.filter((ex) => {
      const rName = (ex.reporting_manager_name || '').toLowerCase()
      const rEmail = (ex.reporting_manager_email || '').toLowerCase()
      return rName.includes(targetTL) || rEmail.includes(targetTL)
    })
    return matched.length > 0 ? matched : executives
  }, [executives, leaveTLFilter])

  const availableExecutivesForAttendance = React.useMemo(() => {
    if (attendanceTLFilter === 'All') return executives
    const targetTL = attendanceTLFilter.toLowerCase().trim()
    const matched = executives.filter((ex) => {
      const rName = (ex.reporting_manager_name || '').toLowerCase()
      const rEmail = (ex.reporting_manager_email || '').toLowerCase()
      return rName.includes(targetTL) || rEmail.includes(targetTL)
    })
    return matched.length > 0 ? matched : executives
  }, [executives, attendanceTLFilter])

  const resolveEmployeeCode = (seName, seEmail, rawCode) => {
    if (rawCode && String(rawCode).trim() !== '' && String(rawCode).trim() !== 'EMP000012') {
      return String(rawCode).trim();
    }

    const n = (seName || '').toLowerCase().trim()
    const e = (seEmail || '').toLowerCase().trim()

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
    } catch (err) { }

    return 'EMP000012'
  }

  const formatDateToYYYYMMDD = (dateStr) => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    const parts = trimmed.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  }

  const formatTelemetryTime = (raw) => {
    if (!raw || raw === '—' || raw === 'None' || raw === 'N/A') return null
    try {
      const s = String(raw).trim()
      if (s.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) return s
      if (s.includes('T') || s.includes('-')) {
        const d = new Date(s)
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        }
      }
      const match = s.match(/(\d{1,2}):(\d{2})/)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = match[2]
        const ampm = h >= 12 ? 'PM' : 'AM'
        h = h % 12 || 12
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`
      }
      return s
    } catch {
      return raw
    }
  }

  const calculateDuration = (inTimeStr, outTimeStr) => {
    try {
      if (!inTimeStr) return '—'
      const now = new Date()
      const parseTime = (timeStr) => {
        if (!timeStr || timeStr === '—' || timeStr === 'In Progress (Active)') return null
        const d = new Date(timeStr)
        if (!isNaN(d.getTime())) return d
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
        if (match) {
          let h = parseInt(match[1], 10)
          const m = parseInt(match[2], 10)
          const ampm = match[3] ? match[3].toUpperCase() : ''
          if (ampm === 'PM' && h < 12) h += 12
          if (ampm === 'AM' && h === 12) h = 0
          const res = new Date(now)
          res.setHours(h, m, 0, 0)
          return res
        }
        return null
      }

      const tIn = parseTime(inTimeStr)
      const tOut = parseTime(outTimeStr) || now
      if (!tIn) return '—'

      const diffMs = tOut - tIn
      if (diffMs < 0) return '—'
      const diffMins = Math.floor(diffMs / 60000)
      const h = Math.floor(diffMins / 60)
      const m = diffMins % 60
      return `${h}h ${m}m`
    } catch {
      return '—'
    }
  }

  const getTelemetryForReport = (r, attLogs = []) => {
    let loginTime = r.loginTime && r.loginTime !== '—' && r.loginTime !== 'None' && r.loginTime !== 'N/A' ? formatTelemetryTime(r.loginTime) : null
    let loginLocation = r.loginLocation && r.loginLocation !== '—' && r.loginLocation !== 'None' && r.loginLocation !== 'N/A' ? r.loginLocation : null
    let logoutTime = r.logoutTime && r.logoutTime !== '—' && r.logoutTime !== 'None' && r.logoutTime !== 'N/A' ? formatTelemetryTime(r.logoutTime) : null
    let logoutLocation = r.logoutLocation && r.logoutLocation !== '—' && r.logoutLocation !== 'None' && r.logoutLocation !== 'N/A' ? r.logoutLocation : null
    let dayLogs = []

    if (Array.isArray(attLogs) && attLogs.length > 0) {
      const repDateStr = formatDateToYYYYMMDD(r.date)
      const targetEmpCode = String(r.employee_code || r.employee_id || '').toLowerCase().trim()
      const targetEmail = String(r.executiveEmail || r.email || '').toLowerCase().trim()
      const targetName = String(r.executive || r.name || '').toLowerCase().trim()

      dayLogs = attLogs.filter((log) => {
        const logDate = formatDateToYYYYMMDD(log.attendance_date || log.date || log.created_at || log.check_in_time)
        if (repDateStr && logDate && logDate !== repDateStr) return false

        const logEmpCode = String(log.employee_id || log.employee_code || log.emp_code || log.user_id || '').toLowerCase().trim()
        const logEmail = String(log.email || log.user_email || '').toLowerCase().trim()
        const logName = String(log.name || log.employee_name || '').toLowerCase().trim()

        if (targetEmpCode && logEmpCode && targetEmpCode === logEmpCode) return true
        if (targetEmail && logEmail && targetEmail === logEmail) return true
        if (targetName && logName && (logName.includes(targetName) || targetName.includes(logName))) return true

        const targetFirstName = targetName.split(/\s+/)[0]
        const logFirstName = logName.split(/\s+/)[0]
        if (targetFirstName && logFirstName && targetFirstName.length > 2 && targetFirstName === logFirstName) return true

        return false
      })

      if (dayLogs.length > 0) {
        // 1. FIRST LOGIN ON THAT DAY
        const firstLog = dayLogs[0]
        const rawIn = firstLog.check_in_time || firstLog.punch_in_time || firstLog.clockIn || firstLog.loginTime || firstLog.login_time
        if (!loginTime && rawIn) {
          loginTime = formatTelemetryTime(rawIn)
        }
        if (!loginLocation) {
          loginLocation = firstLog.check_in_address || firstLog.loginLocation || firstLog.location || firstLog.work_location || firstLog.gpsLocation
        }

        // 2. LAST LOGOUT ON THAT DAY
        const logsWithOut = dayLogs.filter(l => l.check_out_time || l.punch_out_time || l.clockOut || (l.logoutTime && l.logoutTime !== '—' && l.logoutTime !== 'N/A'))
        if (logsWithOut.length > 0) {
          const lastLog = logsWithOut[logsWithOut.length - 1]
          const rawOut = lastLog.check_out_time || lastLog.punch_out_time || lastLog.clockOut || lastLog.logoutTime
          if (rawOut) {
            logoutTime = formatTelemetryTime(rawOut)
          }
          logoutLocation = lastLog.check_out_address || lastLog.logoutLocation || lastLog.location || lastLog.gpsLocation || loginLocation
        } else {
          if (!logoutTime) {
            logoutTime = 'In Progress (Active)'
            logoutLocation = loginLocation || 'Active at Field Site'
          }
        }
      }
    }

    if (!loginTime) loginTime = '09:00 AM'
    if (!loginLocation) loginLocation = 'Office / Field Check-In'
    if (!logoutTime) logoutTime = '06:00 PM'
    if (!logoutLocation) logoutLocation = loginLocation || 'Office / Field Site'

    return { loginTime, loginLocation, logoutTime, logoutLocation, dayLogs }
  }

  const normalizeReport = (r, idx = 0, attLogs = []) => {
    if (!r) return null
    const seName = r.executive || r.executiveName || r.assigned_to || r.name || 'Abi hastro'
    const seEmail = r.executiveEmail || r.assigned_to_email || r.email || 'abi@gmail.com'
    const empCode = resolveEmployeeCode(seName, seEmail, r.employee_code || r.employee_id)
    const repDate = r.date || '05/08/2026'

    const telemetry = getTelemetryForReport({ ...r, executive: seName, executiveEmail: seEmail, employee_code: empCode, date: repDate }, attLogs)

    return {
      id: r.id || `eod_${1001 + idx}`,
      executive: seName,
      executiveEmail: seEmail,
      employee_code: empCode,
      designation: r.designation || 'Sales Executive',
      date: repDate,
      submittedAt: r.submittedAt || r.time || '05:30 PM',
      loginTime: telemetry.loginTime,
      logoutTime: telemetry.logoutTime,
      loginLocation: telemetry.loginLocation,
      logoutLocation: telemetry.logoutLocation,
      seRemarks: r.seRemarks || r.se_remarks || r.remarks || r.executiveRemarks || 'Completed all daily field client activities.',
      sessions: telemetry.dayLogs || [],
      status: r.status || 'Submitted',
      callsMade: parseInt(r.callsMade || r.calls || 0),
      visitsCompleted: parseInt(r.visitsCompleted || r.visits || 0),
      leadsGenerated: parseInt(r.leadsGenerated || r.leads || 0),
      clientsInterested: parseInt(r.clientsInterested || r.interested || 0),
      followupsScheduled: parseInt(r.followupsScheduled || r.followups || 0),
      dealsClosed: parseInt(r.dealsClosed || r.deals || 0),
      highlights: r.highlights || r.keyHighlights || 'Completed daily field client meetings.',
      blockers: (() => {
        const b = r.blockers || r.issues || 'None'
        if (typeof b === 'string' && (b.startsWith('Executive:') || b.startsWith('Email:') || b.startsWith('EMP:') || b.startsWith('Manager:'))) {
          return 'None'
        }
        return b
      })(),
      nextDayPlan: r.nextDayPlan || r.tomorrowPlan || 'Follow up with interested client accounts.',
      photo: r.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seName}`,
      phone: r.phone || '+91 98765 43210',
      managerAck: !!r.managerAck,
      managerComment: r.managerComment || '',
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    let combined = []
    let attLogs = []

    try {
      const apiRes = await reportAPI.getEODReports()
      const apiData = Array.isArray(apiRes) ? apiRes : (apiRes?.data || [])
      if (Array.isArray(apiData)) combined = [...combined, ...apiData]
    } catch (e) { console.error("Error fetching EOD reports", e) }

    try {
      const attRes = await attendanceAPI.getLogs()
      attLogs = Array.isArray(attRes) ? attRes : (attRes?.data || [])
      setAttendanceLogs(attLogs)
      try {
        localStorage.setItem(`tc_cached_team_attendance_logs_${mgrEmail}`, JSON.stringify(attLogs))
      } catch (e) {}
    } catch (e) {
      console.error("Error fetching attendance logs", e)
    }

    const keys = ['tc_eod_reports', 'tc_se_daily_reports', 'tc_daily_work_reports']
    keys.forEach((k) => {
      try {
        const itemStr = localStorage.getItem(k)
        if (itemStr) {
          const parsed = JSON.parse(itemStr)
          if (Array.isArray(parsed) && parsed.length > 0) {
            combined = [...combined, ...parsed]
          }
        }
      } catch (e) { }
    })

    const normalizedLocal = combined.map((r, idx) => normalizeReport(r, idx, attLogs)).filter(Boolean)

    const map = new Map()
    DEFAULT_EOD_REPORTS.forEach((d) => map.set(`${d.executive}_${d.date}`, d))
    normalizedLocal.forEach((l) => map.set(`${l.executive}_${l.date}`, l))

    const finalArr = Array.from(map.values())
    setReports(finalArr)
    setLoading(false)
    try {
      localStorage.setItem(`tc_cached_reports_${mgrEmail}`, JSON.stringify(finalArr))
    } catch (e) {}
  }

  useEffect(() => {
    fetchReports()
  }, [mgrEmail])

  const toggleExpandCard = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAcknowledgeReport = async (id) => {
    const comment = ackComments[id] || 'Report acknowledged by Sales Manager.'
    const updated = reports.map((r) => (r.id === id ? { ...r, managerAck: true, managerComment: comment, status: 'Acknowledged' } : r))
    setReports(updated)

    try {
      await reportAPI.acknowledgeEODReport(id, { comment })
      localStorage.setItem('tc_eod_reports', JSON.stringify(updated))
      showToast(`Acknowledged Daily Work Report for ${id}!`, 'success')
    } catch (e) {
      showToast(`Error acknowledging report: ${e.message}`, 'error')
    }
  }

  // Filtering Calculation for EOD Reports
  const filteredReports = reports.filter((r) => {
    if (!r) return false

    const repName = (r.executive || r.executive_name || '').toLowerCase().trim()
    const repEmail = (r.executiveEmail || r.executive_email || '').toLowerCase().trim()
    const repCode = (r.employee_code || r.employee_id || '').toLowerCase().trim()
    const repRole = (r.designation || r.role || '').toLowerCase().trim()

    // Exclude Managers & Self
    if (isManagerUser({ name: repName, email: repEmail, employee_code: repCode, role: repRole })) {
      return false
    }

    if (isTLOnlyMode) {
      const tlNames = teamLeads.map(t => (t.name || '').toLowerCase().trim())
      const tlEmails = teamLeads.map(t => (t.email || '').toLowerCase().trim())
      const isBelongingToTL = tlNames.some(tn => tn && (repName.includes(tn) || tn.includes(repName))) || (repEmail && tlEmails.includes(repEmail))
      if (teamLeads.length > 0 && !isBelongingToTL) return false

      if (selectedTL !== 'All') {
        const targetTL = selectedTL.toLowerCase().trim()
        const matchesTL = repName.includes(targetTL) || repEmail.includes(targetTL)
        if (!matchesTL) return false
      }
    } else {
      const pool = allSubordinates.length > 0 ? allSubordinates : executives
      const matchesExecutiveScope = pool.some((exec) => {
        const execEmail = (exec.email || '').toLowerCase().trim()
        const execCode = (exec.employee_code || '').toLowerCase().trim()
        const execName = (exec.name || '').toLowerCase().trim()

        const repEmail = (r.executiveEmail || r.executive_email || '').toLowerCase().trim()
        const repCode = (r.employee_code || r.employee_id || '').toLowerCase().trim()
        const repName = (r.executive || r.executive_name || '').toLowerCase().trim()

        return (
          (execEmail && repEmail === execEmail) ||
          (execCode && repCode === execCode) ||
          (execName && (repName.includes(execName) || execName.includes(repName)))
        )
      })

      if (pool.length > 0 && !matchesExecutiveScope) {
        return false
      }

      // Team Lead filter
      if (selectedTL !== 'All') {
        const targetTL = selectedTL.toLowerCase().trim()
        const repName = (r.executive || r.executive_name || '').toLowerCase().trim()
        const repEmail = (r.executiveEmail || r.executive_email || '').toLowerCase().trim()
        const repCode = (r.employee_code || r.employee_id || '').toLowerCase().trim()

        const matchedSub = pool.find(
          (ex) =>
            (ex.email && ex.email.toLowerCase() === repEmail) ||
            (ex.name && ex.name.toLowerCase() === repName) ||
            (ex.employee_code && ex.employee_code.toLowerCase() === repCode)
        )

        const subTLName = (matchedSub?.reporting_manager_name || '').toLowerCase()
        const matchesTL = repName.includes(targetTL) || repEmail.includes(targetTL) || subTLName.includes(targetTL)
        if (!matchesTL) return false
      }
    }

    const q = search.toLowerCase().trim()
    const seName = (r.executive || '').toLowerCase()
    const seCode = (r.employee_code || '').toLowerCase()
    const high = (r.highlights || '').toLowerCase()
    const block = (r.blockers || '').toLowerCase()
    const plan = (r.nextDayPlan || '').toLowerCase()

    const matchesSearch = !q || seName.includes(q) || seCode.includes(q) || high.includes(q) || block.includes(q) || plan.includes(q)
    const matchesStatus = selectedStatus === 'All' || String(r.status).toLowerCase() === selectedStatus.toLowerCase()

    let matchesSE = selectedSE === 'All'
    if (!matchesSE) {
      const target = selectedSE.toLowerCase()
      matchesSE = seName.includes(target) || (r.executiveEmail || '').toLowerCase().includes(target) || seCode.includes(target)
    }

    let matchesDate = true
    const reportDateStr = (r.date || r.submittedAt || '').trim()
    const today = new Date()
    const todayISO = today.toISOString().split('T')[0]
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]

    if (selectedDateFilter === 'Today') {
      matchesDate = reportDateStr.includes(todayISO) || reportDateStr === 'Today' || reportDateStr.includes(today.toLocaleDateString('en-GB'))
    } else if (selectedDateFilter === 'Yesterday') {
      matchesDate = reportDateStr.includes(yesterdayISO) || reportDateStr === 'Yesterday' || reportDateStr.includes(yesterday.toLocaleDateString('en-GB'))
    } else if (selectedDateFilter === 'This Week') {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      try {
        const rDateObj = new Date(reportDateStr)
        matchesDate = !isNaN(rDateObj.getTime()) && rDateObj >= sevenDaysAgo
      } catch { matchesDate = true }
    } else if (selectedDateFilter === 'This Month') {
      const curMonth = today.toISOString().slice(0, 7)
      matchesDate = reportDateStr.includes(curMonth) || reportDateStr.includes('August')
    } else if (selectedDateFilter === 'Custom Date' && customDateInput) {
      matchesDate = reportDateStr.includes(customDateInput)
    }

    return matchesSearch && matchesStatus && matchesSE && matchesDate
  })

  // Team Leader specific counts for Row 2 stat cards
  const tlReportsCount = React.useMemo(() => {
    if (teamLeads.length === 0) return 0
    const tlNames = new Set(teamLeads.map(t => (t.name || '').toLowerCase().trim()))
    const tlEmails = new Set(teamLeads.map(t => (t.email || '').toLowerCase().trim()))
    return reports.filter(r => {
      const repName = (r.executive || r.executive_name || '').toLowerCase().trim()
      const repEmail = (r.executiveEmail || r.executive_email || '').toLowerCase().trim()
      return tlNames.has(repName) || (repEmail && tlEmails.has(repEmail))
    }).length
  }, [reports, teamLeads])

  const tlPendingLeavesCount = React.useMemo(() => {
    if (teamLeads.length === 0) return 0
    const tlNames = new Set(teamLeads.map(t => (t.name || '').toLowerCase().trim()))
    const tlEmails = new Set(teamLeads.map(t => (t.email || '').toLowerCase().trim()))
    return teamLeaveRequests.filter(req => {
      if (!req || req.status !== 'Pending') return false
      const reqName = (req.executive_name || req.executive || req.employee_name || '').toLowerCase().trim()
      const reqEmail = (req.executive_email || req.email || '').toLowerCase().trim()
      return tlNames.has(reqName) || (reqEmail && tlEmails.has(reqEmail))
    }).length
  }, [teamLeaveRequests, teamLeads])

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* ── ROW 1: SALES EXECUTIVES OVERVIEW CARDS ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider pl-1">
          <Users className="w-3.5 h-3.5 text-slate-400" /> Sales Executives Overview
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
          {/* CARD 1: Attendance - YELLOW */}
          <div
            onClick={() => {
              setIsTLOnlyMode(false)
              setSelectedTL('All')
              setSelectedSE('All')
              setActiveTab('attendance')
            }}
            className="mgr-card p-4 rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50/50 text-amber-950 border-amber-200 hover:border-amber-400 hover:bg-amber-100/30 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80">
                EOD Attendance Reports
              </p>
              <h3 className="text-xl font-bold text-amber-950">{filteredReports.length} Reports</h3>
              <p className="text-[10px] font-normal text-amber-600/90">
                Click to view EOD attendance logs
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-300/60">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* CARD 2: Permissions - BLUE */}
          <div
            onClick={() => {
              setIsTLOnlyMode(false)
              setLeaveTLFilter('All')
              setLeaveExecutiveFilter('All')
              setActiveTab('permissions')
            }}
            className="mgr-card p-4 rounded-2xl border bg-gradient-to-br from-blue-50 to-indigo-50/50 text-blue-950 border-blue-200 hover:border-blue-400 hover:bg-blue-100/30 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-800/85">
                Leave & Permissions
              </p>
              <h3 className="text-xl font-black text-blue-950">
                {filteredLeaveRequests.filter(r => r.status === 'Pending').length} Pending
              </h3>
              <p className="text-[10px] font-semibold text-blue-600/90">
                Click to view team leave requests
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-300/60">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* CARD 3: Team Attendance - PURPLE */}
          <div
            onClick={() => {
              setIsTLOnlyMode(false)
              setAttendanceTLFilter('All')
              setAttendanceExecutiveFilter('All')
              setActiveTab('team_attendance')
            }}
            className="mgr-card p-4 rounded-2xl border bg-gradient-to-br from-purple-50 to-fuchsia-50/50 text-purple-950 border-purple-200 hover:border-purple-400 hover:bg-purple-100/30 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-purple-800/85">
                Team Attendance
              </p>
              <h3 className="text-xl font-black text-purple-950">
                {executives.length} Executives
              </h3>
              <p className="text-[10px] font-semibold text-purple-600/90">
                Click to view login/logout history
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 border border-purple-300/60">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: TEAM LEADERS CARDS WITH HEADING ── */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm tracking-tight pl-1">
          <Award className="w-4 h-4 text-amber-600" /> Team Leaders
          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
            {teamLeads.length} Assigned Leads
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
          {/* CARD 1: TEAM LEAD EOD REPORTS - EMERALD */}
          <div
            onClick={() => {
              setIsTLOnlyMode(true)
              setSelectedTL('All')
              setSelectedSE('All')
              setActiveTab('attendance')
            }}
            className="mgr-card p-4 rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50/50 text-emerald-950 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/30 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80">
                Team Lead EOD Reports
              </p>
              <h3 className="text-xl font-bold text-emerald-950">{tlReportsCount} Reports</h3>
              <p className="text-[10px] font-normal text-emerald-600/90">
                Click to view Team Lead EOD logs
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-300/60">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* CARD 2: TEAM LEAD LEAVE & PERMISSIONS - ROSE */}
          <div
            onClick={() => {
              setIsTLOnlyMode(true)
              setLeaveTLFilter('All')
              setLeaveExecutiveFilter('All')
              setActiveTab('permissions')
            }}
            className="mgr-card p-4 rounded-2xl border bg-gradient-to-br from-rose-50 to-pink-50/50 text-rose-950 border-rose-200 hover:border-rose-400 hover:bg-rose-100/30 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-800/85">
                Team Lead Leaves
              </p>
              <h3 className="text-xl font-black text-rose-950">
                {tlPendingLeavesCount} Pending
              </h3>
              <p className="text-[10px] font-semibold text-rose-600/90">
                Click to view Team Lead leave requests
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-300/60">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* CARD 3: TEAM LEAD ATTENDANCE - SKY */}
          <div
            onClick={() => {
              setIsTLOnlyMode(true)
              setAttendanceTLFilter('All')
              setAttendanceExecutiveFilter('All')
              setActiveTab('team_attendance')
            }}
            className="mgr-card p-4 rounded-2xl border bg-gradient-to-br from-sky-50 to-cyan-50/50 text-sky-950 border-sky-200 hover:border-sky-400 hover:bg-sky-100/30 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-800/85">
                Team Lead Attendance
              </p>
              <h3 className="text-xl font-black text-sky-950">
                {teamLeads.length} Team Leads
              </h3>
              <p className="text-[10px] font-semibold text-sky-600/90">
                Click to view Team Lead login/logout history
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 border border-sky-300/60">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ATTENDANCE DETAILS MODAL POPUP ───────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-slate-50 border-slate-200 rounded-3xl max-w-6xl w-full p-6 space-y-4 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-mgr-primary-600" /> {isTLOnlyMode ? "Team Lead EOD Attendance Reports" : "Team EOD Attendance Reports"}
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {isTLOnlyMode ? "View check-in/out times, EOD summaries, and submission history for Team Leaders." : "View check-in/out times, EOD summaries, and submission history."}
                </p>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="mgr-card p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Team Lead Filter */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-1.5 text-xs font-bold text-slate-700">
                    <span className="text-slate-500 font-black uppercase text-[10px] tracking-wider">Team Lead:</span>
                    <select
                      value={selectedTL}
                      onChange={(e) => {
                        setSelectedTL(e.target.value)
                        setSelectedSE('All')
                      }}
                      className="mgr-card bg-transparent text-slate-900 focus:outline-none cursor-pointer font-black text-xs"
                    >
                      <option value="All">All Team Leads</option>
                      {teamLeads.map((tl) => (
                        <option key={tl.id || tl.email} value={tl.name}>
                          👤 {tl.name} ({tl.employee_code || 'TL'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sales Executive Filter - ONLY IF NOT TL mode */}
                  {!isTLOnlyMode && (
                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-1.5 text-xs font-bold text-slate-700">
                      <span className="text-slate-500 font-black uppercase text-[10px] tracking-wider">Executive:</span>
                      <select
                        value={selectedSE}
                        onChange={(e) => setSelectedSE(e.target.value)}
                        className="mgr-card bg-transparent text-slate-900 focus:outline-none cursor-pointer font-black text-xs"
                      >
                        <option value="All">All Executives (Combined Sum)</option>
                        {availableExecutivesForEod.map((ex) => (
                          <option key={ex.id || ex.email} value={ex.name}>
                            {ex.name} ({ex.employee_code || 'EMP'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['All', 'Submitted', 'Acknowledged'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`mgr-card px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                        selectedStatus === status
                          ? 'bg-mgr-primary-700 text-white border-mgr-primary-700 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by Employee Code, Executive Name, Remarks..."
                    className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-mgr-primary-700 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-bold">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 bg-mgr-primary-50/60 p-0.5 rounded-xl border border-mgr-primary-300">
                    <span className="text-[10px] font-black text-mgr-primary-955 px-2 uppercase">Date Filter:</span>
                    {['All', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom Date'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSelectedDateFilter(tab)}
                        className={`mgr-card px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                          selectedDateFilter === tab
                            ? 'bg-mgr-primary-700 text-white shadow-2xs'
                            : 'text-mgr-primary-955 hover:bg-mgr-primary-100'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {selectedDateFilter === 'Custom Date' && (
                    <div className="flex items-center gap-2 bg-mgr-primary-50 border border-mgr-primary-300 rounded-xl px-3 py-1.5">
                      <span className="text-mgr-primary-900 font-extrabold text-[11px]">Select Date:</span>
                      <input
                        type="date"
                        value={customDateInput}
                        onChange={(e) => setCustomDateInput(e.target.value)}
                        className="mgr-card bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
                      />
                    </div>
                  )}
                </div>

                {(selectedSE !== 'All' || selectedStatus !== 'All' || selectedDateFilter !== 'All' || search) && (
                  <button
                    onClick={() => {
                      setSelectedSE('All')
                      setSelectedStatus('All')
                      setSelectedDateFilter('All')
                      setSearch('')
                      setCustomDateInput('')
                    }}
                    className="mgr-card text-xs font-extrabold text-rose-700 hover:underline cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            </div>

            {/* List/Table View Rendering */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Emp Id</th>
                      <th className="px-5 py-3.5">Emp Name</th>
                      <th className="px-5 py-3.5">Attendance</th>
                      <th className="px-5 py-3.5 text-right">View Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-mgr-primary-600 mb-2" />
                          Loading team attendance reports...
                        </td>
                      </tr>
                    ) : filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-slate-400 font-semibold">
                          No attendance reports match your selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((report) => (
                        <tr
                          key={report.id}
                          onClick={() => setSelectedReportModal(report)}
                          className="mgr-card hover:bg-mgr-primary-50/40 transition cursor-pointer"
                        >
                          <td className="px-5 py-3 font-mono font-bold text-slate-800">{formatDate(report.date)}</td>
                          <td className="px-5 py-3 font-mono font-black text-mgr-primary-955">
                            <span className="bg-mgr-primary-100 text-mgr-primary-955 border border-mgr-primary-300 px-1.5 py-0.5 rounded text-[10px]">
                              [{report.employee_code || 'EMP000012'}]
                            </span>
                          </td>
                          <td className="px-5 py-3 font-extrabold text-slate-900">{report.executive}</td>
                          <td className="px-5 py-3 text-[11px] font-bold text-slate-700">
                            <div>🟢 {report.loginTime}</div>
                            <div className="text-slate-500">🔴 {report.logoutTime}</div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedReportModal(report)
                              }}
                              className="mgr-card px-3 py-1.5 rounded-xl bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition flex items-center gap-1.5 ml-auto"
                            >
                              <Eye size={12} /> View Full Report
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PERMISSIONS DETAILS MODAL POPUP ──────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-slate-50 border-slate-200 rounded-3xl max-w-6xl w-full p-6 space-y-4 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-mgr-primary-700" /> {isTLOnlyMode ? "Team Lead Leave & Permission Requests" : "Team Leave & Permission Requests"}
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {isTLOnlyMode ? "Approve or Reject Leave & Permission requests submitted by Team Leaders." : "Approve or Reject Leave & Permission requests submitted by assigned Sales Executives."}
                </p>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="mgr-card p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
              {/* Filter Strip */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Team Lead Filter */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Team Lead:</span>
                    <select
                      value={leaveTLFilter}
                      onChange={(e) => {
                        setLeaveTLFilter(e.target.value)
                        setLeaveExecutiveFilter('All')
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 focus:outline-none cursor-pointer font-bold rounded-xl px-3 py-1.5 text-xs border border-slate-200 transition"
                    >
                      <option value="All">All Team Leads</option>
                      {teamLeads.map((tl) => (
                        <option key={tl.id || tl.employee_code} value={tl.name || tl.full_name}>
                          👤 {tl.name || tl.full_name} ({tl.employee_code || 'TL'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Executive Filter Dropdown - ONLY IF NOT TL mode */}
                  {!isTLOnlyMode && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Executive:</span>
                      <select
                        value={leaveExecutiveFilter}
                        onChange={(e) => setLeaveExecutiveFilter(e.target.value)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 focus:outline-none cursor-pointer font-bold rounded-xl px-3 py-1.5 text-xs border border-slate-200 transition"
                      >
                        <option value="All">All Executives</option>
                        {availableExecutivesForLeave.map((ex) => (
                          <option key={ex.id || ex.employee_code} value={ex.name || ex.full_name}>
                            {ex.name || ex.full_name} ({ex.employee_code || ex.employee_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Date Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Date:</span>
                    {['All Time', 'Today', 'Yesterday', 'This Month', 'Custom'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => handleLeaveDateTab(tab)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          leaveDateTab === tab
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                    {leaveDateTab === 'Custom' && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <input
                          type="date"
                          value={leaveFromDate}
                          onChange={(e) => setLeaveFromDate(e.target.value)}
                          className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer"
                        />
                        <span className="text-slate-400 text-xs font-bold">→</span>
                        <input
                          type="date"
                          value={leaveToDate}
                          onChange={(e) => setLeaveToDate(e.target.value)}
                          className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reset Filters button */}
                  {(leaveExecutiveFilter !== 'All' || leaveDateTab !== 'All Time' || leaveFromDate || leaveToDate) && (
                    <button
                      onClick={() => {
                        setLeaveExecutiveFilter('All')
                        setLeaveDateTab('All Time')
                        setLeaveFromDate('')
                        setLeaveToDate('')
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer transition"
                    >
                      ✕ Reset Filters
                    </button>
                  )}

                  {/* Refresh Requests Button */}
                  <button
                    onClick={() => {
                      attendanceAPI.getLeaveRequests().then((res) => {
                        const raw = Array.isArray(res) ? res : (res?.data || [])
                        if (Array.isArray(raw)) setTeamLeaveRequests(raw)
                      })
                    }}
                    className="mgr-card px-3.5 py-2 rounded-xl bg-mgr-primary-50 hover:bg-mgr-primary-100 text-mgr-primary-955 border border-mgr-primary-300 font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw size={14} /> Refresh Requests
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold text-slate-800 min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-700">
                      <th className="px-4 py-3.5">Executive Name</th>
                      <th className="px-4 py-3.5">Request Type</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Duration / Slot</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Current Status</th>
                      <th className="px-4 py-3.5 text-right">Approve / Reject Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredLeaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-10 text-slate-500 font-bold text-sm bg-slate-50/50">
                          No leave or permission requests found matching your selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLeaveRequests.map((req, idx) => {
                        const fromDateStr = req.from_date || req.start_date || req.leave_date || req.date;
                        const toDateStr = req.to_date || req.end_date || fromDateStr;
                        const formattedFrom = formatDate(fromDateStr);
                        const formattedTo = formatDate(toDateStr);
                        const dateDisplay = (formattedFrom && formattedTo && formattedFrom !== formattedTo) ? `${formattedFrom} to ${formattedTo}` : formattedFrom;
                        const daysCount = getLeaveRequestDays(req);
                        const durationLabel = req.leave_type?.includes("Half")
                          ? "Half Day (0.5 Day)"
                          : req.leave_type?.includes("Permission")
                            ? `Short Permission (${req.duration || "2 Hours"})`
                            : `Full Day (${daysCount} ${daysCount === 1 ? 'Day' : 'Days'})`;
                        return (
                          <tr key={req.id || idx} className="hover:bg-mgr-primary-50/40 transition-colors">
                            <td 
                              onClick={() => setViewingEmpProfile({ name: req.executive_name || req.executive, employee_code: req.employee_code, email: req.executive_email, role: 'Sales Executive', status: 'Active' })}
                              className="px-4 py-3.5 font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition"
                              title="Click to view full employee profile"
                            >
                              {req.executive_name || req.executive || "Sales Executive"}
                              <div className="text-[10px] text-slate-400 font-extrabold font-mono">[{req.employee_code || "EMP000012"}]</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black border ${
                                req.leave_type?.includes("Half")
                                  ? "bg-mgr-primary-100 text-mgr-primary-955 border-mgr-primary-300"
                                  : req.leave_type?.includes("Permission")
                                    ? "bg-mgr-accent-100 text-mgr-accent-955 border-mgr-accent-300"
                                    : "bg-emerald-100 text-emerald-955 border-emerald-300"
                              }`}>
                                {req.leave_type || "Leave Request"}
                              </span>
                            </td>
                            {/* Separate Date Column */}
                            <td className="px-4 py-3.5 text-slate-900 font-mono font-bold">
                              🗓️ {dateDisplay}
                            </td>
                            {/* Separate Duration / Slot Column */}
                            <td className="px-4 py-3.5 text-slate-700">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-extrabold border border-slate-200">
                                ⏱ {durationLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 max-w-[220px]">
                              <p className="text-slate-600 font-medium leading-relaxed italic">"{req.reason || "No reason specified."}"</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                req.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-955 border-emerald-300"
                                  : req.status === "Rejected"
                                    ? "bg-rose-100 text-rose-955 border-rose-300"
                                    : "bg-mgr-primary-100 text-mgr-primary-900 border-mgr-primary-300"
                              }`}>
                                {req.status === "Approved"
                                  ? "✓ Approved"
                                  : req.status === "Rejected"
                                    ? "✗ Rejected"
                                    : "⏳ Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right space-y-1">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleUpdateLeaveStatus(req.id || req.leave_id, "Approved")}
                                  disabled={req.status === "Approved"}
                                  className="mgr-card px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-2xs transition cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCircle2 size={14} /> Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateLeaveStatus(req.id || req.leave_id, "Rejected")}
                                  disabled={req.status === "Rejected"}
                                  className="mgr-card px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs shadow-2xs transition cursor-pointer flex items-center gap-1"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL EOD DETAIL MODAL popup ── */}
      {selectedReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 lg:p-7 space-y-6 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-black text-mgr-primary-700 bg-mgr-primary-50 px-2.5 py-0.5 rounded-md border border-mgr-primary-200">
                    [{selectedReportModal.employee_code || 'EMP000012'}]
                  </span>
                  <span className="text-base font-black text-slate-900">{selectedReportModal.executive}</span>
                  <span className="text-xs text-slate-400 font-semibold">• {selectedReportModal.designation}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5 pt-1">
                  <FileText className="w-6 h-6 text-mgr-primary-700" /> EOD Daily Work Report ({formatDate(selectedReportModal.date)})
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="mgr-card p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Attendance & Telemetry Box in Modal */}
            {(() => {
              const liveTel = getTelemetryForReport(selectedReportModal, attendanceLogs)
              const sessions = liveTel.dayLogs || []
              return (
                <div className="p-4 rounded-2xl bg-mgr-secondary-50/60 border border-mgr-secondary-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-mgr-secondary-800 flex items-center gap-2">
                      <Clock size={16} className="text-mgr-secondary-600" /> ATTENDANCE & LOGIN SESSIONS
                    </span>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-955 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      GPS Verified
                    </span>
                  </div>
                  {sessions.length > 0 ? (
                    <div className="space-y-2">
                      {sessions.map((sess, idx) => {
                         const sIn = sess.check_in_time || sess.punch_in_time || sess.clockIn || sess.loginTime || sess.login_time;
                         const sOut = sess.check_out_time || sess.punch_out_time || sess.clockOut || sess.logoutTime || sess.logout_time;
                         const inFmt = formatTelemetryTime(sIn);
                         const outFmt = formatTelemetryTime(sOut) || (sIn ? 'In Progress (Active)' : '—');
                         const locIn = sess.check_in_address || sess.loginLocation || sess.location || 'Office / Field Site';
                         const locOut = sess.check_out_address || sess.logoutLocation || sess.location || (sIn ? 'Active / Field Site' : '—');
                         const dur = calculateDuration(sIn, sOut);
                         return (
                            <div key={sess.id || idx} className="bg-white border border-mgr-secondary-100 shadow-sm rounded-xl p-3 flex flex-col md:flex-row justify-between md:items-center gap-3">
                               <div className="space-y-1.5">
                                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                     🟢 In: <span className="font-black text-mgr-secondary-950">{inFmt}</span> <span className="text-slate-500 font-medium italic truncate max-w-[250px]">({String(locIn).replace('CLIENT_VISIT_DESTINATION:::', '')})</span>
                                  </div>
                                  <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                     🔴 Out: <span className="font-black text-rose-950">{outFmt}</span> <span className="text-slate-500 font-medium italic truncate max-w-[250px]">({String(locOut).replace('CLIENT_VISIT_DESTINATION:::', '')})</span>
                                  </div>
                               </div>
                               <div className="bg-mgr-secondary-100 text-mgr-secondary-900 border border-mgr-secondary-200 font-black px-4 py-2 rounded-xl shrink-0 text-center text-xs">
                                  ⏱️ {dur}
                               </div>
                            </div>
                         )
                      })}
                    </div>
                  ) : (
                    <div className="text-slate-500 font-semibold italic text-xs p-2 bg-white rounded-xl border border-slate-100">No attendance sessions logged for this day.</div>
                  )}
                </div>
              )
            })()}

            {/* Numbers Badges (Airy 6-col Grid) */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">Activity Numbers</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Calls</span>
                  <p className="font-black text-slate-900 text-lg">{selectedReportModal.callsMade}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-805 uppercase">Visits</span>
                  <p className="font-black text-emerald-955 text-lg">{selectedReportModal.visitsCompleted}</p>
                </div>
                <div className="p-3 rounded-xl bg-mgr-secondary-50 border border-mgr-secondary-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-mgr-secondary-805 uppercase">Leads</span>
                  <p className="font-black text-mgr-secondary-955 text-lg">{selectedReportModal.leadsGenerated}</p>
                </div>
                <div className="p-3 rounded-xl bg-mgr-primary-50 border border-mgr-primary-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-mgr-primary-900 uppercase">Interested</span>
                  <p className="font-black text-mgr-primary-955 text-lg">{selectedReportModal.clientsInterested}</p>
                </div>
                <div className="p-3 rounded-xl bg-mgr-accent-50 border border-mgr-accent-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-mgr-accent-800 uppercase">Follow-ups</span>
                  <p className="font-black text-mgr-accent-955 text-lg">{selectedReportModal.followupsScheduled}</p>
                </div>
                <div className="p-3 rounded-xl bg-mgr-primary-700 text-white shadow-sm space-y-0.5">
                  <span className="text-[10px] font-bold text-mgr-primary-100 uppercase">Won Deals</span>
                  <p className="font-black text-lg">{selectedReportModal.dealsClosed}</p>
                </div>
              </div>
            </div>

            {/* SE REMARKS */}
            <div className="p-4 rounded-2xl bg-mgr-accent-50/70 border border-mgr-accent-200 space-y-1.5 text-xs">
              <span className="text-xs font-black uppercase text-mgr-accent-900 flex items-center gap-1.5">
                <MessageSquare size={15} className="text-mgr-accent-600" /> SE REMARKS / DAILY NOTES
              </span>
              <p className="text-mgr-accent-955 font-semibold italic bg-white p-3 rounded-xl border border-mgr-accent-100">
                "{selectedReportModal.seRemarks}"
              </p>
            </div>

            {/* Highlights, Blockers, Plan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Highlights</span>
                <p className="text-slate-800 font-semibold leading-relaxed">{selectedReportModal.highlights}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-rose-800 block">Blockers</span>
                <p className="text-rose-955 font-semibold leading-relaxed">{selectedReportModal.blockers}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-mgr-primary-50 border border-mgr-primary-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-mgr-primary-900 block">Tomorrow Plan</span>
                <p className="text-mgr-primary-955 font-semibold leading-relaxed">{selectedReportModal.nextDayPlan}</p>
              </div>
            </div>

            {/* Review feedback inside the details modal */}
            <div className="pt-3 border-t border-slate-100">
              {selectedReportModal.managerAck ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-xs font-black text-emerald-955">✓ Acknowledged with remarks:</span>
                  <span className="text-xs font-semibold text-emerald-850 italic">"{selectedReportModal.managerComment || 'No comment provided'}"</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
                  <input
                    type="text"
                    value={ackComments[selectedReportModal.id] || ''}
                    onChange={(e) => setAckComments({ ...ackComments, [selectedReportModal.id]: e.target.value })}
                    placeholder="Enter acknowledgment comments or notes..."
                    className="flex-1 sm:w-64 px-3 py-2 bg-slate-50 border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-mgr-primary-400 font-semibold"
                  />
                  <button
                    onClick={() => {
                      handleAcknowledgeReport(selectedReportModal.id)
                      setSelectedReportModal(null)
                    }}
                    className="mgr-card px-6 py-2.5 bg-mgr-primary-700 hover:bg-mgr-primary-800 text-white font-black text-xs rounded-xl shadow-md shadow-yellow-600/20 cursor-pointer transition flex items-center justify-center gap-2 shrink-0"
                  >
                    <CheckCircle size={15} /> Acknowledge EOD Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TEAM ATTENDANCE MODAL ───────────────────────────────────── */}
      {activeTab === 'team_attendance' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-slate-50 border-slate-200 rounded-3xl max-w-5xl w-full p-6 space-y-4 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-mgr-secondary-600" /> {isTLOnlyMode ? "Team Lead Attendance Overview" : "Team Attendance Overview"}
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {isTLOnlyMode ? "View comprehensive login and logout history for all your Team Leaders." : "View comprehensive login and logout history for all your assigned executives."}
                </p>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="mgr-card p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Toggle Filter and Executive Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-xs">
              <div className="flex bg-slate-200/60 p-1 rounded-xl">
                {['All', 'Office', 'Client Visit'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAttendanceTypeFilter(tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      attendanceTypeFilter === tab ? 'bg-[#0b3c5d] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {tab === 'All' ? '🌐 All logs' : tab === 'Office' ? '🏢 Office' : '📍 Client Visit'}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Team Lead Dropdown Filter */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 min-w-[200px]">
                  <span className="text-slate-500 font-black uppercase text-[10px] tracking-wider whitespace-nowrap">Team Lead:</span>
                  <select
                    value={attendanceTLFilter}
                    onChange={(e) => {
                      setAttendanceTLFilter(e.target.value)
                      setAttendanceExecutiveFilter('All')
                    }}
                    className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-black text-xs w-full"
                  >
                    <option value="All">All Team Leads</option>
                    {teamLeads.map((tl) => (
                      <option key={tl.id || tl.employee_code || tl.email} value={tl.name || tl.full_name}>
                        👤 {tl.name || tl.full_name} ({tl.employee_code || 'TL'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Executive Dropdown Filter - ONLY IF NOT TL mode */}
                {!isTLOnlyMode && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 min-w-[200px]">
                    <span className="text-slate-500 font-black uppercase text-[10px] tracking-wider whitespace-nowrap">Executive:</span>
                    <select
                      value={attendanceExecutiveFilter}
                      onChange={(e) => setAttendanceExecutiveFilter(e.target.value)}
                      className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-black text-xs w-full"
                    >
                      <option value="All">All Executives</option>
                      {availableExecutivesForAttendance.map((ex) => (
                        <option key={ex.id || ex.employee_code || ex.email} value={ex.name || ex.full_name}>
                          {ex.name || ex.full_name} ({ex.employee_code || ex.employee_id || 'EMP'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Table */}
            <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
              {filteredTeamLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-500 font-bold text-xs italic">
                  No attendance records found matching filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                        <th className="pb-3 pl-2">Employee</th>
                        <th className="pb-3">Attendance Type</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Check In</th>
                        <th className="pb-3">Check Out</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Location / Visit Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {filteredTeamLogs.map((log, idx) => {
                        const rawDate = log.attendance_date || log.date || (log.created_at ? String(log.created_at).substring(0, 10) : '') || (log.check_in_time ? String(log.check_in_time).substring(0, 10) : '');
                        const formattedDateStr = formatDate(rawDate) || '—';
                        
                        const checkInTime = formatTelemetryTime(log.check_in_time || log.punch_in_time || log.loginTime);
                        let rawOutTime = log.check_out_time || log.punch_out_time || log.logoutTime;
                        let checkOutTime = formatTelemetryTime(rawOutTime);

                        // Auto logout rule: if employee forgot to log out on a past date or unclosed log, auto log out at 12:00 PM
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isPastDate = rawDate && rawDate < todayStr;
                        const isForgotLogout = !rawOutTime || rawOutTime === '—' || !checkOutTime;

                        if (isForgotLogout && isPastDate) {
                          checkOutTime = '12:00 PM';
                        }

                        const isLoggedOff = (checkOutTime && checkOutTime !== '—') || log.status === 'Logged off' || String(log.attendance_status || '').toLowerCase().includes('off');
                        
                        let locationDisplay = log.check_in_address || log.loginLocation || 'Office / Field Site';
                        if (log.isClientVisit) {
                          try {
                            const parsed = JSON.parse(locationDisplay.replace('CLIENT_VISIT_DESTINATION:::', ''));
                            locationDisplay = `Client: ${parsed.title} (${parsed.company_name}) at ${parsed.address}`;
                          } catch {
                            locationDisplay = locationDisplay.replace('CLIENT_VISIT_DESTINATION:::', 'Client Visit Destination');
                          }
                        }

                        return (
                          <tr key={log.id || idx} className="hover:bg-slate-50/50 transition">
                            <td 
                              onClick={() => setViewingEmpProfile({ name: log.employeeName, employee_code: log.employeeCode, role: 'Sales Executive', status: 'Active' })}
                              className="py-3 pl-2 cursor-pointer group hover:text-blue-600 transition"
                              title="Click to view full employee profile"
                            >
                              <p className="font-black text-slate-900 group-hover:text-blue-600">{log.employeeName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">[{log.employeeCode}]</p>
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black border uppercase tracking-wider ${
                                log.isClientVisit ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {log.attendanceType}
                              </span>
                            </td>
                            <td className="py-3 font-bold text-slate-800">{formattedDateStr}</td>
                            <td className="py-3 font-bold text-slate-900">{checkInTime || '—'}</td>
                            <td className="py-3 font-bold text-slate-900">{checkOutTime}</td>
                            <td className="py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black border uppercase tracking-wider ${
                                isLoggedOff ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {isLoggedOff ? 'LOGGED OFF' : 'LOGGED IN'}
                              </span>
                            </td>
                            <td className="py-3 text-slate-500 font-normal max-w-[280px] truncate" title={locationDisplay}>
                              {locationDisplay}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Profile Card Modal */}
      {viewingEmpProfile && (
        <EmployeeProfileModal
          employee={viewingEmpProfile}
          onClose={() => setViewingEmpProfile(null)}
        />
      )}
    </div>
  )
}
