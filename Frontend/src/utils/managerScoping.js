/**
 * Recursively collects all subordinates reporting under a Manager,
 * including direct Team Leads and Executives reporting to those Team Leads.
 */
export function collectManagerSubordinates(allEmployees = [], currentUser = {}) {
  if (!Array.isArray(allEmployees) || allEmployees.length === 0) return []

  const myId = String(currentUser.id || '').trim()
  const myUserId = String(currentUser.user_id || '').trim()
  const myCode = String(currentUser.employee_code || currentUser.employee_id || '').trim()
  const myEmail = String(currentUser.email || '').toLowerCase().trim()
  const myName = String(currentUser.name || currentUser.full_name || '').toLowerCase().trim()

  const managerIds = new Set([myId, myUserId, myCode].filter(Boolean))
  const managerEmails = new Set([myEmail].filter(Boolean))
  const managerNames = new Set([myName].filter(Boolean))

  const collectedMap = new Map()

  const collectStep = () => {
    let addedAny = false
    allEmployees.forEach((emp) => {
      if (!emp) return
      const empId = String(emp.id || emp.user_id || emp.auth_user_id || emp.employee_id || '').trim()
      const empEmail = String(emp.email || '').toLowerCase().trim()
      const empCode = String(emp.employee_code || emp.employee_id || '').trim()
      const empKey = empId || empEmail || empCode

      if (!empKey || collectedMap.has(empKey)) return

      // Self check
      const isSelf = (myEmail && empEmail === myEmail) || (myId && empId === myId) || (myCode && empCode === myCode)
      if (isSelf) return

      const rId = String(emp.reporting_manager_id || emp.reporting_manager || emp.manager_id || '').trim()
      const rEmail = String(emp.reporting_manager_email || emp.manager_email || '').toLowerCase().trim()
      const rName = String(emp.reporting_manager_name || emp.manager_name || '').toLowerCase().trim()

      const idMatch = !!(rId && managerIds.has(rId))
      const emailMatch = !!(rEmail && managerEmails.has(rEmail))
      const nameMatch = !!(
        rName &&
        rName !== 'not assigned' &&
        rName !== 'none' &&
        rName !== 'n/a' &&
        rName !== 'null' &&
        Array.from(managerNames).some((n) => n && (n === rName || n.includes(rName) || rName.includes(n)))
      )

      if (idMatch || emailMatch || nameMatch) {
        collectedMap.set(empKey, emp)
        if (empId) managerIds.add(empId)
        if (empCode && empCode !== 'N/A') managerIds.add(empCode)
        if (empEmail) managerEmails.add(empEmail)
        const name = String(emp.name || emp.full_name || '').toLowerCase().trim()
        if (name && name !== 'not assigned' && name !== 'none') managerNames.add(name)
        addedAny = true
      }
    })
    return addedAny
  }

  let depth = 5
  while (collectStep() && depth > 0) {
    depth--
  }

  return Array.from(collectedMap.values())
}
