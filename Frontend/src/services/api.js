import authSession from '../utils/authSession.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'


// ─────────────────────────────────────────────────────────────
// Helpers: read the real session stored by LoginForm at login
// ─────────────────────────────────────────────────────────────
function getStoredToken() {
  return authSession.getStoredToken()
}

function clearSession() {
  authSession.clearSession()
}

function redirectToLogin() {
  // Only redirect if we're not already on the login page
  if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
    window.location.href = '/'
  }
}

// ─────────────────────────────────────────────────────────────
// Core request function — uses only real Supabase session token
// In-Memory SWR Cache & Deduplication for zero-latency page transitions
// ─────────────────────────────────────────────────────────────
const inFlightRequests = new Map()
const apiCache = new Map()
const CACHE_TTL_MS = 60000 // 60 seconds memory cache

export function invalidateApiCache(prefix = '') {
  if (!prefix) {
    apiCache.clear()
    return
  }
  for (const key of apiCache.keys()) {
    if (key.includes(prefix)) {
      apiCache.delete(key)
    }
  }
}

let activeRefreshPromise = null

async function handleSilentRefresh() {
  if (!activeRefreshPromise) {
    const refreshToken = authSession.getStoredRefreshToken()
    if (!refreshToken) {
      return Promise.reject(new Error('No refresh token available'))
    }
    activeRefreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (res) => {
        let data
        try { data = await res.json() } catch (_) {}
        if (res.ok && data?.data?.access_token) {
          authSession.saveSession(data.data)
          return data.data
        }
        throw new Error(data?.message || 'Token refresh failed')
      })
      .finally(() => {
        activeRefreshPromise = null
      })
  }
  return activeRefreshPromise
}

async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase()

  // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
  if (method !== 'GET') {
    invalidateApiCache()
  } else if (!options.bypassCache && !options._isRetry && apiCache.has(endpoint)) {
    const cached = apiCache.get(endpoint)
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      // Background revalidate if cache is >5s old for zero-latency page transitions
      if (Date.now() - cached.timestamp > 5000) {
        setTimeout(() => {
          request(endpoint, { ...options, bypassCache: true }).catch(() => {})
        }, 10)
      }
      return Promise.resolve(cached.data)
    }
  }

  // For GET requests, reuse identical in-flight promises to deduplicate parallel calls
  if (method === 'GET' && !options.bypassCache && inFlightRequests.has(endpoint) && !options._isRetry) {
    return inFlightRequests.get(endpoint)
  }

  const token = getStoredToken()

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const controller = new AbortController()
  const timeoutMs = options.timeout || 30000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const config = { ...options, headers, signal: controller.signal }

  if (endpoint === '/visits' && options.method === 'POST') {
    console.log("[VISIT API] POST /api/v1/visits");
    console.log("[VISIT API] payload:", options.body);
  }

  const executeRequest = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
      clearTimeout(timeoutId)

      let data
      try {
        data = await response.json()
      } catch {
        if (response.status === 413) {
          data = { message: "Request payload too large (HTTP 413). Please attach a smaller file or receipt image." }
        } else {
          data = { message: `HTTP ${response.status}: Failed to parse response` }
        }
      }

      // On 401 — attempt silent refresh once if refresh_token exists
      if (
        response.status === 401 &&
        !options._isRetry &&
        !endpoint.includes('/auth/') &&
        !endpoint.includes('/attendance/match-face')
      ) {
        console.warn('[API 401] Attempting silent token refresh:', endpoint)
        try {
          const refreshed = await handleSilentRefresh()
          if (refreshed?.access_token) {
            // Retry original request once with fresh access token
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${refreshed.access_token}`,
            }
            return request(endpoint, { ...options, headers: retryHeaders, _isRetry: true })
          }
        } catch (refreshErr) {
          console.warn('[API Refresh Failed]:', refreshErr?.message || refreshErr)
          authSession.clearSession()
          redirectToLogin()
          return Promise.reject({ message: 'Session expired. Please log in again.', status: 401 })
        }
      }

      if (!response.ok) {
        if (endpoint === '/visits' && options.method === 'POST') {
          console.error("[VISIT API] status:", response.status);
          console.error("[VISIT API] response:", JSON.stringify(data));
        }
        return Promise.reject(data || { message: `HTTP Error ${response.status}` })
      }

      if (method === 'GET') {
        apiCache.set(endpoint, { data, timestamp: Date.now() })
      }

      return data
    } catch (error) {
      clearTimeout(timeoutId)
      if (error?.name === 'AbortError') {
        if (!options.silentError) {
          console.warn(`[API Timeout] Request to ${endpoint} timed out after ${timeoutMs}ms`)
        }
        return Promise.reject({ message: 'Request timed out. Please check connection and try again.', isTimeout: true })
      }
      if (error?.status === 401) return Promise.reject(error)
      return Promise.reject(error || { message: 'Network or server error' })
    }
  }

  const requestPromise = executeRequest()

  if (method === 'GET' && !options._isRetry) {
    inFlightRequests.set(endpoint, requestPromise)
    requestPromise.catch(() => {}) // Prevent unhandled promise rejections on shared in-flight GET requests
    requestPromise.finally(() => {
      inFlightRequests.delete(endpoint)
    })
  }

  return requestPromise
}


export const authAPI = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (userData) => request('/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  devToken: (payload) => request('/auth/dev-token', { method: 'POST', body: JSON.stringify(payload) }),
  refreshToken: (refreshToken) => request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }), _isRetry: true }),
  me: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  changePassword: (currentPassword, newPassword) => request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  }),
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
  deleteLead: (id) => request(`/crm/leads/${id}`, { method: 'DELETE' }),
  searchContacts: (query) => request(`/crm/contacts/search?query=${encodeURIComponent(query)}`),

  // ── Centralized conversion endpoints ────────────────────────────────────
  // All three route through the same backend CustomerConversionService.
  // DO NOT add customer creation logic elsewhere in the frontend.

  /** Lead → Customer. Marks lead as Converted. Prevents duplicates. */
  convertLeadToCustomer: (leadId, extraData = {}) =>
    request(`/customer/convert/lead/${leadId}`, {
      method: 'POST',
      body: JSON.stringify(extraData),
    }),

  /** Follow-up → Customer. Marks follow-up as Converted. Prevents duplicates. */
  convertFollowupToCustomer: (followupId, extraData = {}) =>
    request(`/customer/convert/followup/${followupId}`, {
      method: 'POST',
      body: JSON.stringify(extraData),
    }),

  /** Visit → Customer. Links visit to customer. Prevents duplicates. */
  convertVisitToCustomer: (visitId, extraData = {}) =>
    request(`/customer/convert/visit/${visitId}`, {
      method: 'POST',
      body: JSON.stringify(extraData),
    }),
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get ACTIVE follow-ups only (excludes Converted/Completed/Cancelled).
   * Use for the active Follow-up tab.
   */
  getFollowups: () => request('/crm/followups?active_only=true'),

  /**
   * Get ALL follow-ups including converted/completed history.
   * Use for Client Log / history views.
   */
  getFollowupsAll: () => request('/crm/followups?active_only=false'),

  createFollowup: (data) => request('/crm/followups', { method: 'POST', body: JSON.stringify(data) }),
  updateFollowup: (id, data) => request(`/crm/followups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFollowup: (id) => request(`/crm/followups/${id}`, { method: 'DELETE' }),
  reassignLeads: (data) => request('/crm/leads/reassign', { method: 'POST', body: JSON.stringify(data) }),
}

export const customerAPI = {
  getCustomers: () => request('/customer/customers'),
  getCustomerById: (id) => request(`/customer/customers/${id}`),

  /**
   * Direct Add Customer.
   * data.lead_id is OPTIONAL — pass only when a lead exists for this customer.
   * When lead_id is omitted, a standalone customer is created (no fake lead).
   * Duplicate check still runs: email, phone, company+person.
   */
  createCustomer: (data) =>
    request('/customer/customers', { method: 'POST', body: JSON.stringify(data) }),

  updateCustomer: (id, data) =>
    request(`/customer/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) =>
    request(`/customer/customers/${id}`, { method: 'DELETE' }),

  // ── Centralized Conversion Endpoints ────────────────────────────────────────
  // These call the canonical /customer/convert/* backend routes.
  // All three are available on customerAPI (where Leads.jsx expects them) AND on
  // crmAPI below for backward compatibility with any code using crmAPI.convertVisitToCustomer.

  /** Lead → Customer. Marks lead as Converted. Prevents duplicates. */
  convertLeadToCustomer: (leadId, extraData = {}) =>
    request(`/customer/convert/lead/${leadId}`, {
      method: 'POST',
      body: JSON.stringify(extraData),
    }),

  /** Follow-up → Customer. Marks follow-up as Converted. Prevents duplicates. */
  convertFollowupToCustomer: (followupId, extraData = {}) =>
    request(`/customer/convert/followup/${followupId}`, {
      method: 'POST',
      body: JSON.stringify(extraData),
    }),

  /** Visit → Customer. Links visit to customer. Prevents duplicates. */
  convertVisitToCustomer: (visitId, extraData = {}) =>
    request(`/customer/convert/visit/${visitId}`, {
      method: 'POST',
      body: JSON.stringify(extraData),
    }),
  // ────────────────────────────────────────────────────────────────────────────

  // CEO full hierarchy: Manager → Executive → Customer
  getCeoCustomerDirectory: () => request('/reports/ceo/customers'),
  reassignCustomers: (data) => request('/customer/customers/reassign', { method: 'POST', body: JSON.stringify(data) }),
}

export const hrmsAPI = {
  getEmployees: () => request('/hrms/employees'),
  createEmployee: (data) => request('/hrms/employees', { method: 'POST', body: JSON.stringify(data) }),
  getEmployeeById: (id) => request(`/hrms/employees/${id}`),
  getEmployee: (id) => request(`/hrms/employees/${id}`),
  updateEmployee: (id, data) => request(`/hrms/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: (id, file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64Data = reader.result
        request(`/hrms/employees/${id}/avatar`, {
          method: 'POST',
          body: JSON.stringify({ image_base64: base64Data, filename: file.name })
        }).then(resolve).catch(reject)
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  },
  deleteEmployee: (id) => request(`/hrms/employees/${id}`, { method: 'DELETE' }),
  getSalaries: () => request('/hrms/salaries'),
  getSalaryByEmployeeId: (empId) => request(`/hrms/employees/${empId}/salary`),
  updateSalary: (empId, data) => request(`/hrms/employees/${empId}/salary`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const attendanceAPI = {
  getLogs: () => request('/attendance'),
  getEnrollmentStatus: (empId = '', email = '') => request(`/attendance/enrollment-status?employee_id=${empId}&email=${email}`),
  enroll: (data) => request('/attendance/enroll', { method: 'POST', body: JSON.stringify(data) }),
  verifyLiveness: (data) => request('/attendance/verify-liveness', { method: 'POST', body: JSON.stringify(data) }),
  matchFace: (data) => request('/attendance/match-face', { method: 'POST', body: JSON.stringify(data) }),
  requestChallenge: () => request('/attendance/challenge', { method: 'POST' }),
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
  forwardToManager: (id, data) => request(`/expenses/${id}/forward`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  approveExpense: (id, data) => request(`/expenses/${id}/approve`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  rejectExpense: (id, data) => request(`/expenses/${id}/reject`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  returnExpense: (id, data) => request(`/expenses/${id}/return`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
}

export const notificationAPI = {
  getNotifications: (options = {}) => request('/notifications', options),
  getUnreadCount: (options = {}) => request('/notifications/unread-count', options),
  sendNotification: (data, options = {}) => request('/notifications', { method: 'POST', body: JSON.stringify(data), ...options }),
  markRead: (id, options = {}) => request(`/notifications/${id}/${typeof id === 'string' && id.includes('/') ? '' : 'read'}`, { method: 'PATCH', ...options }),
  markAsRead: (id, options = {}) => request(`/notifications/${id}/read`, { method: 'PATCH', ...options }),
}

export const reportAPI = {
  getSummary: () => request('/reports/summary'),
  getSavedReports: () => request('/reports/saved'),
  getSalesDashboard: () => request('/reports/sales-dashboard'),
  submitEODReport: (data) => request('/reports/eod', { method: 'POST', body: JSON.stringify(data) }),
  getEODReports: () => request('/reports/eod'),
  acknowledgeEODReport: (id, data) => request(`/reports/eod/${id}/acknowledge`, { method: 'POST', body: JSON.stringify(data) }),
  getCeoDashboard: () => request('/reports/ceo-dashboard'),
  getCeoSalesOverview: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/reports/ceo/sales-overview${query ? `?${query}` : ''}`)
  },
  getSalesReports: () => request('/reports/sales-reports'),
  submitSalesReport: (data) => request('/reports/sales-reports', { method: 'POST', body: JSON.stringify(data) }),
  reviewSalesReport: (id, data) => request(`/reports/sales-reports/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),
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


export const userAPI = {
  getUsers: (options = {}) => request('/users', options),
  getHierarchy: (options = {}) => request('/users/hierarchy', options),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  assignManager: (data) => request('/users/assign-manager', { method: 'POST', body: JSON.stringify(data) }),
  getManagerTeam: (managerId) => request(`/users/manager-team/${managerId}`),
  // Password reset requests (Admin only)
  getPasswordResetRequests: () => request('/users/password-reset-requests'),
  approvePasswordReset: (email, newPassword) => request(`/users/password-reset-requests/${encodeURIComponent(email)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  }),
  rejectPasswordReset: (email) => request(`/users/password-reset-requests/${encodeURIComponent(email)}/reject`, {
    method: 'POST',
  }),
}


export const settingsAPI = {
  getSettings: (options = {}) => request('/settings/business', options),
  updateSettings: (data) => request('/settings/business', { method: 'PUT', body: JSON.stringify(data) }),
  getConfig: () => request('/settings/config'),
  getProducts: () => request('/settings/products'),
  createBranch: (data) => request('/settings/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id, data) => request(`/settings/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBranch: (id) => request(`/settings/branches/${id}`, { method: 'DELETE' }),
  createProduct: (data) => request('/settings/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/settings/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/settings/products/${id}`, { method: 'DELETE' }),
  deleteRole: (id) => request(`/settings/roles/${id}`, { method: 'DELETE' }),
  toggleRoleStatus: (id, is_active) => request(`/settings/roles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  getRoleUsers: (id) => request(`/settings/roles/${id}/users`),
  updateRoleUsers: (id, user_ids) => request(`/settings/roles/${id}/users`, { method: 'PUT', body: JSON.stringify({ user_ids }) }),
  duplicateRole: (id, data) => request(`/settings/roles/${id}/duplicate`, { method: 'POST', body: JSON.stringify(data) }),
  getDepartments: () => request('/settings/departments'),
  createDepartment: (data) => request('/settings/departments', { method: 'POST', body: JSON.stringify(data) }),
  getLandmarks: () => request('/settings/landmarks'),
  createLandmark: (data) => request('/settings/landmarks', { method: 'POST', body: JSON.stringify(data) }),
  getDocumentTypes: () => request('/settings/document-types'),
  createDocumentType: (data) => request('/settings/document-types', { method: 'POST', body: JSON.stringify(data) }),
}

export const holidaysAPI = {
  getHolidays: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/holidays${query ? `?${query}` : ''}`)
  },
  createHoliday: (data) => request('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  updateHoliday: (id, data) => request(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHoliday: (id) => request(`/holidays/${id}`, { method: 'DELETE' }),
}

export const handbookAPI = {
  getPublishedDocs: () => request('/handbook'),
  getAllDocs: () => request('/handbook/admin'),
  createDoc: (data) => request('/handbook', { method: 'POST', body: JSON.stringify(data) }),
  updateDoc: (id, data) => request(`/handbook/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publishDoc: (id) => request(`/handbook/${id}/publish`, { method: 'POST' }),
}

export const commissionAPI = {
  getRules: () => request('/commission/rules'),
  createRule: (data) => request('/commission/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id, data) => request(`/commission/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const spatialAPI = {
  getNearby: (lat, lng, radius = 2000, entityType = 'all') =>
    request(`/spatial/nearby?lat=${lat}&lng=${lng}&radius=${radius}&entity_type=${entityType}`),
  optimizeRoute: (lat, lng, waypoints) =>
    request('/spatial/route-optimize', { method: 'POST', body: JSON.stringify({ lat, lng, waypoints }) }),
  checkGeofence: (lat, lng, thresholdMeters = 450) =>
    request('/spatial/geofence-check', { method: 'POST', body: JSON.stringify({ lat, lng, geofence_threshold_meters: thresholdMeters }) }),
  updateLocation: (data, options = {}) =>
    request('/spatial/update-location', { method: 'POST', body: JSON.stringify(data), silentError: true, timeout: 8000, ...options }),
  getRoute: (origin, destination) =>
    request('/spatial/route', { method: 'POST', body: JSON.stringify({ origin, destination }) }),
  computeRouteMatrix: (origins, destinations) =>
    request('/spatial/route-matrix', { method: 'POST', body: JSON.stringify({ origins, destinations }) }),
  getTeamLocations: () =>
    request('/spatial/manager/team-locations'),

  // ── Live GPS Tracking ──────────────────────────────────────────────────────
  startSession: (lat, lng, clientData = {}) =>
    request('/spatial/location/session/start', { method: 'POST', body: JSON.stringify({ latitude: lat, longitude: lng, ...clientData }) }),
  /** Push a GPS breadcrumb. Rejects poor accuracy & duplicates server-side. */
  pushLocation: (data, options = {}) =>
    request('/spatial/location/push', { method: 'POST', body: JSON.stringify(data), silentError: true, timeout: 8000, ...options }),
  /** End the tracking session when executive clocks out. */
  endSession: (data) =>
    request('/spatial/location/session/end', { method: 'POST', body: JSON.stringify(data) }),
  /** Manager fetches breadcrumb history for a specific executive (authorized). */
  getLocationHistory: (employeeId, sessionId = null) => {
    const qs = sessionId ? `?session_id=${sessionId}` : ''
    return request(`/spatial/location/history/${employeeId}${qs}`)
  },
}

export const salesAPI = {
  getTargets: () => request('/sales/targets'),
  createTarget: (data) => request('/sales/targets', { method: 'POST', body: JSON.stringify(data) }),
  updateTarget: (id, data) => request(`/sales/targets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTarget: (id) => request(`/sales/targets/${id}`, { method: 'DELETE' }),
  getTeamRevenueBreakdown: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/sales/revenue-breakdown${query ? `?${query}` : ''}`)
  },
  logActivity: (data) => request('/sales/activities', { method: 'POST', body: JSON.stringify(data) }),
  getActivities: () => request('/sales/activities'),
}

export const usersAPI = userAPI

export const auditAPI = {
  getLogs: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.user_email) params.append('user_email', filters.user_email)
    if (filters.role) params.append('role', filters.role)
    if (filters.action) params.append('action', filters.action)
    if (filters.entity_type) params.append('entity_type', filters.entity_type)
    if (filters.from_date) params.append('from_date', filters.from_date)
    if (filters.to_date) params.append('to_date', filters.to_date)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)
    const qs = params.toString()
    return request(`/audit/logs${qs ? `?${qs}` : ''}`)
  },
  logEvent: (data) => request('/audit/log', { method: 'POST', body: JSON.stringify(data) }),
}

export const adminAPI = {
  getKPIs: (period) => request(`/admin/dashboard/kpis?period=${period}`),
}

export const draftsAPI = {
  saveDraft: (formKey, recordId, draftData) => request('/auto-save/drafts', {
    method: 'POST',
    body: JSON.stringify({ form_key: formKey, record_id: recordId, draft_data: draftData })
  }),
  getDraft: (formKey, recordId = 'new') => request(`/auto-save/drafts/${formKey}?record_id=${recordId}`),
  deleteDraft: (formKey, recordId = 'new') => request(`/auto-save/drafts/${formKey}?record_id=${recordId}`, {
    method: 'DELETE'
  })
}

export default { request }

