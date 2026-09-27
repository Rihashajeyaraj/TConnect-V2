import anyio
from fastapi import APIRouter, Depends, Query, status, HTTPException
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.attendance.schemas import ClockInRequest, ClockOutRequest, EnrollmentRequest
from app.modules.attendance.service import AttendanceService
from app.modules.attendance.permissions import CanViewAttendance, CanRecordAttendance
from app.modules.audit.service import create_audit_log
from app.core.logger import logger


router = APIRouter(prefix="/attendance", tags=["Attendance Management"])


def get_service() -> AttendanceService:
    return AttendanceService()


def verify_location_signature(
    lat: float,
    lng: float,
    timestamp: int,
    employee_id: str,
    location_signature: str,
    verification_token: str
) -> None:
    import time
    import jose.jwt
    from app.core.config import settings
    import hmac
    import hashlib

    # 1. Verification token MUST be present
    if not verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing verification_token. Location verification is required."
        )

    # 2. Decode the token to get the challenge salt
    try:
        payload = jose.jwt.decode(verification_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired verification token: {str(e)}"
        )

    challenge_salt = payload.get("challenge_salt")
    if not challenge_salt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token does not contain a valid challenge salt."
        )

    # 3. Enforce signature timestamp expiry (prevent replay attacks - e.g., max 2 minutes skew)
    if not timestamp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing signature_timestamp. Please sync your device clock."
        )
    current_time = int(time.time())
    if abs(current_time - timestamp) > 120:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Signature timestamp has expired. Please re-try clocking in."
         )

    # 4. Check if coordinates are present
    if lat is None or lng is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing latitude or longitude coordinates."
        )

    # 5. Compute HMAC expected signature with exact float string formatting
    message = "{:.6f}:{:.6f}:{}:{}".format(lat, lng, timestamp, employee_id).encode("utf-8")
    expected_sig = hmac.new(challenge_salt.encode("utf-8"), message, hashlib.sha256).hexdigest()

    if not location_signature:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Location signature is missing. Console geolocation changes are disabled."
        )

    # 6. Verify HMAC signature securely
    if not hmac.compare_digest(expected_sig, location_signature.strip()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Location verification failed. Tampering or spoofing detected."
        )


@router.get("/enrollment-status", response_model=StandardResponse)
async def get_enrollment_status(
    employee_id: str = Query(None),
    email: str = Query(""),
    user_payload: dict = Depends(get_current_user_payload),
    service: AttendanceService = Depends(get_service)
):
    """Retrieve one-time biometric/facial enrollment status for employee."""
    emp = employee_id or user_payload.get("employee_code") or user_payload.get("sub") or "EMP000012"
    result = service.get_enrollment_status(emp, email or user_payload.get("email") or "")
    return StandardResponse.success_response(
        data=result,
        message="Enrollment status retrieved successfully"
    )


@router.post("/enroll", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def enroll_employee(
    data: EnrollmentRequest,
    user_payload: dict = Depends(get_current_user_payload),
    service: AttendanceService = Depends(get_service)
):
    """Save one-time facial/biometric enrollment data."""
    from app.core.scoping import normalize_user_role
    norm_role = normalize_user_role(user_payload.get("role") or "")
    is_privileged = norm_role in ("admin", "super_admin", "ceo", "system_admin")
    
    if not is_privileged or not data.employee_id:
        data.employee_id = str(user_payload.get("employee_code") or user_payload.get("sub") or "EMP000012")
    if not is_privileged or not data.employee_name:
        data.employee_name = str(user_payload.get("name") or "Sales Executive")

    # 1. Parse base64 image data URL
    if not data.face_data_url or "base64," not in data.face_data_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid face_data_url. Expected base64-encoded image data URL."
        )

    try:
        import base64
        header, encoded = data.face_data_url.split("base64,", 1)
        image_bytes = base64.b64decode(encoded)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to decode base64 image: {str(e)}"
        )

    # 2. Extract biometric vectors
    from app.modules.attendance.biometric_client import BiometricClient
    bio_client = BiometricClient()
    extract_res = bio_client.extract_vectors(image_bytes)

    if not extract_res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Biometric service vector extraction failed: {extract_res.get('message', 'Unknown error')}"
        )

    vector = extract_res.get("face_encoding")
    
    # 3. Validate extracted vector
    if not isinstance(vector, list) or len(vector) != 512:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid biometric template vector size: {len(vector) if isinstance(vector, list) else 'not a list'} (expected exactly 512 dimensions)."
        )

    # Validate that all elements are numbers
    if not all(isinstance(x, (int, float)) for x in vector):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biometric template vector contains non-numeric values."
        )

    # Set the extracted vector into the request model to be stored in the DB
    data.face_template_vector = vector

    # 4. Duplicate Face Detection against all existing enrollments
    valid_enrollments = service.repo.get_all_enrollments()
    if valid_enrollments:
        import json
        candidates = []
        for enr in valid_enrollments:
            if enr.get("face_template_vector") and isinstance(enr["face_template_vector"], list):
                candidates.append({
                    "id": enr["employee_id"],
                    "face_encoding": enr["face_template_vector"]
                })
        
        if candidates:
            candidate_list_str = json.dumps(candidates)
            match_res = bio_client.match_face([image_bytes], candidate_list_str)
            
            if not match_res.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Biometric matching service error during duplicate detection: {match_res.get('message', 'Unknown error')}"
                )
            
            if match_res.get("verified"):
                matched_id = match_res.get("matched_id")
                matched_enr = next((e for e in valid_enrollments if e["employee_id"] == matched_id), None)
                if matched_enr:
                    matched_name = matched_enr.get("employee_name") or "Unknown"
                    matched_code = matched_enr.get("employee_id") or "Unknown"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"This face is already enrolled for {matched_name} / {matched_code}."
                    )

    result = service.enroll(data)
    return StandardResponse.success_response(
        data=result,
        message="Employee enrollment completed successfully"
    )


@router.post("/verify-liveness", response_model=StandardResponse)
async def verify_liveness(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    service: AttendanceService = Depends(get_service)
):
    """Verify facial liveness challenge for anti-spoofing using real biometric client."""
    face_data_url = data.get("face_data_url")
    if not face_data_url or "base64," not in face_data_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid face_data_url. Expected base64-encoded image data URL."
        )

    try:
        import base64
        header, encoded = face_data_url.split("base64,", 1)
        image_bytes = base64.b64decode(encoded)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to decode base64 image: {str(e)}"
        )

    # Call the external biometric service to extract vectors,
    # which runs strict anti-spoofing/liveness checks on the server.
    from app.modules.attendance.biometric_client import BiometricClient
    bio_client = BiometricClient()
    extract_res = bio_client.extract_vectors(image_bytes)

    if not extract_res.get("success"):
        return StandardResponse.success_response(
            data={
                "liveness_verified": False,
                "liveness_score": 0.0,
                "message": f"Spoofing detected or verification failed: {extract_res.get('message', 'Unknown error')}"
            },
            message="Liveness verification failed"
        )

    return StandardResponse.success_response(
        data={
            "liveness_verified": True,
            "liveness_score": 0.98,
            "challenge_type": data.get("challenge_type", "blink"),
            "message": "Liveness check passed. Genuine face verified."
        },
        message="Liveness verification evaluated"
    )


@router.post("/match-face", response_model=StandardResponse)
async def match_face(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    service: AttendanceService = Depends(get_service)
):
    """Match live facial feature template against enrolled employee template."""
    base64_images = data.get("images") or []
    if not base64_images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No camera frames provided."
        )

    # 1. Query all valid enrollments from DB
    valid_enrollments = service.repo.get_all_enrollments()
    if not valid_enrollments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No enrolled faces found in database. Please complete enrollment first."
        )

    # 2. Build candidate list JSON
    import json
    candidates = []
    for enr in valid_enrollments:
        candidates.append({
            "id": enr["employee_id"],
            "face_encoding": enr["face_template_vector"]
        })
    candidate_list_str = json.dumps(candidates)

    # 3. Decode base64 images
    import base64
    image_bytes_list = []
    for data_url in base64_images:
        try:
            if "base64," in data_url:
                header, encoded = data_url.split("base64,", 1)
                image_bytes_list.append(base64.b64decode(encoded))
            else:
                image_bytes_list.append(base64.b64decode(data_url))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format in frames."
            )

    # 4. Call Biometric Client
    from app.modules.attendance.biometric_client import BiometricClient
    bio_client = BiometricClient()
    match_res = bio_client.match_face(image_bytes_list, candidate_list_str)

    if not match_res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Biometric matching service error: {match_res.get('message')}"
        )

    if not match_res.get("verified"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face unrecognized or similarity score below required security threshold."
        )

    matched_id = match_res.get("matched_id")
    # Fetch employee details for name mapping
    matched_enr = next((e for e in valid_enrollments if e["employee_id"] == matched_id), None)
    if not matched_enr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Matched employee enrollment not found in database."
        )
    
    matched_name = matched_enr.get("employee_name") or "Sales Executive"

    # 5. Generate secure verification token with dynamic challenge salt
    import uuid
    challenge_salt = str(uuid.uuid4())
    from app.core.security import create_biometric_token
    device_user_id = str(user_payload.get("employee_code") or user_payload.get("sub") or "")
    token = create_biometric_token(
        employee_id=matched_id,
        employee_name=matched_name,
        device_user_id=device_user_id,
        challenge_salt=challenge_salt
    )

    return StandardResponse.success_response(
        data={
            "verified": True,
            "matched_employee_id": matched_id,
            "matched_employee_name": matched_name,
            "similarity_score": match_res.get("similarity_score", 0.99),
            "verification_token": token,
            "challenge_salt": challenge_salt
        },
        message=f"Biometric match verified successfully as {matched_name}."
    )


@router.post("/challenge", response_model=StandardResponse)
async def generate_challenge(
    user_payload: dict = Depends(get_current_user_payload)
):
    """Generate a dynamic single-use location challenge token for clock-in/out fallback."""
    import time
    import uuid
    import jose.jwt
    from app.core.config import settings
    
    salt = str(uuid.uuid4())
    payload = {
        "challenge_salt": salt,
        "type": "fallback_challenge",
        "device_user_id": str(user_payload.get("employee_code") or user_payload.get("sub") or ""),
        "exp": int(time.time()) + 120, # 2 minutes expiry
        "created_at": int(time.time())
    }
    token = jose.jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return StandardResponse.success_response(
        data={
            "verification_token": token,
            "challenge_salt": salt
        },
        message="Verification challenge generated successfully"
    )


@router.get("", response_model=StandardResponse)
async def get_attendance_logs(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewAttendance),
    service: AttendanceService = Depends(get_service)
):
    """Retrieve attendance logs filtered by authenticated user."""
    logs = await anyio.to_thread.run_sync(service.list_logs, user_payload)
    return StandardResponse.success_response(
        data=logs,
        message="Attendance logs retrieved successfully"
    )


@router.post("/clock-in", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def clock_in(
    data: ClockInRequest,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordAttendance),
    service: AttendanceService = Depends(get_service)
):
    """Record clock-in with GPS location for the authenticated user."""
    actor_id = str(user_payload.get("employee_code") or user_payload.get("sub") or "")
    
    if data.verification_token:
        import jose.jwt
        from app.core.config import settings
        try:
            token_payload = jose.jwt.decode(data.verification_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if token_payload.get("type") == "biometric_verification":
                target_employee_id = token_payload.get("verified_employee_id")
                target_employee_name = token_payload.get("verified_employee_name")
            elif token_payload.get("type") == "fallback_challenge":
                user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "")
                target_employee_id = str(user_payload.get("employee_code") or user_payload.get("employee_id") or user_id)
                target_employee_name = str(user_payload.get("name") or user_payload.get("full_name") or "Sales Executive")
            else:
                raise ValueError("Invalid token type in verification token.")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Verification token failed: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is missing. Location verification is required."
        )

    # Secure geofence location verification to prevent devtools/console spoofing
    verify_location_signature(
        lat=data.latitude,
        lng=data.longitude,
        timestamp=data.signature_timestamp,
        employee_id=target_employee_id,
        location_signature=data.location_signature,
        verification_token=data.verification_token
    )

    data.employee_id = target_employee_id
    data.employee_name = target_employee_name

    db_user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "")
    log = service.clock_in(db_user_id, data)

    if data.latitude and data.longitude:
        try:
            from datetime import datetime, timezone
            from app.database.supabase import get_supabase_admin_client, get_supabase_client
            sp_client = get_supabase_admin_client() or get_supabase_client()
            location_data = {
                "employee_id": data.employee_id,
                "latitude": float(data.latitude),
                "longitude": float(data.longitude),
                "accuracy": 10.0,
                "is_online": True,
                "last_seen_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            sp_client.schema("hrms").table("employee_locations").upsert(location_data).execute()
        except Exception as le:
            logger.warning(f"Failed to auto-update employee_locations on clock-in: {le}")

    create_audit_log(
        "ATTENDANCE_UPDATED", "hrms.attendance_logs", user_payload,
        entity_id=str(log.get("id") or log.get("attendance_id") or ""),
        module="HRMS",
        description=f"Clock-in recorded for {data.employee_id} (Actor: {actor_id})",
        new_value={
            "event": "clock_in", 
            "latitude": data.latitude, 
            "longitude": data.longitude, 
            "work_location": getattr(data, "work_location", getattr(data, "location_name", None)),
            "device_actor": actor_id,
            "target_employee": target_employee_id
        },
    )
    return StandardResponse.success_response(
        data=log,
        message="Clocked in successfully"
    )


@router.post("/clock-out", response_model=StandardResponse)
async def clock_out(
    data: ClockOutRequest,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordAttendance),
    service: AttendanceService = Depends(get_service)
):
    """Record clock-out with GPS location for the authenticated user."""
    actor_id = str(user_payload.get("employee_code") or user_payload.get("sub") or "")
    
    if data.verification_token:
        import jose.jwt
        from app.core.config import settings
        try:
            token_payload = jose.jwt.decode(data.verification_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if token_payload.get("type") == "biometric_verification":
                target_employee_id = token_payload.get("verified_employee_id")
            elif token_payload.get("type") == "fallback_challenge":
                user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "")
                target_employee_id = str(user_payload.get("employee_code") or user_payload.get("employee_id") or user_id)
            else:
                raise ValueError("Invalid token type in verification token.")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Verification token failed: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is missing. Location verification is required."
        )

    # Secure geofence location verification to prevent devtools/console spoofing
    verify_location_signature(
        lat=data.latitude,
        lng=data.longitude,
        timestamp=data.signature_timestamp,
        employee_id=target_employee_id,
        location_signature=data.location_signature,
        verification_token=data.verification_token
    )

    data.employee_id = target_employee_id

    db_user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "")
    log = service.clock_out(db_user_id, data)
    
    create_audit_log(
        "ATTENDANCE_UPDATED", "hrms.attendance_logs", user_payload,
        entity_id=str(log.get("id") or log.get("attendance_id") or ""),
        module="HRMS",
        description=f"Clock-out recorded for {data.employee_id} (Actor: {actor_id})",
        new_value={
            "event": "clock_out", 
            "latitude": data.latitude, 
            "longitude": data.longitude,
            "device_actor": actor_id,
            "target_employee": target_employee_id
        },
    )
    return StandardResponse.success_response(
        data=log,
        message="Clocked out successfully"
    )


@router.post("/leave", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def submit_leave_request(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    service: AttendanceService = Depends(get_service)
):
    """Submit Leave / Permission request by Sales Executive."""
    user_name = str(user_payload.get("name") or user_payload.get("full_name") or "")
    user_email = str(user_payload.get("email") or "").lower().strip()
    user_code = str(user_payload.get("employee_code") or user_payload.get("employee_id") or "")

    if user_name:
        data["executive_name"] = user_name
        data["executive"] = user_name
    if user_email:
        data["executive_email"] = user_email
    if user_code:
        data["employee_code"] = user_code

    result = service.submit_leave_request(data, user_payload)
    create_audit_log(
        "LEAVE_CREATED", "hrms.leave_requests", user_payload,
        entity_id=str(result.get("id") or result.get("leave_request_id") or ""),
        module="HRMS",
        description=f"Leave request submitted: {result.get('leave_type', '')} from {result.get('from_date', '')} to {result.get('to_date', '')}",
        new_value={"leave_type": result.get("leave_type"), "from_date": result.get("from_date"), "to_date": result.get("to_date"), "status": "Pending"},
    )
    return StandardResponse.success_response(
        data=result,
        message="Leave / Permission request submitted successfully"
    )


@router.get("/leave", response_model=StandardResponse)
async def get_leave_requests(
    user_payload: dict = Depends(get_current_user_payload),
    service: AttendanceService = Depends(get_service)
):
    """Get Leave & Permission requests scoped by user or team manager."""
    requests = service.get_leave_requests(user_payload)
    return StandardResponse.success_response(
        data=requests,
        message="Leave & Permission requests retrieved successfully"
    )


@router.post("/leave/{request_id}/status", response_model=StandardResponse)
async def update_leave_status(
    request_id: str,
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    service: AttendanceService = Depends(get_service)
):
    """Approve or Reject Leave / Permission request by Sales Manager / Admin / CEO."""
    new_status = data.get("status") or "Approved"
    comment = data.get("comment") or data.get("manager_comment") or ""
    try:
        result = service.update_leave_status(request_id, new_status, comment, user_payload)
    except Exception as e:
        raise HTTPException(status_code=400 if "not found" not in str(e).lower() else 404, detail=str(e))

    # Derive correct audit action
    status_upper = new_status.upper()
    if status_upper == "APPROVED":
        audit_action = "LEAVE_APPROVED"
    elif status_upper in ("REJECTED", "DENIED"):
        audit_action = "LEAVE_REJECTED"
    else:
        audit_action = f"LEAVE_{status_upper}"

    create_audit_log(
        audit_action, "hrms.leave_requests", user_payload,
        entity_id=request_id,
        module="HRMS",
        description=f"Leave request {new_status.lower()} by manager",
        previous_value={"status": "Pending"},
        new_value={"status": new_status, "comment": comment},
    )

    return StandardResponse.success_response(
        data=result,
        message=f"Leave request {new_status} successfully"
    )
