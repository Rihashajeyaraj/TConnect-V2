const API_BASE_URL = 'http://localhost:8000/api/v1'

async function request(endpoint, options = {}) {
  let token = localStorage.getItem('token') || localStorage.getItem('access_token')

  // If no token exists in local environment, fetch a development JWT token automatically
  if (!token && !endpoint.includes('/auth/')) {
    try {
      const devRes = await fetch(`${API_BASE_URL}/auth/dev-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'manager@tconnect.com', role: 'Sales Manager', name: 'Sales Manager' })
      })
      const devData = await devRes.json()
      token = devData?.data?.access_token
      if (token) {
        localStorage.setItem('token', token)
        localStorage.setItem('access_token', token)
      }
    } catch (e) {
      // Fall through silently if server is offline
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const config = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    let data
    try {
      data = await response.json()
    } catch (parseErr) {
      data = { message: `Server HTTP ${response.status}: Failed to parse JSON response` }
    }

    // Auto-refresh token on 401 Unauthorized in dev mode
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      try {
        const refreshDevRes = await fetch(`${API_BASE_URL}/auth/dev-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'manager@tconnect.com', role: 'Sales Manager', name: 'Sales Manager' })
        })
        const refreshDevData = await refreshDevRes.json()
        const newToken = refreshDevData?.data?.access_token
        if (newToken) {
          localStorage.setItem('token', newToken)
          localStorage.setItem('access_token', newToken)
          config.headers.Authorization = `Bearer ${newToken}`
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config)
          const retryData = await retryResponse.json()
          if (retryResponse.ok) return retryData
        }
      } catch (refreshErr) {
        // Fall through
      }
    }

    if (!response.ok) {
      return Promise.reject(data || { message: `HTTP Error ${response.status}` })
    }
    return data
  } catch (error) {
    return Promise.reject(error || { message: 'Network or internal server error' })
  }
}

export const authAPI = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (userData) => request('/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  devToken: (payload) => request('/auth/dev-token', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
}

export const crmAPI = {
  getLeads: () => request('/crm/leads'),
  getTeamLeads: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/crm/team-leads${query ? `?${query}` : ''}`)
  },
  createLead: (data) => request('/crm/leads', { method: 'POST', body: JSON.stringify(data) }),
  getLeadById: (id) => request(`/crm/leads/${id}`),
  updateLead: (id, data) => request(`/crm/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  convertLeadToCustomer: (leadId, extraDetails) =>
    request('/customer/customers', { method: 'POST', body: JSON.stringify({ lead_id: leadId, ...extraDetails }) }),
}

export const customerAPI = {
  getCustomers: () => request('/customer/customers'),
  getCustomerById: (id) => request(`/customer/customers/${id}`),
  createCustomer: (data) => request('/customer/customers', { method: 'POST', body: JSON.stringify(data) }),
}

export const hrmsAPI = {
  getEmployees: () => request('/hrms/employees'),
  createEmployee: (data) => request('/hrms/employees', { method: 'POST', body: JSON.stringify(data) }),
  getEmployeeById: (id) => request(`/hrms/employees/${id}`),
  updateEmployee: (id, data) => request(`/hrms/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/hrms/employees/${id}`, { method: 'DELETE' }),
}

export const attendanceAPI = {
  getLogs: () => request('/attendance'),
  getEnrollmentStatus: (empId = '', email = '') => request(`/attendance/enrollment-status?employee_id=${empId}&email=${email}`),
  enroll: (data) => request('/attendance/enroll', { method: 'POST', body: JSON.stringify(data) }),
  verifyLiveness: (data) => request('/attendance/verify-liveness', { method: 'POST', body: JSON.stringify(data) }),
  matchFace: (data) => request('/attendance/match-face', { method: 'POST', body: JSON.stringify(data) }),
  clockIn: (data) => request('/attendance/clock-in', { method: 'POST', body: JSON.stringify(data) }),
  clockOut: (data) => request('/attendance/clock-out', { method: 'POST', body: JSON.stringify(data) }),
  submitLeaveRequest: (data) => request('/attendance/leave', { method: 'POST', body: JSON.stringify(data) }),
  getLeaveRequests: () => request('/attendance/leave'),
  updateLeaveStatus: (requestId, statusStr, comment) =>
    request(`/attendance/leave/${requestId}/status`, { method: 'POST', body: JSON.stringify({ status: statusStr, comment }) }),
}

export const visitAPI = {
  getVisits: () => request('/visits'),
  getTeamAudit: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/visits/team-audit${query ? `?${query}` : ''}`)
  },
  createVisit: (data) => request('/visits', { method: 'POST', body: JSON.stringify(data) }),
  checkIn: (id, data) => request(`/visits/${id}/check-in`, { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (id, data) => request(`/visits/${id}/check-out`, { method: 'POST', body: JSON.stringify(data) }),
  completeVisit: (id, data) => request(`/visits/${id}/complete`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const pipelineAPI = {
  getOpportunities: () => request('/pipeline/opportunities'),
  createOpportunity: (data) => request('/pipeline/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (id, data) => request(`/pipeline/opportunities/${id}/stage`, { method: 'PATCH', body: JSON.stringify(data) }),
}

export const expenseAPI = {
  getExpenses: () => request('/expenses'),
  getManagerExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/expenses/manager${query ? `?${query}` : ''}`)
  },
  getExpenseById: (id) => request(`/expenses/${id}`),
  createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  approveExpense: (id, data) => request(`/expenses/${id}/approve`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  rejectExpense: (id, data) => request(`/expenses/${id}/reject`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  returnExpense: (id, data) => request(`/expenses/${id}/return`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
}

export const notificationAPI = {
  getNotifications: () => request('/notifications'),
  getUnreadCount: () => request('/notifications/unread-count'),
  sendNotification: (data) => request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
}

export const reportAPI = {
  getSummary: () => request('/reports/summary'),
  getSavedReports: () => request('/reports/saved'),
  getSalesDashboard: () => request('/reports/sales-dashboard'),
  submitEODReport: (data) => request('/reports/eod', { method: 'POST', body: JSON.stringify(data) }),
  getEODReports: () => request('/reports/eod'),
  acknowledgeEODReport: (id, data) => request(`/reports/eod/${id}/acknowledge`, { method: 'POST', body: JSON.stringify(data) }),
  getCeoDashboard: () => request('/reports/ceo-dashboard'),
}

export const dashboardAPI = {
  getSalesDashboard: () => request('/reports/sales-dashboard'),
}

export const salesDashboardAPI = dashboardAPI

export const todoAPI = {
  getTodos: () => request('/todo'),
  createTodo: (data) => request('/todo', { method: 'POST', body: JSON.stringify(data) }),
  updateTodo: (id, data) => request(`/todo/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTodo: (id) => request(`/todo/${id}`, { method: 'DELETE' }),
}

export const auditAPI = {
  getLogs: () => request('/audit/logs'),
}

export const userAPI = {
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  assignManager: (data) => request('/users/assign-manager', { method: 'POST', body: JSON.stringify(data) }),
  getManagerTeam: (managerId) => request(`/users/manager-team/${managerId}`),
}

export const settingsAPI = {
  getSettings: () => request('/settings/business'),
  updateSettings: (data) => request('/settings/business', { method: 'PUT', body: JSON.stringify(data) }),
}

export const spatialAPI = {
  getNearby: (lat, lng, radius = 2000, entityType = 'all') =>
    request(`/spatial/nearby?lat=${lat}&lng=${lng}&radius=${radius}&entity_type=${entityType}`),
  optimizeRoute: (lat, lng, waypoints) =>
    request('/spatial/route-optimize', { method: 'POST', body: JSON.stringify({ lat, lng, waypoints }) }),
  checkGeofence: (lat, lng, thresholdMeters = 450) =>
    request('/spatial/geofence-check', { method: 'POST', body: JSON.stringify({ lat, lng, geofence_threshold_meters: thresholdMeters }) }),
  updateLocation: (data) =>
    request('/spatial/update-location', { method: 'POST', body: JSON.stringify(data) }),
}

export const usersAPI = userAPI

export default { request }
