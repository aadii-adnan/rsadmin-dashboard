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
from django.contrib.admin.filters import DateFieldListFilter
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta
import io
import zipfile
from django.http import HttpResponse
from payments.views import generate_invoice, generate_booking_form_pdf


class CustomDateFieldListFilter(DateFieldListFilter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Get tomorrow's date in the local timezone
        today = timezone.localtime().date()
        tomorrow = today + timedelta(days=1)

        # Convert to list so we can insert
        links = list(self.links)

        # Insert "Tomorrow" after "Today"
        links.insert(1, (
            _('Tomorrow'),
            {
                self.field.name + '__gte': timezone.make_aware(datetime.combine(tomorrow, datetime.min.time())),
                self.field.name + '__lt': timezone.make_aware(datetime.combine(tomorrow + timedelta(days=1), datetime.min.time())),
            }
        ))

        # Assign back to self.links
        self.links = tuple(links)

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    def price_display(self, obj):
        if obj.discounted_price is not None and obj.discounted_price < obj.total_price:
            return format_html(
                '<span style="text-decoration: line-through; color: #888;">€{}</span><br>'
                '<span style="color: #28a745; font-weight: bold;">€{}</span>',
                obj.total_price, obj.discounted_price
            )
        return f"€{obj.total_price}"

    price_display.short_description = 'Total Price'

    def download_invoices_zip(self, request, queryset):
        zip_buffer = io.BytesIO()
        today = timezone.now().strftime('%d-%m-%Y')
        with zipfile.ZipFile(zip_buffer, "w") as zip_file:
            for booking in queryset:
                response, error = generate_invoice(booking)
                if error:
                    continue
                pdf_bytes = response.content
                filename = f"Invoice-{booking.booking_id or booking.id}.pdf"
                zip_file.writestr(filename, pdf_bytes)
        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="invoices_{today}.zip"'
        return response

    download_invoices_zip.short_description = "Download invoices for selected bookings (ZIP)"

    def download_booking_forms_zip(self, request, queryset):
        zip_buffer = io.BytesIO()
        today = timezone.now().strftime('%d-%m-%Y')
        with zipfile.ZipFile(zip_buffer, "w") as zip_file:
            for booking in queryset:
                response, error = generate_booking_form_pdf(booking)
                if error:
                    continue
                pdf_bytes = response.content
                filename = f"BookingForm-{booking.booking_id or booking.id}.pdf"
                zip_file.writestr(filename, pdf_bytes)
        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="booking_forms_{today}.zip"'
        return response

    download_booking_forms_zip.short_description = "Download booking forms for selected bookings (ZIP)"

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

    def number(self, obj):  # Change method name from 'id' to 'number'
        return obj.id
    number.short_description = 'No'
    number.admin_order_field = 'id'

    def departure_time_display(self, obj):
        return timezone.localtime(obj.departure_time).strftime('%d %b %Y %H:%M')
    departure_time_display.admin_order_field = 'departure_time'
    departure_time_display.short_description = 'Departure Time'

    def return_time_display(self, obj):
        return timezone.localtime(obj.return_time).strftime('%d %b %Y %H:%M')
    return_time_display.admin_order_field = 'return_time'
    return_time_display.short_description = 'Return Time'

    def created_at_display(self, obj):
        return timezone.localtime(obj.created_at).strftime('%d %b %Y %H:%M')
    created_at_display.admin_order_field = 'created_at'
    created_at_display.short_description = 'Created At'

    def created_at_field(self, obj):
        return timezone.localtime(obj.created_at).strftime('%d %b %Y %H:%M')
    created_at_field.short_description = 'Created At'

    def modified_at_field(self, obj):
        return timezone.localtime(obj.modified_at).strftime('%d %b %Y %H:%M')
    modified_at_field.short_description = 'Modified At'

    def get_list_display(self, request):
        if request.user.is_manager:
            return ('number', 'booking_id', 'full_name', 'service', 'departure_time_display', 'return_time_display', 'colored_status', 'created_at_display', 'download_booking_form')
        return ('number', 'booking_id', 'full_name', 'service', 'departure_time_display', 'return_time_display', 
                'price_display', 'colored_status', 'created_at_display', 'download_invoice', 'download_booking_form')
    

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
        status_fields = ['status', 'note']
        if obj:
            # For existing bookings, show the formatted display
            status_fields.extend([('created_at_field', 'modified_at_field')])
        else:
            # For new bookings, show the editable field
            status_fields.extend(['created_at'])

        if not request.user.is_manager:
            status_fields.append('download_invoice')
        status_fields.append('download_booking_form')
        
        base_fieldsets.append(('Booking Status', {
            'fields': tuple(status_fields)
        }))

        return base_fieldsets
    
    list_filter = ('status', 'service', 'created_at', ('departure_time', CustomDateFieldListFilter),)
    search_fields = ('first_name', 'last_name', 'email', 'car_registration_no', 'contact_no')

    def get_readonly_fields(self, request, obj=None):
        if obj:  # If editing existing object
            return ('modified_at_field', 'download_invoice', 'download_booking_form', 'created_at_field')
        return ('modified_at_field', 'download_invoice', 'download_booking_form')
    
    list_per_page = 20 
    show_full_result_count = True  # Shows total number of items
    

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Customer Name'

    def download_invoice(self, obj):
        if obj.id:  # Only show the link if the object exists
            url = reverse('invoice-download', args=[obj.id])
            return format_html(
                '<a class="button" href="javascript:void(0)" onclick="printInvoice(\'{}\'); return false;">'
                '<img src="/static/admin/img/icon-yes.svg" alt="Print Invoice"> Print Invoice</a>',
                url
            )
        return '-'  # Return a dash if object doesn't exist yet

    download_invoice.short_description = 'Invoice'
    download_invoice.allow_tags = True

    def download_booking_form(self, obj):
        if obj.id:  # Only show the link if the object exists
            url = reverse('booking-form-download', args=[obj.id])
            return format_html(
                '<a class="button" href="javascript:void(0)" onclick="printBookingForm(\'{}\'); return false;">'
                '<img src="/static/admin/img/icon-yes.svg" alt="Print Form"> Booking Form</a>',
                url
            )
        return '-'  # Return a dash if object doesn't exist yet

    download_booking_form.short_description = 'Download Booking Form'
    download_booking_form.allow_tags = True


    actions = ['export_as_csv', 'download_invoices_zip', 'download_booking_forms_zip']

    def get_actions(self, request):
        actions = super().get_actions(request)
        if request.user.is_manager:
            # Remove the download_invoices_zip action for managers
            actions.pop('download_invoices_zip', None)
        return actions

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
            'ID', 'Service', 'Add-ons', 'Car Registration No', 'Car Model',
            'Car Colour', 'Car Manufacturer', 'Departure Terminal', 'Return Terminal',
            'Departure Flight Number', 'Return Flight Number', 'First Name', 'Last Name',
            'Email', 'Contact No', 'Total Passengers', 'Departure Time', 'Return Time',
            'Status', 'Created At', 'Modified At'
        ]

        # Exclude price-related fields if the admin is a manager
        if not request.user.is_manager:
            headers.extend(['Total Price', 'Coupon', 'Discounted Price'])

        # Write the header row
        writer.writerow(headers)

        # Write data rows
        for booking in queryset:
            row = [
                booking.booking_id,
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
        js = ('admin/js/print_invoice.js','admin/js/clickable_rows_bookings.js',)