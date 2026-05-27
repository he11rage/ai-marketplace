from rest_framework.pagination import PageNumberPagination


class OptionalPageNumberPagination(PageNumberPagination):
    """Paginate only when the client passes ?page= (catalog, home infinite scroll)."""

    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 48

    def paginate_queryset(self, queryset, request, view=None):
        if 'page' not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
