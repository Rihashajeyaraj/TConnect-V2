from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewExpenses = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.SALES_EXECUTIVE
])

CanApproveExpenses = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER
])
