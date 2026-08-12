import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import Signup from './common/Signup.jsx'
import ProtectedRoute from './common/ProtectedRoute.jsx'
import { ToastProvider } from './common/ToastContext.jsx'

// ── CEO ─────────────────────────────────────────────────────────────
import CeoLayout from './roles/ceo/CeoLayout.jsx'
import CeoDashboard from './roles/ceo/Dashboard.jsx'
import CeoSalesRevenue from './roles/ceo/SalesOverview.jsx'
import CeoCustomers from './roles/ceo/Customers.jsx'
import CeoTeamManagement from './roles/ceo/TeamManagement.jsx'
import CeoHrms from './roles/ceo/Hrms.jsx'
import CeoReports from './roles/ceo/Reports.jsx'
import CeoNotifications from './roles/ceo/Notifications.jsx'
import CeoSettings from './roles/ceo/Settings.jsx'

// ── Admin ────────────────────────────────────────────────────────────
import AdminLayout from './roles/admin/AdminLayout.jsx'
import AdminDashboard from './roles/admin/AdminDashboard.jsx'
import CompanyOverview from './roles/admin/CompanyOverview.jsx'
import UserManagement from './roles/admin/UserManagement.jsx'
import RoleManagement from './roles/admin/RoleManagement.jsx'
import AuditLogs from './roles/admin/AuditLogs.jsx'

// ── Manager ──────────────────────────────────────────────────────────
import ManagerLayout from './roles/manager/ManagerLayout.jsx'
import ManagerDashboard from './roles/manager/ManagerDashboard.jsx'
import ManagerTeam from './roles/manager/ManagerTeam.jsx'
import ManagerLeads from './roles/manager/Leads.jsx'
import ManagerCustomers from './roles/manager/ManagerCustomers.jsx'
import ManagerVisits from './roles/manager/ManagerVisits.jsx'
import ManagerAttendance from './roles/manager/ManagerAttendance.jsx'
import ManagerFollowups from './roles/manager/ManagerFollowups.jsx'
import ManagerOpportunities from './roles/manager/ManagerOpportunities.jsx'
import ManagerExpenses from './roles/manager/ManagerExpenses.jsx'
import ManagerReports from './roles/manager/ManagerReports.jsx'
import ManagerNotifications from './roles/manager/ManagerNotifications.jsx'
import ManagerLeaderboard from './roles/manager/ManagerLeaderboard.jsx'
import ManagerCalendar from './roles/manager/ManagerCalendar.jsx'
import ManagerHrms from './roles/manager/ManagerHrms.jsx'
import ManagerSettings from './roles/manager/ManagerSettings.jsx'

// ── Sales Executive ──────────────────────────────────────────────────
import SalesLayout from './roles/sales/SalesLayout.jsx'
import Dashboard from './roles/sales/Dashboard.jsx'
import Attendance from './roles/sales/Attendance.jsx'
import Customers from './roles/sales/Customers.jsx'
import Expenses from './roles/sales/Expenses.jsx'
import HRMS from './roles/sales/HRMS.jsx'
import ClientLog from './roles/sales/ClientLog.jsx'
import Leads from './roles/sales/Leads.jsx'
import Notifications from './roles/sales/Notifications.jsx'
import Todo from './roles/sales/Todo.jsx'
import SmartClientMap from './roles/sales/SmartClientMap.jsx'

const SALES_ROLES = [
  'sales', 'executive', 'Sales Executive',
  'manager', 'Sales Manager',
  'admin', 'Admin', 'ceo',
]

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
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
              <Route path="roles" element={<RoleManagement />} />
              <Route path="hrms" element={<HRMS />} />
              <Route path="attendance" element={<Navigate to="/admin/hrms?tab=attendance" replace />} />
              <Route path="reports" element={<CeoReports />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="settings" element={
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 font-bold text-white max-w-xl">
                  <h2 className="text-xl font-extrabold mb-2">System Settings & Configuration</h2>
                  <p className="text-xs text-slate-300">Administrative system preferences, security parameters, and application configuration options.</p>
                </div>
              } />
            </Route>
          </Route>

          {/* ── Manager Portal ──────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['manager', 'Sales Manager', 'admin', 'Admin']} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="dashboard" element={<ManagerDashboard />} />
              <Route path="map" element={<SmartClientMap />} />
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
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
