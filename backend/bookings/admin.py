from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Booking
import csv
from django.utils import timezone
from django.contrib.admin import SimpleListFilter
from django.http import HttpResponse
from django.contrib.admin import DateFieldListFilter
from django.utils.translation import gettext_lazy as _
from datetime import datetime, timedelta






class DepartureTimeWithTomorrowFilter(DateFieldListFilter):
    def __init__(self, field, request, params, model, model_admin, field_path):
        super().__init__(field, request, params, model, model_admin, field_path)
        tomorrow_lookup = ('tomorrow', _('Tomorrow'))
        links = list(self.links)
        today_index = next((i for i, (val, _) in enumerate(links) if val == 'today'), None)
        if today_index is not None:
            links.insert(today_index + 1, tomorrow_lookup)
        else:
            links.append(tomorrow_lookup)
        self.links = tuple(links)

    def choices(self, changelist):
        for lookup, title in self.links:
            yield {
                'selected': self.value() == lookup,  # <-- FIXED HERE
                'query_string': changelist.get_query_string({self.field_generic: lookup}),
                'display': title,
            }

    def queryset(self, request, queryset):
        if self.value() == 'tomorrow':  # <-- FIXED HERE
            tomorrow = timezone.localdate() + timedelta(days=1)
            start = timezone.make_aware(datetime.combine(tomorrow, datetime.min.time()))
            end = timezone.make_aware(datetime.combine(tomorrow, datetime.max.time()))
            return queryset.filter(**{
                f"{self.field_path}__gte": start,
                f"{self.field_path}__lte": end,
            })
        return super().queryset(request, queryset)
    
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    def colored_status(self, obj):
        status_colors = {
            'completed': '#28a745',  # green
            'confirmed': '#ffc107',    # yellow
            'cancelled': '#dc3545',  # red
            'payment failed': '#dc3545',  # red
            'rescheduled': '#fd7e14', # orange
            'pending': 'gray' # orange
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
            return ('id', 'full_name', 'service', 'departure_time', 'return_time', 'colored_status', 'created_at', 'download_booking_form')
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
        ]

        if not request.user.is_manager:
            base_fieldsets.append(('Pricing', {
                'fields': (
                    ('total_price', 'coupon', 'discounted_price'),
                )
            }))

        # Add status section with appropriate fields based on user type
        status_fields = ['status', ('created_at', 'modified_at')]
        if not request.user.is_manager:
            status_fields.append('download_invoice')
        status_fields.append('download_booking_form')
        
        base_fieldsets.append(('Booking Status', {
            'fields': tuple(status_fields)
        }))

        return base_fieldsets
    
    list_filter = ('status', 'service', 'created_at', ('departure_time', DepartureTimeWithTomorrowFilter),)
    search_fields = ('first_name', 'last_name', 'email', 'car_registration_no', 'contact_no')
    readonly_fields = ('created_at', 'modified_at', 'download_invoice', 'download_booking_form')
    list_per_page = 10 
    show_full_result_count = True  # Shows total number of items
    list_max_show_all = 200
    

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Customer Name'

    def download_invoice(self, obj):
        url = reverse('invoice-download', args=[obj.id])
        return format_html(
            '<a class="button" href="javascript:void(0)" onclick="printInvoice(\'{}\'); return false;">'
            '<img src="/static/admin/img/icon-yes.svg" alt="Print Invoice"> Print Invoice</a>',
            url
        )

    download_invoice.short_description = 'Invoice'
    download_invoice.allow_tags = True

    def download_booking_form(self, obj):
        url = reverse('booking-form-download', args=[obj.id])
        return format_html(
            '<a class="button" href="javascript:void(0)" onclick="printBookingForm(\'{}\'); return false;">'
            '<img src="/static/admin/img/icon-yes.svg" alt="Print Form"> Booking Form</a>',
            url
        )

    download_booking_form.short_description = 'Download Booking Form'  # Fixed attribute name
    download_booking_form.allow_tags = True


    actions = ['export_as_csv']

    def export_as_csv(self, request, queryset):
        """
        Export selected bookings as a CSV file.
        Exclude price-related details if the admin is a manager.
        """
        # Create the HTTP response with the appropriate CSV headers
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="bookings.csv"'

        writer = csv.writer(response)

        # Define the header row
        headers = [
            'ID', 'User', 'Service', 'Add-ons', 'Car Registration No', 'Car Model',
            'Car Colour', 'Car Manufacturer', 'Departure Terminal', 'Return Terminal',
            'Departure Flight Number', 'Return Flight Number', 'First Name', 'Last Name',
            'Email', 'Contact No', 'Total Passengers', 'Departure Time', 'Return Time',
            'Status', 'Email Sent', 'Created At', 'Modified At'
        ]

        # Exclude price-related fields if the admin is a manager
        if not request.user.is_manager:
            headers.extend(['Total Price', 'Coupon', 'Discounted Price'])

        # Write the header row
        writer.writerow(headers)

        # Write data rows
        for booking in queryset:
            row = [
                booking.id,
                booking.user.username if booking.user else '',
                booking.service.name if booking.service else '',
                ', '.join([addon.name for addon in booking.add_ons.all()]),
                booking.car_registration_no,
                booking.car_model,
                booking.car_colour,
                booking.car_manufacturer,
                booking.departure_terminal,
                booking.return_terminal,
                booking.departure_flight_number,
                booking.return_flight_number,
                booking.first_name,
                booking.last_name,
                booking.email,
                booking.contact_no,
                booking.total_passengers,
                booking.departure_time,
                booking.return_time,
                booking.status.name if booking.status else '',
                'Yes' if booking.email_sent else 'No',
                booking.created_at,
                booking.modified_at,
            ]

            # Add price-related fields if the admin is not a manager
            if not request.user.is_manager:
                row.extend([
                    booking.total_price,
                    booking.coupon.code if booking.coupon else '',
                    booking.discounted_price,
                ])

            writer.writerow(row)

        return response

    export_as_csv.short_description = "Export Selected Bookings as CSV"


    class Media:
        css = {
            'all': ('admin/css/custom_admin.css','admin/css/clickable_rows.css',)
        }
        js = ('admin/js/print_invoice.js','admin/js/clickable_rows.js',)