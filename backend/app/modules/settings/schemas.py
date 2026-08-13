from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    legal_name: Optional[str] = None
    tax_id_gstin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    currency: Optional[str] = None
    time_zone: Optional[str] = None
    allow_self_signup: Optional[bool] = None
    rate_limit_per_min: Optional[int] = None
    branches: Optional[List[Dict[str, Any]]] = None
    departments: Optional[List[Dict[str, Any]]] = None
    role_permissions: Optional[List[Dict[str, Any]]] = None
    designations: Optional[List[Dict[str, Any]]] = None
    products: Optional[List[Dict[str, Any]]] = None
    lead_sources: Optional[List[Dict[str, Any]]] = None
    customer_categories: Optional[List[Dict[str, Any]]] = None


class SettingsResponse(BaseModel):
    company_name: Optional[str] = "TwiteConnect Technologies Pvt. Ltd."
    legal_name: Optional[str] = "TwiteConnect Software Solutions & Services"
    tax_id_gstin: Optional[str] = "33AAAAA0000A1Z5"
    email: Optional[str] = "contact@tconnect.com"
    phone: Optional[str] = "+91 98765 43210"
    website: Optional[str] = "https://twiteconnect.com"
    address: Optional[str] = "Plot 45, OMR IT Expressway, Perungudi, Chennai - 600096, Tamil Nadu"
    logo_url: Optional[str] = None
    currency: Optional[str] = "INR (₹)"
    time_zone: Optional[str] = "Asia/Kolkata (IST)"
    allow_self_signup: Optional[bool] = False
    rate_limit_per_min: Optional[int] = 60
    branches: Optional[List[Dict[str, Any]]] = None
    departments: Optional[List[Dict[str, Any]]] = None
    role_permissions: Optional[List[Dict[str, Any]]] = None
    designations: Optional[List[Dict[str, Any]]] = None
    products: Optional[List[Dict[str, Any]]] = None
    lead_sources: Optional[List[Dict[str, Any]]] = None
    customer_categories: Optional[List[Dict[str, Any]]] = None

