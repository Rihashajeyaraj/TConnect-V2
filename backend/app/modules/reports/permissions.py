from app.core.dependencies import RequireRoles
from app.core.constants import RoleEnum

# Manager and above – for generic reports
CanViewReports = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.TEAM_LEAD,
])

# Sales Executive and above – for the personal sales dashboard
CanViewSalesDashboard = RequireRoles([
    RoleEnum.SUPER_ADMIN,
    RoleEnum.CEO_FOUNDER,
    RoleEnum.SALES_MANAGER,
    RoleEnum.TEAM_LEAD,
    RoleEnum.SALES_EXECUTIVE,
])
