"""
Phase 2B Dedicated Tracking WebSockets Implementation with Redis State & Pub/Sub.

ARCHITECTURAL OVERVIEW FOR PHASE 2B:
- Primary Real-time Transport: Executive WebSocket -> Redis Hash/GEO -> Redis Pub/Sub -> Manager WebSocket.
- Fallback Transport: In-process ConnectionManager broadcasting + Supabase Realtime Broadcast.
- Zero PostgreSQL Writes in the critical WebSocket receive/broadcast path.
- Redis failure fails-open gracefully back to in-process memory broadcasting.
"""

import json
import logging
import asyncio
import time
from typing import Dict, Set, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.security import verify_supabase_jwt
from app.core.logger import logger
from app.core.redis import RedisClient

ws_router = APIRouter(prefix="/spatial/ws/tracking", tags=["Spatial WebSockets Phase 2B"])


class TrackingConnectionManager:
    """
    In-process Phase 2A/2B WebSocket Connection Manager.
    Manages direct WebSocket connections and provides local fallback broadcasting.
    """
    def __init__(self):
        # Executive WebSocket connections mapped by employee_id: Dict[str, Set[WebSocket]]
        self.executive_connections: Dict[str, Set[WebSocket]] = {}
        # Manager WebSocket connections: Set[WebSocket]
        self.manager_connections: Set[WebSocket] = set()
        # In-memory last-known telemetry per employee (Fallback cache)
        self.active_locations_cache: Dict[str, Dict[str, Any]] = {}

    async def connect_executive(self, websocket: WebSocket, emp_id: str):
        await websocket.accept()
        if emp_id not in self.executive_connections:
            self.executive_connections[emp_id] = set()
        self.executive_connections[emp_id].add(websocket)
        logger.info(f"[WS Phase 2B] Executive connected: {emp_id} (total sockets: {len(self.executive_connections[emp_id])})")

    def disconnect_executive(self, websocket: WebSocket, emp_id: str):
        if emp_id in self.executive_connections:
            self.executive_connections[emp_id].discard(websocket)
            if not self.executive_connections[emp_id]:
                del self.executive_connections[emp_id]
        logger.info(f"[WS Phase 2B] Executive disconnected: {emp_id}")

    async def connect_manager(self, websocket: WebSocket):
        await websocket.accept()
        self.manager_connections.add(websocket)
        logger.info(f"[WS Phase 2B] Manager connected (total managers: {len(self.manager_connections)})")
        
        # 1. Primary Initial State: Try fetching from Redis Hashes/GEO
        redis_locations = await RedisClient.get_all_active_locations()
        if redis_locations:
            initial_payload = {
                "type": "initial_state",
                "locations": redis_locations,
                "source": "redis",
                "sent_at": int(time.time() * 1000)
            }
            try:
                await websocket.send_text(json.dumps(initial_payload))
                return
            except Exception as e:
                logger.warning(f"[WS Phase 2B] Failed to send Redis initial state to manager: {e}")

        # 2. Fallback Initial State: In-process cache
        if self.active_locations_cache:
            initial_payload = {
                "type": "initial_state",
                "locations": list(self.active_locations_cache.values()),
                "source": "in_memory_fallback",
                "sent_at": int(time.time() * 1000)
            }
            try:
                await websocket.send_text(json.dumps(initial_payload))
            except Exception as e:
                logger.warning(f"[WS Phase 2B] Failed to send fallback initial state to manager: {e}")

    def disconnect_manager(self, websocket: WebSocket):
        self.manager_connections.discard(websocket)
        logger.info(f"[WS Phase 2B] Manager disconnected (total managers: {len(self.manager_connections)})")

    async def broadcast_location_update_fallback(self, payload: Dict[str, Any]):
        """
        Local in-process fallback broadcast if Redis is unreachable.
        """
        emp_id = str(payload.get("employee_id") or payload.get("employee_code") or "").strip()
        if emp_id:
            self.active_locations_cache[emp_id] = payload

        if not self.manager_connections:
            return

        message_str = json.dumps({
            "type": "location_update",
            "payload": payload,
            "t5_mgr_ws_receive": int(time.time() * 1000)
        })

        disconnected_managers = set()
        for manager_ws in list(self.manager_connections):
            try:
                await manager_ws.send_text(message_str)
            except Exception as e:
                logger.warning(f"[WS Phase 2B] Error sending fallback to manager socket: {e}")
                disconnected_managers.add(manager_ws)

        for stale_ws in disconnected_managers:
            self.disconnect_manager(stale_ws)


manager = TrackingConnectionManager()


async def start_redis_pubsub_listener(websocket: WebSocket, manager_user_payload: Dict[str, Any]):
    """
    Subscribes to Redis Pub/Sub channel `tracking:live` for the lifetime of a Manager WebSocket connection.
    Forwards incoming location updates to the Manager WebSocket over TCP.
    """
    try:
        client = await RedisClient.get_client()
        if not client:
            logger.warning("[WS Phase 2B] Redis client unavailable for Manager Pub/Sub listener.")
            return

        pubsub = client.pubsub()
        await pubsub.subscribe("tracking:live")
        logger.info("[WS Phase 2B] Manager Redis Pub/Sub listener subscribed to 'tracking:live'")

        async for message in pubsub.listen():
            if message["type"] == "message":
                raw_data = message["data"]
                t5_receive = int(time.time() * 1000)
                try:
                    event_obj = json.loads(raw_data)
                    if isinstance(event_obj, dict):
                        # Ensure outer type field exists
                        if "type" not in event_obj and "event" in event_obj:
                            event_obj["type"] = event_obj["event"]
                        
                        # Add receive timestamp for benchmark measurement
                        if "payload" in event_obj and isinstance(event_obj["payload"], dict):
                            event_obj["payload"]["t5_mgr_ws_receive"] = t5_receive
                        event_obj["t5_mgr_ws_receive"] = t5_receive
                        
                        await websocket.send_text(json.dumps(event_obj))
                except WebSocketDisconnect:
                    break
                except Exception as err:
                    logger.warning(f"[WS Phase 2B] Error forwarding Redis Pub/Sub message to manager: {err}")
                    break

        await pubsub.unsubscribe("tracking:live")
        await client.aclose()
    except Exception as e:
        logger.warning(f"[WS Phase 2B] Redis Pub/Sub loop stopped: {e}")


@ws_router.websocket("/executive")
async def websocket_executive_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for Sales Executives streaming live GPS location telemetry.
    Validates JWT token from query parameter `?token=...`.
    Updates Redis Hash state, Redis GEO index, and publishes to Redis Pub/Sub `tracking:live`.
    """
    auth_token = token or websocket.query_params.get("token") or websocket.query_params.get("access_token")

    if not auth_token:
        logger.warning("[WS Phase 2B] Executive WebSocket rejected: Token missing")
        await websocket.close(code=4001, reason="Authentication token missing")
        return

    try:
        payload = verify_supabase_jwt(auth_token)
        emp_id = (
            payload.get("employee_id")
            or payload.get("user_metadata", {}).get("employee_code")
            or payload.get("sub")
            or payload.get("email")
            or "unknown_exec"
        )
    except Exception as err:
        logger.warning(f"[WS Phase 2B] Executive WebSocket rejected: Invalid JWT token ({err})")
        await websocket.close(code=4002, reason="Invalid authentication token")
        return

    await manager.connect_executive(websocket, emp_id)

    try:
        while True:
            data_text = await websocket.receive_text()
            t2_receive = int(time.time() * 1000)
            
            try:
                msg = json.loads(data_text)
            except Exception:
                continue

            msg_type = msg.get("type") or msg.get("event")
            if msg_type in ("location_update", "location", "ping"):
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": t2_receive}))
                    continue

                # Extract and validate fields
                loc_data = msg.get("payload") if "payload" in msg else msg
                lat = loc_data.get("latitude") or loc_data.get("lat")
                lng = loc_data.get("longitude") or loc_data.get("lng")
                accuracy = loc_data.get("accuracy")

                if lat is None or lng is None:
                    continue
                try:
                    lat_f = float(lat)
                    lng_f = float(lng)
                except (ValueError, TypeError):
                    continue

                if accuracy is not None and float(accuracy) > 200:
                    logger.debug(f"[WS Phase 2B] Rejecting fix with accuracy {accuracy}m for {emp_id}")
                    continue

                telemetry_payload = {
                    "id": loc_data.get("id") or f"ws_{t2_receive}",
                    "employee_id": loc_data.get("employee_id") or emp_id,
                    "employee_code": loc_data.get("employee_code") or payload.get("user_metadata", {}).get("employee_code") or emp_id,
                    "latitude": lat_f,
                    "longitude": lng_f,
                    "accuracy": float(accuracy) if accuracy is not None else 10.0,
                    "speed": loc_data.get("speed"),
                    "heading": loc_data.get("heading"),
                    "recorded_at": loc_data.get("recorded_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "t1_watch": loc_data.get("t1_watch") or loc_data.get("broadcast_sent_at"),
                    "t2_ws_send": loc_data.get("t2_ws_send") or loc_data.get("t2_broadcast") or t2_receive,
                    "t3_ws_server_receive": t2_receive
                }

                # 1. Update Redis Hash, Redis GEO, and Publish to Redis Pub/Sub (CRITICAL PATH: < 5ms)
                redis_ok = await RedisClient.set_executive_location(telemetry_payload)

                # 2. Local In-Process Fallback Broadcast if Redis fails or for single worker
                await manager.broadcast_location_update_fallback(telemetry_payload)

    except WebSocketDisconnect:
        manager.disconnect_executive(websocket, emp_id)
        # Mark offline in Redis on disconnect
        asyncio.create_task(RedisClient.mark_executive_offline(emp_id))
    except Exception as e:
        logger.warning(f"[WS Phase 2B] Executive WebSocket loop error for {emp_id}: {e}")
        manager.disconnect_executive(websocket, emp_id)


@ws_router.websocket("/manager")
async def websocket_manager_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for Managers to receive direct real-time GPS streams via Redis Pub/Sub.
    Validates JWT token from query parameter `?token=...`.
    """
    auth_token = token or websocket.query_params.get("token") or websocket.query_params.get("access_token")

    if not auth_token:
        logger.warning("[WS Phase 2B] Manager WebSocket rejected: Token missing")
        await websocket.close(code=4001, reason="Authentication token missing")
        return

    try:
        manager_user_payload = verify_supabase_jwt(auth_token)
    except Exception as err:
        logger.warning(f"[WS Phase 2B] Manager WebSocket rejected: Invalid JWT token ({err})")
        await websocket.close(code=4002, reason="Invalid authentication token")
        return

    await manager.connect_manager(websocket)

    # Spawn background task listening on Redis Pub/Sub channel `tracking:live`
    pubsub_task = asyncio.create_task(start_redis_pubsub_listener(websocket, manager_user_payload))

    try:
        while True:
            # Keep-alive heartbeat listener
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": int(time.time() * 1000)}))
            except Exception:
                pass
    except WebSocketDisconnect:
        pubsub_task.cancel()
        manager.disconnect_manager(websocket)
    except Exception as e:
        logger.warning(f"[WS Phase 2B] Manager WebSocket error: {e}")
        pubsub_task.cancel()
        manager.disconnect_manager(websocket)
