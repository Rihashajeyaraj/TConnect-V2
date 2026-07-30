from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

CanViewAuditLogs = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER
])
