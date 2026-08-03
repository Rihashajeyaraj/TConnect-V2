/**
 * Date formatting utility for TConnect application
 * Enforces DD/MM/YYYY format across all components
 */

export function formatDate(dateInput) {
  if (!dateInput) return 'N/A'
  
  // If string already matches DD/MM/YYYY format, return directly
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    return dateInput
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
