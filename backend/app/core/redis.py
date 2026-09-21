import os
import json
import logging
import time
from typing import Optional, Dict, Any, List
import redis.asyncio as aioredis
from app.core.logger import logger

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class RedisClient:
    """
    Centralized, resilient Redis Client with connection pooling and graceful error handling.
    Uses a persistent shared client so connections are reused across async operations in sub-milliseconds.
    Fails open gracefully if Redis is temporarily unreachable.
    """
    _client: Optional[aioredis.Redis] = None

    @classmethod
    async def get_client(cls) -> Optional[aioredis.Redis]:
        if cls._client is None:
            try:
                logger.info(f"[Redis Core] Initializing shared persistent Redis client ({REDIS_URL})")
                cls._client = aioredis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    max_connections=50,
                    socket_timeout=5.0,
                    socket_connect_timeout=5.0,
                    retry_on_timeout=True
                )
            except Exception as e:
                logger.warning(f"[Redis Core] Failed to instantiate Redis client: {e}")
                return None
        return cls._client

    @classmethod
    async def ping(cls) -> bool:
        try:
            client = await cls.get_client()
            if client:
                res = await client.ping()
                return bool(res)
        except Exception as e:
            logger.warning(f"[Redis Core] Ping check failed: {e}")
        return False

    @classmethod
    async def set_executive_location(cls, telemetry: Dict[str, Any]) -> bool:
        """
        Updates Redis Hash, Redis GEO index, Publishes to Pub/Sub `tracking:live`,
        and pushes to Redis List `tracking:history:queue` for asynchronous PostgreSQL batch persistence.
        CRITICAL PATH: Must complete in < 5ms.
        """
        emp_id = str(telemetry.get("employee_id") or telemetry.get("employee_code") or "").strip()
        if not emp_id:
            return False

        lat = telemetry.get("latitude")
        lng = telemetry.get("longitude")

        hash_key = f"executive:location:{emp_id}"
        geo_key = "active_executives"
        pubsub_channel = "tracking:live"
        history_queue = "tracking:history:queue"

        now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        hash_payload = {
            "employee_id": emp_id,
            "employee_code": str(telemetry.get("employee_code") or emp_id),
            "latitude": str(lat) if lat is not None else "",
            "longitude": str(lng) if lng is not None else "",
            "accuracy": str(telemetry.get("accuracy") or 10.0),
            "speed": str(telemetry.get("speed") or 0.0),
            "heading": str(telemetry.get("heading") or 0.0),
            "timestamp": str(telemetry.get("timestamp") or telemetry.get("recorded_at") or now_str),
            "session_id": str(telemetry.get("session_id") or telemetry.get("tracking_session_id") or ""),
            "online": "true"
        }

        history_payload = {
            "location_event_id": str(telemetry.get("id") or f"evt_{emp_id}_{int(time.time()*1000)}"),
            "tracking_session_id": telemetry.get("session_id") or telemetry.get("tracking_session_id"),
            "employee_id": emp_id,
            "latitude": float(lat) if lat is not None else 0.0,
            "longitude": float(lng) if lng is not None else 0.0,
            "accuracy": float(telemetry.get("accuracy")) if telemetry.get("accuracy") is not None else 10.0,
            "speed": float(telemetry.get("speed")) if telemetry.get("speed") is not None else None,
            "heading": float(telemetry.get("heading")) if telemetry.get("heading") is not None else None,
            "recorded_at": telemetry.get("recorded_at") or telemetry.get("timestamp") or now_str,
            "created_at": now_str
        }

        try:
            client = await cls.get_client()
            if not client:
                return False

            async with client.pipeline(transaction=True) as pipe:
                # 1. Update latest location Hash
                pipe.hset(hash_key, mapping=hash_payload)
                
                # 2. Update GEO spatial index if coordinates are valid
                if lat is not None and lng is not None:
                    try:
                        lat_f, lng_f = float(lat), float(lng)
                        pipe.geoadd(geo_key, (lng_f, lat_f, emp_id))
                    except (ValueError, TypeError):
                        pass
                
                # 3. Publish Pub/Sub live event
                event_payload = {
                    "event": "location_update",
                    "payload": telemetry,
                    "t4_redis_pub_time": int(time.time() * 1000)
                }
                pipe.publish(pubsub_channel, json.dumps(event_payload))

                # 4. Push to Redis History Queue for async PostgreSQL batch worker
                pipe.rpush(history_queue, json.dumps(history_payload))
                
                await pipe.execute()
                return True
        except Exception as e:
            logger.warning(f"[Redis Core] Failed to set executive location in Redis for {emp_id}: {e}")
            return False

    @classmethod
    async def pop_history_batch(cls, batch_size: int = 50) -> List[Dict[str, Any]]:
        """
        Pops up to `batch_size` items from `tracking:history:queue`.
        """
        items = []
        try:
            client = await cls.get_client()
            if not client:
                return items

            try:
                raw_items = await client.lpop("tracking:history:queue", count=batch_size)
                if raw_items:
                    if isinstance(raw_items, str):
                        raw_items = [raw_items]
                    for raw in raw_items:
                        try:
                            items.append(json.loads(raw))
                        except Exception:
                            pass
            except Exception:
                for _ in range(batch_size):
                    raw = await client.lpop("tracking:history:queue")
                    if not raw:
                        break
                    try:
                        items.append(json.loads(raw))
                    except Exception:
                        pass

        except Exception as e:
            logger.warning(f"[Redis Core] Error popping history batch: {e}")
        return items

    @classmethod
    async def requeue_history_batch(cls, items: List[Dict[str, Any]]) -> bool:
        """
        Re-pushes failed history records back to `tracking:history:queue` for retry.
        """
        if not items:
            return True
        try:
            client = await cls.get_client()
            if not client:
                return False

            history_queue = "tracking:history:queue"
            raw_items = [json.dumps(item) for item in items]
            await client.rpush(history_queue, *raw_items)
            return True
        except Exception as e:
            logger.warning(f"[Redis Core] Error requeuing failed history items: {e}")
            return False

    @classmethod
    async def get_history_queue_length(cls) -> int:
        """Returns length of `tracking:history:queue`."""
        try:
            client = await cls.get_client()
            if not client:
                return 0
            length = await client.llen("tracking:history:queue")
            return int(length)
        except Exception:
            return 0

    @classmethod
    async def get_all_active_locations(cls) -> List[Dict[str, Any]]:
        """
        Retrieves current active location telemetry Hashes for all active executives.
        Used for initial manager Smart Map state load without querying PostgreSQL.
        """
        results = []
        try:
            client = await cls.get_client()
            if not client:
                return results

            keys = []
            async for k in client.scan_iter("executive:location:*"):
                keys.append(k)

            for key in keys:
                h_data = await client.hgetall(key)
                if h_data and h_data.get("online") == "true":
                    try:
                        h_data["latitude"] = float(h_data["latitude"]) if h_data.get("latitude") else None
                        h_data["longitude"] = float(h_data["longitude"]) if h_data.get("longitude") else None
                        h_data["accuracy"] = float(h_data["accuracy"]) if h_data.get("accuracy") else 10.0
                    except (ValueError, TypeError):
                        pass
                    results.append(h_data)

        except Exception as e:
            logger.warning(f"[Redis Core] Failed to fetch active locations from Redis: {e}")
        return results

    @classmethod
    async def mark_executive_offline(cls, emp_id: str) -> bool:
        """Explicitly sets offline status and removes executive from active_executives GEO index."""
        if not emp_id:
            return False
        try:
            client = await cls.get_client()
            if not client:
                return False

            hash_key = f"executive:location:{emp_id}"
            geo_key = "active_executives"

            async with client.pipeline(transaction=True) as pipe:
                pipe.hset(hash_key, "online", "false")
                pipe.zrem(geo_key, emp_id)
                pipe.publish("tracking:live", json.dumps({
                    "event": "executive_offline",
                    "employee_id": emp_id
                }))
                await pipe.execute()
                return True
        except Exception as e:
            logger.warning(f"[Redis Core] Failed to set executive offline in Redis for {emp_id}: {e}")
            return False
