from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Booking
from .serializers import BookingSerializer
from django.utils import timezone
from core.permissions import IsManagerOrAdmin
from core.models import Status

class BookingListCreate(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
        serializer = BookingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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