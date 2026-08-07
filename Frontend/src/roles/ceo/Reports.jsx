import { useState, useEffect } from 'react'
import { FileText, Download, Users, UserCheck, ShieldCheck, Building2, Activity, Calendar, Filter, Eye, RefreshCw } from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { reportAPI } from '../../services/api.js'
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils.js'

function Reports() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedModule, setSelectedModule] = useState('LEADS') // 'EMPLOYEES', 'CUSTOMERS', 'LEADS', 'OPPORTUNITIES', 'REVENUE', 'ATTENDANCE', 'LEAVE', 'PERFORMANCE'
  const [dateFilter, setDateFilter] = useState('This Month') // 'Today', 'Yesterday', 'This Week', 'This Month', 'This Year', 'Custom'
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')
  
  // Loaded Report rows
  const [reportData, setReportData] = useState([])

  // Sample seed data to query / filter locally
  const dataStore = {
    EMPLOYEES: [
      { employee_id: 'EMP-001', name: 'Vikram Singh', email: 'vikram@tconnect.com', designation: 'Sales Manager', department: 'Sales & BD', status: 'Active', joining_date: '2026-01-15' },
      { employee_id: 'EMP-002', name: 'Suresh V', email: 'suresh@tconnect.com', designation: 'Sales Manager', department: 'Sales & BD', status: 'Active', joining_date: '2026-02-10' },
      { employee_id: 'EMP-003', name: 'Ananya Roy', email: 'ananya@tconnect.com', designation: 'Sales Executive', department: 'Sales & BD', status: 'Active', joining_date: '2026-03-01' },
      { employee_id: 'EMP-004', name: 'Karthik Raja', email: 'karthik@tconnect.com', designation: 'Sales Executive', department: 'Sales & BD', status: 'Active', joining_date: '2026-03-12' },
      { employee_id: 'EMP-005', name: 'Priya Sharma', email: 'priya@tconnect.com', designation: 'Admin', department: 'Operations', status: 'Active', joining_date: '2026-04-18' },
    ],
    CUSTOMERS: [
      { customer_id: 'CUST-101', company: 'Apex Technologies', contact_person: 'Rajesh Kumar', email: 'contact@apex.com', sales_manager: 'Vikram Singh', contract_value: '₹4,50,000', status: 'Active' },
      { customer_id: 'CUST-102', company: 'Global Corp Solutions', contact_person: 'Sarah Smith', email: 'info@globalcorp.net', sales_manager: 'Suresh V', contract_value: '₹2,50,000', status: 'Active' },
      { customer_id: 'CUST-103', company: 'Vertex Systems', contact_person: 'David Miller', email: 'miller@vertex.org', sales_manager: 'Vikram Singh', contract_value: '₹3,00,000', status: 'Active' },
      { customer_id: 'CUST-104', company: 'NextGen Tech', contact_person: 'Mary Jane', email: 'mj@nextgen.com', sales_manager: 'Suresh V', contract_value: '₹1,80,000', status: 'Lost' },
    ],
    LEADS: [
      { lead_id: 'LEAD-201', name: 'Rohan Joshi', company: 'Techno Systems', email: 'rohan@techno.in', source: 'Website', status: 'NEW', created_at: '2026-08-07' },
      { lead_id: 'LEAD-202', name: 'David Brown', company: 'Alpha Group', email: 'dbrown@alpha.com', source: 'Referral', status: 'QUALIFIED', created_at: '2026-08-06' },
      { lead_id: 'LEAD-203', name: 'Deepa Roy', company: 'Star Tech Solutions', email: 'deepa@startech.com', source: 'Cold Call', status: 'CONTACTED', created_at: '2026-08-01' },
      { lead_id: 'LEAD-204', name: 'Alice Lee', company: 'Zenith Logistics', email: 'alice@zenith.com', source: 'Website', status: 'CONVERTED', created_at: '2026-07-28' },
    ],
    OPPORTUNITIES: [
      { opp_id: 'OPP-301', title: 'ERP Software Suite', company: 'Apex Technologies', value: '₹4,50,000', stage: 'CLOSED_WON', assigned_to: 'Ananya Roy', close_date: '2026-08-05' },
      { opp_id: 'OPP-302', title: 'CRM Deployment', company: 'Global Corp', value: '₹2,50,000', stage: 'CLOSED_WON', assigned_to: 'Karthik Raja', close_date: '2026-08-04' },
      { opp_id: 'OPP-303', title: 'Cloud Infrastructure Upgrade', company: 'Star Tech', value: '₹6,00,000', stage: 'PROPOSAL', assigned_to: 'Ananya Roy', close_date: '2026-08-20' },
      { opp_id: 'OPP-304', title: 'Consulting Contract', company: 'Techno Systems', value: '₹1,20,000', stage: 'CLOSED_LOST', assigned_to: 'Karthik Raja', close_date: '2026-08-01' },
    ],
    REVENUE: [
      { receipt_no: 'REV-901', client: 'Apex Technologies', amount: '₹4,50,000', type: 'Software License', sales_manager: 'Vikram Singh', date: '2026-08-05' },
      { receipt_no: 'REV-902', client: 'Global Corp Solutions', amount: '₹2,50,000', type: 'SaaS Subscription', sales_manager: 'Suresh V', date: '2026-08-04' },
      { receipt_no: 'REV-903', client: 'Vertex Systems', amount: '₹3,00,000', type: 'Enterprise Setup', sales_manager: 'Vikram Singh', date: '2026-07-20' },
    ],
    ATTENDANCE: [
      { log_id: 'ATT-401', name: 'Ananya Roy', date: '2026-08-07', clock_in: '09:05 AM', clock_out: '06:00 PM', status: 'PRESENT', check_in_type: 'Biometric' },
      { log_id: 'ATT-402', name: 'Karthik Raja', date: '2026-08-07', clock_in: '09:12 AM', clock_out: '06:00 PM', status: 'PRESENT', check_in_type: 'Biometric' },
      { log_id: 'ATT-403', name: 'Vikram Singh', date: '2026-08-07', clock_in: '09:20 AM', clock_out: '06:30 PM', status: 'PRESENT', check_in_type: 'Manual' },
      { log_id: 'ATT-404', name: 'Suresh V', date: '2026-08-07', clock_in: '08:58 AM', clock_out: '06:00 PM', status: 'PRESENT', check_in_type: 'Biometric' },
    ],
    LEAVE: [
      { request_id: 'LV-501', name: 'Vikram Singh', type: 'Sick Leave', duration: '1 Day', reason: 'Severe Migraine', status: 'Pending', dates: '2026-08-07 to 2026-08-07' },
      { request_id: 'LV-502', name: 'Suresh V', type: 'Casual Leave', duration: '2 Days', reason: 'Family Function', status: 'Pending', dates: '2026-08-10 to 2026-08-11' },
      { request_id: 'LV-503', name: 'Ananya Roy', type: 'Paid Leave', duration: '1 Day', reason: 'Personal work', status: 'Approved', dates: '2026-08-05 to 2026-08-05' },
    ],
    PERFORMANCE: [
      { executive: 'Ananya Roy', leads_generated: 28, visits_completed: 21, customers_converted: 8, revenue: '₹8,50,000', rating: '4.9/5' },
      { executive: 'Karthik Raja', leads_generated: 22, visits_completed: 16, customers_converted: 5, revenue: '₹6,02,000', rating: '4.6/5' },
      { executive: 'Vikram Singh (Manager)', leads_generated: 48, visits_completed: 35, customers_converted: 12, revenue: '₹14,50,000', rating: '4.8/5' },
      { executive: 'Suresh V (Manager)', leads_generated: 32, visits_completed: 24, customers_converted: 9, revenue: '₹10,32,000', rating: '4.5/5' },
    ]
  }

  // Load and apply reports query filter
  const applyReportFilters = () => {
    setLoading(true)
    setTimeout(() => {
      let data = dataStore[selectedModule] || []
      
      // Dynamic date filters depending on data properties
      if (dateFilter !== 'All') {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        data = data.filter((row) => {
          const rowDateStr = row.created_at || row.close_date || row.date || row.joining_date || todayStr
          
          if (dateFilter === 'Today') {
            return rowDateStr === todayStr
          }
          if (dateFilter === 'Yesterday') {
            return rowDateStr === yesterdayStr
          }
          if (dateFilter === 'This Month') {
            return rowDateStr.substring(0, 7) === todayStr.substring(0, 7)
          }
          if (dateFilter === 'This Year') {
            return rowDateStr.substring(0, 4) === todayStr.substring(0, 4)
          }
          if (dateFilter === 'Custom' && customFromDate && customToDate) {
            return rowDateStr >= customFromDate && rowDateStr <= customToDate
          }
          return true
        })
      }
      
      setReportData(data)
      setLoading(false)
      showToast(`Generated report for ${selectedModule} successfully!`, 'success')
    }, 450)
  }

  useEffect(() => {
    applyReportFilters()
  }, [selectedModule, dateFilter, customFromDate, customToDate])

  // Trigger downloads
  const handleDownload = (format) => {
    const filename = `TConnect_${selectedModule.toLowerCase()}_report`
    const title = `TwiteConnect - Executive ${selectedModule} System Report`
    
    if (format === 'CSV') {
      exportToCSV(filename, reportData)
      showToast('Exported CSV successfully!', 'success')
    } else if (format === 'Excel') {
      exportToExcel(filename, reportData)
      showToast('Exported Excel successfully!', 'success')
    } else if (format === 'PDF') {
      exportToPDF(filename, title, reportData)
      showToast('Exported PDF successfully!', 'success')
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#004749]" /> Corporate Reporting Center
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Generate and export custom date-filtered operational statements across all organizational databases.
          </p>
        </div>
        
        {/* Export Group */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleDownload('PDF')}
            className="px-3.5 h-9 bg-[#540000] hover:bg-[#3a0101] text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => handleDownload('Excel')}
            className="px-3.5 h-9 bg-[#004749] hover:bg-[#013b3f] text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={() => handleDownload('CSV')}
            className="px-3.5 h-9 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Query Filters Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
          <Filter className="w-4.5 h-4.5 text-slate-400" />
          <h3 className="text-sm font-extrabold text-slate-900">Query & Scope Criteria</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Module Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">Target Category</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-[#b09b72]"
            >
              <option value="EMPLOYEES">👥 Employees</option>
              <option value="CUSTOMERS">🤝 Customers</option>
              <option value="LEADS">🎯 Leads</option>
              <option value="OPPORTUNITIES">💼 Opportunities</option>
              <option value="REVENUE">💰 Revenue</option>
              <option value="ATTENDANCE">🕒 Attendance</option>
              <option value="LEAVE">🌴 Leave Requests</option>
              <option value="PERFORMANCE">📈 Team Performance</option>
            </select>
          </div>

          {/* Date Filter Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">Date Range Type</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-[#b09b72]"
            >
              <option value="All">All History</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Year">This Year</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === 'Custom' && (
            <>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">From Date</label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="w-full h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-[#b09b72]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">To Date</label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="w-full h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-[#b09b72]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Generated Statement View */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Generated Operational Statement</h3>
            <p className="text-[10px] font-bold text-slate-400">Statement preview matching active search parameters ({reportData.length} records found)</p>
          </div>
          <button
            onClick={applyReportFilters}
            className="p-1.5 border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition"
            title="Refresh Data"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>

        {/* Dynamic Table Columns */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-semibold flex flex-col items-center gap-2">
            <RefreshCw className="size-6 animate-spin text-[#004749]" /> Loading operational statement...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 bg-slate-50/60">
                  {reportData.length > 0 &&
                    Object.keys(reportData[0]).map((key) => (
                      <th key={key} className="py-3 px-4">
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    {Object.values(row).map((val, cellIdx) => (
                      <td key={cellIdx} className="py-3.5 px-4">
                        {val === null || val === undefined ? '' : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td className="py-12 text-center text-slate-400 font-semibold">
                      No records matched current scope or custom dates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports
