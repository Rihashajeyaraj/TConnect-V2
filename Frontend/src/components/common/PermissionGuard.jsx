import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react'
import { usePermissions } from '../../context/PermissionContext.jsx'

export default function PermissionGuard({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  children
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center bg-slate-900/50 rounded-3xl p-8 text-center animate-pulse">
        <div className="space-y-3">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400">Verifying authorization permissions...</p>
        </div>
      </div>
    )
  }

  let isAuthorized = true

  if (permission) {
    isAuthorized = hasPermission(permission)
  } else if (permissions.length > 0) {
    isAuthorized = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  if (!isAuthorized) {
    if (fallback) {
      return fallback
    }

    const targetKey = permission || (permissions.length > 0 ? permissions.join(', ') : 'general')

    return (
      <div className="min-h-[70vh] w-full flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <Lock size={18} className="text-rose-500" /> Access Denied
            </h2>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-sm mx-auto">
              You do not have the required permission capability (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-mono text-[11px] font-bold">{targetKey}</code>) to access this page or functionality.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-[11px] text-slate-500 font-medium">
            Contact your System Administrator or HR Manager to update your employee permissions map.
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={14} /> Return to Previous Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}
