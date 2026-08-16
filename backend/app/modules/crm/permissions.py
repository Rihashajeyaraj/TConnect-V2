from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewLeads = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.SALES_EXECUTIVE
])

# Sales Executive included so they can update their own leads (status, visit scheduling,
# field updates). Record-level ownership is enforced by enforce_record_access() in
# CRMService — a Sales Executive can NEVER modify another employee's lead.
CanManageLeads = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.SALES_EXECUTIVE
])
