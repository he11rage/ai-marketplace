from django.conf import settings
from django.db import models


class AdminActionLog(models.Model):
    """
    Minimal audit log for moderation/admin actions.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="admin_action_logs",
    )
    action = models.CharField(max_length=80, db_index=True)
    object_type = models.CharField(max_length=80, db_index=True)
    object_id = models.CharField(max_length=64, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user_agent = models.TextField(blank=True, default="")
    request_method = models.CharField(max_length=10, blank=True, default="")
    request_path = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "admin_action_logs"
        ordering = ["-created_at"]
        verbose_name = "Admin action log"
        verbose_name_plural = "Admin action logs"

    def __str__(self):
        return f"{self.created_at} {self.actor_id} {self.action} {self.object_type}:{self.object_id}"

