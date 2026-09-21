from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewPipeline = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.TEAM_LEAD,
    RoleEnum.SALES_EXECUTIVE
])

CanManagePipeline = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.TEAM_LEAD
])
