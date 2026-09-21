from enum import Enum


class RoleEnum(str, Enum):
    SUPER_ADMIN = "Super Admin"
    CEO_FOUNDER = "CEO / Founder"
    SALES_MANAGER = "Sales Manager"
    TEAM_LEAD = "Team Lead"
    SALES_EXECUTIVE = "Sales Executive"


class SchemaEnum(str, Enum):
    HRMS = "hrms"
    ORGANIZATION = "organization"
    CRM = "crm"
    FIELD_MANAGEMENT = "field_management"
    FINANCE = "finance"
    SYSTEM = "system"

    # Backward-compatibility mappings to the 6 primary schemas
    CUSTOMER = "crm"
    PIPELINE = "crm"
    VISIT = "field_management"
    ATTENDANCE = "hrms"
    EXPENSE = "finance"
    NOTIFICATION = "system"
    REPORTS = "system"
    SETTINGS = "organization"
    AUDIT = "system"
    MASTERS = "organization"


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
