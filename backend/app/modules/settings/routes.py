from fastapi import APIRouter, Depends
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.settings.schemas import SettingsUpdate, SettingsResponse
from app.modules.settings.service import SettingsService
from app.modules.settings.permissions import CanManageSettings
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/settings", tags=["Application Settings"])


@router.get("/config", response_model=StandardResponse)
async def get_public_config(
    user_payload: dict = Depends(get_current_user_payload)
):
    """Get non-sensitive application settings and technical map/GPS configuration."""
    from app.core.config import settings as app_settings
    return StandardResponse.success_response(
        data={
            "client_route_alert_radius_km": app_settings.CLIENT_ROUTE_ALERT_RADIUS_KM,
            "gps_accuracy_threshold": app_settings.GPS_ACCURACY_THRESHOLD,
            "google_maps_api_key": app_settings.GOOGLE_MAPS_API_KEY,
            "default_map_latitude": app_settings.DEFAULT_MAP_LATITUDE,
            "default_map_longitude": app_settings.DEFAULT_MAP_LONGITUDE,
            "default_map_zoom": app_settings.DEFAULT_MAP_ZOOM,
            "route_refetch_distance_km": app_settings.ROUTE_REFETCH_DISTANCE_KM,
            "off_route_threshold_km": app_settings.OFF_ROUTE_THRESHOLD_KM,
            "arrival_radius_km": app_settings.ARRIVAL_RADIUS_KM,
        },
        message="Public configuration retrieved successfully"
    )



def get_service() -> SettingsService:
    return SettingsService()


@router.get("/products", response_model=StandardResponse)
async def get_products(
    user_payload: dict = Depends(get_current_user_payload),
    service: SettingsService = Depends(get_service)
):
    """Get organization products (accessible to all logged-in users)."""
    products = service.get_products()
    return StandardResponse.success_response(
        data={"products": products},
        message="Products retrieved successfully"
    )


@router.get("/business", response_model=StandardResponse)
async def get_settings(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    """Get system settings configuration."""
    settings_data = service.get_settings()
    return StandardResponse.success_response(
        data=settings_data,
        message="Business settings retrieved successfully"
    )


@router.put("/business", response_model=StandardResponse)
async def update_settings(
    data: SettingsUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    """Update business settings configuration."""
    # Fetch existing settings to compare if possible
    try:
        existing = service.get_settings()
    except Exception:
        existing = {}

    from fastapi import HTTPException
    try:
        updated = service.update_settings(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    update_dict = data.model_dump(exclude_none=True)
    
    # Determine permission action vs general settings update
    if "role_permissions" in update_dict:
        action = "ROLE_PERMISSION_CHANGED"
        desc = "Role permissions configuration updated"
        prev_val = {"role_permissions": existing.get("role_permissions")}
        new_val = {"role_permissions": update_dict.get("role_permissions")}
    elif "permissions" in update_dict:
        action = "PERMISSION_CHANGED"
        desc = "System permissions configuration updated"
        prev_val = {"permissions": existing.get("permissions")}
        new_val = {"permissions": update_dict.get("permissions")}
    else:
        action = "SETTINGS_UPDATED"
        desc = "Business settings updated"
        prev_val = {"settings": {k: existing.get(k) for k in update_dict.keys() if existing} if existing else None}
        new_val = update_dict

    create_audit_log(
        action, "organization.settings", user_payload,
        module="Settings",
        description=desc,
        previous_value=prev_val,
        new_value=new_val,
    )
    return StandardResponse.success_response(
        data=updated,
        message="Business settings updated successfully"
    )


# Branches CRUD
@router.post("/branches", response_model=StandardResponse)
async def create_branch(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        inserted = service.create_branch(data)
        return StandardResponse.success_response(
            data=inserted,
            message="Branch created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/branches/{branch_id}", response_model=StandardResponse)
async def update_branch(
    branch_id: str,
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        updated = service.update_branch(branch_id, data)
        return StandardResponse.success_response(
            data=updated,
            message="Branch updated successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/branches/{branch_id}", response_model=StandardResponse)
async def delete_branch(
    branch_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        service.delete_branch(branch_id)
        return StandardResponse.success_response(
            message="Branch deleted successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Products CRUD
@router.post("/products", response_model=StandardResponse)
async def create_product(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        inserted = service.create_product(data)
        return StandardResponse.success_response(
            data=inserted,
            message="Product created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/products/{product_id}", response_model=StandardResponse)
async def update_product(
    product_id: str,
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        updated = service.update_product(product_id, data)
        return StandardResponse.success_response(
            data=updated,
            message="Product updated successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/products/{product_id}", response_model=StandardResponse)
async def delete_product(
    product_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        service.delete_product(product_id)
        return StandardResponse.success_response(
            message="Product deleted successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Roles CRUD
@router.delete("/roles/{role_id}", response_model=StandardResponse)
async def delete_role(
    role_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        service.delete_role(role_id)
        create_audit_log("ROLE_DELETED", "organization.roles", user_payload, module="Roles & Permissions", description=f"Role '{role_id}' deleted")
        return StandardResponse.success_response(
            message=f"Role '{role_id}' deleted successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/roles/{role_id}/status", response_model=StandardResponse)
async def toggle_role_status(
    role_id: str,
    payload: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        is_active = bool(payload.get("is_active", payload.get("active", True)))
        res = service.toggle_role_status(role_id, is_active)
        create_audit_log("ROLE_STATUS_CHANGED", "organization.roles", user_payload, module="Roles & Permissions", description=f"Role '{role_id}' status set to {'Active' if is_active else 'Inactive'}")
        return StandardResponse.success_response(
            data=res,
            message=f"Role '{role_id}' status updated successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/roles/{role_id}/users", response_model=StandardResponse)
async def get_role_users(
    role_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        users = service.get_role_users(role_id)
        return StandardResponse.success_response(
            data={"users": users, "total": len(users)},
            message=f"Assigned users for role '{role_id}' retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/roles/{role_id}/users", response_model=StandardResponse)
async def update_role_users(
    role_id: str,
    payload: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        user_ids = payload.get("user_ids") or payload.get("users") or []
        res = service.update_role_users(role_id, user_ids)
        create_audit_log("ROLE_USERS_UPDATED", "organization.user_roles", user_payload, module="Roles & Permissions", description=f"Updated assigned users for role '{role_id}' ({len(user_ids)} users assigned)")
        return StandardResponse.success_response(
            data=res,
            message=f"Assigned users for role '{role_id}' updated successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/roles/{role_id}/duplicate", response_model=StandardResponse)
async def duplicate_role(
    role_id: str,
    payload: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        new_name = payload.get("name") or payload.get("role_name") or f"{role_id}_copy"
        new_desc = payload.get("description")
        res = service.duplicate_role(role_id, new_name, new_desc)
        create_audit_log("ROLE_DUPLICATED", "organization.roles", user_payload, module="Roles & Permissions", description=f"Cloned role '{role_id}' to create new custom role '{new_name}'")
        return StandardResponse.success_response(
            data=res,
            message=f"Role '{role_id}' duplicated as '{new_name}' successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



# Landmarks CRUD
@router.get("/landmarks", response_model=StandardResponse)
async def get_landmarks(
    user_payload: dict = Depends(get_current_user_payload),
    service: SettingsService = Depends(get_service)
):
    landmarks = service.get_landmarks()
    return StandardResponse.success_response(
        data={"landmarks": landmarks},
        message="Landmarks retrieved successfully"
    )

@router.post("/landmarks", response_model=StandardResponse)
async def create_landmark(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        inserted = service.create_landmark(data)
        return StandardResponse.success_response(
            data=inserted,
            message="Landmark created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Departments CRUD
@router.get("/departments", response_model=StandardResponse)
async def get_departments(
    user_payload: dict = Depends(get_current_user_payload),
    service: SettingsService = Depends(get_service)
):
    departments = service.get_departments()
    return StandardResponse.success_response(
        data={"departments": departments},
        message="Departments retrieved successfully"
    )

@router.post("/departments", response_model=StandardResponse)
async def create_department(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        inserted = service.create_department(data)
        return StandardResponse.success_response(
            data=inserted,
            message="Department created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Document Types CRUD
@router.get("/document-types", response_model=StandardResponse)
async def get_document_types(
    user_payload: dict = Depends(get_current_user_payload),
    service: SettingsService = Depends(get_service)
):
    document_types = service.get_document_types()
    return StandardResponse.success_response(
        data={"document_types": document_types},
        message="Document types retrieved successfully"
    )

@router.post("/document-types", response_model=StandardResponse)
async def create_document_type(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    from fastapi import HTTPException
    try:
        inserted = service.create_document_type(data)
        return StandardResponse.success_response(
            data=inserted,
            message="Document type created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


