from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Booking, BookingUser
from django.utils import timezone
from django.http import HttpResponse
from django.utils.translation import gettext_lazy as _
from datetime import datetime
from django.utils.translation import gettext_lazy as _
import io
import zipfile
from django.http import HttpResponse
from payments.views import generate_invoice, generate_booking_form_pdf
from django.contrib.admin import FieldListFilter
from django.db.models import Q
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from datetime import timedelta
from openpyxl.utils import get_column_letter
from openpyxl.cell.cell import MergedCell
from openpyxl.styles import Font, Alignment, PatternFill


class SingleDateFilter(FieldListFilter):
    template = 'admin/single_date_filter.html'

    def __init__(self, field, request, params, model, model_admin, field_path):
        self.field_path = field_path
        self.date_params = {
            'gte': f'{field_path}__gte',
            'lt': f'{field_path}__lt'
        }
        if 'departure_time' in field_path:
            field.verbose_name = 'Departure Date'
        elif 'return_time' in field_path:
            field.verbose_name = 'Return Date'
        elif 'created_at' in field_path:
            field.verbose_name = 'Created Date'
        super().__init__(field, request, params, model, model_admin, field_path)

    def expected_parameters(self):
        return [self.date_params['gte'], self.date_params['lt']]

    def queryset(self, request, queryset):
        # Get all date parameters
        departure_gte = request.GET.get('departure_time__gte')
        departure_lt = request.GET.get('departure_time__lt')
        return_gte = request.GET.get('return_time__gte')
        return_lt = request.GET.get('return_time__lt')
        created_gte = request.GET.get('created_at__gte')
        created_lt = request.GET.get('created_at__lt')
        
        q_objects = Q()

        # Handle departure date filter
        if departure_gte and departure_lt:
            try:
                start_date = datetime.strptime(departure_gte, '%Y-%m-%d')
                end_date = datetime.strptime(departure_lt, '%Y-%m-%d')
                start_datetime = timezone.make_aware(datetime.combine(start_date.date(), datetime.min.time()))
                end_datetime = timezone.make_aware(datetime.combine(end_date.date(), datetime.min.time()))
                q_objects |= Q(departure_time__gte=start_datetime, departure_time__lt=end_datetime)
            except (ValueError, TypeError) as e:
                print(f"Error in departure date filtering: {e}")

        # Handle return date filter
        if return_gte and return_lt:
            try:
                start_date = datetime.strptime(return_gte, '%Y-%m-%d')
                end_date = datetime.strptime(return_lt, '%Y-%m-%d')
                start_datetime = timezone.make_aware(datetime.combine(start_date.date(), datetime.min.time()))
                end_datetime = timezone.make_aware(datetime.combine(end_date.date(), datetime.min.time()))
                q_objects |= Q(return_time__gte=start_datetime, return_time__lt=end_datetime)
            except (ValueError, TypeError) as e:
                print(f"Error in return date filtering: {e}")

        # Handle created date filter
        if created_gte and created_lt:
            try:
                start_date = datetime.strptime(created_gte, '%Y-%m-%d')
                end_date = datetime.strptime(created_lt, '%Y-%m-%d')
                start_datetime = timezone.make_aware(datetime.combine(start_date.date(), datetime.min.time()))
                end_datetime = timezone.make_aware(datetime.combine(end_date.date(), datetime.min.time()))
                q_objects |= Q(created_at__gte=start_datetime, created_at__lt=end_datetime)
            except (ValueError, TypeError) as e:
                print(f"Error in created date filtering: {e}")

        # Apply the combined filters if any exist
        if q_objects:
            return queryset.filter(q_objects)
        return queryset

    def value(self):
        value = self.used_parameters.get(self.date_params['gte'])
        if isinstance(value, list):
            return value[0] if value else ''
        return value or ''

    def choices(self, changelist):
        yield {
            'selected': self.value() is None,
            'query_string': changelist.get_query_string(remove=self.expected_parameters()),
            'display': _('All')
        }
        if self.value():
            yield {
                'selected': True,
                'query_string': changelist.get_query_string(),
                'display': f'Selected Date: {self.value()}'
            }

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
            'completed': '#28a745',
            'confirmed': '#ffc107',
            'cancelled': '#dc3545',
            'payment failed': '#dc3545',
            'rescheduled': '#fd7e14',
            'pending': 'gray'
        }
        
        status_html = ''
        # Add NEW tag if booking hasn't been viewed
        if not obj.is_viewed:
            status_html += '<span style="background: linear-gradient(45deg, #ff6b6b, #ee0979); '\
                     'color: #fff; padding: 2px 8px; border-radius: 4px; '\
                     'margin-right: 5px; box-shadow: 0 2px 4px rgba(238,9,121,0.15); font-size: 1em; '\
                     'font-weight: bold;'\
                     'text-transform: uppercase; letter-spacing: 0.5px; position: absolute; margin-top: 30px; ">NEW</span>'
        
        if obj.status:
            status_name = obj.status.name.lower()
            color = status_colors.get(status_name, 'inherit')
            status_html += format_html(
                '<span style="background-color: {}; color: #fff; padding: 4px 8px; '
                'border-radius: 4px; font-weight: bold;">{}</span>',
                color, obj.status.name
            )
        return format_html(status_html) if status_html else '-'
    
    colored_status.short_description = 'Status'

    def change_view(self, request, object_id, form_url='', extra_context=None):
        # Mark the booking as viewed when opening its details
        obj = self.get_object(request, object_id)
        if obj and not obj.is_viewed:
            obj.is_viewed = True
            obj.save()
        return super().change_view(request, object_id, form_url, extra_context)

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
    
    list_filter = (('departure_time', SingleDateFilter), ('return_time', SingleDateFilter), ('created_at', SingleDateFilter), 'status', 'service',)
    search_fields = ('first_name', 'last_name', 'email', 'car_registration_no', 'contact_no', 'booking_id', 'id')

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
    
    def get_dynamic_filename(self, departure_date, return_date, created_date):
        parts = []
        dates = set()  # To track unique dates
        
        # Convert dates to datetime objects for better formatting
        if departure_date:
            dt = datetime.strptime(departure_date, '%Y-%m-%d')
            dates.add(dt)
            parts.append('Departures')
            
        if return_date:
            dt = datetime.strptime(return_date, '%Y-%m-%d')
            dates.add(dt)
            parts.append('Arrivals')
            
        if created_date:
            dt = datetime.strptime(created_date, '%Y-%m-%d')
            dates.add(dt)
            parts.append('Created')

        # If all dates are the same
        if len(dates) == 1:
            date_str = list(dates)[0].strftime('%d_%b_%Y')
            return f"{'_'.join(parts)}_{date_str}.xlsx"
        
        # If dates are different
        filename_parts = []
        if departure_date:
            dt = datetime.strptime(departure_date, '%Y-%m-%d')
            filename_parts.append(f"Departures_{dt.strftime('%d_%b')}")
        
        if return_date:
            dt = datetime.strptime(return_date, '%Y-%m-%d')
            filename_parts.append(f"Arrivals_{dt.strftime('%d_%b')}")
        
        if created_date:
            dt = datetime.strptime(created_date, '%Y-%m-%d')
            filename_parts.append(f"Created_{dt.strftime('%d_%b')}")
        
        return f"{'_'.join(filename_parts)}_{dt.strftime('%Y')}.xlsx"

    def export_as_csv(self, request, queryset):
        """
        Export bookings organized by active date filters
        """
        wb = Workbook()
        ws = wb.active
        
        # Get active filters
        departure_date = request.GET.get('departure_time__gte')
        return_date = request.GET.get('return_time__gte')
        created_date = request.GET.get('created_at__gte')

        # Define headers once
        headers = [
            'PRODUCT CODE','Booking Ref', 'Customer/Contact', 'Entry Date & Time', 'Return Date & Time', 'Vehicle/Registration',
            'Out Flight Number', 'In Flight Number', 'Add Onns'
        ]
        if not request.user.is_manager:
            headers.extend(['Cost'])

        current_row = 1  # Keep track of current row

        # Function to write section
        def write_section(title, filtered_queryset, start_row):
            # Write section title
            title_cell = ws.cell(row=start_row, column=1, value=title)
            title_cell.font = Font(bold=True, size=24, color="FFFFFF")  # White text
            title_cell.alignment = Alignment(
                vertical='center',     # Center vertically
                horizontal='center',     # Align text to left
               
            )
            title_cell.fill = PatternFill(
                start_color="000000",  # Black background
                end_color="000000",
                fill_type="solid"
            )
            
            # Merge cells for title (single row, full width)
            ws.merge_cells(start_row=start_row, start_column=1, 
                end_row=start_row, end_column=len(headers))
            
            # Fill merged cells with black background
            for col in range(1, len(headers) + 1):
                cell = ws.cell(row=start_row, column=col)
                cell.fill = PatternFill(
                    start_color="000000",
                    end_color="000000",
                    fill_type="solid"
                )
            
            # Set row height for better spacing
            ws.row_dimensions[start_row].height = 40 
    
            # Write headers (now starting 3 rows below title)
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=start_row + 1, column=col, value=header)
                cell.font = Font(bold=True)
                cell.alignment = Alignment(horizontal='center')
            
            # Write data
            for idx, booking in enumerate(filtered_queryset, start_row + 2):
                row_data = [
                    booking.service.name if booking.service else '',
                    booking.booking_id,                 
                    f'{booking.first_name} {booking.last_name} {booking.contact_no}',                
                    timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M'),
                    timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M'),
                    f'{booking.car_manufacturer} {booking.car_model} {booking.car_colour} {booking.car_registration_no}',
                    booking.departure_flight_number,
                    booking.return_flight_number,
                    ', '.join([addon.name for addon in booking.add_ons.all()]),
                ]
                
                if not request.user.is_manager:
                    row_data.extend([
                        booking.total_price if (booking.discounted_price is None or booking.discounted_price <= 0 ) else booking.discounted_price,
                    ])
                    
                for col, value in enumerate(row_data, 1):
                    cell = ws.cell(row=idx, column=col, value=value)
                    cell.alignment = Alignment(horizontal='left')
                    
            return start_row + filtered_queryset.count() + 4  # Return next available row

        def format_date_display(date_str):
            """Convert date string from YYYY-MM-DD to DD Mon"""
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return dt.strftime('%d %b')
        # Write sections based on active filters
        if departure_date:
            departure_qs = queryset.filter(
                departure_time__gte=timezone.make_aware(datetime.strptime(departure_date, '%Y-%m-%d')),
                departure_time__lt=timezone.make_aware(datetime.strptime(departure_date, '%Y-%m-%d') + timedelta(days=1))
            )
            if departure_qs.exists():
                current_row = write_section(f"Departures {format_date_display(departure_date)}", departure_qs, current_row)
                current_row += 1  # Add spacing between sections

        if return_date:
            return_qs = queryset.filter(
                return_time__gte=timezone.make_aware(datetime.strptime(return_date, '%Y-%m-%d')),
                return_time__lt=timezone.make_aware(datetime.strptime(return_date, '%Y-%m-%d') + timedelta(days=1))
            )
            if return_qs.exists():
                current_row = write_section(f"Returns {format_date_display(return_date)}", return_qs, current_row)
                current_row += 1

        if created_date:
            created_qs = queryset.filter(
                created_at__gte=timezone.make_aware(datetime.strptime(created_date, '%Y-%m-%d')),
                created_at__lt=timezone.make_aware(datetime.strptime(created_date, '%Y-%m-%d') + timedelta(days=1))
            )
            if created_qs.exists():
                current_row = write_section(f"Created {format_date_display(created_date)}", created_qs, current_row)

        # Auto-adjust column widths
        for col_idx in range(1, len(headers) + 1):
            max_length = 0
            column_letter = get_column_letter(col_idx)
            
            # Check all cells in column
            for row in ws.iter_rows(min_row=1, max_row=ws.max_row):
                cell = row[col_idx - 1]
                if isinstance(cell, MergedCell):
                    continue
                try:
                    if cell.value:
                        max_length = max(max_length, len(str(cell.value)))
                except:
                    pass
            
            # Set width if content was found
            if max_length > 0:
                ws.column_dimensions[column_letter].width = max_length + 2

        filename = self.get_dynamic_filename(departure_date, return_date, created_date)
        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        wb.save(response)
        return response

    export_as_csv.short_description = "Export Selected Bookings as Excel"


    class Media:
        css = {
            'all': ('admin/css/custom_admin.css','admin/css/clickable_rows.css',)
        }
        js = ('admin/js/print_invoice.js','admin/js/clickable_rows_bookings.js')

@admin.register(BookingUser)
class BookingUserAdmin(admin.ModelAdmin):
    def created_at_display(self, obj):
        return timezone.localtime(obj.created_at).strftime('%d %b %Y %H:%M')
    created_at_display.admin_order_field = 'created_at'
    created_at_display.short_description = 'Created At'

    list_display = ('id', 'first_name', 'last_name', 'email', 'booking_completion_status', 'created_at_display')
    search_fields = ('first_name', 'last_name', 'email', 'contact_no', 'booking_id')
    list_filter = ('booking_completion_status', 'created_at',)
    readonly_fields = ('created_at_display',)

    def get_fieldsets(self, request, obj=None):
        fieldsets = [
            (None, {
                'fields': ('first_name', 'last_name', 'email', 'contact_no', 'booking_completion_status')
            }),
            ('Created At', {
                'fields': ('created_at_display',)
            }),
        ]
        return fieldsets
    
    def has_module_permission(self, request):
        """
        Restrict access for managers.
        """
        user = request.user
        if user.is_authenticated and getattr(user, "is_manager", False):
            return False
        return super().has_module_permission(request)

    class Media:
        css = {
            'all': ('admin/css/custom_admin.css','admin/css/clickable_rows.css',)
        }
        js = ('admin/js/print_invoice.js','admin/js/clickable_rows.js')

