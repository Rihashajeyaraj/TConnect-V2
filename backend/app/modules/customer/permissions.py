from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewCustomers = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.TEAM_LEAD,
    RoleEnum.SALES_EXECUTIVE
])

# Sales Executive included so they can convert their own leads/visits/follow-ups to
# customers and create customers from their own workflow.
# Record-level ownership is enforced by the CustomerConversionService and scoping layer
# — a Sales Executive can NEVER convert or modify another employee's records.
CanManageCustomers = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.TEAM_LEAD,
    RoleEnum.SALES_EXECUTIVE
])
