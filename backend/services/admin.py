from django.contrib import admin
from django.utils.html import format_html
from .models import Service, AddOn, Coupon

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'base_price', 'per_day_price', 'is_featured')
    list_filter = ('is_featured',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'name',
                'slug',
                'description',
                'long_description',
            )
        }),
        ('Pricing', {
            'fields': (
                ('base_price', 'per_day_price'),
            )
        }),
        ('Display Options', {
            'fields': ('is_featured',),
        }),
    )

    def has_module_permission(self, request):
        """
        Restrict access to the Payment model for managers.
        """
        if request.user.is_manager:
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)

@admin.register(AddOn)
class AddOnAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'get_description')
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
            )
        }),
    )

    def has_module_permission(self, request):
        """
        Restrict access to the Payment model for managers.
        """
        if request.user.is_manager:
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('id', 'code', 'discount_percent', 'active', 'valid_from', 
                   'valid_to', 'usage_count', 'is_currently_valid')
    list_filter = ('active', 'valid_from', 'valid_to')
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
            )
        }),
        ('Usage Limits', {
            'fields': (
                ('max_uses', 'times_used'),
            )
        }),
    )
    
    readonly_fields = ('times_used',)

    def has_module_permission(self, request):
        """
        Restrict access to the Payment model for managers.
        """
        if request.user.is_manager:
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)