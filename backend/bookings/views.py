from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Booking
from .serializers import BookingSerializer
from core.permissions import IsManagerOrAdmin
from core.models import Status
from services.models import Coupon
from payments.models import Payment
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from django.template.loader import render_to_string
from payments.views import generate_invoice  # You need to implement this utility
from django.http import HttpResponse
import pytz



def send_reschedule_email(booking):
    departure_time = timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M')
    return_time = timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M')

    # Generate invoice PDF (implement this utility to return bytes or file path)
    response, error = generate_invoice(booking)
    if error:
        return HttpResponse(f'Error: {error}', status=500)
    pdf_content = response.getvalue()

    # --- Customer Email ---
    subject_customer = f"Your Booking Has Been Rescheduled – {booking.service.name}"
    html_body_customer = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">Booking Rescheduled – {booking.service.name}</h2>
        <p>
        Dear {booking.first_name},<br><br>
        Your booking has been <strong>successfully rescheduled</strong>. Please find your updated booking details below and download your updated invoice from the attachment.
        </p>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        <li><strong>New Drop-Off Date & Time:</strong> {departure_time}</li>
        <li><strong>New Pick-Up Date & Time:</strong> {return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        <li><strong>Service:</strong> {booking.service.name}</li>
        <li><strong>Add-ons:</strong> {', '.join([a.name for a in booking.add_ons.all()])}</li>
        </ul>
        <p>
        If you have any questions, please reply to this email or contact our support team.<br>
        <strong>RS Express Parking System</strong>
        </p>
    </body>
    </html>
    """
    text_body_customer = f"""
Dear {booking.first_name},

Your booking has been successfully rescheduled. Please find your updated booking details below and download your updated invoice from the attachment.

Booking ID: {booking.booking_id}
New Drop-Off Date & Time: {departure_time}
New Pick-Up Date & Time: {return_time}
Vehicle: {booking.car_model} – {booking.car_registration_no}
Service: {booking.service.name}
Add-ons: {', '.join([a.name for a in booking.add_ons.all()])}

If you have any questions, please reply to this email or contact our support team.

RS Express Parking System
"""

    email_user = EmailMultiAlternatives(
        subject=subject_customer,
        body=text_body_customer,
        from_email='RS Express Parking <support@rsexpressparking.com>',
        to=[booking.email],
    )
    email_user.attach_alternative(html_body_customer, "text/html")
    # Attach invoice PDF
    email_user.attach(f"Invoice_{booking.booking_id}.pdf", pdf_content, "application/pdf")
    email_user.send()

    # --- Manager Email ---
    subject_manager = f"Booking Rescheduled – {booking.service.name}"
    html_body_manager = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0066cc;">Booking Rescheduled – {booking.service.name}</h2>
        <p>
        The following booking has been <strong>rescheduled</strong>:
        </p>
        <ul>
        <li><strong>Booking ID:</strong> {booking.booking_id}</li>
        <li><strong>Customer Name:</strong> {booking.first_name} {booking.last_name}</li>
        <li><strong>Email:</strong> {booking.email}</li>
        <li><strong>Phone:</strong> {booking.contact_no}</li>
        <li><strong>New Drop-Off Date & Time:</strong> {departure_time}</li>
        <li><strong>New Pick-Up Date & Time:</strong> {return_time}</li>
        <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
        <li><strong>Service:</strong> {booking.service.name}</li>
        <li><strong>Add-ons:</strong> {', '.join([a.name for a in booking.add_ons.all()])}</li>
        </ul>
        <p>
        Please check the admin panel for more details or to manage this booking.<br>
        The updated invoice is attached.
        </p>
        <p>
        Regards,<br>
        <strong>RS Express Parking System</strong>
        </p>
    </body>
    </html>
    """
    text_body_manager = f"""
The following booking has been rescheduled:

Booking ID: {booking.booking_id}
Customer Name: {booking.first_name} {booking.last_name}
Email: {booking.email}
Phone: {booking.contact_no}
New Drop-Off Date & Time: {departure_time}
New Pick-Up Date & Time: {return_time}
Vehicle: {booking.car_model} – {booking.car_registration_no}
Service: {booking.service.name}
Add-ons: {', '.join([a.name for a in booking.add_ons.all()])}

Please check the admin panel for more details or to manage this booking.
The updated invoice is attached.

Regards,
RS Express Parking System
"""

    email_manager = EmailMultiAlternatives(
        subject=subject_manager,
        body=text_body_manager,
        from_email='RS Express Parking <support@rsexpressparking.com>',
        to=["rsexpressparking@gmail.com"],
    )
    email_manager.attach_alternative(html_body_manager, "text/html")
    email_manager.attach(f"Invoice_{booking.booking_id}.pdf", pdf_content, "application/pdf")
    email_manager.send()

class BookingListCreate(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        filter_type = request.query_params.get("type")
        now = timezone.now()
        bookings = Booking.objects.filter(user=request.user)

        if filter_type == "upcoming":
            bookings = bookings.filter(start_time__gt=now)
        elif filter_type == "past":
            bookings = bookings.filter(start_time__lt=now)

        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data
        coupon_id = data.get('coupon')  # Assuming the coupon ID is sent in the request

        # Check if a coupon is provided
        if coupon_id:
            now = timezone.now()
            coupon = Coupon.objects.filter(
                id=coupon_id,
                active=True,
                valid_from__lte=now,
                valid_to__gte=now
            ).first()

            if not coupon:
                return Response({'error': 'Invalid or expired coupon'}, status=400)

            if coupon.times_used >= coupon.max_uses:
                return Response({'error': 'Coupon has been fully used'}, status=400)            
        
        serializer = BookingSerializer(data=data)
        if serializer.is_valid():
            try:
                status_obj = Status.objects.get(name='Pending', type='booking')
                # Save booking with status
                booking = serializer.save(status=status_obj)
                response_serializer = BookingSerializer(booking)
                return Response(response_serializer.data, status=201)
            except Status.DoesNotExist:
                return Response(
                    {'error': 'System configuration error: Pending status not found'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=400)

class BookingRescheduleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        booking = get_object_or_404(Booking, id=pk, user=request.user)

        if booking.status.name.lower() in ['cancelled', 'completed']:
            return Response({'error': 'Cannot reschedule this booking.'}, status=400)

        start = request.data.get('departure_time')
        end = request.data.get('return_time')

        if not start or not end:
            return Response({'error': 'Both start and end times are required.'}, status=400)
        
        if isinstance(start, str):
            start = timezone.datetime.fromisoformat(start)
        if isinstance(end, str):
            end = timezone.datetime.fromisoformat(end)

        # Localize to Ireland timezone if naive
        ireland_tz = pytz.timezone('Europe/Dublin')
        if timezone.is_naive(start):
            start = ireland_tz.localize(start)
        if timezone.is_naive(end):
            end = ireland_tz.localize(end)

        booking.departure_time = start
        booking.return_time = end
        new_status = 'Rescheduled'
        status_obj = get_object_or_404(Status, name=new_status)
        booking.status = status_obj
        booking.save()

        send_reschedule_email(booking)

        return Response({'message': 'Booking rescheduled successfully.'})
    
class UserBookingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # Only admin/staff can access

    def get(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, id=user_id)
        bookings = Booking.objects.filter(user=user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)
    
class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, id=pk, user=request.user)

        if booking.status.name.lower() in ['cancelled', 'completed', 'started']:
            return Response({'error': 'Booking already finalized.'}, status=400)

        refund = request.data.get("refund", True)  # Default to refund if not provided

        new_status = 'Cancelled'
        status_obj = get_object_or_404(Status, name=new_status)
        booking.status = status_obj
        booking.save()

        # Prepare email details
        departure_time = timezone.localtime(booking.departure_time).strftime('%d %b %Y %H:%M')
        return_time = timezone.localtime(booking.return_time).strftime('%d %b %Y %H:%M')
        booking_amount = booking.discounted_price if booking.discounted_price and booking.discounted_price > 0 else booking.total_price
        refund_amount = max(0, booking_amount - 15)

        # --- Customer Email ---
        if refund:
            subject_customer = f"Your Booking Has Been Cancelled – Refund Initiated"
            html_body_customer = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                <h2 style="color: #e53935;">Booking Cancelled – Refund Initiated</h2>
                <p>
                Dear {booking.first_name},<br><br>
                We regret to inform you that your booking <strong>#{booking.booking_id}</strong> has been <strong>cancelled</strong>.<br>
                <b>€15</b> has been deducted as a cancellation fee.<br>
                The remaining amount of <b>€{refund_amount:.2f}</b> will be refunded to your original payment method.<br>
                <span style="color: #888;">Please note: Stripe may take 5-10 business days to process the refund.</span>
                </p>
                <ul>
                    <li><strong>Booking ID:</strong> {booking.booking_id}</li>
                    <li><strong>Drop-Off Date & Time:</strong> {departure_time}</li>
                    <li><strong>Pick-Up Date & Time:</strong> {return_time}</li>
                    <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
                    <li><strong>Service:</strong> {booking.service.name}</li>
                </ul>
                <p>
                If you have any questions, please reply to this email or contact our support team.<br>
                <strong>RS Express Parking System</strong>
                </p>
            </body>
            </html>
            """
            text_body_customer = f"""
        Dear {booking.first_name},

        We regret to inform you that your booking #{booking.booking_id} has been cancelled.
        €15 has been deducted as a cancellation fee.
        The remaining amount of €{refund_amount:.2f} will be refunded to your original payment method.
        Please note: Stripe may take 5-10 business days to process the refund.

        Booking ID: {booking.booking_id}
        Drop-Off Date & Time: {departure_time}
        Pick-Up Date & Time: {return_time}
        Vehicle: {booking.car_model} – {booking.car_registration_no}
        Service: {booking.service.name}

        If you have any questions, please reply to this email or contact our support team.

        RS Express Parking System
        """
        else:
            subject_customer = f"Your Booking Has Been Cancelled – Bonus Points Added"
            html_body_customer = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                <h2 style="color: #43a047;">Booking Cancelled – Bonus Points Added</h2>
                <p>
                Dear {booking.first_name},<br><br>
                Your booking <strong>#{booking.booking_id}</strong> has been <strong>cancelled</strong>.<br>
                <b>€15</b> has been deducted as a cancellation fee.<br>
                The remaining amount of <b>€{refund_amount:.2f}</b> has been instantly added to your account as bonus points.<br>
                <span style="color: #888;">You can use these points for discounts on your next booking.</span>
                </p>
                <ul>
                    <li><strong>Booking ID:</strong> {booking.booking_id}</li>
                    <li><strong>Drop-Off Date & Time:</strong> {departure_time}</li>
                    <li><strong>Pick-Up Date & Time:</strong> {return_time}</li>
                    <li><strong>Vehicle:</strong> {booking.car_model} – {booking.car_registration_no}</li>
                    <li><strong>Service:</strong> {booking.service.name}</li>
                </ul>
                <p>
                If you have any questions, please reply to this email or contact our support team.<br>
                <strong>RS Express Parking System</strong>
                </p>
            </body>
            </html>
            """
            text_body_customer = f"""
        Dear {booking.first_name},

        Your booking #{booking.booking_id} has been cancelled.
        €15 has been deducted as a cancellation fee.
        The remaining amount of €{refund_amount:.2f} has been instantly added to your account as bonus points.
        You can use these points for discounts on your next booking.

        Booking ID: {booking.booking_id}
        Drop-Off Date & Time: {departure_time}
        Pick-Up Date & Time: {return_time}
        Vehicle: {booking.car_model} – {booking.car_registration_no}
        Service: {booking.service.name}

        If you have any questions, please reply to this email or contact our support team.

        RS Express Parking System
        """

        email_user = EmailMultiAlternatives(
            subject=subject_customer,
            body=text_body_customer,
            from_email='RS Express Parking <support@rsexpressparking.com>',
            to=[booking.email],
        )
        email_user.attach_alternative(html_body_customer, "text/html")
        email_user.send()

        # --- Manager Email ---
        if refund:
            subject_manager = f"Booking Cancelled – Refund Required"
            html_body_manager = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                <h2 style="color: #e53935;">Booking Cancelled – Refund Required</h2>
                <p>
                The following booking has been <strong>cancelled</strong> and requires a refund to be processed via Stripe.<br>
                <b>€15</b> has been deducted as a cancellation fee.
                </p>
                <ul>
                    <li><strong>Booking ID:</strong> {booking.booking_id}</li>
                    <li><strong>Customer Name:</strong> {booking.first_name} {booking.last_name}</li>
                    <li><strong>Email:</strong> {booking.email}</li>
                    <li><strong>Phone:</strong> {booking.contact_no}</li>
                    <li><strong>Refund Amount:</strong> €{refund_amount:.2f}</li>
                    <li><strong>Service:</strong> {booking.service.name}</li>
                </ul>
                <p>
                Please process the refund in Stripe.<br>
                <strong>RS Express Parking System</strong>
                </p>
            </body>
            </html>
            """
            text_body_manager = f"""
        The following booking has been cancelled and requires a refund to be processed via Stripe.
        €15 has been deducted as a cancellation fee.

        Booking ID: {booking.booking_id}
        Customer Name: {booking.first_name} {booking.last_name}
        Email: {booking.email}
        Phone: {booking.contact_no}
        Refund Amount: €{refund_amount:.2f}
        Service: {booking.service.name}

        Please process the refund in Stripe.

        RS Express Parking System
        """
        else:
            subject_manager = f"Booking Cancelled – Bonus Points Issued"
            html_body_manager = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                <h2 style="color: #43a047;">Booking Cancelled – Bonus Points Issued</h2>
                <p>
                The following booking has been <strong>cancelled</strong> and the refund has been issued as bonus points.<br>
                <b>€15</b> has been deducted as a cancellation fee.
                </p>
                <ul>
                    <li><strong>Booking ID:</strong> {booking.booking_id}</li>
                    <li><strong>Customer Name:</strong> {booking.first_name} {booking.last_name}</li>
                    <li><strong>Email:</strong> {booking.email}</li>
                    <li><strong>Phone:</strong> {booking.contact_no}</li>
                    <li><strong>Bonus Points Added:</strong> €{refund_amount:.2f}</li>
                    <li><strong>Service:</strong> {booking.service.name}</li>
                </ul>
                <p>
                No Stripe refund is required for this booking.<br>
                <strong>RS Express Parking System</strong>
                </p>
            </body>
            </html>
            """
            text_body_manager = f"""
        The following booking has been cancelled and the refund has been issued as bonus points.
        €15 has been deducted as a cancellation fee.

        Booking ID: {booking.booking_id}
        Customer Name: {booking.first_name} {booking.last_name}
        Email: {booking.email}
        Phone: {booking.contact_no}
        Bonus Points Added: €{refund_amount:.2f}
        Service: {booking.service.name}

        No Stripe refund is required for this booking.

        RS Express Parking System
        """

        email_manager = EmailMultiAlternatives(
            subject=subject_manager,
            body=text_body_manager,
            from_email='RS Express Parking <support@rsexpressparking.com>',
            to=["rsexpressparking@gmail.com"],
        )
        email_manager.attach_alternative(html_body_manager, "text/html")
        email_manager.send()

        return Response({'message': 'Booking cancelled successfully.'})
    

class ManagerBookingList(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        bookings = Booking.objects.all()
        service = request.query_params.get('service')
        status = request.query_params.get('status')
        start_date = request.query_params.get('start')
        end_date = request.query_params.get('end')

        if service:
            bookings = bookings.filter(service__name__icontains=service)
        if status:
            bookings = bookings.filter(status__name__iexact=status)
        if start_date and end_date:
            bookings = bookings.filter(start_time__date__gte=start_date, end_time__date__lte=end_date)

        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

class ManagerBookingStatusUpdate(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, id=pk)
        new_status = request.data.get('status')

        if new_status not in ['Completed', 'Cancelled']:
            return Response({'error': 'Invalid status. Allowed: Completed or Cancelled'}, status=400)

        status_obj = get_object_or_404(Status, name=new_status)
        booking.status = status_obj
        booking.save()
        return Response({'message': f'Booking marked as {new_status}.'})
    
class BookingDetailView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, pk):
        try:
            # If user is manager, allow access to any booking            
            booking = get_object_or_404(Booking, id=pk)
            
            serializer = BookingSerializer(booking)
            return Response(serializer.data)
        
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )    
        
class UpdatePaymentStatusView(APIView):
    permission_classes = [AllowAny]
    def patch(self, request, payment_id):
        try:
            payment = get_object_or_404(Payment, id=payment_id)
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