"""
TwiteConnect — Backend Web Push Service
========================================
Handles VAPID-authenticated server-to-device Web Push dispatch.

SECURITY NOTES:
- VAPID private key is loaded from environment only — never logged or returned to clients
- Each send failure is logged at WARNING level without exposing key material
- Expired / gone subscriptions are flagged for removal (caller decides to remove)
"""

from __future__ import annotations

import json
import os
import threading
from typing import Any, Dict, List, Optional

from app.core.logger import logger

from dotenv import load_dotenv
from app.core.config import settings, _env_path

load_dotenv(_env_path)

# ---------------------------------------------------------------------------
# VAPID configuration — loaded once at module import
# ---------------------------------------------------------------------------
_VAPID_PRIVATE_KEY: Optional[str] = os.getenv("VAPID_PRIVATE_KEY") or getattr(settings, "VAPID_PRIVATE_KEY", None)
_VAPID_PUBLIC_KEY:  Optional[str] = os.getenv("VAPID_PUBLIC_KEY")  or getattr(settings, "VAPID_PUBLIC_KEY", None)
_VAPID_EMAIL:       str           = os.getenv("VAPID_EMAIL")       or getattr(settings, "VAPID_EMAIL", "mailto:admin@twiteconnect.com")

_vapid_available: bool = bool(_VAPID_PRIVATE_KEY and _VAPID_PUBLIC_KEY)

if not _vapid_available:
    logger.warning(
        "[WebPush] VAPID_PRIVATE_KEY or VAPID_PUBLIC_KEY not configured. "
        "Background Web Push notifications will be skipped."
    )
else:
    logger.info("[WebPush] VAPID configuration loaded successfully.")


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def is_available() -> bool:
    """Return True if VAPID keys are configured and pywebpush is importable."""
    return _vapid_available


def get_public_key() -> Optional[str]:
    """Return the VAPID public key (safe to expose to clients)."""
    return _VAPID_PUBLIC_KEY


class PushResult:
    """Result of a single Web Push attempt."""
    __slots__ = ("success", "endpoint", "should_remove", "error")

    def __init__(self, success: bool, endpoint: str, should_remove: bool = False, error: str = ""):
        self.success = success
        self.endpoint = endpoint
        self.should_remove = should_remove   # True → caller should delete the subscription
        self.error = error


def send_web_push(
    subscription: Dict[str, Any],
    payload: Dict[str, Any],
) -> PushResult:
    """
    Send a single Web Push message to one device subscription.

    Parameters
    ----------
    subscription : dict
        Must contain 'endpoint', 'p256dh', and 'auth' keys (browser PushSubscription format).
    payload : dict
        JSON-serializable dict to deliver. Should include at minimum:
        { "type": "...", "title": "...", "body": "...", "unread_count": N }

    Returns
    -------
    PushResult — call .success / .should_remove on the result.
    """
    if not _vapid_available:
        return PushResult(False, subscription.get("endpoint", ""), error="VAPID not configured")

    endpoint = subscription.get("endpoint", "")
    p256dh   = subscription.get("p256dh", "")
    auth     = subscription.get("auth", "")

    if not endpoint or not p256dh or not auth:
        return PushResult(False, endpoint, error="Invalid subscription — missing fields")

    try:
        from pywebpush import webpush, WebPushException  # noqa: PLC0415

        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {
                    "p256dh": p256dh,
                    "auth":   auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=_VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": _VAPID_EMAIL,
            },
        )
        logger.debug("[WebPush] Push delivered to endpoint: %s…", endpoint[:40])
        return PushResult(True, endpoint)

    except Exception as exc:  # noqa: BLE001
        # Determine if the subscription is permanently gone
        should_remove = False
        err_str = str(exc)

        try:
            from pywebpush import WebPushException  # noqa: PLC0415
            if isinstance(exc, WebPushException):
                status = getattr(exc, "response", None)
                if status is not None:
                    code = getattr(status, "status_code", None) or getattr(status, "status", None)
                    # 404 / 410 = subscription no longer valid (device unregistered)
                    if code in (404, 410):
                        should_remove = True
                        logger.info(
                            "[WebPush] Subscription gone (HTTP %s) — marked for removal: %s…",
                            code, endpoint[:40]
                        )
                    else:
                        logger.warning(
                            "[WebPush] Push failed (HTTP %s) for endpoint %s…: %s",
                            code, endpoint[:40], err_str[:200]
                        )
                else:
                    logger.warning("[WebPush] Push failed for endpoint %s…: %s", endpoint[:40], err_str[:200])
            else:
                logger.warning("[WebPush] Push error for endpoint %s…: %s", endpoint[:40], err_str[:200])
        except ImportError:
            logger.warning("[WebPush] Push error: %s", err_str[:200])

        return PushResult(False, endpoint, should_remove=should_remove, error=err_str[:200])


def send_push_to_subscriptions(
    subscriptions: List[Dict[str, Any]],
    payload: Dict[str, Any],
) -> List[str]:
    """
    Send push to a list of subscriptions for ONE user.

    Returns a list of endpoints that should be deleted (gone/expired subscriptions).
    Push failures do NOT raise — they are logged and the caller removes stale subs.
    """
    if not _vapid_available or not subscriptions:
        return []

    endpoints_to_remove: List[str] = []

    for sub in subscriptions:
        result = send_web_push(sub, payload)
        if result.should_remove:
            endpoints_to_remove.append(result.endpoint)

    return endpoints_to_remove


def send_push_to_subscriptions_async(
    subscriptions: List[Dict[str, Any]],
    payload: Dict[str, Any],
    on_remove: Optional[callable] = None,
) -> None:
    """
    Fire-and-forget Web Push dispatch in a daemon thread.
    Used so notification creation never blocks on push latency.

    Parameters
    ----------
    on_remove : optional callable(endpoints_to_remove: List[str])
        Called with the list of stale endpoints after dispatch completes.
    """
    if not _vapid_available or not subscriptions:
        return

    def _dispatch():
        to_remove = send_push_to_subscriptions(subscriptions, payload)
        if to_remove and callable(on_remove):
            try:
                on_remove(to_remove)
            except Exception as e:  # noqa: BLE001
                logger.warning("[WebPush] on_remove callback error: %s", e)

    t = threading.Thread(target=_dispatch, daemon=True, name="webpush-dispatch")
    t.start()
