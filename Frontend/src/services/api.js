const API_BASE_URL = 'http://localhost:8000/api/v1'

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token')
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
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    const data = await response.json()
    if (!response.ok) {
      return Promise.reject(data)
    }
    return data
  } catch (error) {
    return Promise.reject(error)
  }
}

export const authAPI = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (userData) => request('/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  devToken: (payload) => request('/auth/dev-token', { method: 'POST', body: JSON.stringify(payload) }),
}

export const crmAPI = {
  getLeads: () => request('/crm/leads'),
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
  getLogs: () => request('/attendance/logs'),
  clockIn: (data) => request('/attendance/clock-in', { method: 'POST', body: JSON.stringify(data) }),
  clockOut: (data) => request('/attendance/clock-out', { method: 'POST', body: JSON.stringify(data) }),
}

export const visitAPI = {
  getVisits: () => request('/visit/visits'),
  createVisit: (data) => request('/visit/visits', { method: 'POST', body: JSON.stringify(data) }),
  checkIn: (id, data) => request(`/visit/visits/${id}/check-in`, { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (id, data) => request(`/visit/visits/${id}/check-out`, { method: 'POST', body: JSON.stringify(data) }),
}

export const pipelineAPI = {
  getOpportunities: () => request('/pipeline/opportunities'),
  createOpportunity: (data) => request('/pipeline/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (id, data) => request(`/pipeline/opportunities/${id}/stage`, { method: 'PATCH', body: JSON.stringify(data) }),
}

export const expenseAPI = {
  getExpenses: () => request('/expense/expenses'),
  createExpense: (data) => request('/expense/expenses', { method: 'POST', body: JSON.stringify(data) }),
  approveExpense: (id, data) => request(`/expense/expenses/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
}

export const reportAPI = {
  getSummary: () => request('/reports/summary'),
  getSavedReports: () => request('/reports/saved'),
}

export const auditAPI = {
  getLogs: () => request('/audit/logs'),
}

export const userAPI = {
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
}

export const settingsAPI = {
  getSettings: () => request('/settings/business'),
  updateSettings: (data) => request('/settings/business', { method: 'PUT', body: JSON.stringify(data) }),
}

export default { request }
