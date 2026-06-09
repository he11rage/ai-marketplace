from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from api.products.models import Product

class Order(models.Model):
    """Customer order."""
    STATUS_CREATED = 'created'
    STATUS_AWAITING_PAYMENT = 'awaiting_payment'
    STATUS_PAID = 'paid'
    STATUS_PROCESSING = 'processing'
    STATUS_SHIPPED = 'shipped'
    STATUS_DELIVERED = 'delivered'
    STATUS_CANCELLED = 'cancelled'
    STATUS_REFUNDED = 'refunded'

    STATUS_CHOICES = [
        (STATUS_CREATED, 'Created'),
        (STATUS_AWAITING_PAYMENT, 'Awaiting Payment'),
        (STATUS_PAID, 'Paid'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_SHIPPED, 'Shipped'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_REFUNDED, 'Refunded'),
    ]

    # Order statuses that count toward store/product sales metrics.
    SALES_COUNT_STATUSES = (
        STATUS_PAID,
        STATUS_PROCESSING,
        STATUS_SHIPPED,
        STATUS_DELIVERED,
    )

    ALLOWED_STATUS_TRANSITIONS = {
        STATUS_CREATED: {STATUS_AWAITING_PAYMENT, STATUS_PAID, STATUS_CANCELLED},
        STATUS_AWAITING_PAYMENT: {STATUS_PAID, STATUS_CANCELLED},
        STATUS_PAID: {STATUS_PROCESSING, STATUS_REFUNDED},
        STATUS_PROCESSING: {STATUS_SHIPPED},
        STATUS_SHIPPED: {STATUS_DELIVERED},
        STATUS_DELIVERED: set(),
        STATUS_CANCELLED: set(),
        STATUS_REFUNDED: set(),
    }

    PAYMENT_CHOICES = [
        ('card', 'Bank Card'),
        ('sbp', 'SBP'),
        ('cash', 'Cash on Delivery'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_CREATED)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES, default='card')
    yookassa_payment_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    delivery_address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'

    def __str__(self):
        return f"Order #{self.id} by {self.buyer.username}"

    @classmethod
    def is_status_transition_allowed(cls, current_status, target_status, allow_same=True):
        if current_status == target_status:
            return allow_same
        return target_status in cls.ALLOWED_STATUS_TRANSITIONS.get(current_status, set())

    @staticmethod
    def status_transition_error(current_status, target_status):
        return f"Недопустимый переход статуса: {current_status} -> {target_status}."

    def can_transition_to(self, target_status, allow_same=True):
        return self.is_status_transition_allowed(self.status, target_status, allow_same=allow_same)

    def transition_to(self, target_status):
        if not self.can_transition_to(target_status, allow_same=False):
            raise ValidationError({'status': self.status_transition_error(self.status, target_status)})
        self.status = target_status

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            previous_status = type(self).objects.filter(pk=self.pk).values_list('status', flat=True).first()
            if (
                previous_status is not None
                and previous_status != self.status
                and not self.is_status_transition_allowed(previous_status, self.status)
            ):
                raise ValidationError({'status': self.status_transition_error(previous_status, self.status)})

        super().save(*args, **kwargs)

class OrderItem(models.Model):
    """Single order line item."""
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='order_items'
    )
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Unit price at purchase time.

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"
