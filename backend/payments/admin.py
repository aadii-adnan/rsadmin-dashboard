from django.contrib import admin
from .models import Payment
from django.utils.html import format_html
from django.utils import timezone

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    def colored_status(self, obj):
        status_colors = {
            'succeeded': '#28a745',  # green
            'pending': '#ffc107',    # yellow
            'failed': '#dc3545',  # red
            'refunded': '#fd7e14' # orange
        }
        
        if obj.status:
            status_name = obj.status.name.lower()
            color = status_colors.get(status_name, 'inherit')
            return format_html(
                '<span style="background-color: {}; color: #fff; padding: 4px 8px; '
                'border-radius: 4px; font-weight: bold;">{}</span>',
                color, obj.status.name
            )
        return '-'
    colored_status.short_description = 'Status'

    def created_at_display(self, obj):
        return timezone.localtime(obj.created_at).strftime('%d %b %Y %H:%M')
    created_at_display.short_description = 'Created At'
    created_at_display.admin_order_field = 'created_at'

    list_display = ('id', 'booking', 'amount', 'colored_status', 'created_at_display')
    list_filter = ('status', 'created_at')
    search_fields = ('booking__first_name', 'booking__last_name', 'booking__email')
    readonly_fields = ('created_at_display',)

    fieldsets = (
        ('Payment Information', {
            'fields': (
                ('booking', 'amount'),
                ('status','stripe_payment_intent', 'status_message'),
            )
        }),
        ('Timestamps', {
            'fields': (
                ('created_at_display', ),
            )
        }),
    )

    def has_module_permission(self, request):
        """
        Restrict access for managers and suppliers.
        """
        user = request.user
        if user.is_authenticated and getattr(user, "is_manager", False):
            return False
        if user.is_authenticated and getattr(user, "is_supplier", False):
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)