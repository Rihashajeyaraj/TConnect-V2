import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './common/Login.jsx'
import ForgotPassword from './common/ForgotPassword.jsx'
import Signup from './common/Signup.jsx'
import CeoLayout from './roles/ceo/CeoLayout.jsx'
import CeoDashboard from './roles/ceo/Dashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/ceo" element={<CeoLayout />}>
          <Route index element={<CeoDashboard />} />
          <Route path="executive-summary" element={<div className="text-center text-slate-400 pt-20">Executive Summary — Coming Soon</div>} />
          <Route path="sales-overview" element={<div className="text-center text-slate-400 pt-20">Sales Overview — Coming Soon</div>} />
          <Route path="pipeline" element={<div className="text-center text-slate-400 pt-20">Sales Pipeline — Coming Soon</div>} />
          <Route path="team-performance" element={<div className="text-center text-slate-400 pt-20">Team Performance — Coming Soon</div>} />
          <Route path="reports" element={<div className="text-center text-slate-400 pt-20">Reports & Analytics — Coming Soon</div>} />
          <Route path="notifications" element={<div className="text-center text-slate-400 pt-20">Notifications — Coming Soon</div>} />
          <Route path="settings" element={<div className="text-center text-slate-400 pt-20">Settings — Coming Soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
