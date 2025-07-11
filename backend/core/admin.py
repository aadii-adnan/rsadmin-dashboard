from django.contrib import admin
from .models import BookingSettings, OrderLimit
# Register your models here.

@admin.register(BookingSettings)
class BookingSettingsAdmin(admin.ModelAdmin):   
    list_display = ('id', 'min_hours_before_booking', 'manager_emails')
    search_fields = ('min_hours_before_booking', 'manager_emails')
    list_filter = ('min_hours_before_booking', 'manager_emails')

    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)
    
@admin.register(OrderLimit)
class OrderLimitAdmin(admin.ModelAdmin):
    list_display = ('id', 'date', 'service', 'max_orders')
    search_fields = ('date', 'service__name')
    list_filter = ('date', 'service')
    ordering = ('-date',)
    
    
    class Media:
        css = {
            'all': ('admin/css/clickable_rows.css','admin/css/custom_admin.css',)
        }
        js = ('admin/js/clickable_rows.js',)

    