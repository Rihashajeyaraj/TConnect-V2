from app.core.dependencies import RequirePermissions

CanViewExpenses = RequirePermissions("expenses.view")
CanCreateExpenses = RequirePermissions("expenses.create")
CanEditExpenses = RequirePermissions("expenses.edit")
CanApproveExpenses = RequirePermissions("expenses.approve")
