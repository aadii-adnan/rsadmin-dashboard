import stripe
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from bookings.models import Booking
from bookings.booking_rules import (
    calculate_parking_days,
    compute_reschedule_pricing,
    parse_and_localize,
    validate_reschedule,
)
from .models import Payment, CreditTransaction
from django.shortcuts import get_object_or_404
from .serializers import PaymentSerializer, CreditTransactionSerializer
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from decouple import config
from django.template.loader import get_template
from xhtml2pdf import pisa
from django.conf import settings
from services.models import Service
from services.models import Coupon
import random
import string
from core.models import Status, BookingSettings
import base64
import os
from rest_framework.renderers import BaseRenderer
from django.core.mail import EmailMultiAlternatives, get_connection
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from datetime import timezone as tz, timedelta, time
from django.utils import timezone
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from decimal import Decimal
import pytz
import logging
import uuid
from users.views import _resolve_website

logger = logging.getLogger(__name__)
User = get_user_model()

# Credit top-up limits (euros) — enforced server-side, mirrored in the frontend UI
TOPUP_MIN = Decimal('5.00')
TOPUP_MAX = Decimal('1000.00')


def stripe_configuration_error_response():
    stripe_secret_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
    if stripe_secret_key:
        stripe.api_key = stripe_secret_key
        return None

    logger.error('STRIPE_SECRET_KEY is not configured; cannot create Stripe payment intent.')
    message = 'Payment processing is not configured.'
    if settings.DEBUG:
        message = (
            'Stripe secret key is not configured on the backend. '
            'Add STRIPE_SECRET_KEY=sk_... to backend/.env and restart the backend server.'
        )
    return Response({'error': message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_coupon_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def link_callback(uri, rel):
    """
    Convert HTML URIs to absolute system paths for xhtml2pdf
    """
    if uri.startswith(settings.STATIC_URL):
        path = os.path.join(settings.STATIC_ROOT, uri.replace(settings.STATIC_URL, ""))
    elif uri.startswith(settings.MEDIA_URL):
        path = os.path.join(settings.MEDIA_ROOT, uri.replace(settings.MEDIA_URL, ""))
    else:
        return uri
    if not os.path.isfile(path):
        raise Exception(f'File not found: {path}')
    return path

def generate_booking_form_pdf(booking, template_name='payments/invoice_manager.html'):
    from services.models import Service
    from django.template.loader import get_template
    import base64
    import os

    service = get_object_or_404(Service, id=booking.service_id)
    add_ons = booking.add_ons.all()

    # Prepare booking form image base64
    image_data = None
    try:
        with open(settings.PDF_IMAGE_PATH, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        pass

    context = {
        'booking': booking,
        'service': service,
        'add_ons': add_ons,
        'previous_experience': booking.get_previous_customer_experience(),
        'image_data': f"data:image/png;base64,{image_data}" if image_data else None,
    }

    template = get_template(template_name)
    html = template.render(context)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="RS Booking-{booking.booking_id}.pdf"'

    pisa_status = pisa.CreatePDF(html, dest=response, link_callback=link_callback)

    if pisa_status.err:
        return None, 'Error generating PDF'
    return response, None

def generate_invoice(booking, template_name='payments/invoice.html'):
    """
    Generate an invoice PDF for a booking and payment.
    """

    service = get_object_or_404(Service, id=booking.service_id)
    add_ons = booking.add_ons.all()
    
    no_of_days = calculate_parking_days(booking.departure_time, booking.return_time)
    total_days_price = no_of_days * service.per_day_price

    # Prepare logo base64 if available
    logo_data = None
    try:
        with open(settings.PDF_LOGO_PATH, 'rb') as f:
            logo_data = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        pass  # gracefully handle missing logo

    dublin_logo_data = None
    try:
        with open(settings.DUBLIN_PDF_LOGO_PATH, 'rb') as f:
            dublin_logo_data = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        pass  # gracefully handle missing logo

    # Render HTML
    context = {
        'booking': booking,
        'service': service,
        'no_of_days': no_of_days,
        'total_days_price': total_days_price,
        'add_ons': add_ons, 
        'logo_data': f"data:image/png;base64,{logo_data}" if logo_data else None,
        'dublin_logo_data': f"data:image/png;base64,{dublin_logo_data}" if dublin_logo_data else None,
    }

    template = get_template(template_name)
    html = template.render(context)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Invoice-{booking.booking_id}.pdf"'

    pisa_status = pisa.CreatePDF(html, dest=response, link_callback=link_callback)

    if pisa_status.err:
        return None, 'Error generating PDF'
    return response, None

def generate_topup_invoice(credit_transaction):
    """
    Generate an invoice PDF for a credit top-up. Returns (response, error).
    """
    logo_data = None
    try:
        with open(settings.PDF_LOGO_PATH, 'rb') as f:
            logo_data = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        pass  # gracefully handle missing logo

    dublin_logo_data = None
    try:
        with open(settings.DUBLIN_PDF_LOGO_PATH, 'rb') as f:
            dublin_logo_data = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        pass  # gracefully handle missing logo

    context = {
        'tx': credit_transaction,
        'customer': credit_transaction.user,
        'logo_data': f"data:image/png;base64,{logo_data}" if logo_data else None,
        'dublin_logo_data': f"data:image/png;base64,{dublin_logo_data}" if dublin_logo_data else None,
    }

    template = get_template('payments/credit_topup_invoice.html')
    html = template.render(context)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Credit-TopUp-Invoice-{credit_transaction.id}.pdf"'

    pisa_status = pisa.CreatePDF(html, dest=response, link_callback=link_callback)

    if pisa_status.err:
        return None, 'Error generating PDF'
    return response, None

from django.core.mail import EmailMultiAlternatives

def send_booking_confirmation_email(booking):
    """
    Sends a booking confirmation email with invoice PDF attached.
    Sets booking.email_sent = True if successful.
    """
    from django.core.mail import EmailMultiAlternatives, get_connection

    # Website-specific settings
    website = getattr(booking, 'website', 'rsexpressparking')
    if website.lower() == "dublinairportparking":
        site_name = "Dublin Airport Express Parking"
        site_url = "https://dublinairportexpressparking.ie/"
        team_name = "The Dublin Airport Express Parking Team"
        from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
        manage_url = settings.FRONTEND_DUBLIN_MANAGE_BOOKING_URL
        connection = get_connection(
            host=config('EMAIL_HOST'),
            port=config('EMAIL_PORT', cast=int),
            username="support@dublinairportexpressparking.ie",
            password=config('DUBLIN_EMAIL_HOST_PASSWORD'),
            use_tls=config('EMAIL_USE_TLS', cast=bool)
        )
    else:
        site_name = "RS Express Parking"
        site_url = "https://rsexpressparking.com/"
        team_name = "The RS Express Parking Team"
        from_email = "RS Express Parking <support@rsexpressparking.com>"
        manage_url = settings.FRONTEND_RS_MANAGE_BOOKING_URL
        connection = None  # Use default

    # Generate invoice PDF
    response, error = generate_invoice(booking)
    if error:
        raise Exception(f"Error generating invoice: {error}")
    pdf_content = response.getvalue()

    departure_time = timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M')
    return_time = timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M')

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">Booking Confirmation – {booking.service.name}</h2>
        <p>Hi {booking.first_name},</p>
        <p>
        Thank you for choosing <strong>{site_name}</strong> – {booking.service.name}.
        We're happy to confirm that your booking has been successfully completed and your payment has been received.
        </p>
        <h3 style="color: #444;">🚗 Booking Summary</h3>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        <li><strong>Drop-Off Date & Time:</strong> {departure_time}</li>
        <li><strong>Pick-Up Date & Time:</strong> {return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        </ul>
        <h3 style="color: #444;">💳 Payment Details</h3>
        <ul>
        <li><strong>Total Paid:</strong> €{booking.discounted_price}</li>
        <li><strong>Payment Method:</strong> Stripe</li>
        </ul>
        <h3 style="color: #444;">📄 Your Invoice</h3>
        <p>
        Your invoice is attached to this email as a PDF file. Please download it from the email attachment.
        </p>
        {(
        '''
        <h3 style="color: #444;">🅿️ Parking Details</h3>
        <ul>
            <li><strong>Customer Support:</strong> +353 (01) 221 0589</li>
            <li><strong>Address:</strong> Limewoods, Cooks Road, Forrest Great, Swords, Co. Dublin, K67 WA29</li>
            <li><strong>Navigation:</strong> <a href="https://maps.app.goo.gl/JKijteSn8DwTo1cx9?g_st=iwb" style="color: #010659;">View on Google Maps</a></li>
        </ul>
        <h3 style="color: #444;">🚐 Arrival Instructions</h3>
        <p>
            Dublin Airport Park & Fly will greet you on site, assist with parking, and arrange a frequent minibus/coach to the airport.<br>
            <strong>Note:</strong> Please report any delay, damage, or issues directly to Dublin Airport Park & Fly.<br>
            <strong>IMPORTANT:</strong> Extra passengers may delay shuttle dispatch to/from the airport.
        </p>
        <h3 style="color: #444;">📝 What To Do When You Arrive</h3>
        <p>
            Call us just before arriving so our driver can assist and park your car.<br>
            <strong>Contact:</strong> +353 (01) 221 0589<br>
            Customers should go to Car Park A, Level 2.<br>
            Go to Terminal 1, Car Park A, Level 2 for pick-up and drop-off.<br>
            On arrival, go to reception. Show your email confirmation (print or digital) or booking reference.
        </p>
        '''
        if "Park & Fly" in booking.service.name else
        '''
        <h3 style="color: #444;">📞 Important Instructions</h3>
        <ul>
            <li>
                Please make sure to <strong>call the driver at <a href="tel:+353834896505" style="color:#0066cc;">+353 83 489 6505</a> or <a href="tel:+353838208082" style="color:#0066cc;">+353 83 820 8082</a> at least 30 minutes before your arrival and departure</strong> to ensure a smooth handover.
            </li>
            <li>
                Customers should go to Car Park A, Level 2.
            </li>
            <li>
                Go to Terminal 1, Car Park A, Level 2 for pick-up and drop-off.
            </li>
            <li>
                For any other queries, feel free to reply to this email or contact us directly.
            </li>
        </ul>
        '''
        )}
        <h3 style="color: #444;">🔧 Manage Your Booking</h3>
        <p>
        Need to reschedule or cancel? You can manage your booking any time at
        <a href="{manage_url}" style="color: #0066cc;">{manage_url}</a> using your Booking ID and email address.
        </p>
        <p>
        Thanks again, and we look forward to seeing you soon!
        </p>
        <p>
        Warm regards,<br>
        <strong>{team_name}</strong><br>
        <a href="{site_url}" style="color: #0066cc;">{site_url}</a> | +353 1 964 0011
        </p>
    </body>
    </html>
    """

    text_body = f"""
Hi {booking.first_name},

Thank you for choosing {site_name} – {booking.service.name}.

We're happy to confirm that your booking has been successfully completed and your payment has been received.

-----------------------------
🚗 Booking Summary
-----------------------------
Booking ID: {booking.booking_id}
Drop-Off Date & Time: {departure_time}
Pick-Up Date & Time: {return_time}
Vehicle: {booking.car_model} – {booking.car_registration_no}

-----------------------------
💳 Payment Details
-----------------------------
Total Paid: €{booking.discounted_price}
Payment Method: Stripe

-----------------------------
📄 Your Invoice
-----------------------------
Your invoice is attached to this email as a PDF file. Please download it from the email attachment.

{(
'''
-----------------------------
🅿️ Parking Details
-----------------------------
Customer Support: +353 (01) 221 0589
Address: Limewoods, Cooks Road, Forrest Great, Swords, Co. Dublin, K67 WA29
Navigation: https://maps.app.goo.gl/JKijteSn8DwTo1cx9?g_st=iwb

-----------------------------
🚐 Arrival Instructions
-----------------------------
Dublin Airport Park & Fly will greet you on site, assist with parking, and arrange a frequent minibus/coach to the airport.
Note: Please report any delay, damage, or issues directly to Dublin Airport Park & Fly.
IMPORTANT: Extra passengers may delay shuttle dispatch to/from the airport.

-----------------------------
📝 What To Do When You Arrive
-----------------------------
Call us just before arriving so our driver can assist and park your car.
Contact: +353 (01) 221 0589
Customers should go to Car Park A, Level 2.
Go to Terminal 1, Car Park A, Level 2 for pick-up and drop-off.
On arrival, go to reception. Show your email confirmation (print or digital) or booking reference.
'''
if "Park & Fly" in booking.service.name else
'''
-----------------------------
📞 Important Instructions
-----------------------------
- Please make sure to call the driver at +353 83 489 6505 or +353 83 820 8082 at least 30 minutes before your arrival and departure to ensure a smooth handover.
- Customers should go to Car Park A, Level 2.
- Go to Terminal 1, Car Park A, Level 2 for pick-up and drop-off.
- For any other queries, feel free to reply to this email or contact us directly.
'''
)}

-----------------------------
🔧 Manage Your Booking
-----------------------------
Need to reschedule or cancel? Manage your booking any time at {manage_url} using your Booking ID and email address.

Thanks again, and we look forward to seeing you soon!

Warm regards,
{team_name}
{site_url} | +353 1 964 0011
"""

    email = EmailMultiAlternatives(
        subject="Booking Confirmation – " + str(booking.service.name),
        body=text_body,
        from_email=from_email,
        to=[booking.email],
        connection=connection
    )
    email.attach_alternative(html_body, "text/html")
    email.attach(f"Invoice-{booking.booking_id}.pdf", pdf_content, 'application/pdf')
    email.send()
    booking.email_sent = True
    booking.save(update_fields=["email_sent"])
    return pdf_content

def send_manager_new_booking_email(booking, pdf_content):
    departure_time = timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M')
    return_time = timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M')

    # Website-specific manager emails and from_email
    settings = BookingSettings.objects.first()
    website = getattr(booking, 'website', 'rsexpressparking')
    manager_emails = settings.get_manager_email_list(website) if settings else ["rsexpressparking@gmail.com"]

    if website.lower() == "dublinairportparking":
        from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
        system_name = "Dublin Airport Express Parking System"
        connection = get_connection(
            host=config('EMAIL_HOST'),
            port=config('EMAIL_PORT', cast=int),
            username="support@dublinairportexpressparking.ie",
            password=config('DUBLIN_EMAIL_HOST_PASSWORD'),
            use_tls=config('EMAIL_USE_TLS', cast=bool)
        )
    else:
        from_email = "RS Express Parking <support@rsexpressparking.com>"
        system_name = "RS Express Parking System"
        connection = None  # Use default

    supplier = booking.supplier
    if supplier:
        subject = f"New Supplier Booking Received – {supplier.name} – {booking.service.name}"
        heading = f"New Supplier Booking Received – {booking.service.name}"
        html_intro = (
            f"A new booking has just been received from supplier "
            f"<strong>{supplier.name}</strong> on {system_name}. Here are the details:"
        )
        text_intro = (
            f"A new booking has just been received from supplier "
            f"{supplier.name} on {system_name}."
        )
        source_html = f"<li><strong>Supplier:</strong> {supplier.name}</li>"
        source_text = f"Supplier: {supplier.name}\n"
        payment_heading = "Supplier Booking Details"
        amount_label = "Booking Value"
        payment_method_html = "<li><strong>Booking Source:</strong> Supplier</li>"
        payment_method_text = "Booking Source: Supplier"
    else:
        subject = "New Booking Received – " + str(booking.service.name)
        heading = subject
        html_intro = f"A new booking has just been made on {system_name}. Here are the details:"
        text_intro = f"A new booking has just been made on {system_name}."
        source_html = ""
        source_text = ""
        payment_heading = "Payment Details"
        amount_label = "Total Paid"
        payment_method_html = "<li><strong>Payment Method:</strong> Stripe</li>"
        payment_method_text = "Payment Method: Stripe"

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">{heading}</h2>
        <p>
        {html_intro}
        </p>
        <h3 style="color: #444;">🚗 Booking Summary</h3>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        {source_html}
        <li><strong>Customer Name:</strong> {booking.first_name} {booking.last_name}</li>
        <li><strong>Email:</strong> {booking.email}</li>
        <li><strong>Phone:</strong> {booking.contact_no}</li>
        <li><strong>Drop-Off Date & Time:</strong> {departure_time}</li>
        <li><strong>Pick-Up Date & Time:</strong> {return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        <li><strong>Service:</strong> {booking.service.name}</li>
        <li><strong>Add-ons:</strong> {', '.join([a.name for a in booking.add_ons.all()])}</li>
        </ul>
        <h3 style="color: #444;">💳 {payment_heading}</h3>
        <ul>
        <li><strong>{amount_label}:</strong> €{booking.discounted_price or booking.total_price}</li>
        {payment_method_html}
        </ul>
        <p>
        Please check the admin panel for more details or to manage this booking.
        </p>
        <p>
        Regards,<br>
        <strong>{system_name}</strong>
        </p>
    </body>
    </html>
    """

    text_body = f"""
{text_intro}

-----------------------------
🚗 Booking Summary
-----------------------------
Booking ID: {booking.booking_id}
{source_text}Customer Name: {booking.first_name} {booking.last_name}
Email: {booking.email}
Phone: {booking.contact_no}
Drop-Off Date & Time: {departure_time}
Pick-Up Date & Time: {return_time}
Vehicle: {booking.car_model} – {booking.car_registration_no}
Service: {booking.service.name}
Add-ons: {', '.join([a.name for a in booking.add_ons.all()])}

-----------------------------
💳 {payment_heading}
-----------------------------
{amount_label}: €{booking.discounted_price or booking.total_price}
{payment_method_text}

Please check the admin panel for more details or to manage this booking.

Regards,
{system_name}
"""

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email,
        to=manager_emails,
        connection=connection
    )
    email.attach_alternative(html_body, "text/html")
    email.attach(f"Invoice-{booking.booking_id}.pdf", pdf_content, 'application/pdf')
    email.send()

class PaymentList(APIView):
    def get(self, request):
        payments = Payment.objects.all()
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)

class CreateStripePaymentIntent(APIView):
    permission_classes = [AllowAny]
    def post(self, request, booking_id):
        config_error = stripe_configuration_error_response()
        if config_error:
            return config_error

        booking = get_object_or_404(Booking, id=booking_id)
        user = booking.user  # adjust if your Booking model uses a different field

        try:
            raw_request_id = (request.headers.get('Idempotency-Key') or '').strip()
            client_request_id = None
            if raw_request_id:
                try:
                    client_request_id = uuid.UUID(raw_request_id)
                except ValueError:
                    return Response(
                        {'error': 'Idempotency-Key must be a valid UUID.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if client_request_id:
                existing_payment = Payment.objects.filter(
                    client_request_id=client_request_id,
                ).first()
                if existing_payment:
                    if existing_payment.booking_id != booking.id:
                        return Response(
                            {'error': 'This Idempotency-Key belongs to another booking.'},
                            status=status.HTTP_409_CONFLICT,
                        )
                    existing_intent = stripe.PaymentIntent.retrieve(
                        existing_payment.stripe_payment_intent
                    )
                    return Response({
                        'clientSecret': existing_intent['client_secret'],
                        'amount': existing_payment.amount,
                        'payment_id': existing_payment.id,
                        'replayed': True,
                    })

            if booking.payments.filter(status__name__iexact='Succeeded').exists():
                return Response(
                    {'error': 'This booking has already been paid.', 'code': 'already_paid'},
                    status=status.HTTP_409_CONFLICT,
                )

            is_reschedule_extra = request.data.get("is_reschedule_extra", False)
            try:
                bonus_points_used = Decimal(str(request.data.get("bonus_points_used", 0)))
                if not bonus_points_used.is_finite():
                    raise ValueError
            except Exception:
                return Response({'error': 'Invalid bonus_points_used.'}, status=status.HTTP_400_BAD_REQUEST)
            if bonus_points_used < 0:
                return Response({'error': 'Invalid bonus_points_used.'}, status=status.HTTP_400_BAD_REQUEST)
            if bonus_points_used > 0:
                # Credit points can only be spent by the authenticated owner
                # of the booking, and never more than their real balance.
                if not request.user.is_authenticated or booking.user_id != request.user.id:
                    return Response(
                        {'error': 'You must be logged in as the booking owner to use credit points.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                bonus_points_used = min(bonus_points_used, request.user.bonus_points or Decimal('0.00'))

            customer_kwargs = {'email': booking.email}
            if client_request_id:
                customer_kwargs['idempotency_key'] = f'customer:{booking.id}:{client_request_id}'
            customer = stripe.Customer.create(**customer_kwargs)
            amount_to_charge = float(booking.discounted_price if booking.discounted_price > 0 else booking.total_price)
            extra_metadata = {}

            if is_reschedule_extra:
                # Never trust a client-provided amount for extensions — recompute
                # from the new dates at the flat per-day extension rate.
                new_departure_raw = request.data.get("new_departure_time")
                new_return_raw = request.data.get("new_return_time")
                if not new_departure_raw or not new_return_raw:
                    return Response(
                        {'error': 'new_departure_time and new_return_time are required for reschedule payments.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                new_departure = parse_and_localize(new_departure_raw)
                new_return = parse_and_localize(new_return_raw)
                rule_error = validate_reschedule(booking, new_departure, new_return)
                if rule_error:
                    return Response({'error': rule_error}, status=status.HTTP_400_BAD_REQUEST)
                pricing = compute_reschedule_pricing(booking, new_departure, new_return)
                if pricing['extra_amount'] <= 0:
                    return Response(
                        {'error': 'No extra payment is required for these dates.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                amount_to_charge = float(pricing['extra_amount'])
                extra_metadata = {
                    'new_departure_time': new_departure.isoformat(),
                    'new_return_time': new_return.isoformat(),
                }
            else:
                # Coupon discount and credit points both apply, coupon first.
                base_total = Decimal(str(booking.total_price))
                has_discount = False
                if booking.coupon and booking.coupon.is_valid():
                    discount_amount = (base_total * booking.coupon.discount_percent) / 100
                    base_total -= discount_amount
                    has_discount = True
                if bonus_points_used > 0:
                    # Stripe can't charge less than €0.50 — when paying the
                    # remainder by card, credits must leave at least that much.
                    max_usable = max(Decimal('0.00'), base_total - Decimal('0.50'))
                    bonus_points_used = min(bonus_points_used, max_usable)
                    base_total -= bonus_points_used
                    has_discount = True
                if has_discount:
                    booking.discounted_price = base_total
                    booking.save(update_fields=['discounted_price'])
                amount_to_charge = float(booking.discounted_price if booking.discounted_price > 0 else booking.total_price)

            # Create PaymentIntent
            intent_kwargs = dict(
                amount=int(round(amount_to_charge * 100)),  # in cents
                currency='eur',
                customer=customer.id,
                metadata={
                    'booking_id': booking.id,
                    'is_reschedule_extra': str(bool(is_reschedule_extra)),
                    'bonus_points_used': str(bonus_points_used),
                    **extra_metadata,
                },
            )
            if client_request_id:
                intent_kwargs['idempotency_key'] = f'payment:{booking.id}:{client_request_id}'
            intent = stripe.PaymentIntent.create(**intent_kwargs)

            status_name = 'Pending'
            status_obj = get_object_or_404(Status, name=status_name, type='payment')

            # Save to Payment model
            payment = Payment.objects.create(
                booking=booking,
                stripe_payment_intent=intent['id'],
                stripe_customer_id=customer.id,
                amount=amount_to_charge,
                status=status_obj,
                client_request_id=client_request_id,
            )

            # Store bonus points used in booking or payment if you want to track it
            booking.bonus_points_used = bonus_points_used
            booking.save(update_fields=['bonus_points_used'])

            return Response({
                'clientSecret': intent['client_secret'],
                'amount': amount_to_charge,
                'payment_id': payment.id,
            })

        except IntegrityError:
            if client_request_id:
                existing_payment = Payment.objects.filter(
                    client_request_id=client_request_id,
                    booking=booking,
                ).first()
                if existing_payment:
                    existing_intent = stripe.PaymentIntent.retrieve(
                        existing_payment.stripe_payment_intent
                    )
                    return Response({
                        'clientSecret': existing_intent['client_secret'],
                        'amount': existing_payment.amount,
                        'payment_id': existing_payment.id,
                        'replayed': True,
                    })
            raise
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = config('STRIPE_WEBHOOK_SECRET')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )

            if event['type'] == 'payment_intent.succeeded':
                intent = event['data']['object']

                # Credit top-ups are handled separately from booking payments
                if intent.get('metadata', {}).get('purpose') == 'credit_topup':
                    return self._handle_topup_succeeded(intent)

                payment_intent_id = intent['id']
                is_reschedule_extra = str(intent['metadata'].get('is_reschedule_extra', '')).lower() == 'true'

                with transaction.atomic():
                    payment = Payment.objects.select_for_update().get(stripe_payment_intent=payment_intent_id)
                    booking = payment.booking
                    user = booking.user

                    # Idempotency guard: Stripe can deliver the same event more
                    # than once. Skip the balance/coupon/status mutations on a
                    # replay, but still fall through to the email block below so
                    # a previously failed email send gets retried.
                    already_processed = payment.status and payment.status.name == 'Succeeded'
                    if not already_processed:
                        # Deduct credit points if used, with a ledger entry
                        bonus_points_used = Decimal(str(intent['metadata'].get('bonus_points_used', 0)))
                        if bonus_points_used > 0 and user:
                            locked_user = User.objects.select_for_update().get(pk=user.pk)
                            deducted = min(locked_user.bonus_points or Decimal('0.00'), bonus_points_used)
                            if deducted > 0:
                                locked_user.bonus_points -= deducted
                                locked_user.save(update_fields=['bonus_points'])
                                CreditTransaction.objects.create(
                                    user=locked_user,
                                    transaction_type=CreditTransaction.TYPE_BOOKING_SPEND,
                                    amount=-deducted,
                                    balance_after=locked_user.bonus_points,
                                    booking=booking,
                                    status=CreditTransaction.STATUS_SUCCEEDED,
                                    website=getattr(booking, 'website', None) or 'rsexpressparking',
                                )
                            if deducted < bonus_points_used:
                                logger.warning(
                                    "Booking %s: expected to deduct %s credit points but balance only allowed %s",
                                    booking.booking_id, bonus_points_used, deducted,
                                )

                        status_obj = get_object_or_404(Status, name='Succeeded', type='payment')
                        payment.status = status_obj
                        payment.save()

                        if not is_reschedule_extra:
                            # Award a new coupon to the user
                            code = generate_coupon_code()
                            valid_from = timezone.now()

                            coupon = Coupon.objects.create(
                                code=code,
                                discount_percent=10,
                                valid_from=valid_from,
                                valid_to=None,      # not needed for lifetime
                                lifetime=True,
                                active=True
                            )

                            status_obj = get_object_or_404(Status, name='Confirmed', type='booking')
                            booking.status = status_obj
                            booking.discount_coupon_awarded = coupon.code
                            booking.save()

                            if booking.coupon:
                                booking.coupon.times_used += 1
                                booking.coupon.save()

                # Reschedule-extension payments only mark the payment as
                # succeeded — the booking itself (dates, prices, status) is
                # updated by the reschedule endpoint. Awarding a coupon,
                # re-confirming the booking or re-sending the confirmation
                # email here would corrupt the existing booking.
                if is_reschedule_extra:
                    return HttpResponse(status=200)

                # Generate and email the invoice (single source of truth for
                # the confirmation email body, including the manage-booking link)
                if not booking.email_sent:
                    try:
                        pdf_content = send_booking_confirmation_email(booking)
                        send_manager_new_booking_email(booking, pdf_content)
                    except Exception as e:
                        print(f"Error sending email: {str(e)}")
                        return HttpResponse(f'Error: {str(e)}', status=500)

            elif event['type'] == 'payment_intent.payment_failed':
                intent = event['data']['object']
                payment_intent_id = intent['id']

                if intent.get('metadata', {}).get('purpose') == 'credit_topup':
                    CreditTransaction.objects.filter(
                        stripe_payment_intent=payment_intent_id,
                        status=CreditTransaction.STATUS_PENDING,
                    ).update(status=CreditTransaction.STATUS_FAILED)
                    return HttpResponse(status=200)

                payment = Payment.objects.get(stripe_payment_intent=payment_intent_id)

                new_status = 'Failed'
                status_obj = get_object_or_404(Status, name=new_status, type='payment')
                payment.status = status_obj
                payment.save()

                new_booking_status = 'Payment Failed'
                status_obj = get_object_or_404(Status, name=new_booking_status, type='booking')
                booking = payment.booking
                booking.status = status_obj
                booking.save()

        except stripe.error.SignatureVerificationError:
            return HttpResponse(status=400)
        except Exception as e:
            return HttpResponse(f"Error: {str(e)}", status=400)

        return HttpResponse(status=200)

    def _handle_topup_succeeded(self, intent):
        payment_intent_id = intent['id']

        # Never credit non-euro amounts 1:1
        if (intent.get('currency') or '').lower() != 'eur':
            CreditTransaction.objects.filter(
                stripe_payment_intent=payment_intent_id,
                status=CreditTransaction.STATUS_PENDING,
            ).update(status=CreditTransaction.STATUS_FAILED)
            logger.error(
                "Credit top-up %s paid in unexpected currency %s — not credited.",
                payment_intent_id, intent.get('currency'),
            )
            return HttpResponse(status=200)

        # Stripe's received amount is authoritative — never trust client values
        amount = Decimal(intent['amount_received']) / Decimal('100')
        if amount <= 0:
            return HttpResponse(status=200)

        with transaction.atomic():
            try:
                tx = CreditTransaction.objects.select_for_update().get(
                    stripe_payment_intent=payment_intent_id
                )
            except CreditTransaction.DoesNotExist:
                logger.error("No credit transaction found for intent %s", payment_intent_id)
                return HttpResponse(status=200)

            if tx.status == CreditTransaction.STATUS_SUCCEEDED:
                # Replayed/duplicate webhook event — already credited.
                return HttpResponse(status=200)

            locked_user = User.objects.select_for_update().get(pk=tx.user_id)
            locked_user.bonus_points = (locked_user.bonus_points or Decimal('0.00')) + amount
            locked_user.save(update_fields=['bonus_points'])

            tx.amount = amount
            tx.status = CreditTransaction.STATUS_SUCCEEDED
            tx.balance_after = locked_user.bonus_points
            tx.save(update_fields=['amount', 'status', 'balance_after', 'updated_at'])

            tx_id = tx.id

            def _queue_email():
                from .tasks import send_topup_confirmation_email_task
                send_topup_confirmation_email_task.delay(tx_id)

            transaction.on_commit(_queue_email)

        return HttpResponse(status=200)

class PDFRenderer(BaseRenderer):
    media_type = 'application/pdf'
    format = 'pdf'
    charset = None
    render_style = 'binary'

    def render(self, data, media_type=None, renderer_context=None):
        return data  # return raw PDF response
class InvoiceDownloadView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [PDFRenderer]

    def get(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)

        response, error = generate_invoice(booking)
        if error:
            return HttpResponse(f'Error: {error}', status=500)
        return response
    
class BookingFormDownloadView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [PDFRenderer]
    def get(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)
        service = get_object_or_404(Service, id=booking.service_id)
        add_ons = booking.add_ons.all()

        # Prepare logo base64 if available
        image_data = None
        try:
            with open(settings.PDF_IMAGE_PATH, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode()
        except FileNotFoundError:
            pass  # gracefully handle missing logo

        # Render HTML
        context = {
            'booking': booking,            
            'service': service,            
            'add_ons': add_ons,            
            'previous_experience': booking.get_previous_customer_experience(),
            'image_data': f"data:image/png;base64,{image_data}" if image_data else None,
        }

        template = get_template('payments/invoice_manager.html')
        html = template.render(context)

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="RS Booking-{booking.booking_id}.pdf"'

        pisa_status = pisa.CreatePDF(
            html, dest=response, link_callback=link_callback
        )

        if pisa_status.err:
            return HttpResponse('We had some errors <pre>' + html + '</pre>')
        return response
class PaymentStatusView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, booking_id):
        try:
            payment = Payment.objects.filter(booking__id=booking_id).latest('created_at')
            
            # Get the payment status from Stripe
            stripe_payment = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent)
            
            return Response({
                'id': payment.id,
                'stripe_status': stripe_payment.status,
                'internal_status': payment.status.name if payment.status else None,
                'amount': payment.amount,
                'booking_id': payment.booking.id,
                'created_at': payment.created_at
            })
            
        except stripe.error.StripeError as e:
            return Response({
                'error': 'Error fetching payment status from Stripe',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': 'Error fetching payment status',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)    
        
class VerifyBookingAmountView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, booking_id):
        try:
            # Get the amount from request body
            amount_to_verify = request.data.get('amount')
            is_reschedule_extra = request.data.get('is_reschedule_extra', False)
            if not amount_to_verify:
                return Response({
                    'error': 'Amount is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            booking = get_object_or_404(Booking, id=booking_id)            
            amount_to_verify = Decimal(str(amount_to_verify))

            if is_reschedule_extra:
                # Recompute the extension charge server-side from the new dates
                new_departure_raw = request.data.get('new_departure_time')
                new_return_raw = request.data.get('new_return_time')
                if not new_departure_raw or not new_return_raw:
                    return Response({
                        'valid': False,
                        'message': 'new_departure_time and new_return_time are required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                pricing = compute_reschedule_pricing(
                    booking,
                    parse_and_localize(new_departure_raw),
                    parse_and_localize(new_return_raw),
                )
                expected_amount = pricing['extra_amount']
                if expected_amount > 0 and amount_to_verify == expected_amount:
                    return Response({
                        'valid': True,
                        'message': 'Extra payment for reschedule verified'
                    })
                return Response({
                    'valid': False,
                    'message': 'Amount does not match the required extension charge',
                    'expected_amount': str(expected_amount),
                    'provided_amount': str(amount_to_verify)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate the actual amount
            service = booking.service            
            no_of_days = calculate_parking_days(booking.departure_time, booking.return_time)
            
            total_days_price = no_of_days * service.per_day_price
            add_ons_price = sum(addon.price for addon in booking.add_ons.all())
            total_price = total_days_price + add_ons_price + service.base_price

            # Apply discount if coupon exists
            if booking.coupon and booking.coupon.is_valid():
                discount_amount = (total_price * booking.coupon.discount_percent) / 100
                total_price -= discount_amount

            if booking.bonus_points_used:
                total_price = total_price - booking.bonus_points_used
            # Compare amounts
            if amount_to_verify == total_price:
                return Response({
                    'valid': True,
                    'message': 'Amount matches the booking total'
                })
            else:
                return Response({
                    'valid': False,
                    'message': 'Amount does not match',
                    'expected_amount': str(total_price),
                    'provided_amount': str(amount_to_verify)
                }, status=status.HTTP_400_BAD_REQUEST)

        except ValueError:
            return Response({
                'error': 'Invalid amount format'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': 'Error verifying amount',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)        
        

class UpdatePaymentStatusView(APIView):
    permission_classes = [AllowAny]
    def put(self, request, payment_id):
        try:
            # Get the booking and associated payment
            payment = get_object_or_404(Payment, id=payment_id)

            # Get the new status from the request
            new_status_name = request.data.get('status')
            if not new_status_name:
                return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)

            # This public endpoint exists only so the frontend can report
            # client-side failures. Success is decided exclusively by the
            # Stripe webhook — allowing it here would let anyone mark a
            # payment as paid (and defeat the webhook idempotency guard).
            if new_status_name != 'Failed':
                return Response(
                    {'error': 'Only the Failed status can be set from the client.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if payment.status and payment.status.name == 'Succeeded':
                return Response(
                    {'error': 'This payment has already succeeded.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch the new status object
            new_status = get_object_or_404(Status, name=new_status_name, type='payment')

            # Update the payment status
            payment.status = new_status

            # Update status_message if provided
            status_message = request.data.get('status_message')
            if status_message is not None:
                payment.status_message = status_message

            payment.save()

            return Response({
                'message': 'Payment status updated successfully',
                'payment_id': payment.id,
                'new_status': new_status.name,
                'status_message': payment.status_message
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateCreditTopUpIntent(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        config_error = stripe_configuration_error_response()
        if config_error:
            return config_error

        raw_amount = request.data.get('amount')
        if raw_amount is None:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(raw_amount))
            if not amount.is_finite():
                raise ValueError
            valid_precision = amount == amount.quantize(Decimal('0.01'))
        except Exception:
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if not valid_precision:
            return Response(
                {'error': 'Amount can have at most 2 decimal places.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if amount < TOPUP_MIN or amount > TOPUP_MAX:
            return Response(
                {'error': f'Top-up amount must be between €{TOPUP_MIN} and €{TOPUP_MAX}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        website = _resolve_website(request.data.get('website'), request.get_host())

        tx = CreditTransaction.objects.create(
            user=request.user,
            transaction_type=CreditTransaction.TYPE_TOPUP,
            amount=amount,
            status=CreditTransaction.STATUS_PENDING,
            website=website,
        )

        try:
            # The charge amount is set exclusively from the validated
            # server-side value; the webhook later credits from Stripe's
            # amount_received, so a tampered client can never mint credits.
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),
                currency='eur',
                receipt_email=request.user.email or None,
                metadata={
                    'purpose': 'credit_topup',
                    'credit_transaction_id': tx.id,
                    'user_id': request.user.id,
                },
            )
        except Exception as e:
            tx.status = CreditTransaction.STATUS_FAILED
            tx.save(update_fields=['status', 'updated_at'])
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        tx.stripe_payment_intent = intent['id']
        tx.save(update_fields=['stripe_payment_intent', 'updated_at'])

        return Response({
            'clientSecret': intent['client_secret'],
            'amount': str(amount),
            'transaction_id': tx.id,
        })


class CreditTopUpStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transaction_id):
        tx = get_object_or_404(CreditTransaction, id=transaction_id, user=request.user)
        # Re-read the balance so the caller sees the webhook's update
        balance = User.objects.values_list('bonus_points', flat=True).get(pk=request.user.pk)
        return Response({'status': tx.status, 'balance': str(balance)})


class CreditHistoryPagination(PageNumberPagination):
    page_size = 10


class CreditHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = CreditTransaction.objects.filter(
            user=request.user,
            status=CreditTransaction.STATUS_SUCCEEDED,
        ).select_related('booking')
        paginator = CreditHistoryPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = CreditTransactionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class TopUpInvoiceDownloadView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [PDFRenderer]

    def get(self, request, transaction_id):
        tx = get_object_or_404(
            CreditTransaction,
            id=transaction_id,
            user=request.user,
            transaction_type=CreditTransaction.TYPE_TOPUP,
            status=CreditTransaction.STATUS_SUCCEEDED,
        )
        response, error = generate_topup_invoice(tx)
        if error:
            return HttpResponse(f'Error: {error}', status=500)
        return response


class PayBookingWithCreditsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        with transaction.atomic():
            booking = get_object_or_404(
                Booking.objects.select_for_update(),
                id=booking_id,
                user=request.user,
            )

            if booking.status and booking.status.name == 'Confirmed':
                return Response({'error': 'This booking is already paid.'}, status=status.HTTP_400_BAD_REQUEST)
            if booking.payments.filter(status__name='Succeeded').exists():
                return Response({'error': 'This booking is already paid.'}, status=status.HTTP_400_BAD_REQUEST)

            # Compute the payable amount server-side (coupon discount first) —
            # never trust a client-provided amount.
            payable = Decimal(str(booking.total_price))
            if booking.coupon and booking.coupon.is_valid():
                payable -= (payable * booking.coupon.discount_percent) / 100
            payable = payable.quantize(Decimal('0.01'))

            if payable <= 0:
                return Response({'error': 'Nothing to pay for this booking.'}, status=status.HTTP_400_BAD_REQUEST)

            locked_user = User.objects.select_for_update().get(pk=request.user.pk)
            balance = locked_user.bonus_points or Decimal('0.00')
            if balance < payable:
                return Response({
                    'error': 'Insufficient credit balance.',
                    'balance': str(balance),
                    'required': str(payable),
                }, status=status.HTTP_400_BAD_REQUEST)

            locked_user.bonus_points = balance - payable
            locked_user.save(update_fields=['bonus_points'])

            ledger = CreditTransaction.objects.create(
                user=locked_user,
                transaction_type=CreditTransaction.TYPE_BOOKING_SPEND,
                amount=-payable,
                balance_after=locked_user.bonus_points,
                booking=booking,
                status=CreditTransaction.STATUS_SUCCEEDED,
                website=getattr(booking, 'website', None) or 'rsexpressparking',
            )

            # Record the payment so finance reporting and the payment-status
            # endpoint stay consistent with card-paid bookings.
            succeeded_status = get_object_or_404(Status, name='Succeeded', type='payment')
            Payment.objects.create(
                booking=booking,
                stripe_payment_intent=f'credits-{ledger.id}',
                stripe_customer_id='',
                amount=payable,
                status=succeeded_status,
                status_message='Paid in full with account credits',
            )

            booking.bonus_points_used = payable
            booking.discounted_price = payable

            # Mirror the webhook's success path: award the 10% lifetime coupon
            # and confirm the booking.
            coupon = Coupon.objects.create(
                code=generate_coupon_code(),
                discount_percent=10,
                valid_from=timezone.now(),
                valid_to=None,
                lifetime=True,
                active=True,
            )
            booking.status = get_object_or_404(Status, name='Confirmed', type='booking')
            booking.discount_coupon_awarded = coupon.code
            booking.save()

            if booking.coupon:
                booking.coupon.times_used += 1
                booking.coupon.save()

            new_balance = locked_user.bonus_points
            booking_pk = booking.id

            def _queue_email():
                from .tasks import send_credit_booking_confirmation_task
                send_credit_booking_confirmation_task.delay(booking_pk)

            transaction.on_commit(_queue_email)

        return Response({
            'status': 'paid',
            'balance': str(new_balance),
            'booking_status': 'Confirmed',
        })
