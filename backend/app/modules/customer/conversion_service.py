"""
Centralized Customer Conversion Service
========================================
ALL customer creation flows MUST use this service.
crm.customers is the ONLY canonical customer table.

Supported sources:
    "lead"      — Lead -> Customer
    "followup"  — Follow-up -> Customer
    "visit"     — Visit -> Customer
    "direct"    — Direct Add (lead_id optional)
"""

from typing import Optional, Dict, Any, Tuple
import uuid
import re
from datetime import datetime
from app.database.supabase import get_supabase_admin_client, get_supabase_client
from app.core.logger import logger


class CustomerConversionService:
    """
    Single entry point for all customer creation and conversion operations.
    Enforces:
      - crm.customers as canonical table
      - Duplicate prevention (lead_id -> email -> phone -> company+person)
      - Source record update after conversion
      - No silent Supabase failures
    """

    # Statuses that mean a follow-up is no longer active
    INACTIVE_FOLLOWUP_STATUSES = {"converted", "completed", "cancelled", "closed", "done"}

    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()

    # ─────────────────────────────────────────────────────────────────────────
    # Utilities
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _is_valid_uuid(val: Any) -> bool:
        if not val:
            return False
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, AttributeError, TypeError):
            return False

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Strip all non-digit characters."""
        return re.sub(r"\D", "", str(phone or ""))

    @staticmethod
    def _normalize_str(val: str) -> str:
        return str(val or "").lower().strip()

    # ─────────────────────────────────────────────────────────────────────────
    # Duplicate Detection
    # ─────────────────────────────────────────────────────────────────────────

    def _find_existing_customer(
        self,
        lead_id: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        company: Optional[str] = None,
        person: Optional[str] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Returns (customer_row, match_reason) or (None, None).
        Priority: lead_id -> email -> phone -> company+person
        Uses safe fallback matching; will not accidentally merge unrelated customers.
        """
        # 1. Primary: exact lead_id match
        if self._is_valid_uuid(lead_id):
            try:
                res = (
                    self.supabase.schema("crm")
                    .table("customers")
                    .select("*")
                    .eq("lead_id", str(lead_id))
                    .execute()
                )
                if res.data:
                    logger.info(f"[DEDUP] Existing customer found by lead_id={lead_id}")
                    return res.data[0], "lead_id"
            except Exception as e:
                logger.warning(f"[DEDUP] lead_id check error: {e}")

        # 2. Fallback: exact email match
        norm_email = self._normalize_str(email)
        if norm_email and "@" in norm_email:
            try:
                res = (
                    self.supabase.schema("crm")
                    .table("customers")
                    .select("*")
                    .eq("email", norm_email)
                    .execute()
                )
                if res.data:
                    logger.info(f"[DEDUP] Existing customer found by email={norm_email}")
                    return res.data[0], "email"
            except Exception as e:
                logger.warning(f"[DEDUP] email check error: {e}")

        # 3. Fallback: phone / company+person (requires fetching all — careful scan)
        norm_phone = self._normalize_phone(phone)
        norm_company = self._normalize_str(company)
        norm_person = self._normalize_str(person)

        if norm_phone or (norm_company and norm_person):
            try:
                res = self.supabase.schema("crm").table("customers").select("*").execute()
                for row in res.data or []:
                    # Phone match — require at least 8 digits to avoid false positives
                    if norm_phone and len(norm_phone) >= 8:
                        row_phone = self._normalize_phone(
                            row.get("phone") or row.get("mobile") or ""
                        )
                        if row_phone and row_phone == norm_phone:
                            logger.info(f"[DEDUP] Existing customer found by phone={norm_phone}")
                            return row, "phone"
                    # Company + person — BOTH must be non-empty and match exactly
                    if norm_company and norm_person:
                        row_co = self._normalize_str(
                            row.get("company") or row.get("company_name") or row.get("name") or ""
                        )
                        row_pe = self._normalize_str(
                            row.get("contact_person") or row.get("person") or ""
                        )
                        if row_co and row_pe and row_co == norm_company and row_pe == norm_person:
                            logger.info("[DEDUP] Existing customer found by company+person")
                            return row, "company_person"
            except Exception as e:
                logger.warning(f"[DEDUP] fallback scan error: {e}")

        return None, None

    # ─────────────────────────────────────────────────────────────────────────
    # Source Data Resolution
    # ─────────────────────────────────────────────────────────────────────────

    def _resolve_lead_data(
        self, lead_id: str, extra: Dict
    ) -> Tuple[Dict, Optional[str]]:
        """Extract contact info from a CRM lead."""
        from app.modules.crm.repository import CRMRepository
        lead = CRMRepository().get_lead_by_id(lead_id)
        if not lead:
            raise ValueError(f"Lead '{lead_id}' not found")

        contact = {
            "lead_id": lead_id,
            "company_name": (
                lead.get("company_name") or lead.get("company")
                or extra.get("company_name") or extra.get("company") or ""
            ),
            "contact_person": (
                lead.get("contact_person") or lead.get("person")
                or extra.get("contact_person") or ""
            ),
            "email": (
                lead.get("email") or lead.get("contact_email")
                or extra.get("email") or ""
            ),
            "phone": (
                lead.get("mobile") or lead.get("phone")
                or extra.get("phone") or ""
            ),
            "city": lead.get("city") or extra.get("city") or "Chennai",
            "address": lead.get("address") or extra.get("address") or "",
            "assigned_to": (
                lead.get("assigned_to") or extra.get("assigned_to") or ""
            ),
            "assigned_to_email": (
                lead.get("assigned_to_email") or extra.get("assigned_to_email") or ""
            ),
            "notes": f"Converted from Lead | Lead#: {lead.get('lead_number', '')}",
            # Carry exact GPS coordinates from the source lead
            "latitude": extra.get("latitude") or lead.get("latitude"),
            "longitude": extra.get("longitude") or lead.get("longitude"),
        }
        return contact, lead_id

    def _resolve_followup_data(
        self, followup_id: str, extra: Dict
    ) -> Tuple[Dict, Optional[str]]:
        """
        Extract contact info from a CRM follow-up.
        If follow_up.lead_id exists, fetch lead info first, using follow-up as fallback.
        """
        from app.modules.crm.repository import CRMRepository
        followup = CRMRepository().get_followup_by_id(followup_id)
        if not followup:
            raise ValueError(f"Follow-up '{followup_id}' not found")

        lead_id = followup.get("leadId") or followup.get("lead_id") or extra.get("lead_id")
        valid_lead_id = str(lead_id) if self._is_valid_uuid(lead_id) else None

        lead_data = {}
        if valid_lead_id:
            lead = CRMRepository().get_lead_by_id(valid_lead_id)
            if lead:
                lead_data = lead

        company = (
            lead_data.get("company_name") or lead_data.get("company")
            or followup.get("company") or extra.get("company_name") or extra.get("company") or ""
        )
        person = (
            lead_data.get("contact_person") or lead_data.get("person")
            or followup.get("person") or extra.get("contact_person") or ""
        )
        email = (
            lead_data.get("email") or lead_data.get("contact_email")
            or followup.get("email") or extra.get("email") or ""
        )
        phone = (
            lead_data.get("mobile") or lead_data.get("phone")
            or followup.get("phone") or extra.get("phone") or ""
        )
        city = (
            lead_data.get("city") or followup.get("city") or extra.get("city") or "Chennai"
        )
        address = lead_data.get("address") or extra.get("address") or city

        contact = {
            "lead_id": valid_lead_id,
            "company_name": company,
            "contact_person": person,
            "email": email,
            "phone": phone,
            "city": city,
            "address": address,
            "assigned_to": (
                lead_data.get("assigned_to") or followup.get("assignedTo") or extra.get("assigned_to") or ""
            ),
            "assigned_to_email": (
                lead_data.get("assigned_to_email") or followup.get("assignedToEmail") or extra.get("assigned_to_email") or ""
            ),
            "notes": f"Converted from Follow-up | ID: {followup_id}",
        }
        return contact, followup_id

    def _resolve_visit_data(
        self, visit_id: str, extra: Dict
    ) -> Tuple[Dict, Optional[str]]:
        """
        Extract contact info from a Visit record.
        If visit.lead_id exists, fetch lead info first, using visit as fallback.
        """
        from app.modules.visit.repository import VisitRepository
        visit = VisitRepository().get_visit_by_id(visit_id)
        if not visit:
            raise ValueError(f"Visit '{visit_id}' not found")

        lead_id = visit.get("lead_id") or extra.get("lead_id")
        valid_lead_id = str(lead_id) if self._is_valid_uuid(lead_id) else None

        lead_data = {}
        if valid_lead_id:
            from app.modules.crm.repository import CRMRepository
            lead = CRMRepository().get_lead_by_id(valid_lead_id)
            if lead:
                lead_data = lead

        company = (
            lead_data.get("company_name") or lead_data.get("company")
            or visit.get("company") or visit.get("customer_name") or visit.get("client_name")
            or extra.get("company_name") or ""
        )
        person = (
            lead_data.get("contact_person") or lead_data.get("person")
            or visit.get("poc_name") or visit.get("contact_person")
            or extra.get("contact_person") or ""
        )
        email = (
            lead_data.get("email") or lead_data.get("contact_email")
            or visit.get("poc_email") or extra.get("email") or ""
        )
        phone = (
            lead_data.get("mobile") or lead_data.get("phone")
            or visit.get("poc_mobile") or extra.get("phone") or ""
        )
        city = (
            lead_data.get("city") or visit.get("location") or extra.get("city") or "Chennai"
        )
        address = lead_data.get("address") or visit.get("location") or extra.get("address") or ""

        contact = {
            "lead_id": valid_lead_id,
            "company_name": company,
            "contact_person": person,
            "email": email,
            "phone": phone,
            "city": city,
            "address": address,
            "assigned_to": (
                lead_data.get("assigned_to") or visit.get("employee_name") or extra.get("assigned_to") or ""
            ),
            "assigned_to_email": (
                lead_data.get("assigned_to_email") or visit.get("assigned_to_email") or extra.get("assigned_to_email") or ""
            ),
            "notes": f"Converted from Visit | ID: {visit_id}",
        }
        return contact, visit_id

    def _resolve_direct_data(self, extra: Dict) -> Tuple[Dict, Optional[str]]:
        """
        Direct Add — lead_id is OPTIONAL.
        If provided and a valid UUID -> link to lead.
        If not provided -> create standalone customer (no fake lead generated).
        """
        lead_id = extra.get("lead_id")
        valid_lead_id = str(lead_id) if self._is_valid_uuid(lead_id) else None

        contact = {
            "lead_id": valid_lead_id,
            "company_name": (
                extra.get("company_name") or extra.get("company") or extra.get("name") or ""
            ),
            "contact_person": (
                extra.get("contact_person") or extra.get("person") or ""
            ),
            "email": extra.get("email") or "",
            "phone": extra.get("phone") or extra.get("mobile") or "",
            "city": extra.get("city") or "Chennai",
            "address": extra.get("address") or "",
            "assigned_to": extra.get("assigned_to") or "",
            "assigned_to_email": extra.get("assigned_to_email") or "",
            "notes": extra.get("notes") or "Direct customer entry",
        }
        return contact, None

    # ─────────────────────────────────────────────────────────────────────────
    # Customer Insert
    # ─────────────────────────────────────────────────────────────────────────

    def _create_customer_record(
        self, contact: Dict, user_payload: Dict
    ) -> Dict:
        """
        Insert a new customer into crm.customers.
        Always generates a proper uuid.uuid4() for both `id` and `customer_id`.
        Uses ONLY columns that exist in the crm.customers database schema:
        (id, customer_id, lead_id, name, company, company_name, contact_person, person,
         email, phone, location, address, city, sales_manager, sales_executive, status, notes)
        Raises RuntimeError on Supabase failure — never silently swallows errors.
        """
        customer_uuid = str(uuid.uuid4())
        company = contact.get("company_name") or "Converted Client"
        person = contact.get("contact_person") or ""
        email = self._normalize_str(contact.get("email") or "")
        phone = contact.get("phone") or ""
        city = contact.get("city") or "Chennai"
        address = contact.get("address") or city
        lead_id = contact.get("lead_id")
        assigned_to_name = (
            contact.get("assigned_to") or contact.get("sales_executive") or contact.get("sales_executive_name") or contact.get("executive_name") or (user_payload or {}).get("name") or ""
        )

        # Parse contract value
        raw_val = contact.get("contract_value") or contact.get("revenue") or contact.get("contractValue") or contact.get("value") or 0.0
        contract_value = 0.0
        if raw_val:
            if isinstance(raw_val, (int, float)):
                contract_value = float(raw_val)
            else:
                try:
                    clean_val = "".join(c for c in str(raw_val) if c.isdigit() or c == '.')
                    contract_value = float(clean_val) if clean_val else 0.0
                except ValueError:
                    contract_value = 0.0

        # Resolve sales manager
        sales_mgr = contact.get("sales_manager") or contact.get("sales_manager_name") or ""
        if not sales_mgr and assigned_to_name:
            try:
                from app.modules.users.repository import UserRepository
                all_users = UserRepository().get_all_users()
                exec_name_clean = str(assigned_to_name).lower().strip()
                for u in all_users:
                    u_name = str(u.get("name") or u.get("full_name") or "").lower().strip()
                    if u_name == exec_name_clean:
                        sales_mgr = u.get("reporting_manager_name")
                        break
            except Exception:
                pass

        full_payload = {
            "id": customer_uuid,
            "customer_id": customer_uuid,
            "lead_id": lead_id if self._is_valid_uuid(lead_id) else None,
            "name": company,
            "company": company,
            "company_name": company,
            "contact_person": person if person else None,
            "person": person if person else None,
            "email": email if email else None,
            "phone": phone if phone else None,
            "location": city,
            "address": address,
            "city": city,
            "sales_executive": assigned_to_name if assigned_to_name else None,
            "sales_manager": sales_mgr if sales_mgr else None,
            "contract_value": contract_value,
            "status": contact.get("status") or "Active Customer",
            "notes": contact.get("notes") or contact.get("reachOutReason") or f"Customer account for {company}",
        }

        logger.info(
            f"[CUSTOMER INSERT] company={company}, lead_id={lead_id}, uuid={customer_uuid}"
        )

        # Attempt 1: full schema-valid payload
        try:
            res = (
                self.supabase.schema("crm")
                .table("customers")
                .insert(full_payload)
                .execute()
            )
            if res.data:
                logger.info(f"[CUSTOMER INSERT SUCCESS] id={customer_uuid}")
                return res.data[0]
        except Exception as e1:
            logger.warning(f"[CUSTOMER INSERT] Full payload failed: {e1}")

        # Attempt 2: minimal required fields only
        minimal_payload = {
            "id": customer_uuid,
            "customer_id": customer_uuid,
            "lead_id": lead_id if self._is_valid_uuid(lead_id) else None,
            "name": company,
            "company": company,
            "company_name": company,
            "status": "Active Customer",
        }
        try:
            res = (
                self.supabase.schema("crm")
                .table("customers")
                .insert(minimal_payload)
                .execute()
            )
            if res.data:
                logger.info(f"[CUSTOMER INSERT SUCCESS via minimal] id={customer_uuid}")
                return res.data[0]
        except Exception as e2:
            logger.error(f"[CUSTOMER INSERT FAILED] Both attempts failed: {e2}")
            raise RuntimeError(
                f"Failed to insert customer into crm.customers: {e2}"
            ) from e2

        raise RuntimeError("Customer insert returned no data from Supabase")

    # ─────────────────────────────────────────────────────────────────────────
    # Source Record Updates
    # ─────────────────────────────────────────────────────────────────────────

    def _update_lead_converted(self, lead_id: str, customer_id: str) -> None:
        """Mark a lead as Converted to Customer in crm.leads."""
        if not self._is_valid_uuid(lead_id):
            return
        try:
            from app.modules.crm.repository import CRMRepository
            CRMRepository().update_lead(lead_id, {
                "status": "Converted to Customer",
                "converted_to_customer_id": customer_id,
            })
            logger.info(
                f"[LEAD UPDATE] lead_id={lead_id} -> Converted to Customer ({customer_id})"
            )
        except Exception as e:
            logger.warning(f"[LEAD UPDATE] Failed for lead_id={lead_id}: {e}")

    def _update_followup_converted(
        self, followup_id: str, customer_id: str
    ) -> None:
        """
        Mark a follow-up as Converted in crm.follow_ups.
        customer_id is set to the ACTUAL customer UUID.
        Uses ONLY columns that exist in the crm.follow_ups schema:
        (follow_up_id, lead_id, customer_id, assigned_to, follow_up_date, follow_up_time,
         follow_up_type, status, subject, notes, outcome, next_follow_up_date, created_by,
         created_at, updated_at).
        """
        now_iso = datetime.utcnow().isoformat()
        attempts = [
            # Standard update: status + outcome + customer_id + updated_at
            {
                "status": "Converted",
                "outcome": "Converted to Customer",
                "customer_id": customer_id,
                "updated_at": now_iso,
            },
            # Without updated_at
            {
                "status": "Converted",
                "outcome": "Converted to Customer",
                "customer_id": customer_id,
            },
            # Minimum: status + customer_id
            {"status": "Converted", "customer_id": customer_id},
        ]
        for attempt in attempts:
            try:
                res = (
                    self.supabase.schema("crm")
                    .table("follow_ups")
                    .update(attempt)
                    .eq("follow_up_id", followup_id)
                    .execute()
                )
                logger.info(
                    f"[FOLLOWUP UPDATE] followup_id={followup_id} -> Converted "
                    f"(fields: {list(attempt.keys())})"
                )
                return
            except Exception as e:
                logger.warning(
                    f"[FOLLOWUP UPDATE] Attempt with {list(attempt.keys())} failed: {e}"
                )
        logger.error(
            f"[FOLLOWUP UPDATE] All update attempts failed for followup_id={followup_id}. "
            "Follow-up history preserved. Manual check required."
        )

    def _update_visit_customer(self, visit_id: str, customer_id: str) -> None:
        """
        Link a visit to a customer by setting customer_id.
        Non-fatal: visit history is preserved even if the column doesn't exist.
        """
        for schema, table, key in [
            ("field_management", "visits", "visit_id"),
            (None, "visits", "id"),
        ]:
            try:
                if schema:
                    res = (
                        self.supabase.schema(schema)
                        .table(table)
                        .update({"customer_id": customer_id})
                        .eq(key, visit_id)
                        .execute()
                    )
                else:
                    res = (
                        self.supabase.table(table)
                        .update({"customer_id": customer_id})
                        .eq(key, visit_id)
                        .execute()
                    )
                if res.data:
                    logger.info(
                        f"[VISIT UPDATE] visit_id={visit_id} -> customer_id={customer_id}"
                    )
                    return
            except Exception as e:
                logger.warning(
                    f"[VISIT UPDATE] {schema or 'public'}.{table}.{key} failed: {e}"
                )
        logger.info(
            f"[VISIT UPDATE] customer_id column may not exist in visits table. "
            "Visit history preserved — no customer_id link written."
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Main Entry Point
    # ─────────────────────────────────────────────────────────────────────────

    def convert_to_customer(
        self,
        source: str,
        source_id: Optional[str],
        extra_data: Dict[str, Any],
        user_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Universal customer conversion/creation entry point.

        Args:
            source      : "lead" | "followup" | "visit" | "direct"
            source_id   : UUID of the source record (None for direct)
            extra_data  : additional fields from request body
            user_payload: authenticated JWT payload

        Returns:
            {
                "customer": {...},
                "created": True | False,
                "source": "lead|followup|visit|direct",
                "match_reason": "lead_id|email|phone|company_person|none"
            }

        Raises:
            ValueError       — if source_id is missing or source record not found
            RuntimeError     — if Supabase insert fails on all attempts
        """
        source = (source or "direct").lower().strip()
        extra_data = extra_data or {}

        logger.info(f"[CONVERT] source={source}, source_id={source_id}")

        # ── 1. Resolve source record -> extract contact info ────────────────
        if source == "lead":
            if not source_id:
                raise ValueError("lead_id is required for Lead -> Customer conversion")
            contact, _ = self._resolve_lead_data(source_id, extra_data)

        elif source == "followup":
            if not source_id:
                raise ValueError(
                    "followup_id is required for Follow-up -> Customer conversion"
                )
            contact, _ = self._resolve_followup_data(source_id, extra_data)

        elif source == "visit":
            if not source_id:
                raise ValueError(
                    "visit_id is required for Visit -> Customer conversion"
                )
            contact, _ = self._resolve_visit_data(source_id, extra_data)

        else:  # direct
            contact, _ = self._resolve_direct_data(extra_data)

        # ── 2. Check for duplicates ─────────────────────────────────────────
        existing, match_reason = self._find_existing_customer(
            lead_id=contact.get("lead_id"),
            email=contact.get("email"),
            phone=contact.get("phone"),
            company=contact.get("company_name"),
            person=contact.get("contact_person"),
        )

        if existing:
            customer_row = existing
            created = False
            logger.info(
                f"[CONVERT] Reusing existing customer id={existing.get('id')} "
                f"(matched by: {match_reason})"
            )
        else:
            # ── 3. Create new customer ──────────────────────────────────────
            customer_row = self._create_customer_record(contact, user_payload)
            created = True
            match_reason = "none"

        customer_id = customer_row.get("id") or customer_row.get("customer_id")
        lead_id = contact.get("lead_id")

        # ── 4. Update source record ─────────────────────────────────────────
        if source == "lead":
            self._update_lead_converted(source_id, customer_id)

        elif source == "followup":
            self._update_followup_converted(source_id, customer_id)
            if lead_id:
                self._update_lead_converted(lead_id, customer_id)

        elif source == "visit":
            self._update_visit_customer(source_id, customer_id)
            if lead_id:
                self._update_lead_converted(lead_id, customer_id)

        elif source == "direct" and lead_id:
            # lead_id optionally provided — link it if valid
            self._update_lead_converted(lead_id, customer_id)

        # ── 5. Build normalized response ────────────────────────────────────
        customer_out = dict(customer_row)
        customer_out["id"] = customer_id
        customer_out["customer_id"] = customer_id
        customer_out["name"] = (
            customer_out.get("name")
            or customer_out.get("company")
            or customer_out.get("company_name")
            or ""
        )
        customer_out["company"] = (
            customer_out.get("company")
            or customer_out.get("company_name")
            or customer_out.get("name")
            or ""
        )
        customer_out["person"] = (
            customer_out.get("person")
            or customer_out.get("contact_person")
            or ""
        )
        customer_out["phone"] = (
            customer_out.get("phone") or customer_out.get("mobile") or ""
        )
        customer_out["email"] = customer_out.get("email") or ""
        customer_out["city"] = (
            customer_out.get("city") or customer_out.get("location") or ""
        )
        customer_out["assigned_to"] = (
            customer_out.get("sales_executive") or customer_out.get("assigned_to") or (user_payload or {}).get("name") or ""
        )
        customer_out["status"] = customer_out.get("status") or "Active Customer"

        logger.info(
            f"[CONVERT COMPLETE] customer_id={customer_id}, "
            f"created={created}, source={source}"
        )

        return {
            "customer": customer_out,
            "created": created,
            "source": source,
            "match_reason": match_reason,
        }
