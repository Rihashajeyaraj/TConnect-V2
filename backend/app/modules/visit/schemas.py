from typing import Optional
from pydantic import BaseModel, Extra


class VisitCreate(BaseModel):
    title: Optional[str] = None
    customer_id: Optional[str] = None
    customerId: Optional[str] = None
    customer_name: Optional[str] = None
    customerName: Optional[str] = None
    customer: Optional[str] = None
    client: Optional[str] = None
    contactPerson: Optional[str] = None
    contact_person: Optional[str] = None
    poc_name: Optional[str] = None
    purpose: Optional[str] = "Site Visit & Demo"
    location: Optional[str] = None
    location_name: Optional[str] = None
    address: Optional[str] = None
    visit_date: Optional[str] = None
    date: Optional[str] = None
    visit_time: Optional[str] = None
    time: Optional[str] = None
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None
    status: Optional[str] = "SCHEDULED"
    visit_status: Optional[str] = "SCHEDULED"
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    employee_phone: Optional[str] = None
    assignedTo: Optional[str] = None
    assigned_to: Optional[str] = None
    assignedToEmail: Optional[str] = None
    assigned_to_email: Optional[str] = None
    executive: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        extra = Extra.allow


class VisitCheckIn(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    check_in_notes: Optional[str] = None
    check_in_time: Optional[str] = None
    remarks: Optional[str] = None

    class Config:
        extra = Extra.allow


class VisitCheckOut(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    summary_notes: Optional[str] = None
    check_out_time: Optional[str] = None
    remarks: Optional[str] = None

    class Config:
        extra = Extra.allow


class VisitResponse(BaseModel):
    id: Optional[str] = None
    visit_id: Optional[str] = None
    title: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    visitor_id: Optional[str] = None
    purpose: Optional[str] = None
    status: Optional[str] = "SCHEDULED"
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location: Optional[str] = None
    notes: Optional[str] = None
