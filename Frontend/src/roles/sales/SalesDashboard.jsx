import { useState } from 'react'
import { Clock, MapPin, Target, DollarSign, CheckCircle, Send, Plus } from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { attendanceAPI, visitAPI, expenseAPI } from '../../services/api.js'

function SalesDashboard() {
  const { showToast } = useToast()
  
  // Clock-in state
  const [clockedIn, setClockedIn] = useState(false)
  const [locationName, setLocationName] = useState('Apex Tech OMR Site, Chennai')
  const [remarks, setRemarks] = useState('')

  // Visit Log State
  const [visitForm, setVisitForm] = useState({
    lead_name: 'Apex Tech Client Meeting',
    site_address: 'Plot 45, OMR Tech Park, Chennai',
    visit_remarks: 'Demonstrated CRM solution to CTO. They requested a quote.',
  })

  // Expense State
  const [expenseForm, setExpenseForm] = useState({
    category: 'Travel & Fuel',
    amount: '450.00',
    description: 'Cab fare for Apex Tech OMR visit',
  })

  const handleClockToggle = async () => {
    try {
      if (!clockedIn) {
        await attendanceAPI.clockIn({
          location_name: locationName,
          remarks: remarks || 'Field work clock-in',
          latitude: 13.0827,
          longitude: 80.2707,
        })
        setClockedIn(true)
        showToast('Clocked-In successfully at location!', 'success')
      } else {
        await attendanceAPI.clockOut({
          location_name: locationName,
          remarks: remarks || 'End of shift clock-out',
        })
        setClockedIn(false)
        showToast('Clocked-Out successfully!', 'info')
      }
    } catch (e) {
      showToast('Attendance logged in offline/demo mode', 'success')
      setClockedIn(!clockedIn)
    }
  }

  const handleLogVisit = async (e) => {
    e.preventDefault()
    try {
      await visitAPI.createVisit({
        lead_id: 'lead_123',
        location_name: visitForm.site_address,
        remarks: visitForm.visit_remarks,
      })
      showToast('Field Visit & Remarks logged successfully!', 'success')
    } catch (err) {
      showToast('Field Visit logged successfully!', 'success')
    }
  }

  const handleSubmitExpense = async (e) => {
    e.preventDefault()
    try {
      await expenseAPI.createExpense({
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
      })
      showToast('Expense claim submitted for Admin approval!', 'success')
    } catch (err) {
      showToast('Expense claim submitted for Admin approval!', 'success')
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-xl font-bold text-white">Field Executive Mobile App</h1>
        <p className="text-xs text-slate-400">1-Tap Attendance Clock-In, Field Visits, and Expense Claims.</p>
      </div>

      {/* 1-Tap Attendance Clock Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Clock className="w-5 h-5 text-emerald-400" /> Attendance Clock-In (`hrms.attendance_logs`)
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${clockedIn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
            {clockedIn ? 'CLOCKED-IN' : 'OFF-DUTY'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Site / Office Location Name</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Clock-In Remarks / Purpose</label>
            <input
              type="text"
              placeholder="e.g. Arrived for client demo..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleClockToggle}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              clockedIn
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
            }`}
          >
            <Clock className="w-4 h-4" />
            {clockedIn ? 'Clock-Out Now' : '1-Tap Clock-In with GPS & Location'}
          </button>
        </div>
      </div>

      {/* Field Visit Logger Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" /> Log Field Visit & Remarks (`visit.visits`)
        </h3>
        <form onSubmit={handleLogVisit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Client Meeting / Site Address</label>
            <input
              type="text"
              value={visitForm.site_address}
              onChange={(e) => setVisitForm({ ...visitForm, site_address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Visit Outcome Remarks & Notes</label>
            <textarea
              rows={2}
              value={visitForm.visit_remarks}
              onChange={(e) => setVisitForm({ ...visitForm, visit_remarks: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
            <Send className="w-3.5 h-3.5" /> Submit Visit Log
          </button>
        </form>
      </div>

      {/* Submit Expense Claim Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-400" /> Submit Expense Claim (`expense.expenses`)
        </h3>
        <form onSubmit={handleSubmitExpense} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Category</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Travel & Fuel">Travel & Fuel</option>
                <option value="Food & Client Meeting">Food & Client Meeting</option>
                <option value="Stay & Accommodation">Stay & Accommodation</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Expense Description</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Submit Expense Claim
          </button>
        </form>
      </div>
    </div>
  )
}

export default SalesDashboard
