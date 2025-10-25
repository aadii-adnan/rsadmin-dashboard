import stripe
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from bookings.models import Booking
from .models import Payment
from django.shortcuts import get_object_or_404
from .serializers import PaymentSerializer
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
from rest_framework.permissions import AllowAny
from datetime import timezone as tz, timedelta, time
from django.utils import timezone
from decimal import Decimal
import pytz

def generate_coupon_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def calculate_parking_days(departure_dt, return_dt):
    """
    Calculate parking days by calendar date in Dublin time, always counting both start and end date as full days.
    """
    # Use Europe/Dublin timezone
    dublin_tz = pytz.timezone("Europe/Dublin")
    # Convert to Dublin time if not already aware
    if timezone.is_naive(departure_dt):
        departure_dt = timezone.make_aware(departure_dt, timezone.utc)
    if timezone.is_naive(return_dt):
        return_dt = timezone.make_aware(return_dt, timezone.utc)
    # Convert to Dublin time
    departure_dt = departure_dt.astimezone(dublin_tz)
    return_dt = return_dt.astimezone(dublin_tz)
    from_date = departure_dt.date()
    to_date = return_dt.date()
    days = (to_date - from_date).days + 1
    return days

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
            (Pick Ups and Drop Offs only)<br>
            On arrival, go to reception. Show your email confirmation (print or digital) or booking reference.
        </p>
        '''
        if "Park & Fly" in booking.service.name else
        '''
        <h3 style="color: #444;">📞 Important Instructions</h3>
        <ul>
            <li>
                Please make sure to <strong>call the driver at <a href="tel:+353834896505" style="color:#0066cc;">+353 83 489 6505</a> at least 30 minutes before your arrival and departure</strong> to ensure a smooth handover.
            </li>
            <li>
                For any other queries, feel free to reply to this email or contact us directly.
            </li>
        </ul>
        '''
        )}
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
(Pick Ups and Drop Offs only)
On arrival, go to reception. Show your email confirmation (print or digital) or booking reference.
'''
if "Park & Fly" in booking.service.name else
'''
-----------------------------
📞 Important Instructions
-----------------------------
- Please make sure to call the driver at +353 83 489 6505 at least 30 minutes before your arrival and departure to ensure a smooth handover.
- For any other queries, feel free to reply to this email or contact us directly.
'''
)}

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

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">New Booking Received – {booking.service.name}</h2>
        <p>
        A new booking has just been made on {system_name}. Here are the details:
        </p>
        <h3 style="color: #444;">🚗 Booking Summary</h3>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        <li><strong>Customer Name:</strong> {booking.first_name} {booking.last_name}</li>
        <li><strong>Email:</strong> {booking.email}</li>
        <li><strong>Phone:</strong> {booking.contact_no}</li>
        <li><strong>Drop-Off Date & Time:</strong> {departure_time}</li>
        <li><strong>Pick-Up Date & Time:</strong> {return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        <li><strong>Service:</strong> {booking.service.name}</li>
        <li><strong>Add-ons:</strong> {', '.join([a.name for a in booking.add_ons.all()])}</li>
        </ul>
        <h3 style="color: #444;">💳 Payment Details</h3>
        <ul>
        <li><strong>Total Paid:</strong> €{booking.discounted_price or booking.total_price}</li>
        <li><strong>Payment Method:</strong> Stripe</li>
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
A new booking has just been made on {system_name}.

-----------------------------
🚗 Booking Summary
-----------------------------
Booking ID: {booking.booking_id}
Customer Name: {booking.first_name} {booking.last_name}
Email: {booking.email}
Phone: {booking.contact_no}
Drop-Off Date & Time: {departure_time}
Pick-Up Date & Time: {return_time}
Vehicle: {booking.car_model} – {booking.car_registration_no}
Service: {booking.service.name}
Add-ons: {', '.join([a.name for a in booking.add_ons.all()])}

-----------------------------
💳 Payment Details
-----------------------------
Total Paid: €{booking.discounted_price or booking.total_price}
Payment Method: Stripe

Please check the admin panel for more details or to manage this booking.

Regards,
{system_name}
"""

    email = EmailMultiAlternatives(
        subject="New Booking Received – " + str(booking.service.name),
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
        booking = get_object_or_404(Booking, id=booking_id)
        user = booking.user  # adjust if your Booking model uses a different field

        try:
            extra_amount = request.data.get("amount")
            is_reschedule_extra = request.data.get("is_reschedule_extra", False)
            bonus_points_used = Decimal(str(request.data.get("bonus_points_used", 0)))

            customer = stripe.Customer.create(email=booking.email)
            amount_to_charge = float(booking.discounted_price if booking.discounted_price > 0 else booking.total_price)
            
            if is_reschedule_extra and extra_amount:
                amount_to_charge = float(extra_amount)
            else:
                discounted_total = booking.total_price
                if booking.coupon and booking.coupon.active and booking.coupon.valid_from <= timezone.now() <= booking.coupon.valid_to:
                    discount_amount = (booking.total_price * booking.coupon.discount_percent) / 100
                    discounted_total = booking.total_price - discount_amount
                    discounted_total = max(0, discounted_total - bonus_points_used)
                    booking.discounted_price = discounted_total
                    booking.save()
                amount_to_charge = float(booking.discounted_price if booking.discounted_price > 0 else booking.total_price)

            # Create PaymentIntent
            intent = stripe.PaymentIntent.create(
                amount=int(round(amount_to_charge * 100)),  # in cents
                currency='eur',
                customer=customer.id,
                metadata={
                    'booking_id': booking.id,
                    'is_reschedule_extra': str(is_reschedule_extra),
                    'bonus_points_used': str(bonus_points_used),
                },
            )

            status_name = 'Pending'
            status_obj = get_object_or_404(Status, name=status_name, type='payment')

            # Save to Payment model
            payment = Payment.objects.create(
                booking=booking,
                stripe_payment_intent=intent['id'],
                stripe_customer_id=customer.id,
                amount=amount_to_charge,
                status=status_obj
            )

            # Store bonus points used in booking or payment if you want to track it
            booking.bonus_points_used = bonus_points_used
            booking.save(update_fields=['bonus_points_used'])

            return Response({
                'clientSecret': intent['client_secret'],
                'amount': amount_to_charge,
                'payment_id': payment.id,
            })

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
                payment_intent_id = intent['id']

                payment = Payment.objects.get(stripe_payment_intent=payment_intent_id)
                booking = payment.booking
                user = booking.user

                website = getattr(booking, 'website', 'rsexpressparking')
                if website.lower() == "dublinairportparking":
                    site_name = "Dublin Airport Express Parking"
                    site_url = "https://dublinairportexpressparking.ie/"
                    team_name = "The Dublin Airport Express Parking Team"
                    from_email = "Dublin Airport Express Parking <support@dublinairportexpressparking.ie>"
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
                    connection = None  # Use default

                # Deduct bonus points if used
                bonus_points_used = float(intent['metadata'].get('bonus_points_used', 0))
                if bonus_points_used > 0 and user:
                    user.bonus_points = max(Decimal('0.00'), getattr(user, 'bonus_points', Decimal('0.00')) - Decimal(str(bonus_points_used)))
                    user.save(update_fields=['bonus_points'])

                # Update booking and payment statuses
                new_status = 'Succeeded'
                status_obj = get_object_or_404(Status, name=new_status, type='payment')
                payment.status = status_obj
                payment.save()                

                # Award a new coupon to the user
                code = generate_coupon_code()
                valid_from = timezone.now()
                valid_to = valid_from + timedelta(days=30)

                coupon = Coupon.objects.create(
                    code=code,
                    discount_percent=15,  # You can customize this
                    valid_from=valid_from,
                    valid_to=valid_to,
                    active=True
                )

                new_booking_status = 'Confirmed'
                status_obj = get_object_or_404(Status, name=new_booking_status, type='booking')
                booking.status = status_obj
                booking.discount_coupon_awarded = coupon.code
                booking.save()

                if booking.coupon:
                    booking.coupon.times_used += 1
                    booking.coupon.save()

                # Generate and email the invoice    
                if not booking.email_sent:            
                    try:
                        response, error = generate_invoice(booking)
                        if error:
                            return HttpResponse(f'Error: {error}', status=500)
                        departure_time = timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M')
                        return_time = timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M')
                        pdf_content = response.getvalue()
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
            (Pick Ups and Drop Offs only)<br>
            On arrival, go to reception. Show your email confirmation (print or digital) or booking reference.
        </p>
        '''
        if "Park & Fly" in booking.service.name else
        '''
        <h3 style="color: #444;">📞 Important Instructions</h3>
        <ul>
            <li>
                Please make sure to <strong>call the driver at <a href="tel:+353834896505" style="color:#0066cc;">+353 83 489 6505</a> at least 30 minutes before your arrival and departure</strong> to ensure a smooth handover.
            </li>
            <li>
                For any other queries, feel free to reply to this email or contact us directly.
            </li>
        </ul>
        '''
        )}
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
    (Pick Ups and Drop Offs only)
    On arrival, go to reception. Show your email confirmation (print or digital) or booking reference.
    '''
    if "Park & Fly" in booking.service.name else
    '''
    -----------------------------
    📞 Important Instructions
    -----------------------------
    - Please make sure to call the driver at +353 83 489 6505 at least 30 minutes before your arrival and departure to ensure a smooth handover.
    - For any other queries, feel free to reply to this email or contact us directly.
    '''
    )}

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
                        booking.save()
                        send_manager_new_booking_email(booking, pdf_content)
                    except Exception as e:
                        print(f"Error sending email: {str(e)}")
                        return HttpResponse(f'Error: {str(e)}', status=500)

            elif event['type'] == 'payment_intent.payment_failed':
                intent = event['data']['object']
                payment_intent_id = intent['id']
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
                # Accept any positive amount for extra days (frontend must ensure correct calculation)
                if amount_to_verify > 0:
                    return Response({
                        'valid': True,
                        'message': 'Extra payment for reschedule accepted'
                    })
                else:
                    return Response({
                        'valid': False,
                        'message': 'Extra payment must be positive'
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
                total_price = total_price - discount_amount

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