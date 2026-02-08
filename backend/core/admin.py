from django.contrib import admin
from .models import BookingSettings, OrderLimit, UnsubscribedEmail, MarketingLead
# Register your models here.

@admin.register(BookingSettings)
class BookingSettingsAdmin(admin.ModelAdmin):   
    list_display = ('id', 'min_hours_before_booking', 'manager_emails', 'dublin_manager_emails')
    search_fields = ('min_hours_before_booking', 'manager_emails')
    list_filter = ('min_hours_before_booking', 'manager_emails')

    def has_module_permission(self, request):
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
    
@admin.register(OrderLimit)
class OrderLimitAdmin(admin.ModelAdmin):

    def has_module_permission(self, request):
        user = request.user
        if user.is_authenticated and getattr(user, "is_manager", False):
            return False
        if user.is_authenticated and getattr(user, "is_supplier", False):
            return False
        return super().has_module_permission(request)
    
    list_display = ('id', 'date', 'service', 'max_orders')
    search_fields = ('date', 'service__name')
    list_filter = ('date', 'service')
    ordering = ('-date',)
    
    
    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)

@admin.register(UnsubscribedEmail)
class UnsubscribedEmailAdmin(admin.ModelAdmin):
    list_display = ('email', 'unsubscribed_at')
    search_fields = ('email',)

    def has_module_permission(self, request):
        user = request.user
        if user.is_authenticated and getattr(user, "is_supplier", False):
            return False
        if user.is_authenticated and getattr(user, "is_manager", False):
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)

@admin.register(MarketingLead)
class MarketingLeadAdmin(admin.ModelAdmin):
    list_display = ('email', 'discount_code', 'subscribed', 'created_at')
    search_fields = ('email', 'discount_code')
    list_filter = ('subscribed', 'created_at')

    def has_module_permission(self, request):
        user = request.user
        if user.is_authenticated and getattr(user, "is_supplier", False):
            return False
        if user.is_authenticated and getattr(user, "is_manager", False):
            return False
        return super().has_module_permission(request)