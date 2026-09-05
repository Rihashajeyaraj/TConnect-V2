import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import ChangePassword from './common/ChangePassword.jsx'
import Signup from './common/Signup.jsx'
import ProtectedRoute from './common/ProtectedRoute.jsx'
import { ToastProvider } from './common/ToastContext.jsx'
import PwaInstallPrompt from './common/PwaInstallPrompt.jsx'

// ── Resilient Lazy Import Wrapper ──────────────────────────────────────
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenReloaded = sessionStorage.getItem('tc_chunk_reloaded')
    try {
      const component = await componentImport()
      sessionStorage.removeItem('tc_chunk_reloaded')
      return component
    } catch (error) {
      console.warn('Retrying dynamic module import after deployment update:', error)
      if (!pageHasAlreadyBeenReloaded) {
        sessionStorage.setItem('tc_chunk_reloaded', 'true')
        window.location.reload()
        return new Promise(() => {})
      }
      throw error
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
const ManagerSmartMap = lazyWithRetry(() => import('./roles/manager/ManagerSmartMap.jsx'))

// Team Lead Portal
const TeamLeadLayout = lazyWithRetry(() => import('./roles/teamlead/TeamLeadLayout.jsx'))
const TeamLeadDashboard = lazyWithRetry(() => import('./roles/teamlead/TeamLeadDashboard.jsx'))
const TeamLeadAttendance = lazyWithRetry(() => import('./roles/teamlead/TeamLeadAttendance.jsx'))
const TeamLeadLeads = lazyWithRetry(() => import('./roles/teamlead/TeamLeadLeads.jsx'))
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
    <ToastProvider>
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
                <Route path="company" element={<CompanyOverview />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="customers" element={<CeoCustomers />} />
                <Route path="roles" element={<RoleManagement />} />
                <Route path="hrms" element={<HRMS />} />
                <Route path="attendance" element={<Navigate to="/admin/hrms?tab=attendance" replace />} />
                <Route path="organization" element={<Navigate to="/admin/company" replace />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="audit" element={<Navigate to="/admin/reports?tab=security" replace />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>

            {/* ── Manager Portal ──────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['manager', 'Sales Manager', 'team lead', 'Team Lead', 'lead', 'tl', 'admin', 'Admin']} />}>
              <Route path="/manager" element={<ManagerLayout />}>
                <Route index element={<ManagerDashboard />} />
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="map" element={<ManagerSmartMap />} />
                <Route path="team" element={<ManagerTeam />} />
                <Route path="leads" element={<ManagerLeads />} />
                <Route path="customers" element={<ManagerCustomers />} />
                <Route path="visits" element={<ManagerVisits />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="followups" element={<ManagerFollowups />} />
                <Route path="opportunities" element={<ManagerOpportunities />} />
                <Route path="expenses" element={<ManagerExpenses />} />
                <Route path="reports" element={<ManagerReports />} />
                <Route path="notifications" element={<ManagerNotifications />} />
                <Route path="leaderboard" element={<ManagerLeaderboard />} />
                <Route path="calendar" element={<ManagerCalendar />} />
                <Route path="hrms" element={<ManagerHrms />} />
                <Route path="settings" element={<ManagerSettings />} />
              </Route>
            </Route>

            {/* ── Team Lead Portal (Clean Sales Manager UI Clone) ───────── */}
            <Route element={<ProtectedRoute allowedRoles={['team_lead', 'team lead', 'Team Lead', 'lead', 'tl', 'manager', 'admin', 'ceo']} />}>
              <Route path="/team-lead" element={<TeamLeadLayout />}>
                <Route index element={<TeamLeadDashboard />} />
                <Route path="dashboard" element={<TeamLeadDashboard />} />
                <Route path="map" element={<TeamLeadSmartMap />} />
                <Route path="attendance" element={<TeamLeadAttendance />} />
                <Route path="visits" element={<TeamLeadVisits />} />
                <Route path="leads" element={<TeamLeadLeads />} />
                <Route path="customers" element={<ManagerCustomers />} />
                <Route path="expenses" element={<TeamLeadExpenses />} />
                <Route path="team" element={<ManagerTeam />} />
                <Route path="reports" element={<ManagerReports />} />
                <Route path="hrms" element={<TeamLeadHrms />} />
                <Route path="notifications" element={<ManagerNotifications />} />
                <Route path="settings" element={<ManagerSettings />} />
              </Route>
            </Route>

            {/* ── Unified Sales Portal ───────── */}
            <Route element={<ProtectedRoute allowedRoles={SALES_ROLES} />}>
              <Route path="/sales" element={<SalesLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="map" element={<SmartClientMap />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="customers" element={<Customers />} />
                <Route path="client-log" element={<ClientLog />} />
                <Route path="visits" element={<ClientLog />} />
                <Route path="leads" element={<Leads />} />
                <Route path="followups" element={<ClientLog />} />
                <Route path="opportunities" element={<ClientLog />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="hrms" element={<HRMS />} />
                <Route path="todo" element={<Todo />} />

                {/* Team Management pages directly under /sales */}
                <Route path="team" element={<ManagerTeam />} />
                <Route path="team-map" element={<ManagerSmartMap />} />
                <Route path="team-attendance" element={<ManagerAttendance />} />
                <Route path="team-visits" element={<ManagerVisits />} />
                <Route path="team-expenses" element={<ManagerExpenses />} />
                <Route path="team-reports" element={<ManagerReports />} />
              </Route>
            </Route>

            {/* ── Catch-All Fallback Route (Prevents Blank White Page on Unmatched URLs) ── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Suspense>
        <PwaInstallPrompt />
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
