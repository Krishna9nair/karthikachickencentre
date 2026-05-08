"""Admin push-notification helper.

Sends FCM push to every admin user's registered device(s) when something
interesting happens (new order, etc).

Set ONE of these env vars:
  - FIREBASE_SERVICE_ACCOUNT_JSON: full JSON of the service account, OR
  - FIREBASE_SERVICE_ACCOUNT_PATH: filesystem path to the JSON file.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_initialised = False
_fcm_disabled_reason: Optional[str] = None


def _ensure_initialised() -> bool:
    global _initialised, _fcm_disabled_reason
    if _initialised:
        return _fcm_disabled_reason is None
    _initialised = True
    try:
        import firebase_admin  # type: ignore
        from firebase_admin import credentials  # type: ignore
    except ImportError as e:
        _fcm_disabled_reason = f"firebase-admin not installed: {e}"
        logger.warning(_fcm_disabled_reason)
        return False
    if firebase_admin._apps:
        return True
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
    try:
        if raw:
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                _fcm_disabled_reason = "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON"
                logger.error(_fcm_disabled_reason)
                return False
            cred = credentials.Certificate(data)
        elif path and os.path.exists(path):
            cred = credentials.Certificate(path)
        else:
            _fcm_disabled_reason = "No FIREBASE_SERVICE_ACCOUNT_JSON set; admin push disabled."
            logger.warning(_fcm_disabled_reason)
            return False
        firebase_admin.initialize_app(cred)
        return True
    except Exception as e:
        _fcm_disabled_reason = f"firebase-admin init failed: {e}"
        logger.exception(_fcm_disabled_reason)
        return False


def is_enabled() -> bool:
    return _ensure_initialised()


def send_to_tokens(tokens: List[str], title: str, body: str,
                   data: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        "success_count": 0, "failure_count": 0,
        "invalid_tokens": [], "skipped": False, "reason": None,
    }
    if not tokens:
        summary["skipped"] = True
        summary["reason"] = "no tokens"
        return summary
    if not _ensure_initialised():
        summary["skipped"] = True
        summary["reason"] = _fcm_disabled_reason or "fcm not initialised"
        return summary
    try:
        from firebase_admin import messaging  # type: ignore
    except ImportError as e:
        summary["skipped"] = True
        summary["reason"] = f"messaging import failed: {e}"
        return summary
    CHUNK = 500
    str_data = {k: str(v) for k, v in (data or {}).items()}
    for i in range(0, len(tokens), CHUNK):
        batch = tokens[i:i + CHUNK]
        try:
            message = messaging.MulticastMessage(
                tokens=batch,
                notification=messaging.Notification(title=title, body=body),
                data=str_data,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default", channel_id="admin_orders"),
                ),
                apns=messaging.APNSConfig(payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", content_available=True))),
            )
            resp = messaging.send_each_for_multicast(message)
        except Exception as e:
            logger.exception("FCM send failed: %s", e)
            summary["failure_count"] += len(batch)
            continue
        summary["success_count"] += resp.success_count
        summary["failure_count"] += resp.failure_count
        for idx, r in enumerate(resp.responses):
            if not r.success and r.exception is not None:
                code = str(getattr(r.exception, "code", "") or "")
                if any(s in code for s in [
                    "registration-token-not-registered",
                    "invalid-argument",
                    "invalid-registration-token",
                ]):
                    summary["invalid_tokens"].append(batch[idx])
    return summary
