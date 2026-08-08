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

// Comprehensive Data Stores for all 7 required CEO Reports
const REPORT_DATASETS = {
  SALES: {
    title: 'Sales & Pipeline Report',
    columns: ['Deal ID', 'Client Name', 'Deal Value', 'Stage', 'Assigned Executive', 'Sales Manager', 'Close Date'],
    rows: [
      { 'Deal ID': 'OPP-301', 'Client Name': 'Apex Technologies', 'Deal Value': '₹4,50,000', Stage: 'Won', 'Assigned Executive': 'Ananya Roy', 'Sales Manager': 'Vikram Singh', 'Close Date': '2026-08-05' },
      { 'Deal ID': 'OPP-302', 'Client Name': 'Global Corp Solutions', 'Deal Value': '₹2,50,000', Stage: 'Won', 'Assigned Executive': 'Karthik Raja', 'Sales Manager': 'Suresh V', 'Close Date': '2026-08-04' },
      { 'Deal ID': 'OPP-303', 'Client Name': 'Star Tech Solutions', 'Deal Value': '₹6,00,000', Stage: 'Proposal', 'Assigned Executive': 'Ananya Roy', 'Sales Manager': 'Vikram Singh', 'Close Date': '2026-08-20' },
      { 'Deal ID': 'OPP-304', 'Client Name': 'Techno Systems', 'Deal Value': '₹1,20,000', Stage: 'Negotiation', 'Assigned Executive': 'Robert Smith', 'Sales Manager': 'Vikram Singh', 'Close Date': '2026-08-15' },
      { 'Deal ID': 'OPP-305', 'Client Name': 'Zenith Logistics', 'Deal Value': '₹3,50,000', Stage: 'Qualified', 'Assigned Executive': 'Mary Jane', 'Sales Manager': 'Suresh V', 'Close Date': '2026-08-22' },
      { 'Deal ID': 'OPP-306', 'Client Name': 'Delta Softwares', 'Deal Value': '₹1,80,000', Stage: 'Lost', 'Assigned Executive': 'Karthik Raja', 'Sales Manager': 'Suresh V', 'Close Date': '2026-08-01' },
    ],
  },
  REVENUE: {
    title: 'Revenue & Collections Report',
    columns: ['Receipt No', 'Customer Name', 'License / Service', 'Amount', 'Sales Manager', 'Transaction Date'],
    rows: [
      { 'Receipt No': 'REV-901', 'Customer Name': 'Apex Technologies', 'License / Service': 'Enterprise ERP License', Amount: '₹4,50,000', 'Sales Manager': 'Vikram Singh', 'Transaction Date': '2026-08-05' },
      { 'Receipt No': 'REV-902', 'Customer Name': 'Global Corp Solutions', 'License / Service': 'SaaS Multi-branch CRM', Amount: '₹2,50,000', 'Sales Manager': 'Suresh V', 'Transaction Date': '2026-08-04' },
      { 'Receipt No': 'REV-903', 'Customer Name': 'Vertex Systems', 'License / Service': 'Cloud Migration Support', Amount: '₹3,00,000', 'Sales Manager': 'Vikram Singh', 'Transaction Date': '2026-08-01' },
      { 'Receipt No': 'REV-904', 'Customer Name': 'Star Tech Enterprises', 'License / Service': 'Field Force Module', Amount: '₹3,80,000', 'Sales Manager': 'Vikram Singh', 'Transaction Date': '2026-08-03' },
    ],
  },
  EMPLOYEE_PERFORMANCE: {
    title: 'Employee Performance Report',
    columns: ['Employee ID', 'Staff Name', 'Role', 'Visits Completed', 'Deals Won', 'Revenue Contribution', 'Rating'],
    rows: [
      { 'Employee ID': 'EMP-003', 'Staff Name': 'Ananya Roy', Role: 'Sales Executive', 'Visits Completed': '28', 'Deals Won': '8', 'Revenue Contribution': '₹9,40,000', Rating: '4.9 / 5.0' },
      { 'Employee ID': 'EMP-004', 'Staff Name': 'Karthik Raja', Role: 'Sales Executive', 'Visits Completed': '22', 'Deals Won': '6', 'Revenue Contribution': '₹7,10,000', Rating: '4.7 / 5.0' },
      { 'Employee ID': 'EMP-006', 'Staff Name': 'Robert Smith', Role: 'Sales Executive', 'Visits Completed': '20', 'Deals Won': '6', 'Revenue Contribution': '₹7,10,000', Rating: '4.6 / 5.0' },
      { 'Employee ID': 'EMP-007', 'Staff Name': 'Mary Jane', Role: 'Sales Executive', 'Visits Completed': '18', 'Deals Won': '4', 'Revenue Contribution': '₹4,80,000', Rating: '4.6 / 5.0' },
    ],
  },
  CUSTOMERS: {
    title: 'Customer Accounts & SLA Report',
    columns: ['Customer ID', 'Company Name', 'Primary Contact', 'Location', 'Sales Manager', 'Contract Value', 'Status'],
    rows: [
      { 'Customer ID': 'CUST-101', 'Company Name': 'Apex Technologies', 'Primary Contact': 'Rajesh Kumar', Location: 'Chennai, TN', 'Sales Manager': 'Vikram Singh', 'Contract Value': '₹4,50,000', Status: 'Active' },
      { 'Customer ID': 'CUST-102', 'Company Name': 'Global Corp Solutions', 'Primary Contact': 'Sarah Smith', Location: 'Bangalore, KA', 'Sales Manager': 'Suresh V', 'Contract Value': '₹2,50,000', Status: 'Active' },
      { 'Customer ID': 'CUST-103', 'Company Name': 'Vertex Systems', 'Primary Contact': 'David Miller', Location: 'Mumbai, MH', 'Sales Manager': 'Vikram Singh', 'Contract Value': '₹3,00,000', Status: 'Active' },
      { 'Customer ID': 'CUST-104', 'Company Name': 'Star Tech Enterprises', 'Primary Contact': 'Deepa Roy', Location: 'Hyderabad, TS', 'Sales Manager': 'Vikram Singh', 'Contract Value': '₹3,80,000', Status: 'Active' },
      { 'Customer ID': 'CUST-105', 'Company Name': 'Zenith Logistics', 'Primary Contact': 'Alice Lee', Location: 'Coimbatore, TN', 'Sales Manager': 'Suresh V', 'Contract Value': '₹1,80,000', Status: 'Active' },
    ],
  },
  LEAD_CONVERSION: {
    title: 'Lead Conversion & Funnel Report',
    columns: ['Lead ID', 'Lead Company', 'Contact Person', 'Source Channel', 'Status', 'Assigned Rep', 'Conversion Rate'],
    rows: [
      { 'Lead ID': 'LEAD-201', 'Lead Company': 'Techno Systems', 'Contact Person': 'Rohan Joshi', 'Source Channel': 'Website Inbound', Status: 'Qualified', 'Assigned Rep': 'Robert Smith', 'Conversion Rate': '75%' },
      { 'Lead ID': 'LEAD-202', 'Lead Company': 'Alpha Group', 'Contact Person': 'David Brown', 'Source Channel': 'Executive Referral', Status: 'Converted to Deal', 'Assigned Rep': 'Ananya Roy', 'Conversion Rate': '100%' },
      { 'Lead ID': 'LEAD-203', 'Lead Company': 'Star Tech Solutions', 'Contact Person': 'Deepa Roy', 'Source Channel': 'Direct Outreach', Status: 'Won Customer', 'Assigned Rep': 'Ananya Roy', 'Conversion Rate': '100%' },
      { 'Lead ID': 'LEAD-204', 'Lead Company': 'Zenith Logistics', 'Contact Person': 'Alice Lee', 'Source Channel': 'Website Inbound', Status: 'Proposal Stage', 'Assigned Rep': 'Mary Jane', 'Conversion Rate': '60%' },
    ],
  },
  MANAGER_PERFORMANCE: {
    title: 'Manager Performance Report',
    columns: ['Manager Name', 'Supervised Region', 'Team Size', 'Assigned Leads', 'Won Deals', 'Realized Revenue', 'Target Achievement'],
    rows: [
      { 'Manager Name': 'Vikram Singh', 'Supervised Region': 'South Region', 'Team Size': '6 Reps', 'Assigned Leads': '82', 'Won Deals': '14', 'Realized Revenue': '₹16,50,000', 'Target Achievement': '82.5%' },
      { 'Manager Name': 'Suresh V', 'Supervised Region': 'Tech & Western Region', 'Team Size': '5 Reps', 'Assigned Leads': '60', 'Won Deals': '10', 'Realized Revenue': '₹11,90,000', 'Target Achievement': '79.3%' },
    ],
  },
  EXECUTIVE_PERFORMANCE: {
    title: 'Executive Performance Report',
    columns: ['Executive Name', 'Manager', 'Leads Contacted', 'Field Visits', 'Won Deals', 'Revenue Output', 'Win Rate'],
    rows: [
      { 'Executive Name': 'Ananya Roy', Manager: 'Vikram Singh', 'Leads Contacted': '44', 'Field Visits': '28', 'Won Deals': '8', 'Revenue Output': '₹9,40,000', 'Win Rate': '88.9%' },
      { 'Executive Name': 'Karthik Raja', Manager: 'Suresh V', 'Leads Contacted': '36', 'Field Visits': '22', 'Won Deals': '6', 'Revenue Output': '₹7,10,000', 'Win Rate': '75.0%' },
      { 'Executive Name': 'Robert Smith', Manager: 'Vikram Singh', 'Leads Contacted': '38', 'Field Visits': '20', 'Won Deals': '6', 'Revenue Output': '₹7,10,000', 'Win Rate': '85.7%' },
      { 'Executive Name': 'Mary Jane', Manager: 'Suresh V', 'Leads Contacted': '24', 'Field Visits': '18', 'Won Deals': '4', 'Revenue Output': '₹4,80,000', 'Win Rate': '80.0%' },
    ],
  },
}

function Reports() {
  const { showToast } = useToast()
  const [selectedReportKey, setSelectedReportKey] = useState('SALES')
  const [dateFilter, setDateFilter] = useState('This Month')
  const [searchQuery, setSearchQuery] = useState('')

  const activeDataset = REPORT_DATASETS[selectedReportKey] || REPORT_DATASETS.SALES

  // Filter rows based on search
  const filteredRows = activeDataset.rows.filter((row) =>
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
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-[#004749]">
              <FileText className="size-4.5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive Business Reports & Analytics
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-3xl">
            Generate and export multi-dimensional reports across Sales, Revenue, Employee Performance, Customers, Conversion velocity, and Manager/Executive performance.
          </p>
        </div>

        {/* Multi-format Export Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl bg-[#004749] hover:bg-[#013b3f] text-white px-3.5 py-2 text-xs font-black transition shadow-xs"
          >
            <Download className="size-3.5" />
            Export PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-black transition shadow-xs"
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3.5 py-2 text-xs font-bold transition"
          >
            CSV
          </button>
        </div>
      </div>

      {/* 7 Required Report Module Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { key: 'SALES', label: 'Sales Reports', icon: TrendingUp },
          { key: 'REVENUE', label: 'Revenue Reports', icon: DollarSign },
          { key: 'EMPLOYEE_PERFORMANCE', label: 'Employee Performance', icon: Activity },
          { key: 'CUSTOMERS', label: 'Customer Reports', icon: Building2 },
          { key: 'LEAD_CONVERSION', label: 'Lead Conversion', icon: Layers },
          { key: 'MANAGER_PERFORMANCE', label: 'Manager Performance', icon: Award },
          { key: 'EXECUTIVE_PERFORMANCE', label: 'Executive Performance', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = selectedReportKey === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedReportKey(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-[#004749] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${activeDataset.title}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-[#004749]"
            />
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Period:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Quarter">This Quarter</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {activeDataset.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Showing {filteredRows.length} verified records for {dateFilter}
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-[#004749]">
            {filteredRows.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                {activeDataset.columns.map((col, idx) => (
                  <th key={idx} className="pb-3 px-2">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                  {activeDataset.columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3 px-2 text-slate-700 font-semibold">
                      {cIdx === 0 ? (
                        <span className="font-black text-slate-900">{row[col]}</span>
                      ) : col.includes('Value') || col.includes('Amount') || col.includes('Revenue') ? (
                        <span className="font-black text-[#004749]">{row[col]}</span>
                      ) : col === 'Stage' || col === 'Status' ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                            String(row[col]).includes('Won') || String(row[col]).includes('Active')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row[col]}
                        </span>
                      ) : (
                        row[col]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports
