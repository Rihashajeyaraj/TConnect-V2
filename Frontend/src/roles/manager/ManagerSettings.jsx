import React, { useState } from 'react'
import { Settings, Lock, Bell, Globe, LogOut, ShieldCheck, User } from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { useNavigate } from 'react-router-dom'
import useCurrentUser from '../../hooks/useCurrentUser.js'

export default function ManagerSettings() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handlePasswordChange = (e) => {
    e.preventDefault()
    if (!oldPassword || !newPassword) {
      showToast('Please fill in current and new password fields!', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match!', 'error')
      return
    }
    showToast('Password updated successfully!', 'success')
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    localStorage.removeItem('user_role')
    sessionStorage.clear()
    showToast('Logged out successfully', 'info')
    window.location.href = '/'
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 max-w-3xl">
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-600" /> Sales Manager Account & Security Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage your manager portal password, email notifications, language preferences, and security parameters.
          </p>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Lock size={16} className="text-teal-600" /> Security & Password Update
        </h3>

        <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Current Access Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-teal-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-9 bg-slate-50 border-slate-200 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Logout Action Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Sign Out of Sales Manager Portal</h3>
          <p className="text-xs text-slate-500 font-medium">Terminate current manager session and return to login screen.</p>
        </div>

        <button
          onClick={handleLogout}
          className="mgr-card px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
        >
          <LogOut size={15} /> Log Out
        </button>
      </div>
    </div>
  )
}
