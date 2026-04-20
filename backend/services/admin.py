from django.contrib import admin
from django.utils.html import format_html
from .models import Service, AddOn, Coupon
from django.utils import timezone


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'base_price', 'per_day_price', 'order', 'enabled', 'website')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'name',
                'slug',
                'description',
                'long_description',
                'image',
                'order',
                'website',
                'enabled',
            )
        }),
        ('Pricing', {
            'fields': (
                ('base_price', 'per_day_price'),
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

@admin.register(AddOn)
class AddOnAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'active', 'get_description')
    search_fields = ('name', 'description')
    
    def get_description(self, obj):
        return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
    get_description.short_description = 'Description'

    fieldsets = (
        ('Add-on Information', {
            'fields': (
                'name',
                'price',
                'description',
                'active',
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

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    def valid_from_display(self, obj):
        return timezone.localtime(obj.valid_from).strftime('%d %b %Y %H:%M')
    valid_from_display.short_description = 'Valid From'
    valid_from_display.admin_order_field = 'valid_from'

    def valid_to_display(self, obj):
        return timezone.localtime(obj.valid_to).strftime('%d %b %Y %H:%M') if not obj.lifetime else 'Lifetime'
    valid_to_display.short_description = 'Valid To'
    valid_to_display.admin_order_field = 'valid_to'
    list_display = ('id', 'code', 'discount_percent', 'active', 'valid_from_display', 
                   'valid_to_display', 'usage_count', 'is_currently_valid')
    list_filter = ('active', 'valid_from', 'valid_to', 'lifetime')
    search_fields = ('code',)
    
    def usage_count(self, obj):
        return f"{obj.times_used}/{obj.max_uses}"
    usage_count.short_description = 'Usage Count'

    def is_currently_valid(self, obj):
        is_valid = obj.is_valid()
        icon = 'yes' if is_valid else 'no'
        color = 'green' if is_valid else 'red'
        return format_html('<img src="/static/admin/img/icon-{}.svg" alt="{}" style="color: {};">', 
                         icon, 'Valid' if is_valid else 'Invalid', color)
    is_currently_valid.short_description = 'Valid'

    fieldsets = (
        ('Coupon Information', {
            'fields': (
                'code',
                'discount_percent',
                'active',
            )
        }),
        ('Validity Period', {
            'fields': (
                ('valid_from', 'valid_to'),
                ('valid_from_display', 'valid_to_display', 'lifetime'),
            )
        }),
        ('Usage Limits', {
            'fields': (
                ('max_uses', 'times_used'),
                'minimum_order_value',
            )
        }),
    )
    
    readonly_fields = ('times_used','valid_from_display', 'valid_to_display')

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