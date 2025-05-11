from django.contrib import admin
from .models import Payment
from django.utils.html import format_html

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

    list_display = ('id', 'booking', 'amount', 'colored_status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('booking__first_name', 'booking__last_name', 'booking__email')
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Payment Information', {
            'fields': (
                ('booking', 'amount'),
                ('status',),
            )
        }),
        ('Timestamps', {
            'fields': (
                ('created_at', ),
            )
        }),
    )

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)
