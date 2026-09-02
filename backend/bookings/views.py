from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Booking, BookingUser
from .serializers import BookingSerializer, BookingUserSerializer, SupplierBookingSerializer
from core.permissions import IsManagerOrAdmin, IsSupplier
from core.models import Status, BookingSettings
from services.models import Coupon
from payments.models import Payment
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, get_connection
from django.utils import timezone
from django.template.loader import render_to_string
from payments.views import generate_invoice  # You need to implement this utility
from django.http import HttpResponse
import pytz
from celery import current_app
from datetime import timedelta
from decouple import config
from payments.views import calculate_parking_days  # Make sure this import is at the top
from django.db.models import Q
from django.db import IntegrityError, transaction
import hashlib
import json
import uuid
from .booking_rules import (
    compute_reschedule_pricing,
    find_succeeded_extra_payment,
    get_cancellation_policy,
    parse_and_localize,
    validate_reschedule,
)
from .tasks import send_reschedule_email_task, send_cancellation_email_task
from .cancellation import credit_cancellation_points
import logging

logger = logging.getLogger(__name__)

BOOKING_FINGERPRINT_FIELDS = (
    'service', 'user', 'booking_user',
    'car_registration_no', 'car_model', 'car_colour', 'car_manufacturer',
    'departure_terminal', 'return_terminal',
    'departure_flight_number', 'return_flight_number',
    'first_name', 'last_name', 'email', 'contact_no', 'total_passengers',
    'departure_time', 'return_time',
    'total_price', 'coupon', 'discounted_price', 'website', 'add_ons',
)


def parse_idempotency_key(request):
    raw_key = (request.headers.get('Idempotency-Key') or '').strip()
    if not raw_key:
        return None, None
    try:
        return uuid.UUID(raw_key), None
    except (ValueError, AttributeError):
        return None, Response(
            {'error': 'Idempotency-Key must be a valid UUID.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def booking_submission_fingerprint(data):
    material = {field: data.get(field) for field in BOOKING_FINGERPRINT_FIELDS}
    if isinstance(material.get('add_ons'), (list, tuple)):
        material['add_ons'] = sorted(str(value) for value in material['add_ons'])
    canonical = json.dumps(material, sort_keys=True, separators=(',', ':'), default=str)
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def replay_booking_response(booking, fingerprint):
    if booking.submission_fingerprint != fingerprint:
        return Response(
            {'error': 'This Idempotency-Key was already used for different booking details.'},
            status=status.HTTP_409_CONFLICT,
        )
    return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)


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
        submission_key, key_error = parse_idempotency_key(request)
        if key_error:
            return key_error
        fingerprint = booking_submission_fingerprint(data) if submission_key else None

        if submission_key:
            existing = Booking.objects.filter(submission_key=submission_key).first()
            if existing:
                return replay_booking_response(existing, fingerprint)

        coupon_id = data.get('coupon')  # Assuming the coupon ID is sent in the request

        # Check if a coupon is provided
        if coupon_id:
            now = timezone.now()
            try:
                coupon = Coupon.objects.get(id=coupon_id, active=True, valid_from__lte=now)
            except Coupon.DoesNotExist:
                return Response({'error': 'Invalid or expired coupon'}, status=400)

            if not coupon.is_valid():
                return Response({'error': 'Invalid or expired coupon'}, status=400)

            if coupon.times_used >= coupon.max_uses:
                return Response({'error': 'Coupon has been fully used'}, status=400)

            # Check minimum order value
            total_price = data.get('total_price')
            if total_price is not None and coupon.minimum_order_value > 0:
                try:
                    total = float(total_price)
                except (ValueError, TypeError):
                    total = 0
                if total < float(coupon.minimum_order_value):
                    return Response({
                        'error': f'This coupon requires a minimum order of \u20ac{coupon.minimum_order_value:g}. Your current total is \u20ac{total:.2f}.'
                    }, status=400)
        
        serializer = BookingSerializer(data=data)
        if serializer.is_valid():
            try:
                booking_user = serializer.validated_data.get('booking_user')
                if (
                    submission_key
                    and booking_user
                    and booking_user.journey_key != submission_key
                ):
                    return Response(
                        {'error': 'The booking lead does not belong to this booking journey.'},
                        status=status.HTTP_409_CONFLICT,
                    )
                status_obj = Status.objects.get(name='Pending', type='booking')
                with transaction.atomic():
                    booking = serializer.save(
                        status=status_obj,
                        submission_key=submission_key,
                        submission_fingerprint=fingerprint,
                    )
                response_serializer = BookingSerializer(booking)
                return Response(response_serializer.data, status=201)
            except IntegrityError:
                if submission_key:
                    existing = Booking.objects.filter(submission_key=submission_key).first()
                    if existing:
                        return replay_booking_response(existing, fingerprint)
                raise
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

        start = request.data.get('departure_time')
        end = request.data.get('return_time')
        if not start or not end:
            return Response({'error': 'Both start and end times are required.'}, status=400)

        start = parse_and_localize(start)
        end = parse_and_localize(end)

        rule_error = validate_reschedule(booking, start, end)
        if rule_error:
            return Response({'error': rule_error}, status=400)

        pricing = compute_reschedule_pricing(booking, start, end)
        # Pending bookings haven't been paid yet — the extension just raises
        # the price they'll pay. Paid bookings must pay the extension first.
        status_name = booking.status.name.lower() if booking.status else ''
        if pricing['extra_amount'] > 0 and status_name in ('confirmed', 'rescheduled', 'started'):
            payment = find_succeeded_extra_payment(booking, pricing['extra_amount'])
            if not payment:
                return Response({
                    'error': 'payment_required',
                    'message': 'The extension must be paid before the booking can be rescheduled.',
                    'extra_amount': float(pricing['extra_amount']),
                }, status=402)

        was_started = status_name == 'started'

        booking.departure_time = start
        booking.return_time = end
        booking.total_price = pricing['new_total_price']
        booking.discounted_price = pricing['new_discounted_price']
        if not was_started:
            # A Started booking keeps its status so the in-progress state
            # isn't lost (the beat task would only flip it back later).
            booking.status = get_object_or_404(Status, name='Rescheduled', type='booking')
        booking.save()

        send_reschedule_email_task.delay(booking.id)

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

        policy = get_cancellation_policy(booking)
        if not policy['allowed']:
            return Response({'error': policy['reason']}, status=400)

        refund = request.data.get("refund", True)  # Default to refund if not provided

        booking.status = get_object_or_404(Status, name='Cancelled', type='booking')
        booking.save()

        bonus_points = None
        if not policy['refund_eligible']:
            # Cancelled within the no-refund window: nothing is returned.
            outcome = 'no_refund'
        elif refund:
            outcome = 'refund'
        else:
            outcome = 'points'
            balance, _ = credit_cancellation_points(booking, request.user)
            bonus_points = float(balance)

        send_cancellation_email_task.delay(booking.id, outcome)

        response_data = {
            'message': 'Booking cancelled successfully.',
            'outcome': outcome,
            'refund_eligible': policy['refund_eligible'],
        }
        if bonus_points is not None:
            response_data['bonus_points'] = bonus_points
        return Response(response_data)


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

        allowed_statuses = ['Completed', 'Cancelled', 'No Show', 'Missed Pickup']
        if new_status not in allowed_statuses:
            return Response(
                {'error': f"Invalid status. Allowed: {', '.join(allowed_statuses)}"},
                status=400,
            )

        status_obj = get_object_or_404(Status, name=new_status, type='booking')
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

    def put(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)
        serializer = BookingSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400) 
        
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
        
class BookingUserCreateView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        journey_key, key_error = parse_idempotency_key(request)
        if key_error:
            return key_error

        if journey_key:
            existing = BookingUser.objects.filter(journey_key=journey_key).first()
            if existing:
                serializer = BookingUserSerializer(existing, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data, status=status.HTTP_200_OK)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = BookingUserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    serializer.save(journey_key=journey_key)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except IntegrityError:
                if journey_key:
                    existing = BookingUser.objects.filter(journey_key=journey_key).first()
                    if existing:
                        return Response(
                            BookingUserSerializer(existing).data,
                            status=status.HTTP_200_OK,
                        )
                raise
        return Response(serializer.errors, status=400)

class BookingUserStatusUpdateView(APIView):
    permission_classes = [AllowAny]
    def put(self, request, pk):
        try:
            booking_user = BookingUser.objects.get(pk=pk)
            status_value = request.data.get('booking_completion_status')
            if status_value is None:
                return Response({'error': 'booking_completion_status is required'}, status=400)
            booking_user.booking_completion_status = bool(status_value)
            booking_user.save()
            return Response({'message': 'Status updated', 'booking_completion_status': booking_user.booking_completion_status})
        except BookingUser.DoesNotExist:
            return Response({'error': 'BookingUser not found'}, status=404)


class SupplierBookingCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSupplier]

    def post(self, request):
        supplier = request.user.supplier_profile
        serializer = SupplierBookingSerializer(data=request.data, context={'supplier': supplier})
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        try:
            confirmed_status = Status.objects.get(name='Confirmed', type='booking')
        except Status.DoesNotExist:
            return Response({'error': 'System configuration error: Confirmed status not found'}, status=500)

        booking = serializer.save(supplier=supplier, status=confirmed_status)

        from .tasks import send_supplier_booking_manager_notification

        def queue_manager_notification():
            try:
                send_supplier_booking_manager_notification.delay(booking.id)
            except Exception:
                logger.exception(
                    "Failed to queue supplier booking manager notification for booking %s",
                    booking.id,
                )

        transaction.on_commit(queue_manager_notification)

        return Response(SupplierBookingSerializer(booking).data, status=201)
