from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewVisits = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.SALES_EXECUTIVE
])

CanRecordVisits = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.SALES_EXECUTIVE
])
