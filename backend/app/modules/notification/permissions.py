from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewNotifications = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.TEAM_LEAD,
    RoleEnum.SALES_EXECUTIVE
])
