/**
 * Date formatting utility for TConnect application
 * Enforces DD/MM/YYYY format across all components
 */

export function formatDate(dateInput) {
  if (!dateInput) return 'N/A'
  
  // If string already matches DD/MM/YYYY format, return directly
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput.trim())) {
    return dateInput.trim()
  }

  // Handle DD-MM-YYYY
  if (typeof dateInput === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateInput.trim())) {
    return dateInput.trim().replace(/-/g, '/')
  }

  // Handle YYYY-MM-DD
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput.trim())) {
    const parts = dateInput.trim().slice(0, 10).split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return String(dateInput)

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

export function formatDateTime(dateInput) {
  if (!dateInput) return 'N/A'

  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return String(dateInput)

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${mins}`
}

export function getTodayFormatted() {
  return formatDate(new Date())
}

/**
 * Parses date string (DD/MM/YYYY, YYYY-MM-DD, or ISO) to a valid Date object
 */
export function parseDateInput(str) {
  if (!str) return null
  if (str instanceof Date) return isNaN(str.getTime()) ? null : str

  const s = String(str).trim()

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    return new Date(year, month, day)
  }

  // YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10)
    const month = parseInt(ymdMatch[2], 10) - 1
    const day = parseInt(ymdMatch[3], 10)
    return new Date(year, month, day)
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Computes start and end Date objects for a given filter mode
 * Modes: 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom' | 'All'
 */
export function getDateFilterRange(mode, customStart = null, customEnd = null) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const normalized = String(mode || 'All').toLowerCase().replace(/[\s_-]+/g, '')

  if (normalized === 'today') {
    return { start: todayStart, end: todayEnd, mode: 'Today' }
  }

  if (normalized === 'yesterday') {
    const yestStart = new Date(todayStart)
    yestStart.setDate(yestStart.getDate() - 1)
    const yestEnd = new Date(todayEnd)
    yestEnd.setDate(yestEnd.getDate() - 1)
    return { start: yestStart, end: yestEnd, mode: 'Yesterday' }
  }

  if (normalized === 'thisweek') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday start
    const weekStart = new Date(now.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    return { start: weekStart, end: weekEnd, mode: 'This Week' }
  }

  if (normalized === 'thismonth') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start: monthStart, end: monthEnd, mode: 'This Month' }
  }

  if (normalized === 'thisyear') {
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    return { start: yearStart, end: yearEnd, mode: 'This Year' }
  }

  if (normalized === 'custom' && (customStart || customEnd)) {
    const s = parseDateInput(customStart) || new Date(2000, 0, 1)
    s.setHours(0, 0, 0, 0)
    const e = parseDateInput(customEnd) || new Date(2099, 11, 31)
    e.setHours(23, 59, 59, 999)
    return { start: s, end: e, mode: 'Custom' }
  }

  return { start: null, end: null, mode: 'All' }
}

/**
 * Checks if a given item date falls within the active date range
 */
export function isDateWithinFilterRange(itemDate, filterRange) {
  if (!filterRange || (!filterRange.start && !filterRange.end)) return true
  if (!itemDate) return true // Include if undated

  const d = parseDateInput(itemDate)
  if (!d) return true

  if (filterRange.start && d < filterRange.start) return false
  if (filterRange.end && d > filterRange.end) return false

  return true
}

/**
 * Calculates total leave days or permission hours for a leave request record
 */
export function getLeaveRequestDays(r) {
  if (!r) return 1;
  const type = String(r.leave_type || r.leaveType || '');
  if (type.includes('Half')) return 0.5;
  if (type.includes('Permission') || type.includes('Short')) {
    const match = String(r.duration || r.days || '').match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 2.0;
  }

  const fromStr = r.from_date || r.fromDate || r.start_date;
  const toStr = r.to_date || r.toDate || r.end_date || fromStr;

  if (fromStr && toStr) {
    const d1 = parseDateInput(fromStr);
    const d2 = parseDateInput(toStr);
    if (d1 && d2) {
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, days);
    }
  }

  if (r.total_days || r.totalDays) {
    return parseFloat(r.total_days || r.totalDays) || 1;
  }

  const match = String(r.duration || r.days || '1').match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 1.0;
}
