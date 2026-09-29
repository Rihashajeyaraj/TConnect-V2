"""
Phase 3 Asynchronous Location History Persistence Worker.

ARCHITECTURE:
1. Executive GPS fixes update Redis Hash, GEO, Pub/Sub, and push to Redis List `tracking:history:queue`.
2. This background worker pops batches from `tracking:history:queue`.
3. Flushes accumulated batches to PostgreSQL `hrms.tracking_locations` in configurable bulk inserts.
4. Updates `hrms.employee_locations` for current position display.
5. On PostgreSQL failure, requeues batch items with exponential backoff retry.
6. ZERO blocking on live WebSocket movement paths.
"""

import os
import json
import asyncio
import time
import logging
from typing import List, Dict, Any
from app.core.redis import RedisClient
from app.core.logger import logger
from app.database.supabase import get_supabase_client

# Configurable settings
HISTORY_BATCH_SIZE = int(os.getenv("HISTORY_BATCH_SIZE", "50"))
HISTORY_FLUSH_INTERVAL_MS = int(os.getenv("HISTORY_FLUSH_INTERVAL_MS", "1000"))
MAX_QUEUE_THRESHOLD = int(os.getenv("MAX_QUEUE_THRESHOLD", "10000"))

class HistoryWorkerMetrics:
    def __init__(self):
        self.total_events_queued = 0
        self.total_events_persisted = 0
        self.total_batches_success = 0
        self.total_batches_failed = 0
        self.retry_count = 0
        self.last_flush_duration_ms = 0
        self.last_flush_time = 0

metrics = HistoryWorkerMetrics()

class HistoryPersistenceWorker:
    def __init__(self):
        self.is_running = False
        self._task: asyncio.Task = None
        self.seen_event_ids = set() # LRU dedup set

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._worker_loop())
        logger.info(f"[History Worker Phase 3] Background worker started (BatchSize={HISTORY_BATCH_SIZE}, Interval={HISTORY_FLUSH_INTERVAL_MS}ms)")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        # Final flush before shutdown
        await self._flush_once()
        logger.info("[History Worker Phase 3] Background worker stopped gracefully.")

    async def _worker_loop(self):
        backoff_sec = 1.0
        while self.is_running:
            try:
                flushed = await self._flush_once()
                if flushed > 0:
                    backoff_sec = 1.0
                    await asyncio.sleep(HISTORY_FLUSH_INTERVAL_MS / 1000.0)
                else:
                    await asyncio.sleep(0.5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                metrics.retry_count += 1
                logger.warning(f"[History Worker Phase 3] Worker loop error: {e}. Retrying in {backoff_sec}s...")
                await asyncio.sleep(backoff_sec)
                backoff_sec = min(backoff_sec * 2, 30.0)

    async def _flush_once(self) -> int:
        queue_len = await RedisClient.get_history_queue_length()
        if queue_len == 0:
            return 0

        # Safety backpressure warning
        if queue_len > MAX_QUEUE_THRESHOLD:
            logger.warning(f"[History Worker Phase 3] High queue length warning: {queue_len} items backlogged!")

        batch = await RedisClient.pop_history_batch(batch_size=HISTORY_BATCH_SIZE)
        if not batch:
            return 0

        t_start = time.time()
        pg_records = []
        emp_latest_map = {}

        for item in batch:
            evt_id = item.get("location_event_id")
            # Deduplicate retried items
            if evt_id and evt_id in self.seen_event_ids:
                continue
            if evt_id:
                self.seen_event_ids.add(evt_id)
                # Keep dedup set bounded
                if len(self.seen_event_ids) > 20000:
                    self.seen_event_ids.clear()

            emp_id = str(item.get("employee_id") or "").strip()
            if not emp_id:
                continue

            rec = {
                "employee_id": emp_id,
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "accuracy": item.get("accuracy"),
                "speed": item.get("speed"),
                "heading": item.get("heading"),
                "recorded_at": item.get("recorded_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            if item.get("tracking_session_id"):
                rec["tracking_session_id"] = item.get("tracking_session_id")

            pg_records.append(rec)
            emp_latest_map[emp_id] = rec

        if not pg_records:
            return 0

        # Perform Bulk PostgreSQL Insert via Supabase Client
        try:
            sp_client = get_supabase_client()
            if sp_client:
                def _do_db_flush():
                    sp_client.schema("hrms").table("tracking_locations").insert(pg_records).execute()
                    for emp_id, latest in emp_latest_map.items():
                        try:
                            sp_client.schema("hrms").table("employee_locations").upsert({
                                "employee_id": emp_id,
                                "latitude": latest["latitude"],
                                "longitude": latest["longitude"],
                                "updated_at": latest["recorded_at"],
                                "is_online": True
                            }, on_conflict="employee_id").execute()
                        except Exception:
                            pass

                await asyncio.to_thread(_do_db_flush)

                t_dur_ms = round((time.time() - t_start) * 1000, 2)
                metrics.total_events_persisted += len(pg_records)
                metrics.total_batches_success += 1
                metrics.last_flush_duration_ms = t_dur_ms
                metrics.last_flush_time = time.time()

                logger.info(f"[History Worker Phase 3] Flushed batch of {len(pg_records)} records to PostgreSQL in {t_dur_ms}ms (Total persisted: {metrics.total_events_persisted})")
                return len(pg_records)
            else:
                raise Exception("Supabase client instance unavailable")
        except Exception as err:
            metrics.total_batches_failed += 1
            metrics.retry_count += 1
            logger.warning(f"[History Worker Phase 3] PostgreSQL batch insert failed ({err}). Requeuing {len(batch)} items...")
            await RedisClient.requeue_history_batch(batch)
            raise err


history_worker = HistoryPersistenceWorker()
