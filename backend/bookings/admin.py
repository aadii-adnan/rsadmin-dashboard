from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    def colored_status(self, obj):
        status_colors = {
            'completed': '#28a745',  # green
            'pending': '#ffc107',    # yellow
            'cancelled': '#dc3545',  # red
            'payment failed': '#dc3545',  # red
            'rescheduled': '#fd7e14' # orange
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

    def get_list_display(self, request):
        if request.user.is_manager:
            return ('id', 'full_name', 'service', 'departure_time', 'return_time', 
                    'total_price', 'colored_status', 'created_at', 'download_booking_form')
        return ('id', 'full_name', 'service', 'departure_time', 'return_time', 
                'total_price', 'colored_status', 'created_at', 'download_invoice', 'download_booking_form')
    

    def get_fieldsets(self, request, obj=None):
        base_fieldsets = [
            ('Customer Information', {
                'fields': (
                    ('first_name', 'last_name'),
                    ('email', 'contact_no'),
                    'total_passengers'
                )
            }),
            ('Vehicle Details', {
                'fields': (
                    ('car_registration_no', 'car_model'),
                    ('car_manufacturer', 'car_colour')
                )
            }),
            ('Travel Information', {
                'fields': (
                    ('departure_terminal', 'return_terminal'),
                    ('departure_flight_number', 'return_flight_number'),
                    ('departure_time', 'return_time')
                )
            }),
            ('Service & Add-ons', {
                'fields': (
                    'service',
                    'add_ons',
                )
            }),
            ('Pricing', {
                'fields': (
                    ('total_price', 'coupon', 'discounted_price'),
                )
            })
        ]

        # Add status section with appropriate fields based on user type
        status_fields = ['status', ('created_at', 'modified_at')]
        if not request.user.is_manager:
            status_fields.append('download_invoice')
        status_fields.append('download_booking_form')
        
        base_fieldsets.append(('Booking Status', {
            'fields': tuple(status_fields)
        }))

        return base_fieldsets
    
    list_filter = ('status', 'service', 'created_at', 'departure_time')
    search_fields = ('first_name', 'last_name', 'email', 'car_registration_no', 'contact_no')
    readonly_fields = ('created_at', 'modified_at', 'download_invoice', 'download_booking_form')
    list_per_page = 10 
    show_full_result_count = True  # Shows total number of items
    list_max_show_all = 200
    

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Customer Name'

    def download_invoice(self, obj):
        if obj.status and obj.status.name.lower() == 'completed':
            url = reverse('invoice-download', args=[obj.id])
            return format_html(
                '<a class="button" href="javascript:void(0)" onclick="printInvoice(\'{}\'); return false;">'
                '<img src="/static/admin/img/icon-yes.svg" alt="Print Invoice"> Print Invoice</a>',
                url
            )
        return "-"
    download_invoice.short_description = 'Invoice'
    download_invoice.allow_tags = True

    def download_booking_form(self, obj):
        if obj.status and obj.status.name.lower() == 'completed':
            url = reverse('booking-form-download', args=[obj.id])
            return format_html(
                '<a class="button" href="javascript:void(0)" onclick="printBookingForm(\'{}\'); return false;">'
                '<img src="/static/admin/img/icon-yes.svg" alt="Print Form"> Booking Form</a>',
                url
            )
        return "-"
    download_booking_form.short_description = 'Download Booking Form'  # Fixed attribute name
    download_booking_form.allow_tags = True

    class Media:
        css = {
            'all': ('admin/css/custom_admin.css','admin/css/clickable_rows.css',)
        }
        js = ('admin/js/print_invoice.js','admin/js/clickable_rows.js',)