from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.HiddenField(default=serializers.CurrentUserDefault())
    reporter_username = serializers.CharField(source="reporter.username", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter",
            "reporter_username",
            "target_type",
            "review",
            "product",
            "store",
            "reason",
            "description",
            "status",
            "handled_by",
            "handled_at",
            "resolution_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "handled_by",
            "handled_at",
            "resolution_note",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        target_type = attrs.get("target_type")
        review = attrs.get("review")
        product = attrs.get("product")
        store = attrs.get("store")

        targets = {"review": review, "product": product, "store": store}
        set_targets = [k for k, v in targets.items() if v is not None]

        if len(set_targets) != 1:
            raise serializers.ValidationError(
                "Нужно указать ровно один из targets: review/product/store."
            )
        if target_type not in targets:
            raise serializers.ValidationError("Некорректный target_type.")
        if targets[target_type] is None:
            raise serializers.ValidationError(
                f"Для target_type='{target_type}' нужно заполнить поле '{target_type}'."
            )
        return attrs


class ReportModerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "status",
            "resolution_note",
        ]

