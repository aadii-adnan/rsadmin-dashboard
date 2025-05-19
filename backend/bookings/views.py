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

            # Increment the coupon's times_used
            coupon.times_used += 1
            coupon.save()
        
        serializer = BookingSerializer(data=data)
        if serializer.is_valid():
            try:
                status_obj = Status.objects.get(name='Pending', type='booking')
                # Save booking with status
                booking = serializer.save(status=status_obj)
                return Response(serializer.data, status=201)
            except Status.DoesNotExist:
                return Response(
                    {'error': 'System configuration error: Pending status not found'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=400)

class BookingRescheduleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        booking = get_object_or_404(Booking, id=pk, user=request.user)

        if booking.status.name.lower() in ['cancelled', 'completed']:
            return Response({'error': 'Cannot reschedule this booking.'}, status=400)

        start = request.data.get('start_time')
        end = request.data.get('end_time')

        if not start or not end:
            return Response({'error': 'Both start and end times are required.'}, status=400)

        booking.departure_time = start
        booking.return_time = end
        new_status = 'Rescheduled'
        status_obj = get_object_or_404(Status, name=new_status)
        booking.status = status_obj
        booking.save()

        return Response({'message': 'Booking rescheduled successfully.'})
    
class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, id=pk, user=request.user)

        if booking.status.name.lower() in ['cancelled', 'completed']:
            return Response({'error': 'Booking already finalized.'}, status=400)

        new_status = 'Cancelled'
        status_obj = get_object_or_404(Status, name=new_status)
        booking.status = status_obj
        booking.save()
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