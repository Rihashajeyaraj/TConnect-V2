import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import Signup from './common/Signup.jsx'
import ProtectedRoute from './common/ProtectedRoute.jsx'
import { ToastProvider } from './common/ToastContext.jsx'

// ── Lazy-loaded Route Components ─────────────────────────────────────
// CEO Portal
const CeoLayout = lazy(() => import('./roles/ceo/CeoLayout.jsx'))
const CeoDashboard = lazy(() => import('./roles/ceo/Dashboard.jsx'))
const CeoSalesRevenue = lazy(() => import('./roles/ceo/SalesOverview.jsx'))
const CeoCustomers = lazy(() => import('./roles/ceo/Customers.jsx'))
const CeoTeamManagement = lazy(() => import('./roles/ceo/TeamManagement.jsx'))
const CeoHrms = lazy(() => import('./roles/ceo/Hrms.jsx'))
const CeoReports = lazy(() => import('./roles/ceo/Reports.jsx'))
const CeoNotifications = lazy(() => import('./roles/ceo/Notifications.jsx'))
const CeoSettings = lazy(() => import('./roles/ceo/Settings.jsx'))
const CeoExpenses = lazy(() => import('./roles/ceo/Expenses.jsx'))

// Admin Portal
const AdminLayout = lazy(() => import('./roles/admin/AdminLayout.jsx'))
const AdminDashboard = lazy(() => import('./roles/admin/AdminDashboard.jsx'))
const CompanyOverview = lazy(() => import('./roles/admin/CompanyOverview.jsx'))
const UserManagement = lazy(() => import('./roles/admin/UserManagement.jsx'))
const RoleManagement = lazy(() => import('./roles/admin/RoleManagement.jsx'))
const AdminReports = lazy(() => import('./roles/admin/AdminReports.jsx'))
const AdminSettings = lazy(() => import('./roles/admin/AdminSettings.jsx'))

// Manager Portal
const ManagerLayout = lazy(() => import('./roles/manager/ManagerLayout.jsx'))
const ManagerDashboard = lazy(() => import('./roles/manager/ManagerDashboard.jsx'))
const ManagerTeam = lazy(() => import('./roles/manager/ManagerTeam.jsx'))
const ManagerLeads = lazy(() => import('./roles/manager/Leads.jsx'))
const ManagerCustomers = lazy(() => import('./roles/manager/ManagerCustomers.jsx'))
const ManagerVisits = lazy(() => import('./roles/manager/ManagerVisits.jsx'))
const ManagerAttendance = lazy(() => import('./roles/manager/ManagerAttendance.jsx'))
const ManagerFollowups = lazy(() => import('./roles/manager/ManagerFollowups.jsx'))
const ManagerOpportunities = lazy(() => import('./roles/manager/ManagerOpportunities.jsx'))
const ManagerExpenses = lazy(() => import('./roles/manager/ManagerExpenses.jsx'))
const ManagerReports = lazy(() => import('./roles/manager/ManagerReports.jsx'))
const ManagerNotifications = lazy(() => import('./roles/manager/ManagerNotifications.jsx'))
const ManagerLeaderboard = lazy(() => import('./roles/manager/ManagerLeaderboard.jsx'))
const ManagerCalendar = lazy(() => import('./roles/manager/ManagerCalendar.jsx'))
const ManagerHrms = lazy(() => import('./roles/manager/ManagerHrms.jsx'))
const ManagerSettings = lazy(() => import('./roles/manager/ManagerSettings.jsx'))
const ManagerSmartMap = lazy(() => import('./roles/manager/ManagerSmartMap.jsx'))

// Sales Executive Portal
const SalesLayout = lazy(() => import('./roles/sales/SalesLayout.jsx'))
const Dashboard = lazy(() => import('./roles/sales/Dashboard.jsx'))
const Attendance = lazy(() => import('./roles/sales/Attendance.jsx'))
const Customers = lazy(() => import('./roles/sales/Customers.jsx'))
const Expenses = lazy(() => import('./roles/sales/Expenses.jsx'))
const HRMS = lazy(() => import('./roles/sales/HRMS.jsx'))
const ClientLog = lazy(() => import('./roles/sales/ClientLog.jsx'))
const Leads = lazy(() => import('./roles/sales/Leads.jsx'))
const Notifications = lazy(() => import('./roles/sales/Notifications.jsx'))
const Todo = lazy(() => import('./roles/sales/Todo.jsx'))
const SmartClientMap = lazy(() => import('./roles/sales/SmartClientMap.jsx'))

const SALES_ROLES = [
  'sales', 'executive', 'Sales Executive',
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
            <Route element={<ProtectedRoute allowedRoles={['manager', 'Sales Manager', 'admin', 'Admin']} />}>
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

            {/* ── Sales Executive Portal ──────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={SALES_ROLES} />}>
              <Route path="/sales" element={<SalesLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="map" element={<SmartClientMap />} />
                <Route path="attendance" element={<Navigate to="/sales/hrms?tab=attendance" replace />} />
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
              </Route>
            </Route>

            {/* ── Catch-All Fallback Route (Prevents Blank White Page on Unmatched URLs) ── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
