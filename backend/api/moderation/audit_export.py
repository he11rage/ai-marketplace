from __future__ import annotations

import json
from datetime import datetime, timedelta

from django.utils import timezone

from .models import AdminActionLog
from .serializers import AdminActionLogSerializer

DEFAULT_EXPORT_DAYS = 30
MAX_EXPORT_DAYS = 365
MAX_EXPORT_ROWS = 10_000


def format_audit_export_filename(dt: datetime | None = None) -> str:
    dt = timezone.localtime(dt or timezone.now())
    return dt.strftime("Экспорт журнала аудита от %d.%m.%Y %H-%M-%S.txt")


def build_audit_export(*, days: int) -> tuple[str, str, dict]:
    """
    Build audit export body (.txt with JSON) for browser download.
    Returns (content, filename, metadata).
    """
    if days < 1:
        raise ValueError("days must be >= 1")
    if days > MAX_EXPORT_DAYS:
        raise ValueError(f"days must be <= {MAX_EXPORT_DAYS}")

    since = timezone.now() - timedelta(days=days)
    qs = (
        AdminActionLog.objects.select_related("actor")
        .filter(created_at__gte=since)
        .order_by("-created_at")[:MAX_EXPORT_ROWS]
    )
    entries = AdminActionLogSerializer(qs, many=True).data

    payload = {
        "exported_at": timezone.now().isoformat(),
        "period_days": days,
        "since": since.isoformat(),
        "count": len(entries),
        "truncated": len(entries) >= MAX_EXPORT_ROWS,
        "entries": entries,
    }

    content = json.dumps(payload, ensure_ascii=False, indent=2)
    filename = format_audit_export_filename()
    meta = {
        "filename": filename,
        "count": len(entries),
        "days": days,
        "truncated": payload["truncated"],
    }
    return content, filename, meta
