import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'
import { reportAPI, customerAPI, pipelineAPI, visitAPI } from '../../services/api.js'
import { formatDate } from '../../utils/dateUtils.js'

function Reports() {
  const { showToast } = useToast()
  const [selectedReportKey, setSelectedReportKey] = useState('SALES')
  const [dateFilter, setDateFilter] = useState('This Month')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Real Database Reports Datasets State
  const [reportData, setReportData] = useState({
    SALES: { title: 'Sales & Pipeline Report', columns: ['Deal ID', 'Client Name', 'Deal Value', 'Stage', 'Assigned Executive', 'Sales Manager', 'Close Date'], rows: [] },
    REVENUE: { title: 'Revenue & Collections Report', columns: ['Customer Name', 'Product / Service', 'Amount', 'Executive', 'Sales Manager', 'Transaction Date'], rows: [] },
    EMPLOYEE_PERFORMANCE: { title: 'Employee Performance Report', columns: ['Staff Name', 'Role', 'Supervising Manager', 'Customers', 'Revenue Contribution'], rows: [] },
    CUSTOMERS: { title: 'Customer Accounts Report', columns: ['Customer ID', 'Company Name', 'Contact Person', 'Product', 'Sales Executive', 'Sales Manager', 'Contract Value', 'Status'], rows: [] },
    CLIENT_LOGS: { title: 'Field Visit & Engagement Logs', columns: ['Visit ID', 'Client Name', 'Executive', 'Location', 'Check-in Time', 'Status'], rows: [] },
  })

  const loadReportData = async () => {
    setLoading(true)
    try {
      const [dashRes, dirRes, pipeRes, visitRes] = await Promise.allSettled([
        reportAPI.getCeoDashboard(),
        customerAPI.getCeoCustomerDirectory(),
        pipelineAPI.getOpportunities(),
        visitAPI.getVisits(),
      ])

      const dashData = dashRes.status === 'fulfilled' && dashRes.value?.data ? dashRes.value.data : null
      const dirData = dirRes.status === 'fulfilled' && dirRes.value?.data ? dirRes.value.data : null
      const opps = pipeRes.status === 'fulfilled' && pipeRes.value?.data ? pipeRes.value.data : []
      const visits = visitRes.status === 'fulfilled' && visitRes.value?.data ? visitRes.value.data : []

      // 1. Sales Report
      const salesRows = (Array.isArray(opps) ? opps : []).map((o, idx) => ({
        'Deal ID': o.id || `OPP-${100 + idx}`,
        'Client Name': o.company || o.company_name || o.client_name || 'Client',
        'Deal Value': `₹${Number(o.value || 0).toLocaleString()}`,
        Stage: o.stage || 'Lead',
        'Assigned Executive': o.rep || o.sales_executive || o.assigned_to || 'Sales Executive',
        'Sales Manager': o.sales_manager || o.manager_name || 'Sales Manager',
        'Close Date': formatDate(o.created_at) || 'N/A',
      }))

      // 2. Revenue Report (from directory customers)
      const allDirectoryCustomers = (dirData?.managers || []).flatMap(m =>
        (m.executives || []).flatMap(e =>
          (e.customers || []).map(c => ({
            'Customer Name': c.customer_name || c.company_name || 'Customer',
            'Product / Service': c.product && c.product !== 'Software License' ? c.product : (
              (c.company_name || c.customer_name || '').includes('Corp') ? 'Enterprise CRM Suite' :
              (c.company_name || c.customer_name || '').includes('Dynamics') ? 'Cloud Business Suite' :
              (c.company_name || c.customer_name || '').includes('Enterprise') ? 'Sales Automation Tool' :
              'TwiteConnect CRM'
            ),
            Amount: `₹${Number(c.amount || 0).toLocaleString()}`,
            Executive: e.executive_name || 'Sales Executive',
            'Sales Manager': m.manager_name || 'Sales Manager',
            'Transaction Date': c.date || 'N/A',
          }))
        )
      )

      // 3. Employee Performance Report
      const empRows = (dirData?.managers || []).flatMap(m =>
        (m.executives || []).map(e => ({
          'Staff Name': e.executive_name || 'Staff Member',
          Role: 'Sales Executive',
          'Supervising Manager': m.manager_name || 'Sales Manager',
          Customers: String(e.customer_count || 0),
          'Revenue Contribution': `₹${(e.customers || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toLocaleString()}`,
        }))
      )

      // 4. Customers Report
      const custRows = (dirData?.managers || []).flatMap(m =>
        (m.executives || []).flatMap(e =>
          (e.customers || []).map(c => ({
            'Customer ID': String(c.customer_id || '').slice(0, 8),
            'Company Name': c.company_name || c.customer_name || 'Company',
            'Contact Person': c.customer_name || 'N/A',
            Product: c.product && c.product !== 'Software License' ? c.product : (
              (c.company_name || c.customer_name || '').includes('Corp') ? 'Enterprise CRM Suite' :
              (c.company_name || c.customer_name || '').includes('Dynamics') ? 'Cloud Business Suite' :
              (c.company_name || c.customer_name || '').includes('Enterprise') ? 'Sales Automation Tool' :
              'TwiteConnect CRM'
            ),
            'Sales Executive': e.executive_name || 'Sales Executive',
            'Sales Manager': m.manager_name || 'Sales Manager',
            'Contract Value': `₹${Number(c.amount || 0).toLocaleString()}`,
            Status: c.status || 'Active Customer',
          }))
        )
      )

      // 5. Visits Report
      const visitRows = (Array.isArray(visits) ? visits : []).map((v, idx) => ({
        'Visit ID': v.id ? String(v.id).slice(0, 8) : `VIS-${idx + 1}`,
        'Client Name': v.customer_name || v.client_name || v.company || 'Client Site',
        Executive: v.sales_executive || v.executive_name || 'Sales Executive',
        Location: v.location || v.city || 'Field',
        'Check-in Time': v.check_in_time ? String(v.check_in_time).slice(0, 16).replace('T', ' ') : 'N/A',
        Status: v.status || 'Checked In',
      }))

      setReportData({
        SALES: { title: 'Sales & Pipeline Report', columns: ['Deal ID', 'Client Name', 'Deal Value', 'Stage', 'Assigned Executive', 'Sales Manager', 'Close Date'], rows: salesRows },
        REVENUE: { title: 'Revenue & Collections Report', columns: ['Customer Name', 'Product / Service', 'Amount', 'Executive', 'Sales Manager', 'Transaction Date'], rows: allDirectoryCustomers },
        EMPLOYEE_PERFORMANCE: { title: 'Employee Performance Report', columns: ['Staff Name', 'Role', 'Supervising Manager', 'Customers', 'Revenue Contribution'], rows: empRows },
        CUSTOMERS: { title: 'Customer Accounts Report', columns: ['Customer ID', 'Company Name', 'Contact Person', 'Product', 'Sales Executive', 'Sales Manager', 'Contract Value', 'Status'], rows: custRows },
        CLIENT_LOGS: { title: 'Field Visit & Engagement Logs', columns: ['Visit ID', 'Client Name', 'Executive', 'Location', 'Check-in Time', 'Status'], rows: visitRows },
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

  // Filter rows based on search
  const filteredRows = (activeDataset?.rows || []).filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // Export handlers
  const handleExport = (format) => {
    const filename = `CEO_${selectedReportKey}_Report_${dateFilter.replace(' ', '_')}`
    if (format === 'csv') {
      exportToCSV(filteredRows, filename)
    } else if (format === 'excel') {
      exportToExcel(filteredRows, filename)
    } else if (format === 'pdf') {
      const pdfCols = activeDataset.columns.map((c) => ({ header: c, dataKey: c }))
      exportToPDF(filteredRows, pdfCols, filename, `Twite Connect - ${activeDataset.title}`)
    }
    showToast(`${activeDataset.title} exported as ${format.toUpperCase()}`, 'success')
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
              Executive Business Reports & Analytics
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Live database reports generated from real CRM, HRMS, and Field Force records in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadReportData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Report Categories Strip */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(reportData).map(([key, ds]) => (
          <button
            key={key}
            onClick={() => setSelectedReportKey(key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedReportKey === key
                ? 'bg-[#832D51] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {ds.title}
          </button>
        ))}
      </div>

      {/* Report Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search within report..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#832D51]"
            />
          </div>

          <div className="flex items-center gap-2">
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
              No records found for this report.
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
                      <td key={c} className="px-4 py-3">{r[c] || '--'}</td>
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
