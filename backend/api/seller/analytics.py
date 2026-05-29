from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.db.models import DecimalField, ExpressionWrapper
from django.utils import timezone

from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.reviews.models import Review
from api.stores.models import Store

CONFIRMED_ORDER_STATUSES = [
    Order.STATUS_PAID,
    Order.STATUS_PROCESSING,
    Order.STATUS_SHIPPED,
    Order.STATUS_DELIVERED,
]

DEFAULT_LOW_STOCK_THRESHOLD = 5
SALES_CHART_DAYS = 14

REVENUE_EXPR = ExpressionWrapper(
    F("quantity") * F("price"),
    output_field=DecimalField(max_digits=14, decimal_places=2),
)


def _parse_store_id(raw):
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _parse_threshold(raw):
    if raw in (None, ""):
        return DEFAULT_LOW_STOCK_THRESHOLD
    try:
        value = int(raw)
        return max(0, value)
    except (TypeError, ValueError):
        return DEFAULT_LOW_STOCK_THRESHOLD


def seller_stores_qs(user, store_id=None):
    qs = Store.objects.filter(owner=user)
    if store_id is not None:
        qs = qs.filter(id=store_id)
    return qs


def seller_order_items_qs(user, store_id=None):
    qs = OrderItem.objects.filter(
        order__status__in=CONFIRMED_ORDER_STATUSES,
        product__store__owner=user,
    )
    if store_id is not None:
        qs = qs.filter(product__store_id=store_id)
    return qs


def seller_products_qs(user, store_id=None):
    qs = Product.objects.filter(store__owner=user).select_related("store", "category")
    if store_id is not None:
        qs = qs.filter(store_id=store_id)
    return qs


def _revenue_sum(qs):
    total = qs.aggregate(total=Sum(REVENUE_EXPR)).get("total")
    return total or Decimal("0.00")


def _week_growth_percent(current, previous):
    current = Decimal(current or 0)
    previous = Decimal(previous or 0)
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return float(((current - previous) / previous) * 100)


def build_sales_overview(user, store_id=None):
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    base_qs = seller_order_items_qs(user, store_id)

    total_revenue = _revenue_sum(base_qs)
    revenue_this_week = _revenue_sum(base_qs.filter(order__created_at__gte=week_ago))
    revenue_previous_week = _revenue_sum(
        base_qs.filter(
            order__created_at__gte=two_weeks_ago,
            order__created_at__lt=week_ago,
        )
    )

    orders_qs = (
        Order.objects.filter(
            status__in=CONFIRMED_ORDER_STATUSES,
            items__product__store__owner=user,
        )
        .distinct()
    )
    if store_id is not None:
        orders_qs = orders_qs.filter(items__product__store_id=store_id).distinct()

    orders_total = orders_qs.count()
    orders_this_week = orders_qs.filter(created_at__gte=week_ago).count()

    units_sold = base_qs.aggregate(total=Sum("quantity")).get("total") or 0

    chart_start = now - timedelta(days=SALES_CHART_DAYS - 1)
    daily_rows = (
        base_qs.filter(order__created_at__gte=chart_start)
        .annotate(day=TruncDate("order__created_at"))
        .values("day")
        .annotate(revenue=Sum(REVENUE_EXPR), units=Sum("quantity"))
        .order_by("day")
    )
    daily_map = {
        row["day"].isoformat(): {
            "revenue": str(row["revenue"] or Decimal("0.00")),
            "units": int(row["units"] or 0),
        }
        for row in daily_rows
        if row["day"]
    }

    sales_by_day = []
    for offset in range(SALES_CHART_DAYS):
        day = (chart_start + timedelta(days=offset)).date()
        key = day.isoformat()
        point = daily_map.get(key, {"revenue": "0.00", "units": 0})
        sales_by_day.append({"date": key, **point})

    return {
        "total_revenue": str(total_revenue),
        "revenue_this_week": str(revenue_this_week),
        "revenue_previous_week": str(revenue_previous_week),
        "revenue_week_growth_percent": round(
            _week_growth_percent(revenue_this_week, revenue_previous_week), 1
        ),
        "orders_total": orders_total,
        "orders_this_week": orders_this_week,
        "units_sold": int(units_sold),
        "sales_by_day": sales_by_day,
        "low_stock_threshold": DEFAULT_LOW_STOCK_THRESHOLD,
    }


def build_products_analytics(user, store_id=None, limit=10):
    try:
        limit = max(1, min(int(limit), 50))
    except (TypeError, ValueError):
        limit = 10

    rows = (
        seller_order_items_qs(user, store_id)
        .values("product_id", "product__name", "product__store__name", "product__status")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum(REVENUE_EXPR),
        )
        .order_by("-revenue")[:limit]
    )

    products = []
    for row in rows:
        products.append(
            {
                "product_id": row["product_id"],
                "name": row["product__name"],
                "store_name": row["product__store__name"],
                "status": row["product__status"],
                "units_sold": int(row["units_sold"] or 0),
                "revenue": str(row["revenue"] or Decimal("0.00")),
            }
        )

    catalog = seller_products_qs(user, store_id)
    status_counts = {
        row["status"]: row["count"]
        for row in catalog.values("status").annotate(count=Count("id"))
    }

    return {
        "top_by_revenue": products,
        "catalog_summary": {
            "total": catalog.count(),
            "active": status_counts.get(Product.STATUS_ACTIVE, 0),
            "draft": status_counts.get(Product.STATUS_DRAFT, 0),
            "pending_moderation": status_counts.get(Product.STATUS_PENDING_MODERATION, 0),
            "archived": status_counts.get(Product.STATUS_ARCHIVED, 0),
            "rejected": status_counts.get(Product.STATUS_REJECTED, 0),
            "blocked": status_counts.get(Product.STATUS_BLOCKED, 0),
        },
    }


def build_low_stock(user, store_id=None, threshold=DEFAULT_LOW_STOCK_THRESHOLD):
    qs = (
        seller_products_qs(user, store_id)
        .filter(
            stock_quantity__lt=threshold,
            status__in={
                Product.STATUS_ACTIVE,
                Product.STATUS_DRAFT,
                Product.STATUS_PENDING_MODERATION,
            },
        )
        .order_by("stock_quantity", "name")
    )

    items = [
        {
            "id": p.id,
            "name": p.name,
            "store_id": p.store_id,
            "store_name": p.store.name,
            "stock_quantity": p.stock_quantity,
            "status": p.status,
            "price": str(p.price),
            "image": p.image.url if p.image else None,
        }
        for p in qs[:100]
    ]

    return {
        "threshold": threshold,
        "count": qs.count(),
        "items": items,
    }


def _compute_quality_score(store, metrics):
    score = 50.0

    if store.status == Store.STATUS_ACTIVE:
        score += 15
    elif store.status == Store.STATUS_LIMITED:
        score -= 15
    elif store.status in {Store.STATUS_BLOCKED, Store.STATUS_REJECTED}:
        score -= 40
    elif store.status == Store.STATUS_PENDING_MODERATION:
        score -= 5

    if store.is_verified:
        score += 10

    rating = float(store.rating_effective or 0)
    if rating >= 4.5:
        score += 15
    elif rating >= 4.0:
        score += 8
    elif rating > 0 and rating < 3.5:
        score -= 10

    if metrics["rejected_products"] > 0:
        score -= min(15, metrics["rejected_products"] * 5)

    if metrics["low_stock_products"] > 3:
        score -= 10
    elif metrics["low_stock_products"] > 0:
        score -= 5

    if metrics["pending_reviews"] > 5:
        score -= 5

    return max(0, min(100, round(score)))


def build_store_quality(user, store_id=None):
    stores = list(seller_stores_qs(user, store_id))
    threshold = DEFAULT_LOW_STOCK_THRESHOLD
    result = []

    for store in stores:
        products = Product.objects.filter(store=store)
        active_count = products.filter(status=Product.STATUS_ACTIVE).count()
        pending_products = products.filter(status=Product.STATUS_PENDING_MODERATION).count()
        rejected_products = products.filter(status=Product.STATUS_REJECTED).count()
        low_stock = products.filter(
            stock_quantity__lt=threshold,
            status=Product.STATUS_ACTIVE,
        ).count()

        reviews_qs = Review.objects.filter(product__store=store)
        pending_reviews = reviews_qs.filter(status=Review.STATUS_PENDING_MODERATION).count()
        approved_reviews = reviews_qs.filter(status=Review.STATUS_APPROVED).count()

        metrics = {
            "active_products": active_count,
            "pending_moderation_products": pending_products,
            "rejected_products": rejected_products,
            "low_stock_products": low_stock,
            "pending_reviews": pending_reviews,
            "approved_reviews": approved_reviews,
        }

        quality_score = _compute_quality_score(store, metrics)

        result.append(
            {
                "store_id": store.id,
                "store_name": store.name,
                "store_status": store.status,
                "is_verified": store.is_verified,
                "rating": str(store.rating_effective),
                "review_count": store.review_count,
                "moderation_reason": store.moderation_reason or "",
                "quality_score": quality_score,
                "metrics": metrics,
            }
        )

    return {"stores": result}
