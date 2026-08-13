from fastapi import APIRouter
from app.modules.auth.routes import router as auth_router
from app.modules.hrms.routes import router as hrms_router
from app.modules.crm.routes import router as crm_router
from app.modules.customer.routes import router as customer_router
from app.modules.visit.routes import router as visit_router
from app.modules.attendance.routes import router as attendance_router
from app.modules.expense.routes import router as expense_router
from app.modules.pipeline.routes import router as pipeline_router
from app.modules.notification.routes import router as notification_router
from app.modules.reports.routes import router as reports_router
from app.modules.settings.routes import router as settings_router
from app.modules.users.routes import router as users_router
from app.modules.audit.routes import router as audit_router
from app.modules.db_test.routes import router as db_test_router
from app.modules.todo.routes import router as todo_router
from app.modules.spatial.routes import router as spatial_router
from app.modules.sales.routes import router as sales_router
from app.modules.admin.routes import router as admin_router

api_router = APIRouter()

# Register all modules + database test suite
api_router.include_router(auth_router)
api_router.include_router(db_test_router)
api_router.include_router(hrms_router)
api_router.include_router(hrms_router, prefix="/employees", tags=["Employee Onboarding"])
api_router.include_router(users_router)
api_router.include_router(crm_router)
api_router.include_router(customer_router)
api_router.include_router(customer_router, prefix="/customer")
api_router.include_router(sales_router, prefix="/sales", tags=["Sales Targets"])
api_router.include_router(visit_router)
api_router.include_router(attendance_router)
api_router.include_router(expense_router)
api_router.include_router(pipeline_router)
api_router.include_router(notification_router)
api_router.include_router(reports_router)
api_router.include_router(settings_router)
api_router.include_router(audit_router)
api_router.include_router(todo_router)
api_router.include_router(spatial_router)
api_router.include_router(admin_router)
