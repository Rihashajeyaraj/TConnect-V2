from enum import Enum


class RoleEnum(str, Enum):
    SUPER_ADMIN = "Super Admin"
    CEO_FOUNDER = "CEO / Founder"
    SALES_MANAGER = "Sales Manager"
    SALES_EXECUTIVE = "Sales Executive"


class SchemaEnum(str, Enum):
    ORGANIZATION = "organization"
    HRMS = "hrms"
    CRM = "crm"
    CUSTOMER = "customer"
    VISIT = "visit"
    ATTENDANCE = "attendance"
    EXPENSE = "expense"
    PIPELINE = "pipeline"
    NOTIFICATION = "notification"
    MASTERS = "masters"
    SETTINGS = "settings"
    AUDIT = "audit"
    REPORTS = "reports"


class LeaveStatusEnum(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class ExpenseStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REIMBURSED = "REIMBURSED"


class OpportunityStageEnum(str, Enum):
    QUALIFICATION = "QUALIFICATION"
    NEEDS_ANALYSIS = "NEEDS_ANALYSIS"
    PROPOSAL = "PROPOSAL"
    NEGOTIATION = "NEGOTIATION"
    CLOSED_WON = "CLOSED_WON"
    CLOSED_LOST = "CLOSED_LOST"
