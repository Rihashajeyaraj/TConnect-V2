import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import Signup from './common/Signup.jsx'
import ProtectedRoute from './common/ProtectedRoute.jsx'

import CeoLayout from './roles/ceo/CeoLayout.jsx'
import CeoDashboard from './roles/ceo/Dashboard.jsx'
import Leads from './roles/ceo/Leads.jsx'
import Customers from './roles/ceo/Customers.jsx'
import Visits from './roles/ceo/Visits.jsx'
import Followups from './roles/ceo/Followups.jsx'
import SalesPipeline from './roles/ceo/SalesPipeline.jsx'
import Hrms from './roles/ceo/Hrms.jsx'
import Expenses from './roles/ceo/Expenses.jsx'
import Reports from './roles/ceo/Reports.jsx'

import AdminLayout from './roles/admin/AdminLayout.jsx'
import AdminDashboard from './roles/admin/AdminDashboard.jsx'
import CompanyOverview from './roles/admin/CompanyOverview.jsx'
import UserManagement from './roles/admin/UserManagement.jsx'
import RoleManagement from './roles/admin/RoleManagement.jsx'

import ManagerLayout from './roles/manager/ManagerLayout.jsx'
import ManagerDashboard from './roles/manager/ManagerDashboard.jsx'

import SalesLayout from './roles/sales/SalesLayout.jsx'
import SalesDashboard from './roles/sales/SalesDashboard.jsx'

import { ToastProvider } from './common/ToastContext.jsx'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected CEO Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ceo', 'Super Admin']} />}>
            <Route path="/ceo" element={<CeoLayout />}>
              <Route index element={<CeoDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="leads" element={<Leads />} />
              <Route path="customer" element={<Customers />} />
              <Route path="visits" element={<Visits />} />
              <Route path="followups" element={<Followups />} />
              <Route path="opportunities" element={<SalesPipeline />} />
              <Route path="hrms" element={<Hrms />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<div className="text-center text-slate-400 pt-20 font-semibold text-lg">System Settings Panel</div>} />
            </Route>
          </Route>

          {/* Protected Admin Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'Super Admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="company" element={<CompanyOverview />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="roles" element={<RoleManagement />} />
              <Route path="hrms" element={<Hrms />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 font-bold text-white">System Settings Panel</div>} />
            </Route>
          </Route>

          {/* Protected Sales Manager Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['manager', 'Sales Manager', 'admin', 'Super Admin', 'ceo']} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="leads" element={<Leads />} />
              <Route path="opportunities" element={<SalesPipeline />} />
              <Route path="visits" element={<Visits />} />
              <Route path="attendance" element={<Hrms />} />
            </Route>
          </Route>

          {/* Protected Sales Executive Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['sales', 'executive', 'Sales Executive', 'manager', 'Sales Manager', 'admin', 'Super Admin', 'ceo']} />}>
            <Route path="/sales" element={<SalesLayout />}>
              <Route index element={<SalesDashboard />} />
              <Route path="clock" element={<SalesDashboard />} />
              <Route path="visit" element={<SalesDashboard />} />
              <Route path="leads" element={<Leads />} />
              <Route path="expense" element={<SalesDashboard />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
