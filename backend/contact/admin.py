from django.contrib import admin
from .models import ContactMessage
from django.utils import timezone

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    def timestamp_display(self, obj):
        return timezone.localtime(obj.timestamp).strftime('%d %b %Y %H:%M')        
    timestamp_display.short_description = 'Timestamp'
    timestamp_display.admin_order_field = 'timestamp' 

    list_display = ('id', 'first_name', 'last_name', 'email', 'phone', 'website', 'timestamp_display')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    list_filter = ('timestamp',)
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp_display',)

    def get_fieldsets(self, request, obj=None):
        fieldsets = [
            (None, {
                'fields': ('first_name', 'last_name', 'email', 'phone', 'message', 'website', 'timestamp_display')
            }),
        ]
        return fieldsets

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

