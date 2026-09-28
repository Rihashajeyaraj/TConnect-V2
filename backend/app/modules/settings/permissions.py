from app.core.dependencies import RequirePermissions

CanManageSettings = RequirePermissions("system.settings.edit")
CanViewSettings = RequirePermissions("system.settings.view")
