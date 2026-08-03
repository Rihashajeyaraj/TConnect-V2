import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import Signup from './common/Signup.jsx'
import ProtectedRoute from './common/ProtectedRoute.jsx'
import CeoLayout from './roles/ceo/CeoLayout.jsx';
import CeoDashboard from './roles/ceo/Dashboard.jsx';

import CeoLeads from './roles/ceo/Leads.jsx';
import CeoCustomers from './roles/ceo/Customers.jsx';
import CeoVisits from './roles/ceo/Visits.jsx';
import CeoFollowups from './roles/ceo/Followups.jsx';
import CeoSalesPipeline from './roles/ceo/SalesPipeline.jsx';
import CeoHrms from './roles/ceo/Hrms.jsx';
import CeoExpenses from './roles/ceo/Expenses.jsx';
import CeoReports from './roles/ceo/Reports.jsx';


import AdminLayout from './roles/admin/AdminLayout.jsx'
import AdminDashboard from './roles/admin/AdminDashboard.jsx'
import CompanyOverview from './roles/admin/CompanyOverview.jsx'
import UserManagement from './roles/admin/UserManagement.jsx'
import RoleManagement from './roles/admin/RoleManagement.jsx'

import ManagerLayout from './roles/manager/ManagerLayout.jsx'
import ManagerDashboard from './roles/manager/ManagerDashboard.jsx'

import SalesLayout from "./roles/sales/SalesLayout.jsx";
import Dashboard from "./roles/sales/Dashboard.jsx";
import Attendance from "./roles/sales/Attendance.jsx";
import Customers from "./roles/sales/Customers.jsx";
import Expenses from "./roles/sales/Expenses.jsx";
import Followups from "./roles/sales/Followups.jsx";
import HRMS from "./roles/sales/HRMS.jsx";
import Leads from "./roles/sales/Leads.jsx";
import Notifications from "./roles/sales/Notifications.jsx";
import Opportunities from "./roles/sales/Opportunities.jsx";
import Visits from "./roles/sales/Visits.jsx";


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
              <Route path="leads" element={<CeoLeads />} />
              <Route path="customer" element={<CeoCustomers />} />
              <Route path="visits" element={<CeoVisits />} />
              <Route path="followups" element={<CeoFollowups />} />
              <Route path="opportunities" element={<CeoSalesPipeline />} />
              <Route path="hrms" element={<CeoHrms />} />
              <Route path="expenses" element={<CeoExpenses />} />
              <Route path="reports" element={<CeoReports />} />

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

          <Route element={<ProtectedRoute allowedRoles={['sales', 'executive', 'Sales Executive', 'manager', 'Sales Manager', 'admin', 'Super Admin', 'ceo']} />}>

            <Route path="/sales" element={<SalesLayout />}>

              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="customers" element={<Customers />} />
              <Route path="visits" element={<Visits />} />
              <Route path="leads" element={<Leads />} />
              <Route path="followups" element={<Followups />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="hrms" element={<HRMS />} />

            </Route>

          </Route>

          {/* Protected Sales Executive Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['sales', 'executive', 'Sales Executive', 'manager', 'Sales Manager', 'admin', 'Super Admin', 'ceo']} />}>
            <Route path="/sales" element={<SalesLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="visits" element={<Visits />} />
              <Route path="leads" element={<Leads />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="customers" element={<Customers />} />
              <Route path="followups" element={<Followups />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="hrms" element={<HRMS />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
