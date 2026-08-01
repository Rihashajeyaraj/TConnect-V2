from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanManageSettings = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    "Admin",
    "System Admin",
])
