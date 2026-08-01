import { useState, useEffect } from 'react'
import { FileText, Download, Users, UserCheck, ShieldCheck, Building2, Activity, Calendar, Filter, Eye } from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { reportAPI } from '../../services/api.js'

function Reports() {
  const { showToast } = useToast()
  const [adminMetrics, setAdminMetrics] = useState({
    totalUsers: 14,
    activeEmployees: 12,
    totalBranches: 4,
    totalDepartments: 6,
    attendanceRate: '94.2%',
    systemSecurityScore: '98/100',
  })

  const [reportCategory, setReportCategory] = useState('ALL')
  const [savedReports, setSavedReports] = useState([
    {
      report_id: 'rep_001',
      report_name: 'HRMS Employee Attendance & Field Visit Audit',
      report_type: 'HRMS_ATTENDANCE',
      module_name: 'HRMS Module',
      generated_by: 'System Administrator',
      created_at: '31/07/2026',
      file_size: '1.4 MB',
    },
    {
      report_id: 'rep_002',
      report_name: 'User Management & Role Permissions Audit Log',
      report_type: 'USER_AUDIT',
      module_name: 'User & Role Management',
      generated_by: 'System Administrator',
      created_at: '30/07/2026',
      file_size: '890 KB',
    },
    {
      report_id: 'rep_003',
      report_name: 'Company Overview & Branch Staff Count Metrics',
      report_type: 'ORGANIZATION_PROFILE',
      module_name: 'Company Profile',
      generated_by: 'System Administrator',
      created_at: '28/07/2026',
      file_size: '2.1 MB',
    },
    {
      report_id: 'rep_004',
      report_name: 'System Access Security & Activity Audit Trail',
      report_type: 'SECURITY_LOGS',
      module_name: 'Security & Audit',
      generated_by: 'System Administrator',
      created_at: '25/07/2026',
      file_size: '1.1 MB',
    },
  ])

  useEffect(() => {
    async function loadReportsData() {
      try {
        const savedRes = await reportAPI.getSavedReports()
        if (savedRes && savedRes.data && savedRes.data.length > 0) {
          setSavedReports(savedRes.data)
        }
      } catch (err) {
        console.error('Loading reports notice:', err)
      }
    }
    loadReportsData()
  }, [])

  const handleExportPDF = (reportName) => {
    showToast(`Exporting administrative report '${reportName}' as PDF...`, 'success')
  }

  const filteredReports = savedReports.filter((rep) => {
    if (reportCategory === 'ALL') return true
    return rep.report_type === reportCategory
  })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" /> Admin Reports & System Analytics
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Administrative metrics, user audit logs, attendance records, and organizational performance reports.
          </p>
        </div>
        <button
          onClick={() => handleExportPDF('System Summary Audit Report')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export Admin System Report
        </button>
      </div>

      {/* Admin Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total System Users</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{adminMetrics.totalUsers} Accounts</h3>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Managed across all roles</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Staff</span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{adminMetrics.activeEmployees} Active</h3>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">HRMS staff active on duty</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Branches & Depts</span>
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{adminMetrics.totalBranches} / {adminMetrics.totalDepartments}</h3>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Branches & departments</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Attendance Rate</span>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{adminMetrics.attendanceRate}</h3>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Monthly staff attendance</p>
        </div>
      </div>

      {/* Generated Reports Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Administrative Reports Directory</h3>
            <p className="text-xs font-semibold text-slate-500">View and download system activity and staff performance audit logs.</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={reportCategory}
              onChange={(e) => setReportCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Administrative Categories</option>
              <option value="HRMS_ATTENDANCE">HRMS Attendance & Field Logs</option>
              <option value="USER_AUDIT">User Management & Permissions</option>
              <option value="ORGANIZATION_PROFILE">Organization & Branch Profile</option>
              <option value="SECURITY_LOGS">Security & Audit Logs</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Report Name</th>
                <th className="px-5 py-3">Module</th>
                <th className="px-5 py-3">Generated By</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filteredReports.map((rep) => (
                <tr key={rep.report_id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5 font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    {rep.report_name}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{rep.module_name}</td>
                  <td className="px-5 py-3.5 text-slate-600">{rep.generated_by || 'System Admin'}</td>
                  <td className="px-5 py-3.5 text-slate-500 font-medium">{rep.created_at}</td>
                  <td className="px-5 py-3.5 text-slate-500 font-medium">{rep.file_size || '1.2 MB'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleExportPDF(rep.report_name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400 font-semibold">
                    No reports match the selected category filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports
