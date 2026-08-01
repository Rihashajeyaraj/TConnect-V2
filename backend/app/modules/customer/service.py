from typing import List, Dict, Any
from app.modules.customer.repository import CustomerRepository
from app.modules.customer.schemas import CustomerCreate, CustomerUpdate
from app.exceptions.base import NotFoundException


class CustomerService:
    def __init__(self, repo: CustomerRepository = None):
        self.repo = repo or CustomerRepository()

    def list_customers(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_customers()

    def create_customer(self, data: CustomerCreate) -> Dict[str, Any]:
        payload = data.model_dump()
        payload["is_active"] = True
        return self.repo.create_customer(payload)

    def get_customer(self, cust_id: str) -> Dict[str, Any]:
        cust = self.repo.get_customer_by_id(cust_id)
        if not cust:
            raise NotFoundException(resource="Customer", identifier=cust_id)
        return cust

    def update_customer(self, cust_id: str, data: CustomerUpdate) -> Dict[str, Any]:
        payload = data.model_dump(exclude_unset=True)
        return self.repo.update_customer(cust_id, payload)

