import React, { useState, useEffect } from 'react'
import { normalizePhoneNumber } from '../../utils/formatUtils.js'
import { useToast } from '../../common/ToastContext.jsx'
import {
  Users,
  Users2,
  ShieldCheck,
  UserCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Network,
  Activity,
  Award,
  ChevronRight,
  TrendingUp,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  XCircle,
  X,
  Building,
  Eye,
  User,
} from 'lucide-react'
import { hrmsAPI, userAPI, crmAPI, customerAPI } from '../../services/api.js'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { isItemOwnedByUser } from '../../utils/userScope.js'

function TeamManagement() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const [team, setTeam] = useState([])
  const [activeTab, setActiveTab] = useState('All') // 'All' | 'Admin' | 'Sales Manager' | 'Sales Executive' | 'hierarchy'
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewingEmp, setViewingEmp] = useState(null)

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Sales Executive',
    department: 'Sales & BD',
    manager: '',
    reporting_manager_id: '',
    reporting_manager_name: '',
    reporting_manager_email: '',
    status: 'Active',
  })

  const mapEmployeeData = (userList, fetchedLeads = [], fetchedCustomers = []) => {
    const leads = fetchedLeads.length > 0 ? fetchedLeads : JSON.parse(localStorage.getItem('tc_sm_leads') || '[]');
    const customers = fetchedCustomers.length > 0 ? fetchedCustomers : JSON.parse(localStorage.getItem('tc_customer_accounts') || '[]');
    const visits = JSON.parse(localStorage.getItem('tc_sales_visits') || '[]');
    
    return userList.map((e, idx) => {
      const eRole = e.role || 'Sales Executive';
      const eName = e.name || e.full_name || e.email?.split('@')[0] || 'Team Member';
      const eId = e.id || e.employee_id || `USR-${idx + 1}`;
      
      const myExecutives = userList
        .filter(u => u.reporting_manager_name === eName || u.reporting_manager_id === eId || (u.reporting_manager_email && e.email && u.reporting_manager_email.toLowerCase().trim() === e.email.toLowerCase().trim()))
        .map(u => u.name || u.email);

      const isManager = eRole.toLowerCase().includes('manager') || eRole.toLowerCase().includes('admin') || eRole.toLowerCase().includes('ceo');

      const myCustomers = customers.filter(cust => {
        if (isManager) {
          const isOwnedByMgr = isItemOwnedByUser(cust, e);
          const isOwnedByTeammate = myExecutives.some(execNameOrEmail => {
            const clean = String(execNameOrEmail).toLowerCase().trim();
            const custExec = String(cust.sales_executive || cust.assigned_to || cust.assignedTo || cust.executive || '').toLowerCase().trim();
            const custExecEmail = String(cust.assigned_to_email || cust.sales_executive_email || cust.assignedToEmail || '').toLowerCase().trim();
            return (clean && (custExec.includes(clean) || clean.includes(custExec) || custExecEmail === clean));
          });
          return isOwnedByMgr || isOwnedByTeammate;
        }
        return isItemOwnedByUser(cust, e);
      });

      const myLeads = leads.filter(lead => {
        if (isManager) {
          const isOwnedByMgr = isItemOwnedByUser(lead, e);
          const isOwnedByTeammate = myExecutives.some(execNameOrEmail => {
            const clean = String(execNameOrEmail).toLowerCase().trim();
            const leadExec = String(lead.sales_executive || lead.assigned_to || lead.assignedTo || lead.executive || '').toLowerCase().trim();
            const leadExecEmail = String(lead.assigned_to_email || lead.sales_executive_email || lead.assignedToEmail || '').toLowerCase().trim();
            return (clean && (leadExec.includes(clean) || clean.includes(leadExec) || leadExecEmail === clean));
          });
          return isOwnedByMgr || isOwnedByTeammate;
        }
        return isItemOwnedByUser(lead, e);
      });

      const myConvertedLeads = myLeads.filter(
        (l) => {
          const s = String(l.status || '').toLowerCase();
          return s.includes('convert') || s.includes('won');
        }
      );
      
      const dealsWon = myCustomers.length + myConvertedLeads.length;
      const visitCount = visits.filter(v => isItemOwnedByUser(v, e)).length;

      const customerRevenue = myCustomers.reduce((sum, cust) => {
        const valStr = cust.contract_value || cust.amount || cust.contractValue || cust.value || cust.revenue || cust.budget || '0';
        const val = parseFloat(String(valStr).replace(/[^\d.]/g, '')) || 0;
        return sum + Math.round(val);
      }, 0);

      const convertedLeadsRevenue = myLeads
        .filter((l) => {
          const s = String(l.status || '').toLowerCase();
          return s.includes('convert') || s.includes('won');
        })
        .reduce((sum, lead) => {
          const valStr = lead.value || lead.budget || lead.deal_value || lead.dealValue || '0';
          const val = parseFloat(String(valStr).replace(/[^\d.]/g, '')) || 0;
          return sum + Math.round(val);
        }, 0);

      const totalRevenue = customerRevenue;

      return {
        id: eId,
        name: eName,
        email: e.email || '',
        phone: e.phone || '',
        role: eRole,
        department: e.dept || e.department || 'Sales & BD',
        manager: e.reporting_manager_name || (eRole.includes('Manager') || eRole.includes('Admin') ? 'CEO Office' : 'Direct / Unassigned'),
        reporting_manager_id: e.reporting_manager_id || '',
        reporting_manager_name: e.reporting_manager_name || '',
        reporting_manager_email: e.reporting_manager_email || '',
        deals_won: dealsWon,
        revenue: totalRevenue,
        visit_count: visitCount,
        lead_count: myLeads.length,
        incentives: Math.round(totalRevenue * 0.05),
        status: e.status || 'Active',
        executives: myExecutives,
      };
    });
  };

  // Load backend employees
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [usersRes, leadsRes, custRes] = await Promise.all([
          userAPI.getUsers().catch(() => null),
          crmAPI.getLeads().catch(() => null),
          customerAPI.getCustomers().catch(() => null),
        ])

        const userList = usersRes && usersRes.data && Array.isArray(usersRes.data) ? usersRes.data : []
        const rawLeads = Array.isArray(leadsRes) ? leadsRes : (leadsRes?.data || [])
        const rawCustomers = Array.isArray(custRes) ? custRes : (custRes?.data || [])

        const mapped = mapEmployeeData(userList, rawLeads, rawCustomers)
        setTeam(mapped)
      } catch (err) {
        console.warn('Error loading team roster:', err)
        setTeam([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filtered members
  const filteredTeam = team.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.manager || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = activeTab === 'All' || activeTab === 'hierarchy' || (activeTab === 'Admin' ? (m.role === 'Admin' || m.role === 'Super Admin' || m.role === 'System Admin') : m.role === activeTab)

    return matchesSearch && matchesRole
  })

  // Counts
  const totalStaff = team.length
  const totalAdmins = team.filter((m) => m.role === 'Admin' || m.role === 'Super Admin' || m.role === 'System Admin').length
  const totalManagers = team.filter((m) => m.role === 'Sales Manager' || m.role === 'Team Lead').length
  const totalExecutives = team.filter((m) => m.role === 'Sales Executive').length

  const handleOpenAdd = () => {
    setEditingEmp(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Sales Executive',
      department: 'Sales & BD',
      manager: '',
      reporting_manager_id: '',
      reporting_manager_name: '',
      reporting_manager_email: '',
      status: 'Active',
    })
    setShowModal(true)
  }

  const handleOpenEdit = async (emp) => {
    setEditingEmp(emp)
    
    let salaryVal = 35000;
    try {
      const salRes = await hrmsAPI.getSalaryByEmployeeId(emp.employee_id || emp.id);
      if (salRes && salRes.data) {
        salaryVal = salRes.data.monthly_salary || 0;
      }
    } catch (e) {
      console.warn("Failed to load salary details:", e);
    }

    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      department: emp.department,
      manager: emp.manager,
      reporting_manager_id: emp.reporting_manager_id || '',
      reporting_manager_name: emp.reporting_manager_name || '',
      reporting_manager_email: emp.reporting_manager_email || '',
      status: emp.status,
      monthlySalary: salaryVal,
      annualLeaves: emp.annual_leaves ?? emp.annualLeaves ?? 12,
      sickLeaves: emp.sick_leaves ?? emp.sickLeaves ?? 10,
      otherLeaves: emp.other_leaves ?? emp.otherLeaves ?? 10,
      halfDayPermissions: emp.half_day_permissions ?? emp.halfDayPermissions ?? 6,
      shortPermissions: emp.short_permissions ?? emp.shortPermissions ?? 2,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      showToast('Please provide employee name and email', 'error')
      return
    }

    const mId = formData.reporting_manager_id || null
    const mName = formData.reporting_manager_name || null
    const mEmail = formData.reporting_manager_email || null

    if (editingEmp) {
      // Update local state optimistically
      setTeam((prev) =>
        prev.map((m) =>
          m.id === editingEmp.id
            ? {
                ...m,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                department: formData.department,
                manager: mName || (formData.role.includes('Manager') || formData.role.includes('Admin') ? 'CEO Office' : 'Direct / Unassigned'),
                reporting_manager_id: mId,
                reporting_manager_name: mName,
                reporting_manager_email: mEmail,
                status: formData.status,
              }
            : m
        )
      )
      setShowModal(false)

      try {
        await userAPI.updateUser(editingEmp.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          dept: formData.department,
          status: formData.status,
          reporting_manager_id: mId,
          reporting_manager_name: mName,
          reporting_manager_email: mEmail,
        })

        // Save leaves direct to hrms
        await hrmsAPI.updateEmployee(editingEmp.employee_id || editingEmp.id, {
          annual_leaves: Number(formData.annualLeaves || 12),
          sick_leaves: Number(formData.sickLeaves || 10),
          other_leaves: Number(formData.otherLeaves || 10),
          half_day_permissions: Number(formData.halfDayPermissions || 6),
          short_permissions: Number(formData.shortPermissions || 2),
        })

        // Save salary direct to hrms.salaries
        if (formData.monthlySalary !== undefined) {
          await hrmsAPI.updateSalary(editingEmp.employee_id || editingEmp.id, {
            monthly_salary: Number(formData.monthlySalary || 0)
          })
        }

        showToast(`Employee "${formData.name}" details updated successfully!`, 'success')
      } catch (err) {
        showToast('Updated employee details locally', 'info')
      }
    } else {
      const tempId = `EMP-TEMP-${Date.now()}`
      const newEmp = {
        id: tempId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        manager: mName || (formData.role.includes('Manager') || formData.role.includes('Admin') ? 'CEO Office' : 'Direct / Unassigned'),
        reporting_manager_id: mId,
        reporting_manager_name: mName,
        reporting_manager_email: mEmail,
        status: formData.status,
        deals_won: 0,
        revenue: 0,
      }
      setTeam((prev) => [newEmp, ...prev])
      setShowModal(false)

      const autoEmpId = `EMP${String(team.length + 1).padStart(6, '0')}`

      try {
        await userAPI.createUser({
          employee_code: autoEmpId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          dept: formData.department,
          status: formData.status,
          reporting_manager_id: mId,
          reporting_manager_name: mName,
          reporting_manager_email: mEmail,
        })
        showToast(`Employee "${formData.name}" onboarded and added to HRMS!`, 'success')

        // Reload fresh team data
        const freshRes = await userAPI.getUsers().catch(() => null)
        if (freshRes && freshRes.data) {
          const mapped = mapEmployeeData(freshRes.data)
          setTeam(mapped)
        }
      } catch (err) {
        showToast('Onboarded new employee locally', 'info')
      }
    }
  }

  const handleToggleDeactivate = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Deactivated' : 'Active'
    
    // Update local state optimistically
    setTeam((prev) =>
      prev.map((m) => (m.id === emp.id ? { ...m, status: nextStatus } : m))
    )

    try {
      await userAPI.updateUser(emp.id, {
        status: nextStatus
      })
      showToast(`Employee "${emp.name}" status updated to ${nextStatus}!`, 'success')
    } catch (err) {
      showToast('Updated employee status locally', 'info')
    }
  }

  const handleOpenView = (emp) => {
    setViewingEmp(emp)
  }

  const handleOpenMyProfile = () => {
    const myProfile = team.find(m => m.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
    if (myProfile) {
      handleOpenView(myProfile)
    } else {
      handleOpenView({
        id: currentUser.id || 'CEO-001',
        name: currentUser.name || 'Dr. Twite Executive',
        email: currentUser.email || 'ceo@tconnect.com',
        phone: currentUser.phone || '+91 99999 00000',
        role: currentUser.role || 'CEO / Founder',
        department: 'CEO Office',
        manager: 'Board of Directors',
        status: 'Active',
        deals_won: 0,
        revenue: 0,
        visit_count: 0
      })
    }
  }

  // Managers with their respective executives for hierarchy tree
  const managers = team.filter((m) => m.role === 'Sales Manager' || m.role === 'Team Lead')

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <Users2 className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Organizational Team Management
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Executive control of Admins, Sales Managers, and Sales Executives. Manage reporting hierarchies, sales outputs, and role assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenMyProfile}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-black transition shadow-xs cursor-pointer"
          >
            <User className="size-4 text-[#832D51]" />
            My Profile
          </button>
          
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-[#832D51] hover:bg-[#6a2240] text-white px-4 py-2.5 text-xs font-black transition shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            Add Employee / Rep
          </button>
        </div>
      </div>

      {/* Role Breakdown KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Workforce */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Workforce</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900">{totalStaff}</p>
            <span className="text-xs font-bold text-emerald-600">100% Active</span>
          </div>
        </div>

        {/* Admins */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admins</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900">{totalAdmins}</p>
            <span className="text-xs font-bold text-slate-500">Operations Control</span>
          </div>
        </div>

        {/* Sales Managers */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales Managers</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-[#832D51]">{totalManagers}</p>
            <span className="text-xs font-bold text-[#EA6993]">Team Leaders</span>
          </div>
        </div>

        {/* Sales Executives */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales Executives</span>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-[#EA6993]">{totalExecutives}</p>
            <span className="text-xs font-bold text-amber-700">Field / Inside Sales</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['All', 'hierarchy', 'Admin', 'Sales Manager', 'Sales Executive'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#832D51] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab === 'hierarchy' ? 'Manager → Executive Hierarchy' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff, designation, manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#832D51]"
          />
        </div>
      </div>

      {/* Hierarchy View OR Table View */}
      {activeTab === 'hierarchy' ? (
        /* Manager → Executive Hierarchy Cards Tree */
        <div className="grid gap-6 lg:grid-cols-2">
          {managers.map((mgr) => {
            const reportingExecs = team.filter(
              (m) => m.role === 'Sales Executive' && (m.reporting_manager_id === mgr.id || m.manager === mgr.name)
            )
            const managerTotalRevenue = reportingExecs.reduce((acc, curr) => acc + curr.revenue, 0)
            const managerTotalDeals = reportingExecs.reduce((acc, curr) => acc + curr.deals_won, 0)

            return (
              <div
                key={mgr.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4"
              >
                {/* Manager Node Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#832D51] text-white font-black text-sm shadow-sm">
                      {mgr.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{mgr.name}</h3>
                        <span className="rounded bg-[#F8CAE4]/20 px-2 py-0.5 text-[10px] font-black text-[#832D51]">
                          Sales Manager
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{mgr.email} · {mgr.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Team Revenue</span>
                    <p className="text-sm font-black text-emerald-700">
                      {managerTotalRevenue >= 100000 
                        ? `₹${(managerTotalRevenue / 100000).toFixed(1)}L` 
                        : `₹${managerTotalRevenue.toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>

                {/* Direct Reports List */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Direct Sales Executive Reports ({reportingExecs.length})
                  </span>

                  <div className="space-y-2">
                    {reportingExecs.map((exec) => (
                      <div
                        key={exec.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-7 place-items-center rounded-lg bg-white text-slate-800 font-bold border border-slate-200">
                            {exec.name[0]}
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-900">{exec.name}</p>
                            <p className="text-[10px] text-slate-400">{exec.department}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-right">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-right">
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-400">Leads Count</p>
                              <span className="font-black text-slate-800">{exec.lead_count || 0}</span>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-400">Leads Closed</p>
                              <span className="font-black text-indigo-700">{exec.deals_won || 0} Won</span>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-400">Revenue</p>
                              <span className="font-black text-emerald-700">₹{(exec.revenue || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-400">Incentive (5%)</p>
                              <span className="font-black text-purple-700">₹{(exec.incentives || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenView(exec)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                            title="View Profile"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(exec)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {reportingExecs.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No executives assigned to this manager yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Team Table View */
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Employee Name</th>
                <th className="pb-3">Designation / Role</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Reporting Manager</th>
                <th className="pb-3">Deals Won</th>
                <th className="pb-3">Revenue Output</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTeam.map((emp, idx) => (
                <tr key={`${emp.id}-${idx}`} className="hover:bg-slate-50/70 transition">
                  <td className="py-3">
                    <p className="font-extrabold text-slate-900">{emp.name}</p>
                    <p className="text-[10px] text-slate-400">{emp.email}</p>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        emp.role === 'Admin'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : emp.role === 'Sales Manager'
                          ? 'bg-[#F8CAE4]/20 text-[#832D51] border border-[#EA6993]/30'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td className="py-3 text-slate-700">{emp.department}</td>
                  <td className="py-3 text-slate-600 font-bold">{emp.manager || 'None'}</td>
                  <td className="py-3 font-extrabold text-slate-900">{emp.deals_won}</td>
                  <td className="py-3 font-black text-[#832D51]">
                    ₹{(emp.revenue || 0).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                      emp.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenView(emp)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                        title="View Employee Profile"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                        title="Edit Employee"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleDeactivate(emp)}
                        className={`rounded-lg p-1.5 transition ${
                          emp.status === 'Active'
                            ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                            : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title={emp.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}
                      >
                        {emp.status === 'Active' ? (
                          <XCircle className="size-3.5" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingEmp ? 'Edit Employee Details' : 'Add New Employee'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Verma"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@tconnect.com"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: normalizePhoneNumber(e.target.value) })}
                    placeholder="10-digit number e.g. 9876543210"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 outline-none focus:border-[#832D51]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Executive">Sales Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
                  <select
                    value={formData.reporting_manager_id || formData.manager}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === 'CEO Office') {
                        setFormData({
                          ...formData,
                          manager: 'CEO Office',
                          reporting_manager_id: 'CEO Office',
                          reporting_manager_name: 'CEO Office',
                          reporting_manager_email: '',
                        })
                      } else if (!val) {
                        setFormData({
                          ...formData,
                          manager: '',
                          reporting_manager_id: '',
                          reporting_manager_name: '',
                          reporting_manager_email: '',
                        })
                      } else {
                        const matched = team.find(m => m.id === val || m.name === val)
                        setFormData({
                          ...formData,
                          manager: matched?.name || val,
                          reporting_manager_id: matched?.id || val,
                          reporting_manager_name: matched?.name || val,
                          reporting_manager_email: matched?.email || '',
                        })
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50"
                  >
                    <option value="">Select Manager / CEO Office</option>
                    <option value="CEO Office">CEO Office</option>
                    {managers.map(m => (
                      <option key={m.id || m.name} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editingEmp && (
                <>
                  <div className="border-t border-slate-100 my-4" />
                  <div className="space-y-3">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider text-left">Leave & Salary Allocation</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-left">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Annual Leaves</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.annualLeaves || 0}
                          onChange={(e) => setFormData({ ...formData, annualLeaves: Number(e.target.value) })}
                          className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50 focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Sick Leaves</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.sickLeaves || 0}
                          onChange={(e) => setFormData({ ...formData, sickLeaves: Number(e.target.value) })}
                          className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50 focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Other Leaves</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.otherLeaves || 0}
                          onChange={(e) => setFormData({ ...formData, otherLeaves: Number(e.target.value) })}
                          className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50 focus:border-blue-600"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2 text-left">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Half-Day Slots</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.halfDayPermissions || 0}
                          onChange={(e) => setFormData({ ...formData, halfDayPermissions: Number(e.target.value) })}
                          className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50 focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Short Perm (Hrs)</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.shortPermissions || 0}
                          onChange={(e) => setFormData({ ...formData, shortPermissions: Number(e.target.value) })}
                          className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 outline-none bg-slate-50 focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Monthly Salary (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.monthlySalary || 0}
                          onChange={(e) => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                          className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-850 outline-none bg-amber-50/55 focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#832D51] px-5 py-2 font-bold text-white hover:bg-[#6a2240]"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Profile Modal */}
      {viewingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden">
            {/* Header branding line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#832D51]" />
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mt-2">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#832D51] text-white font-black text-sm shadow-sm">
                  {viewingEmp.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{viewingEmp.name}</h3>
                  <span className="inline-flex rounded-md bg-[#F8CAE4]/20 px-2 py-0.5 mt-0.5 text-[10px] font-black text-[#832D51]">
                    {viewingEmp.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingEmp(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Profile Fields Details */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Employee Information</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Mail className="size-4 text-[#832D51] shrink-0" />
                  <div className="truncate">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Email Address</p>
                    <p className="truncate">{viewingEmp.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Phone className="size-4 text-[#832D51] shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Phone Number</p>
                    <p>{viewingEmp.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Building className="size-4 text-[#832D51] shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Department</p>
                    <p>{viewingEmp.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Network className="size-4 text-[#832D51] shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Reporting To</p>
                    <p>{viewingEmp.manager || 'CEO Office'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                <ShieldCheck className="size-4 text-[#832D51] shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Status</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black border mt-0.5 ${
                    viewingEmp.status?.toLowerCase() === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {viewingEmp.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Executive Metrics Section */}
            {viewingEmp.role === 'Sales Executive' && (
              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Field Performance Metrics</h4>
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                    <p className="text-lg font-black text-slate-900">{viewingEmp.visit_count || 0}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Client Visits</p>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                    <p className="text-lg font-black text-slate-900">{viewingEmp.deals_won || 0}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Deals Won</p>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                    <p className="text-lg font-black text-emerald-700 font-extrabold">₹{((viewingEmp.revenue || 0) / 100000).toFixed(1)}L</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Revenue Won</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setViewingEmp(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
            >
              Close Profile View
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamManagement
