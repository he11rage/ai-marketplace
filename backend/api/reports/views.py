from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Report
from .serializers import ReportSerializer


def _is_moderator(user) -> bool:
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (getattr(user, "is_staff", False) or getattr(user, "is_admin", False))
    )


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related(
        "reporter",
        "review",
        "product",
        "store",
        "handled_by",
    ).order_by("-created_at")
    serializer_class = ReportSerializer

    def get_permissions(self):
        if self.action in {"create"}:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = getattr(self.request, "user", None)
        if _is_moderator(user):
            qs = self.queryset
        else:
            qs = self.queryset.filter(reporter_id=user.id)

        status_filter = self.request.query_params.get("status")
        if status_filter in {Report.STATUS_OPEN, Report.STATUS_RESOLVED, Report.STATUS_REJECTED}:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_update(self, serializer):
        # Only moderators can change report status/resolution.
        if not _is_moderator(self.request.user):
            raise PermissionDenied("Недостаточно прав.")
        serializer.save(
            handled_by=self.request.user,
            handled_at=timezone.now(),
        )

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        if not _is_moderator(request.user):
            raise PermissionDenied("Недостаточно прав.")
        report = self.get_object()
        note = (request.data or {}).get("note", "") or ""
        report.status = Report.STATUS_RESOLVED
        report.resolution_note = note
        report.handled_by = request.user
        report.handled_at = timezone.now()
        report.save(update_fields=["status", "resolution_note", "handled_by", "handled_at", "updated_at"])
        return Response(ReportSerializer(report, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        if not _is_moderator(request.user):
            raise PermissionDenied("Недостаточно прав.")
        report = self.get_object()
        note = (request.data or {}).get("note", "") or ""
        report.status = Report.STATUS_REJECTED
        report.resolution_note = note
        report.handled_by = request.user
        report.handled_at = timezone.now()
        report.save(update_fields=["status", "resolution_note", "handled_by", "handled_at", "updated_at"])
        return Response(ReportSerializer(report, context={"request": request}).data)

