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
from django.core.mail import EmailMessage
from django.conf import settings
from django.contrib.auth import get_user_model
from services.models import Service
from django.utils import timezone
from services.models import Coupon
from django.utils import timezone
import random
import string
from datetime import timedelta
from core.models import Status

def generate_coupon_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
class PaymentList(APIView):
    def get(self, request):
        payments = Payment.objects.all()
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)


class CreateStripePaymentIntent(APIView):
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

            status = 'created'
            status_obj = get_object_or_404(Status, name=status)

            # Save to Payment model
            Payment.objects.create(
                booking=booking,
                stripe_payment_intent=intent['id'],
                stripe_customer_id=customer.id,
                amount=booking.total_price,
                status=status_obj
            )

            return Response({
                'clientSecret': intent['client_secret']
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        

class StripeWebhookView(APIView):
    permission_classes = []

    @method_decorator(csrf_exempt)
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
                new_status = 'Succeeded'
                status_obj = get_object_or_404(Status, name=new_status)
                payment.status = status_obj
                payment.save()

                # Award a new coupon to the user
                code = generate_coupon_code()
                valid_from = timezone.now()
                valid_to = valid_from + timedelta(days=30)

                coupon = Coupon.objects.create(
                    code=code,
                    discount_percent=10,  # You can customize this
                    valid_from=valid_from,
                    valid_to=valid_to,
                    user=booking.user,
                    active=True
                )

                booking = payment.booking

                # Generate invoice using xhtml2pdf
                template = get_template('payments/invoice.html')
                html = template.render({'booking': booking, 'payment': payment})
                pdf_file = HttpResponse(content_type='application/pdf')
                pisa.CreatePDF(html, dest=pdf_file)
                pdf_content = pdf_file.getvalue()

                # Send invoice by email
                email = EmailMessage(
                    subject=f"Invoice for Booking #{booking.id}",
                    body="Attached is your invoice for the recent booking.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[booking.email],
                )
                email.attach(f"Invoice-{booking.id}.pdf", pdf_content, 'application/pdf')
                email.send()

            elif event['type'] == 'payment_intent.payment_failed':
                intent = event['data']['object']
                payment_intent_id = intent['id']
                payment = Payment.objects.get(stripe_payment_intent=payment_intent_id)
                new_status = 'Failed'
                status_obj = get_object_or_404(Status, name=new_status)
                payment.status = status_obj
                payment.save()

        except stripe.error.SignatureVerificationError:
            return HttpResponse(status=400)
        except Exception as e:
            return HttpResponse(f"Error: {str(e)}", status=400)

        return HttpResponse(status=200)
    

class InvoiceDownloadView(APIView):
    def get(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)
        user = get_user_model().objects.get(id = booking.user_id)
        payment = get_object_or_404(Payment, booking=booking)
        service = Service.objects.get(id = booking.service_id)
        add_ons = booking.add_ons.all()

        duration =  booking.return_time - booking.departure_time
        no_of_days = duration.days + (1 if duration.seconds > 0 else 0)

        total_days_price = no_of_days * service.per_day_price
        add_ons_price = sum(addon.price for addon in add_ons)
        total_price = total_days_price + add_ons_price + service.base_price

        template = get_template('payments/invoice.html')
        html = template.render({'booking': booking, 'payment': payment, 'user': user, 'service' : service, "no_of_days": no_of_days, "total_days_price": total_days_price, "add_ons": add_ons, "total_price": total_price})

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice-{booking.id}.pdf"'

        pisa_status = pisa.CreatePDF(html, dest=response)

        if pisa_status.err:
            return HttpResponse('We had some errors <pre>' + html + '</pre>')
        return response  