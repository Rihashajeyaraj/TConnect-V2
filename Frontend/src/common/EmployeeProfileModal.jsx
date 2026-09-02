import React, { useState } from 'react'
import { X, Mail, Phone, MapPin, Building, Shield, Calendar, UserCheck, Briefcase, ZoomIn } from 'lucide-react'
import { formatDate } from '../utils/dateUtils.js'
import PhotoLightboxModal from './PhotoLightboxModal.jsx'

import { hrmsAPI } from '../services/api.js'

export default function EmployeeProfileModal({ employee, onClose }) {
  const [showExpandedPhoto, setShowExpandedPhoto] = useState(false)
  const [fullProfile, setFullProfile] = useState(employee || {})

  React.useEffect(() => {
    let isMounted = true
    const empId = employee?.employee_id || employee?.id || employee?.auth_user_id
    if (empId) {
      hrmsAPI.getEmployee(empId)
        .then(res => {
          if (isMounted && res && res.data) {
            setFullProfile(prev => ({ ...prev, ...res.data }))
          }
        })
        .catch(() => {})
    }
    return () => { isMounted = false }
  }, [employee])

  if (!employee) return null
  const empData = fullProfile || employee

  const name = empData.name || `${empData.first_name || ''} ${empData.last_name || ''}`.trim() || empData.full_name || 'Employee'
  const code = empData.employee_code || empData.employee_id || empData.id || 'N/A'
  const role = empData.role || empData.designation || 'Sales Executive'
  const dept = empData.department || empData.dept || 'Sales & Business Development'
  const email = empData.email || '—'
  const phone = empData.phone || empData.mobile || '—'
  const photo = empData.profile_photo || null
  const mgr = empData.reporting_manager_name || empData.reporting_manager_email || 'Not Assigned'
  const status = empData.status || empData.employment_status || 'Active'

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'EM'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Employee Card</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Banner & Avatar */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative group">
            <div
              onClick={() => photo && setShowExpandedPhoto(true)}
              className={`w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-blue-500/20 ${photo ? 'cursor-pointer hover:ring-blue-500/50 transition' : ''}`}
              title={photo ? 'Click to view full photo' : ''}
            >
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition" />
              ) : (
                initials
              )}
            </div>
            {photo && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none text-white">
                <ZoomIn size={20} />
              </div>
            )}
            <span className={`absolute bottom-0 right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${status.toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">{name}</h2>
            <p className="text-xs font-extrabold text-blue-600 font-mono mt-0.5">{code}</p>
            <p className="text-xs font-bold text-slate-500 mt-0.5">{role} • {dept}</p>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            {status} Member
          </span>
        </div>

        {/* Info Grid */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 text-xs font-semibold">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Mail size={13} className="text-blue-600" /> Official Email
            </span>
            <span className="font-bold text-slate-900 text-right">{email}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Phone size={13} className="text-blue-600" /> Phone Number
            </span>
            <span className="font-bold text-slate-900 text-right">{phone}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <UserCheck size={13} className="text-blue-600" /> Reporting Manager
            </span>
            <span className="font-bold text-slate-900 text-right">{mgr}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-600" /> Joining Date
            </span>
            <span className="font-bold text-slate-900 text-right">
              {employee.joining_date ? formatDate(employee.joining_date) : '01/08/2026'}
            </span>
          </div>
        </div>

        {/* Footer Close */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs transition cursor-pointer shadow-md"
        >
          Close Profile
        </button>

      </div>

      {/* Full-Screen Photo Lightbox */}
      {showExpandedPhoto && (
        <PhotoLightboxModal
          photoUrl={photo}
          name={name}
          role={role}
          onClose={() => setShowExpandedPhoto(false)}
        />
      )}
    </div>
  )
}
