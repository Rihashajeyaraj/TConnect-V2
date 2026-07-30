from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewReports = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER
])
