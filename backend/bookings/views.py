from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from .models import Booking, BookingUser, normalize_phone_number
from .serializers import (
    BookingSerializer,
    BookingUserSerializer,
    StaffBookingListSerializer,
    StaffBookingDetailSerializer,
    StaffBookingUpdateSerializer,
    StaffBookingCreateSerializer,
    StaffBookingStatusActionSerializer,
    StaffBookingBulkActionSerializer,
    SupplierBookingSerializer,
)
from core.permissions import IsManagerOrAdmin, IsStaffDashboardUser, IsSupplier, is_full_super_admin
from core.models import Status, BookingSettings
from services.models import Coupon
from payments.models import Payment
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, get_connection
from django.utils import timezone
from django.template.loader import render_to_string
from payments.views import (
    generate_invoice,
    generate_booking_form_pdf,
    send_booking_confirmation_email,
    send_manager_new_booking_email,
)
from django.http import HttpResponse
from django.http import QueryDict
from django.contrib import admin
from types import SimpleNamespace
from .admin import BookingAdmin
import pytz
from celery import current_app
from datetime import datetime, timedelta
from decouple import config
from payments.views import calculate_parking_days  # Make sure this import is at the top
from django.db.models import Q, Value
from django.db.models.functions import Lower, Replace
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
from .tasks import (
    send_reschedule_email_task,
    send_cancellation_email_task,
    send_booking_updated_email,
    send_supplier_booking_manager_notification,
)
from .cancellation import credit_cancellation_points
from .update_email import build_update_email_changes
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


class StaffBookingPagination(PageNumberPagination):
    """Bounded pagination for the operations bookings table."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def get_staff_booking_queryset(user):
    """Return the bookings visible to a staff-dashboard user.

    Every staff booking endpoint must start with this scope before selecting
    an object or applying request-controlled filtering.
    """
    queryset = Booking.objects.all()
    if is_full_super_admin(user):
        return queryset
    if getattr(user, 'is_manager', False):
        return queryset.exclude(status__name__iexact='pending').exclude(
            status__name__iexact='payment failed'
        )
    # IsStaffDashboardUser guarantees an active supplier profile here.
    return queryset.filter(supplier=user.supplier_profile)


def staff_booking_bulk_actions(user):
    """Return the bulk operations available to this staff role.

    This mirrors ``BookingAdmin.get_actions``: managers do not receive invoice
    downloads, while full administrators and suppliers retain the actions
    available to them in Django Admin.  The endpoint repeats this check; this
    capability data is only for presenting the React toolbar.
    """
    return {
        'xlsx': True,
        'pdf': True,
        'invoice_zip': not getattr(user, 'is_manager', False),
        'booking_form_zip': True,
    }


class StaffBookingBulkAction(APIView):
    """Run an existing Django Admin selected-booking export on safe IDs only."""

    permission_classes = [IsStaffDashboardUser]

    ACTION_METHODS = {
        'xlsx': 'export_as_csv',
        'pdf': 'export_as_pdf',
        'invoice-zip': 'download_invoices_zip',
        'booking-form-zip': 'download_booking_forms_zip',
    }
    DATE_FILTER_MAP = {
        'departure_date_from': 'departure_time__gte',
        'departure_date_to': 'departure_time__lt',
        'return_date_from': 'return_time__gte',
        'return_date_to': 'return_time__lt',
        'created_date_from': 'created_at__gte',
        'created_date_to': 'created_at__lt',
    }

    def post(self, request, action):
        method_name = self.ACTION_METHODS.get(action)
        if method_name is None:
            return Response({'detail': 'Unknown bulk booking action.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StaffBookingBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not self._is_action_allowed(request.user, action):
            return Response(
                {'detail': 'You are not allowed to run this bulk booking action.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        selected_ids = list(dict.fromkeys(serializer.validated_data['ids']))
        queryset = (
            get_staff_booking_queryset(request.user)
            .filter(pk__in=selected_ids)
            .select_related('service', 'status', 'supplier')
            .prefetch_related('add_ons')
        )
        # Avoid disclosing which hand-crafted ID was outside the caller's
        # scope.  A supplier must only ever export its own selected bookings.
        if queryset.count() != len(selected_ids):
            return Response(
                {'detail': 'One or more selected bookings are unavailable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        admin_request = SimpleNamespace(GET=self._admin_export_query(serializer.validated_data))
        booking_admin = BookingAdmin(Booking, admin.site)
        try:
            return getattr(booking_admin, method_name)(admin_request, queryset)
        except Exception:
            # Keep operational logs useful without recording booking contents,
            # customer data, request bodies, or authentication material.
            logger.error(
                'Staff bulk booking action failed: action=%s actor_id=%s selected_count=%s',
                action,
                request.user.pk,
                len(selected_ids),
            )
            return Response(
                {'detail': 'Unable to prepare this bulk download.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @staticmethod
    def _is_action_allowed(user, action):
        capabilities = staff_booking_bulk_actions(user)
        capability_name = action.replace('-', '_')
        return capabilities.get(capability_name, False)

    def _admin_export_query(self, validated_data):
        """Translate dashboard filter names to the existing Admin contract."""
        query = QueryDict('', mutable=True)
        for dashboard_name, admin_name in self.DATE_FILTER_MAP.items():
            value = validated_data.get(dashboard_name)
            if value:
                query[admin_name] = value.isoformat()
        return query


class StaffBookingList(APIView):
    """Read-only bookings list for the future staff dashboard.

    Role scoping is deliberately applied before any request-controlled search
    or filters. This makes supplier isolation a backend guarantee.
    """

    permission_classes = [IsStaffDashboardUser]
    pagination_class = StaffBookingPagination

    ORDERING_FIELDS = {
        'created_at': 'created_at',
        'departure_time': 'departure_time',
        'return_time': 'return_time',
        'booking_id': 'booking_id',
        'status': 'status__name',
        'service': 'service__name',
    }

    DATE_FILTERS = {
        'departure': 'departure_time',
        'return': 'return_time',
        'created': 'created_at',
    }

    def get(self, request):
        queryset = self._role_scoped_queryset(request)
        queryset = self._apply_search(queryset, request.query_params.get('search', ''))
        queryset = self._apply_filters(queryset, request)
        queryset = self._apply_ordering(queryset, request.query_params.get('ordering', '-created_at'))

        queryset = queryset.select_related('service', 'status', 'supplier').prefetch_related('add_ons')
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = StaffBookingListSerializer(page, many=True, context={'request': request})
        response = paginator.get_paginated_response(serializer.data)
        response.data['bulk_actions'] = staff_booking_bulk_actions(request.user)
        return response

    def _role_scoped_queryset(self, request):
        return get_staff_booking_queryset(request.user)

    def _apply_search(self, queryset, raw_search):
        search = (raw_search or '').strip()
        if not search:
            return queryset

        search_without_spaces = search.replace(' ', '')
        search_without_dashes = search.replace('-', '')
        search_digits = ''.join(character for character in search if character.isdigit())
        normalized_phone = normalize_phone_number(search)
        search_query = (
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
            | Q(contact_no__icontains=search)
            | Q(car_registration_no__icontains=search)
            | Q(booking_id__icontains=search)
            | Q(source_channel__icontains=search)
            | Q(utm_campaign__icontains=search)
        )

        if search_digits:
            search_query |= Q(contact_no_normalized__icontains=search_digits)
        if normalized_phone:
            search_query |= Q(contact_no_normalized__icontains=normalized_phone)

        if search.isdigit():
            search_query |= Q(pk=int(search))

        # These annotations match the BookingAdmin normalization behavior.
        queryset = queryset.annotate(
            normalized_registration=Replace('car_registration_no', Value(' '), Value('')),
            normalized_booking_id=Lower(Replace('booking_id', Value('-'), Value(''))),
        )
        if search_without_spaces:
            search_query |= Q(normalized_registration__icontains=search_without_spaces)
        if search_without_dashes:
            search_query |= Q(normalized_booking_id__icontains=search_without_dashes.lower())

        return queryset.filter(search_query).distinct()

    def _apply_filters(self, queryset, request):
        params = request.query_params
        user = request.user
        queryset = self._apply_date_filters(queryset, params)

        status_id = self._optional_positive_int(params, 'status')
        if status_id is not None:
            queryset = queryset.filter(status_id=status_id)

        service_id = self._optional_positive_int(params, 'service')
        if service_id is not None:
            queryset = queryset.filter(service_id=service_id)

        is_full_admin = is_full_super_admin(user)
        for restricted_filter in ('website', 'supplier', 'source'):
            if params.get(restricted_filter, '').strip() and not is_full_admin:
                raise ValidationError({
                    restricted_filter: 'This filter is available only to full super-admins.'
                })

        if not is_full_admin:
            return queryset

        website = params.get('website', '').strip()
        if website:
            # Match BookingAdmin's website filter: website filters exclude
            # supplier-created bookings.
            queryset = queryset.filter(website=website, supplier__isnull=True)

        supplier = params.get('supplier', '').strip()
        if supplier == 'all_suppliers':
            queryset = queryset.filter(supplier__isnull=False)
        elif supplier:
            supplier_id = self._positive_int(supplier, 'supplier')
            queryset = queryset.filter(supplier_id=supplier_id)

        source = params.get('source', '').strip()
        if source:
            queryset = queryset.filter(source_channel=source)

        return queryset

    def _apply_date_filters(self, queryset, params):
        """Mirror BookingAdmin's OR-across-active-date-fields behavior."""
        date_conditions = []
        for prefix, field_name in self.DATE_FILTERS.items():
            start = self._parse_date(params.get(f'{prefix}_date_from'), f'{prefix}_date_from')
            end = self._parse_date(params.get(f'{prefix}_date_to'), f'{prefix}_date_to')
            if not start and not end:
                continue
            if start and end and start > end:
                raise ValidationError({
                    f'{prefix}_date_to': 'Must be on or after the start date.'
                })

            condition = Q()
            if start:
                condition &= Q(**{f'{field_name}__gte': timezone.make_aware(datetime.combine(start, datetime.min.time()))})
            if end:
                end_exclusive = timezone.make_aware(
                    datetime.combine(end + timedelta(days=1), datetime.min.time())
                )
                condition &= Q(**{f'{field_name}__lt': end_exclusive})
            date_conditions.append(condition)

        if not date_conditions:
            return queryset

        combined_condition = date_conditions[0]
        for condition in date_conditions[1:]:
            combined_condition |= condition
        return queryset.filter(combined_condition).distinct()

    def _apply_ordering(self, queryset, raw_ordering):
        ordering = (raw_ordering or '-created_at').strip()
        descending = ordering.startswith('-')
        requested_field = ordering[1:] if descending else ordering
        model_field = self.ORDERING_FIELDS.get(requested_field)
        if model_field is None:
            allowed = ', '.join(sorted(self.ORDERING_FIELDS))
            raise ValidationError({'ordering': f'Use one of: {allowed}.'})

        prefix = '-' if descending else ''
        return queryset.order_by(f'{prefix}{model_field}', f'{prefix}id')

    @staticmethod
    def _optional_positive_int(params, name):
        raw_value = params.get(name, '').strip()
        if not raw_value:
            return None
        return StaffBookingList._positive_int(raw_value, name)

    @staticmethod
    def _positive_int(raw_value, name):
        try:
            value = int(raw_value)
        except (TypeError, ValueError) as exc:
            raise ValidationError({name: 'Must be a positive numeric ID.'}) from exc
        if value <= 0:
            raise ValidationError({name: 'Must be a positive numeric ID.'})
        return value

    @staticmethod
    def _parse_date(raw_value, name):
        if not raw_value:
            return None
        try:
            return datetime.strptime(raw_value, '%Y-%m-%d').date()
        except (TypeError, ValueError) as exc:
            raise ValidationError({name: 'Use YYYY-MM-DD.'}) from exc


class StaffBookingCreate(APIView):
    """Create one booking through the operations dashboard only."""

    permission_classes = [IsStaffDashboardUser]

    def post(self, request):
        serializer = StaffBookingCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        if booking.supplier_id:
            self._notify_supplier_booking_created(booking)
        elif booking.status and booking.status.name.lower() == 'confirmed' and not booking.email_sent:
            self._notify_confirmed_staff_booking(booking)

        booking = StaffBookingDetail._detail_queryset(request).get(pk=booking.pk)
        return Response(
            StaffBookingDetailSerializer(booking, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _notify_confirmed_staff_booking(booking):
        """Match Django Admin's non-supplier confirmed-booking behaviour."""
        try:
            pdf_content = send_booking_confirmation_email(booking)
            send_manager_new_booking_email(booking, pdf_content)
        except Exception:
            # Keep the successful booking record, just as Django Admin does
            # when an email/PDF provider has a temporary failure.
            logger.error('Staff-created booking email failed for booking %s', booking.pk)

    @staticmethod
    def _notify_supplier_booking_created(booking):
        """Preserve the existing supplier-create manager notification."""
        try:
            send_supplier_booking_manager_notification.delay(booking.id)
        except Exception:
            logger.error(
                'Supplier booking manager notification failed for booking %s',
                booking.pk,
            )


class StaffBookingDetail(APIView):
    """Read-only, role-scoped booking detail for the staff dashboard."""

    permission_classes = [IsStaffDashboardUser]

    def get(self, request, pk):
        queryset = self._detail_queryset(request)
        booking = get_object_or_404(queryset, pk=pk)

        # Preserve the existing Django Admin change-view behaviour: opening a
        # staff detail marks a previously unseen booking as viewed.
        if not booking.is_viewed:
            booking.is_viewed = True
            booking.save(update_fields=['is_viewed'])

        serializer = StaffBookingDetailSerializer(booking, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        booking = get_object_or_404(self._detail_queryset(request), pk=pk)
        serializer = StaffBookingUpdateSerializer(
            booking,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated_booking = serializer.save()
        return Response(
            StaffBookingDetailSerializer(updated_booking, context={'request': request}).data
        )

    @staticmethod
    def _detail_queryset(request):
        return (
            get_staff_booking_queryset(request.user)
            .select_related('service', 'status', 'supplier', 'coupon')
            .prefetch_related('add_ons')
        )


class StaffBookingDocument(APIView):
    """Authenticated PDF download for a booking visible to the staff user."""

    permission_classes = [IsStaffDashboardUser]

    def get(self, request, pk, document_type):
        booking = get_object_or_404(StaffBookingDetail._detail_queryset(request), pk=pk)

        if document_type == 'invoice':
            # This mirrors Django Admin: managers may download booking forms,
            # but invoice access is reserved for full admins and suppliers.
            if getattr(request.user, 'is_manager', False):
                return Response({'detail': 'You are not allowed to download this invoice.'}, status=status.HTTP_403_FORBIDDEN)
            response, error = generate_invoice(booking)
            filename_prefix = 'Invoice'
        elif document_type == 'booking-form':
            response, error = generate_booking_form_pdf(booking)
            filename_prefix = 'BookingForm'
        else:
            return Response({'detail': 'Unknown booking document.'}, status=status.HTTP_404_NOT_FOUND)

        if error:
            # Deliberately do not interpolate the generator exception: it can
            # originate in a template or provider and may contain PII.
            logger.error(
                'Staff document generation failed: document_type=%s booking_id=%s',
                document_type,
                booking.pk,
            )
            return Response({'detail': 'Unable to generate this document.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response['Content-Disposition'] = (
            f'attachment; filename="{filename_prefix}-{booking.booking_id or booking.pk}.pdf"'
        )
        return response


class StaffBookingStatusAction(APIView):
    """Explicit allow-listed status actions for one role-scoped booking."""

    permission_classes = [IsStaffDashboardUser]

    def post(self, request, pk):
        booking = get_object_or_404(StaffBookingDetail._detail_queryset(request), pk=pk)
        serializer = StaffBookingStatusActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking.status = serializer.validated_data['status']
        booking.full_clean()
        booking.save(update_fields=['status', 'contact_no_normalized', 'modified_at'])

        # Existing manager status updates only persist the status. Notification
        # behaviour deliberately remains in Chunk 7's explicit email action.
        return Response(
            StaffBookingDetailSerializer(booking, context={'request': request}).data
        )


class StaffBookingSaveAndNotify(APIView):
    """Save role-permitted changes and explicitly notify the customer."""

    permission_classes = [IsStaffDashboardUser]

    def post(self, request, pk):
        if not request.data:
            raise ValidationError({'non_field_errors': 'Provide at least one booking change.'})

        booking = get_object_or_404(StaffBookingDetail._detail_queryset(request), pk=pk)
        original = (
            get_staff_booking_queryset(request.user)
            .select_related('service', 'status', 'supplier', 'coupon')
            .prefetch_related('add_ons')
            .get(pk=booking.pk)
        )
        serializer = StaffBookingUpdateSerializer(
            booking,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated_booking = serializer.save()
        changed_fields = list(serializer.validated_data.keys())
        update_changes = build_update_email_changes(
            original,
            updated_booking,
            changed_fields,
        )

        is_cancellation = (
            'status' in serializer.validated_data
            and updated_booking.status
            and updated_booking.status.name.lower() == 'cancelled'
        )
        notification = self._dispatch_notification(
            updated_booking,
            update_changes,
            is_cancellation,
        )
        return Response({
            'booking': StaffBookingDetailSerializer(
                updated_booking,
                context={'request': request},
            ).data,
            'notification': notification,
        })

    @staticmethod
    def _dispatch_notification(booking, update_changes, is_cancellation):
        task = send_cancellation_email_task if is_cancellation else send_booking_updated_email
        args = (booking.id, 'admin_cancelled') if is_cancellation else (booking.id, update_changes)
        notification_type = 'cancellation' if is_cancellation else 'update'

        try:
            task.delay(*args)
            return {
                'status': 'queued',
                'type': notification_type,
                'message': 'Notification has been queued for delivery.',
            }
        except Exception:
            # Match the Django Admin's broker-failure fallback. Report a
            # failure explicitly if the inline send also fails.
            try:
                task(*args)
                return {
                    'status': 'sent',
                    'type': notification_type,
                    'message': 'Notification was sent directly.',
                }
            except Exception:
                logger.error(
                    'Staff notification failed: booking_id=%s notification_type=%s',
                    booking.pk,
                    notification_type,
                )
                return {
                    'status': 'failed',
                    'type': notification_type,
                    'message': 'Booking saved, but the customer notification could not be sent.',
                }

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
