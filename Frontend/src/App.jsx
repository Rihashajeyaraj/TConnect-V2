import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import ChangePassword from './common/ChangePassword.jsx'
import Signup from './common/Signup.jsx'
import ProtectedRoute from './common/ProtectedRoute.jsx'
import { ToastProvider } from './common/ToastContext.jsx'
import { PermissionProvider } from './context/PermissionContext.jsx'
import PwaInstallPrompt from './common/PwaInstallPrompt.jsx'

// ── Global Error Boundary Component (Prevents Blank White Loading Screens) ──
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI rendering error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white font-sans p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-black text-white">Something went wrong</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              An unexpected UI error occurred while rendering this page. Click below to refresh or return to Dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
              >
                🔄 Reload Page
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/sales/dashboard";
                }}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
              >
                🏠 Sales Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Resilient Lazy Import Wrapper ──────────────────────────────────────
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenReloaded = sessionStorage.getItem('tc_chunk_reloaded')
    try {
      const component = await componentImport()
      sessionStorage.removeItem('tc_chunk_reloaded')
      return component
    } catch (error) {
      console.warn('Retrying dynamic module import after update:', error)
      if (!pageHasAlreadyBeenReloaded) {
        sessionStorage.setItem('tc_chunk_reloaded', 'true')
        window.location.reload()
      }
      try {
        const component = await componentImport()
        sessionStorage.removeItem('tc_chunk_reloaded')
        return component
      } catch (retryErr) {
        console.error('Dynamic module import failed after retry:', retryErr)
        throw retryErr
      }
    }
  })

// ── Lazy-loaded Route Components ─────────────────────────────────────
// CEO Portal
const CeoLayout = lazyWithRetry(() => import('./roles/ceo/CeoLayout.jsx'))
const CeoDashboard = lazyWithRetry(() => import('./roles/ceo/Dashboard.jsx'))
const CeoSalesRevenue = lazyWithRetry(() => import('./roles/ceo/SalesOverview.jsx'))
const CeoCustomers = lazyWithRetry(() => import('./roles/ceo/Customers.jsx'))
const CeoTeamManagement = lazyWithRetry(() => import('./roles/ceo/TeamManagement.jsx'))
const CeoHrms = lazyWithRetry(() => import('./roles/ceo/Hrms.jsx'))
const CeoReports = lazyWithRetry(() => import('./roles/ceo/Reports.jsx'))
const CeoNotifications = lazyWithRetry(() => import('./roles/ceo/Notifications.jsx'))
const CeoSettings = lazyWithRetry(() => import('./roles/ceo/Settings.jsx'))
const CeoExpenses = lazyWithRetry(() => import('./roles/ceo/Expenses.jsx'))

// Admin Portal
const AdminLayout = lazyWithRetry(() => import('./roles/admin/AdminLayout.jsx'))
const AdminDashboard = lazyWithRetry(() => import('./roles/admin/AdminDashboard.jsx'))
const CompanyOverview = lazyWithRetry(() => import('./roles/admin/CompanyOverview.jsx'))
const UserManagement = lazyWithRetry(() => import('./roles/admin/UserManagement.jsx'))
const RoleManagement = lazyWithRetry(() => import('./roles/admin/RoleManagement.jsx'))
const AdminReports = lazyWithRetry(() => import('./roles/admin/AdminReports.jsx'))
const AdminSettings = lazyWithRetry(() => import('./roles/admin/AdminSettings.jsx'))

// Manager Portal
const ManagerLayout = lazyWithRetry(() => import('./roles/manager/ManagerLayout.jsx'))
const ManagerDashboard = lazyWithRetry(() => import('./roles/manager/ManagerDashboard.jsx'))
const ManagerTeam = lazyWithRetry(() => import('./roles/manager/ManagerTeam.jsx'))
const ManagerLeads = lazyWithRetry(() => import('./roles/manager/Leads.jsx'))
const ManagerCustomers = lazyWithRetry(() => import('./roles/manager/ManagerCustomers.jsx'))
const ManagerVisits = lazyWithRetry(() => import('./roles/manager/ManagerVisits.jsx'))
const ManagerAttendance = lazyWithRetry(() => import('./roles/manager/ManagerAttendance.jsx'))
const ManagerFollowups = lazyWithRetry(() => import('./roles/manager/ManagerFollowups.jsx'))
const ManagerOpportunities = lazyWithRetry(() => import('./roles/manager/ManagerOpportunities.jsx'))
const ManagerExpenses = lazyWithRetry(() => import('./roles/manager/ManagerExpenses.jsx'))
const ManagerReports = lazyWithRetry(() => import('./roles/manager/ManagerReports.jsx'))
const ManagerNotifications = lazyWithRetry(() => import('./roles/manager/ManagerNotifications.jsx'))
const ManagerLeaderboard = lazyWithRetry(() => import('./roles/manager/ManagerLeaderboard.jsx'))
const ManagerCalendar = lazyWithRetry(() => import('./roles/manager/ManagerCalendar.jsx'))
const ManagerHrms = lazyWithRetry(() => import('./roles/manager/ManagerHrms.jsx'))
const ManagerSettings = lazyWithRetry(() => import('./roles/manager/ManagerSettings.jsx'))
const ManagerSmartMap = lazyWithRetry(() => import('./roles/manager/ManagerSmartMapWrapper.jsx'))

// Team Lead Portal
const TeamLeadLayout = lazyWithRetry(() => import('./roles/teamlead/TeamLeadLayout.jsx'))
const TeamLeadDashboard = lazyWithRetry(() => import('./roles/teamlead/TeamLeadDashboard.jsx'))
const TeamLeadAttendance = lazyWithRetry(() => import('./roles/teamlead/TeamLeadAttendance.jsx'))
const TeamLeadLeads = lazyWithRetry(() => import('./roles/teamlead/TeamLeadLeads.jsx'))
const TeamLeadCustomers = lazyWithRetry(() => import('./roles/teamlead/TeamLeadCustomers.jsx'))
const TeamLeadVisits = lazyWithRetry(() => import('./roles/teamlead/TeamLeadVisits.jsx'))
const TeamLeadExpenses = lazyWithRetry(() => import('./roles/teamlead/TeamLeadExpenses.jsx'))
const TeamLeadSmartMap = lazyWithRetry(() => import('./roles/teamlead/TeamLeadSmartMap.jsx'))
const TeamLeadHrms = lazyWithRetry(() => import('./roles/teamlead/TeamLeadHrms.jsx'))

// Sales Executive Portal
const SalesLayout = lazyWithRetry(() => import('./roles/sales/SalesLayout.jsx'))
const Dashboard = lazyWithRetry(() => import('./roles/sales/Dashboard.jsx'))
const Attendance = lazyWithRetry(() => import('./roles/sales/Attendance.jsx'))
const Customers = lazyWithRetry(() => import('./roles/sales/Customers.jsx'))
const Expenses = lazyWithRetry(() => import('./roles/sales/Expenses.jsx'))
const HRMS = lazyWithRetry(() => import('./roles/sales/HRMS.jsx'))
const ClientLog = lazyWithRetry(() => import('./roles/sales/ClientLog.jsx'))
const Leads = lazyWithRetry(() => import('./roles/sales/Leads.jsx'))
const Notifications = lazyWithRetry(() => import('./roles/sales/Notifications.jsx'))
const Todo = lazyWithRetry(() => import('./roles/sales/Todo.jsx'))
const SmartClientMap = lazyWithRetry(() => import('./roles/sales/SmartClientMap.jsx'))

const SALES_ROLES = [
  'sales', 'executive', 'Sales Executive',
  'team lead', 'Team Lead', 'lead', 'tl',
  'manager', 'Sales Manager',
  'admin', 'Admin', 'ceo',
]

import PermissionGuard from './components/common/PermissionGuard.jsx'

// Sleek fallback loading screen
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white font-sans">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Loading TwiteConnect...</span>
    </div>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <PermissionProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>

              {/* ── Public Auth Routes ─────────────────────────── */}
              <Route path="/" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/signup" element={<Signup />} />

              {/* ── CEO Portal ─────────────────────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={['ceo', 'admin', 'Admin']} />}>
                <Route path="/ceo" element={<CeoLayout />}>
                  <Route index element={<CeoDashboard />} />
                  <Route path="dashboard" element={<CeoDashboard />} />
                  <Route path="customers" element={<CeoCustomers />} />
                  <Route path="team-management" element={<CeoTeamManagement />} />
                  <Route path="hrms" element={<CeoHrms />} />
                  <Route path="sales-revenue" element={<CeoSalesRevenue />} />
                  <Route path="reports" element={<CeoReports />} />
                  <Route path="notifications" element={<CeoNotifications />} />
                  <Route path="settings" element={<CeoSettings />} />
                  <Route path="expenses" element={<CeoExpenses />} />
                  <Route path="smart-map" element={<ManagerSmartMap />} />
                  <Route path="radar" element={<ManagerSmartMap />} />

                  {/* Backward compatibility aliases */}
                  <Route path="sales-overview" element={<Navigate to="/ceo/sales-revenue" replace />} />
                  <Route path="revenue-finance" element={<Navigate to="/ceo/sales-revenue" replace />} />
                  <Route path="users" element={<CeoTeamManagement />} />
                  <Route path="client-log" element={<CeoSalesRevenue />} />
                  <Route path="leads" element={<CeoSalesRevenue initialSection="leads" />} />
                  <Route path="customer" element={<CeoCustomers />} />
                  <Route path="visits" element={<CeoSalesRevenue initialSection="visits" />} />
                  <Route path="followups" element={<CeoSalesRevenue initialSection="followups" />} />
                  <Route path="opportunities" element={<CeoSalesRevenue initialSection="opportunities" />} />
                  <Route path="employee" element={<CeoTeamManagement />} />
                  <Route path="attendance" element={<CeoHrms initialTab="attendance" />} />
                  <Route path="leaves" element={<CeoHrms initialTab="leaves" />} />
                </Route>
              </Route>

              {/* ── Admin Portal ────────────────────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'Admin']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="company" element={<PermissionGuard permission="system.settings.view"><CompanyOverview /></PermissionGuard>} />
                  <Route path="users" element={<PermissionGuard permission="admin.users.view"><UserManagement /></PermissionGuard>} />
                  <Route path="customers" element={<PermissionGuard permission="crm.customers.view"><CeoCustomers /></PermissionGuard>} />
                  <Route path="roles" element={<PermissionGuard permission="admin.permissions.manage"><RoleManagement /></PermissionGuard>} />
                  <Route path="hrms" element={<PermissionGuard permission="hrms.employees.view"><HRMS /></PermissionGuard>} />
                  <Route path="attendance" element={<Navigate to="/admin/hrms?tab=attendance" replace />} />
                  <Route path="organization" element={<Navigate to="/admin/company" replace />} />
                  <Route path="reports" element={<PermissionGuard permission="reports.view"><AdminReports /></PermissionGuard>} />
                  <Route path="audit" element={<PermissionGuard permission="system.audit.view"><Navigate to="/admin/reports?tab=security" replace /></PermissionGuard>} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<PermissionGuard permission="system.settings.view"><AdminSettings /></PermissionGuard>} />
                </Route>
              </Route>

              {/* ── Manager Portal ──────────────────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={['manager', 'Sales Manager', 'team lead', 'Team Lead', 'lead', 'tl', 'admin', 'Admin']} />}>
                <Route path="/manager" element={<ManagerLayout />}>
                  <Route index element={<ManagerDashboard />} />
                  <Route path="dashboard" element={<ManagerDashboard />} />
                  <Route path="map" element={<PermissionGuard permissions={['spatial.map.view_team', 'spatial.map.view_all', 'spatial.map.view']}><ManagerSmartMap /></PermissionGuard>} />
                  <Route path="team" element={<ManagerTeam />} />
                  <Route path="leads" element={<PermissionGuard permission="crm.leads.view"><ManagerLeads /></PermissionGuard>} />
                  <Route path="customers" element={<PermissionGuard permission="crm.customers.view"><ManagerCustomers /></PermissionGuard>} />
                  <Route path="visits" element={<PermissionGuard permission="visit.visits.view"><ManagerVisits /></PermissionGuard>} />
                  <Route path="attendance" element={<PermissionGuard permissions={['hrms.attendance.view_team', 'hrms.attendance.view_all', 'hrms.attendance.view_own']}><Attendance /></PermissionGuard>} />
                  <Route path="followups" element={<PermissionGuard permission="crm.leads.view"><ManagerFollowups /></PermissionGuard>} />
                  <Route path="opportunities" element={<PermissionGuard permission="crm.leads.view"><ManagerOpportunities /></PermissionGuard>} />
                  <Route path="expenses" element={<PermissionGuard permission="expenses.view"><ManagerExpenses /></PermissionGuard>} />
                  <Route path="reports" element={<PermissionGuard permission="reports.view"><ManagerReports /></PermissionGuard>} />
                  <Route path="notifications" element={<ManagerNotifications />} />
                  <Route path="leaderboard" element={<ManagerLeaderboard />} />
                  <Route path="calendar" element={<ManagerCalendar />} />
                  <Route path="hrms" element={<PermissionGuard permission="hrms.employees.view"><ManagerHrms /></PermissionGuard>} />
                  <Route path="settings" element={<PermissionGuard permission="system.settings.view"><ManagerSettings /></PermissionGuard>} />
                </Route>
              </Route>

              {/* ── Team Lead Portal (Clean Sales Manager UI Clone) ───────── */}
              <Route element={<ProtectedRoute allowedRoles={['team_lead', 'team lead', 'Team Lead', 'lead', 'tl', 'manager', 'admin', 'ceo']} />}>
                <Route path="/teamlead" element={<Navigate to="/team-lead/dashboard" replace />} />
                <Route path="/teamlead/*" element={<Navigate to="/team-lead/dashboard" replace />} />
                <Route path="/team-lead" element={<TeamLeadLayout />}>
                  <Route index element={<TeamLeadDashboard />} />
                  <Route path="dashboard" element={<TeamLeadDashboard />} />
                  <Route path="map" element={<PermissionGuard permissions={['spatial.map.view_team', 'spatial.map.view_all', 'spatial.map.view']}><TeamLeadSmartMap /></PermissionGuard>} />
                  <Route path="attendance" element={<PermissionGuard permissions={['hrms.attendance.view_team', 'hrms.attendance.view_own']}><TeamLeadAttendance /></PermissionGuard>} />
                  <Route path="visits" element={<PermissionGuard permission="visit.visits.view"><TeamLeadVisits /></PermissionGuard>} />
                  <Route path="leads" element={<PermissionGuard permission="crm.leads.view"><TeamLeadLeads /></PermissionGuard>} />
                  <Route path="customers" element={<PermissionGuard permission="crm.customers.view"><TeamLeadCustomers /></PermissionGuard>} />
                  <Route path="expenses" element={<PermissionGuard permission="expenses.view"><TeamLeadExpenses /></PermissionGuard>} />
                  <Route path="team" element={<ManagerTeam />} />
                  <Route path="reports" element={<PermissionGuard permission="reports.view"><ManagerReports /></PermissionGuard>} />
                  <Route path="hrms" element={<PermissionGuard permission="hrms.employees.view"><TeamLeadHrms /></PermissionGuard>} />
                  <Route path="notifications" element={<ManagerNotifications />} />
                  <Route path="settings" element={<PermissionGuard permission="system.settings.view"><ManagerSettings /></PermissionGuard>} />
                </Route>
              </Route>

              {/* ── Unified Sales Portal ───────── */}
              <Route element={<ProtectedRoute allowedRoles={SALES_ROLES} />}>
                <Route path="/sales" element={<SalesLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="map" element={<PermissionGuard permission="spatial.map.view"><SmartClientMap /></PermissionGuard>} />
                  <Route path="attendance" element={<PermissionGuard permissions={['hrms.attendance.view_own', 'hrms.attendance.view_team']}><Attendance /></PermissionGuard>} />
                  <Route path="customers" element={<PermissionGuard permission="crm.customers.view"><Customers /></PermissionGuard>} />
                  <Route path="client-log" element={<PermissionGuard permission="visit.visits.view"><ClientLog /></PermissionGuard>} />
                  <Route path="visits" element={<PermissionGuard permission="visit.visits.view"><ClientLog /></PermissionGuard>} />
                  <Route path="leads" element={<PermissionGuard permission="crm.leads.view"><Leads /></PermissionGuard>} />
                  <Route path="followups" element={<PermissionGuard permission="crm.leads.view"><ClientLog /></PermissionGuard>} />
                  <Route path="opportunities" element={<PermissionGuard permission="crm.leads.view"><ClientLog /></PermissionGuard>} />
                  <Route path="expenses" element={<PermissionGuard permission="expenses.view"><Expenses /></PermissionGuard>} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="hrms" element={<PermissionGuard permission="hrms.employees.view"><HRMS /></PermissionGuard>} />
                  <Route path="todo" element={<Todo />} />

                  {/* Team Management pages directly under /sales */}
                  <Route path="team" element={<ManagerTeam />} />
                  <Route path="team-map" element={<PermissionGuard permissions={['spatial.map.view_team', 'spatial.map.view_all']}><ManagerSmartMap /></PermissionGuard>} />
                  <Route path="team-attendance" element={<PermissionGuard permissions={['hrms.attendance.view_team', 'hrms.attendance.view_all']}><ManagerAttendance /></PermissionGuard>} />
                  <Route path="team-visits" element={<PermissionGuard permission="visit.visits.view"><ManagerVisits /></PermissionGuard>} />
                  <Route path="team-expenses" element={<PermissionGuard permission="expenses.view"><ManagerExpenses /></PermissionGuard>} />
                  <Route path="team-reports" element={<PermissionGuard permission="reports.view"><ManagerReports /></PermissionGuard>} />
                </Route>
              </Route>

              {/* ── Catch-All Fallback Route (Prevents Blank White Page on Unmatched URLs) ── */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </Suspense>
          <PwaInstallPrompt />
        </BrowserRouter>
      </PermissionProvider>
    </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
