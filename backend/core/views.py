from .models import Status,  BookingSettings, OrderLimit, MarketingLead
from bookings.models import Booking
from .serializers import StatusSerializer, BookingSettingsSerializer, OrderLimitSerializer, MarketingLeadSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from datetime import datetime, time
from django.utils import timezone
from rest_framework import status
import secrets
import string
from services.models import Coupon

class StatusListView(APIView):
    def get(self, request):
        status_type = request.query_params.get('type')
        if not status_type:
            statuses =  Status.objects.all()
        else:
            statuses = Status.objects.filter(type=status_type)
        serializer = StatusSerializer(statuses, many=True)
        return Response(serializer.data)
    
class BookingSettingsView(APIView):
    def get(self, request):
        settings = BookingSettings.objects.first()
        serializer = BookingSettingsSerializer(settings)
        return Response(serializer.data)

class OrderLimitView(APIView):
    def get(self, request):
        booking_date = request.GET.get('date')
        service_slug = request.GET.get('service')
        if not booking_date or not service_slug:
            return Response({'error': 'date and service parameters required'}, status=400)
        try:
            order_limit = OrderLimit.objects.get(date=booking_date, service__slug=service_slug)
            serializer = OrderLimitSerializer(order_limit)
            return Response(serializer.data)
        except OrderLimit.DoesNotExist:
            return Response({'date': booking_date, 'service': service_slug, 'max_orders': None})

class OrdersCountView(APIView):
    def get(self, request):
        booking_date = request.GET.get('date')
        service_slug = request.GET.get('service')
        if not booking_date or not service_slug:
            return Response({'error': 'date and service parameters required'}, status=400)
        try:
            # Parse date string to date object
            booking_date_obj = datetime.strptime(booking_date, "%Y-%m-%d").date()
            # Get start and end of the day in UTC
            start_dt = timezone.make_aware(datetime.combine(booking_date_obj, time.min))
            end_dt = timezone.make_aware(datetime.combine(booking_date_obj, time.max))
        except Exception:
            return Response({'error': 'Invalid date format, should be YYYY-MM-DD'}, status=400)
        count = Booking.objects.filter(
            departure_time__range=(start_dt, end_dt),
            service__slug=service_slug
        ).exclude(
            status__name__in=["Pending", "Payment Failed", "Cancelled"]
        ).count()
        return Response({'date': booking_date, 'service': service_slug, 'count': count})
    
class DiscountSignupView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)

        # Create or get lead
        lead, _ = MarketingLead.objects.get_or_create(email=email.lower().strip())

        # Generate a unique coupon code, e.g., RSP10-XXXXXX
        def gen_code():
            suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
            return f"RSP10-{suffix}"

        code = gen_code()
        # Ensure uniqueness
        while Coupon.objects.filter(code=code).exists():
            code = gen_code()

        # Create lifetime 10% coupon starting now
        now = timezone.now()
        coupon = Coupon.objects.create(
            code=code,
            discount_percent=10,
            active=True,
            valid_from=now,
            valid_to=None,
            lifetime=True,
            max_uses=1,
            times_used=0,
        )

        lead.discount_code = coupon.code
        lead.subscribed = True
        lead.save()

        return Response({'email': lead.email, 'discount_code': coupon.code}, status=201)

def robots_txt(request):
    host = request.get_host()
    # Default to RS Express Parking
    sitemap_url = "https://rsexpressparking.com/sitemap.xml"
    # If the request is from Dublin Airport Parking, use its sitemap
    if "dublinairport" in host:
        sitemap_url = "https://dublinairportexpressparking.ie/sitemap.xml"
    content = f"""User-agent: *
Allow: /
Disallow: /admin-dashboard/
Disallow: /api/auth/
Disallow: /api/payments/

Sitemap: {sitemap_url}
"""
    return HttpResponse(content, content_type='text/plain')
