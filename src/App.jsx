import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import Signup from './common/Signup.jsx'
import CeoLayout from './roles/ceo/CeoLayout.jsx'
import CeoDashboard from './roles/ceo/Dashboard.jsx'
import Leads from './roles/ceo/Leads.jsx'
import Customers from './roles/ceo/Customers.jsx'
import Visits from './roles/ceo/Visits.jsx'
import Followups from './roles/ceo/Followups.jsx'
import SalesPipeline from './roles/ceo/SalesPipeline.jsx'
import Hrms from './roles/ceo/Hrms.jsx'
import Expenses from './roles/ceo/Expenses.jsx'

import { ToastProvider } from './common/ToastContext.jsx'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/ceo" element={<CeoLayout />}>
            <Route index element={<CeoDashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="customer" element={<Customers />} />
            <Route path="visits" element={<Visits />} />
            <Route path="followups" element={<Followups />} />
            <Route path="opportunities" element={<SalesPipeline />} />
            <Route path="hrms" element={<Hrms />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<div className="text-center text-slate-400 pt-20 font-semibold text-lg">Reports & Analytics Dashboard — Coming Soon</div>} />
            <Route path="settings" element={<div className="text-center text-slate-400 pt-20 font-semibold text-lg">System Settings Panel — Coming Soon</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
