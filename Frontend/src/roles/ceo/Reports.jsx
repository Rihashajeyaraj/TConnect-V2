import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Download,
  Users,
  Building2,
  Activity,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Award,
  TrendingUp,
  DollarSign,
  Layers,
  FileSpreadsheet,
  Briefcase,
  ShieldCheck,
  MapPin,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'
import { reportAPI, customerAPI, pipelineAPI, visitAPI, hrmsAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'

const DEFAULT_DEPARTMENTS = [
  'All Departments',
  'Sales & Marketing',
  'Field Operations',
  'HR & Administration',
  'Finance & Accounts',
  'Engineering & IT',
]

function Reports() {
  const { showToast } = useToast()
  const [selectedReportKey, setSelectedReportKey] = useState('SALES')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [dateFilter, setDateFilter] = useState('This Month')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [availableDepartments, setAvailableDepartments] = useState(DEFAULT_DEPARTMENTS)

  // Real Database Reports Datasets State
  const [reportData, setReportData] = useState({
    SALES: {
      title: 'Sales & Pipeline Report',
      columns: ['Deal ID', 'Client Name', 'Department', 'Deal Value', 'Stage', 'Assigned Executive', 'Sales Manager', 'Close Date'],
      rows: [],
    },
    REVENUE: {
      title: 'Revenue & Collections Report',
      columns: ['Customer Name', 'Department', 'Product / Service', 'Amount', 'Executive', 'Sales Manager', 'Transaction Date'],
      rows: [],
    },
    EMPLOYEE_PERFORMANCE: {
      title: 'Employee Performance Report',
      columns: ['Staff Name', 'Department', 'Role', 'Supervising Manager', 'Customers', 'Revenue Contribution'],
      rows: [],
    },
    CUSTOMERS: {
      title: 'Customer Accounts Report',
      columns: ['Customer ID', 'Company Name', 'Department', 'Contact Person', 'Product', 'Sales Executive', 'Sales Manager', 'Contract Value', 'Status'],
      rows: [],
    },
    CLIENT_LOGS: {
      title: 'Field Visit & Engagement Logs',
      columns: ['Visit ID', 'Client Name', 'Department', 'Executive', 'Location', 'Check-in Time', 'Status'],
      rows: [],
    },
  })

  const loadReportData = async () => {
    setLoading(true)
    try {
      const [dashRes, dirRes, pipeRes, visitRes, empRes] = await Promise.allSettled([
        reportAPI.getCeoDashboard(),
        customerAPI.getCeoCustomerDirectory(),
        pipelineAPI.getOpportunities(),
        visitAPI.getVisits(),
        hrmsAPI.getEmployees(),
      ])

      const dashData = dashRes.status === 'fulfilled' && dashRes.value?.data ? dashRes.value.data : null
      const dirData = dirRes.status === 'fulfilled' && dirRes.value?.data ? dirRes.value.data : null
      const opps = pipeRes.status === 'fulfilled' && pipeRes.value?.data ? pipeRes.value.data : []
      const visits = visitRes.status === 'fulfilled' && visitRes.value?.data ? visitRes.value.data : []
      const rawEmployees = empRes.status === 'fulfilled' && empRes.value ? (Array.isArray(empRes.value) ? empRes.value : empRes.value.data || []) : []

      // Build employee department lookup map
      const empDeptMap = {}
      const detectedDepts = new Set(['All Departments', 'Sales & Marketing', 'Field Operations', 'HR & Administration', 'Finance & Accounts', 'Engineering & IT'])

      rawEmployees.forEach(e => {
        const emailKey = (e.email || '').toLowerCase().trim()
        const nameKey = (e.name || e.employee_name || '').toLowerCase().trim()
        const dept = e.department || e.dept || (
          (e.role || '').toLowerCase().includes('field') ? 'Field Operations' :
          (e.role || '').toLowerCase().includes('hr') || (e.role || '').toLowerCase().includes('admin') ? 'HR & Administration' :
          (e.role || '').toLowerCase().includes('finance') || (e.role || '').toLowerCase().includes('account') ? 'Finance & Accounts' :
          (e.role || '').toLowerCase().includes('tech') || (e.role || '').toLowerCase().includes('dev') ? 'Engineering & IT' :
          'Sales & Marketing'
        )
        if (emailKey) empDeptMap[emailKey] = dept
        if (nameKey) empDeptMap[nameKey] = dept
        if (dept) detectedDepts.add(dept)
      })

      setAvailableDepartments(Array.from(detectedDepts))

      const resolveDept = (nameOrEmail, defaultFallback = 'Sales & Marketing') => {
        if (!nameOrEmail) return defaultFallback
        const key = String(nameOrEmail).toLowerCase().trim()
        return empDeptMap[key] || defaultFallback
      }

      // 1. Sales Report
      const salesRows = (Array.isArray(opps) ? opps : []).map((o, idx) => {
        const exec = o.rep || o.sales_executive || o.assigned_to || 'Sales Executive'
        return {
          'Deal ID': o.id || `OPP-${100 + idx}`,
          Date: formatDate(o.date || o.created_at),
          'Client Name': o.company || o.company_name || o.client_name || 'Client',
          Department: resolveDept(exec, 'Sales & Marketing'),
          'Deal Value': `₹${Number(o.value || 0).toLocaleString()}`,
          Stage: o.stage || 'Lead',
          'Assigned Executive': exec,
          'Sales Manager': o.sales_manager || o.manager_name || 'Sales Manager',
          'Close Date': formatDate(o.created_at) || 'N/A',
        }
      })

      // 2. Revenue Report
      const allDirectoryCustomers = (dirData?.managers || []).flatMap(m =>
        (m.executives || []).flatMap(e =>
          (e.customers || []).map(c => {
            const exec = e.executive_name || 'Sales Executive'
            return {
              'Customer Name': c.customer_name || c.company_name || 'Customer',
              Date: formatDate(c.date || c.created_at),
              Department: resolveDept(exec, 'Sales & Marketing'),
              'Product / Service': c.product && c.product !== 'Software License' ? c.product : (
                (c.company_name || c.customer_name || '').includes('Corp') ? 'Enterprise CRM Suite' :
                (c.company_name || c.customer_name || '').includes('Dynamics') ? 'Cloud Business Suite' :
                (c.company_name || c.customer_name || '').includes('Enterprise') ? 'Sales Automation Tool' :
                'TwiteConnect CRM'
              ),
              Amount: `₹${Number(c.amount || 0).toLocaleString()}`,
              Executive: exec,
              'Sales Manager': m.manager_name || 'Sales Manager',
              'Transaction Date': formatDate(c.date) || 'N/A',
            }
          })
        )
      )

      // 3. Employee Performance Report
      const empRows = (dirData?.managers || []).flatMap(m =>
        (m.executives || []).map(e => {
          const exec = e.executive_name || 'Staff Member'
          return {
            'Staff Name': exec,
            Date: formatDate(e.date || e.created_at || new Date()),
            Department: resolveDept(exec, 'Sales & Marketing'),
            Role: 'Sales Executive',
            'Supervising Manager': m.manager_name || 'Sales Manager',
            Customers: String(e.customer_count || 0),
            'Revenue Contribution': `₹${(e.customers || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toLocaleString()}`,
          }
        })
      )

      // 4. Customers Report
      const custRows = (dirData?.managers || []).flatMap(m =>
        (m.executives || []).flatMap(e =>
          (e.customers || []).map(c => {
            const exec = e.executive_name || 'Sales Executive'
            return {
              'Customer ID': String(c.customer_id || '').slice(0, 8),
              Date: formatDate(c.date || c.created_at),
              'Company Name': c.company_name || c.customer_name || 'Company',
              Department: resolveDept(exec, 'Sales & Marketing'),
              'Contact Person': c.customer_name || 'N/A',
              Product: c.product && c.product !== 'Software License' ? c.product : (
                (c.company_name || c.customer_name || '').includes('Corp') ? 'Enterprise CRM Suite' :
                (c.company_name || c.customer_name || '').includes('Dynamics') ? 'Cloud Business Suite' :
                (c.company_name || c.customer_name || '').includes('Enterprise') ? 'Sales Automation Tool' :
                'TwiteConnect CRM'
              ),
              'Sales Executive': exec,
              'Sales Manager': m.manager_name || 'Sales Manager',
              'Contract Value': `₹${Number(c.amount || 0).toLocaleString()}`,
              Status: c.status || 'Active Customer',
            }
          })
        )
      )

      // 5. Visits Report (Field Visit - No Date column requested)
      const visitRows = (Array.isArray(visits) ? visits : []).map((v, idx) => {
        const exec = v.sales_executive || v.executive_name || 'Sales Executive'
        return {
          'Visit ID': v.id ? String(v.id).slice(0, 8) : `VIS-${idx + 1}`,
          'Client Name': v.customer_name || v.client_name || v.company || 'Client Site',
          Department: resolveDept(exec, 'Field Operations'),
          Executive: exec,
          Location: v.location || v.city || 'Field',
          'Check-in Time': v.check_in_time ? String(v.check_in_time).slice(0, 16).replace('T', ' ') : 'N/A',
          Status: v.status || 'Checked In',
        }
      })

      setReportData({
        SALES: {
          title: 'Sales & Pipeline Report',
          columns: ['Deal ID', 'Date', 'Client Name', 'Department', 'Deal Value', 'Stage', 'Assigned Executive', 'Sales Manager', 'Close Date'],
          rows: salesRows,
        },
        REVENUE: {
          title: 'Revenue & Collections Report',
          columns: ['Customer Name', 'Date', 'Department', 'Product / Service', 'Amount', 'Executive', 'Sales Manager', 'Transaction Date'],
          rows: allDirectoryCustomers,
        },
        EMPLOYEE_PERFORMANCE: {
          title: 'Employee Performance Report',
          columns: ['Staff Name', 'Date', 'Department', 'Role', 'Supervising Manager', 'Customers', 'Revenue Contribution'],
          rows: empRows,
        },
        CUSTOMERS: {
          title: 'Customer Accounts Report',
          columns: ['Customer ID', 'Date', 'Company Name', 'Department', 'Contact Person', 'Product', 'Sales Executive', 'Sales Manager', 'Contract Value', 'Status'],
          rows: custRows,
        },
        CLIENT_LOGS: {
          title: 'Field Visit & Engagement Logs',
          columns: ['Visit ID', 'Client Name', 'Department', 'Executive', 'Location', 'Check-in Time', 'Status'],
          rows: visitRows,
        },
      })
    } catch (e) {
      console.error('Error constructing dynamic reports:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [])

  const activeDataset = reportData[selectedReportKey] || reportData.SALES

  // Department-Wise Department Card Summaries
  const departmentSummaries = useMemo(() => {
    const allRows = activeDataset?.rows || []
    const deptMap = {}

    availableDepartments.filter(d => d !== 'All Departments').forEach(d => {
      deptMap[d] = { count: 0, dept: d }
    })

    allRows.forEach(r => {
      const dept = r.Department || 'Sales & Marketing'
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, dept: dept }
      }
      deptMap[dept].count += 1
    })

    return Object.values(deptMap)
  }, [activeDataset, availableDepartments])

  // Filter rows based on search and selected department
  const filteredRows = useMemo(() => {
    return (activeDataset?.rows || []).filter((row) => {
      const matchesDept = selectedDepartment === 'All Departments' || row.Department === selectedDepartment
      const matchesSearch = Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
      return matchesDept && matchesSearch
    })
  }, [activeDataset, selectedDepartment, searchQuery])

  // Export handlers
  const handleExport = (format) => {
    const deptSuffix = selectedDepartment === 'All Departments' ? 'All_Depts' : selectedDepartment.replace(/[\s&]+/g, '_')
    const filename = `CEO_${selectedReportKey}_${deptSuffix}_Report`
    if (format === 'csv') {
      exportToCSV(filteredRows, filename)
    } else if (format === 'excel') {
      exportToExcel(filteredRows, filename)
    } else if (format === 'pdf') {
      const pdfCols = activeDataset.columns.map((c) => ({ header: c, dataKey: c }))
      exportToPDF(filteredRows, pdfCols, filename, `Twite Connect - ${activeDataset.title} (${selectedDepartment})`)
    }
    showToast(`${activeDataset.title} (${selectedDepartment}) exported as ${format.toUpperCase()}`, 'success')
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#F8CAE4]/20 text-[#832D51]">
              <FileText className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive Department-Wise Business Reports
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Department-partitioned intelligence: View and export tailored report records across Sales, Field Operations, HR, and Finance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadReportData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── DEPARTMENT-WISE SUMMARY SELECTION CARDS ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="size-3.5 text-[#832D51]" /> Select Department
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            Showing <strong className="text-[#832D51] font-black">{filteredRows.length}</strong> records in <span className="underline decoration-[#832D51]">{selectedDepartment}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => setSelectedDepartment('All Departments')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedDepartment === 'All Departments'
                ? 'bg-[#832D51] text-white border-[#832D51] shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className={`text-[10px] font-black uppercase tracking-wider ${selectedDepartment === 'All Departments' ? 'text-pink-200' : 'text-slate-400'}`}>
              All Departments
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-black">{activeDataset.rows.length}</span>
              <span className={`text-[9px] font-bold ${selectedDepartment === 'All Departments' ? 'text-white' : 'text-[#832D51]'}`}>Total Records</span>
            </div>
          </button>

          {departmentSummaries.map((ds) => (
            <button
              key={ds.dept}
              onClick={() => setSelectedDepartment(ds.dept)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                selectedDepartment === ds.dept
                  ? 'bg-[#832D51] text-white border-[#832D51] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-wider truncate ${selectedDepartment === ds.dept ? 'text-pink-200' : 'text-slate-400'}`}>
                {ds.dept}
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black">{ds.count}</span>
                <span className={`text-[9px] font-bold ${selectedDepartment === ds.dept ? 'text-white' : 'text-[#832D51]'}`}>Records</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Categories Strip */}
      <div className="flex flex-wrap gap-2 pt-2">
        {Object.entries(reportData).map(([key, ds]) => (
          <button
            key={key}
            onClick={() => setSelectedReportKey(key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedReportKey === key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {ds.title}
          </button>
        ))}
      </div>

      {/* Report Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search within ${selectedDepartment} report...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51]"
            />
          </div>

          {/* Department Dropdown Filter Alternative */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#832D51] cursor-pointer shadow-2xs"
            >
              {availableDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
            >
              <Download className="size-3.5" /> CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5" /> Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#832D51] hover:bg-[#6a2240] text-white font-bold text-xs rounded-lg transition cursor-pointer"
            >
              <Download className="size-3.5" /> PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-[#832D51]" />
              Loading database report records...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No records found for {selectedDepartment} under {activeDataset.title}.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  {activeDataset.columns.map((c) => (
                    <th key={c} className="px-4 py-3">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredRows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-slate-50/60 transition">
                    {activeDataset.columns.map((c) => (
                      <td key={c} className="px-4 py-3">
                        {c === 'Department' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                            {r[c]}
                          </span>
                        ) : (
                          r[c] || '--'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports
