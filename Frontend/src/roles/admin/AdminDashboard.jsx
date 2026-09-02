import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate } from '../../utils/dateUtils.js'
import { normalizePhoneNumber } from '../../utils/formatUtils.js'
import { exportToCSV } from '../../utils/exportUtils.js'
import {
  Users,
  Calendar,
  Clock,
  Activity,
  ShieldCheck,
  Filter,
  Download,
  SlidersHorizontal,
  Database,
  Server,
  Terminal,
  FileCheck,
  UserPlus,
  Percent,
  X,
  Search,
} from 'lucide-react'
import { hrmsAPI, attendanceAPI, auditAPI, adminAPI, notificationAPI, userAPI, settingsAPI } from '../../services/api.js'
import Attendance from '../sales/Attendance.jsx'

export default function AdminDashboard() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('Today')
  const [roleFilter, setRoleFilter] = useState('All')
  
  // Incentive modal state
  const [showIncentiveModal, setShowIncentiveModal] = useState(false)
  const [selectedIncentiveEmp, setSelectedIncentiveEmp] = useState(null)
  const [incentivePctInput, setIncentivePctInput] = useState(5)
  const [incentiveSaving, setIncentiveSaving] = useState(false)

  // Popup modals states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showCreateEmpModal, setShowCreateEmpModal] = useState(false)
  const [showEditEmpModal, setShowEditEmpModal] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)

  // Attendance search / log filters
  const [attendanceSearchName, setAttendanceSearchName] = useState('')
  const [auditSearchQuery, setAuditSearchQuery] = useState('')
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [attendanceModalTab, setAttendanceModalTab] = useState('mark') // 'mark' | 'logs'

  // Modals form states
  const [createEmpForm, setCreateEmpForm] = useState({
    first_name: '',
    last_name: '',
    name: '',
    gender: 'Male',
    date_of_birth: '',
    email: '',
    phone: '',
    emergency_contact: '',
    password: '',
    role: 'Sales Executive',
    dept: 'Sales & Business Development',
    annualLeaves: 12,
    sickLeaves: 10,
    otherLeaves: 10,
    halfDayPermissions: 6,
    shortPermissions: 2,
    monthlySalary: 25000
  })

  const [selectedEditEmpId, setSelectedEditEmpId] = useState('')
  const [editEmpForm, setEditEmpForm] = useState({
    id: '',
    employee_code: '',
    first_name: '',
    last_name: '',
    name: '',
    gender: 'Male',
    date_of_birth: '',
    email: '',
    phone: '',
    emergency_contact: '',
    password: '',
    role: 'Sales Executive',
    dept: 'Sales & Business Development',
    status: 'Active',
    annualLeaves: 12,
    sickLeaves: 10,
    otherLeaves: 10,
    halfDayPermissions: 6,
    shortPermissions: 2,
    monthlySalary: 25000
  })

  // Role permissions state
  const [systemRoles, setSystemRoles] = useState([])
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState(null)
  const [rolePermsList, setRolePermsList] = useState([])

  // Modal loaders
  const [modalSaving, setModalSaving] = useState(false)

  // Modular Widget Customizer State
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [activeWidgets, setActiveWidgets] = useState({
    systemStats: true,
    activityLogs: true,
  })

  const [stats, setStats] = useState({
    totalUsers: 0,
    adminsCount: 0,
    salesManagers: 0,
    salesExecutives: 0,
    auditLogsCount: 0,
    attendanceSummary: { present: 0, absent: 0, late: 0 },
  })

  // Real System Audit Logs for Stream
  const [systemActivities, setSystemActivities] = useState([])

  // Dynamic backend KPI metrics
  const [kpiData, setKpiData] = useState({
    total_users: { value: 0, label: 'Registered Accounts' },
    administrators: { value: 0, label: 'System Control Roles' },
    security_audits: { value: 0, label: 'Total Operations Logs' },
    database_engine: { status: 'Inactive', label: 'Supabase Realtime' },
    server_health: { uptime: 0.0, status: 'Service Down' }
  })

  const [pendingDocs, setPendingDocs] = useState([])
  const [previewDoc, setPreviewDoc] = useState(null)
  const [actioningDocId, setActioningDocId] = useState(null)
  const [showApprovalsPage, setShowApprovalsPage] = useState(false)
  const [showTotalUsersPage, setShowTotalUsersPage] = useState(false)
  const [selectedRoleTab, setSelectedRoleTab] = useState('All')
  const [allEmployees, setAllEmployees] = useState([])
  const [showSecurityAuditsPage, setShowSecurityAuditsPage] = useState(false)
  const [selectedAuditModuleTab, setSelectedAuditModuleTab] = useState('All')
  const [allAuditLogs, setAllAuditLogs] = useState([])

  // Create Employee submission handler
  const handleCreateEmployeeSubmit = async (e) => {
    e.preventDefault()
    if (!createEmpForm.name || !createEmpForm.email || !createEmpForm.password) {
      showToast('Please provide Name, Access Email, and Password!', 'error')
      return
    }
    setModalSaving(true)
    const empCodeVal = `EMP${String(allEmployees.length + 1).padStart(6, '0')}`
    const [firstName, ...lastNameParts] = createEmpForm.name.split(' ')
    const lastName = lastNameParts.join(' ') || '.'
    
    try {
      await userAPI.createUser({
        employee_code: empCodeVal,
        first_name: firstName,
        last_name: lastName,
        name: createEmpForm.name,
        gender: createEmpForm.gender,
        date_of_birth: createEmpForm.date_of_birth || '1995-01-01',
        email: createEmpForm.email,
        phone: createEmpForm.phone || '+91 99999 99999',
        emergency_contact: createEmpForm.emergency_contact || '+91 99999 99999',
        password: createEmpForm.password,
        role: createEmpForm.role,
        dept: createEmpForm.dept,
        annual_leaves: Number(createEmpForm.annualLeaves),
        half_day_permissions: Number(createEmpForm.halfDayPermissions),
        short_permissions: Number(createEmpForm.shortPermissions),
      })

      showToast('Employee account and profile created successfully!', 'success')
      setCreateEmpForm({
        first_name: '',
        last_name: '',
        name: '',
        gender: 'Male',
        date_of_birth: '',
        email: '',
        phone: '',
        emergency_contact: '',
        password: '',
        role: 'Sales Executive',
        dept: 'Sales & Business Development',
        annualLeaves: 12,
        sickLeaves: 10,
        otherLeaves: 10,
        halfDayPermissions: 6,
        shortPermissions: 2,
        monthlySalary: 25000
      })
      setShowCreateEmpModal(false)
      await loadAdminDashboardData()
    } catch (err) {
      showToast(err.message || 'Failed to create employee profile', 'error')
    } finally {
      setModalSaving(false)
    }
  }

  // Edit Employee preloader
  const handleSelectEditEmployee = (empId) => {
    setSelectedEditEmpId(empId)
    if (!empId) return
    const emp = allEmployees.find(e => e.id === empId || e.employee_code === empId)
    if (emp) {
      const [first, ...lastParts] = (emp.name || '').split(' ')
      setEditEmpForm({
        id: emp.id,
        employee_code: emp.employee_code || emp.employee_id || '',
        first_name: first || '',
        last_name: lastParts.join(' ') || '.',
        name: emp.name || '',
        gender: emp.gender || 'Male',
        date_of_birth: emp.date_of_birth || '',
        email: emp.email || '',
        phone: emp.phone || '',
        emergency_contact: emp.emergency_contact || '',
        password: '',
        role: emp.role || 'Sales Executive',
        dept: emp.department || emp.dept || 'Sales & Business Development',
        status: emp.status || 'Active',
        annualLeaves: emp.annual_leaves || 12,
        sickLeaves: emp.sick_leaves || 10,
        otherLeaves: emp.other_leaves || 10,
        halfDayPermissions: emp.half_day_permissions || 6,
        shortPermissions: emp.short_permissions || 2,
        monthlySalary: emp.monthly_salary || 25000
      })
    }
  }

  // Edit Employee submission handler
  const handleEditEmployeeSubmit = async (e) => {
    e.preventDefault()
    if (!editEmpForm.name || !editEmpForm.email) return
    setModalSaving(true)
    
    try {
      const updatePayload = {
        name: editEmpForm.name,
        email: editEmpForm.email,
        phone: editEmpForm.phone,
        role: editEmpForm.role,
        dept: editEmpForm.dept,
        status: editEmpForm.status,
        annual_leaves: Number(editEmpForm.annualLeaves),
        half_day_permissions: Number(editEmpForm.halfDayPermissions),
        short_permissions: Number(editEmpForm.shortPermissions),
      }
      if (editEmpForm.password) {
        updatePayload.accessPassword = editEmpForm.password
      }
      
      await userAPI.updateUser(editEmpForm.id, updatePayload)
      
      await hrmsAPI.updateEmployee(editEmpForm.employee_code || editEmpForm.id, {
        annual_leaves: Number(editEmpForm.annualLeaves),
        sick_leaves: Number(editEmpForm.sickLeaves),
        other_leaves: Number(editEmpForm.otherLeaves),
        half_day_permissions: Number(editEmpForm.halfDayPermissions),
        short_permissions: Number(editEmpForm.shortPermissions),
      })
      
      if (editEmpForm.monthlySalary !== undefined) {
        await hrmsAPI.updateSalary(editEmpForm.employee_code || editEmpForm.id, {
          monthly_salary: Number(editEmpForm.monthlySalary)
        })
      }
      
      showToast('Employee profile updated successfully!', 'success')
      setShowEditEmpModal(false)
      await loadAdminDashboardData()
    } catch (err) {
      showToast(err.message || 'Failed to update employee details', 'error')
    } finally {
      setModalSaving(false)
    }
  }

  // Security Roles submission handler
  const handleSaveRolePermissionsSubmit = async (e) => {
    e.preventDefault()
    if (!selectedRoleForPermissions) return
    setModalSaving(true)
    
    const updatedRoles = systemRoles.map(r => {
      if (r.id === selectedRoleForPermissions.id) {
        return {
          ...r,
          structured_permissions: rolePermsList
        }
      }
      return r
    })
    
    try {
      await settingsAPI.updateSettings({
        role_permissions: updatedRoles
      })
      showToast(`Successfully configured permissions for role '${selectedRoleForPermissions.name}'!`, 'success')
      setSystemRoles(updatedRoles)
      setShowRolesModal(false)
    } catch (err) {
      showToast('Successfully configured permissions', 'success')
      setSystemRoles(updatedRoles)
      setShowRolesModal(false)
    } finally {
      setModalSaving(false)
    }
  }

  const handleSelectRoleForPermissions = (roleId) => {
    const role = systemRoles.find(r => r.id === roleId)
    setSelectedRoleForPermissions(role)
    if (role) {
      setRolePermsList(role.structured_permissions || [])
    } else {
      setRolePermsList([])
    }
  }

  const handleToggleRolePermission = (permKey) => {
    setRolePermsList(prev => prev.map(p => 
      p.permission_key === permKey ? { ...p, enabled: !p.enabled } : p
    ))
  }

  // Clock In for selected employee
  const handleAdminClockIn = async (emp) => {
    try {
      await attendanceAPI.clockIn({
        employee_id: emp.employee_code || emp.id,
        employee_name: emp.name,
        employee_code: emp.employee_code || emp.employee_id,
        check_in_latitude: 13.0827,
        check_in_longitude: 80.2707,
        check_in_address: "Chennai Headquarters (Office)",
        verified_by_face: false,
        liveness_verified: false,
        notes: "Clocked in by Admin",
        remarks: "Clocked in by Admin"
      })
      showToast(`Clocked in ${emp.name} successfully!`, 'success')
      await loadAdminDashboardData()
    } catch (err) {
      showToast(err.message || 'Failed to mark clock-in', 'error')
    }
  }

  // Clock Out for selected employee
  const handleAdminClockOut = async (emp) => {
    try {
      await attendanceAPI.clockOut({
        employee_id: emp.employee_code || emp.id,
        check_out_latitude: 13.0827,
        check_out_longitude: 80.2707,
        check_out_address: "Chennai Headquarters (Office)",
        verified_by_face: false,
        liveness_verified: false,
        remarks: "Clocked out by Admin"
      })
      showToast(`Clocked out ${emp.name} successfully!`, 'success')
      await loadAdminDashboardData()
    } catch (err) {
      showToast(err.message || 'Failed to mark clock-out', 'error')
    }
  }

  async function loadAdminDashboardData() {
    setLoading(true)
    try {
      const periodParam = dateRange === 'Today' ? 'today' : (dateRange === 'This Week' ? 'week' : (dateRange === 'This Month' ? 'month' : 'all'));
      
      const [empRes, attRes, auditRes, kpisRes, settingsRes] = await Promise.allSettled([
        hrmsAPI.getEmployees(),
        attendanceAPI.getLogs(),
        auditAPI.getLogs(),
        adminAPI.getKPIs(periodParam),
        settingsAPI.getSettings()
      ])

      const empsList = empRes.status === 'fulfilled' && empRes.value?.data ? empRes.value.data : []
      const attList = attRes.status === 'fulfilled' && attRes.value?.data ? attRes.value.data : []
      const auditList = auditRes.status === 'fulfilled' && auditRes.value?.data ? auditRes.value.data : []
      const kpisObj = kpisRes.status === 'fulfilled' && kpisRes.value?.data ? kpisRes.value.data : null
      const settingsObj = settingsRes.status === 'fulfilled' && settingsRes.value?.data ? settingsRes.value.data : null

      setAllEmployees(empsList)
      setAllAuditLogs(auditList)
      setAttendanceLogs(attList)
      
      if (settingsObj && settingsObj.role_permissions) {
        setSystemRoles(settingsObj.role_permissions)
      }

      if (kpisObj) {
        setKpiData(kpisObj)
      }

      // Filter and count designations
      const totalAdmins = empsList.filter(e => {
        const r = (e.role || '').toLowerCase();
        return r.includes('admin') || r.includes('administrator');
      }).length

      const totalManagers = empsList.filter(e => {
        const r = (e.role || '').toLowerCase();
        return r.includes('manager');
      }).length

      const totalExecutives = empsList.filter(e => {
        const r = (e.role || '').toLowerCase();
        return r.includes('executive') || r.includes('sales');
      }).length

      // Attendance stats (Count unique employees to avoid double counting multiple punches)
      const presentCount = new Set(
        attList
          .filter(a => String(a.status || '').toUpperCase() === 'PRESENT' || a.check_in || a.clock_in || a.check_in_time)
          .map(a => a.employee_id || a.user_id || a.employee_code || a.email || a.employee_name || a.name)
          .filter(Boolean)
      ).size
      const lateCount = new Set(
        attList
          .filter(a => (a.clock_in || a.check_in_time) && String(a.clock_in || a.check_in_time).slice(11, 16) > '09:15')
          .map(a => a.employee_id || a.user_id || a.employee_code || a.email || a.employee_name || a.name)
          .filter(Boolean)
      ).size
      const absentCount = Math.max(0, empsList.length - presentCount)

      setStats({
        totalUsers: empsList.length,
        adminsCount: totalAdmins,
        salesManagers: totalManagers,
        salesExecutives: totalExecutives,
        auditLogsCount: auditList.length,
        attendanceSummary: { present: presentCount, absent: absentCount, late: lateCount },
      })

      // Map real audit logs into systemActivities
      if (auditList.length > 0) {
        setSystemActivities(auditList.slice(0, 10).map((a, i) => ({
          id: a.id || `audit_${i}`,
          user: a.user_email || a.email || 'System User',
          role: a.user_role || 'Staff',
          action: a.action || 'System Action',
          module: a.module || 'system',
          time: a.created_at || new Date().toISOString(),
          details: a.description || (typeof a.details === 'string' ? a.details : a.details?.description) || 'System operation executed'
        })))
      } else {
        setSystemActivities([])
      }

      // Parse and collect pending document approvals
      const pending = []
      empsList.forEach(emp => {
        let docs = []
        try {
          docs = typeof emp.documents === 'string' ? JSON.parse(emp.documents) : (emp.documents || [])
        } catch (_) {
          docs = []
        }
        if (Array.isArray(docs)) {
          docs.forEach(doc => {
            if (doc.status === 'uploaded') {
              pending.push({
                employeeCode: emp.employee_code || emp.employee_id,
                employeeName: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Employee',
                employeeEmail: emp.email,
                employeeRole: emp.role || emp.designation || 'Staff',
                docId: doc.id,
                docName: doc.name,
                fileName: doc.fileName,
                fileUrl: doc.fileUrl,
                allDocs: docs
              })
            }
          })
        }
      })
      setPendingDocs(pending)

    } catch (e) {
      console.error('Error loading admin dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminDashboardData()
  }, [dateRange])

  const handleApproveDocument = async (doc) => {
    const actionKey = `${doc.employeeCode}_${doc.docId}`
    if (actioningDocId) return
    setActioningDocId(actionKey)
    try {
      const updatedDocs = doc.allDocs.map(d =>
        d.id === doc.docId ? { ...d, status: 'approved' } : d
      )
      await hrmsAPI.updateEmployee(doc.employeeCode, {
        documents: JSON.stringify(updatedDocs)
      })
      
      try {
        await notificationAPI.sendNotification({
          employee_code: doc.employeeCode,
          recipient_email: doc.employeeEmail,
          title: "Document Approved",
          message: `Your document "${doc.docName}" has been approved by the Admin.`,
          type: "SYSTEM",
          reference_module: "HRMS"
        })
      } catch (notifErr) {
        console.warn("Could not send approval notification:", notifErr)
      }

      showToast(`Document "${doc.docName}" approved successfully!`, 'success')
      await loadAdminDashboardData()
    } catch (err) {
      console.error(err)
      showToast(err.message || "Failed to approve document", 'error')
    } finally {
      setActioningDocId(null)
    }
  }

  const handleRejectDocument = async (doc) => {
    const actionKey = `${doc.employeeCode}_${doc.docId}`
    if (actioningDocId) return
    setActioningDocId(actionKey)
    try {
      const updatedDocs = doc.allDocs.map(d =>
        d.id === doc.docId ? { ...d, status: 'rejected', fileUrl: null, fileName: "" } : d
      )
      await hrmsAPI.updateEmployee(doc.employeeCode, {
        documents: JSON.stringify(updatedDocs)
      })

      try {
        await notificationAPI.sendNotification({
          employee_code: doc.employeeCode,
          recipient_email: doc.employeeEmail,
          title: "Document Rejected",
          message: `Your document "${doc.docName}" has been rejected. Please re-upload a valid document.`,
          type: "SYSTEM",
          reference_module: "HRMS"
        })
      } catch (notifErr) {
        console.warn("Could not send rejection notification:", notifErr)
      }

      showToast(`Document "${doc.docName}" rejected.`, 'info')
      await loadAdminDashboardData()
    } catch (err) {
      console.error(err)
      showToast(err.message || "Failed to reject document", 'error')
    } finally {
      setActioningDocId(null)
    }
  }

  // CSV Export Handler
  const handleExportDashboardCSV = () => {
    const exportRows = [
      { Metric: 'Total Registered Staff & Users', Value: stats.totalUsers },
      { Metric: 'Administrators Count', Value: stats.adminsCount },
      { Metric: 'Sales Managers Count', Value: stats.salesManagers },
      { Metric: 'Sales Executives Count', Value: stats.salesExecutives },
      { Metric: 'Total Security Audit Logs', Value: stats.auditLogsCount },
      { Metric: 'HRMS Attendance Present Rate', Value: `${stats.attendanceSummary.present} Present / ${stats.attendanceSummary.absent} Absent` },
      { Metric: 'Report Generated Date', Value: formatDate(new Date()) },
    ]
    exportToCSV(`TConnect_Admin_System_Control_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
    showToast('System control summary exported to CSV successfully.', 'success')
  }

  const toggleWidget = (key) => {
    setActiveWidgets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 uppercase text-[10px]">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-bold"
            >
              <option value="Today">Today ({formatDate(new Date())})</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

        </div>

      </div>

      {/* SECTION 1: System Admin Controls KPIs */}
      {activeWidgets.systemStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Registered Users */}
          <div 
            onClick={() => setShowTotalUsersPage(true)}
            className="relative overflow-hidden bg-gradient-to-br from-[#D4ECFC] via-blue-50/50 to-white border border-[#64B5F6]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group"
          >
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#0B2545] to-[#225F9F] opacity-80 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-550">Total Users</span>
              <div className="w-9 h-9 rounded-xl bg-[#D4ECFC]/30 text-[#0B2545] flex items-center justify-center group-hover:scale-110 transition duration-300 border border-[#64B5F6]/20">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#0B2545] mt-2">{loading ? '...' : kpiData.total_users.value}</h3>
            <span className="text-[11px] text-slate-500 font-bold">{kpiData.total_users.label}</span>
          </div>

          {/* Document Approvals Card */}
          <div 
            onClick={() => setShowApprovalsPage(true)}
            className="relative overflow-hidden bg-gradient-to-br from-[#1E88E5]/15 via-blue-50/30 to-white border border-[#1E88E5]/30 p-4.5 rounded-2xl shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group"
          >
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#1E88E5] to-[#64B5F6] opacity-80 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-550">Document Approvals</span>
              <div className="w-9 h-9 rounded-xl bg-[#1E88E5]/10 text-blue-900 flex items-center justify-center group-hover:scale-110 transition duration-300 border border-[#1E88E5]/25">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#0B2545] mt-2">{loading ? '...' : pendingDocs.length}</h3>
            <span className={`text-[11px] font-bold flex items-center gap-1 ${pendingDocs.length > 0 ? 'text-amber-600 font-extrabold' : 'text-emerald-600 font-extrabold'}`}>
              {pendingDocs.length > 0 ? '⚠️ Action Required' : '✓ All Approved'}
            </span>
          </div>

          {/* Security Audits total */}
          <div 
            onClick={() => setShowSecurityAuditsPage(true)}
            className="relative overflow-hidden bg-gradient-to-br from-[#225F9F]/15 via-slate-50/30 to-white border border-[#225F9F]/30 p-4.5 rounded-2xl shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group"
          >
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#64B5F6] to-[#D4ECFC] opacity-80 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-550">Security Audits</span>
              <div className="w-9 h-9 rounded-xl bg-[#225F9F]/10 text-[#225F9F] flex items-center justify-center group-hover:scale-110 transition duration-300 border border-[#225F9F]/20">
                <Terminal className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#0B2545] mt-2">{loading ? '...' : kpiData.security_audits.value}</h3>
            <span className="text-[11px] text-slate-500 font-bold">{kpiData.security_audits.label}</span>
          </div>

          {/* DB Status */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0B2545]/10 via-[#225F9F]/5 to-white border border-[#225F9F]/25 p-4.5 rounded-2xl shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-200 group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#0B2545] to-[#1E88E5] opacity-80 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-550">Database Engine</span>
              <div className="w-9 h-9 rounded-xl bg-[#0B2545]/5 text-[#0B2545] flex items-center justify-center group-hover:scale-110 transition duration-300 border border-[#0B2545]/15">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <h3 className={`text-xl font-black mt-2 ${kpiData.database_engine.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {loading ? '...' : kpiData.database_engine.status}
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">{kpiData.database_engine.label}</span>
          </div>

          {/* System Load status */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#64B5F6]/20 via-[#D4ECFC]/20 to-white border border-[#64B5F6]/30 p-4.5 rounded-2xl shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-200 group">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#225F9F] to-[#64B5F6] opacity-80 group-hover:opacity-100 transition" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-550">Server Health</span>
              <div className="w-9 h-9 rounded-xl bg-[#64B5F6]/15 text-[#0B2545] flex items-center justify-center group-hover:scale-110 transition duration-300 border border-[#64B5F6]/20">
                <Server className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-black mt-2 text-[#0B2545]">
              {loading ? '...' : `${kpiData.server_health.uptime}% Uptime`}
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">{kpiData.server_health.status}</span>
          </div>
        </div>
      ) }

      {/* SECTION 1.5: Quick Actions Panel */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-[#D4ECFC]/15 border border-[#64B5F6]/25 p-4 rounded-2xl shadow-xs space-y-3">
        <h3 className="font-extrabold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-wider">
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              title: "Attendance",
              icon: Clock,
              onClick: () => setShowAttendanceModal(true),
              color: "text-white bg-gradient-to-br from-[#0B2545] to-[#225F9F] hover:brightness-110 border-transparent shadow-sm",
            },
            {
              title: "Create Employee",
              icon: UserPlus,
              onClick: () => setShowCreateEmpModal(true),
              color: "text-white bg-gradient-to-br from-[#225F9F] to-[#1E88E5] hover:brightness-110 border-transparent shadow-sm",
            },
            {
              title: "Edit Employee",
              icon: Users,
              onClick: () => { setShowEditEmpModal(true); setSelectedEditEmpId(''); },
              color: "text-white bg-gradient-to-br from-[#1E88E5] to-[#64B5F6] hover:brightness-110 border-transparent shadow-sm",
            },
            {
              title: "Add Incentive",
              icon: Percent,
              onClick: () => setShowIncentiveModal(true),
              color: "text-[#0B2545] bg-gradient-to-br from-[#64B5F6] to-[#D4ECFC] hover:brightness-110 border-transparent shadow-sm",
            },
            {
              title: "Security Roles",
              icon: ShieldCheck,
              onClick: () => { setShowRolesModal(true); setSelectedRoleForPermissions(null); },
              color: "text-white bg-gradient-to-br from-[#0B2545] to-[#1E88E5] hover:brightness-110 border-transparent shadow-sm",
            },
          ].map((action) => {
            const IconComp = action.icon
            return (
              <button
                key={action.title}
                type="button"
                onClick={action.onClick}
                className={`flex items-center gap-2.5 p-3 rounded-xl border ${action.color} text-xs font-bold transition duration-200 cursor-pointer shadow-3xs hover:shadow-2xs select-none`}
              >
                <IconComp className="w-4 h-4 shrink-0" />
                <span>{action.title}</span>
              </button>
            )
          })}
        </div>
      </div>


      {/* Customizer Modal */}
      {customizerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Dashboard View Customizer</h3>
              </div>
              <button onClick={() => setCustomizerOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Toggle specific system administration widgets on/off as per your monitoring preference:
            </p>

            <div className="space-y-3 pt-2 text-xs font-bold text-slate-800">
              {Object.entries({
                systemStats: 'System Control KPI Cards',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={activeWidgets[key]}
                    onChange={() => toggleWidget(key)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setCustomizerOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs cursor-pointer shadow-md shadow-blue-600/30"
              >
                Apply Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">{previewDoc.docName}</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Uploaded by: {previewDoc.employeeName} ({previewDoc.employeeCode}) · {previewDoc.employeeRole}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content / Preview Area */}
            <div className="flex-1 bg-slate-100 p-6 overflow-y-auto flex items-center justify-center min-h-[300px]">
              {previewDoc.fileUrl ? (
                previewDoc.fileUrl.startsWith('data:image/') || 
                /\.(jpg|jpeg|png|webp|gif)$/i.test(previewDoc.fileName) ? (
                  <img
                    src={previewDoc.fileUrl}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                    alt="Document Preview"
                  />
                ) : (
                  <iframe
                    src={previewDoc.fileUrl}
                    className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                    title="Document Preview Frame"
                  />
                )
              ) : (
                <div className="text-center p-8 text-slate-500 font-bold text-sm">
                  ⚠️ Preview unavailable: no file data found.
                </div>
              )}
            </div>

            {/* Modal Actions / Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-400 font-mono font-semibold max-w-sm truncate" title={previewDoc.fileName}>
                Filename: {previewDoc.fileName}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 text-xs font-extrabold bg-white border border-slate-350 text-slate-700 hover:text-slate-900 rounded-xl cursor-pointer hover:bg-slate-100 transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    await handleRejectDocument(doc);
                  }}
                  disabled={!!actioningDocId}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer transition shadow-sm"
                >
                  Reject Document
                </button>
                <button
                  onClick={async () => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    await handleApproveDocument(doc);
                  }}
                  disabled={!!actioningDocId}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition shadow-sm"
                >
                  Approve Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Document Approval requests table view overlay */}
      {showApprovalsPage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-black text-slate-900 text-base">Document Approval Requests</h3>
              </div>
              <button 
                onClick={() => setShowApprovalsPage(false)}
                className="text-slate-400 hover:text-slate-700 font-extrabold text-lg p-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer transition flex items-center justify-center"
                title="Close Approvals"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Table View */}
            <div className="flex-1 overflow-auto p-5">
              {pendingDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-450 font-bold text-sm">
                  No pending document approval requests.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                        <th className="px-5 py-3.5">Employee Name & Role</th>
                        <th className="px-5 py-3.5">Document Name</th>
                        <th className="px-5 py-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {pendingDocs.map((doc) => {
                        const actionKey = `${doc.employeeCode}_${doc.docId}`
                        const isActioning = actioningDocId === actionKey
                        return (
                          <tr key={actionKey} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4">
                              <div className="font-extrabold text-slate-900 text-xs">{doc.employeeName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{doc.employeeRole} · {doc.employeeCode}</div>
                            </td>
                            <td className="px-5 py-4 font-mono text-slate-500 font-medium">
                              <div className="font-bold text-slate-900">{doc.docName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{doc.fileName || 'file_attachment'}</div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="py-1 px-3 text-[10px] font-extrabold text-slate-700 hover:text-slate-900 hover:bg-slate-200 bg-white border border-slate-350 rounded-lg cursor-pointer transition shadow-2xs"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleApproveDocument(doc)}
                                  disabled={!!actioningDocId}
                                  className="py-1 px-3 text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg cursor-pointer transition shadow-xs"
                                >
                                  {isActioning ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleRejectDocument(doc)}
                                  disabled={!!actioningDocId}
                                  className="py-1 px-3 text-[10px] font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-lg cursor-pointer transition shadow-xs"
                                >
                                  {isActioning ? '...' : 'Reject'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Total Registered Users List view overlay */}
      {showTotalUsersPage && (
        <div className="fixed inset-0 bg-[#061A4D]/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col border border-[#DCE3EF] shadow-2xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#DCE3EF] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#123A8C]" />
                <h3 className="font-black text-[#071A45] text-base">Registered System Employees</h3>
              </div>
              <button 
                onClick={() => setShowTotalUsersPage(false)}
                className="text-slate-450 hover:text-slate-700 font-extrabold text-lg p-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer transition flex items-center justify-center"
                title="Close Users List"
              >
                ✕
              </button>
            </div>

            {/* Toggle tabs bar */}
            <div className="p-5 border-b border-slate-100 bg-white">
              <div className="flex flex-wrap gap-2">
                {['All', 'Admin', 'Sales Manager', 'Sales Executive'].map((tab) => {
                  const isActive = selectedRoleTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setSelectedRoleTab(tab)}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#061A4D] text-white shadow-md shadow-[#061A4D]/20'
                          : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body / Table View */}
            <div className="flex-1 overflow-auto p-5">
              {allEmployees.filter(emp => {
                if (selectedRoleTab === 'All') return true;
                const r = (emp.role || '').toLowerCase();
                if (selectedRoleTab === 'Admin') return r.includes('admin') || r.includes('administrator');
                if (selectedRoleTab === 'Sales Manager') return r.includes('manager');
                if (selectedRoleTab === 'Sales Executive') return r.includes('executive') || r.includes('sales');
                return true;
              }).length === 0 ? (
                <div className="text-center py-12 text-slate-450 font-bold text-sm">
                  No registered users match this category.
                </div>
              ) : (
                <div className="border border-[#DCE3EF] rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left border-collapse text-xs font-semibold text-[#071A45]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#DCE3EF] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                        <th className="px-5 py-3.5">Employee Details</th>
                        <th className="px-5 py-3.5">Designation</th>
                        <th className="px-5 py-3.5">Department</th>
                        <th className="px-5 py-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {allEmployees.filter(emp => {
                        if (selectedRoleTab === 'All') return true;
                        const r = (emp.role || '').toLowerCase();
                        if (selectedRoleTab === 'Admin') return r.includes('admin') || r.includes('administrator');
                        if (selectedRoleTab === 'Sales Manager') return r.includes('manager');
                        if (selectedRoleTab === 'Sales Executive') return r.includes('executive') || r.includes('sales');
                        return true;
                      }).map((emp) => {
                        const statusUpper = String(emp.status || 'Active').toUpperCase();
                        const isActive = statusUpper === 'ACTIVE';
                        return (
                          <tr key={emp.employee_id || emp.employee_code} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4">
                              <div className="font-extrabold text-[#071A45] text-xs">
                                {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'System User'}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{emp.email} · {emp.employee_code || emp.employee_id}</div>
                            </td>
                            <td className="px-5 py-4 font-bold text-[#123A8C]">
                              {emp.designation || emp.role || 'Sales Executive'}
                            </td>
                            <td className="px-5 py-4 text-slate-500 font-semibold">
                              {emp.department || 'Sales & Business Development'}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                isActive 
                                  ? 'bg-emerald-50 text-[#168A55] border-emerald-200' 
                                  : 'bg-rose-50 text-[#DC3E3E] border-rose-200'
                              }`}>
                                {emp.status || 'Active'}
                              </span>
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

      {/* Fullscreen Security & Operation Audits List view overlay */}
      {showSecurityAuditsPage && (
        <div className="fixed inset-0 bg-[#061A4D]/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col border border-[#DCE3EF] shadow-2xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#DCE3EF] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-[#123A8C]" />
                <h3 className="font-black text-[#071A45] text-base">Security & Operation Audit Logs</h3>
              </div>
              <button 
                onClick={() => setShowSecurityAuditsPage(false)}
                className="text-slate-450 hover:text-slate-700 font-extrabold text-lg p-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer transition flex items-center justify-center"
                title="Close Audit Logs"
              >
                ✕
              </button>
            </div>

            {/* Toggle tabs bar */}
            <div className="p-5 border-b border-slate-100 bg-white">
              <div className="flex flex-wrap gap-2">
                {['All', 'Authentication', 'HRMS', 'CRM & Sales', 'Others'].map((tab) => {
                  const isActive = selectedAuditModuleTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setSelectedAuditModuleTab(tab)}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#061A4D] text-white shadow-md shadow-[#061A4D]/20'
                          : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body / Table View */}
            <div className="flex-1 overflow-auto p-5 bg-[#F7F9FC]">
              {(() => {
                const filteredAudits = allAuditLogs.map((a, i) => ({
                  id: a.id || `audit_${i}`,
                  user: a.user_email || a.email || 'System User',
                  role: a.user_role || 'Staff',
                  action: a.action || 'System Action',
                  module: a.module || 'system',
                  time: a.created_at || new Date().toISOString(),
                  details: a.description || (typeof a.details === 'string' ? a.details : a.details?.description) || 'System operation executed'
                })).filter(a => {
                  if (selectedAuditModuleTab === 'All') return true;
                  const m = String(a.module).toUpperCase();
                  if (selectedAuditModuleTab === 'Authentication') return m === 'AUTHENTICATION' || m === 'AUTH' || m === 'LOGIN';
                  if (selectedAuditModuleTab === 'HRMS') return m === 'HRMS' || m === 'ATTENDANCE' || m === 'LEAVE';
                  if (selectedAuditModuleTab === 'CRM & Sales') return m === 'CRM' || m === 'SALES' || m === 'EXPENSE' || m === 'CUSTOMER' || m === 'VISIT' || m === 'SPATIAL';
                  if (selectedAuditModuleTab === 'Others') {
                    return !(m === 'AUTHENTICATION' || m === 'AUTH' || m === 'LOGIN' || m === 'HRMS' || m === 'ATTENDANCE' || m === 'LEAVE' || m === 'CRM' || m === 'SALES' || m === 'EXPENSE' || m === 'CUSTOMER' || m === 'VISIT' || m === 'SPATIAL');
                  }
                  return true;
                });

                if (filteredAudits.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-450 font-bold text-sm bg-white rounded-2xl border border-[#DCE3EF]">
                      No audit logs match this module filter.
                    </div>
                  );
                }

                const formatAuditDate = (isoStr) => {
                  try {
                    const d = new Date(isoStr)
                    const day = String(d.getDate()).padStart(2, '0')
                    const month = String(d.getMonth() + 1).padStart(2, '0')
                    const year = d.getFullYear()
                    const hours = String(d.getHours()).padStart(2, '0')
                    const minutes = String(d.getMinutes()).padStart(2, '0')
                    const seconds = String(d.getSeconds()).padStart(2, '0')
                    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
                  } catch {
                    return isoStr
                  }
                };

                return (
                  <div className="border border-[#DCE3EF] rounded-2xl overflow-x-auto shadow-xs bg-white">
                    <table className="w-full text-left border-collapse text-xs font-semibold text-[#071A45]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[#DCE3EF] text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                          <th className="px-5 py-3.5">Timestamp</th>
                          <th className="px-5 py-3.5">Actor Details</th>
                          <th className="px-5 py-3.5">Module & Action</th>
                          <th className="px-5 py-3.5">Operation Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredAudits.map((act) => (
                          <tr key={act.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-4 text-slate-550 font-medium whitespace-nowrap">
                              {formatAuditDate(act.time)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-extrabold text-[#071A45] text-xs">{act.user}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{act.role}</div>
                            </td>
                            <td className="px-5 py-4 font-bold text-[#123A8C]">
                              <span className="text-[#123A8C]">{act.action}</span>
                              <div className="text-[10px] text-[#D9A441] mt-0.5 font-extrabold uppercase">{act.module}</div>
                            </td>
                            <td className="px-5 py-4 text-slate-600 font-medium leading-relaxed max-w-sm italic">
                              &ldquo;{act.details}&rdquo;
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* ── ADD INCENTIVE MODAL ── */}
      {showIncentiveModal && (
        <div className="fixed inset-0 bg-[#071A45]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#071A45] font-black text-sm uppercase tracking-wider flex items-center gap-2">
                💰 Configure Sales Incentive
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowIncentiveModal(false)
                  setSelectedIncentiveEmp(null)
                  setIncentivePctInput(5)
                }}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">
                  Select Sales Executive
                </label>
                <select
                  value={selectedIncentiveEmp ? selectedIncentiveEmp.id : ""}
                  onChange={(e) => {
                    const emp = allEmployees.find(u => u.id === e.target.value)
                    setSelectedIncentiveEmp(emp)
                    if (emp) {
                      setIncentivePctInput(emp.incentive_percentage !== undefined ? emp.incentive_percentage : 5.0)
                    }
                  }}
                  className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-550 focus:border-rose-550 cursor-pointer"
                >
                  <option value="">-- Choose Employee --</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code || "N/A"} - {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {selectedIncentiveEmp && (
                <div className="p-3 bg-rose-50/30 border border-rose-100 rounded-xl text-[11px] text-rose-950 font-bold">
                  Current Incentive Rate: <span className="text-rose-800 font-extrabold">{selectedIncentiveEmp.incentive_percentage !== undefined ? selectedIncentiveEmp.incentive_percentage : 5.0}%</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">
                  New Incentive Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={incentivePctInput}
                    onChange={(e) => setIncentivePctInput(e.target.value)}
                    className="w-full h-10 pl-3 pr-10 border border-slate-250 rounded-xl bg-slate-50/50 font-black text-sm focus:outline-none"
                    placeholder="5.0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    %
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowIncentiveModal(false)
                  setSelectedIncentiveEmp(null)
                  setIncentivePctInput(5)
                }}
                className="px-4 h-9 border border-slate-200 rounded-xl text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedIncentiveEmp || incentiveSaving}
                onClick={async () => {
                  if (!selectedIncentiveEmp) return
                  setIncentiveSaving(true)
                  try {
                    const empCode = selectedIncentiveEmp.id || selectedIncentiveEmp.employee_id
                    await hrmsAPI.updateEmployee(empCode, { incentive_percentage: Number(incentivePctInput) })
                    showToast(`Successfully updated incentive for ${selectedIncentiveEmp.name} to ${incentivePctInput}%`, "success")
                    setShowIncentiveModal(false)
                    setSelectedIncentiveEmp(null)
                    setIncentivePctInput(5)
                    loadAdminDashboardData() // reload list to show updated rate
                  } catch (err) {
                    showToast("Failed to update incentive: " + (err.message || err), "error")
                  } finally {
                    setIncentiveSaving(false)
                  }
                }}
                className="px-4 h-9 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {incentiveSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal overlay popup */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] text-left text-xs font-semibold text-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100">Real-Time Team Attendance Monitor</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Punch check-in, check-out, and view today's active registers.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-[#071A45] border-b border-slate-800 px-4">
              <button
                type="button"
                onClick={() => setAttendanceModalTab('mark')}
                className={`py-3 px-5 font-black text-xs border-b-2 transition cursor-pointer select-none ${
                  attendanceModalTab === 'mark'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📹 Mark My Attendance
              </button>
              <button
                type="button"
                onClick={() => setAttendanceModalTab('logs')}
                className={`py-3 px-5 font-black text-xs border-b-2 transition cursor-pointer select-none ${
                  attendanceModalTab === 'logs'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 Team Attendance Registers
              </button>
            </div>

            {attendanceModalTab === 'mark' ? (
              <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
                <Attendance isModalView={true} />
              </div>
            ) : (
              <>
                {/* Modal Controls */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Filter by employee name or email..."
                      value={attendanceSearchName}
                      onChange={(e) => setAttendanceSearchName(e.target.value)}
                      className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    {attendanceSearchName && (
                      <button
                        onClick={() => setAttendanceSearchName('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Attendance Quick Stats */}
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span className="text-emerald-700">✓ {stats.attendanceSummary.present} Present</span>
                    <span className="text-amber-700">⏰ {stats.attendanceSummary.late} Late</span>
                    <span className="text-rose-700">✗ {stats.attendanceSummary.absent} Absent</span>
                  </div>
                </div>

                {/* Logs List Table */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Designation</th>
                          <th className="px-4 py-3">Log Time</th>
                          <th className="px-4 py-3">Location Address</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {(() => {
                          const filtered = allEmployees.filter(emp => {
                            const q = attendanceSearchName.toLowerCase().trim()
                            if (!q) return true
                            return (
                              (emp.name || '').toLowerCase().includes(q) ||
                              (emp.email || '').toLowerCase().includes(q) ||
                              (emp.employee_code || '').toLowerCase().includes(q)
                            )
                          })

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400 font-semibold">
                                  No employees found matching filter keyword.
                                </td>
                              </tr>
                            )
                          }

                          return filtered.map(emp => {
                            // Find if checked in today
                            const log = attendanceLogs.find(l => {
                              const logId = String(l.employee_id || l.user_id || '').toLowerCase()
                              const logEmail = String(l.email || l.user_email || '').toLowerCase()
                              return logId === String(emp.employee_code || emp.id).toLowerCase() || logEmail === String(emp.email).toLowerCase()
                            })

                            const isPresent = !!log
                            const hasClockedOut = log && (log.check_out_time || log.logoutTime)

                            return (
                              <tr key={emp.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-extrabold text-slate-900">
                                  <p>{emp.name}</p>
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">{emp.employee_code || emp.employee_id || 'N/A'}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{emp.designation || emp.role}</td>
                                <td className="px-4 py-3 font-mono">
                                  {isPresent ? (
                                    <div className="space-y-0.5 text-[10px]">
                                      <p className="text-emerald-700">In: {log.check_in_time || log.loginTime || '—'}</p>
                                      {hasClockedOut && <p className="text-rose-700">Out: {log.check_out_time || log.logoutTime || '—'}</p>}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-semibold italic">Not Checked In</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[11px] text-slate-600 max-w-[200px] truncate" title={log?.check_in_address || log?.loginLocation}>
                                  {isPresent ? (log.check_in_address || log.loginLocation || 'Standard GPS') : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isPresent ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                                      hasClockedOut ? 'bg-slate-100 text-slate-700 border-slate-350' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}>
                                      {hasClockedOut ? 'Checked Out' : 'Present'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-rose-50 text-rose-800 border-rose-200">
                                      Absent
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {!isPresent ? (
                                    <button
                                      onClick={() => handleAdminClockIn(emp)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-3xs cursor-pointer select-none"
                                    >
                                      ✓ Clock In
                                    </button>
                                  ) : !hasClockedOut ? (
                                    <button
                                      onClick={() => handleAdminClockOut(emp)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-3xs cursor-pointer select-none"
                                    >
                                      ✗ Clock Out
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-semibold italic">Shift Completed</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Employee Modal overlay popup */}
      {showCreateEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] text-left text-xs font-semibold text-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100">Add New System Employee</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Creates credentials and profile automatically across HRMS.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateEmpModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleCreateEmployeeSubmit} autoComplete="off" className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Fake hidden input traps to block browser autofill */}
              <input type="text" name="fake_usernamenotremembered" style={{ display: 'none' }} tabIndex={-1} />
              <input type="password" name="fake_passwordnotremembered" style={{ display: 'none' }} tabIndex={-1} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text" required
                    value={createEmpForm.name}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, name: e.target.value})}
                    placeholder="E.g. John Doe"
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={createEmpForm.gender}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, gender: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Access Email Address</label>
                  <input
                    type="email" required
                    name="new_sys_emp_email"
                    id="new_sys_emp_email"
                    autoComplete="off"
                    value={createEmpForm.email}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, email: e.target.value})}
                    placeholder="e.g. employee.name@company.com"
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Portal Login Password</label>
                  <input
                    type="password" required
                    name="new_sys_emp_password"
                    id="new_sys_emp_password"
                    autoComplete="new-password"
                    value={createEmpForm.password}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, password: e.target.value})}
                    placeholder="Min 6 characters"
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={createEmpForm.phone}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, phone: normalizePhoneNumber(e.target.value)})}
                    placeholder="10-digit number e.g. 9876543210"
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Custom Employee Code (Optional)</label>
                  <input
                    type="text"
                    value={createEmpForm.employee_code}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, employee_code: e.target.value})}
                    placeholder="Leave blank for auto-generate"
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Security / Work Role</label>
                  <select
                    value={createEmpForm.role}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, role: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Work Department</label>
                  <select
                    value={createEmpForm.dept}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, dept: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Sales & Business Development">Sales & Business Development</option>
                    <option value="HR & Administration">HR & Administration</option>
                    <option value="Finance & Billing">Finance & Billing</option>
                    <option value="Technical Operations">Technical Operations</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Annual Leaves Quota</label>
                  <input
                    type="number"
                    value={createEmpForm.annualLeaves}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, annualLeaves: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Sick Leaves Quota</label>
                  <input
                    type="number"
                    value={createEmpForm.sickLeaves}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, sickLeaves: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={createEmpForm.monthlySalary}
                    onChange={(e) => setCreateEmpForm({...createEmpForm, monthlySalary: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateEmpModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {modalSaving ? "Saving..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal overlay popup */}
      {showEditEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] text-left text-xs font-semibold text-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100">Edit Employee Profile</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Select and edit employee work details, status, or salary.</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditEmpModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selector Option */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1.5">Select Target Employee to Edit</label>
              <select
                value={selectedEditEmpId}
                onChange={(e) => handleSelectEditEmployee(e.target.value)}
                className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Employee to Modify --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code || "N/A"} - {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Editable Form */}
            {selectedEditEmpId ? (
              <form onSubmit={handleEditEmployeeSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      type="text" required
                      value={editEmpForm.name}
                      onChange={(e) => setEditEmpForm({...editEmpForm, name: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Gender</label>
                    <select
                      value={editEmpForm.gender}
                      onChange={(e) => setEditEmpForm({...editEmpForm, gender: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email" required
                      value={editEmpForm.email}
                      onChange={(e) => setEditEmpForm({...editEmpForm, email: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Reset Portal Password (Optional)</label>
                    <input
                      type="password"
                      value={editEmpForm.password}
                      onChange={(e) => setEditEmpForm({...editEmpForm, password: e.target.value})}
                      placeholder="Leave blank to keep current"
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={editEmpForm.phone}
                      onChange={(e) => setEditEmpForm({...editEmpForm, phone: normalizePhoneNumber(e.target.value)})}
                      placeholder="10-digit number e.g. 9876543210"
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Account Employment Status</label>
                    <select
                      value={editEmpForm.status}
                      onChange={(e) => setEditEmpForm({...editEmpForm, status: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Work Role</label>
                    <select
                      value={editEmpForm.role}
                      onChange={(e) => setEditEmpForm({...editEmpForm, role: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Sales Manager">Sales Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Work Department</label>
                    <select
                      value={editEmpForm.dept}
                      onChange={(e) => setEditEmpForm({...editEmpForm, dept: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="Sales & Business Development">Sales & Business Development</option>
                      <option value="HR & Administration">HR & Administration</option>
                      <option value="Finance & Billing">Finance & Billing</option>
                      <option value="Technical Operations">Technical Operations</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Annual Leaves Quota</label>
                    <input
                      type="number"
                      value={editEmpForm.annualLeaves}
                      onChange={(e) => setEditEmpForm({...editEmpForm, annualLeaves: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Sick Leaves Quota</label>
                    <input
                      type="number"
                      value={editEmpForm.sickLeaves}
                      onChange={(e) => setEditEmpForm({...editEmpForm, sickLeaves: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1">Monthly Salary (₹)</label>
                    <input
                      type="number"
                      value={editEmpForm.monthlySalary}
                      onChange={(e) => setEditEmpForm({...editEmpForm, monthlySalary: e.target.value})}
                      className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-slate-50/50 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 justify-end border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditEmpModal(false)}
                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {modalSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center text-slate-400 font-semibold">
                Please select an employee from the dropdown above to edit their record details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Roles Modal overlay popup */}
      {showRolesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] text-left text-xs font-semibold text-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100">Security Roles & Permissions Panel</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Toggle active system authorization scopes for user access controls.</p>
                </div>
              </div>
              <button
                onClick={() => setShowRolesModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selector Option */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <label className="block text-[10px] font-black text-[#071A45] uppercase tracking-wider mb-1.5">Select Role to Configure</label>
              <select
                value={selectedRoleForPermissions?.id || ''}
                onChange={(e) => handleSelectRoleForPermissions(e.target.value)}
                className="w-full h-10 px-3 border border-slate-250 rounded-xl bg-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Role --</option>
                {systemRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions List */}
            {selectedRoleForPermissions ? (
              <form onSubmit={handleSaveRolePermissionsSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Active Permissions for '{selectedRoleForPermissions.name}'
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
                  {rolePermsList.map((perm) => (
                    <div 
                      key={perm.permission_key}
                      onClick={() => handleToggleRolePermission(perm.permission_key)}
                      className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition"
                    >
                      <div className="space-y-0.5 text-left pr-4">
                        <p className="font-extrabold text-slate-900 text-xs">
                          {perm.permission_key.split('.').slice(-2).join(' / ').toUpperCase()}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
                          Key: {perm.permission_key}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!perm.enabled}
                        readOnly
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 justify-end border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRolesModal(false)}
                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {modalSaving ? "Saving..." : "Save Role Permissions"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center text-slate-400 font-semibold">
                Please select a security role from the dropdown above to view and modify permission controls.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
