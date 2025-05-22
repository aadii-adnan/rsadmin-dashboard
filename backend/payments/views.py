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
from core.models import Status
import base64
import os
from rest_framework.renderers import BaseRenderer
from django.core.mail import EmailMultiAlternatives
from rest_framework.permissions import AllowAny
from bookings.tasks import send_completion_email
from datetime import timezone as tz, timedelta
from django.utils import timezone

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

    duration = booking.return_time - booking.departure_time
    no_of_days = duration.days + (1 if duration.seconds > 0 else 0)

    total_days_price = no_of_days * service.per_day_price
    add_ons_price = sum(addon.price for addon in add_ons)
    total_price = total_days_price + add_ons_price + service.base_price

    # Prepare logo base64 if available
    logo_data = None
    try:
        with open(settings.PDF_LOGO_PATH, 'rb') as f:
            logo_data = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        pass  # gracefully handle missing logo

    # Render HTML
    context = {
        'booking': booking,
        'service': service,
        'no_of_days': no_of_days,
        'total_days_price': total_days_price,
        'add_ons': add_ons,
        'total_price': total_price,
        'logo_data': f"data:image/png;base64,{logo_data}" if logo_data else None,
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

def send_manager_new_booking_email(booking, pdf_content):
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">New Booking Received – {booking.service.name}</h2>

        <p>
        A new booking has just been made on RS Express Parking. Here are the details:
        </p>

        <h3 style="color: #444;">🚗 Booking Summary</h3>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        <li><strong>Customer Name:</strong> {booking.first_name} {booking.last_name}</li>
        <li><strong>Email:</strong> {booking.email}</li>
        <li><strong>Phone:</strong> {booking.contact_no}</li>
        <li><strong>Drop-Off Date & Time:</strong> {booking.departure_time}</li>
        <li><strong>Pick-Up Date & Time:</strong> {booking.return_time}</li>
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
        <strong>RS Express Parking System</strong>
        </p>
    </body>
    </html>
    """

    text_body = f"""
A new booking has just been made on RS Express Parking.

-----------------------------
🚗 Booking Summary
-----------------------------
Booking ID: {booking.booking_id}
Customer Name: {booking.first_name} {booking.last_name}
Email: {booking.email}
Phone: {booking.contact_no}
Drop-Off Date & Time: {booking.departure_time}
Pick-Up Date & Time: {booking.return_time}
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
RS Express Parking System
"""

    email = EmailMultiAlternatives(
        subject="New Booking Received – " + str(booking.service.name),
        body=text_body,
        from_email='RS Express Parking <support@rsexpressparking.com>',
        to=["rsexpressparking@gmail.com"], 
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

        try:
            # Create Stripe Customer (optional: attach email)
            customer = stripe.Customer.create(email=booking.email)

            discounted_total = booking.total_price

            if booking.coupon and booking.coupon.active and booking.coupon.valid_from <= timezone.now() <= booking.coupon.valid_to:
                discount_amount = (booking.total_price * booking.coupon.discount_percent) / 100
                discounted_total = booking.total_price - discount_amount
                booking.discounted_price = discounted_total
                booking.save()

            # Create PaymentIntent
            intent = stripe.PaymentIntent.create(
                amount=int(discounted_total * 100),  # in cents
                currency='eur',
                customer=customer.id,
                metadata={'booking_id': booking.id},
            )

            status_name = 'Pending'
            status_obj = get_object_or_404(Status, name=status_name, type='payment')

            booking_price = booking.discounted_price if booking.discounted_price > 0 else booking.total_price

            # Save to Payment model
            payment = Payment.objects.create(
                booking=booking,
                stripe_payment_intent=intent['id'],
                stripe_customer_id=customer.id,
                amount=booking_price,
                status=status_obj
            )

            return Response({
                'clientSecret': intent['client_secret'],
                'amount': booking_price,
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

                # Update booking and payment statuses
                new_status = 'Succeeded'
                status_obj = get_object_or_404(Status, name=new_status, type='payment')
                payment.status = status_obj
                payment.save()                

                ireland_offset = tz(timedelta(hours=1))
                corrected = booking.return_time.replace(tzinfo=ireland_offset)
                real_utc = corrected.astimezone(tz.utc)

                eta = real_utc + timedelta(minutes=15)
                send_completion_email.apply_async((booking.id,), eta=eta)

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

                # Generate and email the invoice    
                if not booking.email_sent:            
                    try:
                        response, error = generate_invoice(booking)
                        if error:
                            return HttpResponse(f'Error: {error}', status=500)
                        pdf_content = response.getvalue()
                        html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">Booking Confirmation – {booking.service.name}</h2>

        <p>Hi {booking.first_name},</p>

        <p>
        Thank you for choosing <strong>RS Express Parking</strong> – {booking.service.name}.
        We're happy to confirm that your booking has been successfully completed and your payment has been received.
        </p>

        <h3 style="color: #444;">🚗 Booking Summary</h3>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        <li><strong>Drop-Off Date & Time:</strong> {booking.departure_time}</li>
        <li><strong>Pick-Up Date & Time:</strong> {booking.return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        </ul>

        <h3 style="color: #444;">💳 Payment Details</h3>
        <ul>
        <li><strong>Total Paid:</strong> €{booking.discounted_price}</li>
        <li><strong>Payment Method:</strong> Stripe</li>
        </ul>

        <h3 style="color: #444;">📄 Your Invoice</h3>
        <p>
        You can download your invoice from the attached PDF.
        </p>

        <h3 style="color: #444;">📞 Important Instructions</h3>
        <ul>
            <li>
                Please make sure to <strong>call the driver at <a href="tel:+353834896505" style="color:#0066cc;">+353 83 489 6505</a> at least 30 minutes before your arrival and departure</strong> to ensure a smooth handover.
            </li>
            <li>
                For any other queries, feel free to reply to this email or contact us directly.
            </li>
        </ul>

        <p>
        Thanks again, and we look forward to seeing you soon!
        </p>

        <p>
        Warm regards,<br>
        <strong>The RS Express Parking Team</strong><br>
        <a href="https://rsexpressparking.com/" style="color: #0066cc;">rsexpressparking.com</a> | +353 1 964 0011
        </p>
    </body>
    </html>
    """
                        text_body = f"""
    Hi {booking.first_name},

    Thank you for choosing RS Express Parking – {booking.service.name}.

    We're happy to confirm that your booking has been successfully completed and your payment has been received.

    -----------------------------
    🚗 Booking Summary
    -----------------------------
    Booking ID: {booking.booking_id}
    Drop-Off Date & Time: {booking.departure_time}
    Pick-Up Date & Time: {booking.return_time}
    Vehicle: {booking.car_model} – {booking.car_registration_no}

    -----------------------------
    💳 Payment Details
    -----------------------------
    Total Paid: €{booking.discounted_price}
    Payment Method: Stripe

    -----------------------------
    📄 Your Invoice
    -----------------------------
    You can download your invoice from the attached PDF.

    -----------------------------
    📞 Important Instructions
    -----------------------------
    - Please make sure to call the driver at +353 83 489 6505 at least 30 minutes before your arrival and departure to ensure a smooth handover.
    - For any other queries, feel free to reply to this email or contact us directly.

    Thanks again, and we look forward to seeing you soon!

    Warm regards,  
    The RS Express Parking Team  
    https://rsexpressparking.com/ | +353 1 964 0011
    """


                        email = EmailMultiAlternatives(
                            subject="Booking Confirmation – " + str(booking.service.name),
                            body=text_body,
                            from_email='RS Express Parking <support@rsexpressparking.com>',
                            to=[booking.email],                        
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
            if not amount_to_verify:
                return Response({
                    'error': 'Amount is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get the booking
            booking = get_object_or_404(Booking, id=booking_id)
            
            # Calculate the actual amount
            service = booking.service
            duration = booking.return_time - booking.departure_time
            no_of_days = duration.days + (1 if duration.seconds > 0 else 0)
            
            total_days_price = no_of_days * service.per_day_price
            add_ons_price = sum(addon.price for addon in booking.add_ons.all())
            total_price = total_days_price + add_ons_price + service.base_price

            # Apply discount if coupon exists
            if booking.coupon and booking.coupon.is_valid():
                discount_amount = (total_price * booking.coupon.discount_percent) / 100
                total_price = total_price - discount_amount

            # Convert amount_to_verify to Decimal for comparison
            from decimal import Decimal
            amount_to_verify = Decimal(str(amount_to_verify))

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
            payment.save()

            return Response({
                'message': 'Payment status updated successfully',
                'payment_id': payment.id,
                'new_status': new_status.name
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)        