import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'
import authSession from '../utils/authSession.js'

function ProtectedRoute({ allowedRoles }) {
  const { showToast } = useToast()
  
  // Restore session synchronously on mount / render
  const session = authSession.restoreSession()
  const token = session?.token || null
  const user = session?.user || null

  const isAuthenticated = Boolean(token && user && typeof user === 'object')
  const userNormalizedRole = authSession.normalizeRole(user)
  const rawRoleStr = String(user?.role || user?.designation || '').toLowerCase()

  const isAllowed = isAuthenticated && (!allowedRoles || allowedRoles.length === 0 || allowedRoles.some((r) => {
    const roleLower = String(r).toLowerCase()
    if (roleLower === 'ceo' && (userNormalizedRole === 'ceo' || rawRoleStr.includes('ceo'))) return true
    if (roleLower === 'admin' && (userNormalizedRole === 'admin' || rawRoleStr.includes('admin'))) return true
    if ((roleLower === 'team_lead' || roleLower === 'team lead' || roleLower === 'lead' || roleLower === 'tl') && (userNormalizedRole === 'team_lead' || userNormalizedRole === 'manager' || rawRoleStr.includes('lead') || rawRoleStr.includes('tl'))) return true
    if ((roleLower === 'manager' || roleLower.includes('lead') || roleLower === 'tl') && (userNormalizedRole === 'manager' || userNormalizedRole === 'team_lead' || rawRoleStr.includes('manager') || rawRoleStr.includes('lead') || rawRoleStr.includes('tl'))) return true
    if ((roleLower === 'sales' || roleLower.includes('executive')) && (userNormalizedRole === 'sales' || userNormalizedRole === 'manager' || userNormalizedRole === 'team_lead' || rawRoleStr.includes('sales') || rawRoleStr.includes('executive') || rawRoleStr.includes('lead') || rawRoleStr.includes('tl'))) return true
    return rawRoleStr.includes(roleLower) || roleLower.includes(rawRoleStr) || userNormalizedRole === roleLower
  }))

  // ALL HOOKS MUST BE AT THE TOP OF THE COMPONENT (Before any early returns)
  useEffect(() => {
    if (isAuthenticated && !isAllowed) {
      showToast(`Access Denied: Your account role does not have authorization for this portal.`, 'error')
    }
  }, [isAuthenticated, isAllowed, showToast])

  // Early Returns AFTER all hooks
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (!isAllowed) {
    const fallbackRoute = authSession.getDashboardForUser(user)
    return <Navigate to={fallbackRoute} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
