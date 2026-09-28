from app.core.dependencies import RequirePermissions

CanViewAuditLogs = RequirePermissions("system.audit.view")
CanExportAuditLogs = RequirePermissions("system.audit.export")
