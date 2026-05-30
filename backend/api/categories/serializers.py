from rest_framework import serializers
from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "parent",
            "is_verified",
            "created_by",
        ]
        read_only_fields = ["slug", "created_by"]

    def _is_admin(self, request):
        user = getattr(request, "user", None)
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and (getattr(user, "is_admin", False) or getattr(user, "is_staff", False))
        )

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if not self._is_admin(request):
            fields["is_verified"].read_only = True
        return fields

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.method in ("PUT", "PATCH"):
            if not self._is_admin(request):
                forbidden = {"is_verified"} & set(self.initial_data.keys())
                if forbidden:
                    raise serializers.ValidationError(
                        {k: "Изменять это поле может только администратор." for k in sorted(forbidden)}
                    )
        return super().validate(attrs)
