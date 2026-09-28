from app.core.dependencies import RequirePermissions

CanViewReports = RequirePermissions("reports.view")
CanViewSalesDashboard = RequirePermissions("reports.view")
CanExportReports = RequirePermissions("reports.export")
